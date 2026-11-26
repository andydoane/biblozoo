/* About Me source/lifecycle/packaging checks; not a physical iOS playback test. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const app=read("app.js"),adapter=read("verse_games/shared/native-read-my-verse-output-n7f.js"),swift=read("ios/App/App/SceneDelegate.swift");
new vm.Script(app); new vm.Script(adapter);
const start=app.indexOf("let aboutMeAudio = null;"),end=app.indexOf("function screenAboutMe(idx)",start);
assert.ok(start>=0&&end>start);
const view=app.slice(end,app.indexOf("function screenPrivacyPolicy(idx)",end));
for(const fragment of ['data-settings-action="about-me"','go(Screen.ABOUT_ME)','Screen.ABOUT_ME,','if (from === Screen.ABOUT_ME) stopAboutMeMusic();','if (muted) stopAboutMeMusic();','if (screen === Screen.ABOUT_ME) slide = screenAboutMe(idx);'])assert.ok(app.includes(fragment),fragment);
for(const fragment of ['verse_images/andy_dancing.mp4','muted loop playsinline','data-about-back','go(Screen.SETTINGS)','runParentOutgoingAction(','window.open("https://eatyourbible.com", "_blank", "noopener,noreferrer")','website.isConnected','stopAboutMeMusic();','State.screen === Screen.ABOUT_ME'])assert.ok(view.includes(fragment),fragment);
const css=read("styles.css");
assert.match(view, /<span class="about-me-video-crop">\s*<video class="about-me-video"[^]*?<\/video>\s*<\/span>/);
const crop=css.match(/\.about-me-video-crop\s*\{([^}]+)\}/)?.[1]||"";
const video=css.match(/\.about-me-video\s*\{([^}]+)\}/)?.[1]||"";
for(const rule of ["position: relative","aspect-ratio: 1 / 1","overflow: hidden","border-radius: clamp(18px, 5vw, 30px)","pointer-events: none"])assert.ok(crop.includes(rule),rule);
for(const rule of ["position: absolute","top: -2px","left: -2px","width: calc(100% + 4px)","height: calc(100% + 4px)","max-width: none","object-fit: cover","pointer-events: none"])assert.ok(video.includes(rule),rule);
assert.ok(adapter.indexOf('if (src === "./verse_audio/biblozoo_jingle.mp3") return "about-me-jingle";')<adapter.indexOf("const verse ="));
assert.ok(swift.includes('"about-me-jingle": ("verse_audio", "biblozoo_jingle")'));
assert.ok(swift.includes('guard category == .soloAmbient else'));
for(const rel of ["verse_images/andy_dancing.mp4","verse_audio/biblozoo_jingle.mp3"]){
  const source=fs.readFileSync(path.join(root,rel));assert.ok(source.length>0,rel);
  if(process.argv.includes("--dist"))assert.ok(fs.readFileSync(path.join(root,"dist",rel)).equals(source),rel+" dist byte match");
}
// Exercise the real slide-completion branch. About Me must retain the
// connected incoming video/slide, not call render() and recreate the media.
const keepStart=app.indexOf("const keepArrivedMenuScreen =");
const keepEnd=app.indexOf("        render();",keepStart);
assert.ok(keepStart>=0&&keepEnd>keepStart,"slide completion branch");
const completion=app.slice(keepStart,keepEnd)+"render();";
const screens=Object.fromEntries(["ABOUT_ME","PRACTICE_HUB","LEARN_HUB","LISTEN_ACTIVITIES","PRACTICE","PLAYGROUND","FLASHCARDS","NEW_VERSE_PICKER","SETTINGS"].map(key=>[key,key]));
for(const nextScreen of Object.values(screens)){
  const video={identity:"original video"};
  let removed=0,nav=0,rebuild=0;
  const outgoing={dataset:{idx:"1"},classList:{contains:name=>name==="slide"},remove(){removed++;}};
  const incoming={dataset:{idx:"2"},classList:{contains:name=>name==="slide"},video,remove(){throw Error("incoming slide removed");}};
  const appHost={children:[outgoing,incoming]};
  vm.runInNewContext("(function(){"+completion+"})()",{Screen:screens,nextScreen,fromIdx:1,app:appHost,renderNav(){nav++;},render(){rebuild++;}});
  if(nextScreen===screens.SETTINGS){assert.equal(rebuild,1);assert.equal(removed,0);assert.equal(nav,0);}
  else{assert.equal(rebuild,0,nextScreen+" must not recreate its slide");assert.equal(removed,1);assert.equal(nav,1);assert.equal(incoming.video,video);}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
  let clips=[],listeners={},inactive,activations=[];
  class FakeAudio{
    constructor(src){this.src=src;this.handlers={};this.plays=0;this.stops=0;clips.push(this);}
    addEventListener(name,fn){this.handlers[name]=fn;}
    play(){this.plays++;return Promise.resolve(true);}
    pause(){this.stops++;return Promise.resolve();}
  }
  const output={enabled:true,NativeAudio:FakeAudio,activateFromGesture:()=>new Promise(resolve=>activations.push(resolve)),onAppInactive:fn=>{inactive=fn;}};
  const document={hidden:false,querySelector:()=>null,addEventListener:(n,fn)=>{listeners[n]=fn;}};
  const State={screen:"about_me",isSliding:false};
  const window={BibloZooNativeReadOutputController:output,BibloZooNativeOnlyOutput:{enabled:true,devToolsAllowed:false},Capacitor:{getPlatform:()=>"ios"},addEventListener:(n,fn)=>{listeners[n]=fn;}};
  const context=vm.createContext({window,document,State,Screen:{ABOUT_ME:"about_me"},muted:false,isNativeParentGateContext:()=>true});
  vm.runInContext(app.slice(start,end),context);
  const toggle=()=>vm.runInContext("toggleAboutMeMusic()",context);
  const active=()=>vm.runInContext("aboutMeAudio !== null",context);
  toggle();assert.equal(active(),true);assert.equal(clips[0].src,"./verse_audio/biblozoo_jingle.mp3");
  activations.shift()(true);await flush();assert.equal(clips[0].plays,1);
  toggle();assert.equal(active(),false);assert.equal(clips[0].stops,1);
  toggle();activations.shift()(true);await flush();assert.equal(clips[1].plays,1);
  clips[0].handlers.ended();assert.equal(active(),true,"stale completion cannot stop replacement");
  inactive();assert.equal(active(),false);assert.equal(clips[1].stops,1);
  toggle();toggle();activations.shift()(true);await flush();assert.equal(clips[2].plays,0,"stale activation cannot start");
  toggle();activations.shift()(true);await flush();document.hidden=true;listeners.visibilitychange();assert.equal(active(),false);
  document.hidden=false;context.muted=true;toggle();assert.equal(clips.length,4,"mute blocks start");
  context.muted=false;toggle();activations.shift()(false);await flush();assert.equal(active(),false,"denied activation resets toggle");
  toggle();activations.shift()(true);await flush();clips[5].handlers.ended();assert.equal(active(),false);
  State.screen="settings";toggle();assert.equal(clips.length,6,"other screen cannot start");
  State.screen="about_me";window.BibloZooNativeOnlyOutput.devToolsAllowed=true;toggle();assert.equal(clips.length,6,"Audio Test feature remains unavailable");
  console.log("About Me PASS: source gate/local assets, native bank, start/stop/restart, stale activation/events, inactive/hidden, mute and denied activation.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
