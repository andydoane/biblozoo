"use strict";
// N4a.1: when iPhone enters its multitasking switcher, UIKit becomes
// inactive even while WKWebView's document.hidden can remain false.
// Exercise the actual Feeding listener/handler bodies in a VM; Node source
// checks are not a Swift compilation or physical-device validation.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const game=read("daily_questions_feed_game.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
function section(src,start,end){
  const i=src.indexOf(start), j=src.indexOf(end,i+start.length);
  assert.ok(i>=0&&j>i,"source section missing "+start);
  return src.slice(i,j);
}
const swiftLeave=section(swift,"    private func leftForeground() {",
  "    private func returnedToForeground() {");
const swiftReturn=section(swift,"    private func returnedToForeground() {",
  "    private func handleInterruption(");
const life=section(game,"  function pauseNativeFeedingForAppSwitcher(runtime) {",
  "  function spawnMelodyNote(runtime, entry) {");
assert.match(swift,/UIApplication\.willResignActiveNotification/);
assert.match(swiftLeave,/forgetPlayback\(\)/);
assert.match(swiftLeave,/notifyListeners\("biblozooAppLifecycle", data:/);
assert.match(swiftLeave,/"active": false/);
assert.match(swiftReturn,/notifyListeners\("biblozooAppLifecycle", data:/);
assert.match(swiftReturn,/"active": true/);
assert.match(swiftReturn,/foregroundEpoch \+= 1/);
assert.match(life,/pauseFeedingGame\(runtime\)/);
assert.match(life,/runtime\.feedResumeGeneration = \(runtime\.feedResumeGeneration \|\| 0\) \+ 1/);
assert.match(life,/runtime\.feedResumePending = false/);
assert.match(life,/runtime\.nativePilot\?\.stop\?\.\(\)/);
assert.match(life,/native\.addListener\("biblozooAppLifecycle"/);
assert.match(life,/state\?\.active !== false && state\?\.active !== true/);
assert.match(life,/runtime\.feedNativeLifecycleGeneration !== generation/);
assert.match(life,/window\.addEventListener\("blur"/);
assert.match(life,/window\.addEventListener\("focus"/);
assert.match(life,/window\.removeEventListener\("blur"/);
assert.match(life,/window\.removeEventListener\("focus"/);
assert.doesNotMatch(life,/AudioContext|webkitAudioContext|new Audio\(|\.play\(|\.prepare\(|setActive\(/,
  "lifecycle notification must never activate or switch to Web/audio output");
assert.match(workflow,/node scripts\/validate_native_app_switcher_pause_n4a1\.js/);

const nextMicrotask=()=>new Promise(resolve=>setImmediate(resolve));
function harness({native=true,lateHandle=false}={}){
  const listeners={win:new Map(),doc:new Map()};
  const records={nativeHandlers:[],removes:0,pause:0,status:[],stop:0};
  let resolveRegistration=null;
  const plugin={addListener(name,fn){
    assert.equal(name,"biblozooAppLifecycle");
    records.nativeHandlers.push(fn);
    const handle={remove(){records.removes++;}};
    return lateHandle
      ? new Promise(resolve=>{resolveRegistration=()=>resolve(handle);})
      : Promise.resolve(handle);
  }};
  const window={
    BibloZooNativeOnlyOutput:{enabled:native},
    BibloZooFeedingNativeAudioPilot:{isIOS:()=>true},
    Capacitor:{Plugins:{BibloZooNativeSound:plugin}},
    addEventListener(type,fn){listeners.win.set(type,fn);},
    removeEventListener(type,fn){
      assert.equal(listeners.win.get(type),fn);
      listeners.win.delete(type);
    }
  };
  const document={
    hidden:false,
    addEventListener(type,fn){listeners.doc.set(type,fn);},
    removeEventListener(type,fn){
      assert.equal(listeners.doc.get(type),fn);
      listeners.doc.delete(type);
    }
  };
  const rt={
    nativePilotAllowed:true,
    nativePilotBackend:"native",
    feedPausedAt:null,
    roundStarted:true,finished:false,running:true,
    score:43,caughtCount:4,
    melody:{startTime:1234,pausedAt:null,tuneId:"song-a"},
    feedResumeGeneration:2,feedResumePending:false,
    nativePilot:{stop(){records.stop++;}},
    resumeButton:{disabled:false},
    resumeOverlay:{hidden:true},
    feedPageHidden:false
  };
  const env={
    window,document,Promise,activeRuntime:rt,
    pauseFeedingGame(runtime){
      if(runtime.feedPausedAt!=null)return false;
      records.pause++;
      runtime.feedPausedAt=1000;
      runtime.melody.pausedAt=1000;
      runtime.resumeOverlay.hidden=false;
      runtime.nativePilot.stop();
      return true;
    },
    setFeedingResumeStatus(runtime,message){
      records.status.push(message||"");
    }
  };
  vm.runInNewContext(life+"\nthis.attach=attachFeedInterruptionHandlers;this.detach=detachFeedInterruptionHandlers;",env);
  return {
    rt,records,plugin,listeners,env,
    attach(){env.attach(rt);},
    detach(){env.detach(rt);},
    event(i,data){records.nativeHandlers[i](data);},
    focus(){listeners.win.get("focus")?.();},
    blur(){listeners.win.get("blur")?.();},
    resolveHandle(){resolveRegistration?.();}
  };
}
async function main(){
  {
    // User's exact gesture: hold in iPhone switcher, no pagehide and
    // document.hidden remains false. The native inactive event still pauses.
    const h=harness();h.attach();await nextMicrotask();
    assert.equal(h.env.document.hidden,false);
    h.event(0,{active:false,foregroundEpoch:0});
    assert.equal(h.records.pause,1);
    assert.equal(h.rt.feedPausedAt,1000);
    assert.equal(h.rt.melody.pausedAt,1000);
    assert.equal(h.rt.melody.startTime,1234);
    assert.equal(h.rt.melody.tuneId,"song-a");
    assert.equal(h.rt.score,43);
    assert.equal(h.rt.caughtCount,4);
    assert.equal(h.rt.resumeOverlay.hidden,false);
    assert.equal(h.records.stop,1);
    // Return must NOT play, unfreeze, restart song or add catch points.
    h.event(0,{active:true,foregroundEpoch:1});
    h.focus();
    assert.equal(h.records.pause,1);
    assert.equal(h.rt.feedPausedAt,1000);
    assert.equal(h.records.stop,1);
    h.detach();await nextMicrotask();
    assert.equal(h.records.removes,1);
    assert.equal(h.listeners.win.has("focus"),false);
    assert.equal(h.listeners.win.has("blur"),false);
  }
  {
    // WebKit can delay/drop the leave event while the card is inactive:
    // native didBecomeActive alone must force the same frozen round.
    const h=harness();h.attach();await nextMicrotask();
    h.event(0,{active:true,foregroundEpoch:1});
    assert.equal(h.records.pause,1);
    assert.equal(h.rt.feedPausedAt,1000);
    h.detach();
  }
  {
    // UIKit event unavailable? WKWebView focus/blur are additional
    // safety nets, still without Web playback or automatic reactivation.
    const h=harness();h.attach();
    h.blur();assert.equal(h.records.pause,1);
    h.focus();assert.equal(h.records.pause,1);
    h.detach();
  }
  {
    // If another inactive transition occurs during a pending async Resume,
    // invalidate its generation; a late prepare may not unfreeze that tap.
    const h=harness();h.attach();await nextMicrotask();
    h.rt.feedPausedAt=500;h.rt.melody.pausedAt=500;
    h.rt.feedResumePending=true;h.rt.resumeButton.disabled=true;
    h.event(0,{active:false,foregroundEpoch:0});
    assert.equal(h.records.pause,0);
    assert.equal(h.rt.feedResumeGeneration,3);
    assert.equal(h.rt.feedResumePending,false);
    assert.equal(h.rt.resumeButton.disabled,false);
    assert.equal(h.records.stop,1);
    h.detach();
  }
  {
    // A late Capacitor addListener handle must be removed after exit.
    const h=harness({lateHandle:true});h.attach();h.detach();
    h.resolveHandle();await nextMicrotask();
    assert.equal(h.records.removes,1);
    h.event(0,{active:false,foregroundEpoch:0});
    assert.equal(h.records.pause,0);
  }
  {
    // No new hooks whatsoever in Web/PWA, stable iOS or disabled native-only.
    const h=harness({native:false});h.attach();
    assert.equal(h.records.nativeHandlers.length,0);
    assert.equal(h.listeners.win.has("focus"),false);
    assert.equal(h.listeners.win.has("blur"),false);
    assert.equal(h.listeners.doc.has("visibilitychange"),true);
    h.detach();
  }
  console.log("N4a.1 iPhone switcher inactive / return freeze, late return, pending Resume invalidation, safe listener cleanup and Web isolation passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
