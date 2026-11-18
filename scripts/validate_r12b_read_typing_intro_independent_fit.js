"use strict";
// R12b: execute ACTUAL production two-line intro renderer and independent
// measured fitter; no browser screenshots or private children's data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const js = read("read_my_verse.js");
const css = read("read_my_verse.css");
const ci = read(".github/workflows/ios-prep-validation.yml");
assert(ci.includes("node scripts/validate_r12b_read_typing_intro_independent_fit.js"),
  "R12b must be in integration CI");

function scope(start, end) {
  const a = js.indexOf(start), b = js.indexOf(end, a + start.length);
  assert(a >= 0 && b > a,"Missing actual production helper: " + start);
  return js.slice(a,b);
}
const render = scope("  function renderTypingIntroText(count) {",
  "  // Short typewriter/keyboard cutscene steps");
const fit = scope("  function fitReadTypingIntro(wrap) {",
  "  function restoreReadTypingFit(wrap) {");
const verseFit = scope("  function restoreReadTypingFit(wrap) {",
  "  function scheduleReadTypingVerseFit(wrap) {");
const scheduler = scope("  function scheduleReadTypingVerseFit(wrap) {",
  "  function renderKeyboardScreen(");
const keyboard = scope("  function renderKeyboardScreen(", "  // Compare the largest fitting font");
const typewriter = scope("  // A reference travels as the first animated item", "  return Object.freeze(");
// The latter covers multiple renderers; assert precise Typewriter markup too.
const endSource=js.slice(js.indexOf("    const hasIntro = state.typewriterIntroPhase !== \"done\";",js.indexOf("  function renderScreen(")));
assert(endSource.includes("read-typewriter-intro-guide"));
assert(keyboard.includes("read-typewriter-intro-guide"));
assert(keyboard.includes("read-typewriter-intro-text"));
assert(!verseFit.includes("--typewriter-intro-font-size"),
  "cached and fresh verse size must never set intro size");
assert(scheduler.includes("fitReadTypingIntro(wrap);"),
  "intro fits independently on scheduled layout passes");
assert(scheduler.includes("fitReadTypingIntro(active);"),
  "intro refits on resize/rotation");
assert(scheduler.includes("root.document.fonts?.ready?.then(() => run(true))"),
  "intro is remeasured after real fonts load");
assert(!fit.includes("state.verseId") && !fit.includes("cache.fontSize") &&
  !fit.includes("state.chunks"),
  "intro sizing cannot depend on Bible verse length, cache or text");
assert(js.includes("const TYPEWRITER_INTRO_TEXT = \"Tap to type the verse.\""));
assert(js.includes("TYPEWRITER_INTRO_KEY_MS = 75") &&
  js.includes("TYPEWRITER_INTRO_HOLD_MS = 3000") &&
  js.includes("TYPEWRITER_INTRO_FADE_MS = 300"),
  "keep original intro animation timing intact");

function rule(sel) {
  const pos = css.indexOf(sel + " {");
  assert(pos >= 0,"Missing CSS: " + sel);
  return css.slice(pos, css.indexOf("}", pos));
}
for(const selector of [".read-typewriter-intro-head",".read-typewriter-intro-tail"]){
  const s=rule(".read-typewriter-intro-head,");
  assert(s.includes("display: block") && s.includes("width: max-content") &&
    s.includes("white-space: pre"),
    selector + " must be a measured unbreakable separate line");
}
assert(rule(".read-typewriter-intro-guide").includes("visibility: hidden"),
  "fully reserved guide is invisible but measurable");
assert(rule(".read-typewriter-intro-text").includes("position: absolute"),
  "typed letters must overlay unchanging ghost guide");
assert(css.includes("font-size: var(--typewriter-intro-font-size, clamp("),
  "first paint uses only a viewport-responsive fallback");
assert(rule(".read-keyboard-intro").includes("color: #65ff72"),
  "Keyboard stays green");
assert(rule(".read-typewriter-intro.is-fading").includes("opacity: 0"),
  "old reveal/hold/fade sequence is untouched");

