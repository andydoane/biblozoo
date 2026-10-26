#!/usr/bin/env node
"use strict";
/* Patch 68.2: Wheel of Bible's 22 Web Audio spin ticks must be cancelled,
   never replayed or left running across a task switch. Simulated clocks do
   NOT replace testing real iOS AVAudioSession interruptions on a device. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const read = r => fs.readFileSync(path.join(ROOT, r), 'utf8');
let checks = 0;
function ok(value, msg) { assert.ok(value, msg); checks++; }
function eq(a, b, msg) { assert.equal(a, b, msg); checks++; }
function includes(str, text, msg) { ok(str.includes(text), msg); }
async function microtasks() { for (let i=0; i<24; i++) await Promise.resolve(); }

async function wheelHarness() {
  let wall = 0, nextId = 0, nextOsc = 0;
  const timers = new Map();
  const voices = [];
  const events = [];
  let animationPaused = 0, animationPlayed = 0;
  const animation = {playState:'running',pause(){this.playState='paused';animationPaused++},play(){this.playState='running';animationPlayed++}};
  const setTimeoutFake = (fn, ms=0) => {const id=++nextId;timers.set(id,{fn,at:wall+Math.max(0,Number(ms)||0)});return id};
  const clearTimeoutFake = id=>timers.delete(id);
  const performance={now:()=>wall};
  const wheelButton={disabled:false};
  const wheel={style:{vars:{},setProperty(k,v){this.vars[k]=v}}};
  const app={classList:{add(){}},getAnimations(){return [animation]},innerHTML:''};
  const doc={hidden:false,body:{appendChild(){}},
    createElement(tag){return {preload:'',playsInline:false,style:{},setAttribute(){},pause(){},load(){},
      play(){return Promise.resolve()},getAttribute(){return null}}},
    getElementById(id){return ({app,spinWheelBtn:wheelButton,gameWheel:wheel})[id] || null},
    addEventListener(){},querySelector(){return null}};
  class Gain {
    constructor(){this.gain={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};this.disconnected=false}
    connect(){} disconnect(){this.disconnected=true}
  }
  class Osc {
    constructor(ctx){this.ctx=ctx;this.id=++nextOsc;this.onended=null;this.disconnected=false;this.started=false;this.endAt=null;this.immediateStopped=false;
      this.frequency={setValueAtTime(){}};voices.push(this)}
    connect(){} disconnect(){this.disconnected=true}
    start(){this.started=true}
    stop(t){ if (t===undefined) {this.immediateStopped=true;this.endAt=wall;this.onended?.()} else this.endAt=t*1000; }
  }
  class AudioContext {
    constructor(){this.state='running';this.destination={};}
    get currentTime(){return wall/1000}
    createGain(){return new Gain()}
    createOscillator(){return new Osc(this)}
    resume(){this.state='running';return Promise.resolve()}
    close(){this.state='closed';return Promise.resolve()}
  }
  const win={performance,setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake,
    AudioContext,VerseGameShell:{gameIconImageHtmlForId(){return'<img>'},renderTitleScreen(){},
       attachPlaygroundWelcomeBack(options){this.welcomeOptions=options;return {isPaused(){return false}}}},
    VerseGameBridge:{getVerseContext:async()=>({verseId:'john_11_35',verseText:'Jesus wept',verseRef:'John 11:35'})},
    BibloZooAudioDiagnostics:{record:(type,data)=>events.push({type,data})},
    __testSpinFinished:null,addEventListener(){}};
  const fakeMath=Object.create(Math); fakeMath.random=()=>0.01; // cash segment, not prize preload
  const context={window:win,document:doc,console,Math:fakeMath,setTimeout:setTimeoutFake,
    clearTimeout:clearTimeoutFake,setInterval:()=>1,clearInterval(){},
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance,
    localStorage:{getItem(){return null}}};
  vm.runInNewContext(read('verse_games/shared/welcome-back-clock.js'),context,{filename:'welcome-back-clock.js'});
  // Export only test-local lexical hooks. Production game.js is unchanged by
  // this instrumentation and never exposes its state on window.
  const game=read('verse_playground/wheel_of_bible/game.js');
  const marker='  renderIntro();\n})();';
  eq(game.split(marker).length,2,'Wheel boot exposes one deterministic injection point');
  const instrumented=game.replace('    await renderSpinResult(result);',
    '    if (window.__testSpinFinished) { window.__testSpinFinished(result); return; }\n    await renderSpinResult(result);')
    .replace(marker,`  window.__test = {
      spinWheel, pauseWheelForReturn, resumeWheelAfterReturn, replaceWheelWelcomeContext,
      scheduleRemainingSpinTicks, clearSpinAudio, stopLiveTones,
      playTone, gameNow, getState: () => ({spinning:wheelSpinPending,
        result:state.selectedSpin, tick:nextSpinTick, at:spinStartedAt,
        pendingTicks:spinTickTimers.size, activeTones:activeToneSources.size,
        paused:welcomePaused}), setMuted: v=>{muted=v}
    };\n${marker}`);
  await vm.runInNewContext(instrumented,context,{filename:'wheel_of_bible/game.js'});
  const api=win.__test;
  async function advance(ms) {
    const end=wall+ms;
    let cycles=0;
    while(true){
      let id=0, first=Infinity;
      for (const [k,t] of timers) if(t.at <= end && t.at < first){first=t.at;id=k}
      if(!id)break;
      if(++cycles>5000)throw new Error('Runaway fake timer scheduler');
      wall=first;
      for(const osc of voices)if(osc.started&&!osc.immediateStopped&&osc.endAt!==null&&osc.endAt<=wall&&osc.onended){const cb=osc.onended;osc.onended=null;cb()}
      const item=timers.get(id);timers.delete(id);
      item.fn();await microtasks();
    }
    wall=end;
    for(const osc of voices)if(osc.started&&!osc.immediateStopped&&osc.endAt!==null&&osc.endAt<=wall&&osc.onended){const cb=osc.onended;osc.onended=null;cb()}
    await microtasks();
  }
  return {api,advance,voices,timers,events,wheel,doc,window:win,
    animations:()=>({paused:animationPaused,played:animationPlayed})};
}

async function testSpinCleanupAndResynchronization(){
  const h=await wheelHarness();
  ok(h.api,'Wheel game boots with test hooks');
  const spinning=h.api.spinWheel();
  await microtasks();
  eq(h.api.getState().spinning,true,'Spin enters active state');
  eq(h.api.getState().pendingTicks,22,'Unmuted spin queues all 22 short ticks initially');
  await h.advance(340);
  ok(h.voices.filter(o=>o.started).length>=4,'Unmuted spin actually creates Web Audio sources');
  const before=h.api.getState();
  ok(before.tick>=4,'Spin tracks the next unplayed tick');
  const angle=h.wheel.style.vars['--spin-deg'];
  ok(/deg$/.test(angle),'Wheel retains selected rotational target');
  const countBefore=h.voices.length;
  h.api.pauseWheelForReturn();
  const frozen=h.api.getState();
  eq(frozen.paused,true,'Task switch enters paused state');
  eq(frozen.pendingTicks,0,'All pending spin tick timers are CANCELLED, not merely frozen');
  eq(frozen.activeTones,0,'All active oscillators are stopped and disconnected');
  ok(h.voices.filter(o=>o.immediateStopped).length>=1,'An in-flight oscillator was stopped immediately');
  ok(h.events.some(e=>e.type==='wheel-spin-audio-paused' && e.data.spinActive && e.data.cancelledTicks>0),'Interruption reports canceled tick count');
  const frozenGameTime=h.api.gameNow();
  await h.advance(60000);
  eq(h.api.gameNow(),frozenGameTime,'One minute away does not advance wheel clock');
  eq(h.voices.length,countBefore,'Background cannot create another tone');
  eq(h.api.getState().result,null,'Interrupted spin does not award a result');
  eq(h.wheel.style.vars['--spin-deg'],angle,'Wheel target is preserved while paused');
  eq(h.animations().paused,1,'Wheel animation is paused');
  h.api.resumeWheelAfterReturn();
  eq(h.animations().played,1,'Wheel animation is resumed');
  eq(h.api.getState().pendingTicks,22-frozen.tick,'Only unplayed FUTURE spin ticks get rescheduled');
  eq(h.voices.length,countBefore,'No sound burst is emitted at the instant of resume');
  await h.advance(98);
  eq(h.voices.length,countBefore+1,'Only the next future tick plays after resumption');
  const firstCycleVoices=h.voices.length;
  h.api.pauseWheelForReturn();
  eq(h.api.getState().pendingTicks,0,'Second background immediately cancels rescheduled ticks');
  await h.advance(9000);
  eq(h.voices.length,firstCycleVoices,'Second task switch produces no hidden sounds');
  h.api.resumeWheelAfterReturn();
  eq(h.api.getState().result,null,'Multiple task switches preserve selected-spin pending state');
  h.api.pauseWheelForReturn();
  eq(h.api.getState().pendingTicks,0,'Third task switch cannot leak scheduling');
  let awarded=null;
  h.window.__testSpinFinished=result=>{awarded=result};
  await h.advance(45000);
  eq(awarded,null,'Long background time never finishes a pending spin');
  h.api.resumeWheelAfterReturn();
  await h.advance(3000);
  await spinning;
  eq(h.api.getState().spinning,false,'Spin completes after its remaining active game time');
  eq(h.api.getState().pendingTicks,0,'Completed spin has no leftover sound callbacks');
  ok(awarded && awarded.kind==='cash' || awarded?.kind==='prize','Spin still awards the original result after multiple returns');
  eq(h.api.getState().result?.label,awarded?.label,'Selected spin result remains consistent with its awarded result');
}

async function testMuteAndContextReplacement(){
  const h=await wheelHarness();
  h.api.setMuted(true);
  void h.api.spinWheel();await microtasks();
  eq(h.api.getState().pendingTicks,0,'Muted spin never schedules Web Audio tick callbacks');
  await h.advance(450);
  eq(h.voices.filter(o=>o.started).length,1,'Muted spin has only the one-time silent unlock oscillator');
  h.api.pauseWheelForReturn();
  eq(h.api.getState().pendingTicks,0,'Muted spin pauses with no audio queue');
  const oldContextCount=h.voices.length;
  eq(h.api.replaceWheelWelcomeContext(),true,'Replacement context can still be created normally');
  eq(h.api.getState().activeTones,0,'Replacing a context clears old effects');
  await h.advance(2400);
  eq(h.voices.length,oldContextCount,'No previous spin sound can run after replacing context');
  ok(h.events.some(e=>e.type==='wheel-spin-old-context-cleaned'),'Replacement cleanup diagnostic exists');
}

async function testAsyncDeferredToneInvalidation(){
  const game=read('verse_playground/wheel_of_bible/game.js');
  includes(game,'generation === toneGeneration && audioCtx === originalContext','Stale async unlocks checked against their original context');
  includes(game,'allowDeferred: false','Spin ticks never initiate asynchronous unlock retries');
  includes(game,'spinSoundGeneration !== generation','Previously scheduled spin callbacks are generation guarded');
  includes(game,'source.osc.stop()','Live sources are stopped on interruption');
  includes(game,'source.osc.disconnect()','Oscillator graph disconnected on interruption');
  includes(game,'source.gain.disconnect()','Gain graph disconnected on interruption');
  includes(game,'cancelGameTimeout(token)','Queued spin sounds actually canceled');
  includes(game,'spinStartedAt + i * SPIN_TICK_SPACING_MS - gameNow()','Rescheduling uses virtual remaining time');
  const sw=read('service-worker.js');
  includes(sw,'2026_Oct_26_patch69_1_wacky_recovery','Service worker invalidates cached wheel code');
  includes(sw,'./verse_playground/wheel_of_bible/game.js','Wheel of Bible code stays in offline precache');
}

(async()=>{
  await testSpinCleanupAndResynchronization();
  await testMuteAndContextReplacement();
  await testAsyncDeferredToneInvalidation();
  console.log(`Patch 68.2: ${checks} checks passed`);
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
