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

  const NON_ROUND_TWO_DIGIT_NUMBERS = Object.freeze(
    Array.from({ length: 89 }, (_, index) => index + 11)
      .filter(number => number % 10 !== 0)
  );

  function makeQuestion(randomIndex) {
    const first = NON_ROUND_TWO_DIGIT_NUMBERS[randomIndex(NON_ROUND_TWO_DIGIT_NUMBERS.length)];
    const multiplier = randomIndex(8) + 2;
    const addition = randomIndex(9) + 1;
    if (!Number.isInteger(first) || !Number.isInteger(multiplier) ||
        !Number.isInteger(addition)) {
      throw new Error("Could not create a parental-gate question.");
    }
    return Object.freeze({
      first, multiplier, addition,
      answer: first * multiplier + addition
    });
  }

  function secureIndex(win, exclusiveMax) {
    if (!Number.isInteger(exclusiveMax) || exclusiveMax < 1 ||
        typeof win.crypto?.getRandomValues !== "function") {
      throw new Error("Secure random numbers are unavailable.");
    }
    const data = new Uint32Array(1);
    const bound = Math.floor(0x100000000 / exclusiveMax) * exclusiveMax;
    // Rejection sampling avoids modulo bias; all max values are <= 81.
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
        const icon = element("div", "bz-parental-gate-lock", "🔒");
        icon.setAttribute("aria-hidden", "true");
        const title = element("h2", "bz-parental-gate-title", "Grown-up Check");
        title.id = "bz-parental-gate-title";
        const message = element("p", "bz-parental-gate-description",
          "A grown-up needs to help with this part of BibloZoo.");
        const actionLabel = typeof options.actionLabel === "string"
          ? options.actionLabel.trim().slice(0, 80) : "";
        if (actionLabel) message.textContent += " " + actionLabel;
        const content = element("div", "bz-parental-gate-content");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", title.id);
        dialog.setAttribute("aria-describedby", "bz-parental-gate-description");
        message.id = "bz-parental-gate-description";
        dialog.append(icon, title, message, content);
        overlay.appendChild(dialog);

        const session = {
          overlay, dialog, content, resolve, reject,
          onApproved: options.onApproved,
          previousFocus: doc.activeElement,
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
            if (event.shiftKey && doc.activeElement === first) {
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

        function renderIntro() {
          content.replaceChildren();
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
          continueButton.focus({ preventScroll: true });
        }

        function renderQuestion(feedbackText) {
          if (!active || active !== session || session.finished) return;
          content.replaceChildren();
          const prompt = element("p", "bz-parental-gate-prompt",
            "Solve this problem to continue:");
          const equation = element("p", "bz-parental-gate-equation",
            "(" + session.question.first + " × " + session.question.multiplier +
            ") + " + session.question.addition + " = ?");
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
          input.maxLength = 4;
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
            if (/^[0-9]{1,4}$/.test(typed) &&
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
          input.focus({ preventScroll: true });
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
