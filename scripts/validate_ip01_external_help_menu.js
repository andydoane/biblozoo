"use strict";
// IP01: menu/help presentation and in-game Back interactions. Exercises real
// shared shell source and Versey Bird / Dino Dash callbacks in a synthetic DOM.
// No fake screenshot is a substitute for owner iPad + iPhone review.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
function segment(source, begin, end) {
  const a = source.indexOf(begin), b = source.indexOf(end, a + begin.length);
  assert.ok(a >= 0 && b > a, "source section missing: " + begin);
  return source.slice(a, b);
}
const shell = read("verse_games/shared/game-shell.js");
const css = read("verse_games/shared/shell.css");
const shellParts =
  segment(shell, "  function helpOverlayHtml(", "  function renderTitleScreen(") +
  segment(shell, "  function gameMenuHtml(", "  // Patch 67: a lightweight adapter");

// All 17 activities use the same stylesheet/menu contract, including phone.
const activities = [
  "verse_games/bible_bugs", "verse_games/dino_dash",
  "verse_games/foodslice", "verse_games/tower_bible",
  "verse_games/traffic_tap", "verse_games/verse_invaders",
  "verse_games/verse_launch", "verse_games/verse_munch",
  "verse_games/verse_scramble_neo", "verse_games/verse_snake",
  "verse_games/verse_splat", "verse_games/versey_bird",
  "verse_playground/ghost_writer", "verse_playground/scripture_scrub",
  "verse_playground/verse_jam", "verse_playground/verse_typer",
  "verse_playground/wheel_of_bible"
];
assert.equal(activities.length, 17);
for (const directory of activities) {
  const html = read(directory + "/index.html");
  assert.match(html, /shared\/shell\.css/, directory + ": shared Help CSS present");
  assert.match(html, /shared\/game-shell\.js/, directory + ": shared Help functions present");
}
// The title and bottom button always use app purple even when games pass
// different local theme vars. No width/media-query override is introduced.
const titleCss = segment(css, ".vm-game-help-title {", ".vm-game-help-body-wrap {");
const actionCss = segment(css, ".vm-game-help-actions .vm-btn {", ".vm-game-help-actions .vm-btn:active");
assert.match(titleCss, /background:\s*var\(--vm-purple\)/);
assert.match(titleCss, /color:\s*#ffffff/);
assert.match(actionCss, /background:\s*var\(--vm-purple\)/);
assert.match(actionCss, /color:\s*#ffffff/);
assert.match(css, /--vm-purple:\s*#7f66c6/);
assert.match(css, /@media \(max-height: 620px\)/);
assert.match(css, /@media \(max-width: 420px\)/);
assert.match(read("verse_playground/wheel_of_bible/game.css"),
  /\.wob-help-copy\s*\{[^}]*text-align:\s*center/s);
const ghost = read("verse_playground/ghost_writer/game.js");
assert.match(ghost, /<div class="ghost-help-copy">[\s\S]*<p>Draw each letter/);
assert.doesNotMatch(segment(ghost, "  function helpHtml() {", "  function nativeUiTapKey()"), /<li|<ul/);
assert.match(read("verse_playground/ghost_writer/game.css"),
  /\.ghost-help-copy\s*\{[^}]*text-align:\s*center/s);
const splat = read("verse_games/verse_splat/game.js");
const helpSplat = segment(splat, "function nonGameHelpHtml(){", "function renderHelpOverlay(){");
for (const sentence of [
  "Tap the bouncing blob with the next word of the verse.",
  "Each splat fills in squares on the board.",
  "Fill in every square to earn a surprise painting!"
]) assert.ok(helpSplat.includes("<p>" + sentence + "</p>"), sentence);
assert.doesNotMatch(helpSplat, /Then tap the Bible book|Keep splatting colorful paint/);
assert.match(splat, /\$\{nonGameHelpHtml\(\)\}<\/div>/);
assert.match(read("verse_games/verse_snake/game.js"),
  /Tap and hold where you want the snake to go\./);
const feed = read("daily_questions_feed_game.js");
assert.match(feed, /return `\$\{control\} to Bounce! Feed your pet the colored snacks!`;/);
assert.doesNotMatch(feed, /\$\{control\} to rebound the white ball/);

function node() {
  const classes = new Set();
  return {
    dataset: {}, attributes: {}, textContent: "", focused: false,
    classList: {
      add: name => classes.add(name), remove: name => classes.delete(name),
      contains: name => classes.has(name)
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    focus() { this.focused = true; },
    blur() {},
    contains() { return false; }
  };
}
const ids = ["menu", "menuHowToBtn", "menuCloseBtn", "menuMuteBtn",
  "menuExitBtn", "menuModeSelectBtn", "menuPill", "help", "helpCloseBtn"];
const elements = Object.fromEntries(ids.map(id => [id, node()]));
const document = { activeElement: null, getElementById: id => elements[id] || null };
const scope = {
  document, window: {},
  escapeHtml: text => String(text),
  isGameMixLaunch: () => false
};
vm.createContext(scope);
vm.runInContext(shellParts +
  "\nthis.shellApi = { gameMenuHtml, wireGameMenu, openHelp, closeHelp };", scope);
scope.window.VerseGameShell = { openHelp: scope.shellApi.openHelp };
const ordinary = scope.shellApi.gameMenuHtml({ id: "menu" });
assert.match(ordinary, /id="menuMuteBtn"/, "other games retain Mute");
assert.match(ordinary, /id="menuHowToBtn"/);
const jamSource = read("verse_playground/verse_jam/game.js");
assert.match(jamSource, /function renderGameMenuOverlay\(\)\s*\{[\s\S]*?showMute:\s*false/);
const jam = scope.shellApi.gameMenuHtml({ id: "menu", showMute: false });
assert.doesNotMatch(jam, /MuteBtn|aria-label="Mute"|aria-label="Unmute"/);
assert.match(jam, /menuHowToBtn|menuModeSelectBtn|menuCloseBtn/);
assert.match(jamSource, /function setMuted\(value\)/,
  "Verse Jam audio/mute internals remain intact");

// Real in-game Help callbacks need to set is-open and Back; merely removing
// hidden leaves the shared CSS modal at display:none on iOS.
for (const [directory, menuId, helpId] of [
  ["verse_games/versey_bird", "vb2GameMenuOverlay", "vb2HelpOverlay"],
  ["verse_games/dino_dash", "dd2GameMenuOverlay", "dd2HelpOverlay"]
]) {
  const game = read(directory + "/game.js");
  const source = segment(game,
    "  function openHelpFromMenu(){", "  function setPaused(");
  const menu = node(), help = node(), helpClose = node(), menuPill = node(),
    howButton = node(), menuClose = node();
  const map = {
    [menuId]: menu, [helpId]: help,
    [helpId + "CloseBtn"]: helpClose,
    [menuId + "HowToBtn"]: howButton,
    [menuId + "CloseBtn"]: menuClose,
    "menuPill": menuPill
  };
  const doc = { activeElement: null, getElementById: id => map[id] || null };
  const s = {
    document: doc,
    MENU_OVERLAY_ID: menuId, HELP_OVERLAY_ID: helpId,
    window: { VerseGameShell: {} },
    escapeHtml: text => String(text),
    isGameMixLaunch: () => false,
    focusedBack: false
  };
  vm.createContext(s);
  vm.runInContext(shellParts + source +
    "\nthis.realOpenHelpFromMenu = openHelpFromMenu;" +
    "\nthis.api = { wireGameMenu, openHelp };", s);
  s.window.VerseGameShell.openHelp = s.api.openHelp;
  s.api.wireGameMenu({
    id: menuId, menuButtonId: "menuPill", helpOverlayId: helpId,
    onHowToPlay: s.realOpenHelpFromMenu,
    onBackFromHelp: () => { s.focusedBack = true; }
  });
  menuPill.onclick({ cancelable: true, preventDefault(){}, stopPropagation(){} });
  assert.equal(menu.classList.contains("is-open"), true);
  howButton.onclick();
  assert.equal(menu.classList.contains("is-open"), false,
    directory + ": menu hidden behind Help");
  assert.equal(menu.attributes["aria-hidden"], "true");
  assert.equal(help.classList.contains("is-open"), true,
    directory + ": Help visible by shared CSS");
  assert.equal(help.attributes["aria-hidden"], "false");
  assert.equal(help.dataset.mode, "back");
  assert.equal(helpClose.textContent, "Back");
  assert.equal(helpClose.focused, true, "focus enters visible Help");
  helpClose.onclick();
  assert.equal(help.classList.contains("is-open"), false);
  assert.equal(menu.classList.contains("is-open"), true,
    directory + ": Back returns to paused menu");
  assert.equal(s.focusedBack, true);
}
console.log("IP01 external How to Play: 17 activity imports, copy/style, Bird/Dino Back, Jam optional Mute PASS");
