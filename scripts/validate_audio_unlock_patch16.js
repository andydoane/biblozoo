"use strict";

// Focused Patch 16 behavior checks; no browser or network is required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = location => fs.readFileSync(path.join(root, location), "utf8");
const extract = (source, begin, end) => {
  const start = source.indexOf(begin);
  const stop = source.indexOf(end, start + begin.length);
  assert.ok(start >= 0 && stop > start, `Missing ${begin}`);
  return source.slice(start, stop);
};
const run = (source, env, names) => {
  const box = { Promise, console, setTimeout, clearTimeout, ...env };
  vm.createContext(box);
  vm.runInContext(`${source}\nthis.api = {${names.join(",")}};`, box);
  return { api: box.api, box };
};
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
const oscillator = logs => ({
  type: "", frequency: { setValueAtTime() {} }, connect() {},
  start() { logs.push("oscillator"); }, stop() {}
});
const gain = () => ({
  gain: { value: 0, setValueAtTime() {} }, connect() {}
});
const gameFiles = [
  { path: "verse_games/verse_scramble_neo/game.js", preload: "preloadUiSounds" },
  { path: "verse_games/traffic_tap/game.js", preload: "preloadUiSoundBuffers" },
  { path: "verse_games/tower_bible/game.js", preload: "preloadAudioFiles" }
];

function makeVerseHarness(file) {
  const logs = [];
  let rejectResume = false;
  const ctx = {
    state: "suspended", currentTime: 0, destination: {},
    resume() {
      logs.push("resume");
      if (rejectResume) return Promise.reject(new Error("iOS denied resume"));
      return Promise.resolve().then(() => { this.state = "running"; });
    },
    createOscillator: () => oscillator(logs), createGain: gain
  };
  const helper = `
    let audioCtx = ctx, masterGain = {gain: {value: 1}}, audioUnlocked = false;
    function ensureAudioContext(){ return ctx; }
    function primeHtmlAudio(){ logs.push("html-prime"); }
    function primeZoomAudio(){ logs.push("zoom-prime"); }
    function preloadUiSoundBuffers(){ logs.push("ui-preload"); }
    function preloadUiSounds(){ logs.push("ui-preload"); }
    function preloadAudioFiles(){ logs.push("tower-preload"); }
  `;
  const begin = file.path.includes("traffic_tap")
    ? "  let audioUnlockInFlight = false;"
    : "  function unlockAudio() {";
  const code = extract(read(file.path), begin, "  function soundEnvelope(");
  const { api, box } = run(helper + code, {
    ctx, logs,
    document: { addEventListener() {} },
    window: { addEventListener() {} }
  }, ["unlockAudio", "audioUnlocked"]);
  return {
    api, ctx, logs, box,
    failResume(v) { rejectResume = v; },
    unlocked() { return vm.runInContext("audioUnlocked", box); }
  };
}

async function testVerseStateAndGesture(file) {
  const h = makeVerseHarness(file);
  assert.equal(h.api.unlockAudio(), false, `${file.path}: pending resume is not unlocked`);
  assert.equal(h.unlocked(), false);
  assert.ok(h.logs.indexOf("resume") < h.logs.indexOf("html-prime"),
    `${file.path}: request resume before HTML prime`);
  assert.ok(h.logs.includes("oscillator"), `${file.path}: oscillator starts in gesture`);
  await tick();
  assert.equal(h.unlocked(), true, `${file.path}: confirm running state after resume`);
}

async function testVerseFailedResumeRetries(file) {
  const h = makeVerseHarness(file);
  h.ctx.state = "interrupted";
  h.failResume(true);
  assert.equal(h.api.unlockAudio(), false);
  await tick();
  assert.equal(h.unlocked(), false, `${file.path}: rejected interrupted resume stays locked`);
  h.failResume(false);
  assert.equal(h.api.unlockAudio(), false);
  await tick();
  assert.equal(h.unlocked(), true, `${file.path}: later gesture retries successfully`);
  assert.equal(h.logs.filter(x => x === "resume").length, 2);
}

