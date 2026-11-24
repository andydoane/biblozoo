/*
 * BibloZoo Kids parental gate — PR 1, shared native iOS infrastructure.
 * No production action invokes the gate until separate integration PRs.
 * Browser/PWA, Android and the separate Audio Test app stay inactive.
 * The private question answer and one-shot callback never enter storage/DOM.
 */
(function installBibloZooParentalGate(root) {
  "use strict";

  function isNativeKidsBuild(win) {
    try {
      return win.Capacitor?.isNativePlatform?.() === true &&
        win.Capacitor?.getPlatform?.() === "ios" &&
        win.BibloZooNativeOnlyOutput?.enabled === true &&
        win.BibloZooNativeOnlyOutput?.devToolsAllowed === false;
    } catch (_) {
      return false;
    }
  }

  // Easier adult challenge: (two-digit - two-digit) + single-digit.
  // Keep the subtraction non-negative and the final answer below 100.
  // First is 20..99, second is 10..(first - 1), addition is 1..9.
  // Maximum possible answer: 99 - 10 + 9 = 98.
  function makeQuestion(randomIndex) {
    const first = randomIndex(80) + 20;
    const subtrahend = randomIndex(first - 10) + 10;
    const addition = randomIndex(9) + 1;
    if (!Number.isInteger(first) || first < 20 || first > 99 ||
        !Number.isInteger(subtrahend) || subtrahend < 10 ||
        subtrahend >= first || !Number.isInteger(addition) ||
        addition < 1 || addition > 9) {
      throw new Error("Could not create a parental-gate question.");
    }
    const answer = first - subtrahend + addition;
    if (answer < 1 || answer > 99) {
      throw new Error("Parental-gate result is out of range.");
    }
    return Object.freeze({ first, subtrahend, addition, answer });
  }

  function secureIndex(win, exclusiveMax) {
    if (!Number.isInteger(exclusiveMax) || exclusiveMax < 1 ||
        typeof win.crypto?.getRandomValues !== "function") {
      throw new Error("Secure random numbers are unavailable.");
    }
    const data = new Uint32Array(1);
    const bound = Math.floor(0x100000000 / exclusiveMax) * exclusiveMax;
    // Rejection sampling avoids modulo bias; all max values are <= 89.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      win.crypto.getRandomValues(data);
      if (data[0] < bound) return data[0] % exclusiveMax;
    }
    throw new Error("Could not create a random question.");
  }

  function createGate(win) {
    const doc = win.document;
    let active = null;

    function element(tag, className, text) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function finish(approved) {
      const session = active;
      if (!session || session.finished) return;
      session.finished = true;
      active = null;
      doc.removeEventListener("keydown", session.onKeydown, true);
      doc.removeEventListener("visibilitychange", session.onVisibility, true);
      win.removeEventListener("pagehide", session.onCancel, true);
      win.removeEventListener("popstate", session.onCancel, true);
      win.removeEventListener("resize", session.onViewport, true);
      session.viewport?.removeEventListener?.("resize", session.onViewport);
      session.viewport?.removeEventListener?.("scroll", session.onViewport);
      const stillVisible = session.overlay.isConnected &&
        doc.visibilityState !== "hidden" && !doc.hidden &&
        isNativeKidsBuild(win);
      session.overlay.remove();
      if (session.previousFocus?.isConnected) {
        try { session.previousFocus.focus({ preventScroll: true }); }
        catch (_) { /* Focus restoration must not authorize anything. */ }
      }
      if (!approved || !stillVisible) {
        session.resolve(false);
        return;
      }
      // Exactly one selected callback, invoked while its approval is fresh.
      // No boolean approval token is ever made available to the caller.
      try {
        Promise.resolve(session.onApproved()).then(
          () => session.resolve(true),
          error => session.reject(error)
        );
      } catch (error) {
        session.reject(error);
      }
    }

    function requestApproval(options) {
      if (!isNativeKidsBuild(win) || !doc?.body ||
          typeof options?.onApproved !== "function" || active ||
          doc.visibilityState === "hidden" || doc.hidden) {
        return Promise.resolve(false);
      }
      let question;
      try {
        question = makeQuestion(max => secureIndex(win, max));
      } catch (_) {
        // Failed randomness is a denial, not a trivial/fixed question.
        return Promise.resolve(false);
      }

      return new Promise((resolve, reject) => {
        const overlay = element("div", "bz-parental-gate-overlay");
        const dialog = element("section", "bz-parental-gate-dialog");
        // Existing Zoo Break/Pet Escape lock art is applied by shared CSS.
        const icon = element("div", "bz-parental-gate-lock");
        icon.setAttribute("aria-hidden", "true");
        const title = element("h2", "bz-parental-gate-title", "Grown-up Check");
        title.id = "bz-parental-gate-title";
        // Focus static content first so VoiceOver can read the dialog in order
        // without automatically summoning the numeric keyboard.
        title.setAttribute("tabindex", "-1");
        const actionLabel = typeof options.actionLabel === "string"
          ? options.actionLabel.trim().slice(0, 80) : "";
        // Show the specific action once; avoid repeating the general
        // "A grown-up needs..." preamble before every permission/share gate.
        // Other callers without a label retain a helpful fallback.
        const message = element("p", "bz-parental-gate-description",
          actionLabel || "A grown-up needs to help with this part of BibloZoo.");
        const content = element("div", "bz-parental-gate-content");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", title.id);
        // The description remains normal readable text, not an ARIA
        // description on the entire dialog. iOS VoiceOver otherwise repeats
        // "Description" and the same action text for every focused child.
        message.id = "bz-parental-gate-description";
        dialog.append(icon, title, message, content);
        overlay.appendChild(dialog);

        const viewport = win.visualViewport;
        // Capture the unobscured height before focus opens the iPad keyboard.
        // iOS may shrink the *visual* viewport but leave fixed CSS overlays
        // centered in the older layout viewport.
        const initialViewportHeight = viewport?.height;
        const session = {
          overlay, dialog, content, resolve, reject, viewport,
          onApproved: options.onApproved,
          previousFocus: doc.activeElement,
          initialFocus: null, answerInput: null, onViewport: null,
          finished: false, attempts: 0, question,
          onCancel: () => finish(false),
          onVisibility: () => {
            if (doc.hidden || doc.visibilityState === "hidden") finish(false);
          },
          onKeydown: event => {
            if (event.key === "Escape") {
              event.preventDefault();
              finish(false);
              return;
            }
            if (event.key !== "Tab") return;
            const focusable = Array.from(overlay.querySelectorAll("button:not([disabled]), input:not([disabled])"));
            if (!focusable.length) {
              event.preventDefault();
              return;
            }
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && (doc.activeElement === first ||
                doc.activeElement === session.initialFocus)) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && doc.activeElement === last) {
              event.preventDefault();
              first.focus();
            } else if (!overlay.contains(doc.activeElement)) {
              event.preventDefault();
              first.focus();
            }
          }
        };
        active = session;

        session.onViewport = () => {
          if (active !== session || session.finished || !overlay.isConnected) return;
          const vp = session.viewport;
          // This compensates for the iPad keyboard overlay, not text scaling
          // or general iPhone positioning. No change while keyboard is hidden.
          const keyboardReducedViewport = session.answerInput &&
            Number.isFinite(initialViewportHeight) &&
            Number.isFinite(vp?.height) && Number.isFinite(vp?.width) &&
            vp.width >= 600 && initialViewportHeight - vp.height > 120;
          if (!keyboardReducedViewport) {
            overlay.style.top = "";
            overlay.style.left = "";
            overlay.style.right = "";
            overlay.style.bottom = "";
            overlay.style.width = "";
            overlay.style.height = "";
            dialog.style.maxHeight = "";
            return;
          }
          // A fixed overlay is otherwise centered below the visible region
          // in WKWebView. Re-center it inside the visual viewport and make
          // the dialog internally scrollable if the keyboard leaves less room.
          overlay.style.top = Math.max(0, vp.offsetTop || 0) + "px";
          overlay.style.left = Math.max(0, vp.offsetLeft || 0) + "px";
          overlay.style.right = "auto";
          overlay.style.bottom = "auto";
          overlay.style.width = vp.width + "px";
          overlay.style.height = vp.height + "px";
          dialog.style.maxHeight =
            Math.min(760, Math.max(160, Math.floor(vp.height - 32))) + "px";
        };

        function renderIntro() {
          session.answerInput = null;
          content.replaceChildren();
          session.onViewport();
          const actions = element("div", "bz-parental-gate-actions");
          const cancel = element("button", "bz-parental-gate-btn bz-parental-gate-secondary", "Not Now");
          cancel.type = "button";
          cancel.addEventListener("click", () => finish(false));
          const continueButton = element("button", "bz-parental-gate-btn bz-parental-gate-primary", "I'm a Grown-up");
          continueButton.type = "button";
          // Do not pass the click Event as the feedback message.
          continueButton.addEventListener("click", () => renderQuestion());
          actions.append(cancel, continueButton);
          content.append(actions);
          // Start at the title, then let screen readers encounter the
          // visible action explanation and both buttons in document order.
          session.initialFocus = title;
          title.focus({ preventScroll: true });
        }

        function renderQuestion(feedbackText) {
          if (!active || active !== session || session.finished) return;
          content.replaceChildren();
          const prompt = element("p", "bz-parental-gate-prompt",
            "Solve this problem to continue:");
          prompt.setAttribute("tabindex", "-1");
          const equation = element("p", "bz-parental-gate-equation",
            session.question.first + " − " + session.question.subtrahend +
            " + " + session.question.addition + " = ?");
          // Keep the equation as ordinary screen-reader-readable text.
          // The static instruction receives initial focus so the equation
          // follows it in swipe order without opening the numeric keyboard.
          // Parents tap Answer only when ready.
          equation.setAttribute("tabindex", "-1");
          const form = element("form", "bz-parental-gate-form");
          form.setAttribute("novalidate", "");
          const label = element("label", "bz-parental-gate-answer-label", "Answer");
          label.setAttribute("for", "bz-parental-gate-answer");
          const input = element("input", "bz-parental-gate-answer");
          input.id = "bz-parental-gate-answer";
          input.type = "text";
          input.inputMode = "numeric";
          input.setAttribute("pattern", "[0-9]*");
          input.setAttribute("autocomplete", "off");
          input.setAttribute("aria-required", "true");
          input.maxLength = 2;
          session.answerInput = input;
          const status = element("p", "bz-parental-gate-status", feedbackText || "");
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          const actions = element("div", "bz-parental-gate-actions");
          const cancel = element("button", "bz-parental-gate-btn bz-parental-gate-secondary", "Not Now");
          cancel.type = "button";
          cancel.addEventListener("click", () => finish(false));
          const submit = element("button", "bz-parental-gate-btn bz-parental-gate-primary", "Check Answer");
          submit.type = "submit";
          actions.append(cancel, submit);
          form.append(label, input, status, actions);
          form.addEventListener("submit", event => {
            event.preventDefault();
            if (!active || active !== session || session.finished ||
                !overlay.isConnected || doc.hidden ||
                doc.visibilityState === "hidden" || !isNativeKidsBuild(win)) {
              finish(false);
              return;
            }
            const typed = input.value.trim();
            if (/^[0-9]{1,2}$/.test(typed) &&
                Number(typed) === session.question.answer) {
              finish(true);
              return;
            }
            session.attempts += 1;
            if (session.attempts >= 3) {
              finish(false);
              return;
            }
            try {
              session.question = makeQuestion(max => secureIndex(win, max));
              renderQuestion("That answer didn't match. Here's a new problem.");
            } catch (_) {
              finish(false);
            }
          });
          content.append(prompt, equation, form);
          session.onViewport();
          session.initialFocus = prompt;
          prompt.focus({ preventScroll: true });
        }

        try {
          doc.body.appendChild(overlay);
          doc.addEventListener("keydown", session.onKeydown, true);
          doc.addEventListener("visibilitychange", session.onVisibility, true);
          win.addEventListener("pagehide", session.onCancel, true);
          // Do not use window blur to cancel: Safari/WebKit can emit it while
          // focus moves into the numeric input or its keyboard. Real app
          // backgrounding and page transitions are handled above.
          win.addEventListener("popstate", session.onCancel, true);
          win.addEventListener("resize", session.onViewport, true);
          viewport?.addEventListener?.("resize", session.onViewport);
          viewport?.addEventListener?.("scroll", session.onViewport);
          renderIntro();
        } catch (_) {
          finish(false);
        }
      });
    }

    return Object.freeze({
      requestApproval,
      cancelActive: () => finish(false),
      isAvailable: () => isNativeKidsBuild(win)
    });
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { makeQuestion, createGate, isNativeKidsBuild };
  }
  if (isNativeKidsBuild(root) && root.document) {
    root.BibloZooParentalGate = createGate(root);
  }
})(typeof window === "object" ? window : globalThis);
