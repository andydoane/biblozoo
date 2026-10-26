#!/usr/bin/env node
"use strict";
/* Patch 66: whole external game registry audit, single shared portrait spinner,
 * and virtual-time/gesture recovery checks. Device testing still required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
let checks = 0;
function ok(x,label) {assert.ok(x,label);checks++;}
function eq(a,b,label) {assert.equal(a,b,label);checks++;}

async function auditRegistry() {
  const scope={window:{}};
  vm.runInNewContext(read('verse_games/registry.js'),scope);
  const registry=scope.window.EXTERNAL_VERSE_GAMES;
  ok(Array.isArray(registry),'Registry is a literal app array');
  eq(registry.length,12,'Exactly 12 external games registered');
  const names=new Set();
  for (const item of registry) {
    const {id,launchUrl}=item.manifest;
    ok(item.enabled,'Game '+id+' is enabled');
    ok(!names.has(id),'Unique game id '+id);names.add(id);
    const dirname=launchUrl.replace(/^\.\/verse_games\//,'').replace(/\/index\.html$/,'');
    const prefix=`verse_games/${dirname}/`;
    ok(fs.existsSync(path.join(ROOT,prefix+'index.html')),id+' page exists');
    ok(fs.existsSync(path.join(ROOT,prefix+'game.js')),id+' game exists');
    const html=read(prefix+'index.html');const js=read(prefix+'game.js');
    for (const dependency of [
      '../../profiles.js','../shared/welcome-back.css',
      '../shared/welcome-back.js','../shared/welcome-back-return.js',
      '../shared/audio-diagnostics.js','../shared/native-audio-recovery.js',
      '../shared/audio-recovery-coordinator.js'
    ]) ok(html.includes(dependency),id+' loads '+dependency);
    ok(html.indexOf('welcome-back-return.js')<html.indexOf('bridge.js'),id+' controller loaded before app bridge');
    ok(js.includes('BibloZooWelcomeBackReturn?.attach?.('),id+' uses shared return controller');
    ok(js.includes('onPause:')&&js.includes('onContinue:'),id+' owns pause and continuation');
    ok(js.includes('returnSession')||js.includes('returnPause'),id+' has activity state');
    ok(js.includes('profileId:'),id+' uses launched zookeeper profile');
    ok(js.includes('continueFromWelcomeBack()') && (js.includes('resumeAudioOnGesture') || js.includes('audioClockAdvances')),id+' has gesture-owned clock-checking audio recovery');
    ok(!js.includes('AVAudioSessionCategoryPlayback'),id+' does not replace SoloAmbient policy');
    const css=read(prefix+'game.css');
    ok(!css.includes('.bz-welcome-avatar-image')&&!css.includes('.bz-welcome-card'),id+' does not copy popup presentation');
  }
  ok(names.has('verse_invaders'),'Invaders is registered');
  const invaders=read('verse_games/verse_invaders/game.js');
  const css=read('verse_games/verse_invaders/game.css');
  const clock=read('verse_games/shared/welcome-back-clock.js');
  ok(invaders.includes('welcomeClock.pause()')&&invaders.includes('welcomeClock.resume()'),'Invaders excludes background time');
  ok(invaders.includes('ts = gameNow()'),'Invaders frame timestamp uses virtual clock');
  ok(!invaders.includes('performance.now()'),'Invaders deadlines use virtual time');
  ok(invaders.includes('state.scheduledActions.push({ at: gameNow()'),'Invaders scheduled actions use virtual time');
  ok(invaders.includes('state.bonusEndsAt = now + BONUS_SWARM_DURATION_MS'),'Invaders countdown uses virtual clock');
  ok(invaders.includes('if (!state.running || state.paused || returnPaused) return;'),'Invaders fire input blocked while paused');
  ok(invaders.includes('if (returnPaused && !paused) return;'),'Invaders menu cannot release return pause');
  ok(invaders.includes('cancelAnimationFrame(state.rafId)')&&invaders.includes('if (returnWasLooping && (state.running || state.bonusMode)) startLoop();'),'Invaders stops and restores active RAF');
  ok(invaders.includes('soundBuffers.clear()')&&invaders.includes('soundBufferPromises.clear()'),'Fresh Web Audio clears stale buffer caches');
  ok(invaders.includes('if (ctx !== audioCtx) return null;'),'In-flight old decoding cannot reinsert buffers');
  ok(css.includes('body.bz-return-activity-paused #app *'),'Invaders CSS animations freeze');
  ok(clock.includes('elapsedPauseMs'),'Virtual time clock preserved');
  const worker=read('service-worker.js');
  ok(worker.includes('2026_Oct_26_patch69_flashcards_recording_replay_welcome'),'Offline revision changes');
  for (const name of ['welcome-back.css','welcome-back.js','welcome-back-return.js','welcome-back-clock.js'])
    ok(worker.includes('"./verse_games/shared/'+name+'"'),'Service worker caches shared '+name);
}

function testSpinner() {
  const widget=read('verse_games/shared/welcome-back.js');
  const css=read('verse_games/shared/welcome-back.css');
  const card={classList:{active:false,toggle(name,active){eq(name,'is-recovering','Spinner class');this.active=active;}},setAttribute(n,v){this[n]=v;}};
  const button={disabled:false,textContent:'',closest:()=>card};
  const root={querySelector(sel){return sel==='[data-welcome-back-action]'?button:sel==='[data-welcome-back-card]'?card:null;}};
  const window={};vm.runInNewContext(widget,{window});
  const action=window.BibloZooWelcomeBack.setAction;
  action(root,{busy:true});ok(card.classList.active,'Portrait starts immediately on tap');ok(button.disabled,'Button disabled while processing');eq(card['aria-busy'],'true','Accessible busy state');
  action(root,{retry:true});ok(!card.classList.active,'Portrait stops on failure');ok(!button.disabled,'Retry is enabled');eq(button.textContent,'Try again!','Retry label');
  action(root);ok(!card.classList.active,'Portrait still when ready');eq(button.textContent,"Let's go!",'Default label preserved');
  ok(css.includes('.bz-welcome-card.is-recovering .bz-welcome-avatar-image'),'Only avatar spins');
  ok(css.includes('prefers-reduced-motion: reduce'),'Reduced motion honored');
  ok(css.includes('animation: none;'),'Reduced motion has static state');
  ok(!css.includes('.bz-welcome-card.is-recovering {'),'The whole popup does not spin');
  const ctl=read('verse_games/shared/welcome-back-return.js');
  ok(!ctl.includes('Getting sound ready...') && widget.includes('ZOO_MESSAGES'),'Child-friendly progress text after tap');
  ok(ctl.includes('root.BibloZooWelcomeBack.setAction(overlay, { busy: true });'),'Spinning begins on first gesture');
  ok(ctl.includes('root.BibloZooWelcomeBack.setAction(overlay, { retry: ok !== true });'),'Spinning stops after recovery');
  ok(ctl.includes('ESCAPE_WATCHDOG_MS'),'Back to Games fallback preserved');
}

function testClock() {
  let wall=5000;
  const window={performance:{now:()=>wall},setTimeout};
  vm.runInNewContext(read('verse_games/shared/welcome-back-clock.js'),{window});
  const clock=window.BibloZooWelcomeBackClock.create();
  eq(clock.now(),5000,'Clock begins at actual gameplay time');
  wall+=3000;eq(clock.now(),8000,'Clock runs before interruption');
  clock.pause();wall+=3600000;
  eq(clock.now(),8000,'An hour offscreen consumes no bonus/physics time');
  clock.resume();wall+=100;
  eq(clock.now(),8100,'Clock advances only 100ms after return');
  clock.pause();wall+=20000;
  eq(clock.now(),8100,'Second task switch freezes clock again');
  clock.resume();eq(clock.now(),8100,'No time jump after second switch');
}

(async()=>{ await auditRegistry();testSpinner();testClock();console.log(`Patch 66 external games & spinner: ${checks} checks passed.`);})().catch(err=>{console.error(err);process.exitCode=1;});
