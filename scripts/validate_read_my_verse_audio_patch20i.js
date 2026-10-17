/* Patch 20I: JS regression harness + static Swift registration/resource checks.
 * Native AVAudioPlayer cannot run here; Xcode/device verification is required. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rootDir = path.join(__dirname, '..');
const text = fs.readFileSync(path.join(rootDir, 'read_my_verse.js'), 'utf8');
const swift = fs.readFileSync(path.join(rootDir, 'ios/App/App/SceneDelegate.swift'), 'utf8');
const diag = fs.readFileSync(path.join(rootDir, 'verse_games/shared/verse-crawl-audio-diagnostics-20f.js'), 'utf8');
const sw = fs.readFileSync(path.join(rootDir, 'service-worker.js'), 'utf8');
function slice(from, to) {
  const a = text.indexOf(from); const b = text.indexOf(to, a);
  assert(a >= 0 && b > a, `Expected helper boundaries ${from}/${to}`);
  return text.slice(a, b);
}
const nativeHelpers = slice('  const crawlDiag = root?.BibloZooCrawlDiagnostics;', '  function crawlTrace(');
const clockReady = slice('  function readCrawlMusicClockReady(song) {', '  // Patch 20G');
const musicFunctions = slice('  function startCrawlMusic(reason = "unspecified") {', '  function waitForCrawlFanfare(');
assert.match(text, /if \(nativeCrawlDevice\) \{\s*startNativeCrawlMusic\(reason\)/);
assert.match(text, /song\.nativeEngine \|\| !!song\.gain/);
assert.match(text, /if \(song\?\.nativeEngine\) return checkNativeCrawlMusicReady\(song\)/);
assert.match(text, /if \(music\.nativeEngine\) \{\s*void nativeCrawlCall\("fade"/);
assert.match(text, /if \(music\.nativeEngine\) \{\s*music\.audio\.stop\(\)/);
assert.match(diag, /engine: music\.engine \|\| "web-audio-gain"/);
assert.match(sw, /patch20i_native_audio_engine/);
assert.match(sw, /verse-crawl-audio-diagnostics-20f\.js/);
assert.match(sw, /verse_crawl_theme\.mp3/);
assert.match(swift, /class BibloZooCrawlAudio20I: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate/);
assert.match(swift, /registerPluginInstance\(BibloZooCrawlAudio20I\(\)\)/);
assert.match(swift, /Bundle\.main\.url\(forResource: "verse_crawl_theme"/);
assert.match(swift, /subdirectory: "public\/verse_images\/read_my_verse"/);
assert.match(swift, /AVAudioSession\.interruptionNotification/);
assert.match(swift, /willResignActiveNotification/);
assert.match(swift, /if requested == self\.token \{ self\.stopActive/);
assert.match(swift, /current\.setVolume\(Float\(target\), fadeDuration: seconds\)/);
assert.doesNotMatch(swift, /window\.webkit\.messageHandlers/);

function createHarness({ unavailable = false, badStart = false, neverProgress = false } = {}) {
  const events = [], calls = [], active = new Map();
  let lastSeq = 0;
  const reply = (token, playing = true) => ({ engine: 'native-av-audio-player-20i',
    token, tokenMatched: playing, playing, position: neverProgress ? 0 : 0.15,
    duration: 32, volume: 1, events: [{ sequence: ++lastSeq, type: 'native-mock', token }] });
  const plugin = {
    start({ token }) { calls.push(['start', token]); active.set(token, true);
      if (badStart) return Promise.reject(new Error('native player rejected'));
      return Promise.resolve(reply(token)); },
    status({ token }) { calls.push(['status', token]);
      return Promise.resolve(reply(token, active.has(token))); },
    pause({ token }) { calls.push(['pause', token]); return Promise.resolve(reply(token)); },
    fade({ token, target, durationMs }) { calls.push(['fade', token, target, durationMs]);
      return Promise.resolve(reply(token)); },
    stop({ token }) { calls.push(['stop', token]); active.delete(token);
      return Promise.resolve(reply(token, false)); }
  };
  const root = {
    Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios',
      Plugins: unavailable ? {} : { BibloZooCrawlAudio20I: plugin } },
    document: { hidden: false }, setTimeout(fn) { setImmediate(fn); }
  };
  const g = { root, Promise, Date, setTimeout, clearTimeout,
    appApi: { isMuted: () => false },
    crawlMusic: null,
    crawlTrace(type, data) { events.push({ type, data }); }
  };
  root.BibloZooCrawlDiagnostics = {
    nextId: (() => { let i = 0; return () => `test-${++i}`; })(),
    detail(e) { return { errorName: e?.name || 'Error' }; },
    snapshot(m) { return { engine: m?.engine || 'none' }; },
    record(type, data) { events.push({ type, data }); }
  };
  vm.createContext(g);
  vm.runInContext(`${nativeHelpers}\n${clockReady}\n${musicFunctions}`, g);
  return { g, root, calls, events, plugin };
}
const flush = () => new Promise(r => setImmediate(r));
(async () => {
  let count = 0;
  {
    const t = createHarness();
    t.g.startCrawlMusic('restart');
    const song = t.g.crawlMusic;
    assert(song.nativeEngine, 'native engine is selected');
    assert(!song.context && !song.gain, 'native path creates no Web Audio graph');
    assert.equal(await song.startPromise, true);
    assert.equal(await t.g.readCrawlMusicClockReady(song), true);
    assert(t.events.some(e => e.type === 'crawl-native-clock-check-passed'));
    assert(t.calls.some(e => e[0] === 'start'));
    count++;
  }
  {
    const t = createHarness();
    t.g.startCrawlMusic('activity-launch');
    const song = t.g.crawlMusic;
    await song.startPromise;
    t.g.fadeCrawlMusic(0.22, 1350);
    t.g.fadeCrawlMusic(0, 1700);
    await flush();
    assert(t.calls.some(e => e[0] === 'fade' && e[2] === .22 && e[3] === 1350));
    assert(t.calls.some(e => e[0] === 'fade' && e[2] === 0));
    count++;
  }
  {
    const t = createHarness();
    t.g.startCrawlMusic('restart');
    const song = t.g.crawlMusic;
    await song.startPromise;
    song.audio.pause();
    assert(song.audio.paused);
    await flush();
    assert(t.calls.some(e => e[0] === 'pause'));
    await t.g.stopCrawlMusic();
    assert.equal(t.g.crawlMusic, null);
    assert(t.calls.some(e => e[0] === 'stop'));
    count++;
  }
  {
    const t = createHarness({ unavailable: true });
    t.g.startCrawlMusic('restart');
    const song = t.g.crawlMusic;
    assert.equal(await song.startPromise, false);
    assert(song.failed && song.unavailable);
    assert(t.events.some(e => e.type === 'crawl-native-engine-selected' && !e.data.pluginAvailable));
    count++;
  }
  {
    const t = createHarness({ badStart: true });
    t.g.startCrawlMusic('restart');
    assert.equal(await t.g.crawlMusic.startPromise, false);
    assert(t.events.some(e => e.type === 'native-start-rejected'));
    count++;
  }
  {
    const t = createHarness({ neverProgress: true });
    t.g.startCrawlMusic('restart');
    const song = t.g.crawlMusic;
    await song.startPromise;
    assert.equal(await t.g.readCrawlMusicClockReady(song), false);
    assert(t.events.some(e => e.type === 'crawl-native-clock-check-failed'));
    count++;
  }
  {
    const t = createHarness();
    t.g.startCrawlMusic('restart');
    const song = t.g.crawlMusic;
    await song.startPromise;
    t.root.document.hidden = true;
    assert.equal(await t.g.readCrawlMusicClockReady(song), false);
    count++;
  }
  {
    const t = createHarness();
    t.g.startCrawlMusic('first');
    const song1 = t.g.crawlMusic;
    await song1.startPromise;
    await t.g.stopCrawlMusic();
    t.g.startCrawlMusic('second');
    const song2 = t.g.crawlMusic;
    assert.notEqual(song1.diagId, song2.diagId);
    assert.equal(await song2.startPromise, true);
    assert(t.calls.some(e => e[0] === 'stop' && e[1] === song1.diagId));
    assert(t.events.some(e => e.type === 'crawl-native-start-readiness' && e.data.ready));
    count++;
  }
  console.log(`Patch 20I: ${count} native JS mock/static integration checks passed`);
})().catch(e => { console.error(e); process.exitCode = 1; });
