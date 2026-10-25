/* Patch 60: iOS-only interruption-aware, gesture-owned Web Audio recovery.
 * Never starts audio, changes categories, or allocates contexts. The caller
 * owns the original Resume gesture and must check the returned clock result.
 * Browser/PWA/Android paths do not enter this coordinator. */
(function installBibloZooAudioRecoveryCoordinator(root) {
  "use strict";
  const KEY = "biblozooAudioCoordination";
  const FIRST_SETTLE_MS = 320;
  const RECENT_INTERRUPTION_MS = 1400;
  const POST_ACTIVATION_MS = 320;
  const FINAL_SETTLE_MS = 380;
  let busy = false; // One recovery owner across Feeding and main-app audio.

  function isAvailable() {
    try {
      return root.Capacitor?.isNativePlatform?.() === true &&
        root.Capacitor?.getPlatform?.() === "ios" &&
        root.localStorage?.getItem(KEY) !== "0" &&
        typeof root.Capacitor?.Plugins?.BibloZooAudioSessionRecovery?.getRecoveryState === "function";
    } catch (_) { return false; }
  }
  function log(source, phase, details = {}) {
    try {
      root.BibloZooAudioDiagnostics?.record("audio-recovery-coordination", {
        activity: source, phase, ...details
      });
    } catch (_) { /* Optional diagnostics must never block sound. */ }
  }
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  // Capacitor calls may hang during an iOS media-services transition. A
  // bounded race ensures the coordinator releases its shared ownership.
  function bounded(promise, ms, fallback) {
    let timer;
    return Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise(resolve => { timer = setTimeout(() => resolve(fallback), ms); })
    ]).finally(() => clearTimeout(timer));
  }
  async function nativeState() {
    try {
      return await bounded(
        root.Capacitor.Plugins.BibloZooAudioSessionRecovery.getRecoveryState(),
        450, { available: false }
      );
    } catch (_) { return { available: false }; }
  }
  function freshInterruption(state) {
    return state?.lastInterruptionType === "began" &&
      typeof state.interruptionAgeMs === "number" &&
      state.interruptionAgeMs < RECENT_INTERRUPTION_MS;
  }

  // Called ONLY after the caller has already observed a frozen AudioContext
  // clock. Checks do not resume/replace contexts and thus do not require a
  // second gesture. Probe must return true only on actual clock advancement.
  async function recoverAfterStall({ source, probe, isCurrent }) {
    if (source !== "feeding" && source !== "app" ||
        !isAvailable() || typeof probe !== "function" ||
        typeof isCurrent !== "function" || root.document?.hidden) {
      return { recovered: false, reason: "unavailable" };
    }
    if (busy) {
      log(source, "busy");
      return { recovered: false, reason: "busy" };
    }
    busy = true;
    const current = () => !root.document?.hidden && isCurrent();
    const result = (recovered, reason) => ({ recovered: !!recovered, reason });
    const check = async phase => {
      if (!current()) return false;
      let advanced = false;
      try { advanced = await probe() === true; } catch (_) { advanced = false; }
      log(source, phase, { clockAdvanced: advanced });
      return advanced && current();
    };
    try {
      if (!current()) return result(false, "stale");
      const first = await nativeState();
      log(source, "start", {
        nativeAvailable: first?.available === true,
        interruptionSequence: first?.interruptionSequence,
        lastInterruptionType: first?.lastInterruptionType,
        outputPorts: first?.outputPorts
      });
      await delay(FIRST_SETTLE_MS);
      if (!current()) return result(false, "stale");
      if (await check("settled-recheck")) return result(true, "settled");
      if (!current()) return result(false, "stale");

      const second = await nativeState();
      // A recent interruption-began signal means setActive(true) is
      // premature. Wait only a bounded interval; a matching end event may
      // never arrive. Never infer session activation from these signals.
      if (second?.available !== true || second?.foreground !== true) {
        log(source, "native-skipped", { reason: "native-state-unavailable-or-inactive" });
      } else if (freshInterruption(second)) {
        log(source, "native-deferred", {
          reason: "recent-interruption",
          interruptionSequence: second.interruptionSequence
        });
      } else if (root.BibloZooNativeAudioRecovery?.isEnabled?.()) {
        log(source, "native-request");
        let nativeResult;
        try {
          nativeResult = await bounded(
            root.BibloZooNativeAudioRecovery.tryAfterClockStall(source),
            1000, { attempted: false, activated: false, reason: "native-timeout" }
          );
        } catch (_) { nativeResult = { reason: "bridge-error" }; }
        log(source, "native-result", {
          attempted: nativeResult?.attempted === true,
          activated: nativeResult?.activated === true,
          reason: nativeResult?.reason || "unknown"
        });
      } else {
        log(source, "native-skipped", { reason: "disabled" });
      }
      if (!current()) return result(false, "stale");
      await delay(POST_ACTIVATION_MS);
      if (await check("post-native-recheck")) return result(true, "post-native");
      if (!current()) return result(false, "stale");
      // A final bounded window accommodates late WebKit/interruption changes.
      // No additional AVAudioSession activation or context allocation.
      await delay(FINAL_SETTLE_MS);
      if (await check("final-recheck")) return result(true, "late-settled");
      return result(false, current() ? "clock-stalled" : "stale");
    } finally {
      busy = false;
    }
  }

  root.BibloZooAudioRecoveryCoordinator = Object.freeze({
    isAvailable, recoverAfterStall,
    disable() { try { root.localStorage?.setItem(KEY, "0"); } catch (_) {} },
    enable() { try { root.localStorage?.setItem(KEY, "1"); } catch (_) {} }
  });
})(window);
