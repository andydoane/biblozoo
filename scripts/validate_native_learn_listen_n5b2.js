"use strict";
/* N5b.2 Node regression: source-owned Learn reference → verse native playback.
 * Source/VM tests do NOT compile Swift or prove human-heard iPhone narration.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const base = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(base, file), "utf8");
const app = read("app.js");
const listen = read("verse_games/shared/native-learn-listen.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const index = read("index.html");
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const build = read("scripts/build.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");
const list = JSON.parse(read("verse_data/verse_list.json"));

assert.ok(list.length > 50, "all published verses, not just DEV John 3:16");
for (const verseId of list) {
  assert.match(verseId, /^[0-9a-z]+(?:_[0-9a-z]+)*$/);
  const data = JSON.parse(read("verse_data/" + verseId + ".json"));
  if (!data.published) continue; // Swift rejects unpublished JSON as well.
  assert.equal(data.verseId, verseId);
  for (const file of [verseId + ".mp3", verseId + "_ref.mp3"])
    assert.ok(fs.statSync(path.join(base, "verse_audio", file)).size > 0,
      "published Listen audio missing: " + file);
}
assert.match(project, /lastKnownFileType = folder; path = public;/);
assert.match(project, /public in Resources/);
assert.match(build, /"verse_audio"/);
assert.match(build, /"verse_data"/);
assert.match(swift, /private lazy var publishedLearnVerseIDs: Set<String>/);
assert.match(swift, /forResource: "verse_list", withExtension: "json"/);
assert.match(swift, /subdirectory: "public\/verse_data"/);
assert.match(swift, /subdirectory: "public\/verse_audio"/);
assert.match(swift, /json\["published"\] as\? Bool == true/);
assert.match(swift, /json\["verseId"\] as\? String == verseId/);
assert.match(swift, /soundId\.hasPrefix\("learn-ref-"\)/);
assert.match(swift, /soundId\.hasPrefix\("learn-verse-"\)/);
assert.match(swift, /guard let url = self\.nativeNarrationURL\(for: soundId\)/);
assert.match(swift, /"soundId": self\.narrationCurrentSoundID \?\? self\.narrationSoundID/);
assert.match(swift, /self\.narrationPlayer === player/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g, ""), /setCategory\(|setMode\(/);
assert.match(index, /shared\/native-learn-listen\.js/);
assert.ok(index.indexOf("shared/native-learn-listen.js") < index.indexOf('src="app.js"'));
assert.match(app, /function isNativeLearnListenMode\(/);
assert.match(app, /handleNativeLearnListenEvent/);
assert.match(app, /window\.BibloZooNativeLearnListen\.startFromGesture/);
assert.ok(app.includes("(isNativeLearnListenMode() && State.screen === Screen.LISTEN)) return;"));
assert.match(app, /function goToListenAndStart\(\) \{\s+nativeListenCheckpoint = null/);
assert.match(app, /State\.listenAutoStarting = !isNativeLearnListenMode\(\)/);
assert.match(app, /listenPlay\(recovery\.listenMode, recovery\.positionMs \|\| 0\)/);
assert.match(app, /window\.BibloZooNativeLearnListen\?\.stop\?\.\(\)/);
assert.match(app, /attempt\.narrationVerified = true;\s+finishLearnAudioResumeAttempt\(attempt\)/);
assert.match(app, /event\.kind === "completed" && event\.stage === "verse"/);
assert.match(app, /State\.listenDone = true;/);
assert.match(app, /Unmute to hear this verse/);
assert.match(workflow, /validate_native_learn_listen_n5b2\.js/);
assert.match(handoff, /N5b\.2/);
assert.doesNotMatch(listen, /AudioContext|new Audio\(|\.src\s*=|HTMLAudio/);

function makeHarness({ ios=true, nativeOnly=true, activationOk=true }={}) {
  let seq = 0, token = 0;
  let native = null;
  const calls = [], events = [], listeners = {}, timers = new Map(), intervals = new Map();
  const document = { hidden:false,
    addEventListener(name,callback) { listeners["document-"+name] = callback; } };
  const api = {
    activateFromGesture(arg) {
      calls.push(["activate", arg]);
      return Promise.resolve({ready:activationOk});
    },
    prepareNarration(arg) {
      calls.push(["prepare", arg]);
      native = { requestId: arg.requestId, soundId: arg.soundId,
        prepared:true, playing:false, ended:false, positionMs:0, durationMs:18000 };
      return Promise.resolve({prepared:true,...native});
    },
    playNarration(arg) {
      calls.push(["play", arg]);
      if (arg.requestId !== native?.requestId)
        return Promise.resolve({accepted:false,reason:"stale"});
      native.playing=true;
      return Promise.resolve({accepted:true,requestId:arg.requestId});
    },
    seekNarration(arg) {
      calls.push(["seek", arg]);
      if(arg.requestId !== native?.requestId) return Promise.resolve({seeked:false});
      native.positionMs=arg.positionMs;
      return Promise.resolve({seeked:true,requestId:arg.requestId});
    },
    getNarrationState() {
      calls.push(["state"]);
      return Promise.resolve(native ? {...native} : {prepared:false});
    },
    stopNarration(arg) {
      calls.push(["stop", arg]);
      if(native?.requestId===arg.requestId) native=null;
      return Promise.resolve({stopped:true});
    },
    addListener(name,callback) {
      listeners[name]=callback;
      return Promise.resolve({remove(){}});
    }
  };
  const window = {
    document, Capacitor: { isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooNativeSound:api} },
    BibloZooNativeOnlyOutput:{enabled:nativeOnly},
    addEventListener(name,cb){listeners[name]=cb;},
    setTimeout(cb,ms){const id=++token;timers.set(id,{cb,ms});return id;},
    clearTimeout(id){timers.delete(id);},
    setInterval(cb,ms){const id=++token;intervals.set(id,{cb,ms});return id;},
    clearInterval(id){intervals.delete(id);}
  };
  vm.runInNewContext(listen,{window,document,Date,Promise,console});
  return {window,calls,events,listeners,timers,intervals,
    get native(){return native;},
    async poll(ms=300) {
      if(native?.playing) native.positionMs+=ms;
      for(const {cb} of [...intervals.values()])cb();
      await settle();
    },
    async ended() {
      const old=native && {...native};
      if(!old)throw new Error("no native player to end");
      native.playing=false;
      listeners.biblozooNarration?.({
        type:"ended",requestId:old.requestId,soundId:old.soundId,
        positionMs:old.durationMs,durationMs:old.durationMs
      });
      await settle();
      return old;
    }
  };
}
async function settle() {
  await new Promise(r=>setImmediate(r));
  await new Promise(r=>setImmediate(r));
}
async function main() {
  {
    const h=makeHarness(),pilot=h.window.BibloZooNativeLearnListen;
    const task=pilot.startFromGesture({
      verseId:"john_3_16",onEvent:event=>h.events.push(event)
    });
    assert.deepEqual(h.calls.map(x=>x[0]),["activate"],
      "gesture invokes native activation synchronously");
    const first=await task;
    assert.equal(first.ready,true);
    assert.equal(first.stage,"reference");
    assert.equal(h.calls[1][1].soundId,"learn-ref-john_3_16");
    assert.equal(h.calls.filter(x=>x[0]==="activate").length,1);
    await h.poll(700);
    assert.ok(h.events.some(x=>x.kind==="progress" && x.stage==="reference"));
    const old=await h.ended();
    assert.equal(h.calls.filter(x=>x[0]==="activate").length,1,
      "reference completion may start verse in same native session");
    assert.equal(h.calls.filter(x=>x[0]==="prepare").length,2);
    assert.equal(h.calls.filter(x=>x[0]==="play").length,2);
    assert.equal(h.calls.filter(x=>x[0]==="prepare")[1][1].soundId,
      "learn-verse-john_3_16");
    h.listeners.biblozooNarration({type:"ended",requestId:old.requestId,soundId:old.soundId});
    assert.equal(h.events.filter(x=>x.kind==="completed").length,0,
      "old reference ended is never verse completion");
    await h.poll(600);
    assert.ok(h.events.some(x=>x.kind==="progress" && x.stage==="verse"));
    await h.ended();
    assert.equal(h.events.filter(x=>x.kind==="completed").length,1,
      "only real current native verse-ended advances Listen");
    assert.equal(h.intervals.size,0);
  }
  {
    const h=makeHarness(),pilot=h.window.BibloZooNativeLearnListen;
    const started=await pilot.startFromGesture({
      verseId:"2_corinthians_5_17",stage:"verse",positionMs:5000,
      onEvent:e=>h.events.push(e)
    });
    assert.equal(started.ready,true);
    assert.equal(h.calls[1][1].soundId,"learn-verse-2_corinthians_5_17");
    assert.equal(h.calls.filter(x=>x[0]==="seek")[0][1].positionMs,5000);
    await h.poll(450);
    assert.ok(h.events.some(x=>x.kind==="progress" && x.positionMs>=5450));
    const staleId=h.native.requestId,staleSound=h.native.soundId;
    h.listeners.biblozooAppLifecycle({active:false});
    assert.equal(h.events.filter(x=>x.kind==="interrupted").length,1);
    h.listeners.biblozooAppLifecycle({active:true});
    h.listeners.biblozooNarration({
      type:"ended",requestId:staleId,soundId:staleSound
    });
    assert.equal(h.events.filter(x=>x.kind==="completed").length,0);
    assert.equal(h.intervals.size,0);
    assert.equal(h.calls.filter(x=>x[0]==="play").length,1,
      "no automatic foreground resume");
  }
  {
    const h=makeHarness(),pilot=h.window.BibloZooNativeLearnListen;
    await pilot.startFromGesture({
      verseId:"psalm_23_4",onEvent:e=>h.events.push(e)
    });
    const old=h.native;
    pilot.stop();
    h.listeners.biblozooNarration({
      type:"ended",requestId:old.requestId,soundId:old.soundId
    });
    assert.equal(h.events.filter(x=>x.kind==="completed").length,0);
  }
  {
    const h=makeHarness({activationOk:false}),pilot=h.window.BibloZooNativeLearnListen;
    const result=await pilot.startFromGesture({
      verseId:"john_3_16",onEvent:e=>h.events.push(e)
    });
    assert.equal(result.ready,false);
    assert.equal(h.calls.filter(x=>x[0]==="prepare").length,0);
    assert.equal(h.calls.filter(x=>x[0]==="play").length,0);
    assert.equal(h.events.at(-1).kind,"failed");
  }
  {
    const h=makeHarness({ios:false,nativeOnly:false}),pilot=h.window.BibloZooNativeLearnListen;
    assert.equal(pilot.isAvailable(),false);
    assert.equal((await pilot.startFromGesture({
      verseId:"john_3_16",onEvent:()=>{}
    })).ready,false);
    assert.equal(h.calls.length,0);
  }
  {
    const h=makeHarness(),pilot=h.window.BibloZooNativeLearnListen;
    assert.equal((await pilot.startFromGesture({
      verseId:"../secrets",onEvent:()=>{}
    })).ready,false);
    assert.equal(h.calls.length,0);
  }
  console.log("N5b.2 native Listen ref→verse, published manifest/Xcode public assets, checkpoint seek, interruption, stale events, Web isolation all passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
