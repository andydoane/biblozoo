#!/usr/bin/env node
"use strict";
/* 72.1B: run actual Feeding recovery against simulated active rounds, plus
 * integration contracts for the 72.1A UI, all four modes, and exit paths. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
let checks=0;
const ok=(x,m)=>{assert.ok(x,m);checks++;};
const eq=(x,y,m)=>{assert.equal(x,y,m);checks++;};
const feed = read('daily_questions_feed_game.js');
const shared = read('verse_games/shared/welcome-back-zoo-escape.js');
const css = read('daily_questions_feed_game.css');
const daily = read('daily_questions.js');
const app = read('app.js');
const sw = read('service-worker.js');
const mark='  window.BibloZooDailyFeedGame = Object.freeze({';
eq(feed.split(mark).length,2,'single Feeding game module export');
const instrumented=feed.replace(mark, `
  window.__FeedZooHooks = {
    setActive: value => { activeRuntime = value; },
    getActive: () => activeRuntime,
    pauseFeedingGame, continueFeedingAfterGesture,
    attemptFeedingResumeFromGesture, setFeedingResumeStatus,
    zooEscapeSoundReady, playZooEscapeSound, playStarSound,
    setPreparedStarBuffer: value => { preparedStarBuffer = value; },
    stop, attachFeedInterruptionHandlers, detachFeedInterruptionHandlers
  };
${mark}`);
function fakeHarness() {
  let calls=[];
  const window={AudioContext:function AudioContext(){return makeContext(true);},
    webkitAudioContext:null, location:{protocol:'https:'},
    addEventListener(){},removeEventListener(){},
    BibloZooWelcomeBack:{populate(){calls.push('populated');},setAction(){calls.push('old-action');}},
    BibloZooAudioDiagnostics:{record(t,info){calls.push(t);}},
    BibloZooAudioRecoveryCoordinator:{isAvailable(){return false;}},
    BibloZooNativeAudioRecovery:{isEnabled(){return false;}}
  };
  const document={hidden:false,addEventListener(){},removeEventListener(){}};
  const sandbox={window,document,console,
    setTimeout,clearTimeout,performance:{now:()=>Date.now()},
    requestAnimationFrame:()=>17,cancelAnimationFrame(){},
    fetch:()=>Promise.reject(Error('no network')),
    Image:class{},Audio:class{pause(){} load(){} play(){return Promise.resolve();}}
  };
  vm.createContext(sandbox);
  vm.runInContext(instrumented,sandbox,{filename:'daily_questions_feed_game.js'});
  return {hooks:window.__FeedZooHooks,window,document,calls};
}
function makeContext(advancing) {
  const born=Date.now();
  return {state:'running', get currentTime(){return advancing ? 10+(Date.now()-born)/1000 : 10;},
    resume(){return Promise.resolve();}, close(){this.state='closed';return Promise.resolve();},
    destination:{},createGain(){return {connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}};},
    createOscillator(){return {type:'sine',frequency:{setValueAtTime(){}},connect(){},addEventListener(){},start(){},stop(){}};},
    createBufferSource(){return {buffer:null,connect(){},addEventListener(){},start(){},stop(){}};}
  };
}
function makeRuntime(mode, audioContext) {
  const classed=[];
  let starts=0;
  let hides=0;
  const overlay={hidden:true};
  Object.defineProperty(overlay,'hidden',{get(){return hides===0?false:this._hidden;},set(v){this._hidden=v;hides+=v?1:0;}});
  overlay._hidden=false;
  const runtime={mode,active:true,roundStarted:true,running:true,finished:false,
    modeController:{handleInput(){},update(){},draw(){}},
    audioContext,modeTimers:new Set(),feedSoundNodes:new Set(),
    feedPausedAt:null,feedResumePending:false,feedResumeGeneration:0,
    feedFrameGeneration:0,feedPageHidden:false,feedAudioNeedsFreshContext:false,
    feedAudioReplacements:0,feedAudioLastReplacementAt:0,
    feedAudioRecoveryVerified:false,
    gameEl:{classList:{add(s){classed.push('+'+s);},remove(s){classed.push('-'+s);}}},
    resumeOverlay:overlay, resumeButton:{disabled:false},resumeStatus:{hidden:true,textContent:''},
    stage:{releasePointerCapture(){}},
    balls:[{bornAt:Date.now()-500,trail:[]}],bursts:[],
    lastFrameAt:Date.now(),nextScheduledAt:Date.now()+1500,
    rafId:0,tiltEnabled:false,feedSoundNodes:new Set(),
    melody:mode==='melody'?{pausedAt:null,startTime:Date.now()-1000,activeVoices:new Set()}:null,
    zooEscape:{isPaused(){return true;},start(){starts++;}}
  };
  return {runtime,results:{classed, get starts(){return starts;},get hides(){return hides;}}};
}
async function verifyMode(mode) {
  const h=fakeHarness();
  const {runtime,results}=makeRuntime(mode,makeContext(true));
  h.hooks.setActive(runtime);
  const ballX=runtime.balls[0].bornAt, due=runtime.nextScheduledAt;
  ok(h.hooks.pauseFeedingGame(runtime,Date.now()-1900),mode+' paused active round');
  eq(results.starts,1,mode+' opens Zoo Escape precisely once');
  eq(runtime.feedAudioRecoveryVerified,false,mode+' paused round not yet declared recovered');
  eq(runtime.resumeOverlay.hidden,false,mode+' overlay visible');
  ok(!h.hooks.pauseFeedingGame(runtime),mode+' repeated pagehide does not restart round');
  const result=await new Promise(resolve=>h.hooks.attemptFeedingResumeFromGesture(runtime,resolve));
  eq(result,true,mode+' advancing clock allows verified gesture');
  eq(runtime.feedPausedAt,null,mode+' round continues');
  eq(runtime.feedAudioRecoveryVerified,true,mode+' verified flag set');
  eq(runtime.resumeOverlay.hidden,false,mode+' shared controller owns overlay dismissal');
  ok(runtime.nextScheduledAt>due,mode+' gameplay deadline shifted');
  ok(runtime.balls[0].bornAt>ballX,mode+' ball timeline shifted');
  ok(results.classed.includes('-is-interruption-paused'),mode+' game unpaused');
  if(mode==='melody') eq(runtime.melody.pausedAt,null,'Melody musical clock re-enabled');
  eq(h.calls.includes('feed-audio-resume-verified'),true,mode+' logs verified event');
  h.hooks.setActive(null);
}
async function verifyFrozenClock(mode) {
  const h=fakeHarness();
  const {runtime,results}=makeRuntime(mode,makeContext(false));
  h.hooks.setActive(runtime);
  h.hooks.pauseFeedingGame(runtime,Date.now()-1500);
  const result=await new Promise(resolve=>h.hooks.attemptFeedingResumeFromGesture(runtime,resolve));
  eq(result,false,mode+' stalled clock rejected');
  ok(runtime.feedPausedAt!==null,mode+' stalled round stays frozen');
  eq(runtime.feedAudioRecoveryVerified,false,mode+' failed clock not marked verified');
  eq(runtime.resumeOverlay.hidden,false,mode+' no unauthorized UI dismissal');
  eq(runtime.resumeStatus.hidden,true,mode+' hidden error text while Zoo Escape owns UI');
  eq(runtime.feedAudioNeedsFreshContext,true,mode+' next gesture can replace failed context');
  eq(results.starts,1,mode+' no automatic retry/gameplay restart');
  ok(h.calls.includes('feed-audio-resume-failed'),mode+' diagnostic logs failed recovery');
  h.hooks.setActive(null);
}
function staticContracts(){
 for(const mode of ['classic','labyrinth','melody','bounce']){
  ok(feed.includes(`[FEED_MODES.${mode.toUpperCase()}]`),mode+' registered');
 }
 for(const text of ['window.BibloZooZooEscape.create({','recover: () => {',
   'attemptFeedingResumeFromGesture(runtime, resolve)','runtime.zooEscape?.start?.()',
   'runtime.zooEscape?.destroy?.()','runtime.onRecoveryExitToZoo || runtime.onBackToZoo',
   'soundIsReady: () => zooEscapeSoundReady(runtime)',
   'if (!runtime.zooEscape) {','const continued = continueFeedingAfterGesture(runtime,',
   'report(continued)','feed-bounce-bonus-clock-check'])
   ok(feed.includes(text),'Feeding Zoo Escape integration: '+text);
 ok(feed.indexOf('attemptFeedingResumeFromGesture(runtime, resolve)')>
    feed.indexOf('window.BibloZooZooEscape.create({'),'gesture handler wired into Feeding owner');
 ok(shared.includes('MAX_ATTEMPTS = 3'),'shared recovery cap three gestures');
 ok(shared.includes('SPAWN_MS = 1000')&&shared.includes('MAX_PETS = 10'),'up to ten overlapping pets');
 ok(shared.includes('EMERGE_MS = 750'),'protected emergence retained');
 ok(css.includes('.daily-feed-resume-overlay .bz-zoo-exit { display: none !important; }'),
    'Feeding reuses native Back pill without changing popup height');
 ok(daily.includes('onRecoveryExitToZoo: () => {'),'Daily Questions offers explicit abort');
 ok(daily.includes('clearSessionState();')&&daily.includes('appApi?.goToTitle?.();'),
    'Daily Questions emergency exit returns title, not award completion');
 ok(app.includes('onBackToZoo: () => {'),'Daily snack returns title through current callback');
 ok(!feed.includes('AVAudioSessionCategoryPlayback'),'SoloAmbient policy untouched by Feeding');
 ok(/const CACHE_VERSION = "[^"]*patch72_1/.test(sw) &&
    sw.includes('"./daily_questions_feed_game.js"') &&
    sw.includes('"./verse_games/shared/welcome-back-zoo-escape.js"'),
    'Versioned PWA precaches current Feeding and Zoo Escape source');
}
async function main(){
 staticContracts();
 for(const mode of ['classic','labyrinth','melody','bounce']) await verifyMode(mode);
 for(const mode of ['classic','labyrinth','melody','bounce']) await verifyFrozenClock(mode);
 const h=fakeHarness();
 const {runtime}=makeRuntime('bounce',makeContext(false));
 h.hooks.setActive(runtime);
 h.hooks.pauseFeedingGame(runtime);
 runtime.feedResumePending=true;
 const invalid=await new Promise(resolve=>h.hooks.attemptFeedingResumeFromGesture(runtime,resolve));
 eq(invalid,false,'concurrent gesture rejected and settled');
 eq(runtime.feedResumePending,true,'concurrent gesture cannot overwrite in-flight attempt');
 h.hooks.setActive(null);
 // Bounce bonus audio must diagnose a stalled clock without an automatic
 // recovery attempt. An advancing clock must not interrupt the round.
 for(const moving of [true,false]) {
   const b=fakeHarness();
   const {runtime:ball}=makeRuntime('bounce',makeContext(moving));
   b.hooks.setActive(ball);
   b.hooks.setPreparedStarBuffer({bonus:true});
   b.hooks.playStarSound(ball);
   await new Promise(resolve=>setTimeout(resolve,240));
   ok(b.calls.includes('feed-bounce-bonus-sound-start'),'bonus event recorded');
   ok(b.calls.includes('feed-bounce-bonus-clock-check'),'bonus clock check recorded');
   if(moving) {
     eq(ball.feedPausedAt,null,'healthy bonus sound does not pause Bounce');
   } else {
     ok(ball.feedPausedAt!==null,'stalled bonus sound pauses active Bounce');
     eq(ball.feedAudioRecoveryVerified,false,'bonus stall cannot claim recovery');
   }
   b.hooks.setActive(null);
 }
 console.log(`Patch 72.1B Feeding Zoo Escape validation: ${checks} checks passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
