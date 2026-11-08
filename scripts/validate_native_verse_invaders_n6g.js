"use strict";
/* N6g: verify real Verse Invaders files, fixed PCM contract and actual
 * title/mode/menu/bonus/Welcome Back callbacks. CI cannot prove iPhone audio.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_games/verse_invaders/game.js");
const audio=read("verse_games/shared/native-verse-invaders-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/verse_invaders/index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const css=read("verse_games/verse_invaders/game.css");
new Function(game);new Function(audio);
assert.match(handoff,/Dino Dash #45[\s\S]{0,800}OWNER-TESTED/);
assert.match(handoff,/N6g Verse Invaders PR #46/);
assert.match(workflow,/validate_native_verse_invaders_n6g\.js/);
assert.ok(html.includes("native-verse-invaders-audio.js") &&
 html.indexOf("native-verse-invaders-audio.js")<html.indexOf('src="./game.js"'));
assert.match(css,/vinv-native-audio-failure/);
assert.match(game,/useZooEscape: !nativeInvadersAudio/);
assert.match(game,/suppressUiSound: !!nativeInvadersAudio/);
assert.match(game,/invadersWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/invadersWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game,/if \(nativeInvadersAudio\) return null; \/\/ native iOS/);
assert.match(game,/if \(nativeInvadersAudio\) return null; \/\/ native iOS: no HTML silence/);
assert.match(game,/if \(nativeInvadersAudio\) return Promise\.resolve\(nativeInvadersAudio\.isReady\(\)\)/);
assert.match(game,/if \(nativeInvadersAudio\) return; \/\/ Swift owns/);
assert.match(audio,/new Set\(Object\.values\(KEYS\)\)/);
assert.doesNotMatch(audio,/new Audio\(|AudioContext|createBufferSource\(|createOscillator\(/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
const entries=[
["rocketLaunch","inv-launch","verse_invaders_launch"],
["correctHit","inv-correct","verse_invaders_correct"],
["wrongHit","inv-wrong","verse_invaders_wrong"],
["abduction","inv-abduction","verse_invaders_abduction"],
["streak4","inv-streak","verse_invaders_streak"],
["bonusStart","inv-bonus-start","verse_invaders_bonus_start"],
...Array.from({length:5},(_,i)=>["bonusPop"+(i+1),"inv-pop-"+(i+1),"verse_invaders_pop_"+(i+1)]),
["bonusPenalty","inv-bonus-penalty","verse_invaders_wrong_2"],
["bonusReveal","inv-bonus-reveal","verse_invaders_bonus_result"]
];
assert.equal(entries.length,13);
for(const [key,id,file] of entries){
 assert.ok(fs.statSync(path.join(root,"verse_games/verse_invaders/verse_invaders_sounds",file+".mp3")).size>0);
 assert.ok(swift.includes('"'+id+'": "'+file+'"'),"fixed Swift asset "+id);
 assert.ok(swift.includes('"'+id+'"'),"Swift PCM allowed "+id);
 assert.ok(audio.includes(key+': "'+id+'"'),"JS native mapping "+key);
 assert.ok(game.includes(file+".mp3"),"original Web sound untouched "+file);
}
for(const alias of ["streak8","streak12","streak16","bonusMultiplierUp"])
 assert.ok(audio.includes(alias+': "inv-streak"'),"reuse one streak PCM "+alias);
assert.match(swift,/verseInvadersSoundResources\[soundId\] != nil/);
assert.match(swift,/self\.verseInvadersSoundResources\[soundId\]/);
assert.match(swift,/subdirectory: "public\/verse_games\/verse_invaders\/verse_invaders_sounds"/);
const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
function bridgeFixture({ios=true,missing="",reject="",holdUi=false}={}){
 let hold=holdUi;const calls=[],handlers={},queued=[],warm=new Set();
 const doc={hidden:false,addEventListener(k,fn){handlers["doc:"+k]=fn;}};
 const bridge={
  activateFromGesture(arg){calls.push(["activate",arg.purpose]);return Promise.resolve({ready:true});},
  preload(arg){
   calls.push(["preload",arg.soundId]);
   const r={prepared:arg.soundId!==missing,durationMs:60,reason:arg.soundId===missing?"bundled-asset-missing":"prepared"};
   if(hold&&arg.soundId.startsWith("ui-pop-"))
    return new Promise(resolve=>queued.push(()=>{if(r.prepared)warm.add(arg.soundId);resolve(r);}));
   if(r.prepared)warm.add(arg.soundId);
   return Promise.resolve(r);
  },
  play(arg){calls.push(["play",arg.soundId,arg.volume]);return Promise.resolve({accepted:warm.has(arg.soundId)&&arg.soundId!==reject,
   reason:arg.soundId===reject?"pcm-not-preloaded":"scheduled"});},
  stop(arg){calls.push(["stop",arg.soundId]);warm.clear();return Promise.resolve({stopped:true});},
  addListener(n,fn){handlers[n]=fn;return Promise.resolve({remove(){}});}
 };
 const win={document:doc,Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
  Plugins:{BibloZooNativeSound:bridge}},BibloZooNativeOnlyOutput:{enabled:true},
  setTimeout,clearTimeout,addEventListener(n,fn){handlers["win:"+n]=fn;}};
 vm.runInNewContext(audio,{window:win,Date,Promise,Error,console});
 return{api:win.BibloZooNativeVerseInvadersAudio,calls,handlers,doc,release(){hold=false;queued.splice(0).forEach(f=>f());}};
}
async function bridgeChecks(){
 const f=bridgeFixture();
 assert.equal(f.api.play("rocketLaunch",.5),false,"hot event requires preloaded game bank");
 assert.equal(f.api.tapUiFromGesture("uiTap1",.333),true);
 assert.deepEqual(f.calls[0],["activate","ui"]);await flush();
 assert.deepEqual(f.calls.filter(x=>x[0]==="preload").map(x=>x[1]),["ui-pop-1","ui-pop-2"]);
 assert.equal(f.api.isReady(),false,"two UI clips not full game bank");
 const begin=f.calls.length;
 assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.333})).ready,true);
 const tail=f.calls.slice(begin);
 assert.deepEqual(tail[0],["activate","game"]);
 const firstPop=tail.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2");
 const firstGame=tail.findIndex(x=>x[0]==="preload"&&x[1]==="inv-launch");
 assert.ok(firstPop>=0&&firstPop<firstGame,"mode pop scheduled before decode of game effects");
 const preloadIds=tail.filter(x=>x[0]==="preload").map(x=>x[1]);
 assert.equal(preloadIds.length,15,"13 unique game + 2 UI PCM, not 19 aliased key preloads");
 assert.equal(new Set(preloadIds).size,15,"streak aliases never duplicate preload");
 assert.equal(preloadIds.filter(x=>x==="inv-streak").length,1);
 assert.equal(f.api.isReady(),true);
 for(const [key] of entries)assert.equal(f.api.play(key,.5),true);
 for(const alias of ["streak8","streak12","streak16","bonusMultiplierUp"])
  assert.equal(f.api.play(alias,.6),true);
 await flush();
 const streaks=f.calls.filter(x=>x[0]==="play"&&x[1]==="inv-streak");
 assert.equal(streaks.length,5);
 await f.api.stop();assert.equal(f.api.isReady(),false);
 assert.equal(f.api.play("rocketLaunch",.5),false);
 const missing=bridgeFixture({missing:"inv-pop-3"});
 assert.equal((await missing.api.prepareFromGesture()).ready,false);
 assert.equal(missing.api.isReady(),false);
 assert.ok(missing.calls.some(x=>x[0]==="stop"));
 const bad=bridgeFixture({reject:"inv-wrong"});
 const failures=[];bad.api.configure({onPlaybackFailure:x=>failures.push(x)});
 assert.equal((await bad.api.prepareFromGesture()).ready,true);
 assert.equal(bad.api.play("wrongHit",.2),true);await flush();
 assert.deepEqual(failures,["pcm-not-preloaded"]);
 assert.equal(bad.api.isReady(),false);
 const raced=bridgeFixture({holdUi:true});
 raced.api.tapUiFromGesture("uiTap1",.2);await flush();
 const next=raced.api.prepareFromGesture({key:"uiTap2",volume:.25});
 raced.release();assert.equal((await next).ready,true);await flush();
 assert.deepEqual(raced.calls.filter(x=>x[0]==="play").map(x=>x[1]),["ui-pop-2"]);
 const inactive=bridgeFixture({holdUi:true});
 inactive.api.tapUiFromGesture("uiTap1",.25);await flush();
 inactive.handlers.biblozooAppLifecycle({active:false});
 inactive.release();await flush();
 assert.equal(inactive.calls.filter(x=>x[0]==="play").length,0);
 inactive.handlers.biblozooAppLifecycle({active:true});
 assert.equal(inactive.calls.filter(x=>x[0]==="activate").length,1,
  "foreground never automatically activates Swift");
 const web=bridgeFixture({ios:false});
 assert.equal(web.api.tapUiFromGesture("uiTap1",.25),false);
 assert.equal((await web.api.prepareFromGesture()).ready,false);
 assert.equal(web.calls.length,0);
}
function part(start,end){const i=game.indexOf(start),j=game.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,"missing real Invaders source section "+start);return game.slice(i,j);}
const startGuard=part("  function startGame(mode) {","    selectedMode = mode;")+
  "    window.__startRound(mode);\n  }\n";
const actual=[
 part("  const nativeInvadersAudio =","  const soundBuffers = new Map();"),
 part("  function soundVolume(key) {","  async function loadSoundBuffer(key) {"),
 part("  async function playGameSound(key, volumeKey = key) {","  function playRandomBonusPopSound() {"),
 part("  function renderIntro() {","  function startGame(mode) {"),
 startGuard,
 part("  function wireCommonNav() {","  function openGameMenu() {"),
 part("  function pauseForTaskSwitch() {","  invadersWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({"),
 part("  if (nativeInvadersAudio) {\n    nativeInvadersAudio.configure","  await preloadAlienSvg();"),
 part("  invadersWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({","  const clamp =")
].join("\n")+"\nthis.test={renderIntro,renderModeSelect,wireCommonNav,playUiTapSound,playGameSound,primeNativeInvadersFromGesture,pauseForTaskSwitch,continueFromWelcomeBack,startGame,read:()=>({returnPaused,nativeInvadersPending})};";
assert.doesNotMatch(actual,/\bvolumeScale\b/,"catch Snake #41-style out-of-scope variable");
function uiFixture({native=true,initialMuted=false}={}){
 const actions=[],plays=[],uiTaps=[],prepares=[],buttons={};let menu=null,config=null,gate=null,ready=false;
 for(const id of ["helpBtn","vinvHelpOverlayCloseBtn"])
  buttons[id]={events:{},addEventListener(n,fn){this.events[n]=fn;},click(){this.events.click?.();}};
 const doc={hidden:false,
  body:{classList:{add(x){actions.push("class-add:"+x);},remove(x){actions.push("class-remove:"+x);}},appendChild(x){gate=x;}},
  getElementById(id){return id==="vinvNativeAudioFailure"?gate:buttons[id]||null;},
  createElement(){return{innerHTML:"",className:"",querySelector(){return{onclick:null,textContent:""};},remove(){gate=null;}};},
  addEventListener(){},getAnimations(){return[];}};
 const app={setAttribute(k,v){actions.push("attr:"+k+"="+v);},removeAttribute(k){actions.push("remove:"+k);}};
 const shell={renderTitleScreen(cfg){this.title=cfg;actions.push("title");},
  renderModeSelect(cfg){this.mode=cfg;actions.push("mode");},
  wireGameMenu(cfg){menu=cfg;actions.push("menu-wire");}};
 const audioStub={isAvailable:()=>native,
  tapUiFromGesture(...x){uiTaps.push(x);return true;},
  configure(c){config=c;},
  prepareFromGesture(...x){const d=deferred();prepares.push({args:x,resolve(result){ready=result?.ready===true;d.resolve(result);}});return d.promise;},
  stop(){ready=false;actions.push("native-stop");return Promise.resolve();},
  play(...x){plays.push(x);return true;},
  isReady:()=>ready};
 const state={running:false,paused:false,pauseReason:"",rafId:1,lastTs:0,uiSoundFlip:false,bonusMode:false};
 const welcomeClock={pause(){actions.push("clock-pause");},resume(){actions.push("clock-resume");}};
 const welcome={pauseFromNativeInactive(){actions.push("inactive-welcome");ctx.test.pauseForTaskSwitch();return true;},
  showAfterNativeActive(){actions.push("active-welcome");return true;}};
 const win={BibloZooNativeVerseInvadersAudio:audioStub,
  __startRound(mode){actions.push("start:"+mode);state.running=true;state.paused=false;state.pauseReason="";},
  VerseGameShell:shell,VerseGameBridge:{exitGame(){actions.push("exit");},returnToVersePicker(){actions.push("picker");},
   getLaunchParams(){return{profileId:"tester"};}},
  BibloZooWelcomeBackReturn:{attach(o){actions.push("welcome-attached");return welcome;},
   resumeAudioOnGesture(){actions.push("web-resume");return Promise.resolve(true);}}};
 const ctx={window:win,document:doc,app,state,Promise,Math,Date,console,
  muted:initialMuted,returnPaused:false,returnSession:0,returnContextReplacements:0,
  returnPriorPauseReason:null,returnWasLooping:false,returnAnimating:[],
  completionMarked:false,selectedMode:null,uiSoundFlip:false,audioCtx:null,
  GAME_TITLE:"Verse Invaders",GAME_ICON:"👾",GAME_ICON_HTML:"👾",
  GAME_THEME:{},HELP_OVERLAY_ID:"vinvHelpOverlay",buildData:{segments:[]},
  SOUND_TUNING:{masterVolume:.74,volumes:{uiTap:.45,rocketLaunch:.43,correctHit:.70,
   wrongHit:.30,abduction:.47,streak4:.41,streak8:.41,streak12:.41,streak16:.74,
   bonusStart:.57,bonusHit:.62,bonusPenalty:.58,bonusMultiplierUp:.44,bonusReveal:.51}},
  welcomeClock,gameNow:()=>1234,helpHtml:()=>"<p>Help</p>",
  stopLoop:()=>{actions.push("stop-loop");state.running=false;},
  startLoop:()=>{actions.push("start-loop");state.rafId=1;},
  getAudioContext(){if(native)throw Error("Native accessed Web Audio");return null;},
  unlockAudio(){if(native)throw Error("Native accessed Web audio unlock");actions.push("web-unlock");return Promise.resolve(true);},
  Audio:function(){throw Error("Native HTML Audio fallback");},
  cancelAnimationFrame:()=>actions.push("cancel-raf")
 };
 vm.createContext(ctx);
 vm.runInContext(actual,ctx,{filename:"real-verse-invaders-callbacks.js"});
 return{test:ctx.test,state,actions,plays,uiTaps,prepares,buttons,shell,ctx,audio:audioStub,
  get menu(){return menu;},get config(){return config;},get dialog(){return gate;}};
}
async function buttonChecks(){
 const f=uiFixture();
 f.test.renderIntro();assert.ok(f.actions.includes("title"));
 f.buttons.helpBtn.click();f.buttons.vinvHelpOverlayCloseBtn.click();
 assert.equal(f.uiTaps.length,2);
 assert.equal(f.uiTaps[0][1],.333);
 f.shell.title.onStart();
 assert.ok(f.actions.includes("mode"),"Start navigates even before bank ready");
 f.shell.mode.onBack();
 assert.equal(f.actions.filter(x=>x==="title").length,2,"Back stays responsive");
 f.shell.title.onBack();
 assert.ok(f.actions.includes("exit"),"Title Back exits");
 f.test.renderModeSelect();f.shell.mode.onSelect("easy");
 assert.equal(f.prepares.length,1);
 assert.equal(f.prepares[0].args[0].volume,.333);
 f.shell.mode.onSelect("hard");
 assert.equal(f.prepares.length,1,"duplicate mode tap ignored");
 f.prepares[0].resolve({ready:true});await flush();
 assert.deepEqual(f.actions.filter(x=>x.startsWith("start:")),["start:easy"]);
 assert.equal(f.state.running,true);
 f.test.wireCommonNav();
 f.menu.onOpen();
 assert.equal(f.state.paused,true);
 const stops=f.actions.filter(x=>x==="native-stop").length;
 assert.equal(f.menu.onOpen(),false,"pointerdown+click cannot duplicate menu");
 assert.equal(f.actions.filter(x=>x==="native-stop").length,stops);
 const n=f.prepares.length;f.menu.onClose();
 assert.equal(f.prepares.length,n+1);
 assert.equal(f.state.paused,true,"Close cannot resume before native whole bank");
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 const prev=f.plays.length;
 for(const [key,volumeKey] of [
  ["rocketLaunch","rocketLaunch"],["correctHit","correctHit"],["wrongHit","wrongHit"],
  ["abduction","abduction"],["streak4","streak4"],["streak16","streak16"],
  ["bonusStart","bonusStart"],["bonusPop3","bonusHit"],
  ["bonusMultiplierUp","bonusMultiplierUp"],["bonusPenalty","bonusPenalty"],
  ["bonusReveal","bonusReveal"]])await f.test.playGameSound(key,volumeKey);
 const routed=f.plays.slice(prev);
 assert.deepEqual(routed.map(x=>x[0]),["rocketLaunch","correctHit","wrongHit","abduction",
  "streak4","streak16","bonusStart","bonusPop3","bonusMultiplierUp","bonusPenalty","bonusReveal"]);
 assert.equal(routed[0][1],.74*.43);
 assert.equal(routed[4][1],.74*.41);
 assert.equal(routed[5][1],.74*.74);
 assert.equal(routed[7][1],.74*.62);
 assert.equal(routed[8][1],.74*.44);
 f.state.paused=true;
 const prior=f.plays.length;
 await f.test.playGameSound("rocketLaunch");
 assert.equal(f.plays.length,prior,"paused game never plays hot effects");
 f.state.paused=false;
 f.state.bonusMode=true;f.state.rafId=1;
 f.config.onAppInactive();
 assert.ok(f.actions.includes("inactive-welcome"));
 assert.equal(f.test.read().returnPaused,true);
 assert.ok(f.actions.includes("clock-pause"));
 const before=f.prepares.length;f.config.onAppActive();
 assert.ok(f.actions.includes("active-welcome"));
 assert.equal(f.prepares.length,before,"foreground never preloads native PCM");
 const returning=f.test.continueFromWelcomeBack();
 assert.equal(f.prepares.length,before+1);
 f.prepares.at(-1).resolve({ready:true});
 assert.equal(await returning,true);
 assert.equal(f.test.read().returnPaused,false);
 assert.ok(f.actions.includes("clock-resume"));
 assert.ok(f.actions.includes("start-loop"),"resume same rockets/bonus RAF");
 const canceled=uiFixture();
 canceled.test.renderModeSelect();
 canceled.shell.mode.onSelect("medium");
 canceled.shell.mode.onBack();
 canceled.prepares[0].resolve({ready:true});await flush();
 assert.equal(canceled.actions.includes("start:medium"),false);
 const held=uiFixture();
 held.test.renderModeSelect();held.shell.mode.onSelect("hard");
 held.config.onAppInactive();
 held.prepares[0].resolve({ready:true});await flush();
 assert.equal(held.actions.includes("start:hard"),false);
 assert.equal(held.test.read().nativeInvadersPending,false);
 const muted=uiFixture({initialMuted:true});
 muted.test.renderIntro();muted.shell.title.onStart();muted.shell.mode.onSelect("hard");
 assert.ok(muted.actions.includes("start:hard"),"muted buttons work without PCM");
 assert.equal(muted.prepares.length,0);
 assert.equal(muted.uiTaps.length,0);
 const web=uiFixture({native:false});
 web.test.renderIntro();
 assert.equal(web.buttons.helpBtn.events.click,undefined,"browser Help remains shell-owned");
 web.shell.title.onStart();web.shell.mode.onSelect("easy");
 assert.ok(web.actions.includes("start:easy"));
 assert.equal(web.prepares.length,0);
 await flush();
}
(async()=>{await bridgeChecks();await buttonChecks();
 console.log("N6g: Invaders 13 unique MP3+2 UI PCM, one aliased streak, original volumes, real title/Help/Back/difficulty/menu/mute/bonus/held App Switcher/Let's go, no native Web fallback PASS");
})().catch(err=>{console.error(err);process.exitCode=1;});
