"use strict";

// R18: static copy-only regression guard. This never reads family/profile data.
// Confirm all 17 external activity help screens still give short, kid-facing
// directions and that the welcome artwork has no version-number pill.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const tick = String.fromCharCode(96);
const cases = {
  "verse_games/bible_bugs/game.js": ["helpHtml"],
  "verse_games/dino_dash/game.js": ["introHelpHtml", "modeHelpHtml", "gameHelpHtml"],
  "verse_games/foodslice/game.js": ["helpHtml"],
  "verse_games/tower_bible/game.js": ["helpHtml"],
  "verse_games/traffic_tap/game.js": ["helpHtml"],
  "verse_games/verse_invaders/game.js": ["helpHtml"],
  "verse_games/verse_launch/game.js": ["helpHtml"],
  "verse_games/verse_munch/game.js": ["introHelpHtml", "modeHelpHtml", "gameHelpHtml"],
  "verse_games/verse_scramble_neo/game.js": ["helpHtml"],
  "verse_games/verse_snake/game.js": ["helpHtml"],
  "verse_games/verse_splat/game.js": ["nonGameHelpHtml"],
  "verse_games/versey_bird/game.js": ["introHelpHtml", "modeHelpHtml", "gameHelpHtml"],
  "verse_playground/ghost_writer/game.js": ["helpHtml"],
  "verse_playground/scripture_scrub/game.js": ["helpHtml"],
  "verse_playground/verse_jam/game.js": ["helpHtml"],
  "verse_playground/verse_typer/game.js": ["helpHtml"],
  "verse_playground/wheel_of_bible/game.js": ["helpHtml"]
};

function file(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), "utf8");
}

function helpBody(source, functionName, relative) {
  const pattern = new RegExp(
    "function\\s+" + functionName + "\\s*\\(\\s*\\)\\s*\\{\\s*return\\s*" + tick,
    "g"
  );
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, relative + ": expected one " + functionName + "()");
  const start = matches[0].index + matches[0][0].length;
  const end = source.indexOf(tick + ";", start);
  assert.ok(end > start, relative + ": unclosed " + functionName + " return template");
  return source.slice(start, end).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const jargon = /\b(decoys?|streaks?|dwell|gameboard|rhythm patter|target vehicle|animation timing)\b/i;
const sameCopyGames = new Set([
  "verse_games/dino_dash/game.js",
  "verse_games/verse_munch/game.js",
  "verse_games/versey_bird/game.js"
]);

let helperCount = 0;
for (const [relative, helperNames] of Object.entries(cases)) {
  const source = file(relative);
  const copies = {};
  for (const helper of helperNames) {
    const body = helpBody(source, helper, relative);
    assert.ok(body.length >= 25 && body.length <= 310,
      relative + " " + helper + ": instructions should be short and useful");
    assert.doesNotMatch(body, jargon,
      relative + " " + helper + ": technical jargon has returned");
    assert.doesNotMatch(body, /Tap\s{2,}to jump/i,
      relative + " " + helper + ": broken jump instructions");
    if (helper !== "modeHelpHtml") {
      assert.match(body, /\bverse\b/i,
        relative + " " + helper + ": explain the verse goal");
    }
    copies[helper] = body;
    helperCount += 1;
  }
  if (sameCopyGames.has(relative)) {
    assert.equal(copies.introHelpHtml, copies.gameHelpHtml,
      relative + ": title and in-game directions must match");
    assert.match(copies.modeHelpHtml, /\bEasy\b.*\bMedium\b.*\bHard\b/i,
      relative + ": difficulty help must name each mode");
  }
}

assert.equal(Object.keys(cases).filter(p => p.startsWith("verse_games/")).length, 12);
assert.equal(Object.keys(cases).filter(p => p.startsWith("verse_playground/")).length, 5);

const splat = file("verse_games/verse_splat/game.js");
assert.ok(splat.includes(
  '<div class="vsp-overlay-copy">' +
  String.fromCharCode(36) + "{nonGameHelpHtml()}</div>"
), "Verse Splat must share its text between title and in-game help");

const app = file("app.js");
const css = file("profiles.css");
assert.ok(!app.includes('class="profile-welcome-version"'),
  "welcome splash must not render a version-number pill");
assert.ok(!css.includes(".profile-welcome-version"),
  "unused welcome version-pill CSS should be removed");
assert.ok(!app.includes('Version 1.15a'),
  "obsolete intro version hint should not be displayed");
assert.ok(app.includes('class="settings-version"'),
  "Settings version information must remain available");
assert.ok(app.includes('const APP_VERSION ='),
  "retain internal app version for Settings");

console.log(
  "R18 How to Play copy PASS: 12 games, 5 playground activities, " +
  helperCount + " help text variants, no welcome version pill"
);