async function testScrubOverlappingAndRecovery() {
  const source = read("verse_playground/scripture_scrub/game.js");
  const code = extract(source, "  function unlockAudio() {", "  function soundVolume(");
  const logs = [];
  const deferred = [];
  const timers = [];
  const ctx = {
    state: "interrupted", currentTime: 1, destination: {},
    resume() {
      logs.push("resume");
      return new Promise((resolve, reject) => deferred.push({ resolve, reject }));
    },
    createOscillator: () => oscillator(logs), createGain: gain
  };
  const silent = { currentTime: 0, play() { logs.push("html-prime"); return Promise.reject(Error("blocked")); } };
  const helper = `
    let audioUnlocked = false, audioUnlockPromise = null;
    function getAudioContext(){ return ctx; }
    function ensureSilenceAudio(){ return silent; }
  `;
  const { api, box } = run(helper + code, {
    ctx, silent, logs,
    console: { warn() {} },
    setTimeout(cb) { timers.push(cb); return timers.length; },
    clearTimeout() {}
  }, ["unlockAudio"]);
  const first = api.unlockAudio();
  const second = api.unlockAudio();
  assert.strictEqual(first, second, "overlapping unlock calls share one promise");
  assert.deepEqual(logs.slice(0, 3), ["resume", "oscillator", "html-prime"]);
  assert.equal(deferred.length, 1, "only one resume in flight");
  deferred[0].reject(Error("denied"));
  assert.equal(await first, false);
  assert.equal(vm.runInContext("audioUnlocked", box), false);
  const next = api.unlockAudio();
  assert.equal(deferred.length, 2, "failed unlock can be retried");
  ctx.state = "running";
  deferred[1].resolve();
  assert.equal(await next, true);
  assert.equal(vm.runInContext("audioUnlocked", box), true);
}

async function testScrubHangingResumeRetries() {
  const source = read("verse_playground/scripture_scrub/game.js");
  const code = extract(source, "  function unlockAudio() {", "  function soundVolume(");
  let attempts = 0;
  const timers = [];
  const ctx = {
    state: "suspended", currentTime: 0, destination: {},
    resume() {
      attempts++;
      if (attempts === 1) return new Promise(() => {});
      this.state = "running";
      return Promise.resolve();
    },
    createOscillator: () => oscillator([]), createGain: gain
  };
  const { api } = run(`let audioUnlocked=false, audioUnlockPromise=null;
      function getAudioContext(){return ctx;}
      function ensureSilenceAudio(){return {play(){return Promise.resolve();}};}
      ${code}`, { ctx, setTimeout(cb) { timers.push(cb); return timers.length; }, clearTimeout() {} }, ["unlockAudio"]);
  const first = api.unlockAudio();
  assert.equal(attempts, 1);
  assert.equal(timers.length, 1);
  timers[0]();
  assert.equal(await first, false, "blocked WebKit resume must time out");
  assert.equal(await api.unlockAudio(), true, "new tap can start another resume");
  assert.equal(attempts, 2);
}

async function testScrubSoundRespectsContextState() {
  const source = read("verse_playground/scripture_scrub/game.js");
  const code = extract(source, "  async function playGameSound(key, volumeKey = key) {", "  function playRandomCookieBiteSound()");
  const state = { value: "interrupted", ready: false, plays: 0, loads: 0 };
  const ctx = {
    get state() { return state.value; }, destination: {},
    createBufferSource() { return { connect() {}, start() { state.plays++; } }; },
    createGain() { return { gain: {value: 0}, connect() {} }; }
  };
  const { api } = run(`let muted = false;
    function getAudioContext(){return ctx;}
    function unlockAudio(){ return Promise.resolve(state.ready); }
    function loadSoundBuffer(){ state.loads++; return Promise.resolve({}); }
    function soundVolume(){ return .5; }
    ${code}`, { ctx, state }, ["playGameSound"]);
  await api.playGameSound("pop1");
  assert.equal(state.plays, 0, "no sound while interrupted");
  assert.equal(state.loads, 0, "don't decode when unlock blocked");
  state.ready = true; state.value = "running";
  await api.playGameSound("pop1");
  assert.equal(state.plays, 1, "sound plays after real recovery");
}

