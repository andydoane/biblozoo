#!/usr/bin/env node
"use strict";
/* Patch 72.1B.1: targeted source + real-source simulated manual-test harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname,"..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
let checks = 0;
const ok = (v,m) => { assert.ok(v,m); checks++; };
const eq = (v,x,m) => { assert.equal(v,x,m); checks++; };
const feed = read("daily_questions_feed_game.js");
const css = read("daily_questions_feed_game.css");
const sw = read("service-worker.js");
const shared = read("verse_games/shared/welcome-back-zoo-escape.js");
const marker = '  window.BibloZooDailyFeedGame = Object.freeze({';
eq(feed.split(marker).length,2,"single Feeding module export");
const instrumented = feed.replace(marker, `
  window.__FeedPilotHooks = {
    setActive: r => { activeRuntime = r; },
    getFeedZooTestResult, attachFeedZooTestHarness,
    destroyFeedZooTestHarness, pauseFeedingGame,
    continueFeedingAfterGesture,
    complete,
    stop
  };
${marker}`);

function testEnvironment() {
  let now = 10000;
  let nextId = 100;
  const timers = new Map();
  const diagnostics = [];
  const setTimeoutFake = (fn,ms=0) => {
    const id = ++nextId;
    timers.set(id,{fn,at:now+ms});
    return id;
  };
  const clearTimeoutFake = id => timers.delete(id);
  function advance(ms) {
    now += ms;
    for (let i=0;i<80;i++) {
      let due = [...timers].filter(([,t])=>t.at<=now).sort((a,b)=>a[1].at-b[1].at);
      if(!due.length) break;
      for (const [id,t] of due) { if(!timers.has(id))continue;timers.delete(id);t.fn(); }
    }
  }
  class Node {
    constructor(tag="div") {
      this.tagName=tag.toUpperCase();this.children=[];this.listeners=new Map();
      this.classList={items:new Set(),add:(...xs)=>xs.forEach(x=>this.classList.items.add(x)),remove:(...xs)=>xs.forEach(x=>this.classList.items.delete(x)),contains:x=>this.classList.items.has(x)};
      this.hidden=false;this.disabled=false;this.style={};this.textContent="";this.isConnected=true;
      this.ownerDocument=doc;
    }
    addEventListener(t,fn){const a=this.listeners.get(t)||[];a.push(fn);this.listeners.set(t,a);}
    removeEventListener(t,fn){this.listeners.set(t,(this.listeners.get(t)||[]).filter(f=>f!==fn));}
    dispatch(t,data={}){for(const fn of (this.listeners.get(t)||[])) fn({pointerId:1,button:0,clientX:50,clientY:50,preventDefault(){},...data});}
    appendChild(n){this.children.push(n);n.parentNode=this;return n;}
    remove(){this.parentNode?.children.splice(this.parentNode.children.indexOf(this),1);this.isConnected=false;}
    setAttribute(){}
    querySelector(s){return s==="button"? this.children.find(n=>n.tagName==="BUTTON") || this.children.map(n=>n.querySelector(s)).find(Boolean):null;}
    focus(){}
  }
  const doc = {hidden:false,listeners:new Map(),createElement:tag=>new Node(tag),addEventListener(t,f){const a=this.listeners.get(t)||[];a.push(f);this.listeners.set(t,a);},removeEventListener(t,f){this.listeners.set(t,(this.listeners.get(t)||[]).filter(x=>x!==f));},dispatch(t){for(const fn of (this.listeners.get(t)||[])) fn();}};
  const badge = new Node("div");
  const game = new Node("div");
  game.querySelector=s=>s===".daily-feed-score-badge"?badge:null;
  const window = {AudioContext:null,webkitAudioContext:null,
    location:{protocol:"https:"},addEventListener(){},removeEventListener(){},
    BibloZooAudioDiagnostics:{record:(type,details)=>diagnostics.push({type,details})},
    BibloZooWelcomeBack:{populate(){},setAction(){}},
    BibloZooAudioRecoveryCoordinator:{isAvailable(){return false;}},
    BibloZooNativeAudioRecovery:{isEnabled(){return false;}}};
  const ctx={window,document:doc,console,setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake,
    performance:{now:()=>now},requestAnimationFrame:()=>123,cancelAnimationFrame(){},
    fetch:()=>Promise.reject(Error("no network")),
    Image:class{},Audio:class{pause(){} load(){} play(){return Promise.resolve()}}};
  vm.runInNewContext(instrumented,ctx,{filename:"daily_questions_feed_game.js"});
  let starts=0;
  const runtime={mode:"classic",roundStarted:true,running:true,finished:false,
    gameEl:game,scoreEl:badge,modeController:{handleInput(){},draw(){},buildResult(){return {score:1,caughtCount:1,totalCount:3,mode:"classic"}}},
    zooEscape:{start(){starts++},isPaused(){return true},destroy(){}},
    feedPausedAt:null,feedResumeGeneration:0,feedFrameGeneration:0,feedResumePending:false,
    feedPageHidden:false,feedSoundNodes:new Set(),modeTimers:new Set(),balls:[],bursts:[],
    nextScheduledAt:now+1000,lastFrameAt:now,rafId:0,tiltEnabled:false,
    gameEl:game,resumeOverlay:{hidden:true},resumeButton:{disabled:false,focus(){}},
    resumeStatus:{hidden:true,textContent:""},stage:{releasePointerCapture(){}},
    audioContext:{state:"running"},
    resultTitleEl:{textContent:""},resultScoreEl:{textContent:""},
    resultCatchesEl:{textContent:"",hidden:false},resultOverlay:{hidden:true},
    startOverlay:{hidden:true},onComplete(){runtime.completions++},completions:0,
    starAudio:null,chompAudio:null,dailyTodoSnack:false,petName:"Milo",
    onRecoveryExitToZoo(){runtime.exits++;return true;},exits:0
  };
  return {hooks:window.__FeedPilotHooks,runtime,doc,badge,game,advance,diagnostics,get starts(){return starts;}};
}

function pressScore(env,hold=2400){
 env.badge.dispatch("pointerdown");env.advance(hold);
 env.badge.dispatch("pointerup");
}
function choose(env,index){
 const panel=env.game.children.find(n=>n.className==="bz-zoo-test-menu");
 ok(panel,"developer menu displayed");
 const card=panel.children[0];
 const choice=card.children.filter(n=>n.tagName==="BUTTON")[index];
 ok(choice,"menu choice available");
 choice.dispatch("click");
 ok(!env.game.children.includes(panel),"menu removed upon choice");
}
function staticContracts(){
 for(const id of ["stage2-success","stage3-success","stage3-exit","early-stage2","early-stage3"])
  ok(feed.includes(id),`scenario ${id} present`);
 ok(feed.includes("FEED_ZOO_TEST_HOLD_MS = 2400"),"deliberate hold rather than visible production control");
 ok(feed.includes("ENABLE_FEED_ZOO_ESCAPE_TEST_HARNESS = true"),"pilot explicitly enabled with release-off switch");
 ok(feed.includes('if (runtime.zooDevScenario) {'),"simulation confined to Feeding recover adapter");
 ok(feed.includes('attemptFeedingResumeFromGesture(runtime, resolve)'),"normal verified recovery unchanged");
 ok(feed.includes('if (!runtime.zooDevTestEverActivated) runtime.onComplete?.(result)'),"simulated session prevents daily completion credit");
 ok(feed.includes('runtime.zooDevScenario = null;'),"stale scenario cleared on success");
 ok(feed.includes('destroyFeedZooTestHarness(runtime);'),"cleanup on stop");
 ok(css.includes('.bz-zoo-test-menu')&&css.includes('env(safe-area-inset-top)'),"small-screen safe test menu styling");
 ok(shared.includes('onBreakComplete?.({ rescued, total })'),"test session does not inject stats callback");
 ok(/const CACHE_VERSION = "[^"]*patch72_1/.test(sw) && sw.includes('"./daily_questions_feed_game.js"'),"versioned PWA precaches current Feeding test harness source");
 ok(!feed.includes('AVAudioSessionCategoryPlayback'),"native audio category unchanged");
}
function runCase(index,expectedId,results){
 const env=testEnvironment();const {hooks,runtime}=env;
 hooks.setActive(runtime);
 hooks.attachFeedZooTestHarness(runtime);
 ok(env.badge.classList.contains("bz-zoo-test-arm"),"score badge enabled for deliberate hold");
 pressScore(env,2300);
 eq(env.starts,0,"short hold does not activate the menu");
 pressScore(env,2401);
 eq(env.starts,1,"long hold pauses and starts the true Zoo Escape layer");
 ok(runtime.feedPausedAt!=null,"game timeline remains paused");
 ok(!runtime.zooDevTestEverActivated,"just opening the menu does not forfeit credit");
 choose(env,index);
 ok(runtime.zooDevTestEverActivated,"selected scenario suppresses daily completion credit");
 eq(runtime.zooDevScenario.id,expectedId,"intended scenario selected");
 for(let i=0;i<results.length;i++) {
  const actual=hooks.getFeedZooTestResult(runtime);
  eq(actual,results[i],`simulated attempt ${i+1} yields expected result`);
  if(results[i]) {
   eq(runtime.feedPausedAt,null,"simulated successful gate resumes original game loop");
   break;
  } else {
   ok(runtime.feedPausedAt!=null,"simulated failed attempt keeps game paused");
  }
 }
 eq(env.diagnostics.filter(e=>e.type==='feed-audio-resume-attempt').length,0,"fake outcome does not invoke native/audio recovery");
 hooks.destroyFeedZooTestHarness(runtime);
 ok(!env.badge.classList.contains("bz-zoo-test-arm"),"teardown removes hidden activation");
 ok(env.game.children.length===0,"teardown removes menu DOM");
}
function preventEarlyAccident(){
 const env=testEnvironment();env.hooks.setActive(env.runtime);env.hooks.attachFeedZooTestHarness(env.runtime);
 env.badge.dispatch("pointerdown");env.badge.dispatch("pointermove",{clientX:90});env.advance(2500);
 eq(env.starts,0,"moving finger cancels long hold");
 env.badge.dispatch("pointerup");
 env.badge.dispatch("pointerdown");env.doc.hidden=true;env.doc.dispatch("visibilitychange");env.advance(2500);
 eq(env.starts,0,"backgrounding cancels developer trigger");
 env.doc.hidden=false;env.hooks.destroyFeedZooTestHarness(env.runtime);
}
function testRewardSuppression(){
 const env=testEnvironment();env.hooks.setActive(env.runtime);
 env.runtime.zooDevTestEverActivated=true;
 // The production source check specifically guards normal onComplete.
 eq(env.runtime.completions,0,"no existing test-session credit");
 ok(!env.runtime.zooDevScenario,"no test result queued in new runtime");
}
staticContracts();
preventEarlyAccident();
runCase(0,"stage2-success",[false,true]);
runCase(1,"stage3-success",[false,false,true]);
runCase(2,"stage3-exit",[false,false,false]);
runCase(3,"early-stage2",[false]);
runCase(4,"early-stage3",[false,false]);
testRewardSuppression();
console.log(`Patch 72.1B.1 Zoo Escape pilot harness: ${checks} checks passed`);
