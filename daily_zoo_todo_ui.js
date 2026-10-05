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
  const PREVIEW_MODES = Object.freeze([
    "open",
    "one",
    "two",
    "ready",
    "actual"
  ]);

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
    if (mode === "actual") return plan;

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
      plan.tasks[taskId].status = open;
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
    const displayPlan = buildDisplayPlan(
      plan,
      mode,
      engine
    );

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
    `;
  }

  return Object.freeze({
    ASSET_DIR,
    PREVIEW_MODES,
    getPreviewMode,
    buildDisplayPlan,
    renderPreview
  });
});
