/* BibloZoo Patch 62: reusable task-switch prompt for standalone activities.
 * Presentation and identity are owned by welcome-back.js/css; the activity
 * owns pausing, audio preparation and safe continuation on a real tap.
 * No native activation, category changes, or automatic retry loops here.
 */
(function installWelcomeBackReturn(root) {
  "use strict";

  function attach({ shouldPrompt, onPause, onContinue, onExit, profileId, pictureBase, name } = {}) {
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
    // The standard popup stays one-button. Only after recovery has failed (or
    // taken unusually long) does a safe way back to the Games screen appear.
    const escape = document.createElement("button");
    escape.type = "button";
    escape.className = "bz-welcome-escape no-zoom";
    escape.textContent = "Back to Games";
    escape.hidden = true;
    overlay.querySelector("[data-welcome-back-card]")?.appendChild(escape);
    const ESCAPE_WATCHDOG_MS = 7500;
    let escapeTimer = 0;
    let exiting = false;
    const log = (type, details = {}) => {
      try { root.BibloZooAudioDiagnostics?.record(type, details); } catch (_) {}
    };
    let hasBeenVisible = !document.hidden;
    let away = false;
    let pending = false;
    let processing = false;
    let attemptSerial = 0;
    let disposed = false;

    function show() {
      if (!pending || disposed || exiting || document.hidden) return;
      root.BibloZooWelcomeBack.populate(overlay, { profileId, pictureBase, name });
      root.BibloZooWelcomeBack.setAction(overlay);
      if (status) { status.textContent = ""; status.hidden = true; }
      escape.hidden = true;
      overlay.hidden = false;
      button?.focus?.({ preventScroll: true });
    }

    function leave() {
      if (disposed || !hasBeenVisible || away || !shouldPrompt()) return;
      away = true;
      pending = true;
      // A second task switch invalidates the older gesture's asynchronous
      // result; a hung iOS promise must not block a fresh tap on return.
      attemptSerial += 1;
      processing = false;
      if (escapeTimer) { root.clearTimeout(escapeTimer); escapeTimer = 0; }
      try { onPause(); } catch (_) { /* Do not crash app lifecycle. */ }
      log("welcome-back-backgrounded");
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
      if (disposed || exiting) return;
      if (escapeTimer) { root.clearTimeout(escapeTimer); escapeTimer = 0; }
      processing = false;
      log("welcome-back-recovery-result", { recovered: ok === true });
      if (ok === true && !document.hidden) {
        pending = false;
        overlay.hidden = true;
        escape.hidden = true;
        return;
      }
      escape.hidden = false;
      root.BibloZooWelcomeBack.setAction(overlay, { retry: true });
      if (status) {
        status.hidden = false;
        status.textContent = "Sound isn't ready. Let's try again!";
      }
    }

    function action() {
      if (disposed || processing || !pending || document.hidden) return;
      processing = true;
      const thisAttempt = ++attemptSerial;
      escape.hidden = true;
      log("welcome-back-recovery-gesture");
      // If WebKit leaves a recovery promise pending, preserve the paused game
      // but reveal navigation. Do not auto-retry or claim audio is restored.
      escapeTimer = root.setTimeout(() => {
        escapeTimer = 0;
        if (disposed || exiting || thisAttempt !== attemptSerial || !processing || !pending || document.hidden) return;
        escape.hidden = false;
        if (status) {
          status.hidden = false;
          status.textContent = "Sound is taking longer than expected.";
        }
        log("welcome-back-recovery-slow");
      }, ESCAPE_WATCHDOG_MS);
      root.BibloZooWelcomeBack.setAction(overlay, { busy: true });
      if (status) { status.hidden = true; status.textContent = ""; }
      // Invoke synchronously from the real tap before awaiting the promise.
      // AudioContext.resume() must be initiated by onContinue during gesture.
      try {
        Promise.resolve(onContinue()).then(
          ok => { if (thisAttempt === attemptSerial) result(ok); },
          () => { if (thisAttempt === attemptSerial) result(false); }
        );
      } catch (_) { if (thisAttempt === attemptSerial) result(false); }
    }

    function exit() {
      if (disposed || exiting || escape.hidden || document.hidden) return;
      exiting = true;
      attemptSerial += 1;
      if (escapeTimer) { root.clearTimeout(escapeTimer); escapeTimer = 0; }
      escape.disabled = true;
      if (button) button.disabled = true;
      if (status) {
        status.hidden = false;
        status.textContent = "Returning to games...";
      }
      log("welcome-back-exit-requested");
      try {
        if (typeof onExit === "function") onExit();
        else root.VerseGameBridge?.exitGame?.();
      } catch (_) {
        // Failed navigation must not turn a recoverable prompt into a trap.
        exiting = false;
        escape.disabled = false;
        if (status) status.textContent = "Couldn't leave the game. Try again.";
      }
    }

    document.addEventListener("visibilitychange", visible);
    root.addEventListener("pagehide", pageHidden);
    root.addEventListener("pageshow", visible);
    button?.addEventListener("click", action);
    escape.addEventListener("click", exit);

    return Object.freeze({
      isPaused: () => pending,
      destroy() {
        if (disposed) return;
        disposed = true;
        attemptSerial += 1;
        if (escapeTimer) root.clearTimeout(escapeTimer);
        document.removeEventListener("visibilitychange", visible);
        root.removeEventListener("pagehide", pageHidden);
        root.removeEventListener("pageshow", visible);
        button?.removeEventListener("click", action);
        escape.removeEventListener("click", exit);
        overlay.remove();
      }
    });
  }

  // Game-owned unlock() executes synchronously in the actual button click.
  // A context being "running" is insufficient; wait for its audio clock to move.
  function resumeAudioOnGesture({ unlock, getContext, isCurrent, replaceContext, muted = false } = {}) {
    let request;
    try { request = typeof unlock === "function" ? unlock() : null; }
    catch (_) { return Promise.resolve(false); }
    let context = getContext?.();
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
      if (coordinator?.isAvailable?.() && isCurrent()) {
        try {
          const result = await coordinator.recoverAfterStall({
            source: "app", probe, isCurrent: () => isCurrent() && getContext() === context
          });
          if (result?.recovered === true && await probe()) return true;
        } catch (_) { /* Fall back only when the clock has not recovered. */ }
      }
      // One bounded best-effort replacement as part of this same tap's
      // recovery sequence. WebKit may still require a fresh gesture; never
      // dismiss the prompt until the *new* clock actually advances.
      if (typeof replaceContext !== "function" || !isCurrent()) return false;
      let replaced = false;
      try { replaced = replaceContext() === true; } catch (_) {}
      try {
        root.BibloZooAudioDiagnostics?.record("welcome-back-context-replacement", {
          attempted: true, replaced
        });
      } catch (_) {}
      if (!replaced || !isCurrent()) return false;
      try {
        const fresh = unlock?.();
        if (fresh && typeof fresh.then === "function") {
          await Promise.race([
            Promise.resolve(fresh).catch(() => false),
            new Promise(resolve => setTimeout(resolve, 1300))
          ]);
        }
      } catch (_) { return false; }
      if (!isCurrent()) return false;
      const freshContext = getContext?.();
      if (!freshContext || freshContext === context) return false;
      context = freshContext;
      const advanced = await probe();
      try {
        root.BibloZooAudioDiagnostics?.record("welcome-back-context-replacement-check", {
          clockAdvanced: advanced
        });
      } catch (_) {}
      return advanced;
    })();
  }

  root.BibloZooWelcomeBackReturn = Object.freeze({ attach, resumeAudioOnGesture });
})(window);
