"use strict";
// IP03 iPad-first contracts and owner-requested all-four-page clipboard fit.
// Node checks do not replace real iPad/iPhone screenshots or Apple SDK build.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const app = read("app.js");
const css = read("styles.css");
const dailyCss = read("daily_zoo_todo.css");
const profileCss = read("profiles.css");

function cssRule(selector) {
  const start = css.lastIndexOf(selector + " {");
  assert.ok(start >= 0, "expected CSS rule " + selector);
  const end = css.indexOf("}", start);
  assert.ok(end > start, "expected closing brace for " + selector);
  return css.slice(start, end + 1);
}

// Pages 1–4 share the first-time screen; page 4 is the post-Learn screen.
// The board's viewport height is a MINIMUM; never clip overflowing content.
const tutorialStart = app.indexOf("function renderZooTodoTutorialHtml(");
const tutorialEnd = app.indexOf("function playZooTodoTutorialPageAudio(", tutorialStart);
assert.ok(tutorialStart > 0 && tutorialEnd > tutorialStart);
const tutorialMarkup = app.slice(tutorialStart, tutorialEnd);
for (const page of [1, 2, 3, 4]) {
  assert.ok(tutorialMarkup.includes('data-tutorial-page="' + page + '"'),
    "all four tutorial pages keep the same viewport-fitting clipboard");
}
assert.match(app, /wrap\.classList\.add\("is-tutorial-mode"\)/,
  "all tutorial steps, including post-Learn page 4, use scoped layout");
assert.doesNotMatch(app, /equalizeZooTodoTutorialClipboardPages/,
  "retire page-2/3 measurement and special tablet/phone height logic");
assert.doesNotMatch(css, /--todo-tutorial-note-min-height|\.todo-tutorial-measure/,
  "retire measured per-page minimums");
const pageLayout = cssRule(".todo-dev-screen.is-tutorial-mode .todo-dev-page");
const boardLayout = cssRule(".todo-dev-screen.is-tutorial-mode .todo-dev-clipboard");
const paperLayout = cssRule(".todo-dev-screen.is-tutorial-mode .todo-dev-paper");
assert.match(pageLayout, /--tutorial-clipboard-page-top:\s*calc\(34px \+ var\(--safeT\)\)/);
assert.match(pageLayout, /--tutorial-clipboard-page-bottom:\s*calc\(24px \+ var\(--safeB\)\)/);
assert.match(pageLayout, /--tutorial-clipboard-board-top:\s*clamp\(28px, 6vw, 54px\)/);
assert.match(pageLayout, /padding-top:\s*var\(--tutorial-clipboard-page-top\)/);
assert.match(pageLayout, /padding-bottom:\s*var\(--tutorial-clipboard-page-bottom\)/);
assert.match(boardLayout, /margin-top:\s*var\(--tutorial-clipboard-board-top\)/);
assert.match(boardLayout, /min-height:\s*calc\(/);
for (const term of [
  "var(--appH)", "var(--tutorial-clipboard-page-top)",
  "var(--tutorial-clipboard-page-bottom)", "var(--tutorial-clipboard-board-top)"
]) assert.ok(boardLayout.includes(term), "viewport subtraction needs " + term);
assert.match(boardLayout, /display:\s*flex/);
assert.match(boardLayout, /flex-direction:\s*column/);
assert.match(paperLayout, /flex:\s*1 1 auto/,
  "the white sheet stretches with the brown board");
assert.ok(!boardLayout.includes("max-height:") && !boardLayout.includes("overflow: hidden") &&
  !boardLayout.includes("\n  height:"),
  "board may grow for long content instead of clipping");
assert.match(css, /\.todo-dev-screen\s*\{[^}]*overflow-y:\s*auto/s,
  "the screen remains vertically scrollable for overflowing iPhone content");
assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
assert.match(css, /\.todo-dev-page\s*\{[^}]*min-height:\s*100%/s);
assert.match(css, /\.todo-dev-paper\s*\{[^}]*min-height:\s*420px/s,
  "short screens retain the existing natural paper minimum");
assert.match(app, /if \(tutorialActive\) \{\s*wrap\.classList\.add\("is-tutorial-mode"\)/);
assert.match(app, /if \(tutorial\.step === TUTORIAL_STEPS\.LEARN_DONE\) \{\s*return 4/);

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
console.log("IP03 all-four-page viewport clipboard fit/scroll contracts, list, unlock, Daily avatar and Listen card PASS");
