#!/usr/bin/env node
"use strict";
// Patch 72: activity inventory, recovery contracts, launch precache and offline
// navigation simulation. These checks cannot establish audible iOS playback.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
let checks = 0;
function ok(condition, message) { assert.ok(condition, message); checks++; }
function equal(a,b,message) { assert.equal(a,b,message); checks++; }
const gameSource = read("verse_games/registry.js");
const playgroundSource = read("verse_playground/registry.js");
const registry = {window:{}};
vm.runInNewContext(gameSource, registry, {filename:"verse_games/registry.js"});
vm.runInNewContext(playgroundSource, registry, {filename:"verse_playground/registry.js"});
const games = registry.window.EXTERNAL_VERSE_GAMES.filter(x => x.enabled !== false);
const playgrounds = registry.window.EXTERNAL_VERSE_PLAYGROUND.filter(x => x.enabled !== false);
equal(games.length,12,"12 external verse games in the active inventory");
equal(playgrounds.length,5,"5 Playground activities in the active inventory");
const all = [...games,...playgrounds];
const activityPaths = new Set();
for (const entry of all) {
  const launch = entry.manifest.launchUrl.replace(/^\.\//, "");
  ok(/^verse_(games|playground)\/[^/]+\/index\.html$/.test(launch),`safe launch path: ${entry.manifest.id}`);
  const dir = path.posix.dirname(launch);
  ok(!activityPaths.has(dir),`unique route: ${dir}`);
  activityPaths.add(dir);
  for (const item of ["index.html","game.js","game.css"]) {
    ok(fs.existsSync(path.join(root,dir,item)),`${dir}/${item} exists`);
  }
  const html = read(launch);
  ok(html.includes("welcome-back.css"),`${dir}: shared Welcome Back styling loaded`);
  ok(html.includes("welcome-back-return.js"),`${dir}: common lifecycle controller loaded`);
  ok(html.includes("game-shell.js"),`${dir}: common navigation/game shell loaded`);
  const source = read(`${dir}/game.js`);
  if (dir.startsWith("verse_games/")) {
    ok(source.includes("BibloZooWelcomeBackReturn?.attach?."),`${dir}: direct common return controller`);
  } else {
    ok(source.includes("attachPlaygroundWelcomeBack?."),`${dir}: common Playground adapter`);
  }
}
const feed = read("daily_questions_feed_game.js");
for (const id of ["CLASSIC","LABYRINTH","MELODY","BOUNCE"]) {
  ok(feed.includes(`FEED_MODES.${id}`),`Feeding ${id.toLowerCase()} mode present`);
}
for (const method of ["pauseFeedingGame", "attemptFeedingResumeFromGesture", "feedAudioClockAdvances", "stopMelodyVoices", "shiftFeedingDeadlines", "attachFeedInterruptionHandlers", "detachFeedInterruptionHandlers"]) {
  ok(feed.includes(method),`Feeding interruption contract ${method}`);
}
ok(feed.includes('runtime.feedPausedAt != null'),"Feeding blocks paused-frame progression");
ok(feed.includes('runtime.feedPageHidden'),"Feeding checks pagehide before resuming");
ok(feed.includes('runtime.feedAudioRecoveryVerified = true'),"Feeding explicitly verifies gesture audio");
const sharedReturn = read("verse_games/shared/welcome-back-return.js");
for (const field of ["visibilitychange","pagehide","pageshow","attemptSerial","failedAttempts >= 2","ESCAPE_WATCHDOG_MS","destroy()", "context.currentTime - before"]) {
  ok(sharedReturn.includes(field),`shared return cancellation/retry: ${field}`);
}
const welcomeCss=read("verse_games/shared/welcome-back.css");
ok(welcomeCss.includes("overflow-y: auto"),"Welcome Back card scrolls on short screens");
ok(welcomeCss.includes("max-height: min(82dvh, 600px)"),"Welcome Back height bounded by screen");
ok(welcomeCss.includes("prefers-reduced-motion"),"reduced-motion recovery feedback supported");
const welcome=read("verse_games/shared/welcome-back.js");
ok(welcome.includes("name.textContent = identity.name"),"profile name inserted as text not HTML");
ok(sharedReturn.includes('aria-modal'),"shared popup exposed as modal dialog");
ok(read("daily_questions.js").includes("dailyQuestionsReturnPaused"),"Daily Questions return gate active");
ok(read("daily_zoo_todo_ui.js").includes("clearDeveloperLongPress"),"daily task long-press cleanup present");
ok(read("read_my_verse.js").includes("pauseReadForInterruption"),"Read My Verse interruption owner intact");
ok(read("flashcards/flashcards.js").includes("interruptWackyPlayback"),"Flashcards wacky audio interruption owner intact");
ok(read("app.js").includes("attachAppActivityReturn();"),"app-level return gate attached");

// Evaluate service-worker JS in a sandbox instead of assuming string presence.
// A real install still depends on the deployed assets and browser cache quotas.
async function testServiceWorker() {
  const listeners = new Map();
  const base = "https://example.test/biblozoo/";
  const cached = new Map();
  const added = new Set();
  let online = true;
  let missingUrl = "";
  const warnings = [];
  const fakeCache = {
    async addAll(urls) { for(const url of urls){ if (urls.length===1 && url===missingUrl) throw new Error("simulated missing optional game asset"); added.add(url); cached.set(url,{ok:true,url}); } },
    async add(url) {if (url===missingUrl) throw new Error("simulated missing optional game asset"); added.add(url);cached.set(url,{ok:true,url});},
    async put(url,value) {cached.set(url,value);}
  };
  const caches = {
    open: async () => fakeCache,
    match: async url => cached.get(url)||null,
    keys: async () => [],
    delete: async () => true
  };
  const self = {
    location: {href:base+"service-worker.js",origin:"https://example.test"},
    registration: {scope:base},
    clients: {claim:async()=>{}},
    addEventListener:(event,fn)=>listeners.set(event,fn)
  };
  const fetch = async request => {
    if (!online) throw new Error("offline");
    const url = typeof request === "string" ? request:request.url;
    return {ok:true,status:200,url,clone(){return this;},async json(){return [];}};
  };
  const sandbox={self,caches,fetch,URL,console:{warn:(...args)=>warnings.push(args),log(){},error(){}},Promise};
  vm.createContext(sandbox);
  vm.runInContext(read("service-worker.js"),sandbox,{filename:"service-worker.js"});
  const dirs=Array.from(vm.runInContext("ACTIVITY_SHELL_DIRECTORIES",sandbox));
  equal(dirs.length,17,"17 activity launch routes in SW precache inventory");
  equal(new Set(dirs).size,17,"no duplicate activity launch routes");
  equal([...dirs].sort().join("|"),[...activityPaths].sort().join("|"),"SW inventory exactly matches enabled game/Playground registries");
  const core=Array.from(vm.runInContext("CORE_PATHS",sandbox));
  equal(new Set(core).size,core.length,"all mandatory offline shell paths are unique");
  for(const required of ["./verse_games/shared/game-shell.js", "./verse_games/shared/shell.css", "./verse_games/shared/daily-todo-shell.js"]) {
    ok(core.includes(required),`shared game dependency precached: ${required}`);
    ok(fs.existsSync(path.join(root,required)),`dependency in source: ${required}`);
  }
  const expected = Array.from(activityPaths).flatMap(dir=>["index.html","game.js","game.css"].map(f=>`${base}${dir}/${f}`));
  let install;
  listeners.get("install")({waitUntil(p){install=p;}});
  await install;
  for (const url of expected) ok(added.has(url),`offline install precaches ${url.slice(base.length)}`);
  // A missing optional game file must not abort the entire SW update.
  // This test is intentionally separate from the successful full install.
  missingUrl=base+"verse_games/verse_splat/game.css";
  added.clear();
  listeners.get("install")({waitUntil(p){install=p;}});
  await install;
  ok(!added.has(missingUrl),"failed optional game resource is not falsely cached");
  ok(warnings.some(parts=>String(parts[0]).includes("activity launch files")),
    "missing optional game resource produces an audit warning");
  ok(added.has(base+"verse_games/verse_munch/index.html"),
    "one missing optional file does not prevent other games from precaching");
  missingUrl="";
  const gameUrl=base+"verse_games/verse_munch/index.html";
  const pgUrl=base+"verse_playground/ghost_writer/index.html";
  for (const url of [gameUrl,pgUrl]) {
    online=false;
    let response;
    const request={method:"GET",cache:"default",mode:"navigate",url,headers:{has:()=>false}};
    listeners.get("fetch")({request,respondWith(p){response=p;}});
    ok(!!response,`${url.slice(base.length)} intercepted by SW`);
    const got=await response;
    equal(got.url,url,`offline route returns its own page, not app index: ${url.slice(base.length)}`);
    online=true;
  }
  let intercepted=false;
  listeners.get("fetch")({request:{method:"GET",cache:"default",mode:"cors",url:base+"verse_audio/a.mp3",headers:{has:h=>h==="range"}},respondWith(){intercepted=true;}});
  ok(!intercepted,"partial audio range requests retain native/browser handling");
  ok(/^2026_[A-Za-z]+_\d+_patch/.test(vm.runInContext("CACHE_VERSION",sandbox)) &&
     !read("service-worker.js").includes("2026_Oct_26_patch71_daily_app_welcome_back"),
     "service-worker cache version remains uniquely revisioned");
}
testServiceWorker().then(()=>console.log(`Patch 72 consistency audit: ${checks} checks passed`),error=>{console.error(error);process.exitCode=1;});
