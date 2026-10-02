(() => {
  "use strict";

  const state = {
    view: "landing",
    selectedVerseId: ""
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

  function requestRender() {
    api?.requestRender?.();
  }

  function resetSession() {
    state.view = "landing";
    state.selectedVerseId = "";
  }

  function start() {
    resetSession();
  }

  function chooseVerse(verseId) {
    const selected =
      getEligibleVerses().find((item) => item?.id === verseId);

    if (!selected) return;

    state.selectedVerseId = selected.id;
    state.view = "selected";
    requestRender();
  }

  function chooseRandomVerse() {
    const eligible = getEligibleVerses();
    if (!eligible.length) return;

    const randomVerse =
      eligible[Math.floor(Math.random() * eligible.length)];

    chooseVerse(randomVerse.id);
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
          <img
            class="flashcards-landing-mascot"
            src="flashcards/flashcards_mascot.png"
            alt=""
            aria-hidden="true"
            draggable="false"
          >

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
        chooseVerse(verseId);
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

  function renderSelectedVerse(wrap) {
    const selected = getSelectedVerse();

    if (!selected) {
      resetSession();
      renderLanding(wrap);
      return;
    }

    wrap.innerHTML = `
      ${renderMenuButton()}

      <div class="flashcards-landing-shell">
        <section class="flashcards-panel flashcards-selected-panel">
          <img
            class="flashcards-selected-mascot"
            src="flashcards/flashcards_mascot.png"
            alt=""
            aria-hidden="true"
            draggable="false"
          >

          <div class="flashcards-reference-pill">
            ${escapeHtml(selected.ref || selected.id)}
          </div>

          <h1 class="flashcards-selected-title">
            Verse selected!
          </h1>

          <div class="flashcards-selected-copy">
            Difficulty choices come in Patch 2.
          </div>

          <button
            class="flashcards-primary-btn"
            id="flashcardsBackToPickerBtn"
            type="button"
          >
            Back to Verse Picker
          </button>
        </section>
      </div>
    `;

    const backBtn =
      wrap.querySelector("#flashcardsBackToPickerBtn");

    if (backBtn) {
      backBtn.onclick = () => {
        state.view = "landing";
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

    const wrap = document.createElement("div");
    wrap.className =
      "flashcards-screen flashcards-theme-purple";

    if (state.view === "selected") {
      renderSelectedVerse(wrap);
    } else {
      renderLanding(wrap);
    }

    bindCommonActions(wrap);

    return api.makeSlide({
      idx,
      bg: "#7f66c6",
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
    getSessionState: () => ({
      view: state.view,
      selectedVerseId: state.selectedVerseId
    })
  });
})();
