"use strict";
/*
 * Owner follow-up for Kids setup: real native Flashcards JS handler VM proof
 * of a fresh iOS mic grant followed by one transient output/session failure.
 * Node cannot display a genuine iOS alert or prove the cause on a phone.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const native=read("verse_games/shared/native-flashcards-capture-n7c.js");
const setup=read("verse_games/shared/kids-setup.js");
const css=read("verse_games/shared/kids-setup.css");
const gate=read("verse_games/shared/parental-gate.js");
new vm.Script(native);
new vm.Script(setup);
new vm.Script(gate);

const micArt="verse_images/game_ui/icon_microphone_permission.png";
const photosArt="verse_images/game_ui/icon_photos_permission.png";
for(const file of [micArt,photosArt]){
  const bytes=fs.readFileSync(path.join(root,file));
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a",
    file+" is a real tracked PNG");
  assert.ok(bytes.readUInt32BE(16)>0 && bytes.readUInt32BE(20)>0,
    file+" has positive dimensions");
  assert.ok(setup.includes(file),"setup uses committed art "+file);
}
assert.doesNotMatch(setup,/🎙️|🖼️/,
  "neither permission card uses the previous emoji");
assert.match(setup,/bz-kids-setup-button bz-kids-setup-skip/,
  "skip has the same base button class as Grown-up Setup");
assert.match(css,/\.bz-kids-setup-skip\s*\{[\s\S]*background:\s*#333333;[\s\S]*color:\s*#fff;/,
  "skip is charcoal with white text");
assert.match(css,/\.bz-kids-setup-page h1\[tabindex="-1"\]:focus\s*\{\s*outline:\s*none;/,
  "script-focused heading has no blue ring");
assert.match(css,/\.bz-kids-setup-button:focus-visible\s*\{\s*outline:\s*3px solid #fff;/,
  "keyboard-accessible action buttons keep their focus outline");
assert.match(gate,/actionLabel \|\| "A grown-up needs to help with this part of BibloZoo\."/,
  "specific Grown-up Check text replaces repeated preamble");
assert.doesNotMatch(gate,/message\.textContent \+=/,
  "don't concatenate redundant generic and specific descriptions");
assert.match(native,/firstGrantJustApproved = approved\?\.reason === "approved"/);
assert.match(native,/const currentPermission = await api\.getPermissionStatus\(\)/);
assert.match(native,/await api\.discardCapture\(\)/);
assert.ok(native.includes("await output.devPrepareForMicrophone()"));
assert.ok(native.includes("await api.prepareCapture()"));

function world({firstGrant=true,firstHandoffFails=false,firstPrepareFails=false,
  denied=false,hiddenOnRetry=false}={}){
  const events=[];
  const document={
    hidden:false,visibilityState:"visible",addEventListener(){}
  };
  let permission=firstGrant ? "undetermined" : (denied ? "denied" : "granted");
  let outputAttempts=0,prepareAttempts=0,grants=0;
  let countdowns=0, recordings=0;
  const bridge={
    getPermissionStatus:async()=>{
      events.push("status:"+permission);return {permission};
    },
    requestPermission:()=>{throw Error("production may not request normal permission");},
    requestFirstPermission:async()=>{
      grants++; events.push("OS-microphone");
      permission=denied?"denied":"granted";
      return {granted:!denied,permission};
    },
    prepareCapture:async()=>{
      prepareAttempts++;events.push("prepare:"+prepareAttempts);
      return {prepared:!(firstPrepareFails&&prepareAttempts===1)};
    },
    beginCapture:async()=>{
      recordings++;events.push("begin");
      return {started:true,captureKey:1};
    },
    discardCapture:async()=>{events.push("discard");return{discarded:true};},
    finishCapture:async()=>({ready:true,restored:true,
      frameCount:48000,takeId:"test-recording"}),
    playCapture:async()=>({started:true,playToken:1}),
    stopCapturePlayback:async()=>({stopped:true})
  };
  const output={
    devPrepareForMicrophone:async()=>{
      outputAttempts++;events.push("output:"+outputAttempts);
      return {prepared:!(firstHandoffFails&&outputAttempts===1)};
    }
  };
  const window={
    document,
    BibloZooNativeOnlyOutput:{enabled:true,devToolsAllowed:false},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooMicSessionProbe:bridge,BibloZooNativeSound:output}},
    BibloZooRecording:{create:()=>({})},
    BibloZooNativeUiAudio:{invalidate:()=>events.push("invalidate")},
    BibloZooKidsFirstPermission:{create:()=>({
      ensure:async({kind,getStatus,requestFirst,isCurrent})=>{
        assert.equal(kind,"microphone");
        assert.equal(isCurrent(),true);
        const status=await getStatus();
        if(status.permission==="denied")
          return {granted:false,reason:"denied"};
        if(status.permission==="granted")
          return {granted:true,reason:"already-granted"};
        assert.equal(status.permission,"undetermined");
        events.push("grown-up-check");
        const response=await requestFirst();
        return {granted:response.granted,reason:response.granted?"approved":"denied"};
      }
    })},
    addEventListener(){}
  };
  const shortTimer=(fn,ms)=>{
    if(ms===220||ms===300){
      // Deterministic zero-time resolution for test, preserving ordering.
      queueMicrotask(()=>{
        if(ms===300 && hiddenOnRetry){
          document.hidden=true;document.visibilityState="hidden";
        }
        fn();
      });
      return 1;
    }
    return setTimeout(fn,ms);
  };
  vm.runInNewContext(native,{
    window,document,performance:{now:()=>1000},
    setTimeout:shortTimer,clearTimeout
  },{filename:"real production native Flashcards recorder"});
  const recorder=window.BibloZooRecording.create({
    onChange:()=>{},
    onInterrupted:()=>{}
  });
  return {recorder,events,document,
    counts:()=>({outputAttempts,prepareAttempts,grants,countdowns,recordings}),
    async start(){
      return recorder.start(()=>events.push("challenge"),
        async()=>{countdowns++;events.push("3-2-1");return true;},()=>7000);
    }
  };
}
async function run(){
  {
    const w=world({firstGrant:true,firstHandoffFails:true});
    assert.equal(await w.start(),"recording",
      "first newly granted mic must recover a transient output handoff");
    assert.deepEqual(w.counts(),{
      outputAttempts:2,prepareAttempts:1,grants:1,countdowns:1,recordings:1
    });
    assert.equal(w.events.filter(x=>x==="grown-up-check").length,1);
    assert.deepEqual(w.events.filter(x=>x==="OS-microphone"),["OS-microphone"]);
    assert.ok(w.events.indexOf("3-2-1")>w.events.indexOf("output:2"),
      "countdown only happens after audio session truly prepared");
    w.recorder.dispose();
  }
  {
    const w=world({firstGrant:true,firstPrepareFails:true});
    assert.equal(await w.start(),"recording",
      "fresh grant followed by a first failed AVAudioSession prepare recovers");
    assert.deepEqual(w.counts(),{
      outputAttempts:2,prepareAttempts:2,grants:1,countdowns:1,recordings:1
    });
    assert.equal(w.events.filter(x=>x==="discard").length,1,
      "failed first native prepare is discarded before retry");
    w.recorder.dispose();
  }
  {
    const w=world({firstGrant:true});
    assert.equal(await w.start(),"recording");
    assert.deepEqual(w.counts(),{
      outputAttempts:1,prepareAttempts:1,grants:1,countdowns:1,recordings:1
    });
    w.recorder.dispose();
  }
  {
    const w=world({firstGrant:false,firstHandoffFails:true});
    assert.equal(await w.start(),"failed",
      "normal already-authorized audio failures are not silently auto-retried");
    assert.deepEqual(w.counts(),{
      outputAttempts:1,prepareAttempts:0,grants:0,countdowns:0,recordings:0
    });
    w.recorder.dispose();
  }
  {
    const w=world({denied:true,firstGrant:false});
    assert.equal(await w.start(),"permission-denied");
    assert.equal(w.counts().grants,0);
    assert.equal(w.counts().outputAttempts,0);
  }
  {
    const w=world({firstGrant:true,firstHandoffFails:true,hiddenOnRetry:true});
    assert.equal(await w.start(),"cancelled",
      "backgrounded/stale first request cannot auto-begin recording");
    assert.equal(w.counts().outputAttempts,1);
    assert.equal(w.counts().recordings,0);
  }
  console.log("Kids setup feedback PASS: charcoal same-size skip, focus safety, committed icons, concise gate copy, newly approved mic readiness and single retry; no double prompt, no Web fallback.");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
