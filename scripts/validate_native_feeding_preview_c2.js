"use strict";

// N2 regression: native-only Classic iOS tester, explicit gesture session
// activation and historical Web comparison source mode (not .audiotest).
// GitHub Actions verifies JS contracts; native Swift and speaker need the iPhone.
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
assert.match(CSS, /\.daily-feed-native-pilot-phases/);
assert.doesNotMatch(FEED, /FEED_NATIVE_CLOCK_READY_TIMEOUT_MS/);
assert.match(FEED, /"before-native"/);
assert.match(FEED, /"after-native"/);
assert.match(FEED, /Native ONLY/);
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
    async activateFromGesture({purpose}) {
      calls.push(["activateFromGesture",purpose]);
      return {ready:true,attempted:false,reason:"not-needed"};
    },
    async preload({soundId}) { calls.push(["preload",soundId]); return {prepared:true}; },
    async play({soundId,volume}) { calls.push(["play",soundId,volume]); return {accepted:true}; },
    async stop({soundId}) { calls.push(["stop",soundId]); return {stopped:true}; }
  };
  // Keep the older focused bridge-failure mocks while exercising the N2
  // native-only gesture gate before any asset is prepared.
  if (api && !("activateFromGesture" in bridge)) {
    bridge.activateFromGesture = async ({purpose}) => {
      calls.push(["activateFromGesture",purpose]);
      return {ready:true,attempted:false,reason:"not-needed"};
    };
  }
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
    BibloZooFeedingNativeAudioPilot:{ isIOS:()=>nativeIOS },
    __testResume: context => Promise.resolve(context?.state === "running"),
    __testClock: context => Promise.resolve(context?.state === "running")
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
    peg: playPegTone,
    resume: attemptFeedingResumeFromGesture,
    stopEffects: stopFeedingEffects
  };
