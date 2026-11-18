"use strict";
// R16b.3 correction to R16b.2: owner's iPhone confirmed Silent ON initial
// theme+verse absent. The button now controls ONLY soundtrack, independent
// of narration. Source/JS VM and native bridge test, NOT physical iPhone proof.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const js=read("read_my_verse.js");
const css=read("read_my_verse.css");
const adapter=read("verse_games/shared/native-read-my-verse-output-n7f.js");
const swift=read("ios/App/App/SceneDelegate.swift");
const sound=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const asset=fs.readFileSync(path.join(root,"verse_images/game_ui/ui_icon_music_notes.png"));
assert.equal(asset.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
assert.match(css,/\.read-crawl-music-toggle[\s\S]*?background:\s*#ffc751/);
assert.match(css,/padding: clamp\(12px, 3vw, 15px\)/);
assert.match(css,/\.read-crawl-music-toggle\.is-off\s*\{\s*opacity:\s*0\.36/);
assert.match(js,/data-read-crawl-music-toggle data-no-ui-sound aria-pressed="true"/);
assert.match(js,/ui_icon_music_notes\.png/);
assert.match(js,/session\.musicEnabled = !session\.musicEnabled/);
assert.match(js,/!session\.musicEnabled\s*\|\|\s*!music/);
assert.match(js,/if \(!session\.musicEnabled\) \{\s*session\.endingDone = true/);
assert.match(js,/crawlSession: safeActivityId === VERSE_CRAWL_ACTIVITY_ID/);
assert.match(js,/crawlSession: state\.activityId === VERSE_CRAWL_ACTIVITY_ID/);
assert.match(js,/state\.activityId !== VERSE_CRAWL_ACTIVITY_ID\)\s*\{\s*audio\?\.markEssentialVoice/);
assert.match(adapter,/const crawlSession = options\?\.crawlSession === true/);
assert.match(adapter,/api\(\)\.activateFromGesture\(\{crawlSession\}\)/);
assert.match(swift,/let crawl = call\.getBool\("crawlSession"\) == true/);
assert.match(swift,/BibloZooEssentialVoiceSession\.begin\(\s*owner: "read-crawl"\)/);
assert.match(swift,/BibloZooEssentialVoiceSession\.end\(owner: "read-crawl"\)/);
assert.match(swift,/let crawlOwned =\s*BibloZooEssentialVoiceSession\.isActive\(owner: "read-crawl"\)/);
assert.match(swift,/if crawlOwned \{\s*guard !essentialVoice,\s*category == \.playback/);
assert.match(swift,/key == "crawl-theme" \|\| key == "crawl-ending" \|\|\s*key\.hasPrefix\("verse:"\)/);
assert.match(swift,/"crawl-session-scope"/);
assert.match(sound,/BibloZooEssentialVoiceSession\.isActive\(owner: "read-crawl"\)/);
assert.match(workflow,/validate_r16b2_crawl_music_toggle\.js/);
assert.doesNotMatch(js,/SilentSwitch|detectSilentMode|UIBackgroundModes/);

// Execute real new button function. Both Silent-switch positions use same
// toggle; voice player identity is NEVER changed, even in an active chunk.
const begin=js.indexOf("  function toggleCrawlMusic(session) {");
const finish=js.indexOf("  function renderCrawlScreen(",begin);
assert(begin>=0&&finish>begin);
const toggleSource=js.slice(begin,finish);
const events=[];
const classes=new Set(),attrs={};
const button={
  classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},
  setAttribute(k,v){attrs[k]=v;}
};
const scene={active:true,musicEnabled:true,endingStarted:false,musicButton:button};
const narration={currentTime:1.52,played:true};
let welcome=0;
const ctx={root:{document:{hidden:false}},crawlSession:scene,
  readAudioRecovery:null,completionReported:false,activeAudio:narration,
  stopCrawlMusic(){events.push("theme-stop");},
  stopCrawlEnding(){events.push("ending-stop");},
  startCrawlMusic(reason,pos){events.push("theme-start:"+reason+":"+pos);},
  pauseReadForInterruption(){welcome++;},
  CRAWL_RESUME_SECONDS:9
};
vm.runInNewContext(toggleSource+"\nthis.toggleCrawlMusic=toggleCrawlMusic;",ctx);
ctx.toggleCrawlMusic(scene);
assert.equal(scene.musicEnabled,false);
assert(classes.has("is-off"));
assert.equal(attrs["aria-pressed"],"false");
assert.deepEqual(events,["theme-stop","ending-stop"]);
assert.strictEqual(ctx.activeAudio,narration);
assert.equal(welcome,0);
ctx.toggleCrawlMusic(scene);
assert.equal(scene.musicEnabled,true);
assert(!classes.has("is-off"));
assert.equal(attrs["aria-pressed"],"true");
assert.deepEqual(events,["theme-stop","ending-stop","theme-start:music-button:9"]);
assert.strictEqual(ctx.activeAudio,narration);
assert.equal(welcome,0);
ctx.readAudioRecovery={kind:"animated"};
ctx.toggleCrawlMusic(scene);
assert.equal(scene.musicEnabled,true,"real interruption gates button");
assert.equal(events.length,3);
ctx.readAudioRecovery=null;
ctx.root.document.hidden=true;
ctx.toggleCrawlMusic(scene);
assert.equal(scene.musicEnabled,true,"backgrounded app gates button");

// Real native adapter forwards the Crawl Start flag, and NEVER flags
// theme/narration as standalone voice (Crawl owns one shared session).
const calls=[],listeners={};
const doc={hidden:false,addEventListener(){}};
const bridge={
  addListener(n,fn){listeners[n]=fn;return Promise.resolve({});},
  activateFromGesture(opts){calls.push({kind:"activate",opts});return Promise.resolve({activated:true});},
  playClip(opts){calls.push({kind:"play",...opts});return Promise.resolve({
    started:true,durationMs:1500,positionMs:opts.positionMs||0});},
  stopClip(opts){calls.push({kind:"stop",...opts});return Promise.resolve({stopped:true});},
  stopAll(){calls.push({kind:"stopAll"});return Promise.resolve({stopped:true});}
};
const win={document:doc,addEventListener(){},
  BibloZooNativeOnlyOutput:{enabled:true},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
    Plugins:{BibloZooNativeReadOutput:bridge}}};
vm.runInNewContext(adapter,{window:win,document:doc,Promise,console});
const controller=win.BibloZooNativeReadOutputController;
async function run(){
  assert.equal(await controller.activateFromGesture({crawlSession:true}),true);
  const music=new controller.NativeAudio("./verse_images/read_my_verse/verse_crawl_theme_ducked.mp3");
  const verse=new controller.NativeAudio("./verse_audio/john_11_35.mp3");
  assert.equal(music.markEssentialVoice(),false);
  // Crawl must NOT use the independent R16b verse-only lease.
  await music.play();
  await verse.play();
  assert.deepEqual(calls.filter(c=>c.kind==="activate").map(c=>c.opts.crawlSession),[true]);
  assert.deepEqual(calls.filter(c=>c.kind==="play").map(c=>[c.clipId,c.essentialVoice]),[
    ["crawl-theme",false],["verse:john_11_35",false]
  ]);
  await music.pause();
  assert.equal(verse.paused,false,"music toggle may not pause current narrator");
  await controller.stopAll();
  assert.equal(await controller.activateFromGesture(),true);
  assert.equal(calls.filter(c=>c.kind==="activate").at(-1).opts.crawlSession,false);
  console.log("R16b.3 corrected music-toggle/native adapter source+VM PASS (physical iPhone pending)");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
