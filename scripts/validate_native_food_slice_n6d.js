"use strict";
/* N6d: real Food Slice sources and native bridge. Controlled JS/Swift
 * contract tests are NOT Xcode compilation or iPhone speaker proof.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const base=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const game=read("verse_games/foodslice/game.js");
const controller=read("verse_games/shared/native-food-slice-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/foodslice/index.html");
const handoff=read("docs/PROJECT-HANDOFF.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const css=read("verse_games/foodslice/game.css");
new Function(game);new Function(controller);
assert.match(handoff,/N6d/);
assert.match(workflow,/validate_native_food_slice_n6d\.js/);
assert.ok(html.indexOf("native-food-slice-audio.js")>0 &&
  html.indexOf("native-food-slice-audio.js")<html.indexOf('src="./game.js"'));
assert.match(css,/fs-native-audio-failure/);
assert.match(game,/useZooEscape: !nativeSliceAudio/);
assert.match(game,/suppressUiSound: !!nativeSliceAudio/);
assert.match(game,/sliceWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/sliceWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game,/nativeSliceAudio\.prepareFromGesture\(\)/);
assert.match(game,/if \(nativeSliceAudio\) return Promise\.resolve\(nativeSliceAudio\.isReady\(\)\)/);
assert.match(game,/if \(nativeSliceAudio\) return null/);
assert.doesNotMatch(controller,/new Audio\(|createOscillator\(|createBufferSource\(|AudioContext/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
const assets={
 bomb:"food_slice_bomb",wrong:"food_slice_wrong",
 slice1:"food_slice_slice_1",slice2:"food_slice_slice_2",
 slice3:"food_slice_slice_3",slice4:"food_slice_slice_4",
 slice5:"food_slice_slice_5",swoosh1:"food_slice_swoosh_1",
 swoosh2:"food_slice_swoosh_2",swoosh3:"food_slice_swoosh_3"
};
const ids={};
for(const [key,asset] of Object.entries(assets)){
 const id=key.startsWith("slice")?"slice-cut-"+key.slice(-1):
   key.startsWith("swoosh")?"slice-swoosh-"+key.slice(-1):"slice-"+key;
 ids[key]=id;
 assert.ok(fs.statSync(path.join(base,"verse_games/foodslice/food_slice_sounds",asset+".mp3")).size>0);
 assert.ok(swift.includes('"'+id+'": "'+asset+'"'),"Swift allowlist "+id);
 assert.ok(swift.includes('"'+id+'"'),"Swift PCM allowlist "+id);
 assert.ok(controller.includes(key+': "'+id+'"'),"controller fixed key "+key);
 assert.ok(game.includes(asset+".mp3"),"published original audio preserved "+key);
}
for(const id of ["ui-pop-1","ui-pop-2"]){
 assert.ok(controller.includes('"'+id+'"'));
}
assert.match(swift,/foodSliceSoundResources\[soundId\] != nil/);
assert.match(swift,/self\.foodSliceSoundResources\[soundId\]/);
assert.match(swift,/subdirectory: "public\/verse_games\/foodslice\/food_slice_sounds"/);
const settle=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}

function bridgeFixture({ios=true,holdUi=false,missing="",rejectPlay=""}={}){
 const calls=[],handlers={},held=[],warm=new Set();
 let hold=holdUi;
 const doc={hidden:false,addEventListener(k,fn){handlers["doc:"+k]=fn;}};
 const bridge={
  activateFromGesture(arg){calls.push(["activate",arg.purpose]);return Promise.resolve({ready:true});},
  preload(arg){
   calls.push(["preload",arg.soundId]);
   const response={prepared:arg.soundId!==missing,
     durationMs:arg.soundId===missing?0:70,
     reason:arg.soundId===missing?"bundled-asset-missing":"prepared"};
   if(hold&&arg.soundId.startsWith("ui-pop-"))
    return new Promise(resolve=>held.push(()=>{if(response.prepared)warm.add(arg.soundId);resolve(response);}));
   if(response.prepared)warm.add(arg.soundId);
   return Promise.resolve(response);
  },
  play(arg){calls.push(["play",arg.soundId,arg.volume]);
    return Promise.resolve({accepted:arg.soundId!==rejectPlay&&warm.has(arg.soundId),
      reason:arg.soundId===rejectPlay?"pcm-not-preloaded":"scheduled"});},
  stop(arg){calls.push(["stop",arg.soundId]);warm.clear();return Promise.resolve({stopped:true});},
  addListener(k,fn){handlers[k]=fn;return Promise.resolve({remove(){}});}
 };
 const root={document:doc,
  Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
    Plugins:{BibloZooNativeSound:bridge}},
  BibloZooNativeOnlyOutput:{enabled:true},
  setTimeout,clearTimeout,addEventListener(k,fn){handlers["win:"+k]=fn;}};
 vm.runInNewContext(controller,{window:root,Promise,Date,Error,console});
 return {audio:root.BibloZooNativeFoodSliceAudio,calls,doc,handlers,
  release(){hold=false;held.splice(0).forEach(r=>r());}};
}
async function controllerTests(){
 const f=bridgeFixture();
 assert.equal(f.audio.play("slice1",.6),false,"unprepared game effect not allowed");
 assert.equal(f.audio.tapUiFromGesture("uiTap1",.3825),true);
 assert.deepEqual(f.calls[0],["activate","ui"]);
 await settle();
 assert.deepEqual(f.calls.filter(x=>x[0]==="preload").map(x=>x[1]),
   ["ui-pop-1","ui-pop-2"],"title prepares only fixed UI PCM");
 assert.equal(f.audio.isReady(),false,"title cannot declare entire game ready");
 assert.equal(f.calls.filter(x=>x[0]==="play").length,1);
 assert.equal(f.calls.find(x=>x[0]==="play")[1],"ui-pop-1");

 const start=f.calls.length;
 assert.equal((await f.audio.prepareFromGesture({key:"uiTap2",volume:.3825})).ready,true);
 const segment=f.calls.slice(start);
 assert.deepEqual(segment[0],["activate","game"],"game activation in same real gesture");
 const pop=segment.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2");
 const effect=segment.findIndex(x=>x[0]==="preload"&&x[1]==="slice-bomb");
 assert.ok(pop>=0 && pop<effect,"mode UI pop before full game bank decode");
 assert.equal(segment.filter(x=>x[0]==="preload").length,12,"ten effects + two UI clips");
 assert.equal(f.audio.isReady(),true);
 for(const key of Object.keys(assets))assert.equal(f.audio.play(key,.45),true);
 assert.equal(f.audio.play("invalid",.7),false);
 await settle();
 await f.audio.stop();
 assert.equal(f.audio.play("slice1",.4),false,"pause clears game readiness");

 const missing=bridgeFixture({missing:"slice-cut-4"});
 const result=await missing.audio.prepareFromGesture();
 assert.equal(result.ready,false);
 assert.equal(missing.audio.isReady(),false);
 assert.ok(missing.calls.some(x=>x[0]==="stop"),"missing sound discards native bank");
 const rejected=bridgeFixture({rejectPlay:"slice-wrong"});
 let failures=[];
 rejected.audio.configure({onPlaybackFailure:k=>failures.push(k)});
 assert.equal((await rejected.audio.prepareFromGesture()).ready,true);
 assert.equal(rejected.audio.play("wrong",.4),true);
 await settle();
 assert.deepEqual(failures,["pcm-not-preloaded"]);
 assert.equal(rejected.audio.isReady(),false);

 const raced=bridgeFixture({holdUi:true});
 raced.audio.tapUiFromGesture("uiTap1",.2);
 await settle();
 const later=raced.audio.prepareFromGesture({key:"uiTap2",volume:.25});
 assert.equal(raced.calls.filter(x=>x[0]==="activate").at(-1)[1],"game");
 raced.release();
 assert.equal((await later).ready,true);
 await settle();
 assert.deepEqual(raced.calls.filter(x=>x[0]==="play").map(x=>x[1]),["ui-pop-2"],
   "old title tap must not play after mode tap");
 const inactive=bridgeFixture({holdUi:true});
 inactive.audio.tapUiFromGesture("uiTap1",.2);await settle();
 inactive.handlers.biblozooAppLifecycle({active:false});
 inactive.release();await settle();
 assert.equal(inactive.calls.filter(x=>x[0]==="play").length,0);
 inactive.handlers.biblozooAppLifecycle({active:true});
 assert.equal(inactive.calls.filter(x=>x[0]==="activate").length,1,
   "foreground never automatically activates a session");
 const web=bridgeFixture({ios:false});
 assert.equal(web.audio.tapUiFromGesture("uiTap1",.3),false);
 assert.equal((await web.audio.prepareFromGesture()).ready,false);
 assert.equal(web.calls.length,0,"web never touches iOS native bridge");
}
function section(a,b){
 const start=game.indexOf(a),end=game.indexOf(b,start+a.length);
 assert.ok(start>=0&&end>start,"real game code section not found: "+a);
 return game.slice(start,end);
}
const ownerSrc=section("  const nativeSliceAudio =", "  renderIntro();");
const screenSrc=section("  function renderIntro(reason = ", "  function startGame(mode) {");
const menuSrc=section("  function wireCommonNav() {","  function bindFoodSliceZoomLock()");
const pauseSrc=section("  function setPaused(paused, reason = \"\") {",
  "  function recalcField() {");
const gameSoundSrc=section("  async function playGameSound(key, volumeKey = key) {",
  "  function pickRandomSoundKey(group, previousKey) {");
const uiSrc=section("  function playUiTapSound() {","  function playRandomSliceSound() {");
const returnSrc=section("  function pauseForTaskSwitch() {","})();");
const ownerFunctions=[ownerSrc,screenSrc,menuSrc,pauseSrc,gameSoundSrc,uiSrc,returnSrc]
  .join("\n")+"\nthis.test={renderIntro,renderModeSelect,primeNativeSliceFromGesture,cancelNativeSlicePreflight,playUiTapSound,playGameSound,wireCommonNav,setPaused,pauseForTaskSwitch,continueFromWelcomeBack,read:()=>({nativeSlicePending,returnPaused,stateRunning:state.running})};";
assert.doesNotMatch(ownerSrc+screenSrc+menuSrc+uiSrc,/\bvolumeScale\b/,
  "new native button functions cannot use a free local from another function");
function gameFixture({native=true,initialMuted=false}={}){
 const actions=[],uiCalls=[],prepares=[],buttons={};
 let gate=null,opts,config,bankReady=false;
 function button(id){
  return buttons[id]={listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},
   click(){this.listeners.click?.();},onclick:null};
 }
 button("helpBtn");button("fsHelpOverlayCloseBtn");
 const doc={hidden:false,body:{classList:{add(k){actions.push("class-add:"+k);},remove(k){actions.push("class-remove:"+k);}},
  appendChild(el){gate=el;}},getElementById(id){return id==="fsNativeAudioFailure"?gate:buttons[id]||null;},
  createElement(){return{innerHTML:"",className:"",querySelector(){return {onclick:null,textContent:""};},remove(){gate=null;}};},
  addEventListener(){}};
 const app={setAttribute(k,v){actions.push("attr:"+k+"="+v);},removeAttribute(k){actions.push("remove:"+k);}};
 const shell={renderTitleScreen(c){actions.push("title");this.title=c;},
  renderModeSelect(c){actions.push("mode");this.mode=c;},
  wireGameMenu(c){opts=c;actions.push("menu-wired");}};
 const audio={
  isAvailable:()=>native,
  configure(c){config=c;},
  tapUiFromGesture(...args){uiCalls.push(args);return true;},
  prepareFromGesture(...args){
    const d=deferred();
    prepares.push({args,promise:d.promise,resolve(result){
      bankReady=result?.ready===true;
      d.resolve(result);
    }});
    return d.promise;
  },
  stop(){bankReady=false;actions.push("native-stop");return Promise.resolve();},
  play(...args){actions.push(["effect",...args]);return true;},
  isReady:()=>bankReady
 };
 const welcome={pauseFromNativeInactive(){actions.push("inactive-welcome");ctx.test.pauseForTaskSwitch();return true;},
  showAfterNativeActive(){actions.push("active-welcome");return true;}};
 const state={running:false,paused:false,pauseReason:"",done:false,rafId:0};
 const window={BibloZooNativeFoodSliceAudio:audio,
  VerseGameShell:shell,VerseGameBridge:{exitGame(){actions.push("exit");},
   returnToVersePicker(){actions.push("verse-picker");},getLaunchParams(){return{profileId:"test"};}},
  BibloZooWelcomeBackReturn:{attach(o){actions.push("attach");return welcome;},
    resumeAudioOnGesture(){actions.push("web-resume");return Promise.resolve(true);}}};
 const ctx={window,document:doc,app,state,Promise,Math,console,
  muted:initialMuted,returnPaused:false,returnSession:0,returnRecoveryFailures:0,
  returnContextReplacements:0,returnPriorPauseReason:null,returnWasLooping:false,
  returnAnimating:[],audioCtx:null,audioUnlocked:false,uiSoundFlip:false,lastUiTapAt:0,
  nativeSliceAudio:null,selectedMode:null,HELP_OVERLAY_ID:"fsHelpOverlay",
  GAME_THEME:{},GAME_TITLE:"Food Slice",GAME_ICON:"🍉",GAME_ICON_HTML:"🍉",
  SOUND_TUNING:{masterVolume:.85,volumes:{uiTap:.45,slice:.72,swoosh:.42,bomb:.9,wrong:.65}},
  soundVolume(key){return .85*ctx.SOUND_TUNING.volumes[key];},
  gameNow:(()=>{let t=100;return()=>{t+=100;return t;}})(),
  recordFoodSliceCompletion:(x)=>actions.push("record:"+x),
  startGame:(mode)=>{actions.push("start:"+mode);state.running=true;},
  stopLoop:()=>actions.push("stop-loop"),startLoop:()=>actions.push("start-loop"),
  helpHtml:()=>"<p>Help</p>",
  openHelpFromMenu:()=>actions.push("open-help"),
  hideNativeSliceFailure:()=>actions.push("hide-gate"),
  welcomeClock:{pause(){actions.push("clock-pause");},resume(){actions.push("clock-resume");}},
  suspendWelcomeAnimations(){actions.push("animation-pause");},
  restoreWelcomeAnimations(){actions.push("animation-resume");},
  unlockAudio(){actions.push("web-unlock");return Promise.resolve(true);},
  getAudioContext(){if(native)throw Error("Native path accessed Web Audio!");return null;},
  // NO volumeScale global. A repeat of N6c.1 Snake's error breaks this VM.
 };
 vm.createContext(ctx);
 vm.runInContext(ownerFunctions,ctx,{filename:"food-slice-actual-source.js"});
 return{audio,ctx,shell,state,actions,uiCalls,prepares,buttons,
  get menu(){return opts;},get callbacks(){return config;},get gate(){return gate;},
  test:ctx.test};
}
async function actualGameOwnerTests(){
 const g=gameFixture();
 g.test.renderIntro();
 assert.equal(g.actions.includes("title"),true);
 assert.equal(typeof g.buttons.helpBtn.listeners.click,"function");
 g.buttons.helpBtn.click();g.buttons.fsHelpOverlayCloseBtn.click();
 assert.equal(g.uiCalls.length,2,"title Help and Close use fixed native UI pops");
 assert.equal(g.uiCalls[0][1],.3825);
 g.shell.title.onStart();
 assert.ok(g.actions.includes("mode"),"Start navigates despite native preparation");
 g.shell.mode.onBack();
 assert.equal(g.actions.filter(x=>x==="title").length,2,"mode Back remains responsive");
 g.shell.title.onBack();
 assert.ok(g.actions.includes("exit"),"title Back remains responsive");
 g.test.renderModeSelect();
 g.shell.mode.onSelect("easy");
 assert.equal(g.prepares.length,1);
 assert.equal(g.prepares[0].args[0].key==="uiTap1" || g.prepares[0].args[0].key==="uiTap2",true);
 assert.equal(g.prepares[0].args[0].volume,.3825);
 g.shell.mode.onSelect("hard");
 assert.equal(g.prepares.length,1,"duplicate mode tap ignored");
 g.prepares[0].resolve({ready:true});await settle();
 assert.deepEqual(g.actions.filter(x=>x.startsWith("start:")),["start:easy"]);
 assert.equal(g.test.read().nativeSlicePending,false);

 g.test.wireCommonNav();
 g.menu.onOpen();
 assert.equal(g.state.paused,true);
 g.menu.onClose();
 assert.equal(g.prepares.length,2,"real menu Close prepares native game bank");
 assert.equal(g.prepares[1].args[0].volume,.3825);
 g.prepares[1].resolve({ready:true});await settle();
 assert.equal(g.state.paused,false);
 const previousEffects=g.actions.filter(x=>Array.isArray(x)&&x[0]==="effect").length;
 await g.test.playGameSound("slice3","slice");
 await g.test.playGameSound("swoosh2","swoosh");
 await g.test.playGameSound("wrong");
 await g.test.playGameSound("bomb");
 const effects=g.actions.filter(x=>Array.isArray(x)&&x[0]==="effect").slice(previousEffects);
 assert.deepEqual(effects.map(x=>x[1]),["slice3","swoosh2","wrong","bomb"]);
 assert.equal(effects[0][2],.612);
 assert.equal(effects[1][2],.357);
 g.state.paused=true;g.state.pauseReason="menu";
 const before=g.actions.filter(x=>Array.isArray(x)&&x[0]==="effect").length;
 await g.test.playGameSound("slice1","slice");
 assert.equal(g.actions.filter(x=>Array.isArray(x)&&x[0]==="effect").length,before,
  "no gameplay effect while menu paused");
 g.state.pauseReason="bomb";
 await g.test.playGameSound("bomb");
 assert.equal(g.actions.filter(x=>Array.isArray(x)&&x[0]==="effect").length,before+1,
  "bomb sound event occurs after its own brief wrong/bomb pause");

 // UIKit held App Switcher, even with WebKit still visible.
 g.callbacks.onAppInactive();
 assert.equal(g.actions.includes("inactive-welcome"),true);
 assert.equal(g.actions.includes("clock-pause"),true);
 assert.equal(g.test.read().returnPaused,true);
 const n=g.prepares.length;
 g.callbacks.onAppActive();
 assert.equal(g.prepares.length,n,"foreground must never call native prepare");
 assert.equal(g.actions.includes("active-welcome"),true);
 const returning=g.test.continueFromWelcomeBack();
 assert.equal(g.prepares.length,n+1,"actual Let's go gesture prepares native");
 g.prepares.at(-1).resolve({ready:true});
 assert.equal(await returning,true);
 assert.equal(g.test.read().returnPaused,false);
 assert.equal(g.actions.includes("clock-resume"),true);

 // Test actual Food Slice setPaused, not a permissive mock. The wrong/bomb
 // animation's delayed unpause must NOT escape a native playback error.
 g.state.paused=true;
 g.state.pauseReason="bomb";
 g.callbacks.onPlaybackFailure();
 assert.equal(g.state.pauseReason,"native-audio-error");
 g.test.setPaused(false,"");
 assert.equal(g.state.paused,true,
   "320ms bomb/wrong animation cannot bypass failed native audio");
 g.test.primeNativeSliceFromGesture("resume");
 g.prepares.at(-1).resolve({ready:true});
 await settle();
 assert.equal(g.state.paused,false,
   "fresh genuine Retry full-bank preflight safely releases failed round");

 const muted=gameFixture({initialMuted:true});
 muted.test.renderIntro();
 muted.shell.title.onStart();muted.shell.mode.onSelect("hard");
 assert.ok(muted.actions.includes("start:hard"),"muted navigation remains responsive");
 assert.equal(muted.prepares.length,0,"mute doesn't activate native PCM");
 const canceled=gameFixture();
 canceled.test.renderModeSelect();canceled.shell.mode.onSelect("medium");
 canceled.shell.mode.onBack();canceled.prepares[0].resolve({ready:true});await settle();
 assert.equal(canceled.actions.includes("start:medium"),false,"stale Back cannot start round");
 const web=gameFixture({native:false});
 web.test.renderIntro();
 assert.equal(web.buttons.helpBtn.listeners.click,undefined,"browser Help click stays shell-owned");
 web.shell.title.onStart();web.shell.mode.onSelect("easy");
 assert.ok(web.actions.includes("start:easy"));
 assert.equal(web.prepares.length,0);
}
(async()=>{
 await controllerTests();await actualGameOwnerTests();
 console.log("N6d: Food Slice 10 fixed MP3s+two UI PCM, Swift allowlist, exact title/Help/Back/mode/Close callback tests, mute, wrong/bomb/bonus routing, stale/held App Switcher & same-round manual return, no Web fallback PASS");
})().catch(err=>{console.error(err);process.exitCode=1;});