#!/usr/bin/env node
"use strict";
/* Patch 72.1C.3: optional Zoo sounds reuse EXISTING advancing owner audio.
 * No context allocation, activation, resume, recovery or reward side effects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT,file),'utf8');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const engine=read('verse_games/shared/welcome-back-zoo-escape.js');
const adapter=read('verse_games/shared/welcome-back-return.js');
const feeding=read('daily_questions_feed_game.js');
const sw=read('service-worker.js');
ok(!engine.includes('new AudioContext') && !engine.includes('.resume()') &&
  !engine.includes('.setCategory('), 'sound effects do not allocate, activate or resume audio');
ok(engine.includes('audio - prior.audio > 0.03'), 'passively advancing audio clock required');
ok(engine.includes('context.state !== "running"'), 'suspended contexts rejected');
ok(engine.includes('isSoundMuted()'), 'activity mute respected');
ok(engine.includes('soundClockSample = null'), 'stalled/suspended clock sample reset');
ok(engine.includes('soundLastAt < (kind === "bounce" ? 180 : 85)'), 'sound overlap limited');
ok(engine.includes('oscillator.stop(start + 0.105)'), 'oscillators are bounded');
ok(engine.includes('oscillator.onended'), 'audio nodes disconnected on completion');
ok(engine.includes('if (typeof soundIsReady === "function")'), 'Feeding owner hooks keep priority');
for(const token of ['soundIsReady: () => zooEscapeSoundReady(runtime)',
  'onPop: () => playZooEscapeSound(runtime, "pop")',
  'onBounce: () => playZooEscapeSound(runtime, "bounce")'])
  ok(feeding.includes(token), `unchanged Feeding owner hook: ${token}`);
for(const token of ['getSoundContext, isSoundMuted','getSoundContext, isSoundMuted,','overlay, profileId, pictureBase, name, petName, verseId'])
  ok(adapter.includes(token), `shared return adapter forwards ${token}`);
const games=['bible_bugs','dino_dash','foodslice','tower_bible','traffic_tap',
  'verse_invaders','verse_launch','verse_munch','verse_scramble_neo','verse_snake',
  'verse_splat','versey_bird'];
for(const game of games){
  const js=read(`verse_games/${game}/game.js`);
  const context=game==='verse_splat'?'verseSplatAudioContext':game==='verse_snake'?'audioContext':'audioCtx';
  const start=js.indexOf('window.BibloZooWelcomeBackReturn?.attach?.({');
  ok(start>=0, `${game}: return controller present`);
  const options=js.slice(start,start+550);
  ok(options.includes(`getSoundContext: () => ${context}`),`${game}: existing audio object, not an allocating getter`);
  ok(options.includes('isSoundMuted: () => muted'),`${game}: honors mute setting`);
}
const shell=read('verse_games/shared/game-shell.js');
ok(shell.includes('getSoundContext: options.getAudioContext'), 'five Playground apps reuse their own existing context getter');
ok(shell.includes('isSoundMuted: options.isMuted'), 'Playground honors activity mute');
for(const game of ['ghost_writer','scripture_scrub','verse_jam','verse_typer','wheel_of_bible']){
  const js=read(`verse_playground/${game}/game.js`);
  ok(js.includes('getAudioContext: () =>'),`${game}: owner exposes its existing context`);
  ok(js.includes('isMuted: () =>'),`${game}: owner supplies mute state`);
}
const app=read('app.js'),readMy=read('read_my_verse.js'),cards=read('flashcards/flashcards.js');
ok(app.includes('getSoundContext: () => appAudioUnlocked && !appAudioRecoveryPending'), 'Learn reuses previously verified app engine');
ok(app.includes('getExistingAudioContext: () => appAudioUnlocked && !appAudioRecoveryPending'), 'main app exposes read-only current sound engine');
ok(readMy.includes('getSoundContext: () => scrambleAudioContext?.state === "running"'), 'Read My Verse uses already-present playback context');
ok(readMy.includes('appApi?.getExistingAudioContext?.()'), 'Read My Verse fallback reuses existing app engine');
ok(cards.includes('getSoundContext: () => api?.getExistingAudioContext?.()'), 'Flashcards acknowledgement uses existing app engine only');
ok(cards.includes('isSoundMuted: () => api?.isMuted?.() === true'), 'Flashcards does not sound when muted');
ok(/const CACHE_VERSION = "2026_[^"\n]*patch72_1(?:c|d)/.test(sw), 'service worker uses new offline cache revision');
for(const file of ['welcome-back-zoo-escape.js','welcome-back-return.js'])
  ok(sw.includes(`"./verse_games/shared/${file}"`),`sound changes precached ${file}`);
// Reuse actual DOM/controller fixture to exercise Web Audio gating, not simply
// check for source tokens. No browser audio APIs or native session are mocked.
const fixture=read('scripts/validate_patch72_1a_zoo_escape.js');
const start=fixture.indexOf('function harness('),end=fixture.indexOf('\nasync function run(){',start);
ok(start>=0&&end>start,'real Stage 2/3 controller model available');
let model=fixture.slice(start,end);
const before='profileId:"p1",petName:"Milo",soundIsReady:()=>!!options.soundReady,onPop:()=>fired.push("pop"),onBounce:()=>fired.push("bounce"),reducedMotion:!!options.reduced';
const after='profileId:"p1",petName:"Milo",getSoundContext:()=>options.soundContext,isSoundMuted:()=>!!options.muted,reducedMotion:!!options.reduced';
ok(model.includes(before),'fixture exposes old explicit Feeding-only hooks');
model=model.replace(before,after);
const tick='time=Math.min(time+40,target);';
ok(model.includes(tick),'fixture contains simulated animation clock');
model=model.replace(tick,tick+' if(options.soundContext && options.soundContext.advanceClock!==false)options.soundContext.currentTime=time/1000;');
const scope={vm,engine,Math,Date,Promise,URL,console,checks:0,ok:()=>{},eq:()=>{}};
vm.runInNewContext(model+'\nthis.makeHarness=harness;',scope);
function context(){
  const entries={notes:[],started:0,stopped:0,disconnected:0};
  const gainParam={setValueAtTime(){},exponentialRampToValueAtTime(){}};
  const c={state:'running',currentTime:0,destination:{},entries,
    createOscillator(){
      entries.notes.push('oscillator');
      return {frequency:{setValueAtTime(f){entries.notes.push(f);}},connect(){},
        start(){entries.started++;},stop(){entries.stopped++;},
        disconnect(){entries.disconnected++;},onended:null};
    },
    createGain(){return {gain:gainParam,connect(){},disconnect(){}};}};
  return c;
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
(async()=>{
  {
    const audio=context(),h=scope.makeHarness([false],{soundContext:audio});
    h.ctl.start();h.button.trigger('click');await flush();
    eq(h.ctl.getStage(),'escape','failed recovery enters Stage 2');
    h.advance(3000);
    ok(audio.entries.started>0,'existing advancing context plays short notes on pet bounce');
    eq(audio.entries.started,audio.entries.stopped,'all oscillator voices stop on schedule');
    ok(audio.entries.notes.some(n=>typeof n==='number'&&n>=523&&n<=1568), 'uses Feeding pitch palette');
    h.ctl.destroy();
  }
  for(const [name,alter] of [
    ['suspended',c=>{c.state='suspended';}],
    ['stalled',c=>{c.advanceClock=false;}],
    ['missing',c=>{}],
    ['muted',c=>{}]
  ]){
    const audio=context();alter(audio);
    const opts={soundContext:name==='missing'?null:audio,muted:name==='muted'};
    const h=scope.makeHarness([false],opts);
    h.ctl.start();h.button.trigger('click');await flush();h.advance(3000);
    eq(audio.entries.started,0,`${name}: never schedules cosmetic sound`);
    h.ctl.destroy();
  }
  {
    const audio=context(),h=scope.makeHarness([false],{soundContext:audio});
    h.ctl.start();h.button.trigger('click');await flush();
    h.advance(300);h.doc.hidden=true;h.doc.emit('visibilitychange');
    const before=audio.entries.started;
    h.advance(3000);
    eq(audio.entries.started,before,'hidden document cannot play sounds');
    h.ctl.destroy();
  }
  console.log(`Patch 72.1C.3 Zoo Escape sounds: ${checks} checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
