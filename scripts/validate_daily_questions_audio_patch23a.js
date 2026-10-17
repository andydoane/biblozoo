"use strict";

// Patch 23A: focused, dependency-free tests of the actual Daily Questions module.
// The VM-only hooks below are inserted into an in-memory copy; no test hooks ship
// in the app itself.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const moduleSource = fs.readFileSync(path.join(root, "daily_questions.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let checks = 0;
function check(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
}
function ok(condition, label) {
  assert.ok(condition, label);
  checks += 1;
}

function makeHarness({ muted = false } = {}) {
  const events = { document: new Map(), window: new Map() };
  let now = 1000;
  let nextTimerId = 0;
  const timers = new Map();
  let renderCount = 0;
  const audio = [];
  const errors = [];
  let nextAudioPlayMode = "resolve";

  function listen(which, name, fn) {
    const registered = events[which].get(name) || [];
    registered.push(fn);
    events[which].set(name, registered);
  }
  function emit(which, name) {
    for (const fn of events[which].get(name) || []) fn({ type: name });
  }
  function setTimer(fn, ms, repeat) {
    const id = ++nextTimerId;
    timers.set(id, { fn, at: now + ms, ms, repeat });
    return id;
  }
  function advance(ms) {
    const end = now + ms;
    let count = 0;
    while (true) {
      let next = null;
      for (const [id, timer] of timers) {
        if (timer.at <= end && (!next || timer.at < next.timer.at)) {
          next = { id, timer };
        }
      }
      if (!next) break;
      if (++count > 300) throw new Error("Timer runaway");
      now = next.timer.at;
      if (next.timer.repeat) next.timer.at += next.timer.ms;
      else timers.delete(next.id);
      next.timer.fn();
    }
    now = end;
  }
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.currentTime = 0;
      this.paused = true;
      this.ended = false;
      this.volume = 1;
      this.preload = "";
      this.listeners = new Map();
      this.playCount = 0;
      this.pauseCount = 0;
      this.nextResult = nextAudioPlayMode;
      nextAudioPlayMode = "resolve";
      audio.push(this);
    }
    addEventListener(type, fn, options) {
      const handlers = this.listeners.get(type) || [];
      handlers.push({ fn, once: options?.once === true });
      this.listeners.set(type, handlers);
    }
    emit(type) {
      for (const handler of [...(this.listeners.get(type) || [])]) {
        handler.fn();
        if (handler.once) {
          this.listeners.set(type, (this.listeners.get(type) || []).filter(x => x !== handler));
        }
      }
    }
    play() {
      ++this.playCount;
      if (this.nextResult === "throw") throw new Error("play() threw");
      if (this.nextResult === "reject") return Promise.reject(new Error("NotAllowedError"));
      if (this.nextResult === "hang") return new Promise(resolve => { this.resolvePlay = resolve; });
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      ++this.pauseCount;
      this.paused = true;
      this.emit("pause");
    }
  }
  const document = {
    hidden: false,
    addEventListener(type, fn) { listen("document", type, fn); }
  };
  const window = {
    addEventListener(type, fn) { listen("window", type, fn); },
  };
  const clock = class extends Date {
    static now() { return now; }
  };
  const context = vm.createContext({
    Audio: FakeAudio,
    document,
    window,
    Date: clock,
    console: { warn: (...args) => errors.push(args) },
    setTimeout(fn, ms) { return setTimer(fn, ms, false); },
    clearTimeout(id) { timers.delete(id); },
    setInterval(fn, ms) { return setTimer(fn, ms, true); },
    clearInterval(id) { timers.delete(id); },
    // These are used only in unrelated Daily Questions paths.
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  });
  const hookSource = `\nwindow.__patch23aTest = {
    playDailyQuestionAnswerSound,
    playGeneratedQuestionAudio,
    stopGeneratedQuestionAudio,
    stopDailyQuestionAnswerSounds,
    stopDailySessionRuntime,
    onMuteChanged,
    getState: () => ({ dailySession, generatedQuestionAudio,
      questionAudioStartupTimer, questionAudioProgressTimer,
      questionAudioNeedsForegroundRender }),
    setSession: (session) => { dailySession = session; }
  };\n`;
  const marker = "  window.BibloZooDailyQuestions =";
  ok(moduleSource.includes(marker), "Daily Questions export marker exists");
  vm.runInContext(moduleSource.replace(marker, hookSource + marker), context, {
    filename: "daily_questions.js"
  });
  const module = window.BibloZooDailyQuestions;
  module.initialize({
    isEnabled: () => true,
    isMuted: () => muted,
    renderApp() { ++renderCount; },
  });
  const hooks = window.__patch23aTest;
  function session() {
    const state = {
      phase: "question", answered: false, questionAudioPlaying: false,
      earnedStarPegCount: 0
    };
    hooks.setSession(state);
    return state;
  }
  return {
    module, hooks, audio, errors, window, document, advance, emit,
    get muted() { return muted; },
    set muted(v) { muted = v; },
    get renderCount() { return renderCount; },
    get timers() { return timers.size; },
    set nextAudioPlayMode(mode) { nextAudioPlayMode = mode; },
    session,
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

async function main() {
  const h = makeHarness();
  check(typeof h.module.onMuteChanged, "function", "Mute notifier exported");
  check(h.audio.length, 2, "Preloaded answer sounds created");
  check(h.audio[0].src, "./verse_images/daily_questions/dq_correct.mp3", "Correct sound intact");
  check(h.audio[1].src, "./verse_images/daily_questions/dq_incorrect.mp3", "Incorrect sound intact");
  h.hooks.playDailyQuestionAnswerSound(true);
  check(h.audio[0].playCount, 1, "Correct answer plays");
  check(h.audio[1].playCount, 0, "Incorrect answer does not play instead");
  h.hooks.playDailyQuestionAnswerSound(false);
  check(h.audio[0].paused, true, "Old correct sound stopped");
  check(h.audio[1].playCount, 1, "Incorrect answer plays");
  h.audio[1].nextResult = "reject";
  h.hooks.playDailyQuestionAnswerSound(false);
  await tick();
  check(h.audio[1].playCount, 2, "Rejected answer sound is nonfatal");
  h.audio[1].nextResult = "throw";
  h.hooks.playDailyQuestionAnswerSound(false);
  check(h.audio[1].playCount, 3, "Thrown answer sound is nonfatal");
  h.muted = true;
  h.module.onMuteChanged(true);
  check(h.audio[1].paused, true, "Mute immediately stops incorrect sound");
  check(h.audio[0].paused, true, "Mute also stops correct sound");
  h.hooks.playDailyQuestionAnswerSound(true);
  check(h.audio[0].playCount, 1, "Muted correct answer stays silent");
  h.hooks.playDailyQuestionAnswerSound(false);
  check(h.audio[1].playCount, 3, "Muted incorrect answer stays silent");
  h.muted = false;
  h.module.onMuteChanged(false);
  h.hooks.playDailyQuestionAnswerSound(true);
  check(h.audio[0].playCount, 2, "Unmute allows new sound");
  h.document.hidden = true;
  h.hooks.playDailyQuestionAnswerSound(true);
  check(h.audio[0].playCount, 2, "Hidden app does not start answer sound");
  h.emit("document", "visibilitychange");
  check(h.audio[0].paused, true, "Background stops answer sound");
  h.document.hidden = false;
  h.emit("document", "visibilitychange");
  check(h.audio[0].playCount, 2, "Foreground does not auto-replay answer sound");

  const s = h.session();
  h.hooks.playGeneratedQuestionAudio("", s);
  check(h.audio.length, 2, "Empty source creates no audio");
  s.answered = true;
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  check(h.audio.length, 2, "Answered question cannot start audio");
  s.answered = false;
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  check(h.audio.length, 3, "Recorded question audio created");
  const a = h.audio[2];
  check(a.playCount, 1, "Recorded question play invoked");
  check(s.questionAudioPlaying, true, "Playing UI active");
  check(h.renderCount, 1, "Playing UI rendered");
  check(a.src, "question.mp3", "Question source preserved");
  check(h.timers, 2, "Watchdogs armed while playing");
  await tick();
  a.currentTime = 0.25;
  a.emit("timeupdate");
  h.advance(9000);
  check(s.questionAudioPlaying, true, "Progress prevents startup false timeout");
  a.currentTime = 2;
  a.emit("timeupdate");
  h.advance(8000);
  check(s.questionAudioPlaying, true, "Continued progress prevents stall timeout");
  a.ended = true;
  a.emit("ended");
  check(s.questionAudioPlaying, false, "Ended restores retry button");
  check(h.timers, 0, "Ended cleans up timers");
  check(h.renderCount, 2, "Ended updates UI");

  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const stalled = h.audio.at(-1);
  h.advance(8100);
  check(s.questionAudioPlaying, false, "Stalled startup restores retry");
  check(stalled.paused, true, "Stalled startup paused");
  check(h.timers, 0, "Stalled startup clears timers");
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const slow = h.audio.at(-1);
  slow.currentTime = 1;
  slow.emit("timeupdate");
  h.advance(12000);
  check(s.questionAudioPlaying, false, "Mid-playback stall clears playing state");
  check(h.timers, 0, "Mid-playback stall clears timers");

  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const failed = h.audio.at(-1);
  failed.emit("error");
  check(s.questionAudioPlaying, false, "Media error allows retry");
  h.nextAudioPlayMode = "reject";
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  await tick();
  check(s.questionAudioPlaying, false, "Rejected play() restores retry button");
  check(h.timers, 0, "Rejected play() cleans timers");
  h.nextAudioPlayMode = "throw";
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  check(s.questionAudioPlaying, false, "Synchronous play exception restores retry");
  check(h.timers, 0, "Synchronous play exception cleans timers");
  h.nextAudioPlayMode = "hang";
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const hanging = h.audio.at(-1);
  h.advance(8100);
  check(s.questionAudioPlaying, false, "Unresolved play() times out safely");
  hanging.resolvePlay();
  await tick();
  check(hanging.paused, true, "Late resolved play() is kept paused");
  check(s.questionAudioPlaying, false, "Late resolved play() does not relock UI");
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const paused = h.audio.at(-1);
  paused.pause();
  check(s.questionAudioPlaying, false, "Unprompted pause restores retry");
  check(h.timers, 0, "Pause clears timers");

  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const beforeMute = h.audio.at(-1);
  h.muted = true;
  h.module.onMuteChanged(true);
  check(beforeMute.paused, true, "Mute interrupts spoken question");
  check(s.questionAudioPlaying, false, "Mute unlocks question audio button");
  check(h.timers, 0, "Mute releases playback timers");
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  check(h.audio.at(-1), beforeMute, "Muted tap doesn't create new audio");
  h.muted = false;
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const foreground = h.audio.at(-1);
  h.document.hidden = true;
  h.emit("document", "visibilitychange");
  check(foreground.paused, true, "Background interrupts question playback");
  check(s.questionAudioPlaying, false, "Background releases state");
  const rendersWhileHidden = h.renderCount;
  h.emit("window", "pagehide");
  check(h.renderCount, rendersWhileHidden, "Hidden lifecycle does not force UI render");
  h.document.hidden = false;
  h.emit("window", "pageshow");
  check(h.renderCount, rendersWhileHidden + 1, "Foreground refreshes retry button");
  h.emit("window", "pageshow");
  check(h.renderCount, rendersWhileHidden + 1, "Repeated pageshow does not duplicate render");
  check(foreground.playCount, 1, "Foreground never auto-replays audio");
  h.hooks.playGeneratedQuestionAudio("question.mp3", s);
  const exitAudio = h.audio.at(-1);
  h.hooks.stopDailySessionRuntime();
  check(exitAudio.paused, true, "Navigation stops question audio");
  check(s.questionAudioPlaying, false, "Navigation clears UI state");
  check(h.timers, 0, "Navigation cancels watchdogs");
  check(h.hooks.getState().questionAudioNeedsForegroundRender, false,
    "Navigation clears stale foreground render request");
  h.emit("window", "pageshow");
  check(h.renderCount, rendersWhileHidden + 2, "Navigation doesn't render obsolete retry UI");

  // An old audio event/promise must never stop a replacement playback.
  h.hooks.playGeneratedQuestionAudio("old.mp3", s);
  const old = h.audio.at(-1);
  h.hooks.stopGeneratedQuestionAudio();
  h.hooks.playGeneratedQuestionAudio("new.mp3", s);
  const newer = h.audio.at(-1);
  old.emit("ended");
  old.emit("error");
  check(s.questionAudioPlaying, true, "Old audio events cannot cancel new playback");
  check(h.hooks.getState().generatedQuestionAudio, newer, "New audio remains active");
  h.hooks.stopGeneratedQuestionAudio();
  check(h.timers, 0, "Replacement cleanup succeeds");

  const separate = makeHarness();
  const s2 = separate.session();
  separate.hooks.playGeneratedQuestionAudio("question.mp3", s2);
  const pending = separate.audio.at(-1);
  // Pretend the media play promise is still waiting; promise fulfillment after
  // navigation is harmless because the old instance is paused again.
  separate.hooks.stopDailySessionRuntime();
  await tick();
  check(pending.paused, true, "Late settlement after navigation stays stopped");
  check(s2.questionAudioPlaying, false, "Late settlement doesn't relock UI");

  // Exercise app.js's real mute control body in isolation rather than only
  // checking for the integration string.
  const toggleSource = appSource.split("function toggleMute() {")[1]
    ?.split("\nfunction safePlay() {")[0];
  ok(!!toggleSource, "App mute handler can be located");
  const muteNotifications = [];
  const muteContext = {
    window: { BibloZooDailyQuestions: {
      onMuteChanged: value => muteNotifications.push(value)
    } },
    audioEl: { currentTime: 4, pause() {} },
    applyMute() {}, unlockAppAudio() { return Promise.resolve(true); },
    pauseLearnAudioForInterruption() {}, renderNav() {}, render() {},
    stopNewVersePickerPreviewAudio() {},
    learnAudioInterrupted: null, learnShortInstructionNeedsRender: false,
    document: { hidden: false },
    muted: false
  };
  vm.runInNewContext("function toggleMute() {" + toggleSource + "\ntoggleMute(); toggleMute();", muteContext);
  check(muteNotifications, [true, false], "App mute changes notify Daily Questions");
  ok(appSource.includes("window.BibloZooDailyQuestions?.onMuteChanged?.(muted)"),
    "Global mute control notifies Daily Questions");
  ok(/isMuted:\s*\(\) => muted/.test(appSource),
    "Existing app mute is supplied to Daily Questions");
  ok(/onMuteChanged,\s*isFeatureEnabled/.test(moduleSource),
    "Mute callback remains in module public API");
  ok(/playDailyQuestionAnswerSound\(\s*dailySession\.answerCorrect\s*\);[\s\S]{0,120}if \(dailySession\.answerCorrect\)/.test(moduleSource),
    "Rewards remain independent from answer sound playback");
  ok(/const CACHE_VERSION = "[^"]+";/.test(workerSource) &&
    workerSource.includes('"./daily_questions.js"') &&
    workerSource.includes('"./app.js"'),
    "PWA cache still versions Daily Questions and app assets");

  console.log(`Patch 23A: ${checks} focused Daily Questions audio assertions passed.`);
}
main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
