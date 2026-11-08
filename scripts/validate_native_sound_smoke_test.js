"use strict";

// PR B: execute the actual browser smoke UI in a deterministic Node VM.
// Static guards verify Xcode includes the Swift source and the three
// allowlisted MP3 resources in its App target, not just the copied web bundle.
// This does NOT compile Swift or confirm that an iPhone produced sound.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const js = read("verse_games/shared/native-sound-smoke-test.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const scene = read("ios/App/App/SceneDelegate.swift");
const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
const index = read("index.html");
const config = JSON.parse(read("capacitor.config.json"));
assert.equal(config.appId, "com.andydoane.biblozoo.audiotest");
const sounds = [
  ["pilot-unlock", "ui_audio/ui_pet_unlock.mp3", "ui_pet_unlock"],
  ["feed-star", "verse_images/daily_questions/dq_feed_star.mp3", "dq_feed_star"],
  ["feed-chomp", "verse_images/daily_questions/dq_feed_chomp.mp3", "dq_feed_chomp"]
];
for (const [id, source, name] of sounds) {
  assert.ok(fs.existsSync(path.join(root, source)) &&
    fs.statSync(path.join(root, source)).size > 1000,
    id + ": sample must exist in source");
  assert.equal((pbx.match(new RegExp(name + '\\.mp3 in Resources \\*\\/', 'g')) || []).length, 2,
    id + ": expected one build-file and one Copy Bundle Resources entry");
  assert.match(pbx, new RegExp('path = \\.\\./\\.\\./\\.\\./' +
    source.replaceAll('.', '\\.') + ';'),
    id + ": source path must resolve relative to Xcode App group");
  assert.match(swift, new RegExp('"' + id + '": "' + name + '"'),
    id + ": bridge mapping must use matching explicitly packaged sample");
}
assert.match(swift, /private var players: \[String: AVAudioPlayer\] = \[:\]/);
assert.match(swift, /self\.players\[soundId\] = player/);
assert.match(swift, /self\.players\[soundId\]/);
assert.match(swift, /self\.players\.removeValue\(forKey: soundId\)\?\.stop\(\)/);
assert.doesNotMatch(swift, /private var player: AVAudioPlayer\?/,
  "a single shared prepared player would evict the other Feeding sound");
