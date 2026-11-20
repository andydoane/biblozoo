"use strict";
// N6p Wheel: Linux Node VM/source tests. Does NOT compile Swift or prove
// human-audible iPhone playback or native AVAudioPlayerDelegate delivery.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper=read("verse_games/shared/native-wheel-of-bible-audio.js");
const game=read("verse_playground/wheel_of_bible/game.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const shell=read("verse_games/shared/game-shell.js");
const html=read("verse_playground/wheel_of_bible/index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const types={triangle:"t",square:"q",sine:"s"},notes=[];
function add(midis,ms,gain,wave="triangle"){
 for(const midi of midis){
  const vol=Math.round(gain*1000);
  const key="t"+midi+"_"+ms+"_"+vol+"_"+types[wave];
  const id="wheel-note-"+midi+"-"+ms+"-"+vol+"-"+types[wave];
  if(!notes.some(n=>n.key===key))notes.push({midi,ms,vol,wave,key,id});
 }
}
add([50,53,56],45,.12,"square");  // exact 22 spin ticks
add([67,71,75],100,.24);         // intro 3 beeps
add([72],100,.28);add([79],140,.22); // cash/good
add([60,62,64,65,67,69,71,72],130,.48); // 1..10 letter keyword melodies
add([43],130,.32,"sine");add([38],120,.24,"sine"); // wrong
add([64,66,68,70,72],80,.18);  // five letter/challenge pop variants
add([72],100,.25);add([76],100,.24);add([84],180,.28); // prize
add([67],80,.18);add([72],90,.18);add([76],120,.16); // hint
add([72,73,74,75,76,77,78],35,.07); // random finale sparkles
const ids=["ui-pop-1","ui-pop-2",...notes.map(n=>n.id)];
const flush=()=>new Promise(r=>setImmediate(r));
function section(src,begin,end){
 const a=src.indexOf(begin),b=src.indexOf(end,a+begin.length);
 assert.ok(a>=0 && b>a,"actual source segment "+begin);
 return src.slice(a,b);
}
function fixture(){
 const calls=[],listeners={};
 let activation={ready:true,reason:"os-accepted"},playback={accepted:true};
 const bridge={
  activateFromGesture:({purpose})=>{
   calls.push(["activate",purpose]);return Promise.resolve(activation);
  },
  preload:({soundId})=>{
   calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:220});
  },
  play:({soundId,volume})=>{
   calls.push(["play",soundId,volume]);return Promise.resolve(playback);
  },
  stop:({soundId})=>{
   calls.push(["stop",soundId]);return Promise.resolve({stopped:true});
  },
  addListener:(name,fn)=>{
   listeners[name]=fn;return Promise.resolve({remove(){}});
  },
  prepareNarration:({soundId,requestId})=>{
   calls.push(["narration-prepare",soundId,requestId]);
   return Promise.resolve({prepared:true,durationMs:6000});
  },
  playNarration:({requestId})=>{
   calls.push(["narration-play",requestId]);
   return Promise.resolve({accepted:true});
  },
  stopNarration:({requestId})=>{
   calls.push(["narration-stop",requestId]);
   return Promise.resolve({stopped:true});
  },
  seekNarration:({requestId,positionMs})=>{
   calls.push(["narration-seek",requestId,positionMs]);
   return Promise.resolve({seeked:true});
  },
  getNarrationState:()=>Promise.resolve({playing:true})
 };
 const win={
  BibloZooNativeOnlyOutput:{enabled:true},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
   Plugins:{BibloZooNativeSound:bridge}},
  document:{hidden:false,addEventListener:(name,fn)=>{listeners[name]=fn;}},
  addEventListener:(name,fn)=>{listeners[name]=fn;},
  setTimeout,clearTimeout
 };
 vm.runInNewContext(helper,{window:win,Promise,Date,Math,Set,Object,Number,
  Error,setTimeout,clearTimeout});
 return {api:win.BibloZooNativeWheelOfBibleAudio,calls,listeners,
  activation:v=>{activation=v;},playback:v=>{playback=v;}};
}
async function controllerAndNarration(){
 new vm.Script(game,{filename:"verse_playground/wheel_of_bible/game.js"});
 new vm.Script(helper,{filename:"native-wheel-of-bible-audio.js"});
 new vm.Script(shell,{filename:"game-shell.js"});
 assert.match(html,/native-wheel-of-bible-audio\.js[\s\S]*game\.js/);
 assert.match(workflow,/node scripts\/validate_native_playground_wheel_n6p\.js/);
 assert.match(handoff,/N6p Wheel of Bible/);
 assert.match(handoff,/Playground 2\/5/);
 assert.match(handoff,/#56[\s\S]*MERGED/);
 assert.equal(notes.length,36);
 assert.equal(ids.length,38);
 assert.equal(new Set(ids).size,38);
 assert.match(swift,/private let wheelToneRecipes:/);
 assert.match(swift,/prepareWheelToneOnWorker\(soundId: soundId\)/);
 assert.match(swift,/backend = "avengine-wheel-tone"/);
 assert.match(swift,/0\.82/);
 assert.match(swift,/wave=="q"/);
 assert.match(swift,/wave=="s"/);
 assert.match(swift,/wheelToneIDs\.contains\(soundId\)/);
 for(const n of notes){
  assert.ok(helper.includes(n.key+': "'+n.id+'"'),"JS recipe "+n.id);
  assert.ok(swift.includes('"'+n.id+'": ('+
   n.midi+', '+n.ms+', '+n.vol+', "'+types[n.wave]+'")'),
   "Swift baked exact source MIDI/ms/gain/wave "+n.id);
 }
 assert.match(swift,/let reference = soundId\.hasPrefix\("learn-ref-"\)/);
 assert.match(swift,/let verse = soundId\.hasPrefix\("learn-verse-"\)/);
 assert.match(swift,/guard publishedLearnVerseIDs\.contains\(verseId\)/);
 assert.match(swift,/json\["published"\] as\? Bool == true/);
 assert.match(game,/if\(nativeWheelAudio\)return null;/);
 assert.match(game,/if\(nativeWheelAudio\)return Promise\.resolve\(false\)/);
 assert.match(game,/if\(nativeWheelAudio\)return nativeWheelAudio\.isReady\(\)/);
 assert.match(game,/restoreNativeOnGesture: nativeWheelAudio \? \(\) =>/);
 assert.match(game,/useZooEscape: !options\.nativeOnlyAudio|nativeOnlyAudio: !!nativeWheelAudio/);
 const f=fixture();
 assert.ok(f.api.isAvailable());
 assert.deepEqual([...f.api.soundIds],ids);
 assert.equal(f.api.playToneRecipe(50,.045,.12,"square"),false,
  "no note before full gesture preflight");
 assert.equal(f.api.tapUiFromGesture("uiTap1",.42),true);
 await flush();await flush();
 assert.equal(f.calls.filter(c=>c[0]==="preload").length,2,
  "cold title gesture only two UI pops");
 f.calls.length=0;
 assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.42})).ready,true);
 assert.equal(f.calls[0][0],"activate","activateFromGesture first");
 assert.equal(f.calls.filter(c=>c[0]==="preload").length,38);
 assert.ok(f.calls.findIndex(c=>c[0]==="play"&&c[1]==="ui-pop-2") <
  f.calls.findIndex(c=>c[0]==="preload"&&c[1]===notes[0].id));
 f.calls.length=0;
 for(const n of notes)assert.equal(f.api.playToneRecipe(n.midi,n.ms/1000,
  n.vol/1000,n.wave),true,"play finite "+n.id);
 assert.equal(f.api.playToneRecipe(47,.12,.20,"sine"),false,
  "unlisted caller-selected arbitrary pitch never crosses bridge");
 await flush();
 assert.deepEqual(f.calls.filter(c=>c[0]==="play").map(c=>c[1]),
  notes.map(n=>n.id));
 // Native published full verse then ref; requestId matching is vital.
 let p=f.api.playSpoken("john_3_16","verse");
 await flush();await flush();
 let prepared=f.calls.filter(c=>c[0]==="narration-prepare").at(-1);
 assert.equal(prepared[1],"learn-verse-john_3_16");
 let rid=prepared[2];
 assert.ok(f.calls.some(c=>c[0]==="narration-play"&&c[1]===rid));
 let done=false;void p.then(()=>{done=true;});
 f.listeners.biblozooNarration({type:"ended",requestId:rid+2});
 await flush();assert.equal(done,false,"stale ended must never skip actual speech");
 f.listeners.biblozooNarration({type:"ended",requestId:rid});
 assert.equal((await p).ended,true);
 p=f.api.playSpoken("john_3_16","ref",680);
 await flush();await flush();
 prepared=f.calls.filter(c=>c[0]==="narration-prepare").at(-1);
 rid=prepared[2];
 assert.equal(prepared[1],"learn-ref-john_3_16");
 assert.ok(f.calls.some(c=>c[0]==="narration-seek"&&c[1]===rid&&c[2]===680),
  "resume actual reference at last known position");
 assert.ok(f.calls.some(c=>c[0]==="narration-play"&&c[1]===rid));
 const events=[];
 f.api.configure({onAppInactive:()=>events.push("inactive"),
  onAppActive:()=>events.push("active"),
  onPlaybackFailure:()=>events.push("fatal")});
 f.listeners.biblozooAppLifecycle?.({active:false});
 assert.equal((await p).ended,false,"interrupted reference never fakes completion");
 assert.equal(f.api.isReady(),false,"held App Switcher evicts hot PCM");
 const activations=f.calls.filter(c=>c[0]==="activate").length;
 f.listeners.biblozooAppLifecycle?.({active:true});
 assert.equal(f.calls.filter(c=>c[0]==="activate").length,activations,
  "passive app foreground may show Welcome Back but cannot reactivate");
 // A still-playing YouTube PiP rejection is not corrupt audio.
 f.activation({ready:true,reason:"os-accepted"});
 assert.equal((await f.api.prepareFromGesture()).ready,true);
 f.playback({accepted:false,reason:"activation-os-rejected"});
 f.api.playToneRecipe(50,.045,.12,"square");
 await flush();await flush();
 assert.ok(events.includes("inactive") && events.includes("active"));
 assert.ok(!events.includes("fatal"),
  "genuine iOS OS-audio denial stays plain retriable Welcome Back");
}
function actualGameToneCallsites(){
 assert.match(game,/SPIN_TICK_COUNT = 22/);
 assert.match(game,/SPIN_TICK_SPACING_MS = 95/);
 assert.match(game,/50 \+ \(i % 3\) \* 3/);
 assert.match(game,/spinStartedAt = gameNow\(\)/);
 assert.match(game,/const remaining = Math\.max\(0, spinStartedAt \+ i \* SPIN_TICK_SPACING_MS - gameNow\(\)\)/);
 assert.match(game,/cancelQueuedSpinTicks\(\)/);
 assert.match(game,/thawGameTimers\(\)/);
 assert.match(game,/if \(wheelSpinPending\) scheduleRemainingSpinTicks\(\)/);
 assert.match(game,/if\(nativeWheelAudio && nativeWheelMenuOpen\)return true/);
 assert.match(game,/if\(nativeWheelAudio && !muted && !nativeWheelAudio\.isReady\(\)\)/);
 assert.match(game,/playNativeWheelSpoken\("verse"\)|getVerseAudioCandidates\(\),\s*estimateListenMs\(\),"verse"/);
 assert.match(game,/getReferenceAudioCandidates\(\),1600,"ref"/);
 assert.match(game,/if\(nativeWheelAudio\)return playNativeWheelSpoken\(nativeKind\)/);
 assert.match(game,/if\(nativeWheelAudio\)\{nativeWheelAudio\.stopSpoken\(\);return;\}/);
 assert.match(game,/isActive: \(\) => nativeWheelAudio/);
 assert.match(game,/playgroundWelcome\?\.pauseFromNativeInactive\?\.\(\)/);
 assert.match(game,/playgroundWelcome\?\.showAfterNativeActive\?\.\(\)/);
 assert.match(game,/nativeWheelAudio\.prepareFromGesture\(\)/);
 assert.match(game,/primeWheelNativeFromGesture\("start",nativeWheelUiKey\(\)\)/);
 assert.match(game,/primeWheelNativeFromGesture\("resume",nativeWheelUiKey\(\)\)/);
 assert.match(game,/primeWheelNativeFromGesture\("start",nativeWheelUiKey\(\)\)/);
 assert.match(game,/markPlaygroundCompleted\?\.\(/);
 // Execute the REAL function so any future non-finite preset or surprise
 // waveform makes a test fail instead of silently disappearing on iPhone.
 const played=[],scope={
  muted:false,welcomePaused:false,document:{hidden:false},
  nativeWheelPending:false,nativeWheelFailure:false,
  nativeWheelMenuOpen:false,
  nativeWheelAudio:{isReady:()=>true,
   playToneRecipe:(m,d,v,w)=>played.push({m,d,v,w})||true},
  showNativeWheelFailure:()=>{throw Error("unexpected preset")},
  createAudio:()=>{throw Error("iOS must not open WebAudio")},
  Math,Number
 };
 vm.createContext(scope);
 vm.runInContext(section(game,"  function midiToFreq(midi) {",
  "  function keywordMelodyPoolsForLength(")+"\nthis.actualPlay=playTone;",scope);
 for(const n of notes){
  scope.actualPlay({midi:n.midi,duration:n.ms/1000,
   volume:n.vol/1000,type:n.wave});
 }
 assert.equal(played.length,36);
 let before=played.length;
 scope.welcomePaused=true;scope.actualPlay({midi:50,duration:.045,volume:.12,type:"square"});
 scope.welcomePaused=false;scope.nativeWheelMenuOpen=true;
 scope.actualPlay({midi:43,duration:.13,volume:.32,type:"sine"});
 scope.nativeWheelMenuOpen=false;scope.muted=true;
 scope.actualPlay({midi:72,duration:.13,volume:.48});
 assert.equal(played.length,before,"no ghost notes on PiP/menu/mute");
}
function realGameMenu(){
 let menu;
 const actions=[];
 const scope={
  shell:()=>({wireGameMenu:cfg=>{menu=cfg;},
   openHelp:()=>actions.push("help")}),
  MENU_OVERLAY_ID:"wob-menu",HELP_OVERLAY_ID:"wob-help",
  muted:false,welcomePaused:false,nativeWheelPending:false,
  nativeWheelMenuOpen:false,nativeWheelFailure:false,
  nativeWheelAudio:{
   stop:()=>Promise.resolve(),tapUiFromGesture:()=>actions.push("pop")},
  playgroundWelcome:{isPaused:()=>false},
  pauseWheelForReturn:()=>actions.push("pause"),
  nativeWheelUiKey:()=>"uiTap1",
  primeWheelNativeFromGesture:(...args)=>actions.push(["prime",...args]),
  nativeWheelPending:false,
  stopNativeWheelRun:()=>actions.push("stop"),
  stopVerseAudio:()=>{},clearTimers:()=>{},
  bridge:()=>({exitGame:()=>actions.push("exit")}),
  audioCtx:null,masterGain:null,verseAudioEl:null,
  nextSpinTick:0,cancelQueuedSpinTicks:()=>{},stopLiveTones:()=>{},
  remainingSpinTickIndex:()=>0,wheelSpinPending:false,
  scheduleRemainingSpinTicks:()=>{},
  document:{getElementById:()=>null},
  console
 };
 vm.createContext(scope);
 vm.runInContext(section(game,"  function wireGameMenu() {",
  "  function updateHud(")+"\nthis.realWire=wireGameMenu;",scope);
 scope.realWire();
 assert.ok(menu);
 assert.equal(menu.onOpen(),true);
 assert.equal(scope.nativeWheelMenuOpen,true);
 assert.equal(menu.onOpen(),false,"overlapping pointer/click do not open twice");
 menu.onClose();
 assert.deepEqual(actions.find(a=>Array.isArray(a)&&a[0]==="prime"),
  ["prime","resume","uiTap1"],"same real Close gesture prepares 38 before running wheel");
 assert.ok(actions.includes("pause"),"menu freezes same wheel/prizes");
}
(async()=>{
 await controllerAndNarration();
 actualGameToneCallsites();
 realGameMenu();
 console.log("N6p Wheel native 38 PCM, 36 exact source tones, verse/ref ended-only, spin/menu/PiP PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});