// R16a.1: source-contract check for DEBUG-only on-phone silent-mode probes.
// This is not a Swift link or an acoustic test. No programmatic mute inference.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sound = fs.readFileSync(path.join(root, "ios/App/App/BibloZooNativeSoundPlugin.swift"), "utf8");
const scene = fs.readFileSync(path.join(root, "ios/App/App/SceneDelegate.swift"), "utf8");
const policy = fs.readFileSync(path.join(root, "docs/R15-IOS-SILENT-MODE-AUDIO-POLICY.md"), "utf8");
function section(src, start, end) {
  const a = src.indexOf(start);
  assert(a >= 0, "missing " + start);
  const b = src.indexOf(end, a + start.length);
  assert(b > a, "missing ending " + end);
  return src.slice(a,b);
}
const effect = section(sound, "@objc func play(_ call:", "@objc func stop(_ call:");
const optional = section(effect, "#if DEBUG\n            // Observe the ACTUAL", "#endif");
assert.match(optional, /soundId == "ui-pop-1"/);
assert.match(optional, /soundId == "ui-pop-2"/);
assert.match(optional, /soundId\.hasPrefix\("scramble-"\)/);
assert.match(optional, /silentProbeLoggedKinds\.insert\(kind\)\.inserted/);
assert.match(optional, /\[BibloZooSilentProbe\] optional kind=/);
assert.match(optional, /session\.category\.rawValue/);
assert.match(optional, /session\.mode\.rawValue/);
assert.match(optional, /session\.currentRoute\.outputs/);
assert.ok(effect.indexOf("self.unavailableReason()") < effect.indexOf("silentProbeLoggedKinds.insert"));
assert.match(effect, /let epoch = self.playbackEpochSnapshot\(\)/);
const activation = section(sound, "@objc func activateFromGesture(_ call:", "@objc func getDebugState(");
assert.match(activation, /\[BibloZooSilentProbe\] phase=gesture-activation/);
assert.match(activation, /if purpose == "ui" \|\| purpose == "game"/);
const lease = section(scene, "enum BibloZooEssentialVoiceSession", "class SceneDelegate:");
assert.match(lease, /\[BibloZooSilentProbe\] phase=voice-begin/);
assert.match(lease, /\[BibloZooSilentProbe\] phase=voice-end/);
assert.match(lease, /session\.setCategory\(\.playback, mode: \.default/);
assert.match(lease, /session\.setCategory\(\.soloAmbient, mode: \.default/);
for (const line of [...optional.matchAll(/NSLog\((.*)/g)].map(x=>x[0])) {
  assert(!/child|profile|verse|takeId|record|URL|path/i.test(line), "probe log begins with non-private session/class state only");
}
assert.match(policy, /Option B/);
console.log("R16a.1 DEBUG-only optional-effect category probes: PASS (no on-device audibility claim)");
