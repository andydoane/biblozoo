"use strict";
// N4b uses the actual Feeding JS in a VM; source mocks do not compile Swift
// or prove physical iPhone audibility.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const game=read("daily_questions_feed_game.js"),pilot=read("verse_games/shared/feeding-native-audio-pilot.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift"),workflow=read(".github/workflows/ios-prep-validation.yml");
const between=(src,a,b)=>{let i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,"Missing "+a);return src.slice(i,j);};
const begin=between(game,"  async function startPreviewRoundWithAudioChoice(runtime) {","  function startRound(runtime) {");
const peg=between(game,"  function playPegTone(runtime, now) {","  function playStarSound(runtime, collisionEpochMs) {");
const labyrinth=between(game,"  function updateLabyrinthBall(","  function advanceLabyrinthPet(");
const catchBall=between(game,"  function catchBall(runtime, ball) {","  function updateBall(runtime, ball, dt, now) {");
const resume=between(game,"  function attemptFeedingResumeFromGesture(","  function attachFeedInterruptionHandlers(");
assert.match(pilot,/const LABYRINTH_IDS = Object\.freeze\(\["feed-star", "feed-chomp", "feed-peg"\]\)/);
assert.match(pilot,/\["classic", "labyrinth", "melody", "bounce"\]/,
  "N4c retains all earlier native sound-mode profiles");
assert.match(pilot,/mode === "labyrinth" \? LABYRINTH_IDS :/);
assert.match(pilot,/mode === "bounce" \? BOUNCE_IDS : IDS/);
assert.match(begin,/runtime\.mode === FEED_MODES\.LABYRINTH \? "labyrinth" :/);
assert.match(begin,/runtime\.mode === FEED_MODES\.BOUNCE \? "bounce" : "classic"/,
  "N4c retains Labyrinth and adds Bounce mode without replacing Classic");
