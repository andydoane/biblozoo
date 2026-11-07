"use strict";
// N4a VM/source check: not a Swift compile or audible-speaker assertion.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const js=read("daily_questions_feed_game.js"),pilot=read("verse_games/shared/feeding-native-audio-pilot.js");
const ci=read(".github/workflows/ios-prep-validation.yml");
const between=(src,a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return src.slice(i,j);};
const melody=between(js,"  function playMelodyTone(runtime, midi) {","  function stopMelodyVoices(runtime) {");
const begin=between(js,"  async function startPreviewRoundWithAudioChoice(runtime) {","  function startRound(runtime) {");
const resume=between(js,"  function attemptFeedingResumeFromGesture(","  function attachFeedInterruptionHandlers(");
const continued=between(js,"  function continueFeedingAfterGesture(","  // Called by a real click");
const caught=between(js,"  function catchMelodyNote(runtime, ball) {","  function updateMelodyMode(");
assert.match(pilot,/const MELODY_IDS = Object\.freeze\(\["feed-melody"\]\)/);
assert.match(pilot,/const selectedIds = mode === "melody" \? MELODY_IDS :/);
assert.match(pilot,/mode === "labyrinth" \? LABYRINTH_IDS :/);
assert.match(pilot,/mode === "bounce" \? BOUNCE_IDS : IDS/,
  "N4c keeps Melody strictly isolated from Bounce/Classic/Labyrinth");
assert.match(pilot,/noteIndex < MELODY_MIDI_MIN/);
assert.match(pilot,/noteIndex > MELODY_MIDI_MAX/);
assert.match(pilot,/soundId === "feed-melody" \? \{ midi: noteIndex \}/);
assert.match(begin,/mode: runtime\.mode === FEED_MODES\.MELODY \? "melody" :/);
assert.match(begin,/runtime\.mode === FEED_MODES\.LABYRINTH \? "labyrinth" :/);
assert.match(begin,/runtime\.mode === FEED_MODES\.BOUNCE \? "bounce" : "classic"/,
  "N4c retains Labyrinth and adds Bounce mode without replacing Classic");
