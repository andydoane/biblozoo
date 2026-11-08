"use strict";
// N3b experiment contracts: source/VM, not Swift compilation or audibility.
// Exercises actual JS pilot and actual native-only Resume label function.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const feeding = read("daily_questions_feed_game.js");
const pilotSource = read("verse_games/shared/feeding-native-audio-pilot.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");

function between(src, start, end) {
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a, "source section missing: "+start);
  return src.slice(a,b);
}
function assertSourceContract() {
  const setup=between(swift, "    private func preparePCMEffectOnWorker(",
    "    private func forgetPlayback(");
  const preload=between(swift, "    @objc func preload(", "    @objc func play(");
  const play=between(swift, "    @objc func play(", "    @objc func stop(");
  assert.match(swift, /private let nativePegSoundID = "feed-peg"/);
  assert.match(swift, /private let pegFrequencies: \[Double\] = \[[\s\S]*?523\.25, 659\.25, 783\.99, 1046\.5, 1318\.51, 1567\.98/);
  assert.match(swift, /private let sampleVoiceLimit = 2/);
  assert.match(swift, /private let pegVoiceLimit = 4/);
  assert.match(swift, /private var effectNodes: \[String: \[AVAudioPlayerNode\]\]/);
  assert.match(swift, /private var pegToneBuffers: \[Int: AVAudioPCMBuffer\]/);
  assert.match(setup, /private func preparePegTonesOnWorker\(\)/);
  assert.match(setup, /for \(note, frequency\) in pegFrequencies\.enumerated\(\)/);
  assert.match(setup, /let frames = AVAudioFrameCount\(ceil\(format\.sampleRate \* 0\.105\)\)/);
  assert.match(setup, /sin\(2 \* Double\.pi \* frequency \* t\) \* envelope/);
  assert.match(setup, /for _ in 0\.\.<pegVoiceLimit/);
  assert.match(setup, /for _ in 0\.\.<sampleVoiceLimit/);
  assert.match(setup, /node\.play\(\) \/\/ silent until a real Classic peg collision/);
  assert.match(setup, /private func nextWarmVoiceOnWorker\(soundId: String\)/);
  assert.match(preload, /if soundId == self\.nativePegSoundID/);
  assert.match(preload, /self\.preparePegTonesOnWorker\(\)/);
  assert.match(preload, /backend = "avengine-tone"/);
  assert.match(play, /let noteIndex = call\.getInt\("noteIndex"\)/);
  // N6b shares the index-validated play path with Snake's fixed six orb tones.
  assert.match(play, /self\.pegFrequencies\.count/);
  assert.match(play, /\(0\.\.<count\)\.contains\(noteIndex\)/);
  assert.match(play, /"reason": "invalid-peg-note"/);
  assert.match(play, /buffer = self\.pegToneBuffers\[requestedNoteIndex \?\? -1\]/);
  assert.match(play, /let node = self\.nextWarmVoiceOnWorker\(soundId: soundId\)/);
  assert.match(play, /node\.scheduleBuffer\(readyBuffer, at: nil,[\s\S]*?options: \[\.interrupts\]/);
  assert.match(play, /\? "avengine-tone"[\s\S]*?"avengine-melody"[\s\S]*?"avengine-pcm"/);
  assert.doesNotMatch(play.replace(/\/\/[^\n]*/g, ""),
    /AVAudioFile\(|AVAudioPCMBuffer\(|AVAudioEngine\(|engine\.start\(|node\.play\(|setCategory\(|setMode\(/,
    "no sound graph creation/decoding on the hot collision path");
  assert.match(swift, /playbackEpoch &\+= 1/);
  assert.match(swift, /self\.discardEffectsOnWorker\(\)/);
  assert.match(swift, /UIPasteboard\.general\.string = self\.timingReportText\(\)/);
  const noComments=swift.replace(/\/\/[^\n]*/g,"");
  assert.doesNotMatch(noComments, /\.setCategory\(|\.setMode\(|\.setActive\(false\)/);
  assert.equal((noComments.match(/\.setActive\(true\)/g)||[]).length,1);
  assert.match(workflow,/node scripts\/validate_native_peg_voices_n3b\.js/);
}

async function checkPilot() {
  const requests=[], preloads=[], stops=[], activation=[];
  const sdk = {
    activateFromGesture: async args=>{activation.push(args.purpose);return {ready:true};},
    preload: async ({soundId})=>{preloads.push(soundId);return {prepared:true};},
    play: async payload=>{requests.push(payload);return {accepted:true};},
    stop: async ({soundId})=>{stops.push(soundId);return {stopped:true};}
  };
  const window={
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:sdk}},
    document:{hidden:false},setTimeout,clearTimeout
  };
  vm.runInNewContext(pilotSource, {window,Promise,Date,Error,setTimeout,clearTimeout},
    {filename:"feeding-native-audio-pilot.js"});
  const controller=window.BibloZooFeedingNativeAudioPilot.create({isCurrent:()=>true});
  assert.deepEqual(JSON.parse(JSON.stringify(await controller.prepare())),
    {ready:true,reason:"prepared"});
  assert.deepEqual(activation,["feeding"]);
  assert.deepEqual(preloads,["feed-star","feed-chomp","feed-peg"]);
  const stamp=Date.now()-10;
  assert.equal(controller.play("feed-peg",0.2,stamp,0),true);
  assert.equal(controller.play("feed-peg",0.2,stamp+1,5),true);
  assert.equal(controller.play("feed-star",0.78,stamp+2),true);
  assert.equal(controller.play("feed-peg",0.2,stamp,6),false);
  assert.equal(controller.play("feed-peg",0.2,stamp,-1),false);
  assert.equal(controller.play("feed-peg",0.2,stamp,0.5),false);
  assert.equal(controller.play("feed-peg",0.2,stamp),false);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,3);
  assert.deepEqual(requests.map(x=>[x.soundId,x.noteIndex]),[
    ["feed-peg",0],["feed-peg",5],["feed-star",undefined]
  ]);
  assert.ok(requests.every(x=>x.eventId.startsWith("feed-")));
  assert.ok(requests.every(x=>Number.isFinite(x.requestEpochMs)));
  assert.equal(requests[2].noteIndex,undefined);
  controller.stop();
  assert.deepEqual(stops,["feed-star","feed-chomp","feed-peg"]);
  assert.equal(controller.play("feed-peg",0.2,stamp,0),false,
    "after stop, no audio may dispatch until another tap-driven preparation");
}

function checkResumeLabel() {
  const src=between(feeding,
    "  function setFeedingResumeStatus(runtime, message = \"\") {",
    "  // Developer-only manual test.");
  const actions=[];
  const window={BibloZooWelcomeBack:{setAction(_overlay,options){actions.push(options);}}};
  const sandbox={window};
  vm.runInNewContext(src+"\nthis.setStatus=setFeedingResumeStatus;",sandbox,
    {filename:"Native Feeding welcome-back label"});
  const runtime={
    nativePilotBackend:"native",
    feedResumePending:true,
    resumeStatus:{textContent:"",hidden:true},
    resumeOverlay:{},
    resumeButton:{textContent:"Let's go!",disabled:true},
    zooEscape:{isPaused:()=>false}
  };
  sandbox.setStatus(runtime,"Preparing native sounds…");
  assert.equal(actions.at(-1).retry,false,"preparing must NOT display Try again");
  assert.equal(actions.at(-1).busy,true);
  assert.equal(runtime.resumeStatus.textContent,"Preparing native sounds…");
  runtime.feedResumePending=false;
  sandbox.setStatus(runtime,"Native sounds unavailable (interruption-pending). Tap Resume again or Back.");
  assert.equal(actions.at(-1).retry,true,"real failure must permit a visible retry");
  assert.equal(actions.at(-1).busy,false);
  sandbox.setStatus(runtime,"");
  assert.equal(actions.at(-1).retry,false);
  assert.equal(actions.at(-1).busy,false);
  runtime.nativePilotBackend="web";runtime.feedResumePending=true;
  sandbox.setStatus(runtime,"Sound needs a moment");
  assert.equal(actions.at(-1).retry,true,"legacy Web status semantics remain");
  const noShared={window:{}};
  vm.runInNewContext(src+"\nthis.setStatus=setFeedingResumeStatus;",noShared);
  runtime.nativePilotBackend="native";runtime.feedResumePending=true;
  noShared.setStatus(runtime,"Preparing native sounds…");
  assert.equal(runtime.resumeButton.textContent,"Let's go!",
    "native fallback label also stays Let's go! during preparation");
  runtime.feedResumePending=false;
  noShared.setStatus(runtime,"Native sounds unavailable.");
  assert.equal(runtime.resumeButton.textContent,"Try again!");
}
async function run(){
  assertSourceContract();
  await checkPilot();
  checkResumeLabel();
  console.log("N3b native six-note PCM pools, validated bridge, and safe Resume label passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
