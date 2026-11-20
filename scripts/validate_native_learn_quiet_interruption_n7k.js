"use strict";
/* N7k: exercise REAL Learn Chunks/Echo functions, their timers and UIKit
 * lifecycle callback without pretending a fake bridge proves iPhone audio.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const app = read("app.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const tracks = read("verse_games/shared/native-learn-tracks.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
function block(from, to) {
  const a=app.indexOf(from),b=app.indexOf(to,a+from.length);
  assert(a>=0 && b>a, "missing real source boundary "+from);
  return app.slice(a,b);
}
const realSource=[
  block("let nativeLearnQuietCheckpoint = null;", "function nativeInstructionSoundId(key)"),
  block("function nativeLearnTrackProgress(", "let muted = false;"),
  block("function finishLearnAudioResumeAttempt(", "function waitForAudioEnd()"),
  block("function waitForPausableDelay(", "async function playInstruction("),
  block("async function startChunkFlow()", "function stopFireworks()")
].join("\n");

assert(app.includes('bridge.addListener("biblozooAppLifecycle", event => {'));
assert(app.includes('const resumingRepeat = i === startIndex'));
assert(app.includes('const resumingGap = i === startIndex'));
assert(app.includes('quietPhase: quiet.phase'));
assert(app.includes("quietRemainingMs: quiet.remainingMs"));
assert(app.includes('reason === "interrupted"'));
assert(app.includes('!attempt.narrationVerified && !attempt.quietPhaseVerified'));
assert(app.includes('if (isNativeLearnTracksMode()) nativeLearnQuietCheckpoint = {'));
assert(app.includes('nativeLearnQuietCheckpoint = null;'));
assert(app.includes('if (my !== echoCancelToken || document.hidden) return;'));
assert(!app.includes('new Audio("echo"'));
assert(swift.includes('notifyListeners("biblozooAppLifecycle", data: ['));
assert(swift.includes('"active": false'));
assert(swift.includes('"active": true'));
assert(tracks.includes('if (current) settle(current, false, "interrupted", true)'),
  "native track can have no current player during silent gap");
assert(workflow.includes("validate_native_learn_quiet_interruption_n7k.js"));

function harness(mode, {failReason=null, holdNative=false}={}) {
  const calls=[], timers=new Map(), lifecycle=[], listeners={};
  let now=1000, id=0, resolveNative;
  const Screen={CHUNKS:"chunks",ECHO:"echo",LISTEN:"listen",
    LEARN_INSTRUCTION:"instruction",MEANING:"meaning"};
  const State={
    screen:mode==="chunk"?Screen.CHUNKS:Screen.ECHO,
    chunkRunning:false,chunkAutoStarting:false,
    chunkAutoFallbackReady:false,chunkDone:false,chunkIndex:0,chunkPassCount:0,
    echoRunning:false,echoSpeaking:false,echoAutoStarting:false,
    echoAutoFallbackReady:false,echoDone:false,echoIndex:0,
    listenPlaying:false,listenAutoStarting:false,
    instructionPlaying:false,audioMode:null
  };
  const doc={
    hidden:false,
    querySelector(){return null;},
    addEventListener(name,fn){(listeners[name] ||= []).push(fn);}
  };
  let nativePlayCount=0;
  const bridge={
    addListener(name,fn){
      assert.equal(name,"biblozooAppLifecycle");
      lifecycle.push(fn);return Promise.resolve({});
    }
  };
  const native={
    isAvailable:()=>true,
    primeFromGesture(){calls.push(["prime"]);return true;},
    stop(){calls.push(["native-stop"]);},
    play(soundId,opts){
      nativePlayCount++;
      calls.push(["native-play",soundId,opts.positionMs||0]);
      if(failReason) return Promise.resolve({ended:false,reason:failReason});
      if(holdNative && nativePlayCount===1)
        return new Promise(resolve=>{resolveNative=resolve;});
      return Promise.resolve({ended:true,durationMs:1000,positionMs:1000});
    }
  };
  const win={
    Capacitor:{Plugins:{BibloZooNativeSound:bridge}},
    BibloZooNativeOnlyOutput:{enabled:true},
    BibloZooNativeLearnListen:{isAvailable:()=>true,stop(){calls.push(["listen-stop"]);}},
    BibloZooNativeLearnTracks:native,
    addEventListener(name,fn){(listeners["window:"+name] ||= []).push(fn);}
  };
  const audioEl={currentTime:0,pause(){},paused:true};
  const context={
    window:win,document:doc,State,Screen,audioEl,Promise,
    VERSE_ID:"john_3_16",AUDIO_FILE:"verse_audio/john_3_16.mp3",
    muted:false,learnMenuOpen:false,learnMenuNativeRecovery:null,
    learnAudioInterrupted:null,learnAudioResumeAttempt:null,
    learnAudioResumeError:"",learnShortInstructionNeedsRender:false,
    learnZooEscape:null,learnZooRecovery:null,
    learnAudioResumeTimers:null,activeLearnInstructionRequest:null,
    activeLearnAudioWaitCancel:null,nativeLearnPartCheckpoint:null,
    nativeLearnTrackError:"",
    isNativeLearnListenMode:()=>true,
    isLearnAudioOverlayRecovery:r=>!!r && r.screen===State.screen &&
      ["chunk","echo","listen"].includes(r.mode),
    getLearnAudioParts:()=>[
      {file:"verse_audio/chunk0.mp3",text:"First"},
      {file:"verse_audio/chunk1.mp3",text:"Second"},
      {file:"verse_audio/chunk2.mp3",text:"Third"}
    ],
    performance:{now:()=>now},
    setTimeout(fn,ms){const key=++id;timers.set(key,{fn,at:now+ms,ms});return key;},
    clearTimeout(key){timers.delete(key);},
    syncLearnAudioResumeOverlay(){
      const recovery=context.learnAudioResumeAttempt?.recovery ||
        context.learnAudioInterrupted;
      context.overlayVisible=!!(recovery && !doc.hidden &&
        !context.learnMenuOpen && !context.learnAudioResumeAttempt?.menuClose);
    },
    clearLearnAudioResumeTimers(a){if(!a)return;timers.delete(a.watchdog);timers.delete(a.progressTimer);},
    render(){calls.push(["render"]);context.syncLearnAudioResumeOverlay();},
    updateEchoStageState(){calls.push(["echo-state",State.echoSpeaking,State.echoIndex]);},
    setAudioSrc(){},startLearnInstruction(key){calls.push(["next-instruction",key]);},
    toggleMute(){context.muted=false;},
    unlockAppAudio(){throw Error("native-only iOS must never unlock Web Audio");},
    listenPlay(){throw Error("unexpected Listen");},
    primeNativeLearnTracks:null,
    console
  };
  // Top-level Lexical declarations inside the VM remain real production
  // functions; only unrelated screen rendering/Swift are simulated.
  vm.runInNewContext(realSource+"\n"+
    "window.__probe={startChunkFlow,startEchoFlow,runChunkSequence,runEchoSequence,"+
    "pauseLearnAudioForInterruption,resumeInterruptedLearnAudio,failNativeLearnTrack,"+
    "getState:()=>({quiet:nativeLearnQuietCheckpoint,"+
    "interrupted:learnAudioInterrupted,attempt:learnAudioResumeAttempt,"+
    "trackError:nativeLearnTrackError})};",
    context,{filename:"app.js:native-learn-quiet"});
  async function flush() {for(let i=0;i<20;i++)await Promise.resolve();}
  async function advance(ms) {
    now+=ms;
    for(const [key,task] of Array.from(timers)) {
      if(task.at<=now) {timers.delete(key);task.fn();}
    }
    await flush();
  }
  return {
    context,State,doc,win,calls,lifecycle,timers,flush,advance,
    nativeFinish:()=>resolveNative?.({ended:true,durationMs:1000,positionMs:1000}),
    probe:win.__probe,
    begin:()=>mode==="echo"?win.__probe.startEchoFlow():win.__probe.startChunkFlow(),
    os(active){for(const fn of lifecycle)fn({active});context.syncLearnAudioResumeOverlay();},
    getState:()=>win.__probe.getState(),
    soundCount:()=>calls.filter(x=>x[0]==="native-play").length
  };
}

async function checkQuiet(mode) {
  const h=harness(mode);
  void h.begin();
  await h.flush();
  const first=h.getState();
  assert(first.quiet,"native flow entered an audio-free interval");
  assert.equal(first.quiet.phase,mode==="echo"?"echo-repeat":"chunk-gap");
  if(mode==="echo") assert.equal(h.State.echoSpeaking,true,
    "Echo quiet phase shows yellow speaking text");
  const startingMs=first.quiet.remainingMs;
  await h.advance(240);
  const atPause=h.getState().quiet.remainingMs;
  assert(atPause < startingMs && atPause > 0);
  assert.equal(h.soundCount(),1,"first published clip ended once");
  assert.equal(h.lifecycle.length,1,"activity owns its own native lifecycle listener");
  h.os(false); // held iOS App Switcher; document.hidden STILL FALSE
  const paused=h.getState();
  assert.equal(paused.interrupted.mode,mode);
  assert.equal(paused.interrupted.quietPhase,first.quiet.phase);
  assert.equal(paused.interrupted.index,0,
    "silent interval belongs to the finished FIRST clip, not next");
  assert(paused.interrupted.quietRemainingMs>0 &&
    paused.interrupted.quietRemainingMs<=atPause);
  assert.equal(paused.trackError,"","no inline Sound isn't ready row");
  assert.equal(h.State.echoRunning || h.State.chunkRunning,false);
  assert.equal(h.context.overlayVisible,true,"standard Welcome Back is visible");
  h.os(true);
  assert.equal(h.context.overlayVisible,true,"foreground cannot auto-resume");
  assert.equal(h.soundCount(),1,"no ghost native clip on return");

  // Only Let's go is a valid gesture to resume this exact silent interval.
  assert.equal(h.probe.resumeInterruptedLearnAudio(),true);
  await h.flush();
  const resumed=h.getState();
  assert.equal(resumed.interrupted,null);
  assert(resumed.attempt && resumed.attempt.narrationVerified===false);
  assert.equal(h.soundCount(),1,"no replay of already finished clip");
  if(mode==="echo") assert.equal(h.State.echoSpeaking,true,
    "same yellow speaking interval resumes instead of jumping ahead");
  await h.advance(55);
  assert.equal(h.getState().attempt,null,
    "real active quiet timer movement clears ONLY UI Welcome Back");
  assert.equal(h.context.overlayVisible,false);
  assert.equal(h.soundCount(),1,"timer verification did not fake a clip end");
  assert.equal(h.State.chunkPassCount,0,"no unearned Chunks completion");
  assert.equal(h.State.echoDone,false,"no unearned Echo completion");
  await h.advance(atPause+200);
  assert.equal(h.soundCount(),2,
    "only AFTER remaining quiet time does the NEXT native clip play");
  assert.equal(h.calls.filter(x=>x[0]==="native-play")[1][1],
    "learn-part-john_3_16-1","next clip is not skipped");
  assert.equal(h.getState().trackError,"");
}

async function checkActualClipInterruption() {
  const h=harness("echo",{holdNative:true});
  void h.begin();
  await h.flush();
  assert.equal(h.getState().quiet,null);
  assert.equal(h.State.echoRunning,true);
  h.os(false);
  assert.equal(h.getState().interrupted.mode,"echo");
  assert.equal(h.getState().interrupted.quietPhase,undefined);
  h.nativeFinish();
  await h.flush();
  assert.equal(h.getState().trackError,"");
  assert.equal(h.soundCount(),1,"stale completion cannot start later clip");
}
async function checkNativeInterruptionFailure() {
  const h=harness("chunk",{failReason:"interrupted"});
  void h.begin();
  await h.flush();
  assert.equal(h.getState().interrupted.mode,"chunk",
    "OS-invalidated clip should use Welcome Back even without event delivery");
  assert.equal(h.getState().trackError,"");
  assert.equal(h.context.overlayVisible,true);
}
async function checkGenuineMissingAsset() {
  const h=harness("echo",{failReason:"prepare-refused"});
  void h.begin();await h.flush();
  assert.match(h.getState().trackError,/Sound isn't ready/);
  assert.equal(h.getState().interrupted,null,
    "real missing native asset retains Start fallback rather than fake OS popup");
}
(async()=>{
  await checkQuiet("echo");
  await checkQuiet("chunk");
  await checkActualClipInterruption();
  await checkNativeInterruptionFailure();
  await checkGenuineMissingAsset();
  console.log("N7k PASS: actual Chunks/Echo silent-phase native lifecycle, early held "+
    "switcher Welcome Back, saved yellow-turn/gap remaining time, no skipped or "+
    "duplicate native clips/credit, genuine audio-failure retry and no Web audio.");
})().catch(e=>{console.error(e);process.exitCode=1;});
