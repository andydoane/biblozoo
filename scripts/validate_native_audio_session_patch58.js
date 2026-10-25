#!/usr/bin/env node
/* Patch 58: focused read-only native observation + PWA-compatible export tests.
 * This exercises the real shared diagnostics JS with a fake optional bridge;
 * Swift integration must additionally be built on macOS using Xcode. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "verse_games/shared/audio-diagnostics.js"), "utf8");
const swift = fs.readFileSync(path.join(root, "ios/App/App/AppDelegate.swift"), "utf8");
const scene = fs.readFileSync(path.join(root, "ios/App/App/SceneDelegate.swift"), "utf8");
const sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
let assertions = 0;
function ok(value, reason) { assertions++; assert.ok(value, reason); }
function eq(a, b, reason) { assertions++; assert.equal(a, b, reason); }
function memory() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key) };
}
function eventTarget() {
  const handlers = new Map();
  return { addEventListener(type, handler) {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type).push(handler);
  }, fire(type, event = {}) { for (const fn of handlers.get(type) || []) fn(event); }, handlers };
}
function fakeNative() {
  let enabled = false, sequence = 0;
  const events = [], calls = [], eventsForExport = () => events.slice();
  function append(type, extra = {}) {
    const entry = { type, time: "2026-10-25T17:12:28.281Z", sequence: ++sequence,
      category: "AVAudioSessionCategoryAmbient", mode: "AVAudioSessionModeDefault",
      otherAudioPlaying: true, secondaryAudioSilenced: false,
      outputPorts: ["Speaker"], ...extra };
    events.push(entry);
    return entry;
  }
  const plugin = {
    enable: async () => {
      calls.push("enable");
      if (!enabled) { enabled = true; append("native-audio-snapshot", { label: "enabled" }); }
      return { enabled };
    },
    snapshot: async ({ label }) => { calls.push("snapshot:" + label); append("native-audio-snapshot", { label }); },
    getEvents: async ({ since }) => {
      calls.push("getEvents:" + since);
      return { events: eventsForExport().filter(e => e.sequence > since) };
    },
    clear: async () => { calls.push("clear"); events.splice(0); },
    disable: async () => { calls.push("disable"); enabled = false; events.splice(0); }
  };
  return { plugin, calls, append, events };
}
function mockEnvironment({enabled=true, native=false, pwa=false, plugin=null, stored=null}={}) {
  const localStorage = stored || memory();
  if (enabled) localStorage.setItem("biblozooAudioDiagnostics", "1");
  const document = eventTarget();
  document.hidden = false;
  document.readyState = "loading";
  document.body = { appendChild() {} };
  const windowEvents = eventTarget();
  const win = {
    document, localStorage, sessionStorage: memory(),
    location: { pathname: "/", href: "capacitor://localhost/", protocol: native ? "capacitor:" : "https:" },
    navigator: { standalone: pwa }, matchMedia: () => ({ matches: pwa }),
    Capacitor: native ? { isNativePlatform: () => true,
      Plugins: plugin ? { BibloZooAudioSessionDiagnostics: plugin } : {} } : undefined,
    console: { debug() {} }, addEventListener: windowEvents.addEventListener,
    setTimeout() { return 1; }, clearTimeout() {},
    URL, Blob
  };
  vm.runInNewContext(source, { window: win, URL, Blob });
  return { win, document, localStorage, windowEvents };
}
async function main() {
  // Swift audit-only guarantees, native lifecycle and safe Capacitor registration.
  ok(/2026_Oct_25_patch(58_native_audio_session_diagnostics|59_native_reactivation_experiment|60_interruption_coordinator|61_shared_welcome_back|62_scramble_welcome_back)/.test(sw), "Cache version updated");
  ok(sw.includes('"./verse_games/shared/audio-diagnostics.js"'), "PWA retains diagnostic asset");
  ok(sw.includes('"./daily_questions_feed_game.js"'), "PWA retains Feeding asset");
  ok(sw.includes('"./app.js"'), "PWA retains main app");
  ok(swift.includes('import AVFAudio'), "Native session APIs imported");
  ok(swift.includes('CAPPlugin, CAPBridgedPlugin'), "Capacitor 8 plugin interface");
  ok(swift.includes('public let jsName = "BibloZooAudioSessionDiagnostics"'), "Bridge name matches JS");
  ok(scene.includes('window?.rootViewController = BibloZooDiagnosticsBridgeViewController()'), "Scene uses local bridge");
  ok(scene.includes('bridge?.registerPluginInstance(BibloZooAudioSessionDiagnosticsPlugin())'), "Native diagnostic plugin registered");
  ok(scene.includes('super.capacitorDidLoad()'), "Capacitor bridge lifecycle preserved");
  for (const notification of ["interruptionNotification", "routeChangeNotification",
    "mediaServicesWereLostNotification", "mediaServicesWereResetNotification",
    "silenceSecondaryAudioHintNotification", "didBecomeActiveNotification", "didEnterBackgroundNotification"]) {
    ok(swift.includes(notification), "Observes " + notification);
  }
  for (const method of ["enable", "snapshot", "getEvents", "clear", "disable"]) {
    ok(swift.includes(`CAPPluginMethod(name: "${method}"`), "Plugin has " + method);
  }
  ok(!/\bAVAudioSession\.sharedInstance\(\)\.set(?:Active|Category|Mode)\s*\(/.test(swift),
    "Native never mutates audio-session configuration");
  ok(!/\b(?:session|audioSession)\.set(?:Active|Category|Mode)\s*\(/.test(swift),
    "No audio-session activation or category mutation");
  ok(!/import\s+.*@capacitor|from\s+["']@capacitor/.test(source), "Web has no mandatory Capacitor import");
  // Disabled: no plugin method invocation and zero public diagnostic APIs.
  {
    const nativeStub = fakeNative();
    const e = mockEnvironment({ enabled: false, native: true, plugin: nativeStub.plugin });
    ok(!e.win.BibloZooAudioDiagnostics, "Developer opt-in gating preserved");
    eq(nativeStub.calls.length, 0, "Native bridge untouched when logging disabled");
    eq(e.document.handlers.size, 0, "No extra DOM hooks when disabled");
  }
  // Plain browser and installed PWA gracefully skip all native bridge work.
  for (const label of ["browser", "pwa", "capacitor-without-plugin"]) {
    const e = mockEnvironment({ native: label === "capacitor-without-plugin", pwa: label === "pwa" });
    const api = e.win.BibloZooAudioDiagnostics;
    ok(api, `${label} diagnostics still work`);
    await api.refreshNative();
    ok(api.getReport().events.some(x => x.type === "diagnostics-enabled"), `${label} normal events retained`);
    eq(api.getReport().events.filter(x => x.type.startsWith("native-audio-")).length, 0,
      `${label} does not fabricate native observations`);
  }
  // Native plugin: enables once, accepts timestamped events, imports exact metadata.
  {
    const nativeStub = fakeNative();
    const e = mockEnvironment({ native: true, plugin: nativeStub.plugin });
    const api = e.win.BibloZooAudioDiagnostics;
    await api.refreshNative();
    eq(nativeStub.calls.filter(x => x === "enable").length, 1, "Native observer enabled once");
    const initial = api.getEvents().filter(x => x.type === "native-audio-snapshot");
    ok(initial.length >= 1, "Initial native session snapshot included");
    eq(initial[0].page, "/native-ios", "Source of session event distinguished from JS");
    eq(initial[0].time, "2026-10-25T17:12:28.281Z", "Native event timestamp preserved");
    eq(initial[0].otherAudioPlaying, true, "External-audio signal included");
    eq(initial[0].category, "AVAudioSessionCategoryAmbient", "Runtime category included");
    eq(initial[0].outputPorts[0], "Speaker", "Output route type included without device names");
    nativeStub.append("native-audio-interruption", { interruptionType: "began", shouldResume: false });
    nativeStub.append("native-audio-route-change", { routeChangeReason: 1 });
    await api.refreshNative();
    const all = api.getEvents();
    ok(all.some(x => x.type === "native-audio-interruption"), "Background interruption imported");
    ok(all.some(x => x.type === "native-audio-route-change"), "Route change imported");
    eq(all.find(x => x.type === "native-audio-interruption").interruptionType, "began",
      "Interruption type preserved");
    const n = all.filter(x => x.type === "native-audio-interruption").length;
    await api.refreshNative();
    eq(api.getEvents().filter(x => x.type === "native-audio-interruption").length, n,
      "Incremental native reads don't duplicate events");
    ok(nativeStub.calls.includes("snapshot:manual"), "Manual refresh takes a native snapshot");
    const exported = JSON.parse(api.exportReport());
    ok(exported.events.some(x => x.type === "native-audio-route-change"), "Existing JSON export includes native log");
    ok(e.localStorage.getItem("biblozooAudioDiagnosticsLog").includes("native-audio-interruption"),
      "Native observations persist alongside JS diagnostics");
    api.clear();
    await Promise.resolve(); await Promise.resolve();
    eq(api.getEvents().filter(x => x.type === "native-audio-interruption").length, 0,
      "Clear removes imported native events");
    ok(nativeStub.calls.includes("clear"), "Clear calls optional native buffer clear");
  }
  console.log(`Patch 58 native session diagnostics: ${assertions} assertions passed.`);
}
main().catch(err => { console.error(err); process.exitCode = 1; });
