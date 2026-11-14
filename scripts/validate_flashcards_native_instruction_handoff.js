/* Native Flashcards Record -> Listen narration. The Swift contracts below
 * are source audits; the bridge exercise is real JS, NOT an Apple SDK compile.
 * The original Record tap claims nonmixing foreground session priority. A
 * retained take may reuse it, but NEVER reclaim it after genuine interruption.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const output = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const mic = read("ios/App/App/SceneDelegate.swift");
const facade = read("verse_games/shared/native-learn-tracks.js");
const instructions = read("flashcards/instruction-audio.js");
const recording = read("verse_games/shared/native-flashcards-capture-n7c.js");
const game = read("flashcards/flashcards.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
function between(s, a, b) {
  const i = s.indexOf(a), j = s.indexOf(b, i + a.length);
  assert(i >= 0 && j > i, "Missing expected native block: " + a);
  return s.slice(i, j);
}
const outputLoad = between(output, "    public override func load() {", "    deinit {");
const handoffStart = between(output, "    @objc func devPrepareForMicrophone(",
  "    // N6o only:");
const accept = between(output, "    private func acceptFlashcardsCaptureHandoff()",
  "    private func unavailableReason()");
const micStop = between(mic, "    private func stopCaptureInternal(",
  "    @objc func finishCapture(");
const onInterruption = between(output, "    private func handleInterruption(",
  "    private func onMain(");
const normalSignal = 'Notification.Name("biblozoo.flashcards.capture-restored")';

assert(outputLoad.includes(normalSignal) && micStop.includes(normalSignal),
  "Both native plugins must use the same private completion notification");
assert(outputLoad.includes("self?.acceptFlashcardsCaptureHandoff()"),
  "Narration owner must observe native capture completion on main");
assert(handoffStart.includes("self.pendingFlashcardsMicHandoff = (") &&
       handoffStart.includes("self.needsGestureAfterInterruption = true") &&
       handoffStart.includes("self.forgetPlayback()") &&
       handoffStart.includes("self.playbackQueue.async"),
  "Capture entry must still stop output with a worker barrier and require proof on return");
assert(accept.includes("guard let pending = pendingFlashcardsMicHandoff") &&
       accept.includes("pendingFlashcardsMicHandoff = nil") &&
       accept.includes("beganEventCount - suspendedEventCount == pending.began") &&
       accept.includes("foregroundEpoch == pending.foreground") &&
       accept.includes("mediaResetCount == pending.reset") &&
       accept.includes("!wasOutsideForeground, !interrupted, !needsGestureAfterReset") &&
       accept.includes("session.category == .soloAmbient") &&
       accept.includes("!session.isOtherAudioPlaying") &&
       accept.includes("needsGestureAfterInterruption = false") &&
       accept.includes("hasGestureActivatedSession = true"),
  "Only a verified live foreground same-session mic handoff may clear the synthetic gesture gate");
assert.doesNotMatch(accept, /setActive\s*\(|setCategory\s*\(|notifyOthersOnDeactivation/,
  "Normal completion must NOT automatically claim a NEW audio session");
assert(output.includes("pendingFlashcardsMicHandoff = nil\n        forgetPlayback()") &&
       outputLoad.includes("self?.pendingFlashcardsMicHandoff = nil"),
  "Background and media-services changes must revoke the pending handoff");
assert(onInterruption.includes("pendingFlashcardsMicHandoff = nil") &&
       onInterruption.indexOf('appendTrace("interruption-suspended-history")') <
       onInterruption.indexOf("pendingFlashcardsMicHandoff = nil"),
  "A real .began blocks handoff; delayed wasSuspended history must be ignored");
assert(micStop.includes("if keep && restoreOK &&") &&
       micStop.includes('reason == "stopped-by-user" || reason == "time-limit"') &&
       micStop.includes("self.ownsFlashcardsForegroundAudio") &&
       micStop.includes("UIApplication.shared.applicationState == .active") &&
       micStop.includes("AVAudioSession.sharedInstance().category == .soloAmbient") &&
       micStop.includes("!AVAudioSession.sharedInstance().isOtherAudioPlaying") &&
       micStop.indexOf(normalSignal) < micStop.indexOf("if let call = call {"),
  "Only successful retained user/timeout take after restoration can signal BEFORE ready reaches JS");
assert(micStop.indexOf("self.savedSamples = self.captureSamples") <
       micStop.indexOf(normalSignal) &&
       micStop.includes("captureWorker.async") &&
       micStop.includes('"ready": keep') &&
       micStop.includes('"restored": restoreOK'),
  "Retained opaque RAM take and restored category must precede output handoff");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|new Audio\s*\(/.test(recording),
  "Native recording still has no browser microphone or Web media fallback");
assert(instructions.includes('id: "flashcard-instruction-listen"') &&
       game.includes('const gate = instructions()?.sync(instructionView') &&
       game.includes('if (audio?.status === "ready" && state.view === "challenge")'),
  "The unchanged comparison must still autoplay Listen on actual native ready");
assert(workflow.includes("node scripts/validate_flashcards_native_instruction_handoff.js"),
  "New safe-handoff regression must run in experimental CI");
for (const source of [facade, instructions, recording]) new vm.Script(source);

async function exerciseNativeAutoplay({restored}) {
  const listeners = new Map(), frames = [];
  const calls = {prepare:0,play:0,activate:0,stops:0};
  const doc = {hidden:false,addEventListener(){}};
  const bridge = {
    addListener(name, listener) {
      listeners.set(name, listener);
      return Promise.resolve({remove(){}});
    },
    activateFromGesture() {
      calls.activate += 1;
      return Promise.resolve({ready:true});
    },
    prepareNarration({soundId,requestId}) {
      calls.prepare += 1;
      if (!restored) return Promise.resolve({
        prepared:false,reason:"gesture-required-after-interruption"});
      return Promise.resolve({prepared:true,soundId,requestId,durationMs:1200});
    },
    playNarration({requestId}) {
      calls.play += 1;
      return Promise.resolve({accepted:true,requestId});
    },
    getNarrationState() { return Promise.resolve({prepared:false}); },
    stopNarration() { calls.stops += 1; return Promise.resolve({stopped:true}); },
    seekNarration() { return Promise.resolve({seeked:true}); }
  };
  const win = {
    document:doc,
    addEventListener(){},
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{
      isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:bridge}
    },
    requestAnimationFrame(f) { frames.push(f); return frames.length; },
    setTimeout,clearTimeout,setInterval,clearInterval,
    Audio() { throw Error("No HTML audio fallback on Audio Test"); }
  };
  vm.runInNewContext(facade,{window:win});
  vm.runInNewContext(instructions,{window:win});
  let changes = 0;
  const owner=win.BibloZooFlashcardsInstructions.create({
    onChange:()=>{changes++;},
    onError:()=>{},
    isMuted:()=>false
  });
  const state=owner.sync("comparison","really_well","john_3_16");
  assert.equal(state.locked,true);
  frames.splice(0).forEach(f=>f());
  for(let i=0;i<30;i++) await Promise.resolve();
  assert.equal(calls.prepare,1,"Single prepare after completed take");
  assert.equal(calls.activate,0,
    "Automatic comparison must not invent a new explicit gesture/activation");
  if (restored) {
    assert.equal(calls.play,1);
    assert.equal(owner.snapshot().locked,true,
      "Native accepted/play ACK is NOT completion");
    listeners.get("biblozooNarration")({
      type:"ended",soundId:"flashcard-instruction-listen",
      requestId:10000001
    });
    for(let i=0;i<30;i++) await Promise.resolve();
    assert.equal(owner.snapshot().locked,false,
      "Only genuine AVAudioPlayer ended unlocks Play My Recording");
    owner.sync("comparison","really_well","john_3_16");
    assert.equal(calls.prepare,1,"No repeat after ordinary UI rerender");
  } else {
    assert.equal(calls.play,0);
    assert.equal(owner.snapshot().failed,true,
      "External interruption must remain safely gated, not silently unlock");
  }
  owner.stop();
  assert.equal(owner.snapshot().locked,false);
  assert(changes>=1);
}
(async () => {
  await exerciseNativeAutoplay({restored:true});
  await exerciseNativeAutoplay({restored:false});
  console.log("Flashcards mic handoff PASS: retained same-session native completion auto-narrates without a second tap; failed/external transition never auto-activates, and only real ended unlocks.");
})().catch(error=>{console.error(error);process.exitCode=1;});
