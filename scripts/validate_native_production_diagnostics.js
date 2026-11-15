/* Step 3c: production iOS diagnostics fail-closed at JS and native bridge.
 * Source/Node checks, not an Apple SDK build or physical device test.
 */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const diag=read("verse_games/shared/audio-diagnostics.js");
const scene=read("ios/App/App/SceneDelegate.swift");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const fixture=read("scripts/validate_audio_diagnostics_patch55.js");
const build=read("scripts/build.js");
assert.match(diag,/BibloZooNativeOnlyOutput\?\.enabled === true &&\s*root\.BibloZooNativeOnlyOutput\?\.devToolsAllowed !== true\) return;/);
assert.match(build,/native-only-ios-output\.js/);
// Verify a persisted old 'on' switch never even reads storage, registers a
// window API, instruments fetch/media, or installs an Audio log panel.
for(const allow of [false,undefined]){
 const touches=[];
 const window={
   BibloZooNativeOnlyOutput:{enabled:true,...(allow===undefined?{}:{devToolsAllowed:allow})},
   localStorage:{getItem(){touches.push("read");return "1";}},
   document:{addEventListener(){touches.push("listener");}},
   fetch(){touches.push("fetch");}
 };
 const fetch=window.fetch;
 vm.runInNewContext(diag,{window},{filename:"audio-diagnostics.js"});
 assert.equal(window.BibloZooAudioDiagnostics,undefined);
 assert.equal(window.fetch,fetch);
 assert.deepEqual(touches,[],"production JS must return before touching state");
}
assert.match(fixture,/nativeDevAllowed: false/,"existing browser/Audio Test VM suite also covers production denial");
assert.match(scene,/if BibloZooIOSIdentity\.experimentalToolsEnabled\s*\{\s*bridge\?\.registerPluginInstance\(BibloZooAudioSessionDiagnosticsPlugin\(\)\)/);
for(const name of ["BibloZooAudioSessionRecoveryPlugin","BibloZooNativeSoundPlugin",
                   "BibloZooMicSessionProbePlugin","BibloZooNativeReadOutputPlugin",
                   "BibloZooGhostWriterExportPlugin","BibloZooGhostBackgroundPickerPlugin"]){
 assert.match(scene,new RegExp("registerPluginInstance\\("+name+"\\(\\)\\)"),"real capability must remain: "+name);
}
function method(name){
 const start=swift.indexOf("    @objc func "+name+"(");
 assert.ok(start>=0,"missing native method "+name);
 const next=swift.indexOf("\n    @objc func ",start+5);
 return swift.slice(start,next<0?undefined:next);
}
for(const name of ["copyTimingReport","markRecentChompLate","getDebugState","traceJamTransition"]){
 assert.match(method(name),/BibloZooIOSIdentity\.experimentalToolsEnabled/,"direct production guard missing: "+name);
}
assert.match(method("copyTimingReport"),/guard let self = self, BibloZooIOSIdentity\.experimentalToolsEnabled[\s\S]*UIPasteboard\.general\.string/);
assert.match(method("markRecentChompLate"),/guard let self = self, BibloZooIOSIdentity\.experimentalToolsEnabled[\s\S]*lateChompMarks/);
assert.match(method("getDebugState"),/guard let self = self, BibloZooIOSIdentity\.experimentalToolsEnabled/);
assert.match(method("traceJamTransition"),/guard BibloZooIOSIdentity\.experimentalToolsEnabled/);
// Deliberately preserve normal audio, mic handoff and genuine recovery proofs.
assert.match(method("devPrepareForMicrophone"),/BibloZooIOSIdentity\.nativeAudioEnabled/);
assert.match(method("getCuePlaybackState"),/soundId|player|requestId/);
assert.match(swift,/CAPPluginMethod\(name: "play", returnType: CAPPluginReturnPromise\)/);
assert.match(swift,/CAPPluginMethod\(name: "activateFromGesture", returnType: CAPPluginReturnPromise\)/);
console.log("Step 3c PASS: native production diagnostics denied, Audio Test/browser diagnostics preserved, required audio and Flashcards bridges retained.");
