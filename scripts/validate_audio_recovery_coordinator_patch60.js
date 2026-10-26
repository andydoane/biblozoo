#!/usr/bin/env node
/* Patch 60: deterministic interruption-aware coordinator and source regression tests.
 * No WebKit, iPhone, hardware route, native activation or network is simulated. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p), 'utf8');
const helper = read('verse_games/shared/audio-recovery-coordinator.js');
const feed = read('daily_questions_feed_game.js');
const app = read('app.js');
const scene = read('ios/App/App/SceneDelegate.swift');
const diag = read('ios/App/App/AppDelegate.swift');
const html = read('index.html');
const sw = read('service-worker.js');
const { feedingHarness, flush } = require('./validate_audio_clock_recovery_patch56.js');
const { appHarness } = require('./validate_app_audio_patch19.js');
let assertions = 0;
function eq(a,b,reason){ assertions++; assert.equal(a,b,reason); }
function ok(a,reason){ assertions++; assert.ok(a,reason); }

function controller({ platform='ios', native=true, installed=true, disabled=false,
  hidden=false, states=null, activate=null }={}) {
  let now=0, tid=0, active=true, probes=0;
  const timers = new Map(), events=[], activation=[], stateReads=[];
  const storage = new Map();
  if (disabled) storage.set('biblozooAudioCoordination','0');
  const defaults = () => ({available:true,foreground:true,interruptionSequence:0,
    lastInterruptionType:'none',outputPorts:['Speaker']});
  const plugin = installed ? {getRecoveryState: () => {
    stateReads.push(now);
    const index = stateReads.length-1;
    return states ? states(index,now) : defaults();
  }} : undefined;
  const window = {document: {hidden},localStorage: {
    getItem: k => storage.get(k) || null,
    setItem: (k,v) => storage.set(k,String(v))
  },
  Capacitor: {isNativePlatform: () => native,getPlatform:()=>platform,
    Plugins:plugin?{BibloZooAudioSessionRecovery:plugin}:{}},
  BibloZooAudioDiagnostics:{record(type,fields){events.push({type,...fields});}},
  BibloZooNativeAudioRecovery: {isEnabled:()=>true,
    tryAfterClockStall: async source => {
      activation.push({source,at:now});
      if(activate) return activate(source,now);
      return {attempted:true,activated:true,reason:'activated'};
    }}
  };
  const box = {window,
    setTimeout(fn,ms){ const id=++tid;timers.set(id,{fn,at:now+ms});return id;},
    clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(helper,box);
  const api=window.BibloZooAudioRecoveryCoordinator;
  async function advance(ms) {
    const limit=now+ms;
    for(let count=0;count<1000;count++) {
      await flush();
      const due=[...timers].filter(([,t])=>t.at<=limit)
        .sort((a,b)=>a[1].at-b[1].at||a[0]-b[0]);
      if(!due.length){now=limit;await flush();return;}
      const [id,t]=due[0];timers.delete(id);now=t.at;t.fn();
    }
    throw Error('runaway timer loop');
  }
  return {api,window,events,activation,stateReads,storage,advance,timers,
    setCurrent:v=>{active=v;},isCurrent:()=>active,
    probe:()=>{probes++;return Promise.resolve(false);},
    get probes(){return probes;},get now(){return now;}};
}

async function testAvailability() {
  for (const variant of [
    {platform:'web',native:false},{platform:'android'},
    {platform:'ios',native:false},{installed:false},{disabled:true}
  ]) {
    const h=controller(variant);
    eq(h.api.isAvailable(),false,'Only enabled native iOS plugin is eligible');
    const r=await h.api.recoverAfterStall({source:'feeding',probe:()=>true,isCurrent:h.isCurrent});
    eq(r.reason,'unavailable','Unsupported environment remains inert');
    eq(h.activation.length,0,'No native activity outside eligible environment');
  }
  const h=controller();eq(h.api.isAvailable(),true,'Native iOS coordinator available');
  h.api.disable();eq(h.api.isAvailable(),false,'Persistent disable works');
  h.api.enable();eq(h.api.isAvailable(),true,'Persistent re-enable works');
  eq((await h.api.recoverAfterStall({source:'bad',probe:()=>true,isCurrent:h.isCurrent})).reason,
    'unavailable','No unknown source can enter coordinator');
  h.window.document.hidden=true;
  eq((await h.api.recoverAfterStall({source:'app',probe:()=>true,isCurrent:h.isCurrent})).reason,
    'unavailable','Hidden page never attempts recovery');
}
async function testSettlingWithoutNative() {
  const h=controller();let probes=0;
  const task=h.api.recoverAfterStall({source:'feeding',isCurrent:h.isCurrent,
    probe: async()=>++probes===1});
  await h.advance(320);const result=await task;
  eq(result.recovered,true,'Recovery can succeed by settling without native activation');
  eq(result.reason,'settled','Settled-path reason recorded');
  eq(probes,1,'Settled success avoids extra probes');
  eq(h.activation.length,0,'No native activation on settled path');
  ok(h.events.some(e=>e.phase==='settled-recheck'&&e.clockAdvanced), 'Settled probe diagnostic');
  eq(h.timers.size,0,'Timers cleared following settling');
}
async function testNativeAndLateSuccess() {
  for(const phase of ['post-native','late-settled']){
    let checks=0;
    const h=controller();
    const task=h.api.recoverAfterStall({source:'app',isCurrent:h.isCurrent,
      probe:async()=>++checks===(phase==='post-native'?2:3)});
    await h.advance(1700);
    const result=await task;
    eq(result.recovered,true,'Clock must advance to declare coordinated recovery');
    eq(result.reason,phase,'Distinct recovery phase identified');
    eq(h.activation.length,1,'At most one native intervention per recovery');
    eq(h.activation[0].source,'app','Native request uses correct owner');
    eq(h.timers.size,0,'No settled-path timers left');
  }
}
async function testRecentInterruptionAndMissingSignals() {
  const h=controller({states:()=>({available:true,foreground:true,
    lastInterruptionType:'began',interruptionAgeMs:200,interruptionSequence:7})});
  const task=h.api.recoverAfterStall({source:'feeding',isCurrent:h.isCurrent,
    probe:async()=>false});
  await h.advance(1700);const result=await task;
  eq(result.recovered,false,'Unresolved interruption never reports success');
  eq(result.reason,'interruption-pending','Unresolved native interruption is not a completed clock failure');
  eq(h.activation.length,0,'Do not reactivate during a fresh interruption');
  ok(h.events.some(e=>e.phase==='native-deferred' && e.interruptionSequence===7),
    'Native interruption signal recorded and respected');
  const noSignal=controller({states:()=>({available:false})});
  const p=noSignal.api.recoverAfterStall({source:'app',isCurrent:noSignal.isCurrent,
    probe:()=>false});await noSignal.advance(1700);eq((await p).recovered,false,'No native state does not hang');
  eq(noSignal.activation.length,0,'No unverified native activation if state unavailable');
}
async function testStaleAndConcurrent() {
  const h=controller();const first=h.api.recoverAfterStall({source:'feeding',
    isCurrent:h.isCurrent,probe:()=>false});
  const second=await h.api.recoverAfterStall({source:'app',
    isCurrent:h.isCurrent,probe:()=>true});
  eq(second.reason,'busy','Shared coordinator rejects competing owner');
  h.setCurrent(false);await h.advance(320);const stale=await first;
  eq(stale.reason,'stale','Generation invalidation cancels pending recovery');
  eq(h.activation.length,0,'Stale owner never activates iOS session');
  ok(h.events.some(e=>e.phase==='busy'),'Shared ownership diagnostic recorded');
  h.setCurrent(true);let count=0;
  const repeat=h.api.recoverAfterStall({source:'app',isCurrent:h.isCurrent,
    probe:()=>++count===1});await h.advance(320);
  eq((await repeat).recovered,true,'Ownership released for next user gesture');
}
async function testBridgeHangs() {
  const stuckState=controller({states:()=>new Promise(()=>{})});
  const first=stuckState.api.recoverAfterStall({source:'feeding',
    isCurrent:stuckState.isCurrent,probe:()=>false});
  await stuckState.advance(3100);
  eq((await first).recovered,false,'Hanging native state read times out');
  eq(stuckState.activation.length,0,'No activation after unverified native snapshot');
  eq(stuckState.timers.size,0,'Hanging snapshot leaves no active timers');
  const stuckActivation=controller({activate:()=>new Promise(()=>{})});
  const second=stuckActivation.api.recoverAfterStall({source:'feeding',
    isCurrent:stuckActivation.isCurrent,probe:()=>false});
  await stuckActivation.advance(3500);
  eq((await second).recovered,false,'Hanging activation is bounded');
  eq(stuckActivation.activation.length,1,'One and only one native activation attempted');
  ok(stuckActivation.events.some(e=>e.phase==='native-result'&&e.reason==='native-timeout'),
    'Native timeout identified');
  eq(stuckActivation.timers.size,0,'Native timeout cleans timers');
}
async function testFeedingIntegration() {
  for(const mode of ['labyrinth','classic','bounce','melody']){
    const h=feedingHarness({initialMode:'stalled',mode});
    let called=0;
    h.window.BibloZooAudioRecoveryCoordinator={isAvailable:()=>true,
      recoverAfterStall:async ({source,probe,isCurrent})=>{
        called++;eq(source,'feeding','Feeding owns its own recovery');
        eq(isCurrent(),true,'Gesture remains current while paused');
        h.contexts[0].mode='healthy';
        return {recovered: await probe(),reason:'settled'};
      }};
    h.api.pauseFeedingGame(h.runtime,10000);
    eq(h.api.attemptFeedingResumeFromGesture(h.runtime),true,'Feeding Resume accepted');
    await flush();await h.advance(180);
    eq(called,1,'Coordinator only invoked after first failed clock');
    eq(h.runtime.resumeOverlay.hidden,false,'Overlay remains visible during coordination');
    eq(h.runtime.feedPausedAt,10000,'Game timers do not advance before clock verification');
    await h.advance(180);
    eq(h.runtime.feedPausedAt,null,'Coordination may unpause only with advanced clock');
    eq(h.runtime.resumeOverlay.hidden,true,'Verified recovery hides overlay');
    eq(h.contexts.length,1,'No extra AudioContext allocations during settling');
    eq(h.runtime.score,12,'Score protected');
    eq(h.runtime.balls[0].x,50,'Labyrinth coordinates protected');
    ok(h.log.some(e=>e.type==='feed-audio-coordinated-result'&&e.recovered),
      'Recovery result recorded');
    h.api.discard();
  }
  const h=feedingHarness({initialMode:'stalled'});
  h.window.BibloZooAudioRecoveryCoordinator={isAvailable:()=>true,
    recoverAfterStall:async()=>({recovered:false,reason:'clock-stalled'})};
  h.api.pauseFeedingGame(h.runtime,10000);
  h.api.attemptFeedingResumeFromGesture(h.runtime);
  await flush();await h.advance(180);
  eq(h.runtime.feedPausedAt,10000,'Failed coordination remains paused');
  eq(h.runtime.resumeOverlay.hidden,false,'Failed coordination keeps overlay');
  eq(h.runtime.feedAudioNeedsFreshContext,true,'Existing replacement fallback remains available');
  h.api.discard();
  const hanging=feedingHarness({initialMode:'stalled'});
  hanging.window.BibloZooAudioRecoveryCoordinator={isAvailable:()=>true,
    recoverAfterStall:()=>new Promise(()=>{})};
  hanging.api.pauseFeedingGame(hanging.runtime,10000);
  hanging.api.attemptFeedingResumeFromGesture(hanging.runtime);
  await flush();await hanging.advance(4200);
  eq(hanging.runtime.feedResumePending,false,'Native iOS watchdog is bounded at 4.2 seconds');
  eq(hanging.runtime.feedPausedAt,10000,'Hung coordinator cannot unpause gameplay');
  eq(hanging.runtime.resumeOverlay.hidden,false,'Hung coordinator keeps retry overlay');
  hanging.api.discard();
}
async function testAppIntegration() {
  const h=appHarness();
  eq(await h.api.unlockAppAudio(),true,'Main app baseline audio runs');
  h.api.markAppAudioInterrupted();
  let owner=0;
  h.window.BibloZooAudioRecoveryCoordinator={isAvailable:()=>true,
    recoverAfterStall:async ({source,probe,isCurrent})=>{
      owner++;eq(source,'app','App owns coordinator after clock stall');
      eq(isCurrent(),true,'Current main-app generation guarded');
      // Real coordinator only returns true when the clock probe advances.
      const p=probe();
      h.contexts[0].currentTime=0.2;
      h.fire(90);
      return {recovered:await p,reason:'settled'};
    }};
  const waiting=h.api.unlockAppAudio();await flush();h.fire(90);await flush();
  eq(await waiting,true,'Main app returns success after second actual clock probe');
  eq(owner,1,'Exactly one coordinator request');
  eq(h.api.appAudioStatus().pending,false,'Main app interruption cleared after verified clock');
  const fail=appHarness();await fail.api.unlockAppAudio();fail.api.markAppAudioInterrupted();
  fail.window.BibloZooAudioRecoveryCoordinator={isAvailable:()=>true,
    recoverAfterStall:async()=>({recovered:false,reason:'clock-stalled'})};
  const no=fail.api.unlockAppAudio();await flush();fail.fire(90);
  eq(await no,false,'Unrecoverable app audio stays unavailable');
  eq(fail.api.appAudioStatus().fresh,true,'Fresh context requires a new gesture');
}
function sourcePolicies() {
  ok(scene.includes('CAPPluginMethod(name: "getRecoveryState"'),
    'New method registered in existing Capacitor 8 bridge');
  ok(scene.includes('AVAudioSession.interruptionNotification'), 'Native interruption observed');
  ok(scene.includes('AVAudioSession.routeChangeNotification'), 'Native route observed');
  ok(scene.includes('interruptionAgeMs'), 'Age of interruption returned to JS');
  ok(scene.includes('interruptionSequence'), 'Monotonic native interruption epoch');
  ok(scene.includes('UIApplication.shared.applicationState == .active'), 'Native foreground guard maintained');
  eq((scene.match(/setActive\(true\)/g)||[]).length,1,
    'No additional native audio activation beyond Patch 59');
  ok(!/setCategory\(|setMode\(|setActive\(false\)/.test(scene),
    'Category, mode, and deactivation not modified');
  ok(!/setActive\(/.test(diag),'Patch 58 observer remains read-only');
  ok(sw.includes("2026_Oct_26_patch68_1_interruption_gate_jam_startup"), "Cache updated");
  ok(sw.includes('"./verse_games/shared/audio-recovery-coordinator.js"'),
    'New web helper cached for offline PWA');
  ok(html.includes('audioCoord') && html.includes('biblozooAudioCoordination'),
    'URL query can disable experimental coordinator without a code edit');
  ok(html.includes('src="verse_games/shared/audio-recovery-coordinator.js"'),
    'Coordinator script included');
  ok(html.indexOf('audio-recovery-coordinator.js') < html.indexOf('daily_questions_feed_game.js'),
    'Coordinator loads before game and main app');
  ok(!/setCategory\(|setActive\(|AVAudioSession\.|@capacitor\//.test(helper.replace(/\/\/[^\n]*/g, '')),
    'Coordinator itself never invokes AVAudioSession or native imports');
  ok(!feed.includes('Capacitor.Plugins'), 'Feeding has no direct native dependency');
  ok(feed.includes('coordinator?.isAvailable?.() ? 4200 : 2500'),
    'Browser path keeps existing 2.5s watchdog');
  ok(app.includes('if (coordinator?.isAvailable?.())'), 'Optional main-app path');
  ok(feed.includes('runtime.feedResumeGeneration === generation'), 'Feeding stale generation guard');
  ok(app.includes('generation === appAudioUnlockGeneration'), 'App stale generation guard');
  ok(helper.includes('if (busy)'), 'Single global recovery owner');
  ok(helper.includes('function interruptionPending(state)'), 'Unresolved native interruptions remain guarded');
}
(async()=>{
  sourcePolicies();
  await testAvailability();
  await testSettlingWithoutNative();
  await testNativeAndLateSuccess();
  await testRecentInterruptionAndMissingSignals();
  await testStaleAndConcurrent();
  await testBridgeHangs();
  await testFeedingIntegration();
  await testAppIntegration();
  console.log(`Patch 60 interruption-aware audio recovery: ${assertions} assertions passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
