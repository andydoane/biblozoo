"use strict";
// R07 / READ-02+03: exercise the ACTUAL Read scene timing functions with a
// WebKit-like player whose compositor jumps ahead during a long interruption.
// Node VM assertions are not a physical iPhone compositor/audio acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const source = read("read_my_verse.js");
const css = read("read_my_verse.css");
const workflow = read(".github/workflows/ios-prep-validation.yml");
new vm.Script(source);
assert(css.includes(".read-my-verse-screen.read-audio-paused *"));
assert(css.includes("animation-play-state: paused !important"));
assert(workflow.includes("node scripts/validate_r07_read_balloons_fish_pause_clock.js"));
assert(source.includes('thawReadScene(recovery.scene, Date.now() - recovery.startedAt)'));
assert(source.includes("finishVerifiedReadRecovery(recovery, generation, () => {"));
assert(source.includes("if (!heard || !tonesReady || !nativeReady || root?.document?.hidden)"));
assert(source.includes("balloonTimer(session, () => markBalloonWordsVanished(session, item),"));
assert(source.includes("fishTimer(session, () => markFishWordsVanished(session, item),"));
for (const p of ["docs/PROJECT-HANDOFF.md", "docs/TESTING.md",
  "docs/IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md",
  "docs/IOS-OWNER-AUDIO-FINDINGS-2026-11-17.md",
  "docs/AUDIO-RECOVERY.md"]) {
  assert(read(p).includes("R07"), p + " must describe R07 independently");
}
const start = source.indexOf("  function scheduleReadSceneTimer(session,");
const end = source.indexOf("  function recordReadRecoveryCheck(", start);
assert(start >= 0 && end > start, "real scene timer/freeze/thaw source anchors");
const actual = source.slice(start, end);
assert(actual.includes("function freezeReadScene(session)"));
assert(actual.includes("function thawReadScene(session, pausedMs = 0)"));

function fixture(kind, options = {}) {
  let now = 1000, counter = 0, readAudioRecovery = null;
  const tasks = new Map(), log = [];
  const timers = {
    setTimeout(fn, ms) {
      const id = ++counter;
      tasks.set(id, {fn, due: now + ms, delay: ms});
      return id;
    },
    clearTimeout(id) { tasks.delete(id); }
  };
  const clock = {now: () => now};
  const sandbox = {Date: clock, Map, Math, readAudioRecovery, ...timers};
  vm.createContext(sandbox);
  vm.runInContext(actual + `
    globalThis.testRead = {
      scheduleReadSceneTimer, freezeReadScene, thawReadScene,
      setRecovery: value => { readAudioRecovery = value; }
    };`, sandbox, {filename: "read_my_verse.js"});
  const api = sandbox.testRead;
  const running = (name, frame) => ({
    name, currentTime: frame, playState: "running", pauseCount: 0,
    playCount: 0,
    pause() { this.pauseCount++; this.playState = "paused"; log.push(name + ":pause"); },
    play() { this.playCount++; this.playState = "running"; log.push(name + ":play"); }
  });
  const word = running(kind + "-word", 240);
  const decor = running(kind + "-decor", 360);
  const authored = running(kind + "-authored-paused", 75);
  authored.playState = "paused";
  const finished = running(kind + "-finished", 900);
  finished.playState = "finished";
  const animations = [word, decor, authored, finished];
  const classes = new Set();
  const wrap = {
    getAnimations({subtree}) {
      assert.equal(subtree, true);
      log.push("getAnimations");
      return animations;
    },
    classList: {
      add(value) { classes.add(value); log.push("class:add"); },
      remove(value) {
        // Safari may process a pending animationend after CSS resumes.
        // At the instant the class is removed, all original running players
        // must already be at their exact PRE-pause frames.
        assert.equal(word.currentTime, 240,
          kind + ": word must be re-seeked BEFORE the CSS pause is removed");
        assert.equal(decor.currentTime, 360,
          kind + ": decorative player must be re-seeked BEFORE unpause");
        assert.equal(word.playState, "paused",
          kind + ": CSS unpause must not precede player re-seek");
        classes.delete(value);
        log.push("class:remove");
      }
    }
  };
  const scene = {
    active: true, wrap, timers: new Set(),
    wordTracks: [{startMs: 700, durationMs: 7000}],
    balloonTracks: kind === "balloons" ? [{startMs: 850, durationMs: 12000}] : [],
    fanfareLastProgress: 0
  };
  const advance = milliseconds => {
    now += milliseconds;
    for (let pass = 0; pass < 32; pass++) {
      const ready = [...tasks].filter(([, task]) => task.due <= now)
        .sort((a, b) => a[1].due - b[1].due);
      if (!ready.length) return;
      for (const [id, task] of ready) {
        if (!tasks.delete(id)) continue;
        task.fn();
      }
    }
    throw Error("Too many simulated timer re-arms");
  };
  return {
    api, scene, animations, word, decor, authored, finished, classes, log,
    tasks, advance, setRecovery: api.setRecovery,
    now: () => now, getRecoveries: () => readAudioRecovery
  };
}

