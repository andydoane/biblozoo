/* Patch 69.2: one-tap Wacky Replay recovery, quiet preload, and cancellation. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname,'../flashcards/audio-effects.js'),'utf8');
const counter = { value:0 };
function check(value,message) { assert.ok(value,message); counter.value++; }
function eq(actual,expected,message) { assert.equal(actual,expected,message); counter.value++; }
const tick = (ms=20) => new Promise(resolve=>setTimeout(resolve,ms));
function harness(mode) {
  const contexts=[];
  const diagnostics=[];
  const events={ doc:{}, win:{} };
  let nativeCalls=0, importCalls=0, microphoneRequests=0, started=0;
  let hidden=false, activated=false, settleTicks=0;
  const doc = {
    get hidden(){ return hidden; }, set hidden(value){hidden=value;},
    currentScript:{src:'https://example.test/flashcards/audio-effects.js'},
    baseURI:'https://example.test/',
    addEventListener(name,cb){(events.doc[name]??=[]).push(cb);}
  };
  const w = {
    Capacitor:{getPlatform:()=> 'ios',isNativePlatform:()=> true},
    AudioWorkletNode:class {},
    BibloZooAudioDiagnostics:{record(type,data={}){diagnostics.push({type,...data});}},
    addEventListener(name,cb){(events.win[name]??=[]).push(cb);},
    setTimeout(fn,ms) {
      const delay=ms>=2000?65:ms>=400?6:ms>=180?2:ms;
      return setTimeout(()=>{if(activated)settleTicks++;fn();},delay);
    },
    clearTimeout,
    navigator:{mediaDevices:{getUserMedia(){microphoneRequests++;throw new Error('no microphone allowed');}}}
  };
  function node() {return {connect(){},disconnect(){}};}
  class Context {
    constructor() {this.id=contexts.length+1;this.state='running';this.destination=node();this.clock=0;contexts.push(this);}
    get currentTime() {
      const available=mode==='healthy' ||
        (mode==='late' && activated && settleTicks>=3) ||
        (mode==='fresh' && this.id===2) ||
        (mode==='cancel' && activated && settleTicks>=4);
      if(available) this.clock+=0.08;
      return this.clock;
    }
    addEventListener(){} removeEventListener(){}
    resume(){this.state='running';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    createBufferSource() {
      return {connect(){},disconnect(){},stop(){},onended:null,
        playbackRate:{value:1},start(){
          // The worklet receives a render heartbeat only after playback starts.
          setTimeout(()=>{
            for(const n of worklets) n.emitMetrics();
            this.onended?.();
          },1);
        }};
    }
    createGain(){return {...node(),gain:{value:1}};}
    decodeAudioData(){return Promise.resolve({duration:0.5,numberOfChannels:1,length:8000,
      sampleRate:8000,getChannelData:()=>new Float32Array(8000)});}
  }
  const worklets=[];
  class SoundTouchNode {
    static register(){return Promise.resolve();}
    constructor(){this.listeners={};this.metrics={blockCount:0,outputPeak:0.04,outputRms:0.02};
      this.playbackRate={value:1};this.pitchSemitones={setValueAtTime(){},cancelScheduledValues(){}};
      worklets.push(this);}
    addEventListener(name,handler){this.listeners[name]=handler;}
    removeEventListener(name){delete this.listeners[name];}
    connect(){} disconnect(){}
    emitMetrics(){this.metrics.blockCount++;this.listeners.metrics?.({detail:this.metrics});}
  }
  w.AudioContext=Context;
  w.__patch69_2Import=()=>{importCalls++;return Promise.resolve({SoundTouchNode});};
  w.BibloZooAudioRecoveryCoordinator={
    isAvailable:()=>true,
    async recoverAfterStall({probe,isCurrent}) {
      nativeCalls++;
      check(isCurrent(),'recovery remains owned by the foreground tap');
      if(mode==='pending')return {recovered:false,reason:'interruption-pending'};
      if(mode==='cooldown')return {recovered:false,reason:'native-cooldown'};
      activated=true;
      if(mode==='cancel') {hidden=true;(events.doc.visibilitychange||[]).forEach(cb=>cb());}
      return {recovered:await probe(),reason:'clock-stalled'};
    },
    async getInterruptionState(){return {available:true,pending:mode==='pending'};}
  };
  const instrumented=code.replace('import(\n        soundTouchModuleUrl\n      )','window.__patch69_2Import()');
  check(instrumented!==code,'SoundTouch import is test-instrumented without vendor bundle');
  vm.runInNewContext(instrumented,{window:w,document:doc,URL,Blob,Promise,console,setTimeout,clearTimeout});
  const api=w.BibloZooAudioEffects;
  const fire=(target,name)=>{(events[target][name]||[]).forEach(cb=>cb());};
  const play=()=>api.playRecordedVerse(new Blob(['recorded speech']),'squirrel',()=>started++);
  return {api,doc,contexts,diagnostics,play,fire,
    counts:()=>({nativeCalls,importCalls,microphoneRequests,started}),
    hide(){hidden=true;fire('doc','visibilitychange');}};
}
async function main(){
  {
    const h=harness('late');
    eq(h.api.preloadSoundTouch(),true,'quiet preload is available');
    eq(h.contexts.length,0,'quiet preload creates no AudioContext');
    eq(h.counts().nativeCalls,0,'quiet preload does not activate native audio');
    const worked=await h.play();
    eq(worked,true,'first tap plays processed recording after delayed native settlement');
    eq(h.counts().nativeCalls,1,'native recovery is invoked only once');
    eq(h.contexts.length,1,'late settlement needs no replacement context');
    eq(h.counts().started,1,'processor output spends Wacky chance exactly once');
    eq(h.counts().importCalls,1,'preloaded SoundTouch module is reused');
    eq(h.counts().microphoneRequests,0,'playback never requests the mic');
    check(h.diagnostics.some(x=>x.type==='flashcards-wacky-single-tap-recovered'),
      'delayed first-tap recovery is recorded');
  }
  {
    const h=harness('fresh');
    const worked=await h.play();
    eq(worked,true,'first tap can try one new context after native recovery settles');
    eq(h.contexts.length,2,'exactly one fresh AudioContext is created');
    eq(h.contexts[0].state,'closed','initial stalled context is closed');
    eq(h.counts().nativeCalls,1,'fresh context does not repeat native activation');
    eq(h.counts().started,1,'actual processor output confirms first-tap playback');
    check(h.diagnostics.some(x=>x.type==='flashcards-wacky-context-refreshed'),
      'single safe context refresh is diagnosed');
  }
  {
    const h=harness('pending');
    await assert.rejects(h.play());
    eq(h.contexts.length,1,'native interruption prohibits context replacement');
    eq(h.contexts[0].state,'closed','unhealthy context is retired');
    eq(h.counts().started,0,'pending interruption never spends Wacky chance');
    eq(h.counts().nativeCalls,1,'pending interruption gets no extra native activation');
  }
  {
    const h=harness('cooldown');
    await assert.rejects(h.play());
    eq(h.contexts.length,1,'native cooldown prohibits context replacement');
    eq(h.counts().started,0,'cooldown never spends Wacky chance');
    eq(h.counts().nativeCalls,1,'cooldown gets no extra native activation');
  }
  {
    const h=harness('cancel');
    await assert.rejects(h.play());
    check(true,'backgrounding cancels in-flight Wacky setup');
    eq(h.counts().started,0,'backgrounding never starts delayed playback');
    eq(h.contexts[0].state,'closed','backgrounding closes playback context');
  }
  {
    const h=harness('healthy');
    eq(await h.play(),true,'healthy playback starts without recovery');
    eq(h.counts().nativeCalls,0,'normal Wacky playback leaves native audio alone');
    eq(h.contexts.length,1,'healthy playback uses exactly one context');
  }
  const fc=fs.readFileSync(path.join(__dirname,'../flashcards/flashcards.js'),'utf8');
  check(fc.includes('preloadSoundTouch?.()'),'preload begins only after recording unlocks Wacky Replay');
  check(fc.includes('Getting your wacky voice ready…'),'recovery state is visible on the first tap');
  check(fc.includes('wackyReplayMessage = "";\n      requestRender();'), 'status clears once sound actually starts');
  check(fc.includes('18000'),'startup remains bounded by existing 18-second UI watchdog');
  const record=fs.readFileSync(path.join(__dirname,'../flashcards/recording.js'),'utf8');
  check(record.includes('interruptCapture()'),'capture is still explicitly interrupted, never restarted');
  check(!code.includes('getUserMedia('),'Wacky Replay code never asks for microphone access');
  check(!code.includes('setCategory('),'native SoloAmbient category remains untouched');
  const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
  check(sw.includes('2026_Oct_26_patch69_2_wacky_single_tap'),'cache version identifies this patch');
  console.log(`Patch 69.2 single-tap Wacky recovery: ${counter.value} checks passed.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
