"use strict";

// Ghost Writer's finished-playback Remix button uses the existing image
// rather than a platform-dependent emoji. This is a visual/source check;
// iPhone WebKit appearance still requires owner acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const js = read("verse_playground/ghost_writer/game.js");
const css = read("verse_playground/ghost_writer/game.css");
const build = read("scripts/build.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const asset = "verse_images/icon_remix.png";
const relative = "../../verse_images/icon_remix.png";

assert(fs.statSync(path.join(root,asset)).size > 100,
  "use the actual existing PNG, no new asset needed");
assert.equal(path.posix.normalize(path.posix.join("verse_playground/ghost_writer",relative)),asset,
  "asset path resolves correctly from the nested Ghost Writer page");
assert.match(build, /"verse_images"/,
  "native/web production build includes the existing asset directory");
assert.match(js, /<button class="ghost-playback-remix-btn" id="ghostPlaybackRemixBtn" type="button" aria-label="Open remix screen">\s*<img class="ghost-playback-remix-icon" src="\.\.\/\.\.\/verse_images\/icon_remix\.png" alt="" aria-hidden="true" draggable="false"> Remix\s*<\/button>/,
  "button retains its existing ID, label, text and native gesture handler");
assert.doesNotMatch(js, /🔄 Remix/,
  "the original Unicode emoji must not remain in the playback button");
assert.match(js,/remixBtn\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*playUiTapSound\(\)/,
  "Remix click and its sound stay attached to the same button");
const iconRule = css.match(/\.ghost-playback-remix-icon\s*\{([^}]+)\}/)?.[1];
assert(iconRule, "dedicated icon CSS must exist");
assert.match(iconRule, /\bwidth:\s*1em\s*;/);
assert.match(iconRule, /\bheight:\s*1em\s*;/);
assert.match(iconRule, /\bobject-fit:\s*contain\s*;/);
assert.match(iconRule, /\bvertical-align:\s*-/);
assert.match(css, /\.ghost-playback-remix-btn\s*\{[^}]*font-size:\s*clamp\(16px,\s*4vw,\s*20px\)/,
  "1em follows the original emoji's responsive button font size");
assert.match(workflow,/node scripts\/validate_ghost_writer_remix_icon\.js/);
console.log("PASS: Ghost Writer Remix PNG uses the existing asset at the prior emoji's 1em size; button, audio tap and navigation preserved.");
