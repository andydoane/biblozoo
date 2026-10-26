#!/usr/bin/env node
"use strict";
/* Patch 63: deterministic shared recovery checks + source policy for three
 * external games. Does not claim to simulate WebKit, real timers or iOS audio. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = pathName => fs.readFileSync(path.join(ROOT, pathName), "utf8");
let checks = 0;
function ok(value, reason) { checks++; assert.ok(value, reason); }
function eq(a,b,reason) { checks++; assert.equal(a,b,reason); }

function sourceChecks() {
  const sw = read("service-worker.js");
  ok(sw.includes("2026_Oct_26_patch68_1_interruption_gate_jam_startup"), "Fresh PWA version");
  const helper = read("verse_games/shared/welcome-back-return.js");
  ok(helper.includes("resumeAudioOnGesture"), "One gesture-owned audio check for standalone games");
  ok(helper.includes("context.currentTime - before >= 0.02"), "Audio clock must advance");
  ok(helper.includes("isCurrent() && getContext() === context"), "Old contexts and stale returns cannot pass");
  ok(helper.includes('source: "app"'), "Patch 60 recovery stays guarded");
  ok(helper.includes("1300"), "Bound hanging resume attempts");
  ok(helper.includes("muted) return Promise.resolve(true)"), "Muted games may continue");
  for (const id of ["bible_bugs", "verse_munch", "verse_splat"]) {
    const base = `verse_games/${id}/`;
    const html = read(base + "index.html");
    const src = read(base + "game.js");
    const css = read(base + "game.css");
    for (const resource of ["profiles.js", "welcome-back.js", "welcome-back-return.js", "audio-recovery-coordinator.js", "native-audio-recovery.js", "audio-diagnostics.js", "welcome-back.css"]) {
      ok(html.includes(resource), `${id}: imports ${resource}`);
    }
    ok(html.indexOf("welcome-back-return.js") < html.indexOf("bridge.js"), `${id}: helper loads before game`);
    ok(src.includes("onPause: pauseForTaskSwitch") && src.includes("onContinue: continueFromWelcomeBack"),
      `${id}: attaches activity-owned lifecycle callbacks`);
    ok(src.includes("window.VerseGameBridge.getLaunchParams().profileId"), `${id}: uses launched zookeeper identity`);
    ok(src.includes("returnSession += 1"), `${id}: a second switch invalidates stale recovery`);
    ok(src.includes("returnRecoveryFailures > 0 && returnContextReplacements < 1"),
      `${id}: only one replacement and only from a later gesture`);
    ok(src.includes("resumeAudioOnGesture"), `${id}: verifies actual audio`);
    ok(src.includes("if (!ok || document.hidden || session !== returnSession)"),
      `${id}: no continuation after failure or backgrounding`);
    ok(src.includes('classList.add("bz-return-activity-paused")'), `${id}: freezes CSS motion`);
    ok(css.includes("animation-play-state: paused !important"), `${id}: CSS animations freeze`);
  }
  const bugs = read("verse_games/bible_bugs/game.js");
  ok(bugs.includes('setPaused(true, "welcome-back")'), "Bugs reuses existing pause-aware scheduling");
  ok(bugs.includes("shiftGameTimers(pauseDuration)"), "Bugs shifts all game deadlines");
  ok(bugs.includes("priorPauseReason"), "Bugs preserves prior manual pause");
  ok(bugs.includes("if (returnPaused) { event.preventDefault(); return; }"), "Bugs ignores paused bug taps");
  const munch = read("verse_games/verse_munch/game.js");
  ok(munch.includes('setPaused(true, "welcome-back")'), "Munch reuses pause-aware waitSeconds");
  ok(munch.includes("if (!state.paused){\n        elapsedMs += ts - lastTs"), "Munch timers do not progress while paused");
  ok(munch.includes("if (!armed || returnPaused) return;"), "Munch score continuation cannot be triggered by popup");
  ok(munch.includes('"feedbackUntil", "reactionFlashUntil", "streakSunburstUntil", "buildShakeUntil"'),
    "Munch retains game feedback durations");
  const splat = read("verse_games/verse_splat/game.js");
  ok(splat.includes("if (returnPaused) return;\n    state.lastTs = 0;"), "Splat game and bonus loops don't restart under dialog");
  ok(splat.includes("stopGameLoop();\n    stopBonusLoop();"), "Splat freezes both motion loops on leave");
  ok(splat.includes("!returnPaused && !document.hidden"), "Splat waits and ceremony clocks are pause-aware");
  ok(splat.includes("const timer = { cancelled: false }"), "Splat delayed respawns can be canceled while paused");
  ok(splat.includes("state.inputLockedUntil += duration"), "Splat restores input lock deadlines");
  ok(splat.includes('shouldPrompt: () => ["game", "coverage_result", "bonus_intro", "bonus"].includes(state.screen)'),
    "Splat covers bonus and transition screens");
}

async function audioChecks() {
  let now=0, timeoutId=0, time=4.0, running=true, entered=true;
  const timers = [];
  const root = {
    document:{ body:{}, hidden:false },
    BibloZooWelcomeBack:{},
    addEventListener() {}, removeEventListener() {}
  };
  const context = { get currentTime() { return time; }, state: "running" };
  const vmContext = { window:root, Promise, setTimeout:fn=> { timers.push(fn);return ++timeoutId; } };
  vm.runInNewContext(read("verse_games/shared/welcome-back-return.js"), vmContext);
  const helper = root.BibloZooWelcomeBackReturn.resumeAudioOnGesture;
  ok(typeof helper === "function", "Shared verifier exposed");
  let gestureCalls=0;
  const make = (opts={})=>helper({
    unlock:()=> { gestureCalls++;return Promise.resolve(true); },
    getContext:()=>context,
    isCurrent:()=>entered,
    ...opts
  });
  const spin = async () => {for(let n=0;n<7;n++)await Promise.resolve();};
  const finishTimers = async () => {for(const fn of timers.splice(0)) fn();await spin();};
  // Runs unlock synchronously before any async work (iOS user activation).
  const first=make();eq(gestureCalls,1,"Unlock invoked synchronously");
  await spin();time+=0.22;await finishTimers();eq(await first,true,"Advancing clock verified");
  const stalled=make();await spin();await finishTimers();eq(await stalled,false,"Frozen 'running' context stays blocked");
  const stale=make();await spin();entered=false;time+=0.22;await finishTimers();eq(await stale,false,"Backgrounded attempt cannot complete");
  entered=true;
  const muted=await make({muted:true});eq(muted,true,"Muted games don't block on clock");
  context.state="suspended";
  const interrupted=make();await spin();await finishTimers();eq(await interrupted,false,"Suspended context doesn't pass");
  context.state="running";
}

(async()=>{sourceChecks();await audioChecks();console.log(`Patch 63 shared Welcome Back validation passed (${checks} checks).`);})().catch(err=>{console.error(err);process.exitCode=1;});
