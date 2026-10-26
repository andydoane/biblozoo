#!/usr/bin/env node
"use strict";
/* Patch 68: Playground registry, shared rotating zoo text, failure escape,
 * guarded musical recovery and suspended wheel scheduling. These tests run
 * without a WebKit device; on-phone music/animation checks are still needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
let checks = 0;
function ok(val, desc) { assert.ok(val, desc); checks += 1; }
function eq(actual, expected, desc) { assert.equal(actual, expected, desc); checks += 1; }
function no(val, desc) { ok(!val, desc); }

function audit() {
  const scope = { window: {} };
  vm.runInNewContext(read('verse_playground/registry.js'), scope);
  const games = scope.window.EXTERNAL_VERSE_PLAYGROUND;
  eq(games.length, 5, 'Exactly five registered Playground activities');
  const wanted = ['ghost_writer', 'scripture_scrub', 'verse_typer', 'verse_jam', 'wheel_of_bible'];
  for (const id of wanted) {
    const entry = games.find(game => game.manifest.id === id);
    ok(entry?.enabled === true, id + ' remains registered and enabled');
    const pre = 'verse_playground/' + id + '/';
    const html = read(pre + 'index.html'), game = read(pre + 'game.js'), css = read(pre + 'game.css');
    for (const dep of [
      '../../profiles.js', '../../verse_games/shared/welcome-back.css',
      '../../verse_games/shared/welcome-back.js', '../../verse_games/shared/welcome-back-return.js',
      '../../verse_games/shared/welcome-back-clock.js',
      '../../verse_games/shared/audio-recovery-coordinator.js',
      '../../verse_games/shared/native-audio-recovery.js',
      '../../verse_games/shared/audio-diagnostics.js']) {
      ok(html.includes(dep), id + ' loads ' + dep);
    }
    ok(html.indexOf('welcome-back-return.js') < html.indexOf('game-shell.js'), id + ' loads shared controller first');
    ok(html.indexOf('game-shell.js') < html.indexOf('./game.js'), id + ' loads game last');
    ok(game.includes('attachPlaygroundWelcomeBack?.('), id + ' uses one shell adapter');
    ok(game.includes('onPause:') && game.includes('onResume:'), id + ' supplies activity-specific hooks');
    ok(game.includes('getAudioContext:') && game.includes('replaceAudioContext:'), id + ' uses guarded recovery');
    no(css.includes('.bz-welcome-card') || css.includes('.bz-welcome-avatar'), id + ' has no duplicate popup CSS');
    no(game.includes('AVAudioSessionCategoryPlayback'), id + ' does not change native audio policy');
  }
  const jam = read('verse_playground/verse_jam/game.js');
  const wheel = read('verse_playground/wheel_of_bible/game.js');
  const shell = read('verse_games/shared/game-shell.js');
  const ctl = read('verse_games/shared/welcome-back-return.js');
  const shared = read('verse_games/shared/welcome-back.js');
  const worker = read('service-worker.js');
  for (const [source, needle, name] of [
    [jam, 'resumeVerseJamAfterInterruption()', 'Jam retains musical phase continuation'],
    [jam, 'state.resumeBeatApproved = true', 'Jam requires explicit gesture approval'],
    [jam, 'startBeatLoop()', 'Jam starts musical clock anew'],
    [jam, 'stopMusic()', 'Jam stops stale scheduled audio'],
    [jam, 'hideResumeBeatOverlay()', 'Jam does not show two interruption overlays'],
    [jam, '!sharedWelcomeEnabled', 'Jam old overlay is fallback only'],
    [jam, 'const decodingContext = audioCtx', 'Jam captures sound decode context'],
    [jam, 'if (audioCtx === decodingContext)', 'Jam rejects stale audio buffers'],
    [jam, 'soundBitLoadPromise = null', 'Jam invalidates old download promises'],
    [jam, 'uiTapBuffers.length = 0', 'Jam clears stale UI audio samples'],
    [wheel, 'gameTimeout(callback, ms)', 'Wheel implements pause-aware scheduled callbacks'],
    [wheel, 'welcomeClock.pause()', 'Wheel pauses virtual clock'],
    [wheel, 'welcomeClock.resume()', 'Wheel resumes virtual clock'],
    [wheel, 'pausedVisualAnimations', 'Wheel pauses existing CSS/WAAPI motion'],
    [wheel, 'wheelSpinPending', 'Wheel retains in-flight wheel result'],
    [wheel, 'if (welcomePaused || document.hidden) return;', 'Wheel refuses progress while away'],
    [wheel, 'state.finalStartedAt = gameNow()', 'Wheel bonus starts on virtual time'],
    [wheel, 'gameNow() - state.finalStartedAt', 'Wheel bonus does not count away time'],
    [wheel, 'getAudioContext: () => audioCtx', 'Wheel verifies active sound clock'],
    [shell, 'const resumed = await options.onResume?.()', 'Shell handles a refused activity resume'],
    [ctl, 'failedAttempts >= 2', 'Two completed failures show final popup'],
    [ctl, 'welcome-back-terminal-recovery', 'Final error is recorded diagnostically'],
    [ctl, 'titleButton?.addEventListener', 'Final error offers a real exit'],
    [ctl, 'attemptSerial += 1', 'Earlier recovery result invalidated'],
    [ctl, 'document.title', 'Error identifies current activity'],
    [shared, 'MESSAGE_INTERVAL_MS = 2500', 'Playful status rotates every 2.5 seconds'],
    [shared, 'new WeakMap()', 'Shared text timer is per card, not global'],
    [shared, 'getMessage', 'Shared Learning overlay uses playful phrases'],
    [worker, '2026_Oct_25_patch68_playground_rhythm_wheel_zoo', 'Service worker revision changes']
  ]) ok(source.includes(needle), name);
  const pre = './verse_playground/';
  for (const id of wanted)
    for (const filename of ['game.js', 'index.html', 'game.css'])
      ok(worker.includes('"' + pre + id + '/' + filename + '"'), id + ' ' + filename + ' is precached');
  const phrases = vm.runInNewContext(shared + '\nwindow.BibloZooWelcomeBack.ZOO_MESSAGES', {window: {}});
  eq(phrases.length, 14, 'Four original and ten new phrases');
  for (const initial of ['Cleaning the zoo...', 'Feeding the hippos...', 'Chasing the monkeys...', 'Waking up the sloths...'])
    ok(phrases.includes(initial), 'Original child message retained: ' + initial);
  eq(new Set(phrases).size, 14, 'No repeated loading phrase');
  no(shared.includes('Getting sound ready...'), 'Shared UI no longer exposes developer-centric status');
  ok(read('verse_games/shared/welcome-back.css').includes('prefers-reduced-motion: reduce'), 'Spinner respects reduced motion');
}

function element(tag = 'div') {
  const handlers = new Map(), selectors = new Map(), attrs = new Map(), classes = new Set();
  return {
    tag, hidden: false, disabled: false, isConnected: true, textContent: '', innerHTML: '',
    style: { setProperty() {} }, children: [],
    classList: { toggle(n,active) { if (active) classes.add(n); else classes.delete(n); }, contains(n) { return classes.has(n); } },
    bind(sel, value) { selectors.set(sel, value); },
    querySelector(sel) { return selectors.get(sel) || null; },
    setAttribute(n,v) { attrs.set(n,v); },
    getAttribute(n) { return attrs.get(n) || null; },
    removeAttribute(n) { attrs.delete(n); },
    appendChild(child) { this.children.push(child); },
    addEventListener(type,callback) { handlers.set(type,callback); },
    removeEventListener(type,callback) { if (handlers.get(type) === callback) handlers.delete(type); },
    fire(type) { handlers.get(type)?.(); },
    focus() { this.focusCount = (this.focusCount || 0) + 1; },
    remove() { this.removed = true; this.isConnected = false; },
    get src() { return attrs.get('src'); },
    set src(v) { attrs.set('src', v); }
  };
}

function controllerScenario() {
  const intervalTimers = new Map(), timeouts = new Map(), logs = [];
  let timerSerial = 0, resumeCount = 0, pauseCount = 0, exitCount = 0;
  const body = element('body'), overlay = element(), card = element(), action = element('button');
  const status = element('p'), escape = element('button'), title = element('button'), activity = element('p');
  overlay.hidden = true;
  card.bind('[data-welcome-back-picture]', null);
  overlay.bind('[data-welcome-back-card]', card);
  overlay.bind('[data-welcome-back-action]', action);
  overlay.bind('[data-welcome-back-status]', status);
  const docHandlers = new Map(), windowHandlers = new Map();
  const document = {
    title: 'Verse Typer', hidden:false, body,
    createElement(tag) {
      if (tag === 'div') return overlay;
      if (tag === 'section') {
        const oops = element('section');
        oops.bind('[data-welcome-back-title]', title);
        oops.bind('[data-welcome-back-activity]', activity);
        return oops;
      }
      if (tag === 'button') return escape;
      return element(tag);
    },
    addEventListener(type, cb) {docHandlers.set(type,cb);},
    removeEventListener(type,cb) {if(docHandlers.get(type)===cb) docHandlers.delete(type);}
  };
  const window = {
    document, setInterval(fn,ms) { const id=++timerSerial;intervalTimers.set(id,{fn,ms});return id; },
    clearInterval(id) {intervalTimers.delete(id);},
    setTimeout(fn,ms) {const id=++timerSerial;timeouts.set(id,{fn,ms});return id;},
    clearTimeout(id) {timeouts.delete(id);},
    BibloZooAudioDiagnostics: {record(name,details){logs.push({name,details});}},
    addEventListener(type,cb){windowHandlers.set(type,cb);},
    removeEventListener(type,cb){if(windowHandlers.get(type)===cb)windowHandlers.delete(type);},
  };
  const scope={window,document,Promise,setTimeout};
  vm.runInNewContext(read('verse_games/shared/welcome-back.js'),scope);
  vm.runInNewContext(read('verse_games/shared/welcome-back-return.js'),scope);
  body.appendChild = child => {child.isConnected = true;body.children.push(child);};
  let nextResolve;
  const resolves=[];
  const ctl=window.BibloZooWelcomeBackReturn.attach({
    shouldPrompt: () => true,
    onPause:()=>pauseCount++,
    onContinue:()=>new Promise(resolve=>{nextResolve=resolve;resolves.push(resolve);}),
    onExit:()=>exitCount++,
    preserveFocus:true
  });
  const oopsCard=overlay.children.find(ch=>ch.tag==='section');
  function awayBack(){document.hidden=true;docHandlers.get('visibilitychange')?.();document.hidden=false;docHandlers.get('visibilitychange')?.();}
  return {window,document,ctl,overlay,card,action,status,escape,title,activity,oopsCard,logs,
    intervalTimers,timeouts,resolves,awayBack,
    resolve(ok){nextResolve(ok);},
    pauseCount:()=>pauseCount,exitCount:()=>exitCount,
    nextMessage(){const timer=[...intervalTimers.values()][0];timer?.fn();}
  };
}
async function microtasks() { for(let i=0;i<6;i++)await Promise.resolve(); }
async function verifyReturn() {
  const a=controllerScenario();
  ok(a.ctl,'Controller attaches');
  ok(a.overlay.hidden,'No popup before interruption');
  a.awayBack();
  eq(a.pauseCount(),1,'Background lifecycle pauses once');
  no(a.overlay.hidden,'Popup shown on foreground');
  eq(a.action.textContent,"Let's go!",'Original main action retained');
  ok(a.escape.hidden,'Escape hidden in normal flow');
  ok(a.oopsCard.hidden,'Fatal popup hidden in normal flow');
  a.action.fire('click');
  ok(a.card.classList.contains('is-recovering'),'Portrait spins after tap');
  ok(a.action.disabled,'Repeated taps blocked while pending');
  const first=a.status.textContent;
  ok(first.endsWith('...'),'First zoo phrase is displayed');
  a.nextMessage();
  ok(a.status.textContent !== first,'Zoo status advances between phrases');
  eq(a.intervalTimers.size,1,'Exactly one rotating message timer');
  a.action.fire('click');
  eq(a.resolves.length,1,'Rapid second tap is ignored');
  a.resolve(false);await microtasks();
  no(a.card.classList.contains('is-recovering'),'Portrait stops on failure');
  eq(a.intervalTimers.size,0,'Message timer is cleared on failure');
  ok(!a.escape.hidden,'First failure retains safe navigation escape');
  ok(a.oopsCard.hidden,'First failure offers a retry, not terminal popup');
  eq(a.action.textContent,'Try again!','First failure offers Try again');
  eq(a.exitCount(),0,'Failed audio never auto-exits');
  a.action.fire('click'); a.resolve(false);await microtasks();
  ok(a.card.hidden,'Terminal error replaces normal card');
  no(a.oopsCard.hidden,'Second failure shows Oops card');
  eq(a.activity.textContent,'Verse Typer','Activity identity is displayed');
  ok(a.title.disabled===false,'Back to Title remains actionable');
  eq(a.exitCount(),0,'Terminal error never auto-navigates');
  ok(a.logs.some(x=>x.name==='welcome-back-terminal-recovery'),'Terminal failure diagnosed');
  a.action.fire('click');eq(a.resolves.length,2,'Terminal popup blocks extra audio attempts');
  a.title.fire('click');eq(a.exitCount(),1,'Back to Title invokes existing bridge route');
  a.ctl.destroy();ok(a.overlay.removed,'Controller disposes cleanly');

  const b=controllerScenario();
  b.awayBack();b.action.fire('click');b.resolve(false);await microtasks();
  b.action.fire('click');b.resolve(true);await microtasks();
  ok(b.overlay.hidden,'Successful second attempt closes prompt');
  no(b.card.classList.contains('is-recovering'),'Spinner stops on success');
  ok(b.oopsCard.hidden,'Successful recovery never opens terminal popup');
  b.ctl.destroy();

  const c=controllerScenario();
  c.awayBack();c.action.fire('click');
  c.awayBack();
  ok(c.intervalTimers.size===0,'Second interruption stops old rotating message');
  c.action.fire('click');
  c.resolves[0](false);await microtasks();
  no(c.overlay.hidden,'Stale failed result cannot dismiss newer popup');
  c.resolves[1](true);await microtasks();
  ok(c.overlay.hidden,'Current recovery succeeds after second interruption');
  c.ctl.destroy();
}

function testWheelClock() {
  const src=read('verse_playground/wheel_of_bible/game.js');
  const first=src.indexOf('  let playgroundWelcome = null;');
  const end=src.indexOf('  let smartVerseRowsCacheKey',first);
  ok(first>=0 && end>first,'Wheel pause scheduler source is locatable');
  const code=src.slice(first,end);
  let wall=1000, nextId=0, fired=0, animPaused=0, animPlayed=0;
  const timers=new Map();
  const animation={ playState:'running', pause(){animPaused++}, play(){animPlayed++} };
  const context={
    performance:{now:()=>wall},
    document:{hidden:false},
    app:{getAnimations:()=>[animation]},
    verseAudioEl:null,
    window:{
      performance:{now:()=>wall},
      setTimeout(fn,ms){const id=++nextId;timers.set(id,{fn,when:wall+ms});return id;},
      clearTimeout(id){timers.delete(id);},
      BibloZooWelcomeBackClock:{create(){let pauseAt=0,pausedTotal=0,paused=false;return {
        now(){return (paused?pauseAt:wall)-pausedTotal;},
        pause(){if(!paused){pauseAt=wall;paused=true;}},
        resume(){if(paused){pausedTotal+=wall-pauseAt;paused=false;}}
      };}}
    }
  };
  vm.runInNewContext(code + `\nthis.api={gameNow,gameTimeout,pauseWheelForReturn,resumeWheelAfterReturn,
    getPaused:()=>welcomePaused, getTimerCount:()=>gameTimers.size};`,context);
  function advance(ms){wall+=ms;for(const [id,t] of [...timers])if(t.when<=wall){timers.delete(id);t.fn();}}
  const a=context.api;
  eq(a.gameNow(),1000,'Wheel virtual clock starts at wall clock');
  a.gameTimeout(()=>fired++,3300);
  a.gameTimeout(()=>fired+=100,5000);
  advance(1000);eq(fired,0,'Spin has not finished before deadline');
  a.pauseWheelForReturn();
  ok(a.getPaused(),'Wheel pauses during interruption');
  eq(animPaused,1,'Wheel CSS/WebAnimations paused');
  advance(3600000);
  eq(fired,0,'One hour away produces no callback or prize');
  eq(a.gameNow(),2000,'One hour away does not advance game clock');
  a.resumeWheelAfterReturn();
  no(a.getPaused(),'Wheel resumes only after acknowledgement');
  eq(animPlayed,1,'Wheel existing animations resume');
  advance(2299);eq(fired,0,'Spin still has 2300ms remaining after return');
  advance(1);eq(fired,1,'Original spin callback fires exactly once');
  a.pauseWheelForReturn();advance(300000);eq(fired,1,'Another task switch cannot advance remaining gameplay');
  a.resumeWheelAfterReturn();advance(1700);eq(fired,101,'Delayed second award resumes with original remaining time');
  eq(a.getTimerCount(),0,'All finished wheel timers are removed');
}

(async()=>{audit();await verifyReturn();testWheelClock();console.log(`Patch 68 Playground + playful recovery: ${checks} checks passed.`);})().catch(error=>{console.error(error);process.exitCode=1;});
