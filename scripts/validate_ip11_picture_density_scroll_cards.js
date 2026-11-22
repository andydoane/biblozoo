#!/usr/bin/env node
"use strict";
// IP11: run production density/placement code and simulated native touch
// gestures. Physical WebKit, AVFoundation and real screens remain owner-tested.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const game = read("verse_games/verse_scramble_neo/game.js");
const app = read("app.js");
const css = read("styles.css");
const launch = read("verse_games/verse_launch/game.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
function part(src, a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, "source markers: " + a);
  return src.slice(i, j);
}
assert.match(workflow, /node scripts\/validate_ip11_picture_density_scroll_cards\.js/);
for (const source of [app, game, launch]) new vm.Script(source);

const picIds = Array.from(
  part(game, "const BONUS_PICTURE_VERSE_IDS = [", "];")
    .matchAll(/"([^"]+)"/g), m => m[1]
);
assert.equal(picIds.length, 125, "expanded public photo pool");
assert.equal(new Set(picIds).size, picIds.length);
for (const id of picIds) {
  assert.match(id, /^[a-z0-9_]+$/);
  assert.ok(fs.existsSync(path.join(root, "profile_pictures", "profile_picture_" + id + ".png")), id);
}
assert.doesNotMatch(game, /BONUS_PICTURE_COUNT_BY_MODE/,
  "picture count must not change with Easy/Medium/Hard");
