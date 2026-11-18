"use strict";
// R13 / PLAY-02: execute actual Ghost Writer mode-select and native
// preparation dialog controllers. No fabricated audio/device evidence.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const game = read("verse_playground/ghost_writer/game.js");
const shell = read("verse_games/shared/game-shell.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
assert(workflow.includes("node scripts/validate_r13_ghost_writer_mode_preparing_flash.js"),
  "R13 regression belongs in integration GitHub Actions");
assert(shell.includes("renderModeSelect({") &&
  shell.includes("onSelect(btn.dataset.gameShellMode)"),
  "shared shell keeps original child mode selection gesture");
assert(game.includes("const NATIVE_PREPARING_DEFER_MS = 350"),
  "R13 distinguishes fast preparation from genuinely slow operations");
assert(game.includes("const preparation = nativeGhostAudio.prepareFromGesture(uiTap);"),
  "native activation stays inside actual child gesture, before any delay");
assert(game.includes("deferNativeGhostPreparing(token);"),
  "only the visual loading dialog is delayed");
assert(game.includes("onAppInactive: () => {") &&
  game.includes("pauseGhostPlaybackForBackground();\n        clearNativeGhostPreparing();"),
  "UIKit inactivity cancels delayed loading, preserving the Welcome Back");
assert(game.includes("if (nativeGhostPendingAction) {") &&
  game.includes("nativeGhostPreflightGeneration++"),
  "existing Welcome Back pending-action retry remains guarded");
assert(game.includes("showNativeGhostFailure(label);"),
  "real sound denial still offers its existing retryable failure");
assert(game.includes("NATIVE_TEMPORARY.has(result?.reason)"),
  "other-audio/PiP temporary denials continue to Welcome Back");
assert(!game.includes("window.AudioContext("),
  "do not add WebAudio fallback on native Ghost Writer");

function slice(begin, end) {
  const a = game.indexOf(begin), b = game.indexOf(end, a + begin.length);
  assert(a >= 0 && b > a, "missing real game function: " + begin);
  return game.slice(a,b);
}
const dialogs = slice("  function clearNativeGhostPreparing() {",
  "  if (nativeGhostAudio) {\n    nativeGhostAudio.configure({");
const mode = slice("  function renderModeSelect() {", "  function startRun(mode) {");
assert(dialogs.includes("function showNativeGhostPreparing()"));
assert(dialogs.includes("function showNativeGhostFailure("));
assert(dialogs.includes("function primeNativeGhostFromGesture("));
assert(mode.includes("primeNativeGhostFromGesture(() => startRun(mode), \"start\")"));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => {resolve=yes; reject=no;});
  return {promise, resolve, reject};
}
const flush = async () => {for (let i=0;i<8;i++)await Promise.resolve();};
function harness() {
  const elements = new Map();
  const timers = new Map();
  let nextTimer=0, nextPreparation=null;
  const calls = {prepare:[],start:[],tap:[],stop:0,exit:0,
    intro:0, modeUi:0, pause:0, showReturn:0, ui:0};
  const document = {
    hidden:false, body:{
      appendChild(node) {elements.set(node.id,node);node.isConnected=true;}
    },
    createElement(tag) {
      const buttons = new Map();
      return {
        tagName:tag, id:"",innerHTML:"",style:{cssText:""},isConnected:false,
        querySelector(selector) {
          if (!buttons.has(selector)){
            let handler=null;
            buttons.set(selector,{
              addEventListener(event,fn){if(event==="click")handler=fn;},
              click(){handler?.();},focus(){this.focused=true;}
            });
          }
          return buttons.get(selector);
        },
        remove() {elements.delete(this.id);this.isConnected=false;}
      };
    },
    getElementById(id) {return elements.get(id)||null;}
  };
  const native = {
    ready:false,
    isReady(){return this.ready;},
    prepareFromGesture(uiTap) {
      calls.prepare.push(uiTap);
      const result=nextPreparation;
      nextPreparation=null;
      return result || Promise.resolve({ready:false,reason:"native-error"});
    },
    tapUiFromGesture(...args){calls.tap.push(args);},
    stop(){calls.stop++;this.ready=false;return Promise.resolve();}
  };
  let modeOptions=null;
  const sandbox = {
    document, window:{}, Promise, Set, console,
    setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,delay});return id;},
    clearTimeout(id){timers.delete(id);},
    nativeGhostAudio:native, muted:false,
    NATIVE_TEMPORARY:new Set(["other-audio-playing","interruption-pending",
      "activation-os-rejected","gesture-required-after-interruption"]),
    bridge(){return {exitGame(){calls.exit++;}};},
    getSoundVolume(){return 0.42;},
    nativeUiTapKey(){return "uiTap1";},
    playgroundWelcome:{
      pauseFromNativeInactive(){calls.pause++;},
      showAfterNativeActive(){calls.showReturn++;}
    },
    restoreGhostPlaybackFromBackground(){throw Error("retry unexpectedly lost mode action");},
    stopPlayback(){},clearGuideTimer(){},
    app:{classList:{add(){}},innerHTML:""},
    shell(){return {renderModeSelect(opts){modeOptions=opts;}};},
    playUiTapSound(){calls.ui++;},
    renderIntro(){calls.intro++;},
    startRun(selected){calls.start.push(selected);}
  };
  const prefix = [
    "let nativeGhostPreflightGeneration = 0;",
    "let nativeGhostPreflightPending = false;",
    "let nativeGhostPendingAction = null;",
    "let nativeGhostPreparingTimer = 0;",
    "let nativeGhostRetryLabel = 'start';",
    "const NATIVE_PREPARING_DEFER_MS = 350;",
    "let uiSoundFlip=false;",
    "const state={screen:'intro'};"
  ].join("\n");
  vm.runInNewContext(prefix + "\n" + dialogs + "\n" + mode +
    "\nthis.testApi={primeNativeGhostFromGesture,clearNativeGhostDialogs,"+
    "clearNativeGhostPreparing,deferNativeGhostPreparing,renderModeSelect,"+
    "status:()=>({pending:nativeGhostPreflightPending,"+
    "pendingAction:!!nativeGhostPendingAction,"+
    "generation:nativeGhostPreflightGeneration,screen:state.screen})};",
    sandbox,{filename:"ghost-writer-game.js:real-R13-functions"});
  const api=sandbox.testApi;
  return {
    api,native,calls,document,elements,timers,
    plan(value){nextPreparation=value;},
    mode(){api.renderModeSelect();assert(modeOptions);return modeOptions;},
    tick(){const entry=[...timers][0];assert(entry,"timer expected");timers.delete(entry[0]);entry[1].fn();return entry[1].delay;},
    loading(){return elements.get("ghostNativePreparing");},
    failure(){return elements.get("ghostNativeAudioFailure");}
  };
}
async function quickSuccess() {
  const h=harness();const mode=h.mode();
  h.native.ready=false;
  h.plan(Promise.resolve({ready:true,reason:"prepared"}));
  mode.onSelect("beginner");
  assert.equal(h.calls.prepare.length,1,"one real mode gesture activates native");
  assert.equal(h.calls.start.length,0,"training cannot start until ready");
  assert.equal(h.loading(),undefined,"NO one-frame loading popup at mode tap");
  assert.equal(h.timers.size,1);
  assert.equal(h.api.status().pending,true);
  h.native.ready=true;
  await flush();
  assert.deepEqual(h.calls.start,["beginner"],"original mode starts once after proof");
  assert.equal(h.loading(),undefined,"quick success never flashes loading");
  assert.equal(h.timers.size,0,"completion cancels deferred loading");
  assert.equal(h.api.status().pending,false);
  // The fully prepared bank follows the old synchronous mode-click path.
  h.api.primeNativeGhostFromGesture(()=>h.calls.start.push("replay"),"replay");
  assert.deepEqual(h.calls.start,["beginner","replay"]);
  assert.equal(h.calls.prepare.length,1,"already prepared reuses native bank");
  assert.equal(h.calls.tap.length,1,"hot native gesture retains UI pop");
}
async function slowSuccess() {
  const h=harness(),pending=deferred(),mode=h.mode();
  h.plan(pending.promise);
  mode.onSelect("advanced");
  mode.onSelect("beginner");
  assert.equal(h.calls.prepare.length,1,"repeat taps cannot double-preflight");
  assert.equal(h.loading(),undefined,"pending mode screen visible initially");
  assert.equal(h.tick(),350,"original progress is deferred only 350ms");
  assert(h.loading(),"long preflight retains child-readable progress");
  assert.match(h.loading().innerHTML,/Getting spooky sounds ready/);
  assert.match(h.loading().innerHTML,/Back to Playground/);
  assert.equal(h.api.status().screen,"mode","loading is not gameplay");
  h.native.ready=true;pending.resolve({ready:true,reason:"prepared"});
  await flush();
  assert.deepEqual(h.calls.start,["advanced"],"original chosen mode preserved");
  assert.equal(h.loading(),undefined,"long progress clears after native success");
  assert.equal(h.api.status().pending,false);
}
async function explicitCancel() {
  const h=harness(),pending=deferred(),mode=h.mode();
  h.plan(pending.promise);
  mode.onSelect("advanced");
  assert.equal(h.loading(),undefined);
  mode.onBack(); // newly visible mode Back stays a genuine cancel gesture
  assert.equal(h.calls.intro,1,"Back returns to Ghost Writer title");
  assert.equal(h.calls.stop,1,"Back invalidates native bank");
  assert.equal(h.timers.size,0,"Back cancels deferred loading");
  assert.equal(h.api.status().pendingAction,false,"stale training action retired");
  h.native.ready=true;pending.resolve({ready:true,reason:"prepared"});
  await flush();
  assert.equal(h.calls.start.length,0,"late success cannot force training");
  assert.equal(h.loading(),undefined);

  const delayed=harness(),wait=deferred();
  delayed.plan(wait.promise);
  delayed.mode().onSelect("beginner");
  delayed.tick();
  delayed.loading().querySelector("#ghostNativePreparingBack").click();
  assert.equal(delayed.calls.exit,1,"existing loading Back still exits Playground");
  assert.equal(delayed.calls.stop,1);
  wait.resolve({ready:true,reason:"prepared"});
  await flush();
  assert.equal(delayed.calls.start.length,0,"late success after Back is stale");
  assert.equal(delayed.loading(),undefined);
}
async function quickFailureAndRetry() {
  const h=harness();
  h.plan(Promise.resolve({ready:false,reason:"ui-preflight-failed"}));
  h.mode().onSelect("beginner");
  await flush();
  assert.equal(h.loading(),undefined,"fast genuine denial is not loading flash");
  assert(h.failure(),"real failure shown immediately");
  assert.match(h.failure().innerHTML,/Sound isn't ready/);
  assert.match(h.failure().innerHTML,/Try Again/);
  assert.equal(h.api.status().pendingAction,true,"selected mode remains retryable");
  assert.equal(h.timers.size,0);
  // Retry is a SECOND genuine tap, not an automatic audio retry.
  const next=deferred();h.plan(next.promise);
  h.failure().querySelector("#ghostNativeTryAgain").click();
  assert.equal(h.calls.prepare.length,2);
  assert.equal(h.failure(),undefined,"stale failure cleared on new gesture");
  assert.equal(h.loading(),undefined,"retry also avoids quick flash");
  h.native.ready=true;next.resolve({ready:true,reason:"prepared"});
  await flush();
  assert.deepEqual(h.calls.start,["beginner"]);
  assert.equal(h.timers.size,0);
}
async function temporaryAndInactive() {
  const h=harness();
  h.plan(Promise.resolve({ready:false,reason:"other-audio-playing"}));
  h.mode().onSelect("beginner");
  await flush();
  assert.equal(h.loading(),undefined,"OS priority denial never shows fake ready");
  assert.equal(h.failure(),undefined,"temporary conflict isn't permanent error");
  assert.equal(h.calls.pause,1,"OS conflict keeps normal Welcome Back pause");
  assert.equal(h.calls.showReturn,1);
  assert.equal(h.api.status().pendingAction,true,"Welcome Back can replay chosen mode");
  assert.equal(h.timers.size,0);

  const inactive=harness(),pending=deferred();
  inactive.plan(pending.promise);
  inactive.mode().onSelect("advanced");
  // UIKit .inactive can happen while WebKit document.hidden stays false.
  inactive.api.clearNativeGhostPreparing();
  assert.equal(inactive.timers.size,0,
    "inactivity cancels even the not-yet-painted progress");
  assert.equal(inactive.loading(),undefined);
  // Real native listener fences the underlying PCM session; this isolated
  // controller source test verifies the visible progress timer only.
  inactive.document.hidden=true;
  pending.resolve({ready:false,reason:"stale"});
  await flush();
  assert.equal(inactive.loading(),undefined);
  assert.equal(inactive.calls.start.length,0);
}
(async()=>{
  await quickSuccess();
  await slowSuccess();
  await explicitCancel();
  await quickFailureAndRetry();
  await temporaryAndInactive();
  console.log("R13 PASS: actual Ghost Writer fast/slow mode preflight, no transient popup, retry/failure, real Back and UIKit inactivity guards, original native-only audio activation");
})().catch(error=>{console.error(error);process.exitCode=1;});
