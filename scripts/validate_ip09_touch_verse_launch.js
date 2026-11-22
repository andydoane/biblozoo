#!/usr/bin/env node
"use strict";
// IP09 exercises production Verse Launch chooser, permission, cutscene and
// pointer handlers using fake DOM/gestures. Apple touch-magnifier and actual
// sensor behavior still require the owner's physical iPad/iPhone check.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const dir = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(dir,"verse_games/verse_launch/game.js"),"utf8");
const css = fs.readFileSync(path.join(dir,"verse_games/verse_launch/game.css"),"utf8");
const feed = fs.readFileSync(path.join(dir,"daily_questions_feed_game.js"),"utf8");
const feedCss = fs.readFileSync(path.join(dir,"daily_questions_feed_game.css"),"utf8");
const feedImages = ["dq_feed_control_tilt.png","dq_feed_control_drag.png"];
function part(src,start,end) {
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a, "source markers: "+start);
  return src.slice(a,b);
}
assert.match(game,/Tilt your device or drag your finger to dodge asteroids\./);
assert.doesNotMatch(part(game,"async function handleLaunch(choiceId) {","function setScreen(screen) {"),
  /await requestAstroTiltPermission\(\)/,
  "no motion permission asked on LAUNCH");
assert.match(game,/state\.astroControlPhase = isLikelyTouchDevice\(\) \? "choose" : "playing";[\s\S]*setScreen\("asteroids"\);[\s\S]*if \(state\.astroControlPhase === "playing"\) startAstroLoop\(\)/);
assert.match(game,/startAstroLoop\(\)/);
for(const name of feedImages) {
  assert.ok(fs.existsSync(path.join(dir,"verse_images/daily_questions",name)), "actual Feeding icon "+name);
  assert.ok(game.includes("../../verse_images/daily_questions/"+name), "uses same Feeding UI art");
  assert.ok(feed.includes(name), "original Feeding art unchanged");
}
assert.match(css,/\.vl-steering-overlay\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*40;/s);
assert.match(css,/\.vl-space-controls\[hidden\]/);
assert.match(game,/\$\{renderAstroSteeringChoice\(\)\}\s*\$\{renderHelpOverlay\(\)\}/,
  "control chooser is sibling to the nonselectable asteroid stage, not within it");
