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
  if (id === "john_3_16") john = data;
}
assert.deepEqual(errors, [], "Published verse source/attribution audit failed:\n" + errors.join("\n"));
assert.ok(john, "Canonical John 3:16 required for fallback check");

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
console.log("Release BSB PASS: 124 listed verse JSONs present, BSB metadata/attribution, unchanged canonical John 3:16 debug-only fixture.");
