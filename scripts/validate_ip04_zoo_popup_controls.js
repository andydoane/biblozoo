#!/usr/bin/env node
"use strict";
// IP04 actual Zoo controller in the existing DOM/timer fixture.
// Real iPad/iPhone acceptance remains separate.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const engine = read("verse_games/shared/welcome-back-zoo-escape.js");
const css = read("verse_games/shared/welcome-back.css");
const app = read("app.js");

const homeStart = app.indexOf("const SVG_HOME =");
const homeEnd = app.indexOf("const SVG_FORWARD =", homeStart);
assert.ok(homeStart > 0 && homeEnd > homeStart);
const originalHome = app.slice(homeStart, homeEnd);
const iconPath = originalHome.match(/d="([^"]+)"/)?.[1];
assert.ok(iconPath && engine.includes(iconPath), "same Home glyph as app.js");
assert.doesNotMatch(engine, /Opening the gate/i);
assert.match(css, /\.bz-zoo-instruction\.bz-zoo-instruction-balanced\s*\{[^}]*text-wrap:\s*balance/s);
assert.match(css, /\.bz-zoo-action-slot \.bz-welcome-action\.bz-zoo-lock-processing\s*\{[^}]*width:\s*100%;[^}]*display:\s*grid;[^}]*place-items:\s*center/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*12/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*safe-area-inset-top/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*safe-area-inset-left/s);
assert.match(css, /\.bz-zoo-home\s*\{[^}]*background:\s*#333333;[^}]*color:\s*#ffffff/s);
assert.match(css, /\.bz-zoo-home:focus-visible\s*\{/);
assert.match(css, /\.bz-zoo-home\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);

const source = read("scripts/validate_patch72_1a_zoo_escape.js");
const from = source.indexOf("function harness(");
const to = source.indexOf("\nasync function run(){", from);
assert.ok(from > 0 && to > from);
const fixture = source.slice(from, to);
// Extend only the fake DOM's attribute support; real WebKit has this API.
const enhanced = fixture.replace(
  'getAttribute(n){return this.attrs[n]||"";}',
  'getAttribute(n){return this.attrs[n]||"";}\n    removeAttribute(n){delete this.attrs[n];}'
);
assert.notEqual(enhanced, fixture, "test fake DOM attribute support");
const harness = new Function("engine", "vm", "assert", "URL", "console",
  "let checks=0;\n" + enhanced + "\nreturn harness;")(engine, vm, assert, URL, console);
const home = h => h.overlay.children.find(n => n.className === "bz-zoo-home no-zoom");
const bottom = h => h.card.children.find(n => n.className === "bz-zoo-exit no-zoom");
const instruction = h => h.button.parentNode.children.find(n => n.className === "bz-zoo-instruction");
function assertLock(h, busy) {
  assert.equal(h.button.children.length, busy ? 1 : 2);
  assert.equal(h.button.children[0].tagName, "img");
  assert.equal(h.button.children[0].className, "bz-zoo-lock-icon");
  assert.ok(h.button.children[0].src.endsWith("zoobreak_lock.png"));
  assert.equal(h.button.classList.contains("bz-zoo-lock-processing"), busy);
  assert.equal(h.button.getAttribute("aria-busy"), busy ? "true" : "");
  assert.equal(h.button.getAttribute("aria-label"), busy ? "Locking the gate" : "Lock Gate");
}

async function main() {
  // Initial / escape stages keep the original bottom safe-exit.
  const h = harness([false, false, { deferred: true }], { reduced: true });
  h.ctl.start();
  assert.equal(home(h).hidden, true);
  assert.equal(bottom(h).hidden, true);
  assert.equal(home(h).getAttribute("aria-label"), "Back to Zoo");
  assert.ok(home(h).innerHTML.includes(iconPath));
  h.button.trigger("click"); await Promise.resolve();
  assert.equal(h.ctl.getStage(), "escape");
  assert.equal(home(h).hidden, true);
  assert.equal(bottom(h).hidden, false);
  assert.equal(instruction(h).classList.contains("bz-zoo-instruction-balanced"), false);
  h.advance(1200); h.rescueFirst(); assertLock(h, false);
  h.button.trigger("click");
  assertLock(h, true); // immediate, before real owner recovery settles
  assert.equal(h.recovery.length, 2);
  await Promise.resolve();
  assert.equal(h.ctl.getStage(), "break");
  assert.equal(home(h).hidden, false);
  assert.equal(bottom(h).hidden, true);
  assert.equal(instruction(h).textContent, "Drag pets to the pen!");
  assert.ok(instruction(h).classList.contains("bz-zoo-instruction-balanced"));

  const count = h.ctl.getState().total;
  assert.ok(count >= 6 && count <= 10);
  h.advance(14000);
  for (let i = 0; i < count; i++) h.rescueFirst();
  assert.equal(h.ctl.getState().rescued, count);
  assertLock(h, false);
  h.button.trigger("click");
  assertLock(h, true);
  assert.equal(h.button.disabled, true);
  assert.equal(home(h).hidden, false, "safe exit while native audio is pending");
  assert.equal(bottom(h).hidden, true);
  assert.equal(h.recovery.length, 3);
  await Promise.resolve(); // native audio defers: never count as success
  assert.equal(h.ctl.getStage(), "break");
  assertLock(h, false);
  assert.equal(h.button.disabled, false);
  assert.equal(home(h).hidden, false);
  home(h).trigger("click");
  assert.equal(h.ctl.getStage(), "exiting");
  assert.equal(h.fired.filter(x => x.exit).length, 1);
  assert.equal(h.fired.filter(x => x === "recovered").length, 0);
  h.advance(9000);
  assert.equal(h.fired.filter(x => x.exit).length, 1);
  const oldHome = home(h);
  h.ctl.destroy();
  assert.equal(oldHome.parentNode, null, "destroy cleans new Home control");

  // Abandoning a direct random Zoo Break cannot fabricate rescue or sound.
  const direct = harness([], { reduced: true });
  direct.ctl.start();
  assert.equal(direct.ctl.startSurprise("break"), true);
  assert.equal(home(direct).hidden, false);
  assert.equal(bottom(direct).hidden, true);
  home(direct).trigger("click");
  assert.equal(direct.fired.filter(x => x.exit).length, 1);
  assert.equal(direct.fired.filter(x => x.rescue || x.break).length, 0);
  assert.equal(direct.recovery.length, 0);
  direct.ctl.destroy();

  // Denied sound still has the original bottom Back action.
  const denied = harness([false], { reduced: true });
  denied.ctl.start();
  denied.button.trigger("click"); await Promise.resolve();
  assert.equal(denied.ctl.getStage(), "escape");
  assert.equal(home(denied).hidden, true);
  assert.equal(bottom(denied).hidden, false);
  bottom(denied).trigger("click");
  assert.equal(denied.fired.filter(x => x.exit).length, 1);
  denied.ctl.destroy();

  // A full Zoo Break retains one award and one completion callback.
  const completed = harness([], { reduced: true });
  completed.ctl.start();
  completed.ctl.startSurprise("break");
  const total = completed.ctl.getState().total;
  completed.advance(14000);
  for (let i = 0; i < total; i++) completed.rescueFirst();
  assert.equal(completed.fired.filter(x => x.break).length, 1);
  completed.button.trigger("click"); assertLock(completed, true);
  assert.equal(completed.fired.filter(x => x === "recovered").length, 1);
  assert.equal(completed.recovery.length, 0);
  completed.button.trigger("click");
  assert.equal(completed.fired.filter(x => x === "recovered").length, 1);
  completed.ctl.destroy();
  console.log("IP04 balanced Zoo instruction, image-only lock, safe Home, native deferral, rescue credits and cleanup PASS");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
