"use strict";
/* N7m actual Read owner + native adapter VM: a real OS audio-session
 * interruption can arrive with no AVAudioPlayer and WKWebView still visible.
 * Linux source/Swift syntax tests are NOT proof of iPhone PiP/AirPods delivery.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const adapter=read("verse_games/shared/native-read-my-verse-output-n7f.js");
const activity=read("read_my_verse.js");
const swift=read("ios/App/App/SceneDelegate.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const plugin=swift.slice(swift.indexOf("@objc(BibloZooNativeReadOutputPlugin)"));
const select=(src,start,end)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,"Real source bounds "+start);
  return src.slice(a,b);
};
for(const source of [adapter,activity])new vm.Script(source);
assert(workflow.includes("validate_native_read_external_audio_n7m.js"));
assert(plugin.includes('AVAudioSession.InterruptionType.began.rawValue'));
assert.match(plugin,/self\?\.notifyListeners\("biblozooReadLifecycle", data: \[\s*"phase": "audioInterruptionBegan"/);
assert(plugin.includes('"phase": "routeInterrupted"'));
assert(plugin.includes('"phase": "mediaServicesInterrupted"'));
assert(plugin.includes('"phase": "willResignActive"'));
assert(plugin.includes('self?.cancelAll(reason: "interrupted")'));
const began=select(plugin,'AVAudioSession.interruptionNotification, object: nil,',
                   'for name in [UIApplication.willResignActiveNotification,');
assert(began.indexOf('"audioInterruptionBegan"')<began.indexOf('self?.cancelAll(reason: "interrupted")'),
  "Notify Read even if zero native clips, BEFORE player teardown");
assert(!/\.(mixWithOthers|duckOthers)/.test(plugin.replace(/\/\/[^\n]*/g,"")));
assert(!/setCategory\(|setMode\(|getUserMedia|MediaRecorder/.test(plugin));
assert(adapter.includes('"audioInterruptionBegan"'));
assert(adapter.includes('"routeInterrupted"'));
assert(adapter.includes('"mediaServicesInterrupted"'));
assert(adapter.includes('invalidateActivation();'));
assert(adapter.includes('for (const callback of inactiveCallbacks)'));
assert(activity.includes('const nativeActivation = nativeMode'));
assert(activity.includes('if (!heard || !tonesReady || !nativeReady || root?.document?.hidden)'));
assert(activity.includes('if (!needsToneRecovery && !nativeMode)'));
assert(activity.includes('freezeReadTypingIntro();'));
assert(activity.includes('freezeReadScene(scene);'));
// A static inventory ensures ALL children share this activity-level callback.
for(const name of ["KEYBOARD","TYPEWRITER","BALLOONS","FISH",
    "VERSE_CRAWL","TAP_WORDS_ORDER","UNSCRAMBLE"]) {
  assert(activity.includes(name+"_ACTIVITY_ID"),"Read activity present: "+name);
}

const readSource=[
  select(activity,"  function pauseReadForInterruption() {",
                  "  // play() fulfilling only means the request was accepted by WebKit."),
  select(activity,"  function resumeReadAudioFromGesture() {",
                  "  function restorePausedReadSceneOnReturn() {"),
  select(activity,"  // N7f.2: UIApplication.willResignActive",
                  "  function stopAudio() {")
].join("\n");
function fixture({activityId="keyboard",delayActivation=false}={}){
  let activateResolve=null,activateAllowed=true,now=1000;
  const calls=[],listeners={},docListeners={};
  let currentId=0;
  const bridge={
    addListener(name,fn){listeners[name]=fn;return Promise.resolve({remove(){}});},
    activateFromGesture(){
      calls.push(["activate"]);
      return delayActivation
        ? new Promise(resolve=>{activateResolve=resolve;})
        : Promise.resolve({activated:activateAllowed});
    },
    playClip({requestId,clipId}){
      calls.push(["play",requestId,clipId]);
      return Promise.resolve({started:true,durationMs:2000,positionMs:0});
    },
    stopClip({requestId}){calls.push(["stop-clip",requestId]);return Promise.resolve({stopped:true});},
    stopAll(){calls.push(["stop-all"]);return Promise.resolve({stopped:true});},
    stopCues(){calls.push(["stop-cues"]);return Promise.resolve({stopped:true});},
    playCue(args){calls.push(["cue",args.kind]);return Promise.resolve({played:true});},
    seekClip(){return Promise.resolve({seeked:true});}
  };
  const document={hidden:false,addEventListener(name,fn){docListeners[name]=fn;}};
  const root={document,
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeReadOutput:bridge}},
    addEventListener(){}};
  const ctx={window:root,Map,Set,Promise,Math,Array,Object,Number,String,Error};
  vm.runInNewContext(adapter,ctx,{filename:"native-read-my-verse-output-n7f.js"});
  const counts={freezeTyping:0,thawTyping:0,freezeScene:0,thawScene:0,
    freezePause:0,thawPause:0,stopped:0,overlay:0};
  const scene={active:true,wrap:{}};
  const state={verseId:"john_3_16",phase:"typing",activityId,activityData:{}};
  const isAnimated=id=>["balloons","fish","crawl"].includes(id);
  Object.assign(ctx,{
    root,appApi:{isActive:()=>true,isMuted:()=>false,
      unlockAudio:()=>Promise.resolve(true)},
    state,Date:{now:()=>now},setTimeout,clearTimeout,
    VERSE_CRAWL_ACTIVITY_ID:"crawl",
    TAP_WORDS_ORDER_ACTIVITY_ID:"order",
    UNSCRAMBLE_ACTIVITY_ID:"unscramble",
    completionReported:false,
    readAudioRecovery:null,readAudioRecoveryAttempt:null,
    readAudioRecoveryGeneration:0,readEffectRecoveryPending:false,
    readToneClockProbe:null,readAudioStartPromise:null,
    readActiveSequenceReplay:null,readActiveAnimatedNarration:null,
    readDeferredNarrationFinish:null,readPauseTimerTask:null,
    pauseTimer:0,crawlMusic:null,crawlEnding:null,
    activeAudio:null,readZooRecovery:null,
    isTypingActivity:id=>id==="keyboard"||id==="typewriter",
    isAnimatedActivity:isAnimated,
    activeReadScene:()=>isAnimated(activityId)?scene:null,
    freezeReadTypingIntro(){counts.freezeTyping++;},
    thawReadTypingIntro(){counts.thawTyping++;},
    freezeReadScene(){counts.freezeScene++;},
    thawReadScene(){counts.thawScene++;},
    freezeReadPauseTimer(){counts.freezePause++;},
    thawReadPauseTimer(){counts.thawPause++;},
    stopReadNarration(){counts.stopped++;},
    stopKeySoundVoices(){},
    stopScrambleRewards(){},
    syncReadAudioOverlay(){counts.overlay++;root.__overlay=!!ctx.readAudioRecovery;},
    freezeReadEffectAudio(){},
    clearTimeout(){},
    playCurrentChunk(){},
    playChunkSequenceAudio(){},
    playBalloonAudio(){},
    playFishAudio(){},
    playCrawlAudio(){},
    prepareReadTonesFromGesture:()=>Promise.resolve(true),
    readNarrationBlocked:()=>false,
    waitReadRecoveryResult:p=>Promise.resolve(p).then(x=>x!==false,()=>false),
    waitReadMediaProgress:()=>Promise.resolve(true),
    recordReadRecoveryCheck(){},
    // Do not exercise PWA-native Crawl music in this isolated recovery.
    resumeInterruptedCrawlFromGesture(){throw Error("unexpected crawl audio");}
  });
  vm.runInNewContext(readSource+
    "\nroot.__owner={pauseReadForInterruption,resumeReadAudioFromGesture,"+
    "get:()=>({recovery:readAudioRecovery,attempt:readAudioRecoveryAttempt,"+
    "generation:readAudioRecoveryGeneration})};",ctx,
    {filename:"read_my_verse.js:N7m-owner"});
  async function flush(){for(let i=0;i<20;i++)await Promise.resolve();}
  return {root,document,ctx,bridge,listeners,state,calls,counts,scene,flush,
    api:root.BibloZooNativeReadOutputController,
    owner:root.__owner,
    setAllowed:ok=>{activateAllowed=ok;},
    settleActivation:ok=>{const fn=activateResolve;activateResolve=null;
      assert(fn,"No delayed native activation");fn({activated:ok});},
    os:phase=>{assert.equal(document.hidden,false);
      assert(listeners.biblozooReadLifecycle);listeners.biblozooReadLifecycle({phase});},
    noActivity:()=>{state.verseId="";state.phase="idle";},
    tick:()=>{now+=30;}
  };
}
async function run(){
  // Real Swift interruption .began may occur without UIApplication inactive
  // and with zero active sound clips: must freeze Keyboard immediately.
  const keyboard=fixture();
  assert.equal(keyboard.root.__overlay,undefined);
  await keyboard.api.activateFromGesture();
  let progress=0;
  keyboard.api.onAppInactive(()=>{progress++;});
  keyboard.os("unrelatedNotification");
  assert.equal(progress,0,"Unrelated events cannot show Welcome Back");
  keyboard.os("audioInterruptionBegan");
  assert.equal(progress,1);
  assert.equal(keyboard.owner.get().recovery.kind,"ack");
  assert.equal(keyboard.root.__overlay,true);
  assert.equal(keyboard.counts.freezeTyping,1);
  assert.equal(keyboard.counts.thawTyping,0);
  assert.equal(keyboard.api.playCue("order",1,false,false),false,
    "AirPods external Play revokes old native audio priority");
  // Tap to return is not proof of audio: denied native session must retain
  // the welcome popup, without requiring another screen or page reload.
  keyboard.setAllowed(false);
  assert.equal(keyboard.owner.resumeReadAudioFromGesture(),true);
  assert.equal(keyboard.root.__overlay,true);
  await keyboard.flush();
  assert.equal(keyboard.root.__overlay,true,"denied native claim keeps popup");
  assert.match(keyboard.owner.get().recovery.error,/Audio isn't ready/);
  assert.equal(keyboard.counts.thawTyping,0);
  keyboard.setAllowed(true);
  keyboard.owner.resumeReadAudioFromGesture();
  assert.equal(keyboard.root.__overlay,true,"native ACK is async, no early dismissal");
  await keyboard.flush();
  assert.equal(keyboard.owner.get().recovery,null);
  assert.equal(keyboard.root.__overlay,false);
  assert.equal(keyboard.counts.thawTyping,1,
    "successful actual native gesture resumes same Keyboard intro clock");
  assert.equal(keyboard.calls.filter(x=>x[0]==="activate").length,3);
  assert.equal(keyboard.calls.filter(x=>x[0]==="play").length,0,
    "silent Keyboard recovery never fabricates narration");

  // All other Read activity modes share the same OS lifecycle listener.
  for(const activityId of ["typewriter","balloons","fish","order","unscramble"]){
    const f=fixture({activityId});
    await f.api.activateFromGesture();
    f.os("audioInterruptionBegan");
    assert(f.owner.get().recovery,activityId+" must enter recovery");
    assert.equal(f.root.__overlay,true);
    assert.equal(f.owner.get().recovery.kind,
      ["balloons","fish"].includes(activityId)?"animated":"ack");
    assert.equal(f.counts.freezeScene>0,["balloons","fish"].includes(activityId),
      activityId+" scene freezes only when animated");
  }
  // When a Balloon has no active narrator, an OS-denied audio session
  // must not allow its animation to thaw on a vacuous Promise.resolve().
  const balloon=fixture({activityId:"balloons"});
  balloon.os("audioInterruptionBegan");
  balloon.setAllowed(false);
  balloon.owner.resumeReadAudioFromGesture();
  await balloon.flush();
  assert.equal(balloon.root.__overlay,true);
  assert.equal(balloon.counts.thawScene,0);
  balloon.setAllowed(true);
  balloon.owner.resumeReadAudioFromGesture();
  await balloon.flush();
  assert.equal(balloon.root.__overlay,false);
  assert.equal(balloon.counts.thawScene,1);

  // Multiple notifications while recovery is up are idempotent.
  const repeats=fixture();
  repeats.os("audioInterruptionBegan");
  const frozen=repeats.owner.get().recovery;
  repeats.os("routeInterrupted");
  repeats.os("mediaServicesInterrupted");
  repeats.os("willResignActive");
  assert.equal(repeats.owner.get().recovery,frozen);
  assert.equal(repeats.counts.thawTyping,0);
  assert.equal(repeats.root.__overlay,true);
  repeats.noActivity();
  repeats.os("audioInterruptionBegan");
  assert.equal(repeats.owner.get().recovery,frozen,
    "Idle/Exited Read must not create a NEW recovery");

  // External Play while a real native Read clip is owned: one interrupted
  // owner, never false ended/score. The same Read overlay handles it.
  const clip=fixture();
  await clip.api.activateFromGesture();
  const sound=new clip.api.NativeAudio("./verse_audio/john_3_16a.mp3");
  let ended=0,error=0;
  sound.addEventListener("ended",()=>ended++);
  sound.addEventListener("error",()=>error++);
  await sound.play();
  clip.os("audioInterruptionBegan");
  assert.equal(error,1);
  assert.equal(ended,0);
  assert(clip.owner.get().recovery);
  assert.equal(clip.root.__overlay,true);

  // Pending activation after a second AirPods Play cannot clear popup.
  const race=fixture({delayActivation:true});
  race.os("audioInterruptionBegan");
  race.owner.resumeReadAudioFromGesture();
  race.os("audioInterruptionBegan");
  race.settleActivation(true);await race.flush();
  assert.equal(race.root.__overlay,true);
  assert.equal(race.owner.get().recovery.kind,"ack");
  assert.equal(race.counts.thawTyping,0);

  // JS native adapter does NOT install in Web/PWA/Android. Native lifecycle
  // events must not change original browser activity recovery semantics.
  const web={document:{hidden:false},
    BibloZooNativeOnlyOutput:{enabled:false},
    Capacitor:{isNativePlatform:()=>false,getPlatform:()=>"web"}};
  vm.runInNewContext(adapter,{window:web,Map,Set,Promise,Math,Array,Object});
  assert.equal(web.BibloZooNativeReadOutputController,undefined);
  console.log("N7m PASS: OS PiP/AirPods Play during quiet Keyboard, Typewriter, "+
    "Balloons, Fish, Order, Scramble and active clip pauses Read/Welcome Back; "+
    "old sound priority revoked, failed/late native claim retains overlay, "+
    "real gesture reclaims and only then thaws; no fake sound/credit/Web fallback.");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
