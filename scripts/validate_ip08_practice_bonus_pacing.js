#!/usr/bin/env node
"use strict";
// IP08: exercise production Verse Splat RAF sleep/respawn and Bible Bugs
// book-wave renderer and pause-aware bonus spawn controller with fake clocks.
// This checks deterministic engine semantics, not physical WebKit performance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const splat = fs.readFileSync(path.join(root, "verse_games/verse_splat/game.js"), "utf8");
const bugs = fs.readFileSync(path.join(root, "verse_games/bible_bugs/game.js"), "utf8");
const css = fs.readFileSync(path.join(root, "verse_games/bible_bugs/game.css"), "utf8");
function segment(text, begin, end) {
  const a=text.indexOf(begin), b=text.indexOf(end, a+begin.length);
  assert.ok(a>=0&&b>a, "real source segment found: "+begin);
  return text.slice(a,b);
}
assert.match(splat,/const BONUS_RESPAWN_DELAY_MS = 500;/);
assert.match(splat,/const BONUS_BLOB_COUNT = 3;/);
assert.match(splat,/splatBonusBlob\(blob, false\);\s*scheduleBonusBlobRespawn\(\);/,
  "bonus tap still splats one blob and queues one refill, without bonus score grants");
assert.match(splat,/clearBonusRespawnTimers\(\)/);
assert.match(bugs,/const BONUS_MAX_BUGS = 3;/);
assert.match(bugs,/const BONUS_BUG_LIFE_MS = 1850;/);
assert.match(bugs,/const BONUS_BUG_EXTRA_LIFE_MS = 950;/);
assert.match(bugs,/const BONUS_INITIAL_STAGGER_MS = \[0, 360, 780\];/);
assert.match(bugs,/const BONUS_END_SPAWN_RATE_MULTIPLIER = 1\.5;/);
assert.match(bugs,/state\.bonusBugs\.length >= BONUS_MAX_BUGS/);
assert.match(bugs,/state\.bonusSpawnPendingCount/);
assert.match(css,/\.bb-bug-wrap\.is-book-enter\s*\{\s*opacity:\s*var\(--bb-book-enter-opacity, 1\);/);

function splatHarness() {
  let time=0, queue=[], nextId=0, appended=0;
  const state={screen:"bonus",bonusEnding:false,
    bonusBlobs:[0,1,2].map(id=>({id,alive:true})),bonusRespawnTimers:[]};
  let paused=false;
  const context={
    performance:{now:()=>time},document:{hidden:false},state,
    get returnPaused(){return paused;},
    BONUS_RESPAWN_DELAY_MS:500,BONUS_BLOB_COUNT:3,
    requestAnimationFrame:fn=>{queue.push(fn);return ++nextId;},
    clearTimeout:()=>{throw Error("RAF sleep entries are not wall timers");},
    currentBounds:()=>({width:400,height:350}),
    makeBonusBlob:()=>({id:++nextId,alive:true}),
    appendBonusBlobNode:(blob)=>{assert.ok(blob.alive);appended++;}
  };
  const src=segment(splat,"const sleep = (ms) =>","const afterNextPaint =")+
    segment(splat,"function clearBonusRespawnTimers() {","function ensureBonusBlobCount() {")+
    "\nthis.action={scheduleBonusBlobRespawn,clearBonusRespawnTimers};";
  vm.runInNewContext(src,context);
  async function frame(ms=20) {
    time+=ms;
    const callbacks=queue.splice(0);
    for(const fn of callbacks)fn(time);
    await Promise.resolve();await Promise.resolve();
  }
  async function frames(count,ms=20) {for(let i=0;i<count;i++)await frame(ms);}
  return {state,context,action:context.action,frame,frames,
    setPaused:v=>{paused=v;},get appended(){return appended;},get time(){return time;}};
}
async function testSplat() {
  const s=splatHarness();
  s.state.bonusBlobs[0].alive=false;
  s.action.scheduleBonusBlobRespawn();
  assert.equal(s.state.bonusRespawnTimers.length,1);
  await s.frames(24);
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,2,
    "Verse Splat must not respawn before 500 active milliseconds");
  await s.frame();
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,3,
    "Verse Splat refills after 500ms of active RAF time");
  assert.equal(s.state.bonusRespawnTimers.length,0);
  assert.equal(s.appended,1);
  s.state.bonusBlobs[0].alive=false;
  s.action.scheduleBonusBlobRespawn();
  s.setPaused(true);
  await s.frames(45);
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,2,
    "Welcome Back pause must freeze bonus respawn elapsed time");
  s.setPaused(false);
  await s.frames(24);
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,2);
  await s.frame();
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,3);
  s.state.bonusBlobs[0].alive=false;
  s.action.scheduleBonusBlobRespawn();
  s.context.document.hidden=true;
  await s.frames(30);
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,2,
    "hidden Web/PWA clock must not advance pending refill");
  s.context.document.hidden=false;
  await s.frames(25);
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,3);
  const before=s.appended;
  s.state.bonusBlobs[0].alive=false;
  s.action.scheduleBonusBlobRespawn();
  s.action.clearBonusRespawnTimers();
  s.state.screen="end";
  await s.frames(28);
  assert.equal(s.appended,before, "cancelled/abandoned refill never creates a stale blob after Exit");
  assert.equal(s.state.bonusRespawnTimers.length,0);
  s.state.screen="bonus";
  s.state.bonusBlobs=[{id:1,alive:false},{id:2,alive:false},{id:3,alive:true}];
  s.action.scheduleBonusBlobRespawn();
  s.action.scheduleBonusBlobRespawn();
  s.action.scheduleBonusBlobRespawn();
  await s.frames(25);
  assert.equal(s.state.bonusBlobs.filter(b=>b.alive).length,3,
    "rapid taps cannot exceed three concurrent Verse Splat bonus blobs");
  assert.equal(s.state.bonusRespawnTimers.length,0, "pending promise records are bounded and cleared");
}
const schedSrc=segment(bugs,"function scheduleAction(delayMs, fn) {","function startBonusIntro() {")+
  segment(bugs,"function getBonusSpawnSlotCount() {","function handleBonusTap(id) {");
