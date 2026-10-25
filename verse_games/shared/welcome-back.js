/* BibloZoo Patch 61 — shared Welcome Back identity and controls.
 * Presentation lives in welcome-back.css; game-specific recovery stays with
 * its owner (Feeding or Learn). This module never starts audio or gameplay.
 */
(() => {
  "use strict";

  const BUTTON_TEXT = "Let's go!";
  const RETRY_TEXT = "Try again!";

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
    const nameLine = root.querySelector("[data-welcome-back-name-line]");
    if (nameLine?.style) {
      const length = Array.from(identity.name).length;
      nameLine.style.setProperty("--bz-welcome-name-size", length > 13
        ? "clamp(11px, 3.8vw, 21px)"
        : length > 9 ? "clamp(13px, 4.2vw, 26px)" : "inherit");
    }
    const name = root.querySelector("[data-welcome-back-name]");
    if (name) name.textContent = identity.name;
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
    // Shared recovery feedback: spin only the picture, not the popup itself.
    // Setting this in the common action API keeps every connected game alike.
    const card = root.querySelector?.("[data-welcome-back-card]") ||
      button.closest?.(".bz-welcome-card");
    card?.classList?.toggle("is-recovering", !!busy);
    card?.setAttribute?.("aria-busy", busy ? "true" : "false");
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
        <button type="button" class="${actionClass}bz-welcome-action no-zoom"
          data-welcome-back-action ${actionAttrs}>${BUTTON_TEXT}</button>
        <p class="${statusClass}bz-welcome-status" data-welcome-back-status
          ${statusAttrs} role="status" aria-live="polite" hidden></p>
      </div>`;
  }

  window.BibloZooWelcomeBack = Object.freeze({
    getIdentity, populate, setAction, markup, BUTTON_TEXT, RETRY_TEXT
  });
})();
