"use strict";
// R10 / READ-04: compile + execute the ACTUAL native Swift WAV synthesizer
// with the production source gains, verify both independent and overlapped
// tones stay bounded. Synthetic audio only; not a real speaker dB measurement.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const cp=require("node:child_process");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const web=read("read_my_verse.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const r08=read("scripts/validate_r08_read_native_cue_timing.js");
const n7f2=read("scripts/validate_native_n7f2_read_pause_waveform_lab.js");
assert(workflow.includes("node scripts/validate_r10_read_native_cue_loudness.js"),
  "R10 must be part of integration CI");
const start=swift.indexOf("    private func wavData(midi:");
const end=swift.indexOf("    // R08 / READ-05+06:",start);
assert(start>0 && end>start,"native Read source WAV synth has stable boundaries");
const wav=swift.slice(start,end);
const playStart=swift.indexOf("    @objc func playCue(");
const auditionStart=swift.indexOf("    @objc func auditionCue(",playStart);
const stopStart=swift.indexOf("    @objc func stopCues(",auditionStart);
assert(playStart>end && auditionStart>playStart && stopStart>auditionStart,
  "Read child and developer cue scopes");
const child=swift.slice(playStart,auditionStart);
const audition=swift.slice(auditionStart,stopStart);
assert(child.includes("gain = wrong ? 0.13 : (complete ? 0.28 : 0.32)"),
  "correct-word boosts are bounded, wrong taps remain quieter");
assert(child.includes("gain = complete ? 0.28 : 0.32"),
  "scramble words and finish balance deliberately");
assert(child.includes("notes = [(48, 0)]; gain = 0.08"),
  "negative feedback must retain original soft volume");
assert(child.includes("[(midi, 0), (midi + 4, 0.09)"));
assert(child.includes("(midi + 7, 0.18), (midi + 12, 0.27)]"));
assert(child.includes("[(base, 0), (base + 4, 0.1)]"));
assert(child.includes("[(base, 0), (base + 4, 0.09)"));
assert(child.includes("(base + 7, 0.19), (base + 12, 0.3)]"));
assert(child.includes("let scheduled = self.playPreparedReadCueNotes(prepared)"),
  "child uses unchanged R08 early-first/shared-clock scheduling");
assert(audition.includes('let auditionGain = sample == "scramble-word" ? 0.32 : 0.28'),
  "DEV waveform comparisons must match the corresponding child cue level");
assert(audition.includes("gain: auditionGain, square: false,"));
assert(audition.includes("let count = self.playPreparedReadCueNotes(prepared)"));
assert(r08.includes("0.28 : 0.32") && n7f2.includes("gain: auditionGain"),
  "earlier regression expectations follow actual safe native gain changes");
assert(wav.includes("let attack = min(1, Double(index) / (0.018 * Double(rate)))"),
  "original 18ms click-free attack unchanged");
assert(wav.includes("let release = min(1, Double(count - index) /"),
  "original fade unchanged");
assert(wav.includes("let sample = max(-1, min(1,"),
  "native WAV sample clamp unchanged");
assert(web.includes("orderCorrect: 0.22")&&web.includes("scrambleReward: 0.22"),
  "Web/PWA/Android feedback remains originally authored");
const sound=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
assert(sound.includes("let volumeMultiplier = correct ? 3.40 : 3.60"),
  "independent Tower comparison exists, is NOT changed in this PR");
