"use strict";
// N5a actual JavaScript controller + source contract tests; NOT an Xcode build
// or evidence that a user heard sound on a physical iPhone.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const moduleJs = read("verse_games/shared/native-ui-audio.js");
const app = read("app.js");
const feedingPilot = read("verse_games/shared/feeding-native-audio-pilot.js");
const feed = read("daily_questions_feed_game.js");
const css = read("daily_questions_feed_game.css");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const html = read("index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");

for (const [id, sample] of [
  ["ui-pop-1", "ui_sound_pop_1"],
  ["ui-pop-2", "ui_sound_pop_2"]
]) {
  assert.ok(fs.existsSync(path.join(__dirname, "..", "ui_audio", sample + ".mp3")));
  assert.ok(swift.includes('"' + id + '": "' + sample + '"'));
  assert.ok(swift.includes('"' + id + '"'));
  assert.ok(project.includes(sample + ".mp3 in Resources"));
}
assert.match(swift, /purpose == "dev" \|\| purpose == "feeding" \|\| purpose == "ui"/);
assert.match(swift, /"feed-star", "feed-chomp",\s+"ui-pop-1", "ui-pop-2"/);
assert.match(swift, /self\.preparePCMEffectOnWorker/);
assert.match(swift, /self\.discardEffectsOnWorker\(\)/);
assert.doesNotMatch(swift, /setCategory\(/);
assert.match(html, /shared\/native-ui-audio\.js/);
assert.ok(html.indexOf("shared/native-ui-audio.js") < html.indexOf('src="app.js"'));
assert.match(feedingPilot, /root\\.BibloZooNativeUiAudio\\?\\.invalidate\\?\\.\\(\\)/);
assert.match(app, /function isNativeUiAudioMode\(/);
assert.match(app, /BibloZooNativeUiAudio\.tapFromGesture\(/);
assert.match(app, /if \(!isNativeUiAudioMode\(\)\) void preloadUiTapSoundBuffers\(\)/);
assert.match(app, /if \(isNativeUiAudioMode\(\)\) return Promise\.resolve\(false\)/);
assert.match(app, /if \(muted\) window\.BibloZooNativeUiAudio\?\.invalidate\?\.\(\{ stop: true \}\)/);
assert.match(feed, /nativeOnlyApp \? ' hidden' : ''/);
assert.match(feed, /Sound isn't ready yet\. Tap Try Again or Back\./);
assert.match(feed, /Getting sounds ready…/);
assert.match(css, /daily-feed-native-pilot-badge\[hidden\]/);
assert.match(css, /daily-feed-native-pilot-phases\[hidden\]/);
assert.match(workflow, /validate_native_ui_audio_n5a\.js/);

function harness({ platform = "ios", nativeOnly = true, activation = null } = {}) {
  const calls = [], listeners = {};
  const document = { hidden: false, addEventListener(name, cb) { listeners[name] = cb; } };
  let clock = 1000;
  let activationImpl = activation || (async () => ({ ready: true }));
  const api = {
    activateFromGesture(args) {
      calls.push(["activate", args.purpose]);
      return activationImpl(args);
    },
    async preload(args) { calls.push(["preload", args.soundId]); return { prepared: true }; },
    async play(args) { calls.push(["play", args]); return { accepted: true }; },
    async stop(args) { calls.push(["stop", args.soundId]); return { stopped: true }; },
    addListener(name, cb) { listeners.native = cb; return Promise.resolve({ remove() {} }); }
  };
  const window = {
    document,
    performance: { now: () => clock },
    Capacitor: { isNativePlatform: () => platform !== "web",
      getPlatform: () => platform, Plugins: { BibloZooNativeSound: api } },
    BibloZooNativeOnlyOutput: { enabled: nativeOnly },
    addEventListener(name, cb) { listeners[name] = cb; }
  };
  const context = { window, document, Promise, Date, console };
  vm.runInNewContext(moduleJs, context, { filename: "native-ui-audio.js" });
  return { api, calls, window, listeners, document,
    setTime(t) { clock = t; },
    setActivation(fn) { activationImpl = fn; },
    taps() { return calls.filter(x => x[0] === "play").map(x => x[1]); }
  };
}

const tick = async () => {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
};
async function main() {
  {
    const h = harness();
    let valid = true;
    const current = () => valid;
    assert.equal(h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: current }), true);
    await tick();
    assert.deepEqual(h.calls.slice(0, 3).map(x => x.slice(0, 2)), [
      ["activate", "ui"], ["preload", "ui-pop-1"], ["preload", "ui-pop-2"]
    ]);
    assert.deepEqual(h.taps().map(x => x.soundId), ["ui-pop-1"]);
    assert.equal(h.taps()[0].volume, 0.12);
    h.setTime(1100);
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: current });
    await tick();
    assert.deepEqual(h.taps().map(x => x.soundId), ["ui-pop-1", "ui-pop-2"]);
    assert.equal(h.calls.filter(x => x[0] === "activate").length, 1);
    h.setTime(1110);
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: current });
    assert.equal(h.taps().length, 2, "rapid pointer/touch duplicate suppressed");
    h.window.BibloZooNativeUiAudio.invalidate({ stop: true });
    await tick();
    assert.deepEqual(h.calls.filter(x => x[0] === "stop").map(x => x[1]),
      ["ui-pop-1", "ui-pop-2"]);
    h.setTime(1210);
    valid = false;
    assert.equal(h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: current }), false);
    assert.equal(h.taps().length, 2);
    valid = true;
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: current });
    await tick();
    assert.equal(h.calls.filter(x => x[0] === "activate").length, 2);
    assert.equal(h.taps().length, 3);
    assert.ok(h.taps().every(x => x.eventId.startsWith("ui-")));
    assert.ok(h.taps().every(x => !("path" in x) && !("midi" in x) && !("noteIndex" in x)));
  }
  {
    const h = harness();
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: () => true });
    await tick();
    h.listeners.native({ active: false }); // App Switcher while WebKit stays visible
    h.setTime(1500);
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: () => true });
    await tick();
    assert.equal(h.calls.filter(x => x[0] === "activate").length, 2);
    h.document.hidden = true;
    h.listeners.visibilitychange();
    h.setTime(1600);
    assert.equal(h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: () => true }), false);
    assert.equal(h.taps().length, 2);
  }
  {
    let resolveActivation;
    const h = harness({ activation: () => new Promise(r => { resolveActivation = r; }) });
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: () => true });
    h.window.BibloZooNativeUiAudio.invalidate();
    resolveActivation({ ready: true });
    await tick();
    assert.equal(h.calls.filter(x => x[0] === "preload").length, 0);
    assert.equal(h.taps().length, 0, "old gesture cannot produce a ghost tap");
    h.setActivation(async () => ({ ready: false }));
    h.setTime(2000);
    h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: () => true });
    await tick();
    assert.equal(h.taps().length, 0, "failed activation stays silent without Web rescue");
  }
  {
    const h = harness({ platform: "web", nativeOnly: false });
    assert.equal(h.window.BibloZooNativeUiAudio.isAvailable(), false);
    assert.equal(h.window.BibloZooNativeUiAudio.tapFromGesture({ isCurrent: () => true }), false);
    assert.equal(h.calls.length, 0);
  }
  console.log("N5a native UI pop gesture, sample allowlist, mute/interrupt, stale callback, quiet Feeding popup and Web isolation checks passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
