"use strict";
/* R02 / FLASH-02, FLASH-03: native external audio must open Flashcards'
 * existing Welcome Back, never a generic missing-file toast. JS VM/source
 * regressions only; physical AirPods + Apple Music remain owner acceptance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const instructionSource = read("flashcards/instruction-audio.js");
const flashcardsSource = read("flashcards/flashcards.js");
const appSource = read("app.js");
const nativeTracks = read("verse_games/shared/native-learn-tracks.js");
const nativeListen = read("verse_games/shared/native-learn-listen.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow = read(".github/workflows/ios-prep-validation.yml");
for (const src of [instructionSource, flashcardsSource, appSource,
  nativeTracks, nativeListen]) new vm.Script(src);
assert.match(swift, /case \.began:[\s\S]*?forgetPlayback\(\)/);
assert.match(swift, /notifyListeners\("biblozooAppLifecycle", data: \[\s*"active": false, "reason": "audio-interruption"/);
assert.match(nativeTracks, /settle\(current, false, "interrupted", true\)/);
assert.match(nativeListen, /release\(active, "interrupted"\)/);
assert.match(instructionSource, /result\?\.reason === "interrupted"/);
assert.match(appSource, /async function playVerseDetailListen\(verseId, \{ onInterrupted \} = \{\}\)/);
assert.match(flashcardsSource, /event\.reason !== "audio-interruption"/);
assert.match(flashcardsSource, /onInterrupted: showFlashcardsNativeAudioWelcomeBack/);
assert.match(flashcardsSource, /stopVersePreview\(\); \/\/ revoke the pending Listen promise/);
assert.match(workflow, /node scripts\/validate_r02_flashcards_welcome_back\.js/);
for (const p of ["docs/PROJECT-HANDOFF.md", "docs/TESTING.md",
  "docs/IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md"])
  assert(read(p).includes("R02"), p + " must document the R02 status");

const tick = async () => { await Promise.resolve(); await Promise.resolve();
  await Promise.resolve(); };

function instructionFixture() {
  const frames = [], pending = [], errors = [];
  let interrupted = 0, stops = 0;
  const win = {
    document: { hidden: false, addEventListener() {} },
    BibloZooNativeOnlyOutput: {enabled: true},
    Capacitor: {getPlatform: () => "ios"},
    addEventListener() {}, requestAnimationFrame(cb) {frames.push(cb);},
    setTimeout() {return 1;}, clearTimeout() {},
    BibloZooNativeLearnTracks: {
      isAvailable: () => true, primeFromGesture() {},
      play(id) {return new Promise(resolve => pending.push({id,resolve}));},
      stop() {stops++;}
    }
  };
  vm.runInNewContext(instructionSource, {window: win});
  let owner;
  owner = win.BibloZooFlashcardsInstructions.create({
    onChange() {}, onError(msg) {errors.push(msg);},
    onInterrupted() {interrupted++;owner.interrupt();},
    isMuted: () => false
  });
  const pump = () => frames.splice(0).forEach(fn => fn());
  const start = () => {
    owner.sync("difficulty_intro", "really_well", "john_11_35");
    pump();
    assert.equal(pending.length,1,"Native instruction play must be requested");
  };
  return {owner,errors,start,pump,pending,
    resolve(value){const p=pending.shift();assert(p);p.resolve(value);},
    get interrupted(){return interrupted;},get stops(){return stops;}};
}
(async () => {
  const a=instructionFixture();
  a.start();
  a.resolve({ended:false,reason:"interrupted"});
  await tick();
  assert.equal(a.interrupted,1,"Real native interruption routed to owner");
  assert.equal(a.errors.length,0,"No red missing-file toast on interruption");
  assert.equal(a.owner.snapshot().status,"failed",
    "Narrator stays stopped; child must explicitly retry");
  assert(a.stops>0,"Interruption releases native narration");

  const b=instructionFixture();
  b.start();
  b.resolve({ended:false,reason:"decode-error"});
  await tick();
  assert.equal(b.interrupted,0,"Bad file is not OS interruption");
  assert.equal(b.errors.length,1,"Real narration failure keeps retry toast");
  assert.equal(b.owner.snapshot().failed,true);
  b.owner.retryFromGesture();
  b.pump();
  b.resolve({ended:true,reason:"native-ended"});
  await tick();
  assert.equal(b.owner.snapshot().locked,false,
    "Real completed narration still unlocks only after native-ended");
  assert.equal(b.interrupted,0);

  function flashcardsFixture({native=true}={}) {
    const docEvents={}, nativeEvents={}, notices=[], timers=new Map();
    let nextTimer=0, paused=0, visible=0, stopPreview=0, renders=0;
    let instructionState="idle", previewRequest=null;
    const doc={hidden:false,
      body:{appendChild(n){notices.push(n);return n;}},
      createElement(tag){return {tag,setAttribute(){},remove(){
        const at=notices.indexOf(this);if(at>=0)notices.splice(at,1);
      }};},
      addEventListener(k,cb){(docEvents[k] ||= []).push(cb);}
    };
    const prompt={
      pending:false,
      isPaused(){return this.pending;},
      pauseFromNativeInactive(){
        if(this.pending)return false;
        paused++;this.pending=true;options.onPause();return true;
      },
      showAfterNativeActive(){if(this.pending){visible++;return true;}return false;},
      destroy(){this.pending=false;}
    };
    let options;
    const win={
      document:doc,location:{protocol:native?"capacitor:":"https:"},
      BibloZooNativeOnlyOutput:{enabled:native},
      Capacitor:{
        isNativePlatform:()=>native,
        Plugins:{BibloZooNativeSound:{
          addListener(k,cb){nativeEvents[k]=cb;return Promise.resolve({remove(){}});}
        }}
      },
      BibloZooAudioEffects:{getOfficialPresetIds:()=>[]},
      BibloZooRecording:{create:()=>({snapshot:()=>({status:"idle"}),
        dispose(){},interruptCapture(){},pause(){},stopFun(){}})},
      BibloZooFlashcardsInstructions:{create(cfg){return{
        snapshot:()=>({status:instructionState,locked:instructionState==="playing"}),
        interrupt(){instructionState="failed";},
        stop(){instructionState="idle";},
        primeFromGesture(){},
        triggerInterrupt(){cfg.onInterrupted();}
      };}},
      BibloZooWelcomeBackReturn:{attach(o){options=o;return prompt;}},
      addEventListener(){}
    };
    const marker="  window.BibloZooFlashcards = Object.freeze({";
    assert(flashcardsSource.includes(marker));
    const hooks="  window.__r02 = { toggleVersePreview, stopVersePreview, instructions, "+
      "nativeInterruption:showFlashcardsNativeAudioWelcomeBack, "+
      "prepare(){state.view='difficulty';state.selectedVerseId='john_11_35';}, "+
      "setInstruction(s){instructionNarration;}, "+
      "playing:()=>previewPlaying };\n";
    vm.runInNewContext(flashcardsSource.replace(marker,hooks+marker),{
      window:win,document:doc,console,Math,Date,Promise,Object,
      setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},
      clearTimeout(id){timers.delete(id);},
      requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}
    });
    let handler=null;
    const api={
      isActive:()=>true,isMuted:()=>false,requestRender(){renders++;},
      getVerseList:()=>[{id:"john_11_35"}],
      getVerseProgressSnapshot:()=>({john_11_35:{learnCompleted:true}}),
      getCurrentVerseId:()=> "john_11_35",
      stopVersePreview(){stopPreview++; if(previewRequest){previewRequest(false);previewRequest=null;}},
      playVersePreview(_id,opts){handler=opts?.onInterrupted;return new Promise(resolve=>{previewRequest=resolve;});}
    };
    win.BibloZooFlashcards.initialize(api);
    win.__r02.prepare();
    return {win,doc,notices,prompt,nativeEvents,
      hooks:win.__r02,
      resolvePreview(v){assert(previewRequest);const r=previewRequest;previewRequest=null;r(v);},
      triggerNative(e){nativeEvents.biblozooAppLifecycle?.(e);},
      triggerVerseInterruption(){assert(handler);handler();},
      setInstruction(s){instructionState=s;},
      get paused(){return paused;},get visible(){return visible;},
      get stops(){return stopPreview;},get renders(){return renders;}};
  }

  const f=flashcardsFixture();
  const p=f.hooks.toggleVersePreview();
  assert.equal(f.hooks.playing(),true);
  f.triggerVerseInterruption();
  await p;
  assert.equal(f.paused,1,"Verse interruption opens shared paused state");
  assert.equal(f.prompt.pending,true);
  assert.equal(f.visible,1,"Welcome Back shown even while UIKit remains active");
  assert(f.stops>=1,"Pending Listen canceled before its completion callback");
  assert.equal(f.notices.length,0,"Canceled Listen never shows red toast");
  f.triggerNative({active:false,reason:"audio-interruption"});
  assert.equal(f.paused,1,"Duplicate native signal cannot pause twice");

  const g=flashcardsFixture();
  const q=g.hooks.toggleVersePreview();
  g.triggerNative({active:false,reason:"route-changed"});
  g.triggerNative({active:true,reason:"audio-interruption"});
  g.triggerNative({active:false});
  assert.equal(g.paused,0,"Ordinary route/lifecycle changes do not masquerade as Apple Music");
  g.triggerNative({active:false,reason:"audio-interruption"});
  await q;
  assert.equal(g.paused,1,"Swift .began signal alone presents Welcome Back");
  assert.equal(g.notices.length,0);

  const i=flashcardsFixture();
  i.setInstruction("playing");
  i.triggerNative({active:false,reason:"audio-interruption"});
  assert.equal(i.paused,1,"Instruction playback shows Welcome Back from Swift .began");
  assert.equal(i.notices.length,0);
  assert.equal(i.hooks.instructions().snapshot().status,"failed",
    "Instructions cannot silently auto-restart after Welcome Back");

  const j=flashcardsFixture();
  const fail=j.hooks.toggleVersePreview();
  j.resolvePreview(false);
  await fail;
  assert.equal(j.paused,0,"Bad MP3 must not look like an OS interruption");
  assert.equal(j.notices.length,1,"Genuine Listen failure remains actionable");
  assert.match(j.notices[0].textContent,/Audio couldn't play/);

  const web=flashcardsFixture({native:false});
  web.setInstruction("playing");
  web.triggerNative({active:false,reason:"audio-interruption"});
  assert.equal(web.paused,0,"Web/PWA has no native interruption redirect");

  // Exercise the ACTUAL app.js native preview callback, isolated from its
  // unrelated 670kB app initialization (never execute the entire app).
  const begin=appSource.indexOf("async function playVerseDetailListen(");
  const end=appSource.indexOf("// Verse-detail reference and verse segments",begin);
  assert(begin>=0&&end>begin);
  const fn=appSource.slice(begin,end);
  async function appPreview(kind,screen="FLASHCARDS") {
    let notice="",callback=0,listener;
    let token=0,active=false,cancelWait=null;
    const sound={startFromGesture({onEvent}){listener=onEvent;return Promise.resolve({ready:true});}};
    const sandbox={
      muted:false,document:{hidden:false},window:{BibloZooNativeLearnListen:sound},
      Screen:{FLASHCARDS:"FLASHCARDS",VERSE_DETAIL:"VERSE_DETAIL"},
      State:{screen},isNativeLearnListenMode:()=>true,
      setVerseDetailPreviewStatus(m){notice=m||"";},
      cancelVerseDetailListen(){
        token++;active=false;
        const cb=cancelWait;cancelWait=null;cb?.();return token;
      },
      get verseDetailListenToken(){return token;},
      set verseDetailListenToken(v){token=v;},
      get verseDetailListenActive(){return active;},
      set verseDetailListenActive(v){active=v;},
      get cancelVerseDetailListenWait(){return cancelWait;},
      set cancelVerseDetailListenWait(v){cancelWait=v;},
      Promise,console
    };
    vm.runInNewContext(fn+";this.playVerseDetailListen=playVerseDetailListen;",sandbox);
    const result=sandbox.playVerseDetailListen("john_11_35",{
      onInterrupted(){callback++;sandbox.cancelVerseDetailListen();}
    });
    assert(listener,"Native source must register event callback");
    listener({kind,stage:"verse"});
    const ok=await result;
    return {ok,callback,notice};
  }
  const int=await appPreview("interrupted");
  assert.equal(int.ok,false);
  assert.equal(int.callback,1,"Flashcards receives real native verse interruption");
  const bad=await appPreview("failed");
  assert.equal(bad.ok,false);
  assert.equal(bad.callback,0,"Actual playback failure keeps normal retry path");
  const good=await appPreview("completed");
  assert.equal(good.ok,true);
  assert.equal(good.callback,0,"Real native ended still completes normally");
  const other=await appPreview("interrupted","VERSE_DETAIL");
  assert.equal(other.callback,0,"Verse Detail does not adopt Flashcards overlay");
  console.log("R02 PASS: instructions/verse native interruptions -> one Welcome Back, canceled pending Listen, no false red toast; actual errors still retry; web isolation; native .began fallback; stale/duplicate guards.");
})().catch(e => {console.error(e);process.exitCode=1;});
