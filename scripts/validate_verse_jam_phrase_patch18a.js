"use strict";

// Patch 18A: phrase continuity when iOS backgrounds Verse Jam.
// Isolated tests run in Node, without browser hardware or network access.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "verse_playground/verse_jam/game.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
function section(start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, `Missing source section ${start}`);
  return source.slice(i, j);
}

const phraseFunctions = section(
  "  // Pause *all* unfinished musical phrases, including the opening intro and",
  "  function pauseGameForMenu() {"
);

function harness(overrides = {}) {
  const events = [];
  const state = {
    screen: "game", phase: "spawn_chunk", completed: false,
    paused: false, resumeAfterMenu: false, resumeAfterInterruption: false,
    resumeBeatApproved: false, interruptedPhase: "",
    menuOpen: false, helpOpen: false,
    acceptingInput: true, busy: true,
    currentButtons: [{ id: "a", segmentIndex: 3 }, { id: "b", segmentIndex: 4 }],
    progressIndex: 3, chunkIndex: 1, roundIndex: 2, groovyScore: 110,
    ...overrides
  };
  const sandbox = {
    state, events,
    document: { hidden: false },
    audioCtx: { state: "running" },
    audioUnlocked: false,
    audioForegroundRecoveryPending: true,
  };
  vm.createContext(sandbox);
  vm.runInContext(`
    let gameplayGeneration = 0;
    function beginGameplayFlow() { events.push("invalidate"); return ++gameplayGeneration; }
    function clearSleeps() { events.push("clearSleeps"); }
    function stopMusic() { events.push("stopMusic"); }
    function stopGameplayWatchdog() { events.push("stopWatchdog"); }
    function startBeatLoop() { events.push("startBeatLoop"); }
    function startGameplayWatchdog() { events.push("startWatchdog"); }
    function hideResumeBeatOverlay() { events.push("hideOverlay"); }
    function isGameplayFlowActive() { return !state.paused; }
    async function runIntroSequence() { events.push("restartIntro"); }
    async function finishAfterEndingSequence() { events.push("restartEnding"); }
    async function showRoundTransition() { events.push("restartTransition"); return 20; }
    async function waitUntilAudioTime() { events.push("waitDownbeat"); }
    async function startNextPlayableGroup(flowId) {
      events.push("restartPhrase:" + flowId);
      // Production code uses progressIndex/chunkIndex to build the next
      // playable phrase; this harness records the saved position.
      events.push("position:" + state.progressIndex + ":" + state.chunkIndex);
    }
    ${phraseFunctions}
    this.api = { pauseVerseJamForInterruption, resumeVerseJamAfterInterruption,
      flow: () => gameplayGeneration };
  `, sandbox);
  return {
    state, events, api: sandbox.api,
    setReady({ unlocked = true, pending = false, audioState = "running", hidden = false } = {}) {
      sandbox.audioUnlocked = unlocked;
      sandbox.audioForegroundRecoveryPending = pending;
      sandbox.audioCtx.state = audioState;
      sandbox.document.hidden = hidden;
      state.resumeBeatApproved = unlocked && !pending;
    }
  };
}

let checks = 0;
function check(name, fn) {
  return Promise.resolve().then(fn).then(() => { checks += 1; });
}

