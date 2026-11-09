/* N6q.3 — Real Verse Jam title/Choose Speed UI pop, Got It and
 * three between-round source-sting regressions. Node and Swift syntax
 * CI cannot prove speaker balance or Xcode/iPhone audio acceptance.
 */
"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert"),vm=require("vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_playground/verse_jam/game.js");
const native=read("verse_games/shared/native-verse-jam-audio.js");
const css=read("verse_playground/verse_jam/game.css");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const doc=read("docs/N6Q3-VERSE-JAM-UI-AND-TRANSITIONS.md");
const has=(text,fragment,why)=>assert(text.includes(fragment),why);
const extract=(start,end)=> {
  const i=game.indexOf(start);
  assert(i>=0,"Missing source start: "+start);
  const j=game.indexOf(end,i+start.length);
  assert(j>i,"Missing source end: "+end);
  return game.slice(i,j);
};

async function runTransition(roundIndex,isNative) {
  const plays=[],words=[],times=[];
  const stack={appendChild(el){words.push(el.textContent);}};
  const area={innerHTML:""};
  const scope={
    nativeJamAudio:isNative?{}:null,
    state:{roundIndex,screen:"game",paused:false},
    audioCtx:{currentTime:100},muted:false,MIX:{transition:1},
    secondsPerBeat:()=>0.5,
    roundTransitionWords:()=>roundIndex===1?["time","to","jam!"]:
      roundIndex===2?["speed","it","up"]:["feel","that","groove"],
    document:{
      getElementById:id=>id==="versejamMainArea"?area:
        id==="versejamIntroStack"?stack:null,
      createElement:()=>({className:"",textContent:""})
    },
    playTone:note=>plays.push(note),
    waitUntilAudioTime:async when=>{times.push(when);},
    sleep:async()=>{},
    performance:{now:()=>100000}
  };
  const code=extract("  function playRoundTransitionSting(", "  function playCompletionArpeggio(") +
    extract("  async function showRoundTransition(", "  function explodeButton(");
  vm.runInNewContext(code,scope,{filename:"Verse Jam actual transition functions"});
  const newGroove=await scope.showRoundTransition({alreadyAligned:true});
  assert.strictEqual(words.length,3,"Exactly three authored transition words");
  assert.strictEqual(Math.round(newGroove*100)/100,102.08,
    "Source four-beat transition duration retained");
  const expectedCount=roundIndex===1?6:4;
  assert.strictEqual(plays.length,expectedCount+(isNative?0:3),
    "Native uses source sting only; browser retains original extra word notes");
  const firstBeat=plays.filter(p=>Math.abs(p.when-100.08)<0.0001)
    .map(p=>p.midi);
  assert.deepStrictEqual(firstBeat,isNative?
    (roundIndex===1?[60,67,72]:roundIndex===2?[72]:[67]):
    (roundIndex===1?[60,67,72,76]:
      roundIndex===2?[72,72]:[67,67]),
    "First native word must retain authored chord/note with NO extra collision");
  for(let beat=0;beat<3;beat++)
    assert(plays.some(p=>Math.abs(p.when-(100.08+0.5*beat))<0.0001),
      "Each transition word must still have a pitched beat cue");
  return {plays,words,times};
}

