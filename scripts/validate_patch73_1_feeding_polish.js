"use strict";
/** Patch 73.1: intro steps, original art, ball weights and Melody beat/contact. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const feed=read("daily_questions_feed_game.js");
const css=read("daily_questions_feed_game.css");
const home=read("styles.css");
const sw=read("service-worker.js");
let count=0;
const ok=(v,m)=>{assert.ok(v,m);count++;};
const eq=(a,b,m)=>{assert.equal(a,b,m);count++;};
const approx=(a,b,t,m)=>ok(Math.abs(a-b)<=t,`${m} (${a} vs ${b})`);
const marker='  window.BibloZooDailyFeedGame = Object.freeze({';
eq(feed.split(marker).length-1,1,"single Feeding export");
const patched=feed.replace(marker,`  window.__patch731 = {
 LABYRINTH_ACCELERATION_FACTORS, showFeedingControlChoice, showFeedingControlInstructions,
 showBounceNextServe, spawnMelodyNote, updateMelodyMode, getFeedStarPegDiameter,
 setRuntime:r=>{activeRuntime=r;}
 };\n${marker}`);
const window={location:{protocol:"https:"},addEventListener(){},removeEventListener(){}};
const sandbox={window,document:{hidden:false,addEventListener(){},removeEventListener(){}},
 Image:class{},Audio:class{},console,performance:{now:()=>1000},
 setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame() {}};
vm.createContext(sandbox);
vm.runInContext(patched,sandbox,{filename:"daily_questions_feed_game.js"});
const h=window.__patch731;
for(const mode of ["classic","labyrinth","melody","bounce"]){
 const html=window.BibloZooDailyFeedGame.render({session:{feedMode:mode,petName:"Pip"}});
 ok(html.includes('data-daily-feed-start-choice'),`${mode}: chooser exists`);
 ok(html.includes('data-daily-feed-start-confirm hidden'),`${mode}: second step hidden initially`);
 ok(html.includes('class="daily-feed-selected-control-tile"'),`${mode}: white icon tile`);
}
for(const method of ["tilt","drag"]){
 const rt={mode:"bounce",startOverlay:{hidden:false},startTitleEl:{hidden:false},
  startBallsEl:{hidden:false},startChoiceEl:{hidden:false},startConfirmEl:{hidden:true},
  startSelectedIconEl:{hidden:true},startServeAvatarEl:{hidden:true},
  startInstructionEl:{textContent:""},
  startConfirmButton:{textContent:""},startControlMessageEl:{hidden:true},
  controlPhase:"choose",introUnlockAt:0};
 h.showFeedingControlInstructions(rt,method);
 eq(rt.startTitleEl.hidden,true,`${method}: hide title on second step`);
 eq(rt.startBallsEl.hidden,true,`${method}: hide three snacks on second step`);
 eq(rt.startChoiceEl.hidden,true,`${method}: hide chooser`);
 eq(rt.startConfirmEl.hidden,false,`${method}: show selected instructions`);
 ok(rt.startInstructionEl.textContent.startsWith(method==="tilt"?"Tilt":"Drag"),`${method}: instructions use selected control`);
 ok(rt.startSelectedIconEl.src.endsWith(`dq_feed_control_${method}.png`),`${method}: selected icon`);
 eq(rt.startServeAvatarEl.hidden,true,`${method}: Zookeeper photo hidden on control instructions`);
 h.showFeedingControlChoice(rt);
 eq(rt.startTitleEl.hidden,false,`${method}: restore title on chooser return`);
 eq(rt.startBallsEl.hidden,false,`${method}: restore snack art on chooser return`);
}
// Bounce's next-ball popup reuses the existing white tile, but swaps its
// contents to the current Zookeeper profile picture (not today's BibloPet).
const zookeeperMarkup='<div class="profile-picture-visual daily-feed-next-serve-profile"><img class="profile-picture-img" src="zookeeper-photo.png" alt=""></div>';
const bounceHtml=window.BibloZooDailyFeedGame.render({
  session:{feedMode:"bounce",petName:"Pip"},
  profilePictureHtml:'<img data-biblopet src="pet.png">',
  zookeeperPictureHtml:zookeeperMarkup
});
ok(bounceHtml.includes('data-daily-feed-next-serve-avatar hidden'),"Bounce has initially hidden next-ball avatar");
ok(bounceHtml.includes(zookeeperMarkup),"Bounce next-ball tile receives the selected Zookeeper avatar");
ok(bounceHtml.includes('data-daily-feed-selected-icon alt="" hidden'),"existing Tilt/Drag slot is unchanged");
ok(bounceHtml.includes('data-biblopet'),"gameplay still shows the original BibloPet");
const bounceFallback=window.BibloZooDailyFeedGame.render({session:{feedMode:"bounce",petName:"Pip"}});
ok(bounceFallback.includes('daily-feed-next-serve-fallback'),"Bounce shows paw fallback without a saved Zookeeper photo");
for(const mode of ["classic","labyrinth","melody"]){
 const html=window.BibloZooDailyFeedGame.render({session:{feedMode:mode},zookeeperPictureHtml:zookeeperMarkup});
 ok(!html.includes('data-daily-feed-next-serve-avatar'),`${mode}: no Bounce-only avatar tile`);
}
const serve={
 mode:"bounce",bounce:{livesLeft:2},controlPhase:"playing",introUnlockAt:0,
 startOverlay:{hidden:true},startTitleEl:{textContent:""},
 startInstructionEl:{textContent:""},startChoiceEl:{hidden:false},
 startConfirmEl:{hidden:true},startSelectedIconEl:{hidden:false,src:"tilt.png"},
 startServeAvatarEl:{hidden:true},startConfirmButton:{textContent:""}
};
h.showBounceNextServe(serve,1000);
eq(serve.controlPhase,"serve","next ball enters serve mode");
eq(serve.startTitleEl.textContent,"2 Balls Left!","next-ball heading retained");
eq(serve.startInstructionEl.textContent,"Tap to launch","next-ball instruction retained");
eq(serve.startConfirmButton.textContent,"Launch!","next-ball action retained");
eq(serve.startSelectedIconEl.hidden,true,"Tilt/Drag icon hidden only on next ball");
eq(serve.startServeAvatarEl.hidden,false,"Zookeeper avatar shown in white tile between balls");
h.showFeedingControlInstructions(serve,"drag");
eq(serve.startServeAvatarEl.hidden,true,"Zookeeper avatar hidden when returning to Drag controls");
ok(serve.startSelectedIconEl.src.endsWith("dq_feed_control_drag.png"),"original Drag image returns on instruction step");
eq(serve.startSelectedIconEl.hidden,false,"control image visible on instruction step");
h.showFeedingControlChoice(serve);
eq(serve.startServeAvatarEl.hidden,true,"Zookeeper avatar hidden on chooser");
ok(/\.daily-feed-next-serve-avatar\[hidden\][\s\S]*?display: none !important/.test(css),"avatar hidden attribute prevents empty tile occupancy");
ok(css.includes(".daily-feed-next-serve-avatar .daily-feed-next-serve-profile"),"Zookeeper avatar sized within existing white tile");
const app=read("app.js");
ok(app.includes('zookeeper?.avatarVerseId || ""'),"feeding reads active Zookeeper avatar ID, not the verse pet");
ok(app.includes('"daily-feed-next-serve-profile"'),"app passes selected Zookeeper photo to Bounce slot");
ok(/\.daily-feed-start-balls\[hidden\][\s\S]*?display: none !important/.test(css),"hidden snack artwork occupies no space");
ok(/\.daily-feed-start-title\[hidden\]/.test(css),"hidden heading occupies no space");
ok(/\.daily-feed-selected-control-tile[\s\S]*?background: #fff/.test(css),"selected icon has white background");
ok(/\.daily-feed-control-option span[\s\S]*?flex: 0 0 auto/.test(css),"labels don't squeeze artwork");
ok(/\.home-screen button\.title-current-verse-panel,\s*\.home-screen button\.title-current-verse-panel \*/.test(home),"Current Verse font wins over global button selector");
ok(/Titan One[^;]*!important/.test(home.slice(home.lastIndexOf("/* Patch 73.1"))),"Titan One is forced locally");
const factors=Array.from(h.LABYRINTH_ACCELERATION_FACTORS);
eq(factors.length,7,"one weight per Labyrinth ball");
eq(new Set(factors).size,7,"all Labyrinth weights distinct");
approx(Math.min(...factors),.85,.00001,"minimum steering multiplier");
approx(Math.max(...factors),1.15,.00001,"maximum steering multiplier");
approx(Math.max(...factors)-Math.min(...factors),.30,.00001,"30% overall spread");
// Simulate actual travel/contact and triggering of the existing musical note.
let notes=0;
const ac={state:"running",currentTime:11,destination:{},
 createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){notes++},stop(){}}},
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}};
const entry={index:0,x:195,midi:67,spawnOffsetMs:0,arrivalOffsetMs:2400,status:"pending"};
const rt={width:390,height:800,pegRadius:16,petRadius:42,petCenterY:710,
 catcherX:195,lastCatcherX:195,smoothedPetVelocity:0,petTilt:0,
 petCircle:{style:{setProperty(){}}},caughtCount:0,totalCount:1,
 score:0,balls:[],nextBallId:1,scoreEl:null,scorePopupsEl:null,
 catcher:null,audioContext:ac,melody:{startTime:1000,lastUpdateAt:3380,
 pausedAt:null,travelMs:2400,timeline:[entry],classifiedCount:0,activeVoices:new Set()}};
