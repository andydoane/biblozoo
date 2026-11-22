#!/usr/bin/env node
"use strict";
// IP06: execute the existing app fade, the actual tutorial Final Test
// button, and both Feeding return callbacks. VM clocks/DOM are synthetic;
// owner iPad/iPhone and Apple SDK checks remain separate.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("app.js");
const daily = read("daily_questions.js");
const css = read("styles.css");

function between(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, "actual production code: " + start);
  return source.slice(a, b);
}

const fadeSource = between(app,
  "function getAppPageTransitionDelayMs() {",
  "window.BibloZooAppPageTransitions =");
const tutorialSource = between(app,
  "function returnFromTutorialFinalTest() {",
  "async function continueLearnInstruction() {");
const finalScreenSource = between(app,
  "function screenFinalRecall(idx) {",
  "function screenCelebration(idx) {");
const feedingScreenSource = between(app,
  "function screenDailySnack(idx) {",
  "function screenPetUnlock(");

assert.match(css, /body::after\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s);
assert.match(css, /body\.page-transition-ready::after\s*\{[^}]*opacity:\s*0;[^}]*visibility:\s*hidden;/s);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*body::after,[\s\S]*?transition:\s*none;/s);
assert.equal((app.match(/returnFromTutorialFinalTest\(\);/g) || []).length, 2,
  "only the two tutorial Final Test exit actions reuse the fade helper");