const updateSrc=segment(bugs,"function updateBonusBug(dt, now) {","function startLoop() {");
const renderSrc=segment(bugs,"function renderBugButton(bug, now, isBonus) {","function renderWaterWaves(svg, now) {");
const pauseSrc=segment(bugs,"function shiftGameTimers(deltaMs) {","function wireGameInput() {");
const bugConstants=segment(bugs,"const BONUS_SECONDS = 20;","const MODE_TIMING = {")+
  segment(bugs,"const BONUS_BUG_LIFE_MS = 1850;","const MAIN_EAT_MS = 420;");
function bugHarness() {
  let time=1000, random=.5, callbacks=0;
  const state={
    running:true,paused:false,bonusMode:true,bonusEating:false,
    bonusEndsAt:time+20000,bonusBugs:[],bonusSpawnPendingCount:0,bonusBugId:0,
    done:false,scheduledActions:[],fieldWidth:390,fieldHeight:640,
    phase:"book",bugs:[],tutorialBug:null,tongue:null,reaction:null,
    spitParticles:[],poofParticles:[],stinkParticles:[],tongueSparkles:[],
    bonusScorePops:[],frogChompUntil:0,buildShakeUntil:0,fieldFlashUntil:0,
    overlayUntil:0,bonusIntroUntil:0
  };
  const math=Object.create(Math);math.random=()=>random;
  const shell={clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v))};
  const ctx={state,shell,performance:{now:()=>time},Math:math,console,
    BONUS_STINK_CHANCE:.22,BONUS_GOOD_BUG_IMAGE_PATHS:["bug1","bug2"],
    BONUS_STINK_BUG_IMAGE_PATH:"stink",BUG_EMOJIS:["bug"],
    maybeEmitAmbientStink:()=>{callbacks++;},
    getBugPoint:()=>({x:120,y:210}),
    getBugMotionState:()=>({swayX:0,rotateDeg:0,scaleX:1,scaleY:1}),
    escapeHtml:v=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;"),
    get getTime(){return time;}
  };
  vm.runInNewContext(bugConstants+schedSrc+updateSrc+renderSrc+pauseSrc+
    "\nthis.api={scheduleAction,runScheduledActions,scheduleBonusSpawn,scheduleBonusRefill,"+
    "getBonusSpawnSlotCount,getBonusSpawnRateMultiplier,spawnBonusBug,updateBonusBug,"+
    "renderBugButton,shiftGameTimers};",ctx);
  return {state,api:ctx.api,setTime:n=>{time=n;},advance:n=>{time+=n;return time;},
    setRandom:n=>{random=n;},get time(){return time;},get ambience(){return callbacks;}};
}
function testBookFade() {
  const h=bugHarness();
  const bug={id:"w1-0",text:"Matthew",emoji:"bug",imgSrc:"",bornAt:1000,
    status:"falling",tutorial:false,xRatio:.5,yRatio:.4,baseRotateDeg:0};
  function render(at,phase="book",isBonus=false) {
    h.state.phase=phase;
    return h.api.renderBugButton(bug,at,isBonus);
  }
  assert.match(render(980),/is-book-enter/);
  assert.match(render(980),/--bb-book-enter-opacity:0\.000/);
  assert.match(render(1130),/--bb-book-enter-opacity:0\.500/);
  assert.match(render(1260),/--bb-book-enter-opacity:1\.000/);
  assert.ok(!render(1130).includes(" is-pop"),"book-wave entry cannot restart pop animation each frame");
  for(const phase of ["words","reference"]) {
    const html=render(1130,phase);
    assert.ok(!html.includes("is-book-enter"),phase+" normal arrival is unchanged");
    assert.ok(html.includes(" is-pop"),phase+" retains its old pop");
  }
  assert.ok(!render(1130,"book",true).includes("is-book-enter"),"bonus bugs never get book fade");
  h.state.phase="book";bug.tutorial=true;
  assert.ok(!render(1130).includes("is-book-enter"),"tutorial bug unaffected");
  bug.tutorial=false;bug.status="eating";
  assert.ok(!render(1130).includes("is-book-enter"),"eaten bug does not remain transparent");
  bug.status="falling";
  assert.match(render(1130),/class="bb-bug-word">Matthew<\/div>/,
    "full book label and its real hit-test id remain intact");
  assert.match(render(1130),/data-bug-id="w1-0"/);
}
function testBonusSpawning() {
  const h=bugHarness(),s=h.state,a=h.api;
  h.setRandom(.5);
  a.spawnBonusBug(3);
  assert.equal(s.bonusBugs.length,3);
  assert.equal(s.bonusSpawnPendingCount,0);
  for(const b of s.bonusBugs)
    assert.equal(b.expiresAt-b.bornAt,1850+.5*950,
      "new pacing must not alter old bonus bug lifetimes");
  a.scheduleBonusRefill("automatic");
  assert.equal(s.bonusSpawnPendingCount,0,"full slot cap prevents pending allocation");

  // One expired/poofed slot becomes available; update's regular RAF tick
  // queues a faster refill, but the existing poof grace must complete first.
  const gone=s.bonusBugs[0];
  gone.status="poof";gone.poofAt=h.time-600;
  a.updateBonusBug(.016,h.time);
  assert.equal(s.bonusBugs.length,2);
  assert.equal(s.bonusSpawnPendingCount,1);
  assert.equal(s.scheduledActions.length,1);
  const due=s.scheduledActions[0].at;
  const mult=a.getBonusSpawnRateMultiplier();
  const expectedDelay=(90+.5*(220-90))/mult;
  assert.ok(Math.abs((due-h.time)-expectedDelay)<.001,
    "free slot refill delay uses new 90-220ms range and existing difficulty multiplier");
  a.updateBonusBug(.016,h.time);
  assert.equal(s.bonusSpawnPendingCount,1,
    "one pending action per slot, no RAF-driven unbounded timer buildup");
  h.setTime(due-1);a.runScheduledActions(h.time);
  assert.equal(s.bonusBugs.length,2,"not yet refilled");
  h.setTime(due);a.runScheduledActions(h.time);
  assert.equal(s.bonusBugs.length,3,"vacancy refills through existing action queue");
  assert.equal(s.bonusSpawnPendingCount,0);
  assert.equal(s.scheduledActions.length,0);
  for(const b of s.bonusBugs)
    assert.equal(b.expiresAt-b.bornAt,1850+.5*950,
      "refilled bug still enjoys original lifetime");

  // Two concurrent vacancies reserve at most two actions and return to cap.
  s.bonusBugs=[s.bonusBugs[0]];
  a.updateBonusBug(.016,h.time);
  a.updateBonusBug(.016,h.time);
  assert.equal(s.bonusSpawnPendingCount,2);
  a.updateBonusBug(.016,h.time);
  assert.equal(s.scheduledActions.length,2);
  h.setTime(Math.max(...s.scheduledActions.map(x=>x.at)));
  a.runScheduledActions(h.time);
  assert.equal(s.bonusBugs.length,3);
  assert.equal(s.bonusSpawnPendingCount,0);

  // Retain originally staggered start and distinguish good/stink refills.
  s.bonusBugs=[];s.scheduledActions=[];s.bonusSpawnPendingCount=0;
  for(const [kind,min,max] of [["automatic",90,220],["good",85,205],["stink",110,260]]) {
    h.setRandom(0);a.scheduleBonusRefill(kind);
    let delta=s.scheduledActions.pop().at-h.time;
    assert.ok(Math.abs(delta-min/a.getBonusSpawnRateMultiplier())<.001);
    s.bonusSpawnPendingCount--;
    h.setRandom(.9999);a.scheduleBonusRefill(kind);
    delta=s.scheduledActions.pop().at-h.time;
    assert.ok(delta<max/a.getBonusSpawnRateMultiplier()+.001);
    s.bonusSpawnPendingCount--;
  }
  h.setRandom(.5);
  s.bonusBugs=[];s.scheduledActions=[];s.bonusSpawnPendingCount=0;

  // Scheduled actions are advanced by shiftGameTimers on menu/Welcome Back
  // return. Frozen loop must never consume the clock while paused.
  a.scheduleBonusRefill("automatic");
  const oldDue=s.scheduledActions[0].at;
  const oldEnds=s.bonusEndsAt;
  const oldCount=s.bonusSpawnPendingCount;
  s.paused=true;
  h.advance(900);
  assert.equal(s.bonusBugs.length,0);
  a.shiftGameTimers(900);
  assert.equal(s.scheduledActions[0].at,oldDue+900);
  assert.equal(s.bonusEndsAt,oldEnds+900);
  assert.equal(s.bonusSpawnPendingCount,oldCount);
  s.paused=false;
  h.setTime(oldDue+900);
  a.runScheduledActions(h.time);
  assert.equal(s.bonusBugs.length,1,"refill resumes after pause without premature expiry");

  // Exit or completed bonus invalidates queued actions. startGame resets
  // scheduledActions and pending counters before new runs; no stale spawns.
  s.bonusBugs=[];s.scheduledActions=[];s.bonusSpawnPendingCount=0;
  a.scheduleBonusRefill("good");
  s.done=true;s.bonusMode=false;s.running=false;
  h.setTime(s.scheduledActions[0].at+1);a.runScheduledActions(h.time);
  assert.equal(s.bonusBugs.length,0);
  assert.equal(s.bonusSpawnPendingCount,0);
  s.done=false;s.bonusMode=true;s.bonusEndsAt=h.time-1;
  a.scheduleBonusRefill("automatic");
  assert.equal(s.scheduledActions.length,0,"no action after bonus clock ends");
  assert.equal(s.bonusBugs.length,0);
  assert.match(bugs,/state\.scheduledActions = \[\];[\s\S]*state\.bonusSpawnPendingCount = 0;/,
    "new game clears old actions and pending count");
}
async function main() {
  await testSplat();
  testBookFade();
  testBonusSpawning();
  console.log("IP08 PASS: Verse Splat 500ms real RAF respawn, hidden/paused/Exit/cap; Bible Bugs book-wave time-based fade, original modes/touch labels, actual action-queue bonus refills, 3-slot cap, unchanged 1850+950ms lifespan, pause shift and post-Exit safety.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
