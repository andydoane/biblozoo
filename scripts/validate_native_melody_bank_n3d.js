"use strict";
// N3d's fixed native Melody bank is unchanged; N4a now routes gameplay to it.
// Source contracts do not compile AVFAudio or demonstrate speaker audibility.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const dev=read("verse_games/shared/native-sound-smoke-test.js");
const game=read("daily_questions_feed_game.js");
const pilot=read("verse_games/shared/feeding-native-audio-pilot.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const section=(str,a,b)=>{
 const x=str.indexOf(a), y=str.indexOf(b,x+a.length);
 assert.ok(x>=0&&y>x,"section missing: "+a);return str.slice(x,y);
};
const setup=section(swift,"    private func preparePCMEffectOnWorker(",
  "    private func forgetPlayback()");
const preload=section(swift,"    @objc func preload(","    @objc func play(");
const play=section(swift,"    @objc func play(","    @objc func stop(");
const stop=section(swift,"    @objc func stop(","\n}");
const melodyGame=section(game,"  function playMelodyTone(runtime, midi) {",
  "  function stopMelodyVoices(runtime) {");
assert.match(swift,/private let nativeMelodySoundID = "feed-melody"/);
assert.match(swift,/private let melodyMidiRange = 55\.\.\.83/);
assert.match(swift,/private let melodyVoiceLimit = 6/);
assert.match(swift,/private var melodyToneBuffers: \[Int: AVAudioPCMBuffer\]/);
assert.match(setup,/private func prepareMelodyTonesOnWorker\(\)/);
assert.match(setup,/melodyToneBuffers\.count == melodyMidiRange\.count/);
assert.match(setup,/let frames = AVAudioFrameCount\(ceil\(format\.sampleRate \* 0\.22\)\)/);
assert.match(setup,/for midi in melodyMidiRange/);
assert.match(setup,/440\.0 \* pow\(2\.0, Double\(midi - 69\) \/ 12\.0\)/);
assert.match(setup,/1\.0 - 4\.0 \* abs\(phase - 0\.5\)/);
assert.match(setup,/if time < 0\.012/);
assert.match(setup,/for _ in 0\.\.<melodyVoiceLimit/);
assert.match(setup,/node\.play\(\) \/\/ warm silently until a deliberate native note/);
assert.match(setup,/nextEffectVoice\[nativeMelodySoundID\] = 0/);
assert.match(preload,/soundId == self\.nativeMelodySoundID/);
assert.match(preload,/self\.prepareMelodyTonesOnWorker\(\)/);
assert.match(preload,/backend = "avengine-melody"/);
assert.match(play,/let midi = call\.getInt\("midi"\)/);
assert.match(play,/self\.melodyMidiRange\.contains\(midi\)/);
assert.match(play,/"reason": "invalid-melody-midi"/);
assert.match(play,/self\.melodyToneBuffers\[requestedMidi \?\? -1\]/);
assert.match(play,/let node = self\.nextWarmVoiceOnWorker\(soundId: soundId\)/);
assert.match(play,/node\.scheduleBuffer\(readyBuffer, at: nil,[\s\S]*?options: \[\.interrupts\]/);
// Same native worker now also labels prewarmed Snake orb PCM separately.
assert.match(play,/"avengine-melody"[\s\S]*?"avengine-pcm"/);
assert.doesNotMatch(play.replace(/\/\/[^\n]*/g,""),
  /AVAudioFile\(|AVAudioPCMBuffer\(|AVAudioEngine\(|engine\.start\(|node\.play\(|setCategory\(|setMode\(/,
  "no allocation/engine startup/session mutation during native note dispatch");
assert.match(stop,/soundId == self\.nativeMelodySoundID/);
assert.match(swift,/melodyToneBuffers\.removeAll\(\)/);
assert.match(swift,/playbackEpoch &\+= 1/);
assert.match(swift,/UIApplication\.willResignActiveNotification/);
assert.match(swift,/UIPasteboard\.general\.string = self\.timingReportText\(\)/);
assert.match(dev,/const MELODY_ID = "feed-melody"/);
assert.match(dev,/const MELODY_TEST_MIDI = 64/);
assert.match(dev,/sampleButton\("Melody E4"\)/);
assert.match(dev,/api\.activateFromGesture\(\{ purpose: "dev" \}\)/);
assert.match(dev,/api\.preload\(\{ soundId \}\)/);
assert.match(dev,/soundId === MELODY_ID[\s\S]*?\{ soundId, volume: 0\.25, midi: MELODY_TEST_MIDI \}/);
assert.match(dev,/playMelody\.addEventListener\("click"/);
assert.match(dev,/panel\.setAttribute\("data-no-ui-sound", ""\)/);
assert.match(melodyGame,/context\.createOscillator\(\)/);
assert.match(melodyGame,/oscillator\.type = "triangle"/);
assert.match(melodyGame,/runtime\.nativePilot\.play\("feed-melody"/,
  "N4a now routes real Melody catch notes to N3d's fixed Swift bank");
assert.match(game,/session\.dailyTodoPreview === true && mode === FEED_MODES\.CLASSIC/,
  "Classic preview selection must remain intact in N4a");
assert.match(game,/nativeOnlyApp && \[FEED_MODES\.CLASSIC, FEED_MODES\.MELODY, FEED_MODES\.LABYRINTH, FEED_MODES\.BOUNCE\]\.includes\(mode\)/,
  "Native-only Classic/Melody/Labyrinth/Bounce remain enabled in Audio Test iOS");
assert.match(pilot,/const IDS = Object\.freeze\(\["feed-star", "feed-chomp", "feed-peg"\]\)/,
  "Classic pilot remains unaffected by DEV Melody bank");
assert.match(workflow,/node scripts\/validate_native_melody_bank_n3d\.js/);
const noComments=swift.replace(/\/\/[^\n]*/g,"");
assert.doesNotMatch(noComments,/\.setCategory\(|\.setMode\(|\.setActive\(false\)/);
assert.equal((noComments.match(/\.setActive\(true\)/g)||[]).length,1);
// Check fixed bank covers all notes currently in the Melody tune inventory.
// The actual tune collection is static; no generated phrases/tunes are played.
const tunes=section(game,"const FEED_MELODIES = Object.freeze([",
  "const FEED_MELODY_ROTATION_IDS");
const raw=[...tunes.matchAll(/(?:midi:\s*(\d+)|\b(4\d|[5-8]\d)\s*[,}])/g)]
  .map(m=>Number(m[1]||m[2]));
assert.ok(raw.length>40);
assert.ok(raw.every(m=>Number.isInteger(m)&&m>=55&&m<=83),
  "all existing Melody MIDI notes must fit the fixed native note bank");
console.log("N3d fixed Melody bank, six voices, DEV E4 and N4a isolated gameplay routing/lifecycle passed.");
