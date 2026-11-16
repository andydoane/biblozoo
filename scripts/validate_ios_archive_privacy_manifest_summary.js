/* Synthetic-only tests: no app install, no Xcode, no network. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const assert=require("node:assert/strict");
const {parseManifest}=require("./audit_ios_archive_privacy_manifests.js");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-plist-review-"));
function save(name,xml){const file=path.join(root,name);fs.writeFileSync(file,xml);return file;}
const empty='<?xml version="1.0"?><plist version="1.0"><dict>'+
  '<key>NSPrivacyTracking</key><false/>'+
  '<key>NSPrivacyTrackingDomains</key><array/>'+
  '<key>NSPrivacyCollectedDataTypes</key><array/>'+
  '<key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>';
const withReasons='<?xml version="1.0"?><plist version="1.0"><dict>'+
  '<key>NSPrivacyTracking</key><false/>'+
  '<key>NSPrivacyTrackingDomains</key><array/>'+
  '<key>NSPrivacyCollectedDataTypes</key><array/>'+
  '<key>NSPrivacyAccessedAPITypes</key><array><dict>'+
  '<key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategorySystemBootTime</string>'+
  '<key>NSPrivacyAccessedAPITypeReasons</key><array><string>35F9.1</string></array>'+
  '</dict><dict>'+
  '<key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string>'+
  '<key>NSPrivacyAccessedAPITypeReasons</key><array><string>3B52.1</string></array>'+
  '</dict></array></dict></plist>';
const collected='<?xml version="1.0"?><plist version="1.0"><dict>'+
  '<key>NSPrivacyTracking</key><true/>'+
  '<key>NSPrivacyTrackingDomains</key><array><string>tracker.test</string></array>'+
  '<key>NSPrivacyCollectedDataTypes</key><array><dict>'+
  '<key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeEmailAddress</string>'+
  '<key>NSPrivacyCollectedDataTypePurposes</key><array>'+
  '<string>NSPrivacyCollectedDataTypePurposeAnalytics</string></array>'+
  '</dict></array><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>';
try{
 const a=parseManifest(save("empty.xml",empty));
 assert.equal(a.tracking,false);
 assert.deepEqual(a.trackingDomains,[]);
 assert.deepEqual(a.collectedDataTypes,[]);
 assert.deepEqual(a.accessedApiCategories,[]);
 assert.equal(a.hasCollectedKey,true);
 const b=parseManifest(save("reasons.xml",withReasons));
 assert.deepEqual(b.accessedApiCategories,[
   "NSPrivacyAccessedAPICategoryFileTimestamp","NSPrivacyAccessedAPICategorySystemBootTime"]);
 assert.deepEqual(b.accessedApiReasons,["35F9.1","3B52.1"]);
 assert.deepEqual(b.collectedDataTypes,[]);
 const c=parseManifest(save("collected.xml",collected));
 assert.equal(c.tracking,true);
 assert.deepEqual(c.trackingDomains,["tracker.test"]);
 assert.deepEqual(c.collectedDataTypes,["NSPrivacyCollectedDataTypeEmailAddress"]);
 const d=parseManifest(save("partial.xml","<?xml version=\"1.0\"?><plist><dict></dict></plist>"));
 assert.equal(d.tracking,null);
 assert.equal(d.trackingDomains,null);
 assert.equal(d.hasCollectedKey,false);
 assert.throws(()=>parseManifest(save("broken.xml","not XML")),/Not a plist/);
 console.log("Step 3f PASS: actual-manifest parser tests no collection, required reason APIs, nested collection arrays, tracking, missing keys and invalid input.");
}finally{fs.rmSync(root,{recursive:true,force:true});}
