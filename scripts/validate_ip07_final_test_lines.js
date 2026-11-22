#!/usr/bin/env node
"use strict";
// IP07: run the production Final Test renderer and font-fitting logic against
// a synthetic DOM/canvas. Real iPad font rasterization still needs owner QA.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
function between(s, a, b) {
  const i = s.indexOf(a), j = s.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, "production markers: " + a);
  return s.slice(i, j);
}
const renderer = between(app, "function finalRecallNode(showVerse = false) {",
  "function instructionAudioFile(key) {");
const fitter = between(app, "function getSmartLearnLineHeight(",
  "/* =========================\n    4. Verse Loading");
assert.match(app, /return first \+ "_"\.repeat\(restLen\);/, "old Remove Words blanks preserved");
assert.ok(!renderer.includes("underscoresForWord("), "Final Test never emits underscore glyphs");
assert.match(renderer, /if \(showVerse\)\s*\{\s*node = document\.createTextNode\(t\.text\)/);
assert.match(renderer, /line\.setAttribute\("aria-hidden", "true"\)/);
assert.match(renderer, /line\.dataset\.finalTokenIndex = String\(i\)/);
assert.match(css, /\.learn-verse\.missing-words-theme \.final-recall-missing-word\s*\{[^}]*white-space:\s*nowrap;/s);
assert.match(css, /\.learn-verse\.missing-words-theme \.final-recall-remaining-line\s*\{[^}]*display:\s*inline-block;[^}]*border-bottom:\s*0\.065em solid currentColor;/s);
assert.match(css, /\.learn-verse \.learn-token-with-punctuation\s*\{[^}]*white-space:\s*nowrap;/s);
const charWidth = c => ({i:25,l:30,I:30,m:81,w:77,M:87,W:87,f:39,t:40,r:39,j:33,"'":22}[c] || (/[A-Z]/.test(c) ? 69 : 53));
const measuredWidth = text => [...text].reduce((sum,c) => sum + charWidth(c), 0);
function makeStyle() {
  const props = new Map();
  return {width:"",maxWidth:"",
    setProperty(k,v) {props.set(k,String(v));},
    getPropertyValue(k) {return props.get(k) || "";}};
}
function makeNode(tag, text="") {
  const el = {tag, childNodes:[], attrs:{}, dataset:{}, style:makeStyle(), className:"",
    appendChild(child) {this.childNodes.push(child);return child;},
    setAttribute(k,v) {this.attrs[k]=String(v);},
    getAttribute(k) {return this.attrs[k] ?? null;},
    get classList() {return {contains: c => this.className.split(/\s+/).includes(c)};},
    get textContent() {return tag === "#text" ? this.raw : this.childNodes.map(n=>n.textContent).join("");},
    set textContent(t) {if(tag === "#text") this.raw=String(t);else this.childNodes=[makeNode("#text",String(t))];}
  };
  if(tag === "#text")el.raw=text;
  return el;
}
function find(el, cls, result=[]) {
  if(el.className && el.className.split(/\s+/).includes(cls))result.push(el);
  for(const c of el.childNodes || []) find(c,cls,result);
  return result;
}
function harness(text) {
  const Type={SPACE:"space",WORD:"word",PUNCT:"punct",OTHER:"other"};
  const tokens=(text.match(/(\s+|[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]+)/g)||[]).map(t=>({
    text:t,type:/^\s+$/.test(t)?Type.SPACE:
    /^(?:[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+)$/.test(t)?Type.WORD:Type.PUNCT
  }));
  const canvas = {font:"",measureText: t => ({width:measuredWidth(t)})};
  const document = {
    createElement: tag => tag==="canvas"?{getContext:()=>canvas}:makeNode(tag),
    createTextNode:t=>makeNode("#text",t)
  };
  const window={getComputedStyle:el=>({
    fontStyle:"normal",fontWeight:"900",fontFamily:'"Baloo 2", system-ui',
    paddingLeft:el.isStage?"10px":"0",paddingRight:el.isStage?"10px":"0",
    paddingTop:el.isStage?"12px":"0",paddingBottom:el.isStage?"12px":"0"
  })};
  const ctx={document,window,TokenType:Type,tokens,
    isTrailingLearnPunctuation:t=>t?.type===Type.PUNCT&&/^[,.;:!?%…)\]}]+(?:["”’]+)?$/.test(t.text),
    console};
  vm.runInNewContext(renderer+fitter+"\nthis.renderFinal=finalRecallNode;this.fitFinal=fitSmartLearnText;this.measureFinal=measureFinalRecallUnderlines;",ctx);
  return {ctx,tokens,canvas,text};
}
function makeFitBlock(h,verse,width,height) {
  const stage={isStage:true,clientWidth:width,clientHeight:height};
  const body={textContent:verse.textContent};
  const block={style:makeStyle(),classList:{contains:c=>c==="smart-learn-text-final"},
    getAttribute:k=>k==="data-smart-fit-text"?h.text:null,
    closest:sel=>sel===".learn-stage"?stage:null,
    querySelector:sel=>sel===".smart-learn-body"?body:
      sel===".final-recall-missing-word"?find(verse,"final-recall-missing-word")[0]:null,
    querySelectorAll:sel=>sel===".final-recall-remaining-line"?find(verse,"final-recall-remaining-line"):[],
    get scrollWidth() {return 0;},
    get scrollHeight() {
      const size=parseFloat(this.style.getPropertyValue("--smart-font-size"))||40;
      const available=parseFloat(this.style.width)||width;
      let rowWidth=0,rows=1;
      for(const t of h.tokens) {
        if(t.type!== "word")continue;
        const n=[...t.text].length-1;
        const widthEm=0.6+(n?measuredWidth([...t.text].slice(1).join(""))/100+n*.02:0)+.35;
        const required=widthEm*size;
        if(rowWidth+required>available && rowWidth>0){rows++;rowWidth=0;}
        rowWidth+=required;
      }
      return (rows+1)*size*1.12+24;
    }
  };
  return {root:{querySelectorAll:sel=>sel==="[data-smart-learn-text]"?[block]:[]},block,stage};
}
const h=harness("Bible, I am the way. We'll go 42 times!");
const hidden=h.ctx.renderFinal(false);
const words=h.tokens.filter(t=>t.type==="word");
const spans=find(hidden,"final-recall-missing-word");
const lines=find(hidden,"final-recall-remaining-line");
assert.equal(spans.length,words.length);
assert.equal(lines.length,words.filter(w=>w.text.length>1).length);
assert.equal(spans[0].textContent,"B");
assert.equal(spans[0].attrs["aria-label"],"B, 4 letters missing");
assert.equal(lines[0].style.width,"2.20em","four missing letters × fallback factor");
assert.equal(lines[0].dataset.finalTokenIndex,"0");
assert.equal(lines[0].attrs["aria-hidden"],"true");
assert.ok(!hidden.textContent.includes("Bible"));
assert.ok(!hidden.textContent.includes("We'll"));
assert.equal(find(hidden,"learn-token-with-punctuation").length,3,
  "punctuation stays joined to same word");
