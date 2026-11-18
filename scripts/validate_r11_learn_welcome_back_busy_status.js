"use strict";
// R11 / LEARN-01: execute the ACTUAL app.js Learn overlay synchronizer
// against the ACTUAL shared Welcome Back helper. Synthetic DOM only:
// preserve action slot, aria-live status, genuine error and retry behavior.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const app = read("app.js");
const shared = read("verse_games/shared/welcome-back.js");
const css = read("verse_games/shared/welcome-back.css");
const workflow = read(".github/workflows/ios-prep-validation.yml");
assert(workflow.includes("node scripts/validate_r11_learn_welcome_back_busy_status.js"));
const begin = app.indexOf("function syncLearnAudioResumeOverlay() {");
const end = app.indexOf("function clearLearnAudioResumeTimers(", begin);
assert(begin > 0 && end > begin, "real Learn overlay sync function in app.js");
const syncSource = app.slice(begin, end);
assert(syncSource.includes("window.BibloZooWelcomeBack?.setAction?.(overlay, {"));
assert(syncSource.includes("const hasInlineProgress = !!overlay.querySelector("));
assert(syncSource.includes('hasInlineProgress ? "" : "Checking sound..."'));
assert(!syncSource.includes("BibloZooWelcomeBack?.getMessage?.(overlay)"),
  "never mirror a playful message from the action slot into status");
assert(syncSource.includes("status.hidden = !status.textContent"));
assert(syncSource.includes("retry: !!learnAudioResumeError"));
assert(shared.includes("progress.textContent = session.message"),
  "shared helper remains the sole writer of rotating progress text");
assert(shared.includes('const RETRY_TEXT = "Try again!"'));
assert(shared.includes('card?.setAttribute?.("aria-busy", busy ? "true" : "false")'));
assert(shared.includes("setMessagesRunning(root, !!busy)"));
assert(css.includes(".bz-welcome-action[hidden]"));
assert(css.includes(".bz-welcome-status[hidden]"));

function makeHarness(withSharedProgress=true) {
  const timers = new Map();
  let nextTimer = 0;
  const flags = new Set();
  const cardAttrs = {};
  const card = {
    isConnected: true,
    classList: {
      contains(value) { return flags.has(value); },
      toggle(value, enabled) {
        if (enabled) flags.add(value); else flags.delete(value);
      }
    },
    setAttribute(key, value) { cardAttrs[key] = value; }
  };
  const button = {
    hidden: false, disabled: false, textContent: "Let's go!",
    closest() { return card; }
  };
  const progress = {hidden: true, textContent: ""};
  const status = {hidden: true, textContent: ""};
  const lookups = {
    "[data-welcome-back-card]": card,
    "[data-welcome-back-action]": button,
    "#learnAudioResumeButton": button,
    "#learnAudioResumeStatus": status,
    "[data-welcome-back-status]": status
  };
  if(withSharedProgress)lookups["[data-welcome-back-progress]"] = progress;
  const overlay = {
    hidden: true, isConnected: true,
    querySelector(selector) { return lookups[selector] || null; }
  };
  const document = {
    hidden: false,
    getElementById(id) {
      return id === "learnAudioResumeOverlay" ? overlay : null;
    }
  };
  const window = {
    document,
    setInterval(fn) { const id=++nextTimer; timers.set(id,fn); return id; },
    clearInterval(id) { timers.delete(id); }
  };
  vm.runInNewContext(shared, {window,document,console},
    {filename:"verse_games/shared/welcome-back.js"});
  const context = {
    window, document, State: {screen:"LEARN"},
    learnZooHoldingForSurprise: false,
    learnZooEscape: null, learnZooRecovery: null,
    learnAudioResumeAttempt: null,
    learnAudioInterrupted: {mode:"listen",screen:"LEARN"},
    learnAudioResumeError: "",
    learnMenuOpen: false,
    // Existence of a Learn interruption is the only mocked predicate;
    // the entire real production rendering function executes verbatim.
    isLearnAudioOverlayRecovery(value) { return !!value && value.mode==="listen"; },
    ensureLearnAudioResumeOverlay() { return overlay; }
  };
  vm.runInNewContext(syncSource+"\nthis.syncLearnAudioResumeOverlay = syncLearnAudioResumeOverlay;",
    context,{filename:"app.js:syncLearnAudioResumeOverlay"});
  return {
    context, window, document, overlay, button, progress,
    status,cardAttrs,timers,
    sync() {context.syncLearnAudioResumeOverlay();},
    tick() {for(const fn of [...timers.values()])fn();}
  };
}

