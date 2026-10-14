"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const feedGamePath = path.join(rootDir, "daily_questions_feed_game.js");
const feedGameCssPath = path.join(rootDir, "daily_questions_feed_game.css");
const appPath = path.join(rootDir, "app.js");
const verseTyperPath = path.join(
  rootDir,
  "verse_playground",
  "verse_typer",
  "game.js"
);
const source = fs.readFileSync(feedGamePath, "utf8");
const feedGameCssSource = fs.readFileSync(feedGameCssPath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");
const dailyTodo = require(path.join(rootDir, "daily_zoo_todo.js"));
const dailyTodoSource = fs.readFileSync(
  path.join(rootDir, "daily_zoo_todo.js"), "utf8"
);
const verseTyperSource = fs.readFileSync(verseTyperPath, "utf8");

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
    LABYRINTH_GAP_POSITIONS,
    LABYRINTH_ROW_COUNT,
    LABYRINTH_PHYSICS_STEP,
    LABYRINTH_STUCK_MS,
    LABYRINTH_STEER_ACCELERATION_SCALE,
    LABYRINTH_MAX_HORIZONTAL_SPEED_SCALE,
    LABYRINTH_PLATFORM_ROLL_DAMPING,
    LABYRINTH_PLATFORM_RESTITUTION,
    LABYRINTH_PLATFORM_SETTLE_SPEED_RADIUS_SCALE,
    LABYRINTH_PLATFORM_MAX_BOUNCE_SPEED_RADIUS_SCALE,
    BOUNCE_COLUMNS,
    BOUNCE_ROWS,
    BOUNCE_SERVES,
    BOUNCE_STEP,
    BOUNCE_MIN_VERTICAL_FRACTION,
    BOUNCE_SPEED_GAIN_PER_SECOND,
    BOUNCE_MAX_SPEED_MULTIPLIER,
    BOUNCE_PADDLE_HALF_WIDTH_RADIUS_SCALE,
    normalizeFeedAxis,
    pointerFeedAxis,
    feedTiltAngle,
    readNormalizedTilt,
    feedInstructionPrompt,
    bounceBrickGeometry,
    resizeFeedStage,
    createStarBurst,
    showResult,
    createBounceBrickField,
    initializeBounceMode,
    setBouncePaddleX,
    makeBounceWhiteBall,
    launchBounceServe,
    spawnBounceSnack,
    breakBounceBrick,
    collideBounceBallWithBricks,
    normalizeBounceBallVelocity,
    getBounceBallSpeed,
    updateBounceWhiteBall,
    updateBounceSnacks,
    updateBounceMode,
    isBounceModeComplete,
    disposeBounceMode,
    MELODY_BPM,
    MELODY_BEAT_MS,
    MELODY_TRAVEL_MS,
    MELODY_BACKGROUND_GAP_MS,
    MELODY_LANE_FRACTIONS,
    MELODY_HOLD_LENGTHS,
    MELODY_TRANSITION_NOTES,
    MELODY_TARGET_LANE_SEQUENCE,
    FEED_MELODIES,
    getFeedMelodyById,
    selectFeedMelody,
    FEED_MODES,
    FEED_MODE_CONFIGS,
    normalizeFeedMode,
    getFeedModeConfig,
    resolveFeedMode,
    getModeController,
    createLabyrinthPlatformRows,
    initializeLabyrinthMode,
    collideLabyrinthBallWithSegment,
    getLabyrinthLandingBounceVelocity,
    updateLabyrinthMode,
    normalizeFeedMelodyNotes,
    createMelodyLanePath,
    createMelodyTimeline,
    midiToFrequency,
    calculateMelodyCatchPercent,
    initializeMelodyMode,
    updateMelodyMode,
    buildMelodyResult,
    disposeMelodyMode,
    advanceLabyrinthPet,
    recoverStuckLabyrinthBall,
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
    events,
    sandboxWindow: window
  };
}

const {
  api,
  hooks,
  events,
  sandboxWindow
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
    "Steer to catch snacks"
  );

  assert.strictEqual(configs.labyrinth.implemented, true);
  assert.strictEqual(configs.labyrinth.schedule, "classic-seven");
  assert.strictEqual(configs.labyrinth.inputTarget, "snacks");
  assert.strictEqual(configs.labyrinth.catchTarget, "pet");
  assert.strictEqual(configs.labyrinth.scoring, "points");
  assert.strictEqual(configs.labyrinth.finishDelayMs, 900);
  assert.strictEqual(
    configs.labyrinth.instructions.title,
    "Guide the BibloSnacks!"
  );
  assert.strictEqual(
    configs.labyrinth.instructions.prompt,
    "Guide snacks through the gaps!"
  );

  assert.strictEqual(configs.bounce.implemented, true);
  assert.strictEqual(configs.bounce.schedule, "bounce-bricks");
  assert.strictEqual(configs.bounce.inputTarget, "paddle");
  assert.strictEqual(configs.bounce.scoring, "points");

  assert.strictEqual(configs.melody.implemented, true);
  assert.strictEqual(configs.melody.schedule, "melody");
  assert.strictEqual(configs.melody.inputTarget, "pet");
  assert.strictEqual(configs.melody.catchTarget, "pet");
  assert.strictEqual(configs.melody.scoring, "percentage");
  assert.strictEqual(configs.melody.finishDelayMs, 900);
  assert.strictEqual(configs.bounce.inputTarget, "paddle");
}

