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
    state.view = "difficulty_selected";
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

  function renderDifficultySelected(wrap) {
    const selected = getSelectedVerse();
    const difficulty =
      getDifficultyOption(state.difficulty);

    if (!selected || !difficulty) {
      state.view = "difficulty";
      state.difficulty = "";
      renderDifficulty(wrap);
      return;
    }

    wrap.innerHTML = `
      ${renderMenuButton()}

      <div class="flashcards-stage-shell">
        <section class="flashcards-panel flashcards-overlap-panel flashcards-next-panel">
          ${renderMascot("flashcards-overlap-mascot")}

          ${renderReferencePill(selected.ref || selected.id)}

          <h1 class="flashcards-next-title">
            ${escapeHtml(difficulty.label)}
          </h1>

          <div class="flashcards-next-copy">
            Recording instructions come in Patch 3.
          </div>

          <button
            class="flashcards-primary-btn"
            id="flashcardsChooseDifficultyAgainBtn"
            type="button"
          >
            Choose Difficulty Again
          </button>
        </section>
      </div>
    `;

    const chooseAgainBtn =
      wrap.querySelector(
        "#flashcardsChooseDifficultyAgainBtn"
      );

    if (chooseAgainBtn) {
      chooseAgainBtn.onclick = () => {
        state.difficulty = "";
        state.view = "difficulty";
        requestRender();
      };
    }
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
    } else if (state.view === "difficulty_selected") {
      renderDifficultySelected(wrap);
    } else {
      renderLanding(wrap);
    }

    bindCommonActions(wrap);

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
