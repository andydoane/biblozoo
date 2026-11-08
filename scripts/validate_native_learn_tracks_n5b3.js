"use strict";
/* N5b.3 real-source + VM regression, not a Swift compile or iPhone audio test. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const base = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(base, p), "utf8");
const app = read("app.js");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const tracks = read("verse_games/shared/native-learn-tracks.js");
const listen = read("verse_games/shared/native-learn-listen.js");
const index = read("index.html");
const workflow = read(".github/workflows/ios-prep-validation.yml");
const handoff = read("docs/PROJECT-HANDOFF.md");
const published = JSON.parse(read("verse_data/verse_list.json"));
new Function(app); // App syntax gate; production CI build does not parse this file.

assert.match(swift, /"learn-instruction-"/);
for (const key of ["listen","meaning","chunks1","chunks2","echo1",
  "echo_start","remove","final","games"]) {
  const filename = "instructions_" + key;
  assert.ok(swift.includes(`"${key}": "${filename}"`), "Swift allowlist " + key);
  assert.ok(fs.statSync(path.join(base,"verse_audio", filename+".mp3")).size>0,
    "Missing packaged instruction: "+filename);
}
assert.match(swift, /soundId\.hasPrefix\("learn-part-"\)/);
assert.match(swift, /json\["echoParts"\] as\? \[String\]/);
assert.match(swift, /index <= maximumPart/);
assert.match(swift, /publishedLearnVerseIDs\.contains\(verseId\)/);
assert.match(swift, /"public\/verse_audio"/);
assert.ok(published.length > 50);
for(const id of published) {
  const meta = JSON.parse(read("verse_data/"+id+".json"));
  if (!meta.published) continue;
  const echo = meta.echoParts || [];
  for(let index=0;index<=Math.max(1,echo.length);index++) {
    const filename = index===0 ? id+"_ref.mp3"
      : echo.length===0 ? id+".mp3"
      : id+String.fromCharCode(96+index)+".mp3";
    assert.ok(fs.statSync(path.join(base,"verse_audio",filename)).size>0,
      "Missing published Learn part: "+filename);
  }
}
assert.ok(index.includes('src="verse_games/shared/native-learn-tracks.js"'));
assert.ok(index.indexOf("native-learn-tracks.js") < index.indexOf('src="app.js"'));
assert.match(app, /window\.BibloZooNativeLearnTracks\.play\(/);
assert.match(app, /nativeInstructionSoundId\(State\.learnInstructionKey\)/);
assert.match(app, /"learn-instruction-" \+/);
assert.match(app, /learn-part-\$\{VERSE_ID\}-\$\{i\}/);
assert.match(app, /result\.durationMs \/ 1000/);
assert.match(app, /if \(!result\.ended\)/);
assert.match(app, /finishLearnAudioResumeAttempt\(attempt\)/);
assert.match(app, /\? 7500 : 3500/);
assert.match(app, /!isNativeLearnListenMode\(\) &&\s+window\.BibloZooZooEscape/);
assert.match(app, /function goToListenAndStart\(/);
assert.match(app, /window\.BibloZooNativeLearnListen\.hasPrimedGesture\(\)/);
assert.match(app, /listenPlay\("listen_ref", 0, true\)/);
assert.match(app, /primeNativeLearnTracks\(\)/);
assert.match(listen, /function primeFromGesture\(/);
assert.match(listen, /fromPrimedGesture/);
assert.match(workflow, /validate_native_learn_tracks_n5b3\.js/);
assert.match(handoff, /N5b\.3/);
assert.doesNotMatch(tracks,/AudioContext|new Audio\(|\.src\s*=|WebAudio|HTMLAudio/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""), /setCategory\(|setMode\(/);

const tick=()=>new Promise(ok=>setImmediate(ok));
function fixture({ ios=true, active=true, activation=true }={}) {
  const calls=[], events=[], listeners={}, timeouts=new Map(), intervals=new Map();
  let id=0;
  let state=null;
  const document={hidden:false,addEventListener(name,fn){listeners["doc:"+name]=fn;}};
  const bridge={
    activateFromGesture(input){
      calls.push(["activate",input]);
      return Promise.resolve({ready:activation});
    },
    prepareNarration(input){
      calls.push(["prepare",input]);
      state={requestId:input.requestId,soundId:input.soundId,
        prepared:true,playing:false,positionMs:0,durationMs:2000};
      return Promise.resolve({ ...state });
    },
    playNarration(input){
      calls.push(["play",input]);
      if(state?.requestId !== input.requestId)
        return Promise.resolve({accepted:false});
      state.playing=true;
      return Promise.resolve({accepted:true,requestId:input.requestId});
    },
    seekNarration(input){
      calls.push(["seek",input]);
      if (state?.requestId !== input.requestId)
        return Promise.resolve({seeked:false});
      state.positionMs=input.positionMs;
      return Promise.resolve({seeked:true,requestId:input.requestId});
    },
    getNarrationState(){
      calls.push(["state"]);
      return Promise.resolve(state ? {...state} : {prepared:false});
    },
    stopNarration(input){
      calls.push(["stop",input]);
      if(state?.requestId===input.requestId) state=null;
      return Promise.resolve({stopped:true});
    },
    addListener(name,fn){
      listeners[name]=fn;
      return Promise.resolve({remove(){}});
    }
  };
  const window={
    document,
    BibloZooNativeOnlyOutput:{enabled:active},
    Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooNativeSound:bridge}},
    addEventListener(name,fn){listeners[name]=fn;},
    setTimeout(fn,delay){const key=++id;timeouts.set(key,{fn,delay});return key;},
    clearTimeout(key){timeouts.delete(key);},
    setInterval(fn,delay){const key=++id;intervals.set(key,{fn,delay});return key;},
    clearInterval(key){intervals.delete(key);}
  };
  vm.runInNewContext(tracks,{window,document,Promise,console});
  const controller=window.BibloZooNativeLearnTracks;
  return {
    window,controller,calls,events,listeners,intervals,timeouts,
    get state(){return state;},
    async flush(){await tick();await tick();},
    async progress(positionMs){
      if (!state) throw Error("No current native track");
      state.positionMs=positionMs;
      for(const t of [...intervals.values()]) t.fn();
      await tick();await tick();
    },
    async ended(){
      if(!state) throw Error("No track");
      const prev={...state};
      listeners.biblozooNarration?.({type:"ended",soundId:prev.soundId,
        requestId:prev.requestId,positionMs:prev.durationMs,
        durationMs:prev.durationMs});
      await tick();
      return prev;
    }
  };
}
async function main() {
  {
    const h=fixture();
    assert.equal(h.controller.primeFromGesture(),true);
    assert.equal(h.calls.length,1,"activation invoked synchronously inside tap");
    const seen=[];
    const outcome=h.controller.play("learn-part-john_3_16-1",{
      onProgress: p=>seen.push(p)
    });
    await h.flush();
    assert.equal(h.calls.filter(c=>c[0]==="activate").length,1);
    assert.equal(h.calls.find(c=>c[0]==="prepare")[1].soundId,
      "learn-part-john_3_16-1");
    await h.progress(450);
    assert.equal(seen.length,1);
    assert.equal(seen[0].durationMs,2000);
    const old=await h.ended();
    const success=await outcome;
    assert.equal(success.ended,true);
    assert.equal(success.durationMs,2000);
    assert.equal(success.reason,"native-ended");
    h.listeners.biblozooNarration?.({type:"ended",
      requestId:old.requestId,soundId:old.soundId});
    assert.equal(h.intervals.size,0);
    assert.equal(h.calls.some(c=>c[0]==="stop"),true);
  }
  {
    const h=fixture();const notices=[];
    h.controller.primeFromGesture();
    const first=h.controller.play("learn-part-john_3_16-0",{
      onInterrupted:x=>notices.push(x)
    });
    await h.flush();
    const prior={...h.state};
    h.listeners.biblozooAppLifecycle({active:false});
    const aborted=await first;
    assert.equal(aborted.ended,false);
    assert.equal(aborted.reason,"interrupted");
    assert.equal(notices.length,1);
    h.listeners.biblozooNarration?.({type:"ended",
      requestId:prior.requestId,soundId:prior.soundId});
    assert.equal(h.calls.filter(c=>c[0]==="play").length,1,
      "no automatic foreground replay");
    assert.equal(h.intervals.size,0);
    h.listeners.biblozooAppLifecycle({active:true});
    assert.equal(h.calls.filter(c=>c[0]==="activate").length,1);
  }
  {
    const h=fixture();h.controller.primeFromGesture();
    const first=h.controller.play("learn-part-psalm_23_4-2",{positionMs:600});
    await h.flush();
    assert.equal(h.calls.find(c=>c[0]==="seek")[1].positionMs,600);
    const old={...h.state};
    h.controller.stop();
    assert.equal((await first).ended,false);
    h.listeners.biblozooNarration?.({
      type:"ended",requestId:old.requestId,soundId:old.soundId
    });
    assert.equal(h.intervals.size,0);
  }
  {
    const h=fixture({activation:false});
    h.controller.primeFromGesture();
    const res=await h.controller.play("learn-instruction-listen");
    assert.equal(res.ended,false);
    assert.equal(h.calls.filter(c=>c[0]==="prepare").length,0);
  }
  {
    const h=fixture({ios:false,active:false});
    assert.equal(h.controller.primeFromGesture(),false);
    assert.equal((await h.controller.play("learn-instruction-listen")).ended,false);
    assert.equal(h.calls.length,0);
  }
  {
    const h=fixture();
    assert.equal((await h.controller.play("learn-part-../../bad-2")).ended,false);
    assert.equal(h.calls.length,0);
  }
  console.log("N5b.3 curated instruction/part inventory, native session priming, completed-only progression, native position, explicit interruption, no Web/Zoo fallback passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
