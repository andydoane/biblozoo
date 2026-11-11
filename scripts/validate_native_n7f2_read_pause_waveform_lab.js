/* N7f.2: early iOS App Switcher pause + DEV six-waveform native audition.
 * Source/VM contracts. CI cannot emulate UIKit, Apple SDK or phone audio.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const scene = read("ios/App/App/SceneDelegate.swift");
const readActivity = read("read_my_verse.js");
const adapter = read("verse_games/shared/native-read-my-verse-output-n7f.js");
const lab = read("verse_games/shared/native-read-cue-waveform-lab-n7f2.js");
const dock = read("verse_games/shared/native-dev-tools-dock-n7e.js");
const index = read("index.html");
const css = read("read_my_verse.css");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const has = (s,v,why) => assert(s.includes(v),why+": "+v);
for (const s of [readActivity,adapter,lab,dock]) new vm.Script(s);
const sceneFront=scene.slice(0,scene.indexOf("// Patch 58:"));
has(sceneFront,"func sceneWillResignActive(_ scene: UIScene)",
  "UIKit scene activity signal freezes before delayed WebKit hidden");
has(sceneFront,"layer.speed = 0","Native CoreAnimation visual snapshot freeze");
has(sceneFront,"layer.timeOffset = clock","Freeze has actual scene clock");
has(sceneFront,"func sceneDidBecomeActive(_ scene: UIScene)",
  "Rebase layer clock when app becomes foreground again");
has(sceneFront,"layer.beginTime = layer.convertTime(CACurrentMediaTime(), from: nil) - paused",
  "Restore animation clock rather than fast-forwarding held switcher time");
has(sceneFront,'Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.audiotest"',
  "Swift visual freeze never changes stable app");
has(scene,'notifyListeners("biblozooReadLifecycle"',
  "Native UIApplication.willResignActive emits early read event");
has(scene,'name == UIApplication.willResignActiveNotification',
  "Swift event sent at willResign, not delayed didEnterBackground");
has(adapter,'api().addListener("biblozooReadLifecycle"',
  "JS subscribes to native notification");
// N7m expands the real OS interruption signals: an active UIKit scene can
// lose audio to PiP/AirPods with NO AVAudioPlayer, without willResignActive.
for (const phase of ['"willResignActive"','"audioInterruptionBegan"',
                     '"routeInterrupted"','"mediaServicesInterrupted"'])
  has(adapter,phase,"Only fixed authentic native OS lifecycle phases pause Read");
has(adapter,".includes(event?.phase)) return;",
  "Unrelated native notifications must NOT freeze Read");
has(adapter,"activation = null;","Never reclaim audio priority from inactive timer");
has(adapter,"onAppInactive,playCue,stopCues,stopAll",
  "Read controller can subscribe to native early scene event");
has(adapter,"listen();\n  root.BibloZooNativeReadOutputController",
  "Lifecycle listener initialized even during visually-only scene");
has(readActivity,"onAppInactive?.(",
  "Read My Verse hooks native signal to its actual recovery owner");
has(readActivity,"pauseReadForInterruption();",
  "Actual recovery freezes scene, audio and timers");
has(readActivity,"root?.BibloZooNativeReadOutputController?.enabled &&",
  "New typing freeze is gated to native Audio Test, preserving browser");
has(readActivity,"isTypingActivity(state.activityId)) freezeReadTypingIntro();",
  "Both typing activities freeze their short cutscene and blinking cursor");
has(readActivity,'state.typewriterIntroPhase !== "done") finishTypewriterIntro();',
  "Original Web/PWA/Android still finishes interrupted typing intro as before");
has(readActivity,"thawReadTypingIntro();",
  "Typing intro unfreezes on explicit verified Resume Audio only");
has(css,".read-my-verse-screen.read-audio-paused *",
  "Existing CSS pause class protects Balloons, Fish and typing");
has(readActivity,"freezeReadScene(session)",
  "Read owner snapshots direct CSS animation times");
has(readActivity,"entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt))",
  "Animated scene timers never run down during switcher hold");
has(readActivity,"scene?.active ? scene : null",
  "Only live Read scene can own animated recovery");
has(readActivity,"readAudioRecovery = null;\n        thawReadPauseTimer();\n        thawReadTypingIntro();",
  "Explicit acknowledgement not page return thaws typing intro");
assert(!/root\.(?:Audio|webkitAudioContext)\s*=/.test(adapter),
  "N7f2 never restores WebKit audio fallback");

const plug=scene.slice(scene.indexOf("@objc(BibloZooNativeReadOutputPlugin)"));
has(plug,'CAPPluginMethod(name: "auditionCue"',
  "Native waveform audition is registered on actual bridge");
has(plug,'@objc func auditionCue(_ call: CAPPluginCall)',
  "Native auditioner has independent method");
const childPlay=plug.slice(plug.indexOf("    @objc func playCue("),
                            plug.indexOf("    // N7f.2: audition ONLY."));
has(childPlay,'self.wavData(midi: midi, seconds: duration,',
  "Normal child still calls original WAV sample path");
assert(!childPlay.includes("waveform: waveform")&&!childPlay.includes("auditionCue("),
  "No DEV waveform ID or preference enters child Read gameplay");
const audition=plug.slice(plug.indexOf("    // N7f.2: audition ONLY."),
                          plug.indexOf("    @objc func stopCues("));
for(const id of ['"scramble-word"','"scramble-finish"','"order-finish"'])
  has(audition,id,"Exactly three source-authored sample phrases");
for(const id of ['"current"','"web-triangle"','"sine"','"soft-square"',
  '"sawtooth"','"warm"'])
  has(audition,id,"Strictly allowlisted waveform option");
has(audition,"self.isDevBundle","DEV-only native Audio Test bundle");
has(audition,"UIApplication.shared.applicationState == .active",
  "No sound while task switcher open");
has(audition,"AVAudioSession.sharedInstance().category == .soloAmbient",
  "Keep nonmixing session category");
has(audition,"try AVAudioSession.sharedInstance().setActive(true)",
  "Session priority requested only on actual DEV sample tap");
has(audition,'self.cues.forEach { $0.stop() }',
  "Fresh sample replaces preceding voices, not overlaps/auto repeat");
has(audition,"self.cues.removeAll()",
  "Stop and release old sample before next selection");
has(audition,"gain: 0.22, square: false,",
  "Fixed shared baseline note volume for all shapes");
const wav=plug.slice(plug.indexOf("    private func wavData("),
  plug.indexOf("    @objc func playCue("));
for(const id of ['case "sine"','case "soft-square"','case "sawtooth"',
  'case "warm"','waveform == "web-triangle"'])
  has(wav,id,"Actually distinct mathematical native PCM waves/envelopes");
has(wav,'wave = square ? (phase < 0.5 ? 1 : -1) : triangle',
  "Original child waveform/negative feedback remains unchanged");
has(wav,"max(-1, min(1,","Hard clamp protects native PCM sample levels");
assert(!/MediaRecorder|getUserMedia|write\(to:|http[s]?:\/\//.test(audition),
  "No DEV audition mic, files or network");
has(index,'native-read-cue-waveform-lab-n7f2.js',
  "DEV Lab actually loaded before gameplay");
has(dock,'Read Beep Lab · 6 Waveforms',
  "Compact existing DEV drawer exposes separate option");
has(dock,'root.BibloZooNativeReadCueLab?.open?.()',
  "Owner is one explicit click from fixed-sample choice");
for(const old of ['Wacky Lab · 10 Effects','Demon / Chorus Lab · 5 + 5'])
  has(dock,old,"Existing Wacky/compare labs remain intact");
has(lab,'root.BibloZooNativeOnlyOutput?.enabled === true',
  "Browser/PWA/Android never get new lab");
has(lab,'root.Capacitor?.getPlatform?.() === "ios"',
  "Native-only DEV lab");
assert(!/AudioContext|webkitAudioContext|new Audio\(|getUserMedia|MediaRecorder/.test(lab),
  "Lab has no Web audio fallback or mic");
has(lab,'api().auditionCue({sample,waveform})',
  "Audio originates from exact user-tapped fixed key only");
has(lab,'api()?.stopCues?.()',
  "Close and stop silence remaining scheduled native notes");
has(lab,'doc.addEventListener("visibilitychange"',
  "Lab closes on background/lock");
has(lab,'root.addEventListener?.("pagehide",close)',
  "Lab closes on navigation");
has(workflow,'validate_native_n7f2_read_pause_waveform_lab.js',
  "CI must run new pause+waveform regression");
for(const doc of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
 "docs/AUDIO-RECOVERY.md","docs/N7F2-READ-EARLY-PAUSE-WAVEFORM-LAB.md"])
  has(read(doc),"N7f.2","All four mandatory PR artifacts maintained");

// Exercise the real TYPEWRITER step owner in isolation with fake clock.
// This is not a guess about CSS: the same functions are evaluated from source.
(function verifyTypingTimeoutActuallyFreezes(){
  const begin=readActivity.indexOf("  function scheduleTypewriterIntroStep(");
  const end=readActivity.indexOf("  // Both typing activities share",begin);
  assert(begin>=0&&end>begin,"Real typing timer helper source present");
  const funcs=readActivity.slice(begin,end);
  let now=1000,id=0,runCount=0;
  const timers=new Map();
  const wrap={classes:new Set(),classList:{
    add(x){wrap.classes.add(x);}, remove(x){wrap.classes.delete(x);}
  }};
  const doc={hidden:false,querySelector:()=>wrap};
  const sandbox={
    readAudioRecovery:null,
    typewriterIntroTask:null,typewriterIntroTimer:0,typewriterIntroWrap:wrap,
    root:{document:doc},
    Date:{now:()=>now},
    setTimeout(fn,ms){const k=++id;timers.set(k,{fn,due:now+ms});return k;},
    clearTimeout(k){timers.delete(k);}
  };
  vm.createContext(sandbox);
  const getter=vm.runInContext(funcs+
    "\n({scheduleTypewriterIntroStep,freezeReadTypingIntro,thawReadTypingIntro})",
    sandbox);
  getter.scheduleTypewriterIntroStep(()=>runCount++,250);
  assert.equal(timers.size,1);
  now+=100;
  sandbox.readAudioRecovery={kind:"ack"};
  getter.freezeReadTypingIntro();
  assert(wrap.classes.has("read-audio-paused"),
    "Typing/Keyboard CSS frozen as early as native lifecycle");
  assert.equal(timers.size,0);
  assert.equal(sandbox.typewriterIntroTask.remaining,150,
    "Interrupted typing frame keeps exactly its unused 150ms");
  now+=9000;
  assert.equal(runCount,0,"No intro progress during held app switcher");
  sandbox.readAudioRecovery=null;
  getter.thawReadTypingIntro();
  assert(!wrap.classes.has("read-audio-paused"));
  const remaining=[...timers.values()][0];
  assert.equal(remaining.due,now+150,
    "Explicit acknowledgement arms ONLY the remaining time");
  now+=150;
  remaining.fn();
  assert.equal(runCount,1);
  assert.equal(sandbox.typewriterIntroTask,null,
    "Completed one-shot timer does not duplicate intro step");
})();

async function verifyAuditionActuallyWorks(){
  const clicks=[];
  function element(tag){
    return {
      tag,children:[],attrs:{},style:{},listeners:{},textContent:"",
      setAttribute(k,v){this.attrs[k]=v;},
      append(...nodes){this.children.push(...nodes);},
      appendChild(n){this.children.push(n);return n;},
      remove(){this.removed=true;},
      addEventListener(k,fn){this.listeners[k]=fn;},
      click(){this.listeners.click?.();}
    };
  }
  const listeners={};
  const doc={
    hidden:false,body:element("body"),
    createElement:element,addEventListener(k,fn){listeners[k]=fn;}
  };
  const calls=[];
  const root={
    document:doc,
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeReadOutput:{
        auditionCue(args){calls.push({type:"audition",...args});
          return Promise.resolve({played:true,noteCount:4});},
        stopCues(){calls.push({type:"stop"});return Promise.resolve({stopped:true});}
      }}},
    addEventListener(k,fn){listeners[k]=fn;}
  };
  vm.runInNewContext(lab,{window:root,Promise,Object,Array,Math,String});
  const api=root.BibloZooNativeReadCueLab;
  assert(api?.open,"Native iOS exposes owner audition entry");
  assert.equal(calls.length,0,"Script installation never requests sound");
  api.open();
  assert.equal(calls.filter(x=>x.type==="audition").length,0,
    "Opening Lab only displays controls, never plays/activates");
  const overlay=doc.body.children.at(-1);
  const collect=node=>[node,...(node.children||[]).flatMap(collect)];
  const nodes=collect(overlay);
  const playable=nodes.filter(n=>n.attrs?.["data-read-waveform"]);
  assert.equal(playable.length,18,
    "Six named distinct waveform buttons for each of THREE samples");
  assert.equal(new Set(playable.map(n=>
    n.attrs["data-read-sample"]+"|"+n.attrs["data-read-waveform"])).size,18);
  for(const n of playable){
    n.click();
    await Promise.resolve();
  }
  assert.equal(calls.filter(x=>x.type==="audition").length,18,
    "Owner can directly audition all 18 exact native fixed-note combos");
  const last=calls.filter(x=>x.type==="audition").at(-1);
  assert.equal(last.sample,"order-finish");
  assert.equal(last.waveform,"warm");
  const stop=nodes.find(n=>n.textContent==="■ Stop Sound");
  assert(stop?.click);
  stop.click();
  assert(calls.filter(x=>x.type==="stop").length>=2,
    "Explicit Stop cancels all pending native cue notes");
  api.close();
  assert(overlay.removed,"Exit dismisses the separate overlay");
  assert(calls.filter(x=>x.type==="stop").length>=3,
    "Exit cleans even delayed scheduled notes");
  const browser={document:doc,
    BibloZooNativeOnlyOutput:{enabled:false},
    Capacitor:{isNativePlatform:()=>false,getPlatform:()=>"web"}};
  vm.runInNewContext(lab,{window:browser});
  assert.equal(browser.BibloZooNativeReadCueLab,undefined,
    "Browser/PWA/Android never installs the dev lab");
}
verifyAuditionActuallyWorks().then(()=>console.log(
  "N7f.2 PASS: immediate UIKit visual freeze + early Read JS event, typing remainder 150ms retained across 9s switch hold, 18 DEV-only native waveform demos, unchanged child cues, no auto output/upload/Web fallback; Mac Xcode/iPhone required."
)).catch(e=>{console.error(e);process.exitCode=1});
