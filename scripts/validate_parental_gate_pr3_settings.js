/* Kids PR3 — synthetic parent Settings visit, outbound links and backup fallbacks. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { create, identity } = require("../verse_games/shared/parental-gate-settings.js");
const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");

function environment(platform = "production") {
  const doc = {
    hidden: false, visibilityState: "visible", listeners: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    dispatch(type) { (this.listeners[type] || []).forEach(fn => fn()); }
  };
  const win = {
    document: doc,
    location: { protocol: platform === "web" ? "https:" : "capacitor:" },
    Capacitor: {
      isNativePlatform: () => platform !== "web",
      getPlatform: () => platform === "android" ? "android"
        : platform === "web" ? "web" : "ios"
    },
    BibloZooNativeOnlyOutput: platform === "unknown" ? null : {
      enabled: true, devToolsAllowed: platform === "audio-test"
    },
    listeners: {}, console: { warn() {} },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    dispatch(type) { (this.listeners[type] || []).forEach(fn => fn()); }
  };
  return win;
}

async function controllerTests() {
  assert.equal(identity(environment()), "production-ios");
  assert.equal(identity(environment("audio-test")), "audio-test");
  assert.equal(identity(environment("web")), "web-or-other");
  assert.equal(identity(environment("android")), "web-or-other");
  assert.equal(identity(environment("unknown")), "unverified-native");

  for (const platform of ["web", "android", "audio-test"]) {
    const win = environment(platform);
    const gate = create(win, { getScreen: () => "settings", getProfileId: () => "fake" });
    let actions = 0;
    assert.equal(gate.isAuthorized(), true);
    await gate.runManagement({ isCurrent: () => true, onApproved: () => { actions++; } });
    assert.equal(actions, 1, platform + " keeps original behavior");
    assert.equal(gate.isAuthorized(), true);
  }

  const win = environment("unknown");
  const blocked = create(win, { getScreen: () => "settings", getProfileId: () => "fake" });
  let mutated = 0;
  assert.equal(await blocked.runManagement({
    isCurrent: () => true, onApproved: () => { mutated++; }
  }), false);
  assert.equal(await blocked.runOutgoing({
    isCurrent: () => true, onApproved: () => { mutated++; }
  }), false);
  assert.equal(mutated, 0, "incomplete native identity fails closed");

  const prod = environment();
  let screen = "settings", profile = "fictional-1";
  let checkCount = 0, completed = 0, cancelCount = 0;
  let grant = true, savedApproval = null;
  prod.BibloZooParentalGate = {
    isAvailable: () => true,
    cancelActive: () => { cancelCount++; },
    requestApproval: async ({ onApproved }) => {
      checkCount++;
      savedApproval = onApproved;
      if (!grant) return false;
      await onApproved();
      return true;
    }
  };
  const guard = create(prod, { getScreen: () => screen, getProfileId: () => profile });
  assert.equal(guard.isAuthorized(), false);
  grant = false;
  assert.equal(await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  }), false);
  assert.equal(completed, 0);
  assert.equal(guard.isAuthorized(), false);

  grant = true;
  await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  });
  assert.equal(checkCount, 2);
  assert.equal(completed, 1);
  assert.equal(guard.isAuthorized(), true);
  await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  });
  assert.equal(completed, 2, "second management action in same visit runs");
  assert.equal(checkCount, 2, "no second challenge within continuous Settings visit");

  guard.onScreenChange("profile_manage");
  screen = "profile_manage";
  assert.equal(guard.isAuthorized(), true, "profile manager is same parent visit");
  guard.onScreenChange("privacy");
  screen = "privacy";
  assert.equal(guard.isAuthorized(), true, "privacy page is readable and keeps visit");
  guard.onScreenChange("title");
  screen = "title";
  assert.equal(guard.isAuthorized(), false, "leaving Settings revokes approval");
  assert.ok(cancelCount > 0);
  guard.onScreenChange("settings");
  screen = "settings";
  assert.equal(guard.isAuthorized(), false);
  await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  });
  assert.equal(checkCount, 3, "reentering Settings requires fresh check");
  assert.equal(guard.isAuthorized(), true);
  profile = "fictional-2";
  assert.equal(guard.isAuthorized(), false, "profile switch revokes");

  await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  });
  prod.document.hidden = true;
  prod.document.dispatch("visibilitychange");
  assert.equal(guard.isAuthorized(), false, "backgrounding expires visit");
  prod.document.hidden = false;
  await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  });
  prod.dispatch("pagehide");
  assert.equal(guard.isAuthorized(), false);
  await guard.runManagement({
    isCurrent: () => true, onApproved: () => { completed++; }
  });
  prod.dispatch("popstate");
  assert.equal(guard.isAuthorized(), false);

  let emailOpens = 0;
  await guard.runOutgoing({ isCurrent: () => true,
    onApproved: () => { emailOpens++; } });
  assert.equal(emailOpens, 1);
  const emailChecks = checkCount;
  await guard.runOutgoing({ isCurrent: () => true,
    onApproved: () => { emailOpens++; } });
  assert.equal(emailOpens, 2);
  assert.equal(checkCount, emailChecks + 1,
    "outbound email/web link is action-bound, not persistently authorized");

  grant = false;
  await guard.runOutgoing({ isCurrent: () => true,
    onApproved: () => { emailOpens++; } });
  assert.equal(emailOpens, 2, "cancelled outgoing link does nothing");

  grant = true;
  const beforeStale = completed;
  prod.BibloZooParentalGate.requestApproval = async ({ onApproved }) => {
    screen = "settings";
    profile = "fictional-2";
    // The same route can be revisited but the pending action was invalidated.
    guard.onScreenChange("title");
    guard.onScreenChange("settings");
    await onApproved();
    return true;
  };
  await guard.runManagement({ isCurrent: () => true,
    onApproved: () => { completed++; } });
  assert.equal(completed, beforeStale, "stale action cannot run after exit/reentry");
  assert.equal(guard.isAuthorized(), false);
  // No approval secrets or persistent storage controls are used.
  const module = read("verse_games/shared/parental-gate-settings.js");
  assert.doesNotMatch(module, /localStorage|sessionStorage|parentApprovedForever/);
  assert.ok(savedApproval, "mocked a real gate callback");
}

async function backupFallbackTests() {
  const app = read("app.js");
  const begin = app.indexOf("async function shareOrDownloadJsonSave(");
  const end = app.indexOf("async function exportSaveData()", begin);
  assert.ok(begin > 0 && end > begin);
  const source = app.slice(begin, end);
  let allowed = false, serialized = 0, blobCount = 0;
  let shareCount = 0, downloadCount = 0, revokeCount = 0;
  let shouldShare = false, shareError = false;
  const mock = {
    parentManagementAllowed: () => allowed,
    JSON: {
      stringify() { serialized++; return '{"fake":1}'; }
    },
    Blob: class {
      constructor() { blobCount++; }
    },
    File: class {
      constructor() {}
    },
    Date, String, console: { warn() {} }, Promise,
    navigator: {
      canShare: () => shouldShare,
      async share() {
        shareCount++;
        if (shareError) {
          allowed = false;
          throw new Error("native share failure after background");
        }
      }
    },
    URL: {
      createObjectURL: () => "blob:fictional",
      revokeObjectURL() { revokeCount++; }
    },
    document: {
      body: { appendChild() {} },
      createElement() {
        return { style: {}, click() { downloadCount++; }, remove() {} };
      }
    },
    setTimeout: fn => fn()
  };
  const shareBackup = vm.runInNewContext(source + "\nshareOrDownloadJsonSave;", mock);
  const denied = await shareBackup({ fake: 1 }, "fictional");
  assert.equal(denied.method, "cancelled");
  assert.equal(serialized, 0, "deny before backup JSON construction");
  assert.equal(blobCount, 0);
  assert.equal(shareCount, 0);
  assert.equal(downloadCount, 0);

  allowed = true;
  shouldShare = true;
  shareError = false;
  const shared = await shareBackup({ fake: 1 }, "fictional");
  assert.equal(shared.method, "share");
  assert.equal(shareCount, 1);
  assert.equal(downloadCount, 0);

  allowed = true;
  shareError = true;
  const failedNative = await shareBackup({ fake: 1 }, "fictional");
  assert.equal(failedNative.method, "cancelled");
  assert.equal(downloadCount, 0, "no fallback download after gate invalidation");

  allowed = true;
  shouldShare = false;
  const fallback = await shareBackup({ fake: 1 }, "fictional");
  assert.equal(fallback.method, "download");
  assert.equal(downloadCount, 1, "authorized fallback still works");
  assert.equal(revokeCount, 1);
}

async function main() {
  await controllerTests();
  await backupFallbackTests();
  const css = read("verse_games/shared/parental-gate.css");
  const gate = read("verse_games/shared/parental-gate.js");
  assert.match(css, /var\(--purple, #7f66c6\)/);
  assert.match(css, /text-wrap: balance/);
  assert.match(css, /zoobreak_lock\.png/);
  assert.match(css, /\.bz-parental-gate-primary,\s*\.bz-parental-gate-secondary\s*\{\s*border: 0;\s*background: #fff;\s*color: #4c2b7d/);
  assert.ok(fs.existsSync(path.join(ROOT, "verse_images/zoobreak_lock.png")));
  assert.doesNotMatch(gate, /"🔒"/, "icon must come from Zoo Break art, not emoji");
  const app = read("app.js");
  const entry = read("index.html");
  assert.match(entry, /parental-gate-settings\.js/);
  assert.ok(entry.indexOf("parental-gate.js") < entry.indexOf("parental-gate-settings.js"));
  assert.ok(entry.indexOf("parental-gate-settings.js") < entry.indexOf('src="app.js"'));
  assert.match(app, /parentAreaGate\?\.onScreenChange\?\.\(nextScreen\)/);
  assert.match(app, /parentAreaGate\?\.onScreenChange\?\.\(screen\)/);
  assert.match(app, /if \(!parentManagementAllowed\(\)\) return;/);
  assert.match(app, /function runParentOutgoingAction/);
  assert.match(app, /link\?\.addEventListener\("click", event =>/);
  assert.match(app, /mailLink\?\.addEventListener\("click", event =>/);
  assert.match(app, /window\.open\(href, "_blank", "noopener,noreferrer"\)/);
  assert.match(app, /runParentManagementAction\(/);
  assert.match(app, /runParentOutgoingAction\(/);
  assert.match(app, /if \(!fromFirstProfile && !parentManagementAllowed\(\)\) return;/);
  assert.match(app, /if \(!parentManagementAllowed\(\)\) \{\s*closeDialog\(\);/);
  const workflow = read(".github/workflows/ios-prep-validation.yml");
  assert.match(workflow, /node scripts\/validate_parental_gate_pr3_settings\.js/);
  const dist = path.join(ROOT, "dist");
  if (fs.existsSync(dist)) {
    assert.ok(fs.existsSync(path.join(dist, "verse_games/shared/parental-gate-settings.js")));
    assert.match(read("dist/index.html"), /parental-gate-settings\.js/);
    assert.ok(fs.existsSync(path.join(dist, "verse_images/zoobreak_lock.png")));
  }
  console.log("Kids PR3 PASS: scoped parent visit, profile/background expiry, guarded email/links, backup fallback, Zoo Break art and purple/white UI.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
