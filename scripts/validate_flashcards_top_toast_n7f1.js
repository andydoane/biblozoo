/* N7f.1: Flashcards feedback UI must never shift its recorded-voice controls.
 * Real audio/mic/Wacky/scoring contracts remain covered by older suites.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const src=read("flashcards/flashcards.js");
const css=read("flashcards/flashcards.css");
const medal=read("daily_zoo_todo.css");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const has=(s,v,why)=>assert(s.includes(v),why+": "+v);
new vm.Script(src);
for(const v of ["position: fixed;","z-index: 60000;","left: 50%;",
 "background: #ff5a51;","color: #ffffff;","pointer-events: none;",
 "animation: flashcardsToastLife 4600ms ease forwards;"])
 has(css,v,"Fixed, coral, white medal-like toast contract");
has(medal,".daily-medal-toast {","Match existing Zoo-To-Do toast surface");
has(medal,"top: calc(16px + var(--safeT));",
 "Use same medal-top safe-area clearance");
has(css,"@media (prefers-reduced-motion: reduce)",
 "Reduced-motion accessibility");
has(src,'document.body.appendChild(toast)',
 "Toast is a body-level portal outside rerendered Flashcards cards");
has(src,'document.addEventListener("pointerdown", dismissFlashcardsToast, true)',
 "Any physical tap dismisses without blocking button action");
has(src,'document.addEventListener("click", dismissFlashcardsToast, true)',
 "Keyboard/screen reader activated button click also dismisses");
has(src,'toast.setAttribute("aria-live", "polite")',
 "Feedback has accessible live announcement");
has(src,"flashcardsToastTimer = setTimeout(dismissFlashcardsToast, 4600)",
 "Zoo-style auto dismissal doesn't require a tap");
assert(!src.includes('id="flashcardsContinueUnheardBtn"') &&
       !src.includes("flashcards-recording-note") &&
       !src.includes("flashcards-listen-message"),
 "No message or extra failure button participates in card/control layout");
assert(!css.includes(".flashcards-recording-note") &&
       !css.includes(".flashcards-listen-message"),
 "No obsolete in-flow message styling remains");
has(src,'const continuedWithoutListening = currentAudio.hasRecording &&',
 "Skip exists only for failed real recording playback");
has(src,'currentAudio.playbackFailed && !currentAudio.playbackComplete',
 "Failure escape cannot fake listened-to success");
has(src,'state.view = "challenge_complete"',
 "Original explicit opt-out still leads to grading normally");
has(src,'!audio.playbackComplete && !canContinueUnheard',
 "No ordinary Next without actually heard take");
has(src,'wackyReplayPlaying = true;',
 "Native/browser Wacky button still reflects starting");
has(src,'wackyReplayMessage = "";',
 "Redundant getting-ready/stopped messages eliminated");
has(src,'/playback was interrupted/i.test(audio.message)',
 "Redundant interruption feedback deliberately not surfaced");
has(src,"api.showRecordingFallback",
 "Native mic permission/safety guidance still available");
has(workflow,"validate_flashcards_top_toast_n7f1.js",
 "New UI regression must run on experiment CI");
for(const p of ["docs/PROJECT-HANDOFF.md","docs/TESTING.md",
 "docs/AUDIO-RECOVERY.md",
 "docs/N7F1-FLASHCARDS-NO-SHIFT-TOP-TOAST.md"])
 has(read(p),"N7f.1","Mandatory living handoff updated");

function fixture(){
  const docListeners={},winListeners={},domNodes=[],timers=new Map();
  let nextTimer=0,prevented=0,renders=0,interrupted=0,stopped=0,paused=0;
  let onChange=null,onInterrupted=null;
  let audio={
    status:"ready",hasRecording:true,playbackComplete:false,
    playbackFailed:false,message:"",nativeReplay:true,nativeWacky:true,
    captureOnly:false,playbackAvailable:true
  };
  const body={
    appendChild(node){domNodes.push(node);node.parentNode=body;return node;}
  };
  const doc={
    hidden:false,body,
    createElement(tag){
      return {tag,className:"",attributes:{},textContent:"",
        setAttribute(k,v){this.attributes[k]=v;},
        remove(){const i=domNodes.indexOf(this);if(i>=0)domNodes.splice(i,1);}
      };
    },
    addEventListener(k,fn){(docListeners[k] ||= []).push(fn);}
  };
  const record={
    snapshot:()=>audio,
    pause(){paused++;},
    stopFun(){stopped++;return false;},
    dispose(){interrupted++;},
    interruptCapture(){},
    play(){return Promise.resolve(true);}
  };
  const win={
    location:{protocol:"capacitor:"},
    Capacitor:{isNativePlatform:()=>true},
    BibloZooAudioEffects:{getOfficialPresetIds:()=>["squirrel","giant"],
      isSupported:()=>false},
    BibloZooRecording:{create(callbacks){
      onChange=callbacks.onChange;onInterrupted=callbacks.onInterrupted;
      return record;
    }},
    addEventListener(k,fn){(winListeners[k] ||= []).push(fn);}
  };
  const hooks=`
    window.__flashcardsToastHooks = {
      showFlashcardsToast,dismissFlashcardsToast,renderComparison,
      prepare: () => {
        state.view = "comparison";
        state.selectedVerseId = "john_11_35";
        state.difficulty = "really_well";
        state.grade = "";
      },
      view: () => state.view, grade:()=>state.grade,
      wackyUnlocked:()=>wackyReplayUnlocked
    };
  `;
  const marker='  window.BibloZooFlashcards = Object.freeze({';
  assert(src.includes(marker));
  const code=src.replace(marker,hooks+marker);
  vm.runInNewContext(code,{
    window:win,document:doc,Math,Date,Object,Promise,console,
    setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},
    clearTimeout(id){timers.delete(id);},
    requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},
  });
  const api={
    isActive:()=>true,requestRender(){renders++;},
    getVerseList:()=>[{id:"john_11_35",ref:"John 11:35",
       verseText:"Jesus wept."}],
    getVerseProgressSnapshot:()=>({john_11_35:{learnCompleted:true}}),
    scheduleSmartLearnTextFit(){},
    stopVersePreview(){},
    getCurrentVerseId:()=> "john_11_35"
  };
  win.BibloZooFlashcards.initialize(api);
  const h=win.__flashcardsToastHooks;
  h.prepare();
  const render=()=>{
    const buttons={};
    const wrap={
      isConnected:true,innerHTML:"",
      querySelector(sel){
        const id=sel.slice(1);
        if(!this.innerHTML.includes('id="'+id+'"'))return null;
        return (buttons[id] ||= {disabled:false,onclick:null});
      }
    };
    h.renderComparison(wrap);
    return {html:wrap.innerHTML,buttons};
  };
  return {
    h,doc,win,domNodes,timers,render,record,
    setAudio(v){audio={...audio,...v};},
    change(){onChange();},
    interrupted(){onInterrupted();},
    tap(){for(const fn of docListeners.pointerdown||[])fn({});},
    click(){for(const fn of docListeners.click||[])fn({});},
    hide(){doc.hidden=true;
      for(const fn of docListeners.visibilitychange||[])fn({});},
    leave(){win.BibloZooFlashcards.stopSession();},
    get prevented(){return prevented;},
    get renders(){return renders;},
    get paused(){return paused;},
  };
}
function main(){
 const f=fixture();
 const initial=f.render();
 assert(initial.html.includes('id="flashcardsPlayBtn"'));
 assert(initial.html.includes('id="flashcardsRerecordBtn"'));
 assert(initial.html.includes('id="flashcardsNextBtn"'));
 assert(initial.html.includes(">Next</button>"));
 assert(initial.html.includes('id="flashcardsNextBtn"\n              type="button" disabled'),
   "Unheard recording keeps Next disabled");
 assert(!initial.html.includes("Continue Anyway"));
 assert.equal(f.domNodes.length,0,"No toast on quiet normal state");

 f.h.showFlashcardsToast("Audio couldn't start. Try again.");
 assert.equal(f.domNodes.length,1);
 const notice=f.domNodes[0];
 assert.equal(notice.attributes.role,"status");
 assert.equal(notice.attributes["aria-live"],"polite");
 assert.equal(notice.textContent,"Audio couldn't start. Try again.");
 assert.equal(f.timers.size,1);
 assert.equal(f.render().html,initial.html,
   "Toast mount in BODY cannot alter any HTML/layout of control grid");
 f.tap();assert.equal(f.domNodes.length,0,"Any physical tap removes toast");
 assert.equal(f.timers.size,0,"Tap cancels pending timer");
 f.h.showFlashcardsToast("Second message");
 f.click();assert.equal(f.domNodes.length,0,
   "Button click or accessibility activation removes toast");
 assert.equal(f.prevented,0,
   "Dismiss never prevents click/underlying action");
 f.h.showFlashcardsToast("Temporary");
 const timer=[...f.timers.values()][0];timer();
 assert.equal(f.domNodes.length,0,"Zoo-style timeout removes toast");

 f.setAudio({playbackFailed:true,
   message:"Playback was interrupted. Tap Play to retry."});
 f.change();
 assert.equal(f.domNodes.length,0,
   "Interrupted voice with Play visible doesn't need a redundant message");
 let failed=f.render();
 assert(failed.html.includes("Continue Anyway"),
   "Next changes label rather than introducing a third button");
 assert(failed.html.includes('id="flashcardsPlayBtn"'),
   "Play My Recording remains available for another deliberate tap");
 assert(!failed.html.includes("Continue Without Listening"));
 assert.equal((failed.html.match(/id="flashcardsNextBtn"/g)||[]).length,1);
 failed.buttons.flashcardsNextBtn.onclick();
 assert.equal(f.h.view(),"challenge_complete",
   "Genuine playback failure may deliberately opt out of listening");
 assert.equal(f.paused,1);
 assert.equal(f.h.grade(),"",
   "No faked recording grade / Zoo outcome");
 assert.equal(f.h.wackyUnlocked(),false,
   "Failed voice may never earn one-time Wacky opportunity");

 const g=fixture();
 g.setAudio({playbackFailed:true,
   message:"Playback couldn't start. Tap Play to try again."});
 g.change();
 assert.equal(g.domNodes.length,1,"Actionable failure shows top toast");
 const first=g.domNodes[0];
 g.change();
 assert.equal(g.domNodes[0],first,
   "Repeated rerenders / native callback don't spam the same message");
 const after=g.render();
 assert(after.html.includes("Continue Anyway") && !after.html.includes("Playback couldn't start."),
   "Failure never injects inline paragraph/moves controls");
 g.setAudio({playbackFailed:false,message:"",status:"loading"});g.change();
 g.setAudio({playbackFailed:true,message:"Playback couldn't start again."});g.change();
 assert.equal(g.domNodes.length,1);
 assert.equal(g.domNodes[0].textContent,"Playback couldn't start again.",
   "New deliberate attempt can show new actionable error, replacing prior one");
 g.hide();assert.equal(g.domNodes.length,0,
   "App switch/hidden removes toast without mutating voice status");

 const heard=fixture();
 heard.setAudio({playbackComplete:true,playbackFailed:false,message:""});
 const heardRender=heard.render();
 assert(heardRender.html.includes(">Next</button>"),
   "Actually heard normal voice uses ordinary Next label");
 assert(!heardRender.html.includes("Continue Anyway"));
 const nav=fixture();nav.h.showFlashcardsToast("Please try again");
 nav.leave();
 assert.equal(nav.domNodes.length,0,"Leaving Flashcards cleans up body overlay");

 console.log("N7f.1 PASS: Zoo-style coral fixed toast; tap/click/timeout/hidden/exit removal; no status-driven layout shift; interruption quiet; real failure only Next-slot Continue Anyway; unplayed recording cannot unlock Wacky/grade.");
}
main();