const densityCode = part(game, "function bonusPictureSeed() {", "function startBonusIntro() {");
assert.doesNotMatch(densityCode.replace(/\/\/[^\n]*/g, ""), /selectedMode|localStorage|sessionStorage|profileId|fetch\(/,
  "size, seed and art choices never depend on mode/private data/network");
assert.match(game, /if \(state\.bonusRound === 5 && state\.bonusPictureTarget\) \{\s*return makeBonusPictureTiles\(\);/);
assert.match(game, /const desiredTotal = 110;/, "original letter rounds unchanged");
assert.match(game, /state\.bonusDeadline = gameNow\(\) \+ bonusTimeWithWiggle\(\);/,
  "original race clock unchanged");

function pictureHarness(mode, width, height, tileSize) {
  const images = [];
  const fieldRect = { width, height };
  const board = { appendChild() {} };
  const document = {
    getElementById(id) { return id === "vsnBoard" ? board : null; },
    createElement(tag) {
      return {
        style: {}, className: "", type: "",
        appendChild() {}, remove() {},
        getBoundingClientRect() {
          return tag === "button"
            ? { width: tileSize, height: tileSize }
            : fieldRect;
        }
      };
    }
  };
  class FakeImage { set src(v) { images.push(v); } }
  const state = {
    bonusPictureChoices: [], bonusPictureTarget: null,
    bonusRound: 5, tileSeed: 0
  };
  const context = {
    document, Image: FakeImage, state, ctx: { verseId: "john_3_16" },
    selectedMode: mode, BONUS_PICTURE_VERSE_IDS: picIds,
    PROFILE_PICTURE_DIR: "../../profile_pictures/",
    shuffle: arr => arr.slice().reverse()
  };
  vm.createContext(context);
  vm.runInContext("let bonusPicturePreloads=[];\n" + densityCode +
    part(game, "function makeBonusPictureTiles() {", "function renderBonusPointerHtml() {") +
    part(game, "function layoutBonusPictureMagnets(", "function layoutMagnets(){") +
    "\nthis.ip11={prepareBonusPictureRound,bonusPictureGridMetrics," +
    "measuredBonusPictureCount,makeBonusPictureTiles,layoutBonusPictureMagnets};", context);
  return { context, state, images, api: context.ip11 };
}
const phone = pictureHarness("easy", 340, 370, 50);
phone.api.prepareBonusPictureRound();
const phoneCount = phone.api.measuredBonusPictureCount();
const tablet = pictureHarness("hard", 850, 700, 86);
tablet.api.prepareBonusPictureRound();
const tabletCount = tablet.api.measuredBonusPictureCount();
assert.ok(phoneCount >= 20, "small iPhone field is not mostly empty: " + phoneCount);
assert.ok(tabletCount > phoneCount, "large iPad uses more of its playfield");
assert.ok(tabletCount >= 40, "large iPad field has meaningful picture density");
for (const [w,h,size] of [[340,370,50],[850,700,86],[420,300,54]]) {
  const results=[];
  for (const mode of ["easy","medium","hard"]) {
    const run=pictureHarness(mode,w,h,size);
    run.api.prepareBonusPictureRound();
    const round=run.api.makeBonusPictureTiles();
    results.push(round.length);
    assert.equal(round.length, run.api.measuredBonusPictureCount());
    assert.equal(round.filter(t=>t.isBonusTarget).length, 1, "always one target");
    assert.equal(new Set(round.map(t=>t.pictureSrc)).size, round.length, "no repeated art");
    assert.ok(run.images.length <= 29, "bounded prewarm");
    assert.ok(run.images.includes(run.state.bonusPictureTarget.src), "prewarm target");
    assert.equal(round.find(t=>t.isBonusTarget).pictureSrc, run.state.bonusPictureTarget.src);
  }
  assert.equal(new Set(results).size, 1, "all modes have same count on same geometry");
}
const bigTiles=tablet.api.makeBonusPictureTiles();
tablet.state.tiles=bigTiles;
const buttons=bigTiles.map(t=>{
  const classes=new Set();
  return {
    dataset:{tileId:t.id}, offsetWidth:86, offsetHeight:86,
    style:{setProperty(){}, left:"", top:"", display:"", visibility:""},
    classList:{add:(...names)=>names.forEach(n=>classes.add(n)),
      remove:(...names)=>names.forEach(n=>classes.delete(n)),
      contains:name=>classes.has(name)}
  };
});
tablet.api.layoutBonusPictureMagnets({}, {width:850,height:700}, buttons);
assert.ok(buttons.every(b=>b.style.visibility==="visible"), "all size-selected tiles placed");
for(let i=0;i<buttons.length;i++) for(let j=i+1;j<buttons.length;j++){
  const a=buttons[i], b=buttons[j];
  const x=Math.abs(parseFloat(a.style.left)-parseFloat(b.style.left));
  const y=Math.abs(parseFloat(a.style.top)-parseFloat(b.style.top));
  assert.ok(x>=86 || y>=86, "photo hitboxes cannot overlap");
}
tablet.api.layoutBonusPictureMagnets({}, {width:340,height:370}, buttons);
assert.equal(buttons.filter(b=>b.style.visibility==="visible"&&b.style.display!=="none")
  .filter(b=>bigTiles.find(t=>t.id===b.dataset.tileId).isBonusTarget).length,1,
  "target never lost on mid-round shrink");
assert.match(game,/object-fit|vsn-bonus-picture-tile/);
assert.match(read("verse_games/verse_scramble_neo/game.css"),
  /\.vsn-bonus-picture-tile img\s*\{[^}]*object-fit:\s*contain/s);
assert.match(read("verse_games/verse_scramble_neo/game.css"),
  /\.vsn-bonus-active \.vsn-magnet\.vsn-bonus-picture-tile\s*\{[^}]*border-radius:\s*0/s);

// Exercise the actual app-wide sound event handlers with a native-iOS style
// gesture facade; no family storage or real AVAudioSession touched.
const cardHandlerSource=part(app, "function isNativeUiAudioMode() {",
  "/* =========================\n   Standalone PWA Install Gate");
const registered=new Map(), nativeTaps=[];
const scrollHost={scrollTop:0, scrollLeft:0};
const classes=new Set();
const card={
  isConnected:true, disabled:false,
  getAttribute(){return null;},
  matches(selector){return selector.includes(".practice-scroll-wrap .practice-game-card");},
  closest(selector){
    if(selector==="[data-no-ui-sound]")return null;
    if(selector===".practice-scroll-wrap")return scrollHost;
    if(selector===".new-verse-picker-screen")return null;
    if(selector.includes("button")||selector.includes(".practice-game-card"))return card;
    return null;
  },
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)}
};
const env={
  appUiTapSoundsBound:false, UI_TAP_SOUND_SELECTOR:"button, .practice-game-card",
  lastUiTapGestureAt:0, State:{screen:"practice"}, muted:false,
  UI_TAP_VOLUME:0.8, feedingResumeOwnsAudioGesture:()=>false,
  window:{PointerEvent:function(){}, BibloZooNativeUiAudio:{
    isAvailable:()=>true, tapFromGesture:arg=>nativeTaps.push(arg)
  }},
  document:{hidden:false, addEventListener:(name,fn)=>{
    if(!registered.has(name)) registered.set(name, []);
    registered.get(name).push(fn);
  }},
  performance:{now:()=>env.now}, now:1000,
  setTimeout:()=>1,
  preloadUiTapSoundBuffers:()=>{throw Error("native UI should never use Web preload")},
};
vm.createContext(env);
vm.runInContext("let appUiTapSoundsBound=false;\n" +
  cardHandlerSource + "\nsetupAppUiTapSounds();",env);
