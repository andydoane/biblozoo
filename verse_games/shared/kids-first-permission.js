/*
 * Kids PR4: one-action grown-up approval before new native iOS permission
 * prompts. Native status is always checked fresh. No token, disk approval,
 * microphone PCM or Photos data is ever stored here.
 */
(function installBibloZooKidsFirstPermission(root) {
  "use strict";

  function identity(win) {
    try {
      if (win.Capacitor?.isNativePlatform?.() !== true ||
          win.Capacitor?.getPlatform?.() !== "ios") return "other";
      const marker = win.BibloZooNativeOnlyOutput;
      if (marker?.enabled === true && marker?.devToolsAllowed === true)
        return "audio-test";
      if (marker?.enabled === true && marker?.devToolsAllowed === false)
        return "kids";
    } catch (_) {}
    return "unknown";
  }

  function create(win) {
    let pending = false;
    async function ensure({ kind, getStatus, requestFirst, isCurrent } = {}) {
      if (!["microphone", "photos"].includes(kind) ||
          typeof getStatus !== "function" ||
          typeof requestFirst !== "function" ||
          typeof isCurrent !== "function" ||
          !isCurrent() || pending) {
        return { granted: false, reason: "unavailable" };
      }
      if (identity(win) === "audio-test") return { granted: true, reason: "audio-test" };
      if (identity(win) !== "kids") return { granted: false, reason: "unverified" };
      pending = true;
      try {
        const state = await getStatus();
        if (!isCurrent() || win.document?.hidden === true ||
            win.document?.visibilityState === "hidden" ||
            identity(win) !== "kids") {
          return { granted: false, reason: "interrupted" };
        }
        if (state?.permission === "granted") return { granted: true, reason: "already-granted" };
        if (state?.permission === "denied") return { granted: false, reason: "denied" };
        if (state?.permission !== "undetermined") {
          return { granted: false, reason: "unknown-state" };
        }

        const gate = win.BibloZooParentalGate;
        if (!gate?.isAvailable?.() || typeof gate.requestApproval !== "function") {
          return { granted: false, reason: "missing-grown-up-check" };
        }
        let launched = false;
        let approved = false;
        const finished = await gate.requestApproval({
          actionLabel: kind === "microphone"
            ? "A grown-up needs to approve the first microphone request."
            : "A grown-up needs to approve the first Add Photos request.",
          onApproved: async () => {
            if (launched || !isCurrent() ||
                win.document?.hidden === true ||
                win.document?.visibilityState === "hidden" ||
                identity(win) !== "kids") return;
            launched = true;
            // iOS may hide the WebView *after* this native call launches.
            // An OS prompt is allowed to finish in the background; a
            // canceled/stale JS challenge never reaches this method.
            const reply = await requestFirst();
            approved = reply?.granted === true;
          }
        });
        return {
          granted: launched && finished === true && approved,
          reason: !launched || finished !== true ? "cancelled" :
            approved ? "approved" : "denied"
        };
      } catch (_) {
        return { granted: false, reason: "failed" };
      } finally {
        pending = false;
      }
    }
    return Object.freeze({ ensure, isPending: () => pending });
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { create, identity };
  }
  root.BibloZooKidsFirstPermission = Object.freeze({ create: () => create(root) });
})(typeof window === "object" ? window : globalThis);
