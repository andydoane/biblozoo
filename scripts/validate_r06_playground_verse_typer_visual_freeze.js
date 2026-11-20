#!/usr/bin/env node
"use strict";
/* R06 / PLAY-01: execute production Verse Typer UIKit->Welcome Back owner,
 * existing virtual gameplay timers and new CSS/WAAPI freeze controller
 * under a held App Switcher (WebKit still visible). Node/VM is NOT
 * physical-iPhone compositor or Xcode SDK verification.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const src=read("verse_playground/verse_typer/game.js");
const css=read("verse_playground/verse_typer/game.css");
const native=read("verse_games/shared/native-verse-typer-audio.js");
const shell=read("verse_games/shared/game-shell.js");
const clock=read("verse_games/shared/welcome-back-clock.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
for(const s of [src,native,shell,clock])new vm.Script(s);
assert(src.includes("onAppInactive:()=>{") &&
  src.includes("playgroundWelcome?.pauseFromNativeInactive?.()") &&
  src.includes("onAppActive:()=>playgroundWelcome?.showAfterNativeActive?.()"),
  "Existing native callback must pass real UIKit inactive into shared Welcome Back");
assert(native.includes('addListener?.("biblozooAppLifecycle", event =>') &&
  native.includes("if (event?.active === false)") &&
  native.includes("onInactive?.()") && native.includes("onActive?.()"),
  "Native adapter sends UIKit event even when WKWebView remains visible");
assert(shell.includes("options.onPause?.()") &&
  shell.includes("const resumed = await options.onResume?.()") &&
  shell.includes("if (!ok) return false"),
  "One existing Welcome Back owner retains failed-recovery gate");
assert(src.includes("onPause: pauseTyperForReturn") &&
  src.includes("onResume: continueTyperAfterReturn"));
assert(src.includes("if (state.screen !== \"game\" || returnPaused || state.paused ||") &&
  src.includes("if (!returnPaused && typerNow() >= deadline)"),
  "Input and delayed game callbacks must be return-gated");
assert(src.includes("if (returnPaused || document.hidden) return;") &&
  src.includes("trackedTimeout(() => prepareTravelAnimation(animationState, item), 0)"),
  "Queued caterpillar RAF cannot begin unseen entrance or position changes");
assert(css.includes("html.vt-return-visual-paused #app *::before") &&
       css.includes("html.vt-return-visual-paused #app *::after") &&
       css.includes("animation-play-state: paused !important"),
  "WebKit compositor must pause head/segments/rainbow/pseudo keyframes");
for(const name of ["vt-tail-color-pulse-yellow","vt-tail-color-pulse-orange",
  "vt-tail-color-pulse-red","vt-tail-rainbow","vt-ripple-wiggle",
  "vt-crawl-in","vt-crawl-out","vt-sparkle","vt-butterfly-fly-away"])
  assert(css.includes(name),"Unchanged original animation remains "+name);
assert(workflow.includes("node scripts/validate_r06_playground_verse_typer_visual_freeze.js"));
for(const p of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
  "docs/IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md",
  "docs/IOS-OWNER-AUDIO-FINDINGS-2026-11-17.md"])
  assert(read(p).includes("R06"),"PR documentation must include "+p);

function block(start,end) {
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0 && b>a,"R06 actual game source not found: "+start);
  return src.slice(a,b);
}
const actual=[
  block("  if(nativeTyperAudio){\n    nativeTyperAudio.configure(","  function clearTrackedTimeout("),
  block("  function clearTrackedTimeout(","  const sleep ="),
  block("  function scheduleCaterpillarPositionUpdate(","  function updateTravelDistances("),
  block("  let pausedTyperAnimations = [];","  function setScreen(")
].join("\n");
new vm.Script(actual);

function fixture({native=true, muted=false}={}) {
  let wall=4000,elapsedPause=0,pausedAt=0,clockPaused=false;
  let opts=null,shown=0,stop=0,freezeCount=0,crawlCount=0;
  const scheduled=new Map(),frames=[],classes=new Set();
  let nextId=0;
  const sleeper={
    now(){return (clockPaused?pausedAt:wall)-elapsedPause;},
    pause(){if(clockPaused)return;pausedAt=wall;clockPaused=true;},
    resume(){if(!clockPaused)return;elapsedPause+=Math.max(0,wall-pausedAt);clockPaused=false;},
    isPaused(){return clockPaused;}
  };
  function animation(name,running=true) {
    return {name,currentTime:213,playState:running?"running":"paused",
      pauseCalls:0,playCalls:0,
      pause(){this.pauseCalls++;this.playState="paused";},
      play(){this.playCalls++;this.playState="running";}
    };
  }
  const tail=animation("tail"),head=animation("head"),
    travel=animation("CSS transition"),authorPaused=animation("author-paused",false);
  const all=[tail,head,travel,authorPaused],calls=[];
  const app={
    getAnimations({subtree}) {
      assert.equal(subtree,true);
      freezeCount++;
      return all;
    }
  };
  const travelLayer={
    offsetWidth:100,
    classList:{add(...items){crawlCount++;calls.push("crawl:"+items.join(","));}}
  };
  const document={
    hidden:false,
    documentElement:{classList:{
      add(s){classes.add(s);},remove(s){classes.delete(s);}
    }},
    getElementById(id){return id==="vtTravelLayer"?travelLayer:null;}
  };
  const item={kind:"book",value:"Mark"};
  const state={
    screen:"game",runToken:1,currentItem:item,paused:false,
    correctLetters:8,typos:1,streak:3,currentWordIndex:1,
    sleepIds:[],completed:false
  };
  const nativeTyperAudio={
    ready:!native,
    isReady(){return this.ready;},
    stop(){stop++;return Promise.resolve();},
    configure(o){opts=o;}
  };
  const context={
    window:{},document,app,state,nativeTyperAudio,
    muted,returnPaused:false,wasPausedBeforeReturn:false,
    nativeTyperPending:false,nativeTyperFailure:false,
    playgroundWelcome:null,
    welcomeClock:sleeper,nativeHoldTotal:0,nativeHoldStarted:0,
    scheduledActions:new Map(),nextScheduledId:0,
    currentItem:item,
    typerNow(){return sleeper.now();},
    finishNativeHold(){},
    beginNativeHold(){},
    stopNativeTyperRound(){},
    showNativeTyperFailure(){},
    requestAnimationFrame(fn){frames.push(fn);return frames.length;},
    setTimeout(fn,ms){
      const id=++nextId;
      scheduled.set(id,{fn,when:wall+Math.max(0,Number(ms)||0)});
      return id;
    },
    clearTimeout(id){scheduled.delete(id);},
    updateCaterpillarPosition(){calls.push("position");},
    updateTravelDistances(){calls.push("distances");},
    startRippleDelayLoop(){calls.push("ripple");},
    stopCrawlVisual(){calls.push("stop-crawl");},
    // Use actual game's fixed 830ms enter crawl and 1000ms exit
    // constants in this isolated VM (its source slice excludes declarations).
    ENTER_CRAWL_STOP_MS:830,EXIT_DONE_MS:1000,
    performance:{now:()=>wall}
  };
  vm.runInNewContext(actual+
    ";window.__r06={pauseTyperForReturn,continueTyperAfterReturn,"+
    "trackedTimeout,freezeTyperVisualsForReturn,thawTyperVisualsAfterReturn,"+
    "scheduleCaterpillarPositionUpdate,prepareTravelAnimation,"+
    "isPaused:()=>returnPaused,visualFrozen:()=>typerVisualsFrozen};",
    context,{filename:"production verse_typer/game.js source"});
  const api=context.window.__r06;
  context.playgroundWelcome={
    pauseFromNativeInactive(){api.pauseTyperForReturn();return true;},
    showAfterNativeActive(){shown++;return true;}
  };
  function framesNow() {
    const current=frames.splice(0);
    current.forEach(fn=>fn());
  }
  function advance(ms) {
    const target=wall+ms;
    for(let count=0;count<1200;count++){
      const due=[...scheduled].filter(([,j])=>j.when<=target)
        .sort((a,b)=>a[1].when-b[1].when)[0];
      if(!due)break;
      const [id,job]=due;
      scheduled.delete(id);
      wall=Math.max(wall,job.when);
      job.fn();
      if(count===1199)throw Error("R06 timer spin");
    }
    wall=target;
  }
  return {api,context,state,item,document,classes,all,tail,head,travel,
    authorPaused,opts,calls,framesNow,advance,
    get wall(){return wall;},get shown(){return shown;},
    get stops(){return stop;},get crawl(){return crawlCount;},
    get captures(){return freezeCount;},get clockPaused(){return sleeper.isPaused();}};
}

function run() {
  const f=fixture();
  assert(f.opts,"Native Verse Typer owner configured");
  let fired=0;
  f.api.trackedTimeout(()=>fired++,600);
  f.advance(160);
  assert.equal(fired,0);
  const before={...f.state};
  // A position RAF can already be queued before native willResignActive.
  f.api.scheduleCaterpillarPositionUpdate();
  f.opts.onAppInactive(); // actual game native callback; WebKit still visible
  f.opts.onAppInactive(); // duplicate UIKit inactive
  assert.equal(f.document.hidden,false);
  assert.equal(f.api.isPaused(),true);
  assert.equal(f.clockPaused,true);
  assert.equal(f.captures,1,"Capture only original running animation frames");
  assert.equal(f.tail.pauseCalls,1);
  assert.equal(f.head.pauseCalls,1);
  assert.equal(f.travel.pauseCalls,1,"CSS transition also frozen, not only keyframe");
  assert.equal(f.authorPaused.pauseCalls,0,"Don't change authored-paused timeline");
  assert(f.classes.has("vt-return-visual-paused"),
    "Scoped class freezes animations painted after WAAPI capture");
  f.framesNow();
  assert(!f.calls.includes("position"),"Queued position RAF cannot move in thumbnail");
  f.api.prepareTravelAnimation("enter",f.item);
  f.framesNow();
  assert.equal(f.crawl,0,"Queued entrance never begins in the held switcher");
  f.advance(13500);
  assert.equal(fired,0,"Tracked gameplay deadline cannot expire while UIKit inactive");
  assert.equal(f.state.currentWordIndex,before.currentWordIndex);
  assert.equal(f.state.correctLetters,before.correctLetters);
  assert.equal(f.state.typos,before.typos);
  assert.equal(f.state.streak,before.streak);
  assert.equal(f.state.completed,false,"No grade/reward while inactive");
  assert.deepEqual([f.tail.currentTime,f.head.currentTime,f.travel.currentTime],[213,213,213],
    "Animations preserve exact player currentTime, no resetting to zero");
  f.opts.onAppActive(); // only Welcome Back, no auto resume
  assert.equal(f.shown,1);
  assert.equal(f.api.isPaused(),true);
  assert.equal(f.tail.playCalls,0);
  assert.equal(f.crawl,0);
  assert.equal(f.api.continueTyperAfterReturn(),false,
    "Refused Swift readiness retains the existing Welcome Back");
  assert.equal(f.api.isPaused(),true);
  assert(f.classes.has("vt-return-visual-paused"));
  assert.equal(f.tail.playCalls,0,"Denied native recovery doesn't thaw visual frames");
  f.context.nativeTyperAudio.ready=true; // child tapped Let's go and native prepare succeeded
  assert.equal(f.api.continueTyperAfterReturn(),true);
  assert.equal(f.api.isPaused(),false);
  assert.equal(f.clockPaused,false);
  assert(!f.classes.has("vt-return-visual-paused"));
  assert.equal(f.tail.playCalls,1);
  assert.equal(f.head.playCalls,1);
  assert.equal(f.travel.playCalls,1);
  assert.equal(f.authorPaused.playCalls,0,"Never unpause unrelated authored-paused visual");
  assert.equal(f.tail.currentTime,213,"WAAPI resume continues frozen original frame");
  f.framesNow();
  assert(f.calls.includes("position"),"Game layout refresh after recovery");
  // Re-queued travel RAF starts only after a real Let's go, not before.
  f.advance(81);f.framesNow();
  assert.equal(f.crawl,1,"Deferred entrance starts on active gameplay");
  f.advance(300);
  assert.equal(fired,0,"Original timer must retain remaining active duration");
  f.advance(170);
  assert.equal(fired,1,"Original timeout fires once after remaining active time");
  f.advance(1000);
  assert.equal(fired,1,"No hidden second scheduled award/word advancement");

  const second=fixture();
  second.opts.onAppInactive();
  second.opts.onAppActive();
  second.context.nativeTyperAudio.ready=true;
  assert.equal(second.api.continueTyperAfterReturn(),true);
  second.opts.onAppInactive();
  assert.equal(second.tail.pauseCalls,2,"Second real switcher interruption freezes new frame");
  assert.equal(second.api.isPaused(),true);
  second.context.nativeTyperAudio.ready=true;
  assert.equal(second.api.continueTyperAfterReturn(),true);
  assert.equal(second.tail.playCalls,2);

  const browser=fixture({native:false});
  browser.opts.onAppInactive();
  assert.equal(browser.api.isPaused(),true,
    "The existing non-native visibility Welcome Back also pauses visuals");
  browser.context.nativeTyperAudio.ready=true;
  assert.equal(browser.api.continueTyperAfterReturn(),true);
  assert.equal(browser.tail.playCalls,1);

  const idle=fixture();
  idle.state.screen="mode";
  idle.opts.onAppInactive();
  assert.equal(idle.api.isPaused(),false,"Mode/intro does not enter game Welcome Back");
  assert.equal(idle.captures,0,"No game animation pause outside active gameplay");

  console.log("R06 PASS: actual Verse Typer lifecycle and clock freeze while WebKit visible; CSS/WAAPI head/rainbow/travel frames retained through 13.5s, no ghost timer/credit, one real gesture and ready-native gate required, repeat/legacy visibility isolation.");
}
run();
