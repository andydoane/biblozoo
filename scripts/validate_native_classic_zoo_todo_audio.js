"use strict";

// Regression for Tower of Bible -> Daily Zoo To-Do -> Classic Feeding.
// The completed Tower activity is not responsible for selecting Feeding's
// sound backend: a real (non-preview) Classic Zoo To-Do session must be native.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const feed = fs.readFileSync(path.join(root, "daily_questions_feed_game.js"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/ios-prep-validation.yml"), "utf8");
const modes = { CLASSIC: "classic", LABYRINTH: "labyrinth", MELODY: "melody", BOUNCE: "bounce" };

function expression(before, after) {
  const start = feed.indexOf(before);
  assert(start >= 0, "missing source marker: " + before);
  assert.equal(feed.indexOf(before, start + 1), -1, "ambiguous marker: " + before);
  const end = feed.indexOf(after, start + before.length);
  assert(end > start, "missing source terminator: " + after);
  return feed.slice(start + before.length, end).trim();
}

// Run both ACTUAL production predicates rather than reimplementing them in
// the test. The first controls rendered preview UI; the second controls
// audio allocation and whether Got It! invokes native prepare().
const rendered = expression("    const nativePilotPreview =\n", ";\n    const nativeClassicChoice");
const runtime = expression("    const nativePilotAllowed =\n", ";\n    if (nativePilotAllowed && preparedAudioContext)");

function selected(expr, mode, {nativeOnly, ios, preview} = {}) {
  const session = { dailyTodoPreview: preview === true, dailyTodoSnack: preview !== true };
  const window = {
    BibloZooNativeOnlyOutput: {enabled: nativeOnly === true},
    BibloZooFeedingNativeAudioPilot: {isIOS: () => ios === true}
  };
  return vm.runInNewContext(expr, {
    session, window, mode, FEED_MODES: modes,
    nativeOnlyApp: nativeOnly === true
  }) === true;
}

for (const mode of Object.values(modes)) {
  // A completed Tower returns to Zoo To-Do, which starts real Feeding
  // (dailyTodoPreview=false). The separate Audio Test app must use native
  // for every assigned mode, even Classic.
  for (const predicate of [rendered, runtime]) {
    assert(selected(predicate, mode, {nativeOnly:true, ios:true, preview:false}),
      mode + ": real Audio Test Feeding must select native");
    assert(!selected(predicate, mode, {nativeOnly:false, ios:true, preview:false}),
      mode + ": original iOS remains unchanged");
    assert(!selected(predicate, mode, {nativeOnly:false, ios:false, preview:false}),
      mode + ": browser/Android remain unchanged");
  }
}
for (const predicate of [rendered, runtime]) {
  assert(selected(predicate, modes.CLASSIC, {nativeOnly:false, ios:true, preview:true}),
    "legacy opt-in Classic preview stays available");
  assert(!selected(predicate, modes.CLASSIC, {nativeOnly:true, ios:false, preview:false}),
    "native output must require the iOS pilot");
}

