/* Patch 20H regression checks: exercise the actual original-context helper.
 * Mock timing/context states do not simulate WebKit or prove iPhone audibility. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname, '..', 'read_my_verse.js'), 'utf8');
const from = text.indexOf('  function restoreOriginalCrawlFromGesture(');
const to = text.indexOf('  // Verse Crawl intentionally restarts', from);
assert(from > 0 && to > from, '20H helper exists');
const helper = text.slice(from, to);
assert.match(text, /restoreOriginalCrawlFromGesture\(recovery, generation\)/);
assert.match(text, /!recovery\.crawlOriginalPrepared/);
assert.match(text, /return restartInterruptedCrawlFromGesture\(recovery, generation\)/);
assert.match(text, /crawlOriginalClosePromise = Promise\.resolve\(stopCrawlMusic\(\)\)/);
assert.match(text, /const closing = music\.context\.close\?\.\(\)/);
assert.match(text, /Original audio recovered and closed/);
assert.match(text, /Original audio is still interrupted or frozen/);
assert.match(text, /▶ Restore Original Audio/);
assert.match(text, /▶ Restart Verse Crawl/);
const flush = () => new Promise(resolve => setImmediate(resolve));
function makeCase({ initialState = 'interrupted', recovered = true, rejectResume = false,
  stale = false, hangClose = false, throwResume = false } = {}) {
  const events = [];
  let resolveClose;
  const deferredClose = new Promise(resolve => { resolveClose = resolve; });
  const context = {
    state: initialState, currentTime: initialState === 'running' ? .5 : .3,
    resumes: 0, closeCount: 0,
    resume() {
      this.resumes++;
      if (throwResume) throw new Error('threw');
      if (rejectResume) return Promise.reject(new Error('denied'));
      this.state = 'running';
      if (stale) g.readAudioRecoveryGeneration++;
      return Promise.resolve();
    }
  };
  const song = { context, audio: { paused: true }, diagId: 'm1' };
  const recovery = { kind: 'animated', error: '' };
  const g = {
    root: { document: { hidden: false } }, Promise,
    state: { activityId: 'star_wars', phase: 'animating' },
    VERSE_CRAWL_ACTIVITY_ID: 'star_wars', completionReported: false,
    crawlMusic: song, readAudioRecovery: recovery,
    readAudioRecoveryAttempt: { generation: 9 }, readAudioRecoveryGeneration: 9,
    crawlDiag: { snapshot(music) { return { state: music?.context?.state || null }; },
      detail(e) { return { errorName: e?.name || '' }; } },
    crawlTrace(type, data) { events.push({ type, data }); },
    syncReadAudioOverlay() {},
    waitReadRecoveryResult(p, ms) {
      // Simulate a timeout for a still-pending close() without hanging tests.
      if (hangClose && p === recovery.crawlOriginalClosePromise && !g.allowClose) return Promise.resolve(false);
      return Promise.resolve(p).then(v => v !== false, () => false);
    },
    readCrawlMusicClockReady(music) {
      if (recovered && music.context.state === 'running') {
        music.context.currentTime += .06; return Promise.resolve(true);
      }
      return Promise.resolve(false);
    },
    stopCrawlMusic() {
      context.closeCount++;
      g.crawlMusic = null;
      return hangClose ? deferredClose : Promise.resolve(true);
    }
  };
  vm.createContext(g);
  vm.runInContext(helper, g);
  return { g, context, recovery, song, events, resolveClose };
}
(async () => {
  let count = 0;
  {
    const t = makeCase();
    assert.equal(t.g.restoreOriginalCrawlFromGesture(t.recovery, 9), true);
    await flush(); await flush();
    assert.equal(t.context.resumes, 1, 'interrupted original resumes on first gesture');
    assert.equal(t.context.closeCount, 1);
    assert.equal(t.recovery.crawlOriginalPrepared, true);
    assert.equal(t.g.crawlMusic, null);
    assert(t.events.some(e => e.type === 'crawl-original-restore-verified'));
    count++;
  }
  {
    const t = makeCase({ initialState: 'running' });
    assert.equal(t.g.restoreOriginalCrawlFromGesture(t.recovery, 9), true);
    await flush(); await flush();
    assert.equal(t.context.resumes, 0, 'already-running original only checked');
    assert.equal(t.recovery.crawlOriginalPrepared, true); count++;
  }
  {
    const t = makeCase({ recovered: false });
    t.g.restoreOriginalCrawlFromGesture(t.recovery, 9);
    await flush(); await flush();
    assert.equal(t.context.closeCount, 0, 'frozen original not discarded');
    assert.equal(t.recovery.crawlOriginalPrepared, undefined);
    assert.match(t.recovery.error, /still interrupted or frozen/);
    assert.equal(t.g.readAudioRecoveryAttempt, null); count++;
  }
  {
    const t = makeCase({ rejectResume: true });
    t.g.restoreOriginalCrawlFromGesture(t.recovery, 9);
    await flush(); await flush();
    assert.equal(t.context.closeCount, 0);
    assert.equal(t.recovery.crawlOriginalPrepared, undefined); count++;
  }
  {
    const t = makeCase({ throwResume: true });
    t.g.restoreOriginalCrawlFromGesture(t.recovery, 9);
    await flush(); await flush();
    assert.equal(t.context.closeCount, 0);
    assert(t.events.some(e => e.type === 'crawl-original-resume-threw')); count++;
  }
  {
    const t = makeCase({ stale: true });
    t.g.restoreOriginalCrawlFromGesture(t.recovery, 9);
    await flush(); await flush();
    assert.equal(t.context.closeCount, 0, 'stale process must not close');
    assert.equal(t.g.readAudioRecoveryAttempt?.generation, 9, 'stale callback does not mutate newer state'); count++;
  }
  {
    const t = makeCase({ hangClose: true });
    t.g.restoreOriginalCrawlFromGesture(t.recovery, 9);
    await flush(); await flush();
    assert.equal(t.recovery.crawlOriginalPrepared, false);
    assert.equal(t.context.closeCount, 1);
    assert.match(t.recovery.error, /still closing/);
    t.g.allowClose = true;
    t.resolveClose(true);
    t.g.readAudioRecoveryAttempt = { generation: 9 };
    t.g.restoreOriginalCrawlFromGesture(t.recovery, 9);
    await flush(); await flush();
    assert.equal(t.recovery.crawlOriginalPrepared, true);
    assert.equal(t.context.closeCount, 1, 'no duplicate close'); count++;
  }
  {
    const t = makeCase();
    t.g.root.document.hidden = true;
    assert.equal(t.g.restoreOriginalCrawlFromGesture(t.recovery, 9), false);
    assert.equal(t.context.resumes, 0); count++;
  }
  console.log(`Patch 20H: ${count} original-context preflight regression cases passed`);
})().catch(err => { console.error(err); process.exitCode = 1; });
