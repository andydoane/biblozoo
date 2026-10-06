(function (root) {
  "use strict";

  const WRAPPED = "__bibloZooDailyTodoWrapped";
  const STANDARD_GAME_IDS = Object.freeze([
    "scramble",
    "traffic_tap_external",
    "chain",
    "foodslice",
    "tower_bible",
    "verse_snake",
    "versey_bird",
    "dino_dash",
    "verse_munch",
    "verse_invaders",
    "bible_bugs",
    "verse_splat"
  ]);
  const PLAYGROUND_ACTIVITY_IDS = Object.freeze([
    "verse_jam",
    "scripture_scrub",
    "ghost_writer",
    "verse_typer",
    "wheel_of_bible"
  ]);
  const PLAYGROUND_MODE_ALIASES = Object.freeze({
    verse_jam: Object.freeze({
      beginner: "easy",
      advanced: "hard"
    }),
    verse_typer: Object.freeze({
      beginner: "easy",
      advanced: "hard"
    })
  });

  function clean(value) {
    return String(value ?? "").trim();
  }

  function getContext() {
    const params = root.VerseGameBridge
      ?.getLaunchParams?.() || {};

    const kind = clean(
      params.dailyActivityKind
    );
    const activityId = clean(
      params.dailyActivityId
    );
    const supportedActivity =
      kind === "game"
        ? STANDARD_GAME_IDS.includes(activityId)
        : kind === "playground"
          ? PLAYGROUND_ACTIVITY_IDS.includes(activityId)
          : false;

    if (
      params.todoSource !== "daily_todo" ||
      params.mix ||
      !supportedActivity
    ) {
      return null;
    }

    const required = [
      "dailyProfileId",
      "dailyPlanId",
      "dailyPlanDay",
      "dailyTaskId",
      "dailyLaunchToken",
      "dailyVerseId",
      "dailyActivityId",
      "dailyReturnContext"
    ];

    if (
      required.some((key) => !clean(params[key])) ||
      (kind === "game" &&
        !clean(params.dailyActivityMode))
    ) {
      return null;
    }

    return params;
  }

  function matchesRun(options, context) {
    if (
      !context ||
      clean(context.dailyActivityKind) !== "game"
    ) {
      return false;
    }

    const completion = options?.completion;

    return completion?.ok === true &&
      clean(options?.verseId || completion.verseId) ===
        clean(context.dailyVerseId) &&
      clean(options?.gameId || completion.gameId) ===
        clean(context.dailyActivityId) &&
      clean(options?.mode || completion.mode) ===
        clean(context.dailyActivityMode);
  }

  function getAvailableModeIds(
    options,
    context
  ) {
    const configuredModes =
      Array.isArray(options?.modes)
        ? options.modes
            .map((mode) =>
              clean(
                typeof mode === "string"
                  ? mode
                  : mode?.id
              )
            )
            .filter(Boolean)
        : [];

    if (configuredModes.length) {
      return configuredModes;
    }

    return clean(
      context?.dailyActivityKind
    ) === "game"
      ? ["easy", "medium", "hard"]
      : [];
  }

  function resolveAssignedMode(
    context,
    options
  ) {
    const assignedMode = clean(
      context?.dailyActivityMode
    );
    const availableModes =
      getAvailableModeIds(
        options,
        context
      );

    if (
      !assignedMode ||
      !availableModes.length
    ) {
      return "";
    }

    if (availableModes.includes(assignedMode)) {
      return assignedMode;
    }

    if (
      clean(context?.dailyActivityKind) !==
      "playground"
    ) {
      return "";
    }

    const alias = clean(
      PLAYGROUND_MODE_ALIASES[
        clean(context.dailyActivityId)
      ]?.[assignedMode]
    );

    return availableModes.includes(alias)
      ? alias
      : "";
  }

  function showStarting(app) {
    if (!app) return;

    app.innerHTML = `
      <div class="vm-game-screen">
        <div class="vm-game-stage">
          <div class="vm-game-center">
            <div class="vm-game-difficulty-icon" aria-hidden="true">🐾</div>
            <div class="vm-game-title">Starting Daily To-Do...</div>
          </div>
        </div>
      </div>
    `;
  }

  function wrapShell(shell) {
    if (!shell || shell[WRAPPED]) return shell;

    const originalModeSelect = shell.renderModeSelect;
    const originalComplete = shell.renderCompleteScreen;

    shell.renderModeSelect = function (options = {}) {
      const context = getContext();
      const assignedMode =
        resolveAssignedMode(
          context,
          options
        );

      if (
        context &&
        assignedMode &&
        typeof options.onSelect === "function"
      ) {
        showStarting(options.app);
        options.onSelect(assignedMode);
        return;
      }

      return originalModeSelect.call(shell, options);
    };

    shell.renderCompleteScreen = function (options = {}) {
      const context = getContext();

      if (matchesRun(options, context)) {
        const returned = root.VerseGameBridge
          ?.returnToDailyTodo?.({
            status: "success",
            completion: options.completion
          });

        if (returned) return;
      }

      return originalComplete.call(shell, options);
    };

    Object.defineProperty(shell, WRAPPED, {
      value: true,
      configurable: false,
      enumerable: false
    });

    return shell;
  }

  let shellValue = wrapShell(root.VerseGameShell);

  try {
    Object.defineProperty(root, "VerseGameShell", {
      configurable: true,
      enumerable: true,
      get() {
        return shellValue;
      },
      set(value) {
        shellValue = wrapShell(value);
      }
    });
  } catch (err) {
    if (root.VerseGameShell) {
      wrapShell(root.VerseGameShell);
    }
  }

  root.BibloZooDailyTodoShell = Object.freeze({
    STANDARD_GAME_IDS,
    PLAYGROUND_ACTIVITY_IDS,
    PLAYGROUND_MODE_ALIASES,
    getContext,
    matchesRun,
    resolveAssignedMode,
    wrapShell
  });
})(window);
