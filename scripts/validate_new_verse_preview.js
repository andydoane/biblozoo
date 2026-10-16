"use strict";

// Small, independent regression suite for the shared New Verse picker.
// Run with: node scripts/validate_new_verse_preview.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const start = app.indexOf("/* Shared New Verse audio preview.");
const end = app.indexOf("async function selectVerseAndReturnHome(", start);
assert.ok(start > 0 && end > start, "New Verse preview helpers must exist");
const source = app.slice(start, end);

class ClassList {
  constructor() { this.values = new Set(); }
  toggle(value, enabled) {
    if (enabled) this.values.add(value);
    else this.values.delete(value);
  }
  contains(value) { return this.values.has(value); }
}
class FakeAudio {
  constructor(src) {
    this.src = src;
    this.events = {};
    this.paused = false;
    this.currentTime = 0;
    this.played = false;
    FakeAudio.created.push(this);
  }
  addEventListener(type, callback) { this.events[type] = callback; }
  pause() { this.paused = true; }
  play() {
    this.played = true;
    return this.playResult || Promise.resolve();
  }
  emit(type) { this.events[type]?.(); }
}
FakeAudio.created = [];
class FakeImage {
  constructor() { FakeImage.created.push(this); }
  set src(value) { this.source = value; }
}
FakeImage.created = [];
const buttons = [];
const icons = [];
const docEvents = {};
const windowEvents = {};
const doc = {
  hidden: false,
  addEventListener(type, cb) { docEvents[type] = cb; },
  querySelectorAll(selector) {
    return selector === ".new-verse-preview-icon" ? icons :
      selector === "[data-new-verse-preview-id]" ? buttons : [];
  }
};
const notices = [];
const context = vm.createContext({
  IMG_DIR: "verse_images/",
  AUDIO_DIR: "verse_audio/",
  document: doc,
  window: { addEventListener(type, cb) { windowEvents[type] = cb; } },
  Image: FakeImage,
  Audio: FakeAudio,
  State: { screen: "new_verse_picker", selectedVerseId: "untouched" },
  Screen: { NEW_VERSE_PICKER: "new_verse_picker" },
  muted: false,
  showDialog: (data) => notices.push(data),
  dlgBtn: (label) => label,
  closeDialog: () => {},
  getBibloPetEmojiForVerseId: () => "🐾",
  getVerseProgress: () => ({ learnCompleted: true }),
  bibloPetVisualHtml: () => '<span class="biblopet-visual">Pet</span>',
  escapeHtml: (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
});
vm.runInContext(source, context, { filename: "app.js (picker excerpt)" });
const evalPicker = (code) => vm.runInContext(code, context);
const button = (id) => {
  const b = {
    dataset: { newVersePreviewId: id, versePreviewRef: id },
    classList: new ClassList(),
    attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; }
  };
  buttons.push(b);
  return b;
};
const first = button("john_3_16");
const second = button("romans_12_2");
const icon = { classList: new ClassList(), textContent: "" };
icons.push(icon);
const tests = [];
function test(label, fn) { tests.push({ label, fn }); }

test("each tile has a separate speaker button, not a nested button", () => {
  const html = evalPicker('newVersePickerCardHtml({id:"john_3_16",ref:"John 3:16"},{changeVerseMode:true})');
  assert.equal((html.match(/<button\b/g) || []).length, 2);
  assert.equal((html.match(/<\/button>/g) || []).length, 2);
  const closeSelection = html.indexOf("</button>");
  const speaker = html.indexOf('class="new-verse-preview-audio');
  assert.ok(speaker > closeSelection, "Speaker must follow the closed selection button");
  assert.ok(html.includes('data-new-verse-id="john_3_16"'));
  assert.ok(html.includes('data-new-verse-preview-id="john_3_16"'));
  assert.ok(html.includes('aria-label="Listen to John 3:16"'));
  assert.ok(html.includes('new-verse-card-learned'));
});

test("speaker starts with 🔈 and probes an optional PNG once", () => {
  assert.ok(evalPicker('newVersePickerCardHtml({id:"x",ref:"X"})').includes("🔈"));
  evalPicker("checkNewVersePickerSpeakerImage(); checkNewVersePickerSpeakerImage();");
  assert.equal(FakeImage.created.length, 1);
  assert.equal(FakeImage.created[0].source, "verse_images/verse_preview_speaker.png");
  FakeImage.created[0].onerror();
  assert.equal(evalPicker("newVerseSpeakerImageReady"), false);
});

test("loaded PNG replaces the emoji and works on future renders", () => {
  FakeImage.created[0].onload();
  assert.equal(evalPicker("newVerseSpeakerImageReady"), true);
  assert.ok(icon.classList.contains("has-image"));
  assert.equal(icon.textContent, "");
  assert.ok(evalPicker('newVersePickerCardHtml({id:"x",ref:"X"})').includes('new-verse-preview-icon has-image'));
  assert.ok(css.includes('verse_preview_speaker.png'));
});

test("playing a verse does not select or load it", () => {
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  assert.equal(FakeAudio.created.length, 1);
  assert.equal(FakeAudio.created[0].src, "verse_audio/john_3_16.mp3");
  assert.equal(FakeAudio.created[0].played, true);
  assert.ok(first.classList.contains("is-playing"));
  assert.equal(first.attributes["aria-pressed"], "true");
  assert.equal(evalPicker("State.selectedVerseId"), "untouched");
});

test("tapping the same speaker stops playback", () => {
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  assert.equal(FakeAudio.created[0].paused, true);
  assert.equal(evalPicker("newVersePreviewAudio"), null);
  assert.equal(first.attributes["aria-pressed"], "false");
});

