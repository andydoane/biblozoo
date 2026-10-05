(function (root) {
  "use strict";

  const WRAPPED = "__bibloZooDailyTodoWrapped";

  function clean(value) {
    return String(value ?? "").trim();
  }

  function getContext() {
    const params = root.VerseGameBridge
      ?.getLaunchParams?.() || {};

    if (
      params.todoSource !== "daily_todo" ||
      params.mix ||
      clean(params.dailyActivityKind) !== "game"
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
      "dailyActivityMode",
      "dailyReturnContext"
    ];

    if (required.some((key) => !clean(params[key]))) {
      return null;
    }

    return params;
  }

  function matchesRun(options, context) {
    if (!context) return false;

    const completion = options?.completion;

    return completion?.ok === true &&
      clean(options?.verseId || completion.verseId) ===
        clean(context.dailyVerseId) &&
      clean(options?.gameId || completion.gameId) ===
        clean(context.dailyActivityId) &&
      clean(options?.mode || completion.mode) ===
        clean(context.dailyActivityMode);
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
      const assignedMode = clean(
        context?.dailyActivityMode
      );

      if (
        context &&
        ["easy", "medium", "hard"].includes(assignedMode) &&
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
    getContext,
    matchesRun,
    wrapShell
  });
})(window);
