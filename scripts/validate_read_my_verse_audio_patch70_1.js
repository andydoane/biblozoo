/* Patch 70.1 — targeted real-source simulated recovery checks. */
'use strict';
const assert = require('node:assert/strict');
const fs=require('fs');const path=require('path');const vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const source=read('read_my_verse.js');
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function equal(a,b,message){assert.strictEqual(a,b,message);checks++;}
async function flush(){for(let i=0;i<40;i++)await Promise.resolve();}
function harness({rejectMedia = false, muted = true} = {}) {
  const listeners = { doc: new Map(), win: new Map() };
  const elements = new Map();
  const timers = new Map();
  let timerIndex = 0;
  let profileCalls = 0, unlocks = 0, mediaPlays = 0, exits = 0;
  const audios = []; const contexts = [];
  class ToneContext {
    constructor(){this.currentTime=0;this.state='running';this.sources=[];
      this.destination={};this.closed=false;contexts.push(this);}
    resume(){this.state='running';return Promise.resolve();}
    close(){this.closed=true;this.state='closed';return Promise.resolve();}
    createOscillator(){const osc={type:'',frequency:{setValueAtTime(){}},connect(){},disconnect(){},
      start(){},stop(){},onended:null};this.sources.push(osc);return osc;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},
      exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  }
  const stats = { get profileCalls() {return profileCalls;}, get unlocks(){return unlocks;},
    get mediaPlays(){return mediaPlays;}, get exits(){return exits;} };
  const classList = () => {
    const values = new Set();
    return {add:s=>values.add(s),remove:s=>values.delete(s),
      contains:s=>values.has(s),toggle:(s,on)=>{if(on)values.add(s);else values.delete(s);}};
  };
  const makeOverlay = () => {
    const name = {textContent:''};
    const status = {textContent:'',hidden:true};
    const button = {textContent:'',disabled:false,onclick:null,attributes:{},
      setAttribute(k,v){this.attributes[k]=v;}};
    const title = {id:'verseGameWelcomeTitle'};
    const card = {classList:classList(),isConnected:true,setAttribute(){}};
    const picture = {hidden:true,src:'',getAttribute(){return this.src;},removeAttribute(){this.src='';}};
    const paw = {hidden:false};
    const back = {onclick:null};
    const nameLine = {style:{setProperty(){}}};
    const nodes = {
      '[data-welcome-back-card]':card,
      '[data-welcome-back-action]':button, '#readAudioResumeButton':button,
      '[data-welcome-back-status]':status, '#readAudioResumeStatus':status,
      '[data-welcome-back-name]':name,
      '[data-welcome-back-name-line]':nameLine,
      '[data-welcome-back-picture]':picture,
      '[data-welcome-back-picture-fallback]':paw,
      '.bz-welcome-title':title, '#readAudioResumeTitle':title,
      '#readAudioOverlayBack':back
    };
    const overlay = { hidden:true, id:'',className:'',innerHTML:'',
      setAttribute(k,v){this[k]=v;},querySelector:s=>nodes[s] || null };
    overlay.__parts = {name,status,button,title,card,picture,paw,back};
    return overlay;
  };
  const doc = {hidden:false,body:{appendChild(el){elements.set(el.id,el);}},
    getElementById:id=>elements.get(id)||null,
    createElement(tag){equal(tag,'div','overlay is a div');return makeOverlay();},
    addEventListener(name,fn){(listeners.doc.get(name)||listeners.doc.set(name,[]).get(name)).push(fn);},
    removeEventListener(){},querySelector(){return null;}
  };
  class Audio {
    constructor(src){this.src=src;this.currentTime=0;this.duration=3;this.paused=true;
      this.events={};this.ended=false;audios.push(this);}
    pause(){this.paused=true;} load(){} setAttribute(){} removeAttribute(){}
    addEventListener(type,callback){(this.events[type] ||= []).push(callback);}
    play(){mediaPlays++;this.paused=false;
      return rejectMedia ? Promise.reject(Object.assign(new Error('interrupted'),{name:'NotAllowedError'}))
        : Promise.resolve();}
  }
  const fakeWindow = {document:doc,Audio,AudioContext:ToneContext,
    BibloZooSafeWordScramble:{isSafeWord:()=>true},
    BibloZooProfiles:{getProfileById:id=>({name:'Sam Test',avatarVerseId:'v1'}),
      getActiveProfile:()=>({name:'Different'}),
      getProfilePictureSrc:()=> 'profile_pictures/v1.png',
      getProfilePictureFallbackSrc:()=> 'profile_pictures/default.png'},
    addEventListener(name,fn){(listeners.win.get(name)||listeners.win.set(name,[]).get(name)).push(fn);},
    setInterval:()=>1,clearInterval(){},
    setTimeout(fn,ms){const id=++timerIndex;timers.set(id,{fn,ms});return id;},
  };
  const context = {window:fakeWindow,document:doc,Audio,Promise,console,Math,Date,
    setTimeout:fakeWindow.setTimeout,clearTimeout(id){timers.delete(id);},
    setInterval:fakeWindow.setInterval, clearInterval:fakeWindow.clearInterval,
    requestAnimationFrame(){} };
  vm.createContext(context);
  vm.runInContext(read('verse_games/shared/welcome-back.js'),context);
  const originalPopulate = fakeWindow.BibloZooWelcomeBack.populate;
  fakeWindow.BibloZooWelcomeBack = {...fakeWindow.BibloZooWelcomeBack,
    populate(overlay,opts){profileCalls++;originalPopulate(overlay,opts);}}
  const hook='  return Object.freeze({';
  const pos=source.lastIndexOf(hook);
  check(pos>0,'production export boundary exists');
  const instrumented=source.slice(0,pos)+`  root.__patch70Probe = {
    state, pauseReadForInterruption, resumeReadAudioFromGesture,
    scheduleReadPauseTimer, stopAudio,
    get recovery(){return readAudioRecovery;},
    get pendingTask(){return readPauseTimerTask;},
    get attempt(){return readAudioRecoveryAttempt;},
    get toneContext(){return scrambleAudioContext;},
    playOrderTone,playBalloonAudio,watchBalloonNarration,finishBalloonAudio,
    get activeAudio(){return activeAudio;},
    setAnimatedScene(kind,scene){
      if (kind === "balloons") balloonSession = scene;
      else if (kind === "fish") fishSession = scene;
      else crawlSession = scene;
    }
  };\n`+source.slice(pos);
  vm.runInContext(instrumented,context,{filename:'read_my_verse.js'});
  const api = fakeWindow.BibloZooReadMyVerse;
  const probe = fakeWindow.__patch70Probe;
  api.initialize({isMuted:()=>muted,unlockAudio(){unlocks++;return Promise.resolve(true);},
    onContextExit(){exits++;},goToHome(){exits++;}});
  const setup = (activityId,phase) => {
    probe.state.verseId='psalm_1_1';probe.state.activityId=activityId;
    probe.state.context={profileId:'child-a'};probe.state.phase=phase;
    probe.state.chunks=['Blessed is the one'];probe.state.chunkAudioIndices=[0];
  };
  const fire = (kind,name) => {for (const fn of listeners[kind].get(name)||[])fn();};
  return {doc,elements,timers,listeners,fakeWindow,api,probe,stats,setup,fire,
    audios,contexts,
    async runTimer(ms){
      const pair=[...timers].find(([id,t])=>t.ms===ms);
      check(!!pair,`timer of ${ms}ms exists`);
      timers.delete(pair[0]);pair[1].fn();await flush();
    },
    overlay:()=>elements.get('readAudioResumeOverlay')};
}

