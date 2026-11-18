#!/usr/bin/env node
"use strict";
/* R05 / DAILY-01: run actual Daily Questions controller and actual Check
 * the Verse Listen click body under native UIKit inactive with visible WebKit.
 * Also exercise app.js' real native reference->verse completion callbacks.
 * Simulated bridge, NOT audible iPhone/Xcode proof.
 */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const daily=read("daily_questions.js"),app=read("app.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const native=read("verse_games/shared/native-learn-listen.js");
const shared=read("verse_games/shared/welcome-back-return.js");
const workflow=read(".github/workflows/ios-prep-validation.yml");
for(const s of [daily,app,native,shared])new vm.Script(s);
assert(swift.includes('notifyListeners("biblozooAppLifecycle", data: [') &&
       swift.includes('"active": false,') && swift.includes('"active": true,'),
  "UIKit native lifecycle already available; no Swift changes needed");
assert(shared.includes("pauseFromNativeInactive") &&
       shared.includes("showAfterNativeActive") &&
       shared.includes("isPaused: () => pending"),
  "Daily uses existing user-tap Welcome Back");
assert(daily.includes('bridge.addListener("biblozooAppLifecycle", event =>') &&
       daily.includes("dailyQuestionReturn?.pauseFromNativeInactive?.()") &&
       daily.includes("dailyQuestionReturn?.showAfterNativeActive?.()"));
assert(daily.includes("dailySession === session &&") &&
       daily.includes("request === dailyVerseListenRequest"),
  "Out-of-order cancelled native verse results may not clear new Listen");
assert(daily.includes("dailyQuestionsReturnPaused() ||") &&
       daily.includes("stopDailyVerseListen()"),
  "No new verse playback while Welcome Back blocks the app");
assert(app.includes("Screen.DAILY_SESSION].includes(State.screen)") &&
       /if \(\[Screen\.FLASHCARDS, Screen\.DAILY_SESSION\]\s*\.includes\(State\.screen\)/.test(app),
  "Shared native ref/verse playback recognizes Daily panel for ended and interrupted");
assert(workflow.includes("node scripts/validate_r05_daily_check_verse_native_recovery.js"));
for(const p of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
  "docs/IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md",
  "docs/IOS-OWNER-AUDIO-FINDINGS-2026-11-17.md"])
  assert(read(p).includes("R05"),"Owner docs must cover R05: "+p);

const marker="  window.BibloZooDailyQuestions =";
const a=daily.indexOf("    const verseListenButton =");
const b=daily.indexOf("\n    if (\n      session?.phase ===",a);
assert(a>0&&b>a,"Actual Daily Check Verse Listen handler must be located");
const buttonSource=daily.slice(a,b);
assert(buttonSource.includes("verseListenButton.onclick") &&
       buttonSource.includes("playVerseAudio(verseId, {"),
  "Exercise the existing click body, not a test-invented substitute");
const injected=daily.replace(marker,`
  window.__r05 = {
    setSession(s){dailySession=s;}, getSession(){return dailySession;},
    paused(){return dailyQuestionsReturnPaused();},
    controller(){return dailyQuestionReturn;},
    bindVerseListen(wrap){${buttonSource}}
  };
${marker}`);

function fixture(ios=true) {
  const listeners={},events=[],docEvents={},attempts=[];
  let options,stops=0,renderCount=0,completionCount=0,exits=0;
  const doc={hidden:false,addEventListener(k,cb){docEvents[k]=cb;}};
  const overlay={
    pending:false,away:false,shown:0,pauses:0,
    isPaused(){return this.pending;},
    pauseFromNativeInactive() {
      if(!options.shouldPrompt())return false;
      this.away=true;
      if(!this.pending){this.pending=true;this.pauses++;options.onPause();}
      return true;
    },
    showAfterNativeActive() {
      if(!this.away)return false;
      this.away=false;
      if(this.pending){this.shown++;return true;}
      return false;
    },
    acknowledge(){
      if(!this.pending)return false;
      const result=options.onContinue();
      if(result===true)this.pending=false;
      return result;
    }
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:ios},
    Capacitor:{getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooNativeSound:{addListener(k,cb){
        listeners[k]=cb;return Promise.resolve({remove(){}});
      }}}},
    BibloZooWelcomeBackReturn:{attach(o){options=o;return overlay;}},
    BibloZooNativeDailyQuestionAudio:{stop(){events.push("stop-native-question");}},
    playVerseDetailListen(verseId,opts={}){
      events.push("verse-start:"+verseId);
      return new Promise((resolve,reject)=>attempts.push({verseId,opts,resolve,reject}));
    },
    addEventListener(k,cb){listeners["window:"+k]=cb;}
  };
  const sandbox={window:win,document:doc,
    Audio:class Audio{},
    setTimeout(){return 1;},clearTimeout(){},
    setInterval(){return 1;},clearInterval(){},
    cancelAnimationFrame(){},console};
  vm.runInNewContext(injected,sandbox,{filename:"actual daily_questions.js"});
  const api=win.BibloZooDailyQuestions;
  const session={phase:"verse",verseId:"john_3_16",verseRef:"John 3:16",
    verseText:"Test verse",verseAudioPlaying:false,usedVerseHelp:true,
    questionIndex:1,answered:false,earnedStarPegCount:2,
    showStarRewardPopup:false};
  win.__r05.setSession(session);
  let label=()=>"";
  const clickButton={onclick:null};
  const wrap={querySelector(s){return s==="[data-daily-verse-listen]"?clickButton:null;}};
  api.initialize({
    isEnabled:()=>true,isDailySessionActive:()=>true,
    renderApp(){renderCount++;events.push("render:"+
      (session.verseAudioPlaying?"Listening...":"Listen to the Verse"));},
    stopDailyAudio(){stops++;events.push("stop-verse");},
    goToTitle(){exits++;},
    updateDailyProgress(){completionCount++;}
  });
  win.__r05.bindVerseListen(wrap);
  assert.equal(typeof clickButton.onclick,"function");
  const tap=()=>clickButton.onclick({preventDefault(){},stopPropagation(){}});
  return {ios,doc,docEvents,events,attempts,overlay,session,win,
    get native(){return listeners.biblozooAppLifecycle;},
    get stops(){return stops;},get renders(){return renderCount;},
    get credits(){return completionCount;},get exits(){return exits;},tap,
    get blocked(){return win.__r05.paused();}};
}

