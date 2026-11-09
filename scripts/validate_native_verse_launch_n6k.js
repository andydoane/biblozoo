"use strict";
// N6k: Linux static/VM regressions are NOT Swift compilation or audible iPhone proof.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper=read("verse_games/shared/native-verse-launch-audio.js");
const game=read("verse_games/verse_launch/game.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/verse_launch/index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const songs=[
  ["correctTap","launch-correct","verse_launch_zoom"],
  ["wrongTap","launch-wrong","verse_launch_wrong"],
  ["wordAdded","launch-collect","verse_launch_collect"],
  ["asteroidDestroyed","launch-explode","verse_launch_explode"],
  ["playerAsteroidHit","launch-hit","verse_launch_explode_2"],
  ["landingStart","launch-land","verse_launch_land"],
  ["launchButton","launch-launch","verse_launch_launch"],
  ["cutsceneRocketEnter","launch-enter","verse_launch_launch_2"]
];
const tones=[
  ["countdownBeep","launch-countdown-low"],
  ["countdownFinalBeep","launch-countdown-high"],
  ["projectileTick","launch-projectile-tick"],
  ["projectileTock","launch-projectile-tock"]
];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const extract=(a,b)=>{
  const i=game.indexOf(a),j=game.indexOf(b,i+a.length);
  assert.ok(i>0 && j>i,"game code contains "+a);
  return game.slice(i,j);
};
function nativeFixture(){
  const calls=[],listeners={};
  let activation={ready:true,reason:"os-accepted"},playback={accepted:true};
  const bridge={
    activateFromGesture({purpose}){calls.push(["activate",purpose]);return Promise.resolve(activation);},
    preload({soundId}){calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:180});},
    play({soundId,volume,eventId}){calls.push(["play",soundId,volume,eventId]);return Promise.resolve(playback);},
    stop({soundId}){calls.push(["stop",soundId]);return Promise.resolve({stopped:true});},
    addListener(name,callback){listeners[name]=callback;return Promise.resolve({remove(){}});}
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:bridge}},
    document:{hidden:false,addEventListener:(n,cb)=>{listeners[n]=cb;}},
    addEventListener:(n,cb)=>{listeners[n]=cb;},
    setTimeout,clearTimeout
  };
  vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,Error,
    Number,setTimeout,clearTimeout});
  return{calls,listeners,api:win.BibloZooNativeVerseLaunchAudio,
    setActivation:v=>{activation=v;},setPlayback:v=>{playback=v;}};
}
async function controller(){
  assert.match(html,/native-verse-launch-audio\.js[\s\S]*game\.js/);
  assert.match(workflow,/validate_native_verse_launch_n6k\.js/);
  assert.match(handoff,/N6k Verse Launch/);
  assert.match(handoff,/N6j[\s\S]*#51[\s\S]*MERGED/);
  assert.match(swift,/public\/verse_games\/verse_launch\/verse_launch_sounds/);
  const assets=fs.readdirSync(path.join(root,"verse_games/verse_launch/verse_launch_sounds"));
  for(const [key,id,file] of songs){
    assert.ok(helper.includes(key+': "'+id+'"'),key+" controller ID");
    assert.ok(swift.includes('"'+id+'": "'+file+'"'),id+" Swift ID");
    assert.ok(assets.includes(file+".mp3"),file+" packaged");
  }
  assert.ok(helper.includes('starCollected: "launch-collect"'),"same original collect effect aliased");
  for(const [key,id] of tones)assert.ok(helper.includes(key+': "'+id+'"'),"tone key "+id);
  assert.match(swift,/private let verseLaunchToneIDs: Set<String>/);
  assert.match(swift,/prepareVerseLaunchToneOnWorker\(soundId: soundId\)/);
  assert.match(swift,/let freqStart: Double/);
  assert.match(swift,/523\.25 : 261\.63/);
  assert.match(swift,/820\.0 : 1180\.0/);
  assert.match(swift,/0\.90 \* \(isProjectile/);
  const f=nativeFixture();
  assert.equal(f.api.isAvailable(),true);
  assert.equal(f.api.soundIds.length,14,"8 MP3 + 4 synthesized + 2 shared UI, no duplicate collect");
  assert.equal(new Set([...f.api.soundIds]).size,14);
  assert.equal(f.api.tapUiFromGesture("uiTap1",.405),true);
  await flush();await flush();
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,"title only warms 2 UI");
  f.calls.length=0;
  assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.405})).ready,true);
  assert.equal(f.calls[0][0],"activate","activate must be first within real gesture");
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,14);
  assert.ok(f.calls.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2") <
    f.calls.findIndex(x=>x[0]==="preload"&&x[1]==="launch-correct"),
    "menu UI pop before whole game bank");
  f.calls.length=0;
  for(const [key] of [...songs,...tones])assert.equal(f.api.play(key,.4),true);
  assert.equal(f.api.play("starCollected",.4),true);
  await flush();
  assert.deepEqual(f.calls.filter(x=>x[0]==="play").map(x=>x[1]),
    [...songs,...tones].map(x=>x[1]).concat(["launch-collect"]),
    "every recorded, synthesized and aliased cue dispatches fixed native ID");
  const events=[];
  f.api.configure({
    onAppInactive:()=>events.push("pause"),
    onAppActive:()=>events.push("show"),
    onPlaybackFailure:()=>events.push("fatal")
  });
  f.setPlayback({accepted:false,reason:"activation-os-rejected"});
  f.api.play("correctTap",.4);
  await flush();await flush();
  assert.deepEqual(events,["pause","show"],"OS busy is Welcome Back rather than terminal sound failure");
  assert.equal(f.api.isReady(),false);
  f.setActivation({ready:false,reason:"other-audio-playing"});
  assert.equal((await f.api.prepareFromGesture()).reason,"other-audio-playing");
  assert.ok(events.filter(x=>x==="pause").length>=2);
  f.setActivation({ready:true,reason:"os-accepted"});
  f.setPlayback({accepted:true});
  assert.equal((await f.api.prepareFromGesture()).ready,true);
  const activations=f.calls.filter(x=>x[0]==="activate").length;
  f.listeners.biblozooAppLifecycle?.({active:false});
  assert.equal(f.api.isReady(),false,"held App Switcher invalidates bank");
  f.listeners.biblozooAppLifecycle?.({active:true});
  assert.equal(f.calls.filter(x=>x[0]==="activate").length,activations,
    "app foreground never steals session automatically");
  await f.api.stop();
  assert.equal(f.api.play("correctTap",.4),false);
}
async function hotAudio(){
  const heard=[];
  const scope={
    nativeLaunchAudio:{play:(key,vol)=>heard.push([key,vol])},
    muted:false,returnPaused:false,nativeLaunchPending:false,
    nativeLaunchFailure:false,document:{hidden:false},
    state:{menuOpen:false,helpOpen:false,speedMenuOpen:false,
      astroProjectileSoundFlip:false},
    soundVolume:key=>({correctTap:.45,starCollected:.45})[key]??.5,
    console,Promise
  };
  vm.createContext(scope);
  vm.runInContext(
    extract("  async function playGameSound(key, volumeKey = key) {",
      "  function playUiTapSound() {")+
    extract("  async function playCountdownBeep(finalBeep = false) {",
      "  function parseReferenceParts(")+
    "\nthis.test={playGameSound,playCountdownBeep,playProjectileFireSound};",scope);
  await scope.test.playGameSound("correctTap");
  await scope.test.playGameSound("starCollected");
  await scope.test.playCountdownBeep(false);
  await scope.test.playCountdownBeep(true);
  await scope.test.playProjectileFireSound();
  await scope.test.playProjectileFireSound();
  assert.deepEqual(heard,[
    ["correctTap",.45],["starCollected",.45],
    ["countdownBeep",1],["countdownFinalBeep",1],
    ["projectileTick",1],["projectileTock",1]
  ],"real game callbacks preserve authored MP3 gain and baked fixed-oscillator gains");
  const n=heard.length;
  scope.returnPaused=true;await scope.test.playGameSound("wrongTap");
  await scope.test.playCountdownBeep();
  await scope.test.playProjectileFireSound();
  scope.returnPaused=false;scope.nativeLaunchPending=true;
  await scope.test.playGameSound("asteroidDestroyed");
  assert.equal(heard.length,n,"no sounds while paused/interrupted/preloading");
}
function entryAndMenus(){
  let title,mode,menu,speed,bonusMenu;
  const calls=[];
  const shell={
    renderTitleScreen:o=>title=o,
    renderModeSelect:o=>mode=o,
    wireGameMenu:o=>{if(!menu)menu=o;else bonusMenu=o;},
    wireSpeedMenu:o=>speed=o
  };
  const scope={
    window:{VerseGameShell:shell,VerseGameBridge:{exitGame:()=>calls.push("exit")}},
    document:{hidden:false,querySelectorAll:()=>[],getElementById:()=>null},
    app:{removeAttribute(){},setAttribute(){}},
    nativeLaunchAudio:{stop:()=>calls.push("stop")},
    nativeLaunchPending:false,nativeLaunchFailure:false,returnPaused:false,
    muted:false,selectedMode:null,
    state:{uiSoundFlip:false,screen:"game",menuOpen:false,helpOpen:false,
      helpBackMode:false,speedMenuOpen:false,busy:false,bonusReady:false,
      astroMoveDir:0},
    HELP_OVERLAY_ID:"vlHelpOverlay",GAME_TITLE:"Verse Launch",GAME_ICON:"rocket",
    GAME_ICON_HTML:"rocket",GAME_THEME:{},
    helpHtml:()=>"",playUiTapSound:()=>calls.push("pop"),
    nextNativeLaunchUiKey:()=>"uiTap2",stopNativeLaunchRound:()=>calls.push("stopRound"),
    primeNativeLaunchFromGesture:(...args)=>calls.push(["prepare",...args]),
    setScreen:screen=>{scope.state.screen=screen;},
    unlockAudio:()=>Promise.resolve(true),$:(name)=>null,
    canOpenGameMenu:()=>true,stopConveyorLoop:()=>calls.push("stopConveyor"),
    startConveyorLoop:()=>calls.push("startConveyor"),
    stopAstroLoop:()=>{},syncGameClockPause:()=>{},
    syncGameMenuOpenState:()=>{},console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function renderIntro() {","  function renderGame() {")+
    extract("  function wireGameScreen() {","  function wireAstroControls() {")+
    "\nthis.test={renderIntro,renderMode,wireGameScreen,wireBonusMenuOnly};",scope);
  scope.test.renderIntro();title.onStart();assert.ok(mode);
  mode.onSelect("hard");
  assert.deepEqual(calls.find(x=>Array.isArray(x)&&x[0]==="prepare"),
    ["prepare","round","hard","uiTap2"],"mode cannot enter game before 14 preloads");
  scope.test.wireGameScreen();
  assert.ok(menu&&speed);
  menu.onOpen();menu.onClose();speed.onOpen();speed.onClose();
  const prepared=calls.filter(x=>Array.isArray(x)&&x[0]==="prepare");
  assert.equal(prepared.length,3,"mode + Game Close + Speed Close");
  assert.deepEqual(prepared[1],["prepare","resume",null,"uiTap2"]);
  assert.deepEqual(prepared[2],["prepare","resume",null,"uiTap2"]);
  scope.test.wireBonusMenuOnly();
  bonusMenu.onOpen();bonusMenu.onClose();
  assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==="prepare").length,4,
    "asteroid bonus Game Close also re-prepares same PCM bank");
}
async function welcome(){
  assert.match(game,/useZooEscape: !nativeLaunchAudio/);
  assert.match(game,/suppressUiSound: !!nativeLaunchAudio/);
  assert.match(game,/launchWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
  assert.match(game,/launchWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
  assert.match(game,/nativeLaunchPending \|\| nativeLaunchFailure/);
  assert.match(game,/if \(nativeLaunchAudio\) return null;/);
  assert.match(game,/if \(nativeLaunchAudio\) return Promise\.resolve\(nativeLaunchAudio\.isReady\(\)\)/);
  assert.match(game,/if \(!nativeLaunchAudio\) document\.addEventListener\("pointerdown"/);
  assert.match(game,/if \(nativeLaunchAudio\) return;[\s\S]{0,90}Object\.keys\(SOUND_FILES\)/);
  let acceptance={ready:false,reason:"activation-os-rejected"};
  const events=[],scope={
    nativeLaunchAudio:{prepareFromGesture:()=>{events.push("gesture");return Promise.resolve(acceptance);}},
    window:{BibloZooWelcomeBackReturn:{nativeAudioResumeResult:r=>r.ready?true:{
      deferred:true,reason:r.reason}}},
    },
    document:{hidden:false,body:{classList:{remove:()=>{}}}},
    returnPaused:true,returnSession:3,returnRecoveryFailures:0,
    returnContextReplacements:0,returnConveyorWasRunning:true,
    returnAstroWasRunning:false,muted:false,audioUnlocked:false,
    audioForegroundFreshContextOnGesture:false,audioCtx:null,
    state:{screen:"game",bonusReady:false,busy:false},
    syncGameClockPause:()=>events.push("clock"),
    restoreWelcomeAnimations:()=>{},
    startConveyorLoop:()=>events.push("conveyor"),
    Promise,console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function continueFromWelcomeBack() {",
    "  launchWelcomeBack = window.BibloZooWelcomeBackReturn"),scope);
  const defer=await scope.continueFromWelcomeBack();
  assert.equal(defer.deferred,true,"real OS denial stays retryable");
  assert.equal(scope.returnPaused,true,"no auto-resume after PiP denied");
  acceptance={ready:true,reason:"prepared"};
  assert.equal(await scope.continueFromWelcomeBack(),true);
  assert.equal(scope.returnPaused,false);
  assert.ok(events.includes("conveyor"),"same game conveyor restarts after Let's go");
}
(async()=>{
  await controller();await hotAudio();entryAndMenus();await welcome();
  console.log("N6k Verse Launch: 8 recorded + 4 generated + 2 UI native PCM, live modes/menus, PiP PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
