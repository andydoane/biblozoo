"use strict";

// Patch 17 audio sequencing regressions. Runs without a browser or network.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const games = ["verse_launch", "foodslice", "versey_bird", "verse_munch", "bible_bugs"];
const source = game => fs.readFileSync(path.join(root, "verse_games", game, "game.js"), "utf8");
function slice(s, a, b) {
  const i = s.indexOf(a), j = s.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, `Could not extract ${a}`);
  return s.slice(i, j);
}
function run(code, globals, names) {
  const sandbox = { Promise, console, ...globals };
  vm.createContext(sandbox);
  vm.runInContext(`${code}\nthis.testExports = { ${names.join(", ")} };`, sandbox);
  return sandbox.testExports;
}

function audioHarness(game) {
  const calls = [];
  const listeners = {};
  const timers = new Map();
  let timerId = 0, mode = "success", pendingResolve = null;
  let newContextCount = 0;
  const makeContext = () => ({
    state: "suspended", currentTime: 0, destination: {},
    suspend() { calls.push("suspend"); this.state = "suspended"; return Promise.resolve(); },
    close() { calls.push("close"); this.state = "closed"; return Promise.resolve(); },
    resume() {
      calls.push("resume");
      if (mode === "reject") return Promise.reject(new Error("iOS blocked resume"));
      if (mode === "pending") return new Promise(resolve => { pendingResolve = resolve; });
      this.state = "running";
      return Promise.resolve();
    },
    createOscillator() {
      calls.push("oscillator");
      return { frequency: { value: 0 }, connect() {}, disconnect() {},
        start() { calls.push("osc.start"); }, stop() {} };
    },
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
  });
  const ac = makeContext();
  const silent = {
    currentTime: 0,
    play() { calls.push("silent.play"); return Promise.reject(new Error("optional media blocked")); },
    pause() {}
  };
  const doc = {
    hidden: false,
    addEventListener(name, fn) { (listeners[`document:${name}`] ||= []).push(fn); }
  };
  const win = { addEventListener(name, fn) { (listeners[`window:${name}`] ||= []).push(fn); } };
  const code = slice(source(game), "  function unlockAudio() {", "  function soundVolume(");
  const api = run(`
    let audioCtx = ac;
    let audioUnlocked = false, audioUnlockPromise = null, audioUnlockAttempt = 0;
    let audioForegroundRecoveryPending = false, audioForegroundRecoveryTimer = 0;
    let audioForegroundRecoveryGeneration = 0, audioForegroundRecoveryInFlight = false;
    let audioForegroundFreshContextOnGesture = false;
    function getAudioContext() {
      if (!audioCtx) {
        calls.push("newContext");
        audioCtx = makeContext();
      }
      return audioCtx;
    }
    function ensureSilenceAudio() { return silent; }
    function preloadSoundBuffers() { calls.push("preload"); }
    ${code}`, {
    ac, silent, calls, document: doc, window: win, makeContext,
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id)
  }, ["unlockAudio", "markAudioBackgrounded", "scheduleForegroundAudioRecovery",
    "getAudioContext", "audioStatus: () => ({ unlocked: audioUnlocked, pending: audioForegroundRecoveryPending, fresh: audioForegroundFreshContextOnGesture, inFlight: audioForegroundRecoveryInFlight })"]);
  return {
    api, ac, calls, listeners, timers, document: doc,
    emit(name) { for (const fn of listeners[name] || []) fn(); },
    setMode(value) { mode = value; },
    triggerTimeout(delay) {
      const entry = [...timers.entries()].find(([, t]) => delay == null || t.delay === delay);
      assert.ok(entry, `Expected timer ${delay}`);
      const [id, timer] = entry;
      timers.delete(id);
      timer.fn();
    },
    finishPending() { assert.ok(pendingResolve); pendingResolve(); }
  };
}

async function testUnlockGesture(game) {
  const h = audioHarness(game);
  const result = h.api.unlockAudio();
  assert.equal(h.calls[0], "resume", `${game}: resume must precede other primes`);
  assert.ok(h.calls.indexOf("osc.start") > 0, `${game}: oscillator must start in gesture`);
  assert.ok(h.calls.includes("preload"), `${game}: sound buffers should preload during resume`);
  assert.ok(h.calls.includes("silent.play"), `${game}: optional prime must not be awaited first`);
  assert.equal(await result, true, `${game}: running context must unlock`);
  assert.equal(h.timers.size, 0, `${game}: resolved resume must release timeout`);
  h.ac.state = "interrupted";
  h.setMode("success");
  assert.equal(await h.api.unlockAudio(), true, `${game}: interrupted context must be rechecked`);
}

