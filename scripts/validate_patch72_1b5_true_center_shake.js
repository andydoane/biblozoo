/* Patch 72.1B.5: verify centered, pivot-free Zoo Escape rattles. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../verse_games/shared/welcome-back.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../verse_games/shared/welcome-back-zoo-escape.js'), 'utf8');
let checks = 0;
function ok(cond, msg) { assert.ok(cond, msg); checks++; }
function rule(name) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp('@keyframes\\s+' + safe + '\\s*\\{([\\s\\S]*?)\\n\\}', 'm'));
  ok(!!match, 'missing keyframe: ' + name);
  return match[1];
}
for (const name of ['bzZooShakeEscape','bzZooShakeBreak']) {
  const body = rule(name);
  ok(!/rotate\s*\(/.test(body), name + ': rotation would reintroduce a pivot');
  ok(/translate3d\(/.test(body), name + ': expected 3D translation');
  ok(/0%, 100%/.test(body), name + ': must return to exact rest position');
  ok(/translate3d\(-/.test(body) && /translate3d\(\d/.test(body), name + ': both horizontal directions required');
  ok(/-\d+px, 0\)/.test(body) && /\d+px, 0\)/.test(body), name + ': both vertical directions required');
}
ok(css.includes('animation: bzZooShakeEscape 340ms'), 'Stage 2 timing must remain');
ok(css.includes('animation: bzZooShakeBreak 550ms'), 'Stage 3 timing must remain');
ok(css.includes('.bz-zoo-break-shake {\n  animation: bzZooShakeBreak 550ms'), 'announcement must use same Stage 3 animation');
ok(css.includes('animation: bzZooGroovy 1250ms'), 'preserve GROOVY pop');
ok(js.includes('card.classList.add(cls)'), 'preserve controller shake assignment');
ok(js.includes('shake.className = "bz-zoo-break-shake"'), 'preserve announcement shake layer');
ok(!css.includes('.bz-zoo-firework'), 'fireworks remain removed');
console.log(`PASS Patch 72.1B.5 true-center shake: ${checks} checks`);
