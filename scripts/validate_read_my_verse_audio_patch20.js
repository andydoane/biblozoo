"use strict";
// Patch 20 behavioral regressions: run the production module against mocked
// iOS media, lifecycle events, and task timers. No device/network required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "read_my_verse.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "read_my_verse.css"), "utf8");
let checks = 0;
const check = (actual, expected, why) => { assert.equal(actual, expected, why); checks++; };
const match = (actual, expected, why) => { assert.match(actual, expected, why); checks++; };
const flush = async () => { for (let index=0; index<24; index++) await Promise.resolve(); };
const pending = () => {let resolve, reject;const promise = new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function makeHarness() {
  const media = [], timers = new Map(), docEvents = {}, winEvents = {}, elements = new Map();
  let timerId = 0;
  let unlockMode = "success";
  let mediaMode = "success";
  const unlockDeferred = [];
  const mediaDeferred = [];
  let complete = 0, renders = 0;
  let plays = 0;
  const audioEvents = [];
  const classes = () => {
    const values = new Set();
    return {add(v){values.add(v);},remove(v){values.delete(v);},contains(v){return values.has(v);}};
  };
  const button = () => ({ disabled:false, hidden:false, textContent:"", onclick:null });
  const status = () => ({ hidden:true, textContent:"" });
  const doc = {
    hidden: false,
    body:{appendChild(el){elements.set(el.id,el);}},
    addEventListener(name, fn){(docEvents[name] ||= []).push(fn);},
    getElementById(name){return elements.get(name)||null;},
    querySelector(){return null;},
    createElement(tag){
      const el={tagName:tag,hidden:false,innerHTML:"",id:"",className:"",classList:classes(),
        setAttribute(){},querySelector(selector){if(selector==="#readAudioResumeButton")return this.button;
          if(selector==="#readAudioResumeStatus")return this.status;
          if(selector==="#readAudioExitButton")return this.exitButton;return null;}};
      el.button=button();el.status=status();el.exitButton=button();return el;
    }
  };
  const fakeWindow = {
    document:doc,
    BibloZooSafeWordScramble:{isSafeWord:()=>true},
    addEventListener(name, fn){(winEvents[name] ||= []).push(fn);},
  };
  class MockAudio {
    constructor(src){this.src=src;this.currentTime=0;this.ended=false;this.listeners={};this.paused=false;media.push(this);}
    addEventListener(event,fn){(this.listeners[event] ||= []).push(fn);}
    removeAttribute(){}
    load(){}
    setAttribute(){}
    pause(){this.paused=true;}
    play(){
      plays++;
      audioEvents.push("media-play");
      this.paused=false;
      if(mediaMode==="reject")return Promise.reject(Object.assign(Error("not allowed"),{name:"NotAllowedError"}));
      if(mediaMode==="pending"){const d=pending();mediaDeferred.push(d);return d.promise;}
      return Promise.resolve();
    }
    fire(event){for(const fn of this.listeners[event]||[])fn({type:event});}
  }
  fakeWindow.Audio=MockAudio;
  fakeWindow.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;};
  const sandbox = {window:fakeWindow, Audio:MockAudio, Promise, console, Date, Math,
    setTimeout:fakeWindow.setTimeout,clearTimeout(id){timers.delete(id);}};
  // Inject test access only into the VM copy, never into the shipped source.
  const where = source.lastIndexOf("  return Object.freeze({");
  assert.ok(where > 0, "production module has the expected export boundary");
  const code = source.slice(0,where)+`  root.__readTest = {
      state, playCurrentChunk, playChunkSequenceAudio, pauseReadForInterruption,
      playCrawlAudio, playBalloonAudio, playFishAudio,
      startCrawlMusic, stopCrawlMusic, fadeCrawlMusic, restartInterruptedCrawlFromGesture,
      waitForCrawlFanfare, readCrawlMusicClockReady,
      getCrawlMusic:()=>crawlMusic,
      attachReadRecoveryScene, resumeReadAudioFromGesture, scheduleReadSceneTimer, crawlTimer, balloonTimer, fishTimer,
      freezeReadScene, thawReadScene,
      getRecovery:()=>readAudioRecovery, getAttempt:()=>readAudioRecoveryAttempt,
      getActiveAudio:()=>activeAudio, setScene:session=>crawlSession=session,
      setScenes:(kind,session)=>{if(kind==="star_wars")crawlSession=session;
        else if(kind==="balloons")balloonSession=session;else fishSession=session;},
      setNarration:v=>readActiveAnimatedNarration=v,
      resetSession, reportCompletion,
      getEffectsPending:()=>readEffectRecoveryPending
    };\n`+source.slice(where);
  vm.runInNewContext(code,sandbox,{filename:"read_my_verse.js"});
  const api=fakeWindow.__readTest;
  fakeWindow.BibloZooReadMyVerse.initialize({
    isMuted:()=>false,
    unlockAudio(){
      audioEvents.push("ui-unlock");
      if(unlockMode==="fail")return Promise.resolve(false);
      if(unlockMode==="pending"){const d=pending();unlockDeferred.push(d);return d.promise;}
      return Promise.resolve(true);
    },
    requestRender(){renders++;},onContextComplete(){complete++;return true;},
  });
  function setup(activity="typewriter",phase="pause") {
    api.resetSession();
    api.state.verseId="test_verse";api.state.activityId=activity;
    api.state.phase=phase;api.state.chunks=["first words", "other words"];
    api.state.chunkAudioIndices=[0,1];api.state.usesChunkAudio=true;
    api.state.chunkIndex=0;
  }
  function hide(){doc.hidden=true;for(const fn of docEvents.visibilitychange||[])fn();}
  function show(){doc.hidden=false;for(const fn of docEvents.visibilitychange||[])fn();}
  const fireTimer=ms=>{const item=[...timers].find(([,v])=>v.ms===ms);
    assert.ok(item,`timer ${ms} exists`);timers.delete(item[0]);item[1].fn();};
  const overlay=()=>doc.getElementById("readAudioResumeOverlay");
  return {api,media,timers,doc,window:fakeWindow,audioEvents,show,hide,setup,overlay,fireTimer,
    setUnlock:v=>unlockMode=v,setMedia:v=>mediaMode=v,
    unlockDeferred,mediaDeferred,plays:()=>plays,completed:()=>complete,renders:()=>renders,classes};
}

