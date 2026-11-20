"use strict";
// R16b.1: focused regression for the owner's false Typewriter Welcome Back.
// Swift source contract + actual JS native output adapter VM. It is NOT a
// physical iPhone test or a Swift/Xcode SDK integration test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root,name),"utf8");
const swift = read("ios/App/App/SceneDelegate.swift");
const js = read("verse_games/shared/native-read-my-verse-output-n7f.js");
const activity = read("read_my_verse.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
function section(src,start,end){
  const i=src.indexOf(start),j=src.indexOf(end,i+start.length);
  assert(i>=0 && j>i, "missing source section "+start);
  return src.slice(i,j);
}
const plug=section(swift,"final class BibloZooNativeReadOutputPlugin","// Ghost Writer only");
const classify=section(plug,"private func isTransientTypingEffect","private var isDevBundle");
assert.match(classify,/key == "typewriter-alert" \|\| key == "keyboard-alert"/);
assert.match(classify,/key\.hasPrefix\("typewriter-"\)/);
assert.match(classify,/prefix = "typewriter-"; maximum = 3/);
assert.match(classify,/key\.hasPrefix\("keyboard-"\)/);
assert.match(classify,/prefix = "keyboard-"; maximum = 7/);
assert.match(classify,/guard let number = Int\(key\.dropFirst\(prefix\.count\)\)/);
assert.match(classify,/\(1\.\.\.maximum\)\.contains\(number\)/);
assert.match(classify,/emit\("interrupted", id: id, player: player,\s*reason: "superseded-by-spoken-verse"\)/);
assert.doesNotMatch(classify,/emit\("ended"|setCategory\(|setActive\(|notifyListeners\("biblozooReadLifecycle"/);
assert.match(classify,/clips\.removeAll\(\)\s*clipSources\.removeAll\(\)/);
assert.match(plug,/private var clipSources: \[String: String\] = \[:\]/);
const play=section(plug,"@objc func playClip(","@objc func stopClip(");
assert.match(play,/key\.hasPrefix\("verse:"\) &&\s*call\.getBool\("essentialVoice"\) == true/);
const admission=section(play,"if essentialVoice {","self.clips[id]?.stop()");
assert.match(admission,/category == \.soloAmbient/);
assert.match(admission,/self\.essentialVoiceClipId == nil/);
assert.match(admission,/self\.cues\.isEmpty/);
assert.match(admission,/self\.clips\.keys\.allSatisfy\(\{/);
assert.match(admission,/guard let source = self\.clipSources\[\$0\] else/);
assert.match(admission,/return self\.isTransientTypingEffect\(source\)/);
assert.match(admission,/"voice-overlap-unsafe"/);
assert.match(admission,/self\.clips\.count < 8 \|\| self\.clips\[id\] != nil/,
  "optional sound pool limit unchanged");
assert.match(admission,/category == \.soloAmbient else \{/,
  "optional audio never inherits playback");
const preempt=play.indexOf("self.stopTransientTypingEffectsForVoice()");
const lease=play.indexOf('BibloZooEssentialVoiceSession.begin(');
const start=play.indexOf("guard player.play() else");
assert(preempt>0 && preempt<lease && lease<start,
  "short effects must stop BEFORE playback-category lease and narrator starts");
assert(play.indexOf("guard player.prepareToPlay()")<preempt,
  "no effect loss when narrator cannot prepare");
assert.match(play,/self\.clipSources\[id\] = key/);
assert.match(play,/self\.clipSources\.removeValue\(forKey: id\)/);
assert.match(section(plug,"private func cancelAll(","@objc func activateFromGesture("),
  /clips\.removeAll\(\)\s*clipSources\.removeAll\(\)/);
assert.match(section(plug,"@objc func stopClip(","@objc func seekClip("),
  /self\.clipSources\.removeValue\(forKey: id\)/);
assert.match(section(plug,"public func audioPlayerDidFinishPlaying(","// Source-authored fixed note patterns"),
  /self\.clipSources\.removeValue\(forKey: id\)/);
assert.match(activity,/playChunkAlertSound\(\);\s*finishCurrentChunk\(\)/);
assert.match(activity,/stopKeySoundVoices\(\{ keepChunkAlert: true \}\)/);
assert.match(activity,/audio\?\.markEssentialVoice\?\.\(\)/);
assert.match(activity,/state\.activityId !== VERSE_CRAWL_ACTIVITY_ID/);
assert.match(workflow,/validate_r16b1_typewriter_effect_voice_handoff\.js/);

// Real JS adapter event handling: when an optional Typewriter alert is
// displaced, it is NOT a completed verse and cannot leave a reusable key
// player falsely "playing." The spoken verse emits its OWN real end.
const calls=[],listeners={};
const doc={hidden:false,addEventListener(){}};
const bridge={
  activateFromGesture(){return Promise.resolve({activated:true});},
  playClip(args){calls.push({op:"play",...args});return Promise.resolve({
    started:true,durationMs:1800,positionMs:0
  });},
  stopClip(args){calls.push({op:"stop",...args});return Promise.resolve({stopped:true});},
  stopAll(){return Promise.resolve({stopped:true});},
  addListener(name,fn){listeners[name]=fn;return Promise.resolve({});}
};
const rootWindow={document:doc,addEventListener(){},
  BibloZooNativeOnlyOutput:{enabled:true},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
    Plugins:{BibloZooNativeReadOutput:bridge}}};
vm.runInNewContext(js,{window:rootWindow,document:doc,Promise,console});
const api=rootWindow.BibloZooNativeReadOutputController;
async function test(){
  assert.equal(await api.activateFromGesture(),true);
  const key=new api.NativeAudio("./verse_images/read_my_verse/typewriter_1.mp3");
  const alert=new api.NativeAudio("./verse_images/read_my_verse/typewriter_alert.mp3");
  const voice=new api.NativeAudio("./verse_audio/john_11_35.mp3");
  let keyEnded=0,alertEnded=0,voiceEnded=0,optionalErrors=0;
  key.addEventListener("ended",()=>keyEnded++);
  alert.addEventListener("ended",()=>alertEnded++);
  alert.addEventListener("error",()=>optionalErrors++);
  voice.addEventListener("ended",()=>voiceEnded++);
  await key.play(); await alert.play();
  assert.equal(voice.markEssentialVoice(),true);
  await voice.play();
  const played=calls.filter(c=>c.op==="play");
  assert.equal(played[0].essentialVoice,false);
  assert.equal(played[1].essentialVoice,false);
  assert.equal(played[2].essentialVoice,true);
  const nativeEvents=listeners.biblozooReadOutput;
  assert.equal(typeof nativeEvents,"function");
  nativeEvents({kind:"interrupted",requestId:played[0].requestId,
    reason:"superseded-by-spoken-verse"});
  nativeEvents({kind:"interrupted",requestId:played[1].requestId,
    reason:"superseded-by-spoken-verse"});
  assert.equal(keyEnded,0);assert.equal(alertEnded,0);
  assert.equal(optionalErrors,1);
  assert.equal(key.paused,true);assert.equal(alert.paused,true);
  // A second key tap after narration MUST start a NEW request; no stale
  // started state after an interruption of the optional previous sample.
  nativeEvents({kind:"ended",requestId:played[2].requestId,
    positionMs:1800,durationMs:1800});
  assert.equal(voiceEnded,1);
  await key.play();
  const last=calls.filter(c=>c.op==="play").at(-1);
  assert.notEqual(last.requestId,played[0].requestId);
  assert.equal(last.essentialVoice,false);
  await api.stopAll();
  console.log("R16b.1 PASS: Typewriter optional audio preemption is source-limited; real JS key/voice lifecycle survives");
}
test().catch(e=>{console.error(e);process.exitCode=1;});
