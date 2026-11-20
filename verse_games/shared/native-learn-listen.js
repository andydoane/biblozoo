/* N5b.2 — child Learn Listen native reference → full-verse sequencer.
 * Only on isolated native-only Capacitor iOS; browser/PWA/Android remain
 * unchanged. The Swift bridge validates the bundled published-verse manifest.
 * Start/resume activation is invoked synchronously by a real child tap.
 */
(function installBibloZooNativeLearnListen(root) {
  "use strict";
  const PREFLIGHT_MS = 4500;
  const PROGRESS_MS = 240;
  const STARTUP_LIMIT_MS = 4500;
  let generation = 0;
  let nextId = 1000000; // DEV N5b.1 IDs begin at 1; avoid request-ID overlap.
  let active = null;
  let bound = false;
  let primedGesture = null;

  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function api() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function isCurrent(a) {
    return active === a && a.token === generation &&
      isAvailable() && !root.document?.hidden;
  }
  function notify(a, kind, extra = {}) {
    try {
      a.onEvent?.({
        kind, verseId: a.verseId, stage: a.stage,
        requestId: a.requestId, positionMs: a.positionMs,
        durationMs: a.durationMs, ...extra
      });
    } catch (_) { /* No UI exception may disrupt the audio owner. */ }
  }
  function bounded(task, maxMs = PREFLIGHT_MS) {
    let timer;
    return Promise.race([
      Promise.resolve(task),
      new Promise((_, reject) => {
        timer = root.setTimeout(() => reject(new Error("timeout")), maxMs);
      })
    ]).finally(() => root.clearTimeout(timer));
  }
  function stopTimers(a) {
    if (a.pollTimer != null) root.clearInterval(a.pollTimer);
    if (a.startupTimer != null) root.clearTimeout(a.startupTimer);
    a.pollTimer = null;
    a.startupTimer = null;
  }
  function stopNative(requestId) {
    if (!requestId || !isAvailable()) return;
    try {
      Promise.resolve(api()?.stopNarration?.({ requestId })).catch(() => {});
    } catch (_) { /* Stale native ID is rejected by Swift. */ }
  }
  function release(a, kind = null, extra = {}) {
    if (active !== a) return;
    stopTimers(a);
    active = null;
    generation++;
    if (kind) notify(a, kind, extra);
    stopNative(a.requestId);
  }
  function stop() {
    if (active) release(active);
  }
  function interrupt() {
    primedGesture = null;
    if (!active) return;
    release(active, "interrupted");
  }
  function bind() {
    if (bound || !isAvailable()) return;
    bound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document.hidden) interrupt();
    });
    root.addEventListener?.("pagehide", interrupt);
    root.addEventListener?.("blur", interrupt);
    try {
      const bridge = api();
      Promise.resolve(bridge?.addListener?.("biblozooAppLifecycle", event => {
        if (event?.active === false || event?.active === true) interrupt();
      })).catch(() => {});
      Promise.resolve(bridge?.addListener?.("biblozooNarration", event => {
        const a = active;
        if (!a || !isCurrent(a) || a.requestId !== event?.requestId) return;
        // N5b.1 Swift invalidated events deliberately contain only requestId
        // and reason, no soundId. Route/media-reset must still pause Learn.
        if (event.type === "invalidated") { interrupt(); return; }
        if (event?.soundId !== a.soundId) return;
        if (event.type === "ended") {
          stopTimers(a);
          if (a.stage === "reference") {
            notify(a, "stage-ended");
            // A reference completion may transition within this previously
            // human-activated, still-foreground native session. Do NOT call
            // activateFromGesture from this asynchronous completion callback.
            void playStage(a, "verse", 0);
          } else if (a.stage === "verse") {
            release(a, "completed");
          }
        } else if (event.type === "invalidated") {
          interrupt();
        } else if (event.type === "failed") {
          release(a, "failed", { reason: "native-completion-failed" });
        }
      })).catch(() => {});
    } catch (_) { /* Standard visibility and blur remain safeguards. */ }
  }
  async function poll(a) {
    if (!isCurrent(a) || a.pending || a.polling) return;
    a.polling = true;
    try {
      const state = await bounded(api()?.getNarrationState?.(), 950);
      if (!isCurrent(a) || state?.requestId !== a.requestId ||
          state?.soundId !== a.soundId || state.prepared !== true) return;
      if (Number.isInteger(state.durationMs) && state.durationMs > 0)
        a.durationMs = state.durationMs;
      if (state.playing === true &&
          Number.isInteger(state.positionMs) &&
          state.positionMs >= 0 && state.positionMs <= a.durationMs) {
        const advanced = state.positionMs > a.positionMs + 20;
        a.positionMs = state.positionMs;
        if (advanced) {
          a.progressSeen = true;
          if (a.startupTimer != null) root.clearTimeout(a.startupTimer);
          a.startupTimer = null;
          notify(a, "progress");
        }
      }
    } catch (_) { /* Native refusal is bounded; startup watchdog catches stalls. */ }
    finally { a.polling = false; }
  }
  async function playStage(a, stage, resumeMs = 0) {
    if (!isCurrent(a)) return { ready: false, reason: "stale" };
    stopTimers(a);
    a.pending = true;
    a.polling = false;
    a.progressSeen = false;
    a.stage = stage;
    a.positionMs = 0;
    a.durationMs = 0;
    a.requestId = ++nextId;
    a.soundId = (stage === "reference" ? "learn-ref-" : "learn-verse-") + a.verseId;
    const requestId = a.requestId;
    notify(a, "stage");
    try {
      const result = await bounded(api().prepareNarration({
        soundId: a.soundId, requestId
      }));
      if (!isCurrent(a) || a.requestId !== requestId)
        return { ready: false, reason: "stale" };
      if (result?.prepared !== true || result.soundId !== a.soundId ||
          result.requestId !== requestId || !Number.isInteger(result.durationMs) ||
          result.durationMs <= 0) {
        release(a, "failed", { reason: result?.reason || "prepare-refused" });
        return { ready: false, reason: "prepare-refused" };
      }
      a.durationMs = result.durationMs;
      if (Number.isInteger(resumeMs) && resumeMs >= 100) {
        // A checkpoint is not proof of completion. Clamp below the end so
        // the actual native ended callback is still required to advance.
        const targetMs = Math.min(resumeMs, Math.max(0, a.durationMs - 250));
        if (targetMs >= 100) {
          const seek = await bounded(api().seekNarration({
            requestId, positionMs: targetMs
          }));
          if (!isCurrent(a) || a.requestId !== requestId)
            return { ready: false, reason: "stale" };
          if (seek?.seeked !== true || seek.requestId !== requestId) {
            release(a, "failed", { reason: "seek-refused" });
            return { ready: false, reason: "seek-refused" };
          }
          a.positionMs = targetMs;
        }
      }
      const play = await bounded(api().playNarration({ requestId }));
      if (!isCurrent(a) || a.requestId !== requestId)
        return { ready: false, reason: "stale" };
      if (play?.accepted !== true || play.requestId !== requestId) {
        release(a, "failed", { reason: play?.reason || "play-refused" });
        return { ready: false, reason: "play-refused" };
      }
      a.pending = false;
      notify(a, "playing");
      a.pollTimer = root.setInterval(() => { void poll(a); }, PROGRESS_MS);
      a.startupTimer = root.setTimeout(() => {
        if (isCurrent(a) && a.requestId === requestId &&
            !a.progressSeen) release(a, "failed", { reason: "no-progress" });
      }, STARTUP_LIMIT_MS);
      return { ready: true, requestId, stage, durationMs: a.durationMs };
    } catch (_) {
      if (isCurrent(a)) release(a, "failed", { reason: "native-timeout-or-error" });
      return { ready: false, reason: "native-timeout-or-error" };
    }
  }
  // The Learn instruction "Read It To Me" tap can activate native audio
  // *before* the screen slides to Listen. No sound plays until slide finish.
  // Invalidation on background forbids an old priming promise from auto-play.
  function primeFromGesture() {
    if (!isAvailable() || root.document?.hidden ||
        typeof api()?.activateFromGesture !== "function") return false;
    bind();
    try {
      const result = api().activateFromGesture({ purpose: "learn" });
      primedGesture = bounded(result)
        .catch(() => ({ ready: false, reason: "activation-error" }));
      return true;
    } catch (_) {
      primedGesture = null;
      return false;
    }
  }
  function hasPrimedGesture() { return !!primedGesture && isAvailable(); }

  async function startFromGesture({ verseId, stage = "reference",
      positionMs = 0, onEvent, fromPrimedGesture = false } = {}) {
    if (!isAvailable() || root.document?.hidden ||
        typeof onEvent !== "function" ||
        !/^[0-9a-z]+(?:_[0-9a-z]+)*$/.test(verseId || "") ||
        verseId.length > 80 ||
        !["reference", "verse"].includes(stage)) {
      return { ready: false, reason: "invalid-request" };
    }
    const bridge = api();
    if (typeof bridge?.activateFromGesture !== "function" ||
        typeof bridge?.prepareNarration !== "function" ||
        typeof bridge?.playNarration !== "function" ||
        typeof bridge?.seekNarration !== "function" ||
        typeof bridge?.getNarrationState !== "function") {
      return { ready: false, reason: "missing-bridge" };
    }
    stop();
    bind();
    const a = {
      token: ++generation, verseId, stage, onEvent,
      positionMs: 0, durationMs: 0, requestId: null,
      soundId: "", pending: true, polling: false,
      pollTimer: null, startupTimer: null, progressSeen: false
    };
    active = a;
    notify(a, "preparing");
    let activation;
    try {
      if (fromPrimedGesture) {
        // If return/background invalidated the saved tap, show a retry
        // rather than silently re-activating after the slide.
        activation = primedGesture ||
          Promise.resolve({ ready: false, reason: "no-primed-gesture" });
        primedGesture = null;
      } else {
        primedGesture = null;
        // This invocation is synchronous inside a genuine Learn/Resume tap.
        activation = bridge.activateFromGesture({ purpose: "learn" });
      }
    } catch (_) {
      release(a, "failed", { reason: "activation-error" });
      return { ready: false, reason: "activation-error" };
    }
    try {
      const activated = await bounded(activation);
      if (!isCurrent(a)) return { ready: false, reason: "stale" };
      if (activated?.ready !== true) {
        release(a, "failed", { reason: activated?.reason || "activation-refused" });
        return { ready: false, reason: "activation-refused" };
      }
      return await playStage(a, stage, positionMs);
    } catch (_) {
      if (isCurrent(a)) release(a, "failed", { reason: "activation-timeout" });
      return { ready: false, reason: "activation-timeout" };
    }
  }
  root.BibloZooNativeLearnListen = Object.freeze({
    isAvailable, startFromGesture, primeFromGesture,
    hasPrimedGesture, stop
  });
})(window);