function testUnavailableModesSafelyResolveToClassic() {
  assert.strictEqual(
    hooks.resolveFeedMode("classic"),
    "classic"
  );
  assert.strictEqual(
    hooks.resolveFeedMode("labyrinth"),
    "labyrinth"
  );

  assert.strictEqual(
    hooks.resolveFeedMode("melody"),
    "melody"
  );

  assert.strictEqual(hooks.resolveFeedMode("bounce"), "bounce");

  assert.strictEqual(
    hooks.resolveFeedMode("not-a-mode"),
    "classic"
  );

  const fallbackMarkup = api.render({
    session: {
      petName: "Pip",
      feedMode: "unknown-mode"
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
      "Drag to steer and catch the snacks!"
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

  assert.notStrictEqual(hooks.getModeController("bounce"), controller);

  assert.notStrictEqual(
    hooks.getModeController("melody"),
    controller
  );

  assert.notStrictEqual(
    hooks.getModeController("labyrinth"),
    controller
  );

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

function testLabyrinthRenderAndControllerContract() {
  const markup = api.render({
    session: {
      petName: "Pip",
      feedMode: "labyrinth"
    }
  });

  assert.ok(
    markup.includes(
      'data-daily-feed-mode="labyrinth"'
    )
  );
  assert.ok(
    markup.includes(
      "Guide the BibloSnacks!"
    )
  );
  assert.ok(
    markup.includes(
      "Drag to guide snacks through the gaps!"
    )
  );
  assert.ok(
    markup.includes(
      "steer the falling snacks while the BibloPet moves automatically"
    )
  );

  const controller =
    hooks.getModeController("labyrinth");

  assert.strictEqual(
    controller.id,
    "labyrinth"
  );

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
      `Labyrinth controller must provide ${name}()`
    );
  });

  assert.deepStrictEqual(
    toPlain(
      controller.buildResult({
        mode: "labyrinth",
        score: 6,
        caughtCount: 2,
        totalCount: 7,
        scheduled: new Array(7)
      })
    ),
    {
      mode: "labyrinth",
      score: 6,
      caughtCount: 2,
      totalCount: 7,
      completed: true
    }
  );
}

function testLabyrinthPlatformGeneration() {
  const first = toPlain(
    hooks.createLabyrinthPlatformRows(
      390,
      844,
      11,
      12345
    )
  );
  const second = toPlain(
    hooks.createLabyrinthPlatformRows(
      390,
      844,
      11,
      12345
    )
  );

  assert.deepStrictEqual(first, second);
  assert.strictEqual(
    first.length,
    hooks.LABYRINTH_ROW_COUNT
  );
  assert.deepStrictEqual(
    Array.from(hooks.LABYRINTH_GAP_POSITIONS),
    ["left", "middle", "right"]
  );

  first.forEach((row, index) => {
    assert.ok(
      row.gapWidth >= 11 * 4,
      "Every Labyrinth gap must comfortably clear a snack"
    );
    assert.ok(row.gapLeft > 0);
    assert.ok(row.gapRight < 390);
    assert.strictEqual(row.segments.length, 2);
    assert.ok(row.segments[0].width > 0);
    assert.ok(row.segments[1].width > 0);

    if (index > 0) {
      assert.notStrictEqual(
        row.gapPosition,
        first[index - 1].gapPosition,
        "Consecutive Labyrinth rows must not repeat a gap category"
      );
      assert.ok(
        row.y - first[index - 1].y > 45,
        "Labyrinth rows must leave steering space"
      );
    }
  });
}

function makeLabyrinthRuntime(
  earnedStarPegCount = 0
) {
  return {
    width: 390,
    height: 844,
    pegRadius: 16,
    petRadius: 48,
    catcherX: 195,
    lastCatcherX: 195,
    smoothedPetVelocity: 0,
    petTilt: 0,
    earnedStarPegCount,
    pegs: [
      { isStar: true },
      { isStar: earnedStarPegCount > 0 }
    ],
    bursts: [{ id: "classic-only" }],
    catcher: {
      style: { left: "" },
      classList: {
        remove() {},
        add() {}
      },
      offsetWidth: 1
    },
    petCircle: {
      style: {
        setProperty() {}
      }
    },
    scoreEl: null,
    scorePopupsEl: null,
    balls: [],
    nextBallId: 1,
    scheduled: [],
    scheduledIndex: 0,
    nextScheduledAt: Infinity,
    score: 0,
    caughtCount: 0,
    petCenterY: 790
  };
}

function testLabyrinthQuestionStarsDoNotAffectBoard() {
  const zeroStars =
    makeLabyrinthRuntime(0);
  const twoStars =
    makeLabyrinthRuntime(2);

  hooks.initializeLabyrinthMode(zeroStars);
  hooks.initializeLabyrinthMode(twoStars);

  assert.deepStrictEqual(
    toPlain(
      zeroStars.labyrinth.platformRows
    ),
    toPlain(
      twoStars.labyrinth.platformRows
    )
  );
  assert.deepStrictEqual(toPlain(zeroStars.pegs), []);
  assert.deepStrictEqual(toPlain(twoStars.pegs), []);
  assert.deepStrictEqual(toPlain(zeroStars.bursts), []);
  assert.deepStrictEqual(toPlain(twoStars.bursts), []);
}

function testLabyrinthPetReversesAtBoundaries() {
  const right =
    hooks.advanceLabyrinthPet(
      265,
      1,
      100,
      0.1,
      30,
      270
    );

  assert.strictEqual(right.direction, -1);
  assert.ok(right.position < 270);

  const left =
    hooks.advanceLabyrinthPet(
      35,
      -1,
      100,
      0.1,
      30,
      270
    );

  assert.strictEqual(left.direction, 1);
  assert.ok(left.position > 30);
}

function testLabyrinthPlatformCollisionIsForgiving() {
  const segment = {
    x: 0,
    y: 100,
    width: 120,
    height: 12
  };
  const landingBall = {
    x: 60,
    y: 95,
    vx: 24,
    vy: 120,
    radius: 10
  };

  assert.strictEqual(
    hooks.collideLabyrinthBallWithSegment(
      landingBall,
      segment,
      80
    ),
    true
  );
  assert.strictEqual(landingBall.y, 90);
  assert.ok(
    Math.abs(landingBall.vy + 40.8) < 0.001,
    "A normal Labyrinth landing should rebound upward a little"
  );
  assert.ok(
    Math.abs(
      landingBall.vx -
      24 *
        hooks.LABYRINTH_PLATFORM_ROLL_DAMPING
    ) < 0.001,
    "Platform contact should preserve most horizontal steering momentum"
  );

  const gapBall = {
    x: 180,
    y: 95,
    vx: 0,
    vy: 120,
    radius: 10
  };

  assert.strictEqual(
    hooks.collideLabyrinthBallWithSegment(
      gapBall,
      segment,
      80
    ),
    false
  );
}

function testLabyrinthLandingBounceIsBounded() {
  assert.strictEqual(
    hooks.LABYRINTH_PLATFORM_RESTITUTION,
    0.34
  );
  assert.strictEqual(
    hooks.LABYRINTH_PLATFORM_SETTLE_SPEED_RADIUS_SCALE,
    4
  );
  assert.strictEqual(
    hooks.LABYRINTH_PLATFORM_MAX_BOUNCE_SPEED_RADIUS_SCALE,
    6.5
  );

  assert.strictEqual(
    hooks.getLabyrinthLandingBounceVelocity({
      vy: 30,
      radius: 10
    }),
    0,
    "Very gentle platform contacts should settle instead of jittering"
  );

  assert.ok(
    Math.abs(
      hooks.getLabyrinthLandingBounceVelocity({
        vy: 120,
        radius: 10
      }) + 40.8
    ) < 0.001,
    "Ordinary falls should get a small speed-dependent rebound"
  );

  assert.strictEqual(
    hooks.getLabyrinthLandingBounceVelocity({
      vy: 520,
      radius: 10
    }),
    -65,
    "Hard impacts must be capped so a snack cannot bounce toward the previous row"
  );
}

function testLabyrinthSteeringAcceleratesAllSnacks() {
  const runtime =
    makeLabyrinthRuntime(0);

  hooks.initializeLabyrinthMode(runtime);
  assert.strictEqual(
    hooks.LABYRINTH_STEER_ACCELERATION_SCALE,
    3.2
  );
  assert.strictEqual(
    hooks.LABYRINTH_MAX_HORIZONTAL_SPEED_SCALE,
    0.72
  );
  assert.strictEqual(
    runtime.labyrinth.steerAcceleration,
    runtime.width * 3.2
  );
  assert.strictEqual(
    runtime.labyrinth.maxHorizontalSpeed,
    runtime.width * 0.72
  );
  assert.ok(
    source.includes(
      "readNormalizedTilt(runtime, event, 0.28)"
    ),
    "Labyrinth tilt smoothing should react faster than the original tuning"
  );

  runtime.labyrinth.platformRows = [];
  runtime.labyrinth.gravity = 0;
  runtime.labyrinth.petSpeed = 0;
  runtime.balls = [
    {
      id: 1,
      config: { id: "red", color: "#f00" },
      x: 100,
      y: 180,
      vx: 0,
      vy: 0,
      radius: 10,
      rotation: 0,
      points: 1,
      bornAt: 1000,
      trail: [],
      lastTrailAt: 0
    },
    {
      id: 2,
      config: { id: "blue", color: "#00f" },
      x: 260,
      y: 260,
      vx: 0,
      vy: 0,
      radius: 10,
      rotation: 0,
      points: 1,
      bornAt: 1000,
      trail: [],
      lastTrailAt: 0
    }
  ];

  const controller =
    hooks.getModeController("labyrinth");

  controller.handleInput(
    runtime,
    { type: "pointer", x: 390 }
  );
  controller.update(
    runtime,
    0.016,
    1016
  );

  assert.ok(
    runtime.balls[0].vx > 15,
    "Labyrinth steering should build useful sideways speed within one frame"
  );
  assert.ok(
    runtime.balls[1].vx > 15,
    "All active Labyrinth snacks should receive the stronger steering force"
  );

  controller.handleInput(
    runtime,
    { type: "pointerend" }
  );
  assert.strictEqual(
    runtime.labyrinth.steering,
    0
  );
}

function testLabyrinthFixedStepPreventsPlatformTunneling() {
  const runtime =
    makeLabyrinthRuntime(0);

  hooks.initializeLabyrinthMode(runtime);
  runtime.labyrinth.platformRows = [
    {
      segments: [
        {
          x: 0,
          y: 100,
          width: 160,
          height: 12
        }
      ]
    }
  ];
  runtime.labyrinth.gravity = 0;
  runtime.labyrinth.petSpeed = 0;
  runtime.balls = [
    {
      id: 1,
      config: { id: "red", color: "#f00" },
      x: 80,
      y: 80,
      vx: 0,
      vy: 520,
      radius: 10,
      rotation: 0,
      angularVelocity: 0,
      points: 1,
      bornAt: 900,
      trail: [],
      lastTrailAt: 0
    }
  ];

  hooks.updateLabyrinthMode(
    runtime,
    0.032,
    1000
  );

  assert.strictEqual(runtime.balls.length, 1);
  assert.ok(
    runtime.balls[0].y <= 90.001,
    "A capped Labyrinth frame must not tunnel through a platform"
  );
  assert.strictEqual(
    hooks.LABYRINTH_PHYSICS_STEP,
    1 / 120
  );
  assert.ok(
    source.includes(
      "Math.ceil(\n        dt / LABYRINTH_PHYSICS_STEP"
    )
  );
  assert.strictEqual(
    (
      source.match(
        /now - ball\.bornAt > 22000/g
      ) || []
    ).length,
    1,
    "The 22-second lifetime must remain Classic-only"
  );
}

function testLabyrinthOldBallsDoNotExpire() {
  const runtime =
    makeLabyrinthRuntime(0);

  hooks.initializeLabyrinthMode(runtime);
  runtime.labyrinth.platformRows = [];
  runtime.labyrinth.gravity = 0;
  runtime.labyrinth.petSpeed = 0;
  runtime.balls = [
    {
      id: 1,
      config: { id: "red", color: "#f00" },
      x: 100,
      y: 260,
      vx: 0,
      vy: 0,
      radius: 10,
      rotation: 0,
      angularVelocity: 0,
      points: 1,
      bornAt: 0,
      trail: [],
      lastTrailAt: 0
    }
  ];

  hooks.updateLabyrinthMode(
    runtime,
    0.016,
    23000
  );

  assert.strictEqual(
    runtime.balls.length,
    1,
    "Labyrinth snacks must not disappear because of age"
  );
}

function testLabyrinthStuckRecoveryNudgesTowardGap() {
  const runtime =
    makeLabyrinthRuntime(0);

  hooks.initializeLabyrinthMode(runtime);
  runtime.labyrinth.platformRows = [
    {
      y: 300,
      gapCenter: 320,
      gapWidth: 100,
      segments: []
    }
  ];

  const ball = {
    id: 1,
    x: 90,
    y: 290,
    vx: 0,
    vy: 0,
    radius: 10,
    labyrinthProgressAt: 1000,
    labyrinthProgressX: 90,
    labyrinthProgressY: 290,
    labyrinthReleaseCount: 0
  };

  assert.strictEqual(
    hooks.recoverStuckLabyrinthBall(
      runtime,
      ball,
      1000 +
        hooks.LABYRINTH_STUCK_MS +
        1
    ),
    true
  );
  assert.ok(
    ball.vx > 0,
    "Stuck recovery should nudge a snack toward the nearby gap"
  );
  assert.ok(ball.vy > 0);
  assert.strictEqual(
    ball.labyrinthReleaseCount,
    1
  );
}

function testLabyrinthAlwaysReachesCompletion() {
  const runtime =
    makeLabyrinthRuntime(0);

  runtime.mode = "labyrinth";
  runtime.modeConfig =
    hooks.FEED_MODE_CONFIGS.labyrinth;
  runtime.scheduled =
    new Array(7);
  runtime.scheduledIndex = 7;
  runtime.nextScheduledAt = Infinity;

  hooks.initializeLabyrinthMode(runtime);
  runtime.labyrinth.petSpeed = 0;
  runtime.balls = [
    {
      id: 1,
      config: { id: "red", color: "#f00" },
      x: 195,
      y: runtime.height + 60,
      vx: 0,
      vy: 0,
      radius: 10,
      rotation: 0,
      points: 1,
      bornAt: 0,
      trail: [],
      lastTrailAt: 0
    }
  ];

  hooks.updateLabyrinthMode(
    runtime,
    0.016,
    1000
  );

  assert.strictEqual(runtime.balls.length, 0);

  const controller =
    hooks.getModeController("labyrinth");

  assert.strictEqual(
    controller.isComplete(runtime, 1000),
    false
  );
  assert.strictEqual(runtime.finishAt, 1900);
  assert.strictEqual(
    controller.isComplete(runtime, 1900),
    true
  );
}

function extractVerseTyperOdeToJoy() {
  const match = verseTyperSource.match(
    /id:\s*"odeToJoy"\s*,\s*melody:\s*\[([\s\S]*?)\]\s*\}/
  );
  assert.ok(match, "Verse Typer must still expose the odeToJoy melody block");
  return (match[1].match(/-?\d+/g) || []).map(Number);
}

function makeBounceRuntime(earnedStarPegCount = 0) {
  return {
    mode: "bounce",
    modeConfig: hooks.FEED_MODE_CONFIGS.bounce,
    width: 390,
    height: 844,
    earnedStarPegCount,
    pegRadius: 16,
    petRadius: 48,
    petCenterY: 775,
    catcherX: 195,
    catcher: { style: { left: "" }, classList: { remove() {}, add() {} }, offsetWidth: 1 },
    petCircle: { style: { setProperty() {} } },
    startOverlay: { hidden: true },
    startTitleEl: { textContent: "" },
    startInstructionEl: { textContent: "" },
    pegs: [],
    balls: [],
    bursts: [],
    scheduled: [],
    nextBallId: 1,
    score: 0,
    caughtCount: 0,
    finishAt: 0,
    introUnlockAt: 0,
    scoreEl: null,
    scorePopupsEl: null,
    audioContext: null,
    starAudio: null,
    chompAudio: null,
    ctx: null
  };
}

function testBounceRenderAndControllerContract() {
  const markup = api.render({
    session: { feedMode: "bounce", petName: "Pip" }
  });
  assert.ok(markup.includes('data-daily-feed-mode="bounce"'));
  assert.ok(markup.includes("Bounce the BibloSnacks!"));
  assert.ok(markup.includes("data-daily-feed-paddle"));
  assert.ok(!markup.includes("daily-feed-shadow"));
  const paddleCssStart = feedGameCssSource.indexOf(".daily-feed-paddle");
  const paddleCssEnd = feedGameCssSource.indexOf(
    ".daily-feed-catcher.is-catching",
    paddleCssStart
  );
  const paddleCss = feedGameCssSource.slice(paddleCssStart, paddleCssEnd);
  assert.ok(paddleCssStart >= 0 && paddleCssEnd > paddleCssStart);
  assert.ok(paddleCss.includes("border-radius: 999px"));
  assert.ok(paddleCss.includes("box-sizing: border-box"));
  assert.ok(paddleCss.includes("var(--daily-feed-pet-size"));
  assert.ok(markup.includes("Drag to rebound the white ball; feed your pet the colored snacks!"));
  assert.ok(markup.includes(
    "bounce the white ball while Pip catches colored snacks"
  ));
  assert.ok(markup.includes("data-daily-feed-start-title"));
  assert.ok(markup.includes("data-daily-feed-start-instruction"));
  const controller = hooks.getModeController("bounce");
  assert.strictEqual(controller.id, "bounce");
  ["initialize", "update", "draw", "handleInput", "isComplete", "buildResult", "dispose"]
    .forEach((method) => assert.strictEqual(typeof controller[method], "function"));
}

