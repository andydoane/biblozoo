"use strict";
/* N6o first-principles validator for the second of five Playground apps.
 * GitHub Linux mocks do NOT compile Swift or prove actual iPhone audibility.
 */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_playground/scripture_scrub/game.js");
const helper=read("verse_games/shared/native-scripture-scrub-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_playground/scripture_scrub/index.html");
const shell=read("verse_games/shared/game-shell.js");
const handoff=read("docs/PROJECT-HANDOFF.md");
const ci=read(".github/workflows/ios-prep-validation.yml");
const sourceKeys={
 bite1:"scripture_scrub_bite_1",bite2:"scripture_scrub_bite_2",
 bite3:"scripture_scrub_bite_3",chalk:"scripture_scrub_chalk",
 complete:"scripture_scrub_complete",dig:"scripture_scrub_dig",
 glow:"scripture_scrub_glow",leaves:"scripture_scrub_leaves",
 mower:"scripture_scrub_mower",
 pop1:"scripture_scrub_pop_1",pop2:"scripture_scrub_pop_2",
 pop3:"scripture_scrub_pop_3",pop4:"scripture_scrub_pop_4",
 pop5:"scripture_scrub_pop_5",rainbow:"scripture_scrub_rainbow",
 splat:"scripture_scrub_splat",squeak:"scripture_scrub_squeak",
 popup:"scripture_scrub_popup"
};
const notes={progressG3:196,progressC4:261.63,progressD4:293.66,
 progressE4:329.63,progressF4:349.23,progressG4:392,progressA4:440};
const ids=["ui-pop-1","ui-pop-2",
 ...Object.keys(sourceKeys).map(k=>"scrub-"+k),
 ...Object.keys(notes).map(k=>"scrub-progress-"+k.slice(8).toLowerCase()),
 "scrub-completion-arpeggio"];
