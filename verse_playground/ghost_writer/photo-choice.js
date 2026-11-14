/* Ghost Writer camera-free native import choice: Photos, Files, Cancel.
 * The system pickers are invoked by a real tap. The selected photo is
 * delivered to the existing ephemeral background canvas, not persisted.
 */
(function (root) {
  "use strict";
  function create(overlay) {
    if (!overlay) return null;
    const doc = overlay.ownerDocument;
    const dialog = overlay.querySelector("[data-ghost-photo-choice-dialog]");
    const photos = overlay.querySelector("[data-ghost-photo-choice-photos]");
    const files = overlay.querySelector("[data-ghost-photo-choice-files]");
    const cancel = overlay.querySelector("[data-ghost-photo-choice-cancel]");
    const status = overlay.querySelector("[data-ghost-photo-choice-status]");
    if (![dialog, photos, files, cancel, status].every(Boolean)) return null;
    let active = false, busy = false, handlers = {}, oldFocus = null, locked = [];
    const buttons = [photos, files, cancel];

    function lock() {
      locked = [];
      for (const sibling of Array.from(overlay.parentElement?.children || [])) {
        if (sibling === overlay) continue;
        const fallback = [];
        if (!("inert" in sibling)) {
          for (const node of sibling.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]"
          )) {
            fallback.push([node, node.getAttribute("tabindex")]);
            node.setAttribute("tabindex", "-1");
          }
        }
        locked.push({
          sibling, oldInert: sibling.inert,
          oldAria: sibling.getAttribute("aria-hidden"), fallback
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }
    }

    function unlock() {
      for (const {sibling, oldInert, oldAria, fallback} of locked) {
        sibling.inert = oldInert;
        if (oldAria == null) sibling.removeAttribute("aria-hidden");
        else sibling.setAttribute("aria-hidden", oldAria);
        for (const [node, prior] of fallback) {
          if (prior == null) node.removeAttribute("tabindex");
          else node.setAttribute("tabindex", prior);
        }
      }
      locked = [];
    }

    function close() {
      if (!active) return;
      doc.removeEventListener("keydown", trap, true);
      overlay.hidden = true;
      active = false;
      busy = false;
      handlers = {};
      buttons.forEach(button => { button.disabled = false; });
      status.textContent = "";
      unlock();
      if (oldFocus?.isConnected) oldFocus.focus();
      oldFocus = null;
    }

    function trap(event) {
      if (!active) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) close();
        return;
      }
      if (event.key !== "Tab") return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (doc.activeElement === first ||
                             !overlay.contains(doc.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (doc.activeElement === last ||
                                    !overlay.contains(doc.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }

    function open(callbacks) {
      if (active) return false;
      handlers = callbacks || {};
      oldFocus = doc.activeElement;
      status.textContent = "";
      overlay.hidden = false;
      active = true;
      busy = false;
      lock();
      doc.addEventListener("keydown", trap, true);
      photos.focus();
      return true;
    }

    async function select(source) {
      if (!active || busy) return;
      busy = true;
      buttons.forEach(button => { button.disabled = true; });
      status.textContent = source === "photos"
        ? "Opening your Photos..." : "Opening your Files...";
      try {
        const result = await handlers.onChoose?.(source);
        if (!active) return;
        if (!result || result.cancelled) {
          close();
          return;
        }
        status.textContent = "Preparing your photo...";
        const prepared = await handlers.onImported?.(result);
        if (!active) return;
        if (!prepared) {
          close();
          return;
        }
        const onReady = handlers.onReady;
        close(); // unlock the old Remix UI before rerendering it
        onReady?.();
      } catch (error) {
        if (!active) return;
        status.textContent = error?.message ||
          "That photo couldn't be imported. Please try again.";
      } finally {
        busy = false;
        if (active) buttons.forEach(button => { button.disabled = false; });
      }
    }

    photos.addEventListener("click", () => { void select("photos"); });
    files.addEventListener("click", () => { void select("files"); });
    cancel.addEventListener("click", () => { if (!busy) close(); });

    return Object.freeze({open, close, isOpen: () => active});
  }

  root.BibloZooGhostPhotoChoice = Object.freeze({create});
})(window);
