#!/usr/bin/env node
"use strict";
/* Patch 72.1D: real controller with per-profile persistence, no dev-test
 * credit, gate-confirmed Zoo Break count and accessible reduced-motion flow. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const src = read("verse_games/shared/welcome-back-zoo-escape.js");
const app = read("app.js");
const css = read("styles.css");
const sharedCss = read("verse_games/shared/welcome-back.css");
const profiles = read("profiles.js");
const feeding = read("daily_questions_feed_game.js");
const sw = read("service-worker.js");
const index = read("index.html");
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a,b,msg) => { assert.equal(a,b,msg); checks++; };
for (const token of ["BibloZooZooStats", "petsRescued", "zooBreaksStopped", "pendingPets", "pendingBreaks", "isDeveloperRun", "isTestRun", "completedBreakStats", "rescueStatus", "role\", \"group", "aria-live", "acknowledgeCelebration", "new CustomEvent"]) {
  ok(src.includes(token), `shared stats/accessibility contract: ${token}`);
}
ok(src.includes('if (stage === "break" && breakCredited && !completedBreakStats && !isDeveloperRun())'), "break credit depends on real verified gate");
ok(src.includes('if (!isDeveloperRun()) addStat(profileId, "pet")'), "simulated rescues excluded");
ok(src.includes('if (reduced) {') && src.includes('pet.state = "ready"') && src.includes('if (!reduced && !raf'), "reduced motion uses stationary and instantly catchable pets");
ok(src.includes('pen.focus?.({ preventScroll: true })'), "keyboard tap-select flow can reach pen");
ok(src.includes('field.setAttribute("role", "group")'), "escaped pets are grouped for screen readers");
ok(src.includes('setInstruction("Drag a pet to the pen, or tap a pet and then the pen!")'), "instructions announce non-drag alternative");
ok(sharedCss.includes(".bz-zoo-rescue-status") && sharedCss.includes("clip-path: inset(50%)"), "accessible rescue status is visually unobtrusive");
ok(css.includes(".title-zoo-hero-celebration") && css.includes("@media (prefers-reduced-motion: reduce)"), "home celebration with reduced-motion alternative");
for (const token of ["Zoo Hero!", "title-zoo-hero-tally", "title-zoo-hero-close", "BibloPets Rescued", "Zoo Breaks Stopped", "acknowledgeCelebration", "zooEscapeStats.petsRescued", "zooEscapeStats.zooBreaksStopped"])
  ok(app.includes(token), `home / Zookeeper stats UI: ${token}`);
ok(app.includes('!showDailyOffer') && app.includes('!tutorialActive'), "home celebration respects Daily To-Do dialog and tutorial");
ok(feeding.includes('isTestRun: () => !!runtime.zooDevScenario'), "Feeding dev harness cannot award real credits");
ok(profiles.includes('localStorage.removeItem(`biblozooZooEscapeStats:v1:${id}`)'), "profile deletion with progress removes stats");
ok(/const CACHE_VERSION = "2026_[^"\n]*patch72_1d/.test(sw), "offline cache revised");
for(const asset of ["./styles.css", "./profiles.js", "./verse_games/shared/welcome-back-zoo-escape.js", "./verse_games/shared/welcome-back.css", "./verse_fonts/TitanOne.ttf", "./verse_images/zoobreak_gate.png", "./verse_images/zoobreak_lock.png"])
  ok(sw.includes(`"${asset}"`), `offline asset: ${asset}`);
ok(index.indexOf('src="profiles.js"') < index.indexOf('src="verse_games/shared/welcome-back-zoo-escape.js"'), "profile storage loads before stats API");
// The real Patch 72.1A controller fixture provides a fake WebKit-like DOM,
// time advance, pointer gestures and an activity-owned recovery callback.
const fixture = read("scripts/validate_patch72_1a_zoo_escape.js");
const start = fixture.indexOf("function harness("), end = fixture.indexOf("\nasync function run(){", start);
ok(start > 0 && end > start, "real controller fake-DOM fixture available");
let model = fixture.slice(start,end);
const find = '  const win={document:doc,matchMedia:()=>({matches:!!options.reduced})';
ok(model.includes(find), "fixture test window injection stable");
model = model.replace(find, '  const win={localStorage:options.storage,document:doc,matchMedia:()=>({matches:!!options.reduced})');
const hook = 'profileId:"p1",petName:"Milo",soundIsReady:';
ok(model.includes(hook), "fixture recovery owner configured");
model = model.replace(hook, 'profileId:options.profileId || "p1",petName:"Milo",isTestRun:()=>!!options.testRun,soundIsReady:');
const scope = { vm, engine:src, Math, Date, Promise, URL, console, checks:0, ok:()=>{}, eq:()=>{}, assert };
vm.runInNewContext(model + "\nthis.makeHarness=harness;", scope);
function storage() {
 const data = new Map();
 return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
const flush = async () => { for(let i=0;i<5;i++) await Promise.resolve(); };
const get = h => h.win.BibloZooZooStats.get("p1");
async function firstEscape(h) {
 h.ctl.start();h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"escape","real failed recovery enters escape");
}
(async()=>{
 const store=storage();
 let h=scope.makeHarness([false, false, true],{reduced:true,storage:store});
 eq(h.win.BibloZooZooStats.get("p1").petsRescued,0,"initial per-profile tally starts at zero");
 await firstEscape(h);
 eq(h.petNodes().length,1,"one pet in Stage 2");
 ok(!h.petNodes()[0].disabled,"reduced motion pet is immediately selectable");
 const transform=h.petNodes()[0].style.transform;
 ok(transform.includes("scale(1)"),"reduced motion renders full-sized image");
 h.advance(2000);
 eq(h.petNodes()[0].style.transform,transform,"reduced motion pet does not bounce after time passes");
 const pet=h.petNodes()[0];
 h.rescueFirst();
 eq(get(h).petsRescued,1,"one rescued pet persisted");
 pet.trigger("click");
 eq(get(h).petsRescued,1,"duplicate activation after rescue has no credit");
 eq(h.ctl.getStage(),"escape","catching pet does not verify audio");
 eq(get(h).zooBreaksStopped,0,"no break credit after Stage 2");
 h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"break","second real recovery failure starts Zoo Break");
 h.advance(12500);
 const count=h.ctl.getState().total;
 eq(h.petNodes().length,count,"all 6-10 portraits spawn in reduced-motion mode");
 for(let i=0;i<count;i++) h.rescueFirst();
 eq(get(h).petsRescued,1+count,"each Stage 3 rescue credits exactly once");
 eq(get(h).zooBreaksStopped,0,"all pets caught is not yet a VERIFIED stopped break");
 h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"recovered","owner recovery succeeds on final LOCK GATE");
 eq(get(h).zooBreaksStopped,1,"verified gate credits one Zoo Break stopped");
 eq(get(h).pendingPets,1+count,"per-profile home celebration accumulates rescued pets");
 eq(get(h).pendingBreaks,1,"pending home celebration includes stopped break");
 eq(h.win.BibloZooZooStats.get("p2").petsRescued,0,"other Zookeeper unaffected");
 const first=h.win.BibloZooZooStats.acknowledgeCelebration("p1");
 eq(first.petsRescued,1+count,"first title visit gets pending pet milestone");
 eq(first.zooBreaksStopped,1,"first title visit gets pending break milestone");
 eq(h.win.BibloZooZooStats.acknowledgeCelebration("p1"),null,"celebration consumed once only");
 eq(get(h).petsRescued,1+count,"dismissing celebration never resets totals");
 h.ctl.destroy();
 // Rescued pets still count even if a later recovery fails, but an
 // unverified final gate must never count as a stopped Zoo Break.
 h=scope.makeHarness([false,false,false],{storage:store,reduced:true});
 await firstEscape(h);h.rescueFirst();h.button.trigger("click");await flush();
 h.advance(12500);const more=h.ctl.getState().total;
 for(let i=0;i<more;i++) h.rescueFirst();
 h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"exiting","third failure enters safe-exit path");
 eq(get(h).zooBreaksStopped,1,"failed third verification does not credit another stopped Zoo Break");
 eq(get(h).petsRescued,2+count+more,"genuinely rescued pets remain counted even if audio stays unavailable");
 h.ctl.destroy();
 // Feeding's manual test mode is entirely excluded, even if its recovery
 // owner returns a synthetic success to end the scenario.
 const before=get(h).petsRescued;
 h=scope.makeHarness([false,true],{storage:store,reduced:true,testRun:true});
 await firstEscape(h);h.rescueFirst();h.button.trigger("click");await flush();
 eq(get(h).petsRescued,before,"Feeding developer test does not add pet credit");
 eq(get(h).zooBreaksStopped,1,"Feeding developer test does not add Zoo Break credit");
 h.ctl.destroy();
 // Shared hidden whole-app menu invokes exactly the same controller but
 // replaces failures only. Select Stage 3 via actual 2.4s title long press.
 h=scope.makeHarness([true],{storage:store,reduced:true});
 h.ctl.start();h.title.trigger("pointerdown",{pointerId:5,clientX:10,clientY:10});
 h.advance(2500);
 const menu=h.overlay.children.find(n=>n.className==="bz-zoo-dev-menu");
 ok(menu,"hidden developer test menu is available");
 const card=menu?.children[0];
 const scenario=card?.children.find(n=>n.textContent==="Stage 3 → Verify real recovery");
 ok(scenario,"Stage 3 developer test option present");
 scenario.trigger("click");
 h.button.trigger("click");await flush();h.rescueFirst();h.button.trigger("click");await flush();
 h.advance(12500);const devCount=h.ctl.getState().total;
 for(let i=0;i<devCount;i++) h.rescueFirst();
 h.button.trigger("click");await flush();
 eq(h.ctl.getStage(),"recovered","dev Stage 3 real recovery still works");
 eq(get(h).petsRescued,before,"whole-app developer testing never adds rescue stats");
 eq(get(h).zooBreaksStopped,1,"whole-app developer testing never adds stopped-break stats");
 h.ctl.destroy();
 const broken={getItem(){throw Error("private")},setItem(){throw Error("private")}};
 h=scope.makeHarness([false],{storage:broken,reduced:true});
 await firstEscape(h);h.rescueFirst();
 eq(h.ctl.getState().rescued,1,"storage errors never block rescue");
 h.ctl.destroy();
 console.log(`Patch 72.1D Zookeeper statistics: ${checks} checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