assert(child.includes("self.ownedByReadGesture"));
assert(child.includes("UIApplication.shared.applicationState == .active"));
assert(!child.includes("setActive("),"word taps never re-claim audio from Apple Music");
const helper=`import Foundation
final class NativeReadSynth {
${wav.replace("private func wavData(", "func wavData(")}
}
func peak(_ values:[Double]) -> Double { values.map{abs($0)}.max() ?? 0 }
func rms(_ values:[Double]) -> Double {
    sqrt(values.reduce(0.0){ $0+$1*$1 } / Double(max(values.count,1)))
}
func samples(_ data:Data)->[Double] {
    let bytes=[UInt8](data)
    precondition(bytes.count>44 && String(decoding:bytes[0..<4],as:UTF8.self)=="RIFF")
    return (0..<((bytes.count-44)/2)).map{ i in
        let raw=UInt16(bytes[44+i*2]) | (UInt16(bytes[45+i*2]) << 8)
        return Double(Int16(bitPattern:raw))/32767.0
    }
}
func check(_ flag: @autoclosure ()->Bool, _ msg:String){
    if !flag(){ fatalError(msg) }
}
func overlap(_ synth:NativeReadSynth,
             _ notes:[(Int,Double)], gain:Double, duration:Double) -> [Double] {
    var mix=[Double](repeating:0,count:44100)
    for (midi,delay) in notes{
        let frames=samples(synth.wavData(midi:midi,seconds:duration,gain:gain))
        let offset=Int((delay*44100).rounded())
        for i in 0..<frames.count where i+offset < mix.count {
            mix[i+offset]+=frames[i]
        }
    }
    return mix
}
let synth=NativeReadSynth()
let old=samples(synth.wavData(midi:67,seconds:0.17,gain:0.22))
let word=samples(synth.wavData(midi:67,seconds:0.17,gain:0.32))
let finish=samples(synth.wavData(midi:67,seconds:0.17,gain:0.28))
let wrong=samples(synth.wavData(midi:48,seconds:0.14,gain:0.13,square:true))
let negative=samples(synth.wavData(midi:48,seconds:0.15,gain:0.08,square:true))
check(peak(word)>peak(old)*1.43,"normal word cues get intentional ~3.3dB increase")
check(rms(word)>rms(old)*1.43,"source RMS rise matches bounded gain")
check(peak(word)<0.33 && peak(word)>0.30,"normal word peak safely <0.33")
check(peak(finish)<peak(word)&&peak(finish)>0.26,
      "each stacked finish note stays softer than a word")
check(peak(wrong)<0.14&&peak(wrong)>0.12,
      "wrong word remains clearly gentler")
check(peak(negative)<0.081 && peak(negative)>0.078,
      "optional negative tone retains unchanged 0.08 source level")
let unscramble=overlap(synth,[(67,0),(71,0.1)],gain:0.32,duration:0.17)
let orderFinish=overlap(synth,[(67,0),(71,0.09),(74,0.18),(79,0.27)],
                        gain:0.28,duration:0.17)
let scrambleFinish=overlap(synth,[(67,0),(71,0.09),(74,0.19),(79,0.3)],
                           gain:0.28,duration:0.2)
check(peak(unscramble)<0.66,"two-note Unscramble never approaches clip at source")
check(peak(orderFinish)<0.66,"four-note Order finish stays gentle")
check(peak(scrambleFinish)<0.66,"four-note Unscramble finish stays gentle")
check(rms(unscramble)>rms(old)*0.5,"Unscramble reward has meaningful energy")
print("R10 real Swift PCM synthesizer gains, overlapping melodies and envelopes PASS")
`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-r10-"));
try{
 const src=path.join(dir,"R10ReadCue.swift"),bin=path.join(dir,"check");
 fs.writeFileSync(src,helper);
 const c=cp.spawnSync("swiftc",["-o",bin,src],{encoding:"utf8",timeout:90000});
 assert.equal(c.status,0,"actual production Swift WAV synthesizer compile failed:\n"+c.stdout+c.stderr);
 const run=cp.spawnSync(bin,[],{encoding:"utf8",timeout:12000});
 assert.equal(run.status,0,"native source waveform tests failed:\n"+run.stdout+run.stderr);
 assert(run.stdout.includes("R10 real Swift PCM synthesizer"));
}finally{fs.rmSync(dir,{recursive:true,force:true})}
console.log("R10 native Read cue loudness calibration and safety PASS");
