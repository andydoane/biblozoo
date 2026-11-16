/* Pure fixtures; no access to user data, real files or app storage. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const path=require("node:path"),os=require("node:os");
const child=require("node:child_process"),tool=require("./validate_family_backup_file.js");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-family-save-fixture-"));
const f=path.join(temp,"family.json");
const sample={
  app:"Verse Memory / BibloPet Zoo",
  saveType:"biblozoo-family-save",saveVersion:2,
  exportedAt:"2026-11-15T23:59:00.000Z",
  profiles:[
    {id:"profile_one",name:"Private Child Name",avatarVerseId:"john_3_16",
      progress:{version:2,verses:{john_3_16:{learnCompleted:true}}}},
    {id:"profile_two",name:"Other Private Name",
      progress:{version:2,verses:{}}}
  ]
};
function checkFails(obj,part){
 assert.throws(()=>tool.validate(obj),new RegExp(part));
}
try{
 const original=JSON.stringify(sample);
 fs.writeFileSync(f,original);
 assert.deepEqual(tool.validate(sample),{profiles:2,verseRecords:1,version:2});
 assert.equal(tool.fromFile(f).bytes,Buffer.byteLength(original));
 const run=child.spawnSync(process.execPath,[path.join(__dirname,"validate_family_backup_file.js"),f],
   {encoding:"utf8"});
 assert.equal(run.status,0,run.stderr);
 assert.match(run.stdout,/FAMILY BACKUP STRUCTURE PASS/);
 assert.ok(!run.stdout.includes("Private Child Name"));
 assert.ok(!run.stdout.includes("profile_one"));
 assert.equal(fs.readFileSync(f,"utf8"),original,"checker must never write to the backup");
 checkFails({...sample,saveType:"biblozoo-profile-save"},"Expected Export Family Backup");
 checkFails({...sample,saveVersion:3},"Unsupported Family Backup");
 checkFails({...sample,profiles:[]},"no Zookeeper profiles");
 checkFails({...sample,profiles:[{...sample.profiles[0],name:""}]},"no Zookeeper name");
 checkFails({...sample,profiles:[{...sample.profiles[0],progress:{version:2}}]},"verse-progress");
 checkFails({...sample,profiles:[sample.profiles[0],{...sample.profiles[0]}]},"repeats");
 checkFails({...sample,profiles:[{...sample.profiles[0],progress:{version:99,verses:{}}}]},"newer");
 fs.writeFileSync(f,"not json");
 assert.throws(()=>tool.fromFile(f),/not readable JSON/);
 console.log("Step 3g PASS: private read-only family backup schema, legacy/wrong versions, empty/duplicate/bad progress and no data logging.");
}finally{fs.rmSync(temp,{recursive:true,force:true});}
