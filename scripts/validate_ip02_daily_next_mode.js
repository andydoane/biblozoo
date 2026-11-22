"use strict";
// IP02: execute real Daily Questions feedback/Next/transition handlers and
// the shared Game Menu's Daily To-Do guard. Synthetic DOM / fake timers do
// not replace iPad and iPhone owner testing.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const daily = read("daily_questions.js");
const shell = read("verse_games/shared/game-shell.js");
const bridge = read("verse_games/shared/bridge.js");
function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, "missing actual production code: " + start);
  return source.slice(a, b);
}
const scheduleFunctions = between(daily,
  "  function clearDailyQuestionRewardPopupTimer() {",
  "  function initialize(api) {");
const transitionFunction = between(daily,
  "  async function transitionQuestionPage(wrap, advance) {",
  "  function renderQuestionContextHtml(question) {");
const choiceHandler = between(daily,
  "    wrap\n      .querySelectorAll(\n        \"[data-daily-question-choice]\"",
  "    const questionAudioButton =");
const nextHandler = between(daily,
  "    const nextQuestionButton =\n      wrap.querySelector(",
  "    const reflectionDoneButton =");
assert.match(daily, /nextReady: false,\s*showStarRewardPopup: false/);
assert.match(daily, /daily-question-feedback-next no-zoom\$\{session.nextReady/);
assert.match(daily, /session.nextReady \? "" : 'disabled aria-busy="true"'/);
assert.match(daily, /if \(dailySession.answered\) dailySession.nextReady = true/);
const css = read("daily_questions.css");
assert.match(css, /\.daily-question-feedback-next\.is-waiting/);
assert.match(css, /\.daily-question-feedback-next:disabled/);

function fakeClick() { return {preventDefault(){}, stopPropagation(){}}; }
let clock = 0, nextTimer = 1;
const timers = new Map();
function setFakeTimeout(callback, ms) {
  const id = nextTimer++;
  timers.set(id, {when: clock + ms, callback, ms});
  return id;
}
function tick(ms) {
  const end = clock + ms;
  while (true) {
    const ready = [...timers.entries()]
      .filter(([,timer]) => timer.when <= end)
      .sort((a,b) => a[1].when - b[1].when)[0];
    if (!ready) break;
    clock = ready[1].when;
    timers.delete(ready[0]);
    ready[1].callback();
  }
  clock = end;
}
function makeElement() {
  const names = new Set();
  return {
    disabled:false, removed:false, inert:false, isConnected:true,
    classList: {
      add: n=>names.add(n), remove:n=>names.delete(n),
      contains:n=>names.has(n)
    },
    attrs: {},
    removeAttribute(n) { delete this.attrs[n]; },
    setAttribute(n,v) { this.attrs[n]=v; },
    getAttribute(n) { return this.attrs[n] || null; },
    remove() { this.removed=true; },
    getAnimations() {return [];}
  };
}
const button = makeElement();button.attrs["data-daily-question-choice"]="0";
const next = makeElement();next.disabled=true;
next.classList.add("is-waiting");next.attrs["aria-busy"]="true";
const star = makeElement();
const wrap = makeElement();
wrap.querySelector = selector => selector === "[data-daily-question-next]"
  ? next : selector === "[data-daily-question-number]"
  ? {getAttribute:()=>String(scope.dailySession.questionIndex+1)}:null;
wrap.querySelectorAll = selector =>
  selector === "[data-daily-question-choice]" ? [button] :
  selector === ".daily-question-star-reward" ? [star] : [];
wrap.animate = ()=>({finished:Promise.resolve()});
let renders = 0, advances = 0, correctSounds=0;
const overlay=()=>({
  style:{}, setAttribute(){}, getAnimations:()=>[],
  remove(){}, animate:()=>({finished:Promise.resolve()})
});
const document={
  hidden:false, body:{appendChild(){}},
  querySelector:()=>wrap,
  querySelectorAll: selector =>
    selector === ".daily-question-session" ? [wrap] : [],
  createElement:overlay
};
const session={
  phase:"question",questionIndex:0,answered:false,answerCorrect:false,
  nextReady:false, showStarRewardPopup:false,earnedStarPegCount:0,
  questionSession:{items:[
    {kind:"question",question:{choices:[{label:"yes"},{label:"no"}],answer:0}},
    {kind:"question",question:{choices:[{label:"yes"},{label:"no"}],answer:0}}
  ]}
};
const scope={
  dailySession:session,SESSION_PHASES:{QUESTION:"question",REFLECTION:"reflection"},
  questionPageTransition:false,cancelQuestionPageTransition:null,
  rewardPopupTimeoutId:0, document, console,
  setTimeout:setFakeTimeout, clearTimeout:id=>timers.delete(id),
  dailyQuestionsReturnPaused:()=>false, stopGeneratedQuestionAudio(){},
  getSessionQuestion:s=>s.questionSession.items[s.questionIndex]?.question,
  playDailyQuestionAnswerSound:()=>{correctSounds++;},
  appApi:{renderApp(){renders++;}},
  window:{matchMedia:()=>({matches:true}),
    BibloZooDailyQuestionSessions:{ITEM_KINDS:{APPLICATION:"application"}}},
  getComputedStyle:()=>({backgroundColor:"#fff"}),
  finishQuestionSession:()=>{throw Error("unexpected final finish")}
};
vm.createContext(scope);
vm.runInContext(scheduleFunctions + transitionFunction +
  "\nfunction bindChoice(wrap) {\n" + choiceHandler + "\n}" +
  "\nfunction bindNext(wrap) {\n" + nextHandler + "\n}" +
  "\nthis.bindChoice=bindChoice;this.bindNext=bindNext;" +
  "this.transitionQuestionPage=transitionQuestionPage;" +
  "this.scheduleDailyQuestionNextReady=scheduleDailyQuestionNextReady;" +
  "this.clearDailyQuestionRewardPopupTimer=clearDailyQuestionRewardPopupTimer;",
  scope,{filename:"daily_questions_real_handlers.js"});
scope.bindChoice(wrap);
scope.bindNext(wrap);
assert.equal(typeof button.onclick,"function");
assert.equal(typeof next.onclick,"function");
button.onclick(fakeClick());
button.onclick(fakeClick()); // same answer cannot credit another star
assert.equal(session.answered,true);
assert.equal(session.answerCorrect,true);
assert.equal(session.earnedStarPegCount,1,"one credit for two fast answer taps");
assert.equal(correctSounds,1);
assert.equal(session.showStarRewardPopup,true);
assert.equal(session.nextReady,false);
assert.equal(renders,1);
assert.equal([...timers.values()][0].ms,900);
next.onclick(fakeClick()); // UI-disabled / script guard, no premature advance
assert.equal(session.questionIndex,0);
tick(899);
assert.equal(session.nextReady,false);
tick(1);
assert.equal(session.nextReady,true);
assert.equal(session.showStarRewardPopup,false);
assert.equal(next.disabled,false);
assert.equal(next.attrs["aria-busy"],undefined);
assert.equal(next.classList.contains("is-waiting"),false);
assert.equal(star.removed,true);
assert.equal(renders,1,"star completion does not replace Next under finger");
next.onclick(fakeClick());
next.onclick(fakeClick());
assert.equal(session.questionIndex,1,"next advances exactly once");
assert.equal(session.answered,false);
assert.equal(session.nextReady,false);
assert.equal(renders,2);

// Wrong/no-star answers have a shorter, visible wait and still get one tap.
button.attrs["data-daily-question-choice"]="1";
next.disabled=true;next.classList.add("is-waiting");next.attrs["aria-busy"]="true";
scope.bindChoice(wrap);
button.onclick(fakeClick());
assert.equal(session.answerCorrect,false);
assert.equal(session.earnedStarPegCount,1,"wrong answer never grants a peg");
assert.equal([...timers.values()][0].ms,320);
tick(320);
assert.equal(session.nextReady,true);
assert.equal(next.disabled,false);

// A cancelled timer during the real Welcome Back gate must not advance the
// answer; on return, the code restores Next-ready state for this answered card.
scope.scheduleDailyQuestionNextReady(session,1,true);
scope.clearDailyQuestionRewardPopupTimer();
assert.equal(timers.size,0);
assert.match(daily, /pauseDailyQuestionsForReturn\(\)[\s\S]*?if \(dailySession.answered\) dailySession.nextReady = true/);
assert.equal(session.questionIndex,1);

// Real animated transition guards a duplicate tap and advances once.
let animatedAdvances=0;
scope.dailySession=session;
session.nextReady=true;
session.answered=true;
scope.window.matchMedia=()=>({matches:false});
const originalCreateElement=document.createElement;
document.createElement=()=>({
  style:{},setAttribute(){},remove(){},
  getAnimations:()=>[],animate:()=>({finished:Promise.resolve()})
});
const first=scope.transitionQuestionPage(wrap,()=>{animatedAdvances++;});
const duplicate=scope.transitionQuestionPage(wrap,()=>{animatedAdvances++;});
assert.equal(scope.questionPageTransition,true,"fade blocks second tap");
Promise.resolve().then(async()=>{
  await duplicate;
  tick(75);
  await first;
  assert.equal(animatedAdvances,1,"only one transition advance");
  assert.equal(scope.questionPageTransition,false);
  document.createElement=originalCreateElement;
  // Validate the actual bridge contract for Daily To-Do, not merely a name.
  const realBridgeCheck = between(bridge,
    "  function isDailyTodoLaunch() {", "  function returnToDailyTodo({");
  const params = {
    todoSource:"daily_todo", dailyProfileId:"kid-1",dailyPlanId:"plan-1",
    dailyPlanDay:"2026-11-22",dailyTaskId:"task-1",dailyLaunchToken:"token-1",
    dailyVerseId:"verse-1",dailyActivityKind:"game",
    dailyActivityId:"bible_bugs",dailyActivityMode:"medium",
    dailyReturnContext:"daily_tasks_clipboard",mix:false
  };
  const bridgeScope={launchParams:params};
  vm.createContext(bridgeScope);
  vm.runInContext("function getParams(){return launchParams;}\n" +
    realBridgeCheck+"\nthis.check=isDailyTodoLaunch;",bridgeScope);
  const shellHelpers=between(shell,"  function getLaunchParams() {",
    "  function getZooTodoCompletionFeedback(");
  const realGameMenu=between(shell,"  function gameMenuHtml({",
    "  // Patch 67: a lightweight adapter");
  const elements={};
  const stubNode=()=>({
    classList:{contains:()=>false,add(){},remove(){}},
    setAttribute(){},contains(){return false;}
  });
  const shellScope={
    window:{VerseGameBridge:{
      getLaunchParams:()=>bridgeScope.launchParams,
      isDailyTodoLaunch:()=>bridgeScope.check()
    }},
    document:{activeElement:null,getElementById:id=>
      elements[id] || null},
    escapeHtml:x=>String(x),
    wireHelp(){},console
  };
  vm.createContext(shellScope);
  vm.runInContext(shellHelpers+realGameMenu+
    "\nthis.menuHtml=gameMenuHtml;this.wireMenu=wireGameMenu;",shellScope);
  const ids=[
    "scramble","traffic_tap_external","chain","foodslice","tower_bible",
    "verse_snake","versey_bird","dino_dash","verse_munch","verse_invaders",
    "bible_bugs","verse_splat","verse_jam","scripture_scrub","ghost_writer",
    "verse_typer","wheel_of_bible"
  ];
  assert.equal(ids.length,17,"12 games + 5 Playground activities");
  for (const id of ids) {
    bridgeScope.launchParams={...params,dailyActivityId:id,
      dailyActivityKind:ids.indexOf(id)<12?"game":"playground"};
    assert.equal(bridgeScope.check(),true,id+": valid To-Do context");
    assert.doesNotMatch(shellScope.menuHtml({id:"menu",showModeSelect:true}),
      /menuModeSelectBtn/,id+": no Mode Select in fixed Daily launch");
  }
  // Defense in depth: even stale Mode Select button cannot restart a Daily
  // game. Ordinary, legacy Zoo To-Do, and broken/missing tokens keep choice.
  bridgeScope.launchParams={...params};
  const modeBtn=stubNode();const menuOverlay=stubNode();
  elements.menuModeSelectBtn=modeBtn;elements.menu=menuOverlay;
  let modeCalls=0;
  shellScope.wireMenu({id:"menu",onModeSelect:()=>{modeCalls++;}});
  modeBtn.onclick();
  assert.equal(modeCalls,0,"stale Daily Mode Select cannot reload a round");
  const cases=[
    {todoSource:"ordinary_launch"},
    {todoSource:"zoo_todo"},
    {dailyLaunchToken:""},
    {mix:true,todoSource:"ordinary_launch"}
  ];
  for (const change of cases) {
    bridgeScope.launchParams={...params,...change};
    const markup=shellScope.menuHtml({id:"menu",showModeSelect:true});
    if (change.mix) assert.doesNotMatch(markup,/menuModeSelectBtn/,
      "Game Mix remains independently locked");
    else assert.match(markup,/menuModeSelectBtn/,
      "ordinary/legacy/incomplete To-Do keeps mode choice");
  }
  bridgeScope.launchParams={...params,todoSource:"ordinary_launch"};
  modeBtn.onclick();
  assert.equal(modeCalls,1,"ordinary game Mode Select still works");
  assert.doesNotMatch(shellScope.menuHtml({id:"menu",showModeSelect:false}),
    /menuModeSelectBtn/,"game's own hide preference preserved");
  // Existing daily-todo-shell's mode auto-select/completion tests still run
  // in validate:daily-zoo-todo. Avoid touching its credit/router semantics.
  console.log("IP02 actual Next/timer/one-credit/transition + 17 Daily mode locks PASS");
}).catch(err=>{console.error(err.stack||err);process.exitCode=1;});
