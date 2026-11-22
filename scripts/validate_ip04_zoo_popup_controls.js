#!/usr/bin/env node
"use strict";
/* IP04 owner follow-up. Exercise ONE real exit node and the exact two
 * visible Zoo Break instruction lines, rather than only checking hidden
 * attributes on two different buttons or a non-binding CSS balance hint. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const engine = read("verse_games/shared/welcome-back-zoo-escape.js");
const css = read("verse_games/shared/welcome-back.css");
const feedingCss = read("daily_questions_feed_game.css");
const app = read("app.js");

const startIcon = app.indexOf("const SVG_HOME =");
const endIcon = app.indexOf("const SVG_FORWARD =", startIcon);
assert.ok(startIcon > 0 && endIcon > startIcon);
const iconPath = app.slice(startIcon, endIcon).match(/d="([^"]+)"/)?.[1];
assert.ok(iconPath && engine.includes(iconPath), "same white Home art as app.js");
assert.doesNotMatch(engine, /Opening the gate/i);
assert.doesNotMatch(engine, /const homeButton\s*=/,
  "no duplicate Home node may diverge from a still-visible Back");
assert.match(engine, /exitButton\.className\s*=\s*"bz-zoo-home no-zoom"/);
assert.match(engine, /exitButton\.className\s*=\s*"bz-zoo-exit no-zoom"/);
assert.match(engine, /overlay\.setAttribute\("data-zoo-stage", next\)/);
assert.match(css, /\.bz-zoo-instruction-balanced \.bz-zoo-instruction-line\s*\{[^}]*display:\s*block/s);
assert.match(css, /\.bz-zoo-instruction-balanced \.bz-zoo-instruction-line\s*\{[^}]*overflow-wrap:\s*anywhere/s);
assert.match(css, /\.bz-zoo-escape \.bz-welcome-action-slot\.bz-zoo-balanced-hint,\s*\.bz-zoo-escape \.bz-welcome-action-slot\.bz-zoo-balanced-hint \.bz-zoo-action-slot\s*\{[^}]*height:\s*auto/s);
assert.match(css, /\.bz-zoo-action-slot \.bz-welcome-action\.bz-zoo-lock-processing\s*\{[^}]*width:\s*100%;[^}]*display:\s*grid;[^}]*place-items:\s*center/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*12/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*safe-area-inset-top/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*safe-area-inset-left/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*background:\s*#333333;[^}]*color:\s*#ffffff/s);
assert.match(css, /\.bz-zoo-home:focus-visible\s*\{/);
assert.match(css, /\.bz-zoo-home\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
assert.match(feedingCss, /\.daily-feed-resume-overlay\[data-zoo-stage="break"\] \.daily-feed-resume-back\s*\{[^}]*display:\s*none\s*!important/s,
  "Feeding's independent arrow is not a duplicate exit during Zoo Break");
assert.match(feedingCss, /\.daily-feed-resume-overlay \.bz-zoo-exit\s*\{[^}]*display:\s*none\s*!important/s,
  "Feeding still keeps its own safe Back when not in Zoo Break");

const fixture = read("scripts/validate_patch72_1a_zoo_escape.js");
const from = fixture.indexOf("function harness(");
const to = fixture.indexOf("\nasync function run(){", from);
assert.ok(from > 0 && to > from);
const original = fixture.slice(from, to);
const enhanced = original.replace(
  'getAttribute(n){return this.attrs[n]||"";}',
  'getAttribute(n){return this.attrs[n]||"";}\n    removeAttribute(n){delete this.attrs[n];}'
);
assert.notEqual(enhanced, original, "fake DOM supports native aria attribute cleanup");
const harness = new Function("engine", "vm", "assert", "URL", "console",
  "let checks=0;\n" + enhanced + "\nreturn harness;")(engine, vm, assert, URL, console);
const visibleExit = h => {
  const links = [...h.overlay.children, ...h.card.children].filter(n =>
    n.className === "bz-zoo-home no-zoom" ||
    n.className === "bz-zoo-exit no-zoom");
  assert.equal(links.length, 1, "ONE exit DOM element in this popup, never two");
  return links[0];
};
const home = h => h.overlay.children.find(n => n.className === "bz-zoo-home no-zoom");
const bottom = h => h.card.children.find(n => n.className === "bz-zoo-exit no-zoom");
const instruction = h => h.button.parentNode.children.find(n => n.className.startsWith("bz-zoo-instruction"));
function assertLock(h, busy) {
  assert.equal(h.button.children.length, busy ? 1 : 2);
  assert.equal(h.button.children[0].tagName, "img");
  assert.equal(h.button.children[0].className, "bz-zoo-lock-icon");
  assert.ok(h.button.children[0].src.endsWith("zoobreak_lock.png"));
  assert.equal(h.button.classList.contains("bz-zoo-lock-processing"), busy);
  assert.equal(h.button.getAttribute("aria-busy"), busy ? "true" : "");
  assert.equal(h.button.getAttribute("aria-label"), busy ? "Locking the gate" : "Lock Gate");
}
function assertBreak(h, oldExit) {
  assert.equal(h.ctl.getStage(), "break");
  assert.equal(h.overlay.getAttribute("data-zoo-stage"), "break");
  assert.equal(visibleExit(h), oldExit, "same exit button is reparented, not duplicated");
  assert.equal(bottom(h), undefined, "no bottom Back element AT ALL during Zoo Break");
  assert.equal(home(h), oldExit, "same button becomes Home at overlay top-left");
  assert.equal(oldExit.hidden, false);
  assert.ok(oldExit.innerHTML.includes(iconPath), "real white app Home SVG is in the visible button");
  assert.equal(oldExit.getAttribute("aria-label"), "Back to Zoo");
  assert.equal(oldExit.listeners.click.length, 1, "only one exit navigation listener");
  assert.ok(h.overlay.children.indexOf(oldExit) < h.overlay.children.indexOf(h.card),
    "top-left Home comes before popup in focus order");
  const text = instruction(h);
  assert.equal(text.className, "bz-zoo-instruction bz-zoo-instruction-balanced");
  assert.equal(h.button.parentNode.parentNode.classList.contains("bz-zoo-balanced-hint"), !text.hidden,
    "two-line hint gets natural height only while visible; LOCK GATE restores old height");
  assert.equal(text.getAttribute("aria-label"), "Drag pets to the pen!");
  assert.deepEqual(text.children.map(n => n.textContent), ["Drag pets ", "to the pen!"],
    "explicit balanced lines remain two lines even when iPad has ample width");
  assert.deepEqual(text.children.map(n => n.className),
    ["bz-zoo-instruction-line", "bz-zoo-instruction-line"]);
}

async function main() {
  const h = harness([false, false, { deferred: true }], { reduced: true });
  h.ctl.start();
  const exit = visibleExit(h);
  assert.equal(exit, bottom(h));
  assert.equal(exit.hidden, true);
  assert.equal(home(h), undefined);
  h.button.trigger("click");
  await Promise.resolve();
  assert.equal(h.ctl.getStage(), "escape");
  assert.equal(h.overlay.getAttribute("data-zoo-stage"), "escape");
  assert.equal(visibleExit(h), exit);
  assert.equal(bottom(h), exit);
  assert.equal(exit.textContent, "Back to Zoo");
  assert.equal(exit.hidden, false, "single pet still has its safe bottom exit");
  assert.equal(home(h), undefined);
  assert.equal(instruction(h).textContent, "Drag the pet to the pen!");
  assert.equal(instruction(h).children.length, 0);
  h.advance(1200);
  h.rescueFirst();
  assertLock(h, false);
  assert.equal(h.button.parentNode.parentNode.classList.contains("bz-zoo-balanced-hint"), false,
    "normal single-pet LOCK GATE keeps ordinary action height");
  h.button.trigger("click");
  assertLock(h, true);
  assert.equal(h.recovery.length, 2);
  await Promise.resolve();
  assertBreak(h, exit);

  const count = h.ctl.getState().total;
  assert.ok(count >= 6 && count <= 10);
  h.advance(14000);
  for (let i = 0; i < count; i++) h.rescueFirst();
  assert.equal(h.ctl.getState().rescued, count);
  assertLock(h, false);
  assert.equal(h.button.parentNode.parentNode.classList.contains("bz-zoo-balanced-hint"), false,
    "extra two-line height releases for LOCK GATE");
  assertBreak(h, exit);
  h.button.trigger("click");
  assertLock(h, true);
  assert.equal(h.button.disabled, true);
  assertBreak(h, exit);
  assert.equal(h.recovery.length, 3);
  await Promise.resolve(); // native audio defers: never fake a successful resume
  assertLock(h, false);
  assert.equal(h.button.disabled, false);
  assertBreak(h, exit);
  home(h).trigger("click");
  assert.equal(h.ctl.getStage(), "exiting");
  assert.equal(h.fired.filter(x => x.exit).length, 1);
  assert.equal(h.fired.filter(x => x === "recovered").length, 0);
  h.advance(9000);
  assert.equal(h.fired.filter(x => x.exit).length, 1, "no duplicate exit on watchdog");
  h.ctl.destroy();
  assert.equal(exit.parentNode, null, "destroy removes only exit button");

  const direct = harness([], { reduced: true });
  direct.ctl.start();
  const directExit = visibleExit(direct);
  assert.equal(direct.ctl.startSurprise("break"), true);
  assertBreak(direct, directExit);
  directExit.trigger("click");
  assert.equal(direct.fired.filter(x => x.exit).length, 1);
  assert.equal(direct.fired.filter(x => x.rescue || x.break).length, 0,
    "Home during an unfinished Zoo Break must never award credit");
  assert.equal(direct.recovery.length, 0);
  direct.ctl.destroy();

  const denied = harness([false], { reduced: true });
  denied.ctl.start();
  denied.button.trigger("click"); await Promise.resolve();
  assert.equal(denied.ctl.getStage(), "escape");
  assert.equal(home(denied), undefined);
  assert.equal(bottom(denied).hidden, false);
  bottom(denied).trigger("click");
  assert.equal(denied.fired.filter(x => x.exit).length, 1);
  denied.ctl.destroy();

  const completed = harness([], { reduced: true });
  completed.ctl.start();
  const completedExit = visibleExit(completed);
  completed.ctl.startSurprise("break");
  assertBreak(completed, completedExit);
  const total = completed.ctl.getState().total;
  completed.advance(14000);
  for (let i = 0; i < total; i++) completed.rescueFirst();
  assert.equal(completed.fired.filter(x => x.break).length, 1);
  completed.button.trigger("click");
  assertLock(completed, true);
  assert.equal(completed.fired.filter(x => x === "recovered").length, 1);
  assert.equal(completed.recovery.length, 0);
  completed.button.trigger("click");
  assert.equal(completed.fired.filter(x => x === "recovered").length, 1,
    "successful Break completion is exactly once");
  completed.ctl.destroy();

  console.log("IP04 follow-up PASS: actual two balanced lines, exactly one relocated Home/Back button, Feeding host Back suppression, accessible lock/exit, native deferred retry and safe no-credit exit");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