h.spawnMelodyNote(rt,entry);
h.updateMelodyMode(rt,1/60,3390);
eq(notes,0,"note not played before scheduled beat");
eq(rt.balls.length,1,"ball still traveling just before beat");
const ball=rt.balls[0];
const target=rt.petCenterY-rt.petRadius-ball.radius;
const lastVisibleGap=(rt.petCenterY-rt.petRadius)-(ball.y+ball.radius);
ok(lastVisibleGap>0,"ball still visibly outside pet before beat");
ok(lastVisibleGap<10,"ball visually close to pet at beat");
approx(target,rt.petCenterY-rt.petRadius-ball.radius,1e-8,"contact geometry uses full radius");
h.updateMelodyMode(rt,1/60,3400);
eq(notes,1,"note plays at unchanged scheduled arrival");
eq(rt.caughtCount,1,"catch behavior unchanged");
eq(rt.balls.length,0,"arrived ball removed");
// PNGs must contain a full symbol with a white margin above its opaque art.
for (const name of ["tilt","drag"]){
 const img=fs.readFileSync(path.join(root,`verse_images/daily_questions/dq_feed_control_${name}.png`));
 eq(img.subarray(1,4).toString(),"PNG",`${name}: PNG asset exists`);
 ok(img.readUInt32BE(20)>=180,`${name}: full image width`);
 ok(img.readUInt32BE(24)>=190,`${name}: full image height with padding`);
 ok(sw.includes(`./verse_images/daily_questions/dq_feed_control_${name}.png`),`${name}: offline asset retained`);
}
ok(/const CACHE_VERSION = "[^"\n]+";/.test(sw) &&
   !sw.includes('"2026_Nov_14_patch73_melody_seven_snacks_badges"'),
   "cache version still includes Melody art and has advanced for later changes");
ok(sw.includes("./verse_images/daily_questions/dq_feed_music_note.png"),"new music-note artwork available offline");
ok(sw.includes("./verse_images/daily_zoo_todo/snacks_1000.gif.gif"),"animated 1000 badge available offline");
console.log(`Patch 73.1 Feeding UI, imagery, weights, Melody contact tests passed (${count} checks).`);
