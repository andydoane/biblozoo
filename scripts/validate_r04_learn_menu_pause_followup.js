#!/usr/bin/env node
"use strict";
/* R04 menu follow-up, bundled with R05: run actual open/close Learn menu and
 * Patch 71 Missing Words timer/Welcome Back controller. Simulate real clock,
 * WAAPI animations and UIKit inactive without opening a new menu-specific PR.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const app=read("app.js"),css=read("styles.css");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const menuStart=app.indexOf("function openLearnMenu() {");
const menuEnd=app.indexOf("function getVerseIdFromUrl()",menuStart);
const clockStart=app.indexOf("// Patch 71: app-owned quiet activity return gate.");
const clockEnd=app.indexOf("function runAfterSlide(",clockStart);
assert(menuStart>0 && menuEnd>menuStart && clockStart>0 && clockEnd>clockStart);
const menuSrc=app.slice(menuStart,menuEnd),clockSrc=app.slice(clockStart,clockEnd);
assert(menuSrc.includes("pauseHideForMenu();") &&
       menuSrc.includes("resumeHideFromMenu();"),
  "Actual in-app Learn Menu open/close owns Missing Words timer");
assert(clockSrc.includes("learnHideMenuPaused = true;") &&
       clockSrc.includes("if (document.hidden || appActivityReturn?.isPaused?.()) return;") &&
       clockSrc.includes("State.sayVerseStartedAt += delta;"),
  "Menu Close cannot bypass still-pending native Welcome Back or restart elapsed wall time");
assert(clockSrc.includes("hideActivityVisualsPaused") &&
       clockSrc.includes("if (State.screen !== Screen.HIDE || hideActivityVisualsPaused) return;"),
  "Duplicate menu+UIKit pause must retain same original animation handles");
assert(clockSrc.includes("remaining > 0 || document.hidden || learnHideMenuPaused") &&
       clockSrc.includes("!document.hidden && !learnHideMenuPaused"),
  "All elapsed-timer phases, including zero-remaining, freeze behind Learn Menu");
assert(app.includes("releaseHideActivityVisuals();\n    learnHideMenuPaused = false;") &&
       app.includes("if (State.screen === Screen.HIDE && screen !== Screen.HIDE) {"),
  "Learn menu pause must clear on both sliding and direct exit paths");
assert(css.includes(".learn-hide-native-paused .learn-screen-remove *") &&
       css.includes("animation-play-state: paused !important"));
assert(workflow.includes("node scripts/validate_r04_learn_menu_pause_followup.js"));
new vm.Script(menuSrc);new vm.Script(clockSrc);

const source=`let learnMenuOpen=false,learnMenuPausedAudio=false,learnMenuNativeRecovery=null;
${menuSrc}
${clockSrc}
window.__menuTest={
  openLearnMenu,closeLearnMenu,attachAppActivityReturn,waitForActiveLearnTime,
  getSayVersePct,getFinalRecallPct,
  getMenuOpen:()=>learnMenuOpen,
  getMenuPaused:()=>learnHideMenuPaused,
  getPausedAt:()=>appReturnPausedAt
};`;
function fixture(native=true) {
  let now=4000,options,handler,overlayAppear=0,menuOverlaySync=0;
  const timers=[],anims=[],classes=new Set(),menuClasses=new Set();
  function anim() {
    const a={playState:"running",pauseCount:0,playCount:0,
      pause(){this.playState="paused";this.pauseCount++;},
      play(){this.playState="running";this.playCount++;}};
    anims.push(a);return a;
  }
  const breathing=anim(),fade=anim();
  const stage={getAnimations({subtree}){assert.equal(subtree,true);return anims;}};
  const menu={classList:{add(s){menuClasses.add(s)},remove(s){menuClasses.delete(s)}},
    setAttribute(){}};
  const doc={hidden:false,
    documentElement:{classList:{add(s){classes.add(s)},remove(s){classes.delete(s)}}},
    querySelector(q){return q===".learn-screen-remove"?stage:null;},
    getElementById(q){return q==="learnMenuOverlay"?menu:null;}
  };
  const Screen={HIDE:"hide",FINAL_RECALL:"final",TITLE:"title",
    TODO_DEV:"todo_dev",LISTEN:"listen",CHUNKS:"chunks",ECHO:"echo"};
  const State={screen:Screen.HIDE,isSliding:false,todoInfoPage:"",
    sayVerseActive:true,sayVerseStartedAt:2300,sayVerseDurationMs:8000,
    hideCount:3,hideAutoStarting:false,hideTransitionPhase:"",
    finalRecallActive:false,finalRecallStartedAt:0,finalRecallDurationMs:0};
  const owner={
    pending:false,nativeInactive:false,pauses:0,shows:0,exits:0,
    isPaused(){return this.pending;},
    pauseFromNativeInactive(){
      if(!options.shouldPrompt())return false;
      this.nativeInactive=true;
      if(!this.pending){this.pending=true;this.pauses++;options.onPause();}
      return true;
    },
    showAfterNativeActive(){
      if(!this.nativeInactive)return false;
      this.nativeInactive=false;
      if(this.pending){this.shows++;return true;}
      return false;
    },
    acknowledge(){
      if(!this.pending)return false;
      const result=options.onContinue();
      if(result===true)this.pending=false;
      return result;
    }
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:native},
    Capacitor:{getPlatform:()=>native?"ios":"web",
      Plugins:{BibloZooNativeSound:{addListener(k,fn){
        assert.equal(k,"biblozooAppLifecycle");
        handler=fn;return Promise.resolve({remove(){}});
      }}}},
    BibloZooWelcomeBackReturn:{attach(o){options=o;return owner;}}
  };
  const sandbox={
    window:win,document:doc,State,Screen,
    VERSE_ID:"test-verse",muted:false,
    getBibloPetDisplayNameForVerseId:()=> "pet",
    performance:{now:()=>now},
    ensureLearnMenuOverlay(){},
    isNativeLearnListenMode:()=>false,
    pauseLearnAudioForInterruption(){},
    isLearnAudioOverlayRecovery:()=>false,
    syncLearnAudioResumeOverlay(){menuOverlaySync++;},
    audioEl:{paused:true,pause(){this.paused=true;}},
    safePlay(){return Promise.resolve();},
    stopZooTodoTutorialPageAudio(){},
    go(screen){assert.equal(screen,Screen.TITLE);owner.exits++;},
    setTimeout(fn,delay){timers.push({fn,delay});return timers.length;}
  };
  vm.runInNewContext(source,sandbox,{filename:"actual Learn Menu and Patch 71 controller"});
  const api=win.__menuTest;
  api.attachAppActivityReturn();
  const step=async(ms=50)=>{
    now+=ms;
    const t=timers.shift();if(t)t.fn();
    for(let i=0;i<8;i++)await Promise.resolve();
  };
  return {native,doc,State,Screen,owner,classes,breathing,fade,menuClasses,api,
    get now(){return now;},set now(n){now=n;},
    get handler(){return handler;},get overlays(){return overlayAppear;},
    get menuOverlaySync(){return menuOverlaySync;},step};
}
(async()=>{
  const f=fixture();
  const initial=f.api.getSayVersePct(),words=f.State.hideCount;
  assert.equal(f.api.getMenuOpen(),false);
  f.api.openLearnMenu();
  assert.equal(f.api.getMenuOpen(),true);
  assert.equal(f.api.getMenuPaused(),true,"Missing Words frozen by menu gesture");
  assert.equal(f.api.getPausedAt(),4000);
  assert(f.menuClasses.has("show"));
  assert(f.classes.has("learn-hide-native-paused"));
  assert.equal(f.breathing.playState,"paused");
  assert.equal(f.fade.playState,"paused");
  assert.equal(f.owner.pauses,0,"Ordinary menu must NOT create Welcome Back");
  f.api.openLearnMenu();
  assert.equal(f.fade.pauseCount,1,"Repeated menu open preserves original animation checkpoint");

  let done=false;
  const clock=f.api.waitForActiveLearnTime(200).then(()=>{done=true;});
  for(let i=0;i<15;i++)await f.step(100);
  assert.equal(done,false,"Menu cannot finish countdown after 1.5 sec");
  assert.equal(f.api.getSayVersePct(),initial);
  assert.equal(f.State.hideCount,words);
  assert.equal(f.owner.pauses,0);
  assert.equal(f.api.getMenuOpen(),true);
  f.api.closeLearnMenu();
  assert.equal(f.api.getMenuOpen(),false);
  assert.equal(f.api.getMenuPaused(),false);
  assert.equal(f.api.getPausedAt(),0);
  assert.equal(f.api.getSayVersePct(),initial,"Close preserves exact say-verse fraction");
  assert.equal(f.breathing.playCount,1);
  assert.equal(f.fade.playCount,1);
  assert.equal(f.owner.pauses,0,"Menu Close never opens Welcome Back");
  for(let i=0;i<10 && !done;i++)await f.step(50);
  await clock;
  assert.equal(done,true,"Countdown resumes only after explicit Close");

  const interruption=fixture();
  interruption.api.openLearnMenu();
  assert.equal(interruption.breathing.pauseCount,1);
  interruption.handler({active:false,reason:"willResignActive"});
  assert.equal(interruption.owner.pauses,1);
  assert.equal(interruption.breathing.pauseCount,1,
    "OS inactive during Menu must not erase saved WAAPI frame");
  interruption.handler({active:true});
  assert.equal(interruption.owner.shows,1,"Native return awaits Welcome Back");
  interruption.now=7000;
  interruption.api.closeLearnMenu();
  assert.equal(interruption.owner.pending,true,"Menu Close cannot bypass native pause");
  assert(interruption.classes.has("learn-hide-native-paused"));
  assert.equal(interruption.breathing.playCount,0);
  assert.equal(interruption.api.getSayVersePct(),interruption.api.getSayVersePct());
  interruption.now=8500;
  assert.equal(interruption.owner.acknowledge(),true);
  assert.equal(interruption.api.getSayVersePct(),
    (1-(4000-2300)/8000),"Single combined pause shift; no double-count");
  assert.equal(interruption.breathing.playCount,1);
  assert.equal(interruption.owner.pauses,1);

  const stillOpen=fixture();
  stillOpen.api.openLearnMenu();
  stillOpen.handler({active:false});
  stillOpen.handler({active:true});
  stillOpen.now=8100;
  assert.equal(stillOpen.owner.acknowledge(),true);
  assert.equal(stillOpen.api.getMenuPaused(),true);
  assert(stillOpen.classes.has("learn-hide-native-paused"),
    "Let's go cannot resume through an intentionally still-open menu");
  assert.equal(stillOpen.breathing.playCount,0);
  stillOpen.now=9200;
  stillOpen.api.closeLearnMenu();
  assert(!stillOpen.classes.has("learn-hide-native-paused"));
  assert.equal(stillOpen.breathing.playCount,1);
  assert.equal(stillOpen.api.getPausedAt(),0);

  const web=fixture(false);
  assert.equal(web.handler,undefined);
  web.api.openLearnMenu();
  assert.equal(web.api.getMenuPaused(),true,
    "Ordinary in-app pause also works on Web/PWA/Android");
  web.api.closeLearnMenu();
  assert.equal(web.owner.pauses,0);
  assert.equal(web.api.getMenuPaused(),false);
  console.log("R04 follow-up PASS: real Menu pauses Missing Words timer, CSS/WAAPI and transitions; Close restores exact phase without Welcome Back; Menu+UIKit never double-resumes; native and Web isolation.");
})().catch(e=>{console.error(e);process.exitCode=1;});
