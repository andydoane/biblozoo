// First-party privacy disclosure coherence guard for BibloZoo 1.0.
//
// This validates source-level claims and keeps both privacy-policy surfaces
// aligned. It DOES NOT inspect actual network packets, Xcode-built SDKs,
// server logs, or App Store Connect disclosures.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const app = read("app.js");
const external = read("privacy_policy.html");
const policyStart = app.indexOf("function screenPrivacyPolicy(");
const policyEnd = app.indexOf("return makeSlide(", policyStart);
assert.ok(policyStart >= 0 && policyEnd > policyStart,
  "Could not isolate in-app Settings privacy-policy screen");
const inApp = app.slice(policyStart, policyEnd);

const flatten = s => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const date = s => {
  const match = s.match(/Last updated:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
  assert.ok(match, "Missing policy update date");
  return match[1];
};
assert.equal(date(inApp), date(external),
  "Embedded and standalone privacy policies show different update dates");

for (const [label, raw] of [["Settings", inApp], ["standalone", external]]) {
  const text = flatten(raw);
  for (const heading of [
    "Information Stored on Your Device",
    "Optional Voice Recording",
    "Photos and Files in Ghost Writer",
    "Internet Use",
    "Backups",
    "Deleting Your Data",
    "Contact"
  ]) {
    assert.ok(text.includes(heading), label + " policy missing section: " + heading);
  }
  for (const phrase of [
    "does not require an account",
    "does not use analytics or tracking",
    "not automatically sent",
    "not automatically upload",
    "record",
    "re-record",
    "not saved to files",
    "never uploaded",
    "Ghost Writer",
    "Photos or Files",
    "temporary",
    "sharing options",
    "its own privacy practices",
    "Zookeeper names",
    "memorization progress"
  ]) {
    assert.ok(text.toLowerCase().includes(phrase.toLowerCase()),
      label + " policy missing disclosure phrase: " + phrase);
  }
}

// Check the first-party declaration aligns with the *source-level* audit,
// without assuming those declarations cover transitive SDKs or live traffic.
const manifest = read("ios/App/App/PrivacyInfo.xcprivacy");
assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/);
assert.match(manifest, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\s*\/>/);
const plist = read("ios/App/App/Info.plist");
assert.match(plist, /<key>NSMicrophoneUsageDescription<\/key>/);
assert.match(plist, /<key>NSPhotoLibraryAddUsageDescription<\/key>/);
assert.match(read("profiles.js"), /localStorage\.setItem/);
assert.match(app, /navigator\.share/);
assert.match(read("verse_playground/ghost_writer/custom-background.js"),
  /session-only imported photo background/);
assert.match(read("ios/App/App/SceneDelegate.swift"),
  /PHPhotoLibrary\.requestAuthorization\(for: \.addOnly\)/);

console.log("Privacy policy alignment PASS: embedded + standalone disclosures, matched date, first-party source/manifest checks.");
console.log("NOT verified by this check: real off-device data flows, SDKs, App Store Connect answers, public HTTPS policy reachability.");
