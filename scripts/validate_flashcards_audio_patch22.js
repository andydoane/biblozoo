/* Patch 22: microphone interruption, replay eligibility and Web Audio regression checks. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const effectsSource = read('flashcards/audio-effects.js');
const recordingSource = read('flashcards/recording.js');
const flashcardsSource = read('flashcards/flashcards.js');
const workerSource = read('service-worker.js');
let checks = 0;
const check = (condition, description) => { assert.ok(condition, description); checks++; };
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const listeners = () => {
  const callbacks = new Map();
  return { callbacks,
    addEventListener(type, handler) { callbacks.set(type, handler); },
    fire(type) { callbacks.get(type)?.(); }
  };
};

function effectFixture() {
  const stats = { starts: 0, stops: 0, disconnects: 0, contexts: [], register: 0, callbacks: 0 };
  const d = listeners(); d.hidden = false;
  const w = listeners();
  w.location = { protocol: 'https:' };
  w.setTimeout = (fn, delay) => setTimeout(fn, delay >= 1000 ? 65 : Math.min(10, delay));
  w.clearTimeout = clearTimeout;
  w.AudioWorkletNode = class {};
  w.resumeMode = 'success'; w.startFailure = false; w.registrationMode = 'success';
  w.metricsMode = 'output'; w.decodeMode = 'quiet';
  w.resumeDeferred = deferred(); w.registrationDeferred = deferred();
  class Node {
    constructor() { this.handlers = new Map(); }
    connect() { return this; }
    disconnect() { stats.disconnects++; }
    addEventListener(type, cb) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set());
      this.handlers.get(type).add(cb);
    }
    removeEventListener(type, cb) { this.handlers.get(type)?.delete(cb); }
    emit(type, data = {}) {
      for (const cb of [...(this.handlers.get(type) || [])]) cb({ type, detail: data });
    }
  }
  class Source extends Node {
    constructor() { super(); this.playbackRate = { value: 1 }; this.onended = null; }
    start() {
      if (w.startFailure) throw new Error('start blocked');
      stats.starts++;
      if (w.metricsMode !== 'none' && w.metricsMode !== 'manual') {
        setTimeout(() => {
          const peak = w.metricsMode === 'silent' ? 0 : 0.24;
          stats.lastSoundTouch?.emit('metrics', { blockCount: 100, outputRms: peak * 0.5, outputPeak: peak });
        }, 0);
      }
    }
    stop() { stats.stops++; }
  }
  class Param {
    setValueAtTime() {}
    cancelScheduledValues() {}
    linearRampToValueAtTime() {}
  }
  class SoundTouchNode extends Node {
    constructor() {
      super(); this.pitchSemitones = new Param(); this.playbackRate = { value: 1 };
      stats.lastSoundTouch = this;
    }
    static register() {
      stats.register++;
      if (w.registrationMode === 'pending') return w.registrationDeferred.promise;
      if (w.registrationMode === 'reject') return Promise.reject(new Error('worklet failed'));
      return Promise.resolve();
    }
  }
  class Context extends Node {
    constructor() {
      super(); this.state = 'suspended'; this.currentTime = 0;
      this.destination = new Node(); stats.contexts.push(this);
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
    resume() {
      if (w.resumeMode === 'pending') return w.resumeDeferred.promise;
      if (w.resumeMode === 'reject') return Promise.reject(new Error('gesture required'));
      if (w.resumeMode === 'silent') return Promise.resolve();
      this.state = 'running';
      return Promise.resolve();
    }
    decodeAudioData() {
      if (w.decodeMode === 'speech') {
        const data = new Float32Array(16000);
        data.fill(0.08);
        return Promise.resolve({ duration: 2, sampleRate: 8000, length: data.length,
          numberOfChannels: 1, getChannelData: () => data });
      }
      return Promise.resolve({ duration: 2 });
    }
    createBufferSource() { const source = new Source(); stats.lastSource = source; return source; }
    createGain() { if (w.gainFailure) throw new Error('gain unavailable'); const gain = new Node(); gain.gain = { value: 1 }; return gain; }
  }
  w.AudioContext = Context;
  w.__patch22Import = () => Promise.resolve({ SoundTouchNode });
  const oldImport = 'import(\n        soundTouchModuleUrl\n      )';
  check(effectsSource.includes(oldImport), 'Original SoundTouch module import is intact');
  const instrumented = effectsSource.replace(oldImport, 'window.__patch22Import()');
  const sandbox = { window: w, document: { ...d, currentScript: { src: 'https://example.test/flashcards/audio-effects.js' }, baseURI: 'https://example.test/' }, URL, Blob, Promise, console, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(instrumented, sandbox);
  const api = w.BibloZooAudioEffects;
  const blob = new Blob(['sound'], { type: 'audio/mp4' });
  return { w, d: sandbox.document, stats, api, blob };
}

async function testEffects() {
  {
    const f = effectFixture();
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'squirrel', () => began++);
    await tick();
    check(f.stats.starts === 1, 'processed audio source starts successfully');
    check(began === 1, 'successful source start signals replay eligibility exactly once');
    f.stats.lastSource.onended();
    check(await result === true, 'natural effect completion resolves successful playback');
  }
  {
    const f = effectFixture(); f.w.startFailure = true;
    let began = 0;
    const completed = await f.api.playRecordedVerse(f.blob, 'giant', () => began++);
    check(completed === false, 'failed source.start is not successful playback');
    check(began === 0, 'failed source.start does not consume replay');
    check(f.stats.disconnects > 0, 'failed source.start disconnects the graph');
  }
  {
    const f = effectFixture(); f.w.gainFailure = true;
    const completed = await f.api.playRecordedVerse(f.blob, 'squirrel');
    check(completed === false && f.stats.starts === 0, 'failed graph construction does not begin playback');
    check(f.stats.disconnects > 0, 'partially built audio graph is disconnected');
  }
  {
    const f = effectFixture(); f.w.resumeMode = 'reject';
    let began = 0;
    await assert.rejects(f.api.playRecordedVerse(f.blob, 'sleepy', () => began++));
    check(began === 0 && f.stats.starts === 0, 'rejected context resume never starts playback');
    f.w.resumeMode = 'success';
    const retry = f.api.playRecordedVerse(f.blob, 'sleepy', () => began++);
    await tick();
    check(began === 1 && f.stats.starts === 1, 'later gesture can retry failed context activation');
    f.api.stop();
    check(await retry === false, 'stopping a started replay resolves interruption');
  }
  {
    const f = effectFixture(); f.w.resumeMode = 'silent';
    await assert.rejects(f.api.playRecordedVerse(f.blob, 'squirrel'));
    check(f.stats.starts === 0, 'resolved resume promise alone is not proof context is running');
  }
  {
    const f = effectFixture(); f.w.resumeMode = 'pending';
    const start = Date.now();
    await assert.rejects(f.api.playRecordedVerse(f.blob, 'rocket'));
    check(Date.now() - start < 500, 'an unresolved resume promise times out');
    check(f.stats.starts === 0, 'timeout never creates an audio source');
    f.w.resumeMode = 'success';
    const retry = f.api.playRecordedVerse(f.blob, 'rocket');
    await tick();
    check(f.stats.starts === 1, 'new gesture can recover after resume timeout');
    f.api.stop(); await retry;
    f.w.resumeDeferred.resolve();
  }
  {
    const f = effectFixture(); f.w.registrationMode = 'pending';
    await assert.rejects(f.api.playRecordedVerse(f.blob, 'rocket'));
    check(f.stats.starts === 0, 'stalled worklet initialization times out without playback');
    f.w.registrationMode = 'success';
    f.w.registrationDeferred.resolve();
    const retry = f.api.playRecordedVerse(f.blob, 'rocket');
    await tick();
    check(f.stats.starts === 1, 'worklet initialization that later resolves allows retry');
    f.api.stop(); await retry;
  }
  {
    const f = effectFixture(); f.w.registrationMode = 'reject';
    await assert.rejects(f.api.playRecordedVerse(f.blob, 'squirrel'));
    check(f.stats.starts === 0, 'failed worklet registration does not begin playback');
    f.w.registrationMode = 'success';
    const retry = f.api.playRecordedVerse(f.blob, 'squirrel');
    await tick();
    check(f.stats.starts === 1, 'worklet registration rejection permits retry');
    f.api.stop(); await retry;
  }
  {
    const f = effectFixture(); f.w.resumeMode = 'pending';
    const waiting = f.api.playRecordedVerse(f.blob, 'squirrel');
    f.api.stop();
    f.w.resumeMode = 'success'; f.stats.contexts[0].state = 'running'; f.w.resumeDeferred.resolve();
    check(await waiting === false, 'stopped pending audio activation never starts late');
    check(f.stats.starts === 0, 'canceled activation leaves no active source');
  }
  {
    const f = effectFixture();
    const result = f.api.playRecordedVerse(f.blob, 'squirrel');
    await tick();
    f.d.hidden = true;
    f.d.fire('visibilitychange');
    check(await result === false, 'backgrounding terminates active effects');
    check(f.stats.stops === 1 && f.stats.disconnects > 0, 'backgrounded effects stop and disconnect');
  }
  {
    const f = effectFixture(); f.w.metricsMode = 'none';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'squirrel', () => began++);
    check(await result === false, 'missing processor heartbeat stops Wacky Replay');
    check(began === 0, 'missing heartbeat does not consume Wacky Replay');
    check(f.stats.stops > 0 && f.stats.disconnects > 0, 'missing heartbeat releases processed audio nodes');
    check(f.stats.contexts[0].state === 'closed', 'worklet stall discards its unhealthy AudioContext');
    f.w.metricsMode = 'output';
    const retry = f.api.playRecordedVerse(f.blob, 'squirrel', () => began++);
    await tick();
    check(began === 1, 'new tap after stalled worklet starts successfully');
    check(f.stats.contexts.length === 2, 'Wacky retry creates a fresh AudioContext after processor failure');
    f.stats.lastSource.onended();
    check(await retry === true, 'successful retry completes normally');
  }
  {
    const f = effectFixture(); f.w.decodeMode = 'speech'; f.w.metricsMode = 'silent';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'rocket', () => began++);
    await tick();
    check(began === 0, 'worklet rendering only silence does not immediately spend voiced replay');
    check(await result === false, 'sustained silent output for voiced recording fails promptly');
    check(began === 0, 'genuinely silent output failure preserves one-time replay');
    check(f.stats.stops > 0, 'silent worklet failure stops source');
  }
  {
    const f = effectFixture(); f.w.decodeMode = 'speech'; f.w.metricsMode = 'manual';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'giant', () => began++);
    await tick();
    f.stats.lastSoundTouch.emit('metrics', { blockCount: 100, outputPeak: 0, outputRms: 0 });
    check(began === 0, 'silent first processor heartbeat does not spend voiced replay');
    f.stats.lastSoundTouch.emit('metrics', { blockCount: 200, outputPeak: 0.1, outputRms: 0.02 });
    check(began === 1, 'real processed output spends Wacky Replay exactly once');
    f.stats.lastSoundTouch.emit('metrics', { blockCount: 300, outputPeak: 0.5, outputRms: 0.05 });
    check(began === 1, 'later audio metrics cannot spend replay twice');
    f.stats.lastSource.onended();
    check(await result === true, 'processed audio and normal end are a successful replay');
  }
  {
    const f = effectFixture(); f.w.metricsMode = 'manual';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'sleepy', () => began++);
    await tick();
    f.stats.lastSoundTouch.emit('metrics', { blockCount: 100, outputPeak: 0, outputRms: 0 });
    check(began === 1, 'legitimate quiet recording establishes replay via a running worklet');
    f.stats.lastSource.onended();
    check(await result === true, 'quiet recording is not rejected as a silent worklet failure');
  }
  {
    const f = effectFixture(); f.w.metricsMode = 'manual';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'rocket', () => began++);
    await tick();
    f.stats.lastSoundTouch.emit('processorerror');
    check(await result === false && began === 0, 'worklet processorerror before output allows retry');
    check(f.stats.disconnects > 0, 'processorerror disconnects active audio graph');
  }
  {
    const f = effectFixture();
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'giant', () => began++);
    await tick();
    check(began === 1, 'processed replay begins before later AudioContext interruption');
    f.stats.contexts[0].state = 'interrupted';
    f.stats.contexts[0].emit('statechange');
    check(await result === false, 'interrupted AudioContext stops processed playback');
    check(began === 1, 'interruption after processed output cannot restore one-time replay');
  }
  {
    const f = effectFixture(); f.w.metricsMode = 'manual';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'squirrel', () => began++);
    await tick();
    f.stats.contexts[0].state = 'suspended';
    f.stats.contexts[0].emit('statechange');
    check(await result === false && began === 0, 'context loss before processor output leaves Wacky Replay retryable');
  }
  {
    const f = effectFixture(); f.w.metricsMode = 'manual';
    let began = 0;
    const result = f.api.playRecordedVerse(f.blob, 'squirrel', () => began++);
    await tick();
    const oldNode = f.stats.lastSoundTouch;
    f.api.stop();
    check(await result === false, 'leaving Flashcards stops pending verification');
    oldNode.emit('metrics', { blockCount: 100, outputPeak: 0.4 });
    check(began === 0, 'late worklet metrics cannot spend an abandoned replay');
  }
  {
    const f = effectFixture(); f.w.metricsMode = 'manual';
    const result = f.api.playRecordedVerse(f.blob, 'squirrel');
    await tick();
    f.stats.lastSoundTouch.emit('metrics', { blockCount: 100, outputPeak: 0.4 });
    // A processor that stops emitting metrics after initial output must not
    // hold the disabled button for the full verse length.
    check(await result === false, 'processor heartbeat that stalls mid-playback stops promptly');
    check(f.stats.stops > 0, 'mid-playback processor stall stops source');
  }
  check(effectsSource.includes('"processorerror"'), 'worklet errors are monitored without changing presets');
  check(effectsSource.includes('"statechange"'), 'AudioContext state changes are monitored');
  check(effectsSource.includes('hasEarlyRecordingSignal(audioBuffer)'), 'quiet recorded beginnings are distinguished from stalled voiced output');
  check(effectsSource.includes('gain.gain.value = 0.88'), 'existing Wacky Replay output gain preserved');
  check(effectsSource.includes('"squirrel"') && effectsSource.includes('"cave"'), 'existing official voice effects preserved');
}

function recordingFixture() {
  const d = listeners(); d.hidden = false;
  const w = listeners(); w.AudioContext = null; w.webkitAudioContext = null;
  let revoked = 0; let micRequests = 0; let tracksStopped = 0; let player = null;
  const stream = { getTracks: () => [{ stop() { tracksStopped++; } }] };
  class FakeAudio {
    constructor(url) { this.src = url; this.currentTime = 0; this.playMode = 'resolve'; this.pauseCount = 0; player = this; }
    pause() { this.pauseCount++; }
    play() {
      if (this.playMode === 'pending') { this.deferred = deferred(); return this.deferred.promise; }
      if (this.playMode === 'reject') return Promise.reject(new Error('not allowed'));
      return Promise.resolve();
    }
    removeAttribute() { this.src = ''; }
    load() {}
  }
  class Recorder {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
    static isTypeSupported() { return true; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['verse'], { type: 'audio/mp4' }) });
      this.onstop?.();
    }
  }
  const sandbox = {
    window: w, document: d,
    Audio: FakeAudio, MediaRecorder: Recorder,
    navigator: { mediaDevices: { getUserMedia: async () => { micRequests++; return stream; } } },
    URL: { createObjectURL: () => 'blob:verse', revokeObjectURL: () => revoked++ },
    Blob, Uint8Array, Math, performance: { now: () => 1000 },
    setTimeout, clearTimeout, console,
  };
  w.MediaRecorder = Recorder;
  w.BibloZooAudioEffects = { stop: () => false, isSupported: () => true, playRecordedVerse: async (_blob, _preset, onStarted) => { onStarted?.(); return true; } };
  vm.createContext(sandbox); vm.runInContext(recordingSource, sandbox);
  const changes = [];
  const recording = w.BibloZooRecording.create({ onChange: () => changes.push('update'), onInterrupted: () => changes.push('interrupted') });
  const complete = async () => {
    check(await recording.start(() => {}, undefined) === 'recording', 'recording begins only on deliberate gesture');
    recording.stop();
    check(recording.snapshot().hasRecording && recording.snapshot().status === 'ready', 'completed recording is available for playback');
  };
  return { w, d, recording, complete, get player() { return player; },
    get revoked() { return revoked; }, get micRequests() { return micRequests; }, get tracksStopped() { return tracksStopped; }, changes };
}

async function testRecording() {
  {
    const f = recordingFixture(); await f.complete();
    f.d.hidden = true; f.d.fire('visibilitychange'); f.w.fire('pagehide');
    check(f.recording.snapshot().hasRecording, 'finished recording survives app hide and pagehide');
    check(f.revoked === 0, 'finished recording Blob URL is not revoked on app switch');
    check(f.micRequests === 1, 'backgrounding does not request microphone access');
    f.d.hidden = false;
    await f.recording.play();
    check(f.recording.snapshot().status === 'playing', 'finished recording can replay after return');
    f.recording.dispose();
    check(f.revoked === 1, 'explicitly leaving Flashcards revokes recording Blob URL');
  }
  {
    const f = recordingFixture();
    await f.recording.start(() => {});
    f.w.fire('pagehide');
    check(f.recording.snapshot().status === 'idle', 'pagehide alone interrupts live microphone recording');
    check(f.changes.includes('interrupted'), 'pagehide interruption is reported for explicit retry');
  }
  {
    const f = recordingFixture();
    await f.recording.start(() => {});
    f.d.hidden = true; f.d.fire('visibilitychange');
    check(f.recording.snapshot().status === 'idle' && !f.recording.snapshot().hasRecording,
      'active microphone recording is interrupted rather than restarted');
    check(f.changes.includes('interrupted'), 'recording interruption is reported to Flashcards');
    check(f.tracksStopped > 0, 'recording interruption releases microphone track');
  }
  {
    const f = recordingFixture(); await f.complete();
    f.player.playMode = 'pending';
    const pending = f.recording.play();
    check(f.recording.snapshot().status === 'loading', 'ordinary recording playback can be pending');
    f.d.hidden = true; f.d.fire('visibilitychange'); f.w.fire('pagehide');
    f.player.deferred.resolve(); await pending;
    check(f.recording.snapshot().status === 'ready' && !f.recording.snapshot().playbackFailed,
      'late successful play promise cannot revive canceled background playback');
    check(f.recording.snapshot().hasRecording, 'canceled playback retains recording');
    f.d.hidden = false;
    f.player.playMode = 'resolve'; await f.recording.play();
    check(f.recording.snapshot().status === 'playing', 'replay after an interrupted play promise succeeds');
    f.recording.dispose();
  }
  {
    const f = recordingFixture(); await f.complete();
    f.player.playMode = 'pending';
    const oldPlay = f.recording.play();
    const oldPromise = f.player.deferred;
    f.recording.pause();
    f.player.playMode = 'resolve';
    await f.recording.play();
    const count = f.player.pauseCount;
    oldPromise.resolve(); await oldPlay;
    check(f.recording.snapshot().status === 'playing', 'old pending play resolution never reverts newer playback state');
    check(f.player.pauseCount === count, 'old pending play resolution never pauses newer playback');
    f.recording.pause();
    f.player.onended();
    check(!f.recording.snapshot().playbackComplete, 'stale onended after pause does not unlock Wacky Replay');
    f.recording.dispose();
  }
  {
    const f = recordingFixture(); await f.complete();
    f.player.playMode = 'reject'; await f.recording.play();
    check(f.recording.snapshot().playbackFailed && f.recording.snapshot().hasRecording,
      'rejected ordinary playback is retryable and preserves recording');
    f.player.playMode = 'resolve'; await f.recording.play();
    check(!f.recording.snapshot().playbackFailed && f.recording.snapshot().status === 'playing',
      'later playback attempt retries successfully');
    f.recording.dispose();
  }
}

function flashcardsFixture() {
  const d = listeners(); d.hidden = false;
  const w = listeners(); w.setTimeout = setTimeout; w.clearTimeout = clearTimeout; w.location = { protocol: 'https:' }; w.BibloZooAudioEffects = { getOfficialPresetIds: () => ['squirrel','giant'] };
  const active = { snapshot: () => ({ hasRecording: true, playbackComplete: true }), stopFun: () => false, playFun: () => Promise.resolve(false) };
  const marker = '  window.BibloZooFlashcards = Object.freeze({';
  check(flashcardsSource.includes(marker), 'Flashcards API remains unchanged');
  const hooks = `  window.__patch22Hooks = {
    playWackyReplay, stopWackyPlayback, interruptWackyPlayback,
    prepare: (fake, unlocked = true) => {
      api = { requestRender: () => {} };
      recording = fake;
      state.view = 'comparison';
      wackyReplayUnlocked = unlocked;
      wackyReplayConsumed = false;
      wackyReplayPlaying = false;
      wackyReplayMessage = '';
      lastWackyPreset = '';
    },
    read: () => ({ consumed: wackyReplayConsumed, unlocked: wackyReplayUnlocked, playing: wackyReplayPlaying, message: wackyReplayMessage })
  };
  `;
  const source = flashcardsSource.replace(marker, hooks + marker);
  const sandbox = { window: w, document: d, Math, Date, setTimeout, clearTimeout, requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {}, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const api = w.__patch22Hooks;
  api.prepare(active);
  return { api, d, w };
}

async function testReplayEligibility() {
  {
    const f = flashcardsFixture();
    const rec = { snapshot: () => ({ hasRecording: true, playbackComplete: true }), playFun: async () => false, stopFun: () => false };
    f.api.prepare(rec);
    await f.api.playWackyReplay();
    check(!f.api.read().consumed && f.api.read().unlocked, 'failed Wacky Replay initialization preserves one-time eligibility');
    check(/try again/.test(f.api.read().message), 'failed initialization offers retry');
    rec.playFun = async (_preset, onStarted) => { onStarted(); return false; };
    await f.api.playWackyReplay();
    check(f.api.read().consumed && !f.api.read().unlocked, 'Wacky Replay is consumed when audio actually begins');
    check(!f.api.read().playing, 'interruption after audio begins leaves playback stopped');
  }
  {
    const f = flashcardsFixture();
    const pending = deferred();
    const rec = { snapshot: () => ({ hasRecording: true, playbackComplete: true }), playFun: () => pending.promise, stopFun: () => false };
    f.api.prepare(rec);
    const result = f.api.playWackyReplay();
    f.d.hidden = true; f.d.fire('visibilitychange');
    pending.resolve(false);
    await result;
    check(!f.api.read().consumed && !f.api.read().playing, 'backgrounding before source start preserves replay opportunity');
  }
  {
    const f = flashcardsFixture();
    const pending = deferred();
    const rec = { snapshot: () => ({ hasRecording: true, playbackComplete: true }), playFun: (_preset, onStarted) => { onStarted(); return pending.promise; }, stopFun: () => false };
    f.api.prepare(rec);
    const result = f.api.playWackyReplay();
    check(f.api.read().consumed, 'successful source start marks the replay as spent immediately');
    f.w.fire('pagehide'); pending.resolve(false); await result;
    check(f.api.read().consumed && !f.api.read().playing, 'backgrounding after source start never restores eligibility');
  }
}

(async () => {
  check(workerSource.includes('patch22c_wacky_output_health'), 'PWA cache version bumped for Patch 22C');
  check(recordingSource.includes('if (["requesting", "preparing", "recording", "stopping"].includes(status))'),
    'active microphone recording still interrupts on pagehide');
  check(!flashcardsSource.includes('    consumeWackyReplay();\n    wackyReplayPlaying = true;'),
    'clicking Wacky Replay does not consume it prematurely');
  await testEffects();
  await testRecording();
  await testReplayEligibility();
  console.log(`Patch 22: ${checks} regression checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

// Patch 22A regression assertions: watchdogs bound every asynchronous phase.
assert.ok(effectsSource.includes('await awaitAudioSetup(blob.arrayBuffer(), AUDIO_SETUP_TIMEOUT_MS)'), 'blob extraction has a deadline');
assert.ok(effectsSource.includes('playback.watchdogTimer = window.setTimeout'), 'processed playback has a completion watchdog');
assert.ok(effectsSource.includes('clearTimeout(playback.watchdogTimer)'), 'cleanup cancels watchdog');
assert.ok(flashcardsSource.includes('Promise.race([playback, startupTimeout])'), 'Flashcards startup has a deadline');
