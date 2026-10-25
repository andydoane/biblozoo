#!/usr/bin/env node
/* Patch 57: focused real-source recovery tests for the main app and Feeding.
 * The tested helpers are extracted from the actual app scripts by the older
 * validation harnesses; no WebKit, Capacitor, or network is required. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { appHarness, flush } = require("./validate_app_audio_patch19");
const { feedingHarness } = require("./validate_audio_clock_recovery_patch56");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const feeding = fs.readFileSync(path.join(root, "daily_questions_feed_game.js"), "utf8");
const css = fs.readFileSync(path.join(root, "daily_questions_feed_game.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let assertions = 0;
function eq(actual, expected, explanation) {
  assertions++;
  assert.equal(actual, expected, explanation);
}
function ok(actual, explanation) {
  assertions++;
  assert.ok(actual, explanation);
}
function hasEvent(log, type) { return log.some(item => item.type === type); }

async function feedingOwnsRecoveryWhilePaused() {
  const a = appHarness();
  const paused = { hidden: false };
  a.document.querySelector = selector =>
    selector === "[data-daily-feed-resume-overlay]" ? paused : null;
  eq(await a.api.unlockAppAudio(), false,
    "App audio never starts on Feeding's visible pause overlay");
  eq(a.contexts.length, 0, "Feeding owns the first recovery gesture");
  paused.hidden = true;
  eq(await a.api.unlockAppAudio(), true,
    "App audio still unlocks normally outside Feeding pause");
  eq(a.contexts.length, 1, "Normal main app creates its own context");
  a.api.markAppAudioInterrupted();
  const first = a.api.unlockAppAudio();
  await flush(); a.fire(90);
  eq(await first, false, "Main context may still freeze independently");
  paused.hidden = false;
  eq(await a.api.unlockAppAudio(), false,
    "Main app skips a scheduled replacement while Feeding is paused");
  eq(a.contexts.length, 1, "No competing main-app context created");
  paused.hidden = true;
  const second = a.api.unlockAppAudio();
  await flush();
  eq(a.contexts.length, 2, "Main app can recover on a later standalone gesture");
  a.contexts[1].currentTime = 0.18;
  a.fire(90);
  eq(await second, true, "Main app still verifies audio clock after replacement");
}

async function mainAppBurstDeferralAndRecovery() {
  const a = appHarness();
  eq(await a.api.unlockAppAudio(), true, "Initial audio unlocked");
  a.api.markAppAudioInterrupted();
  const fail = async () => {
    const pending = a.api.unlockAppAudio();
    await flush();
    a.fire(90);
    eq(await pending, false, "Frozen main audio context fails verification");
  };
  await fail(); // Original context.
  await fail(); // First fresh context.
  eq(a.contexts.length, 2, "First replacement constructed");
  a.advance(1500);
  await fail(); // Second fresh context.
  eq(a.contexts.length, 3, "Second replacement constructed");
  eq(a.api.appAudioStatus().replacements, 2, "Replacement burst cap reached");
  a.advance(1500);
  await fail(); // Probe only, no fourth context.
  eq(a.contexts.length, 3, "Exhausted burst reuses the current context");
  const recovery = a.api.unlockAppAudio();
  await flush();
  a.contexts[2].currentTime = 0.18;
  a.fire(90);
  eq(await recovery, true,
    "Later gesture can recognize recovered clock without replacing engine");
  eq(a.api.appAudioStatus().pending, false, "Verified recovery clears interruption state");
}

async function feedingBurstDeferralAndRecovery() {
  const h = feedingHarness({ initialMode: "stalled", firstReplacementMode: "stalled" });
  const r = h.runtime;
  eq(h.api.pauseFeedingGame(r, 10000), true, "Labyrinth pauses");
  eq(r.resumeStatus.hidden, true, "No alarm message on a normal background return");
  async function attempt() {
    const accepted = h.api.attemptFeedingResumeFromGesture(r);
    await flush();
    if (accepted) await h.advance(180);
    return accepted;
  }
  eq(await attempt(), true, "Initial Resume gesture checked");
  eq(r.feedPausedAt, 10000, "Frozen clock keeps Labyrinth paused");
  eq(r.resumeStatus.hidden, false, "Friendly recovery message appears after failure");
  eq(r.resumeButton.textContent, "Try again!", "Retry button has actionable label");
  ok(r.resumeStatus.textContent.includes("go back"), "Exit option is explained");
  eq(await attempt(), true, "First replacement attempt accepted");
  eq(h.contexts.length, 2, "One fresh Feeding context");
  eq(r.feedAudioReplacements, 1, "Feeding counts replacements");
  eq(await attempt(), false, "Immediate tap does not create a new context");
  eq(h.contexts.length, 2, "Cooldown prevents churn");
  await h.advance(1500);
  eq(await attempt(), true, "Second replacement attempt accepted after cooldown");
  eq(h.contexts.length, 3, "Two Feeding replacements total");
  eq(r.feedAudioReplacements, 2, "Two-replacement burst cap recorded");
  await h.advance(1500);
  eq(await attempt(), true, "After cap, later taps still probe current context");
  eq(h.contexts.length, 3, "Feeding does not allocate fourth context in burst");
  ok(hasEvent(h.log, "feed-audio-replacement-deferred"),
    "Deferred replacement is visible in opt-in diagnostic log");
  eq(r.feedPausedAt, 10000, "Game state remains paused on repeated failures");
  eq(r.ballDeadline, 10500, "Labyrinth timer is not consumed by repeated failures");
  eq(r.score, 12, "Score is preserved");
  eq(r.caughtCount, 3, "Rewards preserved");
  eq(r.balls[0].x, 50, "Labyrinth ball position preserved");
  h.contexts[2].mode = "healthy";
  eq(await attempt(), true, "A later deliberate tap checks recovered clock");
  eq(r.feedPausedAt, null, "Healthy clock lets game resume");
  eq(r.resumeOverlay.hidden, true, "Recovery closes overlay");
  eq(r.resumeStatus.hidden, true, "Recovery clears failure message");
  eq(r.resumeButton.textContent, "Let's go!", "Default button text restored");
  eq(r.feedAudioReplacements, 0, "Successful recovery clears replacement count");
  h.api.discard();
}

async function feedingLongBackoffAllowsReplacement() {
  const h = feedingHarness({ initialMode: "stalled", firstReplacementMode: "stalled" });
  const r = h.runtime;
  h.api.pauseFeedingGame(r, 10000);
  async function tap() {
    const did = h.api.attemptFeedingResumeFromGesture(r);
    await flush(); if (did) await h.advance(180);
    return did;
  }
  await tap(); await tap();
  await h.advance(1500);
  await tap();
  eq(h.contexts.length, 3, "Both short-burst contexts were created");
  await h.advance(14500); // Still short of the 15-second interval.
  await tap();
  eq(h.contexts.length, 3, "Long backoff still blocks extra allocation");
  await h.advance(500);
  await tap();
  eq(h.contexts.length, 4, "Long backoff permits another fresh context");
  eq(r.feedAudioReplacements, 1, "Long-backoff replacement starts a fresh burst");
  h.api.discard();
}

function markupAndPwaChecks() {
  ok(app.includes("feedingResumeOwnsAudioGesture()"),
    "Shared app code explicitly recognizes the Feeding pause overlay");
  ok(app.includes("!tapTarget || feedingResumeOwnsAudioGesture()"),
    "Main app capture-phase button sounds do not compete with Feeding");
  ok(app.includes("APP_AUDIO_REPLACEMENT_BURST_LIMIT"), "App burst cap exists");
  ok(feeding.includes("FEED_AUDIO_REPLACEMENT_BURST_LIMIT"), "Feeding burst cap exists");
  ok(feeding.includes('data-daily-feed-resume-status'), "All four modes share retry status");
  ok(feeding.includes('data-daily-feed-resume-back'), "Pause dialog retains Exit/back button");
  ok(css.includes(".daily-feed-resume-overlay[hidden]") &&
    require("node:fs").readFileSync(require("node:path").resolve(__dirname,"../verse_games/shared/welcome-back.css"),"utf8").includes(".bz-welcome-status[hidden]"), "Normal pause has no new message");
  ok(/2026_Oct_25_patch(?:58_native_audio_session_diagnostics|59_native_reactivation_experiment|60_interruption_coordinator|61_shared_welcome_back|62_scramble_welcome_back|63_bugs_munch_splat_welcome_back)/.test(sw),
    "New PWA cache version will install edited files");
  ok(sw.includes('"./daily_questions_feed_game.css"'), "Resume styling cached offline");
  ok(sw.includes('"./daily_questions_feed_game.js"'), "Feeding script cached offline");
  ok(sw.includes('"./app.js"'), "Main audio logic cached offline");
  ok(!feeding.includes("Capacitor.Plugins") && !app.includes("@capacitor/app"),
    "Recovery remains browser/PWA-first with no required native plugin");
}

(async () => {
  await feedingOwnsRecoveryWhilePaused();
  await mainAppBurstDeferralAndRecovery();
  await feedingBurstDeferralAndRecovery();
  await feedingLongBackoffAllowsReplacement();
  markupAndPwaChecks();
  console.log(`Patch 57 coordinated audio recovery: ${assertions} assertions passed.`);
})().catch(err => { console.error(err); process.exitCode = 1; });
