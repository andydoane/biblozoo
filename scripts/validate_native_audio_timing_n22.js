"use strict";
// N2.2 source/VM contract for collision-to-native timing in .audiotest.
// These checks CANNOT measure acoustic onset or compile the Swift iOS app.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const SWIFT = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const PILOT = read("verse_games/shared/feeding-native-audio-pilot.js");
const FEED = read("daily_questions_feed_game.js");
const DEV = read("verse_games/shared/native-sound-smoke-test.js");
const INDEX = read("index.html");
const CI = read(".github/workflows/ios-prep-validation.yml");

async function run() {
  // Keep per-physics-event time when score DOM and pet animation update.
  assert.match(FEED, /function catchBall\(runtime, ball\) \{[\s\S]*?const collisionEpochMs = runtime\.nativePilotBackend/);
  assert.match(FEED, /playChompSound\(runtime, collisionEpochMs\)/);
  assert.match(FEED, /function triggerStarPeg\(runtime, peg, now\) \{[\s\S]*?const collisionEpochMs/);
  assert.match(FEED, /playStarSound\(runtime, collisionEpochMs\)/);
  assert.match(PILOT, /const requestEpochMs = Date\.now\(\)/);
  assert.match(PILOT, /const eventId = "feed-" \+ \(\+\+nextSoundEventId\)/);
  assert.match(PILOT, /api\.play\(\{[\s\S]*?requestEpochMs,[\s\S]*?\.\.\.timing/);
  assert.match(INDEX, /<script src="verse_games\/shared\/native-sound-smoke-test\.js"><\/script>/);
  assert.match(CI, /node scripts\/validate_native_audio_timing_n22\.js/);

  // Native ring exists ONLY in memory and is fixed-schema; no PII strings,
  // recording data, network upload or any audio-engine policy modification.
  for (const method of ["copyTimingReport", "markRecentChompLate"]) {
    assert.match(SWIFT, new RegExp('CAPPluginMethod\\(name: "' + method + '"'));
    assert.match(SWIFT, new RegExp('@objc func ' + method + '\\('));
  }
  assert.match(SWIFT, /maxSoundTimingEvents = 80/);
  assert.match(SWIFT, /if soundTimingEvents\.count > maxSoundTimingEvents/);
  assert.match(SWIFT, /"recordedAtUptime"/);
  assert.match(SWIFT, /"collisionToNativeDispatchMs": collisionToNativeDispatchMs/);
  assert.match(SWIFT, /"collisionToRequestMs": collisionToRequestMs/);
  assert.match(SWIFT, /"bridgeMs": bridgeMs, "queueMs": queueMs/);
  assert.match(SWIFT, /"playCallMs": playCallMs/);
  assert.match(SWIFT, /UIPasteboard\.general\.string = self\.timingReportText\(\)/);
  assert.match(SWIFT, /lastIndex\(where: \{/);
  assert.match(SWIFT, /now - stamped <= 60/);
  assert.match(SWIFT, /Native dispatch = predecoded PCM scheduleBuffer\(\) for star\/chomp/);
  assert.match(SWIFT, /AVAudioPlayer\.play\(\) for pilot\. NOT proof of speaker audibility/);
  assert.match(SWIFT, /"backend": backend/, "report must label each sound engine");
  assert.doesNotMatch(SWIFT, /URLSession\.|UserDefaults\.|FileManager\.default\.createFile/,
    "report must not be transmitted or persisted on disk by Swift");
  assert.doesNotMatch(SWIFT, /\.setCategory\(|\.setMode\(|\.setActive\(false\)/,
    "timing collection does not touch iOS audio session policy");
  assert.match(DEV, /Copy Audio Timing Report/);
  assert.match(DEV, /api\.copyTimingReport\(\)/);
  assert.match(DEV, /Mark last chomp late/);
  assert.doesNotMatch(DEV, /fetch\(|XMLHttpRequest|navigator\.sendBeacon/,
    "DEV export is explicit iOS clipboard copy, not automatic upload");

  const playRequests = [];
  const stops = [];
  const sdk = {
    async activateFromGesture() { return {ready:true, reason:"not-needed"}; },
    async preload() { return {prepared:true}; },
    async play(request) {
      playRequests.push(request);
      return {accepted:true, reason:"started"};
    },
    async stop(request) { stops.push(request); return {stopped:true}; }
  };
  const window = {
    Capacitor: {
      isNativePlatform:()=>true, getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:sdk}
    },
    document:{hidden:false}, setTimeout, clearTimeout
  };
  vm.runInNewContext(PILOT,{window,Promise,Date,Error,setTimeout,clearTimeout},
    {filename:"feeding-native-audio-pilot.js"});
  const controller = window.BibloZooFeedingNativeAudioPilot.create({
    isCurrent:()=>true
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await controller.prepare())),
    {ready:true,reason:"prepared"});
  const collisionAt = Date.now()-40;
  assert.equal(controller.play("feed-chomp",0.85,collisionAt),true);
  assert.equal(controller.play("feed-star",0.78,collisionAt+1),true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(playRequests.length,2);
  assert.equal(playRequests[0].eventId,"feed-1");
  assert.equal(playRequests[1].eventId,"feed-2");
  assert.equal(playRequests[0].soundId,"feed-chomp");
  assert.equal(playRequests[1].soundId,"feed-star");
  for (const [index,request] of playRequests.entries()) {
    assert.ok(Number.isFinite(request.requestEpochMs));
    assert.ok(request.requestEpochMs >= request.collisionEpochMs);
    assert.equal(request.collisionEpochMs, collisionAt+index);
    assert.equal(typeof request.volume,"number");
    assert.equal(Object.keys(request).sort().join(","),
      ["collisionEpochMs","eventId","requestEpochMs","soundId","volume"].sort().join(","));
  }
  assert.equal(controller.play("nonexistent",0.8,collisionAt),false);
  assert.equal(playRequests.length,2,"invalid ID cannot send bridge timing");
  controller.stop();
  assert.equal(controller.play("feed-chomp",0.8,collisionAt),false,
    "paused pilot never emits a sound or timing row");
  assert.equal(stops.length,3); // sample star/chomp plus native generated peg tones

  // A missing/stale collision time is represented as absent, not silently
  // mislabelled as a 0ms collision-to-sound success.
  assert.deepEqual(JSON.parse(JSON.stringify(await controller.prepare())),
    {ready:true,reason:"prepared"});
  assert.equal(controller.play("feed-chomp",0.85,Date.now()+60000),true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(Object.hasOwn(playRequests.at(-1),"collisionEpochMs"),false);
  console.log("N2.2 native timing metadata, fixed-schema ring/clipboard policy and no-fallback contract passed.");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
