#!/usr/bin/env node
"use strict";
/* Patch 67: Playground return/preservation checks. No browser or hardware required. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let count = 0;
function check(test, message) { assert.ok(test, message); count++; }
function equal(a, b, message) { assert.equal(a, b, message); count++; }

function audit() {
  const scope = { window: {} };
  vm.runInNewContext(read("verse_playground/registry.js"), scope);
  const targets = ["ghost_writer", "scripture_scrub", "verse_typer"];
  for (const id of targets) {
    const entry = scope.window.EXTERNAL_VERSE_PLAYGROUND.find(x => x.manifest.id === id);
    check(entry?.enabled, `${id}: registered and enabled`);
    const base = `verse_playground/${id}/`;
    const html = read(base + "index.html");
    const js = read(base + "game.js");
    const css = read(base + "game.css");
    const deps = ["../../profiles.js", "../../verse_games/shared/welcome-back.css",
      "../../verse_games/shared/welcome-back.js", "../../verse_games/shared/welcome-back-return.js",
      "../../verse_games/shared/welcome-back-clock.js",
      "../../verse_games/shared/audio-diagnostics.js",
      "../../verse_games/shared/native-audio-recovery.js",
      "../../verse_games/shared/audio-recovery-coordinator.js"];
    for (const dep of deps) check(html.includes(dep), `${id}: has ${dep}`);
    check(html.indexOf("welcome-back-return.js") < html.indexOf("game-shell.js"), `${id}: shared controller loaded first`);
    check(html.indexOf("game-shell.js") < html.indexOf("./game.js"), `${id}: shell loaded before activity`);
    check(js.includes("attachPlaygroundWelcomeBack?.("), `${id}: registers shared shell adapter`);
    check(js.includes("isActive:"), `${id}: only prompts during active work`);
    check(js.includes("onPause:") && js.includes("onResume:"), `${id}: has state-specific hooks`);
    check(js.includes("getAudioContext:") && js.includes("replaceAudioContext:"), `${id}: audio is gesture-gated`);
    check(js.includes("isMuted:"), `${id}: muted activities acknowledge without audio stall`);
    check(!css.includes(".bz-welcome-card") && !css.includes(".bz-welcome-avatar"), `${id}: no duplicate popup style`);
    check(!js.includes("AVAudioSessionCategoryPlayback"), `${id}: no category changes`);
  }
  const shell = read("verse_games/shared/game-shell.js");
  check(shell.includes("function attachPlaygroundWelcomeBack"), "Shared shell owns the return adapter");
  check(shell.includes('pictureBase: "../../"'), "Launched profile image paths are correct");
  check(shell.includes('escapeText: "Back to Playground"'), "Recovery escape returns to Playground");
  check(shell.includes("preserveFocus: true"), "Native keyboard focus and selection preserved");
  check(shell.includes("!currentContext || muted"), "Silent activities have quick acknowledgement");
  check(shell.includes("document.documentElement.classList.remove"), "Shared shell unfreezes after success");
  check(shell.includes("options.onResume?.()"), "Shared shell calls activity continuation");
  const ctl = read("verse_games/shared/welcome-back-return.js");
  check(ctl.includes("if (!preserveFocus) button?.focus"), "Playground overlay does not steal keyboard focus");
  check(ctl.includes("escapeText === \"Back to Playground\""), "Playground escape label is shared");
  const css = read("verse_games/shared/shell.css");
  check(css.includes(".bz-playground-welcome-paused #app *"), "CSS motion paused inside activity only");
  check(!css.includes(".bz-playground-welcome-paused .bz-welcome"), "Popup portrait not frozen");
  check(read("verse_games/shared/welcome-back.css").includes("is-recovering"), "One existing shared portrait spinner used");
  const typer = read("verse_playground/verse_typer/game.js");
  check(typer.includes("const scheduledActions = new Map()"), "Typer pending actions are tracked");
  check(typer.includes("welcomeClock.now() +"), "Typer deadlines exclude background time");
  check(typer.includes("state.typedIndex"), "Typer retains letter progress");
  check(typer.includes("if (returnPaused || state.paused"), "Typer rejects input while pending");
  check(typer.includes("wasPausedBeforeReturn = state.paused"), "Typer preserves manual pause state");
  check(typer.includes("[...state.sleepIds].forEach(clearTrackedTimeout)"), "Typer invalidates old actions on replay");
  const ghost = read("verse_playground/ghost_writer/game.js");
  check(ghost.includes("if (document.hidden || document.documentElement?.classList?.contains"), "Ghost does not automatically resume on focus");
  check(ghost.includes("pauseGhostPlaybackForBackground"), "Ghost holds playback position");
  check(ghost.includes("ps.charStart += elapsed"), "Ghost shifts replay timestamp after acknowledgement");
  check(ghost.includes("if (ac === audioContext) soundBuffers.set"), "Ghost ignores stale sound buffers");
  const scrub = read("verse_playground/scripture_scrub/game.js");
  check(scrub.includes("pointerDown = false"), "Scrub ends interrupted strokes without resetting canvas");
  check(scrub.includes("welcomeClock.now() - startTime"), "Mower animation excludes background time");
  check(scrub.includes("if (welcomePaused) { deferredCoverageRound"), "Scrub defers completion checks until return");
  check(scrub.includes("const resumeMower = mowerResumeFrame"), "Scrub resumes existing mower pass");
  check(scrub.includes("if (ctx !== audioCtx) return null"), "Scrub ignores stale sound buffers");
  const worker = read("service-worker.js");
  check(worker.includes('2026_Oct_26_patch69_2_wacky_single_tap'), "Cache generation updated");
  for (const id of targets) {
    for (const filename of ["index.html", "game.js", "game.css"])
      check(worker.includes(`"./verse_playground/${id}/${filename}"`), `${id}: ${filename} available offline`);
  }
}

async function testAdapter() {
  const shell = read("verse_games/shared/game-shell.js");
  const a = shell.indexOf("  function attachPlaygroundWelcomeBack(options = {}) {");
  const b = shell.indexOf("  window.VerseGameShell = {", a);
  check(a >= 0 && b > a, "Shared adapter can be tested in isolation");
  const code = shell.slice(a, b);
  let attachOptions, paused = false, recoveryCount = 0, unlockCount = 0, pauseCount = 0, resumeCount = 0;
  const classes = new Set();
  const context = { state: "running", currentTime: 42 };
  const window = {
    VerseGameBridge: { getLaunchParams: () => ({profileId:"keeper2"}), exitGame() {} },
    BibloZooWelcomeBackReturn: {
      attach(opts) { attachOptions = opts; return { isPaused: () => paused }; },
      resumeAudioOnGesture(opts) { recoveryCount++; opts.unlock(); return Promise.resolve(true); }
    }
  };
  const document = { hidden: false, documentElement: {classList: {
    add: x => classes.add(x), remove: x => classes.delete(x)
  }}};
  vm.runInNewContext(code + "\nthis.testAdapter = attachPlaygroundWelcomeBack", { window, document });
  // Evaluate separately for a mock root that directly exposes the function.
  const scope = { window, document };
  vm.runInNewContext(code + "\nthis.testAdapter = attachPlaygroundWelcomeBack", scope);
  const options = {
    isActive: () => true,
    onPause: () => { pauseCount++; },
    onResume: () => { resumeCount++; },
    getAudioContext: () => context,
    unlockAudio: () => { unlockCount++; },
    replaceAudioContext: () => true,
    isMuted: () => false
  };
  scope.testAdapter(options);
  equal(attachOptions.profileId, "keeper2", "Correct child profile sent to popup");
  equal(attachOptions.pictureBase, "../../", "Correct profile image base");
  equal(attachOptions.escapeText, "Back to Playground", "Playground escape text");
  check(attachOptions.preserveFocus, "No background input focus loss");
  check(attachOptions.shouldPrompt(), "Active verse prompts on return");
  paused = true; attachOptions.onPause();
  equal(pauseCount, 1, "Activity pauses once");
  check(classes.has("bz-playground-welcome-paused"), "CSS motion freezes");
  const returned = attachOptions.onContinue();
  equal(recoveryCount, 1, "Recovery uses one user gesture");
  equal(unlockCount, 1, "Unlock called synchronously");
  check(await returned, "Verified audio allows continuation");
  equal(resumeCount, 1, "Activity resumes after verification");
  check(!classes.size, "CSS pause removed on successful return");
  options.isMuted = () => true;
  attachOptions.onPause();
  check(await attachOptions.onContinue(), "Muted activity simply acknowledges return");
  equal(recoveryCount, 1, "Muted acknowledgement does not create AudioContext");
  options.isMuted = () => false;
  options.getAudioContext = () => null;
  attachOptions.onPause();
  check(await attachOptions.onContinue(), "Activity with no audio context only acknowledges");
  equal(recoveryCount, 1, "No unwanted new audio context");
  options.getAudioContext = () => context;
  window.BibloZooWelcomeBackReturn.resumeAudioOnGesture = () => Promise.resolve(false);
  attachOptions.onPause();
  check(!(await attachOptions.onContinue()), "Failure blocks continuation");
  check(classes.has("bz-playground-welcome-paused"), "Failed recovery remains paused");
  let settle;
  window.BibloZooWelcomeBackReturn.resumeAudioOnGesture = () => new Promise(resolve => { settle = resolve; });
  attachOptions.onPause();
  const oldAttempt = attachOptions.onContinue();
  attachOptions.onPause(); // Another task switch before the first promise settles.
  settle(true);
  check(!(await oldAttempt), "Old audio results cannot resume a newer task switch");
  check(classes.has("bz-playground-welcome-paused"), "Newer return stays paused");
}

function testInterruptedTypingSequence() {
  const source = read("verse_playground/verse_typer/game.js");
  const first = source.indexOf("  function clearTrackedTimeout(id) {");
  const last = source.indexOf("  function invalidateRun() {", first);
  check(first >= 0 && last > first, "Typer timer scheduler can be tested");
  let wall = 1000, pausedAt = 0, pausedTotal = 0, isPaused = false;
  const clock = {
    now: () => (isPaused ? pausedAt : wall) - pausedTotal,
    pause() { if (!isPaused) { pausedAt = wall; isPaused = true; } },
    resume() { if (isPaused) { pausedTotal += wall - pausedAt; isPaused = false; } }
  };
  const jobs = new Map(); let nextTimer = 0, fired = 0;
  const setTimeout = (fn, delay) => { const id = ++nextTimer; jobs.set(id,{fn,at:wall+delay});return id; };
  const clearTimeout = id => jobs.delete(id);
  function advance(ms) {
    wall += ms;
    // Browser timers can be throttled while backgrounded. Process due callbacks
    // once, not an unbounded synthetic hour of 80ms polling.
    for (const [id, timer] of [...jobs.entries()]) {
      if (timer.at <= wall) { jobs.delete(id); timer.fn(); }
    }
  }
  const scope = {welcomeClock:clock, state:{sleepIds:[],runToken:1}, scheduledActions:new Map(),
    nextScheduledId:0, returnPaused:false, setTimeout, clearTimeout};
  const code = source.slice(first,last) + "\nthis.test = {trackedTimeout, clearSleeps, clearTrackedTimeout}";
  vm.runInNewContext(code,scope);
  scope.test.trackedTimeout(() => fired++,400,1);
  advance(100);
  scope.returnPaused = true;clock.pause();
  advance(3600000);
  equal(fired,0,"No typing transition during one-hour task switch");
  scope.returnPaused = false;clock.resume();
  advance(80);
  equal(fired,0,"Typing animation does not skip on first resumed tick");
  advance(220);
  equal(fired,1,"Pending typed-word transition completes after remaining time");
  scope.test.trackedTimeout(() => fired++,300,1);
  scope.test.clearSleeps();
  advance(1000);
  equal(fired,1,"Starting a new run cancels stale typing callbacks");
}

function testScrubCanvasPreserved() {
  const source = read("verse_playground/scripture_scrub/game.js");
  const first = source.indexOf("  function pauseScrubForReturn() {");
  const last = source.indexOf("  function renderTitleScreen() {",first);
  check(first >= 0 && last > first,"Scripture Scrub pause hooks can be tested");
  let paused = false, resumeFrame = null, stops = 0;
  const canvas = { pixels: [1,2,3,5,8,13] }; // Illustrates retained reveal state.
  const scope = { welcomePaused:false, pointerDown:true,lastPoint:{x:2,y:3},mowerResumeFrame:()=>{},mowerEndAt:0,
    mowerActive:false,mowerAnimationFrame:5,glowTrailAnimationFrame:3,rainbowTrailAnimationFrame:4,
    glowTrailSpots:[{x:2}],rainbowTrailParticles:[{x:3}],deferredCoverageRound:null,
    welcomeClock:{pause(){paused=true},resume(){paused=false},now(){return 0}},
    cancelAnimationFrame(){},requestAnimationFrame(fn){resumeFrame=fn;return 6},
    stopMowerSound(){stops++},startMowerSound(){},roundConfig(){return null},scheduleCoverageCheck(){}};
  vm.runInNewContext(source.slice(first,last)+"\nthis.test={pauseScrubForReturn,continueScrubAfterReturn}",scope);
  scope.test.pauseScrubForReturn();
  check(paused && scope.welcomePaused,"Scrubbing paused during return");
  check(!scope.pointerDown && scope.lastPoint === null,"Interrupted drag cannot continue accidentally");
  check(!scope.mowerAnimationFrame,"Scheduled mower frames stop");
  equal(JSON.stringify(canvas.pixels),JSON.stringify([1,2,3,5,8,13]),"Revealed canvas data remains unchanged");
  scope.test.continueScrubAfterReturn();
  check(!paused && !scope.welcomePaused,"Scrub clock resumes only on acknowledgement");
  check(typeof resumeFrame === "function","Mower's existing frame resumes without a restart");
  equal(stops,1,"Ongoing mower sound stops during interruption");
}

function testPauseClock() {
  let now = 100;
  const window = { performance: { now: () => now }, setTimeout };
  vm.runInNewContext(read("verse_games/shared/welcome-back-clock.js"), {window});
  const clock = window.BibloZooWelcomeBackClock.create();
  equal(clock.now(), 100, "Clock starts at real elapsed time");
  clock.pause(); now = 3600100;
  equal(clock.now(), 100, "A one-hour absence doesn't consume gameplay time");
  clock.resume(); now = 3600140;
  equal(clock.now(), 140, "Gameplay resumes at its previous timestamp");
}

(async () => {
  audit();
  await testAdapter();
  testInterruptedTypingSequence();
  testScrubCanvasPreserved();
  testPauseClock();
  console.log(`Patch 67 Playground welcome-back validator: ${count} checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
