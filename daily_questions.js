/* =========================================================
   BibloZoo Daily Pet Questions
   ========================================================= */

(function () {
  "use strict";

  /*
    The Daily Pet Questions feature will live in this module.

    app.js will remain responsible for:
      - global app navigation
      - profile progress storage
      - shared verse/audio helpers
      - deciding whether the feature is enabled

    This file will eventually handle:
      - daily question eligibility
      - question session state
      - title-screen question offer
      - question and verse-help screens
      - "Something to Chew On"
      - snack reward
      - feeding game
      - debug testing helpers
  */

  const MODULE_VERSION = 1;
  const DAILY_PROGRESS_VERSION = 1;

  /*
    Version 1 / initial testing allowlist.

    Only these verses may participate in Daily Pet Questions.
    Additional verses can be added later without changing the
    rest of the feature.
  */
  const DAILY_PET_QUESTION_VERSE_IDS =
    Object.freeze([
      "genesis_1_1",
      "john_3_16",
      "romans_6_23",
      "psalm_23_4"
    ]);

  const DAILY_PET_QUESTION_VERSE_ID_SET =
    new Set(DAILY_PET_QUESTION_VERSE_IDS);

  let appApi = null;
  let pendingOffer = null;

  let acceptedOffer = null;

  const SESSION_PHASES = Object.freeze({
    QUESTION: "question",
    VERSE: "verse",
    REFLECTION: "reflection",
    REWARD_INTRO: "reward_intro",
    REWARD_GAME: "reward_game",
    REWARD_DONE: "reward_done"
  });

  let dailySession = null;

  let debugRotationIndex = -1;

  const LATER_STORAGE_PREFIX =
    "biblozooDailyQuestionLater";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initialize(api) {
    appApi =
      api &&
        typeof api === "object"
        ? api
        : null;

    return !!appApi;
  }

  function isFeatureEnabled() {
    return (
      appApi?.isEnabled?.() === true
    );
  }

  function isDebugEnabled() {
    return (
      appApi?.isDebugEnabled?.() === true
    );
  }

  function getAllowedVerseIds() {
    return [...DAILY_PET_QUESTION_VERSE_IDS];
  }

  function isAllowedVerseId(verseId) {
    const cleanVerseId =
      String(verseId || "").trim();

    return DAILY_PET_QUESTION_VERSE_ID_SET
      .has(cleanVerseId);
  }

  function normalizeQuestion(rawQuestion) {
    if (
      !rawQuestion ||
      typeof rawQuestion !== "object"
    ) {
      return null;
    }

    const question =
      String(rawQuestion.question || "").trim();

    const choices =
      Array.isArray(rawQuestion.choices)
        ? rawQuestion.choices.map((choice) =>
          String(choice || "").trim()
        )
        : [];

    const answer =
      rawQuestion.answer;

    if (!question) {
      return null;
    }

    if (
      choices.length !== 3 ||
      choices.some((choice) => !choice)
    ) {
      return null;
    }

    if (
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer > 2
    ) {
      return null;
    }

    return {
      question,
      choices,
      answer
    };
  }

  function normalizeReflection(rawReflection) {
    if (
      !rawReflection ||
      typeof rawReflection !== "object"
    ) {
      return null;
    }

    const recall =
      normalizeQuestion(rawReflection.recall);

    const meaning =
      normalizeQuestion(rawReflection.meaning);

    const applicationPrompt =
      String(
        rawReflection.application?.prompt || ""
      ).trim();

    if (
      !recall ||
      !meaning ||
      !applicationPrompt
    ) {
      return null;
    }

    return {
      recall,
      meaning,
      application: {
        prompt: applicationPrompt
      }
    };
  }

  function getLocalDayKey(date = new Date()) {
    const safeDate =
      date instanceof Date &&
        !Number.isNaN(date.getTime())
        ? date
        : new Date();

    const year =
      safeDate.getFullYear();

    const month =
      String(safeDate.getMonth() + 1)
        .padStart(2, "0");

    const day =
      String(safeDate.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function normalizeDailyVerseProgress(
    rawVerseProgress
  ) {
    const raw =
      rawVerseProgress &&
        typeof rawVerseProgress === "object" &&
        !Array.isArray(rawVerseProgress)
        ? rawVerseProgress
        : {};

    const lastAskedAt =
      Number(raw.lastAskedAt);

    const sessionsCompleted =
      Number(raw.sessionsCompleted);

    return {
      lastAskedAt:
        Number.isFinite(lastAskedAt) &&
          lastAskedAt > 0
          ? lastAskedAt
          : 0,
      sessionsCompleted:
        Number.isFinite(sessionsCompleted) &&
          sessionsCompleted > 0
          ? Math.floor(sessionsCompleted)
          : 0
    };
  }

  function createDefaultDailyProgress(
    overrides = {}
  ) {
    const raw =
      overrides &&
        typeof overrides === "object" &&
        !Array.isArray(overrides)
        ? overrides
        : {};

    const rawLastCompletedDay =
      String(
        raw.lastCompletedDay || ""
      ).trim();

    const lastCompletedDay =
      /^\d{4}-\d{2}-\d{2}$/.test(
        rawLastCompletedDay
      )
        ? rawLastCompletedDay
        : "";

    const lastCompletedAt =
      Number(raw.lastCompletedAt);

    const byVerse = {};

    if (
      raw.byVerse &&
      typeof raw.byVerse === "object" &&
      !Array.isArray(raw.byVerse)
    ) {
      for (
        const [verseId, verseProgress] of
        Object.entries(raw.byVerse)
      ) {
        const cleanVerseId =
          String(verseId || "").trim();

        if (!cleanVerseId) continue;

        byVerse[cleanVerseId] =
          normalizeDailyVerseProgress(
            verseProgress
          );
      }
    }

    return {
      version: DAILY_PROGRESS_VERSION,
      lastCompletedDay,
      lastCompletedAt:
        Number.isFinite(lastCompletedAt) &&
          lastCompletedAt > 0
          ? lastCompletedAt
          : 0,
      lastVerseId:
        String(
          raw.lastVerseId || ""
        ).trim(),
      byVerse
    };
  }

  function normalizeDailyProgress(
    rawProgress
  ) {
    return createDefaultDailyProgress(
      rawProgress
    );
  }

  function getEligibleVerses() {
    if (!isFeatureEnabled()) {
      return [];
    }

    const verseList =
      appApi?.getVerseList?.();

    if (!Array.isArray(verseList)) {
      return [];
    }

    const getVerseProgress =
      appApi?.getVerseProgress;

    const isPetUnlocked =
      appApi?.isPetUnlocked;

    if (
      typeof getVerseProgress !== "function" ||
      typeof isPetUnlocked !== "function"
    ) {
      return [];
    }

    return verseList
      .map((verse) => {
        const verseId =
          String(
            verse?.id || ""
          ).trim();

        if (
          !verseId ||
          !isAllowedVerseId(verseId)
        ) {
          return null;
        }

        const reflection =
          normalizeReflection(
            verse?.reflection
          );

        if (!reflection) {
          return null;
        }

        const verseProgress =
          getVerseProgress(verseId);

        if (
          !isPetUnlocked(
            verseProgress
          )
        ) {
          return null;
        }

        return {
          ...verse,
          id: verseId,
          reflection
        };
      })
      .filter(Boolean);
  }

  function getLastAskedAtForVerse(
    dailyProgress,
    verseId
  ) {
    const lastAskedAt =
      Number(
        dailyProgress
          ?.byVerse
          ?.[verseId]
          ?.lastAskedAt
      );

    return (
      Number.isFinite(lastAskedAt) &&
        lastAskedAt > 0
        ? lastAskedAt
        : 0
    );
  }

  function chooseDailyQuestionVerse() {
    const eligibleVerses =
      getEligibleVerses();

    if (!eligibleVerses.length) {
      return null;
    }

    if (eligibleVerses.length === 1) {
      return eligibleVerses[0];
    }

    const dailyProgress =
      normalizeDailyProgress(
        appApi?.getDailyProgress?.()
      );

    let candidates =
      eligibleVerses;

    const lastVerseId =
      String(
        dailyProgress.lastVerseId || ""
      ).trim();

    if (
      lastVerseId &&
      eligibleVerses.length > 1
    ) {
      const alternatives =
        eligibleVerses.filter(
          (verse) =>
            verse.id !== lastVerseId
        );

      if (alternatives.length) {
        candidates =
          alternatives;
      }
    }

    const oldestLastAskedAt =
      Math.min(
        ...candidates.map(
          (verse) =>
            getLastAskedAtForVerse(
              dailyProgress,
              verse.id
            )
        )
      );

    const leastRecentlyAsked =
      candidates.filter(
        (verse) =>
          getLastAskedAtForVerse(
            dailyProgress,
            verse.id
          ) === oldestLastAskedAt
      );

    const pool =
      leastRecentlyAsked.length
        ? leastRecentlyAsked
        : candidates;

    return (
      pool[
      Math.floor(
        Math.random() *
        pool.length
      )
      ] || null
    );
  }

  function chooseNextDebugVerse() {
    if (
      !isFeatureEnabled() ||
      !isDebugEnabled()
    ) {
      return null;
    }

    const eligibleVerses =
      getEligibleVerses();

    if (!eligibleVerses.length) {
      return null;
    }

    const eligibleById =
      new Map(
        eligibleVerses.map(
          (verse) => [
            verse.id,
            verse
          ]
        )
      );

    const verseCount =
      DAILY_PET_QUESTION_VERSE_IDS
        .length;

    for (
      let offset = 1;
      offset <= verseCount;
      offset += 1
    ) {
      const nextIndex =
        (
          debugRotationIndex +
          offset +
          verseCount
        ) % verseCount;

      const verseId =
        DAILY_PET_QUESTION_VERSE_IDS[
        nextIndex
        ];

      const verse =
        eligibleById.get(verseId);

      if (!verse) {
        continue;
      }

      debugRotationIndex =
        nextIndex;

      return verse;
    }

    return null;
  }

  function prepareForcedDebugOffer() {
    if (
      !isFeatureEnabled() ||
      !isDebugEnabled()
    ) {
      return null;
    }

    pendingOffer = null;
    acceptedOffer = null;

    const verse =
      chooseNextDebugVerse();

    if (!verse) {
      return null;
    }

    pendingOffer = {
      verseId: verse.id,
      verse,
      debugForced: true
    };

    return pendingOffer;
  }

  function hasCompletedToday(
    date = new Date()
  ) {
    const dailyProgress =
      normalizeDailyProgress(
        appApi?.getDailyProgress?.()
      );

    return (
      dailyProgress.lastCompletedDay ===
      getLocalDayKey(date)
    );
  }

  function shouldOfferToday(
    date = new Date()
  ) {
    if (!isFeatureEnabled()) {
      return false;
    }

    if (isDebugEnabled()) {
      return true;
    }

    return !hasCompletedToday(date);
  }

  function getLaterStorageKey(
    date = new Date()
  ) {
    const profileId =
      String(
        appApi?.getActiveProfileId?.() || ""
      ).trim();

    if (!profileId) {
      return "";
    }

    return [
      LATER_STORAGE_PREFIX,
      profileId,
      getLocalDayKey(date)
    ].join(":");
  }

  function wasDismissedForSession(
    date = new Date()
  ) {
    const storageKey =
      getLaterStorageKey(date);

    if (!storageKey) {
      return false;
    }

    try {
      return (
        sessionStorage.getItem(
          storageKey
        ) === "1"
      );
    } catch (err) {
      return false;
    }
  }

  function dismissPendingOffer(
    date = new Date()
  ) {
    const storageKey =
      getLaterStorageKey(date);

    if (storageKey) {
      try {
        sessionStorage.setItem(
          storageKey,
          "1"
        );
      } catch (err) {
        console.warn(
          "Could not remember Daily Question Later choice",
          err
        );
      }
    }

    pendingOffer = null;
    acceptedOffer = null;
  }

  function createSessionFromOffer(offer) {
    const verseId =
      String(
        offer?.verseId || ""
      ).trim();

    const verse =
      offer?.verse;

    if (
      !verseId ||
      !verse ||
      typeof verse !== "object"
    ) {
      return null;
    }

    const reflection =
      normalizeReflection(
        verse.reflection
      );

    if (!reflection) {
      return null;
    }

    const petName =
      String(
        appApi?.getPetName?.(
          verseId
        ) ||
        verse.biblopetDefaultName ||
        "BibloPet"
      ).trim() ||
      "BibloPet";

    return {
      verseId,
      verseRef:
        String(
          verse.ref || ""
        ).trim(),
      verseText:
        String(
          verse.verseText || ""
        ).trim(),
      translation:
        String(
          verse.translation || ""
        ).trim(),
      petName,
      reflection,
      phase:
        SESSION_PHASES.QUESTION,
      questionIndex: 0,
      selectedAnswer: null,
      answered: false,
      answerCorrect: false,
      usedVerseHelp: false,
      verseAudioPlaying: false,
      completionRecorded: false,
      snack: "",
      rewardComplete: false
    };
  }

  function acceptPendingOffer() {
    if (!pendingOffer) {
      return null;
    }

    const nextOffer =
      pendingOffer;

    const nextSession =
      createSessionFromOffer(
        nextOffer
      );

    if (!nextSession) {
      return null;
    }

    acceptedOffer =
      nextOffer;

    dailySession =
      nextSession;

    pendingOffer = null;

    return acceptedOffer;
  }

  function getAcceptedOffer() {
    return acceptedOffer;
  }

  function clearOfferState() {
    pendingOffer = null;
    acceptedOffer = null;
    dailySession = null;
    debugRotationIndex = -1;
  }

  function prepareStartupOffer({
    allowOffer = false
  } = {}) {
    pendingOffer = null;
    acceptedOffer = null;

    if (!allowOffer) {
      return null;
    }

    if (!shouldOfferToday()) {
      return null;
    }

    if (
      !isDebugEnabled() &&
      wasDismissedForSession()
    ) {
      return null;
    }

    const verse =
      chooseDailyQuestionVerse();

    if (!verse) {
      return null;
    }

    pendingOffer = {
      verseId: verse.id,
      verse
    };

    return pendingOffer;
  }

  function getPendingOffer() {
    return pendingOffer;
  }

  function clearPendingOffer() {
    pendingOffer = null;
  }

  function renderTitleOffer() {
    if (!isFeatureEnabled()) {
      return "";
    }

    const offer =
      getPendingOffer();

    if (!offer?.verseId) {
      return "";
    }

    const verseId =
      offer.verseId;

    const petName =
      String(
        appApi?.getPetName?.(
          verseId
        ) ||
        offer.verse
          ?.biblopetDefaultName ||
        "BibloPet"
      ).trim() ||
      "BibloPet";

    const profilePictureHtml =
      typeof appApi
        ?.profilePictureHtml ===
        "function"
        ? appApi.profilePictureHtml(
          verseId,
          {
            className:
              "daily-question-offer-avatar",
            alt: ""
          }
        )
        : "";

    return `
      <div
        class="daily-question-offer-backdrop"
        data-daily-question-offer
        role="dialog"
        aria-modal="true"
        aria-label="${escapeHtml(
      petName
    )} has a question"
      >
        <div
          class="daily-question-offer-card"
        >
          ${profilePictureHtml}

          <div
            class="daily-question-offer-title"
          >
            ${escapeHtml(
      petName
    )} has a question!
          </div>

          <button
            class="daily-question-offer-accept no-zoom"
            type="button"
            data-daily-question-accept
          >
            OK
          </button>

          <button
            class="daily-question-offer-later no-zoom"
            type="button"
            data-daily-question-later
          >
            LATER
          </button>
        </div>
      </div>
    `;
  }

  function bindTitleOffer(rootEl) {
    const offerElement =
      rootEl?.querySelector?.(
        "[data-daily-question-offer]"
      );

    if (!offerElement) {
      return;
    }

    /*
      Do not let taps on the modal reach
      controls on the title page underneath.
    */
    offerElement.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
      }
    );

    const acceptButton =
      offerElement.querySelector(
        "[data-daily-question-accept]"
      );

    const laterButton =
      offerElement.querySelector(
        "[data-daily-question-later]"
      );

    if (acceptButton) {
      acceptButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          const accepted =
            acceptPendingOffer();

          if (!accepted) {
            return;
          }

          appApi
            ?.goToDailySession?.();
        };
    }

    if (laterButton) {
      laterButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          dismissPendingOffer();

          appApi?.renderApp?.();
        };
    }
  }

  function clearSessionState() {
    acceptedOffer = null;
    dailySession = null;
  }

  function getSessionQuestion(
    session
  ) {
    if (
      !session ||
      session.phase !==
        SESSION_PHASES.QUESTION
    ) {
      return null;
    }

    return session.questionIndex === 1
      ? session.reflection?.meaning || null
      : session.reflection?.recall || null;
  }

  function renderScreen(idx) {
    if (
      !isFeatureEnabled() ||
      typeof appApi?.makeSlide !==
      "function"
    ) {
      return null;
    }

    const wrap =
      document.createElement("div");

    wrap.className =
      "daily-question-session";

    const session =
      dailySession;

    if (!session) {
      wrap.innerHTML = `
        <div
          class="daily-question-session-empty"
        >
          <div
            class="daily-question-session-empty-title"
          >
            No Daily Question Ready
          </div>

          <button
            class="daily-question-session-back no-zoom"
            type="button"
            data-daily-session-back
          >
            Back to My Zoo
          </button>
        </div>
      `;
    } else if (
      session.phase ===
        SESSION_PHASES.VERSE
    ) {
      wrap.innerHTML = `
        <div
          class="daily-question-verse-shell"
          data-daily-session-phase="${escapeHtml(
            session.phase
          )}"
        >
          <div
            class="daily-question-verse-card"
          >
            <div
              class="daily-question-verse-kicker"
            >
              Check the Verse
            </div>

            <div
              class="daily-question-verse-ref"
            >
              ${escapeHtml(
                session.verseRef
              )}
            </div>

            <div
              class="daily-question-verse-text"
            >
              ${escapeHtml(
                session.verseText
              )}
            </div>

            ${
              session.translation
                ? `
                  <div
                    class="daily-question-verse-translation"
                  >
                    ${escapeHtml(
                      session.translation
                    )}
                  </div>
                `
                : ""
            }

            <button
              class="daily-question-verse-listen no-zoom"
              type="button"
              data-daily-verse-listen
              ${
                session.verseAudioPlaying
                  ? "disabled"
                  : ""
              }
            >
              ${
                session.verseAudioPlaying
                  ? "Listening..."
                  : "Listen to the Verse"
              }
            </button>
          </div>

          <button
            class="daily-question-verse-back no-zoom"
            type="button"
            data-daily-verse-back
            ${
              session.verseAudioPlaying
                ? "disabled"
                : ""
            }
          >
            Back to the Question
          </button>
        </div>
      `;
    } else if (
      session.phase ===
        SESSION_PHASES.REFLECTION
    ) {
      const profilePictureHtml =
        typeof appApi
          ?.profilePictureHtml ===
          "function"
          ? appApi.profilePictureHtml(
            session.verseId,
            {
              className:
                "daily-question-session-avatar",
              alt: ""
            }
          )
          : "";

      const applicationPrompt =
        String(
          session.reflection
            ?.application
            ?.prompt || ""
        ).trim();

      wrap.innerHTML = `
        <div
          class="daily-question-reflection-shell"
          data-daily-session-phase="${escapeHtml(
            session.phase
          )}"
        >
          <div
            class="daily-question-reflection-pet"
          >
            ${profilePictureHtml}
          </div>

          <div
            class="daily-question-reflection-card"
          >
            <div
              class="daily-question-ref-pill"
            >
              ${escapeHtml(
                session.verseRef
              )}
            </div>

            <div
              class="daily-question-reflection-title"
            >
              Something to chew on...
            </div>

            <div
              class="daily-question-reflection-prompt"
            >
              ${escapeHtml(
                applicationPrompt
              )}
            </div>
          </div>

          <button
            class="daily-question-reflection-done no-zoom"
            type="button"
            data-daily-reflection-done
          >
            Done
          </button>
        </div>
      `;
    } else if (
      session.phase ===
        SESSION_PHASES.REWARD_INTRO
    ) {
      wrap.innerHTML = `
        <div
          class="daily-question-complete-shell"
          data-daily-session-phase="${escapeHtml(
            session.phase
          )}"
        >
          <div
            class="daily-question-complete-card"
          >
            <div
              class="daily-question-complete-title"
            >
              Daily Question complete!
            </div>

            <div
              class="daily-question-complete-note"
            >
              Your reward comes next.
            </div>
          </div>

          <button
            class="daily-question-complete-back no-zoom"
            type="button"
            data-daily-session-back
          >
            Back to My Zoo
          </button>
        </div>
      `;
    } else {
      const question =
        getSessionQuestion(
          session
        );

      const profilePictureHtml =
        typeof appApi
          ?.profilePictureHtml ===
          "function"
          ? appApi.profilePictureHtml(
            session.verseId,
            {
              className:
                "daily-question-session-avatar",
              alt: ""
            }
          )
          : "";

      if (!question) {
        wrap.innerHTML = `
          <div
            class="daily-question-session-empty"
          >
            <div
              class="daily-question-session-empty-title"
            >
              Question unavailable
            </div>

            <button
              class="daily-question-session-back no-zoom"
              type="button"
              data-daily-session-back
            >
              Back to My Zoo
            </button>
          </div>
        `;
      } else {
        const questionNumber =
          session.questionIndex === 1
            ? 2
            : 1;

        const headingText =
          session.answered
            ? (
              session.answerCorrect
                ? "Correct!"
                : "Nice try!"
            )
            : `${session.petName} wonders...`;

        const headingClass =
          session.answered
            ? (
              session.answerCorrect
                ? " is-correct"
                : " is-nice-try"
            )
            : "";

        const choiceButtons =
          question.choices
            .map(
              (choice, index) => {
                const isSelected =
                  session.selectedAnswer ===
                  index;

                const isCorrectChoice =
                  session.answered &&
                  index === question.answer;

                const isIncorrectSelected =
                  session.answered &&
                  isSelected &&
                  index !== question.answer;

                const isDimmed =
                  session.answered &&
                  !isCorrectChoice &&
                  !isIncorrectSelected;

                const stateClass = [
                  isCorrectChoice
                    ? " is-correct"
                    : "",
                  isIncorrectSelected
                    ? " is-incorrect"
                    : "",
                  isDimmed
                    ? " is-dimmed"
                    : ""
                ].join("");

                const marker =
                  isCorrectChoice
                    ? "✓"
                    : (
                      isIncorrectSelected
                        ? "×"
                        : ""
                    );

                return `
                  <button
                    class="daily-question-choice no-zoom${stateClass}"
                    type="button"
                    data-daily-question-choice="${index}"
                    aria-pressed="${
                      isSelected
                        ? "true"
                        : "false"
                    }"
                    ${
                      session.answered
                        ? "disabled"
                        : ""
                    }
                  >
                    <span
                      class="daily-question-choice-label"
                    >
                      ${escapeHtml(
                        choice
                      )}
                    </span>

                    ${
                      marker
                        ? `
                          <span
                            class="daily-question-choice-marker"
                            aria-hidden="true"
                          >
                            ${marker}
                          </span>
                        `
                        : ""
                    }
                  </button>
                `;
              }
            )
            .join("");

        wrap.innerHTML = `
          <div
            class="daily-question-session-shell"
            data-daily-session-phase="${escapeHtml(
              session.phase
            )}"
            data-daily-question-number="${questionNumber}"
          >
            <button
              class="daily-question-session-back no-zoom"
              type="button"
              data-daily-session-back
            >
              Back to My Zoo
            </button>

            <div
              class="daily-question-pet"
            >
              ${profilePictureHtml}

              <div
                class="daily-question-wonders${headingClass}"
                aria-live="polite"
              >
                ${escapeHtml(
                  headingText
                )}
              </div>
            </div>

            <div
              class="daily-question-card"
            >
              <div
                class="daily-question-ref-pill"
              >
                ${escapeHtml(
                  session.verseRef
                )}
              </div>

              <div
                class="daily-question-text"
              >
                ${escapeHtml(
                  question.question
                )}
              </div>

              <div
                class="daily-question-choices"
                role="group"
                aria-label="Answer choices"
              >
                ${choiceButtons}
              </div>

              <div
                class="daily-question-help"
              >
                <div
                  class="daily-question-help-label"
                >
                  Not sure?
                </div>

                <button
                  class="daily-question-check-verse no-zoom"
                  type="button"
                  data-daily-check-verse
                >
                  Check the verse
                </button>
              </div>
            </div>

            ${
              session.answered
                ? `
                  <button
                    class="daily-question-feedback-next no-zoom"
                    type="button"
                    data-daily-question-next
                  >
                    Next
                  </button>
                `
                : ""
            }
          </div>
        `;
      }
    }

    const backButton =
      wrap.querySelector(
        "[data-daily-session-back]"
      );

    if (backButton) {
      backButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          clearSessionState();

          appApi?.goToTitle?.();
        };
    }

    wrap
      .querySelectorAll(
        "[data-daily-question-choice]"
      )
      .forEach((button) => {
        button.onclick =
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (
              !dailySession ||
              dailySession.answered
            ) {
              return;
            }

            const currentQuestion =
              getSessionQuestion(
                dailySession
              );

            if (!currentQuestion) {
              return;
            }

            const selectedIndex =
              Number(
                button.getAttribute(
                  "data-daily-question-choice"
                )
              );

            if (
              !Number.isInteger(
                selectedIndex
              ) ||
              selectedIndex < 0 ||
              selectedIndex > 2
            ) {
              return;
            }

            dailySession.selectedAnswer =
              selectedIndex;

            dailySession.answered = true;

            dailySession.answerCorrect =
              selectedIndex ===
              currentQuestion.answer;

            appApi?.renderApp?.();
          };
      });

    const nextQuestionButton =
      wrap.querySelector(
        "[data-daily-question-next]"
      );

    if (nextQuestionButton) {
      nextQuestionButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            !dailySession ||
            dailySession.phase !==
              SESSION_PHASES.QUESTION ||
            !dailySession.answered
          ) {
            return;
          }

          if (
            dailySession.questionIndex === 0
          ) {
            dailySession.questionIndex = 1;
            dailySession.selectedAnswer =
              null;
            dailySession.answered = false;
            dailySession.answerCorrect =
              false;

            appApi?.renderApp?.();
            return;
          }

          if (
            dailySession.questionIndex === 1
          ) {
            dailySession.phase =
              SESSION_PHASES.REFLECTION;

            dailySession.selectedAnswer =
              null;
            dailySession.answered = false;
            dailySession.answerCorrect =
              false;

            appApi?.renderApp?.();
          }
        };
    }

    const reflectionDoneButton =
      wrap.querySelector(
        "[data-daily-reflection-done]"
      );

    if (reflectionDoneButton) {
      reflectionDoneButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            !dailySession ||
            dailySession.phase !==
              SESSION_PHASES.REFLECTION ||
            dailySession.completionRecorded
          ) {
            return;
          }

          const completedProgress =
            markSessionCompleted(
              dailySession.verseId
            );

          if (!completedProgress) {
            console.warn(
              "Could not complete Daily Question session"
            );
            return;
          }

          dailySession.completionRecorded =
            true;

          dailySession.phase =
            SESSION_PHASES.REWARD_INTRO;

          appApi?.renderApp?.();
        };
    }

    const checkVerseButton =
      wrap.querySelector(
        "[data-daily-check-verse]"
      );

    if (checkVerseButton) {
      checkVerseButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (!dailySession) {
            return;
          }

          dailySession.usedVerseHelp =
            true;

          dailySession.phase =
            SESSION_PHASES.VERSE;

          appApi?.renderApp?.();
        };
    }

    const verseBackButton =
      wrap.querySelector(
        "[data-daily-verse-back]"
      );

    if (verseBackButton) {
      verseBackButton.onclick =
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            !dailySession ||
            dailySession.verseAudioPlaying
          ) {
            return;
          }

          dailySession.phase =
            SESSION_PHASES.QUESTION;

          appApi?.renderApp?.();
        };
    }

    const verseListenButton =
      wrap.querySelector(
        "[data-daily-verse-listen]"
      );

    if (verseListenButton) {
      verseListenButton.onclick =
        async (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            !dailySession ||
            dailySession.phase !==
              SESSION_PHASES.VERSE ||
            dailySession.verseAudioPlaying
          ) {
            return;
          }

          const playVerseAudio =
            window.playVerseDetailListen;

          if (
            typeof playVerseAudio !==
              "function"
          ) {
            console.warn(
              "Daily Question verse audio is unavailable"
            );
            return;
          }

          const verseId =
            dailySession.verseId;

          dailySession.verseAudioPlaying =
            true;

          appApi?.renderApp?.();

          try {
            await playVerseAudio(
              verseId
            );
          } finally {
            if (
              dailySession &&
              dailySession.verseId ===
                verseId
            ) {
              dailySession.verseAudioPlaying =
                false;

              if (
                dailySession.phase ===
                  SESSION_PHASES.VERSE
              ) {
                appApi?.renderApp?.();
              }
            }
          }
        };
    }

    return appApi.makeSlide({
      idx,
      bg: "var(--purple)",
      navHidden: true,
      inner: wrap
    });
  }

  function markSessionCompleted(
    verseId,
    date = new Date()
  ) {
    if (!isFeatureEnabled()) {
      return null;
    }

    const cleanVerseId =
      String(verseId || "").trim();

    if (
      !cleanVerseId ||
      !isAllowedVerseId(cleanVerseId)
    ) {
      return null;
    }

    const safeDate =
      date instanceof Date &&
        !Number.isNaN(date.getTime())
        ? date
        : new Date();

    const completedAt =
      safeDate.getTime();

    const updateDailyProgress =
      appApi?.updateDailyProgress;

    if (
      typeof updateDailyProgress !==
      "function"
    ) {
      return null;
    }

    const updatedProgress =
      updateDailyProgress(
        (dailyQuestions) => {
          dailyQuestions.lastCompletedDay =
            getLocalDayKey(safeDate);

          dailyQuestions.lastCompletedAt =
            completedAt;

          dailyQuestions.lastVerseId =
            cleanVerseId;

          if (
            !dailyQuestions.byVerse ||
            typeof dailyQuestions.byVerse !==
            "object" ||
            Array.isArray(
              dailyQuestions.byVerse
            )
          ) {
            dailyQuestions.byVerse = {};
          }

          const verseProgress =
            normalizeDailyVerseProgress(
              dailyQuestions.byVerse[
              cleanVerseId
              ]
            );

          verseProgress.lastAskedAt =
            completedAt;

          verseProgress.sessionsCompleted +=
            1;

          dailyQuestions.byVerse[
            cleanVerseId
          ] = verseProgress;
        }
      );

    clearPendingOffer();

    return updatedProgress;
  }

  window.BibloZooDailyQuestions =
    Object.freeze({
      version: MODULE_VERSION,
      initialize,
      isFeatureEnabled,
      isDebugEnabled,
      getAllowedVerseIds,
      isAllowedVerseId,
      normalizeReflection,
      getLocalDayKey,
      createDefaultDailyProgress,
      normalizeDailyProgress,
      getEligibleVerses,
      chooseDailyQuestionVerse,
      hasCompletedToday,
      prepareForcedDebugOffer,
      shouldOfferToday,
      prepareStartupOffer,
      getPendingOffer,
      getAcceptedOffer,
      acceptPendingOffer,
      dismissPendingOffer,
      clearPendingOffer,
      clearOfferState,
      renderTitleOffer,
      bindTitleOffer,
      renderScreen,
      markSessionCompleted
    });


})();