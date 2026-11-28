// Release 1.0: audit every published verse ID and the packaged debug fixture.
// This is a source-integrity check, not a word-for-word review against an
// external Bible edition or a substitute for human rights review.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "verse_data");
const ids = JSON.parse(fs.readFileSync(path.join(dir, "verse_list.json"), "utf8"));
assert.ok(Array.isArray(ids), "verse_list.json must be an array");
assert.equal(ids.length, 124, "Release 1.0 expected verse count changed; review deliberately");
assert.equal(new Set(ids).size, ids.length, "Duplicate verse IDs in verse_list.json");
const onDisk = fs.readdirSync(dir).filter(name => name.endsWith(".json") && name !== "verse_list.json");
assert.equal(onDisk.length, ids.length, "Unlisted verse JSON or missing published verse");
const errors = [];
let john;
const publishedIds = [];
for (const id of ids) {
  if (!/^[a-z0-9_]+$/.test(id)) {
    errors.push(id + ": unexpected verse ID");
    continue;
  }
  const file = id + ".json";
  if (!onDisk.includes(file)) {
    errors.push(id + ": JSON missing");
    continue;
  }
  let data;
  try { data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")); }
  catch (err) { errors.push(id + ": invalid JSON " + err.message); continue; }
  if (data.verseId !== id) errors.push(id + ": verseId mismatch");
  if (data.translation !== "BSB") errors.push(id + ": translation not BSB");
  if (!/Berean Standard Bible/i.test(String(data.attribution || "")) ||
      !/public domain/i.test(String(data.attribution || "")))
    errors.push(id + ": missing expected BSB/public-domain attribution");
  if (!String(data.verseText || "").trim())
    errors.push(id + ": empty verseText");
  if (data.published === true) publishedIds.push(id);
  if (id === "john_11_35") {
    assert.equal(data.published, false, "John 11:35 is a retained unpublished test verse");
    assert.equal(data.verseText, "Jesus wept.");
    assert.equal(data.biblopetDefaultName, "Weepy");
  }
  if (id === "john_3_16") john = data;
}
assert.deepEqual(errors, [], "Published verse source/attribution audit failed:\n" + errors.join("\n"));
assert.ok(john, "Canonical John 3:16 required for fallback check");
assert.deepEqual(publishedIds, ids.filter(id => id !== "john_11_35"),
  "Only John 11:35 should be hidden from the release catalog");

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
assert.match(app, /const DEBUG_MODE = false;/, "Release must keep debug fallback disabled");
const match = app.match(/const DEBUG_VERSE_JSON = \{[\s\S]*?\n\};/);
assert.ok(match, "Debug fallback fixture missing; update audit if intentionally removed");
const fixture = vm.runInNewContext(match[0] + "\nDEBUG_VERSE_JSON", {});
for (const key of ["verseId", "translation", "verseText", "echoParts", "attribution", "hidePlan"]) {
  assert.equal(JSON.stringify(fixture[key]), JSON.stringify(john[key]),
    "Offline-only fixture does not match public-domain canonical BSB " + key);
}
assert.doesNotMatch(match[0], /"translation":\s*"ESV"|Debug mode verse data \(remove before publishing\)/);
// Exercise the actual catalog and restore/route helpers with an isolated
// filesystem-backed fetch; no browser, real profile or saved data changes.
function extract(name) {
  const start = app.search(new RegExp("^" + "(?:async )?function " + name + "\\(", "m"));
  assert.ok(start >= 0, "Missing " + name);
  const end = app.indexOf("\n}", start);
  assert.ok(end > start, "Unterminated " + name);
  return app.slice(start, end + 2);
}
async function checkVisibility() {
  const progress = { lastActiveVerseId: "john_11_35", verses: {
    john_11_35: { learnCompleted: true, lastPracticedAt: 20 },
    john_3_16: { learnCompleted: true, lastPracticedAt: 10 }
  }};
  const original = JSON.stringify(progress);
  const context = { console, URL, URLSearchParams, DATA_DIR: "verse_data/", VERSE_LIST: [],
    window: { location: new URL("https://example.test/?v=john_11_35&petUnlock=john_11_35&mixNext=1"), },
    history: { replaceState(_state, _title, url) { context.window.location = new URL(url); } },
    loadProgress: () => progress,
    fetch: async url => ({ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, url), "utf8"))})
  };
  vm.createContext(context);
  vm.runInContext(["loadVerseList", "isVerseAvailableForRestore", "getRememberedActiveVerseId",
    "captureBootRouteFromUrl", "getFirstLearnedVerseIdForTutorial"].map(extract).join("\n"), context);
  await context.loadVerseList();
  assert.equal(context.VERSE_LIST.length, 123);
  assert.equal(context.isVerseAvailableForRestore("john_11_35"), false);
  assert.equal(context.getRememberedActiveVerseId(), "john_3_16");
  assert.equal(context.getFirstLearnedVerseIdForTutorial(progress), "john_3_16");
  const route = context.captureBootRouteFromUrl();
  assert.equal(route.verseId, "");
  assert.equal(route.petUnlock, "");
  assert.equal(route.mixNext, false);
  assert.equal(JSON.stringify(progress), original, "Saved verse progress must remain intact");
  console.log("Release BSB PASS: 124 retained verse JSONs; 123 published; John 11:35 hidden, stale restore/return ignored, progress preserved, BSB attribution and canonical debug fixture unchanged.");
}
checkVisibility().catch(err => { console.error(err); process.exitCode = 1; });