async function main() {
  new vm.Script(game,{filename:"verse_jam/game.js"});
  new vm.Script(native,{filename:"native-verse-jam-audio.js"});
  has(css,".versejam-headphones-button.is-pressed",
    "Got It must have a visible pressed state beyond transient iOS :active");
  has(css,"transform: translateY(2px) scale(.98)",
    "Keep the original button depth press");
  has(game,"NATIVE_JAM_GOT_IT_PRESS_MS = 130",
    "Native Got It must paint pressed state before replacing screen");
  has(game,"remainingPressMs > 0",
    "Already-warm native preflight should not bypass press frame");
  has(game,"NATIVE_JAM_DRUM_HEADROOM = 0.72",
    "Native without Web compressor needs restrained initial kick gain");
  has(game,"startBeatLoop({cleanRestart: !nativeJamAudio})",
    "Do not stop/reprepare just-warmed note voices on first intro beat");
  has(game,"if (!nativeJamAudio) {\n        playTone({",
    "Web/PWA/Android must keep original word-note layer");
  has(game,"playRoundTransitionSting(transitionStart)",
    "Native source chord and melody remain intact");
  has(native,"isUiReady:()=>uiReady && !failed",
    "Native UI readiness separate from 13-ID game readiness");
  has(native,"Date.now() - uiGestureAt <= 350",
    "A cold speed pop cannot arrive seconds after Heads Up navigation");
  has(workflow,"validate_native_verse_jam_ui_phrases_n6q3.js",
    "Run all new scenarios in final HEAD GitHub CI");
  has(workflow,"swiftc -frontend -parse ios/App/App/BibloZooNativeSoundPlugin.swift",
    "Keep real Swift parse protection from N6q.2");
  has(doc,"physical iPhone","Owner acceptance guide must distinguish real audible output");
  has(handoff,"N6q.3","Maintain living project handoff for this fix");

  // Execute ACTUAL setScreen source: pregame navigation no longer throws
  // away the PCM UI bank while active gameplay/end still gets stopped.
  const nav=[];
  const scopeNav={
    state:{screen:"intro"},nativeJamAudio:{},
    nativeJamHeadsUpPrewarm:null,
    stopRun:opts=>nav.push(opts),render:()=>{}
  };
  vm.runInNewContext(extract("  function setScreen(screen) {","  function render() {"),
    scopeNav,{filename:"Verse Jam actual setScreen"});
  scopeNav.setScreen("mode");
  assert.strictEqual(nav.at(-1).keepNativeReady,true,
    "Title -> Choose Your Speed keeps native UI-pop bank");
  scopeNav.setScreen("intro");
  assert.strictEqual(nav.at(-1).keepNativeReady,true,
    "Choose Your Speed -> title back keeps UI-pop bank");
  scopeNav.nativeJamHeadsUpPrewarm={promise:Promise.resolve()};
  scopeNav.setScreen("headphones");
  assert.strictEqual(nav.at(-1).keepNativeReady,true,
    "Speed selection preserves ongoing expensive game bank");
  scopeNav.setScreen("end");
  assert.strictEqual(nav.at(-1).keepNativeReady,false,
    "End still discards prepared bank on non-pregame screen");
  scopeNav.setScreen("game");
  assert.strictEqual(nav.length,4,"Do not stop audio merely entering gameplay");

  // Execute ACTUAL Got It click handler to verify painted press and
  // synchronous beginRun gesture, without inventing a synthetic preflight.
  const handlers={};
  const classes=[];
  const gotIt={
    disabled:false,classList:{add:value=>classes.push(value)},
    addEventListener:(name,fn)=>{handlers[name]=fn;}
  };
  const runs=[];
  const state={screen:"headphones"};
  const pressScope={
    app:{innerHTML:""},document:{getElementById:()=>gotIt},
    wireUiTapButtons:()=>{},nativeJamAudio:{},performance:{now:()=>1125},
    state,selectedMode:"fast",
    beginRun:(...args)=>{runs.push(args);return Promise.resolve();}
  };
  vm.runInNewContext(extract("  function renderHeadphonesWarning() {",
    "  function renderEnd() {"),pressScope,
    {filename:"Verse Jam actual Got It click handler"});
  pressScope.renderHeadphonesWarning();
  handlers.click();
  assert.strictEqual(state.screen,"game");
  assert.strictEqual(gotIt.disabled,true);
  assert(classes.includes("is-pressed"),"Got It must paint pressed state");
  assert.strictEqual(runs.length,1);
  assert.strictEqual(runs[0][2],1125,"Min press time passed to beginRun");
  assert.strictEqual(runs[0][0],"fast");

  // Run the ACTUAL native-first drum dispatch to verify the initial
  // kick keeps its original fixed PCM shape while staying below the
  // no-compressor mixer headroom (and with the same intended beat time).
  const drums=[];
  const drumScope={
    nativeJamAudio:{playDrum:(sound,volume,due)=>{
      drums.push({sound,volume,due});return true;
    }}, musicGeneration:0, MIX:{drumMaster:2},
    drumVolume:volume=>volume*2, NATIVE_JAM_DRUM_HEADROOM:.72,
    scheduleNativeJam:(when,callback)=>{callback(100080);return true;}
  };
  vm.runInNewContext(extract("  function playDrum(", "  function scheduleDrumLoopBar("),
    drumScope,{filename:"Verse Jam actual native drum-volume path"});
  drumScope.playDrum("kick",100.08,1);
  assert.strictEqual(drums.length,1);
  assert(Math.abs(drums[0].volume-.72)<.000001,
    "First native kick must have headroom without modifying source PCM recipe");
  assert.strictEqual(drums[0].due,100080,
    "Native kick still uses original beat-ahead host timestamp");

  // Execute ACTUAL native controller with sole mocked Capacitor plugin.
  const calls={activation:[],preload:[],play:[],stop:[]};
  const plugin={
    activateFromGesture:p=>{calls.activation.push(p);
      return Promise.resolve({ready:true});},
    preload:p=>{calls.preload.push(p);
      return Promise.resolve({prepared:true,durationMs:110});},
    play:p=>{calls.play.push(p);return Promise.resolve({accepted:true});},
    stop:p=>{calls.stop.push(p);return Promise.resolve({stopped:true});},
    stopEffect:()=>Promise.resolve({stopped:true}),
    addListener:()=>Promise.resolve({remove(){}})
  };
  const fake={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:plugin}},
    document:{hidden:false,addEventListener(){}},
    addEventListener(){},setTimeout,clearTimeout
  };
  vm.runInNewContext(native,{window:fake},
    {filename:"Verse Jam actual native UI controller"});
  const audio=fake.BibloZooNativeVerseJamAudio;
  assert(!audio.isUiReady(),"No native UI prewarm on page load");
  assert.strictEqual(calls.activation.length,0,"No passive session activation");
  assert(audio.tapUiFromGesture(0,.12),
    "Real first title pointerdown starts one native UI preflight");
  await new Promise(resolve=>setTimeout(resolve,0));
  assert(audio.isUiReady(),"UI bank must warm independently of full game bank");
  assert(calls.play.some(x=>x.soundId==="ui-pop-1"),
    "Cold title pop should play promptly when source is ready");
  assert(audio.tapUiFromGesture(1,.12),
    "Choose Your Speed pointerdown can play second original UI pop");
  assert(calls.play.some(x=>x.soundId==="ui-pop-2"),
    "Speed-selection UI sound routed through original prepared PCM");
  assert.strictEqual(calls.stop.length,0,
    "Keeping pregame bank warm never stops native effect owner");
  const warm=await audio.prepareFromGesture();
  assert.strictEqual(warm.ready,true);
  assert(audio.isReady()&&audio.isUiReady(),
    "After speed selection both original UI and 13-ID Jam sounds ready");
  assert.strictEqual(calls.stop.length,0,
    "Game prewarm must not discard perfectly usable UI bank");

  for(const round of [1,2,3]){
    await runTransition(round,true);
    await runTransition(round,false);
  }
  console.log("N6q.3 PASS: real title/mode PCM UI pops survive navigation, Got It painted press, moderated native opening kick, all 3 source-sting transitions with NO duplicate native word note and unchanged original web arrangement.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
