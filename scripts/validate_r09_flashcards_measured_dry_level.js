"use strict";
// R09b FLASH-05: compile actual Swift take-level estimator AND actual dry
// output-only speech DSP/copy against SYNTHETIC samples. No voice recordings.
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"),
  path = require("node:path"), cp = require("node:child_process");
const read = name => fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const js=read("verse_games/shared/native-flashcards-capture-n7c.js");
const web=read("flashcards/recording.js");
assert(workflow.includes("node scripts/validate_r09_flashcards_measured_dry_level.js"));
const start=swift.indexOf("    private static func n7cDryReplayLevel(");
const end=swift.indexOf("    // N7c captures *only* on the child's Flashcards Record gesture.",start);
assert(start>0 && end>start, "production Swift level and DSP helpers have fixed boundaries");
const helpers=swift.slice(start,end);
assert(helpers.includes("private static func n7cRenderDryVoice("));
assert(helpers.includes("activeFrames >= max(256, samples.count / 200)"));
assert(helpers.includes("guard sample.isFinite else"));
assert(helpers.includes("let gain = min(3.2, max(1.0, 0.16 / activeRms))"));
assert(helpers.includes("sqrt(0.22 / postGainPeak)"));
assert(helpers.includes("reduction * compressionRelease"));
assert(helpers.includes("speechWeight"));
assert(helpers.includes("max(-0.84, min(0.84, corrected))"));
const copyStart=swift.indexOf("                self.savedSamples.withUnsafeBufferPointer { source in");
const copyEnd=swift.indexOf("                buffer.frameLength =",copyStart);
assert(copyStart>end && copyEnd>copyStart, "actual Swift native PCM copy located");
const copy=swift.slice(copyStart,copyEnd);
assert(copy.includes("if effectId.isEmpty && self.savedDryReplayGain > 1.0"));
assert(copy.includes("Self.n7cRenderDryVoice(source,"));
assert(copy.includes("into: samplesOut[0]"));
assert(copy.includes("samplesOut[0].update(from: base, count: source.count)"));
const store=swift.slice(swift.indexOf("            if keep {",swift.indexOf("private func stopCaptureInternal(")),
  swift.indexOf("            self.captureSamples.removeAll",swift.indexOf("private func stopCaptureInternal(")));
for(const line of ["self.savedSamples = self.captureSamples",
    "let levels = Self.n7cDryReplayLevel(self.savedSamples)",
    "self.savedDryReplayGain = levels.gain",
    "self.savedRmsDbFS = levels.rmsDbFS", "self.savedPeakDbFS = levels.peakDbFS",
    "self.savedDryReplayGain = 1.0"]) {
  assert(store.includes(line),"native save/discard regression: "+line);
}
const meter="let level = max(0.0, min(1.0, (db + 50) / 35))";
assert(swift.includes(meter),"R09b native meter is separately re-scaled");
const meterAtHalfOld=( -27.5 + 50 ) / 35;
assert(meterAtHalfOld>0.62 && meterAtHalfOld<0.66, "old 50% visually becomes ~64%");
assert(swift.includes("let db = 20.0 * log10(max(0.00001, rms))"),
 "meter reads live RMS and does not modify audio PCM");
assert(swift.includes('"dryReplayGain": Double(self.savedDryReplayGain)'));
assert(swift.includes('"rmsDbFS": self.savedRmsDbFS'));
assert(swift.includes('"peakDbFS": self.savedPeakDbFS'));
assert(swift.includes("self.savedSamples.removeAll(keepingCapacity: false)"));
assert(swift.includes("self.playbackRouteEpoch == routeEpoch"));
assert(swift.includes("try session.setActive(true)"));
assert(js.includes("playCapture({takeId: takeMetadata.takeId})"),
 "child's original dry Play command remains unchanged");
assert(js.includes("takeId: takeMetadata.takeId, presetId"),
 "child Wacky still selects its original effect");
assert(web.includes("getUserMedia({ audio: true })"),
 "original Web/Android recording path left untouched");
