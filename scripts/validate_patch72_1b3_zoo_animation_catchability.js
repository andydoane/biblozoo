#!/usr/bin/env node
"use strict";
/* Patch 72.1B.3: protect browser-visible Zoo Escape animations, initial
 * boundary checks, generous transparent hit region and unchanged recovery.
 * Updated in 72.1B.4 to reflect intentional firework removal. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const css = read("verse_games/shared/welcome-back.css");
const source = read("verse_games/shared/welcome-back-zoo-escape.js");
const feedingCss = read("daily_questions_feed_game.css");
const feedingJs = read("daily_questions_feed_game.js");
const worker = read("service-worker.js");
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function eq(a,b,message) { assert.equal(a,b,message); checks++; }
function has(source, tokens, prefix) {
  for (const token of tokens) ok(source.includes(token), `${prefix}: ${token}`);
}

// Regression cause: the game deliberately pauses all descendant CSS animations.
// If the recovery overlay doesn't override that rule, the GROOVY splash and
// Food Slice fireworks stay permanently at opacity 0.
ok(feedingCss.includes('.daily-feed-game.is-interruption-paused *'),
  "Feeding background animation freeze retained");
ok(feedingCss.includes('animation-play-state: paused !important;'),
  "Feeding background animation freeze remains enforced");
has(css, [
  '.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-escape .bz-zoo-effects *',
  '.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-escape .bz-zoo-active.bz-zoo-shake-escape',
  '.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-escape .bz-zoo-active.bz-zoo-shake-break',
  'animation-play-state: running !important;',
  '.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-backgrounded .bz-zoo-effects *',
  '.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-backgrounded .bz-zoo-active',
  '@keyframes bzZooGroovy', '@keyframes bzZooShakeBreak'
], "Paused-game foreground animation override");
const overrideIndex = css.indexOf('.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-escape .bz-zoo-effects *');
const backgroundIndex = css.indexOf('.daily-feed-game.is-interruption-paused .daily-feed-resume-overlay.bz-zoo-backgrounded .bz-zoo-effects *');
ok(overrideIndex > 0 && backgroundIndex > overrideIndex,
  "Hidden-background pause takes precedence over foreground animation override");
has(source, ['overlay.classList.toggle("bz-zoo-backgrounded", !!doc.hidden)',
  'overlay.classList.remove("bz-zoo-escape", "bz-zoo-fade-black", "bz-zoo-backgrounded")'],
"Visibility cleanup");

// Stage 3 retains Verse Jam's announcement, without fireworks.
ok(!css.includes('bz-zoo-firework'), 'Retired firework CSS fully absent');
ok(!source.includes('spawnFoodSliceFirework'), 'Retired firework generator fully absent');
has(css, [
  'inset 0 -8px 0 rgba(0,0,0,.12)',
  'linear-gradient(90deg,#ff7ad9',
  'letter-spacing: .02em;',
  'font: 400 clamp(26px, 8vw, 60px)/.9 "Titan One"',
  '@keyframes bzZooShakeEscape', '@keyframes bzZooShakeBreak',
  '.bz-zoo-shake-escape {', '.bz-zoo-shake-break {',
  '.bz-zoo-break-anchor {', '.bz-zoo-break-shake {',
  '.bz-zoo-break-splash {', 'z-index: 30;',
  '.bz-zoo-effects {', 'pointer-events: none;'
], "Visible announcement and shakes");
has(source, [
  'anchor.style.left = `${center.x}px`',
  'anchor.style.top = `${center.y}px`',
  'shakeCard("escape")', 'shakeCard("break")',
  'card.classList.add(cls)',
  'card.classList.remove("bz-zoo-shake-escape", "bz-zoo-shake-break")',
  'announceZooBreak()', 'splash.textContent = "ZOO BREAK!"'
], "Over-pen announcement, centered shake and card motion");

// Geometry: both the first scaling frame and later frames clamp to full-size
// safe boundaries, leaving space for the 16-pixel touch halo.
has(source, [
  'size, edge: 28',
  'function advanceAndBounce(p, b, delta)',
  'const maxX = Math.max(b.edge, b.width - p.size - b.edge)',
  'const maxY = Math.max(b.edge, b.height - p.size - b.edge)',
  'advanceAndBounce(p, b, delta);',
  'pet.x = Math.max(b.edge, Math.min(maxX, pet.x))',
  'pet.y = Math.max(b.edge, Math.min(maxY, pet.y))',
  'const ratio = Math.min(1, (Date.now() - p.born) / EMERGE_MS)',
  'p.node.disabled = false;',
  'p.node.classList.add("bz-zoo-catchable")'
], "Emergence uses full-size collision boundaries");
eq(source.split('advanceAndBounce(p, b, delta);').length-1,2,
  "Both emerging and fully grown pets use bounded movement");
has(css, [
  '.bz-zoo-pet::before {', 'inset: -16px;', 'background: transparent;',
  'pointer-events: auto;', 'touch-action: none;',
  '.bz-zoo-pet img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }'
], "Invisible full-rectangle plus extended drag hit area");
const tileRule = css.match(/\.bz-zoo-pet \{([\s\S]*?)\}/)?.[1] || "";
has(tileRule, ['background: transparent;', 'border: 0;', 'box-shadow: none;', 'overflow: visible;'],
  "No visual pet border added by touch halo");

// No expanded recovery attempts or native audio-session changes in this patch.
const apiRoot = {window: {}};
vm.runInNewContext(source, apiRoot, {filename: "welcome-back-zoo-escape.js"});
const api = apiRoot.window.BibloZooZooEscape;
eq(api.MAX_ATTEMPTS, 3, "Still at most three recovery gestures");
eq(api.EMERGE_MS, 750, "Same protected emergence duration");
eq(api.SPAWN_MS, 1000, "Same one-second spawn staggering");
eq(api.MIN_PETS, 6, "Same minimum Zoo Break animal count");
eq(api.MAX_PETS, 10, "Same maximum Zoo Break animal count");
for (const stage of ['welcome','escape','break']) {
  eq(api.nextStage(stage, true),'recovered',`${stage}: verified recovery resumes`);
  eq(api.nextStage(stage, false), {welcome:'escape',escape:'break',break:'exit'}[stage],
    `${stage}: failed gesture advances or exits`);
}
ok(!source.includes('new AudioContext(') && !source.includes('setCategory('),
  "Zoo Escape cannot change native or Web Audio session policy");
ok(feedingJs.includes('attemptFeedingResumeFromGesture'),
  "Feeding retains its own real recovery verifier");
ok(/const CACHE_VERSION = "2026_[^"]*patch72_1/.test(worker),
  "Cache revision invalidates old animation JS and CSS");
for (const resource of ['verse_games/shared/welcome-back.css',
    'verse_games/shared/welcome-back-zoo-escape.js']) {
  ok(worker.includes(`"./${resource}"`), `New visual assets in offline precache: ${resource}`);
}
ok(css.includes('@media (prefers-reduced-motion: reduce)') &&
    css.includes('.bz-zoo-shake-escape, .bz-zoo-shake-break, .bz-zoo-break-shake,') &&
    css.includes('.bz-zoo-break-splash { opacity: 1; transform: none; }'),
  "Reduced-motion preferences suppress shake without hiding Zoo Break label");
console.log(`Patch 72.1B.3 Zoo Escape animation and catchability: ${checks} checks passed`);
