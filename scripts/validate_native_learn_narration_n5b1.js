"use strict";
// N5b.1 regression: explicit DEV-only long narration output contract.
// This is NOT a Swift/Xcode compile or proof that a speaker emitted audio.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const controller = read("verse_games/shared/native-learn-narration-pilot.js");
const dev = read("verse_games/shared/native-sound-smoke-test.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
const html = read("index.html");
const handoff = read("docs/PROJECT-HANDOFF.md");
const workflow = read(".github/workflows/ios-prep-validation.yml");

assert.ok(fs.statSync(path.join(root, "verse_audio/john_3_16.mp3")).size > 0);
assert.match(pbx, /john_3_16\.mp3 in Resources/);
assert.match(pbx, /\.\.\/\.\.\/\.\.\/verse_audio\/john_3_16\.mp3/);
for (const method of ["prepareNarration", "playNarration", "pauseNarration",
  "seekNarration", "getNarrationState", "stopNarration"]) {
  assert.ok(swift.includes('CAPPluginMethod(name: "' + method + '"'));
  assert.ok(swift.includes("@objc func " + method + "("));
}
assert.match(swift, /CAPBridgedPlugin, AVAudioPlayerDelegate/);
assert.match(swift, /private let narrationSoundID = "learn-john-3-16"/);
assert.match(swift, /private let narrationResourceName = "john_3_16"/);
assert.match(swift, /if soundId == narrationSoundID/);
assert.match(swift, /forResource: narrationResourceName, withExtension: "mp3"/);
assert.match(swift, /guard let url = self\\.nativeNarrationURL\\(for: soundId\\)/);
assert.match(swift, /self\.narrationPlayer === player/);
assert.match(swift, /UIApplication\.shared\.applicationState == \.active/);
assert.match(swift, /requestId == self\.narrationRequestId/);
assert.match(swift, /self\.stopNarrationPlayer\(reason: reason\)/);
assert.match(swift, /stopNarrationPlayer\(reason: "interrupted"\)/);
assert.match(swift, /purpose == "learn"/);
assert.doesNotMatch(swift, /setCategory\(/);
assert.ok(html.indexOf("shared/native-learn-narration-pilot.js") >= 0);
assert.ok(html.indexOf("shared/native-learn-narration-pilot.js") <
  html.indexOf("shared/native-sound-smoke-test.js"));
assert.match(dev, /Play John 3:16/);
assert.match(dev, /Native completion event received/);
assert.match(dev, /Skip \+5s/);
assert.match(dev, /root\.BibloZooNativeLearnNarrationPilot\?\.stop\?\.\(\)/);
assert.match(controller, /activateFromGesture\(\{ purpose: "learn" \}\)/);
assert.match(controller, /"biblozooAppLifecycle"/);
assert.match(controller, /"biblozooNarration"/);
assert.doesNotMatch(controller, /AudioContext|new Audio\(|\.play\(\)/);
assert.match(workflow, /validate_native_learn_narration_n5b1\.js/);
assert.match(handoff, /N5b\.1/);

function mock({ ios=true, nativeOnly=true, activation=null, prepare=null }={}) {
  const calls=[],listeners={},docListeners={},document={hidden:false,
    addEventListener(k,cb){docListeners[k]=cb;}};
  let nextPosition=1000;
  const api = {
    activateFromGesture(arg){
      calls.push(["activate",arg.purpose]);
      return activation ? activation() : Promise.resolve({ready:true});
    },
    prepareNarration(arg){
      calls.push(["prepare",arg]);
      return prepare ? prepare(arg) :
        Promise.resolve({prepared:true,durationMs:20000});
    },
    playNarration(arg){calls.push(["play",arg]);return Promise.resolve({accepted:true});},
    pauseNarration(arg){calls.push(["pause",arg]);return Promise.resolve({paused:true,positionMs:nextPosition});},
    seekNarration(arg){calls.push(["seek",arg]);nextPosition=arg.positionMs;return Promise.resolve({seeked:true,positionMs:nextPosition});},
    getNarrationState(arg){calls.push(["state",arg]);return Promise.resolve({prepared:true,requestId:1,positionMs:nextPosition,durationMs:20000});},
    stopNarration(arg){calls.push(["stop",arg]);return Promise.resolve({stopped:true});},
    addListener(name,cb){listeners[name]=cb;return Promise.resolve({remove(){}});}
  };
  const window={Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
    Plugins:{BibloZooNativeSound:api}},
    BibloZooNativeOnlyOutput:{enabled:nativeOnly},document,
    addEventListener(name,cb){listeners[name]=cb;},
    setTimeout,clearTimeout};
  vm.runInNewContext(controller,{window,document,Date,Promise,console,setTimeout,clearTimeout});
  return {window,api,document,calls,listeners,docListeners};
}
async function flush(){await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));}
async function main(){
  {
    const m=mock(),statuses=[];
    const result=await m.window.BibloZooNativeLearnNarrationPilot.startFromGesture(x=>statuses.push(x));
    assert.equal(result.ready,true);
    assert.deepEqual(m.calls.slice(0,3).map(x=>x[0]),["activate","prepare","play"]);
    assert.equal(m.calls[0][1],"learn");
    assert.equal(m.calls[1][1].soundId,"learn-john-3-16");
    assert.equal(m.calls[1][1].requestId,1);
    assert.equal(result.durationMs,20000);
    assert.equal((await m.window.BibloZooNativeLearnNarrationPilot.pause()).paused,true);
    const seek=await m.window.BibloZooNativeLearnNarrationPilot.seekForward();
    assert.equal(seek.seeked,true);
    assert.equal(seek.positionMs,6000);
    const continued=await m.window.BibloZooNativeLearnNarrationPilot.resume();
    assert.equal(continued.accepted,true);
    m.listeners.biblozooNarration({type:"ended",requestId:2});
    assert.equal(statuses.filter(x=>x.kind==="ended").length,0);
    m.listeners.biblozooNarration({type:"ended",requestId:1,durationMs:20000,positionMs:20000});
    assert.equal(statuses.filter(x=>x.kind==="ended").length,1);
    m.window.BibloZooNativeLearnNarrationPilot.stop();
    await flush();
    assert.equal(m.calls.filter(x=>x[0]==="stop").length,1);
    m.listeners.biblozooNarration({type:"ended",requestId:1});
    assert.equal(statuses.filter(x=>x.kind==="ended").length,1);
  }
  {
    let finish;
    const m=mock({activation:()=>new Promise(r=>{finish=r;})});
    const flow=m.window.BibloZooNativeLearnNarrationPilot.startFromGesture();
    m.window.BibloZooNativeLearnNarrationPilot.stop();
    finish({ready:true});
    const result=await flow;
    assert.equal(result.ready,false);
    assert.equal(m.calls.filter(x=>x[0]==="prepare").length,0);
    assert.equal(m.calls.filter(x=>x[0]==="play").length,0);
  }
  {
    const m=mock({activation:()=>Promise.resolve({ready:false,reason:"interruption-pending"})});
    const result=await m.window.BibloZooNativeLearnNarrationPilot.startFromGesture();
    assert.equal(result.ready,false);
    assert.equal(m.calls.filter(x=>x[0]==="prepare").length,0);
    assert.equal(m.calls.filter(x=>x[0]==="play").length,0);
  }
  {
    const m=mock(),events=[];
    await m.window.BibloZooNativeLearnNarrationPilot.startFromGesture(x=>events.push(x.kind));
    m.listeners.biblozooAppLifecycle({active:false});
    assert.equal((await m.window.BibloZooNativeLearnNarrationPilot.resume()).ready,false,
      "return from iOS App Switcher may not replay without a fresh gesture");
    assert.equal(m.calls.filter(x=>x[0]==="play").length,1);
    assert.ok(events.includes("interrupted"));
  }
  {
    const m=mock({ios:false,nativeOnly:false});
    assert.equal(m.window.BibloZooNativeLearnNarrationPilot.isAvailable(),false);
    assert.equal((await m.window.BibloZooNativeLearnNarrationPilot.startFromGesture()).ready,false);
    assert.equal(m.calls.length,0);
  }
  console.log("N5b.1 fixed native narration pilot: gesture/preload/play, pause/seek, native completion, stale/interruption isolation, Web gating verified.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
