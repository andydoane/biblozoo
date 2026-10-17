#!/usr/bin/env node
/*
 * Patch 25 — cross-feature audio integration checks.
 * Uses actual host navigation functions in an isolated VM; does not need
 * a browser, network, microphone, or audio hardware.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const appSource = read("app.js");
const questionSource = read("daily_questions.js");
const feedingSource = read("daily_questions_feed_game.js");
const flashcardsSource = read("flashcards/flashcards.js");
const recordingSource = read("flashcards/recording.js");
const effectsSource = read("flashcards/audio-effects.js");
const todoSource = read("daily_zoo_todo.js");
const workerSource = read("service-worker.js");
const DailyTodo = require("../daily_zoo_todo.js");
let checks = 0;
function ok(value, description) { assert.ok(value, description); checks++; }
function eq(actual, expected, description) { assert.equal(actual, expected, description); checks++; }

function snippet(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source boundary: ${start} / ${end}`);
  return source.slice(from, to);
}

const navigationSource = [
  snippet(appSource, "function cancelLearnAudio() {", "async function runEchoSequence("),
  snippet(appSource, "function go(nextScreen) {", "/* If you jump directly"),
  snippet(appSource, "function setScreen(screen) {", "function updateSlideTransforms()")
].join("\n");

const Screen = Object.freeze({
  TITLE: "title", LEARN: "learn", CHUNKS: "chunks", ECHO: "echo",
  TODO_DEV: "todo_dev", VERSE_DETAIL: "verse_detail", PET_UNLOCK: "pet_unlock",
  FLASHCARDS: "flashcards", READ_MY_VERSE: "read_my_verse",
  DAILY_SNACK: "daily_snack", NEW_VERSE_PICKER: "new_verse_picker",
  DAILY_SESSION: "daily_session"
});

function makeHost(initialScreen) {
  const calls = [];
  const timers = new Map();
  let nextTimer = 1;
  const media = { currentTime: 8, paused: false,
    pause() { this.paused = true; calls.push("learn:pause"); } };
  const state = {
    screen: initialScreen,
    isSliding: false, slideX: 0, transitionFromIdx: null, transitionToIdx: null,
    forceSlideForward: false, audioMode: "echo", instructionPlaying: true,
    instructionKey: "listen", listenPlaying: true, chunkRunning: true,
    echoRunning: true, echoSpeaking: true, sayVerseActive: false,
    finalRecallActive: false
  };
  const screenNames = Object.values(Screen);
  const screenToIndex = (name) => screenNames.indexOf(name);
  const effects = { flashcards: true, read: true, feeding: true,
    tutorial: true, detail: true, pet: true, picker: true };
  const end = (name) => {
    calls.push(name);
    if (name === "flashcards:stop") effects.flashcards = false;
    if (name === "read:stop") effects.read = false;
    if (name === "feed:stop") effects.feeding = false;
    if (name === "tutorial:stop") effects.tutorial = false;
    if (name === "detail:stop") effects.detail = false;
    if (name === "pet:stop") effects.pet = false;
    if (name === "picker:stop") effects.picker = false;
  };
  const window = {
    BibloZooFlashcards: { stopSession: () => end("flashcards:stop") },
    BibloZooReadMyVerse: { stopSession: () => end("read:stop") },
    BibloZooDailyFeedGame: { stop: () => end("feed:stop") }
  };
  const context = {
    State: state, Screen, window, audioEl: media,
    learnAudioInterrupted: { screen: initialScreen },
    learnAudioResumeAttempt: { watchdog: 500 },
    learnAudioResumeError: "blocked", learnShortInstructionNeedsRender: true,
    activeLearnInstructionRequest: { id: 1 }, activeLearnAudioWaitCancel: () => calls.push("learn:wait-cancel"),
    echoCancelToken: 0,
    screenToIndex, updateSlideTransforms: () => calls.push("ui:slide"),
    renderNav: () => calls.push("ui:nav"),
    render: () => {
      calls.push("ui:render");
      if (state.screen !== initialScreen && !media.paused) calls.push("FAIL:learn-playing-at-render");
    },
    syncLearnAudioResumeOverlay: () => calls.push("ui:overlay"),
    stopZooTodoTutorialPageAudio: () => end("tutorial:stop"),
    cancelVerseDetailListen: () => end("detail:stop"),
    stopPetUnlockPackageSound: () => end("pet:stop"),
    stopNewVersePickerPreviewAudio: () => end("picker:stop"),
    clearPetAnimationCycle: () => calls.push("pet:clear-animation"),
    startPetAnimationCycle: () => calls.push("pet:start-animation"),
    requestAnimationFrame: (fn) => { /* animation intentionally not advanced */ return 1; },
    setTimeout: (fn) => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout: (id) => { calls.push("timer:clear"); timers.delete(id); },
    getVerseProgress: () => ({}),
    console
  };
  vm.runInNewContext(navigationSource, context, { filename: "app.js:patch25-navigation" });
  return { context, calls, state, media, effects };
}

