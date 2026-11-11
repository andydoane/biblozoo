"use strict";
// N7j: execute the real menu, checkpoint and recovery functions in a Node VM.
// Mocked native state is not proof of audible output on an actual iPhone.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const app = read("app.js");
const nativeListen = read("verse_games/shared/native-learn-listen.js");
const nativeTracks = read("verse_games/shared/native-learn-tracks.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow = read(".github/workflows/ios-prep-validation.yml");
function block(start, end) {
  const a = app.indexOf(start), b = app.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, "missing production block " + start);
  return app.slice(a, b);
}
const code = [
  block("function ensureLearnMenuOverlay()", "function getVerseIdFromUrl()"),
  block("function syncLearnAudioResumeOverlay()", "function clearLearnAudioResumeTimers("),
  block("function finishLearnAudioResumeAttempt(", "function resumeInterruptedLearnAudio("),
  block("function resumeInterruptedLearnAudio(", 'document.addEventListener("visibilitychange", () => {')
].join("\n");
assert(app.includes("let learnMenuNativeRecovery = null;"));
assert(app.includes("if (document.hidden) learnMenuNativeRecovery = null;"));
assert(app.includes('window.addEventListener("pagehide", () => { learnMenuNativeRecovery = null; });'));
assert(app.includes('"biblozooAppLifecycle", event => {'));
assert(app.includes("menuClose: fromMenuClose === true"));
assert(app.includes("!learnAudioResumeAttempt?.menuClose"));
assert(app.includes("if (window.BibloZooNativeLearnListen?.isAvailable?.() !== true) {\n    try { void Promise.resolve(unlockAppAudio())"));
assert(nativeListen.includes('activateFromGesture({ purpose: "learn" })'));
assert(nativeTracks.includes("primeFromGesture"));
assert(swift.includes('subdirectory: "public/verse_audio"'));
assert(workflow.includes("validate_native_learn_menu_close_n7j.js"));

