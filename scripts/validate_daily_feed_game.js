"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const feedGamePath = path.join(rootDir, "daily_questions_feed_game.js");
const source = fs.readFileSync(feedGamePath, "utf8");

function loadFeedGameForValidation() {
  const exportMarker =
    "  window.BibloZooDailyFeedGame = Object.freeze({";

  assert.strictEqual(
    source.split(exportMarker).length - 1,
    1,
    "Expected one feeding-game public export"
  );

  const hookSource = `
  window.__BibloZooDailyFeedGameTestHooks = Object.freeze({
    BACKGROUND_SCENES,
    SOLID_BALLS,
    RAINBOW_BALL,
    TILT_CALIBRATION_MS,
    INTRO_TAP_LOCKOUT_MS,
    FEED_MODES,
    FEED_MODE_CONFIGS,
    normalizeFeedMode,
    getFeedModeConfig,
    resolveFeedMode,
    getModeController,
    buildScheduledBalls,
    chooseBackground,
    createPegField,
    spawnStarBonusBalls,
    ballTouchesPet,
    maybeFinish,
    buildStandardResult,
    disposeMode,
    setActiveRuntimeForValidation: (runtime) => {
      activeRuntime = runtime;
    },
    getActiveRuntimeForValidation: () => activeRuntime
  });

${exportMarker}`;

  const instrumentedSource =
    source.replace(exportMarker, hookSource);

  class StubImage {
    constructor() {
      this.decoding = "";
      this.src = "";
      this.complete = false;
      this.naturalWidth = 0;
    }
  }

  class StubAudio {
    constructor(src = "") {
      this.src = src;
      this.currentTime = 0;
      this.preload = "";
      this.volume = 1;
    }

    load() {}
    pause() {}
    play() { return Promise.resolve(); }
  }

  const events = {
    windowAdds: [],
    windowRemoves: [],
    cancelledRafs: []
  };

  const window = {
    location: { protocol: "https:" },
    devicePixelRatio: 1,
    addEventListener(type) {
      events.windowAdds.push(type);
    },
    removeEventListener(type) {
      events.windowRemoves.push(type);
    },
    AudioContext: null,
    webkitAudioContext: null
  };

  const sandbox = {
    window,
    Image: StubImage,
    Audio: StubAudio,
    fetch: () => Promise.reject(new Error("Network disabled in validation")),
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame(id) {
      events.cancelledRafs.push(id);
    },
    setTimeout,
    clearTimeout,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(
    instrumentedSource,
    sandbox,
    { filename: "daily_questions_feed_game.js" }
  );

  return {
    api: window.BibloZooDailyFeedGame,
    hooks: window.__BibloZooDailyFeedGameTestHooks,
    events
  };
}

const {
  api,
  hooks,
  events
} = loadFeedGameForValidation();

function countStars(field) {
  return Array.from(field.pegs)
    .filter((peg) => peg.isStar)
    .length;
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function testPublicApiContract() {
  assert.strictEqual(api.version, 1);
  assert.deepStrictEqual(
    Object.keys(api).sort(),
    [
      "getResultCopy",
      "prepareAudio",
      "render",
      "start",
      "stop",
      "version"
    ]
  );

  ["prepareAudio", "render", "start", "stop", "getResultCopy"]
    .forEach((name) => {
      assert.strictEqual(
        typeof api[name],
        "function",
        `${name} must remain part of the feeding-game API`
      );
    });
}

function testFeedModeRegistryAndNormalization() {
  assert.deepStrictEqual(
    toPlain(hooks.FEED_MODES),
    {
      CLASSIC: "classic",
      LABYRINTH: "labyrinth",
      MELODY: "melody",
      BOUNCE: "bounce"
    }
  );

  [
    "classic",
    "labyrinth",
    "melody",
    "bounce"
  ].forEach((mode) => {
    assert.strictEqual(
      hooks.normalizeFeedMode(mode),
      mode
    );
  });

  [
    undefined,
    null,
    "",
    "normal",
    "music",
    "paddle",
    "CLASSIC"
  ].forEach((value) => {
    assert.strictEqual(
      hooks.normalizeFeedMode(value),
      "classic"
    );
  });
}

function testFeedModeConfigurations() {
  const configs = hooks.FEED_MODE_CONFIGS;

  assert.deepStrictEqual(
    Object.keys(configs).sort(),
    [
      "bounce",
      "classic",
      "labyrinth",
      "melody"
    ]
  );

  assert.strictEqual(configs.classic.implemented, true);
  assert.strictEqual(configs.classic.schedule, "classic-seven");
  assert.strictEqual(configs.classic.inputTarget, "pet");
  assert.strictEqual(configs.classic.catchTarget, "pet");
  assert.strictEqual(configs.classic.scoring, "points");
  assert.strictEqual(configs.classic.finishDelayMs, 900);
  assert.strictEqual(
    configs.classic.instructions.title,
    "Catch the BibloSnacks!"
  );
  assert.strictEqual(
    configs.classic.instructions.prompt,
    "Tilt to steer"
  );

  ["labyrinth", "melody", "bounce"]
    .forEach((mode) => {
      assert.strictEqual(
        configs[mode].implemented,
        false,
        `${mode} must stay unavailable until its gameplay patch lands`
      );
    });

  assert.strictEqual(configs.labyrinth.inputTarget, "snacks");
  assert.strictEqual(configs.melody.scoring, "percentage");
  assert.strictEqual(configs.bounce.inputTarget, "paddle");
}

function testUnavailableModesSafelyResolveToClassic() {
  assert.strictEqual(
    hooks.resolveFeedMode("classic"),
    "classic"
  );

  ["labyrinth", "melody", "bounce"]
    .forEach((mode) => {
      assert.strictEqual(
        hooks.resolveFeedMode(mode),
        "classic"
      );
    });

  assert.strictEqual(
    hooks.resolveFeedMode("not-a-mode"),
    "classic"
  );

  const fallbackMarkup = api.render({
    session: {
      petName: "Pip",
      feedMode: "labyrinth"
    }
  });

  assert.ok(
    fallbackMarkup.includes(
      'data-daily-feed-mode="classic"'
    )
  );
  assert.ok(
    fallbackMarkup.includes(
      "Catch the BibloSnacks!"
    )
  );
  assert.ok(
    fallbackMarkup.includes(
      "Tilt to steer"
    )
  );
}

function testClassicModeControllerContract() {
  const controller =
    hooks.getModeController("classic");

  assert.strictEqual(controller.id, "classic");

  [
    "initialize",
    "update",
    "draw",
    "handleInput",
    "isComplete",
    "buildResult",
    "dispose"
  ].forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      `Classic controller must provide ${name}()`
    );
  });

  ["labyrinth", "melody", "bounce"]
    .forEach((mode) => {
      assert.strictEqual(
        hooks.getModeController(mode),
        controller
      );
    });

  assert.ok(
    source.includes(
      "runtime.modeController\n      .update(runtime, dt, now);"
    )
  );
  assert.ok(
    source.includes(
      "runtime.modeController\n      .draw(runtime, now);"
    )
  );
  assert.ok(
    source.includes(
      ".isComplete(runtime, now)"
    )
  );
}

