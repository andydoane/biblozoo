#!/usr/bin/env node
"use strict";

// Patch 27: exercise real route and game-completion functions in isolated VMs.
// No profile data, browser navigation, or files are modified by this validator.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const APP = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const BRIDGE = fs.readFileSync(path.join(ROOT, "verse_games/shared/bridge.js"), "utf8");
const SERVICE_WORKER = fs.readFileSync(path.join(ROOT, "service-worker.js"), "utf8");
let checks = 0;
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}
function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

function extractFunction(source, name) {
  const match = new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing ${name} function`);
  let cursor = match.index;
  // Skip the parameters, including any destructured braces, until the body.
  const parenStart = source.indexOf("(", cursor);
  let depth = 0;
  let quote = "";
  let lineComment = false;
  let blockComment = false;
  const next = (index) => source[index + 1] || "";
  for (cursor = parenStart; cursor < source.length; cursor++) {
    const c = source[cursor];
    if (lineComment) { if (c === "\n") lineComment = false; continue; }
    if (blockComment) { if (c === "*" && next(cursor) === "/") { blockComment = false; cursor++; } continue; }
    if (quote) {
      if (c === "\\") { cursor++; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === "/" && next(cursor) === "/") { lineComment = true; cursor++; continue; }
    if (c === "/" && next(cursor) === "*") { blockComment = true; cursor++; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "(") depth++;
    if (c === ")" && --depth === 0) { cursor++; break; }
  }
  const bodyStart = source.indexOf("{", cursor);
  assert.ok(bodyStart >= 0, `Missing ${name} function body`);
  depth = 0; quote = ""; lineComment = false; blockComment = false;
  for (cursor = bodyStart; cursor < source.length; cursor++) {
    const c = source[cursor];
    if (lineComment) { if (c === "\n") lineComment = false; continue; }
    if (blockComment) { if (c === "*" && next(cursor) === "/") { blockComment = false; cursor++; } continue; }
    if (quote) {
      if (c === "\\") { cursor++; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === "/" && next(cursor) === "/") { lineComment = true; cursor++; continue; }
    if (c === "/" && next(cursor) === "*") { blockComment = true; cursor++; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) {
      const fn = source.slice(match.index, cursor + 1);
      new vm.Script(fn, { filename: `${name}-extracted.js` });
      return fn;
    }
  }
  throw new Error(`Unterminated ${name} function`);
}

const bridgeFunctions = [
  "getParams", "getProgressStorageKey", "loadProgress", "saveProgress",
  "isTrackedGameCompleted", "markCompleted", "wasAlreadyCompleted",
  "completeGameRun", "isDailyTodoLaunch", "returnToDailyTodo",
  "buildParentAppUrl"
];
const appFunctions = ["resumePendingBootRoute"];
if (/function\s+clearConsumedPetUnlockRoute\s*\(/.test(APP)) {
  appFunctions.unshift("clearConsumedPetUnlockRoute");
}

function makeStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function makeBridgeContext(storage, gameUrl) {
  const redirects = [];
  const context = {
    URL, URLSearchParams, Date, Promise, console,
    window: { location: new URL(gameUrl) },
    localStorage: storage,
    performance: { now: () => 12000 },
    navigateWithTransition(url) { redirects.push(url); }
  };
  vm.createContext(context);
  vm.runInContext(
    `const PROFILE_PROGRESS_STORAGE_KEY_BASE = "biblozooPwaProgress";\n` +
      bridgeFunctions.map((name) => extractFunction(BRIDGE, name)).join("\n"),
    context,
    { filename: "bridge-patch27-functions.js" }
  );
  context.redirects = redirects;
  return context;
}

function makeAppContext(initialUrl, route) {
  const screens = [];
  const window = { location: new URL(initialUrl) };
  const history = {
    state: { keep: true },
    replaceState(state, title, url) { window.location = new URL(url); }
  };
  window.history = history;
  const context = {
    URL, URLSearchParams, Promise, console, window, history,
    State: { pendingBootRoute: { ...route }, pendingPetUnlockVerseId: null, selectedVerseId: null },
    Screen: { TITLE: "TITLE", PET_UNLOCK: "PET_UNLOCK", TODO_DEV: "TODO_DEV", PRACTICE: "PRACTICE", PRACTICE_HUB: "PRACTICE_HUB", PLAYGROUND: "PLAYGROUND", PROGRESS: "PROGRESS", TODO: "TODO", NEW_VERSE_PICKER: "NEW_VERSE_PICKER", SETTINGS: "SETTINGS" },
    VERSE_ID: "", HAS_VERSE_SELECTION: false,
    getRememberedActiveVerseId: () => "first_verse",
    loadVerse: async (verseId) => { context.VERSE_ID = verseId; },
    clearLoadedVerseSelection: () => {},
    isTutorialActive: () => false,
    applyMute: () => {},
    setScreen: (name) => { screens.push(name); },
    go: (name) => { screens.push(name); },
    clearGameMixState: () => {},
    isGameMixPetUnlockRequest: () => window.location.searchParams.get("mixPetUnlock") === "1"
  };
  vm.createContext(context);
  vm.runInContext(appFunctions.map((name) => extractFunction(APP, name)).join("\n"), context,
    { filename: "app-patch27-functions.js" });
  context.screens = screens;
  return context;
}

function makeDailyGameUrl(returnTo, verseId = "first_verse") {
  const url = new URL("https://example.test/verse_games/bible_bugs/index.html");
  const params = url.searchParams;
  params.set("verseId", verseId);
  params.set("profileId", "zookeeper-1");
  params.set("returnTo", returnTo);
  params.set("dailyProfileId", "zookeeper-1");
  params.set("dailyPlanId", "care-plan-1");
  params.set("dailyPlanDay", "2026-10-17");
  params.set("dailyTaskId", "activity");
  params.set("dailyLaunchToken", "care-launch-123");
  params.set("dailyVerseId", verseId);
  params.set("dailyActivityKind", "game");
  params.set("dailyActivityId", "bible_bugs");
  params.set("dailyActivityMode", "medium");
  params.set("dailyReturnContext", "daily_tasks_clipboard");
  params.set("todoSource", "daily_todo");
  return url.href;
}

async function main() {
  // Onboarding has already unlocked the pet and recorded its first presentation.
  const progress = {
    version: 2,
    verses: {
      first_verse: {
        learnCompleted: true, petUnlockShown: true,
        games: { bible_bugs: { easyCompleted: true } }
      }
    }
  };
  const storage = makeStorage();
  storage.setItem("biblozooPwaProgress:zookeeper-1", JSON.stringify(progress));
  const firstUnlockUrl = "https://example.test/index.html?v=first_verse&petUnlock=first_verse&internalReturn=1&profileId=zookeeper-1";
  const firstApp = makeAppContext(firstUnlockUrl, {
    verseId: "first_verse", petUnlock: "first_verse", screen: ""
  });
  await firstApp.resumePendingBootRoute();
  equal(firstApp.screens.at(-1), "PET_UNLOCK", "A real first-time unlock must still display");
  equal(firstApp.State.pendingPetUnlockVerseId, "first_verse");
  equal(firstApp.window.location.searchParams.get("petUnlock"), null,
    "The first unlock's URL marker must be consumed on arrival");
  equal(firstApp.window.location.searchParams.get("profileId"), "zookeeper-1",
    "Consuming unlock must preserve profile identity until usual return cleanup");
  equal(firstApp.window.location.searchParams.get("v"), "first_verse");

  // Child taps Home, gets Daily To-Do, and plays its assigned game.
  firstApp.State.pendingPetUnlockVerseId = null;
  firstApp.screens.push("TITLE");
  const freshReturn = new URL(firstApp.window.location.href);
  freshReturn.searchParams.delete("v");
  freshReturn.searchParams.set("screen", "todo_dev");
  const bridge = makeBridgeContext(storage, makeDailyGameUrl(freshReturn.href));
  ok(bridge.isDailyTodoLaunch(), "Assigned game has valid Daily To-Do launch params");
  const repeatCompletion = await bridge.completeGameRun({
    verseId: "first_verse", gameId: "bible_bugs", mode: "medium", startedAt: 9000
  });
  equal(repeatCompletion.ok, true);
  equal(repeatCompletion.alreadyCompleted, false);
  equal(repeatCompletion.newlyCompleted, true, "A new mode may earn a medal");
  equal(repeatCompletion.reward.petUnlockTriggered, false,
    "Completing a Daily To-Do game must not unlock an already-owned pet");
  equal(bridge.returnToDailyTodo({ status: "success", completion: repeatCompletion }), true);
  equal(bridge.redirects.length, 1);
  const correctReturnUrl = new URL(bridge.redirects[0]);
  equal(correctReturnUrl.searchParams.get("screen"), "todo_dev");
  equal(correctReturnUrl.searchParams.get("petUnlock"), null);
  equal(correctReturnUrl.searchParams.get("dailyNewMedal"), "1",
    "A new game mode must still receive its medal");
  equal(correctReturnUrl.searchParams.get("dailyMedalTier"), "medium");
  equal(correctReturnUrl.searchParams.get("dailyPetUnlockTriggered"), null);
  equal(correctReturnUrl.searchParams.get("dailyReturnStatus"), "success");
  equal(correctReturnUrl.searchParams.get("dailyPlanId"), "care-plan-1");
  equal(correctReturnUrl.searchParams.get("dailyLaunchToken"), "care-launch-123");
  equal(correctReturnUrl.searchParams.get("profileId"), "zookeeper-1");
  const returnApp = makeAppContext(correctReturnUrl.href, {
    verseId: "", petUnlock: correctReturnUrl.searchParams.get("petUnlock") || "",
    screen: "todo_dev"
  });
  await returnApp.resumePendingBootRoute();
  equal(returnApp.screens.at(-1), "TODO_DEV",
    "The returning child must see Daily To-Do, not Pet Unlock");

  // A saved/older Daily To-Do return URL containing the stale marker must be
  // scrubbed even when generated by an older launcher.
  const oldReturn = "https://example.test/index.html?v=first_verse&petUnlock=first_verse&screen=title&profileId=zookeeper-1";
  bridge.window.location = new URL(makeDailyGameUrl(oldReturn));
  equal(bridge.isDailyTodoLaunch(), true);
  equal(bridge.returnToDailyTodo({ status: "success", completion: repeatCompletion }), true);
  const scrubbedReturn = new URL(bridge.redirects.at(-1));
  equal(scrubbedReturn.searchParams.has("petUnlock"), false,
    "Bridge must delete a stale petUnlock from copied returnTo");
  equal(scrubbedReturn.searchParams.get("screen"), "todo_dev",
    "Daily To-Do return takes precedence over old title route");
  equal(scrubbedReturn.searchParams.get("dailyPetUnlockTriggered"), null);

  // Older cached bridge/browser still passing petUnlock+screen=todo_dev must
  // not cause the app's startup router to override the explicit destination.
  const staleApp = makeAppContext(
    "https://example.test/index.html?petUnlock=first_verse&screen=todo_dev",
    { verseId: "first_verse", petUnlock: "first_verse", screen: "todo_dev" }
  );
  await staleApp.resumePendingBootRoute();
  equal(staleApp.screens.at(-1), "TODO_DEV");
  equal(staleApp.State.pendingPetUnlockVerseId, null);
  equal(staleApp.window.location.searchParams.get("petUnlock"), null);

  // Quit returns are also protected, and keep their normal status semantics.
  bridge.window.location = new URL(makeDailyGameUrl(oldReturn));
  equal(bridge.returnToDailyTodo({ status: "quit" }), true);
  const quitUrl = new URL(bridge.redirects.at(-1));
  equal(quitUrl.searchParams.get("petUnlock"), null);
  equal(quitUrl.searchParams.get("dailyReturnStatus"), "quit");
  equal(quitUrl.searchParams.get("dailyNewMedal"), null);

  // A genuinely NEW second pet still records an unlock and can open its box.
  progress.verses.second_verse = { learnCompleted: true, games: {} };
  const updated = JSON.parse(storage.getItem("biblozooPwaProgress:zookeeper-1"));
  updated.verses.second_verse = progress.verses.second_verse;
  storage.setItem("biblozooPwaProgress:zookeeper-1", JSON.stringify(updated));
  bridge.window.location = new URL(makeDailyGameUrl(oldReturn, "second_verse"));
  const newPetCompletion = await bridge.completeGameRun({
    verseId: "second_verse", gameId: "bible_bugs", mode: "medium"
  });
  equal(newPetCompletion.reward.petUnlockTriggered, true);
  const petState = JSON.parse(storage.getItem("biblozooPwaProgress:zookeeper-1"))
    .verses.second_verse;
  equal(petState.petUnlockShown, true);
  equal(petState.externalPetUnlockPending.gameId, "bible_bugs");
  equal(bridge.returnToDailyTodo({ status: "success", completion: newPetCompletion }), true);
  const missionUrl = new URL(bridge.redirects.at(-1));
  equal(missionUrl.searchParams.get("dailyPetUnlockTriggered"), "1",
    "Legitimate new-pet mission unlock status must remain intact");
  equal(missionUrl.searchParams.get("petUnlock"), null);

  // A real fresh unlock (without a conflicting target screen) still works,
  // including Game Mix's separate query marker while the unlock is open.
  const newPetApp = makeAppContext(
    "https://example.test/index.html?v=second_verse&petUnlock=second_verse&mixPetUnlock=1",
    { verseId: "second_verse", petUnlock: "second_verse", mixPetUnlock: true, screen: "" }
  );
  await newPetApp.resumePendingBootRoute();
  equal(newPetApp.screens.at(-1), "PET_UNLOCK");
  equal(newPetApp.State.pendingPetUnlockVerseId, "second_verse");
  equal(newPetApp.window.location.searchParams.get("petUnlock"), null);
  equal(newPetApp.isGameMixPetUnlockRequest(), true,
    "Game Mix unlock flag must remain available to the unlock screen");

  // Game-mode replay cannot unlock the new pet twice either.
  const duplicate = await bridge.completeGameRun({
    verseId: "second_verse", gameId: "bible_bugs", mode: "medium"
  });
  equal(duplicate.reward.petUnlockTriggered, false);
  equal(duplicate.alreadyCompleted, true);
  equal(duplicate.newlyCompleted, false);

  // The service worker must refresh the PWA's routed app and game bridge.
  ok(/const CACHE_VERSION\s*=\s*"2026_Oct_17_patch27_pet_unlock_route_guard"/.test(SERVICE_WORKER),
    "PWA cache version must be bumped for Patch 27");
  ok(SERVICE_WORKER.includes("./app.js"), "App is in the PWA asset cache");
  ok(SERVICE_WORKER.includes("./verse_games/shared/bridge.js"),
    "External game bridge is in the PWA asset cache");

  console.log(`Patch 27 duplicate BibloPet unlock routing: ${checks} assertions passed.`);
}

main().catch((error) => {
  console.error("Patch 27 duplicate BibloPet unlock routing FAILED:", error);
  process.exitCode = 1;
});
