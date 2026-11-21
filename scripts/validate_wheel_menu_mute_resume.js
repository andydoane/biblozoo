#!/usr/bin/env node
"use strict";
// Wheel of Bible iOS/iPad regression: opening the game menu pauses the
// wheel/prize animation; muting there must not trap the native menu lock.
// Execute the real production menu, native preflight and pause/resume
// functions. This does not replace an actual iPad/Xcode device test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname,
  "../verse_playground/wheel_of_bible/game.js"), "utf8");
function section(begin, end) {
  const start = src.indexOf(begin);
  const finish = src.indexOf(end, start + begin.length);
  assert.ok(start >= 0 && finish > start, "real Wheel source: " + begin);
  return src.slice(start, finish);
}
const realFunctions = [
  section("  function primeWheelNativeFromGesture(", "\n  let muted = false;"),
  section("  function pauseWheelForReturn() {", "\n  let smartVerseRowsCacheKey"),
  section("  function wireGameMenu() {", "\n  function updateHud(")
].join("\n");

async function testMutedMenuCloseAndReentry() {
  const calls = [];
  let menu;
  const anim = {
    playState: "running",
    pause() { calls.push("animation-pause"); this.playState = "paused"; },
    play() { calls.push("animation-resume"); this.playState = "running"; }
  };
  const scope = {
    Promise, Math, Number,
    MENU_OVERLAY_ID: "wheelOfBibleGameMenuOverlay",
    HELP_OVERLAY_ID: "wheelOfBibleHelpOverlay",
    nativeWheelAudio: {
      stop() { calls.push("native-stop"); return Promise.resolve(); },
      tapUiFromGesture() { calls.push("native-ui-tap"); },
      isReady() { return true; },
      prepareFromGesture() {
        calls.push("native-preflight");
        return Promise.resolve({ ready: true, reason: "os-accepted" });
      }
    },
    shell: () => ({
      wireGameMenu(config) { menu = config; },
      openHelp() {}
    }),
    document: {
      hidden: false,
      getElementById() { return null; }
    },
    app: {
      getAnimations() { return [anim]; },
      setAttribute() {},
      removeAttribute() {}
    },
    nativeWheelMenuOpen: false,
    nativeWheelPending: false,
    nativeWheelFailure: false,
    nativeWheelGeneration: 0,
    nativeWheelRetryKind: "resume",
    nativeWheelUiKey: () => "uiTap1",
    welcomePaused: false,
    playgroundWelcome: { isPaused: () => false },
    welcomeClock: {
      pause() { calls.push("clock-pause"); },
      resume() { calls.push("clock-resume"); }
    },
    pausedVisualAnimations: [],
    pausedVerseRecording: false,
    verseAudioEl: null,
    muted: false,
    masterGain: null,
    audioCtx: null,
    wheelSpinPending: false,
    spinStartedAt: null,
    nextSpinTick: 0,
    state: { screen: "moneyTotal", completed: false },
    remainingSpinTickIndex: () => 0,
    cancelQueuedSpinTicks: () => 0,
    stopLiveTones: () => 0,
    logWheelAudio() {},
    gameNow: () => 0,
    freezeGameTimers() { calls.push("timers-freeze"); },
    thawGameTimers() { calls.push("timers-resume"); },
    scheduleRemainingSpinTicks() {},
    clearNativeWheelFailure() {},
    showNativeWheelFailure(message) { throw Error(message); },
    beginRun() { throw Error("Close must not start a new round"); },
    stopNativeWheelRun() {},
    stopVerseAudio() {},
    clearTimers() {},
    bridge: () => ({ exitGame() {} })
  };
  vm.createContext(scope);
  vm.runInContext(realFunctions + "\nthis.testWireGameMenu = wireGameMenu;",
    scope, { filename: "wheel_menu_actual_source.js" });
  scope.testWireGameMenu();
  assert.ok(menu, "real Wheel menu installed");
  assert.equal(menu.onOpen(), true);
  assert.equal(scope.nativeWheelMenuOpen, true);
  assert.equal(scope.welcomePaused, true);
  assert.equal(anim.playState, "paused");
  assert.equal(menu.onMuteToggle(), true, "mute while paused in menu");
  menu.onClose();
  assert.equal(scope.nativeWheelMenuOpen, false,
    "muted Close clears native menu lock");
  assert.equal(scope.welcomePaused, false,
    "muted Close releases paused game clock");
  assert.equal(anim.playState, "running",
    "muted Close resumes raining Bible Bux animation");
  assert.ok(calls.includes("timers-resume"),
    "muted Close resumes pending game timers");
  assert.equal(calls.filter(c => c === "native-preflight").length, 0,
    "muted Close never tries to activate a silent audio session");

  // Previously the frozen menu lock made this tap permanently unresponsive.
  assert.equal(menu.onOpen(), true,
    "menu remains responsive after muted Close");
  assert.equal(scope.welcomePaused, true);
  assert.equal(anim.playState, "paused");
  assert.equal(menu.onMuteToggle(), false,
    "unmute while paused in second menu");
  menu.onClose();
  assert.equal(scope.nativeWheelPending, true,
    "unmuted Close waits for the actual native preflight");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls.filter(c => c === "native-preflight").length, 1,
    "unmuted Close still prepares native audio");
  assert.equal(scope.nativeWheelPending, false);
  assert.equal(scope.nativeWheelMenuOpen, false);
  assert.equal(scope.welcomePaused, false);
  assert.equal(anim.playState, "running");
  assert.equal(menu.onOpen(), true,
    "menu remains responsive after returning to unmuted mode");
}
testMutedMenuCloseAndReentry().then(() =>
  console.log("Wheel native menu mute/Close, animation, timer and reentry PASS")
).catch(err => { console.error(err.stack || err); process.exitCode = 1; });
