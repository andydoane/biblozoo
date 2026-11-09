/* N6r isolated native Ghost Writer bridge/asset/recovery regression.
 * Run: node scripts/validate_native_playground_ghost_writer_n6r.js
 * Node verifies code/data and a mocked bridge, never Swift compilation or
 * actual physical iPhone audibility.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const game = read("verse_playground/ghost_writer/game.js");
const owner = read("verse_games/shared/native-ghost-writer-audio.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const index = read("verse_playground/ghost_writer/index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");
const guide = read("docs/N6R-NATIVE-GHOST-WRITER.md");
const assertHas = (body, fragment, why) => assert(body.includes(fragment),why);
const assertMatch = (pattern, body, why) => assert(pattern.test(body),why);

(async () => {
  new vm.Script(game,{filename:"Ghost Writer game.js"});
  new vm.Script(owner,{filename:"native-ghost-writer-audio.js"});
  assert(index.indexOf("native-ghost-writer-audio.js") > 0 &&
    index.indexOf("native-ghost-writer-audio.js") <
    index.indexOf('src="./game.js"'), "Native owner must precede game.js");

  const sounds = ["1","2","3","4","5"];
  assert.deepStrictEqual(
    [...game.matchAll(/ghost_writer_spooky_(\d)\.mp3/g)].map(x=>x[1]),sounds,
    "Game source uses exactly five original spooky recordings");
  assertHas(game,"spookyGapMs","Original 900–1150ms ambient pauses remain");
  assertHas(game,"spookyLastKey","Original no-immediate-repeat bag remains");
  assertHas(game,'spookySounds: "on"',"Original optional Spooky Sounds toggle");
  assertHas(game,"ghostSpooky: 0.34","Original spooky clip mix");
  assertHas(game,"masterVolume: 0.82","Original audio master volume");
  assertHas(game,"uiTap: 0.42","Original shared UI pop mix");
  for (const digit of sounds) {
    const name="ghost_writer_spooky_"+digit+".mp3";
    assert(fs.existsSync(path.join(root,
      "verse_playground/ghost_writer/ghost_writer_sounds",name)),
      "Missing original shipped spooky MP3 " + name);
    assertHas(swift,'"ghost-spooky-'+digit+'": "ghost_writer_spooky_'+digit+'"',
      "Swift must use the same packaged original clip "+digit);
    assertHas(owner,'"ghost-spooky-'+digit+'"',
      "Native bridge must allowlist original spooky clip "+digit);
  }
  for(const digit of ["1","2","3","4","5","6"]) {
    const dormant="ghost_writer_scribble_"+digit+".mp3";
    assert(fs.existsSync(path.join(root,"verse_playground/ghost_writer/ghost_writer_sounds",
      dormant)),"Source asset inventory missing "+dormant);
    assert(!game.includes(dormant), "Scribble MP3 currently dormant, not sound bank");
    assert(!swift.includes('"ghost-scribble-'+digit+'"'),
      "Unused scribble clip must not be added to native bank");
  }
  assertHas(owner,'"ui-pop-1"', "Shared native UI pop 1");
  assertHas(owner,'"ui-pop-2"', "Shared native UI pop 2");
  assertHas(swift,'subdirectory: "public/verse_playground/ghost_writer/ghost_writer_sounds"',
    "Bundle-resident original MP3 folder; no URLs from JS to Swift");
  assertHas(swift,'"ghost-spooky-group"', "Targeted group stop for pause/menu/replay");
  assertHas(swift,'self.preparePCMEffectOnWorker(soundId:soundId,url:url)',
    "All five spooky MP3s must decode into hot PCM bank on serial worker");
  assertMatch(/"ghost-spooky-5"\s*\n\s*\]/,swift,
    "Five allowlisted spooky sources only");
  assert(!owner.includes("AudioContext(") && !owner.includes("new Audio("),
    "Native controller must not output Web/HTML audio");

  assertMatch(/function getAudioContext\(\) \{\s*if \(nativeGhostAudio\) return null/,
    game, "Native must never create Web AudioContext");
  assertMatch(/async function unlockAudio\(\) \{\s*[\s\S]*?if \(nativeGhostAudio\) return nativeGhostAudio\.isReady\(\)/,
    game, "Generic canvas/gesture/focus unlock cannot activate native session");
  assertMatch(/async function loadSoundBuffers\(\) \{\s*if \(nativeGhostAudio\) return false/,
    game, "Never Web fetch/decode native iOS audio");
  assertMatch(/function playGameSound\(key, volumeKey = key\) \{\s*if \(nativeGhostAudio\)/,
    game, "Web sound path must be gated on iOS");
  assertMatch(/function unlockAudioSoon\(\) \{\s*if \(nativeGhostAudio\) return/,
    game,"Canvas strokes may not activate native output");
  assertHas(game,"nativeGhostAudio.playSpooky(key, getSoundVolume(\"ghostSpooky\"))",
    "Only the actual preloaded original spooky key may play");
  assertHas(game,"result.durationMs",
    "Sequential spooky clips use real decoded native duration");
  assertHas(game,"token !== spookySoundToken",
    "Stale note/timeout callbacks cancelled on exit/replay");
  assertHas(game,"getRandomSpookyGapMs()",
    "Original randomized audible gap between completed spooky clips");
  assertHas(game,"nativeGhostAudio.stopSpooky()",
    "Spooky can stop without destroying bank/recording/canvas state");
  assertHas(game,"primeNativeGhostFromGesture(() => startRun(mode)",
    "Mode selection must wait for exact native preflight");
  assertHas(game,"nativeGhostPendingAction",
    "Interrupted pending mode/replay action must remain retryable");
  assertHas(game,"primeNativeGhostFromGesture(replay, \"replay\")",
    "Replay must not start silently after an interruption");
  assertHas(game,"restoreGhostPlaybackFromBackground({ nativeGesture: true })",
    "Resume preserves current character, handwritten glyphs and pause deadline");
  assertHas(game,"nativeOnlyAudio: !!nativeGhostAudio",
    "Plain Welcome Back instead of Zoo Escape on OS interruption");
  assertHas(game,"restoreNativeOnGesture: nativeGhostAudio ? () =>",
    "Only real Let's go gesture may rewarm native PCM");
  assertHas(game,"playgroundWelcome?.pauseFromNativeInactive?.()",
    "Held App Switcher must freeze WebKit-visible handwritten replay");
  assertHas(game,"playgroundWelcome?.showAfterNativeActive?.()",
    "Foreground reveals gesture prompt, never auto-starts");
  assertHas(game,"document.documentElement?.classList?.contains(\"bz-playground-welcome-paused\")",
    "No passive resume while Welcome Back is visible");
  assertHas(game,'spookySounds !== "off"',
    "Muted/Spooky Off replay remains silent by user's choice");
  assertHas(game,"markPlaygroundCompleted?.({",
    "Original completion/reward callback remains, independent of audio");
  assertHas(game,"captureStream(EXPORT_VIDEO.fps)",
    "Preserve canvas video export; this is NOT microphone recording");
  assertHas(game,"ENABLE_PUNCTUATION_RECORDER = false",
    "Don't turn on disabled punctuation drawing tool");
  assertHas(workflow,"validate_native_playground_ghost_writer_n6r.js",
    "CI must run N6r regression on experiment final PR HEAD");
  assertHas(handoff,"N6r","Handoff must be updated every PR");
  assertHas(guide,"iPhone","Dedicated physical-device testing guide required");

  // Mock the actual controller: native isolation, seven original IDs, no
  // activity before gesture, preserved PCM durations, cancellation and PiP.
  const calls={activate:[],preload:[],play:[],stop:[],stopEffect:[]};
  const listeners={};
  let session={ready:true}, failPlay=false;
  const plugin={
    activateFromGesture(args) { calls.activate.push(args); return Promise.resolve(session); },
    preload(args) {
      calls.preload.push(args);
      return Promise.resolve({prepared:true,durationMs:
        args.soundId==="ghost-spooky-3" ? 6500 : 2700});
    },
    play(args) {
      calls.play.push(args);
      return Promise.resolve(failPlay
        ? {accepted:false,reason:"activation-os-rejected"}
        : {accepted:true,durationMs:args.soundId==="ghost-spooky-3"?6500:2700});
    },
    stop(args) { calls.stop.push(args); return Promise.resolve({stopped:true}); },
    stopEffect(args) {
      calls.stopEffect.push(args);
      return Promise.resolve({stopped:true});
    },
    addListener(name,callback) {
      listeners[name]=callback;
      return Promise.resolve({remove(){}});
    }
  };
  const rootWindow={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{
      isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:plugin}
    },
    document:{hidden:false,addEventListener(){}},
    addEventListener(){},setTimeout,clearTimeout
  };
  vm.runInNewContext(owner,{window:rootWindow},
    {filename:"native-ghost-writer-audio.js"});
  const native=rootWindow.BibloZooNativeGhostWriterAudio;
  assert(native.isAvailable(),"Only isolated iOS gets this bridge");
  assert.strictEqual(native.soundIds.length,7,"5 source spooky + 2 shared UI");
  assert.strictEqual(calls.activate.length,0,"No activation on source load");
  const failures=[];
  let inactive=0,active=0;
  native.configure({
    onPlaybackFailure:x=>failures.push(x),
    onAppInactive:()=>inactive++,
    onAppActive:()=>active++
  });
  const prepared=await native.prepareFromGesture({key:"uiTap1",volume:.3444});
  assert.strictEqual(prepared.ready,true,"Gesture must prepare complete bank");
  assert.strictEqual(calls.activate.length,1);
  assert.strictEqual(calls.preload.length,7);
  assert(calls.play.some(x=>x.soundId==="ui-pop-1"),
    "Title/Mode pop must be prepared and dispatched");
  assert(native.isReady(),"Native preflight is ready");
  const first=await native.playSpooky("spooky3",.2788);
  assert.strictEqual(first.accepted,true);
  assert.strictEqual(first.durationMs,6500,
    "Duration must be returned from actual predecoded native buffer");
  assert.strictEqual((await native.playSpooky("scribble1",.2788)).accepted,false,
    "Dormant scribble key must not dispatch");
  assert.strictEqual(calls.play.filter(x=>x.soundId==="ghost-spooky-3").length,1);
  assert.strictEqual(await native.stopSpooky(),true);
  assert.strictEqual(calls.stopEffect.at(-1).soundId,"ghost-spooky-group");
  assert(native.isReady(),"Scoped stop must preserve prepared PCM bank");

  listeners.biblozooAppLifecycle({active:false});
  assert.strictEqual(inactive,1,"UIKit held App Switcher must notify game pause");
  assert(!native.isReady(),"Inactive discards PCM and stale audio callbacks");
  listeners.biblozooAppLifecycle({active:true});
  assert.strictEqual(active,1);
  assert(!native.isReady(),"Passive foreground never activates output");
  session={ready:false,reason:"activation-os-rejected"};
  const denied=await native.prepareFromGesture();
  assert.strictEqual(denied.ready,false);
  assert(!native.isReady(),"Other audio must not be treated as ready");
  assert(inactive>=2 && active>=2,
    "OS priority denial must use ordinary Welcome Back callbacks");
  assert.deepStrictEqual(failures,[],
    "Temporary PiP conflict must not become fatal bridge corruption");

  session={ready:true};
  const again=await native.prepareFromGesture();
  assert.strictEqual(again.ready,true,"Another real tap can recover");
  failPlay=true;
  const rejected=await native.playSpooky("spooky2",.2788);
  assert.strictEqual(rejected.accepted,false);
  assert(!native.isReady(),"Rejected hot native playback invalidates bank");
  assert(inactive>=3 && active>=3,
    "Playback-level competing PiP must pause and prompt again");
  assert.deepStrictEqual(failures,[]);
  console.log("N6r PASS: 5 original Ghost Writer recordings + 2 UI PCM, source silence guards, optional shuffle/gaps, duration-based sequence, scoped stop, gesture-prep, held App Switcher, PiP and no mic/export changes.");
})().catch(err=>{ console.error(err); process.exitCode=1; });
