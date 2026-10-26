/* Patch 70: real Read My Verse lifecycle/controller code in an isolated DOM and
 * media harness. This is not an iPhone audible-output or animation test. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const source = read('read_my_verse.js');
const styles = read('read_my_verse.css');
const sharedStyle = read('verse_games/shared/welcome-back.css');
let checks = 0;
function check(value, description) { assert.ok(value, description); checks++; }
function equal(a, b, description) { assert.equal(a, b, description); checks++; }
async function flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); }

function harness({rejectMedia = false, muted = true} = {}) {
  const listeners = { doc: new Map(), win: new Map() };
  const elements = new Map();
  const timers = new Map();
  let timerIndex = 0;
  let profileCalls = 0, unlocks = 0, mediaPlays = 0, exits = 0;
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
    constructor(src){this.src=src;this.currentTime=0;this.paused=true;this.events={};}
    pause(){this.paused=true;} load(){} setAttribute(){} removeAttribute(){}
    addEventListener(type,callback){(this.events[type] ||= []).push(callback);}
    play(){mediaPlays++;this.paused=false;
      return rejectMedia ? Promise.reject(Object.assign(new Error('interrupted'),{name:'NotAllowedError'}))
        : Promise.resolve();}
  }
  const fakeWindow = {document:doc,Audio,
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
    overlay:()=>elements.get('readAudioResumeOverlay')};
}

async function run() {
  check(sharedStyle.includes('background: #ffc751'), 'yellow design remains in shared CSS');
  check(sharedStyle.includes('.bz-welcome-name { color: #ffffff; }'), 'zookeeper name remains white');
  check(!styles.includes('.read-audio-resume-card {') && !styles.includes('#readAudioResumeButton {'),
    'old independent card and button styles have been removed');
  check(source.includes('root?.BibloZooWelcomeBack?.markup?.("game")'),
    'Read My Verse consumes the real shared markup');
  check(source.includes('root?.BibloZooWelcomeBack?.populate?.(overlay'),
    'zookeeper identity is refreshed when shown');
  equal((source.match(/addEventListener\?\.\("visibilitychange"/g)||[]).length,1,
    'only the existing Read My Verse lifecycle listener is installed');
  const t=harness();
  equal(t.listeners.doc.get('visibilitychange').length,1,'only one visibility listener');
  equal(t.listeners.win.get('pagehide').length,1,'only one pagehide listener');
  equal(t.listeners.win.get('pageshow').length,1,'only one pageshow listener');
  check(!t.overlay(),'no prompt on initial launch');
  t.setup('unscramble','interacting');
  let advanced=0;
  t.probe.scheduleReadPauseTimer(()=>{advanced++;},440);
  equal(t.timers.size,1,'progression timer scheduled');
  t.doc.hidden=true;t.fire('doc','visibilitychange');
  equal(t.probe.recovery.kind,'ack','quiet activity gets acknowledgement only');
  equal(t.probe.state.phase,'interacting','quiz phase is unchanged by the popup');
  equal(t.timers.size,0,'progression timer freezes offscreen');
  t.fire('win','pagehide');
  equal(t.probe.recovery.kind,'ack','duplicate hidden notification does not replace recovery');
  t.doc.hidden=false;t.fire('doc','visibilitychange');t.fire('win','pageshow');
  const overlay=t.overlay();
  check(overlay && !overlay.hidden,'return displays one visible overlay');
  check(overlay.innerHTML.includes('data-welcome-back-picture'), 'actual shared popup includes avatar');
  check(overlay.innerHTML.includes('data-welcome-back-name'), 'actual shared popup includes zookeeper name');
  equal(overlay.__parts.name.textContent,'Sam Test','child name is populated from selected profile');
  equal(overlay.__parts.button.textContent,"Let's go!",'shared action is child friendly');
  check('data-no-ui-sound' in overlay.__parts.button.attributes,
    'Welcome Back gesture suppresses unrelated global UI audio');
  equal(t.stats.mediaPlays,0,'quiet return has not replayed narration');
  equal(t.timers.size,0,'progression stays frozen until button tap');
  equal(overlay.__parts.button.onclick(),true,'one gesture acknowledges return');
  equal(t.probe.recovery,null,'acknowledgement dismisses recovery');
  check(overlay.hidden,'dialog is hidden on acknowledgement');
  equal(t.probe.state.phase,'interacting','quiet gameplay resumes without resetting phase');
  equal(t.timers.size,1,'progression timer is rearmed with remaining time');
  const entry=[...t.timers.values()][0];
  check(entry.ms>0 && entry.ms<=440,'timer keeps unspent remainder');
  entry.fn();t.timers.clear();
  equal(advanced,1,'progression callback executes once after acknowledgement');
  equal(t.stats.mediaPlays,0,'acknowledgement does not start narration');
  t.doc.hidden=true;t.fire('doc','visibilitychange');
  t.doc.hidden=false;t.fire('win','pageshow');
  equal(t.overlay(),overlay,'repeated task switch reuses one dialog');
  t.api.stopSession();
  check(overlay.hidden,'leaving session hides popup');
  equal(t.probe.recovery,null,'session exit cancels pending recovery');
  equal(t.probe.state.phase,'idle','session exit resets once');

  const chunk=harness({muted:true});
  chunk.setup('typewriter','playing');
  chunk.doc.hidden=true;chunk.fire('doc','visibilitychange');
  equal(chunk.probe.recovery.kind,'chunk','active narration uses existing chunk owner');
  equal(chunk.probe.state.phase,'pause','narration playback is paused');
  chunk.doc.hidden=false;chunk.fire('win','pageshow');
  equal(chunk.stats.mediaPlays,0,'narration is not restarted just by returning');
  const recover=chunk.overlay().__parts.button.onclick();
  equal(recover,true,'single deliberate tap starts existing chunk path');
  await flush();
  equal(chunk.probe.recovery,null,'verified muted-path completion dismisses overlay');
  equal(chunk.probe.state.chunkIndex,0,'chunk index is not skipped');
  equal(chunk.probe.state.phase,'playing','chunk playback path resumes');
  check(chunk.timers.size>0,'chunk completion remains scheduled for later');

  const animated=harness({muted:true});
  animated.setup('balloons','animating');
  const clock={currentTime:55,paused:false,
    pause(){this.paused=true;},play(){this.paused=false;}};
  const timeline={startMs:1000};
  const scene={active:true,timers:new Set(),wordTracks:[timeline],balloonTracks:[],
    wrap:{classList:{add(x){this.value=x;},remove(x){this.value='';}},
      getAnimations(){return [clock];}}};
  animated.probe.setAnimatedScene('balloons',scene);
  animated.doc.hidden=true;animated.fire('doc','visibilitychange');
  equal(animated.probe.recovery.kind,'animated','Balloons retains its scene-owned recovery');
  equal(clock.paused,true,'actual CSS animation timeline is paused');
  equal(clock.currentTime,55,'animation time is saved before background');
  animated.doc.hidden=false;animated.fire('win','pageshow');
  equal(clock.currentTime,55,'return cannot advance animation behind the popup');
  check(animated.overlay().__parts.button.onclick(),'Balloons continues from the gesture');
  await flush();
  equal(animated.probe.recovery,null,'Balloons scene is released only after continuation');
  equal(clock.paused,false,'animation is unpaused after acknowledgment');
  equal(clock.currentTime,55,'animation resumes at the original timeline position');
  equal(animated.probe.state.chunkIndex,0,'Balloons chunk index is preserved');
  equal(animated.stats.mediaPlays,0,'no unexpected narration is launched in a silent scene');

  const failure=harness({rejectMedia:true,muted:false});
  failure.setup('typewriter','playing');
  failure.doc.hidden=true;failure.fire('doc','visibilitychange');
  failure.doc.hidden=false;failure.fire('win','pageshow');
  const failureOverlay=failure.overlay();
  check(failureOverlay.__parts.button.onclick(), 'unmuted audio recovery begins within button gesture');
  await flush();
  equal(failure.probe.recovery.kind,'chunk','failed media remains in recovery state');
  check(!failureOverlay.hidden,'failed playback keeps overlay open');
  equal(failureOverlay.__parts.button.textContent,'Try again!','shared retry label replaces old Resume Audio');
  equal(failureOverlay.__parts.button.disabled,false,'failure releases disabled button');
  equal(failure.probe.state.chunkIndex,0,'failed narration does not advance chunk');
  failureOverlay.__parts.back.onclick();
  equal(failure.probe.recovery,null,'Back cancels failed recovery');
  check(failureOverlay.hidden,'Back hides old popup');
  check(failure.stats.exits>0,'Back leaves activity using original exit handler');
  console.log(`Patch 70: ${checks} behavioral / integration checks passed`);
}
run().catch(error=>{console.error(error);process.exitCode=1;});