async function tick(){for(let i=0;i<7;i++)await Promise.resolve();}
const lastRendered=events=>events.filter(e=>e.startsWith("render:")).at(-1);
async function testDaily() {
  const f=fixture();
  assert.equal(typeof f.native,"function","Native Daily lifecycle bound at init");
  f.native({active:true});
  assert.equal(f.overlay.pauses,0,"Initial active event not interruption");
  const first=f.tap();await tick();
  assert.equal(f.attempts.length,1);
  assert.equal(f.session.verseAudioPlaying,true);
  assert.equal(lastRendered(f.events),"render:Listening...");
  // UIKit goes inactive while held App Switcher still renders.
  assert.equal(f.doc.hidden,false);
  f.native({active:false,reason:"willResignActive"});
  f.native({active:false});
  assert.equal(f.overlay.pauses,1,"One standard Welcome Back for duplicate inactive");
  assert.equal(f.overlay.pending,true);
  assert.equal(f.session.phase,"verse","Question/verse panel preserved");
  assert.equal(f.session.questionIndex,1,"Question index preserved");
  assert.equal(f.session.earnedStarPegCount,2,"No new reward");
  assert.equal(f.session.verseAudioPlaying,false,"Stale Listening cleared immediately");
  assert.equal(lastRendered(f.events),"render:Listen to the Verse",
    "Visible WebKit button repainted as retry, not stale disabled Listening");
  assert.equal(f.stops,1,"Native published voice stopped");
  f.native({active:true,reason:"didBecomeActive"});
  assert.equal(f.overlay.shown,1,"Native return shows existing Welcome Back");
  assert.equal(f.overlay.pending,true,"Return never auto-replays");
  await f.tap();
  assert.equal(f.attempts.length,1,"Listen button behind Welcome Back is inert");
  assert.equal(f.overlay.acknowledge(),true);
  assert.equal(f.overlay.pending,false);
  const second=f.tap();await tick();
  assert.equal(f.attempts.length,2,"One new real tap starts native voice");
  assert.equal(f.session.verseAudioPlaying,true);
  f.attempts[0].resolve(false);await first;await tick();
  assert.equal(f.session.verseAudioPlaying,true,
    "Late cancelled voice cannot clear new attempt on same verse");
  assert.equal(lastRendered(f.events),"render:Listening...");
  f.attempts[1].resolve(true);await second;await tick();
  assert.equal(f.session.verseAudioPlaying,false,"Actual completed native verse resets Listen");
  assert.equal(lastRendered(f.events),"render:Listen to the Verse");
  assert.equal(f.credits,0,"No completion/grade from Listen or interruption");

  const external=fixture();
  const play=external.tap();await tick();
  external.attempts[0].opts.onInterrupted();
  assert.equal(external.overlay.pauses,1,
    "Genuine Apple Music takeover while UIKit active triggers Welcome Back");
  assert.equal(external.overlay.shown,1);
  assert.equal(external.session.verseAudioPlaying,false);
  assert.equal(external.stops,1);
  external.attempts[0].resolve(false);await play;
  assert.equal(external.session.verseAudioPlaying,false);
  external.native({active:false,reason:"audio-interruption"});
  external.native({active:true,reason:"audio-interruption"});
  assert.equal(external.overlay.pauses,1,"Native+source duplicate is idempotent");

  const error=fixture();
  const failure=error.tap();await tick();
  error.attempts[0].reject(new Error("native-decode"));
  await failure;await tick();
  assert.equal(error.overlay.pauses,0,
    "Real missing asset is a retryable file error, not fake Welcome Back");
  assert.equal(error.session.verseAudioPlaying,false);
  assert.equal(error.credits,0);
  const empty=fixture();
  empty.win.__r05.setSession(null);
  empty.native({active:false});
  assert.equal(empty.overlay.pauses,0,"No Daily popup on title/no session");
  const web=fixture(false);
  assert.equal(web.native,undefined,
    "Web/PWA/Android do not bind native Daily lifecycle");
  const webPlay=web.tap();await tick();
  web.attempts[0].resolve(true);await webPlay;
  assert.equal(web.session.verseAudioPlaying,false);
}

