"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const helper = read("verse_games/shared/native-versey-bird-audio.js");
const game = read("verse_games/versey_bird/game.js");
const html = read("verse_games/versey_bird/index.html");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const birdFiles = [
  ["flap1","bird-flap-1","versey_bird_flap_1"],
  ["flap2","bird-flap-2","versey_bird_flap_2"],
  ["flap3","bird-flap-3","versey_bird_flap_3"],
  ["flap4","bird-flap-4","versey_bird_flap_4"],
  ["boulder","bird-boulder","versey_bird_boulder"],
  ["correct","bird-correct","versey_bird_correct"],
  ["pipeCleared","bird-pipe-cleared","versey_bird_pipe_cleared"],
  ["pipeCrash","bird-pipe-crash","versey_bird_pipe_crash"],
  ["streak","bird-streak","versey_bird_streak"],
  ["wrong","bird-wrong","versey_bird_wrong"],
  ["beeHit","bird-bee-hit","versey_bird_bee_hit"]
];
const flush = () => new Promise(resolve => setImmediate(resolve));
function extract(from,to) {
  const start = game.indexOf(from), end = game.indexOf(to,start);
  assert.ok(start > 0 && end > start, "game source owns " + from);
  return game.slice(start,end);
}
function nativeFixture() {
  const calls = [];
  let activation = {ready:true,reason:"os-accepted"};
  let playback = {accepted:true};
  const listeners = {};
  const bridge = {
    activateFromGesture({purpose}) {
      calls.push(["activate",purpose]);
      return Promise.resolve(activation);
    },
    preload({soundId}) {
      calls.push(["preload",soundId]);
      return Promise.resolve({prepared:true,durationMs:180});
    },
    play({soundId,volume,eventId}) {
      calls.push(["play",soundId,volume,eventId]);
      return Promise.resolve(playback);
    },
    stop({soundId}) {
      calls.push(["stop",soundId]);
      return Promise.resolve({stopped:true});
    },
    addListener(name, callback) {
      listeners[name] = callback;
      return Promise.resolve({remove(){}});
    }
  };
  const win = {
    BibloZooNativeOnlyOutput: {enabled:true},
    Capacitor: {isNativePlatform:()=>true,getPlatform:()=> "ios",
      Plugins:{BibloZooNativeSound:bridge}},
    document: {hidden:false,addEventListener(name,callback){listeners[name]=callback;}},
    addEventListener(name,callback){listeners[name]=callback;},
    setTimeout,clearTimeout
  };
  vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,Error,
    Number,setTimeout,clearTimeout});
  return {audio:win.BibloZooNativeVerseyBirdAudio,bridge,calls,listeners,
    setActivation:v=>{activation=v;},setPlayback:v=>{playback=v;}};
}
async function controller() {
  assert.match(html,/native-versey-bird-audio\.js[\s\S]*game\.js/);
  assert.match(swift,/subdirectory: "public\/verse_games\/versey_bird\/versey_bird_sounds"/);
  const names = fs.readdirSync(path.join(root,"verse_games/versey_bird/versey_bird_sounds"));
  assert.equal(names.length,12,"one unused old flap sample remains; no invented sound");
  for(const [key,id,basename] of birdFiles) {
    assert.ok(helper.includes(key + ': "' + id + '"'), "controller maps " + id);
    assert.ok(swift.includes('"' + id + '": "' + basename + '"'), "Swift maps " + id);
    assert.ok(swift.includes('"' + id + '"'), "Swift PCM allowlist contains "+id);
    assert.ok(names.includes(basename+".mp3"),"shipped MP3 exists: "+basename);
  }
  assert.equal(new Set(birdFiles.map(x=>x[1])).size,11);
  assert.match(swift,/private let verseyBirdSoundResources/);
  const f = nativeFixture();
  assert.equal(f.audio.isAvailable(),true);
  assert.equal(f.audio.soundIds.length,13,"11 game and 2 native UI");
  assert.equal(f.audio.tapUiFromGesture("uiTap1",.37),true);
  await flush();await flush();
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,
    "title Help and Back only prewarm 2 UI clips");
  f.calls.length=0;
  assert.equal((await f.audio.prepareFromGesture({key:"uiTap2",volume:.36})).ready,true);
  assert.equal(f.calls[0][0],"activate","real mode gesture activates native session");
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,13);
  assert.ok(f.calls.findIndex(x=>x[0]==="play" && x[1]==="ui-pop-2") <
    f.calls.findIndex(x=>x[0]==="preload" && x[1]==="bird-flap-1"),
    "mode UI pop schedules before full game bank");
  for(const [key,id] of birdFiles) {
    assert.equal(f.audio.play(key,.5),true);
  }
  await flush();
  assert.deepEqual(f.calls.filter(x=>x[0]==="play" && x[1].startsWith("bird-"))
    .map(x=>x[1]),birdFiles.map(x=>x[1]),"no missing native cues");
  const events = [];
  f.audio.configure({
    onAppInactive:()=>events.push("pause"),
    onAppActive:()=>events.push("show"),
    onPlaybackFailure:()=>events.push("fatal")
  });
  f.setPlayback({accepted:false,reason:"other-audio-playing"});
  f.audio.play("flap1",.2);
  await flush();await flush();
  assert.deepEqual(events,["pause","show"],"PiP busy is plain Welcome Back, not PCM fatal");
  assert.equal(f.audio.isReady(),false);
  f.setActivation({ready:false,reason:"activation-os-rejected"});
  assert.equal((await f.audio.prepareFromGesture()).reason,"activation-os-rejected");
  assert.ok(events.filter(x=>x==="pause").length>=2,"OS refusal is retryable");
  f.setActivation({ready:true,reason:"os-accepted"});
  f.setPlayback({accepted:true});
  assert.equal((await f.audio.prepareFromGesture()).ready,true);
  const played=f.calls.filter(x=>x[0]==="play").length;
  f.listeners.biblozooAppLifecycle?.({active:false});
  assert.equal(f.audio.isReady(),false,"UIKit .inactive invalidates warm bank");
  f.listeners.biblozooAppLifecycle?.({active:true});
  assert.equal(f.calls.filter(x=>x[0]==="play").length,played,
    "lifecycle never plays or auto-activates");
  await f.audio.stop();
  assert.equal(f.audio.play("flap2",.5),false,"no hot PCM after Stop");
}
function gameButtons(native=true) {
  let title=null,mode=null,menu=null,speed=null;
  const events=[], prepares=[];
  const audio = native?{isReady:()=>true,stop:()=>{events.push("stop");}}:null;
  const shell = {
    renderTitleScreen: options => {title=options;},
    renderModeSelect: options => {mode=options;},
    wireGameMenu: options => {menu=options;},
    wireSpeedMenu: options => {speed=options;}
  };
  const scope = {
    window:{VerseGameShell:shell,VerseGameBridge:{exitGame:()=>events.push("exit")}},
    document:{hidden:false},app:{removeAttribute(){},setAttribute(){}},
    nativeBirdAudio:audio,nativeBirdPending:false,returnPaused:false,
    completed:false,muted:false,HELP_OVERLAY_ID:"vb2HelpOverlay",
    MENU_OVERLAY_ID:"vb2GameMenuOverlay",SPEED_MENU_OVERLAY_ID:"vb2SpeedMenuOverlay",
    GAME_TITLE:"Versey Bird",GAME_ICON:"bird",GAME_ICON_HTML:"bird",GAME_THEME:{},
    state:{running:true,paused:false,pauseReason:""},
    stopLoop:()=>{},cleanupResize:()=>{},clearNativeBirdFailure:()=>{},
    stopNativeBirdRound:()=>events.push("stop-round"),
    introHelpHtml:()=>"",modeHelpHtml:()=>"",
    wireNativeBirdTitleHelpPops:()=>{},
    playUiTapSound:()=>events.push("pop"),
    nextNativeBirdUiKey:()=> "uiTap2",
    primeNativeBirdFromGesture:(...args)=>prepares.push(args),
    unlockAudio:()=>Promise.resolve(true),
    startGame:()=>events.push("start"),renderModeSelect:()=>{},
    renderIntro:()=>{},setPaused:(paused,reason="")=> {
      scope.state.paused=paused;scope.state.pauseReason=paused?reason:"";
    },
    openHelpFromMenu:()=>events.push("help"),Promise,console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function renderIntro(){","  function startGame(")+
    extract("  function wireCommonNav(){","  function openHelpFromMenu(){")+
    "\nthis.test = {renderIntro,renderModeSelect,wireCommonNav};",scope);
  scope.test.renderIntro();
  title.onStart();assert.ok(mode);
  mode.onSelect("hard");
  if(native) {
    assert.equal(prepares.length,1,"mode waits for whole PCM bank");
    assert.equal(prepares[0][2],"uiTap2","mode pop before bank");
    assert.ok(!events.includes("start"),"no ghost round");
  } else {
    assert.ok(events.includes("start"),"web gameplay unchanged");
    assert.equal(prepares.length,0);
  }
  scope.test.wireCommonNav();
  menu.onOpen();
  assert.equal(scope.state.paused,true);
  const before=prepares.length;
  menu.onClose();
  if(native){
    assert.equal(prepares.length,before+1,"menu Close is a real native prewarm tap");
    speed.onOpen();
    speed.onClose();
    assert.equal(prepares.length,before+2,"speed Close prewarms");
  } else assert.equal(prepares.length,0);
  return {events,prepares};
}
async function welcome() {
  assert.match(game,/if \(nativeBirdAudio\) stopNativeBirdRound\(\);[\s\S]{0,180}if \(returnPaused\) return;/);
  assert.match(game,/nativeBirdAudio\.prepareFromGesture\(\)\.then\(result/);
  assert.match(game,/nativeAudioResumeResult/);
  assert.match(game,/useZooEscape: !nativeBirdAudio/);
  assert.match(game,/suppressUiSound: !!nativeBirdAudio/);
  assert.match(game,/birdWelcomeBack\?\.showAfterNativeActive/);
  assert.match(game,/birdWelcomeBack\?\.pauseFromNativeInactive/);
  assert.match(game,/nativeBirdWakePromise[\s\S]*nativeBirdAudio\.prepareFromGesture/);
  assert.match(game,/if \(!ready \|\| document.hidden \|\| !nativeBirdAudio.isReady\(\)\)/);
  assert.match(game,/startGame\(\s*checkpoint.mode,\s*checkpoint\s*\)/);
  assert.match(game,/if \(nativeBirdAudio\) return null;[\s\S]*function ensureSilenceAudio/);
  const actions=[];
  let outcome={ready:false,reason:"activation-os-rejected"};
  const scope={
    nativeBirdAudio:{prepareFromGesture:()=>{actions.push("gesture");return Promise.resolve(outcome);}},
    window:{BibloZooWelcomeBackReturn:{nativeAudioResumeResult:result=>
      result.ready?true:({deferred:true,reason:result.reason})}},
    returnPaused:true,returnSession:5,muted:false,audioCtx:null,
    returnPriorPauseReason:null,returnAnimating:[],
    state:{lastTs:1},welcomeClock:{resume:()=>actions.push("clock-resume")},
    document:{hidden:false,body:{classList:{remove:()=>{}}}},
    setPaused:()=>{},Promise,console,unlockAudio:()=>{},
    replaceWelcomeAudioContext:()=>false
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function continueFromWelcomeBack() {",
    "  birdWelcomeBack = window.BibloZooWelcomeBackReturn"),scope);
  const deferred=await scope.continueFromWelcomeBack();
  assert.equal(deferred.deferred,true,"PiP refusal must defer, not finish");
  assert.equal(scope.returnPaused,true,"same round remains paused");
  assert.ok(!actions.includes("clock-resume"),"no timer catch-up");
  outcome={ready:true,reason:"prepared"};
  assert.equal(await scope.continueFromWelcomeBack(),true);
  assert.equal(scope.returnPaused,false);
  assert.ok(actions.includes("clock-resume"),"only successful real tap restarts clock");
}
(async()=>{
  await controller();
  gameButtons(true);gameButtons(false);
  await welcome();
  console.log("N6i Versey Bird 11 fixed PCM + 2 UI, real mode/menu/speed, PiP deferral, midpoint checkpoint and browser isolation PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});
