/*
 * BibloZoo Kids PR3 — Settings parent visit and one-action outgoing links.
 * All approval state is RAM-only, tied to screen + active profile + foreground.
 * Uses the SAME shared math UI as Ghost Writer; never stores an unlock key.
 */
(function installBibloZooParentActions(root) {
  "use strict";

  const PARENT_SCREENS = new Set(["settings", "profile_manage", "privacy"]);

  function identity(win) {
    try {
      const cap = win.Capacitor;
      const nativeIOS = (cap?.isNativePlatform?.() === true &&
        cap?.getPlatform?.() === "ios") ||
        win.location?.protocol === "capacitor:";
      if (!nativeIOS) return "web-or-other";
      const marker = win.BibloZooNativeOnlyOutput;
      if (marker?.enabled === true && marker?.devToolsAllowed === true)
        return "audio-test";
      if (marker?.enabled === true && marker?.devToolsAllowed === false &&
          cap?.isNativePlatform?.() === true && cap?.getPlatform?.() === "ios")
        return "production-ios";
      return "unverified-native";
    } catch (_) {
      return "unverified-native";
    }
  }

  function create(win, { getScreen, getProfileId } = {}) {
    let visitUnlocked = false;
    let visitProfile = "";
    let generation = 0;
    let requestPending = false;

    function currentScreen() {
      try { return String(getScreen?.() || ""); } catch (_) { return ""; }
    }
    function currentProfile() {
      try { return String(getProfileId?.() || ""); } catch (_) { return ""; }
    }
    function foreground() {
      return win.document?.hidden !== true &&
        win.document?.visibilityState !== "hidden";
    }
    function invalidate() {
      visitUnlocked = false;
      visitProfile = "";
      generation++;
    }
    function onScreenChange(nextScreen) {
      if (!PARENT_SCREENS.has(String(nextScreen || ""))) {
        invalidate();
        win.BibloZooParentalGate?.cancelActive?.();
      }
    }
    function isAuthorized() {
      const mode = identity(win);
      if (mode === "web-or-other" || mode === "audio-test") return true;
      if (mode !== "production-ios") return false;
      const allowed = visitUnlocked && foreground() &&
        PARENT_SCREENS.has(currentScreen()) &&
        visitProfile === currentProfile() &&
        win.BibloZooParentalGate?.isAvailable?.() === true;
      if (!allowed && visitUnlocked) invalidate();
      return allowed;
    }

    async function run(kind, { isCurrent, onApproved } = {}) {
      if (typeof isCurrent !== "function" ||
          typeof onApproved !== "function" ||
          !isCurrent()) return false;
      const mode = identity(win);
      if (mode === "web-or-other" || mode === "audio-test") {
        return onApproved();
      }
      if (mode !== "production-ios" || !foreground() || requestPending ||
          (kind === "management" && !PARENT_SCREENS.has(currentScreen())))
        return false;

      if (kind === "management" && isAuthorized()) {
        return onApproved();
      }

      const gate = win.BibloZooParentalGate;
      if (typeof gate?.requestApproval !== "function" ||
          gate.isAvailable?.() !== true) return false;

      const startingGeneration = generation;
      const startingScreen = currentScreen();
      const startingProfile = currentProfile();
      let started = false;
      requestPending = true;
      try {
        return await gate.requestApproval({
          actionLabel: kind === "management"
            ? "A grown-up needs to approve these Zookeeper settings."
            : "A grown-up must approve opening this link or email.",
          onApproved: () => {
            if (started || startingGeneration !== generation ||
                currentScreen() !== startingScreen ||
                currentProfile() !== startingProfile ||
                !foreground() || !isCurrent() ||
                identity(win) !== "production-ios") return;
            started = true;
            if (kind === "management") {
              visitUnlocked = true;
              visitProfile = startingProfile;
            }
            return onApproved();
          }
        });
      } catch (error) {
        // No secondary route, download, link or mutation on gate failure.
        win.console?.warn?.("Parent action did not open", error);
        return false;
      } finally {
        requestPending = false;
      }
    }

    const document = win.document;
    document?.addEventListener?.("visibilitychange", () => {
      if (!foreground()) invalidate();
    }, true);
    win.addEventListener?.("pagehide", invalidate, true);
    win.addEventListener?.("popstate", invalidate, true);

    return Object.freeze({
      runManagement: options => run("management", options),
      runOutgoing: options => run("outgoing", options),
      isAuthorized,
      onScreenChange,
      invalidate
    });
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { create, identity };
  }
  root.BibloZooParentActions = Object.freeze({
    create: config => create(root, config)
  });
})(typeof window === "object" ? window : globalThis);
