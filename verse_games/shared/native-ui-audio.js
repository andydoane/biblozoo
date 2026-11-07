/* N5a — fixed, native-only UI pop effects for BibloZoo Audio Test.
 * No Web/HTML fallback. A human UI gesture is the only activation entrypoint.
 * Never treat a Swift prepared/accepted status as proof of audible output.
 */
(function installNativeUiAudio(root) {
  "use strict";

  const IDS = Object.freeze(["ui-pop-1", "ui-pop-2"]);
  const MAX_GESTURE_DELAY_MS = 350;
  let generation = 0;
  let ready = false;
  let preparing = null;
  let nextPop = 0;
  let nextEvent = 0;
  let lastPlayedAt = -Infinity;
  let lifecycleBound = false;

  function isAvailable() {
    const capacitor = root.Capacitor;
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      capacitor?.isNativePlatform?.() === true &&
      capacitor?.getPlatform?.() === "ios";
  }

  function bridge() {
    return root.Capacitor?.Plugins?.BibloZooNativeSound;
  }

  function invalidate({ stop = false } = {}) {
    generation += 1;
    ready = false;
    preparing = null;
    // Swift already discards its whole PCM engine on inactive/background.
    // Explicit mute alone asks native to stop current voices; this existing
    // stop API also discards Feeding's PCM bank, which a later Got It!/Resume
    // gesture must always re-prepare.
    if (stop && isAvailable()) {
      const api = bridge();
      for (const soundId of IDS) {
        try { Promise.resolve(api?.stop?.({ soundId })).catch(() => {}); }
        catch (_) { /* Never allow audio cleanup to block a screen. */ }
      }
    }
  }

  function bindLifecycle() {
    if (lifecycleBound || !isAvailable()) return;
    lifecycleBound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", () => invalidate());
    root.addEventListener?.("blur", () => invalidate());
    // App Switcher cards can make UIKit inactive without hiding WebKit.
    try {
      Promise.resolve(bridge()?.addListener?.(
        "biblozooAppLifecycle", (event) => {
          if (event?.active === false || event?.active === true) invalidate();
        }
      )).catch(() => {});
    } catch (_) { /* Blur/visibility remain the safety net. */ }
  }

  function prepareFromGesture() {
    if (preparing) return preparing;
    const api = bridge();
    if (typeof api?.activateFromGesture !== "function" ||
        typeof api?.preload !== "function") return Promise.resolve(false);
    const token = generation;
    // Activation request is made synchronously during the real gesture.
    let activation;
    try { activation = api.activateFromGesture({ purpose: "ui" }); }
    catch (_) { return Promise.resolve(false); }
    preparing = Promise.resolve(activation).then(async result => {
      if (result?.ready !== true || token !== generation) return false;
      for (const soundId of IDS) {
        if (token !== generation) return false;
        const preflight = await api.preload({ soundId });
        if (preflight?.prepared !== true) return false;
      }
      return token === generation;
    }).then(ok => {
      if (token === generation) ready = ok === true;
      return ok === true && token === generation;
    }).catch(() => false).finally(() => {
      if (token === generation) preparing = null;
    });
    return preparing;
  }

  function playPop(volume) {
    if (!ready || !isAvailable() || root.document?.hidden) return false;
    const now = root.performance?.now?.() ?? 0;
    if (now - lastPlayedAt < 60) return false;
    lastPlayedAt = now;
    const soundId = IDS[nextPop++ % IDS.length];
    try {
      // Fixed IDs and bounded volume only. No dynamic paths or pitch APIs.
      Promise.resolve(bridge()?.play?.({
        soundId, volume, eventId: "ui-" + (++nextEvent),
        requestEpochMs: Date.now()
      })).catch(() => {});
      return true;
    } catch (_) { return false; }
  }

  function tapFromGesture({ isCurrent, volume = 0.12 } = {}) {
    if (!isAvailable() || root.document?.hidden ||
        typeof isCurrent !== "function" || !isCurrent() ||
        !Number.isFinite(volume) || volume <= 0 || volume > 1) return false;
    bindLifecycle();
    if (ready) return playPop(volume);
    const token = generation;
    const started = root.performance?.now?.() ?? 0;
    void prepareFromGesture().then(ok => {
      if (!ok || token !== generation || !isCurrent() ||
          root.document?.hidden ||
          (root.performance?.now?.() ?? 0) - started > MAX_GESTURE_DELAY_MS) return;
      playPop(volume);
    });
    return true;
  }

  root.BibloZooNativeUiAudio = Object.freeze({
    isAvailable, tapFromGesture, invalidate
  });
})(window);
