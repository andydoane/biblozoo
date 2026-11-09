/* N6r Ghost Writer native-only iOS output: the five original spooky MP3s
 * and two already-shared UI pops. The six shipped scribble MP3s are dormant
 * in game.js and are deliberately NOT part of this native sound bank.
 * Preserve the sole serialized .soloAmbient Swift PCM engine, no Web fallback.
 */
(function installBibloZooNativeGhostWriterAudio(root) {
  "use strict";
  const KEYS = Object.freeze({
    uiTap1: "ui-pop-1", uiTap2: "ui-pop-2",
    spooky1: "ghost-spooky-1", spooky2: "ghost-spooky-2",
    spooky3: "ghost-spooky-3", spooky4: "ghost-spooky-4",
    spooky5: "ghost-spooky-5"
  });
  const UI_IDS = Object.freeze([KEYS.uiTap1, KEYS.uiTap2]);
  const SPOOKY_KEYS = Object.freeze(["spooky1","spooky2","spooky3","spooky4","spooky5"]);
  const IDS = Object.freeze(Object.values(KEYS));
  const TEMPORARY = new Set(["other-audio-playing", "interruption-pending",
    "gesture-required-after-interruption", "not-foreground", "stale",
    "activation-cooldown", "foreground-attempt-limit", "activation-os-rejected"]);
  const SESSION_TIMEOUT_MS = 1800, BANK_TIMEOUT_MS = 25000, PLAY_TIMEOUT_MS = 1800;
  const COLD_UI_MAX_DELAY_MS = 350;
  let generation = 0, ready = false, uiReady = false, failed = false;
  let lastError = "", nextEvent = 0, bound = false;
  let uiPreparation = null, teardown = Promise.resolve();
  let onInactive = null, onActive = null, onFailure = null;
  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function api() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function reason(value) {
    return typeof value === "string" && /^[a-z][a-z0-9-]{0,65}$/.test(value)
      ? value : "native-error";
  }
  function bounded(task, ms) {
    let timer;
    return Promise.race([Promise.resolve(task),
      new Promise((_,reject) => {
        timer = root.setTimeout(() => reject(Error("timeout")), ms);
      })]).finally(() => root.clearTimeout(timer));
  }
  function current(token) {
    return isAvailable() && generation === token && !root.document?.hidden;
  }
  function stopNative() {
    // Swift stop for one PCM ID discards all warmed effect voices.
    if (!isAvailable()) return Promise.resolve();
    try {
      return Promise.resolve(api()?.stop?.({soundId: KEYS.spooky1})).catch(() => {});
    } catch (_) { return Promise.resolve(); }
  }
  function stop() {
    generation++;
    ready = false; uiReady = false; failed = false;
    teardown = stopNative();
    return teardown;
  }
  function temporary(why) {
    lastError = reason(why);
    void stop();
    try { onInactive?.(); } catch (_) {}
    if (!root.document?.hidden) { try { onActive?.(); } catch (_) {} }
  }
  function markFailed(token, why) {
    if (!current(token) || failed) return;
    const message = reason(why);
    if (TEMPORARY.has(message)) { temporary(message); return; }
    failed = true; ready = false; uiReady = false;
    lastError = message;
    teardown = stopNative();
    try { onFailure?.(message); } catch (_) {}
  }
  function bind() {
    if (bound || !isAvailable()) return;
    bound = true;
    const invalidate = () => { void stop(); };
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document?.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", invalidate);
    root.addEventListener?.("blur", invalidate);
    // UIKit .inactive catches swipe-up-and-HOLD even when WebKit stays visible.
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
  function dispatchUi(key, volume) {
    if (!isAvailable() || root.document?.hidden ||
        !UI_IDS.includes(KEYS[key]) || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1 || failed || !(uiReady || ready)) return false;
    const token = generation;
    try {
      void bounded(api().play({soundId: KEYS[key], volume,
        eventId:"ghost-ui-" + (++nextEvent),requestEpochMs:Date.now()}),
        PLAY_TIMEOUT_MS).then(result => {
          if (current(token) && result?.accepted !== true)
            markFailed(token, result?.reason);
      }).catch(() => { if (current(token)) markFailed(token,"ui-play-timeout"); });
      return true;
    } catch (_) {
      markFailed(token,"ui-play-error"); return false;
    }
  }
  function tapUiFromGesture(key, volume) {
    if (!isAvailable() || root.document?.hidden ||
        !UI_IDS.includes(KEYS[key]) || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1) return false;
    bind();
    if (ready || uiReady) return dispatchUi(key,volume);
    if (uiPreparation) return false;
    const token = ++generation, startedAt = Date.now();
    failed = false;
    let activation;
    try { activation = api()?.activateFromGesture({purpose:"ui"}); }
    catch (_) { return false; }
    const precedingStop = teardown;
    const pending = (async () => {
      try {
        await bounded(precedingStop, SESSION_TIMEOUT_MS);
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token) || session?.ready !== true) return false;
        const clips = await bounded(Promise.all(UI_IDS.map(soundId =>
          api().preload({soundId}))),BANK_TIMEOUT_MS);
        if (!current(token) || clips.some(x =>
          x?.prepared !== true || !(x.durationMs > 0))) return false;
        uiReady = true;
        if (Date.now() - startedAt <= COLD_UI_MAX_DELAY_MS)
          return dispatchUi(key,volume);
        return false; // Never late-pop a screen the child already left.
      } catch (_) { return false; }
    })();
    uiPreparation = pending;
    void pending.finally(() => {
      if (uiPreparation === pending) uiPreparation = null;
    });
    return true;
  }
  function prepareFromGesture(uiTap = null) {
    if (uiTap && (!UI_IDS.includes(KEYS[uiTap.key]) ||
        !Number.isFinite(uiTap.volume) ||
        uiTap.volume <= 0 || uiTap.volume > 1))
      return Promise.resolve({ready:false,reason:"invalid-ui-pop"});
    if (!isAvailable() || root.document?.hidden)
      return Promise.resolve({ready:false,reason:"not-native-ios"});
    bind();
    const bridge = api();
    if (!["activateFromGesture","preload","play","stop","stopEffect"].every(
      key => typeof bridge?.[key] === "function"))
      return Promise.resolve({ready:false,reason:"missing-bridge"});
    // Activation is requested in this SAME user gesture, before any await.
    let activation;
    try { activation = bridge.activateFromGesture({purpose:"game"}); }
    catch (_) { return Promise.resolve({ready:false,reason:"activation-error"}); }
    const prior = ready, precedingUi = uiPreparation, token = ++generation;
    ready = false; uiReady = false; failed = false; lastError = "";
    const oldStop = prior ? stopNative() : teardown;
    return (async () => {
      try {
        await bounded(Promise.all([oldStop, precedingUi || Promise.resolve()]),
          SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (session?.ready !== true) {
          const why = reason(session?.reason);
          if (TEMPORARY.has(why)) temporary(why);
          return {ready:false,reason:why};
        }
        // UI pop precedes longer spooky decodes on the serialized worker.
        const uiClips = await bounded(Promise.all(UI_IDS.map(soundId =>
          bridge.preload({soundId}))), BANK_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (uiClips.some(x => x?.prepared !== true || !(x.durationMs > 0))) {
          failed = true; lastError = "ui-preflight-failed";
          teardown = stopNative();
          return {ready:false,reason:lastError};
        }
        uiReady = true;
        if (uiTap) dispatchUi(uiTap.key,uiTap.volume);
        const results = await bounded(Promise.all(IDS.filter(id =>
          !UI_IDS.includes(id)).map(soundId =>
            bridge.preload({soundId}))),BANK_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        const rejected = results.find(x => x?.prepared !== true || !(x.durationMs > 0));
        if (rejected) {
          failed = true; lastError = reason(rejected.reason);
          teardown = stopNative();
          return {ready:false,reason:lastError};
        }
        ready = true;
        return {ready:true,reason:"prepared"};
      } catch (_) {
        if (current(token)) {
          failed = true; lastError = "preflight-timeout-or-error";
          teardown = stopNative();
        }
        return {ready:false,reason:lastError || "stale"};
      }
    })();
  }
  // A spooky PCM play resolves after the Swift worker scheduled its buffer.
  // Duration comes from that predecoded buffer, NOT an arbitrary JS guess.
  // The result schedules the next optional sound; this is never a gameplay
  // completion or a claim of physical speaker audibility.
  async function playSpooky(key, volume) {
    if (!SPOOKY_KEYS.includes(key) || !isAvailable() || !ready ||
        failed || root.document?.hidden || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1)
      return {accepted:false,reason:"not-ready"};
    const token = generation;
    try {
      const result = await bounded(api().play({
        soundId:KEYS[key], volume, eventId:"ghost-spooky-" + (++nextEvent),
        requestEpochMs:Date.now()
      }), PLAY_TIMEOUT_MS);
      if (!current(token)) return {accepted:false,reason:"stale"};
      if (result?.accepted !== true || !(result.durationMs > 0)) {
        markFailed(token,result?.reason || "invalid-duration");
        return {accepted:false,reason:reason(result?.reason)};
      }
      return {accepted:true,durationMs:Math.min(90000,result.durationMs)};
    } catch (_) {
      if (current(token)) markFailed(token,"play-timeout");
      return {accepted:false,reason:"play-timeout"};
    }
  }
  // Targeted group stop doesn't destroy the predecoded bank for another
  // replay. A full stop() on app background does destroy the entire bank.
  function stopSpooky() {
    if (!isAvailable() || !ready || failed) return Promise.resolve(false);
    try {
      return bounded(api().stopEffect({soundId:"ghost-spooky-group"}),
        PLAY_TIMEOUT_MS).then(r => r?.stopped === true).catch(() => false);
    } catch (_) { return Promise.resolve(false); }
  }
  root.BibloZooNativeGhostWriterAudio = Object.freeze({
    isAvailable, configure, tapUiFromGesture, prepareFromGesture,
    playSpooky, stopSpooky, stop,
    isReady:() => ready && !failed && !root.document?.hidden,
    lastError:() => lastError, soundIds:IDS
  });
})(window);
