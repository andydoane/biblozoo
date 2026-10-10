"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DailyTodo = require("../daily_zoo_todo.js");

const rootDir = path.resolve(__dirname, "..");

function loadRegistry(relativePath, globalName) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: relativePath });
  return sandbox.window[globalName];
}

function loadDailyTodoShellApi() {
  const relativePath =
    "verse_games/shared/daily-todo-shell.js";
  const source = fs.readFileSync(
    path.join(rootDir, relativePath),
    "utf8"
  );
  const sandbox = {
    window: {
      VerseGameShell: {
        renderModeSelect() {},
        renderCompleteScreen() {}
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: relativePath
  });
  return sandbox.window
    .BibloZooDailyTodoShell;
}

function makeVerseProgress({
  status = "happy",
  lastPracticedAt = 1000,
  games = {},
  playground = {}
} = {}) {
  return {
    learnCompleted: true,
    unlockedForTest: true,
    statusForTest: status,
    lastPracticedAt,
    games,
    playground
  };
}

function isPetUnlocked(progress) {
  return progress?.unlockedForTest === true;
}

function getPetStatus(progress) {
  return progress?.statusForTest || "locked";
}

function makeSimpleRegistries() {
  return {
    games: [
      {
        enabled: true,
        manifest: {
          id: "game_a",
          visibleInCarousel: true,
          progressType: "standard",
          modes: ["easy", "medium", "hard"]
        }
      },
      {
        enabled: true,
        manifest: {
          id: "game_b",
          visibleInCarousel: true,
          progressType: "standard",
          modes: ["easy", "medium", "hard"]
        }
      }
    ],
    playground: [
      {
        enabled: true,
        manifest: {
          id: "play_a",
          visibleInCarousel: true,
          modes: ["beginner", "advanced"]
        }
      }
    ]
  };
}

function makePlanState({
  day = "2026-10-05",
  currentStreak = 0,
  bestStreak = 0,
  lastCompletedDay = "",
  totalTasks = 0
} = {}) {
  const state = DailyTodo.createDefaultState();
  state.stats.currentStreak = currentStreak;
  state.stats.bestStreak = bestStreak;
  state.stats.lastCompletedDay = lastCompletedDay;
  state.stats.totalTasks = totalTasks;
  state.activePlan = {
    kind: DailyTodo.PLAN_KINDS.CARE,
    id: `plan-${day}`,
    profileId: "profile-a",
    day,
    verseId: "verse_a",
    requiredTaskIds: [
      DailyTodo.TASK_IDS.REVIEW,
      DailyTodo.TASK_IDS.QUESTIONS,
      DailyTodo.TASK_IDS.ACTIVITY
    ],
    reviewAssignment: {
      kind: DailyTodo.REVIEW_KINDS.FLASHCARD,
      activityId: ""
    },
    activity: {
      kind: DailyTodo.ACTIVITY_KINDS.GAME,
      id: "game_a",
      mode: "easy"
    },
    tasks: {
      review: {
        status: "complete",
        startedAt: 1,
        pendingAt: 2,
        completedAt: 3,
        launchToken: "",
        pendingData: null
      },
      questions: {
        status: "complete",
        startedAt: 1,
        pendingAt: 2,
        completedAt: 3,
        launchToken: "",
        pendingData: null
      },
      activity: {
        status: "pending",
        startedAt: 1,
        pendingAt: 2,
        completedAt: 0,
        launchToken: "token-a",
        pendingData: { newlyEarnedMedal: "silver" }
      }
    },
    educationalCompletedAt: 0,
    snack: {
      unlocked: false,
      claimed: false,
      claimedAt: 0
    },
    rolloverHold: null
  };
  return state;
}

function testLocalDayMath() {
  assert.strictEqual(
    DailyTodo.shiftLocalDayKey("2026-03-08", -1),
    "2026-03-07"
  );
  assert.strictEqual(
    DailyTodo.shiftLocalDayKey("2026-11-01", -1),
    "2026-10-31"
  );
  assert.deepStrictEqual(
    DailyTodo.previousThreeDayKeys("2026-03-10"),
    ["2026-03-09", "2026-03-08", "2026-03-07"]
  );
  assert.strictEqual(
    DailyTodo.dayDifference("2026-03-07", "2026-03-10"),
    3
  );
}

function testPetPriorityAndOldestSelection() {
  const verseList = [
    { id: "happy_old" },
    { id: "hungry_old" },
    { id: "sleeping_new" },
    { id: "sleeping_old" }
  ];

  const progress = {
    verses: {
      happy_old: makeVerseProgress({ status: "happy", lastPracticedAt: 1 }),
      hungry_old: makeVerseProgress({ status: "hungry", lastPracticedAt: 2 }),
      sleeping_new: makeVerseProgress({ status: "sleeping", lastPracticedAt: 20 }),
      sleeping_old: makeVerseProgress({ status: "sleeping", lastPracticedAt: 10 })
    }
  };

  const chosen = DailyTodo.chooseTodaysPet({
    verseList,
    progress,
    isPetUnlocked,
    getPetStatus,
    random: () => 0
  });

  assert.strictEqual(chosen.verseId, "sleeping_old");
}

function testMissingPracticeTimestampIsOldest() {
  const verseList = [
    { id: "with_time" },
    { id: "without_time" }
  ];

  const progress = {
    verses: {
      with_time: makeVerseProgress({ status: "hungry", lastPracticedAt: 100 }),
      without_time: makeVerseProgress({ status: "hungry", lastPracticedAt: 0 })
    }
  };

  const chosen = DailyTodo.chooseTodaysPet({
    verseList,
    progress,
    isPetUnlocked,
    getPetStatus,
    random: () => 0
  });

  assert.strictEqual(chosen.verseId, "without_time");
}

function testExactTieCanRandomize() {
  const verseList = [{ id: "first" }, { id: "second" }];
  const progress = {
    verses: {
      first: makeVerseProgress({ status: "happy", lastPracticedAt: 100 }),
      second: makeVerseProgress({ status: "happy", lastPracticedAt: 100 })
    }
  };

  const chosen = DailyTodo.chooseTodaysPet({
    verseList,
    progress,
    isPetUnlocked,
    getPetStatus,
    random: () => 0.99
  });

  assert.strictEqual(chosen.verseId, "second");
}

function testRegistryPool() {
  const games = loadRegistry(
    "verse_games/registry.js",
    "EXTERNAL_VERSE_GAMES"
  );
  const playground = loadRegistry(
    "verse_playground/registry.js",
    "EXTERNAL_VERSE_PLAYGROUND"
  );

  const pool = DailyTodo.buildActivityPool(games, playground);
  const gameCount = pool.filter(item => item.kind === "game").length;
  const playgroundCount = pool.filter(item => item.kind === "playground").length;

  assert.strictEqual(gameCount, 12);
  assert.strictEqual(playgroundCount, 5);
  assert.strictEqual(pool.length, 17);
}

function testGameDifficultySelection() {
  const activity = {
    kind: "game",
    id: "game_a",
    modes: ["easy", "medium", "hard"]
  };

  assert.strictEqual(
    DailyTodo.chooseGameMode(activity, { games: {} }),
    "easy"
  );

  assert.strictEqual(
    DailyTodo.chooseGameMode(activity, {
      games: { game_a: { easyCompleted: true } }
    }),
    "medium"
  );

  assert.strictEqual(
    DailyTodo.chooseGameMode(activity, {
      games: { game_a: { mediumCompleted: true } }
    }),
    "easy"
  );

  assert.strictEqual(
    DailyTodo.chooseGameMode(activity, {
      games: {
        game_a: {
          easyCompleted: true,
          mediumCompleted: true,
          hardCompleted: true
        }
      }
    }),
    "hard"
  );
}

function testMilestoneDefinitionsAndAssets() {
  assert.deepStrictEqual(
    DailyTodo.STREAK_BADGE_THRESHOLDS,
    [3, 7, 14, 28, 50, 100, 200, 300, 365]
  );
  assert.deepStrictEqual(
    DailyTodo.TASK_BADGE_THRESHOLDS,
    [
      10, 25, 50, 100, 200, 300, 400,
      500, 600, 700, 800, 900, 1000
    ]
  );

  const definitions = [
    ...DailyTodo.BADGE_DEFINITIONS.streak,
    ...DailyTodo.BADGE_DEFINITIONS.tasks
  ];

  for (const badge of definitions) {
    assert.ok(badge.id);
    assert.ok(badge.label);
    assert.ok(
      fs.existsSync(
        path.join(
          rootDir,
          "verse_images/daily_zoo_todo",
          badge.asset
        )
      ),
      `Missing badge asset: ${badge.asset}`
    );
  }
}

function testMilestoneBoundaries() {
  for (
    const threshold of
      DailyTodo.STREAK_BADGE_THRESHOLDS
  ) {
    const below =
      DailyTodo.getEarnedBadgeDefinitions({
        bestStreak: threshold - 1
      });
    const at =
      DailyTodo.getEarnedBadgeDefinitions({
        bestStreak: threshold
      });

    assert.strictEqual(
      below.streak.some(
        (badge) =>
          badge.threshold === threshold
      ),
      false
    );
    assert.strictEqual(
      at.streak.some(
        (badge) =>
          badge.threshold === threshold
      ),
      true
    );
  }

  for (
    const threshold of
      DailyTodo.TASK_BADGE_THRESHOLDS
  ) {
    const below =
      DailyTodo.getEarnedBadgeDefinitions({
        totalTasks: threshold - 1
      });
    const at =
      DailyTodo.getEarnedBadgeDefinitions({
        totalTasks: threshold
      });

    assert.strictEqual(
      below.tasks.some(
        (badge) =>
          badge.threshold === threshold
      ),
      false
    );
    assert.strictEqual(
      at.tasks.some(
        (badge) =>
          badge.threshold === threshold
      ),
      true
    );
  }
}

function testDailyGameUsesSharedDefaultModes() {
  const shell = loadDailyTodoShellApi();
  const context = {
    dailyActivityKind: "game",
    dailyActivityId: "bible_bugs",
    dailyActivityMode: "medium"
  };

  assert.strictEqual(
    shell.resolveAssignedMode(
      context,
      {}
    ),
    "medium"
  );
  assert.strictEqual(
    shell.resolveAssignedMode(
      {
        ...context,
        dailyActivityMode: "unknown"
      },
      {}
    ),
    ""
  );
}

function testPlaygroundModes() {
  const activity = {
    kind: "playground",
    id: "play_a",
    modes: ["beginner", "advanced"]
  };

  assert.strictEqual(
    DailyTodo.choosePlaygroundMode(activity, { playground: {} }),
    "beginner"
  );

  assert.strictEqual(
    DailyTodo.choosePlaygroundMode(activity, {
      playground: { play_a: true }
    }),
    "advanced"
  );

  assert.strictEqual(
    DailyTodo.choosePlaygroundMode(
      { kind: "playground", id: "no_modes", modes: [] },
      { playground: {} }
    ),
    ""
  );
}

function testUnfinishedContentWins() {
  const pool = [
    { kind: "game", id: "done", modes: ["easy", "medium", "hard"] },
    { kind: "game", id: "unfinished", modes: ["easy", "medium", "hard"] }
  ];

  const verseProgress = {
    games: {
      done: {
        easyCompleted: true,
        mediumCompleted: true,
        hardCompleted: true
      },
      unfinished: {
        easyCompleted: true,
        mediumCompleted: false,
        hardCompleted: false
      }
    }
  };

  const assignment = DailyTodo.chooseActivityAssignment({
    pool,
    verseProgress,
    recentAssignments: [
      { day: "2026-10-04", kind: "game", id: "unfinished", mode: "medium" }
    ],
    day: "2026-10-05",
    random: () => 0
  });

  assert.strictEqual(assignment.id, "unfinished");
  assert.strictEqual(assignment.mode, "medium");
}

function testRecentAssignmentAvoidance() {
  const pool = [
    { kind: "game", id: "recent", modes: ["easy", "medium", "hard"] },
    { kind: "game", id: "fresh", modes: ["easy", "medium", "hard"] }
  ];

  const assignment = DailyTodo.chooseActivityAssignment({
    pool,
    verseProgress: { games: {} },
    recentAssignments: [
      { day: "2026-10-04", kind: "game", id: "recent", mode: "easy" }
    ],
    day: "2026-10-05",
    random: () => 0
  });

  assert.strictEqual(assignment.id, "fresh");
}

function testEverythingCompleteFallback() {
  const pool = [
    { kind: "game", id: "game_a", modes: ["easy", "medium", "hard"] },
    { kind: "playground", id: "play_a", modes: ["beginner", "advanced"] }
  ];

  const verseProgress = {
    games: {
      game_a: {
        easyCompleted: true,
        mediumCompleted: true,
        hardCompleted: true
      }
    },
    playground: { play_a: true }
  };

  const gameAssignment = DailyTodo.chooseActivityAssignment({
    pool: [pool[0]],
    verseProgress,
    day: "2026-10-05",
    random: () => 0
  });
  assert.strictEqual(gameAssignment.mode, "hard");

  const playgroundAssignment = DailyTodo.chooseActivityAssignment({
    pool: [pool[1]],
    verseProgress,
    day: "2026-10-05",
    random: () => 0
  });
  assert.strictEqual(playgroundAssignment.mode, "advanced");
}

function testPlanGenerationAndProfileIndependence() {
  const registries = makeSimpleRegistries();
  const verseList = [{ id: "verse_a" }];
  const now = new Date(2026, 9, 5, 12, 0, 0);

  const progressA = {
    verses: {
      verse_a: makeVerseProgress({ status: "happy", lastPracticedAt: 1 })
    }
  };
  const progressB = {
    verses: {
      verse_a: makeVerseProgress({ status: "happy", lastPracticedAt: 1 })
    }
  };

  const resultA = DailyTodo.getOrCreatePlan({
    progress: progressA,
    profileId: "profile-a",
    verseList,
    gameRegistry: registries.games,
    playgroundRegistry: registries.playground,
    isPetUnlocked,
    getPetStatus,
    now,
    random: () => 0,
    idFactory: () => "plan-a"
  });

  const resultB = DailyTodo.getOrCreatePlan({
    progress: progressB,
    profileId: "profile-b",
    verseList,
    gameRegistry: registries.games,
    playgroundRegistry: registries.playground,
    isPetUnlocked,
    getPetStatus,
    now,
    random: () => 0,
    idFactory: () => "plan-b"
  });

  assert.strictEqual(resultA.plan.id, "plan-a");
  assert.strictEqual(resultB.plan.id, "plan-b");
  assert.strictEqual(resultA.plan.profileId, "profile-a");
  assert.strictEqual(resultB.plan.profileId, "profile-b");

  resultA.state.stats.totalTasks = 9;
  assert.strictEqual(resultB.state.stats.totalTasks, 0);

  const repeatA = DailyTodo.getOrCreatePlan({
    progress: progressA,
    profileId: "profile-a",
    verseList,
    gameRegistry: registries.games,
    playgroundRegistry: registries.playground,
    isPetUnlocked,
    getPetStatus,
    now,
    random: () => 0,
    idFactory: () => "should-not-be-used"
  });

  assert.strictEqual(repeatA.plan.id, "plan-a");
  assert.strictEqual(repeatA.created, false);

  const mismatchedProgress = JSON.parse(JSON.stringify(progressA));
  const repairedProfile = DailyTodo.getOrCreatePlan({
    progress: mismatchedProgress,
    profileId: "profile-b",
    verseList,
    gameRegistry: registries.games,
    playgroundRegistry: registries.playground,
    isPetUnlocked,
    getPetStatus,
    now,
    random: () => 0,
    idFactory: () => "profile-b-replacement"
  });

  assert.strictEqual(repairedProfile.created, true);
  assert.strictEqual(repairedProfile.plan.id, "profile-b-replacement");
  assert.strictEqual(repairedProfile.plan.profileId, "profile-b");
}

function testPersistedPlanUsesProfileScopedProgress() {
  const registries = makeSimpleRegistries();
  const stores = {
    "profile-a": {
      verses: {
        verse_a: makeVerseProgress({ status: "happy", lastPracticedAt: 1 })
      }
    },
    "profile-b": {
      verses: {
        verse_a: makeVerseProgress({ status: "happy", lastPracticedAt: 1 })
      }
    }
  };

  function run(profileId, planId) {
    return DailyTodo.getOrCreatePersistedPlan({
      loadProgress: () => JSON.parse(JSON.stringify(stores[profileId])),
      saveProgress: progress => {
        stores[profileId] = JSON.parse(JSON.stringify(progress));
        return true;
      },
      profileId,
      verseList: [{ id: "verse_a" }],
      gameRegistry: registries.games,
      playgroundRegistry: registries.playground,
      isPetUnlocked,
      getPetStatus,
      now: new Date(2026, 9, 5, 12, 0, 0),
      random: () => 0,
      idFactory: () => planId
    });
  }

  const resultA = run("profile-a", "persisted-a");
  const resultB = run("profile-b", "persisted-b");

  assert.strictEqual(resultA.ok, true);
  assert.strictEqual(resultB.ok, true);
  assert.strictEqual(stores["profile-a"].dailyZooTodo.activePlan.id, "persisted-a");
  assert.strictEqual(stores["profile-b"].dailyZooTodo.activePlan.id, "persisted-b");
  assert.notDeepStrictEqual(
    stores["profile-a"].dailyZooTodo.activePlan,
    stores["profile-b"].dailyZooTodo.activePlan
  );
}

function testNoUnlockedPetCreatesNoPlan() {
  const registries = makeSimpleRegistries();
  const progress = {
    verses: {
      verse_a: {
        learnCompleted: false,
        unlockedForTest: false,
        statusForTest: "locked",
        games: {}
      }
    }
  };

  const result = DailyTodo.getOrCreatePlan({
    progress,
    profileId: "profile-a",
    verseList: [{ id: "verse_a" }],
    gameRegistry: registries.games,
    playgroundRegistry: registries.playground,
    isPetUnlocked,
    getPetStatus,
    now: new Date(2026, 9, 5, 12, 0, 0)
  });

  assert.strictEqual(result.plan, null);
}

function testRolloverCreatesFreshPlan() {
  const registries = makeSimpleRegistries();
  const progress = {
    verses: {
      verse_a: makeVerseProgress({ status: "happy", lastPracticedAt: 1 })
    },
    dailyZooTodo: {
      version: 1,
      activePlan: {
        id: "old-plan",
        profileId: "profile-a",
        day: "2026-10-04",
        verseId: "verse_a",
        activity: { kind: "game", id: "game_a", mode: "easy" },
        tasks: {
          flashcard: { status: "open" },
          questions: { status: "open" },
          activity: { status: "open" }
        },
        educationalCompletedAt: 0,
        snack: { unlocked: false, claimed: false },
        rolloverHold: null
      },
      stats: {
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedDay: "",
        totalTasks: 0,
        recentAssignments: []
      }
    }
  };

  const result = DailyTodo.getOrCreatePlan({
    progress,
    profileId: "profile-a",
    verseList: [{ id: "verse_a" }],
    gameRegistry: registries.games,
    playgroundRegistry: registries.playground,
    isPetUnlocked,
    getPetStatus,
    now: new Date(2026, 9, 5, 12, 0, 0),
    random: () => 0,
    idFactory: () => "new-plan"
  });

  assert.strictEqual(result.created, true);
  assert.strictEqual(result.plan.id, "new-plan");
  assert.strictEqual(result.plan.day, "2026-10-05");
}

function testOldDayActiveFlowPreservation() {
  let state = DailyTodo.createDefaultState();
  state.activePlan = {
    id: "old-plan",
    profileId: "profile-a",
    day: "2026-10-04",
    verseId: "verse_a",
    activity: { kind: "game", id: "game_a", mode: "easy" },
    tasks: {
      flashcard: { status: "open" },
      questions: { status: "open" },
      activity: { status: "open" }
    },
    educationalCompletedAt: 0,
    snack: { unlocked: false, claimed: false },
    rolloverHold: null
  };

  const started = DailyTodo.beginTask(state, {
    planId: "old-plan",
    taskId: "activity",
    preserveAcrossDay: true,
    now: new Date(2026, 9, 4, 23, 58, 0),
    random: () => 0
  });
  state = started.state;

  const held = DailyTodo.expireOldPlanIfNeeded(
    state,
    "2026-10-05"
  );

  assert.strictEqual(held.preserved, true);
  assert.strictEqual(held.state.activePlan.id, "old-plan");

  const released = DailyTodo.releaseRolloverHold(held.state, {
    planId: "old-plan",
    launchToken: started.launchToken
  });

  const expired = DailyTodo.expireOldPlanIfNeeded(
    released.state,
    "2026-10-05"
  );

  assert.strictEqual(expired.expired, true);
  assert.strictEqual(expired.state.activePlan, null);
}

function testConfirmationReleasesRolloverHold() {
  let state = makePlanState({
    day: "2026-10-05"
  });

  state.activePlan.rolloverHold = {
    taskId: "activity",
    launchToken: "token-a",
    startedAt: 1
  };

  const confirmed =
    DailyTodo.confirmPendingCompletion(
      state,
      {
        planId: state.activePlan.id,
        taskId: "activity",
        now: new Date(
          2026,
          9,
          5,
          18,
          0,
          0
        )
      }
    );

  assert.strictEqual(
    confirmed.taskCompleted,
    true
  );
  assert.strictEqual(
    confirmed.state.activePlan
      .rolloverHold,
    null
  );

  const nextDay =
    DailyTodo.expireOldPlanIfNeeded(
      confirmed.state,
      "2026-10-06"
    );

  assert.strictEqual(nextDay.expired, true);
  assert.strictEqual(
    nextDay.state.activePlan,
    null
  );
}

function testCompletedRolloverHoldSelfHeals() {
  const state = makePlanState({
    day: "2026-10-05"
  });

  state.activePlan.tasks.activity.status =
    "complete";
  state.activePlan.tasks.activity.completedAt =
    3;
  state.activePlan.educationalCompletedAt = 4;
  state.activePlan.snack = {
    unlocked: true,
    claimed: true,
    claimedAt: 5
  };
  state.activePlan.rolloverHold = {
    taskId: "activity",
    launchToken: "token-a",
    startedAt: 1
  };

  const normalized =
    DailyTodo.normalizeState(state);

  assert.strictEqual(
    normalized.activePlan.rolloverHold,
    null
  );

  const nextDay =
    DailyTodo.expireOldPlanIfNeeded(
      state,
      "2026-10-06"
    );

  assert.strictEqual(nextDay.preserved, false);
  assert.strictEqual(nextDay.expired, true);
  assert.strictEqual(
    nextDay.state.activePlan,
    null
  );
}

function testIdempotentTaskConfirmationAndStreak() {
  let state = makePlanState({
    day: "2026-10-05",
    currentStreak: 2,
    bestStreak: 2,
    lastCompletedDay: "2026-10-04",
    totalTasks: 8
  });

  const first = DailyTodo.confirmPendingCompletion(state, {
    planId: "plan-2026-10-05",
    taskId: "activity",
    now: new Date(2026, 9, 5, 18, 0, 0)
  });
  state = first.state;

  assert.strictEqual(first.changed, true);
  assert.strictEqual(first.educationalCompleted, true);
  assert.strictEqual(state.stats.totalTasks, 9);
  assert.strictEqual(state.stats.currentStreak, 3);
  assert.strictEqual(state.stats.bestStreak, 3);
  assert.strictEqual(state.stats.lastCompletedDay, "2026-10-05");
  assert.strictEqual(state.activePlan.snack.unlocked, true);

  const duplicate = DailyTodo.confirmPendingCompletion(state, {
    planId: "plan-2026-10-05",
    taskId: "activity",
    now: new Date(2026, 9, 5, 18, 1, 0)
  });

  assert.strictEqual(duplicate.changed, false);
  assert.strictEqual(duplicate.state.stats.totalTasks, 9);
  assert.strictEqual(duplicate.state.stats.currentStreak, 3);
}

function testStreakResetAfterGapAndBestStreakPersistence() {
  const state = makePlanState({
    day: "2026-10-05",
    currentStreak: 6,
    bestStreak: 10,
    lastCompletedDay: "2026-10-03",
    totalTasks: 20
  });

  const completed = DailyTodo.confirmPendingCompletion(state, {
    planId: "plan-2026-10-05",
    taskId: "activity",
    now: new Date(2026, 9, 5, 18, 0, 0)
  });

  assert.strictEqual(completed.state.stats.currentStreak, 1);
  assert.strictEqual(completed.state.stats.bestStreak, 10);
  assert.strictEqual(completed.state.stats.totalTasks, 21);
}

function testSnackClaimIsOptionalIdempotentAndStatNeutral() {
  const ready = DailyTodo.confirmPendingCompletion(
    makePlanState({
      day: "2026-10-05",
      currentStreak: 2,
      bestStreak: 4,
      lastCompletedDay: "2026-10-04",
      totalTasks: 8
    }),
    {
      planId: "plan-2026-10-05",
      taskId: "activity",
      now: new Date(2026, 9, 5, 18, 0, 0)
    }
  );
  const statsBefore = JSON.parse(
    JSON.stringify(ready.state.stats)
  );

  const claimed = DailyTodo.markSnackClaimed(
    ready.state,
    {
      planId: "plan-2026-10-05",
      now: new Date(2026, 9, 5, 18, 5, 0)
    }
  );

  assert.strictEqual(claimed.changed, true);
  assert.strictEqual(claimed.state.activePlan.snack.claimed, true);
  assert.strictEqual(
    claimed.state.activePlan.snack.claimedAt,
    new Date(2026, 9, 5, 18, 5, 0).getTime()
  );
  assert.deepStrictEqual(claimed.state.stats, statsBefore);

  const duplicate = DailyTodo.markSnackClaimed(
    claimed.state,
    {
      planId: "plan-2026-10-05",
      now: new Date(2026, 9, 5, 18, 6, 0)
    }
  );

  assert.strictEqual(duplicate.changed, false);
  assert.strictEqual(
    duplicate.state.activePlan.snack.claimedAt,
    claimed.state.activePlan.snack.claimedAt
  );
  assert.deepStrictEqual(duplicate.state.stats, statsBefore);

  const expired = DailyTodo.markSnackClaimed(
    ready.state,
    {
      planId: "plan-2026-10-05",
      now: new Date(2026, 9, 6, 0, 1, 0)
    }
  );
  assert.strictEqual(expired.changed, false);

  const uncredited = makePlanState({
    day: "2026-10-05"
  });
  uncredited.activePlan.tasks.activity.status = "complete";
  uncredited.activePlan.snack.unlocked = true;

  const premature = DailyTodo.markSnackClaimed(
    uncredited,
    {
      planId: "plan-2026-10-05",
      now: new Date(2026, 9, 5, 18, 5, 0)
    }
  );
  assert.strictEqual(premature.changed, false);
}

function testCurrentStreakDisplaysZeroAfterMissedDay() {
  const state = DailyTodo.createDefaultState();
  state.stats.currentStreak = 5;
  state.stats.bestStreak = 5;
  state.stats.lastCompletedDay = "2026-10-03";

  const stats = DailyTodo.getStatsForDay(state, "2026-10-05");
  assert.strictEqual(stats.currentStreak, 0);
  assert.strictEqual(stats.bestStreak, 5);
}

function testPendingStateIsDistinctFromComplete() {
  let state = DailyTodo.createDefaultState();
  state.activePlan = {
    id: "plan-a",
    profileId: "profile-a",
    day: "2026-10-05",
    verseId: "verse_a",
    activity: { kind: "game", id: "game_a", mode: "easy" },
    tasks: {
      flashcard: { status: "open" },
      questions: { status: "open" },
      activity: { status: "open" }
    },
    educationalCompletedAt: 0,
    snack: { unlocked: false, claimed: false },
    rolloverHold: null
  };

  const prematurePending = DailyTodo.setPendingCompletion(state, {
    planId: "plan-a",
    taskId: "questions",
    pendingData: { source: "questions" },
    now: new Date(2026, 9, 5, 9, 55, 0)
  });
  assert.strictEqual(prematurePending.changed, false);
  assert.strictEqual(
    prematurePending.state.activePlan.tasks.questions.status,
    "open"
  );

  const started = DailyTodo.beginTask(state, {
    planId: "plan-a",
    taskId: "review",
    now: new Date(2026, 9, 5, 10, 0, 0),
    random: () => 0
  });
  state = started.state;
  assert.strictEqual(state.activePlan.tasks.review.status, "running");

  const pending = DailyTodo.setPendingCompletion(state, {
    planId: "plan-a",
    taskId: "review",
    launchToken: started.launchToken,
    pendingData: { source: "flashcard" },
    now: new Date(2026, 9, 5, 10, 5, 0)
  });
  state = pending.state;

  assert.strictEqual(state.activePlan.tasks.review.status, "pending");
  assert.strictEqual(state.stats.totalTasks, 0);

  const confirmed = DailyTodo.confirmPendingCompletion(state, {
    planId: "plan-a",
    taskId: "review",
    now: new Date(2026, 9, 5, 10, 6, 0)
  });

  assert.strictEqual(confirmed.state.activePlan.tasks.review.status, "complete");
  assert.strictEqual(confirmed.state.stats.totalTasks, 1);
}

function testHomePlanProgressSummary() {
  let state = makePlanState();
  let summary = DailyTodo.getPlanProgress(
    state.activePlan
  );

  assert.deepStrictEqual(summary.taskComplete, {
    review: true,
    questions: true,
    activity: false
  });
  assert.strictEqual(summary.completeCount, 2);
  assert.strictEqual(summary.educationalComplete, false);
  assert.strictEqual(summary.feedingTime, false);
  assert.strictEqual(summary.snackClaimed, false);

  const confirmed = DailyTodo.confirmPendingCompletion(
    state,
    {
      planId: state.activePlan.id,
      taskId: DailyTodo.TASK_IDS.ACTIVITY,
      now: new Date(2026, 9, 5, 12, 0, 0)
    }
  );
  state = confirmed.state;
  summary = DailyTodo.getPlanProgress(
    state.activePlan
  );

  assert.strictEqual(summary.completeCount, 3);
  assert.strictEqual(summary.educationalComplete, true);
  assert.strictEqual(summary.feedingTime, true);

  const claimed = DailyTodo.markSnackClaimed(
    state,
    {
      planId: state.activePlan.id,
      now: new Date(2026, 9, 5, 12, 5, 0)
    }
  );
  summary = DailyTodo.getPlanProgress(
    claimed.state.activePlan
  );

  assert.strictEqual(summary.feedingTime, false);
  assert.strictEqual(summary.snackClaimed, true);
}

function testDailyPlanPresentationRouting() {
  const state = makePlanState();

  assert.strictEqual(
    DailyTodo.shouldShowFocusedPlan(
      state.activePlan
    ),
    true
  );

  state.activePlan.tasks.activity.status =
    "complete";
  state.activePlan.educationalCompletedAt = 4;
  state.activePlan.snack.unlocked = true;

  assert.strictEqual(
    DailyTodo.shouldShowFocusedPlan(
      state.activePlan
    ),
    true
  );

  state.activePlan.snack.claimed = true;
  state.activePlan.snack.claimedAt = 5;

  assert.strictEqual(
    DailyTodo.shouldShowFocusedPlan(
      state.activePlan
    ),
    false
  );
  assert.strictEqual(
    DailyTodo.shouldShowFocusedPlan(null),
    false
  );
}

function testResetActivePlanProgress() {
  let state = makePlanState({
    totalTasks: 7
  });
  const originalAssignment =
    JSON.parse(JSON.stringify(
      state.activePlan.activity
    ));
  state.activePlan.earnedStarPegCount = 2;
  state.activePlan.questionSession = {
    version: 1,
    verseId: state.activePlan.verseId,
    items: [{}, {}, {}]
  };

  const reset =
    DailyTodo.resetActivePlanProgress(
      state,
      {
        planId: state.activePlan.id,
        day: "2026-10-05"
      }
    );

  assert.strictEqual(reset.changed, true);
  assert.deepStrictEqual(
    reset.state.activePlan.activity,
    originalAssignment
  );
  assert.strictEqual(
    reset.state.stats.totalTasks,
    5
  );
  assert.strictEqual(
    reset.state.activePlan.earnedStarPegCount,
    0
  );
  assert.strictEqual(
    reset.state.activePlan.questionSession,
    null
  );
  assert.strictEqual(
    reset.state.activePlan.educationalCompletedAt,
    0
  );
  assert.deepStrictEqual(
    reset.state.activePlan.snack,
    {
      unlocked: false,
      claimed: false,
      claimedAt: 0
    }
  );

  reset.state.activePlan.requiredTaskIds
    .forEach((taskId) => {
      const task =
        reset.state.activePlan.tasks[taskId];
      assert.strictEqual(task.status, "open");
      assert.strictEqual(task.startedAt, 0);
      assert.strictEqual(task.pendingAt, 0);
      assert.strictEqual(task.completedAt, 0);
      assert.strictEqual(task.launchToken, "");
      assert.strictEqual(task.pendingData, null);
    });
}

function testResetCompletedPlanRollsBackToday() {
  const state = makePlanState({
    currentStreak: 4,
    bestStreak: 6,
    lastCompletedDay: "2026-10-05",
    totalTasks: 10
  });

  state.activePlan.tasks.activity = {
    status: "complete",
    startedAt: 1,
    pendingAt: 2,
    completedAt: 3,
    launchToken: "",
    pendingData: null
  };
  state.activePlan.educationalCompletedAt = 4;
  state.activePlan.earnedStarPegCount = 2;
  state.activePlan.snack = {
    unlocked: true,
    claimed: true,
    claimedAt: 5
  };

  const reset =
    DailyTodo.resetActivePlanProgress(
      state,
      {
        planId: state.activePlan.id,
        day: "2026-10-05"
      }
    );

  assert.strictEqual(reset.changed, true);
  assert.strictEqual(
    reset.state.stats.totalTasks,
    7
  );
  assert.strictEqual(
    reset.state.stats.currentStreak,
    3
  );
  assert.strictEqual(
    reset.state.stats.lastCompletedDay,
    "2026-10-04"
  );
  assert.strictEqual(
    reset.state.stats.bestStreak,
    6
  );

  const wrongDay =
    DailyTodo.resetActivePlanProgress(
      state,
      {
        planId: state.activePlan.id,
        day: "2026-10-06"
      }
    );

  assert.strictEqual(wrongDay.changed, false);
}

function testEarnedBadgesNeverDisappear() {
  const state = makePlanState({
    totalTasks: 10
  });

  const reset =
    DailyTodo.resetActivePlanProgress(
      state,
      {
        planId: state.activePlan.id,
        day: "2026-10-05"
      }
    );
  const badges =
    DailyTodo.getEarnedBadgeDefinitions(
      reset.state.stats
    );

  assert.strictEqual(
    reset.state.stats.totalTasks,
    8
  );
  assert.deepStrictEqual(
    reset.state.stats.earnedTaskBadges,
    [10]
  );
  assert.strictEqual(
    badges.tasks.some(
      (badge) => badge.threshold === 10
    ),
    true
  );

  const persistedStreak =
    DailyTodo.getEarnedBadgeDefinitions({
      bestStreak: 2,
      earnedStreakBadges: [3, 999]
    });

  assert.deepStrictEqual(
    persistedStreak.streak.map(
      (badge) => badge.threshold
    ),
    [3]
  );
}

function testVersion2PlanMigratesWithoutLosingWork() {
  const state = DailyTodo.normalizeState({
    version: 2,
    activePlan: {
      id: "legacy-plan",
      profileId: "profile-a",
      day: "2026-10-05",
      verseId: "verse_a",
      activity: {
        kind: "game",
        id: "game_a",
        mode: "medium"
      },
      earnedStarPegCount: 2,
      tasks: {
        flashcard: {
          status: "pending",
          startedAt: 100,
          pendingAt: 200,
          completedAt: 0,
          launchToken: "legacy-token",
          pendingData: {
            planId: "legacy-plan",
            taskId: "flashcard",
            source: "flashcard"
          }
        },
        questions: {
          status: "complete",
          completedAt: 150
        },
        activity: {
          status: "running",
          startedAt: 175,
          launchToken: "activity-token"
        }
      },
      educationalCompletedAt: 0,
      snack: {
        unlocked: false,
        claimed: false,
        claimedAt: 0
      },
      rolloverHold: {
        taskId: "flashcard",
        launchToken: "legacy-token",
        startedAt: 100
      }
    },
    stats: {
      totalTasks: 1
    }
  });

  assert.strictEqual(state.version, 3);
  assert.strictEqual(
    state.activePlan.kind,
    DailyTodo.PLAN_KINDS.CARE
  );
  assert.deepStrictEqual(
    state.activePlan.requiredTaskIds,
    ["review", "questions", "activity"]
  );
  assert.strictEqual(
    state.activePlan.reviewAssignment.kind,
    DailyTodo.REVIEW_KINDS.FLASHCARD
  );
  assert.strictEqual(
    state.activePlan.tasks.review.status,
    "pending"
  );
  assert.strictEqual(
    state.activePlan.tasks.review.launchToken,
    "legacy-token"
  );
  assert.strictEqual(
    state.activePlan.tasks.review.pendingData.taskId,
    "review"
  );
  assert.strictEqual(
    state.activePlan.tasks.flashcard,
    undefined
  );
  assert.strictEqual(
    state.activePlan.tasks.activity.status,
    "running"
  );
  assert.strictEqual(
    state.activePlan.earnedStarPegCount,
    2
  );
  assert.deepStrictEqual(
    state.activePlan.rolloverHold,
    {
      taskId: "review",
      launchToken: "legacy-token",
      startedAt: 100
    }
  );
}

function testTwoTaskPlanProgressAndExactOnceCompletion() {
  let state = DailyTodo.normalizeState({
    version: 3,
    activePlan: {
      kind: "new_pet",
      id: "new-pet-plan",
      profileId: "profile-a",
      day: "2026-10-05",
      verseId: "",
      requiredTaskIds: ["learn", "activity"],
      activity: {
        kind: "game",
        id: "game_a",
        mode: "easy"
      },
      tasks: {
        learn: { status: "open" },
        activity: { status: "open" }
      },
      snack: {
        unlocked: true,
        claimed: false
      }
    }
  });

  let summary = DailyTodo.getPlanProgress(
    state.activePlan
  );
  assert.strictEqual(summary.requiredCount, 2);
  assert.strictEqual(summary.completeCount, 0);
  assert.strictEqual(state.activePlan.snack, null);

  for (const taskId of ["learn", "activity"]) {
    const started = DailyTodo.beginTask(state, {
      planId: "new-pet-plan",
      taskId,
      now: new Date(2026, 9, 5, 10, 0, 0),
      random: () => 0
    });
    const pending = DailyTodo.setPendingCompletion(
      started.state,
      {
        planId: "new-pet-plan",
        taskId,
        launchToken: started.launchToken,
        now: new Date(2026, 9, 5, 10, 5, 0)
      }
    );
    const confirmed =
      DailyTodo.confirmPendingCompletion(
        pending.state,
        {
          planId: "new-pet-plan",
          taskId,
          now: new Date(2026, 9, 5, 10, 6, 0)
        }
      );
    state = confirmed.state;
  }

  summary = DailyTodo.getPlanProgress(
    state.activePlan
  );
  assert.strictEqual(summary.completeCount, 2);
  assert.strictEqual(summary.educationalComplete, true);
  assert.strictEqual(summary.feedingTime, false);
  assert.strictEqual(state.stats.totalTasks, 2);
  assert.strictEqual(state.stats.currentStreak, 1);

  const duplicate =
    DailyTodo.confirmPendingCompletion(state, {
      planId: "new-pet-plan",
      taskId: "activity",
      now: new Date(2026, 9, 5, 10, 7, 0)
    });
  assert.strictEqual(duplicate.changed, false);
  assert.strictEqual(duplicate.state.stats.totalTasks, 2);

  const snack = DailyTodo.markSnackClaimed(
    duplicate.state,
    {
      planId: "new-pet-plan",
      now: new Date(2026, 9, 5, 10, 8, 0)
    }
  );
  assert.strictEqual(snack.changed, false);
}

function testPerVerseHistoryAdvancesOnConfirmationOnly() {
  let state = DailyTodo.createDefaultState();
  state.activePlan = {
    kind: "care",
    id: "history-plan",
    profileId: "profile-a",
    day: "2026-10-05",
    verseId: "verse_a",
    requiredTaskIds: [
      "review",
      "questions",
      "activity"
    ],
    reviewAssignment: {
      kind: "read",
      activityId: "balloons"
    },
    activity: {
      kind: "game",
      id: "game_a",
      mode: "easy"
    },
    tasks: {
      review: { status: "open" },
      questions: { status: "open" },
      activity: { status: "open" }
    },
    educationalCompletedAt: 0,
    snack: {
      unlocked: false,
      claimed: false,
      claimedAt: 0
    }
  };

  const launched = DailyTodo.beginTask(state, {
    planId: "history-plan",
    taskId: "questions",
    now: new Date(2026, 9, 5, 9, 0, 0),
    random: () => 0
  });
  state = launched.state;
  assert.deepStrictEqual(state.byVerse, {});

  const questionPending =
    DailyTodo.setPendingCompletion(state, {
      planId: "history-plan",
      taskId: "questions",
      launchToken: launched.launchToken,
      pendingData: {
        generatedQuestionTypes: [
          "missing_word",
          "application"
        ]
      },
      now: new Date(2026, 9, 5, 9, 5, 0)
    });
  assert.deepStrictEqual(
    questionPending.state.byVerse,
    {}
  );

  const questionConfirmed =
    DailyTodo.confirmPendingCompletion(
      questionPending.state,
      {
        planId: "history-plan",
        taskId: "questions",
        now: new Date(2026, 9, 5, 9, 6, 0)
      }
    );
  state = questionConfirmed.state;
  assert.strictEqual(
    state.byVerse.verse_a.questionsCompleted,
    1
  );
  assert.deepStrictEqual(
    state.byVerse.verse_a
      .recentGeneratedQuestionTypes,
    ["missing_word", "application"]
  );

  const readStarted = DailyTodo.beginTask(state, {
    planId: "history-plan",
    taskId: "review",
    now: new Date(2026, 9, 5, 9, 10, 0),
    random: () => 0
  });
  const readPending = DailyTodo.setPendingCompletion(
    readStarted.state,
    {
      planId: "history-plan",
      taskId: "review",
      launchToken: readStarted.launchToken,
      now: new Date(2026, 9, 5, 9, 15, 0)
    }
  );
  const readConfirmed =
    DailyTodo.confirmPendingCompletion(
      readPending.state,
      {
        planId: "history-plan",
        taskId: "review",
        now: new Date(2026, 9, 5, 9, 16, 0)
      }
    );
  state = readConfirmed.state;
  assert.strictEqual(
    state.byVerse.verse_a.readActivities
      .balloons.completedCount,
    1
  );
  assert.strictEqual(
    state.byVerse.verse_a.readActivities
      .balloons.lastCompletedAt,
    new Date(2026, 9, 5, 9, 16, 0)
      .getTime()
  );

  const activityStarted = DailyTodo.beginTask(
    state,
    {
      planId: "history-plan",
      taskId: "activity",
      now: new Date(2026, 9, 5, 9, 20, 0),
      random: () => 0
    }
  );
  const activityPending =
    DailyTodo.setPendingCompletion(
      activityStarted.state,
      {
        planId: "history-plan",
        taskId: "activity",
        launchToken:
          activityStarted.launchToken,
        now: new Date(2026, 9, 5, 9, 25, 0)
      }
    );
  const activityConfirmed =
    DailyTodo.confirmPendingCompletion(
      activityPending.state,
      {
        planId: "history-plan",
        taskId: "activity",
        now: new Date(2026, 9, 5, 9, 26, 0)
      }
    );
  state = activityConfirmed.state;
  assert.strictEqual(
    state.byVerse.verse_a.completedDailyTodos,
    1
  );

  const duplicate =
    DailyTodo.confirmPendingCompletion(state, {
      planId: "history-plan",
      taskId: "activity",
      now: new Date(2026, 9, 5, 9, 27, 0)
    });
  assert.strictEqual(
    duplicate.state.byVerse.verse_a
      .completedDailyTodos,
    1
  );
  assert.strictEqual(
    duplicate.state.byVerse.verse_a
      .questionsCompleted,
    1
  );
}

function testReadActivityAssignmentRotation() {
  const activities = [
    { id: "typewriter", enabled: true },
    { id: "balloons", enabled: true },
    { id: "fish", enabled: false },
    { id: "not_real", enabled: true }
  ];
  const history = {
    readActivities: {
      typewriter: {
        completedCount: 2,
        lastCompletedAt: 300
      },
      balloons: {
        completedCount: 0,
        lastCompletedAt: 0
      }
    }
  };

  assert.deepStrictEqual(
    DailyTodo.chooseReadActivityAssignment({
      activities,
      verseHistory: history,
      random: () => 0
    }),
    {
      kind: "read",
      activityId: "balloons"
    }
  );

  history.readActivities.balloons = {
    completedCount: 1,
    lastCompletedAt: 100
  };

  assert.deepStrictEqual(
    DailyTodo.chooseReadActivityAssignment({
      activities,
      verseHistory: history,
      random: () => 0
    }),
    {
      kind: "read",
      activityId: "balloons"
    }
  );

  const normalized = DailyTodo.normalizeState({
    activePlan: {
      kind: "care",
      id: "saved-read-plan",
      profileId: "profile-a",
      day: "2026-10-05",
      verseId: "verse_a",
      requiredTaskIds: [
        "review",
        "questions",
        "activity"
      ],
      reviewAssignment: {
        kind: "read",
        activityId: "typewriter"
      },
      activity: {
        kind: "game",
        id: "game_a",
        mode: "easy"
      },
      tasks: {
        review: { status: "open" },
        questions: { status: "open" },
        activity: { status: "open" }
      }
    }
  });

  assert.deepStrictEqual(
    normalized.activePlan.reviewAssignment,
    {
      kind: "read",
      activityId: "typewriter"
    }
  );
}

function testReadReadFlashcardCadence() {
  const activities = [
    {
      id: "typewriter",
      enabled: true,
      eligible: true
    },
    {
      id: "chunk_sequence",
      enabled: true,
      eligible: true
    }
  ];

  [
    [0, "read"],
    [1, "read"],
    [2, "flashcard"],
    [3, "read"],
    [4, "read"],
    [5, "flashcard"]
  ].forEach(([completedDailyTodos, kind]) => {
    const assignment =
      DailyTodo.chooseReviewAssignment({
        verseHistory: {
          completedDailyTodos
        },
        activities,
        random: () => 0
      });

    assert.strictEqual(
      assignment.kind,
      kind
    );
  });

  assert.deepStrictEqual(
    DailyTodo.chooseReviewAssignment({
      verseHistory: {
        completedDailyTodos: 0
      },
      activities: [],
      random: () => 0
    }),
    {
      kind: "flashcard",
      activityId: ""
    }
  );

  const registries = makeSimpleRegistries();
  const progress = {
    verses: {
      verse_a: makeVerseProgress()
    },
    dailyZooTodo: {
      byVerse: {
        verse_a: {
          completedDailyTodos: 1
        }
      }
    }
  };
  const created = DailyTodo.getOrCreatePlan({
    progress,
    profileId: "profile-a",
    verseList: [{ id: "verse_a" }],
    gameRegistry: registries.games,
    playgroundRegistry:
      registries.playground,
    isPetUnlocked,
    getPetStatus,
    getReadActivitiesForVerse:
      () => activities,
    now: new Date(2026, 9, 5, 12),
    random: () => 0,
    idFactory: () => "cadence-plan"
  });

  assert.deepStrictEqual(
    created.plan.reviewAssignment,
    {
      kind: "read",
      activityId: "typewriter"
    }
  );

  const reloaded =
    DailyTodo.getOrCreatePlan({
      progress,
      profileId: "profile-a",
      verseList: [{ id: "verse_a" }],
      gameRegistry: registries.games,
      playgroundRegistry:
        registries.playground,
      isPetUnlocked,
      getPetStatus,
      getReadActivitiesForVerse:
        () => [
          {
            id: "balloons",
            enabled: true,
            eligible: true
          }
        ],
      now: new Date(2026, 9, 5, 13),
      random: () => 0.99
    });

  assert.strictEqual(reloaded.created, false);
  assert.deepStrictEqual(
    reloaded.plan.reviewAssignment,
    created.plan.reviewAssignment
  );
}

function testDefensiveNormalization() {
  const state = DailyTodo.normalizeState({
    version: 999,
    activePlan: { broken: true },
    stats: {
      currentStreak: -10,
      bestStreak: "not-a-number",
      totalTasks: -3,
      recentAssignments: [null, { day: "bad", id: "x" }]
    },
    byVerse: {
      verse_a: {
        completedDailyTodos: -2,
        questionsCompleted: "3.9",
        recentGeneratedQuestionTypes: [
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven"
        ],
        readActivities: {
          balloons: {
            completedCount: -1,
            lastCompletedAt: "bad"
          }
        }
      }
    }
  });

  assert.strictEqual(state.version, DailyTodo.STATE_VERSION);
  assert.strictEqual(state.activePlan, null);
  assert.strictEqual(state.stats.currentStreak, 0);
  assert.strictEqual(state.stats.bestStreak, 0);
  assert.strictEqual(state.stats.totalTasks, 0);
  assert.deepStrictEqual(state.stats.recentAssignments, []);
  assert.strictEqual(
    state.byVerse.verse_a.completedDailyTodos,
    0
  );
  assert.strictEqual(
    state.byVerse.verse_a.questionsCompleted,
    3
  );
  assert.deepStrictEqual(
    state.byVerse.verse_a
      .recentGeneratedQuestionTypes,
    ["two", "three", "four", "five", "six", "seven"]
  );
  assert.deepStrictEqual(
    state.byVerse.verse_a.readActivities
      .balloons,
    {
      completedCount: 0,
      lastCompletedAt: 0
    }
  );
}

function main() {
  const tests = [
    testLocalDayMath,
    testPetPriorityAndOldestSelection,
    testMissingPracticeTimestampIsOldest,
    testExactTieCanRandomize,
    testRegistryPool,
    testGameDifficultySelection,
    testMilestoneDefinitionsAndAssets,
    testMilestoneBoundaries,
    testDailyGameUsesSharedDefaultModes,
    testPlaygroundModes,
    testUnfinishedContentWins,
    testRecentAssignmentAvoidance,
    testEverythingCompleteFallback,
    testPlanGenerationAndProfileIndependence,
    testPersistedPlanUsesProfileScopedProgress,
    testNoUnlockedPetCreatesNoPlan,
    testRolloverCreatesFreshPlan,
    testOldDayActiveFlowPreservation,
    testConfirmationReleasesRolloverHold,
    testCompletedRolloverHoldSelfHeals,
    testIdempotentTaskConfirmationAndStreak,
    testSnackClaimIsOptionalIdempotentAndStatNeutral,
    testStreakResetAfterGapAndBestStreakPersistence,
    testCurrentStreakDisplaysZeroAfterMissedDay,
    testPendingStateIsDistinctFromComplete,
    testHomePlanProgressSummary,
    testDailyPlanPresentationRouting,
    testResetActivePlanProgress,
    testResetCompletedPlanRollsBackToday,
    testEarnedBadgesNeverDisappear,
    testVersion2PlanMigratesWithoutLosingWork,
    testTwoTaskPlanProgressAndExactOnceCompletion,
    testPerVerseHistoryAdvancesOnConfirmationOnly,
    testReadActivityAssignmentRotation,
    testReadReadFlashcardCadence,
    testDefensiveNormalization
  ];

  for (const test of tests) {
    test();
  }

  console.log(`Daily Zoo To-Do validation passed (${tests.length} checks).`);
}

main();