function testBounceBrickLayoutAndQuestionStars() {
  assert.strictEqual(hooks.BOUNCE_COLUMNS, 5);
  assert.strictEqual(hooks.BOUNCE_ROWS, 4);
  assert.strictEqual(hooks.BOUNCE_SERVES, 3);
  assert.strictEqual(hooks.BOUNCE_STEP, 1 / 120);
  for (const starCount of [0, 1, 2]) {
    const runtime = makeBounceRuntime(starCount);
    hooks.initializeBounceMode(runtime);
    const bricks = runtime.bounce.bricks;
    assert.strictEqual(bricks.length, 20);
    assert.strictEqual(bricks.filter((b) => b.config).length, 7);
    assert.deepStrictEqual(
      toPlain(bricks.filter((b) => b.config).map((b) => b.config.id)).sort(),
      ["red", "yellow", "orange", "green", "blue", "purple", "rainbow"].sort()
    );
    assert.strictEqual(bricks.filter((b) => b.isStar).length, starCount);
    assert.ok(bricks.filter((b) => b.isStar).every((b) => !b.config));
    assert.strictEqual(runtime.totalCount, 7);
    assert.deepStrictEqual(toPlain(runtime.pegs), []);
    assert.strictEqual(runtime.bounce.livesLeft, 3);
    assert.strictEqual(runtime.bounce.waitingServe, true);
    assert.ok(bricks.every((b) => b.x > 0 && b.y > 0 && b.width > 0 && b.height > 0));
  }
  const a = hooks.createBounceBrickField(390, 844, 2, () => 0.23);
  const b = hooks.createBounceBrickField(390, 844, 2, () => 0.23);
  assert.deepStrictEqual(toPlain(a), toPlain(b));
}

function testBounceSeparatePetPaddleAndServe() {
  const runtime = makeBounceRuntime(2);
  hooks.initializeBounceMode(runtime);
  assert.ok(runtime.bounce.paddleHalfWidth > runtime.petRadius);
  assert.ok(runtime.bounce.paddleTopY > runtime.petCenterY + runtime.petRadius);
  hooks.setBouncePaddleX(runtime, 100);
  assert.strictEqual(runtime.bounce.paddleX, 100);
  assert.strictEqual(runtime.catcher.style.left, "100px");
  assert.strictEqual(runtime.catcherX, 195,
    "Bounce paddle must not repurpose Classic's catcherX");
  assert.strictEqual(hooks.launchBounceServe(runtime), true);
  assert.strictEqual(runtime.startOverlay.hidden, true);
  assert.strictEqual(runtime.bounce.whiteBalls.length, 1);
  const ball = runtime.bounce.whiteBalls[0];
  assert.ok(ball.vy > 0, "Serve initially travels down toward the pet");
  assert.ok(ball.y > Math.max(...runtime.bounce.bricks.map((b) => b.y + b.height)));
  assert.ok(Math.abs(ball.vx) > 0);
  assert.strictEqual(hooks.launchBounceServe(runtime), false,
    "Cannot serve twice during an active rally");
}

function testBounceCollisionRemovesBricksAndDropsCorrectSnacks() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const gray = runtime.bounce.bricks.find((b) => !b.config && !b.isStar);
  const red = runtime.bounce.bricks.find((b) => b.config?.id === "red");
  const rainbow = runtime.bounce.bricks.find((b) => b.config?.id === "rainbow");
  hooks.breakBounceBrick(runtime, gray, {}, 1000);
  assert.strictEqual(gray.active, false);
  assert.strictEqual(runtime.balls.length, 0);
  hooks.breakBounceBrick(runtime, red, {}, 1000);
  hooks.breakBounceBrick(runtime, rainbow, {}, 1000);
  hooks.breakBounceBrick(runtime, rainbow, {}, 1001);
  assert.deepStrictEqual(toPlain(runtime.balls.map((ball) => ball.points)), [1, 5]);
  assert.deepStrictEqual(toPlain(runtime.balls.map((ball) => ball.config.id)), ["red", "rainbow"]);
  assert.strictEqual(runtime.balls.length, 2, "Bricks cannot be broken twice");
}

function testBounceBrickImpactReboundsAndSingleDrop() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const brick = runtime.bounce.bricks.find((b) => b.config?.id === "yellow");
  runtime.bounce.bricks.forEach((other) => {
    if (other !== brick) other.active = false;
  });
  const radius = runtime.bounce.ballRadius;
  const ball = {
    x: brick.x + brick.width / 2,
    y: brick.y - radius + 0.5,
    vx: 0,
    vy: 200,
    radius
  };
  assert.strictEqual(
    hooks.collideBounceBallWithBricks(
      runtime, ball, ball.x, brick.y - radius - 1, 1000
    ),
    true
  );
  assert.strictEqual(brick.active, false);
  assert.ok(ball.vy < 0);
  assert.ok(ball.y <= brick.y - radius);
  assert.strictEqual(runtime.balls.length, 1);
  assert.strictEqual(runtime.balls[0].config.id, "yellow");
  assert.strictEqual(runtime.balls[0].points, 1);
  runtime.bounce.bricks.forEach((other) => { other.active = false; });
  assert.strictEqual(
    hooks.collideBounceBallWithBricks(
      runtime, ball, ball.x, brick.y - radius - 1, 1001
    ),
    false,
    "Removed bricks cannot collide or release a second snack"
  );
}

function testBounceSnackCatchUsesPetAndScoresRainbow() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const rainbow = runtime.bounce.bricks.find((b) => b.config?.id === "rainbow");
  hooks.spawnBounceSnack(runtime, rainbow);
  const snack = runtime.balls[0];
  assert.strictEqual(snack.points, 5);
  runtime.bounce.paddleX = 220;

  // The paddle is not an eater: a snack touching only the paddle stays active.
  snack.x = 220;
  snack.y = runtime.bounce.paddleTopY + runtime.bounce.paddleHeight / 2;
  hooks.updateBounceSnacks(runtime, 1 / 120);
  assert.strictEqual(runtime.balls.length, 1);
  assert.strictEqual(runtime.score, 0);

  // The pet above the paddle remains the snack catcher.
  snack.x = 220;
  snack.y = runtime.petCenterY - 5;
  hooks.updateBounceSnacks(runtime, 1 / 120);
  assert.strictEqual(runtime.balls.length, 0);
  assert.strictEqual(runtime.score, 5);
  assert.strictEqual(runtime.caughtCount, 1);
  assert.strictEqual(runtime.catcherX, 195);

  hooks.spawnBounceSnack(runtime, rainbow);
  runtime.balls[0].x = 10;
  runtime.balls[0].y = runtime.height + 50;
  hooks.updateBounceSnacks(runtime, 1 / 120);
  assert.strictEqual(runtime.balls.length, 0);
  assert.strictEqual(runtime.score, 5, "Missing snacks must not score");
}

function testBounceStarBricksCreateBonusNotLives() {
  const runtime = makeBounceRuntime(2);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  const star = state.bricks.find((b) => b.isStar);
  hooks.breakBounceBrick(runtime, star, {}, 1000);
  assert.strictEqual(star.active, false);
  assert.strictEqual(state.pendingWhiteBalls.length, 1);
  const bonus = state.pendingWhiteBalls[0];
  assert.ok(bonus.vy > 0);
  assert.ok(bonus.y > star.y + star.height);
  assert.strictEqual(state.livesLeft, 3);
  assert.strictEqual(runtime.balls.length, 0);
  state.waitingServe = false;
  state.whiteBalls = [
    { ...hooks.makeBounceWhiteBall(runtime, 150, 400), y: 400 },
    { ...hooks.makeBounceWhiteBall(runtime, 160, 400), y: 900 }
  ];
  hooks.updateBounceMode(runtime, 1 / 120, 1000);
  assert.strictEqual(state.livesLeft, 3,
    "Losing one white ball during multiball does not cost a life");
  assert.ok(state.whiteBalls.length >= 1);
  assert.strictEqual(state.pendingWhiteBalls.length, 0);
}

function testBouncePhysicsAndPaddleRebound() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  const speed = state.ballSpeed;
  const ball = { x: 195, y: 500, vx: speed, vy: 1, radius: state.ballRadius };
  hooks.normalizeBounceBallVelocity(ball, speed);
  assert.ok(Math.abs(ball.vy) >= speed * hooks.BOUNCE_MIN_VERTICAL_FRACTION - 0.001);
  assert.ok(Math.abs(ball.vx) >= speed * 0.12 - 0.001);

  state.paddleX = 195;
  const oldPetPaddleY = runtime.petCenterY - runtime.petRadius * 0.68;
  const petOnlyBall = {
    x: 195, y: oldPetPaddleY - state.ballRadius - 1,
    vx: 20, vy: speed, radius: state.ballRadius, ageSeconds: 0
  };
  hooks.updateBounceWhiteBall(runtime, petOnlyBall, 0.008, 1000);
  assert.ok(petOnlyBall.vy > 0,
    "The pet circle itself must no longer rebound white balls");

  const paddleBall = {
    x: 195, y: state.paddleTopY - state.ballRadius - 1,
    vx: 20, vy: speed, radius: state.ballRadius, ageSeconds: 0
  };
  hooks.updateBounceWhiteBall(runtime, paddleBall, 0.008, 1000);
  const currentSpeed = hooks.getBounceBallSpeed(runtime, paddleBall);
  assert.ok(paddleBall.vy < 0,
    "The rounded-rectangle paddle must reflect descending white balls upward");
  assert.ok(Math.abs(Math.hypot(paddleBall.vx, paddleBall.vy) - currentSpeed) < 0.01);
}

function testBounceWhiteBallsAccelerateIndependently() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  assert.strictEqual(hooks.BOUNCE_SPEED_GAIN_PER_SECOND, 0.025);
  assert.strictEqual(hooks.BOUNCE_MAX_SPEED_MULTIPLIER, 1.6);
  assert.strictEqual(hooks.BOUNCE_PADDLE_HALF_WIDTH_RADIUS_SCALE, 1.5);

  const young = hooks.makeBounceWhiteBall(runtime, 150, 400);
  const older = hooks.makeBounceWhiteBall(runtime, 240, 400);
  older.ageSeconds = 10;
  assert.strictEqual(young.ageSeconds, 0);
  assert.ok(Math.abs(hooks.getBounceBallSpeed(runtime, young) - state.ballSpeed) < 0.001);
  assert.ok(Math.abs(hooks.getBounceBallSpeed(runtime, older) - state.ballSpeed * 1.25) < 0.001);

  older.ageSeconds = 100;
  assert.ok(Math.abs(
    hooks.getBounceBallSpeed(runtime, older) - state.ballSpeed * 1.6
  ) < 0.001, "White-ball acceleration must stop at the 160% cap");
  assert.ok(Math.abs(hooks.getBounceBallSpeed(runtime, young) - state.ballSpeed) < 0.001,
    "Each multiball white ball must keep its own age and speed curve");
}

function testBounceThreeLivesAndPopup() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  for (const lives of [2, 1, 0]) {
    assert.strictEqual(hooks.launchBounceServe(runtime), true);
    state.whiteBalls[0].y = runtime.height + 50;
    hooks.updateBounceMode(runtime, 0.008, 1000 + lives * 1000);
    assert.strictEqual(state.livesLeft, lives);
    if (lives) {
      assert.strictEqual(state.waitingServe, true);
      assert.strictEqual(runtime.startTitleEl.textContent, `${lives} Balls Left!`);
      assert.strictEqual(runtime.startInstructionEl.textContent, "Tap to launch");
      assert.strictEqual(runtime.startOverlay.hidden, false);
    } else {
      assert.strictEqual(state.ended, true);
      assert.strictEqual(hooks.launchBounceServe(runtime), false);
    }
  }
}

