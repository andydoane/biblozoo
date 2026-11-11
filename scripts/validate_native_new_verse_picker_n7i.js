"use strict";
// N7i: run the ACTUAL New Verse picker controller from app.js in a VM.
// This is source/UI contract coverage, not an Xcode compile or audible iPhone test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const app = read("app.js");
const listen = read("verse_games/shared/native-learn-listen.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const index = read("index.html");
const guard = read("verse_games/shared/native-only-ios-output.js");
const start = app.indexOf("/* Shared New Verse audio preview.");
const end = app.indexOf("function newVersePickerCardHtml(", start);
assert(start >= 0 && end > start, "find real picker controller");
const picker = app.slice(start, end);

assert(index.indexOf('src="verse_games/shared/native-learn-listen.js"') <
  index.indexOf('src="app.js"'), "native owner loaded before app");
assert(guard.includes("HTMLMediaElement.play"), "N1 still blocks native Web audio");
assert(listen.includes('stage = "reference"'));
assert(listen.includes('stage === "reference" ? "learn-ref-" : "learn-verse-"'));
assert(listen.includes("activateFromGesture({ purpose: \"learn\" })"));
assert(swift.includes('"learn-verse-"'), "Swift allowlists Learn full-verse keys");
assert(swift.includes('subdirectory: "public/verse_audio"'),
  "verse MP3 resolved only from bundled public assets");
assert(app.includes('stopNewVersePickerPreviewAudio();'), "screen and mute cleanup retained");
assert(app.includes("if (from === Screen.NEW_VERSE_PICKER)"));
assert(app.includes("if (muted) {\n    stopNewVersePickerPreviewAudio()"));
assert(picker.includes('stage: "verse"'), "picker plays FULL verse, not ref+verse");
assert(picker.includes("new Audio("), "browser fallback preserved only outside native guard");
assert(!picker.includes("AudioContext"), "no WebAudio path introduced");
assert(app.includes('data-new-verse-preview-id='), "card speaker button retained");
assert(app.includes('data-new-verse-id='), "separate card selection intact");

function makeHarness({ native = true, ready = true, mute = false } = {}) {
  const calls = [];
  const dialogs = [];
  const handlers = { document: new Map(), window: new Map() };
  const buttons = ["john_3_16", "psalm_23_4"].map(id => ({
    dataset: { newVersePreviewId: id, versePreviewRef: id },
    classes: new Map(),
    attrs: new Map(),
    classList: { toggle(name, on) { this.parent.classes.set(name, on); } },
    setAttribute(name, value) { this.attrs.set(name, value); }
  }));
  for (const button of buttons) button.classList.parent = button;
  const doc = {
    hidden: false,
    addEventListener(name, fn) {
      if (!handlers.document.has(name)) handlers.document.set(name, []);
      handlers.document.get(name).push(fn);
    },
    querySelectorAll(selector) {
      return selector === "[data-new-verse-preview-id]" ? buttons : [];
    }
  };
  let callback = null;
  let resolveStart = null;
  const audioSources = [];
  class WebAudio {
    constructor(src) {
      audioSources.push(src);
      if (native) throw Error("Native picker illegally created HTML Audio");
      this.currentTime = 0;
      this.listeners = new Map();
      this.paused = true;
    }
    addEventListener(name, fn) { this.listeners.set(name, fn); }
    play() { this.paused = false; return Promise.resolve(true); }
    pause() { this.paused = true; }
    emit(name) { this.listeners.get(name)?.(); }
  }
  const nativeOwner = {
    isAvailable() { return ready; },
    startFromGesture(options) {
      calls.push(["native-start", options.verseId, options.stage]);
      callback = options.onEvent;
      return new Promise(resolve => { resolveStart = resolve; });
    },
    stop() { calls.push(["native-stop"]); }
  };
  const win = {
    BibloZooNativeOnlyOutput: { enabled: native },
    BibloZooNativeLearnListen: nativeOwner,
    addEventListener(name, fn) {
      if (!handlers.window.has(name)) handlers.window.set(name, []);
      handlers.window.get(name).push(fn);
    }
  };
  const state = { screen: "new-picker" };
  const context = {
    window: win, document: doc, IMG_DIR: "./verse_images/",
    AUDIO_DIR: "./verse_audio/",
    State: state, Screen: { NEW_VERSE_PICKER: "new-picker" },
    muted: mute, Promise, Audio: WebAudio,
    Image: class Image {},
    encodeURIComponent,
    showDialog(x) { dialogs.push(x); },
    dlgBtn() { return {}; },
    closeDialog() {}
  };
  vm.runInNewContext(picker +
    "\nwindow.__test = {toggleNewVersePickerPreviewAudio, " +
    "stopNewVersePickerPreviewAudio, updateNewVersePickerAudioButtons};",
    context, { filename: "app.js:NewVersePicker" });
  const emit = (where, name) => {
    for (const fn of handlers[where].get(name) || []) fn();
  };
  return {
    win, doc, state, dialogs, calls, buttons, audioSources, context,
    toggle: id => win.__test.toggleNewVersePickerPreviewAudio(id),
    stop: () => win.__test.stopNewVersePickerPreviewAudio(),
    nativeEvent: event => callback?.(event),
    resolveNative: result => resolveStart?.(result),
    emit, webAudio: () => audioSources,
    selected: id => buttons.find(x => x.dataset.newVersePreviewId === id)
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
async function run() {
  const h = makeHarness();
  h.toggle("john_3_16");
  assert.deepEqual(Array.from(h.calls[0]), ["native-start", "john_3_16", "verse"],
    "real Play tap calls native full-verse owner");
  assert.equal(h.selected("john_3_16").attrs.get("aria-pressed"), "true");
  assert.equal(h.selected("psalm_23_4").attrs.get("aria-pressed"), "false");
  assert.equal(h.audioSources.length, 0, "native branch never creates HTML Audio");
  h.nativeEvent({ kind: "completed", stage: "reference" });
  assert.equal(h.selected("john_3_16").attrs.get("aria-pressed"), "true",
    "reference must never finish full verse preview");
  h.nativeEvent({ kind: "completed", stage: "verse" });
  assert.equal(h.selected("john_3_16").attrs.get("aria-pressed"), "false",
    "only real native verse completion clears Stop button");
  h.resolveNative({ ready: true });
  await flush();
  assert.equal(h.dialogs.length, 0);

  const same = makeHarness();
  same.toggle("john_3_16");
  same.toggle("john_3_16");
  assert.equal(same.calls.filter(x => x[0] === "native-start").length, 1);
  assert(same.calls.some(x => x[0] === "native-stop"), "same speaker toggles Stop");
  assert.equal(same.selected("john_3_16").attrs.get("aria-pressed"), "false");

  const switched = makeHarness();
  switched.toggle("john_3_16");
  const oldCallback = (() => {
    let cb;
    const api = switched.win.BibloZooNativeLearnListen;
    const orig = api.startFromGesture;
    api.startFromGesture = args => { cb = args.onEvent; return orig(args); };
    switched.toggle("psalm_23_4");
    return cb;
  })();
  oldCallback({ kind: "completed", stage: "verse" });
  assert.equal(switched.selected("psalm_23_4").attrs.get("aria-pressed"), "true",
    "stale completed event cannot clear newer selected verse");
  switched.nativeEvent({ kind: "completed", stage: "verse" });
  assert.equal(switched.selected("psalm_23_4").attrs.get("aria-pressed"), "false");

  const failed = makeHarness();
  failed.toggle("john_3_16");
  failed.nativeEvent({ kind: "failed", reason: "not-published" });
  assert.equal(failed.selected("john_3_16").attrs.get("aria-pressed"), "false");
  assert.equal(failed.dialogs[0].title, "Verse audio unavailable");
  assert(failed.dialogs[0].body.includes("still choose it"),
    "playback failure does not block selecting verse");

  const interrupted = makeHarness();
  interrupted.toggle("john_3_16");
  interrupted.nativeEvent({ kind: "interrupted" });
  assert.equal(interrupted.dialogs.length, 0,
    "iOS interruption silently stops informational preview");
  assert.equal(interrupted.selected("john_3_16").attrs.get("aria-pressed"), "false");

  const hidden = makeHarness();
  hidden.toggle("john_3_16");
  hidden.doc.hidden = true;
  hidden.emit("document", "visibilitychange");
  hidden.resolveNative({ ready: false, reason: "interrupted" });
  await flush();
  assert.equal(hidden.dialogs.length, 0,
    "late refusal after backgrounding must not show a popup");
  assert.equal(hidden.selected("john_3_16").attrs.get("aria-pressed"), "false");
  const closed = makeHarness();
  closed.toggle("john_3_16");
  closed.emit("window", "pagehide");
  closed.resolveNative({ ready: false, reason: "stale" });
  await flush();
  assert.equal(closed.dialogs.length, 0, "late Exit refusal is ignored");

  const denied = makeHarness();
  denied.toggle("john_3_16");
  denied.resolveNative({ ready: false, reason: "os-denied" });
  await flush();
  assert.equal(denied.dialogs.length, 1, "genuine native refusal offers retry");
  assert.equal(denied.selected("john_3_16").attrs.get("aria-pressed"), "false");

  const noBridge = makeHarness({ ready: false });
  noBridge.toggle("john_3_16");
  assert.equal(noBridge.dialogs[0].title, "Verse audio unavailable");
  assert.equal(noBridge.audioSources.length, 0, "no native->Web fallback");

  const muted = makeHarness({ mute: true });
  muted.toggle("john_3_16");
  assert.equal(muted.dialogs[0].title, "Sound is off");
  assert.equal(muted.calls.length, 0);
  const leave = makeHarness();
  leave.toggle("john_3_16");
  leave.stop();
  leave.nativeEvent({ kind: "failed" });
  assert.equal(leave.dialogs.length, 0, "old failure after card selection ignored");

  const browser = makeHarness({ native: false });
  browser.toggle("john_3_16");
  assert.equal(browser.audioSources[0], "./verse_audio/john_3_16.mp3",
    "Web/PWA preview retains original full-verse URL");
  assert.equal(browser.calls.length, 0, "Web/PWA never calls native");
  assert.equal(browser.selected("john_3_16").attrs.get("aria-pressed"), "true");
  browser.stop();
  assert.equal(browser.selected("john_3_16").attrs.get("aria-pressed"), "false");

  console.log("N7i PASS: real picker native verse-only gesture, Stop/replay/card " +
    "switch/true end, native failure, mute, hidden/pagehide, stale callbacks, " +
    "no Web output fallback, unchanged browser preview and selection markup.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