function testStandardResultContract() {
  assert.deepStrictEqual(
    toPlain(
      hooks.buildStandardResult({
        mode: "classic",
        score: 8,
        caughtCount: 4,
        totalCount: 7,
        scheduled: new Array(7)
      })
    ),
    {
      mode: "classic",
      score: 8,
      caughtCount: 4,
      totalCount: 7,
      completed: true
    }
  );

  assert.deepStrictEqual(
    toPlain(
      hooks.buildStandardResult({
        mode: "not-a-mode",
        score: -2,
        caughtCount: -3,
        scheduled: new Array(7)
      })
    ),
    {
      mode: "classic",
      score: 0,
      caughtCount: 0,
      totalCount: 7,
      completed: true
    }
  );
}

function testModeDisposalAndStopAreIdempotent() {
  let disposeCount = 0;
  const timerId = setTimeout(() => {}, 10000);
  const modeRuntime = {
    modeDisposed: false,
    modeTimers: new Set([timerId]),
    modeController: {
      dispose() {
        disposeCount += 1;
      }
    }
  };

  hooks.disposeMode(modeRuntime);
  hooks.disposeMode(modeRuntime);

  assert.strictEqual(disposeCount, 1);
  assert.strictEqual(modeRuntime.modeDisposed, true);
  assert.strictEqual(modeRuntime.modeTimers.size, 0);

  events.windowRemoves.length = 0;
  events.cancelledRafs.length = 0;

  const stageRemoves = [];
  const overlayRemoves = [];
  const resultRemoves = [];
  let releasedPointer = 0;
  let audioClosed = 0;
  let stopDisposeCount = 0;

  const runtime = {
    running: true,
    rafId: 77,
    orientationHandler() {},
    pointerDownHandler() {},
    pointerMoveHandler() {},
    pointerEndHandler() {},
    activePointerId: 3,
    dragging: true,
    stage: {
      removeEventListener(type) {
        stageRemoves.push(type);
      },
      releasePointerCapture() {
        releasedPointer += 1;
      }
    },
    startOverlay: {
      removeEventListener(type) {
        overlayRemoves.push(type);
      }
    },
    startOverlayHandler() {},
    resultBackButton: {
      removeEventListener(type) {
        resultRemoves.push(type);
      }
    },
    resultBackHandler() {},
    starAudio: null,
    chompAudio: null,
    audioContext: {
      state: "running",
      close() {
        audioClosed += 1;
      }
    },
    modeDisposed: false,
    modeTimers: new Set(),
    modeController: {
      dispose() {
        stopDisposeCount += 1;
      }
    },
    onComplete() {},
    onBackToZoo() {}
  };

  hooks.setActiveRuntimeForValidation(runtime);
  api.stop();
  api.stop();

  assert.strictEqual(
    hooks.getActiveRuntimeForValidation(),
    null
  );
  assert.strictEqual(runtime.running, false);
  assert.deepStrictEqual(events.cancelledRafs, [77]);
  assert.deepStrictEqual(
    events.windowRemoves,
    ["deviceorientation"]
  );
  assert.deepStrictEqual(
    stageRemoves,
    [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel"
    ]
  );
  assert.deepStrictEqual(overlayRemoves, ["click"]);
  assert.deepStrictEqual(resultRemoves, ["click"]);
  assert.strictEqual(releasedPointer, 1);
  assert.strictEqual(audioClosed, 1);
  assert.strictEqual(stopDisposeCount, 1);
  assert.strictEqual(runtime.onComplete, null);
  assert.strictEqual(runtime.onBackToZoo, null);
  assert.strictEqual(runtime.startOverlayHandler, null);
  assert.strictEqual(runtime.resultBackHandler, null);
}

