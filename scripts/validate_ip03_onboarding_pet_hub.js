"use strict";
// IP03 iPad-first visual contract + actual tutorial height equalizer behavior.
// No real iPad/iPhone screenshot or Apple SDK result is implied by this test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const app = read("app.js");
const css = read("styles.css");
const dailyCss = read("daily_zoo_todo.css");
const profileCss = read("profiles.css");
const begin = "function equalizeZooTodoTutorialClipboardPages(rootEl = document) {";
const end = "function playZooTodoTutorialPageAudio(pageNumber, { explicit = false } = {}) {";
const a = app.indexOf(begin), b = app.indexOf(end, a + begin.length);
assert.ok(a > 0 && b > a, "must execute actual tutorial height equalizer");
const fn = app.slice(a, b);

// Explicitly demonstrate the new iPad page-1 no-equalization branch, while
// phone page 1 and pages 2/3 still use the original height matching.
function equalizeInFakeViewport({ width, page, initialHeight = "400px" }) {
  let measured = 0, appended = 0, removed = 0, measuredPages = [];
  const styles = { "--todo-tutorial-note-min-height": initialHeight };
  const paper = {
    clientWidth: Math.min(width - 50, 700),
    style: {
      removeProperty(prop) { delete styles[prop]; },
      setProperty(prop, value) { styles[prop] = value; }
    },
    querySelector(sel) {
      assert.equal(sel, ".todo-tutorial-note[data-tutorial-page]");
      return {getAttribute: name => {
        assert.equal(name, "data-tutorial-page");
        return String(page);
      }};
    },
    appendChild(element) { appended++; assert.ok(element); }
  };
  const rootEl = {querySelectorAll: selector => {
    assert.equal(selector, ".todo-dev-paper");
    return [paper];
  }};
  const doc = {createElement: tag => {
    assert.equal(tag, "div");
    measured++;
    return {
      className:"", style:{}, innerHTML:"",
      setAttribute(){},
      querySelectorAll(selector) {
        assert.equal(selector, ".todo-tutorial-note");
        return [345, 365].map(height => ({
          getBoundingClientRect: () => ({height})
        }));
      },
      remove(){removed++;}
    };
  }};
  const window = {
    matchMedia: media => {
      assert.equal(media, "(min-width: 700px)");
      return {matches:width >= 700};
    },
    getComputedStyle: () => ({
      paddingLeft:"18px",paddingRight:"18px",paddingTop:"52px"
    })
  };
  const sandbox={
    window,document:doc,Math,Array,
    renderZooTodoTutorialHtml: n => { measuredPages.push(n); return `<mock-${n}></mock-${n}>`; }
  };
  vm.createContext(sandbox);
  vm.runInContext(fn + "\nthis.equalize = equalizeZooTodoTutorialClipboardPages;",sandbox);
  sandbox.equalize(rootEl);
  return {styles,measured,appended,removed,measuredPages};
}
for(const width of [768, 1024, 1180]) {
  const test = equalizeInFakeViewport({width,page:1});
  assert.equal(test.styles["--todo-tutorial-note-min-height"],undefined,
    "iPad welcome must not inherit long page-2/3 clipboard height");
  assert.equal(test.appended,0,"iPad short welcome needs no temporary measuring DOM");
}
for(const width of [320, 375, 390, 428]) {
  const test = equalizeInFakeViewport({width,page:1});
  assert.equal(test.styles["--todo-tutorial-note-min-height"],"365px",
    "existing narrow/typical iPhone tutorial height behavior is preserved");
  assert.equal(test.appended,1);
  assert.equal(test.removed,1);
}
for(const page of [2,3]) {
  const test = equalizeInFakeViewport({width:834,page});
  assert.equal(test.styles["--todo-tutorial-note-min-height"],"365px",
    "later tutorial pages retain stable clipboard height across transitions");
  assert.equal(test.appended,1);
  assert.equal(test.removed,1);
}
const page4 = equalizeInFakeViewport({width:834,page:4});
assert.equal(page4.appended,0);
assert.equal(page4.styles["--todo-tutorial-note-min-height"],undefined,
  "page four never uses page-1/2/3 equalization");
assert.match(css,/\.todo-dev-screen\s*\{[^}]*overflow-y:\s*auto/s,
  "the clipboard parent continues to scroll vertically when content is long");
assert.match(css,/-webkit-overflow-scrolling:\s*touch/);
assert.match(css,/\.todo-dev-page\s*\{[^}]*min-height:\s*100%/s);
assert.match(css,/\.todo-dev-paper\s*\{[^}]*min-height:\s*420px/s,
  "paper retains minimum size instead of collapsing on short content");

// The three numbered entries on page 2 must wrap normally, but balanced
// paragraph wrapping and page content itself remain unchanged.
const pageTwo = app.slice(app.indexOf('if (pageNumber === 2) {'),
  app.indexOf('if (pageNumber === 3) {'));
