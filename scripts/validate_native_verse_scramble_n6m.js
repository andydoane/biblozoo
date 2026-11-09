"use strict";
// N6m last standalone game: Linux mocks/Swift source checks DO NOT compile
// AVFoundation on Mac or demonstrate actual iPhone acoustic output.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper=read("verse_games/shared/native-verse-scramble-audio.js");
const game=read("verse_games/verse_scramble_neo/game.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/verse_scramble_neo/index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
// The production build copies standalone source as an asset. Parse the ENTIRE
// real game now so accidental edits outside extracted VM segments cannot pass.
new vm.Script(game,{filename:"verse_games/verse_scramble_neo/game.js"});
const midi=[60,62,64,65,67,69,71,72];
const fixed=[
  ["wrongLetter","scramble-wrong-letter"],
  ["wordComplete","scramble-word-complete"],
  ["lettersFall","scramble-letters-fall"],
  ["messagePop","scramble-message-pop"],
  ["bonusStart","scramble-bonus-start"],
  ["bonusYouWin","scramble-bonus-you-win"],
  ["bonusIWin","scramble-bonus-iwin"],
  ["bonusFinal","scramble-bonus-final"]
];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function extract(begin,end) {
  const a=game.indexOf(begin),b=game.indexOf(end,a+begin.length);
  assert.ok(a>0 && b>a,"real game segment "+begin);
  return game.slice(a,b);
}
function fixture(){
  const calls=[],listeners={};
  let activation={ready:true,reason:"os-accepted"};
  let playback={accepted:true};
  const bridge={
    activateFromGesture({purpose}){calls.push(["activate",purpose]);return Promise.resolve(activation);},
    preload({soundId}){calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:210});},
    play({soundId,volume,eventId}){calls.push(["play",soundId,volume,eventId]);return Promise.resolve(playback);},
    stop({soundId}){calls.push(["stop",soundId]);return Promise.resolve({stopped:true});},
    addListener(name,fn){listeners[name]=fn;return Promise.resolve({remove(){}});}
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:bridge}},
    document:{hidden:false,addEventListener:(n,fn)=>{listeners[n]=fn;}},
    addEventListener:(n,fn)=>{listeners[n]=fn;},
    setTimeout,clearTimeout
  };
  vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,
    Number,Error,setTimeout,clearTimeout});
  return{api:win.BibloZooNativeVerseScrambleAudio,calls,listeners,win,
    activation:v=>{activation=v;},playback:v=>{playback=v;}};
}
async function checkController(){
  assert.match(html,/native-verse-scramble-audio\.js[\s\S]*game\.js/);
  assert.match(workflow,/validate_native_verse_scramble_n6m\.js/);
  assert.match(handoff,/N6m Verse Scramble/);
  assert.match(handoff,/#53[\s\S]*MERGED/);
  assert.match(swift,/private let scramblePitchMIDIs: Set<Int> = \[60, 62, 64, 65, 67, 69, 71, 72\]/);
  assert.match(swift,/private let scrambleToneIDs: Set<String>/);
  assert.match(swift,/prepareScrambleToneOnWorker\(soundId: soundId\)/);
  assert.match(swift,/Double\(midi - 69\) \/ 12\.0/);
  assert.match(swift,/0\.48 \* 0\.85/);
  assert.match(swift,/0\.10 \* 3\.60/);
  assert.match(swift,/0\.07 \* 3\.40/);
  assert.match(swift,/0\.09 \* 2\.40/);
  assert.match(swift,/0\.035 \* 2\.40/);
  assert.match(swift,/650\.0 \/ sampleRate/);
  assert.match(swift,/0\.65/);
  assert.match(swift,/avengine-scramble-tone/);
  assert.ok(!swift.includes("scrambleSoundResources"),
    "no original 5 unused Scramble pop assets added to native PCM");
  const unused=fs.readdirSync(path.join(root,
    "verse_games/verse_scramble_neo/verse_scramble_sounds"));
  assert.equal(unused.length,5,
    "five old Scramble MP3 effects remain untouched/unused by original game");
  for(const id of midi){
    assert.ok(helper.includes('correct'+id+': "scramble-note-'+id+'"'));
    assert.ok(swift.includes('"scramble-note-'+id+'"'));
  }
  for(const [key,id] of fixed){
    assert.ok(helper.includes(key+': "'+id+'"'),"JS "+id);
    assert.ok(swift.includes('"'+id+'"'),"Swift "+id);
  }
  const f=fixture();
  assert.equal(f.api.isAvailable(),true);
  assert.equal(f.api.soundIds.length,18,"8 pitch variants + 8 sounds + 2 UI");
  assert.equal(new Set([...f.api.soundIds]).size,18);
  assert.equal(f.api.tapUiFromGesture("uiTap1",.45),true);
  await flush();await flush();
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,
    "cold Title only prepares two shared pops");
  f.calls.length=0;
  assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.45})).ready,true);
  assert.equal(f.calls[0][0],"activate","real gesture activates native OS priority first");
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,18);
  assert.ok(f.calls.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2") <
    f.calls.findIndex(x=>x[0]==="preload"&&x[1]==="scramble-note-60"),
    "Mode UI pop precedes game tone bank prewarming");
  f.calls.length=0;
  for(const n of midi)assert.equal(f.api.play("correct"+n,1),true);
  for(const [key] of fixed)assert.equal(f.api.play(key,1),true);
  await flush();
  assert.deepEqual(f.calls.filter(x=>x[0]==="play").map(x=>x[1]),
    midi.map(n=>"scramble-note-"+n).concat(fixed.map(x=>x[1])),
    "all eight source-selected notes and eight fixed tunes/noise dispatch");
  const events=[];
  f.api.configure({
    onAppInactive:()=>events.push("pause"),
    onAppActive:()=>events.push("welcome"),
    onPlaybackFailure:()=>events.push("fatal")
  });
  f.playback({accepted:false,reason:"activation-os-rejected"});
  f.api.play("wrongLetter",1);
  await flush();await flush();
  assert.deepEqual(events,["pause","welcome"],
    "PiP genuine OS denial is retriable plain Welcome Back, never fatal");
  assert.equal(f.api.isReady(),false);
  f.activation({ready:false,reason:"other-audio-playing"});
  assert.equal((await f.api.prepareFromGesture()).reason,"other-audio-playing");
  f.activation({ready:true,reason:"os-accepted"});
  f.playback({accepted:true});
  assert.equal((await f.api.prepareFromGesture()).ready,true);
  const attempts=f.calls.filter(x=>x[0]==="activate").length;
  f.listeners.biblozooAppLifecycle?.({active:false});
  assert.equal(f.api.isReady(),false,"held UIKit App Switcher destroys hot voices");
  f.listeners.biblozooAppLifecycle?.({active:true});
  assert.equal(f.calls.filter(x=>x[0]==="activate").length,attempts,
    "passive foreground NEVER reactivates session");
  await f.api.stop();
  assert.equal(f.api.play("correct60",1),false);
}
function originalMelodyRouting(){
  const heard=[];
  const state={screen:"game",currentTarget:{playableText:"ABCDEFGH"},
    letterIndex:0,menuOpen:false,helpOpen:false};
  const scope={
    state,muted:false,returnPaused:false,
    nativeScrambleFrozen:false,nativeScramblePending:false,
    nativeScrambleFailure:false,document:{hidden:false},
    nativeScrambleAudio:{play:(key,volume)=>heard.push([key,volume])},
    NATIVE_SCRAMBLE_NOTES:new Set(midi),currentCorrectMelody:midi.slice(),
    console,Math,Number,Promise
  };
  vm.createContext(scope);
  vm.runInContext(
    extract("  function melodyPoolsForLength(length){",
      "  function soundCorrectLetter(t) {")+
    extract("  function playGameSound(eventId) {",
      "  function initVerseData(){")+
    "\nthis.testPlay=playGameSound;this.selectMelody=chooseCorrectMelodyForLength;",scope);
  for(let i=0;i<midi.length;i++){
    state.letterIndex=i;scope.testPlay("correctLetter");
  }
  for(const [key]of fixed)scope.testPlay(key);
  assert.deepEqual(heard,
    midi.map(n=>["correct"+n,1]).concat(fixed.map(x=>[x[0],1])),
    "real game picks original letter melody MIDI by pre-increment index; original gains baked");
  for(let length=1;length<=10;length++){
    const selected=scope.selectMelody(length);
    assert.equal(selected.length,length,"every 1..10-letter source melody preserved");
    assert.ok(selected.every(n=>midi.includes(n)),"all original pitches prewarmed");
  }
  let count=heard.length;
  scope.returnPaused=true;scope.testPlay("correctLetter");
  scope.returnPaused=false;scope.nativeScrambleFrozen=true;scope.testPlay("wrongLetter");
  scope.nativeScrambleFrozen=false;state.menuOpen=true;scope.testPlay("bonusYouWin");
  state.menuOpen=false;scope.muted=true;scope.testPlay("lettersFall");
  assert.equal(heard.length,count,"no queued native sounds while paused/menu/PiP/muted");
}
function realModesAndMenu(){
  let title,mode,menu;
  const events=[];
  const shell={
    renderTitleScreen:o=>{title=o;},
    renderModeSelect:o=>{mode=o;},
    wireGameMenu:o=>{menu=o;}
  };
  const state={
    screen:"intro",busy:false,menuOpen:false,helpOpen:false,
    helpBackMode:false,bonusActive:false,completed:false
  };
  const scope={
    state,
    window:{VerseGameShell:shell,VerseGameBridge:{exitGame:()=>events.push("exit"),
      returnToVersePicker:()=>{}}},
    document:{hidden:false,getElementById:()=>null,
      querySelectorAll:()=>[]},
    app:{},GAME_TITLE:"Verse Scramble",GAME_ICON:"🔄",GAME_ICON_HTML:"icon",
    GAME_THEME:{},HELP_OVERLAY_ID:"vsnHelpOverlay",
    helpHtml:()=>"",playUiTapSound:()=>events.push("pop"),
    nextNativeScrambleUiKey:()=>"uiTap2",
    nativeScrambleAudio:{stop:()=>{events.push("stop");return Promise.resolve();},
      isReady:()=>true},
    nativeScramblePending:false,nativeScrambleFailure:false,
    muted:false,returnPaused:false,
    beginNativeScrambleFreeze:()=>events.push("freeze"),
    finishNativeScrambleFreeze:()=>events.push("unfreeze"),
    stopNativeScrambleRound:()=>events.push("stopRound"),
    primeNativeScrambleFromGesture:(...args)=>events.push(["prepare",...args]),
    clearNativeScrambleFailure:()=>{},
    setScreen:screen=>{
      state.screen=screen;
      events.push("screen:"+screen);
      if(screen==="mode")scope.ui.renderMode();
    },
    unlockAudio:()=>{throw Error("native must never unlock browser")},
    waitForMagnetFont:()=>Promise.resolve(),
    preloadNextProfileReward:()=>Promise.resolve(),
    console,Promise
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function renderIntro(){",
    "  function introLetterHtml(")+
    extract("  function wireGameScreen(){","  function tileObjectForButton(")+
    "\nthis.ui={renderIntro,renderMode,wireGameScreen};",scope);
  scope.ui.renderIntro();
  title.onStart();assert.ok(mode,"title routes to real difficulty screen");
  mode.onSelect("hard");
  assert.deepEqual(events.find(x=>Array.isArray(x)&&x[0]==="prepare"),
    ["prepare","round","hard","uiTap2"],
    "real mode gesture must request entire 18-ID bank before game");
  assert.equal(state.screen,"mode","no premature game navigation before preflight");
  scope.ui.wireGameScreen();
  assert.ok(menu,"actual wireGameMenu callback registered");
  assert.equal(menu.onOpen(),true);
  assert.equal(state.menuOpen,true);
  assert.equal(menu.onOpen(),false,"duplicate native menu open guarded");
  const openAt=events.length;
  menu.onClose();
  assert.equal(state.menuOpen,false);
  assert.deepEqual(events.find(x=>Array.isArray(x)&&x[1]==="resume"),
    ["prepare","resume",null,"uiTap2"],"Close prewarms before unpausing");
  assert.equal(events.slice(openAt).includes("unfreeze"),false,
    "must stay frozen until ready callback");
  const before=events.length;
  menu.onOpen();
  menu.onModeSelect();
  assert.ok(events.slice(before).includes("screen:mode"),
    "Mode returns without resetting game reward in hidden callback");
}
function virtualClock(){
  let clock=1000;
  const scope={
    performance:{now:()=>clock},returnPaused:false,
    totalReturnPauseMs:0,returnPausedAt:0,
    nativeScramblePausedMs:0,nativeScramblePausedAt:1000,
    nativeScrambleFrozen:true,console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function gameNow() {",
    "  async function sleep(ms) {")+
    "\nthis.now=gameNow;",scope);
  assert.equal(scope.now(),1000);
  clock=45000;
  assert.equal(scope.now(),1000,
    "magnet/bonus virtual timer FROZEN throughout long PCM preflight");
  scope.nativeScramblePausedMs=44000;
  scope.nativeScrambleFrozen=false;
  assert.equal(scope.now(),1000,"no catchup when menu closes");
  scope.returnPaused=true;scope.returnPausedAt=45000;
  clock=65000;
  assert.equal(scope.now(),1000,"held App Switcher stays frozen");
  scope.returnPaused=false;scope.totalReturnPauseMs=20000;
  assert.equal(scope.now(),1000,"unpause does not fast-forward AI opponent");
}
async function welcome(){
  assert.match(game,/useZooEscape: !nativeScrambleAudio/);
  assert.match(game,/suppressUiSound: !!nativeScrambleAudio/);
  assert.match(game,/welcomeBackController\?\.pauseFromNativeInactive\?\.\(\)/);
  assert.match(game,/welcomeBackController\?\.showAfterNativeActive\?\.\(\)/);
  assert.match(game,/nativeScrambleAudio\.prepareFromGesture\(\)/);
  assert.match(game,/if \(nativeScrambleAudio\) return null;/);
  assert.match(game,/if \(nativeScrambleAudio\) return nativeScrambleAudio\.isReady\(\)/);
  let outcome={ready:false,reason:"activation-os-rejected"};
  const events=[];
  const scope={
    nativeScrambleAudio:{prepareFromGesture:()=>{
      events.push("real-gesture");return Promise.resolve(outcome);}},
    window:{BibloZooWelcomeBackReturn:{nativeAudioResumeResult:r=>
      r.ready?true:{deferred:true,reason:r.reason}}},
    document:{hidden:false},
    returnPaused:true,returnSession:9,returnRecoveryFailures:0,
    returnPausedAt:1000,totalReturnPauseMs:0,
    muted:false,performance:{now:()=>2500},
    state:{screen:"game",menuOpen:false,helpOpen:false,bonusActive:false,
      startTime:500},
    app:{classList:{remove:()=>{}}},
    scheduleEasyHint:()=>events.push("hint"),
    beginNativeScrambleFreeze:()=>events.push("menu-frozen"),
    Promise,console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function continueFromWelcomeBack() {",
    "  function render(){")+
    "\nthis.testContinue=continueFromWelcomeBack;",scope);
  let deferred=await scope.testContinue();
  assert.equal(deferred.deferred,true,"true OS PiP takeover denial stays retriable");
  assert.equal(scope.returnPaused,true);
  assert.equal(scope.totalReturnPauseMs,0);
  outcome={ready:true,reason:"prepared"};
  assert.equal(await scope.testContinue(),true);
  assert.equal(scope.returnPaused,false);
  assert.equal(scope.totalReturnPauseMs,1500);
  assert.equal(scope.state.startTime,2000);
  assert.ok(events.includes("hint"),"same game resumes only after full PCM bank");
}
(async()=>{
  await checkController();
  originalMelodyRouting();
  realModesAndMenu();
  virtualClock();
  await welcome();
  console.log("N6m final Verse Scramble native 18-ID PCM, all 8 real melody notes, falling-noise/bonus, clock, PiP PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});