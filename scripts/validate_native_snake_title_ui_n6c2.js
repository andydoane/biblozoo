"use strict";
/* N6c.2 — exercise actual Scripture Snake title/mode/Help callbacks.
 * Catch out-of-scope free-variable ReferenceError in real click paths
 * (especially volumeScale, which belongs only inside playGameSound).
 * Node VM and web build cannot prove iPhone speaker audibility or Swift build.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const base = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(base,p),"utf8");
const game = read("verse_games/verse_snake/game.js");
const bugs = read("verse_games/bible_bugs/game.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const handoff = read("docs/PROJECT-HANDOFF.md");
const workflow = read(".github/workflows/ios-prep-validation.yml");
new Function(game);
assert.match(handoff, /N6c\.2/);
assert.match(workflow,/validate_native_snake_title_ui_n6c2\.js/);
assert.match(game,/function wireNativeSnakeHelpPops\(\)/);
assert.match(game,/document\.getElementById\("helpBtn"\)\?\.addEventListener\("click", unlockAndTap\)/);
assert.match(game,/\.addEventListener\("click", unlockAndTap\)/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
assert.match(bugs,/function playUiTapAndUnlock\(\)/,
  "Bible Bugs is deliberately unchanged in this follow-up");

function section(startMarker,endMarker) {
  const start = game.indexOf(startMarker);
  const end = game.indexOf(endMarker,start+startMarker.length);
  assert.ok(start >= 0 && end > start,
    "Missing exact Snake source section: " + startMarker);
  return game.slice(start,end);
}
const popFunctions = section("  function nextUiTapKey() {",
  "  function stopLoop(){");
const preflight = section("  function primeSnakeAudioAndContinue(",
  "  if (nativeSnakeAudio) {");
const screens = section("  function wireNativeSnakeHelpPops() {",
  "  function renderGameScreen(){");
assert.doesNotMatch(popFunctions,/\bvolumeScale\b/,
  "early title/Help callback must not use playGameSound's local volumeScale");
assert.doesNotMatch(preflight,/\bvolumeScale\b/,
  "mode/Close preflight must not use playGameSound's local volumeScale");
const actualSource = popFunctions + "\n" + preflight + "\n" + screens +
  "\nthis.test = {unlockAndTap, primeSnakeAudioAndContinue, renderIntroScreen, renderModeSelect};";

function fixture({native=true,muted=false}={}) {
  const actions=[], tapCalls=[], preflights=[], elements={};
  const createButton = id => {
    const listeners={};
    return elements[id]={
      addEventListener(name, fn) {listeners[name]=fn;},
      fireClick() { if (listeners.click) listeners.click(); },
      hasClickListener() {return typeof listeners.click==="function";}
    };
  };
  createButton("helpBtn");
  createButton("vslHelpOverlayCloseBtn");
  const app={
    setAttribute(key,value){actions.push("attr:"+key+"="+value);},
    removeAttribute(key){actions.push("remove:"+key);}
  };
  const shell={
    renderTitleScreen(args){actions.push("render-title");this.title=args;},
    renderModeSelect(args){actions.push("render-mode");this.mode=args;}
  };
  const audio={
    tapUiFromGesture(...args){tapCalls.push(args);return true;},
    prepareFromGesture(...args){preflights.push(args);return Promise.resolve({ready:true});},
    stop(){actions.push("native-stop");return Promise.resolve();}
  };
  const ctx={
    app,document:{hidden:false,getElementById:id=>elements[id]||null},
    window:{VerseGameShell:shell,VerseGameBridge:{exitGame(){actions.push("exit");}}},
    nativeSnakeAudio:native?audio:null,
    muted,returnPaused:false,completed:false,completionResult:null,
    state:{running:false},uiTapToggle:false,
    nativeSnakeGateSerial:0,nativeSnakeGatePending:false,
    nativeSnakeRetryMode:"round",selectedMode:null,
    GAME_TITLE:"Scripture Snake",GAME_ICON:"🐍",GAME_ICON_HTML:"<span>🐍</span>",
    HELP_OVERLAY_ID:"vslHelpOverlay",GAME_THEME:{},SOUND_VOLUMES:{uiTap1:.55,uiTap2:.55},
    // Deliberately NO volumeScale global. It only exists as a local
    // parameter of playGameSound in the real game.
    helpHtml:()=>"<p>Help</p>",
    stopLoop:()=>actions.push("stop-loop"),
    abandonNativeSnakePreflight:()=>actions.push("abandon"),
    hideNativeSnakeGate:()=>actions.push("hide-gate"),
    showNativeSnakeGate:()=>actions.push("show-gate"),
    renderGameScreen:()=>actions.push("render-game"),
    setPaused:(paused)=>actions.push("pause:"+paused),
    unlockAudio:()=>Promise.resolve(true),
    playGameSound:key=>actions.push("web:"+key),
    Promise,Math,console
  };
  vm.createContext(ctx);
  vm.runInContext(actualSource,ctx,{filename:"snake-real-title-mode-functions.js"});
  return {ctx,actions,tapCalls,preflights,audio,shell,elements,api:ctx.test};
}
const flush=async()=>{await new Promise(setImmediate);await new Promise(setImmediate)};

async function nativeButtons() {
  const h=fixture();
  h.api.renderIntroScreen();
  assert.equal(h.actions.includes("render-title"),true);
  assert.equal(h.elements.helpBtn.hasClickListener(),true,
    "native title Help button must request a UI pop");
  assert.equal(h.elements.vslHelpOverlayCloseBtn.hasClickListener(),true);
  h.elements.helpBtn.fireClick();
  assert.equal(h.tapCalls.length,1);
  assert.equal(h.tapCalls[0][1],.55);
  h.elements.vslHelpOverlayCloseBtn.fireClick();
  assert.equal(h.tapCalls.length,2);

  // Reproduce the exact user-reported Start click and scope crash:
  // callback previously aborted at undefined volumeScale.
  h.shell.title.onStart();
  assert.equal(h.actions.includes("render-mode"),true,
    "Start must navigate rather than throwing ReferenceError");
  assert.equal(h.tapCalls.length,3);
  assert.equal(h.tapCalls[2][1],.55);

  h.shell.mode.onBack();
  assert.equal(h.actions.filter(v=>v==="render-title").length,2,
    "difficulty Back must return to title instead of throwing");
  assert.equal(h.tapCalls.length,4);

  h.shell.title.onBack();
  assert.equal(h.actions.includes("exit"),true,
    "title Back must exit the game instead of throwing");

  h.api.renderModeSelect();
  h.shell.mode.onSelect("easy");
  assert.equal(h.ctx.selectedMode,"easy");
  assert.equal(h.preflights.length,1,
    "difficulty must prepare native bank on actual tap");
  assert.equal(h.preflights[0][0].volume,.55,
    "difficulty pop volume must use defined UI sound tuning");
  await flush();
  assert.ok(h.actions.includes("render-game"),
    "game must start after successful full-bank preflight");
  assert.equal(h.ctx.nativeSnakeGatePending,false);
  assert.ok(h.actions.includes("remove:aria-busy"));

  h.api.primeSnakeAudioAndContinue("resume","uiTap2");
  await flush();
  assert.equal(h.preflights.length,2);
  assert.equal(h.preflights[1][0].volume,.55,
    "manual menu Close uses bounded existing native UI clip");
  assert.ok(h.actions.includes("pause:false"),
    "same round resumes after full native bank readiness");
}
async function mutedButtons() {
  const h=fixture({muted:true});
  h.api.renderIntroScreen();
  h.shell.title.onStart();
  assert.equal(h.actions.includes("render-mode"),true,
    "muted navigation still works");
  assert.equal(h.tapCalls.length,0,"muted UI cannot request native playback");
  h.shell.mode.onSelect("hard");
  assert.equal(h.preflights.length,0,"muted game may follow existing silent gate");
  assert.ok(h.actions.includes("render-game"));
}
async function browserIsolation() {
  const h=fixture({native:false});
  h.api.renderIntroScreen();
  assert.equal(h.elements.helpBtn.hasClickListener(),false,
    "native-only Help pop hook must not change browser behavior");
  h.shell.title.onStart();
  await flush();
  assert.ok(h.actions.includes("render-mode"));
  assert.ok(h.actions.some(x=>x==="web:uiTap1"),
    "original browser tap path remains intact");
  h.shell.mode.onSelect("easy");
  assert.ok(h.actions.includes("render-game"));
  assert.equal(h.preflights.length,0);
}
(async()=>{
 await nativeButtons();await mutedButtons();await browserIsolation();
 console.log("N6c.2 actual Snake Start, Back, Help/Close, difficulty, menu resume and muted/browser UI: no undefined volumeScale, proper native PCM volume and game gate PASS");
})().catch(error=>{console.error(error);process.exitCode=1});
