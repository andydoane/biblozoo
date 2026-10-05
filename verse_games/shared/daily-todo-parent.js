(function (root) {
  "use strict";

  const SOURCE = "daily_todo";
  const RETURN_CONTEXT = "daily_tasks_clipboard";
  const ACTIVITY_TASK_ID = "activity";
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
    "dailyNewMedal",
    "dailyMedalTier"
  ]);

  function clean(value) {
    return String(value ?? "").trim();
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

  function getActivityTitle(activityId) {
    const list = Array.isArray(root.EXTERNAL_VERSE_GAMES)
      ? root.EXTERNAL_VERSE_GAMES
      : [];

    const entry = list.find((item) =>
      item?.enabled !== false &&
      clean(item?.manifest?.id) === clean(activityId)
    );

    return clean(entry?.manifest?.title) || "Practice Game";
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
      activityTitle: getActivityTitle(data.activityId),
      newMedal: data.newMedal && tier
        ? {
            isNew: true,
            tier,
            gameName: getActivityTitle(data.activityId)
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
    const progress = loadProgress(data.profileId);
    const state = engine?.normalizeState?.(
      progress?.dailyZooTodo
    );
    const plan = state?.activePlan;
    const task = plan?.tasks?.[data.taskId];

    if (
      !engine ||
      !progress ||
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
      progress.dailyZooTodo = state;
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

      progress.dailyZooTodo = pending.state;
    }

    const saved = saveProgress(
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

  function findGameManifest(activityId) {
    const list = Array.isArray(root.EXTERNAL_VERSE_GAMES)
      ? root.EXTERNAL_VERSE_GAMES
      : [];

    return list.find((entry) =>
      entry?.enabled !== false &&
      clean(entry?.manifest?.id) === clean(activityId)
    )?.manifest || null;
  }

  function buildReturnUrl() {
    const url = new URL(root.location.href);
    RETURN_KEYS.forEach((key) =>
      url.searchParams.delete(key)
    );
    url.searchParams.delete("v");
    url.searchParams.set("screen", "todo_dev");
    url.searchParams.set("dailyTodoPreview", "actual");
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
    root.location.href = href;
  }

  async function launchAssignedGame() {
    const profileId = clean(
      root.BibloZooProfiles
        ?.getActiveProfileId?.()
    );
    const progress = loadProgress(profileId);
    const engine = root.BibloZooDailyTodo;
    const state = engine?.normalizeState?.(
      progress?.dailyZooTodo
    );
    const plan = state?.activePlan;
    const taskId = engine?.TASK_IDS?.ACTIVITY || ACTIVITY_TASK_ID;
    const task = plan?.tasks?.[taskId];
    const activity = plan?.activity;

    if (
      !profileId ||
      !progress ||
      !engine ||
      !plan ||
      plan.profileId !== profileId ||
      activity?.kind !== "game" ||
      !activity.id ||
      !activity.mode ||
      !task ||
      !["open", "running"].includes(task.status)
    ) {
      return false;
    }

    const manifest = findGameManifest(activity.id);
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

      progress.dailyZooTodo = started.state;
      launchToken = started.launchToken;

      if (!saveProgress(profileId, progress)) {
        return false;
      }
    }

    if (!launchToken) return false;

    const verse = await loadVerseIdentity(plan.verseId);
    const params = new URLSearchParams({
      verseId: plan.verseId,
      ref: verse.ref,
      translation: verse.translation,
      returnTo: buildReturnUrl(),
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

    navigate(`${manifest.launchUrl}?${params.toString()}`);
    return true;
  }

  function releaseCompletedRolloverHold(event) {
    const button = event.target?.closest?.(
      '[data-daily-complete-task][data-daily-pending-scope="actual"]'
    );

    if (!button) return;

    const profileId = clean(
      root.BibloZooProfiles
        ?.getActiveProfileId?.()
    );
    const progress = loadProgress(profileId);
    const engine = root.BibloZooDailyTodo;
    const state = engine?.normalizeState?.(
      progress?.dailyZooTodo
    );
    const plan = state?.activePlan;
    const taskId = clean(button.dataset.dailyTaskId);
    const task = plan?.tasks?.[taskId];

    if (
      !progress ||
      !plan ||
      task?.status !== "complete" ||
      !plan.rolloverHold ||
      plan.rolloverHold.taskId !== taskId
    ) {
      return;
    }

    plan.rolloverHold = null;
    progress.dailyZooTodo = state;
    saveProgress(profileId, progress);
  }

  root.document?.addEventListener?.("click", (event) => {
    releaseCompletedRolloverHold(event);

    const row = event.target?.closest?.(
      '[data-daily-todo-preview-task="activity"]'
    );

    if (
      !row ||
      row.disabled ||
      root.BibloZooDailyTodoUI
        ?.getPreviewMode?.(root.location.search) !== "actual"
    ) {
      return;
    }

    event.preventDefault();
    launchAssignedGame();
  });

  const bootReturn = processReturn();

  root.BibloZooDailyTodoParent = Object.freeze({
    SOURCE,
    RETURN_CONTEXT,
    getReturnData,
    matchesPersistedLaunch,
    processReturn,
    launchAssignedGame,
    bootReturn
  });
})(window);
