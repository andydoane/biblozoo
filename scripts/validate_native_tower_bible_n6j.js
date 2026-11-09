"use strict";
// N6j: test the real Tower audio controller, callback wiring and fixed Swift IDs.
// Linux Node tests never establish audible iPhone output or Swift compilation.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper=read("verse_games/shared/native-tower-bible-audio.js");
const game=read("verse_games/tower_bible/game.js");
const html=read("verse_games/tower_bible/index.html");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const handoff=read("docs/PROJECT-HANDOFF.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const sounds=[
  ["brickLand","tower-brick-land","tower_bible_land"],
  ["warning","tower-warning","tower_bible_warning_1"],
  ["dangerWarning","tower-danger-warning","tower_bible_warning_2"],
  ["collapse","tower-collapse","tower_bible_collapse"],
  ["brickBreak","tower-brick-break","tower_bible_break"],
  ["streak","tower-streak","tower_bible_success"]
];
const tones=[["correctWord","tower-correct-word"],["wrongWord","tower-wrong-word"]];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function extract(from,to){
  const a=game.indexOf(from),b=game.indexOf(to,a);
  assert.ok(a>0 && b>a,"real game boundaries: "+from);
  return game.slice(a,b);
}
function fixture(){
  let activation={ready:true,reason:"os-accepted"};
  let effect={accepted:true};
  const calls=[],listeners={};
  const bridge={
    activateFromGesture({purpose}){calls.push(["activate",purpose]);return Promise.resolve(activation);},
    preload({soundId}){calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:220});},
    play({soundId,volume,eventId}){calls.push(["play",soundId,volume,eventId]);return Promise.resolve(effect);},
    stop({soundId}){calls.push(["stop",soundId]);return Promise.resolve({stopped:true});},
    addListener(name,handler){listeners[name]=handler;return Promise.resolve({remove(){}});}
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:bridge}},
    document:{hidden:false,addEventListener:(n,fn)=>{listeners[n]=fn;}},
    addEventListener:(n,fn)=>{listeners[n]=fn;},setTimeout,clearTimeout
  };
  vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,Error,
    Number,setTimeout,clearTimeout});
  return{audio:win.BibloZooNativeTowerBibleAudio,calls,listeners,
    activation:v=>{activation=v;},effect:v=>{effect=v;}};
}
async function checkController(){
  assert.match(html,/native-tower-bible-audio\.js[\s\S]*game\.js/);
  assert.match(workflow,/validate_native_tower_bible_n6j\.js/);
  assert.match(handoff,/N6j Tower of Bible/);
  assert.match(handoff,/#50[\s\S]*MERGED/);
  const names=fs.readdirSync(path.join(root,"verse_games/tower_bible/tower_bible_sounds"));
  assert.equal(names.length,7,"six authored MP3 effects plus unused place sample");
  assert.ok(names.includes("tower_bible_place.mp3"),"legacy place MP3 remains untouched");
  assert.match(swift,/subdirectory: "public\/verse_games\/tower_bible\/tower_bible_sounds"/);
  for(const [key,id,basename] of sounds){
    assert.ok(helper.includes(key+': "'+id+'"'),"key "+key);
    assert.ok(swift.includes('"'+id+'": "'+basename+'"'),"fixed Swift mapping "+id);
    assert.ok(names.includes(basename+".mp3"),"asset missing "+basename);
  }
  for(const [key,id] of tones)assert.ok(helper.includes(key+': "'+id+'"'));
  assert.match(swift,/private let towerWordToneIDs: Set<String>/);
  assert.match(swift,/private func prepareTowerWordToneOnWorker\(soundId: String\)/);
  assert.match(swift,/let correct = soundId == "tower-correct-word"/);
  assert.match(swift,/let volumeMultiplier = correct \? 3\.40 : 3\.60/);
  assert.match(swift,/\(0\.00, 0\.08, 523, 523, 0\.07, false\)/);
  assert.match(swift,/\(0\.20, 0\.16, 1046, 1046, 0\.06, false\)/);
  assert.match(swift,/\(0\.00, 0\.08, 220, 170, 0\.10, true\)/);
  assert.match(swift,/self\.prepareTowerWordToneOnWorker\(soundId: soundId\)/);
  assert.match(swift,/self\.pcmEffectIDs\.contains\(soundId\)/);
  for(const [,id] of tones)assert.ok(swift.includes('"'+id+'"'));
  const f=fixture();
  assert.equal(f.audio.isAvailable(),true);
  assert.equal(f.audio.soundIds.length,10,"6 original MP3 + 2 synthesized + 2 UI");
  assert.equal(f.audio.tapUiFromGesture("uiTap1",.45),true);
  await flush();await flush();
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,
    "title/help only prepare two UI pops");
  f.calls.length=0;
  assert.equal((await f.audio.prepareFromGesture({key:"uiTap2",volume:.45})).ready,true);
  assert.equal(f.calls[0][0],"activate","real child gesture activates first");
  assert.equal(f.calls.filter(x=>x[0]==="preload").length,10);
  assert.ok(f.calls.findIndex(x=>x[0]==="play" && x[1]==="ui-pop-2") <
    f.calls.findIndex(x=>x[0]==="preload" && x[1]==="tower-brick-land"),
    "UI pop comes before full game PCM decode");
  f.calls.length=0;
  for(const [key] of [...sounds,...tones])assert.equal(f.audio.play(key,key.endsWith("Word")?1:.55),true);
  await flush();
  assert.deepEqual(f.calls.filter(x=>x[0]==="play").map(x=>x[1]),
    [...sounds,...tones].map(x=>x[1]),"all 8 original gameplay cues routable");
  const events=[];
  f.audio.configure({
    onAppInactive:()=>events.push("paused"),
    onAppActive:()=>events.push("welcome"),
    onPlaybackFailure:()=>events.push("fatal")
  });
  f.effect({accepted:false,reason:"activation-os-rejected"});
  f.audio.play("brickLand",.55);
  await flush();await flush();
  assert.deepEqual(events,["paused","welcome"],"true OS refusal is not corrupt PCM");
  assert.equal(f.audio.isReady(),false);
  f.activation({ready:false,reason:"other-audio-playing"});
  assert.equal((await f.audio.prepareFromGesture()).reason,"other-audio-playing");
  assert.ok(events.filter(x=>x==="paused").length>=2,"PiP denial is retryable");
  f.activation({ready:true,reason:"os-accepted"});
  f.effect({accepted:true});
  assert.equal((await f.audio.prepareFromGesture()).ready,true);
  const pre=f.calls.filter(x=>x[0]==="activate").length;
  f.listeners.biblozooAppLifecycle?.({active:false});
  assert.equal(f.audio.isReady(),false,"held App Switcher tears down PCM");
  f.listeners.biblozooAppLifecycle?.({active:true});
  assert.equal(f.calls.filter(x=>x[0]==="activate").length,pre,
    "lifecycle does not reactivate");
  await f.audio.stop();
  assert.equal(f.audio.play("streak",.5),false,"stop inhibits hot dispatch");
}
// Run the actual game's hot sound callback, not only the controller mock.
function testHotGameSounds(){
  const heard=[];
  const scope={
    nativeTowerAudio:{play:(key,volume)=>heard.push([key,volume])},
    document:{hidden:false},muted:false,returnPaused:false,
    state:{running:true,paused:false},
    getSoundVolume:key=>({brickLand:.55,warning:.78,dangerWarning:.88,
      collapse:.90,brickBreak:.82,streak:.90})[key] ?? 1,
    console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function playGameSound(eventId) {",
    "  window.tbTestSound = function tbTestSound")+
    "\nthis.testPlay=playGameSound;",scope);
  for(const key of ["correctWord","wrongWord","brickLand","warning",
    "dangerWarning","collapse","brickBreak","streak"]) scope.testPlay(key);
  assert.deepEqual(heard,[["correctWord",1],["wrongWord",1],["brickLand",.55],
    ["warning",.78],["dangerWarning",.88],["collapse",.90],
    ["brickBreak",.82],["streak",.90]],
    "both baked synthesizers at 1.0; six recorded files keep authored volumes");
  const count=heard.length;
  scope.state.paused=true;scope.testPlay("streak");
  scope.state.paused=false;scope.muted=true;scope.testPlay("warning");
  scope.muted=false;scope.returnPaused=true;scope.testPlay("collapse");
  assert.equal(heard.length,count,"no queued PCM from mute, pause or Welcome Back");
}
function realMenus(native=true){
  let title,mode,menu,speed;
  const events=[],prepares=[];
  const shell={
    renderTitleScreen:o=>{title=o;},
    renderModeSelect:o=>{mode=o;},
    wireGameMenu:o=>{menu=o;},
    wireSpeedMenu:o=>{speed=o;}
  };
  const scope={
    window:{VerseGameShell:shell,VerseGameBridge:{exitGame:()=>events.push("exit")}},
    document:{hidden:false},app:{setAttribute(){},removeAttribute(){}},
    nativeTowerAudio:native?{isReady:()=>true,stop:()=>{events.push("stop");}}:null,
    nativeTowerPending:false,nativeTowerMenuOpen:false,
    nativeTowerSpeedMenuOpen:false,returnPaused:false,muted:false,
    state:{running:true,paused:false,pauseReason:"",introActive:false,collapseTriggered:false,
      frenzyActive:false,done:false},
    GAME_TITLE:"Tower of Bible",GAME_ICON:"tower",GAME_ICON_HTML:"tower",GAME_THEME:{},
    HELP_OVERLAY_ID:"tbHelpOverlay",stopLoop:()=>{},clearNativeTowerFailure:()=>{},
    helpHtml:()=>"",wireNativeTowerTitleHelpPops:()=>{},
    renderIntro:()=>{},renderModeSelect:()=>{},startGame:()=>events.push("started"),
    playUiTapSound:()=>events.push("pop"),nextNativeTowerUiKey:()=>"uiTap2",
    unlockAudio:()=>true,
    stopNativeTowerRound:()=>events.push("stop-round"),
    primeNativeTowerFromGesture:(...args)=>prepares.push(args),
    updateBeltSpeedFromSettings:()=>events.push("speed"),
    openHelpFromMenu:()=>events.push("help"),
    setPaused:(value,reason="")=>{scope.state.paused=value;scope.state.pauseReason=value?reason:"";},
    console,Promise
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function renderIntro() {","  function startGame(mode) {")+
    extract("  function wireCommonNav() {","  function wireGameInput() {")+
    "\nthis.t={renderIntro,renderModeSelect,wireCommonNav};",scope);
  scope.t.renderIntro();
  title.onStart();assert.ok(mode,"Start reaches difficulty");
  mode.onSelect("hard");
  if(native){
    assert.equal(prepares.length,1,"mode needs full PCM prewarm");
    assert.deepEqual([...prepares[0]],["round","hard","uiTap2"]);
    assert.ok(!events.includes("started"),"no unprepared round");
  }else{
    assert.equal(prepares.length,0);
    assert.ok(events.includes("started"),"browser still starts normally");
  }
  scope.t.wireCommonNav();
  assert.equal(menu.onOpen(),true);
  assert.equal(scope.state.paused,true);
  if(native) assert.equal(menu.onOpen(),false,
    "native duplicate physical menu open ignored; web behavior unchanged");
  const n=prepares.length;
  menu.onClose();
  if(native) {
    assert.equal(prepares.length,n+1,"Close preflights after stop");
    assert.equal(scope.state.paused,true,"Close does not early unpause");
  }else assert.equal(scope.state.paused,false);
  speed.onOpen();speed.onChange();speed.onClose();
  if(native)assert.equal(prepares.length,n+2,"Speed Close prewarms");
  else assert.equal(prepares.length,0);
  return{events,prepares};
}
async function testWelcome(){
  assert.match(game,/if \(nativeTowerAudio\) stopNativeTowerRound\(\);/);
  assert.match(game,/towerWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
  assert.match(game,/towerWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
  assert.match(game,/nativeTowerAudio\.prepareFromGesture\(\)\.then\(result/);
  assert.match(game,/nativeAudioResumeResult/);
  assert.match(game,/useZooEscape: !nativeTowerAudio/);
  assert.match(game,/suppressUiSound: !!nativeTowerAudio/);
  assert.match(game,/if \(nativeTowerAudio\) return null;[\s\S]*function primeHtmlAudio/);
  assert.match(game,/if \(nativeTowerAudio\) return; \/\/ No iOS Web decoder/);
  let accepted={ready:false,reason:"activation-os-rejected"};
  const calls=[],scope={
    nativeTowerAudio:{prepareFromGesture:()=>{calls.push("gesture");return Promise.resolve(accepted);}},
    window:{BibloZooWelcomeBackReturn:{nativeAudioResumeResult:r=>
      r.ready===true?true:{deferred:true,reason:r.reason}}},
    document:{hidden:false,body:{classList:{remove:()=>{}}}},
    returnPaused:true,returnSession:5,muted:false,returnRecoveryFailures:0,
    returnContextReplacements:0,returnPriorPauseReason:null,returnWasLooping:true,
    returnAnimating:[],audioCtx:null,masterGain:null,audioUnlocked:false,
    audioBuffers:new Map(),audioBufferPromises:new Map(),
    state:{running:true,lastTs:5},
    welcomeClock:{resume:()=>calls.push("clock-resume")},
    setPaused:()=>{},startLoop:()=>calls.push("start-loop"),
    restoreWelcomeAnimations:()=>{},unlockAudio:()=>true,
    Promise,console
  };
  vm.createContext(scope);
  vm.runInContext(extract("  function continueFromWelcomeBack() {",
    "  towerWelcomeBack = window.BibloZooWelcomeBackReturn"),scope);
  const deferred=await scope.continueFromWelcomeBack();
  assert.equal(deferred.deferred,true,"OS busy keeps plain Welcome Back");
  assert.equal(scope.returnPaused,true);
  assert.ok(!calls.includes("clock-resume"),"no game timer advance on denial");
  accepted={ready:true,reason:"prepared"};
  assert.equal(await scope.continueFromWelcomeBack(),true);
  assert.equal(scope.returnPaused,false);
  assert.ok(calls.includes("clock-resume")&&calls.includes("start-loop"));
}
(async()=>{
  await checkController();
  testHotGameSounds();
  realMenus(true);realMenus(false);
  await testWelcome();
  console.log("N6j Tower 6 MP3 + 2 native synthesized PCM + 2 UI, actual Mode/Menu/Speed and PiP deferral PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});