async function testChunkResumesWithoutSkipping() {
  const h=makeHarness();h.setup();h.api.playCurrentChunk();await flush();
  check(h.api.state.phase,"playing","first spoken chunk begins");
  const firstAudio=h.api.getActiveAudio();
  h.hide();
  check(h.api.state.chunkIndex,0,"background preserves current chunk");
  check(firstAudio.paused,true,"background pauses narration");
  check(h.api.state.phase,"pause","interruption holds the chunk");
  h.show();
  check(h.overlay().hidden,false,"return creates overlay");
  check(h.plays(),1,"foreground does not autoplay");
  check(h.overlay().button.textContent,"▶ Resume Audio","expected button label");
  check(h.api.resumeReadAudioFromGesture(),true,"tap starts media in gesture");
  check(h.api.resumeReadAudioFromGesture(),false,"duplicate tap ignored");
  await flush();
  check(h.overlay().hidden,true,"success closes overlay");
  check(h.api.getRecovery(),null,"success clears interruption state");
  check(h.api.state.chunkIndex,0,"restart doesn't advance chunk");
  h.api.getActiveAudio().fire("ended");
  check(h.api.state.chunkIndex,1,"natural end advances exactly once");
  h.api.getActiveAudio()?.fire("ended");
  check(h.api.state.chunkIndex,1,"duplicate ended event cannot advance twice");
  check(h.completed(),0,"no premature completion award");
}

async function testRejectedAndFailedAudio() {
  const h=makeHarness();h.setup();h.api.playCurrentChunk();await flush();h.hide();h.show();
  h.setUnlock("fail");
  check(h.api.resumeReadAudioFromGesture(),true,"retry begins even when shared UI audio is blocked");await flush();
  check(h.overlay().hidden,true,"a working narration closes overlay regardless of shared UI AudioContext");
  check(h.api.state.chunkIndex,0,"shared UI unlock failure does not skip narration");
  h.setup();h.api.playCurrentChunk();await flush();h.hide();h.show();
  h.setMedia("reject");
  h.api.resumeReadAudioFromGesture();await flush();
  check(h.overlay().hidden,false,"HTML NotAllowedError keeps overlay");
  check(h.api.getRecovery()!==null,true,"failed HTML playback retains recovery");
  check(h.overlay().button.disabled,false,"failed HTML play restores button");
  h.setMedia("success");h.api.resumeReadAudioFromGesture();await flush();
  check(h.overlay().hidden,true,"next gesture recovers after rejection");
}

