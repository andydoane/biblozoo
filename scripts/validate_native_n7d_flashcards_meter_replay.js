/* N7d: actual native Flashcards meter, dry playback and real played-back
 * completion. This executes the native-only recorder facade with delayed
 * iPhone bridge promises/events and checks Swift source architecture.
 * This is NOT Apple SDK typechecking or physical-speaker proof.
 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),
  assert=require("assert/strict");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const orig=read("flashcards/recording.js");
const js=read("verse_games/shared/native-flashcards-capture-n7c.js");
const ui=read("flashcards/flashcards.js");
const swift=read("ios/App/App/SceneDelegate.swift");
const work=read(".github/workflows/ios-prep-validation.yml");
const guide=read("docs/N7D-FLASHCARDS-NATIVE-METER-REPLAY.md");
const handoff=read("docs/PROJECT-HANDOFF.md");
const testing=read("docs/TESTING.md"),recovery=read("docs/AUDIO-RECOVERY.md");
const has=(s,x,m)=>assert(s.includes(x),m+": "+x);
for(const source of [orig,js,ui])new vm.Script(source);
has(orig,"new MediaRecorder(stream","Browser capture unchanged");
has(orig,"new Audio(url)","Browser playback unchanged");
has(js,"root.BibloZooNativeOnlyOutput?.enabled !== true",
  "Native facade enabled only on isolated iOS");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|AudioContext\s*\(|new Audio\s*\(/.test(js),
  "Native dry replay never uses HTML/WebAudio fallback");
has(js,'api.addListener("biblozooCaptureLevel"',
  "Native mono RMS events feed existing Flashcards 16 bars");
has(js,'api.addListener("biblozooCapturePlayback"',
  "Native player really signals completion/interruption");
has(js,'event.kind === "ended"',"Only real native playback ending can mark complete");
has(js,"reply?.started !== true","Bridge failure never implies audible replay");
has(js,"api.playCapture({takeId: takeMetadata.takeId})",
  "Only exact opaque native capture may play");
has(js,"mic()?.stopCapturePlayback?.()",
  "Play/Pause/Exit/hidden must stop native PCM");
has(js,"playbackComplete,","No unconditional fake completion");
has(js,"playbackAvailable: !!takeMetadata?.takeId",
  "Play button only for ready native RAM take");
has(js,"nativeReplay: true","Comparison knows native dry playback is available");
has(ui,'audio.nativeReplay !== true',"Original Wacky effects stay blocked until N7e");
has(ui,"recording.readLevel()","Original Flashcards 16-bar meter reads real level");
has(ui,"Continue Without Listening","Actual failed playback retains fair exit");
has(ui,"Play My Recording","Original Play UI returns in native N7d");
for(const fn of ["playCapture","stopCapturePlayback"]) {
  has(swift,'CAPPluginMethod(name: "'+fn+'"',
    "N7d plugin method registered");
  has(swift,"@objc func "+fn+"(", "N7d method implemented");
}
has(swift,"AVAudioPlayerNode()","Explicit native output uses audio engine PCM");
has(swift,"completionCallbackType: .dataPlayedBack",
  "Completion is actual hardware-consumed callback, not acceptance");
has(swift,'self.notifyListeners("biblozooCaptureLevel"',
  "Native meter exposes only bounded 0...1 level");
has(swift,"self.captureLevel = level",
  "Native level comes from captured PCM, not fake timer");
has(swift,"uptime - self.workerLastLevelAt >= 0.08",
  "No unbounded per-sample JS events");
has(swift,"self.savedSamples.withUnsafeBufferPointer",
  "Playback copies the ACTUAL previously captured RAM data");
has(swift,"self.savedTakeId == requestedId",
  "No stale/other capture can be played with fabricated takeId");
has(swift,"!session.isOtherAudioPlaying",
  "Don't seize YouTube still-playing priority at Play");
has(swift,"session.category == .soloAmbient",
  "Don't override temporary recording category");
has(swift,"try AVAudioSession.sharedInstance().setActive(true)",
  "Play must require real explicit tap rather than session activation on foreground");
has(swift,"self.playbackGeneration += 1",
  "Stop/Exit invalidate pending PCM preparation before late start");
has(swift,'notifyListeners("biblozooCapturePlayback"',
  "Output completion source is native playback callback");
has(swift,"captureWorker.async","Audio copy never blocks main/audio callback");
has(swift,"private var savedSamples: [Float] = []",
  "Voice data remains bounded RAM, never saved to file");
const nativeCode=swift.slice(swift.indexOf("    // N7c captures *only*"),
  swift.indexOf("    // Purely read-only status;",swift.indexOf("    // N7c captures *only*")));
assert(!/AVAudioRecorder\s*\(|FileManager|URLSession|\.write\s*\(|Data\s*\(/.test(nativeCode),
  "No mic data written, uploaded, serialized or passed over bridge");
has(work,"validate_native_n7d_flashcards_meter_replay.js",
  "N7d must be enforced in experiment CI");
has(work,"swiftc -frontend -parse ios/App/App/SceneDelegate.swift",
  "Full modified Swift file parsed");
has(handoff,"N7d","Living handoff updated");
has(testing,"N7d","Testing guide updated");
has(recovery,"N7d","Audio recovery/privacy updated");
has(guide,"physical iPhone","Audible N7d PASS depends on actual device");

function sim({ios=true,playAllowed=true}={}){
  const events=[],listeners={},docListeners={},winListeners={},changes=[];
  const doc={hidden:false,addEventListener:(k,cb)=>docListeners[k]=cb};
  let resolvePlay;
  let delayed=false;
  const api={
    addListener(k,fn){listeners[k]=fn;return Promise.resolve({remove(){}})},
    requestPermission(){events.push("permission");return Promise.resolve({granted:true})},
    prepareCapture(){events.push("prepare");return Promise.resolve({prepared:true})},
    beginCapture({limitMs}){events.push("begin:"+limitMs);
      return Promise.resolve({started:true,captureKey:77})},
    finishCapture(){events.push("finish");return Promise.resolve({
      ready:true,restored:true,frameCount:44100,durationMs:1000,
      takeId:"take-n7d-one"})},
    discardCapture(){events.push("discard");return Promise.resolve({discarded:true})},
    playCapture({takeId}){events.push("play:"+takeId);
      if(delayed)return new Promise(r=>resolvePlay=r);
      return Promise.resolve({started:playAllowed,playToken:12})},
    stopCapturePlayback(){events.push("stop-play");
      return Promise.resolve({stopped:true})}
  };
  const out={devPrepareForMicrophone(){events.push("output-idle");
    return Promise.resolve({prepared:true})}};
  const win={
    document:doc,BibloZooNativeOnlyOutput:ios?{enabled:true}:null,
    Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooMicSessionProbe:api,BibloZooNativeSound:out}},
    addEventListener:(k,cb)=>{winListeners[k]=cb}
  };
  vm.runInNewContext(orig,{window:win,document:doc,performance:{now:()=>0}},
    {filename:"actual ios-prep recorder"});
  const originalFactory=win.BibloZooRecording.create;
  vm.runInNewContext(js,{window:win,document:doc,performance:{now:()=>0},
    setTimeout,clearTimeout},{filename:"actual N7d native recorder"});
  return {
    win,doc,docListeners,winListeners,listeners,events,changes,api,
    originalFactory,
    create:()=>win.BibloZooRecording.create({
      onChange:()=>changes.push("update"),onInterrupted:()=>changes.push("interrupt")}),
    delayPlay(){delayed=true},
    releasePlay(v={started:true,playToken:12}){resolvePlay(v)}
  };
}
async function tick(){await new Promise(r=>setImmediate(r))}
async function ready(t){
  const c=t.create();
  assert.equal(await c.start(()=>t.events.push("challenge"),async()=>{
    t.events.push("3-2-1");return true},()=>6000),"recording");
  assert.deepEqual(t.events,["permission","output-idle","prepare",
    "3-2-1","begin:6000","challenge"]);
  assert.equal(c.readLevel(),null,"Mic level is null until real input buffers");
  t.listeners.biblozooCaptureLevel({captureKey:999,level:1});
  assert.equal(c.readLevel(),null,"Stale/cross-recording meter must be ignored");
  t.listeners.biblozooCaptureLevel({captureKey:77,level:0.52});
  assert.equal(c.readLevel(),0.52,"True input meter feeds Flashcards level");
  t.listeners.biblozooCaptureLevel({captureKey:77,level:Infinity});
  assert.equal(c.readLevel(),0.52,"Nonfinite input cannot break meter");
  c.stop();await tick();
  assert.equal(c.snapshot().status,"ready");
  assert.equal(c.snapshot().hasRecording,true);
  assert.equal(c.snapshot().playbackComplete,false,
    "Capture Stop must not consume Wacky or imply heard audio");
  assert.equal(c.snapshot().playbackAvailable,true);
  assert.equal(c.readLevel(),null,"Mic meter no longer runs after Stop");
  return c;
}
async function main(){
  const browser=sim({ios:false});
  assert.equal(browser.win.BibloZooRecording.create,browser.originalFactory);
  assert.deepEqual(browser.events,[],"Browser no native mic activity");
  const t=sim();const c=await ready(t);
  assert.equal(await c.play(),true);
  assert.equal(c.snapshot().status,"playing");
  assert.equal(c.snapshot().playbackComplete,false,
    "Native accepted playback is NOT already heard completion");
  t.listeners.biblozooCapturePlayback({kind:"ended",
    takeId:"old-take",playToken:12});
  assert.equal(c.snapshot().playbackComplete,false,"Old take event cannot unlock UI");
  t.listeners.biblozooCapturePlayback({kind:"ended",
    takeId:"take-n7d-one",playToken:12});
  assert.equal(c.snapshot().status,"ready");
  assert.equal(c.snapshot().playbackComplete,true,
    "Only real .dataPlayedBack event unlocks original Next/grade");
  assert.equal(await c.playFun("squirrel",()=>{}),false,
    "Wacky DSP must stay disabled N7e");

  const pause=sim();const p=await ready(pause);
  await p.play();p.pause();
  assert.equal(p.snapshot().status,"ready");
  assert(pause.events.includes("stop-play"),"Actual stop requests native PCM stop");
  pause.listeners.biblozooCapturePlayback({kind:"ended",
    takeId:"take-n7d-one",playToken:12});
  assert.equal(p.snapshot().playbackComplete,false,
    "Late completion after Pause must not mark child as having listened");

  const fail=sim({playAllowed:false});const f=await ready(fail);
  assert.equal(await f.play(),false);
  assert.equal(f.snapshot().status,"ready");
  assert.equal(f.snapshot().playbackFailed,true);
  assert.equal(f.snapshot().playbackComplete,false,
    "Failed playback offers explicit retry/Continue Without Listening");
  const hidden=sim();const h=await ready(hidden);
  await h.play();hidden.doc.hidden=true;hidden.docListeners.visibilitychange();
  await tick();
  assert.equal(h.snapshot().hasRecording,true,
    "Background after completed capture preserves one RAM take");
  assert.equal(h.snapshot().status,"ready");
  assert(hidden.events.includes("stop-play"));
  assert.equal(hidden.events.filter(x=>x==="begin:6000").length,1,
    "Returning foreground must not restart microphone");
  const delayed=sim();const d=await ready(delayed);
  delayed.delayPlay();const pending=d.play();await tick();
  d.pause();
  delayed.releasePlay();
  await pending;await tick();
  assert.equal(d.snapshot().status,"ready");
  assert.equal(d.snapshot().playbackComplete,false);
  assert(delayed.events.includes("stop-play"),
    "Pause invalidates in-flight Play before later native worker can sound");
  const discard=sim();const z=await ready(discard);
  await z.play();z.dispose();await tick();
  assert(discard.events.includes("stop-play"));
  assert(discard.events.includes("discard"));
  assert.equal(z.snapshot().hasRecording,false);
  console.log("N7d PASS: original web unchanged; native RAM capture RMS meter, heard-completion-only replay contract, stop/hidden/late Promise and stale-take gating, explicit failed-audio continue, Wacky still disabled.");
}
main().catch(e=>{console.error(e);process.exitCode=1});