assert.equal((pbx.match(/BibloZooNativeSoundPlugin\.swift in Sources \*\//g) || []).length, 2,
  "Swift plugin needs one build file and one Sources build-phase entry");
assert.match(scene, /registerPluginInstance\(BibloZooNativeSoundPlugin\(\)\)/);
assert.match(swift, /@objc\(BibloZooNativeSoundPlugin\)/);
assert.match(swift, /jsName\s*=\s*"BibloZooNativeSound"/);
for (const method of ["preload", "play", "stop", "getDebugState",
  "activateFromGesture", "copyTimingReport", "markRecentChompLate"]) {
  assert.match(swift, new RegExp('CAPPluginMethod\\(name: "' + method + '"'));
  assert.match(swift, new RegExp('@objc func ' + method + '\\('));
}
assert.match(swift, /Bundle\.main\.url\(\s*forResource: resourceName, withExtension: "mp3"\)/);
assert.match(swift, /\.soloAmbient/);
assert.match(swift, /UIApplication\.willResignActiveNotification/);
assert.match(swift, /AVAudioSession\.interruptionNotification/);
const debugSwift = swift.slice(swift.indexOf("    @objc func getDebugState("),
  swift.indexOf("    @objc func preload("));
assert.match(debugSwift, /lastInterruptionSignal/);
assert.match(debugSwift, /beganEventCount/);
assert.match(debugSwift, /endedEventCount/);
assert.match(debugSwift, /suspendedEventCount/);
assert.match(debugSwift, /lastInterruptionReasonCode/);
assert.doesNotMatch(debugSwift, /\.play\(|\.prepareToPlay\(|\.setActive\(|\.setCategory\(|\.setMode\(/,
  "native diagnostics must never play audio or activate/change the session");
assert.match(swift, /AVAudioSessionInterruptionReasonKey/);
assert.match(swift, /interruptionEventCount \+= 1/);
assert.match(swift, /suspendedEventCount \+= 1/);
const appCode = read("app.js");
assert.match(appCode, /eventTarget\.closest\("\[data-no-ui-sound\]"\)/,
  "global UI tap handler must honor experimental no-pop marker");
assert.match(js, /panel\.setAttribute\("data-no-ui-sound", ""\)/,
  "developer panel must suppress the global web audio pop");
assert.match(swift, /UIApplication\.didBecomeActiveNotification/);
assert.match(swift, /AVAudioSessionInterruptionWasSuspendedKey/);
assert.match(swift, /AVAudioSession\.routeChangeNotification/);

// Regression for physical-iPhone interruption reports: unrecognized and
// wasSuspended events must not create a new pending state. The old N2 guard
// waited for an inactive->active transition; N6h.2 deliberately changes
// this: an explicit foreground human tap may ask iOS to reclaim soloAmbient
// priority even while YouTube PiP remains playing. ONLY that gesture can
// activate; notification/foreground/normal hot sound cannot do so.
// Static Swift checks are NOT Swift compilation or real iPhone sound proof.
const handle = swift.slice(
  swift.indexOf("    private func handleInterruption("),
  swift.indexOf("    private func onMain(")
);
assert.ok(handle.startsWith("    private func handleInterruption("),
  "missing native interruption state reducer");
assert.match(handle, /guard let raw[\s\S]*?lastInterruptionSignal = "unrecognized"[\s\S]*?return/);
assert.match(handle, /case \.began:[\s\S]*?if wasSuspended \{[\s\S]*?lastInterruptionSignal = "suspended-began"[\s\S]*?return[\s\S]*?\}[\s\S]*?interrupted = true/,
  "suspended notifications must be ignored before the genuine-began latch");
assert.match(handle, /case \.ended:[\s\S]*?interrupted = false/);
assert.doesNotMatch(handle, /interrupted\s*=\s*kind\s*!=/,
  "unknown notification type previously left the interruption stuck");
assert.match(swift, /private func returnedToForeground\(\)[\s\S]*?returnedToForegroundDuringInterruption = true/);
// N2: foreground notification alone must never clear a pending interruption.
const unavailable = swift.slice(swift.indexOf("    private func unavailableReason("),
  swift.indexOf("    // The ONLY native audio-session activation entrypoint"));
assert.match(unavailable, /if interrupted \{ return "interruption-pending" \}/);
assert.doesNotMatch(unavailable, /interrupted\s*=\s*false/,
  "no implicit latch clearing from preload or foreground");
const gesture = swift.slice(swift.indexOf("    @objc func activateFromGesture("),
  swift.indexOf("    private func requestedId("));
assert.ok(gesture.startsWith("    @objc func activateFromGesture("));
assert.match(gesture, /blocked != "other-audio-playing"/,
  "the child's true activation may request competing PiP priority");
assert.match(gesture, /AVAudioSession\.sharedInstance\(\)\.isOtherAudioPlaying/);
assert.doesNotMatch(gesture, /guard !self\.interrupted \|\| self\.returnedToForegroundDuringInterruption/,
  "a genuinely tapped return must not be permanently blocked by PiP");
assert.doesNotMatch(handle, /try AVAudioSession\.sharedInstance\(\)\.setActive\(true\)/,
  "the OS interruption handler itself must never activate");
assert.match(gesture, /guard self\.activationAttemptsThisForeground/);
assert.match(gesture, /self\.minimumActivationInterval/);
assert.match(gesture, /try AVAudioSession\.sharedInstance\(\)\.setActive\(true\)/);
assert.match(gesture, /self\.interrupted = false/);
assert.match(gesture, /catch let error as NSError/);
assert.match(gesture, /"ready": false/);
assert.match(scene, /Bundle\.main\.bundleIdentifier == "com\.andydoane\.biblozoo\.audiotest"/);
assert.match(scene, /"legacy-web-recovery-disabled"/);
assert.match(swift, /private let maxTraceEvents = 28/);
assert.match(swift, /"recentEvents": self\.eventTrace/);
assert.match(swift, /mediaServicesWereResetNotification/);
assert.match(swift, /needsGestureAfterReset = true/);
// N2.1: AVAudioPlayer decode/replay must not block JavaScript frame drawing.
// Static source policy is not proof of a zero-hitch iPhone experience.
assert.match(swift, /private let playbackQueue = DispatchQueue\(/);
assert.match(swift, /private let playbackEpochLock = NSLock\(\)/);
assert.match(swift, /playbackEpoch \&\+= 1/);
assert.match(swift, /"lastNativePlayQueueMs": self\.lastNativePlayQueueMs/);
assert.match(swift, /"lastNativePlayCallMs": self\.lastNativePlayCallMs/);
const nativePreload = swift.slice(swift.indexOf("    @objc func preload("),
  swift.indexOf("    @objc func play("));
const nativePlay = swift.slice(swift.indexOf("    @objc func play("),
  swift.indexOf("    @objc func stop("));
for (const [name, section, op] of [
  ["preload", nativePreload, "prepareToPlay"],
  ["play", nativePlay, "sound.play"]
]) {
  assert.match(section, /self\.playbackQueue\.async/, name + " queues native player work");
  assert.match(section, /self\.isCurrentPlaybackEpoch\(epoch\)/,
    name + " rejects old lifecycle work");
  const start = section.indexOf("self.playbackQueue.async");
  assert.ok(section.indexOf(op, start) > start,
    name + " executes the expensive AVAudioPlayer operation only on the worker");
}
assert.doesNotMatch(nativePlay, /if sound\.isPlaying \{ sound\.stop\(\) \}/,
  "rapid replay must not discard the prepared player");
assert.match(nativePlay, /"queueMs": queueMs/);
assert.match(nativePlay, /"playCallMs": playCallMs/);
assert.match(js, /" prepMs=" \+ count\(state\.lastNativePrepareMs\)/);
assert.match(js, /" queueMs=" \+ count\(state\.lastNativePlayQueueMs\)/);
assert.match(js, /" playMs=" \+ count\(state\.lastNativePlayCallMs\)/);
assert.match(swift, /private let maxSoundTimingEvents = 80/);
assert.match(swift, /UIPasteboard\.general\.string = self\.timingReportText\(\)/);
assert.match(swift, /recordSoundTiming\(\[/);
assert.match(js, /Copy Audio Timing Report/);
assert.match(js, /Mark last chomp late/);
assert.match(swift, /"lastInterruptionSignal": self\.lastInterruptionSignal/,
  "return bounded developer diagnostic for the previous session signal");
assert.match(swift, /volume\.isFinite/);
assert.match(swift, /invalid-sound-id/);
const withoutComments = swift.replace(/\/\/[^\n]*/g, "");
assert.doesNotMatch(withoutComments, /\.setCategory\s*\(|\.setMode\s*\(|\.setActive\(false\)/,
  "native-output session owner must not change category/mode or deactivate");
assert.equal((withoutComments.match(/\.setActive\(true\)/g) || []).length, 1,
  "only one user-tapped native session activation operation");
assert.match(index, /<script src="verse_games\/shared\/native-sound-smoke-test\.js"><\/script>/);
assert.match(read("scripts/build.js"), /"verse_games"/);

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function environment(options = {}) {
  const idMap = new Map();
  const listeners = {};
  const timed = new Map();
  let nextTimer = 0;
  function makeNode(tag) {
    const events = {};
    const node = {
      tag, children: [], parent: null, attributes: {}, style: {}, textContent: "",
      disabled: false, id: "", type: "",
      setAttribute(k, v) { this.attributes[k] = v; },
      appendChild(child) {
        child.parent = this; this.children.push(child);
        if (child.id) idMap.set(child.id, child);
        return child;
      },
      addEventListener(event, cb) { events[event] = cb; },
      remove() {
        if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this);
        if (this.id) idMap.delete(this.id);
      },
      async click() { return events.click?.(); }
    };
    return node;
  }
  const body = makeNode("body");
  const doc = {
    body, hidden: false, readyState: "complete",
    createElement: makeNode,
    getElementById(id) { return idMap.get(id) || null; },
    addEventListener(name, cb) { (listeners[name] ||= new Set()).add(cb); },
    removeEventListener(name, cb) { listeners[name]?.delete(cb); },
    emit(name) { for (const cb of listeners[name] || []) cb(); }
  };
  const calls = [];
  const api = options.api || {
    async activateFromGesture(args) {
      calls.push(["activateFromGesture", args]);
      return { ready: true, attempted: false, reason: "not-needed" };
    },
    async preload(args) { calls.push(["preload", args]); return { prepared: true }; },
    async play(args) { calls.push(["play", args]); return { accepted: true }; },
    async stop(args) { calls.push(["stop", args]); return { stopped: true }; },
    async copyTimingReport() {
      calls.push(["copyTimingReport"]);
      return { copied: true, count: 24, lateChompMarks: 1 };
    },
    async markRecentChompLate() {
      calls.push(["markRecentChompLate"]);
      return { marked: true, seq: 17 };
    },
    async getDebugState() {
      calls.push(["getDebugState"]);
      return {
        available: true, appState: "active", pending: true, lastSignal: "began",
        eventCount: 1, beganCount: 1, endedCount: 0, suspendedCount: 0,
        routeCount: 0, lastReasonCode: 1, lastAgeMs: 213,
        foregroundEpoch: 2, mediaResetCount: 0, activationAttemptsTotal: 1,
        lastActivationResult: "os-accepted",
        recentEvents: [
          { seq: 3, kind: "interruption-began", elapsedMs: 20 },
          { seq: 4, kind: "activation-os-accepted", elapsedMs: 50 }
        ]
      };
    }
  };
  // Existing mock scenarios now follow the explicit Swift gesture protocol.
  if (options.api && !options.missing && !("activateFromGesture" in api)) {
    api.activateFromGesture = async (args) => {
      calls.push(["activateFromGesture", args]);
      return { ready: true, attempted: false, reason: "not-needed" };
    };
  }
  const cap = options.platform === "web"
    ? { isNativePlatform: () => false, getPlatform: () => "web", Plugins: { BibloZooNativeSound: api } }
    : { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: options.missing ? {} : { BibloZooNativeSound: api } };
  const win = {
    document: doc, Capacitor: cap,
    addEventListener() {},
    setTimeout(cb, ms) { const id = ++nextTimer; timed.set(id, { cb, ms }); return id; },
    clearTimeout(id) { timed.delete(id); }
  };
  vm.runInNewContext(js, { window: win, Promise, Error }, {
    filename: "verse_games/shared/native-sound-smoke-test.js"
  });
  const panel = doc.getElementById("biblozoo-native-sound-smoke");
  const top = panel?.children?.[0];
  const close = top?.children?.[1];
  const button = panel?.children?.[1];
  const sampleRow = panel?.children?.[2];
  const playStar = sampleRow?.children?.[0];
  const playChomp = sampleRow?.children?.[1];
  const playMelody = sampleRow?.children?.[2];
  const status = panel?.children?.[3];
  const inspect = panel?.children?.[4];
  const detail = panel?.children?.[5];
  return {
    panel, button, playStar, playChomp, playMelody, status, inspect, detail, close, doc, calls, api,
    copyTiming: panel?.children?.[6]?.children?.[2],
    markLate: panel?.children?.[6]?.children?.[3],
    reportStatus: panel?.children?.[6]?.children?.[4],
    fireTimers(ms) {
      for (const [id, task] of [...timed]) {
        if (task.ms <= ms) { timed.delete(id); task.cb(); }
      }
    }
  };
}

async function run() {
  {
    const e = environment({ platform: "web" });
    assert.equal(e.panel, null, "web/PWA must not see native test UI");
    assert.equal(e.calls.length, 0, "no sounds may play on load");
  }
  {
    const e = environment();
    assert.ok(e.panel && e.button && e.playStar && e.playChomp &&
      e.playMelody &&
      e.status && e.close && e.inspect && e.detail,
      "iOS test panel, star/chomp buttons and read-only inspector must exist");
    assert.equal(e.panel.attributes["data-no-ui-sound"], "",
      "Web Audio pop must be excluded for the entire test panel");
    assert.equal(e.calls.length, 0, "native test must not autoplay");
    await e.button.click();
    assert.deepEqual(e.calls.map(x => x[0]), ["activateFromGesture", "preload", "play"]);
    assert.equal(e.calls[0][1].purpose, "dev");
    assert.equal(e.calls[1][1].soundId, "pilot-unlock");
    assert.equal(e.calls[2][1].volume, 0.85);
    assert.match(e.status.textContent, /playback requested/i);
    assert.match(e.status.textContent, /did you hear/i);
    assert.doesNotMatch(e.status.textContent, /sound confirmed|successfully heard/i);
    await e.inspect.click();
    // The inspector handler is intentionally detached from audio playback.
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(e.calls.map(x => x[0]),
      ["activateFromGesture", "preload", "play", "getDebugState"]);
    assert.match(e.detail.textContent, /pending=YES/);
    assert.match(e.detail.textContent, /began=1 ended=0 suspended=0/);
    assert.match(e.detail.textContent, /reasonCode=1/);
    assert.match(e.detail.textContent, /ageMs=213/);
    assert.match(e.detail.textContent, /foregroundEpoch=2/);
    assert.match(e.detail.textContent, /activation=os-accepted/);
    assert.match(e.detail.textContent, /trace=#3:interruption-began@20ms/);
    // Independent, explicit tap-only samples: no Feeding event or WebAudio pop.
    await e.playStar.click();
    await e.playChomp.click();
    assert.deepEqual(e.calls.map(x => x[0]),
      ["activateFromGesture", "preload", "play", "getDebugState",
       "activateFromGesture", "preload", "play",
       "activateFromGesture", "preload", "play"]);
    assert.equal(e.calls[4][1].purpose, "dev");
    assert.equal(e.calls[5][1].soundId, "feed-star");
    assert.equal(e.calls[8][1].soundId, "feed-chomp");
    assert.match(e.status.textContent, /native chomp playback requested/i);
    // N3d is one explicitly tapped MIDI E4 note, not a Melody song/gameplay.
    await e.playMelody.click();
    assert.equal(e.calls[10][0], "activateFromGesture");
    assert.equal(e.calls[11][0], "preload");
    assert.equal(e.calls[11][1].soundId, "feed-melody");
    assert.equal(e.calls[12][1].soundId, "feed-melody");
    assert.equal(e.calls[12][1].volume, 0.25);
    assert.equal(e.calls[12][1].midi, 64);
    assert.match(e.status.textContent, /native Melody E4 playback requested/i);
    assert.equal(e.panel.attributes["data-no-ui-sound"], "");
    assert.equal(e.copyTiming.textContent, "Copy Audio Timing Report");
    await e.copyTiming.click();
    assert.match(e.reportStatus.textContent, /Copied 24 sounds/i);
    await e.markLate.click();
    assert.match(e.reportStatus.textContent, /flagged late/i);
    assert.deepEqual(e.calls.slice(-2).map(x => x[0]),
      ["copyTimingReport", "markRecentChompLate"]);
    assert.equal(e.panel.attributes["data-no-ui-sound"], "",
      "DEV diagnostic taps cannot produce Web UI click sounds");
  }
  {
    const e = environment({ missing: true });
    await e.button.click();
    assert.match(e.status.textContent, /bridge missing/i);
    assert.equal(e.calls.length, 0);
    await e.inspect.click();
    assert.match(e.detail.textContent, /bridge unavailable/i);
  }
  {
    let played = 0;
    const e = environment({ api: {
      preload: async () => ({ prepared: false, reason: "bundled-asset-missing" }),
      play: async () => { played++; return { accepted: true }; },
      stop: async () => ({ stopped: true })
    } });
    await e.button.click();
    assert.equal(played, 0, "must not play after preload failure");
    assert.match(e.status.textContent, /bundled-asset-missing/);
  }
  {
    const pre = deferred();
    let playCount = 0;
    const e = environment({ api: {
      preload: () => pre.promise,
      play: async () => { playCount++; return { accepted: true }; },
      stop: async () => ({ stopped: true })
    } });
    const first = e.button.click();
    await e.button.click();
    assert.equal(playCount, 0, "no play before preload");
    assert.equal(e.button.disabled, true, "prevent overlapping taps");
    assert.equal(e.playStar.disabled, true);
    assert.equal(e.playChomp.disabled, true);
    assert.equal(e.playMelody.disabled, true);
    pre.resolve({ prepared: true });
    await first;
    assert.equal(playCount, 1);
    assert.equal(e.button.disabled, false);
  }
  {
    const pre = deferred();
    let playCount = 0;
    let stops = 0;
    const e = environment({ api: {
      preload: () => pre.promise,
      play: async () => { playCount++; return { accepted: true }; },
      stop: async () => { stops++; return { stopped: true }; }
    } });
    const first = e.button.click();
    e.doc.hidden = true;
    e.doc.emit("visibilitychange");
    pre.resolve({ prepared: true });
    await first;
    assert.equal(playCount, 0, "backgrounded preload must never play later");
    assert.equal(stops, 4, "background must stop every allowlisted sample");
    assert.match(e.status.textContent, /stopped on background/i);
  }
  {
    const pre = deferred();
    const e = environment({ api: {
      preload: () => pre.promise,
      play: async () => ({ accepted: true }),
      stop: async () => ({ stopped: true })
    } });
    const first = e.button.click();
    e.fireTimers(2500);
    await first;
    assert.match(e.status.textContent, /timeout/i, "stalled bridge must fail boundedly");
    assert.equal(e.button.disabled, false);
  }
  {
    // A pending message is a BLOCKED prepare. This tap cannot have
    // produced the sound, even if a prior web/native sound is still audible.
    let plays = 0;
    let preloads = 0;
    const e = environment({ api: {
      activateFromGesture: async () => ++preloads === 1
        ? { ready: false, reason: "interruption-pending" }
        : { ready: true, reason: "os-accepted" },
      preload: async () => ({ prepared: true, lastInterruptionSignal: "foreground-activation-accepted" }),
      play: async () => { plays++; return { accepted: true }; },
      stop: async () => ({ stopped: true })
    } });
    await e.button.click();
    assert.equal(plays, 0);
    assert.match(e.status.textContent, /native session not ready/i);
    assert.match(e.status.textContent, /interruption-pending/i);
    await e.button.click();
    assert.equal(plays, 1, "fresh tap must prepare again, not replay stale audio");
    assert.match(e.status.textContent, /playback requested/i);
    assert.match(e.status.textContent, /OS accepted native activation after foreground return/i);
    assert.doesNotMatch(e.status.textContent, /interruption pending/i,
      "do not preserve a stale interruption error after a successful new request");
  }
  {
    // A delayed suspended notification was already handled in Swift; it
    // doesn't prove audible output and should be identified as historical.
    const e = environment({ api: {
      preload: async () => ({ prepared: true, lastInterruptionSignal: "suspended-began" }),
      play: async () => ({ accepted: true }),
      stop: async () => ({ stopped: true })
    } });
    await e.button.click();
    assert.match(e.status.textContent, /past suspension/i);
    assert.match(e.status.textContent, /did you hear/i);
  }
  {
    let stops = 0;
    const e = environment({ api: {
      preload: async () => ({ prepared: true }),
      play: async () => ({ accepted: true }),
      stop: async () => { stops++; return { stopped: true }; }
    } });
    await e.close.click();
    assert.equal(e.doc.getElementById("biblozoo-native-sound-smoke"), null);
    assert.equal(stops, 4);
  }
  console.log("Native sound smoke contract passed (three Xcode samples, independent native players, tap-only UI, interruption/timeout/lifecycle cases).");
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
