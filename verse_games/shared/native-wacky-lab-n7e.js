/* N7e: opt-in, isolated native iOS Wacky Lab for owner testing.
 * ONE RAM-only phrase recorded directly from Home, replayable with EACH
 * of the ten original presets. No random pick, grade, Zoo, file or WebAudio.
 */
(function installWackyLab(root) {
  "use strict";
  const doc = root.document;
  if (!doc) return;
  const PRESETS = Object.freeze([
    ["squirrel", "Squirrel"], ["giant", "Giant"], ["sleepy", "Sleepy"],
    ["rocket", "Rocket"], ["roller_coaster", "Roller Coaster"],
    ["ascending", "Ascending"], ["descending", "Descending"],
    ["demon", "Demon"], ["chorus_alien", "Chorus Alien"], ["cave", "Cave"]
  ]);
  // N7e.1: independently selectable, intentionally NOT in child's random
  // original 10. The variant lab can A/B against the two CURRENT effects.
  const DEV_VARIANTS = Object.freeze([
    ["demon_clean", "D1 · Clean Depth"],
    ["demon_shadow", "D2 · Dark Shadow"],
    ["demon_abyss", "D3 · Deep Abyss"],
    ["demon_whisper", "D4 · Haunted Whisper"],
    ["demon_thunder", "D5 · Soft Thunder"],
    ["chorus_air", "C1 · Airy Trio"],
    ["chorus_swarm", "C2 · Alien Swarm"],
    ["chorus_cosmic", "C3 · Cosmic Voices"],
    ["chorus_choir", "C4 · Wide Choir"],
    ["chorus_wobble", "C5 · Wobbling Chorus"]
  ]);
  const REFERENCE_PRESETS = Object.freeze([
    ["demon", "Current Demon"],
    ["chorus_alien", "Current Chorus Alien"]
  ]);
  const allowed = () => root.BibloZooNativeOnlyOutput?.enabled === true &&
    root.Capacitor?.isNativePlatform?.() === true &&
    root.Capacitor?.getPlatform?.() === "ios";
  let backdrop=null, recorder=null, statusNode=null, buttons=[];
  let autoStop=null, run=0, message="", currentMode="official";

  function button(text, action, extraStyle="") {
    const b=doc.createElement("button");
    b.type="button";
    b.textContent=text;
    b.setAttribute("data-no-ui-sound","");
    b.style.cssText="min-height:42px;border-radius:9px;padding:7px;" +
      "font:600 13px/1.3 sans-serif;touch-action:manipulation;" +
      "background:#e8f0ff;color:#15233b;border:1px solid #7e9ac3;" + extraStyle;
    b.addEventListener("click",action);
    return b;
  }
  function snapshot() {
    return recorder?.snapshot?.() || {status:"idle",hasRecording:false};
  }
  function render() {
    if (!backdrop?.isConnected || !statusNode) return;
    const state=snapshot();
    const canReplay=state.hasRecording && state.status==="ready" && !doc.hidden;
    for(const {node,kind} of buttons) {
      node.disabled=kind==="record" ? doc.hidden ||
        ["requesting","preparing","recording","stopping","fun-loading","fun-playing","loading","playing"].includes(state.status) :
        kind==="stop" ? !["requesting","preparing","recording"].includes(state.status) :
        kind==="stop-play" ? !["fun-loading","fun-playing","loading","playing"].includes(state.status) :
        !canReplay;
      node.style.opacity=node.disabled?"0.46":"1";
    }
    statusNode.textContent=message || (
      state.status==="ready" && state.hasRecording
        ? "Voice saved in native RAM. Tap any preset as often as needed."
        : "Tap Record a Phrase. One sample tests all 10 effects.");
  }
  function setMessage(text) {message=text;render();}
  function cancelAutoStop() {
    if(autoStop!==null)root.clearTimeout(autoStop);
    autoStop=null;
  }
  function close() {
    run+=1;
    cancelAutoStop();
    try{recorder?.stopFun?.();recorder?.pause?.();recorder?.dispose?.();}catch(_){}
    recorder=null;
    if(backdrop)backdrop.remove();
    backdrop=null;statusNode=null;buttons=[];
    message="";
  }
  async function record() {
    if(!recorder || doc.hidden) return;
    const token=++run;
    cancelAutoStop();
    setMessage("Requesting microphone only for this Record tap…");
    try {
      const result=await recorder.start(()=> {
        if(token===run) {
          setMessage("● Recording. Speak a short phrase; tap Stop, or wait 10 seconds.");
          autoStop=root.setTimeout(()=>{
            if(token===run && snapshot().status==="recording") recorder?.stop?.();
          },10000);
        }
      },async()=> {
        // This is NOT the Flashcards challenge; still honor the visible
        // 3→2→1 privacy/countdown boundary before opening the input engine.
        for(let n=3;n>=1;n--) {
          if(token!==run || doc.hidden || !backdrop?.isConnected) return false;
          setMessage("Microphone ready. Speak after "+n+"…");
          await new Promise(resolve=>root.setTimeout(resolve,950));
        }
        return token===run && !doc.hidden && !!backdrop?.isConnected;
      },()=>12000);
      if(token!==run || !backdrop?.isConnected)return;
      if(result!=="recording") {
        setMessage(result==="permission-denied"
          ? "iOS microphone permission denied. Enable it in Settings."
          : "Recording could not start ("+String(result)+"). Tap Record to retry.");
      }
    } catch(_) {
      if(token===run) setMessage("Native mic failed. Tap Record to retry.");
    }
  }
  function stopCapture() {
    cancelAutoStop();
    if(snapshot().status==="recording") {
      setMessage("Saving temporary native RAM take…");
      recorder?.stop?.();
    } else if(["requesting","preparing"].includes(snapshot().status)){
      run+=1;
      recorder?.interruptCapture?.();
      setMessage("Recording cancelled. Tap Record again.");
    }
  }
  async function playPreset(id,label,isDevVariant=false) {
    if(!recorder || !snapshot().hasRecording || doc.hidden) return;
    const token=++run;
    setMessage("Starting "+label+" with your saved voice…");
    const started=()=> {
      if(token===run) setMessage("Playing "+label+"…");
    };
    const result=isDevVariant
      ? await recorder.playDevVariant(id,started)
      : await recorder.playFun(id,started);
    if(token!==run || !backdrop?.isConnected)return;
    setMessage(result
      ? label+" finished. Tap another effect or replay "+label+"."
      : label+" stopped or failed. Try again from this RAM take.");
  }
  async function playNormal() {
    if(!recorder||!snapshot().hasRecording||doc.hidden)return;
    const token=++run;
    setMessage("Playing original voice (no effect)…");
    const ok=await recorder.play();
    if(token===run&&!ok) setMessage("Original voice could not start.");
  }
  function stopPlayback() {
    run+=1;
    recorder?.stopFun?.();
    recorder?.pause?.();
    setMessage("Playback stopped. Your temporary take remains ready.");
  }
  function open(mode="official") {
    if(!allowed() || !doc.body || !root.BibloZooRecording?.create) return;
    if(backdrop?.isConnected) return;
    currentMode=mode==="variants"?"variants":"official";
    const overlay=doc.createElement("div");
    overlay.id="biblozoo-n7e-wacky-lab";
    overlay.setAttribute("data-no-ui-sound","");
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label",currentMode==="variants"
      ? "Native Demon and Chorus Variant Lab" : "Native Wacky Replay Lab");
    overlay.style.cssText="position:fixed;inset:0;z-index:15000;" +
      "display:flex;align-items:center;justify-content:center;" +
      "padding:calc(env(safe-area-inset-top,0px) + 10px) 10px " +
      "calc(env(safe-area-inset-bottom,0px) + 10px);" +
      "background:rgba(5,15,35,.76);box-sizing:border-box;";
    const card=doc.createElement("section");
    card.style.cssText="box-sizing:border-box;width:min(430px,96vw);" +
      "max-height:88vh;overflow-y:auto;border-radius:18px;padding:15px;" +
      "background:#fffef9;color:#18243d;box-shadow:0 8px 28px #0008;";
    const heading=doc.createElement("div");
    heading.style.cssText="display:flex;justify-content:space-between;gap:10px;align-items:center;";
    const title=doc.createElement("strong");
    title.textContent=currentMode==="variants"
      ? "DEV · Demon / Chorus Lab" : "DEV · Wacky Lab (10)";
    title.style.cssText="font:700 20px/1.3 sans-serif;";
    const dismiss=button("×",close,"min-width:38px;background:#f4e6e6;");
    dismiss.setAttribute("aria-label","Close Wacky Lab and discard sample");
    heading.append(title,dismiss);
    const info=doc.createElement("p");
    info.style.cssText="font:12px/1.5 sans-serif;margin:8px 0;";
    info.textContent=currentMode==="variants"
      ? "Record ONE phrase, then audition 5 Demon and 5 Chorus Alien alternatives. The two current versions are also here for instant A/B comparison. No Flashcards grade, random choice, file or upload; voice stays in temporary RAM."
      : "Record one short verse or phrase from Home. Stop, then replay any of the 10 official effects. Repeat freely; no Flashcards grades or random picks. Voice stays only in temporary iPhone memory.";
    const controls=doc.createElement("div");
    controls.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:6px;";
    const add=(label,kind,fn)=>{
      const b=button(label,fn);
      controls.appendChild(b);buttons.push({node:b,kind});
    };
    add("● Record a Phrase","record",()=>{void record()});
    add("■ Stop Recording","stop",stopCapture);
    add("▶ Original Voice","play",()=>{void playNormal()});
    add("■ Stop Playback","stop-play",stopPlayback);
    const subtitle=doc.createElement("p");
    subtitle.textContent=currentMode==="variants"
      ? "Choose any variation repeatedly (one recording):"
      : "Tap any preset (repeatable):";
    subtitle.style.cssText="font:700 13px sans-serif;margin:10px 0 5px;";
    const grid=doc.createElement("div");
    grid.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;";
    if(currentMode==="variants") {
      // The new entry is a SEPARATE DEV comparison screen; it does not
      // replace original Wacky Lab or silently alter child-facing presets.
      const sections=[
        ["Demon · 5 variations",DEV_VARIANTS.slice(0,5)],
        ["Chorus Alien · 5 variations",DEV_VARIANTS.slice(5,10)],
        ["Current sounds · A/B references",REFERENCE_PRESETS]
      ];
      for(const [heading,presets] of sections) {
        const groupTitle=doc.createElement("p");
        groupTitle.textContent=heading;
        groupTitle.style.cssText="grid-column:1 / -1;font:700 13px sans-serif;" +
          "margin:8px 0 0;";
        grid.appendChild(groupTitle);
        for(const [id,label] of presets) {
          const isDevVariant=DEV_VARIANTS.some(([key])=>key===id);
          const b=button(label,()=>{void playPreset(id,label,isDevVariant)});
          b.setAttribute("data-wacky-variant",id);
          grid.appendChild(b);buttons.push({node:b,kind:"preset"});
        }
      }
    } else {
      PRESETS.forEach(([id,label])=>{
        const b=button(label,()=>{void playPreset(id,label)});
        b.setAttribute("data-wacky-preset",id);
        grid.appendChild(b);buttons.push({node:b,kind:"preset"});
      });
    }
    const status=doc.createElement("p");
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");
    status.style.cssText="font:13px/1.45 sans-serif;min-height:38px;";
    card.append(heading,info,controls,subtitle,grid,status);
    overlay.appendChild(card);
    doc.body.appendChild(overlay);
    backdrop=overlay;statusNode=status;message="";run+=1;
    recorder=root.BibloZooRecording.create({
      onChange:()=> {
        const state=recorder?.snapshot?.();
        if(message==="Saving temporary native RAM take…" &&
            state?.status==="ready" && state?.hasRecording) {
          message="";
        }
        render();
      },
      onInterrupted:()=> {
        cancelAutoStop();
        setMessage("Recording was interrupted. Retry from Record.");
      }
    });
    render();
  }
  doc.addEventListener("visibilitychange",()=>{
    if(!doc.hidden || !backdrop?.isConnected)return;
    run+=1;cancelAutoStop();
    recorder?.stopFun?.();
    recorder?.pause?.();
    recorder?.interruptCapture?.();
    setMessage("Audio stopped on app switch. Tap again only after returning.");
  });
  root.addEventListener("pagehide",()=>{
    if(backdrop?.isConnected)close();
  });
  root.BibloZooWackyLab=Object.freeze({
    open:()=>open("official"),
    openVariants:()=>open("variants"),
    close
  });
})(window);
