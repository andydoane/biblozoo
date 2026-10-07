(function (root) {
  "use strict";

  const SOURCE = "daily_todo";
  const RETURN_CONTEXT = "daily_tasks_clipboard";
  const ACTIVITY_TASK_ID = "activity";
  const GAME_TEST_STORAGE_PREFIX =
    "biblozooDailyTodoGameTest:";
  const GAME_TEST_PREVIEW_MODE = "game_test";
  const PLAYGROUND_TEST_STORAGE_PREFIX =
    "biblozooDailyTodoPlaygroundTest:";
  const PLAYGROUND_TEST_PREVIEW_MODE = "playground_test";
  const STANDARD_GAME_TITLES = Object.freeze({
    scramble: "Verse Scramble",
    traffic_tap_external: "Traffic Tap",
    chain: "Verse Launch",
    foodslice: "Food Slice",
    tower_bible: "Tower of Bible",
    verse_snake: "Scripture Snake",
    versey_bird: "Versey Bird",
    dino_dash: "Dino Dash",
    verse_munch: "Verse Munch",
    verse_invaders: "Verse Invaders",
    bible_bugs: "Bible Bugs",
    verse_splat: "Verse Splat"
  });
  const PLAYGROUND_ACTIVITY_TITLES = Object.freeze({
    verse_jam: "Verse Jam",
    scripture_scrub: "Scripture Scrub",
    ghost_writer: "Ghost Writer",
    verse_typer: "Verse Typer",
    wheel_of_bible: "Wheel of Bible"
  });
  const RETURN_KEYS = Object.freeze([
    "todoSource",
    "dailyReturnStatus",
    "dailyProfileId",
    "dailyPlanId",
    "dailyPlanDay",
    "dailyTaskId",
    "dailyLaunchToken",
    "dailyVerseId",
    "dailyActivityKind",
    "dailyActivityId",
    "dailyActivityMode",
    "dailyReturnContext",
    "dailyTest",
    "dailyTestKind",
    "dailyNewMedal",
    "dailyMedalTier"
  ]);

  function clean(value) {
    return String(value ?? "").trim();
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStorageKey(profileId) {
    const safeProfileId = clean(profileId);
    if (!safeProfileId) return "";

    return clean(
      root.BibloZooProfiles
        ?.getProfileProgressStorageKey?.(
          safeProfileId
        )
    ) || `biblozooPwaProgress:${safeProfileId}`;
  }

  function loadProgress(profileId) {
    const key = getStorageKey(profileId);
    if (!key) return null;

    try {
      const raw = root.localStorage?.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;

      return parsed && typeof parsed === "object"
        ? parsed
        : null;
    } catch (err) {
      console.warn(
        "Could not load Daily To-Do return state",
        err
      );
      return null;
    }
  }

  function getGameTestStorageKey(profileId) {
    const safeProfileId = clean(profileId);

    return safeProfileId
      ? `${GAME_TEST_STORAGE_PREFIX}${safeProfileId}`
      : "";
  }

  function getPlaygroundTestStorageKey(profileId) {
    const safeProfileId = clean(profileId);

    return safeProfileId
      ? `${PLAYGROUND_TEST_STORAGE_PREFIX}${safeProfileId}`
      : "";
  }

  function normalizeTestKind(value) {
    return clean(value).toLowerCase() === "playground"
      ? "playground"
      : "game";
  }

  function getTestStorageKey(profileId, testKind) {
    return normalizeTestKind(testKind) === "playground"
      ? getPlaygroundTestStorageKey(profileId)
      : getGameTestStorageKey(profileId);
  }

  function loadTestState(profileId, testKind) {
    const key = getTestStorageKey(profileId, testKind);
    if (!key) return null;

    try {
      const raw = root.localStorage?.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;

      return parsed && typeof parsed === "object"
        ? parsed
        : null;
    } catch (err) {
      console.warn(
        "Could not load Daily activity tester state",
        err
      );
      return null;
    }
  }

  function saveTestState(profileId, state, testKind) {
    const key = getTestStorageKey(profileId, testKind);

    if (!key || !state || typeof state !== "object") {
      return false;
    }

    try {
      root.localStorage?.setItem(
        key,
        JSON.stringify(state)
      );
      return true;
    } catch (err) {
      console.warn(
        "Could not save Daily activity tester state",
        err
      );
      return false;
    }
  }

  function loadGameTestState(profileId) {
    return loadTestState(profileId, "game");
  }

  function saveGameTestState(profileId, state) {
    return saveTestState(profileId, state, "game");
  }

  function saveProgress(profileId, progress) {
    const key = getStorageKey(profileId);

    if (!key || !progress || typeof progress !== "object") {
      return false;
    }

    try {
      root.localStorage?.setItem(
        key,
        JSON.stringify(progress)
      );
      return true;
    } catch (err) {
      console.warn(
        "Could not save Daily To-Do return state",
        err
      );
      return false;
    }
  }

  function getReturnData(search = root.location?.search || "") {
    const params = new URLSearchParams(search);

    if (
      params.get("todoSource") !== SOURCE ||
      !params.get("dailyReturnStatus")
    ) {
      return null;
    }

    return {
      status: clean(params.get("dailyReturnStatus")),
      profileId: clean(params.get("dailyProfileId")),
      planId: clean(params.get("dailyPlanId")),
      planDay: clean(params.get("dailyPlanDay")),
      taskId: clean(params.get("dailyTaskId")),
      launchToken: clean(params.get("dailyLaunchToken")),
      verseId: clean(params.get("dailyVerseId")),
      activityKind: clean(params.get("dailyActivityKind")),
      activityId: clean(params.get("dailyActivityId")),
      activityMode: clean(params.get("dailyActivityMode")),
      returnContext: clean(params.get("dailyReturnContext")),
      isTest: params.get("dailyTest") === "1",
      testKind:
        params.get("dailyTest") === "1"
          ? normalizeTestKind(
              params.get("dailyTestKind")
            )
          : "",
      newMedal: params.get("dailyNewMedal") === "1",
      medalTier: clean(params.get("dailyMedalTier"))
    };
  }

  function matchesPersistedLaunch(plan, task, data) {
    return !!plan &&
      !!task &&
      data.profileId === clean(plan.profileId) &&
      data.planId === clean(plan.id) &&
      data.planDay === clean(plan.day) &&
      data.taskId === ACTIVITY_TASK_ID &&
      data.verseId === clean(plan.verseId) &&
      data.activityKind === clean(plan.activity?.kind) &&
      data.activityId === clean(plan.activity?.id) &&
      data.activityMode === clean(plan.activity?.mode) &&
      data.returnContext === RETURN_CONTEXT &&
      data.launchToken === clean(task.launchToken) &&
      task.status === "running";
  }

  function getActivityTitle(activityId, activityKind = "game") {
    const registry = activityKind === "playground"
      ? root.EXTERNAL_VERSE_PLAYGROUND
      : root.EXTERNAL_VERSE_GAMES;
    const list = Array.isArray(registry)
      ? registry
      : [];

    const entry = list.find((item) =>
      item?.enabled !== false &&
      clean(item?.manifest?.id) === clean(activityId)
    );

    const fallbackTitles = activityKind === "playground"
      ? PLAYGROUND_ACTIVITY_TITLES
      : STANDARD_GAME_TITLES;

    return clean(entry?.manifest?.title) ||
      fallbackTitles[clean(activityId)] ||
      "Practice Game";
  }

  function makePendingData(data) {
    const ui = root.BibloZooDailyTodoUI;
    const tier = {
      easy: "bronze",
      medium: "silver",
      hard: "gold"
    }[data.medalTier] || "";

    const values = {
      planId: data.planId,
      taskId: data.taskId,
      source: "daily_todo_external",
      thankYouKey: data.activityId,
      activityId: data.activityId,
      activityKind: data.activityKind,
      activityTitle: getActivityTitle(
        data.activityId,
        data.activityKind
      ),
      newMedal:
        data.activityKind === "game" &&
        data.newMedal && tier
        ? {
            isNew: true,
            tier,
            gameName: getActivityTitle(
              data.activityId,
              data.activityKind
            )
          }
        : null
    };

    return ui?.createPendingCompletionData?.(values) || values;
  }

  function clearReturnParams() {
    if (!root.history || !root.location) return;

    try {
      const url = new URL(root.location.href);
      RETURN_KEYS.forEach((key) =>
        url.searchParams.delete(key)
      );
      root.history.replaceState(
        root.history.state,
        "",
        url.href
      );
    } catch (err) { }
  }

  function processReturn(search = root.location?.search || "") {
    const data = getReturnData(search);
    if (!data) return { handled: false, accepted: false };

    const engine = root.BibloZooDailyTodo;
    const progress = data.isTest
      ? null
      : loadProgress(data.profileId);
    const state = engine?.normalizeState?.(
      data.isTest
        ? loadTestState(
            data.profileId,
            data.testKind
          )
        : progress?.dailyZooTodo
    );
    const plan = state?.activePlan;
    const task = plan?.tasks?.[data.taskId];
    let resultState = state;

    if (
      !engine ||
      (!data.isTest && !progress) ||
      !matchesPersistedLaunch(plan, task, data) ||
      !["success", "quit"].includes(data.status)
    ) {
      clearReturnParams();
      return { handled: true, accepted: false };
    }

    if (data.status === "quit") {
      task.status = "open";
      task.startedAt = 0;
      task.pendingAt = 0;
      task.completedAt = 0;
      task.launchToken = "";
      task.pendingData = null;
      plan.rolloverHold = null;
    } else {
      const pending = engine.setPendingCompletion(
        state,
        {
          planId: data.planId,
          taskId: data.taskId,
          launchToken: data.launchToken,
          pendingData: makePendingData(data),
          now: new Date()
        }
      );

      if (!pending.changed) {
        clearReturnParams();
        return { handled: true, accepted: false };
      }

      resultState = pending.state;
    }

    if (!data.isTest) {
      progress.dailyZooTodo = resultState;
    }

    const saved = data.isTest
      ? saveTestState(
          data.profileId,
          resultState,
          data.testKind
        )
      : saveProgress(
          data.profileId,
          progress
        );

    clearReturnParams();
    return {
      handled: true,
      accepted: saved,
      status: data.status
    };
  }

  function findActivityManifest(activityKind, activityId) {
    const registry = activityKind === "playground"
      ? root.EXTERNAL_VERSE_PLAYGROUND
      : root.EXTERNAL_VERSE_GAMES;
    const list = Array.isArray(registry)
      ? registry
      : [];

    return list.find((entry) =>
      entry?.enabled !== false &&
      clean(entry?.manifest?.id) === clean(activityId)
    )?.manifest || null;
  }

  function findGameManifest(activityId) {
    return findActivityManifest("game", activityId);
  }

  function buildReturnUrl({ testKind = "" } = {}) {
    const safeTestKind = testKind
      ? normalizeTestKind(testKind)
      : "";
    const url = new URL(root.location.href);
    RETURN_KEYS.forEach((key) =>
      url.searchParams.delete(key)
    );
    url.searchParams.delete("v");
    url.searchParams.set("screen", "todo_dev");
    url.searchParams.set(
      "dailyTodoPreview",
      safeTestKind
        ? safeTestKind === "playground"
          ? PLAYGROUND_TEST_PREVIEW_MODE
          : GAME_TEST_PREVIEW_MODE
        : "actual"
    );
    return url.href;
  }

  async function loadVerseIdentity(verseId) {
    try {
      const response = await fetch(
        `verse_data/${encodeURIComponent(verseId)}.json`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      return {
        ref: clean(data.ref),
        translation: clean(data.translation)
      };
    } catch (err) {
      console.warn(
        "Could not load the Daily To-Do verse identity",
        err
      );
      return { ref: "", translation: "" };
    }
  }

  function navigate(href) {
    const transition =
      root.BibloZooAppPageTransitions
        ?.navigateToExternalPage;

    if (typeof transition === "function") {
      return transition(href);
    }

    root.location.href = href;
    return true;
  }

  async function launchAssignedActivity({
    testKind = "",
    expectedKind = ""
  } = {}) {
    const safeTestKind = testKind
      ? normalizeTestKind(testKind)
      : "";
    const isTest = !!safeTestKind;
    const profileId = clean(
      root.BibloZooProfiles
        ?.getActiveProfileId?.()
    );
    const progress = isTest
      ? null
      : loadProgress(profileId);
    const engine = root.BibloZooDailyTodo;
    const state = engine?.normalizeState?.(
      isTest
        ? loadTestState(profileId, safeTestKind)
        : progress?.dailyZooTodo
    );
    const plan = state?.activePlan;
    const taskId = engine?.TASK_IDS?.ACTIVITY || ACTIVITY_TASK_ID;
    const task = plan?.tasks?.[taskId];
    const activity = plan?.activity;

    if (
      !profileId ||
      (!isTest && !progress) ||
      !engine ||
      !plan ||
      plan.profileId !== profileId ||
      !["game", "playground"].includes(activity?.kind) ||
      (expectedKind && activity.kind !== expectedKind) ||
      (isTest && activity.kind !== safeTestKind) ||
      !activity.id ||
      (activity.kind === "game" && !activity.mode) ||
      !task ||
      !["open", "running"].includes(task.status)
    ) {
      return false;
    }

    const manifest = findActivityManifest(
      activity.kind,
      activity.id
    );
    if (!manifest?.launchUrl) return false;

    let launchToken = clean(task.launchToken);

    if (task.status === "open") {
      const started = engine.beginTask(
        state,
        {
          planId: plan.id,
          taskId,
          preserveAcrossDay: true,
          now: new Date()
        }
      );

      if (!started.changed || !started.launchToken) {
        return false;
      }

      launchToken = started.launchToken;

      if (!isTest) {
        progress.dailyZooTodo = started.state;
      }

      const saved = isTest
        ? saveTestState(
            profileId,
            started.state,
            safeTestKind
          )
        : saveProgress(
            profileId,
            progress
          );

      if (!saved) {
        return false;
      }
    }

    if (!launchToken) return false;

    const verse = await loadVerseIdentity(plan.verseId);
    const params = new URLSearchParams({
      verseId: plan.verseId,
      ref: verse.ref,
      translation: verse.translation,
      returnTo: buildReturnUrl({
        testKind: safeTestKind
      }),
      source: "verse_memory_app",
      profileId,
      mode: activity.mode,
      todoSource: SOURCE,
      dailyProfileId: profileId,
      dailyPlanId: plan.id,
      dailyPlanDay: plan.day,
      dailyTaskId: taskId,
      dailyLaunchToken: launchToken,
      dailyVerseId: plan.verseId,
      dailyActivityKind: activity.kind,
      dailyActivityId: activity.id,
      dailyActivityMode: activity.mode,
      dailyReturnContext: RETURN_CONTEXT
    });

    if (isTest) {
      params.set("dailyTest", "1");
      params.set("dailyTestKind", safeTestKind);
    }

    navigate(`${manifest.launchUrl}?${params.toString()}`);
    return true;
  }

  async function launchAssignedGame({
    isTest = false
  } = {}) {
    return launchAssignedActivity({
      testKind: isTest ? "game" : "",
      expectedKind: "game"
    });
  }

  function createGameTestState({
    templatePlan,
    gameId,
    mode
  } = {}) {
    const engine = root.BibloZooDailyTodo;
    const safeGameId = clean(gameId);
    const safeMode = clean(mode).toLowerCase();
    const manifest = findGameManifest(safeGameId);

    if (
      !engine?.normalizeState ||
      !templatePlan ||
      templatePlan.activity == null ||
      !manifest ||
      !["easy", "medium", "hard"].includes(safeMode)
    ) {
      return null;
    }

    const state = engine.normalizeState({});
    const plan = cloneJson(templatePlan);
    const openStatus =
      engine.TASK_STATUSES?.OPEN || "open";

    plan.id = [
      "daily-game-test",
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10)
    ].join("-");
    plan.activity = {
      kind: "game",
      id: safeGameId,
      mode: safeMode
    };

    Object.keys(plan.tasks || {}).forEach((taskId) => {
      plan.tasks[taskId] = {
        ...plan.tasks[taskId],
        status: openStatus,
        startedAt: 0,
        pendingAt: 0,
        completedAt: 0,
        launchToken: "",
        pendingData: null
      };
    });

    plan.educationalCompletedAt = 0;
    plan.snack = {
      ...(plan.snack || {}),
      unlocked: false,
      claimed: false,
      claimedAt: 0
    };
    plan.rolloverHold = null;
    state.activePlan = plan;

    return engine.normalizeState(state);
  }

  async function launchGameTest({
    templatePlan,
    gameId,
    mode
  } = {}) {
    const profileId = clean(
      root.BibloZooProfiles
        ?.getActiveProfileId?.()
    );
    const state = createGameTestState({
      templatePlan,
      gameId,
      mode
    });

    if (
      !profileId ||
      !state?.activePlan ||
      clean(state.activePlan.profileId) !== profileId ||
      !saveGameTestState(profileId, state)
    ) {
      return false;
    }

    return launchAssignedGame({
      isTest: true
    });
  }

  function createPlaygroundTestState({
    templatePlan,
    activityId,
    mode = ""
  } = {}) {
    const engine = root.BibloZooDailyTodo;
    const safeActivityId = clean(activityId);
    const safeMode = clean(mode).toLowerCase();
    const manifest = findActivityManifest(
      "playground",
      safeActivityId
    );
    const modes = Array.isArray(manifest?.modes)
      ? manifest.modes.map((value) =>
          clean(value).toLowerCase()
        ).filter(Boolean)
      : [];

    if (
      !engine?.normalizeState ||
      !templatePlan ||
      templatePlan.activity == null ||
      !manifest ||
      (modes.length > 0 && !modes.includes(safeMode)) ||
      (modes.length === 0 && safeMode)
    ) {
      return null;
    }

    const state = engine.normalizeState({});
    const plan = cloneJson(templatePlan);
    const openStatus =
      engine.TASK_STATUSES?.OPEN || "open";

    plan.id = [
      "daily-playground-test",
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10)
    ].join("-");
    plan.activity = {
      kind: "playground",
      id: safeActivityId,
      mode: safeMode
    };

    Object.keys(plan.tasks || {}).forEach((taskId) => {
      plan.tasks[taskId] = {
        ...plan.tasks[taskId],
        status: openStatus,
        startedAt: 0,
        pendingAt: 0,
        completedAt: 0,
        launchToken: "",
        pendingData: null
      };
    });

    plan.educationalCompletedAt = 0;
    plan.snack = {
      ...(plan.snack || {}),
      unlocked: false,
      claimed: false,
      claimedAt: 0
    };
    plan.rolloverHold = null;
    state.activePlan = plan;

    return engine.normalizeState(state);
  }

  async function launchPlaygroundTest({
    templatePlan,
    activityId,
    mode = ""
  } = {}) {
    const profileId = clean(
      root.BibloZooProfiles
        ?.getActiveProfileId?.()
    );
    const state = createPlaygroundTestState({
      templatePlan,
      activityId,
      mode
    });

    if (
      !profileId ||
      !state?.activePlan ||
      clean(state.activePlan.profileId) !== profileId ||
      !saveTestState(
        profileId,
        state,
        "playground"
      )
    ) {
      return false;
    }

    return launchAssignedActivity({
      testKind: "playground",
      expectedKind: "playground"
    });
  }

  root.document?.addEventListener?.("click", (event) => {
    const row = event.target?.closest?.(
      '[data-daily-todo-preview-task="activity"]'
    );

    const previewMode =
      root.BibloZooDailyTodoUI
        ?.getPreviewMode?.(root.location.search);

    if (
      !row ||
      row.disabled ||
      ![
        "actual",
        GAME_TEST_PREVIEW_MODE,
        PLAYGROUND_TEST_PREVIEW_MODE
      ]
        .includes(previewMode)
    ) {
      return;
    }

    event.preventDefault();
    launchAssignedActivity({
      testKind:
        previewMode === GAME_TEST_PREVIEW_MODE
          ? "game"
          : previewMode === PLAYGROUND_TEST_PREVIEW_MODE
            ? "playground"
            : ""
    });
  });

  const bootReturn = processReturn();

  root.BibloZooDailyTodoParent = Object.freeze({
    SOURCE,
    RETURN_CONTEXT,
    getReturnData,
    matchesPersistedLaunch,
    processReturn,
    createGameTestState,
    createPlaygroundTestState,
    launchAssignedActivity,
    launchAssignedGame,
    launchGameTest,
    launchPlaygroundTest,
    bootReturn
  });
})(window);
