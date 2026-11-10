/* N6q.5 — Owner-reported Groovy Score -> Great! -> Ending sound race.
 * Test ACTUAL Verse Jam functions plus the actual isolated native controller.
 * Source parity is drawn from ios-prep. Node + Swift parse != iPhone hearing.
 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert");
const base=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const game=read("verse_playground/verse_jam/game.js");
const native=read("verse_games/shared/native-verse-jam-audio.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const guide=read("docs/N6Q5-VERSE-JAM-GREAT-FINALE.md");
const handoff=read("docs/PROJECT-HANDOFF.md");

function extract(start,end) {
  const i=game.indexOf(start),j=game.indexOf(end,i+start.length);
  assert(i>=0&&j>i,"Source function boundary missing: "+start);
  return game.slice(i,j);
}

// Frozen ios-prep source playCompletionArpeggio() score: same ordered
// note/duration/volume/waveform; no native reductions or replacement jingle.
const original=[
  [60,0,.16,.075,"square"],[64,.08,.16,.070,"square"],
  [67,.16,.18,.068,"square"],[72,.25,.22,.066,"square"],
  [76,.36,.24,.056,"triangle"],[79,.48,.28,.050,"triangle"],
  [84,.62,.42,.045,"triangle"],[91,.80,.18,.030,"triangle"]
];

async function playRealFinale({isNative}) {
  const events=[],notes=[],scores=[],handlers={};
  let releaseStop=()=>{},releaseHold=()=>{};
  const stopPending=new Promise(resolve=>{releaseStop=resolve});
  const button={
    disabled:false,textContent:"Tap to Continue",
    addEventListener:(type,fn)=>{handlers[type]=fn}
  };
  const area={innerHTML:""};
  const state={
    screen:"game",groovyScore:17,phase:"score",completed:false,
    acceptingInput:true,busy:true,paused:false,
    resumeAfterMenu:false,resumeAfterInterruption:false,
    resumeBeatApproved:false,interruptedPhase:"",currentButtons:[1]
  };
  const root={
    nativeJamAudio:isNative?{
      stopGrooveForFinale:()=>{
        events.push("native-scoped-stop-request");
        return stopPending;
      },
      stop:()=>{events.push("WRONG-full-bank-stop");return Promise.resolve()}
    }:null,
    state,
    audioCtx:{currentTime:100},muted:false,
    NATIVE_JAM_FINALE_LEAD_SECONDS:.22,
    NATIVE_JAM_FINALE_SCREEN_HOLD_MS:440,
    MIX:{finalArpeggio:1},ctx:{verseId:"fake-verse"},GAME_ID:"verse-jam",
    window:{VerseGameBridge:{
      markPlaygroundCompleted:obj=>{scores.push(obj);events.push("completed-once")}
    }},
    nativeJamHeadsUpPrewarm:null,
    nativeJamAwaitingStart:false,
    resumeBeatGestureGeneration:0,resumeBeatInFlight:false,
    hideResumeBeatOverlay:()=>{},
    beginGameplayFlow:()=>{events.push("cancel-old-gameplay");return 2},
    stopGameplayWatchdog:()=>{},clearSleeps:()=>{},
    stopMusic:opts=>{events.push(opts?.stopAudio===false?
      "stop-old-JS-beat":"web-original-stop-music")},
    clearNativeJamFailure:()=>{},
    playTone:n=>{notes.push({...n});events.push("note:"+n.midi)},
    sleep:ms=>{events.push("visual-hold:"+ms);
      return new Promise(resolve=>{releaseHold=resolve})},
    render:()=>events.push("ending-screen-rendered"),
    playScoreRevealSparkle:()=>events.push("score-reveal"),
    noteGameplayActivity:()=>{},
    isGameplayFlowActive:()=>true,
    document:{getElementById:id=>id==="versejamMainArea"?area:
      id==="verseJamScoreContinue"?button:null},
    console
  };
  const source=extract("  function stopRun(", "  async function beginRun(")+
    extract("  function playCompletionArpeggio(", "  function playScoreRevealSparkle(")+
    extract("  async function finishToEndScreen()", "  async function showGroovyScoreScreen(")+
    extract("  async function showGroovyScoreScreen(", "  async function finishAfterEndingSequence(");
  vm.runInNewContext(source,root,{filename:"actual Verse Jam Great/finale path"});

  const screenFinished=root.showGroovyScoreScreen(1);
  assert.strictEqual(state.phase,"score");
  assert(events.includes("score-reveal"),"Original score reveal remains");
  assert(typeof handlers.click==="function","Actual score button listener bound");
  handlers.click();
  assert.strictEqual(button.textContent,"Great!",
    "Owner gets immediate Great! feedback on their real score click");
  assert.strictEqual(button.disabled,true,"Reward only one score click");
  assert.strictEqual(scores.length,1,"Verse completion must be single-shot");

  if(isNative){
    assert(events.includes("stop-old-JS-beat"),"Music timer stops");
    assert(events.includes("native-scoped-stop-request"),
      "Finale uses scoped Swift groove stop, not a whole PCM discard");
    assert(!events.includes("WRONG-full-bank-stop"),
      "Finale cannot dispose the 12 hot original note voices");
    assert.strictEqual(notes.length,0,
      "NO arpeggio may reach Swift until its serial worker confirms groove stop");
    assert(!events.includes("ending-screen-rendered"),
      "Do not show End screen before native note scheduling even begins");
    releaseStop({stopped:true});
  }
  // The real score click, finish function and Swift-stop Promise each cross
  // an async boundary. Give the VM a full event-loop turn for that native
  // acknowledgment to propagate; never assert before its microtasks settle.
  await new Promise(resolve=>setImmediate(resolve));

  assert.strictEqual(notes.length,8,
    "Original seven-note C-major arpeggio AND sparkle retained");
  assert.strictEqual(scores.length,1,"End reward never reissued");
  const start=100+(isNative?.22:.03);
  for(let i=0;i<original.length;i++){
    const [midi,delay,duration,volume,type]=original[i];
    assert.strictEqual(notes[i].midi,midi);
    assert.strictEqual(notes[i].type,type);
    assert(Math.abs(notes[i].when-(start+delay))<1e-9,
      "Keep ios-prep note spacing; only increase native host-time lookahead");
    assert.strictEqual(notes[i].duration,duration);
    assert.strictEqual(notes[i].volume,volume);
  }
  assert(!events.includes("ending-screen-rendered"),
    "The first note must be scheduled before ending screen appears");
  assert(events.includes("visual-hold:"+(isNative?440:900)),
    "Native holds through first melody notes; original web waits 900ms");
  releaseHold();
  await screenFinished;
  assert.strictEqual(state.screen,"end");
  assert.strictEqual(events.at(-1),"ending-screen-rendered");
  assert.strictEqual(events.filter(e=>e==="completed-once").length,1);
  assert.strictEqual(events.filter(e=>e==="ending-screen-rendered").length,1);
  assert.strictEqual(events.filter(e=>e.startsWith("note:")).length,8);
  if(!isNative)assert(!events.includes("native-scoped-stop-request"),
    "No native bridge involved in original WebAudio score flow");
}

async function nativePromiseContract(){
  const calls=[];
  let release;
  const pending=new Promise(resolve=>{release=resolve});
  const plugin={
    activateFromGesture:()=>Promise.resolve({ready:true}),
    preload:()=>Promise.resolve({prepared:true,durationMs:100}),
    play:()=>Promise.resolve({accepted:true}),
    stop:()=>Promise.resolve({stopped:true}),
    stopEffect:req=>{calls.push(req);return pending},
    addListener:()=>Promise.resolve({remove(){}})
  };
  const root={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:plugin}},
    document:{hidden:false,addEventListener(){}},
    addEventListener(){},setTimeout,clearTimeout
  };
  vm.runInNewContext(native,{window:root},
    {filename:"real native Verse Jam controller"});
  const jam=root.BibloZooNativeVerseJamAudio;
  assert.strictEqual(calls.length,0,"No passive session/stop on load");
  assert((await jam.prepareFromGesture()).ready,"Owner's game bank is warm");
  const request=jam.stopGrooveForFinale();
  assert.strictEqual(typeof request.then,"function",
    "Great stop must return Promise, NOT void fire-and-forget");
  assert.strictEqual(calls.length,1);
  assert.strictEqual(calls[0].soundId,"jam-groove",
    "Scoped stop preserves 12-note pool and original eight-note finale");
  let acknowledged=false;
  request.then(()=>{acknowledged=true});
  await Promise.resolve();
  assert.strictEqual(acknowledged,false,
    "A queued Swift stop is not falsely reported finished immediately");
  release({stopped:true});
  assert.strictEqual((await request).stopped,true);
  assert(jam.isReady(),"Native note pool remains ready for the C-major cue");
}

async function main(){
  new vm.Script(game);new vm.Script(native);
  assert(game.includes("await finaleGrooveStop"),
    "Great must wait for actual Swift groove-stop acknowledgment");
  assert(game.includes("NATIVE_JAM_FINALE_LEAD_SECONDS = 0.22"));
  assert(game.includes("NATIVE_JAM_FINALE_SCREEN_HOLD_MS = 440"));
  assert(game.includes("nativeJamAudio.stopGrooveForFinale()"),
    "Only final-score path may request the scoped finale stop");
  assert(!game.includes("await sleep(nativeJamAudio ? 260 : 900)"),
    "Do not render End screen before the initial notes can start");
  assert(workflow.includes("validate_native_verse_jam_score_finale_n6q5.js"),
    "N6q.5 regression required in final-HEAD GitHub Actions");
  assert(workflow.includes("swiftc -frontend -parse"),
    "Whole Swift plugin syntax check remains");
  assert(guide.includes("ios-prep")&&guide.includes("physical iPhone"),
    "Document original score and physical-device acceptance");
  assert(handoff.includes("N6q.5"),"Every PR updates living online handoff");
  await playRealFinale({isNative:true});
  await playRealFinale({isNative:false});
  await nativePromiseContract();
  console.log("N6q.5 PASS: actual Great click, wait for scoped native worker ACK, all eight original C-major finale/sparkle notes before Ending screen, preserved exact web 900ms path, no duplicate reward.");
}
main().catch(e=>{console.error(e);process.exitCode=1});