async function testNativePreview() {
  const first=app.indexOf("let verseDetailListenToken = 0;");
  const last=app.indexOf("// Verse-detail reference and verse segments must not bridge interruptions.",first);
  assert(first>=0&&last>first);
  const src=app.slice(first,last);
  new vm.Script(src);
  let onEvent,stops=0,interrupted=0;
  const Screen={DAILY_SESSION:"daily_session",VERSE_DETAIL:"detail",FLASHCARDS:"flashcards"};
  const State={screen:Screen.DAILY_SESSION};
  const win={
    BibloZooNativeLearnListen:{
      startFromGesture({onEvent:fn}){onEvent=fn;return Promise.resolve({ready:true});},
      stop(){stops++;}
    }
  };
  const audioEl={pause(){},currentTime:0,removeEventListener(){},addEventListener(){}};
  const doc={hidden:false,getElementById(){return null;}};
  const sandbox={window:win,document:doc,State,Screen,
    muted:false,audioEl,AUDIO_FILE:"test",AUDIO_DIR:"verse_audio/",
    isNativeLearnListenMode:()=>true,setAudioSrc(){},
    console,safePlay:()=>Promise.resolve()};
  vm.runInNewContext(src+
    ";window.__preview={playVerseDetailListen,cancelVerseDetailListen};",
    sandbox,{filename:"actual app.js native preview"});
  const firstPlay=win.__preview.playVerseDetailListen("john_3_16");
  assert.equal(typeof onEvent,"function");
  onEvent({kind:"playing",stage:"reference"});
  onEvent({kind:"completed",stage:"verse"});
  assert.equal(await firstPlay,true,
    "Real native ended on Daily Screen settles full verse, not stuck Listening");
  const interruptedPlay=win.__preview.playVerseDetailListen("john_3_16",{
    onInterrupted(){interrupted++;}
  });
  onEvent({kind:"interrupted",stage:"reference"});
  assert.equal(await interruptedPlay,false,"Native interruption settles Daily voice");
  assert.equal(interrupted,1,"Daily owner gets direct source interruption callback");
  assert.equal(stops>=1,true,"Previous native player stopped on next explicit Listen");
}

(async()=>{await testDaily();await testNativePreview();
  console.log("R05 PASS: Daily UIKit inactive and native verse events show single Welcome Back, clear Listening, retain session, block background tap, reject stale async completion, allow genuine retry, no fake credit and Web isolation.");
})().catch(e=>{console.error(e);process.exitCode=1;});