assert.match(app, /goToTitleAfterFeeding:\s*\(\)\s*=>\s*!document\.hidden && transitionToAppScreen\(Screen\.TITLE\)/);
assert.match(app, /function setScreen\(screen\)\s*\{[\s\S]*?State\.screen === Screen\.FINAL_RECALL && screen !== Screen\.FINAL_RECALL/);
assert.match(daily, /onRecoveryExitToZoo:\s*\(\)\s*=>\s*\{[\s\S]*?appApi\?\.goToTitle\?\.\(\)/,
  "unfinished/failed recovery still has its original safe exit");
assert.match(daily, /typeof fadeReturn !== "function"[\s\S]*?appApi\?\.goToTitle\?\.\(\)/,
  "older host mocks and Web fallback retain their original navigation");

// Run the original fade engine with an explicit RAF/timeout scheduler.
function fadeHarness({native = false, reduced = false} = {}) {
  let now = 0, nextTimer = 1;
  const frames = [], timers = new Map(), screens = [];
  function setTimer(fn, delay = 0) {
    const id = nextTimer++;
    timers.set(id, {fn, due: now + delay});
    return id;
  }
  function tick(delta) {
    const target = now + delta;
    while (true) {
      const due = [...timers.entries()]
        .filter(([,timer]) => timer.due <= target)
        .sort((a,b) => a[1].due - b[1].due);
      if (!due.length) break;
      const [id, timer] = due[0];
      timers.delete(id); now = timer.due; timer.fn();
    }
    now = target;
  }
  function frame() {
    const current = frames.splice(0);
    for (const fn of current) fn(now);
  }
  function classes(initial = []) {
    const data = new Set(initial);
    return {
      contains: name => data.has(name),
      add: name => data.add(name),
      remove: name => data.delete(name),
      toggle(name, force) {
        if (force === undefined) force = !data.has(name);
        if (force) data.add(name); else data.delete(name);
      }
    };
  }
  const document = {
    hidden: false,
    documentElement: {classList: classes()},
    body: {classList: classes(["page-transition-ready"])}
  };
  const state = {isSliding: false};
  const context = {
    IS_NATIVE_CAPACITOR: native,
    State: state,
    document,
    window: {matchMedia: () => ({matches: reduced}), setTimeout: setTimer},
    requestAnimationFrame: fn => frames.push(fn),
    setScreen: screen => screens.push(screen)
  };
  vm.runInNewContext("let appPageTransitionStarted = false;\n" + fadeSource +
    "\nthis.fade = transitionToAppScreen;" +
    "\nthis.busy = () => appPageTransitionStarted;", context);
  return {fade: context.fade, busy: context.busy, tick, frame, document,
    state, screens, frames};
}

for (const native of [true, false]) {
  const h = fadeHarness({native});
  assert.equal(h.fade("zoo_todo"), true);
  assert.equal(h.fade("zoo_todo"), false, "rapid second tap cannot start another fade");
  assert.equal(h.busy(), true);
  assert.equal(h.document.body.classList.contains("page-transition-ready"), !native,
    "Web begins its blackout after RAF; Capacitor immediately");
  if (!native) {
    h.frame();
    assert.equal(h.document.body.classList.contains("page-transition-ready"), true);
    h.frame();
  }
  assert.equal(h.document.body.classList.contains("page-transition-ready"), false);
  h.tick(299);
  assert.equal(h.screens.length, 0, "no premature navigation before black cover");
  h.tick(1);
  assert.deepEqual(h.screens, ["zoo_todo"]);
  h.frame(); h.frame();
  assert.equal(h.document.body.classList.contains("page-transition-ready"), true);
  h.tick(300);
  assert.equal(h.busy(), false);
  assert.equal(h.document.documentElement.classList.contains("page-transition-chrome-black"), false);
  assert.equal(h.document.body.classList.contains("page-transition-chrome-black"), false);
  assert.equal(h.screens.length, 1);
  h.state.isSliding = true;
  assert.equal(h.fade("title"), false, "existing slide guard preserved");
  assert.equal(h.screens.length, 1);
}
const reduced = fadeHarness({native: true, reduced: true});
assert.equal(reduced.fade("title"), true);
reduced.tick(0);
assert.deepEqual(reduced.screens, ["title"], "reduced motion skips black hold");
reduced.frame(); reduced.frame(); reduced.tick(0);
assert.equal(reduced.busy(), false);

// Evaluate the actual tutorial Final Test button and shared exit handler.
// No synthetic reward is ever written to a profile.
function tutorialHarness({tutorial = true, mission = null} = {}) {
  const events = [], buttons = {};
  const state = {
    screen: "final_recall", isSliding: false, finalRecallRevealed: true,
    finalRecallDone: true, finalRecallActive: false,
    finalRecallAutoFallbackReady: false
  };
  const document = {
    hidden: false,
    createElement: () => ({
      style: {}, innerHTML: "",
      querySelector(sel) {
        if (sel === "#finalRecallStage") return {appendChild() {}};
        if (sel === "#btnFinalGames") return buttons.games ||= {};
        return null;
      }
    })
  };
  const ctx = {
    document, State: state, Screen: {TODO_DEV: "zoo_todo"},
    appPageTransitionStarted: false, VERSE_ID: "test_verse", VERSE_TEXT: "The test verse",
    markLearnCompleted: id => events.push("learn:" + id),
    primeZooTodoTutorialNativeAudioFromGesture: () => events.push("prime:native"),
    markTutorialLearnDone: id => events.push("tutorial:" + id),
    transitionToAppScreen: screen => {
      events.push("fade:" + screen);
      ctx.appPageTransitionStarted = true;
      return true;
    },
    finalRecallNode: () => ({}), getVerseFitClass: () => "",
    escapeHtml: s => s, verseIdToRef: () => "Reference",
    getFinalRecallPct: () => 0,
    scheduleSmartLearnTextFit() {},
    makeSlide: ({inner}) => inner,
    getDailyNewPetMissionContext: () => mission,
    isTutorialActive: () => tutorial,
    completeDailyNewPetLearn: () => {events.push("complete:mission"); return true;},
    startLearnInstruction: key => events.push("instruction:" + key),
    render() {}, requestAnimationFrame() {}
  };
  vm.runInNewContext(tutorialSource + finalScreenSource +
    "\nthis.buildFinal = screenFinalRecall;\nthis.returnFinal = returnFromTutorialFinalTest;", ctx);
  ctx.buildFinal(0);
  assert.equal(typeof buttons.games.onclick, "function",
    "the real revealed Final Test has its original Practice time button");
  return {ctx, events, state, buttons};
}
const tutorial = tutorialHarness();
tutorial.buttons.games.onclick();
assert.deepEqual(tutorial.events, [
  "learn:test_verse", "prime:native", "tutorial:test_verse", "fade:zoo_todo"
], "credit and native prime occur synchronously before original fade");
assert.equal(tutorial.state.hasLearnedVerse, true);
assert.equal(tutorial.state.todoTutorialJustFinishedLearn, true);
tutorial.buttons.games.onclick();
assert.equal(tutorial.events.length, 4, "double tap never re-credits or re-primes");
const hiddenTutorial = tutorialHarness();
hiddenTutorial.ctx.document.hidden = true;
hiddenTutorial.buttons.games.onclick();
assert.equal(hiddenTutorial.events.length, 0, "hidden app cannot launch Final Test return");
const slidingTutorial = tutorialHarness();
slidingTutorial.state.isSliding = true;
slidingTutorial.buttons.games.onclick();
assert.equal(slidingTutorial.events.length, 0);
const normalLearn = tutorialHarness({tutorial: false});
normalLearn.buttons.games.onclick();
assert.deepEqual(normalLearn.events, ["instruction:games"],
  "ordinary Learn → Practice routing remains the original slide");
const dailyMission = tutorialHarness({mission: {source: "daily_new_pet"}});
dailyMission.buttons.games.onclick();
assert.deepEqual(dailyMission.events, ["complete:mission"],
  "Daily New Pet mission keeps its existing separately validated fade");

// Verify the actual Daily To-Do Feeding onComplete and result Back callback.
function todoFeedingHarness({preview = false} = {}) {
  const events = [], frames = [];
  const session = {dailyTodoSnack: true, dailyTodoPreview: preview, feedMode: "bounce",
    profileId: "offline-test"};
  const state = {screen: "daily_snack", dailySnackSession: session};
  let callbacks;
  const wrapper = {
    innerHTML: "", className: "", isConnected: true,
    querySelector: () => null
  };
  const ctx = {
    State: state, Screen: {DAILY_SNACK: "daily_snack", TITLE: "title"},
    document: {hidden: false, createElement: () => wrapper},
    requestAnimationFrame: fn => frames.push(fn),
    getProfileApi: () => ({getActiveProfile: () => ({name: "Test"})}),
    profilePictureVisualHtml: () => "<span></span>",
    window: {BibloZooDailyFeedGame: {
      render: () => "<div class=\"daily-feed-game\"></div>",
      start: (el, opts) => {assert.equal(el, wrapper); callbacks = opts;}
    }},
    claimDailyTodoSnack: (s, result) => {
      assert.equal(s, session); events.push("claim:" + result.score); return true;
    },
    transitionToAppScreen: screen => {
      events.push("fade:" + screen);
      return ctx.canNavigate !== false;
    },
    makeSlide: ({inner}) => inner,
    showDialog: () => events.push("dialog"),
    dlgBtn: () => ({}), closeDialog() {}
  };
  vm.runInNewContext(feedingScreenSource + "\nthis.buildSnack = screenDailySnack;", ctx);
  ctx.buildSnack(0);
  for (const fn of frames.splice(0)) fn();
  assert.ok(callbacks, "real Feeding start receives the return callbacks");
  return {ctx, events, state, session, callbacks};
}
const todo = todoFeedingHarness();
todo.callbacks.onComplete({score: 12});
assert.deepEqual(todo.events, ["claim:12"], "Feeding awards before the result exit");
todo.callbacks.onBackToZoo();
assert.deepEqual(todo.events, ["claim:12", "fade:title"]);
assert.equal(todo.state.dailySnackSession, null);
const blockedTodo = todoFeedingHarness({preview: true});
blockedTodo.ctx.canNavigate = false;
assert.equal(blockedTodo.callbacks.onBackToZoo(), false);
assert.equal(blockedTodo.state.dailySnackSession, blockedTodo.session,
  "blocked fade retains the existing Feeding session/result for retry");
blockedTodo.ctx.canNavigate = true;
assert.equal(blockedTodo.callbacks.onBackToZoo(), true);
assert.equal(blockedTodo.state.dailySnackSession, null);
const hiddenTodo = todoFeedingHarness();
hiddenTodo.ctx.document.hidden = true;
assert.equal(hiddenTodo.callbacks.onBackToZoo(), false);
assert.deepEqual(hiddenTodo.events, [], "hidden app cannot silently exit Feeding");

// Extract the real Daily Questions reward-game Back callback; keep the
// original completed-session / one-time credit checks inside it.
function extractArrow(source, needle) {
  const where = source.indexOf(needle);
  assert.ok(where >= 0, "callback exists: " + needle);
  const arrow = source.indexOf("() => {", where);
  assert.ok(arrow >= 0);
  const open = source.indexOf("{", arrow);
  let level = 0;
  for (let i = open; i < source.length; ++i) {
    if (source[i] === "{") level++;
    if (source[i] === "}" && --level === 0) return source.slice(arrow, i + 1);
  }
  assert.fail("unbalanced actual callback");
}
const dailyBackSource = extractArrow(daily, "onBackToZoo:");
function questionFeedingHarness({debugForced = false, fallback = false} = {}) {
  const events = [];
  const session = {
    phase: "reward_game", rewardComplete: true,
    debugForced, completionRecorded: false, verseId: "test_verse"
  };
  const ctx = {
    dailySession: session, session, events,
    SESSION_PHASES: {REWARD_GAME: "reward_game"},
    markSessionCompleted: id => {
      events.push("award:" + id);
      return {success: true};
    },
    clearSessionState: () => {
      events.push("clear");
      ctx.dailySession = null;
    },
    appApi: {
      goToTitle: () => events.push("original:title"),
      ...(!fallback ? {goToTitleAfterFeeding: () => {
        events.push("fade:title");
        return ctx.canNavigate !== false;
      }} : {})
    }
  };
  vm.runInNewContext("this.onBack = (" + dailyBackSource + ");", ctx);
  return {ctx, session, events, onBack: ctx.onBack};
}
const question = questionFeedingHarness();
question.ctx.canNavigate = false;
assert.equal(question.onBack(), false);
assert.deepEqual(question.events, ["award:test_verse", "fade:title"]);
assert.equal(question.session.completionRecorded, true);
assert.equal(question.ctx.dailySession, question.session,
  "failed navigation must not discard completed Daily Questions session");
question.ctx.canNavigate = true;
assert.equal(question.onBack(), true);
assert.deepEqual(question.events,
  ["award:test_verse", "fade:title", "fade:title", "clear"],
  "retry navigates without a duplicate saved completion");
assert.equal(question.onBack(), false, "after clearing, double tap does nothing");
const notFinished = questionFeedingHarness();
notFinished.session.rewardComplete = false;
assert.equal(notFinished.onBack(), false);
assert.deepEqual(notFinished.events, [], "cannot exit/award an unfinished Daily reward as complete");
const debug = questionFeedingHarness({debugForced: true});
assert.equal(debug.onBack(), true);
assert.deepEqual(debug.events, ["fade:title", "clear"],
  "debug Feeding never awards a real Daily Question completion");
const fallback = questionFeedingHarness({fallback: true});
assert.equal(fallback.onBack(), true);
assert.deepEqual(fallback.events, ["award:test_verse", "clear", "original:title"]);
console.log("IP06 PASS: original black fade native/Web/reduced motion, guarded tutorial Final Test + native prime, both Feeding callbacks, once-only Daily credits, busy/hidden retry, old fallback paths");
