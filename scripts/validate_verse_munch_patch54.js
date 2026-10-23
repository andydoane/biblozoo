#!/usr/bin/env node
"use strict";

// Patch 54: behavioral tests of the actual Verse Munch bonus-belt functions.
// Runs in Node with a simulated DOM/clock; no browser, audio, or profile data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(
  process.env.VMUNCH_SOURCE || path.join(root, "verse_games/verse_munch/game.js"),
  "utf8"
);
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
function nearlyEqual(actual, expected, tolerance, message) {
  check(Math.abs(actual - expected) <= tolerance,
    `${message}: got ${actual}, expected ${expected} (+/- ${tolerance})`);
}
function sourceNumber(name) {
  const pattern = new RegExp(`\\bconst ${name} = ([0-9.]+);`);
  const match = game.match(pattern);
  assert.ok(match, `Missing numeric Verse Munch constant: ${name}`);
  return Number(match[1]);
}
function actualBonusFunctions() {
  const start = game.indexOf("  function updateBonusFoodBelt(dt) {");
  const end = game.indexOf("  function updateBelt(dt) {", start);
  assert.ok(start >= 0 && end > start, "Bonus belt implementation not found");
  return game.slice(start, end);
}

const BONUS_PLAY_DURATION = sourceNumber("BONUS_PLAY_DURATION");
const BONUS_END_SPEED_MULTIPLIER = sourceNumber("BONUS_END_SPEED_MULTIPLIER");
const BONUS_TARGET_CHANCE = sourceNumber("BONUS_TARGET_CHANCE");
const BONUS_FORCE_TARGET_AFTER = sourceNumber("BONUS_FORCE_TARGET_AFTER");
const impl = actualBonusFunctions();
const bonusFruits = Array.from({ length: 10 }, (_, i) => ({ id: `fruit_${i + 1}` }));

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function harness({ seed = 1, random = null, width = 440 } = {}) {
  const state = {
    bonusPhase: "playing", bonusElapsed: 0, bonusFoodItems: [],
    bonusFoodSpawnTimer: 0, bonusFoodNextId: 1, bonusNonTargetStreak: 0,
    bonusTargetFruit: bonusFruits[0], fieldWidth: width
  };
  const simulatedMath = Object.create(Math);
  simulatedMath.random = random || seededRandom(seed);
  const sandbox = {
    state, Math: simulatedMath, BONUS_PLAY_DURATION, BONUS_END_SPEED_MULTIPLIER,
    BONUS_TARGET_CHANCE, BONUS_FORCE_TARGET_AFTER, BONUS_FRUITS: bonusFruits,
    clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
    randomFrom: (list) => list[Math.floor(simulatedMath.random() * list.length)],
    document: { getElementById: () => null }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${impl}\nglobalThis.testBonus = {
    updateBonusFoodBelt, getBonusSpeedMultiplier, getBonusFoodBeltConfig,
    randomBonusSpawnDelay, spawnBonusFoodItem
  };`, sandbox, { filename: "verse-munch-bonus-actual.js" });
  return { state, api: sandbox.testBonus };
}

function testInverseSpeedSpawnTiming() {
  check(BONUS_PLAY_DURATION === 20, "Existing 20-second bonus duration preserved");
  check(BONUS_END_SPEED_MULTIPLIER === 1.5, "Existing 50% speed-up preserved");
  for (const randomValue of [0, 0.25, 0.5, 0.75, 0.999999]) {
    const { state, api } = harness({ random: () => randomValue });
    const samples = [];
    for (const elapsed of [0, 5, 10, 15, 20]) {
      state.bonusElapsed = elapsed;
      const speed = api.getBonusFoodBeltConfig().speed;
      const delay = api.randomBonusSpawnDelay();
      samples.push({ elapsed, speed, delay, distance: speed * delay });
      nearlyEqual(api.getBonusSpeedMultiplier(), 1 + 0.5 * elapsed / 20, 1e-12,
        `Speed multiplier at ${elapsed}s`);
    }
    nearlyEqual(samples[4].speed / samples[0].speed, 1.5, 1e-12,
      "Belt reaches 1.5x starting speed");
    nearlyEqual(samples[4].delay / samples[0].delay, 1 / 1.5, 1e-12,
      "Spawn timer shortens in inverse proportion to speed");
    for (const sample of samples) {
      nearlyEqual(sample.distance, samples[0].distance, 1e-10,
        `Distance traveled per spawn interval is constant at ${sample.elapsed}s`);
    }
    if (randomValue === 0.5) {
      nearlyEqual(samples[0].delay, 0.53, 1e-12, "Original opening cadence retained");
      nearlyEqual(samples[4].delay, 0.53 / 1.5, 1e-12,
        "Ending cadence delivers more fruit opportunities");
    }
  }
}

function visibleGaps(state, width) {
  const shown = state.bonusFoodItems
    .filter((item) => item.x + item.size > 0 && item.x < width)
    .sort((a, b) => a.x - b.x);
  return shown.slice(1).map((item, i) => item.x - (shown[i].x + shown[i].size));
}

function simulate({ seed, dt, width = 440, random = null } = {}) {
  const { state, api } = harness({ seed, random, width });
  const spawnTimes = [];
  const earlyGaps = [];
  const lateGaps = [];
  let lastId = 0;
  let targets = 0;
  let nonTargetRun = 0;
  let finishedAt = 0;
  while (finishedAt < BONUS_PLAY_DURATION - 1e-9) {
    const step = Math.min(dt, BONUS_PLAY_DURATION - finishedAt);
    api.updateBonusFoodBelt(step);
    finishedAt += step;
    check(state.bonusElapsed <= BONUS_PLAY_DURATION + 1e-9, "Bonus clock never overruns");
    const active = [...state.bonusFoodItems].sort((a, b) => a.x - b.x);
    for (let i = 1; i < active.length; i += 1) {
      check(active[i].x - (active[i - 1].x + active[i - 1].size) >= 70 - 1e-7,
        "Spawn placement retains at least the original 70px edge gap");
    }
    for (const item of active) {
      if (item.id <= lastId) continue;
      spawnTimes.push(finishedAt);
      if (item.isTarget) {
        targets += 1;
        nonTargetRun = 0;
      } else {
        nonTargetRun += 1;
      }
      check(nonTargetRun <= BONUS_FORCE_TARGET_AFTER, "Original forced-target pacing preserved");
      lastId = item.id;
    }
    // Items can leave the belt between frames; retain their IDs when that happens.
    lastId = Math.max(lastId, state.bonusFoodNextId - 1);
    if (finishedAt > 3 && finishedAt < 7) earlyGaps.push(...visibleGaps(state, width));
    if (finishedAt > 15 && finishedAt < 19) lateGaps.push(...visibleGaps(state, width));
  }
  check(targets > 0, "Bonus round still offers target fruit");
  check(spawnTimes.length > 20, "Bonus round spawns a useful number of fruit");
  const first = spawnTimes.filter(t => t >= 1 && t < 5).length;
  const last = spawnTimes.filter(t => t >= 15 && t < 19).length;
  check(last > first, `Later bonus window offers more fruit (${first} -> ${last})`);
  return {
    spawnTimes, earlyGaps, lateGaps, first, last, total: spawnTimes.length,
    state, api
  };
}

function mean(values) {
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function testPhysicalSpacingAndFrequency() {
  for (const dt of [1 / 60, 1 / 30, 1 / 15]) {
    for (const seed of [1, 11, 137, 2026]) {
      const sim = simulate({ seed, dt });
      check(sim.earlyGaps.length > 10 && sim.lateGaps.length > 10,
        "Both sampling windows contain sufficient adjacent fruit");
      const early = mean(sim.earlyGaps);
      const late = mean(sim.lateGaps);
      check(late <= early + 13,
        `Fruit spacing does not grow as speed increases (early ${early.toFixed(1)}px, late ${late.toFixed(1)}px)`);
    }
  }

  // Deterministic spawn values isolate the pacing effect from random variance.
  const fixed = simulate({ random: () => 0.5, dt: 1 / 30 });
  check(fixed.last >= fixed.first + 2,
    `Expected meaningfully more late fruit (${fixed.first} -> ${fixed.last})`);
  check(mean(fixed.lateGaps) <= mean(fixed.earlyGaps) + 3,
    "Fixed-randomness test preserves near-constant edge gap across acceleration");
  console.log(`Deterministic 4-second windows: ${fixed.first} early fruit, ` +
    `${fixed.last} late fruit; mean gaps ${mean(fixed.earlyGaps).toFixed(1)}px ` +
    `and ${mean(fixed.lateGaps).toFixed(1)}px.`);
}

function testPauseAndFrameHitch() {
  const { state, api } = harness({ random: () => 0.5 });
  api.updateBonusFoodBelt(1 / 30);
  const before = { count: state.bonusFoodNextId, elapsed: state.bonusElapsed };
  state.bonusPhase = "score";
  api.updateBonusFoodBelt(0.8);
  check(state.bonusElapsed === before.elapsed && state.bonusFoodNextId === before.count,
    "Bonus spawn stops outside playing phase");
  state.bonusPhase = "playing";
  api.updateBonusFoodBelt(0.8);
  check(state.bonusFoodNextId > before.count, "Delayed frame catches up spawning");
  const active = [...state.bonusFoodItems].sort((a, b) => a.x - b.x);
  for (let i = 1; i < active.length; i += 1) {
    check(active[i].x - (active[i - 1].x + active[i - 1].size) >= 70 - 1e-7,
      "Even after a delayed frame, fruit never overlap");
  }
}

function testPwaCacheUpdated() {
  check(worker.includes('const CACHE_VERSION = "2026_Oct_22_patch54_verse_munch_bonus_fruit_spacing";'),
    "PWA cache version updated for Patch 54");
  check(worker.includes("JavaScript, CSS, JSON, and other same-origin") &&
    worker.includes("networkFirst(request)"),
    "Service worker still supports network-first JS runtime updates");
}

function main() {
  testInverseSpeedSpawnTiming();
  testPhysicalSpacingAndFrequency();
  testPauseAndFrameHitch();
  testPwaCacheUpdated();
  console.log(`Verse Munch Patch 54 validation passed (${checks} assertions).`);
}

try { main(); }
catch (err) { console.error("Verse Munch Patch 54 validation FAILED:", err); process.exitCode = 1; }