async function testBlockedThenRetry(game) {
  const h = audioHarness(game);
  h.setMode("reject");
  assert.equal(await h.api.unlockAudio(), false, `${game}: failed resume must not mark unlocked`);
  assert.equal(h.ac.state, "suspended");
  h.setMode("success");
  assert.equal(await h.api.unlockAudio(), true, `${game}: next gesture must retry`);
  assert.equal(h.calls.filter(x => x === "resume").length, 2);
}

async function testHangingResume(game) {
  const h = audioHarness(game);
  h.ac.state = "interrupted";
  h.setMode("pending");
  const first = h.api.unlockAudio();
  const same = h.api.unlockAudio();
  assert.equal(first, same, `${game}: concurrent unlocks share one attempt`);
  assert.equal(h.calls.filter(x => x === "resume").length, 1);
  h.triggerTimeout();
  assert.equal(await first, false, `${game}: hung resume must eventually unblock`);
  h.setMode("success");
  assert.equal(await h.api.unlockAudio(), true, `${game}: next gesture retries after timeout`);
  h.finishPending();
}


async function testBackgroundInvalidatesPending(game) {
  const h = audioHarness(game);
  h.setMode("pending");
  h.ac.state = "interrupted";
  const stale = h.api.unlockAudio();
  h.document.hidden = true;
  h.emit("document:visibilitychange");
  h.setMode("success");
  assert.equal(await h.api.unlockAudio(), true,
    `${game}: first foreground gesture can start a fresh attempt`);
  h.finishPending();
  assert.equal(await stale, false,
    `${game}: a pre-background resume must never overwrite the latest unlock result`);
}

async function testEffectsWaitForReady(game) {
  const s = source(game);
  const play = slice(s, "  async function playGameSound(", "  function playUiTapSound(");
  let bufferResolver;
  const pendingBuffer = () => new Promise(resolve => { bufferResolver = resolve; });
  let load = pendingBuffer;
  const ac = {
    state: "suspended", destination: {},
    resume() { throw new Error("automatic sound attempted resume"); },
    createBufferSource() { return { connect() {}, start() { starts++; } }; },
    createGain() { return { gain: { value: 0 }, connect() {} }; }
  };
  let starts = 0;
  const api = run(`
    const muted = false;
    let audioUnlockPromise = null, audioForegroundRecoveryPending = false;
    function getAudioContext() { return ac; }
    function loadSoundBuffer() { return load(); }
    function soundVolume() { return 0.5; }
    ${play}`, { ac, load: () => load(), console: { warn() {} } }, ["playGameSound"]);
  await api.playGameSound("correct");
  assert.equal(starts, 0, `${game}: automated effect cannot start on suspended context`);
  ac.state = "running";
  const delayed = api.playGameSound("correct");
  await Promise.resolve();
  assert.ok(bufferResolver, `${game}: running context starts buffer fetch`);
  ac.state = "interrupted";
  bufferResolver({});
  await delayed;
  assert.equal(starts, 0, `${game}: decoded buffer cannot play after interruption`);
  ac.state = "running";
  load = () => Promise.resolve({});
  await api.playGameSound("correct");
  assert.equal(starts, 1, `${game}: sound recovers when audio is running`);
}

async function flushMicrotasks() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

async function testRapidForegroundReturn(game) {
  const h = audioHarness(game);
  h.ac.state = "running";
  h.document.hidden = true;
  h.emit("document:visibilitychange");
  assert.equal(h.api.audioStatus().pending, true, `${game}: background marks recovery pending`);
  h.document.hidden = false;
  h.emit("document:visibilitychange");
  h.triggerTimeout(650);
  await flushMicrotasks();
  assert.ok(h.calls.includes("suspend"), `${game}: running context must cycle on foreground`);
  assert.ok(h.calls.includes("resume"), `${game}: suspended context must resume`);
  h.ac.currentTime = 0.2; // A genuinely running hardware clock advances after resume.
  h.triggerTimeout(90);
  await flushMicrotasks();
  assert.equal(h.api.audioStatus().pending, false, `${game}: running clock completes recovery`);
  assert.equal(h.api.audioStatus().unlocked, true);
}

