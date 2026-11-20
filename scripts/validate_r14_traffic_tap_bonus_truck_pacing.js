"use strict";
// R14 / PRACTICE-01: run ACTUAL Traffic Tap speed, intro/outro and
// gameplay frame/pause functions with synthetic dimensions. This is not
// a physical phone speed/feel or sound test.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const game=read("verse_games/traffic_tap/game.js");
const shell=read("verse_games/shared/game-shell.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
assert(workflow.includes("node scripts/validate_r14_traffic_tap_bonus_truck_pacing.js"));
assert(shell.includes("multiplier: 1.25")&&shell.includes("multiplier: 1.5"),
  "real Normal/Fast/Max values must remain unchanged");
function slice(start,end){
  const a=game.indexOf(start),b=game.indexOf(end,a+start.length);
  assert(a>=0&&b>a,"missing real Traffic Tap section: "+start);
  return game.slice(a,b);
}
const speed=slice("  function trafficSpeedMultiplier() {",
  "  const STREAK_SPEED_MAX_MULTIPLIER =");
const start=slice("  function bonusTruckTravelSpeed() {",
  "  function pickBonusTargetEmoji() {");
const round=slice("  function startBonusRound() {","  function makeBonusItem(");
const finish=slice("  function finishBonusRound() {","  function renderBonus() {");
const main=slice("  function updateMain(dt, now) {",
  "    trafficSpawnTick(now);")+"\n  }\n";
const outro=slice("  function updateBonus(dt, now) {",
  "    state.bonusTimeLeft =")+"\n  }\n";
const loop=slice("  function loop(ts) {","  function cleanupTransientEffects(");
const paused=slice("  function setPaused(paused, reason = \"\") {","  function recalcField() {");
assert.equal((game.match(/state\.bonusTruckSpeed = bonusTruckTravelSpeed\(\);/g)||[]).length,2,
  "only intro/outro use dedicated travel speed");
assert(!game.includes("clamp(130 * trafficSpeedMultiplier(), 120, 190)"),
  "remove old 130px/sec truck limit");
assert(start.includes("window.VerseGameShell.getGameSpeedMultiplier()"));
assert(main.includes("topLaneRightHalfIsClearForBonusTruck()"));
assert(main.includes("state.bonusTruckX -= state.bonusTruckSpeed * (dt / 1000)"));
assert(outro.includes("state.bonusTruckX -= state.bonusTruckSpeed * (dt / 1000)"));
assert.equal((game.match(/state\.bonusTruckX < -\(state\.bonusTruckWidth \+ 40\)/g)||[]).length,2,
  "unchanged full-trailer exit threshold in both stages");
assert(!start.includes("mainTrafficSpeedMultiplier"),
  "bonus speed must not compound ordinary traffic streak boost");
assert(game.includes("const dt = Math.min(34, ts - state.lastTs)")&&
  game.includes("if (!state.paused) {"),
  "existing frame clamp and paused activity gate");
assert(game.includes("state.bonusNextSpawnAt = now + 220")&&
  game.includes("state.bonusEndsAt = now + state.bonusRoundDuration"),
  "bonus timer/scoring has not been changed");
assert(game.includes("item.targetSpeed = (item.baseSpeed || 90) * multiplier"),
  "ordinary traffic vehicle speed remains independent");

function fixture({difficulty="easy",preset=1,width=390,truckWidth=520}={}){
  const calls={intro:0,outro:0,complete:0,clear:0,raf:0};
  let now=1000,canEnter=true,userSpeed=preset;
  const state={running:true,paused:false,pauseReason:"",lastTs:0,rafId:0,
    phase:"reference",wordsBuilt:8,mainDone:true,
    mainItems:[],bonusItems:[],bonusTruckPending:true,bonusIntro:false,
    bonusEnding:false,bonusRound:false,bonusTruckX:0,bonusTruckWidth:0,
    bonusTruckSpeed:0,bonusTruckMode:"",bonusIntroUntil:0,
    bonusRoundDuration:16000,fieldWidth:width,roadHeight:100,
    gapHeight:20,bonusClearStartedAt:0,overlayMessage:"",overlayUntil:0,
    bonusIntroTarget:null};
  const scope={
    state,selectedMode:difficulty,verseWords:Array.from({length:9}),
    window:{VerseGameShell:{getGameSpeedMultiplier:()=>userSpeed}},
    document:{hidden:false,getElementById(){return null;}},
    clamp:(value,min,max)=>Math.max(min,Math.min(max,value)),
    gameNow:()=>now,pickBonusTargetEmoji:()=>({id:"target",label:"blue"}),
    vehicleLabel:v=>v.label,rand:()=>0.4,
    bonusTruckMetrics:()=>({totalWidth:truckWidth}),
    playGameSound:key=>{if(key==="truckIntro")calls.intro++;
      else if(key==="truckOutro")calls.outro++;},
    clearMainTrafficForBonus:()=>{calls.clear++;},
    topLaneRightHalfIsClearForBonusTruck:()=>canEnter,
    renderHud(){},cleanupTransientEffects(){},
    requestAnimationFrame:()=>++calls.raf,
    completeGameAndRenderEndScreen:()=>{calls.complete++;},
    nativeTrafficAudio:null,nativeTrafficPending:false,
    nativeTrafficFailure:false,muted:false,returnPaused:false,
    Math,console
  };
  vm.createContext(scope);
  const code=speed+start+round+finish+main+outro+loop+paused+
    "\nthis.test={travel:bonusTruckTravelSpeed,intro:startBonusTruckIntro,"+
    "outro:startBonusTruckOutro,startBonus:startBonusRound,"+
    "finishBonus:finishBonusRound,updateMain,updateBonus,loop,setPaused};";
  vm.runInContext(code,scope,{filename:"traffic-tap-game.js:R14-real-functions"});
  return {state,calls,api:scope.test,get now(){return now;},
    set now(t){now=t;},gate(v){canEnter=v;},
    setSpeed(v){userSpeed=v;}};
}
function drive(f,phase,dt=16){
  let ticks=0;
  for(;ticks<1400;ticks++){
    f.now+=dt;
    if(phase==="intro")f.api.updateMain(dt,f.now);
    else f.api.updateBonus(dt,f.now);
    if(phase==="intro"&&f.state.bonusRound)break;
    if(phase==="outro"&&!f.state.running)break;
  }
  assert(ticks<1400,phase+" truck never reached its offscreen completion gate");
  assert(ticks>1,"no instant skip across whole truck");
  assert.equal(f.state.bonusTruckSpeed,0,"old completion resets truck speed");
  return (ticks+1)*dt;
}
let checks=0;
function ok(c,label){assert(c,label);checks++;}
const cases=[
  ["easy",1,300],["easy",1.25,375],["easy",1.5,450],
  ["medium",1,390],["medium",1.25,488],["medium",1.5,560],
  ["hard",1,435],["hard",1.25,544],["hard",1.5,560]
];
for(const [difficulty,preset,expected] of cases){
  const f=fixture({difficulty,preset});
  assert.equal(f.api.travel(),expected,difficulty+"/"+preset+" speed");
  checks++;
  const old=Math.round(Math.max(120,Math.min(190,130*
    (difficulty==="easy"?1:difficulty==="medium"?1.3:1.45))));
  ok(expected>old*1.5,"traversal should be substantially faster");
  f.gate(false);f.api.updateMain(16,f.now);
  ok(!f.state.bonusIntro&&!f.calls.intro,
    "lane must be clear before bonus truck enters");
  f.gate(true);f.api.updateMain(16,f.now+16);
  ok(f.state.bonusIntro&&f.calls.intro===1&&
    f.state.bonusTruckSpeed===expected,"one intro at exactly selected speed");
  ok(f.state.bonusTruckX<f.state.fieldWidth+28,
    "truck advances from original right-edge spawn");
  const first=drive(f,"intro");
  ok(first<6500&&f.state.bonusRound&&!f.state.bonusIntro&&
     !f.state.bonusTruckPending,"bonus only begins after full trailer exits");
  ok(f.state.bonusEndsAt===f.now+f.state.bonusRoundDuration,
    "round timer still begins at actual truck exit");
  ok(f.calls.complete===0&&f.calls.intro===1,
    "no early end or duplicated intro music");
  f.setSpeed(preset);
  f.api.finishBonus();
  ok(f.state.bonusEnding&&f.calls.outro===1&&
     f.state.bonusTruckSpeed===expected,"outro shares the same speed/preset");
  const second=drive(f,"outro");
  ok(second<6500&&!f.state.running&&f.calls.complete===1,
    "results only after full outro exit, exactly once");
}
// Pause by Menu or held App Switcher freezes actual state movement and
// 34ms tick cap prevents a fast truck from skipping the exit trigger.
for(const phase of ["intro","outro"]){
  const f=fixture();
  if(phase==="intro")f.api.updateMain(16,f.now);
  else {f.state.bonusTruckPending=false;f.state.bonusRound=true;
    f.api.finishBonus();}
  const before=f.state.bonusTruckX;
  f.api.setPaused(true,"menu");
  for(let i=0;i<60;i++){f.now+=33;f.api.loop(f.now);}
  ok(f.state.bonusTruckX===before,
    phase+" position unchanged during prolonged inactive/menu period");
  f.api.setPaused(false,"");f.now+=16;f.api.loop(f.now);
  ok(f.state.bonusTruckX<before,
    phase+" moves again on explicit resume");
  ok(before-f.state.bonusTruckX<=560*0.034+0.1,
    phase+" resume cannot teleport past exit threshold");
}
const compact=fixture({width:280,truckWidth:420});
compact.api.updateMain(16,compact.now);
const compactMs=drive(compact,"intro");
ok(compactMs<4000,"narrow phone crosses briskly");
const large=fixture({width:760,truckWidth:700});
large.api.updateMain(16,large.now);
const tabletMs=drive(large,"intro");
ok(tabletMs>compactMs&&tabletMs<6500,
  "wide stage still respects full-trailer offscreen completion");
console.log("R14 PASS: real Traffic Tap bonus truck 9 difficulty/speed combinations, intro/outro completion, menu pause/resume and phone/tablet geometry ("+checks+" checks)");
