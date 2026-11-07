/* N2 native-only diagnostic: explicit-tap AVFoundation samples plus a bounded,
 * read-only Swift session event history. No Web Audio fallback or autoplay.
 * Only in experimental iOS; remove/gate before public release. */
(function installBibloZooNativeSoundSmoke(root) {
  "use strict";

  const SOUND_ID = "pilot-unlock";
  const STAR_ID = "feed-star";
  const CHOMP_ID = "feed-chomp";
  const ALL_SOUND_IDS = Object.freeze([SOUND_ID, STAR_ID, CHOMP_ID]);
  const PANEL_ID = "biblozoo-native-sound-smoke";
  const DEADLINE_MS = 2500;
  const doc = root.document;
  if (!doc) return;

  function isExperimentalIOS() {
    try {
      return root.Capacitor?.isNativePlatform?.() === true &&
        root.Capacitor?.getPlatform?.() === "ios";
    } catch (_) { return false; }
  }

  function bounded(promise) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = root.setTimeout(() => reject(new Error("timeout")), DEADLINE_MS);
      })
    ]).finally(() => root.clearTimeout(timer));
  }

  function safeReason(value) {
    return typeof value === "string" && /^[a-z][a-z0-9-]{0,60}$/.test(value)
      ? value : "unknown-error";
  }

  function mount() {
    if (!isExperimentalIOS() || !doc.body || doc.getElementById(PANEL_ID)) return;

    const panel = doc.createElement("section");
    panel.id = PANEL_ID;
    // app.js' capture-phase global gesture handler explicitly exempts
    // [data-no-ui-sound]. This removes the existing Web Audio UI pop from
    // THIS panel only, so the native MP3 can be heard in isolation.
    panel.setAttribute("data-no-ui-sound", "");
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Experimental native audio test");
    panel.style.cssText =
      "position:fixed;top:calc(env(safe-area-inset-top, 0px) + 8px);right:8px;" +
      "z-index:12000;box-sizing:border-box;max-width:min(235px,70vw);" +
      "padding:9px;border:2px solid #235a66;border-radius:12px;" +
      "background:#f5fcff;color:#122c34;font:14px/1.3 sans-serif;" +
      "box-shadow:0 2px 8px rgba(0,0,0,.35);";

    const top = doc.createElement("div");
    top.style.cssText = "display:flex;gap:6px;align-items:center;justify-content:space-between;";
    const label = doc.createElement("strong");
    label.textContent = "DEV · Native Audio";
    const close = doc.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Dismiss developer audio test");
    close.style.cssText = "min-width:28px;min-height:28px;border-radius:8px;";
    top.appendChild(label);
    top.appendChild(close);

    const play = doc.createElement("button");
    play.type = "button";
    play.textContent = "Play native test sound";
    play.style.cssText =
      "display:block;width:100%;min-height:40px;margin-top:5px;" +
      "font:600 14px sans-serif;border-radius:8px;background:#235a66;color:white;";

    const samplesRow = doc.createElement("div");
    samplesRow.style.cssText = "display:flex;gap:5px;margin-top:6px;";
    function sampleButton(label) {
      const node = doc.createElement("button");
      node.type = "button";
      node.textContent = label;
      node.style.cssText =
        "flex:1;min-width:0;min-height:35px;font:600 12px sans-serif;" +
        "border-radius:7px;background:#dbeef5;color:#153740;";
      samplesRow.appendChild(node);
      return node;
    }
    const playStar = sampleButton("Play star");
    const playChomp = sampleButton("Play chomp");

    const status = doc.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.style.cssText = "margin:6px 0 0;font-size:12px;";
    status.textContent = "Tap to request one native MP3 sound.";

    const inspect = doc.createElement("button");
    inspect.type = "button";
    inspect.textContent = "Inspect native state (no sound)";
    inspect.style.cssText =
      "display:block;width:100%;min-height:36px;margin-top:7px;" +
      "font:12px sans-serif;border-radius:7px;";

    const detail = doc.createElement("p");
    detail.setAttribute("aria-label", "Read-only native audio interruption details");
    detail.style.cssText =
      "margin:5px 0 0;font:11px/1.35 monospace;overflow-wrap:anywhere;";
    detail.textContent = "Inspect after the first and second taps.";

    panel.appendChild(top);
    panel.appendChild(play);
    panel.appendChild(samplesRow);
    panel.appendChild(status);
    panel.appendChild(inspect);
    panel.appendChild(detail);
    doc.body.appendChild(panel);

    let epoch = 0;
    let busy = false;
    let dismissed = false;
    function setBusy(value) {
      busy = value;
      for (const button of [play, playStar, playChomp]) button.disabled = value;
    }
    function plugin() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
    function count(value) { return Number.isInteger(value) && value >= 0 ? value : "?"; }
    async function inspectNativeState() {
      const api = plugin();
      if (typeof api?.getDebugState !== "function") {
        detail.textContent = "Read-only state bridge unavailable. Rebuild Xcode app.";
        return;
      }
      try {
        const state = await bounded(api.getDebugState());
        if (dismissed || doc.hidden) return;
        if (state?.available !== true) {
          detail.textContent = "Native state unavailable.";
          return;
        }
        const life = ["active", "inactive", "background"].includes(state.appState)
          ? state.appState : "unknown";
        const recent = Array.isArray(state.recentEvents)
          ? state.recentEvents.slice(-8).map(event =>
              "#" + count(event.seq) + ":" + safeReason(event.kind) +
              "@" + count(event.elapsedMs) + "ms").join(" / ")
          : "";
        detail.textContent =
          "app=" + life + " pending=" + (state.pending === true ? "YES" : "no") +
          " last=" + safeReason(state.lastSignal) +
          " events=" + count(state.eventCount) +
          " began=" + count(state.beganCount) +
          " ended=" + count(state.endedCount) +
          " suspended=" + count(state.suspendedCount) +
          " route=" + count(state.routeCount) +
          " reasonCode=" + (Number.isInteger(state.lastReasonCode) ? state.lastReasonCode : "?") +
          " ageMs=" + (Number.isInteger(state.lastAgeMs) ? state.lastAgeMs : "?") +
          " foregroundEpoch=" + count(state.foregroundEpoch) +
          " reset=" + count(state.mediaResetCount) +
          " activationAttempts=" + count(state.activationAttemptsTotal) +
          " activation=" + safeReason(state.lastActivationResult) +
          // Timing is diagnostic only: low native timings with a visible
          // hitch imply we must investigate the game/UI or decode elsewhere.
          " lastSound=" + safeReason(state.lastNativePlayedSoundId) +
          " prepMs=" + count(state.lastNativePrepareMs) +
          " queueMs=" + count(state.lastNativePlayQueueMs) +
          " playMs=" + count(state.lastNativePlayCallMs) +
          (recent ? " trace=" + recent : "");
      } catch (_) {
        if (!dismissed && !doc.hidden) detail.textContent = "Native state read failed or timed out.";
      }
    }
    // The browser ignores event-return values; returning the Promise also
    // lets the Node VM regression await this read-only status inspection.
    inspect.addEventListener("click", () => inspectNativeState());

    function stopQuietly() {
      const api = plugin();
      if (typeof api?.stop !== "function") return;
      // All three are fixed allowlisted IDs; no URLs or user-provided paths.
      for (const soundId of ALL_SOUND_IDS) {
        try {
          Promise.resolve(api.stop({ soundId })).catch(() => {});
        } catch (_) { /* A failed developer stop must never block the app. */ }
      }
    }
    function current(token) {
      return !dismissed && token === epoch && !doc.hidden;
    }
    function onHidden() {
      if (!doc.hidden || dismissed) return;
      epoch += 1;
      setBusy(false);
      status.textContent = "Stopped on background. Tap again after returning.";
      stopQuietly();
    }
    doc.addEventListener("visibilitychange", onHidden);

    close.addEventListener("click", () => {
      dismissed = true;
      epoch += 1;
      stopQuietly();
      doc.removeEventListener("visibilitychange", onHidden);
      panel.remove();
    });

    async function playSelected(soundId, label) {
      if (busy || dismissed || doc.hidden || !ALL_SOUND_IDS.includes(soundId)) return;
      const api = plugin();
      if (typeof api?.activateFromGesture !== "function" ||
          typeof api?.preload !== "function" || typeof api?.play !== "function") {
        status.textContent = "Native session bridge missing. Check the Xcode build.";
        return;
      }
      const token = ++epoch;
      setBusy(true);
      status.textContent = "Checking native session for " + label + "…";
      try {
        // N2: OS activation is requested ONLY on an explicit child/DEV tap;
        // the Swift plugin does not reactivate from foreground notifications.
        const session = await bounded(api.activateFromGesture({ purpose: "dev" }));
        if (!current(token)) return;
        if (session?.ready !== true) {
          status.textContent = "Native session not ready: " +
            safeReason(session?.reason) + ". No sound requested.";
          return;
        }
        status.textContent = "Preparing native " + label + " MP3…";
        const prepared = await bounded(api.preload({ soundId }));
        if (!current(token)) return;
        if (prepared?.prepared !== true) {
          // A blocked prepare NEVER invokes this button's play call.
          status.textContent = prepared?.reason === "interruption-pending"
            ? "No new native sound requested: iOS interruption pending. Return to app and tap again."
            : "Could not prepare: " + safeReason(prepared?.reason);
          return;
        }
        const signal = safeReason(prepared?.lastInterruptionSignal);
        const note = signal === "foreground-activation-accepted"
          ? " OS accepted native activation after foreground return."
          : signal === "suspended-began"
            ? " iOS reported a past suspension."
            : "";
        status.textContent = "Requesting native playback…";
        const started = await bounded(api.play({ soundId, volume: 0.85 }));
        if (!current(token)) { stopQuietly(); return; }
        status.textContent = started?.accepted === true
          ? "Native " + label + " playback requested. Did you hear the sound?" + note
          : "Native " + label + " play failed: " + safeReason(started?.reason);
      } catch (_) {
        if (current(token)) {
          status.textContent = "Native bridge error or timeout. No sound confirmed.";
          stopQuietly();
        }
      } finally {
        if (current(token)) setBusy(false);
      }
    }
    play.addEventListener("click", () => playSelected(SOUND_ID, "pet-unlock"));
    playStar.addEventListener("click", () => playSelected(STAR_ID, "star"));
    playChomp.addEventListener("click", () => playSelected(CHOMP_ID, "chomp"));
  }

  if (doc.readyState === "complete") mount();
  else root.addEventListener("load", mount, { once: true });

  // Some iOS bridge versions finish initializing after the page load event.
  // One delayed UI-only check is permitted. It does not request audio.
  root.setTimeout(mount, 1500);
})(window);
