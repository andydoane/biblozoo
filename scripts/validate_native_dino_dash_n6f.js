"use strict";
/* N6f fixed Swift AVAudioEngine PCM + actual Dino Dash buttons.
 * Node CI != Mac Xcode compilation or physical iPhone audibility.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_games/dino_dash/game.js");
const controller=read("verse_games/shared/native-dino-dash-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/dino_dash/index.html");
const css=read("verse_games/dino_dash/game.css");
const handoff=read("docs/PROJECT-HANDOFF.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
new Function(game);new Function(controller);
assert.match(handoff,/N6f/);
assert.match(workflow,/validate_native_dino_dash_n6f\.js/);
assert.ok(html.indexOf("native-dino-dash-audio.js")>0 &&
 html.indexOf("native-dino-dash-audio.js")<html.indexOf('src="./game.js"'));
assert.match(css,/dd2-native-audio-failure/);
assert.match(game,/useZooEscape: !nativeDinoAudio/);
assert.match(game,/suppressUiSound: !!nativeDinoAudio/);
assert.match(game,/dinoWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/dinoWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game,/if \(nativeDinoAudio\) return null; \/\/ Native iOS never constructs AudioContext/);
assert.match(game,/if \(nativeDinoAudio \|\| audioPreloadStarted\) return/);
assert.match(game,/if \(nativeDinoAudio\) return Promise\.resolve\(nativeDinoAudio\.isReady\(\)\)/);
assert.match(game,/if \(!nativeDinoAudio\) \{[\s\S]*?document\.addEventListener\("pointerdown", recoverDinoAudioOnGesture/);
assert.match(game,/if \(nativeDinoAudio && !muted\) \{[\s\S]*?nativeHalfwayPreparation[\s\S]*?nativeDinoAudio\.prepareFromGesture\(\)/);
assert.doesNotMatch(controller,/AudioContext|new Audio\(|createOscillator\(|createBufferSource\(/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
const clips=[
 ["collision","dino-collision","dino_dash_collision"],
 ["correct","dino-correct","dino_dash_correct"],
 ["fall","dino-fall","dino_dash_fall"],
 ["finish","dino-finish","dino_dash_finish"],
 ["jump","dino-jump","dino_dash_jump"],
 ["jump2","dino-jump2","dino_dash_jump_2"],
 ["streak","dino-streak","dino_dash_streak"],
 ["wrong","dino-wrong","dino_dash_wrong"]
];
for(const [key,id,asset] of clips){
 assert.ok(fs.statSync(path.join(root,"verse_games/dino_dash/dino_dash_sounds",asset+".mp3")).size>0);
 assert.ok(swift.includes('"'+id+'": "'+asset+'"'),"fixed Swift filename "+id);
 assert.ok(swift.includes('"'+id+'"'),"PCM allowlist "+id);
 assert.ok(controller.includes(key+': "'+id+'"'),"JS fixed ID "+key);
 assert.ok(game.includes(asset+".mp3"),"web original sound remains "+asset);
}
assert.match(swift,/dinoDashSoundResources\[soundId\] != nil/);
assert.match(swift,/self\.dinoDashSoundResources\[soundId\]/);
assert.match(swift,/public\/verse_games\/dino_dash\/dino_dash_sounds/);
const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};

function bridgeFixture({ios=true,missing="",reject="",holdUi=false}={}){
 const calls=[],listeners={},queued=[],loaded=new Set();let held=holdUi;
 const doc={hidden:false,addEventListener(n,fn){listeners["doc:"+n]=fn;}};
 const bridge={
  activateFromGesture(arg){calls.push(["activate",arg.purpose]);return Promise.resolve({ready:true});},
  preload(arg){
   calls.push(["preload",arg.soundId]);
   const result={prepared:arg.soundId!==missing,reason:arg.soundId===missing?"bundled-asset-missing":"prepared",durationMs:60};
   if(held&&arg.soundId.startsWith("ui-pop-"))
    return new Promise(resolve=>queued.push(()=>{if(result.prepared)loaded.add(arg.soundId);resolve(result);}));
   if(result.prepared)loaded.add(arg.soundId);
   return Promise.resolve(result);
  },
  play(arg){calls.push(["play",arg.soundId,arg.volume]);return Promise.resolve({accepted:loaded.has(arg.soundId)&&arg.soundId!==reject,reason:arg.soundId===reject?"pcm-not-preloaded":"scheduled"});},
  stop(arg){calls.push(["stop",arg.soundId]);loaded.clear();return Promise.resolve({stopped:true});},
  addListener(event,fn){listeners[event]=fn;return Promise.resolve({remove(){}});}
 };
 const win={document:doc,Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",Plugins:{BibloZooNativeSound:bridge}},
 BibloZooNativeOnlyOutput:{enabled:true},setTimeout,clearTimeout,addEventListener(n,fn){listeners["win:"+n]=fn;}};
 vm.runInNewContext(controller,{window:win,Date,Promise,Error,console});
 return{api:win.BibloZooNativeDinoDashAudio,calls,listeners,doc,release(){held=false;queued.splice(0).forEach(fn=>fn());}};
}
async function controllerTests(){
 const f=bridgeFixture();
 assert.equal(f.api.play("jump",.7),false);
 assert.equal(f.api.tapUiFromGesture("uiPop1",.55),true);
 assert.deepEqual(f.calls[0],["activate","ui"]);await flush();
 assert.deepEqual(f.calls.filter(x=>x[0]==="preload").map(x=>x[1]),["ui-pop-1","ui-pop-2"]);
 assert.equal(f.api.isReady(),false,"title UI preparation cannot start gameplay");
 const at=f.calls.length;
 assert.equal((await f.api.prepareFromGesture({key:"uiPop2",volume:.55})).ready,true);
 const more=f.calls.slice(at);
 assert.deepEqual(more[0],["activate","game"]);
 const pop=more.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2");
 const effect=more.findIndex(x=>x[0]==="preload"&&x[1]==="dino-collision");
 assert.ok(pop>=0&&pop<effect,"mode UI pop before game PCM bank");
 assert.equal(more.filter(x=>x[0]==="preload").length,10);
 for(const [k] of clips)assert.equal(f.api.play(k,.85),true);
 await f.api.stop();
 assert.equal(f.api.play("jump",.85),false,"stop invalidates hot PCM");
 const missing=bridgeFixture({missing:"dino-jump2"});
 assert.equal((await missing.api.prepareFromGesture()).ready,false);
 assert.equal(missing.api.isReady(),false);
 assert.ok(missing.calls.some(x=>x[0]==="stop"));
 const rejected=bridgeFixture({reject:"dino-wrong"});const failures=[];
 rejected.api.configure({onPlaybackFailure:r=>failures.push(r)});
 assert.equal((await rejected.api.prepareFromGesture()).ready,true);
 assert.equal(rejected.api.play("wrong",.7),true);await flush();
 assert.deepEqual(failures,["pcm-not-preloaded"]);
 assert.equal(rejected.api.isReady(),false);
 const stale=bridgeFixture({holdUi:true});
 stale.api.tapUiFromGesture("uiPop1",.55);await flush();
 const next=stale.api.prepareFromGesture({key:"uiPop2",volume:.55});
 stale.release();assert.equal((await next).ready,true);await flush();
 assert.deepEqual(stale.calls.filter(x=>x[0]==="play").map(x=>x[1]),["ui-pop-2"]);
 const inactive=bridgeFixture({holdUi:true});
 inactive.api.tapUiFromGesture("uiPop1",.55);await flush();
 inactive.listeners.biblozooAppLifecycle({active:false});
 inactive.release();await flush();
 assert.equal(inactive.calls.filter(x=>x[0]==="play").length,0);
 inactive.listeners.biblozooAppLifecycle({active:true});
 assert.equal(inactive.calls.filter(x=>x[0]==="activate").length,1);
 const web=bridgeFixture({ios:false});
 assert.equal(web.api.tapUiFromGesture("uiPop1",.55),false);
 assert.equal((await web.api.prepareFromGesture()).ready,false);
 assert.equal(web.calls.length,0);
}
function part(start,end){
 const i=game.indexOf(start),j=game.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,"Missing Dino source section: "+start);
 return game.slice(i,j);
}
const src=[
 part("  const nativeDinoAudio =","  const audioBuffers = new Map();"),
 part("  function renderIntro(){","  function readDiagnosticReport(){"),
 part("  async function playSound(key, options = {}) {","  function renderHelpOverlay(body){"),
 part("  function wireCommonNav(){","  function openHelpFromMenu(){"),
 part("  function setPaused(paused, reason = \"\"){","  function wireGameInput(){"),
 part("  function handleInput(){","  function maybeStartBackflip()"),
 part("  function pauseForTaskSwitch()","  dinoWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({"),
 part("  if (nativeDinoAudio) {\n    nativeDinoAudio.configure","  void warmGameplayObstacleImages();"),
 part("  dinoWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({","})();")
].join("\n")+"\nthis.test={renderIntro,renderModeSelect,playUiSound,playSound,wireCommonNav,jump,setPaused,pauseForTaskSwitch,continueFromWelcomeBack,primeNativeDinoFromGesture,stopNativeDinoRound,read:()=>({nativeDinoPending,returnPaused,stateRunning:state.running})};";
assert.doesNotMatch(src,/\bvolumeScale\b/,"real button functions must not use unscoped volumeScale");

function fixture({native=true,muted=false}={}){
 const calls=[],prepares=[],pops=[],plays=[],nodes={};let cfg,menu,speed,gate=null,ready=false,now=1000;
 function button(id){
  return nodes[id]={events:{},addEventListener(n,fn){this.events[n]=fn;},click(){this.events.click?.();}};
 }
 button("helpBtn");button("dd2HelpOverlayCloseBtn");
 const doc={hidden:false,body:{classList:{add(x){calls.push("class-add:"+x);},remove(x){calls.push("class-remove:"+x);}},
    appendChild(node){gate=node;}},
  getElementById:id=>id==="dd2NativeAudioFailure"?gate:nodes[id]||null,
  createElement(){return{className:"",innerHTML:"",querySelector(){return{onclick:null,textContent:""};},remove(){gate=null;}};},
  addEventListener(){},getAnimations(){return[];}};
 const app={setAttribute(k,v){calls.push("attr:"+k+"="+v);},removeAttribute(k){calls.push("remove:"+k);}};
 const shell={renderTitleScreen(o){this.title=o;calls.push("title");},
  renderModeSelect(o){this.mode=o;calls.push("mode");},
  wireGameMenu(o){menu=o;calls.push("menu-wired");},
  wireSpeedMenu(o){speed=o;calls.push("speed-wired");}};
 const audio={isAvailable:()=>native,configure(o){cfg=o;},
  tapUiFromGesture(...a){pops.push(a);return true;},
  prepareFromGesture(...a){const d=deferred();prepares.push({args:a,resolve(result){ready=result?.ready===true;d.resolve(result);}});return d.promise;},
  stop(){ready=false;calls.push("native-stop");return Promise.resolve();},
  play(...a){plays.push(a);return true;},isReady:()=>ready};
 let clockPaused=false;
 const welcomeClock={pause(){clockPaused=true;calls.push("clock-pause");},
   resume(){clockPaused=false;calls.push("clock-resume");},now(){now+=100;return now;}};
 const welcome={
  pauseFromNativeInactive(){calls.push("held-inactive");context.test.pauseForTaskSwitch();return true;},
  showAfterNativeActive(){calls.push("foreground-only");return true;}};
 const win={BibloZooNativeDinoDashAudio:audio,VerseGameShell:shell,
  VerseGameBridge:{exitGame(){calls.push("exit");},returnToVersePicker(){calls.push("picker");},getLaunchParams(){return{profileId:"tester"};}},
  BibloZooWelcomeBackReturn:{attach(o){calls.push("welcome-attached");return welcome;},resumeAudioOnGesture(){calls.push("web-resume");return Promise.resolve(true);}}};
 const state={phase:"title",running:false,paused:false,pauseReason:"",layout:{unit:120},jumpsUsed:0,lastInputAt:0,lastTs:0,pausedRenderTs:0,rafId:0,field:{}};
 const context={window:win,document:doc,app,state,muted,returnPaused:false,returnSession:0,returnContextReplacements:0,
  returnPriorPauseReason:null,returnAnimating:[],selectedMode:null,completed:false,completionResult:null,
  nativeDinoAudio:null,uiPopToggle:false,audioCtx:null,audioUnlocked:false,
  DIAGNOSTIC_TESTING_ENABLED:false,diagnosticOptions:{},diagnosticState:{},gameSpeedPresetId:"normal",
  launch:{profileId:"tester"},
  GAME_TITLE:"Dino Dash",GAME_ICON:"🦖",GAME_ICON_HTML:"🦖",GAME_THEME:{},HELP_OVERLAY_ID:"dd2HelpOverlay",
  MENU_OVERLAY_ID:"dd2GameMenuOverlay",SPEED_MENU_OVERLAY_ID:"dd2SpeedMenuOverlay",
  SOUND_FILES:{uiPop1:"ui_sound_pop_1.mp3",uiPop2:"ui_sound_pop_2.mp3"},
  windowOn:{},console,Math,Promise,Date,now:()=>now,gameNow:()=>welcomeClock.now(),welcomeClock,
  introHelpHtml:()=>"<p>Intro</p>",modeHelpHtml:()=>"<p>Mode</p>",
  markDiagnosticRunClean:(x)=>calls.push("diag:"+x),
  stopLoop:()=>{calls.push("stop-loop");state.running=false;},cleanupResize:()=>calls.push("cleanup"),
  preloadSounds:()=>{if(native)throw Error("Native Dino called Web Audio preload");calls.push("web-preload");},
  unlockAudio:()=>{if(native)throw Error("Native Dino called Web unlock");calls.push("web-unlock");return Promise.resolve(true);},
  renderDiagnosticSelect:(mode)=>calls.push("diagnostic:"+mode),
  startGame:(mode)=>{calls.push("start:"+mode);state.running=true;state.phase="verse";},
  stopGame:()=>calls.push("stop-game"),
  getDifficulty:()=>({jumpU:-8,doubleJumpU:-7}),
  addJumpDust:()=>calls.push("jump-dust"),maybeStartBackflip:()=>calls.push("flip-check"),
  resetDino:()=>calls.push("reset-dino"),
  clearTrail:()=>calls.push("clear-trail"),
  markDiagnosticRunCleanOriginal:()=>{},
  requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},
  Audio:function(){throw Error("Native HTML Audio fallback!");}
 };
 vm.createContext(context);
 vm.runInContext(src,context,{filename:"dino-actual-ui-callbacks.js"});
 return{context,state,calls,prepares,pops,plays,nodes,shell,audio,
  get cfg(){return cfg;},get menu(){return menu;},get speed(){return speed;},
  test:context.test};
}
async function actualButtons(){
 const f=fixture();
 f.test.renderIntro();
 assert.ok(f.calls.includes("title"));
 assert.equal(typeof f.nodes.helpBtn.events.click,"function");
 f.nodes.helpBtn.click();f.nodes.dd2HelpOverlayCloseBtn.click();
 assert.equal(f.pops.length,2);
 assert.equal(f.pops[0][1],.55);
 f.shell.title.onStart();
 assert.ok(f.calls.includes("mode"),"Start navigates even if audio cold");
 f.shell.mode.onBack();
 assert.ok(f.calls.filter(x=>x==="title").length>=2);
 f.shell.title.onBack();assert.ok(f.calls.includes("exit"));

 f.test.renderModeSelect();f.shell.mode.onSelect("easy");
 assert.equal(f.prepares.length,1);
 assert.equal(f.prepares[0].args[0].volume,.55);
 f.shell.mode.onSelect("hard");assert.equal(f.prepares.length,1);
 f.prepares[0].resolve({ready:true});await flush();
 assert.deepEqual(f.calls.filter(x=>x.startsWith("start:")),["start:easy"]);
 f.test.wireCommonNav();
 f.menu.onOpen();
 assert.equal(f.state.paused,true);
 assert.equal(f.state.pauseReason,"menu");
 const n=f.prepares.length;
 f.menu.onClose();assert.equal(f.prepares.length,n+1);
 assert.equal(f.state.paused,true,"menu Close cannot resume before PCM ready");
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 f.speed.onOpen();
 assert.equal(f.state.paused,true);
 assert.equal(f.state.pauseReason,"speed");
 f.speed.onClose();assert.equal(f.prepares.length,n+2);
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.paused,false);
 f.test.jump();f.test.jump();
 assert.deepEqual(f.plays.slice(-2).map(x=>x[0]),["jump","jump2"]);
 assert.ok(f.plays.slice(-2).every(x=>x[1]===.85));
 assert.equal(f.state.jumpsUsed,2,"jump mechanics unaffected");

 f.cfg.onAppInactive();
 assert.ok(f.calls.includes("held-inactive"));
 assert.ok(f.calls.includes("clock-pause"));
 assert.equal(f.test.read().returnPaused,true);
 const before=f.prepares.length;
 f.cfg.onAppActive();
 assert.ok(f.calls.includes("foreground-only"));
 assert.equal(f.prepares.length,before,"foreground never activates sound");
 const resume=f.test.continueFromWelcomeBack();
 assert.equal(f.prepares.length,before+1,"Let's go actual gesture prepares native PCM");
 f.prepares.at(-1).resolve({ready:true});
 assert.equal(await resume,true);
 assert.equal(f.test.read().returnPaused,false);
 assert.ok(f.calls.includes("clock-resume"));
 const race=fixture();
 race.test.renderModeSelect();race.shell.mode.onSelect("medium");
 race.shell.mode.onBack();race.prepares[0].resolve({ready:true});await flush();
 assert.equal(race.calls.includes("start:medium"),false,"mode Back invalidates old preflight");
 const held=fixture();
 held.test.renderModeSelect();held.shell.mode.onSelect("hard");
 held.cfg.onAppInactive();held.prepares[0].resolve({ready:true});await flush();
 assert.equal(held.calls.includes("start:hard"),false,"held App Switcher cancels mode prep");
 const mute=fixture({muted:true});
 mute.test.renderIntro();mute.shell.title.onStart();mute.shell.mode.onSelect("hard");
 assert.ok(mute.calls.includes("start:hard"));
 assert.equal(mute.prepares.length,0,"mute must never block button navigation");
 assert.equal(mute.pops.length,0);
 const web=fixture({native:false});
 web.test.renderIntro();
 assert.equal(web.nodes.helpBtn.events.click,undefined);
 web.shell.title.onStart();web.shell.mode.onSelect("easy");
 assert.ok(web.calls.includes("start:easy"));
 assert.equal(web.prepares.length,0,"browser never invokes native preflight");
}
async function halfwaySun(){
 // Execute the genuine inner sun-tap handler from the real game source.
 const sunSource=part("    let transitioning = false;\n    sun.addEventListener(\"click\", () => {",
   "    async function resumeUnderBlack()");
 assert.match(sunSource,/nativeDinoAudio\.prepareFromGesture\(\)/);
 const f=fixture();
 const sun={disabled:false,events:{},addEventListener(type,fn){this.events[type]=fn;}};
 const screen={classList:{add(){}},isConnected:true};
 const stage="let nativeHalfwayPreparation=null;const sun=this.sun;const screen=this.screen;const checkpoint=this.checkpoint;"+
   sunSource+"\nthis.readHalfway=()=>nativeHalfwayPreparation;";
 const extra={
  sun,screen,checkpoint:{mode:"hard",progressIndex:7},positionOrbit:()=>{},
  recordHalfwayFeedDiagnosticEvent:()=>{},
  DAY_NIGHT_ORBIT_MS:850,DAY_NIGHT_MOON_HOLD_MS:350,
  requestAnimationFrame:()=>0,window:f.context.window,
  gameNow:()=>1000
 };
 Object.assign(f.context,extra);
 vm.runInContext(stage,f.context,{filename:"dino-sun-real-tap.js"});
 sun.events.click();
 assert.equal(f.prepares.length,1,"native Sun tap synchronously prepares full PCM");
 assert.equal(f.prepares[0].args.length,0);
 f.prepares[0].resolve({ready:true});
 assert.equal(await f.context.readHalfway(),true,"checkpoint gesture is ready before night resume");
}
(async()=>{
 await controllerTests();await actualButtons();await halfwaySun();
 console.log("N6f Dino Dash: 8 packaged MP3+2 native UI PCM, exact Swift allowlist, actual Start/Back/Help/mode/menu/speed/jump/held App Switcher/Let's go and sun checkpoint gesture; browser isolated PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});