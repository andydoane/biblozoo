"use strict";
/* N6h: real Verse Munch source callbacks, 13 shipped MP3+2 UI fixed PCM.
 * Node CI is NOT Mac Xcode compilation or physical iPhone speaker proof.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_games/verse_munch/game.js");
const controller=read("verse_games/shared/native-verse-munch-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/verse_munch/index.html");
const css=read("verse_games/verse_munch/game.css");
const handoff=read("docs/PROJECT-HANDOFF.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
new Function(game);new Function(controller);
assert.match(handoff,/N6g Verse Invaders is MERGED and OWNER-TESTED\/PASSED/);
assert.match(handoff,/N6h Verse Munch PR #47/);
assert.match(handoff,/6\/12 exactly halfway/);
assert.match(workflow,/validate_native_verse_munch_n6h\.js/);
assert.ok(html.includes("native-verse-munch-audio.js") &&
 html.indexOf("native-verse-munch-audio.js")<html.indexOf('src="./game.js"'));
assert.match(css,/vmunch-native-audio-failure/);
assert.match(game,/useZooEscape: !nativeMunchAudio/);
assert.match(game,/suppressUiSound: !!nativeMunchAudio/);
assert.match(game,/munchWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/munchWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game,/if \(nativeMunchAudio\) return null; \/\/ iOS: never create Web Audio/);
assert.match(game,/if \(nativeMunchAudio\) return null; \/\/ iOS: never prime HTML Audio/);
assert.match(game,/if \(nativeMunchAudio\) return Promise\.resolve\(nativeMunchAudio\.isReady\(\)\)/);
assert.match(game,/if \(nativeMunchAudio\) return; \/\/ PCM bank preloaded/);
assert.match(game,/if \(nativeMunchAudio && !muted\)[\s\S]*?primeNativeMunchFromGesture\("resume"/);
assert.match(game,/bindTouchEnd\("vmunchGameMenuOverlayCloseBtn"[\s\S]*?primeNativeMunchFromGesture\("resume"/);
assert.doesNotMatch(controller,/new Audio\(|AudioContext|createBufferSource\(|createOscillator\(/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
const sounds=[
 ["wordTap1","munch-word-tap1","verse_munch_tap_1"],
 ["wordTap2","munch-word-tap2","verse_munch_tap_2"],
 ...Array.from({length:3},(_,i)=>["chew"+(i+1),"munch-chew"+(i+1),"verse_munch_chew_"+(i+1)]),
 ["chomp","munch-chomp","verse_munch_chomp"],
 ["correct","munch-correct","verse_munch_correct"],
 ["spew","munch-spew","verse_munch_spew"],
 ["dizzy","munch-dizzy","verse_munch_dizzy"],
 ["streak","munch-streak","verse_munch_streak"],
 ["bonusStart","munch-bonus-start","verse_munch_bonus_start"],
 ["bonusResult","munch-bonus-result","verse_munch_bonus_result"],
 ["wrongFruit","munch-wrong-fruit","verse_munch_wrong_fruit"]
];
assert.equal(sounds.length,13);
for(const [key,id,file] of sounds){
 const f=path.join(root,"verse_games/verse_munch/verse_munch_sounds",file+".mp3");
 assert.ok(fs.statSync(f).size>0,"shipped Munch MP3 "+file);
 assert.ok(swift.includes('"'+id+'": "'+file+'"'),"Swift exact fixed MP3 "+id);
 assert.ok(swift.includes('"'+id+'"'),"native PCM allowlist "+id);
 assert.ok(controller.includes(key+': "'+id+'"'),"JS native mapping "+key);
 assert.ok(game.includes(file+".mp3"),"browser original sound unchanged "+file);
}
assert.match(swift,/verseMunchSoundResources\[soundId\] != nil/);
assert.match(swift,/self\.verseMunchSoundResources\[soundId\]/);
assert.match(swift,/public\/verse_games\/verse_munch\/verse_munch_sounds/);
const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
const pending=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};

function worker({ios=true,missing="",reject="",holdUi=false}={}){
 let hold=holdUi;const actions=[],listeners={},deferred=[],warm=new Set(),doc={hidden:false,
  addEventListener(n,fn){listeners["doc:"+n]=fn;}};
 const swiftStub={
  activateFromGesture(a){actions.push(["activate",a.purpose]);return Promise.resolve({ready:true});},
  preload(a){
   actions.push(["preload",a.soundId]);
   const reply={prepared:a.soundId!==missing,reason:a.soundId===missing?"bundled-asset-missing":"prepared",durationMs:65};
   if(hold&&a.soundId.startsWith("ui-pop-"))
    return new Promise(resolve=>deferred.push(()=>{if(reply.prepared)warm.add(a.soundId);resolve(reply);}));
   if(reply.prepared)warm.add(a.soundId);
   return Promise.resolve(reply);
  },
  play(a){actions.push(["play",a.soundId,a.volume]);return Promise.resolve({accepted:warm.has(a.soundId)&&a.soundId!==reject,
    reason:a.soundId===reject?"pcm-not-preloaded":"scheduled"});},
  stop(a){actions.push(["stop",a.soundId]);warm.clear();return Promise.resolve({stopped:true});},
  addListener(n,fn){listeners[n]=fn;return Promise.resolve({remove(){}});}
 };
 const win={document:doc,Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
   Plugins:{BibloZooNativeSound:swiftStub}},BibloZooNativeOnlyOutput:{enabled:true},
  setTimeout,clearTimeout,addEventListener(n,fn){listeners["win:"+n]=fn;}};
 vm.runInNewContext(controller,{window:win,Date,Promise,Error,console});
 return{api:win.BibloZooNativeVerseMunchAudio,actions,listeners,doc,
  release(){hold=false;deferred.splice(0).forEach(fn=>fn());}};
}
async function controllerTests(){
 const f=worker();
 assert.equal(f.api.play("wordTap1",.5),false);
 assert.equal(f.api.tapUiFromGesture("uiTap1",.405),true);
 assert.deepEqual(f.actions[0],["activate","ui"]);
 await flush();
 assert.deepEqual(f.actions.filter(x=>x[0]==="preload").map(x=>x[1]),["ui-pop-1","ui-pop-2"]);
 assert.equal(f.api.isReady(),false,"UI-only preflight never means gameplay is ready");
 const offset=f.actions.length;
 assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.405})).ready,true);
 const recent=f.actions.slice(offset);
 assert.deepEqual(recent[0],["activate","game"]);
 const pop=recent.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2");
 const first=recent.findIndex(x=>x[0]==="preload"&&x[1]==="munch-word-tap1");
 assert.ok(pop>=0&&pop<first,"mode UI pop precedes game effect predecode");
 assert.equal(recent.filter(x=>x[0]==="preload").length,15);
 assert.equal(new Set(recent.filter(x=>x[0]==="preload").map(x=>x[1])).size,15);
 assert.equal(f.api.isReady(),true);
 for(const [key] of sounds)assert.equal(f.api.play(key,.5),true);
 await f.api.stop();assert.equal(f.api.isReady(),false);
 assert.equal(f.api.play("chew1",.5),false);
 const missing=worker({missing:"munch-chew2"});
 assert.equal((await missing.api.prepareFromGesture()).ready,false);
 assert.equal(missing.api.isReady(),false);
 assert.ok(missing.actions.some(x=>x[0]==="stop"));
 const rejected=worker({reject:"munch-wrong-fruit"}),failures=[];
 rejected.api.configure({onPlaybackFailure:x=>failures.push(x)});
 assert.equal((await rejected.api.prepareFromGesture()).ready,true);
 assert.equal(rejected.api.play("wrongFruit",.5),true);await flush();
 assert.deepEqual(failures,["pcm-not-preloaded"]);
 assert.equal(rejected.api.isReady(),false);
 const race=worker({holdUi:true});
 race.api.tapUiFromGesture("uiTap1",.405);await flush();
 const fresh=race.api.prepareFromGesture({key:"uiTap2",volume:.405});
 race.release();assert.equal((await fresh).ready,true);await flush();
 assert.deepEqual(race.actions.filter(x=>x[0]==="play").map(x=>x[1]),["ui-pop-2"]);
 const inactive=worker({holdUi:true});
 inactive.api.tapUiFromGesture("uiTap1",.405);await flush();
 inactive.listeners.biblozooAppLifecycle({active:false});
 inactive.release();await flush();
 assert.equal(inactive.actions.filter(x=>x[0]==="play").length,0);
 inactive.listeners.biblozooAppLifecycle({active:true});
 assert.equal(inactive.actions.filter(x=>x[0]==="activate").length,1,"foreground cannot auto activate");
 const browser=worker({ios:false});
 assert.equal(browser.api.tapUiFromGesture("uiTap1",.405),false);
 assert.equal((await browser.api.prepareFromGesture()).ready,false);
 assert.equal(browser.actions.length,0);
}
function section(a,b){const i=game.indexOf(a),j=game.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,"missing real Munch source section "+a);return game.slice(i,j);}
const startGuard=section("  function startGame(mode){","    state.runToken += 1;")+
 "    window.__startMunchRound(mode);\n  }\n";
const extracted=[
 section("  const nativeMunchAudio =","  const state = {"),
 section("  function soundVolume(key) {","  async function loadSoundBuffer(key) {"),
 section("  async function playGameSound(key, volumeKey = key) {","  if (nativeMunchAudio) {\n    nativeMunchAudio.configure"),
 section("  if (nativeMunchAudio) {\n    nativeMunchAudio.configure","  setupReferenceSegments();"),
 section("function renderIntro(){","  function startGame(mode){"),
 startGuard,
 section("function wireCommonNav(){","  function cancelActiveRun() {"),
 section("function openGameMenu(){","function openHelpFromMenu(){"),
 section("  function pauseForTaskSwitch() {","  munchWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({"),
 section("  munchWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({","})();")
].join("\n")+"\nthis.test={renderIntro,renderModeSelect,wireCommonNav,openGameMenu,closeGameMenu,playUiTapSound,playWordTapSound,playChewSound,playGameSound,primeNativeMunchFromGesture,setPaused,pauseForTaskSwitch,continueFromWelcomeBack,startGame,read:()=>({nativeMunchPending,returnPaused})};";
assert.doesNotMatch(extracted,/\bvolumeScale\b/,"no out-of-scope Snake #41 volumeScale on real Munch buttons");

function gameFixture({native=true,muted=false,mobile=true}={}){
 const actions=[],pops=[],effects=[],prepares=[],buttons={};let menu,speed,config,dialog=null,ready=false,t=1000;
 const mk=id=>(buttons[id]={events:{},dataset:{},addEventListener(n,fn){this.events[n]=fn;},
  click(){this.events.click?.();},touch(){this.events.touchend?.({cancelable:true,preventDefault(){},stopPropagation(){}});},
  classList:{add(){},remove(){},contains(){return false;}},setAttribute(){},getAttribute(){return"";}});
 for(const id of ["helpBtn","vmunchHelpOverlayCloseBtn",
  "vmunchGameMenuOverlayCloseBtn","vmunchGameMenuOverlayHowToBtn","vmunchGameMenuOverlayModeSelectBtn",
  "vmunchGameMenuOverlayExitBtn","vmunchGameMenuOverlayMuteBtn",
  "vmunchGameMenuOverlay","vmunchHelpOverlay"])mk(id);
 const doc={hidden:false,
  body:{classList:{add(k){actions.push("class-add:"+k);},remove(k){actions.push("class-remove:"+k);}},appendChild(el){dialog=el;}},
  getElementById(id){return id==="vmunchNativeAudioFailure"?dialog:buttons[id]||null;},
  createElement(){return{innerHTML:"",className:"",querySelector(){return{onclick:null,textContent:""};},remove(){dialog=null;}};},
  addEventListener(){}};
 const app={setAttribute(k,v){actions.push("attr:"+k+"="+v);},removeAttribute(k){actions.push("remove:"+k);}};
 const shell={renderTitleScreen(o){this.title=o;actions.push("title");},
  renderModeSelect(o){this.mode=o;actions.push("mode");},
  wireGameMenu(o){menu=o;actions.push("menu-wire");},
  wireSpeedMenu(o){speed=o;actions.push("speed-wire");}};
 const player={isAvailable:()=>native,
  configure(o){config=o;},
  tapUiFromGesture(...x){pops.push(x);return true;},
  prepareFromGesture(...x){const d=pending();prepares.push({args:x,resolve(result){ready=result?.ready===true;d.resolve(result);}});return d.promise;},
  stop(){ready=false;actions.push("native-stop");return Promise.resolve();},
  play(...x){effects.push(x);return true;},
  isReady:()=>ready};
 const state={running:false,paused:false,pauseReason:"",runToken:1,rafId:1,lastTs:0,
  bonusPhase:"",bonusCount:0,bonusMultiplier:1,
  feedbackUntil:1000,reactionFlashUntil:1000,streakSunburstUntil:1000,buildShakeUntil:1000};
 const welcome={pauseFromNativeInactive(){actions.push("held-inactive");context.test.pauseForTaskSwitch();return true;},
  showAfterNativeActive(){actions.push("foreground-visible");return true;}};
 const win={VerseGameShell:shell,BibloZooNativeVerseMunchAudio:player,
  VerseGameBridge:{exitGame(){actions.push("exit");},returnToVersePicker(){actions.push("picker");},
   getLaunchParams(){return{profileId:"test"};}},
  BibloZooWelcomeBackReturn:{attach(o){actions.push("welcome-attached");return welcome;},
   resumeAudioOnGesture(){actions.push("web-resume");return Promise.resolve(true);}},
  __startMunchRound(mode){actions.push("start:"+mode);state.running=true;state.paused=false;state.pauseReason="";},
  ...(mobile?{ontouchstart:null}:{})};
 const context={window:win,document:doc,app,state,Promise,Math,Date,console,
  navigator:{maxTouchPoints:mobile?5:0},muted,
  SOUND_TUNING:{masterVolume:.90,volumes:{uiTap:.45,wordTap:.48,chew:.58,chomp:.36,correct:.53,spew:.50,
   dizzy:.70,streak:.63,bonusStart:.71,bonusResult:.72,wrongFruit:.65}},
  uiSoundFlip:false,wordTapSoundFlip:false,chewSoundIndex:0,
  returnPaused:false,returnSession:0,returnRecoveryFailures:0,returnContextReplacements:0,
  priorPauseReason:null,returnPausedAt:0,completed:false,bonusRunning:false,selectedMode:null,
  performance:{now(){t+=120;return t;}},GAME_TITLE:"Verse Munch",GAME_ICON:"😋",
  GAME_ICON_HTML:"😋",GAME_THEME:{},HELP_OVERLAY_ID:"vmunchHelpOverlay",
  introHelpHtml:()=>"<p>Intro</p>",modeHelpHtml:()=>"<p>Mode</p>",
  stopLoop(){actions.push("stop-loop");state.running=false;},
  cancelActiveRun(){actions.push("cancel-run");state.running=false;},
  getCurrentPhase:()=> "playing",openHelpFromMenu(){actions.push("help-from-menu");},
  renderComplete(){actions.push("complete");},renderFrame(){actions.push("render-frame");},
  getAudioContext(){if(native)throw Error("native accessed Web Audio");return null;},
  unlockAudio(){if(native)throw Error("native accessed browser unlock");actions.push("web-unlock");return Promise.resolve(true);},
  Audio:function(){throw Error("native HTML Audio fallback!");}
 };
 vm.createContext(context);
 vm.runInContext(extracted,context,{filename:"real-verse-munch-ui.js"});
 return{actions,pops,effects,prepares,buttons,player,state,win,shell,context,test:context.test,
  get menu(){return menu;},get speed(){return speed;},get config(){return config;},get dialog(){return dialog;}};
}
async function actualButtons(){
 const f=gameFixture();
 f.test.renderIntro();
 assert.ok(f.actions.includes("title"));
 f.buttons.helpBtn.click();f.buttons.vmunchHelpOverlayCloseBtn.click();
 assert.equal(f.pops.length,2);
 assert.equal(f.pops[0][1],.90*.45);
 f.shell.title.onStart();assert.ok(f.actions.includes("mode"));
 f.shell.mode.onBack();assert.equal(f.actions.filter(x=>x==="title").length,2);
 f.shell.title.onBack();assert.ok(f.actions.includes("exit"));
 f.test.renderModeSelect();f.shell.mode.onSelect("easy");
 assert.equal(f.prepares.length,1);
 assert.equal(f.prepares[0].args[0].volume,.90*.45);
 f.shell.mode.onSelect("hard");assert.equal(f.prepares.length,1);
 f.prepares[0].resolve({ready:true});await flush();
 assert.deepEqual(f.actions.filter(x=>x.startsWith("start:")),["start:easy"]);
 f.test.wireCommonNav();
 assert.equal(typeof f.buttons.vmunchGameMenuOverlayCloseBtn.events.touchend,"function",
  "real iPhone touchend Close wired in addition to shared shell");
 f.menu.onOpen();assert.equal(f.state.paused,true);
 const count=f.actions.filter(x=>x==="native-stop").length;
 assert.equal(f.menu.onOpen(),false,"duplicate pointer/click menu ignored");
 assert.equal(f.actions.filter(x=>x==="native-stop").length,count);
 let n=f.prepares.length;
 f.menu.onClose();
 assert.equal(f.prepares.length,n+1);
 assert.equal(f.state.paused,true,"menu Close cannot resume until all PCM ready");
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 // Crucial independent physical-iPhone touchend fallback.
 f.menu.onOpen();n=f.prepares.length;
 f.buttons.vmunchGameMenuOverlayCloseBtn.touch();
 assert.equal(f.prepares.length,n+1,"native touchend Close must ALSO prepare full bank");
 assert.equal(f.state.paused,true,"touchend must not early-unpause");
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 f.speed.onOpen();assert.equal(f.state.pauseReason,"speed");
 const stopCount=f.actions.filter(x=>x==="native-stop").length;
 assert.equal(f.speed.onOpen(),false,"Speed menu duplicate events deduped");
 assert.equal(f.actions.filter(x=>x==="native-stop").length,stopCount);
 n=f.prepares.length;f.speed.onClose();assert.equal(f.prepares.length,n+1);
 assert.equal(f.state.paused,true);
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 const offset=f.effects.length;
 f.test.playWordTapSound();f.test.playWordTapSound();
 for(let i=0;i<4;i++)f.test.playChewSound();
 for(const key of ["chomp","correct","spew","dizzy","streak","bonusStart","bonusResult","wrongFruit"])
  await f.test.playGameSound(key);
 const notes=f.effects.slice(offset);
 assert.deepEqual(notes.map(x=>x[0]),["wordTap1","wordTap2","chew1","chew2","chew3","chew1",
  "chomp","correct","spew","dizzy","streak","bonusStart","bonusResult","wrongFruit"]);
 assert.equal(notes[0][1],.90*.48);
 assert.equal(notes[2][1],.90*.58);
 assert.equal(notes[11][1],.90*.71);
 assert.equal(notes[12][1],.90*.72);
 f.state.paused=true;
 const m=f.effects.length;await f.test.playGameSound("correct");
 assert.equal(f.effects.length,m,"paused monster never emits gameplay PCM");
 f.state.paused=false;
 f.menu.onOpen();
 f.menu.onMuteToggle();
 assert.equal(f.context.muted,true);
 const mutedEffects=f.effects.length;await f.test.playGameSound("correct");
 assert.equal(f.effects.length,mutedEffects);
 f.menu.onClose();assert.equal(f.state.paused,false,"intentionally muted Close navigates");
 f.menu.onOpen();f.menu.onMuteToggle();
 assert.equal(f.context.muted,false);
 n=f.prepares.length;f.menu.onClose();assert.equal(f.prepares.length,n+1);
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 f.config.onAppInactive();
 assert.ok(f.actions.includes("held-inactive"));
 assert.equal(f.test.read().returnPaused,true);
 const before=f.prepares.length;
 f.config.onAppActive();assert.ok(f.actions.includes("foreground-visible"));
 assert.equal(f.prepares.length,before,"no auto-foreground Swift activation");
 const resume=f.test.continueFromWelcomeBack();
 assert.equal(f.prepares.length,before+1);
 f.prepares.at(-1).resolve({ready:true});
 assert.equal(await resume,true);
 assert.equal(f.test.read().returnPaused,false);
 const old=gameFixture();old.test.renderModeSelect();old.shell.mode.onSelect("medium");
 old.shell.mode.onBack();old.prepares[0].resolve({ready:true});await flush();
 assert.equal(old.actions.includes("start:medium"),false,"Back cancels stale native mode");
 const held=gameFixture();held.test.renderModeSelect();held.shell.mode.onSelect("hard");
 held.config.onAppInactive();held.prepares[0].resolve({ready:true});await flush();
 assert.equal(held.actions.includes("start:hard"),false,"held App Switcher cancels pending mode");
 assert.equal(held.test.read().nativeMunchPending,false);
 const muted=gameFixture({muted:true});muted.test.renderIntro();
 muted.shell.title.onStart();muted.shell.mode.onSelect("hard");
 assert.ok(muted.actions.includes("start:hard"),"muted navigation cannot block");
 assert.equal(muted.prepares.length,0);assert.equal(muted.pops.length,0);
 const browser=gameFixture({native:false,mobile:false});
 browser.test.renderIntro();
 assert.equal(browser.buttons.helpBtn.events.click,undefined,"browser Help stays shell-owned");
 browser.shell.title.onStart();browser.shell.mode.onSelect("easy");
 assert.ok(browser.actions.includes("start:easy"));
 assert.equal(browser.prepares.length,0);
 await flush();
}
(async()=>{await controllerTests();await actualButtons();
 console.log("N6h Verse Munch 13 original MP3+2 native UI PCM, actual Start/Back/Help/mode/Game Menu/Speed/touchend/mute/wordTap+chew/bonus/held App Switcher/Let's go, Web isolation PASS");
})().catch(err=>{console.error(err);process.exitCode=1;});