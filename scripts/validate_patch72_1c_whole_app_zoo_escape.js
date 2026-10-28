#!/usr/bin/env node
"use strict";
/* Patch 72.1C: shared return owner contract, verified media adapters,
 * no-prompt exclusions, source loading and lifecycle tests. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks++; }

const shared = read("verse_games/shared/welcome-back-return.js");
const zoo = read("verse_games/shared/welcome-back-zoo-escape.js");
const learn = read("app.js");
const readMyVerse = read("read_my_verse.js");
const flashcards = read("flashcards/flashcards.js");
const shell = read("verse_games/shared/game-shell.js");
const feed = read("daily_questions_feed_game.js");
const sw = read("service-worker.js");
const gameIds = ["bible_bugs", "dino_dash", "foodslice", "tower_bible",
  "traffic_tap", "verse_invaders", "verse_launch", "verse_munch",
  "verse_scramble_neo", "verse_snake", "verse_splat", "versey_bird"];
const playgroundIds = ["ghost_writer", "scripture_scrub", "verse_jam", "verse_typer", "wheel_of_bible"];
for (const [kind, ids, prefix] of [["game",gameIds,"verse_games"],
  ["playground",playgroundIds,"verse_playground"]]) {
  for (const id of ids) {
    const html = read(`${prefix}/${id}/index.html`);
    const a = html.indexOf("welcome-back.js");
    const b = html.indexOf("welcome-back-zoo-escape.js");
    const c = html.indexOf("welcome-back-return.js");
    ok(a >= 0 && b > a && c > b, `${kind} ${id}: shared loader order`);
    ok(html.includes("welcome-back.css"), `${kind} ${id}: shared visual treatment`);
    ok(html.includes("profiles.js"), `${kind} ${id}: existing profile identity`);
    ok(sw.includes(`"${prefix}/${id}"`), `${kind} ${id}: offline shell registered`);
  }
}
ok(learn.includes('script src="verse_games/shared/welcome-back-zoo-escape.js"') === false,
  "Learn code does not dynamically load a competing module");
const mainHtml = read("index.html");
ok(mainHtml.indexOf('src="verse_games/shared/welcome-back-zoo-escape.js"') > 0 &&
  mainHtml.indexOf('src="verse_games/shared/welcome-back-zoo-escape.js"') <
  mainHtml.indexOf('src="app.js"'), "main app preloads Zoo Escape before activity owners");
ok(/const CACHE_VERSION = "2026_[^"\n]*patch72_1(?:c|d)/.test(sw),
  "fresh PWA cache generation");
for (const p of ["welcome-back-zoo-escape.js","welcome-back-return.js","welcome-back.css"])
  ok(sw.includes(`"./verse_games/shared/${p}"`), `${p}: offline cached`);
for (const p of ["zoobreak_gate.png","zoobreak_lock.png"])
  ok(sw.includes(`"./verse_images/${p}"`), `${p}: offline cached`);

// Real shared controller with a stub visual engine: exercise browser lifecycle
// and owner callbacks, not only string matches. The fallback controller stays
// separately covered by the pre-existing Patch 62/64/65/66 tests.
function createHarness() {
  const callbacks = { doc: {}, win: {} }, entries = [];
  const button = {focus() {},setAttribute() {}};
  const overlay = { hidden: true, innerHTML: "", className: "", setAttribute() {},
    remove() { entries.push("remove-overlay"); },
    querySelector(selector) {return selector === "[data-welcome-back-action]" ? button : null;}};
  const doc = {hidden:false,body:{appendChild(e) {eq(e,overlay,"overlay attached");}},
    createElement() { return overlay; },
    addEventListener(t,fn) { callbacks.doc[t]=fn; },
    removeEventListener(t) { delete callbacks.doc[t]; }};
  let visual;
  const window = {document:doc,
    addEventListener(t,fn) {callbacks.win[t]=fn;},
    removeEventListener(t) {delete callbacks.win[t];},
    BibloZooWelcomeBack:{markup() {return "<fake/>";}},
    BibloZooZooEscape:{create(options) {
      entries.push("create");
      return visual = {options,start() {entries.push("start");},
        resumeVisible() {entries.push("resume-visible");},
        destroy() {entries.push("destroy");}};
    }}
  };
  vm.runInNewContext(shared,{window,document:doc,Promise,setTimeout});
  return {window,doc,overlay,callbacks,entries,get visual(){return visual;}};
}
async function exerciseReturn() {
  const h = createHarness();
  let active=true,pauseCount=0,gestureCount=0,exitCount=0;
  const ctl=h.window.BibloZooWelcomeBackReturn.attach({
    shouldPrompt:()=>active,
    onPause:()=>{pauseCount++;},
    onContinue:()=>{gestureCount++;return Promise.resolve(true);},
    onExit:()=>{exitCount++;},pictureBase:"../../",preserveFocus:true,suppressUiSound:true
  });
  eq(h.entries.filter(x=>x==="create").length,1,"single foreground Zoo engine");
  eq(ctl.isPaused(),false,"normal active gameplay continues");
  h.doc.hidden=true;h.callbacks.doc.visibilitychange();
  eq(pauseCount,1,"activity-owned pause called once");
  eq(ctl.isPaused(),true,"paused state seen by virtual clocks");
  eq(h.overlay.hidden,true,"never show on hidden page");
  h.callbacks.win.pagehide();
  eq(pauseCount,1,"pagehide cannot double-pause gameplay");
  h.doc.hidden=false;h.callbacks.win.pageshow();
  eq(h.overlay.hidden,false,"foreground shows overlay");
  ok(h.entries.includes("start"),"recovery opens stage-one Zoo controller");
  const startsBeforeSecondSwitch = h.entries.filter(x=>x==="start").length;
  h.doc.hidden=true;h.callbacks.doc.visibilitychange();
  eq(pauseCount,1,"second app switch does not re-pause activity");
  eq(h.entries.filter(x=>x==="start").length,startsBeforeSecondSwitch,
    "repeated task switch retains Zoo stage and rescued animals");
  h.doc.hidden=false;h.callbacks.doc.visibilitychange();
  eq(h.entries.filter(x=>x==="start").length,startsBeforeSecondSwitch,
    "foreground does not reset active Zoo Escape");
  ok(h.entries.includes("resume-visible"),"foreground resumes existing escaped pets");
  eq(await h.visual.options.recover(),true,"owner recovery verified on real tap callback");
  eq(gestureCount,1,"exactly one owner audio check");
  h.visual.options.onRecovered();
  eq(ctl.isPaused(),false,"successful verified gesture unpauses");
  eq(h.overlay.hidden,true,"verified success dismisses overlay");
  active=false;h.doc.hidden=true;h.callbacks.doc.visibilitychange();
  eq(pauseCount,1,"screen intentionally without prompt remains quiet");
  ctl.destroy();ctl.destroy();
  eq(h.entries.filter(x=>x==="destroy").length,1,"single visual cleanup");
  eq(h.entries.filter(x=>x==="remove-overlay").length,1,"single DOM cleanup");
  eq(Object.keys(h.callbacks.doc).length,0,"visibility listener removed");
  eq(Object.keys(h.callbacks.win).length,0,"page lifecycle listeners removed");
  // A second session's *stale* gesture must never claim verified recovery.
  const h2=createHarness();let resolve;
  const c2=h2.window.BibloZooWelcomeBackReturn.attach({
    shouldPrompt:()=>true,onPause:()=>{},
    onContinue:()=>new Promise(r=>resolve=r),onExit:()=>{exitCount++;}
  });
  h2.doc.hidden=true;h2.callbacks.doc.visibilitychange();
  h2.doc.hidden=false;h2.callbacks.doc.visibilitychange();
  const attempt=h2.visual.options.recover();
  h2.doc.hidden=true;h2.callbacks.doc.visibilitychange();
  resolve(true);
  eq(await attempt,false,"second backgrounding invalidates pending owner success");
  h2.doc.hidden=false;h2.callbacks.doc.visibilitychange();
  h2.visual.options.onExit();
  eq(exitCount,1,"safe navigation invoked once");
  eq(c2.isPaused(),false,"exit releases pending state");
  c2.destroy();
}

function auditOwners() {
  ok(shared.includes('function attachZooReturn(options)') &&
    shared.includes('if (root.BibloZooZooEscape?.create)'),"opt-in with safe legacy fallback");
  ok(shared.includes('onContinue();') && shared.includes('token === generation'),
    "shared owner runs within gesture and rejects stale asynchronous results");
  ok(zoo.includes('ok?.deferred === true') &&
    zoo.includes('attemptCount = Math.max(0, attemptCount - 1)'),
    "native pending/cooldown does not burn retry or invent audio recovery");
  ok(!zoo.includes('new AudioContext(') && !zoo.includes('setCategory('),
    "presentation cannot modify audio session or construct contexts");
  ok(shell.includes('controllerApi.resumeAudioOnGesture(') &&
    shell.includes('options.onResume?.()'),
    "Playground retains verified sound clock and activity-owned continuation");
  ok(flashcards.includes('onContinue: () => true') &&
    flashcards.includes('recording?.interruptCapture?.()') &&
    !shared.includes('getUserMedia('),
    "Flashcards acknowledges only; never silently restarts recording");
  ok(learn.includes('const started = resumeInterruptedLearnAudio()') &&
    learn.includes('finishLearnAudioResumeAttempt') &&
    learn.includes('learnAudioResumeAttempt?.recovery === recovery'),
    "Learn only succeeds after original playStarted/audioReady verification");
  ok(learn.includes('const finishingZoo = !!learnZooEscape') &&
    learn.includes('learnZooEscape.start()'),
    "Learn reuses verified result without hiding dialog prematurely");
  ok(readMyVerse.includes('const started = resumeReadAudioFromGesture()') &&
    readMyVerse.includes('waitReadMediaProgress') &&
    readMyVerse.includes('generation !== readAudioRecoveryGeneration'),
    "Read My Verse retains media/tone/soundtrack clock verification");
  ok(readMyVerse.includes('const finishingZoo = !!readZooEscape') &&
    readMyVerse.includes('readZooEscape.start()'),
    "Read My Verse preserves frozen scenes until original verifier succeeds");
  ok(learn.includes('return !State.todoInfoPage;') &&
    learn.includes('State.sayVerseActive') &&
    learn.includes('State.finalRecallActive'),
    "only intended daily/quiet Learn screens prompt");
  ok(learn.includes('if (State.screen === Screen.TODO_DEV)') &&
    learn.includes('go(Screen.TITLE);'),
    "daily safe-exit route remains owned by main app");
  ok(feed.includes('runtime.zooEscape = window.BibloZooZooEscape.create') &&
    feed.includes('attemptFeedingResumeFromGesture(runtime, resolve)'),
    "original four Feeding modes retain their direct audio probe");
  ok(!shared.includes('AVAudioSessionCategory') &&
    !learn.includes('AVAudioSessionCategory'),"JS rollout cannot alter native SoloAmbient");
}

(async()=>{auditOwners();await exerciseReturn();console.log(`Patch 72.1C whole-app Zoo Escape: ${checks} checks passed`);})().catch(e=>{console.error(e);process.exitCode=1;});
