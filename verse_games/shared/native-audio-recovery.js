/* Patch 59: optional native-only, bounded Web Audio recovery experiment.
 * Browsers, the installed PWA and Android never call AVAudioSession. */
(function installBibloZooNativeAudioRecovery(root) {
  "use strict";
  const KEY = "biblozooNativeAudioRecovery";

  function isEnabled() {
    try {
      return root.Capacitor?.getPlatform?.() === "ios" &&
        root.Capacitor?.isNativePlatform?.() === true &&
        root.localStorage?.getItem(KEY) !== "0" &&
        typeof root.Capacitor?.Plugins?.BibloZooAudioSessionRecovery
          ?.reactivateAfterClockStall === "function";
    } catch (err) { return false; }
  }

  function record(type, fields) {
    try { root.BibloZooAudioDiagnostics?.record(type, fields); }
    catch (err) { /* Opt-in diagnostics must not affect audio. */ }
  }

  // Invoked exclusively after an actual AudioContext.currentTime clock check
  // failed. A successful native activation is NEVER treated as sound recovery.
  async function tryAfterClockStall(source) {
    if (source !== "feeding" && source !== "app")
      return { attempted: false, activated: false, reason: "invalid-source" };
    if (!isEnabled() || root.document?.hidden)
      return { attempted: false, activated: false, reason: "disabled-or-unavailable" };
    const plugin = root.Capacitor.Plugins.BibloZooAudioSessionRecovery;
    record("native-audio-reactivation-request", { activity: source });
    try {
      const result = await plugin.reactivateAfterClockStall({
        source, clockStalled: true
      });
      const outcome = {
        attempted: result?.attempted === true,
        activated: result?.activated === true,
        reason: String(result?.reason || "unknown")
      };
      // The native method shares one cooldown/foreground limit between all
      // audio engines. Error codes and category are developer diagnostics only.
      record("native-audio-reactivation-result", {
        activity: source, ...outcome,
        attempt: result?.attempt, category: result?.category,
        otherAudioPlayingBefore: result?.otherAudioPlayingBefore,
        otherAudioPlayingAfter: result?.otherAudioPlayingAfter,
        errorDomain: result?.errorDomain, errorCode: result?.errorCode
      });
      return outcome;
    } catch (err) {
      record("native-audio-reactivation-result", {
        activity: source, attempted: false, activated: false,
        reason: "bridge-error"
      });
      return { attempted: false, activated: false, reason: "bridge-error" };
    }
  }

  root.BibloZooNativeAudioRecovery = Object.freeze({
    isEnabled,
    tryAfterClockStall,
    disable() { try { root.localStorage?.setItem(KEY, "0"); } catch (err) { } },
    enable() { try { root.localStorage?.setItem(KEY, "1"); } catch (err) { } }
  });
})(window);
