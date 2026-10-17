"use strict";

// Focused Patch 24 regression checks. Executes the real Feeding Game module
// in a VM, with only in-memory test hooks; the shipping module has none.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "daily_questions_feed_game.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let checks = 0;
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const near = (a, b, msg) => { ok(Math.abs(a - b) < 1e-8, msg || `${a} !== ${b}`); };

function readKnob(name) {
  const pattern = new RegExp(`const ${name} = ([0-9]+(?:\\.[0-9]+)?);`, "g");
  const matches = Array.from(source.matchAll(pattern));
  eq(matches.length, 1, `${name} must be one editable numeric setting`);
  return Number(matches[0][1]);
}

function makeGame(master = 1, collision = 0.20, melody = 0.25) {
  // Test canonical mixes without depending on the user's later tuning edits.
  let replacement = source;
  for (const [name, value] of [
    ["FEED_AUDIO_MASTER_VOLUME", master],
    ["FEED_COLLISION_TONE_VOLUME", collision],
    ["FEED_MELODY_TONE_VOLUME", melody]
  ]) {
    const original = new RegExp(`const ${name} = [0-9]+(?:\\.[0-9]+)?;`);
    ok(original.test(replacement), `Found ${name} in source`);
    replacement = replacement.replace(original, `const ${name} = ${value};`);
  }
  const marker = "  window.BibloZooDailyFeedGame = Object.freeze({";
  eq(replacement.split(marker).length - 1, 1, "One public game export");
  const instrumented = replacement.replace(marker, `
  window.__feed24 = Object.freeze({
    FEED_AUDIO_MASTER_VOLUME, FEED_COLLISION_TONE_VOLUME, FEED_MELODY_TONE_VOLUME,
    feedingSoundVolume, playPegTone, playStarSound, playChompSound, playMelodyTone,
    initializeBounceMode, updateBounceWhiteBall, updateBounceSnacks,
    bounceSnackTouchesPaddle, bounceSnackTouchesPet,
    spawnBounceSnack, breakBounceBrick, setBouncePaddleX,
    setBuffers: (star, chomp) => { preparedStarBuffer = star; preparedChompBuffer = chomp; }
  });
${marker}`);
  class StubImage { constructor() { this.complete = false; this.naturalWidth = 0; } }
  class StubAudio {
    constructor(src) { this.src = src; this.volume = 1; this.currentTime = 0; }
    load() {} pause() {} play() { return Promise.resolve(); }
  }
  const window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1,
    location: { protocol: "https:" }, AudioContext: null, webkitAudioContext: null };
  const document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  const sandbox = { window, document, Image: StubImage, Audio: StubAudio,
    console, setTimeout, clearTimeout, requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}, fetch: () => Promise.reject(Error("Network disabled")),
    performance: { now: () => 1000 } };
  vm.createContext(sandbox);
  vm.runInContext(instrumented, sandbox, { filename: "daily_questions_feed_game.js" });
  return window.__feed24;
}

function fakeAudioContext(state = "running") {
  const output = { starts: [], ramps: [], values: [], stops: 0 };
  const ctx = {
    state, currentTime: 10, destination: {},
    createOscillator() {
      return { type: "", frequency: { setValueAtTime() {} }, connect() {},
        disconnect() {}, addEventListener() {}, start() { output.starts.push("tone"); },
        stop() { output.stops++; } };
    },
    createBufferSource() {
      return { buffer: null, connect() {}, disconnect() {}, addEventListener() {},
        start() { output.starts.push("mp3"); }, stop() { output.stops++; } };
    },
    createGain() {
      return { connect() {}, disconnect() {}, gain: {
        setValueAtTime(v) { output.values.push(v); },
        exponentialRampToValueAtTime(v) {
          if (v <= 0) throw new RangeError("An exponential ramp needs positive values");
          output.ramps.push(v);
        }
      } };
    }
  };
  return { ctx, output };
}

