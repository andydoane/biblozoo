#!/usr/bin/env node
"use strict";
/* R04 / LEARN-02: the actual app.js Missing Words return/controller code,
 * exercised under native UIKit INACTIVE while document.hidden is FALSE.
 * JS VM and source contracts; real held App Switcher remains owner acceptance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const app = read("app.js");
const css = read("styles.css");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const owner = read("verse_games/shared/welcome-back-return.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
for (const p of ["docs/PROJECT-HANDOFF.md", "docs/TESTING.md",
  "docs/IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md",
  "docs/IOS-OWNER-AUDIO-FINDINGS-2026-11-17.md"])
  assert(read(p).includes("R04"), p + " must maintain R04 handoff/acceptance");
assert(workflow.includes("node scripts/validate_r04_learn_missing_words_inactive_pause.js"));
assert(swift.includes('notifyListeners("biblozooAppLifecycle", data: ['));
assert(swift.includes('"active": false,') && swift.includes('"active": true,'));
assert(owner.includes("pauseFromNativeInactive") &&
       owner.includes("showAfterNativeActive") &&
       owner.includes("isPaused: () => pending"),
       "Use the existing one-button Welcome Back rather than making a new modal");
assert(app.includes('bridge.addListener("biblozooAppLifecycle", event =>'));
assert(app.includes('appActivityReturn?.pauseFromNativeInactive?.()'));
assert(app.includes('appActivityReturn?.showAfterNativeActive?.()'));
assert(app.includes("await waitForActiveLearnTime(180)") &&
       app.includes("waitForActiveLearnTime(900).then") &&
       app.includes("await waitForActiveLearnTime(0)") &&
       app.includes("waitForActiveLearnTime(promptHoldMs)") &&
       app.includes("waitForActiveLearnTime(promptFadeMs)"),
       "Metadata and hide-transition timers cannot advance while native-inactive");
assert(app.includes('releaseHideActivityVisuals();') &&
       app.includes('releaseHideActivityVisuals(State.screen === Screen.HIDE)'),
       "A stopped session or navigation must release frozen visual state");
assert(css.includes(".learn-hide-native-paused .learn-screen-remove *") &&
       css.includes("animation-play-state: paused !important"),
       "Missing Words CSS frames freeze even while WebKit is visible");
assert(app.includes('getAnimations?.({ subtree: true })') &&
       app.includes("animation.pause()") && app.includes("animation.play()"),
       "Running CSS transitions use their original WebAnimation checkpoint");
assert(!app.includes("AudioContext.resume() from UIKit inactive"));
const from=app.indexOf("// Patch 71: app-owned quiet activity return gate.");
const until=app.indexOf("function runAfterSlide(",from);
assert(from>=0 && until>from);
const source=app.slice(from,until);
new vm.Script(source);

function fixture(native=true) {
  let now=2000, opts, handler=null, pauses=0, shows=0, exits=0;
  const jobs=[], classes=new Set(), animations=[];
  const stage={
    getAnimations({subtree}) {
      assert.equal(subtree,true);
      return animations;
    }
  };
  function makeAnimation() {
    const anim={
      playState:"running", pauses:0, resumes:0,
      pause() {this.pauses++;this.playState="paused";},
      play() {this.resumes++;this.playState="running";}
    };
    animations.push(anim);
    return anim;
  }
  const first=makeAnimation(), transition=makeAnimation();
  const doc={
    hidden:false,
    documentElement:{classList:{
      add(x){classes.add(x);},
      remove(x){classes.delete(x);}
    }},
    querySelector(selector) {
      return selector===".learn-screen-remove" ? stage : null;
    }
  };
  const Screen={
    HIDE:"hide", FINAL_RECALL:"final_recall", TITLE:"title",
    TODO_DEV:"todo_dev", LISTEN:"listen", CHUNKS:"chunks"
  };
  const State={
    screen:Screen.HIDE, isSliding:false, todoInfoPage:"",
    sayVerseActive:true, sayVerseStartedAt:1000, sayVerseDurationMs:6000,
    hideAutoStarting:false, hideTransitionPhase:"", hideCount:2,
    finalRecallActive:false, finalRecallStartedAt:0, finalRecallDurationMs:0
  };
  const ctl={
    pending:false,away:false,
    isPaused(){return this.pending;},
    pauseFromNativeInactive() {
      if(!opts.shouldPrompt()) return false;
      this.away=true;
      if(!this.pending) {this.pending=true;pauses++;opts.onPause();}
      return true;
    },
    showAfterNativeActive() {
      if(!this.away)return false;
      this.away=false;
      if(this.pending){shows++;return true;}
      return false;
    },
    acknowledge(){
      if(!this.pending)return false;
      const ok=opts.onContinue();
      if(ok===true)this.pending=false;
      return ok;
    }
  };
  const win={
    BibloZooNativeOnlyOutput:{enabled:native},
    Capacitor:{
      getPlatform:()=>native?"ios":"web",
      Plugins:{BibloZooNativeSound:{
        addListener(name,fn) {
          assert.equal(name,"biblozooAppLifecycle");
          handler=fn;
          return Promise.resolve({remove(){}});
        }
      }}
    },
    BibloZooWelcomeBackReturn:{attach(options){opts=options;return ctl;}}
  };
  const sandbox={
    window:win,document:doc,State,Screen,
    performance:{now:()=>now},
    VERSE_ID:"test-verse",
    getBibloPetDisplayNameForVerseId:()=> "BibloPet",
    stopZooTodoTutorialPageAudio(){},
    go(screen){assert.equal(screen,Screen.TITLE);exits++;},
    setTimeout(fn,delay){jobs.push({fn,delay});return jobs.length;}
  };
  vm.runInNewContext(source+
    ";window.__r04={attachAppActivityReturn,shouldPromptAppActivityReturn,"+
    "getSayVersePct,getFinalRecallPct,waitForActiveLearnTime,"+
    "getPausedAt:()=>appReturnPausedAt};",
    sandbox,{filename:"actual app.js R04 activity return"});
  win.__r04.attachAppActivityReturn();
  assert(opts,"Native and browser both keep the same activity controller");
  async function step(ms=50) {
    now+=ms;
    const job=jobs.shift();
    if(job)job.fn();
    for(let i=0;i<6;i++)await Promise.resolve();
  }
  return {State,Screen,doc,ctl,opts,classes,first,transition,win,
    get handler(){return handler;},get pauses(){return pauses;},
    get shows(){return shows;},get exits(){return exits;},
    get now(){return now;},set now(x){now=x;},
    emit(event){handler?.(event);},step, get jobs(){return jobs;},
    clock:win.__r04};
}

(async function main(){
  const ios=fixture();
  assert.equal(typeof ios.handler,"function",
    "Native-only iOS connects the existing app lifecycle bridge on init");
  assert.equal(ios.ctl.pending,false);
  ios.emit({active:true,reason:"foreground"});
  assert.equal(ios.shows,0,"Ordinary active notification cannot invent Welcome Back");
  const pct=ios.clock.getSayVersePct();
  ios.emit({active:false,reason:"willResignActive"});
  ios.emit({active:false,reason:"willResignActive"});
  assert.equal(ios.pauses,1,"Duplicate UIKit events cause one pause");
  assert.equal(ios.ctl.pending,true,"Even visible WebKit enters paused state");
  assert.equal(ios.doc.hidden,false,"Held switcher leaves WebKit visible");
  assert.equal(ios.clock.getPausedAt(),2000,"Freeze starts on UIKit inactive");
  assert(ios.classes.has("learn-hide-native-paused"));
  assert.equal(ios.first.playState,"paused");
  assert.equal(ios.transition.playState,"paused");
  let finished=false;
  const clock=ios.clock.waitForActiveLearnTime(140).then(()=>{finished=true;});
  for(let i=0;i<12;i++)await ios.step(100);
  assert.equal(finished,false,"Missing Words cannot finish while UIKit inactive");
  assert.equal(ios.clock.getSayVersePct(),pct,
    "Visible app-switcher thumbnail keeps same Missing Words position");
  assert.equal(ios.State.hideCount,2,"No new hidden words/score credited");
  ios.emit({active:true,reason:"didBecomeActive"});
  assert.equal(ios.shows,1,"One standard Welcome Back appears on foreground");
  assert.equal(ios.ctl.pending,true,"UIKit return never auto-unpauses Learn");
  for(let i=0;i<3;i++)await ios.step(100);
  assert.equal(finished,false,"Still frozen until Let's go!, despite WebKit visible");
  assert.equal(ios.clock.getSayVersePct(),pct);
  assert.equal(ios.ctl.acknowledge(),true,"Child explicitly acknowledges return");
  assert.equal(ios.ctl.pending,false);
  assert.equal(ios.State.sayVerseStartedAt,2500,
    "Start timestamp shifts by exact paused duration, not elapsed game time");
  assert(!ios.classes.has("learn-hide-native-paused"));
  assert.equal(ios.first.resumes,1);
  assert.equal(ios.transition.resumes,1);
  assert.equal(ios.clock.getSayVersePct(),pct,
    "Position after Let's go! matches frozen frame");
  for(let i=0;i<10 && !finished;i++)await ios.step(50);
  await clock;
  assert.equal(finished,true,"Only active elapsed time completes pending exercise");
  ios.emit({active:true,reason:"didBecomeActive"});
  assert.equal(ios.shows,1,"Duplicate foreground cannot reopen prompt");

  const transition=fixture();
  transition.State.sayVerseActive=false;
  transition.State.hideTransitionPhase="out";
  assert.equal(transition.opts.shouldPrompt(),true,
    "Missing Words transition must also pause before timer starts");
  transition.emit({active:false});
  assert.equal(transition.ctl.pending,true);
  assert.equal(transition.State.hideTransitionPhase,"out");
  assert.equal(transition.State.hideCount,2);
  transition.emit({active:true});
  transition.ctl.acknowledge();
  assert.equal(transition.State.hideCount,2,"Acknowledgement cannot remove more words");
  transition.State.isSliding=true;
  assert.equal(transition.opts.shouldPrompt(),false,
    "Routine in-app navigation never triggers task-switch Welcome Back");
  transition.State.isSliding=false;

  const quiet=fixture();
  quiet.State.sayVerseActive=false;
  quiet.State.hideAutoStarting=false;
  quiet.State.hideTransitionPhase="";
  assert.equal(quiet.opts.shouldPrompt(),false,"Idle Missing Words is not timed activity");
  quiet.emit({active:false});
  assert.equal(quiet.pauses,0);
  quiet.State.screen=quiet.Screen.TITLE;
  quiet.emit({active:false});
  assert.equal(quiet.pauses,0,"Home/Title never receives a Learn prompt");
  quiet.State.screen=quiet.Screen.FINAL_RECALL;
  quiet.State.finalRecallActive=true;
  quiet.emit({active:false});
  assert.equal(quiet.pauses,0,"R04 does not change other activity owners");

  const web=fixture(false);
  assert.equal(web.handler,null,"Web/PWA/Android have no iOS lifecycle binding");
  assert.equal(web.ctl.pending,false);
  assert.equal(web.classes.size,0);
  console.log("R04 PASS: actual app.js native inactive while WebKit visible freezes clock, animations and transition; one Welcome Back, no auto-resume, only active time advances, Web and non-Learn isolation.");
})().catch(error=>{console.error(error);process.exitCode=1;});
