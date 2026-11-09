/* N6q.1: owner-reported Verse Jam timing / spurious Welcome Back regression.
 * Linux Node checks cannot compile Swift or verify speaker timing on iPhone.
 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const game=read("verse_playground/verse_jam/game.js");
const native=read("verse_games/shared/native-verse-jam-audio.js");
const swift=read("ios/App/App/BibloZooNativeSoundPlugin.swift");
const workflow=read(".github/workflows/ios-prep-validation.yml");
const handoff=read("docs/PROJECT-HANDOFF.md");
const doc=read("docs/N6Q1-VERSE-JAM-TIMING-FOLLOWUP.md");
const has=(text,fragment,message)=>assert(text.includes(fragment),message);
const matches=(text,pattern,message)=>assert(pattern.test(text),message);

async function main() {
  new vm.Script(game,{filename:"verse_jam/game.js"});
  new vm.Script(native,{filename:"native-verse-jam-audio.js"});

  // Watchdog: last chunk can wait for next downbeat with zero word buttons.
  // Its normal musical phrase must never become a fake task-switch modal.
  matches(game,/state\.phase === "ending_sequence"/,
    "Finale is an intentional >2.2sec no-button phase");
  matches(game,/state\.progressIndex >= state\.segments\.length/,
    "Between last word and next measure is intentional too");
  has(game,'state.phase === "round_transition"',"Original round transition grace");
  matches(game,/recoverStuckGameplay\(\)/,"Original safety watchdog remains");
  has(game,"playgroundWelcome?.pauseFromNativeInactive?.()",
    "UIKit interruption must still pause on a genuine OS event");

  // Start preparing on a real speed-selection click, not after Got It.
  matches(game,/onSelect: \(mode\) => \{[\s\S]*?nativeJamAudio\.prepareFromGesture\(\)/,
    "Real mode gesture must prewarm whole native sound bank");
  has(game,'setScreen("headphones")',"Original Heads Up screen retained");
  has(game,'screen === "headphones" && !!nativeJamHeadsUpPrewarm',
    "Heads Up may not immediately tear down mode prewarm");
  has(game,"nativeJamHeadsUpPrewarm = null;",
    "Consume / discard stale prewarm before active run");
  has(game,"headStart.promise.then(result",
    "Got It must await the existing mode preflight, not redo it");
  has(game,"audioRequest = ensureAudio()",
    "Failed prewarm must allow explicit Got It gesture retry");
  has(game,'button.id === "verseJamHeadphonesGotIt"',
    "Got It pointerdown UI pop must not compete with live bank");

  // Native JS schedules ~100ms ahead; Swift converts bounded epoch due into
  // audio host time after bridge/serial queue delay.
  has(game,"NATIVE_JAM_LOOKAHEAD_MS = 100",
    "Native note dispatch gets a bounded pre-beat lookahead");
  has(game,"ms - NATIVE_JAM_LOOKAHEAD_MS",
    "Timers must wake before the actual beat");
  has(game,"nativeJamClock.currentTime - when < 0.14",
    "Late/stale notes must be discarded rather than blasted in a batch");
  has(game,"callback(dueEpochMs)",
    "Dispatch carries actual due time to fixed native PCM owner");
  has(native,"scheduledEpochMs: dueEpochMs",
    "Bridge forwards finite due time, never arbitrary URLs");
  has(swift,'call.getDouble("scheduledEpochMs")',
    "Swift validates only Jam scheduled beat epoch");
  has(swift,"self.jamIDs.contains(soundId)",
    "No timing behavior change for other game sound IDs");
  has(swift,"due >= now-160 && due <= now+350",
    "Swift must bound near-future host-time requests");
  has(swift,"AVAudioTime(hostTime: mach_absolute_time()",
    "Native PCM uses host-time scheduling, not at-the-beat hot dispatch");

  // The authored sting already supplies a pitched note at each native
  // transition word; N6q.3 suppresses only the doubled word-note layer.
  // Browser WebAudio retains its two original source layers unchanged.
  has(game,"playRoundTransitionSting(transitionStart)",
    "Source transition melody/chord must remain scheduled before word UI");
  has(game,"The authored sting ALREADY supplies",
    "Never duplicate source note on the same native transition beat");
  has(game,"if (!nativeJamAudio) {\n        playTone({",
    "Browser retains the original visual-word cue path");
  for(const text of ['["time", "to", "jam!"]','["speed", "it", "up"]'])
    has(game,text,"Original transition words must survive");

  // Hot bank reuse and actual PCM re-render math.
  has(native,"if (ready && !failed) {",
    "An already-hot bank must not get discarded on Menu Close");
  has(native,'reason:"already-prepared"',
    "Hot-bank reactivation on explicit gesture returns promptly");
  has(native,"if (!bankOwned && !ready && !uiReady) return teardown",
    "Repeated OS/visibility pause must not enqueue duplicate stops");
  has(swift,"let rise = pow(0.016/0.0001",
    "Chord exponential gain ratio is computed once per buffer");
  has(swift,"let fadeFrames = Double(max(1, activeFrames - attackFrames))",
    "Attack and decay math must reuse an explicit finite frame count");
  has(swift,"let decay = pow(0.0001 / 0.016, 1.0 / fadeFrames)",
    "Pad decay must remain a per-buffer exponential multiplier");
  has(swift,"let decay = pow(0.0001, 1.0 / fadeFrames)",
    "Note decay must remain a per-buffer exponential multiplier");
  has(swift,"let rise = pow(1.0/0.0001",
    "Tone gain ratio is computed once per note buffer");

  // End/Great button must preserve note nodes and give fast visual feedback.
  has(swift,'soundId == "jam-groove"',
    "Targeted end-of-game stop must exclude jam-note voices");
  has(native,'stopEffect?.({soundId:"jam-groove"})',
    "Controller uses narrow native groove stop");
  matches(game,/stopRun\(\{ keepNativeReady: !!nativeJamAudio,[\s\S]*?preserveNativeFinale: !!nativeJamAudio \}\)/,
    "Finish must retain hot notes for final arpeggio");
  has(game,"await sleep(nativeJamAudio ? 260 : 900)",
    "Great tap must not wait 900ms on native iOS; browser unchanged");
  has(game,'state.screen = "end";\n    render();',
    "End renders without a second stop that clips the arpeggio");
  has(game,"markPlaygroundCompleted?.({",
    "Existing practice/reward completion stays single-shot");
  has(game,"nativeOnlyAudio: !!nativeJamAudio",
    "Plain Welcome Back remains the only OS interruption recovery");
  has(game,"restoreNativeOnGesture: nativeJamAudio ? () =>",
    "No passive native session takeover");
  has(workflow,"validate_native_verse_jam_timing_n6q1.js",
    "Full N6q.1 regression must run on the PR's final CI HEAD");
  has(doc,"iPhone","Actual owner physical iPhone testing checklist required");
  has(handoff,"N6q.1","Update living handoff in every fix PR");

  // Exercise hot/first/recovery paths against the real JS controller.
  const calls={activate:[],preload:[],play:[],stop:[],stopEffect:[]};
  const callbacks={};
  let activation={ready:true};
  const plugin={
    activateFromGesture(p){calls.activate.push(p);return Promise.resolve(activation);},
    preload(p){calls.preload.push(p);return Promise.resolve({prepared:true,durationMs:250});},
    play(p){calls.play.push(p);return Promise.resolve({accepted:true});},
    stop(p){calls.stop.push(p);return Promise.resolve({stopped:true});},
    stopEffect(p){calls.stopEffect.push(p);return Promise.resolve({stopped:true});},
    addListener(name,cb){callbacks[name]=cb;return Promise.resolve({remove(){}});}
  };
  const fake={
    BibloZooNativeOnlyOutput:{enabled:true},
    Capacitor:{isNativePlatform:()=>true,getPlatform:()=>"ios",
      Plugins:{BibloZooNativeSound:plugin}},
    document:{hidden:false,addEventListener(){}},
    addEventListener(){},setTimeout,clearTimeout
  };
  vm.runInNewContext(native,{window:fake},{filename:"native-verse-jam-audio.js"});
  const audio=fake.BibloZooNativeVerseJamAudio;
  assert(audio.isAvailable(),"Native owner only in isolated iOS");
  assert.strictEqual(calls.activate.length,0,"Never activate on module load");
  const warm=await audio.prepareFromGesture(); // same click as speed selection
  assert.strictEqual(warm.ready,true);
  assert.strictEqual(calls.preload.length,13,"Prepare 13 fixed IDs once");
  const again=await audio.prepareFromGesture(); // another explicit game gesture
  assert.strictEqual(again.ready,true);
  assert.strictEqual(calls.preload.length,13,
    "A second gesture must not re-render the already-hot bank");
  assert.strictEqual(calls.stop.length,0,
    "Never stop a healthy live bank merely to reclaim a gesture");
  const due=Date.now()+90;
  assert(audio.playTone(76,.11,.045,"square",due));
  assert(audio.playDrum("kick",1,due));
  assert(audio.playPad(104,8,.6,due));
  assert(audio.playVoice("hey",.3,due));
  await Promise.resolve();
  const queued=calls.play.slice(-4);
  assert.strictEqual(queued.length,4);
  for(const call of queued)
    assert(Math.abs(call.scheduledEpochMs-due)<8,
      "Each scheduled note must carry same near-future due time");
  audio.stopGrooveForFinale();
  assert.strictEqual(calls.stopEffect.at(-1).soundId,"jam-groove",
    "Finale must stop drum/pad/voices without jam-note nodes");
  callbacks.biblozooAppLifecycle({active:false});
  const afterInactive=calls.stop.length;
  assert.strictEqual(afterInactive,1,
    "One UIKit inactive should tear down prepared bank exactly once");
  audio.stop();
  audio.stop();
  callbacks.biblozooAppLifecycle({active:true});
  assert.strictEqual(calls.stop.length,afterInactive,
    "Duplicate visibility/foreground callbacks must not queue extra stops");
  assert(!audio.isReady(),"Return still requires child's real tap");
  activation={ready:true};
  const resumed=await audio.prepareFromGesture();
  assert.strictEqual(resumed.ready,true);
  assert.strictEqual(calls.preload.length,26,
    "After real interruption the complete safe bank is rewarmed once");
  console.log("N6q.1 PASS: watchdog ending, original authored transition sting without native duplicate notes, host-time Jam scheduling, mode prewarm/fast Got It, hot-bank reuse, one-stop interruption, nonclipped finale and Great responsiveness.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