function testDirectNavigation() {
  const routes = [
    [Screen.FLASHCARDS, "flashcards:stop"],
    [Screen.READ_MY_VERSE, "read:stop"],
    [Screen.DAILY_SNACK, "feed:stop"],
    [Screen.VERSE_DETAIL, "detail:stop"],
    [Screen.TODO_DEV, "tutorial:stop"],
    [Screen.PET_UNLOCK, "pet:stop"],
    [Screen.NEW_VERSE_PICKER, "picker:stop"]
  ];
  for (const [from, cleanup] of routes) {
    const f = makeHost(from);
    f.context.setScreen(Screen.TITLE);
    eq(f.calls.filter(x => x === cleanup).length, 1,
      `direct ${from} -> title releases its activity exactly once`);
    eq(f.state.screen, Screen.TITLE, `direct ${from} -> title arrives`);
    ok(f.media.paused, `direct ${from} -> title releases Learn media`);
    ok(!f.calls.includes("FAIL:learn-playing-at-render"), `direct ${from} renders only after Learn cancellation`);
    eq(f.state.echoRunning, false, `direct ${from} cancels pending echo`);
  }
  const f = makeHost(Screen.LEARN);
  f.context.setScreen(Screen.FLASHCARDS);
  eq(f.calls.filter(x => x === "learn:pause").length, 1,
    "direct Learn -> Flashcards pauses Learn audio exactly once");
  eq(f.calls.filter(x => x === "learn:wait-cancel").length, 1,
    "direct Learn -> Flashcards releases pending Learn audio wait");
  ok(!f.calls.includes("FAIL:learn-playing-at-render"),
    "new Flashcards screen does not render while Learn is still playing");
  const noOp = makeHost(Screen.TITLE);
  noOp.context.setScreen(Screen.TITLE);
  eq(noOp.calls.filter(x => x === "learn:pause").length, 0,
    "redrawing the same screen does not unnecessarily stop Learn audio");
}

function testSlidingNavigation() {
  const routes = [
    [Screen.FLASHCARDS, "flashcards:stop"],
    [Screen.READ_MY_VERSE, "read:stop"],
    [Screen.DAILY_SNACK, "feed:stop"],
    [Screen.VERSE_DETAIL, "detail:stop"],
    [Screen.TODO_DEV, "tutorial:stop"],
    [Screen.PET_UNLOCK, "pet:stop"],
    [Screen.NEW_VERSE_PICKER, "picker:stop"]
  ];
  for (const [from, cleanup] of routes) {
    const f = makeHost(from);
    f.context.go(Screen.TITLE);
    eq(f.calls.filter(x => x === cleanup).length, 1,
      `sliding ${from} -> title releases old audio exactly once`);
    eq(f.state.screen, Screen.TITLE, `sliding ${from} changes screen`);
    ok(f.media.paused, `sliding ${from} releases Learn media`);
    ok(!f.calls.includes("FAIL:learn-playing-at-render"),
      `sliding ${from} renders after old audio is stopped`);
    eq(f.state.isSliding, true, `sliding ${from} transition in progress`);
    f.context.go(Screen.READ_MY_VERSE);
    eq(f.state.screen, Screen.TITLE,
      `sliding ${from} ignores second navigation until transition settles`);
    eq(f.calls.filter(x => x === cleanup).length, 1,
      `sliding ${from} second click cannot trigger duplicate teardown`);
  }
  const f = makeHost(Screen.LEARN);
  f.context.go(Screen.TITLE);
  eq(f.calls.filter(x => x === "learn:pause").length, 1,
    "Learn slide navigation pauses media once");
  const noop = makeHost(Screen.LEARN);
  noop.context.go(Screen.LEARN);
  eq(noop.calls.filter(x => x === "learn:pause").length, 0,
    "navigating to same slide does not interfere with playback");
}

