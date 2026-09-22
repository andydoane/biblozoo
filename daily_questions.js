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
  let rewardGameRuntime = null;
  let rewardGameStartRafId = 0;

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

  function stopRewardGame() {
    if (rewardGameStartRafId) {
      cancelAnimationFrame(
        rewardGameStartRafId
      );

      rewardGameStartRafId = 0;
    }

    const runtime =
      rewardGameRuntime;

    if (!runtime) {
      return;
    }

    rewardGameRuntime = null;
    runtime.running = false;

    if (runtime.orientationHandler) {
      window.removeEventListener(
        "deviceorientation",
        runtime.orientationHandler
      );

      runtime.orientationHandler = null;
    }

    if (runtime.stage) {
      if (runtime.pointerDownHandler) {
        runtime.stage.removeEventListener(
          "pointerdown",
          runtime.pointerDownHandler
        );
      }

      if (runtime.pointerMoveHandler) {
        runtime.stage.removeEventListener(
          "pointermove",
          runtime.pointerMoveHandler
        );
      }

      if (runtime.pointerEndHandler) {
        runtime.stage.removeEventListener(
          "pointerup",
          runtime.pointerEndHandler
        );

        runtime.stage.removeEventListener(
          "pointercancel",
          runtime.pointerEndHandler
        );
      }

      if (
        Number.isInteger(
          runtime.activePointerId
        )
      ) {
        try {
          runtime.stage.releasePointerCapture(
            runtime.activePointerId
          );
        } catch (err) { }
      }
    }

    runtime.pointerDownHandler = null;
    runtime.pointerMoveHandler = null;
    runtime.pointerEndHandler = null;
    runtime.activePointerId = null;
    runtime.dragging = false;

    if (runtime.rafId) {
      cancelAnimationFrame(
        runtime.rafId
      );

      runtime.rafId = 0;
    }
  }

  function stopDailySessionRuntime() {
    window.BibloZooDailyFeedGame
      ?.stop?.();

    stopRewardGame();

    appApi?.stopDailyAudio?.();

    if (dailySession) {
      dailySession.verseAudioPlaying =
        false;
    }
  }

  function createRewardGamePegs(
    width,
    height
  ) {
    const pegs = [];
    const rows = 6;
    const spacing =
      width / 6;

    const topY =
      Math.max(
        62,
        height * 0.15
      );

    const bottomY =
      height * 0.68;

    for (
      let row = 0;
      row < rows;
      row += 1
    ) {
      const isOffsetRow =
        row % 2 === 1;

      const columns =
        isOffsetRow ? 4 : 5;

      const y =
        topY +
        (
          (bottomY - topY) *
          row /
          (rows - 1)
        );

      for (
        let column = 0;
        column < columns;
        column += 1
      ) {
        const x =
          spacing *
          (
            column +
            1 +
            (isOffsetRow ? 0.5 : 0)
          );

        pegs.push({
          x,
          y,
          radius:
            Math.max(
              5,
              Math.min(
                8,
                width * 0.018
              )
            )
        });
      }
    }

    return pegs;
  }

  function setRewardCatcherX(
    runtime,
    nextX
  ) {
    if (!runtime) {
      return;
    }

    const halfWidth =
      runtime.catcherWidth / 2;

    const safeX =
      Math.max(
        halfWidth,
        Math.min(
          runtime.width - halfWidth,
          Number(nextX) ||
          runtime.width / 2
        )
      );

    runtime.catcherX = safeX;

    runtime.catcher.style.left =
      `${safeX}px`;
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

  function handleRewardTilt(
    runtime,
    event
  ) {
    if (
      !runtime ||
      !runtime.tiltEnabled ||
      runtime.dragging ||
      rewardGameRuntime !== runtime
    ) {
      return;
    }

    const gamma =
      Number(event?.gamma);

    if (!Number.isFinite(gamma)) {
      return;
    }

    if (
      !Number.isFinite(
        runtime.neutralGamma
      )
    ) {
      runtime.neutralGamma =
        gamma;

      runtime.smoothedTilt = 0;

      return;
    }

    const relativeTilt =
      Math.max(
        -25,
        Math.min(
          25,
          gamma -
          runtime.neutralGamma
        )
      );

    runtime.smoothedTilt =
      runtime.smoothedTilt *
      0.85 +
      relativeTilt *
      0.15;

    const halfWidth =
      runtime.catcherWidth / 2;

    const travel =
      Math.max(
        0,
        runtime.width / 2 -
        halfWidth
      );

    const targetX =
      runtime.width / 2 +
      (
        runtime.smoothedTilt /
        25
      ) *
      travel;

    setRewardCatcherX(
      runtime,
      targetX
    );
  }

  function resetRewardSnack(
    runtime
  ) {
    if (!runtime) {
      return;
    }

    const radius =
      Math.max(
        15,
        Math.min(
          21,
          runtime.width * 0.052
        )
      );

    runtime.snack = {
      x:
        runtime.width *
        (
          0.24 +
          Math.random() * 0.52
        ),
      y: radius + 8,
      vx:
        (
          Math.random() - 0.5
        ) * 42,
      vy: 12,
      radius,
      active: true
    };

    runtime.respawnAt = 0;
  }

  function updateRewardSnackPhysics(
    runtime,
    dt,
    now
  ) {
    if (
      !runtime ||
      runtime.caughtAt
    ) {
      return;
    }

    const snack =
      runtime.snack;

    if (!snack?.active) {
      if (
        runtime.respawnAt &&
        now >= runtime.respawnAt
      ) {
        resetRewardSnack(
          runtime
        );
      }

      return;
    }

    snack.vy =
      Math.min(
        108,
        snack.vy +
        62 * dt
      );

    snack.x +=
      snack.vx * dt;

    snack.y +=
      snack.vy * dt;

    if (
      snack.x - snack.radius < 0
    ) {
      snack.x =
        snack.radius;

      snack.vx =
        Math.abs(
          snack.vx
        ) * 0.72;
    } else if (
      snack.x + snack.radius >
      runtime.width
    ) {
      snack.x =
        runtime.width -
        snack.radius;

      snack.vx =
        -Math.abs(
          snack.vx
        ) * 0.72;
    }

    for (
      const peg of runtime.pegs
    ) {
      const dx =
        snack.x - peg.x;

      const dy =
        snack.y - peg.y;

      const minDistance =
        snack.radius +
        peg.radius;

      const distanceSquared =
        dx * dx +
        dy * dy;

      if (
        distanceSquared >=
        minDistance * minDistance
      ) {
        continue;
      }

      const distance =
        Math.sqrt(
          distanceSquared
        ) || 0.001;

      const nx =
        dx / distance;

      const ny =
        dy / distance;

      const overlap =
        minDistance -
        distance;

      snack.x +=
        nx * overlap;

      snack.y +=
        ny * overlap;

      const velocityAlongNormal =
        snack.vx * nx +
        snack.vy * ny;

      if (
        velocityAlongNormal < 0
      ) {
        const restitution =
          0.68;

        const impulse =
          (
            1 +
            restitution
          ) *
          velocityAlongNormal;

        snack.vx -=
          impulse * nx;

        snack.vy -=
          impulse * ny;

        snack.vx +=
          (
            nx >= 0
              ? 1
              : -1
          ) * 5;
      }
    }

    snack.vx =
      Math.max(
        -125,
        Math.min(
          125,
          snack.vx
        )
      );

    snack.vy =
      Math.max(
        -92,
        Math.min(
          108,
          snack.vy
        )
      );

    const catcherTop =
      runtime.height -
      runtime.catcherHeight -
      8;

    const catchHalfWidth =
      Math.min(
        runtime.width * 0.27,
        Math.max(
          72,
          runtime.catcherWidth *
          0.72
        )
      );

    const reachedCatcher =
      snack.y +
      snack.radius >=
      catcherTop + 4;

    const insideCatchZone =
      Math.abs(
        snack.x -
        runtime.catcherX
      ) <=
      catchHalfWidth +
      snack.radius;

    if (
      reachedCatcher &&
      insideCatchZone &&
      snack.y -
      snack.radius <
      runtime.height
    ) {
      snack.active = false;
      runtime.caughtAt = now;

      runtime.catcher.classList.add(
        "is-catching"
      );

      return;
    }

    if (
      snack.y -
      snack.radius >
      runtime.height
    ) {
      snack.active = false;

      runtime.respawnAt =
        now + 360;
    }
  }

  function drawRewardGame(
    runtime
  ) {
    if (!runtime?.ctx) {
      return;
    }

    const ctx =
      runtime.ctx;

    ctx.setTransform(
      runtime.dpr,
      0,
      0,
      runtime.dpr,
      0,
      0
    );

    ctx.clearRect(
      0,
      0,
      runtime.width,
      runtime.height
    );

    ctx.fillStyle =
      "rgba(255, 255, 255, 0.78)";

    for (
      const peg of runtime.pegs
    ) {
      ctx.beginPath();

      ctx.arc(
        peg.x,
        peg.y,
        peg.radius,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    const snack =
      runtime.snack;

    if (!snack?.active) {
      return;
    }

    ctx.font =
      `${Math.round(
        snack.radius * 2.25
      )}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      runtime.snackEmoji,
      snack.x,
      snack.y
    );
  }

  function finishRewardGame(
    runtime
  ) {
    if (
      rewardGameRuntime !==
      runtime
    ) {
      return;
    }

    stopRewardGame();

    if (
      !dailySession ||
      dailySession !==
        runtime.session ||
      dailySession.phase !==
        SESSION_PHASES.REWARD_GAME
    ) {
      return;
    }

    dailySession.rewardComplete =
      true;

    dailySession.phase =
      SESSION_PHASES.REWARD_DONE;

    appApi?.renderApp?.();
  }

  function runRewardGameFrame(
    runtime,
    now
  ) {
    if (
      !runtime?.running ||
      rewardGameRuntime !==
        runtime
    ) {
      return;
    }

    const elapsed =
      Math.max(
        0.001,
        Math.min(
          0.032,
          (
            now -
            runtime.lastFrameAt
          ) / 1000
        )
      );

    runtime.lastFrameAt = now;

    const substep =
      elapsed / 2;

    updateRewardSnackPhysics(
      runtime,
      substep,
      now
    );

    updateRewardSnackPhysics(
      runtime,
      substep,
      now
    );

    drawRewardGame(
      runtime
    );

    if (
      runtime.caughtAt &&
      now -
      runtime.caughtAt >=
      420
    ) {
      finishRewardGame(
        runtime
      );

      return;
    }

    runtime.rafId =
      requestAnimationFrame(
        (nextNow) => {
          runRewardGameFrame(
            runtime,
            nextNow
          );
        }
      );
  }

  function startRewardGame(
    rootEl
  ) {
    stopRewardGame();

    if (
      !rootEl ||
      !dailySession ||
      dailySession.phase !==
        SESSION_PHASES.REWARD_GAME
    ) {
      return;
    }

    const stage =
      rootEl.querySelector(
        "[data-daily-pachinko-stage]"
      );

    const canvas =
      rootEl.querySelector(
        "[data-daily-pachinko-canvas]"
      );

    const catcher =
      rootEl.querySelector(
        "[data-daily-pachinko-catcher]"
      );

    if (
      !stage ||
      !canvas ||
      !catcher
    ) {
      return;
    }

    const width =
      stage.clientWidth;

    const height =
      stage.clientHeight;

    if (
      width < 80 ||
      height < 180
    ) {
      rewardGameStartRafId =
        requestAnimationFrame(
          () => {
            rewardGameStartRafId = 0;

            if (
              rootEl.isConnected &&
              dailySession?.phase ===
                SESSION_PHASES.REWARD_GAME
            ) {
              startRewardGame(
                rootEl
              );
            }
          }
        );

      return;
    }

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const dpr =
      Math.max(
        1,
        Math.min(
          2,
          window.devicePixelRatio ||
          1
        )
      );

    canvas.width =
      Math.round(
        width * dpr
      );

    canvas.height =
      Math.round(
        height * dpr
      );

    const runtime = {
      running: true,
      rafId: 0,
      lastFrameAt:
        performance.now(),
      width,
      height,
      dpr,
      ctx,
      stage,
      canvas,
      catcher,
      catcherX:
        width / 2,
      catcherWidth:
        Math.max(
          96,
          catcher.offsetWidth
        ),
      catcherHeight:
        Math.max(
          72,
          catcher.offsetHeight
        ),
      dragging: false,
      tiltEnabled:
        dailySession
          .rewardTiltEnabled === true,
      neutralGamma: null,
      smoothedTilt: 0,
      orientationHandler: null,
      activePointerId: null,
      pointerDownHandler: null,
      pointerMoveHandler: null,
      pointerEndHandler: null,
      pegs:
        createRewardGamePegs(
          width,
          height
        ),
      snack: null,
      snackEmoji:
        String(
          dailySession.snack ||
          "🍎"
        ).trim() ||
        "🍎",
      respawnAt: 0,
      caughtAt: 0,
      session:
        dailySession
    };

    rewardGameRuntime =
      runtime;

    if (runtime.tiltEnabled) {
      runtime.orientationHandler =
        (event) => {
          handleRewardTilt(
            runtime,
            event
          );
        };

      window.addEventListener(
        "deviceorientation",
        runtime.orientationHandler
      );
    }

    setRewardCatcherX(
      runtime,
      width / 2
    );

    resetRewardSnack(
      runtime
    );

    const moveCatcher =
      (event) => {
        const rect =
          stage.getBoundingClientRect();

        setRewardCatcherX(
          runtime,
          event.clientX -
          rect.left
        );
      };

    const pointerDownHandler =
      (event) => {
        if (
          rewardGameRuntime !==
          runtime
        ) {
          return;
        }

        event.preventDefault();

        runtime.dragging = true;
        runtime.activePointerId =
          event.pointerId;

        try {
          stage.setPointerCapture(
            event.pointerId
          );
        } catch (err) { }

        moveCatcher(
          event
        );
      };

    const pointerMoveHandler =
      (event) => {
        if (
          !runtime.dragging ||
          rewardGameRuntime !==
            runtime
        ) {
          return;
        }

        event.preventDefault();

        moveCatcher(
          event
        );
      };

    const endDrag =
      (event) => {
        if (
          rewardGameRuntime !==
          runtime
        ) {
          return;
        }

        runtime.dragging = false;

        if (runtime.tiltEnabled) {
          runtime.neutralGamma = null;
          runtime.smoothedTilt = 0;
        }

        try {
          stage.releasePointerCapture(
            event.pointerId
          );
        } catch (err) { }

        runtime.activePointerId = null;
      };

    runtime.pointerDownHandler =
      pointerDownHandler;

    runtime.pointerMoveHandler =
      pointerMoveHandler;

    runtime.pointerEndHandler =
      endDrag;

    stage.addEventListener(
      "pointerdown",
      pointerDownHandler
    );

    stage.addEventListener(
      "pointermove",
      pointerMoveHandler
    );

    stage.addEventListener(
      "pointerup",
      endDrag
    );

    stage.addEventListener(
      "pointercancel",
      endDrag
    );

    drawRewardGame(
      runtime
    );

    runtime.rafId =
      requestAnimationFrame(
        (now) => {
          runRewardGameFrame(
            runtime,
            now
          );
        }
      );
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

      const reflectionPromptClass =
        applicationPrompt.length > 130
          ? " is-long"
          : (
            applicationPrompt.length > 85
              ? " is-medium"
              : ""
          );

      wrap.innerHTML = `
        <div
          class="daily-question-reflection-shell"
          data-daily-session-phase="${escapeHtml(
            session.phase
          )}"
        >
          ${homeButtonHtml}

          <div
            class="daily-question-reflection-pet"
          >
            ${profilePictureHtml}

            <div
              class="daily-question-wonders is-placeholder"
              aria-hidden="true"
            >
              ${escapeHtml(
                `${session.petName} wonders...`
              )}
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
                class="daily-question-reflection-title"
              >
                Something to chew on...
              </div>

              <div
                class="daily-question-reflection-prompt${reflectionPromptClass}"
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
        SESSION_PHASES.REWARD_INTRO
    ) {
      const snack =
        String(
          session.snack || "🍎"
        ).trim() || "🍎";

      wrap.innerHTML = `
        <div
          class="daily-reward-intro-shell"
          data-daily-session-phase="${escapeHtml(
            session.phase
          )}"
        >
          ${homeButtonHtml}

          <div
            class="daily-reward-intro-card"
          >
            <div
              class="daily-reward-intro-title"
            >
              You earned a snack!
            </div>

            <div
              class="daily-reward-intro-snack"
              aria-label="Snack reward"
            >
              ${escapeHtml(
                snack
              )}
            </div>

            <div
              class="daily-reward-intro-instruction"
            >
              Tilt or drag to feed ${escapeHtml(
                session.petName
              )}.
            </div>
          </div>

          <div
            class="daily-reward-intro-actions"
          >
            <button
              class="daily-reward-intro-start no-zoom"
              type="button"
              data-daily-reward-start
            >
              Start Feeding
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
    } else if (
      session.phase ===
        SESSION_PHASES.REWARD_DONE
    ) {
      const profilePictureHtml =
        typeof appApi
          ?.profilePictureHtml ===
          "function"
          ? appApi.profilePictureHtml(
            session.verseId,
            {
              className:
                "daily-reward-done-avatar",
              alt: ""
            }
          )
          : "";

      const rewardScore =
        Math.max(
          0,
          Number(
            session.rewardScore
          ) || 0
        );

      const rewardCaught =
        Math.max(
          0,
          Number(
            session.rewardCaught
          ) || 0
        );

      const rewardCopy =
        window.BibloZooDailyFeedGame
          ?.getResultCopy?.(
            rewardScore,
            rewardCaught,
            session.petName
          ) || {
            chomp:
              rewardCaught > 0
                ? "CHOMP!"
                : "ALL DONE!",
            title: "Nice feeding!",
            message:
              `${session.petName} had fun chasing the snacks!`
          };

      wrap.innerHTML = `
        <div
          class="daily-reward-done-shell"
          data-daily-session-phase="${escapeHtml(
            session.phase
          )}"
        >
          <div
            class="daily-reward-done-card"
            aria-live="polite"
          >
            <div
              class="daily-reward-done-chomp"
            >
              ${escapeHtml(
                rewardCopy.chomp
              )}
            </div>

            <div
              class="daily-reward-done-pet"
              aria-hidden="true"
            >
              ${profilePictureHtml}

              <span
                class="daily-reward-done-sparkle is-left"
              >
                ✨
              </span>

              <span
                class="daily-reward-done-sparkle is-right"
              >
                ✨
              </span>
            </div>

            <div
              class="daily-reward-done-title"
            >
              ${escapeHtml(
                rewardCopy.title
              )}
            </div>

            <div
              class="daily-reward-done-score"
            >
              Score ${rewardScore}
            </div>

            <div
              class="daily-reward-done-count"
            >
              ${escapeHtml(
                session.petName
              )} ate ${rewardCaught}
              ${rewardCaught === 1
                ? "snack"
                : "snacks"}!
            </div>

            <div
              class="daily-reward-done-note"
            >
              ${escapeHtml(
                rewardCopy.message
              )}
            </div>
          </div>

          <button
            class="daily-reward-done-back no-zoom"
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

              <button
                class="daily-question-check-verse no-zoom"
                type="button"
                data-daily-check-verse
              >
                Check the Verse
              </button>
            </div>

            <div
              class="daily-question-action-slot"
            >
              <button
                class="daily-question-feedback-next no-zoom${
                  session.answered
                    ? ""
                    : " is-placeholder"
                }"
                type="button"
                data-daily-question-next
                ${
                  session.answered
                    ? ""
                    : `disabled aria-hidden="true" tabindex="-1"`
                }
              >
                Next
              </button>
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
        async (event) => {
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

          const sessionAtStart =
            dailySession;

          window.BibloZooDailyFeedGame
            ?.prepareAudio?.();

          reflectionDoneButton.disabled =
            true;

          const completedProgress =
            markSessionCompleted(
              sessionAtStart.verseId
            );

          if (!completedProgress) {
            reflectionDoneButton.disabled =
              false;

            console.warn(
              "Could not complete Daily Question session"
            );
            return;
          }

          sessionAtStart.completionRecorded =
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

    const rewardStartButton =
      wrap.querySelector(
        "[data-daily-reward-start]"
      );

    if (rewardStartButton) {
      rewardStartButton.onclick =
        async (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (
            !dailySession ||
            dailySession.phase !==
              SESSION_PHASES.REWARD_INTRO
          ) {
            return;
          }

          const sessionAtStart =
            dailySession;

          window.BibloZooDailyFeedGame
            ?.prepareAudio?.();

          rewardStartButton.disabled =
            true;

          const tiltEnabled =
            await requestRewardTiltPermission();

          if (
            dailySession !==
              sessionAtStart ||
            sessionAtStart.phase !==
              SESSION_PHASES.REWARD_INTRO
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
      if (rewardGameStartRafId) {
        cancelAnimationFrame(
          rewardGameStartRafId
        );
      }

      rewardGameStartRafId =
        requestAnimationFrame(
          () => {
            rewardGameStartRafId = 0;

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
                          session
                      ) {
                        return;
                      }

                      clearSessionState();

                      appApi?.goToTitle?.();
                    }
                }
              );
            }
          }
        );
    } else {
      window.BibloZooDailyFeedGame
        ?.stop?.();

      stopRewardGame();
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