async function main() {
  await check("pause stops existing phrase timers and audio", () => {
    const h = harness();
    h.api.pauseVerseJamForInterruption();
    assert.deepEqual(h.events, ["invalidate", "clearSleeps", "stopMusic", "stopWatchdog"]);
    assert.equal(h.state.paused, true);
    assert.equal(h.state.resumeAfterInterruption, true);
    assert.equal(h.state.acceptingInput, false);
  });
  await check("pause does not alter completed word and score progress", () => {
    const h = harness();
    const before = [h.state.progressIndex, h.state.chunkIndex, h.state.roundIndex, h.state.groovyScore];
    h.api.pauseVerseJamForInterruption();
    assert.deepEqual([h.state.progressIndex, h.state.chunkIndex, h.state.roundIndex, h.state.groovyScore], before);
    assert.equal(h.state.currentButtons.length, 2);
  });
  await check("duplicate iOS background events pause just once", () => {
    const h = harness();
    h.api.pauseVerseJamForInterruption(); h.api.pauseVerseJamForInterruption();
    assert.equal(h.events.filter(x => x === "stopMusic").length, 1);
    assert.equal(h.api.flow(), 1);
  });
  for (const phase of ["spawn_chunk", "countdown", "play_chunk"]) {
    await check(`unfinished ${phase} phrase is resumable`, async () => {
      const h = harness({ phase });
      h.api.pauseVerseJamForInterruption();
      h.setReady();
      await h.api.resumeVerseJamAfterInterruption();
      assert.equal(h.state.paused, false);
      assert.equal(h.state.resumeAfterInterruption, false);
      assert.ok(h.events.includes("startBeatLoop"));
      assert.ok(h.events.includes("restartPhrase:2"));
      assert.ok(h.events.includes("position:3:1"));
    });
  }
  await check("recovered phrase is restarted only once", async () => {
    const h = harness();
    h.api.pauseVerseJamForInterruption(); h.setReady();
    await h.api.resumeVerseJamAfterInterruption();
    await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.events.filter(x => x.startsWith("restartPhrase:")).length, 1);
  });
  await check("failed audio unlock cannot resume the phrase", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.state.paused, true);
    assert.ok(!h.events.includes("startBeatLoop"));
    h.setReady(); await h.api.resumeVerseJamAfterInterruption();
    assert.ok(h.events.includes("startBeatLoop"));
  });
  await check("suspended or interrupted context cannot resume the phrase", async () => {
    for (const audioState of ["suspended", "interrupted", "closed"]) {
      const h = harness(); h.api.pauseVerseJamForInterruption();
      h.setReady({ audioState });
      await h.api.resumeVerseJamAfterInterruption();
      assert.equal(h.state.paused, true);
    }
  });
  await check("foreground probe must complete before restarting", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.setReady({ pending: true });
    await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.state.paused, true);
    h.setReady(); await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.state.paused, false);
  });
  await check("another background during recovery cannot restart while hidden", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.setReady({ hidden: true });
    await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.state.paused, true);
    h.setReady(); await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.state.paused, false);
  });
  await check("in-game pause and menu stay in control", async () => {
    const h = harness({ menuOpen: true });
    h.api.pauseVerseJamForInterruption();
    assert.equal(h.events.length, 0);
    const other = harness({ paused: true, resumeAfterMenu: true, resumeAfterInterruption: true });
    other.setReady(); await other.api.resumeVerseJamAfterInterruption();
    assert.equal(other.state.paused, true);
    assert.equal(other.events.length, 0);
  });
  await check("help screen does not auto-resume", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.state.helpOpen = true; h.setReady();
    await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.state.paused, true);
  });
  await check("intro/transition/ending restart but idle/score do not", async () => {
    for (const [phase, expected] of [
      ["intro", "restartIntro"],
      ["round_transition", "restartTransition"],
      ["ending_sequence", "restartEnding"]
    ]) {
      const h = harness({ phase, currentButtons: [] });
      h.api.pauseVerseJamForInterruption(); h.setReady();
      await h.api.resumeVerseJamAfterInterruption();
      assert.ok(h.events.includes(expected), phase);
    }
    for (const phase of ["idle", "score"]) {
      const h = harness({ phase });
      h.api.pauseVerseJamForInterruption(); h.setReady();
      await h.api.resumeVerseJamAfterInterruption();
      assert.equal(h.events.length, 0, phase);
    }
  });
  await check("completed phrase with no remaining buttons is not replayed", async () => {
    const h = harness({ currentButtons: [] });
    h.api.pauseVerseJamForInterruption(); h.setReady();
    await h.api.resumeVerseJamAfterInterruption();
    assert.equal(h.events.length, 0);
  });
  await check("completed or exited gameplay cannot be restarted", async () => {
    for (const override of [{ completed: true }, { screen: "end" }, { screen: "mode" }]) {
      const h = harness(override);
      h.api.pauseVerseJamForInterruption(); h.setReady();
      await h.api.resumeVerseJamAfterInterruption();
      assert.equal(h.events.length, 0);
    }
  });
  await check("gameplay restart uses existing phrase construction", () => {
    const spawn = section("  async function startNextPlayableGroup(", "  function getRestBeatsAfterButton(");
    assert.match(spawn, /state\.currentButtons\s*=\s*makeChunkButtons\(\)/);
    assert.match(spawn, /state\.currentRhythmOffsets\s*=\s*makeCurrentRhythmOffsets\(state\.currentButtons\)/);
    assert.match(spawn, /spawnButton\(button\)/);
  });
  await check("closing an interruption-time menu can finish a ready recovery", () => {
    const gameMenu = section("  function wireGameScreen() {", "  function shouldPauseGameForMenu() {");
    assert.match(gameMenu, /onClose:\s*\(\)\s*=>\s*\{[\s\S]*?resumeGameFromMenu\(\)/);
    assert.doesNotMatch(gameMenu, /void resumeVerseJamAfterInterruption\(\)/);
  });
  await check("audio event handlers are wired to new phrase hooks", () => {
    const hooks = section("  function unlockAudioFromGesture() {", "\n  const state = {");
    assert.match(hooks, /pauseVerseJamForInterruption\(\)/);
    assert.match(hooks, /showResumeBeatOverlay\(\)/);
    assert.doesNotMatch(hooks, /void resumeVerseJamAfterInterruption\(\)/);
    assert.match(hooks, /visibilitychange/);
    assert.match(hooks, /pagehide/);
    assert.match(hooks, /pageshow/);
  });
  await check("no progress/reward/round reset in interruption functions", () => {
    assert.doesNotMatch(phraseFunctions, /initVerseData\(|markPlaygroundPracticed\(|showGroovySplash\(|finishToEndScreen\(|handleRoundOrEnd\(/);
    assert.doesNotMatch(phraseFunctions, /state\.(?:progressIndex|chunkIndex|roundIndex|groovyScore)\s*(?:=|\+\+|--)/);
    assert.match(phraseFunctions, /startNextPlayableGroup\(flowId\)/);
  });
  await check("cache bump included", () => {
    assert.match(worker, /2026_Oct_16_patch18(?:a_verse_jam_phrase_resume_ac|b_verse_jam_resume_beat_ad)/);
  });
  console.log(`Patch 18A Verse Jam phrase recovery validation passed (${checks} checks).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
