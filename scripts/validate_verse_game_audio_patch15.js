"use strict";

// Focused simulated regressions. Real iOS backgrounding still needs device tests.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = id => fs.readFileSync(path.join(root, "verse_games", id, "game.js"), "utf8");
function slice(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Could not isolate ${start}`);
  return text.slice(a, b);
}
function harness(body, env = {}, names = []) {
  const sandbox = { console, Promise, ...env };
  vm.createContext(sandbox);
  vm.runInContext(body + `\nthis.api={${names.join(",")}};`, sandbox);
  return sandbox.api;
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function fakeAudioContext(events) {
  const ctx = {
    state: "suspended", currentTime: 0, destination: {}, resumes: 0,
    resume() { this.resumes++; events.push("resume"); this.state = "running"; return Promise.resolve(); },
    createOscillator() { return { frequency: {value:0}, connect() {}, start() {events.push("oscillator");}, stop() {} }; },
    createGain() { return { gain: {value:0}, connect() {} }; },
    createBufferSource() { return { connect() {}, start() {events.push("buffer");}, stop() {} }; }
  };
  return ctx;
}
function gestures() {
  const callbacks = {};
  return { callbacks, addEventListener(name, cb) { callbacks[name] = cb; }, hidden: false };
}
function fakeSilentAudio(events) {
  return class {
    play() { events.push("htmlPlay"); return new Promise(() => {}); }
    pause() {}
    setAttribute() {}
  };
}

async function snakeUnlockAndBackgroundRetry() {
  const events = [];
  const ctx = fakeAudioContext(events);
  const document = gestures();
  const api = harness(`let audioContext = ac, audioUnlocked = false, audioUnlockPromise = null, silenceAudio = null;
    const SILENCE_SOUND_PATH = "silence.mp3";
    function getAudioContext(){return ac;}
    function preloadSoundBuffers(){events.push("preload");}
    ${slice(source("verse_snake"), "  function unlockAudio() {", "  function loadSoundBuffer(key) {")}`,
    {ac:ctx, events, document, window:{PointerEvent:true}, Audio:fakeSilentAudio(events),
      setTimeout, clearTimeout}, ["unlockAudio"]);
  const first = api.unlockAudio();
  assert.deepEqual(events.slice(0, 3), ["resume", "oscillator", "htmlPlay"]);
  assert.equal(await first, true, "Silent playback must not delay success");
  ctx.state = "interrupted";document.hidden = true;document.callbacks.visibilitychange();
  document.hidden = false;document.callbacks.pointerdown();
  await flush();
  assert.equal(ctx.resumes, 2, "Next user interaction must resume Snake audio");
}
async function snakeSoundDropWhenSuspended() {
  const events=[];const ctx = fakeAudioContext(events);
  const code = slice(source("verse_snake"), "  function playGameSound(key, volumeScale = 1) {", "  function midiToFreq(note) {");
  const api = harness(`let muted=false,audioUnlocked=true;
    const SOUND_FILES={correctWord:"correct.mp3"}, SOUND_VOLUMES={correctWord:0.8};
    function getAudioContext(){return ac;}
    function loadSoundBuffer(){return Promise.resolve({});}
    ${code}`, {ac:ctx}, ["playGameSound"]);
  api.playGameSound("correctWord");await flush();
  assert.equal(ctx.resumes,0,"Automated effects must not attempt non-gesture resume");
  assert.deepEqual(events,[]);
  ctx.state="running";api.playGameSound("correctWord");await flush();
  assert.deepEqual(events,["buffer"]);
}
async function invadersUnlockAndRetry() {
  const events=[];const ctx=fakeAudioContext(events),document=gestures();
  const code=slice(source("verse_invaders"),"  function unlockAudio() {","  function soundVolume(key) {");
  const api=harness(`let audioCtx=ac,audioUnlocked=false,audioUnlockPromise=null;
    function getAudioContext(){return ac;}
    function ensureSilenceAudio(){return new SilentAudio();}
    function preloadSoundBuffers(){events.push("preload");}
    ${code}`,{ac:ctx,events,document,window:{PointerEvent:true},SilentAudio:fakeSilentAudio(events),setTimeout,clearTimeout},["unlockAudio"]);
  assert.equal(await api.unlockAudio(),true);
  assert.deepEqual(events.slice(0,3),["resume","oscillator","htmlPlay"]);
  ctx.state="interrupted";document.hidden=true;document.callbacks.visibilitychange();
  document.hidden=false;document.callbacks.keydown();await flush();
  assert.equal(ctx.resumes,2);
}
async function invadersGameCueDoesNotRestartAudio() {
  const events=[];const ctx=fakeAudioContext(events);
  const code=slice(source("verse_invaders"),"  async function playGameSound(key, volumeKey = key) {","  function playUiTapSound() {");
  const api=harness(`let muted=false;
    function getAudioContext(){return ac;}
    function loadSoundBuffer(){return Promise.resolve({});}
    function soundVolume(){return 0.5;}
    ${code}`,{ac:ctx},["playGameSound"]);
  await api.playGameSound("correctHit");assert.equal(ctx.resumes,0);
  ctx.state="running";await api.playGameSound("correctHit");
  assert.deepEqual(events,["buffer"]);
}
async function dinoUnlockWithoutWaitingForSilentFile() {
  const events=[];const ctx=fakeAudioContext(events),document=gestures();
  const code=slice(source("dino_dash"),"  function unlockAudio() {","  async function playSound(key, options = {}) {");
  const api=harness(`let audioCtx=ac,audioUnlocked=false,audioUnlockPromise=null,silenceAudio=null;
    const SILENCE_PATH="silence.mp3";
    function getAudioContext(){return ac;}
    function preloadSounds(){events.push("preload");}
    ${code}`,{ac:ctx,events,document,window:{PointerEvent:true},Audio:fakeSilentAudio(events),setTimeout,clearTimeout},["unlockAudio"]);
  assert.equal(await api.unlockAudio(),true);
  assert.deepEqual(events.slice(0,3),["resume","oscillator","htmlPlay"]);
  ctx.state="interrupted";document.hidden=true;document.callbacks.visibilitychange();
  document.hidden=false;document.callbacks.pointerdown();await flush();
  assert.equal(ctx.resumes,2);
}
async function dinoSoundCueDoesNotRestartAudio() {
  const events=[];const ctx=fakeAudioContext(events);
  const code=slice(source("dino_dash"),"  async function playSound(key, options = {}) {","  function playUiSound() {");
  const api=harness(`let muted=false;const SOUND_FILES={jump:"jump.mp3"};
    const audioBuffers=new Map([["jump",{}]]);
    function getAudioContext(){return ac;}
    function getSoundUrl(){return "jump.mp3";}
    function loadSoundBuffer(){return Promise.resolve({});}
    ${code}`,{ac:ctx},["playSound"]);
  await api.playSound("jump");assert.equal(ctx.resumes,0);
  ctx.state="running";await api.playSound("jump");
  assert.deepEqual(events,["buffer"], "Successful jump cue plays once");
}
async function splatMustConfirmRunningAndAllowRetry() {
  const doc=gestures(),ctx=fakeAudioContext([]);
  const timers=[];
  let hang=true;
  ctx.resume=function(){this.resumes++;if(hang)return new Promise(()=>{});this.state="running";return Promise.resolve();};
  const resumeCode=slice(source("verse_splat"),"  function resumeVerseSplatAudioContext(){","  function decodeVerseSplatAudioData(ctx, arrayBuffer){");
  const unlockCode=slice(source("verse_splat"),"  function unlockVerseSplatAudio(){","  function chooseVerseSplatSound(groupName){");
  const api=harness(`let verseSplatAudioUnlocked=false,verseSplatAudioResumePromise=null;
    const VERSE_SPLAT_SOUNDS={uiTap:["pop.mp3"]};
    function getVerseSplatAudioContext(){return ac;}
    function primeVerseSplatSound(){return null;}
    ${resumeCode}${unlockCode}
    function isUnlocked(){return verseSplatAudioUnlocked;}`,
    {ac:ctx,document:doc,window:{PointerEvent:true},
      setTimeout: cb=>{timers.push(cb);return timers.length;},clearTimeout(){}},
    ["unlockVerseSplatAudio","isUnlocked"]);
  api.unlockVerseSplatAudio();assert.equal(api.isUnlocked(),false,"Pending resume is NOT unlocked");
  assert.equal(ctx.resumes,1);
  timers[0]();await flush();
  hang=false;doc.callbacks.pointerdown();await flush();
  assert.equal(ctx.resumes,2,"Next tap retries after hung resume");
  assert.equal(api.isUnlocked(),true);
  doc.hidden=true;doc.callbacks.visibilitychange();assert.equal(api.isUnlocked(),false);
}

async function hungResumeRetriesForAllGestureGames() {
  const definitions = [
    {id:"verse_snake", start:"  function unlockAudio() {", end:"  function loadSoundBuffer(key) {", silence:"SILENCE_SOUND_PATH", helper:"function preloadSoundBuffers(){}"},
    {id:"verse_invaders", start:"  function unlockAudio() {", end:"  function soundVolume(key) {", silence:null, helper:"function preloadSoundBuffers(){} function ensureSilenceAudio(){return new Audio();}"},
    {id:"dino_dash", start:"  function unlockAudio() {", end:"  async function playSound(key, options = {}) {", silence:"SILENCE_PATH", helper:"function preloadSounds(){}"}
  ];
  for (const def of definitions) {
    const events=[];const ctx=fakeAudioContext(events),document=gestures(),timers=[];
    let canResume=false;
    ctx.resume=function() {
      this.resumes++;
      if (!canResume) return new Promise(() => {});
      this.state="running";
      return Promise.resolve();
    };
    const code=slice(source(def.id),def.start,def.end);
    const api=harness(`let audioContext=ac,audioCtx=ac,audioUnlocked=false,audioUnlockPromise=null,silenceAudio=null;
      const SILENCE_SOUND_PATH="silence.mp3",SILENCE_PATH="silence.mp3";
      function getAudioContext(){return ac;}
      ${def.helper}
      ${code}`,
      {ac:ctx,document,window:{PointerEvent:true},Audio:fakeSilentAudio(events),
       setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}},["unlockAudio"]);
    const first=api.unlockAudio();
    assert.equal(ctx.resumes,1,`${def.id} should request first resume`);
    timers[0]();
    assert.equal(await first,false,`${def.id} must time out hanging resume`);
    await flush();
    canResume=true;
    assert.equal(await api.unlockAudio(),true,`${def.id} should recover on next tap`);
    assert.equal(ctx.resumes,2,`${def.id} must make a fresh resume request`);
  }
}

function splatScheduledCuesCannotStartResume() {
  const code=slice(source("verse_splat"),"  function playVerseSplatSoundFile(file, volume=1, options={}){","  function playVerseSplatSoundGroup(groupName, volume=1, options={}){");
  let resumed=0;
  const ctx={state:"interrupted"};
  const api=harness(`let muted=false,verseSplatAudioResumePromise=null;
    function verseSplatSoundSrc(file){return file;}
    function getVerseSplatAudioContext(){return ac;}
    function resumeVerseSplatAudioContext(){resumed++;}
    function claimVerseSplatSoundSlot(){return true;}
    function primeVerseSplatSound(){return null;}
    function primeVerseSplatAudioBuffer(){}
    function playVerseSplatWebAudioBuffer(){throw Error("must not queue");}
    const verseSplatAudioBufferCache = new Map([["pop.mp3",{}]]);
    ${code}`,{ac:ctx,resumed},["playVerseSplatSoundFile"]);
  api.playVerseSplatSoundFile("pop.mp3");
  assert.equal(resumed,0,"A timed blob sound cannot resume interrupted audio");
}

function sourceGuards() {
  const all=["verse_snake","verse_splat","verse_invaders","dino_dash"];
  all.forEach(id=>{
    const content=source(id);
    assert.match(content,/visibilitychange/);
    assert.match(content,/document\.addEventListener\("pointerdown"/);
    assert.match(content,/document\.addEventListener\("keydown"/);
    assert.match(content,/ctx\.state === "running"/);
  });
  assert.match(source("verse_splat"),/Object\.values\(VERSE_SPLAT_SOUNDS\)\.flat\(\)\.forEach\(primeVerseSplatAudioBuffer\)/);
  assert.match(fs.readFileSync(path.join(root,"service-worker.js"),"utf8"),/2026_Oct_16_verse_game_audio_recovery_w/);
}
async function main() {
  await snakeUnlockAndBackgroundRetry();
  await snakeSoundDropWhenSuspended();
  await invadersUnlockAndRetry();
  await invadersGameCueDoesNotRestartAudio();
  await dinoUnlockWithoutWaitingForSilentFile();
  await dinoSoundCueDoesNotRestartAudio();
  await splatMustConfirmRunningAndAllowRetry();
  await hungResumeRetriesForAllGestureGames();
  splatScheduledCuesCannotStartResume();
  sourceGuards();
  console.log("Patch 15 Verse Game audio validation passed (10 checks).");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
