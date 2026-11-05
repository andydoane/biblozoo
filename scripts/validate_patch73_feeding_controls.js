"use strict";
// Patch 73: focused control/physics/asset tests (no iOS permissions or audio unlock).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const feed = fs.readFileSync(path.join(root,"daily_questions_feed_game.js"),"utf8");
const css = fs.readFileSync(path.join(root,"daily_questions_feed_game.css"),"utf8");
const app = fs.readFileSync(path.join(root,"app.js"),"utf8");
const styles = fs.readFileSync(path.join(root,"styles.css"),"utf8");
const sw = fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
let count=0;
function check(value,message) { assert.ok(value,message);count++; }
function equal(actual,expected,message) { assert.strictEqual(actual,expected,message);count++; }
const exportMarker = '  window.BibloZooDailyFeedGame = Object.freeze({';
equal(feed.split(exportMarker).length-1,1,"one public feeding export");
const injection=`  window.__patch73 = Object.freeze({
    feedInstructionPrompt, getFeedStarPegDiameter, bounceBrickGeometry,
    LABYRINTH_ACCELERATION_FACTORS, spawnLabyrinthBall, spawnBounceSnack,
    spawnMelodyNote, updateLabyrinthBall, showFeedingControlChoice,
    showFeedingControlInstructions, chooseFeedingControl,
    setActive: value => { activeRuntime=value; }
  });\n${exportMarker}`;
const window = { DeviceOrientationEvent: function(){}, location:{protocol:"https:"} };
const sandbox = { window, document:{hidden:false}, Image:class{}, Audio:class{}, console,
  performance:{now:()=>1000}, setTimeout, clearTimeout, requestAnimationFrame:()=>1,
  cancelAnimationFrame:()=>{}, fetch:()=>Promise.reject(new Error("No network")) };
