"use strict";
// Native Audio Test Ghost Writer export: invoke the production image/video
// functions with fake canvases and a fake Capacitor Swift bridge. No SDK here:
// the Xcode build, share sheet, Photos and social uploads remain iPhone gates.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const source = read("verse_playground/ghost_writer/game.js");
const swift = read("ios/App/App/SceneDelegate.swift");
const css = read("verse_playground/ghost_writer/game.css");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const native = swift.slice(swift.indexOf("@objc(BibloZooGhostWriterExportPlugin)"));

assert.match(workflow, /node scripts\/validate_native_ghost_writer_export\.js/);
assert.match(swift, /registerPluginInstance\(BibloZooGhostWriterExportPlugin\(\)\)/);
assert.match(native, /CAPPluginMethod\(name: "shareImage"/);
for (const method of ["beginVideo","appendVideoFrame","finishVideo","cancelVideo"])
  assert.match(native, new RegExp('CAPPluginMethod\\(name: "'+method+'"'));
assert.match(native, /AVAssetWriter\(outputURL: url, fileType: \.mp4\)/);
assert.match(native, /AVVideoCodecKey:\s*AVVideoCodecType\.h264/);
assert.match(native, /videoWidth = 1080/);
assert.match(native, /videoHeight = 1920/);
assert.match(native, /videoFPS:\s*Int32 = 30/);
assert.match(native, /maximumFrames = 5400/);
assert.match(native, /AVAssetWriterInput\(mediaType: \.video/);
assert.doesNotMatch(native, /AVAssetWriterInput\(mediaType: \.audio|AVAudioSession|AVAudioRecorder|NSMicrophone|Photos\.|PHPhotoLibrary/,
  "export must not take audio ownership or request media-library access");
assert.match(native, /UIActivityViewController\(activityItems: items/);
assert.match(native, /completionWithItemsHandler[\s\S]*?removeItem\(at: url\)/);
assert.match(native, /job\.input\.isReadyForMoreMediaData/);
assert.match(native, /job\.nextFrame \+= 1/);
assert.match(native, /job\.writer\.cancelWriting\(\)/);
assert.match(source, /const NATIVE_SOCIAL_VIDEO = Object\.freeze\(\{\s*width: 1080,\s*height: 1920,\s*fps: 30,\s*maxFrames: 5400,\s*endHoldFrames: 21/);
assert.match(source,/const nativeGhostExport = IS_NATIVE_CAPACITOR/);
assert.match(source, /id="ghostSaveVideoBtn"/);
assert.match(source, /id="ghostCancelVideoBtn" type="button" hidden/);
assert.match(css, /\.ghost-remix-actions \.vm-btn\[hidden\]\s*\{\s*display: none !important/);
assert.match(source,/await nativeGhostExport\.shareImage\(\{ png: canvas\.toDataURL\("image\/png"\) \}\)/);
assert.match(source,/await nativeGhostExport\.appendVideoFrame\(\{\s*token, index: frameCount, jpeg/);
assert.match(source,/await nativeGhostExport\.finishVideo\(\{ token \}\)/);
assert.match(source,/nativeGhostExport\.cancelVideo\(\{ token \}\)/);
assert.match(source, /if \(IS_NATIVE_CAPACITOR\)[\s\S]*?Never silently fall back to a WKWebView blob-anchor download/);

function extract(first, last) {
  const a = source.indexOf(first), b = source.indexOf(last, a + first.length);
  assert(a >= 0 && b > a, "missing live source block: "+first);
  return source.slice(a,b);
}
const imageCode = extract("  async function saveGhostWriterImage(", "  function estimateReplayVideoFrames(");
const videoCode = extract("  function estimateReplayVideoFrames(", "  function isReplayVideoSupported(");
const clamp = (n,lo,hi)=>Math.max(lo,Math.min(hi,n));

function env({onAppend} = {}) {
  const calls=[], progress=[], times=[];
  const job = { cancelled:false };
  const plugin = {
    async shareImage(args) {calls.push(["shareImage",args]);return {presented:true};},
    async beginVideo() {calls.push(["beginVideo"]);return {token:"native-job",width:1080,height:1920,fps:30};},
    async appendVideoFrame(args) {
      calls.push(["frame",args]);
      if (onAppend) onAppend(args,job);
      return {accepted:true};
    },
    async finishVideo(args) {calls.push(["finish",args]);return {presented:true};},
    async cancelVideo(args) {calls.push(["cancel",args]);return {cancelled:true};}
  };
  const ctx = {
    console, Promise, setTimeout, performance:{now:()=>1000},
    state:{screen:"remix"}, document:{
      hidden:false,createElement(tag) {
        assert.equal(tag,"canvas");
        return {width:0,height:0,
          getContext:()=>({setTransform(){}}),
          toDataURL:(mime)=>mime==="image/png"
            ? "data:image/png;base64,UE5H" : "data:image/jpeg;base64,SlBFRw==",
          toBlob(){throw Error("native path must not call browser toBlob");}
        };
      }
    },
    IS_NATIVE_CAPACITOR:true, nativeGhostExport:plugin, activeGhostVideoExport:job,
    sanitizeRemixOptions:o=>o, state:{screen:"remix"},
    waitForExportAssets:async()=>{},
    EXPORT_SIZES:{square:{width:1080,height:1080,filenameLabel:"square"}},
    drawCompleteText(){calls.push(["renderPNG"]);},
    makeExportFilename:()=> "ghost-writer-test.png",
    makeExportVideoFilename:()=> "ghost-writer-john-11-35-portrait.webm",
    downloadBlob(){throw Error("WKWebView browser-download fallback forbidden");},
    downloadCanvasDataUrl(){throw Error("WKWebView data URL fallback forbidden");},
    NATIVE_SOCIAL_VIDEO:{width:1080,height:1920,fps:30,maxFrames:5400,endHoldFrames:21},
    makeLayout:()=>({placements:[{char:"A",colorIndex:0,pauseAfter:0}]}),
    buildPlaybackPlacements:layout=>layout.placements,
    SPEEDS:{normal:{multiplier:1,pauseMultiplier:1}},
    getGlyph:()=>({strokes:[[{x:0,y:0},{x:1,y:1}]]}),
    countStrokePieces:()=>4, clamp,
    drawReplayVideoFrame(ps,now) {
      times.push(now);
      // Three frame steps write the simulated glyph; then a fixed 0.7s end
      // hold. The exporter must encode every frame, not store them all.
      return times.length >= 3;
    },
    clearPlaybackCanvas(){calls.push(["clear"])},
    URL:{createObjectURL(){throw Error("blob save forbidden");}}
  };
  vm.runInNewContext(imageCode+videoCode+"\nthis.exports={saveGhostWriterImage,saveGhostWriterNativeVideo,estimateReplayVideoFrames};",ctx);
  return {calls,progress,times,job,plugin,ctx,fn:ctx.exports,
    report:label=>progress.push(label)};
}
async function run() {
  const first=env();
  await first.fn.saveGhostWriterImage({exportSize:"square"});
  assert.deepEqual(first.calls.map(x=>x[0]),["renderPNG","shareImage"]);
  assert.equal(first.calls[1][1].png,"data:image/png;base64,UE5H");

  const missing=env();
  missing.ctx.nativeGhostExport=null;
  await assert.rejects(missing.fn.saveGhostWriterImage({exportSize:"square"}),/Native picture sharing is unavailable/);
  assert.equal(missing.calls.filter(x=>x[0]==="shareImage").length,0,
    "no silent fallback to a browser download on native");

  const h=env();
  await h.fn.saveGhostWriterNativeVideo({speed:"normal"},h.job,h.report);
  assert.deepEqual(h.calls.filter(x=>x[0]==="beginVideo"||x[0]==="finish").map(x=>x[0]),
    ["beginVideo","finish"]);
  assert.equal(h.calls.find(x=>x[0]==="beginVideo")[1].name,
    "ghost-writer-john-11-35-portrait",
    "the native MP4 has a readable verse reference, not a random opaque name");
  assert.equal(h.calls.filter(x=>x[0]==="cancel").length,0);
  const frames=h.calls.filter(x=>x[0]==="frame").map(x=>x[1]);
  assert(frames.length>=23,"complete short replay and 21 finish-hold frames");
  frames.forEach((x,i)=>{
    assert.equal(x.index,i,"strict presentation ordering");
    assert.equal(x.token,"native-job");
    assert.equal(x.jpeg,"data:image/jpeg;base64,SlBFRw==");
    assert(!("audio" in x),"video sends no audio samples");
  });
  assert(Math.abs(h.times[1]-h.times[0]-1000/30)<0.001);
  assert(h.progress.some(x=>x.startsWith("Making Video...")),"progress exposed to user");
  assert.equal(h.progress[h.progress.length-1],"Opening Video Share...");

  const cancelled=env({onAppend(args,job){if(args.index===2) job.cancelled=true;}});
  await cancelled.fn.saveGhostWriterNativeVideo({speed:"normal"},cancelled.job,cancelled.report);
  assert(cancelled.calls.some(x=>x[0]==="cancel"),"explicit cancellation drains native job");
  assert(!cancelled.calls.some(x=>x[0]==="finish"),"cancel must never open share sheet");

  const away=env();
  away.ctx.document.hidden=true;
  await away.fn.saveGhostWriterNativeVideo({speed:"normal"},away.job,away.report);
  assert.equal(away.calls.length,0,"do not begin encoder offscreen");

  console.log("Native Ghost Writer export PASS: actual PNG share, no WebView download fallback, ordered 1080x1920 30fps silent frames, share, cancel, hidden gate; source validates bounded H264 MP4 native writer.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
