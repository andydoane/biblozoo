#!/usr/bin/env node
"use strict";
/* Patch 72.1B.4: no fireworks, center-pivot card shakes, independent
 * GROOVY pop+shake on the Zoo Break label, and preserved recovery flow. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const base = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(base, p), "utf8");
const css = read("verse_games/shared/welcome-back.css");
const js = read("verse_games/shared/welcome-back-zoo-escape.js");
const feedingCss = read("daily_questions_feed_game.css");
const pilot = read("scripts/validate_patch72_1a_zoo_escape.js");
const sw = read("service-worker.js");
let checks = 0;
function ok(test, label) { assert.ok(test, label); checks++; }
function eq(actual, expected, label) { assert.equal(actual, expected, label); checks++; }
function has(src, tokens, label) { for(const token of tokens) ok(src.includes(token), `${label}: ${token}`); }

// Remove visuals and corresponding dead code, not just visibility-toggle them.
for(const bad of ["bz-zoo-firework", "bzZooFirework", "--fw-duration", "--fw-color"])
  ok(!css.includes(bad), `No firework CSS token ${bad}`);
for(const bad of ["spawnFoodSliceFirework", "FIREWORK_COLORS", "FIREWORK_DURATION_MS", "FIREWORK_GLOW", "function fireworks("])
  ok(!js.includes(bad), `No firework script token ${bad}`);

// Full card pivots around its exact geometric center, even if container CSS
// later adds a different default elsewhere. No top-left or corner anchor.
const cardStyle = css.match(/\.bz-zoo-escape \.bz-welcome-card \{([^}]+)\}/)?.[1] || "";
ok(cardStyle.includes("transform-origin: 50% 50%;"), "Welcome Back card explicitly pivots at center");
const shakeStyle = css.match(/\.bz-zoo-shake-escape,\s*\.bz-zoo-shake-break,\s*\.bz-zoo-break-shake \{([^}]+)\}/)?.[1] || "";
ok(shakeStyle.includes("transform-origin: center center;"), "Both card shaking states pivot at center");
has(css, [
  '.bz-zoo-break-anchor {', 'transform: translate(-50%, -50%);',
  '.bz-zoo-break-shake {', 'animation: bzZooShakeBreak 550ms ease-in-out both;',
  '.bz-zoo-break-splash {', 'animation: bzZooGroovy 1250ms',
  '@keyframes bzZooGroovy', '@keyframes bzZooShakeBreak',
  'inset 0 -8px 0 rgba(0,0,0,.12)', 'linear-gradient(90deg,#ff7ad9',
  'transform-origin: 50% 50%;'
], "Independent GROOVY shake/pop structure");
const splashCss=css.match(/\.bz-zoo-break-splash \{([^}]+)\}/)?.[1] || "";
ok(!splashCss.includes('position: absolute'), 'GROOVY label centered by anchor, not internal absolute offsets');
ok(!splashCss.includes('translate(-50%'), 'GROOVY scale does not alter anchor centering');
ok(css.includes('.bz-zoo-break-shake {\n  animation: bzZooShakeBreak 550ms'), 'GROOVY shake centered');

has(js, [
  'function announceZooBreak() {',
  'const center = penCenter();',
  'anchor.className = "bz-zoo-break-anchor";',
  'anchor.style.left = `${center.x}px`',
  'anchor.style.top = `${center.y}px`',
  'shake.className = "bz-zoo-break-shake";',
  'splash.className = "bz-zoo-break-splash";',
  'splash.textContent = "ZOO BREAK!";',
  'shake.appendChild(splash);', 'anchor.appendChild(shake);',
  'effects.appendChild(anchor);', 'laterEffect(() => anchor.remove(), 1300);',
  'shakeCard("escape");', 'shakeCard("break");',
  'announceZooBreak();'
], "Stage 3 draws shake and GROOVY with independent transforms");
ok(js.includes('className = "bz-zoo-poof"') || js.includes('className = "bz-zoo-poof";'), "Traffic Tap poof still present");
ok(feedingCss.includes('.daily-feed-game.is-interruption-paused *') &&
   feedingCss.includes('animation-play-state: paused !important;'),
   'Underlying Feeding round still pauses');
ok(css.includes('.daily-feed-resume-overlay.bz-zoo-escape .bz-zoo-effects *') &&
   css.includes('animation-play-state: running !important;'),
   'Stage 3 foreground animations still run with Feeding paused');
ok(css.includes('.daily-feed-resume-overlay.bz-zoo-backgrounded .bz-zoo-effects *') &&
   css.includes('animation-play-state: paused !important;'),
   'Task switching still freezes cosmetic splash');
ok(css.includes('.bz-zoo-break-splash { opacity: 1; transform: none; }') &&
   css.includes('.bz-zoo-break-shake {'),
   'Reduced-motion shows a static readable rainbow announcement');
ok(sw.includes('2026_Oct_27_patch72_1b5_centered_translation_shake'),
   'PWA cache bumped for new CSS and JS');
for (const p of ['verse_games/shared/welcome-back.css',
                 'verse_games/shared/welcome-back-zoo-escape.js'])
  ok(sw.includes(`"./${p}"`), `${p} included in SW cache`);

// Actual shared controller, real event handling, simulated DOM, not a stub.
const start = pilot.indexOf('function harness(');
const end = pilot.indexOf('\nasync function run()', start);
ok(start >= 0 && end > start, 'Original DOM pilot available');
const env = {engine:js, vm, assert, Math, Date, Promise, URL, console, checks:0};
const harness=vm.runInNewContext(`${pilot.slice(start,end)}\nharness`,env);
const effectsOf=h=>h.overlay.children.find(n=>n.className==="bz-zoo-effects")?.children||[];
(async ()=>{
  const h=harness([false,false,false]);
  ok(h.ctl.start(), 'Original Welcome Back still launches');
  h.button.trigger('click');await Promise.resolve();
  eq(h.ctl.getStage(),'escape','First failure triggers Pet Escape');
  ok(h.card.classList.contains('bz-zoo-shake-escape'),'Stage 2 card shake preserved');
  h.advance(1000);
  h.rescueFirst();
  h.button.trigger('click'); await Promise.resolve();
  eq(h.ctl.getStage(),'break','Second failure enters Zoo Break');
  ok(h.card.classList.contains('bz-zoo-shake-break'),'Stage 3 card shakes');
  ok(!effectsOf(h).some(n=>String(n.className).includes('firework')),
     'No fireworks nodes attached to DOM');
  const anchor = effectsOf(h).find(n=>n.className==='bz-zoo-break-anchor');
  ok(anchor,'GROOVY anchor attached');
  eq(anchor.style.left,'195px','GROOVY pen x anchor (synthetic DOM)');
  eq(anchor.style.top,'250px','GROOVY pen y anchor (synthetic DOM)');
  const shake=anchor.children[0];
  eq(shake?.className,'bz-zoo-break-shake','Announcement uses independent wobble');
  const splash=shake.children[0];
  eq(splash?.className,'bz-zoo-break-splash','Nested rainbow announcement visible');
  eq(splash?.textContent,'ZOO BREAK!','Correct title');
  ok(h.ctl.getState().total >= 6 && h.ctl.getState().total <= 10,
     '6-10 escaped animals still used');
  h.advance(1600);
  ok(!effectsOf(h).includes(anchor),'Announcement cleans up on schedule');
  h.ctl.destroy();
  console.log(`Patch 72.1B.4 centered Zoo Break shake: ${checks} checks passed`);
})().catch(err=>{console.error(err);process.exitCode=1;});