// Confirm the selected runtime predicate reaches the existing real Got It!
// native preflight, while failure still keeps the instructions for retry.
assert.match(feed, /if \(runtime\.nativePilotAllowed\) \{\s*void startPreviewRoundWithAudioChoice\(runtime\);\s*\} else \{\s*startRound\(runtime\);/);
assert.match(feed, /result\?\.ready !== true \|\| !pilot[\s\S]*?round not started/);
assert.match(feed, /runtime\.nativePilotBackend = "native"/);
assert.match(feed, /runtime\.nativePilot\?\.play\("feed-star"/);
assert.match(feed, /runtime\.nativePilot\?\.play\("feed-chomp"/);
assert.match(feed, /runtime\.nativePilot\?\.play\("feed-peg"/);
assert.match(workflow, /node scripts\/validate_native_classic_zoo_todo_audio\.js/);

// Use the actual render() and startup controller, plus the real native
// Feeding adapter with a fake Swift bridge. This starts at the post-Tower
// Zoo To-Do session contract; the full physical transition is an owner gate.
const css = fs.readFileSync(path.join(root, "daily_questions_feed_game.css"), "utf8");
const adapter = fs.readFileSync(path.join(root, "verse_games/shared/feeding-native-audio-pilot.js"), "utf8");
assert.match(css, /\.daily-feed-native-pilot-opt\[hidden\],[\s\S]*?display:\s*none\s*!important/);
const marker = "  window.BibloZooDailyFeedGame = Object.freeze({";
assert.equal(feed.split(marker).length, 2, "one export anchor for test-only hooks");
const instrumented = feed.replace(
  "  function startRound(runtime) {",
  '  function startRound(runtime) { if (window.__interceptRound) { window.__interceptRound(runtime); return; }'
).replace(marker, `  window.__classicAudioTest = {
    render,
    setRuntime(value) { activeRuntime = value; },
    nativeBegin: startPreviewRoundWithAudioChoice
  };
${marker}`);
assert.notEqual(instrumented, feed);

function appHarness({nativeOnly = true} = {}) {
  const calls = [], started = [];
  let allowed = true, pendingActivation = null;
  const doc = {hidden: false};
  const api = {
    activateFromGesture({purpose}) {
      calls.push(["activate", purpose]);
      return pendingActivation || Promise.resolve({
        ready: allowed, reason: allowed ? "ready" : "other-audio-playing"
      });
    },
    preload({soundId}) {
      calls.push(["preload", soundId]);
      return Promise.resolve({prepared: true});
    },
    play({soundId}) {
      calls.push(["play", soundId]);
      return Promise.resolve({accepted: true});
    },
    stop({soundId}) {
      calls.push(["stop", soundId]);
      return Promise.resolve({stopped: true});
    }
  };
  const win = {
    location: {protocol:"https:"},
    devicePixelRatio: 1,
    DeviceOrientationEvent: function(){},
    BibloZooNativeOnlyOutput: {enabled: nativeOnly},
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
      Plugins: {BibloZooNativeSound: api}
    },
    document: doc,
    setTimeout, clearTimeout,
    __interceptRound: runtime => {
      started.push(runtime);
      runtime.roundStarted = true;
    }
  };
  const sandbox = {
    window: win, document: doc,
    Image: class {},
    Audio: class {constructor() {throw Error("Web audio is blocked in Audio Test");}},
    console, performance: {now: () => 3000}, Promise, Error,
    setTimeout, clearTimeout, requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    fetch: () => Promise.reject(Error("offline test"))
  };
  vm.runInNewContext(adapter, sandbox, {filename:"feeding-native-audio-pilot.js"});
  vm.runInNewContext(instrumented, sandbox, {filename:"daily_questions_feed_game.js"});
  return {
    calls, started, win, hooks:win.__classicAudioTest,
    allow: value => {allowed = value; pendingActivation = null;},
    defer: () => {
      let resolve;
      pendingActivation = new Promise(r => {resolve = r;});
      return resolve;
    }
  };
}
function makeRound() {
  return {
    nativePilotAllowed: selected(runtime, modes.CLASSIC, {
      nativeOnly:true, ios:true, preview:false
    }),
    nativePilotCheckbox: null, // DEV input must not exist in real Audio Test UI
    nativePilotBackend: "web",
    nativePilotChoicePending:false, nativePilot:null,
    nativePilotBadge: {textContent:"", hidden:true},
    nativePilotPhases: null, nativePilotChoiceStatus: {textContent:"", hidden:true},
    nativePilotTrace:[],
    startConfirmButton: {disabled:false, textContent:"Got It!"},
    roundStarted:false, controlPhase:"instructions", finished:false,
    feedPageHidden:false, mode:"classic", audioContext:null
  };
}
async function exerciseStart() {
  const h = appHarness();
  const dailySession = {
    feedMode: "classic", dailyTodoSnack:true, dailyTodoPreview:false,
    petName:"Test BibloPet", rewardTiltEnabled:false
  };
  const html = h.hooks.render({session:dailySession});
  assert.match(html, /data-daily-feed-mode="classic"/);
  assert.match(html, /data-daily-feed-native-choice-status/);
  assert.doesNotMatch(html, /DEV: Native ONLY|data-daily-feed-native-opt-in/,
    "real Zoo To-Do must never render the developer toggle");
  const preview = appHarness({nativeOnly:false}).hooks.render({
    session:{...dailySession,dailyTodoPreview:true}
  });
  assert.match(preview, /DEV: Native ONLY/,
    "the optional legacy comparison UI is still available");

  const r = makeRound();
  h.hooks.setRuntime(r);
  h.allow(false);
  await h.hooks.nativeBegin(r);
  assert.equal(r.nativePilotBackend,"native");
  assert.equal(h.started.length, 0, "denied native activation must block the round");
  assert.equal(r.startConfirmButton.textContent,"Try Again");
  assert.equal(r.nativePilotChoiceStatus.hidden,false,
    "show child-facing failure, not hidden developer diagnostics");
  assert.match(r.nativePilotChoiceStatus.textContent,/Pause the other video/);
  assert(h.calls.some(c=>c[0]==="activate" && c[1]==="feeding"));
  assert(!h.calls.some(c=>c[0]==="preload"),"no preload after denied activation");

  h.allow(true);
  await h.hooks.nativeBegin(r);
  assert.equal(h.started.length,1,"successful retry starts exactly one round");
  assert.equal(r.nativePilotBackend,"native");
  assert(r.nativePilot && r.nativePilot.isReady(),
    "game retains ready native pilot for effects");
  const preloads = h.calls.filter(c=>c[0]==="preload").map(c=>c[1]);
  assert.deepEqual(preloads,["feed-star","feed-chomp","feed-peg"],
    "Classic is prepared from the real fixed-ID AVFoundation adapter");
  assert(!h.calls.some(c=>c[0]==="play"),
    "preparation is silent; effects play only when the game triggers them");

  const stale = appHarness();
  const old = makeRound();
  stale.hooks.setRuntime(old);
  const finishActivation = stale.defer();
  const pending = stale.hooks.nativeBegin(old);
  await Promise.resolve();
  old.finished = true; // Back, exit, or a completed/abandoned session
  finishActivation({ready:true});
  await pending;
  assert.equal(stale.started.length,0,"late native activation must not start a stale round");
  assert.equal(old.nativePilot, null);
}
exerciseStart().then(() => {
  console.log("PASS: real Zoo To-Do Classic rendering, native activation/3 fixed IDs, fail-closed retry, stale cancellation, hidden DEV UI and unchanged legacy modes.");
}).catch(error => {console.error(error);process.exitCode=1;});
