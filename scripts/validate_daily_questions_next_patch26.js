#!/usr/bin/env node
"use strict";

// Patch 26: exercise the actual Daily Questions Next button and popup timer
// under deterministic simulated WebKit animation and render timing.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "daily_questions.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let checks = 0;
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (value, label) => { assert.ok(value, label); checks++; };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

function createHarness({ reducedMotion = false } = {}) {
  let now = 0;
  let nextTimerId = 1;
  const timers = new Map();
  const animations = [];
  const warnings = [];
  const overlays = [];
  let activeWrap = null;
  let renderCount = 0;
  let leaving = false;
  let api;
  let module;

  function addTimer(fn, delay, repeating = false) {
    const id = nextTimerId++;
    timers.set(id, { fn, at: now + (Number(delay) || 0), delay, repeating });
    return id;
  }
  function advanceTime(ms) {
    const until = now + ms;
    let runs = 0;
    while (true) {
      let next;
      for (const entry of timers) {
        if (entry[1].at <= until && (!next || entry[1].at < next[1].at)) next = entry;
      }
      if (!next) break;
      if (++runs > 500) throw new Error("Test timer runaway");
      now = next[1].at;
      if (next[1].repeating) next[1].at += next[1].delay;
      else timers.delete(next[0]);
      next[1].fn();
    }
    now = until;
  }

  class FakeButton {
    constructor(attribute = "") { this.attribute = attribute; this.onclick = null; this.disabled = false; }
    getAttribute(name) { return name === "data-daily-question-choice" ? this.attribute : ""; }
    tap() {
      if (!this.onclick) throw new Error("Button is not bound");
      this.onclick({ preventDefault() {}, stopPropagation() {} });
    }
  }

  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.isConnected = false;
      this.inert = false;
      this._html = "";
      this.style = { backgroundColor: "", setProperty() {} };
      this.classList = { add() {}, toggle() {} };
      this.scrollHeight = 100;
      this.clientHeight = 100;
      this.scrollTop = 0;
      this.choiceButtons = [];
      this.nextButton = null;
    }
    set innerHTML(html) {
      this._html = html;
      this.nextButton = html.includes("data-daily-question-next") ? new FakeButton() : null;
      this.choiceButtons = [...html.matchAll(/data-daily-question-choice="(\d+)"/g)]
        .map(match => new FakeButton(match[1]));
    }
    get innerHTML() { return this._html; }
    setAttribute() {}
    addEventListener() {}
    appendChild(child) { child.isConnected = this.isConnected; }
    remove() { this.isConnected = false; }
    querySelectorAll(selector) {
      return selector === "[data-daily-question-choice]" ? this.choiceButtons : [];
    }
    querySelector(selector) {
      if (selector === "[data-daily-question-next]") return this.nextButton;
      return null;
    }
    animate(frames, settings) {
      let resolve, reject;
      const finished = new Promise((res, rej) => { resolve = res; reject = rej; });
      animations.push({ resolve, reject, settings, element: this });
      return { finished };
    }
  }

  const document = {
    hidden: false,
    fonts: { ready: Promise.resolve() },
    addEventListener() {},
    body: {
      appendChild(element) { element.isConnected = true; overlays.push(element); }
    },
    createElement(tag) { return new FakeElement(tag); },
    querySelector(selector) {
      return selector === ".daily-question-session" ? activeWrap : null;
    }
  };
  class FakeAudio {
    constructor(src) { this.src = src; this.currentTime = 0; }
    pause() {}
    play() { return Promise.resolve(); }
    addEventListener() {}
  }
  const window = {
    addEventListener() {},
    matchMedia() { return { matches: reducedMotion }; },
    BibloZooDailyQuestionSessions: { ITEM_KINDS: { APPLICATION: "application" } },
    BibloZooDailyFeedGame: { stop() {} }
  };
  const ctx = vm.createContext({
    window, document, Audio: FakeAudio,
    console: { warn: (...args) => warnings.push(args) },
    getComputedStyle: (element) => ({ backgroundColor: element.style.backgroundColor || "rgb(0,0,0)" }),
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout: (fn, delay) => addTimer(fn, delay),
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, delay) => addTimer(fn, delay, true),
    clearInterval: (id) => timers.delete(id),
  });
  const marker = "  window.BibloZooDailyQuestions =";
  ok(source.includes(marker), "Actual Daily Questions module export found");
  vm.runInContext(source.replace(marker, `
    window.__patch26 = {
      setSession(session) { dailySession = session; },
      getSession() { return dailySession; },
      get transitionBusy() { return questionPageTransition; },
      get popupTimer() { return rewardPopupTimeoutId; },
    };
  ` + marker), ctx, { filename: "daily_questions.js" });
  module = window.BibloZooDailyQuestions;
  api = {
    isEnabled: () => true,
    isMuted: () => false,
    renderApp() { if (!leaving) render(); },
    makeSlide({ inner }) { activeWrap = inner; inner.isConnected = true; return inner; },
    getPetName: () => "BibloPet",
  };
  module.initialize(api);

  const questions = Array.from({ length: 3 }, (_, index) => ({
    kind: index === 2 ? "application" : "recall",
    question: {
      prompt: `Question ${index + 1}`,
      answer: 0,
      choices: [{ label: "Correct" }, { label: "Wrong" }, { label: "Wrong again" }]
    }
  }));
  const session = {
    phase: "question", questionIndex: 0,
    questionSession: { items: questions },
    questionColor: "purple", verseRef: "John 3:16", verseText: "For God so loved the world",
    verseId: "john316", petName: "BibloPet", answered: false, answerCorrect: false,
    selectedAnswer: null, earnedStarPegCount: 0,
    showStarRewardPopup: false, questionAudioPlaying: false
  };
  window.__patch26.setSession(session);

  function render() {
    if (activeWrap) activeWrap.isConnected = false;
    renderCount++;
    module.renderScreen(1);
  }
  function currentChoice(index = 0) { return activeWrap.choiceButtons[index]; }
  function currentNext() { return activeWrap?.nextButton; }
  function nextAnimation() { return animations.shift(); }
  function leave() {
    leaving = true;
    if (activeWrap) activeWrap.isConnected = false;
    activeWrap = null;
    module.clearOfferState();
  }
  function otherRerender() { render(); }
  render();
  return {
    session, document, warnings, animations, overlays, nextAnimation,
    currentChoice, currentNext, advanceTime, render, otherRerender, leave,
    get renderCount() { return renderCount; },
    get activeWrap() { return activeWrap; },
    get busy() { return window.__patch26.transitionBusy; },
    get popupTimer() { return window.__patch26.popupTimer; },
    get activeSession() { return window.__patch26.getSession(); },
  };
}

