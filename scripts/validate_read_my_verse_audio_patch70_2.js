/* Patch 70.2 — Tap Words in Order audio and chunk progression regression checks. */
'use strict';
const assert = require('node:assert/strict');
const fs=require('fs');const path=require('path');const vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const source=read('read_my_verse.js');
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function equal(a,b,message){assert.strictEqual(a,b,message);checks++;}
async function flush(){for(let i=0;i<40;i++)await Promise.resolve();}
function harness({rejectMedia = false, muted = true, toneStartsSuspended = false, toneResumeHangs = false} = {}) {
  const listeners = { doc: new Map(), win: new Map() };
  const elements = new Map();
  const timers = new Map();
  let timerIndex = 0;
  let profileCalls = 0, unlocks = 0, mediaPlays = 0, exits = 0;
  const audios = []; const contexts = [];
  class ToneContext {
    constructor(){this.currentTime=0;this.state=toneStartsSuspended ? 'suspended' : 'running';this.sources=[];
      this.destination={};this.closed=false;contexts.push(this);}
    resume(){if(toneResumeHangs)return new Promise(()=>{});this.state='running';return Promise.resolve();}
    close(){this.closed=true;this.state='closed';return Promise.resolve();}
    createOscillator(){const osc={type:'',frequency:{setValueAtTime(){}},connect(){},disconnect(){},
      start(){this.starts=(this.starts||0)+1;},stop(){this.stops=(this.stops||0)+1;},onended:null};this.sources.push(osc);return osc;}
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
    playOrderTone,playCurrentChunk,playBalloonAudio,watchBalloonNarration,finishBalloonAudio,
    get chunkWatch(){return chunkNarrationWatchdog;},
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
  check(source.includes('watchReadChunkNarration'),
    'read-my-verse includes owned chunk watchdog');
  check(source.includes('chunk-ended-fallback'),
    'missing chunk ended events are recovered at actual media end');
  check(source.includes('chunk-media-stalled'),
    'mid-chunk stalls prompt a deliberate retry instead of auto-advancing');
  check(source.includes('const toneReady = needsWordTones ? prepareReadTonesFromGesture()'),
    'chunk continuation prepares separate tone context on Welcome Back tap');
  check(source.includes('const startingSuspended = context.state === "suspended"'),
    'first word note can be queued on suspended context');
  check(source.includes('tone-first-gesture-expired'),
    'delayed first-gesture notes are canceled if audio never becomes ready');

  // First correct word press on an iPhone creates a suspended AudioContext.
  // It must enqueue that very note in the tap that requests resume.
  const first=harness({muted:false,toneStartsSuspended:true});
  first.setup('tap_words_order','interacting');
  equal(first.contexts.length,0,'no unnecessary context before first word');
  first.probe.playOrderTone(1);
  equal(first.contexts.length,1,'first word creates one context');
  check(first.contexts[0].sources.length===1 && first.contexts[0].sources[0].starts===1,
    'first note is scheduled instead of silently discarded');
  await flush();
  first.contexts[0].currentTime=.4;
  await first.runTimer(600);
  check(!first.contexts[0].sources[0].stops || first.contexts[0].sources[0].stops===1,
    'healthy first tap is not canceled');
  // Original scheduled stop counts as one; explicit cancellation would add one.
  equal(first.contexts[0].sources[0].stops,1,'healthy source retains original scheduled stop');

  // A new suspended context that never resumes must NOT play a note seconds
  // later when another activity has taken over. Its scheduled voice expires.
  const hung=harness({muted:false,toneStartsSuspended:true,toneResumeHangs:true});
  hung.setup('tap_words_order','interacting');
  hung.probe.playOrderTone(1);
  check(hung.contexts[0].sources[0].starts===1,'blocked first note initially queued');
  await hung.runTimer(600);
  equal(hung.contexts[0].sources[0].stops,2,
    'unavailable first note explicitly stopped at bounded deadline');
  hung.api.stopSession();

  // A skipped native media 'ended' event can no longer strand next chunk.
  const ended=harness({muted:false});
  ended.setup('tap_words_order','pause');
  ended.probe.state.chunks=['chunk one','chunk two','chunk three'];
  ended.probe.state.chunkAudioIndices=[0,1,2];
  ended.probe.playCurrentChunk();
  const almostDone=ended.probe.activeAudio;
  check(almostDone && ended.probe.chunkWatch,
    'spoken chunk has a completion watcher');
  almostDone.currentTime=2.97;
  await ended.runTimer(950);
  equal(ended.probe.state.chunkIndex,0,'one near-end observation does not advance');
  await ended.runTimer(950);
  equal(ended.probe.state.chunkIndex,1,'stable actual media-end advances exactly one chunk');
  equal(ended.probe.state.phase,'interacting','next word chunk is ready');
  check(!ended.probe.chunkWatch,'completion watcher removed');
  almostDone.events.ended[0]();
  equal(ended.probe.state.chunkIndex,1,'late native ended callback never double-advances');
  ended.api.stopSession();

  // A mid-chunk clock stall must not guess completion: freeze current chunk
  // and show the existing Welcome Back overlay for a user-initiated retry.
  const stuck=harness({muted:false});
  stuck.setup('tap_words_order','pause');
  stuck.probe.state.chunks=['first','second'];
  stuck.probe.state.chunkAudioIndices=[0,1];
  stuck.probe.playCurrentChunk();
  const incomplete=stuck.probe.activeAudio;
  incomplete.currentTime=.45;
  await stuck.runTimer(950);
  await stuck.runTimer(950);
  await stuck.runTimer(950);
  await stuck.runTimer(950);
  equal(stuck.probe.state.chunkIndex,0,'stalled incomplete audio cannot advance verse');
  equal(stuck.probe.recovery.kind,'chunk','stalled chunk opens recovery');
  check(stuck.overlay() && !stuck.overlay().hidden,'child can deliberately retry');
  check(incomplete.paused,'stalled narration stopped');
  stuck.api.stopSession();
  check(!stuck.probe.chunkWatch,'exit cancels outstanding chunk watcher');

  // After returning WHILE chunk narration was playing, Welcome Back prepares
  // BOTH the narration and the word-tone context, not only app UI audio.
  const resume=harness({muted:false});
  resume.setup('tap_words_order','pause');
  resume.probe.state.chunks=['first','second'];
  resume.probe.state.chunkAudioIndices=[0,1];
  resume.probe.playCurrentChunk();
  const before=resume.probe.activeAudio;
  resume.doc.hidden=true;resume.fire('doc','visibilitychange');
  equal(resume.probe.recovery.kind,'chunk','task switch saves current narration chunk');
  resume.doc.hidden=false;resume.fire('win','pageshow');
  check(resume.overlay().__parts.button.onclick(),'one Welcome Back gesture initiates both engines');
  await flush();
  const current=resume.probe.activeAudio;
  check(current && current!==before,'interrupted audio replaced only on tap');
  equal(resume.contexts.length,1,'word tone context prepared during narration recovery');
  current.currentTime=.35;
  resume.contexts[0].currentTime=.4;
  await resume.runTimer(220);
  await resume.runTimer(360);
  await flush();
  equal(resume.probe.recovery,null,'both ready clocks allow continuation');
  equal(resume.probe.state.chunkIndex,0,'no accidental chunk progression');
  resume.probe.playOrderTone(1);
  equal(resume.contexts[0].sources.length,1,
    'first word tone after narration recovery uses prepared context');
  resume.api.stopSession();

  // If spoken audio advances but the word-tone context does not, never
  // dismiss the popup and leave the very first word tap silent.
  const stalledTone=harness({muted:false});
  stalledTone.setup('tap_words_order','pause');
  stalledTone.probe.state.chunks=['first','second'];
  stalledTone.probe.playCurrentChunk();
  stalledTone.doc.hidden=true;stalledTone.fire('doc','visibilitychange');
  stalledTone.doc.hidden=false;stalledTone.fire('win','pageshow');
  stalledTone.overlay().__parts.button.onclick();
  await flush();
  stalledTone.probe.activeAudio.currentTime=.4;
  await stalledTone.runTimer(220);
  await stalledTone.runTimer(360);
  await stalledTone.runTimer(420);
  await flush();
  equal(stalledTone.probe.recovery.kind,'chunk',
    'stalled tone clock keeps same recovery prompt open');
  equal(stalledTone.probe.state.chunkIndex,0,'tone failure never advances verse');
  equal(stalledTone.overlay().__parts.button.textContent,'Try again!',
    'child sees existing retry action');
  check(stalledTone.probe.activeAudio===null,
    'unsuccessful combined recovery stops the narration');
  stalledTone.api.stopSession();

  console.log(`Patch 70.2: ${checks} real-source simulated checks passed`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
