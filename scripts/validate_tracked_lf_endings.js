"use strict";

// Guard the specific tracked blobs whose CRLF contents conflicted with the
// repository's existing '*.json / *.css text eol=lf' attributes. Checking
// HEAD blobs (not just the checkout) catches the original failure on macOS.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const files = [
  "biblopet_name_blocklist.json",
  "pet_random_names.json",
  "verse_data/1_john_3_5.json",
  "verse_data/1_timothy_2_5.json",
  "verse_data/deuteronomy_10_17.json",
  "verse_data/isaiah_46_9_10.json",
  "verse_data/john_20_31.json",
  "verse_data/john_3_14_15.json",
  "verse_data/mark_1_17.json",
  "verse_data/matthew_1_21.json",
  "verse_data/matthew_22_31_32.json",
  "verse_data/matthew_28_20.json",
  "verse_data/matthew_7_12.json",
  "verse_data/proverbs_15_3.json",
  "verse_data/psalm_100_3.json",
  "verse_data/psalm_119_36.json",
  "verse_data/psalm_128_1.json",
  "verse_data/psalm_23_4.json",
  "verse_data/psalm_77_11.json",
  "verse_data/romans_8_31.json",
  "verse_playground/ghost_writer/game.css"
];
const root = path.resolve(__dirname, "..");
let checks = 0;
for (const relative of files) {
  const indexed = execFileSync("git", ["show", "HEAD:" + relative], { cwd: root });
  const worktree = fs.readFileSync(path.join(root, relative));
  assert.ok(!indexed.includes(13), relative + ": committed blob still has CR bytes");
  assert.ok(!worktree.includes(13), relative + ": checkout still has CR bytes");
  assert.deepEqual(worktree, indexed, relative + ": checkout differs from committed LF blob");
  if (relative.endsWith(".json")) {
    JSON.parse(indexed.toString("utf8"));
  }
  checks += 1;
}
console.log("Tracked LF line-ending validation passed (" + checks + " files).");