async function finishTransition(h) {
  const fadeIn = h.nextAnimation();
  ok(fadeIn, "Fade-in animation scheduled");
  eq(fadeIn.settings.duration, 225, "Original 225 ms fade-in preserved");
  fadeIn.resolve();
  await flush();
  h.advanceTime(75);
  await flush();
  const fadeOut = h.nextAnimation();
  ok(fadeOut, "Fade-out animation scheduled");
  eq(fadeOut.settings.duration, 275, "Original 275 ms fade-out preserved");
  fadeOut.resolve();
  await flush();
}

async function main() {
  {
    const h = createHarness();
    eq(h.currentNext(), null, "Unanswered question has no Next button");
    h.currentChoice(0).tap();
    eq(h.session.answered, true, "Correct answer recorded");
    eq(h.session.earnedStarPegCount, 1, "Correct answer awards one peg");
    eq(h.session.showStarRewardPopup, true, "Star popup starts as before");
    ok(h.popupTimer, "Star popup expiration is scheduled");
    h.advanceTime(750);
    const next = h.currentNext();
    ok(next, "Answered question shows Next button");
    next.tap();
    ok(h.busy, "Next locks page transition before fade-in");
    eq(h.popupTimer, 0, "Next cancels pending star popup timer");
    eq(h.session.earnedStarPegCount, 1, "Next doesn't grant another reward");
    const renderCount = h.renderCount;
    h.advanceTime(150); // exactly when the original 900 ms popup fired
    eq(h.renderCount, renderCount, "Popup timeout cannot rebuild page during fade-in");
    eq(h.session.questionIndex, 0, "Question advances only when overlay is opaque");
    next.tap();
    eq(h.session.questionIndex, 0, "Rapid second tap ignored while transition is running");
    await finishTransition(h);
    eq(h.session.questionIndex, 1, "One Next tap advances exactly one question");
    eq(h.session.answered, false, "Next clears answered state");
    eq(h.session.showStarRewardPopup, false, "No reward popup leaks into next question");
    eq(h.session.earnedStarPegCount, 1, "Star reward retained exactly once");
    eq(h.busy, false, "Page transition lock released");
    eq(h.overlays[0].isConnected, false, "Transition overlay removed");
    next.tap();
    eq(h.session.questionIndex, 1, "Old Next button cannot advance again");
    h.advanceTime(1200);
    eq(h.session.questionIndex, 1, "No stale popup timer advances or redraws next question");
  }

  {
    const h = createHarness();
    h.currentChoice(0).tap();
    h.currentNext().tap();
    h.otherRerender(); // a different UI render happens during the fade
    ok(h.overlays[0].isConnected, "Overlay remains while question rerenders");
    await finishTransition(h);
    eq(h.session.questionIndex, 1, "Incidental rerender cannot swallow a valid Next tap");
    eq(h.session.answered, false, "Rerendered page advances into unanswered question");
    eq(h.busy, false, "Rerendered transition releases busy state");
  }

  {
    const h = createHarness();
    h.currentChoice(1).tap();
    eq(h.session.answerCorrect, false, "Incorrect answer recorded normally");
    eq(h.session.earnedStarPegCount, 0, "Wrong answer does not earn star peg");
    h.currentNext().tap();
    const fadeIn = h.nextAnimation();
    ok(fadeIn, "Fade-in begins for wrong answer as normal");
    fadeIn.reject(new Error("WebKit animation interrupted"));
    await flush();
    eq(h.session.questionIndex, 1, "Interrupted fade-in still honors a valid Next tap");
    eq(h.session.answered, false, "Interrupted fade-in resets answer state");
    eq(h.busy, false, "Interrupted animation unlocks transition");
    eq(h.overlays[0].isConnected, false, "Interrupted animation removes overlay");
    eq(h.warnings.length, 1, "Animation interruption recorded once");
  }

  {
    const h = createHarness();
    h.currentChoice(0).tap();
    h.currentNext().tap();
    const fadeIn = h.nextAnimation();
    fadeIn.resolve();
    await flush();
    eq(h.session.questionIndex, 1, "Successful fade-in advances question");
    h.advanceTime(75);
    await flush();
    const fadeOut = h.nextAnimation();
    ok(fadeOut, "Fade-out begins after a successful advance");
    fadeOut.reject(new Error("WebKit fade-out interrupted"));
    await flush();
    eq(h.session.questionIndex, 1, "Interrupted fade-out cannot advance twice");
    eq(h.busy, false, "Fade-out interruption releases lock");
  }

  {
    const h = createHarness();
    h.currentChoice(0).tap();
    h.currentNext().tap();
    h.leave();
    const fadeIn = h.nextAnimation();
    fadeIn.resolve();
    await flush();
    eq(h.activeSession, null, "Leaving Daily Questions clears session");
    eq(h.session.questionIndex, 0, "Abandoned session does not advance");
    eq(h.busy, false, "Abandoned transition releases lock");
    eq(h.overlays[0].isConnected, false, "Leaving during transition removes overlay");
  }

  {
    const h = createHarness();
    h.currentChoice(0).tap();
    h.advanceTime(900); // popup expires before Next is tapped
    eq(h.session.showStarRewardPopup, false, "Normal popup expiration still dismisses star");
    const renders = h.renderCount;
    h.currentNext().tap();
    await finishTransition(h);
    eq(h.session.questionIndex, 1, "Next works after normal popup expiration");
    eq(h.renderCount, renders + 1, "Next renders only the new question");
  }

  {
    const h = createHarness({ reducedMotion: true });
    h.currentChoice(0).tap();
    const next = h.currentNext();
    next.tap();
    eq(h.session.questionIndex, 1, "Reduced-motion Next advances immediately");
    eq(h.session.answered, false, "Reduced-motion Next clears answered state");
    eq(h.busy, false, "Reduced-motion Next does not leave transition lock set");
    eq(h.animations.length, 0, "Reduced-motion Next does not create an animation");
    next.tap();
    eq(h.session.questionIndex, 1, "Reduced-motion stale button cannot double advance");
  }

  {
    const h = createHarness();
    h.currentChoice(0).tap();
    h.currentNext().tap();
    const fadeIn = h.nextAnimation();
    h.leave();
    fadeIn.reject(new Error("WebKit animation canceled on navigation"));
    await flush();
    eq(h.session.questionIndex, 0, "Canceled animation after leaving cannot advance old session");
    eq(h.busy, false, "Canceled navigation resets transition lock");
  }

  ok(worker.includes('2026_Oct_17_patch26_daily_next_reliability'),
    "Service worker cache version updated for Patch 26");
  ok(source.includes("clearDailyQuestionRewardPopupTimer();\n          dailySession.showStarRewardPopup = false;"),
    "Production Next handler cancels reward popup before transitioning");
  console.log(`Patch 26 Daily Questions Next reliability: ${checks} assertions passed.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
