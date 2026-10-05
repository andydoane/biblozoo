(function (root, factory) {
  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.BibloZooDailyTodoUI = api;
  }
})(typeof window !== "undefined" ? window : null, function (root) {
  "use strict";

  const ASSET_DIR = "verse_images/daily_zoo_todo/";
  const MEDAL_ASSET_DIR = "verse_images/";
  const DEBUG_PENDING_STORAGE_PREFIX =
    "biblozooDailyTodoPendingPreview:";
  const PENDING_DATA_VERSION = 1;
  const PREVIEW_MODES = Object.freeze([
    "open",
    "one",
    "two",
    "ready",
    "actual",
    "toast",
    "debug"
  ]);
  const VALID_MEDAL_TIERS = Object.freeze([
    "bronze",
    "silver",
    "gold"
  ]);
  const THANK_YOU_MESSAGES = Object.freeze({
    flashcard:
      "Thanks for practicing my flashcard, {name}!",
    questions:
      "Thanks for answering my questions, {name}!",
    scramble:
      "You put my verse back together, {name}! Thanks!",
    traffic_tap_external:
      "Thanks for helping me through Traffic Tap, {name}!",
    chain:
      "Thanks for launching my verse, {name}!",
    foodslice:
      "Thanks for slicing through my verse, {name}!",
    tower_bible:
      "Thanks for building my verse tower, {name}!",
    verse_snake:
      "Thanks for guiding Scripture Snake, {name}!",
    versey_bird:
      "Thanks for flying through my verse, {name}!",
    dino_dash:
      "Thanks for dashing through my verse, {name}!",
    verse_munch:
      "Thanks for feeding my verse to Verse Munch, {name}!",
    verse_invaders:
      "Thanks for protecting my verse, {name}!",
    bible_bugs:
      "Thanks for catching those Bible Bugs, {name}!",
    verse_splat:
      "Thanks for splatting through my verse, {name}!",
    verse_jam:
      "Thanks for jamming with my verse, {name}!",
    scripture_scrub:
      "Thanks for uncovering my verse, {name}!",
    ghost_writer:
      "Thanks for writing my verse, {name}!",
    verse_typer:
      "Thanks for typing my verse, {name}!",
    wheel_of_bible:
      "Thanks for spinning through my verse, {name}!"
  });
  const DEFAULT_THANK_YOU_MESSAGE =
    "Thanks for practicing with me, {name}!";

  let lastRenderContext = null;
  let developerLongPressTimer = null;
  let developerLongPressFired = false;
  let developerPointerStart = null;
  let globalBindingsInstalled = false;

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getPreviewMode(search = "") {
    let requested = "";

    try {
      requested = cleanString(
        new URLSearchParams(search).get(
          "dailyTodoPreview"
        )
      ).toLowerCase();
    } catch (err) {
      requested = "";
    }

    return PREVIEW_MODES.includes(requested)
      ? requested
      : "";
  }

  function cloneJson(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function buildDisplayPlan(
    rawPlan,
    mode,
    engine
  ) {
    const plan = cloneJson(rawPlan);
    if (!plan) return null;
    if (
      mode === "actual" ||
      mode === "debug"
    ) {
      return plan;
    }

    const taskIds = engine?.TASK_IDS || {};
    const statuses = engine?.TASK_STATUSES || {};
    const open = statuses.OPEN || "open";
    const complete = statuses.COMPLETE || "complete";
    const ordered = [
      taskIds.FLASHCARD || "flashcard",
      taskIds.QUESTIONS || "questions",
      taskIds.ACTIVITY || "activity"
    ];

    ordered.forEach((taskId) => {
      if (!plan.tasks?.[taskId]) return;

      plan.tasks[taskId] = {
        ...plan.tasks[taskId],
        status: open,
        startedAt: 0,
        pendingAt: 0,
        completedAt: 0,
        launchToken: "",
        pendingData: null
      };
    });

    const completeCount =
      mode === "one"
        ? 1
        : mode === "two"
          ? 2
          : mode === "ready"
            ? 3
            : 0;

    ordered
      .slice(0, completeCount)
      .forEach((taskId) => {
        if (!plan.tasks?.[taskId]) return;
        plan.tasks[taskId].status = complete;
        plan.tasks[taskId].completedAt =
          Date.now();
      });

    const educationalComplete =
      completeCount === ordered.length;

    plan.educationalCompletedAt =
      educationalComplete
        ? Date.now()
        : 0;

    plan.snack = {
      ...(plan.snack || {}),
      unlocked: educationalComplete,
      claimed: false,
      claimedAt: 0
    };
    plan.rolloverHold = null;

    return plan;
  }

  function getActivityManifest(
    activity,
    gameRegistry,
    playgroundRegistry
  ) {
    if (!activity?.id) return null;

    const source =
      activity.kind === "playground"
        ? playgroundRegistry
        : gameRegistry;

    const list = Array.isArray(source)
      ? source
      : [];

    const entry = list.find(
      (item) =>
        item &&
        item.enabled !== false &&
        item.manifest?.id === activity.id
    );

    return entry?.manifest || null;
  }

  function getActiveProfile() {
    return root?.BibloZooProfiles
      ?.getActiveProfile?.() || null;
  }

  function getActiveProfileId() {
    return cleanString(
      root?.BibloZooProfiles
        ?.getActiveProfileId?.()
    );
  }

  function getActiveProfileName() {
    return cleanString(
      getActiveProfile()?.name
    ) || "Zookeeper";
  }

  function getActiveProgressStorageKey() {
    const profileId = getActiveProfileId();

    if (!profileId) return "";

    return cleanString(
      root?.BibloZooProfiles
        ?.getProfileProgressStorageKey?.(
          profileId
        )
    );
  }

  function getDeveloperStorageKey() {
    const profileId = getActiveProfileId();

    return profileId
      ? `${DEBUG_PENDING_STORAGE_PREFIX}${profileId}`
      : "";
  }

  function readStoredJson(key) {
    if (!root?.localStorage || !key) {
      return null;
    }

    try {
      const raw = root.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn(
        "Could not read Daily To-Do completion state",
        err
      );
      return null;
    }
  }

  function writeStoredJson(key, value) {
    if (!root?.localStorage || !key) {
      return false;
    }

    try {
      root.localStorage.setItem(
        key,
        JSON.stringify(value)
      );
      return true;
    } catch (err) {
      console.warn(
        "Could not save Daily To-Do completion state",
        err
      );
      return false;
    }
  }

  function loadActualProgress() {
    return readStoredJson(
      getActiveProgressStorageKey()
    );
  }

  function saveActualState(state) {
    const key = getActiveProgressStorageKey();
    const progress = loadActualProgress();

    if (
      !key ||
      !progress ||
      typeof progress !== "object"
    ) {
      return false;
    }

    progress.dailyZooTodo = state;
    return writeStoredJson(key, progress);
  }

  function loadDeveloperState(engine) {
    const raw = readStoredJson(
      getDeveloperStorageKey()
    );

    if (!raw || !engine?.normalizeState) {
      return null;
    }

    return engine.normalizeState(raw);
  }

  function saveDeveloperState(state) {
    return writeStoredJson(
      getDeveloperStorageKey(),
      state
    );
  }

  function findPendingCompletion(
    plan,
    engine
  ) {
    if (!plan?.tasks) return null;

    const taskIds = engine?.TASK_IDS || {};
    const pendingStatus =
      engine?.TASK_STATUSES?.PENDING ||
      "pending";
    const ordered = [
      taskIds.FLASHCARD || "flashcard",
      taskIds.QUESTIONS || "questions",
      taskIds.ACTIVITY || "activity"
    ];

    const pending = ordered
      .map((taskId) => ({
        taskId,
        task: plan.tasks?.[taskId] || null
      }))
      .filter((entry) => {
        if (
          entry.task?.status !==
          pendingStatus
        ) {
          return false;
        }

        const data =
          entry.task?.pendingData;

        if (
          data?.planId &&
          cleanString(data.planId) !==
            cleanString(plan.id)
        ) {
          return false;
        }

        if (
          data?.taskId &&
          cleanString(data.taskId) !==
            entry.taskId
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          Number(a.task?.pendingAt || 0) -
          Number(b.task?.pendingAt || 0)
      )[0];

    if (!pending) return null;

    return {
      planId: cleanString(plan.id),
      taskId: pending.taskId,
      task: pending.task,
      pendingData:
        pending.task.pendingData &&
        typeof pending.task.pendingData ===
          "object"
          ? pending.task.pendingData
          : null
    };
  }

  function createPendingCompletionData({
    planId = "",
    taskId = "",
    source = "",
    thankYouKey = "",
    activityId = "",
    activityKind = "",
    activityTitle = "",
    newMedal = null,
    extra = null
  } = {}) {
    const data = {
      version: PENDING_DATA_VERSION,
      planId: cleanString(planId),
      taskId: cleanString(taskId),
      source: cleanString(source),
      thankYouKey: cleanString(
        thankYouKey
      )
    };

    const safeActivityId =
      cleanString(activityId);
    const safeActivityKind =
      cleanString(activityKind);
    const safeActivityTitle =
      cleanString(activityTitle);

    if (safeActivityId) {
      data.activityId =
        safeActivityId;
    }

    if (safeActivityKind) {
      data.activityKind =
        safeActivityKind;
    }

    if (safeActivityTitle) {
      data.activityTitle =
        safeActivityTitle;
    }

    if (
      extra &&
      typeof extra === "object" &&
      !Array.isArray(extra)
    ) {
      Object.assign(
        data,
        cloneJson(extra)
      );
    }

    if (
      newMedal &&
      newMedal.isNew === true
    ) {
      const tier = cleanString(
        newMedal.tier
      ).toLowerCase();

      if (
        VALID_MEDAL_TIERS.includes(tier)
      ) {
        data.newMedal = {
          isNew: true,
          tier,
          gameName:
            cleanString(
              newMedal.gameName
            )
        };
      }
    }

    return data;
  }

  function getThankYouMessage(
    key,
    profileName = ""
  ) {
    const template =
      THANK_YOU_MESSAGES[
        cleanString(key)
      ] ||
      DEFAULT_THANK_YOU_MESSAGE;

    const name =
      cleanString(profileName) ||
      "Zookeeper";

    return template.replace(
      /\{name\}/g,
      name
    );
  }

  function getPendingThankYouKey(
    plan,
    pending
  ) {
    const explicitKey = cleanString(
      pending?.pendingData?.thankYouKey
    );

    if (explicitKey) return explicitKey;

    const taskId = cleanString(
      pending?.taskId
    );

    if (
      taskId === "flashcard" ||
      taskId === "questions"
    ) {
      return taskId;
    }

    return cleanString(
      pending?.pendingData?.activityId ||
      plan?.activity?.id
    );
  }

  function getMedalToastData(
    pendingData,
    fallbackGameName = ""
  ) {
    const rawMedal =
      pendingData?.newMedal;

    if (
      !rawMedal ||
      rawMedal.isNew !== true
    ) {
      return null;
    }

    const tier = cleanString(
      rawMedal.tier
    ).toLowerCase();

    if (!VALID_MEDAL_TIERS.includes(tier)) {
      return null;
    }

    const label =
      tier.charAt(0).toUpperCase() +
      tier.slice(1);

    return {
      tier,
      label,
      gameName:
        cleanString(rawMedal.gameName) ||
        cleanString(fallbackGameName) ||
        "Practice Game",
      image:
        `${MEDAL_ASSET_DIR}${tier}_medal.png`
    };
  }

  function renderMedalToastHtml(
    medal,
    {
      held = false
    } = {}
  ) {
    if (!medal) return "";

    return `
      <div
        class="daily-medal-toast${held ? " is-test-held" : ""}"
        role="status"
        aria-live="polite"
      >
        <img
          class="daily-medal-toast-img"
          src="${escapeHtml(medal.image)}"
          alt="${escapeHtml(
            `${medal.label} medal`
          )}"
          draggable="false"
          onerror="this.style.display='none'"
        >

        <div class="daily-medal-toast-copy">
          <div class="daily-medal-toast-label">
            You earned a
            <strong>
              ${escapeHtml(medal.label)}
              Medal
            </strong>
            in
          </div>

          <div class="daily-medal-toast-game">
            ${escapeHtml(medal.gameName)}
          </div>
        </div>
      </div>
    `;
  }

  function renderPendingCompletionHtml({
    plan,
    pending,
    petVisualHtml,
    activityManifest,
    scope
  } = {}) {
    if (!plan || !pending) return "";

    const thankYouKey =
      getPendingThankYouKey(
        plan,
        pending
      );
    const thankYouText =
      getThankYouMessage(
        thankYouKey,
        getActiveProfileName()
      );
    const medal =
      getMedalToastData(
        pending.pendingData,
        activityManifest?.title || ""
      );

    return `
      ${renderMedalToastHtml(
        medal,
        {
          held: scope === "tester"
        }
      )}

      <div
        class="daily-completion-layer"
        data-daily-completion-layer
        data-daily-plan-id="${escapeHtml(
          pending.planId
        )}"
        data-daily-task-id="${escapeHtml(
          pending.taskId
        )}"
      >
        <div
          class="daily-completion-dim"
          aria-hidden="true"
        ></div>

        <section
          class="daily-completion-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Task complete"
        >
          <div
            class="daily-completion-pet"
            aria-hidden="true"
          >
            ${petVisualHtml || "🐾"}
          </div>

          <div class="daily-completion-thanks">
            ${escapeHtml(thankYouText)}
          </div>

          <img
            class="daily-completion-check"
            src="${ASSET_DIR}completion_checkmark.png"
            alt=""
            draggable="false"
            onerror="this.style.display='none'"
          >

          <button
            class="daily-completion-button no-zoom"
            type="button"
            data-ui-sound
            data-daily-complete-task
            data-daily-pending-scope="${escapeHtml(
              scope
            )}"
            data-daily-plan-id="${escapeHtml(
              pending.planId
            )}"
            data-daily-task-id="${escapeHtml(
              pending.taskId
            )}"
          >
            Complete Task
          </button>
        </section>
      </div>
    `;
  }

  function getPendingStateForScope(
    scope,
    engine
  ) {
    if (scope === "debug") {
      return {
        state:
          loadDeveloperState(engine),
        progress: null
      };
    }

    const progress =
      loadActualProgress();

    return {
      state:
        engine?.normalizeState?.(
          progress?.dailyZooTodo
        ) || null,
      progress
    };
  }

  function updateCompletedRow(
    taskId
  ) {
    const row = Array.from(
      root?.document
        ?.querySelectorAll?.(
          ".daily-zoo-todo-row[data-daily-todo-preview-task]"
        ) || []
    ).find(
      (candidate) =>
        cleanString(
          candidate.dataset
            .dailyTodoPreviewTask
        ) === cleanString(taskId)
    );

    if (!row) return;

    row.classList.add("is-complete");
    row.classList.remove("is-faded");
    row.disabled = true;

    const icon =
      row.querySelector(
        ".daily-zoo-todo-row-icon"
      );

    if (icon) {
      icon.innerHTML = `
        <img
          class="daily-zoo-todo-row-img"
          src="${ASSET_DIR}task_checkmark.png"
          alt=""
          draggable="false"
        >
      `;
    }
  }

  function unlockSnackRow() {
    const row = root?.document
      ?.querySelector?.(
        '.daily-zoo-todo-row[data-daily-todo-preview-task="snack"]'
      );

    if (!row) return;

    row.classList.remove("is-faded");
    row.disabled = false;
  }

  function removeCompletionLayer(
    planId,
    taskId
  ) {
    root?.document
      ?.querySelectorAll?.(
        "[data-daily-completion-layer]"
      )
      ?.forEach?.((layer) => {
        if (
          cleanString(
            layer.dataset.dailyPlanId
          ) === cleanString(planId) &&
          cleanString(
            layer.dataset.dailyTaskId
          ) === cleanString(taskId)
        ) {
          layer.remove();
        }
      });
  }

  function clearDeveloperRouteMarker() {
    if (!root?.history || !root?.location) {
      return;
    }

    try {
      const url = new URL(
        root.location.href
      );

      if (
        url.searchParams.get("screen") ===
        "todo_dev"
      ) {
        url.searchParams.delete("screen");

        root.history.replaceState(
          root.history.state,
          "",
          url.href
        );
      }
    } catch (err) { }
  }

  function confirmPendingCompletion(
    button
  ) {
    const engine =
      root?.BibloZooDailyTodo;

    if (
      !engine?.confirmPendingCompletion ||
      !button
    ) {
      return false;
    }

    const scope = cleanString(
      button.dataset.dailyPendingScope
    );
    const planId = cleanString(
      button.dataset.dailyPlanId
    );
    const taskId = cleanString(
      button.dataset.dailyTaskId
    );

    if (scope === "tester") {
      button.disabled = true;

      removeCompletionLayer(
        planId,
        taskId
      );

      root?.document
        ?.querySelectorAll?.(
          ".daily-medal-toast.is-test-held"
        )
        ?.forEach?.((toast) =>
          toast.remove()
        );

      return true;
    }

    const loaded =
      getPendingStateForScope(
        scope,
        engine
      );
    const currentPlan =
      loaded.state?.activePlan;
    const currentPending =
      findPendingCompletion(
        currentPlan,
        engine
      );

    if (
      !currentPlan ||
      currentPlan.id !== planId ||
      !currentPending ||
      currentPending.taskId !== taskId
    ) {
      return false;
    }

    button.disabled = true;

    const confirmed =
      engine.confirmPendingCompletion(
        loaded.state,
        {
          planId,
          taskId,
          now: new Date()
        }
      );

    if (!confirmed.taskCompleted) {
      button.disabled = false;
      return false;
    }

    const saved = scope === "debug"
      ? saveDeveloperState(
          confirmed.state
        )
      : saveActualState(
          confirmed.state
        );

    if (!saved) {
      button.disabled = false;
      return false;
    }

    updateCompletedRow(taskId);

    if (
      confirmed.state?.activePlan
        ?.snack?.unlocked === true
    ) {
      unlockSnackRow();
    }

    removeCompletionLayer(
      planId,
      taskId
    );

    if (scope === "debug") {
      clearDeveloperRouteMarker();
    }

    return true;
  }

  function setDeveloperPreviewUrl() {
    if (!root?.history || !root?.location) {
      return;
    }

    try {
      const url = new URL(
        root.location.href
      );

      url.searchParams.set(
        "dailyTodoPreview",
        "debug"
      );
      url.searchParams.set(
        "screen",
        "todo_dev"
      );

      root.history.replaceState(
        root.history.state,
        "",
        url.href
      );
    } catch (err) { }
  }

  function refreshCurrentPreview() {
    const context =
      lastRenderContext;
    const body = root?.document
      ?.querySelector?.(
        ".todo-dev-screen.is-daily-mode [data-todo-paper-body]"
      );

    if (!context || !body) {
      return false;
    }

    body.innerHTML = renderPreview({
      ...context,
      mode: "debug"
    });

    return true;
  }

  function injectDeveloperPending(
    taskId,
    {
      medalTier = ""
    } = {}
  ) {
    const context =
      lastRenderContext;
    const engine =
      context?.engine;
    const mode =
      getPreviewMode(
        root?.location?.search || ""
      );

    if (
      !context ||
      !engine?.beginTask ||
      !engine?.setPendingCompletion ||
      !["open", "one", "two"].includes(
        mode
      )
    ) {
      return false;
    }

    const displayPlan =
      buildDisplayPlan(
        context.plan,
        mode,
        engine
      );

    const task =
      displayPlan?.tasks?.[taskId];

    if (
      !displayPlan ||
      !task ||
      task.status ===
        (engine.TASK_STATUSES?.COMPLETE ||
          "complete")
    ) {
      return false;
    }

    const actualProgress =
      loadActualProgress();
    let state =
      engine.normalizeState(
        actualProgress?.dailyZooTodo
      );

    state.activePlan =
      cloneJson(displayPlan);

    const started =
      engine.beginTask(
        state,
        {
          planId: displayPlan.id,
          taskId,
          now: new Date(),
          random: () => 0.314159
        }
      );

    if (!started.changed) {
      return false;
    }

    state = started.state;

    const activityId =
      cleanString(
        displayPlan.activity?.id
      );
    const isActivity =
      taskId ===
      (engine.TASK_IDS?.ACTIVITY ||
        "activity");
    const activityManifest =
      context.activityManifest;

    const tier = cleanString(
      medalTier
    ).toLowerCase();

    const pendingData =
      createPendingCompletionData({
        planId: displayPlan.id,
        taskId,
        source:
          "developer_preview",
        thankYouKey:
          isActivity
            ? activityId
            : taskId,
        activityId:
          isActivity
            ? activityId
            : "",
        activityKind:
          isActivity
            ? cleanString(
                displayPlan.activity
                  ?.kind
              )
            : "",
        activityTitle:
          isActivity
            ? cleanString(
                activityManifest?.title
              )
            : "",
        newMedal:
          isActivity &&
          VALID_MEDAL_TIERS.includes(
            tier
          )
            ? {
                isNew: true,
                tier,
                gameName:
                  displayPlan.activity
                    ?.kind === "game"
                    ? cleanString(
                        activityManifest
                          ?.title
                      ) ||
                      "Practice Game"
                    : "Bible Bugs"
              }
            : null
      });

    const pending =
      engine.setPendingCompletion(
        state,
        {
          planId: displayPlan.id,
          taskId,
          launchToken:
            started.launchToken,
          pendingData,
          now: new Date()
        }
      );

    if (!pending.changed) {
      return false;
    }

    if (
      !saveDeveloperState(
        pending.state
      )
    ) {
      return false;
    }

    setDeveloperPreviewUrl();
    return refreshCurrentPreview();
  }

  function getDeveloperMedalTier(
    mode
  ) {
    if (mode === "open") {
      return "bronze";
    }

    if (mode === "one") {
      return "silver";
    }

    if (mode === "two") {
      return "gold";
    }

    return "";
  }

  function clearDeveloperLongPress() {
    if (developerLongPressTimer) {
      clearTimeout(
        developerLongPressTimer
      );
      developerLongPressTimer = null;
    }

    developerPointerStart = null;
  }

  function getPreviewTaskRow(
    target
  ) {
    return target?.closest?.(
      "[data-daily-todo-preview-task]"
    ) || null;
  }

  function handleDocumentClick(
    event
  ) {
    const completeButton =
      event.target?.closest?.(
        "[data-daily-complete-task]"
      );

    if (completeButton) {
      event.preventDefault();
      event.stopPropagation();
      confirmPendingCompletion(
        completeButton
      );
      return;
    }

    const row = getPreviewTaskRow(
      event.target
    );

    if (!row || row.disabled) return;

    if (developerLongPressFired) {
      developerLongPressFired = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const mode =
      getPreviewMode(
        root?.location?.search || ""
      );

    if (
      !["open", "one", "two"].includes(
        mode
      )
    ) {
      return;
    }

    const taskId = cleanString(
      row.dataset.dailyTodoPreviewTask
    );

    if (
      !taskId ||
      taskId === "snack"
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    injectDeveloperPending(
      taskId
    );
  }

  function handlePointerDown(
    event
  ) {
    const row = getPreviewTaskRow(
      event.target
    );

    if (!row || row.disabled) return;

    const engine =
      root?.BibloZooDailyTodo;
    const activityId =
      engine?.TASK_IDS?.ACTIVITY ||
      "activity";
    const taskId = cleanString(
      row.dataset.dailyTodoPreviewTask
    );
    const mode =
      getPreviewMode(
        root?.location?.search || ""
      );

    if (
      taskId !== activityId ||
      !["open", "one", "two"].includes(
        mode
      )
    ) {
      return;
    }

    clearDeveloperLongPress();
    developerLongPressFired = false;
    developerPointerStart = {
      x: Number(event.clientX || 0),
      y: Number(event.clientY || 0)
    };

    developerLongPressTimer =
      setTimeout(() => {
        developerLongPressTimer = null;
        developerLongPressFired = true;

        injectDeveloperPending(
          activityId,
          {
            medalTier:
              getDeveloperMedalTier(
                mode
              )
          }
        );
      }, 1000);
  }

  function handlePointerMove(
    event
  ) {
    if (
      !developerLongPressTimer ||
      !developerPointerStart
    ) {
      return;
    }

    const dx =
      Number(event.clientX || 0) -
      developerPointerStart.x;
    const dy =
      Number(event.clientY || 0) -
      developerPointerStart.y;

    if (Math.hypot(dx, dy) > 12) {
      clearDeveloperLongPress();
    }
  }

  function syncCompletionUiHostClass() {
    const screen = root?.document
      ?.querySelector?.(
        ".todo-dev-screen.is-daily-mode"
      );

    if (!screen) return;

    const hasCompletionUi = !!(
      screen.querySelector(
        ".daily-completion-layer"
      ) ||
      screen.querySelector(
        ".daily-medal-toast"
      )
    );

    screen.classList.toggle(
      "has-daily-completion-ui",
      hasCompletionUi
    );
  }

  function installGlobalBindings() {
    if (
      globalBindingsInstalled ||
      !root?.document
    ) {
      return;
    }

    globalBindingsInstalled = true;

    root.document.addEventListener(
      "click",
      handleDocumentClick,
      true
    );
    root.document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true
    );
    root.document.addEventListener(
      "pointermove",
      handlePointerMove,
      true
    );

    [
      "pointerup",
      "pointercancel"
    ].forEach((eventName) => {
      root.document.addEventListener(
        eventName,
        clearDeveloperLongPress,
        true
      );
    });

    root.document.addEventListener(
      "contextmenu",
      (event) => {
        const row =
          getPreviewTaskRow(
            event.target
          );

        if (row) {
          event.preventDefault();
        }
      },
      true
    );

    root.document.addEventListener(
      "animationend",
      (event) => {
        const toast =
          event.target?.closest?.(
            ".daily-medal-toast"
          );

        if (
          toast &&
          event.animationName ===
            "dailyMedalToastLife"
        ) {
          toast.remove();
        }
      },
      true
    );

    if (root.MutationObserver) {
      const observer =
        new root.MutationObserver(
          syncCompletionUiHostClass
        );

      observer.observe(
        root.document.documentElement,
        {
          childList: true,
          subtree: true
        }
      );
    }
  }

  function taskRowHtml({
    type = "",
    text = "",
    image = "",
    emoji = "✅",
    rowColor = "#7f66c6",
    rowTextColor = "#ffffff",
    status = "open",
    completeStatus = "complete",
    disabled = false,
    faded = false
  } = {}) {
    const isComplete =
      status === completeStatus;

    const displayedImage = isComplete
      ? `${ASSET_DIR}task_checkmark.png`
      : cleanString(image);

    const fallbackEmoji = isComplete
      ? "✓"
      : cleanString(emoji) || "✅";

    const iconHtml = displayedImage
      ? `
        <img
          class="daily-zoo-todo-row-img"
          src="${escapeHtml(displayedImage)}"
          alt=""
          draggable="false"
          onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
        >
        <span
          class="daily-zoo-todo-row-fallback"
          hidden
          aria-hidden="true"
        >${escapeHtml(fallbackEmoji)}</span>
      `
      : `
        <span
          class="daily-zoo-todo-row-fallback"
          aria-hidden="true"
        >${escapeHtml(fallbackEmoji)}</span>
      `;

    const locked = disabled || isComplete;

    return `
      <button
        class="daily-zoo-todo-row no-zoom${isComplete ? " is-complete" : ""}${faded ? " is-faded" : ""}"
        type="button"
        data-ui-sound
        data-daily-todo-preview-task="${escapeHtml(type)}"
        style="--daily-todo-row-bg:${escapeHtml(rowColor)}; --daily-todo-row-text:${escapeHtml(rowTextColor)};"
        aria-label="${escapeHtml(text)}"
        ${locked ? "disabled" : ""}
      >
        <span class="daily-zoo-todo-row-icon">
          ${iconHtml}
        </span>

        <span class="daily-zoo-todo-row-label">
          ${escapeHtml(text)}
        </span>
      </button>
    `;
  }

  function renderPreview({
    mode = "actual",
    plan = null,
    engine = null,
    petName = "",
    petVisualHtml = "",
    gameRegistry = [],
    playgroundRegistry = []
  } = {}) {
    let displayPlan = null;
    let pendingScope = "actual";

    if (mode === "debug") {
      displayPlan =
        loadDeveloperState(
          engine
        )?.activePlan || null;
      pendingScope = "debug";
    } else {
      displayPlan = buildDisplayPlan(
        plan,
        mode,
        engine
      );
    }

    if (!displayPlan) {
      return `
        <div class="daily-zoo-todo-empty">
          Unlock a BibloPet to preview Daily Tasks.
        </div>
      `;
    }

    const taskIds = engine?.TASK_IDS || {};
    const statuses = engine?.TASK_STATUSES || {};
    const completeStatus =
      statuses.COMPLETE || "complete";

    const flashcardId =
      taskIds.FLASHCARD || "flashcard";
    const questionsId =
      taskIds.QUESTIONS || "questions";
    const activityId =
      taskIds.ACTIVITY || "activity";

    if (mode === "toast") {
      displayPlan.activity = {
        kind: "game",
        id: "bible_bugs",
        mode: "hard"
      };

      const toastTask =
        displayPlan.tasks?.[activityId];

      if (toastTask) {
        toastTask.status =
          statuses.PENDING || "pending";
        toastTask.startedAt = Date.now();
        toastTask.pendingAt = Date.now();
        toastTask.completedAt = 0;
        toastTask.launchToken =
          "daily-toast-layer-test";
        toastTask.pendingData =
          createPendingCompletionData({
            planId: displayPlan.id,
            taskId: activityId,
            source:
              "developer_toast_test",
            thankYouKey: "bible_bugs",
            activityId: "bible_bugs",
            activityKind: "game",
            activityTitle: "Bible Bugs",
            newMedal: {
              isNew: true,
              tier: "gold",
              gameName: "Bible Bugs"
            }
          });
      }

      displayPlan.educationalCompletedAt = 0;
      displayPlan.snack = {
        ...(displayPlan.snack || {}),
        unlocked: false,
        claimed: false,
        claimedAt: 0
      };
      pendingScope = "tester";
    }

    const activityManifest =
      getActivityManifest(
        displayPlan.activity,
        gameRegistry,
        playgroundRegistry
      );

    const activityImage = cleanString(
      activityManifest?.iconImage
    );
    const activityEmoji =
      cleanString(activityManifest?.icon) ||
      (displayPlan.activity?.kind ===
      "playground"
        ? "🎵"
        : "🎮");
    const activityColor =
      cleanString(
        activityManifest?.cardColor
      ) || "#ff5a51";
    const activityTextColor =
      cleanString(
        activityManifest?.cardTextColor
      ) || "#ffffff";

    const snackUnlocked =
      displayPlan.snack?.unlocked === true;
    const pending =
      findPendingCompletion(
        displayPlan,
        engine
      );

    lastRenderContext = {
      mode,
      plan: cloneJson(plan),
      engine,
      petName,
      petVisualHtml,
      gameRegistry,
      playgroundRegistry,
      activityManifest
    };

    return `
      <div class="daily-zoo-todo-header">
        <div
          class="daily-zoo-todo-pet"
          aria-hidden="true"
        >
          ${petVisualHtml || "🐾"}
        </div>

        <div class="daily-zoo-todo-pet-name">
          ${escapeHtml(petName || "BibloPet")}
        </div>
      </div>

      <div class="daily-zoo-todo-heading">
        Daily Tasks
      </div>

      <div class="daily-zoo-todo-list">
        ${taskRowHtml({
          type: flashcardId,
          text: "Review My Flashcard",
          image:
            `${ASSET_DIR}task_flashcard.png`,
          emoji: "🗂️",
          rowColor: "#7f66c6",
          status:
            displayPlan.tasks?.[flashcardId]
              ?.status || "open",
          completeStatus
        })}

        ${taskRowHtml({
          type: questionsId,
          text: "Answer My Questions",
          image:
            `${ASSET_DIR}task_questions.png`,
          emoji: "❓",
          rowColor: "#40b9c5",
          status:
            displayPlan.tasks?.[questionsId]
              ?.status || "open",
          completeStatus
        })}

        ${taskRowHtml({
          type: activityId,
          text: "Play a Game with Me",
          image: activityImage,
          emoji: activityEmoji,
          rowColor: activityColor,
          rowTextColor: activityTextColor,
          status:
            displayPlan.tasks?.[activityId]
              ?.status || "open",
          completeStatus
        })}

        ${taskRowHtml({
          type: "snack",
          text: "Feed me a snack",
          image:
            `${ASSET_DIR}task_snack.png`,
          emoji: "🍎",
          rowColor: "#333333",
          status: "open",
          completeStatus,
          disabled: !snackUnlocked,
          faded: !snackUnlocked
        })}
      </div>

      ${renderPendingCompletionHtml({
        plan: displayPlan,
        pending,
        petVisualHtml,
        activityManifest,
        scope: pendingScope
      })}
    `;
  }

  installGlobalBindings();

  return Object.freeze({
    ASSET_DIR,
    MEDAL_ASSET_DIR,
    PENDING_DATA_VERSION,
    PREVIEW_MODES,
    THANK_YOU_MESSAGES,
    getPreviewMode,
    buildDisplayPlan,
    findPendingCompletion,
    createPendingCompletionData,
    getThankYouMessage,
    getMedalToastData,
    renderPreview,
    confirmPendingCompletion
  });
});
