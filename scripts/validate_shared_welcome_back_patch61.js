"use strict";
// Patch 61: verified shared UI, safely resolved profile identity, existing
// Feeding gesture/pause and Learn audio behavior. Does not need a browser.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const shared = read("verse_games/shared/welcome-back.js");
const css = read("verse_games/shared/welcome-back.css");
const feed = read("daily_questions_feed_game.js");
const app = read("app.js");
const html = read("index.html");
const sw = read("service-worker.js");
let checks = 0;
function ok(value, msg) { assert.ok(value,msg); checks++; }
function eq(actual,expected,msg) { assert.equal(actual,expected,msg); checks++; }
function makeHarness(profile = { name:"Sam & <script>",avatarVerseId:"john_3_16" }) {
  const calls=[];
  const fakeApi = {
    getActiveProfile:()=>profile,
    getProfilePictureSrc:id=>id && /^[a-z0-9_]+$/.test(id)
      ? `profile_pictures/profile_picture_${id}.png` : "",
    getProfilePictureFallbackSrc:()=>"profile_pictures/profile_picture_fallback.png"
  };
  const window = { BibloZooProfiles:fakeApi };
  const box = { window,console };
  vm.createContext(box);vm.runInContext(shared,box);
  const api=window.BibloZooWelcomeBack;
  const node=(init={})=>({
    hidden:false,disabled:false,textContent:"",attrs:{},src:"",...init,
    getAttribute(k){return this.attrs[k] || "";},
    setAttribute(k,v){this.attrs[k]=String(v);},
    removeAttribute(k){delete this.attrs[k];},
    set src(v){this.attrs.src=v;calls.push(["src",v]);},
    get src(){return this.attrs.src || "";}
  });
  const name=node(),img=node(),paw=node(),button=node(),status=node();
  const lookup={
    "[data-welcome-back-name]":name,
    "[data-welcome-back-picture]":img,
    "[data-welcome-back-picture-fallback]":paw,
    "[data-welcome-back-action]":button
  };
  const host={querySelector:sel=>lookup[sel] || null};
  return {api,host,name,img,paw,button,status,calls,profile};
}
function testIdentity() {
  const h=makeHarness();
  h.api.populate(h.host);
  eq(h.name.textContent,"Sam & <script>","profile displayed as literal text, never interpolated HTML");
  eq(h.img.src,"profile_pictures/profile_picture_john_3_16.png","real profile picture source");
  ok(h.img.hidden,"image hidden until load is confirmed");
  h.img.onload();
  ok(!h.img.hidden,"loaded image becomes visible");
  ok(h.paw.hidden,"paw hidden on successful image load");
  const srcCalls=h.calls.length;
  h.api.populate(h.host);
  eq(h.calls.length,srcCalls,"repeated re-renders do not reload cached image");
  h.img.onerror();
  eq(h.img.src,"profile_pictures/profile_picture_fallback.png","missing picture uses existing fallback asset");
  h.img.onerror();
  ok(h.img.hidden,"broken fallback remains hidden");
  ok(!h.paw.hidden,"paw shown when both images fail");
  h.api.setAction(h.host,{busy:true});
  eq(h.button.textContent,"Let's go!","default action wording");
  ok(h.button.disabled,"busy recovery disables gesture");
  h.api.setAction(h.host,{retry:true});
  eq(h.button.textContent,"Try again!","retry wording");
  ok(!h.button.disabled,"retry restores button");
}
function testFallbackProfile() {
  const h=makeHarness(null);
  h.api.populate(h.host,{name:" Alex "});
  eq(h.name.textContent,"Alex","Feeding session name used if no active profile");
  eq(h.img.src,"profile_pictures/profile_picture_fallback.png","fallback picture even with no active profile");
  const other=makeHarness({name:"    ",avatarVerseId:"../../bad"});
  other.api.populate(other.host);
  eq(other.name.textContent,"Zookeeper","blank profile uses accessible default");
  eq(other.img.src,"profile_pictures/profile_picture_fallback.png","rejects invalid profile picture key");
}
function testMarkupAndIntegration() {
  const h=makeHarness();
  const learn=h.api.markup("learn");
  ok(learn.includes('data-welcome-back-name'),"shared Learn markup displays profile name");
  ok(learn.includes('data-welcome-back-picture'),"shared Learn markup displays avatar");
  ok(learn.includes('data-welcome-back-action'),"shared Learn markup includes action");
  ok(learn.includes('id="learnAudioResumeButton"'),"Learn recovery retains existing button hook");
  ok(!learn.includes('<script>'),"markup never embeds name");
  ok(feed.includes('data-daily-feed-resume-overlay'),"Feeding overlay retains detection hook");
  ok(feed.includes('data-daily-feed-resume-status'),"Feeding retains failed audio message");
  ok(feed.includes('data-daily-feed-resume-back'),"Feeding retains back/exit");
  ok(feed.includes('data-welcome-back-picture'),"Feeding uses shared avatar presentation");
  ok(feed.includes('BibloZooWelcomeBack?.populate?.(runtime.resumeOverlay'),"Feeding refreshes profile identity on return");
  ok(feed.includes('BibloZooWelcomeBack?.setAction?.(runtime.resumeOverlay'),"Feeding shares action text");
  ok(feed.includes('if (document.hidden) pauseFeedingGame(runtime);'),"background pauses gameplay, does not auto restart");
  ok(feed.includes('runtime.feedAudioRecoveryVerified = false'),"pause invalidates audio recovery verification");
  ok(feed.includes('feedAudioClockAdvances(context)'),"Feeding still probes actual audio clock");
  ok(app.includes('BibloZooWelcomeBack?.markup?.("learn")'),"Learn uses shared HTML instead of duplicate modal template");
  ok(app.includes('BibloZooWelcomeBack?.populate?.(overlay)'),"Learn refreshes profile on overlay");
  ok(app.includes('BibloZooWelcomeBack?.setAction?.(overlay'),"Learn shares button copy");
  ok(app.includes('overlay.querySelector("#learnAudioResumeButton").onclick = resumeInterruptedLearnAudio'),"Learn keeps genuine-gesture audio handler");
  ok(!app.includes('learnAudioResumeStyle'),"duplicate inline style removed");
  ok(html.includes('href="verse_games/shared/welcome-back.css"'),"document loads shared CSS");
  ok(html.includes('src="verse_games/shared/welcome-back.js"'),"document loads shared module");
  ok(html.indexOf('src="verse_games/shared/welcome-back.js"') < html.indexOf('src="daily_questions_feed_game.js"'),"shared helper loads before Feeding");
  ok(sw.includes('2026_Oct_26_patch69_flashcards_recording_replay_welcome'),"new offline cache version");
  ok(sw.includes('"./verse_games/shared/welcome-back.css"'),"shared stylesheet cached for PWA");
  ok(sw.includes('"./verse_games/shared/welcome-back.js"'),"shared script cached for PWA");
  ok(css.includes('background: #ffc751'),"yellow card");
  ok(css.includes('background: #fff'),"white rounded photo background");
  ok(css.includes('background: #333333') && css.includes('color: #fff'),"charcoal button with white text");
  ok(css.includes('.bz-welcome-title') && css.includes('.bz-welcome-name'),"shared welcome/title typography");
  ok(css.includes('#learnAudioResumeOverlay[hidden]'),"learn hidden overlay cannot intercept taps");
  ok(css.includes('.bz-welcome-status[hidden]'),"hidden retry status is not shown");
}
testIdentity();testFallbackProfile();testMarkupAndIntegration();
console.log(`Patch 61 shared Welcome Back validation passed (${checks} checks).`);
