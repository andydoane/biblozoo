/* BibloZoo Patch 61 — shared Welcome Back identity and controls.
 * Presentation lives in welcome-back.css; game-specific recovery stays with
 * its owner (Feeding or Learn). This module never starts audio or gameplay.
 */
(() => {
  "use strict";

  const BUTTON_TEXT = "Let's go!";
  const RETRY_TEXT = "Try again!";
  const ZOO_MESSAGES = Object.freeze([
    "Cleaning the zoo...",
    "Feeding the hippos...",
    "Chasing the monkeys...",
    "Waking up the sloths...",
    "Counting the penguins...",
    "Brushing the lions...",
    "Tickling the giraffes...",
    "Finding the flamingos...",
    "Polishing the turtle shells...",
    "Giving the elephants a bath...",
    "Untangling the snakes...",
    "Hiding snacks from the raccoons...",
    "Teaching the parrots Bible verses...",
    "Convincing the kangaroos to share..."
  ]);
  const MESSAGE_INTERVAL_MS = 2500;
  const messageSessions = new WeakMap();
  const nameObservers = new WeakMap();
  const MIN_READABLE_NAME_PX = 16;
  let messageStartIndex = 0;

  // A block's scrollWidth usually includes the whole block (roughly the
  // button width), even when it contains a short name. Measure the rendered
  // inline glyphs + exclamation instead, not the full-width name-line box.
  function renderedNameWidth(line) {
    const doc = line?.ownerDocument || window.document;
    if (typeof doc?.createRange !== "function") return 0;
    const range = doc.createRange();
    range.selectNodeContents(line);
    const width = range.getBoundingClientRect().width;
    range.detach?.();
    return Number.isFinite(width) && width > 0 ? width : 0;
  }

  // Start at precisely the heading size, and only shrink to fit real glyphs
  // across the full button width (with a readable floor for very long names).
  function fitName(root) {
    const line = root?.querySelector?.("[data-welcome-back-name-line]");
    const title = root?.querySelector?.(".bz-welcome-title");
    const slot = root?.querySelector?.("[data-welcome-back-action-slot]") ||
      root?.querySelector?.("[data-welcome-back-action]");
    if (!line?.style || !title) return;
    line.classList?.remove?.("bz-welcome-name-wrap");
    line.style.setProperty("--bz-welcome-name-size", "inherit");
    const width = slot?.getBoundingClientRect?.().width;
    const fullSize = Number.parseFloat(window.getComputedStyle?.(title)?.fontSize);
    // Initial populate() often precedes showing the overlay. The observer
    // below runs again as soon as its action slot gains a real layout width.
    if (!(width > 0) || !(fullSize > 0)) return;
    const limit = width - 1; // reserve a pixel for glyph/layout rounding
    const naturalWidth = renderedNameWidth(line);
    // When hidden or the DOM Range API is unavailable, don't guess a tiny
    // font. The observer remeasures after the popup becomes visible.
    if (!(naturalWidth > 0) || naturalWidth <= limit) return;

    const minimum = Math.min(MIN_READABLE_NAME_PX, fullSize);
    line.style.setProperty("--bz-welcome-name-size", minimum + "px");
    const minimumWidth = renderedNameWidth(line);
    if (!(minimumWidth > 0)) {
      line.style.setProperty("--bz-welcome-name-size", "inherit");
      return;
    }
    if (minimumWidth > limit) {
      // Extremely long names remain readable instead of becoming tiny.
      line.classList?.add?.("bz-welcome-name-wrap");
      return;
    }
    let low = minimum, high = fullSize;
    for (let i = 0; i < 9; i++) {
      const mid = (low + high) / 2;
      line.style.setProperty("--bz-welcome-name-size", mid + "px");
      if (renderedNameWidth(line) <= limit) low = mid;
      else high = mid;
    }
    line.style.setProperty("--bz-welcome-name-size",
      (Math.floor(low * 10) / 10) + "px");
  }

  function scheduleNameFit(root) {
    const line = root?.querySelector?.("[data-welcome-back-name-line]");
    const slot = root?.querySelector?.("[data-welcome-back-action-slot]") ||
      root?.querySelector?.("[data-welcome-back-action]");
    fitName(root);
    if (!line || !slot) return;
    // Width transitions 0 -> visible when the hidden popup opens; rotation
    // and small-window changes also refit without a stale guessed size.
    if (!nameObservers.has(line) && typeof window.ResizeObserver === "function") {
      const observer = new window.ResizeObserver(() => {
        if (root.isConnected === false) {
          observer.disconnect();
          nameObservers.delete(line);
        } else fitName(root);
      });
      observer.observe(slot);
      nameObservers.set(line, observer);
    }
    window.requestAnimationFrame?.(() => {
      if (root.isConnected !== false) fitName(root);
    });
    // Re-measure once the actual Baloo font loads rather than measuring only
    // a temporary system fallback face.
    window.document?.fonts?.ready?.then?.(() => {
      if (root.isConnected !== false) fitName(root);
    });
  }

  function getMessage(root) {
    const card = root?.querySelector?.("[data-welcome-back-card]");
    return messageSessions.get(card)?.message || "";
  }

  function setMessagesRunning(root, busy) {
    const card = root?.querySelector?.("[data-welcome-back-card]");
    const progress = root?.querySelector?.("[data-welcome-back-progress]");
    if (!card || !progress) return;
    const previous = messageSessions.get(card);
    if (!busy) {
      if (previous) {
        window.clearInterval(previous.timer);
        messageSessions.delete(card);
      }
      progress.hidden = true;
      progress.textContent = "";
      return;
    }
    // Idempotent: Learn and Feeding may call setAction repeatedly while busy.
    if (previous) return;
    let index = messageStartIndex++ % ZOO_MESSAGES.length;
    const session = { timer: 0, message: ZOO_MESSAGES[index] };
    const advance = () => {
      // A disconnected/hidden card must not retain a ticking interval.
      if (!card.isConnected || root.hidden || document.hidden ||
          !card.classList.contains("is-recovering")) {
        window.clearInterval(session.timer);
        messageSessions.delete(card);
        return;
      }
      index = (index + 1) % ZOO_MESSAGES.length;
      session.message = ZOO_MESSAGES[index];
      progress.textContent = session.message;
      progress.hidden = false;
    };
    messageSessions.set(card, session);
    progress.textContent = session.message;
    progress.hidden = false;
    session.timer = window.setInterval(advance, MESSAGE_INTERVAL_MS);
  }

  function getIdentity(nameOverride, profileId) {
    const api = window.BibloZooProfiles;
    let profile = null;
    try {
      profile = (profileId && api?.getProfileById?.(profileId)) ||
        api?.getActiveProfile?.() || null;
    } catch (error) { /* storage may be blocked */ }
    const name = String(profile?.name || nameOverride || "Zookeeper")
      .replace(/\s+/g, " ").trim().slice(0, 64) || "Zookeeper";
    const src = api?.getProfilePictureSrc?.(profile?.avatarVerseId || "") || "";
    const fallback = api?.getProfilePictureFallbackSrc?.() || "";
    return { name, src, fallback };
  }

  // Only textContent and the existing validated profile-picture URL are used.
  // Never put the child's profile name into innerHTML.
  function populate(root, options = {}) {
    if (!root || typeof root.querySelector !== "function") return;
    const identity = getIdentity(options.name, options.profileId);
    const name = root.querySelector("[data-welcome-back-name]");
    if (name) name.textContent = identity.name;
    scheduleNameFit(root);
    const picture = root.querySelector("[data-welcome-back-picture]");
    const paw = root.querySelector("[data-welcome-back-picture-fallback]");
    if (!picture) return;
    // Profiles.js returns app-root-relative paths. External verse games live
    // two directories deeper, so their callers supply a trusted prefix.
    const pictureBase = options.pictureBase === "../../" ? "../../" : "";
    const nextSrc = pictureBase + (identity.src || identity.fallback);
    // Keep an already-loaded picture visible across repeated Learn renders.
    if (picture.getAttribute("src") === nextSrc) return;
    if (paw) paw.hidden = false;
    picture.hidden = true;
    picture.onerror = () => {
      const fallbackSrc = pictureBase + identity.fallback;
      if (identity.fallback && picture.getAttribute("src") !== fallbackSrc) {
        picture.src = fallbackSrc;
        return;
      }
      picture.hidden = true;
      if (paw) paw.hidden = false;
    };
    picture.onload = () => {
      picture.hidden = false;
      if (paw) paw.hidden = true;
    };
    if (nextSrc) picture.src = nextSrc;
    else picture.removeAttribute("src");
  }

  function setAction(root, { retry = false, busy = false } = {}) {
    const button = root?.querySelector?.("[data-welcome-back-action]");
    if (!button) return;
    button.textContent = retry ? RETRY_TEXT : BUTTON_TEXT;
    button.disabled = !!busy;
    const progress = root.querySelector?.("[data-welcome-back-progress]");
    // The message replaces the button in its reserved slot. A legacy
    // controller without new markup safely retains its disabled button.
    button.hidden = !!busy && !!progress;
    if (progress) progress.hidden = !busy;
    if (busy) {
      const errorStatus = root.querySelector?.("[data-welcome-back-status]");
      if (errorStatus) errorStatus.hidden = true;
    }
    // Preserve the busy/accessibility state but keep the portrait stationary.
    // Patch 72.1A replaces spinning with a silent-capable rescue flow.
    const card = root.querySelector?.("[data-welcome-back-card]") ||
      button.closest?.(".bz-welcome-card");
    card?.classList?.toggle("is-recovering", !!busy);
    card?.setAttribute?.("aria-busy", busy ? "true" : "false");
    setMessagesRunning(root, !!busy);
  }

  // One markup template for non-Feeding activities. Feeding's existing HTML
  // retains its tested data hooks; both use the exact same shared CSS classes.
  function markup(kind = "learn") {
    const learn = kind === "learn";
    const cardClass = learn ? "learn-audio-resume-card " : "";
    const actionClass = learn ? "learn-audio-resume-button " : "";
    const statusClass = learn ? "learn-audio-resume-status " : "";
    const titleId = learn ? "learnAudioResumeTitle" : "verseGameWelcomeTitle";
    const actionAttrs = learn
      ? 'id="learnAudioResumeButton" data-no-ui-sound'
      : '';
    const statusAttrs = learn
      ? 'id="learnAudioResumeStatus"'
      : '';
    return `
      <div class="${cardClass}bz-welcome-card" data-welcome-back-card>
        <div class="bz-welcome-avatar" aria-hidden="true">
          <span class="bz-welcome-avatar-fallback" data-welcome-back-picture-fallback>🐾</span>
          <img class="bz-welcome-avatar-image" data-welcome-back-picture
            alt="" draggable="false" hidden>
        </div>
        <h2 class="bz-welcome-title" id="${titleId}">
          Welcome back,<span class="bz-welcome-name-line" data-welcome-back-name-line><span class="bz-welcome-name"
          data-welcome-back-name>Zookeeper</span><span class="bz-welcome-punctuation">!</span></span>
        </h2>
        <div class="bz-welcome-action-slot" data-welcome-back-action-slot>
          <button type="button" class="${actionClass}bz-welcome-action no-zoom"
            data-welcome-back-action ${actionAttrs}>${BUTTON_TEXT}</button>
          <p class="bz-welcome-progress" data-welcome-back-progress
            role="status" aria-live="polite" aria-atomic="true" hidden></p>
        </div>
        <p class="${statusClass}bz-welcome-status" data-welcome-back-status
          ${statusAttrs} role="status" aria-live="polite" hidden></p>
      </div>`;
  }

  window.BibloZooWelcomeBack = Object.freeze({
    getIdentity, populate, setAction, getMessage, markup, BUTTON_TEXT, RETRY_TEXT, ZOO_MESSAGES
  });
})();
