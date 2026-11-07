"use strict";

// Stage C.2 regression: actual isolated adapter + instrumented Feeding source.
// GitHub Actions cannot compile Swift, infer audible output or simulate iOS
// interruption order. This verifies our JS branch contracts and fallbacks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const plain = value => JSON.parse(JSON.stringify(value)); // normalize VM realm objects
const PILOT = read("verse_games/shared/feeding-native-audio-pilot.js");
const FEED = read("daily_questions_feed_game.js");
const HTML = read("index.html");
const CSS = read("daily_questions_feed_game.css");
const APP = read("app.js");
const CI = read(".github/workflows/ios-prep-validation.yml");

const startup = '<script src="verse_games/shared/feeding-native-audio-pilot.js"></script>';
assert.ok(HTML.includes(startup), "adapter must be loaded in the experiment app");
assert.ok(HTML.indexOf(startup) < HTML.indexOf('<script src="daily_questions_feed_game.js"></script>'));
assert.match(CI, /node scripts\/validate_native_feeding_preview_c2\.js/);
assert.match(CSS, /\.daily-feed-native-pilot-opt/);
assert.match(CSS, /\.daily-feed-native-pilot-badge/);
assert.match(APP, /dailyTodoPreview: true/, "preview is a test-only session");

function later() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function makeAdapter({platform = "ios", api, hidden = false} = {}) {
  const calls = [];
  const timers = new Map();
  let nextTimer = 0;
  const doc = { hidden };
  const bridge = api || {
    async preload({soundId}) { calls.push(["preload",soundId]); return {prepared:true}; },
    async play({soundId,volume}) { calls.push(["play",soundId,volume]); return {accepted:true}; },
    async stop({soundId}) { calls.push(["stop",soundId]); return {stopped:true}; }
  };
  const cap = {
    isNativePlatform: () => platform !== "web",
    getPlatform: () => platform,
    Plugins: { BibloZooNativeSound: bridge }
  };
  const root = {
    document: doc, Capacitor: cap,
    setTimeout(fn,ms) { const n=++nextTimer; timers.set(n,{fn,ms}); return n; },
    clearTimeout(n) { timers.delete(n); }
  };
  vm.runInNewContext(PILOT, {window:root, Promise, Error}, {filename:"feeding-native-audio-pilot.js"});
  return {
    pilot:root.BibloZooFeedingNativeAudioPilot,
    cap,doc,bridge,calls,
    expire(ms) {
      for(const [n,t] of [...timers]) if(t.ms<=ms){timers.delete(n);t.fn();}
    }
  };
}

function feedHarness(nativeIOS=true) {
  const window={
    location:{protocol:"https:"},
    devicePixelRatio:1,
    DeviceOrientationEvent:function(){},
    BibloZooFeedingNativeAudioPilot:{ isIOS:()=>nativeIOS }
  };
  const sandbox={
    window, document:{hidden:false}, Image:class{}, Audio:class{},
    console, performance:{now:()=>1000}, setTimeout,clearTimeout,
    requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},
    fetch:()=>Promise.reject(new Error("no network"))
  };
  const marker='  window.BibloZooDailyFeedGame = Object.freeze({';
  assert.equal(FEED.split(marker).length-1,1);
  const injection=`  window.__stageC2 = {
    setRuntime(value) { activeRuntime=value; },
    nativeBegin: startPreviewRoundWithAudioChoice,
    star: playStarSound,
    chomp: playChompSound,
    stopEffects: stopFeedingEffects
  };
${marker}`;
  // In the test VM ONLY, intercept real startRound calls at the entry to
  // avoid needing an actual canvas, physics and user rewards. The source
  // selection and preflight code runs unchanged.
  const compiled=FEED.replace(
    '  function startRound(runtime) {',
    '  function startRound(runtime) { if (window.__interceptStart) { window.__interceptStart(runtime); return; }'
  ).replace(marker,injection);
  vm.runInNewContext(compiled,sandbox,{filename:"daily_questions_feed_game.js"});
  return {window,sandbox,api:window.BibloZooDailyFeedGame,hooks:window.__stageC2};
}

function runtime(checked) {
  return {
    nativePilotAllowed:true,
    nativePilotCheckbox:{checked},
    nativePilotChoicePending:false,
    nativePilotBackend:"web",
    nativePilot:null,
    nativePilotBadge:{textContent:""},
    nativePilotChoiceStatus:{textContent:""},
    startConfirmButton:{disabled:false},
    roundStarted:false,
    controlPhase:"instructions",
    finished:false,
    feedPageHidden:false,
    mode:"classic",
    feedSoundNodes:new Set(),
    starAudio:null,chompAudio:null
  };
}

