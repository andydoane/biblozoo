"use strict";

/*
 * PR196: native-only optional Grown-up Setup, source + behavioral contracts.
 * Run before build and after the production web bundle is assembled.
 * No real Zookeeper profiles, OS permissions, microphones or photo files.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  isProductionKids,
  createPermissionSession
} = require("../verse_games/shared/kids-setup.js");

const ROOT = path.join(__dirname, "..");
function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}
function mock({ production = true, audioTest = false,
  microphone = "undetermined", photos = "undetermined" } = {}) {
  const state = { microphone, photos };
  const count = { micStatus: 0, micPrompt: 0, photosStatus: 0, photosPrompt: 0 };
  const win = {
    document: { hidden: false, visibilityState: "visible" },
    BibloZooNativeOnlyOutput: {
      enabled: true, devToolsAllowed: audioTest
    },
    Capacitor: {
      isNativePlatform: () => production,
      getPlatform: () => production ? "ios" : "web",
      Plugins: {
        BibloZooMicSessionProbe: {
          getPermissionStatus: async () => {
            count.micStatus += 1;
            return { permission: state.microphone };
          },
          requestFirstPermission: async () => {
            count.micPrompt += 1;
            state.microphone = "granted";
            return { granted: true };
          }
        },
        BibloZooGhostWriterExport: {
          getPhotosPermissionStatus: async () => {
            count.photosStatus += 1;
            return { permission: state.photos };
          },
          requestPhotosPermission: async () => {
            count.photosPrompt += 1;
            state.photos = "granted";
            return { granted: true };
          }
        }
      }
    }
  };
  return { win, count, state };
}
async function main() {
  {
    const { win, count } = mock();
    assert.equal(isProductionKids(win), true);
    const setup = createPermissionSession(win);
    assert.equal(setup.begin(), true);
    assert.equal(setup.isAuthorized(), false);
    assert.deepEqual(await setup.request("microphone", () => true),
      { granted: false, reason: "grown-up-required" });
    assert.equal(count.micPrompt, 0, "child may not start a first OS prompt");
    assert.equal(setup.authorize(), true);
    assert.deepEqual(await setup.request("microphone", () => true),
      { granted: true, reason: "granted" });
    assert.equal(count.micPrompt, 1);
    assert.deepEqual(await setup.request("microphone", () => true),
      { granted: true, reason: "already-granted" });
    assert.equal(count.micPrompt, 1, "a granted permission is not requested twice");
    assert.deepEqual(await setup.request("photos", () => true),
      { granted: true, reason: "granted" });
    assert.equal(count.photosPrompt, 1, "same active parent setup covers Photos");
    setup.revoke();
    assert.equal(setup.isAuthorized(), false);
    setup.end();
    assert.equal(setup.authorize(), false, "no reusable parent approval");
  }
  {
    const { win, count } = mock({ microphone: "denied", photos: "denied" });
    const setup = createPermissionSession(win);
    setup.begin();
    setup.authorize();
    assert.deepEqual(await setup.request("microphone", () => true),
      { granted: false, reason: "denied" });
    assert.deepEqual(await setup.request("photos", () => true),
      { granted: false, reason: "denied" });
    assert.equal(count.micPrompt, 0);
    assert.equal(count.photosPrompt, 0);
    setup.end();
  }
  {
    const { win, count } = mock({ microphone: "granted", photos: "granted" });
    const setup = createPermissionSession(win);
    setup.begin();
    assert.deepEqual(await setup.request("microphone", () => true),
      { granted: true, reason: "already-granted" });
    assert.deepEqual(await setup.request("photos", () => true),
      { granted: true, reason: "already-granted" });
    assert.equal(count.micPrompt + count.photosPrompt, 0);
    setup.end();
  }
  {
    const { win, count, state } = mock();
    const setup = createPermissionSession(win);
    setup.begin();
    setup.authorize();
    state.microphone = "restricted";
    assert.deepEqual(await setup.request("microphone", () => true),
      { granted: false, reason: "unavailable" });
    assert.equal(count.micPrompt, 0, "unexpected state fails closed");
    setup.end();
  }
  {
    const { win, count } = mock();
    const setup = createPermissionSession(win);
    setup.begin();
    setup.authorize();
    let releaseStatus;
    win.Capacitor.Plugins.BibloZooMicSessionProbe.getPermissionStatus =
      () => new Promise(resolve => { releaseStatus = resolve; });
    const first = setup.request("microphone", () => true);
    const duplicate = await setup.request("photos", () => true);
    assert.equal(duplicate.granted, false, "overlapping requests denied");
    await new Promise(resolve => setImmediate(resolve));
    win.document.hidden = true;
    win.document.visibilityState = "hidden";
    setup.revoke();
    releaseStatus({ permission: "undetermined" });
    const interrupted = await first;
    assert.equal(interrupted.granted, false);
    assert.equal(interrupted.reason, "interrupted");
    assert.equal(count.micPrompt + count.photosPrompt, 0,
      "backgrounding during status read cannot initiate OS sheets");
    setup.end();
  }
  {
    const { win, count } = mock();
    const setup = createPermissionSession(win);
    setup.begin(); setup.authorize();
    let current = true;
    win.Capacitor.Plugins.BibloZooMicSessionProbe.getPermissionStatus =
      async () => { current = false; return { permission: "undetermined" }; };
    const result = await setup.request("microphone", () => current);
    assert.equal(result.reason, "interrupted");
    assert.equal(count.micPrompt, 0, "stale setup never requests microphone");
    setup.end();
  }
  {
    const { win } = mock({ production: false });
    assert.equal(isProductionKids(win), false);
    assert.equal(createPermissionSession(win).begin(), false);
  }
  {
    const { win } = mock({ audioTest: true });
    assert.equal(isProductionKids(win), false);
    assert.equal(createPermissionSession(win).begin(), false);
  }

  const index = read("index.html");
  const app = read("app.js");
  const setup = read("verse_games/shared/kids-setup.js");
  const css = read("verse_games/shared/kids-setup.css");
  const originalPermissions = read("verse_games/shared/kids-first-permission.js");
  assert.match(index, /href="verse_games\/shared\/kids-setup\.css"/);
  assert.match(index, /src="verse_games\/shared\/kids-setup\.js"/);
  assert.ok(index.indexOf("kids-first-permission.js") <
    index.indexOf("kids-setup.js"), "first-request bridge loaded before setup");
  assert.match(app, /showFirstLaunch\?\.\(\(\) => openFirstProfileEditor\(\)\)/);
  assert.match(app, /data-settings-action="grown-up-setup"/);
  assert.match(app, /showFromSettings\?\.\(liveSettingsButton\)/);
  assert.match(setup, /biblozooKidsSetupOffered:v1/);
  assert.match(setup, /Let.s Get BibloZoo Ready!/);
  assert.match(setup, /Let.s Set Up!/);
  assert.match(setup, /title_biblozoo_animals\.png/);
  assert.match(setup, /title_biblozoo\.png/);
  assert.match(css, /bz-kids-setup-brand\.is-compact/);
  assert.match(setup, /requestFirstPermission/);
  assert.match(setup, /requestPhotosPermission/);
  assert.match(setup, /getPhotosPermissionStatus/);
  assert.match(setup, /getPermissionStatus/);
  assert.match(setup, /requestApproval/);
  assert.match(originalPermissions, /state\?\.permission !== "undetermined"/);

  const output = path.join(ROOT, "dist");
  if (fs.existsSync(path.join(output, "index.html"))) {
    for (const file of [
      "verse_games/shared/kids-setup.js",
      "verse_games/shared/kids-setup.css",
      "verse_games/shared/kids-first-permission.js"
    ]) {
      assert.ok(fs.existsSync(path.join(output, file)),
        "packaged app missing " + file);
    }
    assert.match(fs.readFileSync(path.join(output, "index.html"), "utf8"),
      /src="verse_games\/shared\/kids-setup\.js"/);
  }
  console.log("Kids first-launch Grown-up Setup PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
