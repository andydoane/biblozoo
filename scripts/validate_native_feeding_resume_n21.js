"use strict";
// N2.1: exercise the actual Native-only Feeding Resume button wiring and
// the activity-owned async native re-prepare path. VM/source checks are not
// a substitute for Swift compilation or physical iPhone audibility.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const FEED = fs.readFileSync(path.join(__dirname, "..", "daily_questions_feed_game.js"), "utf8");
const plain = x => JSON.parse(JSON.stringify(x));

function sliceBetween(startMarker, endMarker) {
  const start = FEED.indexOf(startMarker);
  const end = FEED.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start,
    "source markers moved: " + startMarker + " / " + endMarker);
  return FEED.slice(start, end);
}
function fakeClick() {
  return {
    prevented: false, stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; }
  };
}
function button() {
  const handlers = [];
  return {
    disabled: false,
    addEventListener(type, handler) {
      assert.equal(type, "click");
      handlers.push(handler);
    },
    click() {
      const event = fakeClick();
      for (const handler of handlers) handler(event);
      return event;
    },
    handlers
  };
}

function installResumeHandler(runtime, calls) {
  const fn = sliceBetween(
    '    runtime.resumeButtonHandler = (event) => {',
    '    runtime.resumeBackHandler = (event) => {');
  vm.runInNewContext(fn, {
    runtime, attemptFeedingResumeFromGesture: target => {
      assert.equal(target, runtime);
      calls.push("native-resume");
    }
  }, {filename: "Feeding native Resume button handler"});
  const registration = sliceBetween(
    '    exitButton.addEventListener("click", runtime.exitHandler);',
    '    resumeBackButton.addEventListener("click", runtime.resumeBackHandler);');
  const resumeButton = button();
  const exitButton = button();
  vm.runInNewContext(registration, {
    runtime, resumeButton, exitButton
  }, {filename: "Feeding native Resume listener registration"});
  assert.equal(resumeButton.handlers.length, 1,
    "Native and Web both register exactly one owner resume handler");
  return resumeButton;
}

function makeNativeResumeHarness() {
  const runtime = {
    nativePilotBackend: "native", feedPausedAt: 500,
    feedPageHidden: false, feedResumePending: false,
    feedResumeGeneration: 3, finished: false,
    resumeButton: {disabled: false},
    resumeOverlay: {hidden: false},
    nativePilot: null
  };
  const document = {hidden: false};
  let ready = false;
  let failures = 0;
  const messages = [];
  let nativePreps = 0;
  let continuation = 0;
  let prepResult = () => Promise.resolve({ready: true, reason: "prepared"});
  runtime.nativePilot = {
    prepare() {
      nativePreps++;
      return Promise.resolve(prepResult()).then(response => {
        ready = response?.ready === true;
        return response;
      });
    },
    isReady: () => ready
  };
  const watchdogs = new Map();
  let nextTimer = 0;
  const sandbox = {
    activeRuntime: runtime, document,
    window: {},
    performance: {now: () => 4500},
    setTimeout(fn, ms) {
      const id = ++nextTimer;
      watchdogs.set(id, {fn, ms});
      return id;
    },
    clearTimeout(id) { watchdogs.delete(id); },
    setFeedingResumeStatus(_, value) { messages.push(value || ""); },
    continueFeedingAfterGesture(target) {
      continuation++;
      assert.equal(target, runtime);
      if (!ready) return false;
      target.feedPausedAt = null;
      target.resumeOverlay.hidden = true;
      return true;
    }
  };
  const src = sliceBetween(
    '  function attemptFeedingResumeFromGesture(runtime, onSettled) {',
    '  function attachFeedInterruptionHandlers(runtime) {');
  vm.runInNewContext(src + '\nthis.__resume=attemptFeedingResumeFromGesture;', sandbox, {
    filename:"Feeding native activity resume"
  });
  return {
    runtime, document,
    resume: () => sandbox.__resume(runtime),
    setPrepared: fn => {prepResult = fn;},
    messages, watchdogs,
    nativePreps: () => nativePreps,
    continuation: () => continuation,
    failures: () => failures
  };
}
async function flush() {
  await new Promise(resolve => setImmediate(resolve));
}