assert.equal(spans.find(x=>x.textContent==="I").childNodes.length,1,
  "one-letter words must not grow phantom lines");
const revealed=h.ctx.renderFinal(true);
assert.equal(revealed.textContent,"Bible, I am the way. We'll go 42 times!");
assert.equal(find(revealed,"final-recall-remaining-line").length,0);

const testBlock=makeFitBlock(h,hidden,768,700);
h.ctx.measureFinal(testBlock.block);
assert.equal(h.canvas.font,'normal 900 100px "Baloo 2", system-ui');
assert.equal(lines[0].style.width,
  (measuredWidth("ible")/100+4*.02).toFixed(3)+"em");
for(const line of lines) {
  const text=h.tokens[Number(line.dataset.finalTokenIndex)].text;
  const rest=[...text].slice(1).join("");
  const ratio=measuredWidth(rest)/100+rest.length*.02;
  assert.equal(line.style.width,ratio.toFixed(3)+"em",
    "measured hidden glyph advance for "+text);
  for(const px of [18,42,80])
    assert.ok(Math.abs(parseFloat(line.style.width)*px-ratio*px)<.05,
      "em sizing scales with fitted font at "+px+"px");
}
for(const [text,w,ht] of [
  ["Bible is true.",320,568],
  ["Bible is true.",768,1024],
  ["We love the Lord, for he is good and his love endures forever.",375,660],
  ["We love the Lord, for he is good and his love endures forever.",844,390],
  [("Whoever believes in him will not perish but have eternal life. ").repeat(3),390,640],
  [("Whoever believes in him will not perish but have eternal life. ").repeat(3),1024,768]
]) {
  const variant=harness(text),p=variant.ctx.renderFinal(false);
  const {root,block,stage}=makeFitBlock(variant,p,w,ht);
  variant.ctx.fitFinal(root);
  const size=parseFloat(block.style.getPropertyValue("--smart-font-size"));
  assert.ok(size>=18&&size<=104,"existing bounded smart-fit search");
  assert.ok(parseFloat(block.style.width)<=stage.clientWidth);
  assert.ok(block.scrollHeight<=stage.clientHeight+2||size===18,
    "stage height or existing 18px minimum");
  assert.ok(find(p,"final-recall-remaining-line").every(el=>el.style.width.endsWith("em")));
  assert.equal(variant.ctx.renderFinal(true).textContent,text);
}
const originalCreate=h.ctx.document.createElement;
h.ctx.document.createElement=tag=>tag==="canvas"?{getContext:()=>null}:originalCreate(tag);
lines[0].style.width="2.20em";
h.ctx.measureFinal(testBlock.block);
assert.equal(lines[0].style.width,"2.20em","canvas missing retains fallback");
console.log("IP07 PASS: first-letter-only real DOM, one measured continuous line per word, punctuation, screen-reader hint, reveal semantics, 6 simulated layouts, font-scale invariance, Canvas fallback, Remove Words isolation.");
