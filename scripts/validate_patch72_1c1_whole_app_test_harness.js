#!/usr/bin/env node
"use strict";
/* Patch 72.1C.1: exercise real shared Zoo controller and return adapter.
 * Test-only results are always false/deferred; success runs the owner's
 * actual recovery callback on an authentic click. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const src = read("verse_games/shared/welcome-back-zoo-escape.js");
const adapter = read("verse_games/shared/welcome-back-return.js");
const css = read("verse_games/shared/welcome-back.css");
const sw = read("service-worker.js");
let checks = 0;
const ok = (v,msg) => { assert.ok(v,msg); checks++; };
const eq = (a,b,msg) => { assert.equal(a,b,msg); checks++; };
for (const id of ["stage2-real","stage3-real","stage3-exit","deferred-real","early-stage2","early-stage3"])
  ok(src.includes(`id: "${id}"`),`${id}: scenario available`);
ok(src.includes("const ENABLE_ZOO_RETURN_TEST_HARNESS = true;"),"explicitly enabled for developer testing");
ok(src.includes('!overlay.classList.contains("daily-feed-resume-overlay")'),"Feeding retains reward-safe badge harness");
ok(src.includes('return recover(info);'),"real result uses owner recovery");
ok(!src.includes('return true; // test') && !src.includes('return Promise.resolve(true); // test'),
  "test scenario never fabricates audio success");
ok(css.includes(".bz-zoo-dev-menu") && css.includes("z-index: 100"),"menu sits above escaped portraits");
ok(/const CACHE_VERSION = "2026_[^"\n]*patch72_1(?:c|d)/.test(sw),"offline asset revision updated");
ok(adapter.includes("const wasPending = pending;") && adapter.includes("zoo.resumeVisible?.();"),
  "shared return preserves staged pets on repeated app switches");

// Reuse Patch 72.1A's real fake-DOM testing fixture without executing its
// assertions. Its VM model includes actual pointer listeners, timer control,
// animation frames, pen rescue gestures, and the same Zoo Escape JS under test.
const fixture = read("scripts/validate_patch72_1a_zoo_escape.js");
const begin = fixture.indexOf("function harness(");
const end = fixture.indexOf("\nasync function run(){",begin);
ok(begin>0 && end>begin,"existing DOM fixture available");
const context={vm,engine:src,assert,checks,ok,eq,Math,Date,Promise,URL,console};
vm.runInNewContext(fixture.slice(begin,end)+"\nthis.makeHarness=harness;",context);
const make = context.makeHarness;
const flush = async()=>{await Promise.resolve();await Promise.resolve();};
function menuFor(h) {
  h.title.trigger("pointerdown",{pointerId:7,clientX:140,clientY:170,button:0});
  h.advance(2450);
  const menu = h.overlay.children.find(n=>n.className==="bz-zoo-dev-menu");
  ok(menu,"title long-press opens hidden menu");
  return menu;
}
function choose(h,id) {
  const menu=menuFor(h);
  const content=menu.children[0];
  const labels={"stage2-real":2,"stage3-real":3,"stage3-exit":4,
    "deferred-real":5,"early-stage2":6,"early-stage3":7};
  content.children[labels[id]].trigger("click");
  eq(h.overlay.children.some(n=>n.className==="bz-zoo-dev-menu"),false,"menu removed on selection");
  eq(h.ctl.getStage(),"welcome","scenario resets only visual stage");
}
async function tests(){
  {
    const h=make([true]);h.ctl.start();choose(h,"stage2-real");
    h.button.trigger("click");await flush();
    eq(h.ctl.getStage(),"escape","developer failure enters Stage 2");
    eq(h.recovery.length,0,"scripted failure does not call owner audio");
    h.advance(1150);h.rescueFirst();
    eq(h.ctl.getState().rescued,1,"animal rescue completes");
    h.button.trigger("click");await flush();
    eq(h.recovery.length,1,"success scenario invokes owner exactly once");
    eq(h.ctl.getStage(),"recovered","only verified owner success dismisses");
    h.ctl.destroy();
  }
  {
    const h=make([false]);h.ctl.start();choose(h,"deferred-real");
    h.button.trigger("click");await flush();
    eq(h.ctl.getStage(),"welcome","pending interruption stays at same gate");
    eq(h.ctl.getState().attemptCount,0,"deferred attempt not consumed");
    eq(h.recovery.length,0,"deferred scenario never invokes audio owner");
    h.button.trigger("click");await flush();
    eq(h.ctl.getStage(),"escape","real owner failure advances normally");
    eq(h.recovery.length,1,"owner invoked by real tap on retry");
    h.ctl.destroy();
  }
  {
    const h=make([false]);h.ctl.start();choose(h,"stage3-real");
    h.button.trigger("click");await flush();
    h.advance(1050);h.rescueFirst();
    h.button.trigger("click");await flush();
    eq(h.ctl.getStage(),"break","second scripted failure enters Stage 3");
    eq(h.recovery.length,0,"neither scripted failure calls owner");
    h.advance(2550);
    const before=h.ctl.getState();
    ok(before.spawning>=2 && before.spawning<before.total,"some Stage 3 pets spawned");
    h.doc.hidden=true;h.doc.emit("visibilitychange");
    h.advance(3500);
    eq(h.ctl.getState().spawning,before.spawning,"background freezes pet spawning");
    h.doc.hidden=false;h.doc.emit("visibilitychange");
    h.advance(1150);
    ok(h.ctl.getState().spawning>before.spawning,"foreground resumes spawning");
    h.ctl.destroy();
  }
  {
    const h=make([]);h.ctl.start();choose(h,"stage3-exit");
    h.button.trigger("click");await flush();
    h.advance(1050);h.rescueFirst();
    h.button.trigger("click");await flush();
    eq(h.ctl.getStage(),"break","Zoo Exit scenario reaches break");
    h.advance(11500);
    // Catch pets that are now fully emerged and clear of the pen.
    for(let i=0;i<12 && h.ctl.getState().rescued<h.ctl.getState().total;i++){
      const before=h.ctl.getState().rescued;
      h.rescueFirst();
      h.advance(150);
      ok(h.ctl.getState().rescued>before,"one animal rescued without audio");
    }
    eq(h.ctl.getState().rescued,h.ctl.getState().total,"all Stage 3 pets returned");
    h.button.trigger("click");await flush();
    eq(h.recovery.length,0,"terminal scenario never touches owner recovery");
    eq(h.ctl.getStage(),"exiting","third scripted failure starts safe exit");
    h.advance(500);
    eq(h.fired.filter(x=>x.exit).length,1,"actual activity onExit called once");
    h.ctl.destroy();
  }
  {
    const h=make([]);h.ctl.start();choose(h,"early-stage2");
    h.button.trigger("click");await flush();
    eq(h.ctl.getStage(),"escape","early-exit scenario enters rescue stage");
    h.ctl.exit();
    eq(h.fired.filter(x=>x.exit).length,1,"real exit callback invoked");
    h.ctl.destroy();
  }
  // The original Feeding developer harness remains its own isolated adapter.
  ok(read("daily_questions_feed_game.js").includes("zooDevTestEverActivated"),
    "Feeding test-mode reward suppression retained");
  console.log(`Patch 72.1C.1 whole-app test harness: ${checks} checks passed`);
}
tests().catch(e=>{console.error(e);process.exitCode=1;});