vm.createContext(sandbox);
vm.runInContext(feed.replace(exportMarker,injection),sandbox,{filename:"daily_questions_feed_game.js"});
const hooks=window.__patch73, api=window.BibloZooDailyFeedGame;
function makeUi(){
 return {
  mode:"bounce",startOverlay:{hidden:false},startChoiceEl:{hidden:false},
  startConfirmEl:{hidden:true}, startSelectedIconEl:{hidden:true,src:""},
  startInstructionEl:{textContent:""},startConfirmButton:{textContent:""},
  startControlMessageEl:{hidden:true,textContent:""}, controlMode:null,
  controlPhase:"choose", controlChoicePending:false, introUnlockAt:0,
  tiltPermissionPreapproved:false
 };
}
(async()=>{
 for(const mode of ["classic","labyrinth","melody","bounce"]){
  const html=api.render({session:{feedMode:mode,petName:"Pip"}});
  check(html.includes('data-daily-feed-control="tilt"'),mode+": tilt button");
  check(html.includes('data-daily-feed-control="drag"'),mode+": drag button");
  check(html.includes('data-daily-feed-start-confirm hidden'),mode+": second step starts hidden");
  check(html.includes('data-daily-feed-confirm-button'),mode+": Got It button");
  check(hooks.feedInstructionPrompt(mode,"tilt").startsWith("Tilt "),mode+": tilt-only instructions");
  check(hooks.feedInstructionPrompt(mode,"drag").startsWith("Drag "),mode+": drag-only instructions");
 }
 check(css.includes('.daily-feed-control-options')&&css.includes('pointer-events: auto'),"tile taps permitted inside modal");
 check(css.includes('.daily-feed-start-confirm[hidden]'),"hidden steps do not occupy height");
 const drag=makeUi();hooks.setActive(drag);
 await hooks.chooseFeedingControl(drag,"drag");
 equal(drag.controlMode,"drag","explicit Drag choice");
 equal(drag.tiltEnabled,false,"Drag disables tilt");
 equal(drag.controlPhase,"instructions","shows second screen");
 equal(drag.startConfirmEl.hidden,false,"second step visible");
 equal(drag.startChoiceEl.hidden,true,"first step hidden");
 check(drag.startInstructionEl.textContent.startsWith("Drag to rebound"),"Drag-specific Bounce prompt");
 equal(drag.startConfirmButton.textContent,"Got It!","confirmation label");
 const denied=makeUi();hooks.setActive(denied);
 window.DeviceOrientationEvent={requestPermission:()=>Promise.resolve("denied")};
 await hooks.chooseFeedingControl(denied,"tilt");
 equal(denied.controlMode,null,"denied sensor does not silently start");
 equal(denied.controlPhase,"choose","denied sensor leaves chooser open");
 check(denied.startControlMessageEl.textContent.includes("permission"),"permission denial explanation");
 const granted=makeUi();hooks.setActive(granted);
 window.DeviceOrientationEvent={requestPermission:()=>Promise.resolve("granted")};
 await hooks.chooseFeedingControl(granted,"tilt");
 equal(granted.controlMode,"tilt","Tilt selected after permission");
 equal(granted.tiltEnabled,true,"Tilt activates motion input");
 check(granted.startInstructionEl.textContent.startsWith("Tilt to rebound"),"Tilt-specific Bounce prompt");
 const missing=makeUi();hooks.setActive(missing);delete window.DeviceOrientationEvent;
 await hooks.chooseFeedingControl(missing,"tilt");
 equal(missing.controlMode,null,"missing sensor does not start");
 check(missing.startControlMessageEl.textContent.includes("isn't available"),"missing sensor explanation");
 for(const [mode,icon] of [["tilt","dq_feed_control_tilt.png"],["drag","dq_feed_control_drag.png"]]){
  const img=path.join(root,"verse_images/daily_questions",icon);
  check(fs.statSync(img).size>1500,mode+" icon included from supplied mockup");
  check(sw.includes(`./verse_images/daily_questions/${icon}`),mode+" icon precached offline");
 }
 check(!app.includes('await requestDailySnackTiltPermission();'),"no permission prompt before chooser");
 check(app.includes('id="titleCurrentVerseBtn"'),"Current Verse is a button");
 check(app.includes('if (!tutorialActive) go(Screen.MY_VERSES);'),"Current Verse uses My Verses route");
 check(styles.includes('.title-current-verse-panel:focus-visible'),"keyboard-visible navigation focus");
 check(feed.includes('runtime.controlMode !== "drag"'),"pointer steering restricted to Drag");
 check(feed.includes('runtime.controlMode !== "tilt"'),"motion steering restricted to Tilt");
 check(feed.includes('runtime.controlPhase = "serve"'),"Bounce serves do not repeat method selection");
 check(feed.includes('runtime.controlStoppedAt = performance.now()'),"unresponsive Tilt pauses existing round");
 check(feed.includes('runtime.melody.startTime += duration'),"mid-round sensor fallback shifts Melody clock");
 check(feed.includes('runtime.feedPausedAt != null'),"Feeding interruption guard retained");
 const dimensions={width:390,height:740};
 const brick=hooks.bounceBrickGeometry(dimensions.width,dimensions.height,0,0);
 const visibleStar=Math.min(brick.height*0.87,brick.width*0.64);
 equal(hooks.getFeedStarPegDiameter(dimensions),visibleStar,"snack diameter matches visible star art, exactly");
 const rt={...dimensions,pegRadius:16,nextBallId:1,balls:[],bounce:{snackSpeed:100}};
 hooks.spawnBounceSnack(rt,{config:{id:"red",points:1},x:40,y:40,width:60,height:28});
 equal(rt.balls[0].radius*2,visibleStar,"Bounce snack diameter exact");
 const mel={...dimensions,pegRadius:16,nextBallId:1,balls:[]};
 hooks.spawnMelodyNote(mel,{index:0,x:200});
 equal(mel.balls[0].radius*2,visibleStar,"Melody ball diameter exact");
 const factors=Array.from(hooks.LABYRINTH_ACCELERATION_FACTORS);
 equal(factors.length,7,"seven stable weights");
 check(new Set(factors).size>=5,"different Labyrinth acceleration values");
 check(Math.max(...factors)-Math.min(...factors)<=0.31,"Labyrinth weights within 15% spread");
 check(Math.min(...factors)>=0.85 && Math.max(...factors)<=1.15,"Labyrinth weights stay subtle");
 const lab={...dimensions,pegRadius:16,nextBallId:1,balls:[]};
 for(let i=0;i<7;i++)hooks.spawnLabyrinthBall(lab,{id:"red",points:1},1000,i);
 const created=lab.balls.map(ball=>ball.accelerationFactor);
 equal(new Set(created).size,new Set(factors).size,"spawned Labyrinth balls have distinct fixed weights");
 // Run the actual 120Hz step against a platform to verify an audible collision.
 let started=0;
 const fakeAudio={state:"running",currentTime:1,destination:{},
  createOscillator:()=>({frequency:{setValueAtTime(){}},connect(){},start(){started++},stop(){}}),
  createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}})
 };
 const impact={...dimensions,labyrinth:{steering:0,steerAcceleration:0,horizontalDamping:1,maxHorizontalSpeed:300,
  gravity:0,maxVerticalSpeed:500,platformRows:[{segments:[{x:0,y:120,width:390,height:12}]}]},
  audioContext:fakeAudio,lastPegSoundAt:-Infinity,lastPegNoteIndex:-1,feedSoundNodes:new Set()};
 const ball={id:1,x:160,y:115,vx:0,vy:180,radius:10,rotation:0,
  accelerationFactor:0.94,lastTrailAt:1000,trail:[],labyrinthProgressAt:1100,
  labyrinthProgressX:160,labyrinthProgressY:115,lastPlatformSoundAt:-Infinity};
 hooks.updateLabyrinthBall(impact,ball,1/120,1100);
 check(started>=1,"Labyrinth platform impact emits existing safe peg note");
 const firstCount=started;
 hooks.updateLabyrinthBall(impact,ball,1/120,1110);
 equal(started,firstCount,"contact cooldown prevents sound flood");
 console.log(`Patch 73 Feeding control, sizes, Labyrinth & home tests passed (${count} checks).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