${marker}`;
  // In the test VM ONLY, intercept real startRound calls at the entry to
  // avoid needing an actual canvas, physics and user rewards. The source
  // selection and preflight code runs unchanged.
  const compiled=FEED.replace(
    '  function startRound(runtime) {',
    '  function startRound(runtime) { if (window.__interceptStart) { window.__interceptStart(runtime); return; }'
  ).replace(
    '  function continueFeedingAfterGesture(runtime, now = performance.now(), keepOverlay = false) {',
    '  function continueFeedingAfterGesture(runtime, now = performance.now(), keepOverlay = false) { if (window.__testContinue) return window.__testContinue(runtime, now, keepOverlay);'
  ).replace(
    '  function resumeFeedAudioContext(context) {',
    '  function resumeFeedAudioContext(context) { if (window.__testResume) return window.__testResume(context);'
  ).replace(
    '  function feedAudioClockAdvances(context) {',
    '  function feedAudioClockAdvances(context) { if (window.__testClock) return window.__testClock(context);'
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
    nativePilotPhases:{textContent:""},
    nativePilotTrace:[],
    nativePilotChoiceStatus:{textContent:""},
    startConfirmButton:{disabled:false},
    roundStarted:false,
    controlPhase:"instructions",
    finished:false,
    feedPageHidden:false,
    mode:"classic",
    audioContext:{state:"running",currentTime:12},
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
    assert.deepEqual(a.calls,[["activateFromGesture","feeding"],
      ["preload","feed-star"],["preload","feed-chomp"],["preload","feed-peg"]]);
    assert.equal(pilot.isReady(),true);
    assert.equal(pilot.play("feed-star",0.78),true);
    assert.equal(pilot.play("feed-chomp",0.85),true);
    assert.equal(pilot.play("not-allowlisted",0.5),false);
    assert.equal(pilot.play("feed-star",NaN),false);
    assert.equal(pilot.play("feed-chomp",1.5),false);
    await Promise.resolve();
    assert.deepEqual(a.calls.slice(4),[["play","feed-star",0.78],["play","feed-chomp",0.85]]);
    pilot.stop();
    assert.equal(pilot.isReady(),false);
    assert.deepEqual(a.calls.slice(-3),[["stop","feed-star"],["stop","feed-chomp"],["stop","feed-peg"]]);
    assert.equal(pilot.play("feed-star",0.78),false,"paused players cannot emit effects");
    current=false;
    assert.deepEqual(plain(await pilot.prepare()),{ready:false,reason:"stale"});
  }
  {
    // A genuine pending native interruption must block ALL preloads until a
    // deliberate retry is accepted by the Swift session coordinator.
    let preloads=0, plays=0, calls=0;
    const a=makeAdapter({api:{
      async activateFromGesture({purpose}) {
        assert.equal(purpose,"feeding");
        calls++;
        return calls===1
          ? {ready:false,attempted:false,reason:"interruption-pending"}
          : {ready:true,attempted:true,reason:"os-accepted"};
      },
      async preload(){preloads++;return {prepared:true};},
      async play(){plays++;return {accepted:true};},
      async stop(){return {stopped:true};}
    }});
    const pilot=a.pilot.create({isCurrent:()=>true});
    assert.deepEqual(plain(await pilot.prepare()),
      {ready:false,reason:"interruption-pending"});
    assert.equal(preloads,0);
    assert.equal(plays,0);
    assert.deepEqual(plain(await pilot.prepare()),{ready:true,reason:"prepared"});
    assert.equal(preloads,3);
    assert.equal(calls,2,"only explicit prepares may request native activation");
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
    assert.ok(calls.includes("stop:feed-star")&&calls.includes("stop:feed-chomp")&&calls.includes("stop:feed-peg"));
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
    // N2 first awaits the resolved native-session gesture before preload.
    await new Promise(resolve => setImmediate(resolve));
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
    // Let the native session check finish before expiring the deliberately
    // hung sound-preload timer, rather than expiring the gesture timer.
    await new Promise(resolve => setImmediate(resolve));
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
    // The adapter races play() against a deadline and observes the result
    // through .finally().then(); wait one macrotask for that chain to settle.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(p.hasFailed(),true);
    assert.deepEqual(failures,["interruption-pending"]);
    assert.equal(p.play("feed-star",0.8),false,"never silently swap or repeat after rejection");
  }
  {
    const h=feedHarness();
    const preview=h.api.render({session:{feedMode:"classic",dailyTodoPreview:true,petName:"Pip"}});
    assert.match(preview,/data-daily-feed-native-opt-in/);
    assert.match(preview,/data-daily-feed-native-pilot-opt/,
      "explicit label marker should allow its click default");
    assert.match(preview,/data-no-ui-sound/);
    assert.match(preview,/Native ONLY \(no Web fallback/);
    assert.match(preview,/data-daily-feed-native-badge/);
    assert.match(preview,/data-daily-feed-native-phases/);
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
    // Regression for the physical-iPhone C.2 report: clicking the opt-in
    // checkbox or its LABEL did nothing. The delegated start overlay
    // unconditionally called preventDefault(), cancelling the checkbox's
    // native label/input toggle. Execute that actual handler from source.
    const from = FEED.indexOf("    runtime.startOverlayHandler = (event) => {");
    const to = FEED.indexOf("    runtime.exitHandler = (event) => {", from);
    assert.ok(from > 0 && to > from, "expected real overlay click handler");
    const runtime = {
      nativePilotAllowed: true, feedPausedAt: null, controlPhase: "choose",
      introUnlockAt: 0
    };
    vm.runInNewContext(FEED.slice(from, to), {
      runtime, activeRuntime: runtime, performance: { now: () => 10000 },
      chooseFeedingControl: () => { throw Error("checkbox must not select controls"); }
    }, { filename: "Feeding startOverlayHandler" });
    const checkbox = { checked: false };
    function tap(clickedInsidePilotLabel) {
      const flags = { prevented: false, stopped: false };
      const target = {
        closest(selector) {
          if (selector === "[data-daily-feed-native-pilot-opt]" &&
              clickedInsidePilotLabel) return { tagName: "LABEL" };
          return null;
        }
      };
      runtime.startOverlayHandler({
        target,
        preventDefault() { flags.prevented = true; },
        stopPropagation() { flags.stopped = true; }
      });
      // Browser default toggle, which a real preventDefault() cancels.
      if (clickedInsidePilotLabel && !flags.prevented) {
        checkbox.checked = !checkbox.checked;
      }
      return flags;
    }
    const labelTap = tap(true);
    assert.equal(labelTap.prevented, false,
      "do not cancel the iPhone's checkbox/label click default");
    assert.equal(labelTap.stopped, true,
      "opt-in should not bubble through outer app controls");
    assert.equal(checkbox.checked, true, "first tap must visibly check the box");
    assert.equal(tap(true).prevented, false);
    assert.equal(checkbox.checked, false, "second tap must uncheck the box");
    const ordinaryTap = tap(false);
    assert.equal(ordinaryTap.prevented, true,
      "regular intro click behavior must retain its intentional preventDefault");
    assert.equal(ordinaryTap.stopped, true);
    runtime.nativePilotAllowed = false;
    assert.equal(tap(true).prevented, true,
      "do not bypass handler for real Daily Feeding or non-native previews");

    // The actual change listener should immediately confirm the selected
    // backend and preserve Got It! as the activation/preflight gesture.
    const hook = FEED.indexOf(
      "    if (runtime.nativePilotAllowed && runtime.nativePilotCheckbox) {",
      FEED.indexOf('startOverlay.addEventListener(\n      "click",')
    );
    const hookEnd = FEED.indexOf('    exitButton.addEventListener("click"', hook);
    assert.ok(hook > 0 && hookEnd > hook);
    let changed;
    const nativeRuntime = {
      nativePilotAllowed: true,
      nativePilotCheckbox: {
        checked: true,
        addEventListener(type, fn) {
          assert.equal(type, "change"); changed = fn;
        }
      },
      nativePilotChoiceStatus: { textContent: "" },
      roundStarted: false, finished: false, controlPhase: "instructions"
    };
    const snapshots=[];
    vm.runInNewContext(FEED.slice(hook, hookEnd), {
      runtime: nativeRuntime, activeRuntime: nativeRuntime,
      recordNativePreviewPhase: (_, phase) => { snapshots.push(phase); }
    }, { filename: "Feeding native opt-in change handler" });
    assert.equal(typeof changed, "function");
    changed();
    assert.match(nativeRuntime.nativePilotChoiceStatus.textContent,
      /Native ONLY selected.*Got It! tests native/i);
    assert.deepEqual(snapshots, ["selected-native"],
      "checkbox selection must capture a read-only native baseline");
    nativeRuntime.nativePilotCheckbox.checked = false;
    changed();
    assert.match(nativeRuntime.nativePilotChoiceStatus.textContent,
      /web effects selected/i);
    assert.match(FEED, /runtime\.nativePilotCheckbox\.removeEventListener\(\s*"change"/,
      "change listener must detach on Feeding exit");
    assert.match(FEED, /runtime\.nativePilotCheckbox\.disabled = true/,
      "checkbox must not change in the middle of async preflight");
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
    // Native mode can prepare successfully even while the Web clock is stalled.
    // Neither Web resume nor the Web clock probe may be invoked.
    const h=feedHarness();
    const order=[];
    h.window.__testResume=()=>{throw Error("Native called Web resume");};
    h.window.__testClock=()=>{throw Error("Native called Web clock");};
    h.window.Capacitor={Plugins:{BibloZooNativeSound:{
      async getDebugState(){order.push("snapshot");return {
        available:true,pending:false,beganCount:0,endedCount:0,
        eventCount:0,lastSignal:"none",lastReasonCode:-1
      };}
    }}};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      async prepare(){order.push("native-preload");return {ready:true};},
      play:()=>true,stop:()=>{},isReady:()=>true
    });
    h.window.__interceptStart=r=>{order.push("start-round");r.roundStarted=true;};
    const r=runtime(true);
    r.audioContext=null;
    h.hooks.setRuntime(r);
    await h.hooks.nativeBegin(r);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(order.filter(x=>x==="native-preload"||x==="start-round"),
      ["native-preload","start-round"]);
    assert.equal(r.nativePilotBackend,"native");
    assert.equal(r.audioContext,null);
    assert.match(r.nativePilotBadge.textContent,/Native ONLY: star\/chomp ready/);
    assert.match(r.nativePilotPhases.textContent,/before-native:/);
    assert.match(r.nativePilotPhases.textContent,/after-native:/);
    assert.match(r.nativePilotPhases.textContent,/round-start:/);
  }
  {
    // N3c: Native preflight failure MUST NOT select Web or begin an
    // unannounced silent round. Keep the same instructions for retry.
    const h=feedHarness();
    const starts=[];
    let stops=0;
    h.window.__testResume=()=>{throw Error("Web resume called on Native failure");};
    h.window.__testClock=()=>{throw Error("Web clock probed on Native failure");};
    h.window.__interceptStart=r=>{starts.push(r.nativePilotBackend);r.roundStarted=true;};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      prepare:async()=>({ready:false,reason:"interruption-pending"}),
      play:()=>{throw Error("unprepared Native played");},
      stop:()=>{stops++;}
    });
    const r=runtime(true);
    r.audioContext=null;
    h.hooks.setRuntime(r);
    await h.hooks.nativeBegin(r);
    assert.deepEqual(starts,[],"Native failure must NOT start a silent round");
    assert.equal(stops,1);
    assert.equal(r.audioContext,null);
    assert.equal(r.nativePilot,null);
    assert.equal(r.controlPhase,"instructions");
    assert.match(r.nativePilotBadge.textContent,/Native ONLY unavailable \(interruption-pending\); round not started/);
    assert.match(r.nativePilotChoiceStatus.textContent,/Tap Try Again or Back/);
    assert.doesNotMatch(r.nativePilotChoiceStatus.textContent,/Copy Audio Timing Report/);
    assert.match(r.nativePilotChoiceStatus.textContent,/Sound isn't ready yet/);
    assert.equal(r.nativePilotChoicePending,false);
    assert.equal(r.startConfirmButton.disabled,false);
    assert.equal(r.startConfirmButton.textContent,"Try Again");
  }
  {
    // N3c: after a real cold-start refusal, a second *user tap* can prepare
    // native sound without leaving the round/reopening Web or restarting app.
    const h=feedHarness();
    let attempts=0, starts=0, stops=0;
    h.window.__interceptStart=r=>{starts++;r.roundStarted=true;};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      prepare:async()=>++attempts===1
        ? {ready:false,reason:"activation-os-rejected"}
        : {ready:true,reason:"prepared"},
      isReady:()=>true,
      stop:()=>{stops++;}
    });
    const r=runtime(true);
    r.audioContext=null;
    h.hooks.setRuntime(r);
    await h.hooks.nativeBegin(r);
    assert.equal(starts,0);
    assert.equal(r.roundStarted,false);
    assert.equal(r.startConfirmButton.textContent,"Try Again");
    assert.match(r.nativePilotBadge.textContent,/activation-os-rejected/);
    assert.equal(stops,1);
    await h.hooks.nativeBegin(r); // deliberate second Got It!/Try Again tap
    assert.equal(starts,1,"only successful native preflight may start round");
    assert.equal(attempts,2);
    assert.equal(r.nativePilotBackend,"native");
    assert.equal(r.audioContext,null,"no Web fallback even on success");
    assert.equal(r.roundStarted,true);
  }
  {
    // The explicit unchecked Web choice still works independently.
    const h=feedHarness();
    const starts=[];
    h.window.__interceptStart=r=>{starts.push(r.nativePilotBackend);r.roundStarted=true;};
    const r=runtime(false);
    h.hooks.setRuntime(r);
    await h.hooks.nativeBegin(r);
    assert.deepEqual(starts,["web"]);
    assert.match(r.nativePilotBadge.textContent,/Web \(explicit choice\)/);
    assert.equal(r.nativePilot,null);
  }
  {
    // A delayed read-only state response cannot launch an exited native game.
    const h=feedHarness();
    const pending=later();
    let starts=0,preps=0,stops=0;
    h.window.Capacitor={Plugins:{BibloZooNativeSound:{
      getDebugState:()=>pending.promise
    }}};
    h.window.__interceptStart=()=>{starts++;};
    h.window.BibloZooFeedingNativeAudioPilot.create=()=>({
      prepare:()=>{preps++;return Promise.resolve({ready:true});},
      stop:()=>{stops++;}
    });
    const r=runtime(true);
    r.audioContext=null;
    h.hooks.setRuntime(r);
    const waiting=h.hooks.nativeBegin(r);
    await new Promise(resolve=>setImmediate(resolve));
    h.hooks.setRuntime(null);
    pending.resolve({available:true,pending:false});
    await waiting;
    assert.equal(starts,0);
    assert.equal(preps,0);
    assert.ok(stops>=1);
  }
  {
    const h=feedHarness();
    const starts=[];
    let preps=0;
    let reportFailure;
    const calls=[];
    h.window.__interceptStart = r=>{starts.push(r.nativePilotBackend);r.roundStarted=true;};
    h.window.BibloZooFeedingNativeAudioPilot.create=({onFailure})=>{
      reportFailure = onFailure;
      return {
      prepare:async()=>{preps++;return {ready:true};},
      play:(id,vol)=>{calls.push([id,vol]);return true;},
      stop:()=>calls.push(["stop"]),
      isReady:()=>true
    };
    };
    const on=runtime(true);
    h.hooks.setRuntime(on);
    await h.hooks.nativeBegin(on);
    assert.deepEqual(starts,["native"]);
    assert.equal(preps,1);
    assert.equal(on.nativePilotBackend,"native");
    assert.equal(on.startConfirmButton.disabled,false);
    assert.match(on.nativePilotBadge.textContent,/Native ONLY: star\/chomp ready/);
    assert.match(on.nativePilotBadge.textContent,/Web audio OFF/);
    // Show a real safe bridge reason rather than a generic "failed" label.
    reportFailure("interruption-pending");
    assert.match(on.nativePilotBadge.textContent,
      /Native ONLY failed \(interruption-pending\)/);
    reportFailure("<unsafe-reason>");
    assert.match(on.nativePilotBadge.textContent,
      /Native ONLY failed \(bridge-error\)/);
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
    assert.deepEqual(starts,[],"Native failure stays at instructions for retry");
    assert.equal(stops,1);
    assert.equal(fallback.roundStarted,false);
    assert.equal(fallback.startConfirmButton.textContent,"Try Again");
    assert.match(fallback.nativePilotBadge.textContent,
      /Native ONLY unavailable \(interruption-pending\); round not started/);
  }
  {
    // Native-only Resume must ignore a suspended/missing Web context, wait
    // for the new native preflight and unfreeze only on a fresh human tap.
    const h=feedHarness();
    let resumes=0, clockChecks=0, rePrepares=0, continued=0;
    h.window.__testResume=()=>{resumes++;throw Error("native used Web resume");};
    h.window.__testClock=()=>{clockChecks++;throw Error("native used Web clock");};
    h.window.__testContinue=(_r, _now, keepOverlay)=>{
      continued++;
      assert.equal(keepOverlay,false,"Native-only Resume must dismiss Welcome Back");
      return true;
    };
    const r=runtime(true);
    r.audioContext=null;
    r.nativePilotBackend="native";
    r.roundStarted=true;
    r.running=true;
    r.feedPausedAt=1234;
    r.feedResumeGeneration=0;
    r.feedResumePending=false;
    r.resumeButton={disabled:false};
    r.resumeStatus={textContent:"",hidden:true};
    r.resumeOverlay={hidden:false};
    r.nativePilot={prepare:async()=>{
      rePrepares++;
      return {ready:true};
    }};
    h.hooks.setRuntime(r);
    const result=[];
    assert.equal(h.hooks.resume(r,ok=>result.push(ok)),true);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(rePrepares,1);
    assert.equal(continued,1);
    assert.deepEqual(result,[true]);
    assert.equal(r.feedResumePending,false);
    assert.equal(r.resumeButton.disabled,false);
    assert.equal(resumes,0);
    assert.equal(clockChecks,0);
  }
  {
    // Failed native-only Resume stays frozen with retry/Back; never tries Web.
    const h=feedHarness();
    let continued=0;
    h.window.__testResume=()=>{throw Error("Web fallback from Native Resume");};
    h.window.__testContinue=()=>{continued++;return true;};
    const r=runtime(true);
    r.audioContext=null;
    r.nativePilotBackend="native";
    r.roundStarted=true;
    r.running=true;
    r.feedPausedAt=1234;
    r.feedResumeGeneration=0;
    r.resumeButton={disabled:false};
    r.resumeStatus={textContent:"",hidden:true};
    r.resumeOverlay={hidden:false};
    r.nativePilot={prepare:async()=>({ready:false,reason:"interruption-pending"})};
    h.hooks.setRuntime(r);
    const result=[];
    assert.equal(h.hooks.resume(r,ok=>result.push(ok)),true);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(result,[false]);
    assert.equal(continued,0);
    assert.equal(r.feedPausedAt,1234);
    assert.equal(r.resumeButton.disabled,false);
    assert.match(r.resumeStatus.textContent,/Native sounds unavailable \(interruption-pending\)/);
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
  {
    // Classic, Labyrinth and Bounce deliberately reuse fixed-ID native sine
    // notes, with cooldown/anti-repeat. Melody has its own triangle bank;
    // browser Classic still uses the unchanged oscillator.
    const h = feedHarness();
    let webBeepAttempts = 0;
    const nativePegs = [];
    const r = {
      mode: "classic", nativePilotBackend: "native",
      feedPausedAt: null, lastPegSoundAt: 0, lastPegNoteIndex: -1,
      nativePilot: {
        isReady: () => true,
        play: (...args) => {nativePegs.push(args); return true;}
      },
      audioContext: {
        state: "running", currentTime: 12,
        createOscillator() { webBeepAttempts++; throw Error("instrumented"); }
      }
    };
    h.hooks.peg(r, 1000);
    assert.equal(nativePegs.length, 1);
    assert.equal(nativePegs[0][0], "feed-peg");
    assert.equal(nativePegs[0][1], 0.20);
    assert.ok(Number.isInteger(nativePegs[0][3]) &&
      nativePegs[0][3] >= 0 && nativePegs[0][3] < 6);
    h.hooks.peg(r, 1020);
    assert.equal(nativePegs.length, 1, "Native peg tone retains 55ms cooldown");
    h.hooks.peg(r, 1060);
    assert.equal(nativePegs.length, 2);
    assert.notEqual(nativePegs[0][3], nativePegs[1][3],
      "Native pegs must not immediately repeat the same note");
    assert.equal(webBeepAttempts, 0,
      "Native Classic must never create a Web oscillator");
    r.nativePilotBackend = "web";
    r.lastPegSoundAt = 0;
    h.hooks.peg(r, 1000);
    assert.equal(webBeepAttempts, 1,
      "Web Classic still uses its original oscillator");
    r.nativePilotBackend = "native";
    r.feedPausedAt = 1500;
    r.nativePilot.isReady = () => false;
    h.hooks.peg(r, 2000);
    assert.equal(nativePegs.length, 2,
      "Paused/unprepared native peg cannot enqueue more sounds");
    assert.equal(webBeepAttempts, 1,
      "Never create Web audio while Native is paused");
    r.mode = "labyrinth";
    r.feedPausedAt = null;
    r.nativePilot.isReady = () => true;
    h.hooks.peg(r, 3000);
    assert.equal(nativePegs.length, 3,
      "N4b Labyrinth platform impacts reuse prewarmed native peg notes");
    assert.equal(nativePegs[2][0], "feed-peg");
    assert.equal(webBeepAttempts, 1,
      "Labyrinth cannot create a Web oscillator");
    r.mode = "bounce";
    h.hooks.peg(r, 3100);
    assert.equal(nativePegs.length, 4,
      "N4c Bounce wall/paddle/brick impacts reuse prewarmed native peg tones");
    assert.equal(nativePegs[3][0], "feed-peg");
    assert.equal(webBeepAttempts, 1,
      "Native Bounce cannot create a new Web oscillator");
    r.mode = "melody";
    h.hooks.peg(r, 3200);
    assert.equal(nativePegs.length, 4,
      "Melody's native catches must not borrow Bounce/Classic sine peg tones");
  }
  // Source contract for the experiment: nothing in the Native branch can
  // reopen the very Web audio context whose clock failures blocked C.2c.
  assert.match(FEED,/const audioContext = nativePilotAllowed\s*\?\s*null :/);
  assert.match(FEED,/const starAudio =\s*audioContext \|\| nativePilotAllowed/);
  assert.match(FEED,/const chompAudio = audioContext \|\| nativePilotAllowed/);
  const nativeStartup=FEED.slice(
    FEED.indexOf('    runtime.nativePilotBackend = "native";',
      FEED.indexOf("async function startPreviewRoundWithAudioChoice")),
    FEED.indexOf("  function startRound(runtime) {")
  );
  assert.ok(nativeStartup.length>500);
  assert.doesNotMatch(nativeStartup,/resumeFeedAudioContext|feedAudioClockAdvances|new Audio\(|runtime\.nativePilotBackend\s*=\s*"web"/);
  assert.match(FEED,/if \(runtime\.nativePilotBackend !== "native"\) runtime\.zooEscape\?\.start\?\.\(\)/);
  assert.match(FEED,/runtime\.nativePilotBackend === "native"[\s\S]*?runtime\.nativePilot\?\.play\("feed-star"/);
  assert.match(FEED,/runtime\.nativePilotBackend === "native"[\s\S]*?runtime\.nativePilot\?\.play\("feed-chomp"/);
  // N4a preserves real-tap native Resume for Classic and Melody; test the
  // actual mode-specific gesture/re-prepare branch, not old comment wording.
  assert.match(FEED,/if \(runtime\.nativePilotBackend === "native"\) \{[\s\S]*?runtime\.nativePilot\?\.prepare\?\.\(\)/);
  assert.match(FEED,/native-resume-timeout/);
  assert.match(FEED,/if \(runtime\.nativePilotBackend !== "native"\) runtime\.zooEscape\?\.start\?\.\(\)/);
  assert.match(FEED,/runtime\.nativePilot\?\.isReady\?\.\(\) !== true/);
  assert.match(FEED,/runtime\.nativePilot\?\.stop\?\.\(\)/);
  assert.match(FEED,/session\.dailyTodoPreview === true[\s\S]*?mode === FEED_MODES\.CLASSIC/);
  assert.doesNotMatch(PILOT,/\.setCategory\s*\(|\.setActive\s*\(|\.setMode\s*\(/,
    "the JS pilot must not change native AVAudioSession policy");
  console.log("Stage C.2d Native-only Feeding preview contract passed (no Web fallback/clock, stable web baseline, native errors/lifecycle).");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
