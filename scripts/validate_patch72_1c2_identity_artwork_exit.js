#!/usr/bin/env node
"use strict";
/* Patch 72.1C.2: real saved pet identity, distinct offline portraits,
 * shared Titan One loading and scoped title exit with Daily To-Do safety. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ROOT = path.resolve(__dirname,"..");
const read = rel => fs.readFileSync(path.join(ROOT,rel),"utf8");
let checks=0;
const ok=(x,m)=>{assert.ok(x,m);checks++;};
const eq=(x,y,m)=>{assert.equal(x,y,m);checks++;};
const engine=read("verse_games/shared/welcome-back-zoo-escape.js");
const adapter=read("verse_games/shared/welcome-back-return.js");
const bridge=read("verse_games/shared/bridge.js");
const css=read("verse_games/shared/welcome-back.css");
const sw=read("service-worker.js");
const ids=["ephesians_2_8_9","galatians_2_20","philippians_4_6","romans_12_2",
 "2_corinthians_5_17","psalm_119_105","joshua_1_9","romans_5_8","isaiah_26_3",
 "psalm_121_1_2","psalm_46_1","matthew_11_28"];
const rawIds=JSON.parse(read("verse_data/verse_list.json"));
for(const id of ids){
 ok(rawIds.includes(id),`${id} belongs to official verse catalog`);
 ok(fs.existsSync(path.join(ROOT,`profile_pictures/profile_picture_${id}.png`)),`${id} has a real portrait`);
 ok(sw.includes(`"./profile_pictures/profile_picture_${id}.png"`),`${id} offline precached`);
 ok(engine.includes(`"${id}"`),`${id} available to standalone Zoo Break`);
}
ok(css.includes('font-family: "Titan One";') && css.includes('url("../../verse_fonts/TitanOne.ttf")'),
  "shared stylesheet defines actual Titan One file instead of relying on Verse Jam");
ok(fs.statSync(path.join(ROOT,"verse_fonts/TitanOne.ttf")).size>10000,"real font exists");
ok(/const CACHE_VERSION = "2026_[^"\n]*patch72_1(?:c|d)/.test(sw),"fresh offline cache revision");
ok(adapter.includes('bridge.withZooEscapeTitleExit(activityExit)'),"only Zoo controller wraps owner exit");
ok(adapter.includes('else activityExit();'),"non-game caller retains its own exit");
ok(engine.includes('getProfileProgressStorageKey'),"profile-safe progress lookup");
ok(engine.includes('const shuffled = [...new Set(catalog.length ? catalog : ZOO_BREAK_PORTRAITS)]'),
  "empty standalone catalog gets multiple real portraits");
ok(read("app.js").includes('verseId: () => VERSE_ID'),"Learn resolves current verse at escape time");
ok(read("read_my_verse.js").includes('verseId: () => state.verseId'),"Read My Verse resolves current session verse");
ok(adapter.includes('overlay, profileId, pictureBase, name, petName, verseId'),"shared adapter forwards verse identity");

// Run the actual UI controller with the historical fake-DOM fixture, but
// override its already-set petName and profile catalog to reproduce the bug.
const fixture=read("scripts/validate_patch72_1a_zoo_escape.js");
const begin=fixture.indexOf("function harness(");
const end=fixture.indexOf("\nasync function run(){",begin);
ok(begin>0&&end>begin,"real Zoo Escape test fixture available");
let model=fixture.slice(begin,end);
const oldProfile='BibloZooProfiles:{getProfilePictureCatalog:()=>Array.from({length:18},(_,i)=>`test_${i}`),getProfilePictureSrc:id=>`profile_pictures/profile_picture_${id}.png`},';
const newProfile='BibloZooProfiles:{getProfilePictureCatalog:()=>[],getProfilePictureSrc:id=>`profile_pictures/profile_picture_${id}.png`,getProfileProgressStorageKey:id=>`biblozooPwaProgress:${id}`},localStorage:{getItem:key=>key==="biblozooPwaProgress:p1"?JSON.stringify({verses:{romans_12_2:{petName:"Milo"}}}):null},';
ok(model.includes(oldProfile),"fixture profile catalog can be replaced");
model=model.replace(oldProfile,newProfile);
ok(model.includes('profileId:"p1",petName:"Milo",soundIsReady:'),"fixture uses explicit name by default");
model=model.replace('profileId:"p1",petName:"Milo",soundIsReady:', 'profileId:"p1",verseId:"romans_12_2",soundIsReady:');
const ctx={vm,engine,assert,checks:0,ok:()=>{},eq:()=>{},Math,Date,Promise,URL,console};
vm.runInNewContext(model+'\nthis.makeHarness=harness;',ctx);
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
(async()=>{
 const h=ctx.makeHarness([false,false]);
 h.ctl.start();h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"escape","first scripted failure starts escape");
 eq(h.title.children[0].textContent,"Milo","Stage 2 uses the actual named verse pet");
 ok(h.petNodes()[0].children[0].src.includes("profile_picture_romans_12_2.png"),
   "Stage 2 image is the verse's pet, not the zookeeper avatar");
 h.advance(1150);h.rescueFirst();h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"break","second failure starts Zoo Break");
 h.advance(11500);
 const urls=h.petNodes().map(n=>n.children[0].src);
 eq(urls.length,h.ctl.getState().total,"one image for each escaped pet");
 eq(new Set(urls).size,urls.length,"all 6-10 escaping portraits are unique");
 for(const url of urls) ok(ids.some(id=>url.endsWith(`profile_picture_${id}.png`)),"all selected images from verified portraits");
 h.ctl.destroy();
 // An unnamed verse pet still has an official default name in its verse JSON.
 // This is distinct from the fallback word "BibloPet".
 const unnamed=ctx.makeHarness([false]);
 unnamed.win.localStorage.getItem=()=>JSON.stringify({verses:{romans_12_2:{}}});
 let fetched="";
 unnamed.win.fetch=async url=>{
   fetched=url;
   return {ok:true,json:async()=>({biblopetDefaultName:"Waffles"})};
 };
 unnamed.ctl.start();
 for(let i=0;i<6;i++)await Promise.resolve();
 unnamed.button.trigger("click");await flush();
 ok(fetched.endsWith("verse_data/romans_12_2.json"),"official verse data loaded without blocking recovery");
 eq(unnamed.title.children[0].textContent,"Waffles","original pet default name used when no custom name saved");
 unnamed.ctl.destroy();
 // Verify scoped routing using the actual `exitGame` function with stubs.
 const start=bridge.indexOf("  let zooEscapeTitleExit = false;");
 const stop=bridge.indexOf("  function setExternalPwaThemeColor",start);
 const eStart=bridge.indexOf("function exitGame(){");
 const eEnd=bridge.indexOf("\n  window.VerseGameBridge = {",eStart);
 ok(start>0&&stop>start&&eStart>0&&eEnd>eStart,"real bridge functions extracted");
 const route=`let navigations=[];let daily=false;\n`+
 `function getParams(){return {returnTo:"../../index.html?screen=practice_games",verseId:"romans_12_2"};}\n`+
 `function returnToDailyTodo(){return daily;}\n`+
 `function returnToTitle(){navigations.push("title");}\n`+
 `function applyProfileIdentityToTarget(){}\nfunction loadProgress(){return {ok:true,progress:{verses:{}}};}\n`+
 `function saveProgress(){}\nfunction navigateWithTransition(href){navigations.push(href);}\n`+
 `function buildFallbackReturnUrl(){return "../../index.html";}\n`+
 bridge.slice(start,stop)+bridge.slice(eStart,eEnd)+
 `\nthis.testRoute={exitGame,withZooEscapeTitleExit,setDaily:x=>daily=x,nav:navigations};`;
 const scope={URL,window:{location:{href:"https://example.test/biblozoo/verse_games/foodslice/index.html"}},console};
 vm.runInNewContext(route,scope);
 const r=scope.testRoute;
 r.exitGame();ok(r.nav.pop().includes("screen=practice_games"),"ordinary exit preserves Practice Games route");
 r.withZooEscapeTitleExit(()=>r.exitGame());eq(r.nav.pop(),"title","Zoo Escape exit routes to main title");
 r.exitGame();ok(r.nav.pop().includes("screen=practice_games"),"scoped override resets after callback");
 r.setDaily(true);r.withZooEscapeTitleExit(()=>r.exitGame());eq(r.nav.length,0,"daily task exit remains activity-owned");
 r.setDaily(false);
 try {r.withZooEscapeTitleExit(()=>{throw Error("test");});}catch(_){}
 r.exitGame();ok(r.nav.pop().includes("screen=practice_games"),"throwing exit callback cannot leak route override");
 console.log(`Patch 72.1C.2 identity/artwork/exit: ${checks} checks passed`);
})().catch(err=>{console.error(err);process.exitCode=1;});
