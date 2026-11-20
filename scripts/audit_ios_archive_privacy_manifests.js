/* Step 3f: READ ONLY, no installation/network. Summarize privacy declarations
 * actually embedded in the owner's archived production-ID iOS .app.
 * An empty generated Apple Privacy Report does NOT certify API compliance.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const cp=require("node:child_process"),assert=require("node:assert/strict");
const archiveTool=require("./inspect_ios_archive.js");
function toXml(file){
 const data=fs.readFileSync(file);
 if(data.subarray(0,6).toString("utf8")==="bplist"){
   // macOS plutil reads the binary manifest and writes XML to STDOUT only.
   return cp.execFileSync("plutil",["-convert","xml1","-o","-",file],
      {encoding:"utf8",maxBuffer:4*1024*1024});
 }
 return data.toString("utf8");
}
function unique(xs){return [...new Set(xs)].sort();}
function valueAfterKey(xml,key){
 const marker=new RegExp("<key>\\s*"+key+"\\s*<\\/key>","g");
 const match=marker.exec(xml);
 return match ? xml.slice(match.index+match[0].length) : null;
}
function readStringArray(xml,key){
 const text=valueAfterKey(xml,key);
 if(text===null)return null;
 const empty=text.match(/^\s*<array\s*\/>/);
 if(empty)return [];
 const open=text.match(/^\s*<array>/);
 assert.ok(open,"Unsupported manifest array format for "+key);
 const end=text.indexOf("</array>",open[0].length);
 assert.ok(end>=0,"Unclosed manifest array for "+key);
 return [...text.slice(open[0].length,end).matchAll(/<string>([^<]*)<\/string>/g)].map(x=>x[1]);
}
function parseManifest(file){
 const xml=toXml(file);
 assert.match(xml,/<plist(?:\s|>)/,"Not a plist: "+file);
 const tracked=valueAfterKey(xml,"NSPrivacyTracking");
 const t=tracked?.match(/^\s*<(true|false)\s*\/>/);
 const tracking=t?t[1]==="true":null;
 const domainList=readStringArray(xml,"NSPrivacyTrackingDomains");
 // For data collection/accessed APIs, the outer arrays contain nested dicts
 // and arrays. Match the exact *dictionary value* keys instead of attempting
 // to truncate nested XML at the first </array>.
 const types=unique([...xml.matchAll(/<key>\s*NSPrivacyCollectedDataType\s*<\/key>\s*<string>([^<]+)<\/string>/g)].map(x=>x[1]));
 const apiTypes=unique([...xml.matchAll(/<key>\s*NSPrivacyAccessedAPIType\s*<\/key>\s*<string>([^<]+)<\/string>/g)].map(x=>x[1]));
 const reasons=unique([...xml.matchAll(/<key>\s*NSPrivacyAccessedAPITypeReasons\s*<\/key>\s*<array>([\s\S]*?)<\/array>/g)]
   .flatMap(x=>[...x[1].matchAll(/<string>([^<]+)<\/string>/g)].map(y=>y[1])));
 const hasCollectedKey=valueAfterKey(xml,"NSPrivacyCollectedDataTypes")!==null;
 const hasApiKey=valueAfterKey(xml,"NSPrivacyAccessedAPITypes")!==null;
 return {tracking,trackingDomains:domainList,collectedDataTypes:types,
   accessedApiCategories:apiTypes,accessedApiReasons:reasons,
   hasCollectedKey,hasApiKey};
}
function inspection(archive){
 // The original auditor refuses a wrong ID, missing audio/guard or invalid
 // app-root first-party privacy reasons before we read any SDK declarations.
 const base=archiveTool.inspectArchive(archive);
 const appFolder=path.join(archive,"Products","Applications");
 const apps=fs.readdirSync(appFolder).filter(n=>n.endsWith(".app"));
 assert.equal(apps.length,1,"Ambiguous .app in archive");
 const app=path.join(appFolder,apps[0]);
 const names=["PrivacyInfo.xcprivacy",...base.sdkManifests];
 const files=names.map(name=>({name,details:parseManifest(path.join(app,name))}));
 return {base,files};
}
function chooseArchive(arg){
 if(arg)return path.resolve(arg);
 const list=archiveTool.latestArchives(os.homedir());
 assert.ok(list.length,"No original-ID BibloZoo archive; run generic-device Xcode Archive first");
 assert.ok(Date.now()-list[0].date<48*3600000,
   "Latest production BibloZoo archive is older than 48 hours; use a recent one");
 return list[0].archive;
}
function main(){
 const report=inspection(chooseArchive(process.argv[2]));
 console.log("READ-ONLY APP + SDK PRIVACY MANIFEST DECLARATIONS");
 console.log("Archive: "+report.base.archiveName+" | bundle: "+report.base.bundleId);
 for(const {name,details:d} of report.files){
   console.log("\n"+name);
   console.log("  Tracking flag: "+(d.tracking===null?"NOT DECLARED":String(d.tracking)));
   console.log("  Tracking domains: "+(d.trackingDomains===null?"NOT DECLARED":d.trackingDomains.length?d.trackingDomains.join(", "):"none declared"));
   console.log("  Collected data types: "+(d.collectedDataTypes.length?d.collectedDataTypes.join(", "):"none declared"));
   console.log("  Required-reason categories: "+(d.accessedApiCategories.length?d.accessedApiCategories.join(", "):"none declared"));
   console.log("  Required-reason codes: "+(d.accessedApiReasons.length?d.accessedApiReasons.join(", "):"none declared"));
   if(!d.hasCollectedKey||!d.hasApiKey||d.tracking===null||d.trackingDomains===null)
     console.log("  REVIEW: one or more manifest keys are not declared; validate against Apple requirements.");
   if(d.tracking||d.collectedDataTypes.length||(d.trackingDomains?.length??0)>0)
     console.log("  REVIEW: collected data or tracking declarations need owner privacy-policy/App Store alignment.");
 }
 console.log("\nThe entries above are BUNDLED MANIFEST DECLARATIONS ONLY.");
 console.log("Blank Apple privacy PDF can be consistent with no declared collection/tracking.");
 console.log("Still OPEN: actual SDK API use, Apple requirements, original profile backup and real iPhone tests.");
}
if(require.main===module){
 try{main();}catch(e){console.error("PRIVACY MANIFEST REVIEW NOT ACCEPTED: "+e.message);process.exitCode=1;}
}
module.exports={parseManifest,inspection};
