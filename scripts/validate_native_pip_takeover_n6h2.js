"use strict";
/* N6h.2: reproduce USER iPhone YouTube PiP scenarios without claiming
 * Node mocks can compile Swift or prove an actual phone speaker is audible.
 * The real Swift code is statically checked; the seven real JS controllers,
 * Home native UI bridge and shared Welcome Back helper run in VM.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const ui = read("verse_games/shared/native-ui-audio.js");
const welcome = read("verse_games/shared/welcome-back-return.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");

const activation = swift.slice(swift.indexOf("@objc func activateFromGesture"),
 swift.indexOf("private func requestedId"));
const unavailable = swift.slice(swift.indexOf("private func unavailableReason"),
 swift.indexOf("@objc func activateFromGesture"));
const handling = swift.slice(swift.indexOf("private func handleInterruption"),
 swift.indexOf("private func onMain"));
assert.ok(activation.length > 1000 && unavailable.length > 100);
assert.match(unavailable,/if session\.isOtherAudioPlaying \{ return "other-audio-playing" \}/,
 "A non-gesture hot play/preload must never take over YouTube PiP");
assert.match(activation,/blocked != "other-audio-playing"/,
 "A REAL child's activation may override the old N6h.1 unconditional PiP gate");
assert.match(activation,/needsRecovery =[\s\S]{0,240}AVAudioSession\.sharedInstance\(\)\.isOtherAudioPlaying/,
 "Even an already-used session must reactivate when another audio app has taken priority");
assert.doesNotMatch(activation,/guard !self\.interrupted[\s\S]*?isOtherAudioPlaying/,
 "The old interrupted+still playing PiP guard must not block an actual Let's go! tap");
assert.match(activation,/try AVAudioSession\.sharedInstance\(\)\.setActive\(true\)/);
assert.match(activation,/self\.needsGestureAfterInterruption = false/);
assert.match(swift,/"otherAudioPlaying": AVAudioSession\.sharedInstance\(\)\.isOtherAudioPlaying/);
assert.doesNotMatch(handling,/\btry\s+AVAudioSession\.sharedInstance\(\)\.setActive/,
 "Interruption notifications only PAUSE; they cannot auto-take-over external video");
assert.equal((swift.match(/try AVAudioSession\.sharedInstance\(\)\.setActive\(true\)/g)||[]).length,1,
 "Single existing native session activation entrypoint, no extra owner");
assert.doesNotMatch(swift,/\b(?:AVAudioSession\.sharedInstance\(\)|audioSession|session)\.set(?:Category|Mode)\(/);
assert.match(welcome,/"activation-os-rejected"/);
assert.match(welcome,/BibloZoo couldn't start sound yet/);
assert.match(workflow,/validate_native_pip_takeover_n6h2\.js/);
assert.match(handoff,/N6h\.2/);

const names=["snake","bible-bugs","food-slice","verse-splat","dino-dash","verse-invaders","verse-munch"];
const controllerExports=[
 "BibloZooNativeSnakeAudio","BibloZooNativeBibleBugsAudio","BibloZooNativeFoodSliceAudio",
 "BibloZooNativeVerseSplatAudio","BibloZooNativeDinoDashAudio",
 "BibloZooNativeVerseInvadersAudio","BibloZooNativeVerseMunchAudio"
];
for(let i=0;i<names.length;i++){
 const source=read("verse_games/shared/native-"+names[i]+"-audio.js");
 const game=read("verse_games/"+["verse_snake","bible_bugs","foodslice","verse_splat","dino_dash","verse_invaders","verse_munch"][i]+"/game.js");
 new Function(source);new Function(game);
 assert.match(source,/TEMPORARY_AUDIO_REASONS/);
 assert.match(source,/"activation-os-rejected"/,
  "Real OS rejection is nonterminal even if PiP didn't yield audio");
 assert.match(source,/if \(TEMPORARY_AUDIO_REASONS\.has\(reason\(why\)\)\)/);
 assert.match(game,/nativeAudioResumeResult\?\.\(result\)/,
  "Manual Welcome Back must preserve the OS reason instead of bool-only false");
}
const flush = async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
function env({competing=true,reject=false}={}){
 const calls=[], warm=new Set(), listeners={};
 let externalAudio=competing, active=!competing, deny=reject;
 const api={
  activateFromGesture(arg){
   calls.push(["gesture",arg.purpose,externalAudio]);
   if(deny) return Promise.resolve({ready:false,reason:"activation-os-rejected"});
   // This emulates the EXPECTED Swift .soloAmbient policy (not hardware proof):
   // an explicit BibloZoo tap may pause competing nonmixable video and
   // reactivate its original single session.
   active=true;externalAudio=false;
   return Promise.resolve({ready:true,attempted:true,reason:"os-accepted"});
  },
  preload(arg){
   calls.push(["preload",arg.soundId]);
   const ok=active&&!externalAudio;
   if(ok)warm.add(arg.soundId);
   return Promise.resolve({prepared:ok,durationMs:ok?70:0,
      reason:ok?"prepared":"other-audio-playing"});
  },
  play(arg){
   calls.push(["play",arg.soundId]);
   const accepted=active&&!externalAudio&&warm.has(arg.soundId);
   return Promise.resolve({accepted,reason:accepted?"scheduled":"pcm-not-preloaded"});
  },
  stop(arg){
   calls.push(["stop",arg.soundId]);
   warm.clear();
   return Promise.resolve({stopped:true});
  },
  addListener(name,fn){
   listeners[name]=fn;
   return Promise.resolve({remove(){}});
  }
 };
 const doc={hidden:false,addEventListener(name,fn){listeners["doc:"+name]=fn;}};
 const win={document:doc,Capacitor:{
   isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:api}},
  BibloZooNativeOnlyOutput:{enabled:true},
  performance:{now:()=>Date.now()},setTimeout,clearTimeout,
  addEventListener(name,fn){listeners["win:"+name]=fn;}};
 return{win,doc,listeners,calls,
  get other(){return externalAudio;},
  playYouTube(){externalAudio=true;active=false;warm.clear();},
  pauseYouTube(){externalAudio=false;},
  rejectNext(on){deny=on;},
  notifyInterruption(){
   // .began can arrive while UIKit remains ACTIVE; bridge emits lifecycle
   // false+true for the existing plain Welcome Back. Neither may activate.
   listeners.biblozooAppLifecycle?.({active:false,reason:"audio-interruption"});
   listeners.biblozooAppLifecycle?.({active:true,reason:"audio-interruption"});
  }
 };
}
function runController(f,i){
 vm.runInNewContext(read("verse_games/shared/native-"+names[i]+"-audio.js"),
    {window:f.win,Date,Promise,Error,console});
 return f.win[controllerExports[i]];
}
async function homeColdStart(){
 const f=env({competing:true});let now=1000;f.win.performance.now=()=>now;
 vm.runInNewContext(ui,{window:f.win,Date,Promise,Error,console});
 const pop=f.win.BibloZooNativeUiAudio;
 assert.equal(f.calls.length,0,"cold native Home MUST NOT steal YouTube merely on load");
 assert.equal(pop.tapFromGesture({isCurrent:()=>true,volume:.15}),true);
 await flush();
 assert.equal(f.calls.filter(x=>x[0]==="gesture").length,1,
  "First deliberate Home UI tap calls Swift activate even with PiP audio playing");
 assert.equal(f.other,false,"Expected .soloAmbient single-session policy reclaims audio");
 assert.equal(f.calls.filter(x=>x[0]==="preload").length,2);
 assert.equal(f.calls.filter(x=>x[0]==="play").length,1,
  "Home plays a fixed native PCM pop without Web/HTML fallback");
 f.playYouTube();
 const count=f.calls.length;
 f.notifyInterruption();
 assert.equal(f.calls.length,count,
  "Neither external .began nor pseudo-foreground can silently interrupt YouTube");
 now+=600;
 assert.equal(pop.tapFromGesture({isCurrent:()=>true,volume:.15}),true);
 await flush();
 assert.equal(f.other,false);
 assert.equal(f.calls.filter(x=>x[0]==="gesture").length,2,
  "Home AGAIN reactivates audio from real user tap after PiP");
 assert.equal(f.calls.filter(x=>x[0]==="play").length,2);
}
async function modeWhilePiPAlreadyRunning(){
 for(let i=0;i<names.length;i++){
  const f=env({competing:true}),controller=runController(f,i);
  let paused=0,resumed=0,fatal=0;
  controller.configure({onAppInactive:()=>paused++,onAppActive:()=>resumed++,
   onPlaybackFailure:()=>fatal++});
  assert.equal(f.calls.length,0,names[i]+" has zero auto-activation on entry");
  const result=await controller.prepareFromGesture();
  assert.equal(result.ready,true,names[i]+" mode tap can reclaim competing PiP");
  assert.equal(f.other,false);
  assert.equal(fatal,0);
  assert.equal(controller.isReady(),true);
  assert.equal(f.calls.filter(x=>x[0]==="gesture").length,1);
  assert.equal(new Set(f.calls.filter(x=>x[0]==="preload").map(x=>x[1])).size,
    controller.soundIds.length,
    names[i]+" prepares native bank after gesture takeover");
  f.playYouTube();f.notifyInterruption();
  assert.ok(paused>0 && resumed>0,
    names[i]+" receives plain Welcome Back lifecycle while game still visible");
  assert.equal(controller.isReady(),false);
  assert.equal(f.calls.filter(x=>x[0]==="gesture").length,1,
    names[i]+" has no automatic foreground activation");
  assert.equal((await controller.prepareFromGesture()).ready,true,
    names[i]+" Let's go recovers while PiP video is STILL running");
  assert.equal(controller.isReady(),true);
  assert.equal(f.other,false,names[i]+" second real gesture takes over again");
  assert.equal(fatal,0);
 }
}
async function userPausedVideoThenReturned(){
 const f=env({competing:false}),controller=runController(f,6);
 assert.equal((await controller.prepareFromGesture()).ready,true);
 f.playYouTube();f.notifyInterruption();f.pauseYouTube();
 const old=f.calls.filter(x=>x[0]==="gesture").length;
 assert.equal((await controller.prepareFromGesture()).ready,true,
  "Existing pause-YouTube-then-return recovery must remain working");
 assert.equal(f.calls.filter(x=>x[0]==="gesture").length,old+1);
}
async function rejectedPriorityIsNotFatal(){
 const f=env({competing:true,reject:true}),controller=runController(f,6);
 let paused=0,shown=0,fatal=0;
 controller.configure({onAppInactive:()=>paused++,onAppActive:()=>shown++,
  onPlaybackFailure:()=>fatal++});
 const result=await controller.prepareFromGesture();
 assert.equal(result.ready,false);
 assert.equal(result.reason,"activation-os-rejected");
 assert.ok(paused>0&&shown>0,"blocked takeover should open plain recoverable return");
 assert.equal(fatal,0,"OS priority denial is NOT a broken bundled PCM sample");
 const win={document:{},setTimeout,clearTimeout,addEventListener(){},
  BibloZooWelcomeBack:{markup:()=>"",setAction(){}},
  BibloZooZooEscape:{create(){}}};
 vm.runInNewContext(welcome,{window:win,document:win.document,
  console,setTimeout,clearTimeout});
 const helper=win.BibloZooWelcomeBackReturn;
 const deferred=helper.nativeAudioResumeResult(result);
 assert.equal(deferred.deferred,true);
 assert.equal(deferred.reason,"activation-os-rejected");
 f.rejectNext(false);
 assert.equal((await controller.prepareFromGesture()).ready,true,
  "After OS denial, a LATER genuine click can still reclaim the native PCM bank");
}
(async()=>{
 await homeColdStart();
 await modeWhilePiPAlreadyRunning();
 await userPausedVideoThenReturned();
 await rejectedPriorityIsNotFatal();
 console.log("N6h.2 PiP: Home first-gesture takeover, all 7 game modes, PiP-still-running manual Welcome Back, paused-video recovery, no auto activation, recoverable OS rejection PASS (VM/source only)");
})().catch(e=>{console.error(e);process.exitCode=1;});
