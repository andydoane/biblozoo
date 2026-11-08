"use strict";
/* N6b: native-only Scripture Snake PCM/orb producer and owner-level VM checks.
 * Linux source tests are NOT Swift compilation or actual audible iPhone output.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const base = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(base, name), "utf8");
const script = read("verse_games/shared/native-snake-audio.js");
const game = read("verse_games/verse_snake/game.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html = read("verse_games/verse_snake/index.html");
const build = read("scripts/build.js");
const returns = read("verse_games/shared/welcome-back-return.js");
const app = read("app.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");

new Function(script);
new Function(game);
const ids = Object.freeze({
  uiTap1: ["ui-pop-1", "ui_sound_pop_1", "ui_audio"],
  uiTap2: ["ui-pop-2", "ui_sound_pop_2", "ui_audio"],
  correctWord: ["snake-correct", "verse_snake_correct", "verse_games/verse_snake/verse_snake_sounds"],
  wrongWord: ["snake-wrong", "verse_snake_wrong", "verse_games/verse_snake/verse_snake_sounds"],
  fruit: ["snake-fruit", "verse_snake_fruit", "verse_games/verse_snake/verse_snake_sounds"],
  boostStart: ["snake-boost", "verse_snake_boost", "verse_games/verse_snake/verse_snake_sounds"],
  bonusStart: ["snake-bonus-start", "verse_snake_bonus_start", "verse_games/verse_snake/verse_snake_sounds"],
  miniSnakeEat: ["snake-eat", "verse_snake_eat", "verse_games/verse_snake/verse_snake_sounds"],
  bonusResult: ["snake-bonus-result", "verse_snake_bonus_result", "verse_games/verse_snake/verse_snake_sounds"],
  orb: ["snake-orb", null, null]
});
for (const [key, [soundId, filename, folder]] of Object.entries(ids)) {
  assert.ok(script.includes(key + ': "' + soundId + '"'), "native JS key "+key);
  if (!filename) continue;
  const gameFile = key === "uiTap1" ? "ui_sound_pop_1.mp3" :
    key === "uiTap2" ? "ui_sound_pop_2.mp3" :
    filename + ".mp3";
  assert.ok(fs.statSync(path.join(base,folder,gameFile)).size > 0,
    "missing packaged native asset " + folder + "/" + gameFile);
  if (key !== "uiTap1" && key !== "uiTap2") {
    assert.ok(swift.includes('"' + soundId + '": "' + filename + '"'),
      "Swift source allowlist " + key);
  }
}
assert.match(swift, /private let snakeSoundResources: \[String: String\]/);
assert.match(swift, /soundId == nativeSnakeOrbSoundID/);
assert.match(swift, /soundId == self\.nativeSnakeOrbSoundID/);
assert.match(swift, /prepareSnakeOrbTonesOnWorker\(/);
assert.match(swift, /private let snakeOrbMidiNotes: \[Int\] = \[72, 74, 76, 79, 81, 84\]/);
assert.match(swift, /snakeOrbToneBuffers\[requestedNoteIndex \?\? -1\]/);
assert.match(swift, /subdirectory: "public\/verse_games\/verse_snake\/verse_snake_sounds"/);
assert.match(swift, /purpose == "learn" \|\| purpose == "game"/);
assert.match(swift, /self\.pcmEffectIDs\.contains\(soundId\)/);
assert.match(swift, /self\.discardEffectsOnWorker\(\)/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g, ""),
  /setCategory\(|setMode\(/);
assert.match(build, /"verse_games"/);
assert.match(html, /shared\/native-snake-audio\.js/);
assert.ok(html.indexOf("native-snake-audio.js") < html.indexOf('src="./game.js"'));
assert.match(game, /primeSnakeAudioAndContinue\("round", muted \? null : nextUiTapKey\(\)\)/);
assert.match(game, /primeSnakeAudioAndContinue\("resume", nextUiTapKey\(\)\)/);
assert.match(game, /onAppInactive: \(\) =>/);
assert.match(game, /onAppActive: \(\) =>/);
assert.match(game, /snakeWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game, /snakeWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(returns, /function pauseFromNativeInactive\(\)/);
assert.match(returns, /function showAfterNativeActive\(\)/);
assert.match(game, /!nativeSnakeAudio\.isReady\(\)/);
assert.match(game, /nativeSnakeAudio\.prepareFromGesture\(\)/);
assert.match(game, /nativeSnakeAudio\.play\("orb"/);
assert.match(game, /if \(nativeSnakeAudio\) void nativeSnakeAudio\.stop\(\)/);
assert.match(game, /useZooEscape: !nativeSnakeAudio/);
assert.match(returns, /useZooEscape = true/);
assert.match(returns, /if \(useZooEscape && root\.BibloZooZooEscape\?\.create\)/);
assert.match(game, /renderModeSelect\(\)/);
// N6b.1 owner UX cleanup: normal preparation must never open gray modal.
assert.doesNotMatch(game, /"Getting native game sounds ready/);
assert.match(game, /if \(nativeSnakeGatePending\) return/);
assert.match(game, /app\.setAttribute\("aria-busy", "true"\)/);
assert.match(game, /hideNativeSnakeGate\(\); \/\/ close a previous \*failure\* dialog/);
assert.match(game, /"Sound was paused while you were away/);
assert.match(game, /if \(nativeSnakeAudio\) return Promise\.resolve\(nativeSnakeAudio\.isReady\(\)\)/);
assert.doesNotMatch(script, /new Audio\(|\.createOscillator\(|\.createBufferSource\(|\.src\s*=/);
assert.doesNotMatch(app, /id="verseDetailListenStatus"/,
  "Owner-requested visible N6a Verse Detail text must be removed");
assert.match(app, /Stop Listening/);
assert.match(app, /window\.BibloZooNativeLearnListen\.startFromGesture\(\{/);
assert.match(workflow, /validate_native_snake_effects_n6b\.js/);
assert.match(handoff, /N6b/);

function fixture({ nativeOnly = true, ios = true, activationOk = true,
  failPreload = "", failPlay = "", pendingPreloads = false } = {}) {
  const calls = [], listeners = {}, failures = [], inactive = [], active = [];
  const queue = [];
  let held = null;
  const doc = {
    hidden: false,
    addEventListener(name,fn) { listeners["document:"+name] = fn; }
  };
  const bridge = {
    activateFromGesture(input) {
      calls.push(["activate",input]);
      return Promise.resolve({ready:activationOk,reason:activationOk?"not-needed":"denied"});
    },
    preload(input) {
      calls.push(["preload",input]);
      if (pendingPreloads) {
        let finish;
        const promise = new Promise(resolve => { finish = resolve; });
        queue.push(() => finish({
          prepared:true,durationMs:120,reason:"prepared"
        }));
        return promise;
      }
      return Promise.resolve({
        prepared:input.soundId !== failPreload,
        durationMs:input.soundId === failPreload ? 0 : 120,
        reason:input.soundId === failPreload ? "bundled-asset-missing" : "prepared"
      });
    },
    play(input) {
      calls.push(["play",input]);
      return Promise.resolve({accepted:input.soundId !== failPlay,
        reason:input.soundId === failPlay ? "pcm-not-preloaded" : "scheduled"});
    },
    stop(input) {
      calls.push(["stop",input]);
      return Promise.resolve({stopped:true});
    },
    addListener(name,callback) {
      listeners[name] = callback;
      return Promise.resolve({remove(){}});
    }
  };
  const window = {
    document:doc, BibloZooNativeOnlyOutput:{enabled:nativeOnly},
    Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooNativeSound:bridge}},
    setTimeout,clearTimeout,
    addEventListener(name,callback) { listeners["window:"+name] = callback; }
  };
  vm.runInNewContext(script,{window,Promise,Date,console,Error});
  const audio = window.BibloZooNativeSnakeAudio;
  audio.configure({
    onPlaybackFailure:r=>failures.push(r),
    onAppInactive:()=>inactive.push(true),
    onAppActive:()=>active.push(true)
  });
  return {audio,calls,listeners,doc,queue,failures,inactive,active,
    releasePreloads() {queue.splice(0).forEach(fn=>fn());}};
}
const tick = () => new Promise(ok=>setImmediate(ok));
async function flush() { await tick(); await tick(); }
async function testNativeEffects() {
  const h=fixture();
  assert.equal(h.audio.isAvailable(),true);
  const priming=h.audio.prepareFromGesture();
  assert.equal(h.calls[0][0],"activate",
    "Swift activation must be invoked synchronously in genuine mode tap");
  assert.equal(h.calls[0][1].purpose,"game");
  assert.equal((await priming).ready,true);
  assert.equal(h.audio.isReady(),true);
  assert.equal(h.calls.filter(c=>c[0]==="preload").length,10);
  assert.equal(new Set(h.calls.filter(c=>c[0]==="preload").map(c=>c[1].soundId)).size,10);
  assert.equal(h.audio.play("fruit",0.7),true);
  assert.equal(h.audio.play("correctWord",0.78),true);
  assert.equal(h.audio.play("wrongWord",0.72),true);
  assert.equal(h.audio.play("boostStart",0.7),true);
  assert.equal(h.audio.play("bonusStart",0.78),true);
  assert.equal(h.audio.play("miniSnakeEat",0.62),true);
  assert.equal(h.audio.play("bonusResult",0.78),true);
  assert.equal(h.audio.play("orb",0.13,3),true);
  assert.equal(h.audio.play("uiTap1",0.55),true);
  assert.equal(h.audio.play("uiTap2",0.55),true);
  assert.equal(h.audio.play("orb",0.13,6),false);
  assert.equal(h.audio.play("../bad",0.7),false);
  assert.equal(h.audio.play("fruit",1.9),false);
  await flush();
  const plays=h.calls.filter(c=>c[0]==="play").map(c=>c[1]);
  assert.equal(plays.length,10);
  assert.equal(plays[0].soundId,"snake-fruit");
  assert.equal(plays[7].soundId,"snake-orb");
  assert.equal(plays[7].noteIndex,3);
  assert.ok(plays.every(c=>c.volume>=0&&c.volume<=1 &&
    typeof c.eventId==="string" && c.eventId.startsWith("snake-")));
  assert.equal(h.failures.length,0);
  h.listeners.biblozooAppLifecycle?.({active:false});
  await flush();
  assert.equal(h.inactive.length,1,"UIKit held App Switcher must pause physics");
  assert.equal(h.audio.isReady(),false);
  assert.equal(h.audio.play("fruit",0.7),false);
  h.listeners.biblozooAppLifecycle?.({active:true});
  assert.equal(h.active.length,1,
    "return may display Welcome Back but never auto-start audio");
  assert.equal(h.calls.filter(c=>c[0]==="activate").length,1,
    "foreground must not auto-reactivate");
  const retry=h.audio.prepareFromGesture(); // actual Let's go / retry gesture
  assert.equal(h.calls.filter(c=>c[0]==="activate").length,2);
  assert.equal((await retry).ready,true);
}
async function testFailuresAndStale() {
  {
    const h=fixture({activationOk:false});
    const outcome=await h.audio.prepareFromGesture();
    assert.equal(outcome.ready,false);
    assert.equal(h.calls.filter(c=>c[0]==="preload").length,0);
    assert.equal(h.audio.play("fruit",0.7),false);
  }
  {
    const h=fixture({failPreload:"snake-wrong"});
    const outcome=await h.audio.prepareFromGesture();
    assert.equal(outcome.ready,false,"one missing clip refuses entire round");
    assert.equal(outcome.reason,"bundled-asset-missing");
    assert.equal(h.audio.isReady(),false);
    assert.ok(h.calls.some(c=>c[0]==="stop"));
    assert.equal(h.calls.some(c=>c[0]==="play"),false);
  }
  {
    const h=fixture({failPlay:"snake-fruit"});
    assert.equal((await h.audio.prepareFromGesture()).ready,true);
    h.audio.play("fruit",0.7);
    await flush();
    assert.equal(h.failures.length,1);
    assert.equal(h.audio.isReady(),false);
    assert.ok(h.calls.some(c=>c[0]==="stop"));
  }
  {
    const h=fixture({pendingPreloads:true});
    const promise=h.audio.prepareFromGesture();
    await flush();
    assert.equal(h.calls.filter(c=>c[0]==="preload").length,10);
    await h.audio.stop(); // background before any native worker response
    h.releasePreloads();
    assert.equal((await promise).ready,false);
    assert.equal(h.audio.isReady(),false);
    assert.equal(h.calls.some(c=>c[0]==="play"),false);
  }
  {
    const h=fixture({ios:false,nativeOnly:false});
    assert.equal(h.audio.isAvailable(),false);
    assert.equal((await h.audio.prepareFromGesture()).ready,false);
    assert.equal(h.audio.play("fruit",0.7),false);
    assert.equal(h.calls.length,0);
  }
}
async function testGameOwnerNativeBranch() {
  function section(a,b) {
    const start=game.indexOf(a),end=game.indexOf(b,start+a.length);
    assert.ok(start>=0&&end>start,"can't find Snake owner "+a);
    return game.slice(start,end);
  }
  const src = section("  function playGameSound(key, volumeScale = 1) {",
    "  function midiToFreq(note) {") +
    section("  function playOrbTone(sizeRatio = 0.25) {",
      "  function nextUiTapKey() {");
  const plays=[];
  const h={
    muted:false,returnPaused:false,completed:false,
    state:{running:true,paused:false},
    nativeSnakeAudio:{play(...args){plays.push(args);return true;}},
    SOUND_VOLUMES:{fruit:.7,correctWord:.78,wrongWord:.72,uiTap1:.55},
    ORB_TUNING:{minSizeHeadRatio:.10,maxSizeHeadRatio:.50},
    ORB_TONE_TUNING:{volume:.115,notes:[72,74,76,79,81,84]},
    orbToneIndex:0,clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),
    getAudioContext(){throw Error("Web Audio must not run on native path");},
    console
  };
  vm.createContext(h);
  vm.runInContext(src+"\nthis.test={playGameSound,playOrbTone};",h);
  h.test.playGameSound("fruit");
  h.test.playGameSound("correctWord");
  h.test.playOrbTone(.25);
  assert.equal(plays.length,3);
  assert.equal(plays[0][0],"fruit");
  assert.equal(plays[0][1],.7);
  assert.equal(plays[2][0],"orb");
  assert.equal(plays[2][2],0);
  assert.ok(plays[2][1]>.11 && plays[2][1]<.16);
  h.state.paused=true;
  h.test.playGameSound("fruit");h.test.playOrbTone(.25);
  assert.equal(plays.length,3,"menu or Welcome Back must stop hot cues");
  h.state.paused=false;h.muted=true;
  h.test.playGameSound("fruit");
  assert.equal(plays.length,3);
  h.muted=false;h.returnPaused=true;
  h.test.playGameSound("fruit");h.test.playOrbTone(.25);
  assert.equal(plays.length,3);
  h.returnPaused=false;h.state.running=false;
  h.test.playGameSound("fruit");
  assert.equal(plays.length,3,"never sound a nonexistent round");
  h.test.playGameSound("uiTap1");
  assert.equal(plays.length,4,"a previously warmed UI pop can still fire");
}
(async()=>{
  await testNativeEffects();
  await testFailuresAndStale();
  await testGameOwnerNativeBranch();
  console.log("N6b Scripture Snake: published local effects, native PCM/orb bank, gesture-only preflight, correct events, mute/menu/inactive/stop, no Web/Zoo fallback, stale protection and Detail cleanup passed.");
})().catch(err=>{console.error(err);process.exitCode=1;});
