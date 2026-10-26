/* Patch 69: Flashcards ownership, interrupted capture, frozen meter and Wacky Replay regressions. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let checks = 0;
function check(value, description) { assert.ok(value, description); checks++; }
function equal(a,b,description) { assert.equal(a,b,description); checks++; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function checkFlashcardsController() {
  const listeners = new Map();
  const events = [];
  let attached = null;
  let active = false;
  let destroyed = 0;
  let recordingStatus = 'recording';
  let captureInterruptions = 0;
  let playbackPauses = 0;
  let wackyStops = 0;
  let microphoneRequests = 0;
  let home = 0;
  const effects = { getOfficialPresetIds: () => ['squirrel'], stop: () => { wackyStops++; return true; } };
  const recording = {
    dispose() { recordingStatus = 'idle'; },
    stopFun() { wackyStops++; },
    interruptCapture() { captureInterruptions++; recordingStatus = 'idle'; },
    pause() { playbackPauses++; },
    snapshot() { return { status: recordingStatus, hasRecording: false }; }
  };
  const window = {
    location: { protocol: 'capacitor:' },
    BibloZooAudioEffects: effects,
    BibloZooRecording: { create: () => recording },
    BibloZooWelcomeBackReturn: { attach(args) {
      attached = args;
      return { destroy() { destroyed++; } };
    } },
    addEventListener(name, fn) { listeners.set('window:' + name, fn); }
  };
  const document = { hidden: false,
    addEventListener(name, fn) { listeners.set('document:' + name, fn); } };
  const sandbox = { window, document, console, clearTimeout, setTimeout,
    cancelAnimationFrame() {}, requestAnimationFrame() {},
    performance: { now: () => 1000 }, Math, Object };
  vm.runInNewContext(read('flashcards/flashcards.js'), sandbox);
  window.BibloZooFlashcards.initialize({
    isActive: () => active,
    getVerseList: () => [{ id: 'john_11_35', ref: 'John 11:35' }],
    getVerseProgressSnapshot: () => ({ john_11_35: { learnCompleted: true } }),
    stopVersePreview: () => events.push('verse-preview-stopped'),
    getCurrentVerseId: () => 'john_11_35',
    goToHome: () => home++,
    requestRender: () => events.push('render')
  });
  check(attached !== null, 'Flashcards attaches shared Welcome Back controller');
  check(!attached.shouldPrompt(), 'popup ignores navigation outside Flashcards');
  active = true;
  equal(window.BibloZooFlashcards.startForVerse('john_11_35', { source: 'practice' }), true,
    'Flashcards session starts on selected card');
  check(attached.shouldPrompt(), 'popup is eligible only while Flashcards active');
  check(attached.preserveFocus === true, 'child focus is not forcibly stolen');
  equal(attached.escapeText, 'Back to Title', 'escape label matches destination');
  check(attached.suppressUiSound === true, 'Welcome Back button bypasses app tap sounds');
  equal(window.BibloZooFlashcards.getSessionState().selectedVerseId, 'john_11_35',
    'selected card remains stable');
  recordingStatus = 'recording';
  attached.onPause();
  check(captureInterruptions === 1, 'interrupted mic capture is not silently restarted');
  check(playbackPauses >= 1 && wackyStops >= 1, 'recorded audio and effects are stopped');
  check(events.includes('verse-preview-stopped'), 'narration is stopped on backgrounding');
  equal(attached.onContinue(), true, 'Welcome Back acknowledgement is explicit');
  equal(microphoneRequests, 0, 'acknowledgement never requests microphone permission');
  equal(window.BibloZooFlashcards.getSessionState().selectedVerseId, 'john_11_35',
    'card survives the interruption');
  equal(window.BibloZooFlashcards.getSessionState().context.source, 'practice',
    'flashcard context survives the interruption');
  equal(window.BibloZooFlashcards.getSessionState().view, 'difficulty',
    'flashcard screen is not restarted by audio recovery');
  attached.onExit();
  equal(home, 1, 'Back to Title uses host navigation');
  equal(destroyed, 1, 'Back to Title destroys popup before host navigation');
  window.BibloZooFlashcards.stopSession();
  check(destroyed === 1, 'navigation cleanup is idempotent');
}

async function checkFrozenMeter() {
  let time = 0;
  let microphoneRequests = 0;
  let contexts = [];
  let recorder;
  const messages = [];
  const document = { hidden:false, addEventListener() {} };
  const node = () => ({ connect() {}, disconnect() {} });
  class AudioCtx {
    constructor() { this.state='running'; this.destination=node(); this.closed=false; this.index=contexts.length; contexts.push(this); }
    get currentTime() { return this.index === 0 ? 0 : time / 1000; }
    resume() { return Promise.resolve(); }
    createAnalyser() { return { fftSize:256, connect() {}, disconnect() {},
      getByteTimeDomainData(data) { for(let i=0;i<data.length;i++) data[i]=i%2 ? 185:72; } }; }
    createMediaStreamSource() { return node(); }
    createGain() { const n=node(); n.gain={value:1}; return n; }
    close() { this.closed=true; this.state='closed'; return Promise.resolve(); }
  }
  const track={stop() {},onended:null};
  const stream={getTracks:()=>[track]};
  class Recorder {
    constructor(){this.state='inactive';this.mimeType='audio/mp4';recorder=this;}
    static isTypeSupported(){return true;}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['verse'])});this.onstop?.();}
  }
  class Audio { pause(){} removeAttribute(){} load(){} }
  const window={ AudioContext:AudioCtx, MediaRecorder:Recorder, BibloZooAudioEffects:{stop:()=>false},
    addEventListener(){}, BibloZooAudioDiagnostics:{record:(type,d)=>messages.push({type,...d})} };
  const sandbox={window,document,navigator:{mediaDevices:{getUserMedia:async()=>{microphoneRequests++;return stream;}}},
    MediaRecorder:Recorder,Audio,Blob,Uint8Array,Promise,console,performance:{now:()=>time},
    URL:{createObjectURL:()=> 'blob:one',revokeObjectURL(){}},
    setTimeout:(fn,ms)=>setTimeout(fn,ms >= 10000 ? ms : Math.min(ms,12)),clearTimeout};
  vm.runInNewContext(read('flashcards/recording.js'),sandbox);
  const rec=window.BibloZooRecording.create({onChange(){},onInterrupted(){}});
  equal(await rec.start(()=>{}),'recording','MediaRecorder capture begins with normal microphone permission');
  equal(microphoneRequests,1,'only one mic permission acquisition');
  equal(rec.readLevel()>0,true,'meter samples the active stream');
  time=1050;
  equal(rec.readLevel(),null,'frozen running AudioContext detected after elapsed time');
  check(messages.some(m=>m.type==='flashcards-meter-clock-stalled'), 'meter stall emits diagnostics');
  await sleep(35);
  equal(contexts.length,2,'only meter AudioContext is rebuilt once');
  check(contexts[0].closed,'old meter context is closed');
  time=1400;
  check(rec.readLevel()>0,'new analyser displays a real audio level');
  equal(rec.snapshot().status,'recording','recording continues independently of meter rebuild');
  equal(microphoneRequests,1,'meter rebuild never re-requests microphone permission');
  rec.stop();
  check(rec.snapshot().hasRecording,'meter rebuild does not discard captured audio');
  check(contexts[1].closed,'finished recording closes replacement meter');
}

async function checkWackyStalledClock() {
  const states = [];
  const diagnostics = [];
  const document = { hidden:false, currentScript:{src:'https://example.test/flashcards/audio-effects.js'},
    baseURI:'https://example.test/', addEventListener(){} };
  class FrozenContext {
    constructor() { this.state='running'; this.currentTime=0; states.push(this); }
    close() { this.state='closed'; return Promise.resolve(); }
  }
  const window = {
    AudioContext:FrozenContext, AudioWorkletNode:class {},
    Capacitor:{getPlatform:()=> 'ios',isNativePlatform:()=>true},
    setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,12)),clearTimeout,
    addEventListener(){},
    BibloZooAudioDiagnostics:{record:(type,d)=>diagnostics.push({type,...d})}
  };
  const sandbox={window,document,URL,Blob,Promise,console,setTimeout,clearTimeout};
  vm.runInNewContext(read('flashcards/audio-effects.js'),sandbox);
  const b=new Blob(['recorded speech'],{type:'audio/mp4'});
  await assert.rejects(window.BibloZooAudioEffects.playRecordedVerse(b,'squirrel'));
  check(states.length===1 && states[0].state==='closed',
    'Wacky rejects frozen running iOS audio clock and closes first context');
  check(diagnostics.some(x=>x.type==='flashcards-wacky-clock-stalled'),
    'Wacky logs the iOS clock stall without recording personal audio');
  await assert.rejects(window.BibloZooAudioEffects.playRecordedVerse(b,'squirrel'));
  check(states.length===2 && states[1].state==='closed',
    'new deliberate Wacky tap allocates fresh context instead of reusing frozen one');
}

function checkSourceContracts() {
  const effects=read('flashcards/audio-effects.js');
  const flashcards=read('flashcards/flashcards.js');
  const recording=read('flashcards/recording.js');
  const returnSource=read('verse_games/shared/welcome-back-return.js');
  const index=read('index.html');
  const app=read('app.js');
  const serviceWorker=read('service-worker.js');
  check(effects.includes('source.playbackRate.value = 1;'), 'input source is not tempo-shifted twice');
  check(effects.includes('soundTouch.playbackRate.value ='), 'SoundTouch still owns tempo');
  check(effects.includes('verifyPlaybackClock(audioContext)'), 'iOS Wacky playback clock is verified');
  check(effects.includes('discardUnhealthyAudioContext(audioContext);'), 'stalled Wacky context is released');
  check(effects.includes('flashcards-wacky-clock-stalled'), 'Wacky stall diagnostic available');
  check(effects.includes('flashcards-wacky-playback-failed'), 'Wacky setup and processor failures logged');
  check(recording.includes('METER_STALL_MS = 900'), 'bounded frozen-meter check installed');
  check(recording.includes('reconnectMeterOnce();'), 'meter uses bounded independent rebuild');
  check(recording.includes('interruptCapture()'), 'mic interruption has explicit separate capture method');
  check(returnSource.includes('suppressUiSound = false'), 'shared popup supports optional tap-sound suppression');
  check(index.includes('verse_games/shared/welcome-back-return.js'), 'app loads existing shared Welcome Back controller');
  check(app.includes('isActive: () => State.screen === Screen.FLASHCARDS'), 'host gates prompt to Flashcards');
  check(serviceWorker.includes('2026_Oct_26_patch69_2_wacky_single_tap'), 'cache refreshed');
  check(serviceWorker.includes('"./flashcards/vendor/soundtouchjs-2.1.1/SoundTouchNode.js"'), 'existing SoundTouch vendor assets remain listed');
  check(!flashcards.includes('navigator.mediaDevices.getUserMedia('), 'Flashcards return does not initiate mic permission');
  check(flashcards.includes('onContinue: () => true'), 'return never auto-replays narration or recording');
  check(flashcards.includes('onExit: () => {'), 'final recovery exit remains available');
  check(flashcards.includes('preserveFocus: true'), 'touch/keyboard focus protected');
  check(flashcards.includes('ensureFlashcardWelcomeBack'), 'only one popup integration');
}

(async()=>{
 checkSourceContracts();
 await checkFlashcardsController();
 await checkFrozenMeter();
 await checkWackyStalledClock();
 console.log(`Patch 69 Flashcards: ${checks} checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