function testMutePropagation() {
  const muteSource = snippet(appSource, "function toggleMute() {", "function safePlay() {");
  const calls = [];
  const audio = { currentTime: 3, paused: false,
    pause() { this.paused = true; calls.push("audio:pause"); } };
  const context = {
    muted: false, State: { screen: Screen.TITLE }, Screen,
    window: { BibloZooDailyQuestions: { onMuteChanged: (muted) => calls.push(`questions:${muted}`) } },
    document: { hidden: false }, audioEl: audio,
    applyMute: () => calls.push("app:apply-mute"),
    unlockAppAudio: () => { calls.push("audio:unlock"); return Promise.resolve(true); },
    pauseLearnAudioForInterruption: () => calls.push("learn:interrupt"),
    learnAudioInterrupted: null, learnShortInstructionNeedsRender: false,
    stopNewVersePickerPreviewAudio: () => calls.push("picker:stop"),
    stopPetUnlockPackageSound: () => calls.push("pet:stop"),
    stopZooTodoTutorialPageAudio: () => calls.push("tutorial:stop"),
    verseDetailListenActive: true,
    cancelVerseDetailListen: () => calls.push("detail:stop"),
    renderNav: () => calls.push("app:render-nav"),
    render: () => calls.push("app:render"),
    isTutorialActive: () => false
  };
  vm.runInNewContext(muteSource, context, { filename: "app.js:patch25-mute" });
  context.toggleMute();
  eq(context.muted, true, "global mute enabled");
  eq(calls.filter(x => x === "questions:true").length, 1,
    "mute notification reaches Daily Questions once");
  for (const stop of ["picker:stop", "pet:stop", "tutorial:stop", "detail:stop", "learn:interrupt"]) {
    eq(calls.filter(x => x === stop).length, 1, `global mute stops ${stop}`);
  }
  ok(audio.paused, "global mute pauses shared audio element");
  eq(calls.includes("audio:unlock"), false, "muting never initiates audio unlock");
  context.toggleMute();
  eq(context.muted, false, "unmute clears app mute state");
  eq(calls.filter(x => x === "questions:false").length, 1,
    "unmute notification reaches Daily Questions");
  eq(calls.filter(x => x === "audio:unlock").length, 1,
    "unmuting retries activation rather than auto-playing old media");
  eq(calls.filter(x => x === "picker:stop").length, 1,
    "unmuting never restarts or cancels picker audio again");
}

function testRewardIdempotence() {
  const s = DailyTodo.createDefaultState();
  s.activePlan = {
    kind: DailyTodo.PLAN_KINDS.CARE, id: "integration-plan", profileId: "profile-a",
    day: "2026-10-17", verseId: "romans_6_23",
    requiredTaskIds: [DailyTodo.TASK_IDS.REVIEW, DailyTodo.TASK_IDS.QUESTIONS, DailyTodo.TASK_IDS.ACTIVITY],
    reviewAssignment: { kind: DailyTodo.REVIEW_KINDS.FLASHCARD, activityId: "" },
    activity: { kind: "game", id: "verse_game", mode: "easy" },
    tasks: { review: { status: "open" }, questions: { status: "open" }, activity: { status: "open" } },
    educationalCompletedAt: 0, snack: { unlocked: false, claimed: false, claimedAt: 0 }
  };
  const now = new Date("2026-10-17T12:00:00Z");
  const start = DailyTodo.beginTask(s, {
    planId: "integration-plan", taskId: DailyTodo.TASK_IDS.QUESTIONS, now
  });
  ok(start.changed && !!start.launchToken, "first Daily Questions launch obtains task token");
  const pendingArgs = { planId: "integration-plan", taskId: DailyTodo.TASK_IDS.QUESTIONS,
    launchToken: start.launchToken, pendingData: { source: "questions" }, now };
  const rejectedOld = DailyTodo.setPendingCompletion(start.state, {
    ...pendingArgs, launchToken: "obsolete-activity-token"
  });
  eq(rejectedOld.changed, false, "stale activity callback cannot set a completion");
  const pending = DailyTodo.setPendingCompletion(start.state, pendingArgs);
  eq(pending.changed, true, "current launch sets completion pending");
  const duplicate = DailyTodo.setPendingCompletion(pending.state, pendingArgs);
  eq(duplicate.changed, false, "duplicate activity callback cannot requeue completion");
  const accepted = DailyTodo.confirmPendingCompletion(pending.state, {
    planId: "integration-plan", taskId: DailyTodo.TASK_IDS.QUESTIONS, now
  });
  ok(accepted.changed, "first confirmation updates plan once");
  const repeated = DailyTodo.confirmPendingCompletion(accepted.state, {
    planId: "integration-plan", taskId: DailyTodo.TASK_IDS.QUESTIONS, now
  });
  eq(repeated.changed, false, "repeated confirmation cannot award completion twice");
  const delayed = DailyTodo.setPendingCompletion(accepted.state, pendingArgs);
  eq(delayed.changed, false, "late old callback cannot reopen completed task");
  eq(delayed.state.activePlan.tasks.questions.status, DailyTodo.TASK_STATUSES.COMPLETE,
    "late callback leaves progress complete and unchanged");
}

