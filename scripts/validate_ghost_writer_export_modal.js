"use strict";
// Native Ghost Writer's purple export modal: test the *real* controller
// with a minimal fake DOM, not a reimplementation of its state machine.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const source = read("verse_playground/ghost_writer/export-dialog.js");
const game = read("verse_playground/ghost_writer/game.js");
const css = read("verse_playground/ghost_writer/game.css");
const html = read("verse_playground/ghost_writer/index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");

assert.match(workflow, /node scripts\/validate_ghost_writer_export_modal\.js/);
assert.match(html, /src="\.\/export-dialog\.js"[\s\S]*?src="\.\/game\.js"/);
assert.match(game, /ghostExportOverlayHtml\(\)[\s\S]*?id="ghostExportOverlay"/);
assert.match(game, /data-ghost-export-dialog tabindex="-1"/);
assert.match(game, /aria-modal="true"/);
assert.match(game, /ghost-writer-root"\)\?\.insertAdjacentHTML\(\s*"beforeend", ghostExportOverlayHtml\(\)/);
assert.match(game, /window\.BibloZooGhostExportDialog\?\.create\?\./);
assert.match(game, /data-ghost-export-retry hidden>Try Again/);
assert.match(game, /data-ghost-export-done hidden>Done!/);
assert.match(game, /data-ghost-export-cancel hidden>Cancel/);
assert.match(game, /id="ghostExportMessage"/);
assert.match(game, /id="ghostSaveVideoBtn"/);
assert.match(game, /id="ghostShareVideoBtn"/);
assert.match(game, /id="ghostShareImageBtn"/);
assert.match(game, /modal\.success\(\)/);
assert.match(game, /modal\.error\(detail\)/);
assert.match(game, /onCancel:\s*\(\)\s*=>\s*\{\s*job\.cancelled = true;/);
assert.match(game, /onRetry:\s*\(\)\s*=>\s*\{\s*void onVideoAction\("photos", saveVideoBtn\);/);
assert.match(game, /if \(stage\?\.phase === "saving"\) modal\.saving\(\)/);
assert.match(game, /modal\.setProgress\(stage\.progress\)/);
assert.match(game, /showProgress\("Making Video\.\.\. " \+ percent \+ "%",\s*\{\s*phase: "making", progress: percent\s*\}\)/);
assert.match(game, /\{ phase: "saving" \}/);
assert.match(game, /result\?\.saved === true[\s\S]*?modal\.success\(\)/);
assert.match(css, /\.ghost-export-dialog\s*\{[^}]*background:\s*#7f66c6/i);
assert.match(css, /\.ghost-export-overlay\s*\{[^}]*background:\s*rgba\(22,\s*14,\s*32,\s*\.83\)/);
assert.match(css, /\.ghost-export-overlay\[hidden\],\s*\.ghost-export-overlay \[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(css, /\.ghost-export-title\s*\{[^}]*flex:\s*0 0 2\.16em/);
assert.match(css, /\.ghost-export-phase-slot\s*\{[^}]*height:\s*67px/);
assert.match(css, /\.ghost-export-action-slot\s*\{[^}]*height:\s*68px/);
assert.match(game, /app_icon_ghost_writer\.png/);
// No new permission/audio/session behavior: the existing add-only PhotoKit
// contract remains exercised in validate_native_ghost_writer_export.js.
assert.doesNotMatch(source,/AVAudioSession|MediaRecorder|PHPhotoLibrary|microphone/i);

function harness() {
  const doc = {hidden:false, activeElement:null, listeners:new Map(),
    addEventListener(event,callback) {this.listeners.set(event,callback);},
    removeEventListener(event,callback) {
      if(this.listeners.get(event)===callback)this.listeners.delete(event);
    },
    key(event) {
      const e={key:event,shiftKey:false,prevented:false,stopped:false,
        preventDefault(){this.prevented=true;},
        stopPropagation(){this.stopped=true;}};
      this.listeners.get("keydown")?.(e);return e;
    }
  };
  function node(name) {
    const attrs = new Map(), events=new Map();
    return {
      name,hidden:false,inert:false,isConnected:true,
      textContent:"",style:{},parentElement:null,
      setAttribute(k,v){attrs.set(k,String(v));},
      getAttribute(k){return attrs.has(k)?attrs.get(k):null;},
      removeAttribute(k){attrs.delete(k);},
      addEventListener(k,fn){events.set(k,fn);},
      click(){events.get("click")?.();},
      focus(){doc.activeElement=this;},
      querySelectorAll(){return [];}
    };
  }
  const keys=[
    "dialog","title","message","progress","bar","percentage",
    "activity","success","actionHint","cancel","done","retry","back","errorActions"
  ];
  const nodes={};
  for(const k of keys) nodes[k]=node(k);
  const overlay=node("overlay");
  overlay.ownerDocument=doc;overlay.hidden=true;
  const selector={
    "[data-ghost-export-dialog]":"dialog",
    "[data-ghost-export-title]":"title",
    "[data-ghost-export-message]":"message",
    "[data-ghost-export-progress]":"progress",
    "[data-ghost-export-bar]":"bar",
    "[data-ghost-export-percentage]":"percentage",
    "[data-ghost-export-activity]":"activity",
    "[data-ghost-export-success]":"success",
    "[data-ghost-export-action-hint]":"actionHint",
    "[data-ghost-export-cancel]":"cancel",
    "[data-ghost-export-done]":"done",
    "[data-ghost-export-retry]":"retry",
    "[data-ghost-export-back]":"back",
    "[data-ghost-export-error-actions]":"errorActions"
  };
  overlay.querySelector=q=>nodes[selector[q]] || null;
  overlay.contains=x=>Object.values(nodes).includes(x);
  const stage=node("stage"),menu=node("menu"),prior=node("prior-button");
  doc.activeElement=prior;
  stage.setAttribute("aria-hidden","false");
  menu.setAttribute("aria-hidden","true");
  const host={children:[menu,stage,overlay]};
  overlay.parentElement=host;
  const timers=new Map();let next=0;
  const win={
    setInterval(fn,ms){const id=++next;timers.set(id,{fn,ms});return id;},
    clearInterval(id){timers.delete(id);}
  };
  vm.runInNewContext(source,{window:win,console},{filename:"export-dialog.js"});
  const dialog=win.BibloZooGhostExportDialog.create(overlay);
  assert(dialog,"factory creates a modal from the real data-hook markup");
  return {dialog,doc,overlay,nodes,stage,menu,prior,timers,
    tick(){for(const {fn} of [...timers.values()])fn();}};
}

const h=harness();
let cancelled=0, retried=0;
assert(h.dialog.open("video",{
  onCancel:()=>{cancelled++;},
  onRetry:()=>{retried++;h.dialog.open("video",{});}
}));
assert(!h.overlay.hidden,"modal visible over the whole game");
assert(h.stage.inert && h.menu.inert,"all background siblings inert");
assert.equal(h.stage.getAttribute("aria-hidden"),"true");
assert.equal(h.menu.getAttribute("aria-hidden"),"true");
assert.equal(h.doc.activeElement,h.nodes.cancel,"first interactive button focused");
assert.equal(h.dialog.phase(),"making");
assert.equal(h.nodes.title.textContent,"Making your video!");
assert(!h.nodes.progress.hidden && h.nodes.activity.hidden);
assert(h.nodes.done.hidden && h.nodes.retry.hidden && h.nodes.back.hidden);
assert(h.nodes.errorActions.hidden,"hidden retry wrapper cannot intercept Cancel");
assert.equal(h.timers.size,1,"one playful-caption interval");
h.dialog.setProgress(47);
assert.equal(h.nodes.bar.style.width,"47%");
assert.equal(h.nodes.progress.getAttribute("aria-valuenow"),"47");
assert.equal(h.nodes.percentage.textContent,"47%");
h.dialog.setProgress(13);
assert.equal(h.nodes.percentage.textContent,"47%","progress never regresses");
h.dialog.setProgress(100);
assert.equal(h.nodes.percentage.textContent,"99%","only confirmed PhotoKit can finish");
const line=h.nodes.message.textContent;
h.tick();
assert.notEqual(h.nodes.message.textContent,line,"playful caption rotates IN PLACE");
assert.equal(h.timers.size,1,"one interval still active");
assert.equal(h.dialog.open("picture",{}),false,"cannot start a second export while busy");

const escape=h.doc.key("Escape");
assert(escape.prevented && escape.stopped && h.dialog.isOpen(),
  "Escape never dismisses in-flight export");
h.nodes.cancel.click();
assert.equal(cancelled,1);
assert.equal(h.dialog.phase(),"stopping");
assert(h.nodes.cancel.hidden && !h.nodes.actionHint.hidden);
assert.equal(h.timers.size,0,"stop rotating during cancellation");
assert(h.stage.inert,"stopping does not expose the background");
h.dialog.close();
assert(h.overlay.hidden && !h.dialog.isOpen());
assert.equal(h.doc.activeElement,h.prior,"focus returns to Save Video after dismissal");
assert.equal(h.stage.inert,false);
assert.equal(h.stage.getAttribute("aria-hidden"),"false");
assert.equal(h.menu.getAttribute("aria-hidden"),"true","original aria-hidden restored");
assert.equal(h.doc.listeners.size,0,"no key trap leaks");
assert.equal(h.timers.size,0,"no timer leaks");

h.dialog.open("video",{});
h.dialog.setProgress(60);
h.dialog.saving();
assert.equal(h.dialog.phase(),"saving");
assert.equal(h.nodes.title.textContent,"Almost there!");
assert.equal(h.nodes.message.textContent,"Putting your masterpiece in Photos...");
assert(h.nodes.progress.hidden && !h.nodes.activity.hidden);
assert(h.nodes.cancel.hidden,"no cancel during PhotoKit transaction");
assert.equal(h.doc.activeElement,h.nodes.dialog,"non-interactive phase focuses dialog");
h.dialog.success();
assert.equal(h.nodes.title.textContent,"You did it! 🎉");
assert.equal(h.nodes.message.textContent,"Your video is saved to Photos!");
assert(!h.nodes.done.hidden && h.nodes.activity.hidden);
assert(h.nodes.errorActions.hidden,"success has only the Done button");
assert.equal(h.doc.activeElement,h.nodes.done);
h.nodes.done.click();
assert(h.overlay.hidden && !h.stage.inert && h.timers.size===0);

h.dialog.open("picture",{onRetry:()=>{retried++;h.dialog.open("picture",{});}});
assert(h.nodes.progress.hidden,"picture save uses indeterminate spinner, no fake percent");
assert(!h.nodes.activity.hidden && h.nodes.cancel.hidden);
assert.equal(h.timers.size,0,"no rotating progress percentages for pictures");
h.dialog.saving();
h.dialog.error("Allow Photos permission in Settings, then Try Again.");
assert.equal(h.nodes.title.textContent,"Oops!");
assert.match(h.nodes.message.textContent,/Photos permission/);
assert(!h.nodes.retry.hidden && !h.nodes.back.hidden && !h.nodes.errorActions.hidden);
assert(h.nodes.actionHint.hidden && h.nodes.activity.hidden);
assert.equal(h.doc.activeElement,h.nodes.retry);
const tab=h.doc.key("Tab");
assert(!tab.prevented,"normal Tab from first error button is available");
h.nodes.back.focus();
const wrap=h.doc.key("Tab");
assert(wrap.prevented && h.doc.activeElement===h.nodes.retry,"Tab wraps within dialog");
h.nodes.retry.click();
assert.equal(retried,1,"retry invokes original save workflow");
assert.equal(h.dialog.phase(),"making","retry keeps same modal, resets visual state");
assert(h.stage.inert,"retry cannot expose background");
h.dialog.error("Something went wrong");
h.nodes.back.click();
assert(h.overlay.hidden && !h.stage.inert && h.timers.size===0);

console.log("Ghost Writer purple export modal PASS: real controller, stable stage slots, locked dim backdrop, progress, timer, cancel, PhotoKit wait, Done, retry, error and focus restoration.");
