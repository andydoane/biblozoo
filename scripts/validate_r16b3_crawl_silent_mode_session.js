"use strict";
// R16b.3 / AUDIO-01 — explicit exception for the owner's Verse Crawl
// music+speech audible in BOTH Silent-switch positions. This is a SOURCE
// safety regression, not a real iOS SDK build or speaker-audibility proof.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const sound=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const js=read("read_my_verse.js");
const adapter=read("verse_games/shared/native-read-my-verse-output-n7f.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
function block(s,a,b) {
  const i=s.indexOf(a),j=s.indexOf(b,i+a.length);
  assert(i>=0&&j>i,"missing source region "+a);
  return s.slice(i,j);
}
const lease=block(swift,"enum BibloZooEssentialVoiceSession","class SceneDelegate:");
assert.match(lease,/session\.setCategory\(\.playback, mode: \.default, options: \[\]\)/);
assert.match(lease,/session\.setCategory\(\.soloAmbient, mode: \.default, options: \[\]\)/);
const plug=block(swift,"final class BibloZooNativeReadOutputPlugin","// Ghost Writer only");
const activate=block(plug,"@objc func activateFromGesture(","@objc func playClip(");
assert.match(activate,/let crawl = call\.getBool\("crawlSession"\) == true/);
assert.match(activate,/let crawlAlreadyOwned =\s*BibloZooEssentialVoiceSession\.isActive\(owner: "read-crawl"\)/);
assert.match(activate,/session\.category == \.soloAmbient/);
assert.match(activate,/!session\.isOtherAudioPlaying && self\.clips\.isEmpty/);
assert.match(activate,/self\.cues\.isEmpty && self\.essentialVoiceClipId == nil/);
assert.match(activate,/try session\.setActive\(true\)/);
assert.match(activate,/if crawl && !BibloZooEssentialVoiceSession\.begin\(\s*owner: "read-crawl"\)/);
const play=block(plug,"@objc func playClip(","@objc func stopClip(");
const scope=block(play,"if crawlOwned {","} else if essentialVoice {");
assert.match(scope,/!essentialVoice/);
assert.match(scope,/category == \.playback/);
assert.match(scope,/self\.essentialVoiceClipId == nil/);
assert.match(scope,/self\.cues\.isEmpty/);
assert.match(scope,/key == "crawl-theme" \|\| key == "crawl-ending" \|\|\s*key\.hasPrefix\("verse:"\)/);
assert.match(scope,/"crawl-session-scope"/);
assert.doesNotMatch(scope,/"zoo-escape-cue"|"keyboard-alert"|"incorrect"|"typewriter-alert"/,
  "incidental audio can NEVER borrow the scoped Crawl .playback");
const others=block(play,"} else if essentialVoice {","self.clips[id]?.stop()");
assert.match(others,/category == \.soloAmbient/);
assert.match(others,/"voice-overlap-unsafe"/);
assert.match(others,/"category-not-soloambient"/);
const cancel=block(plug,"private func cancelAll(","@objc func activateFromGesture(");
assert.match(cancel,/ownedByReadGesture = false/);
assert.match(cancel,/clips\.removeAll\(\)/);
assert.match(cancel,/releaseEssentialVoice\(\)/);
assert.match(cancel,/releaseCrawlSession\(\)/);
assert.match(plug,/BibloZooEssentialVoiceSession\.end\(owner: "read-crawl"\)/);
const cue=block(plug,"@objc func playCue(","// N7f.2: audition ONLY.");
assert.match(cue,/AVAudioSession\.sharedInstance\(\)\.category == \.soloAmbient/,
  "optional notes remain denied while scoped Crawl .playback is active");
const optional=block(sound,"private func optionalEffectDeniedByActiveNarration","private func unavailableReason()");
assert.match(optional,/BibloZooEssentialVoiceSession\.isActive\(owner: "read-crawl"\)/);
assert.match(optional,/nativeNarration \|\| readNarration \|\| readCrawl/);
assert.match(optional,/reason == "category-not-soloambient"/);
assert.match(js,/activateFromGesture\(\{\s*crawlSession: safeActivityId === VERSE_CRAWL_ACTIVITY_ID/);
assert.match(js,/activateFromGesture\(\{\s*crawlSession: state\.activityId === VERSE_CRAWL_ACTIVITY_ID/);
assert.match(adapter,/api\(\)\.activateFromGesture\(\{crawlSession\}\)/);
const narration=block(js,"  function beginReadNarration(audio, fallback)",
  "  // Timers for the persistent animated scenes");
assert.match(narration,/state\.activityId !== VERSE_CRAWL_ACTIVITY_ID/);
assert.doesNotMatch(narration,/musicEnabled|crawlMusic/,
  "both Crawl music states reuse the one child-started category");
const toggle=block(js,"  function toggleCrawlMusic(session)","  function renderCrawlScreen(");
assert.doesNotMatch(toggle,/activeAudio|readActiveAnimatedNarration|markEssentialVoice|audioRequest|musicSwitchQueue/,
  "music taps must never restart spoken verse");
assert.match(toggle,/if \(session\.musicEnabled\)\s*startCrawlMusic/);
assert.match(toggle,/else \{\s*stopCrawlMusic\(\);\s*stopCrawlEnding\(\);/);
assert.doesNotMatch(plug,/UIBackgroundModes|detectSilentSwitch/);
assert.match(workflow,/validate_r16b3_crawl_silent_mode_session\.js/);

// Actual narration helper VM: Crawl marks NO individual short voice lease,
// whereas Balloons still does. Switching Crawl soundtrack is irrelevant.
const ctx={Promise,console,root:{document:{hidden:false},
    BibloZooNativeReadOutputController:{enabled:true}},
  state:{activityId:"star_wars"},VERSE_CRAWL_ACTIVITY_ID:"star_wars",
  readDeferredNarrationFinish:null,readAudioStartPromise:null,activeAudio:null,
  completionReported:false,readNarrationBlocked(){return false;},
  pauseReadForInterruption(){throw Error("no synthetic Welcome Back");}};
vm.runInNewContext(narration+"\nthis.beginReadNarration=beginReadNarration;",ctx);
let marked=0,plays=0;
const audio={markEssentialVoice(){marked++;},play(){plays++;return Promise.resolve(true);}};
(async()=>{
  await ctx.beginReadNarration(audio);
  await ctx.beginReadNarration(audio);
  assert.equal(marked,0,"Crawl both music states never mark a separate voice lease");
  ctx.state.activityId="balloons";
  await ctx.beginReadNarration(audio);
  assert.equal(marked,1,"Balloons still marks standalone essential narration");
  assert.equal(plays,3);
  console.log("R16b.3 scoped Crawl Silent-Mode music+voice source and narration VM PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
