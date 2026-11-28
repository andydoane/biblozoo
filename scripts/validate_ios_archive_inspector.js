/* Synthetic archive acceptance/refusal checks; never starts Xcode or a device. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const assert=require("node:assert/strict"),tool=require("./inspect_ios_archive.js");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-archive-check-"));
const archive=path.join(tmp,"BibloZoo.xcarchive"),app=path.join(archive,"Products","Applications","App.app");
function put(name,content="fixture"){
  const file=path.join(app,name);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content);
  return file;
}
const portrait="UIInterfaceOrientationPortrait";
const ipadOrientations=[portrait,"UIInterfaceOrientationPortraitUpsideDown",
  "UIInterfaceOrientationLandscapeLeft","UIInterfaceOrientationLandscapeRight"];
function orientationArray(key,values){
  return "<key>"+key+"</key><array>"+values.map(value=>"<string>"+value+"</string>").join("")+"</array>";
}
function info(id,ipad=ipadOrientations,phone=[portrait],fullScreen=false){
  return '<?xml version="1.0"?><plist><dict>'+
    '<key>CFBundleIdentifier</key><string>'+id+'</string>'+
    '<key>CFBundleDisplayName</key><string>BibloZoo</string>'+
    '<key>NSMicrophoneUsageDescription</key><string>Recording</string>'+
    '<key>NSPhotoLibraryAddUsageDescription</key><string>Save Photos</string>'+
    orientationArray("UISupportedInterfaceOrientations",phone)+
    orientationArray("UISupportedInterfaceOrientations~ipad",ipad)+
    (fullScreen?'<key>UIRequiresFullScreen</key><true/>':'')+
    '</dict></plist>';
}
function privacy(reason="35F9.1"){
  return '<?xml version="1.0"?><plist><dict>'+
    '<key>NSPrivacyAccessedAPITypes</key><array>'+
    '<string>NSPrivacyAccessedAPICategorySystemBootTime</string>'+
    '<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>'+
    '<string>'+reason+'</string><string>3B52.1</string></array>'+
    '<key>NSPrivacyTracking</key><false/></dict></plist>';
}
try{
 // Use the same production orientation check for the tracked source and
 // for actual archive metadata (including Xcode-generated/overridden keys).
 tool.assertOrientationDeclarations(fs.readFileSync(path.join(__dirname,"../ios/App/App/Info.plist"),"utf8"));
 const plist=put("Info.plist",info("com.andydoane.biblozoo"));
 const manifest=put("PrivacyInfo.xcprivacy",privacy());
 for(const name of tool.rootMp3s)put(name);
 for(const name of tool.publicFiles)put(path.join("public",name));
 const guard=put("public/verse_games/shared/native-only-ios-output.js",
   'var packagedAppId = "com.andydoane.biblozoo";');
 put("public/index.html","<head><script data-biblozoo-native-only-output></script></head>");
 put("Frameworks/Capacitor.framework/PrivacyInfo.xcprivacy",privacy());
 const good=tool.inspectArchive(archive);
 assert.equal(good.bundleId,"com.andydoane.biblozoo");
 assert.deepEqual(good.sdkManifests,["Frameworks/Capacitor.framework/PrivacyInfo.xcprivacy"]);
 for(const invalid of [[portrait],ipadOrientations.slice(0,3),[...ipadOrientations,portrait]]){
   fs.writeFileSync(plist,info("com.andydoane.biblozoo",invalid));
   assert.throws(()=>tool.inspectArchive(archive),/iPad must declare all four orientations/);
 }
 fs.writeFileSync(plist,info("com.andydoane.biblozoo",ipadOrientations,[portrait,ipadOrientations[2]]));
 assert.throws(()=>tool.inspectArchive(archive),/iPhone orientation must remain portrait-only/);
 fs.writeFileSync(plist,info("com.andydoane.biblozoo",ipadOrientations,[portrait],true));
 assert.throws(()=>tool.inspectArchive(archive),/Do not opt out of iPad multitasking/);
 fs.writeFileSync(plist,info("com.andydoane.biblozoo",[...ipadOrientations].reverse()));
 assert.equal(tool.inspectArchive(archive).bundleId,"com.andydoane.biblozoo");
 fs.writeFileSync(plist,info("com.andydoane.biblozoo.audiotest"));
 assert.throws(()=>tool.inspectArchive(archive),/Wrong bundle identity/);
 fs.writeFileSync(plist,info("com.andydoane.biblozoo"));
 fs.rmSync(path.join(app,"ui_pet_unlock.mp3"));
 assert.throws(()=>tool.inspectArchive(archive),/Archive resources missing/);
 put("ui_pet_unlock.mp3");
 fs.writeFileSync(guard,'var packagedAppId = "__BIBLOZOO_PACKAGED_APP_ID__";');
 assert.throws(()=>tool.inspectArchive(archive),/not production identity/);
 fs.writeFileSync(guard,'var packagedAppId = "com.andydoane.biblozoo";');
 fs.writeFileSync(manifest,privacy("00.00"));
 assert.throws(()=>tool.inspectArchive(archive),/approved category\/reason/);
 console.log("Step 3e PASS: source and synthetic archive orientation contract (90474), ID, resources, guard and privacy reasons.");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
