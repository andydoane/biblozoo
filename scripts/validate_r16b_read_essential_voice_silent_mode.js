"use strict";
// R16b: actual Read JS controller VM + source/ownership regression. No iOS
// SDK link or physical speaker proof. Crawl remains excluded from the
// separate per-verse lease, even when its soundtrack is toggled off.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const scene = read("ios/App/App/SceneDelegate.swift");
const sound = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const adapter = read("verse_games/shared/native-read-my-verse-output-n7f.js");
const activity = read("read_my_verse.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const plist = read("ios/App/App/Info.plist");
function block(src, start, end) {
  const a=src.indexOf(start);
  assert(a>=0, "missing source " + start);
  const b=src.indexOf(end,a+start.length);
  assert(b>a, "missing ending " + end);
  return src.slice(a,b);
}
const lease=block(scene, "enum BibloZooEssentialVoiceSession", "class SceneDelegate:");
assert.match(lease, /static func begin\(owner requested: String\) -> Bool/);
assert.match(lease, /static func end\(owner requested: String\) -> Bool/);
assert.match(lease, /session\.setCategory\(\.playback, mode: \.default, options: \[\]\)/);
assert.match(lease, /session\.setCategory\(\.soloAmbient, mode: \.default, options: \[\]\)/);
const plug=block(scene, "final class BibloZooNativeReadOutputPlugin", "// Ghost Writer only");
assert.match(plug, /private var essentialVoiceClipId: String\?/);
assert.match(plug, /private func releaseEssentialVoice\(for id: String\? = nil\)/);
assert.match(plug, /BibloZooEssentialVoiceSession\.end\(owner: "read-narration"\)/);
assert.match(block(plug,"private func cancelAll(", "@objc func activateFromGesture("),
  /releaseEssentialVoice\(\)/);
const play=block(plug, "@objc func playClip(", "@objc func stopClip(");
assert.match(play, /key\.hasPrefix\("verse:"\) &&\s*call\.getBool\("essentialVoice"\) == true/,
  "only source-approved published verse requests can lease");
assert.match(play, /category == \.soloAmbient/);
assert.match(play, /self\.essentialVoiceClipId == nil/);
assert.match(play, /self\.cues\.isEmpty/);
assert.match(play, /self\.clips\.keys\.allSatisfy/);
assert.match(play, /self\.isTransientTypingEffect\(source\)/);
assert.match(play, /self\.stopTransientTypingEffectsForVoice\(\)\s*guard BibloZooEssentialVoiceSession\.begin/);
assert.match(play, /"voice-overlap-unsafe"/);
assert.match(play, /guard BibloZooEssentialVoiceSession\.begin\(\s*owner: "read-narration"\)/);
assert.match(play, /self\.essentialVoiceClipId = id/);
assert.match(play, /guard player\.play\(\) else \{\s*self\.releaseEssentialVoice\(for: id\)/);
assert.match(play, /catch \{\s*self\.releaseEssentialVoice\(for: id\)/);
assert.match(block(plug, "@objc func stopClip(", "@objc func seekClip("),
  /player\.stop\(\)\s*self\.releaseEssentialVoice\(for: id\)/);
assert.match(block(plug, "public func audioPlayerDidFinishPlaying(", "// Source-authored fixed note patterns"),
  /self\.releaseEssentialVoice\(for: id\)/);
const cues=block(plug,"@objc func playCue(", "// N7f.2: audition ONLY.");
assert.match(cues, /AVAudioSession\.sharedInstance\(\)\.category == \.soloAmbient/);
assert.match(play, /"category-not-soloambient"/);
assert.doesNotMatch(plug.replace(/\/\/[^\n]*/g, ""), /setCategory\(|setActive\(false/,
  "Read must lease existing owner, never independently change/disable session");
const optional=block(sound, "private func optionalEffectDeniedByActiveNarration",
  "private func unavailableReason()");
assert.match(optional, /BibloZooEssentialVoiceSession\.isActive\(owner: "read-narration"\)/);
assert.match(optional, /BibloZooEssentialVoiceSession\.isActive\(owner: "native-narration"\)/);
assert.match(optional, /reason == "category-not-soloambient"/);
assert.match(optional, /!interrupted/);
assert.match(optional, /!needsGestureAfterReset/);
assert.match(optional, /!AVAudioSession\.sharedInstance\(\)\.isOtherAudioPlaying/);
assert.match(adapter, /markEssentialVoice\(\)/);
assert.match(adapter, /if \(!this\._clipId\.startsWith\("verse:"\)\) return false/);
assert.match(adapter, /this\._essentialVoice=false; \/\/ Never inherit voice trust after src change/);
assert.match(adapter, /essentialVoice:this\._essentialVoice===true/);
const owner=block(activity, "function beginReadNarration(audio, fallback)", "// Timers for the persistent animated scenes");
assert.match(owner, /state\.activityId !== VERSE_CRAWL_ACTIVITY_ID/);
assert.match(owner, /audio\?\.markEssentialVoice\?\.\(\)/);
assert.match(owner, /const promise = Promise\.resolve\(result\)/);
assert.match(workflow, /validate_r16b_read_essential_voice_silent_mode\.js/);
assert.doesNotMatch(plist,/UIBackgroundModes[\s\S]*?<string>audio<\/string>/);
let added=0;
const calls=[],listeners={};
const document={hidden:false,addEventListener(){}};
const bridge={
  activateFromGesture(){calls.push({kind:"activate"});return Promise.resolve({activated:true});},
  playClip(args){calls.push({kind:"play",...args});return Promise.resolve({started:true,durationMs:2000,positionMs:args.positionMs||0});},
  stopClip(args){calls.push({kind:"stop",...args});return Promise.resolve({stopped:true});},
  stopAll(){calls.push({kind:"stopAll"});return Promise.resolve({stopped:true});},
  addListener(k,fn){listeners[k]=fn;return Promise.resolve({remove(){}});}
};
const window={
  document,addEventListener(){},
  BibloZooNativeOnlyOutput:{enabled:true},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
    Plugins:{BibloZooNativeReadOutput:bridge}}
};
vm.runInNewContext(adapter,{window,document,Promise,console},{filename:"native-read-my-verse-output-n7f.js"});
const controller=window.BibloZooNativeReadOutputController;
assert(controller?.enabled);
async function run(){
  assert.equal(await controller.activateFromGesture(),true);
  const spoken = new controller.NativeAudio("./verse_audio/john_11_35.mp3");
  assert.equal(spoken.markEssentialVoice(),true);
  await spoken.play();
  assert.equal(calls.at(-1).kind,"play");
  assert.equal(calls.at(-1).essentialVoice,true);
  assert.equal(calls.at(-1).clipId,"verse:john_11_35");
  spoken.pause();
  const crawl = new controller.NativeAudio("./verse_audio/john_11_35_ref.mp3");
  await crawl.play(); // No marker: original Crawl voice+music unchanged.
  assert.equal(calls.filter(x=>x.kind==="play").at(-1).essentialVoice,false);
  crawl.pause();
  const theme = new controller.NativeAudio("./verse_images/read_my_verse/verse_crawl_theme_ducked.mp3");
  assert.equal(theme.markEssentialVoice(),false);
  await theme.play();
  assert.equal(calls.filter(x=>x.kind==="play").at(-1).essentialVoice,false);
  theme.pause();
  const effect = new controller.NativeAudio("./verse_images/read_my_verse/keyboard_1.mp3");
  assert.equal(effect.markEssentialVoice(),false);
  await effect.play();
  assert.equal(calls.filter(x=>x.kind==="play").at(-1).essentialVoice,false);
  effect.pause();
  spoken.src="./verse_images/read_my_verse/keyboard_alert.mp3";
  assert.equal(spoken.markEssentialVoice(),false);
  await spoken.play();
  assert.equal(calls.filter(x=>x.kind==="play").at(-1).essentialVoice,false,
    "old source flag cannot leak into new incidental clip");
  spoken.pause();
  // Read's actual source-owned narration helper drives the marker. There is
  // no inferred system Silent-switch state and no hidden PWA behavior.
  const helper=block(activity, "  function beginReadNarration(audio, fallback)",
    "  // Timers for the persistent animated scenes");
  const ctx={
    root:{BibloZooNativeReadOutputController:{enabled:true}},
    state:{activityId:"balloons"},VERSE_CRAWL_ACTIVITY_ID:"star_wars",
    crawlSession:null,crawlMusic:null,crawlEnding:null,
    readDeferredNarrationFinish:null,readAudioStartPromise:null,
    activeAudio:null,completionReported:false,
    readNarrationBlocked:()=>false,pauseReadForInterruption(){},
    Promise,console
  };
  vm.runInNewContext(helper+"\nthis.beginReadNarration=beginReadNarration;",ctx);
  let marked=0,played=0;
  const fake={markEssentialVoice(){marked++;},play(){played++;return Promise.resolve(true);}};
  await ctx.beginReadNarration(fake);
  assert.equal(marked,1);
  ctx.state.activityId="star_wars";
  await ctx.beginReadNarration(fake);
  assert.equal(marked,1,"Crawl uses one explicit Start-owned session");
  ctx.crawlSession={active:true,musicEnabled:false};
  await ctx.beginReadNarration(fake);
  assert.equal(marked,1,"Music-OFF Crawl must not claim a second voice lease");
  ctx.crawlMusic={audio:{}};
  await ctx.beginReadNarration(fake);
  assert.equal(marked,1,"Music-ON Crawl must not claim a second voice lease");
  assert.equal(played,4);
  await controller.stopAll();
  assert.equal(calls.some(x=>x.kind==="stopAll"),true);
  console.log("R16b Read essential voice: PASS (source + native adapter VM; hardware pending)");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
