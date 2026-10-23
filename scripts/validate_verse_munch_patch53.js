#!/usr/bin/env node
"use strict";

// Patch 53: exercise the actual Verse Munch belt and bonus-round functions in
// isolated Node VMs, plus the existing Daily To-Do completion wrapper.
// No browser, network, saved progress, or audio hardware is required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(
  process.env.VMUNCH_SOURCE || path.join(root, "verse_games/verse_munch/game.js"),
  "utf8"
);
const dailyTodoShellSource = fs.readFileSync(
  path.join(root, "verse_games/shared/daily-todo-shell.js"),
  "utf8"
);
const workerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let checks = 0;

function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

function section(start, end) {
  const from = gameSource.indexOf(start);
  const to = gameSource.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing Verse Munch source boundaries: ${start} / ${end}`);
  return gameSource.slice(from, to);
}

const beltFunctions = [
  section("  function resetBeltForCurrentStep()", "  function getBeltWaveOffsetPx("),
  section("  const STREAK_SPEED_MAX_MULTIPLIER", "  function updateBonusFoodBelt("),
  section("  function getBeltWidth()", "  function getBeltItemCenter("),
  section("  function randomInt(", "  function getDecoysForPhase("),
  section("  function getDecoysForPhase(", "  function triggerBonusScoreCelebration(")
].join("\n");

function beltHarness(mode, { withoutDecoys = false } = {}) {
  const state = {
    words: ["GOD", "LOVE", "WORLD", "SO", "MUCH", "THAT", "HE", "GAVE", "SON"],
    progressIndex: 0,
    currentCorrect: "WORLD",
    streak: 0,
    fieldWidth: 440,
    beltItems: [],
    beltNextId: 1,
    beltForceCorrectIn: 0,
    inputLocked: false,
    beltHidden: false,
    beltObscured: false
  };
  const funDecoys = ["CLOUD", "SUN", "MOON", "GRAPE", "KING", "RIVER", "STONE",
    "LIGHT", "APPLE", "BIRD", "FLOWER", "SHEEP", "BRIDGE", "HILL", "TREE"];
  const normal = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const shell = {
    getGameSpeedMultiplier: () => 1,
    getVerseLengthTier: () => "normal",
    getVerseWordDecoys: ({ correct }) => withoutDecoys
      ? []
      : state.words.filter((word) => normal(word) !== normal(correct)),
    getFunWordDecoys: (correct) => withoutDecoys
      ? []
      : funDecoys.filter((word) => normal(word) !== normal(correct)),
    getBookDecoys: () => withoutDecoys ? [] : funDecoys,
    getReferenceDecoys: () => withoutDecoys ? [] : funDecoys
  };
  // Zero is intentionally forced, to reproduce the legitimate zero-delay case.
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0;
  const sandbox = {
    state, selectedMode: mode, bonusRunning: false, Math: deterministicMath,
    window: { VerseGameShell: shell }, FUN_DECOYS: funDecoys, FOOD_EMOJIS: ["🍎", "🍒"],
    document: { getElementById: () => ({ getBoundingClientRect: () => ({ width: 440 }) }) },
    performance: { now: () => 1000 },
    getCurrentPhase: () => "words",
    getCurrentCorrectLabel: () => state.currentCorrect,
    normalizeWord: normal,
    randomFrom: (items) => items[0],
    shuffle: (items) => [...items]
  };
  vm.createContext(sandbox);
  vm.runInContext(`${beltFunctions}\nglobalThis.beltApi = {
    resetBeltForCurrentStep, primeBeltForCurrentStep, getBeltConfig,
    spawnBeltItem, updateBelt
  };`, sandbox, { filename: "verse-munch-patch53-belt.js" });
  return { state, api: sandbox.beltApi, normal };
}

function assertNoConsecutiveCorrect(state, normal, label) {
  for (let i = 1; i < state.beltItems.length; i += 1) {
    const pair = [state.beltItems[i - 1], state.beltItems[i]];
    check(!pair.every((item) => normal(item.label) === normal(label)),
      `Consecutive '${label}' entries in the conveyor`);
  }
}

function testBeltReprimeAndRefill() {
  for (const mode of ["easy", "medium", "hard"]) {
    for (const answerKind of ["correct", "incorrect"]) {
      const { state, api, normal } = beltHarness(mode);
      // Both correct and incorrect answers share the reset/prime path.
      state.currentCorrect = answerKind === "correct" ? "WORLD" : "LOVE";
      api.resetBeltForCurrentStep();
      api.primeBeltForCurrentStep();
      check(state.beltItems.length >= 2, `${mode}/${answerKind}: belt primed`);
      check(state.beltItems.some((item) => normal(item.label) === normal(state.currentCorrect)),
        `${mode}/${answerKind}: correct word remains available`);
      assertNoConsecutiveCorrect(state, normal, state.currentCorrect);
      for (let frame = 0; frame < 180; frame += 1) {
        api.updateBelt(0.16);
        assertNoConsecutiveCorrect(state, normal, state.currentCorrect);
      }
    }
  }
}

function testOffscreenAndEmptyDecoys() {
  for (const mode of ["easy", "medium", "hard"]) {
    const { state, api, normal } = beltHarness(mode);
    const cfg = api.getBeltConfig();
    state.beltForceCorrectIn = 0;
    state.beltItems.push({
      id: 1, label: "WORLD", isCorrect: true, tapped: false,
      x: 1000, width: 100, removeAt: 0
    });
    check(api.spawnBeltItem(cfg), `${mode}: off-screen correct should be followed by decoy`);
    check(normal(state.beltItems.at(-1).label) !== normal("WORLD"),
      `${mode}: queued off-screen correct does not permit adjacent correct`);

    const noDecoys = beltHarness(mode, { withoutDecoys: true });
    // Even the verse-word fallback contains no alternative word.
    noDecoys.state.words = ["WORLD"];
    noDecoys.state.beltItems = [{
      id: 1, label: "WORLD", isCorrect: true, tapped: false,
      x: 40, width: 100, removeAt: 0
    }];
    noDecoys.state.beltForceCorrectIn = 0;
    const count = noDecoys.state.beltItems.length;
    check(noDecoys.api.spawnBeltItem(noDecoys.api.getBeltConfig()) === false,
      `${mode}: no safe decoy must defer spawning rather than duplicate the correct word`);
    noDecoys.api.updateBelt(0.02);
    check(noDecoys.state.beltItems.length === count,
      `${mode}: refill loop stops gracefully when no safe word exists`);
  }
}

async function testBonusStaysCoveredUntilNavigation() {
  const state = {
    running: true, runToken: 42, bonusPhase: "", bonusIntroShown: false,
    beltHidden: false, inputLocked: false, faceClasses: new Set(),
    bonusCount: 7, bonusEatToken: 0
  };
  const rendered = [];
  const sandbox = {
    state, bonusRunning: false,
    BONUS_INTRO_DURATION: 2.4, BONUS_PLAY_DURATION: 20,
    isActiveRun: (token) => state.running && token === state.runToken,
    chooseBonusTargetFruit: () => ({ id: "fruit_1", src: "test-fruit.png" }),
    playGameSound: () => {},
    renderFrame: () => rendered.push(state.bonusPhase),
    waitSeconds: async () => true,
    waitForBonusScoreContinue: async () => {
      check(state.bonusPhase === "score", "continue gesture happens on score screen");
      return true;
    },
    triggerBonusScoreCelebration: () => {},
    performance: { now: () => 1000 }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${section("  async function startBonusRound(runToken)", "  async function finishRun(runToken)")}
    globalThis.runBonus = startBonusRound;
    globalThis.bonusActive = () => bonusRunning;`, sandbox);
  check(await sandbox.runBonus(42), "bonus sequence completes");
  check(state.bonusPhase === "score", "score card stays active during completion/navigation");
  check(state.bonusTargetFruit?.id === "fruit_1", "score card retains its fruit");
  check(state.beltHidden && state.inputLocked && sandbox.bonusActive(),
    "conveyor and input remain blocked until final screen replaces score");
  check(rendered.at(-1) === "score", "last rendered frame is the covered score, not party face");

  const faceStack = { hidden: false, classList: { toggle(name, enabled) {
    if (name === "is-hidden-for-bonus-intro") faceStack.hidden = enabled;
  } } };
  const face = { className: "", classList: { add() {} }, style: {} };
  const score = { dataset: {}, innerHTML: "" };
  sandbox.document = {
    getElementById: (id) => ({ vmunchFace: face, vmunchBonusScoreReveal: score })[id] || null,
    querySelector: (sel) => sel === ".vmunch-face-stack" ? faceStack : null
  };
  sandbox.ensureFaceLayers = () => {};
  sandbox.getSafeFaceFile = () => "munch_celebration.png";
  sandbox.swapFaceLayer = () => {};
  sandbox.escapeHtml = (s) => String(s);
  vm.runInContext(`${section("  function renderFace()", "  function renderBelt(ts)")}
    ${section("  function renderBonusScoreReveal()", "  function renderBonusHud()")}
    renderFace(); renderBonusScoreReveal();`, sandbox);
  check(faceStack.hidden, "celebration image stays covered during transition");
  check(score.innerHTML.includes("BONUS BITES!"), "score card remains displayed");
}

