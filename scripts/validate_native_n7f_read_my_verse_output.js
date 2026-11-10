/* N7f: actual native Read My Verse output facade, published asset guards,
 * true AVAudioPlayer position/end, no Web/HTML audio, child-approved Wacky.
 * Not a Mac Xcode SDK typecheck, real speaker test, or microphone proof.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=f=>fs.readFileSync(path.resolve(__dirname,"..",f),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const js=read("verse_games/shared/native-read-my-verse-output-n7f.js");
const activity=read("read_my_verse.js");
const old=read("flashcards/audio-effects.js");
const original=read("flashcards/recording.js");
const facade=read("verse_games/shared/native-flashcards-capture-n7c.js");
const source="read_my_verse.js";
function has(s,part,reason){assert(s.includes(part),reason+": "+part);}
function section(s,start,end){
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  assert(a>=0&&b>a,"Missing real source scope: "+start);
  return s.slice(a,b);
}
for(const file of [js,activity,facade,original,old])
  new vm.Script(file);
has(swift,"bridge?.registerPluginInstance(BibloZooNativeReadOutputPlugin())",
    "Read output must actually register with Capacitor");
has(swift,"@objc(BibloZooNativeReadOutputPlugin)",
    "iOS native output plugin class exists");
has(swift,'public let jsName = "BibloZooNativeReadOutput"',
    "One native plugin name exposed to JS");
for(const api of ["activateFromGesture","playClip","stopClip",
 "seekClip","stopAll","playCue","stopCues"])
 has(swift,'CAPPluginMethod(name: "'+api+'"',"Native contract method");
const plug=swift.slice(swift.indexOf("@objc(BibloZooNativeReadOutputPlugin)"));
has(plug,'Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.audiotest"',
    "Never native-activate normal/stable installed app");
has(plug,'AVAudioSession.sharedInstance().category == .soloAmbient',
    "Preserve single nonmixing output session category");
has(plug,'try AVAudioSession.sharedInstance().setActive(true)',
    "Only explicit Resume/Start can claim audio session");
assert.equal((plug.match(/setActive\(true\)/g)||[]).length,2,
    "Only explicit child Read Start/Resume and DEV audition taps activate audio");
const childGesture=plug.slice(plug.indexOf("    @objc func activateFromGesture("),
  plug.indexOf("    @objc func playClip("));
const devGesture=plug.slice(plug.indexOf("    @objc func auditionCue("),
  plug.indexOf("    @objc func stopCues("));
assert(childGesture.includes("setActive(true)") && devGesture.includes("setActive(true)"),
    "Both activations are behind real explicit user gestures");
has(plug,'AVAudioSession.InterruptionType.began.rawValue',
    "Real external OS interruption stops active tracks");
has(plug,'UIApplication.willResignActiveNotification',
    "Held App Switcher pauses/invalidates all native Read audio");
has(plug,'UIApplication.didEnterBackgroundNotification',
    "Background/lock stops native Read audio");
has(plug,'AVAudioSession.mediaServicesWereResetNotification',
    "Native reset does not auto-resume output");
has(plug,'guard id.count > 0 && id.count <= 65',
    "Verse id is bounded");
has(plug,'verse["published"] as? Bool == true',
    "Only actually published Bible verse audio can be read");
has(plug,'verse["verseId"] as? String == id',
    "Publication metadata must match exact verse id");
has(plug,'subdirectory: "public/verse_data"',
    "No caller path or URL for published verse metadata");
has(plug,'subdirectory: "public/verse_audio"',
    "Narration bundled only from local approved verse assets");
for(const item of [
 '"crawl-theme": ("verse_images/read_my_verse"',
 '"crawl-ending": ("verse_images/read_my_verse"',
 '"typewriter-alert": ("verse_images/read_my_verse"',
 '"keyboard-alert": ("verse_images/read_my_verse"',
 '"incorrect": ("verse_images/daily_questions"',
 'subdirectory: "public/verse_images/read_my_verse"',
 'key.hasPrefix("typewriter-")','key.hasPrefix("keyboard-")'
])has(plug,item,"Fixed source-backed sample bank");
has(plug,"let player = try AVAudioPlayer(contentsOf: url)",
    "Real native AVAudioPlayer from bundled asset");
has(plug,'guard player.play() else',
    "Play refused is not reported started:true");
has(plug,"public func audioPlayerDidFinishPlaying(",
    "Native audio delegate confirms real end");
has(plug,'self.emit(flag ? "ended" : "interrupted"',
    "Failed/incomplete audio never reports heard completion");
has(plug,'self.emit("progress", id: id, player: player)',
    "Media clock comes from actual native AVAudioPlayer.currentTime");
has(plug,"cancelAll(reason: \"interrupted\")",
    "Real OS interruption invalidates native audio");
has(plug,"private func wavData(midi: Int, seconds: Double, gain: Double,",
    "Fixed native-RAM synthesized activity feedback");
has(plug,'["order", "scramble", "negative"].contains(kind)',
    "No caller arbitrary oscillator frequency or uploaded sound");
has(plug,"player.play(atTime: player.deviceCurrentTime + delay)",
    "Short fixed note delays are driven by native player clock");
assert(!/getUserMedia\(|MediaRecorder\(|requestPermission\(/.test(plug),
    "N7f is output ONLY, never microphone input");
const activeSwift = plug.replace(/\/\/[^\n]*/g, "");
assert(!/notifyOthersOnDeactivation|\.mixWithOthers|\.duckOthers/.test(activeSwift),
    "N7d.2 priority policy remains nonmixing with no auto-resume hint");
