/* Step 3b source contract: first-party required-reason API declarations.
 * This does NOT inspect linked Capacitor SDK manifests or signed app privacy.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const xml=read("ios/App/App/PrivacyInfo.xcprivacy");
const swift=read("ios/App/App/SceneDelegate.swift");
const sound=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const project=read("ios/App/App.xcodeproj/project.pbxproj");
const info=read("ios/App/App/Info.plist");
const audit=read("docs/IOS-PRODUCTION-PRIVACY-AUDIT.md");
assert.match(xml,/^\s*<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(xml,/<plist version="1\.0">[\s\S]*<\/plist>/);
assert.match(xml,/<key>NSPrivacyAccessedAPITypes<\/key>\s*<array>([\s\S]*?)<\/array>\s*<key>NSPrivacyCollectedDataTypes<\/key>/);
const accessed=xml.match(/<key>NSPrivacyAccessedAPITypes<\/key>\s*<array>([\s\S]*?)<\/array>\s*<key>NSPrivacyCollectedDataTypes<\/key>/)[1];
for(const [category,reason] of [
["SystemBootTime","35F9.1"],["FileTimestamp","3B52.1"]
]){
 const dict=new RegExp("<dict>\\s*<key>NSPrivacyAccessedAPIType<\\/key>\\s*"+
   "<string>NSPrivacyAccessedAPICategory"+category+"<\\/string>\\s*"+
   "<key>NSPrivacyAccessedAPITypeReasons<\\/key>\\s*<array>\\s*"+
   "<string>"+reason.replace(".","\\.")+"<\\/string>\\s*<\\/array>\\s*<\\/dict>");
 assert.match(accessed,dict,"approved reason missing: "+category);
 assert.equal(accessed.split("NSPrivacyAccessedAPICategory"+category).length-1,1,
   "duplicate declaration: "+category);
}
assert.match(xml,/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\s*\/>/);
assert.match(xml,/<key>NSPrivacyTrackingDomains<\/key>\s*<array\s*\/>/);
assert.match(xml,/<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/);
assert.match(project,/PrivacyInfo\.xcprivacy in Resources/);
assert.match(project,/PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference/);
assert.match(swift,/ProcessInfo\.processInfo\.systemUptime/);
assert.match(sound,/ProcessInfo\.processInfo\.systemUptime/);
assert.match(sound,/mach_absolute_time\(\)/);
assert.match(swift,/FileManager\.default\.attributesOfItem\(atPath: url\.path\)/);
assert.match(swift,/attributes\[\.size\]/);
assert.match(info,/<key>NSMicrophoneUsageDescription<\/key>\s*<string>[^<]+<\/string>/);
assert.match(info,/<key>NSPhotoLibraryAddUsageDescription<\/key>\s*<string>[^<]+<\/string>/);
assert.match(info,/Recordings are not saved or uploaded\./);
assert.match(audit,/Xcode.*Privacy Report/i);
assert.match(audit,/NOT tested/);
console.log("Step 3b PASS: first-party iOS SystemBootTime and user-picked file metadata reasons, permission strings and bundled manifest membership. SDK/Xcode/privacy hardware audit remains OPEN.");
