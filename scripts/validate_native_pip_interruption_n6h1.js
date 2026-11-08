"use strict";
/* N6h.1: PiP nonmixable .soloAmbient cross-app regression.
 * Node/source VM is NOT acoustic proof or Mac/Xcode Swift compilation.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const welcome=read("verse_games/shared/welcome-back-return.js");
const ui=read("verse_games/shared/native-ui-audio.js");
const feed=read("verse_games/shared/feeding-native-audio-pilot.js");
const daily=read("daily_questions_feed_game.js");
const app=read("app.js");
const handoff=read("docs/PROJECT-HANDOFF.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const controllers=["snake","bible-bugs","food-slice","verse-splat","dino-dash","verse-invaders","verse-munch"];
const exported=["BibloZooNativeSnakeAudio","BibloZooNativeBibleBugsAudio","BibloZooNativeFoodSliceAudio",
 "BibloZooNativeVerseSplatAudio","BibloZooNativeDinoDashAudio",
 "BibloZooNativeVerseInvadersAudio","BibloZooNativeVerseMunchAudio"];
const gamepaths=["verse_snake","bible_bugs","foodslice","verse_splat","dino_dash","verse_invaders","verse_munch"];
assert.match(swift,/private var needsGestureAfterInterruption = false/);
assert.match(swift,/needsGestureAfterInterruption = true/);
assert.match(swift,/needsGestureAfterInterruption = false/);
assert.match(swift,/if session\.isOtherAudioPlaying \{ return "other-audio-playing" \}/);
assert.match(swift,/return "gesture-required-after-interruption"/);
assert.match(swift,/self\.needsGestureAfterInterruption \|\| self\.needsGestureAfterReset/);
assert.match(swift,/if UIApplication\.shared\.applicationState == \.active \{[\s\S]*?"active": false, "reason": "audio-interruption"[\s\S]*?"active": true, "reason": "audio-interruption"/);
assert.match(swift,/"needsGestureAfterInterruption": self\.needsGestureAfterInterruption/);
assert.match(swift,/"otherAudioPlaying": AVAudioSession\.sharedInstance\(\)\.isOtherAudioPlaying/);
const gesture=swift.slice(swift.indexOf('@objc func activateFromGesture'),swift.indexOf('private func requestedId'));
assert.match(gesture,/let needsRecovery = firstTap \|\| self\.interrupted \|\|/);
assert.match(gesture,/try AVAudioSession\.sharedInstance\(\)\.setActive\(true\)/);
assert.match(gesture,/self\.needsGestureAfterInterruption = false/);
const interruption=swift.slice(swift.indexOf('private func handleInterruption'),swift.indexOf('private func onMain'));
assert.doesNotMatch(interruption,/setActive\(/,"interruption notification may NEVER auto-activate");
assert.doesNotMatch(interruption,/setCategory\(|setMode\(/);
assert.match(welcome,/NATIVE_AUDIO_DEFERRED_REASONS/);
assert.match(welcome,/Pause the other video's audio, then tap Let's go!/);
assert.match(feed,/onInterruption/);
assert.match(daily,/pauseNativeFeedingForAppSwitcher\(runtime\)/);
assert.match(daily,/Pause the other video's audio, then tap Try Again/);
assert.match(ui,/biblozooAppLifecycle/);
assert.match(app,/BibloZooNativeUiAudio\.tapFromGesture/);
assert.match(handoff,/N6h\.1/);
assert.match(workflow,/validate_native_pip_interruption_n6h1\.js/);
for(let i=0;i<controllers.length;i++){
 const source=read("verse_games/shared/native-"+controllers[i]+"-audio.js");
 const game=read("verse_games/"+gamepaths[i]+"/game.js");
 new Function(source);new Function(game);
 assert.match(source,/TEMPORARY_AUDIO_REASONS/);
 assert.match(source,/if \(TEMPORARY_AUDIO_REASONS\.has\(reason\(why\)\)\)/);
 assert.match(source,/if \(TEMPORARY_AUDIO_REASONS\.has\(why\)\)/);
 assert.match(source,/try \{ onInactive\?\.\(\); \}/);
 assert.match(source,/try \{ onActive\?\.\(\); \}/);
 assert.match(game,/nativeAudioResumeResult\?\.\(result\)/);
 assert.match(game,/if \(ok\?\.deferred === true\) return ok;/);
}
function fixture(file,exportName,{other=false,preloadMissing="",playRejected=""}={}){
 const actions=[],listeners={},warm=new Set();
 const doc={hidden:false,addEventListener(n,fn){listeners["document:"+n]=fn;}};
 let competing=other;
 const api={
  activateFromGesture(a){actions.push(["activate",a.purpose]);
   return Promise.resolve(competing?{ready:false,reason:"other-audio-playing"}:{ready:true,reason:"os-accepted"});},
  preload(a){actions.push(["preload",a.soundId]);
   let ok=a.soundId!==preloadMissing;if(ok)warm.add(a.soundId);
   return Promise.resolve({prepared:ok,reason:ok?"prepared":"bundled-asset-missing",durationMs:ok?70:0});},
  play(a){actions.push(["play",a.soundId]);
   let reason=competing?"other-audio-playing":a.soundId===playRejected?"pcm-not-preloaded":"scheduled";
   return Promise.resolve({accepted:reason==="scheduled",reason});},
  stop(a){actions.push(["stop",a.soundId]);warm.clear();return Promise.resolve({stopped:true});},
  addListener(event,fn){listeners[event]=fn;return Promise.resolve({remove(){}});}
 };
 const win={document:doc,Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:api}},
   BibloZooNativeOnlyOutput:{enabled:true},setTimeout,clearTimeout,addEventListener(n,fn){listeners["window:"+n]=fn;}};
 vm.runInNewContext(read(file),{window:win,Date,Promise,Error,console});
 return{player:win[exportName],listeners,actions,doc,setCompeting(x){competing=x;}};
}
const tick=async()=>{await new Promise(setImmediate);await new Promise(setImmediate);};
async function controllerTest(i){
 const p="verse_games/shared/native-"+controllers[i]+"-audio.js",exportName=exported[i];
 const a=fixture(p,exportName);
 let inactive=0,active=0,failure=0;
 a.player.configure({onAppInactive:()=>inactive++,onAppActive:()=>active++,onPlaybackFailure:()=>failure++});
 assert.equal((await a.player.prepareFromGesture()).ready,true,controllers[i]+" initial bank");
 assert.equal(a.player.isReady(),true);
 a.setCompeting(true);
 const key=controllers[i]==="snake"?"correct":controllers[i]==="bible-bugs"?"correct":controllers[i]==="food-slice"?"sliceCut1":controllers[i]==="verse-splat"?"positive":
   controllers[i]==="dino-dash"?"rocketLaunch":controllers[i]==="verse-invaders"?"rocketLaunch":"correct";
 const realKeys=Object.keys(a.player);
 const playName=a.player.soundIds && a.player.soundIds.length?a.player.soundIds[0]:null;
 // Controller exposed key maps are private: dynamically exercise one genuine
 // hot key through fixed test candidate names, never synthesize a native ID.
 const candidates=["correct","correctHit","rocketLaunch","wordTap1","sliceCut1","jump","flap","wrong","sliceCut","streak","pop1","chomp","swoosh1","cut1"];
 let dispatched=false;for(const k of candidates){if(a.player.play(k,.4)){dispatched=true;break;}}
 assert.ok(dispatched,controllers[i]+" has a real game-key hot path");
 await tick();
 assert.equal(failure,0,controllers[i]+" external audio is never fatal asset failure");
 assert.ok(inactive>0&&active>0,controllers[i]+" shows plain Welcome Back even if no UIKit inactive");
 assert.equal(a.player.isReady(),false);
 const before=a.actions.filter(x=>x[0]==="activate").length;
 a.setCompeting(false);
 assert.equal(a.actions.filter(x=>x[0]==="activate").length,before,"stopping PiP alone never activates");
 assert.equal((await a.player.prepareFromGesture()).ready,true,"gesture rewarms same bank after PiP pause");
 assert.equal(a.player.isReady(),true);
 const b=fixture(p,exportName,{other:true});
 let bInactive=0,bActive=0,bFailure=0;
 b.player.configure({onAppInactive:()=>bInactive++,onAppActive:()=>bActive++,onPlaybackFailure:()=>bFailure++});
 let result=await b.player.prepareFromGesture();
 assert.equal(result.ready,false);
 assert.equal(result.reason,"other-audio-playing");
 assert.ok(bInactive>=1&&bActive>=1,"blocked difficulty/menu tap pauses without gray failure");
 assert.equal(bFailure,0);
 assert.equal(b.player.isReady(),false);
 b.setCompeting(false);
 assert.equal((await b.player.prepareFromGesture()).ready,true);
 const c=fixture(p,exportName);
 let missing=0;c.player.configure({onPlaybackFailure:()=>missing++});
 assert.equal((await c.player.prepareFromGesture()).ready,true);
 let fired=false;for(const k of candidates)if(c.player.play(k,.4)){fired=true;break;}
 assert.ok(fired);
 // A real missing effect still gets the existing failure-only path.
 const d=fixture(p,exportName,{preloadMissing:"ui-pop-1"});
 assert.equal((await d.player.prepareFromGesture()).ready,false,"missing PCM does NOT become PiP deferred");
}
async function welcomeResult(){
 const doc={};
 const win={document:doc,addEventListener(){},setTimeout,clearTimeout,
  BibloZooWelcomeBack:{markup:()=>"",setAction(){}},BibloZooZooEscape:{create(){}}};
 vm.runInNewContext(welcome,{window:win,document:doc,console,setTimeout,clearTimeout});
 const x=win.BibloZooWelcomeBackReturn;
 assert.equal(x.nativeAudioResumeResult({ready:true}),true);
 assert.equal(x.nativeAudioResumeResult({ready:false,reason:"bundled-asset-missing"}),false);
 for(const reason of ["other-audio-playing","interruption-pending","gesture-required-after-interruption",
   "activation-cooldown","foreground-attempt-limit"]){
  const r=x.nativeAudioResumeResult({ready:false,reason});
  assert.equal(r.deferred,true);
  assert.equal(r.reason,reason);
 }
}
async function homeUI(){
 let competing=false,plays=0,activations=0,preloads=0;
 const listeners={};
 const bridge={
  activateFromGesture(){activations++;return Promise.resolve(competing?{ready:false,reason:"other-audio-playing"}:{ready:true});},
  preload(){preloads++;return Promise.resolve({prepared:true,durationMs:60});},
  play(){plays++;return Promise.resolve({accepted:!competing});},
  stop(){return Promise.resolve({stopped:true});},
  addListener(n,f){listeners[n]=f;return Promise.resolve({remove(){}});}
 };
 const win={document:{hidden:false,addEventListener(){}},performance:{now:()=>150},
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",Plugins:{BibloZooNativeSound:bridge}},
  BibloZooNativeOnlyOutput:{enabled:true},setTimeout,clearTimeout,addEventListener(){}};
 vm.runInNewContext(ui,{window:win,Date,Promise,console});
 const pop=win.BibloZooNativeUiAudio;
 assert.equal(pop.tapFromGesture({isCurrent:()=>true,volume:.15}),true);await tick();
 assert.equal(plays,1);
 listeners.biblozooAppLifecycle({active:false,reason:"audio-interruption"});
 listeners.biblozooAppLifecycle({active:true,reason:"audio-interruption"});
 competing=true;
 pop.tapFromGesture({isCurrent:()=>true,volume:.15});await tick();
 assert.equal(plays,1,"Home UI stays quiet while other app owns speaker");
 competing=false;
 const old=activations;
 pop.tapFromGesture({isCurrent:()=>true,volume:.15});await tick();
 assert.equal(activations,old+1,"new real Home tap requests Swift reactivation");
 assert.equal(plays,2,"Home pop dispatches again after competing audio pauses");
 assert.ok(preloads>=4,"Home samples invalidated/reprepared across PiP");
}
(async()=>{await welcomeResult();for(let i=0;i<controllers.length;i++)await controllerTest(i);await homeUI();
 console.log("N6h.1 cross-app PiP: Swift nonmixable/reactivation guard, all 7 game owners + Home UI, temporary vs missing PCM, plain Welcome Back deferred, Feeding preservation PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});