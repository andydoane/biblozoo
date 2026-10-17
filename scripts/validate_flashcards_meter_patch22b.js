/* Patch 22B: nonblocking, recoverable recording meter regressions. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'flashcards/recording.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'flashcards/flashcards.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'flashcards/flashcards.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
let checks = 0;
function check(yes, description) { assert.ok(yes, description); checks++; }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function fixture({ modes = [], failFirstAnalyser = false, throwFirstSample = false, noAudioContext = false } = {}) {
  const callbacks = { document: new Map(), window: new Map() };
  const document = {
    hidden: false,
    addEventListener(event, callback) { callbacks.document.set(event, callback); },
  };
  let recorder = null;
  let micRequests = 0;
  let tracksStopped = 0;
  let analyserFailures = failFirstAnalyser ? 1 : 0;
  let sampleFailures = throwFirstSample ? 1 : 0;
  let constructed = 0;
  const contexts = [];
  const pendingResume = deferred();
  const track = { stop() { tracksStopped++; }, onended: null };
  const stream = { getTracks: () => [track] };
  class AudioNode {
    constructor(name) { this.name = name; this.connected = []; this.disconnects = 0; }
    connect(node) { this.connected.push(node); return node; }
    disconnect() { this.disconnects++; }
  }
  class Analyser extends AudioNode {
    constructor() { super('analyser'); this.fftSize = 256; }
    getByteTimeDomainData(buffer) {
      if (sampleFailures-- > 0) throw new Error('sample failed');
      for (let i = 0; i < buffer.length; i++) buffer[i] = i % 2 ? 196 : 60;
    }
  }
  class Context {
    constructor() {
      this.state = 'suspended'; this.resumeCalls = 0; this.closed = 0;
      this.destination = new AudioNode('destination');
      this.sources = []; this.analysers = []; this.sinks = [];
      contexts.push(this);
      constructed++;
    }
    resume() {
      this.resumeCalls++;
      const mode = modes.shift() || 'running';
      if (mode === 'pending') return pendingResume.promise;
      if (mode === 'reject') return Promise.reject(new Error('interrupted'));
      if (mode === 'silent') return Promise.resolve();
      this.state = 'running';
      return Promise.resolve();
    }
    createAnalyser() {
      if (analyserFailures-- > 0) throw new Error('analyser unavailable');
      const node = new Analyser(); this.analysers.push(node); return node;
    }
    createMediaStreamSource() {
      const node = new AudioNode('mic'); this.sources.push(node); return node;
    }
    createGain() {
      const node = new AudioNode('silent sink'); node.gain = { value: 1 };
      this.sinks.push(node); return node;
    }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
  }
  class FakeRecorder {
    constructor() { recorder = this; this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
    static isTypeSupported() { return true; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['recorded'], { type: 'audio/mp4' }) });
      this.onstop?.();
    }
  }
  class FakeAudio {
    constructor() { this.currentTime = 0; }
    pause() {}
    load() {}
    removeAttribute() {}
  }
  const window = {
    AudioContext: noAudioContext ? null : Context,
    MediaRecorder: FakeRecorder,
    BibloZooAudioEffects: { stop: () => false },
    addEventListener(event, callback) { callbacks.window.set(event, callback); },
  };
  const sandbox = {
    window, document, MediaRecorder: FakeRecorder, Audio: FakeAudio,
    navigator: { mediaDevices: { getUserMedia: async () => { micRequests++; return stream; } } },
    URL: { createObjectURL: () => 'blob:recorded', revokeObjectURL() {} },
    Blob, Uint8Array, Promise, console,
    performance: { now: () => 1000 },
    setTimeout: (fn, ms) => setTimeout(fn, ms >= 10000 ? ms : Math.min(ms, 12)),
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const events = [];
  const rec = window.BibloZooRecording.create({
    onChange: () => events.push('change'),
    onInterrupted: () => events.push('interrupted'),
  });
  return {
    rec, window, document, callbacks, contexts, pendingResume,
    events, get micRequests() { return micRequests; },
    get tracksStopped() { return tracksStopped; },
    get constructed() { return constructed; },
    get recorder() { return recorder; },
  };
}

async function run() {
  check(/const CACHE_VERSION = "[A-Za-z0-9_]+";/.test(sw) &&
    sw.includes('"./flashcards/recording.js"'),
    'PWA cache stays versioned and precaches recording code');
  check(ui.includes('const value = recording.readLevel();'), 'recording levels still sampled with Reduced Motion');
  check(!ui.includes('reduced.matches ? null : recording.readLevel()'), 'Reduced Motion cannot force a blank meter');
  check(css.includes('.flashcards-meter-bars .is-lit'), 'meter bar appearance preserved');
  check(source.includes('const METER_MAX_RESUME_ATTEMPTS = 4'), 'meter resume attempts bounded');
  {
    const f = fixture();
    check(await f.rec.start(() => {}) === 'recording', 'recording begins normally');
    check(f.rec.readLevel() > 0, 'meter provides nonzero level when context is running');
    const ctx = f.contexts[0];
    check(ctx.sources[0].connected.includes(ctx.analysers[0]), 'microphone connects to analyser');
    check(ctx.analysers[0].connected.includes(ctx.sinks[0]), 'analyser connects to silent sink');
    check(ctx.sinks[0].connected.includes(ctx.destination), 'silent sink connects to output');
    check(ctx.sinks[0].gain.value === 0, 'microphone audio is muted before destination');
    f.rec.stop();
    check(f.rec.snapshot().hasRecording, 'meter graph does not change recording result');
    check(ctx.closed === 1 && ctx.sinks[0].disconnects === 1, 'meter resources released on stop');
    check(f.micRequests === 1, 'meter does not require a second microphone request');
  }
  {
    const f = fixture({ modes: ['reject', 'running'] });
    await f.rec.start(() => {});
    await sleep(5);
    check(f.contexts[0].resumeCalls >= 2, 'failed gesture activation retries after microphone acquisition');
    check(f.rec.readLevel() > 0, 'meter recovers after initial resume rejection');
    check(f.rec.snapshot().status === 'recording', 'meter failure never interrupts microphone recording');
    f.rec.stop();
  }
  {
    const f = fixture({ modes: ['silent', 'silent', 'running'] });
    await f.rec.start(() => {});
    await sleep(50);
    check(f.rec.readLevel() > 0, 'resolved resume without running state is retried');
    check(f.contexts[0].resumeCalls <= 4, 'silent resume retries remain bounded');
    f.rec.stop();
  }
  {
    const f = fixture({ modes: ['pending', 'running'] });
    await f.rec.start(() => {});
    check(f.rec.readLevel() === null, 'pending resume initially yields unavailable meter');
    await sleep(50);
    check(f.rec.readLevel() > 0, 'stalled resume is recovered by a bounded retry');
    const count = f.contexts[0].resumeCalls;
    f.pendingResume.resolve();
    await sleep(5);
    check(f.contexts[0].resumeCalls === count, 'late resolution does not trigger extra retries');
    f.rec.stop();
  }
  {
    const f = fixture({ modes: ['running', 'running'] });
    await f.rec.start(() => {});
    f.contexts[0].state = 'interrupted';
    check(f.rec.readLevel() === null, 'interrupted meter does not sample stale audio');
    await sleep(5);
    check(f.rec.readLevel() > 0, 'meter resumes after an audio-session interruption');
    check(f.micRequests === 1, 'retry resumes analyzer context, not microphone');
    f.rec.stop();
  }
  {
    const f = fixture({ failFirstAnalyser: true });
    await f.rec.start(() => {});
    await sleep(60);
    check(f.constructed === 2, 'failed analyzer initialization gets one isolated rebuild');
    check(f.contexts[0].closed === 1, 'failed analyzer context closed');
    check(f.rec.readLevel() > 0, 'rebuilt analyzer resumes valid metering');
    check(f.micRequests === 1 && f.rec.snapshot().status === 'recording', 'analyzer rebuild never resets recording');
    f.rec.stop();
  }
  {
    const f = fixture({ throwFirstSample: true });
    await f.rec.start(() => {});
    check(f.rec.readLevel() === null, 'sample error is isolated from live recording');
    await sleep(60);
    check(f.constructed === 2 && f.contexts[0].closed === 1, 'sample exception closes only old meter graph');
    check(f.rec.readLevel() > 0, 'meter is rebuilt once after sample exception');
    check(f.rec.snapshot().status === 'recording' && f.micRequests === 1,
      'sample error never restarts capture or asks for mic permission');
    f.rec.stop();
  }
  {
    const f = fixture({ modes: ['pending', 'pending', 'pending', 'pending'] });
    await f.rec.start(() => {});
    f.document.hidden = true;
    f.callbacks.document.get('visibilitychange')();
    await sleep(70);
    check(f.rec.snapshot().status === 'idle', 'backgrounding still interrupts active microphone capture');
    check(f.events.includes('interrupted'), 'recording interruption still reported');
    check(f.contexts[0].closed === 1, 'backgrounding closes pending meter context');
    check(f.contexts[0].resumeCalls === 1, 'old meter attempts do not retry after interruption');
  }
  {
    const f = fixture({ modes: ['reject', 'reject', 'reject', 'reject', 'running'] });
    await f.rec.start(() => {});
    await sleep(80);
    check(f.contexts[0].resumeCalls === 4, 'repeated failed activation stops at retry budget');
    check(f.rec.snapshot().status === 'recording', 'recording continues despite fully unavailable meter');
    check(f.rec.readLevel() === null, 'fully unavailable meter degrades safely');
    f.rec.stop();
  }
  {
    const f = fixture({ noAudioContext: true });
    await f.rec.start(() => {});
    check(f.rec.readLevel() === null, 'no AudioContext leaves recording available');
    f.rec.stop();
    check(f.rec.snapshot().hasRecording, 'recording still succeeds without Web Audio');
  }
  console.log(`Patch 22B: ${checks} focused recording-meter checks passed.`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
