"use strict";
/* N6b.1 — the N6b native sample gate is failure-only, not a routine popup.
 * Exercise the actual Snake owner functions in an isolated JS VM. This
 * source/VM gate cannot prove Swift compiles or that sound is heard on iPhone.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const base = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(base, "verse_games/verse_snake/game.js"), "utf8");
const native = fs.readFileSync(path.join(base, "verse_games/shared/native-snake-audio.js"), "utf8");
const workflow = fs.readFileSync(path.join(base, ".github/workflows/ios-prep-validation.yml"), "utf8");
const handoff = fs.readFileSync(path.join(base, "docs/PROJECT-HANDOFF.md"), "utf8");

new Function(game);
assert.doesNotMatch(game, /Getting native game sounds ready/, "routine gray popup must be removed");
assert.match(game, /function abandonNativeSnakePreflight\(\)/);
assert.match(game, /function showNativeSnakeGate\(message, canRetry = false\)/);
assert.match(game, /if \(nativeSnakeGatePending\) return/);
assert.match(game, /if \(nativeSnakeAudio && nativeSnakeGatePending\) return/);
assert.match(game, /function renderIntroScreen\(\)\{\s*abandonNativeSnakePreflight\(\)/);
assert.match(game, /function renderModeSelect\(\)\{\s*abandonNativeSnakePreflight\(\)/);
assert.match(game, /app\.setAttribute\("aria-busy", "true"\)/);
assert.match(game, /app\.removeAttribute\("aria-busy"\)/);
assert.match(game, /Sound was interrupted before the round began\. Tap Try Again/);
assert.match(game, /onAppInactive: \(\) =>/);
assert.match(game, /snakeWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game, /useZooEscape: !nativeSnakeAudio/);
assert.match(native, /activateFromGesture\(\{ purpose: "game" \}\)/);
assert.match(native, /preload\(\{ soundId \}\)/);
assert.match(native, /if \(!current\(token\)\)/);
assert.doesNotMatch(native, /new Audio\(|createOscillator\(/);
assert.match(workflow, /validate_native_snake_quiet_preflight_n6b1\.js/);
assert.match(handoff, /N6b\.1/);

const start = game.indexOf("  let nativeSnakeGateSerial = 0;");
const end = game.indexOf("  function helpHtml(){", start);
assert.ok(start >= 0 && end > start, "must exercise real Snake gate/preflight source");
const source = game.slice(start, end);

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const calls = [];
  const prepares = [];
  const buttons = {
    "[data-snake-native-status]": { textContent: "" },
    "[data-snake-native-retry]": { hidden: false, disabled: false, onclick: null },
    "[data-snake-native-exit]": { textContent: "", onclick: null }
  };
  const listeners = {};
  let gate = null;
  const doc = {
    hidden: false, body: {
      appendChild(node) { gate = node; }
    },
    createElement() {
      return {
        id: "", className: "", innerHTML: "",
        querySelector(query) { return buttons[query] || null; },
        remove() { gate = null; }
      };
    },
    getElementById(id) { return id === "vslNativeAudioGate" ? gate : null; },
    addEventListener(event, callback) { listeners[event] = callback; }
  };
  const appAttrs = new Map();
  const app = {
    setAttribute(k, v) { appAttrs.set(k, v); },
    removeAttribute(k) { appAttrs.delete(k); }
  };
  const state = { running: false, paused: false };
  let configured;
  const snake = {
    configure(config) { configured = config; },
    prepareFromGesture() {
      calls.push("activate-from-gesture");
      const request = deferred();
      prepares.push(request);
      return request.promise;
    },
    stop() { calls.push("native-stop");return Promise.resolve(); },
    isReady() { return false; }
  };
  const ctx = {
    console, Promise, document: doc, app, nativeSnakeAudio: snake,
    window: { VerseGameBridge: {
      exitGame() { calls.push("game-exit"); }
    }},
    state, returnPaused: false, muted: false, completed: false,
    renderGameScreen() { calls.push("render-game"); },
    renderModeSelect() { calls.push("render-mode"); },
    stopLoop() { calls.push("stop-loop"); },
    setPaused(paused, reason) { state.paused = paused; calls.push("paused:"+paused+":"+reason); },
    pauseForTaskSwitch() { calls.push("pause-for-task-switch");state.paused = true; }
  };
  vm.createContext(ctx);
  vm.runInContext(source + "\nthis.exercise = {primeSnakeAudioAndContinue, abandonNativeSnakePreflight, showNativeSnakeGate, hideNativeSnakeGate, getPending:()=>nativeSnakeGatePending, getRetry:()=>nativeSnakeRetryMode, setWelcomeBack(v){snakeWelcomeBack=v}};",ctx);
  return {
    calls, prepares, doc, appAttrs, buttons, listeners, state,
    snake, ctx, get gate(){return gate;}, ex:ctx.exercise,
    get callback(){return configured;}
  };
}
async function settle() {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}

async function successfulFirstStartIsQuiet() {
  const h=fixture();
  h.ex.primeSnakeAudioAndContinue("round");
  assert.equal(h.calls[0],"activate-from-gesture",
    "real tap synchronously starts native preflight");
  assert.equal(h.gate,null,"no gray dialog on difficulty selection");
  assert.equal(h.appAttrs.get("aria-busy"),"true");
  assert.equal(h.calls.includes("render-game"),false,"no premature gameplay");
  h.ex.primeSnakeAudioAndContinue("round");
  assert.equal(h.prepares.length,1,"double taps must not start multiple banks");
  h.prepares[0].resolve({ready:true,reason:"prepared"});
  await settle();
  assert.equal(h.gate,null,"successful preflight never shows gray popup");
  assert.equal(h.appAttrs.has("aria-busy"),false);
  assert.equal(h.calls.filter(x=>x==="render-game").length,1,
    "only verified native-ready result enters game");
}
async function successfulResumeIsQuiet() {
  const h=fixture();
  h.state.running=true;
  h.state.paused=true;
  h.ex.primeSnakeAudioAndContinue("resume");
  assert.equal(h.gate,null,"no extra modal after menu/Welcome Back");
  assert.equal(h.state.paused,true,"physics stays paused during preflight");
  h.prepares[0].resolve({ready:true});
  await settle();
  assert.equal(h.gate,null);
  assert.equal(h.state.paused,false,"same round continues when native bank ready");
  assert.equal(h.calls.some(x=>x==="render-game"),false,
    "resume must not reset game/scores");
}
async function genuineFailureHasTryAgain() {
  const h=fixture();
  h.ex.primeSnakeAudioAndContinue("round");
  h.prepares[0].resolve({ready:false,reason:"bundled-asset-missing"});
  await settle();
  assert.ok(h.gate,"actual native refusal must show retry");
  assert.match(h.buttons["[data-snake-native-status]"].textContent,/Native sound isn't ready/);
  assert.equal(h.buttons["[data-snake-native-retry]"].hidden,false);
  assert.equal(h.appAttrs.has("aria-busy"),false);
  assert.equal(h.calls.includes("render-game"),false);
  h.buttons["[data-snake-native-retry]"].onclick(); // genuine retry tap
  assert.equal(h.gate,null,"gray failure dialog closes during retry preparation");
  assert.equal(h.prepares.length,2);
  assert.equal(h.appAttrs.get("aria-busy"),"true");
  h.prepares[1].resolve({ready:true});
  await settle();
  assert.equal(h.gate,null);
  assert.equal(h.calls.filter(x=>x==="render-game").length,1);
}
async function playbackFailureStillPausesSameRound() {
  const h=fixture();
  h.state.running=true;
  h.state.paused=false;
  h.callback.onPlaybackFailure("pcm-not-preloaded");
  assert.equal(h.state.paused,true);
  assert.ok(h.gate,"actual playing failure retains clear Try Again");
  assert.equal(h.ex.getRetry(),"resume");
  h.buttons["[data-snake-native-retry]"].onclick();
  h.prepares[0].resolve({ready:true});
  await settle();
  assert.equal(h.gate,null);
  assert.equal(h.state.paused,false);
  assert.equal(h.calls.includes("render-game"),false);
}
async function canceledPreflightsNeverPopOrAutoStart() {
  {
    const h=fixture();
    h.ex.primeSnakeAudioAndContinue("round");
    h.ex.abandonNativeSnakePreflight(); // Back or new difficulty screen
    assert.equal(h.ex.getPending(),false);
    assert.equal(h.appAttrs.has("aria-busy"),false);
    assert.ok(h.calls.includes("native-stop"));
    h.prepares[0].resolve({ready:true});
    await settle();
    assert.equal(h.gate,null);
    assert.equal(h.calls.includes("render-game"),false,
      "late preload after navigation must not launch Snake");
  }
  {
    const h=fixture();
    h.ex.primeSnakeAudioAndContinue("round");
    h.callback.onAppInactive(); // UIKit inactive even while WebKit visible
    assert.equal(h.ex.getPending(),false);
    assert.equal(h.appAttrs.has("aria-busy"),false);
    h.prepares[0].resolve({ready:false,reason:"stale"});
    await settle();
    assert.equal(h.gate,null,"task switch during start never raises gray error");
    h.callback.onAppActive();
    assert.equal(h.prepares.length,1,"no automatic foreground activation");
    h.ex.primeSnakeAudioAndContinue("round"); // deliberate new difficulty tap
    assert.equal(h.prepares.length,2);
    h.prepares[1].resolve({ready:true});
    await settle();
    assert.equal(h.calls.filter(x=>x==="render-game").length,1);
  }
  {
    const h=fixture();
    h.ex.primeSnakeAudioAndContinue("round");
    h.doc.hidden=true;
    h.listeners.visibilitychange();
    assert.equal(h.appAttrs.has("aria-busy"),false);
    h.prepares[0].resolve({ready:false,reason:"stale"});
    await settle();
    h.doc.hidden=false;
    h.listeners.visibilitychange();
    assert.equal(h.gate,null,"no new gray dialog on foreground after interrupted preflight");
    assert.equal(h.prepares.length,1,"return cannot automatically call native");
  }
  {
    const h=fixture();
    h.state.running=true;
    let paused=0,shown=0;
    h.ex.setWelcomeBack({
      pauseFromNativeInactive(){paused++;return true;},
      showAfterNativeActive(){shown++;return true;}
    });
    h.callback.onAppInactive();
    h.callback.onAppActive();
    assert.equal(paused,1);
    assert.equal(shown,1,"plain Welcome Back, not gray preflight dialog");
    assert.equal(h.gate,null);
    assert.equal(h.prepares.length,0,"UIKit return never primes native automatically");
  }
}
(async()=>{
  await successfulFirstStartIsQuiet();
  await successfulResumeIsQuiet();
  await genuineFailureHasTryAgain();
  await playbackFailureStillPausesSameRound();
  await canceledPreflightsNeverPopOrAutoStart();
  console.log("N6b.1: successful Snake difficulty/menu/Welcome Back preflights are quiet; duplicate/Back/task-switch stale gestures blocked; real native failure Try Again preserved; no foreground autoplay.");
})().catch(error=>{console.error(error);process.exitCode=1;});
