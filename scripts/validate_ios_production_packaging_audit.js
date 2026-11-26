/* Synthetic packaging audit tests; no real archive, profile or device. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const assert=require("node:assert/strict");
const tool=require("./audit_ios_production_packaging.js");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-package-test-"));
const source=path.join(tmp,"source"),built=path.join(tmp,"public");
function put(dir,rel,body){
  const file=path.join(dir,rel);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,body);
  return file;
}
try{
  put(built,"index.html","home");
  for(const [i,rel] of tool.requiredNotices.entries()){
    put(source,rel,"notice "+i);
    put(built,rel,"notice "+i);
  }
  const alias=tool.licenseDisplayPath;
  const license=fs.readFileSync(path.join(source,tool.licenseOriginal),"utf8");
  put(built,alias,license);
  put(built,"verse_audio/testverse_1_1.mp3","sound");
  put(built,"ui_audio/other.mp3","sound");
  const good=tool.inspectPublic(built,source);
  assert.equal(good.files,8);
  assert.equal(good.bytes,4+5*8+5+5);
  assert.equal(good.notices.length,4);
  assert.equal(good.duplicateGroups,2);
  assert.equal(good.duplicateBytes,13);
  assert.equal(good.review.length,1);
  assert.equal(good.reviewBytes,5);
  assert.equal(good.groups.reduce((sum,g)=>sum+g.bytes,0),good.bytes);
  for(const name of ["desktop.ini",".DS_Store","DESKTOP.INI"]){
    const metadata=put(built,"pet_images/"+name,"metadata");
    assert.throws(()=>tool.inspectPublic(built,source),/Unexpected desktop metadata/);
    fs.unlinkSync(metadata);
  }
  // Source-side release materials are allowed; their presence in public is not.
  put(source,"docs/app_store_screenshots/iphone_screenshot_01.png","synthetic screenshot");
  assert.deepEqual(tool.inspectPublic(built,source),good);
  for(const rel of ["docs/app_store_screenshots/iphone_screenshot_01.png","DOCS/readme.md","utilities/app_store_screenshots/ipad_screenshot_01.png","APP_STORE_SCREENSHOTS/image.png"]){
    put(built,rel,"synthetic screenshot");
    assert.throws(()=>tool.inspectPublic(built,source),/Unexpected release documentation or screenshot backup/);
    const dir=rel.startsWith("utilities/")?"utilities/app_store_screenshots":rel.split("/")[0];
    fs.rmSync(path.join(built,dir),{recursive:true,force:true});
    if(rel.startsWith("utilities/")&&fs.readdirSync(path.join(built,"utilities")).length===0)fs.rmdirSync(path.join(built,"utilities"));
  }
  assert.deepEqual(tool.inspectPublic(built,source),good);
  fs.rmSync(path.join(built,alias));
  assert.throws(()=>tool.inspectPublic(built,source),/Missing or empty packaged license display alias/);
  put(built,alias,"");
  assert.throws(()=>tool.inspectPublic(built,source),/Missing or empty packaged license display alias/);
  put(built,alias,"wrong license");
  assert.throws(()=>tool.inspectPublic(built,source),/alias differs from source/);
  put(built,alias,license);
  const notice=tool.requiredNotices[0];
  fs.rmSync(path.join(built,notice));
  assert.throws(()=>tool.inspectPublic(built,source),/Missing or empty packaged notice/);
  put(built,notice,"");
  assert.throws(()=>tool.inspectPublic(built,source),/Missing or empty packaged notice/);
  put(built,notice,"different");
  assert.throws(()=>tool.inspectPublic(built,source),/differs from source/);
  put(built,notice,"notice 0");
  const link=path.join(built,"unexpected-link");
  fs.symlinkSync(path.join(built,"index.html"),link);
  assert.throws(()=>tool.inspectPublic(built,source),/Unexpected symbolic link/);
  fs.unlinkSync(link);
  fs.rmSync(path.join(built,"index.html"));
  assert.throws(()=>tool.inspectPublic(built,source),/Missing or empty index/);
  put(built,"index.html","home");
  assert.doesNotThrow(()=>tool.requireSdkManifests(tool.expectedSdkManifests));
  for(const manifest of tool.expectedSdkManifests)
    assert.throws(()=>tool.requireSdkManifests(tool.expectedSdkManifests.filter(x=>x!==manifest)),/SDK privacy manifest missing/);
  assert.deepEqual(tool.inspectPublic(built,source),good);
  console.log("Production packaging audit PASS: synthetic inventory, exact notice bytes, duplicate/candidate reporting, missing/empty/modified notices, release-material and symlink refusal, SDK manifest presence.");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
