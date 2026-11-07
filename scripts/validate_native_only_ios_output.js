/* N1 — iOS-native-only playback isolation contract.
 * npm ci && node scripts/validate_native_only_ios_output.js
 * After npm run build, run again to inspect every generated HTML entrypoint.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const guard = read("verse_games/shared/native-only-ios-output.js");
const build = read("scripts/build.js");
const config = JSON.parse(read("capacitor.config.json"));

function environment(kind) {
  let originalPlays = 0;
  let videoPlays = 0;
  let onDOMReady;
  let observer;
  let stopped = false;

  class Media {
    constructor(tagName = "AUDIO") {
      this.nodeType = 1;
      this.tagName = tagName;
      this.autoplay = false;
      this.muted = false;
      this.defaultMuted = false;
      this.pauses = 0;
      this.attributes = new Set();
    }
    play() { originalPlays += 1; return Promise.resolve("html-played"); }
    pause() { this.pauses += 1; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
  }
  class Video extends Media {
    constructor() { super("VIDEO"); }
    play() { videoPlays += 1; return Promise.resolve("video"); }
  }
  const scriptedAudio = new Media();
  const scriptedVideo = new Video();
  const html = {
    nodeType: 1, tagName: "HTML",
    querySelectorAll: () => [scriptedAudio, scriptedVideo]
  };
  const document = {
    readyState: "loading", documentElement: html,
    addEventListener(type, cb) { if (type === "DOMContentLoaded") onDOMReady = cb; }
  };
  const input = () => Promise.resolve("stream");
  const mediaRecorder = function MediaRecorder() {};
  const nativePlay = () => Promise.resolve({ accepted: true });
  const nativePlugin = { play: nativePlay };
  const context = function RealAudioContext() {};
  const webkitContext = function RealWebkitAudioContext() {};
  const capacitor = kind === "scheme" ? undefined : {
    isNativePlatform: () => kind === "ios" || kind === "android",
    getPlatform: () => kind === "ios" ? "ios" : kind === "android" ? "android" : "web",
    Plugins: { BibloZooNativeSound: nativePlugin }
  };
  const window = {
    Capacitor: capacitor,
    location: { protocol: kind === "scheme" ? "capacitor:" : "https:" },
    AudioContext: context,
    webkitAudioContext: webkitContext,
    HTMLMediaElement: Media,
    HTMLVideoElement: Video,
    document,
    navigator: { mediaDevices: { getUserMedia: input } },
    MediaRecorder: mediaRecorder,
    MutationObserver: class MutationObserver {
      constructor(cb) { this.callback = cb; observer = this; }
      observe(target, options) { this.target = target; this.options = options; }
    },
    stop() { stopped = true; }
  };
  vm.runInNewContext(guard, { window, Promise, Error, Object }, { filename: "native-only-ios-output.js" });
  return {
    window, Media, Video, context, webkitContext, nativePlay, nativePlugin, input,
    mediaRecorder, scriptedAudio, scriptedVideo, document, html,
    domReady: () => onDOMReady?.(),
    observer: () => observer,
    originalPlays: () => originalPlays,
    videoPlays: () => videoPlays,
    stopped: () => stopped
  };
}

async function main() {
  assert.equal(config.appId, "com.andydoane.biblozoo.audiotest");
  assert.match(build, /NATIVE_AUDIO_TEST_ID/);
  assert.match(build, /NATIVE_ONLY_GATE_PATH/);
  assert.match(build, /injectNativeOnlyAudioGuard\(\)/);
  assert.match(build, /path\.relative\(path\.dirname\(filePath\), scriptFile\)/);
  assert.match(build, /<head/);
  assert.match(guard, /HTMLMediaElement/);
  assert.doesNotMatch(guard, /\.setActive\s*\(|\.setCategory\s*\(|\.getUserMedia\s*\(/);

  for (const kind of ["web", "android"]) {
    const e = environment(kind);
    assert.equal(e.window.BibloZooNativeOnlyOutput, undefined, kind);
    assert.equal(e.window.AudioContext, e.context, kind);
    assert.equal(e.window.webkitAudioContext, e.webkitContext, kind);
    assert.equal(await new e.Media().play(), "html-played", kind);
    assert.equal(e.window.navigator.mediaDevices.getUserMedia, e.input, kind);
  }

  for (const kind of ["ios", "scheme"]) {
    const e = environment(kind);
    const gate = e.window.BibloZooNativeOnlyOutput;
    assert.equal(gate.enabled, true, kind);
    assert.equal(e.window.AudioContext, undefined, kind);
    assert.equal(e.window.webkitAudioContext, undefined, kind);
    const before = e.originalPlays();
    const audio = new e.Media();
    await assert.rejects(audio.play(), /WebKit media sound is disabled/);
    assert.equal(e.originalPlays(), before, kind);
    const video = new e.Video();
    assert.equal(await video.play(), "video");
    assert.equal(video.muted, true, kind);
    assert.equal(e.window.navigator.mediaDevices.getUserMedia, e.input, kind);
    assert.equal(e.window.MediaRecorder, e.mediaRecorder, kind);
    assert.equal(e.window.Capacitor?.Plugins?.BibloZooNativeSound?.play, e.nativePlay);
    const state = gate.status();
    assert.equal(state.blockedMediaPlays, 1);
    assert.equal(state.mutedVideoPlays, 1);
    assert.equal(e.stopped(), false);

    e.scriptedAudio.autoplay = true;
    e.scriptedAudio.attributes.add("autoplay");
    e.domReady();
    assert.equal(e.scriptedAudio.autoplay, false, kind);
    assert.equal(e.scriptedAudio.attributes.has("autoplay"), false, kind);
    assert.equal(e.scriptedVideo.muted, true, kind);
    assert.ok(e.observer(), kind);
    const inserted = new e.Media();
    inserted.autoplay = true;
    inserted.attributes.add("autoplay");
    e.observer().callback([{ type: "childList", addedNodes: [inserted] }]);
    assert.equal(inserted.autoplay, false);
    assert.equal(inserted.attributes.has("autoplay"), false);
    assert.equal(e.observer().options.subtree, true);
  }

  // Confirm a guarded built entrypoint exists for EVERY shipped HTML page.
  // When dist/ is absent (Node regression job) this assertion runs in the
  // production-web-build job immediately after npm run build.
  const dist = path.join(ROOT, "dist");
  if (fs.existsSync(dist)) {
    const scriptPath = path.join(dist, "verse_games/shared/native-only-ios-output.js");
    assert.ok(fs.existsSync(scriptPath), "guard must be bundled");
    const htmlFiles = [];
    function visit(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (entry.isFile() && /\.html$/i.test(entry.name)) htmlFiles.push(file);
      }
    }
    visit(dist);
    assert.ok(htmlFiles.length >= 25, "unexpectedly missing packaged HTML");
    for (const file of htmlFiles) {
      const htmlText = fs.readFileSync(file, "utf8");
      const scripts = [...htmlText.matchAll(/<script\b[^>]*>/gi)];
      assert.ok(scripts.length, "no scripts in " + file);
      const first = scripts[0][0];
      assert.match(first, /data-biblozoo-native-only-output/, "guard not first in " + file);
      const src = first.match(/\bsrc="([^"]+)"/)?.[1];
      assert.ok(src, "missing guard src in " + file);
      assert.equal(path.resolve(path.dirname(file), src), scriptPath,
        "wrong relative guard path in " + file);
    }
    console.log("N1 validated " + htmlFiles.length + " packaged HTML entrypoints.");
  }

  const smoke = read("verse_games/shared/native-sound-smoke-test.js");
  const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
  assert.match(smoke, /data-no-ui-sound/);
  assert.match(smoke, /api\.preload\(/);
  assert.match(smoke, /api\.play\(/);
  assert.match(swift, /AVAudioPlayer\(/);
  assert.match(swift, /jsName\s*=\s*"BibloZooNativeSound"/);
  console.log("N1 native-only iOS output isolation contract passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
