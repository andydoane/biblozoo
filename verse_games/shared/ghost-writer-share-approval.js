/*
 * Kids PR 2 — Ghost Writer's one-action native Share approval adapter.
 * Uses the shared parental-gate UI; never generates any media itself.
 * Native production iOS fails closed if its gate or bundle identity is missing.
 * The separate Audio Test build keeps its pre-existing direct Share workflow.
 */
(function installBibloZooGhostWriterShareApproval(root) {
  "use strict";

  function nativeIdentity(win) {
    try {
      if (win.Capacitor?.isNativePlatform?.() !== true ||
          win.Capacitor?.getPlatform?.() !== "ios" ||
          win.location?.protocol !== "capacitor:" ||
          win.BibloZooNativeOnlyOutput?.enabled !== true) return "denied";
      return win.BibloZooNativeOnlyOutput.devToolsAllowed === false
        ? "production"
        : win.BibloZooNativeOnlyOutput.devToolsAllowed === true
          ? "audio-test" : "denied";
    } catch (_) {
      return "denied";
    }
  }

  function create(win) {
    let pending = false;

    async function run({ kind, isCurrent, setBusy, onApproved, onUnavailable } = {}) {
      if (kind !== "picture" && kind !== "video") return false;
      if (typeof isCurrent !== "function" ||
          typeof setBusy !== "function" ||
          typeof onApproved !== "function" ||
          pending || !isCurrent()) return false;

      const identity = nativeIdentity(win);
      if (identity === "audio-test") {
        // The distinct diagnostics-only Audio Test build is not the Kids app.
        // Retain its already-tested export controls, not a fake Kids unlock.
        return onApproved();
      }
      const gate = win.BibloZooParentalGate;
      if (identity !== "production" ||
          typeof gate?.requestApproval !== "function" ||
          gate?.isAvailable?.() !== true ||
          win.document?.hidden || win.document?.visibilityState === "hidden") {
        onUnavailable?.();
        return false;
      }

      pending = true;
      setBusy(true);
      let started = false;
      try {
        const approved = await gate.requestApproval({
          actionLabel: kind === "picture"
            ? "Sharing this picture needs a grown-up."
            : "Sharing this video needs a grown-up.",
          onApproved: async () => {
            // The gate may have just been answered after Remix was recreated,
            // hidden, or navigated away from. Do not mint a reusable approval.
            if (started || !isCurrent() ||
                win.document?.hidden ||
                win.document?.visibilityState === "hidden" ||
                nativeIdentity(win) !== "production") return;
            started = true;
            // Re-enable just before the selected action's synchronous busy lock.
            // No event can interleave within this synchronous handoff.
            setBusy(false);
            await onApproved();
          }
        });
        return approved === true && started;
      } catch (error) {
        // Never retry via the unguarded native share/download route.
        onUnavailable?.(error);
        return false;
      } finally {
        pending = false;
        setBusy(false);
      }
    }

    return Object.freeze({
      run,
      isPending: () => pending
    });
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { create, nativeIdentity };
  }
  root.BibloZooGhostWriterShareApproval = Object.freeze({ create: () => create(root) });
})(typeof window === "object" ? window : globalThis);