function testBounceOverlayLifecycleAndRealDailyIsolation() {
  assert.ok(
    source.includes(
      'runtime.startOverlayHandler && runtime.mode !== FEED_MODES.BOUNCE'
    ),
    "Bounce must retain its overlay click handler for extra serves"
  );
  assert.ok(
    source.includes(
      'runtime.mode === FEED_MODES.BOUNCE && runtime.roundStarted'
    ),
    "Next-ball overlay taps must serve rather than restart the game"
  );
  assert.ok(
    source.includes(
      'if (runtime.mode === FEED_MODES.BOUNCE) {\n      launchBounceServe(runtime);'
    ),
    "Starting Bounce must launch exactly one opening white ball"
  );
  const previewSource = appSource.slice(
    appSource.indexOf("const FEEDING_GAME_TEST_MODES"),
    appSource.indexOf("const showDailyPreviewDialog", appSource.indexOf("const FEEDING_GAME_TEST_MODES"))
  );
  assert.ok(previewSource.includes('selectedMode.id === "classic" || selectedMode.id === "bounce"'));
  assert.ok(previewSource.includes('"Question stars add extra star pegs in Classic or multiball star bricks in Bounce."'));
  const realDaily = appSource.slice(
    appSource.indexOf("async function startDailyTodoSnack("),
    appSource.indexOf("function claimDailyTodoSnack(")
  );
  assert.ok(realDaily.includes("feedMode: selectedFeedMode"),
    "Real Daily uses the saved selected mode");
  assert.ok(realDaily.includes("ENABLE_DAILY_FEEDING_VARIETY"),
    "Classic-only fallback must remain available");
}

function testBounceGrayBricksCannotFinishWhileSnacksRemain() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  state.bricks.forEach((brick) => {
    if (!brick.config) brick.active = false;
  });
  assert.strictEqual(hooks.launchBounceServe(runtime), true);
  hooks.updateBounceMode(runtime, 1 / 120, 1000);
  assert.strictEqual(state.snacksReleased, false,
    "Breaking every gray brick must not finish the feeding game");
  assert.strictEqual(state.waitingServe, false);
  assert.strictEqual(state.whiteBalls.length, 1);
  assert.strictEqual(hooks.isBounceModeComplete(runtime, 1000), false);
  assert.strictEqual(runtime.finishAt, 0);
}

function testBounceLastSnackFinishesWithGrayBricksStanding() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  const lastSnack = state.bricks.find((brick) => brick.config?.id === "rainbow");
  // All other snack bricks have already released and resolved their food.
  state.bricks.forEach((brick) => {
    if (brick.config && brick !== lastSnack) brick.active = false;
  });
  assert.ok(state.bricks.some((brick) => brick.active && !brick.config));
  assert.strictEqual(hooks.launchBounceServe(runtime), true);
  hooks.updateBounceMode(runtime, 1 / 120, 1000);
  assert.strictEqual(state.snacksReleased, false);

  // The last colored brick releases the final snack. Gray bricks remain.
  hooks.breakBounceBrick(runtime, lastSnack, {}, 1000);
  assert.strictEqual(runtime.balls.length, 1);
  hooks.updateBounceMode(runtime, 1 / 120, 1008);
  assert.strictEqual(state.snacksReleased, true);
  assert.strictEqual(state.whiteBalls.length, 0,
    "No more white-ball rebounds are needed after the last food brick");
  assert.ok(state.bricks.some((brick) => brick.active && !brick.config));
  assert.strictEqual(hooks.isBounceModeComplete(runtime, 1008), false,
    "The final snack must finish falling before the results screen");

  runtime.balls[0].x = state.paddleX;
  runtime.balls[0].y = runtime.petCenterY - 5;
  hooks.updateBounceMode(runtime, 1 / 120, 1016);
  assert.strictEqual(runtime.balls.length, 0);
  assert.strictEqual(runtime.caughtCount, 1);
  assert.strictEqual(runtime.score, 5);
  assert.strictEqual(hooks.isBounceModeComplete(runtime, 1016), false);
  assert.strictEqual(runtime.finishAt, 1916);
  assert.strictEqual(hooks.isBounceModeComplete(runtime, 1916), true);

  const result = hooks.getModeController("bounce").buildResult({
    mode: "bounce", score: 7, caughtCount: 3, totalCount: 7
  });
  assert.deepStrictEqual(toPlain(result), {
    mode: "bounce", score: 7, caughtCount: 3,
    totalCount: 7, completed: true
  });
}

function testBounceLastSnackMissStillAllowsCompletion() {
  const runtime = makeBounceRuntime(0);
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  state.bricks.forEach((brick) => {
    if (brick.config) brick.active = false;
  });
  assert.strictEqual(hooks.launchBounceServe(runtime), true);
  hooks.updateBounceMode(runtime, 1 / 120, 1000);
  assert.strictEqual(state.snacksReleased, true);
  assert.ok(state.bricks.some((brick) => brick.active),
    "The game must not require breaking remaining gray bricks");
  assert.strictEqual(state.livesLeft, 3);

  runtime.balls = [{
    x: 10, y: runtime.height + 30, vy: 120,
    radius: 10, rotation: 0
  }];
  hooks.updateBounceMode(runtime, 1 / 120, 1010);
  assert.strictEqual(runtime.balls.length, 0);
  assert.strictEqual(runtime.caughtCount, 0);
  assert.strictEqual(runtime.score, 0);
  assert.strictEqual(hooks.isBounceModeComplete(runtime, 1010), false);
  assert.strictEqual(runtime.finishAt, 1910,
    "Missing the final released snack must not stall the round");
  assert.strictEqual(hooks.isBounceModeComplete(runtime, 1910), true);
}

function testMelodyExactOdeToJoySequence() {
  const reference = extractVerseTyperOdeToJoy();
  const feeding = Array.from(hooks.FEED_MELODIES[0].notes);

  assert.strictEqual(hooks.FEED_MELODIES[0].id, "odeToJoy");
  assert.strictEqual(hooks.FEED_MELODIES[0].label, "Ode to Joy");
  assert.strictEqual(hooks.FEED_MELODIES[0].bpm, 116);
  assert.strictEqual(reference.length, 60);
  assert.deepStrictEqual(feeding, reference);
}

function testMelodyTuneRegistryAndSelection() {
  assert.deepStrictEqual(
    Array.from(hooks.FEED_MELODIES)
      .map((tune) => tune.id),
    ["odeToJoy", "turkeyInTheStraw"]
  );

  const turkey =
    hooks.getFeedMelodyById(
      "turkeyInTheStraw"
    );

  assert.ok(turkey);
  assert.strictEqual(
    turkey.label,
    "Turkey in the Straw"
  );
  assert.strictEqual(turkey.bpm, 132);
  assert.strictEqual(
    hooks.getFeedMelodyById("missing"),
    null
  );

  assert.strictEqual(
    hooks.selectFeedMelody(
      "turkeyInTheStraw",
      () => 0
    ).id,
    "turkeyInTheStraw",
    "An explicit Preview tune must override random selection"
  );
  assert.strictEqual(
    hooks.selectFeedMelody("", () => 0).id,
    "odeToJoy"
  );
  assert.strictEqual(
    hooks.selectFeedMelody("", () => 0.999).id,
    "turkeyInTheStraw"
  );
}

function testTurkeyInTheStrawVerseTimeline() {
  const tune =
    hooks.getFeedMelodyById(
      "turkeyInTheStraw"
    );
  const notes =
    hooks.normalizeFeedMelodyNotes(
      tune.notes
    );
  const playable =
    notes.filter(
      (note) => Number.isFinite(note.midi)
    );
  const totalBeats =
    notes.reduce(
      (sum, note) => sum + note.beats,
      0
    );

  assert.strictEqual(notes.length, 52);
  assert.strictEqual(playable.length, 51);
  assert.strictEqual(totalBeats, 33);
  assert.deepStrictEqual(
    toPlain(notes.slice(0, 9)),
    [
      { midi: 71, beats: 0.5 },
      { midi: 69, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 66, beats: 0.5 },
      { midi: 67, beats: 0.5 },
      { midi: 69, beats: 0.5 },
      { midi: 67, beats: 1 },
      { midi: 59, beats: 0.5 },
      { midi: 60, beats: 0.5 }
    ]
  );
  assert.deepStrictEqual(
    toPlain(notes.slice(-4)),
    [
      { midi: 71, beats: 1 },
      { midi: 69, beats: 1 },
      { midi: 67, beats: 1 },
      { midi: null, beats: 1 }
    ]
  );

  const timeline =
    hooks.createMelodyTimeline(
      tune.notes,
      400,
      { bpm: tune.bpm }
    );
  const beatMs = 60000 / tune.bpm;

  assert.ok(
    Math.abs(
      timeline[1].spawnOffsetMs -
      beatMs * 0.5
    ) < 0.001
  );
  assert.ok(
    Math.abs(
      (
        timeline[7].spawnOffsetMs -
        timeline[6].spawnOffsetMs
      ) -
      beatMs
    ) < 0.001,
    "Quarter-note values must create wider snack spacing than eighth notes"
  );
  assert.strictEqual(timeline.at(-1).midi, null);
  assert.strictEqual(timeline.at(-1).laneFraction, null);

  const runtime = makeLabyrinthRuntime(0);
  runtime.mode = "melody";
  runtime.requestedMelodyId =
    "turkeyInTheStraw";
  runtime.scoreEl = { textContent: "" };
  hooks.initializeMelodyMode(runtime);

  assert.strictEqual(
    runtime.melody.tuneId,
    "turkeyInTheStraw"
  );
  assert.strictEqual(runtime.melody.bpm, 132);
  assert.strictEqual(runtime.totalCount, 51);
  assert.strictEqual(
    runtime.melody.timeline.length,
    52
  );
}

function testMelodyRenderAndControllerContract() {
  const markup = api.render({
    session: {
      petName: "Pip",
      feedMode: "melody"
    }
  });

  assert.ok(markup.includes('data-daily-feed-mode="melody"'));
  assert.ok(markup.includes("Catch the BibloSnacks!"));
  assert.ok(markup.includes("Drag to catch snacks and play the tune!"));
  assert.ok(markup.includes("falling musical snacks"));
  assert.ok(markup.includes("Caught</span>"));
  assert.ok(markup.includes(">0%</strong>"));

  const controller = hooks.getModeController("melody");
  assert.strictEqual(controller.id, "melody");
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
      `Melody controller must provide ${name}()`
    );
  });
}

function testMelodyTimingModel() {
  assert.strictEqual(hooks.MELODY_BPM, 116);
  assert.strictEqual(hooks.MELODY_BEAT_MS, 60000 / 116);
  assert.strictEqual(hooks.MELODY_TRAVEL_MS, 2400);
  assert.strictEqual(hooks.MELODY_BACKGROUND_GAP_MS, 250);

  const timeline = hooks.createMelodyTimeline(
    [60, 62, { midi: 64, beats: 2 }, { midi: null, beats: 0.5 }, 65],
    400
  );

  assert.strictEqual(timeline[0].spawnOffsetMs, 0);
  assert.ok(Math.abs(timeline[1].spawnOffsetMs - hooks.MELODY_BEAT_MS) < 0.001);
  assert.ok(Math.abs(timeline[2].spawnOffsetMs - hooks.MELODY_BEAT_MS * 2) < 0.001);
  assert.ok(Math.abs(timeline[3].spawnOffsetMs - hooks.MELODY_BEAT_MS * 4) < 0.001);
  assert.strictEqual(timeline[3].midi, null);
  assert.strictEqual(timeline[3].laneFraction, null);
  assert.ok(Math.abs(timeline[4].spawnOffsetMs - hooks.MELODY_BEAT_MS * 4.5) < 0.001);
  assert.strictEqual(
    timeline[0].arrivalOffsetMs - timeline[0].spawnOffsetMs,
    hooks.MELODY_TRAVEL_MS
  );
}

