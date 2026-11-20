/* Step 3a: production iOS DEV controls must be identity-gated. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const source=read("verse_games/shared/native-only-ios-output.js"),token="__BIBLOZOO_PACKAGED_APP_ID__";
assert.equal(source.split(token).length,2);
assert.match(read("scripts/build.js"),/template\.replace\(marker, capConfig\.appId\)/);
function make(id,kind="ios"){
 class Media{play(){return Promise.resolve(true)} pause(){}}
 class Video extends Media{}
 const window={Capacitor:{isNativePlatform:()=>kind!=="web",getPlatform:()=>kind},
   location:{protocol:"https:"},HTMLMediaElement:Media,HTMLVideoElement:Video,
   AudioContext:function(){},webkitAudioContext:function(){},
   document:{readyState:"loading",addEventListener(){}}};
 vm.runInNewContext(source.replace(token,id),{window,Promise,Error,Object});
 return window;
}
const prod=make("com.andydoane.biblozoo"),test=make("com.andydoane.biblozoo.audiotest");
assert.equal(prod.BibloZooNativeOnlyOutput?.enabled,true);
assert.equal(prod.BibloZooNativeOnlyOutput?.devToolsAllowed,false);
assert.equal(test.BibloZooNativeOnlyOutput?.devToolsAllowed,true);
assert.equal(make("com.andydoane.biblozoo","web").BibloZooNativeOnlyOutput,undefined);
assert.equal(make("com.andydoane.biblozoo","android").BibloZooNativeOnlyOutput,undefined);
function force(win){
 let writes=0;
 win.document={readyState:"loading",addEventListener(){}};
 win.addEventListener=()=>{};win.setTimeout=()=>0;
 win.localStorage={getItem:()=>"1",setItem:()=>{writes++},removeItem:()=>{writes++}};
 vm.runInNewContext(read("verse_games/shared/native-dev-tools-dock-n7e.js"),{window:win});
 return {value:win.BibloZooDevTools.forcePetEscapeEnabled(),
         changed:win.BibloZooDevTools.setForcePetEscape(true),writes};
}
const p=force(prod),d=force(test);
assert.equal(p.value,false);assert.equal(p.changed,false);assert.equal(p.writes,0);
assert.equal(d.value,true);
for(const f of [
"verse_games/shared/native-dev-tools-dock-n7e.js",
"verse_games/shared/native-sound-smoke-test.js",
"verse_games/shared/native-mic-session-probe-n7b.js",
"verse_games/shared/native-wacky-lab-n7e.js",
"verse_games/shared/native-read-cue-waveform-lab-n7f2.js",
"verse_games/shared/native-learn-narration-pilot.js",
"verse_games/shared/native-flashcards-capture-n7c.js",
"verse_games/shared/welcome-back-zoo-escape.js",
"daily_questions_feed_game.js"
])assert.match(read(f),/BibloZooNativeOnlyOutput\?\.devToolsAllowed/,"missing dev gate "+f);
const app=read("app.js");
for(const t of ["titleTodoBtn","titleZooStrip","titleLogoSecretWrap","settingsHeading",
'wrap.querySelector("#todoComingSoonCard")',"practiceTitle"]){
 assert.ok(app.includes("if (allowDevShortcuts()) bindLongPress("+t+", {"),"unguarded "+t);
}
assert.match(app,/DAILY_PET_QUESTIONS_DEBUG_LONG_PRESS === true && allowDevShortcuts\(\)/);
const swift=read("ios/App/App/SceneDelegate.swift");
assert.match(swift,/guard !devVariant \|\| self\.isDevBundle else/);
assert.match(swift,/guard let self = self, self\.isNativeAppBundle, self\.capturePrepared/);
if(fs.existsSync(path.join(root,"dist/index.html"))){
 const code=read("dist/verse_games/shared/native-only-ios-output.js");
 const id=JSON.parse(read("capacitor.config.json")).appId;
 assert.ok(code.includes('var packagedAppId = "'+id+'";'));
 assert.ok(!code.includes(token));
}
console.log("Step 3a PASS: packaged DEV identity, hidden native tools, stale force flag, shortcut gating, native capture path and platform isolation.");
