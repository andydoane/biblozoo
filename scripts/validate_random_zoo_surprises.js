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
const workflow = read(".github/workflows/ios-prep-validation.yml");

assert.match(workflow, /node scripts\/validate_random_zoo_surprises\.js/);
assert.match(engine, /daily: 0\.25, welcome: 0\.10/);
assert.match(engine, /Math\.random\(\) < 0\.80 \? "escape" : "break"/);
assert.match(engine, /SURPRISE_PREFIX = "biblozooZooSurprise:v1:"/);
assert.match(profiles, /localStorage\.removeItem\(`biblozooZooSurprise:v1:\$\{id\}`\)/,
  "Deleting a profile with its progress must clear its separate surprise eligibility");
assert.match(engine, /!kind \|\| !startSurprise\(kind\)\) successful\(\)/);
assert.match(engine, /if \(surpriseMode\) \{[\s\S]*?successful\(\);[\s\S]*?return;[\s\S]*?if \(attemptCount >= MAX_ATTEMPTS\)/);
assert.match(engine, /if \(surpriseEnabled && !isDeveloperRun\(\)\)[\s\S]*?recoveryFailureWithoutSurprise\(\)/);
assert.match(engine, /handleRecoveryFailure\(from\)/);
assert.match(engine, /button\.disabled = attemptCount >= MAX_ATTEMPTS/);
assert.match(engine, /let recovery;[\s\S]*?recoveryForAttempt\([\s\S]*?ok === true && running\(\)[\s\S]*?choose\?\.\(profileId, "welcome"\)/);
assert.match(welcomeReturn, /try \{ outcome = onContinue\(\); \} catch/);
assert.match(welcomeReturn, /surpriseEnabled: true/);
assert.match(readGame, /surpriseEnabled: true/);
assert.match(feeding, /surpriseEnabled: true/);
assert.match(app, /surpriseEnabled: true/);
assert.match(app, /const openZooTodoWithSurprise = \(destination\) =>/);
assert.match(app, /const kind = policy\.choose\(id, "daily"\)/);
assert.match(app, /recover: \(\) => false/);
assert.match(app, /onRecovered: complete,[\s\S]*?onExit: complete/);
assert.match(app, /controller\.startSurprise\?\.\(kind\)/);
assert.match(app, /titleTodoBtn\.onclick = \(e\) => \{[\s\S]*?openZooTodoWithSurprise\(\(\) => openDailyTodoPreview\(/);
assert.match(app, /if \(dailyHomeReady\) \{[\s\S]*?dailyHomeOffer\?\.remove\(\);[\s\S]*?openZooTodoWithSurprise\(\(\) => openDailyTodoPreview\("actual"\)/);
assert.match(shell, /useZooEscape: !options\.nativeOnlyAudio/,
  "Existing native-only Playground audio return must still keep its approved plain recovery UI");
assert.match(app, /if \(!isNativeLearnListenMode\(\)/,
  "Native Learn audio recovery must not be silently converted into a minigame");

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
function policy(store, random, initialDay = "2026-11-13") {
  let day = initialDay;
  class DateForPolicy extends Date {
    constructor(...args) { super(...(args.length ? args : [day + "T12:00:00"])); }
    static now() { return new Date(day + "T12:00:00").valueOf(); }
  }
  const win = {localStorage:store};
  vm.runInNewContext(engine, {window:win,Math:random,Date:DateForPolicy,Promise,URL,console});
  return {choose:(id,source)=>win.BibloZooZooSurprise.choose(id,source),
    setDay:d=>{day=d;}, stats:id=>win.BibloZooZooStats.get(id)};
}

{
  const store=storage(), p=policy(store,seededMath(0.1,0.3));
  assert.equal(p.choose("kid-a","daily"),"escape","25% daily opportunity");
  assert.equal(p.choose("kid-a","daily"),null,"no repeat from other Zoo To-Do button");
  assert.equal(p.choose("kid-a","welcome"),null,"one surprise total per Zookeeper/day");
  assert.equal(p.choose("kid-b","daily"),null,"profile isolation, random 0.5 outside 25%");
  p.setDay("2026-11-14");
  assert.equal(p.choose("kid-a","daily"),null,"new calendar date reopens eligibility");
}
{
  const p=policy(storage(),seededMath(0.24,0.95));
  assert.equal(p.choose("kid-a","daily"),"break","20% of surprises are full Zoo Breaks");
}
{
  const p=policy(storage(),seededMath(0.8,0.04,0.2));
  assert.equal(p.choose("kid-a","daily"),null,"daily 25% miss");
  assert.equal(p.choose("kid-a","daily"),null,"no farming daily misses");
  assert.equal(p.choose("kid-a","welcome"),"escape","independent verified Welcome 10% opportunity");
  assert.equal(p.choose("kid-a","welcome"),null,"no repeated recovery-roll attempts");
}
{
  const p=policy(storage(),seededMath(0.099,0.95));
  assert.equal(p.choose("kid-a","welcome"),"break","Welcome 10% and Zoo Break share 80/20 split");
  assert.equal(p.choose("","welcome"),null,"unknown profile cannot store surprise");
  assert.equal(p.choose("kid-a","not-a-trigger"),null,"unknown events rejected");
}
{
  const bad={getItem(){throw Error("storage blocked")},setItem(){throw Error("storage blocked")}};
  assert.equal(policy(bad,seededMath(0)).choose("kid-a","daily"),null,
    "Unavailable storage fails closed; don't lose task navigation");
}

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
  "const win={localStorage:options.localStorage,document:doc,matchMedia:");
rewrite("const sandbox={window:win,Date:FakeDate,Math,Promise,URL,console};",
  "const sandbox={window:win,Date:FakeDate,Math:options.randomMath || Math,Promise,URL,console};");
rewrite('profileId:"p1",petName:"Milo",soundIsReady:',
  'profileId:"p1",surpriseEnabled:!!options.surpriseEnabled,petName:"Milo",soundIsReady:');
const harness=new Function("engine","vm","assert","URL","console",
  'let checks=0;\n'+fixture+'\nreturn harness;')(engine,vm,assert,URL,console);

async function main() {
  {
    // Child taps the real Welcome Back action. A verified audio result is
    // mandatory BEFORE the random Pet Escape becomes visible.
    const h=harness([true],{localStorage:storage(),surpriseEnabled:true,
      randomMath:seededMath(0.01,0.10),reduced:true});
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
    assert.equal(h.win.localStorage.getItem("biblozooZooSurprise:v1:p1"),null,
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
    assert.equal(h.win.localStorage.getItem("biblozooZooSurprise:v1:p1"),null);
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
  console.log("Random Zoo surprise PASS: 25% shared Daily, 10% verified Welcome, 80/20 kind, once per profile/day; real click audio recovery first, failed/deferred audio never spawns pets, bounded retry, real rescue/LOCK GATE/stats/return without fake sound.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
