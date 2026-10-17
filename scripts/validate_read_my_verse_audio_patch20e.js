"use strict";
// Patch 20E: exercise the shipped Read My Verse state machine with fake iOS
// AudioContexts, real overlay transitions, timers, and interrupted crawl scenes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { makeHarness, flush } = require("./validate_read_my_verse_audio_patch20.js");
const base = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(base, "read_my_verse.js"), "utf8");
const swift = fs.readFileSync(path.join(base,"ios/App/App/SceneDelegate.swift"), "utf8");
const css = fs.readFileSync(path.join(base,"read_my_verse.css"),"utf8");
let checks = 0;
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
function ok(condition, message) { assert.ok(condition, message); checks++; }
function match(value, pattern, message) { assert.match(value, pattern, message); checks++; }

function withCrawl({ frozen = false } = {}) {
  const h = makeHarness();
  h.setup("star_wars", "animating");
  const contexts = [];
  class MusicContext {
    constructor() {
      this.state = frozen ? "interrupted" : "running";
      this.currentTime = 0;
      this.destination = {};
      this.closed = false;
      this.events = [];
      contexts.push(this);
    }
    createMediaElementSource() {
      this.events.push("source");
      return { connect: () => this.events.push("source-connected") };
    }
    createGain() {
      const events = this.events;
      return { gain: {
        value: 1,
        cancelScheduledValues(at) {events.push(["cancel",at]);},
        setValueAtTime(v,at) {events.push(["set",v,at]);},
        linearRampToValueAtTime(v,at) {events.push(["ramp",v,at]);}
      }, connect: () => this.events.push("gain-connected") };
    }
    resume() { this.events.push("resume"); return Promise.resolve(); }
    close() { this.events.push("close");this.closed=true;this.state="closed";return Promise.resolve(); }
  }
  h.window.AudioContext = MusicContext;
  const scene = {active:true,wrap:{classList:h.classes()},timers:new Set(),items:new Map(),
    wordTracks:[],balloonTracks:[],fanfareLastProgress:Date.now()};
  h.api.setScene(scene);
  h.api.startCrawlMusic();
  return {h, contexts, scene};
}

async function startInterruptedCrawl(options) {
  const x = withCrawl(options);
  const {h} = x;
  await flush();
  h.api.state.chunkIndex = 1;
  h.hide();
  h.show();
  eq(h.overlay().hidden,false,"interrupted Crawl opens recovery overlay");
  eq(h.overlay().button.textContent,"▶ Restart Verse Crawl","Crawl explicitly says restart");
  match(js,/Ready to Start Again\?/,"restart overlay has distinct title");
  eq(h.api.state.chunkIndex,1,"background alone preserves interrupted state");
  return x;
}

async function testCleanRestartWithGainAndDuck() {
  const {h,contexts,scene}=await startInterruptedCrawl();
  const old=h.api.getCrawlMusic();
  eq(h.api.resumeReadAudioFromGesture(),true,"restart starts in tap gesture");
  eq(h.api.resumeReadAudioFromGesture(),false,"rapid second tap cannot duplicate soundtrack");
  const song=h.api.getCrawlMusic();
  ok(song && song!==old,"restart creates new soundtrack instead of resuming old one");
  ok(song.context !== old.context,"restart creates fresh audio context");
  ok(song.gain,"fresh soundtrack includes original gain control");
  eq(contexts.length,2,"one old context and one fresh context");
  eq(old.context.closed,true,"old music context is released");
  eq(old.audio.paused,true,"old soundtrack stops");
  eq(song.audio.currentTime,0,"new soundtrack starts at zero");
  eq(h.api.state.chunkIndex,0,"restarted Crawl resets to first chunk");
  eq(scene.active,false,"old animated scene is torn down");
  eq(h.api.state.phase,"animating","new crawl returns to opening animation state");
  eq(h.overlay().hidden,false,"popup stays until verified audio readiness");
  eq(h.overlay().button.disabled,true,"overlay blocks duplicate gestures while starting");
  eq(h.renders(),0,"screen does not redraw before audio ready");
  await flush();
  contexts[1].currentTime=0.22;
  h.fireTimer(125);
  await flush();
  eq(h.overlay().hidden,true,"verified fresh music dismisses overlay");
  eq(h.api.getRecovery(),null,"recovery flags cleared on success");
  eq(h.api.getAttempt(),null,"restart attempt cleared");
  eq(h.renders(),1,"one fresh crawl render requested");
  // The shipped fanfare logic must still trigger the original duck when
  // the restarted soundtrack reaches eight seconds (not just expose a gain).
  let crawlIntroFinished=0;
  const freshScene={active:true,wrap:{classList:h.classes()},timers:new Set(),items:new Map(),
    wordTracks:[],balloonTracks:[],fanfareLastProgress:Date.now()};
  h.api.setScene(freshScene);
  song.audio.currentTime=8.12;
  h.api.waitForCrawlFanfare(freshScene,()=>crawlIntroFinished++);
  eq(crawlIntroFinished,1,"fresh crawl starts when eight seconds of music have played");
  const events=contexts[1].events;
  ok(events.some(e=>Array.isArray(e)&&e[0]==="ramp"&&e[1]===0.22),
    "original eight-second duck is controllable through GainNode");
  h.api.fadeCrawlMusic(0,1500);
  ok(events.some(e=>Array.isArray(e)&&e[0]==="ramp"&&e[1]===0),
    "final fade to silence remains controllable through GainNode");
  h.api.resetSession();
  eq(contexts[1].closed,true,"completed/abandoned session closes restarted output");
}

