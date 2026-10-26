#!/usr/bin/env node
"use strict";
/* Patch 64.1: failsafe navigation and completion-transition instrumentation.
 * UI simulation tests behavior without requiring iOS/WebKit. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function eq(value, expected, message) { assert.equal(value, expected, message); checks++; }
function element(tag = 'div') {
  const listeners = {};
  return {
    tag, hidden: false, disabled: false, children: [], style: {},
    listeners, className: '', textContent: '',
    setAttribute() {}, remove() { this.removed = true; },
    addEventListener(name, fn) { listeners[name] = fn; },
    removeEventListener(name, fn) { if (listeners[name] === fn) delete listeners[name]; },
    focus() {}, querySelector(selector) {
      if (selector === "[data-welcome-back-title]") {
        if (!this.titleButton) this.titleButton = element('button');
        return this.titleButton;
      }
      return null;
    }, appendChild(child) { this.children.push(child); },
    click() { listeners.click?.(); }
  };
}
function scenario() {
  const events = [];
  const listeners = {};
  const docListeners = {};
  const timers = new Map();
  let lastId = 0;
  const doc = {
    hidden: false,
    body: element('body'),
    createElement(tag) { return tag === "div" ? overlay : element(tag); },
    addEventListener(name, fn) { docListeners[name] = fn; },
    removeEventListener(name, fn) { if (docListeners[name] === fn) delete docListeners[name]; },
    dispatch(name) { docListeners[name]?.(); }
  };
  const card = element();
  const action = element('button');
  const status = element('p');
  const overlay = element();
  overlay.hidden = true;
  overlay.querySelector = selector => ({
    '[data-welcome-back-card]': card,
    '[data-welcome-back-action]': action,
    '[data-welcome-back-status]': status
  })[selector] || null;
  doc.body.appendChild = child => { doc.overlay = child; };
  let pausing = 0;
  let exiting = 0;
  let nextRecovery;
  const recoveryResolvers = [];
  const rootWindow = {
    document: doc,
    addEventListener(name, fn) { listeners[name] = fn; },
    removeEventListener(name, fn) { if (listeners[name] === fn) delete listeners[name]; },
    setTimeout(fn, delay) { const id = ++lastId; timers.set(id, {fn, delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    BibloZooAudioDiagnostics: { record: (kind, details) => events.push([kind, details]) },
    BibloZooWelcomeBack: {
      markup: () => '<div></div>', populate: () => {},
      setAction: (root, {retry = false, busy = false} = {}) => {
        action.textContent = retry ? 'Try again!' : "Let's go!";
        action.disabled = busy;
      }
    }
  };
  vm.runInNewContext(read('verse_games/shared/welcome-back-return.js'), {window:rootWindow, Promise, setTimeout});
  const controller = rootWindow.BibloZooWelcomeBackReturn.attach({
    shouldPrompt: () => true,
    onPause: () => pausing++,
    onContinue: () => new Promise(resolve => { nextRecovery = resolve; recoveryResolvers.push(resolve); }),
    onExit: () => exiting++
  });
  const escape = card.children.find(child => child.textContent === 'Back to Games');
  return {
    doc, overlay, action, status, escape, events, timers, controller,
    pause: () => pausing, exitCount: () => exiting,
    goAwayAndBack() { doc.hidden = true; doc.dispatch('visibilitychange'); doc.hidden = false; doc.dispatch('visibilitychange'); },
    resolve: value => nextRecovery(value),
    resolveAt: (index, value) => recoveryResolvers[index]?.(value),
    attempts: () => recoveryResolvers.length,
    showWatchdog() { for (const [id, entry] of [...timers]) if (entry.delay === 7500) { timers.delete(id); entry.fn(); } }
  };
}
async function test() {
  const a = scenario();
  ok(a.controller, 'Welcome Back return controller installs');
  ok(a.overlay.hidden, 'No popup on initial load');
  a.goAwayAndBack();
  eq(a.pause(), 1, 'Only one background pause per return');
  ok(!a.overlay.hidden, 'Shows popup on return');
  ok(a.escape.hidden, 'Escape is not visible during successful standard flow');
  a.action.click();
  ok(a.action.disabled, 'Audio verification is in progress');
  ok(a.escape.hidden, 'Escape stays hidden during short recovery');
  a.resolve(false);
  await Promise.resolve(); await Promise.resolve();
  ok(!a.escape.hidden, 'Failed recovery reveals a way out');
  eq(a.action.textContent, 'Try again!', 'Child can also retry');
  a.escape.click();
  eq(a.exitCount(), 1, 'Escape calls the game-owned navigation callback');
  ok(a.action.disabled, 'Cannot resume gameplay after exit requested');
  a.controller.destroy();
  ok(a.overlay.removed, 'Controller removes popup on teardown');

  const b = scenario();
  b.goAwayAndBack(); b.action.click(); b.showWatchdog();
  ok(!b.escape.hidden, 'Long-running audio recovery reveals the escape');
  eq(b.status.textContent, 'Those sloths are taking their time...', 'Status reports slow recovery in a child-friendly way');
  b.escape.click();
  eq(b.exitCount(), 1, 'The child can leave even if audio promise never settles');
  b.resolve(true);
  await Promise.resolve(); await Promise.resolve();
  ok(!b.overlay.hidden, 'Stale completion after exit cannot dismiss popup');
  b.controller.destroy();

  const c = scenario();
  c.goAwayAndBack(); c.action.click(); c.resolve(true);
  await Promise.resolve(); await Promise.resolve();
  ok(c.overlay.hidden, 'Verified audio resumes ordinary one-button flow');
  ok(c.escape.hidden, 'Escape does not alter successful popup design');
  c.controller.destroy();

  const d = scenario();
  d.goAwayAndBack(); d.action.click();
  eq(d.attempts(), 1, 'First recovery starts');
  d.goAwayAndBack();
  ok(!d.action.disabled, 'New foreground enables a fresh gesture even if older promise hangs');
  d.action.click();
  eq(d.attempts(), 2, 'Second foreground can start a second independent attempt');
  d.resolveAt(0, true);
  await Promise.resolve(); await Promise.resolve();
  ok(!d.overlay.hidden, 'Old recovery cannot dismiss popup after second task switch');
  d.resolveAt(1, true);
  await Promise.resolve(); await Promise.resolve();
  ok(d.overlay.hidden, 'Current recovery can continue after verifying sound');
  d.controller.destroy();

  for (const game of ['verse_scramble_neo','bible_bugs','verse_munch','verse_splat','traffic_tap','foodslice','tower_bible','verse_launch']) {
    const src = read(`verse_games/${game}/game.js`);
    ok(src.includes('onExit: () => { returnSession += 1; window.VerseGameBridge.exitGame(); }'),
      `${game} invalidates in-flight recovery before navigation`);
  }
  const food = read('verse_games/foodslice/game.js');
  for (const stage of ['score-outro-start','final-score-sliced','finish-start','render-completion','title-rendered','menu-mode-select','menu-exit']) {
    ok(food.includes(`"${stage}"`), `Food Slice records ${stage}`);
  }
  ok(food.includes('petUnlock: reward?.petUnlockTriggered === true'),
    'Food Slice reports pet unlock navigation separately from crash');
  ok(read('verse_games/shared/welcome-back.css').includes('.bz-welcome-escape[hidden]'),
    'Escape styling is hidden during ordinary use');
  ok(read('service-worker.js').includes('2026_Oct_26_patch69_1_wacky_recovery'),
    'Offline cache refreshes changed shared files');
  console.log(`Patch 64.1 targeted regression tests passed (${checks} checks).`);
}
test().catch(error => { console.error(error); process.exitCode = 1; });
