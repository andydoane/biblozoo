"use strict";
/* Random Zoo surprises: exercised with the EXISTING patch72 real controller
 * fake DOM, plus fixed-random profile/day policy. No audio recovery faking.
 * The actual native iPhone sound/session/device gates remain owner-tested.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const engine = read("verse_games/shared/welcome-back-zoo-escape.js");
const welcomeReturn = read("verse_games/shared/welcome-back-return.js");
const app = read("app.js");
const readGame = read("read_my_verse.js");
const feeding = read("daily_questions_feed_game.js");
const shell = read("verse_games/shared/game-shell.js");
const profiles = read("profiles.js");
const testing = read("scripts/validate_patch72_1a_zoo_escape.js");
const devDock = read("verse_games/shared/native-dev-tools-dock-n7e.js");
const workflow = read(".github/workflows/ios-prep-validation.yml");

assert.match(workflow, /node scripts\/validate_random_zoo_surprises\.js/);
assert.match(engine, /firstBreak: 0\.55/);
assert.match(engine, /extraDailyBreak: 0\.05/);
assert.match(engine, /extraWelcomeBreak: 0\.02/);
assert.match(engine, /petAfterNoBreak: 0\.15/);
assert.match(engine, /SURPRISE_PREFIX = "biblozooZooSurprise:v2:"/);
assert.match(engine, /priorBreaks === 0[\s\S]*?SURPRISE_CHANCES\.firstBreak/);
assert.match(engine, /root\.localStorage\.setItem\(key, JSON\.stringify\(\{[\s\S]*?breaksTriggered: priorBreaks \+ \(isBreak \? 1 : 0\)/);
assert.doesNotMatch(engine.slice(engine.indexOf("function chooseSurprise("), engine.indexOf("root.BibloZooZooSurprise =")),
  /dailyTried|welcomeTried|shown === true|state\[tried\]/,
  "Every eligible button press must receive a new random roll");
for (const version of ["v1","v2"])
  assert(profiles.includes("localStorage.removeItem(`biblozooZooSurprise:" + version + ":${id}`)"),
    "Deleting a Zookeeper's progress clears old/new daily chance records");
assert.match(engine, /!kind \|\| !startSurprise\(kind\)\) successful\(\)/);
assert.match(engine, /if \(surpriseMode\) \{[\s\S]*?successful\(\);[\s\S]*?return;[\s\S]*?if \(attemptCount >= MAX_ATTEMPTS\)/);
assert.match(engine, /if \(recoveryOnly \|\| \(surpriseEnabled && !isDeveloperRun\(\)\)\)[\s\S]*?recoveryFailureWithoutSurprise\(\)/);
assert.match(engine, /handleRecoveryFailure\(from\)/);
assert.match(engine, /button\.disabled = attemptCount >= MAX_ATTEMPTS/);
assert.match(engine, /let recovery;[\s\S]*?recoveryForAttempt\([\s\S]*?ok === true && running\(\)[\s\S]*?choose\?\.\(profileId, "welcome"\)/);
assert.match(welcomeReturn, /try \{ outcome = onContinue\(\); \} catch/);
assert.match(welcomeReturn, /surpriseEnabled: true/);
assert.match(readGame, /surpriseEnabled: false/);
assert.match(feeding, /surpriseEnabled: false/);
assert.match(app, /surpriseEnabled: false/);
assert.match(app, /const openZooTodoWithSurprise = \(destination\) =>/);
assert.match(app, /const kind = policy\.choose\(id, "daily"\)/);
assert.match(app, /recover: \(\) => false/);
assert.match(app, /onRecovered: complete,[\s\S]*?onExit: complete/);
assert.match(app, /controller\.startSurprise\?\.\(kind\)/);
assert.match(app, /titleTodoBtn\.onclick = \(e\) => \{[\s\S]*?openZooTodoWithSurprise\(\(\) => openDailyTodoPreview\(/);
assert.match(app, /if \(dailyHomeReady\) \{[\s\S]*?dailyHomeOffer\?\.remove\(\);[\s\S]*?openZooTodoWithSurprise\(\(\) => openDailyTodoPreview\("actual"\)/);
assert.match(shell, /useZooEscape: options\.allowZooSurprises !== false/,
  "Eligible native Playground apps now opt into surprises; Jam stays excluded");
assert.match(shell, /allowDevForceZooEscape: options\.allowZooSurprises !== false/,
  "Explicit Playground exclusion also rejects the DEV forced-escape override");
assert.match(welcomeReturn, /const forceDevEscape = allowDevForceZooEscape &&/,
  "Shared controller respects an activity-level DEV force exemption");
const verseJam = read("verse_playground/verse_jam/game.js");
assert.match(verseJam, /allowZooSurprises: false/,
  "Verse Jam never enables Zoo Break or Pet Escape, even with DEV force ON");
assert.match(readGame, /const \[movingSong, movingNarration\] = await Promise\.all\(\[/,
  "Crawl verifies soundtrack and narration progress concurrently to reduce audible lead-in");
assert.match(readGame, /waitReadMediaProgress\(song\?\.audio, current, 14, 95\)/,
  "Crawl checks real progress more frequently without bypassing the clock");
assert.match(app, /if \(!isNativeLearnListenMode\(\) &&/,
  "Native Learn Listen remains a plain recovery, even in DEV Force mode");

function storage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    dump: map
  };
}
function seededMath(...values) {
  const math = Object.create(Math);
  math.random = () => values.length ? values.shift() : 0.5;
  return math;
}
function policy(store, random, initialDay = "2026-11-13", nativeIos = false, devAllowed = true) {
  let day = initialDay;
  class DateForPolicy extends Date {
    constructor(...args) { super(...(args.length ? args : [day + "T12:00:00"])); }
    static now() { return new Date(day + "T12:00:00").valueOf(); }
  }
  const win = {localStorage:store,
    ...(nativeIos ? {Capacitor:{
      isNativePlatform:()=>true,getPlatform:()=>"ios"
    },BibloZooNativeOnlyOutput:{enabled:true,devToolsAllowed:devAllowed}} : {})};
  vm.runInNewContext(engine, {window:win,Math:random,Date:DateForPolicy,Promise,URL,console});
  return {choose:(id,source)=>win.BibloZooZooSurprise.choose(id,source),
    plan:id=>win.BibloZooZooSurprise.planWelcome(id),
    forced:()=>win.BibloZooZooSurprise.isDevForceWelcomeEscapeEnabled(),
    setDay:d=>{day=d;}, stats:id=>win.BibloZooZooStats.get(id)};
}

// Each *press* is independent; only a selected Break lowers subsequent
// Break odds for the rest of that Zookeeper's local day.
{
  const store=storage(), p=policy(store,seededMath(0.99,0.99,0.54));
  assert.equal(p.choose("kid-a","daily"),null,"a miss is not a one-time daily ticket");
  assert.equal(p.choose("kid-a","daily"),"break",
    "second tap still gets generous 55% until first Zoo Break");
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:kid-a")).breaksTriggered,1);
  assert.equal(p.choose("kid-a","not-a-trigger"),null,"unknown triggers cannot roll");
  assert.equal(p.choose("","daily"),null,"unknown Zookeeper cannot earn odds state");
}
{
  const store=storage();
  const p=policy(store,seededMath(
    0.54,             // first day's Break, exactly under 55%
    0.051,0.99,       // further Daily 5% miss, Pet 15% miss
    0.049,            // later Daily 5% hit: a second Break is possible
    0.019,            // Welcome later 2% hit: a THIRD Break is possible
    0.021,0.12        // Welcome 2% miss, Pet 15% hit
  ));
  assert.equal(p.choose("kid-a","daily"),"break");
  assert.equal(p.choose("kid-a","daily"),null);
  assert.equal(p.choose("kid-a","daily"),"break");
  assert.equal(p.choose("kid-a","welcome"),"break");
  assert.equal(p.choose("kid-a","welcome"),"escape",
    "Pet Escapes still roll separately after no Zoo Break");
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:kid-a")).breaksTriggered,3,
    "Pet Escapes don't increase the Zoo Break count");
  p.setDay("2026-11-14");
  assert.equal(p.choose("kid-a","welcome"),"break",
    "the next local day resets to 55% first-Break odds");
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:kid-a")).breaksTriggered,1);
}
{
  const store=storage();
  const p=policy(store,seededMath(0.9,0.1,0.5,0.9,0.1,0.4));
  assert.equal(p.choose("kid-a","daily"),"escape",
    "Pet Escape can happen before the first Zoo Break");
  assert.equal(p.choose("kid-a","welcome"),"break",
    "Pet Escape does NOT lower 55% first-break odds");
  assert.equal(p.choose("kid-b","daily"),"escape",
    "a different Zookeeper keeps independent first-Break odds");
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:kid-a")).breaksTriggered,1);
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:kid-b")).breaksTriggered,0);
}
{
  // The old one-roll-per-day record must not suppress any new v2 roll.
  const store=storage();
  store.setItem("biblozooZooSurprise:v1:kid-a",
    JSON.stringify({day:"2026-11-13",dailyTried:true,welcomeTried:true,shown:true}));
  const p=policy(store,seededMath(0.5));
  assert.equal(p.choose("kid-a","daily"),"break",
    "v1 suppression flags are retired; a v2 roll is allowed immediately");
}
{
  const bad={getItem(){throw Error("storage blocked")},setItem(){throw Error("storage blocked")}};
  assert.equal(policy(bad,seededMath(0)).choose("kid-a","daily"),null,
    "Unavailable storage fails closed; don't strand normal task navigation");
}

// Crawl's provisional roll is pure until a real owner audio success. Failure
// or app switch never consumes ordinary daily odds; only verified selection
// may commit the exact per-Zookeeper count, once.
{
  const store=storage(),p=policy(store,seededMath(0.50,0.99,0.12));
  const first=p.plan("child");
  assert.equal(first.kind,"break");
  assert.equal(store.getItem("biblozooZooSurprise:v2:child"),null,
    "Crawl must not pre-credit random Zoo odds before sound verification");
  const second=p.plan("child");
  assert.equal(second.kind,"escape","failed first roll does not commit but next tap can roll");
  assert.equal(store.getItem("biblozooZooSurprise:v2:child"),null);
  assert.equal(second.commit(),true,"verified audio commits the selected outcome");
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:child")).breaksTriggered,0,
    "Pet Escape does not consume first Zoo Break chance");
  assert.equal(first.commit(),true);
  assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:child")).breaksTriggered,1,
    "selected Zoo Break is counted only when the verified reservation commits");
}
{
  const store=storage(),p=policy(store,seededMath(0.99,0.98),"2026-11-13",true);
  store.setItem("biblozooDevForceWelcomePetEscape:v1","1");
  const plan=p.plan("child");
  assert.equal(plan.kind,"escape","DEV force participates in preselected cue");
  assert.equal(plan.commit(),true);
  assert.equal(store.getItem("biblozooZooSurprise:v2:child"),null,
    "DEV forced escape cannot write ordinary random odds");
}
{
  const store=storage(),p=policy(store,seededMath(0.99,0.99),
    "2026-11-13",true,false);
  store.setItem("biblozooDevForceWelcomePetEscape:v1","1");
  assert.equal(p.forced(),false,"production must ignore a stale DEV force flag");
  assert.equal(p.plan("child"),null,"production cannot force a Zoo escape from DEV storage");
}

// The main-screen DEV Tools switch is a native Audio Test-only override:
 // every VERIFIED Welcome Back forces exactly a Pet Escape, WITHOUT writing
 // ordinary random-schedule state or crediting fake rescue statistics.
{
  const store=storage(),p=policy(store,seededMath(0.99,0.99,0.99),
    "2026-11-13",true);
  const key="biblozooDevForceWelcomePetEscape:v1";
  assert.equal(p.forced(),false);
  store.setItem(key,"1");
  assert.equal(p.forced(),true);
  assert.equal(p.choose("child","welcome"),"escape");
  assert.equal(p.choose("child","welcome"),"escape");
  assert.equal(store.getItem("biblozooZooSurprise:v2:child"),null,
    "DEV force must NOT consume normal Zoo Break odds or days");
  store.removeItem(key);
  assert.equal(p.forced(),false,"turning toggle OFF returns to normal odds");
  const web=policy(store,seededMath(0.99,0.99),"2026-11-13",false);
  store.setItem(key,"1");
  assert.equal(web.forced(),false,"force option must never apply to PWA/Web");
  const nativeAndroid=policy(store,seededMath(0.99,0.99),"2026-11-13",true);
  assert.equal(nativeAndroid.forced(),true,"native iOS gate was exercised");
  store.removeItem(key);
  assert.match(devDock,/Force Pet Escape on Let's go!/);
  assert.match(devDock,/aria-pressed/);
  assert.match(devDock,/root\.BibloZooNativeOnlyOutput\?\.enabled === true/);
  assert.match(devDock,/root\.Capacitor\?\.getPlatform\?\.\(\) === "ios"/);
}
// These original audio owners must continue their verified resume before
// checking entertainment odds: no fake Let's go! tap, no random recovery.
// Reuse the previously tested real controller fixture, including its fake DOM,
// pointer-rescue motion, LOCK GATE, field, sound and per-Zookeeper stats.
const start=testing.indexOf("function harness(");
const end=testing.indexOf("\nasync function run()",start);
assert(start>0 && end>start,"existing real rescue-controller fixture missing");
let fixture=testing.slice(start,end);
function rewrite(a,b) {
  assert.equal(fixture.split(a).length,2,"fixture contract drift: "+a);
  fixture=fixture.replace(a,b);
}
rewrite("const win={document:doc,matchMedia:",
  "const win={localStorage:options.localStorage,...(options.nativeIos ? {Capacitor:{isNativePlatform:()=>true,getPlatform:()=>\"ios\"},BibloZooNativeOnlyOutput:{enabled:true,devToolsAllowed:true}} : {}),document:doc,matchMedia:");
rewrite("const sandbox={window:win,Date:FakeDate,Math,Promise,URL,console};",
  "const sandbox={window:win,Date:FakeDate,Math:options.randomMath || Math,Promise,URL,console};");
rewrite('profileId:"p1",petName:"Milo",soundIsReady:',
  'profileId:"p1",surpriseEnabled:!!options.surpriseEnabled,recoveryOnly:!!options.recoveryOnly,preselectWelcomeSurprise:!!options.preselectWelcomeSurprise,petName:"Milo",soundIsReady:');
rewrite('recover:()=>{recovery.push(time);return answers.shift();}',
  'recover:info=>{recovery.push({time,info});return answers.shift();}');
const harness=new Function("engine","vm","assert","URL","console",
  'let checks=0;\n'+fixture+'\nreturn harness;')(engine,vm,assert,URL,console);

async function main() {
  {
    // Even an unavailable native session and the DEV Force switch must
    // NEVER turn an excluded Learn/Read/Feeding return into rescue gameplay.
    const store=storage();
    store.setItem("biblozooDevForceWelcomePetEscape:v1","1");
    const h=harness([false,false,false],{localStorage:store,
      nativeIos:true,recoveryOnly:true,surpriseEnabled:false});
    h.ctl.start();
    assert.equal(h.ctl.startSurprise("escape"),false,
      "recovery-only caller cannot open pets directly");
    for(let i=0;i<3;i++){
      h.button.trigger("click");
      await Promise.resolve();
      assert.equal(h.ctl.getStage(),"welcome",
        "real failed owner audio must remain ordinary Welcome Back");
      assert.equal(h.recovery[i].info.plannedSurprise,null);
    }
    assert.equal(h.button.disabled,true,
      "after bounded denied-audio retries, offer safe Back not Zoo Escape");
    assert.equal(store.getItem("biblozooZooSurprise:v2:p1"),null,
      "recovery-only path cannot consume odds");
    h.ctl.destroy();
  }
  {
    // Defense in depth: even if an excluded owner accidentally passes
    // surpriseEnabled:true, recoveryOnly prevents selection or direct entry.
    const h=harness([true],{localStorage:storage(),nativeIos:true,
      recoveryOnly:true,surpriseEnabled:true,preselectWelcomeSurprise:true});
    h.ctl.start();
    assert.equal(h.ctl.startSurprise("break"),false);
    h.button.trigger("click");
    assert.equal(h.recovery[0].info.plannedSurprise,null,
      "no pet audio cue should be selected by a recovery-only owner");
    await Promise.resolve();
    assert.equal(h.ctl.getStage(),"recovered");
    assert.equal(h.win.BibloZooZooStats.get("p1").petsRescued,0);
    h.ctl.destroy();
  }
  {
    const store=storage();
    const h=harness([false,true],{localStorage:store,surpriseEnabled:true,
      preselectWelcomeSurprise:true,randomMath:seededMath(0.99,0.1,0.99,0.1)});
    h.ctl.start();
    h.button.trigger("click");
    assert.equal(h.recovery[0].info.plannedSurprise,"escape",
      "first real tap preselects cue before owner recovery");
    assert.equal(store.getItem("biblozooZooSurprise:v2:p1"),null,
      "selected pet cannot change odds until sound succeeds");
    await Promise.resolve();
    assert.equal(h.ctl.getStage(),"welcome",
      "an unverified cue cannot make the escape visible");
    h.button.trigger("click");
    assert.equal(h.recovery[1].info.plannedSurprise,"escape");
    await Promise.resolve();
    assert.equal(h.ctl.getStage(),"escape",
      "verified cue allows the preselected escape to begin");
    assert.equal(JSON.parse(store.getItem("biblozooZooSurprise:v2:p1")).breaksTriggered,0);
    h.ctl.destroy();
  }
  {
    const store=storage();
    store.setItem("biblozooDevForceWelcomePetEscape:v1","1");
    const h=harness([true],{localStorage:store,surpriseEnabled:true,
      nativeIos:true,preselectWelcomeSurprise:true});
    h.ctl.start();h.button.trigger("click");
    assert.equal(h.recovery[0].info.plannedSurprise,"escape");
    await Promise.resolve();
    assert.equal(h.ctl.getStage(),"escape","DEV forced cue selected before playback");
    assert.equal(store.getItem("biblozooZooSurprise:v2:p1"),null,
      "DEV cue verification does not burn normal Break odds");
    h.ctl.destroy();
  }
  {
    // Child taps the real Welcome Back action. A verified audio result is
    // mandatory BEFORE the random Pet Escape becomes visible.
    const h=harness([true],{localStorage:storage(),surpriseEnabled:true,
      randomMath:seededMath(0.99,0.10),reduced:true});
    h.ctl.start();
    assert.equal(h.ctl.getStage(),"welcome");
    h.button.trigger("click");
    assert.equal(h.recovery.length,1,"Let's go! invokes the real owner recovery directly in this click");
    assert.equal(h.ctl.getStage(),"welcome","do not present surprise before verified recovery");
    await Promise.resolve();
    assert.equal(h.ctl.getStage(),"escape");
    assert.equal(h.fired.includes("recovered"),false,"game stays behind overlay until rescue");
    h.button.trigger("click");
    assert.equal(h.recovery.length,1,"no second fake audio verification at a random LOCK GATE");
    h.advance(1200);
    h.rescueFirst();
    h.button.trigger("click");
    assert.equal(h.recovery.length,1,"completed gate never repeats audio recovery");
    assert.equal(h.fired.filter(x=>x==="recovered").length,1);
    assert.equal(h.button.disabled,true,"Lock Gate immediately acknowledges completion");
    assert.equal(h.button.textContent,"Opening the gate...",
      "do not flash the ordinary Welcome Back button while the owner finishes");
    h.button.trigger("click");
    assert.equal(h.fired.filter(x=>x==="recovered").length,1,
      "repeated LOCK GATE input cannot double-release gameplay");
    assert.equal(h.win.BibloZooZooStats.get("p1").petsRescued,1,
      "real rescued pet credits profile once");
    h.ctl.destroy();
  }
  {
    const h=harness([true],{localStorage:storage(),surpriseEnabled:true,
      randomMath:seededMath(0.02,0.98),reduced:true});
    h.ctl.start();h.button.trigger("click");await Promise.resolve();
    assert.equal(h.ctl.getStage(),"break","full Zoo Break can be selected directly");
    const total=h.ctl.getState().total;
    assert(total>=6&&total<=10);
    h.advance(14000);
    for(let i=0;i<total;i++) h.rescueFirst();
    assert.equal(h.win.BibloZooZooStats.get("p1").zooBreaksStopped,0,
      "all rescued is not yet a stopped break; LOCK GATE still required");
    h.button.trigger("click");
    assert.equal(h.recovery.length,1);
    assert.equal(h.fired.filter(x=>x==="recovered").length,1);
    assert.equal(h.button.textContent,"Opening the gate...",
      "Zoo Break also retains its completion artwork until owner recovery");
    assert.equal(h.win.BibloZooZooStats.get("p1").petsRescued,total);
    assert.equal(h.win.BibloZooZooStats.get("p1").zooBreaksStopped,1);
    h.ctl.destroy();
  }
  {
    const h=harness([false],{localStorage:storage(),surpriseEnabled:true,
      randomMath:seededMath(0,0.1)});
    h.ctl.start();h.button.trigger("click");await Promise.resolve();
    assert.equal(h.recovery.length,1);
    assert.equal(h.ctl.getStage(),"welcome",
      "real audio failure must NOT cause a production Pet Escape");
    assert.equal(h.button.disabled,false,
      "safe retry on original Let's go! remains available");
    assert.equal(h.ctl.getState().attemptCount,1);
    assert.equal(h.win.localStorage.getItem("biblozooZooSurprise:v2:p1"),null,
      "audio failure cannot consume a random entertainment roll");
    h.button.trigger("click");await Promise.resolve();
    h.button.trigger("click");await Promise.resolve();
    assert.equal(h.ctl.getStage(),"welcome");
    assert.equal(h.ctl.getState().attemptCount,3);
    assert.equal(h.button.disabled,true,
      "bounded recovery failures offer Back rather than another fake rescue");
    assert.equal(h.recovery.length,3);
    h.ctl.destroy();
  }
  {
    const h=harness([{deferred:true}],{localStorage:storage(),surpriseEnabled:true,
      randomMath:seededMath(0,0.1)});
    h.ctl.start();h.button.trigger("click");await Promise.resolve();
    assert.equal(h.ctl.getStage(),"welcome",
      "OS/audio priority deferral still requires the child's next real tap");
    assert.equal(h.ctl.getState().attemptCount,0);
    assert.equal(h.win.localStorage.getItem("biblozooZooSurprise:v2:p1"),null);
    h.ctl.destroy();
  }
  {
    // This is the Daily To-Do screen's independent, preselected random
    // experience, not a made-up return-from-interruption on a healthy session.
    const h=harness([],{localStorage:storage(),reduced:true});
    h.ctl.start();
    assert.equal(h.ctl.startSurprise("escape"),true);
    assert.equal(h.ctl.getStage(),"escape");
    h.advance(1200);h.rescueFirst();h.button.trigger("click");
    assert.equal(h.recovery.length,0,"Daily surprise never executes an audio recovery callback");
    assert.equal(h.fired.filter(x=>x==="recovered").length,1,
      "completion calls original pending Zoo To-Do navigation");
    h.ctl.destroy();
  }
  console.log("Random Zoo surprise PASS: repeatable 55% first Break per press, then 5% Daily / 2% verified Welcome Breaks; 15% Pet on non-break, per-profile/day reset, original owner audio gesture and failed/deferred recovery untouched, actual rescue/LOCK GATE/stats and return.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
