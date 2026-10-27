#!/usr/bin/env node
"use strict";
/* Patch 72.1A: real source VM integration, simulated pointer gestures,
 * Stage 1/2/3 transitions, batching, and regression/offline contracts. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
let checks = 0;
const ok=(value,description)=>{assert.ok(value,description);checks++;};
const eq=(value,expected,description)=>{assert.equal(value,expected,description);checks++;};
const engine = read("verse_games/shared/welcome-back-zoo-escape.js");
const css = read("verse_games/shared/welcome-back.css");
const ui = read("verse_games/shared/welcome-back.js");
const sw = read("service-worker.js");
const html = read("index.html");
for(const file of ["verse_images/zoobreak_gate.png","verse_images/zoobreak_lock.png"]) {
  const b=fs.readFileSync(path.join(root,file));
  eq(b.subarray(0,8).toString("hex"),"89504e470d0a1a0a",`real PNG artwork: ${file}`);
  ok(b.length>3000,`nonempty illustration ${file}`);
  ok(sw.includes(`"./${file}"`),`image precached by PWA ${file}`);
}
for(const file of ["verse_games/shared/welcome-back-zoo-escape.js"]) {
  ok(html.includes(file),"Main app loads shared engine before Feeding");
  ok(sw.includes(`"./${file}"`),"PWA precaches shared engine");
}
ok(html.indexOf('welcome-back-zoo-escape.js')<html.indexOf('daily_questions_feed_game.js'),"engine available before Feeding");
ok(css.includes('animation: none !important;') && css.includes('.bz-welcome-card.is-recovering .bz-welcome-avatar-image'),"portrait spin removed for every existing popup");
ok(!css.includes('@keyframes bz-welcome-picture-recover'),"old spinner animation removed");
for(const token of ["bz-zoo-pen","bz-zoo-pet","bz-zoo-poof-cloud","bz-zoo-break-anchor","bz-zoo-break-shake","bz-zoo-break-splash","bz-zoo-fade-black","prefers-reduced-motion","touch-action: none","focus-visible"]) ok(css.includes(token),`shared visual and accessibility ${token}`);
for(const token of ["pointerdown","pointermove","pointerup","pointercancel","setPointerCapture","aria-label","onRescue","onBreakComplete","getProfilePictureCatalog","clearScheduled","onVisibility","RECOVERY_WATCHDOG_MS","soundIsReady","onExit","onRecovered"]) ok(engine.includes(token),`shared interaction and cleanup ${token}`);
ok(!engine.includes('AudioContext(') && !engine.includes('setCategory('),"no native or JS audio session mutation in presentation");
ok(read("daily_questions_feed_game.js").includes("attemptFeedingResumeFromGesture"),"Feeding recovery owner remains intact");
ok(read("app.js").includes('resumeInterruptedLearnAudio'),"Learn audio recovery owner remains intact");
ok(read("scripts/validate_daily_zoo_todo.js").includes('["diagnostics-cleared"]'),"diagnostics clear assertion aligned with actual audit marker");

function harness(answers, options={}) {
  let time=0,nextTimer=1;
  const timers=new Map(),frames=new Map();
  const fired=[];
  function setTimeoutFake(fn,delay=0){ const id=nextTimer++; timers.set(id,{fn,due:time+delay});return id; }
  function clearTimeoutFake(id){timers.delete(id);}
  function requestAnimationFrameFake(fn){const id=nextTimer++;frames.set(id,fn);return id;}
  function cancelAnimationFrameFake(id){frames.delete(id);}
  class Node {
    constructor(tag="div",label=""){
      this.tagName=tag;this.label=label;this.children=[];this.parentNode=null;
      this.hidden=false;this.disabled=false;this.tabIndex=0;this.attrs={};this.className="";
      this.textContent="";this.draggable=false;this.listeners={};this.src="";
      this.style={transform:"",setProperty(n,v){this[n]=v;}};
      this.classList={_set:new Set(),add:(c)=>this.classList._set.add(c),remove:(...names)=>names.forEach(c=>this.classList._set.delete(c)),toggle:(c,v)=>{if(v===undefined)v=!this.classList._set.has(c);if(v)this.classList._set.add(c);else this.classList._set.delete(c);return v;},contains:c=>this.classList._set.has(c)};
    }
    setAttribute(n,v){this.attrs[n]=v;}
    getAttribute(n){return this.attrs[n]||"";}
    appendChild(node){if(node.parentNode)node.remove();node.parentNode=this;this.children.push(node);return node;}
    insertBefore(node,target){if(node.parentNode)node.remove();const index=this.children.indexOf(target);this.children.splice(index<0?this.children.length:index,0,node);node.parentNode=this;return node;}
    remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
    replaceChildren(...nodes){for(const old of this.children)old.parentNode=null;this.children=[];for(const n of nodes)this.appendChild(n);}
    replaceWith(node){const parent=this.parentNode;if(parent)parent.insertBefore(node,this);this.remove();}
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
    removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn);}
    trigger(type,event={}){for(const fn of this.listeners[type]||[])fn({pointerId:1,cancelable:true,preventDefault(){},...event});}
    focus(){}
    setPointerCapture(){}
    getBoundingClientRect(){if(this.label==="overlay")return {left:0,top:0,width:390,height:844};return {left:130,top:185,width:130,height:130};}
    get innerHTML(){return this._html||"";}
    set innerHTML(v){this._html=v;}
  }
  const doc={hidden:false,baseURI:"https://example.test/biblozoo/",listeners:{},
    createElement:tag=>new Node(tag),createTextNode:val=>{const n=new Node("#text");n.textContent=val;return n;},
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},
    removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(f=>f!==fn);},
    emit(type){for(const fn of this.listeners[type]||[])fn();}};
  const overlay=new Node("div","overlay"), card=new Node("div"),avatar=new Node("div"),title=new Node("h2"),button=new Node("button"),status=new Node("p");
  title.innerHTML='<span>Welcome back!</span>';
  button.innerHTML="Let's go!";
  overlay.ownerDocument=doc;
  overlay.appendChild(card);card.appendChild(avatar);card.appendChild(title);card.appendChild(button);card.appendChild(status);
  overlay.querySelector=sel=>({"[data-welcome-back-card]":card,".bz-welcome-avatar":avatar,".bz-welcome-title":title,"[data-welcome-back-action]":button,"[data-welcome-back-status]":status})[sel]||null;
  const events=[];
  const win={document:doc,matchMedia:()=>({matches:!!options.reduced}),setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake,
    requestAnimationFrame:requestAnimationFrameFake,cancelAnimationFrame:cancelAnimationFrameFake,
    BibloZooWelcomeBack:{getIdentity:()=>({src:"profile_pictures/profile_picture_john_3_16.png",fallback:"profile_pictures/profile_picture_fallback.png"}),populate(){ }},
    BibloZooProfiles:{getProfilePictureCatalog:()=>Array.from({length:18},(_,i)=>`test_${i}`),getProfilePictureSrc:id=>`profile_pictures/profile_picture_${id}.png`},
    BibloZooAudioDiagnostics:{record:(name,details)=>events.push({name,details})}};
  const FakeDate=class extends Date{static now(){return time;}};
  const sandbox={window:win,Date:FakeDate,Math,Promise,URL,console};
  vm.runInNewContext(engine,sandbox,{filename:"welcome-back-zoo-escape.js"});
  const recovery=[];
  const ctl=win.BibloZooZooEscape.create({overlay,recover:()=>{recovery.push(time);return answers.shift();},
    onRecovered:()=>fired.push("recovered"),onExit:o=>fired.push({exit:o}),onRescue:o=>fired.push({rescue:o}),onBreakComplete:o=>fired.push({break:o}),
    profileId:"p1",petName:"Milo",soundIsReady:()=>!!options.soundReady,onPop:()=>fired.push("pop"),onBounce:()=>fired.push("bounce"),reducedMotion:!!options.reduced});
  function advance(ms){const target=time+ms;while(time<target){time=Math.min(time+40,target);let due=[...timers.entries()].filter(([k,v])=>v.due<=time);while(due.length){for(const [k,v] of due){timers.delete(k);v.fn();}due=[...timers.entries()].filter(([k,v])=>v.due<=time);}
    const jobs=[...frames.values()];frames.clear();for(const fn of jobs)fn(time);
  }}
  function petNodes(){const field=overlay.children.find(n=>n.className==="bz-zoo-field");return field?.children||[];}
  function rescueFirst(){const pet=petNodes().find(n=>n.classList.contains("bz-zoo-catchable") && !n.disabled);assert.ok(pet,"expect catchable pet");checks++;
    const m=pet.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);assert.ok(m,"pet position");checks++;
    const x=Number(m[1]),y=Number(m[2]);
    pet.trigger("pointerdown",{clientX:x+10,clientY:y+10,pointerId:11});
    pet.trigger("pointermove",{clientX:195-55,clientY:250-55,pointerId:11});
    pet.trigger("pointerup",{clientX:195-55,clientY:250-55,pointerId:11});
    // pen center=(195,250); offset=10 on both axes, so target center
    return ctl.getState();
  }
  return {ctl,advance,doc,overlay,button,card,title,petNodes,rescueFirst,recovery,fired,events,win};
}
async function run(){
  const pure={window:{}};vm.runInNewContext(engine,pure,{filename:"engine"});
  const api=pure.window.BibloZooZooEscape;
  eq(api.MAX_ATTEMPTS,3,"three explicit gestures maximum");
  eq(api.MIN_PETS,6,"six pets minimum");
  eq(api.MAX_PETS,10,"ten pets maximum");
  eq(api.SPAWN_MS,1000,"sequential release once a second");
  eq(api.EMERGE_MS,750,"protected emergence ~750ms");
  for(const stage of ["welcome","escape","break"]){
    eq(api.nextStage(stage,true),"recovered",`${stage} verified audio always resumes`);
    eq(api.nextStage(stage,false),({welcome:"escape",escape:"break",break:"exit"})[stage],`${stage} failure advances`);
  }
  for(const n of [-99,0,5.5,6,8.9,10,400])ok(api.clampCount(n)>=6&&api.clampCount(n)<=10,"count bounded");

  let h=harness([true]);ok(h.ctl.start(),"start controller");eq(h.ctl.getStage(),"welcome","welcome stage initial");
  eq(h.ctl.getState().attemptCount,0,"no automatic audio attempts");
  h.button.trigger("click");eq(h.recovery.length,1,"direct user click invoked first recovery");
  await Promise.resolve();eq(h.ctl.getStage(),"recovered","first successful tap returns immediately");
  eq(h.fired.filter(e=>e==="recovered").length,1,"resume callback exactly once");
  eq(h.ctl.isPaused(),false,"game no longer gated after success");h.ctl.destroy();

  h=harness([false,true]);h.ctl.start();h.button.trigger("click");await Promise.resolve();
  eq(h.ctl.getStage(),"escape","failed first tap launches runaway pet");
  eq(h.petNodes().length,1,"one profile pet in Stage 2");
  ok(h.petNodes()[0].disabled,"Stage 2 pet invulnerable at spawn");
  ok(h.button.hidden,"drag hint takes the button's same fixed slot");
  h.advance(1200);ok(!h.petNodes()[0].disabled,"pet catchable only after 100% emergence");
  h.rescueFirst();eq(h.ctl.getState().rescued,1,"first pet rescued exactly once");
  ok(!h.button.hidden,"LOCK GATE replaces hint after rescue");
  h.button.trigger("click");eq(h.recovery.length,2,"second actual gesture initiates recovery");
  await Promise.resolve();eq(h.ctl.getStage(),"recovered","stage 2 recovery resumes without Stage 3");h.ctl.destroy();

  h=harness([false,false,false],{reduced:true});h.ctl.start();h.button.trigger("click");await Promise.resolve();
  h.advance(1200);h.rescueFirst();h.button.trigger("click");await Promise.resolve();
  eq(h.ctl.getStage(),"break","failed LOCK GATE escalates to Zoo Break");
  const count=h.ctl.getState().total;
  ok(count>=6&&count<=10,`random 6–10 pet count (got ${count})`);
  eq(h.ctl.getState().spawning,1,"first escaping pet appears immediately");
  h.advance(11500);
  eq(h.ctl.getState().spawning,count,"all 6–10 pets emerged one at a time");
  eq(h.ctl.getState().active,count,"multiple pets active simultaneously");
  for(let i=0;i<count;i++){h.rescueFirst();}
  eq(h.ctl.getState().rescued,count,"all pets returned");
  eq(h.fired.filter(x=>x.break).length,1,"Zoo Break complete credited once");
  ok(!h.button.hidden,"final LOCK GATE shown when all pets back");
  h.button.trigger("click");await Promise.resolve();
  eq(h.recovery.length,3,"exactly three recovery attempts");
  eq(h.ctl.getStage(),"exiting","terminal failed audio starts clean fade");
  h.advance(100);
  eq(h.fired.filter(e=>e.exit).length,1,"terminal failure routes to Zoo once");
  eq(h.fired.filter(e=>e==="recovered").length,0,"no false success");
  eq(h.fired.filter(e=>e==="pop").length,0,"no optional sounds without audio readiness");
  eq(h.fired.filter(e=>e==="bounce").length,0,"no bounce sounds without verified audio");
  h.ctl.destroy();

  h=harness([{deferred:true},true]);h.ctl.start();h.button.trigger("click");await Promise.resolve();
  eq(h.ctl.getStage(),"escape","native pending does not create endless retry loop");
  h.advance(1300);h.rescueFirst();h.button.trigger("click");await Promise.resolve();
  eq(h.ctl.getStage(),"recovered","next real gesture can recover from deferred result");h.ctl.destroy();

  h=harness([new Promise(()=>{})]);h.ctl.start();h.button.trigger("click");
  h.advance(7800);eq(h.ctl.getStage(),"escape","hung native promise bounded by watchdog");
  eq(h.recovery.length,1,"watchdog does not autoretry");h.ctl.destroy();

  console.log(`Patch 72.1A Zoo Escape validation: ${checks} checks passed.`);
}
run().catch(err=>{console.error(err);process.exitCode=1;});
