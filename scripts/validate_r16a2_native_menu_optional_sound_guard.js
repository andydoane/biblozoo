"use strict";
// R16a.2: narrow regression for the iPhone-reproduced Menu/UI-pop collision.
// Tests actual Swift/JS source boundaries; on-phone audibility and Apple Music
// interruption behavior must still be verified by the owner.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const sound = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const scene = read("ios/App/App/SceneDelegate.swift");
const app = read("app.js");
const ui = read("verse_games/shared/native-ui-audio.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
function section(src, start, end) {
  const a = src.indexOf(start);
  assert(a >= 0, "Missing source start: " + start);
  const b = src.indexOf(end, a + start.length);
  assert(b > a, "Missing source end: " + end);
  return src.slice(a, b);
}
const lease = section(scene, "enum BibloZooEssentialVoiceSession", "class SceneDelegate:");
assert.match(lease, /static func isActive\(owner requested: String\) -> Bool/);
assert.match(lease, /Thread\.isMainThread && owner == requested &&[\s\S]*?AVAudioSession\.sharedInstance\(\)\.category == \.playback/);
assert.match(lease, /setCategory\(\.soloAmbient, mode: \.default/);
assert.match(lease, /setCategory\(\.playback, mode: \.default/);
const guard = section(sound, "private func optionalEffectDeniedByActiveNarration", "private func unavailableReason()");
assert.match(guard, /reason == "category-not-soloambient"/);
assert.match(guard, /BibloZooEssentialVoiceSession\.isActive\(owner: "native-narration"\)/);
for (const predicate of [
  "UIApplication.shared.applicationState == .active",
  "!wasOutsideForeground", "!interrupted",
  "!needsGestureAfterInterruption", "!needsGestureAfterReset",
  "!AVAudioSession.sharedInstance().isOtherAudioPlaying",
  "narrationPlayer?.isPlaying == true"
]) assert(guard.includes(predicate), "Missing genuine-interruption protection: " + predicate);
assert(!guard.includes("setCategory(") && !guard.includes("setActive("),
  "Optional effect denial must not mutate session or activate audio");
const play = section(sound, "@objc func play(_ call:", "@objc func stop(_ call:");
assert.match(play,
  /if let reason = self\.unavailableReason\(\) \{[\s\S]*?if !self\.optionalEffectDeniedByActiveNarration\(reason\) \{\s*self\.forgetPlayback\(\)\s*\}\s*call\.resolve\(\["accepted": false, "reason": reason\]\)/,
  "Reject only the optional sound during known narration; real failures still forget");
assert.match(play, /self\.playbackQueue\.async/);
const narration = section(sound, "@objc func playNarration(", "@objc func pauseNarration(");
assert.match(narration, /BibloZooEssentialVoiceSession\.begin\(/);
assert.match(narration, /owner: "native-narration"/);
const menu = section(app, "function openLearnMenu()", "function closeLearnMenu()");
assert.match(menu, /pauseLearnAudioForInterruption\(\)/);
assert.match(menu, /learnMenuNativeRecovery = learnAudioInterrupted/);
assert.match(menu, /learnMenuOpen = true/);
assert.match(menu, /menu\.classList\.add\("show"\)/);
assert.match(ui, /bridge\(\)\?\.play\?\.\(/);
assert.match(ui, /Promise\.resolve\(bridge\(\)\?\.play/);
assert.match(workflow, /validate_r16a2_native_menu_optional_sound_guard\.js/);
console.log("R16a.2 native menu optional-pop collision: PASS (source-level; owner iPhone gate remains)");
