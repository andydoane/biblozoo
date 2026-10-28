#!/usr/bin/env node
"use strict";
/* Patch 72.1B.2: verify authentic source-derived visual structures against
 * the shared engine's real DOM writes, with the original pilot VM harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = pathName => fs.readFileSync(path.join(root, pathName), "utf8");
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const engine = read("verse_games/shared/welcome-back-zoo-escape.js");
const css = read("verse_games/shared/welcome-back.css");
const trafficJS = read("verse_games/traffic_tap/game.js");
const trafficCSS = read("verse_games/traffic_tap/game.css");
const pilotJS = read("scripts/validate_patch72_1a_zoo_escape.js");
const sw = read("service-worker.js");

// Compare the actual SVG contents and original cloud keyframe timings.
const cloud = trafficJS.match(/const CRASH_CLOUD_SVG = `([\s\S]*?)`;/)?.[1];
ok(cloud && cloud.includes("<svg"), "Traffic Tap has vector cloud asset");
ok(engine.includes(`const CRASH_CLOUD_SVG = \`${cloud}\`;`), "Zoo Escape uses the exact Traffic Tap vector cloud");
ok(!engine.includes('cloud.textContent = "☁"'), "No literal cloud emoji");
ok(engine.includes('cloud.innerHTML = CRASH_CLOUD_SVG'), "SVG actually inserted in poof");
for (const selector of [".bz-zoo-poof-cloud svg", ".bz-zoo-poof-cloud path", ".bz-zoo-poof-dot.is-live", "@keyframes bzZooPoofCloudRipple"]) {
  ok(css.includes(selector), `Ported Traffic Tap selector: ${selector}`);
}
for (const part of ["10%{", "22%{", "48%{", "72%{"]) {
  ok(trafficCSS.includes(part) && css.includes(part), `Traffic Tap cloud keyframe milestone ${part}`);
}
// As of 72.1B.4, the experimental fireworks were removed by request.
// The ported Traffic Tap cloud remains the authentic visual effect.
ok(!css.includes('.bz-zoo-firework'), "No unused Zoo Escape firework CSS");
ok(!engine.includes('spawnFoodSliceFirework'), "No unused firework DOM generation");
ok(css.includes('background: transparent;') && css.includes('.bz-zoo-pet {'), "Unframed pet tile background is transparent");
const petRule = css.match(/\.bz-zoo-pet \{([\s\S]*?)\}/)?.[1] || "";
for (const token of ["background: transparent", "border: 0", "box-shadow: none", "overflow: visible"]) {
  ok(petRule.includes(token), `Pet frame removed: ${token}`);
}
ok(css.includes('.bz-zoo-pet img { display: block; width: 100%; height: 100%; object-fit: contain'), "Portrait fills the full original hit area");
ok(engine.includes("vx: rand(300, 440)"), "Fast X bounce velocity, approx 3x prior");
ok(engine.includes("Date.now() - lastBounceSoundAt >= 180"), "Optional bounce sounds rate-limited for crowded rounds");
ok(engine.includes("vy: rand(290, 420)"), "Fast Y bounce velocity, approx 3x prior");
ok(engine.includes('const EMERGE_MS = 750') && engine.includes('const SPAWN_MS = 1000'), "Original emergence and spawn cadence unchanged");
ok(engine.includes('root.requestAnimationFrame(() => {'), "Poof starts on a paint frame like Traffic Tap");
ok(/const CACHE_VERSION = "2026_[^"]*patch72_1/.test(sw), "PWA cache covers original visual polish or a newer revision");

// Drive actual Zoo Escape rendering with the same simulated DOM used in 72.1A.
// Reusing that tested harness keeps Feeding-specific behavior unchanged.
const start = pilotJS.indexOf('function harness(');
const end = pilotJS.indexOf('\nasync function run()', start);
ok(start >= 0 && end > start, "Shared pilot DOM harness is available");
const scope = { engine, vm, assert, Math, Date, Promise, URL, console, checks: 0 };
const harness = vm.runInNewContext(`${pilotJS.slice(start, end)}\nharness`, scope);
const effectsOf = h => h.overlay.children.find(n => n.className === "bz-zoo-effects")?.children || [];
(async () => {
  const h = harness([false, false]);
  ok(h.ctl.start(), "Pilot scene starts");
  h.button.trigger("click");
  await Promise.resolve();
  eq(h.ctl.getStage(), "escape", "One failed gesture enters pet escape");
  const single = h.petNodes()[0];
  eq(single.className, "bz-zoo-pet no-zoom", "Escaped pet is an unframed picture node");
  eq(single.style.width, single.style.height, "Pet image uses the same square hit area");
  ok(single.disabled, "Fast pets are still uncapturable during emergence");
  h.advance(1200);
  ok(!single.disabled, "Fast pet can be caught after emergence");
  h.rescueFirst();
  const puff = effectsOf(h).find(n => n.className === "bz-zoo-poof");
  ok(puff, "Returning pet creates Traffic Tap poof layer");
  const cloudNode = puff.children.find(n => n.className === "bz-zoo-poof-cloud");
  ok(cloudNode?._html?.includes("<svg"), "Rendered poof contains actual SVG rather than a glyph");
  eq(puff.children.filter(n => n.className === "bz-zoo-poof-dot").length, 9, "Nine actual outward poof particles");
  h.advance(40);
  ok(cloudNode.classList.contains("is-live"), "SVG cloud ripple animation activated");
  ok(puff.children.some(n => n.className === "bz-zoo-poof-dot" && n.classList.contains("is-live")), "Outward particle animation activated");
  h.button.trigger("click");
  await Promise.resolve();
  eq(h.ctl.getStage(), "break", "Failed second gesture launches multi-pet Zoo Break");
  ok(!effectsOf(h).some(n => n.className === "bz-zoo-firework"), "No fireworks created during Zoo Break");
  const anchor = effectsOf(h).find(n => n.className === "bz-zoo-break-anchor");
  ok(anchor, "Zoo Break GROOVY announcement centered by independent anchor");
  const wobble = anchor.children.find(n => n.className === "bz-zoo-break-shake");
  ok(wobble, "Zoo Break announcement has its own shake layer");
  ok(wobble.children.some(n => n.className === "bz-zoo-break-splash"), "Rainbow GROOVY label retained");
  ok(h.ctl.getState().total >= 6 && h.ctl.getState().total <= 10, "Zoo Break count unchanged");
  h.advance(11000);
  eq(h.ctl.getState().spawning, h.ctl.getState().total, "Pets still emerge one second apart");
  h.ctl.destroy();
  console.log(`Patch 72.1B.2 Zoo Escape visual polish: ${checks} checks passed`);
})().catch(err => { console.error(err); process.exitCode = 1; });
