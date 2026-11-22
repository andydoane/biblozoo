#!/usr/bin/env node
"use strict";
/* IP04/IP05 owner follow-up: actual Wheel final missing-letter modal DOM,
 * bounded Final Round pill, and untouched gesture-owned audio handoff.
 * Real Apple iPad/iPhone layout and native recovery still need owner testing. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const wheel=read("verse_playground/wheel_of_bible/game.js");
const css=read("verse_playground/wheel_of_bible/game.css");
const zoo=read("verse_games/shared/welcome-back-zoo-escape.js");
const host=read("verse_games/shared/welcome-back-return.js");
const feedCss=read("daily_questions_feed_game.css");
const readCss=read("read_my_verse.css");

const pill=css.match(/\.wob-final-intro-subtitle\s*\{([^}]+)\}/)?.[1]||"";
assert.match(pill,/width:\s*max-content/);
assert.match(pill,/max-width:\s*min\(92%,\s*500px\)/);
assert.match(pill,/padding:\s*8px 16px/);
assert.match(pill,/overflow-wrap:\s*break-word/);
assert.match(css,/\.wob-final-intro-panel\s*\{[^}]*width:\s*100%/s);
assert.match(css,/\.wob-final-modal\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*z-index:\s*50;/s);
assert.match(css,/\.wob-root\s*\{[^}]*position:\s*relative;[^}]*height:\s*100dvh;[^}]*width:\s*100%;/s);

const begin=wheel.indexOf("  function renderFinalModal() {");
const end=wheel.indexOf("  function finalWordHtml(active) {",begin);
assert.ok(begin>0 && end>begin);
const modalSource=wheel.slice(begin,end);
assert.match(modalSource,/document\.querySelector\("\.wob-root"\)\?\.appendChild\(modal\)/);
assert.doesNotMatch(modalSource,/document\.querySelector\("\.wob-card"\)\?\.appendChild\(modal\)/);
const full={
  children:[],
  appendChild(el){if(el.parentNode)el.remove();this.children.push(el);el.parentNode=this;}
};
const card={children:[],appendChild(){throw Error("Must not clip final modal to card");}};
const buttons=[],calls=[]; let activeModal=null; let letterCount=0;
const doc={
  createElement(tag){
    assert.equal(tag,"div");
    const button={dataset:{"finalChoice":"X"}};
    const el={className:"",id:"",innerHTML:"",parentNode:null,
      querySelectorAll(sel){assert.equal(sel,"[data-final-choice]");return [button];},
      remove(){
        if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);
        this.parentNode=null;
        if(activeModal===this)activeModal=null;
      }};
    buttons.push(button);
    return el;
  },
  getElementById(id){assert.equal(id,"wobFinalModal");return activeModal;},
  querySelector(sel){return sel===".wob-root"?full:sel===".wob-card"?card:null;}
};
const state={finalActiveWord:{expected:["X","Y"],choices:null},
  uniqueLetters:["X","Y","Z"],finalFlash:"",finalBad:false,finalLetterStreak:0};
const context={
  state,document:doc,
  makeChoiceLetters(){letterCount++;return ["X","Y","Z"];},
  finalWordHtml:()=>'<div id="finalWord">missing letters</div>',
  choiceRowsHtml:()=>'<button data-final-choice="X">X</button>',
  escapeHtml:v=>String(v),
  formatMoney:n=>"$"+n,
  wireTapDownButton(btn,handler){btn.action=handler;},
  handleFinalChoice(choice){calls.push(choice);}
};
vm.runInNewContext(modalSource+"\nthis.renderFinalModal=renderFinalModal;",context);
context.renderFinalModal();
activeModal=full.children[0];
assert.ok(activeModal,"final Fill the Blanks popup created");
assert.equal(full.children.length,1,"entire overlay lives at viewport root");
assert.equal(card.children.length,0,"narrower game card must never contain dim");
assert.ok(activeModal.innerHTML.includes("Fill the Blanks"));
assert.ok(activeModal.innerHTML.includes("missing letters"));
assert.ok(activeModal.innerHTML.includes("data-final-choice"));
assert.equal(typeof buttons[0].action,"function","letter choices still connected");
buttons[0].action();assert.deepEqual(calls,["X"]);
context.state.finalLetterStreak=1;
context.renderFinalModal();
activeModal=full.children[0];
assert.equal(full.children.length,1,"re-render replaces old overlay without duplicates");
assert.equal(card.children.length,0);
assert.equal(letterCount,1,"original choices reused, not regenerated on each render");
buttons[1].action();assert.deepEqual(calls,["X","X"]);
activeModal.remove();
assert.equal(full.children.length,0,"modal cleanup leaves later board controls clear");

// Check all three supported hosts don't draw duplicate Back controls while
// the shared Zoo controller is active; their non-Zoo native/plain fallback
// remains available when data-zoo-stage is absent.
assert.match(feedCss,/\.daily-feed-resume-overlay\[data-zoo-stage\] \.daily-feed-resume-back\s*\{[^}]*display:\s*none\s*!important/s);
assert.match(readCss,/\.read-audio-resume-overlay\[data-zoo-stage\] \.read-audio-overlay-back\s*\{[^}]*display:\s*none\s*!important/s);
assert.match(zoo,/overlay\.setAttribute\("data-zoo-stage", "welcome"\)/);
assert.match(zoo,/overlay\.setAttribute\("data-zoo-stage", next\)/);
assert.match(zoo,/function showExit\(visible\)\s*\{[^}]*exitButton\.hidden = disposed \|\| !visible/s);
assert.match(zoo,/function resetDisplay\(\)[\s\S]*?showExit\(true\);/);
assert.doesNotMatch(zoo,/exitButton\.textContent\s*=\s*"Back to Zoo"/,
  "no visible bottom text link added on Welcome Back");
assert.match(zoo,/setInstruction\("Drag the pet to the pen!", true\)/);
assert.match(zoo,/setInstruction\("Drag pets to the pen!", true\)/);

// Safety contract: the original activity owner still verifies native/Web
// sound INSIDE the explicit tap; no new AudioContext, AVAudioSession or
// progress credits added in this UI-only follow-up.
assert.match(zoo,/function recoveryForAttempt\(info\)[\s\S]*?return recover\(info\);/);
assert.match(zoo,/recovery = recoveryForAttempt\(\{ stage: from, attempt: attemptCount,/);
assert.match(zoo,/Promise\.resolve\(recovery\)\.then\(ok =>/);
assert.match(zoo,/if \(ok\?\.deferred === true && running\(\)\)/);
assert.match(zoo,/RECOVERY_WATCHDOG_MS = 7500/);
assert.doesNotMatch(zoo,/new AudioContext\(|setCategory\(/);
assert.ok(host.includes("outcome = usingCue ? playSurpriseCueFromGesture() : onContinue();"));
assert.ok(host.includes("try { outcome = onContinue(); } catch (_) { outcome = false; }"));
assert.ok(host.includes("if (ok === true) {") && host.includes("overlay.hidden = true;"));
console.log("IP04/IP05 follow-up PASS: compact Wheel pill, actual root-sized interactive letter modal + cleanup, persistent Home across host overlays, untouched real-gesture/native audio recovery contracts");
