#!/usr/bin/env node
"use strict";
// UI-only cleanup: remove ephemeral Home celebration, keep earned stats,
// and draw an unambiguously white checkmark across iOS/Android/Web.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const app=read("app.js"),css=read("styles.css");
const feed=read("daily_questions_feed_game.js");
const feedCss=read("daily_questions_feed_game.css");
const engine=read("verse_games/shared/welcome-back-zoo-escape.js");
const stats=read("scripts/validate_patch72_1d_zookeeper_stats.js");
for(const [name,src] of [["app.js",app],["daily_questions_feed_game.js",feed],
 ["welcome-back-zoo-escape.js",engine],["zookeeper stats test",stats]]){
  new vm.Script(src,{filename:name});
}
assert.doesNotMatch(app,/title-zoo-hero|zooCelebrationHtml|acknowledgeCelebration/);
assert.doesNotMatch(css,/title-zoo-hero|bzZooHeroCelebrate|bzZooHeroTwinkle/);
assert.match(engine,/acknowledgeCelebration/,"keep existing per-Zookeeper statistics API");
assert.match(engine,/pendingPets/,"keep earned rescue totals and pending counters");
assert.match(app,/BibloPets Rescued/,"Zookeeper Stats retains rescue total");
assert.match(app,/Zoo Breaks Stopped/,"Zookeeper Stats retains break total");
assert.match(feed,/data-daily-feed-result-back[\s\S]*?<svg class="daily-feed-result-check"/);
assert.match(feed,/viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"/);
assert.match(feed,/stroke="currentColor" stroke-width="3"/);
assert.match(feed,/<span>To-Do Complete!<\/span>/);
assert.doesNotMatch(feed,/✔ To-Do Complete!/,"remove OS-dependent black emoji glyph");
assert.match(feedCss,/\.daily-feed-result-back\s*\{[\s\S]*?color: #ffffff;/);
assert.match(feedCss,/\.daily-feed-result-check\s*\{[\s\S]*?color: #fff;/);
assert.match(feed,/FEED_MODES\.MELODY/,"shared end screen still covers all feeding modes");
const sw=read("service-worker.js");
assert.match(sw,/const CACHE_VERSION = "2026_[^"\n]*patch73[^"\n]*";/, "PWA cache stays versioned after future UI updates");
for(const asset of ["./app.js","./styles.css","./daily_questions_feed_game.js",
 "./daily_questions_feed_game.css"]){
  assert.ok(sw.includes('"'+asset+'"'),"offline shell contains "+asset);
}
console.log("PASS: Zoo Hero UI absent, stats intact, white SVG check in all Feeding results, offline assets refreshed");