function testClassicRenderContract() {
  const normal = api.render({
    session: { petName: "Pip" },
    profilePictureHtml: "<span>pet</span>"
  });

  assert.ok(normal.includes("data-daily-feed-game"));
  assert.ok(normal.includes('data-daily-feed-mode="classic"'));
  assert.ok(normal.includes("data-daily-feed-stage"));
  assert.ok(normal.includes("data-daily-feed-canvas"));
  assert.ok(normal.includes("data-daily-feed-catcher"));
  assert.ok(normal.includes("Catch the BibloSnacks!"));
  assert.ok(normal.includes("Tilt to steer"));
  assert.ok(normal.includes("Great Catching!"));
  assert.ok(normal.includes("Back to Zoo"));
  assert.ok(normal.includes("Tilt or drag Pip left and right"));
  assert.ok(normal.includes("<span>pet</span>"));

  const daily = api.render({
    session: {
      petName: "Pip",
      dailyTodoSnack: true
    }
  });

  assert.ok(daily.includes("is-daily-todo-snack"));
  assert.ok(daily.includes("Thanks for the snack!"));
  assert.ok(daily.includes("Zoo To-Do Complete!"));
  assert.ok(daily.includes("Back Home"));
}

function testClassicScheduledBalls() {
  const scheduled = Array.from(hooks.buildScheduledBalls());
  const ids = scheduled.map((ball) => ball.id);
  const expectedSolids = [
    "red", "yellow", "orange", "green", "blue", "purple"
  ];

  assert.strictEqual(scheduled.length, 7);
  assert.strictEqual(ids[6], "rainbow");
  assert.deepStrictEqual(
    ids.slice(0, 6).sort(),
    [...expectedSolids].sort()
  );
  assert.strictEqual(hooks.RAINBOW_BALL.points, 5);
  assert.strictEqual(
    Array.from(hooks.SOLID_BALLS).every((ball) => !ball.points),
    true,
    "Solid Classic snacks must keep their default 1-point value"
  );
}

