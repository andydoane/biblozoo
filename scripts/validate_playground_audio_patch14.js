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
  const sandbox = { Promise, queueMicrotask, console, ...globals };
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
  assert.match(worker, /2026_Oct_16_playground_audio_sequence_t/);
}

async function main() {
  await testGhostUnlockOnGestureAndRetry();
  await testTyperSilentPrimeIsDirectAndRetryable();
  await testTyperRecordedVerseRetry();
  await testWheelRecordedVerseDirectAndBlockedResult();
  testSourceGuards();
  console.log("Patch 14 audio sequencing validation passed (5 checks).");
}
main().catch(err => { console.error(err); process.exitCode = 1; });