assert(!helpers.includes("AVAudioSession"),"DSP must not change audio session");
assert(!copy.includes("self.savedSamples[i] ="),"RAM recording never overwritten");
assert(!helpers.includes("notifyListeners"),"no live meter bridge side effects");
const mock=`import Foundation
final class CaptureOwner {
    var savedSamples: [Float] = []
    var savedSampleRate: Double = 44100
    var savedDryReplayGain: Float = 1
    ${helpers.replace("private static func n7cDryReplayLevel(", "static func n7cDryReplayLevel(")
             .replace("private static func n7cRenderDryVoice(", "static func n7cRenderDryVoice(")}
    func copied(_ effectId: String) -> [Float] {
        var result = [Float](repeating: 0, count: savedSamples.count)
        result.withUnsafeMutableBufferPointer { dest in
            let samplesOut = [dest.baseAddress!]
            ${copy}
        }
        return result
    }
}
func check(_ ok: @autoclosure () -> Bool, _ why: String) {
    if !ok() { fatalError(why) }
}
func sine(_ amplitude: Double, _ count: Int=8192) -> [Float] {
    (0..<count).map { i in
        Float(amplitude * sin(2.0 * Double.pi * Double(i % 97) / 97.0))
    }
}
func rms(_ x: [Float]) -> Double {
    sqrt(x.reduce(0.0) { $0 + Double($1)*Double($1) } / Double(x.count))
}
let owner = CaptureOwner()
let soft = sine(0.055)
let level = CaptureOwner.n7cDryReplayLevel(soft)
check(level.gain > 1.8 && level.gain <= 3.2, "soft speech gets meaningful gain")
check(level.rmsDbFS <= 0 && level.peakDbFS <= 0, "finite rounded level diagnostics")
owner.savedSamples=soft
owner.savedDryReplayGain=level.gain
let first=owner.copied("")
let again=owner.copied("")
check(first==again, "repeat Play must not compound gain")
check(owner.savedSamples==soft, "source voice must stay unmodified")
check(rms(first) > rms(soft)*1.8, "soft speech is substantially more audible")
check(first.allSatisfy { abs($0) <= 0.840001 }, "dry output is strictly peak-limited")
check(owner.copied("squirrel")==soft, "Squirrel Wacky unchanged")
check(owner.copied("chorus_alien")==soft, "Chorus Wacky unchanged")
check(owner.copied("demon")==soft, "Demon Wacky unchanged")
let loud=sine(0.40)
owner.savedSamples=loud
owner.savedDryReplayGain=CaptureOwner.n7cDryReplayLevel(loud).gain
check(owner.savedDryReplayGain==1, "already-loud speech not artificially boosted")
check(owner.copied("")==loud, "already-loud dry take is byte-perfect")
let silent=[Float](repeating:0,count:8192)
owner.savedSamples=silent
owner.savedDryReplayGain=CaptureOwner.n7cDryReplayLevel(silent).gain
check(owner.savedDryReplayGain==1 && owner.copied("")==silent, "silence unchanged")
let noise=sine(0.01)
owner.savedSamples=noise
owner.savedDryReplayGain=CaptureOwner.n7cDryReplayLevel(noise).gain
check(owner.savedDryReplayGain==1 && owner.copied("")==noise, "low noise unchanged")
var spiky=soft
spiky[100]=0.97
owner.savedSamples=spiky
owner.savedDryReplayGain=CaptureOwner.n7cDryReplayLevel(spiky).gain
let playedSpike=owner.copied("")
check(owner.savedDryReplayGain>1, "one consonant no longer vetoes whole quiet take")
check(playedSpike.allSatisfy { abs($0)<=0.840001 }, "sharp peak safely limited")
check(rms(playedSpike)>rms(spiky)*1.3, "actual quiet speech still audible")
let gap=sine(0.065)+[Float](repeating:0.005,count:44100)
owner.savedSamples=gap
owner.savedDryReplayGain=CaptureOwner.n7cDryReplayLevel(gap).gain
let playedGap=owner.copied("")
check(owner.savedDryReplayGain>1, "valid speech followed by silence measured")
check(abs(Double(playedGap.last!-gap.last!))<0.00005,
      "noise in long between-speech gap returns to original level")
var invalid=soft
invalid[50]=Float.nan
check(CaptureOwner.n7cDryReplayLevel(invalid).gain==1,
      "nonfinite samples fail measurement closed")
check(CaptureOwner.n7cDryReplayLevel([0.03,0.05]).gain==1,
      "short takes fail measurement closed")
print("R09b REAL Swift gain/compression/PCM copy + synthetic speech/noise PASS")
`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-r09b-"));
try{
 const src=path.join(dir,"DryReplay.swift"),bin=path.join(dir,"run");
 fs.writeFileSync(src,mock);
 const compiled=cp.spawnSync("swiftc",["-o",bin,src],{encoding:"utf8",timeout:90000});
 assert.equal(compiled.status,0,"Real Swift DSP compile failed:\n"+compiled.stdout+compiled.stderr);
 const ran=cp.spawnSync(bin,[],{encoding:"utf8",timeout:12000});
 assert.equal(ran.status,0,"Real Swift DSP regression failed:\n"+ran.stdout+ran.stderr);
 assert(ran.stdout.includes("R09b REAL Swift gain/compression/PCM copy + synthetic speech/noise PASS"));
}finally{fs.rmSync(dir,{recursive:true,force:true})}
console.log("R09b Flashcards voice loudness and live meter PASS");
