/* Scoped release polish regression: actual helper and copy predicate, fake DOM only. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),vm=require("node:vm");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const build=read("scripts/build.js");
const predicate=build.slice(build.indexOf("function includeRuntimeEntry("),build.indexOf("function copyEntry("));
assert.ok(predicate.includes("path.basename"));
const filter=vm.runInNewContext(predicate+"\nincludeRuntimeEntry;",{path});
assert.match(build,/fs\.cpSync\(source, target, \{ recursive: true, filter: includeRuntimeEntry \}\)/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"biblozoo-metadata-test-"));
try {
  const source=path.join(tmp,"source"),target=path.join(tmp,"target");
  fs.mkdirSync(path.join(source,"nested"),{recursive:true});
  for(const name of [".DS_Store","desktop.ini","nested/DESKTOP.INI","nested/.ds_store","nested/game.mp3","nested/desktop.ini.txt","nested/LICENSE"])
    fs.writeFileSync(path.join(source,name),name);
  fs.cpSync(source,target,{recursive:true,filter});
  for(const name of [".DS_Store","desktop.ini","nested/DESKTOP.INI","nested/.ds_store"]){
    assert.ok(fs.existsSync(path.join(source,name)));
    assert.ok(!fs.existsSync(path.join(target,name)));
  }
  for(const name of ["nested/game.mp3","nested/desktop.ini.txt","nested/LICENSE"])
    assert.equal(fs.readFileSync(path.join(target,name),"utf8"),name);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const app=read("app.js"),start=app.indexOf("const BIBLOZOO_LOCAL_NOTICE_FILES"),end=app.indexOf("function showCreditsDialog()",start);
assert.ok(start>=0&&end>start);
const credits=app.slice(end,app.indexOf("function showContactSupportDialog()",end));
assert.match(credits,/isNativeParentGateContext\(\)\s*&&\s*window\.BibloZooNativeOnlyOutput\?\.enabled === true\s*&&\s*window\.BibloZooNativeOnlyOutput\?\.devToolsAllowed === false/);
assert.match(credits,/runParentOutgoingAction\(/);
assert.match(credits,/State\.screen === Screen\.SETTINGS && link\.isConnected/);
assert.match(read("styles.css"),/\.credits-notice-text\s*\{[\s\S]*?white-space: pre-wrap;[\s\S]*?overflow-wrap: anywhere;/);
function element(tag){
  return {tag,children:[],open:false,textContent:"",append(...xs){this.children.push(...xs)},appendChild(x){this.children.push(x)},addEventListener(type,fn){this[type]=fn;}};
}
async function main(){
  const paths=require("./audit_ios_production_packaging.js").requiredNotices;
  const calls=[];
  let failure=true,unblock;
  const context={document:{createElement:element},fetch:async(url,options)=>{
    calls.push(url);assert.equal(options.redirect,"error");
    assert.ok(paths.includes(url.slice(2)));
    if(failure){failure=false;return {ok:false};}
    if(unblock)await new Promise(resolve=>{unblock=resolve;});
    return {ok:true,text:async()=>"<a href='https://example.com'>literal</a>\n"+read(url.slice(2))};
  }};
  const add=vm.runInNewContext(app.slice(start,end)+"\naddBundledCreditsNotices;",context);
  const container=element("div");add(container);add(null);
  assert.equal(container.children.length,4);assert.equal(calls.length,0);
  const first=container.children[0];
  assert.equal(first.children[0].tag,"summary");assert.equal(first.children[1].tag,"pre");
  await first.toggle();assert.equal(calls.length,0);
  first.open=true;await first.toggle();
  assert.match(first.children[1].textContent,/retry/);
  first.open=false;await first.toggle();first.open=true;await first.toggle();
  assert.match(first.children[1].textContent,/<a href=/);
  assert.equal(first.children[1].innerHTML,undefined);
  await first.toggle();assert.equal(calls.length,2);
  for(const section of container.children.slice(1)){section.open=true;await section.toggle();assert.match(section.children[1].textContent,/<a href=/);}
  assert.deepEqual(calls,["./"+paths[0],...paths.map(p=>"./"+p)]);
  const dist=path.join(root,"dist");
  if(fs.existsSync(path.join(dist,"index.html"))){
    for(const p of paths)assert.ok(fs.readFileSync(path.join(dist,p)).equals(fs.readFileSync(path.join(root,p))));
    assert.ok(read("dist/app.js").includes("addBundledCreditsNotices"));
  }
  console.log("Release polish PASS: generated metadata exclusion, local plain-text notice loading/retry/cache and existing outgoing gate contract.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
