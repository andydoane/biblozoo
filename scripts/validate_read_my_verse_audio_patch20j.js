/* Patch 20J: direct HTML-media soundtrack + baked-in duck/horn smoke tests. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rootDir = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'read_my_verse.js'), 'utf8');
const sw = fs.readFileSync(path.join(rootDir, 'service-worker.js'), 'utf8');
const swift = fs.readFileSync(path.join(rootDir, 'ios/App/App/SceneDelegate.swift'), 'utf8');
let cases = 0;
const check = (ok, reason) => { assert.ok(ok, reason); cases++; };
check(source.includes('CRAWL_FANFARE_SECONDS = 7'), 'chunks start at 7-second point');
check(source.includes('CRAWL_RESUME_SECONDS = 9'), 'resume starts at already-ducked time');
check(source.includes('verse_crawl_theme_ducked.mp3'), 'baked duck soundtrack');
check(source.includes('verse_crawl_theme_ending.mp3'), 'baked fade-in horn');
check(sw.includes('patch20l_stable_resume_label'), 'PWA cache updated');
check(sw.includes('verse_crawl_theme_ducked.mp3') && sw.includes('verse_crawl_theme_ending.mp3'), 'both MP3s cached');
check(!source.includes('createMediaElementSource('), 'Verse Crawl never builds a media-to-WebAudio graph');
check(!source.slice(source.indexOf('  function startCrawlMusic('), source.indexOf('  function waitForCrawlFanfare(')).includes('AudioContext'), 'Verse Crawl never creates Web Audio context');
check(!source.includes('AVAudioPlayer') && !source.includes('nativeCrawlPlugin'), 'Swift bridge is no longer selected');
check(!swift.includes('BibloZooCrawlAudio20I') && swift.includes('CAPBridgeViewController()'), 'Swift SceneDelegate restored');
check(!source.includes('fadeCrawlMusic('), 'no JS duck/fade');
check(source.includes('thawReadScene(scene, Date.now() - recovery.startedAt)'), 'resume keeps the paused scene');
check(!source.includes('stopCrawlSequence();\n    stopCrawlMusic();\n    clearTimers();'), 'resume does not reset sequence');
const section = (from, to) => {
  const a = source.indexOf(from), b = source.indexOf(to, a);
  assert(a >= 0 && b > a, `Expected snippet ${from}/${to}`);
  return source.slice(a, b);
};
const definitions = section('  // The pre-ducked track is intentionally played', '  function waitForCrawlFanfare(');
const fanfare = section('  function waitForCrawlFanfare(session, start) {', '  // A crawl has one persistent scene:');
const completed = section('  function completeCrawlIfReady(session) {','  function markCrawlVanished(');
class Media {
  static instances = [];
  constructor(src) {
    this.src = src; this.events = new Map(); this.currentTime = 0;
    this.played = false; this.paused = true; this.ended = false;
    Media.instances.push(this);
  }
  addEventListener(name, fn) { this.events.set(name, fn); }
  emit(name) { this.events.get(name)?.(); }
  setAttribute() {}
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() { /* Stub. */ }
  play() { this.played = true; this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
function fixture(muted = false) {
  Media.instances.length = 0;
  const scheduled = [];
  const ctx = {
    root: { Audio: Media },
    ASSET_BASE: './verse_images/read_my_verse/',
    CRAWL_MUSIC_SRC: './verse_images/read_my_verse/verse_crawl_theme_ducked.mp3',
    CRAWL_ENDING_SRC: './verse_images/read_my_verse/verse_crawl_theme_ending.mp3',
    CRAWL_FANFARE_SECONDS: 7, CRAWL_ENDING_OVERLAP_MS: 1000,
    appApi: { isMuted: () => muted }, crawlMusic: null, crawlEnding: null,
    state: { chunks: ['line'] }, completionReported: false,
    crawlSession: null,
    crawlTimer: (_s, fn, ms) => scheduled.push({ fn, ms }),
    reportCompletion: () => { ctx.completionReported = true; },
    Promise, Date
  };
  vm.createContext(ctx);
  vm.runInContext(`${definitions}\n${fanfare}\n${completed}`, ctx);
  return { ctx, scheduled };
}
(async () => {
  {
    const { ctx } = fixture();
    ctx.startCrawlMusic('activity-launch');
    check(!!ctx.crawlMusic?.startPromise, 'direct HTML playback launched');
    check(ctx.crawlMusic.context === null && ctx.crawlMusic.gain === null, 'no context or GainNode');
    check(ctx.crawlMusic.audio.src.includes('theme_ducked'), 'selected theme is new MP3');
    check(ctx.crawlMusic.audio.currentTime === 0, 'normal launch at zero');
    check(await ctx.crawlMusic.startPromise, 'HTML play resolved');
    check(ctx.crawlMusic.engine === 'html-media-direct-20j', 'HTML media is the selected engine');
  }
  {
    const { ctx } = fixture();
    ctx.startCrawlMusic('interruption-resume', 9);
    const audio = ctx.crawlMusic.audio;
    check(audio.currentTime === 9, 'resume seeks immediately to 9 seconds');
    audio.currentTime = 0;
    audio.emit('loadedmetadata');
    check(audio.currentTime === 9, 'nine-second seek retried after iOS metadata');
  }
  {
    const { ctx, scheduled } = fixture();
    ctx.startCrawlMusic('activity-launch');
    const scene = { active: true, items: new Map([[0, {audioDone: true,vanished:true}]]), endingStarted: false };
    ctx.crawlSession = scene;
    ctx.startCrawlEnding(scene);
    const theme = Media.instances[0], horn = Media.instances[1];
    check(theme.played && !theme.paused, 'quiet theme continues while horn fades in');
    check(horn.played && horn.src.includes('theme_ending'), 'separate ending horn plays');
    check(!ctx.completionReported, 'completion waits for horn end');
    await new Promise(resolve => setImmediate(resolve));
    check(scheduled.some(t => t.ms === 1000), 'one second overlap scheduled after horn playback');
    scheduled.find(t => t.ms === 1000).fn();
    check(theme.paused && !horn.paused, 'theme stops after one second, horn continues');
    horn.emit('ended');
    check(ctx.completionReported, 'horn end finishes crawl');
  }
  {
    const { ctx, scheduled } = fixture();
    ctx.startCrawlMusic('activity-launch');
    const scene = { active: true, items: new Map(), timers: new Set() };
    ctx.crawlSession = scene;
    let launched = 0;
    ctx.crawlMusic.audio.currentTime = 6.5;
    ctx.waitForCrawlFanfare(scene, () => launched++);
    check(launched === 0, 'chunks stay hidden before 7 seconds');
    const next = scheduled.find(t => t.ms === 125);
    check(!!next, 'fanfare checks media playback progress');
    ctx.crawlMusic.audio.currentTime = 7;
    next.fn();
    check(launched === 1, 'chunks launch as soon as soundtrack reaches 7 seconds');
  }
  {
    const fresh = fixture();
    const { ctx } = fresh;
    const scene = { active: true };
    const recovered = { kind: 'animated', scene, startedAt: Date.now() - 500, narration: null };
    const calls = [];
    const context = {
      ...ctx,
      root: { document: { hidden: false } },
      CRAWL_RESUME_SECONDS: 9, readAudioRecoveryGeneration: 3, readAudioRecovery: recovered,
      readAudioRecoveryAttempt: { generation: 3 }, readAudioStartPromise: null,
      readDeferredNarrationFinish: null,
      crawlMusic: { audio: { pause() {} } },
      crawlEnding: null,
      stopCrawlMusic() { calls.push('stop-theme'); },
      stopCrawlEnding() { calls.push('stop-horn'); },
      startCrawlMusic(reason, seek) {
        calls.push([reason, seek]);
        context.crawlMusic = { startPromise: Promise.resolve(true) };
      },
      syncReadAudioOverlay() { calls.push('overlay'); },
      thawReadScene(given) { check(given === scene, 'unfrozen original scene'); },
      waitReadRecoveryResult: async promise => promise,
      appApi: { isMuted: () => false }
    };
    vm.createContext(context);
    vm.runInContext(section('  function resumeInterruptedCrawlFromGesture(recovery, generation) {',
      '  function resumeReadAudioFromGesture() {'), context);
    check(context.resumeInterruptedCrawlFromGesture(recovered, 3) === true, 'recovery gesture accepted');
    await new Promise(resolve => setImmediate(resolve));
    check(calls.some(x => Array.isArray(x) && x[0] === 'interruption-resume' && x[1] === 9),
      'gesture starts HTML track at nine seconds');
    check(context.readAudioRecovery === null, 'successful recovery releases overlay');
    check(calls.indexOf('stop-theme') >= 0, 'old soundtrack released before recreation');
  }
  {
    const { ctx } = fixture(true);
    ctx.startCrawlMusic('activity-launch');
    check(Media.instances.length === 0, 'mute does not start theme');
    const scene = { active: true, items: new Map([[0,{audioDone:true,vanished:true}]]) };
    ctx.crawlSession = scene;
    ctx.completeCrawlIfReady(scene);
    check(ctx.completionReported, 'muted session finishes without waiting for horn');
  }
  console.log(`Patch 20J: ${cases} checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