async function testFrozenGraphRetainsRetryAndExit() {
  const {h,contexts}=await startInterruptedCrawl({frozen:true});
  h.api.resumeReadAudioFromGesture();await flush();
  eq(h.overlay().hidden,false,"frozen context does not falsely dismiss overlay");
  eq(h.api.state.chunkIndex,0,"failed restart still starts from zero");
  for(let n=0;n<8;n++) {h.fireTimer(125);await flush();}
  eq(h.overlay().hidden,false,"frozen clock leaves retry popup visible");
  eq(h.overlay().button.disabled,false,"restart tap enabled after failure");
  ok(h.overlay().status.textContent.includes("Restart Verse Crawl"),"error gives retry instruction");
  eq(h.renders(),0,"failed audio never starts new visual sequence");
  eq(contexts[1].closed,true,"failed fresh audio context released");
  eq(h.api.resumeReadAudioFromGesture(),true,"later tap can rebuild again");
  await flush();
  eq(contexts.length,3,"retry creates third fresh context");
  contexts[2].state="running";
  contexts[2].currentTime=.3;
  h.fireTimer(125);await flush();
  eq(h.overlay().hidden,true,"retry after frozen context can succeed");
  eq(h.renders(),1,"new crawl renders only when fresh audio is ready");
  h.api.resetSession();
}

async function testSecondInterruptionCannotReleaseOldAttempt() {
  const {h,contexts}=await startInterruptedCrawl();
  h.api.resumeReadAudioFromGesture();await flush();
  h.hide();
  eq(h.api.getAttempt(),null,"second app switch invalidates pending restart");
  h.show();
  contexts[1].currentTime=.4;
  h.fireTimer(125);await flush();
  eq(h.overlay().hidden,false,"stale clock result cannot dismiss overlay");
  eq(h.renders(),0,"stale restart cannot rerender");
  h.api.resumeReadAudioFromGesture();await flush();
  contexts[2].currentTime=.4;
  h.fireTimer(125);await flush();
  eq(h.overlay().hidden,true,"new genuine tap completes fresh restart");
  eq(h.renders(),1,"one fresh rerender after repeated interruptions");
}

async function testExitAfterAudioRefusal() {
  const {h,contexts}=await startInterruptedCrawl({frozen:true});
  h.api.resumeReadAudioFromGesture();await flush();
  for(let n=0;n<8;n++) {h.fireTimer(125);await flush();}
  eq(h.overlay().hidden,false,"failed restart shows escape option");
  h.overlay().exitButton.onclick();
  eq(h.overlay().hidden,true,"Exit Activity always dismisses stuck restart");
  eq(h.api.state.phase,"idle","exiting resets the failed crawl session");
  eq(h.api.getRecovery(),null,"Exit Activity clears restart state");
  eq(contexts[1].closed,true,"exit releases any failed audio graph");
}

async function testNewSessionAfterInterruptedOne() {
  const {h,contexts}=await startInterruptedCrawl();
  h.api.resumeReadAudioFromGesture();await flush();
  contexts[1].currentTime=.2;h.fireTimer(125);await flush();
  const old=h.api.getCrawlMusic();
  h.api.resetSession();
  h.setup("star_wars", "animating");
  h.api.startCrawlMusic();await flush();
  const next=h.api.getCrawlMusic();
  ok(next!==old,"later Preview launch uses another new player");
  ok(next.gain,"later Preview launch still routes through GainNode");
  eq(next.audio.currentTime,0,"subsequent activity starts soundtrack from zero");
  eq(contexts.length,3,"subsequent run creates a new graph, not old fallback");
  eq(next.failed,false,"fresh soundtrack not poisoned by previous interruption");
}

function testRetirementAndScope() {
  match(js,/const CRAWL_FANFARE_SECONDS = 8/,"duck retains eight-second trigger");
  match(js,/const CRAWL_UNDERSCORE_VOLUME = 0\.22/,"duck retains 22% target");
  match(js,/const CRAWL_DUCK_FADE_MS = 1350/,"duck retains original fade duration");
  match(js,/fadeCrawlMusic\(0, motion\.durationMs \* 0\.15\)/,
    "original ending fade remains linked to final crawl animation");
  match(js,/createMediaElementSource\(audio\)/,"soundtrack again routes through Web Audio");
  match(js,/gain\.connect\(context\.destination\)/,"Web Audio gain connected to output");
  ok(!/getCrawlNativeMusicPlugin|createNativeCrawlMusic|readCrawlNativeUnavailable|readCrawlPreferNativeAudio/.test(js),
    "no persistent or silent HTML/native fallback path remains");
  ok(!/BibloZooCrawlMusicPlugin|AVAudioPlayer|import AVFoundation/.test(swift),
    "native plugin and native audio state removed from SceneDelegate");
  match(css,/\.read-audio-resume-overlay\s*\{[\s\S]*?position:\s*fixed/,
    "restart popup remains outside lesson layout");
  match(fs.readFileSync(path.join(base,"service-worker.js"),"utf8"),
    /patch20e_crawl_restart_original_audio/,"cache version updated for new bundle");
  ok(!fs.existsSync(path.join(base,"verse_crawl_theme.mp3")),"no re-encoded MP3 included");
  ok(!/startCrawlMusic\(0, \{ nativeAudio/.test(js),"first launch uses original audio routing");
}

(async()=>{
  await testCleanRestartWithGainAndDuck();
  await testFrozenGraphRetainsRetryAndExit();
  await testSecondInterruptionCannotReleaseOldAttempt();
  await testExitAfterAudioRefusal();
  await testNewSessionAfterInterruptedOne();
  testRetirementAndScope();
  console.log(`Patch 20E original Crawl audio + restart validation passed (${checks} checks).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
