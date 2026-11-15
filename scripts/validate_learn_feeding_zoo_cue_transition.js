#!/usr/bin/env node
"use strict";
/* Grouped Learn + Feeding Zoo cue-first return: VM of production helper,
 * actual Learn recovery, and Feeding controller callbacks. Native/WK clocks
 * simulated; real audible iPhone/Apple SDK testing is still required. */
const assert=require("node:assert/strict"),fs=require("node:fs");
const path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const shared=read("verse_games/shared/welcome-back-return.js");
const learn=read("app.js"),feed=read("daily_questions_feed_game.js");
const sw=read("service-worker.js");
let checks=0;
function ok(v,msg){assert.ok(v,msg);checks++;}
function eq(a,b,msg){assert.equal(a,b,msg);checks++;}
for(const source of [shared,learn,feed])new vm.Script(source);
ok(shared.includes("createZooAudioCue, resumeAudioOnGesture"),
  "export original shared cue once for all adapted owners");
ok(learn.includes("preselectWelcomeSurprise: false") &&
   learn.includes("const resume = learnAudioInterrupted") &&
   learn.includes("if (!learnZooCueVerified) pauseLearnAudioForInterruption()"),
   "Learn keeps paused checkpoint until final real LOCK GATE");
ok(learn.includes("if (!isNativeLearnListenMode() &&") &&
   learn.includes("surpriseEnabled: false"),
   "all Learn modes keep normal recovery with no random/forced Zoo");
ok(feed.includes("preselectWelcomeSurprise: false") &&
   feed.includes("surpriseEnabled: false") &&
   feed.includes("runtime.nativePilotBackend !== \"native\" ||"),
   "all Feeding modes keep original recovery with no random/forced Zoo");
ok(feed.includes("runtime.feedResumeGeneration !== generation") &&
   feed.includes("shiftFeedingDeadlines(runtime, elapsed)") &&
   feed.includes("runtime.feedAudioRecoveryVerified = true;"),
   "original native and Web Feeding proof/timing remain game-owned");
ok(feed.includes("onRecoveryExitToZoo || runtime.onBackToZoo") &&
   feed.includes("runtime.zooWasCueFirst"),
   "Feeding retains no-reward abort and stale second-lock guards");
ok(sw.includes('"./verse_games/shared/welcome-back-return.js"') &&
   sw.includes('"./daily_questions_feed_game.js"'),
   "new helper and Feeding code remain offline shell-cached");

