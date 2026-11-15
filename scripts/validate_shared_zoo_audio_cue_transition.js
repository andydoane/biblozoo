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
new vm.Script(shared);
assert(workflow.includes("node scripts/validate_shared_zoo_audio_cue_transition.js"));
const games = ["bible_bugs","dino_dash","foodslice","tower_bible",
  "traffic_tap","verse_invaders","verse_launch","verse_munch",
  "verse_scramble_neo","verse_snake","verse_splat","versey_bird"];
for (const id of games) {
  const src = read("verse_games/"+id+"/game.js");
  const anchor=src.indexOf("window.BibloZooWelcomeBackReturn?.attach?.({");
  assert(anchor>=0,id+": game uses original standalone return adapter");
  const portion=src.slice(anchor,anchor+650);
  assert.match(portion,/preselectWelcomeSurprise: true/,
    id+": shared cue opt-in, not custom game-owned music hacks");
  assert.match(portion,/useZooEscape: !native\w+Audio/,
    id+": native production still excludes random Zoo surprises");
  assert.match(portion,/onContinue:/,id+": final original game recovery retained");
}
assert.match(shell,/preselectWelcomeSurprise: options\.allowZooSurprises !== false/);
assert.match(shell,/useZooEscape: options\.allowZooSurprises !== false && !options\.nativeOnlyAudio/);
assert.match(shell,/allowDevForceZooEscape: options\.allowZooSurprises !== false/);
assert.match(read("verse_playground/verse_jam/game.js"),/allowZooSurprises: false/,
  "Verse Jam remains fully excluded, including DEV Force");
assert.match(shared,/preselectWelcomeSurprise = false/,
  "Flashcards and other quiet clients do not opt in implicitly");
assert.match(shared,/root\.BibloZooNativeOnlyOutput\?\.enabled === true/);
assert.match(shared,/api\.activateFromGesture\(\{ purpose: "ui" \}\)/);
assert.match(shared,/api\.getCuePlaybackState\(/);
assert.match(shared,/sample\?\.ok === true && Number\(sample\.positionMs\) > 35/);
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
                  refuseActivation=false, noPlugin=false}={}){
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
  doc.hidden=true;callbacks.doc.visibilitychange();
  doc.hidden=false;callbacks.win.pageshow();
  const flush=async()=>{for(let i=0;i<22;i++)await Promise.resolve();};
  return {doc,win,events,overlay,ctl,flush,
    get paused(){return paused;},get gateCount(){return gateCount;},
    get pauseCount(){return pauseCount;},get audioConstructed(){return audioConstructed;},
    get cueStopCount(){return cueStopCount;},get cueReads(){return cueReads;}};
}
async function run(){
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
    const h=harness({native:true});
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
