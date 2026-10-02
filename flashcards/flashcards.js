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
    themeId: "purple"
  };

  let api = null;
  let resizeObserver = null;

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
    resizeObserver?.disconnect();
    resizeObserver = null;
    state.view = "landing";
    state.selectedVerseId = "";
    state.difficulty = "";
    state.themeId = "purple";
  }

  function start() {
    resetSession();
  }

  function beginRound(verseId) {
    const selected =
      getEligibleVerses().find((item) => item?.id === verseId);

    if (!selected) return;

    state.selectedVerseId = selected.id;
    state.difficulty = "";
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

  function renderMenuButton() {
    return `
      <button
        class="flashcards-menu-btn"
        type="button"
        data-flashcards-exit
        aria-label="Back to Practice"
      >
        <span aria-hidden="true">☰</span>
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
            How well do you know this verse?
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
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-recall-shell">
        <section class="flashcards-panel flashcards-recall-panel">
          ${renderMascot("flashcards-overlap-mascot")}
          <div class="flashcards-recording-copy">
            <p>Say the verse out loud. Try your best and keep going
              if you make a mistake!</p>
            <p>When recording is available, you'll be able to listen
              back and see how you did.</p>
          </div>
        </section>
        <div class="flashcards-recall-actions">
          <button class="flashcards-record-preview" id="flashcardsRecordStartBtn"
            type="button" aria-describedby="flashcardsRecordingNote">
            <img src="${escapeHtml(getThemedControlAsset("record"))}" alt="">
            <span>Record — Preview</span>
          </button>
          <p class="flashcards-recording-note" id="flashcardsRecordingNote">
            Recording isn't available yet. Both buttons start practice without audio capture.
          </p>
          <button class="flashcards-secondary-btn" id="flashcardsSkipRecordingBtn"
            type="button">Skip Recording</button>
        </div>
      </div>
    `;
    const begin = () => {
      state.view = "challenge";
      requestRender();
    };
    wrap.querySelector("#flashcardsRecordStartBtn").onclick = begin;
    wrap.querySelector("#flashcardsSkipRecordingBtn").onclick = begin;
  }

  function renderChallenge(wrap) {
    const selected = getSelectedVerse();
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
          <button class="flashcards-secondary-btn" id="flashcardsChallengeDoneBtn"
            type="button">I'm Done</button>
        </div>
      </div>
    `;
    const stage = wrap.querySelector(".flashcards-recall-stage");
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
      state.view = "challenge_complete";
      requestRender();
    };
  }

  function renderChallengeComplete(wrap) {
    const selected = getSelectedVerse();
    wrap.innerHTML = `
      ${renderMenuButton()}
      <div class="flashcards-stage-shell">
        <section class="flashcards-panel flashcards-overlap-panel flashcards-next-panel">
          ${renderMascot("flashcards-overlap-mascot")}
          ${renderReferencePill(selected.ref || selected.id)}
          <h1 class="flashcards-next-title">Nice work!</h1>
          <p class="flashcards-next-copy">Keep practicing your verse out loud.</p>
          <button class="flashcards-primary-btn" id="flashcardsRetryBtn"
            type="button">Try Again</button>
          <button class="flashcards-secondary-btn" data-flashcards-exit
            type="button">Done</button>
        </section>
      </div>
    `;
    wrap.querySelector("#flashcardsRetryBtn").onclick = () => {
      state.difficulty = "";
      state.view = "difficulty";
      requestRender();
    };
  }

  function bindCommonActions(wrap) {
    wrap
      .querySelectorAll("[data-flashcards-exit]")
      .forEach((button) => {
        button.onclick = () => {
          resetSession();
          api?.goToPractice?.();
        };
      });
  }

  function renderScreen(idx) {
    if (!api?.makeSlide) return null;

    if (state.view !== "landing" && !getSelectedVerse()) resetSession();
    if (["recording_intro", "challenge", "challenge_complete"].includes(state.view) &&
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
    } else if (state.view === "challenge_complete") {
      renderChallengeComplete(wrap);
    } else {
      renderLanding(wrap);
    }

    bindCommonActions(wrap);
    if (state.view === "challenge" && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => api.scheduleSmartLearnTextFit(wrap));
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
  }

  window.BibloZooFlashcards = Object.freeze({
    initialize,
    start,
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
