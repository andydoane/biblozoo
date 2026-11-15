/* Step 3d: source and dist contract for iOS native audio packaging.
 * Does not claim an Apple SDK build, physical sound, or transitive SDK privacy.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const swift = read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const scene = read("ios/App/App/SceneDelegate.swift");
const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
const builder = read("scripts/build.js");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const spm = read("ios/App/CapApp-SPM/Package.swift");
const manifest = read("ios/App/App/PrivacyInfo.xcprivacy");
const version = "8.5.2";
let checked = 0;
const assets = new Set();
function checkFile(file) {
  assert.ok(!path.isAbsolute(file) && !file.includes(".."), "unsafe audio path: " + file);
  const full = path.join(root, file);
  assert.ok(fs.existsSync(full) && fs.statSync(full).isFile(), "missing source: " + file);
  assert.ok(fs.statSync(full).size > 0, "empty source: " + file);
  if (fs.existsSync(path.join(root, "dist/index.html"))) {
    const built = path.join(root, "dist", file);
    assert.ok(fs.existsSync(built) && fs.statSync(built).isFile(), "missing built Capacitor asset: " + file);
    assert.ok(fs.statSync(built).size > 0, "empty built Capacitor asset: " + file);
  }
  checked++;
  assets.add(file);
}
function entries(name) {
  const re = new RegExp("private let " + name + ": \\[String: String\\] = \\[([\\s\\S]*?)\\n\\s*\\]");
  const m = swift.match(re);
  assert.ok(m, "native fixed sound map missing: " + name);
  const list = [...m[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
  assert.ok(list.length, "native sound map empty: " + name);
  assert.equal(new Set(list.map(m=>m[1])).size,list.length,"duplicate sound ID in "+name);
  return list.map(x=>({id:x[1],name:x[2]}));
}
// Mirrors the static Swift lookup branches. Any new dictionary must be added
// here deliberately so a future audio activity cannot silently ship no MP3s.
const folders = {
  dailyQuestionSoundResources: "verse_images/daily_questions",
  snakeSoundResources: "verse_games/verse_snake/verse_snake_sounds",
  bibleBugsSoundResources: "verse_games/bible_bugs/bible_bugs_sounds",
  foodSliceSoundResources: "verse_games/foodslice/food_slice_sounds",
  verseSplatSoundResources: "verse_games/verse_splat/verse_splat_sounds",
  dinoDashSoundResources: "verse_games/dino_dash/dino_dash_sounds",
  verseInvadersSoundResources: "verse_games/verse_invaders/verse_invaders_sounds",
  verseMunchSoundResources: "verse_games/verse_munch/verse_munch_sounds",
  verseyBirdSoundResources: "verse_games/versey_bird/versey_bird_sounds",
  towerBibleSoundResources: "verse_games/tower_bible/tower_bible_sounds",
  verseLaunchSoundResources: "verse_games/verse_launch/verse_launch_sounds",
  trafficTapSoundResources: "verse_games/traffic_tap/traffic_tap_sounds",
  scrubSoundResources: "verse_playground/scripture_scrub/scripture_scrub_sounds",
  ghostWriterSoundResources: "verse_playground/ghost_writer/ghost_writer_sounds"
};
const staticMapNames=[...swift.matchAll(/private let (\w*SoundResources|soundResources): \[String: String\] = \[/g)].map(x=>x[1]).sort();
assert.deepEqual(staticMapNames,Object.keys(folders).concat("soundResources").sort(),
  "new or removed static Swift sound map needs an explicit source/bundle audit");
let mapped=0;
for(const [map,folder] of Object.entries(folders)){
  assert.ok(swift.includes('subdirectory: "public/'+folder+'"'),
    "Swift native output folder changed for "+map);
  for(const {name} of entries(map)){
    checkFile(folder+"/"+name+".mp3");
    mapped++;
  }
}
assert.equal(mapped,127,"update source-audit counts if assets intentionally change");
// These six are copied as *root* Xcode build-phase resources, not through the
// Capacitor public subdirectory. Five map to the original Swift sound IDs;
// John 3:16 remains an explicit narration reference.
const appRootSounds = {
  ui_pet_unlock: "ui_audio/ui_pet_unlock.mp3",
  dq_feed_star: "verse_images/daily_questions/dq_feed_star.mp3",
  dq_feed_chomp: "verse_images/daily_questions/dq_feed_chomp.mp3",
  ui_sound_pop_1: "ui_audio/ui_sound_pop_1.mp3",
  ui_sound_pop_2: "ui_audio/ui_sound_pop_2.mp3",
  john_3_16: "verse_audio/john_3_16.mp3"
};
const rootMap=entries("soundResources");
assert.equal(rootMap.length,5);
assert.deepEqual(new Set(rootMap.map(x=>x.name)),
  new Set(Object.keys(appRootSounds).filter(x=>x!=="john_3_16")));
assert.match(swift,/private let narrationResourceName = "john_3_16"/);
for(const [stem,file] of Object.entries(appRootSounds)){
  checkFile(file);
  const name=stem+".mp3";
  const matches=[...pbx.matchAll(new RegExp(name.replaceAll(".","\\.")+" in Resources \\*\\/","g"))];
  assert.equal(matches.length,2,name+" must have one PBXBuildFile and one Copy Bundle Resources entry");
  assert.ok(pbx.includes("path = ../../../"+file+";"),name+" Xcode source path drift");
}
// A true Xcode *folder* reference preserves public/verse_audio etc paths
// required by Bundle.main.url(... subdirectory: "public/...").
assert.match(pbx,/\/\* public \*\/ = \{isa = PBXFileReference; lastKnownFileType = folder; path = public;/);
assert.equal((pbx.match(/\/\* public in Resources \*\//g)||[]).length,2,
  "public folder should have one PBXBuildFile and one Resources phase entry");
assert.ok(builder.includes('"verse_audio"') && builder.includes('"verse_games"') &&
          builder.includes('"verse_playground"') && builder.includes('"verse_images"') &&
          builder.includes('"verse_data"') && builder.includes('"flashcards"'),
          "production builder must copy all native audio asset families");
assert.match(pbx,/PrivacyInfo\.xcprivacy in Resources/);
assert.match(manifest,/NSPrivacyAccessedAPICategorySystemBootTime/);
assert.match(manifest,/NSPrivacyAccessedAPICategoryFileTimestamp/);
// Generated Jam voice dictionary is fixed by five shipped, allowlisted words.
assert.match(swift,/jamVoices = \["boom","hey","woo","yeah","yo"\]/);
assert.match(swift,/"verse_jam_voice_" \+ \$0/);
for(const word of ["boom","hey","woo","yeah","yo"]){
  checkFile("verse_playground/verse_jam/verse_jam_sounds/verse_jam_voice_"+word+".mp3");
}
// Read's bounded fixed sources, numbered typewriter/keyboard samples and
// Flashcards/Learn/onboarding clips all reside in the public folder.
assert.match(scene,/private func bundledClip\(_ key: String\) -> URL\?/);
for(const file of [
  "ui_audio/ui_pet_unlock.mp3",
  "verse_images/read_my_verse/verse_crawl_theme_ducked.mp3",
  "verse_images/read_my_verse/verse_crawl_theme_ending.mp3",
  "verse_images/read_my_verse/typewriter_alert.mp3",
  "verse_images/read_my_verse/keyboard_alert.mp3",
  "verse_images/daily_questions/dq_incorrect.mp3"
]) checkFile(file);
for(let i=1;i<=3;i++)checkFile("verse_images/read_my_verse/typewriter_"+i+".mp3");
for(let i=1;i<=7;i++)checkFile("verse_images/read_my_verse/keyboard_"+i+".mp3");
assert.match(scene,/subdirectory: "public\/verse_images\/read_my_verse"/);
for(let i=1;i<=4;i++)checkFile("verse_audio/tutorial_page_"+i+".mp3");
for(const suffix of ["no_help","first_letter","pictures","record","listen"]){
  checkFile("flashcards/flashcard_instruction_"+suffix+".mp3");
}
for(const suffix of ["listen","meaning","chunks1","chunks2","echo1","echo_start","remove","final","games"]){
  checkFile("verse_audio/instructions_"+suffix+".mp3");
}
assert.ok(fs.existsSync(path.join(root,"verse_data/verse_list.json")));
checkFile("verse_data/verse_list.json");
assert.match(swift,/subdirectory: "public\/verse_data"/);
assert.match(swift,/subdirectory: "public\/verse_audio"/);
// This tests source/runtime file membership, not OS-level bundle resolution.
assert.ok(checked>=165 && assets.size>=160);
// Local Swift Package is Capacitor-managed; do not edit it to fix app privacy.
// npm ci locks JS packages; Xcode resolves transitive Swift products itself.
for(const name of ["core","ios","cli"]){
 const key="@capacitor/"+name;
 assert.equal(lock.packages["node_modules/"+key]?.version,version,
   key+" npm-lock resolved version must match Swift's pinned version");
 const dep=name==="cli"?pkg.devDependencies[key]:pkg.dependencies[key];
 assert.equal(dep,"^"+version,key+" package declaration changed");
}
assert.match(spm,/\.package\(url: "https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git", exact: "8\.5\.2"\)/);
assert.equal((spm.match(/\.package\(url:/g)||[]).length,1,
 "add new Swift packages to owner Mac privacy review before release");
assert.match(spm,/\.product\(name: "Capacitor", package: "capacitor-swift-pm"\)/);
assert.match(spm,/\.product\(name: "Cordova", package: "capacitor-swift-pm"\)/);
assert.match(pbx,/relativePath = "CapApp-SPM"/);
assert.match(pbx,/productName = "CapApp-SPM"/);
console.log("Step 3d PASS: "+mapped+" native mapped MP3 entries, "+assets.size+
  " distinct required assets (source"+(fs.existsSync(path.join(root,"dist/index.html"))?" and built dist":"")+
  "), root Xcode folder/resources, and Capacitor JS/Swift 8.5.2 package pins. "+
  "Real Xcode bundle and transitive privacy audit remain OPEN.");