function testMelodyLanePathIsReadable() {
  const path = hooks.createMelodyLanePath(60);
  assert.strictEqual(path.length, 60);
  assert.deepStrictEqual(
    toPlain(hooks.MELODY_HOLD_LENGTHS),
    [3, 5, 4, 6]
  );
  assert.strictEqual(hooks.MELODY_TRANSITION_NOTES, 4);
  assert.deepStrictEqual(
    toPlain(hooks.MELODY_LANE_FRACTIONS),
    {
      farLeft: 0.2,
      left: 0.35,
      middle: 0.5,
      right: 0.65,
      farRight: 0.8
    }
  );
  assert.deepStrictEqual(
    toPlain(hooks.MELODY_TARGET_LANE_SEQUENCE),
    [
      "farLeft",
      "middle",
      "left",
      "right",
      "farRight",
      "middle",
      "farLeft",
      "left",
      "right",
      "middle",
      "farRight",
      "middle"
    ]
  );

  path.forEach((fraction) => {
    assert.ok(fraction >= 0.2 && fraction <= 0.8);
  });

  for (let index = 1; index < path.length; index += 1) {
    assert.ok(
      Math.abs(path[index] - path[index - 1]) <= 0.075 + 1e-9,
      "Melody lane transitions must stay achievable at the existing BPM"
    );
  }

  assert.deepStrictEqual(
    toPlain(path.slice(0, 3)),
    new Array(3).fill(0.2)
  );
  assert.deepStrictEqual(
    toPlain(
      path.slice(3, 7)
        .map((value) => Number(value.toFixed(3)))
    ),
    [0.275, 0.35, 0.425, 0.5]
  );
}

function testMelodyLaneTargetsStayWithinTwoLanes() {
  const laneNames = Object.keys(hooks.MELODY_LANE_FRACTIONS);
  const laneIndexes = new Map(
    laneNames.map((laneName, index) => [laneName, index])
  );
  const targets = Array.from(
    hooks.MELODY_TARGET_LANE_SEQUENCE
  );

  targets.forEach((laneName) => {
    assert.ok(
      laneIndexes.has(laneName),
      `Unknown Melody lane target: ${laneName}`
    );
  });

  for (let index = 0; index < targets.length; index += 1) {
    const current = laneIndexes.get(targets[index]);
    const next = laneIndexes.get(
      targets[(index + 1) % targets.length]
    );

    assert.ok(
      Math.abs(next - current) <= 2,
      "Melody target changes must never jump more than two lanes"
    );
  }
}

function testMelodyMidiFrequencyMatchesVerseTyper() {
  assert.ok(Math.abs(hooks.midiToFrequency(69) - 440) < 0.000001);
  assert.ok(Math.abs(hooks.midiToFrequency(60) - 261.625565) < 0.001);
  assert.ok(
    verseTyperSource.includes(
      "440 * Math.pow(2, (midi - 69) / 12)"
    )
  );
  assert.ok(
    source.includes(
      "440 * Math.pow(2, (Number(midi) - 69) / 12)"
    )
  );
}

function testMelodyPercentageScoring() {
  assert.strictEqual(hooks.calculateMelodyCatchPercent(60, 60), 100);
  assert.strictEqual(hooks.calculateMelodyCatchPercent(0, 60), 0);
  assert.strictEqual(hooks.calculateMelodyCatchPercent(46, 60), 77);

  const result = hooks.buildMelodyResult({
    mode: "melody",
    score: 0,
    caughtCount: 46,
    totalCount: 60,
    scheduled: []
  });

  assert.deepStrictEqual(
    toPlain(result),
    {
      mode: "melody",
      score: 77,
      caughtCount: 46,
      totalCount: 60,
      completed: true,
      catchPercent: 77
    }
  );
  assert.ok(
    source.includes("`Snacks Caught: ${Number(result.catchPercent) || 0}%`")
  );
}

function testMelodyIgnoresQuestionStars() {
  const runtime = makeLabyrinthRuntime(2);
  runtime.mode = "melody";
  runtime.requestedMelodyId = "odeToJoy";
  runtime.scoreEl = { textContent: "" };

  hooks.initializeMelodyMode(runtime);

  assert.deepStrictEqual(toPlain(runtime.pegs), []);
  assert.deepStrictEqual(toPlain(runtime.bursts), []);
  assert.strictEqual(runtime.totalCount, 60);
  assert.strictEqual(runtime.melody.tuneId, "odeToJoy");
  assert.strictEqual(runtime.melody.bpm, 116);
  assert.strictEqual(runtime.scheduled.length, 0);
  assert.strictEqual(runtime.scoreEl.textContent, "0%");
}

function testMelodyCompletionWaitsForFinalArrival() {
  const runtime = makeLabyrinthRuntime(0);
  runtime.mode = "melody";
  runtime.modeConfig = hooks.FEED_MODE_CONFIGS.melody;
  runtime.requestedMelodyId = "odeToJoy";
  runtime.scoreEl = { textContent: "" };
  hooks.initializeMelodyMode(runtime);

  const controller = hooks.getModeController("melody");
  runtime.melody.classifiedCount = 59;
  assert.strictEqual(controller.isComplete(runtime, 1000), false);
  assert.strictEqual(runtime.finishAt, 0);

  runtime.melody.classifiedCount = 60;
  assert.strictEqual(controller.isComplete(runtime, 1000), false);
  assert.strictEqual(runtime.finishAt, 1900);
  assert.strictEqual(controller.isComplete(runtime, 1899), false);
  assert.strictEqual(controller.isComplete(runtime, 1900), true);
}

