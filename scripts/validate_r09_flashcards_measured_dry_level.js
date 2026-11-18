"use strict";
// R09 FLASH-05: compile and run the ACTUAL production Swift level estimator
// and copied dry-playback PCM branch against synthetic speech/noise. Nothing
// records, uploads, logs, or exposes real voices; this is NOT an iPhone A/B.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const read = name => fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const js=read("verse_games/shared/native-flashcards-capture-n7c.js");
const web=read("flashcards/recording.js");
assert(workflow.includes("node scripts/validate_r09_flashcards_measured_dry_level.js"));
const start=swift.indexOf("    private static func n7cDryReplayLevel(");
const stop=swift.indexOf("    // N7c captures *only* on the child's Flashcards Record gesture.",start);
assert(start>0&&stop>start, "real Swift gain helper has explicit safe boundaries");
const helper=swift.slice(start,stop);
assert(helper.includes("activeFrames >= max(256, samples.count / 200)"));
assert(helper.includes("gain = min(1.8, 0.085 / max(0.000001, activeRms),"));
assert(helper.includes("0.84 / peak"));
assert(helper.includes("guard sample.isFinite else"));
const copyStart=swift.indexOf("                self.savedSamples.withUnsafeBufferPointer { source in");
const copyStop=swift.indexOf("                buffer.frameLength =",copyStart);
assert(copyStart>stop && copyStop>copyStart,"real dry copy location");
const copy=swift.slice(copyStart,copyStop);
assert(copy.includes("if effectId.isEmpty && self.savedDryReplayGain > 1.0"));
assert(copy.includes("samplesOut[0][i] = max(-0.84, min(0.84, amplified))"));
assert(copy.includes("samplesOut[0].update(from: base, count: source.count)"));
const savedStart=swift.indexOf("            if keep {",swift.indexOf("private func stopCaptureInternal("));
const savedEnd=swift.indexOf("            self.captureSamples.removeAll",savedStart);
const saved=swift.slice(savedStart,savedEnd);
assert(saved.includes("self.savedSamples = self.captureSamples"));
assert(saved.includes("let levels = Self.n7cDryReplayLevel(self.savedSamples)"));
assert(saved.includes("self.savedDryReplayGain = levels.gain"));
assert(saved.includes("self.savedRmsDbFS = levels.rmsDbFS"));
assert(saved.includes("self.savedPeakDbFS = levels.peakDbFS"));
assert(saved.includes("self.savedDryReplayGain = 1.0"),
 "Interrupted / discarded takes must clear old gain");
assert(swift.includes('"dryReplayGain": Double(self.savedDryReplayGain)'));
assert(swift.includes('"rmsDbFS": self.savedRmsDbFS'));
assert(swift.includes('"peakDbFS": self.savedPeakDbFS'));
assert(swift.includes("self.savedSamples.removeAll(keepingCapacity: false)"));
assert(swift.includes("self.savedTakeId = \"\""));
assert(swift.includes("self.playbackRouteEpoch == routeEpoch"));
assert(swift.includes("try session.setActive(true)"));
assert(js.includes("playCapture({takeId: takeMetadata.takeId})"),
 "ordinary child Play uses the unchanged dry preset");
assert(js.includes("presetId: nativeId"),"Wacky still selects an effect");
assert(web.includes("getUserMedia({ audio: true })"),
 "original Web/Android mic setup untouched");
assert(!swift.slice(start,stop).includes("AVAudioSession"),
 "offline measurement must not change recording category or route");
assert(!copy.includes("self.savedSamples[i] ="),
 "source RAM samples must never be rewritten in replay");

