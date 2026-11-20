"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const swift=read("ios/App/App/SceneDelegate.swift");
const plist=read("ios/App/App/Info.plist");
const game=read("verse_playground/ghost_writer/game.js");
const css=read("verse_playground/ghost_writer/game.css");
const html=read("verse_playground/ghost_writer/index.html");
const controller=read("verse_playground/ghost_writer/photo-choice.js");
const helper=read("verse_playground/ghost_writer/custom-background.js");
const ci=read(".github/workflows/ios-prep-validation.yml");
const native=swift.slice(swift.indexOf("@objc(BibloZooGhostBackgroundPickerPlugin)"));
assert.match(ci,/node scripts\/validate_ghost_writer_camera_free_picker\.js/);
assert.match(swift,/registerPluginInstance\(BibloZooGhostBackgroundPickerPlugin\(\)\)/);
// The picker factory is captured by the escaping DispatchQueue.main.async block.
// Check the actual source contract here; Linux Swift -parse alone will not type-check it.
assert.match(native,/private func begin\(_ call: CAPPluginCall,\s*makePicker:\s*@escaping\s*\(\)\s*->\s*UIViewController\)\s*\{/);
assert.match(native,/CAPPluginMethod\(name: "choosePhoto"/);
assert.match(native,/CAPPluginMethod\(name: "chooseFile"/);
assert.match(native,/PHPickerViewController\(configuration: config\)/);
assert.match(native,/config\.filter = \.images/);
assert.match(native,/config\.selectionLimit = 1/);
assert.match(native,/UIDocumentPickerViewController\(\s*forOpeningContentTypes: \[\.image\], asCopy: false\)/);
assert.match(native,/CGImageSourceCreateThumbnailAtIndex/);
assert.match(native,/NSFileCoordinator\(filePresenter: nil\)/);
assert.match(native,/startAccessingSecurityScopedResource\(\)/);
assert.match(native,/stopAccessingSecurityScopedResource\(\)/);
assert.match(native,/kCGImageSourceCreateThumbnailWithTransform: true/);
assert.match(native,/maxEdge = 2560/);
assert.match(native,/maxFileBytes: Int64 = 18 \* 1024 \* 1024/);
assert.match(native,/maxPixels: Int64 = 80_000_000/);
assert.match(native,/"dataUrl": "data:image\/jpeg;base64,"/);
assert.match(native,/finish\(cancelled: true\)/);
assert.doesNotMatch(native,/UIImagePickerController\(|AVCaptureDevice|AVCaptureSession|sourceType\s*=\s*\.camera/);
assert.doesNotMatch(plist,/NSCameraUsageDescription/);
assert.doesNotMatch(native,/PHPhotoLibrary\.requestAuthorization|URLSession|write\(to:/);
assert.match(html,/src="\.\/photo-choice\.js"[\s\S]*?src="\.\/game\.js"/);
assert.match(game,/const nativePhotoPicker = IS_NATIVE_CAPACITOR/);
assert.match(game,/id="ghostPhotoChoiceOverlay" hidden/);
assert.match(game,/Choose from Photos/);
assert.match(game,/Choose from Files/);
assert.match(game,/data-ghost-photo-choice-cancel>Cancel/);
assert.doesNotMatch(game,/>Take Photo<|["\u0027]Take Photo["\u0027]/, "no camera action is rendered");
assert.match(game,/IS_NATIVE_CAPACITOR \? "" :/);
assert.match(game,/nativePhotoPicker\.choosePhoto\(\) : nativePhotoPicker\.chooseFile\(\)/);
assert.match(game,/customBackground\.importDataUrl\(/);
assert.match(game,/return; \/\/ fail closed:/);
assert.match(helper,/async function importDataUrl\(dataUrl, name = "My Photo"\)/);
assert.match(helper,/dataUrl\.startsWith\("data:image\/jpeg;base64,"\)/);
assert.match(helper,/dataUrl\.length > 12_000_000/);
assert.match(css,/\.ghost-photo-choice-dialog\s*\{[^}]*background:\s*#7f66c6/i);
assert.match(css,/\.ghost-draw-wrap, \.ghost-draw-wrap \*, #ghostDrawCanvas\s*\{[^}]*-webkit-user-select:\s*none !important;[^}]*-webkit-touch-callout:\s*none !important;/);
assert.match(game,/wrap\.addEventListener\("selectstart", suppressCallout, \{ capture: true \}\)/);
assert.match(game,/wrap\.addEventListener\("contextmenu", suppressCallout, \{ capture: true \}\)/);
assert.match(css,/\.ghost-recorder-json\s*\{[^}]*-webkit-user-select:\s*text;/);
function harness(){
  const listeners=new Map(),doc={activeElement:null,
    addEventListener(k,f){listeners.set(k,f);},
    removeEventListener(k,f){if(listeners.get(k)===f)listeners.delete(k);}};
  function node(name){
    const attrs=new Map(),events=new Map();
    return {name,hidden:false,inert:false,disabled:false,isConnected:true,
      textContent:"",parentElement:null,
      setAttribute(k,v){attrs.set(k,String(v));},
      getAttribute(k){return attrs.has(k)?attrs.get(k):null;},
      removeAttribute(k){attrs.delete(k);},
      querySelectorAll(){return[];},
      addEventListener(k,f){events.set(k,f);},
      click(){events.get("click")?.();},
      focus(){doc.activeElement=this;}};
  }
  const overlay=node("overlay"),photos=node("photos"),files=node("files"),
    cancel=node("cancel"),status=node("status"),stage=node("stage"),
    menu=node("menu"),prior=node("prior");
  overlay.hidden=true;overlay.ownerDocument=doc;doc.activeElement=prior;
  const mapping={
    "[data-ghost-photo-choice-dialog]":node("dialog"),
    "[data-ghost-photo-choice-photos]":photos,
    "[data-ghost-photo-choice-files]":files,
    "[data-ghost-photo-choice-cancel]":cancel,
    "[data-ghost-photo-choice-status]":status};
  overlay.querySelector=q=>mapping[q]||null;
  overlay.contains=n=>Object.values(mapping).includes(n);
  overlay.parentElement={children:[stage,menu,overlay]};
  stage.setAttribute("aria-hidden","false");
  menu.setAttribute("aria-hidden","true");
  const root={};vm.runInNewContext(controller,{window:root,console});
  return {dialog:root.BibloZooGhostPhotoChoice.create(overlay),
    photos,files,cancel,status,stage,menu,overlay,prior,doc,listeners};
}
const next=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
  const h=harness(),seen=[];let imported=0,ready=0;
  const handlers={onChoose:async source=>{seen.push(source);return{
      name:"Beach.jpg",dataUrl:"data:image/jpeg;base64,SlBFRw=="};},
    onImported:async result=>{imported++;assert.equal(result.name,"Beach.jpg");return{width:900};},
    onReady:()=>{ready++;}};
  assert(h.dialog.open(handlers));assert(h.stage.inert && !h.overlay.hidden);
  assert.equal(h.doc.activeElement,h.photos);
  assert.equal(h.dialog.open(handlers),false);
  h.photos.click();await next();
  assert.equal(seen[0],"photos");assert.equal(imported,1);assert.equal(ready,1);
  assert(h.overlay.hidden && !h.stage.inert);
  assert.equal(h.doc.activeElement,h.prior);
  assert.equal(h.stage.getAttribute("aria-hidden"),"false");
  assert.equal(h.menu.getAttribute("aria-hidden"),"true");
  assert.equal(h.listeners.size,0);
  h.dialog.open(handlers);h.cancel.click();assert(h.overlay.hidden);
  h.dialog.open({...handlers,onChoose:async source=>{seen.push(source);return{cancelled:true};}});
  h.files.click();await next();assert.equal(seen[1],"files");
  assert(h.overlay.hidden && imported===1);
  h.dialog.open({...handlers,onChoose:async()=>{throw Error("Photo unavailable");}});
  h.photos.click();await next();assert.equal(h.status.textContent,"Photo unavailable");
  assert(h.dialog.isOpen() && h.stage.inert && !h.photos.disabled);
  h.cancel.click();assert(h.overlay.hidden);
  const made=[];const win={
    Image:class{set src(s){this.naturalWidth=4000;this.naturalHeight=2000;
      Promise.resolve().then(()=>this.onload?.());}},
    URL:{createObjectURL(){throw Error("should not create blob for native JPEG");},
      revokeObjectURL(){}},
    document:{createElement:()=>{const c={width:0,height:0,
      getContext(){return{fillRect(){},drawImage(){},set fillStyle(v){}};}};
      made.push(c);return c;}}
  };
  vm.runInNewContext(helper,{window:win,console});
  const bg=win.BibloZooGhostCustomBackground.create(win.document);
  const val=await bg.importDataUrl("data:image/jpeg;base64,SlBFRw==","Beach.jpg");
  assert.equal(val.width,2560);assert.equal(val.height,1280);
  await assert.rejects(bg.importDataUrl("data:image/png;base64,AA","bad"),/smaller image/);
  bg.clear();assert.equal(bg.getCanvas(),null);assert.equal(made[0].width,0);
  console.log("Ghost Writer picker PASS: native Photos+Files only, no camera permission, real choice controller cancel/error/focus, RAM JPEG, drawing-pad callout suppressed.");
}
main().catch(err=>{console.error(err);process.exitCode=1;});
