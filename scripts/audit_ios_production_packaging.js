/* Read-only production packaging audit. Never builds, signs, installs or deletes.
 * Use --dist after npm run build, or --archive with an explicit fresh archive.
 * Inventory findings are not proof of unused assets, rights or SDK behavior.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const assert=require("node:assert/strict");
const archiveTool=require("./inspect_ios_archive.js");
const root=path.resolve(__dirname,"..");
const requiredNotices=[
  "verse_fonts/THIRD-PARTY-FONT-LICENSES.txt",
  "utilities/THIRD-PARTY-SOFTWARE-NOTICES.txt",
  "flashcards/vendor/soundtouchjs-2.1.1/LICENSE",
  "flashcards/vendor/soundtouchjs-2.1.1/SOURCE.md"
];
const expectedSdkManifests=[
  "Frameworks/Capacitor.framework/PrivacyInfo.xcprivacy",
  "Frameworks/Cordova.framework/PrivacyInfo.xcprivacy"
];
// Review only: names are leads, not proof of runtime reachability or disuse.
const reviewPaths=new Set([
  "verse_audio/biblozoo_jingle.mp3",
  "pet_images/pet_1_testverse_1_2_3.png",
  "verse_audio/testverse_1_1.mp3",
  "verse_audio/testverse_1_1_ref.mp3",
  "verse_audio/testverse_1_1a.mp3",
  "verse_games/shared/audio-diagnostics.js",
  "verse_games/shared/native-sound-smoke-test.js",
  "utilities/pet-animation-tester.html",
  "utilities/sound-tester.html",
  "verse_games/verse_munch/tester.html",
  "verse_playground/scripture_scrub/scripture_scrub_images/scripture_scrub_grass_bg_2_old.jpg"
]);
function inspectPublic(dir,sourceRoot=root){
  assert.ok(fs.lstatSync(dir).isDirectory(),"Expected actual public directory");
  const files=[];
  function walk(folder,relative=""){
    for(const item of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const full=path.join(folder,item.name);
      const rel=relative?relative+"/"+item.name:item.name;
      assert.ok(!item.isSymbolicLink(),"Unexpected symbolic link in public: "+rel);
      if(item.isDirectory())walk(full,rel);
      else {
        assert.ok(item.isFile(),"Unexpected non-file entry in public: "+rel);
        files.push({path:rel,bytes:fs.statSync(full).size});
      }
    }
  }
  walk(dir);
  const membership=new Map(files.map(f=>[f.path,f]));
  assert.ok(membership.get("index.html")?.bytes>0,"Missing or empty index.html");
  for(const rel of requiredNotices){
    assert.ok(membership.get(rel)?.bytes>0,"Missing or empty packaged notice: "+rel);
    const actual=fs.readFileSync(path.join(dir,rel));
    const expected=fs.readFileSync(path.join(sourceRoot,rel));
    assert.ok(expected.length>0&&actual.equals(expected),"Packaged notice differs from source: "+rel);
  }
  const groups=new Map(),hashes=new Map();
  for(const file of files){
    const key=file.path.includes("/")?file.path.split("/")[0]:"(root)";
    const g=groups.get(key)||{folder:key,files:0,bytes:0};
    g.files++;g.bytes+=file.bytes;groups.set(key,g);
    // Identical payloads can still have intentional distinct runtime paths.
    const hash=crypto.createHash("sha256").update(fs.readFileSync(path.join(dir,file.path))).digest("hex");
    const h=hashes.get(hash)||{count:0,bytes:file.bytes};
    h.count++;hashes.set(hash,h);
  }
  const duplicateGroups=[...hashes.values()].filter(h=>h.count>1);
  const review=files.filter(f=>reviewPaths.has(f.path)||/(^|\/)(desktop\.ini|\.DS_Store)$/i.test(f.path));
  return {
    files:files.length,bytes:files.reduce((sum,f)=>sum+f.bytes,0),
    notices:requiredNotices.slice(),groups:[...groups.values()].sort((a,b)=>b.bytes-a.bytes),
    duplicateGroups:duplicateGroups.length,
    duplicateBytes:duplicateGroups.reduce((sum,h)=>sum+(h.count-1)*h.bytes,0),
    review,reviewBytes:review.reduce((sum,f)=>sum+f.bytes,0)
  };
}
function requireSdkManifests(found){
  for(const name of expectedSdkManifests)
    assert.ok(found.includes(name),"Expected archived SDK privacy manifest missing: "+name);
}
function inspectPackagingArchive(archive){
  // Reuse original production identity, audio and first-party manifest checks.
  const base=archiveTool.inspectArchive(archive);
  requireSdkManifests(base.sdkManifests);
  const apps=path.join(archive,"Products","Applications");
  const names=fs.readdirSync(apps,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.endsWith(".app"));
  assert.equal(names.length,1,"Expected exactly one archived app directory");
  return {base,inventory:inspectPublic(path.join(apps,names[0].name,"public"))};
}
function printInventory(i){
  console.log("Public payload: "+i.files+" files, "+i.bytes+" bytes (uncompressed)");
  console.log("Packaged notices byte-match source: "+i.notices.length);
  for(const rel of i.notices)console.log("  "+rel);
  console.log("Public folder breakdown:");
  for(const g of i.groups)console.log("  "+g.folder+": "+g.files+" files, "+g.bytes+" bytes");
  console.log("Exact duplicate payload groups: "+i.duplicateGroups+"; additional bytes: "+i.duplicateBytes);
  console.log("Review-only candidate assets: "+i.review.length+" files, "+i.reviewBytes+" bytes");
  for(const f of i.review)console.log("  "+f.path+" ("+f.bytes+" bytes)");
  console.log("Do not remove candidates or duplicate paths without dependency and owner review.");
  console.log("NOT PROVEN: notice accessibility/adequacy, asset rights, runtime use, privacy compliance or App Store download size.");
}
function main(args=process.argv.slice(2)){
  if(args.length===1&&args[0]==="--dist"){
    const i=inspectPublic(path.join(root,"dist"));
    console.log("DIST PACKAGING CHECK PASS (not a native archive)");
    printInventory(i);
  }else if(args.length===2&&args[0]==="--archive"){
    const {base,inventory}=inspectPackagingArchive(path.resolve(args[1]));
    console.log("ARCHIVE PACKAGING CHECK PASS (read-only, no install/upload)");
    console.log("Archive: "+base.archiveName+"; bundle: "+base.bundleId);
    console.log("Other privacy manifests: "+base.sdkManifests.join(", "));
    printInventory(inventory);
  }else throw Error("Usage: node scripts/audit_ios_production_packaging.js --dist | --archive <explicit .xcarchive>");
}
if(require.main===module){
  try{main();}catch(e){console.error("PACKAGING AUDIT NOT ACCEPTED: "+e.message);process.exitCode=1;}
}
module.exports={inspectPublic,requireSdkManifests,requiredNotices,expectedSdkManifests};
