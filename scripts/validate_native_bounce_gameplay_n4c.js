"use strict";
// N4c: run the REAL Feeding controller in a Node VM. Not an Xcode compile,
// speaker audibility measurement, or modified Bounce physics simulation.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const game=read("daily_questions_feed_game.js");
const pilot=read("verse_games/shared/feeding-native-audio-pilot.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const between=(src,a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
  assert.ok(i>=0&&j>i,"Missing source region "+a);return src.slice(i,j);};
const begin=between(game,"  async function startPreviewRoundWithAudioChoice(runtime) {","  function startRound(runtime) {");
const round=between(game,"  function startRound(runtime) {","  function resizeFeedStage(runtime) {");
const peg=between(game,"  function playPegTone(runtime, now) {","  function playStarSound(runtime, collisionEpochMs) {");
const star=between(game,"  function playStarSound(runtime, collisionEpochMs) {","  function playChompSound(runtime, collisionEpochMs) {");
const brick=between(game,"  function breakBounceBrick(runtime, brick, ball, now) {","  // Circle/rectangle collision");
const whiteBall=between(game,"  function updateBounceWhiteBall(runtime, ball, dt, now) {","  function bounceSnackTouchesPet(");
const snacks=between(game,"  function updateBounceSnacks(runtime, dt) {","  function updateBouncePetLean(");
const catchBall=between(game,"  function catchBall(runtime, ball) {","  function updateBall(runtime, ball, dt, now) {");
const resume=between(game,"  function attemptFeedingResumeFromGesture(","  function attachFeedInterruptionHandlers(");
const switcher=between(game,"  function pauseNativeFeedingForAppSwitcher(runtime) {","  function attachFeedInterruptionHandlers(runtime) {");
assert.match(pilot,/const BOUNCE_IDS = Object\.freeze\(\["feed-star", "feed-chomp", "feed-peg"\]\)/);
assert.match(pilot,/\["classic", "labyrinth", "melody", "bounce"\]/);
assert.match(pilot,/mode === "bounce" \? BOUNCE_IDS : IDS/);
assert.match(begin,/runtime\.mode === FEED_MODES\.BOUNCE \? "bounce" : "classic"/);
assert.match(begin,/if \(result\?\.ready !== true \|\| !pilot\) \{[\s\S]*?return;/);
assert.match(round,/if \(runtime\.mode === FEED_MODES\.BOUNCE\) \{[\s\S]*?launchBounceServe\(runtime\)/);
assert.match(peg,/FEED_MODES\.BOUNCE/);
assert.match(peg,/runtime\.nativePilot\?\.play\("feed-peg"/);
assert.match(peg,/runtime\.feedPausedAt != null/);
assert.match(peg,/now - runtime\.lastPegSoundAt < 55/);
assert.match(peg,/context\.createOscillator\(\)/); // original browser path retained
assert.match(brick,/brick\.active = false/);
assert.match(brick,/if \(brick\.config\) spawnBounceSnack\(runtime, brick\)/);
assert.match(brick,/state\.pendingWhiteBalls\.push\(bonus\)/);
assert.match(brick,/playStarSound\(runtime\)/);
assert.match(brick,/playPegTone\(runtime, now\)/);
assert.match(whiteBall,/if \(hitBoundary\) playPegTone\(runtime, now\)/);
assert.match(whiteBall,/playPegTone\(runtime, now\)/);
assert.match(whiteBall,/collideBounceBallWithBricks\(runtime, ball, previousX, previousY, now\)/);
assert.match(snacks,/catchBall\(runtime, ball\)/);
assert.match(catchBall,/runtime\.score \+= ball\.points/);
assert.match(catchBall,/runtime\.caughtCount \+= 1/);
assert.match(catchBall,/playChompSound\(runtime, collisionEpochMs\)/);
assert.match(star,/if \(runtime\.nativePilotBackend === "native"\)/);
assert.match(star,/runtime\.nativePilot\?\.play\("feed-star"/);
assert.match(resume,/runtime\.nativePilot\?\.prepare\?\.\(\)/);
assert.match(switcher,/pauseFeedingGame\(runtime\)/);
assert.match(swift,/private let nativePegSoundID = "feed-peg"/);
// N4c Feeding resources remain fixed IDs; N6b adds only curated Snake samples.
assert.match(swift,/private let pcmEffectIDs: Set<String> = \[\s*"feed-star", "feed-chomp", "ui-pop-1", "ui-pop-2"(?:,\s*"[a-z0-9-]+")*\s*\]/);
assert.match(workflow,/node scripts\/validate_native_bounce_gameplay_n4c\.js/);

function harness({nativeOnly=true,platform="ios",failSound=""}={}){
  const calls=[],document={hidden:false},api={
    async activateFromGesture({purpose}){calls.push(["activate",purpose]);return {ready:true};},
    async preload({soundId}){calls.push(["preload",soundId]);
      return soundId===failSound?{prepared:false,reason:"interruption-pending"}:{prepared:true};},
    async play(args){calls.push(["play",JSON.parse(JSON.stringify(args))]);return {accepted:true};},
    async stop({soundId}){calls.push(["stop",soundId]);return {stopped:true};}
  };
  const window={document,Capacitor:{isNativePlatform:()=>platform!=="web",
      getPlatform:()=>platform,Plugins:{BibloZooNativeSound:api}},
    BibloZooNativeOnlyOutput:{enabled:nativeOnly},
    location:{protocol:"https:"},devicePixelRatio:1,setTimeout,clearTimeout};
  const sandbox={window,document,Date,Promise,Math,console,
    performance:{now:()=>1000},setTimeout,clearTimeout,
    requestAnimationFrame:()=>10,cancelAnimationFrame:()=>{},Image:class{},
    Audio:class{constructor(){throw Error("Native Bounce must not create HTML Audio");}},
    fetch:()=>Promise.reject(Error("no fetch"))};
  vm.runInNewContext(pilot,sandbox,{filename:"feeding-native-audio-pilot.js"});
  const marker="  window.BibloZooDailyFeedGame = Object.freeze({";
  const hooks='  window.__N4c={setRuntime(value){activeRuntime=value;},render,startNative:startPreviewRoundWithAudioChoice,peg:playPegTone,star:playStarSound,chomp:playChompSound};\n'+marker;
  const code=game.replace("  function startRound(runtime) {",
    "  function startRound(runtime) { if(window.__interceptStart){window.__interceptStart(runtime);return;}"
  ).replace(marker,hooks);
  vm.runInNewContext(code,sandbox,{filename:"daily_questions_feed_game.js"});
  return {window,api,calls,hooks:window.__N4c};
}
function makeRuntime(mode="bounce"){
  return {mode,nativePilotAllowed:true,nativePilotCheckbox:null,
    nativePilotChoicePending:false,nativePilotBackend:"web",nativePilot:null,
    nativePilotBadge:{textContent:""},nativePilotChoiceStatus:{textContent:""},
    startConfirmButton:{textContent:"Got It!",disabled:false},
    roundStarted:false,controlPhase:"instructions",finished:false,feedPageHidden:false,
    audioContext:null,starAudio:null,chompAudio:null,feedPausedAt:null,
    lastPegSoundAt:0,lastPegNoteIndex:-1,score:5,caughtCount:2,
    bounce:{livesLeft:3,waitingServe:true,snacksReleased:false,ended:false}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
  {
    const e=harness();
    const html=e.hooks.render({session:{feedMode:"bounce",petName:"BibloPet"}});
    assert.doesNotMatch(html,/Native Bounce: prepare/);
    assert.match(html,/data-daily-feed-native-choice-status/);
    assert.doesNotMatch(html,/data-daily-feed-native-opt-in/);
    const w=harness({nativeOnly:false,platform:"web"});
    assert.doesNotMatch(w.hooks.render({session:{feedMode:"bounce"}}),/Native Bounce: prepare/);
    assert.equal(w.window.BibloZooFeedingNativeAudioPilot.create({mode:"bounce",isCurrent:()=>true}),null);
  }
  {
    const e=harness(),r=makeRuntime();let starts=0;
    e.window.__interceptStart=x=>{starts++;x.roundStarted=true;};
    e.hooks.setRuntime(r);await e.hooks.startNative(r);
    assert.equal(starts,1);assert.equal(r.nativePilotBackend,"native");
    assert.equal(r.audioContext,null);
    assert.deepEqual(e.calls.map(x=>x.slice(0,2)),[
      ["activate","feeding"],["preload","feed-star"],["preload","feed-chomp"],["preload","feed-peg"]
    ]);
    assert.match(r.nativePilotBadge.textContent,/Bounce rebounds\/bonus\/catches ready/);
    assert.ok(r.nativePilot.isReady());
    // Wall/paddle/gray brick use a single prewarmed, rate-limited peg family.
    e.hooks.peg(r,1000);e.hooks.peg(r,1020);e.hooks.peg(r,1060);
    // Star brick bonus and collected snacks retain same PCM IDs as Classic.
    e.hooks.star(r,Date.now());e.hooks.chomp(r,Date.now());
    await flush();
    const played=e.calls.filter(x=>x[0]==="play").map(x=>x[1]);
    assert.deepEqual(played.map(x=>x.soundId),
      ["feed-peg","feed-peg","feed-star","feed-chomp"]);
    assert.notEqual(played[0].noteIndex,played[1].noteIndex);
    assert.ok([played[0].noteIndex,played[1].noteIndex].every(
      x=>Number.isInteger(x)&&x>=0&&x<6));
    assert.ok(!played.some(x=>Object.hasOwn(x,"midi")));
    assert.ok(played.every(x=>x.volume>0&&x.volume<=1));
    assert.equal(r.score,5);assert.equal(r.caughtCount,2);
    // Pause stops effects even if a stale white-ball collision arrives.
    r.feedPausedAt=900;e.hooks.peg(r,1200);
    assert.equal(e.calls.filter(x=>x[0]==="play").length,4);
    r.feedPausedAt=null;r.nativePilot.stop();
    e.hooks.peg(r,1300);
    assert.equal(e.calls.filter(x=>x[0]==="play").length,4);
    assert.deepEqual(e.calls.filter(x=>x[0]==="stop").map(x=>x[1]),
      ["feed-star","feed-chomp","feed-peg"]);
  }
  {
    const e=harness({failSound:"feed-peg"}),r=makeRuntime();let starts=0;
    e.window.__interceptStart=x=>{starts++;x.roundStarted=true;};
    e.hooks.setRuntime(r);await e.hooks.startNative(r);
    assert.equal(starts,0);assert.equal(r.roundStarted,false);
    assert.equal(r.controlPhase,"instructions");
    assert.equal(r.startConfirmButton.textContent,"Try Again");
    assert.match(r.nativePilotChoiceStatus.textContent,/Pause the other video's audio, then tap Try Again/,
      "Bounce PiP-busy preflight preserves instructions and explicit retry");
    assert.match(r.nativePilotBadge.textContent,/interruption-pending/);
    assert.ok(!e.calls.some(x=>x[0]==="play"));
    e.api.preload=async({soundId})=>{e.calls.push(["preload",soundId]);return {prepared:true};};
    await e.hooks.startNative(r);
    assert.equal(starts,1);assert.equal(r.nativePilotBackend,"native");
  }
  {
    const e=harness(),r=makeRuntime();e.hooks.setRuntime(r);
    e.window.__interceptStart=x=>{x.roundStarted=true;};
    await e.hooks.startNative(r);
    assert.equal(r.nativePilot.play("feed-melody",0.25,Date.now(),64),false);
    assert.equal(r.nativePilot.play("pilot-unlock",0.2,Date.now()),false);
    const melody=e.window.BibloZooFeedingNativeAudioPilot.create({mode:"melody",isCurrent:()=>true});
    assert.equal(melody.play("feed-peg",0.2,Date.now(),0),false);
    assert.equal(e.calls.filter(x=>x[0]==="play").length,0);
  }
  console.log("N4c native Bounce 3-ID preflight, wall/paddle/brick impacts, star/chomp, retry, paused silence and Web isolation passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
