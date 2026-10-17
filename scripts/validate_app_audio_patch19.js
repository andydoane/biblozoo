"use strict";

// Patch 19 focused behavioral regressions. No browser or network required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
let checks = 0;
function check(condition, expected, message) {
  assert.equal(condition, expected, message);
  checks++;
}
function includes(text, pattern, message) {
  assert.match(text, pattern, message);
  checks++;
}
function extract(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Expected source range ${start}`);
  return source.slice(a, b);
}
function harness(code, values, names) {
  const box = { Promise, console, ...values };
  vm.createContext(box);
  vm.runInContext(`${code}\nthis.api = { ${names.join(", ")} };`, box);
  return box;
}
async function flush() { for (let i=0;i<12;i++) await Promise.resolve(); }

function appHarness() {
  const calls = [], timers = new Map(), events = {};
  let nextId = 0, resumeMode = "success", pending = null;
  const contexts = [];
  class MockContext {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
      contexts.push(this);
    }
    resume() {
      calls.push("resume");
      if (resumeMode === "reject") return Promise.reject(Error("blocked"));
      if (resumeMode === "pending") return new Promise(resolve => { pending = resolve; });
      if (resumeMode === "no-state") return Promise.resolve();
      this.state = "running";
      return Promise.resolve();
    }
    close() { calls.push("close"); this.state = "closed"; return Promise.resolve(); }
  }
  const document = { hidden:false, addEventListener(name,fn) { (events[`document:${name}`] ||= []).push(fn); } };
  const window = { AudioContext: MockContext, addEventListener(name,fn) { (events[`window:${name}`] ||= []).push(fn); } };
  const code = `
    let appAudioContext = null, appAudioUnlocked = false, appAudioUnlockPromise = null;
    let appAudioUnlockGeneration = 0, appAudioRecoveryPending = false;
    let appAudioFreshContextOnGesture = false, appAudioRecoveryFailures = 0;
    function playTinyUnlockBlip(){ calls.push("prime-blip"); }
    function playAppSilenceUnlock(){ calls.push("silent-prime"); return Promise.resolve(false); }
    function preloadUiTapSoundBuffers(){ calls.push("preload"); return Promise.resolve([]); }
    ${extract("function getAppAudioContext() {", "function ensureAppSilenceAudio()")}
    ${extract("// Foreground lifecycle handlers only invalidate", "function playUiTapSound(")}
  `;
  const box = harness(code, { document, window, calls, setTimeout(fn,delay) { const id=++nextId; timers.set(id,{fn,delay}); return id; }, clearTimeout(id) { timers.delete(id); } }, [
    "unlockAppAudio", "markAppAudioInterrupted", "getAppAudioContext", "appAudioStatus:()=>({unlocked:appAudioUnlocked, pending:appAudioRecoveryPending, fresh:appAudioFreshContextOnGesture, failures:appAudioRecoveryFailures, inflight:!!appAudioUnlockPromise})"
  ]);
  return { api:box.api, calls, contexts, timers, document, window,
    mode(v) { resumeMode=v; }, resolve() { assert.ok(pending); pending(); pending=null; },
    emit(name) { for(const fn of events[name] || []) fn(); },
    fire(delay) { const next=[...timers].find(([,x])=>x.delay===delay);assert.ok(next,`expected timer ${delay}`);timers.delete(next[0]);next[1].fn(); }
  };
}

async function testAppReadyAfterRealRunning() {
  const h=appHarness();
  const result=h.api.unlockAppAudio();
  check(h.api.appAudioStatus().unlocked,false,"not unlocked while resume pending");
  check(h.calls[0],"resume","resume must be first audio activation");
  check(h.calls.includes("silent-prime"),true,"optional HTML audio prime still runs");
  check(await result,true,"running context returns ready");
  check(h.api.appAudioStatus().unlocked,true,"confirmed running sets unlock state");
  check(h.timers.size,0,"settled activation releases watchdog");
  check(await h.api.unlockAppAudio(),true,"already running is reusable");
  check(h.calls.filter(x=>x==="resume").length,1,"no duplicate native resume");
}
async function testBlockedAndWrongState() {
  const h=appHarness();
  h.mode("reject");
  check(await h.api.unlockAppAudio(),false,"rejected resume fails");
  check(h.api.appAudioStatus().unlocked,false,"rejection never marks unlocked");
  h.mode("no-state");
  check(await h.api.unlockAppAudio(),false,"settled promise without running state fails");
  check(h.api.appAudioStatus().fresh,true,"two failed attempts request a fresh context");
  h.mode("success");
  check(await h.api.unlockAppAudio(),true,"later user gesture recreates and recovers");
  check(h.contexts.length,2,"fresh AudioContext constructed after repeated failures");
  check(h.calls.includes("close"),true,"failed old context is closed");
}
async function testHangingAndDeduplicated() {
  const h=appHarness();h.mode("pending");
  const first=h.api.unlockAppAudio(), second=h.api.unlockAppAudio();
  check(first===second,true,"overlapping requests share activation promise");
  check(h.calls.filter(x=>x==="resume").length,1,"one native resume in flight");
  h.fire(1100);
  check(await first,false,"hung resume times out and resolves false");
  check(h.api.appAudioStatus().inflight,false,"timeout permits retry");
  h.mode("success");
  check(await h.api.unlockAppAudio(),true,"subsequent gesture retries");
  h.resolve(); await flush();
  check(h.api.appAudioStatus().unlocked,true,"stale native resolution cannot change recovery");
}
async function testRapidAppSwitchAndStaleUnlock() {
  const h=appHarness();h.mode("pending");
  const old=h.api.unlockAppAudio();
  h.document.hidden=true;h.emit("document:visibilitychange");
  check(h.api.appAudioStatus().pending,true,"background marks foreground verification pending");
  check(h.api.appAudioStatus().unlocked,false,"background invalidates readiness");
  h.document.hidden=false;h.emit("document:visibilitychange");
  h.mode("success");
  const current=h.api.unlockAppAudio();
  await flush();
  check(h.api.appAudioStatus().unlocked,false,"foreground success waits for audio clock");
  h.contexts[0].currentTime=0.2;
  h.fire(90);
  check(await current,true,"advancing clock confirms foreground recovery");
  h.resolve();h.fire(1100);
  check(await old,false,"old attempt cannot overwrite newer success");
  check(h.api.appAudioStatus().pending,false,"recovery pending cleared once clock advances");
}
async function testFrozenClockRequiresFreshGesture() {
  const h=appHarness();
  check(await h.api.unlockAppAudio(),true,"baseline starts running");
  h.document.hidden=true;h.emit("document:visibilitychange");
  h.document.hidden=false;h.emit("window:pageshow");
  const first=h.api.unlockAppAudio();await flush();h.fire(90);
  check(await first,false,"running but frozen clock is not success");
  check(h.api.appAudioStatus().fresh,true,"frozen context requests replacement");
  const second=h.api.unlockAppAudio();await flush();
  check(h.contexts.length,2,"fresh gesture replaces frozen audio context");
  h.contexts[1].currentTime=.18;h.fire(90);
  check(await second,true,"new context with advancing clock recovers");
  check(h.contexts[0].state,"closed","old context released");
}
async function testNoHiddenUnlock() {
  const h=appHarness();h.document.hidden=true;
  check(await h.api.unlockAppAudio(),false,"hidden tab never attempts unlock");
  check(h.contexts.length,0,"no context generated while hidden");
  h.emit("window:pagehide");h.document.hidden=false;
  h.emit("window:pageshow");
  check(h.calls.includes("resume"),false,"foreground events don't resume off gesture");
}

function learnHarness() {
  const calls=[], listeners={};
  const Screen={LEARN_INSTRUCTION:"learn_instruction",CHUNKS:"chunks",ECHO:"echo",LISTEN:"listen",MEANING:"meaning"};
  const State={screen:Screen.CHUNKS,chunkRunning:true,chunkIndex:2,chunkDone:false,
    chunkAutoStarting:false,chunkAutoFallbackReady:false,echoRunning:false,echoIndex:1,
    echoAutoStarting:false,echoAutoFallbackReady:false,listenPlaying:false,
    listenAutoStarting:false,listenAutoFallbackReady:false,instructionPlaying:false,
    learnInstructionReady:false,learnInstructionAudioStarted:false,audioMode:"chunk"};
  const document={hidden:false,body:null,getElementById(){return null;},addEventListener(name,fn){(listeners[`d:${name}`] ||= []).push(fn);}};
  const window={addEventListener(name,fn){(listeners[`w:${name}`] ||= []).push(fn);}};
  const code=`
    let learnMenuOpen=false, learnAudioInterrupted=null, learnAudioResumeAttempt=null;
    let learnAudioResumeError="", learnShortInstructionNeedsRender=false;
    let activeLearnInstructionRequest=null, activeLearnAudioWaitCancel=null, echoCancelToken=0, muted=false;
    function render(){ calls.push("render"); }
    function cancelLearnAudio(){calls.push("cancel");echoCancelToken++;State.chunkRunning=false;State.echoRunning=false;State.listenPlaying=false;State.instructionPlaying=false;}
    function startChunkFlow(){calls.push("startChunk:"+learnAudioInterrupted?.index);learnAudioInterrupted=null;}
    function startEchoFlow(){calls.push("startEcho:"+learnAudioInterrupted?.index);learnAudioInterrupted=null;}
    function listenPlay(mode){calls.push("listen:"+mode);learnAudioInterrupted=null;}
    function toggleMute(){muted=false;}
    function unlockAppAudio(){calls.push("unlock");return Promise.resolve(true);}
    ${extract("function isLearnAudioOverlayRecovery(recovery) {", "function waitForAudioEnd()")}
  `;
  const box=harness(code,{document,window,State,Screen,calls,setTimeout:()=>1,clearTimeout:()=>{}},[
    "pauseLearnAudioForInterruption","resumeInterruptedLearnAudio","status:()=>learnAudioInterrupted",
    "attempt:()=>learnAudioResumeAttempt", "complete:()=>{const a=learnAudioResumeAttempt; a.playStarted=true;a.audioReady=true;finishLearnAudioResumeAttempt(a);}",
    "setRecovery:(value)=>learnAudioInterrupted=value","setRequest:(value)=>activeLearnInstructionRequest=value"
  ]);
  return {api:box.api,State,Screen,calls,document,emit(name){for(const fn of listeners[name] || [])fn();}};
}
function testChunkAndEchoInterruption() {
  const h=learnHarness();h.document.hidden=true;h.emit("d:visibilitychange");
  check(h.api.status().mode,"chunk","active chunk captured");
  check(h.api.status().index,2,"interrupted chunk index preserved");
  check(h.State.chunkRunning,false,"active chunk stopped while hidden");
  h.api.pauseLearnAudioForInterruption();
  check(h.calls.filter(x=>x==="cancel").length,1,"duplicate lifecycle event cancels once");
  h.document.hidden=false;h.emit("w:pageshow");
  check(h.calls.includes("render"),true,"foreground renders recovery overlay");
  check(h.calls.some(x=>x.startsWith("startChunk")),false,"no automatic replay on return");
  check(h.api.resumeInterruptedLearnAudio(),true,"gesture accepts chunk recovery");
  check(h.calls.includes("startChunk:2"),true,"chunk resumes interrupted segment");
  check(h.api.resumeInterruptedLearnAudio(),false,"second tap cannot restart twice");
  h.api.complete();
  h.State.screen=h.Screen.ECHO;h.State.echoRunning=true;h.document.hidden=true;
  h.emit("d:visibilitychange");
  check(h.api.status().mode,"echo","echo phase captured");
  check(h.api.status().index,1,"echo segment index preserved");
  h.document.hidden=false;h.api.resumeInterruptedLearnAudio();
  check(h.calls.includes("startEcho:1"),true,"echo resumes its current segment");
}
function testInstructionAndListenRecovery() {
  const h=learnHarness();h.State.screen=h.Screen.LEARN_INSTRUCTION;h.State.learnInstructionAudioStarted=false;
  h.document.hidden=true;h.emit("d:visibilitychange");
  check(h.api.status(),null,"short slide instructions never require replay");
  check(h.State.learnInstructionReady,true,"normal continue button becomes ready");
  h.document.hidden=false;h.emit("w:pageshow");
  check(h.calls.includes("render"),true,"return redraws normal button");
  h.State.screen=h.Screen.MEANING;h.State.instructionPlaying=true;
  h.api.setRequest({key:"chunks1",doneFlag:"chunksIntroDone"});
  h.document.hidden=true;h.emit("d:visibilitychange");
  check(h.api.status(),null,"short meaning narration does not require restart");
  check(h.State.chunksIntroDone,true,"interrupted optional narration is not repeated");
  h.State.screen=h.Screen.LISTEN;h.State.listenPlaying=true;h.State.audioMode="listen_verse";
  h.document.hidden=true;h.emit("d:visibilitychange");
  check(h.api.status().listenMode,"listen_verse","reference and verse steps distinguished");
  h.document.hidden=false;h.api.resumeInterruptedLearnAudio();
  check(h.calls.includes("listen:listen_verse"),true,"spoken verse resumed without replaying reference");
  h.api.setRecovery({screen:h.Screen.CHUNKS,mode:"chunk",index:0});
  check(h.api.resumeInterruptedLearnAudio(),false,"recovery refused on different screen");
}
async function testAudioWaitCancellationAndError() {
  const events={};const audioEl={
    addEventListener(name,fn){(events[name] ||= new Set()).add(fn);},
    removeEventListener(name,fn){events[name]?.delete(fn);},
    emit(name){for(const fn of [...(events[name]||[])])fn();}
  };
  const code=`let activeLearnAudioWaitCancel=null;
    ${extract("function waitForAudioEnd() {", "function waitForPausableDelay(")}`;
  const {api}=harness(code,{audioEl},["waitForAudioEnd","cancel:()=>activeLearnAudioWaitCancel"]);
  const first=api.waitForAudioEnd();
  check(events.ended.size,1,"wait installs completion listener");
  api.cancel()();
  check(await first,false,"background cancels audio-end wait");
  check(events.ended.size,0,"cancel cleans ended listener");
  check(events.error.size,0,"cancel cleans error listener");
  const second=api.waitForAudioEnd();audioEl.emit("ended");
  check(await second,true,"only genuine ended event advances lesson");
  const third=api.waitForAudioEnd();audioEl.emit("error");
  check(await third,false,"media error does not mark completion");
}
async function testChunkCompletionGuard() {
  const calls=[];
  const State={chunkDone:false,chunkPassCount:1,chunkRunning:false,screen:"chunks",chunkIndex:0,audioMode:null};
  const Screen={CHUNKS:"chunks"};let audioSuccess=true;
  const code=`let echoCancelToken=0, learnAudioInterrupted=null;
    ${extract("async function runChunkSequence(startIndex = 0) {", "async function startEchoFlow()")}`;
  const box=harness(code,{State,Screen,AUDIO_FILE:"main.mp3",document:{hidden:false},
    getLearnAudioParts:()=>[{file:"ref"},{file:"part1"},{file:"part2"}],
    render(){},setAudioSrc(file){calls.push(file);},audioEl:{currentTime:0},
    safePlay(){return audioSuccess?Promise.resolve():Promise.reject(Error("blocked"));},
    waitForAudioEnd(){return Promise.resolve(audioSuccess);},
    waitForDuration(){return Promise.resolve(.5);},
    waitForPausableDelay(){return Promise.resolve(true);},
    startLearnInstruction(key){calls.push("next:"+key);},
    showDialog(){}},["runChunkSequence","status:()=>learnAudioInterrupted"]);
  audioSuccess=false;
  await box.api.runChunkSequence(1);
  check(State.chunkPassCount,1,"failed second pass does not increase progress");
  check(calls.includes("next:chunks2"),false,"failed pass never auto-advances");
  check(box.api.status().index,1,"failed audio segment is retryable");
  calls.length=0;audioSuccess=true;
  await box.api.runChunkSequence(1);
  check(State.chunkPassCount,2,"success increments pass count exactly once");
  check(calls.includes("ref"),false,"resumed pass doesn't replay completed reference");
  check(calls.includes("part1"),true,"resumed pass starts at missed chunk");
  check(calls.includes("next:echo1"),true,"finished second pass advances to echo");
}
function testSourceIntegrationGuards() {
  includes(source,/if \(ctx\.state !== "running" \|\| appAudioRecoveryPending \|\| !appAudioUnlocked\) return;/,
    "UI pop requires actual running context");
  includes(source,/if \(!muted\) void unlockAppAudio\(\);/,
    "unmute reattempts audio activation");
  includes(source,/const button = cfg\?\.button \|\| "Continue"/,
    "instruction continue keeps its original label");
  includes(source,/function ensureLearnAudioResumeOverlay\(\)/,
    "interrupted spoken lessons use a fixed overlay");
  includes(source,/isLearnAudioOverlayRecovery\(learnAudioInterrupted\)/,
    "interruption cannot insert a new chunk or echo action row");
  includes(source,/if \(completed && State\.screen === Screen\.CHUNKS/,
    "stage transition depends on genuine completion");
  const worker=fs.readFileSync(path.resolve(__dirname,"../service-worker.js"),"utf8");
  includes(worker,/2026_Oct_16_patch19a_learn_resume_overlay/,
    "Patch 19A service-worker cache version set");
}
(async()=>{
  await testAppReadyAfterRealRunning();
  await testBlockedAndWrongState();
  await testHangingAndDeduplicated();
  await testRapidAppSwitchAndStaleUnlock();
  await testFrozenClockRequiresFreshGesture();
  await testNoHiddenUnlock();
  testChunkAndEchoInterruption();
  testInstructionAndListenRecovery();
  await testAudioWaitCancellationAndError();
  await testChunkCompletionGuard();
  testSourceIntegrationGuards();
  console.log(`Patch 19 shared app and Learn audio validation passed (${checks} checks).`);
})().catch(err=>{console.error(err);process.exitCode=1;});
