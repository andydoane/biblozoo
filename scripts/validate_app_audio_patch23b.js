#!/usr/bin/env node
/* Patch 23B focused runtime regression checks. Runs without a browser or project dependencies. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const src = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
let assertions = 0;
function ok(condition, label) { assert.ok(condition, label); assertions++; }
function equal(a, b, label) { assert.equal(a, b, label); assertions++; }
function snippet(start, end) {
  const first = src.indexOf(start);
  const last = src.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing source boundaries: ${start} / ${end}`);
  return src.slice(first, last);
}
function mockAudio() {
  const listeners = new Map();
  const audio = {
    currentTime: 0, src: "", paused: true, muted: false,
    playCalls: 0, pauseCalls: 0,
    playImplementation: () => Promise.resolve(),
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name) { for (const fn of [...(listeners.get(name) || [])]) fn(); },
    listenerCount(name) { return listeners.get(name)?.size || 0; },
    play() { this.playCalls++; this.paused = false; return this.playImplementation(); },
    pause() { this.pauseCalls++; this.paused = true; this.emit("pause"); }
  };
  return audio;
}
function eventTarget() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
    emit(name) { for (const fn of listeners.get(name) || []) fn(); }
  };
}
function fakeTimers() {
  let next = 0;
  const callbacks = new Map();
  return {
    setTimeout(fn, delay) { const id = ++next; callbacks.set(id, { fn, delay }); return id; },
    clearTimeout(id) { callbacks.delete(id); },
    fireAll() { const entries = [...callbacks.values()]; callbacks.clear(); for (const x of entries) x.fn(); },
    pending() { return callbacks.size }
  };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const tutorialCode = snippet("// The tutorial shares audioEl", "function renderZooTodoTutorialHtml(") +
  "\n" + snippet("function playZooTodoTutorialPageAudio(", "function refreshZooTodoTutorialPage(");
function makeTutorial() {
  const audioEl = mockAudio();
  const document = eventTarget(), window = eventTarget(), timers = fakeTimers();
  const played = new Set(); let page = 1, muted = false, renders = 0;
  const ctx = { audioEl, document, window, muted, console: { warn() {} }, Promise, Error, Set,
    TUTORIAL_PAGE_AUDIO: { 1: "one.mp3", 2: "two.mp3", 3: "three.mp3", 4: "four.mp3" },
    State: { screen: "todo" }, Screen: { TODO_DEV: "todo" },
    getZooTodoTutorialPageNumber: () => page,
    hasPlayedZooTodoTutorialPageAudio: (n) => played.has(n),
    markZooTodoTutorialPageAudioPlayed: (n) => played.add(n),
    isTutorialActive: () => true,
    stopPetUnlockPackageSound: () => {},
    setAudioSrc: (s) => { audioEl.src = s; },
    applyMute: () => { audioEl.muted = muted; },
    render: () => { renders++; },
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout
  };
  vm.runInNewContext(tutorialCode, ctx, { filename: "app.js:tutorial" });
  return { ctx, audioEl, document, window, timers, played,
    setPage: (n) => { page = n; }, setMuted: (m) => { muted = m; ctx.muted = m; },
    getRenders: () => renders, attempt: (n, options) => ctx.playZooTodoTutorialPageAudio(n, options),
    stop: (options) => ctx.stopZooTodoTutorialPageAudio(options),
    retryHtml: (n) => ctx.renderZooTodoTutorialAudioRetry(n) };
}
async function testTutorial() {
  { const t = makeTutorial(); t.attempt(1); await flush();
    equal(t.audioEl.playCalls, 1, "initial narration starts once");
    ok(!t.played.has(1), "play() resolution is not completion");
    t.attempt(1); equal(t.audioEl.playCalls, 1, "rerender cannot replay active narration");
    t.audioEl.emit("ended"); ok(t.played.has(1), "ended marks page heard");
    equal(t.audioEl.listenerCount("ended"), 0, "ended listener cleaned");
    equal(t.audioEl.listenerCount("error"), 0, "error listener cleaned");
    equal(t.audioEl.listenerCount("pause"), 0, "pause listener cleaned");
    t.attempt(1); equal(t.audioEl.playCalls, 1, "heard page doesn't autoplay again");
    equal(t.retryHtml(1), "", "completed page has no retry button");
  }
  { const t = makeTutorial(); t.attempt(1); t.document.hidden = true; t.document.emit("visibilitychange");
    ok(!t.played.has(1), "background does not mark heard");
    ok(t.retryHtml(1).includes("Hear Instructions"), "background allows explicit retry");
    ok(t.audioEl.paused, "background stops narration");
    t.document.hidden = false; t.document.emit("visibilitychange");
    t.attempt(1); equal(t.audioEl.playCalls, 1, "foreground doesn't autoplay");
    ok(t.getRenders() > 0, "foreground shows retry UI");
    t.attempt(1, { explicit: true }); await flush();
    equal(t.audioEl.playCalls, 2, "explicit retry plays narration");
    t.audioEl.emit("ended"); ok(t.played.has(1), "completed retry marks heard");
    equal(t.retryHtml(1), "", "successful retry removes retry UI");
  }
  { const t = makeTutorial(); t.audioEl.playImplementation = () => Promise.reject(new Error("blocked"));
    t.setPage(2); t.attempt(2); await flush();
    ok(!t.played.has(2), "rejected play doesn't mark heard");
    ok(t.retryHtml(2).includes("Hear Instructions"), "rejected start retryable");
    equal(t.audioEl.listenerCount("ended"), 0, "rejection cleans listeners");
    const calls = t.audioEl.playCalls; t.attempt(2); equal(t.audioEl.playCalls, calls, "rejection won't auto-loop");
  }
  { const t = makeTutorial(); t.audioEl.playImplementation = () => new Promise(() => {});
    t.attempt(1); ok(t.timers.pending() > 0, "startup guarded by timeout");
    t.timers.fireAll();
    ok(t.retryHtml(1).includes("Hear Instructions"), "stalled startup retryable");
    ok(t.audioEl.paused, "stalled attempt stopped");
    ok(!t.played.has(1), "stalled startup never marks heard");
  }
  { const t = makeTutorial(); let release;
    t.audioEl.playImplementation = () => new Promise(r => { release = r; });
    t.attempt(1); t.document.hidden = true; t.document.emit("visibilitychange");
    release(); await flush();
    ok(!t.played.has(1), "late success after background doesn't mark heard");
    ok(t.retryHtml(1).includes("Hear Instructions"), "late success preserves retry");
  }
  { const t = makeTutorial(); t.setMuted(true); t.attempt(1); equal(t.audioEl.playCalls, 0, "muted narration doesn't play");
    ok(t.retryHtml(1).includes("Hear Instructions"), "muted narration can be retried later");
    t.setMuted(false); t.attempt(1); equal(t.audioEl.playCalls, 0, "unmute doesn't autoplay muted page");
    t.attempt(1, { explicit: true }); equal(t.audioEl.playCalls, 1, "retry after unmute uses gesture");
  }
  { const t = makeTutorial(); t.attempt(1); t.audioEl.paused = true; t.audioEl.emit("pause");
    ok(t.retryHtml(1).includes("Hear Instructions"), "unexpected pause offers retry");
    ok(!t.played.has(1), "unexpected pause not completion");
  }
  { const t = makeTutorial(); t.attempt(1); t.audioEl.emit("pause");
    equal(t.audioEl.playCalls, 1, "stale pause event cannot interrupt running narration");
    equal(t.retryHtml(1), "", "stale pause doesn't offer an incorrect retry");
  }
  { const t = makeTutorial(); t.attempt(1); t.audioEl.emit("error");
    ok(t.retryHtml(1).includes("Hear Instructions"), "audio element error offers retry");
    ok(t.audioEl.paused, "audio error stops audio");
  }
  { const t = makeTutorial(); t.attempt(1); t.setPage(2); t.stop(); t.attempt(2); await flush();
    equal(t.audioEl.src, "two.mp3", "new page audio replaces old audio");
    t.audioEl.emit("ended"); ok(t.played.has(2), "next page ended marks next page");
    ok(!t.played.has(1), "skipped previous narration not falsely marked heard");
  }
  { const t = makeTutorial(); t.attempt(1); t.window.emit("pagehide");
    ok(!t.played.has(1), "pagehide doesn't mark heard");
    ok(t.retryHtml(1).includes("Hear Instructions"), "pagehide retry available");
  }
  { const t = makeTutorial(); t.attempt(1); t.ctx.State.screen = "elsewhere";
    t.stop({ offerRetry: true });
    ok(t.audioEl.paused, "navigation cancels narration");
    t.audioEl.emit("ended"); ok(!t.played.has(1), "stale end after navigation cannot mark heard");
    t.ctx.State.screen = "todo";
    ok(t.retryHtml(1).includes("Hear Instructions"), "returning from another activity offers retry");
    t.attempt(1); equal(t.audioEl.playCalls, 1, "returning from another activity doesn't autoplay");
  }
}
const verseDetailCode = snippet("let verseDetailListenToken = 0;", "// tokenization (copied conceptually from old engine)");
function makeVerseDetail() {
  const audioEl = mockAudio(), document = eventTarget(), window = eventTarget();
  let muted = false;
  const ctx = { audioEl, document, window, console: { warn() {} },
    AUDIO_DIR: "verse_audio/", AUDIO_FILE: "normal.mp3", muted,
    setAudioSrc: (s) => { audioEl.src = s; },
    safePlay: () => { audioEl.playCalls++; return Promise.resolve(); }
  };
  vm.runInNewContext(verseDetailCode, ctx, { filename: "app.js:verseDetail" });
  return { ctx, audioEl, document, window,
    start: (id) => ctx.playVerseDetailListen(id), cancel: () => ctx.cancelVerseDetailListen() };
}
async function testVerseDetail() {
  { const t = makeVerseDetail(); const result = t.start("john3"); await flush();
    equal(t.audioEl.src, "verse_audio/john3_ref.mp3", "reference segment plays first");
    t.audioEl.emit("ended"); await flush();
    equal(t.audioEl.src, "verse_audio/john3.mp3", "verse segment follows reference");
    t.audioEl.emit("ended"); ok(await result, "both segments complete");
    equal(t.audioEl.src, "normal.mp3", "shared audio source restored");
  }
  { const t = makeVerseDetail(); const result = t.start("john3"); await flush();
    t.audioEl.emit("error"); await flush();
    ok(!(await result), "reference error fails sequence");
    ok(!t.audioEl.src.includes("john3.mp3"), "error doesn't start second segment");
    equal(t.audioEl.listenerCount("error"), 0, "error listener removed");
  }
  { const t = makeVerseDetail(); const result = t.start("john3"); await flush();
    t.audioEl.emit("ended"); await flush();
    t.audioEl.emit("error"); ok(!(await result), "verse error fails second segment");
  }
  { const t = makeVerseDetail(); const result = t.start("john3"); await flush();
    t.document.hidden = true; t.document.emit("visibilitychange");
    ok(!(await result), "background cancels pending sequence");
    equal(t.audioEl.src, "normal.mp3", "background resets shared audio source");
    t.document.hidden = false;
    t.audioEl.emit("ended"); equal(t.audioEl.playCalls, 1, "old ended cannot start verse segment");
  }
  { const t = makeVerseDetail(); const result = t.start("john3"); await flush();
    t.cancel(); ok(!(await result), "navigation cancels pending sequence");
    equal(t.audioEl.listenerCount("ended"), 0, "navigation removes ended handler");
    equal(t.audioEl.listenerCount("error"), 0, "navigation removes error handler");
  }
  { const t = makeVerseDetail(); t.ctx.muted = true;
    ok(!(await t.start("john3")), "muted blocks verse-detail listening");
    equal(t.audioEl.playCalls, 0, "muted verse detail doesn't start audio");
  }
  { const t = makeVerseDetail(); const result = t.start("john3"); await flush();
    t.window.emit("pagehide"); ok(!(await result), "pagehide cancels verse detail");
  }
}
const petCode = snippet("let petUnlockAudioEl = null;", "function getAppAudioContext()") +
  "\n" + snippet("function playPetUnlockPackageSound(", "function preloadUiTapSoundBuffers()");
function makePet() {
  const audioEl = mockAudio(), document = { hidden: false };
  let clock = 1000, fallback = 0, muted = false;
  const ctx = { document, muted, audioEl, console: { warn() {} }, UI_PET_UNLOCK_VOLUME: 0.55,
    State: { screen: "pet" }, Screen: { PET_UNLOCK: "pet" }, performance: { now: () => clock },
    ensurePetUnlockAudio: () => audioEl,
    playUiTapFallbackNow: () => fallback++
  };
  vm.runInNewContext(petCode, ctx, { filename: "app.js:pet" });
  vm.runInNewContext("petUnlockAudioEl = audioEl;", ctx);
  return { ctx, audioEl, document, play: (opts) => ctx.playPetUnlockPackageSound(opts),
    stop: () => ctx.stopPetUnlockPackageSound(), fallbacks: () => fallback,
    setClock: (n) => clock = n, setMuted: (n) => ctx.muted = n };
}
async function testPet() {
  { const t = makePet(); t.audioEl.playImplementation = () => Promise.resolve();
    t.play(); equal(t.audioEl.playCalls, 1, "pet unlock plays on gesture");
    t.play(); equal(t.audioEl.playCalls, 1, "duplicate rapid unlock prevented");
    t.stop(); ok(t.audioEl.paused, "pet audio stops on exit");
  }
  { const t = makePet(); t.audioEl.playImplementation = () => Promise.reject(new Error("blocked"));
    t.play(); await flush(); equal(t.fallbacks(), 1, "current unlock can use fallback");
  }
  { const t = makePet(); let reject;
    t.audioEl.playImplementation = () => new Promise((_, r) => reject = r);
    t.play(); t.ctx.State.screen = "next"; reject(new Error("blocked")); await flush();
    equal(t.fallbacks(), 0, "late rejection after navigation makes no noise");
  }
  { const t = makePet(); let reject;
    t.audioEl.playImplementation = () => new Promise((_, r) => reject = r);
    t.play(); t.stop(); reject(new Error("blocked")); await flush();
    equal(t.fallbacks(), 0, "stopped unlock doesn't play late fallback");
  }
  { const t = makePet(); let reject;
    t.audioEl.playImplementation = () => new Promise((_, r) => reject = r);
    t.play(); t.document.hidden = true; reject(new Error("blocked")); await flush();
    equal(t.fallbacks(), 0, "background doesn't play late fallback");
  }
  { const t = makePet(); let reject;
    t.audioEl.playImplementation = () => new Promise((_, r) => reject = r);
    t.play(); t.setMuted(true); reject(new Error("blocked")); await flush();
    equal(t.fallbacks(), 0, "mute prevents late fallback");
  }
  { const t = makePet(); let reject;
    t.audioEl.playImplementation = () => new Promise((_, r) => reject = r);
    t.play(); t.setClock(2500); reject(new Error("blocked")); await flush();
    equal(t.fallbacks(), 0, "slow failure doesn't play delayed fallback");
  }
  { const t = makePet(); t.setMuted(true); t.play();
    equal(t.audioEl.playCalls, 0, "pet unlock respects global mute");
  }
}
function testStructure() {
  ok(src.includes('State.screen === gestureScreen && tapTarget.isConnected'), "touch gesture checks original screen");
  ok(src.includes('State.screen !== gestureScreen || !tapTarget.isConnected'), "keyboard gesture checks original screen");
  ok(src.includes('if (from === Screen.VERSE_DETAIL) cancelVerseDetailListen();'), "slide navigation cleans verse detail");
  ok(src.includes('if (State.screen === Screen.VERSE_DETAIL) cancelVerseDetailListen();'), "direct navigation cleans verse detail");
  ok(src.includes('if (from === Screen.TODO_DEV) stopZooTodoTutorialPageAudio({ offerRetry: true });'), "slide navigation preserves retry on tutorial return");
  ok(src.includes('if (State.screen === Screen.TODO_DEV) stopZooTodoTutorialPageAudio({ offerRetry: true });'), "direct navigation preserves retry on tutorial return");
  ok(src.includes('if (from === Screen.PET_UNLOCK) stopPetUnlockPackageSound();'), "slide navigation cleans unlock sound");
  ok(src.includes('if (State.screen === Screen.PET_UNLOCK) stopPetUnlockPackageSound();'), "direct navigation cleans unlock sound");
  ok(src.includes('data-tutorial-audio-retry'), "tutorial has explicit retry control");
  for (const page of [1, 2, 3, 4]) ok(src.includes(`renderZooTodoTutorialAudioRetry(${page})`), `tutorial page ${page} supports retry`);
  ok(src.includes('if (muted) stopNewVersePickerPreviewAudio();') === false, "mute logic integrated with shared cleanup");
  ok(src.includes('token === newVersePreviewToken && newVersePreviewAudio === audio'), "verse picker retains its existing cancellation token");
  ok(src.includes('if (document.hidden) stopNewVersePickerPreviewAudio();'), "verse picker still stops on backgrounding");
  ok(src.includes('window.addEventListener("pagehide", stopNewVersePickerPreviewAudio);'), "verse picker still stops on pagehide");
  ok(src.includes('window.BibloZooDailyQuestions?.onMuteChanged?.(muted);'), "Daily Questions mute bridge preserved");
}
(async () => {
  await testTutorial();
  await testVerseDetail();
  await testPet();
  testStructure();
  console.log(`Patch 23B: ${assertions} focused regression assertions passed.`);
})().catch(err => { console.error(err); process.exitCode = 1; });
