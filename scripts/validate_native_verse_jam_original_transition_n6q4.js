/* N6q.4 — The actual ios-prep Verse Jam two-layer source score is
 * the compatibility contract. These mocked source checks do NOT prove
 * audible timing; Xcode on a real iPhone is the final music gate.
 */
"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_playground/verse_jam/game.js");
const controller=read("verse_games/shared/native-verse-jam-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const guide=read("docs/N6Q4-VERSE-JAM-ORIGINAL-TRANSITIONS.md");
function cut(start,end) {
  const i=game.indexOf(start); assert(i>=0,"missing "+start);
  const j=game.indexOf(end,i+start.length);assert(j>i,"missing "+end);
  return game.slice(i,j);
}
// These are the untouched values transcribed from ios-prep/game.js
// playRoundTransitionSting() and showRoundTransition(). Pitches/durations,
// waveforms, word notes and exact original WebAudio volumes are frozen.
const baseline=[
  [ // "Time / to / Jam!"
    [60,0,.42,.052,"triangle"],[67,0,.42,.048,"triangle"],
    [72,0,.46,.046,"triangle"],[76,1,.16,.040,"square"],
    [79,2,.18,.038,"square"],[84,3,.16,.030,"triangle"]
  ],
  [ // "Speed / it / up"
    [72,0,.14,.040,"square"],[76,1,.14,.038,"square"],
    [79,2,.20,.036,"square"],[84,3,.14,.026,"triangle"]
  ],
  [ // "Feel / that / groove"
    [67,0,.16,.038,"triangle"],[72,1,.16,.040,"square"],
    [79,2,.22,.038,"square"],[84,3,.16,.026,"triangle"]
  ]
];
const words={1:[76,79,84],2:[72,76,79],3:[67,72,79]};
async function actualPhrase(roundIndex, native) {
  const plays=[],painted=[],marks=[];
  const appArea={innerHTML:""};
  const stack={appendChild(x){painted.push(x.textContent);}};
  const win={
    nativeJamAudio:native?{traceTransition:(...args)=>marks.push(args)}:null,
    state:{screen:"game",paused:false,roundIndex},
    audioCtx:{currentTime:100},muted:false,MIX:{transition:1},
    secondsPerBeat:()=>.5,
    roundTransitionWords:()=>roundIndex===1?["time","to","jam!"]:
      roundIndex===2?["speed","it","up"]:["feel","that","groove"],
    document:{getElementById:id=>id==="versejamMainArea"?appArea:
      id==="versejamIntroStack"?stack:null,
      createElement:()=>({className:"",textContent:""})},
    playTone:note=>plays.push(note),
    waitUntilAudioTime:async()=>{},sleep:async()=>{},
    performance:{now:()=>100000}
  };
  vm.runInNewContext(cut("  function playRoundTransitionSting(",
    "  function playCompletionArpeggio(")+
    cut("  async function showRoundTransition(","  function explodeButton("),
    win,{filename:"actual Verse Jam transition functions"});
  const next=await win.showRoundTransition({alreadyAligned:true});
  const beatStart=native?100.26:100.08;
  assert(Math.abs(next-(beatStart+2))<.00001,"Original four beats retained");
  assert.deepStrictEqual(Array.from(painted),roundIndex===1?
    ["time","to","jam!"]:roundIndex===2?["speed","it","up"]:
    ["feel","that","groove"],"Original words and order retained");
  const original=baseline[roundIndex-1];
  assert.strictEqual(plays.length,original.length+3,
    "Source sting + three original per-word tones BOTH present");
  // Sting notes are submitted before the native word-note layer. Both
  // layers are near-future audio events, never an after-paint JS bridge.
  for(let i=0;i<original.length;i++){
    const [midi,offset,duration,volume,type]=original[i];
    const note=plays[i];
    assert.strictEqual(note.midi,midi);
    assert(Math.abs(note.when-(beatStart+offset*.5))<.00001);
    assert.strictEqual(note.duration,duration);
    assert.strictEqual(note.volume,volume);
    assert.strictEqual(note.type,type);
    if(native)assert.strictEqual(note.jamCue,"transition-sting");
  }
  for(let i=0;i<3;i++){
    const note=plays[original.length+i];
    assert.strictEqual(note.midi,words[roundIndex][i]);
    assert(Math.abs(note.when-(beatStart+i*.5))<.00001);
    assert.strictEqual(note.duration,.11);
    assert.strictEqual(note.volume,.045);
    assert.strictEqual(note.type,"square");
    if(native)assert.strictEqual(note.jamCue,"transition-word");
  }
  if(native) {
    assert.strictEqual(marks.filter(m=>m[0]==="phrase-scheduled").length,1);
    assert.strictEqual(marks.filter(m=>m[0]==="word-visible").length,3);
  } else {
    assert.strictEqual(marks.length,0,"Never call native bridge on web");
  }
}
async function actualBackgroundStop() {
  const events=[];
  let release;
  const waitStop=new Promise(resolve=>{release=resolve});
  const scope={
    state:{progressIndex:1,segments:["word"],roundIndex:0,screen:"game",
      paused:false,busy:true,menuOpen:false},
    musicGeneration:0,beatTimer:null,padTimer:null,
    nativeJamAudio:{
      stopGrooveForTransition:()=>{events.push("stop-groove");return waitStop;},
      stopVoices:()=>{events.push("wrong-full-stop");},
      traceTransition:(phase,round)=>events.push(phase+":"+round)
    },
    isGameplayFlowActive:()=>true,
    markPlaygroundPracticed:async()=>{},
    currentRoundConfigs:()=>[{},{}],
    waitUntilAudioTime:async()=>{},
    nextMeasureStartTime:()=>101,
    clearSleeps:()=>{},noteGameplayActivity:()=>{},
    updateRoundPill:()=>{},updateBuildText:()=>{},
    showRoundTransition:async()=>{events.push("phrase");return 103;},
    startBeatLoop:()=>events.push("new-groove"),
    startNextPlayableGroup:async()=>events.push("next-word"),
    cancelNativeJamTimers:()=>events.push("cancel-old-beats"),
    stopActiveAudioSources:()=>{},
    clearInterval:()=>{},
    window:{VerseGameBridge:{}}
  };
  const code=cut("  function stopMusic(","  function startBeatLoop(")+
    cut("  async function handleRoundOrEnd(","  function updateRoundPill(");
  vm.runInNewContext(code+"\nthis.go=handleRoundOrEnd;",scope,
    {filename:"actual Verse Jam end-round plus stopMusic"});
  const task=scope.go(1);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert(events.includes("stop-request:1"),"Stop is explicitly observed");
  assert(events.includes("stop-groove"),"Only drums/pads/filler voices stopped");
  assert(!events.includes("wrong-full-stop"),"NEVER stop+reprepare note voices");
  assert(!events.includes("phrase"),
    "The original chord must NOT be scheduled before Swift worker stop ACK");
  release({stopped:true});
  await task;
  assert(events.indexOf("stop-complete:1")>events.indexOf("stop-groove"),
    "Complete marker only after actual worker ACK");
  assert(events.indexOf("phrase")>events.indexOf("stop-complete:1"),
    "Original notes are queued once the stop has completed");
  assert(events.includes("new-groove")&&events.includes("next-word"),
    "After exactly four transition beats gameplay resumes normally");
}
async function nativeControllerContract() {
  const calls=[];
  const plugin={
    activateFromGesture:()=>Promise.resolve({ready:true}),
    preload:()=>Promise.resolve({prepared:true,durationMs:150}),
    play:x=>{calls.push(x);return Promise.resolve({accepted:true})},
    stop:()=>Promise.resolve({stopped:true}),
    stopEffect:x=>{calls.push(x);return Promise.resolve({stopped:true})},
    traceJamTransition:x=>{calls.push(x);return Promise.resolve({ok:true})},
    addListener:()=>Promise.resolve({remove(){}})
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:plugin}},
    document:{hidden:false,addEventListener(){}},
    addEventListener(){},setTimeout,clearTimeout
  };
  vm.runInNewContext(controller,{window:win},{filename:"native-jam-audio.js"});
  const owner=win.BibloZooNativeVerseJamAudio;
  assert.strictEqual(calls.length,0,"No passive bridge/session activation");
  assert((await owner.prepareFromGesture()).ready);
  assert((await owner.stopGrooveForTransition()).stopped,
    "Scoped native worker stop promises acknowledged completion");
  assert(calls.some(c=>c.soundId==="jam-groove"),
    "Only drums, pads and recorded voice clips stop");
  assert(owner.isReady(),"Warm note bank remains available for chord");
  const due=Date.now()+100;
  assert(owner.playTone(60,.42,.052,"triangle",due,"transition-sting"));
  assert(owner.playTone(76,.11,.045,"square",due,"transition-word"));
  const tones=calls.filter(c=>c.soundId==="jam-note");
  assert.deepStrictEqual(tones.map(c=>c.jamCue),
    ["transition-sting","transition-word"],
    "Swift receives precise source layer identifier");
  for(const tone of tones) {
    assert(tone.scheduledEpochMs===due,"Both layers share original beat deadline");
  }
  assert(owner.traceTransition("word-visible",1,0),
    "Xcode timing marker is gesture-free and carries only fixed word index");
  assert(!owner.traceTransition("arbitrary-user-text",1,0),
    "Arbitrary text must never enter native diagnostics");
  assert(calls.some(c=>c.phase==="word-visible"&&c.wordIndex===0),
    "Actual word appearance marker sent to native Debug Console");
}
async function main(){
  new vm.Script(game);new vm.Script(controller);
  assert(swift.includes('CAPPluginMethod(name: "traceJamTransition"'),
    "Xcode DEBUG bridge method must be registered in Capacitor");
  assert(swift.includes("if let cue = jamTraceCue"),
    "Swift must log each tagged note's actual worker lead and queue");
  assert(swift.includes('soundId == "jam-groove"'),
    "Native stop remains scoped; do not stop the note pool");
  assert(swift.includes("#if DEBUG"),"No release-build console spam");
  assert(workflow.includes("validate_native_verse_jam_original_transition_n6q4.js"),
    "New source parity regression must run on final CI head");
  assert(workflow.includes("swiftc -frontend -parse"),
    "Real Swift compiler syntax parse retained");
  assert(guide.includes("ios-prep"),"Owner guide records true reference behavior");
  assert(handoff.includes("N6q.4"),"Living handoff updated");
  for(const round of [1,2,3]){
    await actualPhrase(round,false);
    await actualPhrase(round,true);
  }
  await actualBackgroundStop();
  await nativeControllerContract();
  console.log("N6q.4 PASS: exact ios-prep sting+word note inventories, retained native chord, cold/web source parity, awaited scoped beat stop, no note-reprepare, DEBUG word/worker traces and real-gesture safe PCM owner.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
