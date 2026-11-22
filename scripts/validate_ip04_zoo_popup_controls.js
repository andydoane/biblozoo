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
assert.doesNotMatch(engine, /exitButton\.className\s*=\s*"bz-zoo-exit no-zoom"/,
  "no old bottom text Back form can appear during welcome or escape");
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
assert.match(feedingCss, /\.daily-feed-resume-overlay\[data-zoo-stage\] \.daily-feed-resume-back\s*\{[^}]*display:\s*none\s*!important/s,
  "Feeding host Back hidden during every shared Welcome Back / Escape / Break stage");
assert.match(read("read_my_verse.css"), /\.read-audio-resume-overlay\[data-zoo-stage\] \.read-audio-overlay-back\s*\{[^}]*display:\s*none\s*!important/s,
  "Read My Verse's independent arrow hidden only under the shared controller");

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
function assertHome(h, exit, expectedStage) {
  assert.equal(h.ctl.getStage(), expectedStage);
  assert.equal(h.overlay.getAttribute("data-zoo-stage"), expectedStage);
  assert.equal(visibleExit(h), exit, "exactly the same Home for all three stages");
  assert.equal(bottom(h), undefined, "no bottom text Back, including Welcome");
  assert.equal(home(h), exit, "Home lives outside the card");
  assert.equal(exit.hidden, false, "top-left safe Home always visible");
  assert.ok(exit.innerHTML.includes(iconPath), "real app white Home path");
  assert.equal(exit.getAttribute("aria-label"), "Back to Zoo");
  assert.equal(exit.listeners.click.length, 1);
  assert.ok(h.overlay.children.indexOf(exit) < h.overlay.children.indexOf(h.card),
    "top-left Home first in focus order");
}
function assertBalancedHint(h, textValue, line1) {
  const hint=instruction(h);
  assert.equal(hint.className, "bz-zoo-instruction bz-zoo-instruction-balanced");
  assert.equal(h.button.parentNode.parentNode.classList.contains("bz-zoo-balanced-hint"), !hint.hidden,
    "both nested action slots expand only while instruction visible");
  assert.equal(hint.getAttribute("aria-label"), textValue);
  assert.deepEqual(hint.children.map(x=>x.textContent), [line1, "to the pen!"],
    "real two-line copy even on wide iPads");
  assert.deepEqual(hint.children.map(x=>x.className),
    ["bz-zoo-instruction-line", "bz-zoo-instruction-line"]);
}
function assertBreak(h, exit) {
  assertHome(h,exit,"break");
  assertBalancedHint(h,"Drag pets to the pen!","Drag pets ");
}

async function main() {
  const h = harness([false, false, { deferred: true }], { reduced: true });
  h.ctl.start();
  const exit = visibleExit(h);
  assertHome(h,exit,"welcome");
  h.button.trigger("click");
  assertHome(h,exit,"welcome"); // Home survives the user's real recovery tap
  await Promise.resolve();
  assertHome(h,exit,"escape");
  assertBalancedHint(h,"Drag the pet to the pen!","Drag the pet ");
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
  assertHome(direct,directExit,"welcome");
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
  assertHome(denied,home(denied),"escape");
  home(denied).trigger("click");
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

  console.log("IP04 follow-up PASS: permanently visible Home from Welcome through Escape/Break, two balanced hints, no text Back or host duplicates, original lock and deferred audio/credit safety");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
