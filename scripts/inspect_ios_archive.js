/* Step 3e: READ-ONLY iOS archive inspection. No device install or upload.
 * Use after Product > Archive with generic iOS destination in Xcode.
 * Source-to-archive checks do not replace the Xcode privacy report or hardware.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const cp=require("node:child_process"),assert=require("node:assert/strict");
const expectedId="com.andydoane.biblozoo";
const rootMp3s=["ui_pet_unlock.mp3","dq_feed_star.mp3","dq_feed_chomp.mp3",
  "ui_sound_pop_1.mp3","ui_sound_pop_2.mp3","john_3_16.mp3"];
const publicFiles=["index.html","verse_games/shared/native-only-ios-output.js",
  "verse_data/verse_list.json","verse_audio/tutorial_page_1.mp3",
  "verse_audio/instructions_listen.mp3",
  "flashcards/flashcard_instruction_record.mp3",
  "verse_images/read_my_verse/verse_crawl_theme_ducked.mp3",
  "verse_games/bible_bugs/bible_bugs_sounds/bible_bugs_correct.mp3",
  "verse_playground/ghost_writer/ghost_writer_sounds/ghost_writer_spooky_1.mp3",
  "verse_playground/verse_jam/verse_jam_sounds/verse_jam_voice_boom.mp3"];
const isFile=p=>{try{return fs.statSync(p).isFile();}catch(_){return false;}};
const isDir=p=>{try{return fs.statSync(p).isDirectory();}catch(_){return false;}};
function plistXml(file){
  const data=fs.readFileSync(file);
  return data.subarray(0,6).toString("utf8")==="bplist" ?
    cp.execFileSync("plutil",["-convert","xml1","-o","-",file],
      {encoding:"utf8",maxBuffer:1024*1024}) : data.toString("utf8");
}
function plistString(xml,key){
  const m=xml.match(new RegExp("<key>\\s*"+key+"\\s*</key>\\s*<string>([^<]+)</string>"));
  return m?m[1]:null;
}
function appForArchive(dir){
  assert.ok(dir.endsWith(".xcarchive")&&isDir(dir),"Select an existing .xcarchive");
  const apps=path.join(dir,"Products","Applications");
  assert.ok(isDir(apps),"Missing archive Products/Applications");
  const names=fs.readdirSync(apps).filter(n=>n.endsWith(".app")&&isDir(path.join(apps,n)));
  assert.equal(names.length,1,"Expected exactly one archived .app");
  return path.join(apps,names[0]);
}
function inspectArchive(archive){
  const app=appForArchive(archive);
  const info=plistXml(path.join(app,"Info.plist"));
  assert.equal(plistString(info,"CFBundleIdentifier"),expectedId,
    "Wrong bundle identity: expected the original production BibloZoo app");
  assert.equal(plistString(info,"CFBundleDisplayName"),"BibloZoo",
    "Original BibloZoo home-screen name must be retained");
  for(const key of ["NSMicrophoneUsageDescription","NSPhotoLibraryAddUsageDescription"])
    assert.ok(plistString(info,key),"Missing iOS permission purpose: "+key);
  const manifest=path.join(app,"PrivacyInfo.xcprivacy");
  assert.ok(isFile(manifest),"First-party privacy manifest missing at app bundle root");
  const xml=plistXml(manifest);
  for(const item of ["NSPrivacyAccessedAPICategorySystemBootTime",
    "NSPrivacyAccessedAPICategoryFileTimestamp","35F9.1","3B52.1"])
    assert.ok(xml.includes(item),"Privacy manifest missing approved category/reason: "+item);
  assert.match(xml,/<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/);
  const missing=[];
  for(const rel of rootMp3s.concat(publicFiles.map(n=>path.join("public",n)))){
    const f=path.join(app,rel);
    if(!isFile(f)||fs.statSync(f).size===0)missing.push(rel);
  }
  assert.deepEqual(missing,[],"Archive resources missing or empty");
  const guard=fs.readFileSync(path.join(app,"public","verse_games","shared",
    "native-only-ios-output.js"),"utf8");
  assert.ok(guard.includes('var packagedAppId = "com.andydoane.biblozoo";'),
    "Packaged audio guard is not production identity");
  assert.ok(!guard.includes("__BIBLOZOO_PACKAGED_APP_ID__"),
    "Unsubstituted native app identity marker");
  const html=fs.readFileSync(path.join(app,"public","index.html"),"utf8");
  assert.ok(html.includes("data-biblozoo-native-only-output"),
    "Built Home page lacks early native-only audio guard");
  const sdkManifests=[];
  function visit(dir,depth){
    if(depth>12||!isDir(dir))return;
    for(const name of fs.readdirSync(dir)){
      const file=path.join(dir,name);
      if(name==="PrivacyInfo.xcprivacy"&&isFile(file)){
        sdkManifests.push(path.relative(app,file));
      }else if(isDir(file)&&!name.startsWith(".")){
        visit(file,depth+1);
      }
    }
  }
  for(const dir of ["Frameworks","PlugIns","Watch"])visit(path.join(app,dir),0);
  return {archiveName:path.basename(archive),
    archiveUpdated:fs.statSync(archive).mtime.toISOString(),
    bundleId:expectedId,assetCount:rootMp3s.length+publicFiles.length,
    sdkManifests:sdkManifests.sort()};
}
function latestArchives(home){
  const folder=path.join(home,"Library","Developer","Xcode","Archives"),out=[];
  if(!isDir(folder))return out;
  for(const day of fs.readdirSync(folder)){
    const daily=path.join(folder,day);
    if(!isDir(daily))continue;
    for(const name of fs.readdirSync(daily)){
      if(!name.endsWith(".xcarchive"))continue;
      const archive=path.join(daily,name);
      if(!isDir(archive))continue;
      try{
        const info=plistXml(path.join(appForArchive(archive),"Info.plist"));
        if(plistString(info,"CFBundleIdentifier")===expectedId)
          out.push({archive,date:fs.statSync(archive).mtimeMs});
      }catch(_){/* Ignore malformed/other-app archives. */}
    }
  }
  return out.sort((a,b)=>b.date-a.date);
}
function main(){
  const explicit=process.argv[2];
  const found=explicit?[{archive:path.resolve(explicit)}]:latestArchives(os.homedir());
  assert.ok(found.length,"No production BibloZoo Xcode archive. Create one first; don't Run the original iPhone app.");
  if(!explicit){
    assert.ok(Date.now()-found[0].date < 48*3600000,
      "Newest matching archive is older than 48 hours. Create a new generic-device archive.");
  }
  const report=inspectArchive(found[0].archive);
  console.log("ARCHIVE SOURCE CHECK PASS (read-only; NO device installation)");
  console.log("Archive: "+report.archiveName+"; last updated: "+report.archiveUpdated);
  console.log("Bundle: "+report.bundleId+"; sampled web/audio resources: "+report.assetCount);
  console.log("Other bundled privacy manifests found: "+report.sdkManifests.length);
  for(const f of report.sdkManifests)console.log("  "+f);
  console.log("STILL OPEN: Xcode Generate Privacy Report, third-party SDK audit, device/backup testing.");
}
if(require.main===module){
  try{main();}catch(e){console.error("ARCHIVE AUDIT NOT ACCEPTED: "+e.message);process.exitCode=1;}
}
module.exports={inspectArchive,latestArchives,rootMp3s,publicFiles};
