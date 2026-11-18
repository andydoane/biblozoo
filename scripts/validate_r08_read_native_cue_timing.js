"use strict";
// R08 READ-05/06. The ACTUAL Swift scheduling helper is compiled and run
// against a deterministic AVAudioPlayer stub by installed swiftc, so a first
// note at deviceCurrentTime + 0 and per-note re-anchoring fail this test.
// Apple SDK/device hearing remains a distinct owner test gate.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const cp = require("node:child_process");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const swift = read("ios/App/App/SceneDelegate.swift");
const adapter = read("verse_games/shared/native-read-my-verse-output-n7f.js");
const activity = read("read_my_verse.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
assert(workflow.includes("node scripts/validate_r08_read_native_cue_timing.js"));
const a = swift.indexOf("    private func playPreparedReadCueNotes(");
const b = swift.indexOf("    @objc func playCue(", a);
assert(a >= 0 && b > a, "Find the actual native cue scheduling helper");
const helper = swift.slice(a, b);
const startCue = swift.indexOf("    @objc func playCue(");
const startAudition = swift.indexOf("    @objc func auditionCue(", startCue);
const stopCues = swift.indexOf("    @objc func stopCues(", startAudition);
const child = swift.slice(startCue, startAudition);
const audition = swift.slice(startAudition, stopCues);
assert(helper.includes("guard first.player.play() else"),
  "zero-offset first note must use immediate play, not play(atTime: now)");
assert(helper.includes("let anchorTime = first.player.deviceCurrentTime"));
assert(helper.includes("note.player.play(atTime: anchorTime + note.delay)"));
assert(!helper.includes("note.player.deviceCurrentTime"),
  "the melody must not consult each fresh player's unstarted clock");
assert(child.includes("let scheduled = self.playPreparedReadCueNotes(prepared)"));
assert(audition.includes("let count = self.playPreparedReadCueNotes(prepared)"),
  "DEV waveform comparisons should use the identical scheduling path");
assert(child.includes("player.prepareToPlay()"),
  "all melody sounds must be prepared BEFORE the first note");
assert(!child.includes("self.cues.removeAll(where: { !$0.isPlaying })"),
  "not-yet-playing scheduled notes must keep a strong owner");
assert(swift.includes("self.cues.removeAll(where: { $0 === player })"),
  "real AVAudioPlayer delegate still frees completed voices");
assert(swift.includes('self?.cancelAll(reason: "interrupted")'));
assert(swift.includes("cues.forEach { $0.stop() }"));
for (const text of [
  "[(midi, 0), (midi + 4, 0.09)",
  "(midi + 7, 0.18), (midi + 12, 0.27)]",
  "[(base, 0), (base + 4, 0.1)]",
  "[(base, 0), (base + 4, 0.09)",
  "(base + 7, 0.19), (base + 12, 0.3)]",
  "gain = wrong ? 0.11 : 0.22",
  "gain = 0.22; duration = complete ? 0.2 : 0.17"
])assert(child.includes(text), "Retain original scale/spacing/level: " + text);
assert(activity.includes('playOrderTone(data.nextIndex, data.nextIndex >= data.tokens.length)'));
assert(activity.includes('playScrambleReward(count, complete)'));
assert(activity.includes('if (!heard || !tonesReady || !nativeReady || root?.document?.hidden)'),
  "Existing explicit native Welcome Back gate must remain");
assert(adapter.includes('epoch !== lifecycleEpoch'),
  "Stale cue request must be fenced by the native recovery epoch");

// Swift stub's clock starts at 0 after OS interruption: the old
// play(atTime: deviceCurrentTime + 0) violates Apple's strictly-future rule.
// Compile the extracted *production* helper, never a reimplementation.
// Relax only PRIVATE visibility in this isolated mock fixture so its test\n// driver can call the actual, otherwise verbatim production Swift function.\nconst swiftHarness = `
import Foundation
final class AVAudioPlayer {
    static var deviceClock: Double = 0
    let label: String
    var allowPlay = true
    var allowSchedule = true
    var stopped = false
    var immediateCalls = 0
    var scheduled: [Double] = []
    init(_ label: String) { self.label = label }
    var deviceCurrentTime: Double { Self.deviceClock }
    func play() -> Bool {
        immediateCalls += 1
        if !allowPlay { return false }
        // The mock output device starts ticking only AFTER first play().
        Self.deviceClock = 100
        return true
    }
    func play(atTime when: Double) -> Bool {
        scheduled.append(when)
        return allowSchedule && when > Self.deviceClock
    }
    func stop() { stopped = true }
}
final class Owner {
    var cues: [AVAudioPlayer] = []
${helper.replace("private func playPreparedReadCueNotes(", "func playPreparedReadCueNotes(")}
}
func verify(_ truth: @autoclosure () -> Bool, _ label: String) {
    if !truth() { fatalError(label) }
}
func near(_ value: Double, _ expected: Double) -> Bool {
    return abs(value - expected) < 0.000001
}
let one = Owner()
for index in 1...5 {
    AVAudioPlayer.deviceClock = 0 // quiet just after OS resume
    let note = AVAudioPlayer("order-\\(index)")
    verify(one.playPreparedReadCueNotes([(player: note, delay: 0)]) == 1,
       "every Tap in Order touch must start an immediate note")
    verify(note.immediateCalls == 1 && note.scheduled.isEmpty,
       "no zero-clock atTime for an individual Tap in Order note")
}
verify(one.cues.count == 5, "all five accepted notes remain owned")
let two = Owner()
AVAudioPlayer.deviceClock = 0
let s0 = AVAudioPlayer("scramble-first")
let s1 = AVAudioPlayer("scramble-second")
verify(two.playPreparedReadCueNotes([
    (player: s0, delay: 0), (player: s1, delay: 0.1)
]) == 2, "both Unscramble notes accepted")
verify(s0.immediateCalls == 1 && s0.scheduled.isEmpty, "first note audible now")
verify(s1.immediateCalls == 0 && s1.scheduled.count == 1, "second note scheduled")
verify(near(s1.scheduled[0], 100.1), "exact original 100ms interval")
let flourish = Owner()
AVAudioPlayer.deviceClock = 0
let notes = (0..<4).map { AVAudioPlayer("finish-\\($0)") }
verify(flourish.playPreparedReadCueNotes([
    (player: notes[0], delay: 0), (player: notes[1], delay: 0.09),
    (player: notes[2], delay: 0.19), (player: notes[3], delay: 0.30)
]) == 4, "original four-note finish accepts all prepared players")
verify(near(notes[1].scheduled[0], 100.09), "90ms offset")
verify(near(notes[2].scheduled[0], 100.19), "190ms offset")
verify(near(notes[3].scheduled[0], 100.30), "300ms offset")
let denied = Owner()
AVAudioPlayer.deviceClock = 0
let fail = AVAudioPlayer("denied")
fail.allowPlay = false
let cannotFollow = AVAudioPlayer("following")
verify(denied.playPreparedReadCueNotes([
    (player: fail, delay: 0), (player: cannotFollow, delay: 0.1)
]) == 0, "initial player refusal cannot schedule later ghost notes")
verify(fail.stopped && cannotFollow.stopped && denied.cues.isEmpty,
       "denied note cancels complete pattern")
let partial = Owner()
AVAudioPlayer.deviceClock = 0
let first = AVAudioPlayer("first")
let rejected = AVAudioPlayer("rejected")
rejected.allowSchedule = false
verify(partial.playPreparedReadCueNotes([
    (player: first, delay: 0), (player: rejected, delay: 0.1)
]) == 1, "failed later scheduling reports partial failure")
verify(rejected.stopped && partial.cues.count == 1,
       "failed scheduled note is released; audible first note kept")
print("R08 Swift real helper simulated device-clock cases PASS")
`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bz-r08-"));
try {
  const file = path.join(dir, "ReadCueR08.swift");
  const binary = path.join(dir, "read-cue-r08");
  fs.writeFileSync(file, swiftHarness);
  const compiler = cp.spawnSync("swiftc", ["-o", binary, file],
    {encoding: "utf8", timeout: 90000});
  assert.equal(compiler.status, 0,
    "Swift mock compiler failed:\n" + compiler.stdout + compiler.stderr);
  const executed = cp.spawnSync(binary, [], {encoding: "utf8", timeout: 12000});
  assert.equal(executed.status, 0,
    "Swift mock runtime failed:\n" + executed.stdout + executed.stderr);
  assert(executed.stdout.includes("Swift real helper simulated device-clock cases PASS"));
} finally {
  fs.rmSync(dir, {recursive: true, force: true});
}

(async () => {
  // VM-run the unchanged, actual native-only iOS adapter: an interrupted
  // pending activation may never flush queued cues after a new user gesture.
  const calls = [], listeners = {};
  let activation = null;
  const plugin = {
    addListener(name, callback) { listeners[name] = callback; return Promise.resolve({remove(){}}); },
    activateFromGesture() { return activation; },
    playCue(args) { calls.push(args); return Promise.resolve({played: true}); },
    stopCues() { calls.push({kind:"stop-cues"}); return Promise.resolve({stopped:true}); },
    stopAll() { calls.push({kind:"stop-all"}); return Promise.resolve({stopped:true}); }
  };
  const doc = {hidden:false, addEventListener(){}};
  const root = {
    document:doc, addEventListener(){},
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeReadOutput:plugin}}
  };
  vm.runInNewContext(adapter, {window:root, Promise, Object, Array, String,
    Number, Map, Math, Error, RegExp}, {filename:"native-read-my-verse-output-n7f.js"});
  const api = root.BibloZooNativeReadOutputController;
  assert(api?.enabled);
  assert.equal(typeof listeners.biblozooReadLifecycle,"function");
  let resolveFirst;
  activation = new Promise(resolve => {resolveFirst = resolve;});
  api.activateFromGesture();
  assert.equal(api.playCue("order",1),true);
  listeners.biblozooReadLifecycle({phase:"audioInterruptionBegan"});
  resolveFirst({activated:true});
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(calls.filter(c=>c.kind==="order").length,0,
    "stale pre-interruption activation cannot play a late cue");
  activation = Promise.resolve({activated:true});
  assert.equal(await api.activateFromGesture(),true);
  for(let i=1;i<=5;i++)assert(api.playCue("order",i));
  assert(api.playCue("scramble",2,false,false));
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.deepEqual(calls.filter(c=>c.kind==="order").map(c=>c.index),
    [1,2,3,4,5], "Five accepted taps dispatch separately, with no JS batching");
  assert.equal(calls.filter(c=>c.kind==="scramble").length,1);
  listeners.biblozooReadLifecycle({phase:"willResignActive"});
  assert.equal(api.playCue("order",6),false,
    "no new cue after UIKit inactive without another real gesture");
  console.log("R08 native Read cue timing + interrupted activation fencing PASS.");
})().catch(err => { console.error(err); process.exitCode = 1; });
