/* N7d.1: explicit child-gesture iOS Apple Music/AirPods audio takeover.
 * Source + real recorder-facade VM regression, NOT Mac SDK/physical evidence.
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const swift = read("ios/App/App/SceneDelegate.swift");
const js = read("verse_games/shared/native-flashcards-capture-n7c.js");
const original = read("flashcards/recording.js");
const n6 = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
function between(text, start, end) {
  const a=text.indexOf(start), b=text.indexOf(end,a+start.length);
  assert(a>=0 && b>a, "Method/observer missing: "+start);
  return text.slice(a,b);
}
const capture=between(swift,"    @objc func prepareCapture(",
  "    @objc func beginCapture(");
const play=between(swift,"    @objc func playCapture(",
  "    // Called by actual Stop Playback");
const route=between(swift,
  "forName: AVAudioSession.routeChangeNotification, object: nil,",
  "    deinit {");
const devProbe=between(swift,"    @objc func beginProbe(",
  "    // Stop and restore earlier category");
assert(capture.includes("UIApplication.shared.applicationState == .active") &&
  capture.includes('self.permissionLabel() == "granted"') &&
  capture.includes("!self.captureRunning") &&
  capture.includes("self.playbackEngine == nil"),"No passive/busy mic takeover");
assert(capture.includes("session.category == .soloAmbient") &&
  capture.includes("session.setCategory(.playAndRecord, mode: .measurement,") &&
  capture.includes("options: [.defaultToSpeaker]") &&
  capture.includes("try session.setActive(true)"),"Record uses existing nonmixing input policy");
assert(!capture.includes("!session.isOtherAudioPlaying"),
  "True Record tap cannot pre-veto Apple Music playback");
assert(capture.indexOf("self.capturePrepared = true") <
  capture.indexOf("try session.setCategory(.playAndRecord"),
  "Capture session must be owned before a potentially rejected activation");
assert(capture.includes('reason: "prepare-failed", call: nil') &&
  capture.includes('"errorCode": error.code'),
  "Actual OS rejection must roll back microphone category and report failure");
assert(play.includes("UIApplication.shared.applicationState == .active") &&
  play.includes("!self.capturePrepared, !self.captureRunning") &&
  play.includes("self.playbackGeneration == playToken") &&
  play.includes("AVAudioSession.sharedInstance().category == .soloAmbient"),
  "Play requires current foreground take, no competing capture or changed session");
assert(!play.includes("!session.isOtherAudioPlaying") &&
  !play.includes("!AVAudioSession.sharedInstance().isOtherAudioPlaying"),
  "Neither early nor late native Play may pre-veto Apple Music");
assert(play.includes("try AVAudioSession.sharedInstance().setActive(true)") &&
  play.includes("completionCallbackType: .dataPlayedBack") &&
  play.includes('reason: "start-failed"'),
  "Real OS activation, real completion event and honest OS failure remain");
assert(route.includes("guard let self = self else { return }") &&
  route.includes("if self.isProbing,") &&
  route.includes("if self.playbackEngine != nil") &&
  route.includes("if self.capturePrepared || self.captureRunning") &&
  !route.includes("guard let self = self, self.isProbing else"),
  "AirPods route changes must reach actual Flashcards input/replay owners");
assert(devProbe.includes("!session.isOtherAudioPlaying"),
  "Independent four-second DEV probe remains conservatively gated");
assert(n6.includes('blocked != "other-audio-playing"'),
  "N6h.2 existing games' real-tap takeover policy retained");
assert(js.includes("await output.devPrepareForMicrophone()") &&
  js.includes("await api.prepareCapture()") &&
  js.includes("await beforeStart()") &&
  js.includes("await api.beginCapture({limitMs})") &&
  js.includes("api.playCapture({takeId: takeMetadata.takeId})") &&
  js.includes('event.kind === "ended"'),
  "Original Record 3-2-1, Play and true completion workflow unchanged");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|AudioContext\s*\(|new Audio\s*\(/.test(js),
  "No Web/HTML fallback for native audio");
assert(original.includes("new MediaRecorder(stream") &&
  original.includes("new Audio(url)"),"Browser/PWA original unchanged");
for(const f of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
  "docs/AUDIO-RECOVERY.md","docs/N7D1-FLASHCARDS-EXPLICIT-AUDIO-TAKEOVER.md"])
  assert(read(f).includes("N7d.1"),"Update mandatory guide: "+f);
assert(read(".github/workflows/ios-prep-validation.yml")
  .includes("validate_native_n7d1_flashcards_audio_takeover.js"),
  "Experimental CI must run new regression");
new vm.Script(js);new vm.Script(original);

async function exercise({allowRecord=true,allowPlay=true}={}) {
  const events=[],listeners={},docEvents={},windowEvents={};
  const doc={hidden:false,addEventListener:(k,fn)=>docEvents[k]=fn};
  // Other music is deliberately active throughout each mock bridge call.
  // The Swift source checks above, not this mock, enforce real-gate removal.
  const mic={
    addListener(k,fn){listeners[k]=fn;return Promise.resolve({remove(){}})},
    requestPermission(){events.push("permission");return Promise.resolve({granted:true})},
    prepareCapture(){events.push("prepare-with-Apple-Music");
      return Promise.resolve({prepared:allowRecord})},
    beginCapture(){events.push("begin");return Promise.resolve({started:true,captureKey:42})},
    finishCapture(){events.push("finish");return Promise.resolve({
      ready:true,restored:true,frameCount:44100,durationMs:1000,takeId:"take-one"})},
    discardCapture(){events.push("discard");return Promise.resolve({discarded:true})},
    playCapture(){events.push("play-with-Apple-Music");
      return Promise.resolve({started:allowPlay,playToken:7})},
    stopCapturePlayback(){events.push("stop-play");return Promise.resolve({stopped:true})}
  };
  const output={devPrepareForMicrophone(){events.push("output-idle");
    return Promise.resolve({prepared:true})}};
  const win={document:doc,addEventListener:(k,fn)=>windowEvents[k]=fn,
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooMicSessionProbe:mic,BibloZooNativeSound:output}}};
  vm.runInNewContext(original,{window:win,document:doc,performance:{now:()=>0}});
  vm.runInNewContext(js,{window:win,document:doc,performance:{now:()=>0},
    setTimeout,clearTimeout});
  const recorder=win.BibloZooRecording.create();
  assert.deepEqual(events,[],"No background audio interruption before a tap");
  const outcome=await recorder.start(()=>events.push("actual-capture"),
    async()=>{events.push("3-2-1");return true},()=>6000);
  if(!allowRecord) {
    assert.equal(outcome,"failed");
    assert(!events.includes("3-2-1") && !events.includes("begin"),
      "iOS denial must not start a microphone/countdown");
    return;
  }
  assert.equal(outcome,"recording");
  assert.deepEqual(events.slice(0,5),["permission","output-idle",
    "prepare-with-Apple-Music","3-2-1","begin"]);
  recorder.stop();
  await new Promise(r=>setImmediate(r));
  assert.equal(recorder.snapshot().hasRecording,true);
  assert.equal(recorder.snapshot().playbackComplete,false);
  assert.equal(await recorder.play(),allowPlay);
  if(allowPlay) {
    assert.equal(recorder.snapshot().playbackComplete,false,
      "Even accepted takeover must not imply the voice was heard");
    listeners.biblozooCapturePlayback({kind:"ended",takeId:"take-one",playToken:7});
    assert.equal(recorder.snapshot().playbackComplete,true);
  } else {
    assert.equal(recorder.snapshot().playbackFailed,true,
      "Genuine OS rejection must leave retry/Continue Without Listening");
    assert.equal(recorder.snapshot().playbackComplete,false);
  }
  recorder.dispose();
}
Promise.resolve().then(()=>exercise())
  .then(()=>exercise({allowPlay:false}))
  .then(()=>exercise({allowRecord:false}))
  .then(()=>console.log("N7d.1 PASS: explicit Record/Play can request iOS priority; denied activation, original lifecycle and AirPods route guards checked. Physical iPhone pending."))
  .catch(error=>{console.error(error);process.exitCode=1});
