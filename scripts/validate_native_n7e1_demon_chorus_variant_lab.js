/* N7e.1: 5+5 owner audition variants, one RAM take, no child changes.
 * Linux Swift parser checks syntax, NOT actual AVFAudio typecheck or sound.
 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const assert=require("assert/strict");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const facade=read("verse_games/shared/native-flashcards-capture-n7c.js");
const lab=read("verse_games/shared/native-wacky-lab-n7e.js");
const dock=read("verse_games/shared/native-dev-tools-dock-n7e.js");
const old=read("flashcards/recording.js");
const ui=read("flashcards/flashcards.js");
const index=read("index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const ids=[
 "demon_clean","demon_shadow","demon_abyss","demon_whisper","demon_thunder",
 "chorus_air","chorus_swarm","chorus_cosmic","chorus_choir","chorus_wobble"
];
const h=(s,part,reason)=>assert(s.includes(part),reason+" :: "+part);
for(const source of [facade,lab,dock,old,ui])
 new vm.Script(source);
const decl=swift.slice(swift.indexOf("private static let n7e1Variants"),
 swift.indexOf("private func n7e1WireChorusLayers"));
assert(decl.includes("private static let n7e1Variants: [String: N7e1Variant]"),
 "Native catalog must be defined in exact iOS-only mic plugin");
for(const id of ids){
 h(decl,'"'+id+'": N7e1Variant(',"Native DEV-only variant catalog entry");
 h(lab,'["'+id+'",',"Direct owner choice in compact DEV Lab");
 h(facade,'"'+id+'"',"Explicit JavaScript DEV allowlist");
}
assert.equal((decl.match(/": N7e1Variant\(/g)||[]).length,10,
 "Exactly five Demon plus five Chorus candidates; no accidental additions");
h(swift,'let devVariant = call.getBool("devVariant") == true',
 "Explicit DEV variant flag on native playback call");
h(swift,'effectId.isEmpty || Self.wackyPresetIds.contains(effectId) ||',
 "Unmodified dry and ten child preset IDs still accepted");
h(swift,'(devVariant && Self.n7e1Variants[effectId] != nil)',
 "DEV alternative cannot be reached without intentional test flag");
h(swift,'self.isDevBundle',"Only exact Audio Test bundle uses native mic plugin");
h(swift,'if let variant = Self.n7e1Variants[preset]',
 "Each effect is decoded into native DSP, not passed back to WebAudio");
h(swift,"AVAudioUnitTimePitch()",
 "Pitch/time controls remain native AVFoundation");
h(swift,"let eq = AVAudioUnitEQ(numberOfBands: 1)",
 "Demon alternatives use gentler lowpass EQ");
h(swift,"if variant.distortionWet > 0",
 "Distortion is optional, not forced on every Demon alternative");
h(swift,"drive.wetDryMix = variant.distortionWet",
 "Only owner-approved soft drive levels are applied");
h(swift,"if variant.roomWet > 0",
 "Candidate reverb must be actual AVAudioUnitReverb");
h(swift,"let voice = AVAudioPlayerNode()",
 "Extra Chorus requires actual independent native voice players");
h(swift,"tune.pitch = variant.cents + variant.layerDetunes[index]",
 "Chorus voices MUST be detuned independently");
h(swift,"delay.delayTime = variant.layerDelays[index]",
 "Chorus voices have distinct short delays, not just an echo");
h(swift,"voice.volume = variant.layerVolumes[index]",
 "Three voices must use bounded gains to reduce clipping risk");
h(swift,"player.volume = variant.dryVolume",
 "Main voice gain must be adjusted for layered Chorus");
h(swift,"voice.scheduleBuffer(buffer, at: nil,",
 "Additional layers must replay same opaque native PCM");
h(swift,"for voice in chorusVoices { voice.play() }",
 "All layers actually launch when user taps");
h(swift,"for voice in playbackChorusPlayers { voice.stop() }",
 "Explicit Stop/interrupt cancels every extra voice");
h(swift,"playbackChorusPlayers.removeAll()",
 "All voice owners released on playback end");
h(swift,'Self.n7e1Variants[effectId]?.tailSeconds',
 "Short/long effects have explicit bounded native PCM tail");
h(swift,"totalFrames <= 12_500_000",
 "RAM source+tail remains hard capped");
h(swift,'completionCallbackType: .dataPlayedBack',
 "Only actual native replay completion confirms a played effect");
h(swift,'engine.mainMixerNode.installTap(',
 "Wacky output-only nonzero render gating kept");
h(swift,'self.playbackGeneration == playToken',
 "Late playback/automation tokens cannot return after stop");
h(facade,"const DEV_VARIANT_IDS = new Set([",
 "DEV-only ids never accidentally added to child official presets");
h(facade,"function playDevVariant(presetId, onStarted)",
 "Separate native-only DEV playback method");
h(facade,"return playWackyPreset(presetId, onStarted, true)",
 "DEV intent must be explicit");
h(facade,"return playWackyPreset(presetId, onStarted, false)",
 "Original Flashcards Wacky still uses official allowlist");
h(facade,"...(devVariant ? {devVariant: true} : {})",
 "No DEV flag sent during original child Wacky");
h(facade,'const heard = event.kind === "ended" && funStarted;',
 "Native output render + played-back end required for true result");
assert(!/getUserMedia\s*\(|MediaRecorder\s*\(|new Audio\s*\(|AudioContext\s*\(/.test(facade),
 "No WebAudio or HTML fallback on experimental native");
h(old,"new MediaRecorder(stream",
 "Original browser MediaRecorder source preserved");
h(ui,"pickWackyPreset()",
 "Child once-only original-random routine unchanged");
h(dock,'action("Wacky Lab · 10 Effects",',
 "Original Wacky Lab kept in drawer");
h(dock,'action("Demon / Chorus Lab · 5 + 5",',
 "New separate DEV Tools entry must be present");
h(dock,"root.BibloZooWackyLab?.openVariants?.()",
 "Separate button opens variants without normal flashcards");
h(lab,'openVariants:()=>open("variants")',
 "Lab has explicit mode and is not auto-opened on launch");
h(lab,"recorder.start(",
 "One gesture-started native microphone sample directly from Home");
h(lab,"await recorder.playDevVariant(id,started)",
 "Variant button uses separate DEV-only native action");
h(lab,"await recorder.playFun(id,started)",
 "Current Demon/Chorus and original ten reference unchanged");
h(lab,'["demon", "Current Demon"]',
 "Owner can A/B with original Demon on same take");
h(lab,'["chorus_alien", "Current Chorus Alien"]',
 "Owner can A/B with original Chorus Alien on same take");
h(lab,"recorder?.dispose?.()",
 "DEV Lab must discard ephemeral RAM take on exit");
h(index,'src="verse_games/shared/native-wacky-lab-n7e.js"',
 "Variant mode reuses existing native-only scripted lab");
h(workflow,"validate_native_n7e1_demon_chorus_variant_lab.js",
 "Focused regression required in experiment CI");
for(const p of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
 "docs/AUDIO-RECOVERY.md",
 "docs/N7E1-DEMON-CHORUS-AUDITION-DEV-LAB.md"]) {
 h(read(p),"N7e.1","Every PR must update its living handoff");
}

function makeNative(){
 const calls=[],listeners={},docListeners={};
 let nextToken=20,deny=false;
 const doc={hidden:false,addEventListener:(k,fn)=>docListeners[k]=fn};
 const mic={
   addListener(k,fn){listeners[k]=fn;return Promise.resolve({remove(){}})},
   requestPermission(){calls.push("permission");return Promise.resolve({granted:true})},
   prepareCapture(){calls.push("prepare");return Promise.resolve({prepared:true})},
   beginCapture(){calls.push("begin");return Promise.resolve({started:true,captureKey:9})},
   finishCapture(){calls.push("finish");return Promise.resolve({
      ready:true,restored:true,takeId:"single-ram-take",
      frameCount:44100,durationMs:1000})},
   discardCapture(){calls.push("discard");return Promise.resolve({discarded:true})},
   playCapture(args){
      const item={...args,token:++nextToken};calls.push(item);
      return Promise.resolve(deny?{started:false}:{started:true,playToken:item.token});
   },
   stopCapturePlayback(){calls.push("stop-play");return Promise.resolve({stopped:true})}
 };
 const win={document:doc,BibloZooNativeOnlyOutput:{enabled:true},
   addEventListener:()=>{},
   Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
    Plugins:{BibloZooMicSessionProbe:mic,
      BibloZooNativeSound:{devPrepareForMicrophone(){
        calls.push("output-idle");return Promise.resolve({prepared:true})}}}}};
 vm.runInNewContext(old,{window:win,document:doc,performance:{now:()=>0}});
 vm.runInNewContext(facade,{window:win,document:doc,performance:{now:()=>0},
   setTimeout,clearTimeout});
 return {calls,listeners,doc,win,setDeny(value){deny=value}};
}
const tick=()=>new Promise(r=>setImmediate(r));
async function main(){
 const t=makeNative(),rec=t.win.BibloZooRecording.create();
 assert.deepEqual(t.calls,[],"Opening the JS lab never requests permission/audio");
 assert.equal(await rec.start(()=>{},async()=>true,()=>7000),"recording");
 rec.stop();await tick();
 assert(rec.snapshot().hasRecording,"Real RAM take required before variants");
 for(const id of ids){
   assert.equal(await rec.playFun(id,()=>{}),false,
     "DEV candidate not available via child's ordinary Wacky method");
   let started=0;
   const playing=rec.playDevVariant(id,()=>started++);
   await tick();
   const audio=t.calls.filter(x=>x&&typeof x==="object").at(-1);
   assert.equal(audio.takeId,"single-ram-take");
   assert.equal(audio.presetId,id);
   assert.equal(audio.devVariant,true,"Explicit DEV-only bit on every variant");
   assert.equal(started,0,"Bridge ACK cannot pretend to be audible output");
   t.listeners.biblozooCapturePlayback({
     kind:"started",takeId:audio.takeId,playToken:audio.token-1});
   assert.equal(started,0,"Stale audio cannot consume one-use Wacky");
   t.listeners.biblozooCapturePlayback({
     kind:"started",takeId:audio.takeId,playToken:audio.token});
   assert.equal(started,1,"Native mixer render proof delivered once");
   t.listeners.biblozooCapturePlayback({
     kind:"ended",takeId:audio.takeId,playToken:audio.token});
   assert.equal(await playing,true,"Only actual current native end completes");
   assert.equal(rec.snapshot().status,"ready");
   assert.equal(rec.snapshot().playbackComplete,false,
     "Developer comparison cannot unlock child's Next/grade");
 }
 assert.equal(await rec.playDevVariant("demon",()=>{}),false,
   "Child's original Demon cannot be played via DEV variation route");
 assert.equal(await rec.playDevVariant("chorus_alien",()=>{}),false);
 let callback=0;
 const originalPlay=rec.playFun("demon",()=>callback++);
 await tick();
 const last=t.calls.filter(x=>x&&typeof x==="object").at(-1);
 assert.equal(last.presetId,"demon");
 assert.equal(last.devVariant,undefined,"Baseline reference is not DEV variant");
 t.listeners.biblozooCapturePlayback({
    kind:"started",takeId:last.takeId,playToken:last.token});
 t.listeners.biblozooCapturePlayback({
    kind:"ended",takeId:last.takeId,playToken:last.token});
 assert.equal(await originalPlay,true);
 assert.equal(callback,1);
 const stopped=rec.playDevVariant("chorus_swarm",()=>{});
 await tick();
 const pending=t.calls.filter(x=>x&&typeof x==="object").at(-1);
 rec.stopFun();
 assert.equal(await stopped,false,"Stop must settle and mute all DEV layers");
 t.listeners.biblozooCapturePlayback({
   kind:"ended",takeId:pending.takeId,playToken:pending.token});
 assert.equal(rec.snapshot().playbackComplete,false);
 t.setDeny(true);
 assert.equal(await rec.playDevVariant("demon_clean",()=>{}),false,
   "Actual OS activation rejection remains a retry, never fake heard");
 rec.dispose();await tick();
 assert(t.calls.includes("discard"),"Closing lab destroys the same RAM take");
 console.log("N7e.1 PASS: five Demon, five genuinely layered Chorus IDs, one RAM take; DEV-only bridge flag, original child presets isolated, post-DSP start/real end, stale/denied/stop/cleanup, original direct lab preserved. Physical iPhone listening still required.");
}
main().catch(e=>{console.error(e);process.exitCode=1});
