"use strict";
/* N6a — actual shared Verse Detail/Flashcards source plus controlled VM tests.
 * Passing source checks does not compile Swift or prove audible iPhone output.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const base = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(base, p), "utf8");
const app = read("app.js");
const flashcards = read("flashcards/flashcards.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const list = JSON.parse(read("verse_data/verse_list.json"));
const index = read("index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");
new Function(app);
assert.match(app, /playVersePreview: playVerseDetailListen/);
assert.match(app, /stopVersePreview: cancelVerseDetailListen/);
assert.match(flashcards, /await api\.playVersePreview\(selected\.id\)/);
assert.match(flashcards, /if \(previewPlaying\) api\?\.stopVersePreview\?\.\(\)/);
assert.match(app, /id="btnDetailListen"/);
assert.match(app, /id="verseDetailListenStatus"/);
assert.match(app, /role="status" aria-live="polite"/);
assert.match(app, /function setVerseDetailPreviewStatus/);
assert.match(app, /window\.BibloZooNativeLearnListen\.startFromGesture\(\{/);
assert.match(app, /event\.kind === "completed" &&\s+event\.stage === "verse"/);
assert.match(app, /const hadNativePreview = verseDetailListenActive/);
assert.match(app, /if \(hadNativePreview\) window\.BibloZooNativeLearnListen\.stop\(\)/);
assert.match(app, /if \(isNativeLearnListenMode\(\) && verseDetailListenActive\)/);
assert.match(app, /if \(document\.hidden && verseDetailListenActive\) cancelVerseDetailListen\(\)/);
assert.match(app, /if \(verseDetailListenActive\) cancelVerseDetailListen\(\)/);
assert.match(index, /shared\/native-learn-listen\.js/);
assert.match(swift, /soundId\.hasPrefix\("learn-ref-"\)/);
assert.match(swift, /soundId\.hasPrefix\("learn-verse-"\)/);
assert.match(swift, /publishedLearnVerseIDs\.contains\(verseId\)/);
assert.match(swift, /json\["published"\] as\? Bool == true/);
assert.match(swift, /subdirectory: "public\/verse_audio"/);
assert.match(workflow, /validate_native_verse_previews_n6a\.js/);
assert.match(handoff, /N6a/);
for (const verseId of list) {
  const meta = JSON.parse(read("verse_data/" + verseId + ".json"));
  if (!meta.published) continue;
  assert.equal(meta.verseId, verseId);
  for (const suffix of ["_ref.mp3", ".mp3"])
    assert.ok(fs.statSync(path.join(base, "verse_audio", verseId + suffix)).size > 0,
      "missing native published preview clip " + verseId + suffix);
}
function extract(start, end) {
  const i = app.indexOf(start);
  const j = app.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, "missing app block " + start);
  return app.slice(i, j);
}
const source =
  extract("let verseDetailListenToken = 0;", "// tokenization (copied conceptually from old engine)");
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ native = true, screen = "detail", isMuted = false } = {}) {
  const actions = [], events = {}, pending = [];
  const statuses = {
    button: { textContent: "Listen to the Verse" },
    message: { textContent: "", hidden: true }
  };
  const Screen = { VERSE_DETAIL: "detail", FLASHCARDS: "flashcards" };
  const State = { screen };
  let hidden = false;
  const audioEl = {
    currentTime: 0, src: "", listeners: new Map(),
    pause() { actions.push(["html-pause"]); },
    addEventListener(name, callback) {
      const set = this.listeners.get(name) || new Set();
      set.add(callback);this.listeners.set(name,set);
    },
    removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); },
    fire(name) { for (const fn of [...this.listeners.get(name) || []]) fn(); }
  };
  const document = {
    get hidden() { return hidden; },
    set hidden(next) { hidden = next; },
    getElementById(name) {
      if (State.screen !== Screen.VERSE_DETAIL) return null;
      return name === "btnDetailListen" ? statuses.button :
        name === "verseDetailListenStatus" ? statuses.message : null;
    },
    addEventListener(name, callback) { events["document:" + name] = callback; }
  };
  const nativeController = {
    startFromGesture(input) {
      actions.push(["native-start", input.verseId]);
      const item = deferred();
      pending.push({ callback: input.onEvent, wait: item, id: input.verseId });
      return item.promise;
    },
    stop() { actions.push(["native-stop"]); }
  };
  const window = {
    BibloZooNativeLearnListen: nativeController,
    addEventListener(name, callback) { events["window:" + name] = callback; }
  };
  const ctx = {
    console, window, document, Screen, State, audioEl, Promise,
    AUDIO_DIR: "verse_audio/", AUDIO_FILE: "old-verse.mp3", muted: isMuted,
    isNativeLearnListenMode() { return native; },
    setAudioSrc(src) { actions.push(["html-src", src]);audioEl.src = src; },
    safePlay() { actions.push(["html-play"]);return Promise.resolve(); }
  };
  vm.createContext(ctx);
  vm.runInContext(source + "\nthis.api = {playVerseDetailListen,cancelVerseDetailListen};", ctx);
  return {
    actions, events, pending, statuses, document, State, Screen, audioEl,
    play: ctx.api.playVerseDetailListen, stop: ctx.api.cancelVerseDetailListen,
    controller: nativeController
  };
}
async function flush() {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}
async function testDetail() {
  const h = fixture();
  const result = h.play("john_3_16");
  assert.deepEqual(h.actions.filter(x => x[0] === "native-start"),
    [["native-start", "john_3_16"]], "gesture activation reached native synchronously");
  assert.equal(h.actions.some(x => x[0] === "html-play"), false);
  assert.equal(h.statuses.button.textContent, "Stop Listening");
  assert.equal(h.statuses.message.hidden, false);
  const request = h.pending.at(-1);
  request.wait.resolve({ ready: true });
  await flush();
  request.callback({kind:"stage",stage:"reference"});
  assert.match(h.statuses.message.textContent, /reference/);
  request.callback({kind:"stage-ended",stage:"reference"});
  request.callback({kind:"stage",stage:"verse"});
  assert.match(h.statuses.message.textContent, /verse/);
  request.callback({kind:"progress",stage:"verse",positionMs:4000});
  request.callback({kind:"completed",stage:"reference"});
  let settled = false;
  void result.then(() => { settled = true; });
  await flush();
  assert.equal(settled, false, "reference completion / position cannot finish preview");
  request.callback({kind:"completed",stage:"verse"});
  assert.equal(await result, true);
  assert.equal(h.statuses.button.textContent, "Listen to the Verse");
  assert.equal(h.statuses.message.hidden, true);
  assert.equal(h.actions.filter(x => x[0] === "html-play").length, 0);
}
async function testFlashcards() {
  const h = fixture({screen:"flashcards"});
  const result = h.play("psalm_23_4");
  assert.equal(h.pending[0].id, "psalm_23_4");
  h.pending[0].wait.resolve({ ready: true });
  await flush();
  h.pending[0].callback({kind:"completed",stage:"verse"});
  assert.equal(await result, true, "Flashcards completion contract remains true after native end");
  assert.equal(h.actions.some(x => x[0] === "html-play"),false);
}
async function testCancellationAndStale() {
  const h = fixture();
  const first = h.play("john_3_16");
  const stale = h.pending.at(-1);
  h.stop();
  assert.equal(await first, false);
  assert.ok(h.actions.some(x => x[0] === "native-stop"));
  const second = h.play("psalm_23_4");
  const current = h.pending.at(-1);
  stale.callback({kind:"completed",stage:"verse"});
  stale.wait.resolve({ready:false,reason:"stale"});
  await flush();
  current.wait.resolve({ready:true});
  await flush();
  current.callback({kind:"completed",stage:"reference"});
  let done = false;
  void second.then(() => { done = true; });
  await flush();
  assert.equal(done,false,"old source and reference completion ignored");
  current.callback({kind:"completed",stage:"verse"});
  assert.equal(await second,true);
}
async function testInterruptionFailureAndMute() {
  const h = fixture();
  const mid = h.play("john_3_16");
  h.pending[0].wait.resolve({ready:true});
  await flush();
  h.pending[0].callback({kind:"interrupted",stage:"verse"});
  assert.equal(await mid,false);
  assert.match(h.statuses.message.textContent,/paused/);
  assert.equal(h.statuses.button.textContent,"Listen to the Verse");
  const retry = h.play("john_3_16");
  h.pending[1].wait.resolve({ready:false,reason:"interruption-pending"});
  assert.equal(await retry,false);
  assert.match(h.statuses.message.textContent,/try again/);
  const hidden = fixture();
  const stopped = hidden.play("john_3_16");
  hidden.document.hidden = true;
  hidden.events["document:visibilitychange"]();
  assert.equal(await stopped,false);
  assert.ok(hidden.actions.some(x=>x[0]==="native-stop"));
  const muted = fixture({isMuted:true});
  assert.equal(await muted.play("john_3_16"),false);
  assert.equal(muted.actions.some(x=>x[0]==="native-start"),false);
}
async function testWebUnchanged() {
  const h = fixture({native:false});
  const result = h.play("john_3_16");
  await flush();
  assert.deepEqual(h.actions.filter(x=>x[0]==="html-src").map(x=>x[1]),
    ["old-verse.mp3","verse_audio/john_3_16_ref.mp3"]);
  h.audioEl.fire("ended");
  await flush();
  assert.ok(h.actions.some(x=>x[0]==="html-src"&&x[1]==="verse_audio/john_3_16.mp3"));
  h.audioEl.fire("ended");
  assert.equal(await result,true);
  assert.ok(h.actions.some(x=>x[0]==="html-src"&&x[1]==="old-verse.mp3"));
  assert.equal(h.actions.some(x=>x[0]==="native-start"),false);
}
(async () => {
  await testDetail();
  await testFlashcards();
  await testCancellationAndStale();
  await testInterruptionFailureAndMute();
  await testWebUnchanged();
  console.log("N6a shared Verse Detail/Flashcards preview: published native ref→verse, current-only end, Stop, interruption, no Web fallback and existing Web behavior passed.");
})().catch(err => {console.error(err);process.exitCode=1;});
