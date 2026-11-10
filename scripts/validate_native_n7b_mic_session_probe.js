/* N7b — source + VM regression for the isolated 4s AVAudioEngine mic
 * level DEV test. Linux can parse Swift but NEVER type-check Apple SDK nor
 * prove real microphone levels/AVAudioSession restoration on an iPhone.
 */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),
  path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const js=read("verse_games/shared/native-mic-session-probe-n7b.js");
const scene=read("ios/App/App/SceneDelegate.swift");
const sound=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const index=read("index.html");
const audit=read("docs/N7B-MIC-SESSION-DEV-PROBE.md");
const handoff=read("docs/PROJECT-HANDOFF.md");
const testing=read("docs/TESTING.md"),recovery=read("docs/AUDIO-RECOVERY.md");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const privacy=read("ios/App/App/Info.plist");
const prior=read("scripts/validate_native_n7_recording_audit_n7a.js");
const expect=(s,x,m)=>assert(s.includes(x),m+": "+x);
new vm.Script(js,{filename:"native-mic-session-probe-n7b.js"});
// Registration and strict bundle gate. No arbitrary mic file paths/recording.
expect(scene,"registerPluginInstance(BibloZooMicSessionProbePlugin())",
  "DEV mic probe must be registered with active bridge");
expect(scene,'jsName = "BibloZooMicSessionProbe"',
  "Native JS name must match the diagnostic UI");
for(const name of ["requestPermission","beginProbe","endProbe","getProbeState"]) {
  expect(scene,'CAPPluginMethod(name: "'+name+'"',
    "Expose exact bounded mic plugin method");
  expect(scene,"@objc func "+name+"(","Implement the method");
}
expect(scene,'"com.andydoane.biblozoo.audiotest"',
  "Microphone probe must refuse stable bundle");
expect(scene,"AVAudioSession.sharedInstance().requestRecordPermission",
  "Mic prompt must be native and explicit on DEV click");
expect(scene,"guard self.permissionLabel() == \"granted\"",
  "Permission MUST precede the input session/engine");
expect(scene,"session.category == .soloAmbient",
  "Don't start capture over an existing recording-category owner");
expect(scene,"!session.isOtherAudioPlaying",
  "Do not steal PiP still-playing audio");
expect(scene,"try session.setCategory(.playAndRecord, mode: .measurement",
  "Use opt-in recording-capable measurement session ONLY for DEV");
expect(scene,"options: [.defaultToSpeaker]",
  "Keep native speaker route candidate explicit and reviewable");
expect(scene,"try session.setActive(true)",
  "DEV session activation occurs ONLY in explicit beginProbe");
expect(scene,"try session.setActive(false, options: [.notifyOthersOnDeactivation])",
  "Cleanup releases session and notifies competing audio");
expect(scene,"try session.setCategory(category, mode: mode, options: options)",
  "Always restore exact previously observed category/mode/options");
expect(scene,"input.installTap(onBus: 0, bufferSize: 1024",
  "Read input level without saving data");
expect(scene,"self.maximumSeconds",
  "Mic probe MUST automatically end in a few seconds");
expect(scene,"UIApplication.willResignActiveNotification",
  "UIKit App Switcher stops mic even before WKWebView becomes hidden");
expect(scene,"AVAudioSession.interruptionNotification",
  "Audio takeover must stop the probe");
expect(scene,"AVAudioSession.routeChangeNotification",
  "Actual route change eventually cancels microphone session");
expect(scene,"self.stopProbe(reason: \"interrupted\")",
  "No mic should survive genuine interruption");
expect(scene,"no recorded take",
  "Swift source documents input-only ephemeral level sampling");
