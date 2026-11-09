"use strict";
// N6l: Linux VM/static checks never claim Xcode Swift compilation or audible speaker output.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper=read("verse_games/shared/native-traffic-tap-audio.js");
const game=read("verse_games/traffic_tap/game.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/traffic_tap/index.html");
const handoff=read("docs/PROJECT-HANDOFF.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const ids=[
  ["zoomLaunch","traffic-zoom"],
  ["correctTap","traffic-correct"],
  ["wrongTap","traffic-wrong"],
  ["rainbowJackpot","traffic-rainbow"],
  ["truckIntro","traffic-truck-intro"],
  ["truckOutro","traffic-truck-outro"],
  ...Array.from({length:8},(_,i)=>["bonusTap"+(i+1),"traffic-bonus-"+(i+1)])
];
function extract(start,end){
  const a=game.indexOf(start),b=game.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a,"missing game source segment: "+start);
  return game.slice(a,b);
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const calls=[],listeners={};
  let activation={ready:true,reason:"os-accepted"};
  let playback={accepted:true};
  const bridge={
    activateFromGesture({purpose}){calls.push(["activate",purpose]);return Promise.resolve(activation);},
    preload({soundId}){calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:200});},
    play({soundId,volume,eventId}){calls.push(["play",soundId,volume,eventId]);return Promise.resolve(playback);},
    stop({soundId}){calls.push(["stop",soundId]);return Promise.resolve({stopped:true});},
    addListener(name,fn){listeners[name]=fn;return Promise.resolve({remove(){}});}
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:bridge}},
    document:{hidden:false,addEventListener:(name,fn)=>{listeners[name]=fn;}},
    addEventListener:(name,fn)=>{listeners[name]=fn;},setTimeout,clearTimeout
  };
  vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,Error,
    Number,setTimeout,clearTimeout});
  return {api:win.BibloZooNativeTrafficTapAudio,calls,listeners,
    activation:v=>{activation=v;},playback:v=>{playback=v;}};
}
async function controllerChecks(){
  assert.match(html,/native-traffic-tap-audio\.js[\s\S]*game\.js/);
  assert.match(workflow,/validate_native_traffic_tap_n6l\.js/);
  assert.match(handoff,/N6l Traffic Tap/);
  assert.match(handoff,/#52[\s\S]*MERGED/);
  assert.match(swift,/public\/verse_games\/traffic_tap\/traffic_tap_sounds/);
  assert.match(swift,/"traffic-zoom": "sound_zoom"/);
  assert.match(swift,/private let trafficTapToneIDs: Set<String>/);
  assert.match(swift,/prepareTrafficTapToneOnWorker\(soundId: soundId\)/);
  assert.match(swift,/let pairs: \[\(Double, Double\)\]/);
  assert.match(swift,/suffix >= 1, suffix <= pairs.count/);
  assert.match(swift,/0\.075 \* 1\.15/);
  assert.match(swift,/volume = 3\.20/);
  assert.match(swift,/volume = 3\.00/);
  assert.match(swift,/0\.30 \* 0\.85/);
  assert.match(swift,/0\.10 \* 3\.40/);
  const zoom=path.join(root,"verse_games/traffic_tap/traffic_tap_sounds/sound_zoom.mp3");
  assert.ok(fs.statSync(zoom).size>1000,"original zoom is actually packaged");
  for(const [key,id] of ids){
    assert.ok(helper.includes(key+': "'+id+'"'),key+" mapping missing");
    assert.ok(swift.includes('"'+id+'"'),"Swift allowlist missing "+id);
  }
  const f=fixture();
  assert.equal(f.api.isAvailable(),true);
  assert.equal(f.api.soundIds.length,16,"1 MP3 + 13 fixed synth + 2 UI pops");
  assert.equal(new Set([...f.api.soundIds]).size,16,"no duplicate fixed IDs");
  assert.equal(f.api.tapUiFromGesture("uiTap1",.45),true);
  await flush();await flush();
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,
    "Title Help and Back only prepare 2 UI sounds");
  f.calls.length=0;
  assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.45})).ready,true);
  assert.equal(f.calls[0][0],"activate","real user gesture requests priority FIRST");
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,16);
  assert.ok(f.calls.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2") <
    f.calls.findIndex(x=>x[0]==="preload"&&x[1]==="traffic-zoom"),
    "mode pop before decoding the game bank");
  f.calls.length=0;
  for(const [key] of ids)assert.equal(f.api.play(key,1),true);
  assert.equal(f.api.play("uiTap2",.45),true);
  await flush();
  assert.deepEqual(f.calls.filter(x=>x[0]==="play").map(x=>x[1]),
    ids.map(x=>x[1]).concat(["ui-pop-2"]),
    "all eight different bonus pairs and five other generated tones dispatch");
  const events=[];
  f.api.configure({
    onAppInactive:()=>events.push("pause"),
    onAppActive:()=>events.push("welcome"),
    onPlaybackFailure:()=>events.push("fatal")
  });
  f.playback({accepted:false,reason:"activation-os-rejected"});
  f.api.play("correctTap",1);
  await flush();await flush();
  assert.deepEqual(events,["pause","welcome"],"true PiP denial is not permanent PCM failure");
  assert.equal(f.api.isReady(),false);
  f.activation({ready:false,reason:"other-audio-playing"});
  assert.equal((await f.api.prepareFromGesture()).reason,"other-audio-playing");
  f.activation({ready:true,reason:"os-accepted"});
  f.playback({accepted:true});
  assert.equal((await f.api.prepareFromGesture()).ready,true);
  const num=f.calls.filter(x=>x[0]==="activate").length;
  f.listeners.biblozooAppLifecycle?.({active:false});
  assert.equal(f.api.isReady(),false,"held App Switcher invalidates voices");
  f.listeners.biblozooAppLifecycle?.({active:true});
  assert.equal(f.calls.filter(x=>x[0]==="activate").length,num,
    "foreground never automatically reclaims PiP audio");
  await f.api.stop();
  assert.equal(f.api.play("correctTap",1),false);
}
function actualGameSounds(){
  const heard=[];
  const scope={
    nativeTrafficAudio:{play:(key,vol)=>heard.push([key,vol])},
    state:{running:true,paused:false,bonusStreak:1},
    muted:false,returnPaused:false,nativeTrafficPending:false,
    nativeTrafficFailure:false,document:{hidden:false},
    console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function playGameSound(eventId) {",
    "  preloadTrafficTapImages();")+
    "\nthis.testPlay=playGameSound;",scope);
  for(const e of ["correctTap","wrongTap","truckIntro","truckOutro","rainbowJackpot"])
    scope.testPlay(e);
  for(const streak of [1,2,5,8,9]){
    scope.state.bonusStreak=streak;scope.testPlay("bonusTap");
  }
  assert.deepEqual(heard,[
    ["correctTap",1],["wrongTap",1],["truckIntro",1],
    ["truckOutro",1],["rainbowJackpot",1],
    ["bonusTap1",1],["bonusTap2",1],["bonusTap5",1],
    ["bonusTap8",1],["bonusTap1",1]
  ],"real bonus streak wraps after 8 correctly with fixed precomputed PCM");
  const before=heard.length;
  scope.state.paused=true;scope.testPlay("correctTap");
  scope.state.paused=false;scope.muted=true;scope.testPlay("wrongTap");
  scope.muted=false;scope.returnPaused=true;scope.testPlay("bonusTap");
  assert.equal(heard.length,before,"no hot sound while menu, mute, PiP");
}
function realMenus(){
  let menu,speed;
  const calls=[];
  const scope={
    window:{VerseGameShell:{
      wireGameMenu:o=>{menu=o;},wireSpeedMenu:o=>{speed=o;}
    },VerseGameBridge:{exitGame:()=>calls.push("exit")}},
    state:{running:true,paused:false,pauseReason:"",
      mainDone:false,bonusRound:false,bonusIntro:false,lastSpawnAt:0},
    nativeTrafficAudio:{stop:()=>{calls.push("stop");return Promise.resolve();},
      isReady:()=>true},
    nativeTrafficPending:false,nativeTrafficFailure:false,
    muted:false,returnPaused:false,
    playUiTapSound:()=>calls.push("pop"),
    primeNativeTrafficFromGesture:(...args)=>calls.push(["prime",...args]),
    stopNativeTrafficRound:()=>calls.push("stopRound"),
    setPaused:(v,reason="")=>{scope.state.paused=v;scope.state.pauseReason=v?reason:"";},
    openHelpFromMenu:()=>calls.push("help"),
    renderModeSelect:()=>calls.push("mode"),
    unlockAudio:()=>{throw Error("Web audio must not be called on native")},
    gameNow:()=>5000,randomSpawnDelay:()=>1200,
    HELP_OVERLAY_ID:"ttHelpOverlay",console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function wireCommonNav() {",
    "  function toggleMute(")+"\nthis.wireCommonNav=wireCommonNav;",scope);
  scope.wireCommonNav();
  assert.ok(menu&&speed);
  assert.equal(menu.onOpen(),true);
  assert.equal(scope.state.paused,true);
  assert.equal(menu.onOpen(),false,"duplicate native menu event ignored");
  menu.onClose();
  assert.ok(calls.find(x=>Array.isArray(x)&&x[0]==="prime"&&x[1]==="resume"),
    "Game Close preflights native PCM");
  scope.state.paused=false;scope.state.pauseReason="";
  assert.equal(speed.onOpen(),true);
  speed.onChange();speed.onClose();
  assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==="prime").length,2,
    "Speed Close preflights again");
  scope.state.mainDone=true;
  assert.equal(speed.onOpen(),false,"no Speed in bonus round");
  menu.onModeSelect();
  assert.ok(calls.includes("stopRound")&&calls.includes("mode"));
}
async function welcome(){
  assert.match(game,/useZooEscape: !nativeTrafficAudio/);
  assert.match(game,/suppressUiSound: !!nativeTrafficAudio/);
  assert.match(game,/trafficWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
  assert.match(game,/trafficWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
  assert.match(game,/if \(nativeTrafficAudio\) return null;/);
  assert.match(game,/if \(nativeTrafficAudio\) return nativeTrafficAudio\.isReady\(\)/);
  assert.match(game,/if \(nativeTrafficAudio\) return;/);
  let accepted={ready:false,reason:"activation-os-rejected"};
  const calls=[];
  const scope={
    nativeTrafficAudio:{prepareFromGesture:()=>{calls.push("gesture");return Promise.resolve(accepted);}},
    window:{BibloZooWelcomeBackReturn:{
      nativeAudioResumeResult:r=>r.ready?true:{deferred:true,reason:r.reason}}},
    document:{hidden:false,body:{classList:{remove:()=>{}}}},
    returnPaused:true,returnSession:3,muted:false,
    returnRecoveryFailures:0,returnContextReplacements:0,
    returnWasLooping:true,returnPriorPauseReason:null,
    audioCtx:null,audioUnlocked:false,
    welcomeClock:{resume:()=>calls.push("clock")},
    restoreWelcomeAnimations:()=>{},
    setPaused:()=>{},startLoop:()=>calls.push("loop"),
    state:{running:true},Promise,console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function continueFromWelcomeBack() {",
    "  trafficWelcomeBack = window.BibloZooWelcomeBackReturn")+
    "\nthis.testContinue=continueFromWelcomeBack;",scope);
  const defer=await scope.testContinue();
  assert.equal(defer.deferred,true,"PiP OS refusal is retryable");
  assert.equal(scope.returnPaused,true,"game remains frozen");
  assert.ok(!calls.includes("clock"));
  accepted={ready:true,reason:"prepared"};
  assert.equal(await scope.testContinue(),true);
  assert.equal(scope.returnPaused,false);
  assert.ok(calls.includes("clock")&&calls.includes("loop"),
    "same session/game clock and vehicle loop resume only after real tap");
}
(async()=>{
  await controllerChecks();
  actualGameSounds();
  realMenus();
  await welcome();
  console.log("N6l Traffic Tap: 1 MP3 + 13 synthesized (8 bonus pairs) + 2 UI, real Game/Speed callbacks, PiP PASS");
})().catch(err=>{console.error(err);process.exitCode=1;});