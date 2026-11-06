"use strict";
// Verse Launch menu pause: execute actual game callbacks/loops in a deterministic
// Node harness. This does not replace touch/animation checks on a real iPhone.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.resolve(__dirname, "../verse_games/verse_launch/game.js"), "utf8");
let checks = 0;
function eq(a,b,msg) { assert.equal(a,b,msg); checks++; }
function ok(a,msg) { assert.ok(a,msg); checks++; }
function extract(start,end) {
  const a = source.indexOf(start), b = source.indexOf(end,a + start.length);
  assert.ok(a >= 0 && b > a, "Missing Verse Launch source boundary: " + start);
  return source.slice(a,b);
}
function makeHarness() {
  let wall = 1000, pauseStart = 0, pausedFor = 0, paused = false;
  const clock = {
    now: () => (paused ? pauseStart : wall) - pausedFor,
    pause() { if (!paused) { paused = true; pauseStart = wall; } },
    resume() { if (paused) { pausedFor += wall - pauseStart; paused = false; } },
    get paused() { return paused; },
    advance(ms) { wall += ms; }
  };
  const state = {
    screen:"game",bonusReady:false,menuOpen:false,helpOpen:false,
    speedMenuOpen:false,helpBackMode:false,busy:false,completed:false,
    conveyorRaf:0,conveyorLastTs:0,conveyorItems:[{id:"word",x:220,width:50}],
    astroRaf:0,astroLastTs:0,astroRunning:true,astroTimerMs:1400,astroMoveDir:0
  };
  const raf = new Map(), cancelled = [], calls = [];
  let id = 0, menuCallbacks = null, speedCallbacks = null;
  const menuEl = {
    classList: { add(s){calls.push("menu-class+"+s);},remove(s){calls.push("menu-class-"+s);} },
    setAttribute(key,val){calls.push("menu-"+key+":"+val);}
  };
  const document = {
    hidden:false,
    body:{classList:{add(){},remove(){}}},
    querySelector(sel){return sel==="#vlGameMenuOverlay"?menuEl:null;},
    querySelectorAll(){return []},
    getElementById(){return null}
  };
  const window = {
    VerseGameShell: {
      wireGameMenu(cfg) { menuCallbacks = cfg; },
      wireSpeedMenu(cfg) { speedCallbacks = cfg; },
      openHelp() { calls.push("help-open"); }
    },
    VerseGameBridge: { exitGame(){calls.push("exit");} },
    BibloZooWelcomeBackReturn: {
      resumeAudioOnGesture(){return Promise.resolve(true);}
    }
  };
  const code = [
    "let returnPaused=false,returnSession=0,returnRecoveryFailures=0,returnContextReplacements=0;",
    "let returnConveyorWasRunning=false,returnAstroWasRunning=false;",
    "let audioForegroundFreshContextOnGesture=false,audioUnlocked=false,audioCtx=null,muted=false;",
    "const gameNow=()=>welcomeClock.now();",
    "const $=s=>document.querySelector(s);",
    "function playUiTapSound(){calls.push('tap');}",
    "function prevChoice(){} function nextChoice(){} function handleLaunch(){}",
    "function setScreen(screen){state.screen=screen;stopConveyorLoop();calls.push('screen:'+screen);}",
    "function stopAstroLoop(){state.astroRunning=false;state.astroRaf=0;calls.push('astro-stop');}",
    "function resetAstroInput(){state.astroMoveDir=0;}",
    "function suspendWelcomeAnimations(){} function restoreWelcomeAnimations(){}",
    "function conveyorSpeedPxPerSec(){return 100;}",
    "function conveyorShipTopWidthPx(){return 20;}",
    "function updateConveyorItemDom(){}",
    "function maybeSpawnConveyorItems(){calls.push('spawn');}",
    "function randomConveyorCorrectDelay(){return 2;}",
    "function getAstroDomRefs(){return {stage:{getBoundingClientRect(){return {width:320,height:600};}}};}",
    "function startBonusSequence(){}",
    extract("function syncGameClockPause() {","function renderCountdownOverlay() {"),
    extract("function conveyorTick(ts) {","function updateBuildDisplay() {"),
    extract("function wireGameScreen() {","function wireAstroControls() {"),
    extract("function astroTick(ts) {","function startAstroLoop() {"),
    extract("function pauseForTaskSwitch() {","window.BibloZooWelcomeBackReturn?.attach?.({"),
    "this.api={wireGameScreen,wireBonusMenuOnly,startConveyorLoop,stopConveyorLoop,",
    "conveyorTick,astroTick,pauseForTaskSwitch,continueFromWelcomeBack,",
    "getReturnPaused:()=>returnPaused};"
  ].join("\n");
  const box = {
    state, window, document, welcomeClock: clock, Promise, calls,
    console, setTimeout(){return 1},clearTimeout(){},
    requestAnimationFrame(fn){const key=++id;raf.set(key,fn);return key;},
    cancelAnimationFrame(key){cancelled.push(key);raf.delete(key);}
  };
  vm.createContext(box); vm.runInContext(code,box);
  return {
    state,clock,calls,raf,cancelled,document,api:box.api,
    menu:()=>menuCallbacks,speed:()=>speedCallbacks,
    tickConveyor(){const key=state.conveyorRaf;const fn=raf.get(key);
      ok(!!fn,"conveyor frame scheduled");raf.delete(key);fn(clock.now());},
    tickAstro(){const key=state.astroRaf;const fn=raf.get(key);
      ok(!!fn,"asteroid frame scheduled");raf.delete(key);fn(clock.now());}
  };
}
async function mainMenuPausesAndResumesConveyor() {
  const h=makeHarness();h.api.wireGameScreen();
  h.api.startConveyorLoop();h.clock.advance(50);h.tickConveyor();
  h.clock.advance(80);h.tickConveyor();
  const before=h.state.conveyorItems[0].x;
  ok(before<220,"conveyor genuinely runs before opening menu");
  const t=h.clock.now();
  h.menu().onOpen();
  eq(h.state.menuOpen,true,"menu open tracked");
  eq(h.state.conveyorRaf,0,"menu cancels conveyor animation");
  eq(h.clock.paused,true,"menu freezes virtual gameplay clock");
  h.clock.advance(120000);
  eq(h.clock.now(),t,"menu time does not count toward game time");
  eq(h.state.conveyorItems[0].x,before,"word position held throughout menu");
  h.api.startConveyorLoop();
  eq(h.state.conveyorRaf,0,"render cannot restart conveyor behind menu");
  h.menu().onClose();
  eq(h.clock.paused,false,"closing menu resumes clock");
  ok(h.state.conveyorRaf>0,"conveyor restarts on close");
  h.clock.advance(40);h.tickConveyor();
  eq(h.state.conveyorItems[0].x,before,"first resume frame has no time jump");
  h.clock.advance(40);h.tickConveyor();
  ok(h.state.conveyorItems[0].x<before,"subsequent frame moves normally");
}
async function helpAndSpeedRetainPause() {
  const h=makeHarness();h.api.wireGameScreen();
  h.api.startConveyorLoop();
  h.menu().onOpen();
  h.menu().onHowToPlay();
  eq(h.state.menuOpen,false,"How to Play hides game menu");
  eq(h.state.helpOpen,true,"Help state visible");
  eq(h.clock.paused,true,"Help preserves pause");
  eq(h.state.conveyorRaf,0,"Help cannot restart conveyor");
  h.menu().onBackFromHelp();
  eq(h.state.menuOpen,true,"Back returns to menu");
  eq(h.clock.paused,true,"Back from Help does not resume game");
  h.menu().onClose();
  eq(h.clock.paused,false,"final Close resumes gameplay");
  h.speed().onOpen();
  eq(h.state.speedMenuOpen,true,"speed overlay marks pause owner");
  eq(h.clock.paused,true,"speed menu freezes virtual time");
  eq(h.state.conveyorRaf,0,"speed menu stops conveyor");
  h.clock.advance(10000);
  h.speed().onClose();
  eq(h.clock.paused,false,"speed Close resumes time");
  ok(h.state.conveyorRaf>0,"speed Close restores conveyor");
  // A stale Speed Menu close must not restart beneath an open Game Menu.
  h.menu().onOpen();
  h.speed().onClose();
  eq(h.clock.paused,true,"closing speed cannot override Game Menu pause");
  eq(h.state.conveyorRaf,0,"closing speed cannot start hidden conveyor");
}
async function bonusMenuPausesClockAndPhysics() {
  const h=makeHarness();h.state.screen="asteroids";h.api.wireBonusMenuOnly();
  h.state.astroRaf=1;h.raf.set(1,h.api.astroTick);
  h.clock.advance(50);h.tickAstro();
  const last=h.state.astroTimerMs, now=h.clock.now();
  h.menu().onOpen();
  eq(h.state.menuOpen,true,"bonus Menu opens");
  eq(h.clock.paused,true,"bonus Menu pauses virtual clock");
  h.clock.advance(30000);
  h.tickAstro();
  eq(h.state.astroTimerMs,last,"bonus survival timer freezes in menu");
  eq(h.clock.now(),now,"bonus elapsed game time freezes");
  h.menu().onHowToPlay();
  eq(h.state.helpOpen,true,"bonus Help opens");
  eq(h.clock.paused,true,"bonus Help stays paused");
  h.tickAstro();
  eq(h.state.astroTimerMs,last,"bonus physics remains paused during Help");
  h.menu().onBackFromHelp();
  eq(h.clock.paused,true,"bonus Back retains pause");
  h.menu().onClose();
  eq(h.clock.paused,false,"closing bonus Menu resumes clock");
}
async function taskSwitchDoesNotGetOverriddenByMenuClose() {
  const h=makeHarness();h.api.wireGameScreen();h.api.startConveyorLoop();
  h.menu().onOpen();
  h.api.pauseForTaskSwitch();
  eq(h.api.getReturnPaused(),true,"task-switch pause owned separately");
  h.menu().onClose();
  eq(h.clock.paused,true,"menu Close cannot resume a task-switch pause");
  eq(h.state.conveyorRaf,0,"no restarted conveyor during Welcome Back");
  const restored=await h.api.continueFromWelcomeBack();
  eq(restored,true,"Welcome Back can complete from genuine owner callback");
  eq(h.clock.paused,false,"clock resumes when final pause owner clears");
  // If the menu remains open when returning, only its Close unpauses.
  h.menu().onOpen();
  h.api.pauseForTaskSwitch();
  const stillMenu=await h.api.continueFromWelcomeBack();
  eq(stillMenu,true,"return can finish while menu is open");
  eq(h.clock.paused,true,"open menu remains the pause owner after Welcome Back");
  h.menu().onClose();
  eq(h.clock.paused,false,"closing remaining menu resumes gameplay");
}
function sourceContracts() {
  ok(source.includes("if (returnPaused || state.menuOpen || state.helpOpen || state.speedMenuOpen ||"),
    "conveyor tick rejects all pause owners");
  ok(source.includes("if (state.menuOpen || state.helpOpen) {"),
    "bonus asteroid tick checks menu and Help");
  ok(source.includes("state.astroTimerMs += dtMs;"),"bonus timer advances only during physics frames");
  ok(source.includes("const sleep = (ms) => welcomeClock.sleep(ms);"),
    "bonus deferred animations use pause-aware clock");
}
(async()=>{
  await mainMenuPausesAndResumesConveyor();
  await helpAndSpeedRetainPause();
  await bonusMenuPausesClockAndPhysics();
  await taskSwitchDoesNotGetOverriddenByMenuClose();
  sourceContracts();
  console.log("Verse Launch menu pause validation passed ("+checks+" checks).");
})().catch(err=>{console.error(err);process.exitCode=1;});
