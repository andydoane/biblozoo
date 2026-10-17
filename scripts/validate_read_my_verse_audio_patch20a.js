"use strict";
// Regression for the physical-iPhone Patch 20 soft lock: HTML speech played
// while the unrelated app UI AudioContext reported its clock as frozen.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { makeHarness, flush } = require("./validate_read_my_verse_audio_patch20.js");
const src = fs.readFileSync(path.join(__dirname, "..", "read_my_verse.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "read_my_verse.css"), "utf8");
let checks = 0;
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
function ok(value, message) { assert.ok(value, message); checks++; }

async function testAppAudioFailureCannotVetoSpeech() {
  for (const activity of ["typewriter", "keyboard", "unscramble", "tap_words_order"]) {
    const h = makeHarness();
    h.setup(activity, "pause");
    h.api.playCurrentChunk(); await flush(); h.hide(); h.show();
    h.setUnlock("fail");
    ok(h.api.resumeReadAudioFromGesture(), `${activity}: tap begins recovery`);
    equal(h.audioEvents.slice(-2).join(","), "media-play,ui-unlock", `${activity}: narration play starts before optional UI sound unlock`);
    await flush();
    equal(h.overlay().hidden, true, `${activity}: successful speech closes overlay despite failed UI audio`);
    equal(h.api.getRecovery(), null, `${activity}: recovery state released`);
    equal(h.api.state.chunkIndex, 0, `${activity}: no skipped verse chunk`);
    const playing = h.api.getActiveAudio();
    ok(playing, `${activity}: interrupted verse audio restarted`);
    playing.fire("ended");
    equal(h.api.state.chunkIndex, 1, `${activity}: real ended event advances once`);
  }
}

async function testUnsettledUiAudioDoesNotStrandSpeech() {
  const h = makeHarness();
  h.setup("keyboard", "pause");
  h.api.playCurrentChunk(); await flush(); h.hide(); h.show();
  h.setUnlock("pending");
  h.api.resumeReadAudioFromGesture(); await flush();
  equal(h.overlay().hidden, true, "hanging app WebAudio cannot hold completed HTML activation hostage");
  equal(h.api.getRecovery(), null, "no stale overlay recovery after success");
  equal(h.timers.size, 0, "no remaining speech recovery watchdog");
  h.unlockDeferred[0].resolve(false); await flush();
  equal(h.overlay().hidden, true, "late failed UI audio unlock cannot re-open overlay");
}

async function testActualMediaFailuresStillRetryable() {
  const h = makeHarness(); h.setup("unscramble", "pause");
  h.api.playCurrentChunk(); await flush(); h.hide(); h.show();
  h.setMedia("reject"); h.api.resumeReadAudioFromGesture(); await flush();
  equal(h.overlay().hidden, false, "actual narration failure keeps overlay visible");
  equal(h.overlay().button.disabled, false, "failed attempt re-enables retry");
  ok(h.overlay().status.textContent.includes("Audio isn't ready"), "retry message shown");
  h.setMedia("success");h.setUnlock("fail");h.api.resumeReadAudioFromGesture();await flush();
  equal(h.overlay().hidden,true,"successful media retry clears overlay even with bad WebAudio");
}

async function testSequenceAndAnimationsIgnoreAppUiFailures() {
  for (const [activity, method] of [
    ["balloons", "playBalloonAudio"], ["fish", "playFishAudio"]
  ]) {
    const h = makeHarness();h.setup(activity, "animating");
    const scene = {active:true,wrap:{classList:h.classes()},timers:new Set(),items:new Map(),
      wordTracks:[],balloonTracks:[],fanfareLastProgress:0};
    const item={index:0,audioStarted:false,audioDone:false,vanished:false,
      node:{style:{animationPlayState:"",setProperty(){}},remove(){}},pausedForAudio:false};
    h.api.setScenes(activity,scene);h.api[method](scene,item);h.hide();h.show();
    h.setUnlock("fail");h.api.resumeReadAudioFromGesture();await flush();
    equal(h.overlay().hidden,true,`${activity}: narrated audio resumes despite unrelated Web Audio`);
    equal(scene.wrap.classList.contains("read-audio-paused"),false,`${activity}: animation unfreezes`);
    equal(item.audioStarted,true,`${activity}: same item resumed`);
    equal(item.audioDone,false,`${activity}: narration not silently completed`);
  }
  const h=makeHarness();h.setup("chunk_sequence","sequence_explore");
  const data={activeButtonIndex:-1,fadeButtonIndex:-1};h.api.state.activityData=data;
  let complete=0;h.api.playChunkSequenceAudio(1,()=>complete++);
  h.hide();h.show();h.setUnlock("fail");h.api.resumeReadAudioFromGesture();await flush();
  equal(h.overlay().hidden,true,"Chunk Audio Matching releases overlay even if UI AudioContext is frozen");
  equal(complete,0,"audio match result not counted before natural end");
  h.api.getActiveAudio().fire("ended");
  equal(complete,1,"audio match choice counted exactly once after completed narration");
}

async function testAlwaysAvailableExit() {
  const h=makeHarness();h.setup("keyboard","pause");
  h.api.playCurrentChunk();await flush();h.hide();h.show();
  ok(h.overlay().innerHTML.includes('id="readAudioExitButton"'),"modal includes an escape button");
  equal(typeof h.overlay().exitButton.onclick,"function","escape button wired to exitSession");
  h.setMedia("pending");h.api.resumeReadAudioFromGesture();await flush();
  h.overlay().exitButton.onclick();
  equal(h.overlay().hidden,true,"Exit Activity dismisses modal even with hung playback");
  equal(h.api.state.phase,"idle","exit cancels blocked reading activity");
  equal(h.api.getRecovery(),null,"exit invalidates pending recovery");
  h.mediaDeferred[0].resolve();await flush();
  equal(h.api.getRecovery(),null,"late audio completion cannot restore modal");
  ok(/position:\s*fixed/.test(css),"recovery remains outside text layout");
  ok(/#readAudioExitButton/.test(css),"exit control styled without changing lesson geometry");
}

(async()=>{
  await testAppAudioFailureCannotVetoSpeech();
  await testUnsettledUiAudioDoesNotStrandSpeech();
  await testActualMediaFailuresStillRetryable();
  await testSequenceAndAnimationsIgnoreAppUiFailures();
  await testAlwaysAvailableExit();
  ok(!/nativeAudio:\s*true/.test(src),"obsolete native-media bypass removed");
  console.log(`Patch 20A Read My Verse recovery validation passed (${checks} checks).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
