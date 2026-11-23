/* Kids PR 2 — synthetic native share approval, export boundaries and owner math. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { create, nativeIdentity } = require("../verse_games/shared/ghost-writer-share-approval.js");
const { makeQuestion } = require("../verse_games/shared/parental-gate.js");
const ROOT = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(ROOT, name), "utf8");

function makeEnvironment(mode = "production") {
  const document = { hidden: false, visibilityState: "visible" };
  const window = {
    document,
    location: { protocol: mode === "web" ? "https:" : "capacitor:" },
    Capacitor: {
      isNativePlatform: () => mode !== "web",
      getPlatform: () => mode === "android" ? "android" : mode === "web" ? "web" : "ios"
    },
    BibloZooNativeOnlyOutput: mode === "unknown" ? undefined : {
      enabled: true, devToolsAllowed: mode === "audio-test"
    }
  };
  return window;
}
async function approvalTests() {
  assert.equal(nativeIdentity(makeEnvironment()), "production");
  assert.equal(nativeIdentity(makeEnvironment("audio-test")), "audio-test");
  for (const mode of ["web", "android", "unknown"]) {
    assert.equal(nativeIdentity(makeEnvironment(mode)), "denied", mode);
  }
  for (const mode of ["web", "android", "unknown"]) {
    const win = makeEnvironment(mode);
    const runner = create(win);
    let work = 0, unavailable = 0;
    assert.equal(await runner.run({
      kind: "picture", isCurrent: () => true, setBusy() {},
      onApproved: () => { work++; },
      onUnavailable: () => { unavailable++; }
    }), false);
    assert.equal(work, 0, mode + " never bypasses native gate");
    assert.equal(unavailable, 1);
  }

  const dev = makeEnvironment("audio-test");
  let devExports = 0;
  assert.equal(await create(dev).run({
    kind: "video", isCurrent: () => true, setBusy() {},
    onApproved: () => { devExports++; return "kept-original-audio-test-flow"; }
  }), "kept-original-audio-test-flow");
  assert.equal(devExports, 1);
  assert.equal(await create(dev).run({
    kind: "bad", isCurrent: () => true, setBusy() {}, onApproved() { devExports++; }
  }), false);
  assert.equal(devExports, 1);

  const win = makeEnvironment();
  const runner = create(win);
  let work = 0, unavailable = 0;
  const busy = [];
  const options = {
    kind: "picture",
    isCurrent: () => true,
    setBusy: value => busy.push(value),
    onApproved: () => { work++; },
    onUnavailable: () => { unavailable++; }
  };
  assert.equal(await runner.run(options), false, "missing gate fails closed");
  assert.equal(unavailable, 1);
  assert.equal(work, 0);

  win.BibloZooParentalGate = {
    isAvailable: () => false,
    requestApproval: async () => { throw Error("unreachable"); }
  };
  assert.equal(await runner.run(options), false);
  assert.equal(work, 0);

  // Cancel closes the check without triggering media generation.
  win.BibloZooParentalGate = {
    isAvailable: () => true,
    requestApproval: async () => false
  };
  assert.equal(await runner.run(options), false);
  assert.equal(work, 0);
  assert.equal(runner.isPending(), false);

  // A single approved callback permits precisely one export, even if a
  // buggy host calls the callback more than once.
  win.BibloZooParentalGate.requestApproval = async ({ onApproved, actionLabel }) => {
    assert.match(actionLabel, /Sharing this picture needs a grown-up/);
    await onApproved();
    await onApproved();
    return true;
  };
  assert.equal(await runner.run(options), true);
  assert.equal(work, 1);
  assert.equal(runner.isPending(), false);
  assert.deepEqual(busy.slice(-2), [false, false]);

  // Rapid double-tap while a check is pending must not queue a second share.
  let allow;
  win.BibloZooParentalGate.requestApproval = ({ onApproved }) => new Promise(resolve => {
    allow = async () => { await onApproved(); resolve(true); };
  });
  const first = runner.run({ ...options, kind: "video" });
  assert.equal(runner.isPending(), true);
  assert.equal(await runner.run({ ...options, kind: "video" }), false);
  await allow();
  assert.equal(await first, true);
  assert.equal(work, 2, "second simultaneous tap denied");

  // Navigating away from Remix, backgrounding, or a stale/removed button
  // must deny even if the modal's callback is attempted.
  for (const scenario of ["stale", "hidden", "identity"]) {
    let current = true;
    win.document.hidden = false;
    win.BibloZooNativeOnlyOutput = { enabled: true, devToolsAllowed: false };
    win.BibloZooParentalGate.requestApproval = async ({ onApproved }) => {
      if (scenario === "stale") current = false;
      if (scenario === "hidden") win.document.hidden = true;
      if (scenario === "identity") win.BibloZooNativeOnlyOutput = undefined;
      await onApproved();
      return true;
    };
    const before = work;
    assert.equal(await runner.run({
      ...options, isCurrent: () => current
    }), false, "stale approval " + scenario);
    assert.equal(work, before);
    assert.equal(runner.isPending(), false);
  }
  // When the gate itself throws, no fallback export should occur.
  win.document.hidden = false;
  win.BibloZooNativeOnlyOutput = { enabled: true, devToolsAllowed: false };
  win.BibloZooParentalGate.requestApproval = async () => { throw Error("closed"); };
  assert.equal(await runner.run(options), false);
  assert.equal(work, 2);

  const seen = new Set();
  for (let i = 0; i < 18; i++) {
    let call = 0;
    const q = makeQuestion(max => {
      assert.ok([18, 8, 9].includes(max));
      return [i, 7, 8][call++];
    });
    assert.ok(q.first >= 11 && q.first <= 29);
    assert.notEqual(q.first % 10, 0);
    assert.equal(q.multiplier, 9);
    assert.equal(q.addition, 9);
    assert.equal(q.answer, q.first * 9 + 9);
    seen.add(q.first);
  }
  assert.equal(seen.size, 18);
  assert.equal(seen.has(20), false);
}

async function exporterTests(ghost) {
  const imgStart = ghost.indexOf("  async function saveGhostWriterImage(");
  const imgEnd = ghost.indexOf("  function estimateReplayVideoFrames(", imgStart);
  assert.ok(imgStart > 0 && imgEnd > imgStart);
  const imgSource = ghost.slice(imgStart, imgEnd);
  const imgStats = { assets: 0, canvas: 0, share: 0, save: 0, png: 0 };
  let current = true;
  const ctx = {
    state: { remix: {} },
    IS_NATIVE_CAPACITOR: true,
    document: {
      createElement(type) {
        assert.equal(type, "canvas");
        imgStats.canvas++;
        return {
          width: 0, height: 0,
          getContext() { return { setTransform() {} }; },
          toDataURL() { imgStats.png++; return "data:image/png;base64,fictional"; }
        };
      }
    },
    EXPORT_SIZES: { square: { width: 4, height: 4 } },
    sanitizeRemixOptions: o => ({ ...o, exportSize: "square" }),
    waitForExportAssets: async () => { imgStats.assets++; },
    drawCompleteText() {},
    makeExportFilename: () => "fictional.png",
    makeFriendlyExportFilename: () => "fictional.png",
    nativeGhostExport: {
      async shareImage({ png }) { assert.match(png, /fictional/); imgStats.share++; return { presented: true }; },
      async saveImage() { imgStats.save++; return { saved: true }; }
    },
    Promise, Error
  };
  const saveImage = vm.runInNewContext(imgSource + "\nsaveGhostWriterImage;", ctx);
  const noCallback = await saveImage({}, "share");
  assert.equal(noCallback.cancelled, true);
  assert.equal(imgStats.assets, 0, "no assets loaded before native approval");
  assert.equal(imgStats.canvas, 0, "no outgoing canvas generated before native approval");
  const notCurrent = await saveImage({}, "share", null, () => false);
  assert.equal(notCurrent.cancelled, true);
  assert.equal(imgStats.canvas, 0);
  ctx.waitForExportAssets = async () => { imgStats.assets++; current = false; };
  const staleAfterAsync = await saveImage({}, "share", null, () => current);
  assert.equal(staleAfterAsync.cancelled, true);
  assert.equal(imgStats.canvas, 0, "remix exit during asset load prevents rendering");
  assert.equal(imgStats.share, 0);

  current = true;
  ctx.waitForExportAssets = async () => { imgStats.assets++; };
  const presented = await saveImage({}, "share", null, () => current);
  assert.equal(presented.presented, true);
  assert.equal(imgStats.share, 1);
  assert.equal(imgStats.png, 1);
  const saved = await saveImage({}, "photos");
  assert.equal(saved.saved, true, "local Save Photo does not need share callback");
  assert.equal(imgStats.save, 1);

  const vidStart = ghost.indexOf("  async function saveGhostWriterNativeVideo(");
  const vidEnd = ghost.indexOf("  function isReplayVideoSupported(", vidStart);
  assert.ok(vidStart > 0 && vidEnd > vidStart);
  const vidSource = ghost.slice(vidStart, vidEnd);
  const vStats = { begin: 0, append: 0, finish: 0, cancel: 0 };
  let videoCurrent = true, flipDuringAppend = false;
  const nativeGhostExport = {
    async beginVideo() { vStats.begin++; return { token: "synthetic", width: 4, height: 4, fps: 30 }; },
    async appendVideoFrame() {
      vStats.append++;
      if (flipDuringAppend) videoCurrent = false;
    },
    async finishVideo({ destination }) {
      assert.equal(destination, "share");
      vStats.finish++;
      return { presented: true };
    },
    async cancelVideo() { vStats.cancel++; }
  };
  const videoCtx = {
    nativeGhostExport,
    sanitizeRemixOptions: o => o,
    NATIVE_SOCIAL_VIDEO: { width: 4, height: 4, fps: 30, maxFrames: 6, endHoldFrames: 2 },
    state: { screen: "remix" },
    document: {
      hidden: false,
      createElement(type) {
        assert.equal(type, "canvas");
        return {
          width: 0, height: 0,
          getContext() { return {}; },
          toDataURL: () => "data:image/jpeg;base64,synthetic"
        };
      }
    },
    waitForExportAssets: async () => {},
    makeLayout: () => ({}),
    buildPlaybackPlacements: () => [],
    SPEEDS: { normal: {} },
    estimateReplayVideoFrames: () => 2,
    performance: { now: () => 0 },
    clearPlaybackCanvas() {},
    makeFriendlyExportFilename: () => "fictional.mp4",
    drawReplayVideoFrame: () => true,
    setTimeout,
    Promise, Error
  };
  const saveVideo = vm.runInNewContext(vidSource + "\nsaveGhostWriterNativeVideo;", videoCtx);
  assert.equal((await saveVideo({}, { cancelled: false }, () => {}, "share")).cancelled, true);
  assert.equal(vStats.begin, 0, "no native MP4 creation without approval callback");
  assert.equal((await saveVideo({}, { cancelled: false }, () => {}, "share", () => false)).cancelled, true);
  assert.equal(vStats.begin, 0);

  videoCurrent = true;
  const ok = await saveVideo({}, { cancelled: false }, () => {}, "share", () => videoCurrent);
  assert.equal(ok.presented, true);
  assert.equal(vStats.finish, 1, "exactly one approved video share finish");

  videoCurrent = true;
  flipDuringAppend = true;
  const cancelled = await saveVideo({}, { cancelled: false }, () => {}, "share", () => videoCurrent);
  assert.equal(cancelled.cancelled, true);
  assert.equal(vStats.finish, 1, "stale video must not open share sheet");
  assert.equal(vStats.cancel, 1, "stale temp video is canceled");
}

async function main() {
  await approvalTests();
  const ghost = read("verse_playground/ghost_writer/game.js");
  const entry = read("verse_playground/ghost_writer/index.html");
  assert.match(entry, /ghost-writer-share-approval\.js/);
  assert.ok(entry.indexOf("parental-gate.js") < entry.indexOf("ghost-writer-share-approval.js"));
  assert.ok(entry.indexOf("ghost-writer-share-approval.js") < entry.indexOf("game.js"));
  assert.match(ghost, /shareImageBtn\?\.addEventListener\("click", \(\) => void requestApprovedShare\(/);
  assert.match(ghost, /shareVideoBtn\?\.addEventListener\("click", \(\) => void requestApprovedShare\(/);
  assert.doesNotMatch(ghost, /shareImageBtn\?\.addEventListener\("click", \(\) => void onPictureAction\("share"/);
  assert.doesNotMatch(ghost, /shareVideoBtn\?\.addEventListener\("click", \(\) => void onVideoAction\("share"/);
  assert.match(ghost, /saveImageBtn\?\.addEventListener\("click", \(\) => void onPictureAction\("photos"/);
  assert.match(ghost, /saveVideoBtn\?\.addEventListener\("click", \(\) => void onVideoAction\("photos"/);
  assert.match(ghost, /shareAbandoned\(\)/);
  await exporterTests(ghost);
  assert.doesNotMatch(read("scripts/build.js"), /"tests"/);
  const dist = path.join(ROOT, "dist");
  if (fs.existsSync(dist)) {
    assert.ok(fs.existsSync(path.join(dist, "verse_games/shared/ghost-writer-share-approval.js")));
    assert.match(read("dist/verse_playground/ghost_writer/index.html"), /ghost-writer-share-approval\.js/);
    assert.ok(!fs.existsSync(path.join(dist, "tests/parental-gate-preview.html")));
  }
  console.log("Kids PR2 PASS: 18-number math range, native share gate, cancel/stale/duplicate protection, no pre-approval image/MP4 generation, Save Photos unchanged.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