function cueHarness({native=false,stalled=false,deny=false}={}){
  const events=[];let samples=0,mediaMade=0;
  class FakeAudio {
    constructor(src){mediaMade++;events.push("media:"+src);this.running=false;
      this._position=0;}
    get currentTime(){if(this.running && !stalled)this._position+=.06;
      return this._position;}
    play(){events.push("web-play");this.running=true;
      return deny?Promise.reject(Error("audio denied")):Promise.resolve();}
    pause(){events.push("web-stop");this.running=false;}
    removeAttribute(){}setAttribute(){}load(){}
  }
  const api={
    activateFromGesture({purpose}){events.push("activate:"+purpose);
      return Promise.resolve({ready:!deny});},
    preload({soundId}){events.push("preload:"+soundId);
      return Promise.resolve({prepared:true});},
    play({soundId}){events.push("play:"+soundId);
      return Promise.resolve({accepted:!deny});},
    getCuePlaybackState({soundId}){events.push("sample:"+soundId);
      samples++;return Promise.resolve({ok:true,
        positionMs:stalled?0:samples*55,playing:true,completed:false});},
    stop({soundId}){events.push("stop:"+soundId);return Promise.resolve({stopped:true});}
  };
  const root={document:{hidden:false},BibloZooNativeOnlyOutput:{enabled:native},
    Audio:native?class NoHtmlAudio{constructor(){throw Error("Native HTML fallback");}}:FakeAudio,
    Capacitor:{Plugins:{BibloZooNativeSound:api}},
    setTimeout(fn){Promise.resolve().then(fn);return 1;},clearTimeout(){}};
  vm.runInNewContext(shared,{window:root,document:root.document,Promise,setTimeout});
  return {root,events,api:root.BibloZooWelcomeBackReturn.createZooAudioCue(),
    get samples(){return samples;},get mediaMade(){return mediaMade;}};
}
async function cueChecks(){
  for(const native of [true,false]){
    const h=cueHarness({native});
    const proof=await h.api.playFromGesture({isMuted:()=>false,
      assetRoot:"",isCurrent:()=>true});
    eq(proof,true,(native?"native":"web")+" cue really advances");
    if(native){
      ok(h.samples>=2,"compare TWO native AVAudioPlayer currentTime samples");
      eq(h.mediaMade,0,"native never instantiates HTML Audio");
      ok(h.events.includes("activate:ui") &&
         h.events.includes("play:pilot-unlock"),"same soloAmbient owner");
    }else{
      ok(h.events.includes("media:ui_audio/ui_pet_unlock.mp3"),
        "main app HTML cue uses existing bundled BibloPet sample");
    }
    h.api.stop();
    ok(h.events.some(e=>e.startsWith(native?"stop:pilot-unlock":"web-stop")),
      "cue is stopped before game's original sound owner runs");
  }
  for(const native of [true,false]){
    const h=cueHarness({native,stalled:true});
    eq(await h.api.playFromGesture({isMuted:()=>false,assetRoot:"",
      isCurrent:()=>true}),false,
      "accepted play without progressing "+(native?"native":"web")+" clock is NOT proof");
  }
  const denied=cueHarness({native:true,deny:true});
  eq(await denied.api.playFromGesture({isMuted:()=>false,isCurrent:()=>true}),
    false,"OS-denied native session never commits a surprise");
  eq(denied.mediaMade,0,"OS denial has no HTML fallback");
  const mute=cueHarness({native:true});
  eq(await mute.api.playFromGesture({isMuted:()=>true,isCurrent:()=>true}),
    true,"muted cue is intentionally quiet");
  eq(mute.events.length,0,"mute cannot seize external audio priority");
  const stale=cueHarness({native:true});
  let live=true;
  const pending=stale.api.playFromGesture({isMuted:()=>false,
    isCurrent:()=>live});
  live=false;stale.api.stop();
  eq(await pending,false,"second lock or Exit rejects stale native cue");
}
function extract(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  ok(a>=0&&b>a,"source extraction "+start);
  return source.slice(a,b);
}
async function learnChecks(){
  const code=extract(learn,"function beginLearnZooRecovery(",
    "\nfunction ensureLearnAudioResumeOverlay()");
  for(const mode of ["listen","chunk","echo"]){
    const recovery={screen:"learn-"+mode,mode};let ownerCalls=0,cueCalls=0;
    const env={Promise,setTimeout,document:{hidden:false},
      State:{screen:recovery.screen},
      learnAudioInterrupted:recovery,learnZooRecovery:recovery,
      learnAudioResumeAttempt:null,learnAudioResumeError:"",
      learnZooCueVerified:false,learnZooCueGeneration:0,muted:false,
      isLearnAudioOverlayRecovery:r=>r===recovery,
      learnZooCue:{stop(){},playFromGesture({isCurrent}){
        cueCalls++;ok(isCurrent(),"Learn cue matches original recovery");
        return Promise.resolve(true);}},
      resumeInterruptedLearnAudio(){ownerCalls++;
        env.learnAudioInterrupted=null;return true;}};
    vm.runInNewContext(code+"\nthis.recover=beginLearnZooRecovery;",env);
    eq(await env.recover({plannedSurprise:"escape"}),true,mode+" cue proof");
    eq(cueCalls,1,mode+" selected pet uses one shared cue");
    eq(ownerCalls,0,mode+" first gesture CANNOT start original verse audio");
    eq(env.learnAudioInterrupted,recovery,mode+" original checkpoint still frozen");
    eq(env.learnZooCueVerified,true,mode+" cue marked only after proof");
    eq(await env.recover(),true,mode+" original checkpoint final verifier");
    eq(ownerCalls,1,mode+" owner resumed only at final real gate");
    // No selected surprise must retain the original one-gesture playback.
    env.learnAudioInterrupted=recovery;env.learnZooRecovery=recovery;
    eq(await env.recover({plannedSurprise:null}),true,
      mode+" no-surprise original recovery");
    eq(ownerCalls,2,mode+" no-surprise has no new cue requirement");
    eq(cueCalls,1,mode+" no cue for no-surprise return");
  }
}
async function feedingChecks(){
  const code=extract(feed,"    if (window.BibloZooZooEscape?.create) {",
    "    // Pilot-only hidden entry:");
  for(const mode of ["classic","labyrinth","bounce","melody"]){
    const events=[];let opts=null,prepared=0,pass=true;
    const runtime={mode,running:true,finished:false,feedPausedAt:900,
      feedPageHidden:false,zooCueGeneration:0,zooCueVerified:false,
      zooHoldingForSurprise:false,zooWasCueFirst:false,
      resumeOverlay:{hidden:false},zooSoundClockSample:1,
      zooCue:{stop(){events.push("stop-cue");},
        playFromGesture({isCurrent}){events.push("cue");
          ok(isCurrent(),mode+" cue anchored in current paused runtime");
          return Promise.resolve(true);}}};
    const env={Promise,document:{hidden:false},runtime,activeRuntime:runtime,
      performance:{now:()=>1234},
      window:{BibloZooZooEscape:{create(o){opts=o;return {
        isPaused(){return true;},start(){events.push("new-welcome");}
      };}},BibloZooApp:{isMuted:()=>false}},
      getFeedZooTestResult(){throw Error("pilot test was not enabled");},
      pauseFeedingGame(){events.push("pause-owner");return false;},
      attemptFeedingResumeFromGesture(r,cb,keepOverlay){
        prepared++;events.push("owner-prepare:"+!!keepOverlay);
        // Model a genuinely verified native bank or Web clock result.
        Promise.resolve().then(()=>{
          if(pass)r.feedPausedAt=null;
          cb(pass);
        });
        return true;
      },
      continueFeedingAfterGesture(){throw Error("no unverified Feeding unfreeze");},
      stop(){events.push("exit");},recordFeedAudioRecovery(){},
    };
    vm.runInNewContext(code,env);
    eq(opts.preselectWelcomeSurprise,false,mode+" never preselects in normal gameplay");
    eq(await opts.recover({plannedSurprise:"escape"}),true,mode+" first cue verified");
    eq(prepared,0,mode+" first tap NEVER resumes Feeding bank or score clock");
    eq(runtime.feedPausedAt,900,mode+" frozen Feeding checkpoint retained");
    opts.onSurpriseStart("escape");
    eq(runtime.zooHoldingForSurprise,true,mode+" pet holds original mode");
    ok(!events.includes("pause-owner"),mode+" cue cannot re-pause and reset Melody");
    opts.onRecovered();
    eq(prepared,1,mode+" LOCK GATE starts original sound in real gesture");
    await Promise.resolve();await Promise.resolve();
    eq(runtime.feedPausedAt,null,mode+" verified original audio releases round");
    eq(runtime.resumeOverlay.hidden,true,mode+" hide only after owner verification");
    ok(events.includes("owner-prepare:true"),mode+" final keeps overlay while verifying");
    // Failure at original gate must NOT reward, dismiss or unfreeze game.
    pass=false;runtime.feedPausedAt=900;runtime.zooHoldingForSurprise=true;
    runtime.zooCueVerified=true;runtime.zooWasCueFirst=true;
    runtime.resumeOverlay.hidden=false;
    const before=events.filter(x=>x==="new-welcome").length;
    opts.onRecovered();await Promise.resolve();await Promise.resolve();
    eq(runtime.feedPausedAt,900,mode+" rejected original bank stays frozen");
    ok(events.filter(x=>x==="new-welcome").length>before,
      mode+" rejection restarts real Welcome Back");
    // A no-surprise tap still calls ORIGINAL owner directly.
    pass=true;runtime.feedPausedAt=900;runtime.zooHoldingForSurprise=false;
    runtime.zooWasCueFirst=false;
    const count=prepared;
    eq(await opts.recover({plannedSurprise:null}),true,
      mode+" no-surprise original verified recovery");
    eq(prepared,count+1,mode+" no-surprise owner recovers immediately");
    // Cue verified but provisional odds commit failed: no fake game recovery.
    runtime.feedPausedAt=900;runtime.zooCueVerified=true;
    runtime.zooHoldingForSurprise=false;runtime.zooWasCueFirst=false;
    const initial=events.filter(x=>x==="new-welcome").length;
    opts.onRecovered();
    ok(events.filter(x=>x==="new-welcome").length>initial,
      mode+" failed pet commit re-prompts without giving credit");
    eq(runtime.feedPausedAt,900,mode+" failed pet commit keeps mode frozen");
    // A second lock revokes earlier cue verification.
    runtime.zooWasCueFirst=true;runtime.zooCueVerified=false;
    runtime.zooHoldingForSurprise=true;
    const beforeSecond=events.filter(x=>x==="new-welcome").length;
    opts.onRecovered();
    ok(events.filter(x=>x==="new-welcome").length>beforeSecond,
      mode+" second lock never allows legacy no-audio continuation");
    eq(runtime.feedPausedAt,900,mode+" second lock cannot unfreeze score");
  }
}
(async()=>{await cueChecks();await learnChecks();await feedingChecks();
  console.log("Learn + Feeding cue-first Zoo transition PASS: "+checks+
    " checks incl native/Web clock, native exclusions, Learn 3 modes, "+
    "Feeding 4 modes, no-surprise, gate refusal, second lock and no fake scores");
})().catch(e=>{console.error(e);process.exitCode=1;});
