#!/usr/bin/env node
"use strict";
// IP10 tests executable production fifth-round helpers and score/pointer
// transitions with a synthetic DOM. Real iPad/WebKit imagery is owner-tested.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p), "utf8");
const game = read("verse_games/verse_scramble_neo/game.js");
const css = read("verse_games/verse_scramble_neo/game.css");
const launch = read("verse_games/verse_launch/game.js");
const launchCss = read("verse_games/verse_launch/game.css");
const workflow = read(".github/workflows/ios-prep-validation.yml");
new vm.Script(game, {filename:"verse_scramble_neo/game.js"});
new vm.Script(launch, {filename:"verse_launch/game.js"});
function part(source, start, end) {
  const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,"expected source markers: "+start);
  return source.slice(a,b);
}
function rule(source, selector) {
  const at=source.indexOf(selector+" {");
  assert.ok(at>=0,"CSS selector "+selector);
  const end=source.indexOf("}",at);
  return source.slice(at,end+1);
}
assert.match(workflow,/node scripts\/validate_ip10_scramble_picture_hunt\.js/);

const pictures=Array.from(
  part(game,"const BONUS_PICTURE_VERSE_IDS = [","];")
    .matchAll(/"([^"]+)"/g), m=>m[1]
);
assert.equal(pictures.length,125,"expanded fixed, distinct bundled public picture catalog");
assert.equal(new Set(pictures).size,pictures.length);
assert.ok(!pictures.includes("fallback"));
for(const id of pictures){
  assert.match(id,/^[a-z0-9_]+$/);
  assert.ok(fs.existsSync(path.join(root,"profile_pictures",`profile_picture_${id}.png`)),
    "bundled public pet art exists: "+id);
}
const selection=part(game,"function bonusPictureSeed() {","function startBonusIntro() {");
assert.doesNotMatch(selection.replace(/\/\/[^\n]*/g,""),/localStorage|sessionStorage|profileId|zookeeper|fetch\(/i,
  "selection must never depend on private child profiles or network");
assert.match(game,/prepareBonusPictureRound\(\);\s*render\(\);[\s\S]*?runBonusIntro\(token\)/,
  "art starts warming in bonus intro, not on a timer or after round five begins");
assert.match(game,/if \(state\.bonusRound < 5\) \{[\s\S]*?state\.bonusTargetLetter = randomItem\(LETTERS\);/,
  "letter selection retained for rounds 1-4");
assert.match(game,/if \(state\.bonusRound === 5 && state\.bonusPictureTarget\) \{\s*return makeBonusPictureTiles\(\);/,
  "only round five builds image tiles");
assert.match(game,/state\.bonusDeadline = gameNow\(\) \+ bonusTimeWithWiggle\(\);/,
  "all bonus rounds use unchanged existing deadline");
assert.match(game,/const targetBtn = visibleBonusButtons\(true\)\[0\];/,
  "computer continues to race for the real single target");
assert.match(game,/targetOnly \? tile\.isBonusTarget : !tile\.isBonusTarget/,
  "pointer filters photo buttons through the same target contract");
assert.match(game,/const pictureRound = state\.bonusActive && state\.bonusRound === 5/,
  "distinct picture CSS and accessible field label scoped to fifth only");
assert.match(game,/id="vsnLetterField" aria-label="\$\{pictureRound \? "Pet pictures:/,
  "a11y labels match the visual round");
assert.match(game,/In round 5, find the matching pet picture!/);

function harness(mode="easy",verseId="john_3_16",randomFraction=0.15) {
  const imageLoads=[];
  class FakeImage {
    set src(value){this.value=value;imageLoads.push(value);}
    get src(){return this.value;}
  }
  const state={
    bonusActive:true,bonusRound:5,bonusStage:"round",bonusPictureChoices:[],
    bonusPictureTarget:null,bonusTargetLetter:"A",bonusTargetColor:"#ff5a51",
    bonusTargetShade:"#803020",tileSeed:0,bonusRoundToken:9,tiles:[],
    bonusPlayerWins:0,bonusPointerWins:0,bonusDeadline:5000,
    busy:false,menuOpen:false,helpOpen:false,bonusResultText:"",bonusResultKind:""
  };
  const testMath=Object.create(Math);
  testMath.random=()=>randomFraction;
  const ctx={
    state,ctx:{verseId},selectedMode:mode,Image:FakeImage,Math:testMath,
    BONUS_PICTURE_VERSE_IDS:pictures,
    PROFILE_PICTURE_DIR:"../../profile_pictures/",
    PROFILE_PICTURE_FALLBACK_SRC:"../../profile_pictures/profile_picture_fallback.png",
    document:{getElementById:()=>null},
    MAGNET_COLORS:["#ff5a51","#ffa351","#ffc751"],LETTERS:["A","B","C","D"],
    randomItem:values=>values[0],
    bonusNearMatchCounts:()=>({sameLetterWrongColor:1,sameColorWrongLetter:1}),
    darkenHexColor:()=>"#882020",
    shuffle:values=>values.slice().reverse(),
    escapeHtml:text=>String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
  };
  vm.createContext(ctx);
  vm.runInContext("let bonusPicturePreloads=[];\n"+
    part(game,"function introLetterHtml(ch, index){","function renderInstructionHtml(")+
    selection+
    part(game,"function renderBonusFindHtml(){","function renderBonusFinalHtml(){")+
    part(game,"function makeBonusPictureTiles() {","function renderBonusPointerHtml() {")+
    part(game,"function renderScrambleTileHtml(tile) {","function renderGame(){")+
    "\nthis.ip10={bonusPictureSeed,prepareBonusPictureRound,makeBonusTiles,"+
    "renderBonusFindHtml,renderBonusTargetHtml,renderScrambleTileHtml};",ctx);
  return {ctx,state,api:ctx.ip10,imageLoads};
}
for(const [mode,count] of [["easy",28],["medium",28],["hard",28]]){
  const h=harness(mode);
  h.api.prepareBonusPictureRound();
  assert.equal(h.state.bonusPictureChoices.length,pictures.length,mode+" full art catalog");
  assert.ok(h.imageLoads.length===28||h.imageLoads.length===29,
    mode+" bounded image prewarm including target");
  assert.equal(new Set(h.state.bonusPictureChoices.map(p=>p.src)).size,pictures.length);
  const repeated=harness(mode,"john_3_16",0.82);
  repeated.api.prepareBonusPictureRound();
  assert.equal(
    h.state.bonusPictureChoices.map(p=>p.src).join("|"),
    repeated.state.bonusPictureChoices.map(p=>p.src).join("|"),
    "selection deterministic for the same public verse");
  assert.notEqual(h.state.bonusPictureTarget.src,repeated.state.bonusPictureTarget.src,
    "replaying same verse selects a fresh randomized target");
  const round=h.api.makeBonusTiles();
  h.state.tiles=round;
  assert.equal(round.length,count,mode+" photo tiles with missing layout probe fallback");
  assert.ok(round.every(t=>t.isBonusPicture&&t.pictureSrc.startsWith("../../profile_pictures/")));
  assert.equal(round.filter(t=>t.isBonusTarget).length,1,"exactly one real picture target");
  assert.equal(round.filter(t=>t.source==="bonus-decoy").length,count-1);
  assert.equal(new Set(round.map(t=>t.pictureSrc)).size,count,"no duplicate target image");
  assert.equal(round.find(t=>t.isBonusTarget).pictureSrc,h.state.bonusPictureTarget.src);
  const html=h.api.renderScrambleTileHtml(round[0]);
  assert.match(html,/vsn-bonus-picture-tile/);
  assert.match(html,/data-tile-id=/);
  assert.match(html,/aria-label="Pet picture [0-9]+"/);
  assert.match(html,/<img src="\.\.\/\.\.\/profile_pictures\/profile_picture_/);
  assert.doesNotMatch(html,/vsn-profile-magnet|vsn-profile-magnet-frame|profile-border|border-radius/);
  assert.match(h.api.renderBonusFindHtml(),/vsn-bonus-find-picture/);
  assert.match(h.api.renderBonusFindHtml(),/Find the matching pet picture/);
  assert.match(h.api.renderBonusTargetHtml(),/vsn-bonus-picture-target/);
  assert.match(h.api.renderBonusTargetHtml(),/Pet picture [0-9]+/);
  assert.doesNotMatch(h.api.renderBonusTargetHtml(),/<span>Find:<\/span>/,
    "round-five target note shows picture only");
  for(let roundIndex=1;roundIndex<=4;roundIndex++){
    h.state.bonusRound=roundIndex;
    h.state.bonusTargetLetter="A";
    h.state.bonusTargetColor="#ff5a51";
    const letters=h.api.makeBonusTiles();
    assert.equal(letters.length,110,mode+" original letter count");
    assert.equal(letters.filter(t=>t.isBonusTarget).length,1);
    assert.ok(letters.every(t=>!t.isBonusPicture),
      "rounds 1–4 stay exactly letter/color magnets");
    assert.match(h.api.renderBonusFindHtml(),/vsn-bonus-find-letter/);
    assert.doesNotMatch(h.api.renderBonusFindHtml(),/vsn-bonus-find-picture/);
    h.state.bonusStage="round";
    assert.match(h.api.renderBonusTargetHtml(),/vsn-bonus-target-letter/);
  }
}

const pictRule=rule(css,".vsn-bonus-active .vsn-magnet.vsn-bonus-picture-tile");
for(const x of ["border: 0","border-radius: 0","background: transparent",
  "box-shadow: none","text-shadow: none","filter: none"]) assert.ok(pictRule.includes(x),x);
const imgRule=rule(css,".vsn-bonus-picture-tile img");
assert.match(imgRule,/object-fit: contain/);
assert.match(imgRule,/border:\s*0/);
assert.match(imgRule,/border-radius:\s*0/);
assert.match(imgRule,/pointer-events:\s*none/);
assert.doesNotMatch(imgRule,/object-fit:\s*cover|clip-path|border-radius:\s*[1-9]/);
assert.match(css,/\.vsn-bonus-picture-round \.vsn-target-note/);
assert.match(css,/\.vsn-bonus-picture-round \.vsn-letter-field:not\(\.is-message-field\)/);
assert.match(css,/\.vsn-bonus-active \.vsn-magnet\.vsn-bonus-picture-tile\s*\{\s*width: clamp\(46px, 11\.7vw, 54px\)/,
  "phone tap buttons remain >=44px");
assert.match(css,/\.vsn-bonus-picture-tile:focus-visible/);
assert.match(game,/btn\.addEventListener\("pointerdown", \(event\) =>/);
assert.match(game,/btn\.addEventListener\("click", \(event\) =>/,
  "existing keyboard/assistive click fallback retained");
assert.match(game,/if \(tile\.isBonusTarget\) \{\s*resolveBonusRound\("player", btn\)/);

async function testOriginalBonusHitAccounting(){
  const h=harness("medium");
  h.api.prepareBonusPictureRound();
  h.state.tiles=h.api.makeBonusTiles();
  let sounds=[],shakes=0,advances=0;
  const context=h.ctx;
  context.returnPaused=false;context.nativeScrambleAudio=null;
  context.nativeScramblePending=false;context.nativeScrambleFrozen=false;
  context.nativeScrambleFailure=false;
  context.unlockAudio=()=>{};
  context.gameNow=()=>1000;
  context.shakeElement=()=>{shakes++;};
  context.playGameSound=k=>{sounds.push(k);};
  context.sleep=async()=>{};
  context.waitUntilGameActive=async()=>{};
  context.renderBonusResultHtml=()=>'<div>Winner</div>';
  context.startBonusRound=()=>{advances++;};
  context.document={getElementById:()=>null};
  vm.runInContext(part(game,"function handleBonusTileTap(btn) {",
    "function startBonusPointerLoop() {")+
    part(game,"function tileObjectForButton(btn){",
      "function collectProfileRewardMagnet(")+
    "\nthis.hit={handleBonusTileTap,resolveBonusRound};",context);
  function button(tile){
    const cls=new Set();
    return {dataset:{tileId:tile.id},disabled:false,
      classList:{contains:name=>cls.has(name),add:(...names)=>names.forEach(n=>cls.add(n))}};
  }
  const wrong=button(h.state.tiles.find(t=>!t.isBonusTarget));
  context.hit.handleBonusTileTap(wrong);
  assert.equal(h.state.bonusDeadline,4000,"wrong picture uses original clock penalty");
  assert.equal(shakes,1);
  assert.equal(h.state.bonusPlayerWins,0);
  const target=button(h.state.tiles.find(t=>t.isBonusTarget));
  context.hit.handleBonusTileTap(target);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.state.bonusPlayerWins,1);
  assert.equal(h.state.bonusPointerWins,0);
  assert.equal(advances,1,"one and only one following round");
  assert.equal(target.disabled,true);
  assert.equal(h.state.busy,false);
  assert.ok(sounds.includes("bonusYouWin"));
  h.state.tiles=h.api.makeBonusTiles();h.state.busy=false;
  await context.hit.resolveBonusRound("pointer",button(h.state.tiles.find(t=>t.isBonusTarget)));
  assert.equal(h.state.bonusPointerWins,1);
  assert.equal(advances,2,"computer races for the same correct picture");
  assert.ok(sounds.includes("bonusIWin"));
}
function testLaunchPopup(){
  const chooser=part(launch,"function renderAstroSteeringChoice() {",
    "function showAstroSteeringChoice(message = \"\") {");
  const ctx={state:{astroControlPhase:"choose",astroControlMessage:""},
    astroInput:{controlMode:null},escapeHtml:text=>String(text)};
  vm.runInNewContext(chooser+"\nthis.render=renderAstroSteeringChoice;",ctx);
  const initial=ctx.render();
  assert.match(initial,/vl-steering-option no-zoom/);
  assert.match(initial,/Choose Controls/);
  for(const choice of ["tilt","drag"]){
    ctx.state.astroControlPhase="instructions";
    ctx.astroInput.controlMode=choice;
    const second=ctx.render();
    assert.match(second,/class="vl-steering-option vl-steering-selected-card"/,
      "second uses the same rounded white option card");
    assert.match(second,new RegExp("dq_feed_control_"+choice+"\\.png"));
    assert.match(second,new RegExp(choice==="tilt"
      ? "Tilt your device to dodge asteroids"
      : "Drag your finger to dodge asteroids"));
    assert.match(second,/<span>(Tilt|Drag)<\/span>/);
    assert.match(second,/Got It!/);
  }
  const common=rule(launchCss,".vl-steering-option");
  assert.match(common,/border-radius:\s*22px/);
  assert.match(common,/background:\s*#fff/);
  assert.match(launchCss,/\.vl-steering-option img,\s*\.vl-steering-selected-icon\s*\{[^}]*width:\s*min\(100%, 132px\);[^}]*height:\s*clamp\(90px, 16vh, 124px\);/s);
  assert.match(launchCss,/\.vl-steering-selected-card\s*\{[^}]*width:\s*calc\(\(100% - var\(--vl-steering-option-gap\)\) \/ 2\);/s,
    "second is exactly one initial two-column choice width");
  assert.match(launchCss,/\.vl-steering-instructions p\s*\{[^}]*font:\s*900 clamp\(21px, 5\.5vw, 30px\)\/1\.1/);
  assert.match(rule(launchCss,".vl-steering-instructions p"),/text-wrap:\s*balance/);
  assert.match(launchCss,/\.vl-steering-option img,\s*\.vl-steering-selected-icon\s*\{ height:\s*62px;/);
}
(async()=>{
  await testOriginalBonusHitAccounting();
  testLaunchPopup();
  console.log("IP10 PASS: rounds 1–4 intact; round 5 distinct bundled unframed art/preview, matching keyboard/touch labels, original pointer/win/deadline accounting, and matching Verse Launch two-stage rounded popup visuals.");
})().catch(err=>{console.error(err);process.exitCode=1;});
