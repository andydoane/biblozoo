"use strict";
// N3c cold-launch contract: source/VM only. No Linux Xcode compilation or
// speaker audibility measurement can be inferred from these assertions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const game = read("daily_questions_feed_game.js");
const pilot = read("verse_games/shared/feeding-native-audio-pilot.js");
const actions = read(".github/workflows/ios-prep-validation.yml");
function section(src,from,to){
  const start=src.indexOf(from);
  const end=src.indexOf(to,start+from.length);
  assert.ok(start>=0 && end>start,from+" section present");
  return src.slice(start,end);
}
const gesture=section(swift,"    @objc func activateFromGesture(","    private func requestedId(");
const preload=section(swift,"    @objc func preload(","    @objc func play(");
const start=section(game,"  async function startPreviewRoundWithAudioChoice(",
  "  function startRound(runtime) {");
assert.match(swift,/private var hasGestureActivatedSession = false/);
assert.match(gesture,/let firstTap = !self\.hasGestureActivatedSession/);
assert.match(gesture,/let needsRecovery = firstTap \|\| self\.interrupted \|\|/);
assert.match(gesture,/self\.needsGestureAfterReset/);
assert.match(gesture,/guard !self\.interrupted \|\| self\.returnedToForegroundDuringInterruption/);
assert.match(gesture,/self\.minimumActivationInterval/);
assert.match(gesture,/self\.maximumActivationAttemptsPerForeground/);
assert.match(gesture,/try AVAudioSession\.sharedInstance\(\)\.setActive\(true\)/);
assert.match(gesture,/self\.hasGestureActivatedSession = true/);
assert.match(gesture,/self\.lastInterruptionSignal = firstTap[\s\S]*?"initial-activation-accepted"/);
assert.match(gesture,/finish\(\["ready": false, "attempted": true,[\s\S]*?"activation-os-rejected"/);
assert.match(swift,/private let maxPreflightEvents = 18/);
assert.match(swift,/if preflightEvents\.count > maxPreflightEvents/);
assert.match(swift,/private func resolvePreflight\(/);
assert.match(gesture,/self\.resolvePreflight\(call, result, phase: "gesture"/);
assert.match(preload,/self\.resolvePreflight\(call, result, phase: "preload"/);
assert.match(swift,/Native first-tap preflight:/);
assert.match(swift,/Preflight accepted does NOT prove speaker sound/);
assert.match(swift,/UIPasteboard\.general\.string = self\.timingReportText\(\)/);
assert.match(swift,/"lastPreflight": self\.preflightEvents\.last/);
assert.match(swift,/"hasGestureActivatedSession": self\.hasGestureActivatedSession/);
assert.match(swift,/recordSoundTiming\(\[/, "existing timing recorder remains");
assert.match(start,/if \(result\?\.ready !== true \|\| !pilot\) \{/);
assert.match(start,/pilot\?\.stop\?\.\(\)/);
assert.match(start,/runtime\.nativePilot = null/);
assert.match(start,/const message = \["other-audio-playing"[\s\S]*?Sound isn't ready yet\. Tap Try Again or Back/,
  "native cold-start distinguishes PiP deferral from genuine missing PCM");
assert.doesNotMatch(start,/DEV → Copy Audio Timing Report before restarting/);
assert.match(start,/runtime\.startConfirmButton\.textContent = "Try Again"/);
assert.match(start,/recordNativePreviewPhase\(runtime, "preflight-failed"\)/);
const guardStart=start.indexOf("if (result?.ready !== true || !pilot)");
const firstStart=start.indexOf("    startRound(runtime);",guardStart);
const earlyReturn=start.indexOf("      return;",guardStart);
assert.ok(guardStart>=0 && earlyReturn>guardStart && firstStart>earlyReturn,
  "failed preflight returns BEFORE startRound");
assert.match(start,/runtime\.nativePilot = pilot;[\s\S]*?startRound\(runtime\)/);
const nativeFlow=start.slice(start.indexOf("    // C.2d experiment:"));
assert.doesNotMatch(nativeFlow,/Web Audio\.resume\(|new Audio\(|runtime\.nativePilotBackend = "web"/,
  "Native failure may not silently change backend in the native branch");
// Web-browsers have their own explicit choice; never globally remove it.
assert.match(game,/Preview audio: Web \(explicit choice\)/);
assert.match(pilot,/const IDS = Object\.freeze\(\["feed-star", "feed-chomp", "feed-peg"\]\)/);
assert.match(pilot,/api\.activateFromGesture\(\{ purpose: "feeding" \}\)/);
assert.match(pilot,/for \(const soundId of selectedIds\)/);
assert.match(pilot,/const selectedIds = mode === "melody" \? MELODY_IDS :/);
assert.match(pilot,/mode === "labyrinth" \? LABYRINTH_IDS :/);
assert.match(pilot,/mode === "bounce" \? BOUNCE_IDS : IDS/,
  "N4c retains N3c bounded fixed-ID preflight profiles");
assert.match(actions,/node scripts\/validate_native_first_launch_n3c\.js/);
const noComments=swift.replace(/\/\/[^\n]*/g,"");
assert.doesNotMatch(noComments,/\.setCategory\(|\.setMode\(|\.setActive\(false\)/);
assert.equal((noComments.match(/\.setActive\(true\)/g)||[]).length,1);
assert.doesNotMatch(swift,/URLSession\.|UserDefaults\.|FileManager\.default\.createFile/,
  "diagnostics never upload or persist audio/child data");
console.log("N3c cold first-tap session activation, no silent failed round, bounded manual report, native-only guard passed.");