function testMelodyAudioAndBackgroundSafety() {
  const catchStart = source.indexOf("function catchMelodyNote");
  const catchEnd = source.indexOf("function updateMelodyMode", catchStart);
  const catchSource = source.slice(catchStart, catchEnd);

  assert.ok(catchStart >= 0 && catchEnd > catchStart);
  assert.ok(catchSource.includes("playMelodyTone(runtime, entry.midi);"));
  assert.ok(!catchSource.includes("playChompSound"));
  assert.ok(
    source.includes(
      "now - state.lastUpdateAt > MELODY_BACKGROUND_GAP_MS"
    )
  );
  assert.ok(
    source.includes(
      "if (resumedAfterGap) {\n          classifyMelodyMiss(runtime, entry);"
    )
  );

  let stopCount = 0;
  let disconnectCount = 0;
  const runtime = {
    melody: {
      activeVoices: new Set([
        {
          oscillator: {
            stop() { stopCount += 1; },
            disconnect() { disconnectCount += 1; }
          },
          gain: {
            disconnect() { disconnectCount += 1; }
          }
        }
      ]),
      lastUpdateAt: 100
    }
  };

  hooks.disposeMelodyMode(runtime);
  assert.strictEqual(stopCount, 1);
  assert.strictEqual(disconnectCount, 2);
  assert.strictEqual(runtime.melody.activeVoices.size, 0);
  assert.strictEqual(runtime.melody.lastUpdateAt, 0);
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
  let disconnected = 0;
  let audioClosed = 0;
  let stopDisposeCount = 0;

  const runtime = {
    running: true,
    rafId: 77,
    orientationHandler() {},
    resizeHandler() {},
    resizeObserver: { disconnect() { disconnected += 1; } },
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
    ["deviceorientation", "resize", "orientationchange"]
  );
  assert.strictEqual(disconnected, 1);
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

function testFeedingGameTesterRegistration() {
  assert.ok(
    appSource.includes(
      'id: "feeding",\n      label: "Feeding Game Tester",\n      order: 90'
    ),
    "Daily To-Do Preview must register the Feeding Game Tester"
  );
  assert.ok(
    appSource.includes(
      "onSelect:\n        showFeedingGameTesterDialog"
    )
  );
}

function testFeedingGameTesterModesAndStars() {
  const start =
    appSource.indexOf(
      "const FEEDING_GAME_TEST_MODES"
    );
  const end =
    appSource.indexOf(
      "const showDailyPreviewDialog",
      start
    );
  const testerSource =
    appSource.slice(start, end);

  assert.ok(start >= 0 && end > start);
  ["classic", "labyrinth", "melody", "bounce"]
    .forEach((mode) => {
      assert.ok(
        testerSource.includes(
          `id: "${mode}"`
        ),
        `Feeding Game Tester must list ${mode}`
      );
    });

  assert.strictEqual(
    (testerSource.match(/enabled: false/g) || []).length,
    0,
    "All four feeding modes should be enabled in Preview"
  );
  assert.ok(
    testerSource.includes(
      'id: "bounce",\n          label: "Bounce",\n          enabled: true'
    )
  );

  assert.ok(
    testerSource.includes(
      'id: "labyrinth",\n          label: "Labyrinth",\n          enabled: true'
    ),
    "Labyrinth must be launchable from the Feeding Game Tester"
  );
  assert.ok(
    testerSource.includes(
      'id: "melody",\n          label: "Melody",\n          enabled: true'
    ),
    "Melody must be launchable from the Feeding Game Tester"
  );

  assert.ok(
    testerSource.includes(
      "...[0, 1, 2].map("
    )
  );
  assert.ok(
    testerSource.includes(
      "`${starCount} ★`"
    )
  );
}

function testFeedingGamePreviewTuneSelector() {
  const start =
    appSource.indexOf(
      "const FEEDING_GAME_TEST_MELODIES"
    );
  const end =
    appSource.indexOf(
      "const showDailyPreviewDialog",
      start
    );
  const testerSource =
    appSource.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.ok(
    testerSource.includes(
      'id: "odeToJoy",\n          label: "Ode to Joy"'
    )
  );
  assert.ok(
    testerSource.includes(
      'id: "turkeyInTheStraw",\n          label: "Turkey in the Straw"'
    )
  );
  assert.ok(
    testerSource.includes(
      'title: "Choose Melody Tune"'
    )
  );
  assert.ok(
    testerSource.includes(
      'mode.id === "melody"\n                      ? showFeedingGameTuneDialog()'
    ),
    "Melody Preview must open the tune selector before launch"
  );
  assert.ok(
    testerSource.includes(
      'feedMelodyId:\n          selectedMelody?.id || ""'
    ),
    "Preview session must carry its explicit Melody tune"
  );
}

function testFeedingGamePreviewSessionIsolation() {
  const start =
    appSource.indexOf(
      "const launchFeedingGameTest"
    );
  const end =
    appSource.indexOf(
      "const showFeedingGameStarDialog",
      start
    );
  const launchSource =
    appSource.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.ok(
    launchSource.includes(
      "getOrCreateDailyTodoPreviewPlan({\n          persist: false"
    )
  );
  assert.ok(
    launchSource.includes(
      "feedGame.stop?.();\n      State.dailySnackSession = null;"
    ),
    "Preview launch must invalidate any stale snack session first"
  );
  assert.ok(
    launchSource.includes(
      "feedGame.prepareAudio?.();"
    )
  );
  assert.ok(
    launchSource.includes(
      "await requestDailySnackTiltPermission();"
    )
  );
  assert.ok(
    launchSource.includes(
      "dailyTodoPreview: true"
    )
  );
  assert.ok(
    launchSource.includes(
      "planId:\n          `daily-feed-preview-${Date.now()}`"
    )
  );
  assert.ok(
    launchSource.includes(
      "feedMode: selectedMode.id"
    )
  );
  assert.ok(
    launchSource.includes(
      'selectedMode.id === "melody" &&\n        !selectedMelody'
    ),
    "Preview Melody launches must reject unknown tune ids"
  );
  assert.ok(
    launchSource.includes(
      'feedMelodyId:\n          selectedMelody?.id || ""'
    )
  );
  assert.ok(
    launchSource.includes(
      "earnedStarPegCount:\n          selectedStars"
    )
  );
  assert.ok(
    launchSource.includes(
      "rewardScore: 0"
    )
  );
  assert.ok(
    launchSource.includes(
      "rewardCaught: 0"
    )
  );
  assert.ok(
    launchSource.includes(
      "rewardComplete: false"
    )
  );
  assert.ok(
    launchSource.includes(
      "rewardClaimed: false"
    )
  );
}

function testRealDailySnackUsesPersistedRotationAndHasClassicFallback() {
  const start = appSource.indexOf("async function startDailyTodoSnack(");
  const end = appSource.indexOf("function claimDailyTodoSnack(", start);
  const startSource = appSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(appSource.includes("const ENABLE_DAILY_FEEDING_VARIETY = true;"));
  assert.ok(startSource.includes("ready.plan.feedMode"));
  assert.ok(startSource.includes("ready.engine.DAILY_FEED_MODES?.includes"));
  assert.ok(startSource.includes("ENABLE_DAILY_FEEDING_VARIETY"));
  assert.ok(startSource.includes('      : "classic";'));
  assert.ok(startSource.includes("feedMode: selectedFeedMode"));
  assert.ok(startSource.includes("ready.plan.earnedStarPegCount"));
  assert.ok(!startSource.includes("dailyTodoPreview: true"));
}

function feedRotationState() {
  return dailyTodo.normalizeState({
    activePlan: null,
    stats: { feedRotation: { order: [], index: 0 } }
  });
}

function feedingPlan(mode, now, id = "feeding-test") {
  const completed = {
    status: "complete", startedAt: 1, pendingAt: 0,
    completedAt: 1, launchToken: "", pendingData: null
  };
  return {
    kind: "care", id, profileId: "profile-A",
    day: dailyTodo.localDayKey(now), verseId: "john_3_16",
    activity: { kind: "game", id: "verse_game", mode: "easy" },
    requiredTaskIds: ["review", "questions", "activity"],
    tasks: {
      review: { ...completed }, questions: { ...completed },
      activity: { ...completed }
    },
    educationalCompletedAt: 1,
    earnedStarPegCount: 2,
    feedMode: mode,
    snack: { unlocked: true, claimed: false, claimedAt: 0 }
  };
}

function testDailyFeedRotationIsPermutationAndSurvivesPersistence() {
  let state = feedRotationState();
  const expected = ["classic", "labyrinth", "melody", "bounce"];
  assert.deepStrictEqual(Array.from(dailyTodo.DAILY_FEED_MODES), expected);
  const first = dailyTodo.nextDailyFeedMode(state.stats, () => 0.3);
  assert.ok(expected.includes(first));
  const before = JSON.stringify(state);
  const restored = dailyTodo.normalizeState(JSON.parse(before));
  assert.strictEqual(dailyTodo.nextDailyFeedMode(restored.stats), first);
  assert.strictEqual(JSON.stringify(restored), before);
  assert.strictEqual(new Set(restored.stats.feedRotation.order).size, 4);
  assert.strictEqual(restored.stats.feedRotation.index, 0);
}

function testFourClaimedFeedingDaysGetEveryMode() {
  let state = feedRotationState();
  const modes = [];
  const now = new Date(2026, 9, 14, 12, 0);
  for (let index = 0; index < 8; index += 1) {
    const selected = dailyTodo.nextDailyFeedMode(state.stats, () => 0.2);
    modes.push(selected);
    state.activePlan = feedingPlan(selected, now, `plan-${index}`);
    const claimed = dailyTodo.markSnackClaimed(state, {
      planId: `plan-${index}`, now, feedMode: selected, random: () => 0.2
    });
    assert.strictEqual(claimed.changed, true);
    state = claimed.state;
    assert.strictEqual(state.activePlan.snack.claimed, true);
    assert.strictEqual(state.activePlan.earnedStarPegCount, 2);
  }
  assert.deepStrictEqual(
    modes.slice(0, 4).sort(),
    Array.from(dailyTodo.DAILY_FEED_MODES).sort()
  );
  assert.deepStrictEqual(
    modes.slice(4, 8).sort(),
    Array.from(dailyTodo.DAILY_FEED_MODES).sort()
  );
  assert.notStrictEqual(modes[3], modes[4],
    "Adjacent four-day rotations should not repeat across the boundary");
}

function testFeedRotationDoesNotAdvanceForSkippedDaysOrDuplicateClaims() {
  let state = feedRotationState();
  const now = new Date(2026, 9, 14, 12, 0);
  const selected = dailyTodo.nextDailyFeedMode(state.stats, () => 0.4);
  const persisted = JSON.stringify(state.stats.feedRotation);
  assert.strictEqual(dailyTodo.nextDailyFeedMode(state.stats), selected);
  assert.strictEqual(JSON.stringify(state.stats.feedRotation), persisted);
  state.activePlan = feedingPlan(selected, now);
  const claimed = dailyTodo.markSnackClaimed(state, {
    planId: "feeding-test", now, feedMode: selected,
    random: () => 0.4
  });
  assert.strictEqual(claimed.changed, true);
  const afterFirst = JSON.stringify(claimed.state.stats.feedRotation);
  const again = dailyTodo.markSnackClaimed(claimed.state, {
    planId: "feeding-test", now, feedMode: selected
  });
  assert.strictEqual(again.changed, false);
  assert.strictEqual(JSON.stringify(again.state.stats.feedRotation), afterFirst);
}

function testClassicFallbackCanClaimWithoutAdvancingHiddenRotation() {
  let state = feedRotationState();
  const now = new Date(2026, 9, 14, 12, 0);
  const selected = dailyTodo.nextDailyFeedMode(state.stats, () => 0.5);
  state.activePlan = feedingPlan(selected, now);
  const before = JSON.stringify(state.stats.feedRotation);
  const fallback = dailyTodo.markSnackClaimed(state, {
    planId: "feeding-test", now, feedMode: ""
  });
  assert.strictEqual(fallback.changed, true);
  assert.strictEqual(JSON.stringify(fallback.state.stats.feedRotation), before);

  // Even a cycle whose next scheduled mode is Classic must not
  // advance while the emergency Classic-only switch is off.
  const classicState = feedRotationState();
  const classic = dailyTodo.nextDailyFeedMode(classicState.stats, () => 0.9999);
  assert.strictEqual(classic, "classic");
  classicState.activePlan = feedingPlan(classic, now);
  const classicBefore = JSON.stringify(classicState.stats.feedRotation);
  const classicFallback = dailyTodo.markSnackClaimed(classicState, {
    planId: "feeding-test", now, feedMode: ""
  });
  assert.strictEqual(classicFallback.changed, true);
  assert.strictEqual(JSON.stringify(classicFallback.state.stats.feedRotation),
    classicBefore);
}

function testLegacyPlanAndInvalidRotationDataAreSafe() {
  const now = new Date(2026, 9, 14, 12, 0);
  const oldPlan = feedingPlan("classic", now);
  delete oldPlan.feedMode;
  const normalized = dailyTodo.normalizeState({
    activePlan: oldPlan,
    stats: { feedRotation: { order: ["bounce", "bounce"], index: 99 } }
  });
  assert.strictEqual(normalized.activePlan.feedMode, "classic");
  assert.deepStrictEqual(normalized.stats.feedRotation, { order: [], index: 0 });
  assert.strictEqual(dailyTodo.normalizeFeedRotation({
    order: ["classic", "labyrinth", "melody", "bounce"], index: 8
  }).index, 0);
}

function carePlanOptions(progress, now) {
  return {
    progress, profileId: "profile-A", verseList: [{ id: "john_3_16" }],
    gameRegistry: [{ manifest: {
      id: "verse_game", modes: ["easy"],
      visibleInCarousel: true, progressType: "standard"
    } }],
    playgroundRegistry: [], isPetUnlocked: () => true,
    getPetStatus: () => "hungry", tutorialActive: true,
    now, random: () => 0.31
  };
}

function testRealCarePlanAssignsGameOnceAndRestoresIt() {
  const now = new Date(2026, 9, 14, 12, 0);
  const progress = { verses: { john_3_16: {
    learnCompleted: true, learnedAt: now.getTime(),
    lastPracticedAt: now.getTime()
  } } };
  const created = dailyTodo.getOrCreatePlan(carePlanOptions(progress, now));
  assert.strictEqual(created.created, true);
  assert.strictEqual(created.plan.kind, "care");
  assert.ok(dailyTodo.DAILY_FEED_MODES.includes(created.plan.feedMode));
  assert.strictEqual(created.plan.feedMode,
    created.state.stats.feedRotation.order[0]);
  const saved = JSON.parse(JSON.stringify(created.progress));
  const reopened = dailyTodo.getOrCreatePlan(
    carePlanOptions(saved, now)
  );
  assert.strictEqual(reopened.created, false);
  assert.strictEqual(reopened.plan.id, created.plan.id);
  assert.strictEqual(reopened.plan.feedMode, created.plan.feedMode);
  assert.strictEqual(reopened.state.stats.feedRotation.index, 0);
}

function testPersistedDailyPlanKeepsFeedAssignment() {
  const now = new Date(2026, 9, 14, 12, 0);
  let storage = { verses: { john_3_16: {
    learnCompleted: true, learnedAt: now.getTime()
  } } };
  const options = carePlanOptions(null, now);
  delete options.progress;
  const callbacks = {
    loadProgress: () => JSON.parse(JSON.stringify(storage)),
    saveProgress: (data) => {
      storage = JSON.parse(JSON.stringify(data));
      return true;
    }
  };
  const first = dailyTodo.getOrCreatePersistedPlan({ ...options, ...callbacks });
  assert.strictEqual(first.ok, true);
  assert.strictEqual(first.created, true);
  const second = dailyTodo.getOrCreatePersistedPlan({ ...options, ...callbacks });
  assert.strictEqual(second.ok, true);
  assert.strictEqual(second.created, false);
  assert.strictEqual(second.plan.feedMode, first.plan.feedMode);
  assert.deepStrictEqual(second.state.stats.feedRotation,
    first.state.stats.feedRotation);
}

function testIncompleteSnackCannotAdvanceRotation() {
  const now = new Date(2026, 9, 14, 12, 0);
  const state = feedRotationState();
  const selected = dailyTodo.nextDailyFeedMode(state.stats, () => 0.25);
  state.activePlan = feedingPlan(selected, now);
  state.activePlan.tasks.questions.status = "open";
  const before = JSON.stringify(state.stats.feedRotation);
  const rejected = dailyTodo.markSnackClaimed(state, {
    planId: "feeding-test", now, feedMode: selected
  });
  assert.strictEqual(rejected.changed, false);
  assert.strictEqual(rejected.state.activePlan.snack.claimed, false);
  assert.strictEqual(JSON.stringify(rejected.state.stats.feedRotation), before);
}

function testExpiredSnackCannotAdvanceRotation() {
  const now = new Date(2026, 9, 14, 12, 0);
  const nextDay = new Date(2026, 9, 15, 12, 0);
  const state = feedRotationState();
  const selected = dailyTodo.nextDailyFeedMode(state.stats, () => 0.25);
  state.activePlan = feedingPlan(selected, now);
  const before = JSON.stringify(state.stats.feedRotation);
  const rejected = dailyTodo.markSnackClaimed(state, {
    planId: "feeding-test", now: nextDay, feedMode: selected
  });
  assert.strictEqual(rejected.changed, false);
  assert.strictEqual(rejected.state.activePlan.snack.claimed, false);
  assert.strictEqual(JSON.stringify(rejected.state.stats.feedRotation), before);
}

function testDailyRotationAssignmentAndClaimPathAreSeparated() {
  const creationStart = dailyTodoSource.indexOf("  function getOrCreatePlan(");
  const creationEnd = dailyTodoSource.indexOf("  function getOrCreatePersistedPlan(", creationStart);
  const creation = dailyTodoSource.slice(creationStart, creationEnd);
  assert.ok(creation.includes("plan.feedMode = nextDailyFeedMode(state.stats, random)"));
  assert.ok(creation.indexOf("if (state.activePlan)") < creation.indexOf("plan.feedMode ="));
  const claimStart = appSource.indexOf("function claimDailyTodoSnack(");
  const claimEnd = appSource.indexOf("function markLearnCompleted(", claimStart);
  const claimSource = appSource.slice(claimStart, claimEnd);
  assert.ok(claimSource.includes("session.rewardClaimed"));
  assert.ok(claimSource.includes("markSnackClaimed("));
  assert.ok(claimSource.includes("feedMode: ENABLE_DAILY_FEEDING_VARIETY"));
  assert.ok(claimSource.includes('? session.feedMode\n          : ""'));

  assert.ok(claimSource.includes("saveDailyTodoRuntime("));
  assert.ok(claimSource.includes("session.planDay !== plan?.day"));
}

function testDailyFeedModeSpecificStarAndMelodyBehavior() {
  const realStart = appSource.indexOf("async function startDailyTodoSnack(");
  const realEnd = appSource.indexOf("function claimDailyTodoSnack(", realStart);
  const real = appSource.slice(realStart, realEnd);
  assert.ok(real.includes("ready.plan.earnedStarPegCount"));
  assert.ok(!real.includes("feedMelodyId:"),
    "Real Melody sessions should randomly choose between registered tunes");
  assert.ok(source.includes("session.feedMelodyId || \"\""));
  const config = hooks.FEED_MODE_CONFIGS;
  for (const mode of dailyTodo.DAILY_FEED_MODES) {
    assert.strictEqual(config[mode].implemented, true);
  }
  assert.strictEqual(config.bounce.schedule, "bounce-bricks");
  assert.strictEqual(config.melody.schedule, "melody");
}


function testPreviewClaimPathStaysTemporary() {
  const start =
    appSource.indexOf(
      "function claimDailyTodoSnack("
    );
  const realBranch =
    appSource.indexOf(
      "const loaded =\n    loadDailyTodoRuntime();",
      start
    );
  const previewSource =
    appSource.slice(
      start,
      realBranch
    );

  assert.ok(start >= 0 && realBranch > start);
  assert.ok(
    previewSource.includes(
      "session?.dailyTodoPreview === true"
    )
  );
  assert.ok(
    previewSource.includes(
      "session.rewardComplete = true;"
    )
  );
  assert.ok(
    previewSource.includes(
      "session.rewardClaimed = true;"
    )
  );
  assert.ok(
    !previewSource.includes(
      "markSnackClaimed"
    ),
    "Preview completion must not claim the real Daily snack"
  );
  assert.ok(
    !previewSource.includes(
      "saveDailyTodoRuntime"
    ),
    "Preview completion must not save real Daily progress"
  );
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
  assert.ok(normal.includes("daily-feed-shadow"));
  assert.ok(!normal.includes("data-daily-feed-paddle"));
  assert.ok(normal.includes("Catch the BibloSnacks!"));
  assert.ok(normal.includes("Drag to steer and catch the snacks!"));
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
  assert.ok(source.includes('window.addEventListener("deviceorientation", runtime.orientationHandler)'));
  assert.ok(source.includes('window.removeEventListener(\n        "deviceorientation"') || source.includes('window.removeEventListener("deviceorientation", runtime.orientationHandler)'));
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

function testModeAwareInstructionsAndTiltFallback() {
  const expected = {
    classic: "Drag to steer and catch the snacks!",
    labyrinth: "Drag to guide snacks through the gaps!",
    melody: "Drag to catch snacks and play the tune!",
    bounce: "Drag to rebound the white ball; feed your pet the colored snacks!"
  };
  Object.entries(expected).forEach(([mode, instruction]) => {
    assert.ok(api.render({ session: { feedMode: mode } }).includes(instruction));
    assert.ok(hooks.feedInstructionPrompt(mode, false).startsWith("Drag"));
    assert.ok(hooks.feedInstructionPrompt(mode, true).startsWith("Tilt or drag"));
  });
  const prior = sandboxWindow.DeviceOrientationEvent;
  sandboxWindow.DeviceOrientationEvent = function DeviceOrientationEvent() {};
  try {
    for (const mode of Object.keys(expected)) {
      assert.ok(api.render({ session: { feedMode: mode, rewardTiltEnabled: true } })
        .includes(hooks.feedInstructionPrompt(mode, true)));
    }
  } finally {
    sandboxWindow.DeviceOrientationEvent = prior;
  }
  assert.ok(source.includes('runtime.tiltObserved = true;'));
  assert.ok(source.includes('!runtime.tiltObserved'));
}

function testNormalizedPointerAndLandscapeTilt() {
  assert.strictEqual(hooks.normalizeFeedAxis(-2), -1);
  assert.strictEqual(hooks.normalizeFeedAxis(3), 1);
  assert.strictEqual(hooks.normalizeFeedAxis(NaN), 0);
  assert.strictEqual(hooks.pointerFeedAxis(0, 390), -1);
  assert.strictEqual(hooks.pointerFeedAxis(195, 390), 0);
  assert.strictEqual(hooks.pointerFeedAxis(390, 390), 1);
  assert.strictEqual(hooks.pointerFeedAxis(500, 390), 1);
  assert.strictEqual(hooks.feedTiltAngle({ gamma: null, beta: null }), null);
  sandboxWindow.screen = { orientation: { angle: 90 } };
  assert.strictEqual(hooks.feedTiltAngle({ gamma: 10, beta: 25 }), -25);
  sandboxWindow.screen.orientation.angle = 270;
  assert.strictEqual(hooks.feedTiltAngle({ gamma: 10, beta: 25 }), 25);
  sandboxWindow.screen.orientation.angle = 0;
  assert.strictEqual(hooks.feedTiltAngle({ gamma: -15, beta: 30 }), -15);
  delete sandboxWindow.screen;
}

function testUnifiedControlsAreModeSpecific() {
  const bounce = makeBounceRuntime(0);
  hooks.initializeBounceMode(bounce);
  hooks.getModeController("bounce").handleInput(bounce, { type: "pointer", axis: -1 });
  assert.strictEqual(bounce.bounce.paddleX, bounce.bounce.paddleHalfWidth);
  const labyrinth = makeLabyrinthRuntime(0);
  hooks.initializeLabyrinthMode(labyrinth);
  hooks.getModeController("labyrinth").handleInput(labyrinth, { type: "pointer", axis: 0.8 });
  assert.strictEqual(labyrinth.labyrinth.steering, 1);
  hooks.getModeController("labyrinth").handleInput(labyrinth, { type: "pointerend" });
  assert.strictEqual(labyrinth.labyrinth.steering, 0);
  const classic = makeBounceRuntime(0);
  hooks.getModeController("classic").handleInput(classic, { type: "pointer", axis: 1 });
  assert.strictEqual(classic.catcherX, classic.width - classic.petRadius);
  hooks.getModeController("melody").handleInput(classic, { type: "pointer", axis: -1 });
  assert.strictEqual(classic.catcherX, classic.petRadius);
}

function makeResizableRuntime(mode) {
  const runtime = makeBounceRuntime(1);
  runtime.mode = mode;
  runtime.width = 390;
  runtime.height = 844;
  runtime.dpr = 1;
  runtime.pegRadius = 16;
  runtime.petRadius = 48;
  runtime.petCenterY = 775;
  runtime.catcher.style.setProperty = () => {};
  runtime.petCircle.getBoundingClientRect = () => ({ left: 0, top: 490, width: 96, height: 96 });
  runtime.stage = {
    clientWidth: 844,
    clientHeight: 390,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 844, height: 390 })
  };
  runtime.canvas = { width: 390, height: 844 };
  runtime.modeController = { draw() {} };
  runtime.tiltEnabled = true;
  runtime.neutralGamma = 12;
  runtime.smoothedTilt = 7;
  runtime.tiltSamples = [10, 12];
  runtime.bursts = [];
  runtime.pegs = [];
  runtime.balls = [];
  return runtime;
}

