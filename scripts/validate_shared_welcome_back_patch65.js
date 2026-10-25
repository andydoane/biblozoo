#!/usr/bin/env node
"use strict";
/* Patch 65: source wiring, timing, and gesture-owned bounded replacement.
 * Deterministic checks complement (not replace) an iPhone WebKit test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');
let checks = 0;
function ok(cond, label) { assert.ok(cond, label); checks += 1; }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1; }

async function checkAudio() {
  const window = { setTimeout, clearTimeout, document: {hidden:false} };
  const diagnostics = [];
  window.BibloZooAudioDiagnostics = {record:(type,info)=>diagnostics.push({type,info})};
  window.BibloZooAudioRecoveryCoordinator = {
    isAvailable:()=>true,
    recoverAfterStall:async()=>({recovered:false})
  };
  vm.runInNewContext(read('verse_games/shared/welcome-back-return.js'), {window,setTimeout,clearTimeout,Promise});
  const run = window.BibloZooWelcomeBackReturn.resumeAudioOnGesture;
  ok(typeof run === 'function', 'Shared audio API is available');

  // A context can say running while currentTime remains frozen.
  const stalled = {state:'running',currentTime:23};
  const start = Date.now();
  const recovered = {state:'running',get currentTime(){ return (Date.now()-start)/1000; }};
  let context = stalled;
  let unlocks = 0;
  let replaces = 0;
  const result = await run({
    unlock:()=>{unlocks++; return Promise.resolve(true);},
    getContext:()=>context,
    isCurrent:()=>true,
    replaceContext:()=>{ replaces++; context = recovered; return true; }
  });
  equal(result,true,'One tap can recover via guarded fallback when WebKit allows it');
  equal(unlocks,2,'The same interaction tries audio on the new context');
  equal(replaces,1,'Only one replacement is performed');
  ok(context === recovered,'Replacement becomes the active audio context');

  context = stalled; unlocks=0; replaces=0;
  const failed = await run({
    unlock:()=>{unlocks++; return Promise.resolve(false);},
    getContext:()=>context,
    isCurrent:()=>true,
    replaceContext:()=>{replaces++; return false;}
  });
  equal(failed,false,'Rejected replacement leaves Welcome Back paused');
  equal(replaces,1,'Failed replacement is not looped');
  equal(unlocks,1,'No auto-retry when replacement is unavailable');

  context=stalled; replaces=0;
  let current=true;
  const stale = await run({
    unlock:()=>{current=false;return Promise.resolve(true);},
    getContext:()=>context,
    isCurrent:()=>current,
    replaceContext:()=>{replaces++; return true;}
  });
  equal(stale,false,'A second task switch invalidates earlier recovery');
  equal(replaces,0,'Stale recovery never replaces a context');

  context = recovered; replaces=0; unlocks=0;
  const alreadyHealthy = await run({
    unlock:()=>{unlocks++;return true;},
    getContext:()=>context,isCurrent:()=>true,
    replaceContext:()=>{replaces++;return true;}
  });
  equal(alreadyHealthy,true,'Healthy context verified through advancing clock');
  equal(replaces,0,'Never replace a healthy context');
}

function checkSources() {
  const shared = read('verse_games/shared/welcome-back-return.js');
  ok(shared.includes('replaceContext') && shared.includes('recoverAfterStall'), 'Coordinator precedes optional context fallback');
  ok(shared.includes('context.currentTime - before >= 0.02'), 'Real clock advancement is mandatory');
  ok(shared.includes('Back to Games') && shared.includes('ESCAPE_WATCHDOG_MS'), 'A safe recovery escape remains');
  const worker=read('service-worker.js');
  ok(worker.includes('2026_Oct_25_patch65_motion_audio_one_tap'), 'New offline cache version');
  for (const game of ['versey_bird','dino_dash','verse_snake']) {
    const prefix = `verse_games/${game}/`;
    const html = read(prefix+'index.html');
    const js = read(prefix+'game.js');
    const css = read(prefix+'game.css');
    for (const dependency of ['../../profiles.js','../shared/welcome-back.css','../shared/welcome-back.js','../shared/welcome-back-return.js','../shared/welcome-back-clock.js','../shared/audio-diagnostics.js','../shared/native-audio-recovery.js','../shared/audio-recovery-coordinator.js']) {
      ok(html.includes(dependency),`${game} includes ${dependency}`);
    }
    ok(html.indexOf('welcome-back-return.js') < html.indexOf('bridge.js'),`${game} helper loads before game`);
    ok(js.includes('BibloZooWelcomeBackClock.create()') && js.includes('welcomeClock.pause()') && js.includes('welcomeClock.resume()'),`${game} holds virtual time during interruptions`);
    ok(js.includes('ts = gameNow()'),`${game} uses virtual time for frame physics`);
    ok(js.includes('if (returnPaused && !paused) return;'),`${game} cannot be unpaused prematurely`);
    ok(js.includes('returnSession += 1') && js.includes('session !== returnSession'),`${game} invalidates stale recovery`);
    ok(js.includes('replaceContext: replaceWelcomeAudioContext'),`${game} opts in to bounded fallback`);
    ok(js.includes('returnContextReplacements >= 1'),`${game} limits replacement`);
    ok(js.includes('if (!ok || document.hidden || session !== returnSession) return false'),`${game} does not resume if audio is silent`);
    ok(js.includes('returnPriorPauseReason = state.paused ? state.pauseReason : null'),`${game} preserves existing pause`);
    ok(js.includes('onExit: () => { returnSession += 1; window.VerseGameBridge.exitGame(); }'),`${game} retains safe exit`);
    ok(js.includes('profileId: launch.profileId'),`${game} uses launched zookeeper`);
    ok(js.includes('document.getAnimations') && js.includes('animation.pause()'),`${game} also pauses Web Animations`);
    ok(css.includes('animation-play-state: paused !important'),`${game} freezes CSS animation`);
    ok(js.includes('welcomeClock.sleep(') || game === 'dino_dash',`${game} has pause-aware deferred gameplay actions`);
    ok(html.includes('welcome-back.css'),`${game} keeps central shared visual design`);
    ok(js.includes('returnPaused = false;') && js.includes('setPaused(returnPriorPauseReason !== null'),`${game} restores original pause`);
    ok(!js.includes('setCategory('),`${game} never changes audio mixing policy`);
  }
  for (const game of ['versey_bird','dino_dash']) {
    const js=read(`verse_games/${game}/game.js`);
    ok(js.includes('sessionStorage') && js.includes('savedAt: Date.now()'),`${game} retains halfway checkpoint persistence`);
    ok(js.includes('halfway') && js.includes('window.location.reload()'),`${game} preserves midpoint reload`);
  }
  const traffic=read('verse_games/traffic_tap/game.js');
  ok(traffic.includes('replaceContext: () => {') && traffic.includes('returnContextReplacements >= 1'), 'Traffic Tap opts into the same bounded first-tap fallback');
}

(async()=>{
  await checkAudio();
  checkSources();
  console.log(`Patch 65 continuous-motion Welcome Back: ${checks} assertions passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