async function testFrozenClockFallback(game) {
  const h = audioHarness(game);
  h.ac.state = "running";
  h.document.hidden = true;
  h.emit("document:visibilitychange");
  h.document.hidden = false;
  h.emit("window:focus");
  h.triggerTimeout(650);
  await flushMicrotasks();
  h.triggerTimeout(90); // iOS reports running, but the audio clock remains frozen.
  await flushMicrotasks();
  assert.equal(h.api.audioStatus().pending, true, `${game}: frozen clock must not be considered recovered`);
  assert.equal(h.api.audioStatus().fresh, true, `${game}: next user gesture should recreate failed context`);
  assert.equal(await h.api.unlockAudio(), true);
  assert.ok(h.calls.includes("newContext"), `${game}: next gesture replaces stuck audio context`);
  assert.ok(h.calls.includes("close"), `${game}: old stuck context must be closed`);
  assert.equal(h.api.audioStatus().pending, false);
}

async function testForegroundTimerCancellation(game) {
  const h = audioHarness(game);
  h.ac.state = "running";
  h.document.hidden = true;
  h.emit("window:blur");
  h.document.hidden = false;
  h.emit("window:focus");
  assert.equal(h.timers.size, 1, `${game}: foreground schedules one recovery`);
  h.document.hidden = true;
  h.emit("document:visibilitychange");
  assert.equal(h.timers.size, 0, `${game}: next background cancels stale recovery`);
  assert.ok(!h.calls.includes("suspend"), `${game}: no stale foreground recovery while hidden`);
}

async function testGestureOvertakesForegroundRefresh(game) {
  const h = audioHarness(game);
  h.ac.state = "running";
  h.document.hidden = true;
  h.emit("document:visibilitychange");
  h.document.hidden = false;
  h.emit("document:visibilitychange");
  h.triggerTimeout(650); // refresh suspends and awaits the old context
  assert.equal(h.api.audioStatus().inFlight, true);
  assert.equal(await h.api.unlockAudio(), true, `${game}: gesture takes over the pending refresh`);
  await flushMicrotasks();
  assert.ok(h.calls.includes("newContext"), `${game}: gesture must not reuse context being recycled`);
  assert.equal(h.api.audioStatus().pending, false,
    `${game}: stale foreground completion cannot overwrite the gesture's success`);
}

function testGameSpecificGuards() {
  const launch = source("verse_launch");
  const launchGenerated = slice(launch, "  async function playCountdownBeep(", "  function parseReferenceParts(");
  assert.match(launchGenerated, /ctx\.state !== "running"/);
  assert.doesNotMatch(launchGenerated, /ctx\.resume\(/,
    "Countdowns/projectiles must not start Web Audio resumes outside user gestures");
  assert.match(launch, /async function handleLaunch\(choiceId\)[\s\S]*?unlockAudio\(\)/);

  const bird = source("versey_bird");
  assert.match(bird, /audioUnlocked && audioCtx\?\.state === "running"/,
    "Halfway nap must recheck the actual AudioContext before wake sounds");
  assert.match(bird, /function handleInput\(event\)[\s\S]*?void unlockAudio\(\)/);

  const bugs = source("bible_bugs");
  assert.match(bugs, /field\.addEventListener\("pointerdown", \(event\) => \{[\s\S]*?void unlockAudio\(\)/,
    "Bug taps must request audio activation before any tongue/pop effects");
  const munch = source("verse_munch");
  assert.match(munch, /beltLayer\.addEventListener\("pointerdown", \(e\) => \{\s*void unlockAudio\(\)/);
  const food = source("foodslice");
  assert.match(food, /document\.addEventListener\("pointerdown", \(\) => \{ void unlockAudio\(\); \}, \{ capture: true \}\)/);
}

async function main() {
  for (const game of games) {
    await testUnlockGesture(game);
    await testBlockedThenRetry(game);
    await testHangingResume(game);
    await testBackgroundInvalidatesPending(game);
    await testEffectsWaitForReady(game);
    await testRapidForegroundReturn(game);
    await testFrozenClockFallback(game);
    await testForegroundTimerCancellation(game);
    await testGestureOvertakesForegroundRefresh(game);
  }
  testGameSpecificGuards();
  const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
  assert.match(worker, /2026_Oct_16_(?:patch17a_audio_focus_race_aa|patch18(?:b_verse_jam_resume_beat_ad|a_verse_jam_phrase_resume_ac|_verse_jam_audio_recovery_ab))/);
  console.log("Patch 17A Verse Game audio validation passed (47 checks).");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
