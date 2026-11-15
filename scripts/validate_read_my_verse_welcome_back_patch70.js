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

function harness({rejectMedia = false, rejectSources = [], rejectNarration = false,
    muted = true, zoo = false, progressMedia = false} = {}) {
  const listeners = { doc: new Map(), win: new Map() };
  const elements = new Map();
  const timers = new Map();
  let timerIndex = 0;
  let profileCalls = 0, unlocks = 0, mediaPlays = 0, exits = 0;
  const playedSources = [];
  const stats = { get profileCalls() {return profileCalls;}, get unlocks(){return unlocks;},
    get mediaPlays(){return mediaPlays;}, get exits(){return exits;},
    get playedSources(){return playedSources;} };
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
    constructor(src){this.src=src;this._time=0;this.paused=true;this.events={};}
    get currentTime(){if(progressMedia&&!this.paused)this._time+=0.06;return this._time;}
    set currentTime(value){this._time=Number(value)||0;}
    pause(){this.paused=true;} load(){} setAttribute(){} removeAttribute(){}
    addEventListener(type,callback){(this.events[type] ||= []).push(callback);}
    play(){mediaPlays++;playedSources.push(this.src);this.paused=false;
      return rejectMedia || rejectSources.includes(this.src) ||
        (rejectNarration && this.src?.startsWith('./verse_audio/'))
        ? Promise.reject(Object.assign(new Error('interrupted'),{name:'NotAllowedError'}))
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
  let zooController = null;
  if (zoo) {
    fakeWindow.BibloZooZooEscape = {create(options) {
      let pending = false;
      zooController = {
        start() { pending = true; },
        isPaused() { return pending; },
        getStage() { return pending ? "welcome" : "recovered"; },
        async verifiedTap(plannedSurprise = null) {
          return options.recover({ plannedSurprise });
        },
        beginEscape() { options.onSurpriseStart?.("escape"); },
        finishEscape() { pending = false; options.onRecovered?.(); },
        exit() { pending = false; options.onExit?.(); }
      };
      return zooController;
    }};
  }
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
    get verified(){return readZooVerifiedRecovery;},
    get crawlMusic(){return crawlMusic;},
    setAnimatedScene(kind,scene){
      if (kind === "balloons") balloonSession = scene;
      else if (kind === "fish") fishSession = scene;
      else crawlSession = scene;
    },
    setAnimatedNarration(session, item){
      readActiveAnimatedNarration = {session, item};
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
  const runShortTimers = () => {
    for(const [id,entry] of [...timers]) {
      if(entry.ms<=100){timers.delete(id);entry.fn();}
    }
  };
  return {doc,elements,timers,listeners,fakeWindow,api,probe,stats,setup,fire,
    runShortTimers,
    get zoo(){return zooController;},
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


  // Zoo Escape is an additional pause gate after sound is verified: all
  // eight Read activities share these timer/animation/continuation owners.
  const quietZoo=harness({zoo:true,muted:true});
  quietZoo.setup('unscramble','interacting');
  let quietAdvanced=0;
  quietZoo.probe.scheduleReadPauseTimer(()=>{quietAdvanced++;},440);
  quietZoo.doc.hidden=true;quietZoo.fire('doc','visibilitychange');
  quietZoo.doc.hidden=false;quietZoo.fire('win','pageshow');
  check(!!quietZoo.zoo,'Read opened the actual owner Zoo interface');
  equal(await quietZoo.zoo.verifiedTap(),true,'quiet Read audio/ack verification succeeds');
  equal(quietZoo.probe.recovery.kind,'ack','verified Read still owns recovery until Zoo ends');
  equal(quietZoo.timers.size,0,"no timer rearmed just because Let's go audio passed");
  quietZoo.zoo.beginEscape();
  equal(quietZoo.probe.recovery.kind,'ack','pet escape keeps same reading session frozen');
  equal(quietZoo.timers.size,0,'timer cannot advance under escaped pets');
  quietZoo.zoo.finishEscape();
  equal(quietZoo.probe.recovery,null,'pen/LOCK GATE releases successful Read recovery');
  equal(quietZoo.timers.size,1,'timer rearmed only after pen/LOCK GATE');
  equal(quietAdvanced,0,'no silent interim progress');
  [...quietZoo.timers.values()][0].fn();
  equal(quietAdvanced,1,'timer resumes once, not twice');

  const animatedZoo=harness({zoo:true,muted:true});
  animatedZoo.setup('balloons','animating');
  const zooClock={currentTime:55,paused:false,
    pause(){this.paused=true;},play(){this.paused=false;}};
  const zooScene={active:true,timers:new Set(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return [zooClock];}}};
  animatedZoo.probe.setAnimatedScene('balloons',zooScene);
  animatedZoo.doc.hidden=true;animatedZoo.fire('doc','visibilitychange');
  animatedZoo.doc.hidden=false;animatedZoo.fire('win','pageshow');
  check(animatedZoo.zoo.verifiedTap(),'Balloons owner begins verification');
  await flush();
  check(!!animatedZoo.probe.verified,'Balloons verified but not resumed');
  equal(zooClock.paused,true,"Balloons stays frozen after Let's go");
  animatedZoo.zoo.beginEscape();
  equal(zooClock.paused,true,'Balloons stays paused while pet is out');
  animatedZoo.zoo.finishEscape();
  equal(zooClock.paused,false,'Balloons resumes only at LOCK GATE');
  equal(animatedZoo.probe.recovery,null,'Balloons recovery released after escape');

  const crawlZoo=harness({zoo:true,muted:true});
  crawlZoo.setup('star_wars','animating');
  const crawlClock={currentTime:95,paused:false,
    pause(){this.paused=true;},play(){this.paused=false;}};
  const crawlScene={active:true,timers:new Set(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return [crawlClock];}}};
  crawlZoo.probe.setAnimatedScene('star_wars',crawlScene);
  crawlZoo.doc.hidden=true;crawlZoo.fire('doc','visibilitychange');
  crawlZoo.doc.hidden=false;crawlZoo.fire('win','pageshow');
  check(crawlZoo.zoo.verifiedTap(),'Crawl owner begins verified HTML media restart');
  await flush();
  check(!!crawlZoo.probe.verified,'Crawl soundtrack verified but scene still held');
  equal(crawlClock.paused,true,'Crawl text does not scroll behind Welcome Back');
  check(crawlZoo.probe.crawlMusic?.audio,'Crawl soundtrack is an actual audio element');
  crawlZoo.zoo.beginEscape();
  equal(crawlZoo.probe.crawlMusic.audio.paused,true,
    'Crawl soundtrack pauses while escaped pet is being rescued');
  equal(crawlClock.paused,true,'Crawl animation does not scroll under escaped pet');
  crawlZoo.zoo.finishEscape();
  equal(crawlClock.paused,false,'Crawl resumes its animation after final lock');
  equal(crawlZoo.probe.crawlMusic.audio.paused,false,
    'Crawl soundtrack resumes from real pen/LOCK GATE gesture');
  equal(crawlZoo.probe.recovery,null,'Crawl releases recovery after escape');

  // The new cue must be the ONLY initial playback when a Crawl escape is
  // preselected; the final real LOCK GATE must start verified Crawl music.
  const cueCrawl=harness({zoo:true,muted:false,progressMedia:true});
  cueCrawl.setup('star_wars','animating');
  const cueAnimation={currentTime:95,paused:false,
    pause(){this.paused=true;},play(){this.paused=false;}};
  const cueScene={active:true,timers:new Set(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return [cueAnimation];}}};
  cueCrawl.probe.setAnimatedScene('star_wars',cueScene);
  cueCrawl.doc.hidden=true;cueCrawl.fire('doc','visibilitychange');
  cueCrawl.doc.hidden=false;cueCrawl.fire('win','pageshow');
  const firstCueTap=cueCrawl.zoo.verifiedTap('escape');
  await flush();cueCrawl.runShortTimers();
  equal(await firstCueTap,true,'pet cue proves actual media progress before escape');
  equal(cueCrawl.stats.playedSources.length,1,
    'only one clip plays before the pet escapes');
  equal(cueCrawl.stats.playedSources[0],'./ui_audio/ui_pet_unlock.mp3',
    'the exact original BibloPet unlock clip replaces audible Crawl restart');
  equal(cueCrawl.probe.crawlMusic,null,'soundtrack never begins at initial escape tap');
  check(cueCrawl.probe.verified?.cueOnly,'initial proof is tagged as cue-only');
  equal(cueAnimation.paused,true,'Crawl animation remains frozen under cue');
  cueCrawl.zoo.beginEscape();
  cueCrawl.zoo.finishEscape();
  equal(cueCrawl.probe.recovery.kind,'animated',
    'final LOCK GATE cannot thaw the original scene on a playback request');
  await flush();
  equal(cueCrawl.probe.recovery,null,
    'only the separately verified real soundtrack releases the scene');
  equal(cueCrawl.stats.playedSources[1],
    './verse_images/read_my_verse/verse_crawl_theme_ducked.mp3',
    'LOCK GATE starts the original Crawl track, not a second cue');
  equal(cueAnimation.paused,false,'scene resumes only after final music clock moves');

  // Balloons and Fish have the same frozen animated-scene owner as Crawl,
  // but they may be narrating a verse OR between clips when interrupted.
  // A selected surprise must not sneak in an initial verse narration burst.
  function animatedZooFixture(activityId, {
    narration = true, rejectMedia = false, rejectNarration = false,
    muted = false
  } = {}) {
    const t = harness({zoo:true, muted, progressMedia:true, rejectMedia,
      rejectNarration});
    t.setup(activityId,'animating');
    const clock={currentTime:75,paused:false,
      pause(){this.paused=true;},play(){this.paused=false;}};
    const track={startMs:12345};
    const scene={active:true,timers:new Set(),wordTracks:[track],
      balloonTracks:[],wrap:{
        classList:{add(){},remove(){}},
        getAnimations(){return [clock];}
      }};
    t.probe.setAnimatedScene(activityId,scene);
    if(narration)t.probe.setAnimatedNarration(scene,{
      index:0,audioStarted:true,audioDone:false,vanished:false
    });
    t.doc.hidden=true;t.fire('doc','visibilitychange');
    t.doc.hidden=false;t.fire('win','pageshow');
    return {t,clock,track};
  }
  async function verifyAnimatedZooCue(activityId) {
    const {t,clock,track}=animatedZooFixture(activityId);
    const before=track.startMs;
    const tap=t.zoo.verifiedTap('escape');
    await flush();t.runShortTimers();
    equal(await tap,true,activityId+': cue clock verified before pet escape');
    equal(t.stats.playedSources.length,1,
      activityId+': verse narration must not start on initial selected-escape gesture');
    equal(t.stats.playedSources[0],'./ui_audio/ui_pet_unlock.mp3',
      activityId+': use original BibloPet unlock cue');
    check(t.probe.verified?.cueOnly,activityId+': verified cue uses two-gesture path');
    equal(clock.paused,true,activityId+': animation stays frozen throughout cue');
    equal(track.startMs,before,activityId+': track clock does not progress under cue');
    t.zoo.beginEscape();
    equal(clock.paused,true,activityId+': pet rescue does not unfreeze narration scene');
    t.zoo.finishEscape();
    check(!!t.probe.recovery,activityId+': LOCK GATE waits for original narration proof');
    await flush();
    equal(t.probe.recovery,null,activityId+': verified narration releases recovery');
    equal(t.stats.playedSources.length,2,
      activityId+': only cue then original verse narration play');
    check(t.stats.playedSources[1].startsWith('./verse_audio/'),
      activityId+': final gate starts original verse, never another cue');
    equal(clock.paused,false,activityId+': animation thaws after final verified audio');
    check(track.startMs>before,activityId+': original scene timeline is shifted, not reset');
  }
  for(const id of ['balloons','fish'])await verifyAnimatedZooCue(id);

  // In a narration gap, final LOCK GATE has no verse clip to play; the
  // activity owner still needs a real session decision, and no fake audio.
  for(const id of ['balloons','fish']){
    const {t,clock}=animatedZooFixture(id,{narration:false});
    const tap=t.zoo.verifiedTap('break');
    await flush();t.runShortTimers();
    equal(await tap,true,id+': quiet animation interval verifies the cue');
    equal(t.stats.playedSources.length,1,
      id+': no verse narration is manufactured just to prove audio');
    t.zoo.beginEscape();t.zoo.finishEscape();
    await flush();
    equal(t.probe.recovery,null,id+': quiet interval final gesture resumes scene');
    equal(t.stats.playedSources.length,1,id+': no extra audio on quiet final gate');
    equal(clock.paused,false,id+': original quiet scene can continue');
  }

  for(const id of ['balloons','fish']){
    const {t,clock}=animatedZooFixture(id,{rejectNarration:true});
    const ready=t.zoo.verifiedTap('escape');
    await flush();t.runShortTimers();
    equal(await ready,true,id+': first gesture recovers with real cue');
    t.zoo.beginEscape();t.zoo.finishEscape();
    await flush();
    check(!!t.probe.recovery,id+': rejected final narration does not pass');
    check(t.zoo.isPaused(),id+': failed gate returns explicit Welcome Back');
    equal(clock.paused,true,id+': rejected narration cannot thaw animated scene');
    equal(t.stats.playedSources.length,2,
      id+': final gesture actually attempted original narration');
  }

  for(const id of ['balloons','fish']){
    const {t}=animatedZooFixture(id,{rejectMedia:true});
    const tap=t.zoo.verifiedTap('escape');
    await flush();t.runShortTimers();
    equal(await tap,false,id+': refused cue cannot pass Zoo verifier');
    check(!t.probe.verified,id+': no verified surprise on refused sound');
    equal(t.probe.recovery.kind,'animated',id+': frozen checkpoint preserved');
  }

  // Do not replay an obsolete cue after a second iPhone lock.
  for(const id of ['balloons','fish']){
    const {t,clock}=animatedZooFixture(id);
    const stale=t.zoo.verifiedTap('escape');
    t.doc.hidden=true;t.fire('doc','visibilitychange');
    await flush();t.runShortTimers();
    equal(await stale,false,id+': second lock cancels old cue result');
    check(!t.probe.verified,id+': stale audio must not authorize surprise');
    equal(clock.paused,true,id+': second lock keeps original scene paused');
  }

  // A NO-surprise Welcome Back still starts the genuine narration directly;
  // the BibloPet unlock cue is not a universal sound replacement.
  for(const id of ['balloons','fish']){
    const {t}=animatedZooFixture(id);
    const tap=t.zoo.verifiedTap(null);
    await flush();t.runShortTimers();
    equal(await tap,true,id+': ordinary return verifies original narration');
    equal(t.stats.playedSources.length,1,id+': only original narration starts');
    check(t.stats.playedSources[0].startsWith('./verse_audio/'),
      id+': no-surprise return never plays unlock cue');
    t.zoo.finishEscape();
    equal(t.probe.recovery,null,id+': ordinary verified return resumes without pen');
  }

  const noCue=harness({zoo:true,muted:false,progressMedia:true});
  noCue.setup('star_wars','animating');
  noCue.doc.hidden=true;noCue.fire('doc','visibilitychange');
  noCue.doc.hidden=false;noCue.fire('win','pageshow');
  const normalTap=noCue.zoo.verifiedTap(null);
  await flush();noCue.runShortTimers();
  equal(await normalTap,true,'no-surprise recovery still checks original audio');
  equal(noCue.stats.playedSources[0],
    './verse_images/read_my_verse/verse_crawl_theme_ducked.mp3',
    'non-surprise Crawl never plays the pet unlock cue');

  const cueRejected=harness({zoo:true,muted:false,rejectMedia:true});
  cueRejected.setup('star_wars','animating');
  cueRejected.doc.hidden=true;cueRejected.fire('doc','visibilitychange');
  cueRejected.doc.hidden=false;cueRejected.fire('win','pageshow');
  const failedCue=cueRejected.zoo.verifiedTap('escape');
  await flush();cueRejected.runShortTimers();
  equal(await failedCue,false,'denied cue cannot fake a successful recovery');
  check(!cueRejected.probe.verified,'failed audio never grants Zoo permission');
  equal(cueRejected.probe.recovery.kind,'animated',
    'failed cue leaves the same frozen Crawl scene available for retry');

  const cueInterrupted=harness({zoo:true,muted:false,progressMedia:true});
  cueInterrupted.setup('star_wars','animating');
  cueInterrupted.doc.hidden=true;cueInterrupted.fire('doc','visibilitychange');
  cueInterrupted.doc.hidden=false;cueInterrupted.fire('win','pageshow');
  const staleCue=cueInterrupted.zoo.verifiedTap('escape');
  cueInterrupted.doc.hidden=true;cueInterrupted.fire('doc','visibilitychange');
  await flush();cueInterrupted.runShortTimers();
  equal(await staleCue,false,'background cancels the old cue verification');
  check(!cueInterrupted.probe.verified,
    'stale cue cannot unlock the escape or underlying scene');

  const finalRejected=harness({zoo:true,muted:false,progressMedia:true,
    rejectSources:['./verse_images/read_my_verse/verse_crawl_theme_ducked.mp3']});
  finalRejected.setup('star_wars','animating');
  const finalClock={currentTime:65,paused:false,
    pause(){this.paused=true;},play(){this.paused=false;}};
  finalRejected.probe.setAnimatedScene('star_wars',{
    active:true,timers:new Set(),wordTracks:[],balloonTracks:[],
    wrap:{classList:{add(){},remove(){}},getAnimations(){return [finalClock];}}
  });
  finalRejected.doc.hidden=true;finalRejected.fire('doc','visibilitychange');
  finalRejected.doc.hidden=false;finalRejected.fire('win','pageshow');
  const readyCue=finalRejected.zoo.verifiedTap('escape');
  await flush();finalRejected.runShortTimers();
  equal(await readyCue,true,'successful cue reaches pet rescue');
  finalRejected.zoo.beginEscape();finalRejected.zoo.finishEscape();
  await flush();
  check(!!finalRejected.probe.recovery,
    'failed soundtrack on LOCK GATE cannot release original Crawl');
  equal(finalClock.paused,true,'rejected final music never thaws scene');
  check(finalRejected.zoo.isPaused(),
    'failed final audio returns to an explicit Welcome Back retry');

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
