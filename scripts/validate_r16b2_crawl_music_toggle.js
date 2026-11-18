"use strict";
// R16b.2: source/audio-owner boundaries and actual toggle + native shim VM.
// Node PASS is not an iPhone audio-category or physical audibility test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const activity = read("read_my_verse.js");
const css = read("read_my_verse.css");
const adapter = read("verse_games/shared/native-read-my-verse-output-n7f.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const asset = fs.readFileSync(path.join(root, "verse_images/game_ui/ui_icon_music_notes.png"));
assert.equal(asset.subarray(0,8).toString("hex"),"89504e470d0a1a0a",
  "exact owner-uploaded music-notes PNG must be packaged");
assert.match(read("scripts/build.js"),/"verse_images"/);
assert.match(css,/\.read-crawl-music-toggle[\s\S]*?#ffc751/);
assert.match(css,/\.read-crawl-music-toggle\.is-off\s*\{\s*opacity:\s*0\.36/);
assert.match(activity,/data-read-crawl-music-toggle data-no-ui-sound aria-pressed="true"/);
assert.match(activity,/ui_icon_music_notes\.png/);
assert.match(activity,/session\.musicEnabled = !session\.musicEnabled/);
assert.match(activity,/!session\.musicEnabled\s*\|\|\s*!music/);
assert.match(activity,/if \(!session\.musicEnabled\) \{\s*session\.endingDone = true/);
assert.match(activity,/state\.activityId !== VERSE_CRAWL_ACTIVITY_ID \|\|\s*\(crawlSession\?\.active && crawlSession\.musicEnabled === false &&\s*!crawlMusic && !crawlEnding\)/);
assert.match(activity,/scene\?\.musicEnabled === false \|\| !!appApi\?\.isMuted\?\.\(\)/);
assert.match(activity,/const stops = await Promise\.all\(\[\s*stoppedNarration, stopCrawlMusic\(\), stopCrawlEnding\(\)/);
assert.match(activity,/if \(epoch !== session\.musicToggleEpoch\) return/);
assert.match(activity,/if \(crawlMusic !== music\) return false; \/\/ Retired track is harmless/);
assert.match(adapter,/return Promise\.resolve\(api\(\)\?\.stopClip\?\.\(\{requestId:id\}\)\)\.then\(/);
assert.match(workflow,/validate_r16b2_crawl_music_toggle\.js/);
assert.doesNotMatch(activity,/SilentSwitch|detectSilentMode|UIBackgroundModes/);

// Execute the actual toggle function against a controlled Read owner:
// stop old narration, soundtrack, ending BEFORE any new play; preserve the
// spoken clip position; do not synthesize ended/OS-interrupted callbacks.
const start=activity.indexOf("  function toggleCrawlMusic(session) {");
const end=activity.indexOf("  function renderCrawlScreen(",start);
assert(start>=0 && end>start);
const toggleSource=activity.slice(start,end);
const events=[];
const attrs={};
const classes=new Set();
const button={
  classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},
  setAttribute(name,val){attrs[name]=val;}
};
const item={index:0,audioDone:false,vanished:false,audioStarted:true};
const session={active:true,musicButton:button,musicEnabled:true,musicSwitching:false,
  musicToggleEpoch:0,musicSwitchQueue:Promise.resolve(),pendingNarration:null,endingStarted:false};
const makeAudio=(position)=>({currentTime:position,
  pause(){events.push("voice-stop");return Promise.resolve({stopped:true});}});
let failures=0;
const ctx={Promise,Number,Math,root:{document:{hidden:false}},
  crawlSession:session,readAudioRecovery:null,completionReported:false,
  readActiveAnimatedNarration:{session,item},activeAudio:makeAudio(2.125),
  audioRequest:4,readAudioStartPromise:Promise.resolve(),
  stopCrawlMusic(){events.push("music-stop");return Promise.resolve({stopped:true});},
  stopCrawlEnding(){events.push("ending-stop");return Promise.resolve({stopped:true});},
  startCrawlMusic(){events.push("music-start");},
  playCrawlAudio(_session,_item,position) {
    events.push("voice-start:"+position);
    ctx.activeAudio=makeAudio(position);
  },
  pauseReadForInterruption(){failures++;},
  CRAWL_RESUME_SECONDS:7
};
vm.runInNewContext(toggleSource+"\nthis.toggleCrawlMusic=toggleCrawlMusic;",ctx);
async function run(){
  ctx.toggleCrawlMusic(session);
  await session.musicSwitchQueue;
  assert.equal(session.musicEnabled,false);
  assert.equal(attrs["aria-pressed"],"false");
  assert(classes.has("is-off"));
  assert.deepEqual(events,["voice-stop","music-stop","ending-stop","voice-start:2.125"]);
  assert.equal(failures,0,"intentional toggle must not open Welcome Back");
  events.length=0;
  item.audioStarted=true;
  ctx.toggleCrawlMusic(session);
  await session.musicSwitchQueue;
  assert.equal(session.musicEnabled,true);
  assert.equal(attrs["aria-pressed"],"true");
  assert(!classes.has("is-off"));
  assert.deepEqual(events,["voice-stop","music-stop","ending-stop",
    "music-start","voice-start:2.125"]);
  assert.equal(failures,0);
  events.length=0;
  ctx.stopCrawlMusic=()=>Promise.resolve({stopped:false});
  ctx.toggleCrawlMusic(session);
  await session.musicSwitchQueue;
  assert.equal(failures,1,"native stop failure must fail closed");
  assert(!events.some(x=>x.startsWith("voice-start:")),"no voice after failed stop");

  // Real native Audio shim returns the stop acknowledgement without
  // inventing media 'ended' or an OS interruption.
  const calls=[],listeners={};
  const doc={hidden:false,addEventListener(){}};
  const bridge={
    addListener(name,fn){listeners[name]=fn;return Promise.resolve({});},
    activateFromGesture(){return Promise.resolve({activated:true});},
    playClip(args){calls.push({op:"play",...args});return Promise.resolve({
      started:true,durationMs:3000,positionMs:args.positionMs||0});},
    stopClip(args){calls.push({op:"stop",...args});return Promise.resolve({stopped:true});},
    stopAll(){return Promise.resolve({stopped:true});}
  };
  const win={document:doc,addEventListener(){},
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeReadOutput:bridge}}};
  vm.runInNewContext(adapter,{window:win,document:doc,Promise,console});
  const api=win.BibloZooNativeReadOutputController;
  assert.equal(await api.activateFromGesture(),true);
  const voice=new api.NativeAudio("./verse_audio/john_11_35.mp3");
  assert.equal(voice.markEssentialVoice(),true);
  let errors=0,ended=0;
  voice.addEventListener("error",()=>errors++);
  voice.addEventListener("ended",()=>ended++);
  voice.currentTime=1.125;
  await voice.play();
  assert.equal(calls.find(x=>x.op==="play").positionMs,1125);
  assert.equal(calls.find(x=>x.op==="play").essentialVoice,true);
  assert.equal((await voice.pause()).stopped,true);
  assert.equal(calls.filter(x=>x.op==="stop").length,1);
  assert.equal(errors,0);
  assert.equal(ended,0);
  console.log("R16b.2 Crawl music-toggle source, owner sequencing and native shim PASS");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
