/* N7c — source + executable real recorder VM proof for native-only
 * Flashcards capture. Linux is NOT Mac Xcode SDK typecheck or real iPhone mic.
 * Original Web MediaRecorder and all N6 game code remain unchanged.
 */
"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert/strict"),
  vm=require("vm");
const base=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const original=read("flashcards/recording.js");
const native=read("verse_games/shared/native-flashcards-capture-n7c.js");
const ui=read("flashcards/flashcards.js");
const scene=read("ios/App/App/SceneDelegate.swift");
const sound=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const index=read("index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const guide=read("docs/N7C-FLASHCARDS-NATIVE-CAPTURE.md");
const handoff=read("docs/PROJECT-HANDOFF.md");
new vm.Script(original);new vm.Script(native);new vm.Script(ui);
const contains=(src,str,description)=>assert(src.includes(str),description+": "+str);
contains(index,'src="flashcards/recording.js"',"Original Web recorder remains loaded");
contains(index,'src="verse_games/shared/native-flashcards-capture-n7c.js"',
  "Native routing file must load only after original recorder");
assert(index.indexOf('src="flashcards/recording.js"') <
  index.indexOf('src="verse_games/shared/native-flashcards-capture-n7c.js"') &&
  index.indexOf('src="verse_games/shared/native-flashcards-capture-n7c.js"') <
  index.indexOf('src="flashcards/flashcards.js"'),
  "Original WebRecorder must load first, native router next, Flashcards UI last");
contains(native,"root.BibloZooNativeOnlyOutput?.enabled !== true",
  "Isolated native-only routing, no Web/Android changes");
contains(native,"await output.devPrepareForMicrophone()",
  "Native output must acknowledge idle worker before input category handoff");
contains(native,"await api.prepareCapture()",
  "Permission granted before preparing mic session and countdown");
contains(native,"await beforeStart()",
  "Must honor original Flashcards painted 3-2-1 before samples");
contains(native,"await api.beginCapture({limitMs})",
  "Real input must begin only after original countdown");
contains(native,"Promise.resolve(mic()?.finishCapture?.())",
  "Stop waits for actual Swift take flush");
contains(native,"mic()?.discardCapture?.()",
  "Re-record/exit must release original voice data in Swift memory");
contains(native,'root.addEventListener("pagehide", () => {',
  "Task switching still interrupts active capture while pausing finished replay");
contains(native,'api.addListener("biblozooCaptureLifecycle"',
  "UIKit native interruptions signal JS even with no pagehide");
contains(native,"playbackComplete,",
  "Native completion starts false and only changes on actual played-back event");
contains(native,"playbackAvailable: !!takeMetadata?.takeId",
  "Native Play must be offered ONLY for the actual opaque RAM take");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|AudioContext\s*\(|new Audio\s*\(/.test(native),
  "No browser fallback for native mic/playback");
contains(ui,"nativeCaptureOnly","Comparison screen must clearly label N7c");
contains(ui,"Continue Without Listening",
  "Child has a legitimate route through comparison without fake audio");
contains(ui,"Playback is coming in N7d",
  "Do not silently promise finished replay or Wacky DSP");
contains(original,"new MediaRecorder(stream","Original WebAudio recording unchanged");
contains(original,"new Audio(url)","Existing browser raw replay preserved");
contains(scene,'CAPPluginMethod(name: "prepareCapture"',
  "Native bridge exposed to Capacitor in existing compiled source");
for(const fn of ["prepareCapture","beginCapture","finishCapture",
                 "discardCapture","getCaptureState"])
  contains(scene,"@objc func "+fn+"(", "Swift handler "+fn);
contains(scene,"private let captureWorker = DispatchQueue(",
  "Real PCM capture stores mono samples on a serial worker, not audio callback");
contains(scene,"private var savedSamples: [Float] = []",
  "Original take exists only in native app RAM until discard");
contains(scene,"self.captureSamples.append(",
  "Input tap must really collect speech samples, not fake ACK");
contains(scene,"let frameCap = min(12_000_000, maxFrames)",
  "120s input has a hard 48MB max RAM bound");
contains(scene,"input.installTap(onBus: 0, bufferSize: 1024",
  "Capture obtains live input PCM, no file recorder");
contains(scene,"captureSavedCategory","Native capture and N7b DEV probe own separate session snapshots");
contains(scene,"try session.setCategory(category, mode: mode, options: options)",
  "Return to original session policy after capture stops");
contains(scene,'self.notifyListeners("biblozooCaptureLifecycle"',
  "Native UIKit interruption and time-limit report read-only outcome to JS");
contains(scene,"call.resolve([","Opaque metadata response; never bytes");
const segment=scene.slice(scene.indexOf("// N7c captures *only*"),
  scene.indexOf("// Purely read-only status;",scene.indexOf("// N7c captures *only*")));
assert(!/AVAudioRecorder\s*\(|FileManager|URLSession|\.write\s*\(|Data\s*\(/.test(segment),
  "No recorded audio in any persistent file/network/JavaScript base64");
contains(sound,'"output-worker-idle"',"Existing native output barrier reused");
contains(workflow,"validate_native_n7c_flashcards_capture.js",
  "N7c must be in final-head CI");
contains(workflow,"swiftc -frontend -parse ios/App/App/SceneDelegate.swift",
  "Swift grammar parser includes actual modified file");
contains(guide,"physical iPhone","Real mic acceptance cannot be inferred from Node");
contains(handoff,"N7c","Online living handoff must show current stage");

function simulated({ios=true,denied=false,missing=false}={}){
  const events=[],on={},actions=[],docEvents={};
  const document={
    hidden:false,
    addEventListener:(type,fn)=>{docEvents[type]=fn},
  };
  const bridge={
    addListener(event,fn){
      if(event==="biblozooCaptureLifecycle")on.native=fn;
      if(event==="biblozooCaptureLevel")on.level=fn;
      if(event==="biblozooCapturePlayback")on.playback=fn;
      return Promise.resolve({remove(){}})},
    requestPermission(){events.push("permission");
      return Promise.resolve({granted:!denied,
        reason:denied?"permission-denied":"permission-granted"});},
    prepareCapture(){events.push("prepare");return Promise.resolve({prepared:true})},
    beginCapture({limitMs}){events.push("begin:"+limitMs);
      return Promise.resolve({started:true,captureKey:41})},
    finishCapture(){events.push("finish");return Promise.resolve({
      ready:true,restored:true,frameCount:48000,durationMs:1000,
      takeId:"n7c-test-take"});},
    discardCapture(){events.push("discard");
      return Promise.resolve({discarded:true})},
    playCapture({takeId}){events.push("play:"+takeId);
      return Promise.resolve({started:true,playToken:1})},
    stopCapturePlayback(){events.push("stop-play");
      return Promise.resolve({stopped:true})},
  };
  const output={devPrepareForMicrophone(){events.push("output-stop");
    return Promise.resolve({prepared:true,reason:"output-worker-idle"})}};
  const win={document,BibloZooNativeOnlyOutput:ios?{enabled:true}:undefined,
    Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooMicSessionProbe:missing?{}:bridge,
        BibloZooNativeSound:output}},
    addEventListener(type,fn){on[type]=fn},
    BibloZooRecording:undefined};
  vm.runInNewContext(original,{window:win,document,performance:{now:()=>1000}},
    {filename:"ios-prep unchanged recorder"});
  const prior=win.BibloZooRecording.create;
  vm.runInNewContext(native,{window:win,document,performance:{now:()=>1000},
    clearTimeout, setTimeout},{filename:"actual N7c recorder router"});
  return {win,doc:document,events,on,docEvents,actions,prior,
    create:()=>win.BibloZooRecording.create({
      onChange:()=>actions.push("render"),
      onInterrupted:()=>actions.push("interrupted")
    })};
}
async function tick(){await new Promise(resolve=>setImmediate(resolve))}
async function main(){
  const browser=simulated({ios:false});
  assert.strictEqual(browser.win.BibloZooRecording.create,browser.prior,
    "Original browser Recorder factory untouched");
  assert.deepEqual(browser.events,[]);
  const e=simulated();
  assert.notStrictEqual(e.win.BibloZooRecording.create,e.prior,
    "Experimental native needs its own recording engine");
  const rec=e.create();
  assert.deepEqual(e.events,[],"No mic permission, session or capture on page load or factory create");
  const result=await rec.start(()=>e.events.push("challenge"),
    async()=>{e.events.push("countdown-3-2-1");return true},
    ()=>7000);
  assert.equal(result,"recording");
  assert.deepEqual(e.events,["permission","output-stop","prepare",
    "countdown-3-2-1","begin:7000","challenge"],
    "Actual first Record gesture must request permission, ACK worker stop, prepare BEFORE countdown, then begin capture only AFTER it");
  assert.equal(rec.snapshot().status,"recording");
  assert.equal(rec.snapshot().hasRecording,false,
    "Recording in progress is not falsely ready before actual Stop");
  rec.stop();
  assert.equal(rec.snapshot().status,"stopping");
  await tick();
  assert.equal(rec.snapshot().status,"ready");
  assert.equal(rec.snapshot().hasRecording,true,
    "At least 256 actual PCM frames flushed, native only");
  assert.equal(rec.snapshot().capturedFrames,48000);
  assert.equal(rec.snapshot().playbackComplete,false,
    "N7c still cannot pretend Stop means audible completion");
  assert.equal(rec.snapshot().playbackAvailable,true,
    "Only N7d explicit native Play exposes a ready opaque take");
  assert.equal(rec.snapshot().playbackFailed,false);
  assert.equal(await rec.play(),true,"Real child Play now invokes native output");
  assert.equal(rec.snapshot().playbackComplete,false,
    "Even a successful play bridge response is NOT completed playback");
  e.on.playback({kind:"ended",takeId:"n7c-test-take",playToken:1});
  assert.equal(rec.snapshot().playbackComplete,true,
    "Only real AVAudioPlayerNode .dataPlayedBack may set completion");
  let wackyStarted=0;
  const wacky=rec.playFun("squirrel",()=>{wackyStarted++});
  await tick();
  assert.equal(wackyStarted,1,"N7e voice effect really requests native playback");
  e.on.playback({kind:"ended",takeId:"n7c-test-take",playToken:1});
  assert.equal(await wacky,true,
    "Native Wacky resolves on real ended-event, not bridge started");
  assert.equal(rec.snapshot().playbackComplete,true);
  rec.dispose();
  await tick();
  assert(e.events.includes("discard"),"Dispose MUST drop native RAM take");

  const deny=simulated({denied:true});
  const d=deny.create();
  assert.equal(await d.start(()=>{},()=>true),"permission-denied");
  assert.deepEqual(deny.events,["permission"],
    "Denied mic never requests audio session or begins capture");

  const unavailable=simulated({missing:true});
  const u=unavailable.create();
  assert.equal(await u.start(()=>{},()=>true),"failed");
  assert.deepEqual(unavailable.events,[],
    "Missing native bridge must fail closed; no Web MediaRecorder fallback");

  const interrupted=simulated();
  const i=interrupted.create();
  let resume;
  const count=new Promise(r=>{resume=r});
  const start=i.start(()=>interrupted.events.push("WRONG-begin-after-interruption"),
    ()=>count);
  await tick();
  assert.deepEqual(interrupted.events,["permission","output-stop","prepare"]);
  i.interruptCapture();
  resume(true);
  assert.equal(await start,"cancelled");
  await tick();
  assert(!interrupted.events.some(s=>s.startsWith("begin:")),
    "An App Switcher interruption during 3-2-1 can NEVER start mic");
  assert(interrupted.events.includes("discard"));
  assert.equal(interrupted.actions.filter(a=>a==="interrupted").length,1,
    "One true interruption, no repeated Zoo/reward consequences");

  const bg=simulated();const b=bg.create();
  await b.start(()=>{},async()=>true);
  bg.on.native({kind:"interrupted",reason:"route-changed"});
  await tick();
  assert.equal(b.snapshot().status,"idle");
  assert.equal(bg.actions.filter(a=>a==="interrupted").length,1);
  assert(bg.events.includes("discard"));
  assert(!bg.events.includes("finish"),
    "Interrupting a live capture cannot store a falsely completed take");

  const timed=simulated();const t=timed.create();
  await t.start(()=>{},async()=>true);
  timed.on.native({kind:"completed",ready:true,restored:true,
    takeId:"n7c-time-limited-take",frameCount:38400,durationMs:800});
  assert.equal(t.snapshot().hasRecording,true,
    "Native 120s watchdog completion waits for actual RAM buffer flush");
  assert.equal(t.snapshot().playbackComplete,false);
  const hidden=simulated();const h=hidden.create();
  await h.start(()=>{},async()=>true);
  hidden.doc.hidden=true;hidden.docEvents.visibilitychange();
  await tick();
  assert.equal(h.snapshot().status,"idle");
  assert(hidden.events.includes("discard"));
  assert(!hidden.events.includes("finish"));
  console.log("N7c regression PASS with N7d: original Web unchanged, Record→3-2-1→Stop RAM take, no premature playback completion, native Play and actual ended event, Wacky blocked, denial/cancellation/interrupt/timeout/discard intact.");
}
main().catch(e=>{console.error(e);process.exitCode=1});