async function testHangingMediaAndAppSwitchRace() {
  const h=makeHarness();h.setup();h.api.playCurrentChunk();await flush();h.hide();h.show();
  h.setMedia("pending");
  check(h.api.resumeReadAudioFromGesture(),true,"begin unresolved media play");
  while ([...h.timers.values()].some(t=>t.ms===1500)) h.fireTimer(1500);
  await flush();
  check(h.overlay().button.disabled,false,"hung HTML play times out, unlocks retry");
  check(h.overlay().hidden,false,"hung HTML play doesn't dismiss overlay");
  h.setMedia("success");h.api.resumeReadAudioFromGesture();await flush();
  check(h.overlay().hidden,true,"fresh tap recovers");
  h.setup();h.api.playCurrentChunk();await flush();h.hide();h.show();
  h.setMedia("pending");h.api.resumeReadAudioFromGesture();await flush();
  h.hide();
  check(h.api.getAttempt(),null,"new background invalidates pending recovery");
  h.show();check(h.overlay().hidden,false,"overlay remains on second return");
  h.setMedia("success");h.api.resumeReadAudioFromGesture();await flush();
  check(h.overlay().hidden,true,"new gesture recovers after repeated app switch");
  h.mediaDeferred[1].resolve();await flush();
  check(h.api.getRecovery(),null,"old resolution cannot affect successful recovery");
}

async function testEarlyEndedWaitsForSuccessfulRecovery() {
  const h=makeHarness();h.setup();h.api.playCurrentChunk();await flush();h.hide();h.show();
  h.setMedia("pending");
  h.api.resumeReadAudioFromGesture();
  h.api.getActiveAudio().fire("ended");
  check(h.api.state.chunkIndex,0,"audio end before media start settles does not advance");
  h.mediaDeferred[0].resolve();await flush();
  check(h.overlay().hidden,true,"recovery succeeds");
  check(h.api.state.chunkIndex,1,"deferred end advances once after recovery");
}

async function testSceneTimerFreezeAndProgress() {
  const h=makeHarness();h.setup("balloons","animating");
  const scene={active:true,wrap:{classList:h.classes()},timers:new Set(),
    items:new Map(),wordTracks:[],balloonTracks:[],fanfareLastProgress:0};
  h.api.setScenes("balloons",scene);
  let fired=0;
  h.api.balloonTimer(scene,()=>fired++,200);
  check(h.timers.size,1,"scene has one pending timer");
  h.hide();check(scene.wrap.classList.contains("read-audio-paused"),true,"scene CSS animations freeze");
  check(h.timers.size,0,"background suspends scene timers");
  h.show();check(h.overlay().hidden,false,"animated mode also offers overlay");
  check(h.api.state.chunkIndex,0,"scene interruption keeps current chunk");
  h.api.resumeReadAudioFromGesture();await flush();
  check(scene.wrap.classList.contains("read-audio-paused"),false,"resume unfreezes CSS animations");
  check(h.timers.size,1,"resume re-arms remaining timer");
  const resumedTimer=[...h.timers][0];
  check(resumedTimer[1].ms>0 && resumedTimer[1].ms<=200,true,"timer kept its remaining delay");
  h.fireTimer(resumedTimer[1].ms);check(fired,1,"resumed timer fires exactly once");
  check(h.completed(),0,"no completion during timer recovery");
  h.api.resetSession();check(h.overlay().hidden,true,"exiting removes pending overlay");
}

