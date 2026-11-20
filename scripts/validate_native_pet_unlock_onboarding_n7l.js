"use strict";
/* N7l: real app source VM, fixed Swift native IDs, original assets and
 * browser-isolation contracts. CI is not a physical iPhone sound test.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const base = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(base, p), "utf8");
const app = read("app.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const tracks = read("verse_games/shared/native-learn-tracks.js");
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const build = read("scripts/build.js");
const block = (first, last) => {
  const start = app.indexOf(first);
  const end = app.indexOf(last, start + first.length);
  assert(start >= 0 && end > start, "missing real app block " + first);
  return app.slice(start, end);
};

// Exact ORIGINAL files from ios-prep, never new synthesized tones or URLs.
for (let page = 1; page <= 4; page++) {
  const name = "tutorial_page_" + page + ".mp3";
  assert(fs.statSync(path.join(base, "verse_audio", name)).size > 1000);
}
assert(fs.statSync(path.join(base, "ui_audio/ui_pet_unlock.mp3")).size > 1000);
assert(build.includes('"ui_audio"') && build.includes('"verse_audio"'));
assert(project.includes("ui_pet_unlock.mp3 in Resources"));
assert(swift.includes('"pilot-unlock": "ui_pet_unlock"'));
assert(swift.includes('forResource: "tutorial_page_\\(page)"'.replace("\\\\", "\\")) ||
       swift.includes('forResource: "tutorial_page_\\(page)"'),
  "Swift fixed tutorial resource interpolation");
assert(swift.includes('subdirectory: "public/verse_audio"'));
assert(swift.includes('soundId.hasPrefix("tutorial-page-")'));
assert(swift.includes('(1...4).contains(page)'));
assert(tracks.includes("tutorial-page-[1-4]"));
assert(tracks.includes('if (e.type === "ended") settle(a, true, "native-ended")'));
assert(workflow.includes("validate_native_pet_unlock_onboarding_n7l.js"));
assert(app.includes("if (window.BibloZooNativeOnlyOutput?.enabled === true) return \"\";"));
assert(app.includes("primeZooTodoTutorialNativeAudioFromGesture();"));
assert(app.includes("data-tutorial-next"));
assert(app.includes("data-tutorial-action"));
assert(app.includes('stopPetUnlockPackageSound()'));
assert(app.includes('playPetUnlockPackageSound({ allowFallback: true })'));
assert(app.includes("playZooTodoTutorialPageAudio(tutorialPageNumber)"));
assert(app.includes("playZooTodoTutorialPageAudio(\n      pageNumber"));
assert(app.includes("markZooTodoTutorialPageAudioPlayed(pageNumber)"));
new Function(app); // JavaScript grammar for full production entry.

const flush = () => new Promise(resolve => setImmediate(resolve));
const petCode = [
  block("let petUnlockAudioEl = null;", "function getAppAudioContext()"),
  block("function ensurePetUnlockAudio()", "function preloadUiTapSoundBuffers()")
].join("\n");

function petHarness({ native = true, muted = false, deferActivation = false } = {}) {
  const calls = [];
  const eventListeners = [];
  let activationResolve;
  class WebAudio {
    constructor(src) {
      if (native) throw Error("native pet attempted HTMLAudioElement");
      this.src=src; this.currentTime=0; this.volume=1;this.paused=true;
      calls.push(["web-create",src]);
    }
    setAttribute() {}
    load() {}
    pause() {this.paused=true;calls.push(["web-stop"]);}
    play() {this.paused=false;calls.push(["web-play"]);return Promise.resolve();}
  }
  const api = {
    addListener(name, callback) {
      assert.equal(name, "biblozooAppLifecycle");
      eventListeners.push(callback); return Promise.resolve({});
    },
    activateFromGesture({purpose}) {
      calls.push(["activate",purpose]);
      if (deferActivation)
        return new Promise(resolve=>{activationResolve=resolve;});
      return Promise.resolve({ready:true});
    },
    preload({soundId}) {calls.push(["preload",soundId]);return Promise.resolve({prepared:true});},
    play({soundId,volume,eventId}) {
      calls.push(["native-play",soundId,volume,eventId]);
      return Promise.resolve({accepted:true});
    },
    stop({soundId}) {calls.push(["native-stop",soundId]);return Promise.resolve({stopped:true});}
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:native},
    Capacitor:{Plugins:{BibloZooNativeSound:api}}
  };
  const doc={hidden:false},state={screen:"pet_unlock"};
  const context = {window:win,document:doc,Promise,Date,
    Screen:{PET_UNLOCK:"pet_unlock"},State:state,muted,
    UI_PET_UNLOCK_SOUND_FILE:"ui_audio/ui_pet_unlock.mp3",
    UI_PET_UNLOCK_VOLUME:0.55, Audio:WebAudio,
    performance:{now:()=>2000},
    playUiTapFallbackNow(){calls.push(["web-fallback"]);},
    console:{warn(){}}
  };
  vm.runInNewContext(petCode+"\nwindow.__pet={playPetUnlockPackageSound,"+
    "stopPetUnlockPackageSound,preloadPetUnlockSoundBuffer};",
    context,{filename:"app.js:N7l-pet"});
  return {win,doc,state,context,calls,
    play:()=>win.__pet.playPetUnlockPackageSound({allowFallback:true}),
    preload:()=>win.__pet.preloadPetUnlockSoundBuffer(),
    stop:()=>win.__pet.stopPetUnlockPackageSound(),
    lifecycle:e=>eventListeners.forEach(fn=>fn(e)),
    activated:r=>activationResolve?.(r)
  };
}

const tutorialCode=[
  block("const TUTORIAL_PAGE_AUDIO = Object.freeze({",
        "function normalizeTutorialAudioPlayedPages("),
  block("let zooTodoTutorialAudioGeneration = 0;",
        "function renderZooTodoTutorialHtml("),
  block("function playZooTodoTutorialPageAudio(",
        "// Do not restart narration automatically after a lock or app switch.")
].join("\n");

function tutorialHarness(page, {native=true, available=true, muted=false}={}) {
  const calls=[],heard=new Set();
  const pending=[];
  const listeners={};
  const audioEl={
    paused:true,ended:false,currentTime:0,volume:1,src:"",
    addEventListener(event,fn){listeners[event]=fn;},
    removeEventListener(event,fn) {
      if(listeners[event]===fn)delete listeners[event];
    },
    pause(){this.paused=true;calls.push(["web-stop"]);},
    play(){this.paused=false;calls.push(["web-play"]);return Promise.resolve();}
  };
  const tracks={
    isAvailable:()=>available,
    primeFromGesture(){calls.push(["prime"]);return true;},
    play(soundId) {
      calls.push(["native-play",soundId]);
      return new Promise(resolve=>pending.push(resolve));
    },
    stop(){calls.push(["native-stop"]);}
  };
  const win={BibloZooNativeOnlyOutput:{enabled:native},
    BibloZooNativeLearnTracks:tracks};
  const doc={hidden:false};
  const state={screen:"todo_dev",todoTutorialPage:page};
  const context={
    window:win,document:doc,Promise,Audio:class {
      constructor(){throw Error("unexpected HTML Audio construction");}
    }, Set, Object, console:{warn(){}},
    AUDIO_DIR:"verse_audio/",State:state,Screen:{TODO_DEV:"todo_dev"},
    muted, isNativeLearnTracksMode:()=>available,
    getZooTodoTutorialPageNumber:()=>state.todoTutorialPage,
    hasPlayedZooTodoTutorialPageAudio:n=>heard.has(n),
    markZooTodoTutorialPageAudioPlayed:n=>{heard.add(n);calls.push(["heard",n]);},
    setAudioSrc(src){audioEl.src=src;calls.push(["web-src",src]);},
    applyMute(){},audioEl,
    render(){calls.push(["render"]);},
    setTimeout(){return 1;},clearTimeout(){}
  };
  vm.runInNewContext(tutorialCode+"\nwindow.__tut={prime:"+
    "primeZooTodoTutorialNativeAudioFromGesture,"+
    "play:playZooTodoTutorialPageAudio,stop:stopZooTodoTutorialPageAudio,"+
    "retry:renderZooTodoTutorialAudioRetry};",
    context,{filename:"app.js:N7l-tutorial"});
  return {win,context,state,doc,calls,pending,heard,listeners,
    prime:()=>win.__tut.prime(),play:()=>win.__tut.play(page),
    stop:()=>win.__tut.stop({offerRetry:true}),
    retry:()=>win.__tut.retry(page),
    finish:ended=>pending.shift()?.({ended})
  };
}

async function run() {
  const p=petHarness();
  await p.preload();
  assert.equal(p.calls.length,0,"no HTML Audio or native preload on page render");
  p.play();
  assert.deepEqual(Array.from(p.calls[0]),["activate","ui"],
    "native activation happens during actual box click");
  await flush();
  assert(p.calls.some(c=>c[0]==="preload"&&c[1]==="pilot-unlock"));
  const unlock=p.calls.find(c=>c[0]==="native-play");
  assert(unlock && unlock[1]==="pilot-unlock" && unlock[2]===0.55);
  assert(!p.calls.some(c=>c[0].startsWith("web-")));
  p.stop();
  assert(p.calls.some(c=>c[0]==="native-stop"&&c[1]==="pilot-unlock"));

  const stale=petHarness({deferActivation:true});
  stale.play();stale.state.screen="title";stale.stop();
  stale.activated({ready:true});await flush();
  assert(!stale.calls.some(c=>c[0]==="native-play"),
    "late unlock must not sound on next screen");
  const interrupted=petHarness({deferActivation:true});
  interrupted.play();interrupted.lifecycle({active:false});
  interrupted.activated({ready:true});await flush();
  assert(!interrupted.calls.some(c=>c[0]==="native-play"),
    "held App Switcher must cancel stale unlock");
  const missing=petHarness();missing.win.Capacitor.Plugins.BibloZooNativeSound={};
  missing.play();await flush();
  assert(!missing.calls.some(c=>c[0]==="web-play"||c[0]==="web-fallback"));
  const quiet=petHarness({muted:true});quiet.play();
  assert.equal(quiet.calls.length,0);
  const web=petHarness({native:false});
  await web.preload();web.play();await flush();
  assert(web.calls.some(c=>c[0]==="web-create"&&
    c[1]==="ui_audio/ui_pet_unlock.mp3"));
  assert(web.calls.some(c=>c[0]==="web-play"));
  assert(!web.calls.some(c=>c[0]==="native-play"));

  for(let page=1;page<=4;page++){
    const t=tutorialHarness(page);
    assert.equal(t.retry(),"","native builds have no Hear Instructions button");
    t.prime();
    assert.deepEqual(Array.from(t.calls[0]),["prime"]);
    t.play();
    assert(t.calls.some(c=>c[0]==="native-play"&&
      c[1]==="tutorial-page-"+page),"original native tutorial "+page);
    assert.equal(t.heard.size,0,"preload/accepted is NOT heard");
    t.finish(true);await flush();
    assert(t.heard.has(page),"actual native ended marks page "+page);
    assert(!t.calls.some(c=>c[0]==="web-play"||c[0]==="web-src"));
  }
  const stopped=tutorialHarness(2);
  stopped.play();stopped.stop();stopped.finish(true);await flush();
  assert.equal(stopped.heard.size,0,"late native end after Next/Exit cannot mark heard");
  const denied=tutorialHarness(1,{available:false});
  denied.play();await flush();
  assert.equal(denied.heard.size,0);
  assert(!denied.calls.some(c=>c[0]==="web-play"||c[0]==="web-src"));
  assert.equal(denied.retry(),"","missing native bridge never shows dead button");
  const failed=tutorialHarness(3);
  failed.play();failed.finish(false);await flush();
  assert.equal(failed.heard.size,0,"rejected native narration is not credited");
  assert.equal(failed.retry(),"");
  const mutedTut=tutorialHarness(1,{muted:true});
  mutedTut.play();assert.equal(mutedTut.pending.length,0);

  const browser=tutorialHarness(1,{native:false});
  browser.play();await flush();
  assert(browser.calls.some(c=>c[0]==="web-src"&&
    c[1]==="verse_audio/tutorial_page_1.mp3"));
  assert(browser.calls.some(c=>c[0]==="web-play"));
  browser.listeners.ended?.();await flush();
  assert(browser.heard.has(1),"original Web/PWA ended retains page credit");
  assert.equal(browser.calls.filter(c=>c[0]==="native-play").length,0);
  const webFailed=tutorialHarness(2,{native:false});
  webFailed.play();await flush();
  webFailed.listeners.error?.();await flush();
  assert.match(webFailed.retry(),/Hear Instructions/,
    "unchanged ios-prep/Web retry markup exists on genuinely failed HTML audio");

  console.log("N7l PASS: original native pet unlock AVAudioPlayer, gesture/lock/stale "+
    "guard, four native tutorial MP3 pages with true ended-only credit, native "+
    "no Web fallback/no dead retry button, original browser flow intact.");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