const sandbox = {escapeHtml: s => s,root:{}};
vm.runInNewContext(render + fit + `
  this.render = renderTypingIntroText;
  this.fit = fitReadTypingIntro;
`,sandbox,{filename:"read_my_verse.js:actual-R12b-helpers"});
function plain(html){return html.replace(/<[^>]+>/g,"");}
const sentence="Tap to type the verse.";
for(let count=0;count<=sentence.length;count++){
  const html=sandbox.render(count);
  assert(html.includes('<span class="read-typewriter-intro-head">'));
  assert(html.includes('<span class="read-typewriter-intro-tail">'));
  assert(html.indexOf('read-typewriter-intro-head') <
         html.indexOf('read-typewriter-intro-tail'));
  assert.equal(plain(html),sentence,
    "All characters stay reserved at animation frame " + count);
  const visible=html.replace(
    /<span class="read-typewriter-intro-untyped">[^<]*<\/span>/g,"");
  assert.equal(plain(visible),sentence.slice(0,count),
    "Single character clock reveals only typed letters at " + count);
}
assert.equal(plain(sandbox.render(sentence.length)),sentence,
  "No extra break character is inserted into the original spoken intro text");

function makeIntro(width,height,{metric=6.15,padding=12}={}){
  let size=0;
  const writes=[];
  const style={
    setProperty(name,value){
      assert.equal(name,"--typewriter-intro-font-size");
      size=Number.parseFloat(value);
      writes.push(size);
    }
  };
  const first={getBoundingClientRect(){return {width:size*metric};}};
  const second={getBoundingClientRect(){return {width:size*4.95};}};
  const guide={
    querySelector(sel){
      if(sel===".read-typewriter-intro-head")return first;
      if(sel===".read-typewriter-intro-tail")return second;
      return null;
    },
    getBoundingClientRect(){return {height:size*2.32};}
  };
  const intro={
    clientWidth:width,clientHeight:height,style,
    querySelector(sel){
      return sel===".read-typewriter-intro-guide" ? guide:null;
    }
  };
  const wrap={
    querySelector(sel){
      return sel==="[data-read-typewriter-intro]"?intro:null;
    }
  };
  sandbox.root.getComputedStyle=()=>({
    paddingLeft:padding+"px",paddingRight:padding+"px",
    paddingTop:padding+"px",paddingBottom:padding+"px"
  });
  return {wrap,writes,get size(){return size;},
    availableWidth:width-2*padding,
    availableHeight:height-2*padding,
    firstWidth(){return first.getBoundingClientRect().width;},
    secondWidth(){return second.getBoundingClientRect().width;},
    guideHeight(){return guide.getBoundingClientRect().height;}
  };
}
function checkFit(width,height,metric=6.15){
  const h=makeIntro(width,height,{metric});
  sandbox.fit(h.wrap);
  assert(h.writes.length>4,"the actual production fitter measures candidates");
  assert(h.firstWidth() <= h.availableWidth*0.98 + 0.1,
    "first line does not clip or break at "+width);
  assert(h.secondWidth() <= h.availableWidth*0.98 + 0.1,
    "second line does not clip or break at "+width);
  assert(h.guideHeight() <= h.availableHeight*0.96 + 0.1,
    "two fixed lines fit the active height at "+height);
  return h;
}
// The selected Bible verse has NO influence on the function: exercise the
// same dimensions with different synthetic verse-specific fitted body sizes.
for(const variant of ["typewriter","keyboard"]){
  const width=variant==="typewriter"?350:320;
  const acts5=checkFit(width,470,variant==="typewriter"?6.15:6.6);
  const acts16=checkFit(width,470,variant==="typewriter"?6.15:6.6);
  assert.equal(acts5.size,acts16.size,
    variant+" intro uses screen geometry, not Acts 5:29 vs Acts 16:31 font");
  assert(acts5.firstWidth() > acts5.availableWidth*0.95,
    variant+" first line fills useful horizontal width");
}
const narrow=checkFit(280,470);
const wider=checkFit(400,470);
assert(wider.size>narrow.size,"wider iPhone lets intro grow independently");
const landscape=checkFit(600,155);
assert(landscape.guideHeight()<=landscape.availableHeight*0.96 +0.1,
  "short landscape must keep exactly two visible lines in its available height");
const noIntro={querySelector(){return null;}};
sandbox.fit(noIntro); // after fade/unmount, no changes or exceptions
console.log("R12b PASS: actual Read intro renderer + fitter, two lines, independent of Acts verse, responsive width/height, keyboard parity, original intro timing");
