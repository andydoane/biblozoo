"use strict";
/* N6e real source/JS callbacks, not an Xcode compile or speaker proof. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_games/verse_splat/game.js");
const sound=read("verse_games/shared/native-verse-splat-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/verse_splat/index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
new Function(game);new Function(sound);
assert.match(handoff,/N6e/);
assert.match(workflow,/validate_native_verse_splat_n6e\.js/);
assert.ok(html.indexOf("native-verse-splat-audio.js")>=0 &&
  html.indexOf("native-verse-splat-audio.js")<html.indexOf('src="./game.js"'));
assert.match(game,/useZooEscape: !nativeSplatAudio/);
assert.match(game,/suppressUiSound: !!nativeSplatAudio/);
assert.match(game,/splatWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/splatWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game,/const VerseSplatAudioContext = nativeSplatAudio \? null/);
assert.match(game,/if \(nativeSplatAudio \|\| !VerseSplatAudioContext\) return null/);
assert.match(game,/if \(nativeSplatAudio \|\| !file\) return null/);
assert.match(game,/if \(!nativeSplatAudio\)[\s\S]*?Object\.values\(VERSE_SPLAT_SOUNDS\)/);
assert.doesNotMatch(sound,/new Audio\(|AudioContext|createBufferSource\(|createOscillator\(/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
const items=[
 ...Array.from({length:5},(_,i)=>["pop"+(i+1),"splat-pop-"+(i+1),"verse_splat_pop_"+(i+1)]),
 ...Array.from({length:3},(_,i)=>["correct"+(i+1),"splat-correct-"+(i+1),"verse_splat_correct_"+(i+1)]),
 ["wrong","splat-wrong","verse_splat_wrong"],["streak","splat-streak","verse_splat_streak"],
 ["paintScore","splat-paint-score","verse_splat_paint_score"],
 ["start","splat-start","verse_splat_start"],["positive","splat-positive","verse_splat_positive"]
];
assert.equal(items.length,13);
for(const [key,id,asset] of items){
 assert.ok(fs.statSync(path.join(root,"verse_games/verse_splat/verse_splat_sounds",asset+".mp3")).size>0);
 assert.ok(swift.includes('"'+id+'": "'+asset+'"'),"fixed Swift filename "+id);
 assert.ok(swift.includes('"'+id+'"'),"PCM allowlist "+id);
 assert.ok(sound.includes(key+': "'+id+'"'),"controller allowlist "+key);
 assert.ok(game.includes(asset+".mp3"),"browser source untouched "+asset);
}
assert.match(swift,/self\.verseSplatSoundResources\[soundId\]/);
assert.match(swift,/verseSplatSoundResources\[soundId\] != nil/);
assert.match(swift,/public\/verse_games\/verse_splat\/verse_splat_sounds/);
const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function bridgeFixture({ios=true,missing="",hold=false}={}){
 const calls=[],callbacks={},held=[],loaded=new Set();let h=hold;
 const doc={hidden:false,addEventListener(n,fn){callbacks["doc:"+n]=fn;}};
 const native={
  activateFromGesture(a){calls.push(["activate",a.purpose]);return Promise.resolve({ready:true});},
  preload(a){
    calls.push(["preload",a.soundId]);
    const response={prepared:a.soundId!==missing,durationMs:a.soundId===missing?0:56,reason:a.soundId===missing?"bundled-asset-missing":"prepared"};
    if(h&&a.soundId.startsWith("ui-pop-"))return new Promise(r=>held.push(()=>{if(response.prepared)loaded.add(a.soundId);r(response);}));
    if(response.prepared)loaded.add(a.soundId);
    return Promise.resolve(response);
  },
  play(a){calls.push(["play",a.soundId,a.volume]);return Promise.resolve({accepted:loaded.has(a.soundId)});},
  stop(a){calls.push(["stop",a.soundId]);loaded.clear();return Promise.resolve({stopped:true});},
  addListener(n,fn){callbacks[n]=fn;return Promise.resolve({remove(){}});}
 };
 const win={document:doc,Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",Plugins:{BibloZooNativeSound:native}},
  BibloZooNativeOnlyOutput:{enabled:true},setTimeout,clearTimeout,addEventListener(n,fn){callbacks["win:"+n]=fn;}};
 vm.runInNewContext(sound,{window:win,Date,Promise,Error,console});
 return{api:win.BibloZooNativeVerseSplatAudio,calls,doc,callbacks,release(){h=false;held.splice(0).forEach(x=>x());}};
}
async function controllerChecks(){
 const f=bridgeFixture();
 assert.equal(f.api.play("pop1",.7),false);
 assert.equal(f.api.tapUiFromGesture("uiTap1",.45),true);
 assert.deepEqual(f.calls[0],["activate","ui"]);await flush();
 assert.deepEqual(f.calls.filter(x=>x[0]==="preload").map(x=>x[1]),["ui-pop-1","ui-pop-2"]);
 assert.equal(f.api.isReady(),false,"title UI-only is not game ready");
 const first=f.calls.length;
 assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.45})).ready,true);
 const recent=f.calls.slice(first);
 assert.deepEqual(recent[0],["activate","game"]);
 const ui=recent.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2");
 const gameplay=recent.findIndex(x=>x[0]==="preload"&&x[1]==="splat-pop-1");
 assert.ok(ui>=0&&ui<gameplay,"mode pop before game decode");
 assert.equal(recent.filter(x=>x[0]==="preload").length,15);
 for(const [k] of items)assert.equal(f.api.play(k,.5),true);
 await f.api.stop();assert.equal(f.api.isReady(),false);
 assert.equal(f.api.play("pop1",.5),false);
 const bad=bridgeFixture({missing:"splat-correct-3"});
 assert.equal((await bad.api.prepareFromGesture()).ready,false);
 assert.equal(bad.api.isReady(),false);
 const stale=bridgeFixture({hold:true});
 stale.api.tapUiFromGesture("uiTap1",.45);await flush();
 const later=stale.api.prepareFromGesture({key:"uiTap2",volume:.45});
 stale.release();assert.equal((await later).ready,true);await flush();
 assert.deepEqual(stale.calls.filter(x=>x[0]==="play").map(x=>x[1]),["ui-pop-2"]);
 const inactive=bridgeFixture({hold:true});
 inactive.api.tapUiFromGesture("uiTap1",.45);await flush();
 inactive.callbacks.biblozooAppLifecycle({active:false});
 inactive.release();await flush();
 assert.equal(inactive.calls.filter(x=>x[0]==="play").length,0);
 inactive.callbacks.biblozooAppLifecycle({active:true});
 assert.equal(inactive.calls.filter(x=>x[0]==="activate").length,1);
 const web=bridgeFixture({ios:false});
 assert.equal(web.api.tapUiFromGesture("uiTap1",.4),false);
 assert.equal((await web.api.prepareFromGesture()).ready,false);
 assert.equal(web.calls.length,0);
}
function part(a,b){const i=game.indexOf(a),j=game.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,"Missing source section "+a);return game.slice(i,j);}
const clickSource=[
 part("  const nativeSplatAudio =","  const verseSplatSoundCache ="),
 part("  function chooseVerseSplatSound(","  const $ ="),
 part("  function pickNativeSplatUiKey()","const shuffle ="),
 part("function renderIntro(){","function overlayMarkup(){"),
 part("  function wireSharedGameMenu(){","  function openMenu(){"),
 part("  function closeMenu(){","  function closeHelp(){"),
 part("  function startMode(mode){","  function currentBounds(){"),
 part("  function pauseForTaskSwitch()","  splatWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({"),
 part("  if (nativeSplatAudio) {\n    nativeSplatAudio.configure","  initVerseData();"),
 part("  splatWelcomeBack = window.BibloZooWelcomeBackReturn?.attach?.({","})();")
].join("\n")+"\nthis.test={renderIntro,renderModeScreen,wireSharedGameMenu,primeNativeSplatFromGesture,playSharedUiPopSound,playPopSound,playCorrectSound,playWrongSound,playStreakSound,playPaintScoreSound,playStartSound,playPositiveSound,pauseForTaskSwitch,continueFromWelcomeBack};";
assert.doesNotMatch(clickSource,/\bvolumeScale\b/,"no out-of-scope volumeScale in button callbacks");
function fixture({native=true,muted=false}={}){
 const actions=[],pops=[],plays=[],prepares=[],buttons={};let cfg,menu,gate=null,t=1000;
 const doc={hidden:false,
  body:{classList:{add(k){actions.push("class-add:"+k);},remove(k){actions.push("class-remove:"+k);}},appendChild(el){gate=el;}},
  getElementById(k){
    if(k==="vspNativeAudioFailure")return gate;
    if(!buttons[k])buttons[k]={events:{},addEventListener(event,fn){this.events[event]=fn;},click(){this.events.click?.();}};
    return buttons[k];},
  createElement(){return{className:"",innerHTML:"",querySelector(){return{onclick:null,textContent:""};},remove(){gate=null;}};},
  addEventListener(){},querySelector(){return null;}
 };
 const app={setAttribute(k,v){actions.push("attr:"+k+"="+v);},removeAttribute(k){actions.push("remove:"+k);}};
 const shell={renderTitleScreen(o){this.title=o;actions.push("title");},renderModeSelect(o){this.mode=o;actions.push("mode");},wireGameMenu(o){menu=o;actions.push("menu-wire");}};
 const audio={isAvailable:()=>native,tapUiFromGesture(...x){pops.push(x);return true;},
  prepareFromGesture(...x){const d=deferred();prepares.push({args:x,resolve:d.resolve});return d.promise;},
  stop(){actions.push("stop-native");return Promise.resolve();},play(...x){plays.push(x);return true;},
  configure(o){cfg=o;}};
 const welcome={pauseFromNativeInactive(){actions.push("held");context.test.pauseForTaskSwitch();return true;},
  showAfterNativeActive(){actions.push("visible");return true;}};
 const win={BibloZooNativeVerseSplatAudio:audio,VerseGameShell:shell,
  VerseGameBridge:{exitGame(){actions.push("exit");},returnToVersePicker(){actions.push("picker");},getLaunchParams(){return{profileId:"x"};}},
  BibloZooWelcomeBackReturn:{attach(o){actions.push("attach");return welcome;},
    resumeAudioOnGesture(){actions.push("web-resume");return Promise.resolve(true);}}};
 const state={screen:"intro",mode:null,menuOpen:false,helpOpen:false,helpBackMode:false,busy:false,
   completed:false,bonusIntroVisible:false,bonusEnding:false,inputLockedUntil:0};
 const context={window:win,document:doc,app,state,muted,returnPaused:false,returnSession:0,
  returnRecoveryFailures:0,returnContextReplacements:0,returnPausedAt:0,
  VERSE_SPLAT_SOUNDS:{
   uiTap:["../../ui_audio/ui_sound_pop_1.mp3","../../ui_audio/ui_sound_pop_2.mp3"],
   pop:Array.from({length:5},(_,i)=>"verse_splat_pop_"+(i+1)+".mp3"),
   correct:Array.from({length:3},(_,i)=>"verse_splat_correct_"+(i+1)+".mp3"),
   wrong:"verse_splat_wrong.mp3",streak:"verse_splat_streak.mp3",
   paintScore:"verse_splat_paint_score.mp3",start:"verse_splat_start.mp3",positive:"verse_splat_positive.mp3"},
  VERSE_SPLAT_SOUND_COOLDOWNS:{uiTap:80,pop:90,spawn:320,correct:45,correctBonus:70,wrong:80,streak:120,paintScore:180,start:180,positive:120},
  verseSplatLastSoundByGroup:{},verseSplatLastPlayedAt:{},Math,Date,Promise,console,
  performance:{now(){t+=120;return t;}},GAME_TITLE:"Verse Splat",GAME_ICON:"🫟",GAME_ICON_HTML:"🫟",
  GAME_THEME:{},HELP_OVERLAY_ID:"vspHelpOverlay",nonGameHelpHtml(){return"<p>Help</p>";},
  setScreen(next){state.screen=next;actions.push("screen:"+next);},resetForMode(mode){state.mode=mode;actions.push("mode:"+mode);},
  stopLoops(){actions.push("stop-loops");},stopGameLoop(){actions.push("stop-game");},stopBonusLoop(){actions.push("stop-bonus");},
  startGameLoop(){actions.push("start-game");},startBonusLoop(){actions.push("start-bonus");},
  afterGameScreenRender(){actions.push("game-resume");},afterBonusScreenRender(){actions.push("bonus-resume");},
  syncGameMenuOpenState(){actions.push("sync-menu");},
  verseSplatSoundSrc(x){return x;},getVerseSplatAudioContext(){if(native)throw Error("Web Audio accessed from native");return null;},
  $(){return{classList:{add(){},remove(){}},setAttribute(){},contains(){return false;}};},
  // Generic source functions below must not depend on an invented global volumeScale.
 };
 vm.createContext(context);
 vm.runInContext(clickSource,context,{filename:"verse-splat-real-ui-functions.js"});
 return{context,state,actions,pops,plays,prepares,buttons,shell,audio,test:context.test,
  get menu(){return menu;},get cfg(){return cfg;}};
}
async function actualButtons(){
 const f=fixture();
 f.test.renderIntro();
 assert.equal(typeof f.buttons.helpBtn.events.click,"function");
 f.buttons.helpBtn.click();f.buttons.vspHelpOverlayCloseBtn.click();
 assert.equal(f.pops.length,2);
 f.shell.title.onStart();assert.ok(f.actions.includes("screen:mode"));
 f.test.renderModeScreen();f.shell.mode.onBack();
 assert.ok(f.actions.includes("screen:intro"));
 f.shell.title.onBack();assert.ok(f.actions.includes("exit"));
 f.test.renderModeScreen();f.shell.mode.onSelect("easy");
 assert.equal(f.prepares.length,1);assert.equal(f.prepares[0].args[0].volume,.45);
 f.shell.mode.onSelect("hard");assert.equal(f.prepares.length,1);
 f.prepares[0].resolve({ready:true});await flush();
 assert.equal(f.state.screen,"game");assert.equal(f.state.mode,"easy");
 f.test.wireSharedGameMenu();f.menu.onOpen();assert.equal(f.state.menuOpen,true);
 const n=f.prepares.length;f.menu.onClose();
 assert.equal(f.prepares.length,n+1);
 assert.equal(f.state.menuOpen,true);
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.equal(f.state.menuOpen,false);
 assert.ok(f.actions.includes("game-resume"));
 const before=f.plays.length;
 f.test.playPopSound();f.test.playCorrectSound();f.test.playWrongSound();
 f.test.playStreakSound();f.test.playPaintScoreSound();f.test.playStartSound();f.test.playPositiveSound();
 assert.equal(f.plays.length,before+7);
 assert.ok(f.plays.some(v=>/^pop[1-5]$/.test(v[0])&&v[1]===.72));
 assert.ok(f.plays.some(v=>/^correct[1-3]$/.test(v[0])&&v[1]===.88));
 assert.ok(f.plays.some(v=>v[0]==="wrong"&&v[1]===.9));
 f.state.screen="bonus";f.menu.onOpen();f.menu.onClose();
 f.prepares.at(-1).resolve({ready:true});await flush();
 assert.ok(f.actions.includes("bonus-resume"));
 f.cfg.onAppInactive();
 assert.ok(f.actions.includes("held"));assert.equal(f.context.returnPaused,true);
 const pre=f.prepares.length;f.cfg.onAppActive();
 assert.ok(f.actions.includes("visible"));assert.equal(f.prepares.length,pre);
 const continuing=f.test.continueFromWelcomeBack();
 assert.equal(f.prepares.length,pre+1);
 f.prepares.at(-1).resolve({ready:true});
 assert.equal(await continuing,true);
 assert.equal(f.context.returnPaused,false);
 assert.ok(f.actions.includes("start-bonus"));
 const race=fixture();race.test.renderModeScreen();race.shell.mode.onSelect("medium");
 race.shell.mode.onBack();race.prepares[0].resolve({ready:true});await flush();
 assert.notEqual(race.state.screen,"game");
 const mute=fixture({muted:true});
 mute.test.renderIntro();mute.shell.title.onStart();mute.test.renderModeScreen();mute.shell.mode.onSelect("hard");
 assert.equal(mute.state.screen,"game");assert.equal(mute.prepares.length,0);
 assert.equal(mute.pops.length,0);
 const web=fixture({native:false});
 web.test.renderIntro();assert.equal(web.buttons.helpBtn?.events.click,undefined);
 web.shell.title.onStart();web.test.renderModeScreen();web.shell.mode.onSelect("easy");
 assert.equal(web.state.screen,"game");assert.equal(web.prepares.length,0);
}
(async()=>{await controllerChecks();await actualButtons();
 console.log("N6e Verse Splat 13+2 exact native PCM, actual title/Back/Help/mode/menu/sound/held App Switcher callbacks, full preflight, failure, stale and Web isolation PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});