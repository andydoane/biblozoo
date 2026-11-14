"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const tracks = read("verse_games/shared/native-learn-tracks.js");
const game = read("flashcards/flashcards.js");
const css = read("flashcards/flashcards.css");
const html = read("index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const source = read("flashcards/instruction-audio.js");
const sounds = [
  ["difficulty_intro", "really_well", "flashcard-instruction-no-help", "flashcard_instruction_no_help"],
  ["difficulty_intro", "pretty_good", "flashcard-instruction-first-letter", "flashcard_instruction_first_letter"],
  ["difficulty_intro", "still_learning", "flashcard-instruction-pictures", "flashcard_instruction_pictures"],
  ["recording_intro", "really_well", "flashcard-instruction-record", "flashcard_instruction_record"],
  ["comparison", "really_well", "flashcard-instruction-listen", "flashcard_instruction_listen"]
];
assert.match(workflow, /node scripts\/validate_flashcards_instruction_audio\.js/);
assert.match(html, /flashcards\/instruction-audio\.js[\s\S]*?flashcards\/flashcards\.js/);
for (const [, , id, file] of sounds) {
  assert(fs.statSync(path.join(__dirname, "..", "flashcards", file + ".mp3")).size > 1000);
  assert(swift.includes('"' + file + '"'), "native allowlist missing " + file);
  assert(source.includes('"' + id + '"'), "JS missing " + id);
}
assert.match(swift, /subdirectory:\s*"public\/flashcards"/);
assert.match(tracks, /flashcard-instruction-\(no-help\|first-letter\|pictures\|record\|listen\)/);
assert.match(game, /instructions\(\)\?\.sync\(instructionView, state\.difficulty, state\.selectedVerseId\)/);
assert.match(game, /comparedAudio\.hasRecording && comparedAudio\.captureOnly !== true/);
assert.match(game, /state\.view === "comparison" && !canNarrateComparison/);
assert.match(game, /requesting \|\| locked/);
assert.match(game, /const nextDisabled = instructionLocked\(\) \|\| waiting/);
assert.match(game, /audio\.status === "loading" \|\| instructionLocked\(\)/);
assert.match(game, /retry\.id\s*=\s*"flashcardsInstructionRetryBtn"/);
assert.match(game, /function fitComparisonInstruction\(wrap\)/);
assert.match(game, /message\.scrollHeight <= availableHeight/);
assert.doesNotMatch(css, /width:\s*min\(100%,\s*24ch\)/);
assert.match(css, /\.flashcards-recall-actions button:disabled/);

function harness(native = true, muted = false) {
  let pending = [], frames = [], now = 0, timers = new Map(), nextTimer = 0;
  let starts = [], stops = 0, primes = 0, changes = 0, errors = [], browser = [];
  const events = new Map();
  const doc = {hidden: false, addEventListener(k, f) { events.set(k, f); }};
  const root = {
    document: doc,
    BibloZooNativeOnlyOutput: {enabled: native},
    Capacitor: { getPlatform: () => "ios" },
    addEventListener(k, f) { events.set(k, f); },
    requestAnimationFrame(f) { frames.push(f); return frames.length; },
    setTimeout(f) { const id = ++nextTimer; timers.set(id, f); return id; },
    clearTimeout(id) { timers.delete(id); },
    Audio: class {
      constructor(url) { this.url = url; this.listeners = {}; browser.push(this); }
      addEventListener(event, cb) { this.listeners[event] = cb; }
      play() { return Promise.resolve(); }
      pause() { this.paused = true; }
      removeAttribute(attr) { if (attr === "src") this.src = ""; }
      load() {}
      emit(event) { this.listeners[event]?.(); }
    }
  };
  root.BibloZooNativeLearnTracks = {
    isAvailable: () => true,
    primeFromGesture() { primes++; },
    play(id) { starts.push(id); return new Promise(resolve => pending.push({id, resolve})); },
    stop() { stops++; }
  };
  vm.runInNewContext(source, {window: root, console});
  const owner = root.BibloZooFlashcardsInstructions.create({
    onChange: () => { changes++; },
    onError: e => errors.push(e),
    isMuted: () => muted
  });
  return {root,owner,pump() {const q = frames.splice(0); q.forEach(f => f());},
    resolve(result) {const first = pending.shift(); assert(first); first.resolve(result); return first.id;},
    get starts() { return starts; }, get stops() {return stops;},
    get primes() {return primes;},get changes() {return changes;},
    get errors() {return errors;},get browser() {return browser;},
    events, get pending() {return pending;},get timers() {return timers;}};
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

async function main() {
  const h = harness();
  for (const [view, mode, id] of sounds) {
    const first = h.owner.sync(view, mode, "john_3_16");
    assert.equal(first.locked, true);
    assert.equal(first.soundId, id);
    h.owner.sync(view, mode, "john_3_16"); // ordinary DOM rerender
    h.pump();
    assert.equal(h.starts.at(-1), id);
    assert.equal(h.owner.snapshot().locked, true, "native acceptance is not an ended event");
    h.resolve({ended: true});
    await tick();
    assert.equal(h.owner.snapshot().locked, false, "only actual ended unlocks");
    const count = h.starts.length;
    h.owner.sync(view, mode, "john_3_16");
    h.pump();
    assert.equal(h.starts.length, count, "same view must not repeat instruction");
  }
  const x = h.owner.sync("difficulty_intro", "pretty_good", "other_verse");
  assert.equal(x.locked, true, "new verse is a fresh screen");
  h.pump();
  h.resolve({ended: false, reason: "interrupted"});
  await tick();
  assert.equal(h.owner.snapshot().failed, true);
  assert(h.errors.at(-1).includes("Try Instructions Again"));
  h.owner.retryFromGesture();
  assert.equal(h.primes, 1, "retry must claim from real user gesture");
  assert.equal(h.owner.snapshot().locked, true);
  h.pump();
  h.resolve({ended: true});
  await tick();
  assert.equal(h.owner.snapshot().locked, false);

  h.owner.sync("recording_intro", "pretty_good", "other_verse");
  h.pump(); // leave a pending completion from an old view
  const old = h.pending.shift();
  h.owner.sync("comparison", "pretty_good", "other_verse");
  h.pump();
  old.resolve({ended: true}); // stale async result never unlocks new comparison
  await tick();
  assert.equal(h.owner.snapshot().locked, true);
  assert.equal(h.owner.snapshot().soundId, "flashcard-instruction-listen");
  h.root.document.hidden = true;
  h.events.get("visibilitychange")();
  assert.equal(h.owner.snapshot().failed, true);
  h.root.document.hidden = false;
  h.owner.sync("comparison", "pretty_good", "other_verse");
  h.pump();
  assert.equal(h.owner.snapshot().failed, true, "foreground must not auto-replay");
  h.resolve({ended: false}); // stale currently pending call
  await tick();
  assert.equal(h.owner.snapshot().failed, true);
  h.owner.retryFromGesture();
  h.pump();
  h.resolve({ended: true});
  await tick();
  assert.equal(h.owner.snapshot().locked, false);
  h.owner.stop();
  assert.equal(h.owner.snapshot().status, "idle");

  const missing = harness();
  missing.root.BibloZooNativeLearnTracks.isAvailable = () => false;
  missing.owner.sync("recording_intro", "really_well", "john_3_16");
  missing.pump();
  assert.equal(missing.owner.snapshot().failed, true);
  assert.equal(missing.browser.length, 0, "never HTML audio fallback in native Audio Test");

  const web = harness(false);
  web.owner.sync("recording_intro", "really_well", "john_3_16");
  web.pump();
  assert.equal(web.browser.length, 1);
  assert.equal(web.browser[0].url, "flashcards/flashcard_instruction_record.mp3");
  assert.equal(web.owner.snapshot().locked, true);
  web.browser[0].emit("ended");
  assert.equal(web.owner.snapshot().locked, false);
  assert.equal(web.starts.length, 0, "web mode must not invoke native output");

  const denied = harness(false);
  denied.owner.sync("recording_intro", "really_well", "john_3_16");
  denied.pump();
  denied.browser[0].emit("error");
  assert.equal(denied.owner.snapshot().failed, true);
  denied.owner.retryFromGesture();
  assert.equal(denied.browser.length, 2,
    "browser retry must invoke play in the original click task, not later RAF");
  denied.browser[1].emit("ended");
  assert.equal(denied.owner.snapshot().locked, false);

  const quiet = harness(true, true);
  quiet.owner.sync("difficulty_intro", "really_well", "john_3_16");
  quiet.pump();
  assert.equal(quiet.owner.snapshot().locked, false, "intentional mute should not trap child");
  assert.equal(quiet.starts.length, 0);

  console.log("Flashcards instructions PASS: five fixed MP3s, native end gate, retry/interruption/stale guard, no Web native fallback, web ended, mute and measured comparison fit.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
