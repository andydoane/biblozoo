/* N5b.1: fixed, DEV-only long-form native narration proof on BibloZoo Audio Test.
 * The child-facing Learn flow is NOT switched to this backend yet. This
 * controller validates AVAudioPlayer position, pause, seek, completion and
 * interruption ownership with a single packaged, allowlisted narration.
 * No Web/HTML fallback and no automatic foreground playback.
 */
(function installNativeLearnNarrationPilot(root) {
  "use strict";
  const SOUND_ID = "learn-john-3-16";
  const PREFLIGHT_MS = 4500;
  let generation = 0;
  let serial = 0;
  let currentId = null;
  let listener = null;
  let bound = false;
  let pending = false;
  let nativeHandle = null;
  let lifecycleHandle = null;

  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function bridge() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function isCurrent(token, id) {
    return generation === token && currentId === id &&
      isAvailable() && !root.document?.hidden;
  }
  function announce(kind, data = {}) {
    try { listener?.({ kind, ...data }); }
    catch (_) { /* Status UI is never allowed to affect audio. */ }
  }
  function bounded(promise) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = root.setTimeout(() => reject(new Error("timeout")), PREFLIGHT_MS);
      })
    ]).finally(() => root.clearTimeout(timer));
  }
  function invalidate() {
    generation += 1;
    currentId = null;
    pending = false;
    announce("interrupted");
  }
  function bindLifecycle() {
    if (bound || !isAvailable()) return;
    bound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document?.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", invalidate);
    root.addEventListener?.("blur", invalidate);
    try {
      const api = bridge();
      Promise.resolve(api?.addListener?.("biblozooNarration", event => {
        if (!event || event.requestId !== currentId || !isAvailable() ||
            root.document?.hidden) return;
        if (event.type === "ended") {
          announce("ended", { requestId: currentId,
            durationMs: event.durationMs, positionMs: event.positionMs });
        } else if (event.type === "failed") {
          announce("failed", { reason: "native-completion-failed" });
        } else if (event.type === "invalidated") {
          invalidate();
        }
      })).then(handle => { nativeHandle = handle; }).catch(() => {});
      Promise.resolve(api?.addListener?.("biblozooAppLifecycle", event => {
        if (event?.active === false || event?.active === true) invalidate();
      })).then(handle => { lifecycleHandle = handle; }).catch(() => {});
    } catch (_) { /* Visibility/blur still invalidate on task switch. */ }
  }

  async function startFromGesture(onStatus = null) {
    if (!isAvailable() || pending || root.document?.hidden) {
      return { ready: false, reason: "unavailable" };
    }
    const api = bridge();
    if (typeof api?.activateFromGesture !== "function" ||
        typeof api?.prepareNarration !== "function" ||
        typeof api?.playNarration !== "function") {
      return { ready: false, reason: "missing-bridge" };
    }
    listener = typeof onStatus === "function" ? onStatus : listener;
    bindLifecycle();
    const token = ++generation;
    const id = ++serial;
    currentId = id;
    pending = true;
    announce("preparing");
    let activation;
    try {
      // Critical: invocation itself happens synchronously inside the DEV tap.
      activation = api.activateFromGesture({ purpose: "learn" });
    } catch (_) {
      pending = false;
      announce("failed", { reason: "activation-error" });
      return { ready: false, reason: "activation-error" };
    }
    try {
      const session = await bounded(activation);
      if (!isCurrent(token, id)) return { ready: false, reason: "stale" };
      if (session?.ready !== true) {
        announce("failed", { reason: session?.reason || "activation-denied" });
        return { ready: false, reason: session?.reason || "activation-denied" };
      }
      const result = await bounded(api.prepareNarration({
        soundId: SOUND_ID, requestId: id
      }));
      if (!isCurrent(token, id)) {
        try { void api.stopNarration?.({ requestId: id }); } catch (_) {}
        return { ready: false, reason: "stale" };
      }
      if (result?.prepared !== true) {
        announce("failed", { reason: result?.reason || "prepare-failed" });
        return { ready: false, reason: result?.reason || "prepare-failed" };
      }
      const started = await bounded(api.playNarration({ requestId: id }));
      if (!isCurrent(token, id)) return { ready: false, reason: "stale" };
      if (started?.accepted !== true) {
        announce("failed", { reason: started?.reason || "play-denied" });
        return { ready: false, reason: started?.reason || "play-denied" };
      }
      announce("playing", { requestId: id, durationMs: result.durationMs });
      return { ready: true, requestId: id, durationMs: result.durationMs };
    } catch (_) {
      if (isCurrent(token, id)) announce("failed", { reason: "bridge-timeout-or-error" });
      return { ready: false, reason: "bridge-timeout-or-error" };
    } finally {
      if (isCurrent(token, id)) pending = false;
    }
  }

  async function action(name, payload = {}) {
    if (pending || !currentId || !isAvailable() || root.document?.hidden)
      return { ready: false, reason: "no-current-narration" };
    const id = currentId;
    const api = bridge();
    if (typeof api?.[name] !== "function")
      return { ready: false, reason: "missing-bridge" };
    try {
      const result = await bounded(api[name]({ requestId: id, ...payload }));
      if (id !== currentId) return { ready: false, reason: "stale" };
      return result;
    } catch (_) { return { ready: false, reason: "bridge-error" }; }
  }

  function pause() { return action("pauseNarration"); }
  function resume() { return action("playNarration"); }
  async function seekForward() {
    const state = await action("getNarrationState");
    if (state?.requestId !== currentId || !state.prepared ||
        !Number.isInteger(state.positionMs) ||
        !Number.isInteger(state.durationMs) || state.durationMs < 1000)
      return { seeked: false, reason: "unavailable" };
    const positionMs = Math.min(state.durationMs - 500,
      state.positionMs + 5000);
    return action("seekNarration", { positionMs });
  }
  function state() {
    const api = bridge();
    return isAvailable() && typeof api?.getNarrationState === "function"
      ? bounded(api.getNarrationState()) : Promise.resolve({ prepared: false });
  }
  function stop() {
    const old = currentId;
    invalidate();
    if (old && isAvailable()) {
      try { Promise.resolve(bridge()?.stopNarration?.({ requestId: old }))
        .catch(() => {}); } catch (_) {}
    }
  }
  root.BibloZooNativeLearnNarrationPilot = Object.freeze({
    isAvailable, startFromGesture, pause, resume, seekForward, state, stop
  });
})(window);
