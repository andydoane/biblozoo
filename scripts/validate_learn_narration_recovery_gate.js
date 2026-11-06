"use strict";
// Exercise the actual Learn audio-recovery functions in an isolated media-clock
// harness. Passing this does not establish audible playback on an iPhone.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
let checks = 0;
const eq = (a,b,m) => { assert.equal(a,b,m); checks++; };
const ok = (a,m) => { assert.ok(a,m); checks++; };
const extract = (a,b) => {
  const start=app.indexOf(a), end=app.indexOf(b,start+a.length);
  assert.ok(start>=0 && end>start, "Missing Learn function: "+a);
  return app.slice(start,end);
};
function deferred() {
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
async function flush() { for(let i=0;i<12;i++) await Promise.resolve(); }
function harness(mode="listen") {
  const calls=[],timers=new Map(),media=[];
  let id=0,unlock=()=>Promise.resolve(true);
  const Screen={LISTEN:"listen",CHUNKS:"chunk",ECHO:"echo",MEANING:"meaning",LEARN_INSTRUCTION:"instruction"};
  const State={screen:mode==="listen"?"listen":mode,listenPlaying:mode==="listen",
    chunkRunning:mode==="chunk",echoRunning:mode==="echo",chunkIndex:2,echoIndex:3,
    listenAutoStarting:false,chunkAutoStarting:false,echoAutoStarting:false,
    instructionPlaying:false,audioMode:mode};
  const audioEl={src:"",currentTime:0,paused:true,ended:false,error:null,
    play(){calls.push("play");this.paused=false;return (media.shift()||deferred()).promise;}};
  const document={hidden:false,addEventListener(){}};
  const window={addEventListener(){}};
  const box={State,Screen,audioEl,document,window,calls,Promise,console,
    unlockUI:()=>unlock(),
    setTimeout(fn,ms){const key=++id;timers.set(key,{fn,ms});return key;},
    clearTimeout(key){timers.delete(key);}};
  const mock=[
    "let muted=false,learnMenuOpen=false,learnAudioInterrupted=null,learnAudioResumeAttempt=null;",
    "let learnAudioResumeError='',learnShortInstructionNeedsRender=false,activeLearnInstructionRequest=null;",
    "function syncLearnAudioResumeOverlay(){calls.push('sync');}",
    "function render(){calls.push('render');}",
    "function cancelLearnAudio(){calls.push('cancel');audioEl.paused=true;State.chunkRunning=false;State.echoRunning=false;State.listenPlaying=false;}",
    "function toggleMute(){muted=false;calls.push('unmute');}",
    "function unlockAppAudio(){calls.push('unlock');return unlockUI();}",
    "function applyMute(){}",
    "function showDialog(){throw Error('Unexpected generic dialog');}",
    "function dlgBtn(){} function closeDialog(){}",
    "function isLearnAudioOverlayRecovery(r){return !!r && r.screen===State.screen && ['listen','chunk','echo'].includes(r.mode);}",
    "function listenPlay(m){learnAudioInterrupted=null;State.listenPlaying=true;audioEl.src='listen.mp3';audioEl.currentTime=0;void safePlay().catch(()=>{});}",
    "function startChunkFlow(){const i=learnAudioInterrupted.index;learnAudioInterrupted=null;State.chunkRunning=true;audioEl.src='chunk'+i+'.mp3';audioEl.currentTime=0;void safePlay().catch(()=>{});}",
    "function startEchoFlow(){const i=learnAudioInterrupted.index;learnAudioInterrupted=null;State.echoRunning=true;audioEl.src='echo'+i+'.mp3';audioEl.currentTime=0;void safePlay().catch(()=>{});}",
  ].join("\n");
  const code=mock+"\n"+extract("function safePlay() {","function setAudioSrc(src) {")+
    "\n"+extract("function clearLearnAudioResumeTimers(attempt) {","function waitForAudioEnd() {")+
    "\nthis.api={setRecovery:r=>learnAudioInterrupted=r,getRecovery:()=>learnAudioInterrupted,"+
    "getAttempt:()=>learnAudioResumeAttempt,getError:()=>learnAudioResumeError,"+
    "resumeInterruptedLearnAudio,pauseLearnAudioForInterruption};";
  vm.createContext(box);vm.runInContext(code,box);
  box.api.setRecovery({screen:State.screen,mode,index:mode==="echo"?3:2,listenMode:"listen_verse"});
  return {calls,timers,State,audioEl,document,api:box.api,
    media:p=>media.push(p),ui:fn=>{unlock=fn;},
    fire:ms=>{const entry=[...timers].find(([,t])=>t.ms===ms);
      ok(!!entry,"expected timer "+ms);timers.delete(entry[0]);entry[1].fn();}
  };
}
async function uiFailureDoesNotVeto() {
  const h=harness(),p=deferred();h.media(p);
  h.ui(()=>Promise.reject(Error("UI clock frozen")));
  eq(h.api.resumeInterruptedLearnAudio(),true,"tap starts playback");
  ok(h.calls.includes("play"),"narration starts in same gesture");
  p.resolve();await flush();
  ok(!!h.api.getAttempt(),"play() resolution alone cannot succeed");
  h.audioEl.currentTime=.01;h.fire(80);
  ok(!!h.api.getAttempt(),"insufficient progress cannot succeed");
  h.audioEl.currentTime=.15;h.fire(80);
  eq(h.api.getAttempt(),null,"advancing narration succeeds despite UI failure");
  eq(h.timers.size,0,"success clears all timers");
  eq(h.calls.includes("cancel"),false,"no playback cancellation on success");
}
async function pendingUIUnlockDoesNotVeto() {
  const h=harness("echo"),p=deferred(),never=deferred();h.media(p);
  h.ui(()=>never.promise);h.api.resumeInterruptedLearnAudio();
  p.resolve();await flush();h.audioEl.currentTime=.13;h.fire(80);
  eq(h.api.getAttempt(),null,"unresolved UI unlock does not block narration");
}
async function stalledNarrationMustFail() {
  const h=harness("chunk"),p=deferred();h.media(p);
  h.api.resumeInterruptedLearnAudio();p.resolve();await flush();
  h.fire(80);ok(!!h.api.getAttempt(),"frozen media is not verified");
  h.fire(3500);
  eq(h.api.getAttempt(),null,"frozen media times out");
  eq(h.api.getRecovery().index,2,"retry preserves chunk index");
  ok(/try again/i.test(h.api.getError()),"retry feedback preserved");
  eq(h.timers.size,0,"timeout clears poll");
  eq(h.calls.includes("cancel"),true,"failed playback stopped");
}
async function rejectedPlayStillFails() {
  const h=harness(),p=deferred();h.media(p);
  h.api.resumeInterruptedLearnAudio();
  p.reject(Object.assign(Error("blocked"),{name:"NotAllowedError"}));await flush();
  eq(h.api.getAttempt(),null,"rejected media is a failed attempt");
  eq(h.api.getRecovery().listenMode,"listen_verse","original mode preserved");
}
async function staleAndSwappedMedia() {
  const h=harness("chunk"),first=deferred(),second=deferred();h.media(first);
  h.api.resumeInterruptedLearnAudio();
  h.document.hidden=true;h.api.pauseLearnAudioForInterruption();
  eq(h.api.getAttempt(),null,"new interruption cancels old attempt");
  eq(h.timers.size,0,"background clears watchdog");
  h.document.hidden=false;h.media(second);h.api.resumeInterruptedLearnAudio();
  first.resolve();await flush();h.audioEl.currentTime=.13;
  ok(!!h.api.getAttempt(),"stale play result cannot verify new attempt");
  second.resolve();await flush();
  // Playback time already advanced before play() resolved, so the real
  // verifier should succeed immediately without scheduling another poll.
  eq(h.api.getAttempt(),null,"current media progress verifies current attempt");
  const changed=harness(),p=deferred();changed.media(p);
  changed.api.resumeInterruptedLearnAudio();changed.audioEl.src="unrelated.mp3";
  changed.audioEl.currentTime=9;p.resolve();await flush();
  ok(!!changed.api.getAttempt(),"swapped source is rejected");
  changed.fire(3500);
  eq(changed.api.getRecovery().mode,"listen","source swap requires retry");
}
function staticContracts() {
  ok(app.includes("clearLearnAudioResumeTimers(learnAudioResumeAttempt);"),"navigation cleans polling");
  ok(!app.includes("!attempt.playStarted ||"),"old UI/narration double gate removed");
  ok(app.includes("const startingTime = Number(audioEl.currentTime) || 0;"),"preplay baseline captured");
}
(async()=>{await uiFailureDoesNotVeto();await pendingUIUnlockDoesNotVeto();
  await stalledNarrationMustFail();await rejectedPlayStillFails();
  await staleAndSwappedMedia();staticContracts();
  console.log("Learn narration recovery validation passed ("+checks+" checks).");
})().catch(e=>{console.error(e);process.exitCode=1;});
