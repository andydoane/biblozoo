"use strict";
// Ghost Writer session photo background: execute the actual import helper
// under a fake image/Canvas DOM and guard the real game integration contract.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const helper = read("verse_playground/ghost_writer/custom-background.js");
const game = read("verse_playground/ghost_writer/game.js");
const css = read("verse_playground/ghost_writer/game.css");
const html = read("verse_playground/ghost_writer/index.html");
const ci = read(".github/workflows/ios-prep-validation.yml");

assert.match(ci,/node scripts\/validate_ghost_writer_custom_background\.js/);
assert.match(html,/src="\.\/custom-background\.js"[\s\S]*?src="\.\/game\.js"/);
assert.match(game,/window\.BibloZooGhostCustomBackground\?\.create\?\.\(\)/);
assert.match(game,/customBackground\?\.clear\(\); \/\/ new run discards/);
assert.match(game,/ghostImportBackgroundBtn/);
assert.match(game,/ghostImportBackgroundInput" hidden/);
assert.match(game,/customBackground\.importFile\(file\)/);
assert.match(game,/state\.remix\.background = "custom"/);
assert.match(game,/state\.remix\.customDarken = true/);
assert.match(game,/darkenToggle\?\.addEventListener\("change", update\)/);
assert.match(game,/function selectImportBackgroundHtml\(\)/);
assert.equal((game.match(/\$\{selectImportBackgroundHtml\(\)\}/g)||[]).length,2,
  "the same picker must render in Simple and More Options");
assert.match(game,/value="custom"[\s\S]*?My Photo/);
assert.match(game,/background\.texture === "sessionPhoto"/);
assert.match(game,/drawCoverImage\(c, img, width, height\)/);
assert.match(game,/getBackgroundConfig\(options\)/);
assert.match(game,/background\.image : getBackgroundImage\(background\.imageSrc\)/);
assert.match(game,/if \(background\.texture === "sessionPhoto" && options\.customDarken !== false\)/);
assert.match(game,/c\.fillStyle = "rgba\(0, 0, 0, 0\.22\)"/);
assert.match(game,/function drawCompleteText[\s\S]*?clearPlaybackCanvas\(c, width, height, cleanOptions\)/);
assert.match(game,/function drawReplayVideoFrame[\s\S]*?clearPlaybackCanvas\(ps\.c, ps\.width, ps\.height, ps\.options\)/);
assert.match(game,/async function waitForExportAssets\(options = \{\}\)/);
assert.match(game,/function drawRemixPreview[\s\S]*?drawCompleteText\(c, rect\.width, rect\.height, state\.remix\)/);
assert.match(css,/\.ghost-background-picker\s*\{[^}]*grid-column:\s*1 \/ -1/);
assert.match(css,/\.ghost-background-import-btn\s*\{/);
assert.match(css,/\.ghost-background-darken\[hidden\]/);
assert.doesNotMatch(helper,/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|FileReader|upload\(/i,
  "selected photo bytes stay in RAM only and are never uploaded or persisted");
assert.match(helper,/root\.URL\.revokeObjectURL\(url\)/);
assert.match(helper,/MAX_FILE_BYTES = 18 \* 1024 \* 1024/);
assert.match(helper,/MAX_EDGE = 2560/);

function harness() {
  const blobs = new Map(), revoked=[], canvases=[];
  let counter=0;
  const win={
    URL:{
      createObjectURL(file) {const url="blob:fake-"+(++counter);blobs.set(url,file);return url;},
      revokeObjectURL(url) {revoked.push(url);blobs.delete(url);}
    },
    Image:class {
      set src(url) {
        const file=blobs.get(url);
        if(!file) throw Error("lost fake blob");
        this.naturalWidth=file.width || 0;
        this.naturalHeight=file.height || 0;
        // A delayed load lets us test cleanup while import is pending.
        if(file.delayed) {file.deliver=()=>this.onload?.();return;}
        Promise.resolve().then(()=>file.decodeError?this.onerror?.():this.onload?.());
      }
    },
    document:{
      createElement(tag) {
        assert.equal(tag,"canvas");
        const calls=[];
        const canvas={width:0,height:0,calls,
          getContext(type) {
            assert.equal(type,"2d");
            return {
              set fillStyle(v) {calls.push(["fillStyle",v]);},
              fillRect(...args) {calls.push(["fillRect",...args]);},
              drawImage(...args) {calls.push(["drawImage",...args]);}
            };
          }
        };
        canvases.push(canvas);return canvas;
      }
    }
  };
  vm.runInNewContext(helper,{window:win,console},{filename:"custom-background.js"});
  const bg=win.BibloZooGhostCustomBackground.create(win.document);
  const file=(name,type,width,height,props={})=>({
    name,type,width,height,size:1200000,...props
  });
  return {bg,file,canvases,revoked,blobs};
}
function cover(canvas, targetW, targetH) {
  const start=game.indexOf("  function drawCoverImage(");
  const end=game.indexOf("  function getTextColorKey(",start);
  assert(start>=0&&end>start);
  const context={drawImage(...args){this.args=args;}};
  const sandbox={};
  vm.runInNewContext(game.slice(start,end)+"\nthis.cover=drawCoverImage;",sandbox);
  assert.equal(sandbox.cover(context,canvas,targetW,targetH),true);
  return context.args;
}
async function main() {
  const h=harness();
  assert.equal(h.bg.hasImage(),false);
  await assert.rejects(h.bg.importFile(h.file("evil.svg","image/svg+xml",300,300)),
    /Choose a JPG/);
  await assert.rejects(h.bg.importFile(
    h.file("big.jpg","image/jpeg",3000,2000,{size:20*1024*1024})),/18 MB/);
  assert.equal(h.blobs.size,0,"invalid files don't create blob URLs");

  const photo=await h.bg.importFile(h.file("Sunset.JPG","image/jpeg",4000,3000));
  assert.equal(photo.name,"Sunset.JPG");
  assert.equal(photo.width,2560);
  assert.equal(photo.height,1920);
  assert.equal(h.bg.getCanvas().width,2560);
  assert.equal(h.bg.hasImage(),true);
  assert.equal(h.revoked.length,1,"source blob URL revoked immediately");
  assert.equal(h.blobs.size,0,"picker File URL not retained");
  assert(h.bg.getCanvas().calls.some(x=>x[0]==="drawImage"),"rasterized in RAM");
  assert(h.bg.getCanvas().calls.some(x=>x[0]==="fillRect"),"alpha flattened");
  const portrait=cover(h.bg.getCanvas(),1080,1920);
  assert(Math.abs(portrait[1]-740)<0.001,
    "9:16 export crops a landscape image centrally, never stretches");
  assert.equal(portrait[5],0);
  assert.equal(portrait[6],0);
  assert.equal(portrait[7],1080);
  assert.equal(portrait[8],1920);
  const square=cover(h.bg.getCanvas(),1080,1080);
  assert.equal(square[2],0,"square crop retains the full narrower source axis");
  assert.equal(square[3],1920,"square crops 1920px square from the center");
  assert.equal(square[7],1080);
  const old=h.bg.getCanvas();
  await h.bg.importFile(h.file("My dog.png","image/png",600,1200));
  assert.equal(h.bg.getName(),"My dog.png");
  assert.equal(old.width,0,"replacing photo frees the original canvas memory");
  assert.equal(old.height,0);
  assert.equal(h.revoked.length,2);
  const existing=h.bg.getCanvas();
  await assert.rejects(h.bg.importFile(h.file("bad.gif","image/gif",200,100,
    {decodeError:true})),/couldn't be opened/);
  assert.equal(h.bg.getCanvas(),existing,"bad replacement keeps previous photo");
  assert.equal(h.revoked.length,3,"failed image decode still revokes URL");

  const pending=h.file("pending.jpg","image/jpeg",700,800,{delayed:true});
  const promise=h.bg.importFile(pending);
  h.bg.clear(); // leaving Ghost Writer while picker/image decoding is active
  pending.deliver();
  assert.equal(await promise,null);
  assert.equal(h.bg.hasImage(),false);
  assert.equal(existing.width,0,"leave/reset frees image RAM");
  assert.equal(h.blobs.size,0,"no image object URL survives cancellation");
  await h.bg.importFile(h.file("new.heic","image/heic",1000,1800));
  assert.equal(h.bg.hasImage(),true);
  h.bg.clear();
  assert.equal(h.bg.getCanvas(),null);
  assert.equal(h.bg.getName(),"");
  assert.equal(h.blobs.size,0);
  console.log("Ghost Writer custom background PASS: actual ephemeral decoder, MIME/size limits, cover crop square+portrait, replacement, failure, stale request and cleanup; game integrates all render/export paths.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
