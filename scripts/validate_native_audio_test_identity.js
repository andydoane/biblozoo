"use strict";

// Static source-level guard for the experimental iOS app identity.
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
const testName = "BibloZoo Audio Test";

assert.equal(config.appId, testId, "Capacitor must use the isolated audio-test app ID");
assert.equal(config.appName, testName, "Capacitor must label the experimental app");
assert.equal(config.webDir, "dist", "keep existing Capacitor web bundle location");

const matches = [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g)]
  .map((match) => match[1].trim());
assert.equal(matches.length, 2, "expected Xcode Debug and Release bundle identifiers");
assert.ok(matches.every((id) => id === testId), "both Xcode build configurations need test ID");
assert.ok(!matches.includes(originalId), "Xcode must never overwrite the existing app identity");

assert.match(
  plist,
  /<key>CFBundleDisplayName<\/key>\s*<string>BibloZoo Audio Test<\/string>/,
  "the iPhone home-screen label must identify the test build"
);
assert.match(
  plist,
  /<key>CFBundleIdentifier<\/key>\s*<string>\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>/,
  "Info.plist should still inherit the Xcode target bundle ID"
);
assert.match(plist, /<key>NSMicrophoneUsageDescription<\/key>/, "preserve microphone permission prompt");

console.log("Native audio test identity validation passed (Capacitor, both Xcode configurations, Info.plist).");