assert(!/AVAudioRecorder\s*\(/.test(scene),
  "Never create an AVAudioRecorder file in N7b");
assert(!/\.write\s*\(|URLSession|FileManager\.default\.createFile/.test(
  scene.slice(scene.indexOf("// N7b only: separate experimental microphone"))),
  "Probe must not persist or upload microphone samples");
expect(sound,'CAPPluginMethod(name: "devPrepareForMicrophone"',
  "Single existing native owner coordinates pre-mic output stop");
expect(sound,"self.forgetPlayback()",
  "Output owner must invalidate hot prepared buffers before mic changes session");
expect(sound,'self.needsGestureAfterInterruption = true',
  "User's NEXT output gesture must genuinely reactivate session");
expect(sound,'"output-worker-idle"',
  "DEV must wait for actual serial worker stop ACK");
expect(index,'src="verse_games/shared/native-mic-session-probe-n7b.js"',
  "Load opt-in panel on generated native experiment page");
expect(js,'root.BibloZooNativeOnlyOutput?.enabled === true',
  "Never show mic panel in web/Android or non-native experiment");
expect(js,'panel.setAttribute("data-no-ui-sound", "")',
  "DEV taps do not produce browser UI audio");
expect(js,"output.devPrepareForMicrophone()",
  "Begin click MUST await output worker barrier before category switch");
expect(js,"mic.beginProbe()","Only DEV begin button can request input session");
expect(js,"mic?.endProbe?.()","User and pagehide can stop input without recording");
expect(js,'doc.addEventListener("visibilitychange", onHidden)',
  "No microphone continuation after page becomes hidden");
assert(!/getUserMedia\s*\(|new MediaRecorder\s*\(|new Audio\s*\(/.test(js),
  "N7b must not introduce Web microphone fallback or audible output");
expect(privacy,"NSMicrophoneUsageDescription",
  "Native mic entitlement purpose must remain disclosed");
expect(audit,"physical iPhone",
  "Owner must have explicit Xcode/real-mic acceptance guide");
expect(audit,"Playground 5/5",
  "N6 owner PASS stays distinct from N7 real mic acceptance");
expect(handoff,"N7b","Living source handoff must mark DEV proof pending owner");
expect(testing,"N7b","Test guide must record real iPhone proof");
expect(recovery,"N7b","Recording session restore/privacy safeguards in recovery");
expect(workflow,"validate_native_n7b_mic_session_probe.js",
  "Actual N7b regression must run in native experimental CI");
expect(workflow,"swiftc -frontend -parse ios/App/App/SceneDelegate.swift",
  "Entire modified Swift SceneDelegate also parsed with real Swift compiler");
expect(prior,"N7a PASS","N7a input/output source-contract guard preserved");

function createEnvironment({ios=true,enabled=true,denied=false,failedStart=false}={}){
  const calls=[],listeners={},nodes=[];
  function element(tag){
    const events={};const item={
      tagName:tag.toUpperCase(),type:"",id:"",children:[],
      attributes:{},style:{},textContent:"",disabled:false,
      setAttribute(name,value){this.attributes[name]=value;},
      appendChild(c){this.children.push(c);return c;},
      addEventListener(name,cb){events[name]=cb;},
      remove(){nodes.splice(nodes.indexOf(this),1);},
      click(){return events.click?.()}
    };nodes.push(item);return item;
  }
  const body=element("body");
  const doc={
    body,hidden:false,readyState:"complete",
    createElement:element,
    getElementById:id=>nodes.find(n=>n.id===id)||null,
    addEventListener:(name,cb)=>{listeners[name]=cb;}
  };
  let microphone=false,permission=denied?"denied":"undetermined";
  const mic={
    requestPermission(){calls.push("permission");
      permission=denied?"denied":"granted";
      return Promise.resolve({granted:!denied,
        reason:denied?"permission-denied":"permission-granted"});},
    beginProbe(){calls.push("begin");
      if(failedStart)return Promise.resolve({started:false,reason:"other-audio-playing"});
      microphone=true;return Promise.resolve({started:true});},
    endProbe(){calls.push("end");microphone=false;
      return Promise.resolve({stopped:true,restored:true});},
    getProbeState(){calls.push("state");return Promise.resolve({
      available:true,running:microphone,permission,
      category:microphone?"AVAudioSessionCategoryPlayAndRecord":
          "AVAudioSessionCategorySoloAmbient",
      inputPorts:["MicrophoneBuiltIn"],peakPercent:microphone?37:0,
      buffersObserved:microphone?25:0,restored:!microphone,
      reason:microphone?"sampling-level-only":"stopped-by-user"});}
  };
  const output={devPrepareForMicrophone(){calls.push("handoff");
    return Promise.resolve({prepared:true,reason:"output-worker-idle"});}};
  const win={
    document:doc,BibloZooNativeOnlyOutput:{enabled},
    Capacitor:{isNativePlatform:()=>ios,getPlatform:()=>ios?"ios":"web",
      Plugins:{BibloZooMicSessionProbe:mic,BibloZooNativeSound:output}},
    setTimeout:()=>1,clearTimeout:()=>{},
    setInterval:()=>2,clearInterval:()=>{},
    addEventListener(){}
  };
  vm.runInNewContext(js,{window:win},{filename:"N7b real DEV panel"});
  const button=text=>nodes.find(n=>n.tagName==="BUTTON"&&n.textContent===text);
  return {calls,win,doc,nodes,button,events:listeners};
}
async function main(){
  for(const env of [{ios:false},{ios:true,enabled:false}]){
    const t=createEnvironment(env);
    assert.equal(t.button("1 · Request Mic Permission"),undefined,
      "No permission UI in browser or disabled isolation");
    assert.deepEqual(t.calls,[]);
  }
  const t=createEnvironment();
  assert(t.button("1 · Request Mic Permission"),"DEV test is visible only on experiment iOS");
  assert.deepEqual(t.calls,[],"No permission, capture, output activation or snapshots on app load");
  await t.button("Inspect (no mic activity)").click();
  assert.deepEqual(t.calls,["state"],"Inspection never implicitly asks permission");
  t.calls.length=0;
  await t.button("1 · Request Mic Permission").click();
  assert.deepEqual(t.calls,["permission","state"],
    "Permission only on explicit permission click, before mic session");
  t.calls.length=0;
  await t.button("2 · Test Mic for 4 Seconds").click();
  assert.deepEqual(t.calls,["handoff","begin","state"],
    "Actual tap first drains single output owner, THEN begins mic/route test");
  t.calls.length=0;
  await t.button("Stop / Restore Session").click();
  assert(t.calls.includes("end"),"Explicit Stop must release the mic and restore session");
  const denied=createEnvironment({denied:true});
  await denied.button("1 · Request Mic Permission").click();
  assert.deepEqual(denied.calls,["permission","state"]);
  const fail=createEnvironment({failedStart:true});
  await fail.button("2 · Test Mic for 4 Seconds").click();
  assert.deepEqual(fail.calls,["handoff","begin","state"],
    "Blocked competing audio test must fail closed, no retry/autoplay");
  const bg=createEnvironment();
  await bg.button("2 · Test Mic for 4 Seconds").click();
  bg.calls.length=0;bg.doc.hidden=true;
  bg.events.visibilitychange();
  await new Promise(resolve=>setImmediate(resolve));
  assert(bg.calls.includes("end"),"On-hidden must end mic, NEVER restart it");
  assert(!bg.calls.includes("begin"),"Foreground is not a capture gesture");
  console.log("N7b PASS: no passive mic/permission, actual user tap invokes output stop barrier before 4-second DEV mic level test, explicit stop/hidden cleanup, denial and PiP blocked; iOS app remains native-only. Real Apple Xcode/iPhone permission/route/audio session still pending.");
}
main().catch(e=>{console.error(e);process.exitCode=1});