async function run() {
  assert.doesNotMatch(FEED, /if \(!runtime\.zooEscape\)\s*\{\s*\/\/ Older builds[\s\S]*?resumeButton\.addEventListener\("click", runtime\.resumeButtonHandler\)/,
    "the old controller-exists guard must not leave Native-only Resume inert");
  assert.match(FEED,
    /if \(runtime\.zooEscape && runtime\.nativePilotBackend !== "native"\) return/,
    "Web Zoo Escape must continue owning its active Resume clicks");

  // Native-only leaves Zoo Escape installed but NEVER calls start(). This was
  // exactly the iPhone report: disabled old handler, no owner handler.
  {
    const calls = [];
    const rt = {zooEscape: {isPaused: () => false}, nativePilotBackend:"native"};
    const btn = installResumeHandler(rt, calls);
    const click = btn.click();
    assert.deepEqual(calls, ["native-resume"]);
    assert.equal(click.prevented, true);
    assert.equal(click.stopped, true);
  }
  // Web + active Zoo Escape remains untouched; this handler must stand down.
  {
    const calls = [];
    const rt = {zooEscape: {isPaused: () => true}, nativePilotBackend:"web"};
    const btn = installResumeHandler(rt, calls);
    const click = btn.click();
    assert.equal(click.prevented, false);
    assert.equal(click.stopped, false);
    assert.deepEqual(calls, []);
  }
  // Old builds without the shared controller still have the normal handler.
  {
    const calls = [];
    const btn = installResumeHandler({zooEscape:null,nativePilotBackend:"web"}, calls);
    btn.click();
    assert.deepEqual(calls, ["native-resume"]);
  }
  // A hidden native round cannot resume automatically; a new real click
  // after return retries two native MP3 preloads and unfreezes the SAME round.
  {
    const h = makeNativeResumeHarness();
    h.document.hidden = true;
    assert.equal(h.resume(), false);
    assert.equal(h.nativePreps(), 0);
    h.document.hidden = false;
    assert.equal(h.resume(), true);
    assert.equal(h.runtime.feedResumePending, true);
    assert.equal(h.runtime.resumeButton.disabled, true);
    await flush();
    assert.equal(h.nativePreps(), 1);
    assert.equal(h.runtime.feedPausedAt, null);
    assert.equal(h.runtime.resumeOverlay.hidden, true);
    assert.equal(h.runtime.feedResumePending, false);
    assert.equal(h.runtime.resumeButton.disabled, false);
    assert.equal(h.continuation(), 1);
    assert.equal(h.watchdogs.size, 0);
  }
  // Failed native sound is a visible retryable pause; no Web fallback and
  // no extra reward/game-time advancement before the next explicit gesture.
  {
    const h=makeNativeResumeHarness();
    h.setPrepared(()=>Promise.resolve({ready:false,reason:"interruption-pending"}));
    assert.equal(h.resume(),true);
    await flush();
    assert.equal(h.runtime.feedPausedAt,500);
    assert.equal(h.runtime.resumeOverlay.hidden,false);
    assert.equal(h.runtime.resumeButton.disabled,false);
    assert.equal(h.continuation(),0);
    assert.ok(h.messages.some(x=>x.includes("interruption-pending")));
    h.setPrepared(()=>Promise.resolve({ready:true,reason:"prepared"}));
    assert.equal(h.resume(),true);
    await flush();
    assert.equal(h.nativePreps(),2);
    assert.equal(h.runtime.feedPausedAt,null);
    assert.equal(h.continuation(),1);
  }
  // Pending async prepare after another hide is invalidated by the
  // activity-owned generation, so it cannot unfreeze or replay later.
  {
    const h=makeNativeResumeHarness();
    let release;
    h.setPrepared(()=>new Promise(resolve=>{release=resolve;}));
    assert.equal(h.resume(),true);
    h.document.hidden=true;
    h.runtime.feedResumeGeneration++;
    h.runtime.feedResumePending=false;
    h.runtime.resumeButton.disabled=false;
    await flush();
    assert.equal(typeof release,"function");
    release({ready:true,reason:"prepared"});
    await flush();
    assert.equal(h.runtime.feedPausedAt,500);
    assert.equal(h.continuation(),0);
  }
  console.log("N2.1 Native-only Feeding Resume: dormant Zoo Escape, real tap, return, retry and stale generation passed.");
}
run().catch(error=>{console.error(error); process.exitCode=1;});
