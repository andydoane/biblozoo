#!/usr/bin/env node
/* Patch 56: real-source Feeding recovery tests with deterministic Web Audio clocks.
 * No native APIs, network, actual microphone or browser required. */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const feeding = fs.readFileSync(path.join(root, "daily_questions_feed_game.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let checks = 0;
function eq(actual, expected, message) { checks++; assert.equal(actual, expected, message); }
function ok(value, message) { checks++; assert.ok(value, message); }
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  ok(from >= 0 && to > from, `Real source section: ${start}`);
  return source.slice(from, to);
}
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }

function feedingHarness({ initialMode = "healthy", firstReplacementMode = "healthy", noAudio = false,
  mode = "labyrinth" } = {}) {
  let now = 10000, sequence = 0, lastTimer = 0;
  const timers = new Map(), contexts = [], log = [], sideEffects = [];
  let successorMode = firstReplacementMode;
  const document = { hidden: false };
  const performance = { now: () => now };
  function setTimeoutMock(fn, ms) {
    const id = ++lastTimer;
    timers.set(id, { fn, at: now + ms });
    return id;
  }
  function clearTimeoutMock(id) { timers.delete(id); }
  class MockContext {
    constructor(soundMode = successorMode) {
      this.mode = soundMode;
      this.state = "suspended";
      this.lastStartedAt = now;
      this.resumeCalls = 0;
      this.closed = false;
      this.unsettled = null;
      this.instance = ++sequence;
      contexts.push(this);
    }
    get currentTime() {
      return this.mode === "healthy" && this.state === "running"
        ? Math.max(0, (now - this.lastStartedAt) / 1000) : 0;
    }
    resume() {
      this.resumeCalls++;
      if (this.mode === "reject") return Promise.reject(new Error("blocked"));
      if (this.mode === "pending") return new Promise(resolve => { this.unsettled = resolve; });
      this.state = "running";
      this.lastStartedAt = now;
      return Promise.resolve();
    }
    close() { this.closed = true; this.state = "closed"; return Promise.resolve(); }
  }
  const window = { AudioContext: noAudio ? null : MockContext,
    webkitAudioContext: null,
    BibloZooAudioDiagnostics: { record(type, details) { log.push({ type, ...details }); } } };
  const code = `
    let activeRuntime = null;
    const FEED_MODES = { MELODY: "melody", CLASSIC: "classic", LABYRINTH: "labyrinth", BOUNCE: "bounce" };
    const FEED_AUDIO_CLOCK_PROBE_MS = 180;
    const FEED_AUDIO_CLOCK_MIN_ADVANCE = 0.012;
    const FEED_AUDIO_REPLACEMENT_COOLDOWN_MS = 1500;
    const FEED_AUDIO_REPLACEMENT_BURST_LIMIT = 2;
    const FEED_AUDIO_REPLACEMENT_BACKOFF_MS = 15000;
    function stopFeedingEffects() { sideEffects.push("stop-effects"); }
    function stopMelodyVoices() { sideEffects.push("stop-melody-voices"); }
    function pauseMelodyForInterruption(runtime, when) { runtime.melody.pausedAt = when; }
    function resumeMelodyAfterInterruption(runtime, when) {
      if (runtime.melody.pausedAt == null) return false;
      runtime.melody.startTime += when - runtime.melody.pausedAt;
      runtime.melody.pausedAt = null;
      sideEffects.push("resume-melody");
      return true;
    }
    function shiftFeedingDeadlines(runtime, delta) {
      runtime.ballDeadline += delta;
      runtime.nextScheduledAt += delta;
      runtime.finishAt += delta;
      sideEffects.push("shift:" + delta);
    }
    function scheduleFeedFrame(runtime) { return ++runtime.nextFrame; }
    function armTiltObservationFallback(runtime) { runtime.tiltFallbackId = 1; }
    function loadStarBuffer(context) { sideEffects.push("load-star:" + context.instance); return Promise.resolve(); }
    function loadChompBuffer(context) { sideEffects.push("load-chomp:" + context.instance); return Promise.resolve(); }
    function stopAudioContext(context) { context?.close(); }
    ${section(feeding, "  function recordFeedAudioRecovery(", "  function prepareAudio()")}
    ${section(feeding, "  function setFeedingResumeStatus(", "  function attachFeedInterruptionHandlers(")}
    this.api = { pauseFeedingGame, attemptFeedingResumeFromGesture,
      continueFeedingAfterGesture, feedAudioClockAdvances,
      use(runtime) { activeRuntime = runtime; }, discard() { activeRuntime = null; } };
  `;
  const sandbox = { document, window, performance, sideEffects,
    setTimeout: setTimeoutMock, clearTimeout: clearTimeoutMock,
    cancelAnimationFrame() { sideEffects.push("cancel-frame"); } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "Patch 56 feeding source" });
  const initial = noAudio ? null : new MockContext(initialMode);
  if (initial) {
    initial.state = "running";
    initial.lastStartedAt = now;
  }
  const classes = new Set();
  const runtime = {
    mode, roundStarted: true, running: true, finished: false,
    feedPausedAt: null, feedResumePending: false, feedResumeGeneration: 0,
    feedFrameGeneration: 0, feedPageHidden: false, feedAudioNeedsFreshContext: false,
    feedAudioRecoveryVerified: false, feedAudioReplacements: 0, feedAudioLastReplacementAt: 0,
    audioContext: initial, resumeOverlay: { hidden: true }, resumeButton: { disabled: false, textContent: "Resume" },
    resumeStatus: { hidden: true, textContent: "" },
    gameEl: { classList: { add(x) { classes.add(x); }, remove(x) { classes.delete(x); } } },
    stage: { releasePointerCapture() {} }, rafId: 7, nextFrame: 7,
    tiltEnabled: false, modeTimers: new Set(), feedSoundNodes: new Set(),
    modeController: { handleInput() { sideEffects.push("pointer-end"); } },
    ballDeadline: 10500, nextScheduledAt: 10900, finishAt: 11200,
    score: 12, caughtCount: 3, balls: [{ x: 50, y: 80, vx: 2 }],
    melody: { pausedAt: null, startTime: 9500, activeVoices: new Set() }
  };
  sandbox.api.use(runtime);
  async function advance(ms) {
    const end = now + ms;
    let guard = 0;
    while (true) {
      const due = [...timers].filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
      if (!due.length) break;
      const [id, task] = due[0];
      timers.delete(id);
      now = task.at;
      task.fn();
      await flush();
      if (++guard > 100) throw Error("Unexpected timer loop");
    }
    now = end;
    await flush();
  }
  return { api: sandbox.api, runtime, classes, contexts, log, sideEffects,
    document, window, advance, setReplacementMode: x => { successorMode = x; },
    get now() { return now; }, get pendingTimers() { return timers.size; } };
}