assert.match(begin,/if \(result\?\.ready !== true \|\| !pilot\) \{[\s\S]*?return;/);
assert.match(melody,/if \(runtime\?\.nativePilotBackend === "native"\)/);
assert.match(melody,/runtime\.nativePilot\.play\("feed-melody"/);
assert.match(melody,/context\.createOscillator\(\)/);
assert.match(caught,/playMelodyTone\(runtime, entry\.midi\)/);
assert.match(caught,/runtime\.caughtCount \+= 1/);
assert.match(resume,/runtime\.nativePilot\?\.prepare\?\.\(\)/);
assert.match(resume,/continueFeedingAfterGesture\(runtime, performance\.now\(\), false\)/);
assert.match(continued,/shiftFeedingDeadlines\(runtime, elapsed\)/);
assert.match(continued,/resumeMelodyAfterInterruption\(runtime, now\)/);
assert.match(js,/nativeOnlyApp && \[FEED_MODES\.MELODY, FEED_MODES\.LABYRINTH, FEED_MODES\.BOUNCE\]\.includes\(mode\)/,
  "N4c preserves N4a native Melody alongside Labyrinth and Bounce");
assert.match(js,/if \(runtime\.nativePilotBackend !== "native"\) runtime\.zooEscape\?\.start/);
assert.match(ci,/node scripts\/validate_native_melody_gameplay_n4a\.js/);

function harness({nativeOnly=true,platform="ios",preloadOk=true}={}){
  const calls=[],document={hidden:false},api={
    async activateFromGesture({purpose}){calls.push(["activate",purpose]);return {ready:true};},
    async preload({soundId}){calls.push(["preload",soundId]);return preloadOk?{prepared:true}:{prepared:false,reason:"interruption-pending"};},
    async play(args){calls.push(["play",JSON.parse(JSON.stringify(args))]);return {accepted:true};},
    async stop({soundId}){calls.push(["stop",soundId]);return {stopped:true};}
  };
  const window={document,Capacitor:{isNativePlatform:()=>platform!=="web",getPlatform:()=>platform,Plugins:{BibloZooNativeSound:api}},BibloZooNativeOnlyOutput:{enabled:nativeOnly},location:{protocol:"https:"},devicePixelRatio:1,setTimeout,clearTimeout};
  const vmContext={window,document,Date,Promise,Math,console,performance:{now:()=>1000},setTimeout,clearTimeout,requestAnimationFrame:()=>77,cancelAnimationFrame:()=>{},Image:class{},Audio:class{constructor(){throw Error("HTML audio in native test");}},fetch:()=>Promise.reject(Error("no network"))};
  vm.runInNewContext(pilot,vmContext);
  const marker="  window.BibloZooDailyFeedGame = Object.freeze({";
  const hooks="  window.__N4={setRuntime(value){activeRuntime=value;},start:startPreviewRoundWithAudioChoice,playMelodyTone,render,resume:attemptFeedingResumeFromGesture};\n"+marker;
  const code=js.replace("  function startRound(runtime) {","  function startRound(runtime) { if(window.__interceptStart){window.__interceptStart(runtime);return;}").replace(marker,hooks);
  vm.runInNewContext(code,vmContext);
  return {window,api,calls,hooks:window.__N4};
}
function runtime(){return {nativePilotAllowed:true,nativePilotCheckbox:null,nativePilotChoicePending:false,nativePilotBackend:"web",nativePilot:null,nativePilotBadge:{textContent:""},nativePilotChoiceStatus:{textContent:""},startConfirmButton:{textContent:"Got It!",disabled:false},roundStarted:false,controlPhase:"instructions",finished:false,feedPageHidden:false,mode:"melody",audioContext:null,starAudio:null,chompAudio:null,melody:{pausedAt:null,activeVoices:new Set()},feedSoundNodes:new Set(),running:true,feedPausedAt:null};}
async function main(){
  const h=harness(),r=runtime();let starts=0;
  const html=h.hooks.render({session:{feedMode:"melody",petName:"BibloPet"}});
  assert.doesNotMatch(html,/Native Melody: prepare/);
  assert.match(html,/data-daily-feed-native-choice-status/);
  assert.doesNotMatch(html,/data-daily-feed-native-opt-in/);
  h.window.__interceptStart=x=>{starts++;x.roundStarted=true;};
  h.hooks.setRuntime(r);
  await h.hooks.start(r);
  assert.equal(starts,1);assert.equal(r.nativePilotBackend,"native");
  assert.equal(r.audioContext,null);
  assert.deepEqual(h.calls.map(x=>x[0]),["activate","preload"]);
  assert.equal(h.calls[1][1],"feed-melody");
  assert.ok(r.nativePilot.isReady());
  for(const note of [55,64,83])assert.equal(h.hooks.playMelodyTone(r,note),true);
  for(const note of [54,84,64.5])assert.equal(h.hooks.playMelodyTone(r,note),false);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(h.calls.filter(x=>x[0]==="play").map(x=>x[1].midi),[55,64,83]);
  assert.ok(h.calls.filter(x=>x[0]==="play").every(x=>x[1].soundId==="feed-melody"&&x[1].volume===0.25&&!Object.hasOwn(x[1],"noteIndex")));
  r.feedPausedAt=500;assert.equal(h.hooks.playMelodyTone(r,64),false);
  r.feedPausedAt=null;r.melody.pausedAt=500;assert.equal(h.hooks.playMelodyTone(r,64),false);
  r.melody.pausedAt=null;r.nativePilot.stop();assert.equal(h.hooks.playMelodyTone(r,64),false);
  assert.deepEqual(h.calls.filter(x=>x[0]==="stop").map(x=>x[1]),["feed-melody"]);

  const fail=harness({preloadOk:false}),fr=runtime();let failStarts=0;
  fail.window.__interceptStart=x=>{failStarts++;x.roundStarted=true;};
  fail.hooks.setRuntime(fr);await fail.hooks.start(fr);
  assert.equal(failStarts,0);assert.equal(fr.nativePilot,null);
  assert.equal(fr.controlPhase,"instructions");
  assert.equal(fr.startConfirmButton.textContent,"Try Again");
  assert.match(fr.nativePilotChoiceStatus.textContent,/Sound isn't ready yet/);
  assert.match(fr.nativePilotBadge.textContent,/interruption-pending/);
  fail.api.preload=async({soundId})=>{fail.calls.push(["preload",soundId]);return {prepared:true};};
  await fail.hooks.start(fr);assert.equal(failStarts,1);
  assert.equal(fr.nativePilotBackend,"native");
  const web=harness({nativeOnly:false,platform:"web"});
  assert.equal(web.window.BibloZooFeedingNativeAudioPilot.create({mode:"melody",isCurrent:()=>true}),null);
  assert.doesNotMatch(web.hooks.render({session:{feedMode:"melody"}}),/Native Melody: prepare notes on Got It!/);
  console.log("N4a mode-specific Melody native Got It, catch MIDI 55–83, silence on pause, retry, no Web regression passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
