"use strict";
/** Patch 73 regression: actual Feeding functions plus source/asset contract. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const feed = read("daily_questions_feed_game.js");
const css = read("daily_questions_feed_game.css");
const app = read("app.js");
const homeCss = read("styles.css");
const sw = read("service-worker.js");
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const near = (a,b,m) => { ok(Math.abs(a-b) < 1e-8, m+`: ${a} !== ${b}`); };
const marker = "  window.BibloZooDailyFeedGame = Object.freeze({";
eq(feed.split(marker).length - 1,1,"single public Feeding export");
const injected = feed.replace(marker, `
 window.__patch73 = {
   FEED_MODES, LABYRINTH_ACCELERATION_FACTORS, LABYRINTH_IMPACT_SOUND_GAP_MS,
   feedInstructionPrompt, getFeedStarPegDiameter,
   bounceBrickGeometry, spawnBounceSnack, spawnMelodyNote, spawnLabyrinthBall,
   updateLabyrinthBall, showFeedingControlChoice,
   showFeedingControlInstructions, chooseFeedingControl,
   setRuntime: r => { activeRuntime = r; },
   getRuntime: () => activeRuntime
 };
${marker}`);
class Img { constructor() {this.complete=false;this.naturalWidth=0;} }
class Audio {constructor(url) {this.src=url;this.volume=1;this.currentTime=0;} load() {} pause() {} play() {return Promise.resolve();}}
const window = {location:{protocol:"https:"},devicePixelRatio:1,
 addEventListener(){},removeEventListener(){}, AudioContext:null,webkitAudioContext:null};
const document = {hidden:false,addEventListener(){},removeEventListener(){}};
let current=1000;
const sandbox={window,document,Image:Img,Audio,console,setTimeout,clearTimeout,
 performance:{now:()=>current},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
 fetch:()=>Promise.reject(Error("offline"))};
vm.createContext(sandbox);
vm.runInContext(injected,sandbox,{filename:"daily_questions_feed_game.js"});
const h=window.__patch73;
const api=window.BibloZooDailyFeedGame;

async function testChoiceFlow() {
 for (const mode of ["classic","labyrinth","melody","bounce"]) {
  const markup=api.render({session:{feedMode:mode,petName:"Pip"}});
  ok(markup.includes('data-daily-feed-start-choice'),`${mode}: first panel`);
  ok(markup.includes('data-daily-feed-start-confirm hidden'),`${mode}: instructions hidden initially`);
  ok(markup.includes('data-daily-feed-control="tilt"'),`${mode}: tilt button`);
  ok(markup.includes('data-daily-feed-control="drag"'),`${mode}: drag button`);
  ok(markup.includes('data-daily-feed-confirm-button'),`${mode}: got it button`);
  eq(h.feedInstructionPrompt(mode,"tilt").startsWith("Tilt to"),true,`${mode}: tilt-only instruction`);
  eq(h.feedInstructionPrompt(mode,"drag").startsWith("Drag to"),true,`${mode}: drag-only instruction`);
 }
 const make = () => ({
   startChoiceEl:{hidden:false},startConfirmEl:{hidden:true},
   startSelectedIconEl:{hidden:true,src:""},startInstructionEl:{textContent:""},
   startConfirmButton:{textContent:""},
   startControlMessageEl:{hidden:true,textContent:""},
   startOverlay:{hidden:false},mode:"bounce",controlPhase:"choose",
   controlMode:null,controlChoicePending:false,tiltEnabled:false,
   tiltPermissionPreapproved:false,introUnlockAt:0
 });
 const drag=make();h.setRuntime(drag);
 await h.chooseFeedingControl(drag,"drag");
 eq(drag.controlMode,"drag","choice locks drag");
 eq(drag.tiltEnabled,false,"drag disables tilt");
 eq(drag.startChoiceEl.hidden,true,"chooser hidden after selection");
 eq(drag.startConfirmEl.hidden,false,"instructions displayed");
 eq(drag.startConfirmButton.textContent,"Got It!","confirmation action");
 eq(drag.startSelectedIconEl.src.endsWith("dq_feed_control_drag.png"),true,"drag icon");
 eq(drag.startInstructionEl.textContent,"Drag to rebound the white ball; feed your pet the colored snacks!","exact Bounce drag instruction");
 const missing=make();h.setRuntime(missing);
 delete window.DeviceOrientationEvent;
 await h.chooseFeedingControl(missing,"tilt");
 eq(missing.controlMode,null,"missing orientation does not start tilt");
 ok(/choose Drag/i.test(missing.startControlMessageEl.textContent),"explicit unavailable fallback");
 eq(missing.startChoiceEl.hidden,false,"user can choose drag instead");
 let permissionCalls=0;
 window.DeviceOrientationEvent={requestPermission:()=>{permissionCalls++;return Promise.resolve("denied");}};
 const denied=make();h.setRuntime(denied);
 await h.chooseFeedingControl(denied,"tilt");
 eq(permissionCalls,1,"permission checked on tilt selection");
 eq(denied.controlMode,null,"denial leaves controls unselected");
 ok(/wasn't granted/.test(denied.startControlMessageEl.textContent),"denial explained");
 window.DeviceOrientationEvent={requestPermission:()=>{permissionCalls++;return Promise.resolve("granted");}};
 const allowed=make();h.setRuntime(allowed);
 await h.chooseFeedingControl(allowed,"tilt");
 eq(permissionCalls,2,"permission requested for tilt");
 eq(allowed.controlMode,"tilt","allowed tilt locked");
 eq(allowed.tiltEnabled,true,"tilt selected");
 eq(allowed.startInstructionEl.textContent,"Tilt to rebound the white ball; feed your pet the colored snacks!","exact Bounce tilt instruction");
 eq(allowed.startSelectedIconEl.src.endsWith("dq_feed_control_tilt.png"),true,"tilt icon");
}

function testSizes() {
 for(const [width,height] of [[390,844],[320,600],[768,1024]]) {
  const brick=h.bounceBrickGeometry(width,height,0,0);
  const diameter=Math.min(brick.height*.87,brick.width*.64);
  near(h.getFeedStarPegDiameter({width,height}),diameter,"star artwork displayed diameter");
  const bounce={width,height,nextBallId:1,balls:[],bounce:{snackSpeed:120}};
  h.spawnBounceSnack(bounce,{x:30,y:30,width:60,height:26,config:{id:"red",color:"#f00",points:1}});
  eq(bounce.balls.length,1,"bounce snack created");
  near(bounce.balls[0].radius*2,diameter,"Bounce snack matches star artwork");
  const melody={width,height,nextBallId:1,balls:[]};
  const entry={index:0,x:width/2};
  h.spawnMelodyNote(melody,entry);
  eq(melody.balls.length,1,"melody ball created");
  near(melody.balls[0].radius*2,diameter,"Melody ball matches Bounce and star");
  eq(entry.status,"active","Melody timeline retains active-note semantics");
 }
}

function testLabyrinthWeightsAndImpact() {
 const factors=Array.from(h.LABYRINTH_ACCELERATION_FACTORS);
 eq(factors.length,7,"one distinct factor per scheduled ball");
 ok(Math.max(...factors)-Math.min(...factors)>=.10,"weight variation is noticeable but subtle");
 ok(Math.max(...factors)-Math.min(...factors)<=.31,"weight variation below 15 percent");
 eq(new Set(factors).size,factors.length,"all Labyrinth balls have distinct weights");
 const spawned={width:390,height:844,pegRadius:12,nextBallId:1,balls:[]};
 for(let i=0;i<7;i++) h.spawnLabyrinthBall(spawned,{id:"red",color:"red"},1000,i);
 eq(spawned.balls.length,7,"all seven scheduled balls created");
 for(let i=0;i<7;i++) near(spawned.balls[i].accelerationFactor,factors[i],`stable weight #${i}`);
 const balls=spawned.balls.map(b=>({...b,x:150,y:120,vx:0,vy:0,trail:[]}));
 const base={width:390,height:844,pegRadius:12,
  labyrinth:{steering:1,steerAcceleration:400,horizontalDamping:1,
   maxHorizontalSpeed:1000,maxVerticalSpeed:1000,gravity:0,platformRows:[]},
  audioContext:{state:"suspended"},lastPegSoundAt:-Infinity};
 for(const ball of balls) h.updateLabyrinthBall(base,ball,1/60,1010);
 const vxs=balls.map(b=>b.vx);
 ok(new Set(vxs.map(v=>v.toFixed(6))).size===7,"balls respond with distinct horizontal accelerations");
 eq(balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.vx)),true,"physics remains finite");
 // Live impact tone must be powered by the existing audio context, never a new one.
 let notes=0;
 const sound={state:"running",currentTime:11,destination:{},
  createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},
   addEventListener(){},start(){notes++;},stop(){}}},
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}};
 const hitBall={...spawned.balls[0],x:160,y:180,vx:0,vy:270,trail:[],
  labyrinthProgressAt:1000,labyrinthProgressX:160,labyrinthProgressY:180,
  lastPlatformSoundAt:-Infinity};
 const platform={x:70,width:240,y:200,height:15};
 const rt={...base,audioContext:sound,lastPegSoundAt:-Infinity,
  labyrinth:{...base.labyrinth,steering:0,gravity:0,platformRows:[{segments:[platform]}]}};
 hitBall.y=platform.y-hitBall.radius-1;
 h.updateLabyrinthBall(rt,hitBall,1/60,1100);
 eq(notes,1,"downward platform impact triggers one tone");
 ok(hitBall.vy<=0,"normal Labyrinth platform rebound remains intact");
 const before=notes;
 hitBall.y=platform.y-hitBall.radius-1;hitBall.vy=270;
 h.updateLabyrinthBall(rt,hitBall,1/60,1130);
 eq(notes,before,"near-immediate repeat impact does not flood sounds");
}

function testIntegrationContracts() {
 for(const name of ["dq_feed_control_tilt.png","dq_feed_control_drag.png"]) {
  const file=path.join(root,"verse_images/daily_questions",name);
  ok(fs.existsSync(file),`packaged original-style icon ${name}`);
  ok(fs.statSync(file).size>1000,`nontrivial icon ${name}`);
  ok(sw.includes(`./verse_images/daily_questions/${name}`),`offline cache ${name}`);
 }
 ok(/2026_Nov_14_patch73_melody_seven_snacks_badges/.test(sw),"versioned SW cache refreshed");
 ok(css.includes(".daily-feed-control-options"),"visible two-button grid styled");
 ok(css.includes(".daily-feed-control-option:focus-visible"),"keyboard controls visibly focusable");
 ok(css.includes(".daily-feed-start-confirm[hidden]"),"hidden phase actually hidden");
 ok(feed.includes('runtime.controlMode !== "tilt"'),"orientation ignored during drag session");
 ok(feed.includes('runtime.controlMode !== "drag"'),"touch steering ignored during tilt session");
 ok(feed.includes('runtime.controlPhase === "serve"'),"Bounce continuation uses serve state");
 ok(feed.includes('runtime.controlStoppedAt != null'),"fallback preserves existing round");
 ok(feed.includes("shiftFeedingDeadlines(runtime, duration)"),"fallback shifts timers instead of losing progress");
 ok(app.includes('id="titleCurrentVerseBtn"'),"Current Verse is a button");
 ok(app.includes('go(Screen.MY_VERSES)'),"My Verses route is available");
 ok(app.includes('wrap.querySelector("#titleCurrentVerseBtn")?.addEventListener("click"'),"card wired to My Verses");
 ok(homeCss.includes(".title-current-verse-panel:focus-visible"),"home card keyboard focus");
 ok(!/dailyFeed.*requestPermission/.test(app),"no unrelated pre-game tilt permission request");
 // No mutation to native iOS session configuration.
 const native=read("ios/App/App/AppDelegate.swift");
 ok(native.includes("AVAudioSession.sharedInstance()"),"native session diagnostics still present");
}

(async()=>{
 await testChoiceFlow();
 testSizes();
 testLabyrinthWeightsAndImpact();
 testIntegrationContracts();
 console.log(`Patch 73 Feeding control & gameplay validation passed (${checks} checks).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
