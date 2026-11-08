"use strict";
/* N6c: verify real Bible Bugs source, Swift fixed resources and controller
 * with a controlled VM. CI does not prove Swift Xcode build or speaker audio.
 */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const base=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(base,p),"utf8");
const game=read("verse_games/bible_bugs/game.js");
const bridgeSource=read("verse_games/shared/native-bible-bugs-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const html=read("verse_games/bible_bugs/index.html");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const webAudio=read("verse_games/shared/native-snake-audio.js");
new Function(game);new Function(bridgeSource);
const files={
  tongue:"bible_bugs_tongue",pop1:"bible_bugs_pop_1",
  pop2:"bible_bugs_pop_2",pop3:"bible_bugs_pop_3",
  pop4:"bible_bugs_pop_4",pop5:"bible_bugs_pop_5",
  correct:"bible_bugs_correct",incorrect:"bible_bugs_incorrect",
  streak:"bible_bugs_streak",bonusStart:"bible_bugs_bonus_start",
  bonusEnd:"bible_bugs_bonus_end",stinkBug:"bible_bugs_stink_bug"
};
const ids={
  tongue:"bugs-tongue",pop1:"bugs-pop-1",pop2:"bugs-pop-2",
  pop3:"bugs-pop-3",pop4:"bugs-pop-4",pop5:"bugs-pop-5",
  correct:"bugs-correct",incorrect:"bugs-incorrect",
  streak:"bugs-streak",bonusStart:"bugs-bonus-start",
  bonusEnd:"bugs-bonus-end",stinkBug:"bugs-stink-bug"
};
for(const [key,name] of Object.entries(files)){
  const soundId=ids[key];
  assert.match(swift,new RegExp('"'+soundId+'": "'+name+'"'),"Swift fixed resource "+soundId);
  assert.match(bridgeSource,new RegExp(key+': "'+soundId+'"'),"JS sound map "+key);
  const file=path.join(base,"verse_games/bible_bugs/bible_bugs_sounds",name+".mp3");
  assert.ok(fs.existsSync(file)&&fs.statSync(file).size>0,"published MP3 "+file);
  assert.match(game,new RegExp(name.replace(/_/g,"_")+"\\.mp3"),"original sound preserved");
}
for(const [key,id] of [["uiTap1","ui-pop-1"],["uiTap2","ui-pop-2"]]){
  assert.match(bridgeSource,new RegExp(key+': "'+id+'"'));
  assert.ok(fs.statSync(path.join(base,"ui_audio",key==="uiTap1"?"ui_sound_pop_1.mp3":"ui_sound_pop_2.mp3")).size>0);
}
assert.match(swift,/private let bibleBugsSoundResources: \[String: String\]/);
assert.match(swift,/bibleBugsSoundResources\[soundId\] != nil/);
assert.match(swift,/self\.bibleBugsSoundResources\[soundId\]/);
assert.match(swift,/subdirectory: "public\/verse_games\/bible_bugs\/bible_bugs_sounds"/);
assert.match(swift,/"bugs-stink-bug"/);
assert.match(swift,/private let pcmEffectIDs: Set<String>/);
assert.doesNotMatch(swift.replace(/\/\/[^\n]*/g,""),/setCategory\(|setMode\(/);
assert.match(html,/shared\/native-bible-bugs-audio\.js/);
assert.ok(html.indexOf("native-bible-bugs-audio.js")<html.indexOf('src="./game.js"'));
assert.match(game,/if \(nativeBugsAudio\) return Promise\.resolve\(nativeBugsAudio\.isReady\(\)\)/);
assert.match(game,/nativeBugsAudio\.play\(key, soundVolume\(volumeKey\)\)/);
assert.match(game,/if \(nativeBugsAudio\) primeBibleBugsFromGesture\("round", mode\)/);
assert.match(game,/if \(nativeBugsAudio && !muted\) primeBibleBugsFromGesture\("resume"\)/);
assert.match(game,/primeBibleBugsFromGesture\("resume"\)/);
assert.match(game,/bugsWelcomeBack\?\.pauseFromNativeInactive\?\.\(\)/);
assert.match(game,/bugsWelcomeBack\?\.showAfterNativeActive\?\.\(\)/);
assert.match(game,/useZooEscape: !nativeBugsAudio/);
assert.match(game,/suppressUiSound: !!nativeBugsAudio/);
assert.match(game,/nativeBugsAudio\.prepareFromGesture\(\)\.then/);
assert.match(game,/function cancelNativeBugsPreflight/);
assert.match(game,/function showNativeBugsFailure/);
assert.doesNotMatch(game,/Getting native game sounds ready/);
assert.doesNotMatch(bridgeSource,/new Audio\(|createOscillator\(|createBufferSource\(/);
assert.match(bridgeSource,/activateFromGesture\(\{ purpose: "game" \}\)/);
assert.match(bridgeSource,/Promise\.all\(IDS\.map\(soundId/);
assert.match(bridgeSource,/if \(!current\(token\)\)/);
assert.match(workflow,/validate_native_bible_bugs_n6c\.js/);
assert.match(handoff,/N6c/);

// Isolated exact native sound owner (not a synthetic replacement).
function fixture({ios=true,nativeOnly=true,missing="",rejectPlay="",
  holdFirstBank=false}={}){
  const calls=[],callbacks={},messages=[],alarms=[],held=[];
  let holding=holdFirstBank;
  const document={hidden:false,addEventListener:(k,fn)=>{callbacks["doc:"+k]=fn}};
  const bridge={
    activateFromGesture(input){calls.push(["activate",input]);return Promise.resolve({ready:true});},
    preload(input){calls.push(["preload",input]);const result={
      prepared:input.soundId!==missing,durationMs:input.soundId===missing?0:120,
      reason:input.soundId===missing?"bundled-asset-missing":"prepared"
    };
    if (!holding) return Promise.resolve(result);
    return new Promise(resolve=>held.push(()=>resolve(result)));
    },
    play(input){calls.push(["play",input]);return Promise.resolve({
      accepted:input.soundId!==rejectPlay,
      reason:input.soundId===rejectPlay?"pcm-not-preloaded":"scheduled"
    });},
    stop(input){calls.push(["stop",input]);return Promise.resolve({stopped:true});},
    addListener(k,fn){callbacks[k]=fn;return Promise.resolve({remove(){}});}
  };
  const window={
    document,Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooNativeSound:bridge}},
    BibloZooNativeOnlyOutput:{enabled:nativeOnly},
    setTimeout,clearTimeout,
    addEventListener(k,fn){callbacks["win:"+k]=fn;}
  };
  vm.runInNewContext(bridgeSource,{window,Promise,Date,Error,console});
  const api=window.BibloZooNativeBibleBugsAudio;
  api.configure({
    onAppInactive:()=>messages.push("inactive"),
    onAppActive:()=>messages.push("active"),
    onPlaybackFailure:why=>alarms.push(why)
  });
  return {api,calls,callbacks,messages,alarms,document,
    releaseOldBank(){holding=false;held.splice(0).forEach(release=>release());}
  };
}
const flush=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));};
async function controllerTests(){
  const h=fixture();
  const begin=h.api.prepareFromGesture();
  assert.equal(h.calls[0][0],"activate","Swift session call must be synchronous in real tap");
  assert.equal(h.calls[0][1].purpose,"game");
  assert.equal((await begin).ready,true);
  const preload=h.calls.filter(x=>x[0]==="preload").map(x=>x[1].soundId);
  assert.equal(preload.length,14);
  assert.equal(new Set(preload).size,14);
  assert.deepEqual([...preload].sort(),[...Object.values(ids),"ui-pop-1","ui-pop-2"].sort());
  for(const [key,id] of Object.entries(ids)){
    assert.equal(h.api.play(key,.42),true);
  }
  assert.equal(h.api.play("uiTap1",.2),true);
  assert.equal(h.api.play("uiTap2",.2),true);
  assert.equal(h.api.play("../asset.mp3",.1),false);
  assert.equal(h.api.play("tongue",-1),false);
  assert.equal(h.api.play("correct",2),false);
  await flush();
  const plays=h.calls.filter(x=>x[0]==="play").map(x=>x[1]);
  assert.equal(plays.length,14);
  assert.ok(plays.every(x=>/^bugs-|^ui-pop-/.test(x.soundId)
    && x.volume>=0&&x.volume<=1
    && x.eventId.startsWith("bugs-") && !("url" in x) && !("noteIndex" in x)));
  assert.equal(h.alarms.length,0);
  h.callbacks.biblozooAppLifecycle({active:false});
  await flush();
  assert.equal(h.api.isReady(),false);
  assert.equal(h.api.play("tongue",.42),false);
  assert.deepEqual(h.messages,["inactive"]);
  h.callbacks.biblozooAppLifecycle({active:true});
  assert.deepEqual(h.messages,["inactive","active"]);
  assert.equal(h.calls.filter(x=>x[0]==="activate").length,1,
    "foreground may show Welcome Back, never auto activate");
  assert.equal((await h.api.prepareFromGesture()).ready,true);
  assert.equal(h.calls.filter(x=>x[0]==="activate").length,2);
  const noIos=fixture({ios:false,nativeOnly:false});
  assert.equal(noIos.api.isAvailable(),false);
  assert.equal((await noIos.api.prepareFromGesture()).ready,false);
  assert.equal(noIos.calls.length,0);
  const missing=fixture({missing:"bugs-pop-3"});
  const answer=await missing.api.prepareFromGesture();
  assert.equal(answer.ready,false);
  assert.equal(answer.reason,"bundled-asset-missing");
  assert.equal(missing.api.play("correct",.42),false);
  assert.ok(missing.calls.some(x=>x[0]==="stop"));
  const failing=fixture({rejectPlay:"bugs-correct"});
  assert.equal((await failing.api.prepareFromGesture()).ready,true);
  assert.equal(failing.api.play("correct",.42),true);
  await flush();
  assert.deepEqual(failing.alarms,["pcm-not-preloaded"]);
  assert.equal(failing.api.isReady(),false);
  // N6c race: first bank's pending Swift preload finishes LATE, after a
  // fresh real tap completed a second bank. The stale first generation
  // must not call stopNative() again and discard the valid newer bank.
  const raced=fixture({holdFirstBank:true});
  const older=raced.api.prepareFromGesture();
  await flush();
  assert.equal(raced.calls.filter(x=>x[0]==="preload").length,14);
  await raced.api.stop(); // actual UIKit inactive / Back gesture
  const newer=raced.api.prepareFromGesture(); // fresh actual child tap
  assert.equal((await newer).ready,true,"new bank ready before older preload response");
  const stopsBefore=raced.calls.filter(x=>x[0]==="stop").length;
  raced.releaseOldBank();
  assert.equal((await older).ready,false);
  await flush();
  assert.equal(raced.api.isReady(),true,
    "late stale bank cannot discard the new explicitly warmed bank");
  assert.equal(raced.calls.filter(x=>x[0]==="stop").length,stopsBefore,
    "late response must not send Stop after newer bank ready");
}

function deferred(){let resolve;const promise=new Promise(done=>{resolve=done});return{promise,resolve};}
function gameOwner(){
  const calls=[],preparations=[],events={},attrs=new Map(),buttons={
    "[data-bugs-audio-status]":{textContent:""},
    "[data-bugs-audio-retry]":{onclick:null},
    "[data-bugs-audio-exit]":{onclick:null}
  };
  let gate=null;
  const doc={
    hidden:false,
    getElementById:id=>id==="bbNativeAudioFailure"?gate:null,
    createElement:()=>({id:"",innerHTML:"",className:"",
      querySelector:k=>buttons[k],remove(){gate=null;}}),
    body:{appendChild:node=>{gate=node;}},
    addEventListener:(k,fn)=>{events[k]=fn}
  };
  const app={
    setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)
  };
  const state={running:false,paused:false,done:false};
  let configured;
  const audio={
    isAvailable:()=>true,
    configure:conf=>{configured=conf;},
    prepareFromGesture(){calls.push("prepare");const d=deferred();preparations.push(d);return d.promise;},
    stop(){calls.push("stop");return Promise.resolve();},
    isReady:()=>false,
    play(...args){calls.push(["play",...args]);return true;}
  };
  const ctx={console,Promise,window:{BibloZooNativeBibleBugsAudio:audio,
    VerseGameBridge:{exitGame:()=>calls.push("exit")}},
    document:doc,app,state,muted:false,returnPaused:false,
    startGame:mode=>calls.push("start:"+mode),
    setPaused:paused=>{state.paused=paused;calls.push("paused:"+paused);},
    stopLoop:()=>{state.running=false;calls.push("stop-loop");},
    renderModeSelect:()=>calls.push("mode-select"),
    pauseForTaskSwitch:()=>calls.push("pause-switch")
  };
  const first=game.indexOf("  const nativeBugsAudio =");
  const last=game.indexOf("  preloadBibleBugsImages();",first);
  assert.ok(first>0&&last>first,"extract actual game owner source");
  vm.runInNewContext(game.slice(first,last)+
    "\nthis.api={primeBibleBugsFromGesture,cancelNativeBugsPreflight,showNativeBugsFailure,hideNativeBugsFailure};",
    ctx);
  return{calls,preparations,events,attrs,state,doc,ctx,buttons,configured,
    get gate(){return gate;},api:ctx.api};
}
async function ownerTests(){
  const h=gameOwner();
  h.api.primeBibleBugsFromGesture("round","easy");
  assert.equal(h.calls[0],"prepare","native gesture preflight must start synchronously");
  assert.equal(h.gate,null,"normal preparation must not show gray popup");
  assert.equal(h.attrs.get("aria-busy"),"true");
  h.api.primeBibleBugsFromGesture("round","hard");
  assert.equal(h.preparations.length,1,"duplicate difficulty doesn't start another bank");
  h.preparations[0].resolve({ready:true});
  await flush();
  assert.deepEqual(h.calls.filter(x=>x.startsWith("start:")),["start:easy"]);
  assert.equal(h.gate,null);
  assert.equal(h.attrs.has("aria-busy"),false);
  h.state.running=true;h.state.paused=true;
  h.api.primeBibleBugsFromGesture("resume");
  h.preparations[1].resolve({ready:true});
  await flush();
  assert.equal(h.state.paused,false,"same round continues without reset");
  assert.equal(h.calls.filter(x=>x.startsWith("start:")).length,1);
  const failed=gameOwner();
  failed.api.primeBibleBugsFromGesture("round","medium");
  failed.preparations[0].resolve({ready:false,reason:"bundled-asset-missing"});
  await flush();
  assert.ok(failed.gate,"only genuine native failure shows Try Again");
  assert.match(failed.buttons["[data-bugs-audio-status]"].textContent,/aren't ready/);
  failed.buttons["[data-bugs-audio-retry]"].onclick();
  assert.equal(failed.gate,null);
  failed.preparations[1].resolve({ready:true});
  await flush();
  assert.ok(failed.calls.includes("start:medium"));
  const back=gameOwner();
  back.api.primeBibleBugsFromGesture("round","hard");
  back.api.cancelNativeBugsPreflight();
  back.preparations[0].resolve({ready:true});
  await flush();
  assert.ok(!back.calls.includes("start:hard"),"stale Back response must never start game");
  assert.equal(back.attrs.has("aria-busy"),false);
  const inactive=gameOwner();
  inactive.api.primeBibleBugsFromGesture("round","easy");
  inactive.configured.onAppInactive();
  inactive.preparations[0].resolve({ready:false,reason:"stale"});
  await flush();
  inactive.configured.onAppActive();
  assert.equal(inactive.gate,null,"backgrounded initial preflight cannot invent gray popup");
  assert.equal(inactive.calls.filter(x=>x==="prepare").length,1,
    "foreground cannot activate without another explicit tap");
  const inGame=gameOwner();
  inGame.state.running=true;
  inGame.configured.onPlaybackFailure("play-timeout");
  assert.equal(inGame.state.paused,true);
  assert.ok(inGame.gate);
  inGame.buttons["[data-bugs-audio-retry]"].onclick();
  inGame.preparations[0].resolve({ready:true});
  await flush();
  assert.equal(inGame.state.paused,false);
  assert.ok(!inGame.calls.some(x=>x.startsWith("start:")),"no reset on in-round failure");
}
async function eventRouting(){
  const start=game.indexOf("  async function playGameSound(key, volumeKey = key) {");
  const end=game.indexOf("  function playUiTapSound()",start);
  assert.ok(start>0&&end>start);
  const played=[];
  const ctx={nativeBugsAudio:{play:(...args)=>played.push(args)},
    muted:false,returnPaused:false,document:{hidden:false},
    state:{running:true,paused:false},
    soundVolume:k=>({tongue:.432,pop:.468,correct:.522,incorrect:.252,uiTap:.378})[k],
    getAudioContext:()=>{throw Error("Web Audio was accessed on native iOS");},
    console};
  vm.runInNewContext(game.slice(start,end)+"\nthis.playGameSound=playGameSound",ctx);
  await ctx.playGameSound("tongue");
  await ctx.playGameSound("pop3","pop");
  await ctx.playGameSound("correct");
  assert.equal(played.length,3);
  assert.deepEqual(played.map(x=>x[0]),["tongue","pop3","correct"]);
  assert.equal(played[0][1],.432);
  assert.equal(played[1][1],.468);
  ctx.state.paused=true;
  await ctx.playGameSound("correct");
  assert.equal(played.length,3);
  await ctx.playGameSound("uiTap1","uiTap");
  assert.equal(played.length,4);
  ctx.muted=true;await ctx.playGameSound("uiTap2","uiTap");
  assert.equal(played.length,4);
  ctx.muted=false;ctx.returnPaused=true;
  await ctx.playGameSound("pop1","pop");
  assert.equal(played.length,4);
}
(async()=>{await controllerTests();await ownerTests();await eventRouting();
  console.log("N6c Bible Bugs native fixed MP3s, gesture-only full bank, quiet success, valid gameplay events/volume, held App Switcher/no-auto-return, failure Retry, Back/race cancellation and no Web/HTML fallback: PASS");
})().catch(err=>{console.error(err);process.exitCode=1;});
