/* N6q native-only Verse Jam: finite PCM notes/drums/pads, five recorded voice bits,
 * and two native UI pops. One serialized Swift AVAudioEngine and .soloAmbient session.
 * The JS game owns musical scheduling and never uses Web/HTML output on iOS.
 */
(function installNativeVerseJamAudio(root) {
  "use strict";
  const UI = Object.freeze(["ui-pop-1", "ui-pop-2"]);
  const VOICES = Object.freeze(["boom", "hey", "woo", "yeah", "yo"]);
  const DRUMS = Object.freeze(["kick", "snare", "hat", "extra"]);
  const IDS = Object.freeze([...UI, ...VOICES.map(x => "jam-voice-" + x),
    ...DRUMS.map(x => "jam-drum-" + x), "jam-note", "jam-pad"]);
  const TEMPORARY = new Set(["other-audio-playing", "interruption-pending",
    "gesture-required-after-interruption", "not-foreground", "stale",
    "activation-cooldown", "foreground-attempt-limit", "activation-os-rejected"]);
  const PREPARE_TIMEOUT = 30000, SESSION_TIMEOUT = 1800, PLAY_TIMEOUT = 1800;
  let generation = 0, ready = false, failed = false, lastError = "";
  let uiReady = false, uiPromise = null, teardown = Promise.resolve();
  // Multiple UIKit/visibility/Welcome Back callbacks may report one
  // interruption. Teardown exactly once, not once per duplicated observer.
  let bankOwned = false;
  let eventNumber = 0, bound = false, onFailure = null, onInactive = null, onActive = null;
  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function api() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function safeReason(value) {
    return typeof value === "string" && /^[a-z][a-z0-9-]{0,65}$/.test(value)
      ? value : "native-error";
  }
  function bounded(promise, ms) {
    let id;
    return Promise.race([Promise.resolve(promise),
      new Promise((_, reject) => {
        id = root.setTimeout(() => reject(Error("timeout")), ms);
      })]).finally(() => root.clearTimeout(id));
  }
  function current(token) {
    return generation === token && isAvailable() && !root.document?.hidden;
  }
  function stopNative() {
    if (!isAvailable()) return Promise.resolve();
    try {
      return Promise.resolve(api()?.stop?.({soundId: "jam-note"})).catch(() => {});
    } catch (_) { return Promise.resolve(); }
  }
  function stop() {
    if (!bankOwned && !ready && !uiReady) return teardown;
    bankOwned = false;
    generation++;
    ready = false;
    uiReady = false;
    failed = false;
    teardown = stopNative();
    return teardown;
  }
  function temporary(why) {
    lastError = safeReason(why);
    void stop();
    try { onInactive?.(); } catch (_) {}
    if (!root.document?.hidden) { try { onActive?.(); } catch (_) {} }
  }
  function markFailed(token, why) {
    if (!current(token) || failed) return;
    const reason = safeReason(why);
    if (TEMPORARY.has(reason)) { temporary(reason); return; }
    ready = false;
    uiReady = false;
    failed = true;
    lastError = reason;
    teardown = stopNative();
    try { onFailure?.(reason); } catch (_) {}
  }
  function bind() {
    if (bound || !isAvailable()) return;
    bound = true;
    const invalidate = () => { void stop(); };
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", invalidate);
    root.addEventListener?.("blur", invalidate);
    try {
      void Promise.resolve(api()?.addListener?.("biblozooAppLifecycle", event => {
        invalidate();
        if (event?.active === false) {
          try { onInactive?.(); } catch (_) {}
        } else if (event?.active === true) {
          try { onActive?.(); } catch (_) {}
        }
      })).catch(() => {});
    } catch (_) {}
  }
  function configure({onPlaybackFailure, onAppInactive, onAppActive} = {}) {
    onFailure = typeof onPlaybackFailure === "function" ? onPlaybackFailure : null;
    onInactive = typeof onAppInactive === "function" ? onAppInactive : null;
    onActive = typeof onAppActive === "function" ? onAppActive : null;
  }
  function send(soundId, volume, extra = {}, isUi = false) {
    if (!isAvailable() || root.document?.hidden ||
        !Number.isFinite(volume) || volume < 0 || volume > 1 ||
        !(isUi ? uiReady : ready) || failed || !IDS.includes(soundId))
      return false;
    const token = generation;
    const eventId = "jam-" + (++eventNumber);
    try {
      void bounded(api().play({
        soundId, volume, ...extra, eventId, requestEpochMs: Date.now()
      }), PLAY_TIMEOUT).then(result => {
        if (current(token) && result?.accepted !== true)
          markFailed(token, result?.reason);
      }).catch(() => { if (current(token)) markFailed(token, "play-timeout"); });
      return true; // scheduled, not proof speaker output is audible
    } catch (_) {
      markFailed(token, "play-bridge-error"); return false;
    }
  }
  function tapUiFromGesture(index = 0, volume = 0.12) {
    if (!isAvailable() || root.document?.hidden || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1) return false;
    bind();
    const soundId = UI[index % UI.length];
    if (ready || uiReady) return send(soundId, volume, {}, true);
    if (uiPromise) return false;
    const token = ++generation, startedAt = Date.now();
    bankOwned = true;
    let activation;
    try { activation = api()?.activateFromGesture({purpose:"ui"}); }
    catch (_) { return false; }
    const prior = teardown;
    const pending = (async () => {
      try {
        await bounded(prior, SESSION_TIMEOUT);
        const session = await bounded(activation, SESSION_TIMEOUT);
        if (!current(token) || session?.ready !== true) return false;
        const results = await bounded(Promise.all(UI.map(id => api().preload({soundId:id}))), PREPARE_TIMEOUT);
        if (!current(token) || results.some(x => x?.prepared !== true ||
          !(x.durationMs > 0))) return false;
        uiReady = true;
        // A delayed cold pop must not appear after the child changes screens.
        if (Date.now() - startedAt <= 350) return send(soundId, volume, {}, true);
        return false;
      } catch (_) { return false; }
    })();
    uiPromise = pending;
    void pending.finally(() => { if (uiPromise === pending) uiPromise = null; });
    return true;
  }
  function prepareFromGesture(uiIndex = null, volume = 0.12) {
    if (!isAvailable() || root.document?.hidden)
      return Promise.resolve({ready:false,reason:"not-native-ios"});
    bind();
    const bridge = api();
    if (!["activateFromGesture","preload","play","stop","stopEffect"].every(k =>
      typeof bridge?.[k] === "function"))
      return Promise.resolve({ready:false,reason:"missing-bridge"});
    // Activation must start synchronously with a real Got It!/Menu Close/Resume tap.
    // If a speed selection has to replace a cold title UI preflight, a
    // single speed-pop may accompany its already-permitted game preflight.
    // Never play a pop seconds later on the unrelated Heads Up screen.
    const uiGestureAt = Date.now();
    let activation;
    try { activation = bridge.activateFromGesture({purpose:"game"}); }
    catch (_) { return Promise.resolve({ready:false,reason:"activation-error"}); }
    // Menu Close or a second tap while the PCM engine is already live does
    // NOT need a full discard/re-render of the large chord and note bank.
    // Still ask iOS to accept session priority on the actual gesture.
    if (ready && !failed) {
      const token = generation;
      return bounded(activation,SESSION_TIMEOUT).then(session => {
        if (!current(token)) return {ready:false,reason:"stale"};
        if (session?.ready === true) return {ready:true,reason:"already-prepared"};
        const why = safeReason(session?.reason);
        if (TEMPORARY.has(why)) temporary(why);
        else markFailed(token,why);
        return {ready:false,reason:why};
      }).catch(() => {
        if (current(token)) markFailed(token,"activation-error");
        return {ready:false,reason:"activation-error"};
      });
    }
    const hadBank = ready, priorUi = uiPromise, token = ++generation;
    bankOwned = true;
    ready = false; uiReady = false; failed = false; lastError = "";
    const oldStop = hadBank ? stopNative() : teardown;
    return (async () => {
      try {
        await bounded(Promise.all([oldStop, priorUi || Promise.resolve()]), SESSION_TIMEOUT);
        if (!current(token)) return {ready:false,reason:"stale"};
        const session = await bounded(activation, SESSION_TIMEOUT);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (session?.ready !== true) {
          const why = safeReason(session?.reason);
          if (TEMPORARY.has(why)) temporary(why);
          return {ready:false,reason:why};
        }
        // Preload UI first so closing Menu never waits for all drum/voice buffers.
        const ui = await bounded(Promise.all(UI.map(soundId =>
          bridge.preload({soundId}))), PREPARE_TIMEOUT);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (ui.some(x => x?.prepared !== true || !(x.durationMs > 0)))
          return {ready:false,reason:"ui-preflight-failed"};
        uiReady = true;
        if (uiIndex !== null && !root.document.hidden &&
            Date.now() - uiGestureAt <= 350) {
          send(UI[uiIndex % UI.length], volume, {}, true);
        }
        const others = await bounded(Promise.all(IDS.filter(x => !UI.includes(x)).map(
          soundId => bridge.preload({soundId}))), PREPARE_TIMEOUT);
        if (!current(token)) return {ready:false,reason:"stale"};
        const rejected = others.find(x => x?.prepared !== true || !(x.durationMs > 0));
        if (rejected) {
          failed = true; lastError = safeReason(rejected.reason);
          teardown = stopNative();
          return {ready:false,reason:lastError};
        }
        ready = true;
        return {ready:true,reason:"prepared"};
      } catch (_) {
        if (current(token)) {
          failed = true;
          lastError = "preflight-timeout-or-error";
          teardown = stopNative();
        }
        return {ready:false,reason:lastError || "stale"};
      }
    })();
  }
  function stopVoices() {
    if (!ready || failed || !isAvailable()) return;
    try { void Promise.resolve(api()?.stopEffect?.({soundId:"jam-group"})).catch(() => {}); }
    catch (_) {}
  }
  function stopGrooveForTransition() {
    // Keep every prewarmed jam-note voice ready for a four-note "Time"
    // downbeat. The original web version stops the beat, NOT its ability
    // to play the word melody/chord. Resolve only after Swift completes
    // the targeted drum/pad/voice stop on its serial playback worker.
    if (!ready || failed || !isAvailable())
      return Promise.resolve({stopped:false,reason:"not-ready"});
    try {
      return Promise.resolve(api()?.stopEffect?.({soundId:"jam-groove"}))
        .catch(() => ({stopped:false,reason:"stop-error"}));
    } catch (_) {
      return Promise.resolve({stopped:false,reason:"stop-error"});
    }
  }
  function stopGrooveForFinale() {
    // The original ios-prep final C-major arpeggio plays *after* the
    // background beat stops. Return the worker acknowledgment so the
    // Great! button can schedule its first notes onto a genuinely idle
    // serial PCM worker instead of racing stop/prepare and playing late.
    // This uses the same narrow drum/pad/voice scope as between rounds:
    // all twelve prewarmed melody-note voices remain available.
    return stopGrooveForTransition();
  }
  function traceTransition(phase, round, wordIndex = -1) {
    // Diagnostic ONLY: fixed phases/rounds, no verse text, audio data,
    // automatic session activation, disk writes or network calls.
    const allowed = ["stop-request", "stop-complete", "phrase-scheduled",
      "word-visible", "next-groove"];
    if (!isAvailable() || root.document?.hidden ||
        !allowed.includes(phase) || !Number.isInteger(round) ||
        round < 1 || round > 4 || !Number.isInteger(wordIndex) ||
        wordIndex < -1 || wordIndex > 2 ||
        typeof api()?.traceJamTransition !== "function") return false;
    try {
      void Promise.resolve(api().traceJamTransition({
        phase, round, wordIndex, clientEpochMs: Date.now()
      })).catch(() => {});
      return true;
    } catch (_) { return false; }
  }
  function scheduled(extra, dueEpochMs) {
    // Only trusted in-process beat clock supplies this bounded due time.
    // Swift revalidates the same 350ms window at playback time.
    return Number.isFinite(dueEpochMs) &&
      dueEpochMs > Date.now() - 140 && dueEpochMs < Date.now() + 350
      ? {...extra, scheduledEpochMs: dueEpochMs} : extra;
  }
  function playTone(midi, duration, volume, type = "triangle",
                    dueEpochMs = null, jamCue = null) {
    if (!Number.isFinite(midi) || !Number.isFinite(duration) ||
        !Number.isFinite(volume)) return false;
    const wave = type === "square" ? "q" : type === "sine" ? "s" : "t";
    const recipe = Math.round(midi) + "-" + Math.round(duration*1000) + "-" + wave;
    const trace = jamCue === "transition-sting" || jamCue === "transition-word"
      ? {jamCue} : {};
    return send("jam-note", Math.min(1, Math.max(0, volume)),
      scheduled({noteId:recipe,...trace},dueEpochMs));
  }
  function playDrum(sound, volume = 1, dueEpochMs = null) {
    if (!DRUMS.includes(sound)) return false;
    return send("jam-drum-" + sound, Math.max(0, Math.min(1, volume)),
      scheduled({},dueEpochMs));
  }
  function playPad(bpm, beats, volume = 1, dueEpochMs = null) {
    if (!Number.isInteger(bpm) || !Number.isInteger(beats) ||
        ![4,8,12,16].includes(beats)) return false;
    return send("jam-pad", Math.max(0, Math.min(1, volume)),
      scheduled({padId:bpm+"-"+beats},dueEpochMs));
  }
  function playVoice(id, volume = 0.31, dueEpochMs = null) {
    if (!VOICES.includes(id)) return false;
    return send("jam-voice-"+id, volume, scheduled({},dueEpochMs));
  }
  root.BibloZooNativeVerseJamAudio = Object.freeze({
    isAvailable, configure, tapUiFromGesture, prepareFromGesture,
    playTone, playDrum, playPad, playVoice, stopVoices,
    stopGrooveForFinale, stopGrooveForTransition, traceTransition, stop,
    isReady:()=>ready && !failed && !root.document?.hidden,
    isUiReady:()=>uiReady && !failed && !root.document?.hidden,
    lastError:()=>lastError, soundIds:IDS
  });
})(window);
