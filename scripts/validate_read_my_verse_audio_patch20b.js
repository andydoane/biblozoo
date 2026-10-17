"use strict";
// Patch 20B: real Read My Verse lifecycle/audio functions in the existing
// deterministic media and WebKit-like animation harness.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { makeHarness, flush } = require("./validate_read_my_verse_audio_patch20.js");
const source = fs.readFileSync(path.join(__dirname, "..", "read_my_verse.js"), "utf8");
let checks = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const ok = (value, label) => { assert.ok(value, label); checks++; };

function sceneFor(h, animations) {
  const wrap = {
    classList: h.classes(),
    getAnimations(options) {
      equal(options?.subtree, true, "all nested word, decorative and inner animations included");
      return animations;
    }
  };
  return { active: true, wrap, timers: new Set(), items: new Map(), wordTracks: [],
    balloonTracks: [], fanfareLastProgress: 0 };
}

function animation(time) {
  return {
    currentTime: time, pauses: 0, plays: 0,
    pause() { this.pauses++; },
    play() { this.plays++; }
  };
}

async function verifyExactMotionFreeze(activity) {
  const h = makeHarness(); h.setup(activity, "animating");
  const words = animation(1700), decorative = animation(420), inner = animation(1050);
  const animations = [words, decorative, inner];
  const scene = sceneFor(h, animations);
  const track = { startMs: Date.now() - 1000, durationMs: 4500 };
  scene.wordTracks.push(track);
  h.api.setScenes(activity, scene);
  let nextStarted = 0;
  h.api[activity === "balloons" ? "balloonTimer" : activity === "fish" ? "fishTimer" : "crawlTimer"](scene, () => nextStarted++, 1500);
  h.hide();
  equal(scene.wrap.classList.contains("read-audio-paused"), true, `${activity}: CSS freeze flag set`);
  equal(words.pauses, 1, `${activity}: word keyframe explicitly paused`);
  equal(decorative.pauses, 1, `${activity}: decoration explicitly paused`);
  equal(inner.pauses, 1, `${activity}: inner animation explicitly paused`);
  equal(h.timers.size, 0, `${activity}: scene timers frozen`);
  // Simulate the real device defect: iOS fast-forwards CSS animation clocks
  // while hidden even though the application has stopped its timers.
  words.currentTime = 12000;
  decorative.currentTime = 22000;
  inner.currentTime = 9000;
  h.show();
  equal(words.currentTime, 1700, `${activity}: original word position restored on foreground`);
  equal(decorative.currentTime, 420, `${activity}: decoration position restored`);
  equal(inner.currentTime, 1050, `${activity}: nested animation restored`);
  equal(h.overlay().hidden, false, `${activity}: recovery stays visible until user gesture`);
  equal(words.plays, 0, `${activity}: word stays frozen beneath overlay`);
  h.api.resumeReadAudioFromGesture(); await flush();
  equal(h.overlay().hidden, true, `${activity}: successful recovery dismisses overlay`);
  equal(words.currentTime, 1700, `${activity}: word resumes from captured position`);
  equal(words.plays, 1, `${activity}: word animation plays once`);
  equal(decorative.plays, 1, `${activity}: decor animation resumes once`);
  equal(inner.plays, 1, `${activity}: inner animation resumes once`);
  equal(scene.wrap.classList.contains("read-audio-paused"), false, `${activity}: CSS pause is lifted`);
  ok(scene.pausedAnimations.size === 0, `${activity}: animation snapshot released`);
  equal(nextStarted, 0, `${activity}: no lost or premature next chunk`);
  ok(h.timers.size === 1, `${activity}: remaining timer armed again`);
  const timer = [...h.timers.values()][0];
  ok(timer.ms >= 0 && timer.ms <= 1500, `${activity}: remaining timer duration preserved`);
  h.fireTimer(timer.ms);
  equal(nextStarted, 1, `${activity}: next action fires once`);
  equal(h.completed(), 0, `${activity}: recovery never grants completion`);
}

async function testFailedAudioDoesNotThaw() {
  const h = makeHarness(); h.setup("balloons", "animating");
  const movingWord = animation(1400), scene = sceneFor(h, [movingWord]);
  const item = { index: 0, audioStarted: false, audioDone: false, vanished: false,
    group: { classList: h.classes(), remove() {} } };
  scene.items.set(0,item); h.api.setScenes("balloons", scene);
  h.api.playBalloonAudio(scene, item);
  h.hide(); h.show();
  h.setMedia("reject"); h.api.resumeReadAudioFromGesture(); await flush();
  equal(h.overlay().hidden, false, "failed narrated media keeps balloon overlay visible");
  equal(movingWord.plays, 0, "failed narrated media never unfreezes movement");
  equal(movingWord.currentTime, 1400, "failed attempt retains exact visual position");
  h.setMedia("success"); h.api.resumeReadAudioFromGesture(); await flush();
  equal(h.overlay().hidden, true, "retry frees scene");
  equal(movingWord.plays, 1, "retry resumes animation exactly once");
  equal(item.audioDone, false, "recording is not credited as heard before it ends");
}

async function testNewAnimationOnForeground() {
  const h = makeHarness(); h.setup("fish", "animating");
  const before = animation(500), after = animation(200);
  const animations = [before];
  const scene = sceneFor(h, animations); h.api.setScenes("fish", scene);
  h.hide(); animations.push(after);
  before.currentTime = 7000;
  h.show();
  equal(before.currentTime, 500, "old animation returns to exact clock");
  equal(after.pauses, 1, "late-mounted animation also freezes on return");
  h.api.resumeReadAudioFromGesture(); await flush();
  equal(after.plays, 1, "late-mounted animation unfreezes after resume");
  equal(before.plays, 1, "old animation unfreezes once");
}

async function testTimerRaceCannotDropNextAction() {
  const h = makeHarness(); h.setup("fish", "animating");
  const scene = sceneFor(h, []); h.api.setScenes("fish", scene);
  let next = 0;
  h.api.fishTimer(scene, () => next++, 850);
  const oldTimer = [...h.timers.values()][0];
  h.hide();
  oldTimer.fn(); // Callback already queued by WebKit while visibility changes.
  equal(next, 0, "racing timer does not advance animation while hidden");
  equal(scene.timers.size, 1, "racing callback retained as pending timer");
  h.show();h.api.resumeReadAudioFromGesture();await flush();
  equal(h.timers.size, 1, "racing callback rearmed once on recovery");
  h.fireTimer(0);
  equal(next, 1, "racing callback executes once after recovery");
}

async function main() {
  await verifyExactMotionFreeze("balloons");
  await verifyExactMotionFreeze("fish");
  await testFailedAudioDoesNotThaw();
  await testNewAnimationOnForeground();
  await testTimerRaceCannotDropNextAction();
  ok(source.includes("startCrawlMusic();"),
    "real launch gesture uses fresh, volume-controlled Web Audio");
  ok(source.includes("if (readAudioRecovery) fishTimer(session, () => launchFishChunk(session, -1), 0)"),
    "early fish frame is deferred behind recovery overlay");
  ok(source.includes("if (readAudioRecovery) balloonTimer(session, () => launchBalloonChunk(session, -1), 0)"),
    "early balloon frame is deferred behind recovery overlay");
  console.log(`Patch 20B animation and Crawl music recovery validation passed (${checks} checks).`);
}
main().catch(err=>{console.error(err);process.exitCode=1;});
