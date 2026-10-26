#!/usr/bin/env node
/* Patch 59: runtime, policy and game-state regression checks. No iPhone is simulated. */
"use strict";
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const helper = read('verse_games/shared/native-audio-recovery.js');
const app = read('app.js');
const feed = read('daily_questions_feed_game.js');
const scene = read('ios/App/App/SceneDelegate.swift');
const swift58 = read('ios/App/App/AppDelegate.swift');
const html = read('index.html');
const sw = read('service-worker.js');
const {feedingHarness, flush} = require('./validate_audio_clock_recovery_patch56.js');
const {appHarness} = require('./validate_app_audio_patch19.js');
let assertions = 0;
function eq(a, b, why) { assertions++; assert.equal(a,b,why); }
function ok(a, why) { assertions++; assert.ok(a,why); }

function helperHarness({platform='ios',isNative=true,plugin=true,disabled=false,hidden=false,
  response={attempted:true, activated:true, reason:'activated'}}={}) {
  const calls=[], log=[];
  const storage = new Map();
  if(disabled) storage.set('biblozooNativeAudioRecovery','0');
  const localStorage = {getItem:key=>storage.get(key)||null, setItem:(key,value)=>storage.set(key,value)};
  const nativePlugin = {reactivateAfterClockStall: async request=>{calls.push(request);return response;}};
  const window = { document:{hidden}, localStorage,
    Capacitor: {isNativePlatform:()=>isNative, getPlatform:()=>platform,
      Plugins: plugin ? {BibloZooAudioSessionRecovery: nativePlugin}:{}},
    BibloZooAudioDiagnostics:{record(type,fields){ log.push({type,...fields}); }} };
  vm.runInNewContext(helper,{window});
  return {window,calls,log,storage,api:window.BibloZooNativeAudioRecovery};
}
async function helperPolicies() {
  for(const cfg of [
    {platform:'web',isNative:false}, {platform:'ios',isNative:false},
    {platform:'android',isNative:true}, {platform:'ios',plugin:false},
    {platform:'ios',hidden:true}, {platform:'ios',disabled:true}
  ]) {
    const h=helperHarness(cfg);
    eq(!!h.api.isEnabled(),cfg.hidden?true:false,'Only installed iOS plugin is eligible; hidden guard is on request');
    const res=await h.api.tryAfterClockStall('feeding');
    eq(res.attempted,false,'No activation when non-native / hidden / disabled');
    eq(h.calls.length,0,'Non-eligible environment makes zero native calls');
  }
  const h=helperHarness();
  eq(h.api.isEnabled(),true,'Native iOS experiment enabled by default');
  eq((await h.api.tryAfterClockStall('invalid')).reason,'invalid-source','Invalid source rejected before native');
  eq(h.calls.length,0,'Invalid source not invoked');
  const res=await h.api.tryAfterClockStall('feeding');
  eq(res.activated,true,'Native activation result surfaced');
  eq(h.calls.length,1,'Exactly one native request sent');
  eq(h.calls[0].source,'feeding','Only declared source allowed');
  eq(h.calls[0].clockStalled,true,'Clock-stalled proof marker set');
  ok(h.log.some(x=>x.type==='native-audio-reactivation-request'),'Request diagnostic');
  ok(h.log.some(x=>x.type==='native-audio-reactivation-result' && x.activated),'Result diagnostic');
  h.api.disable();
  eq(h.api.isEnabled(),false,'Kill switch persists');
  eq((await h.api.tryAfterClockStall('feeding')).attempted,false,'Kill switch prevents later call');
  eq(h.calls.length,1,'Kill switch never sends additional calls');
  h.api.enable();
  eq(h.api.isEnabled(),true,'Kill switch re-enabled explicitly');
  await h.api.tryAfterClockStall('app');
  eq(h.calls.length,2,'Main-app source supported');
  const error=helperHarness({response:{attempted:true,activated:false,reason:'activation-error',errorCode:123}});
  eq((await error.api.tryAfterClockStall('feeding')).activated,false,'Native failure never reported success');
  const blocked=helperHarness({response:{attempted:false,activated:false,reason:'cooldown'}});
  eq((await blocked.api.tryAfterClockStall('feeding')).reason,'cooldown','Native cooldown reason propagated');
  const rejecting=helperHarness();
  rejecting.window.Capacitor.Plugins.BibloZooAudioSessionRecovery.reactivateAfterClockStall=()=>Promise.reject(Error('no'));
  eq((await rejecting.api.tryAfterClockStall('feeding')).reason,'bridge-error','Native bridge error swallowed safely');
}
async function feedingRecovery() {
  for(const mode of ['classic','labyrinth','bounce','melody']) {
    const h=feedingHarness({initialMode:'stalled',mode});
    const r=h.runtime;
    let called=0;
    h.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:async source=>{
        called++;
        eq(source,'feeding','Feeding is native source');
        // Native intervention has revived the current clock, without any
        // replacement context or permission to resume gameplay yet.
        h.contexts[0].mode='healthy';
        return {attempted:true,activated:true};
      }};
    h.api.pauseFeedingGame(r,10000);
    eq(h.api.attemptFeedingResumeFromGesture(r),true,mode+' accepts Resume tap');
    await flush(); await h.advance(180);
    eq(called,1,mode+' invokes native exactly once after failed clock probe');
    eq(r.feedPausedAt,10000,mode+' stays paused after native success alone');
    eq(r.resumeOverlay.hidden,false,mode+' overlay stays visible through native');
    eq(h.contexts.length,1,mode+' native recheck does not allocate an engine');
    await h.advance(180);
    eq(r.feedPausedAt,null,mode+' resumes only after healthy second clock probe');
    eq(r.feedAudioRecoveryVerified,true,mode+' recovery marker set only after probe');
    eq(r.resumeOverlay.hidden,true,mode+' overlay dismissed after verified recheck');
    eq(r.balls[0].x,50,mode+' position remains unchanged');
    eq(r.score,12,mode+' score preserved');
    eq(r.caughtCount,3,mode+' rewards preserved');
    ok(h.log.some(x=>x.type==='feed-audio-native-recheck' && x.mode===mode),mode+' recheck logged');
    h.api.discard();
  }
  {
    const h=feedingHarness({initialMode:'stalled'});
    const r=h.runtime;
    h.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:async()=>({attempted:true,activated:true})};
    h.api.pauseFeedingGame(r,10000);
    h.api.attemptFeedingResumeFromGesture(r);
    await flush(); await h.advance(180); await h.advance(180);
    eq(r.feedPausedAt,10000,'Native activation without clock advancement stays paused');
    eq(r.resumeButton.textContent,'Try again!','Failed second check uses child-friendly retry');
    eq(r.feedAudioNeedsFreshContext,true,'Verified failure retains context recovery path');
    ok(h.log.some(e=>e.reason==='clock-stalled-after-native'), 'Distinct post-native stall logged');
    h.api.discard();
  }
  {
    const h=feedingHarness({initialMode:'stalled'});
    const r=h.runtime;
    h.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:async()=>({attempted:false,activated:false,reason:'cooldown'})};
    h.api.pauseFeedingGame(r,10000);
    h.api.attemptFeedingResumeFromGesture(r);
    await flush(); await h.advance(180);
    eq(r.feedPausedAt,10000,'Native cooldown cannot resume Feeding');
    eq(r.feedResumePending,false,'Refusal releases retry button');
    eq(h.contexts.length,1,'Native refusal does not create new context');
    h.api.discard();
  }
  {
    const h=feedingHarness({initialMode:'stalled'});
    const r=h.runtime;
    let release;
    h.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:()=>new Promise(resolve=>{release=resolve;})};
    h.api.pauseFeedingGame(r,10000);
    h.api.attemptFeedingResumeFromGesture(r);
    await flush(); await h.advance(180);
    await h.advance(2320);
    eq(r.feedPausedAt,10000,'Watchdog preserves pause during hung native call');
    eq(r.feedResumePending,false,'Watchdog ends pending native call');
    h.contexts[0].mode='healthy';
    release({attempted:true,activated:true});
    await flush(); await h.advance(500);
    eq(r.feedPausedAt,10000,'Late native success cannot unlock game');
    eq(r.resumeOverlay.hidden,false,'Late bridge result cannot hide overlay');
    h.api.discard();
  }
  {
    const h=feedingHarness({initialMode:'healthy'});
    let called=0;
    h.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:async()=>{called++;return {activated:true};}};
    h.api.pauseFeedingGame(h.runtime,10000);
    h.api.attemptFeedingResumeFromGesture(h.runtime);
    await flush(); await h.advance(180);
    eq(called,0,'Healthy Feeding never triggers native activation');
  }
}
async function appRecovery() {
  const h=appHarness();
  eq(await h.api.unlockAppAudio(),true,'Initial main-app audio works');
  h.api.markAppAudioInterrupted();
  let called=0;
  h.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
    tryAfterClockStall:async source=>{
      called++;
      eq(source,'app','Main-app source tagged correctly');
      return {attempted:true,activated:true};
    }};
  const waiting=h.api.unlockAppAudio();
  await flush();
  h.fire(90);
  await flush();
  eq(called,1,'Main app tries native only after frozen clock');
  eq(h.api.appAudioStatus().unlocked,false,'Native success is not audio success');
  h.contexts[0].currentTime=0.2;
  h.fire(90);
  eq(await waiting,true,'Main app recovers after second clock advances');
  eq(h.api.appAudioStatus().pending,false,'Main app clears interrupted flag on verified recovery');
  {
    const a=appHarness();
    await a.api.unlockAppAudio();a.api.markAppAudioInterrupted();
    a.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:async()=>({attempted:true,activated:true})};
    const p=a.api.unlockAppAudio();
    await flush(); a.fire(90); await flush(); a.fire(90);
    eq(await p,false,'Native activation with stalled main clock fails');
    eq(a.api.appAudioStatus().fresh,true,'Existing main recovery fallback retained');
  }
  {
    const a=appHarness();
    await a.api.unlockAppAudio();a.api.markAppAudioInterrupted();
    let called=0;
    a.window.BibloZooNativeAudioRecovery={isEnabled:()=>true,
      tryAfterClockStall:async()=>{called++; return {activated:true};}};
    const p=a.api.unlockAppAudio();await flush();
    a.contexts[0].currentTime=0.2; a.fire(90);
    eq(await p,true,'Healthy main clock unlocks on first probe');
    eq(called,0,'Healthy main clock never triggers native call');
  }
}
function sourcePolicy() {
  ok(html.includes('src="verse_games/shared/native-audio-recovery.js"'), 'Optional integration loaded');
  ok(html.indexOf('native-audio-recovery.js') < html.indexOf('daily_questions_feed_game.js'), 'Native helper loads before feeding');
  ok(sw.includes("2026_Oct_26_patch69_2_wacky_single_tap"), 'Fresh PWA cache version');
  ok(sw.includes('"./verse_games/shared/native-audio-recovery.js"'), 'Fallback JS cached offline');
  ok(!/import\s+.*@capacitor|from\s+["']@capacitor/.test(helper), 'No mandatory native import');
  ok(!/Capacitor\.Plugins/.test(feed), 'Feeding remains web-first');
  ok(scene.includes('bridge?.registerPluginInstance(BibloZooAudioSessionRecoveryPlugin())'), 'Registration in same lifecycle as Patch 58');
  ok(scene.includes('public let jsName = "BibloZooAudioSessionRecovery"'), 'Native JS name matches helper');
  ok(scene.includes('CAPPluginMethod(name: "reactivateAfterClockStall"'), 'Single native activation method');
  ok(scene.includes('guard call.getBool("clockStalled") == true'), 'Native rejects unverified caller');
  ok(scene.includes('UIApplication.shared.applicationState == .active'), 'Foreground guard');
  ok(scene.includes('audioSession.category == .soloAmbient'), 'Safety: do not interfere with recording categories');
  ok(scene.includes('private let minimumInterval: TimeInterval = 12'), 'Shared 12s cooldown');
  ok(scene.includes('private let maximumAttemptsPerForeground = 2'), '2 attempts per foreground cap');
  ok(scene.includes('NotificationCenter.default.addObserver(') && scene.includes('UIApplication.didEnterBackgroundNotification'), 'New foreground resets budget only after background');
  eq((scene.match(/setActive\(true\)/g)||[]).length,1,'Exactly one native activation operation');
  ok(!/setCategory\(|setMode\(|setActive\(false\)/.test(scene), 'No category/mode or deactivation change');
  ok(!/setActive\(/.test(swift58), 'Patch 58 observer stays read-only');
  ok(feed.includes('feedAudioClockAdvances(context).then(rechecked'), 'Feeding rechecks clock after native');
  ok(app.includes('clockReady = await appAudioClockAdvances(ctx);'), 'App rechecks clock after native');
}
(async()=>{
  sourcePolicy();
  await helperPolicies();
  await feedingRecovery();
  await appRecovery();
  console.log(`Patch 59 native-only reactivation experiment: ${assertions} assertions passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