assert.match(begin,/if \(result\?\.ready !== true \|\| !pilot\) \{[\s\S]*?return;/);
assert.match(peg,/FEED_MODES\.LABYRINTH/);
assert.match(peg,/runtime\.nativePilot\?\.play\("feed-peg"/);
assert.match(peg,/now - runtime\.lastPegSoundAt < 55/);
assert.match(peg,/context\.createOscillator\(\)/); // Web unchanged
assert.match(labyrinth,/hitPlatform && impactSpeed >[\s\S]*?LABYRINTH_IMPACT_SOUND_GAP_MS/);
assert.match(labyrinth,/playPegTone\(runtime, now\)/);
assert.match(catchBall,/runtime\.score \+= ball\.points/);
assert.match(catchBall,/runtime\.caughtCount \+= 1/);
assert.match(catchBall,/playChompSound\(runtime, collisionEpochMs\)/);
assert.match(resume,/runtime\.nativePilot\?\.prepare\?\.\(\)/);
assert.match(swift,/private let nativePegSoundID = "feed-peg"/);
// The N4b prewarmed effects remain in Swift's fixed set after N6b adds Snake IDs.
assert.match(swift,/private let pcmEffectIDs: Set<String> = \[\s*"feed-star", "feed-chomp", "ui-pop-1", "ui-pop-2"(?:,\s*"[a-z0-9-]+")*\s*\]/);
assert.match(workflow,/node scripts\/validate_native_labyrinth_gameplay_n4b\.js/);

function harness({platform="ios",nativeOnly=true,failSound=""}={}){
  const calls=[],document={hidden:false},api={
    async activateFromGesture({purpose}){calls.push(["activate",purpose]);return {ready:true};},
    async preload({soundId}){calls.push(["preload",soundId]);return soundId===failSound?
      {prepared:false,reason:"native-preload-refused"}:{prepared:true,reason:"prepared"};},
    async play(args){calls.push(["play",JSON.parse(JSON.stringify(args))]);return {accepted:true,reason:"scheduled"};},
    async stop({soundId}){calls.push(["stop",soundId]);return {stopped:true};}
  };
  const window={document,Capacitor:{isNativePlatform:()=>platform!=="web",getPlatform:()=>platform,Plugins:{BibloZooNativeSound:api}},
    BibloZooNativeOnlyOutput:{enabled:nativeOnly},location:{protocol:"https:"},devicePixelRatio:1,setTimeout,clearTimeout};
  const sandbox={window,document,Date,Promise,Math,console,performance:{now:()=>1000},
    setTimeout,clearTimeout,requestAnimationFrame:()=>5,cancelAnimationFrame:()=>{},Image:class{},
    Audio:class{constructor(){throw Error("No HTML Audio in native Labyrinth");}},
    fetch:()=>Promise.reject(Error("no fetch"))};
  vm.runInNewContext(pilot,sandbox,{filename:"feeding-native-audio-pilot.js"});
  const marker="  window.BibloZooDailyFeedGame = Object.freeze({";
  const hooks='  window.__N4b={setRuntime(value){activeRuntime=value;},render,startNative:startPreviewRoundWithAudioChoice,peg:playPegTone,chomp:playChompSound,star:playStarSound};\n'+marker;
  const code=game.replace("  function startRound(runtime) {",
    "  function startRound(runtime) { if(window.__interceptStart){window.__interceptStart(runtime);return;}"
  ).replace(marker,hooks);
  vm.runInNewContext(code,sandbox,{filename:"daily_questions_feed_game.js"});
  return {window,api,calls,hooks:window.__N4b};
}
function makeRuntime(mode="labyrinth"){
  return {mode,nativePilotAllowed:true,nativePilotCheckbox:null,nativePilotChoicePending:false,
    nativePilotBackend:"web",nativePilot:null,nativePilotBadge:{textContent:""},
    nativePilotChoiceStatus:{textContent:""},startConfirmButton:{textContent:"Got It!",disabled:false},
    roundStarted:false,controlPhase:"instructions",finished:false,feedPageHidden:false,
    audioContext:null,starAudio:null,chompAudio:null,feedPausedAt:null,
    lastPegSoundAt:0,lastPegNoteIndex:-1,score:7,caughtCount:2};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
  {
    const e=harness(),html=e.hooks.render({session:{feedMode:"labyrinth",petName:"BibloPet"}});
    assert.doesNotMatch(html,/Native Labyrinth: prepare/);
    assert.match(html,/data-daily-feed-native-choice-status/);
    assert.doesNotMatch(html,/data-daily-feed-native-opt-in/);
    const w=harness({platform:"web",nativeOnly:false});
    assert.doesNotMatch(w.hooks.render({session:{feedMode:"labyrinth"}}),/Native Labyrinth: prepare/);
    assert.equal(w.window.BibloZooFeedingNativeAudioPilot.create({mode:"labyrinth",isCurrent:()=>true}),null);
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
    assert.match(r.nativePilotBadge.textContent,/Labyrinth tones\/catches ready/);
    assert.ok(r.nativePilot.isReady());
    e.hooks.peg(r,1000);e.hooks.peg(r,1020);e.hooks.peg(r,1060);
    e.hooks.star(r,Date.now());e.hooks.chomp(r,Date.now());
    await flush();
    const played=e.calls.filter(x=>x[0]==="play").map(x=>x[1]);
    assert.deepEqual(played.map(x=>x.soundId),["feed-peg","feed-peg","feed-star","feed-chomp"]);
    assert.notEqual(played[0].noteIndex,played[1].noteIndex);
    assert.ok([played[0].noteIndex,played[1].noteIndex].every(x=>Number.isInteger(x)&&x>=0&&x<6));
    assert.ok(!played.some(x=>Object.hasOwn(x,"midi")));
    assert.ok(played.every(x=>x.volume>0&&x.volume<=1));
    assert.equal(r.score,7);assert.equal(r.caughtCount,2);
    r.feedPausedAt=3000;e.hooks.peg(r,3100);
    assert.equal(e.calls.filter(x=>x[0]==="play").length,4);
    r.feedPausedAt=null;r.nativePilot.stop();
    e.hooks.peg(r,3200);
    assert.deepEqual(e.calls.filter(x=>x[0]==="stop").map(x=>x[1]),["feed-star","feed-chomp","feed-peg"]);
  }
  {
    // A refused preflight never starts a known silent Labyrinth round;
    // the second human Got It! can deliberately retry.
    const e=harness({failSound:"feed-peg"}),r=makeRuntime();let starts=0;
    e.window.__interceptStart=x=>{starts++;x.roundStarted=true;};
    e.hooks.setRuntime(r);await e.hooks.startNative(r);
    assert.equal(starts,0);assert.equal(r.roundStarted,false);
    assert.equal(r.controlPhase,"instructions");
    assert.equal(r.startConfirmButton.textContent,"Try Again");
    assert.match(r.nativePilotChoiceStatus.textContent,/Sound isn't ready yet/);
    assert.match(r.nativePilotBadge.textContent,/native-preload-refused/);
    assert.ok(!e.calls.some(x=>x[0]==="play"));
    e.api.preload=async({soundId})=>{e.calls.push(["preload",soundId]);return {prepared:true};};
    await e.hooks.startNative(r);assert.equal(starts,1);
    assert.equal(r.nativePilotBackend,"native");
  }
  {
    // Mode allowlist: Melody MIDI notes cannot escape into Labyrinth.
    const e=harness(),r=makeRuntime();e.hooks.setRuntime(r);
    e.window.__interceptStart=x=>{x.roundStarted=true;};
    await e.hooks.startNative(r);
    assert.equal(r.nativePilot.play("feed-melody",0.2,Date.now(),64),false);
    assert.equal(r.nativePilot.play("pilot-unlock",0.2,Date.now()),false);
    const melody=e.window.BibloZooFeedingNativeAudioPilot.create({mode:"melody",isCurrent:()=>true});
    assert.equal(melody.play("feed-peg",0.2,Date.now(),0),false);
  }
  console.log("N4b real native Labyrinth Got It, 3-ID preload, peg/bonus/catch dispatch, retry, score and Web isolation passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
