"use strict";
/* Shared cue-first Zoo transition for 12 standalone verse games and
 * compatible Playground games. Runs the actual shared return adapter in
 * an isolated DOM with advancing HTML / native AVAudioPlayer clock fakes.
 * Source/CI cannot prove actual physical iPhone speaker output.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const shared = read("verse_games/shared/welcome-back-return.js");
const shell = read("verse_games/shared/game-shell.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const typer = read("verse_playground/verse_typer/game.js");
const scrub = read("verse_playground/scripture_scrub/game.js");
assert.match(typer,/playgroundWelcome\?\.pauseFromNativeInactive\?\.\(\)/,
  "Verse Typer routes UIKit inactive into shared native-return lifecycle");
assert.match(scrub,/playgroundWelcome\?\.pauseFromNativeInactive\?\.\(\)/,
  "Scripture Scrub routes UIKit inactive into shared native-return lifecycle");
assert.match(typer,/const paused = playgroundWelcome\?\.pauseFromNativeInactive\?\.\(\) === true/,
  "interrupted Typer narration uses explicit retryable Welcome Back rather than gray modal");
assert.match(scrub,/mowerActive && !mowerAnimationFrame/,
  "lost mower RAF is not allowed to block input after final gate");
new vm.Script(shared);
assert(workflow.includes("node scripts/validate_shared_zoo_audio_cue_transition.js"));
const games = ["bible_bugs","dino_dash","foodslice","tower_bible",
  "traffic_tap","verse_invaders","verse_launch","verse_munch",
  "verse_scramble_neo","verse_snake","verse_splat","versey_bird"];
for (const id of games) {
  const src = read("verse_games/"+id+"/game.js");
  const anchor=src.indexOf("window.BibloZooWelcomeBackReturn?.attach?.({");
  assert(anchor>=0,id+": game uses original standalone return adapter");
  const portion=src.slice(anchor,anchor+1500);
  assert.match(portion,/preselectWelcomeSurprise: true/,
    id+": shared cue opt-in, not custom game-owned music hacks");
  assert.match(portion,/useZooEscape: true/,
    id+": native and browser games now allow random Zoo surprises");
  assert.match(portion,/onContinue:/,id+": final original game recovery retained");
}
assert.match(shell,/preselectWelcomeSurprise: options\.allowZooSurprises !== false/);
assert.match(shell,/useZooEscape: options\.allowZooSurprises !== false/);
assert.match(shell,/allowDevForceZooEscape: options\.allowZooSurprises !== false/);
assert.match(read("verse_playground/verse_jam/game.js"),/allowZooSurprises: false/,
  "Verse Jam remains fully excluded, including DEV Force");
assert.match(shared,/preselectWelcomeSurprise = false/,
  "Flashcards and other quiet clients do not opt in implicitly");
assert.match(shared,/root\.BibloZooNativeOnlyOutput\?\.enabled === true/);
assert.match(shared,/api\.activateFromGesture\(\{ purpose: "ui" \}\)/);
assert.match(shared,/api\.getCuePlaybackState\(/);
assert.match(shared,/position > initial \+ 35/,
  "native cue must show two genuinely advancing player positions");
assert.match(shared,/root\.Audio\(src\)/);
assert.match(shared,/if \(!cueOnlyVerified\)/);
assert.match(swift,/CAPPluginMethod\(name: "getCuePlaybackState"/);
const method=swift.slice(swift.indexOf("@objc func getCuePlaybackState("),
  swift.indexOf("    // Guard native session on main;",swift.indexOf("@objc func getCuePlaybackState(")));
assert(method.includes('call.getString("soundId") == "pilot-unlock"'),
  "Native clock probe must expose the single allowlisted original unlock sound");
assert(method.includes('self.players["pilot-unlock"]'));
assert(method.includes("player.currentTime * 1000"));
assert(method.includes("player.isPlaying"));
assert(method.includes("self.isCurrentPlaybackEpoch(epoch)"));
assert(!/setActive\(|setCategory\(|play\(|MediaRecorder|getUserMedia/.test(method),
  "read-only native clock probe must NEVER start sound, alter session or record");

function harness({native=false,muted=false,refuseCue=false,refuseGate=false,
                  refuseActivation=false, noPlugin=false,
                  nativeInactiveFirst=false}={}){
  const events=[],callbacks={doc:{},win:{}};
  let audioConstructed=0, cueStopCount=0, cueReads=0, gateCount=0, pauseCount=0;
  let paused=false, active=true;
  const button={attributes:{},setAttribute(k,v){this.attributes[k]=v;}};
  const overlay={hidden:true,innerHTML:"",className:"",
    setAttribute(){},remove(){events.push("remove");},
    querySelector(sel){return sel==="[data-welcome-back-action]"?button:null;}};
  const doc={hidden:false,body:{appendChild(x){assert.equal(x,overlay);}},
    createElement:()=>overlay,
    addEventListener(k,cb){callbacks.doc[k]=cb;},
    removeEventListener(k){delete callbacks.doc[k];}};
  const api={
    activateFromGesture(args){events.push("activate");assert.equal(args.purpose,"ui");
      return Promise.resolve({ready:!refuseActivation});},
    preload(args){events.push("preload");assert.equal(args.soundId,"pilot-unlock");
      return Promise.resolve({prepared:true});},
    play(args){events.push("play");assert.equal(args.soundId,"pilot-unlock");
      return Promise.resolve({accepted:!refuseCue});},
    getCuePlaybackState(args){events.push("sample");assert.equal(args.soundId,"pilot-unlock");
      cueReads++;return Promise.resolve({ok:true,positionMs:cueReads*60,
        playing:true,completed:false});},
    stop(args){events.push("stop");assert.equal(args.soundId,"pilot-unlock");
      cueStopCount++;return Promise.resolve({stopped:true});}
  };
  class Audio {
    constructor(src){audioConstructed++;this.src=src;this.paused=true;
      this._time=0;events.push("audio:"+src);}
    get currentTime(){if(!this.paused)this._time+=.06;return this._time;}
    set currentTime(n){this._time=n;}
    setAttribute(){} removeAttribute(){} load(){}
    play(){events.push("web-play");this.paused=false;
      return refuseCue?Promise.reject(Error("not-ready")):Promise.resolve();}
    pause(){events.push("web-stop");this.paused=true;}
  }
  const win={document:doc,
    BibloZooNativeOnlyOutput:{enabled:native},
    Capacitor:{Plugins:noPlugin?{}:{BibloZooNativeSound:api}},
    Audio: native?class Forbidden {
      constructor(){throw Error("Native iOS must NEVER use HTML audio");}
    }:Audio,
    BibloZooWelcomeBack:{markup:()=>"<fake/>"},
    BibloZooZooEscape:{create(opts){
      events.push("create");
      return win.visual={
        options:opts,start(){events.push("stage-start");},
        getStage(){return "welcome";},
        resumeVisible(){},destroy(){events.push("destroy");}
      };
    }},
    addEventListener(k,fn){callbacks.win[k]=fn;},
    removeEventListener(k){delete callbacks.win[k];},
    setTimeout(fn){Promise.resolve().then(fn);return 1;},
    clearTimeout(){}};
  vm.runInNewContext(shared,{window:win,document:doc,Promise,setTimeout});
  const ctl=win.BibloZooWelcomeBackReturn.attach({
    shouldPrompt:()=>active,
    preselectWelcomeSurprise:true, useZooEscape:true,
    pictureBase:"../../", isSoundMuted:()=>muted,
    onPause(){pauseCount++;paused=true;events.push("owner-pause");},
    onContinue(){gateCount++;events.push("owner-verify");
      if(refuseGate)return Promise.resolve(false);
      paused=false;return Promise.resolve(true);},
    onExit(){events.push("owner-exit");}
  });
  assert(ctl);
  if (nativeInactiveFirst) {
    // UIKit first: document.hidden is still FALSE, WebKit visibility has not
    // fired, yet native narration/PCM will already be interrupted.
    assert.equal(doc.hidden,false);
    assert.equal(ctl.pauseFromNativeInactive(),true,
      "UIKit inactive enters native Zoo owner pause before WebKit hides");
    assert.equal(paused,true);
    assert.equal(pauseCount,1);
    // Repeated inactive + delayed WebKit visibility may not double-pause.
    assert.equal(ctl.pauseFromNativeInactive(),true);
    doc.hidden=true;callbacks.doc.visibilitychange();
    assert.equal(pauseCount,1);
    doc.hidden=false;callbacks.win.pageshow();
    assert.equal(ctl.showAfterNativeActive(),true);
    assert.equal(overlay.hidden,false);
    assert.equal(ctl.showAfterNativeActive(),false,
      "duplicate native active may not create a second recovery");
  } else {
    doc.hidden=true;callbacks.doc.visibilitychange();
    doc.hidden=false;callbacks.win.pageshow();
  }
  const flush=async()=>{for(let i=0;i<22;i++)await Promise.resolve();};
  return {doc,win,events,overlay,ctl,flush,
    get paused(){return paused;},get gateCount(){return gateCount;},
    get pauseCount(){return pauseCount;},get audioConstructed(){return audioConstructed;},
    get cueStopCount(){return cueStopCount;},get cueReads(){return cueReads;}};
}
// Exercise actual owner pause/resume implementations, not only shared
// adapter stubs: narration loss and an in-flight mower have special clocks.
function ownerFunction(source,name,next){
  const start=source.indexOf("  function "+name+"(");
  const end=source.indexOf("\n  function "+next+"(",start);
  assert(start>=0 && end>start,"owner source changed: "+name);
  return source.slice(start,end);
}
function verifyNativePlayingOwners(){
  let stopped=0,holdFinished=0,typerClockPaused=0,typerClockResumed=0;
  let typerVisualPaused=0,typerVisualResumed=0;
  let typerReady=false,typerScheduled=false;
  const t={
    nativeTyperAudio:{stop(){stopped++;},isReady(){return typerReady;}},
    state:{screen:"game",paused:false},
    returnPaused:false,wasPausedBeforeReturn:false,muted:false,
    finishNativeHold(){holdFinished++;},beginNativeHold(){},
    // This legacy Zoo Escape test slices ONLY the existing Verse Typer
    // clock owner functions. R06's new isolated visual-owner functions
    // are exercised fully in validate_r06_playground_verse_typer_visual_freeze;
    // these strict shims verify the clock owner invokes them at the right gate.
    freezeTyperVisualsForReturn(){typerVisualPaused++;},
    thawTyperVisualsAfterReturn(){typerVisualResumed++;},
    welcomeClock:{pause(){typerClockPaused++;},resume(){typerClockResumed++;}},
    scheduleCaterpillarPositionUpdate(){typerScheduled=true}
  };
  vm.runInNewContext(ownerFunction(typer,"pauseTyperForReturn","continueTyperAfterReturn")+
    "\n"+ownerFunction(typer,"continueTyperAfterReturn","setScreen")+
    "\nthis.testOwner={pauseTyperForReturn,continueTyperAfterReturn};",t);
  t.testOwner.pauseTyperForReturn();
  assert.equal(t.returnPaused,true,"native Verse Typer stops and freezes while narration plays");
  assert.equal(t.state.paused,true);
  assert.equal(stopped,1);
  assert.equal(holdFinished,1);
  assert.equal(typerClockPaused,1);
  assert.equal(typerVisualPaused,1,
    "Native Verse Typer also freezes its compositor frame on UIKit inactive");
  assert.equal(t.testOwner.continueTyperAfterReturn(),false,
    "without a verified original Typer PCM bank the gate must not thaw narration");
  assert.equal(t.returnPaused,true);
  assert.equal(typerVisualResumed,0,
    "Rejected native audio readiness cannot thaw the original visual frame");
  typerReady=true;
  assert.equal(t.testOwner.continueTyperAfterReturn(),true);
  assert.equal(t.returnPaused,false);
  assert.equal(t.state.paused,false);
  assert.equal(typerClockResumed,1);
  assert.equal(typerVisualResumed,1,
    "Exact same visuals resume only after successful original PCM readiness");
  assert.equal(typerScheduled,true,"Typer resumes same saved verse layout, not a new round");

  let canceled=[],schedules=[],mowerSound=[],mowerStops=0,removed=0,coverage=0;
  const sprite={remove(){removed++;}};
  const c={
    nativeScrubAudio:{},welcomePaused:false,menuOpen:false,
    welcomeClock:{pause(){this.paused=true;},resume(){this.paused=false;},
      now(){return 250;}},
    pointerDown:true,lastPoint:{x:1,y:2},
    glowTrailAnimationFrame:0,rainbowTrailAnimationFrame:0,
    glowTrailSpots:[1],rainbowTrailParticles:[1],
    mowerActive:true,mowerEndAt:1050,mowerAnimationFrame:19,
    mowerResumeFrame:()=>{},deferredCoverageRound:null,
    cancelAnimationFrame(id){canceled.push(id);},
    requestAnimationFrame(fn){schedules.push(fn);return 20;},
    stopMowerSound(){mowerStops++;},
    startMowerSound(ms){mowerSound.push(ms);},
    document:{querySelector(sel){
      assert.equal(sel,"#scrubObjectLayer .scrub-mower-sprite");
      return sprite;
    }},
    scheduleCoverageCheck(){coverage++;},
    roundConfig(){return null;}
  };
  vm.runInNewContext(ownerFunction(scrub,"pauseScrubForReturn","continueScrubAfterReturn")+
    "\n"+ownerFunction(scrub,"continueScrubAfterReturn","renderTitleScreen")+
    "\nthis.testOwner={pauseScrubForReturn,continueScrubAfterReturn};",c);
  c.testOwner.pauseScrubForReturn();
  assert.equal(c.welcomePaused,true,"native mower is frozen during UIKit lock");
  assert.equal(c.pointerDown,false);
  assert.equal(c.mowerActive,true,"normal live mower checkpoint not discarded");
  assert(canceled.includes(19),"in-flight frame canceled while paused");
  assert.equal(c.testOwner.continueScrubAfterReturn(),true);
  assert.equal(c.welcomePaused,false);
  assert.equal(schedules.length,1,"saved mower frame resumes on verified gate");
  assert.equal(mowerSound[0],800,"only remaining mower sound duration replays");
  assert.equal(coverage,0,"no extra grass / score awarded at gate");

  // The reported failure also needs a fail-safe for a rare missing stored
  // RAF callback: otherwise mowerActive blocks every subsequent grass tap.
  c.mowerActive=true;c.mowerAnimationFrame=23;c.mowerResumeFrame=null;
  c.testOwner.pauseScrubForReturn();
  c.testOwner.continueScrubAfterReturn();
  assert.equal(c.mowerActive,false,"orphaned mower no longer blocks taps");
  assert.equal(c.mowerEndAt,0);
  assert.equal(removed,1,"only orphaned visual sprite is retired");
  assert.equal(coverage,0,"recovery does not clear grass or credit a fake pass");
}
async function run(){
  verifyNativePlayingOwners();
  {
    const h=harness();
    const result=h.win.visual.options.recover({plannedSurprise:"escape"});
    await h.flush();assert.equal(await result,true);
    assert.equal(h.gateCount,0,"initial selected surprise may NOT unfreeze original game audio");
    assert.equal(h.pauseCount,1,"original activity paused only on task switch");
    assert.deepEqual(h.events.filter(x=>x.startsWith("audio:")),
      ["audio:../../ui_audio/ui_pet_unlock.mp3"]);
    h.win.visual.options.onSurpriseStart("escape");
    assert.equal(h.pauseCount,1,"cue-only selected surprise must not stop native cue via second owner pause");
    assert(h.paused,"game remains frozen during rescue");
    h.win.visual.options.onRecovered();
    assert.equal(h.gateCount,1,"only final pen/LOCK GATE starts original owner recovery");
    assert(h.ctl.isPaused(),"game stays pending until real original recovery resolves");
    await h.flush();
    assert(!h.ctl.isPaused());
    assert.equal(h.overlay.hidden,true);
    assert.equal(h.paused,false);
    assert(h.events.includes("web-stop"),"cue stops at LOCK GATE");
    h.ctl.destroy();
  }
  {
    const h=harness();
    const ok=await h.win.visual.options.recover({plannedSurprise:null});
    assert.equal(ok,true);
    assert.equal(h.gateCount,1,"ordinary no-surprise return checks original game audio");
    assert.equal(h.audioConstructed,0,"no surprise does not play the cue");
    h.win.visual.options.onRecovered();
    assert(!h.ctl.isPaused());
    h.ctl.destroy();
  }
  {
    const h=harness({refuseCue:true});
    assert.equal(await h.win.visual.options.recover({plannedSurprise:"break"}),false);
    assert.equal(h.gateCount,0,"denied cue cannot pretend original game recovery");
    assert(h.ctl.isPaused()&&h.paused,"failed sound freezes activity");
    h.ctl.destroy();
  }
  {
    const h=harness({refuseGate:true});
    assert.equal(await h.win.visual.options.recover({plannedSurprise:"escape"}),true);
    h.win.visual.options.onSurpriseStart("escape");
    h.win.visual.options.onRecovered();
    await h.flush();
    assert(h.ctl.isPaused()&&h.paused,"rejected original LOCK GATE never thaws scene");
    assert(h.events.includes("stage-start"),"failed gate requires a NEW real tap");
    assert.equal(h.overlay.hidden,false);
    h.ctl.destroy();
  }
  {
    const h=harness();
    assert.equal(await h.win.visual.options.recover({plannedSurprise:"escape"}),true);
    // Failed surprise storage commit: successful cue alone must NOT let the
    // shared adapter dismiss a still-frozen game.
    const before=h.events.filter(x=>x==="stage-start").length;
    h.win.visual.options.onRecovered();
    assert(h.ctl.isPaused()&&h.paused,"cue-only no-pet cannot fake game resumption");
    assert.equal(h.gateCount,0);
    assert.equal(h.events.filter(x=>x==="stage-start").length,before+1);
    h.ctl.destroy();
  }
  {
    const h=harness();
    const inFlight=h.win.visual.options.recover({plannedSurprise:"escape"});
    h.doc.hidden=true;h.win.visual.options.onSurpriseStart("escape");
    // The native/HTML cue that arrived after a second task switch is stale.
    h.doc.hidden=true;h.events.push("second-lock");
    h.win.visual.options.onRecovered();
    assert.equal(await inFlight,false,"hidden turn invalidates a pending cue result");
    assert(h.ctl.isPaused()&&h.paused,"second lock cannot release activity");
    h.ctl.destroy();
  }
  {
    const h=harness({native:true,nativeInactiveFirst:true});
    assert.equal(await h.win.visual.options.recover({plannedSurprise:"escape"}),true);
    assert.equal(h.audioConstructed,0,"native-only never constructs HTML audio");
    assert(h.cueReads>0,"native cue must sample real AVAudioPlayer position");
    assert.deepEqual(h.events.filter(x=>["activate","preload","play"].includes(x)),
      ["activate","preload","play"],"single real native cue activation then prepare/play");
    assert.equal(h.gateCount,0);
    h.win.visual.options.onSurpriseStart("escape");
    h.win.visual.options.onRecovered();
    assert.equal(h.gateCount,1);
    await h.flush();
    assert(h.cueStopCount>=1,"native cue stopped independently before original owner restoration");
    assert(!h.ctl.isPaused());
    h.ctl.destroy();
  }
  for(const opts of [{native:true,refuseActivation:true},
    {native:true,refuseCue:true},{native:true,noPlugin:true}]){
    const h=harness(opts);
    assert.equal(await h.win.visual.options.recover({plannedSurprise:"escape"}),false);
    assert.equal(h.gateCount,0);
    assert(h.ctl.isPaused()&&h.paused);
    assert.equal(h.audioConstructed,0,"never fall back to HTML/WebAudio in native denial");
    h.ctl.destroy();
  }
  {
    const h=harness({native:true,muted:true});
    assert.equal(await h.win.visual.options.recover({plannedSurprise:"escape"}),true);
    assert.equal(h.gateCount,0);
    assert.equal(h.audioConstructed,0);
    assert(!h.events.includes("activate"),"muted cue does not steal Apple Music priority");
    h.win.visual.options.onSurpriseStart("escape");
    h.win.visual.options.onRecovered();
    await h.flush();
    assert(!h.ctl.isPaused(),"muted owner still controls final gate");
    h.ctl.destroy();
  }
  console.log("Shared Zoo cue transition PASS: 12 standalone opt-ins, compatible Playground and native player-clock guard, pause/odds/gate/denial/lifecycle scenarios");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