const flush=()=>new Promise(r=>setImmediate(r));
function snippet(start,end){
 const i=game.indexOf(start),j=game.indexOf(end,i+start.length);
 assert.ok(i>0&&j>i,"real Scripture Scrub source section "+start);
 return game.slice(i,j);
}
function fixture(){
 const calls=[],events={};
 let activation={ready:true,reason:"os-accepted"};
 let playback={accepted:true};
 const bridge={
  activateFromGesture:({purpose})=>{
   calls.push(["activate",purpose]);return Promise.resolve(activation);
  },
  preload:({soundId})=>{
   calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:300});
  },
  play:({soundId,volume})=>{
   calls.push(["play",soundId,volume]);return Promise.resolve(playback);
  },
  stop:({soundId})=>{
   calls.push(["stop",soundId]);return Promise.resolve({stopped:true});
  },
  stopEffect:({soundId})=>{
   calls.push(["stopEffect",soundId]);return Promise.resolve({stopped:true});
  },
  addListener:(event,callback)=>{
   events[event]=callback;return Promise.resolve({remove(){}});
  }
 };
 const win={
  BibloZooNativeOnlyOutput:{enabled:true},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
    Plugins:{BibloZooNativeSound:bridge}},
  document:{hidden:false,addEventListener:(k,cb)=>{events[k]=cb;}},
  addEventListener:(k,cb)=>{events[k]=cb;},setTimeout,clearTimeout
 };
 vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,Number,
  Error,setTimeout,clearTimeout});
 return {api:win.BibloZooNativeScriptureScrubAudio,calls,events,
  setActivation:v=>{activation=v;},setPlayback:v=>{playback=v;}};
}
async function checkNativeInventory(){
 new vm.Script(game,{filename:"scripture_scrub/game.js"});
 new vm.Script(helper,{filename:"native-scripture-scrub-audio.js"});
 new vm.Script(shell,{filename:"game-shell.js"});
 assert.match(html,/native-scripture-scrub-audio\.js[\s\S]*game\.js/);
 assert.match(ci,/validate_native_playground_scripture_scrub_n6o\.js/);
 assert.match(handoff,/N6o Scripture Scrub/);
 assert.match(handoff,/Playground 1\/5/);
 assert.match(handoff,/#55[\s\S]*MERGED/);
 assert.equal(Object.keys(sourceKeys).length,18);
 assert.equal(Object.keys(notes).length,7);
 assert.equal(ids.length,28);
 assert.equal(new Set(ids).size,28);
 const packaged=fs.readdirSync(path.join(root,
  "verse_playground/scripture_scrub/scripture_scrub_sounds"));
 assert.equal(packaged.filter(x=>x.endsWith(".mp3")).length,19,
  "18 source-declared effects plus one unused peel asset");
 assert.ok(packaged.includes("scripture_scrub_peel.mp3"));
 assert.ok(!swift.includes('"scrub-peel"'),"unused peel intentionally excluded");
 for(const [key,file] of Object.entries(sourceKeys)){
  assert.match(game,new RegExp("scripture_scrub_"+key.replace(/^pop(\d)$/,"pop_$1")
   .replace(/^bite(\d)$/,"bite_$1")+"\\.mp3"),
   "legacy original MP3 "+key);
  assert.ok(packaged.includes(file+".mp3"),"original file "+file);
  assert.ok(helper.includes(key+': "scrub-'+key+'"'),"helper "+key);
  assert.ok(swift.includes('"scrub-'+key+'": "'+file+'"'),"Swift resource "+key);
  assert.ok(swift.includes('"scrub-'+key+'"'),"PCM ID "+key);
 }
 for(const [key,frequency] of Object.entries(notes)){
  const sound="scrub-progress-"+key.slice(8).toLowerCase();
  assert.ok(helper.includes(key+': "'+sound+'"'),"native progress "+sound);
  assert.ok(swift.includes('"'+sound+'": '+frequency),"Swift Hz "+sound);
 }
 assert.match(swift,/prepareScrubToneOnWorker\(soundId: soundId\)/);
 assert.match(swift,/prepareScrubMowerOnWorker\(soundId:soundId,url:url\)/);
 assert.match(swift,/scrubToneIDs\.contains\(soundId\)/);
 assert.match(swift,/self\.scrubSoundResources\[soundId\]/);
 assert.match(swift,/forResource: resourceName, withExtension: "mp3",[\s\S]*?"public\/verse_playground\/scripture_scrub\/scripture_scrub_sounds"/);
 assert.match(swift,/AVAudioFrameCount\(ceil\(format.sampleRate\*duration\)\)/);
 assert.match(swift,/duration=1\.25/);
 assert.match(swift,/t<0\.12/);
 assert.match(swift,/duration\*0\.65/);
 assert.match(swift,/@objc func stopEffect\(_ call: CAPPluginCall\)/);
 assert.match(swift,/soundId == "scrub-mower"/);
 assert.match(swift,/let epoch=self\.playbackEpochSnapshot\(\)/);
 assert.match(game,/restoreNativeOnGesture: nativeScrubAudio \? \(\) =>/);
 assert.match(game,/window\.BibloZooWelcomeBackReturn\.nativeAudioResumeResult/);
 assert.match(game,/if\(nativeScrubAudio\)return null; \/\/ native iOS forbids WebAudio/);
 assert.match(game,/if\(nativeScrubAudio\)return null; \/\/ no HTML silent prime/);
 assert.match(game,/if\(nativeScrubAudio\)return; \/\/ no dynamic oscillator/);
 const f=fixture();
 assert.equal(f.api.isAvailable(),true);
 assert.deepEqual([...f.api.soundIds],ids);
 assert.equal(f.api.soundIds.length,28);
 assert.equal(f.api.play("mower",.37),false,"unwarmed sounds forbidden");
 assert.equal(f.api.tapUiFromGesture("uiTap1",.42),true);
 await flush();await flush();
 assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,
  "real title tap prepares only two shared UI clips");
 f.calls.length=0;
 assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.42})).ready,true);
 assert.equal(f.calls[0][0],"activate",
  "real Start tap requests native priority in its own synchronous stack");
 assert.equal(f.calls.filter(x=>x[0]==="preload").length,28);
 assert.ok(f.calls.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2")<
   f.calls.findIndex(x=>x[0]==="preload"&&x[1]==="scrub-bite1"),
   "Start UI pop before full bank but game waits for all 28");
 f.calls.length=0;
 for(const key of Object.keys(sourceKeys))assert.equal(f.api.play(key,.45),true);
 for(const key of Object.keys(notes))assert.equal(f.api.play(key,1),true);
 assert.equal(f.api.play("completionArpeggio",.98),true);
 await flush();
 assert.deepEqual(f.calls.filter(x=>x[0]==="play").map(x=>x[1]),
   ids.slice(2),"all 18 original shipped MP3 + 7 source pitches + fanfare");
 assert.equal(await f.api.stopMower(),true);
 assert.deepEqual(f.calls.filter(x=>x[0]==="stopEffect")
   .map(x=>x[1]),["scrub-mower"],
   "mower stop is isolated and must not discard remaining warm bank");
 assert.equal(f.api.isReady(),true);
 f.calls.length=0;
 assert.equal(f.api.play("progressE4",1),true);
 await flush();
 assert.ok(f.calls.some(x=>x[1]==="scrub-progress-e4"),
   "other progress voices continue after mower stop");
 const signals=[];
 f.api.configure({onAppInactive:()=>signals.push("paused"),
   onAppActive:()=>signals.push("welcome"),
   onPlaybackFailure:()=>signals.push("fatal")});
 f.setPlayback({accepted:false,reason:"activation-os-rejected"});
 f.api.play("splat",.8);
 await flush();await flush();
 assert.deepEqual(signals,["paused","welcome"],
   "live YouTube PiP OS-denial uses ordinary retriable Welcome Back, no fatal popup");
 assert.equal(f.api.isReady(),false);
 f.setPlayback({accepted:true});
 f.setActivation({ready:true,reason:"os-accepted"});
 assert.equal((await f.api.prepareFromGesture()).ready,true);
 const attempted=f.calls.filter(x=>x[0]==="activate").length;
 f.events.biblozooAppLifecycle?.({active:false});
 assert.equal(f.api.isReady(),false,
   "held UIKit App Switcher invalidates all prepared PCM");
 f.events.biblozooAppLifecycle?.({active:true});
 assert.equal(f.calls.filter(x=>x[0]==="activate").length,attempted,
   "passive return may show Welcome Back, never auto-activate native");
}
function originalProgressMelody(){
 assert.match(game,/progressStepPercent: 2/);
 assert.match(game,/const step = Math.floor\(pct \/ stepPercent\)/);
 assert.match(game,/if \(now - lastProgressToneAt < 90\) return/);
 const heard=[];
 const scope={
  muted:false,nativeScrubAudio:{isReady:()=>true,play:(k,v)=>heard.push([k,v])},
  menuOpen:false,welcomePaused:false,nativeScrubPending:false,
  nativeScrubFailure:false,document:{hidden:false},
  soundVolume:key=>key==="progressTone"?1:.98,
  playToneFrequency:()=>{throw Error("native must not call Web oscillator")},
  console,Math,Number
 };
 vm.createContext(scope);
 vm.runInContext(
  snippet("  const NATIVE_SCRUB_PROGRESS=Object.freeze({",
    "  let nativeScrubGeneration=")+
  snippet("  function scrubStoppedOrPaused(){",
    "  function clearNativeScrubFailure(){")+
  snippet("  function playProgressToneStep(step) {",
    "  function warmUpGeneratedToneAudio() {")+
  snippet("  function playCompletionArpeggio() {",
    "  function playToneFrequency(")+
  "\nthis.progress=playProgressToneStep;this.fanfare=playCompletionArpeggio;",scope);
 const scale=[
 261.63,261.63,293.66,293.66,329.63,392,329.63,261.63,
 196,261.63,261.63,293.66,349.23,329.63,261.63,
 196,261.63,261.63,293.66,329.63,392,329.63,261.63,
 440,293.66,349.23,329.63,261.63
 ];
 const expected={196:"progressG3",261.63:"progressC4",293.66:"progressD4",
 329.63:"progressE4",349.23:"progressF4",392:"progressG4",440:"progressA4"};
 for(let step=1;step<=49;step++)scope.progress(step);
 scope.fanfare();
 assert.deepEqual(heard.map(x=>x[0]),
  Array.from({length:49},(_,i)=>expected[scale[i%scale.length]])
    .concat("completionArpeggio"),
  "real original 2% coverage melody preserves every position, 7 pitches and final fanfare");
 const before=heard.length;
 scope.menuOpen=true;scope.progress(12);
 scope.menuOpen=false;scope.welcomePaused=true;scope.progress(13);
 scope.welcomePaused=false;scope.muted=true;scope.fanfare();
 assert.equal(heard.length,before,
  "no ghost tone while menu/PiP/intentional mute");
}
function mainGameContracts(){
 assert.match(game,/primeNativeScrubFromGesture\("start",scrubUiKey\(\)\)/);
 assert.match(game,/primeNativeScrubFromGesture\("resume",scrubUiKey\(\)\)/);
 assert.match(game,/primeNativeScrubFromGesture\(isFinalRound\?"finish":"next"/);
 assert.match(game,/if\(kind==="finish"\)\{stopNativeScrubRun\(\);renderEndScreen\(\);\}/);
 assert.match(game,/returnPaused|welcomePaused/);
 assert.match(game,/currentRoundIndex\+=1/);
 assert.match(game,/if\(nativeScrubAudio\)void nativeScrubAudio\.stop\(\)/);
 assert.match(game,/void nativeScrubAudio\.stopMower\(\)/);
 assert.match(game,/mowerEndAt = welcomeClock\.now\(\) \+ duration/);
 assert.match(game,/const elapsed = welcomeClock\.now\(\) - startTime/);
 assert.match(game,/if \(welcomePaused\) \{ mowerResumeFrame = animate; return; \}/);
 assert.match(game,/if \(round && round === roundConfig\(\)\) scheduleCoverageCheck/);
 assert.match(game,/deferredCoverageRound=roundConfig\(\)/);
 assert.match(game,/const isFinalRound = round\.kind === "archaeology"/);
 assert.match(game,/const SCRUB_ROUND_GROUPS = \[/);
 assert.match(game,/chosen\.push\(byId\.get\("archaeology"\)\)/);
 assert.match(shell,/typeof options\.restoreNativeOnGesture === "function"/);
 assert.match(shell,/useZooEscape: !options\.nativeOnlyAudio/);
 assert.match(shell,/suppressUiSound: !!options\.nativeOnlyAudio/);
}
(async()=>{
 await checkNativeInventory();
 originalProgressMelody();
 mainGameContracts();
 console.log("N6o Scripture Scrub PASS: 28 native PCM, all packaged effects, exact 2% melody/fanfare, isolated mower and PiP");
})().catch(e=>{console.error(e);process.exitCode=1;});