const mock=`import Foundation
struct Channel {
    var values: [Float]
    init(_ count: Int) { values = Array(repeating: 0, count: count) }
    subscript(index: Int) -> Float {
        get { values[index] }
        set { values[index] = newValue }
    }
    mutating func update(from pointer: UnsafePointer<Float>, count: Int) {
        for i in 0..<count { values[i] = pointer[i] }
    }
}
final class CaptureOwner {
    var savedSamples: [Float] = []
    var savedDryReplayGain: Float = 1
    ${helper.replace("private static func n7cDryReplayLevel(", "static func n7cDryReplayLevel(")}
    func copied(_ effectId: String) -> [Float] {
        var samplesOut = [Channel(savedSamples.count)]
        ${copy}
        return samplesOut[0].values
    }
}
func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() { fatalError(message) }
}
func near(_ value: Double, _ expected: Double, tolerance: Double = 0.0001) -> Bool {
    abs(value - expected) <= tolerance
}
func speech(_ amplitude: Double, _ count: Int=8192) -> [Float] {
    (0..<count).map { i in
        Float(amplitude * sin(2.0 * Double.pi * Double(i % 97) / 97.0))
    }
}
let quiet = speech(0.06)
let levels = CaptureOwner.n7cDryReplayLevel(quiet)
check(levels.gain > 1 && levels.gain <= 1.8, "genuinely quiet speech bounded gain")
check(levels.peakDbFS <= 0 && levels.rmsDbFS <= 0, "coarse finite decibels")
let owner = CaptureOwner()
owner.savedSamples = quiet
owner.savedDryReplayGain = levels.gain
let original = owner.savedSamples
let once = owner.copied("")
let twice = owner.copied("")
check(once == twice, "repeated child Play uses same measured gain, no compounding")
check(owner.savedSamples == original, "RAM voice never modified by replay")
check(once[25] != quiet[25], "dry path boosted a quiet sample")
check(once.allSatisfy { abs($0) <= 0.840001 }, "dry replay never clips over 0.84")
check(owner.copied("squirrel") == quiet, "Wacky preset receives unmodified voice")
check(owner.copied("chorus_alien") == quiet, "Chorus preserves original samples")
check(CaptureOwner.n7cDryReplayLevel(speech(0.3)).gain == 1,
      "normal/loud voice stays at original gain")
check(CaptureOwner.n7cDryReplayLevel(speech(0.01)).gain == 1,
      "very quiet noise is NOT amplified")
check(CaptureOwner.n7cDryReplayLevel(Array(repeating: 0, count: 4096)).gain == 1,
      "silence is NOT amplified")
var transient = quiet
transient[100] = 0.92
check(CaptureOwner.n7cDryReplayLevel(transient).gain == 1,
      "one hot transient suppresses gain")
var invalid = quiet
invalid[80] = Float.nan
check(CaptureOwner.n7cDryReplayLevel(invalid).gain == 1,
      "invalid PCM fails closed")
check(CaptureOwner.n7cDryReplayLevel([0.03, 0.04]).gain == 1,
      "unreasonably short take stays unchanged")
let borderline = speech(0.09)
var spike = borderline
spike[25] = 0.7
let dynamic = CaptureOwner.n7cDryReplayLevel(spike)
check(Double(dynamic.gain) * 0.7 <= 0.84001, "transient ceiling even under boost")
print("R09 actual Swift measured replay helper + real PCM copy PASS")
`;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bz-r09-"));
try{
 const source=path.join(temp,"DryReplay.swift"),binary=path.join(temp,"test");
 fs.writeFileSync(source,mock);
 const compile=cp.spawnSync("swiftc",["-o",binary,source],{encoding:"utf8",timeout:90000});
 assert.equal(compile.status,0,"Swift mock compile failed:\n"+compile.stdout+compile.stderr);
 const run=cp.spawnSync(binary,[],{encoding:"utf8",timeout:12000});
 assert.equal(run.status,0,"Swift mock failed:\n"+run.stdout+run.stderr);
 assert(run.stdout.includes("R09 actual Swift measured replay helper + real PCM copy PASS"));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
console.log("R09 Flashcards measured dry replay safety validation PASS");
