/* N7g: real Native Read facade VM; replay identity, bounded lifetime,
 * app/OS interruption invalidation, delayed-cue + stale-ACK closure.
 * Actual iPhone routing and microphone hardware still require owner PASS.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const adapter=read("verse_games/shared/native-read-my-verse-output-n7f.js");
const swift=read("ios/App/App/SceneDelegate.swift");
const flash=read("verse_games/shared/native-flashcards-capture-n7c.js");
const activity=read("read_my_verse.js");
const wf=read(".github/workflows/ios-prep-validation.yml");
const has=(s,part,why)=>assert(s.includes(part),why+": "+part);
for(const source of [adapter,flash,activity]) new vm.Script(source);
has(wf,"validate_native_n7g_integrated_audio_lifecycle.js",
    "N7g regression must be mandatory on isolated native branch");
has(adapter,"const clips = new Map();","Native Read event owners explicitly indexed");
has(adapter,"clips.set(requestId,this);","Read only retains actual active play attempts");
has(adapter,"clips.delete(this._requestId);",
    "A completed/stopped clip does not leak a JS media owner");
has(adapter,'const requestId="rmv-"+(++counter);',
    "Each replay gets a unique token even on the same Audio object");
has(adapter,"epoch !== lifecycleEpoch",
    "Queued tone callback is cancelled after stopped or interrupted session");
has(adapter,"activation !== claimedActivation",
    "An old async activation cannot play after external AirPods Play");
has(adapter,"onAppInactive,playCue,stopCues,stopAll",
    "Original N7f.2 held-switch lifecycle events retained");
const readPlugin=swift.slice(swift.indexOf("@objc(BibloZooNativeReadOutputPlugin)"));
const flashPlugin=swift.slice(swift.indexOf("@objc(BibloZooMicSessionProbePlugin)"),
    swift.indexOf("// N7f: Read My Verse OUTPUT only."));
has(readPlugin,'AVAudioSession.InterruptionType.began.rawValue',
    "External audio interruption cancels native Read players");
has(readPlugin,"case .oldDeviceUnavailable, .newDeviceAvailable,",
    "Read handles actual Bluetooth device route changes");
has(readPlugin,"case .noSuitableRouteForCategory:",
    "No usable route cancels native Read playback");
has(readPlugin,"self?.cancelAll(reason: \"interrupted\")",
    "OS route/background/media reset invalidates native Read output");
has(readPlugin,'UIApplication.willResignActiveNotification',
    "Held App Switcher cancels audio before delayed WebKit visibility");
has(readPlugin,'AVAudioSession.mediaServicesWereResetNotification',
    "Media-services reset cancellation");
has(readPlugin,'self.clips.removeValue(forKey: id)',
    "Native AVAudioPlayer object released when stopped");
has(readPlugin,'self.clips.removeValue(forKey: id)',
    "Native output delegate removes finished track");
has(readPlugin,'clips.removeAll()',
    "All native Read AVAudioPlayer handles discarded on exit");
has(readPlugin,'cues.removeAll()',
    "Generated RAM note players cleaned up");
has(readPlugin,'return verse["published"] as? Bool == true',
    "Read source checks bundled published verse metadata");
has(readPlugin,'self.isDevBundle',
    "Native Read plugin requires separate Audio Test bundle");
has(readPlugin,'AVAudioSession.sharedInstance().category == .soloAmbient',
    "Shared session remains nonmixing and nonducking");
assert(!/notifyOthersOnDeactivation|\.mixWithOthers|\.duckOthers/.test(
    readPlugin.replace(/\/\/[^\n]*/g,"")),
    "Read plugin never auto-resumes external Apple Music");
has(flashPlugin,'savedSamples.removeAll(keepingCapacity: false)',
    "RAM take erased when discarded/failed");
has(flashPlugin,'self.savedTakeId = ""',
    "Opaque RAM voice token invalidated on discard");
has(flashPlugin,'self.playbackGeneration += 1',
    "Flashcards cancels late native playback worker");
has(flashPlugin,'completionCallbackType: .dataPlayedBack',
    "Only native actually played-back Wacky/voice completion counts");
has(flash,'captureKey: token',
    "Flashcards only accepts live capture generation");
has(flash,'event?.playToken !== activePlayToken',
    "Flashcards dry replay ignores stale take completion");
has(flash,'event?.playToken !== funPlayToken',
    "Wacky started/ended tokens remain isolated");