async function main() {
  {
    for(const platform of ["web","android"]){
      const a=makeAdapter({platform});
      assert.equal(a.pilot.isIOS(),false);
      assert.equal(a.pilot.create({isCurrent:()=>true}),null);
      assert.equal(a.calls.length,0);
    }
  }
  {
    const a=makeAdapter();
    let current=true;
    const pilot=a.pilot.create({isCurrent:()=>current});
    assert.equal(pilot.isReady(),false);
    assert.deepEqual(a.calls,[],"creating the pilot must not autoplay or prepare");
    assert.deepEqual(plain(await pilot.prepare()),{ready:true,reason:"prepared"});
    assert.deepEqual(a.calls,[["preload","feed-star"],["preload","feed-chomp"]]);
    assert.equal(pilot.isReady(),true);
    assert.equal(pilot.play("feed-star",0.78),true);
    assert.equal(pilot.play("feed-chomp",0.85),true);
    assert.equal(pilot.play("not-allowlisted",0.5),false);
    assert.equal(pilot.play("feed-star",NaN),false);
    assert.equal(pilot.play("feed-chomp",1.5),false);
    await Promise.resolve();
    assert.deepEqual(a.calls.slice(2),[["play","feed-star",0.78],["play","feed-chomp",0.85]]);
    pilot.stop();
    assert.equal(pilot.isReady(),false);
    assert.deepEqual(a.calls.slice(-2),[["stop","feed-star"],["stop","feed-chomp"]]);
    assert.equal(pilot.play("feed-star",0.78),false,"paused players cannot emit effects");
    current=false;
    assert.deepEqual(plain(await pilot.prepare()),{ready:false,reason:"stale"});
  }
  {
    // A missing bridge or second asset does not start a game mid-preflight.
    const a=makeAdapter();
    a.cap.Plugins={};
    const p=a.pilot.create({isCurrent:()=>true});
    assert.deepEqual(plain(await p.prepare()),{ready:false,reason:"missing-bridge"});
    assert.equal(p.play("feed-star",0.8),false);
  }
  {
    const calls=[];
    const a=makeAdapter({api:{
      async preload({soundId}) {
        calls.push("preload:"+soundId);
        return {prepared:soundId==="feed-star",reason:"bundled-asset-missing"};
      },
      async play(){calls.push("play");return {accepted:true};},
      async stop({soundId}){calls.push("stop:"+soundId);return {stopped:true};}
    }});
    const p=a.pilot.create({isCurrent:()=>true});
    const result=await p.prepare();
    assert.deepEqual(plain(result),{ready:false,reason:"bundled-asset-missing"});
    assert.equal(p.play("feed-star",0.78),false);
    assert.ok(calls.includes("stop:feed-star")&&calls.includes("stop:feed-chomp"));
    assert.ok(!calls.includes("play"));
  }
  {
    let calls=0;
    const pending=later();
    const a=makeAdapter({api:{
      preload(){calls++;return pending.promise;},
      async play(){throw Error("stale sound may not play");},
      async stop(){return {stopped:true};}
    }});
    const p=a.pilot.create({isCurrent:()=>true});
    const awaiting=p.prepare();
    p.stop();
    pending.resolve({prepared:true});
    assert.deepEqual(plain(await awaiting),{ready:false,reason:"stale"});
    assert.equal(p.isReady(),false);
    assert.equal(p.play("feed-star",0.78),false);
    assert.equal(calls,1,"stop must prevent next asset preload");
  }
  {
    const pending=later();
    const a=makeAdapter({api:{
      preload:()=>pending.promise,
      async play(){return {accepted:true};},
      async stop(){return {stopped:true};}
    }});
    const p=a.pilot.create({isCurrent:()=>true});
    const awaiting=p.prepare();
    a.expire(1500);
    assert.deepEqual(plain(await awaiting),{ready:false,reason:"prepare-timeout-or-error"});
    assert.equal(p.isReady(),false);
    pending.resolve({prepared:true});
    await Promise.resolve();
    assert.equal(p.play("feed-star",0.8),false);
  }
  {
    const failures=[];
    const a=makeAdapter({api:{
      async preload(){return {prepared:true};},
      async play(){return {accepted:false,reason:"interruption-pending"};},
      async stop(){return {stopped:true};}
    }});
    const p=a.pilot.create({isCurrent:()=>true,onFailure:v=>failures.push(v)});
    await p.prepare();
    assert.equal(p.play("feed-star",0.8),true);
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    assert.equal(p.hasFailed(),true);
    assert.deepEqual(failures,["interruption-pending"]);
    assert.equal(p.play("feed-star",0.8),false,"never silently swap or repeat after rejection");
  }
  {
    const h=feedHarness();
    const preview=h.api.render({session:{feedMode:"classic",dailyTodoPreview:true,petName:"Pip"}});
    assert.match(preview,/data-daily-feed-native-opt-in/);
    assert.match(preview,/data-no-ui-sound/);
    assert.match(preview,/Native star \+ chomp/);
    assert.match(preview,/data-daily-feed-native-badge/);
    assert.doesNotMatch(h.api.render({session:{feedMode:"classic",petName:"Pip"}}),
      /data-daily-feed-native-opt-in/,"normal Daily Feeding may never opt in");
    for(const mode of ["bounce","labyrinth","melody"]){
      assert.doesNotMatch(h.api.render({session:{feedMode:mode,dailyTodoPreview:true}}),
        /data-daily-feed-native-opt-in/,mode+" remains web-only");
    }
    const w=feedHarness(false);
    assert.doesNotMatch(w.api.render({session:{feedMode:"classic",dailyTodoPreview:true}}),
      /data-daily-feed-native-opt-in/,"non-iOS preview stays web");
  }
  {
    const h=feedHarness();
    const starts=[];
    h.window.__interceptStart = r=>{starts.push(r.nativePilotBackend);r.roundStarted=true;};
    const off=runtime(false);
    h.hooks.setRuntime(off);
    await h.hooks.nativeBegin(off);
    assert.deepEqual(starts,["web"]);
    assert.equal(off.nativePilot,null);
    assert.equal(off.startConfirmButton.disabled,false);
    assert.equal(off.nativePilotChoicePending,false);
  }
  {
    const h=feedHarness();
    const starts=[];
    let preps=0;
    const calls=[];
    h.window.__interceptStart = r=>{starts.push(r.nativePilotBackend);r.roundStarted=true;};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      prepare:async()=>{preps++;return {ready:true};},
      play:(id,vol)=>{calls.push([id,vol]);return true;},
      stop:()=>calls.push(["stop"]),
      isReady:()=>true
    });
    const on=runtime(true);
    h.hooks.setRuntime(on);
    await h.hooks.nativeBegin(on);
    assert.deepEqual(starts,["native"]);
    assert.equal(preps,1);
    assert.equal(on.nativePilotBackend,"native");
    assert.equal(on.startConfirmButton.disabled,false);
    assert.match(on.nativePilotBadge.textContent,/Native star\/chomp/);
    // Real star/chomp functions must return BEFORE any Web/HTML playback.
    on.audioContext={state:"running",createBufferSource(){throw Error("web double sound");}};
    h.hooks.star(on);
    h.hooks.chomp(on);
    assert.deepEqual(calls,[["feed-star",0.78],["feed-chomp",0.85]]);
    h.hooks.stopEffects(on);
    assert.deepEqual(calls.slice(-1),[["stop"]]);
  }
  {
    const h=feedHarness();
    let starts=[];
    let stops=0;
    h.window.__interceptStart=r=>{starts.push(r.nativePilotBackend);r.roundStarted=true;};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      prepare:async()=>({ready:false,reason:"interruption-pending"}),
      stop:()=>stops++
    });
    const fallback=runtime(true);
    h.hooks.setRuntime(fallback);
    await h.hooks.nativeBegin(fallback);
    assert.deepEqual(starts,["web"],"native failure falls back before round only");
    assert.equal(stops,1);
    assert.equal(fallback.nativePilot,null);
    assert.match(fallback.nativePilotBadge.textContent,/Web \(native unavailable\)/);
  }
  {
    // Exit/route switch during a deferred prepare must not start another round.
    const h=feedHarness();
    let starts=0, stops=0;
    const pending=later();
    h.window.__interceptStart=()=>{starts++;};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      prepare:()=>pending.promise,
      stop:()=>stops++
    });
    const r=runtime(true);
    h.hooks.setRuntime(r);
    const waiting=h.hooks.nativeBegin(r);
    assert.equal(r.startConfirmButton.disabled,true);
    await h.hooks.nativeBegin(r); // double tap must not start a second preflight
    h.hooks.setRuntime(null);
    pending.resolve({ready:true});
    await waiting;
    assert.equal(starts,0);
    assert.equal(stops,1);
  }
  assert.match(FEED,/runtime\.nativePilotBackend === "native"[\s\S]*?runtime\.nativePilot\?\.play\("feed-star"/);
  assert.match(FEED,/runtime\.nativePilotBackend === "native"[\s\S]*?runtime\.nativePilot\?\.play\("feed-chomp"/);
  assert.match(FEED,/const nativeRetry = runtime\.nativePilotBackend === "native"/);
  assert.match(FEED,/if \(nativeRetry\) \{[\s\S]*?finishResume\(result\?\.ready === true\)/);
  assert.match(FEED,/runtime\.nativePilot\?\.isReady\?\.\(\) !== true/);
  assert.match(FEED,/runtime\.nativePilot\?\.stop\?\.\(\)/);
  assert.match(FEED,/session\.dailyTodoPreview === true[\s\S]*?mode === FEED_MODES\.CLASSIC/);
  assert.doesNotMatch(PILOT,/\.setCategory\s*\(|\.setActive\s*\(|\.setMode\s*\(/,
    "the JS pilot must not change native AVAudioSession policy");
  console.log("Stage C.2 native Feeding Classic tester preview gate passed (adapter, fallback, isolation, stale calls, lifecycle source contracts).");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
