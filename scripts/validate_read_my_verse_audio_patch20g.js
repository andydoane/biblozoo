/* Patch 20G Node regression harness. Tests the real extracted recovery helper
 * with deterministic mock AudioContexts; not a substitute for iPhone testing. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '..', 'read_my_verse.js'), 'utf8');
const first = code.indexOf('  async function repairFrozenCrawlMusicClock(');
const last = code.indexOf('\n  function resumeReadAudioFromGesture()', first);
assert(first > 0 && last > first, 'Patch 20G helper exists');
const helper = code.slice(first, last);
assert.match(code, /ready = await repairFrozenCrawlMusicClock\(song, recovery, generation\)/);
assert.match(code, /song\.audio\.currentTime = 0;/);
assert.match(code, /song\?\.context\?\.state === "running"/);
assert.match(code, /if \(!ready \|\| root\?\.document\?\.hidden\)/);
assert.match(code, /target, durationMs/); // unchanged fade API

function makeCase({ clockAdvances = true, suspendRejects = false, invalidateDuringSuspend = false } = {}) {
  const events = [];
  const ctx = {
    state: 'running', currentTime: 0, suspends: 0, resumes: 0,
    suspend() {
      this.suspends += 1;
      if (suspendRejects) return Promise.reject(new Error('test suspend rejected'));
      this.state = 'suspended';
      if (invalidateDuringSuspend) globals.root.document.hidden = true;
      return Promise.resolve();
    },
    resume() {
      this.resumes += 1;
      this.state = 'running';
      if (clockAdvances) this.currentTime = 0.03;
      return Promise.resolve();
    }
  };
  const song = { context: ctx, gain: {}, audio: { currentTime: .4 } };
  const recovery = { kind: 'animated' };
  const globals = {
    Promise,
    root: { document: { hidden: false } },
    crawlMusic: song,
    readAudioRecovery: recovery,
    readAudioRecoveryGeneration: 2,
    crawlDiag: {
      snapshot(music) { return { clock: music?.context?.currentTime, state: music?.context?.state }; },
      detail(e) { return { errorName: e?.name, errorMessage: String(e?.message) }; }
    },
    crawlTrace(type, data) { events.push({ type, data }); },
    waitReadRecoveryResult(promise) { return Promise.resolve(promise).then(x => x !== false, () => false); },
    readCrawlMusicClockReady(music) { return Promise.resolve(music.context.state === 'running' && music.context.currentTime > .012); },
    setTimeout(fn, ms) { assert.equal(ms, 250); fn(); return 1; }
  };
  vm.createContext(globals);
  vm.runInContext(helper, globals);
  return { globals, ctx, song, recovery, events };
}

(async () => {
  {
    const t = makeCase();
    assert.equal(await t.globals.repairFrozenCrawlMusicClock(t.song, t.recovery, 2), true);
    assert.equal(t.ctx.suspends, 1);
    assert.equal(t.ctx.resumes, 1);
    assert(t.events.some(e => e.type === 'crawl-clock-repair-finished' && e.data.ready === true));
  }
  {
    const t = makeCase({ clockAdvances: false });
    assert.equal(await t.globals.repairFrozenCrawlMusicClock(t.song, t.recovery, 2), false);
    assert.equal(t.ctx.suspends, 1);
    assert.equal(t.ctx.resumes, 1);
    assert(t.events.some(e => e.type === 'crawl-clock-repair-finished' && e.data.ready === false));
  }
  {
    const t = makeCase({ suspendRejects: true });
    assert.equal(await t.globals.repairFrozenCrawlMusicClock(t.song, t.recovery, 2), false);
    assert.equal(t.ctx.resumes, 0);
  }
  {
    const t = makeCase({ invalidateDuringSuspend: true });
    assert.equal(await t.globals.repairFrozenCrawlMusicClock(t.song, t.recovery, 2), false);
    assert.equal(t.ctx.resumes, 0, 'Do not resume after interruption');
  }
  {
    const t = makeCase();
    assert.equal(await t.globals.repairFrozenCrawlMusicClock(t.song, t.recovery, 3), false);
    assert.equal(t.ctx.suspends, 0, 'Do not revive stale generations');
  }
  console.log('Patch 20G: 5 recovery regression cases passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
