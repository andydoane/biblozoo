"use strict";
/* N7h: source contracts + live VM of the real native Daily Questions adapter.
 * CI cannot Apple-SDK compile, run on hardware, or prove speaker audibility.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const daily = read("daily_questions.js");
const bridge = read("verse_games/shared/native-daily-questions-audio.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const index = read("index.html");
const build = read("scripts/build.js");
const readFacade = read("verse_games/shared/native-read-my-verse-output-n7f.js");

// Both original source MP3s are part of the reproducible Capacitor public
// bundle, and Swift maps only exact fixed IDs, never a caller-supplied path.
for (const name of ["dq_correct", "dq_incorrect"]) {
  assert(fs.existsSync(path.join(root, "verse_images/daily_questions", name + ".mp3")));
  assert(swift.includes('"' + name + '"'), name + " native asset binding");
}
assert(swift.includes('"daily-question-correct": "dq_correct"'));
assert(swift.includes('"daily-question-incorrect": "dq_incorrect"'));
assert(swift.includes('subdirectory: "public/verse_images/daily_questions"'));
assert(swift.includes('"daily-question-correct", "daily-question-incorrect"'));
assert(swift.includes('purpose == "daily-questions"'),
  "new child tap purpose must be accepted by Swift activation");
assert.match(swift, /soundId == "daily-question-correct"[\s\S]*soundId == "daily-question-incorrect"/);
assert(build.includes('"verse_images"'));
assert(build.includes("injectNativeOnlyAudioGuard"));
assert(index.indexOf("native-daily-questions-audio.js") <
  index.indexOf('<script src="daily_questions.js"></script>'));
assert(index.includes("native-read-my-verse-output-n7f.js"));

// The browser version retains its original Audio/MP3 contracts. Native iOS
// fails CLOSED and chooses the actual Swift bridges, not Web/HTML audio.
assert(daily.includes('correct: "./verse_images/daily_questions/dq_correct.mp3"'));
assert(daily.includes('incorrect: "./verse_images/daily_questions/dq_incorrect.mp3"'));
assert(daily.includes("window.BibloZooNativeOnlyOutput?.enabled === true"));
assert(daily.includes("BibloZooNativeDailyQuestionAudio?.tapAnswer?.("));
assert(daily.includes("window.BibloZooNativeDailyQuestionAudio?.stop?.()"));
assert(daily.includes("new Audio(source)")); // Web/PWA original only
assert(daily.includes("new readOutput.NativeAudio(source)"));
assert(daily.includes("readOutput.activateFromGesture()"));
assert(daily.includes("readOutput.clipIdFor(source)"));
assert(daily.includes("audio.addEventListener(\"ended\", finish"));
assert(readFacade.includes("AVAudioPlayerDelegate") ||
  readFacade.includes("native AVAudioPlayer"));
assert(!bridge.includes("new Audio("));
assert(!bridge.includes("AudioContext"));
assert(!bridge.includes("setCategory("));

// Exercise the REAL adapter without modifying its source or publishing any
// test hooks. The fake native bridge never produces browser sound.
function harness(options = {}) {
  const calls = [];
  const handlers = {};
  const lifecycle = {};
  let resolveActivation = null;
  let now = 10;
  const api = {
    addListener(name, callback) {
      lifecycle[name] = callback;
      return Promise.resolve({});
    },
    stopEffect({ soundId }) {
      calls.push(["stop", soundId]);
      return Promise.resolve({ stopped: true });
    },
    activateFromGesture({ purpose }) {
      calls.push(["activate", purpose]);
      if (options.deferActivation) {
        return new Promise(resolve => { resolveActivation = resolve; });
      }
      return Promise.resolve({ ready: options.refuse !== true });
    },
    preload({ soundId }) {
      calls.push(["preload", soundId]);
      return Promise.resolve({ prepared: true });
    },
    play({ soundId, volume }) {
      calls.push(["play", soundId, volume]);
      return Promise.resolve({ accepted: true });
    }
  };
  const win = {
    BibloZooNativeOnlyOutput: { enabled: true },
    Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios",
      Plugins: { BibloZooNativeSound: api } },
    document: { hidden: false, addEventListener(type, fn) { handlers[type] = fn; } },
    addEventListener(type, fn) { handlers[type] = fn; },
    performance: { now: () => now }
  };
  vm.runInNewContext(bridge, { window: win, Promise, Date });
  return { win, api, calls, handlers, lifecycle,
    resolveActivation: result => resolveActivation?.(result),
    advance: ms => { now += ms; } };
}
const flush = async () => new Promise(resolve => setImmediate(resolve));
function played(h) { return h.calls.filter(x => x[0] === "play"); }

async function run() {
  const h = harness();
  assert.equal(h.win.BibloZooNativeDailyQuestionAudio.isAvailable(), true);
  assert.equal(h.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => true
  }), true);
  await flush();
  assert.deepEqual(Array.from(played(h)[0]), ["play", "daily-question-correct", 1]);
  assert(h.calls.some(x => x[0] === "activate" && x[1] === "daily-questions"));
  assert(h.calls.some(x => x[0] === "preload" && x[1] === "daily-question-correct"));
  assert(!h.calls.some(x => x[0] === "stopAll"));
  assert.equal(h.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: false, isCurrent: () => true
  }), true);
  await flush();
  assert.deepEqual(Array.from(played(h)[1]), ["play", "daily-question-incorrect", 1]);
  const stops = h.calls.filter(x => x[0] === "stop").map(x => x[1]);
  assert(stops.includes("daily-question-correct") &&
         stops.includes("daily-question-incorrect"));

  const denied = harness({ refuse: true });
  denied.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => true
  });
  await flush();
  assert.equal(played(denied).length, 0, "refused activation must never play");

  const stale = harness({ deferActivation: true });
  stale.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: false, isCurrent: () => true
  });
  stale.win.BibloZooNativeDailyQuestionAudio.stop(); // Exit/mute/Back
  stale.resolveActivation({ ready: true });
  await flush();
  assert.equal(played(stale).length, 0, "late ACK after exit must not play");

  const hidden = harness({ deferActivation: true });
  hidden.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => true
  });
  hidden.win.document.hidden = true;
  hidden.handlers.visibilitychange();
  hidden.resolveActivation({ ready: true });
  await flush();
  assert.equal(played(hidden).length, 0, "hidden app must stay silent");

  const inactive = harness({ deferActivation: true });
  inactive.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => true
  });
  inactive.lifecycle.biblozooAppLifecycle({ active: false });
  inactive.resolveActivation({ ready: true });
  await flush();
  assert.equal(played(inactive).length, 0, "held switcher must revoke tap");

  const invalid = harness({ deferActivation: true });
  invalid.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => true
  });
  invalid.advance(1500);
  invalid.resolveActivation({ ready: true });
  await flush();
  assert.equal(played(invalid).length, 0, "very late feedback must not surprise child");

  const staleChoice = harness();
  staleChoice.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => false
  });
  await flush();
  assert.equal(played(staleChoice).length, 0, "changed answer must be rejected");

  const web = harness();
  web.win.BibloZooNativeOnlyOutput.enabled = false;
  assert.equal(web.win.BibloZooNativeDailyQuestionAudio.isAvailable(), false);
  assert.equal(web.win.BibloZooNativeDailyQuestionAudio.tapAnswer({
    correct: true, isCurrent: () => true
  }), false);
  assert.equal(played(web).length, 0);

  // Also execute the actual Daily Questions module's generated Sounds Like?
  // handler (not just a text assertion). Native Play Sound must prime the
  // existing Read AVAudioPlayer bridge synchronously, and no browser Audio
  // constructor may be touched in the Audio Test environment.
  const nativeCalls = [];
  class FakeReadClip {
    constructor(src) { this.src = src; this.currentTime = 0.2;
      this.paused = true; this.ended = false; this.handlers = new Map(); }
    addEventListener(type, fn) { this.handlers.set(type, fn); }
    pause() { nativeCalls.push(["stop-chunk", this.src]); this.paused = true; }
    play() { nativeCalls.push(["play-chunk", this.src]); this.paused = false;
      return Promise.resolve(true); }
  }
  const currentDoc = { hidden: false, addEventListener() {} };
  const nativeWindow = {
    BibloZooNativeOnlyOutput: { enabled: true },
    BibloZooNativeReadOutputController: {
      enabled: true,
      clipIdFor: src => /^\.\/verse_audio\/[a-z0-9_]+\.mp3$/.test(src) ?
        "verse:published" : "",
      activateFromGesture: () => {
        nativeCalls.push(["gesture"]);
        return Promise.resolve(true);
      },
      NativeAudio: FakeReadClip
    },
    addEventListener() {}
  };
  const instrumented = daily.replace(/\n\}\)\(\);\s*$/, '\n  window.__n7hProbe = {setSession: (value) => { dailySession=value; appApi={isMuted:()=>false,renderApp:()=>{}}; }, playGeneratedQuestionAudio, stopGeneratedQuestionAudio};\n})();\n');
  assert.notEqual(instrumented, daily, "Daily Questions VM hook must be inserted");
  vm.runInNewContext(instrumented, {
    window: nativeWindow, document: currentDoc, Promise, Date,
    Audio: class { constructor() { throw Error("Web Audio forbidden on iOS"); } },
    setTimeout: () => 1, clearTimeout: () => {},
    setInterval: () => 2, clearInterval: () => {}
  });
  const session = { answered: false, questionAudioPlaying: false, phase: "question" };
  nativeWindow.__n7hProbe.setSession(session);
  nativeWindow.__n7hProbe.playGeneratedQuestionAudio(
    "./verse_audio/john_3_16a.mp3", session);
  assert.equal(nativeCalls[0][0], "gesture",
    "native activation must occur in actual Play Sound handler");
  assert.equal(nativeCalls[1][0], "play-chunk");
  assert.equal(session.questionAudioPlaying, true);
  nativeWindow.__n7hProbe.stopGeneratedQuestionAudio();
  assert.equal(session.questionAudioPlaying, false);
  assert(nativeCalls.some(x => x[0] === "stop-chunk"),
    "Next/Exit must stop native chunk");
  nativeWindow.BibloZooNativeReadOutputController = undefined;
  nativeWindow.__n7hProbe.playGeneratedQuestionAudio(
    "./verse_audio/john_3_16a.mp3", session);
  assert.equal(session.questionAudioPlaying, false,
    "missing native Read bridge must fail closed, not construct HTML Audio");

  console.log("N7h PASS: exact bundled MP3 native PCM IDs, correct/incorrect " +
    "real-adapter taps, no Web fallback, mute/Exit/hidden/held-switcher " +
    "stale activation blocked, timed feedback, Sounds Like native facade, " +
    "and preserved Web/PWA source.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