function testScrubAudioRecipesPreserved() {
  const source = read("verse_playground/scripture_scrub/game.js");
  assert.match(source, /function playProgressToneStep\(step\)/);
  assert.match(source, /function playCompletionArpeggio\(\)/);
  assert.match(source, /async function startMowerSound\(duration\)/);
  assert.match(source, /generation !== mowerSoundGeneration \|\|\s*ctx\.state !== "running"/);
  assert.match(source, /if \(ctx\.state !== "running"\) \{\s*void unlockAudio\(\)\.then\(ready/);
  assert.doesNotMatch(source, /audioUnlockStarted/);
}

// Patch 16A: A foreground gesture must not be blocked forever by a previous
// WebKit resume() that never settled; repeated failures can replace the broken
// output context while preserving decoded audio buffers.
async function testTrafficTapHangingResumeAndFallback() {
  const source = read("verse_games/traffic_tap/game.js");
  const code = extract(source, "  let audioUnlockInFlight = false;", "  function soundEnvelope(");
  const contexts = [];
  const handlers = {};
  const timers = new Map();
  let timerId = 0;
  const counters = { prime: 0, zoom: 0, preload: 0 };
  class MockContext {
    constructor() {
      this.state = "interrupted";
      this.currentTime = 0;
      this.destination = {};
      this.resumes = [];
      this.closed = false;
      contexts.push(this);
    }
    resume() { return new Promise((resolve, reject) => this.resumes.push({ resolve, reject })); }
    createOscillator() { return oscillator([]); }
    createGain() { return gain(); }
    close() { this.closed = true; return Promise.resolve(); }
  }
  const uiSoundBuffers = new Map([["uiTap1", { decoded: true }]]);
  const { box } = run(`let audioCtx=null, masterGain=null, audioUnlocked=false, muted=false;
      const SOUND_TUNING = {masterVolume: 1};
      const uiSoundBuffers = cached;
      function primeHtmlAudio(){counters.prime++;}
      function primeZoomAudio(){counters.zoom++;}
      function preloadUiSoundBuffers(){counters.preload++;}
      ${code}`, {
        cached: uiSoundBuffers, counters,
        document: { addEventListener(name, callback) { handlers[name] = callback; } },
        window: { AudioContext: MockContext, addEventListener(name, callback) { handlers[name] = callback; } },
        setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); }
      }, ["unlockAudio"]);
  const fireTimer = () => {
    assert.equal(timers.size, 1, "exactly one resume watchdog");
    const [id, callback] = [...timers][0];
    timers.delete(id);
    callback();
  };
  handlers.pointerdown();
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].resumes.length, 1);
  assert.equal(counters.prime, 1);
  handlers.touchstart();
  assert.equal(contexts[0].resumes.length, 1, "same gesture cannot start overlapping resume calls");
  fireTimer();
  handlers.pointerdown();
  assert.equal(contexts.length, 1, "one timeout should retry existing context first");
  assert.equal(contexts[0].resumes.length, 2);
  fireTimer();
  handlers.pointerdown();
  assert.equal(contexts.length, 2, "two failed gestures should rebuild stuck iOS output context");
  assert.equal(contexts[1].resumes.length, 1);
  assert.equal(uiSoundBuffers.get("uiTap1").decoded, true, "buffers must survive output reset");
  contexts[0].state = "running";
  contexts[0].resumes[0].resolve(); // Stale completion must be ignored.
  await tick();
  assert.equal(vm.runInContext("audioUnlocked", box), false, "old context must not claim success");
  contexts[1].state = "running";
  contexts[1].resumes[0].resolve();
  await tick();
  assert.equal(vm.runInContext("audioUnlocked", box), true);
  assert.equal(contexts[0].closed, true, "replace, don't leak old AudioContext");
  handlers.pointerdown();
  assert.equal(contexts.length, 2);
  assert.equal(contexts[1].resumes.length, 1, "running context needs no new resume");
}

async function testTrafficTapForegroundEventsDeferToGesture() {
  const source = read("verse_games/traffic_tap/game.js");
  const code = extract(source, "  let audioUnlockInFlight = false;", "  function soundEnvelope(");
  const handlers = {};
  const resumes = [];
  const ctx = {
    state: "running", currentTime: 0, destination: {},
    resume() { resumes.push("resume"); this.state = "running"; return Promise.resolve(); },
    createOscillator: () => oscillator([]), createGain: gain
  };
  const logs = [];
  const { box } = run(`let audioCtx=ctx, masterGain={gain:{value: 1}}, audioUnlocked=true, muted=false;
    function primeHtmlAudio(){logs.push("prime");}
    function primeZoomAudio(){}
    function preloadUiSoundBuffers(){}
    ${code}`, { ctx, logs,
      document: { addEventListener(name, callback) { handlers[name] = callback; } },
      window: { addEventListener(name, callback) { handlers[name] = callback; } }
    }, ["unlockAudio"]);
  handlers.visibilitychange();
  handlers.pageshow();
  assert.deepEqual(resumes, [], "lifecycle callbacks must not call resume outside activation");
  assert.equal(vm.runInContext("audioUnlocked", box), false);
  handlers.keydown();
  assert.deepEqual(logs, ["prime"], "foreground key gesture must re-prime running context");
  assert.equal(vm.runInContext("audioUnlocked", box), true);
}

