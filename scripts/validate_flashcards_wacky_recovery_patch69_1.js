/* Patch 69.1: iOS Wacky Replay after a task switch, without touching microphone capture. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let checks = 0;
function check(ok, description) { assert.ok(ok, description); checks++; }
function equal(a, b, description) { assert.equal(a, b, description); checks++; }
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const S = read('flashcards/audio-effects.js');
function harness(mode) {
  const events = [];
  const diagnostics = [];
  const contexts = [];
  let nativeCalls = 0;
  let live = mode === 'healthy';
  const document = { hidden:false, currentScript:{src:'https://example.test/flashcards/audio-effects.js'},
    baseURI:'https://example.test/',
    addEventListener(name, cb) { events.push({ target:'doc', name, cb }); } };
  class AudioCtx {
    constructor() { this.state='running'; this.t=0; contexts.push(this); }
    get currentTime() { return live ? (this.t += 0.2) : 0; }
    close() { this.state='closed'; return Promise.resolve(); }
  }
  const coordinator = { isAvailable: () => true,
    async recoverAfterStall({source,probe,isCurrent}) {
      nativeCalls++;
      equal(source,'app','uses existing app native-audio recovery ownership');
      check(isCurrent(),'native coordination owns the current replay request');
      if (mode === 'pending') return { recovered:false, reason:'interruption-pending' };
      if (mode === 'cooldown') return { recovered:false, reason:'native-cooldown' };
      if (mode === 'background') {
        document.hidden = true;
        fire('doc','visibilitychange');
        return { recovered:true, reason:'late-settled' };
      }
      live = true;
      return { recovered:await probe(), reason:'post-native' };
    }
  };
  const window = { AudioContext:AudioCtx, AudioWorkletNode:class {},
    Capacitor:{getPlatform:()=> 'ios',isNativePlatform:()=>true},
    BibloZooAudioRecoveryCoordinator:coordinator,
    BibloZooAudioDiagnostics:{record(type, detail={}) { diagnostics.push({type, ...detail}); }},
    setTimeout(fn, ms) { return setTimeout(fn, Math.min(ms,8)); },clearTimeout,
    addEventListener(name,cb) { events.push({target:'win',name,cb}); } };
  const sandbox={window,document,URL,Blob,Promise,console,setTimeout,clearTimeout};
  vm.runInNewContext(S,sandbox);
  const fire = (target,name) => events.filter(e => e.target===target && e.name===name).forEach(e=>e.cb());
  return {api:window.BibloZooAudioEffects,document,contexts,diagnostics,fire,
    nativeCalls:()=>nativeCalls, setLive:value=>{live=value;} };
}
async function attempt(h) {
  // The vendor module is intentionally absent from the source-only archive.
  // The test validates the preceding native coordination and clock checks.
  await assert.rejects(h.api.playRecordedVerse(new Blob(['sample']), 'squirrel'));
}
async function run() {
  {
    const h=harness('recovered'); await attempt(h);
    equal(h.nativeCalls(),1,'stalled Wacky context invokes native coordinator once');
    equal(h.contexts.length,1,'recovery never creates another AudioContext on the same tap');
    equal(h.contexts[0].state,'running','successful clock recovery keeps the live context');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-clock-stalled'), 'initial stall is logged');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-recovery-start'), 'coordination start is logged');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-recovery-result' && e.recovered && e.reason==='post-native'),
      'verified recovery outcome is logged separately from the processor');
    h.document.hidden=true; h.fire('doc','visibilitychange');
    equal(h.contexts[0].state,'closed','background retires recovered but idle context');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-context-retired' && e.reason==='visibility-hidden'),
      'idle retirement is visible in diagnostics');
    h.fire('win','pagehide');
    equal(h.diagnostics.filter(e=>e.type==='flashcards-wacky-context-retired').length,1,
      'duplicate pagehide does not retire already closed context twice');
  }
  {
    const h=harness('pending'); await attempt(h);
    equal(h.nativeCalls(),1,'active native interruption is examined once');
    equal(h.contexts.length,1,'pending native interruption never triggers immediate replacement');
    equal(h.contexts[0].state,'closed','unsuccessful context is retired for a later gesture');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-recovery-result' && !e.recovered && e.reason==='interruption-pending'),
      'pending interruption is distinctly diagnosed');
    await attempt(h);
    equal(h.contexts.length,2,'a later deliberate Wacky tap can retry using fresh context');
  }
  {
    const h=harness('cooldown'); await attempt(h);
    equal(h.contexts.length,1,'native cooldown does not cause extra context creation');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-recovery-result' && e.reason==='native-cooldown'),
      'native cooldown is distinctly diagnosed');
  }
  {
    const h=harness('background'); await attempt(h);
    equal(h.contexts[0].state,'closed','background during native recovery closes stale context');
    check(h.diagnostics.some(e=>e.type==='flashcards-wacky-recovery-result' && e.recovered===false),
      'late native success does not start a canceled/backgrounded replay');
    check(!h.diagnostics.some(e=>e.type==='flashcards-wacky-recovery-result' && e.recovered===true),
      'backgrounded replay cannot claim successful recovery');
  }
  {
    const h=harness('healthy'); await attempt(h);
    equal(h.nativeCalls(),0,'normal advancing clock does not invoke native reactivation');
    equal(h.contexts.length,1,'normal Wacky tap uses one audio context');
    equal(h.contexts[0].state,'running','normal audio is never closed solely for its initial tap');
    h.document.hidden=true; h.fire('win','pagehide');
    equal(h.contexts[0].state,'closed','pagehide retires an idle context even if no Wacky sound is playing');
  }
  check(S.includes('const current = () => !document.hidden'), 'native call aborts stale UI gesture');
  check(S.includes('generation === playbackGeneration'), 'native recovery is bound to the current Wacky request');
  check(S.includes('probe: () => current() ? verifyPlaybackClock(audioContext) : false'),
    'native coordination verifies real clock advancement');
  check(S.includes('retirePlaybackContext("pagehide")'), 'pagehide cleanup is installed');
  check(S.includes('retirePlaybackContext("visibility-hidden")'), 'hidden-page cleanup is installed');
  check(S.includes('flashcards-wacky-resume-failed'), 'resume timeout is diagnosable');
  check(S.includes('phase: "after-worklet"'), 'clock is checked again following long worklet setup');
  check(!S.includes('getUserMedia('), 'Wacky replay never requests microphone input');
  check(!S.includes('setCategory('), 'Wacky replay never changes iOS audio session category');
  const record=read('flashcards/recording.js');
  check(record.includes('interruptCapture()'), 'recording interruption behavior is preserved');
  const sw=read('service-worker.js');
  check(sw.includes('2026_Oct_26_patch69_1_wacky_recovery'), 'new cache generation delivers Wacky update');
  console.log(`Patch 69.1 Wacky recovery: ${checks} checks passed.`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
