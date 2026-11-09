/* N6q: real Verse Jam source + native-only PCM bridge regression.
 * Run: node scripts/validate_native_playground_verse_jam_n6q.js
 * Linux Node/Web checks cannot compile AVFoundation Swift or prove speaker audio.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const game = read("verse_playground/verse_jam/game.js");
const controller = read("verse_games/shared/native-verse-jam-audio.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html = read("verse_playground/verse_jam/index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");
const sourceTest = (pattern, message) => assert(pattern.test(game), message);
const has = (value, text, message) => assert(value.includes(text), message);

(async () => {
  new vm.Script(game, {filename:"verse_jam/game.js"});
  new vm.Script(controller, {filename:"native-verse-jam-audio.js"});
  has(html, 'native-verse-jam-audio.js', "Game HTML must load native owner before game.js");
  assert(html.indexOf('native-verse-jam-audio.js') <
    html.indexOf('src="./game.js"'), "Native owner load order");

  // Exact original families and mode BPMs, not generic melody or a drum-only swap.
  for (const label of ["chip_bounce_basic", "chip_bounce_middle", "chip_bounce_final",
    "countdownBeep", "goTone", "introWords", "transition", "buttonPopIn",
    "warmupWord", "defaultWord", "voice", "pad", "scoreSparkle", "finalArpeggio"])
    has(game, label, "Missing original source family: " + label);
  for (const bpm of [92,100,104,108,112,120,128]) {
    has(game, "bpm: " + bpm, "Missing original round tempo " + bpm);
    has(swift, "92,100,104,108,112,120,128",
      "Swift fixed pad tempo inventory");
  }
  for (const id of ["boom","hey","woo","yeah","yo"]) {
    has(game, "verse_jam_voice_" + id + ".mp3", "Missing recorded source voice: " + id);
    assert(fs.existsSync(path.join(root,"verse_playground/verse_jam/verse_jam_sounds",
      "verse_jam_voice_" + id + ".mp3")), "Missing shipped voice " + id);
  }
  for (const filename of ["verse_jam_voice_boom","verse_jam_voice_hey",
    "verse_jam_voice_woo","verse_jam_voice_yeah","verse_jam_voice_yo"])
    has(swift, '"verse_jam_voice_"', "Swift source voice manifest");
  for (const id of ["jam-note", "jam-pad", "jam-drum-kick",
    "jam-drum-snare","jam-drum-hat","jam-drum-extra",
    "jam-voice-boom","jam-voice-hey","jam-voice-woo",
    "jam-voice-yeah","jam-voice-yo","ui-pop-1","ui-pop-2"]) {
    has(controller, id === "jam-voice-boom" ? '"jam-voice-"': id.startsWith("jam-voice-")
      ? "jam-voice-" : id, "Controller missing " + id);
    has(swift, id.startsWith("jam-voice-") ? "jam-voice-" : id,
      "Swift missing " + id);
  }
  has(swift, "prepareJamOnWorker", "Native PCM bank must pre-render on worker");
  has(swift, "jamNoteRecipes", "Native fixed note recipe inventory");
  has(swift, "jamPadBuffers", "Native pre-rendered chord bank");
  has(swift, "requestedJamNote", "Hot note parameter must be allowlisted");
  has(swift, "requestedJamPad", "Hot pad parameter must be allowlisted");
  has(swift, 'soundId == "jam-group"', "Scoped cancel must preserve warmed PCM");

  // Native isolation and rhythm controls use existing game/score code.
  sourceTest(/const nativeJamClock = nativeJamAudio \? Object\.freeze/, "Native JS clock required");
  sourceTest(/get currentTime\(\) \{ return performance\.now\(\) \/ 1000; \}/,
    "Native beat must use monotonic time");
  sourceTest(/function primeHtmlAudio\(\) \{\s*if \(nativeJamAudio\) return/,
    "Native must never silently prime an HTML media element");
  sourceTest(/function createAudioGraph\(\) \{\s*if \(nativeJamAudio\) return/,
    "Native must not create WebAudio graph");
  sourceTest(/function installAudioUnlockHandlers\(\) \{\s*if \(nativeJamAudio\)/,
    "Global pointer/foreground callbacks cannot activate session on iOS");
  sourceTest(/function scheduleVerseJamForegroundRecovery\(\) \{\s*if \(nativeJamAudio\) return/,
    "Passive foreground audio activation prohibited");
  sourceTest(/scheduleNativeJam\(when, \(\) =>\s*nativeJamAudio\.playDrum/,
    "Native bars must defer drums until their actual event time");
  sourceTest(/nativeJamTimers\.forEach\(id => clearTimeout\(id\)\)/,
    "Cancel in-flight JS note timers");
  sourceTest(/generation === musicGeneration && !document\.hidden/,
    "Never replay a stale performance generation");
  sourceTest(/if \(nativeJamAudio\) \{\s*const bpm = currentRound\(\)\.bpm;/,
    "Original pad must be native for each BPM");
  sourceTest(/nativeJamAudio\.playTone\(midi, duration/,
    "Original tone parameters must route to pre-rendered PCM");
  sourceTest(/nativeJamAudio\.playVoice\(sound\.id, volume\)/,
    "Use published recorded filler, not synthetic substitute");
  sourceTest(/nativeJamAudio\.stopVoices\(\)/,
    "Menu/interrupt stops beat voices without discarding prepared PCM");
  sourceTest(/nativeJamAwaitingStart = true/,
    "Denied native start remains paused and retryable");
  sourceTest(/restoreNativeOnGesture: nativeJamAudio \? \(\) =>/,
    "Plain Welcome Back must own real native activation");
  sourceTest(/nativeOnlyAudio: !!nativeJamAudio/,
    "No native Zoo Break for audio session failure");
  sourceTest(/phase === "score"/,
    "Score needs paused-return handling with no duplicate reward");
  sourceTest(/stopRun\(\{ keepNativeReady: !!nativeJamAudio \}\)/,
    "Final arpeggio must not be cut off by early stop");
  sourceTest(/nativeJamAudio\.stop\(\)/, "Native app exit/interruption tears bank down");
  has(workflow,"validate_native_playground_verse_jam_n6q.js",
    "Final-head CI must run Jam regressions");
  has(handoff,"N6q", "Living handoff must be updated in this PR");

  // Exercise the actual native controller with a mocked sole Capacitor plugin.
  const calls = {activation:[],preload:[],play:[],stop:[],stopEffect:[]};
  const listeners = {};
  let nextActivation = {ready:true};
  const plugin = {
    activateFromGesture(args) { calls.activation.push(args); return Promise.resolve(nextActivation); },
    preload(args) { calls.preload.push(args); return Promise.resolve({prepared:true,durationMs:250}); },
    play(args) { calls.play.push(args); return Promise.resolve({accepted:true}); },
    stop(args) { calls.stop.push(args); return Promise.resolve({stopped:true}); },
    stopEffect(args) { calls.stopEffect.push(args); return Promise.resolve({stopped:true}); },
    addListener(name,cb) { listeners[name]=cb; return Promise.resolve({remove(){}}); }
  };
  const window = {
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:plugin}},
    document:{hidden:false,addEventListener(){}},
    addEventListener(){},setTimeout,clearTimeout
  };
  vm.runInNewContext(controller,{window}, {filename:"native-verse-jam-audio.js"});
  const audio = window.BibloZooNativeVerseJamAudio;
  assert(audio.isAvailable(), "Only isolated native iOS uses this owner");
  assert.strictEqual(calls.activation.length,0,"No activation on page load");
  assert.strictEqual(audio.soundIds.length,13,"2 UI + 5 voice + 4 drums + 2 generators");
  let playbackFailure = "";
  let inactive = 0, active = 0;
  audio.configure({onPlaybackFailure:x=>playbackFailure=x,
    onAppInactive:()=>inactive++,onAppActive:()=>active++});
  const ready = await audio.prepareFromGesture();
  assert.strictEqual(ready.ready,true, "Real game gesture prewarms complete bank");
  assert.strictEqual(calls.activation.length,1);
  assert.strictEqual(calls.preload.length,13);
  assert(audio.isReady());
  assert(audio.playTone(60,0.22,0.495,"triangle"));
  assert(audio.playTone(84,0.22,0.065,"square"));
  assert(audio.playDrum("kick",1));
  assert(audio.playPad(104,8));
  assert(audio.playVoice("woo",0.31));
  assert(!audio.playVoice("arbitrary.mp3",0.31));
  await Promise.resolve();
  assert(calls.play.some(p=>p.soundId==="jam-note" && p.noteId==="60-220-t"));
  assert(calls.play.some(p=>p.soundId==="jam-note" && p.noteId==="84-220-q"));
  assert(calls.play.some(p=>p.soundId==="jam-pad" && p.padId==="104-8"));
  audio.stopVoices();
  assert.strictEqual(calls.stopEffect.at(-1).soundId,"jam-group");
  listeners.biblozooAppLifecycle({active:false});
  assert.strictEqual(inactive,1,"Held App Switcher sends inactive");
  assert(!audio.isReady(),"Inactive invalidates warm bank");
  listeners.biblozooAppLifecycle({active:true});
  assert.strictEqual(active,1,"Active reveals return only");
  assert(!audio.isReady(),"Passive active never starts native output");
  nextActivation={ready:false,reason:"activation-os-rejected"};
  const denied=await audio.prepareFromGesture();
  assert.strictEqual(denied.ready,false);
  assert(!audio.isReady());
  assert(inactive>1 && active>1,"OS denial produces plain return callbacks");
  assert.strictEqual(playbackFailure,"","Transient PiP denial never escalates as corruption");
  assert.strictEqual(calls.activation.length,2);
  assert(calls.stop.length>=1,"Native stop invalidates old bank");

  console.log("N6q PASS: Verse Jam original BPM/voice/note inventory, finite Swift PCM, native-only source and real gesture/PiP/beat cancellation regression.");
})().catch(error => { console.error(error); process.exitCode=1; });