function testResizeBouncePreservesLiveBoardAndMultiball() {
  const runtime = makeResizableRuntime("bounce");
  hooks.initializeBounceMode(runtime);
  const state = runtime.bounce;
  const oldIds = state.bricks.map((brick) => [brick.row, brick.column, brick.config?.id, brick.isStar]);
  const brick = state.bricks.find((item) => item.config);
  brick.active = false;
  state.livesLeft = 2;
  state.waitingServe = false;
  state.whiteBalls.push(hooks.makeBounceWhiteBall(runtime, 195, 400));
  state.whiteBalls[0].ageSeconds = 17;
  state.pendingWhiteBalls.push(hooks.makeBounceWhiteBall(runtime, 100, 250));
  const snackBrick = state.bricks.find((item) => item.config && item.active);
  hooks.spawnBounceSnack(runtime, snackBrick);
  const originalSnackId = runtime.balls[0].id;
  hooks.setActiveRuntimeForValidation(runtime);
  assert.strictEqual(hooks.resizeFeedStage(runtime), true);
  assert.strictEqual(runtime.width, 844);
  assert.strictEqual(runtime.height, 390);
  assert.strictEqual(runtime.canvas.width, 844);
  assert.strictEqual(runtime.canvas.height, 390);
  assert.strictEqual(state.livesLeft, 2);
  assert.strictEqual(state.waitingServe, false);
  assert.strictEqual(brick.active, false);
  assert.deepStrictEqual(
    state.bricks.map((item) => [item.row, item.column, item.config?.id, item.isStar]),
    oldIds
  );
  for (const item of state.bricks) {
    const rect = hooks.bounceBrickGeometry(844, 390, item.row, item.column);
    assert.strictEqual(item.x, rect.x);
    assert.strictEqual(item.y, rect.y);
  }
  assert.strictEqual(state.whiteBalls.length, 1);
  assert.strictEqual(state.pendingWhiteBalls.length, 1);
  assert.strictEqual(state.whiteBalls[0].ageSeconds, 17);
  assert.strictEqual(runtime.balls[0].id, originalSnackId);
  assert.ok(runtime.balls[0].x >= 0 && runtime.balls[0].x <= 844);
  assert.strictEqual(runtime.tiltSamples.length, 0);
  assert.strictEqual(runtime.neutralGamma, null);
  assert.strictEqual(hooks.resizeFeedStage(runtime), false,
    "No-op resize must leave the in-progress game unchanged");
  hooks.setActiveRuntimeForValidation(null);
}