function testDailyTodoRedirectDoesNotReplaceBonusCard() {
  const redirectCalls = [];
  let normalComplete = 0;
  const app = { innerHTML: "<div>Existing bonus score</div>" };
  const params = {
    todoSource: "daily_todo", dailyProfileId: "p", dailyPlanId: "plan",
    dailyPlanDay: "2026-10-22", dailyTaskId: "activity", dailyLaunchToken: "token",
    dailyVerseId: "john_3_16", dailyActivityKind: "game", dailyActivityId: "verse_munch",
    dailyActivityMode: "medium", dailyReturnContext: "daily_tasks_clipboard"
  };
  const rootWindow = {
    VerseGameBridge: {
      getLaunchParams: () => params,
      returnToDailyTodo: (args) => { redirectCalls.push(args); return true; }
    },
    VerseGameShell: {
      renderModeSelect() {},
      renderCompleteScreen() { normalComplete += 1; }
    }
  };
  vm.runInNewContext(dailyTodoShellSource, { window: rootWindow });
  const options = {
    app, verseId: "john_3_16", gameId: "verse_munch", mode: "medium",
    completion: { ok: true, verseId: "john_3_16", gameId: "verse_munch", mode: "medium" }
  };
  rootWindow.VerseGameShell.renderCompleteScreen(options);
  check(redirectCalls.length === 1 && redirectCalls[0].status === "success",
    "matching Daily To-Do completion redirects normally");
  check(normalComplete === 0 && app.innerHTML.includes("Existing bonus score"),
    "Daily To-Do wrapper leaves the score card in place for page transition");
  rootWindow.VerseGameShell.renderCompleteScreen({ ...options, gameId: "other_game" });
  check(normalComplete === 1, "nonmatching completion still renders normal screen");
}

async function main() {
  testBeltReprimeAndRefill();
  testOffscreenAndEmptyDecoys();
  await testBonusStaysCoveredUntilNavigation();
  testDailyTodoRedirectDoesNotReplaceBonusCard();
  check(/const CACHE_VERSION = "2026_Oct_22_patch53_verse_munch_belt_and_todo_return";/.test(workerSource),
    "PWA cache version is advanced for the revised Verse Munch runtime");
  console.log(`Verse Munch Patch 53 validation passed (${checks} assertions).`);
}

main().catch((error) => {
  console.error("Verse Munch Patch 53 validation FAILED:", error);
  process.exitCode = 1;
});
