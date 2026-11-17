/* Review → Learn → Listen Activities free-play and navigation contract.
 * Synthetic checks only; NEVER import family data or grant a real Daily reward.
 * Physical iPhone sound, navigation and interruptions still require owner tests. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const app = read("app.js");
const moduleSource = read("read_my_verse.js");
const Read = require("../read_my_verse.js");

const cards = [
  ["balloons", "Balloons", "app_icon_balloons.png", "#ffc751"],
  ["fish", "Fish", "app_icon_fish.png", "#40b9c5"],
  ["typewriter", "Typewriter", "app_icon_typewriter.png", "#7f66c6"],
  ["keyboard", "Keyboard", "app_icon_keyboard.png", "#444444"],
  ["unscramble", "Unscramble", "app_icon_unscramble.png", "#a7cb6f"],
  ["star_wars", "Space", "app_icon_verse_crawl.png", "#f2f2f2"],
  ["tap_words_order", "Tap in Order", "app_icon_tap_words_in_order.png", "#7f66c6"],
  ["chunk_sequence", "Sound Sequence", "app_icon_chunk_audio_matching.png", "#ff5a51"]
];

for (const img of ["app_icon_review_verse.png", "app_icon_listen_to_verse.png",
  ...cards.map((c) => c[2])]) {
  assert.ok(fs.statSync(path.join(root, "verse_images/game_icons", img)).size > 0,
    "uploaded icon missing or empty: " + img);
}

const listStart = app.indexOf("const LISTEN_ACTIVITY_CARDS = Object.freeze([");
const listEnd = app.indexOf("].map((item) => Object.freeze(item)))", listStart);
assert.ok(listStart >= 0 && listEnd > listStart);
const list = app.slice(listStart, listEnd);
const ids = [...list.matchAll(/\{ id: "([^"]+)", title: "([^"]+)", iconImage: IMG_DIR \+ "game_icons\/([^"]+)", cardColor: "(#[0-9a-f]{6})"/g)]
  .map((m) => m.slice(1, 5));
assert.deepEqual(ids, cards, "card titles/order/icons/colors must match owner selection");
for (const [id] of cards) {
  assert.equal(Read.READ_ACTIVITY_MANIFEST[id]?.enabled, true,
    "missing native Read activity: " + id);
}

// Reuse Practice visual layout, while keeping its own child-facing routes.
for (const name of ["LEARN_HUB", "LISTEN_ACTIVITIES"]) {
  assert.match(app, new RegExp(name + ': "[a-z_]+"' ));
  assert.match(app, new RegExp("Screen\\." + name + "\\) slide = screen"));
}
const homeTap = app.slice(app.indexOf('if (action === "learn") {'),
  app.indexOf('if (action === "practice") {', app.indexOf('if (action === "learn") {')));
assert.match(homeTap, /State\.hasLearnedVerse/);
assert.match(homeTap, /go\(Screen\.LEARN_HUB\)/);
assert.match(homeTap, /resetLearn\(false\)/);
assert.match(homeTap, /startLearnInstruction\("listen"\)/);
const hub = app.slice(app.indexOf("function screenLearnHub("), app.indexOf("function screenListenActivities("));
const picker = app.slice(app.indexOf("function screenListenActivities("), app.indexOf("function screenPracticeHub("));
assert.match(hub, /homePillHtml\(\)/);
assert.match(hub, /renderPracticeHubCard/);
assert.match(hub, /id: "learn-again"/);
assert.match(hub, /id: "listen-activities"/);
assert.match(hub, /go\(Screen\.LISTEN_ACTIVITIES\)/);
assert.match(picker, /practiceBackPillHtml\("Back to Learn"\)/);
assert.match(picker, /go\(Screen\.LEARN_HUB\)/);
assert.match(picker, /renderPracticeHubCard/);
assert.match(picker, /source: "learn_listen_activities"/);
assert.match(picker, /module\.startForVerse\(VERSE_ID, activityId, context\)/);
assert.match(picker, /module\?\.isActivityEligibleForVerse/);
assert.match(picker, /transitionToAppScreen\(Screen\.READ_MY_VERSE\)/);
assert.doesNotMatch(picker, /beginTask|saveDailyTodoReadRuntime|setPendingCompletion/);

// Native sound stays launched from the actual card-tap call into startForVerse.
assert.match(moduleSource, /Claim audio priority only on this actual Start interaction/);
assert.match(moduleSource, /BibloZooNativeReadOutputController\.activateFromGesture\(\)/);

// No fake Daily plan tokens, DEV shortcuts, or recording permissions in free play.
const freeHooks = app.slice(app.indexOf("function isLearnListenReadContext("),
  app.indexOf("function loadDailyTodoQuestionsRuntime("));
assert.match(freeHooks, /completeDailyTodoRead\(\{ context, verseId, readActivityId \}\)/);
assert.match(freeHooks, /exitDailyTodoRead\(context\)/);
assert.match(freeHooks, /transitionToAppScreen\(Screen\.LISTEN_ACTIVITIES\)/);
assert.doesNotMatch(freeHooks, /setPendingCompletion|beginTask|recordFlashcardAttempt|saveProgress/);
assert.match(app, /onContextComplete:\s*completeReadMyVerseContext/);
assert.match(app, /onContextExit:\s*exitReadMyVerseContext/);

Read.initialize({getActiveProfileId: () => "profile-test-only"});
for (const [activityId] of cards) {
  const free = {
    source: "learn_listen_activities",
    profileId: "profile-test-only",
    verseId: "john_3_16",
    readActivityId: activityId,
    readTestMode: "normal"
  };
  const result = Read.validateContext(free, "john_3_16", activityId);
  assert.equal(result?.source, "learn_listen_activities");
  assert.equal(result?.readActivityId, activityId);
  assert.equal(result?.taskId, "");
  assert.equal(result?.launchToken, "");
  assert.equal(Read.validateContext({...free, profileId: "other-profile"},
    "john_3_16", activityId), null, "profile mismatch must not launch");
  assert.equal(Read.validateContext({...free, planId: "fake-plan"},
    "john_3_16", activityId), null, "cannot spoof a Daily plan");
  assert.equal(Read.validateContext({...free, taskId: "review"},
    "john_3_16", activityId), null, "cannot spoof a Daily task");
  assert.equal(Read.validateContext({...free, previewScope: "read_test"},
    "john_3_16", activityId), null, "normal free play cannot enter DEV mode");
  assert.equal(Read.validateContext(free, "other-verse", activityId), null);
}
assert.equal(Read.validateContext({
  source: "learn_listen_activities",
  profileId: "profile-test-only",
  verseId: "john_3_16",
  readActivityId: "not-real",
  readTestMode: "normal"
}, "john_3_16", "not-real"), null);
// Original incomplete Daily context must still be rejected.
assert.equal(Read.validateContext({
  source: "daily_todo", profileId: "profile-test-only",
  verseId: "john_3_16", readActivityId: "typewriter"
}, "john_3_16", "typewriter"), null);
const noChunks = {verseText: "Hello.", echoParts: ["Hello."]};
assert.equal(Read.isActivityEligibleForVerse("chunk_sequence", noChunks), false);
console.log("PASS: Review hub, 10 real icons, ordered 8 Read activities, secure child free play, original Daily isolation and native gesture source.");