function testResizeLabyrinthPreservesGapsAndSnackState() {
  const runtime = makeResizableRuntime("labyrinth");
  hooks.initializeLabyrinthMode(runtime);
  runtime.labyrinth.platformRows[0].gapPosition = "right";
  runtime.labyrinth.steering = 0.5;
  runtime.score = 4;
  runtime.balls.push({
    id: 1, x: 100, y: 120, vx: 20, vy: 45,
    radius: 10, trail: [], labyrinthProgressX: 95, labyrinthProgressY: 110
  });
  const rows = runtime.labyrinth.platformRows;
  hooks.setActiveRuntimeForValidation(runtime);
  assert.strictEqual(hooks.resizeFeedStage(runtime), true);
  assert.strictEqual(runtime.labyrinth.platformRows, rows,
    "Do not replace platform rows after resizing");
  assert.strictEqual(rows[0].gapPosition, "right");
  assert.strictEqual(runtime.labyrinth.steering, 0.5);
  assert.strictEqual(runtime.balls[0].id, 1);
  assert.strictEqual(runtime.score, 4);
  assert.ok(runtime.balls[0].x > 100);
  assert.ok(runtime.balls[0].labyrinthProgressX > 95);
  hooks.setActiveRuntimeForValidation(null);
}

function testResizeMelodyPreservesTimingAndNoteStatus() {
  const runtime = makeResizableRuntime("melody");
  runtime.requestedMelodyId = "turkeyInTheStraw";
  hooks.initializeMelodyMode(runtime);
  const state = runtime.melody;
  const timeline = state.timeline;
  state.startTime = 1000;
  state.classifiedCount = 2;
  timeline[0].status = "caught";
  timeline[1].status = "missed";
  runtime.caughtCount = 1;
  runtime.score = 1;
  hooks.setActiveRuntimeForValidation(runtime);
  assert.strictEqual(hooks.resizeFeedStage(runtime), true);
  assert.strictEqual(state.timeline, timeline);
  assert.strictEqual(state.startTime, 1000);
  assert.strictEqual(state.classifiedCount, 2);
  assert.strictEqual(timeline[0].status, "caught");
  assert.strictEqual(timeline[1].status, "missed");
  assert.strictEqual(runtime.caughtCount, 1);
  assert.strictEqual(runtime.score, 1);
  const nextNote = timeline.find((entry) => entry.laneFraction !== null);
  assert.strictEqual(nextNote.x, 844 * nextNote.laneFraction);
  hooks.setActiveRuntimeForValidation(null);
}

function testPreviewNeverClaimsDailyCompletion() {
  const preview = api.render({ session: {
    feedMode: "bounce", dailyTodoSnack: true, dailyTodoPreview: true, petName: "Pip"
  } });
  assert.ok(!preview.includes("Zoo To-Do Complete!"));
  assert.ok(!preview.includes("Thanks for the snack!"));
  assert.ok(!preview.includes("is-daily-todo-snack"));
  assert.ok(preview.includes("Back to Zoo"));
  const daily = api.render({ session: { feedMode: "classic", dailyTodoSnack: true } });
  assert.ok(daily.includes("Zoo To-Do Complete!"));
  assert.ok(daily.includes("Back Home"));
  const target = (mode, isPreview) => {
    const runtime = {
      mode, dailyTodoSnack: true, dailyTodoPreview: isPreview,
      zookeeperName: "Someone", petName: "Pip", running: true,
      rafId: 0, stage: {}, startOverlay: { hidden: false },
      resultOverlay: { hidden: true }, resultTitleEl: { textContent: "" },
      resultScoreEl: { textContent: "" },
      resultCatchesEl: { textContent: "", hidden: false },
      gameEl: { classList: { add() {} } },
      modeTimers: new Set(), modeController: { dispose() {} }
    };
    hooks.setActiveRuntimeForValidation(runtime);
    hooks.showResult(runtime, {
      mode, score: 5, caughtCount: 3, totalCount: 7, catchPercent: 71
    });
    return runtime;
  };
  const previewRuntime = target("bounce", true);
  assert.ok(!previewRuntime.resultTitleEl.textContent.includes("Thanks for the snack"));
  assert.strictEqual(previewRuntime.resultScoreEl.textContent, "Score: 5");
  assert.strictEqual(previewRuntime.resultCatchesEl.textContent, "Caught 3 of 7 snacks");
  const melodyRuntime = target("melody", true);
  assert.strictEqual(melodyRuntime.resultScoreEl.textContent, "Snacks Caught: 71%");
  assert.strictEqual(melodyRuntime.resultCatchesEl.hidden, true);
  const dailyRuntime = target("classic", false);
  assert.ok(dailyRuntime.resultTitleEl.textContent.includes("Thanks for the snack, Someone!"));
  hooks.setActiveRuntimeForValidation(null);
}

function testResizeClassicPreservesStarsBallsAndScore() {
  const runtime = makeResizableRuntime("classic");
  runtime.pegs = [{ id: "star", x: 140, y: 200, radius: 16, isStar: true }];
  runtime.balls = [{
    id: 5, config: { id: "red" }, x: 100, y: 300,
    radius: 10, vx: 30, vy: 60, bornAt: 555, trail: []
  }];
  runtime.score = 6;
  runtime.caughtCount = 2;
  runtime.scheduledIndex = 3;
  hooks.setActiveRuntimeForValidation(runtime);
  assert.strictEqual(hooks.resizeFeedStage(runtime), true);
  assert.strictEqual(runtime.pegs.length, 1);
  assert.strictEqual(runtime.pegs[0].id, "star");
  assert.strictEqual(runtime.pegs[0].isStar, true);
  assert.strictEqual(runtime.balls.length, 1);
  assert.strictEqual(runtime.balls[0].id, 5);
  assert.strictEqual(runtime.balls[0].bornAt, 555);
  assert.ok(runtime.balls[0].x > 100);
  assert.strictEqual(runtime.score, 6);
  assert.strictEqual(runtime.caughtCount, 2);
  assert.strictEqual(runtime.scheduledIndex, 3);
  hooks.setActiveRuntimeForValidation(null);
}

function testTiltTouchSwitchingAndSensorUnavailability() {
  const runtime = makeResizableRuntime("classic");
  runtime.tiltEnabled = true;
  runtime.dragging = false;
  runtime.tiltCalibrationUntil = 0;
  runtime.neutralGamma = null;
  runtime.smoothedTilt = 0;
  runtime.tiltSamples = [];
  hooks.setActiveRuntimeForValidation(runtime);
  assert.strictEqual(hooks.readNormalizedTilt(runtime, { gamma: null }), null);
  assert.strictEqual(runtime.tiltObserved, undefined);
  assert.strictEqual(hooks.readNormalizedTilt(runtime, { gamma: 5 }), 0);
  const steered = hooks.readNormalizedTilt(runtime, { gamma: 30 });
  assert.ok(steered > 0 && steered <= 1);
  runtime.dragging = true;
  assert.strictEqual(hooks.readNormalizedTilt(runtime, { gamma: -20 }), null);
  assert.ok(hooks.pointerFeedAxis(0, runtime.width) < 0);
  runtime.dragging = false;
  runtime.neutralGamma = null;
  assert.strictEqual(hooks.readNormalizedTilt(runtime, { gamma: 12 }), 0);
  hooks.setActiveRuntimeForValidation(null);
}

function testReducedMotionPreservesGameplayAndAudioSafety() {
  const runtime = { reducedMotion: true, bursts: [], pegRadius: 16 };
  hooks.createStarBurst(runtime, { x: 40, y: 50 }, 1000);
  assert.strictEqual(runtime.bursts.length, 0);
  assert.ok(source.includes('if (runtime.reducedMotion) return;'));
  assert.ok(source.includes('if (runtime.reducedMotion) setTimeout(() => popup.remove(), 850)'));
  assert.ok(feedGameCssSource.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(feedGameCssSource.includes('animation: none'));
  assert.ok(source.includes('if (!context || context.state === "closed") return;'));
}

function main() {
  const tests = [
    testPublicApiContract,
    testFeedModeRegistryAndNormalization,
    testFeedModeConfigurations,
    testUnavailableModesSafelyResolveToClassic,
    testClassicModeControllerContract,
    testLabyrinthRenderAndControllerContract,
    testLabyrinthPlatformGeneration,
    testLabyrinthQuestionStarsDoNotAffectBoard,
    testLabyrinthPetReversesAtBoundaries,
    testLabyrinthPlatformCollisionIsForgiving,
    testLabyrinthLandingBounceIsBounded,
    testLabyrinthSteeringAcceleratesAllSnacks,
    testLabyrinthFixedStepPreventsPlatformTunneling,
    testLabyrinthOldBallsDoNotExpire,
    testLabyrinthStuckRecoveryNudgesTowardGap,
    testLabyrinthAlwaysReachesCompletion,
    testBounceRenderAndControllerContract,
    testBounceBrickLayoutAndQuestionStars,
    testBounceSeparatePetPaddleAndServe,
    testBounceCollisionRemovesBricksAndDropsCorrectSnacks,
    testBounceBrickImpactReboundsAndSingleDrop,
    testBounceSnackCatchUsesPetAndScoresRainbow,
    testBounceStarBricksCreateBonusNotLives,
    testBouncePhysicsAndPaddleRebound,
    testBounceWhiteBallsAccelerateIndependently,
    testBounceThreeLivesAndPopup,
    testBounceGrayBricksCannotFinishWhileSnacksRemain,
    testBounceLastSnackFinishesWithGrayBricksStanding,
    testBounceLastSnackMissStillAllowsCompletion,
    testBounceOverlayLifecycleAndRealDailyIsolation,
    testMelodyExactOdeToJoySequence,
    testMelodyTuneRegistryAndSelection,
    testTurkeyInTheStrawVerseTimeline,
    testMelodyRenderAndControllerContract,
    testMelodyTimingModel,
    testMelodyLanePathIsReadable,
    testMelodyLaneTargetsStayWithinTwoLanes,
    testMelodyMidiFrequencyMatchesVerseTyper,
    testMelodyPercentageScoring,
    testMelodyIgnoresQuestionStars,
    testMelodyCompletionWaitsForFinalArrival,
    testMelodyAudioAndBackgroundSafety,
    testStandardResultContract,
    testModeDisposalAndStopAreIdempotent,
    testFeedingGameTesterRegistration,
    testFeedingGameTesterModesAndStars,
    testFeedingGamePreviewTuneSelector,
    testFeedingGamePreviewSessionIsolation,
    testRealDailySnackUsesPersistedRotationAndHasClassicFallback,
    testDailyFeedRotationIsPermutationAndSurvivesPersistence,
    testFourClaimedFeedingDaysGetEveryMode,
    testFeedRotationDoesNotAdvanceForSkippedDaysOrDuplicateClaims,
    testClassicFallbackCanClaimWithoutAdvancingHiddenRotation,
    testLegacyPlanAndInvalidRotationDataAreSafe,
    testRealCarePlanAssignsGameOnceAndRestoresIt,
    testPersistedDailyPlanKeepsFeedAssignment,
    testIncompleteSnackCannotAdvanceRotation,
    testExpiredSnackCannotAdvanceRotation,
    testDailyRotationAssignmentAndClaimPathAreSeparated,
    testDailyFeedModeSpecificStarAndMelodyBehavior,
    testPreviewClaimPathStaysTemporary,
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
    testClassicStartRejectsMissingInputs,
    testModeAwareInstructionsAndTiltFallback,
    testNormalizedPointerAndLandscapeTilt,
    testUnifiedControlsAreModeSpecific,
    testResizeBouncePreservesLiveBoardAndMultiball,
    testResizeLabyrinthPreservesGapsAndSnackState,
    testResizeMelodyPreservesTimingAndNoteStatus,
    testResizeClassicPreservesStarsBallsAndScore,
    testTiltTouchSwitchingAndSensorUnavailability,
    testPreviewNeverClaimsDailyCompletion,
    testReducedMotionPreservesGameplayAndAudioSafety
  ];

  tests.forEach((test) => test());

  console.log(
    `Daily feeding game validation passed (${tests.length} checks).`
  );
}

main();