assert.match(css,/\.vl-steering-option:focus-visible/);
assert.match(css,/#vlAstroStage\s*\{[^}]*touch-action:\s*none;[^}]*-webkit-touch-callout:\s*none;/s);
assert.match(feedCss,/\.daily-feed-game\[data-daily-feed-mode="bounce"\] \.daily-feed-stage/);
assert.match(feedCss,/\.daily-feed-game\[data-daily-feed-mode="bounce"\] \.daily-feed-catcher/);
assert.match(feedCss,/-webkit-touch-callout:\s*none;/);
assert.match(feed,/stage\.addEventListener\("contextmenu", preventBouncePlayfieldCallout\)/);
assert.match(feed,/stage\.addEventListener\("selectstart", preventBouncePlayfieldCallout\)/);
assert.ok(!feedCss.includes(".daily-feed-start-card {\n  -webkit-user-select: none"),
  "control dialog text is not globally disabled by IP09");
assert.match(feed,/if \(mode === FEED_MODES\.BOUNCE\) \{\s*const preventBouncePlayfieldCallout/);

const nativeGate=part(game,"function primeNativeLaunchFromGesture(","if (nativeLaunchAudio) {");
assert.match(nativeGate,/prepareFromGesture/);
assert.match(game,/launchWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/function syncGameClockPause\(\)/);

function harness({touch=true,sensor=true,permission="granted"}={}) {
  let dialog=null,started=0,permissionCalls=0,visualMoves=0,rendered="",sleeps=0;
  const stage={
    captures:[],released:[],
    getBoundingClientRect:()=>({left:100,top:20,width:400,height:600}),
    setPointerCapture(id){this.captures.push(id);},
    releasePointerCapture(id){this.released.push(id);}
  };
  const arrows={hidden:false};
  // Chooser lives OUTSIDE the touch-suppressed game stage so the control
  // buttons and explanatory copy retain normal accessibility/callouts.
  const screen={insertAdjacentHTML(_,html){rendered=html;dialog=makeDialog();}};
  function makeDialog() {
    return {
      remove(){dialog=null;},
      querySelectorAll(sel) {
        if(sel!=="[data-vl-steering]")return [];
        return ["tilt","drag"].map(v=>({dataset:{vlSteering:v}}));
      }
    };
  }
  const state={
    screen:"asteroids",astroControlPhase:"choose",astroControlMessage:"",
    astroControlPending:false,menuOpen:false,helpOpen:false,completed:false,
    astroRunning:false,astroMoonPhase:false,astroPlayerX:.5,astroMoveDir:0
  };
  const astroInput={
    controlMode:null,tiltEnabled:false,tiltPermissionState:"unknown",
    leftKey:false,rightKey:false,pointerDir:0,tiltRawDir:0,tiltDir:0,
    dragging:false,dragPointerId:null
  };
  const Orientation=function(){};
  Orientation.requestPermission=()=>{permissionCalls++;return Promise.resolve(permission)};
  const window={DeviceOrientationEvent:sensor?Orientation:undefined,
    matchMedia:q=>({matches:touch&&q==="(pointer: coarse)"}),
    innerHeight:800};
  const document={hidden:false,
    querySelector:sel=>sel==="#vlAstroStage"?stage:
      sel===".vl-asteroid-screen"?screen:sel==="#vlArrowControls"?arrows:
      sel==="#vlSteeringOverlay"?dialog:
      sel==="#vlSteeringConfirm"&&state.astroControlPhase==="instructions"?{onclick:null}:null};
  const jq=sel=>document.querySelector(sel);
  const ctx={state,astroInput,window,document,navigator:{maxTouchPoints:touch?5:0},
    DeviceOrientationEvent:sensor?Orientation:undefined,
    console,escapeHtml:text=>String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;"),
    startAstroLoop(){started++;state.astroRunning=true;},
    renderAstroEntities(){visualMoves++;},returnPaused:false,
    nativeLaunchPending:false,nativeLaunchFailure:false,requestAnimationFrame:()=>1,
    gameNow:()=>1000};
  // $ must be a same-realm function, not an unbound object shorthand.
  ctx.$=jq;
  const src=part(game,"function safeLeftPct(x) {","function bonusTravelInstructionHtml() {")+
    part(game,"async function requestAstroTiltPermission() {","function astroKeyboardDirForKey(key) {")+
    part(game,"function renderAstroSteeringChoice() {","function wireAstroControls() {")+
    "\nthis.ip09={showAstroSteeringChoice,showAstroSteeringInstructions,chooseAstroSteering,"+
    "confirmAstroSteering,wireAstroDragControls,canUseAstroControls,handleAstroOrientation,"+
    "renderAstroSteeringChoice,resetAstroInput};";
  // Context stub uses binding for $ as document selector.
  delete ctx.$;
  ctx.$=jq;
  vm.createContext(ctx);vm.runInContext(src,ctx);
  return {ctx,state,astroInput,stage,arrows,api:ctx.ip09,
    get started(){return started;},get permissionCalls(){return permissionCalls;},
    get html(){return rendered;},get moves(){return visualMoves;}};
}
function event(x,id=4,button=false) {
  let prevented=0;
  const e={clientX:x,pointerId:id,target:{closest:()=>button?{tagName:"BUTTON"}:null},
    preventDefault(){prevented++;}};
  Object.defineProperty(e,"prevented",{get:()=>prevented});
  return e;
}
async function steeringCases() {
  const drag=harness();
  assert.match(drag.api.renderAstroSteeringChoice(),/Choose Controls/);
  assert.match(drag.api.renderAstroSteeringChoice(),/data-vl-steering="tilt"/);
  assert.match(drag.api.renderAstroSteeringChoice(),/data-vl-steering="drag"/);
  drag.api.showAstroSteeringChoice();
  await drag.api.chooseAstroSteering("drag");
  assert.equal(drag.state.astroControlPhase,"instructions");
  assert.equal(drag.astroInput.controlMode,"drag");
  assert.equal(drag.arrows.hidden,false,"Drag can retain arrow accessibility fallback");
  assert.equal(drag.permissionCalls,0);
  assert.match(drag.html,/Drag your finger to dodge asteroids/);
  assert.match(drag.html,/Got It!/);
  assert.equal(drag.started,0,"no asteroid time before Got It");
  drag.api.confirmAstroSteering();
  assert.equal(drag.started,1);
  assert.equal(drag.state.astroControlPhase,"playing");
  assert.equal(drag.api.canUseAstroControls(),true);
  drag.api.confirmAstroSteering();
  assert.equal(drag.started,1,"double tap cannot start twice");
  drag.api.wireAstroDragControls();
  const button=event(430,1,true);
  drag.stage.onpointerdown(button);
  assert.equal(drag.state.astroPlayerX,.5,"arrow/menu button must not steal drag");
  let down=event(500,7);drag.stage.onpointerdown(down);
  assert.equal(down.prevented,1);
  assert.equal(drag.state.astroPlayerX,.92,"right bound remains 92%");
  assert.deepEqual(drag.stage.captures,[7]);
  let wrong=event(100,8);drag.stage.onpointermove(wrong);
  assert.equal(drag.state.astroPlayerX,.92,"other touches cannot hijack pointer");
  let move=event(-30,7);drag.stage.onpointermove(move);
  assert.equal(drag.state.astroPlayerX,.08,"left bound remains 8%");
  assert.ok(drag.moves>=2,"drag updates rocket position");
  drag.stage.onpointerup(event(-30,7));
  assert.equal(drag.astroInput.dragging,false);
  assert.deepEqual(drag.stage.released,[7]);
  move=event(340,7);drag.stage.onpointermove(move);
  assert.equal(drag.state.astroPlayerX,.08,"released finger no longer moves rocket");
  drag.stage.onpointerdown(event(275,10));
  drag.state.menuOpen=true;
  assert.equal(drag.api.canUseAstroControls(),false,"menu blocks steering");
  drag.state.menuOpen=false;drag.ctx.returnPaused=true;
  assert.equal(drag.api.canUseAstroControls(),false,"Welcome Back pause blocks steering");
  drag.ctx.returnPaused=false;drag.ctx.document.hidden=true;
  assert.equal(drag.api.canUseAstroControls(),false,"hidden app blocks steering");
  drag.ctx.document.hidden=false;
  drag.api.resetAstroInput();
  assert.equal(drag.astroInput.dragging,false);
  assert.equal(drag.astroInput.dragPointerId,null);

  const tilt=harness();
  tilt.api.showAstroSteeringChoice();
  const pending=tilt.api.chooseAstroSteering("tilt");
  assert.equal(tilt.permissionCalls,1,"motion permission only on deliberate Tilt tap");
  assert.equal(tilt.started,0);
  await pending;
  assert.equal(tilt.astroInput.controlMode,"tilt");
  assert.equal(tilt.astroInput.tiltEnabled,true);
  assert.equal(tilt.arrows.hidden,true,"Tilt hides pointer arrows after chooser");
  assert.equal(tilt.state.astroControlPhase,"instructions");
  tilt.api.confirmAstroSteering();
  assert.equal(tilt.started,1);
  tilt.api.handleAstroOrientation({gamma:22});
  assert.ok(tilt.state.astroMoveDir>0,"device orientation moves with Tilt chosen");

  const denied=harness({permission:"denied"});
  denied.api.showAstroSteeringChoice();
  await denied.api.chooseAstroSteering("tilt");
  assert.equal(denied.started,0);
  assert.equal(denied.state.astroControlPhase,"choose");
  assert.match(denied.html,/permission wasn't granted/);
  await denied.api.chooseAstroSteering("drag");
  denied.api.confirmAstroSteering();
  assert.equal(denied.started,1,"Drag recovers after denied Tilt without new permission");

  const unsupported=harness({sensor:false});
  await unsupported.api.chooseAstroSteering("tilt");
  assert.equal(unsupported.permissionCalls,0);
  assert.match(unsupported.html,/isn't available/);
  assert.equal(unsupported.state.astroControlPhase,"choose");
  await unsupported.api.chooseAstroSteering("drag");
  unsupported.api.confirmAstroSteering();
  assert.equal(unsupported.started,1,"unsupported iOS/Web device can choose Drag");

  const interrupted=harness();
  interrupted.api.showAstroSteeringChoice();
  interrupted.ctx.returnPaused=true;
  await interrupted.api.chooseAstroSteering("tilt");
  assert.equal(interrupted.permissionCalls,0);
  interrupted.ctx.returnPaused=false;
  await interrupted.api.chooseAstroSteering("drag");
  interrupted.ctx.document.hidden=true;
  interrupted.api.confirmAstroSteering();
  assert.equal(interrupted.started,0,"hidden does not start bonus timer");
  interrupted.ctx.document.hidden=false;
  interrupted.api.confirmAstroSteering();
  assert.equal(interrupted.started,1);

  const desktop=harness({touch:false,sensor:false});
  assert.equal(desktop.ctx.navigator.maxTouchPoints,0);
  assert.equal(desktop.api.canUseAstroControls(),false);
  assert.match(game,/function shouldShowAstroArrowButtons\(\)\s*\{[\s\S]*return !astroInput\.tiltEnabled/);
  assert.match(game,/function handleAstroKeyDown\(event\)/);
  assert.match(game,/function handleAstroKeyUp\(event\)/);
}
async function cutsceneCase(touch) {
  const s={screen:"game",bonusTravelTextVisible:false,bonusFadeActive:false,
    astroControlPhase:"playing",astroControlMessage:""};
  let now=0,started=0,events=[];
  const document={
    querySelector:sel=>sel===".vl-screen-fade"?{classList:{add:()=>events.push("fade")}}:null
  };
  const stageEls={
    "#vlTravelRocketUnit":null,
    "#vlTravelText":{classList:{add:()=>events.push("text")}}
  };
  const ctx={state:s,document,window:{innerHeight:800},
    $:sel=>stageEls[sel]||null,
    sleep:async ms=>{now+=ms;events.push("sleep:"+ms);},
    playGameSound:key=>events.push("sound:"+key),
    setScreen:screen=>{s.screen=screen;events.push("screen:"+screen);},
    startAstroLoop:()=>{started++;events.push("start");},
    isLikelyTouchDevice:()=>touch};
  vm.createContext(ctx);
  vm.runInContext(part(game,"async function startBonusSequence() {",
    "function clearAstroDomCache() {")+"\nthis.run=startBonusSequence;",ctx);
  await ctx.run();
  assert.equal(s.screen,"asteroids");
  assert.ok(events.indexOf("fade")<events.indexOf("screen:asteroids"),
    "cutscene fades before choice/asteroids");
  assert.ok(events.indexOf("sound:cutsceneRocketEnter")<events.indexOf("screen:asteroids"));
  assert.equal(s.astroControlPhase,touch?"choose":"playing");
  assert.equal(started,touch?0:1,"touch waits for chooser; desktop starts with keys");
  assert.ok(now>=4000,"original cutscene still executes full timings");
}
(async()=>{
  await steeringCases();
  await cutsceneCase(true);
  await cutsceneCase(false);
  console.log("IP09 PASS: real Verse Launch cutscene-to-choice timing, Feeding-style two-step popup, gesture-only tilt permission/grant/deny/no-sensor, bounded pointer capture, menu/Welcome/hidden guards, keyboard fallback, exact How to Play and Bounce-only iPadOS callout scope.");
})().catch(err=>{console.error(err);process.exitCode=1;});
