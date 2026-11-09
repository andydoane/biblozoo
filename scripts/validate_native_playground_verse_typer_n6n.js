"use strict";
// N6n: CI verifies source and mocked bridge contracts; it DOES NOT compile
// Swift, establish acoustic onset or replace actual owner iPhone testing.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const helper=read("verse_games/shared/native-verse-typer-audio.js");
const game=read("verse_playground/verse_typer/game.js");
const shell=read("verse_games/shared/game-shell.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_playground/verse_typer/index.html");
const handoff=read("docs/PROJECT-HANDOFF.md");
const ci=read(".github/workflows/ios-prep-validation.yml");
const pitches=[55,60,62,64,65,67,69,71,72];
const effects=["wrong","wordDone","popup","cocoon","flap0","flap1","flap2","flyAway"];
const ids=[
 ...pitches.map(n=>"typer-note-"+n),
 "typer-wrong","typer-word-done","typer-popup","typer-cocoon",
 "typer-flap0","typer-flap1","typer-flap2","typer-fly-away",
 "ui-pop-1","ui-pop-2"
];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function chunk(a,b){
 const i=game.indexOf(a),j=game.indexOf(b,i+a.length);
 assert.ok(i>=0 && j>i,"missing actual source: "+a);
 return game.slice(i,j);
}
function fixture(){
 const calls=[],listeners={};let active={ready:true,reason:"os-accepted"};
 let playResult={accepted:true};
 const bridge={
   activateFromGesture:({purpose})=>{calls.push(["activate",purpose]);return Promise.resolve(active);},
   preload:({soundId})=>{calls.push(["preload",soundId]);return Promise.resolve({prepared:true,durationMs:220});},
   play:({soundId,volume})=>{calls.push(["play",soundId,volume]);return Promise.resolve(playResult);},
   stop:({soundId})=>{calls.push(["stop",soundId]);return Promise.resolve({stopped:true});},
   addListener:(name,fn)=>{listeners[name]=fn;return Promise.resolve({remove(){}});},
   prepareNarration:({soundId,requestId})=>{
     calls.push(["narration-prepare",soundId,requestId]);
     return Promise.resolve({prepared:true,durationMs:4500});
   },
   seekNarration:({requestId,positionMs})=>{
     calls.push(["narration-seek",requestId,positionMs]);
     return Promise.resolve({seeked:true});
   },
   playNarration:({requestId})=>{
     calls.push(["narration-play",requestId]);
     return Promise.resolve({accepted:true});
   },
   stopNarration:({requestId})=>{
     calls.push(["narration-stop",requestId]);
     return Promise.resolve({stopped:true});
   },
   getNarrationState:()=>Promise.resolve({prepared:true,playing:true})
 };
 const win={
   BibloZooNativeOnlyOutput:{enabled:true},
   Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:bridge}},
   document:{hidden:false,addEventListener:(key,fn)=>{listeners[key]=fn;}},
   addEventListener:(key,fn)=>{listeners[key]=fn;},setTimeout,clearTimeout
 };
 vm.runInNewContext(helper,{window:win,Promise,Math,Number,Date,Set,Object,
   Error,setTimeout,clearTimeout});
 return{api:win.BibloZooNativeVerseTyperAudio,calls,listeners,
   setActive:v=>{active=v;},setPlayback:v=>{playResult=v;}};
}
async function testBridge(){
 new vm.Script(game,{filename:"verse_playground/verse_typer/game.js"});
 new vm.Script(helper,{filename:"native-verse-typer-audio.js"});
 new vm.Script(shell,{filename:"game-shell.js"});
 assert.match(html,/native-verse-typer-audio\.js[\s\S]*game\.js/);
 assert.match(ci,/validate_native_playground_verse_typer_n6n\.js/);
 assert.match(handoff,/N6n Verse Typer/);
 assert.match(handoff,/12\/12/);
 assert.match(swift,/private let typerNoteMIDIs: Set<Int> = \[55, 60, 62, 64, 65, 67, 69, 71, 72\]/);
 assert.match(swift,/private let typerToneIDs: Set<String>/);
 assert.match(swift,/prepareTyperToneOnWorker\(soundId: soundId\)/);
 assert.match(swift,/backend = "avengine-typer-tone"/);
 assert.match(swift,/gain \* 0\.85/);
 assert.match(swift,/public\/verse_audio/); // reuse native Learn narration
 assert.match(shell,/typeof options\.restoreNativeOnGesture === "function"/);
 assert.match(shell,/useZooEscape: !options\.nativeOnlyAudio/);
 assert.match(shell,/suppressUiSound: !!options\.nativeOnlyAudio/);
 assert.match(game,/restoreNativeOnGesture: nativeTyperAudio \? \(\) =>/);
 assert.match(game,/if\(nativeTyperAudio\)return playNativeTyperChunk\(file,runToken\)/);
 assert.match(game,/if \(nativeTyperAudio\) return null;/);
 assert.match(game,/if \(nativeTyperAudio\) return Promise\.resolve\(false\);/);
 assert.match(game,/if \(nativeTyperAudio\) return nativeTyperAudio\.isReady\(\);/);
 const f=fixture();
 assert.equal(f.api.isAvailable(),true);
 assert.equal(f.api.soundIds.length,19);
 assert.deepEqual([...f.api.soundIds],ids);
 assert.equal(new Set([...f.api.soundIds]).size,19);
 for(const id of ids)assert.ok(swift.includes('"'+id+'"'),"missing Swift ID "+id);
 assert.equal(f.api.tapUiFromGesture("uiTap1",.12),true);
 await flush();await flush();
 assert.equal(f.calls.filter(x=>x[0]==="preload").length,2,
   "title tap only prewarms two UI clips");
 f.calls.length=0;
 assert.equal((await f.api.prepareFromGesture({key:"uiTap2",volume:.12})).ready,true);
 assert.equal(f.calls[0][0],"activate","real child click claims priority before async");
 assert.equal(f.calls.filter(x=>x[0]==="preload").length,19);
 assert.ok(f.calls.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-2") <
   f.calls.findIndex(x=>x[0]==="preload"&&x[1]==="typer-note-55"),
   "mode pop before full musical bank");
 f.calls.length=0;
 for(const n of pitches)assert.equal(f.api.play("note"+n,1),true);
 for(const name of effects)assert.equal(f.api.play(name,1),true);
 await flush();
 assert.deepEqual(f.calls.filter(x=>x[0]==="play").map(x=>x[1]),ids.slice(0,17),
   "all nine original notes plus eight phrase effects dispatched");
 const events=[];
 f.api.configure({onAppInactive:()=>events.push("paused"),
   onAppActive:()=>events.push("welcome"),
   onPlaybackFailure:()=>events.push("fatal")});
 f.setPlayback({accepted:false,reason:"activation-os-rejected"});
 f.api.play("wrong",1);
 await flush();await flush();
 assert.deepEqual(events,["paused","welcome"],
   "PiP genuine OS denial gives retriable plain Welcome Back");
 assert.equal(f.api.isReady(),false);
 f.setActive({ready:true,reason:"os-accepted"});
 f.setPlayback({accepted:true});
 assert.equal((await f.api.prepareFromGesture()).ready,true);

 // The N5b published narrator is independent of PCM. Only matching actual
 // AVAudioPlayerDelegate ended releases the child-facing review stage.
 const pending=f.api.playChunk("john_3_16",1);
 await flush();await flush();
 const prep=f.calls.find(x=>x[0]==="narration-prepare");
 assert.equal(prep[1],"learn-part-john_3_16-1");
 const rid=prep[2];
 assert.ok(f.calls.find(x=>x[0]==="narration-play"&&x[1]===rid));
 let complete=false;
 void pending.then(()=>{complete=true;});
 f.listeners.biblozooNarration({type:"ended",requestId:rid+19});
 await flush();
 assert.equal(complete,false,"stale narrator event must never advance words");
 f.listeners.biblozooNarration({type:"ended",requestId:rid});
 assert.equal((await pending).ended,true,"only matching ended advances");
 const second=f.api.playChunk("john_3_16",2,750);
 await flush();await flush();
 const prep2=f.calls.filter(x=>x[0]==="narration-prepare").at(-1);
 assert.equal(prep2[1],"learn-part-john_3_16-2");
 assert.ok(f.calls.find(x=>x[0]==="narration-seek"&&x[1]===prep2[2]&&x[2]===750));
 const before=f.calls.filter(x=>x[0]==="activate").length;
 f.listeners.biblozooAppLifecycle({active:false});
 assert.equal((await second).ended,false,"mid-part switch cannot fake ended");
 assert.equal(f.api.isReady(),false);
 f.listeners.biblozooAppLifecycle({active:true});
 assert.equal(f.calls.filter(x=>x[0]==="activate").length,before,
   "passive foreground never activates audio");
}
function testRealMelodyAndClock(){
 const heard=[];
 const scope={
   state:{currentMelody:pitches.slice(),typedIndex:0,paused:false,
     butterflyFlaps:0,currentItem:{expected:"abcdefghi"}},
   nativeTyperAudio:{play:(key,volume)=>heard.push([key,volume])},
   nativeTyperNotes:new Set(pitches),
   muted:false,returnPaused:false,nativeTyperPending:false,nativeTyperFailure:false,
   Math,Number,
   trackedTimeout:()=>{throw Error("must not schedule hot WebAudio notes on native")},
   console
 };
 vm.createContext(scope);
 vm.runInContext(chunk("  function playCorrectLetterSound() {",
   "  function tokenizeWords(")+
   chunk("  function playPopupSound() {","  function clearKeyboardForFinale() {")+
   "\nthis.sounds={correct:playCorrectLetterSound,wrong:playWrongSound,"+
   "done:playWordDoneSound,popup:playPopupSound,cocoon:playCocoonOpenSound,"+
   "flap:playFlapSound,fly:playButterflyFlyAwaySound};",scope);
 for(let i=0;i<pitches.length;i++){
   scope.state.typedIndex=i;scope.sounds.correct();
 }
 for(const k of ["wrong","done","popup","cocoon","fly"])scope.sounds[k]();
 for(let i=0;i<3;i++){scope.state.butterflyFlaps=i;scope.sounds.flap();}
 assert.deepEqual(heard.map(x=>x[0]),
   pitches.map(n=>"note"+n).concat(["wrong","wordDone","popup","cocoon",
     "flyAway","flap0","flap1","flap2"]),
   "real Verse Typer game calls exact source MIDI/phrase IDs");
 assert.ok(heard.every(x=>x[1]===1),"original gain baked into native PCM");
 const n=heard.length;
 scope.state.paused=true;scope.sounds.correct();
 scope.state.paused=false;scope.returnPaused=true;scope.sounds.wrong();
 assert.equal(heard.length,n,"no sound while Menu/App Switcher paused");

 let clock=1000;
 const timing={
   welcomeClock:{now:()=>clock},performance:{now:()=>clock},
   nativeTyperAudio:{},nativeHoldStarted:0,nativeHoldTotal:0,
   state:{screen:"game"},console
 };
 vm.createContext(timing);
 vm.runInContext(chunk("  function typerNow(){","  function stopNativeTyperRound()")+ 
   "\nthis.clock={now:typerNow,begin:beginNativeHold,end:finishNativeHold};",timing);
 assert.equal(timing.clock.now(),1000);
 timing.clock.begin();clock=31000;
 assert.equal(timing.clock.now(),1000,"native menu preflight freezes virtual time");
 timing.clock.end();
 assert.equal(timing.clock.now(),1000,"no bonus or typing timer fast-forward");
}
(async()=>{
 await testBridge();
 testRealMelodyAndClock();
 console.log("N6n Verse Typer: 19 fixed PCM cues, exact original MIDI/phrases, published narrator ended-only, clock/PiP PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});