async function run(){
  check(source.includes('waitReadMediaProgress'), 'media progress gate uses actual clock');
  check(source.includes('watchBalloonNarration'), 'Balloons completion watchdog installed');
  check(source.includes('prepareReadTonesFromGesture'), 'tone unlock owns Welcome Back tap');
  check(source.includes('monitorReadToneClock(context)'), 'running tone context is probed');
  check(source.includes('if (readToneClockProbe || root?.document?.hidden || readAudioRecovery)'),
    'tone clock probe does not work during recovery/background');

  // After a task switch during the reference, an accepted play() without
  // progressing time cannot unfreeze the scene or lose its next verse chunk.
  const t=harness({muted:false});
  t.setup('balloons','playing');
  t.probe.state.chunks=['first','second'];
  const scene={active:true,timers:new Set(),items:new Map(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return []}}};
  const ref={index:-1,audioStarted:false,audioDone:false,
    group:{classList:{add(){}},remove(){}}};
  scene.items.set(-1,ref);
  t.probe.setAnimatedScene('balloons',scene);
  t.probe.playBalloonAudio(scene,ref);
  const firstRef=t.probe.activeAudio;
  check(firstRef && firstRef.events.ended?.length,'reference audio started');
  t.doc.hidden=true;t.fire('doc','visibilitychange');
  equal(t.probe.recovery.kind,'animated','reference interruption is animated recovery');
  t.doc.hidden=false;t.fire('win','pageshow');
  check(t.overlay().__parts.button.onclick(),'reference restart initiated on tap');
  await flush();
  const resumedRef=t.probe.activeAudio;
  check(resumedRef && resumedRef!==firstRef,'narration restarted on deliberate tap');
  await t.runTimer(220);await t.runTimer(220);await t.runTimer(220);
  await t.runTimer(220);await t.runTimer(220);await t.runTimer(220);
  equal(t.probe.recovery.kind,'animated','stalled HTML clock cannot dismiss popup');
  equal(t.overlay().__parts.button.textContent,'Try again!','stalled media offers retry');
  check(!ref.audioDone,'reference not counted complete without narration');
  check(t.overlay().__parts.button.onclick(),'second tap can reattempt');
  await flush();
  const retryRef=t.probe.activeAudio;
  check(retryRef && retryRef!==resumedRef,'retry creates new reference media');
  retryRef.currentTime=.4;
  await t.runTimer(220);
  equal(t.probe.recovery,null,'advancing media permits scene to unfreeze');
  retryRef.events.ended[0]();
  check(ref.audioDone,'valid ended callback marks reference audio complete');
  check([...scene.timers].some(task=>task.remaining===200),
    'actual first chunk progression is queued after reference');

  // If narration starts but later freezes, don't leave the child watching
  // an empty screen indefinitely. Reuse the same popup for another tap.
  const stall=harness({muted:false});
  stall.setup('balloons','playing');
  stall.probe.state.chunks=['first','second'];
  const stalledScene={active:true,timers:new Set(),items:new Map(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return []}}};
  const stalledRef={index:-1,audioStarted:false,audioDone:false,
    group:{classList:{add(){}},remove(){}}};
  stalledScene.items.set(-1,stalledRef);
  stall.probe.setAnimatedScene('balloons',stalledScene);
  stall.probe.playBalloonAudio(stalledScene,stalledRef);
  const audio=stall.probe.activeAudio;
  audio.currentTime=.4;await stall.runTimer(1100);
  audio.currentTime=.4;await stall.runTimer(1100);
  audio.currentTime=.4;await stall.runTimer(1100);
  equal(stall.probe.recovery.kind,'animated','post-start stalled reference reopens Welcome Back');
  check(!stalledRef.audioDone,'stalled reference has not advanced lesson');
  stall.api.stopSession();
  equal(stall.probe.recovery,null,'leave cancels stall recovery');

  // The tone context is separate from HTML narration and app UI audio.
  // A return tap should validate it before clearing the prompt.
  const word=harness({muted:false});
  word.setup('tap_words_order','interacting');
  word.doc.hidden=true;word.fire('doc','visibilitychange');
  word.doc.hidden=false;word.fire('win','pageshow');
  check(word.overlay().__parts.button.onclick(),'word tone gesture starts');
  await flush();
  equal(word.probe.recovery.kind,'ack','tone recovery waits for clock movement');
  await word.runTimer(360);await word.runTimer(420);
  equal(word.probe.recovery.kind,'ack','running-but-frozen tone context keeps prompt');
  equal(word.overlay().__parts.button.textContent,'Try again!','tone retry is offered');
  equal(word.contexts[0].closed,true,'verified stalled tone context is retired');
  check(word.overlay().__parts.button.onclick(),'new context started by retry tap');
  await flush();
  word.contexts[1].currentTime=.25;
  await word.runTimer(360);
  equal(word.probe.recovery,null,'advancing replacement tone clock allows continuation');
  word.probe.playOrderTone(1);
  await flush();
  word.contexts[1].currentTime=.6;
  await word.runTimer(300);
  equal(word.probe.toneContext,word.contexts[1],'healthy tone context preserved');
  // Simulate later WebAudio stall on another word tap.
  word.probe.playOrderTone(2);
  await flush();
  await word.runTimer(300);await word.runTimer(350);
  equal(word.contexts[1].closed,true,'confirmed active-tone stall retires context');
  word.probe.playOrderTone(3);
  equal(word.contexts.length,3,'next deliberate word tap creates fresh context');

  // When WebKit omits the final ended event after reference audio reaches
  // its duration, a stable completed clock must still queue the first chunk.
  const missingEnd=harness({muted:false});
  missingEnd.setup('balloons','playing');
  missingEnd.probe.state.chunks=['first','second'];
  const missingScene={active:true,timers:new Set(),items:new Map(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return []}}};
  const missingRef={index:-1,audioStarted:false,audioDone:false,
    group:{classList:{add(){}},remove(){}}};
  missingScene.items.set(-1,missingRef);
  missingEnd.probe.setAnimatedScene('balloons',missingScene);
  missingEnd.probe.playBalloonAudio(missingScene,missingRef);
  const endingAudio=missingEnd.probe.activeAudio;
  endingAudio.currentTime=2.97;
  await missingEnd.runTimer(1100);
  await missingEnd.runTimer(1100);
  check(missingRef.audioDone,'missing native ended event cannot trap completed reference');
  check([...missingScene.timers].some(task=>task.remaining===200),
    'missing ended event still schedules next verse chunk once');
  missingEnd.api.stopSession();

  // Verse Crawl must preserve the existing deliberate 9-second music cue and
  // use a bounded soundtrack clock check on the original Let's go gesture.
  const crawl=harness({muted:false});
  crawl.setup('star_wars','animating');
  const crawlScene={active:true,timers:new Set(),items:new Map(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return []}}};
  crawl.probe.setAnimatedScene('star_wars',crawlScene);
  crawl.doc.hidden=true;crawl.fire('doc','visibilitychange');
  crawl.doc.hidden=false;crawl.fire('win','pageshow');
  check(crawl.overlay().__parts.button.onclick(),'Verse Crawl soundtrack starts on tap');
  await flush();
  const soundtrack=crawl.audios.find(a=>String(a.src).includes('verse_crawl_theme_ducked.mp3'));
  check(soundtrack && soundtrack.currentTime===9,
    'existing Verse Crawl resume cue is preserved');
  soundtrack.currentTime=9.5;
  await crawl.runTimer(220);
  equal(crawl.probe.recovery,null,'one tap succeeds after verified progressing soundtrack');
  crawl.api.stopSession();

  // Ensure user exit cancels work while a tone readiness check is pending.
  const leaving=harness({muted:false});
  leaving.setup('tap_words_order','interacting');
  leaving.doc.hidden=true;leaving.fire('doc','visibilitychange');
  leaving.doc.hidden=false;leaving.fire('win','pageshow');
  leaving.overlay().__parts.button.onclick();
  leaving.api.stopSession();
  await flush();
  check(leaving.overlay().hidden,'stale readiness result cannot reopen dismissed dialog');

  console.log(`Patch 70.1: ${checks} targeted real-source simulated checks passed`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
