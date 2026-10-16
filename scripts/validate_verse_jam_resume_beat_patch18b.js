"use strict";

// Patch 18B: deterministic browser-free regression tests for the manual beat
// resume flow. Hardware-specific sound output is tested on an iOS device.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "verse_playground/verse_jam/game.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
function between(a, b) {
  const i = source.indexOf(a), j = source.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, `Unable to extract ${a}`);
  return source.slice(i, j);
}
const recovery = between("  function hideResumeBeatOverlay() {", "  function pauseGameForMenu() {");

function harness(overrides = {}) {
  const events = [];
  const nodes = new Map();
  let overlayInstances = 0;
  let mode = "success";
  let pendingResolve = null;
  const state = {
    screen: "game", phase: "spawn_chunk", completed: false,
    paused: false, resumeAfterMenu: false, resumeAfterInterruption: false,
    resumeBeatApproved: false, interruptedPhase: "", menuOpen: false, helpOpen: false,
    currentButtons: [{ id: "a", segmentIndex: 3 }, { id: "b", segmentIndex: 4 }],
    acceptingInput: true, busy: true, progressIndex: 3, chunkIndex: 1,
    roundIndex: 2, groovyScore: 115,
    ...overrides
  };
  const button = {
    disabled: false, textContent: "▶ Resume Beat", listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
    focus() { events.push("focusButton"); },
    fire(type = "pointerdown") { this.listeners[type]?.(); }
  };
  const status = { textContent: "" };
  const document = {
    hidden: false,
    getElementById(id) { return nodes.get(id) || null; },
    createElement() {
      const element = {
        id: "", style: {}, innerHTML: "", setAttribute() {},
        remove() {
          nodes.delete("verseJamResumeBeatOverlay");
          nodes.delete("verseJamResumeBeatButton");
          nodes.delete("verseJamResumeBeatStatus");
          events.push("hideOverlay");
        }
      };
      return element;
    },
    body: {
      appendChild(element) {
        overlayInstances += 1;
        nodes.set("verseJamResumeBeatOverlay", element);
        nodes.set("verseJamResumeBeatButton", button);
        nodes.set("verseJamResumeBeatStatus", status);
        events.push("showOverlay");
      }
    }
  };
  const audioCtx = { state: "running" };
  const sandbox = vm.createContext({
    Promise, events, state, document, audioCtx,
    console: { warn(...args) { events.push(`warning:${args.length}`); } }
  });
  vm.runInContext(`
    const GAME_ICON_HTML = '<img src="verse-jam-icon.png" alt="Verse Jam icon">';
    let resumeBeatInFlight = false;
    let resumeBeatGestureGeneration = 0;
    let audioUnlocked = false, audioForegroundRecoveryPending = true;
    let gameplayGeneration = 0;
    function beginGameplayFlow() { events.push("invalidate"); return ++gameplayGeneration; }
    function clearSleeps() { events.push("clearSleeps"); }
    function stopMusic() { events.push("stopMusic"); }
    function stopGameplayWatchdog() { events.push("stopWatchdog"); }
    function startBeatLoop(opts = {}) { events.push("startBeatLoop" + (opts.startAt != null ? ":aligned" : "")); }
    function startGameplayWatchdog() { events.push("startWatchdog"); }
    function isGameplayFlowActive(flowId) { return flowId === gameplayGeneration && !state.paused && !document.hidden; }
    async function startNextPlayableGroup(flowId) {
      events.push("restartPhrase:" + state.progressIndex + ":" + state.chunkIndex + ":" + flowId);
    }
    async function runIntroSequence() { events.push("restartIntro"); }
    async function finishAfterEndingSequence() { events.push("restartEnding"); }
    async function showRoundTransition(opts) { events.push("restartTransition:" + opts.alreadyAligned); return 17; }
    async function waitUntilAudioTime(time) { events.push("waitDownbeat:" + time); }
    async function unlockAudioFromGesture() {
      events.push("requestAudio");
      if (testMode() === "pending") return new Promise(resolve => { setPendingResolve(resolve); });
      if (testMode() === "fail") return false;
      audioUnlocked = true;
      audioForegroundRecoveryPending = false;
      audioCtx.state = "running";
      return true;
    }
    ${recovery}
    this.api = { pauseVerseJamForInterruption, resumeVerseJamAfterInterruption,
      showResumeBeatOverlay, attemptResumeBeat,
      getState: () => ({ unlocked: audioUnlocked, pending: audioForegroundRecoveryPending, inFlight: resumeBeatInFlight }),
      invalidateGesture: () => { resumeBeatGestureGeneration += 1; resumeBeatInFlight = false;
        state.resumeBeatApproved = false; },
      confirmPending: () => { audioUnlocked = true; audioForegroundRecoveryPending = false; audioCtx.state = "running"; }
    };
  `, Object.assign(sandbox, {
    testMode: () => mode,
    setPendingResolve: resolve => { pendingResolve = resolve; }
  }));
  return {
    state, events, button, status, doc: document, ctx: audioCtx,
    api: sandbox.api, setMode(value) { mode = value; },
    overlayVisible() { return nodes.has("verseJamResumeBeatOverlay"); },
    overlayCount() { return overlayInstances; },
    resolvePending(ok = true) { assert.ok(pendingResolve, "pending audio unlock");
      if (ok) sandbox.api.confirmPending();
      pendingResolve(ok); pendingResolve = null;
    }
  };
}
async function flush() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}
async function tap(h, type = "pointerdown") {
  h.button.fire(type);
  await flush();
}

