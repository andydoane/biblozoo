/* N7f.2: native Audio Test ONLY. Owner-auditionable fixed note patterns.
 * No child-facing preference change, mic, file, WebAudio or automatic sound.
 */
(function installReadCueWaveformLab(root) {
  "use strict";
  const doc = root.document;
  const allowed = () => root.BibloZooNativeOnlyOutput?.enabled === true &&
    root.Capacitor?.isNativePlatform?.() === true &&
    root.Capacitor?.getPlatform?.() === "ios";
  if (!allowed() || !doc) return;
  const api = () => root.Capacitor?.Plugins?.BibloZooNativeReadOutput;
  const waveforms = Object.freeze([
    ["current", "Current Native"],
    ["web-triangle", "Web-like Triangle"],
    ["sine", "Pure Sine"],
    ["soft-square", "Rounded Square"],
    ["sawtooth", "Sawtooth"],
    ["warm", "Warm Triangle + Sine"]
  ]);
  const samples = Object.freeze([
    ["scramble-word", "Unscramble · Word Beep"],
    ["scramble-finish", "Unscramble · Finish Tune"],
    ["order-finish", "Tap Words in Order · Ending Tune"]
  ]);
  let overlay=null, status=null, request=0;
  function button(label, callback) {
    const b=doc.createElement("button");
    b.type="button";
    b.setAttribute("data-no-ui-sound","");
    b.textContent=label;
    b.style.cssText="min-height:44px;padding:9px 10px;border:1px solid #819aa2;" +
      "border-radius:12px;background:#fff;color:#133b4a;font:800 13px sans-serif;" +
      "cursor:pointer;text-align:center;";
    b.addEventListener("click",callback);
    return b;
  }
  function say(text) {
    if(status) status.textContent=text;
  }
  function stopSound() {
    request++;
    try { void Promise.resolve(api()?.stopCues?.()).catch(()=>{}); }
    catch(_) {}
    say("Stopped. Choose another sample whenever you like.");
  }
  function close() {
    request++;
    try { void Promise.resolve(api()?.stopCues?.()).catch(()=>{}); }
    catch(_) {}
    overlay?.remove();
    overlay=null; status=null;
  }
  async function play(sample,waveform,label) {
    if (!overlay || doc.hidden || !api()?.auditionCue) return;
    const token=++request;
    say("Playing "+label+"…");
    try {
      // ONE fresh user button tap. Swift checks exact .audiotest bundle,
      // a fixed sample/waveform enum and current nonmixing audio policy.
      const result=await api().auditionCue({sample,waveform});
      if (token!==request || !overlay) return;
      say(result?.played===true
        ? "Played "+label+". Compare it with Current Native or another shape."
        : "Audio unavailable ("+String(result?.reason||"device-refused")+
          "). Tap the sample again to retry.");
    } catch(_) {
      if(token===request) say("Native output was refused. Try a fresh tap.");
    }
  }
  function open() {
    if (!allowed() || !doc.body || doc.hidden) return;
    close();
    const backdrop=doc.createElement("div");
    backdrop.id="biblozoo-n7f2-waveform-lab";
    backdrop.setAttribute("data-no-ui-sound","");
    backdrop.setAttribute("role","dialog");
    backdrop.setAttribute("aria-label","Read My Verse Native Beep Waveform Lab");
    backdrop.style.cssText="position:fixed;inset:0;z-index:25001;" +
      "background:rgba(7,20,32,.86);padding:" +
      "max(20px,env(safe-area-inset-top,20px)) 13px " +
      "max(20px,env(safe-area-inset-bottom,20px));box-sizing:border-box;" +
      "display:flex;align-items:center;justify-content:center;";
    const card=doc.createElement("section");
    card.style.cssText="box-sizing:border-box;width:min(100%,540px);" +
      "max-height:100%;overflow-y:auto;background:#f9feff;" +
      "border-radius:23px;padding:18px;color:#173440;" +
      "font:15px/1.35 system-ui,sans-serif;";
    const header=doc.createElement("div");
    header.style.cssText="display:flex;gap:12px;align-items:center;" +
      "justify-content:space-between;";
    const title=doc.createElement("strong");
    title.textContent="Read My Verse · Beep Wave Lab";
    title.style.cssText="font-size:20px;";
    const exit=button("×",close);
    exit.setAttribute("aria-label","Close Read Beep Lab and stop sound");
    header.append(title,exit);card.appendChild(header);
    const introduction=doc.createElement("p");
    introduction.textContent="Compare SIX wave shapes on the SAME fixed notes " +
      "for Unscramble and Tap Words in Order. Current Native is the " +
      "UNCHANGED child-facing sound. These choices do not save or alter " +
      "the games; tell me which shape you prefer for each tune.";
    card.appendChild(introduction);
    for(const [sample,heading] of samples) {
      const sectionTitle=doc.createElement("h3");
      sectionTitle.textContent=heading;
      sectionTitle.style.cssText="font-size:16px;margin:14px 0 7px;";
      card.appendChild(sectionTitle);
      const grid=doc.createElement("div");
      grid.style.cssText="display:grid;grid-template-columns:" +
        "repeat(2,minmax(0,1fr));gap:7px;";
      for(const [waveform,name] of waveforms) {
        const item=button(name,()=>{void play(sample,waveform,
          heading+" / "+name);});
        item.setAttribute("data-read-waveform",waveform);
        item.setAttribute("data-read-sample",sample);
        grid.appendChild(item);
      }
      card.appendChild(grid);
    }
    const actions=doc.createElement("div");
    actions.style.cssText="margin-top:15px;display:flex;gap:8px;";
    actions.appendChild(button("■ Stop Sound",stopSound));
    const response=doc.createElement("p");
    response.style.cssText="font-weight:700;min-height:36px;margin:10px 0 0;";
    response.setAttribute("role","status");
    response.setAttribute("aria-live","polite");
    response.textContent="Nothing plays until you tap a waveform.";
    status=response;card.append(actions,response);
    backdrop.appendChild(card);
    doc.body.appendChild(backdrop);
    overlay=backdrop;
  }
  doc.addEventListener("visibilitychange",()=>{if(doc.hidden)close();});
  root.addEventListener?.("pagehide",close);
  root.BibloZooNativeReadCueLab=Object.freeze({
    open,close,
    waveforms:waveforms.map(([id])=>id),
    samples:samples.map(([id])=>id)
  });
})(window);