function testCleanupContracts() {
  ok(appSource.includes('if (from === Screen.FLASHCARDS) window.BibloZooFlashcards?.stopSession?.();'),
    "slide navigation still stops Flashcards");
  ok(appSource.includes('if (from === Screen.DAILY_SNACK) {\n    window.BibloZooDailyFeedGame?.stop?.();'),
    "slide navigation still stops Feeding Game");
  ok(appSource.includes('if (from === Screen.NEW_VERSE_PICKER) {\n    stopNewVersePickerPreviewAudio();'),
    "slide navigation still stops verse picker preview");
  ok(questionSource.includes("function stopDailySessionRuntime()") &&
    questionSource.includes("stopDailyQuestionAnswerSounds();") &&
    questionSource.includes("stopGeneratedQuestionAudio();"),
    "Daily Questions cancel both answer and spoken audio");
  ok(questionSource.includes("window.BibloZooDailyFeedGame") &&
    questionSource.includes("?.stop?.();"),
    "Daily Questions also release embedded Feeding runtime");
  ok(feedingSource.includes("runtime.feedResumeGeneration =") &&
    feedingSource.includes("stopFeedingEffects(runtime);") &&
    feedingSource.includes("stopAudioContext(runtime.audioContext);"),
    "Feeding stop invalidates resumes, stops nodes and closes context");
  ok(flashcardsSource.includes("function resetSession()") &&
    flashcardsSource.includes("discardRecording();") &&
    flashcardsSource.includes("resetWackyReplayRun();"),
    "Flashcards reset abandons recording and processed-audio run");
  const readMyVerseSource = read("read_my_verse.js");
  ok(readMyVerseSource.includes("function resetSession()") &&
    readMyVerseSource.includes("stopAudio();") &&
    readMyVerseSource.includes("stopSession: resetSession"),
    "Read My Verse cleanup remains part of its exported stopSession contract");
  ok(readMyVerseSource.includes("stopCrawlMusic();") &&
    readMyVerseSource.includes("stopKeySoundVoices();") &&
    readMyVerseSource.includes('addEventListener?.("pagehide", pauseReadForInterruption)'),
    "Read My Verse closes music/tones and reacts to app hiding");
  ok(recordingSource.includes('window.addEventListener("pagehide"') &&
    recordingSource.includes('document.addEventListener("visibilitychange"'),
    "microphone recording observes interruptions");
  ok(effectsSource.includes("AudioWorklet") &&
    effectsSource.includes("function stop()") && effectsSource.includes("onProcessorError"),
    "Wacky Replay keeps its worklet and explicit stop interface");
  ok(appSource.includes('window.addEventListener("pagehide", pauseLearnAudioForInterruption);'),
    "Learn audio is interrupted when the app page hides");
  ok(appSource.includes('window.addEventListener("pagehide", stopNewVersePickerPreviewAudio);'),
    "picker preview is stopped when the app page hides");
  ok(appSource.includes("returnToDailyTodoWithTransition") &&
    todoSource.includes("task.status === TASK_STATUSES.PENDING"),
    "Daily To-Do retains transition and pending-completion guards");
  ok(/const CACHE_VERSION = "[A-Za-z0-9_]+";/.test(workerSource) &&
    workerSource.includes('"./app.js"') &&
    workerSource.includes('"./daily_questions_feed_game.js"') &&
    workerSource.includes('"./flashcards/flashcards.js"'),
    "PWA cache is versioned and includes key audio entrypoints");
  const externalPaths = [
    "verse_games/bible_bugs/game.js", "verse_games/dino_dash/game.js",
    "verse_games/foodslice/game.js", "verse_games/tower_bible/game.js",
    "verse_games/traffic_tap/game.js", "verse_games/verse_invaders/game.js",
    "verse_games/verse_launch/game.js", "verse_games/verse_munch/game.js",
    "verse_games/verse_scramble_neo/game.js", "verse_games/verse_snake/game.js",
    "verse_games/verse_splat/game.js", "verse_games/versey_bird/game.js"
  ];
  const present = externalPaths.filter(p => fs.existsSync(path.join(root, p)));
  if (present.length === externalPaths.length) {
    for (const p of externalPaths) {
      const source = read(p);
      ok(source.includes("AudioContext") || source.includes("audioCtx") || source.includes("Audio"),
        `${p} maintains its own game sound source`);
      ok(source.includes("muted") && source.includes("returnTo"),
        `${p} retains game mute and return-to-app boundary`);
    }
  } else {
    console.log(`Note: external game source checks skipped (${present.length}/${externalPaths.length} present); run in the full repository to cover them.`);
  }
}

function main() {
  testDirectNavigation();
  testSlidingNavigation();
  testMutePropagation();
  testRewardIdempotence();
  testCleanupContracts();
  console.log(`Patch 25 integration: ${checks} assertions passed.`);
}
main();
