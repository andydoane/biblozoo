#!/usr/bin/env node
/* Patch 55: real-source VM regression tests for web/PWA/Capacitor diagnostics. */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const rootDir = path.resolve(__dirname, "..");
const code = fs.readFileSync(path.join(rootDir, "verse_games/shared/audio-diagnostics.js"), "utf8");
const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
const bridge = fs.readFileSync(path.join(rootDir, "verse_games/shared/bridge.js"), "utf8");
const sw = fs.readFileSync(path.join(rootDir, "service-worker.js"), "utf8");
let checks = 0;
function ok(condition, message) { checks++; assert.ok(condition, message); }
function eq(actual, expected, message) { checks++; assert.equal(actual, expected, message); }

function store() {
  const entries = new Map();
  return {
    entries,
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key)
  };
}
function emitter() {
  const callbacks = new Map();
  return {
    callbacks,
    addEventListener(name, fn) {
      if (!callbacks.has(name)) callbacks.set(name, []);
      callbacks.get(name).push(fn);
    },
    fire(name, event = {}) {
      for (const fn of callbacks.get(name) || []) fn(event);
    }
  };
}
function fakeTimers() {
  let next = 0;
  let now = 0;
  const entries = new Map();
  return {
    setTimeout(fn, delay = 0) {
      const id = ++next;
      entries.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimeout(id) { entries.delete(id); },
    advance(ms) {
      const end = now + ms;
      let guard = 0;
      while (true) {
        const ready = [...entries].filter(([, item]) => item.at <= end)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
        if (!ready.length) break;
        const [id, item] = ready[0];
        entries.delete(id);
        now = item.at;
        item.fn();
        if (++guard > 10000) throw new Error("Too many timers");
      }
      now = end;
    },
    get pending() { return entries.size; }
  };
}

function createEnvironment({ enabled = false, sharedStorage = store(),
  pathname = "/biblozoo/index.html", native = false,
  isPwa = false, ready = "loading" } = {}) {
  if (enabled) sharedStorage.setItem("biblozooAudioDiagnostics", "1");
  const timers = fakeTimers();
  const doc = emitter();
  doc.hidden = false;
  doc.readyState = ready;
  const elements = new Map();
  let nativeClicks = 0;
  function element(tagName) {
    const node = emitter();
    node.tagName = tagName.toUpperCase();
    node.style = {};
    node.hidden = false;
    node.attributes = {};
    node.setAttribute = (name, value) => { node.attributes[name] = value; };
    node.getAttribute = name => node.attributes[name] || null;
    node.remove = () => elements.delete(node.id);
    node.click = () => { nativeClicks++; node.fire("click", { target: node }); };
    node.focus = () => {};
    node.select = () => { node.selected = true; };
    node.querySelector = selector => {
      if (!node.parts) node.parts = {};
      return node.parts[selector] ||= element(selector === "textarea" ? "textarea" : "span");
    };
    return node;
  }
  doc.createElement = element;
  doc.getElementById = id => elements.get(id) || null;
  doc.body = {
    appendChild(node) { if (node.id) elements.set(node.id, node); }
  };

  class Context {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this._events = emitter();
      this.resumeResult = Promise.resolve();
      this.resumeCalls = 0;
      this.decoded = [];
      this.decodeResult = null;
    }
    addEventListener(...args) { this._events.addEventListener(...args); }
    fire(...args) { this._events.fire(...args); }
    resume() { this.resumeCalls++; return this.resumeResult; }
    decodeAudioData(data) { this.decoded.push(data); return this.decodeResult || Promise.resolve({ id: "decoded" }); }
  }
  class Source {
    constructor(context) { this.context = context; this.startCalls = 0; }
    start() { this.startCalls++; return "native-source-result"; }
  }
  class Media {
    constructor() {
      this.currentSrc = "https://app.example/biblozoo/verse_audio/john_3_16.mp3?secret=NEVER_LOG";
      this.src = this.currentSrc;
      this.currentTime = 0;
      this.duration = 20;
      this.paused = false;
      this.ended = false;
      this.readyState = 2;
      this.networkState = 1;
      this.playResult = Promise.resolve();
    }
    play() { return this.playResult; }
  }
  const windowEvents = emitter();
  const messages = [];
  let fetchCalls = 0;
  const docUrl = `https://app.example${pathname}`;
  const win = {
    AudioContext: Context,
    webkitAudioContext: Context,
    BaseAudioContext: Context,
    HTMLMediaElement: Media,
    AudioScheduledSourceNode: Source,
    URL,
    Blob,
    document: doc,
    localStorage: sharedStorage,
    sessionStorage: store(),
    location: { pathname, href: docUrl, protocol: native ? "capacitor:" : "https:" },
    navigator: { standalone: isPwa },
    Capacitor: native ? { isNativePlatform: () => true } : undefined,
    matchMedia: () => ({ matches: isPwa }),
    console: { debug: (...args) => messages.push(args) },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    addEventListener: windowEvents.addEventListener,
    fetch(input) {
      fetchCalls++;
      return Promise.resolve({ ok: !String(input).includes("bad"), status: 404 });
    }
  };
  const originals = { Context, mediaPlay: Media.prototype.play, resume: Context.prototype.resume,
    decode: Context.prototype.decodeAudioData, sourceStart: Source.prototype.start,
    fetch: win.fetch };
  vm.runInNewContext(code, { window: win, URL, Blob, setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout }, { filename: "audio-diagnostics.js" });
  return { win, doc, windowEvents, timers, Context, Media, Source, originals,
    sharedStorage, elements, messages,
    get fetchCalls() { return fetchCalls; },
    get nativeClicks() { return nativeClicks; } };
}
function types(api) { return api.getEvents().map(event => event.type); }
function contains(api, type) { return types(api).includes(type); }
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

