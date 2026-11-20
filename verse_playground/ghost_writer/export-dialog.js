/* Ghost Writer native Photos export dialog.
 * Presentation only: the existing Ghost Writer owner starts/cancels the
 * real PNG/MP4 work and only reports success after PhotoKit resolves.
 * No new audio, permission, capture, progress, or reward ownership.
 */
(function (root) {
  "use strict";

  const PLAYFUL_LINES = Object.freeze([
    "Our ghost is hard at work...",
    "Writing something wonderful...",
    "Making every letter shine...",
    "Putting the finishing touches on..."
  ]);

  function create(overlay) {
    if (!overlay) return null;
    const doc = overlay.ownerDocument;
    const dialog = overlay.querySelector("[data-ghost-export-dialog]");
    const title = overlay.querySelector("[data-ghost-export-title]");
    const message = overlay.querySelector("[data-ghost-export-message]");
    const progress = overlay.querySelector("[data-ghost-export-progress]");
    const bar = overlay.querySelector("[data-ghost-export-bar]");
    const percentage = overlay.querySelector("[data-ghost-export-percentage]");
    const activity = overlay.querySelector("[data-ghost-export-activity]");
    const successMark = overlay.querySelector("[data-ghost-export-success]");
    const actionHint = overlay.querySelector("[data-ghost-export-action-hint]");
    const cancel = overlay.querySelector("[data-ghost-export-cancel]");
    const done = overlay.querySelector("[data-ghost-export-done]");
    const retry = overlay.querySelector("[data-ghost-export-retry]");
    const back = overlay.querySelector("[data-ghost-export-back]");
    const errorActions = overlay.querySelector("[data-ghost-export-error-actions]");
    if (![dialog, title, message, progress, bar, percentage, activity,
          successMark, actionHint, cancel, done, retry, back, errorActions].every(Boolean)) return null;

    let active = false, phase = "idle", kind = "video";
    let handlers = {}, lastFocus = null, locked = [], timer = null;
    let playfulIndex = 0, lastPercent = 0;

    function stopMessages() {
      if (timer !== null) root.clearInterval(timer);
      timer = null;
    }

    function showMessages() {
      stopMessages();
      playfulIndex = 0;
      message.textContent = PLAYFUL_LINES[playfulIndex];
      timer = root.setInterval(() => {
        if (!active || phase !== "making" || doc.hidden) {
          stopMessages();
          return;
        }
        playfulIndex = (playfulIndex + 1) % PLAYFUL_LINES.length;
        message.textContent = PLAYFUL_LINES[playfulIndex];
      }, 3000);
    }

    function lockBackground() {
      const host = overlay.parentElement;
      if (!host) return;
      locked = [];
      for (const child of Array.from(host.children)) {
        if (child === overlay) continue;
        const fallback = [];
        // WKWebView on older iOS versions might not implement inert. The
        // overlay still blocks taps; explicitly drop behind-modal tab stops.
        if (!("inert" in child)) {
          for (const focusable of child.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]"
          )) {
            fallback.push([focusable, focusable.getAttribute("tabindex")]);
            focusable.setAttribute("tabindex", "-1");
          }
        }
        locked.push({
          child,
          inert: child.inert,
          ariaHidden: child.getAttribute("aria-hidden"),
          fallback
        });
        child.inert = true;
        child.setAttribute("aria-hidden", "true");
      }
    }

    function unlockBackground() {
      for (const entry of locked) {
        entry.child.inert = entry.inert;
        if (entry.ariaHidden == null) entry.child.removeAttribute("aria-hidden");
        else entry.child.setAttribute("aria-hidden", entry.ariaHidden);
        for (const [node, previous] of entry.fallback) {
          if (previous == null) node.removeAttribute("tabindex");
          else node.setAttribute("tabindex", previous);
        }
      }
      locked = [];
    }

    function visibleActions() {
      return [cancel, done, retry, back].filter(button => !button.hidden);
    }

    function focusAction() {
      const button = visibleActions()[0];
      if (button) button.focus();
      else dialog.focus();
    }

    function trapKeys(event) {
      if (!active) return;
      if (event.key === "Escape") {
        // No dismiss while encoding/PhotoKit is in flight. Even on error,
        // use the explicitly labelled Back button for safe dismissal.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = visibleActions();
      if (!buttons.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (doc.activeElement === first ||
                             !overlay.contains(doc.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (doc.activeElement === last ||
                                    !overlay.contains(doc.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    function display(next, detail) {
      if (!active) return;
      phase = next;
      stopMessages();
      const isVideo = kind === "video";
      progress.hidden = !(isVideo && next === "making");
      activity.hidden = !["making", "saving", "stopping"].includes(next) ||
                        (isVideo && next === "making");
      successMark.hidden = next !== "success";
      actionHint.hidden = !["making", "saving", "stopping"].includes(next) ||
                          (isVideo && next === "making");
      cancel.hidden = !(isVideo && next === "making");
      done.hidden = next !== "success";
      retry.hidden = next !== "error";
      back.hidden = next !== "error";
      errorActions.hidden = next !== "error";
      if (next === "making") {
        title.textContent = isVideo ? "Making your video!" : "Saving your picture!";
        if (isVideo) {
          showMessages();
          bar.style.width = "0%";
          progress.setAttribute("aria-valuenow", "0");
          percentage.textContent = "0%";
          lastPercent = 0;
        } else {
          message.textContent = "Getting your masterpiece ready...";
        }
        actionHint.textContent = "Saving...";
      } else if (next === "saving") {
        title.textContent = "Almost there!";
        message.textContent = isVideo
          ? "Putting your masterpiece in Photos..."
          : "Saving your picture to Photos...";
        actionHint.textContent = "Saving to Photos...";
      } else if (next === "stopping") {
        title.textContent = "Stopping your video...";
        message.textContent = "Tidying up the magic...";
        actionHint.textContent = "Stopping...";
      } else if (next === "success") {
        title.textContent = "Complete!";
        message.textContent = isVideo
          ? "Your video is saved to Photos!"
          : "Your picture is saved to Photos!";
      } else if (next === "error") {
        title.textContent = "Oops!";
        message.textContent = detail ||
          "We couldn't save it to Photos. Let's try again!";
      }
      focusAction();
    }

    function open(mediaKind, callbacks) {
      if (active && phase !== "error") return false;
      if (!active) {
        lastFocus = doc.activeElement;
        overlay.hidden = false;
        lockBackground();
        doc.addEventListener("keydown", trapKeys, true);
        active = true;
      }
      kind = mediaKind === "picture" ? "picture" : "video";
      handlers = callbacks || {};
      display("making");
      return true;
    }

    function progressPercent(value) {
      if (!active || phase !== "making" || kind !== "video") return;
      // The encoder has acknowledged these frames. The total is estimated,
      // so 100% is reserved for an actual confirmed PhotoKit save.
      const n = Math.max(lastPercent, Math.min(99, Math.max(0,
        Math.floor(Number(value) || 0))));
      lastPercent = n;
      bar.style.width = n + "%";
      progress.setAttribute("aria-valuenow", String(n));
      percentage.textContent = n + "%";
    }

    function close() {
      if (!active) return;
      stopMessages();
      doc.removeEventListener("keydown", trapKeys, true);
      overlay.hidden = true;
      active = false;
      phase = "idle";
      handlers = {};
      unlockBackground();
      if (lastFocus?.isConnected) lastFocus.focus();
      lastFocus = null;
    }

    cancel.addEventListener("click", () => {
      if (phase !== "making" || kind !== "video") return;
      const callback = handlers.onCancel;
      display("stopping");
      callback?.();
    });
    done.addEventListener("click", close);
    back.addEventListener("click", close);
    retry.addEventListener("click", () => {
      if (phase !== "error") return;
      handlers.onRetry?.();
    });

    return Object.freeze({
      open,
      setProgress: progressPercent,
      saving: () => display("saving"),
      success: () => display("success"),
      error: text => display("error", text),
      close,
      isOpen: () => active,
      phase: () => phase,
      kind: () => kind
    });
  }

  root.BibloZooGhostExportDialog = Object.freeze({ create });
})(window);