function testClassicPegField() {
  const field = hooks.createPegField(390, 844, 0);
  const pegs = Array.from(field.pegs);

  assert.strictEqual(pegs.length, 41);
  assert.deepStrictEqual(
    Array.from(new Set(pegs.map((peg) => peg.row))).sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8]
  );

  for (let row = 0; row < 9; row += 1) {
    assert.strictEqual(
      pegs.filter((peg) => peg.row === row).length,
      row % 2 === 0 ? 5 : 4
    );
  }
}

function testClassicQuestionStarCounts() {
  assert.strictEqual(countStars(hooks.createPegField(390, 844, 0)), 1);
  assert.strictEqual(countStars(hooks.createPegField(390, 844, 1)), 2);
  assert.strictEqual(countStars(hooks.createPegField(390, 844, 2)), 3);
}

function testClassicStarBonusSpawnsThreeSnacks() {
  const runtime = {
    width: 390,
    height: 844,
    pegRadius: 18,
    balls: [],
    nextBallId: 1
  };

  hooks.spawnStarBonusBalls(runtime, 1234);

  assert.strictEqual(runtime.balls.length, 3);
  assert.deepStrictEqual(
    runtime.balls.map((ball) => ball.bonus),
    [true, true, true]
  );
  assert.deepStrictEqual(
    runtime.balls.map((ball) => Math.round(ball.x)),
    [78, 195, 312]
  );
  assert.strictEqual(
    new Set(runtime.balls.map((ball) => ball.config.id)).size,
    3
  );
}

function testClassicBackgroundSelection() {
  const phone = hooks.chooseBackground(390, 844);
  const tablet = hooks.chooseBackground(1024, 1366);

  assert.match(
    phone,
    /^\.\/verse_images\/daily_questions\/dq_feed_bg_[a-z]+_phone\.jpg$/
  );
  assert.match(
    tablet,
    /^\.\/verse_images\/daily_questions\/dq_feed_bg_[a-z]+_tablet\.jpg$/
  );
}

function testClassicCatchGeometry() {
  const runtime = {
    catcherX: 100,
    petCenterY: 200,
    petRadius: 30
  };

  assert.strictEqual(
    hooks.ballTouchesPet(runtime, {
      x: 100,
      y: 240,
      radius: 10
    }),
    true
  );
  assert.strictEqual(
    hooks.ballTouchesPet(runtime, {
      x: 100,
      y: 241,
      radius: 10
    }),
    false
  );
}

function testClassicCompletionDelay() {
  const runtime = {
    scheduled: new Array(7),
    scheduledIndex: 7,
    balls: [],
    finishAt: 0
  };

  assert.strictEqual(hooks.maybeFinish(runtime, 1000), false);
  assert.strictEqual(runtime.finishAt, 1900);
  assert.strictEqual(hooks.maybeFinish(runtime, 1899), false);
  assert.strictEqual(hooks.maybeFinish(runtime, 1900), true);

  runtime.balls.push({ id: 1 });
  assert.strictEqual(hooks.maybeFinish(runtime, 2000), false);
  assert.strictEqual(runtime.finishAt, 0);
}

