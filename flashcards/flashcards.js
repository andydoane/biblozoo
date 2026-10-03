(() => {
  "use strict";

  const FLASHCARD_THEMES = Object.freeze([
    Object.freeze({
      id: "red",
      color: "#ff5a51",
      textColor: "#ffffff"
    }),
    Object.freeze({
      id: "orange",
      color: "#ffa351",
      textColor: "#ffffff"
    }),
    Object.freeze({
      id: "yellow",
      color: "#ffc751",
      textColor: "#333333"
    }),
    Object.freeze({
      id: "green",
      color: "#a7cb6f",
      textColor: "#ffffff"
    }),
    Object.freeze({
      id: "blue",
      color: "#40b9c5",
      textColor: "#ffffff"
    }),
    Object.freeze({
      id: "purple",
      color: "#7f66c6",
      textColor: "#ffffff"
    })
  ]);

  const DIFFICULTY_OPTIONS = Object.freeze([
    Object.freeze({
      id: "really_well",
      label: "Really Well",
      helper: "Say it with no help at all"
    }),
    Object.freeze({
      id: "pretty_good",
      label: "Pretty Good",
      helper: "Say it with just the first letters"
    }),
    Object.freeze({
      id: "still_learning",
      label: "Still Learning",
      helper: "Say it with words and pictures"
    })
  ]);

  const state = {
    view: "landing",
    selectedVerseId: "",
    difficulty: "",
    grade: "",
    themeId: "purple"
  };

  let api = null;
  let resizeObserver = null;
  let recording = null;
  let recordRequest = 0;
  let recordingNotice = "";
  let countdownRemaining = 0;
  let countdownTimer = null;
  let countdownFrame = null;
  let meterFrame = null;
  let comparisonPlaybackStarted = false;
  let finishCountdown = null;

  function cancelCountdown() {
    clearTimeout(countdownTimer);
    cancelAnimationFrame(countdownFrame);
    countdownFrame = null;
    countdownTimer = null;
    countdownRemaining = 0;
    const finish = finishCountdown;
    finishCountdown = null;
    finish?.(false);
  }

  function runCountdown(request) {
    cancelCountdown();
    if (request !== recordRequest || document.hidden) return Promise.resolve(false);
    return new Promise((resolve) => {
      finishCountdown = resolve;
      countdownRemaining = 3;
      state.view = "challenge";
      const armAfterPaint = () => {
        countdownFrame = requestAnimationFrame(() => {
          countdownFrame = requestAnimationFrame(() => {
            if (request !== recordRequest || document.hidden) {
              interruptCountdown();
              return;
            }
            const number = document.querySelector(".flashcards-countdown-number");
            if (!document.hasFocus() || !number?.isConnected ||
              !number.getBoundingClientRect().height) {
              armAfterPaint();
              return;
            }
            countdownFrame = null;
            countdownTimer = setTimeout(tick, 1000);
          });
        });
      };
      const tick = () => {
        if (request !== recordRequest || document.hidden) {
          interruptCountdown();
          return;
        }
        countdownRemaining -= 1;
        if (!countdownRemaining) {
          countdownTimer = null;
          finishCountdown = null;
          resolve(true);
          return;
        }
        requestRender();
        armAfterPaint();
      };
      requestRender();
      armAfterPaint();
    });
  }

  function interruptCountdown() {
    if (!finishCountdown) return;
    discardRecording();
    state.view = "recording_intro";
    recordingNotice = "Countdown was interrupted. Please try again or skip recording.";
    requestRender();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interruptCountdown();
  });
  window.addEventListener("pagehide", interruptCountdown);
  window.addEventListener("blur", () => {
    if (countdownTimer !== null) interruptCountdown();
  });
  const GRADES = Object.freeze([
    { id: "perfect", label: "Perfect", helper: "I didn't miss a single word." },
    { id: "mostly_right", label: "Mostly Right", helper: "I missed a couple of words." },
    { id: "needs_practice", label: "Needs Practice", helper: "I missed more than a few words." }
  ]);

  function discardRecording() {
    recordRequest += 1;
    cancelCountdown();
    cancelAnimationFrame(meterFrame);
    meterFrame = null;
    comparisonPlaybackStarted = false;
    recording?.dispose();
    recordingNotice = "";
  }

  async function beginWithoutRecording() {
    discardRecording();
    state.grade = "";
    const request = recordRequest;
    if (!await runCountdown(request)) return;
    if (request !== recordRequest || document.hidden) return;
    state.view = "challenge";
    requestRender();
  }

  async function beginRecording() {
    if (!recording || ["requesting", "preparing", "recording"].includes(recording.snapshot().status)) return;
    recordingNotice = "";
    state.grade = "";
    const request = ++recordRequest;
    const result = await recording.start(() => {
      state.view = "challenge";
      requestRender();
    }, () => runCountdown(request));
    if (request !== recordRequest || result !== "failed") return;
    state.view = "recording_intro";
    requestRender();
    api.showRecordingFallback(() => {
      if (request === recordRequest) beginWithoutRecording();
    });
  }

  function controlButton(id, asset, label, disabled = false) {
    return `<button class="flashcards-record-preview" id="${id}" type="button"
      data-no-ui-sound ${disabled ? "disabled" : ""}>
      <img src="${escapeHtml(getThemedControlAsset(asset))}" alt="">
      <span>${escapeHtml(label)}</span>
    </button>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getVerseList() {
    const list = api?.getVerseList?.();
    return Array.isArray(list) ? list : [];
  }

  function getEligibleVerses() {
    return getVerseList().filter((item) => {
      const verseId = String(item?.id || "").trim();
      if (!verseId) return false;

      return !!api?.getVerseProgress?.(verseId)?.learnCompleted;
    });
  }

  function getSelectedVerse() {
    const verseId = String(state.selectedVerseId || "").trim();
    if (!verseId) return null;

    return (
      getEligibleVerses().find((item) => item?.id === verseId) ||
      null
    );
  }

  function getThemeById(themeId) {
    return (
      FLASHCARD_THEMES.find((theme) => theme.id === themeId) ||
      FLASHCARD_THEMES[FLASHCARD_THEMES.length - 1]
    );
  }

  function getCurrentTheme() {
    return getThemeById(state.themeId);
  }

  function pickRandomThemeId() {
    const theme =
      FLASHCARD_THEMES[
      Math.floor(Math.random() * FLASHCARD_THEMES.length)
      ];

    return theme?.id || "purple";
  }

  function getDifficultyOption(difficultyId) {
    return (
      DIFFICULTY_OPTIONS.find(
        (option) => option.id === difficultyId
      ) || null
    );
  }

  function getThemedControlAsset(controlName) {
    const normalizedName =
      String(controlName || "").trim();

    if (
      normalizedName !== "record" &&
      normalizedName !== "play" &&
      normalizedName !== "stop"
    ) {
      return "";
    }

    const suffix =
      getCurrentTheme().id === "yellow"
        ? "_black"
        : "";

    return (
      `flashcards/flashcards_${normalizedName}${suffix}.png`
    );
  }

  function requestRender() {
    api?.requestRender?.();
  }

  function resetSession() {
    discardRecording();
    resizeObserver?.disconnect();
    resizeObserver = null;
    state.view = "landing";
    state.selectedVerseId = "";
    state.difficulty = "";
    state.grade = "";
    state.themeId = "purple";
  }

  function start() {
    resetSession();
  }

  function beginRound(verseId) {
    const selected =
      getEligibleVerses().find((item) => item?.id === verseId);

    if (!selected) return;

    discardRecording();
    state.selectedVerseId = selected.id;
    state.difficulty = "";
    state.grade = "";
    state.themeId = pickRandomThemeId();
    state.view = "difficulty";
    requestRender();
  }

  function chooseRandomVerse() {
    const eligible = getEligibleVerses();
    if (!eligible.length) return;

    const randomVerse =
      eligible[Math.floor(Math.random() * eligible.length)];

    beginRound(randomVerse.id);
  }

  function chooseDifficulty(difficultyId) {
    const option = getDifficultyOption(difficultyId);
    if (!option) return;

    state.difficulty = option.id;
    state.view = "recording_intro";
    requestRender();
  }

  function goBack() {
    const previousView = {
      difficulty: "landing",
      recording_intro: "difficulty",
      challenge: "recording_intro",
      comparison: "challenge",
      challenge_complete: "comparison",
      result: "challenge_complete"
    }[state.view];
    if (!previousView) return;
    // Invalidate pending permission requests and release audio before leaving.
    discardRecording();
    state.view = previousView;
    requestRender();
  }

  function renderMenuButton() {
    const isLanding = state.view === "landing";
    return `
      <button
        class="flashcards-menu-btn"
        type="button"
        data-flashcards-navigation
        ${countdownRemaining || ["requesting", "preparing", "recording", "stopping"].includes(recording?.snapshot().status) ? "data-no-ui-sound" : ""}
        aria-label="${isLanding ? "Home" : "Back"}"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          ${isLanding
        ? '<path d="M12 3L3 10h2v9h5v-6h4v6h5v-9h2L12 3z" fill="currentColor"/>'
        : '<path d="m14 5-7 7 7 7M7 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'}
        </svg>
      </button>
    `;
  }

  function renderMascot(className = "") {
    return `
      <img
        class="${escapeHtml(className)}"
        src="flashcards/flashcards_mascot.png"
        alt=""
        aria-hidden="true"
        draggable="false"
      >
    `;
  }

  function renderReferencePill(reference) {
    return `
      <div class="flashcards-reference-pill">
        ${escapeHtml(reference)}
      </div>
    `;
  }

  function renderLanding(wrap) {
    const eligible = getEligibleVerses();

    const bodyHtml = eligible.length
      ? `
          <label class="flashcards-picker-label" for="flashcardsVersePicker">
            Choose a verse.
          </label>

          <select
            class="flashcards-verse-select"
            id="flashcardsVersePicker"
            data-ui-sound
          >
            <option value="">Choose a Verse</option>
            ${eligible.map((item) => `
              <option value="${escapeHtml(item.id)}">
                ${escapeHtml(item.ref || item.id)}
              </option>
            `).join("")}
          </select>

          <button
            class="flashcards-primary-btn"
            id="flashcardsSurpriseBtn"
            type="button"
          >
            Surprise me!
          </button>
        `
      : `
          <div class="flashcards-empty-title">
            Learn your first verse to use Flashcards
          </div>

          <button
            class="flashcards-primary-btn"
            id="flashcardsLearnVerseBtn"
            type="button"
          >
            Learn a Verse
          </button>
        `;

    wrap.innerHTML = `
      ${renderMenuButton()}

      <div class="flashcards-landing-shell">
        <section class="flashcards-panel flashcards-landing-panel">
          ${renderMascot("flashcards-landing-mascot")}

          <h1 class="flashcards-title">Flashcards!</h1>

          ${bodyHtml}
        </section>
      </div>
    `;

    const select = wrap.querySelector("#flashcardsVersePicker");
    if (select) {
      select.onchange = () => {
        const verseId = String(select.value || "").trim();
        if (!verseId) return;
        beginRound(verseId);
      };
    }

    const surpriseBtn =
      wrap.querySelector("#flashcardsSurpriseBtn");

    if (surpriseBtn) {
      surpriseBtn.onclick = () => {
        chooseRandomVerse();
      };
    }

    const learnVerseBtn =
      wrap.querySelector("#flashcardsLearnVerseBtn");

    if (learnVerseBtn) {
      learnVerseBtn.onclick = () => {
        api?.goToNewVerse?.();
      };
    }
  }

  function renderDifficulty(wrap) {
    const selected = getSelectedVerse();

    if (!selected) {
      resetSession();
      renderLanding(wrap);
      return;
    }

    wrap.innerHTML = `
      ${renderMenuButton()}

      <div class="flashcards-stage-shell">
        <section class="flashcards-panel flashcards-overlap-panel flashcards-difficulty-panel">
          ${renderMascot("flashcards-overlap-mascot")}

          ${renderReferencePill(selected.ref || selected.id)}

          <h1 class="flashcards-difficulty-title">
            How well do you<br>know this verse?
          </h1>

          <div class="flashcards-choice-stack">
            ${DIFFICULTY_OPTIONS.map((option) => `
              <button
                class="flashcards-choice-btn"
                type="button"
                data-flashcards-difficulty="${escapeHtml(option.id)}"
              >
                <span class="flashcards-choice-pill">
                  ${escapeHtml(option.label)}
                </span>
                <span class="flashcards-choice-helper">
                  ${escapeHtml(option.helper)}
                </span>
              </button>
            `).join("")}
          </div>
        </section>
      </div>
    `;

    wrap
      .querySelectorAll("[data-flashcards-difficulty]")
      .forEach((button) => {
        button.onclick = () => {
          chooseDifficulty(
            button.getAttribute(
              "data-flashcards-difficulty"
            ) || ""
          );
        };
      });
  }

  // Use the actual verse words; echoParts supplies only the grouping.
  function getFirstLetterChunks(selected) {
    const words = (text) => api.tokenizeVerseText(String(text || ""))
      .filter((token) => token.type === "word")
      .map((token) => token.text);
    const verseWords = words(selected.verseText);
    const chunks = (selected.echoParts || []).map(words).filter((part) => part.length);
    const matches = chunks.flat().join(" ").toLowerCase() ===
      verseWords.join(" ").toLowerCase();
    let offset = 0;
    return (matches && chunks.length ? chunks : [verseWords]).map((chunk) => {
      const initials = verseWords.slice(offset, offset + chunk.length)
        .map((word) => word.charAt(0).toUpperCase()).join(" ");
      offset += chunk.length;
      return initials;
    });
  }

  function renderRecordingIntro(wrap) {
    const requesting = recording?.snapshot().status === "requesting";
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-recall-shell flashcards-instruction-shell">
        <section class="flashcards-panel flashcards-recall-panel">
          ${renderMascot("flashcards-overlap-mascot")}
          <div class="flashcards-recording-copy">
            <p>Record yourself saying the verse. Try your best and
              keep going if you make a mistake!</p>
            <p>Afterward, listen back and see how you did.</p>
          </div>
        </section>
        <div class="flashcards-recall-actions">
          ${controlButton("flashcardsRecordStartBtn", "record",
      requesting ? "Waiting for microphone…" : "Record", requesting)}
          ${recordingNotice ? `<p class="flashcards-recording-note" role="status">
            ${escapeHtml(recordingNotice)}
          </p>` : ""}
          <button class="flashcards-secondary-btn" id="flashcardsSkipRecordingBtn"
            type="button">Skip Recording</button>
        </div>
      </div>
    `;
    wrap.querySelector("#flashcardsRecordStartBtn").onclick = beginRecording;
    wrap.querySelector("#flashcardsSkipRecordingBtn").onclick = beginWithoutRecording;
  }

  function renderChallenge(wrap) {
    const selected = getSelectedVerse();
    const audioStatus = recording?.snapshot().status;
    const capturing = ["requesting", "preparing", "recording", "stopping"].includes(audioStatus);
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-recall-shell">
        <div class="flashcards-card-stack flashcards-recall-stack">
          ${renderMascot("flashcards-overlap-mascot")}
          <section class="flashcards-card-front flashcards-recall-card">
            ${renderReferencePill(selected.ref || selected.id)}
            <div class="learn-stage flashcards-recall-stage"></div>
          </section>
        </div>
        <div class="flashcards-recall-actions">
          ${countdownRemaining ? "" : `
          ${capturing ? `<div class="flashcards-recording-row">
            <button class="flashcards-record-preview flashcards-stop-btn"
              id="flashcardsChallengeDoneBtn" type="button" data-no-ui-sound
              aria-label="Stop recording" ${audioStatus !== "recording" ? "disabled" : ""}>
              <img src="${escapeHtml(getThemedControlAsset("stop"))}" alt="">
            </button>
            <div class="flashcards-meter" aria-label="${audioStatus === "recording" ? "Recording" : "Preparing recording"}">
              <span class="flashcards-meter-label">${audioStatus === "recording" ? "● Recording" : "Preparing…"}</span>
              <div class="flashcards-meter-bars" aria-hidden="true">
                ${Array.from({ length: 16 }, () => '<i></i>').join("")}
              </div>
            </div>
          </div>` : `
            <button class="flashcards-secondary-btn" id="flashcardsChallengeDoneBtn"
              type="button">I'm Done</button>`}
          `}
        </div>
      </div>
    `;
    const stage = wrap.querySelector(".flashcards-recall-stage");
    if (countdownRemaining) {
      stage.innerHTML = `<p class="flashcards-countdown" role="status" aria-live="polite" aria-atomic="true">
        <span>Say the verse in...</span>
        <span class="flashcards-countdown-number">${countdownRemaining}</span>
      </p>`;
      return;
    }
    if (state.difficulty !== "really_well") {
      const block = document.createElement("div");
      block.className = "smart-learn-text";
      block.dataset.smartLearnText = "";
      block.dataset.smartFitText = selected.verseText;
      const body = document.createElement("div");
      body.className = "smart-learn-body";
      if (state.difficulty === "pretty_good") {
        body.classList.add("flashcards-initials");
        for (const chunk of getFirstLetterChunks(selected)) {
          const line = document.createElement("div");
          line.textContent = chunk;
          body.appendChild(line);
        }
      } else {
        block.classList.add("smart-learn-text-remove");
        body.classList.add("learn-verse", "missing-words-theme", "flashcards-hidden-verse");
        body.appendChild(api.createHiddenVerseNode(selected));
      }
      block.appendChild(body);
      stage.appendChild(block);
      api.scheduleSmartLearnTextFit(wrap);
    }
    wrap.querySelector("#flashcardsChallengeDoneBtn").onclick = () => {
      if (capturing) recording.stop();
      else {
        state.view = "comparison";
        requestRender();
      }
    };
  }

  function showRerecordWaiting() {
    const play = document.querySelector("#flashcardsPlayBtn");
    if (!play) return false;
    play.style.height = `${play.getBoundingClientRect().height}px`;
    play.style.width = "100%";
    play.disabled = true;
    play.innerHTML = `<img src="${escapeHtml(getThemedControlAsset("record"))}" alt="">
      <span role="status">Waiting for microphone…</span>`;
    for (const id of ["flashcardsRerecordBtn", "flashcardsNextBtn"]) {
      const button = document.getElementById(id);
      if (button) button.disabled = true;
    }
    return true;
  }

  function updateMeter(wrap) {
    cancelAnimationFrame(meterFrame);
    const bars = wrap.querySelectorAll(".flashcards-meter-bars i");
    const meter = wrap.querySelector(".flashcards-meter");
    if (!meter || recording?.snapshot().status !== "recording") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let level = 0;
    const sample = () => {
      if (!wrap.isConnected || recording.snapshot().status !== "recording") return;
      const value = reduced.matches ? null : recording.readLevel();
      meter.classList.toggle("is-static", value === null);
      level = value === null ? 0 : Math.max(value, level * 0.85);
      bars.forEach((bar, index) => bar.classList.toggle("is-lit", index < Math.ceil(level * bars.length)));
      meterFrame = requestAnimationFrame(sample);
    };
    meterFrame = requestAnimationFrame(sample);
  }

  function renderComparison(wrap) {
    const selected = getSelectedVerse();
    const audio = recording.snapshot();
    const waiting = ["requesting", "preparing"].includes(audio.status);
    const message = audio.message;
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-recall-shell flashcards-comparison-shell">
        <div class="flashcards-card-stack flashcards-recall-stack">
          ${renderMascot("flashcards-overlap-mascot")}
          <section class="flashcards-card-front flashcards-recall-card">
            ${renderReferencePill(selected.ref || selected.id)}
<div class="learn-stage flashcards-recall-stage flashcards-comparison-stage${comparisonPlaybackStarted ? " flashcards-comparison-active" : ""}">
  <p class="flashcards-comparison-instruction">
    Listen to your recording, then compare it with the verse.
  </p>
  <div class="smart-learn-text" data-smart-learn-text>
    <div class="smart-learn-body">${escapeHtml(selected.verseText)}</div>
  </div>
</div>
          </section>
        </div>
        <div class="flashcards-recall-actions">
          ${audio.hasRecording || waiting ? controlButton("flashcardsPlayBtn",
      waiting ? "record" : audio.status === "playing" ? "stop" : "play",
      waiting ? "Waiting for microphone…" : audio.status === "playing" ? "Stop Playback" : "Play My Recording",
      waiting || audio.status === "loading") : ""}
          ${message ? `<p class="flashcards-recording-note" role="status">${escapeHtml(message)}</p>` : ""}
          <div class="flashcards-comparison-buttons">
            ${audio.hasRecording || waiting ? `<button class="flashcards-secondary-btn"
              id="flashcardsRerecordBtn" type="button" data-no-ui-sound ${waiting ? "disabled" : ""}>Re-record</button>` : ""}
            <button class="flashcards-secondary-btn" id="flashcardsNextBtn"
              type="button" ${waiting ? "disabled" : ""}>Next</button>
          </div>
        </div>
      </div>
    `;
    api.scheduleSmartLearnTextFit(wrap);
    const play = wrap.querySelector("#flashcardsPlayBtn");
    if (play) play.onclick = () => {
  comparisonPlaybackStarted = true;
  requestRender();
  void recording.play();
};
    const retry = wrap.querySelector("#flashcardsRerecordBtn");
    if (retry) retry.onclick = beginRecording;
    wrap.querySelector("#flashcardsNextBtn").onclick = () => {
      discardRecording();
      state.view = "challenge_complete";
      requestRender();
    };
  }

  function renderChallengeComplete(wrap) {
    const selected = getSelectedVerse();
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-stage-shell">
        <section class="flashcards-panel flashcards-overlap-panel flashcards-difficulty-panel">
          ${renderMascot("flashcards-overlap-mascot")}
          ${renderReferencePill("Grade Yourself!")}
          <h1 class="flashcards-difficulty-title">How well did you do?</h1>
          ${state.grade ? '<p class="flashcards-next-copy">Your grade is saved. Continue to your result.</p>' : ""}
          <div class="flashcards-choice-stack">
            ${GRADES.map((grade) => `<button class="flashcards-choice-btn" type="button" data-flashcards-grade="${grade.id}" ${state.grade && state.grade !== grade.id ? "disabled" : ""}>
              <span class="flashcards-choice-pill">${grade.label}</span>
              <span class="flashcards-choice-helper">${grade.helper}</span>
            </button>`).join("")}
          </div>
        </section>
      </div>
    `;
    wrap.querySelectorAll("[data-flashcards-grade]").forEach((button) => {
      button.onclick = () => {
        if (!state.grade) {
          api.recordFlashcardAttempt(selected.id, state.difficulty, button.dataset.flashcardsGrade);
          state.grade = button.dataset.flashcardsGrade;
        }
        state.view = "result";
        requestRender();
      };
    });
  }


  function renderResult(wrap) {
    const messages = { perfect: ["Amazing!", "You nailed that verse!"], mostly_right: ["Great work!", "You're really close!"], needs_practice: ["Great work!", "Keep practicing and you'll soon know it by heart!"] };
    const [title, copy] = messages[state.grade] || messages.needs_practice;
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-stage-shell">
        <section class="flashcards-panel flashcards-overlap-panel flashcards-next-panel">
          ${renderMascot("flashcards-overlap-mascot")}
          <h1 class="flashcards-next-title">${title}</h1>
          <p class="flashcards-next-copy">${copy}</p>
          <button class="flashcards-primary-btn" id="flashcardsTryAgainBtn" type="button">Try Again</button>
          <button class="flashcards-primary-btn" id="flashcardsRandomBtn" type="button">Random Verse</button>
          <button class="flashcards-secondary-btn" data-flashcards-exit type="button">Done</button>
        </section>
      </div>
    `;
    wrap.querySelector("#flashcardsTryAgainBtn").onclick = () => { state.grade = ""; state.view = "difficulty"; requestRender(); };
    wrap.querySelector("#flashcardsRandomBtn").onclick = chooseRandomVerse;
  }
  function bindCommonActions(wrap) {
    const navigation = wrap.querySelector("[data-flashcards-navigation]");
    if (navigation) navigation.onclick = () => {
      if (state.view === "landing") {
        resetSession();
        api?.goToHome?.();
      } else {
        goBack();
      }
    };
    wrap
      .querySelectorAll("[data-flashcards-exit]")
      .forEach((button) => {
        button.onclick = () => {
          resetSession();
          api?.goToPractice?.();
        };
      });
  }

  function fitRecordingInstructions(wrap) {
    if (!wrap.isConnected) return;
    const panel = wrap.querySelector(".flashcards-recall-panel");
    const copy = wrap.querySelector(".flashcards-recording-copy");
    if (!panel || !copy) return;
    panel.style.minHeight = "0";
    const style = getComputedStyle(panel);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const available = panel.clientHeight - padding;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    let low = 1.375 * rem;
    let high = 2.75 * rem;
    let best = low;
    for (let i = 0; i < 9; i++) {
      const size = (low + high) / 2;
      copy.style.fontSize = `${size}px`;
      if (copy.scrollHeight <= available && copy.scrollWidth <= copy.clientWidth) {
        best = low = size;
      } else {
        high = size;
      }
    }
    copy.style.fontSize = `${Math.floor(best)}px`;
    // Keep the minimum readable size; let the screen scroll when space is short.
    panel.style.minHeight = `${Math.ceil(copy.scrollHeight + padding)}px`;
  }

  function renderScreen(idx) {
    if (!api?.makeSlide) return null;

    if (state.view !== "landing" && !getSelectedVerse()) resetSession();
    if (["recording_intro", "challenge", "comparison", "challenge_complete", "result"].includes(state.view) &&
      !getDifficultyOption(state.difficulty)) state.view = "difficulty";

    const isLanding =
      state.view === "landing";

    const theme =
      isLanding
        ? getThemeById("purple")
        : getCurrentTheme();

    const wrap = document.createElement("div");
    wrap.className =
      `flashcards-screen flashcards-theme-${theme.id}`;
    wrap.dataset.flashcardsTheme = theme.id;
    wrap.dataset.flashcardsControlTone =
      theme.id === "yellow"
        ? "black"
        : "white";

    if (state.view === "difficulty") {
      renderDifficulty(wrap);
    } else if (state.view === "recording_intro") {
      renderRecordingIntro(wrap);
    } else if (state.view === "challenge") {
      renderChallenge(wrap);
    } else if (state.view === "comparison") {
      renderComparison(wrap);
    } else if (state.view === "challenge_complete") {
      renderChallengeComplete(wrap);
    } else if (state.view === "result") {
      renderResult(wrap);
    } else {
      renderLanding(wrap);
    }

    bindCommonActions(wrap);
    updateMeter(wrap);
    const instructionView = state.view === "recording_intro";
    const fit = () => instructionView
      ? fitRecordingInstructions(wrap)
      : api.scheduleSmartLearnTextFit(wrap);
    if (instructionView) {
      requestAnimationFrame(fit);
      document.fonts?.ready.then(fit).catch(() => { });
    }
    if (["recording_intro", "challenge", "comparison"].includes(state.view) && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(fit);
      observer.observe(wrap);
      // requestRender replaces the screen; disconnect the previous observer.
      resizeObserver?.disconnect();
      resizeObserver = observer;
    } else {
      resizeObserver?.disconnect();
      resizeObserver = null;
    }

    return api.makeSlide({
      idx,
      bg: theme.color,
      navHidden: true,
      inner: wrap
    });
  }

  function initialize(nextApi) {
    api = nextApi || null;
    if (!recording) recording = window.BibloZooRecording.create({
      onChange: () => {
        if (state.view === "comparison" &&
          ["requesting", "preparing"].includes(recording?.snapshot().status) &&
          showRerecordWaiting()) return;
        if (recording?.snapshot().status === "ready" && state.view === "challenge") {
          state.view = "comparison";
        }
        requestRender();
      },
      onInterrupted: () => {
        recordRequest += 1;
        cancelCountdown();
        if (!getSelectedVerse()) return;
        recordingNotice = "Recording was interrupted. Please try again or skip recording.";
        state.view = "recording_intro";
        requestRender();
      }
    });
  }

  window.BibloZooFlashcards = Object.freeze({
    initialize,
    start,
    stopSession: resetSession,
    renderScreen,
    getEligibleVerses,
    getThemedControlAsset,
    getSessionState: () => ({
      view: state.view,
      selectedVerseId: state.selectedVerseId,
      difficulty: state.difficulty,
      themeId: state.themeId
    })
  });
})();