function makeBounceRuntime(hooks, audioState = "running") {
  const { ctx, output } = fakeAudioContext(audioState);
  const runtime = {
    mode: "bounce", width: 390, height: 844,
    earnedStarPegCount: 0, pegRadius: 16, petRadius: 48, petCenterY: 775,
    catcherX: 195, nextBallId: 1, caughtCount: 0, score: 0,
    catcher: { style: {}, classList: { remove() {}, add() {} }, offsetWidth: 1 },
    petCircle: { style: { setProperty() {} } },
    startOverlay: { hidden: true }, startTitleEl: { textContent: "" },
    startInstructionEl: { textContent: "" },
    scorePopupsEl: null, scoreEl: null, audioContext: ctx,
    balls: [], pegs: [], bursts: [], scheduled: []
  };
  hooks.initializeBounceMode(runtime);
  runtime.lastPegSoundAt = -Infinity;
  return { runtime, output, ctx };
}

function testTuning() {
  const h = makeGame();
  near(h.FEED_COLLISION_TONE_VOLUME, 0.20, "Collision default is louder");
  near(h.FEED_MELODY_TONE_VOLUME, 0.25, "Melody default is louder");
  near(h.feedingSoundVolume(0.78), 0.78, "Star recording stays unchanged");
  near(h.feedingSoundVolume(0.85), 0.85, "Chomp recording stays unchanged");
  near(h.feedingSoundVolume(0.82), 0.82, "Fallback MP3 gain stays unchanged");
  const runtime = { audioContext: fakeAudioContext().ctx, lastPegSoundAt: -Infinity };
  const tone = fakeAudioContext();
  runtime.audioContext = tone.ctx;
  h.playPegTone(runtime, 1000);
  eq(tone.output.starts.length, 1, "Collision beep starts");
  near(tone.output.ramps[0], 0.20, "Collision beep actually uses tuning value");
  h.playPegTone(runtime, 1030);
  eq(tone.output.starts.length, 1, "55 ms debounce prevents duplicate beep");
  h.playPegTone(runtime, 1056);
  eq(tone.output.starts.length, 2, "Next separated impact remains audible");

  const melody = fakeAudioContext();
  const melodyRuntime = { audioContext: melody.ctx, melody: { activeVoices: new Set() } };
  eq(h.playMelodyTone(melodyRuntime, 64), true, "Melody plays when running");
  near(melody.output.ramps[0], 0.25, "Melody uses increased knob");
  eq(melodyRuntime.melody.activeVoices.size, 1, "Melody voice lifecycle preserved");

  const samples = fakeAudioContext();
  const rec = { audioContext: samples.ctx, starAudio: null, chompAudio: null };
  h.setBuffers({name:"star"}, {name:"chomp"});
  h.playStarSound(rec);
  h.playChompSound(rec);
  eq(samples.output.starts.length, 2, "Two MP3 effects start");
  near(samples.output.values[0], 0.78, "Star MP3 unchanged at master 1");
  near(samples.output.values[1], 0.85, "Chomp MP3 unchanged at master 1");
  h.setBuffers(null, null);
  const suspended = fakeAudioContext("suspended");
  rec.audioContext = suspended.ctx;
  h.playStarSound(rec);
  h.playChompSound(rec);
  h.playPegTone({audioContext:suspended.ctx,lastPegSoundAt:-Infinity}, 1000);
  eq(suspended.output.starts.length, 0, "Interrupted context never queues old effects");

  const hHalf = makeGame(0.5);
  near(hHalf.feedingSoundVolume(0.85), 0.425, "Master knob scales MP3 output");
  const halfTone = fakeAudioContext();
  hHalf.playPegTone({audioContext: halfTone.ctx,lastPegSoundAt:-Infinity}, 1000);
  near(halfTone.output.ramps[0], 0.10, "Master knob scales collision tone");
  const halfMelody = fakeAudioContext();
  hHalf.playMelodyTone({audioContext:halfMelody.ctx,melody:{activeVoices:new Set()}}, 65);
  near(halfMelody.output.ramps[0], 0.125, "Master knob scales Melody tone");
  const halfMp3 = fakeAudioContext();
  hHalf.setBuffers({name:"star"}, {name:"chomp"});
  hHalf.playStarSound({audioContext:halfMp3.ctx});
  hHalf.playChompSound({audioContext:halfMp3.ctx});
  near(halfMp3.output.values[0], 0.39, "Master knob scales star MP3");
  near(halfMp3.output.values[1], 0.425, "Master knob scales chomp MP3");
  hHalf.setBuffers(null,null);
  const hSilent = makeGame(0);
  const zeroTone = fakeAudioContext();
  hSilent.playPegTone({audioContext:zeroTone.ctx,lastPegSoundAt:-Infinity}, 1000);
  near(zeroTone.output.ramps[0], 0.0001, "Zero master uses safe near-zero ramp");
  const zeroMelody = fakeAudioContext();
  eq(hSilent.playMelodyTone({audioContext:zeroMelody.ctx,melody:{activeVoices:new Set()}},65),
    true,"Zero master doesn't throw on Melody");
  near(zeroMelody.output.ramps[0],0.0001,"Zero master Melody ramp remains valid");
  const hHigh = makeGame(10);
  near(hHigh.feedingSoundVolume(0.85), 1, "Gain is capped at 1, not unbounded");
}

