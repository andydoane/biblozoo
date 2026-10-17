/* Patch 20K: release cleanup checks against the working Patch 20J implementation.
   This checks source/UI wiring without pretending to validate iOS audible playback. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('read_my_verse.js');
const css = read('read_my_verse.css');
const html = read('index.html');
const sw = read('service-worker.js');
const swift = read('ios/App/App/SceneDelegate.swift');
let checks = 0;
const check = (test, description) => { assert.ok(test, description); checks++; };

check(js.includes('const CRAWL_RESUME_SECONDS = 9;'), 'resume starts at chosen 9-second mark');
check(js.includes('const CRAWL_FANFARE_SECONDS = 7;'), 'chunks start at 7 seconds');
check(js.includes('const CRAWL_ENDING_OVERLAP_MS = 1000;'), 'horn and theme overlap for 1 second');
check(js.includes('verse_crawl_theme_ducked.mp3') && js.includes('verse_crawl_theme_ending.mp3'), 'original pre-ducked assets retained');
check(js.includes('startCrawlMusic("interruption-resume", CRAWL_RESUME_SECONDS);'), 'resume uses one shared seek setting');
check(js.includes('thawReadScene(scene, Date.now() - recovery.startedAt)'), 'paused verse scene is resumed, not rebuilt');
check(!js.includes('createMediaElementSource(') && !swift.includes('BibloZooCrawlAudio20I'), 'native bridge and WebAudio graph remain absent');
check(!html.includes('verse-crawl-audio-diagnostics-20f.js'), 'removed temporary diagnostic script');
check(!sw.includes('verse-crawl-audio-diagnostics-20f.js') && sw.includes('patch20l_stable_resume_label'), 'offline shell no longer precaches logger');
check(sw.includes('verse_crawl_theme_ducked.mp3') && sw.includes('verse_crawl_theme_ending.mp3'), 'PWA caches both new soundtracks');
check(!fs.existsSync(path.join(root, 'verse_games/shared/verse-crawl-audio-diagnostics-20f.js')), 'temporary logger file removed');
check(!js.includes('crawlTrace(') && !js.includes('crawlDiag'), 'all diagnostic hooks removed');
check(js.includes('removeItem?.("biblozooPatch20FAudioLog")'), 'old persisted log discarded on next load');
check(!css.includes('#readAudioExitButton'), 'unused Exit Activity styling removed');

const begin=js.indexOf('  function ensureReadAudioOverlay() {');
const end=js.indexOf('  function pauseReadForInterruption() {',begin);
check(begin>=0 && end>begin, 'recovery dialog helpers found');
const overlaySource=js.slice(begin,end);
const widgets=new Map();
const resumeButton={textContent:'Resume Audio',disabled:false};
const backButton={};
const heading={textContent:''};
const status={textContent:'',hidden:true};
const controls={
  '#readAudioResumeButton':resumeButton,
  '#readAudioOverlayBack':backButton,
  '#readAudioResumeTitle':heading,
  '#readAudioResumeStatus':status,
};
const doc={hidden:false,body:{appendChild(el){widgets.set(el.id,el);}},
  getElementById(name){return widgets.get(name)||null;},
  createElement(tag){
    assert.equal(tag,'div');
    return {hidden:true,className:'',innerHTML:'',setAttribute(name,value){this[name]=value;},
      querySelector(selector){return controls[selector]||null;}};
  }
};
const onResume=()=>{};
const onBack=()=>{};
const scope={root:{document:doc},state:{phase:'animating',activityId:'star_wars'},
  completionReported:false,readAudioRecovery:{kind:'animated',error:''},readAudioRecoveryAttempt:null,
  VERSE_CRAWL_ACTIVITY_ID:'star_wars',resumeReadAudioFromGesture:onResume,exitSession:onBack};
vm.createContext(scope);
vm.runInContext(overlaySource,scope);
const overlay=scope.ensureReadAudioOverlay();
check(overlay.innerHTML.includes('id="readAudioResumeButton"'), 'Resume button is present');
check(!overlay.innerHTML.includes('readAudioExitButton') && !overlay.innerHTML.includes('Exit Activity'), 'old Exit Activity control absent');
check(overlay.innerHTML.includes('id="readAudioOverlayBack"'), 'standalone Back control is accessible');
check(backButton.onclick===onBack && resumeButton.onclick===onResume, 'Back exits and Resume retains its original handler');
check((overlay.innerHTML.match(/id="readAudioResumeButton"/g)||[]).length===1,'only one Resume control');
check(!/[-]|[▶►→⯈]/u.test(resumeButton.textContent),'user-chosen Resume label has no play arrow');
scope.syncReadAudioOverlay();
check(!overlay.hidden && resumeButton.textContent==='Resume Verse Crawl','Verse Crawl overlay shows arrow-free Resume Verse Crawl');
// A pending recovery may disable the button, but must never expose internal status.
scope.readAudioRecoveryAttempt={generation:1};
scope.syncReadAudioOverlay();
check(resumeButton.disabled, 'Resume control remains disabled during an in-flight playback request');
check(resumeButton.textContent==='Resume Verse Crawl', 'button never changes to Restoring audio while pending');
check(!overlaySource.includes('Restoring audio'), 'behind-the-scenes loading label removed from dialog');
scope.readAudioRecoveryAttempt=null;
scope.readAudioRecovery.kind='chunk';
scope.state.activityId='typewriter';
scope.syncReadAudioOverlay();
check(!resumeButton.disabled && resumeButton.textContent==='Resume Audio', 'other activities retain their simple Resume Audio label');
scope.readAudioRecovery.kind='animated';
scope.state.activityId='star_wars';
scope.syncReadAudioOverlay();
check(heading.textContent.includes('Verse Crawl'),'existing Verse Crawl heading remains');
scope.readAudioRecovery.error='Audio is unavailable';
scope.syncReadAudioOverlay();
check(!status.hidden && status.textContent==='Audio is unavailable','recovery failure remains visible');
check(css.includes('.read-audio-resume-overlay .read-audio-overlay-back') && css.includes('position: fixed;'), 'Back is positioned above full screen overlay');
check(/#readAudioResumeButton\s*\{/.test(css), 'Resume button retained standard style');
check(js.includes('overlay.querySelector("#readAudioOverlayBack").onclick = exitSession;'), 'Back uses standard activity exit/cancellation');
console.log(`Patch 20K: ${checks} release-cleanup checks passed`);
