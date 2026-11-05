#!/usr/bin/env node
"use strict";
/* Read My Verse feedback: exercise actual tone/sample routes without a browser.
 * This regression tests audible-effect gains, not measured speaker loudness.
 * It deliberately does not modify narration, soundtrack or recovery logic.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const source = read("read_my_verse.js");
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const eq = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };
const near = (actual, expected, tolerance, message) => {
  ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
};
const contexts = [];
const htmlAudio = [];

class FakeContext {
  constructor() {
    this.state = "running";
    this.currentTime = 1;
    this.destination = {};
    this.gains = [];
    this.oscillators = [];
    this.buffers = [];
    contexts.push(this);
  }
  createGain() {
    const gain = {
      value: 1,
      events: [],
      setValueAtTime(value, time) { this.events.push(["set", value, time]); },
      linearRampToValueAtTime(value, time) { this.events.push(["linear", value, time]); },
      exponentialRampToValueAtTime(value, time) { this.events.push(["exponential", value, time]); },
      setTargetAtTime(value, time, constant) { this.events.push(["target", value, time, constant]); }
    };
    const node = { gain, connect() {}, disconnect() {} };
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = {
      type: "sine",
      frequency: { setValueAtTime() {} },
      connect() {}, disconnect() {},
      start(time) { this.startedAt = time; },
      stop(time) { this.stoppedAt = time; },
      addEventListener() {}, onended: null
    };
    this.oscillators.push(node);
    return node;
  }
  createBufferSource() {
    const node = {
      buffer: null, connect() {}, disconnect() {},
      start(time) { this.startedAt = time ?? 0; },
      stop(time) { this.stoppedAt = time; }, onended: null
    };
    this.buffers.push(node);
    return node;
  }
  close() { this.state = "closed"; return Promise.resolve(); }
  resume() { this.state = "running"; return Promise.resolve(); }
}
class FakeAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.played = 0;
    htmlAudio.push(this);
  }
  setAttribute() {}
  load() {}
  pause() {}
  play() { this.played++; return Promise.resolve(); }
}
const fakeDocument = { hidden: false, addEventListener() {}, removeEventListener() {} };
const win = {
  document: fakeDocument,
  AudioContext: FakeContext,
  Audio: FakeAudio,
  BibloZooSafeWordScramble: { isSafeWord: () => true },
  addEventListener() {}, removeEventListener() {}
};
const exportMarker = "  return Object.freeze({";
const position = source.lastIndexOf(exportMarker);
ok(position > 0, "Read My Verse export boundary is present");
const instrumented = source.slice(0, position) + `
  root.__readEffectTest = {
    levels: READ_EFFECT_LEVELS,
    state, ensureKeySoundAudio, playTypingSample,
    playScrambleReward, playOrderTone, playGeneratedNegativeTone,
    setKeyContext(value) { keySoundContext = value; },
    setKeyBuffers(value) { keySoundBuffers = value; },
    setMuted(value) { appApi = { isMuted: () => value }; }
  };
` + source.slice(position);
vm.runInNewContext(instrumented, {
  window: win, document: fakeDocument, console, Date, Math, Promise,
  setTimeout() { return 1; }, clearTimeout() {},
  setInterval() { return 1; }, clearInterval() {}
}, { filename: "read_my_verse.js" });
const probe = win.__readEffectTest;
const levels = probe.levels;

eq(levels.scrambleReward, 0.22, "Unscramble success target");
eq(levels.orderCorrect, 0.22, "Tap Words in Order success target");
eq(levels.orderWrong, 0.11, "Tap Words in Order wrong-answer target");
eq(levels.typingKey, 0.82, "decoded typing key target");
eq(levels.typingAlert, 0.90, "decoded typing alert target");
eq(levels.typingKeyFallback, 0.92, "HTML typing key target");
eq(levels.typingAlertFallback, 1, "HTML typing alert target");
ok(levels.orderWrong < levels.orderCorrect, "wrong answer stays softer than success");
ok(Object.values(levels).every(x => x > 0 && x <= 1), "all configured effect levels remain bounded");

const tower = read("verse_games/tower_bible/game.js");
ok(tower.includes("correctWord: 3.40"), "external reference retains generated correct-word multiplier");
ok(tower.includes('playOsc("correctWord", "sine", 523, t, 0.08, 0.07)'),
  "external reference has a comparable success-tone voice");
near(levels.orderCorrect, 0.07 * 3.40, 0.04,
  "Read correct-note peak is comparable to Tower of Bible voice gain");

function peaks(ctx) {
  return ctx.gains.map(node => node.gain.events
    .filter(x => x[0] === "linear").map(x => x[1])).flat();
}
probe.setMuted(false);
probe.state.activityId = "unscramble";
probe.playScrambleReward(1, false);
const tone = contexts.at(-1);
eq(tone.oscillators.length, 2, "Unscramble regular reward keeps two voices");
eq(peaks(tone).length, 2, "both Unscramble voices have envelope peaks");
ok(peaks(tone).every(peak => peak === 0.22), "both Unscramble voices are louder");
eq(tone.oscillators[0].type, "triangle", "Unscramble melody timbre preserved");
const beforeCompletion = tone.oscillators.length;
probe.playScrambleReward(2, true);
eq(tone.oscillators.length - beforeCompletion, 4,
  "Unscramble completion still schedules four notes");
ok(peaks(tone).every(peak => peak === levels.scrambleReward),
  "Unscramble completion and normal rewards use the same controlled level");

probe.state.activityId = "tap_words_order";
const beforeCorrect = tone.oscillators.length;
probe.playOrderTone(1);
eq(tone.oscillators.length - beforeCorrect, 1, "one correct tap produces one note");
eq(peaks(tone).at(-1), levels.orderCorrect, "Tap Words correct envelope");
const beforeWrong = tone.oscillators.length;
probe.playOrderTone(2, false, true);
eq(tone.oscillators.length - beforeWrong, 1, "wrong tap preserves one error tone");
eq(peaks(tone).at(-1), levels.orderWrong, "Tap Words incorrect envelope");
eq(tone.oscillators.at(-1).type, "sine", "wrong-answer waveform stays gentle");
const beforeFinish = tone.oscillators.length;
probe.playOrderTone(3, true);
eq(tone.oscillators.length - beforeFinish, 4,
  "Tap Words completion still schedules four notes");
ok(peaks(tone).slice(-4).every(peak => peak === levels.orderCorrect),
  "Tap Words completion flourish uses correct-note level");

for (const [activityId, keyCount] of [["typewriter", 3], ["keyboard", 7]]) {
  probe.state.activityId = activityId;
  probe.ensureKeySoundAudio(activityId);
  const keyContext = new FakeContext();
  probe.setKeyContext(keyContext);
  probe.setKeyBuffers(Array.from({ length: keyCount + 1 }, () => ({})));
  probe.playTypingSample(0);
  eq(keyContext.buffers.length, 1, `${activityId} decoded key plays`);
  eq(keyContext.gains.at(-1).gain.value, levels.typingKey,
    `${activityId} decoded key uses tuned level`);
  probe.playTypingSample(keyCount, true);
  eq(keyContext.gains.at(-1).gain.value, levels.typingAlert,
    `${activityId} decoded alert uses tuned level`);

  // If Web Audio buffers aren't available, the existing HTMLAudio pool remains
  // playable, and gets an equivalent modest gain adjustment.
  probe.setKeyContext(null);
  probe.setKeyBuffers([]);
  const playedBefore = htmlAudio.reduce((n, x) => n + x.played, 0);
  probe.playTypingSample(0);
  const keyAudio = htmlAudio.find(x => x.played && x.src.endsWith(`${activityId === "keyboard" ? "keyboard_1" : "typewriter_1"}.mp3`));
  ok(!!keyAudio, `${activityId} HTML key fallback plays`);
  eq(keyAudio.volume, levels.typingKeyFallback, `${activityId} HTML key fallback volume`);
  probe.playTypingSample(keyCount, true);
  const alertAudio = htmlAudio.find(x => x.played && x.src.endsWith(`${activityId === "keyboard" ? "keyboard_alert" : "typewriter_alert"}.mp3`));
  ok(!!alertAudio, `${activityId} HTML alert fallback plays`);
  eq(alertAudio.volume, levels.typingAlertFallback, `${activityId} HTML alert fallback volume`);
  eq(htmlAudio.reduce((n, x) => n + x.played, 0) - playedBefore, 2,
    `${activityId} fallback uses existing two plays without retriggering`);
}

// Mute must gate all effects, including those using the HTML fallback.
probe.setMuted(true);
const oldToneCount = tone.oscillators.length;
const oldHtmlPlays = htmlAudio.reduce((n, x) => n + x.played, 0);
probe.playScrambleReward(1, false);
probe.playOrderTone(1);
probe.playTypingSample(0);
eq(tone.oscillators.length, oldToneCount, "muted tones do not schedule");
eq(htmlAudio.reduce((n, x) => n + x.played, 0), oldHtmlPlays,
  "muted typing samples do not play");

// No narration, crawl tracks, audio-clock ownership, or route was modified.
ok(source.includes('const CRAWL_MUSIC_SRC = `${ASSET_BASE}verse_crawl_theme_ducked.mp3`'),
  "Verse Crawl soundtrack path stays unchanged");
ok(source.includes('context.currentTime > firstClock + 0.015'),
  "suspended first-gesture note expiry contract preserved");
ok(source.includes('if (readEffectRecoveryPending && context.state === "running")'),
  "effect-clock recovery gating retained");

console.log(`Read My Verse feedback-level validation passed (${checks} checks).`);