function makeWhiteBall(h, runtime, x, y, vx, vy) {
  return {x,y,vx,vy,radius:runtime.bounce.ballRadius,ageSeconds:0};
}
function runBounce(h, runtime, output, ball, now=1000) {
  const n=output.starts.length;
  h.updateBounceWhiteBall(runtime, ball, 1/120, now);
  return output.starts.length-n;
}
function testBounceWallAndPaddle() {
  const h=makeGame();
  for (const [name,makeBall,testVector] of [
    ["left", (r)=>makeWhiteBall(h,r,r.bounce.ballRadius+0.1,400,-220,120), b=>b.vx>0],
    ["right", (r)=>makeWhiteBall(h,r,r.width-r.bounce.ballRadius-0.1,400,220,120), b=>b.vx<0],
    ["ceiling", (r)=>makeWhiteBall(h,r,180,r.bounce.ballRadius+0.1,70,-220), b=>b.vy>0],
    ["wall+ceiling corner", (r)=>makeWhiteBall(h,r,r.bounce.ballRadius+0.1,r.bounce.ballRadius+0.1,-220,-220), b=>b.vx>0&&b.vy>0]
  ]) {
    const {runtime,output}=makeBounceRuntime(h);
    const ball=makeBall(runtime);
    eq(runBounce(h,runtime,output,ball),1,`${name} plays exactly one collision sound`);
    ok(testVector(ball),`${name} still reflects physics direction`);
    near(output.ramps[0],0.20,`${name} uses normal brick collision tone`);
  }
  const {runtime,output}=makeBounceRuntime(h);
  const ball=makeWhiteBall(h,runtime,runtime.bounce.paddleX,
    runtime.bounce.paddleTopY-runtime.bounce.ballRadius-0.1, 30,240);
  eq(runBounce(h,runtime,output,ball),1,"Paddle collision plays one sound");
  ok(ball.vy<0,"Paddle collision still rebounds upward");
  near(output.ramps[0],0.20,"Paddle uses the same collision volume");
  eq(runtime.score,0,"Wall/paddle sounds do not change scoring");

  const muted=makeBounceRuntime(h,"suspended");
  const mBall=makeWhiteBall(h,muted.runtime,muted.runtime.bounce.ballRadius+0.1,400,-220,120);
  runBounce(h,muted.runtime,muted.output,mBall);
  eq(muted.output.starts.length,0,"Suspended audio context does not play wall collision");
  ok(mBall.vx>0,"Physics still runs when sound unavailable");
}

