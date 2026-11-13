"use strict";

// Regression for Tower of Bible -> Daily Zoo To-Do -> Classic Feeding.
// The completed Tower activity is not responsible for selecting Feeding's
// sound backend: a real (non-preview) Classic Zoo To-Do session must be native.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const feed = fs.readFileSync(path.join(root, "daily_questions_feed_game.js"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/ios-prep-validation.yml"), "utf8");
const modes = { CLASSIC: "classic", LABYRINTH: "labyrinth", MELODY: "melody", BOUNCE: "bounce" };

function expression(before, after) {
  const start = feed.indexOf(before);
  assert(start >= 0, "missing source marker: " + before);
  assert.equal(feed.indexOf(before, start + 1), -1, "ambiguous marker: " + before);
  const end = feed.indexOf(after, start + before.length);
  assert(end > start, "missing source terminator: " + after);
  return feed.slice(start + before.length, end).trim();
}

// Run both ACTUAL production predicates rather than reimplementing them in
// the test. The first controls rendered preview UI; the second controls
// audio allocation and whether Got It! invokes native prepare().
const rendered = expression("    const nativePilotPreview =\n", ";\n    const nativeClassicChoice");
const runtime = expression("    const nativePilotAllowed =\n", ";\n    if (nativePilotAllowed && preparedAudioContext)");

function selected(expr, mode, {nativeOnly, ios, preview} = {}) {
  const session = { dailyTodoPreview: preview === true, dailyTodoSnack: preview !== true };
  const window = {
    BibloZooNativeOnlyOutput: {enabled: nativeOnly === true},
    BibloZooFeedingNativeAudioPilot: {isIOS: () => ios === true}
  };
  return vm.runInNewContext(expr, {
    session, window, mode, FEED_MODES: modes,
    nativeOnlyApp: nativeOnly === true
  }) === true;
}

for (const mode of Object.values(modes)) {
  // A completed Tower returns to Zoo To-Do, which starts real Feeding
  // (dailyTodoPreview=false). The separate Audio Test app must use native
  // for every assigned mode, even Classic.
  for (const predicate of [rendered, runtime]) {
    assert(selected(predicate, mode, {nativeOnly:true, ios:true, preview:false}),
      mode + ": real Audio Test Feeding must select native");
    assert(!selected(predicate, mode, {nativeOnly:false, ios:true, preview:false}),
      mode + ": original iOS remains unchanged");
    assert(!selected(predicate, mode, {nativeOnly:false, ios:false, preview:false}),
      mode + ": browser/Android remain unchanged");
  }
}
for (const predicate of [rendered, runtime]) {
  assert(selected(predicate, modes.CLASSIC, {nativeOnly:false, ios:true, preview:true}),
    "legacy opt-in Classic preview stays available");
  assert(!selected(predicate, modes.CLASSIC, {nativeOnly:true, ios:false, preview:false}),
    "native output must require the iOS pilot");
}

// Confirm the selected runtime predicate reaches the existing real Got It!
// native preflight, while failure still keeps the instructions for retry.
assert.match(feed, /if \(runtime\.nativePilotAllowed\) \{\s*void startPreviewRoundWithAudioChoice\(runtime\);\s*\} else \{\s*startRound\(runtime\);/);
assert.match(feed, /result\?\.ready !== true \|\| !pilot[\s\S]*?round not started/);
assert.match(feed, /runtime\.nativePilotBackend = "native"/);
assert.match(feed, /runtime\.nativePilot\?\.play\("feed-star"/);
assert.match(feed, /runtime\.nativePilot\?\.play\("feed-chomp"/);
assert.match(feed, /runtime\.nativePilot\?\.play\("feed-peg"/);
assert.match(workflow, /node scripts\/validate_native_classic_zoo_todo_audio\.js/);
console.log("PASS: real Zoo To-Do Classic (after Tower) uses native Got It! preflight; all modes and other platforms preserve policy.");
