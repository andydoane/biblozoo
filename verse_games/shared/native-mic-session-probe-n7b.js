/* N7b — opt-in native iOS Audio Test microphone/session DEV proof ONLY.
 * No Flashcards hooks, no automatic permission, no recorded take/HTML output.
 */
(function installN7bMicProbe(root) {
  "use strict";
  const doc = root.document;
  if (!doc) return;
  const ID = "biblozoo-n7b-microphone-probe";
  const REQUEST_TIMEOUT_MS = 8000;
  let epoch = 0;
  let closed = false;
  let poll = null;
  function isExperimentalIOS() {
    try {
      return root.Capacitor?.isNativePlatform?.() === true &&
        root.Capacitor?.getPlatform?.() === "ios" &&
        root.BibloZooNativeOnlyOutput?.enabled === true;
    } catch (_) { return false; }
  }
  function micApi() { return root.Capacitor?.Plugins?.BibloZooMicSessionProbe; }
  function outputApi() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function safe(value) {
    return typeof value === "string" && /^[a-z][a-z0-9-]{0,60}$/.test(value)
      ? value : "unknown";
  }
  function bounded(promise) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = root.setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS);
      })
    ]).finally(() => root.clearTimeout(timer));
  }
  function mount() {
    if (!isExperimentalIOS() || !doc.body || doc.getElementById(ID)) return;
    const panel = doc.createElement("section");
    panel.id = ID;
    panel.setAttribute("data-no-ui-sound", "");
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "N7b experimental microphone session test");
    panel.style.cssText =
      "position:fixed;bottom:calc(env(safe-area-inset-bottom, 0px) + 8px);" +
      "left:8px;z-index:12001;box-sizing:border-box;max-width:min(245px,70vw);" +
      "max-height:40vh;overflow-y:auto;padding:8px;border:2px solid #4b5576;" +
      "border-radius:10px;background:#fcfcff;color:#172039;" +
      "font:12px/1.35 sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3);";
    const top = doc.createElement("div");
    top.style.cssText = "display:flex;justify-content:space-between;gap:5px;";
    const label = doc.createElement("strong");
    label.textContent = "DEV · N7b Mic Test";
    const close = doc.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close microphone DEV test");
    top.appendChild(label); top.appendChild(close);panel.appendChild(top);
    const info = doc.createElement("p");
    info.style.cssText = "margin:4px 0;";
    info.textContent = "Home/quiet only. 4-second mic LEVEL test, no voice saved or played. Finish then tap native sound separately.";
    panel.appendChild(info);
    function button(label) {
      const b = doc.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText =
        "display:block;width:100%;min-height:36px;margin:4px 0;" +
        "font:600 12px sans-serif;border-radius:7px;background:#dbe3fc;color:#1c2750;";
      panel.appendChild(b);return b;
    }
    const grant = button("1 · Request Mic Permission");
    const begin = button("2 · Test Mic for 4 Seconds");
    const stop = button("Stop / Restore Session");
    const inspect = button("Inspect (no mic activity)");
    const status = doc.createElement("p");
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");
    status.style.cssText = "margin:4px 0;font:11px/1.3 sans-serif;";
    status.textContent = "No microphone request or capture on app launch.";
    const snapshot = doc.createElement("p");
    snapshot.setAttribute("aria-label","Mic/session state");
    snapshot.style.cssText = "margin:4px 0;font:10px/1.3 monospace;overflow-wrap:anywhere;";
    snapshot.textContent = "Inspect to see permission and current audio route.";
    panel.appendChild(status);panel.appendChild(snapshot);
    doc.body.appendChild(panel);

    let busy = false;
    let listening = false;
    function setBusy(value) {
      busy = value;
      grant.disabled = value || listening;
      begin.disabled = value || listening;
      stop.disabled = value;
      inspect.disabled = value;
    }
    function current(token) { return !closed && !doc.hidden && token === epoch; }
    function stopPolling() {
      if (poll !== null) root.clearInterval(poll);
      poll = null;
    }
    async function inspectState() {
      const api = micApi();
      if (typeof api?.getProbeState !== "function") {
        if (!closed) snapshot.textContent = "N7b native bridge missing. Rebuild Xcode App.";
        return null;
      }
      try {
        const s = await bounded(api.getProbeState());
        if (closed || doc.hidden) return s;
        const allowedPermission = ["undetermined","granted","denied","unknown"];
        const permission = allowedPermission.includes(s?.permission) ? s.permission : "unknown";
        const ports = Array.isArray(s?.inputPorts)
          ? s.inputPorts.filter(x=>typeof x==="string").slice(0,2).join(",") : "";
        const peak = Number.isInteger(s?.peakPercent) ? s.peakPercent : 0;
        snapshot.textContent = "permission=" + permission +
          " mic=" + (s?.running===true ? "ON" : "off") +
          " levelPeak=" + peak + "/100" +
          " buffers=" + (Number.isInteger(s?.buffersObserved) ? s.buffersObserved : 0) +
          " otherAudio=" + (s?.otherAudioPlaying===true ? "yes" : "no") +
          " input=" + (ports || "none") +
          " category=" + (typeof s?.category==="string" ? s.category : "unknown") +
          " restored=" + (s?.restored===true ? "yes" : "NO") +
          " reason=" + safe(s?.reason);
        if (listening && s?.running !== true) {
          listening = false;
          stopPolling();
          setBusy(false);
          status.textContent = s?.restored===true
            ? "Mic test ended and session restored. Use a NEW sound tap to resume."
            : "Mic ended but session restoration needs attention. Do not run games yet.";
        }
        return s;
      } catch (_) {
        if (!closed && !doc.hidden) snapshot.textContent = "State read timed out; use Stop / Restore.";
        return null;
      }
    }

    grant.addEventListener("click", async () => {
      if (busy || listening || closed || doc.hidden) return;
      const api = micApi();
      if (typeof api?.requestPermission !== "function") {
        status.textContent = "Native mic bridge missing. Rebuild Xcode App.";
        return;
      }
      const token = ++epoch;
      setBusy(true);status.textContent = "Waiting for iOS microphone permission choice…";
      try {
        const r = await bounded(api.requestPermission());
        if (!current(token)) return;
        status.textContent = r?.granted === true
          ? "Permission GRANTED. Next: tap Test Mic, only while Home is quiet."
          : "Mic permission not granted (" + safe(r?.reason) +
            "). If denied, change it in iOS Settings.";
        await inspectState();
      } catch (_) {
        if (current(token)) status.textContent = "Permission request failed or timed out.";
      } finally { if (current(token)) setBusy(false); }
    });

    begin.addEventListener("click", async () => {
      if (busy || listening || closed || doc.hidden) return;
      const mic = micApi(), output = outputApi();
      if (typeof mic?.beginProbe !== "function" ||
          typeof output?.devPrepareForMicrophone !== "function") {
        status.textContent = "N7b mic or audio handoff bridge missing. Rebuild Xcode.";
        return;
      }
      const token = ++epoch;
      setBusy(true);status.textContent = "Stopping DEV output worker before mic handoff…";
      try {
        const cleared = await bounded(output.devPrepareForMicrophone());
        if (!current(token)) return;
        if (cleared?.prepared !== true) {
          status.textContent = "Mic not started: output handoff " + safe(cleared?.reason);
          return;
        }
        status.textContent = "Requesting temporary native mic/measurement session…";
        const r = await bounded(mic.beginProbe());
        if (!current(token)) {
          try { void Promise.resolve(mic.endProbe()).catch(()=>{}); } catch (_) {}
          return;
        }
        if (r?.started !== true) {
          status.textContent = "Mic not started: " + safe(r?.reason) +
            ". The output bank will need a new sound tap.";
          await inspectState();return;
        }
        listening = true;
        status.textContent = "Mic LEVEL test running (4s maximum). Speak, then watch levelPeak. No voice saved.";
        await inspectState();
        poll = root.setInterval(() => { void inspectState(); }, 300);
      } catch (_) {
        if (current(token)) status.textContent = "Mic setup failed/timed out. Use Stop / Restore.";
        try { void Promise.resolve(mic?.endProbe?.()).catch(()=>{}); } catch (_) {}
      } finally { if (current(token)) setBusy(false); }
    });

    async function end(reason) {
      const mic = micApi();
      epoch += 1;
      listening = false;
      stopPolling();
      if (!closed) status.textContent = reason === "user"
        ? "Stopping mic and restoring original session…" :
          "Mic test stopped on app exit/inactivity.";
      try {
        const r = await bounded(mic?.endProbe?.());
        if (!closed && !doc.hidden) {
          status.textContent = r?.restored === true
            ? "Session restored. Tap native sound again (no automatic resume)."
            : "Could not confirm session restoration. Check native state.";
        }
      } catch (_) {
        if (!closed && !doc.hidden) status.textContent = "Stop failed. Check Xcode state.";
      }
      if (!closed && !doc.hidden) { setBusy(false);await inspectState(); }
    }
    stop.addEventListener("click", () => { void end("user"); });
    inspect.addEventListener("click", () => { void inspectState(); });
    function onHidden() {
      if (!doc.hidden) return;
      void end("inactive");
    }
    doc.addEventListener("visibilitychange", onHidden);
    close.addEventListener("click", () => {
      void end("dismissed");
      closed = true;
      doc.removeEventListener("visibilitychange", onHidden);
      stopPolling();
      panel.remove();
    });
  }
  if (doc.readyState === "complete") mount();
  else root.addEventListener("load", mount, {once:true});
  // UI mount ONLY; never a microphone permission request or session start.
  root.setTimeout(mount,1500);
})(window);
