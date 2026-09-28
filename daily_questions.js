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

  const DAILY_QUESTION_COLOR_IDS =
    Object.freeze([
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple"
    ]);

  // Use the same six colors as the Daily Question answer buttons.
  const DAILY_QUESTION_BACKGROUND_COLORS =
    Object.freeze({
      red: "#ff5a51",
      orange: "#ffa351",
      yellow: "#ffc751",
      green: "#a7cb6f",
      blue: "#40b9c5",
      purple: "#7f66c6"
    });

  /*
    Any verse with valid Daily Question reflection data may
    participate. Pet-unlock and daily-progress rules are
    handled separately by getEligibleVerses().
  */

  let appApi = null;
  let pendingOffer = null;

  let acceptedOffer = null;

  const SESSION_PHASES = Object.freeze({
    QUESTION: "question",
    VERSE: "verse",
    REFLECTION: "reflection",
    REWARD_GAME: "reward_game"
  });

  let dailySession = null;
  let feedGameStartRafId = 0;
  let questionPageTransition = false;

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

  function isDebugLongPressEnabled() {
    return (
      appApi?.isDebugLongPressEnabled?.() === true
    );
  }

  function getAllowedVerseIds() {
    const verseList =
      appApi?.getVerseList?.();

    if (!Array.isArray(verseList)) {
      return [];
    }

    return verseList
      .map((verse) =>
        String(
          verse?.id || ""
        ).trim()
      )
      .filter(Boolean);
  }

  function isAllowedVerseId(verseId) {
    const cleanVerseId =
      String(verseId || "").trim();

    if (!cleanVerseId) {
      return false;
    }

    return getAllowedVerseIds()
      .includes(cleanVerseId);
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

  function createRandomQuestionColor() {
    return (
      DAILY_QUESTION_COLOR_IDS[
        Math.floor(
          Math.random() *
          DAILY_QUESTION_COLOR_IDS.length
        )
      ] || "purple"
    );
  }

  function getSessionQuestionColor(
    session
  ) {
    const color =
      String(
        session?.questionColor || ""
      ).trim();

    if (
      DAILY_QUESTION_COLOR_IDS
        .includes(color)
    ) {
      return color;
    }

    const randomColor =
      createRandomQuestionColor();

    if (session) {
      session.questionColor =
        randomColor;
    }

    return randomColor;
  }

  function createShuffledChoiceOrder() {
    const order = [0, 1, 2];

    for (
      let index = order.length - 1;
      index > 0;
      index -= 1
    ) {
      const swapIndex =
        Math.floor(
          Math.random() *
          (index + 1)
        );

      [
        order[index],
        order[swapIndex]
      ] = [
        order[swapIndex],
        order[index]
      ];
    }

    return order;
  }

  function getSessionChoiceOrder(
    session
  ) {
    const order =
      session?.choiceOrder;

    const isValidOrder =
      Array.isArray(order) &&
      order.length === 3 &&
      new Set(order).size === 3 &&
      order.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index <= 2
      );

    if (isValidOrder) {
      return order;
    }

    const shuffledOrder =
      createShuffledChoiceOrder();

    if (session) {
      session.choiceOrder =
        shuffledOrder;
    }

    return shuffledOrder;
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

        if (!verseId) {
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

  function prepareForcedDebugOffer(
    selectedVerseId
  ) {
    if (
      !isFeatureEnabled() ||
      !isDebugLongPressEnabled()
    ) {
      return null;
    }

    pendingOffer = null;
    acceptedOffer = null;

    const verseId =
      String(
        selectedVerseId || ""
      ).trim();

    const verseList =
      appApi?.getVerseList?.();

    if (
      !verseId ||
      !Array.isArray(verseList)
    ) {
      return null;
    }

    const verse =
      verseList.find(
        (item) =>
          String(
            item?.id || ""
          ).trim() === verseId
      );

    if (!verse) {
      return null;
    }

    const reflection =
      normalizeReflection(
        verse.reflection
      );

    if (!reflection) {
      return null;
    }

    // Debug testing deliberately does not require an unlocked pet.
    // The normal daily offer still uses getEligibleVerses().
    pendingOffer = {
      verseId,
      verse: {
        ...verse,
        id: verseId,
        reflection
      },
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
        localStorage.getItem(
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
        localStorage.setItem(
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
      questionColor:
        createRandomQuestionColor(),
      choiceOrder:
        createShuffledChoiceOrder(),
      selectedAnswer: null,
      answered: false,
      answerCorrect: false,
      usedVerseHelp: false,
      verseAudioPlaying: false,
      completionRecorded: false,
      debugForced:
        offer?.debugForced === true,
      snack: "",
      rewardScore: 0,
      rewardCaught: 0,
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
    stopDailySessionRuntime();

    pendingOffer = null;
    acceptedOffer = null;
    dailySession = null;
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
    stopDailySessionRuntime();

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

  function stopDailySessionRuntime() {
    if (feedGameStartRafId) {
      cancelAnimationFrame(feedGameStartRafId);
      feedGameStartRafId = 0;
    }

    window.BibloZooDailyFeedGame
      ?.stop?.();

    appApi?.stopDailyAudio?.();

    if (dailySession) {
      dailySession.verseAudioPlaying =
        false;
    }
  }

  async function requestRewardTiltPermission() {
    const OrientationEvent =
      window.DeviceOrientationEvent;

    if (!OrientationEvent) {
      return false;
    }

    if (
      typeof OrientationEvent
        .requestPermission ===
        "function"
    ) {
      try {
        const permission =
          await OrientationEvent
            .requestPermission();

        return (
          permission === "granted"
        );
      } catch (err) {
        console.warn(
          "Daily Question motion permission was unavailable",
          err
        );

        return false;
      }
    }

    return true;
  }

  function getDailyQuestionPaddingPx(
    element,
    axis
  ) {
    if (!element) return 0;

    const styles =
      window.getComputedStyle(
        element
      );

    if (axis === "horizontal") {
      return (
        (parseFloat(
          styles.paddingLeft
        ) || 0) +
        (parseFloat(
          styles.paddingRight
        ) || 0)
      );
    }

    return (
      (parseFloat(
        styles.paddingTop
      ) || 0) +
      (parseFloat(
        styles.paddingBottom
      ) || 0)
    );
  }

  function getDailyQuestionFitLineHeight(
    textLength,
    stageRatio
  ) {
    if (stageRatio > 1.35) {
      if (textLength <= 90) {
        return 1.10;
      }

      if (textLength <= 190) {
        return 1.08;
      }

      return 1.05;
    }

    if (textLength <= 80) {
      return 1.18;
    }

    if (textLength <= 170) {
      return 1.12;
    }

    return 1.06;
  }

  function getDailyQuestionFitWidthRatio(
    textLength,
    stageRatio
  ) {
    if (stageRatio > 1.35) {
      return 0.96;
    }

    if (stageRatio > 1.05) {
      return 0.93;
    }

    if (textLength <= 80) {
      return 0.92;
    }

    return 0.98;
  }

  function getDailyQuestionFitMaxFontSize(
    textLength,
    stageRatio
  ) {
    if (stageRatio > 1.35) {
      if (textLength <= 70) {
        return 64;
      }

      if (textLength <= 140) {
        return 58;
      }

      if (textLength <= 240) {
        return 50;
      }

      return 42;
    }

    if (stageRatio > 1.05) {
      if (textLength <= 70) {
        return 74;
      }

      if (textLength <= 140) {
        return 66;
      }

      if (textLength <= 240) {
        return 56;
      }

      return 46;
    }

    if (textLength > 220) {
      return 62;
    }

    if (textLength > 140) {
      return 74;
    }

    return 96;
  }

  function fitDailyQuestionVerseHelp(
    root
  ) {
    const block =
      root?.querySelector?.(
        "[data-daily-verse-fit]"
      );

    const card =
      block?.closest?.(
        ".daily-question-verse-card"
      );

    const verseText =
      block?.querySelector?.(
        ".daily-question-verse-text"
      );

    if (
      !block ||
      !card ||
      !verseText
    ) {
      return;
    }

    const cardWidth =
      card.clientWidth;

    const cardHeight =
      card.clientHeight;

    if (
      cardWidth <= 0 ||
      cardHeight <= 0
    ) {
      return;
    }

    const contentWidth =
      Math.max(
        120,
        cardWidth -
          getDailyQuestionPaddingPx(
            card,
            "horizontal"
          )
      );

    const contentHeight =
      Math.max(
        120,
        cardHeight -
          getDailyQuestionPaddingPx(
            card,
            "vertical"
          )
      );

    const textLength =
      String(
        verseText.textContent || ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .length;

    const stageRatio =
      contentWidth /
      contentHeight;

    const lineHeight =
      getDailyQuestionFitLineHeight(
        textLength,
        stageRatio
      );

    const widthRatio =
      getDailyQuestionFitWidthRatio(
        textLength,
        stageRatio
      );

    const targetWidth =
      Math.floor(
        contentWidth *
        widthRatio
      );

    block.style.width =
      `${targetWidth}px`;

    block.style.maxWidth =
      `${targetWidth}px`;

    block.style.setProperty(
      "--daily-verse-fit-line-height",
      String(lineHeight)
    );

    let low = 18;
    let high =
      getDailyQuestionFitMaxFontSize(
        textLength,
        stageRatio
      );

    let best = low;

    for (
      let index = 0;
      index < 10;
      index += 1
    ) {
      const mid =
        (low + high) / 2;

      block.style.setProperty(
        "--daily-verse-fit-size",
        `${mid}px`
      );

      block.style.setProperty(
        "--daily-verse-ref-fit-size",
        `${Math.max(
          22,
          mid * 0.80
        )}px`
      );

      const fits =
        block.scrollHeight <=
          contentHeight &&
        block.scrollWidth <=
          contentWidth;

      if (fits) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    block.style.setProperty(
      "--daily-verse-fit-size",
      `${Math.floor(best)}px`
    );

    block.style.setProperty(
      "--daily-verse-ref-fit-size",
      `${Math.floor(
        Math.max(
          22,
          best * 0.80
        )
      )}px`
    );
  }

  function fitDailyQuestionReflection(
    root
  ) {
    const prompt =
      root?.querySelector?.(
        "[data-daily-reflection-fit]"
      );

    const body =
      prompt?.closest?.(
        ".daily-question-reflection-body"
      );

    if (
      !prompt ||
      !body
    ) {
      return;
    }

    // On short phones the reflection card grows naturally; no height-fitting
    // is needed (or wanted) once the entire page can scroll.
    if (window.matchMedia?.("(max-height: 740px) and (max-width: 699px)")?.matches) {
      prompt.style.removeProperty("--daily-reflection-fit-size");
      prompt.style.removeProperty("width");
      prompt.style.removeProperty("max-width");
      return;
    }

    const bodyWidth =
      body.clientWidth;

    const bodyHeight =
      body.clientHeight;

    if (
      bodyWidth <= 0 ||
      bodyHeight <= 0
    ) {
      return;
    }

    const contentWidth =
      Math.max(
        120,
        bodyWidth -
          getDailyQuestionPaddingPx(
            body,
            "horizontal"
          )
      );

    const contentHeight =
      Math.max(
        80,
        bodyHeight -
          getDailyQuestionPaddingPx(
            body,
            "vertical"
          )
      );

    const textLength =
      String(
        prompt.textContent || ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .length;

    const stageRatio =
      contentWidth /
      contentHeight;

    const targetWidth =
      Math.floor(
        contentWidth * 0.98
      );

    prompt.style.width =
      `${targetWidth}px`;

    prompt.style.maxWidth =
      `${targetWidth}px`;

    const lineHeight =
      textLength <= 100
        ? 1.13
        : (
          textLength <= 170
            ? 1.09
            : 1.06
        );

    prompt.style.setProperty(
      "--daily-reflection-fit-line-height",
      String(lineHeight)
    );

    let high;

    if (stageRatio > 1.35) {
      high =
        textLength <= 90
          ? 52
          : (
            textLength <= 150
              ? 46
              : 40
          );
    } else {
      high =
        textLength <= 90
          ? 62
          : (
            textLength <= 150
              ? 54
              : 46
          );
    }

    let low = 20;
    let best = low;

    for (
      let index = 0;
      index < 10;
      index += 1
    ) {
      const mid =
        (low + high) / 2;

      prompt.style.setProperty(
        "--daily-reflection-fit-size",
        `${mid}px`
      );

      const fits =
        prompt.scrollHeight <=
          contentHeight &&
        prompt.scrollWidth <=
          contentWidth;

      if (fits) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    prompt.style.setProperty(
      "--daily-reflection-fit-size",
      `${Math.floor(best)}px`
    );
  }

  function scheduleDailyQuestionTextFit(
    root
  ) {
    const run =
      () => {
        if (
          !root ||
          !root.isConnected
        ) {
          return;
        }

        fitDailyQuestionVerseHelp(
          root
        );

        fitDailyQuestionReflection(
          root
        );
      };

    requestAnimationFrame(
      run
    );

    setTimeout(
      run,
      120
    );

    setTimeout(
      run,
      420
    );

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(run)
        .catch(() => { });
    }
  }

  async function transitionQuestionPage(wrap, advance) {
    if (questionPageTransition || !wrap.isConnected) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof wrap.animate !== "function"
    ) {
      advance();
      return;
    }

    const sessionAtStart = dailySession;
    const overlay = document.createElement("div");
    overlay.className = "daily-question-page-transition";
    overlay.style.backgroundColor = getComputedStyle(wrap).backgroundColor;
    overlay.setAttribute("aria-hidden", "true");

    questionPageTransition = true;
    const wasInert = wrap.inert;
    wrap.inert = true;
    let nextWrap = null;

    try {
      document.body.appendChild(overlay);
      await overlay.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 225, easing: "ease-in", fill: "forwards" }
      ).finished;

      if (dailySession !== sessionAtStart || !wrap.isConnected) return;

      // Replace the page only after the overlay is completely opaque.
      advance();
      nextWrap = document.querySelector(".daily-question-session");
      if (nextWrap) nextWrap.inert = true;
      await new Promise((resolve) => setTimeout(resolve, 75));

      await overlay.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 275, easing: "ease-out", fill: "forwards" }
      ).finished;
    } catch (error) {
      console.warn("Daily Question page transition interrupted", error);
    } finally {
      overlay.remove();
      wrap.inert = wasInert;
      if (nextWrap) nextWrap.inert = false;
      questionPageTransition = false;
    }
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

    // Keep one chosen color for Recall, Meaning, and Application.
    const useQuestionColor =
      !!session &&
      (
        session.phase === SESSION_PHASES.QUESTION ||
        session.phase === SESSION_PHASES.REFLECTION
      );

    const screenBg = useQuestionColor
      ? (
        DAILY_QUESTION_BACKGROUND_COLORS[
          getSessionQuestionColor(session)
        ] || "var(--purple)"
      )
      : "var(--purple)";

    wrap.style.backgroundColor = screenBg;
    wrap.style.setProperty("--daily-question-screen-bg", screenBg);

    const homeButtonHtml =
      typeof appApi
        ?.titleHomePillHtml ===
        "function"
        ? appApi.titleHomePillHtml(
          "Back to My Zoo"
        )
        : "";

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
          data-daily-question-color="${escapeHtml(
            getSessionQuestionColor(
              session
            )
          )}"
          data-daily-verse-shell
        >
          <div
            class="daily-question-verse-card"
          >
            <button
              class="daily-question-verse-close no-zoom"
              type="button"
              data-daily-verse-close
              aria-label="Back to the Question"
            >
              ×
            </button>

            <div
              class="daily-question-verse-content"
              data-daily-verse-fit
            >
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
            </div>
          </div>

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
          data-daily-question-color="${escapeHtml(
            getSessionQuestionColor(
              session
            )
          )}"
        >
          ${homeButtonHtml}

          <div
            class="daily-question-reflection-pet"
          >
            ${profilePictureHtml}

            <div
              class="daily-question-reflection-title"
            >
              Something to chew on...
            </div>
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
              class="daily-question-reflection-body"
            >
              <div
                class="daily-question-reflection-prompt"
                data-daily-reflection-fit
              >
                ${escapeHtml(
                  applicationPrompt
                )}
              </div>
            </div>
          </div>

          <div
            class="daily-question-help-spacer"
            aria-hidden="true"
          ></div>

          <div
            class="daily-question-action-slot"
          >
            <button
              class="daily-question-reflection-done no-zoom"
              type="button"
              data-daily-reflection-done
            >
              Snack time!
            </button>
          </div>
        </div>
      `;
    } else if (
      session.phase ===
        SESSION_PHASES.REWARD_GAME
    ) {
      wrap.classList.add(
        "is-feed-game"
      );

      const profilePictureHtml =
        typeof appApi
          ?.profilePictureHtml ===
          "function"
          ? appApi.profilePictureHtml(
            session.verseId,
            {
              className:
                "daily-feed-pet-avatar",
              alt: ""
            }
          )
          : "";

      const feedGame =
        window.BibloZooDailyFeedGame;

      wrap.innerHTML =
        typeof feedGame?.render ===
        "function"
          ? feedGame.render({
            session,
            profilePictureHtml
          })
          : `
            <div
              class="daily-question-session-empty"
            >
              <div
                class="daily-question-session-empty-title"
              >
                Feeding game unavailable
              </div>
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

        const choiceOrder =
          getSessionChoiceOrder(
            session
          );

        const choiceButtons =
          choiceOrder
            .map(
              (choiceIndex) => {
                const choice =
                  question.choices[
                    choiceIndex
                  ];

                const isSelected =
                  session.selectedAnswer ===
                  choiceIndex;

                const isCorrectChoice =
                  session.answered &&
                  choiceIndex ===
                    question.answer;

                const isIncorrectSelected =
                  session.answered &&
                  isSelected &&
                  choiceIndex !==
                    question.answer;

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
                    data-daily-question-choice="${choiceIndex}"
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
            data-daily-question-color="${escapeHtml(
              getSessionQuestionColor(
                session
              )
            )}"
            data-daily-question-number="${questionNumber}"
          >
            ${homeButtonHtml}

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
                class="daily-question-card-body"
              >
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
              </div>
            </div>

            <div
              class="daily-question-help${
                session.answered
                  ? " is-hidden"
                  : ""
              }"
            >
              <div
                class="daily-question-help-label"
              >
                Not sure?
              </div>
            </div>

            <div
              class="daily-question-action-slot"
            >
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
                  : `
                    <button
                      class="daily-question-check-verse no-zoom"
                      type="button"
                      data-daily-check-verse
                    >
                      Check the Verse
                    </button>
                  `
              }
            </div>
          </div>
        `;
      }
    }

    wrap
      .querySelectorAll(
        "[data-daily-session-back], [data-home-pill]"
      )
      .forEach((backButton) => {
        backButton.onclick =
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            clearSessionState();

            appApi?.goToTitle?.();
          };
      });

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
            questionPageTransition ||
            dailySession.phase !==
              SESSION_PHASES.QUESTION ||
            !dailySession.answered
          ) {
            return;
          }

          if (
            dailySession.questionIndex === 0
          ) {
            void transitionQuestionPage(wrap, () => {
              dailySession.questionIndex = 1;
              dailySession.choiceOrder =
                createShuffledChoiceOrder();
              dailySession.selectedAnswer =
                null;
              dailySession.answered = false;
              dailySession.answerCorrect =
                false;

              appApi?.renderApp?.();
            });
            return;
          }

          if (
            dailySession.questionIndex === 1
          ) {
            void transitionQuestionPage(wrap, () => {
              dailySession.phase =
                SESSION_PHASES.REFLECTION;

              dailySession.selectedAnswer =
                null;
              dailySession.answered = false;
              dailySession.answerCorrect =
                false;

              appApi?.renderApp?.();
            });
          }
        };
    }

    const reflectionDoneButton =
      wrap.querySelector(
        "[data-daily-reflection-done]"
      );

    if (reflectionDoneButton) {
      reflectionDoneButton.onclick =
        async (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            !dailySession ||
            dailySession.phase !==
              SESSION_PHASES.REFLECTION
          ) {
            return;
          }

          const sessionAtStart =
            dailySession;

          window.BibloZooDailyFeedGame
            ?.prepareAudio?.();

          reflectionDoneButton.disabled =
            true;

          const tiltEnabled =
            await requestRewardTiltPermission();

          if (
            dailySession !==
              sessionAtStart ||
            sessionAtStart.phase !==
              SESSION_PHASES.REFLECTION
          ) {
            return;
          }

          sessionAtStart
            .rewardTiltEnabled =
              tiltEnabled;

          sessionAtStart.rewardScore =
            0;

          sessionAtStart.rewardCaught =
            0;

          sessionAtStart.rewardComplete =
            false;

          sessionAtStart.phase =
            SESSION_PHASES.REWARD_GAME;

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

    const closeVerseHelp =
      (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        if (
          !dailySession ||
          dailySession.phase !==
            SESSION_PHASES.VERSE
        ) {
          return;
        }

        appApi?.stopDailyAudio?.();

        dailySession.verseAudioPlaying =
          false;

        dailySession.phase =
          SESSION_PHASES.QUESTION;

        appApi?.renderApp?.();
      };

    const verseCloseButton =
      wrap.querySelector(
        "[data-daily-verse-close]"
      );

    if (verseCloseButton) {
      verseCloseButton.onclick =
        closeVerseHelp;
    }

    const verseShell =
      wrap.querySelector(
        "[data-daily-verse-shell]"
      );

    if (verseShell) {
      verseShell.onclick =
        (event) => {
          if (
            event.target !==
            verseShell
          ) {
            return;
          }

          closeVerseHelp(
            event
          );
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

    if (
      session?.phase ===
        SESSION_PHASES.REWARD_GAME
    ) {
      if (feedGameStartRafId) {
        cancelAnimationFrame(
          feedGameStartRafId
        );
      }

      feedGameStartRafId =
        requestAnimationFrame(
          () => {
            feedGameStartRafId = 0;

            if (
              wrap.isConnected &&
              dailySession === session &&
              dailySession.phase ===
                SESSION_PHASES.REWARD_GAME
            ) {
              const feedGame =
                window.BibloZooDailyFeedGame;

              if (
                typeof feedGame?.start !==
                "function"
              ) {
                console.warn(
                  "Daily feeding game is unavailable"
                );
                return;
              }

              feedGame.start(
                wrap,
                {
                  session,
                  onComplete:
                    (result = {}) => {
                      if (
                        !dailySession ||
                        dailySession !==
                          session ||
                        dailySession.phase !==
                          SESSION_PHASES.REWARD_GAME
                      ) {
                        return;
                      }

                      dailySession.rewardScore =
                        Math.max(
                          0,
                          Number(
                            result.score
                          ) || 0
                        );

                      dailySession.rewardCaught =
                        Math.max(
                          0,
                          Number(
                            result.caughtCount
                          ) || 0
                        );

                      dailySession.rewardComplete =
                        true;
                    },
                  onBackToZoo:
                    () => {
                      if (
                        !dailySession ||
                        dailySession !==
                          session ||
                        !dailySession.rewardComplete
                      ) {
                        return false;
                      }

                      if (
                        !dailySession.debugForced &&
                        !dailySession.completionRecorded
                      ) {
                        const completedProgress =
                          markSessionCompleted(
                            dailySession.verseId
                          );

                        if (!completedProgress) {
                          console.warn(
                            "Could not complete Daily Question session"
                          );

                          return false;
                        }

                        dailySession.completionRecorded =
                          true;
                      }

                      clearSessionState();

                      appApi?.goToTitle?.();

                      return true;
                    }
                }
              );
            }
          }
        );
    } else {
      if (feedGameStartRafId) {
        cancelAnimationFrame(feedGameStartRafId);
        feedGameStartRafId = 0;
      }

      window.BibloZooDailyFeedGame
        ?.stop?.();
    }

    // A non-interactive bottom fade appears only while more of the question
    // or application screen remains below the visible scroll area.
    if (
      session?.phase === SESSION_PHASES.QUESTION ||
      session?.phase === SESSION_PHASES.REFLECTION
    ) {
      const scrollCue = document.createElement("div");
      scrollCue.className = "daily-question-scroll-cue";
      scrollCue.setAttribute("aria-hidden", "true");
      wrap.appendChild(scrollCue);

      const updateScrollCue = () => {
        if (!wrap.isConnected) return;
        const remaining =
          wrap.scrollHeight - wrap.clientHeight - wrap.scrollTop;
        scrollCue.classList.toggle("is-visible", remaining > 16);
      };

      wrap.addEventListener("scroll", updateScrollCue, { passive: true });
      requestAnimationFrame(updateScrollCue);
      setTimeout(updateScrollCue, 160);
      document.fonts?.ready?.then(updateScrollCue).catch(() => {});
    }

    if (
      session?.phase ===
        SESSION_PHASES.VERSE ||
      session?.phase ===
        SESSION_PHASES.REFLECTION
    ) {
      scheduleDailyQuestionTextFit(
        wrap
      );
    }

    return appApi.makeSlide({
      idx,
      bg: screenBg,
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
      isDebugLongPressEnabled,
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