async function main() {
  // Disabled instrumentation must not touch native audio, media or fetch APIs.
  {
    const e = createEnvironment({ enabled: false });
    ok(!e.win.BibloZooAudioDiagnostics, "No diagnostic interface when opt-in is off");
    eq(e.win.AudioContext, e.originals.Context, "No AudioContext wrapping without opt-in");
    eq(e.Context.prototype.resume, e.originals.resume, "Native resume left unchanged");
    eq(e.Media.prototype.play, e.originals.mediaPlay, "Native media play left unchanged");
    eq(e.win.fetch, e.originals.fetch, "Native fetch left unchanged");
    eq(e.Source.prototype.start, e.originals.sourceStart, "No source scheduling wrapper when disabled");
    eq(e.doc.callbacks.size, 0, "No developer lifecycle listeners when disabled");
    eq(e.elements.size, 0, "No developer buttons when disabled");
  }
  for (const env of [
    { label: "ordinary-browser", options: {} },
    { label: "installed-pwa", options: { isPwa: true } },
    { label: "capacitor", options: { native: true } }
  ]) {
    const e = createEnvironment({ enabled: true, ready: "complete", ...env.options });
    const api = e.win.BibloZooAudioDiagnostics;
    ok(api, `${env.label}: diagnostics activated`);
    eq(api.getReport().environment, env.options.native ? "capacitor" :
      env.options.isPwa ? "pwa" : "web", `${env.label}: environment label`);
    ok(e.elements.has("biblozooAudioDiagOpen"), `${env.label}: optional developer opener`);
    ok(e.elements.has("biblozooAudioDiagPanel"), `${env.label}: optional export panel`);
    ok(e.win.AudioContext !== e.originals.Context, `${env.label}: diagnostic context wrapper`);
    eq(e.Media.prototype.play === e.originals.mediaPlay, false,
      `${env.label}: diagnostic media wrapper`);
    eq(e.win.fetch === e.originals.fetch, false, `${env.label}: diagnostic fetch wrapper`);
    const ctx = new e.win.AudioContext();
    ok(ctx instanceof e.originals.Context, `${env.label}: original native context object returned`);
    ok(contains(api, "context-created"), `${env.label}: new context logged`);
    const source = new e.Source(ctx);
    eq(source.start(), "native-source-result", `${env.label}: source-start return preserved`);
    eq(source.startCalls, 1, `${env.label}: native start invoked exactly once`);
    ok(contains(api, "context-source-start"), `${env.label}: Web Audio source schedules logged`);
    ctx.state = "interrupted";
    let releaseResume;
    const stuck = new Promise(resolve => { releaseResume = resolve; });
    ctx.resumeResult = stuck;
    const returned = ctx.resume();
    eq(returned, stuck, `${env.label}: native resume promise identity preserved`);
    e.timers.advance(1800);
    ok(contains(api, "context-resume-pending"), `${env.label}: stalled resume observed`);
    ctx.state = "running";
    ctx.currentTime = 5;
    releaseResume();
    await settle();
    ok(contains(api, "context-resume-settled"), `${env.label}: eventual resume observed`);
    ctx.currentTime = 5.2;
    e.timers.advance(200);
    ok(contains(api, "context-clock-advanced"), `${env.label}: clock advanced after resume`);
    ctx.fire("statechange");
    ok(contains(api, "context-state"), `${env.label}: context state changed`);
    const resumeCallsBeforeLifecycle = ctx.resumeCalls;
    // Simulate a frozen clock on foreground return, without automatic recovery.
    e.doc.hidden = true;
    e.doc.fire("visibilitychange");
    e.win.navigator.standalone = false;
    e.doc.hidden = false;
    e.doc.fire("visibilitychange");
    e.timers.advance(500);
    e.timers.advance(180);
    ok(contains(api, "context-clock-stalled"), `${env.label}: frozen clock diagnosed`);
    e.windowEvents.fire("pagehide", { persisted: false });
    e.windowEvents.fire("pageshow", { persisted: true });
    e.windowEvents.fire("focus");
    e.windowEvents.fire("blur");
    for (const type of ["lifecycle-pagehide", "lifecycle-pageshow", "lifecycle-focus", "lifecycle-blur"])
      ok(contains(api, type), `${env.label}: ${type} logged`);
    eq(ctx.resumeCalls, resumeCallsBeforeLifecycle,
      `${env.label}: lifecycle diagnostics never attempt to resume audio`);
    // Test play() pass-through, pending and rejected results.
    const media = new e.Media();
    let finishPlay;
    media.playResult = new Promise(resolve => { finishPlay = resolve; });
    const mediaReturned = media.play();
    eq(mediaReturned, media.playResult, `${env.label}: original play promise preserved`);
    e.timers.advance(1800);
    ok(contains(api, "media-play-pending"), `${env.label}: hanging HTML media logged`);
    finishPlay();
    await settle();
    ok(contains(api, "media-play-settled"), `${env.label}: successful HTML media logged`);
    e.timers.advance(1200);
    ok(contains(api, "media-progress-stalled"), `${env.label}: stalled HTML media progress logged`);
    // Source names can identify static audio assets; never leak URL query tokens.
    const report = api.exportReport();
    ok(report.includes("john_3_16.mp3"), `${env.label}: static source filename retained`);
    ok(!report.includes("NEVER_LOG"), `${env.label}: query token stripped`);
    ok(!report.includes("https://app.example/biblozoo/verse_audio"),
      `${env.label}: full media URLs omitted`);
    const refused = Promise.reject(Object.assign(new Error("private information"), { name: "NotAllowedError" }));
    refused.catch(() => {});
    media.playResult = refused;
    eq(media.play(), refused, `${env.label}: rejected play promise preserved`);
    await settle();
    ok(contains(api, "media-play-rejected"), `${env.label}: failed play logged`);
    ok(!api.exportReport().includes("private information"),
      `${env.label}: rejected playback message not stored`);
    const fetched = e.win.fetch("/biblozoo/verse_audio/bad.mp3?token=NEVER_LOG");
    await fetched;
    await settle();
    ok(contains(api, "sound-fetch-failed"), `${env.label}: failed audio fetch logged`);
    const normal = await e.win.fetch("/biblozoo/not-audio.json?anything=1");
    eq(normal.ok, true, `${env.label}: unrelated fetch untouched in effect`);
    const decodeError = Object.assign(new Error("private payload"), { name: "EncodingError" });
    const secondCtx = new e.win.AudioContext();
    secondCtx.decodeResult = Promise.reject(decodeError);
    secondCtx.decodeResult.catch(() => {});
    const attempt = secondCtx.decodeAudioData(new Uint8Array([1]));
    attempt.catch(() => {});
    await settle();
    ok(contains(api, "sound-decode-failed"), `${env.label}: failed decode logged`);
    const launcher = e.elements.get("biblozooAudioDiagOpen");
    const panel = e.elements.get("biblozooAudioDiagPanel");
    launcher.click();
    eq(panel.hidden, false, `${env.label}: on-device developer panel opened`);
    const field = panel.querySelector("textarea");
    ok(field.value.includes('"version": 55'), `${env.label}: export populated`);
    panel.fire("click", { target: { getAttribute: () => "clear" } });
    eq(api.getEvents()[0].type, "diagnostics-cleared", `${env.label}: report can be cleared`);
    panel.fire("click", { target: { getAttribute: () => "disable" } });
    eq(e.sharedStorage.getItem("biblozooAudioDiagnostics"), "0",
      `${env.label}: developer can disable future instrumentation`);
  }

  // Cross-page navigation uses a bounded same-origin log rather than an
  // isolated sessionStorage copy that disappears on document replacement.
  {
    const shared = store();
    const first = createEnvironment({ enabled: true, sharedStorage: shared });
    const previous = first.win.BibloZooAudioDiagnostics;
    previous.record("activity-main", { detail: "main" });
    const next = createEnvironment({ sharedStorage: shared,
      pathname: "/biblozoo/verse_games/verse_munch/index.html" });
    ok(contains(next.win.BibloZooAudioDiagnostics, "activity-main"),
      "Log survives navigation from main app to independent game document");
    next.win.BibloZooAudioDiagnostics.record("activity-game");
    ok(contains(previous, "activity-main"), "Original page log remains accessible");
    const archive = JSON.parse(shared.getItem("biblozooAudioDiagnosticsLog"));
    ok(archive.some(entry => entry.type === "activity-game"),
      "External-game events persist in the shared log");
    eq(next.win.BibloZooAudioDiagnostics.getReport().events.at(-1).page,
      "/biblozoo/verse_games/verse_munch/index.html", "No URL query or profile leakage in page key");
    for (let i = 0; i < 340; i++) next.win.BibloZooAudioDiagnostics.record("stress-event", { index: i });
    eq(next.win.BibloZooAudioDiagnostics.getEvents().length, 300,
      "In-memory event log limited to 300 entries");
    eq(JSON.parse(shared.getItem("biblozooAudioDiagnosticsLog")).length, 300,
      "Persisted event log limited to 300 entries");
  }

  // Actual source integration: diagnostic script loads ahead of sound users.
  ok(html.indexOf('src="verse_games/shared/audio-diagnostics.js"') > -1,
    "Main page loads developer-only diagnostics");
  ok(html.indexOf('src="verse_games/shared/audio-diagnostics.js"') <
    html.indexOf('src="daily_questions_feed_game.js"'),
    "Instrumentation begins before main app and feeding audio initialize");
  ok(bridge.includes('new URL("audio-diagnostics.js", document.currentScript.src)'),
    "Game/playground pages load the same shared diagnostic module");
  ok(bridge.includes('if (window.localStorage?.getItem("biblozooAudioDiagnostics") !== "1") return;'),
    "Standalone games skip script injection when logging is disabled");
  ok(html.includes('setting === "on"') && html.includes('setting === "off"') &&
    bridge.includes('setting === "on"') && bridge.includes('setting === "off"'),
    "Enable and disable URL options work on main and standalone pages");
  ok(sw.includes('"./verse_games/shared/audio-diagnostics.js"'),
    "Existing PWA cache includes the shared diagnostics module");
  ok(/patch(?:55_audio_diagnostics|56_audio_clock_recovery|57_coordinated_audio_recovery|58_native_audio_session_diagnostics|59_native_reactivation_experiment|60_interruption_coordinator|61_shared_welcome_back|62_scramble_welcome_back|63_bugs_munch_splat_welcome_back|64_action_games_welcome_back|64_1_recovery_escape_diagnostics)/.test(sw),
    "PWA cache includes Patch 55 diagnostics and has a valid update version");
  ok(!/import\s+.*@capacitor|from\s+["']@capacitor|AVAudioSession|@capacitor\/app/.test(code),
    "Diagnostics require no native-only audio dependency");
  console.log(`Patch 55 audio diagnostics: ${checks} assertions passed.`);
}

main().catch(err => { console.error(err); process.exitCode = 1; });
