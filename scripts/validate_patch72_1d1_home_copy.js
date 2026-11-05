#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const app = read("app.js"), styles = read("styles.css");
const controller = read("verse_games/shared/welcome-back-zoo-escape.js");
const sw = read("service-worker.js");
let count = 0;
function check(test, msg) { assert.ok(test, msg); count++; }
check(!app.includes("zooTallyHtml"), "no permanent Zoo Escape tally on home screen");
check(!app.includes("title-zoo-hero-tally"), "no home-screen tally markup");
check(!styles.includes(".title-zoo-hero-tally"), "unused tally styles removed");
check(app.includes("title-zoo-hero-celebration") && app.includes("acknowledgeCelebration"), "one-time home celebration preserved");
check(app.includes("zooEscapeStats.petsRescued") && app.includes("zooEscapeStats.zooBreaksStopped"), "both Zookeeper Stats totals preserved");
check(app.includes("Zoo Breaks Stopped") && app.includes("BibloPets Rescued"), "Zookeeper Stats labels preserved");
check(styles.includes(".title-zoo-hero-celebration"), "celebration styling preserved");
check(controller.includes('setInstruction("Drag the pet to the pen!")'), "Stage 2 brief drag copy");
check(controller.includes('setInstruction("Drag pets to the pen!")'), "Stage 3 brief drag copy");
check(!controller.includes("or tap a pet and then the pen!"), "two-method instruction no longer crowds card");
check(controller.includes('pen.addEventListener("click", tapPen)'), "pen tap alternative preserved");
check(controller.includes('el.addEventListener("click", event =>'), "pet tap alternative preserved");
check(controller.includes('rescueStatus.setAttribute("aria-live"'), "screen-reader assistance preserved");
check(/const CACHE_VERSION = "2026_[^"\n]*patch(?:72_1|73)/.test(sw), "offline cache revision bumped");
check(sw.includes('"./verse_games/shared/welcome-back-zoo-escape.js"'), "controller included in offline cache");
check(sw.includes('"./app.js"'), "home UI included in offline cache");
console.log(`Patch 72.1D.1 home/copy: ${count} checks passed`);
