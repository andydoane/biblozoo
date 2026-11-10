/* N7d.2: a real Flashcards tap owns nonmixing foreground audio until
 * another app takes over. Source/VM contracts, NOT Mac Xcode or AirPods proof.
 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const assert=require("assert/strict");
const base=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const native=read("verse_games/shared/native-flashcards-capture-n7c.js");
const original=read("flashcards/recording.js");
const n6=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const slice=(s,start,end)=>{
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  assert(a>=0&&b>a,"Missing method: "+start);
  return s.slice(a,b);
};
const plugin=slice(swift,"@objc(BibloZooMicSessionProbePlugin)","    @objc func getProbeState(");
const load=slice(plugin,"    public override func load() {","    deinit {");
const prepare=slice(plugin,"    @objc func prepareCapture(","    @objc func beginCapture(");
const stop=slice(plugin,"    private func stopCaptureInternal(","    @objc func finishCapture(");
const play=slice(plugin,"    @objc func playCapture(","    // Called by actual Stop Playback");
const stopPlay=slice(plugin,"    private func stopPlaybackInternal(","    @objc func stopCapturePlayback(");
const route=slice(load,"forName: AVAudioSession.routeChangeNotification, object: nil,","    deinit {");
const onInterrupt=slice(load,"forName: AVAudioSession.interruptionNotification, object: nil,",
  "// UIKit inactive/background or real media-services loss/reset");
assert(plugin.includes("private var ownsFlashcardsForegroundAudio = false") &&
  plugin.includes("private func releaseFlashcardsAudioPriority()"),
  "No passive session acquisition; explicit ownership must be tracked");
const release=slice(plugin,"    private func releaseFlashcardsAudioPriority()","    private func onMain(");
assert(release.includes("guard ownsFlashcardsForegroundAudio else { return }") &&
  release.includes("ownsFlashcardsForegroundAudio = false") &&
  release.includes("setActive(false)") &&
  !release.includes("notifyOthersOnDeactivation"),
  "Only an owned foreground session may be released; no auto music resume notification");
assert(onInterrupt.includes("AVAudioSessionInterruptionTypeKey") &&
  onInterrupt.includes("AVAudioSession.InterruptionType.began.rawValue") &&
  onInterrupt.includes("self.stopCaptureInternal(retain: false,") &&
  onInterrupt.includes("self.stopPlaybackInternal(reason: \"interrupted\"") &&
  onInterrupt.includes("self.releaseFlashcardsAudioPriority()"),
  "Only a genuine interruption BEGIN cancels capture/voice and releases priority");
assert(!onInterrupt.includes("AVAudioSession.InterruptionType.ended.rawValue"),
  "An end-of-interruption notice is NOT a new capture interruption");
assert(load.includes("UIApplication.willResignActiveNotification") &&
  load.includes("UIApplication.didEnterBackgroundNotification") &&
  load.includes("AVAudioSession.mediaServicesWereResetNotification") &&
  load.includes("self?.releaseFlashcardsAudioPriority()"),
  "Background and media reset must relinquish priority without auto restarting mic");
assert(route.includes("AVAudioSessionRouteChangeReasonKey") &&
  route.includes("AVAudioSession.RouteChangeReason(") &&
  route.includes("case .oldDeviceUnavailable, .newDeviceAvailable,") &&
  route.includes(".noSuitableRouteForCategory:") &&
  route.includes("default:") &&
  route.includes("if self.captureRunning ||"),
  "Route-change handling must classify real loss vs category/AirPods setup changes");
assert(!route.includes("Date().timeIntervalSince(prepared) >= 0.5"),
  "An arbitrary 0.5s guard should not turn delayed category changes into mic cancellation");
assert(prepare.includes("self.ownsFlashcardsForegroundAudio = true") &&
  prepare.indexOf("try session.setActive(true)") <
  prepare.indexOf("self.ownsFlashcardsForegroundAudio = true") &&
  prepare.includes("self.capturePrepared = true"),
  "Record only claims priority AFTER successful OS activation, with rollback");
assert(play.includes("self.ownsFlashcardsForegroundAudio = true") &&
  play.indexOf("try AVAudioSession.sharedInstance().setActive(true)") <
  play.indexOf("self.ownsFlashcardsForegroundAudio = true"),
  "Recorded-voice Play must claim priority only after a real user-tap activation");
assert(stop.includes('reason == "stopped-by-user"') &&
  stop.includes('reason == "time-limit"') &&
  stop.includes("captureRestoreOK = categoryRestored") &&
  stop.includes("if !keepPriority || !categoryRestored") &&
  stop.includes("self.releaseFlashcardsAudioPriority()") &&
  !stop.includes("setActive(false, options: [.notifyOthersOnDeactivation])"),
  "Completed mic capture restores soloAmbient while foreground priority remains active");
assert(stopPlay.includes('reason != "ended"') &&
  stopPlay.includes('reason != "stopped-by-user"') &&
  stopPlay.includes('reason != "discarded"') &&
  stopPlay.includes("self.releaseFlashcardsAudioPriority()") &&
  !stopPlay.includes("setActive(false,") &&
  !stopPlay.includes("notifyOthersOnDeactivation"),
  "Normal Play completion and user Stop must not auto-resume Apple Music");
assert(play.includes("completionCallbackType: .dataPlayedBack") &&
  play.includes("self.playbackGeneration == playToken") &&
  stopPlay.includes("playbackGeneration += 1"),
  "Playback completed only after real dataPlayedBack and stale callbacks stay cancelled");
assert(plugin.includes("self.savedSamples = self.captureSamples") &&
  plugin.includes("self.savedTakeId = savedId") &&
  plugin.includes("captureWorker.async"),
  "Temporary recorded voice still only lives in native RAM");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|AudioContext\s*\(|new Audio\s*\(/.test(native),
  "No WebAudio / HTML fallback inside the experiment");
assert(original.includes("new MediaRecorder(stream") &&
  original.includes("new Audio(url)"),"Original browser audio remains unchanged");
assert(n6.includes('blocked != "other-audio-playing"'),
  "Prior owner-approved Home/game PiP gesture takeover remains intact");
for(const file of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
  "docs/AUDIO-RECOVERY.md","docs/N7D2-FLASHCARDS-FOREGROUND-AUDIO-OWNERSHIP.md"])
  assert(read(file).includes("N7d.2"),"Missing owner handoff update: "+file);
assert(read(".github/workflows/ios-prep-validation.yml")
  .includes("validate_native_n7d2_flashcards_foreground_audio_ownership.js"),
  "Mandatory experimental CI gate missing");
new vm.Script(original);new vm.Script(native);

// Run the actual native recorder facade against an explicit interruption
// and a genuine native-ended event, not a fake bridge "started" completion.
const listeners={},changes=[],events=[],docEvents={},winEvents={};
const doc={hidden:false,addEventListener:(name,fn)=>{docEvents[name]=fn;}};
const mic={
  addListener(name,fn){listeners[name]=fn;return Promise.resolve({remove(){}})},
  requestPermission(){events.push("permission");return Promise.resolve({granted:true})},
  prepareCapture(){events.push("prepare");return Promise.resolve({prepared:true})},
  beginCapture(){events.push("begin");return Promise.resolve({started:true,captureKey:9})},
  finishCapture(){events.push("finish");return Promise.resolve({
    ready:true,restored:true,frameCount:44100,durationMs:1000,takeId:"take-owned"})},
  discardCapture(){events.push("discard");return Promise.resolve({discarded:true})},
  playCapture(){events.push("play");return Promise.resolve({started:true,playToken:9})},
  stopCapturePlayback(){events.push("stop-play");return Promise.resolve({stopped:true})}
};
const output={devPrepareForMicrophone(){events.push("output-drained");
  return Promise.resolve({prepared:true})}};
const win={document:doc,addEventListener:(name,fn)=>winEvents[name]=fn,
  BibloZooNativeOnlyOutput:{enabled:true},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
    Plugins:{BibloZooMicSessionProbe:mic,BibloZooNativeSound:output}}};
vm.runInNewContext(original,{window:win,document:doc,performance:{now:()=>0}});
vm.runInNewContext(native,{window:win,document:doc,performance:{now:()=>0},
  setTimeout,clearTimeout});
async function main() {
  const recorder=win.BibloZooRecording.create({
    onInterrupted:()=>changes.push("interrupted")});
  assert.equal(await recorder.start(()=>events.push("recording"),
    async()=>{events.push("countdown");return true},()=>6000),"recording");
  assert.deepEqual(events,["permission","output-drained","prepare",
    "countdown","begin","recording"]);
  listeners.biblozooCaptureLifecycle({kind:"interrupted",reason:"interrupted"});
  assert.equal(recorder.snapshot().hasRecording,false,
    "A NEW Apple Music/AirPods Play must still cancel mic");
  assert(changes.includes("interrupted"));
  assert.equal(events.includes("finish"),false,
    "Interrupted mic cannot retain a fake ready take");
  const retry=win.BibloZooRecording.create();
  assert.equal(await retry.start(()=>{},async()=>true,()=>6000),"recording");
  retry.stop();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(retry.snapshot().hasRecording,true);
  assert.equal(await retry.play(),true);
  assert.equal(retry.snapshot().playbackComplete,false,
    "OS-granted playback priority is NOT listened-to completion");
  listeners.biblozooCapturePlayback({
    kind:"ended",takeId:"take-owned",playToken:9});
  assert.equal(retry.snapshot().playbackComplete,true,
    "Only a real matching native completion event unlocks the next step");
  retry.dispose();
  console.log("N7d.2 PASS: native foreground ownership, genuine .began and physical route guards, no auto Apple Music resumption, original RAM/JS cancellation and .dataPlayedBack completion. Apple iPhone test still required.");
}
main().catch(err=>{console.error(err);process.exitCode=1});
