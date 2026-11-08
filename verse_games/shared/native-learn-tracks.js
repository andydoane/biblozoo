/* N5b.3 — one short/part native narration at a time for Learn.
 * Strict local Swift allowlist; no Web/HTML audio output fallback.
 * The activity owns completion, repeat delays, instruction ready state,
 * interruption overlay and all verse/pet progress.
 */
(function installNativeLearnTracks(root) {
  "use strict";
  const REQUEST_TIMEOUT_MS = 4500;
  const FIRST_PROGRESS_MS = 4500;
  const POLL_MS = 160;
  let sequence = 10000000; // Disjoint from DEV/N5b.2 Listen IDs.
  let serial = 0;
  let primed = null;
  let current = null;
  let bound = false;
  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function api() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function bounded(value, timeoutMs = REQUEST_TIMEOUT_MS) {
    let timer;
    return Promise.race([
      Promise.resolve(value),
      new Promise((_, reject) => {
        timer = root.setTimeout(() => reject(new Error("native-timeout")), timeoutMs);
      })
    ]).finally(() => root.clearTimeout(timer));
  }
  function stopNative(id) {
    if (!id || !isAvailable()) return;
    try {
      Promise.resolve(api()?.stopNarration?.({ requestId: id })).catch(() => {});
    } catch (_) { /* Native rejects stale requests. */ }
  }
  function isCurrent(a) {
    return current === a && !a.finished && !root.document?.hidden &&
      isAvailable();
  }
  function clear(a) {
    if (a.pollTimer != null) root.clearInterval(a.pollTimer);
    if (a.watchdog != null) root.clearTimeout(a.watchdog);
    a.pollTimer = null;
    a.watchdog = null;
  }
  function settle(a, ended, reason = "", notifyInterruption = false) {
    if (a.finished) return;
    a.finished = true;
    clear(a);
    if (current === a) current = null;
    stopNative(a.id);
    a.resolve({
      ended, reason, soundId: a.soundId, requestId: a.id,
      durationMs: a.durationMs, positionMs: a.positionMs
    });
    if (notifyInterruption && typeof a.onInterrupted === "function") {
      try { a.onInterrupted({
        soundId: a.soundId, requestId: a.id,
        positionMs: a.positionMs, durationMs: a.durationMs
      }); } catch (_) { /* Activity callback may not break native safety. */ }
    }
  }
  function stop() {
    if (current) settle(current, false, "stopped");
  }
  function invalidate() {
    primed = null;
    serial++;
    if (current) settle(current, false, "interrupted", true);
  }
  function bind() {
    if (bound || !isAvailable()) return;
    bound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document?.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", invalidate);
    root.addEventListener?.("blur", invalidate);
    try {
      Promise.resolve(api()?.addListener?.("biblozooAppLifecycle", e => {
        if (e?.active === false || e?.active === true) invalidate();
      })).catch(() => {});
      Promise.resolve(api()?.addListener?.("biblozooNarration", e => {
        const a = current;
        if (!a || !isCurrent(a) || e?.requestId !== a.id) return;
        if (e.type === "invalidated") {
          invalidate(); // Swift invalidation has requestId but no soundId.
          return;
        }
        if (e.soundId !== a.soundId) return;
        if (e.type === "ended") settle(a, true, "native-ended");
        else if (e.type === "failed")
          settle(a, false, "native-completion-failed");
      })).catch(() => {});
    } catch (_) { /* Visibility/pagehide still fence source completion. */ }
  }
  // Call directly within the child's genuine navigation/Resume/Start tap.
  // This primes the native session without playing during a slide transition.
  // The pending activation survives the app's normal go() cancelLearnAudio.
  function primeFromGesture() {
    if (!isAvailable() || root.document?.hidden || !api()?.activateFromGesture)
      return false;
    bind();
    const token = ++serial;
    try {
      primed = {
        token,
        promise: bounded(api().activateFromGesture({ purpose: "learn" }))
          .catch(() => ({ ready: false, reason: "activation-error" }))
      };
      return true;
    } catch (_) {
      primed = null;
      return false;
    }
  }
  function poll(a) {
    if (!isCurrent(a) || a.polling || !a.started) return;
    a.polling = true;
    bounded(api().getNarrationState(), 1100).then(state => {
      if (!isCurrent(a) || state?.requestId !== a.id ||
          state.soundId !== a.soundId || state.prepared !== true ||
          state.playing !== true) return;
      const pos = state.positionMs;
      if (!Number.isInteger(pos) || pos < 0 || pos > a.durationMs ||
          pos <= a.positionMs + 15) return;
      a.positionMs = pos;
      if (a.watchdog != null) root.clearTimeout(a.watchdog);
      a.watchdog = null;
      if (typeof a.onProgress === "function") {
        try { a.onProgress({ positionMs: pos, durationMs: a.durationMs,
          requestId: a.id, soundId: a.soundId }); } catch (_) {}
      }
    }).catch(() => {}).finally(() => { a.polling = false; });
  }
  async function play(soundId, { onProgress, onInterrupted,
    positionMs = 0 } = {}) {
    if (!isAvailable() || root.document?.hidden || typeof soundId !== "string" ||
        !/^(learn-instruction-[a-z0-9_]+|learn-part-[a-z0-9_]+-[0-9]+)$/.test(soundId))
      return { ended: false, reason: "invalid-source" };
    const bridge = api();
    if (typeof bridge?.prepareNarration !== "function" ||
        typeof bridge?.playNarration !== "function" ||
        typeof bridge?.getNarrationState !== "function" ||
        typeof bridge?.stopNarration !== "function" ||
        typeof bridge?.seekNarration !== "function")
      return { ended: false, reason: "missing-bridge" };

    bind();
    stop();
    const myPrime = primed;
    primed = null;
    const a = {
      id: ++sequence, soundId, positionMs: 0, durationMs: 0,
      started: false, finished: false, pollTimer: null,
      watchdog: null, polling: false, onProgress, onInterrupted,
      resolve: null
    };
    current = a;
    const result = new Promise(resolve => { a.resolve = resolve; });
    (async () => {
      try {
        if (myPrime) {
          const activated = await myPrime.promise;
          if (!isCurrent(a)) return;
          if (activated?.ready !== true) {
            settle(a, false, activated?.reason || "activation-refused");
            return;
          }
        }
        const prepared = await bounded(bridge.prepareNarration({
          soundId: a.soundId, requestId: a.id
        }));
        if (!isCurrent(a)) { stopNative(a.id); return; }
        if (prepared?.prepared !== true || prepared.soundId !== a.soundId ||
            prepared.requestId !== a.id ||
            !Number.isInteger(prepared.durationMs) || prepared.durationMs <= 0) {
          settle(a, false, prepared?.reason || "prepare-refused"); return;
        }
        a.durationMs = prepared.durationMs;
        if (Number.isInteger(positionMs) && positionMs > 0) {
          // A native-ended callback, never a resume checkpoint, awards credit.
          const target = Math.min(positionMs, Math.max(0, a.durationMs - 250));
          if (target > 0) {
            const seek = await bounded(bridge.seekNarration({
              requestId: a.id, positionMs: target
            }));
            if (!isCurrent(a)) return;
            if (seek?.seeked !== true || seek.requestId !== a.id) {
              settle(a, false, "seek-refused"); return;
            }
            a.positionMs = target;
          }
        }
        const started = await bounded(bridge.playNarration({ requestId: a.id }));
        if (!isCurrent(a)) return;
        if (started?.accepted !== true || started.requestId !== a.id) {
          settle(a, false, started?.reason || "play-refused"); return;
        }
        a.started = true;
        a.pollTimer = root.setInterval(() => poll(a), POLL_MS);
        a.watchdog = root.setTimeout(() => {
          if (isCurrent(a) && a.watchdog != null)
            settle(a, false, "no-native-progress");
        }, FIRST_PROGRESS_MS);
      } catch (_) {
        if (isCurrent(a)) settle(a, false, "bridge-timeout-or-error");
      }
    })();
    return result;
  }
  root.BibloZooNativeLearnTracks = Object.freeze({
    isAvailable, primeFromGesture, play, stop, invalidate
  });
})(window);