has(flash,'!hasRecording || !takeMetadata?.takeId || doc.hidden',
    "No spontaneous voice playback without a real RAM take/foreground");
has(activity,"pauseReadForInterruption();",
    "Read source still owns single truthful recovery gate");
has(activity,"root?.BibloZooNativeReadOutputController?.onAppInactive?.(",
    "N7f.2 early native app inactivity still freezes animations");
has(adapter,"this._clipId=clipIdFor(next);",
    "Changing native media src re-checks fixed bundle allowlist");
for(const p of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
 "docs/AUDIO-RECOVERY.md","docs/N7G-INTEGRATED-AUDIO-RELIABILITY-PRIVACY-GATE.md"])
 has(read(p),"N7g","All mandatory handoff documents updated");

function instrument(){
 // No testing or debug exports are shipped. Expose the private map only
 // inside this isolated VM so tests can prove an exact zero-owner invariant.
 const needle="  root.BibloZooNativeReadOutputController=Object.freeze({";
 has(adapter,needle,"Source insertion anchor");
 return adapter.replace(needle,
   "  root.__testN7gActiveClipOwners=()=>clips.size;\n"+needle);
}
function newFixture(){
 const calls=[],listeners={},docEvents={};
 let accept=true,activateDeferred=null,playDeferred=null;
 const native={
   addListener(name,fn){listeners[name]=fn;
     return Promise.resolve({remove(){}});},
   activateFromGesture(){
     calls.push({op:"activate"});
     return activateDeferred ?
       new Promise(resolve=>{activateDeferred=resolve;}) :
       Promise.resolve({activated:accept});
   },
   playClip(args){
     calls.push({op:"play",...args});
     if(playDeferred){
       return new Promise(resolve=>{playDeferred=resolve;});
     }
     return Promise.resolve({started:accept,
       reason:accept?"":"os-denied",positionMs:args.positionMs,
       durationMs:1800});
   },
   stopClip(args){calls.push({op:"stop-clip",...args});
     return Promise.resolve({stopped:true});},
   seekClip(args){calls.push({op:"seek",...args});
     return Promise.resolve({seeked:true});},
   stopAll(){calls.push({op:"stop-all"});
     return Promise.resolve({stopped:true});},
   playCue(args){calls.push({op:"cue",...args});
     return Promise.resolve({played:true});},
   stopCues(){calls.push({op:"stop-cues"});
     return Promise.resolve({stopped:true});}
 };
 const doc={hidden:false,addEventListener(k,fn){docEvents[k]=fn;}};
 const win={document:doc,
   BibloZooNativeOnlyOutput:{enabled:true},
   Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
     Plugins:{BibloZooNativeReadOutput:native}},
   addEventListener(){}};
 vm.runInNewContext(instrument(),{window:win,
   Map,Set,Promise,Math,Array,Object,Number,String,Error});
 return {
   win,doc,calls,listeners,docEvents,
   api:win.BibloZooNativeReadOutputController,
   size:()=>win.__testN7gActiveClipOwners(),
   setAccepted(x){accept=x},
   deferActivation(){activateDeferred=true;},
   finishActivation(result={activated:true}){
     assert(typeof activateDeferred==="function");
     const fn=activateDeferred;activateDeferred=null;fn(result);
   },
   deferPlay(){playDeferred=true;},
   finishPlay(result={started:true,positionMs:0,durationMs:1800}){
     assert(typeof playDeferred==="function");
     const fn=playDeferred;playDeferred=null;fn(result);
   },
   lastPlay:()=>calls.filter(c=>c.op==="play").at(-1)
 };
}
const tick=()=>new Promise(r=>setImmediate(r));
async function run(){
 const f=newFixture(),api=f.api;
 assert(api.enabled);
 assert.equal(f.calls.length,0,
   "Passive plugin load/listeners never activate audio");
 // Existing code left every Audio object in a global Map even with NO
 // playback, retaining all key click/phrase references indefinitely.
 const passive=Array.from({length:500},(_,i)=>
   new api.NativeAudio("./verse_audio/john_3_16a.mp3"));
 assert.equal(f.size(),0,
   "Five hundred unplayed previews consume ZERO active media owners");
 assert.equal(f.calls.length,0);
 let errors=0;
 passive[0].addEventListener("error",()=>errors++);
 f.listeners.biblozooReadLifecycle({phase:"other"});
 assert.equal(errors,0);
 await api.activateFromGesture();
 const audio=passive[0];
 let completed=0,interrupted=0;
 audio.addEventListener("ended",()=>completed++);
 audio.addEventListener("error",()=>interrupted++);
 const firstResult=await audio.play();
 assert.equal(firstResult,true);
 const one=f.lastPlay();
 assert.equal(one.clipId,"verse:john_3_16a");
 assert.equal(f.size(),1);
 assert.equal(audio.ended,false,
   "Bridge started ACK cannot fake listened-to completion");
 f.listeners.biblozooReadOutput({
   kind:"progress",requestId:one.requestId,positionMs:550,durationMs:1800});
 assert.equal(audio.currentTime,0.55,
   "Only real native clock updates currentTime");
 f.listeners.biblozooReadOutput({
   kind:"ended",requestId:one.requestId,positionMs:1800,durationMs:1800});
 assert.equal(completed,1);
 assert.equal(f.size(),0,
   "Real native delegate ending drops JavaScript owner immediately");
 const second=await audio.play();
 assert.equal(second,true);
 const two=f.lastPlay();
 assert.notEqual(two.requestId,one.requestId,
   "Replaying SAME Audio cannot reuse a completed token");
 f.listeners.biblozooReadOutput({
   kind:"ended",requestId:one.requestId,positionMs:1800,durationMs:1800});
 assert.equal(completed,1,
   "An old native ended event cannot complete the new playback");
 f.listeners.biblozooReadOutput({
   kind:"progress",requestId:one.requestId,positionMs:1800,durationMs:1800});
 assert.equal(audio.currentTime,1.8,
   "Stale previous progress must not replace new native play position");
 f.listeners.biblozooReadOutput({
   kind:"ended",requestId:two.requestId,positionMs:1800,durationMs:1800});
 assert.equal(completed,2);
 assert.equal(f.size(),0);

 // Repeated Typewriter/Keyboard taps leave NO long-term strong references.
 for(let i=0;i<40;i++){
   const tiny=new api.NativeAudio("./verse_images/read_my_verse/typewriter_1.mp3");
   await tiny.play();
   const request=f.lastPlay().requestId;
   f.listeners.biblozooReadOutput({kind:"ended",
     requestId:request,positionMs:1800,durationMs:1800});
   assert.equal(f.size(),0);
 }
 // Play pause replay across an unchanged Audio object also rotates its ID.
 await audio.play();
 const three=f.lastPlay();
 audio.pause();
 assert.equal(f.size(),0);
 assert(f.calls.some(c=>c.op==="stop-clip"&&c.requestId===three.requestId));
 await audio.play();
 const four=f.lastPlay();
 assert.notEqual(four.requestId,three.requestId);
 f.listeners.biblozooReadOutput({kind:"ended",requestId:three.requestId});
 assert.equal(completed,2);
 assert.equal(f.size(),1);
 f.listeners.biblozooReadOutput({kind:"ended",requestId:four.requestId,
   positionMs:1800,durationMs:1800});
 assert.equal(f.size(),0);

 // A cached Crawl-like track reused after stopAll must re-register and
 // still receive the ACTUAL new native ended event.
 api.stopAll(); await tick();
 assert.equal(f.size(),0);
 await assert.rejects(audio.play(),
   "Without deliberate Resume Audio, stopped activity cannot restart");
 await api.activateFromGesture();
 await audio.play();
 const five=f.lastPlay();
 assert.notEqual(five.requestId,four.requestId);
 assert.equal(f.size(),1);
 f.listeners.biblozooReadOutput({kind:"ended",requestId:five.requestId,
   positionMs:1800,durationMs:1800});
 assert.equal(completed,3);
 assert.equal(f.size(),0);

 // User-provided or changed src MUST be checked before any native call.
 const source=new api.NativeAudio("./verse_audio/john_3_16a.mp3");
 source.src="https://example.org/unauthorized.mp3";
 const before=f.calls.filter(c=>c.op==="play").length;
 await assert.rejects(source.play());
 assert.equal(f.calls.filter(c=>c.op==="play").length,before);
 source.setAttribute("src","./verse_images/read_my_verse/keyboard_2.mp3");
 await source.play();
 assert.equal(f.lastPlay().clipId,"keyboard-2");
 const sourceId=f.lastPlay().requestId;
 source.src="../private/other.mp3";
 assert.equal(f.size(),0,"Changing src cancels old active media owner");
 assert(f.calls.some(c=>c.op==="stop-clip"&&c.requestId===sourceId));
 await assert.rejects(source.play());
 assert.equal(f.calls.filter(c=>c.op==="play").at(-1).clipId,"keyboard-2");
 source.setAttribute("src","./verse_images/read_my_verse/keyboard_3.mp3");
 await source.play();
 assert.equal(f.lastPlay().clipId,"keyboard-3");
 source.pause();

 // Delayed Start/Resume activation cannot trigger older queued feedback
 // after a lock, Back, route loss or genuine AirPods Play.
 const queued=newFixture();
 queued.deferActivation();
 const handshake=queued.api.activateFromGesture();
 assert.equal(queued.api.playCue("order",3,true,false),true);
 queued.api.stopAll();
 queued.finishActivation();
 assert.equal(await handshake,false,"Stopped gesture cannot grant ownership");
 await tick();
 assert.equal(queued.calls.filter(c=>c.op==="cue").length,0,
   "Pending note never starts after Exit even when old activation succeeds");
 await queued.api.activateFromGesture();
 queued.api.playCue("scramble",2,false,false);
 await tick();
 assert.equal(queued.calls.filter(c=>c.op==="cue").length,1);
 queued.listeners.biblozooReadLifecycle({phase:"willResignActive"});
 assert.equal(queued.api.playCue("order",1,false,false),false,
   "Held App Switcher invalidates queued activity sound priority");
 queued.api.stopAll();

 // Late bridge ACK for a cancelled clip MUST stop only that obsolete
 // request and never terminate the newer playback.
 const delayed=newFixture();
 await delayed.api.activateFromGesture();
 const reuse=new delayed.api.NativeAudio("./verse_audio/john_3_16a.mp3");
 delayed.deferPlay();
 const oldPromise=reuse.play();
 await tick();
 const oldId=delayed.lastPlay().requestId;
 assert.equal(delayed.size(),1);
 reuse.pause();
 assert.equal(delayed.size(),0);
 delayed.finishPlay();
 await assert.rejects(oldPromise);
 assert(delayed.calls.some(c=>c.op==="stop-clip"&&c.requestId===oldId),
   "Old response must be stopped under its old unique requestId");
 await reuse.play();
 const current=delayed.lastPlay().requestId;
 assert.notEqual(current,oldId);
 delayed.listeners.biblozooReadOutput({kind:"ended",
   requestId:oldId,positionMs:1800,durationMs:1800});
 assert.equal(delayed.size(),1);
 delayed.listeners.biblozooReadOutput({kind:"ended",
   requestId:current,positionMs:1800,durationMs:1800});
 assert.equal(delayed.size(),0);

 // Native willResign arrives even if WKWebView says it is still visible.
 const active=newFixture();
 await active.api.activateFromGesture();
 const stream=new active.api.NativeAudio("./verse_audio/john_3_16a.mp3");
 let blocked=0,held=0;
 stream.addEventListener("error",()=>blocked++);
 active.api.onAppInactive(()=>held++);
 await stream.play();
 assert.equal(active.size(),1);
 assert.equal(active.doc.hidden,false);
 active.listeners.biblozooReadLifecycle({phase:"willResignActive"});
 assert.equal(active.size(),0);
 assert.equal(held,1);
 assert.equal(blocked,1);
 assert.equal(active.api.playCue("order"),false);
 await assert.rejects(stream.play(),"Real held switcher needs fresh Resume");
 assert.equal(active.size(),0);
 assert.equal(active.calls.filter(c=>c.op==="cue").length,0);

 // The original Web/PWA/Android path is inert without touching window.Audio.
 const browser={document:{hidden:false},
   BibloZooNativeOnlyOutput:{enabled:false},
   Capacitor:{isNativePlatform:()=>false,getPlatform:()=>"web"}};
 vm.runInNewContext(adapter,{window:browser,Map,Set,Promise,Math,Array,Object});
 assert.equal(browser.BibloZooNativeReadOutputController,undefined);
 console.log("N7g PASS: no passive Read owners/40 key taps released, unique per-play IDs block stale end/seek, cached replay survives stopAll+gesture, source allowlist on src changes, no queued cue or late play ACK after interruption/Exit, native early switch and mic/grade/session source contracts preserved. Physical iPhone remains owner-gated.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