for(const sentence of [
  "Learn a new verse.",
  "Play a practice game to unlock a new pet.",
  "Keep practicing that verse to keep your new pet healthy and happy."
]) assert.ok(pageTwo.includes(sentence), sentence);
assert.match(pageTwo,/<ol>[\s\S]*<li>Learn a new verse.<\/li>[\s\S]*<\/ol>/);
assert.match(css,/\.todo-tutorial-body\s*\{[^}]*text-wrap:\s*balance/s,
  "tutorial prose still has balanced wrapping");
assert.match(css,/\.todo-tutorial-note\[data-tutorial-page="2"\] \.todo-tutorial-body li\s*\{[^}]*text-wrap:\s*wrap/s);

// A pet still reveals, with its original actions and focus wiring; the
// care sentence is *after* Keep Practicing (or Back to Mission) in DOM order.
const unlock = app.slice(app.indexOf("function screenPetUnlock(idx) {"),
  app.indexOf("  const boxBtn = wrap.querySelector",app.indexOf("function screenPetUnlock(idx) {")));
const reveal = unlock.slice(unlock.indexOf('class="pet-unlock-reveal-phase"'));
const actionsAt = reveal.indexOf('class="celebration-actions pet-unlock-reveal-actions"');
const practiceAt = reveal.indexOf('id="btnPetUnlockPractice"');
const missionAt = reveal.indexOf('id="btnPetUnlockHome"');
const careAt = reveal.indexOf('class="pet-unlock-care-text"');
assert.ok(actionsAt>=0 && practiceAt>actionsAt && missionAt>actionsAt &&
  careAt>practiceAt && careAt>missionAt,
  "all unlock branches retain action button(s) above the care message");
assert.match(unlock, /Practice \$\{verseRef\} to keep \$\{petName\} happy\./);
assert.match(css,/\.pet-unlock-care-text\s*\{[^}]*max-width:\s*100%/s,
  "moved care message fits narrow phone");
assert.match(unlock,/class="pet-unlock-reveal-phase" aria-live="polite"/);
assert.match(app,/const btnPractice = wrap.querySelector\("#btnPetUnlockPractice"\)/);
assert.match(app,/const btnHome = wrap.querySelector\("#btnPetUnlockHome"\)/);

// Original profile picture comes from the real per-verse getter. Only Daily
// To-Do wrapper/photo image loses circular crop and object-fit cover; global
// avatar and other app screens are unchanged.
assert.match(app,/petVisualHtml: dailyVerseId[\s\S]*?profilePictureVisualHtml\([\s\S]*?className:\s*"daily-zoo-todo-profile-picture"/);
assert.match(profileCss,/\.profile-picture-img\s*\{[^}]*object-fit:\s*cover/s,
  "the global profile component remains untouched");
const pStart = dailyCss.indexOf(".todo-dev-screen.is-daily-mode\n  .daily-zoo-todo-profile-picture {");
const imgStart = dailyCss.indexOf(".todo-dev-screen.is-daily-mode\n  .daily-zoo-todo-profile-picture .profile-picture-img {");
assert.ok(pStart>=0 && imgStart>pStart, "crop override scoped to Daily To-Do");
const picBlock = dailyCss.slice(pStart,dailyCss.indexOf("}",pStart)+1);
const imgBlock = dailyCss.slice(imgStart,dailyCss.indexOf("}",imgStart)+1);
for(const rule of ["border-radius: 0","overflow: visible","background: transparent"])
  assert.ok(picBlock.includes(rule), "Daily profile wrapper needs "+rule);
assert.match(imgBlock,/object-fit:\s*contain/);
assert.match(dailyCss,/\.daily-zoo-todo-pet\s+\.daily-zoo-todo-profile-picture\s*\{[^}]*width:\s*100%/s);
assert.match(dailyCss,/\.daily-completion-pet\s+\.daily-zoo-todo-profile-picture\s*\{[^}]*width:\s*100%/s);

// Sound Sequence color is data-driven; don't repaint all Listen cards.
const soundCard = app.split('\n').find(line => line.includes('id: "chunk_sequence"'));
assert.ok(soundCard,"Sound Sequence card present");
assert.match(soundCard,/title: "Sound Sequence"/);
assert.match(soundCard,/cardColor: "#ff5a51"/);
assert.match(soundCard,/cardTextColor: "#ffffff"/);
const fishCard = app.split('\n').find(line => line.includes('id: "fish", title: "Fish"'));
assert.match(fishCard,/cardTextColor: "#0d454b"/,
  "other Listen activity card theme colors remain unchanged");
console.log("IP03 tablet welcome fit, iPhone preservation, list, unlock, uncropped Daily avatar and Listen card PASS");