async function testTrafficTapUiSoundInterruptedAndLateBuffer() {
  const source = read("verse_games/traffic_tap/game.js");
  const code = extract(source, "  async function playUiBufferSound(key, volumeKey = \"uiTap\") {", "  function playUiTapSound() {");
  const calls = [];
  const pending = { resolve: null };
  const ac = {
    state: "interrupted", currentTime: 0, destination: {},
    resume() { calls.push("resume"); throw Error("should not happen"); },
    createBufferSource() { return { connect() {}, start() { calls.push("play"); } }; },
    createGain: gain
  };
  const { api } = run(`let muted=false, audioCtx=ac, masterGain={};
    function ensureAudioContext(){return ac;}
    function getSoundVolume(){return .45;}
    function clamp(x,min,max){return Math.max(min, Math.min(max,x));}
    function loadUiSoundBuffer(){ calls.push("buffer"); return new Promise(resolve=>{pending.resolve=resolve;}); }
    ${code}`, { ac, calls, pending }, ["playUiBufferSound"]);
  await api.playUiBufferSound("uiTap1");
  assert.deepEqual(calls, [], "interrupted UI sound must neither decode nor call resume outside gesture");
  ac.state = "running";
  const late = api.playUiBufferSound("uiTap1");
  ac.state = "interrupted";
  pending.resolve({});
  await late;
  assert.equal(calls.includes("play"), false, "a delayed UI buffer must not play on interrupted context");
  ac.state = "running";
  const played = api.playUiBufferSound("uiTap1");
  pending.resolve({});
  await played;
  assert.equal(calls.filter(x => x === "play").length, 1, "later running context can play");
}

function testTrafficTapEffectsDontAutoResume() {
  const source = read("verse_games/traffic_tap/game.js");
  const zoom = extract(source, "  function playZoomSound() {", "  function loadUiSoundBuffer(key) {");
  const game = extract(source, "  function playGameSound(eventId) {", "  preloadTrafficTapImages();");
  const calls = [];
  const ac = {
    state: "interrupted", currentTime: 0,
    createBufferSource() { return {connect(){}, start() {calls.push("zoom");}}; },
    createGain: gain
  };
  const { api } = run(`let muted=false, masterGain={gain:{value:1}};
    function ensureAudioContext(){ return ac; }
    function getZoomVolume(){return .5;}
    function loadZoomAudioBuffer(){calls.push("load");}
    const SOUND_PLAYERS = {correctTap(){calls.push("effect");}};
    const SOUND_TUNING = {masterVolume: 1};
    let zoomAudioBuffer={};
    ${zoom}
    ${game}`, { ac, calls }, ["playZoomSound", "playGameSound"]);
  api.playZoomSound();
  api.playGameSound("correctTap");
  assert.deepEqual(calls, [], "off-gesture effect callbacks must not resume or queue audio");
  ac.state = "running";
  api.playZoomSound();
  api.playGameSound("correctTap");
  assert.deepEqual(calls, ["zoom", "effect"], "running context must preserve zoom and generated sounds");
}

function testCacheVersion() {
  const sw = read("service-worker.js");
  assert.match(sw, /2026_Oct_16_traffic_tap_audio_recovery_y/);
}

async function main() {
  let checks = 0;
  for (const file of gameFiles) {
    await testVerseStateAndGesture(file); checks++;
    await testVerseFailedResumeRetries(file); checks++;
  }
  await testScrubOverlappingAndRecovery(); checks++;
  await testScrubHangingResumeRetries(); checks++;
  await testScrubSoundRespectsContextState(); checks++;
  testScrubAudioRecipesPreserved(); checks++;
  testCacheVersion(); checks++;
  await testTrafficTapHangingResumeAndFallback(); checks++;
  await testTrafficTapForegroundEventsDeferToGesture(); checks++;
  await testTrafficTapUiSoundInterruptedAndLateBuffer(); checks++;
  testTrafficTapEffectsDontAutoResume(); checks++;
  console.log(`Patch 16 audio unlock validation passed (${checks} checks).`);
}
main().catch(err => { console.error(err); process.exitCode = 1; });