assert(!/URL\(string:|http[s]?:|FileManager\.default|write\(to:/.test(plug),
    "No remote fetch, writable recording files, or arbitrary audio URLs");
has(js,"root.BibloZooNativeOnlyOutput?.enabled === true",
    "Only isolated native output guard can enable adapter");
has(js,"root.Capacitor?.isNativePlatform?.() === true",
    "Browser/Android inert");
has(js,'root.Capacitor?.getPlatform?.() === "ios"',
    "Only iOS Audio Test");
has(js,"class NativeAudio {","Activity-local audio compatibility proxy");
has(js,"this._requestId=\"rmv-\"+(++counter)",
    "Each native clip has a unique generation-scoped request id");
has(js,"playClip({","Actual playback uses Capacitor native bridge");
has(js,"this._emit(\"ended\"); // native AVAudioPlayerDelegate only",
    "Only REAL native ended event can advance chunk/verse");
has(js,"this._emit(\"error\"); // never a fake 'ended'",
    "Interrupted output never fakes completion");
has(js,'kind==="started" || event.kind==="progress"',
    "Real native position updates feed existing Read recovery clocks");
has(js,"stopAll()","Exit/leave invalidates output/cues");
has(js,"if(!activation)","User gesture priority required");
has(js,"NativeAudio,clipIdFor,activateFromGesture,",
    "Controller exposes only native owner capabilities");
assert(!/root\.Audio\s*=|AudioContext\s*=|webkitAudioContext\s*=/.test(js),
    "No global Audio/WebAudio hijack or fallback");
has(activity,"const Audio = root?.BibloZooNativeReadOutputController?.enabled",
    "Only local Read My Verse Audio constructor is shadowed");
has(activity,"? root.BibloZooNativeReadOutputController.NativeAudio : root?.Audio;",
    "Browser/PWA/Android keep their actual root.Audio constructor");
has(activity,"new root.Audio(",
    "Original browser reference path remains intact in source/legacy VM");
for(const part of ["new Audio(src)","new Audio(CRAWL_MUSIC_SRC)",
 "new Audio(CRAWL_ENDING_SRC)","new Audio("])
  has(activity,part,"Native Read media paths select the local native ctor");
has(activity,"void root.BibloZooNativeReadOutputController.activateFromGesture();",
    "Actual user Start/Resume is the only activation site");
has(activity,"void root.BibloZooNativeReadOutputController.stopAll();",
    "Exit cancels native narration and overlapping Crawl output");
has(activity,'root.BibloZooNativeReadOutputController.playCue("order", nextIndex, complete, wrong)',
    "Tap Words in Order correct/wrong notes are native");
has(activity,'root.BibloZooNativeReadOutputController.playCue("scramble", solvedCount, complete, false)',
    "Unscramble correct/complete rewards are native");
has(activity,'root.BibloZooNativeReadOutputController.playCue("negative", 1, false, true)',
    "Native generated negative optional feedback");
has(activity,'void root.BibloZooNativeReadOutputController.stopCues();',
    "Activity exit cuts fixed native note feedback");
has(activity,"if (root?.BibloZooNativeReadOutputController?.enabled || readNarrationBlocked(error))",
    "Native denied output goes to recovery, never fake chunk completion");
has(activity,'engine: root?.BibloZooNativeReadOutputController?.enabled ? "native-read-n7f" :',
    "Crawl uses native/HTML path based on isolated Audio Test");
has(activity,"root?.BibloZooNativeReadOutputController?.enabled && !session.endingDone",
    "Native Crawl watchdog is a failure, never fabricated ended");
has(activity,"root?.BibloZooNativeReadOutputController?.enabled) pauseReadForInterruption()",
    "Native ending denial goes to recovery");
has(old,"const OFFICIAL_PRESET_IDS =",
    "Original browser ten Wacky names unchanged");
has(original,"new MediaRecorder(stream",
    "Web/PWA/Android original recorder unchanged");
const mic=section(swift,"    // N7f owner decision:","    private func n7eRate");
has(mic,'case "demon": return "demon_whisper" // owner D4',
    "Promote EXACT owner-approved Haunted Whisper child Demon");
has(mic,'case "chorus_alien": return "chorus_wobble" // owner C5',
    "Promote EXACT owner-approved Wobbling Chorus child Alien");
has(swift,"Self.n7e1Variants[n7fApprovedPreset(preset)]",
    "Approved variants affect pitch, speed and effect chain");
has(swift,"self.n7fApprovedPreset(effectId)",
    "Approved variant also affects chorus extra players and bounded tail");
has(swift,'preset == "chorus_alien" else',
    "Approved Chorus main pitch moves rather than static old delay");
has(facade,'const OFFICIAL_WACKY_IDS = new Set([',
    "Normal child still sees only original ten official choices");
has(facade,'const DEV_VARIANT_IDS = new Set([',
    "Comparison labs still offer all original variants");
const workflow=read(".github/workflows/ios-prep-validation.yml");
has(workflow,"validate_native_n7f_read_my_verse_output.js",
    "CI must exercise native Read and approved Wacky");
for(const doc of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
  "docs/AUDIO-RECOVERY.md","docs/N7F-READ-MY-VERSE-NATIVE-OUTPUT-WACKY-PROMOTION.md"])
  has(read(doc),"N7f","Living handoff + dedicated owner iPhone gate");

async function exerciseNative(){
  const calls=[],on={},listeners={},eventLoop={};
  let accept=true,gestureCount=0;
  const plugin={
    addListener(name,fn){
      assert(["biblozooReadOutput","biblozooReadLifecycle"].includes(name),
        "Only native Read media and early scene lifecycle are observed");
      listeners[name]=fn;return Promise.resolve({remove(){}});},
    activateFromGesture(){gestureCount++;calls.push({kind:"activate"});
      return Promise.resolve({activated:accept});},
    playClip(args){calls.push({kind:"play",...args});
      return Promise.resolve(accept ?
        {started:true,positionMs:args.positionMs||0,durationMs:4800} :
        {started:false,reason:"os-denied"});},
    stopClip(args){calls.push({kind:"stop",...args});
      return Promise.resolve({stopped:true});},
    seekClip(args){calls.push({kind:"seek",...args});
      return Promise.resolve({seeked:true});},
    stopAll(){calls.push({kind:"stop-all"});return Promise.resolve({stopped:true});},
    playCue(args){calls.push({operation:"cue",...args});
      return Promise.resolve({played:true});},
    stopCues(){calls.push({kind:"stop-cues"});
      return Promise.resolve({stopped:true});}
  };
  const doc={hidden:false,addEventListener:(name,fn)=>on[name]=fn};
  const win={document:doc,
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeReadOutput:plugin}},
    addEventListener:(name,fn)=>eventLoop[name]=fn};
  vm.runInNewContext(js,{window:win,Promise,Error,Number,
    Object,Math,Map,Array,RegExp,String});
  const a=win.BibloZooNativeReadOutputController;
  assert(a?.enabled,"Only native iOS installs output adapter");
  assert(typeof listeners.biblozooReadLifecycle==="function",
    "N7f.2 listens for UIApplication.willResignActive even while idle");
  assert.equal(calls.length,0,"Passive load cannot activate sound");
  for(const [src,id] of [
    ["./verse_audio/john_3_16a.mp3","verse:john_3_16a"],
    ["./verse_audio/john_3_16_ref.mp3","verse:john_3_16_ref"],
    ["./verse_images/read_my_verse/verse_crawl_theme_ducked.mp3","crawl-theme"],
    ["./verse_images/read_my_verse/verse_crawl_theme_ending.mp3","crawl-ending"],
    ["./verse_images/read_my_verse/typewriter_1.mp3","typewriter-1"],
    ["./verse_images/read_my_verse/keyboard_7.mp3","keyboard-7"],
    ["./verse_images/read_my_verse/typewriter_alert.mp3","typewriter-alert"],
    ["./verse_images/daily_questions/dq_incorrect.mp3","incorrect"]
  ])assert.equal(a.clipIdFor(src),id,"Strict source-backed JS clip map");
  for(const src of ["https://bad.example/voice.mp3","./verse_audio/../../x.mp3",
    "user:file:///secret","./verse_images/read_my_verse/random.mp3"])
    assert.equal(a.clipIdFor(src),"","Unknown or remote media fails CLOSED");

  const test=new a.NativeAudio("./verse_audio/john_3_16a.mp3");
  let ended=0,errors=0,meta=0;
  test.addEventListener("ended",()=>ended++);
  test.addEventListener("error",()=>errors++);
  test.addEventListener("loadedmetadata",()=>meta++);
  await assert.rejects(test.play(),"Without a real Start gesture, native media fails");
  assert.equal(calls.filter(c=>c.kind==="play").length,0);
  assert.equal(ended,0,"No fake ended on denial");
  await a.activateFromGesture();
  assert.equal(gestureCount,1);
  await test.play();
  const act=calls.filter(c=>c.kind==="play").at(-1);
  assert.equal(act.clipId,"verse:john_3_16a");
  assert.equal(meta,1);
  assert.equal(ended,0,"Bridge play ACK never advances child");
  assert.equal(test.currentTime,0);
  listeners.biblozooReadOutput({kind:"progress",requestId:act.requestId,
    positionMs:1870,durationMs:4800});
  assert.equal(test.currentTime,1.87,"Real native clock progression drives recovery");
  test.currentTime=2.25;
  await Promise.resolve();
  assert(calls.some(c=>c.kind==="seek"&&c.positionMs===2250),
    "Crawl music resume seeks real native player");
  listeners.biblozooReadOutput({kind:"ended",requestId:"wrong-owner",
    positionMs:4800,durationMs:4800});
  assert.equal(ended,0);
  listeners.biblozooReadOutput({kind:"ended",requestId:act.requestId,
    positionMs:4800,durationMs:4800});
  assert.equal(ended,1,"Only correct native AVAudioPlayer delegate END");
  assert.equal(test.ended,true);
  await test.play();
  const after=calls.filter(c=>c.kind==="play").at(-1);
  listeners.biblozooReadOutput({kind:"interrupted",requestId:after.requestId,
    positionMs:400,durationMs:4800});
  assert.equal(ended,1,"OS interrupt must NOT be fake completed narration");
  assert(errors>=2,"Error feedback survives denied and interrupted playback");
  await test.play();
  const third=calls.filter(c=>c.kind==="play").at(-1);
  test.pause();
  listeners.biblozooReadOutput({kind:"ended",requestId:third.requestId,
    positionMs:4800,durationMs:4800});
  assert.equal(ended,1,"Stopped clip cannot receive stale end");
  a.playCue("order",3,false,false);
  a.playCue("scramble",2,true,false);
  a.playCue("negative",1,false,true);
  // Cue calls await the real-gesture activation promise and then cross
  // a separate Capacitor microtask queue. Yield one full event-loop turn.
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(
    calls.filter(c=>c.operation==="cue").map(c=>c.kind),
    ["order","scramble","negative"],
    "All three fixed authored feedback paths call native, never WebAudio");
  doc.hidden=true;on.visibilitychange();
  assert.equal(await a.activateFromGesture(),false,
    "Background may never activate the session");
  await a.stopAll();
  assert(calls.some(c=>c.kind==="stop-all"));
  // Held switcher doesn't depend on document.hidden changing in WebKit.
  let inactive=0;
  a.onAppInactive(()=>inactive++);
  listeners.biblozooReadLifecycle({phase:"willResignActive"});
  assert.equal(inactive,1,"Native early pause reaches an idle Read scene");
  assert.equal(await a.activateFromGesture(),false,
    "App switcher may never claim a fresh audio session");
  // A second nonnative browser/PWA context never installs the facade.
  const plain={document:doc,
    BibloZooNativeOnlyOutput:{enabled:false},
    Capacitor:{isNativePlatform:()=>false,getPlatform:()=>"web"}};
  vm.runInNewContext(js,{window:plain,Promise,Error});
  assert.equal(plain.BibloZooNativeReadOutputController,undefined,
    "Original Web/PWA/Android owner untouched");
}
exerciseNative().then(()=>console.log(
  "N7f PASS: approved D4/C5 promoted to child IDs; Read My Verse output-only published native clips/music, real progress/delegate end, feedback cues, strict one-time user activation, no fake completion, original browser unaffected. iPhone hearing and Mac Xcode required."
)).catch(e=>{console.error(e);process.exitCode=1});
