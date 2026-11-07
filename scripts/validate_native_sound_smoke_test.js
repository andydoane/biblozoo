"use strict";

// PR B: execute the actual browser smoke UI in a deterministic Node VM.
// Static guards also verify Xcode has the Swift source and ONE MP3 resource
// in its App target, not merely in the Capacitor web/public directory.
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
const soundFile = path.join(root, "ui_audio/ui_pet_unlock.mp3");

assert.equal(config.appId, "com.andydoane.biblozoo.audiotest");
assert.ok(fs.existsSync(soundFile) && fs.statSync(soundFile).size > 1000,
  "allowlisted MP3 must exist in source");
assert.equal((pbx.match(/ui_pet_unlock\.mp3 in Resources \*\//g) || []).length, 2,
  "MP3 needs a build file declaration and one Copy Bundle Resources entry");
assert.match(pbx, /path = \.\.\/\.\.\/\.\.\/ui_audio\/ui_pet_unlock\.mp3;/,
  "Xcode resource path must resolve from ios/App/App to the repository MP3");
assert.equal((pbx.match(/BibloZooNativeSoundPlugin\.swift in Sources \*\//g) || []).length, 2,
  "Swift plugin needs one build file and one Sources build-phase entry");
assert.match(scene, /registerPluginInstance\(BibloZooNativeSoundPlugin\(\)\)/);
assert.match(swift, /@objc\(BibloZooNativeSoundPlugin\)/);
assert.match(swift, /jsName\s*=\s*"BibloZooNativeSound"/);
for (const method of ["preload", "play", "stop"]) {
  assert.match(swift, new RegExp('CAPPluginMethod\\(name: "' + method + '"'));
  assert.match(swift, new RegExp('@objc func ' + method + '\\('));
}
assert.match(swift, /Bundle\.main\.url\(forResource: self\.resourceName, withExtension: "mp3"\)/);
assert.match(swift, /\.soloAmbient/);
assert.match(swift, /UIApplication\.willResignActiveNotification/);
assert.match(swift, /AVAudioSession\.interruptionNotification/);
assert.match(swift, /UIApplication\.didBecomeActiveNotification/);
assert.match(swift, /AVAudioSessionInterruptionWasSuspendedKey/);
assert.match(swift, /AVAudioSession\.routeChangeNotification/);

// Regression for the physical-iPhone 'interruption-pending despite audible
// output' report: unknown notifications must not create a pending state;
// suspended notifications are historical; genuine pending interruptions
// remain blocked unless the app left and returned and a human taps again.
// Static Swift checks are NOT a Swift compilation or native runtime test.
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
assert.match(swift, /if interrupted \{[\s\S]*?guard returnedToForegroundDuringInterruption else \{[\s\S]*?return "interruption-pending"[\s\S]*?\}[\s\S]*?lastInterruptionSignal = "foreground-tap-retry"/,
  "never ignore a true interruption without an inactive->active fresh tap");
assert.match(swift, /"lastInterruptionSignal": self\.lastInterruptionSignal/,
  "return bounded developer diagnostic for the previous session signal");
assert.match(swift, /volume\.isFinite/);
assert.match(swift, /invalid-sound-id/);
const withoutComments = swift.replace(/\/\/[^\n]*/g, "");
assert.doesNotMatch(withoutComments, /\.setCategory\s*\(|\.setActive\s*\(|\.setMode\s*\(/,
  "a smoke output plugin must not change the existing AVAudioSession");
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
    async preload(args) { calls.push(["preload", args]); return { prepared: true }; },
    async play(args) { calls.push(["play", args]); return { accepted: true }; },
    async stop(args) { calls.push(["stop", args]); return { stopped: true }; }
  };
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
  const status = panel?.children?.[2];
  return {
    panel, button, status, close, doc, calls, api,
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
    assert.ok(e.panel && e.button && e.status && e.close, "iOS test panel must exist");
    assert.equal(e.calls.length, 0, "native test must not autoplay");
    await e.button.click();
    assert.deepEqual(e.calls.map(x => x[0]), ["preload", "play"]);
    assert.equal(e.calls[0][1].soundId, "pilot-unlock");
    assert.equal(e.calls[1][1].volume, 0.85);
    assert.match(e.status.textContent, /playback requested/i);
    assert.match(e.status.textContent, /did you hear/i);
    assert.doesNotMatch(e.status.textContent, /sound confirmed|successfully heard/i);
  }
  {
    const e = environment({ missing: true });
    await e.button.click();
    assert.match(e.status.textContent, /bridge missing/i);
    assert.equal(e.calls.length, 0);
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
    assert.equal(stops, 1, "background must stop the plugin");
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
      preload: async () => ++preloads === 1
        ? { prepared: false, reason: "interruption-pending" }
        : { prepared: true, lastInterruptionSignal: "foreground-tap-retry" },
      play: async () => { plays++; return { accepted: true }; },
      stop: async () => ({ stopped: true })
    } });
    await e.button.click();
    assert.equal(plays, 0);
    assert.match(e.status.textContent, /no new native sound requested/i);
    assert.match(e.status.textContent, /return to app and tap again/i);
    await e.button.click();
    assert.equal(plays, 1, "fresh tap must prepare again, not replay stale audio");
    assert.match(e.status.textContent, /playback requested/i);
    assert.match(e.status.textContent, /fresh tap after foreground return/i);
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
    assert.equal(stops, 1);
  }
  console.log("Native sound smoke contract passed (Xcode source/resources, interruption states, bridge and UI failure/timeout/lifecycle cases).");
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
