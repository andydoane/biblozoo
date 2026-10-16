"use strict";

// Patch 18: isolated Web Audio interruption tests, runnable with Node only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "verse_playground/verse_jam/game.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "verse_playground/verse_jam/index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
function between(a, b) {
  const i = source.indexOf(a), j = source.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, `Couldn't extract ${a}`);
  return source.slice(i, j);
}

function harness() {
  const calls = [];
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0, now = 0, mode = "success", pendingResolve = null;
  const ac = {
    state: "suspended", currentTime: 0, sampleRate: 44100,
    resume() {
      calls.push("resume");
      if (mode === "reject") return Promise.reject(new Error("resume blocked"));
      if (mode === "pending") return new Promise(resolve => { pendingResolve = resolve; });
      this.state = "running";
      return Promise.resolve();
    },
    suspend() { calls.push("suspend"); this.state = "suspended"; return Promise.resolve(); },
    createBuffer() { calls.push("createBuffer"); return {}; },
    createBufferSource() {
      return { connect() {}, start() { calls.push("source.start"); } };
    },
    createGain() { return { gain: { setValueAtTime(value) { calls.push(`gain:${value}`); } }, connect() {} }; }
  };
  const doc = { hidden: false, addEventListener(name, cb) { listeners.set(`document:${name}`, cb); } };
  const win = { addEventListener(name, cb) { listeners.set(`window:${name}`, cb); } };
  const mockTimers = {
    setTimeout(cb, delay) { const id = ++timerId; timers.set(id, { cb, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const body = between("  // A resolved resume() is not proof", "\n  const state = {");
  const mute = between("  function setMuted(value) {", "  function midiToFreq(");
  const globals = {
    Promise, console: { warn() {} }, document: doc, window: win, performance: { now: () => now },
    ...mockTimers, ac, calls,
  };
  const context = vm.createContext(globals);
  vm.runInContext(`
    let audioCtx = ac, masterGain = { gain: { setValueAtTime(value) { calls.push('gain:' + value); } } };
    let muted = false, audioUnlocked = false, audioUnlockPromise = null;
    let audioUnlockAttempt = 0, audioUnlockRequestedAt = 0;
    let audioForegroundRecoveryPending = false, audioForegroundRecoveryGeneration = 0;
    let audioForegroundRecoveryTimer = 0, audioNeedsGestureRefresh = false;
    let resumeBeatGestureGeneration = 0, resumeBeatInFlight = false;
    const state = { resumeAfterInterruption: false, resumeBeatApproved: false };
    const AUDIO_UNLOCK_TIMEOUT_MS = 1200;
    const AUDIO_FOREGROUND_RECOVERY_DELAY_MS = 650;
    const AUDIO_CLOCK_PROBE_MS = 100;
    const MIX = { gameMaster: 1 };
    function primeHtmlAudio() { calls.push('primeHtml'); }
    function createAudioGraph() { calls.push('graph'); }
    function loadSoundBitBuffers() { calls.push('loadSoundBits'); }
    function loadUiTapBuffers() { calls.push('loadUiTaps'); }
    function trackAudioSource(source) { return source; }
    function noteGameplayActivity() { calls.push('gameplayActivity'); }
    ${body}
    ${mute}
    this.api = {
      unlockAudioFromGesture, markVerseJamAudioBackgrounded,
      scheduleVerseJamForegroundRecovery, installAudioUnlockHandlers, setMuted,
      status: () => ({ unlocked: audioUnlocked, pending: audioForegroundRecoveryPending,
        refresh: audioNeedsGestureRefresh, muted, context: audioCtx })
    };
  `, context);
  return {
    ac, calls, listeners, timers, doc, api: context.api,
    setMode(value) { mode = value; },
    setNow(value) { now = value; },
    finishPending() { assert.ok(pendingResolve); pendingResolve(); },
    fire(name) { const cb = listeners.get(name); assert.ok(cb, name); cb(); },
    runTimer(delay) {
      const entry = [...timers.entries()].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `Missing timer for ${delay}ms`);
      const [id, { cb }] = entry; timers.delete(id); cb();
    }
  };
}

async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
async function finishRecoveryTap(h) {
  const attempt = h.api.unlockAudioFromGesture();
  await flush();
  for (let i = 0; i < 4 && [...h.timers.values()].some(t => t.delay === 100); i++) {
    h.ac.currentTime += 0.2;
    h.runTimer(100);
    await flush();
  }
  return attempt;
}
let checks = 0;
function pass() { checks++; }

async function main() {
  {
    const h = harness();
    assert.equal(await finishRecoveryTap(h), true);
    assert.equal(h.calls.filter(x => x === "resume").length, 1);
    assert.ok(h.calls.indexOf("resume") < h.calls.indexOf("source.start"));
    assert.ok(h.calls.includes("loadSoundBits") && h.calls.includes("loadUiTaps"));
    assert.equal(h.api.status().unlocked, true);
    pass();
  }
  {
    const h = harness();
    h.setMode("reject");
    assert.equal(await finishRecoveryTap(h), false);
    assert.equal(h.api.status().unlocked, false);
    h.setMode("success");
    h.setNow(300);
    assert.equal(await finishRecoveryTap(h), true);
    assert.equal(h.calls.filter(x => x === "resume").length, 2);
    pass();
  }
  {
    const h = harness();
    h.setMode("pending");
    const first = h.api.unlockAudioFromGesture();
    h.setNow(100);
    assert.equal(h.api.unlockAudioFromGesture(), first);
    h.runTimer(1200);
    assert.equal(await first, false);
    h.setMode("success");
    h.setNow(300);
    assert.equal(await finishRecoveryTap(h), true);
    h.finishPending();
    await flush();
    assert.equal(h.api.status().unlocked, true);
    pass();
  }
  {
    const h = harness();
    h.api.installAudioUnlockHandlers();
    await finishRecoveryTap(h);
    h.doc.hidden = true; h.fire("document:visibilitychange");
    assert.equal(h.api.status().unlocked, false);
    assert.equal(h.api.status().pending, true);
    h.doc.hidden = false; h.fire("document:visibilitychange");
    assert.ok([...h.timers.values()].some(t => t.delay === 650));
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.api.scheduleVerseJamForegroundRecovery();
    h.runTimer(650);
    h.ac.currentTime = 2;
    h.runTimer(100);
    await flush();
    assert.equal(h.api.status().pending, false);
    assert.equal(h.calls.includes("suspend"), false, "healthy audio clock must not be cycled");
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.api.scheduleVerseJamForegroundRecovery();
    h.runTimer(650);
    h.runTimer(100);
    await flush();
    assert.ok(h.calls.includes("suspend"), "frozen clock triggers recovery");
    assert.ok(h.calls.includes("resume"));
    h.ac.currentTime = 1;
    h.runTimer(100);
    assert.equal(h.api.status().unlocked, true);
    assert.equal(h.api.status().pending, false);
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.api.scheduleVerseJamForegroundRecovery();
    h.runTimer(650); h.runTimer(100);
    await flush();
    h.runTimer(100); // no audio clock movement after resume
    assert.equal(h.api.status().unlocked, false);
    assert.equal(h.api.status().refresh, true);
    h.setNow(300);
    assert.equal(await finishRecoveryTap(h), true);
    assert.equal(h.api.status().unlocked, true);
    assert.ok(h.calls.filter(x => x === "suspend").length >= 2);
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    const suspect = h.api.unlockAudioFromGesture();
    await flush();
    h.runTimer(100); // context says running, but iOS audio clock is frozen
    assert.equal(await suspect, false);
    assert.equal(h.api.status().unlocked, false);
    assert.equal(h.api.status().refresh, true);
    h.setNow(400);
    assert.equal(await finishRecoveryTap(h), true);
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.api.scheduleVerseJamForegroundRecovery();
    h.doc.hidden = true;
    h.api.markVerseJamAudioBackgrounded();
    assert.ok(![...h.timers.values()].some(t => t.delay === 650));
    assert.equal(h.api.status().unlocked, false);
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.setNow(500);
    assert.equal(await finishRecoveryTap(h), true);
    assert.ok(h.calls.includes("suspend"), "first foreground gesture retries an ambiguous running context");
    pass();
  }
  {
    const h = harness();
    h.api.setMuted(true);
    assert.equal(h.api.status().muted, true);
    assert.ok(h.calls.includes("gain:0"));
    h.api.setMuted(false);
    await flush();
    assert.ok(h.calls.includes("gain:0.72"));
    assert.equal(h.api.status().unlocked, true, "unmute triggers a fresh unlock");
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.api.scheduleVerseJamForegroundRecovery();
    h.runTimer(650); // probe queued
    h.setNow(500);
    assert.equal(await finishRecoveryTap(h), true);
    assert.equal(h.api.status().pending, false);
    assert.ok(![...h.timers.values()].some(t => t.delay === 100),
      "stale automatic callbacks cannot restore the interrupted state");
    pass();
  }
  {
    const h = harness();
    h.setMode("pending");
    const oldAttempt = h.api.unlockAudioFromGesture();
    h.api.markVerseJamAudioBackgrounded();
    h.doc.hidden = false;
    h.setMode("success");
    h.setNow(400);
    assert.equal(await finishRecoveryTap(h), true);
    h.finishPending();
    assert.equal(await oldAttempt, false, "stale pre-background unlock cannot win");
    assert.equal(h.api.status().unlocked, true);
    pass();
  }
  {
    const h = harness();
    h.ac.state = "interrupted";
    h.api.markVerseJamAudioBackgrounded();
    h.api.scheduleVerseJamForegroundRecovery();
    h.setMode("reject");
    h.runTimer(650); h.runTimer(100);
    await flush();
    assert.equal(h.api.status().pending, true);
    assert.equal(h.api.status().refresh, true);
    h.setMode("success");
    h.setNow(400);
    assert.equal(await finishRecoveryTap(h), true);
    pass();
  }
  {
    const h = harness();
    h.ac.state = "running";
    h.api.markVerseJamAudioBackgrounded();
    h.doc.hidden = true;
    h.api.scheduleVerseJamForegroundRecovery();
    assert.equal(h.timers.size, 0, "lock screen must not queue foreground resume");
    h.doc.hidden = false;
    h.api.scheduleVerseJamForegroundRecovery();
    assert.ok(h.timers.size > 0, "unlocking the screen queues a recheck");
    pass();
  }
  {
    const code = between("  function startBeatLoop(", "  function scheduleBeat(");
    assert.match(code, /audioCtx\.state !== "running"/);
    assert.match(code, /document\.hidden/);
    assert.match(code, /missedBeats/);
    assert.match(code, /state\.beatCount \+= missedBeats/);
    const recovery = between("  // A resolved resume() is not proof", "  const state = {");
    assert.doesNotMatch(recovery, /startBeatLoop\(|startNextPlayableGroup\(|stopRun\(|initVerseData\(|markVersePracticed\(/);
    assert.match(source, /document\.hidden \|\|\s*audioForegroundRecoveryPending \|\|/);
    pass();
  }
  {
    const code = between("  function startBeatLoop(", "  function scheduleBeat(");
    const scheduled = [];
    let intervalTick;
    const sandbox = vm.createContext({
      audioCtx: { state: "running", currentTime: 30 }, document: { hidden: false },
      state: { beatCount: 0, musicStartTime: 0, nextScheduledBeatTime: 0 },
      musicGeneration: 0,
      stopMusic() {}, secondsPerBeat: () => 0.5,
      scheduleBeat(index, when) { scheduled.push([index, when]); },
      setInterval(fn) { intervalTick = fn; return 1; }
    });
    vm.runInContext(`${code}; this.startBeatLoop = startBeatLoop;`, sandbox);
    sandbox.startBeatLoop();
    sandbox.audioCtx.currentTime = 90;
    intervalTick();
    assert.ok(scheduled.length <= 4, "long background gap cannot burst missed beats");
    assert.ok(sandbox.state.beatCount > 100, "beat count must advance without restarting the round");
    pass();
  }
  {
    const mute = between("  function setMuted(value) {", "  function midiToFreq(");
    assert.match(mute, /if \(!muted && \(!audioUnlocked/);
    const effects = between("  function playUiTapFallback() {", "  function playWordNote(");
    assert.match(effects, /audioCtx\.state !== "running"/);
    assert.match(source, /audioCtx\.addEventListener\?\.\("statechange"/);
    pass();
  }
  {
    assert.match(source, /Some wireless headphones have a delay/);
    assert.match(source, /id="verseJamHeadphonesGotIt"/);
    assert.match(indexHtml, /<script src="\.\/game\.js"><\/script>/);
    assert.match(worker, /2026_Oct_16_patch18(?:b_verse_jam_resume_beat_ad|a_verse_jam_phrase_resume_ac|_verse_jam_audio_recovery_ab)/);
    pass();
  }
  {
    const existing = fs.readFileSync(path.join(root, "scripts/validate_verse_game_audio_patch17.js"), "utf8");
    for (const check of ["testRapidForegroundReturn", "testFrozenClockFallback", "testBackgroundInvalidatesPending", "testEffectsWaitForReady"]) {
      assert.ok(existing.includes(check), `Patch 17 cross-game regression missing: ${check}`);
    }
    pass();
  }
  console.log(`Patch 18 Verse Jam audio validation passed (${checks} checks).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
