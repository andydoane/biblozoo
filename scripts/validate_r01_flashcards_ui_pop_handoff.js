"use strict";
/* R01 / FLASH-01 — real native UI + Flashcards recording controllers in a
 * mock Capacitor bridge whose mic barrier clears the shared Swift PCM bank.
 * The exact old bug: after Record, UI JS still thought the bank was ready,
 * so every later tap attempted a now-unprepared pop. This tests handoff
 * ordering and the NEXT genuine tap, not actual iPhone speaker audibility.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const native = read("verse_games/shared/native-flashcards-capture-n7c.js");
const ui = read("verse_games/shared/native-ui-audio.js");
const browser = read("flashcards/recording.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const micSwift = read("ios/App/App/SceneDelegate.swift");
const handoff = native.indexOf("root.BibloZooNativeUiAudio?.invalidate?.();");
const barrier = native.indexOf("await output.devPrepareForMicrophone()");
const permission = native.indexOf("await api.requestPermission()");
assert.ok(permission >= 0 && handoff > permission && barrier > handoff,
  "Reset cached UI-pop readiness after permission, BEFORE native PCM teardown");
assert.ok(native.includes("const prepared = await api.prepareCapture();") &&
  native.indexOf("const prepared = await api.prepareCapture();") > barrier,
  "Do not change the original permission -> barrier -> mic capture ordering");
assert.ok(swift.includes("pendingFlashcardsMicHandoff") &&
  swift.includes("flashcards-capture-handoff-restored") &&
  micSwift.includes('name: Notification.Name("biblozoo.flashcards.capture-restored")'),
  "Only retained foreground mic handoff may restore native audio readiness");
assert.ok(!native.includes("setCategory(") &&
  !native.includes("setActive(true)") &&
  !/new Audio\(|AudioContext\s*\(|getUserMedia\s*\(/.test(native),
  "No JS audio takeover, extra activation or browser microphone fallback");
assert.ok(ui.includes("function invalidate({ stop = false } = {})") &&
  ui.includes("generation += 1;") &&
  ui.includes("ready = false;"),
  "Existing native UI invalidation must cancel stale readiness without a stop");

const tick = async () => {
  await new Promise(setImmediate);
  await new Promise(setImmediate);
};
function harness({ denyPermission = false, recordRestored = true,
    uiController = true } = {}) {
  const calls = [];
  const prepared = new Set();
  const events = {};
  let t = 1000;
  let active = true;
  let takeReady = false;
  const document = {
    hidden: false,
    addEventListener(name, cb) { events["doc:" + name] = cb; }
  };
  const output = {
    activateFromGesture(arg) {
      calls.push(["activate", arg.purpose]);
      return Promise.resolve({ ready: active });
    },
    preload({soundId}) {
      calls.push(["preload", soundId]);
      if (active) prepared.add(soundId);
      return Promise.resolve({ prepared: active });
    },
    play({soundId, volume}) {
      const accepted = active && prepared.has(soundId);
      calls.push(["play", soundId, accepted, volume]);
      return Promise.resolve({accepted});
    },
    stop({soundId}) {
      prepared.delete(soundId);
      calls.push(["stop", soundId]);
      return Promise.resolve({stopped:true});
    },
    devPrepareForMicrophone() {
      // Swift's forgetPlayback -> discardEffectsOnWorker drains all output PCM.
      // It NEVER tells the Web UI-pop controller that ready became false.
      calls.push(["mic-output-barrier"]);
      prepared.clear();
      return Promise.resolve({prepared:true});
    },
    addListener(name,cb) { events[name] = cb; return Promise.resolve({remove(){}}); }
  };
  const mic = {
    addListener(name,cb) { events[name] = cb; return Promise.resolve({remove(){}}); },
    requestPermission() {
      calls.push(["permission"]);
      return Promise.resolve(denyPermission
        ? {granted:false,reason:"permission-denied"} : {granted:true});
    },
    prepareCapture() {
      calls.push(["mic-prepare"]);
      return Promise.resolve({prepared:true});
    },
    beginCapture() {
      calls.push(["mic-begin"]);
      return Promise.resolve({started:true,captureKey:7});
    },
    finishCapture() {
      calls.push(["mic-finish"]);
      // In real native code, a validated foreground retained take posts the
      // same-session handoff; it does not automatically prime PCM effects.
      takeReady = recordRestored;
      return Promise.resolve({
        ready: recordRestored, restored: recordRestored,
        frameCount: recordRestored ? 22050 : 0, durationMs:500,
        takeId: recordRestored ? "ram-test-take" : ""
      });
    },
    discardCapture() { calls.push(["mic-discard"]); takeReady = false;
      return Promise.resolve({discarded:true}); },
    playCapture() { calls.push(["mic-play"]); return Promise.resolve({started:takeReady,playToken:8}); },
    stopCapturePlayback() { return Promise.resolve({stopped:true}); }
  };
  const window = {
    document,
    performance:{now:()=>t},
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{
      isNativePlatform:()=>true, getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:output, BibloZooMicSessionProbe:mic}
    },
    addEventListener(name,cb) { events["win:" + name] = cb; }
  };
  const context = {window,document,console,Date,Promise,performance:window.performance,
    setTimeout,clearTimeout};
  vm.runInNewContext(browser,context,{filename:"flashcards/recording.js"});
  if(uiController) vm.runInNewContext(ui,context,{filename:"native-ui-audio.js"});
  vm.runInNewContext(native,context,{filename:"native-flashcards-capture-n7c.js"});
  return {
    calls, prepared, events, window, document,
    setTime(value) { t = value; },
    get recorder() { return window.BibloZooRecording.create({}); },
    tap() { return window.BibloZooNativeUiAudio.tapFromGesture({
      isCurrent:()=>true,volume:0.12
    }); }
  };
}
async function run() {
  const h = harness();
  assert.equal(h.tap(),true);
  await tick();
  assert.deepEqual(h.calls.filter(x=>x[0]==="preload").map(x=>x[1]),
    ["ui-pop-1","ui-pop-2"]);
  assert.deepEqual(h.calls.filter(x=>x[0]==="play").map(x=>x[2]),[true],
    "Initial UI tap uses a prepared PCM sample");
  const rec=h.recorder;
  assert.equal(await rec.start(()=>{},async()=>true,()=>6000),"recording");
  assert.equal(h.calls.filter(x=>x[0]==="mic-output-barrier").length,1);
  assert.equal(h.prepared.size,0,
    "Native PCM bank was actually drained for the microphone");
  const afterBarrier=h.calls.length;
  rec.stop(); await tick();
  assert.equal(rec.snapshot().hasRecording,true,"Retained RAM take not lost");
  assert.equal(h.calls.slice(afterBarrier).filter(x=>x[0]==="activate").length,0,
    "Finish must NOT passively activate the output session");
  assert.equal(h.calls.slice(afterBarrier).filter(x=>x[0]==="preload").length,0,
    "Finish must NOT passively warm PCM effects");
  h.setTime(2000);
  assert.equal(h.tap(),true,"Next UI tap is a fresh gesture");
  await tick();
  assert.deepEqual(h.calls.filter(x=>x[0]==="preload").map(x=>x[1]),
    ["ui-pop-1","ui-pop-2","ui-pop-1","ui-pop-2"],
    "Next tap rewarms BOTH disposed UI samples rather than trusting stale ready");
  assert.deepEqual(h.calls.filter(x=>x[0]==="play").map(x=>x[2]),
    [true,true],"Home/Flashcards UI pops audible again after recording");
  assert.equal(h.calls.filter(x=>x[0]==="activate").length,2,
    "Re-activation occurs only on a genuine tap, never automatically");
  // A later Home tap uses the same legitimately rebuilt PCM bank.
  h.setTime(2300);h.tap();await tick();
  assert.deepEqual(h.calls.filter(x=>x[0]==="play").map(x=>x[2]),
    [true,true,true],"UI pop continues functioning after leaving Flashcards");
  rec.dispose();
  // Permission denial does not enter a microphone barrier or break UI pops.
  const denied=harness({denyPermission:true});
  denied.tap();await tick();
  const refused=await denied.recorder.start(()=>{},async()=>true,()=>6000);
  assert.equal(refused,"permission-denied");
  assert.equal(denied.calls.filter(x=>x[0]==="mic-output-barrier").length,0);
  denied.setTime(2100);denied.tap();await tick();
  assert.deepEqual(denied.calls.filter(x=>x[0]==="play").map(x=>x[2]),
    [true,true],"Denied mic permission leaves existing UI output intact");
  // Ordinary Web/PWA has no native-ui controller nor native recorder override.
  const original=browser;
  assert.match(original,/new MediaRecorder\(stream/);
  assert.match(original,/new Audio\(url\)/);
  console.log("R01 PASS: mic barrier drains native PCM, cached UI readiness is invalidated before it, next genuine tap rewarms both pops, no passive audio takeover, recording retained, permission-denial and Web paths preserved. Physical iPhone required.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
