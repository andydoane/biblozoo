"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const feedGamePath = path.join(rootDir, "daily_questions_feed_game.js");
const appPath = path.join(rootDir, "app.js");
const verseTyperPath = path.join(
  rootDir,
  "verse_playground",
  "verse_typer",
  "game.js"
);
const source = fs.readFileSync(feedGamePath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");
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
    MELODY_BPM,
    MELODY_BEAT_MS,
    MELODY_TRAVEL_MS,
    MELODY_BACKGROUND_GAP_MS,
    MELODY_LANE_FRACTIONS,
    MELODY_HOLD_LENGTHS,
    MELODY_TRANSITION_NOTES,
    MELODY_TARGET_LANE_SEQUENCE,
    FEED_MELODIES,
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
    "Tilt to guide the snacks"
  );

  ["bounce"]
    .forEach((mode) => {
      assert.strictEqual(
        configs[mode].implemented,
        false,
        `${mode} must stay unavailable until its gameplay patch lands`
      );
    });

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

  ["bounce"]
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
      feedMode: "bounce"
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

  ["bounce"]
    .forEach((mode) => {
      assert.strictEqual(
        hooks.getModeController(mode),
        controller
      );
    });

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
      "Tilt to guide the snacks"
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
      "runtime.smoothedTilt * 0.72"
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

function testMelodyExactOdeToJoySequence() {
  const reference = extractVerseTyperOdeToJoy();
  const feeding = Array.from(hooks.FEED_MELODIES[0].notes);

  assert.strictEqual(hooks.FEED_MELODIES[0].id, "odeToJoy");
  assert.strictEqual(reference.length, 60);
  assert.deepStrictEqual(feeding, reference);
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
  assert.ok(markup.includes("Tilt to make music"));
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
  runtime.scoreEl = { textContent: "" };

  hooks.initializeMelodyMode(runtime);

  assert.deepStrictEqual(toPlain(runtime.pegs), []);
  assert.deepStrictEqual(toPlain(runtime.bursts), []);
  assert.strictEqual(runtime.totalCount, 60);
  assert.strictEqual(runtime.scheduled.length, 0);
  assert.strictEqual(runtime.scoreEl.textContent, "0%");
}

function testMelodyCompletionWaitsForFinalArrival() {
  const runtime = makeLabyrinthRuntime(0);
  runtime.mode = "melody";
  runtime.modeConfig = hooks.FEED_MODE_CONFIGS.melody;
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
    (
      testerSource.match(
        /enabled: false/g
      ) || []
    ).length,
    1,
    "Only Bounce should remain disabled after Patch 05"
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

function testRealDailySnackExplicitlyUsesClassic() {
  const start =
    appSource.indexOf(
      "async function startDailyTodoSnack("
    );
  const end =
    appSource.indexOf(
      "function claimDailyTodoSnack(",
      start
    );
  const startSource =
    appSource.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.ok(
    startSource.includes(
      'dailyTodoSnack: true,\n    feedMode: "classic",'
    ),
    "Normal Daily snack sessions must explicitly launch Classic"
  );
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
    testMelodyExactOdeToJoySequence,
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
    testFeedingGamePreviewSessionIsolation,
    testRealDailySnackExplicitlyUsesClassic,
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
    testClassicStartRejectsMissingInputs
  ];

  tests.forEach((test) => test());

  console.log(
    `Daily feeding game validation passed (${tests.length} checks).`
  );
}

main();
