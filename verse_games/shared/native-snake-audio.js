/* N6b — only Scripture Snake's isolated native-only iOS output owner.
 * The SAME AVAudioSession and worker AVAudioEngine as Feeding/UI effects.
 * All samples are fixed IDs validated by Swift; no HTML/Web Audio fallback.
 * A real mode-selection, menu-close or Welcome Back tap primes the bank.
 */
(function installNativeSnakeAudio(root) {
  "use strict";
  const KEYS = Object.freeze({
    uiTap1: "ui-pop-1",
    uiTap2: "ui-pop-2",
    correctWord: "snake-correct",
    wrongWord: "snake-wrong",
    fruit: "snake-fruit",
    boostStart: "snake-boost",
    bonusStart: "snake-bonus-start",
    miniSnakeEat: "snake-eat",
    bonusResult: "snake-bonus-result",
    orb: "snake-orb"
  });
  const IDS = Object.freeze(Object.values(KEYS));
  const SESSION_TIMEOUT_MS = 1800;
  const BANK_TIMEOUT_MS = 8000; // bounded whole-bank preflight, not per hot cue
  const PLAY_TIMEOUT_MS = 1800;
  let generation = 0;
  let ready = false;
  let failed = false;
  let lastError = "";
  let nextEvent = 0;
  let bound = false;
  let onFailure = null;
  let onInactive = null;
  let onActive = null;
  let teardown = Promise.resolve();

  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function api() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function reason(value) {
    return typeof value === "string" &&
      /^[a-z][a-z0-9-]{0,65}$/.test(value) ? value : "native-error";
  }
  function bounded(promise, ms) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject) => {
        timer = root.setTimeout(() => reject(Error("timeout")), ms);
      })
    ]).finally(() => root.clearTimeout(timer));
  }
  function stopNative() {
    // Swift stop for any one fixed PCM ID discards ALL warmed effects.
    // Never call stopNarration or touch the long-form Learn owner.
    if (!isAvailable()) return Promise.resolve();
    try {
      return Promise.resolve(api()?.stop?.({soundId:"snake-fruit"}))
        .catch(() => {});
    } catch (_) { return Promise.resolve(); }
  }
  function stop() {
    generation++;
    ready = false;
    failed = false;
    // Track the worker teardown so an immediate menu-close tap can activate
    // synchronously yet MUST wait for old AVAudioEngine disposal before
    // preloading any new bank; prevents late Stop from clearing fresh voices.
    teardown = stopNative();
    return teardown;
  }
  function invalidate() { void stop(); }
  function bind() {
    if (bound || !isAvailable()) return;
    bound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document?.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", invalidate);
    root.addEventListener?.("blur", invalidate);
    try {
      Promise.resolve(api()?.addListener?.("biblozooAppLifecycle", event => {
        if (event?.active === false || event?.active === true) invalidate();
        if (event?.active === false) {
          // UIKit App Switcher swipe-up-and-HOLD can make the app inactive
          // while WebKit is still visible. Pause Snake's physics too.
          try { onInactive?.(); } catch (_) { /* Never restart audio. */ }
        } else if (event?.active === true) {
          // Reveal Welcome Back only; activation still needs a new tap.
          try { onActive?.(); } catch (_) { /* Never auto-play. */ }
        }
      })).catch(() => {});
    } catch (_) { /* UIKit/visibility remain output safety fences. */ }
  }
  function current(token) {
    return isAvailable() && generation === token && !root.document?.hidden;
  }
  function markFailed(token, why) {
    if (!current(token) || failed) return;
    ready = false;
    failed = true;
    lastError = reason(why);
    teardown = stopNative();
    try { onFailure?.(lastError); } catch (_) { /* Never mutate game logic. */ }
  }
  function configure({ onPlaybackFailure, onAppInactive, onAppActive } = {}) {
    onFailure = typeof onPlaybackFailure === "function" ?
      onPlaybackFailure : null;
    onInactive = typeof onAppInactive === "function" ?
      onAppInactive : null;
    onActive = typeof onAppActive === "function" ?
      onAppActive : null;
  }
  // IMPORTANT: activateFromGesture is invoked in the SAME synchronous stack
  // as the child's actual mode selection / Retry / Resume button event.
  function prepareFromGesture() {
    if (!isAvailable() || root.document?.hidden)
      return Promise.resolve({ready:false,reason:"not-native-ios"});
    bind();
    const prior = ready;
    const token = ++generation;
    ready = false;
    failed = false;
    lastError = "";
    const bridge = api();
    if (!["activateFromGesture","preload","play","stop"].every(
      key => typeof bridge?.[key] === "function"))
      return Promise.resolve({ready:false,reason:"missing-bridge"});
    let activation;
    try { activation = bridge.activateFromGesture({ purpose: "game" }); }
    catch (_) { return Promise.resolve({ready:false,reason:"activation-error"}); }
    const cleanup = prior ? stopNative() : teardown;
    return (async () => {
      try {
        await bounded(cleanup, SESSION_TIMEOUT_MS);
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (session?.ready !== true)
          return {ready:false,reason:reason(session?.reason)};
        // Prewarm all samples and six orb notes BEFORE any gameplay starts.
        // Swift serializes AVAudioEngine mutations on its existing worker.
        const prepared = await bounded(Promise.all(IDS.map(soundId =>
          bridge.preload({ soundId }))), BANK_TIMEOUT_MS);
        if (!current(token)) {
          teardown = stopNative();
          return {ready:false,reason:"stale"};
        }
        const rejected = prepared.find((result,index) =>
          result?.prepared !== true ||
          // A returned status alone is never evidence of speaker audibility.
          typeof result.durationMs !== "number" || result.durationMs <= 0);
        if (rejected) {
          lastError = reason(rejected.reason);
          failed = true;
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
  function play(key, volume, noteIndex = null) {
    if (!isAvailable() || !ready || failed || root.document?.hidden ||
        typeof KEYS[key] !== "string" ||
        !Number.isFinite(volume) || volume < 0 || volume > 1) return false;
    if (key === "orb" &&
        (!Number.isInteger(noteIndex) || noteIndex < 0 || noteIndex > 5))
      return false;
    const soundId = KEYS[key];
    const token = generation;
    const timestamp = Date.now();
    try {
      const note = key === "orb" ? { noteIndex } : {};
      // Actual physics/collision frame never decodes or starts an engine.
      void bounded(api().play({
        soundId, volume, eventId:"snake-" + (++nextEvent),
        requestEpochMs:timestamp, ...note
      }), PLAY_TIMEOUT_MS).then(result => {
        if (current(token) && result?.accepted !== true)
          markFailed(token, result?.reason);
      }).catch(() => { if (current(token)) markFailed(token, "play-timeout"); });
      return true; // dispatched, NOT acoustic proof
    } catch (_) {
      markFailed(token, "play-bridge-error");
      return false;
    }
  }
  root.BibloZooNativeSnakeAudio = Object.freeze({
    isAvailable, configure, prepareFromGesture, play, stop,
    isReady: () => ready && !failed && !root.document?.hidden,
    lastError: () => lastError,
    soundIds: IDS
  });
})(window);