async function testSuccessForAllModes() {
  for (const mode of ["classic", "labyrinth", "melody", "bounce"]) {
    const h = feedingHarness({ initialMode: "healthy", mode });
    const {runtime:r, api} = h;
    eq(api.pauseFeedingGame(r, 10000), true, mode + " paused");
    eq(r.resumeOverlay.hidden, false, "Overlay visible");
    eq(api.attemptFeedingResumeFromGesture(r), true, "Gesture accepted");
    eq(r.resumeButton.disabled, true, "Button disabled only during probe");
    await flush();
    eq(r.feedPausedAt, 10000, "Not resumed merely because state is running");
    await h.advance(180);
    eq(r.feedPausedAt, null, "Resumes after advancing clock");
    eq(r.resumeOverlay.hidden, true, "Overlay dismissed after verification");
    eq(r.resumeButton.disabled, false, "Button enabled");
    eq(r.feedAudioRecoveryVerified, true, "Verified recovery recorded");
    eq(r.ballDeadline, 10680, "Game's deadlines shift by paused time");
    eq(r.score, 12, "Score unchanged");
    eq(r.caughtCount, 3, "Rewards unchanged");
    eq(r.balls[0].x, 50, "Board state preserved");
    ok(h.log.some(e => e.type === "feed-audio-resume-verified" && e.mode === mode),
      "Developer-only success diagnostic carries mode");
    if (mode === "melody") {
      eq(r.melody.pausedAt, null, "Melody resumes only when clock advances");
      ok(h.sideEffects.includes("resume-melody"), "Melody timeline resumed");
    }
    h.api.discard();
  }
}
async function testFrozenClockThenFreshGesture() {
  const h = feedingHarness({ initialMode: "stalled", firstReplacementMode: "healthy" });
  const r = h.runtime;
  h.api.pauseFeedingGame(r, 10000);
  eq(h.api.attemptFeedingResumeFromGesture(r), true, "First tap attempts recovery");
  await flush();
  await h.advance(180);
  eq(r.feedPausedAt, 10000, "Frozen clock doesn't dismiss overlay");
  eq(r.resumeButton.disabled, false, "Frozen clock allows retry");
  eq(r.feedAudioNeedsFreshContext, true, "Frozen clock flags replacement");
  ok(h.log.some(e => e.type === "feed-audio-resume-failed" && e.reason === "clock-stalled"),
    "Stalled clock identified in diagnostics");
  eq(h.api.attemptFeedingResumeFromGesture(r), true, "New tap constructs fresh context");
  eq(h.contexts.length, 2, "One replacement created");
  eq(h.contexts[0].state, "closed", "Old context closed");
  eq(h.contexts[1].resumeCalls, 1, "New context resumed on same gesture");
  await flush();
  await h.advance(180);
  eq(r.feedPausedAt, null, "Healthy replacement resumes game");
  eq(r.feedAudioReplacements, 0, "Replacement count clears after verified recovery");
  ok(h.log.some(e => e.type === "feed-audio-context-replaced"), "Replacement logged");
}
async function testCooldownKeepsPausedWithoutAContextStorm() {
  const h = feedingHarness({ initialMode: "stalled", firstReplacementMode: "stalled" });
  const r = h.runtime;
  h.api.pauseFeedingGame(r, 10000);
  h.api.attemptFeedingResumeFromGesture(r);
  await flush(); await h.advance(180);
  h.api.attemptFeedingResumeFromGesture(r);
  await flush(); await h.advance(180);
  eq(h.contexts.length, 2, "Second attempt replaced context once");
  eq(r.feedAudioNeedsFreshContext, true, "Repeated frozen clock requests another fresh context");
  eq(h.api.attemptFeedingResumeFromGesture(r), false, "Too-rapid retry is deferred");
  eq(r.resumeButton.disabled, false, "Cooldown leaves UI usable");
  eq(h.contexts.length, 2, "No runaway context creation");
  eq(r.feedPausedAt, 10000, "No game progress during cooldown");
  await h.advance(1500);
  h.setReplacementMode("healthy");
  eq(h.api.attemptFeedingResumeFromGesture(r), true, "Later gesture can try again");
  await flush(); await h.advance(180);
  eq(r.feedPausedAt, null, "Later genuine recovery resumes the game");
  eq(h.contexts.length, 3, "Only a bounded number of contexts created");
}
async function testHangingPromiseCannotResumeAfterTimeout() {
  const h = feedingHarness({ initialMode: "pending" });
  const r = h.runtime;
  r.audioContext.state = "suspended";
  h.api.pauseFeedingGame(r, 10000);
  h.api.attemptFeedingResumeFromGesture(r);
  eq(r.resumeButton.disabled, true, "Pending resume disables repeat tap");
  await h.advance(2500);
  eq(r.feedPausedAt, 10000, "Timeout doesn't resume gameplay");
  eq(r.resumeButton.disabled, false, "Watchdog restores Resume button");
  r.audioContext.unsettled(); // Completion from the timed-out promise.
  await flush();
  eq(r.feedPausedAt, 10000, "Late settlement cannot dismiss overlay");
  h.api.discard();
}
async function testBackgroundAndDisposedRecoveryIgnored() {
  const h = feedingHarness({ initialMode: "healthy" });
  const r = h.runtime;
  h.api.pauseFeedingGame(r, 10000);
  h.api.attemptFeedingResumeFromGesture(r);
  await flush();
  h.document.hidden = true;
  await h.advance(180);
  eq(r.feedPausedAt, 10000, "Backgrounding during clock probe never resumes");
  eq(r.resumeOverlay.hidden, false, "Overlay remains present");
  h.document.hidden = false;
  h.api.discard();
  await h.advance(2500);
  eq(r.feedPausedAt, 10000, "Disposed game remains paused");
}
async function testNoWebAudioFallback() {
  const h = feedingHarness({ noAudio: true, mode: "classic" });
  const r = h.runtime;
  h.api.pauseFeedingGame(r, 10000);
  eq(h.api.attemptFeedingResumeFromGesture(r), true, "Older browser fallback allowed");
  eq(r.feedPausedAt, null, "No-context browser isn't trapped");
  eq(h.contexts.length, 0, "No native audio dependency");
}
function testPackagingAndCompatibility() {
  ok(/const CACHE_VERSION = "2026_Oct_25_patch(?:58_native_audio_session_diagnostics|59_native_reactivation_experiment|60_interruption_coordinator|61_shared_welcome_back|62_scramble_welcome_back|63_bugs_munch_splat_welcome_back|64_action_games_welcome_back|64_1_recovery_escape_diagnostics|65_motion_audio_one_tap|66_invaders_shared_spinner)"/.test(serviceWorker),
    "PWA cache version bumped for changed source");
  ok(serviceWorker.includes('"./daily_questions_feed_game.js"'), "Feeding remains cached offline");
  ok(serviceWorker.includes('"./app.js"'), "Main audio remains cached offline");
  ok(!feeding.includes("Capacitor.Plugins"), "Feeding does not acquire native-only dependencies");
  ok(app.includes("appAudioClockAdvances(ctx)"), "Main app retains foreground clock verification");
  ok(app.includes("APP_AUDIO_REPLACEMENT_COOLDOWN_MS"), "Main app throttles repeated replacement");
}

async function runPatch56Tests() {
  await testSuccessForAllModes();
  await testFrozenClockThenFreshGesture();
  await testCooldownKeepsPausedWithoutAContextStorm();
  await testHangingPromiseCannotResumeAfterTimeout();
  await testBackgroundAndDisposedRecoveryIgnored();
  await testNoWebAudioFallback();
  testPackagingAndCompatibility();
  console.log(`Patch 56 Feeding/Web Audio recovery: ${checks} assertions passed.`);
}
module.exports = { feedingHarness, flush, section };
if (require.main === module) runPatch56Tests().catch(err => { console.error(err); process.exitCode = 1; });
