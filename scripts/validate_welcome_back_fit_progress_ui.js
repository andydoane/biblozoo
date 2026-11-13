"use strict";

// Shared Welcome Back presentation regression: actual VM helper, fake DOM
// geometry, and virtual timers. No audio bridge, gesture or iPhone simulator.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = rel => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
const JS = read("verse_games/shared/welcome-back.js");
const CSS = read("verse_games/shared/welcome-back.css");
const FEED = read("daily_questions_feed_game.js");
const CI = read(".github/workflows/ios-prep-validation.yml");

assert.match(CI, /node scripts\/validate_welcome_back_fit_progress_ui\.js/);
assert.match(CSS, /\.bz-welcome-action-slot\s*\{[^}]*height:\s*64px/);
assert.match(CSS, /\.bz-welcome-action-slot\s*>\s*\*\s*\{\s*grid-area:\s*1\s*\/\s*1/);
assert.match(CSS, /\.bz-welcome-action\[hidden\],[\s\S]*?\.bz-welcome-progress\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(CSS, /\.bz-welcome-name-line\.bz-welcome-name-wrap[\s\S]*?white-space:\s*normal/);
assert.match(FEED, /data-welcome-back-action-slot/);
assert.match(FEED, /data-welcome-back-progress[\s\S]*?aria-live="polite"/);
assert.match(FEED, /data-daily-feed-resume>Let's go!<\/button>/);
assert.match(FEED, /data-welcome-back-status data-daily-feed-resume-status/);
assert.doesNotMatch(JS, /length > 13|length > 9/,
  "old character-count sizing must not return");

function cls() {
  const values = new Set();
  return {
    add(name) { values.add(name); },
    remove(name) { values.delete(name); },
    contains(name) { return values.has(name); },
    toggle(name, enabled) {
      if (enabled) values.add(name);
      else values.delete(name);
    }
  };
}
function harness() {
  const timers = new Map(), frames = [], observers = [];
  let nextTimer = 0, username = "Ultimate Tester", width = 0;
  const name = {textContent:""};
  const nameLine = {
    style: {
      values:{},
      setProperty(k,v) {this.values[k] = String(v);}
    },
    classList:cls(),
    get scrollWidth() {
      const raw = this.style.values["--bz-welcome-name-size"];
      const px = raw === "inherit" || raw == null ? 39 : Number.parseFloat(raw);
      return Math.ceil((name.textContent.length + 1) * px * 0.60);
    }
  };
  const slot = {getBoundingClientRect:() => ({width})};
  const title = {};
  const button = {textContent:"Let's go!",hidden:false,disabled:false};
  const progress = {textContent:"",hidden:true};
  const status = {textContent:"",hidden:true};
  const card = {
    isConnected:true,
    classList:cls(),
    attrs:{},
    setAttribute(k,v) {this.attrs[k] = String(v);}
  };
  const root = {
    hidden:false,
    isConnected:true,
    querySelector(sel) {
      return {
        "[data-welcome-back-card]":card,
        "[data-welcome-back-name-line]":nameLine,
        "[data-welcome-back-name]":name,
        "[data-welcome-back-action-slot]":slot,
        "[data-welcome-back-action]":button,
        "[data-welcome-back-progress]":progress,
        "[data-welcome-back-status]":status,
        ".bz-welcome-title":title
      }[sel] || null;
    }
  };
  const document = {hidden:false, fonts:{ready:Promise.resolve()}};
  class ResizeObserver {
    constructor(fn) {this.fn=fn;this.disconnected=false;observers.push(this);}
    observe(target) {this.target=target;}
    disconnect() {this.disconnected=true;}
    fire() {this.fn();}
  }
  const window = {
    BibloZooProfiles:{ getActiveProfile:()=>({name:username}) },
    document, ResizeObserver,
    getComputedStyle:()=>({fontSize:"39px"}),
    requestAnimationFrame(fn) {frames.push(fn);return frames.length;},
    setInterval(fn,ms) {const id=++nextTimer;timers.set(id,{fn,ms});return id;},
    clearInterval(id) {timers.delete(id);}
  };
  vm.runInNewContext(JS,{window,document,console}, {filename:"welcome-back.js"});
  return {api:window.BibloZooWelcomeBack,root,card,name,nameLine,
    slot,button,progress,status,timers,frames,observers,
    nameAs(value) {username=value;},
    widthAs(value) {width=value;},
    fireResize() {for(const observer of observers) if(!observer.disconnected) observer.fire();},
    tick() {for(const [id,timer] of [...timers]) if(timers.has(id)) timer.fn();}
  };
}

async function main() {
  const h = harness();
  const {api,root,button,progress,status,nameLine,card} = h;
  const html = api.markup("game");
  assert.match(html, /class="bz-welcome-action-slot" data-welcome-back-action-slot/);
  assert.match(html, /data-welcome-back-progress/);
  assert.match(html, /data-welcome-back-action/);
  assert.match(html, /data-welcome-back-status/);
  assert.match(api.markup("learn"), /id="learnAudioResumeButton"/,
    "Learn's existing genuine-tap button remains intact");

  api.populate(root);
  assert.equal(h.name.textContent,"Ultimate Tester");
  assert.equal(nameLine.style.values["--bz-welcome-name-size"],"inherit",
    "hidden overlay begins at full heading size; no arbitrary shrink");
  assert.equal(h.observers.length,1);
  assert.equal(h.observers[0].target,h.slot,
    "observe fixed-width action slot rather than hidden button");
  h.widthAs(280); // overlay becomes visible after populate()
  h.fireResize();
  let fitted = Number.parseFloat(nameLine.style.values["--bz-welcome-name-size"]);
  assert(fitted >= 16 && fitted < 39,
    "Ultimate Tester scales only enough to fit the action width");
  assert(nameLine.scrollWidth <= 279, "fitted name and ! fit button width");
  assert(!nameLine.classList.contains("bz-welcome-name-wrap"));

  h.widthAs(420); // rotate phone / larger popup
  h.fireResize();
  assert.equal(nameLine.style.values["--bz-welcome-name-size"],"inherit",
    "wide button restores exact Welcome back font size");
  h.widthAs(220);
  h.fireResize();
  fitted=Number.parseFloat(nameLine.style.values["--bz-welcome-name-size"]);
  assert(fitted < 39 && fitted >= 16, "narrow screen refits");

  h.nameAs("Sam");
  api.populate(root);
  assert.equal(nameLine.style.values["--bz-welcome-name-size"],"inherit",
    "short name does not shrink needlessly");
  h.nameAs("A".repeat(64));
  api.populate(root);
  assert.equal(nameLine.style.values["--bz-welcome-name-size"],"16px");
  assert(nameLine.classList.contains("bz-welcome-name-wrap"),
    "extra-long name wraps at a readable minimum, not microscopic text");
  h.nameAs("Ultimate Tester");
  api.populate(root);
  assert(!nameLine.classList.contains("bz-welcome-name-wrap"),
    "reusing the popup clears the long-name wrapping state");
  for(const frame of h.frames.splice(0)) frame(); // next frame before paint
  await Promise.resolve(); // real font face becoming ready
  assert(nameLine.scrollWidth <= 219);

  // During recovery the button disappears from its existing fixed slot;
  // playful text lives THERE, not in the error paragraph below the button.
  status.textContent="Previous failure";status.hidden=false;
  api.setAction(root,{busy:true});
  assert(button.disabled && button.hidden);
  assert(!progress.hidden && !status.hidden === false);
  assert.equal(status.hidden,true, "stale error explanation hides on new attempt");
  assert(api.ZOO_MESSAGES.includes(progress.textContent));
  assert.equal(api.getMessage(root),progress.textContent);
  assert.equal(h.timers.size,1);
  const first=progress.textContent;
  api.setAction(root,{busy:true});
  assert.equal(h.timers.size,1, "repeated busy notifications do not add intervals");
  h.tick();
  assert.notEqual(progress.textContent,first, "funny message rotates inside same slot");
  assert(status.hidden,"rotating status does not create a new row");
  api.setAction(root,{busy:false,retry:true});
  assert.equal(h.timers.size,0);
  assert.equal(api.getMessage(root),"");
  assert.equal(progress.hidden,true);
  assert.equal(button.hidden,false);
  assert.equal(button.disabled,false);
  assert.equal(button.textContent,"Try again!");
  status.textContent="Sound isn't ready yet. Try again!";
  status.hidden=false;
  assert(!status.hidden,"real audio errors may use their separate explanation row");

  api.setAction(root,{busy:true});
  root.hidden=true;
  h.tick();
  assert.equal(h.timers.size,0,"backgrounded popup drops the playful-message timer");
  api.setAction(root,{busy:false});
  assert.equal(button.textContent,"Let's go!");
  assert(!button.hidden && progress.hidden);

  root.isConnected=false;
  h.fireResize();
  assert(h.observers[0].disconnected,"detached popup releases resize observer");
  console.log("Welcome Back fit/progress PASS: actual shared JS, hidden-open/resize/font refit, readable long names, one fixed progress slot, retry/error, background timer cleanup.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