function harness(mode = "listen", { native = true, muted = false } = {}) {
  const calls = [];
  const buttons = {close:{onclick:null},exit:{onclick:null}};
  const overlayButton={disabled:false},status={textContent:"",hidden:true};
  const overlay={hidden:true,querySelector(q) {
    return q==="#learnAudioResumeButton"?overlayButton:q==="#learnAudioResumeStatus"?status:null;
  }};
  const menu={
    id:"learnMenuOverlay",classList:{add(){},remove(){}},setAttribute(){},
    querySelector(q){return q==="#learnMenuClose"?buttons.close:q==="#learnMenuExit"?buttons.exit:null;},
    addEventListener(){}
  };
  let menuCreated=false;
  const document={
    hidden:false,body:{appendChild(el){if(el===menu)menuCreated=true;}},
    createElement:()=>menu,
    getElementById:id=>id==="learnMenuOverlay"?(menuCreated?menu:null):
      id==="learnAudioResumeOverlay"?overlay:null
  };
  const lifecycle=[];
  const win={
    Capacitor:{Plugins:{BibloZooNativeSound:{addListener(name,fn){
      assert.equal(name,"biblozooAppLifecycle");
      lifecycle.push(fn); return Promise.resolve({});
    }}}},
    BibloZooWelcomeBack:null,
    BibloZooNativeLearnListen:{isAvailable:()=>native}
  };
  const Screen={LISTEN:"listen",CHUNKS:"chunks",ECHO:"echo",
    LEARN_INSTRUCTION:"instruction",MEANING:"meaning"};
  const State={
    screen:mode==="chunk"?Screen.CHUNKS:Screen[mode.toUpperCase()],
    listenPlaying:mode==="listen",
    listenAutoStarting:false,listenAutoFallbackReady:false,audioMode:"listen_verse",
    chunkRunning:mode==="chunk",chunkAutoStarting:false,
    chunkAutoFallbackReady:false,chunkIndex:2,
    echoRunning:mode==="echo",echoAutoStarting:false,
    echoAutoFallbackReady:false,echoIndex:3,instructionPlaying:false
  };
  const audioEl={paused:native,pause(){this.paused=true;calls.push(["html-pause"]);}};
  const context={
    window:win,document,Screen,State,audioEl,Promise,console,
    VERSE_ID:"john_3_16",muted,learnMenuOpen:false,learnMenuPausedAudio:false,
    learnMenuNativeRecovery:null,learnAudioInterrupted:null,
    learnAudioResumeAttempt:null,learnAudioResumeError:"",
    learnShortInstructionNeedsRender:false,activeLearnInstructionRequest:null,
    nativeListenCheckpoint:{verseId:"john_3_16",mode:"listen_verse",positionMs:1630},
    nativeLearnPartCheckpoint:{verseId:"john_3_16",mode,index:mode==="chunk"?2:3,positionMs:880},
    learnZooEscape:null,learnZooRecovery:null,
    isNativeLearnListenMode:()=>native,isNativeLearnTracksMode:()=>native,
    showDialog(){throw Error("unexpected modal");},closeDialog(){},dlgBtn(){return {};},
    isLearnAudioOverlayRecovery(r) {
      return !!r && r.screen===State.screen && ["listen","chunk","echo"].includes(r.mode);
    },
    ensureLearnAudioResumeOverlay:()=>overlay,
    clearLearnAudioResumeTimers(){calls.push(["clear-timers"]);},
    cancelLearnAudio() {
      calls.push(["cancel"]);
      State.listenPlaying=false;State.chunkRunning=false;State.echoRunning=false;
      State.audioMode=null;
    },
    listenPlay(stage,position) {
      calls.push(["native-listen",stage,position]);
      context.learnAudioInterrupted=null;State.listenPlaying=true;
    },
    primeNativeLearnTracks(){calls.push(["native-prime"]);},
    startChunkFlow(){calls.push(["native-chunk"]);context.learnAudioInterrupted=null;return Promise.resolve();},
    startEchoFlow(){calls.push(["native-echo"]);context.learnAudioInterrupted=null;return Promise.resolve();},
    unlockAppAudio(){calls.push(["web-unlock"]);return Promise.resolve();},
    toggleMute(){calls.push(["toggle-mute"]);context.muted=false;},
    render(){calls.push(["render"]);win.__test?.syncLearnAudioResumeOverlay?.();},
    resetLearn(x){calls.push(["exit",x]);},
    safePlay(){calls.push(["web-resume"]);return Promise.resolve();},
    setTimeout(fn,delay){calls.push(["watchdog",delay]);return 1;},
    clearTimeout(){}
  };
  vm.runInNewContext(code+
    "\nwindow.__test={openLearnMenu,closeLearnMenu,"+
    "finishLearnAudioResumeAttempt,failLearnAudioResumeAttempt,"+
    "syncLearnAudioResumeOverlay,"+
    "current:()=>({menu:learnMenuNativeRecovery,interrupted:learnAudioInterrupted,"+
    "attempt:learnAudioResumeAttempt,open:learnMenuOpen})};",
    context,{filename:"app.js:N7j production functions"});
  return {
    calls,buttons,overlay,context,current:()=>win.__test.current(),
    open:()=>win.__test.openLearnMenu(),close:()=>win.__test.closeLearnMenu(),
    finish:a=>win.__test.finishLearnAudioResumeAttempt(a),
    fail:a=>win.__test.failLearnAudioResumeAttempt(a),
    os:()=>lifecycle.forEach(fn=>fn({active:false}))
  };
}
function num(h,label){return h.calls.filter(x=>x[0]===label).length;}
async function run(){
  for(const mode of ["listen","chunk","echo"]) {
    const h=harness(mode); h.open();
    assert.equal(h.current().open,true);
    assert.equal(h.current().interrupted.mode,mode);
    assert.equal(h.current().menu,h.current().interrupted);
    assert.equal(h.overlay.hidden,true);
    assert.equal(num(h,"cancel"),1);
    h.buttons.close.onclick(); // real Close gesture
    assert.equal(h.current().open,false);
    assert.equal(h.current().attempt.menuClose,true);
    assert.equal(h.overlay.hidden,true,"do not expose Welcome Back after Close");
    assert.equal(num(h,"web-unlock"),0,"no Web audio unlock in native iOS");
    if(mode==="listen"){
      const start=h.calls.find(x=>x[0]==="native-listen");
      assert.equal(start[1],"listen_verse");
      assert.equal(start[2],1630,"native position checkpoint");
    }else{
      assert.equal(num(h,"native-prime"),1);
      assert.equal(num(h,mode==="chunk"?"native-chunk":"native-echo"),1);
    }
    const attempt=h.current().attempt;
    assert.equal(attempt.narrationVerified,false,
      "tap alone does not imply audible progress");
    attempt.narrationVerified=true; // only after a real native progress/end
    h.finish(attempt);
    assert.equal(h.current().attempt,null);
    assert.equal(h.overlay.hidden,true);
  }
  const denied=harness();
  denied.open();denied.close();
  const request=denied.current().attempt;
  denied.fail(request);
  assert.equal(denied.overlay.hidden,false,
    "genuine native restart failure restores Welcome Back retry");
  assert.equal(denied.current().interrupted,request.recovery);

  const os=harness();
  os.open();os.os(); // UIKit willResignActive, WebKit document still visible
  assert.equal(os.current().menu,null);
  os.close();
  assert.equal(num(os,"native-listen"),0,"OS inactive never auto-resumes");
  assert.equal(os.overlay.hidden,false,"OS return keeps explicit gate");

  const hidden=harness();
  hidden.open();hidden.context.document.hidden=true;
  hidden.context.learnMenuNativeRecovery=null; // visibility guard source-checked above
  hidden.close();
  assert.equal(num(hidden,"native-listen"),0);

  const exiting=harness();
  exiting.open();exiting.buttons.exit.onclick();
  assert.equal(num(exiting,"native-listen"),0);
  assert.equal(num(exiting,"exit"),1);

  const web=harness("listen",{native:false});
  web.context.audioEl.paused=false;
  web.open();web.close();
  assert.equal(num(web,"web-resume"),1,"Web/PWA HTML pause/resume intact");
  assert.equal(web.overlay.hidden,true);

  const mute=harness("listen",{muted:true});
  mute.open();mute.close();
  assert.equal(num(mute,"native-listen"),0,"no automatic unmute on menu Close");

  console.log("N7j PASS: real Learn menu + resume + overlay; native Listen/Chunks/Echo "+
    "restore on deliberate Close without Welcome Back, progress-only completion, "+
    "real OS interruption/Exit/mute safe, denial retries, Web unchanged.");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
