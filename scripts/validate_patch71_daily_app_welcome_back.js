#!/usr/bin/env node
"use strict";
/* Patch 71 source contracts and simulated return handling. Not an iOS test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const questions = read('daily_questions.js');
const app = read('app.js');
const sw = read('service-worker.js');
let checked = 0;
function ok(value,description){assert.ok(value,description);checked++;}
function eq(a,b,description){assert.equal(a,b,description);checked++;}

function testDailyQuestions() {
  let controller, renders = 0, stoppedVerseAudio = 0, completed = 0, exits=0;
  const fakeWindow = {
    addEventListener() {},
    BibloZooWelcomeBackReturn: {attach(options) {
      controller=options;
      return {isPaused:()=>false};
    }}
  };
  const fakeDoc = {hidden:false,addEventListener(){}};
  class Audio { constructor(){this.currentTime=0;} pause(){} }
  const sandbox={window:fakeWindow,document:fakeDoc,Audio,
    clearTimeout(){},clearInterval(){},setTimeout(){return 1;},setInterval(){return 2;},
    cancelAnimationFrame(){},console};
  const exportMarker='  window.BibloZooDailyQuestions =';
  ok(questions.includes(exportMarker),'Daily Questions export exists');
  const instrumented=questions.replace(exportMarker,`
    window.__patch71 = {
      setSession(session){dailySession=session;},
      getSession(){return dailySession;},
      getController(){return dailyQuestionReturn;}
    };
${exportMarker}`);
  vm.runInNewContext(instrumented,sandbox,{filename:'daily_questions.js'});
  const api=fakeWindow.BibloZooDailyQuestions;
  api.initialize({
    isEnabled:()=>true,
    isDailySessionActive:()=>true,
    renderApp:()=>{renders++;},
    stopDailyAudio:()=>{stoppedVerseAudio++;},
    goToTitle:()=>{exits++;},
    updateDailyProgress:()=>{completed++;}
  });
  ok(!!controller,'shared return controller installed');
  eq(controller.escapeText,'Back to Title','safe exit label');
  eq(controller.suppressUiSound,true,'no extra UI audio during recovery');
  eq(controller.shouldPrompt(),false,'never prompt without a session');
  const session={phase:'question',questionIndex:1,answered:true,selectedAnswer:2,
    earnedStarPegCount:1,showStarRewardPopup:true,questionAudioPlaying:false};
  fakeWindow.__patch71.setSession(session);
  eq(controller.shouldPrompt(),true,'live question session prompts');
  controller.onPause();
  eq(session.questionIndex,1,'interruption preserves question index');
  eq(session.selectedAnswer,2,'interruption preserves selected answer');
  eq(session.earnedStarPegCount,1,'interruption preserves earned stars');
  eq(session.showStarRewardPopup,false,'transient reward animation cleared');
  eq(completed,0,'interruption grants no daily progress');
  eq(controller.onContinue(),true,'gesture acknowledges existing question');
  eq(renders,1,'acknowledgment redraws retryable UI');
  eq(completed,0,'acknowledgment grants no completion');
  session.phase='verse';session.verseAudioPlaying=true;
  controller.onPause();
  eq(session.verseAudioPlaying,false,'verse help playback stopped');
  eq(stoppedVerseAudio,1,'verse help HTML narration canceled without replay');
  session.phase='reflection';
  eq(controller.shouldPrompt(),true,'reflection retains session acknowledgment');
  session.phase='reward_game';
  eq(controller.shouldPrompt(),false,'Feeding owns its own popup');
  session.phase='question';fakeDoc.hidden=true;
  eq(controller.onContinue(),false,'never release prompt while hidden');
  fakeDoc.hidden=false;
  controller.onExit();
  eq(exits,1,'back escape returns safely');
  eq(fakeWindow.__patch71.getSession(),null,'back escape clears session');
  eq(completed,0,'exit never counts session as complete');
}

function testAppClassification() {
  const start=app.indexOf('// Patch 71: app-owned quiet activity return gate.');
  const end=app.indexOf('function runAfterSlide(',start);
  ok(start>=0 && end>start,'app return implementation found');
  const isolated=app.slice(start,end);
  let controller,now=5000,backToTitle=0,stoppedTutorial=0;
  const Screen={TITLE:'title',TODO:'todo',TODO_DEV:'todo_dev',DAILY_SESSION:'daily_session',
    DAILY_SNACK:'daily_snack',FLASHCARDS:'flashcards',READ_MY_VERSE:'read_my_verse',
    HIDE:'hide',FINAL_RECALL:'final_recall',VERSl_DETAIL:'verse_detail',PRIVACY:'privacy',
    ZOOKEEPER_STATS:'zookeeper_stats',PET_UNLOCK:'pet_unlock'};
  const State={screen:Screen.TITLE,isSliding:false,todoInfoPage:'',sayVerseActive:false,
    finalRecallActive:false,sayVerseStartedAt:0,finalRecallStartedAt:0};
  const sandbox={State,Screen,document:{hidden:false},performance:{now:()=>now},
    window:{BibloZooWelcomeBackReturn:{attach(options){controller=options;
      return {isPaused:()=>false};}}},
    stopZooTodoTutorialPageAudio(){stoppedTutorial++;},
    go(s){eq(s,Screen.TITLE,'back escape navigates to title');backToTitle++;},
    setTimeout(fn){return setTimeout(fn,1)}
  };
  vm.runInNewContext(isolated,sandbox,{filename:'app-return.js'});
  vm.runInNewContext('attachAppActivityReturn()',sandbox);
  ok(!!controller,'app-level controller installed');
  const categories=[Screen.TITLE,Screen.TODO,Screen.DAILY_SESSION,Screen.DAILY_SNACK,
    Screen.FLASHCARDS,Screen.READ_MY_VERSE,Screen.PRIVACY,Screen.ZOOKEEPER_STATS,
    Screen.PET_UNLOCK];
  for(const screen of categories){State.screen=screen;eq(controller.shouldPrompt(),false,
    `${screen} does not get an unexpected app popup`);}
  State.screen=Screen.TODO_DEV;
  eq(controller.shouldPrompt(),true,'daily task hub gets acknowledgment');
  State.todoInfoPage='care';eq(controller.shouldPrompt(),false,'task info page not interrupted');
  State.todoInfoPage='';controller.onPause();
  eq(stoppedTutorial,1,'daily task tutorial audio stops');
  eq(controller.onContinue(),true,'task hub resumes from tap');
  State.screen=Screen.HIDE;State.sayVerseActive=true;State.sayVerseStartedAt=3000;
  eq(controller.shouldPrompt(),true,'active missing-words timer protected');
  controller.onPause();now=12000;
  eq(controller.onContinue(),true,'timer resumes only on tap');
  eq(State.sayVerseStartedAt,10000,'missing-words start shifted by pause duration');
  State.screen=Screen.FINAL_RECALL;State.finalRecallActive=true;
  State.finalRecallStartedAt=11000;now=15000;
  eq(controller.shouldPrompt(),true,'active final recall timer protected');
  controller.onPause();now=19000;
  eq(controller.onContinue(),true,'final recall resumes on tap');
  eq(State.finalRecallStartedAt,15000,'final recall deadline preserves remaining time');
  State.isSliding=true;eq(controller.shouldPrompt(),false,'no popup during in-app transition');
  State.isSliding=false;controller.onExit();eq(backToTitle,1,'safe app-level exit');
}

function testContracts() {
  ok(questions.includes('cancelQuestionPageTransition?.();'),'interruption cancels unfinished page fades');
  ok(questions.includes('transitionAborted || document.hidden'),'fades cannot advance unseen');
  ok(questions.includes('dailyQuestionsReturnPaused() ||'),'fades cannot advance behind modal');
  ok(questions.includes('questionAudioNeedsForegroundRender = false;'),'manual audio play UI restored');
  ok(questions.includes('clearDailyQuestionRewardPopupTimer();'),'reward timer cleaned up');
  ok(app.includes('attachAppActivityReturn();'),'app controller starts after setup');
  ok(app.includes('waitForActiveLearnTime(promptHoldMs)'),'missing-words hold is pause-aware');
  ok(app.includes('waitForActiveLearnTime(promptFadeMs)'),'missing-words fade is pause-aware');
  ok(app.includes('waitForActiveLearnTime(durationMs)'),'final recall completion is pause-aware');
  ok(app.includes('stopNewVersePickerPreviewAudio();'),'idle picker audio stops on hide');
  ok(app.includes('stopDailyQuestionPreviewAudio();'),'developer question audio stops on hide');
  ok(sw.includes('2026_Oct_26_patch71_daily_app_welcome_back'),'PWA cache invalidated');
  ok(read('daily_zoo_todo_ui.js').includes('if (root.document.hidden) clearDeveloperLongPress();'),
    'backgrounding clears developer-only task-row long press');
  ok(read('daily_zoo_todo_ui.js').includes('root.addEventListener?.("pagehide", clearDeveloperLongPress)'),
    'pagehide clears orphaned developer long press');
  for(const file of ['daily_question_sessions.js','daily_zoo_todo.js','daily_zoo_todo_ui.js']){
    ok(read(file).length>100,'data/model files remain available: '+file);
  }
}

testDailyQuestions();
testAppClassification();
testContracts();
console.log(`Patch 71 daily/app Welcome Back: ${checked} checks passed`);