function testClassicResultCopyThresholds() {
  assert.strictEqual(api.getResultCopy(13, 7, "Pip").title, "Amazing Catching!");
  assert.strictEqual(api.getResultCopy(12, 7, "Pip").title, "Snack Superstar!");
  assert.strictEqual(api.getResultCopy(8, 5, "Pip").title, "Great Catching!");
  assert.strictEqual(api.getResultCopy(4, 3, "Pip").title, "Nice Catching!");
  assert.strictEqual(api.getResultCopy(0, 0, "Pip").chomp, "ALL DONE!");
  assert.strictEqual(api.getResultCopy(0, 1, "Pip").chomp, "CHOMP!");
}

function testClassicTimingAndPhysicsConstants() {
  assert.strictEqual(hooks.TILT_CALIBRATION_MS, 750);
  assert.strictEqual(hooks.INTRO_TAP_LOCKOUT_MS, 800);
  assert.ok(
    source.includes("runtime.nextScheduledAt = now + 4000 + Math.random() * 1000"),
    "Classic scheduled snacks must remain on the 4-5 second cadence"
  );
  assert.ok(
    source.includes("const dt = clamp((now - runtime.lastFrameAt) / 1000, 0.001, 0.032)"),
    "Classic frame delta clamp must remain unchanged"
  );
  assert.strictEqual(
    (source.match(/updateBalls\(runtime, step, now\);/g) || []).length,
    2,
    "Classic must keep its two physics half-steps"
  );
  assert.ok(source.includes("gravity: height * 0.31"));
  assert.ok(source.includes("now - ball.bornAt > 22000"));
}

function testClassicInputAndCleanupContract() {
  assert.ok(source.includes('window.addEventListener(\n        "deviceorientation"'));
  assert.ok(source.includes('window.removeEventListener(\n        "deviceorientation"'));
  assert.ok(source.includes('stage.addEventListener(\n      "pointerdown"'));
  assert.ok(source.includes('stage.addEventListener(\n      "pointermove"'));
  assert.ok(source.includes('stage.addEventListener(\n      "pointerup"'));
  assert.ok(source.includes('stage.addEventListener(\n      "pointercancel"'));
  assert.ok(source.includes("detachGameplayInput(runtime);"));
  assert.ok(source.includes("if (runtime.rafId) cancelAnimationFrame(runtime.rafId);"));
  assert.ok(source.includes("stopAudioContext(runtime.audioContext);"));
  assert.ok(source.includes("stopAudioContext(preparedAudioContext);"));
}

function testClassicStartRejectsMissingInputs() {
  assert.strictEqual(api.start(null, { session: {} }), null);
  assert.strictEqual(api.start({}, {}), null);
  assert.strictEqual(api.start({}, { session: null }), null);
}

function main() {
  const tests = [
    testPublicApiContract,
    testFeedModeRegistryAndNormalization,
    testFeedModeConfigurations,
    testUnavailableModesSafelyResolveToClassic,
    testClassicModeControllerContract,
    testStandardResultContract,
    testModeDisposalAndStopAreIdempotent,
    testClassicRenderContract,
    testClassicScheduledBalls,
    testClassicPegField,
    testClassicQuestionStarCounts,
    testClassicStarBonusSpawnsThreeSnacks,
    testClassicBackgroundSelection,
    testClassicCatchGeometry,
    testClassicCompletionDelay,
    testClassicResultCopyThresholds,
    testClassicTimingAndPhysicsConstants,
    testClassicInputAndCleanupContract,
    testClassicStartRejectsMissingInputs
  ];

  tests.forEach((test) => test());

  console.log(
    `Daily feeding game validation passed (${tests.length} checks).`
  );
}

main();
