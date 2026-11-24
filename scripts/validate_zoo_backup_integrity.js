/* Zoo backup v3: real app export/parse/restore functions under fictional storage.
 * No device access, private backup files, child profiles, or network calls.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zoo = require("../verse_games/shared/zoo-backup-state.js");
const ROOT = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function slice(start, end) {
  const a = app.indexOf(start), b = app.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, "app.js source anchors missing: " + start);
  return app.slice(a, b);
}

class FakeStorage {
  constructor() { this.values = new Map(); this.failKey = ""; }
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (key === this.failKey) {
      this.failKey = "";
      throw Error("simulated storage write failure");
    }
    this.values.set(String(key), String(value));
  }
  removeItem(key) { this.values.delete(String(key)); }
  dump() { return JSON.stringify([...this.values.entries()].sort((a,b)=>a[0].localeCompare(b[0]))); }
}

function state(pets = 4, breaks = 1, day = "2026-11-23") {
  return {
    rescueStats: { petsRescued: pets, zooBreaksStopped: breaks, pendingPets: 1, pendingBreaks: 0 },
    surprise: { day, breaksTriggered: breaks }
  };
}
function progress(verse = "john_3_16", attempts = 2) {
  return { version: 2, verses: { [verse]: { learnCompleted: true,
    flashcards: { attempts } } }, tutorial: { completed: true }, dailyZooTodo: {
      version: 3, stats: { totalTasks: 3 }
    } };
}
function profile(id, name = "Fictional Keeper") {
  return { id, name, avatarVerseId: "john_3_16", createdAt: 11, updatedAt: 12 };
}
function freshEnvironment() {
  const storage = new FakeStorage();
  const initial = { version: 1, activeProfileId: "profile_one",
    profiles: [profile("profile_one")], migration: {} };
  storage.setItem("biblozooPwaProfiles", JSON.stringify(initial));
  storage.setItem("biblozooPwaProgress:profile_one", JSON.stringify(progress()));
  const api = {
    PROFILE_REGISTRY_STORAGE_KEY: "biblozooPwaProfiles",
    LEGACY_PROGRESS_STORAGE_KEY: "biblozooPwaProgress",
    PROFILE_REGISTRY_VERSION: 1,
    PROFILE_NAME_MAX_LENGTH: 16,
    getProfileProgressStorageKey(id) { return "biblozooPwaProgress:" + id; },
    loadProfileRegistry() { return JSON.parse(storage.getItem(this.PROFILE_REGISTRY_STORAGE_KEY)); },
    saveProfileRegistry(value) { storage.setItem(this.PROFILE_REGISTRY_STORAGE_KEY, JSON.stringify(value)); },
    normalizeProfileRegistry(value) {
      return { version: 1, activeProfileId: String(value.activeProfileId || ""),
        profiles: value.profiles.map(p => ({ ...p })), migration: value.migration || {} };
    },
    getAllProfiles() { return this.loadProfileRegistry().profiles; },
    getProfileById(id) { return this.getAllProfiles().find(p => p.id === id); },
    getActiveProfileId() { return this.loadProfileRegistry().activeProfileId; },
    normalizeProfileNameForComparison(name) { return String(name).toLowerCase(); },
    cleanProfileName(name) { return String(name).slice(0, 16); }
  };
  const win = { BibloZooZooBackup: zoo };
  const ctx = {
    window: win, localStorage: storage, getProfileApi: () => api,
    PROGRESS_VERSION: 2, createEmptyProgress: () => ({ version: 2, verses: {}, tutorial: {} }),
    migrateTrafficProgress: () => false,
    migrateTutorialProgress: () => false,
    migrateDailyQuestionsProgress: () => false,
    parentManagementAllowed: () => true,
    clearGameMixState() {}, clearTransientStateForProfileActivation() {},
    State: {}, Screen: { PROFILE_PICKER: "picker" }, setScreen() {}, applyMute() {},
    refreshCurrentProgressState() {}, closeDialog() {}, render() {}, showDialog() {},
    dlgBtn() { return {}; }, console: { warn() {} },
    Date, Math, JSON, Set, Object, Number, String, Error, Array
  };
  // Exercise real functions, including v2 migration, new ID allocation,
  // transaction snapshots and the existing (last) restore function.
  const source = [
    slice("const FAMILY_SAVE_TYPE =", "async function shareOrDownloadJsonSave("),
    slice("function parseFamilySaveData(", "function getProfileProgressStoragePrefix("),
    slice("function getProfileProgressStoragePrefix(", "function createProfileWithImportedProgress("),
    slice("function restoreImportedProgressToActiveProfile(", "function openRestoreProgressDialog("),
    "globalThis.exposed = { createFamily: createBibloZooFamilySaveData,",
    " createProfile: createBibloZooProfileSaveData, parseFamily: parseFamilySaveData,",
    " parseProfile: parseProfileSaveData, applyFamily: applyFamilyImport,",
    " replaceActive: restoreImportedProgressToActiveProfile };"
  ].join("\n");
  vm.runInNewContext(source, ctx, { filename: "real-app-zoo-backup-audit.js" });
  return { storage, api, win, ops: ctx.exposed };
}
function json(v) { return JSON.parse(JSON.stringify(v)); }
function countSaved(storage, id) {
  return [zoo.RESCUE_PREFIX, zoo.SURPRISE_PREFIX].filter(prefix =>
    storage.getItem(prefix + id) !== null).length;
}

(function helperTests() {
  const storage = new FakeStorage();
  storage.setItem("unrelated-setting", "leave me alone");
  assert.deepEqual(zoo.read(storage, "profile_one"),
    { rescueStats: null, surprise: null }, "absent records are explicit null");
  zoo.write(storage, "profile_one", state(9, 3));
  assert.deepEqual(zoo.read(storage, "profile_one"), state(9, 3));
  const snap = zoo.snapshot(storage);
  zoo.write(storage, "profile_one", { rescueStats: null, surprise: null });
  assert.equal(countSaved(storage, "profile_one"), 0);
  zoo.write(storage, "profile_two", state(100, 22));
  zoo.restoreSnapshot(storage, snap);
  assert.deepEqual(zoo.read(storage, "profile_one"), state(9, 3));
  assert.equal(countSaved(storage, "profile_two"), 0);
  assert.equal(storage.getItem("unrelated-setting"), "leave me alone");
  assert.throws(() => zoo.normalize({ rescueStats: null }), /missing its Zoo/);
  assert.throws(() => zoo.normalize({
    rescueStats: { ...state().rescueStats, petsRescued: -1 }, surprise: null
  }), /Invalid Zoo rescue counter/);
  assert.throws(() => zoo.normalize({
    rescueStats: null, surprise: { day: "not-a-date", breaksTriggered: 2 }
  }), /Invalid Zoo surprise/);
  storage.setItem(zoo.RESCUE_PREFIX + "profile_one", "{broken");
  assert.throws(() => zoo.read(storage, "profile_one"), /Backup cancelled/);
  storage.setItem(zoo.RESCUE_PREFIX + "profile_one",
    JSON.stringify(state(9, 3).rescueStats));
  zoo.cleanupOrphans(storage, ["profile_two"]);
  assert.equal(countSaved(storage, "profile_one"), 0);
  assert.equal(storage.getItem("unrelated-setting"), "leave me alone");
})();

(function exportAndParseTests() {
  const { storage, win, ops } = freshEnvironment();
  const saved = state(8, 2);
  zoo.write(storage, "profile_one", saved);
  const family = json(ops.createFamily());
  assert.equal(family.saveVersion, 3);
  assert.deepEqual(family.profiles[0].zoo, saved, "family export includes both stores");
  assert.deepEqual(family.profiles[0].progress, progress());
  const individual = json(ops.createProfile("profile_one"));
  assert.equal(individual.saveVersion, 3);
  assert.deepEqual(individual.profile.zoo, saved, "single export includes both stores");
  assert.deepEqual(json(ops.parseFamily(family).profiles[0].zoo), saved);
  assert.deepEqual(json(ops.parseProfile(individual).profile.zoo), saved);

  zoo.clear(storage, "profile_one");
  assert.deepEqual(json(ops.createFamily()).profiles[0].zoo,
    { rescueStats: null, surprise: null }, "no record is not made up");
  assert.deepEqual(json(ops.createProfile("profile_one")).profile.zoo,
    { rescueStats: null, surprise: null });
  assert.throws(() => ops.parseFamily({ ...family, profiles: [
    { ...family.profiles[0], zoo: undefined }] }), /missing its Zoo/);
  assert.throws(() => ops.parseProfile({ ...individual, profile: {
    ...individual.profile, zoo: { rescueStats: null, surprise: { day: "", breaksTriggered: 0 } }
  } }), /Invalid Zoo surprise/);

  const v2 = json(family);
  v2.saveVersion = 2;
  delete v2.profiles[0].zoo;
  assert.equal(ops.parseFamily(v2).profiles[0].zoo, undefined,
    "old family v2 is still accepted without inventing zoo totals");
  const oldIndividual = json(individual);
  oldIndividual.saveVersion = 2;
  delete oldIndividual.profile.zoo;
  assert.equal(ops.parseProfile(oldIndividual).profile.zoo, undefined);
  assert.throws(() => ops.parseFamily({ ...v2, saveVersion: 4 }), /unsupported save version/);
  assert.throws(() => ops.parseProfile({ ...oldIndividual, saveVersion: 1 }), /unsupported save version/);
  delete win.BibloZooZooBackup;
  assert.throws(() => ops.createFamily(), /Zoo backup system is unavailable/,
    "missing helper must fail closed, not produce an incomplete new backup");
})();

(function restoreTests() {
  // Add as New maps the independent records to the newly allocated profile ID.
  {
    const { storage, api, ops } = freshEnvironment();
    zoo.write(storage, "profile_one", state(1, 0));
    const exported = { ...profile("profile_old", "Visiting Keeper"),
      progress: progress("psalm_23_4", 4), zoo: state(14, 5) };
    const added = ops.applyFamily({ profiles: [exported] }, "add");
    assert.equal(added.length, 1);
    assert.notEqual(added[0].id, exported.id);
    assert.deepEqual(zoo.read(storage, added[0].id), state(14, 5));
    assert.equal(countSaved(storage, exported.id), 0);
    assert.deepEqual(zoo.read(storage, "profile_one"), state(1, 0));
    assert.equal(api.getAllProfiles().length, 2);
  }

  // Replace All discards orphan records, but leaves unrelated local data.
  {
    const { storage, api, ops } = freshEnvironment();
    zoo.write(storage, "profile_one", state(3, 1));
    zoo.write(storage, "profile_orphan", state(99, 33));
    storage.setItem("unrelated-setting", "preserved");
    ops.applyFamily({ profiles: [{ ...profile("profile_new"), progress: progress(),
      zoo: state(7, 2) }] }, "replace");
    assert.equal(countSaved(storage, "profile_one"), 0);
    assert.equal(countSaved(storage, "profile_orphan"), 0);
    assert.deepEqual(zoo.read(storage, "profile_new"), state(7, 2));
    assert.equal(api.getAllProfiles().length, 1);
    assert.equal(storage.getItem("unrelated-setting"), "preserved");
  }

  // Old v2 backups do not contain Zoo data. Same-ID local stats stay intact;
  // adding an old profile under a new ID does not steal any stored counters.
  {
    const { storage, ops } = freshEnvironment();
    zoo.write(storage, "profile_one", state(11, 4));
    ops.applyFamily({ profiles: [{ ...profile("profile_one"),
      progress: progress("romans_12_2", 7), zoo: undefined }] }, "replace");
    assert.deepEqual(zoo.read(storage, "profile_one"), state(11, 4));
    ops.applyFamily({ profiles: [{ ...profile("profile_one"),
      progress: progress(), zoo: undefined }] }, "add");
    assert.deepEqual(zoo.read(storage, "profile_one"), state(11, 4));
  }

  // A partial Zoo write must roll the entire transaction back, including the
  // profile registry, main progress, and both independent Zoo records.
  {
    const { storage, ops } = freshEnvironment();
    zoo.write(storage, "profile_one", state(4, 1));
    const original = storage.dump();
    storage.failKey = zoo.SURPRISE_PREFIX + "profile_new";
    assert.throws(() => ops.applyFamily({ profiles: [{
      ...profile("profile_new"), progress: progress("psalm_23_4", 9),
      zoo: state(9, 3)
    }] }, "replace"), /simulated storage write failure/);
    assert.equal(storage.dump(), original, "all previous local data rolled back");
  }

  // Individual Replace Progress restores both Zoo records to the *active*
  // Zookeeper; v2 leaves a currently available local record intact.
  {
    const { storage, api, ops } = freshEnvironment();
    zoo.write(storage, "profile_one", state(3, 1));
    const active = api.getProfileById("profile_one");
    ops.replaceActive(progress("psalm_23_4"), active, state(17, 6));
    assert.deepEqual(zoo.read(storage, "profile_one"), state(17, 6));
    ops.replaceActive(progress("john_3_16"), active, undefined);
    assert.deepEqual(zoo.read(storage, "profile_one"), state(17, 6));
    ops.replaceActive(progress("john_3_16"), active,
      { rescueStats: null, surprise: null });
    assert.equal(countSaved(storage, "profile_one"), 0);
  }

  // A failed individual replace must restore the original main progress and
  // the previous two Zoo keys without deleting unrelated profile records.
  {
    const { storage, api, ops } = freshEnvironment();
    zoo.write(storage, "profile_one", state(3, 1));
    const original = storage.dump();
    storage.failKey = zoo.SURPRISE_PREFIX + "profile_one";
    ops.replaceActive(progress("psalm_23_4", 20),
      api.getProfileById("profile_one"), state(99, 18));
    assert.equal(storage.dump(), original);
  }
})();

(function packagingTests() {
  assert.match(index, /<script src="verse_games\/shared\/zoo-backup-state\.js"><\/script>/);
  assert.ok(index.indexOf("zoo-backup-state.js") < index.indexOf('src="app.js"'),
    "backup API must load before app.js");
  assert.match(app, /const FAMILY_SAVE_VERSION = 3;/);
  assert.match(app, /const PROFILE_SAVE_VERSION = 3;/);
  assert.match(app, /zoo: getZooBackupApi\(\)\.read\(localStorage, profile\.id\)/);
  assert.match(app, /getZooBackupApi\(\)\.restoreSnapshot\(localStorage, snapshot\.zooEntries\)/);
  if (fs.existsSync(path.join(ROOT, "dist", "index.html"))) {
    const packaged = fs.readFileSync(path.join(ROOT, "dist", "index.html"), "utf8");
    assert.match(packaged, /verse_games\/shared\/zoo-backup-state\.js/);
    assert.ok(fs.existsSync(path.join(ROOT, "dist", "verse_games/shared/zoo-backup-state.js")));
  }
})();

console.log("Zoo backup v3 PASS: real family/single export, v2 compatibility, add/remap/replace, orphan cleanup, rollback, validation, privacy and packaged helper.");
