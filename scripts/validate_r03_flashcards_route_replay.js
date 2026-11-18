"use strict";
/* R03 / FLASH-04: AirPods microphone -> disconnected iPhone speaker replay.
 * Native Swift checks are source invariants, not Xcode/device audibility.
 * Real original native Flashcards JS controller is exercised with mocked
 * Capacitor replies/events; no voice sample, profile or route UID is logged.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const swift = read("ios/App/App/SceneDelegate.swift");
const native = read("verse_games/shared/native-flashcards-capture-n7c.js");
const browser = read("flashcards/recording.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const start = swift.indexOf("    @objc func playCapture(");
const end = swift.indexOf("    // Called by actual Stop Playback", start);
assert(start >= 0 && end > start,"Native replay method must exist");
const play = swift.slice(start, end);
const routeStart = swift.indexOf("forName: AVAudioSession.routeChangeNotification, object: nil,");
const routeEnd = swift.indexOf("    deinit {", routeStart);
assert(routeStart >= 0 && routeEnd > routeStart);
const route = swift.slice(routeStart, routeEnd);
const activate = play.indexOf("try session.setActive(true)");
const engine = play.indexOf("let engine = AVAudioEngine()");
assert(activate >= 0 && engine > activate,
  "Child's explicit Play must activate session BEFORE constructing output graph");
assert(play.indexOf("let outputPorts = session.currentRoute.outputs") > activate &&
       play.indexOf("engine.outputNode.outputFormat(forBus: 0)") > engine,
  "Active hardware route and enabled output format must be checked");
assert(play.includes("guard !outputPorts.isEmpty") &&
       play.includes("outputFormat.sampleRate > 0") &&
       play.includes("outputFormat.channelCount > 0"),
  "No claimed playing when no actual output port or disabled hardware format");
assert(swift.includes("private var playbackRouteEpoch = 0") &&
       play.includes("let routeEpoch = self.playbackRouteEpoch") &&
       play.includes("self.playbackRouteEpoch == routeEpoch"),
  "In-flight worker copy must fail closed if physical route changed");
assert(route.includes("self.playbackRouteEpoch += 1") &&
       route.includes("ports != self.playbackOutputPorts") &&
       route.includes('self.stopPlaybackInternal(reason: "route-changed"'),
  "Real route changes, even early after Play, must invalidate the output engine");
assert(route.includes("AVAudioEngineConfigurationChange") &&
       route.includes("self.playbackEngine === engine") &&
       route.includes('self.stopPlaybackInternal(reason: "route-changed", notify: true)'),
  "Owned engine configuration reset must not leave UI in fake playing state");
assert(play.includes("self.playbackOutputPorts = outputPorts") &&
       swift.includes("playbackOutputPorts = []"),
  "Only the live output port types are cached and cleared on Stop");
assert(play.includes("self.releaseFlashcardsAudioPriority()") &&
       play.includes('reason": "output-route-changed"') &&
       play.includes('reason": "output-not-ready"'),
  "Fail-closed route handling returns actionable retry without stealing output");
assert(swift.includes("self.savedTakeId == requestedId") &&
       swift.includes("self.savedSamples.withUnsafeBufferPointer") &&
       swift.includes("completionCallbackType: .dataPlayedBack"),
  "One bounded existing RAM take with real hardware-ended gate, never fake completion");
assert(swift.includes("try session.setCategory(.playAndRecord, mode: .measurement") &&
       swift.includes("try session.setCategory(category, mode: mode, options: options)"),
  "Actual Record category and normal restoration remain unchanged");
assert(!/new Audio\(|AudioContext\s*\(|getUserMedia\s*\(|MediaRecorder\s*\(/.test(native),
  "Native replay stays AVFoundation only, without browser fallback");
assert(browser.includes("new MediaRecorder(stream") &&
       browser.includes("new Audio(url)"),
  "Original browser/PWA/Android recorder and playback remain unchanged");
assert(native.includes('event.reason === "route-changed"') &&
       native.includes('"Audio output changed. Tap Play to try again."'),
  "Route refusal and in-flight interruption must show a recoverable message");
assert(workflow.includes("node scripts/validate_r03_flashcards_route_replay.js"),
  "R03 route regression must run in PR CI");
for (const p of ["docs/PROJECT-HANDOFF.md", "docs/TESTING.md",
  "docs/IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md",
  "docs/IOS-OWNER-AUDIO-FINDINGS-2026-11-17.md"])
  assert(read(p).includes("R03"), "Owner docs must record R03: " + p);
new vm.Script(browser); new vm.Script(native);

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const events = [], listeners = {}, changes = [], calls = [];
  const doc = {hidden:false,addEventListener(name,fn){listeners["doc:"+name]=fn;}};
  let nextToken = 20;
  const replies = [];
  const mic = {
    addListener(name,fn){listeners[name]=fn;return Promise.resolve({remove(){}});},
    requestPermission(){calls.push("permission");return Promise.resolve({granted:true});},
    prepareCapture(){calls.push("prepare");return Promise.resolve({prepared:true});},
    beginCapture(){calls.push("begin");return Promise.resolve({started:true,captureKey:9});},
    finishCapture(){calls.push("finish");return Promise.resolve({
      ready:true,restored:true,frameCount:32000,durationMs:2000,takeId:"one-RAM-take"});},
    discardCapture(){calls.push("discard");return Promise.resolve({discarded:true});},
    playCapture({takeId,presetId}) {
      calls.push("play:"+takeId+(presetId ? ":"+presetId : ""));
      const result = replies.shift() || {started:true,playToken:++nextToken};
      return Promise.resolve(result);
    },
    stopCapturePlayback(){calls.push("stop-play");return Promise.resolve({stopped:true});}
  };
  const output = {devPrepareForMicrophone(){calls.push("barrier");
    return Promise.resolve({prepared:true});}};
  const win = {
    document:doc,addEventListener(name,fn){listeners["window:"+name]=fn;},
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooMicSessionProbe:mic,BibloZooNativeSound:output}}
  };
  vm.runInNewContext(browser,{window:win,document:doc,performance:{now:()=>0}});
  vm.runInNewContext(native,{window:win,document:doc,
    performance:{now:()=>0},setTimeout,clearTimeout});
  const recorder=win.BibloZooRecording.create({
    onChange(){changes.push("render");},
    onInterrupted(){events.push("interrupted");}
  });
  return {win,doc,events,listeners,calls,changes,replies,recorder,
    emit(event){listeners.biblozooCapturePlayback?.(event);}
  };
}
(async()=>{
  const h = fixture(), r = h.recorder;
  assert.equal(await r.start(()=>h.events.push("recording"),async()=>true,()=>6000),
    "recording");
  r.stop(); await tick();
  assert.equal(r.snapshot().hasRecording,true);
  assert.equal(r.snapshot().status,"ready");
  assert.equal(r.snapshot().playbackComplete,false);

  // AirPods were disconnected AFTER successful capture; the RAM take
  // stays intact. Output was still transitioning when first Play was tapped.
  h.replies.push({started:false,reason:"output-route-changed"});
  assert.equal(await r.play(),false);
  assert.equal(r.snapshot().hasRecording,true,"Failed route may not erase voice");
  assert.equal(r.snapshot().playbackAvailable,true,"Same take is retryable");
  assert.equal(r.snapshot().playbackComplete,false,"No invented listening credit");
  assert.equal(r.snapshot().playbackFailed,true);
  assert.equal(r.snapshot().status,"ready");
  assert.match(r.snapshot().message,/Audio output changed.*Tap Play/);

  // Stable speaker output, fresh deliberate tap; ACK is never listened-to
  // evidence until matching native .dataPlayedBack, not a wall-clock timer.
  h.replies.push({started:true,playToken:42});
  assert.equal(await r.play(),true);
  assert.equal(r.snapshot().status,"playing");
  assert.equal(r.snapshot().playbackComplete,false);
  h.emit({kind:"ended",takeId:"one-RAM-take",playToken:41});
  h.emit({kind:"ended",takeId:"stale-take",playToken:42});
  assert.equal(r.snapshot().playbackComplete,false,"Stale native end must be ignored");

  // A second genuine AirPods change DURING playback cancels the stream,
  // leaves the take in RAM and offers one more explicit Play.
  h.emit({kind:"interrupted",reason:"route-changed",
    takeId:"one-RAM-take",playToken:42});
  assert.equal(r.snapshot().status,"ready");
  assert.equal(r.snapshot().playbackFailed,true);
  assert.equal(r.snapshot().playbackComplete,false);
  assert.equal(r.snapshot().hasRecording,true);
  assert.match(r.snapshot().message,/Audio output changed.*Tap Play/);
  h.emit({kind:"ended",takeId:"one-RAM-take",playToken:42});
  assert.equal(r.snapshot().playbackComplete,false,"Late old ended is not credit");

  h.replies.push({started:false,reason:"output-not-ready"});
  assert.equal(await r.play(),false);
  assert.equal(r.snapshot().hasRecording,true);
  assert.match(r.snapshot().message,/Audio output changed/);

  h.replies.push({started:true,playToken:43});
  assert.equal(await r.play(),true);
  assert.equal(r.snapshot().playbackComplete,false);
  h.emit({kind:"ended",takeId:"one-RAM-take",playToken:43});
  assert.equal(r.snapshot().playbackComplete,true,
    "Only a real matching native consumed-buffer completion counts as heard");
  assert.equal(r.snapshot().playbackFailed,false);

  const bad=fixture(), other=bad.recorder;
  assert.equal(await other.start(()=>{},async()=>true,()=>5000),"recording");
  other.stop();await tick();
  bad.replies.push({started:false,reason:"start-failed"});
  assert.equal(await other.play(),false);
  assert.match(other.snapshot().message,/Playback couldn't start/,
    "Real output setup error still offers normal Retry");
  assert.equal(other.snapshot().playbackComplete,false);
  assert.equal(other.snapshot().hasRecording,true);

  r.dispose();other.dispose();await tick();
  assert.equal(r.snapshot().hasRecording,false,"Exit erases its native RAM take");
  assert.equal(h.events.includes("interrupted"),false,
    "Route change after a completed recording must not fake a mic interruption");
  console.log("R03 PASS: fresh active hardware before engine, route epoch/configuration guard, preserved RAM take, explicit retry on output loss, stale ended rejection, actual native-ended only, Web parity.");
})().catch(error=>{console.error(error);process.exitCode=1;});
