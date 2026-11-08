/* N6g: Verse Invaders 13 packaged MP3 + two shared UI PCM effects.
 * One existing Swift .soloAmbient/serialized predecoded AVAudioEngine worker;
 * NO Web/HTML audio fallback on native iOS.
 */
(function installNativeVerseInvadersAudio(root) {
  "use strict";
  const KEYS = Object.freeze({
    uiTap1: "ui-pop-1",
    uiTap2: "ui-pop-2",
    rocketLaunch: "inv-launch",
    correctHit: "inv-correct",
    wrongHit: "inv-wrong",
    abduction: "inv-abduction",
    streak4: "inv-streak",
    streak8: "inv-streak",
    streak12: "inv-streak",
    streak16: "inv-streak",
    bonusMultiplierUp: "inv-streak",
    bonusStart: "inv-bonus-start",
    bonusPop1: "inv-pop-1",
    bonusPop2: "inv-pop-2",
    bonusPop3: "inv-pop-3",
    bonusPop4: "inv-pop-4",
    bonusPop5: "inv-pop-5",
    bonusPenalty: "inv-bonus-penalty",
    bonusReveal: "inv-bonus-reveal"
  });
  const IDS = Object.freeze([...new Set(Object.values(KEYS))]); // aliases preloaded once
  const UI_IDS = Object.freeze(["ui-pop-1", "ui-pop-2"]);
  const UI_FIRST_TAP_MAX_DELAY_MS = 350; // N5a: no late cold-start pop
  const SESSION_TIMEOUT_MS = 1800;
  const BANK_TIMEOUT_MS = 15000; // bounded 15 UNIQUE ID bank
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
  let uiReady = false; // UI bank does not imply gameplay readiness
  let uiPreparation = null;

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
      return Promise.resolve(api()?.stop?.({soundId:"inv-launch"}))
        .catch(() => {});
    } catch (_) { return Promise.resolve(); }
  }
  function stop() {
    generation++;
    ready = false;
    uiReady = false;
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
          // Notify Verse Invaders owner to freeze its game and bonus clocks too.
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
    uiReady = false;
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
  // Title/back taps precede the full game bank. Prepare only the two fixed
  // Swift PCM UI effects on a real gesture; this never means gameplay is ready.
  function dispatchUi(key, volume) {
    const soundId = KEYS[key];
    if (!UI_IDS.includes(soundId) || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1 || root.document?.hidden) return Promise.resolve(false);
    try {
      return bounded(api().play({
        soundId, volume, eventId: "inv-ui-" + (++nextEvent),
        requestEpochMs: Date.now()
      }), PLAY_TIMEOUT_MS).then(result => result?.accepted === true)
        .catch(() => false);
    } catch (_) { return Promise.resolve(false); }
  }
  function tapUiFromGesture(key, volume) {
    if (!isAvailable() || root.document?.hidden ||
        !UI_IDS.includes(KEYS[key]) || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1) return false;
    bind();
    if (ready && !failed) return play(key, volume);
    if (uiReady && !failed) {
      void dispatchUi(key, volume);
      return true;
    }
    // Duplicate rapid title taps must not start competing PCM banks or
    // create delayed ghosts after the child changes screens.
    if (uiPreparation) return false;
    const token = ++generation;
    failed = false;
    let activation;
    try { activation = api()?.activateFromGesture({purpose:"ui"}); }
    catch (_) { return false; }
    const startedAt = Date.now();
    const pending = (async () => {
      try {
        await bounded(teardown, SESSION_TIMEOUT_MS);
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token) || session?.ready !== true) return false;
        const clips = await bounded(Promise.all(UI_IDS.map(soundId =>
          api().preload({soundId}))), BANK_TIMEOUT_MS);
        if (!current(token) || clips.some(result =>
          result?.prepared !== true ||
          typeof result.durationMs !== "number" || result.durationMs <= 0)) return false;
        uiReady = true;
        if (Date.now() - startedAt <= UI_FIRST_TAP_MAX_DELAY_MS)
          return dispatchUi(key, volume);
        return false; // Never replay a stale cold-start tap seconds later.
      } catch (_) { return false; }
    })();
    uiPreparation = pending;
    void pending.finally(() => {
      if (uiPreparation === pending) uiPreparation = null;
    });
    return true; // Request scheduled, not evidence of speaker output.
  }

  // IMPORTANT: activateFromGesture is invoked in the SAME synchronous stack
  // as the child's actual mode selection / Retry / Resume button event.
  function prepareFromGesture(uiTap = null) {
    if (uiTap && (!UI_IDS.includes(KEYS[uiTap.key]) ||
        !Number.isFinite(uiTap.volume) || uiTap.volume <= 0 || uiTap.volume > 1))
      return Promise.resolve({ready:false,reason:"invalid-ui-pop"});
    if (!isAvailable() || root.document?.hidden)
      return Promise.resolve({ready:false,reason:"not-native-ios"});
    bind();
    const prior = ready;
    const precedingUi = uiPreparation; // settle prior title preload before new bank
    const token = ++generation;
    ready = false;
    uiReady = false;
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
        await bounded(Promise.all([cleanup, precedingUi || Promise.resolve()]), SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (session?.ready !== true)
          return {ready:false,reason:reason(session?.reason)};
        // Prepare 13 unique Verse Invaders MP3 clips + two UI pops before gameplay.
        // Swift serializes AVAudioEngine mutations on its existing worker.
        // For a mode/Close gesture, schedule its native UI pop after the two
        // UI clips preload but BEFORE decoding the gameplay bank.
        let prepared;
        if (uiTap) {
          const uiClips = await bounded(Promise.all(UI_IDS.map(soundId =>
            bridge.preload({soundId}))), BANK_TIMEOUT_MS);
          if (!current(token)) return {ready:false,reason:"stale"};
          if (uiClips.some(result => result?.prepared !== true ||
              typeof result.durationMs !== "number" || result.durationMs <= 0)) {
            teardown = stopNative();
            return {ready:false,reason:"ui-pop-preflight-failed"};
          }
          const uiPlayed = await bounded(dispatchUi(uiTap.key, uiTap.volume), PLAY_TIMEOUT_MS);
          if (!current(token)) return {ready:false,reason:"stale"};
          if (!uiPlayed) {
            teardown = stopNative();
            return {ready:false,reason:"ui-pop-play-failed"};
          }
          const effects = await bounded(Promise.all(IDS.filter(soundId =>
            !UI_IDS.includes(soundId)).map(soundId =>
            bridge.preload({soundId}))), BANK_TIMEOUT_MS);
          prepared = [...uiClips, ...effects];
        } else {
          prepared = await bounded(Promise.all(IDS.map(soundId =>
            bridge.preload({ soundId }))), BANK_TIMEOUT_MS);
        }
        if (!current(token)) {
          // The stop that invalidated this generation already tore down its
          // worker queue. A stale Promise MUST NOT queue a second Stop after
          // a newer legitimate gesture has prepared its own warm bank.
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
        uiReady = true;
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
  function play(key, volume) {
    if (!isAvailable() || !ready || failed || root.document?.hidden ||
        typeof KEYS[key] !== "string" ||
        !Number.isFinite(volume) || volume < 0 || volume > 1) return false;
     const soundId = KEYS[key];
    const token = generation;
    const timestamp = Date.now();
    try {
      // An alien hit, rocket, or bonus cue never decodes or starts an engine.
      void bounded(api().play({
        soundId, volume, eventId:"inv-" + (++nextEvent),
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
  root.BibloZooNativeVerseInvadersAudio = Object.freeze({
    isAvailable, configure, prepareFromGesture, tapUiFromGesture, play, stop,
    isReady: () => ready && !failed && !root.document?.hidden,
    lastError: () => lastError,
    soundIds: IDS
  });
})(window);
