#!/usr/bin/env node
"use strict";
/* BibloZoo Patch 64: deterministic virtual-clock checks + source integration.
 * This does not simulate WebKit media sessions or replace real device testing. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const eq = (got, expected, message) => { assert.equal(got, expected, message); checks++; };

async function clockChecks() {
  let wall = 1000;
  let nextTimerId = 0;
  const timers = new Map();
  const window = {
    performance: {now: () => wall},
    setTimeout: (fn, ms) => { const id=++nextTimerId; timers.set(id,{fn,at:wall+ms});return id; }
  };
  vm.runInNewContext(read('verse_games/shared/welcome-back-clock.js'), {window});
  const api = window.BibloZooWelcomeBackClock;
  ok(api && typeof api.create === 'function', 'Virtual clock can be created');
  const clock = api.create();
  eq(clock.now(), 1000, 'Clock begins with the real monotonic time');
  let completed = 0;
  const promise = clock.sleep(500).then(() => completed++);
  function advance(ms) {
    const end = wall + ms;
    // Background test advances can skip dormant JS timers entirely, as WebKit
    // commonly suspends them; run one check after the large jump.
    if (clock.isPaused()) {
      wall = end;
      for (const [id,v] of [...timers.entries()].filter(([,v])=>v.at<=end)) {
        timers.delete(id); v.fn();
      }
      return;
    }
    for (let i=0;i<12000;i++) {
      const earliest = [...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0];
      if (!earliest || earliest[1].at>end) break;
      const [id,v] = earliest;
      wall = v.at;
      timers.delete(id);
      v.fn();
    }
    wall=end;
  }
  advance(150);
  eq(clock.now(), 1150, 'Elapsed foreground time counts');
  clock.pause();
  eq(clock.isPaused(), true, 'Task switch pauses clock');
  const frozenAt = clock.now();
  advance(3600000);
  eq(clock.now(), frozenAt, 'One hour away does not move activity time');
  await Promise.resolve();
  eq(completed,0,'Scheduled game action cannot finish while away');
  clock.pause();
  eq(clock.now(), frozenAt, 'Duplicate background notifications are idempotent');
  clock.resume();
  eq(clock.now(), frozenAt, 'Time resumes from exact frozen timestamp');
  clock.resume();
  advance(349);
  await Promise.resolve();
  eq(completed,0,'Only remaining 350ms counts after return');
  advance(1);
  await promise;
  eq(completed,1,'Scheduled game action resumes exactly once');
  eq(Math.round(clock.now()),1500,'Virtual time excludes entire task switch');
  clock.pause();
  const t=clock.now();
  advance(5500);
  eq(clock.now(),t,'Second switch also stops clock');
  clock.resume();
  advance(80);
  eq(clock.now(),t+80,'Second return resumes without a time jump');
}

function sourceChecks() {
  const games = ['traffic_tap','foodslice','tower_bible','verse_launch'];
  const worker = read('service-worker.js');
  ok(worker.includes('2026_Oct_26_patch69_2_wacky_single_tap'), 'Patch64 has a fresh offline cache');
  ok(worker.includes('"./verse_games/shared/welcome-back-clock.js"'), 'Shared clock cached offline');
  const helper = read('verse_games/shared/welcome-back-return.js');
  ok(helper.includes('context.currentTime - before >= 0.02'),'Actual advancing Web Audio clock remains required');
  ok(helper.includes('recoverAfterStall'),'Patch 60 recovery remains available');
  const shell = read('verse_games/shared/welcome-back.css');
  ok(shell.includes('background: #ffc751'),'Popup keeps yellow background');
  ok(shell.includes('.bz-welcome-name { color: #ffffff; }'),'Zookeeper name stays white');
  ok(shell.includes('.bz-welcome-punctuation { color: #333333; }'),'Exclamation stays charcoal');
  for (const game of games) {
    const root=`verse_games/${game}/`;
    const html=read(root+'index.html');
    const js=read(root+'game.js');
    const css=read(root+'game.css');
    for (const resource of ['../../profiles.js','../shared/welcome-back.css',
      '../shared/welcome-back.js','../shared/welcome-back-return.js',
      '../shared/welcome-back-clock.js','../shared/audio-diagnostics.js',
      '../shared/native-audio-recovery.js','../shared/audio-recovery-coordinator.js']) {
      ok(html.includes(resource),`${game} loads ${resource}`);
    }
    ok(html.indexOf('welcome-back-return.js') < html.indexOf('bridge.js'),
      `${game} loads lifecycle helper before game`);
    ok(js.includes('const welcomeClock = window.BibloZooWelcomeBackClock.create()'),
      `${game} has a pause-aware activity clock`);
    ok(js.includes('returnSession += 1') && js.includes('session !== returnSession'),
      `${game} invalidates stale recovery after switching away again`);
    ok(js.includes('welcomeClock.pause()') && js.includes('welcomeClock.resume()'),
      `${game} freezes deadlines until verified return`);
    ok(js.includes('window.BibloZooWelcomeBackReturn?.attach?.({') &&
      js.includes('onPause: pauseForTaskSwitch') && js.includes('onContinue: continueFromWelcomeBack'),
      `${game} connects real child gesture`);
    ok(js.includes('window.VerseGameBridge.getLaunchParams().profileId'),
      `${game} uses launched zookeeper profile`);
    ok(js.includes('returnRecoveryFailures > 0 && returnContextReplacements < 1'),
      `${game} caps replacement attempts`);
    ok(js.includes('resumeAudioOnGesture'),`${game} verifies audio, not context.state alone`);
    ok(js.includes('if (!ok || document.hidden || session !== returnSession)'),
      `${game} never continues without confirmed audio`);
    ok(js.includes('suspendWelcomeAnimations()') && js.includes('restoreWelcomeAnimations()'),
      `${game} suspends Web Animations`);
    ok(css.includes('animation-play-state: paused !important'),
      `${game} also suspends CSS keyframes`);
    ok(js.includes('getAnimations()') && js.includes('animation.pause()'),
      `${game} handles WAAPI animations`);
  }
  const traffic=read('verse_games/traffic_tap/game.js');
  ok(traffic.includes('ts = gameNow();') && traffic.includes('state.bonusEndsAt - now'),
    'Traffic Tap motion and bonus deadlines use virtual time');
  ok(traffic.includes('stopLoop();') && traffic.includes('if (returnWasLooping && state.running) startLoop();'),
    'Traffic Tap stops movement without restarting an inactive loop');
  const food=read('verse_games/foodslice/game.js');
  ok(food.includes('ts = gameNow();') && food.includes('welcomeClock.sleep(320).then'),
    'Food Slice handles moving fruit and wrong/bomb input pauses');
  ok(food.includes('returnPaused && !paused'),
    'Food Slice cannot be unpaused by an old delayed callback');
  const tower=read('verse_games/tower_bible/game.js');
  ok(tower.includes('ts = gameNow();') && tower.includes('welcomeClock.sleep(finishDelay).then'),
    'Tower belt physics and frenzy finish delays stay paused');
  const launch=read('verse_games/verse_launch/game.js');
  ok(launch.includes('const sleep = (ms) => welcomeClock.sleep(ms)'),
    'Verse Launch cutscenes use pause-aware sleeps');
  ok(launch.includes('returnConveyorWasRunning') && launch.includes('returnAstroWasRunning'),
    'Verse Launch restarts only previously active animation loops');
  ok(launch.includes('ts = gameNow();') && launch.includes('if (returnPaused) { state.astroRaf = 0; return; }'),
    'Verse Launch projectile movement and collisions cannot progress while paused');
  ok(launch.includes('if (returnPaused || state.busy'),
    'Verse Launch ignores launch input during pending return');
  ok(!/AVAudioSessionCategoryMixWithOthers|mixWithOthers/.test([traffic,food,tower,launch].join('\n')),
    'No audio-mixing category introduced');
}

(async()=>{
  await clockChecks();
  sourceChecks();
  console.log(`Patch 64 moving-target Welcome Back validation passed (${checks} checks).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
