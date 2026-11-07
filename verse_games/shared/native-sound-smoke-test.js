/* N2 native-only diagnostic: explicit-tap AVFoundation samples plus a bounded,
 * read-only Swift session event history. No Web Audio fallback or autoplay.
 * Only in experimental iOS; remove/gate before public release. */
(function installBibloZooNativeSoundSmoke(root) {
  "use strict";

  const SOUND_ID = "pilot-unlock";
  const STAR_ID = "feed-star";
  const CHOMP_ID = "feed-chomp";
  const MELODY_ID = "feed-melody";
  const MELODY_TEST_MIDI = 64; // E4, a single fixed note, not a tune.
  const ALL_SOUND_IDS = Object.freeze([SOUND_ID, STAR_ID, CHOMP_ID, MELODY_ID]);
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
      "max-height:min(72vh,560px);overflow-y:auto;" +
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
    const playMelody = sampleButton("Melody E4");

    // N5b.1: isolated long-form narration experiment. These buttons
    // never change the children's Learn progress or play automatically.
    const narrationRow = doc.createElement("div");
    narrationRow.style.cssText =
      "border-top:1px solid #a6cbd5;margin-top:8px;padding-top:7px;" +
      "display:flex;gap:4px;flex-wrap:wrap;";
    const narrationTitle = doc.createElement("strong");
    narrationTitle.textContent = "N5b.1 · Learn narration";
    narrationTitle.style.cssText = "width:100%;font-size:12px;";
    narrationRow.appendChild(narrationTitle);
    function narrationButton(label) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText =
        "flex:1 1 45%;min-height:36px;border-radius:7px;" +
        "font:600 11px sans-serif;background:#dbeef5;color:#153740;";
      narrationRow.appendChild(button);
      return button;
    }
    const playNarration = narrationButton("Play John 3:16");
    const pauseNarration = narrationButton("Pause");
    const seekNarration = narrationButton("Skip +5s");
    const resumeNarration = narrationButton("Continue");
    const stateNarration = narrationButton("Read position");
    const narrationStatus = doc.createElement("p");
    narrationStatus.setAttribute("role", "status");
    narrationStatus.setAttribute("aria-live", "polite");
    narrationStatus.style.cssText = "width:100%;margin:0;font:11px/1.3 sans-serif;";
    narrationStatus.textContent =
      "DEV preview only. Learn screens are not migrated in this slice.";
    narrationRow.appendChild(narrationStatus);

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

    // N2.2: NO report recording/upload or clipboard read on load. The native
    // plugin keeps a fixed-schema last-80-event in-memory ring. User taps
    // Copy only after playing; Swift writes text to the iOS clipboard.
    const timingPanel = doc.createElement("div");
    timingPanel.style.cssText =
      "border-top:1px solid #a6cbd5;margin-top:7px;padding-top:7px;";
    const timingTitle = doc.createElement("strong");
    timingTitle.textContent = "DEV · Audio Timing";
    const timingHelp = doc.createElement("p");
    timingHelp.textContent =
      "Play normally, then copy the last 80 sounds to paste into chat. No screenshots.";
    timingHelp.style.cssText = "font:11px/1.3 sans-serif;margin:4px 0;";
    const copyTiming = doc.createElement("button");
    copyTiming.type = "button";
    copyTiming.textContent = "Copy Audio Timing Report";
    copyTiming.setAttribute("aria-label", "Copy recent native audio timing report");
    copyTiming.style.cssText =
      "width:100%;min-height:40px;border-radius:8px;font:600 12px sans-serif;";
    const markLate = doc.createElement("button");
    markLate.type = "button";
    markLate.textContent = "Mark last chomp late (optional)";
    markLate.style.cssText =
      "width:100%;min-height:34px;margin-top:4px;border-radius:7px;font:11px sans-serif;";
    const reportStatus = doc.createElement("p");
    reportStatus.setAttribute("role", "status");
    reportStatus.setAttribute("aria-live", "polite");
    reportStatus.style.cssText = "font:11px/1.3 sans-serif;margin:4px 0 0;";
    reportStatus.textContent = "Report stays on this iPhone until you choose to copy it.";
    timingPanel.appendChild(timingTitle);
    timingPanel.appendChild(timingHelp);
    timingPanel.appendChild(copyTiming);
    timingPanel.appendChild(markLate);
    timingPanel.appendChild(reportStatus);
    panel.appendChild(timingPanel);
    // Keep the original DEV panel child order for older test/owner controls.
    panel.appendChild(narrationRow);
    doc.body.appendChild(panel);

    let epoch = 0;
    let busy = false;
    let dismissed = false;
    function setBusy(value) {
      busy = value;
      for (const button of [play, playStar, playChomp, playMelody,
        playNarration, pauseNarration, seekNarration, resumeNarration, stateNarration]) {
        button.disabled = value;
      }
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
          " backend=" + safeReason(state.lastNativeBackend) +
          " prepMs=" + count(state.lastNativePrepareMs) +
          " queueMs=" + count(state.lastNativePlayQueueMs) +
          " playMs=" + count(state.lastNativePlayCallMs) +
          (recent ? " trace=" + recent : "");
      } catch (_) {
        if (!dismissed && !doc.hidden) detail.textContent = "Native state read failed or timed out.";
      }
    }
    copyTiming.addEventListener("click", async () => {
      const api = plugin();
      if (typeof api?.copyTimingReport !== "function") {
        reportStatus.textContent = "Native report bridge missing. Rebuild the test app.";
        return;
      }
      copyTiming.disabled = true;
      reportStatus.textContent = "Copying recent native timings…";
      try {
        const result = await bounded(api.copyTimingReport());
        if (dismissed) return;
        reportStatus.textContent = result?.copied === true
          ? "Copied " + count(result.count) + " sounds! Paste into ChatGPT when ready."
          : "Not copied: " + safeReason(result?.reason);
      } catch (_) {
        if (!dismissed) reportStatus.textContent = "Copy failed. Try again.";
      } finally {
        copyTiming.disabled = false;
      }
    });

    markLate.addEventListener("click", async () => {
      const api = plugin();
      if (typeof api?.markRecentChompLate !== "function") {
        reportStatus.textContent = "Native late-sound marker unavailable. Rebuild app.";
        return;
      }
      markLate.disabled = true;
      try {
        const result = await bounded(api.markRecentChompLate());
        if (dismissed) return;
        reportStatus.textContent = result?.marked === true
          ? "Most recent chomp flagged late (#" + count(result.seq) +
            "). Copy report when finished."
          : "No chomp played in the last minute. You can still copy the report.";
      } catch (_) {
        if (!dismissed) reportStatus.textContent = "Marker failed; report remains available.";
      } finally {
        markLate.disabled = false;
      }
    });

    // The browser ignores event-return values; returning the Promise also
    // lets the Node VM regression await this read-only status inspection.
    inspect.addEventListener("click", () => inspectNativeState());

    function stopQuietly() {
      // The narration player is independent of the fixed Feeding PCM bank.
      // Closing or hiding DEV must never let a long clip continue.
      root.BibloZooNativeLearnNarrationPilot?.stop?.();
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
        status.textContent = "Preparing native " + label +
          (soundId === MELODY_ID ? " tone bank…" : " MP3…");
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
        const request = soundId === MELODY_ID
          ? { soundId, volume: 0.25, midi: MELODY_TEST_MIDI }
          : { soundId, volume: 0.85 };
        const started = await bounded(api.play(request));
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
    playMelody.addEventListener("click",
      () => playSelected(MELODY_ID, "Melody E4"));

    const learnPilot = root.BibloZooNativeLearnNarrationPilot;
    function narrationFeedback(event) {
      if (dismissed || doc.hidden) return;
      if (event.kind === "ended") {
        narrationStatus.textContent =
          "Native completion event received. Did you hear the entire clip?";
      } else if (event.kind === "interrupted") {
        narrationStatus.textContent =
          "Narration stopped on interruption. Tap Play again; no auto-replay.";
      } else if (event.kind === "failed") {
        narrationStatus.textContent =
          "Native narrator unavailable (" + safeReason(event.reason) + ").";
      } else if (event.kind === "playing") {
        narrationStatus.textContent =
          "Native playback accepted. Did you hear the verse?";
      } else if (event.kind === "preparing") {
        narrationStatus.textContent = "Preparing native verse audio…";
      }
    }
    playNarration.addEventListener("click", async () => {
      if (busy || dismissed || doc.hidden) return;
      if (!learnPilot?.isAvailable?.()) {
        narrationStatus.textContent = "Native Learn pilot missing. Rebuild the test app.";
        return;
      }
      setBusy(true);
      try {
        const result = await learnPilot.startFromGesture(narrationFeedback);
        if (!dismissed && !doc.hidden && result?.ready !== true) {
          narrationStatus.textContent =
            "Narrator did not start (" + safeReason(result?.reason) + ").";
        }
      } finally { if (!dismissed) setBusy(false); }
    });
    pauseNarration.addEventListener("click", async () => {
      const result = await learnPilot?.pause?.();
      if (!dismissed && !doc.hidden) narrationStatus.textContent =
        result?.paused === true
          ? "Paused at " + Math.round((result.positionMs || 0) / 1000) + " seconds."
          : "Pause unavailable. Tap Play to start a new request.";
    });
    seekNarration.addEventListener("click", async () => {
      const result = await learnPilot?.seekForward?.();
      if (!dismissed && !doc.hidden) narrationStatus.textContent =
        result?.seeked === true
          ? "Moved to " + Math.round((result.positionMs || 0) / 1000) + " seconds."
          : "Seek unavailable for this narration.";
    });
    resumeNarration.addEventListener("click", async () => {
      const result = await learnPilot?.resume?.();
      if (!dismissed && !doc.hidden) narrationStatus.textContent =
        result?.accepted === true
          ? "Native narrator continued. Did you hear it?"
          : "Continue unavailable; tap Play for a fresh request.";
    });
    stateNarration.addEventListener("click", async () => {
      const result = await learnPilot?.state?.();
      if (!dismissed && !doc.hidden) narrationStatus.textContent =
        result?.prepared === true
          ? (result.playing ? "Playing " : result.ended ? "Ended " : "Paused ") +
            Math.round((result.positionMs || 0) / 1000) + " / " +
            Math.round((result.durationMs || 0) / 1000) + " seconds."
          : "No prepared native narration.";
    });
  }

  if (doc.readyState === "complete") mount();
  else root.addEventListener("load", mount, { once: true });

  // Some iOS bridge versions finish initializing after the page load event.
  // One delayed UI-only check is permitted. It does not request audio.
  root.setTimeout(mount, 1500);
})(window);
