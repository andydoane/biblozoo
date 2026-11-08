"use strict";
/* N6c.1 — actual native Snake/Bible Bugs controller VM, NOT speaker proof.
 * Real iPhone hearing/Xcode remain owner acceptance gates.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const bugsGame = read("verse_games/bible_bugs/game.js");
const snakeGame = read("verse_games/verse_snake/game.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");
const gameSources = [
  { name: "bugs", game: bugsGame, controller: "verse_games/shared/native-bible-bugs-audio.js",
    exported: "BibloZooNativeBibleBugsAudio", effect: "tongue", id: "bugs-tongue", count: 14 },
  { name: "snake", game: snakeGame, controller: "verse_games/shared/native-snake-audio.js",
    exported: "BibloZooNativeSnakeAudio", effect: "fruit", id: "snake-fruit", count: 16 }
];
assert.match(workflow, /validate_native_standalone_ui_pops_n6c1\.js/);
assert.match(handoff, /N6c\.1/);
assert.match(bugsGame, /nativeBugsAudio\.tapUiFromGesture\(key, soundVolume\("uiTap"\)\)/);
assert.match(bugsGame, /primeBibleBugsFromGesture\("round", mode,/);
assert.match(bugsGame, /primeBibleBugsFromGesture\("resume", null, nextUiTapKey\(\)\)/);
assert.match(snakeGame, /nativeSnakeAudio\.tapUiFromGesture\(key,/);
assert.match(snakeGame, /primeSnakeAudioAndContinue\("round", muted \? null : nextUiTapKey\(\)\)/);
assert.match(snakeGame, /primeSnakeAudioAndContinue\("resume", nextUiTapKey\(\)\)/);
for (const [key, game] of [["bugs", bugsGame], ["snake", snakeGame]]) {
  new Function(game);
  assert.doesNotMatch(game, /Getting native game sounds ready/);
}
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };

function fixture(config, { holdFirstUi = false, missing = "", rejectPop = false, ios = true } = {}) {
  const source = read(config.controller);
  new Function(source);
  assert.doesNotMatch(source, /new Audio\(|createOscillator\(|createBufferSource\(/);
  assert.match(source, /activateFromGesture\(\{purpose:"ui"\}\)/);
  assert.match(source, /activateFromGesture\(\{ purpose: "game" \}\)/);
  const calls = [], callbacks = {}, held = [], warm = new Set();
  let holding = holdFirstUi;
  const document = {hidden:false,addEventListener(name,cb){callbacks["doc:"+name]=cb;}};
  const bridge = {
    activateFromGesture(arg) {calls.push(["activate",arg.purpose]);return Promise.resolve({ready:true});},
    preload(arg) {
      calls.push(["preload",arg.soundId]);
      const result = {prepared:arg.soundId!==missing,durationMs:arg.soundId===missing?0:120};
      if (holding && arg.soundId.startsWith("ui-pop-")) {
        return new Promise(resolve=>held.push(()=>{if(result.prepared)warm.add(arg.soundId);resolve(result);}));
      }
      if(result.prepared)warm.add(arg.soundId);
      return Promise.resolve(result);
    },
    play(arg) {
      calls.push(["play",arg.soundId,arg.volume]);
      return Promise.resolve({accepted:!rejectPop && warm.has(arg.soundId)});
    },
    stop(arg) {calls.push(["stop",arg.soundId]);warm.clear();return Promise.resolve({stopped:true});},
    addListener(name,cb) {callbacks[name]=cb;return Promise.resolve({remove(){}});}
  };
  const window = {
    document,Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooNativeSound:bridge}},
    BibloZooNativeOnlyOutput:{enabled:true},setTimeout,clearTimeout,
    addEventListener(name,cb){callbacks["win:"+name]=cb;}
  };
  vm.runInNewContext(source,{window,Promise,Date,Error,console});
  return {api:window[config.exported],calls,callbacks,document,
    release(){holding=false;held.splice(0).forEach(fn=>fn());}};
}
async function checks(config) {
  const h=fixture(config);
  assert.equal(h.api.play(config.effect,.5),false,"no unprepared gameplay audio");
  assert.equal(h.api.tapUiFromGesture("uiTap1",.32),true);
  assert.deepEqual(h.calls[0],["activate","ui"],"early title activates in real tap");
  await flush();
  assert.deepEqual(h.calls.filter(x=>x[0]==="preload").map(x=>x[1]),
    ["ui-pop-1","ui-pop-2"],"title only prepares two UI IDs");
  assert.equal(h.api.isReady(),false,"title UI pop never certifies game readiness");
  assert.deepEqual(h.calls.filter(x=>x[0]==="play").map(x=>x[1]),["ui-pop-1"]);
  assert.equal(h.api.tapUiFromGesture("uiTap2",.32),true);
  await flush();
  assert.equal(h.calls.filter(x=>x[0]==="play").at(-1)[1],"ui-pop-2");

  await h.api.stop();
  assert.equal(h.api.isReady(),false);
  const before=h.calls.length;
  const mode=h.api.prepareFromGesture({key:"uiTap1",volume:.32});
  assert.deepEqual(h.calls[before],["activate","game"],"mode activates synchronously");
  assert.equal((await mode).ready,true);
  const recent=h.calls.slice(before);
  const popAt=recent.findIndex(x=>x[0]==="play"&&x[1]==="ui-pop-1");
  const effectAt=recent.findIndex(x=>x[0]==="preload"&&x[1]===config.id);
  assert.ok(popAt>=0 && effectAt>popAt,"mode pop must schedule before game effect decoding");
  assert.equal(recent.filter(x=>x[0]==="preload").length,config.count);
  assert.equal(h.api.isReady(),true,"only full bank permits gameplay");
  assert.equal(h.api.play(config.effect,.6),true);
  await flush();
  await h.api.stop();
  const stoppedPlayCount=h.calls.filter(x=>x[0]==="play").length;
  assert.equal(h.api.play(config.effect,.6),false);
  assert.equal(h.calls.filter(x=>x[0]==="play").length,stoppedPlayCount);

  const raced=fixture(config,{holdFirstUi:true});
  assert.equal(raced.api.tapUiFromGesture("uiTap1",.2),true);
  await flush();
  assert.equal(raced.calls.filter(x=>x[0]==="preload").length,2);
  const next=raced.api.prepareFromGesture({key:"uiTap2",volume:.2});
  assert.equal(raced.calls.filter(x=>x[0]==="activate").at(-1)[1],"game");
  raced.release();
  assert.equal((await next).ready,true);
  await flush();
  assert.deepEqual(raced.calls.filter(x=>x[0]==="play"&&x[1].startsWith("ui-pop-"))
    .map(x=>x[1]),["ui-pop-2"],"old screen pop cannot fire after mode tap");

  const inactive=fixture(config,{holdFirstUi:true});
  inactive.api.tapUiFromGesture("uiTap1",.2);
  await flush();
  inactive.callbacks.biblozooAppLifecycle({active:false});
  inactive.release();await flush();
  assert.equal(inactive.calls.filter(x=>x[0]==="play").length,0,
    "UIKit inactive cancels delayed title pop even when WebKit is visible");
  inactive.callbacks.biblozooAppLifecycle({active:true});
  assert.equal(inactive.calls.filter(x=>x[0]==="activate").length,1,
    "foreground never activates automatically");

  const missing=fixture(config,{missing:"ui-pop-2"});
  assert.equal((await missing.api.prepareFromGesture({key:"uiTap1",volume:.3})).ready,false);
  assert.equal(missing.api.isReady(),false);
  assert.equal(missing.calls.filter(x=>x[0]==="play").length,0,
    "a failed UI bank does not silently launch the game");
  const web=fixture(config,{ios:false});
  assert.equal(web.api.tapUiFromGesture("uiTap1",.3),false);
  assert.equal((await web.api.prepareFromGesture({key:"uiTap1",volume:.3})).ready,false);
  assert.equal(web.calls.length,0,"Web/Android does not reach native bridge");
}
(async()=>{
  for(const config of gameSources) await checks(config);
  console.log("N6c.1 two-game native title and mode UI PCM: gesture activation, UI-only readiness, ordered mode pop before full bank, stale/held-switch cancellation, strict failure, no Web fallback PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