test("a different speaker replaces the previous audio and ignores stale events", () => {
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  const old = FakeAudio.created.at(-1);
  evalPicker('toggleNewVersePickerPreviewAudio("romans_12_2")');
  assert.ok(old.paused);
  assert.ok(second.classList.contains("is-playing"));
  old.emit("ended");
  assert.equal(evalPicker("newVersePreviewVerseId"), "romans_12_2");
  FakeAudio.created.at(-1).emit("ended");
  assert.equal(evalPicker("newVersePreviewAudio"), null);
});

test("muted app declines playback with a useful message", () => {
  evalPicker("muted = true");
  const count = FakeAudio.created.length;
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  assert.equal(FakeAudio.created.length, count);
  assert.equal(notices.at(-1).title, "Sound is off");
  evalPicker("muted = false");
});

test("page hide and background visibility both stop audio", () => {
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  const before = FakeAudio.created.at(-1);
  doc.hidden = true;
  docEvents.visibilitychange();
  assert.ok(before.paused);
  doc.hidden = false;
  evalPicker('toggleNewVersePickerPreviewAudio("romans_12_2")');
  const after = FakeAudio.created.at(-1);
  windowEvents.pagehide();
  assert.ok(after.paused);
});

test("missing audio resets playback and keeps verse selection available", () => {
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  const failing = FakeAudio.created.at(-1);
  failing.emit("error");
  assert.ok(failing.paused);
  assert.equal(evalPicker("newVersePreviewAudio"), null);
  assert.equal(notices.at(-1).title, "Verse audio unavailable");
  assert.equal(evalPicker("State.selectedVerseId"), "untouched");
});

test("audio cannot launch after the picker has closed", () => {
  evalPicker('State.screen = "title"');
  const count = FakeAudio.created.length;
  evalPicker('toggleNewVersePickerPreviewAudio("john_3_16")');
  assert.equal(FakeAudio.created.length, count);
  evalPicker('State.screen = "new_verse_picker"');
});

test("navigation, selection, mute and buttons use shared cleanup", () => {
  assert.match(app, /if \(from === Screen\.NEW_VERSE_PICKER\)\s*\{\s*stopNewVersePickerPreviewAudio\(\);/);
  assert.match(app, /State\.screen === Screen\.NEW_VERSE_PICKER &&\s*screen !== Screen\.NEW_VERSE_PICKER/);
  assert.match(app, /if \(muted\) stopNewVersePickerPreviewAudio\(\);/);
  assert.match(app, /\[data-new-verse-preview-id\]"\)\.forEach\(\(button\) => \{\s*button\.onclick/);
  assert.match(app, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*toggleNewVersePickerPreviewAudio/);
  assert.match(app, /const verseId = btn\.getAttribute\("data-new-verse-id"\) \|\| "";\s*stopNewVersePickerPreviewAudio\(\);/);
});

test("small-screen touch target and badge placement are protected", () => {
  assert.match(css, /\.new-verse-preview-audio\s*\{[^}]*width: 44px;[^}]*height: 44px;/s);
  assert.match(css, /\.new-verse-picker-screen \.new-verse-card-learned\s*\{[^}]*right: auto;[^}]*left:/s);
  assert.match(css, /\.new-verse-picker-screen \.new-verse-card-shell\s*\{/);
});

test("service worker has a version without precaching an optional speaker image", () => {
  assert.match(worker, /const CACHE_VERSION = "[A-Za-z0-9_]+";/);
  assert.doesNotMatch(worker, /"\.\/verse_images\/verse_preview_speaker\.png"/);
});

test("speaker artwork has no button circle, border, or shadow", () => {
  const style = css.match(/\.new-verse-picker-screen \.new-verse-preview-audio\s*\{([^}]*)\}/);
  assert.ok(style, "Speaker styles must exist");
  assert.match(style[1], /border: 0;/);
  assert.match(style[1], /background: transparent;/);
  assert.match(style[1], /box-shadow: none;/);
  assert.match(css, /\.new-verse-preview-audio\.is-playing \.new-verse-preview-icon/);
  assert.doesNotMatch(css, /\.new-verse-preview-audio\.is-playing\s*\{[^}]*box-shadow:/s);
  assert.match(css, /\.new-verse-preview-audio:focus-visible\s*\{[^}]*outline:/s);
});

test("tutorial clipboard uses Daily artwork without affecting developer previews", () => {
  const start = app.indexOf("function screenTodoDev(idx)");
  const end = app.indexOf("function screenProgress(idx)", start);
  const tutorial = app.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.match(tutorial, /if \(tutorialActive\) \{\s*wrap\.classList\.add\("is-tutorial-mode"\);/);
  assert.match(css, /\.todo-dev-screen\.is-tutorial-mode\s*\{[^}]*zoo_to_do_background_phone\.jpg/s);
  assert.match(css, /\.todo-dev-screen\.is-tutorial-mode \.todo-dev-page\s*\{[^}]*zoo_to_do_background_phone\.jpg/s);
  assert.match(css, /\.todo-dev-screen\.is-tutorial-mode::before\s*\{[^}]*background: transparent;/s);
  assert.match(css, /@media \(min-width: 700px\)[\s\S]*?\.todo-dev-screen\.is-tutorial-mode,[\s\S]*?zoo_to_do_background_ipad\.jpg/);
});

(async () => {
  for (const {label, fn} of tests) {
    try { await fn(); }
    catch (err) { err.message = `${label}: ${err.message}`; throw err; }
  }
  console.log(`New Verse picker audio validation passed (${tests.length} checks).`);
})().catch((err) => { console.error(err); process.exitCode = 1; });
