"use strict";
// Patch 19A: exercise the actual Learn recovery/overlay functions in a small
// DOM + async-media harness. No browser/network required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
let checks = 0;
function check(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
function match(value, pattern, message) { assert.match(value, pattern, message); checks++; }
function extract(begin, end) {
  const a = source.indexOf(begin), b = source.indexOf(end, a + begin.length);
  assert.ok(a >= 0 && b > a, `Missing function boundary: ${begin}`);
  return source.slice(a,b);
}
async function flush() { for(let i=0;i<15;i++) await Promise.resolve(); }
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => {resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function makeDom() {
  const elements = new Map();
  const bodyNodes = [], headNodes = [];
  const make = tag => ({
    tagName:tag.toUpperCase(), hidden:false, disabled:false, textContent:"", innerHTML:"",
    setAttribute(key,value){ this[key]=value; },
    querySelector(selector) {
      if (selector === "#learnAudioResumeButton" || selector === "[data-welcome-back-action]") return this.button;
      if (selector === "#learnAudioResumeStatus") return this.status;
      return null;
    },
  });
  const document={hidden:false,body:{appendChild(e){bodyNodes.push(e);if(e.id)elements.set(e.id,e);
    if(e.id==="learnAudioResumeOverlay"){
      e.button = make("button");e.status=make("p");e.status.hidden=true;
    }
  }},head:{appendChild(e){headNodes.push(e);if(e.id)elements.set(e.id,e);}},
    createElement:make,getElementById(id){return elements.get(id)||null;},
    addEventListener(name,fn){(this.listeners[name] ||= []).push(fn);},listeners:{}};
  const window={listeners:{},addEventListener(name,fn){(this.listeners[name] ||= []).push(fn);}};
  return {document,window,bodyNodes,headNodes,emit(name){
    const [where,event]=name.split(":");
    for(const fn of (where==="document"?document:window).listeners[event]||[])fn();
  }};
}
function makeHarness(mode="chunk") {
  const dom=makeDom(), calls=[], timers=new Map();let timerId=0;
  const Screen={LEARN_INSTRUCTION:"instruction",CHUNKS:"chunks",ECHO:"echo",LISTEN:"listen",MEANING:"meaning"};
  const State={screen:Screen.CHUNKS,chunkRunning:true,chunkIndex:2,chunkPassCount:1,
    echoRunning:false,echoIndex:3,listenPlaying:false,listenAutoStarting:false,
    instructionPlaying:false,learnInstructionReady:false,learnInstructionAudioStarted:false,
    chunkAutoStarting:false,chunkAutoFallbackReady:false,
    echoAutoStarting:false,echoAutoFallbackReady:false,
    listenAutoFallbackReady:false,audioMode:"chunk"};
  if(mode==="echo") {State.screen=Screen.ECHO;State.chunkRunning=false;State.echoRunning=true;State.audioMode="echo";}
  if(mode==="listen") {State.screen=Screen.LISTEN;State.chunkRunning=false;State.listenPlaying=true;State.audioMode="listen_verse";}
  if(mode==="instruction") {State.screen=Screen.LEARN_INSTRUCTION;State.chunkRunning=false;State.instructionPlaying=true;State.learnInstructionAudioStarted=true;State.audioMode="instruction";}
  const audioQueue=[],unlockQueue=[];
  let audioRequest=null,unlockRequest=null;
  const audioEl={play(){calls.push("media-play");audioRequest=audioQueue.shift()||deferred();return audioRequest.promise;}};
  const code=`
    let learnMenuOpen=false, learnAudioInterrupted=null, learnAudioResumeAttempt=null;
    let learnAudioResumeError="",learnShortInstructionNeedsRender=false;
    let activeLearnInstructionRequest=null, activeLearnAudioWaitCancel=null, muted=false;
    let echoCancelToken=0;
    function cancelLearnAudio(){calls.push("cancel");echoCancelToken++;State.chunkRunning=false;
      State.echoRunning=false;State.listenPlaying=false;State.instructionPlaying=false;}
    function render(){calls.push("render");syncLearnAudioResumeOverlay();}
    function toggleMute(){calls.push("unmute");muted=false;}
    function unlockAppAudio(){calls.push("unlock");unlockRequest=unlockQueue.shift()||deferred();return unlockRequest.promise;}
    function listenPlay(mode){calls.push("listen:"+mode);learnAudioInterrupted=null;
      State.listenPlaying=true;State.audioMode=mode;void safePlay().catch(()=>{});}
    async function startChunkFlow(){const index=learnAudioInterrupted?.index;learnAudioInterrupted=null;
      cancelLearnAudio();State.chunkRunning=true;State.chunkIndex=index;calls.push("chunk:"+index);
      try {await safePlay();}catch(err){} }
    async function startEchoFlow(){const index=learnAudioInterrupted?.index;learnAudioInterrupted=null;
      cancelLearnAudio();State.echoRunning=true;State.echoIndex=index;calls.push("echo:"+index);
      try {await safePlay();}catch(err){} }
    function applyMute(){}
    ${extract("function safePlay() {", "function setAudioSrc(src) {")}
    ${extract("function isLearnAudioOverlayRecovery(recovery) {", "function waitForAudioEnd() {")}
    this.api={getRecovery:()=>learnAudioInterrupted,getAttempt:()=>learnAudioResumeAttempt,
      getError:()=>learnAudioResumeError,render,syncLearnAudioResumeOverlay,resumeInterruptedLearnAudio,
      pauseLearnAudioForInterruption,getShortRender:()=>learnShortInstructionNeedsRender,
      setRequest:v=>activeLearnInstructionRequest=v,
      setMenu:v=>learnMenuOpen=v,setMuted:v=>muted=v,getMuted:()=>muted,
      abandon(){learnAudioInterrupted=null;learnAudioResumeAttempt=null;syncLearnAudioResumeOverlay();}};
  `;
  const box={Promise,console,calls,State,Screen,IMG_DIR:"verse_images/",document:dom.document,
    window:dom.window,audioEl,audioQueue,unlockQueue,muted:false, setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},
    clearTimeout(id){timers.delete(id);}};
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,"../verse_games/shared/welcome-back.js"),"utf8"),box);
  vm.runInContext(code,box);
  return {...dom,calls,timers,State,Screen,api:box.api,
    overlay(){return dom.document.getElementById("learnAudioResumeOverlay");},
    pushAudio(p){audioQueue.push(p);},pushUnlock(p){unlockQueue.push(p);},
    hide(){dom.document.hidden=true;dom.emit("document:visibilitychange");},
    show(){dom.document.hidden=false;dom.emit("document:visibilitychange");},
    fireTimer(ms){const next=[...timers].find(([,e])=>e.ms===ms);assert.ok(next,`Expected timer ${ms}`);timers.delete(next[0]);next[1].fn();},
  };
}
async function testOverlayIndependentOfLayout() {
  const h=makeHarness();h.hide();h.show();
  const overlay=h.overlay();
  check(overlay !== null,true,"return creates a recovery overlay");
  check(h.bodyNodes.includes(overlay),true,"overlay is appended to document.body, not lesson slide");
  check(h.headNodes.length,0,"Learn no longer duplicates shared CSS in an inline style");
  const css=fs.readFileSync(path.resolve(__dirname,"../verse_games/shared/welcome-back.css"),"utf8");
  match(css,/#learnAudioResumeOverlay[\s\S]*position: fixed/,'overlay stays fixed outside lesson layout');
  match(overlay.innerHTML,/data-welcome-back-picture/,"shared profile picture placeholder");
  match(overlay.innerHTML,/Welcome back,/,"child-friendly greeting");
  check(overlay.hidden,false,"overlay visible on returning");
  check(overlay.button.textContent,"Let's go!","button uses shared child-friendly label");
  check(overlay.button.disabled,false,"ready for actual user tap");
  check(overlay.status.hidden,true,"no unnecessary subtitle");
  check(h.bodyNodes.length,1,"one overlay element");
  h.api.render();h.api.render();
  check(h.bodyNodes.length,1,"repeated renders don't create another overlay");
  h.api.setMenu(true);h.api.syncLearnAudioResumeOverlay();
  check(overlay.hidden,true,"existing learn menu takes precedence");
  h.api.setMenu(false);h.api.syncLearnAudioResumeOverlay();
  check(overlay.hidden,false,"closing menu restores pending prompt");
}
async function testGestureAndBothGates() {
  const h=makeHarness(),played=deferred(),ready=deferred();h.pushAudio(played);h.pushUnlock(ready);
  h.hide();h.show();
  check(h.calls.includes("media-play"),false,"foreground must not autoplay");
  check(h.api.resumeInterruptedLearnAudio(),true,"tap starts recovery");
  check(h.calls.slice(-4).join(","),"unlock,cancel,chunk:2,media-play","unlock request occurs before segment restart");
  check(h.calls.includes("media-play"),true,"HTML audio play begins synchronously in tap");
  check(h.overlay().hidden,false,"overlay stays while activation is pending");
  check(h.overlay().button.disabled,true,"duplicate taps disabled while checking audio");
  check(h.api.resumeInterruptedLearnAudio(),false,"second tap cannot overlap first");
  played.resolve();await flush();
  check(h.overlay().hidden,false,"HTML play alone does not close overlay");
  check(h.State.chunkPassCount,1,"retry doesn't count a new chunk pass");
  ready.resolve(true);await flush();
  check(h.overlay().hidden,true,"overlay closes after BOTH audio paths are ready");
  check(h.api.getAttempt(),null,"completed recovery attempt cleared");
  check(h.timers.size,0,"successful recovery cancels hang watchdog");
}
async function testFailedAudioActivationRetry() {
  const h=makeHarness("echo");h.hide();h.show();
  const one=deferred(),a=deferred();h.pushUnlock(one);h.pushAudio(a);
  h.api.resumeInterruptedLearnAudio();a.resolve();one.resolve(false);await flush();
  check(h.overlay().hidden,false,"failed activation leaves overlay visible");
  check(h.overlay().button.disabled,false,"retry button enabled after failed activation");
  check(h.api.getRecovery().index,3,"interrupted echo index preserved after failure");
  match(h.overlay().status.textContent,/try again/,"retry message is shown only after failure");
  check(h.State.echoRunning,false,"failed attempt stops silent gameplay");
  const two=deferred(),b=deferred();h.pushUnlock(two);h.pushAudio(b);
  h.api.resumeInterruptedLearnAudio();two.resolve(true);b.resolve();await flush();
  check(h.overlay().hidden,true,"subsequent tap closes after verified recovery");
  check(h.calls.filter(x=>x==="echo:3").length,2,"both attempts restart the same unfinished echo chunk");
}
async function testRejectedMediaAndStaleUnlock() {
  const h=makeHarness("listen");h.hide();h.show();
  const first=deferred(),pendingUnlock=deferred();h.pushAudio(first);h.pushUnlock(pendingUnlock);
  h.api.resumeInterruptedLearnAudio();first.reject(Object.assign(Error("blocked"),{name:"NotAllowedError"}));await flush();
  check(h.overlay().hidden,false,"failed HTML play keeps overlay");
  check(h.api.getRecovery().listenMode,"listen_verse","interrupted verse (not reference) preserved");
  pendingUnlock.resolve(true);await flush();
  check(h.overlay().hidden,false,"late unlock cannot dismiss failed playback");
  check(h.State.listenPlaying,false,"failed playback doesn't claim running state");
}
async function testSecondInterruptionAndTimeout() {
  const h=makeHarness();h.hide();h.show();
  const pendingUnlock=deferred(),pendingPlay=deferred();h.pushAudio(pendingPlay);h.pushUnlock(pendingUnlock);
  h.api.resumeInterruptedLearnAudio();
  h.hide();
  check(h.api.getRecovery().index,2,"background during recovery retains same unfinished chunk");
  check(h.api.getAttempt(),null,"new interruption abandons in-progress unlock");
  pendingUnlock.resolve(true);pendingPlay.resolve();await flush();h.show();
  check(h.overlay().hidden,false,"old asynchronous completions cannot close a new prompt");
  const blockedPlay=deferred(),ready=deferred();h.pushAudio(blockedPlay);h.pushUnlock(ready);
  h.api.resumeInterruptedLearnAudio();ready.resolve(true);await flush();
  h.fireTimer(3500);
  check(h.overlay().button.disabled,false,"hanging media play eventually becomes retryable");
  check(h.api.getRecovery().index,2,"timeout does not lose interrupted chunk");
  blockedPlay.resolve();await flush();
  check(h.overlay().hidden,false,"late media play cannot dismiss a timed-out attempt");
}
async function testMuteAndShortInstructions() {
  const h=makeHarness("instruction");h.hide();
  check(h.api.getRecovery(),null,"instruction narration never creates a recovery prompt");
  check(h.State.learnInstructionReady,true,"original instruction button becomes enabled");
  check(h.api.getShortRender(),true,"instruction slide requests redraw after returning");
  h.show();
  check(h.calls.includes("render"),true,"normal instruction page redrawn on foreground");
  check(h.overlay(),null,"short instruction never creates a modal");
  const second=makeHarness("listen");second.hide();second.show();
  second.api.setMuted(true);second.api.syncLearnAudioResumeOverlay();
  check(second.overlay().button.textContent,"Let's go!","shared action label stays consistent when muted");
  const a=deferred(),b=deferred();second.pushAudio(a);second.pushUnlock(b);
  second.api.resumeInterruptedLearnAudio();
  check(second.calls.includes("unmute"),true,"resume tap unmutes only with explicit button label");
  a.resolve();b.resolve(true);await flush();
  check(second.overlay().hidden,true,"audio can recover after unmuting");
}
function testShortInstructionInMeaning() {
  const h=makeHarness("listen");h.State.screen=h.Screen.MEANING;
  h.State.listenPlaying=false;h.State.instructionPlaying=true;
  h.api.setRequest({key:"chunks1",doneFlag:"chunksIntroDone"});
  h.hide();
  check(h.api.getRecovery(),null,"short meaning instruction does not trigger resume overlay");
  check(h.State.chunksIntroDone,true,"optional instruction marked as handled once");
  h.show();
  check(h.overlay(),null,"meaning page remains popup-free");
  check(h.api.getShortRender(),false,"foreground clears deferred instruction redraw");
}
function testLayoutAndSourceContracts() {
  const instruction=extract("function screenLearnInstruction(idx) {", "function screenListen(idx) {");
  match(instruction,/const button = cfg\?\.button \|\| "Continue";/,"original instruction button label is preserved");
  check(instruction.includes('"Resume Audio"'),false,"instruction page never renders Resume Audio");
  const listen=extract("function screenListen(idx) {", "function screenMeaning(idx) {");
  check(listen.includes('"Resume Audio"'),false,"Listen no longer inserts inline recovery button");
  match(listen,/isLearnAudioOverlayRecovery\(learnAudioInterrupted\)/,"Listen preserves expanded/visible verse during interruption");
  const chunks=extract("function screenChunks(idx) {", "function screenEcho(idx) {");
  check(chunks.includes('"Resume Audio"'),false,"Chunks no longer changes bottom control to Resume Audio");
  match(chunks,/isLearnAudioOverlayRecovery\(learnAudioInterrupted\)/,"Chunks retains the existing expanded stage and spacer");
  const echo=extract("function screenEcho(idx) {", "function screenHide(idx) {");
  check(echo.includes('"Resume Audio"'),false,"Echo no longer inserts inline recovery button");
  match(echo,/isLearnAudioOverlayRecovery\(learnAudioInterrupted\)/,"Echo retains expanded stage and spacer");
  match(source,/if \(request\.doneFlag\) State\[request\.doneFlag\] = true;/,"short interrupt can retire an instruction state");
  match(source,/syncLearnAudioResumeOverlay\(\);\n}\n\n\/\* =========================\n   App-wide UI tap sounds/,"overlay synced after render rather than inside slides");
  match(source,/if \(learnAudioResumeAttempt\) clearTimeout\(learnAudioResumeAttempt\.watchdog\);/,"navigation clears recovery watchdog");
  const sw=fs.readFileSync(path.resolve(__dirname,"../service-worker.js"),"utf8");
  match(sw,/2026_Oct_\d+_patch(?:19a_learn_resume_overlay|20_read_my_verse_audio_recovery|20a_read_audio_resume_recovery|20b_read_animation_music|20c_native_crawl_music_fades|20d_crawl_envelope_recovery|20e_crawl_restart_original_audio|61_shared_welcome_back|62_scramble_welcome_back|63_bugs_munch_splat_welcome_back)/,"new service-worker version guarantees fresh web assets");
}
(async()=>{
  await testOverlayIndependentOfLayout();
  await testGestureAndBothGates();
  await testFailedAudioActivationRetry();
  await testRejectedMediaAndStaleUnlock();
  await testSecondInterruptionAndTimeout();
  await testMuteAndShortInstructions();
  testShortInstructionInMeaning();
  testLayoutAndSourceContracts();
  console.log(`Patch 19A Learn resume overlay validation passed (${checks} checks).`);
})().catch(err=>{console.error(err);process.exitCode=1;});
