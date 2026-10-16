"use strict";

// Focused behavioral regressions for Patch 14. No browser/network needed.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, "verse_playground", name, "game.js"), "utf8");
const slice = (source, start, end) => {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Could not extract ${start}`);
  return source.slice(a, b);
};
const run = (source, globals, exports) => {
  const sandbox = { Promise, queueMicrotask, setTimeout, clearTimeout, console, ...globals };
  vm.createContext(sandbox);
  vm.runInContext(source + `\nthis.exports = { ${exports.join(", ")} };`, sandbox);
  return sandbox.exports;
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

async function testGhostUnlockOnGestureAndRetry() {
  const source = read("ghost_writer");
  const code = slice(source, "  async function unlockAudio() {", "  async function loadSoundBuffers() {");
  const calls = [];
  let fail = false;
  let loadCount = 0;
  const ac = {
    state: "suspended", currentTime: 0, destination: {},
    resume() { calls.push("resume"); if (fail) return Promise.reject(new Error("blocked")); this.state = "running"; return Promise.resolve(); },
    createOscillator() { return { connect() {}, start() { calls.push("oscillator"); }, stop() {} }; },
    createGain() { return { gain: { value: 0 }, connect() {} }; }
  };
  class SilentAudio {
    constructor() { this.volume = 0; }
    setAttribute() {}
    play() { calls.push("htmlPlay"); return Promise.reject(Object.assign(new Error("not allowed"), { name: "NotAllowedError" })); }
    pause() {}
  }
  const api = run(`let audioContext = null, audioUnlocked = false, audioUnlockPromise = null, silenceAudio = null;
    const AUDIO_UNLOCK_SRC = "silence.mp3";
    function getAudioContext() { return (audioContext ||= ac); }
    function loadSoundBuffers() { loadCount++; return Promise.resolve(); }
    ${code}`, { ac, Audio: SilentAudio, loadCount, console: { warn() {} } }, ["unlockAudio"]);
  const first = api.unlockAudio();
  assert.deepStrictEqual(calls, ["resume", "oscillator", "htmlPlay"], "Web Audio must start before any awaited media prime");
  assert.strictEqual(await first, true);
  ac.state = "suspended"; fail = true;
  assert.strictEqual(await api.unlockAudio(), false, "A failed resume must not be called unlocked");
  fail = false;
  assert.strictEqual(await api.unlockAudio(), true, "Later drawing taps must retry an interrupted context");
}

function fakeMedia(plays) {
  const audio = {
    src: "", muted: false, volume: 1, currentTime: 0, style: {}, readyState: 0,
    setAttribute() {}, getAttribute(name) { return name === "src" ? this.src : null; },
    pause() {}, load() {}, remove() {},
    addEventListener(name, callback) { (this.events ||= {})[name] = callback; },
    removeEventListener(name) { delete this.events?.[name]; },
    play() { plays.push("play"); return this.nextPlay ? this.nextPlay() : Promise.resolve(); }
  };
  return audio;
}

async function testTyperSilentPrimeIsDirectAndRetryable() {
  const code = slice(read("verse_typer"), "  function primeHtmlAudio() {", "  function createAudio() {");
  const plays = [];
  const audio = fakeMedia(plays);
  let rejectFirst = true;
  audio.nextPlay = () => rejectFirst
    ? Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }))
    : Promise.resolve();
  const api = run(`let htmlAudioPrimed = false, htmlAudioPrimePromise = null, silenceAudioEl = null;
    const SILENCE_AUDIO_FILE = "silence.mp3";
    function audioDebug() {}
    ${code}`, {
    document: { createElement: () => audio, body: { appendChild() {} } },
    setTimeout: () => 1, clearTimeout() {},
    console: { warn() {} }
  }, ["primeHtmlAudio"]);
  const first = api.primeHtmlAudio();
  assert.strictEqual(plays.length, 1, "Silent playback must be requested immediately, without waiting for canplay");
  assert.strictEqual(await first, false);
  await flush();
  rejectFirst = false;
  assert.strictEqual(await api.primeHtmlAudio(), true, "Failed priming must be retryable on the next tap");
  assert.strictEqual(plays.length, 2);
}

async function testTyperRecordedVerseRetry() {
  const code = slice(read("verse_typer"), "  function playChunkAudio(file, runToken = state.runToken) {", "  function shouldShowStreakBadge(streak) {");
  const plays = [];
  const audio = fakeMedia(plays);
  let blocked = true;
  audio.nextPlay = () => blocked
    ? Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }))
    : Promise.resolve();
  const card = { appendChild(button) { this.button = button; } };
  const doc = {
    getElementById: () => card,
    createElement: () => ({ remove() {}, addEventListener(_name, cb) { this.click = cb; } })
  };
  const api = run(`const state = { runToken: 1 };
    const muted = false;
    function isLiveRun() { return true; }
    function createChunkAudioElement() { return audio; }
    function clearTrackedTimeout() {}
    function trackedTimeout() { return 9; }
    function audioDebug() {}
    function unlockAudio() { return Promise.resolve(true); }
    ${code}`, { audio, document: doc, console: { warn() {} } }, ["playChunkAudio"]);
  let finished = false;
  const wait = api.playChunkAudio("verse.mp3").then(() => { finished = true; });
  assert.strictEqual(plays.length, 1, "Verse play() must not wait for canplay");
  await flush();
  assert.strictEqual(finished, false, "Blocked verse must not silently advance the game");
  assert.strictEqual(card.button.textContent, "Tap to hear the verse");
  blocked = false;
  card.button.click();
  assert.strictEqual(plays.length, 2, "Retry tap must synchronously call play()");
  audio.onended();
  await wait;
  assert.strictEqual(finished, true);
}

async function testWheelRecordedVerseDirectAndBlockedResult() {
  const code = slice(read("wheel_of_bible"), "  async function tryPlayAudioCandidatesAndWait(candidates, fallbackMs = 1200) {", "  async function tryPlayVerseAudio() {");
  const plays = [];
  const audio = fakeMedia(plays);
  let blocked = true;
  audio.nextPlay = () => blocked
    ? Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }))
    : Promise.resolve();
  const api = run(`function createVerseAudioElement() { return audio; }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    let muted = false;
    ${code}`, { audio, setTimeout: () => 42, clearTimeout() {}, console: { warn() {} } }, ["tryPlayAudioCandidatesAndWait"]);
  const result = api.tryPlayAudioCandidatesAndWait(["verse.mp3"]);
  assert.strictEqual(plays.length, 1, "Wheel spoken audio must be requested in the tap stack");
  assert.strictEqual(await result, "blocked", "Blocked spoken playback must request user retry");
  blocked = false;
  const retry = api.tryPlayAudioCandidatesAndWait(["verse.mp3"]);
  assert.strictEqual(plays.length, 2);
  await flush();
  assert.ok(audio.events?.ended, "Wait for recorded audio to complete");
  audio.events.ended();
  assert.strictEqual(await retry, true);
}

async function testGhostBackgroundPausesPlaybackAndRecoversSound() {
  const ghost = read("ghost_writer");
  const handlers = slice(ghost,
    "  function noteGhostAudioInterruption() {",
    "  function escapeHtml(value) {");
  const calls = [];
  let hidden = false;
  let now = 1000;
  let unlockResult = false;
  const audio = { state: "running" };
  const playback = {
    running: true, options: { spookySounds: "on" },
    backgroundPausedAt: null, charStart: 800, pauseUntil: 1300
  };
  const api = run(`let audioUnlocked = true, spookySoundActive = true;
    let spookyRecoveryPending = false, playbackRaf = 17, muted = false;
    let playbackState = playback, audioContext = audio;
    function getAudioContext() { return audioContext; }
    function stopGhostSpookySounds() { calls.push("stop"); spookySoundActive = false; }
    function unlockAudio() { calls.push("unlock"); if (unlockResult.value) audioContext.state = "running"; return Promise.resolve(unlockResult.value); }
    function startGhostSpookySounds() { calls.push("restart"); spookySoundActive = true; }
    function playbackFrame() {}
    ${handlers}`, {
      playback, calls, audio, unlockResult: { get value() { return unlockResult; } },
      document: { get hidden() { return hidden; } },
      performance: { now: () => now },
      cancelAnimationFrame: id => calls.push(`cancel:${id}`),
      requestAnimationFrame: () => { calls.push("raf"); return 18; }
    }, ["pauseGhostPlaybackForBackground", "restoreGhostPlaybackFromBackground",
        "recoverGhostSpookyAudio", "onGhostAudioStateChange"]);
  hidden = true;
  api.pauseGhostPlaybackForBackground();
  assert.deepStrictEqual(calls, ["stop", "cancel:17"]);
  assert.strictEqual(playback.backgroundPausedAt, 1000);
  audio.state = "interrupted";
  now = 6000;
  hidden = false;
  api.restoreGhostPlaybackFromBackground();
  await flush();
  assert.strictEqual(playback.charStart, 5800, "Background time must not skip writing");
  assert.strictEqual(playback.pauseUntil, 6300, "Preserve intentional word pauses");
  assert.strictEqual(calls.filter(x => x === "unlock").length, 0,
    "Foreground events must not issue a resume without user activation");
  assert.strictEqual(calls.filter(x => x === "restart").length, 0);
  api.recoverGhostSpookyAudio({ fromGesture: true });
  await flush();
  assert.strictEqual(calls.filter(x => x === "restart").length, 0,
    "A rejected user gesture must preserve the pending recovery");
  unlockResult = true;
  api.recoverGhostSpookyAudio({ fromGesture: true });
  await flush();
  assert.strictEqual(calls.filter(x => x === "restart").length, 1,
    "First successful gesture must recover the soundtrack");
  api.recoverGhostSpookyAudio({ fromGesture: true });
  await flush();
  assert.strictEqual(calls.filter(x => x === "restart").length, 1,
    "Do not double-start spooky playback");
}

async function testGhostStaleReplayCannotRestartSounds() {
  const ghost = read("ghost_writer");
  const handlers = slice(ghost,
    "  function noteGhostAudioInterruption() {",
    "  function escapeHtml(value) {");
  const pending = { resolve: null, starts: 0 };
  const playback = {
    running: true, options: { spookySounds: "on" },
    backgroundPausedAt: null, charStart: 0, pauseUntil: 0
  };
  const api = run(`let audioUnlocked = false, spookySoundActive = true;
    let spookyRecoveryPending = false, playbackRaf = 0, muted = false;
    let playbackState = playback, audioContext = { state: "suspended" };
    function getAudioContext() { return audioContext; }
    function stopGhostSpookySounds() { spookySoundActive = false; }
    function unlockAudio() { return new Promise(resolve => { pending.resolve = resolve; }); }
    function startGhostSpookySounds() { pending.starts++; }
    function playbackFrame() {}
    ${handlers}`, {
      playback, pending, document: { hidden: false },
      performance: { now: () => 100 },
      requestAnimationFrame: () => 1, cancelAnimationFrame() {}
    }, ["noteGhostAudioInterruption", "recoverGhostSpookyAudio"]);
  api.noteGhostAudioInterruption();
  api.recoverGhostSpookyAudio({ fromGesture: true });
  // The child left this playback while the resume promise was pending.
  playback.running = false;
  pending.resolve(true);
  await flush();
  assert.strictEqual(pending.starts, 0,
    "An obsolete background resume must not start sounds on another screen");
}

async function testGhostHangingResumeCanRetryOnNextTap() {
  const ghost = read("ghost_writer");
  const code = slice(ghost, "  async function unlockAudio() {", "  async function loadSoundBuffers() {");
  const timerCallbacks = [];
  let allowsResume = false;
  let resumes = 0;
  const ac = {
    state: "interrupted", currentTime: 0, destination: {},
    resume() {
      resumes++;
      if (!allowsResume) return new Promise(() => {});
      this.state = "running";
      return Promise.resolve();
    },
    createOscillator() { return { connect() {}, start() {}, stop() {} }; },
    createGain() { return { gain: { value: 0 }, connect() {} }; }
  };
  class SilentAudio {
    setAttribute() {}
    play() { return Promise.resolve(); }
    pause() {}
  }
  const api = run(`let audioUnlocked = false, audioUnlockPromise = null, silenceAudio = null;
    const AUDIO_UNLOCK_SRC = "silence.mp3";
    function getAudioContext() { return ac; }
    function loadSoundBuffers() { return Promise.resolve(); }
    ${code}`, {
      ac, Audio: SilentAudio, console: { warn() {} },
      setTimeout: callback => { timerCallbacks.push(callback); return timerCallbacks.length; },
      clearTimeout() {}
    }, ["unlockAudio"]);
  const first = api.unlockAudio();
  assert.strictEqual(resumes, 1);
  assert.strictEqual(timerCallbacks.length, 1);
  timerCallbacks[0]();
  assert.strictEqual(await first, false, "A pending iOS resume must time out, not block future taps");
  allowsResume = true;
  assert.strictEqual(await api.unlockAudio(), true);
  assert.strictEqual(resumes, 2, "Next tap must attempt a new resume()");
}

function testGhostInterruptedSourceRequiresRecovery() {
  const ghost = read("ghost_writer");
  const code = slice(ghost,
    "  function playNextGhostSpookySound(token) {",
    "  function startGhostSpookySounds() {");
  const calls = [];
  const api = run(`let spookySoundActive = true, spookySoundToken = 4, muted = false;
    function getAudioContext() { return { state: "interrupted" }; }
    function noteGhostAudioInterruption() { calls.push("recovery"); }
    function chooseGhostSpookySoundKey() { calls.push("choose"); return "spooky1"; }
    ${code}`, { calls }, ["playNextGhostSpookySound"]);
  api.playNextGhostSpookySound(4);
  assert.deepStrictEqual(calls, ["recovery"],
    "Suspended sources must not silently consume spooky cues");
}

async function testGhostDeferredSoundStartAfterBlockedReplay() {
  const code = slice(read("ghost_writer"),
    "  function startGhostSpookySounds() {",
    "  // App switching can leave");
  const calls = [];
  const audio = { state: "interrupted" };
  const api = run(`let spookySoundActive = false, spookySoundToken = 0;
    let spookySoundQueue = [], spookyRecoveryPending = false;
    let muted = false, audioUnlockPromise = null;
    function stopGhostSpookySounds() { spookySoundActive = false; spookySoundToken++; calls.push("stop"); }
    function getAudioContext() { return audio; }
    function loadSoundBuffers() { calls.push("load"); return Promise.resolve(); }
    function playNextGhostSpookySound() { calls.push("play"); }
    ${code}
    function flags() { return { spookyRecoveryPending, spookySoundActive }; }
    function gestureResume(promise) { audioUnlockPromise = promise; }
  `, { calls, audio, document: { hidden: false } },
    ["startGhostSpookySounds", "flags", "gestureResume"]);

  api.startGhostSpookySounds();
  await flush();
  assert.strictEqual(api.flags().spookyRecoveryPending, true,
    "A failed deferred Replay start must remain retryable");
  assert.strictEqual(api.flags().spookySoundActive, false);
  assert.strictEqual(calls.includes("play"), false);

  audio.state = "suspended";
  api.gestureResume(Promise.resolve(true));
  api.startGhostSpookySounds();
  audio.state = "running";
  await flush();
  await flush();
  assert.strictEqual(calls.filter(x => x === "play").length, 1,
    "The gesture's pending resume should be reused after requestAnimationFrame");
}

async function testGhostDeferredRejectedResumeKeepsRecovery() {
  const code = slice(read("ghost_writer"),
    "  function startGhostSpookySounds() {",
    "  // App switching can leave");
  const audio = { state: "interrupted" };
  const api = run(`let spookySoundActive = false, spookySoundToken = 0;
    let spookySoundQueue = [], spookyRecoveryPending = false;
    let muted = false, audioUnlockPromise = Promise.resolve(false);
    function stopGhostSpookySounds() { spookySoundActive = false; spookySoundToken++; }
    function getAudioContext() { return audio; }
    function loadSoundBuffers() { throw new Error("must not load"); }
    function playNextGhostSpookySound() { throw new Error("must not play"); }
    ${code}
    function flags() { return { spookyRecoveryPending, spookySoundActive }; }
  `, { audio, document: { hidden: false } }, ["startGhostSpookySounds", "flags"]);
  api.startGhostSpookySounds();
  await flush();
  assert.strictEqual(api.flags().spookyRecoveryPending, true,
    "A rejected Resume during Replay must not permanently silence the next tap");
}

function testSourceGuards() {
  const ghost = read("ghost_writer");
  const typer = read("verse_typer");
  const wheel = read("wheel_of_bible");
  assert.match(ghost, /if \(audioUnlocked && ac\.state === "running"\)/);
  assert.match(ghost, /canvas\.onpointerdown = \(event\) => \{[\s\S]*?unlockAudioSoon\(\)/);
  assert.match(typer, /htmlAudioPrimePromise[\s\S]*?audio\.play\(\)/);
  assert.match(typer, /Switching screens must not cancel an in-flight silent prime/);
  assert.match(wheel, /preloadSpokenVerse\(\);/);
  assert.match(wheel, /offerSpokenAudioRetry\("Tap to hear the verse"/);
  assert.match(wheel, /offerSpokenAudioRetry\("Tap to hear the reference"/);
  assert.match(wheel, /void unlockAudio\(\);\s*void playVerseIntro\(\);/);
  const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(worker, /2026_Oct_16_ghost_audio_gesture_recovery_v/);
}

async function main() {
  await testGhostUnlockOnGestureAndRetry();
  await testGhostBackgroundPausesPlaybackAndRecoversSound();
  await testGhostStaleReplayCannotRestartSounds();
  await testGhostHangingResumeCanRetryOnNextTap();
  testGhostInterruptedSourceRequiresRecovery();
  await testGhostDeferredSoundStartAfterBlockedReplay();
  await testGhostDeferredRejectedResumeKeepsRecovery();
  await testTyperSilentPrimeIsDirectAndRetryable();
  await testTyperRecordedVerseRetry();
  await testWheelRecordedVerseDirectAndBlockedResult();
  testSourceGuards();
  console.log("Patch 14 audio sequencing validation passed (11 checks).");
}
main().catch(err => { console.error(err); process.exitCode = 1; });
