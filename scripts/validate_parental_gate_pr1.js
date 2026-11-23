/* PR 1: real shared gate controller tested with synthetic DOM and fake data only. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { makeQuestion, createGate, isNativeKidsBuild } =
  require("../verse_games/shared/parental-gate.js");
const ROOT = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");

class FakeElement {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.doc = doc;
    this.parent = null;
    this.children = [];
    this._text = "";
    this.listeners = {};
    this.attributes = {};
    this.className = "";
    this.value = "";
  }
  get textContent() {
    return this._text + this.children.map(child => child.textContent).join("");
  }
  set textContent(value) {
    this.replaceChildren();
    this._text = String(value);
  }
  get isConnected() {
    return this === this.doc.body || !!this.parent?.isConnected;
  }
  append(...items) {
    for (const item of items) {
      if (item.parent) item.remove();
      this.children.push(item);
      item.parent = this;
    }
  }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this._text = "";
    this.append(...items);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(item => item !== this);
    this.parent = null;
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }
  dispatch(type, properties = {}) {
    const event = {
      key: "", shiftKey: false,
      preventDefault() { this.defaultPrevented = true; },
      ...properties
    };
    for (const listener of (this.listeners[type] || []).slice()) listener(event);
    return event;
  }
  contains(node) {
    return this === node || this.children.some(child => child.contains(node));
  }
  querySelectorAll(selector) {
    const all = [];
    function walk(node) {
      for (const child of node.children) {
        if (/button:not/.test(selector) && (child.tagName === "BUTTON" ||
            child.tagName === "INPUT")) all.push(child);
        walk(child);
      }
    }
    walk(this);
    return all;
  }
  focus() {
    this.doc.activeElement = this;
    // Focusing an editable Answer field summons the iOS keyboard; focus on
    // the equation alone must NOT show it on dialog entrance/wrong answer.
    if (this.tagName === "INPUT") {
      this.doc.keyboardFocusCount = (this.doc.keyboardFocusCount || 0) + 1;
      if (this.doc.simulateWebKitInputFocusBlur)
        this.doc.ownerWindow.dispatch("blur");
    }
  }
}
function scenario(platform = "ios", production = true) {
  const doc = {
    listeners: {}, visibilityState: "visible", hidden: false, activeElement: null,
    keyboardFocusCount: 0,
    createElement(tag) { return new FakeElement(tag, this); },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      this.listeners[type] = (this.listeners[type] || []).filter(x => x !== fn);
    },
    dispatch(type, props = {}) {
      const event = { preventDefault() { this.defaultPrevented = true; }, ...props };
      for (const listener of (this.listeners[type] || []).slice()) listener(event);
      return event;
    }
  };
  doc.body = new FakeElement("body", doc);
  const rootButton = doc.createElement("button");
  doc.body.append(rootButton);
  rootButton.focus();
  const randomValues = [];
  const win = {
    document: doc,
    Capacitor: {
      isNativePlatform: () => platform !== "web",
      getPlatform: () => platform
    },
    BibloZooNativeOnlyOutput: {
      enabled: true,
      devToolsAllowed: !production
    },
    crypto: {
      getRandomValues(array) { array[0] = randomValues.length ? randomValues.shift() : 0; return array; }
    },
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      this.listeners[type] = (this.listeners[type] || []).filter(x => x !== fn);
    },
    dispatch(type) { for (const fn of (this.listeners[type] || []).slice()) fn(); }
  };
  doc.ownerWindow = win;
  const gate = createGate(win);
  function get(className) {
    const all = [];
    function walk(node) {
      if (node.className.split(" ").includes(className)) all.push(node);
      for (const child of node.children) walk(child);
    }
    walk(doc.body);
    return all[0];
  }
  function click(text) {
    const list = [];
    function walk(node) {
      if (node.tagName === "BUTTON" && node.textContent === text) list.push(node);
      for (const child of node.children) walk(child);
    }
    walk(doc.body);
    assert.equal(list.length, 1, "missing button " + text);
    list[0].dispatch("click");
  }
  function answer(value) {
    const field = get("bz-parental-gate-answer");
    assert.ok(field, "answer field present");
    field.value = String(value);
    get("bz-parental-gate-form").dispatch("submit");
  }
  return { win, doc, gate, get, click, answer, randomValues, rootButton };
}

async function main() {
  // Owner's revised challenge: two digits - two digits + one digit,
  // with a positive result never above 99. Probe all 80 first numbers,
  // and the allowed ends of the second/subtrahend range.
  const seen = new Set();
  for (let i = 0; i < 80; i++) {
    let call = 0;
    const question = makeQuestion(max => {
      assert.equal(max, [80, 10 + i, 9][call]);
      return [i, max - 1, 8][call++];
    });
    assert.equal(question.first, 20 + i);
    assert.equal(question.subtrahend, question.first - 1);
    assert.equal(question.addition, 9);
    assert.equal(question.answer, 10);
    assert.ok(question.first >= 20 && question.first <= 99);
    assert.ok(question.subtrahend >= 10 && question.subtrahend < question.first);
    assert.ok(question.answer >= 1 && question.answer <= 99);
    seen.add(question.first);
  }
  assert.equal(seen.size, 80);
  assert.deepEqual(makeQuestion(() => 0),
    { first: 20, subtrahend: 10, addition: 1, answer: 11 });
  let maxCall = 0;
  assert.deepEqual(makeQuestion(() => [79, 0, 8][maxCall++]),
    { first: 99, subtrahend: 10, addition: 9, answer: 98 });
  assert.throws(() => makeQuestion(() => -1), /Could not create/);
  assert.throws(() => makeQuestion(() => 10000), /Could not create/);

  for (const platform of ["web", "android"]) {
    const s = scenario(platform);
    assert.equal(isNativeKidsBuild(s.win), false);
    assert.equal(await s.gate.requestApproval({ onApproved() { throw Error("no"); } }), false);
    assert.equal(s.get("bz-parental-gate-overlay"), undefined);
  }
  const audioTest = scenario("ios", false);
  assert.equal(isNativeKidsBuild(audioTest.win), false, "Audio Test identity excluded");
  assert.equal(await audioTest.gate.requestApproval({ onApproved() {} }), false);

  const s = scenario();
  let invocations = 0;
  const action = () => { invocations++; };
  assert.equal(s.gate.isAvailable(), true);
  assert.equal(await s.gate.requestApproval({}), false, "no callback denies");
  const cancelled = s.gate.requestApproval({ onApproved: action });
  assert.ok(s.get("bz-parental-gate-overlay"));
  assert.equal(s.get("bz-parental-gate-equation"), undefined, "intro stage first");
  s.click("Not Now");
  assert.equal(await cancelled, false);
  assert.equal(invocations, 0);
  assert.equal(s.get("bz-parental-gate-overlay"), undefined);
  assert.equal(s.doc.activeElement, s.rootButton, "focus restored");

  // Correct answer runs one callback. The duplicate request cannot authorize.
  const approved = s.gate.requestApproval({ onApproved: action });
  s.doc.simulateWebKitInputFocusBlur = true;
  assert.equal(await s.gate.requestApproval({ onApproved: action }), false);
  s.click("I'm a Grown-up");
  assert.equal(s.get("bz-parental-gate-equation").textContent, "20 − 10 + 1 = ?");
  assert.equal(s.doc.activeElement, s.get("bz-parental-gate-equation"),
    "math question gets initial accessible focus, not the editable Answer field");
  assert.equal(s.doc.keyboardFocusCount, 0,
    "no automatic iOS keyboard on first math screen");
  assert.equal(s.get("bz-parental-gate-equation").attributes.tabindex, "-1");
  assert.equal(s.get("bz-parental-gate-status").textContent, "",
    "click Event must not appear as feedback in the dialog");
  assert.ok(s.get("bz-parental-gate-overlay"),
    "Safari input-focus blur must not close the visible dialog");
  // A parent deliberately tapping Answer may open the iOS keyboard; that
  // Safari focus change must keep the grown-up math challenge alive.
  s.get("bz-parental-gate-answer").focus();
  assert.equal(s.doc.keyboardFocusCount, 1);
  assert.ok(s.get("bz-parental-gate-overlay"),
    "manual input focus must not dismiss the dialog");
  s.win.dispatch("blur");
  assert.ok(s.get("bz-parental-gate-overlay"),
    "mere window blur while page remains visible is not app backgrounding");
  assert.equal(s.get("bz-parental-gate-equation").textContent.includes("= 11"), false,
    "expected answer must not be displayed");
  const focusable = s.get("bz-parental-gate-overlay").querySelectorAll("button:not([disabled]), input:not([disabled])");
  focusable[0].focus();
  const tab = s.doc.dispatch("keydown", { key: "Tab", shiftKey: true });
  assert.equal(tab.defaultPrevented, true, "focus trap");
  assert.equal(s.doc.activeElement, focusable[focusable.length - 1]);
  s.answer(11);
  assert.equal(await approved, true);
  assert.equal(invocations, 1);

  // Wrong answers get fresh questions; third wrong response denies.
  const denied = s.gate.requestApproval({ onApproved: action });
  s.click("I'm a Grown-up");
  s.randomValues.push(1, 1, 1);
  const beforeRetryFocus = s.doc.keyboardFocusCount;
  s.answer(999);
  assert.equal(s.get("bz-parental-gate-equation").textContent, "21 − 11 + 2 = ?");
  assert.equal(s.doc.activeElement, s.get("bz-parental-gate-equation"),
    "new math gets accessible focus after wrong answer");
  assert.equal(s.doc.keyboardFocusCount, beforeRetryFocus,
    "wrong-answer retry must not automatically reopen the keyboard");
  s.answer(-1);
  s.answer(0);
  assert.equal(await denied, false);
  assert.equal(invocations, 1);

  // Explicit cancellation, backgrounding, pagehide, back navigation and loss
  // of a live dialog must never execute the selected callback.
  for (const lifecycle of ["cancel", "pagehide", "popstate", "visibility", "removed"]) {
    const pending = s.gate.requestApproval({ onApproved: action });
    s.click("I'm a Grown-up");
    if (lifecycle === "cancel") s.gate.cancelActive();
    if (lifecycle === "pagehide") s.win.dispatch("pagehide");
    if (lifecycle === "popstate") s.win.dispatch("popstate");
    if (lifecycle === "visibility") {
      s.doc.hidden = true;
      s.doc.dispatch("visibilitychange");
      s.doc.hidden = false;
    }
    if (lifecycle === "removed") {
      const detachedForm = s.get("bz-parental-gate-form");
      s.get("bz-parental-gate-overlay").remove();
      // Dispatch on the already-held stale form, not a live DOM lookup.
      detachedForm.dispatch("submit");
    }
    assert.equal(await pending, false, lifecycle + " denied");
    assert.equal(invocations, 1);
  }

  const missingRandom = scenario();
  delete missingRandom.win.crypto;
  assert.equal(await missingRandom.gate.requestApproval({ onApproved: action }), false);

  const root = read("index.html");
  const ghost = read("verse_playground/ghost_writer/index.html");
  for (const html of [root, ghost]) {
    assert.match(html, /parental-gate\.css/);
    assert.match(html, /parental-gate\.js/);
  }
  assert.match(read("scripts/build.js"), /"verse_games"/,
    "one shared library is copied with runtime assets");
  assert.ok(fs.existsSync(path.join(ROOT, "tests/parental-gate-preview.html")));
  assert.doesNotMatch(read("app.js"), /BibloZooParentalGate/,
    "no existing main app action wired during PR 1");
  assert.doesNotMatch(read("verse_playground/ghost_writer/game.js"), /BibloZooParentalGate/,
    "no existing Ghost Writer action wired during PR 1");

  // Test preview is not in runtimeDirs or rootFiles and cannot ship by accident.
  assert.doesNotMatch(read("scripts/build.js"), /"tests"/);
  const dist = path.join(ROOT, "dist");
  if (fs.existsSync(dist)) {
    assert.ok(fs.existsSync(path.join(dist, "verse_games/shared/parental-gate.js")));
    assert.ok(fs.existsSync(path.join(dist, "verse_games/shared/parental-gate.css")));
    assert.equal(fs.existsSync(path.join(dist, "tests/parental-gate-preview.html")), false);
    assert.match(read("dist/index.html"), /parental-gate\.js/);
    assert.match(read("dist/verse_playground/ghost_writer/index.html"), /parental-gate\.js/);
  }
  console.log("Kids PR1 PASS: two-digit subtraction + one-digit addition, result at most 99, Safari input focus, one-shot approval, cancellation/lifecycle, platform isolation, shared assets, unshipped preview.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
