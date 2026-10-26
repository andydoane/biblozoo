#!/usr/bin/env node
"use strict";
/* Patch 68.1: Verse Jam startup regression and native-interruption gating.
   Simulations exercise observable code paths; on-device verification required. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
let checks=0;
function eq(a,b,m){assert.equal(a,b,m);checks++}
function ok(v,m){assert.ok(v,m);checks++}
async function flush(){for(let i=0;i<16;i++)await Promise.resolve()}

async function testJamBoot() {
 let rendered=0,attached=0;
 const app={classList:{add(){}},querySelectorAll(){return[]},innerHTML:''};
 const shell={gameIconImageHtmlForId(){return '<img>';},renderTitleScreen(){rendered++;},
   attachPlaygroundWelcomeBack(){attached++;return {isPaused(){return false}}}};
 const window={VerseGameBridge:{getVerseContext:async()=>({verseId:'john_3_16',verseText:'For God so loved',verseRef:'John 3:16',translation:'KJV'})},
   VerseGameShell:shell,addEventListener(){}};
 const document={hidden:false,getElementById(id){return id==='app'?app:null},querySelectorAll(){return[]},addEventListener(){}};
 const context={window,document,console,setTimeout,clearTimeout,setInterval,clearInterval,
   performance:{now:()=>0},localStorage:{getItem(){return null}},fetch:async()=>({ok:false})};
 const body=read('verse_playground/verse_jam/game.js');
 ok(body.includes('const shell = () => window.VerseGameShell || {};'),'Jam declares its shared-shell getter');
 await vm.runInNewContext(body,context,{filename:'verse_jam/game.js'});
 eq(rendered,1,'Jam loads and renders title rather than a blank screen');
 eq(attached,1,'Jam wires a single Playground Welcome Back adapter');
}

function resumeHarness({states=['ended'],coordinatorReason='clock-stalled',afterReplace=false,advanceFresh=false,available=true}={}) {
 let replacements=0,reads=0,clock=0;
 const logs=[];
 const old={state:'running',get currentTime(){return 0;}};
 const fresh={state:'running',get currentTime(){return advanceFresh?(clock+=0.1):0;}};
 let active=old;
 const window={document:{hidden:false},BibloZooAudioDiagnostics:{record:(name,data)=>logs.push({name,data})},
   BibloZooAudioRecoveryCoordinator:{isAvailable:()=>available,
     recoverAfterStall:async()=>({recovered:false,reason:coordinatorReason}),
     getInterruptionState:async()=>({available:true,pending:states[Math.min(reads++,states.length-1)]==='began',interruptionSequence:8,interruptionAgeMs:150})}};
 const context={window,setTimeout:fn=>{fn();return 0},clearTimeout(){},Promise,console};
 vm.runInNewContext(read('verse_games/shared/welcome-back-return.js'),context);
 const opt={unlock:()=>true,getContext:()=>active,isCurrent:()=>true,deferOnNativeInterruption:true,
   replaceContext:()=>{replacements++;active=fresh;return true}};
 return {window,run:()=>window.BibloZooWelcomeBackReturn.resumeAudioOnGesture(opt),logs,
   replacements:()=>replacements,reads:()=>reads};
}
async function testRecoveryGate(){
 const during=resumeHarness({states:['began']});
 const d=await during.run();
 eq(d.deferred,true,'Active native interruption defers recovery without declaring failure');
 eq(during.replacements(),0,'Active interruption prevents context churn');
 ok(during.logs.some(e=>e.name==='welcome-back-native-interruption-pending'),'Pending interruption diagnosed');
 const race=resumeHarness({states:['ended','began'],afterReplace:true});
 const r=await race.run();
 eq(r.deferred,true,'Interruption that begins during AudioContext replacement is recognized');
 eq(race.replacements(),1,'Only first context replacement is attempted');
 ok(race.logs.some(e=>e.data?.phase==='after-context-replacement'),'Late began notification diagnosed');
 const cooldown=resumeHarness({states:['ended'],coordinatorReason:'native-cooldown'});
 const c=await cooldown.run();
 eq(c.deferred,true,'Native cooldown produces deferred result instead of failed retry');
 eq(cooldown.replacements(),0,'Native cooldown avoids another context allocation');
 ok(cooldown.logs.some(e=>e.name==='welcome-back-native-cooldown'),'Cooldown logged');
 const success=resumeHarness({states:['ended','ended'],advanceFresh:true});
 eq(await success.run(),true,'Healthy replacement still succeeds with moving audio clock');
 eq(success.replacements(),1,'Successful fallback keeps a single replacement');
 const failure=resumeHarness({states:['ended','ended'],advanceFresh:false});
 eq(await failure.run(),false,'Genuinely stalled audio still reports failure');
 eq(failure.replacements(),1,'Genuine failure remains bounded');
}
function makeOverlayHarness(){
 const handlers=new Map(),logs=[];
 function e(tag='div') {const hooks=new Map(),slots=new Map(),styles=new Set();return {
   tag,hidden:false,disabled:false,textContent:'',children:[],innerHTML:'',
   classList:{add(n){styles.add(n)},remove(n){styles.delete(n)},toggle(n,b){b?styles.add(n):styles.delete(n)},contains(n){return styles.has(n)}},
   bind(k,v){slots.set(k,v)},querySelector(k){return slots.get(k)||null},
   appendChild(x){this.children.push(x)},setAttribute(){},removeAttribute(){},
   addEventListener(k,v){hooks.set(k,v)},removeEventListener(k){hooks.delete(k)},
   fire(k){hooks.get(k)?.()},focus(){},remove(){},getAttribute(){return null}
 }}
 const body=e('body'),overlay=e(),card=e('div'),action=e('button'),status=e('p'),esc=e('button'),title=e('button'),activity=e('p');
 overlay.hidden=true;overlay.bind('[data-welcome-back-card]',card);overlay.bind('[data-welcome-back-action]',action);overlay.bind('[data-welcome-back-status]',status);
 const doc={title:'Wheel of Bible',hidden:false,body,
   createElement(tag){if(tag==='div')return overlay;if(tag==='button')return esc;
     if(tag==='section'){const o=e('section');o.bind('[data-welcome-back-title]',title);o.bind('[data-welcome-back-activity]',activity);return o}
     return e(tag)},
   addEventListener:(k,f)=>handlers.set('doc:'+k,f),removeEventListener(){}};
 const window={document:doc,BibloZooAudioDiagnostics:{record:(name,data)=>logs.push({name,data})},
  addEventListener:(k,f)=>handlers.set('win:'+k,f),removeEventListener(){},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},
  BibloZooWelcomeBack:{markup:()=>'',populate(){},setAction(host,opts={}){
    action.disabled=opts.busy===true;action.textContent=opts.retry?'Try again!':"Let's go!";
    card.classList.toggle('is-recovering',opts.busy===true)}}};
 const context={window,document:doc,Promise,setTimeout};vm.runInNewContext(read('verse_games/shared/welcome-back-return.js'),context);
 let resolve;
 const ctl=window.BibloZooWelcomeBackReturn.attach({shouldPrompt:()=>true,onPause(){},onContinue:()=>new Promise(r=>{resolve=r})});
 const oops=overlay.children.find(x=>x.tag==='section');
 function awayBack(){doc.hidden=true;handlers.get('doc:visibilitychange')?.();doc.hidden=false;handlers.get('doc:visibilitychange')?.()}
 return {overlay,action,esc,status,oops,logs,awayBack,ctl,answer:async response=>{resolve(response);await flush()}};
}
async function testDeferredOverlay(){
 const h=makeOverlayHarness();h.awayBack();h.action.fire('click');
 await h.answer({deferred:true,reason:'native-interruption'});
 ok(!h.overlay.hidden,'Deferred response retains Welcome Back');
 ok(!h.oops.hidden===false,'Deferred response does not display Oops');
 eq(h.action.textContent,'Try again!','Deferred state allows retry');
 eq(h.esc.hidden,false,'Deferred state keeps manual exit available');
 ok(h.logs.some(x=>x.name==='welcome-back-recovery-deferred'),'Deferred outcome recorded separately');
 ok(!h.logs.some(x=>x.name==='welcome-back-recovery-result'),'Pending interruption not counted as failed recovery');
 h.action.fire('click');await h.answer({deferred:true,reason:'native-cooldown'});
 eq(h.oops.hidden,true,'Repeated deferrals never produce terminal Oops');
 h.action.fire('click');await h.answer(false);
 eq(h.oops.hidden,true,'Only first true failed attempt counted');
 h.action.fire('click');await h.answer(false);
 eq(h.oops.hidden,false,'Second genuine failed attempt still produces terminal Oops');
 h.ctl.destroy();
}
function staticPolicy(){
 const native=read('ios/App/App/SceneDelegate.swift'),coord=read('verse_games/shared/audio-recovery-coordinator.js'),shell=read('verse_games/shared/game-shell.js');
 ok(native.includes('self.lastInterruptionType == "began"'),'Native plugin never activates while interruption remains open');
 eq((native.match(/setActive\(true\)/g)||[]).length,1,'Native activation count unchanged');
 ok(!/setCategory\(|setMode\(|setActive\(false\)/.test(native),'Nonmixing audio policy preserved');
 ok(coord.includes('function interruptionPending(state)'),'Coordinator reads unresolved begin status');
 ok(coord.includes('getInterruptionState'),'Coordinator exposes read-only state to Playground');
 ok(shell.includes('deferOnNativeInterruption: true'),'All five Playground activities share guarded replacement');
 ok(shell.includes('if (ok?.deferred === true) return ok;'),'Shell preserves deferred status without calling activity resume');
 ok(read('service-worker.js').includes('2026_Oct_26_patch68_1_interruption_gate_jam_startup'),'Cache updated for native rebuild');
}
(async()=>{staticPolicy();await testJamBoot();await testRecoveryGate();await testDeferredOverlay();
 console.log(`Patch 68.1 Jam boot + native interruption gate: ${checks} checks passed.`)})()
.catch(e=>{console.error(e);process.exitCode=1});
