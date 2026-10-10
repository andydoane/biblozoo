(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.BibloZooDailyTodo = api;
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const STATE_VERSION = 3;
  const RECENT_ASSIGNMENT_DAYS = 3;
  const RECENT_ASSIGNMENT_HISTORY_LIMIT = 40;
  const RECENT_QUESTION_TYPE_HISTORY_LIMIT = 6;
  const LEGACY_FLASHCARD_TASK_ID = "flashcard";
  const NEW_PET_MISSION_AUTOMATIC_CREATION_ENABLED = true;
  const NEW_PET_MISSION_RULES = Object.freeze({
    minimumAgeDays: 3,
    normalAccomplishments: 5,
    relaxedAgeDays: 7,
    relaxedAccomplishments: 3
  });

  const PLAN_KINDS = Object.freeze({
    CARE: "care",
    NEW_PET: "new_pet"
  });

  const STREAK_BADGE_THRESHOLDS = Object.freeze([
    3, 7, 14, 28, 50, 100, 200, 300, 365
  ]);
  const TASK_BADGE_THRESHOLDS = Object.freeze([
    10, 25, 50, 100, 200, 300, 400,
    500, 600, 700, 800, 900, 1000
  ]);
  const BADGE_DEFINITIONS = Object.freeze({
    streak: Object.freeze(
      STREAK_BADGE_THRESHOLDS.map(
        (threshold) => Object.freeze({
          id: `streak-${threshold}`,
          type: "streak",
          threshold,
          label: `${threshold} Day Streak`,
          asset: `streak_${threshold}.png`
        })
      )
    ),
    tasks: Object.freeze(
      TASK_BADGE_THRESHOLDS.map(
        (threshold) => Object.freeze({
          id: `tasks-${threshold}`,
          type: "tasks",
          threshold,
          label: `${threshold} Tasks`,
          asset: `tasks_${threshold}.png`
        })
      )
    )
  });

  const TASK_IDS = Object.freeze({
    REVIEW: "review",
    QUESTIONS: "questions",
    ACTIVITY: "activity",
    LEARN: "learn"
  });

  const REVIEW_KINDS = Object.freeze({
    FLASHCARD: "flashcard",
    READ: "read"
  });

  const READ_ACTIVITY_IDS = Object.freeze([
    "star_wars",
    "balloons",
    "fish",
    "typewriter",
    "keyboard",
    "unscramble",
    "tap_words_order",
    "chunk_sequence"
  ]);

  const DEFAULT_REQUIRED_TASK_IDS = Object.freeze({
    [PLAN_KINDS.CARE]: Object.freeze([
      TASK_IDS.REVIEW,
      TASK_IDS.QUESTIONS,
      TASK_IDS.ACTIVITY
    ]),
    [PLAN_KINDS.NEW_PET]: Object.freeze([
      TASK_IDS.LEARN,
      TASK_IDS.ACTIVITY
    ])
  });

  const TASK_STATUSES = Object.freeze({
    OPEN: "open",
    RUNNING: "running",
    PENDING: "pending",
    COMPLETE: "complete"
  });

  const ACTIVITY_KINDS = Object.freeze({
    GAME: "game",
    PLAYGROUND: "playground"
  });

  const GAME_MODE_ORDER = Object.freeze([
    "easy",
    "medium",
    "hard"
  ]);

  const PET_STATUS_PRIORITY = Object.freeze({
    sleeping: 0,
    hungry: 1,
    happy: 2
  });

  function isPlainObject(value) {
    return !!value &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function cleanString(value) {
    return String(value || "").trim();
  }

  function normalizePlanKind(value) {
    return Object.values(PLAN_KINDS).includes(value)
      ? value
      : PLAN_KINDS.CARE;
  }

  function normalizeTaskId(value) {
    const taskId = cleanString(value);

    if (taskId === LEGACY_FLASHCARD_TASK_ID) {
      return TASK_IDS.REVIEW;
    }

    return Object.values(TASK_IDS).includes(taskId)
      ? taskId
      : "";
  }

  function normalizeRequiredTaskIds(
    rawTaskIds,
    planKind = PLAN_KINDS.CARE
  ) {
    const kind = normalizePlanKind(planKind);
    const normalized = [];

    if (Array.isArray(rawTaskIds)) {
      rawTaskIds.forEach((value) => {
        const taskId = normalizeTaskId(value);

        if (
          taskId &&
          !normalized.includes(taskId)
        ) {
          normalized.push(taskId);
        }
      });
    }

    return normalized.length
      ? normalized
      : [...DEFAULT_REQUIRED_TASK_IDS[kind]];
  }

  function getRequiredTaskIds(rawPlan) {
    if (!isPlainObject(rawPlan)) return [];

    return normalizeRequiredTaskIds(
      rawPlan.requiredTaskIds,
      rawPlan.kind
    );
  }

  function resolveTaskId(rawPlan, value) {
    const taskId = normalizeTaskId(value);

    return taskId &&
      getRequiredTaskIds(rawPlan).includes(taskId)
      ? taskId
      : "";
  }

  function toNonNegativeInteger(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.floor(number);
  }

  function normalizeEarnedThresholds(
    rawValues,
    thresholds,
    metric
  ) {
    const allowed = new Set(thresholds);
    const earned = new Set(
      Array.isArray(rawValues)
        ? rawValues
            .map(toNonNegativeInteger)
            .filter((value) =>
              allowed.has(value)
            )
        : []
    );
    const safeMetric =
      toNonNegativeInteger(metric);

    thresholds.forEach((threshold) => {
      if (safeMetric >= threshold) {
        earned.add(threshold);
      }
    });

    return thresholds.filter((threshold) =>
      earned.has(threshold)
    );
  }

  function refreshEarnedBadges(stats) {
    if (!stats) return;

    stats.earnedStreakBadges =
      normalizeEarnedThresholds(
        stats.earnedStreakBadges,
        STREAK_BADGE_THRESHOLDS,
        stats.bestStreak
      );
    stats.earnedTaskBadges =
      normalizeEarnedThresholds(
        stats.earnedTaskBadges,
        TASK_BADGE_THRESHOLDS,
        stats.totalTasks
      );
  }

  function toTimestamp(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? number
      : 0;
  }

  function normalizeRandomValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(0.999999999999, Math.max(0, number));
  }

  function randomIndex(length, random = Math.random) {
    if (!Number.isFinite(length) || length <= 1) return 0;
    const value = normalizeRandomValue(random());
    return Math.floor(value * length);
  }

  function normalizeTaskStatus(value) {
    return Object.values(TASK_STATUSES).includes(value)
      ? value
      : TASK_STATUSES.OPEN;
  }

  function createDefaultTask() {
    return {
      status: TASK_STATUSES.OPEN,
      startedAt: 0,
      pendingAt: 0,
      completedAt: 0,
      launchToken: "",
      pendingData: null
    };
  }

  function normalizePendingData(
    rawPendingData,
    taskId
  ) {
    if (!isPlainObject(rawPendingData)) {
      return null;
    }

    const pendingData = cloneJson(
      rawPendingData
    );

    if (pendingData.taskId) {
      pendingData.taskId = taskId;
    }

    return pendingData;
  }

  function normalizeTask(rawTask, taskId = "") {
    const raw = isPlainObject(rawTask)
      ? rawTask
      : {};

    const task = {
      status: normalizeTaskStatus(raw.status),
      startedAt: toTimestamp(raw.startedAt),
      pendingAt: toTimestamp(raw.pendingAt),
      completedAt: toTimestamp(raw.completedAt),
      launchToken: cleanString(raw.launchToken),
      pendingData: normalizePendingData(
        raw.pendingData,
        taskId
      )
    };

    if (task.status === TASK_STATUSES.COMPLETE) {
      task.pendingData = null;
    }

    return task;
  }

  function createDefaultReadActivityHistory() {
    return {
      completedCount: 0,
      lastCompletedAt: 0
    };
  }

  function normalizeReadActivityHistory(rawHistory) {
    const raw = isPlainObject(rawHistory)
      ? rawHistory
      : {};

    return {
      completedCount:
        toNonNegativeInteger(
          raw.completedCount
        ),
      lastCompletedAt:
        toTimestamp(raw.lastCompletedAt)
    };
  }

  function createDefaultVerseHistory() {
    const readActivities = {};

    READ_ACTIVITY_IDS.forEach((activityId) => {
      readActivities[activityId] =
        createDefaultReadActivityHistory();
    });

    return {
      completedDailyTodos: 0,
      questionsCompleted: 0,
      recentGeneratedQuestionTypes: [],
      readActivities
    };
  }

  function normalizeVerseHistory(rawHistory) {
    const raw = isPlainObject(rawHistory)
      ? rawHistory
      : {};
    const rawReadActivities =
      isPlainObject(raw.readActivities)
        ? raw.readActivities
        : {};
    const history = createDefaultVerseHistory();

    history.completedDailyTodos =
      toNonNegativeInteger(
        raw.completedDailyTodos
      );
    history.questionsCompleted =
      toNonNegativeInteger(
        raw.questionsCompleted
      );
    history.recentGeneratedQuestionTypes =
      Array.isArray(
        raw.recentGeneratedQuestionTypes
      )
        ? raw.recentGeneratedQuestionTypes
            .map(cleanString)
            .filter(Boolean)
            .slice(
              -RECENT_QUESTION_TYPE_HISTORY_LIMIT
            )
        : [];

    READ_ACTIVITY_IDS.forEach((activityId) => {
      history.readActivities[activityId] =
        normalizeReadActivityHistory(
          rawReadActivities[activityId]
        );
    });

    return history;
  }

  function normalizeByVerse(rawByVerse) {
    if (!isPlainObject(rawByVerse)) {
      return {};
    }

    return Object.entries(rawByVerse)
      .reduce((result, [verseId, value]) => {
        const safeVerseId = cleanString(verseId);

        if (safeVerseId) {
          result[safeVerseId] =
            normalizeVerseHistory(value);
        }

        return result;
      }, {});
  }

  function getOrCreateVerseHistory(
    state,
    verseId
  ) {
    const safeVerseId = cleanString(verseId);
    if (!state || !safeVerseId) return null;

    if (!isPlainObject(state.byVerse)) {
      state.byVerse = {};
    }

    state.byVerse[safeVerseId] =
      normalizeVerseHistory(
        state.byVerse[safeVerseId]
      );

    return state.byVerse[safeVerseId];
  }

  function getVerseHistory(
    rawState,
    verseId
  ) {
    const state = normalizeState(rawState);
    const safeVerseId = cleanString(verseId);

    return safeVerseId
      ? cloneJson(
          state.byVerse[safeVerseId] ||
          createDefaultVerseHistory()
        )
      : null;
  }

  function chooseReadActivityAssignment({
    activities = [],
    verseHistory = null,
    random = Math.random
  } = {}) {
    const history = normalizeVerseHistory(
      verseHistory
    );
    const eligible = Array.isArray(activities)
      ? activities
          .filter((activity) =>
            activity?.enabled !== false &&
            activity?.eligible !== false &&
            READ_ACTIVITY_IDS.includes(
              cleanString(activity?.id)
            )
          )
          .map((activity) => ({
            id: cleanString(activity.id)
          }))
      : [];

    if (!eligible.length) return null;

    const neverCompleted = eligible.filter(
      (activity) =>
        history.readActivities[
          activity.id
        ]?.completedCount === 0
    );
    const candidates = neverCompleted.length
      ? neverCompleted
      : (() => {
          const oldest = Math.min(
            ...eligible.map((activity) =>
              history.readActivities[
                activity.id
              ]?.lastCompletedAt || 0
            )
          );

          return eligible.filter(
            (activity) =>
              (history.readActivities[
                activity.id
              ]?.lastCompletedAt || 0) ===
              oldest
          );
        })();
    const selected = candidates[
      randomIndex(candidates.length, random)
    ];

    return selected
      ? {
          kind: REVIEW_KINDS.READ,
          activityId: selected.id
        }
      : null;
  }

  function chooseReviewAssignment({
    verseHistory = null,
    activities = [],
    random = Math.random
  } = {}) {
    const history = normalizeVerseHistory(
      verseHistory
    );
    const cadencePosition =
      history.completedDailyTodos % 3;

    if (cadencePosition === 2) {
      return {
        kind: REVIEW_KINDS.FLASHCARD,
        activityId: ""
      };
    }

    return chooseReadActivityAssignment({
      activities,
      verseHistory: history,
      random
    }) || {
      kind: REVIEW_KINDS.FLASHCARD,
      activityId: ""
    };
  }

  function createDefaultStats() {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDay: "",
      totalTasks: 0,
      earnedStreakBadges: [],
      earnedTaskBadges: [],
      recentAssignments: []
    };
  }

  function normalizeRecentAssignment(rawAssignment) {
    if (!isPlainObject(rawAssignment)) return null;

    const day = cleanString(rawAssignment.day);
    const kind = cleanString(rawAssignment.kind);
    const id = cleanString(rawAssignment.id);
    const mode = cleanString(rawAssignment.mode);

    if (!isValidDayKey(day)) return null;
    if (!Object.values(ACTIVITY_KINDS).includes(kind)) return null;
    if (!id) return null;

    return { day, kind, id, mode };
  }

  function normalizeStats(rawStats) {
    const raw = isPlainObject(rawStats)
      ? rawStats
      : {};

    const currentStreak = toNonNegativeInteger(raw.currentStreak);
    const bestStreak = Math.max(
      currentStreak,
      toNonNegativeInteger(raw.bestStreak)
    );

    const recentAssignments = Array.isArray(raw.recentAssignments)
      ? raw.recentAssignments
          .map(normalizeRecentAssignment)
          .filter(Boolean)
          .slice(-RECENT_ASSIGNMENT_HISTORY_LIMIT)
      : [];

    const stats = {
      currentStreak,
      bestStreak,
      lastCompletedDay: isValidDayKey(raw.lastCompletedDay)
        ? raw.lastCompletedDay
        : "",
      totalTasks: toNonNegativeInteger(raw.totalTasks),
      earnedStreakBadges:
        raw.earnedStreakBadges,
      earnedTaskBadges:
        raw.earnedTaskBadges,
      recentAssignments
    };

    refreshEarnedBadges(stats);
    return stats;
  }

  function normalizeActivity(rawActivity) {
    if (!isPlainObject(rawActivity)) return null;

    const kind = cleanString(rawActivity.kind);
    const id = cleanString(rawActivity.id);
    const mode = cleanString(rawActivity.mode);

    if (!Object.values(ACTIVITY_KINDS).includes(kind)) return null;
    if (!id) return null;

    return { kind, id, mode };
  }

  function normalizeReviewAssignment(
    rawAssignment
  ) {
    const raw = isPlainObject(rawAssignment)
      ? rawAssignment
      : {};
    const kind = Object.values(
      REVIEW_KINDS
    ).includes(raw.kind)
      ? raw.kind
      : REVIEW_KINDS.FLASHCARD;
    const activityId =
      kind === REVIEW_KINDS.READ
        ? cleanString(raw.activityId)
        : "";

    if (
      kind === REVIEW_KINDS.READ &&
      !READ_ACTIVITY_IDS.includes(activityId)
    ) {
      return {
        kind: REVIEW_KINDS.FLASHCARD,
        activityId: ""
      };
    }

    return { kind, activityId };
  }

  function normalizeRolloverHold(
    rawHold,
    plan
  ) {
    if (!isPlainObject(rawHold)) return null;

    const taskId = resolveTaskId(
      plan,
      rawHold.taskId
    );
    const launchToken = cleanString(rawHold.launchToken);
    const startedAt = toTimestamp(rawHold.startedAt);

    if (!taskId) return null;
    if (!launchToken || !startedAt) return null;

    return { taskId, launchToken, startedAt };
  }

  function normalizeQuestionSession(
    rawSession,
    verseId
  ) {
    if (!isPlainObject(rawSession)) return null;

    const safeVerseId = cleanString(
      rawSession.verseId
    );
    const items = Array.isArray(rawSession.items)
      ? rawSession.items
      : [];

    if (
      Number(rawSession.version) !== 1 ||
      !safeVerseId ||
      safeVerseId !== cleanString(verseId) ||
      items.length !== 3
    ) {
      return null;
    }

    try {
      return cloneJson(rawSession);
    } catch (err) {
      return null;
    }
  }

  function normalizePlan(rawPlan) {
    if (!isPlainObject(rawPlan)) return null;

    const kind = normalizePlanKind(
      rawPlan.kind
    );
    const id = cleanString(rawPlan.id);
    const profileId = cleanString(rawPlan.profileId);
    const day = cleanString(rawPlan.day);
    const verseId = cleanString(rawPlan.verseId);
    const activity = normalizeActivity(rawPlan.activity);

    if (
      !id ||
      !isValidDayKey(day) ||
      (kind === PLAN_KINDS.CARE && !verseId) ||
      !activity
    ) {
      return null;
    }

    const requiredTaskIds =
      normalizeRequiredTaskIds(
        rawPlan.requiredTaskIds,
        kind
      );

    const rawTasks = isPlainObject(rawPlan.tasks)
      ? rawPlan.tasks
      : {};

    const educationalCompletedAt = toTimestamp(
      rawPlan.educationalCompletedAt
    );

    const rawSnack = isPlainObject(rawPlan.snack)
      ? rawPlan.snack
      : {};
    const snack = kind === PLAN_KINDS.CARE
      ? {
          unlocked:
            educationalCompletedAt > 0 ||
            rawSnack.unlocked === true,
          claimed: rawSnack.claimed === true,
          claimedAt:
            toTimestamp(rawSnack.claimedAt)
        }
      : null;

    if (snack && !snack.unlocked) {
      snack.claimed = false;
      snack.claimedAt = 0;
    }

    const tasks = {};

    requiredTaskIds.forEach((taskId) => {
      const rawTask =
        taskId === TASK_IDS.REVIEW
          ? rawTasks[TASK_IDS.REVIEW] ||
            rawTasks[
              LEGACY_FLASHCARD_TASK_ID
            ]
          : rawTasks[taskId];

      tasks[taskId] = normalizeTask(
        rawTask,
        taskId
      );
    });

    const planIdentity = {
      kind,
      requiredTaskIds
    };
    const normalizedHold = normalizeRolloverHold(
      rawPlan.rolloverHold,
      planIdentity
    );
    const heldTask = normalizedHold
      ? tasks[normalizedHold.taskId]
      : null;
    const rolloverHold =
      heldTask &&
      [
        TASK_STATUSES.RUNNING,
        TASK_STATUSES.PENDING
      ].includes(heldTask.status) &&
      heldTask.launchToken ===
        normalizedHold.launchToken
        ? normalizedHold
        : null;

    return {
      kind,
      id,
      profileId,
      day,
      verseId,
      requiredTaskIds,
      reviewAssignment:
        requiredTaskIds.includes(
          TASK_IDS.REVIEW
        )
          ? normalizeReviewAssignment(
              rawPlan.reviewAssignment
            )
          : null,
      activity,
      questionSession:
        kind === PLAN_KINDS.CARE &&
        requiredTaskIds.includes(
          TASK_IDS.QUESTIONS
        )
          ? normalizeQuestionSession(
              rawPlan.questionSession,
              verseId
            )
          : null,
      earnedStarPegCount: Math.min(
        2,
        toNonNegativeInteger(
          rawPlan.earnedStarPegCount
        )
      ),
      tasks,
      educationalCompletedAt,
      snack,
      newPetGameSession:
        kind === PLAN_KINDS.NEW_PET &&
        isPlainObject(rawPlan.newPetGameSession)
          ? cloneJson(rawPlan.newPetGameSession)
          : null,
      rolloverHold
    };
  }

  function createDefaultState() {
    return {
      version: STATE_VERSION,
      activePlan: null,
      stats: createDefaultStats(),
      byVerse: {}
    };
  }

  function normalizeState(rawState) {
    const raw = isPlainObject(rawState)
      ? rawState
      : {};

    return {
      version: STATE_VERSION,
      activePlan: normalizePlan(raw.activePlan),
      stats: normalizeStats(raw.stats),
      byVerse: normalizeByVerse(raw.byVerse)
    };
  }

  function isValidDayKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      cleanString(value)
    );

    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  function localDayKey(date = new Date()) {
    const value = date instanceof Date
      ? date
      : new Date(date);

    if (Number.isNaN(value.getTime())) return "";

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function parseDayKeyParts(dayKey) {
    if (!isValidDayKey(dayKey)) return null;

    const [year, month, day] = dayKey
      .split("-")
      .map(Number);

    return { year, month, day };
  }

  function shiftLocalDayKey(dayKey, amount) {
    const parts = parseDayKeyParts(dayKey);
    const shift = Number(amount);

    if (!parts || !Number.isFinite(shift)) return "";

    const date = new Date(Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + Math.trunc(shift)
    ));

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function previousLocalDayKey(dayKey) {
    return shiftLocalDayKey(dayKey, -1);
  }

  function previousThreeDayKeys(dayKey) {
    return [1, 2, 3]
      .map(offset => shiftLocalDayKey(dayKey, -offset))
      .filter(Boolean);
  }

  function dayDifference(fromDayKey, toDayKey) {
    const from = parseDayKeyParts(fromDayKey);
    const to = parseDayKeyParts(toDayKey);

    if (!from || !to) return null;

    const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
    const toUtc = Date.UTC(to.year, to.month - 1, to.day);

    return Math.round((toUtc - fromUtc) / 86400000);
  }

  function isCompletedPlaygroundProgress(value) {
    return value === true ||
      (isPlainObject(value) && value.completed === true);
  }

  function hasAnyGameCompletion(verseProgress) {
    const games = isPlainObject(verseProgress?.games)
      ? verseProgress.games
      : {};

    return Object.values(games).some((gameProgress) =>
      isPlainObject(gameProgress) &&
      (
        gameProgress.easyCompleted === true ||
        gameProgress.mediumCompleted === true ||
        gameProgress.hardCompleted === true ||
        gameProgress.roadCompleted === true ||
        gameProgress.trailCompleted === true ||
        gameProgress.riverCompleted === true
      )
    );
  }

  function defaultPetUnlocked(verseProgress) {
    return verseProgress?.learnCompleted === true &&
      hasAnyGameCompletion(verseProgress);
  }

  function getPublishedVerseIds(verseList = []) {
    return Array.isArray(verseList)
      ? verseList
          .map(getVerseId)
          .filter(Boolean)
      : [];
  }

  function getLearnedAt(verseProgress) {
    return toTimestamp(
      verseProgress?.learnedAt ||
      verseProgress?.lastPracticedAt
    );
  }

  function findMostRecentlyLearnedVerse({
    progress = {},
    verseList = []
  } = {}) {
    const verses = isPlainObject(progress?.verses)
      ? progress.verses
      : {};
    let selected = null;

    getPublishedVerseIds(verseList)
      .forEach((verseId) => {
        const verseProgress = isPlainObject(verses[verseId])
          ? verses[verseId]
          : null;

        if (!verseProgress?.learnCompleted) return;

        const learnedAt = getLearnedAt(verseProgress);
        if (
          !selected ||
          learnedAt > selected.learnedAt
        ) {
          selected = {
            verseId,
            verseProgress,
            learnedAt
          };
        }
      });

    return selected;
  }

  function getNewPetAccomplishments({
    verseProgress = {},
    gameRegistry = [],
    playgroundRegistry = []
  } = {}) {
    const accomplishments = [];
    const games = isPlainObject(verseProgress?.games)
      ? verseProgress.games
      : {};
    const registeredGameIds = new Set(
      buildActivityPool(gameRegistry, [])
        .filter((activity) =>
          activity.kind === ACTIVITY_KINDS.GAME
        )
        .map((activity) => activity.id)
    );
    const gameEntries = registeredGameIds.size
      ? [...registeredGameIds].map((gameId) =>
          games[gameId]
        )
      : Object.values(games);

    GAME_MODE_ORDER.forEach((mode) => {
      if (
        gameEntries.some((gameProgress) =>
          isGameModeComplete(gameProgress, mode)
        )
      ) {
        accomplishments.push(`game:${mode}`);
      }
    });

    const playground = isPlainObject(
      verseProgress?.playground
    )
      ? verseProgress.playground
      : {};
    const registeredPlaygroundIds = buildActivityPool(
      [],
      playgroundRegistry
    )
      .filter((activity) =>
        activity.kind === ACTIVITY_KINDS.PLAYGROUND
      )
      .map((activity) => activity.id);
    const playgroundIds = registeredPlaygroundIds.length
      ? registeredPlaygroundIds
      : Object.keys(playground);

    playgroundIds.forEach((activityId) => {
      if (
        isCompletedPlaygroundProgress(
          playground[activityId]
        )
      ) {
        accomplishments.push(
          `playground:${activityId}`
        );
      }
    });

    return accomplishments;
  }

  function getNewPetMissionReadiness({
    progress = {},
    verseList = [],
    gameRegistry = [],
    playgroundRegistry = [],
    isPetUnlocked = defaultPetUnlocked,
    tutorialActive = false,
    now = new Date()
  } = {}) {
    const publishedVerseIds =
      getPublishedVerseIds(verseList);
    const verses = isPlainObject(progress?.verses)
      ? progress.verses
      : {};
    const state = normalizeState(
      progress?.dailyZooTodo
    );
    const unlearnedVerseIds = publishedVerseIds
      .filter((verseId) =>
        verses[verseId]?.learnCompleted !== true
      );
    const learnedVerseIds = publishedVerseIds
      .filter((verseId) =>
        verses[verseId]?.learnCompleted === true
      );
    const pendingFirstPetVerseIds = learnedVerseIds
      .filter((verseId) => {
        const verseProgress = verses[verseId] || {};

        try {
          return !isPetUnlocked(
            verseProgress,
            verseId
          );
        } catch (err) {
          return !defaultPetUnlocked(
            verseProgress
          );
        }
      });
    const mostRecent =
      findMostRecentlyLearnedVerse({
        progress,
        verseList
      });
    const currentDay = localDayKey(now);
    const learnedDay = mostRecent?.learnedAt
      ? localDayKey(
          new Date(mostRecent.learnedAt)
        )
      : "";
    const ageDays = learnedDay
      ? dayDifference(learnedDay, currentDay)
      : null;
    const accomplishments = mostRecent
      ? getNewPetAccomplishments({
          verseProgress:
            mostRecent.verseProgress,
          gameRegistry,
          playgroundRegistry
        })
      : [];
    const memorized =
      mostRecent?.verseProgress
        ?.flashcards?.bestMemoryLevel ===
      "memorized";
    const activeMission =
      state.activePlan?.kind ===
      PLAN_KINDS.NEW_PET;
    let requiredAccomplishments =
      NEW_PET_MISSION_RULES
        .normalAccomplishments;

    if (
      Number.isInteger(ageDays) &&
      ageDays >=
        NEW_PET_MISSION_RULES
          .relaxedAgeDays
    ) {
      requiredAccomplishments =
        NEW_PET_MISSION_RULES
          .relaxedAccomplishments;
    }

    let reason = "ready";

    if (!publishedVerseIds.length) {
      reason = "no_published_verses";
    } else if (!unlearnedVerseIds.length) {
      reason = "no_unlearned_verses";
    } else if (tutorialActive) {
      reason = "tutorial_active";
    } else if (activeMission) {
      reason = "mission_active";
    } else if (pendingFirstPetVerseIds.length) {
      reason = "first_pet_pending";
    } else if (!mostRecent) {
      reason = "no_learned_verse";
    } else if (!mostRecent.learnedAt) {
      reason = "missing_learned_date";
    } else if (
      ageDays === null ||
      ageDays <
        NEW_PET_MISSION_RULES.minimumAgeDays
    ) {
      reason = "too_new";
    } else if (
      !memorized &&
      accomplishments.length <
        requiredAccomplishments
    ) {
      reason = "more_accomplishments_needed";
    }

    return {
      eligible: reason === "ready",
      reason,
      mostRecentVerseId:
        mostRecent?.verseId || "",
      learnedDay,
      ageDays,
      accomplishmentCount:
        accomplishments.length,
      accomplishments,
      requiredAccomplishments,
      memorized,
      unlearnedVerseIds,
      pendingFirstPetVerseIds,
      activeMission
    };
  }

  function getVerseId(item) {
    if (typeof item === "string") return cleanString(item);
    return cleanString(item?.id || item?.verseId);
  }

  function chooseTodaysPet({
    verseList = [],
    progress = {},
    isPetUnlocked = () => false,
    getPetStatus = () => "locked",
    random = Math.random
  } = {}) {
    if (!Array.isArray(verseList)) return null;

    const verses = isPlainObject(progress?.verses)
      ? progress.verses
      : {};

    const eligible = [];

    for (const item of verseList) {
      const verseId = getVerseId(item);
      if (!verseId) continue;

      const verseProgress = isPlainObject(verses[verseId])
        ? verses[verseId]
        : {};

      if (!isPetUnlocked(verseProgress, verseId)) continue;

      const status = cleanString(
        getPetStatus(verseProgress, verseId)
      ).toLowerCase();

      if (!Object.prototype.hasOwnProperty.call(
        PET_STATUS_PRIORITY,
        status
      )) {
        continue;
      }

      const rawLastPracticedAt = Number(
        verseProgress.lastPracticedAt || 0
      );

      const lastPracticedAt = Number.isFinite(rawLastPracticedAt) &&
        rawLastPracticedAt > 0
        ? rawLastPracticedAt
        : 0;

      eligible.push({
        verseId,
        status,
        lastPracticedAt,
        priority: PET_STATUS_PRIORITY[status]
      });
    }

    if (!eligible.length) return null;

    const bestPriority = Math.min(
      ...eligible.map(item => item.priority)
    );

    const statusGroup = eligible.filter(
      item => item.priority === bestPriority
    );

    const oldest = Math.min(
      ...statusGroup.map(item => item.lastPracticedAt)
    );

    const tied = statusGroup.filter(
      item => item.lastPracticedAt === oldest
    );

    const chosen = tied[randomIndex(tied.length, random)];

    return chosen
      ? {
          verseId: chosen.verseId,
          status: chosen.status,
          lastPracticedAt: chosen.lastPracticedAt
        }
      : null;
  }

  function normalizeManifestModes(rawModes) {
    if (!Array.isArray(rawModes)) return [];

    return rawModes
      .map(cleanString)
      .filter(Boolean);
  }

  function buildActivityPool(
    gameRegistry = [],
    playgroundRegistry = []
  ) {
    const pool = [];

    if (Array.isArray(gameRegistry)) {
      for (const entry of gameRegistry) {
        if (!entry || entry.enabled === false) continue;

        const manifest = isPlainObject(entry.manifest)
          ? entry.manifest
          : null;

        if (!manifest || manifest.visibleInCarousel === false) continue;
        if (manifest.progressType && manifest.progressType !== "standard") continue;

        const id = cleanString(manifest.id);
        if (!id) continue;

        pool.push({
          kind: ACTIVITY_KINDS.GAME,
          id,
          modes: normalizeManifestModes(manifest.modes)
        });
      }
    }

    if (Array.isArray(playgroundRegistry)) {
      for (const entry of playgroundRegistry) {
        if (!entry || entry.enabled === false) continue;

        const manifest = isPlainObject(entry.manifest)
          ? entry.manifest
          : null;

        if (!manifest || manifest.visibleInCarousel === false) continue;

        const id = cleanString(manifest.id);
        if (!id) continue;

        pool.push({
          kind: ACTIVITY_KINDS.PLAYGROUND,
          id,
          modes: normalizeManifestModes(manifest.modes)
        });
      }
    }

    return pool;
  }

  function isGameModeComplete(gameProgress, mode) {
    if (!isPlainObject(gameProgress)) return false;

    if (mode === "easy") return gameProgress.easyCompleted === true;
    if (mode === "medium") return gameProgress.mediumCompleted === true;
    if (mode === "hard") return gameProgress.hardCompleted === true;

    return false;
  }

  function getGameModes(activity) {
    const manifestModes = Array.isArray(activity?.modes)
      ? activity.modes.filter(mode => GAME_MODE_ORDER.includes(mode))
      : [];

    return manifestModes.length
      ? GAME_MODE_ORDER.filter(mode => manifestModes.includes(mode))
      : [...GAME_MODE_ORDER];
  }

  function chooseGameMode(activity, verseProgress = {}) {
    const modes = getGameModes(activity);
    const gameProgress = verseProgress?.games?.[activity?.id];

    for (const mode of modes) {
      if (!isGameModeComplete(gameProgress, mode)) {
        return mode;
      }
    }

    if (modes.includes("hard")) return "hard";
    return modes[modes.length - 1] || "";
  }

  function isGameFinished(activity, verseProgress = {}) {
    const modes = getGameModes(activity);
    const gameProgress = verseProgress?.games?.[activity?.id];

    return modes.length > 0 && modes.every(
      mode => isGameModeComplete(gameProgress, mode)
    );
  }

  function isPlaygroundCompleted(activity, verseProgress = {}) {
    const value = verseProgress?.playground?.[activity?.id];

    if (value === true) return true;
    if (isPlainObject(value) && value.completed === true) return true;

    return false;
  }

  function choosePlaygroundMode(activity, verseProgress = {}) {
    const modes = Array.isArray(activity?.modes)
      ? activity.modes.filter(Boolean)
      : [];

    if (!modes.length) return "";

    return isPlaygroundCompleted(activity, verseProgress)
      ? modes[modes.length - 1]
      : modes[0];
  }

  function isActivityUnfinished(activity, verseProgress = {}) {
    if (activity?.kind === ACTIVITY_KINDS.GAME) {
      return !isGameFinished(activity, verseProgress);
    }

    if (activity?.kind === ACTIVITY_KINDS.PLAYGROUND) {
      return !isPlaygroundCompleted(activity, verseProgress);
    }

    return false;
  }

  function assignmentKey(kind, id) {
    return `${cleanString(kind)}:${cleanString(id)}`;
  }

  function isRecentlyAssigned(
    activity,
    recentAssignments,
    dayKey
  ) {
    if (!activity || !Array.isArray(recentAssignments)) return false;

    const recentDays = new Set(previousThreeDayKeys(dayKey));
    const key = assignmentKey(activity.kind, activity.id);

    return recentAssignments.some(item =>
      recentDays.has(item.day) &&
      assignmentKey(item.kind, item.id) === key
    );
  }

  function chooseActivityAssignment({
    pool = [],
    verseProgress = {},
    recentAssignments = [],
    day = "",
    random = Math.random
  } = {}) {
    if (!Array.isArray(pool) || !pool.length) return null;

    const unfinished = pool.filter(activity =>
      isActivityUnfinished(activity, verseProgress)
    );

    const progressionPool = unfinished.length
      ? unfinished
      : pool;

    const nonRecent = progressionPool.filter(activity =>
      !isRecentlyAssigned(activity, recentAssignments, day)
    );

    const candidates = nonRecent.length
      ? nonRecent
      : progressionPool;

    const activity = candidates[
      randomIndex(candidates.length, random)
    ];

    if (!activity) return null;

    const mode = activity.kind === ACTIVITY_KINDS.GAME
      ? chooseGameMode(activity, verseProgress)
      : choosePlaygroundMode(activity, verseProgress);

    return {
      kind: activity.kind,
      id: activity.id,
      mode
    };
  }

  function createPlanId({
    day,
    profileId,
    now,
    random = Math.random
  }) {
    const safeProfileId = cleanString(profileId)
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 32) || "profile";

    const timePart = Math.max(0, Number(now?.getTime?.() || Date.now()))
      .toString(36);

    const randomPart = Math.floor(
      normalizeRandomValue(random()) * 0xffffffff
    )
      .toString(36)
      .padStart(6, "0")
      .slice(-8);

    return `daily-${day}-${safeProfileId}-${timePart}-${randomPart}`;
  }

  function createPlan({
    kind = PLAN_KINDS.CARE,
    profileId = "",
    day = "",
    verseId = "",
    activity = null,
    requiredTaskIds = null,
    reviewAssignment = null,
    now = new Date(),
    random = Math.random,
    idFactory = null
  } = {}) {
    const safeKind = normalizePlanKind(kind);
    const safeDay = cleanString(day);
    const safeVerseId = cleanString(verseId);
    const safeActivity = normalizeActivity(activity);
    const safeRequiredTaskIds =
      normalizeRequiredTaskIds(
        requiredTaskIds,
        safeKind
      );

    if (
      !isValidDayKey(safeDay) ||
      (safeKind === PLAN_KINDS.CARE &&
        !safeVerseId) ||
      !safeActivity
    ) {
      return null;
    }

    const id = typeof idFactory === "function"
      ? cleanString(idFactory({
          profileId: cleanString(profileId),
          day: safeDay,
          verseId: safeVerseId,
          activity: safeActivity
        }))
      : createPlanId({
          day: safeDay,
          profileId,
          now,
          random
        });

    if (!id) return null;

    const tasks = {};

    safeRequiredTaskIds.forEach((taskId) => {
      tasks[taskId] = createDefaultTask();
    });

    return {
      kind: safeKind,
      id,
      profileId: cleanString(profileId),
      day: safeDay,
      verseId: safeVerseId,
      requiredTaskIds:
        safeRequiredTaskIds,
      reviewAssignment:
        safeRequiredTaskIds.includes(
          TASK_IDS.REVIEW
        )
          ? normalizeReviewAssignment(
              reviewAssignment
            )
          : null,
      activity: safeActivity,
      questionSession: null,
      earnedStarPegCount: 0,
      tasks,
      educationalCompletedAt: 0,
      snack:
        safeKind === PLAN_KINDS.CARE
          ? {
              unlocked: false,
              claimed: false,
              claimedAt: 0
            }
          : null,
      newPetGameSession: null,
      rolloverHold: null
    };
  }

  function createNewPetMissionPlan({
    profileId = "",
    day = localDayKey(),
    gameRegistry = [],
    recentAssignments = [],
    now = new Date(),
    random = Math.random,
    idFactory = null
  } = {}) {
    const games = buildActivityPool(
      gameRegistry,
      []
    ).filter((activity) =>
      activity.kind === ACTIVITY_KINDS.GAME &&
      getGameModes(activity).includes("easy")
    );
    const nonRecent = games.filter((activity) =>
      !isRecentlyAssigned(activity, recentAssignments, day)
    );
    const candidates = nonRecent.length ? nonRecent : games;
    const selected = candidates[
      randomIndex(candidates.length, random)
    ];

    if (!selected) return null;

    return createPlan({
      kind: PLAN_KINDS.NEW_PET,
      profileId,
      day,
      verseId: "",
      requiredTaskIds:
        DEFAULT_REQUIRED_TASK_IDS[
          PLAN_KINDS.NEW_PET
        ],
      activity: {
        kind: ACTIVITY_KINDS.GAME,
        id: selected.id,
        mode: "easy"
      },
      now,
      random,
      idFactory
    });
  }

  function selectNewPetMissionVerse(
    rawState,
    {
      planId = "",
      verseId = ""
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;
    const safeVerseId = cleanString(verseId);

    if (
      !plan ||
      plan.id !== cleanString(planId) ||
      plan.kind !== PLAN_KINDS.NEW_PET ||
      !safeVerseId ||
      (plan.verseId &&
        plan.verseId !== safeVerseId)
    ) {
      return { state, changed: false };
    }

    if (plan.verseId === safeVerseId) {
      return { state, changed: false };
    }

    const learnTask =
      plan.tasks?.[TASK_IDS.LEARN];

    if (
      !learnTask ||
      learnTask.status !== TASK_STATUSES.OPEN
    ) {
      return { state, changed: false };
    }

    plan.verseId = safeVerseId;
    return { state, changed: true };
  }

  function pruneRecentAssignments(assignments, currentDay) {
    const normalized = Array.isArray(assignments)
      ? assignments
          .map(normalizeRecentAssignment)
          .filter(Boolean)
      : [];

    const bounded = normalized.filter(item => {
      const difference = dayDifference(item.day, currentDay);
      return difference === null ||
        (difference >= 0 && difference <= 30);
    });

    return bounded.slice(-RECENT_ASSIGNMENT_HISTORY_LIMIT);
  }

  function recordRecentAssignment(stats, day, activity) {
    if (!stats || !activity || !isValidDayKey(day)) return;

    const assignment = normalizeRecentAssignment({
      day,
      kind: activity.kind,
      id: activity.id,
      mode: activity.mode
    });

    if (!assignment) return;

    stats.recentAssignments = pruneRecentAssignments(
      stats.recentAssignments,
      day
    );

    const alreadyRecorded = stats.recentAssignments.some(item =>
      item.day === assignment.day &&
      item.kind === assignment.kind &&
      item.id === assignment.id &&
      item.mode === assignment.mode
    );

    if (!alreadyRecorded) {
      stats.recentAssignments.push(assignment);
    }

    stats.recentAssignments = stats.recentAssignments.slice(
      -RECENT_ASSIGNMENT_HISTORY_LIMIT
    );
  }

  function refreshCurrentStreakForDay(stats, day) {
    if (!stats || !isValidDayKey(day)) return;

    const lastCompletedDay = stats.lastCompletedDay;

    if (!lastCompletedDay) {
      stats.currentStreak = 0;
      return;
    }

    if (
      lastCompletedDay === day ||
      lastCompletedDay === previousLocalDayKey(day)
    ) {
      return;
    }

    stats.currentStreak = 0;
  }

  function getStatsForDay(rawState, day = localDayKey()) {
    const state = normalizeState(rawState);
    const stats = cloneJson(state.stats);

    refreshCurrentStreakForDay(stats, day);
    return stats;
  }

  function getEarnedBadgeDefinitions(rawStats) {
    const stats = normalizeStats(rawStats);
    const earnedStreaks = new Set(
      stats.earnedStreakBadges
    );
    const earnedTasks = new Set(
      stats.earnedTaskBadges
    );

    return {
      streak: BADGE_DEFINITIONS.streak
        .filter((badge) =>
          earnedStreaks.has(
            badge.threshold
          )
        )
        .map(cloneJson),
      tasks: BADGE_DEFINITIONS.tasks
        .filter((badge) =>
          earnedTasks.has(
            badge.threshold
          )
        )
        .map(cloneJson)
    };
  }

  function recordEducationalDayComplete(stats, day) {
    if (!stats || !isValidDayKey(day)) return false;

    if (stats.lastCompletedDay === day) {
      return false;
    }

    if (stats.lastCompletedDay === previousLocalDayKey(day)) {
      stats.currentStreak = Math.max(
        0,
        toNonNegativeInteger(stats.currentStreak)
      ) + 1;
    } else {
      stats.currentStreak = 1;
    }

    stats.lastCompletedDay = day;
    stats.bestStreak = Math.max(
      toNonNegativeInteger(stats.bestStreak),
      stats.currentStreak
    );

    return true;
  }

  function areEducationalTasksComplete(plan) {
    const requiredTaskIds =
      getRequiredTaskIds(plan);

    if (
      !plan?.tasks ||
      !requiredTaskIds.length
    ) {
      return false;
    }

    return requiredTaskIds.every(taskId =>
      plan.tasks[taskId]?.status === TASK_STATUSES.COMPLETE
    );
  }

  function recordConfirmedTaskHistory(
    state,
    plan,
    taskId,
    pendingData,
    now = new Date()
  ) {
    if (
      plan?.kind !== PLAN_KINDS.CARE ||
      !plan.verseId
    ) {
      return false;
    }

    const history = getOrCreateVerseHistory(
      state,
      plan.verseId
    );

    if (!history) return false;

    if (taskId === TASK_IDS.QUESTIONS) {
      history.questionsCompleted += 1;

      const questionTypes = [
        ...(Array.isArray(
          pendingData?.generatedQuestionTypes
        )
          ? pendingData.generatedQuestionTypes
          : []),
        ...(Array.isArray(
          pendingData?.questionTypes
        )
          ? pendingData.questionTypes
          : [])
      ]
        .map(cleanString)
        .filter(Boolean);

      history.recentGeneratedQuestionTypes = [
        ...history.recentGeneratedQuestionTypes,
        ...questionTypes
      ].slice(
        -RECENT_QUESTION_TYPE_HISTORY_LIMIT
      );
      return true;
    }

    if (
      taskId === TASK_IDS.REVIEW &&
      plan.reviewAssignment?.kind ===
        REVIEW_KINDS.READ
    ) {
      const activityId = cleanString(
        plan.reviewAssignment.activityId
      );
      const activityHistory =
        history.readActivities[activityId];

      if (!activityHistory) return false;

      activityHistory.completedCount += 1;
      activityHistory.lastCompletedAt =
        now.getTime();
      return true;
    }

    return false;
  }

  function rollbackPlanHistoryForReset(
    state,
    plan,
    completedTaskIds,
    completedEducationalDay
  ) {
    if (
      plan?.kind !== PLAN_KINDS.CARE ||
      !plan.verseId
    ) {
      return;
    }

    const history = getOrCreateVerseHistory(
      state,
      plan.verseId
    );

    if (!history) return;

    if (
      completedTaskIds.includes(
        TASK_IDS.QUESTIONS
      )
    ) {
      history.questionsCompleted = Math.max(
        0,
        history.questionsCompleted - 1
      );
    }

    if (
      completedTaskIds.includes(
        TASK_IDS.REVIEW
      ) &&
      plan.reviewAssignment?.kind ===
        REVIEW_KINDS.READ
    ) {
      const activityId = cleanString(
        plan.reviewAssignment.activityId
      );
      const activityHistory =
        history.readActivities[activityId];

      if (activityHistory) {
        activityHistory.completedCount =
          Math.max(
            0,
            activityHistory.completedCount - 1
          );

        if (
          activityHistory.lastCompletedAt ===
          toTimestamp(
            plan.tasks?.[TASK_IDS.REVIEW]
              ?.completedAt
          )
        ) {
          activityHistory.lastCompletedAt = 0;
        }
      }
    }

    if (completedEducationalDay) {
      history.completedDailyTodos = Math.max(
        0,
        history.completedDailyTodos - 1
      );
    }
  }

  function getPlanProgress(rawPlan) {
    const plan = normalizePlan(rawPlan);
    if (!plan) return null;

    const requiredTaskIds =
      getRequiredTaskIds(plan);
    const taskComplete = {};

    requiredTaskIds.forEach((taskId) => {
      taskComplete[taskId] =
        plan.tasks[taskId]?.status ===
          TASK_STATUSES.COMPLETE;
    });

    const completeCount = requiredTaskIds
      .filter((taskId) =>
        taskComplete[taskId]
      ).length;
    const educationalComplete =
      plan.educationalCompletedAt > 0 &&
      completeCount === requiredTaskIds.length;
    const isCarePlan =
      plan.kind === PLAN_KINDS.CARE;

    return {
      kind: plan.kind,
      requiredTaskIds,
      requiredCount:
        requiredTaskIds.length,
      taskComplete,
      completeCount,
      educationalComplete,
      feedingTime:
        isCarePlan &&
        educationalComplete &&
        plan.snack?.unlocked === true &&
        plan.snack?.claimed !== true,
      snackClaimed:
        isCarePlan &&
        plan.snack?.claimed === true
    };
  }

  function shouldShowFocusedPlan(rawPlan) {
    const plan = normalizePlan(rawPlan);

    if (!plan) return false;

    return plan.kind === PLAN_KINDS.CARE
      ? plan.snack?.claimed !== true
      : plan.educationalCompletedAt <= 0;
  }

  function resetActivePlanProgress(
    rawState,
    {
      planId = "",
      day = localDayKey()
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;
    const safePlanId = cleanString(planId);
    const safeDay = cleanString(day);

    if (
      !plan ||
      (safePlanId && plan.id !== safePlanId) ||
      plan.day !== safeDay
    ) {
      return { state, changed: false };
    }

    const requiredTaskIds =
      getRequiredTaskIds(plan);
    const completedTaskIds =
      requiredTaskIds.filter(
        (taskId) =>
          plan.tasks[taskId]?.status ===
          TASK_STATUSES.COMPLETE
      );
    const completedTaskCount =
      completedTaskIds.length;
    const completedEducationalDay =
      plan.educationalCompletedAt > 0 &&
      areEducationalTasksComplete(plan);

    rollbackPlanHistoryForReset(
      state,
      plan,
      completedTaskIds,
      completedEducationalDay
    );

    state.stats.totalTasks = Math.max(
      0,
      toNonNegativeInteger(
        state.stats.totalTasks
      ) - completedTaskCount
    );

    if (
      completedEducationalDay &&
      state.stats.lastCompletedDay ===
        plan.day
    ) {
      state.stats.currentStreak =
        Math.max(
          0,
          toNonNegativeInteger(
            state.stats.currentStreak
          ) - 1
        );
      state.stats.lastCompletedDay =
        state.stats.currentStreak > 0
          ? previousLocalDayKey(plan.day)
          : "";
    }

    requiredTaskIds.forEach(
      (taskId) => {
        plan.tasks[taskId] =
          createDefaultTask();
      }
    );
    plan.earnedStarPegCount = 0;
    plan.questionSession = null;
    plan.educationalCompletedAt = 0;
    plan.snack =
      plan.kind === PLAN_KINDS.CARE
        ? {
            unlocked: false,
            claimed: false,
            claimedAt: 0
          }
        : null;
    plan.rolloverHold = null;

    refreshEarnedBadges(state.stats);

    return { state, changed: true };
  }

  function completeEducationalPlanIfReady(state, now = new Date()) {
    const plan = state?.activePlan;

    if (!plan || !areEducationalTasksComplete(plan)) {
      return false;
    }

    if (plan.educationalCompletedAt > 0) {
      if (
        plan.kind === PLAN_KINDS.CARE &&
        plan.snack
      ) {
        plan.snack.unlocked = true;
      }
      return false;
    }

    plan.educationalCompletedAt = now.getTime();

    if (
      plan.kind === PLAN_KINDS.CARE &&
      plan.snack
    ) {
      plan.snack.unlocked = true;
    }

    recordEducationalDayComplete(
      state.stats,
      plan.day
    );

    if (plan.kind === PLAN_KINDS.CARE) {
      const history = getOrCreateVerseHistory(
        state,
        plan.verseId
      );

      if (history) {
        history.completedDailyTodos += 1;
      }
    }

    return true;
  }

  function shouldPreserveOldPlan(plan) {
    if (
      plan?.kind === PLAN_KINDS.NEW_PET &&
      cleanString(plan.verseId) &&
      plan.educationalCompletedAt <= 0
    ) {
      return true;
    }

    return !!normalizeRolloverHold(
      plan?.rolloverHold,
      plan
    );
  }

  function expireOldPlanIfNeeded(
    rawState,
    day = localDayKey(),
    { force = false } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;

    refreshCurrentStreakForDay(state.stats, day);

    if (!plan || plan.day === day) {
      return {
        state,
        expired: false,
        preserved: false
      };
    }

    if (!force && shouldPreserveOldPlan(plan)) {
      return {
        state,
        expired: false,
        preserved: true
      };
    }

    state.activePlan = null;

    return {
      state,
      expired: true,
      preserved: false
    };
  }

  function getOrCreatePlan({
    progress = {},
    profileId = "",
    verseList = [],
    gameRegistry = [],
    playgroundRegistry = [],
    isPetUnlocked = () => false,
    getPetStatus = () => "locked",
    getReadActivitiesForVerse = () => [],
    tutorialActive = false,
    now = new Date(),
    random = Math.random,
    idFactory = null
  } = {}) {
    const targetProgress = isPlainObject(progress)
      ? progress
      : {};

    const day = localDayKey(now);
    const rollover = expireOldPlanIfNeeded(
      targetProgress.dailyZooTodo,
      day
    );

    const state = rollover.state;
    const safeProfileId = cleanString(profileId);

    if (state.activePlan && safeProfileId) {
      if (
        state.activePlan.profileId &&
        state.activePlan.profileId !== safeProfileId
      ) {
        state.activePlan = null;
      } else if (!state.activePlan.profileId) {
        state.activePlan.profileId = safeProfileId;
      }
    }

    targetProgress.dailyZooTodo = state;

    if (state.activePlan) {
      return {
        progress: targetProgress,
        state,
        plan: state.activePlan,
        created: false,
        preservedOldDay: rollover.preserved
      };
    }

    if (NEW_PET_MISSION_AUTOMATIC_CREATION_ENABLED) {
      const readiness = getNewPetMissionReadiness({
        progress: targetProgress,
        verseList,
        gameRegistry,
        playgroundRegistry,
        isPetUnlocked,
        tutorialActive,
        now
      });

      if (readiness.eligible) {
        const mission = createNewPetMissionPlan({
          profileId: safeProfileId,
          day,
          gameRegistry,
          recentAssignments: state.stats.recentAssignments,
          now,
          random,
          idFactory
        });

        if (mission) {
          state.activePlan = mission;
          recordRecentAssignment(state.stats, day, mission.activity);
          refreshCurrentStreakForDay(state.stats, day);
          targetProgress.dailyZooTodo = state;
          return {
            progress: targetProgress,
            state,
            plan: mission,
            created: true,
            preservedOldDay: false
          };
        }
      }
    }

    const pet = chooseTodaysPet({
      verseList,
      progress: targetProgress,
      isPetUnlocked,
      getPetStatus,
      random
    });

    if (!pet) {
      return {
        progress: targetProgress,
        state,
        plan: null,
        created: false,
        preservedOldDay: false
      };
    }

    const pool = buildActivityPool(
      gameRegistry,
      playgroundRegistry
    );

    const verseProgress = targetProgress.verses?.[pet.verseId] || {};
    const activity = chooseActivityAssignment({
      pool,
      verseProgress,
      recentAssignments: state.stats.recentAssignments,
      day,
      random
    });

    if (!activity) {
      return {
        progress: targetProgress,
        state,
        plan: null,
        created: false,
        preservedOldDay: false
      };
    }

    let readActivities = [];

    try {
      const available =
        getReadActivitiesForVerse(
          pet.verseId
        );
      readActivities = Array.isArray(available)
        ? available
        : [];
    } catch (err) { }

    const reviewAssignment =
      chooseReviewAssignment({
        verseHistory:
          state.byVerse[pet.verseId],
        activities: readActivities,
        random
      });

    const plan = createPlan({
      profileId,
      day,
      verseId: pet.verseId,
      activity,
      reviewAssignment,
      now,
      random,
      idFactory
    });

    if (!plan) {
      return {
        progress: targetProgress,
        state,
        plan: null,
        created: false,
        preservedOldDay: false
      };
    }

    state.activePlan = plan;
    recordRecentAssignment(state.stats, day, activity);
    refreshCurrentStreakForDay(state.stats, day);
    targetProgress.dailyZooTodo = state;

    return {
      progress: targetProgress,
      state,
      plan,
      created: true,
      preservedOldDay: false
    };
  }

  function getOrCreatePersistedPlan({
    loadProgress = null,
    saveProgress = null,
    ...options
  } = {}) {
    if (
      typeof loadProgress !== "function" ||
      typeof saveProgress !== "function"
    ) {
      return {
        ok: false,
        saved: false,
        progress: null,
        state: null,
        plan: null,
        created: false,
        preservedOldDay: false
      };
    }

    const loadedProgress = loadProgress();
    const progress = isPlainObject(loadedProgress)
      ? loadedProgress
      : {};

    const result = getOrCreatePlan({
      ...options,
      progress
    });

    const saved = saveProgress(result.progress) !== false;

    return {
      ok: saved,
      saved,
      ...result
    };
  }

  function findTask(plan, taskId) {
    const resolvedTaskId = resolveTaskId(
      plan,
      taskId
    );

    if (!plan || !resolvedTaskId) {
      return null;
    }

    return plan.tasks?.[resolvedTaskId] || null;
  }

  function createLaunchToken(now, random = Math.random) {
    const timePart = Math.max(0, now.getTime()).toString(36);
    const randomPart = Math.floor(
      normalizeRandomValue(random()) * 0xffffffff
    ).toString(36);

    return `daily-task-${timePart}-${randomPart}`;
  }

  function beginTask(
    rawState,
    {
      planId = "",
      taskId = "",
      preserveAcrossDay = false,
      now = new Date(),
      random = Math.random
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;
    const resolvedTaskId = resolveTaskId(
      plan,
      taskId
    );

    if (!plan || plan.id !== cleanString(planId)) {
      return { state, changed: false, launchToken: "" };
    }

    const task = findTask(
      plan,
      resolvedTaskId
    );
    if (
      !task ||
      task.status === TASK_STATUSES.PENDING ||
      task.status === TASK_STATUSES.COMPLETE
    ) {
      return { state, changed: false, launchToken: "" };
    }

    if (task.status === TASK_STATUSES.RUNNING && task.launchToken) {
      return {
        state,
        changed: false,
        launchToken: task.launchToken
      };
    }

    const launchToken = createLaunchToken(now, random);

    task.status = TASK_STATUSES.RUNNING;
    task.startedAt = now.getTime();
    task.pendingAt = 0;
    task.completedAt = 0;
    task.launchToken = launchToken;
    task.pendingData = null;

    if (
      plan.kind === PLAN_KINDS.NEW_PET &&
      resolvedTaskId === TASK_IDS.ACTIVITY
    ) {
      plan.newPetGameSession = null;
    }

    if (preserveAcrossDay) {
      plan.rolloverHold = {
        taskId: resolvedTaskId,
        launchToken,
        startedAt: task.startedAt
      };
    }

    return { state, changed: true, launchToken };
  }

  function setPendingCompletion(
    rawState,
    {
      planId = "",
      taskId = "",
      launchToken = "",
      pendingData = null,
      now = new Date()
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;
    const resolvedTaskId = resolveTaskId(
      plan,
      taskId
    );

    if (!plan || plan.id !== cleanString(planId)) {
      return { state, changed: false };
    }

    const task = findTask(
      plan,
      resolvedTaskId
    );
    if (
      !task ||
      task.status === TASK_STATUSES.OPEN ||
      task.status === TASK_STATUSES.COMPLETE
    ) {
      return { state, changed: false };
    }

    const safeLaunchToken = cleanString(launchToken);

    if (
      task.launchToken &&
      safeLaunchToken &&
      task.launchToken !== safeLaunchToken
    ) {
      return { state, changed: false };
    }

    if (
      task.status === TASK_STATUSES.PENDING &&
      (!safeLaunchToken || task.launchToken === safeLaunchToken)
    ) {
      return { state, changed: false };
    }

    if (safeLaunchToken && !task.launchToken) {
      task.launchToken = safeLaunchToken;
    }

    task.status = TASK_STATUSES.PENDING;
    task.pendingAt = now.getTime();
    task.pendingData = normalizePendingData(
      pendingData,
      resolvedTaskId
    );

    return { state, changed: true };
  }

  function confirmPendingCompletion(
    rawState,
    {
      planId = "",
      taskId = "",
      now = new Date()
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;
    const resolvedTaskId = resolveTaskId(
      plan,
      taskId
    );

    if (!plan || plan.id !== cleanString(planId)) {
      return {
        state,
        changed: false,
        taskCompleted: false,
        educationalCompleted: false
      };
    }

    const task = findTask(
      plan,
      resolvedTaskId
    );

    if (!task) {
      return {
        state,
        changed: false,
        taskCompleted: false,
        educationalCompleted: false
      };
    }

    if (task.status === TASK_STATUSES.COMPLETE) {
      return {
        state,
        changed: false,
        taskCompleted: true,
        educationalCompleted: plan.educationalCompletedAt > 0
      };
    }

    if (task.status !== TASK_STATUSES.PENDING) {
      return {
        state,
        changed: false,
        taskCompleted: false,
        educationalCompleted: false
      };
    }

    const pendingData = cloneJson(
      task.pendingData
    );

    task.status = TASK_STATUSES.COMPLETE;
    task.completedAt = now.getTime();
    task.pendingData = null;

    if (
      plan.rolloverHold?.taskId ===
        resolvedTaskId &&
      plan.rolloverHold.launchToken ===
        task.launchToken
    ) {
      plan.rolloverHold = null;
    }

    state.stats.totalTasks = toNonNegativeInteger(
      state.stats.totalTasks
    ) + 1;

    recordConfirmedTaskHistory(
      state,
      plan,
      resolvedTaskId,
      pendingData,
      now
    );

    const educationalCompleted = completeEducationalPlanIfReady(
      state,
      now
    );

    refreshEarnedBadges(state.stats);

    return {
      state,
      changed: true,
      taskCompleted: true,
      educationalCompleted
    };
  }

  function releaseRolloverHold(
    rawState,
    {
      planId = "",
      launchToken = ""
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;

    if (!plan || plan.id !== cleanString(planId)) {
      return { state, changed: false };
    }

    const hold = plan.rolloverHold;
    if (!hold) return { state, changed: false };

    const safeLaunchToken = cleanString(launchToken);
    if (safeLaunchToken && hold.launchToken !== safeLaunchToken) {
      return { state, changed: false };
    }

    plan.rolloverHold = null;
    return { state, changed: true };
  }

  function markSnackClaimed(
    rawState,
    {
      planId = "",
      now = new Date()
    } = {}
  ) {
    const state = normalizeState(rawState);
    const plan = state.activePlan;

    if (!plan || plan.id !== cleanString(planId)) {
      return { state, changed: false };
    }

    if (
      plan.kind !== PLAN_KINDS.CARE ||
      plan.day !== localDayKey(now) ||
      plan.educationalCompletedAt <= 0 ||
      !areEducationalTasksComplete(plan) ||
      plan.snack?.unlocked !== true ||
      plan.snack?.claimed === true
    ) {
      return { state, changed: false };
    }

    plan.snack.claimed = true;
    plan.snack.claimedAt = now.getTime();

    return { state, changed: true };
  }

  return Object.freeze({
    STATE_VERSION,
    RECENT_ASSIGNMENT_DAYS,
    NEW_PET_MISSION_AUTOMATIC_CREATION_ENABLED,
    NEW_PET_MISSION_RULES,
    STREAK_BADGE_THRESHOLDS,
    TASK_BADGE_THRESHOLDS,
    BADGE_DEFINITIONS,
    PLAN_KINDS,
    TASK_IDS,
    TASK_STATUSES,
    ACTIVITY_KINDS,
    REVIEW_KINDS,
    READ_ACTIVITY_IDS,
    DEFAULT_REQUIRED_TASK_IDS,
    createDefaultState,
    normalizeState,
    getVerseHistory,
    chooseReadActivityAssignment,
    chooseReviewAssignment,
    getRequiredTaskIds,
    resolveTaskId,
    localDayKey,
    shiftLocalDayKey,
    previousLocalDayKey,
    previousThreeDayKeys,
    dayDifference,
    chooseTodaysPet,
    buildActivityPool,
    chooseGameMode,
    choosePlaygroundMode,
    chooseActivityAssignment,
    getNewPetAccomplishments,
    getNewPetMissionReadiness,
    createNewPetMissionPlan,
    selectNewPetMissionVerse,
    getOrCreatePlan,
    getOrCreatePersistedPlan,
    getStatsForDay,
    getEarnedBadgeDefinitions,
    getPlanProgress,
    shouldShowFocusedPlan,
    resetActivePlanProgress,
    expireOldPlanIfNeeded,
    beginTask,
    setPendingCompletion,
    confirmPendingCompletion,
    releaseRolloverHold,
    markSnackClaimed
  });
});