let checks = 0;
async function check(name, fn) {
  try { await fn(); checks += 1; }
  catch (err) { err.message = `${name}: ${err.message}`; throw err; }
}

async function main() {
  await check("background cancels active word timers and musical sources", () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    assert.deepEqual(h.events, ["invalidate", "clearSleeps", "stopMusic", "stopWatchdog"]);
    assert.equal(h.state.interruptedPhase, "spawn_chunk");
    assert.equal(h.state.resumeAfterInterruption, true);
    assert.equal(h.state.paused, true);
  });
  await check("background preserves every completed gameplay position", () => {
    const h = harness();
    const before = [h.state.progressIndex, h.state.chunkIndex, h.state.roundIndex, h.state.groovyScore];
    h.api.pauseVerseJamForInterruption();
    assert.deepEqual([h.state.progressIndex, h.state.chunkIndex, h.state.roundIndex, h.state.groovyScore], before);
  });
  await check("intro stops and is eligible even without buttons", () => {
    const h = harness({ phase: "intro", currentButtons: [] });
    h.api.pauseVerseJamForInterruption();
    assert.equal(h.state.paused, true);
    assert.equal(h.state.interruptedPhase, "intro");
  });
  await check("round transition stops without rolling round index back", () => {
    const h = harness({ phase: "round_transition", currentButtons: [], roundIndex: 3 });
    h.api.pauseVerseJamForInterruption();
    assert.equal(h.state.paused, true);
    assert.equal(h.state.roundIndex, 3);
  });
  await check("closing phrase is resumable without replaying rewards", () => {
    const h = harness({ phase: "ending_sequence", currentButtons: [] });
    h.api.pauseVerseJamForInterruption();
    assert.equal(h.state.paused, true);
  });
  await check("duplicate background events do not double stop or reset", () => {
    const h = harness(); h.api.pauseVerseJamForInterruption(); h.api.pauseVerseJamForInterruption();
    assert.equal(h.events.filter(x => x === "stopMusic").length, 1);
  });
  await check("overlay never opens while device locked", () => {
    const h = harness(); h.api.pauseVerseJamForInterruption(); h.doc.hidden = true;
    h.api.showResumeBeatOverlay();
    assert.equal(h.overlayVisible(), false);
  });
  await check("return shows exactly one accessible resume button", () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.api.showResumeBeatOverlay(); h.api.showResumeBeatOverlay();
    assert.equal(h.overlayCount(), 1);
    assert.ok(h.overlayVisible());
    assert.ok(h.events.includes("focusButton"));
    assert.ok(h.button.listeners.pointerdown && h.button.listeners.click);
  });
  await check("foreground audio alone never auto-restarts the phrase", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.api.confirmPending();
    assert.equal(await h.api.resumeVerseJamAfterInterruption(), false);
    assert.equal(h.state.paused, true);
    assert.ok(!h.events.some(x => x.startsWith("restartPhrase:")));
  });
  await check("user gesture resumes remaining word phrase exactly once", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    await tap(h); await tap(h, "click");
    assert.equal(h.state.paused, false);
    assert.equal(h.overlayVisible(), false);
    assert.equal(h.events.filter(x => x.startsWith("restartPhrase:")).length, 1);
    assert.ok(h.events.some(x => x.startsWith("restartPhrase:3:1:")));
  });
  await check("intro restarts before any first playable group", async () => {
    const h = harness({ phase: "intro", currentButtons: [] });
    h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    await tap(h);
    const intro = h.events.indexOf("restartIntro");
    assert.ok(intro >= 0);
    assert.ok(h.events.findIndex(x => x.startsWith("restartPhrase:")) > intro);
    assert.equal(h.state.progressIndex, 3);
  });
  await check("round-transition restarts on the next downbeat", async () => {
    const h = harness({ phase: "round_transition", currentButtons: [], roundIndex: 3 });
    h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    await tap(h);
    assert.ok(h.events.includes("restartTransition:true"));
    assert.ok(h.events.includes("startBeatLoop:aligned"));
    assert.ok(h.events.includes("waitDownbeat:17"));
    assert.equal(h.state.roundIndex, 3);
  });
  await check("closing phrase restarts with exactly one continuation", async () => {
    const h = harness({ phase: "ending_sequence", currentButtons: [] });
    h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    await tap(h);
    assert.equal(h.events.filter(x => x === "restartEnding").length, 1);
  });
  await check("failed first tap keeps overlay and allows second tap", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    h.setMode("fail"); await tap(h);
    assert.equal(h.state.paused, true);
    assert.ok(h.overlayVisible());
    assert.equal(h.button.disabled, false);
    assert.match(h.status.textContent, /Tap Resume Beat again/);
    h.setMode("success"); await tap(h);
    assert.equal(h.state.paused, false);
    assert.equal(h.overlayVisible(), false);
    assert.equal(h.events.filter(x => x.startsWith("restartPhrase:")).length, 1);
  });
  await check("resume refuses to start if clock still interrupted", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.state.resumeBeatApproved = true;
    h.api.confirmPending(); h.ctx.state = "interrupted";
    assert.equal(await h.api.resumeVerseJamAfterInterruption(), false);
    assert.equal(h.state.paused, true);
  });
  await check("resume refuses pending audio even if reported running", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.state.resumeBeatApproved = true;
    assert.equal(await h.api.resumeVerseJamAfterInterruption(), false);
    assert.equal(h.state.paused, true);
  });
  await check("pending first gesture and immediate second gesture do not overlap", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    h.setMode("pending");
    h.button.fire("pointerdown"); h.button.fire("click");
    assert.equal(h.events.filter(x => x === "requestAudio").length, 1);
    h.resolvePending(); await flush();
    assert.equal(h.events.filter(x => x.startsWith("restartPhrase:")).length, 1);
  });
  await check("background during pending tap invalidates the old gesture", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
    h.setMode("pending"); h.button.fire("pointerdown");
    h.api.invalidateGesture(); h.doc.hidden = true;
    h.resolvePending(); await flush();
    assert.equal(h.state.paused, true);
    assert.ok(!h.events.some(x => x.startsWith("restartPhrase:")));
    h.doc.hidden = false; h.api.showResumeBeatOverlay();
    h.setMode("success"); await tap(h);
    assert.equal(h.state.paused, false);
  });
  await check("locked screen or hidden game never resumes a phrase", async () => {
    const h = harness(); h.api.pauseVerseJamForInterruption();
    h.state.resumeBeatApproved = true; h.api.confirmPending(); h.doc.hidden = true;
    assert.equal(await h.api.resumeVerseJamAfterInterruption(), false);
  });
  await check("existing menu or help overlay retains ownership", async () => {
    for (const override of [{ menuOpen: true }, { helpOpen: true }, { paused: true, resumeAfterMenu: true }]) {
      const h = harness(override); h.api.pauseVerseJamForInterruption();
      assert.equal(h.state.resumeAfterInterruption, false);
    }
  });
  await check("score screen or completed game never replays rewards", async () => {
    for (const override of [{ phase: "score", currentButtons: [] }, { completed: true }, { screen: "end" }]) {
      const h = harness(override); h.api.pauseVerseJamForInterruption(); h.api.showResumeBeatOverlay();
      assert.equal(h.overlayVisible(), false);
      assert.equal(h.state.resumeAfterInterruption, false);
    }
  });
  await check("no scoring, completion, or verse reset in resume functions", () => {
    assert.doesNotMatch(recovery, /initVerseData\(|markPlaygroundPracticed\(|showGroovySplash\(|finishToEndScreen\(|handleRoundOrEnd\(/);
    assert.doesNotMatch(recovery, /state\.(?:progressIndex|chunkIndex|roundIndex|groovyScore)\s*(?:=|\+\+|--)/);
    assert.match(source, /state\.phase = "ending_sequence"/);
  });
  await check("final ending continuation does not repeat progress award", () => {
    const ending = between("  async function finishAfterEndingSequence(", "  async function showRoundTransition(");
    assert.doesNotMatch(ending, /markPlaygroundPracticed\(|state\.roundIndex\s*\+\+|showGroovySplash\(/);
    assert.match(ending, /showEndingSequence\(flowId\)/);
  });
  await check("Resume Beat layout and headphones warning preserved", () => {
    const popup = between("  function showResumeBeatOverlay() {", "  async function attemptResumeBeat() {");
    assert.match(popup, /class="verse-jam-resume-icon"/);
    assert.match(popup, /\$\{GAME_ICON_HTML\}/);
    assert.match(popup, /Ready to Jam\?/);
    assert.ok(popup.indexOf('class="verse-jam-resume-icon"') < popup.indexOf('id="verseJamResumeBeatTitle"'),
      "Verse Jam icon must sit above the title");
    assert.doesNotMatch(popup, /🎵|Tap to restart your beat/);
    assert.match(popup, /id="verseJamResumeBeatStatus"[^>]*hidden/);
    assert.match(source, /Some wireless headphones have a delay/);
    assert.match(source, /id="verseJamHeadphonesGotIt"/);
  });
  await check("service worker and previous regressions are retained", () => {
    assert.match(serviceWorker, /2026_Oct_16_patch18b_verse_jam_resume_beat_ad/);
    for (const file of ["validate_verse_jam_audio_patch18.js", "validate_verse_jam_phrase_patch18a.js",
                        "validate_verse_game_audio_patch17.js"]) {
      assert.ok(fs.existsSync(path.join(root, "scripts", file)), file);
    }
  });
  console.log(`Patch 18B Resume Beat validation passed (${checks} checks).`);
}
main().catch(err => { console.error(err); process.exitCode = 1; });
