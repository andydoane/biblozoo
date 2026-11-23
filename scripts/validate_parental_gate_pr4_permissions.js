/* Kids PR4: no silent first-time OS prompt, native state checks and one-shot gate. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { create, identity } = require("../verse_games/shared/kids-first-permission.js");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

function world(mode = "kids") {
  const doc = { hidden: false, visibilityState: "visible" };
  const win = {
    document: doc,
    Capacitor: {
      isNativePlatform: () => mode !== "web",
      getPlatform: () => mode === "android" ? "android" : mode === "web" ? "web" : "ios"
    },
    BibloZooNativeOnlyOutput: mode === "unknown" ? null : {
      enabled: true, devToolsAllowed: mode === "audio-test"
    }
  };
  return win;
}
async function unit() {
  assert.equal(identity(world()), "kids");
  assert.equal(identity(world("audio-test")), "audio-test");
  assert.equal(identity(world("web")), "other");
  assert.equal(identity(world("android")), "other");
  assert.equal(identity(world("unknown")), "unknown");

  let calls = 0, prompt = 0;
  const win = world();
  const permit = create(win);
  const options = (status = "undetermined", kind = "microphone") => ({
    kind,
    getStatus: async () => { calls++; return { permission: status }; },
    requestFirst: async () => { prompt++; return { granted: true }; },
    isCurrent: () => true
  });
  assert.deepEqual(await permit.ensure(options("granted")),
    { granted: true, reason: "already-granted" });
  assert.equal(prompt, 0, "previously granted permission never needs another prompt");
  assert.deepEqual(await permit.ensure(options("denied")),
    { granted: false, reason: "denied" });
  assert.equal(prompt, 0);
  assert.deepEqual(await permit.ensure(options("unexpected")),
    { granted: false, reason: "unknown-state" });
  assert.equal(prompt, 0, "unrecognized OS state fails closed");
  assert.deepEqual(await permit.ensure(options()),
    { granted: false, reason: "missing-grown-up-check" });
  assert.equal(prompt, 0);
  win.BibloZooParentalGate = {
    isAvailable: () => true,
    requestApproval: async () => false
  };
  assert.deepEqual(await permit.ensure(options()),
    { granted: false, reason: "cancelled" });
  assert.equal(prompt, 0, "Not Now never calls native permission request");

  let challenges = 0;
  win.BibloZooParentalGate.requestApproval = async ({ onApproved, actionLabel }) => {
    challenges++;
    assert.match(actionLabel, /first microphone request/);
    await onApproved();
    await onApproved(); // buggy repeat cannot cause another OS prompt
    return true;
  };
  assert.deepEqual(await permit.ensure(options()),
    { granted: true, reason: "approved" });
  assert.equal(prompt, 1, "one challenge opens at most one native prompt");

  // Same helper also guards Ghost Writer add-only PhotoKit permission.
  win.BibloZooParentalGate.requestApproval = async ({ onApproved, actionLabel }) => {
    assert.match(actionLabel, /first Add Photos request/);
    await onApproved(); return true;
  };
  assert.deepEqual(await permit.ensure(options("undetermined", "photos")),
    { granted: true, reason: "approved" });
  assert.equal(prompt, 2);
  assert.equal(challenges, 1);

  // Triple taps can never queue multiple native permission requests.
  let advance;
  win.BibloZooParentalGate.requestApproval = ({ onApproved }) => new Promise(resolve => {
    advance = async () => { await onApproved(); resolve(true); };
  });
  const a = permit.ensure(options("undetermined", "photos"));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(permit.isPending(), true);
  assert.deepEqual(await permit.ensure(options("undetermined", "photos")),
    { granted: false, reason: "unavailable" });
  await advance();
  assert.equal((await a).granted, true);
  assert.equal(prompt, 3);

  // Status async gap, screen removal, hidden tab and identity loss fail shut.
  const cases = [
    ["hidden", () => { win.document.hidden = true; }],
    ["identity", () => { win.BibloZooNativeOnlyOutput = null; }],
    ["stale", () => { current = false; }]
  ];
  let current = true;
  for (const [name, change] of cases) {
    win.document.hidden = false;
    win.BibloZooNativeOnlyOutput = { enabled: true, devToolsAllowed: false };
    current = true;
    const before = prompt;
    const result = await permit.ensure({
      ...options(),
      isCurrent: () => current,
      getStatus: async () => { change(); return { permission: "undetermined" }; }
    });
    assert.equal(result.granted, false, name);
    assert.equal(prompt, before, name + " never shows native prompt");
  }
  win.document.hidden = false;
  win.BibloZooNativeOnlyOutput = { enabled: true, devToolsAllowed: false };
  let live = true;
  win.BibloZooParentalGate.requestApproval = async ({ onApproved }) => {
    live = false;
    await onApproved();
    return true;
  };
  assert.equal((await permit.ensure({ ...options(), isCurrent: () => live })).granted, false);
  assert.equal(prompt, 3, "stale dialog authorization cannot request permission");

  // An OS popup can background the WebView AFTER requestFirst begins;
  // that transition does not retroactively delete the OS result.
  live = true;
  win.BibloZooParentalGate.requestApproval = async ({ onApproved }) => {
    await onApproved(); return true;
  };
  const first = options();
  first.requestFirst = async () => {
    win.document.hidden = true;
    return { granted: true };
  };
  assert.equal((await permit.ensure(first)).granted, true);
  win.document.hidden = false;

  for (const mode of ["web", "android", "unknown"]) {
    const other = world(mode);
    assert.equal((await create(other).ensure(options())).granted, false);
  }
  assert.deepEqual(await create(world("audio-test")).ensure(options()),
    { granted: true, reason: "audio-test" },
    "Audio Test retains original native microphone flow");
}

function integration() {
  const swift = read("ios/App/App/SceneDelegate.swift");
  const mic = read("verse_games/shared/native-flashcards-capture-n7c.js");
  const ghost = read("verse_playground/ghost_writer/game.js");
  const main = read("index.html");
  const ghostEntry = read("verse_playground/ghost_writer/index.html");
  const gate = read("verse_games/shared/parental-gate.js");
  const shared = read("verse_games/shared/kids-first-permission.js");

  for (const html of [main, ghostEntry]) {
    assert.match(html, /kids-first-permission\.js/);
    assert.ok(html.indexOf("parental-gate.js") < html.indexOf("kids-first-permission.js"));
  }
  assert.match(gate, /session\.attempts >= 3/);
  assert.match(shared, /kind === "microphone"/);
  assert.match(shared, /kind === "photos"/);
  assert.doesNotMatch(shared, /localStorage|sessionStorage|indexedDB/);

  assert.match(swift, /CAPPluginMethod\(name: "getPermissionStatus"/);
  assert.match(swift, /CAPPluginMethod\(name: "requestFirstPermission"/);
  assert.match(swift, /func getPermissionStatus\(_ call: CAPPluginCall\)/);
  assert.match(swift, /func requestFirstPermission\(_ call: CAPPluginCall\)/);
  assert.match(swift, /state == "undetermined" && !firstTimeApproved/);
  assert.match(swift, /"grown-up-check-required"/);
  assert.match(swift, /recordPermission/);
  assert.match(mic, /firstPermission\.ensure\(\{\s*kind: "microphone"/);
  assert.match(mic, /api\.getPermissionStatus\(\)/);
  assert.match(mic, /api\.requestFirstPermission\(\)/);
  assert.match(mic, /if \(root\.BibloZooNativeOnlyOutput\?\.devToolsAllowed === false\)/);
  assert.match(mic, /permission = await api\.requestPermission\(\)/,
    "Audio Test native request remains available");

  assert.match(swift, /CAPPluginMethod\(name: "getPhotosPermissionStatus"/);
  assert.match(swift, /CAPPluginMethod\(name: "requestPhotosPermission"/);
  assert.match(swift, /PHPhotoLibrary\.authorizationStatus\(for: \.addOnly\)/);
  assert.match(swift, /guard BibloZooIOSIdentity\.experimentalToolsEnabled \|\|\s*self\.photosPermissionLabel\(\) == "granted" else/,
    "production bridge refuses new Photos prompt while Audio Test stays unchanged");
  assert.match(swift, /PHPhotoLibrary\.requestAuthorization\(for: \.addOnly\)/);
  assert.match(ghost, /firstPermission\?\.ensure\?\.\(\{\s*kind: "photos"/);
  assert.match(ghost, /nativeGhostExport\.getPhotosPermissionStatus\(\)/);
  assert.match(ghost, /nativeGhostExport\.requestPhotosPermission\(\)/);
  // Both Save paths must approve before any PNG canvas / MP4 encoder.
  const picture = ghost.slice(ghost.indexOf("async function onPictureAction("),
    ghost.indexOf('saveImageBtn?.addEventListener("click"'));
  const video = ghost.slice(ghost.indexOf("async function onVideoAction("),
    ghost.indexOf('saveVideoBtn?.addEventListener("click"'));
  for (const section of [picture, video]) {
    const preflight = section.indexOf("approveFirstPhotosSave(button)");
    assert.ok(preflight > 0);
    assert.ok(preflight < section.indexOf("const modal ="));
  }
  assert.match(ghost, /nativePhotoPicker/);
  assert.match(swift, /PHPickerViewController/);
  assert.match(swift, /UIDocumentPicker/);
  assert.doesNotMatch(swift, /UIImagePickerController\s*\(/,
    "Ghost Writer never instantiates a camera picker");

  // A direct unapproved native PhotoKit save must never create the first
  // permission prompt. It is rejected by native status at saveToPhotos.
  const nativeSave = swift.slice(swift.indexOf("private func saveToPhotos("),
    swift.indexOf("private func presentShare(",swift.indexOf("private func saveToPhotos(")));
  assert.ok(nativeSave.indexOf('self.photosPermissionLabel() == "granted"') <
    nativeSave.indexOf("PHPhotoLibrary.requestAuthorization"));
  const micPermission = swift.slice(swift.indexOf("private func requestPermissionNow("),
    swift.indexOf("// Native session/probe starts",swift.indexOf("private func requestPermissionNow(")));
  assert.ok(micPermission.indexOf('state == "undetermined" && !firstTimeApproved') <
    micPermission.indexOf("requestRecordPermission"));

  const dist = path.join(root, "dist");
  if (fs.existsSync(dist)) {
    for (const relative of ["verse_games/shared/kids-first-permission.js",
      "verse_playground/ghost_writer/index.html", "index.html"]) {
      assert.ok(fs.existsSync(path.join(dist, relative)), relative + " packaged");
    }
    assert.match(read("dist/index.html"), /kids-first-permission\.js/);
    assert.match(read("dist/verse_playground/ghost_writer/index.html"),
      /kids-first-permission\.js/);
    assert.equal(fs.existsSync(path.join(dist, "tests/parental-gate-preview.html")), false);
  }
}

(async () => {
  await unit();
  integration();
  console.log("Kids PR4 PASS: first mic/PhotoKit OS prompts gated, approved once, no repeated checks, native direct-save denial, stale/background/duplicate isolation, Audio Test and picker preserved.");
})().catch(error => { console.error(error); process.exitCode = 1; });
