"use strict";
// Patch 20E retirement contract: Patch 20C/20D's native player is removed.
// This check is retained so previous validation commands remain usable.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(base, "read_my_verse.js"), "utf8");
const swift = fs.readFileSync(path.join(base, "ios/App/App/SceneDelegate.swift"), "utf8");
assert.doesNotMatch(src, /createNativeCrawlMusic|readCrawlNativeUnavailable|readCrawlPreferNativeAudio/);
assert.doesNotMatch(swift, /BibloZooCrawlMusicPlugin|AVAudioPlayer/);
assert.match(src, /createMediaElementSource\(audio\)/);
assert.match(src, /gain\.connect\(context\.destination\)/);
assert.match(src, /restartInterruptedCrawlFromGesture/);
assert.match(src, /fadeCrawlMusic\(CRAWL_UNDERSCORE_VOLUME, CRAWL_DUCK_FADE_MS\)/);
console.log("Patch 20C native player retired: original Crawl fades and restart retained (6 checks).");