function snack(runtime, x, y, points=1, radius=10) {
  return {config:{id:points===5?"rainbow":"red"},x,y,vx:0,vy:0,radius,
    rotation:0,points,trail:[],lastTrailAt:0};
}
function testSnackGeometryAndScoring() {
  const h=makeGame();
  const {runtime,output}=makeBounceRuntime(h);
  // Keep the existing chomp effect on its normal decoded-buffer path.
  h.setBuffers(null, { name: "chomp" });
  const b=runtime.bounce;
  const farX=b.paddleX+b.paddleHalfWidth-3;
  const farY=b.paddleTopY+b.paddleHeight/2;
  eq(h.bounceSnackTouchesPet(runtime,snack(runtime,farX,farY)),false,
    "Snack at far end of paddle is outside pet circle");
  eq(h.bounceSnackTouchesPaddle(runtime,snack(runtime,farX,farY)),true,
    "Paddle rectangle catches snack at its far end");
  runtime.balls.push(snack(runtime,farX,farY,5));
  h.updateBounceSnacks(runtime,0);
  eq(runtime.balls.length,0,"Caught paddle snack is removed");
  eq(runtime.score,5,"Paddle-caught rainbow snack retains 5-point reward");
  eq(runtime.caughtCount,1,"Paddle catch counts once");

  runtime.balls.push(snack(runtime,b.paddleX,runtime.petCenterY-10));
  h.updateBounceSnacks(runtime,0);
  eq(runtime.score,6,"Pet can still catch a snack");
  eq(runtime.caughtCount,2,"Pet catch counts once");

  runtime.balls.push(snack(runtime,b.paddleX,b.paddleTopY-2));
  h.updateBounceSnacks(runtime,0);
  eq(runtime.score,7,"Snack overlapping pet and paddle scores once");
  eq(runtime.caughtCount,3,"Overlapping hitboxes do not double-count");

  const edge=snack(runtime,b.paddleX+b.paddleHalfWidth+7,b.paddleTopY-7,1,10);
  eq(h.bounceSnackTouchesPaddle(runtime,edge),true,
    "Rounded corner proximity is recognized");
  runtime.balls.push(edge);
  h.updateBounceSnacks(runtime,0);
  eq(runtime.score,8,"Paddle corner contact scores");

  const miss=snack(runtime,b.paddleX+b.paddleHalfWidth+12,b.paddleTopY+b.paddleHeight/2);
  eq(h.bounceSnackTouchesPaddle(runtime,miss),false,
    "Snacks beyond paddle radius are not collected");
  runtime.balls.push(miss);
  h.updateBounceSnacks(runtime,0);
  eq(runtime.balls.length,1,"Near miss keeps falling normally");
  eq(runtime.score,8,"Near miss cannot score");
  runtime.balls[0].x=10;
  runtime.balls[0].y=runtime.height+40;
  h.updateBounceSnacks(runtime,0);
  eq(runtime.balls.length,0,"Missed snack expires below screen");
  eq(runtime.score,8,"Offscreen expiration is not a catch");

  const atPaddle=snack(runtime,b.paddleX, b.paddleTopY);
  eq(h.bounceSnackTouchesPaddle(runtime,atPaddle),true,"Paddle center is solid");
  // White balls remain on the physics path; do not treat them as snacks.
  eq(runtime.bounce.whiteBalls.length,0,"Snack catch path does not spawn white balls");
  eq(output.starts.filter(x=>x==="tone").length,0,"Snack catch does not accidentally beep");
  h.setBuffers(null, null);
}

function testSourceSafety() {
  ok(serviceWorker.includes('2026_Oct_17_patch24_feed_audio_bounce'),
    "Cache version refreshed for new script");
  ok(serviceWorker.includes('"./daily_questions_feed_game.js"'),
    "Feeding script remains in service worker core assets");
  ok(!source.includes('document.querySelector("#feedingMixer")'),
    "No developer-facing UI added");
  ok(source.includes("now - runtime.lastPegSoundAt < 55"),
    "Existing 55ms collision cooldown is preserved");
  ok(source.includes("Math.max(0.0001, feedingSoundVolume"),
    "Volume tuning allows zero without invalid exponential ramps");
  ok(readKnob("FEED_COLLISION_TONE_VOLUME") >= 0,
    "Collision knob stays editable and non-negative");
  ok(readKnob("FEED_MELODY_TONE_VOLUME") >= 0,
    "Melody knob stays editable and non-negative");
  ok(readKnob("FEED_AUDIO_MASTER_VOLUME") >= 0,
    "Master knob stays editable and non-negative");
  const realGame = makeGame(
    readKnob("FEED_AUDIO_MASTER_VOLUME"),
    readKnob("FEED_COLLISION_TONE_VOLUME"),
    readKnob("FEED_MELODY_TONE_VOLUME")
  );
  const runtime = fakeAudioContext();
  realGame.playPegTone({ audioContext: runtime.ctx, lastPegSoundAt: -Infinity }, 1000);
  near(runtime.output.ramps[0], Math.max(0.0001, Math.min(1,
    readKnob("FEED_COLLISION_TONE_VOLUME") * readKnob("FEED_AUDIO_MASTER_VOLUME"))),
    "Configured collision knob actually controls tone output");
}

function main() {
  testTuning();
  testBounceWallAndPaddle();
  testSnackGeometryAndScoring();
  testSourceSafety();
  console.log(`Patch 24 Feeding audio/Bounce validation passed (${checks} focused assertions).`);
}
main();
