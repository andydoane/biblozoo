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

  const STATE_VERSION = 2;
  const RECENT_ASSIGNMENT_DAYS = 3;
  const RECENT_ASSIGNMENT_HISTORY_LIMIT = 40;

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
    FLASHCARD: "flashcard",
    QUESTIONS: "questions",
    ACTIVITY: "activity"
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

  function normalizeTask(rawTask) {
    const raw = isPlainObject(rawTask)
      ? rawTask
      : {};

    const task = {
      status: normalizeTaskStatus(raw.status),
      startedAt: toTimestamp(raw.startedAt),
      pendingAt: toTimestamp(raw.pendingAt),
      completedAt: toTimestamp(raw.completedAt),
      launchToken: cleanString(raw.launchToken),
      pendingData: isPlainObject(raw.pendingData)
        ? cloneJson(raw.pendingData)
        : null
    };

    if (task.status === TASK_STATUSES.COMPLETE) {
      task.pendingData = null;
    }

    return task;
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

  function normalizeRolloverHold(rawHold) {
    if (!isPlainObject(rawHold)) return null;

    const taskId = cleanString(rawHold.taskId);
    const launchToken = cleanString(rawHold.launchToken);
    const startedAt = toTimestamp(rawHold.startedAt);

    if (!Object.values(TASK_IDS).includes(taskId)) return null;
    if (!launchToken || !startedAt) return null;

    return { taskId, launchToken, startedAt };
  }

  function normalizePlan(rawPlan) {
    if (!isPlainObject(rawPlan)) return null;

    const id = cleanString(rawPlan.id);
    const profileId = cleanString(rawPlan.profileId);
    const day = cleanString(rawPlan.day);
    const verseId = cleanString(rawPlan.verseId);
    const activity = normalizeActivity(rawPlan.activity);

    if (!id || !isValidDayKey(day) || !verseId || !activity) {
      return null;
    }

    const rawTasks = isPlainObject(rawPlan.tasks)
      ? rawPlan.tasks
      : {};

    const educationalCompletedAt = toTimestamp(
      rawPlan.educationalCompletedAt
    );

    const rawSnack = isPlainObject(rawPlan.snack)
      ? rawPlan.snack
      : {};

    const snack = {
      unlocked: educationalCompletedAt > 0 || rawSnack.unlocked === true,
      claimed: rawSnack.claimed === true,
      claimedAt: toTimestamp(rawSnack.claimedAt)
    };

    if (!snack.unlocked) {
      snack.claimed = false;
      snack.claimedAt = 0;
    }

    const tasks = {
      [TASK_IDS.FLASHCARD]: normalizeTask(rawTasks[TASK_IDS.FLASHCARD]),
      [TASK_IDS.QUESTIONS]: normalizeTask(rawTasks[TASK_IDS.QUESTIONS]),
      [TASK_IDS.ACTIVITY]: normalizeTask(rawTasks[TASK_IDS.ACTIVITY])
    };
    const normalizedHold = normalizeRolloverHold(
      rawPlan.rolloverHold
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
      id,
      profileId,
      day,
      verseId,
      activity,
      earnedStarPegCount: Math.min(
        2,
        toNonNegativeInteger(
          rawPlan.earnedStarPegCount
        )
      ),
      tasks,
      educationalCompletedAt,
      snack,
      rolloverHold
    };
  }

  function createDefaultState() {
    return {
      version: STATE_VERSION,
      activePlan: null,
      stats: createDefaultStats()
    };
  }

  function normalizeState(rawState) {
    const raw = isPlainObject(rawState)
      ? rawState
      : {};

    return {
      version: STATE_VERSION,
      activePlan: normalizePlan(raw.activePlan),
      stats: normalizeStats(raw.stats)
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
    profileId = "",
    day = "",
    verseId = "",
    activity = null,
    now = new Date(),
    random = Math.random,
    idFactory = null
  } = {}) {
    const safeDay = cleanString(day);
    const safeVerseId = cleanString(verseId);
    const safeActivity = normalizeActivity(activity);

    if (!isValidDayKey(safeDay) || !safeVerseId || !safeActivity) {
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

    return {
      id,
      profileId: cleanString(profileId),
      day: safeDay,
      verseId: safeVerseId,
      activity: safeActivity,
      earnedStarPegCount: 0,
      tasks: {
        [TASK_IDS.FLASHCARD]: createDefaultTask(),
        [TASK_IDS.QUESTIONS]: createDefaultTask(),
        [TASK_IDS.ACTIVITY]: createDefaultTask()
      },
      educationalCompletedAt: 0,
      snack: {
        unlocked: false,
        claimed: false,
        claimedAt: 0
      },
      rolloverHold: null
    };
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
    if (!plan?.tasks) return false;

    return Object.values(TASK_IDS).every(taskId =>
      plan.tasks[taskId]?.status === TASK_STATUSES.COMPLETE
    );
  }

  function getPlanProgress(rawPlan) {
    const plan = normalizePlan(rawPlan);
    if (!plan) return null;

    const taskComplete = {
      [TASK_IDS.FLASHCARD]:
        plan.tasks[TASK_IDS.FLASHCARD].status ===
        TASK_STATUSES.COMPLETE,
      [TASK_IDS.QUESTIONS]:
        plan.tasks[TASK_IDS.QUESTIONS].status ===
        TASK_STATUSES.COMPLETE,
      [TASK_IDS.ACTIVITY]:
        plan.tasks[TASK_IDS.ACTIVITY].status ===
        TASK_STATUSES.COMPLETE
    };
    const completeCount = Object.values(
      taskComplete
    ).filter(Boolean).length;
    const educationalComplete =
      plan.educationalCompletedAt > 0 &&
      completeCount === 3;

    return {
      taskComplete,
      completeCount,
      educationalComplete,
      feedingTime:
        educationalComplete &&
        plan.snack.unlocked &&
        !plan.snack.claimed,
      snackClaimed: plan.snack.claimed
    };
  }

  function shouldShowFocusedPlan(rawPlan) {
    const plan = normalizePlan(rawPlan);

    return !!plan && !plan.snack.claimed;
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

    const completedTaskCount =
      Object.values(TASK_IDS).filter(
        (taskId) =>
          plan.tasks[taskId]?.status ===
          TASK_STATUSES.COMPLETE
      ).length;
    const completedEducationalDay =
      plan.educationalCompletedAt > 0 &&
      areEducationalTasksComplete(plan);

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

    Object.values(TASK_IDS).forEach(
      (taskId) => {
        plan.tasks[taskId] =
          createDefaultTask();
      }
    );
    plan.earnedStarPegCount = 0;
    plan.educationalCompletedAt = 0;
    plan.snack = {
      unlocked: false,
      claimed: false,
      claimedAt: 0
    };
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
      plan.snack.unlocked = true;
      return false;
    }

    plan.educationalCompletedAt = now.getTime();
    plan.snack.unlocked = true;

    recordEducationalDayComplete(
      state.stats,
      plan.day
    );

    return true;
  }

  function shouldPreserveOldPlan(plan) {
    return !!normalizeRolloverHold(plan?.rolloverHold);
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

    const plan = createPlan({
      profileId,
      day,
      verseId: pet.verseId,
      activity,
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
    if (!plan || !Object.values(TASK_IDS).includes(taskId)) {
      return null;
    }

    return plan.tasks?.[taskId] || null;
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

    if (!plan || plan.id !== cleanString(planId)) {
      return { state, changed: false, launchToken: "" };
    }

    const task = findTask(plan, taskId);
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

    if (preserveAcrossDay) {
      plan.rolloverHold = {
        taskId,
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

    if (!plan || plan.id !== cleanString(planId)) {
      return { state, changed: false };
    }

    const task = findTask(plan, taskId);
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
    task.pendingData = isPlainObject(pendingData)
      ? cloneJson(pendingData)
      : null;

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

    if (!plan || plan.id !== cleanString(planId)) {
      return {
        state,
        changed: false,
        taskCompleted: false,
        educationalCompleted: false
      };
    }

    const task = findTask(plan, taskId);

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

    task.status = TASK_STATUSES.COMPLETE;
    task.completedAt = now.getTime();
    task.pendingData = null;

    if (
      plan.rolloverHold?.taskId === taskId &&
      plan.rolloverHold.launchToken ===
        task.launchToken
    ) {
      plan.rolloverHold = null;
    }

    state.stats.totalTasks = toNonNegativeInteger(
      state.stats.totalTasks
    ) + 1;

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
      plan.day !== localDayKey(now) ||
      plan.educationalCompletedAt <= 0 ||
      !areEducationalTasksComplete(plan) ||
      !plan.snack.unlocked ||
      plan.snack.claimed
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
    STREAK_BADGE_THRESHOLDS,
    TASK_BADGE_THRESHOLDS,
    BADGE_DEFINITIONS,
    TASK_IDS,
    TASK_STATUSES,
    ACTIVITY_KINDS,
    createDefaultState,
    normalizeState,
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
