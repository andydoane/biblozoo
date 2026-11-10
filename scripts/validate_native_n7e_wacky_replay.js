/* N7e: full original-ten native Wacky DSP and one-phrase DEV Lab contract.
 * Swift AST syntax/native iPhone acoustic quality remain independent gates.
 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const assert=require("assert/strict");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ids=["squirrel","giant","sleepy","rocket","roller_coaster",
  "ascending","descending","demon","chorus_alien","cave"];
const swift=read("ios/App/App/SceneDelegate.swift");
const facade=read("verse_games/shared/native-flashcards-capture-n7c.js");
const original=read("flashcards/recording.js");
const effects=read("flashcards/audio-effects.js");
const ui=read("flashcards/flashcards.js");
const index=read("index.html");
const lab=read("verse_games/shared/native-wacky-lab-n7e.js");
const dock=read("verse_games/shared/native-dev-tools-dock-n7e.js");
const smoke=read("verse_games/shared/native-sound-smoke-test.js");
const micUi=read("verse_games/shared/native-mic-session-probe-n7b.js");
const work=read(".github/workflows/ios-prep-validation.yml");
const has=(s,x,m)=>assert(s.includes(x),m+": "+x);
for(const s of [facade,original,effects,ui,lab,dock,smoke,micUi])
  new vm.Script(s);
has(effects,"const OFFICIAL_PRESET_IDS =","Original official preset inventory");
const inventory=effects.slice(effects.indexOf("const OFFICIAL_PRESET_IDS ="),
  effects.indexOf("const OFFICIAL_PRESET_SET ="));
const nativeNames=swift.slice(swift.indexOf("private static let wackyPresetIds"),
  swift.indexOf("private func n7eRate"));
for(const id of ids) {
  has(inventory,'"'+id+'"',"Original source defines official preset");
  has(nativeNames,'"'+id+'"',"Exact original id must be native allowlisted");
  has(lab,'["'+id+'",',"DEV Lab must show a direct button");
}
assert.equal((inventory.match(/"/g)||[]).length,20,
  "Original current Wacky catalog has exactly ten IDs");
has(swift,"let effectId = call.getString(\"presetId\") ?? \"\"",
  "Single existing dry playback method takes an optional allowlisted preset");
has(swift,"effectId.isEmpty || Self.wackyPresetIds.contains(effectId)",
  "Unknown preset must fail closed, not silently play dry");
has(swift,"AVAudioUnitTimePitch()","Independent native pitch/tempo");
has(swift,"pitch.rate = n7eRate(preset)","Tempo maps to original source");
has(swift,"pitch.pitch = n7eCents(preset, at: 0, duration: 1)",
  "Pitch maps to original source");
for(const token of [
 "case \"squirrel\": return 1.15", "case \"giant\": return 0.9",
 "case \"sleepy\": return 0.55", "case \"rocket\": return 1.65",
 "case \"demon\": return 0.92", "case \"chorus_alien\": return 0.98",
 "case \"squirrel\": return 900", "case \"giant\": return -700",
 "case \"sleepy\": return -300", "case \"rocket\": return 400",
 "case \"demon\": return -800", "case \"chorus_alien\": return 300",
 "case \"ascending\":", "case \"descending\":", "case \"roller_coaster\":"
])has(swift,token,"Original pitch/speed contour fidelity");
for(const token of ["AVAudioUnitEQ(numberOfBands: 1)",
 "AVAudioUnitDistortion()","AVAudioUnitReverb()","AVAudioUnitDelay()",
 "reverb.loadFactoryPreset(.largeHall)","reverb.loadFactoryPreset(.largeRoom)",
 "chorus.delayTime = 0.014","chorus.wetDryMix = 34",
 "reverb.wetDryMix = 58","reverb.wetDryMix = 52",
 "n7eSchedulePitch", "playbackPitchWorkItems.removeAll()",
 "playbackEffects.removeAll()"])has(swift,token,"Native character effect and teardown");
has(swift,"self.savedSamples.withUnsafeBufferPointer",
  "Same real RAM mono take renders, no fake test tone");
has(swift,"memset(samplesOut[0], 0,","Bounded downstream effect tail");
has(swift,"totalFrames <= 12_500_000","Source PCM plus tail hard capped");
has(swift,"completionCallbackType: .dataPlayedBack",
  "Only actual native played-back callback completes Wacky");
has(swift,"self.playbackGeneration == playToken",
  "Late dynamic pitch and end callbacks cannot resurrect output");
has(swift,"self.ownsFlashcardsForegroundAudio = true",
  "N7d.2 competing music foreground takeover retained");
has(facade,"const OFFICIAL_WACKY_IDS = new Set([","Native whitelist");
has(facade,"mic().playCapture({","Native bridge only, no HTML DSP fallback");
has(facade,"takeId: takeMetadata.takeId, presetId","Exact opaque take selector");
has(facade,"nativeWacky: true","Native child UI visibility capability");
has(facade,"done?.(event.kind === \"ended\")",
  "Wacky Promise completes ONLY with real matching native end event");
has(facade,"function stopFun()","Early cancel interrupts native output");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|new Audio\s*\(|AudioContext\s*\(/.test(facade),
  "Native iOS never uses Web/HTML effects fallback");
has(original,"new MediaRecorder(stream","Web/PWA/Android original capture untouched");
has(effects,"SoundTouchNode","Browser SoundTouch original effects unchanged");
has(ui,"audio.nativeWacky === true","Original one-time native Wacky unlock");
has(ui,"wackyReplayConsumed","Original once-per-verse eligibility unchanged");
has(ui,"audio.nativeWacky !== true","Native never preloads Web DSP");
for(const p of ["native-dev-tools-dock-n7e.js","native-wacky-lab-n7e.js"])
  has(index,'src="verse_games/shared/'+p+'"',"Experiment UI asset included");
assert(index.indexOf('src="native-dev-tools-dock-n7e.js"')<0,
  "DEV dock must be loaded from versioned native-only path");
assert(index.indexOf('src="verse_games/shared/native-dev-tools-dock-n7e.js"') <
  index.indexOf('src="verse_games/shared/native-sound-smoke-test.js"'),
  "DEV panel dock must be installed before both old diagnostics mount");
assert(index.indexOf('src="verse_games/shared/native-flashcards-capture-n7c.js"') <
  index.indexOf('src="verse_games/shared/native-wacky-lab-n7e.js"') &&
  index.indexOf('src="verse_games/shared/native-wacky-lab-n7e.js"') <
  index.indexOf('src="flashcards/flashcards.js"'),
  "Wacky Lab must see native recorder, without changing original script order");
has(smoke,"root.BibloZooDevTools?.register?.(panel)",
  "Top right native audio DEV overlay hidden on launch");
has(micUi,"root.BibloZooDevTools?.register?.(panel)",
  "Bottom left DEV mic overlay hidden on launch");
has(dock,"panel.hidden = true","Both large overlays start hidden");
has(dock,'panel.style.display = "none"',"Old panels do not occupy main screen");
has(dock,'button.textContent = "DEV Tools"',"Compact way to reopen tools");
has(dock,"root.BibloZooWackyLab?.open?.()",
  "Developer can open test lab with explicit click");
has(lab,"root.BibloZooWackyLab=Object.freeze({open,close})",
  "Lab is opened manually from DEV dock");
has(lab,"recorder.start(","Lab records directly from Home, no Flashcards flow");
has(lab,"recorder.playFun(id,","Every lab button invokes selected preset directly");
has(lab,"recorder?.dispose?.()","Lab close discards recorded voice");
has(lab,"Voice stays only in temporary iPhone memory.",
  "DEV Lab truthfully labels ephemeral local take");
for(const doc of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
  "docs/AUDIO-RECOVERY.md","docs/N7E-NATIVE-WACKY-REPLAY-DEV-LAB.md"])
  has(read(doc),"N7e","Required ongoing handoff updated");
has(work,"validate_native_n7e_wacky_replay.js",
  "Focused experimental-only CI regression");
has(work,"swiftc -frontend -parse ios/App/App/SceneDelegate.swift",
  "Actual whole Swift source grammar parsing");

function makeTest() {
  const calls=[],listeners={},docEvents={},winEvents={};
  let nextToken=10,allowed=true;
  const doc={hidden:false,addEventListener:(k,fn)=>docEvents[k]=fn};
  const mic={
    addListener(k,fn){listeners[k]=fn;return Promise.resolve({remove(){}})},
    requestPermission(){calls.push("permission");return Promise.resolve({granted:true})},
    prepareCapture(){calls.push("prepare");return Promise.resolve({prepared:true})},
    beginCapture(){calls.push("begin");return Promise.resolve({started:true,captureKey:44})},
    finishCapture(){calls.push("finish");return Promise.resolve({
      ready:true,restored:true,takeId:"one-temporary-voice",
      frameCount:44100,durationMs:1000})},
    discardCapture(){calls.push("discard");return Promise.resolve({discarded:true})},
    playCapture({takeId,presetId}) {
      const tok=++nextToken;calls.push({takeId,presetId,token:tok});
      return Promise.resolve({started:allowed,playToken:tok});
    },
    stopCapturePlayback(){calls.push("stop-play");
      return Promise.resolve({stopped:true})}
  };
  const output={devPrepareForMicrophone(){calls.push("output-idle");
    return Promise.resolve({prepared:true})}};
  const win={document:doc,BibloZooNativeOnlyOutput:{enabled:true},
    addEventListener:(k,fn)=>winEvents[k]=fn,
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooMicSessionProbe:mic,BibloZooNativeSound:output}}};
  vm.runInNewContext(original,{window:win,document:doc,performance:{now:()=>0}});
  vm.runInNewContext(facade,{window:win,document:doc,performance:{now:()=>0},
    setTimeout,clearTimeout});
  return {win,doc,calls,listeners,docEvents,mic,
    deny(){allowed=false},allow(){allowed=true}};
}
async function tick(){await new Promise(resolve=>setImmediate(resolve))}
async function main(){
  const t=makeTest();
  assert.deepEqual(t.calls,[],"Neither recording nor effects run on app load");
  const c=t.win.BibloZooRecording.create();
  assert.equal(await c.start(()=>{},async()=>true,()=>10000),"recording");
  c.stop();await tick();
  assert(c.snapshot().hasRecording);
  assert(c.snapshot().nativeWacky);
  assert.equal(c.snapshot().playbackComplete,false,
    "Stop recording cannot falsely qualify one-time child Wacky");
  for(const id of ids) {
    let started=0;
    const p=c.playFun(id,()=>started++);
    await tick();
    const call=t.calls.filter(x=>typeof x==="object").at(-1);
    assert.equal(call.presetId,id,"Each DEV button passes its EXPLICIT ID");
    assert.equal(call.takeId,"one-temporary-voice","Same one RAM take");
    assert.equal(started,1,"One playback engine started callback per tap");
    assert.equal(c.snapshot().status,"fun-playing");
    assert.equal(c.snapshot().playbackComplete,false,
      "Testing Wacky cannot fake listened-to dry playback/grade");
    t.listeners.biblozooCapturePlayback({
      kind:"ended",takeId:"stale-recording",playToken:call.token});
    assert.equal(c.snapshot().status,"fun-playing",
      "Unrelated take cannot complete Wacky");
    t.listeners.biblozooCapturePlayback({
      kind:"ended",takeId:call.takeId,playToken:call.token-1});
    assert.equal(c.snapshot().status,"fun-playing",
      "Stale generation cannot complete Wacky");
    t.listeners.biblozooCapturePlayback({
      kind:"ended",takeId:call.takeId,playToken:call.token});
    assert.equal(await p,true,"Only matching real audio completion succeeds");
    assert.equal(c.snapshot().status,"ready");
  }
  const before=t.calls.length;
  assert.equal(await c.playFun("made-up-effect",()=>{}),false,
    "Unknown effect may never silently render raw voice");
  assert.equal(t.calls.length,before);
  let interruptedStart=0;
  const unfinished=c.playFun("cave",()=>interruptedStart++);
  await tick();
  const last=t.calls.filter(x=>typeof x==="object").at(-1);
  c.stopFun();
  assert.equal(await unfinished,false,"Stop must settle Wacky Promise promptly");
  t.listeners.biblozooCapturePlayback({
    kind:"ended",takeId:"one-temporary-voice",playToken:last.token});
  assert.equal(c.snapshot().playbackComplete,false,
    "Late ended after explicit stop cannot unlock Next");
  t.deny();let failedStart=0;
  assert.equal(await c.playFun("giant",()=>failedStart++),false,
    "OS refusal must be a retryable Wacky fail, not a fake PASS");
  assert.equal(failedStart,0);
  t.allow();
  const normal=await c.play();
  assert.equal(normal,true,"Normal raw voice playback preserved");
  const rawToken=t.calls.filter(x=>typeof x==="object").at(-1).token;
  t.listeners.biblozooCapturePlayback({
    kind:"ended",takeId:"one-temporary-voice",playToken:rawToken});
  assert.equal(c.snapshot().playbackComplete,true,
    "Only a true normal raw take .dataPlayedBack unlocks child Next");
  c.dispose();await tick();
  assert(t.calls.includes("discard"),"DEV close/exit discards native RAM");
  console.log("N7e PASS: all 10 original IDs through real native JS facade, one RAM take repeatable, stale/failed/cancelled playback, dry-only listened-to completion, Web untouched, DEV drawer/lab gated. Real iPhone hearing still required.");
}
main().catch(err=>{console.error(err);process.exitCode=1});