async function testSequenceDoesNotConsumeChoice() {
  const h=makeHarness();h.setup("chunk_sequence","sequence_explore");
  const data={activeButtonIndex:-1, fadeButtonIndex:-1};h.api.state.activityData=data;
  let count=0;check(h.api.playChunkSequenceAudio(1,()=>count++),true,"explore audio begins");
  h.hide();check(count,0,"background does not count choice as heard");
  check(data.activeButtonIndex,-1,"interrupted button is not stuck pressed");
  h.show();h.api.resumeReadAudioFromGesture();await flush();
  check(count,0,"resume itself never counts a listened button");
  h.api.getActiveAudio().fire("ended");
  check(count,1,"only hearing resumed audio completes choice");
  check(data.activeButtonIndex,-1,"button releases after hearing");
}

async function testInterruptedAnimatedNarration() {
  for (const [activity,method] of [
    ["balloons","playBalloonAudio"],
    ["fish","playFishAudio"]
  ]) {
    const h=makeHarness();h.setup(activity,"animating");
    const scene={active:true,wrap:{classList:h.classes()},timers:new Set(),items:new Map(),
      wordTracks:[],balloonTracks:[],fanfareLastProgress:0};
    const item={index:0, audioStarted:false,audioDone:false,vanished:false,
      node:{style:{animationPlayState:"",setProperty(){}},remove(){}},
      group:{classList:h.classes(),remove(){}}};
    scene.items.set(0,item);
    h.api.setScenes(activity,scene);
    h.api[method](scene,item);
    check(item.audioStarted,true,`${activity}: narration starts`);
    h.hide();
    check(item.audioStarted,false,`${activity}: unfinished narration is restartable`);
    check(item.audioDone,false,`${activity}: interruption never marks narration heard`);
    h.show();
    h.api.resumeReadAudioFromGesture(); await flush();
    check(item.audioStarted,true,`${activity}: restart launches narration again`);
    check(h.overlay().hidden,true,`${activity}: recovery closes overlay`);
    check(item.audioDone,false,`${activity}: audio completion still pending`);
    check(h.completed(),0,`${activity}: no reward from app switch`);
  }
}

async function testEarlySceneMountInterruption() {
  const h=makeHarness();h.setup("fish","animating");
  h.hide();
  check(h.api.getRecovery().kind,"animated","early animated screen also pauses");
  check(h.api.getRecovery().scene,null,"no original scene yet");
  const scene={active:true,wrap:{classList:h.classes()},timers:new Set(),items:new Map()};
  h.api.attachReadRecoveryScene(scene);
  check(h.api.getRecovery().scene,scene,"mounted scene joins existing pause");
  check(scene.wrap.classList.contains("read-audio-paused"),true,"mounted animations freeze");
  h.show();h.api.resumeReadAudioFromGesture();await flush();
  check(scene.wrap.classList.contains("read-audio-paused"),false,"mounted scene resumes");
}

async function testAutoBlockedAndMarkupSafety() {
  const h=makeHarness();h.setup();h.setMedia("reject");h.api.playCurrentChunk();await flush();
  check(h.overlay().hidden,false,"failed initial autoplay surfaces retry overlay");
  h.setMedia("success");h.api.resumeReadAudioFromGesture();await flush();
  check(h.overlay().hidden,true,"user gesture recovers initial failure");
  match(styles,/\.read-audio-resume-overlay\s*\{[\s\S]*?position:\s*fixed/,
    "overlay stays out of the reading layout");
  match(styles,/\.read-my-verse-screen\.read-audio-paused \*/,
    "animation freeze is scoped to Read My Verse");
  match(fs.readFileSync(path.join(__dirname, "..", "app.js"),"utf8"),/unlockAudio:\s*unlockAppAudio/, "app supplies established Patch 19 unlock");
}

if (require.main === module) (async()=>{
  await testChunkResumesWithoutSkipping();
  await testRejectedAndFailedAudio();
  await testHangingMediaAndAppSwitchRace();
  await testEarlyEndedWaitsForSuccessfulRecovery();
  await testSceneTimerFreezeAndProgress();
  await testSequenceDoesNotConsumeChoice();
  await testInterruptedAnimatedNarration();
  await testEarlySceneMountInterruption();
  await testAutoBlockedAndMarkupSafety();
  console.log(`Patch 20 Read My Verse audio recovery validation passed (${checks} checks).`);
})().catch(error=>{console.error(error);process.exitCode=1;});

module.exports = { makeHarness, flush };
