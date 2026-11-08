/* N6c — Bible Bugs local sound clips on native-only iOS Audio Test.
 * Same sole Swift .soloAmbient session + AVAudioEngine worker as Feeding
 * and Scripture Bible Bugs; fixed MP3 IDs; NO Web Audio/HTML native fallback.
 * Genuine mode/retry/menu/Welcome Back gestures warm the entire bank.
 */
(function installNativeBibleBugsAudio(root) {
  "use strict";
  const KEYS = Object.freeze({
    uiTap1: "ui-pop-1",
    uiTap2: "ui-pop-2",
    tongue: "bugs-tongue",
    pop1: "bugs-pop-1",
    pop2: "bugs-pop-2",
    pop3: "bugs-pop-3",
    pop4: "bugs-pop-4",
    pop5: "bugs-pop-5",
    correct: "bugs-correct",
    incorrect: "bugs-incorrect",
    streak: "bugs-streak",
    bonusStart: "bugs-bonus-start",
    bonusEnd: "bugs-bonus-end",
    stinkBug: "bugs-stink-bug"
  });
  const IDS = Object.freeze(Object.values(KEYS));
  const SESSION_TIMEOUT_MS = 1800;
  const BANK_TIMEOUT_MS = 12000; // bounded full 14-effect bank, not per hot cue
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
      return Promise.resolve(api()?.stop?.({soundId:"bugs-tongue"}))
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
          // UIKit swipe-up-and-HOLD can make WebKit appear visible.
          // Notify Bible Bugs owner to pause its gameplay clock too.
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
        // Prewarm ALL 12 MP3 clips + two UI pops before any gameplay starts.
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
     const soundId = KEYS[key];
    const token = generation;
    const timestamp = Date.now();
    try {
      // Actual bug/tongue collision never decodes or starts an engine.
      void bounded(api().play({
        soundId, volume, eventId:"bugs-" + (++nextEvent),
        requestEpochMs:timestamp
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
  root.BibloZooNativeBibleBugsAudio = Object.freeze({
    isAvailable, configure, prepareFromGesture, play, stop,
    isReady: () => ready && !failed && !root.document?.hidden,
    lastError: () => lastError,
    soundIds: IDS
  });
})(window);