function exerciseModernLearn() {
  const h = makeHarness();
  assert.match(h.window.BibloZooWelcomeBack.markup("learn"),
    /data-welcome-back-progress[\s\S]*role="status"/);
  assert.match(h.window.BibloZooWelcomeBack.markup("learn"),
    /id="learnAudioResumeStatus" role="status" aria-live="polite" hidden/);
  h.sync();
  assert.equal(h.overlay.hidden,false);
  assert.equal(h.button.textContent,"Let's go!");
  assert.equal(h.button.disabled,false);
  assert.equal(h.button.hidden,false);
  assert.equal(h.status.textContent,"");
  assert.equal(h.status.hidden,true);
  assert.equal(h.progress.hidden,true);
  const interrupted = h.context.learnAudioInterrupted;
  h.context.learnAudioResumeAttempt={recovery:interrupted};
  h.context.learnAudioInterrupted=null;
  h.sync();
  assert.equal(h.button.hidden,true,"busy action replaced in the same slot");
  assert.equal(h.button.disabled,true,"no second action during in-flight sound");
  assert.equal(h.cardAttrs["aria-busy"],"true");
  assert.equal(h.progress.hidden,false);
  assert(h.window.BibloZooWelcomeBack.ZOO_MESSAGES.includes(h.progress.textContent));
  assert.equal(h.status.textContent,"","no duplicate playful line under action");
  assert.equal(h.status.hidden,true,"no duplicate spoken aria-live announcement");
  assert.equal(h.timers.size,1,"only one source of progress interval");
  const first=h.progress.textContent;
  h.sync();
  assert.equal(h.timers.size,1,"multiple renders do not restart spinner");
  h.tick();
  assert.notEqual(h.progress.textContent,first);
  assert.equal(h.status.textContent,"","rotating phrase never appears beneath");
  assert.equal(h.status.hidden,true);
  h.context.learnAudioResumeAttempt=null;
  h.context.learnAudioInterrupted=interrupted;
  h.context.learnAudioResumeError="Sound isn't ready yet. Please try again.";
  h.sync();
  assert.equal(h.progress.hidden,true,"progress removed after failed verification");
  assert.equal(h.button.hidden,false);
  assert.equal(h.button.disabled,false);
  assert.equal(h.button.textContent,"Try again!","failed audio is still retryable");
  assert.equal(h.status.hidden,false,"real failure reason stays visible");
  assert.equal(h.status.textContent,"Sound isn't ready yet. Please try again.");
  assert.equal(h.cardAttrs["aria-busy"],"false");
  assert.equal(h.timers.size,0,"timer retired when verification ends");
  h.context.learnAudioResumeError="";
  h.context.learnAudioResumeAttempt={recovery:interrupted};
  h.context.learnAudioInterrupted=null;
  h.sync();
  assert.equal(h.status.hidden,true,"old failure disappears before a new try");
  assert.equal(h.status.textContent,"");
  assert.equal(h.timers.size,1);
  h.context.learnAudioResumeAttempt=null;
  h.context.learnAudioInterrupted=null;
  h.context.learnAudioResumeError="";
  h.sync();
  assert.equal(h.overlay.hidden,true,"verified success dismisses original modal");
  h.tick();
  assert.equal(h.timers.size,0,"hidden overlay stops progress timer");
  h.context.learnAudioInterrupted=interrupted;
  h.context.learnMenuOpen=true;
  h.sync();
  assert.equal(h.overlay.hidden,true,"ordinary Learn Menu doesn't invent recovery");
  h.context.learnMenuOpen=false;
  h.sync();
  assert.equal(h.overlay.hidden,false);
  assert.equal(h.button.textContent,"Let's go!");
  assert.equal(h.status.hidden,true,"reopened Learn shows no stale error");
}

function exerciseLocalFallback() {
  const h=makeHarness(false);
  h.sync();
  const interrupted=h.context.learnAudioInterrupted;
  h.context.learnAudioResumeAttempt={recovery:interrupted};
  h.context.learnAudioInterrupted=null;
  h.sync();
  assert.equal(h.button.hidden,false,
    "no shared action slot: leave disabled fallback button visible");
  assert.equal(h.button.disabled,true);
  assert.equal(h.status.textContent,"Checking sound...",
    "fallback retains ONE accessible non-playful status");
  assert.equal(h.status.hidden,false);
  h.context.learnAudioResumeAttempt=null;
  h.context.learnAudioInterrupted=interrupted;
  h.context.learnAudioResumeError="Sound isn't ready yet. Please try again.";
  h.sync();
  assert.equal(h.button.textContent,"Try again!");
  assert.equal(h.button.disabled,false);
  assert.equal(h.status.textContent,"Sound isn't ready yet. Please try again.");
}

exerciseModernLearn();
exerciseLocalFallback();
console.log("R11 Learn actual overlay+shared Welcome Back busy, rotation, retry, a11y/fallback PASS");
