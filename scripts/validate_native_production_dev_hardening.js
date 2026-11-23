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
// Execute the actual shared shortcut policy, not just a source-text regex.
// Release/native iOS must DENY hidden gesture entry points if the injected
// identity is missing, incomplete or not explicitly the Audio Test bundle.
const gateDefinition=app.match(/function allowDevShortcuts\(\) \{[\s\S]*?\n\}/);
assert.ok(gateDefinition,"shared shortcut gate missing");
function shortcutsAllowed(win){
 return vm.runInNewContext(gateDefinition[0]+"\nallowDevShortcuts()",{window:win});
}
assert.equal(shortcutsAllowed(prod),false,"production iOS shortcuts must be disabled");
assert.equal(shortcutsAllowed(test),true,"Audio Test keeps intentional owner tools");
assert.equal(shortcutsAllowed(make("com.andydoane.biblozoo","web")),true,
             "ordinary web/PWA behavior unchanged");
assert.equal(shortcutsAllowed(make("com.andydoane.biblozoo","android")),true,
             "Android behavior unchanged");
const noIdentity={
 Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios"},
 location:{protocol:"capacitor:"}
};
assert.equal(shortcutsAllowed(noIdentity),false,"missing native identity must fail closed");
assert.equal(shortcutsAllowed({...noIdentity,
 BibloZooNativeOnlyOutput:{devToolsAllowed:true}}),false,
 "a missing enabled marker cannot open dev tools");
assert.equal(shortcutsAllowed({...noIdentity,
 BibloZooNativeOnlyOutput:{enabled:true,devToolsAllowed:false}}),false,
 "explicit production identity denies shortcuts");
assert.equal(shortcutsAllowed({location:{protocol:"capacitor:"}}),false,
 "capacitor URL must fail closed even if the Capacitor bridge is unavailable");
// The visible Settings label must match the Xcode public app version,
// without an old developer codename or release-build number.
assert.match(app,/const APP_VERSION = "1\.0";/);
assert.match(app,/Version \$\{escapeHtml\(APP_VERSION\)\}/);
assert.match(app,/const DEBUG_MODE = false;/);
assert.match(app,/DAILY_PET_QUESTIONS_DEBUG: false/);
const project=read("ios/App/App.xcodeproj/project.pbxproj");
assert.equal(project.split("MARKETING_VERSION = 1.0;").length-1,2);
assert.equal(project.split("CURRENT_PROJECT_VERSION = 1;").length-1,2);
assert.equal(project.split("PRODUCT_BUNDLE_IDENTIFIER = com.andydoane.biblozoo;").length-1,2);
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
console.log("Step 3a PASS: packaged DEV identity, fail-closed production shortcuts, Audio Test isolation, Settings version 1.0, hidden native tools and platform safety.");
