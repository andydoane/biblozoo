/* N7a — source-contract audit of recording input and WebAudio DSP only.
 * This deliberately cannot test real mic permission, capture or speaker sound.
 * N7a modifies docs/CI only, so do not treat a PASS as native recording.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const base=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(base,p),"utf8");
const recorder=read("flashcards/recording.js");
const ui=read("flashcards/flashcards.js");
const effects=read("flashcards/audio-effects.js");
const readMyVerse=read("read_my_verse.js");
const guard=read("verse_games/shared/native-only-ios-output.js");
const plist=read("ios/App/App/Info.plist");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const testing=read("docs/TESTING.md");
const recovery=read("docs/AUDIO-RECOVERY.md");
const audit=read("docs/N7A-NATIVE-RECORDING-DSP-AUDIT.md");

const has=(s,t,why)=>assert(s.includes(t),why+": missing "+JSON.stringify(t));

// Read-only audit: the original Flashcards capture is browser INPUT,
// which N1 purposely leaves available, NOT a native capture implementation.
has(recorder,"navigator.mediaDevices.getUserMedia({ audio: true })",
  "Existing explicit microphone request remains intact");
has(recorder,"new MediaRecorder(stream",
  "Original browser capture lifecycle is still present");
has(recorder,"beforeStart()",
  "User-visible countdown must gate beginning of actual capture");
has(recorder,"recorder.start()",
  "Capture begins only after original countdown and microphone setup");
has(recorder,"status = \"stopping\"",
  "Stop state is distinct from fully ready recording");
has(recorder,"recorder.ondataavailable",
  "Async final captured audio chunks stay guarded by generation");
has(recorder,"new Blob(chunks",
  "Original output is a temporary in-memory recording");
has(recorder,"URL.createObjectURL(blob)",
  "Source creates ephemeral recorded-take reference");
has(recorder,"URL.revokeObjectURL(url)",
  "Source disposes ephemeral take and prevents long-lived URL");
has(recorder,"player = new Audio(url)",
  "Original normal replay is browser audio and NOT native output");
has(recorder,"meterContext.createAnalyser()",
  "Original meter requires unavailable AudioContext on experimental iOS");
has(recorder,"meterContext.createMediaStreamSource(stream)",
  "Meter uses input stream, not recording output");
has(recorder,"meterSink.gain.value = 0",
  "Original microphone must never monitor audibly through speakers");
has(recorder,"recordingDeadline = performance.now() + limit",
  "Original bounded recording duration must survive migration");
has(recorder,"120000","Original default take-length fallback retained");
has(recorder,'document.addEventListener("visibilitychange"',
  "Recording must stop cleanly on real backgrounding");
has(recorder,"onInterrupted?.()",
  "Interrupted captures report state rather than falsely finishing");

// Flashcards' caller owns the actual 3-second countdown and never
// auto-resumes mic or Wacky DSP after Welcome Back. Wacky eligibility
// should be consumed only on real processor start, not button click.
has(ui,"countdownRemaining = 3",
  "Original visible 3-2-1 countdown retained");
has(ui,"recording?.interruptCapture?.()",
  "No background automatic microphone continuation");
has(ui,"recording.playFun(preset, () =>",
  "Original Wacky callback only when processor actually starts");
has(ui,"consumeWackyReplay()",
  "Exactly-once Wacky eligibility source still present");
has(ui,"wackyReplayConsumed",
  "Original replay one-use policy must be source-backed");
has(ui,"recording?.dispose()",
  "Temporary recording must be disposed on fresh run/exit");
has(effects,"const OFFICIAL_PRESET_IDS",
  "Original Wacky preset inventory is explicit");
const inventory=effects.match(/const OFFICIAL_PRESET_IDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
assert(inventory,"Original official preset array must remain");
const ids=Array.from(inventory[1].matchAll(/"([^"]+)"/g),x=>x[1]);
assert.deepEqual(ids,[
  "squirrel","giant","sleepy","rocket","roller_coaster",
  "ascending","descending","demon","chorus_alien","cave"
],"Must source-audit all TEN official Wacky presets without accidental omission");
has(effects,"vendor/soundtouchjs-2.1.1/",
  "Original licensed DSP library path must be audited separately");
has(effects,"window.AudioWorkletNode",
  "Original Wacky DSP requires WebAudio worklet");
has(effects,"audioContext.createConvolver()",
  "Character effects include convolution/reverb");
has(effects,"runtime.context.destination",
  "Original DSP produces audible browser output");
has(effects,"onStarted?.()",
  "One-use Wacky eligibility is based on actual processor start");

// Very important scope correction: this Read My Verse source is OUTPUT,
// not a microphone recorder. No inventing a Read My Verse input pipeline.
assert(!/\bgetUserMedia\b|\bMediaRecorder\b|\bNSMicrophoneUsageDescription\b/.test(readMyVerse),
  "Read My Verse is not currently a mic-recording implementation");
has(readMyVerse,"new AudioContextClass()",
  "Read My Verse retains browser effect output that N1 suppresses");
has(readMyVerse,"CRAWL_MUSIC_SRC",
  "Read My Verse has browser media/music that needs output-only reconciliation");

// N1 output guard blocks the old replay and DSP while preserving INPUT.
// Never silently resurrect a WebAudio/HTML fallback on experimental iOS.
has(guard,'hideWebAudioConstructor("AudioContext")',
  "iOS experiment still blocks Web Audio output");
has(guard,'hideWebAudioConstructor("webkitAudioContext")',
  "iOS experiment blocks Safari Web Audio constructor");
has(guard,"HTMLMediaElement.play",
  "iOS experiment rejects browser audible media replay");
has(guard,"getUserMedia",
  "N1 explicitly explains untouched recording-input API boundary");
has(plist,"NSMicrophoneUsageDescription",
  "Retain original iOS recording microphone privacy purpose");
has(plist,"Recordings are not saved or uploaded.",
  "Do not introduce secret permanent recording storage");

for(const stage of ["N7a","N7b","N7c","N7d","N7e","N7f","N7g"]) {
  has(handoff,stage,"Living handoff needs complete staged N7 subroadmap");
  has(audit,stage,"Dedicated N7a document must describe stage and exit gate");
}
has(handoff,"Playground 5/5",
  "Owner confirmed ALL FIVE Playground activities, including Ghost Writer and Verse Jam");
has(audit,"Ghost Writer #59","Record actual Ghost Writer owner PASS");
has(audit,"Verse Jam after N6q.5",
  "Record owner Verse Jam done-for-now acceptance");
has(audit,"No runtime","Clearly label docs-only scope");
has(testing,"N7a","Testing must distinguish source audit from real physical mic gate");
has(recovery,"N7a","Recovery handoff must include sensitive input guardrails");
has(workflow,"validate_native_n7_recording_audit_n7a.js",
  "Experiment CI must actually run this regression");
has(workflow,"swiftc -frontend -parse",
  "Retain existing real full-file Swift grammar check");

console.log("N7a PASS: Flashcards source recording/input/meter/one-use Wacky contract, TEN original DSP presets, Read My Verse output-only scope, experiment-only Web output blockade, microphone privacy, N6 Playground 5/5 owner acceptance and seven-stage N7 handoff. No physical mic or audible playback PASS implied.");
