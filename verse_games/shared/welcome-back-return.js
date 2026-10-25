/* BibloZoo Patch 62: reusable task-switch prompt for standalone activities.
 * Presentation and identity are owned by welcome-back.js/css; the activity
 * owns pausing, audio preparation and safe continuation on a real tap.
 * No native activation, category changes, or automatic retry loops here.
 */
(function installWelcomeBackReturn(root) {
  "use strict";

  function attach({ shouldPrompt, onPause, onContinue, profileId, pictureBase, name } = {}) {
    if (!root.document?.body || !root.BibloZooWelcomeBack ||
        typeof shouldPrompt !== "function" ||
        typeof onPause !== "function" ||
        typeof onContinue !== "function") return null;

    const document = root.document;
    const overlay = document.createElement("div");
    overlay.className = "bz-welcome-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "verseGameWelcomeTitle");
    overlay.innerHTML = root.BibloZooWelcomeBack.markup("game");
    document.body.appendChild(overlay);
    const button = overlay.querySelector("[data-welcome-back-action]");
    const status = overlay.querySelector("[data-welcome-back-status]");
    let hasBeenVisible = !document.hidden;
    let away = false;
    let pending = false;
    let processing = false;
    let disposed = false;

    function show() {
      if (!pending || disposed || document.hidden) return;
      root.BibloZooWelcomeBack.populate(overlay, { profileId, pictureBase, name });
      root.BibloZooWelcomeBack.setAction(overlay);
      if (status) { status.textContent = ""; status.hidden = true; }
      overlay.hidden = false;
      button?.focus?.({ preventScroll: true });
    }

    function leave() {
      if (disposed || !hasBeenVisible || away || !shouldPrompt()) return;
      away = true;
      pending = true;
      try { onPause(); } catch (_) { /* Do not crash app lifecycle. */ }
    }

    function visible() {
      if (disposed) return;
      if (document.hidden) { leave(); return; }
      hasBeenVisible = true;
      away = false;
      show();
    }

    function pageHidden() { leave(); }

    function result(ok) {
      if (disposed) return;
      processing = false;
      if (ok === true && !document.hidden) {
        pending = false;
        overlay.hidden = true;
        return;
      }
      root.BibloZooWelcomeBack.setAction(overlay, { retry: true });
      if (status) {
        status.hidden = false;
        status.textContent = "Sound isn't ready. Let's try again!";
      }
    }

    function action() {
      if (disposed || processing || !pending || document.hidden) return;
      processing = true;
      root.BibloZooWelcomeBack.setAction(overlay, { busy: true });
      if (status) { status.hidden = true; status.textContent = ""; }
      // Invoke synchronously from the real tap before awaiting the promise.
      // AudioContext.resume() must be initiated by onContinue during gesture.
      try {
        Promise.resolve(onContinue()).then(result, () => result(false));
      } catch (_) { result(false); }
    }

    document.addEventListener("visibilitychange", visible);
    root.addEventListener("pagehide", pageHidden);
    root.addEventListener("pageshow", visible);
    button?.addEventListener("click", action);

    return Object.freeze({
      isPaused: () => pending,
      destroy() {
        if (disposed) return;
        disposed = true;
        document.removeEventListener("visibilitychange", visible);
        root.removeEventListener("pagehide", pageHidden);
        root.removeEventListener("pageshow", visible);
        button?.removeEventListener("click", action);
        overlay.remove();
      }
    });
  }

  // Game-owned unlock() executes synchronously in the actual button click.
  // A context being "running" is insufficient; wait for its audio clock to move.
  function resumeAudioOnGesture({ unlock, getContext, isCurrent, muted = false } = {}) {
    let request;
    try { request = typeof unlock === "function" ? unlock() : null; }
    catch (_) { return Promise.resolve(false); }
    const context = getContext?.();
    if (muted) return Promise.resolve(true);
    if (!context) return Promise.resolve(false);

    const probe = async () => {
      if (!isCurrent?.() || context.state !== "running") return false;
      const before = context.currentTime;
      await new Promise(resolve => setTimeout(resolve, 190));
      return isCurrent() && getContext() === context &&
        context.state === "running" && context.currentTime - before >= 0.02;
    };

    return (async () => {
      // A suspended resume() can remain unresolved indefinitely on iOS.
      if (request && typeof request.then === "function") {
        await Promise.race([
          Promise.resolve(request).catch(() => false),
          new Promise(resolve => setTimeout(resolve, 1300))
        ]);
      }
      if (!isCurrent?.()) return false;
      if (await probe()) return true;
      const coordinator = root.BibloZooAudioRecoveryCoordinator;
      if (!coordinator?.isAvailable?.() || !isCurrent()) return false;
      try {
        const result = await coordinator.recoverAfterStall({
          source: "app", probe, isCurrent: () => isCurrent() && getContext() === context
        });
        return result?.recovered === true && isCurrent() && getContext() === context;
      } catch (_) { return false; }
    })();
  }

  root.BibloZooWelcomeBackReturn = Object.freeze({ attach, resumeAudioOnGesture });
})(window);
