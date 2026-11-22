#!/usr/bin/env node
"use strict";
/* IP05 seven visual-only regressions; owner device geometry still pending. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const feeding = read("daily_questions_feed_game.js");
const feedCss = read("daily_questions_feed_game.css");
const wheel = read("verse_playground/wheel_of_bible/game.js");
const wheelCss = read("verse_playground/wheel_of_bible/game.css");
const launchCss = read("verse_games/verse_launch/game.css");
const bird = read("verse_games/versey_bird/game.js");
const birdCss = read("verse_games/versey_bird/game.css");
const dino = read("verse_games/dino_dash/game.js");
const dinoCss = read("verse_games/dino_dash/game.css");
function rules(css, sel) {
  const matches = [];
  for (const suffix of [" {","{"]) {
    let i=0;
    while ((i=css.indexOf(sel+suffix,i))>=0) {
      const e=css.indexOf("}",i);
      assert.ok(e>i,"closed CSS rule "+sel);
      matches.push(css.slice(i,e+1));
      i=e+1;
    }
  }
  assert.ok(matches.length,"has CSS rule "+sel);
  return matches.join("\n");
}
const feedingBtn=rules(feedCss,".daily-feed-result-back");
for (const part of ["width: max-content;","max-width: 100%;",
 "display: inline-flex;","white-space: nowrap;"]) assert.ok(feedingBtn.includes(part));
assert.match(feedCss,/@media \(min-width: 700px\)\s*\{\s*\.daily-feed-result-back/);
assert.ok(feeding.includes("<span>To-Do Complete!</span>"));
assert.ok(feeding.includes('class="daily-feed-result-check"'));

// Actually run Bounce's original between-serve presenter with 1/2/3 lives.
const bStart=feeding.indexOf("  function showBounceNextServe(runtime, now) {");
const bEnd=feeding.indexOf("  function updateBounceMode(runtime, dt, now) {",bStart);
assert.ok(bStart>0 && bEnd>bStart);
const bCtx={};
vm.runInNewContext(feeding.slice(bStart,bEnd)+"\nthis.show=showBounceNextServe;",bCtx);
function bounceTitle(lives) {
  const classes=[];
  const rt={bounce:{livesLeft:lives,waitingServe:false},
    startTitleEl:{textContent:"",hidden:true},startBallsEl:{hidden:false},
    startInstructionEl:{textContent:"before",hidden:false},
    startOverlay:{hidden:true,classList:{add:x=>classes.push(x)}},
    startChoiceEl:{hidden:false},startConfirmEl:{hidden:true},
    startSelectedIconEl:{hidden:false},startServeAvatarEl:{hidden:true},
    startConfirmButton:{textContent:""}};
  bCtx.show(rt,1000);
  assert.equal(rt.bounce.waitingServe,true);
  assert.equal(rt.startOverlay.hidden,false);
  assert.equal(rt.startConfirmButton.textContent,"Launch!");
  assert.equal(classes[0],"is-bounce-serve");
  return rt.startTitleEl.textContent;
}
assert.equal(bounceTitle(1),"1 ball left!");
assert.equal(bounceTitle(2),"2 balls left!");
assert.equal(bounceTitle(3),"3 balls left!");

// Wheel pill measures intrinsic content and clamps; popup overlays root bounds.
const intro=rules(wheelCss,".wob-final-intro-subtitle");
for(const part of ["width: max-content;","max-width: min(100%, 720px);",
 "padding: 8px 16px;","overflow-wrap: break-word;"]) assert.ok(intro.includes(part));
assert.ok(wheel.includes("One minute to fill in as many missing letters as possible."));
const wobRoot=rules(wheelCss,".wob-root");
assert.ok(wobRoot.includes("position: relative;"));
assert.ok(wobRoot.includes("height: 100dvh;") && wobRoot.includes("width: 100%;"));
const dim=rules(wheelCss,".wob-times-up-overlay");
for(const part of ["position: absolute;","inset: 0;","pointer-events: none;"]) assert.ok(dim.includes(part));
const wStart=wheel.indexOf("  async function showTimesUpPopup() {");
const wEnd=wheel.indexOf("  async function renderMoneyTotalScreen()",wStart);
assert.ok(wStart>0 && wEnd>wStart);
const full={children:[],appendChild(el){this.children.push(el);el.parentNode=this;}};
const inner={children:[],appendChild(el){this.children.push(el);el.parentNode=this;}};
const sleeps=[];let prizeCalls=0;
const wCtx={CLOCK_IMAGE:"clock.png",document:{
  querySelector:s=>s===".wob-root"?full:s===".wob-card"?inner:null,
  createElement:tag=>{assert.equal(tag,"div");return {
    className:"",innerHTML:"",classList:{add(){}},
    remove(){this.parentNode.children=this.parentNode.children.filter(el=>el!==this);}
  };}
},sleep:ms=>{sleeps.push(ms);return Promise.resolve();},playPrize:()=>{prizeCalls++;}};
vm.runInNewContext(wheel.slice(wStart,wEnd)+
  "\nthis.popups={showTimesUpPopup,showVerseCompletePopup};",wCtx);
(async()=>{
  const up=wCtx.popups.showTimesUpPopup();
  assert.equal(full.children.length,1);
  assert.equal(inner.children.length,0,"not clipped to central game card");
  assert.ok(full.children[0].innerHTML.includes("Time’s Up!"));
  await up;
  assert.equal(full.children.length,0);
  const done=wCtx.popups.showVerseCompletePopup();
  assert.equal(full.children.length,1);
  assert.equal(inner.children.length,0);
  await done;
  assert.equal(full.children.length,0,"no overlay intercepts later controls");
  assert.equal(prizeCalls,2);
  assert.equal(sleeps.join(","),"2500,320,2500,320");

  // One continuous full-height starfield; retain old playable dimensions and
  // bottom safe-area padding; remove tablet board rounded corners.
  assert.ok(rules(launchCss,".vl-root").includes("var(--vl-starfield-main)"));
  assert.ok(rules(launchCss,".vl-game-wrap").includes("padding: 0 0 var(--vl-game-bottom-pad);"));
  assert.ok(rules(launchCss,".vl-game-board").includes("background: transparent;"));
  assert.match(launchCss,/@media \(min-width: 700px\)[\s\S]*?\.vl-game-board\s*\{\s*border-radius: 0;/);

  // Reuse existing prepacked game icons on post-bonus dialogs.
  for(const [id,prefix,code,css] of [
    ["versey_bird","vb2",bird,birdCss],["dino_dash","dd2",dino,dinoCss]
  ]) {
    assert.ok(fs.existsSync(path.join(root,"verse_images/game_icons/app_icon_"+id+".png")));
    assert.ok(code.includes("gameIconImageHtmlForId(GAME_ID, GAME_ICON,"));
    assert.ok(code.includes('<div class="'+prefix+'-result-icon" aria-hidden="true">$'+'{GAME_ICON_HTML}</div>'));
    const popup=code.slice(code.indexOf("  function showBonusResult(){"));
    assert.ok(popup.includes("Continue</button>"));
    const icon=rules(css,"."+prefix+"-result-icon");
    assert.ok(icon.includes("width: clamp(52px, 12vw, 82px);"));
    assert.ok(icon.includes("pointer-events: none;"));
    assert.ok(rules(css,"."+prefix+"-result-icon .vm-game-icon-img").includes("object-fit: contain;"));
    const card=rules(css,"."+prefix+"-result-card");
    assert.ok(card.includes("max-height: calc(100% - 16px);"));
    assert.ok(card.includes("overflow-y: auto;"));
    assert.ok(css.includes("."+prefix+"-result-layer[hidden]"));
  }
  console.log("IP05 PASS: seven visual contracts; real Bounce grammar and Wheel overlay mount/lifecycle; original completion buttons and safe-area layout");
})().catch(e=>{console.error(e);process.exitCode=1;});
