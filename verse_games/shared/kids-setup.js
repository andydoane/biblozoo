/*
 * Optional native Kids first-launch Grown-up Setup.
 * This is an invitation, never a prerequisite for creating a Zookeeper.
 * OS permission prompts are explicit, parent-approved actions; no approval,
 * child data, audio or photos are persisted by this module.
 */
(function installBibloZooKidsSetup(root) {
  "use strict";

  const OFFERED_KEY = "biblozooKidsSetupOffered:v1";
  const SOURCE_IMAGE = "verse_images/title_biblozoo_animals.png";
  const SOURCE_LOGO = "verse_images/title_biblozoo.png";

  function isProductionKids(win) {
    try {
      return win.Capacitor?.isNativePlatform?.() === true &&
        win.Capacitor?.getPlatform?.() === "ios" &&
        win.BibloZooNativeOnlyOutput?.enabled === true &&
        win.BibloZooNativeOnlyOutput?.devToolsAllowed === false;
    } catch (_) {
      return false;
    }
  }

  function permissionBridge(win, kind) {
    const plugins = win.Capacitor?.Plugins;
    if (kind === "microphone") {
      return {
        api: plugins?.BibloZooMicSessionProbe,
        status: "getPermissionStatus",
        request: "requestFirstPermission"
      };
    }
    if (kind === "photos") {
      return {
        api: plugins?.BibloZooGhostWriterExport,
        status: "getPhotosPermissionStatus",
        request: "requestPhotosPermission"
      };
    }
    return null;
  }

  function createPermissionSession(win) {
    let active = false;
    let authorized = false;
    let pending = false;
    let generation = 0;
    const visible = () => win.document?.hidden !== true &&
      win.document?.visibilityState !== "hidden";
    const current = () => active && visible() && isProductionKids(win);

    function begin() {
      if (!isProductionKids(win) || active) return false;
      active = true;
      authorized = false;
      generation += 1;
      return true;
    }
    function authorize() {
      if (!current()) return false;
      authorized = true;
      return true;
    }
    function revoke() { authorized = false; }
    function end() {
      authorized = false;
      active = false;
      generation += 1;
    }
    async function getStatus(kind) {
      if (!current()) return "unavailable";
      const bridge = permissionBridge(win, kind);
      if (typeof bridge?.api?.[bridge.status] !== "function") return "unavailable";
      try {
        const reply = await bridge.api[bridge.status]();
        if (!current()) return "interrupted";
        return ["granted", "denied", "undetermined"].includes(reply?.permission)
          ? reply.permission : "unavailable";
      } catch (_) {
        return "unavailable";
      }
    }

    async function request(kind, isCurrent) {
      if (!current() || pending || typeof isCurrent !== "function" ||
          !isCurrent()) return { granted: false, reason: "unavailable" };
      pending = true;
      const token = generation;
      try {
        const status = await getStatus(kind);
        if (!current() || token !== generation || !isCurrent())
          return { granted: false, reason: "interrupted" };
        if (status === "granted") return { granted: true, reason: "already-granted" };
        if (status === "denied") return { granted: false, reason: "denied" };
        if (status !== "undetermined") return { granted: false, reason: status };
        if (!authorized) return { granted: false, reason: "grown-up-required" };
        const bridge = permissionBridge(win, kind);
        if (typeof bridge?.api?.[bridge.request] !== "function")
          return { granted: false, reason: "unavailable" };

        // After a fresh read-only Not Determined check, and only while the
        // parent-approved session and this exact tap remain live, open the
        // native OS sheet. Its own decision is separate from the math gate.
        const reply = await bridge.api[bridge.request]();
        return {
          granted: reply?.granted === true,
          reason: reply?.granted === true ? "granted" : "denied"
        };
      } catch (_) {
        return { granted: false, reason: "unavailable" };
      } finally {
        pending = false;
      }
    }
    return Object.freeze({
      begin, authorize, revoke, end, getStatus, request,
      isAuthorized: () => current() && authorized,
      isPending: () => pending
    });
  }

  function create(win) {
    const doc = win.document;
    const permission = createPermissionSession(win);
    let session = null;
    let openingSettings = false;

    function gate() {
      const check = win.BibloZooParentalGate;
      return check?.isAvailable?.() && typeof check.requestApproval === "function"
        ? check : null;
    }
    function wasOffered() {
      try { return win.localStorage?.getItem(OFFERED_KEY) === "1"; }
      catch (_) { return false; }
    }
    function markOffered() {
      try { win.localStorage?.setItem(OFFERED_KEY, "1"); }
      catch (_) { /* A storage restriction must not block first profile setup. */ }
    }
    function canOfferFirstLaunch() {
      return isProductionKids(win) && !!doc?.body &&
        !session && !openingSettings && !wasOffered();
    }
    function stillLive(s) {
      return session === s && s.root.isConnected &&
        isProductionKids(win) && !doc.hidden &&
        doc.visibilityState !== "hidden";
    }

    function hideUnderlying(s) {
      s.underlying = ["app", "navBar"].map(id => {
        const node = doc.getElementById(id);
        const prior = node?.getAttribute("aria-hidden");
        if (node) node.setAttribute("aria-hidden", "true");
        return { node, prior };
      });
    }
    function restoreUnderlying(s) {
      (s.underlying || []).forEach(({ node, prior }) => {
        if (!node) return;
        if (prior === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", prior);
      });
    }
    function close(complete) {
      const s = session;
      if (!s || s.busy) return;
      session = null;
      permission.end();
      doc.removeEventListener("visibilitychange", s.onVisibility, true);
      doc.removeEventListener("keydown", s.onKeydown, true);
      win.removeEventListener("pagehide", s.onPageHide, true);
      win.removeEventListener("popstate", s.onPopState, true);
      s.root.remove();
      restoreUnderlying(s);
      if (complete && s.source === "first-launch") markOffered();
      if (s.source === "settings" && s.previousFocus?.isConnected) {
        try { s.previousFocus.focus({ preventScroll: true }); } catch (_) {}
      }
      if (complete) s.onDone?.();
    }

    function brandHtml(compact) {
      return '<div class="bz-kids-setup-brand' +
        (compact ? ' is-compact' : '') + '">' +
        '<img class="bz-kids-setup-animals" src="' + SOURCE_IMAGE +
        '" alt="" aria-hidden="true" draggable="false">' +
        '<img class="bz-kids-setup-logo" src="' + SOURCE_LOGO +
        '" alt="BibloZoo" draggable="false">' +
        '</div>';
    }
    function statusText(status) {
      if (status === "granted") return "Ready to use!";
      if (status === "denied") return "Off — change in iPhone Settings";
      if (status === "undetermined") return "Not set up yet";
      if (status === "checking") return "Checking permission…";
      return "Unavailable — try again later";
    }
    function featureHtml(s, kind, artSrc, name, description) {
      const status = s.status[kind];
      const canRequest = status === "undetermined" && !s.busy;
      return '<section class="bz-kids-setup-feature" aria-label="' + name + '">' +
        '<div class="bz-kids-setup-feature-header">' +
        '<img class="bz-kids-setup-symbol" src="' + artSrc +
        '" alt="" aria-hidden="true" draggable="false">' +
        '<div class="bz-kids-setup-feature-copy">' +
        '<h2>' + name + '</h2><p>' + description + '</p>' +
        '<div class="bz-kids-setup-status" aria-live="polite">' +
        statusText(status) + '</div></div></div>' +
        (status === "undetermined" ?
          '<button class="bz-kids-setup-button bz-kids-setup-feature-button" type="button" ' +
          'data-kids-setup-action="' + kind + '"' +
          (canRequest ? '' : ' disabled') +
          '>Enable ' + (kind === "photos" ? "Photos" : "Microphone") + '</button>' : '') +
        '</section>';
    }

    function render(s, refresh) {
      if (session !== s) return;
      const previousAction = doc.activeElement?.getAttribute?.("data-kids-setup-action");
      s.root.innerHTML = s.stage === "invite"
        ? '<main class="bz-kids-setup-page bz-kids-setup-invite">' +
          brandHtml(false) +
          '<h1 id="bz-kids-setup-title" tabindex="-1">Let’s Get BibloZoo Ready!</h1>' +
          '<p class="bz-kids-setup-intro">A grown-up can help turn on a couple of fun ' +
          'features before you explore the Zoo!</p>' +
          '<div class="bz-kids-setup-actions">' +
          '<button class="bz-kids-setup-button" type="button" ' +
          'data-kids-setup-action="enter"' + (s.busy ? ' disabled' : '') +
          '>Grown-up Setup</button>' +
          '<button class="bz-kids-setup-button bz-kids-setup-skip" type="button" ' +
          'data-kids-setup-action="done"' + (s.busy ? ' disabled' : '') +
          '>Explore the Zoo for Now</button></div>' +
          '<p class="bz-kids-setup-note" role="status">' + s.note + '</p></main>'
        : '<main class="bz-kids-setup-page bz-kids-setup-options">' +
          brandHtml(true) +
          '<h1 id="bz-kids-setup-title" tabindex="-1">Let’s Set Up!</h1>' +
          '<p class="bz-kids-setup-intro">These optional features work only when ' +
          'you choose to use them. You can skip either one.</p>' +
          '<div class="bz-kids-setup-features">' +
          featureHtml(s, "microphone", "verse_images/game_ui/icon_microphone_permission.png", "Record My Verses",
            "Let your child record and hear their Bible verses in Flashcards.") +
          featureHtml(s, "photos", "verse_images/game_ui/icon_photos_permission.png", "Save My Creations",
            "Let your child save Ghost Writer pictures and videos to Photos. " +
            "This does not give BibloZoo access to browse your photo library.") +
          '</div>' +
          '<p class="bz-kids-setup-note" role="status">' + s.note + '</p>' +
          '<button class="bz-kids-setup-button bz-kids-setup-finish" type="button" ' +
          'data-kids-setup-action="done"' + (s.busy ? ' disabled' : '') + '>' +
          (s.source === "first-launch" ? 'All Done — Let’s Go!' :
            'Back to Settings') + '</button></main>';

      s.root.querySelectorAll("[data-kids-setup-action]").forEach(button => {
        button.addEventListener("click", () => {
          const action = button.getAttribute("data-kids-setup-action");
          if (action === "done") close(true);
          if (action === "enter") void enterSetup(s);
          if (action === "microphone" || action === "photos")
            void requestFeature(s, action);
        });
      });
      const focus = s.root.querySelector(previousAction
        ? '[data-kids-setup-action="' + previousAction + '"]' : 'h1');
      try { (focus || s.root.querySelector("h1"))?.focus?.({ preventScroll: true }); }
      catch (_) {}
      if (refresh && s.stage === "setup") void refreshStatuses(s);
    }

    async function refreshStatuses(s) {
      if (!stillLive(s) || s.busy || s.stage !== "setup") return;
      const id = ++s.refreshId;
      const [microphone, photos] = await Promise.all([
        permission.getStatus("microphone"),
        permission.getStatus("photos")
      ]);
      if (!stillLive(s) || s.stage !== "setup" ||
          s.busy || s.refreshId !== id) return;
      s.status.microphone = microphone;
      s.status.photos = photos;
      render(s, false);
    }

    async function enterSetup(s) {
      if (!stillLive(s) || s.stage !== "invite" || s.busy) return;
      const check = gate();
      if (!check) {
        s.note = "Grown-up Check is unavailable. You can explore for now.";
        render(s, false);
        return;
      }
      s.busy = true;
      s.note = "";
      render(s, false);
      try {
        await check.requestApproval({
          actionLabel: "Help set up optional microphone and Photos access.",
          onApproved: () => {
            if (!stillLive(s) || !permission.authorize()) return;
            s.stage = "setup";
            s.note = "";
          }
        });
      } catch (_) {
        s.note = "Setup could not start. Please try again.";
      } finally {
        if (session === s) {
          s.busy = false;
          render(s, s.stage === "setup");
        }
      }
    }

    async function requestFeature(s, kind) {
      if (!stillLive(s) || s.stage !== "setup" || s.busy) return;
      s.busy = true;
      s.note = "";
      s.refreshId += 1;
      render(s, false);
      try {
        let status = await permission.getStatus(kind);
        if (!stillLive(s)) return;
        if (status === "undetermined" && !permission.isAuthorized()) {
          const check = gate();
          if (!check) {
            s.note = "A grown-up is needed to request this permission.";
            return;
          }
          const ok = await check.requestApproval({
            actionLabel: "Approve the first " +
              (kind === "photos" ? "Add Photos" : "microphone") + " request.",
            onApproved: () => {
              if (stillLive(s)) permission.authorize();
            }
          });
          if (!ok || !stillLive(s) || !permission.isAuthorized()) {
            s.note = "Grown-up Check was canceled. Nothing was requested.";
            return;
          }
          // Status can change while the check is open. Request() reads it
          // again before considering the native prompt.
          status = await permission.getStatus(kind);
        }
        if (!stillLive(s)) return;
        if (status === "undetermined" || status === "granted" ||
            status === "denied") {
          const result = await permission.request(kind, () => stillLive(s));
          if (session !== s) return;
          s.note = result.granted
            ? (kind === "photos" ? "Photos saving is ready!" :
              "Microphone recording is ready!")
            : result.reason === "denied"
              ? "Permission is off. You can change it in iPhone Settings."
              : "Nothing was changed. You can try again later.";
        } else {
          s.note = "Permission status is unavailable. Try again later.";
        }
      } catch (_) {
        if (session === s) s.note = "Nothing was changed. Try again later.";
      } finally {
        if (session === s) {
          s.busy = false;
          render(s, false);
          if (stillLive(s)) void refreshStatuses(s);
        }
      }
    }

    function mount(source, onDone, stage, previousFocus) {
      if (session || !isProductionKids(win) || !permission.begin()) return false;
      const node = doc.createElement("div");
      node.className = "bz-kids-setup-root";
      node.setAttribute("role", "dialog");
      node.setAttribute("aria-modal", "true");
      node.setAttribute("aria-labelledby", "bz-kids-setup-title");
      node.setAttribute("tabindex", "-1");
      const s = {
        root: node, source, onDone, stage, previousFocus,
        busy: false, refreshId: 0,
        note: "", status: { microphone: "checking", photos: "checking" },
        onVisibility: () => {
          if (doc.hidden || doc.visibilityState === "hidden") permission.revoke();
          else if (session === s && s.stage === "setup" && !s.busy)
            void refreshStatuses(s);
        },
        onPageHide: () => permission.revoke(),
        onPopState: () => {
          permission.revoke();
          if (!s.busy) close(true);
        },
        onKeydown: event => {
          if (doc.querySelector(".bz-parental-gate-overlay")) return;
          if (event.key === "Escape" && !s.busy) {
            event.preventDefault();
            close(true);
          }
          if (event.key !== "Tab") return;
          const choices = Array.from(node.querySelectorAll(
            "button:not([disabled])"
          ));
          if (!choices.length) { event.preventDefault(); return; }
          if (event.shiftKey && doc.activeElement === choices[0]) {
            event.preventDefault();
            choices[choices.length - 1].focus();
          } else if (!event.shiftKey &&
              doc.activeElement === choices[choices.length - 1]) {
            event.preventDefault();
            choices[0].focus();
          } else if (!node.contains(doc.activeElement)) {
            event.preventDefault();
            choices[0].focus();
          }
        }
      };
      session = s;
      doc.body.appendChild(node);
      hideUnderlying(s);
      doc.addEventListener("visibilitychange", s.onVisibility, true);
      doc.addEventListener("keydown", s.onKeydown, true);
      win.addEventListener("pagehide", s.onPageHide, true);
      win.addEventListener("popstate", s.onPopState, true);
      render(s, stage === "setup");
      return true;
    }

    function showFirstLaunch(onDone) {
      if (!canOfferFirstLaunch() || typeof onDone !== "function") return false;
      return mount("first-launch", onDone, "invite", doc.activeElement);
    }

    async function showFromSettings(isCurrent) {
      if (!isProductionKids(win) || session || openingSettings ||
          typeof isCurrent !== "function" || !isCurrent()) return false;
      const check = gate();
      if (!check) return false;
      openingSettings = true;
      let opened = false;
      const previousFocus = doc.activeElement;
      try {
        await check.requestApproval({
          actionLabel: "Help set up optional microphone and Photos access.",
          onApproved: () => {
            if (!isCurrent() || doc.hidden ||
                doc.visibilityState === "hidden") return;
            opened = mount("settings", () => {}, "setup", previousFocus);
            if (opened) permission.authorize();
          }
        });
        return opened;
      } catch (_) {
        return false;
      } finally {
        openingSettings = false;
      }
    }

    return Object.freeze({
      canOfferFirstLaunch, showFirstLaunch, showFromSettings
    });
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { isProductionKids, createPermissionSession, create };
  }
  if (root.document && isProductionKids(root)) {
    root.BibloZooKidsSetup = create(root);
  }
})(typeof window === "object" ? window : globalThis);