for (const kind of ["balloons", "fish"]) {
  const h = fixture(kind);
  let vanished = 0, narrationStarted = 0;
  h.api.scheduleReadSceneTimer(h.scene, () => true, () => vanished++, 760);
  h.api.scheduleReadSceneTimer(h.scene, () => true, () => narrationStarted++, 480);
  h.advance(160);
  h.setRecovery({kind: "animated", startedAt: h.now()});
  h.api.freezeReadScene(h.scene);
  assert(h.classes.has("read-audio-paused"), kind + ": CSS remains frozen");
  assert(h.log.indexOf("getAnimations") < h.log.indexOf("class:add"),
    kind + ": running players must be captured before CSS pause changes playState");
  assert.equal(h.word.currentTime, 240);
  assert.equal(h.decor.currentTime, 360);
  assert.equal(h.authored.pauseCount, 0, kind + ": authored pause untouched");
  assert.equal(h.finished.pauseCount, 0, kind + ": finished animation untouched");
  assert.equal(h.tasks.size, 0, kind + ": timers must be disarmed");
  const frozenAt = h.scene.readSceneFrozenAt;
  h.advance(12500);
  assert.equal(vanished, 0, kind + ": no removal while inactive");
  assert.equal(narrationStarted, 0, kind + ": no narration under Welcome Back");
  // Simulate Safari restoring a jumped compositor timeline in the held scene.
  // The same original player handles must be put back before CSS unfreezes.
  h.word.currentTime = 16000;
  h.decor.currentTime = 17000;
  h.api.freezeReadScene(h.scene);
  assert.equal(h.scene.readSceneFrozenAt, frozenAt,
    kind + ": duplicate native/visibility pause must not move the start");
  assert.equal(h.word.currentTime, 240, kind + ": repeat freeze restores frame");
  h.word.currentTime = 18000; // WebKit may drift again before the child's tap.
  h.decor.currentTime = 19000;
  assert.equal(h.tasks.size, 0, kind + ": still frozen before positive readiness");
  const starts = h.scene.wordTracks.map(track => track.startMs);
  const balloonStarts = h.scene.balloonTracks.map(track => track.startMs);
  h.setRecovery(null); // only a successful explicit Let's go reaches thaw
  h.api.thawReadScene(h.scene, 55555); // deliberately WRONG outer-overlay age
  assert(!h.classes.has("read-audio-paused"), kind + ": thaw after acceptance");
  assert.equal(h.word.currentTime, 240, kind + ": same word position");
  assert.equal(h.decor.currentTime, 360, kind + ": same decor frame");
  assert.equal(h.word.playCount, 1);
  assert.equal(h.decor.playCount, 1);
  assert.equal(h.authored.playCount, 0);
  assert.equal(h.finished.playCount, 0);
  assert.equal(h.scene.wordTracks[0].startMs, starts[0] + 12500,
    kind + ": shift wall-clock track only by actual scene freeze duration");
  if (balloonStarts.length)
    assert.equal(h.scene.balloonTracks[0].startMs, balloonStarts[0] + 12500);
  assert.equal(h.tasks.size, 2, kind + ": exactly two timers rearmed");
  h.advance(319);
  assert.equal(narrationStarted, 0);
  h.advance(1);
  assert.equal(narrationStarted, 1, kind + ": narration has 320 active ms left");
  assert.equal(vanished, 0, kind + ": word still here at first resumed narration");
  h.advance(279);
  assert.equal(vanished, 0);
  h.advance(1);
  assert.equal(vanished, 1, kind + ": removal after 600 ACTIVE ms only");
  assert.equal(h.scene.readSceneFrozenAt, null);
  assert.equal(h.scene.pausedAnimations.size, 0,
    kind + ": original timeline handles are not retained indefinitely");

  // A second interruption starts a new checkpoint, not the first one's.
  h.word.currentTime = 405;
  h.decor.currentTime = 530;
  h.setRecovery({kind: "animated", startedAt: h.now()});
  h.api.freezeReadScene(h.scene);
  assert.equal(h.scene.pausedAnimations.get(h.word), 405);
  assert.equal(h.scene.pausedAnimations.get(h.decor), 530);
}

// A scene mounted while the overlay is ALREADY open must not inherit the
// 10-second age of that older overlay when it has only existed for 300ms.
const late = fixture("fish");
late.setRecovery({kind: "animated", startedAt: late.now() - 10000});
late.api.freezeReadScene(late.scene);
late.advance(300);
late.setRecovery(null);
late.api.thawReadScene(late.scene, 10300);
assert.equal(late.scene.wordTracks[0].startMs, 1000);

console.log("R07 Read Balloons/Fish real-source freeze/thaw and timer regression PASS.");
