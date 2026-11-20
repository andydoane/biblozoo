"use strict";

// Production app identity and native audio routing source-level guard.
// This is intentionally not a native Xcode signing/build test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const config = JSON.parse(read("capacitor.config.json"));
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const plist = read("ios/App/App/Info.plist");

const testId = "com.andydoane.biblozoo.audiotest";
const originalId = "com.andydoane.biblozoo";

assert.equal(config.appId, originalId, "Capacitor must retain the original BibloZoo ID");
assert.equal(config.appName, "BibloZoo", "Capacitor must label the production app");
assert.equal(config.webDir, "dist", "keep existing Capacitor web bundle location");

const matches = [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g)]
  .map((match) => match[1].trim());
assert.equal(matches.length, 2, "expected Xcode Debug and Release bundle identifiers");
assert.ok(matches.every((id) => id === originalId), "both Xcode build configurations need original ID");
assert.ok(!matches.includes(testId), "production Xcode must not use the separate test ID");

assert.match(
  plist,
  /<key>CFBundleDisplayName<\/key>\s*<string>BibloZoo<\/string>/,
  "the iPhone home-screen label must identify production BibloZoo"
);
assert.match(
  plist,
  /<key>CFBundleIdentifier<\/key>\s*<string>\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>/,
  "Info.plist should still inherit the Xcode target bundle ID"
);
assert.match(plist, /<key>NSMicrophoneUsageDescription<\/key>/, "preserve microphone permission prompt");

const scene = read("ios/App/App/SceneDelegate.swift");
const nativeSound = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const build = read("scripts/build.js");
assert.match(scene, /enum BibloZooIOSIdentity/);
assert.match(scene, /id == "com\.andydoane\.biblozoo"/);
assert.match(scene, /id == "com\.andydoane\.biblozoo\.audiotest"/);
assert.match(scene, /static var experimentalToolsEnabled/);
assert.match(scene, /self\.isNativeAppBundle/);
assert.match(nativeSound, /BibloZooIOSIdentity\.nativeAudioEnabled/);
assert.match(build, /NATIVE_IOS_AUDIO_APP_IDS/);
assert.match(build, /if \(!NATIVE_IOS_AUDIO_APP_IDS\.has\(capConfig\.appId\)\) return 0;/);
console.log("Production BibloZoo identity validated: Capacitor, Xcode, Info.plist, native routing and DEV separation.");
