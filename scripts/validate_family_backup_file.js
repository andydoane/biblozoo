/* Step 3g: read-only OFFLINE structure check of a user-exported BibloZoo
 * Family Backup JSON. NEVER imports into app localStorage; no network/copy/write.
 * An accepted file is NOT proof of complete, restorable on-device state.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const FAMILY_SAVE_TYPE="biblozoo-family-save";
const FAMILY_SAVE_VERSION=3;
const MIN_FAMILY_SAVE_VERSION=2;
const zooBackup=require("../verse_games/shared/zoo-backup-state.js");
const PROGRESS_VERSION=2;
const MAX_BYTES=25*1024*1024;
function object(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function validate(save){
 assert.ok(object(save),"Backup must contain a JSON object");
 assert.equal(save.saveType,FAMILY_SAVE_TYPE,
   "Expected Export Family Backup, not an individual/legacy/different file");
 const version=Number(save.saveVersion);
 assert.ok(Number.isInteger(version)&&version>=MIN_FAMILY_SAVE_VERSION&&version<=FAMILY_SAVE_VERSION,
   "Unsupported Family Backup version (supported formats are 2 and 3)");
 assert.ok(typeof save.exportedAt==="string" &&
   Number.isFinite(Date.parse(save.exportedAt)),
   "Family Backup export timestamp missing or invalid");
 assert.ok(Array.isArray(save.profiles)&&save.profiles.length>0,
   "Family Backup has no Zookeeper profiles");
 let verseCount=0;
 const ids=new Set();
 for(let i=0;i<save.profiles.length;i++){
   const entry=save.profiles[i];
   const hint="Zookeeper entry "+(i+1); // Never print names or identifiers.
   assert.ok(object(entry),hint+" is missing or invalid");
   assert.ok(typeof entry.id==="string"&&entry.id.trim(),
     hint+" has no export profile identifier");
   assert.ok(!ids.has(entry.id),hint+" repeats a profile identifier");
   ids.add(entry.id);
   assert.ok(typeof entry.name==="string"&&entry.name.trim(),
     hint+" has no Zookeeper name");
   assert.ok(object(entry.progress)&&object(entry.progress.verses),
     hint+" has no valid verse-progress record");
   const version=Number(entry.progress.version||0);
   assert.ok(Number.isFinite(version) && version<=PROGRESS_VERSION,
     hint+" has an unsupported newer progress version");
   if(version>=3) zooBackup.normalize(entry.zoo);
   verseCount+=Object.keys(entry.progress.verses).length;
 }
 return {profiles:save.profiles.length,verseRecords:verseCount,version};
}
function fromFile(filepath){
 assert.ok(typeof filepath==="string"&&filepath.trim(),
   "Supply the path to a Family Backup .json file");
 const file=path.resolve(filepath);
 assert.equal(path.extname(file).toLowerCase(),".json",
   "Expected a .json Family Backup file");
 const st=fs.statSync(file);
 assert.ok(st.isFile()&&st.size>0&&st.size<=MAX_BYTES,
   "Family Backup file is empty, not a regular file, or unusually large (>25 MiB)");
 // Read only; do not echo raw JSON, names, photos, progress or filenames.
 let parsed;
 try{parsed=JSON.parse(fs.readFileSync(file,"utf8"));}
 catch(_){throw new Error("Family Backup is not readable JSON");}
 return {bytes:st.size,...validate(parsed)};
}
function main(){
 const result=fromFile(process.argv[2]);
 console.log("FAMILY BACKUP STRUCTURE PASS (read only, offline; NO IMPORT)");
 console.log("Family format v"+result.version+"; Zookeeper profiles: "+result.profiles+
   "; verse-progress records: "+result.verseRecords);
 console.log("JSON file size: "+result.bytes+" bytes; no profile names or data printed.");
 console.log("NOT VERIFIED: on-device restoration, all stored data, or app sandbox safety.");
 console.log("Keep the original app and a separately saved copy of this backup intact.");
}
if(require.main===module){
 try{main();}
 catch(e){console.error("BACKUP NOT VERIFIED: "+e.message);process.exitCode=1;}
}
module.exports={validate,fromFile};