function fire(type, additional={}) {
  const event={type,target:card,button:0,pointerId:7,
    pointerType:"touch",clientX:20,clientY:20,...additional};
  for(const fn of (registered.get(type)||[])) fn(event);
}
fire("pointerdown"); assert.equal(nativeTaps.length,0,"no sound on initial card contact");
fire("pointermove",{clientY:65});fire("pointerup",{clientY:65});
assert.equal(nativeTaps.length,0,"no sound while swiping");
assert.ok(!classes.has("is-confirmed-tap"),"no visual pop during scroll");
env.now+=200;fire("pointerdown");
scrollHost.scrollTop=30;fire("pointerup");
assert.equal(nativeTaps.length,0,"scroll-position change suppresses feedback");
scrollHost.scrollTop=0;
env.now+=200;fire("pointerdown");fire("pointercancel");fire("pointerup");
assert.equal(nativeTaps.length,0,"pointercancel aborts press");
env.now+=200;fire("pointerdown");fire("pointerup",{clientY:23});
assert.equal(nativeTaps.length,1,"stationary touch plays exactly one native UI pop on release");
assert.ok(classes.has("is-confirmed-tap"),"stationary touch animates the card");
env.now+=200;fire("touchstart",{changedTouches:[{identifier:3,clientX:20,clientY:20}]});
assert.equal(nativeTaps.length,1,"touchstart duplicate is silent on PointerEvent devices");
env.now+=200;fire("pointerdown",{pointerType:"mouse"});assert.equal(nativeTaps.length,2,
  "mouse press continues to receive immediate UI feedback");
// Older touch-only fallback still suppresses scrolling and confirms taps.
env.window.PointerEvent=undefined;
env.now+=200;fire("touchstart",{changedTouches:[{identifier:3,clientX:20,clientY:20}]});
fire("touchmove",{changedTouches:[{identifier:3,clientX:20,clientY:80}]});
fire("touchend",{changedTouches:[{identifier:3,clientX:20,clientY:80}]});
assert.equal(nativeTaps.length,2);
env.now+=200;fire("touchstart",{changedTouches:[{identifier:3,clientX:20,clientY:20}]});
fire("touchend",{changedTouches:[{identifier:3,clientX:20,clientY:20}]});
assert.equal(nativeTaps.length,3,"fallback touchend preserves native tap on stationary press");
assert.match(css,/@media \(pointer: coarse\)\s*\{[\s\S]*?\.practice-scroll-wrap \.practice-game-card:active/);
assert.match(css,/\.practice-scroll-wrap \.practice-game-card\.is-confirmed-tap/);
assert.match(css,/@keyframes bzConfirmedCardTap/);
assert.doesNotMatch(part(app,"function trackCardTouchStart(","function handleUiTapGesture(event) {"),
  /preventDefault\(|stopPropagation\(|setPointerCapture\(/,
  "scroll handling must never steal scroll or click");

const travel=part(launch,"function bonusTravelInstructionHtml() {",
  "async function requestAstroTiltPermission()");
assert.match(travel,/Reach the moon!<br>[\s\S]*Dodge the asteroids\./);
assert.doesNotMatch(travel.replace(/\/\/[^\n]*/g,""), /Tilt to steer|arrows to steer|arrow keys|drag to steer/i);
assert.match(launch,/function renderAstroSteeringChoice\(\)/,
  "separate control chooser still retained");
console.log("IP11 PASS: 125 public photos, measured phone/iPad field density, same count for all modes, single nonoverlapping target and rotation guard; swipes silent/no depression, taps/mouse/fallback/native audio correct; cutscene copy cleaned.");
