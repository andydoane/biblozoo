"use strict";
/* Patch 62 standalone-game lifecycle + shared name-line validation.
 * Deliberately no native session/audio playback is simulated. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
let checks = 0;
function ok(cond, message) { assert.ok(cond, message); checks++; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks++; }
function makeNode() {
  const attrs = {}, map = new Map(), listeners = new Map();
  const node = {
    style: {values: {}, setProperty(key, value) { this.values[key] = value; }},
    hidden: false, disabled: false, textContent: "", innerHTML: "", focusCalls: 0,
    className: "", removed: false, attrs,
    setAttribute(k, v) { attrs[k] = v; },
    getAttribute(k) { return attrs[k] || ""; },
    removeAttribute(k) { delete attrs[k]; },
    get src() { return attrs.src || ""; },
    set src(v) { attrs.src = v; },
    querySelector(k) { return map.get(k) || null; },
    bind(k, item) { map.set(k, item); },
    addEventListener(k, fn) { listeners.set(k, fn); },
    removeEventListener(k, fn) { if (listeners.get(k) === fn) listeners.delete(k); },
    emit(k) { listeners.get(k)?.(); },
    focus() { this.focusCalls++; },
    remove() { this.removed = true; }
  };
  return node;
}
function harness({ profile = {name: "Alexandria", avatarVerseId: "john_3_16"} } = {}) {
  const children = [];
  const button = makeNode(), picture = makeNode(), paw = makeNode();
  const name = makeNode(), nameLine = makeNode(), status = makeNode();
  const overlay = makeNode();
  overlay.bind("[data-welcome-back-action]", button);
  overlay.bind("[data-welcome-back-card]", {appendChild() {}});
  overlay.bind("[data-welcome-back-picture]", picture);
  overlay.bind("[data-welcome-back-picture-fallback]", paw);
  overlay.bind("[data-welcome-back-name]", name);
  overlay.bind("[data-welcome-back-name-line]", nameLine);
  overlay.bind("[data-welcome-back-status]", status);
  const docListeners = new Map(), winListeners = new Map();
  const document = {
    hidden: false,
    body: { appendChild(child) { children.push(child); } },
    createElement(tag) { return tag === "button" ? makeNode() : overlay; },
    addEventListener(k, fn) { docListeners.set(k, fn); },
    removeEventListener(k, fn) { if (docListeners.get(k) === fn) docListeners.delete(k); }
  };
  const window = {
    document, setTimeout, clearTimeout,
    BibloZooProfiles: {
      getProfileById: id => id === "z-1" ? profile : null,
      getActiveProfile: () => ({name: "Wrong User", avatarVerseId: "wrong"}),
      getProfilePictureSrc: id => `profile_pictures/profile_picture_${id}.png`,
      getProfilePictureFallbackSrc: () => "profile_pictures/profile_picture_fallback.png"
    },
    addEventListener(k, fn) { winListeners.set(k, fn); },
    removeEventListener(k, fn) { if (winListeners.get(k) === fn) winListeners.delete(k); }
  };
  const box = {window, Promise};
  vm.runInNewContext(read("verse_games/shared/welcome-back.js"), box);
  vm.runInNewContext(read("verse_games/shared/welcome-back-return.js"), box);
  const blur = () => { document.hidden = true; docListeners.get("visibilitychange")?.(); };
  const focus = () => { document.hidden = false; docListeners.get("visibilitychange")?.(); };
  return {window, overlay, button, picture, paw, name, nameLine, status, blur, focus,
    docListeners, winListeners, children};
}
async function settle() {
  for (let n = 0; n < 5; n++) await Promise.resolve();
}
async function tests() {
  const h = harness();
  const api = h.window.BibloZooWelcomeBack;
  const html = api.markup("game");
  ok(html.includes('data-welcome-back-name-line'), "Shared markup groups username and punctuation");
  ok(/data-welcome-back-name[^>]*>Zookeeper<\/span><span class="bz-welcome-punctuation">!<\/span><\/span>/.test(html),
    "Exclamation follows username inside the same unbreakable element");
  ok(!html.includes('id="learnAudioResumeTitle"'), "Game overlay has its own title ID");
  const css = read("verse_games/shared/welcome-back.css");
  ok(/\.bz-welcome-name-line\s*\{[^}]*white-space:\s*nowrap/s.test(css), "Name and exclamation cannot wrap apart");
  ok(/\.bz-welcome-name\s*\{\s*color:\s*#ffffff/.test(css), "Name is white");
  ok(/\.bz-welcome-punctuation\s*\{\s*color:\s*#333333/.test(css), "Exclamation is charcoal");
  ok(css.includes(".bz-welcome-overlay[hidden]"), "Hidden dialog does not capture taps");

  let playing = false, paused = 0, taps = 0;
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const controller = h.window.BibloZooWelcomeBackReturn.attach({
    shouldPrompt: () => playing,
    onPause: () => paused++,
    onContinue: () => { taps++; return taps === 1 ? gate : true; },
    profileId: "z-1", pictureBase: "../../"
  });
  ok(controller, "Shared controller installed");
  h.window?.BibloZooWelcomeBack?.populate(h.overlay, {profileId: "z-1", pictureBase: "../../"});
  eq(h.name.textContent, "Alexandria", "Uses launched zookeeper, not an unrelated active profile");
  eq(h.picture.src, "../../profile_pictures/profile_picture_john_3_16.png",
    "Standalone avatar resolves from site root");
  eq(h.nameLine.style.values["--bz-welcome-name-size"], "clamp(13px, 4.2vw, 26px)",
    "Longer names receive a smaller line-size ceiling");
  ok(h.overlay.hidden, "Prompt not displayed at app launch");
  h.blur();h.focus();
  ok(h.overlay.hidden, "No prompt when a non-game screen was backgrounded");
  playing = true;
  h.blur();h.blur();
  eq(paused, 1, "Duplicate background notifications pause the activity only once");
  h.focus();h.focus();
  ok(!h.overlay.hidden && controller.isPaused(), "Return prompts and keeps gameplay paused");
  eq(h.button.textContent, "Let's go!", "Child-friendly action");
  eq(h.name.textContent, "Alexandria", "Profile survives reopen");
  h.button.emit("click");h.button.emit("click");
  eq(taps, 1, "Concurrent or repeated taps cannot overlap recovery");
  ok(h.button.disabled, "Button disabled during audio verification");
  finish(false);await settle();
  ok(!h.overlay.hidden, "Failed recovery must not dismiss overlay");
  eq(h.button.textContent, "Try again!", "Failed recovery offers child-friendly retry");
  ok(!h.status.hidden, "Short retry explanation shown only on failure");
  h.button.emit("click");await settle();
  ok(h.overlay.hidden && !controller.isPaused(), "Verified success dismisses prompt");
  eq(taps, 2, "Fresh tap performs fresh recovery");
  h.blur();h.focus();ok(!h.overlay.hidden, "Second task switch shows dialog again");
  controller.destroy();
  ok(h.overlay.removed, "Controller removes overlay when disposed");
  eq(h.docListeners.size, 0, "Document listeners removed");
  eq(h.winListeners.size, 0, "Window listeners removed");

  const game = read("verse_games/verse_scramble_neo/game.js");
  const index = read("verse_games/verse_scramble_neo/index.html");
  const feeding = read("daily_questions_feed_game.js");
  const sw = read("service-worker.js");
  ok(index.includes('href="../shared/welcome-back.css"'), "Scramble loads shared visual design");
  ok(index.includes('src="../shared/welcome-back-return.js"'), "Scramble loads shared lifecycle coordinator");
  ok(index.includes('src="../../profiles.js"'), "Scramble has actual zookeeper identities");
  ok(game.includes('onPause: pauseForTaskSwitch') && game.includes('onContinue: continueFromWelcomeBack'),
    "Scramble wires activity-owned callbacks");
  ok(game.includes('profileId: window.VerseGameBridge.getLaunchParams().profileId'),
    "Scramble uses launched profile identity");
  ok(game.includes('returnPaused = true') && game.includes('clearEasyHint()'),
    "Task switch pauses instructions and removes hint while paused");
  ok(game.includes('app?.classList.add("is-welcome-return-paused")') &&
     read("verse_games/verse_scramble_neo/game.css").includes('animation-play-state: paused !important'),
     "Scramble pauses existing CSS magnet and instruction animations");
  ok(game.includes('gameNow() < deadline') && game.includes('state.bonusDeadline = gameNow()'),
    "Instruction and pointer timers use pause-aware virtual time");
  ok(game.includes('if (returnPaused || state.busy'), "Tile interactions cannot progress while paused");
  ok(game.includes('await waitUntilGameActive()'), "Async game transitions respect pause");
  ok(game.includes('audioClockAdvances(context)') && game.includes('context.currentTime - start >= 0.02'),
    "Scramble verifies actual Web Audio clock progress");
  ok(game.includes('if (returnRecoveryFailures && !returnContextReplacements)'),
    "At most one context replacement, only after another tap");
  ok(game.includes('source: "app"') && game.includes('isCurrent: () =>'),
    "Guarded Patch 60 coordination is available on native iOS only");
  ok(feeding.includes('data-welcome-back-name-line'), "Feeding inherits new color and no-wrap line");
  ok(sw.includes('2026_Oct_25_patch64_1_recovery_escape_diagnostics') &&
     sw.includes('"./verse_games/shared/welcome-back-return.js"'),
     "Service worker version and new resource updated");

  // Boot the real standalone game module far enough to verify the launch API.
  // This catches runtime wiring mistakes that static string checks miss.
  let bound = null;
  const fakeApp = {classList: {add() {},remove() {} }};
  const fakeShell = {
    gameIconImageHtmlForId: () => "",
    shuffle: list => list,
    renderTitleScreen: () => {}
  };
  const fakeBridge = {
    getVerseContext: async () => ({verseId: "",verseText: "",verseRef: ""}),
    getLaunchParams: () => ({profileId: "z-1"})
  };
  const fakeWindow = {
    VerseGameBridge: fakeBridge,
    VerseGameShell: fakeShell,
    BibloZooWelcomeBackReturn: {attach: options => { bound = options; return {}; }},
    addEventListener() {}
  };
  const fakeDoc = {getElementById: () => fakeApp};
  vm.runInNewContext(game, {window: fakeWindow,document: fakeDoc,
    performance: {now: () => 0},setTimeout,clearTimeout,
    fetch: async () => ({ok:true,json:async () => []}),
    requestAnimationFrame() {} });
  await settle();
  ok(bound, "Game actually installs a Welcome Back controller at startup");
  eq(bound.profileId, "z-1", "Actual game startup reads supported getLaunchParams API");
  eq(bound.shouldPrompt(), false, "Intro screen never prompts for game continuation");
  ok(typeof bound.onPause === "function" && typeof bound.onContinue === "function",
     "Game startup registers task-switch and recovery callbacks");

  console.log(`Patch 62 shared Welcome Back validation passed (${checks} checks).`);
}
tests().catch(error => {console.error(error);process.exitCode=1;});
