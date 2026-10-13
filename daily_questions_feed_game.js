(() => {
  "use strict";

  const ASSET_BASE = "./verse_images/daily_questions/";
  const BACKGROUND_SCENES = Object.freeze([
    "beach", "canyon", "clouds", "glacier", "hills", "mesa",
    "moon", "mountain", "swamp", "volcano", "waterfall"
  ]);
  const SOLID_BALLS = Object.freeze([
    { id: "red", color: "#ff5a51", asset: `${ASSET_BASE}dq_feed_ball_red.png` },
    { id: "yellow", color: "#ffc751", asset: `${ASSET_BASE}dq_feed_ball_yellow.png` },
    { id: "orange", color: "#ff963f", asset: `${ASSET_BASE}dq_feed_ball_orange.png` },
    { id: "green", color: "#78ad4f", asset: `${ASSET_BASE}dq_feed_ball_green.png` },
    { id: "blue", color: "#46aef0", asset: `${ASSET_BASE}dq_feed_ball_blue.png` },
    { id: "purple", color: "#7f66c6", asset: `${ASSET_BASE}dq_feed_ball_purple.png` }
  ]);
  const RAINBOW_BALL = Object.freeze({
    id: "rainbow",
    color: "#ffc751",
    asset: `${ASSET_BASE}dq_feed_ball_rainbow.png`,
    points: 5,
    trailColors: ["#ff5a51", "#ff963f", "#ffc751", "#78ad4f", "#46aef0", "#7f66c6"]
  });
  const PEG_NOTE_FREQUENCIES = Object.freeze([
    523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98
  ]);
  const TILT_CALIBRATION_MS = 750;
  const INTRO_TAP_LOCKOUT_MS = 800;

  const FEED_MODES = Object.freeze({
    CLASSIC: "classic",
    LABYRINTH: "labyrinth",
    MELODY: "melody",
    BOUNCE: "bounce"
  });

  const FEED_MODE_CONFIGS = Object.freeze({
    [FEED_MODES.CLASSIC]: Object.freeze({
      id: FEED_MODES.CLASSIC,
      implemented: true,
      schedule: "classic-seven",
      inputTarget: "pet",
      catchTarget: "pet",
      scoring: "points",
      finishDelayMs: 900,
      instructions: Object.freeze({
        title: "Catch the BibloSnacks!",
        prompt: "Tilt to steer"
      })
    }),
    [FEED_MODES.LABYRINTH]: Object.freeze({
      id: FEED_MODES.LABYRINTH,
      implemented: true,
      schedule: "classic-seven",
      inputTarget: "snacks",
      catchTarget: "pet",
      scoring: "points",
      finishDelayMs: 900,
      instructions: Object.freeze({
        title: "Guide the BibloSnacks!",
        prompt: "Tilt to guide the snacks"
      })
    }),
    [FEED_MODES.MELODY]: Object.freeze({
      id: FEED_MODES.MELODY,
      implemented: true,
      schedule: "melody",
      inputTarget: "pet",
      catchTarget: "pet",
      scoring: "percentage",
      finishDelayMs: 900,
      instructions: Object.freeze({
        title: "Catch the BibloSnacks!",
        prompt: "Tilt to make music"
      })
    }),
    [FEED_MODES.BOUNCE]: Object.freeze({
      id: FEED_MODES.BOUNCE,
      implemented: false,
      schedule: "classic-seven",
      inputTarget: "paddle",
      catchTarget: "pet",
      scoring: "points",
      finishDelayMs: 900,
      instructions: Object.freeze({
        title: "Bounce the BibloSnacks!",
        prompt: "Tilt to move the paddle"
      })
    })
  });

  const LABYRINTH_GAP_POSITIONS = Object.freeze([
    "left", "middle", "right"
  ]);
  const LABYRINTH_GAP_FRACTIONS = Object.freeze({
    left: 0.22,
    middle: 0.5,
    right: 0.78
  });
  const LABYRINTH_ROW_COUNT = 6;
  const LABYRINTH_DEFAULT_SEED = 0x4c425a;
  const LABYRINTH_PHYSICS_STEP = 1 / 120;
  const LABYRINTH_STUCK_MS = 3500;
  const LABYRINTH_STEER_ACCELERATION_SCALE = 3.2;
  const LABYRINTH_MAX_HORIZONTAL_SPEED_SCALE = 0.72;
  const LABYRINTH_HORIZONTAL_DAMPING = 0.982;
  const LABYRINTH_PLATFORM_ROLL_DAMPING = 0.998;
  const LABYRINTH_PLATFORM_RESTITUTION = 0.34;
  const LABYRINTH_PLATFORM_SETTLE_SPEED_RADIUS_SCALE = 4;
  const LABYRINTH_PLATFORM_MAX_BOUNCE_SPEED_RADIUS_SCALE = 6.5;
  const LABYRINTH_RELEASE_SPEED_SCALE = 0.32;

  const MELODY_BPM = 116;
  const MELODY_BEAT_MS = 60000 / MELODY_BPM;
  const MELODY_TRAVEL_MS = 2400;
  const MELODY_BACKGROUND_GAP_MS = 250;
  const MELODY_LANE_FRACTIONS = Object.freeze({
    left: 0.30,
    middle: 0.50,
    right: 0.70
  });
  const MELODY_HOLD_LENGTHS = Object.freeze([7, 9, 8, 6]);
  const MELODY_TRANSITION_NOTES = 4;
  const MELODY_TONE_DURATION = 0.22;
  const MELODY_TONE_VOLUME = 0.12;

  const FEED_MELODIES = Object.freeze([
    Object.freeze({
      id: "odeToJoy",
      notes: Object.freeze([
        64,64,65,67,
        67,65,64,62,
        60,60,62,64,
        64,62,62,

        64,64,65,67,
        67,65,64,62,
        60,60,62,64,
        62,60,60,

        62,62,64,60,
        62,64,65,60,
        62,64,64,62,
        60,62,55,

        64,64,65,67,
        67,65,64,62,
        60,60,62,64,
        62,60,60
      ])
    })
  ]);

  let activeRuntime = null;
  let preparedAudioContext = null;
  let preparedStarBuffer = null;
  let starBufferPromise = null;
  let preparedChompBuffer = null;
  let chompBufferPromise = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomFrom = (items) => items?.length
    ? items[Math.floor(Math.random() * items.length)]
    : null;

  function normalizeFeedMelodyNotes(notes) {
    return (Array.isArray(notes) ? notes : [])
      .map((note) => {
        if (Number.isFinite(note)) {
          return { midi: Number(note), beats: 1 };
        }

        const beats =
          Number.isFinite(Number(note?.beats)) &&
          Number(note.beats) > 0
            ? Number(note.beats)
            : 1;
        const rawMidi = note?.midi;
        const midi =
          rawMidi === null ||
          rawMidi === undefined ||
          rawMidi === ""
            ? null
            : Number.isFinite(Number(rawMidi))
              ? Number(rawMidi)
              : null;

        return { midi, beats };
      });
  }

  function createMelodyLanePath(noteCount) {
    const count =
      Math.max(0, Math.floor(Number(noteCount) || 0));
    if (!count) return [];

    const targetSequence = [
      MELODY_LANE_FRACTIONS.left,
      MELODY_LANE_FRACTIONS.right,
      MELODY_LANE_FRACTIONS.middle,
      MELODY_LANE_FRACTIONS.left,
      MELODY_LANE_FRACTIONS.right,
      MELODY_LANE_FRACTIONS.middle
    ];
    const path = [];
    let targetIndex = 0;
    let current = targetSequence[0];

    while (path.length < count) {
      const holdLength =
        MELODY_HOLD_LENGTHS[
          targetIndex % MELODY_HOLD_LENGTHS.length
        ];

      for (
        let index = 0;
        index < holdLength && path.length < count;
        index += 1
      ) {
        path.push(current);
      }

      if (path.length >= count) break;

      const next =
        targetSequence[
          (targetIndex + 1) % targetSequence.length
        ];

      for (
        let step = 1;
        step <= MELODY_TRANSITION_NOTES && path.length < count;
        step += 1
      ) {
        path.push(
          current +
          (next - current) *
          (step / MELODY_TRANSITION_NOTES)
        );
      }

      current = next;
      targetIndex += 1;
    }

    return path;
  }

  function createMelodyTimeline(
    notes,
    width,
    {
      bpm = MELODY_BPM,
      travelMs = MELODY_TRAVEL_MS
    } = {}
  ) {
    const normalized =
      normalizeFeedMelodyNotes(notes);
    const playableCount =
      normalized.filter((note) => Number.isFinite(note.midi)).length;
    const lanePath =
      createMelodyLanePath(playableCount);
    const safeWidth = Math.max(120, Number(width) || 0);
    const safeBpm = Math.max(1, Number(bpm) || MELODY_BPM);
    const beatMs = 60000 / safeBpm;
    const safeTravelMs = Math.max(250, Number(travelMs) || MELODY_TRAVEL_MS);
    let beatOffset = 0;
    let playableIndex = 0;

    return normalized.map((note, index) => {
      const laneFraction =
        Number.isFinite(note.midi)
          ? lanePath[playableIndex++]
          : null;
      const spawnOffsetMs = beatOffset * beatMs;
      const entry = {
        index,
        midi: note.midi,
        beats: note.beats,
        laneFraction,
        x: laneFraction === null
          ? null
          : safeWidth * laneFraction,
        spawnOffsetMs,
        arrivalOffsetMs: spawnOffsetMs + safeTravelMs,
        status: "pending"
      };

      beatOffset += note.beats;
      return entry;
    });
  }

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (Number(midi) - 69) / 12);
  }

  function calculateMelodyCatchPercent(caughtCount, totalCount) {
    const total = Math.max(0, Number(totalCount) || 0);
    if (!total) return 0;
    const caught = clamp(
      Math.max(0, Number(caughtCount) || 0),
      0,
      total
    );
    return Math.round(100 * caught / total);
  }

  function normalizeFeedMode(value) {
    return Object.values(FEED_MODES).includes(value)
      ? value
      : FEED_MODES.CLASSIC;
  }

  function getFeedModeConfig(value) {
    return FEED_MODE_CONFIGS[
      normalizeFeedMode(value)
    ];
  }

  function createSeededRandom(seed = LABYRINTH_DEFAULT_SEED) {
    let state =
      (Number(seed) >>> 0) ||
      LABYRINTH_DEFAULT_SEED;

    return () => {
      state =
        (
          Math.imul(state, 1664525) +
          1013904223
        ) >>> 0;
      return state / 4294967296;
    };
  }

  function createLabyrinthPlatformRows(
    width,
    height,
    ballRadius,
    seed = LABYRINTH_DEFAULT_SEED
  ) {
    const safeWidth = Math.max(120, Number(width) || 0);
    const safeHeight = Math.max(260, Number(height) || 0);
    const safeRadius = Math.max(6, Number(ballRadius) || 0);
    const random = createSeededRandom(seed);
    const gapWidth = Math.min(
      safeWidth * 0.34,
      Math.max(
        safeWidth * 0.24,
        safeRadius * 5.2
      )
    );
    const thickness = clamp(
      safeHeight * 0.014,
      10,
      16
    );
    const topY = Math.max(
      safeRadius * 5.2,
      safeHeight * 0.17
    );
    const bottomY = safeHeight * 0.69;
    const rows = [];
    let previousGap = "";

    for (
      let index = 0;
      index < LABYRINTH_ROW_COUNT;
      index += 1
    ) {
      const options =
        LABYRINTH_GAP_POSITIONS
          .filter(
            (position) =>
              position !== previousGap
          );
      const gapPosition =
        options[
          Math.floor(random() * options.length)
        ] || "middle";
      const gapCenter =
        safeWidth *
        LABYRINTH_GAP_FRACTIONS[
          gapPosition
        ];
      const gapLeft = clamp(
        gapCenter - gapWidth / 2,
        0,
        safeWidth
      );
      const gapRight = clamp(
        gapCenter + gapWidth / 2,
        0,
        safeWidth
      );
      const y =
        topY +
        (
          (bottomY - topY) *
          index /
          Math.max(1, LABYRINTH_ROW_COUNT - 1)
        );
      const segments = [];

      if (gapLeft > 0) {
        segments.push({
          x: 0,
          y,
          width: gapLeft,
          height: thickness
        });
      }

      if (gapRight < safeWidth) {
        segments.push({
          x: gapRight,
          y,
          width: safeWidth - gapRight,
          height: thickness
        });
      }

      rows.push({
        id: `labyrinth-row-${index}`,
        y,
        thickness,
        gapPosition,
        gapCenter,
        gapWidth: gapRight - gapLeft,
        gapLeft,
        gapRight,
        segments
      });

      previousGap = gapPosition;
    }

    return rows;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function createImage(src) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    return image;
  }

  function buildScheduledBalls() {
    return [...shuffle(SOLID_BALLS), RAINBOW_BALL];
  }

  function chooseBackground(width, height) {
    const scene = randomFrom(BACKGROUND_SCENES) || "waterfall";
    const format = width / Math.max(1, height) >= 0.66 ? "tablet" : "phone";
    return `${ASSET_BASE}dq_feed_bg_${scene}_${format}.jpg`;
  }

  function createPegField(width, height, earnedStarPegCount = 0) {
    const pegs = [];
    const rows = 9;
    const radius = clamp(width * 0.04, 14, 26);
    const foodRadius = radius * 0.66;
    const edgeGap = foodRadius * 3;
    const edgeCenter = clamp(
      radius + edgeGap,
      radius * 1.35,
      width * 0.18
    );
    const regularSpacing = (width - edgeCenter * 2) / 4;
    const topY = Math.max(radius * 2.6, height * 0.12);
    const bottomY = height * 0.76;

    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 1;
      const columns = offset ? 4 : 5;
      const y = topY + ((bottomY - topY) * row / (rows - 1));
      for (let column = 0; column < columns; column += 1) {
        const x = offset
          ? edgeCenter + regularSpacing * (column + 0.5)
          : edgeCenter + regularSpacing * column;

        pegs.push({
          id: `${row}-${column}`,
          row,
          column,
          x,
          y,
          radius,
          isStar: false
        });
      }
    }

    const starRowCandidates =
      shuffle(
        Array.from(
          { length: rows - 2 },
          (_, index) => index + 1
        )
      );

    const starCount =
      Math.min(
        1 + Math.max(0, Number(earnedStarPegCount) || 0),
        starRowCandidates.length
      );

    starRowCandidates
      .slice(0, starCount)
      .forEach((row) => {
        const starPeg =
          randomFrom(
            pegs.filter((peg) => peg.row === row)
          );

        if (starPeg) {
          starPeg.isStar = true;
        }
      });

    return {
      pegs,
      pegRadius: radius
    };
  }

  function buildImageMap() {
    const balls = {};
    for (const config of SOLID_BALLS) balls[config.id] = createImage(config.asset);
    balls.rainbow = createImage(RAINBOW_BALL.asset);
    return {
      balls,
      star: createImage(`${ASSET_BASE}dq_feed_star_peg.png`)
    };
  }

  function decodeStarAudioData(context, arrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const data = arrayBuffer.slice(0);
        const maybePromise =
          context.decodeAudioData(
            data,
            resolve,
            reject
          );

        if (
          maybePromise &&
          typeof maybePromise.then ===
            "function"
        ) {
          maybePromise
            .then(resolve)
            .catch(reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  function loadStarBuffer(context) {
    if (!context) return Promise.resolve(null);
    if (preparedStarBuffer) return Promise.resolve(preparedStarBuffer);
    if (starBufferPromise) return starBufferPromise;

    starBufferPromise = fetch(`${ASSET_BASE}dq_feed_star.mp3`)
      .then((response) => {
        const isCapacitorLocalResponse =
          window.location.protocol ===
            "capacitor:" &&
          response.status === 0;

        if (
          !response.ok &&
          !isCapacitorLocalResponse
        ) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        return response.arrayBuffer();
      })
      .then(
        (bytes) =>
          decodeStarAudioData(
            context,
            bytes
          )
      )
      .then((buffer) => {
        preparedStarBuffer = buffer;
        return buffer;
      })
      .catch((err) => {
        console.warn("Daily feeding star sound could not load", err);
        starBufferPromise = null;
        return null;
      });

    return starBufferPromise;
  }

  function loadChompBuffer(context) {
    if (!context) return Promise.resolve(null);
    if (preparedChompBuffer) return Promise.resolve(preparedChompBuffer);
    if (chompBufferPromise) return chompBufferPromise;

    chompBufferPromise = fetch(`${ASSET_BASE}dq_feed_chomp.mp3`)
      .then((response) => {
        const isCapacitorLocalResponse =
          window.location.protocol === "capacitor:" && response.status === 0;

        if (!response.ok && !isCapacitorLocalResponse) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.arrayBuffer();
      })
      .then((bytes) => decodeStarAudioData(context, bytes))
      .then((buffer) => {
        preparedChompBuffer = buffer;
        return buffer;
      })
      .catch((err) => {
        console.warn("Daily feeding chomp sound could not load", err);
        chompBufferPromise = null;
        return null;
      });

    return chompBufferPromise;
  }

  function prepareAudio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (preparedAudioContext && preparedAudioContext.state !== "closed") {
      preparedAudioContext.resume?.().catch?.(() => {});
      loadStarBuffer(preparedAudioContext);
      loadChompBuffer(preparedAudioContext);
      return preparedAudioContext;
    }
    try {
      preparedAudioContext = new Ctor();
      preparedAudioContext.resume?.().catch?.(() => {});
      loadStarBuffer(preparedAudioContext);
      loadChompBuffer(preparedAudioContext);
      return preparedAudioContext;
    } catch (err) {
      preparedAudioContext = null;
      return null;
    }
  }

  function stopAudioContext(context) {
    if (!context || context.state === "closed") return;
    try { context.close(); } catch (err) { }
  }

  function disposeMode(runtime) {
    if (!runtime || runtime.modeDisposed) return;

    runtime.modeDisposed = true;

    if (runtime.modeTimers) {
      for (const timerId of runtime.modeTimers) {
        clearTimeout(timerId);
      }
      runtime.modeTimers.clear();
    }

    runtime.modeController
      ?.dispose?.(runtime);
  }

  function stop() {
    const runtime = activeRuntime;
    activeRuntime = null;
    if (runtime) {
      runtime.running = false;
      if (runtime.rafId) cancelAnimationFrame(runtime.rafId);
      detachGameplayInput(runtime);
      disposeMode(runtime);

      if (
        runtime.startOverlay &&
        runtime.startOverlayHandler
      ) {
        runtime.startOverlay.removeEventListener(
          "click",
          runtime.startOverlayHandler
        );
      }

      if (
        runtime.resultBackButton &&
        runtime.resultBackHandler
      ) {
        runtime.resultBackButton.removeEventListener(
          "click",
          runtime.resultBackHandler
        );
      }

      if (runtime.starAudio) {
        try { runtime.starAudio.pause(); runtime.starAudio.currentTime = 0; } catch (err) { }
      }
      if (runtime.chompAudio) {
        try { runtime.chompAudio.pause(); runtime.chompAudio.currentTime = 0; } catch (err) { }
      }
      stopAudioContext(runtime.audioContext);
      runtime.audioContext = null;
      runtime.onComplete = null;
      runtime.onBackToZoo = null;
      runtime.startOverlayHandler = null;
      runtime.resultBackHandler = null;
    }
    if (preparedAudioContext) {
      stopAudioContext(preparedAudioContext);
      preparedAudioContext = null;
    }
  }

  function stageRemove(runtime, type, handler) {
    runtime.stage?.removeEventListener(type, handler);
  }

  function detachGameplayInput(runtime) {
    if (!runtime) return;

    if (runtime.orientationHandler) {
      window.removeEventListener(
        "deviceorientation",
        runtime.orientationHandler
      );
    }

    if (runtime.pointerDownHandler) {
      stageRemove(
        runtime,
        "pointerdown",
        runtime.pointerDownHandler
      );
    }

    if (runtime.pointerMoveHandler) {
      stageRemove(
        runtime,
        "pointermove",
        runtime.pointerMoveHandler
      );
    }

    if (runtime.pointerEndHandler) {
      stageRemove(
        runtime,
        "pointerup",
        runtime.pointerEndHandler
      );
      stageRemove(
        runtime,
        "pointercancel",
        runtime.pointerEndHandler
      );
    }

    if (
      Number.isInteger(
        runtime.activePointerId
      )
    ) {
      try {
        runtime.stage?.releasePointerCapture(
          runtime.activePointerId
        );
      } catch (err) { }
    }

    runtime.dragging = false;
    runtime.activePointerId = null;
  }

  function render({ session, profilePictureHtml = "" } = {}) {
    const petName = String(session?.petName || "BibloPet").trim() || "BibloPet";
    const isDailyTodoSnack =
      session?.dailyTodoSnack === true;
    const mode =
      resolveFeedMode(session?.feedMode);
    const modeConfig =
      getFeedModeConfig(mode);
    const stageAriaLabel =
      mode === FEED_MODES.LABYRINTH
        ? "Tilt or drag to steer the falling snacks while the BibloPet moves automatically"
        : mode === FEED_MODES.MELODY
          ? `Tilt or drag ${petName} left and right to catch the falling musical snacks`
          : `Tilt or drag ${petName} left and right to catch the falling food`;
    return `
      <div class="daily-feed-game${isDailyTodoSnack ? " is-daily-todo-snack" : ""}" data-daily-feed-game data-daily-feed-mode="${mode}" data-daily-session-phase="reward_game">
        <div class="daily-feed-score-badge" aria-live="polite" aria-label="Score">
          <span class="daily-feed-score-label">${mode === FEED_MODES.MELODY ? "Caught" : "Score"}</span>
          <strong class="daily-feed-score-value" data-daily-feed-score>${mode === FEED_MODES.MELODY ? "0%" : "0"}</strong>
        </div>

        <div class="daily-feed-stage" data-daily-feed-stage role="application"
          aria-label="${stageAriaLabel}">
          <canvas class="daily-feed-canvas" data-daily-feed-canvas aria-hidden="true"></canvas>

          <div class="daily-feed-catcher" data-daily-feed-catcher aria-hidden="true">
            <div class="daily-feed-pet-circle" data-daily-feed-pet-circle>
              ${profilePictureHtml}
            </div>

            <img class="daily-feed-shadow" src="${ASSET_BASE}dq_feed_shadow.png" alt="" draggable="false">
          </div>

          <div class="daily-feed-score-popups" data-daily-feed-score-popups aria-hidden="true"></div>
        </div>

        <div
          class="daily-feed-start-overlay"
          data-daily-feed-start-overlay
          role="dialog"
          aria-modal="true"
          aria-label="Feeding game instructions"
        >
          <div class="daily-feed-start-card">
            <div
              class="daily-feed-start-balls"
              aria-hidden="true"
            >
              <img
                class="daily-feed-start-ball"
                src="${ASSET_BASE}dq_feed_ball_red.png"
                alt=""
                draggable="false"
              >

              <img
                class="daily-feed-start-ball"
                src="${ASSET_BASE}dq_feed_ball_rainbow.png"
                alt=""
                draggable="false"
              >

              <img
                class="daily-feed-start-ball"
                src="${ASSET_BASE}dq_feed_ball_green.png"
                alt=""
                draggable="false"
              >
            </div>

            <div class="daily-feed-start-title">
              ${modeConfig.instructions.title}
            </div>

            <div class="daily-feed-start-instruction">
              ${modeConfig.instructions.prompt}
            </div>
          </div>
        </div>

        <div
          class="daily-feed-result-overlay"
          data-daily-feed-result-overlay
          role="dialog"
          aria-modal="true"
          aria-label="Feeding game result"
          hidden
        >
          <div class="daily-feed-result-card">
            <div
              class="daily-feed-result-pet-art"
              aria-hidden="true"
            >
              ${profilePictureHtml}
            </div>

            <div
              class="daily-feed-result-title"
              data-daily-feed-result-title
            >
              ${isDailyTodoSnack ? "Thanks for the snack!" : "Great Catching!"}
            </div>

            <div
              class="daily-feed-result-score"
              data-daily-feed-result-score
            >
              Score: 0
            </div>

            ${isDailyTodoSnack ? `
              <div class="daily-feed-result-complete">
                Zoo To-Do Complete!
              </div>
            ` : ""}

            <button
              class="daily-feed-result-back no-zoom"
              type="button"
              data-daily-feed-result-back
            >
              ${isDailyTodoSnack ? "Back Home" : "Back to Zoo"}
            </button>
          </div>
        </div>
      </div>`;
  }

  function setCatcherX(runtime, nextX) {
    if (!runtime) return;
    const requestedX = Number(nextX);
    const safeX = clamp(
      Number.isFinite(requestedX) ? requestedX : runtime.width / 2,
      runtime.petRadius,
      runtime.width - runtime.petRadius
    );
    runtime.catcherX = safeX;
    runtime.catcher.style.left = `${safeX}px`;
  }

  function updatePetLean(runtime, dt) {
    const velocity = (runtime.catcherX - runtime.lastCatcherX) / Math.max(dt, 0.008);
    runtime.lastCatcherX = runtime.catcherX;
    runtime.smoothedPetVelocity = runtime.smoothedPetVelocity * 0.76 + velocity * 0.24;

    const targetLean = clamp(
      (runtime.smoothedPetVelocity / Math.max(1, runtime.width * 1.5)) * 13,
      -15,
      15
    );

    runtime.petTilt += (targetLean - runtime.petTilt) * 0.25;
    if (Math.abs(runtime.petTilt) < 0.12 && Math.abs(targetLean) < 0.12) {
      runtime.petTilt = 0;
    }

    runtime.petCircle.style.setProperty("--daily-feed-pet-tilt", `${runtime.petTilt}deg`);
  }

  function beginTiltCalibration(runtime) {
    if (!runtime?.tiltEnabled) return;
    runtime.neutralGamma = null;
    runtime.smoothedTilt = 0;
    runtime.tiltSamples = [];
    runtime.tiltCalibrationUntil =
      performance.now() + TILT_CALIBRATION_MS;
    setCatcherX(runtime, runtime.width / 2);
  }

  function handleTilt(runtime, event) {
    if (!runtime || !runtime.tiltEnabled || runtime.dragging || activeRuntime !== runtime) return;
    const gamma = Number(event?.gamma);
    if (!Number.isFinite(gamma)) return;

    const now = performance.now();

    if (now < runtime.tiltCalibrationUntil) {
      runtime.tiltSamples.push(gamma);
      if (runtime.tiltSamples.length > 24) {
        runtime.tiltSamples.shift();
      }
      return;
    }

    if (!Number.isFinite(runtime.neutralGamma)) {
      const samples = runtime.tiltSamples.length
        ? runtime.tiltSamples
        : [gamma];
      const average = samples.reduce(
        (sum, value) => sum + value,
        0
      ) / samples.length;

      // Use the phone's actual resting angle as its neutral position.
      runtime.neutralGamma = average;
      runtime.tiltSamples = [];
      runtime.smoothedTilt = 0;
    }

    const relative = clamp(gamma - runtime.neutralGamma, -25, 25);
    runtime.smoothedTilt = runtime.smoothedTilt * 0.85 + relative * 0.15;
    const travel = Math.max(0, runtime.width / 2 - runtime.petRadius);
    setCatcherX(
      runtime,
      runtime.width / 2 + (runtime.smoothedTilt / 25) * travel
    );
  }

  function playPegTone(runtime, now) {
    const context = runtime.audioContext;
    if (!context || context.state === "closed" || now - runtime.lastPegSoundAt < 55) return;

    let noteIndex = Math.floor(Math.random() * PEG_NOTE_FREQUENCIES.length);
    if (noteIndex === runtime.lastPegNoteIndex) {
      noteIndex = (noteIndex + 1 + Math.floor(Math.random() * (PEG_NOTE_FREQUENCIES.length - 1))) % PEG_NOTE_FREQUENCIES.length;
    }
    runtime.lastPegNoteIndex = noteIndex;
    runtime.lastPegSoundAt = now;

    try {
      if (context.state === "suspended") context.resume?.().catch?.(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(PEG_NOTE_FREQUENCIES[noteIndex], startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.042, startAt + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.105);
    } catch (err) { }
  }

  function playStarSound(runtime) {
    const context = runtime.audioContext;

    if (
      context &&
      context.state !== "closed"
    ) {
      try {
        if (
          context.state === "suspended" ||
          context.state === "interrupted"
        ) {
          context.resume?.().catch?.(() => {});
        }

        if (preparedStarBuffer) {
          const source =
            context.createBufferSource();

          const gain =
            context.createGain();

          source.buffer =
            preparedStarBuffer;

          gain.gain.setValueAtTime(
            0.78,
            context.currentTime
          );

          source.connect(gain);
          gain.connect(
            context.destination
          );

          source.start();
          return;
        }

        /*
          Keep warming the decoded buffer, but do not fall back
          to HTML Audio during gameplay. That fallback can cause
          a visible hitch on iOS while the file starts/decodes.
        */
        loadStarBuffer(context);
        return;
      } catch (err) { }
    }

    if (!runtime.starAudio) return;

    try {
      runtime.starAudio.currentTime = 0;
      runtime.starAudio
        .play()
        .catch?.(() => {});
    } catch (err) { }
  }

  function playChompSound(runtime) {
    const context = runtime.audioContext;

    if (context && context.state !== "closed") {
      if (preparedChompBuffer) {
        try {
          if (context.state === "suspended" || context.state === "interrupted") {
            context.resume?.().catch?.(() => {});
          }

          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = preparedChompBuffer;
          gain.gain.setValueAtTime(0.85, context.currentTime);
          source.connect(gain);
          gain.connect(context.destination);
          source.start();
          return;
        } catch (err) { }
      }

      loadChompBuffer(context);
      return;
    }

    if (!runtime.chompAudio) return;
    try {
      runtime.chompAudio.currentTime = 0;
      runtime.chompAudio.play().catch?.(() => {});
    } catch (err) { }
  }

  function createStarBurst(runtime, peg, now) {
    const colors = ["#ffc751", "#ffffff", "#ff5a51", "#78ad4f", "#46aef0", "#7f66c6"];
    const particles = [];
    for (let index = 0; index < 28; index += 1) {
      particles.push({
        angle: (Math.PI * 2 * index / 28) + (Math.random() - 0.5) * 0.18,
        distance: runtime.pegRadius * (2.1 + Math.random() * 2.6),
        size: 2.5 + Math.random() * 5,
        color: colors[index % colors.length],
        sparkle: index % 4 === 0
      });
    }
    runtime.bursts.push({ x: peg.x, y: peg.y, startedAt: now, duration: 780, particles });
  }

  function spawnStarBonusBalls(runtime, now) {
    // Extra balls are simultaneous and do not count toward the seven scheduled balls.
    const colors = shuffle(SOLID_BALLS).slice(0, 3);
    const spawnLanes = [0.2, 0.5, 0.8];

    colors.forEach((config, index) => {
      spawnBall(runtime, config, now, {
        bonus: true,
        spawnX: runtime.width * spawnLanes[index]
      });
    });
  }

  function triggerStarPeg(runtime, peg, now) {
    if (!peg?.isStar) return;
    peg.isStar = false;
    createStarBurst(runtime, peg, now);
    playStarSound(runtime);
    spawnStarBonusBalls(runtime, now);
  }

  function spawnBall(runtime, config, now, { bonus = false, spawnX = null } = {}) {
    if (!config) return;
    const radius = runtime.pegRadius * 0.66;
    const padding = Math.max(radius * 2.4, runtime.width * 0.06);
    const x = Number.isFinite(spawnX)
      ? clamp(spawnX, padding, runtime.width - padding)
      : padding + Math.random() * Math.max(1, runtime.width - padding * 2);
    runtime.balls.push({
      id: runtime.nextBallId++,
      config,
      x,
      y: bonus ? -radius : -radius - Math.random() * radius,
      vx: (Math.random() - 0.5) * runtime.width * 0.055,
      vy: runtime.height * (0.018 + Math.random() * 0.012),
      radius,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 2.1,
      points: config.points || 1,
      bonus,
      bornAt: now,
      trail: [],
      lastTrailAt: 0
    });
  }

  function processSpawns(runtime, now) {
    if (runtime.scheduledIndex >= runtime.scheduled.length || now < runtime.nextScheduledAt) return;
    spawnBall(runtime, runtime.scheduled[runtime.scheduledIndex], now);
    runtime.scheduledIndex += 1;
    if (runtime.scheduledIndex < runtime.scheduled.length) {
      runtime.nextScheduledAt = now + 4000 + Math.random() * 1000;
    }
  }

  function addTrailPoint(ball, now) {
    if (now - ball.lastTrailAt < 42) return;
    ball.lastTrailAt = now;
    ball.trail.push({ x: ball.x, y: ball.y, bornAt: now });
    if (ball.trail.length > 12) ball.trail.shift();
  }

  function collideBallWithWalls(runtime, ball) {
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.72;
      ball.angularVelocity += 0.75;
    } else if (ball.x + ball.radius > runtime.width) {
      ball.x = runtime.width - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.72;
      ball.angularVelocity -= 0.75;
    }
  }

  function collideBallWithPeg(runtime, ball, peg, now) {
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const minDistance = ball.radius + peg.radius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minDistance * minDistance) return;

    const distance = Math.sqrt(distanceSquared) || 0.001;
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minDistance - distance;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const velocityAlongNormal = ball.vx * nx + ball.vy * ny;
    if (velocityAlongNormal >= 0) return;

    if (peg.isStar) triggerStarPeg(runtime, peg, now);
    else playPegTone(runtime, now);

    const impulse = (1 + 0.68) * velocityAlongNormal;
    ball.vx -= impulse * nx;
    ball.vy -= impulse * ny;
    ball.vx += nx * (Math.random() - 0.5) * 7;

    const tangentSpeed = -ny * ball.vx + nx * ball.vy;
    ball.angularVelocity += tangentSpeed / Math.max(1, ball.radius) * 0.34;
    ball.angularVelocity = clamp(ball.angularVelocity, -7, 7);
  }

  function collideBalls(runtime) {
    const balls = runtime.balls;
    for (let aIndex = 0; aIndex < balls.length; aIndex += 1) {
      const a = balls[aIndex];
      for (let bIndex = aIndex + 1; bIndex < balls.length; bIndex += 1) {
        const b = balls[bIndex];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDistance = a.radius + b.radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= minDistance * minDistance) continue;

        const distance = Math.sqrt(distanceSquared) || 0.001;
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = (minDistance - distance) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative >= 0) continue;
        const impulse = -relative * 0.82;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        a.angularVelocity -= relative * 0.012;
        b.angularVelocity += relative * 0.012;
      }
    }
  }

  function updateScoreBadge(runtime) {
    if (!runtime.scoreEl) return;
    runtime.scoreEl.textContent = String(runtime.score);
    const badge = runtime.scoreEl.closest(".daily-feed-score-badge");
    if (!badge) return;
    badge.classList.remove("is-bumped");
    void badge.offsetWidth;
    badge.classList.add("is-bumped");
  }

  function showCatchScore(runtime, ball) {
    if (!runtime.scorePopupsEl) return;

    const popup = document.createElement("span");
    popup.className = "daily-feed-score-popup";
    if (ball.config.id === "rainbow") {
      popup.classList.add("is-rainbow");
    }
    popup.textContent = `+${ball.points}`;
    popup.style.left = `${runtime.catcherX}px`;
    popup.style.top = `${runtime.petCenterY - runtime.petRadius * 0.65}px`;
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
    runtime.scorePopupsEl.appendChild(popup);
  }

  function catchBall(runtime, ball) {
    runtime.score += ball.points;
    runtime.caughtCount += 1;
    updateScoreBadge(runtime);
    showCatchScore(runtime, ball);
    playChompSound(runtime);
    runtime.catcher.classList.remove("is-catching");
    void runtime.catcher.offsetWidth;
    runtime.catcher.classList.add("is-catching");
  }

  function updateBall(runtime, ball, dt, now) {
    addTrailPoint(ball, now);
    ball.vy = Math.min(runtime.height * 0.46, ball.vy + runtime.gravity * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.rotation += ball.angularVelocity * dt;
    ball.angularVelocity = ball.angularVelocity * 0.997 + (ball.vx / Math.max(1, ball.radius)) * 0.003;
    collideBallWithWalls(runtime, ball);
    for (const peg of runtime.pegs) collideBallWithPeg(runtime, ball, peg, now);
    ball.vx = clamp(ball.vx, -runtime.width * 0.44, runtime.width * 0.44);
    ball.vy = clamp(ball.vy, -runtime.height * 0.26, runtime.height * 0.46);
  }

  function ballTouchesPet(runtime, ball) {
    const dx = ball.x - runtime.catcherX;
    const dy = ball.y - runtime.petCenterY;
    const minDistance = ball.radius + runtime.petRadius;
    return dx * dx + dy * dy <= minDistance * minDistance;
  }

  function updateBalls(runtime, dt, now) {
    for (const ball of runtime.balls) updateBall(runtime, ball, dt, now);
    collideBalls(runtime);
    runtime.balls = runtime.balls.filter((ball) => {
      if (ballTouchesPet(runtime, ball)) {
        catchBall(runtime, ball);
        return false;
      }
      if (ball.y - ball.radius > runtime.height + 20) return false;
      if (now - ball.bornAt > 22000) return false;
      return true;
    });
  }

  function drawTrail(runtime, ball, now) {
    const ctx = runtime.ctx;
    const colors = ball.config.trailColors || [ball.config.color];
    ball.trail = ball.trail.filter((point) => now - point.bornAt < 520);
    ball.trail.forEach((point, index) => {
      const progress = (now - point.bornAt) / 520;
      const alpha = (1 - progress) * 0.72;
      const size = ball.radius * (0.18 + (1 - progress) * 0.34);
      const color = colors[index % colors.length];
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 1.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPeg(runtime, peg) {
    const ctx = runtime.ctx;
    if (peg.isStar && runtime.starImage?.complete && runtime.starImage.naturalWidth) {
      const size = peg.radius * 2.25;
      ctx.drawImage(runtime.starImage, peg.x - size / 2, peg.y - size / 2, size, size);
      return;
    }
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(runtime, ball) {
    const ctx = runtime.ctx;
    const image = runtime.ballImages[ball.config.id];
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    ctx.shadowColor = "rgba(255, 255, 255, 0.96)";
    ctx.shadowBlur = ball.radius * 1.25;
    if (image?.complete && image.naturalWidth) {
      const size = ball.radius * 2;
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = ball.config.color;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBurst(runtime, burst, now) {
    const ctx = runtime.ctx;
    const progress = clamp((now - burst.startedAt) / burst.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = "#ffc751";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, runtime.pegRadius * (0.8 + eased * 3.2), 0, Math.PI * 2);
    ctx.stroke();

    for (const particle of burst.particles) {
      const distance = particle.distance * eased;
      const x = burst.x + Math.cos(particle.angle) * distance;
      const y = burst.y + Math.sin(particle.angle) * distance;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 1.4;
      if (particle.sparkle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(particle.angle + progress * Math.PI);
        ctx.fillRect(-particle.size / 2, -particle.size * 1.6, particle.size, particle.size * 3.2);
        ctx.fillRect(-particle.size * 1.6, -particle.size / 2, particle.size * 3.2, particle.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw(runtime, now) {
    const ctx = runtime.ctx;
    ctx.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0);
    ctx.clearRect(0, 0, runtime.width, runtime.height);
    for (const ball of runtime.balls) drawTrail(runtime, ball, now);
    for (const peg of runtime.pegs) drawPeg(runtime, peg);
    runtime.bursts = runtime.bursts.filter((burst) => now - burst.startedAt < burst.duration);
    for (const burst of runtime.bursts) drawBurst(runtime, burst, now);
    for (const ball of runtime.balls) drawBall(runtime, ball);
  }

  function maybeFinish(runtime, now) {
    const allScheduledBallsSpawned =
      runtime.scheduledIndex >= runtime.scheduled.length;
    const noActiveBalls =
      runtime.balls.length === 0;

    const complete =
      allScheduledBallsSpawned &&
      noActiveBalls;

    if (!complete) {
      runtime.finishAt = 0;
      return false;
    }
    if (!runtime.finishAt) {
      const configuredDelay =
        Number(
          runtime.modeConfig
            ?.finishDelayMs
        );
      const finishDelayMs =
        Number.isFinite(configuredDelay)
          ? Math.max(0, configuredDelay)
          : 900;

      runtime.finishAt =
        now + finishDelayMs;
      return false;
    }
    return now >= runtime.finishAt;
  }

  function buildStandardResult(runtime) {
    const scheduledTotal =
      Array.isArray(runtime?.scheduled)
        ? runtime.scheduled.length
        : 0;
    const configuredTotal =
      Number(runtime?.totalCount);

    return {
      mode:
        normalizeFeedMode(runtime?.mode),
      score:
        Math.max(
          0,
          Number(runtime?.score) || 0
        ),
      caughtCount:
        Math.max(
          0,
          Number(runtime?.caughtCount) || 0
        ),
      totalCount:
        Number.isFinite(configuredTotal) &&
          configuredTotal >= 0
          ? configuredTotal
          : scheduledTotal,
      completed: true
    };
  }

  function getLabyrinthSeed(runtime) {
    const widthPart =
      Math.round(runtime.width) & 0xffff;
    const heightPart =
      Math.round(runtime.height) & 0xffff;

    return (
      LABYRINTH_DEFAULT_SEED ^
      (widthPart << 16) ^
      heightPart
    ) >>> 0;
  }

  function initializeLabyrinthMode(runtime) {
    const ballRadius =
      runtime.pegRadius * 0.66;
    const platformRows =
      createLabyrinthPlatformRows(
        runtime.width,
        runtime.height,
        ballRadius,
        getLabyrinthSeed(runtime)
      );

    runtime.pegs = [];
    runtime.bursts = [];
    runtime.labyrinth = {
      platformRows,
      steering: 0,
      steerAcceleration:
        runtime.width *
        LABYRINTH_STEER_ACCELERATION_SCALE,
      maxHorizontalSpeed:
        runtime.width *
        LABYRINTH_MAX_HORIZONTAL_SPEED_SCALE,
      horizontalDamping:
        LABYRINTH_HORIZONTAL_DAMPING,
      gravity:
        runtime.height * 0.24,
      maxVerticalSpeed:
        runtime.height * 0.29,
      petDirection: 1,
      petSpeed:
        runtime.width * 0.19
    };

    setCatcherX(
      runtime,
      runtime.width / 2
    );
  }

  function spawnLabyrinthBall(
    runtime,
    config,
    now,
    spawnIndex
  ) {
    if (!config) return;

    const radius =
      runtime.pegRadius * 0.66;
    const lanes = [
      0.22, 0.5, 0.78,
      0.36, 0.64, 0.5, 0.28
    ];
    const fraction =
      lanes[
        spawnIndex % lanes.length
      ];
    const padding =
      Math.max(
        radius * 2.4,
        runtime.width * 0.06
      );
    const x = clamp(
      runtime.width * fraction,
      padding,
      runtime.width - padding
    );

    runtime.balls.push({
      id: runtime.nextBallId++,
      config,
      x,
      y: -radius,
      vx: 0,
      vy: runtime.height * 0.025,
      radius,
      rotation: 0,
      angularVelocity: 0,
      points: config.points || 1,
      bonus: false,
      bornAt: now,
      labyrinthProgressAt: now,
      labyrinthProgressX: x,
      labyrinthProgressY: -radius,
      labyrinthReleaseCount: 0,
      trail: [],
      lastTrailAt: 0
    });
  }

  function processLabyrinthSpawns(
    runtime,
    now
  ) {
    if (
      runtime.scheduledIndex >=
        runtime.scheduled.length ||
      now < runtime.nextScheduledAt
    ) {
      return;
    }

    const spawnIndex =
      runtime.scheduledIndex;

    spawnLabyrinthBall(
      runtime,
      runtime.scheduled[spawnIndex],
      now,
      spawnIndex
    );

    runtime.scheduledIndex += 1;

    if (
      runtime.scheduledIndex <
      runtime.scheduled.length
    ) {
      runtime.nextScheduledAt =
        now + 4000 + Math.random() * 1000;
    }
  }

  function collideLabyrinthBallWithWalls(
    runtime,
    ball
  ) {
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx =
        Math.abs(ball.vx) * 0.42;
    } else if (
      ball.x + ball.radius >
      runtime.width
    ) {
      ball.x =
        runtime.width - ball.radius;
      ball.vx =
        -Math.abs(ball.vx) * 0.42;
    }
  }

  function getLabyrinthLandingBounceVelocity(ball) {
    const impactSpeed =
      Math.max(
        0,
        Number(ball?.vy) || 0
      );
    const radius =
      Math.max(
        1,
        Number(ball?.radius) || 1
      );
    const settleSpeed =
      radius *
      LABYRINTH_PLATFORM_SETTLE_SPEED_RADIUS_SCALE;

    if (impactSpeed < settleSpeed) {
      return 0;
    }

    const reboundSpeed =
      Math.min(
        impactSpeed *
          LABYRINTH_PLATFORM_RESTITUTION,
        radius *
          LABYRINTH_PLATFORM_MAX_BOUNCE_SPEED_RADIUS_SCALE
      );

    return -reboundSpeed;
  }

  function collideLabyrinthBallWithSegment(
    ball,
    segment,
    previousY
  ) {
    const previousBottom =
      previousY + ball.radius;
    const currentBottom =
      ball.y + ball.radius;
    const overlapsHorizontally =
      ball.x + ball.radius > segment.x &&
      ball.x - ball.radius <
        segment.x + segment.width;

    if (
      ball.vy >= 0 &&
      overlapsHorizontally &&
      previousBottom <= segment.y + 0.75 &&
      currentBottom >= segment.y
    ) {
      const reboundVelocity =
        getLabyrinthLandingBounceVelocity(
          ball
        );

      ball.y =
        segment.y - ball.radius;
      ball.vy = reboundVelocity;
      ball.vx *=
        LABYRINTH_PLATFORM_ROLL_DAMPING;
      return true;
    }

    const nearestX = clamp(
      ball.x,
      segment.x,
      segment.x + segment.width
    );
    const nearestY = clamp(
      ball.y,
      segment.y,
      segment.y + segment.height
    );
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    const distanceSquared =
      dx * dx + dy * dy;

    if (
      distanceSquared >=
      ball.radius * ball.radius
    ) {
      return false;
    }

    const distance =
      Math.sqrt(distanceSquared);

    if (distance > 0.001) {
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap =
        ball.radius - distance;

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      if (Math.abs(nx) > Math.abs(ny)) {
        ball.vx =
          -ball.vx * 0.28;
      } else if (ny < 0) {
        if (ball.vy >= 0) {
          ball.vy =
            getLabyrinthLandingBounceVelocity(
              ball
            );
        }
        ball.vx *=
          LABYRINTH_PLATFORM_ROLL_DAMPING;
      }

      return true;
    }

    const segmentCenterX =
      segment.x + segment.width / 2;
    const pushLeft =
      ball.x < segmentCenterX;

    ball.x = pushLeft
      ? segment.x - ball.radius
      : segment.x +
        segment.width +
        ball.radius;
    ball.vx =
      (pushLeft ? -1 : 1) *
      Math.abs(ball.vx) * 0.28;
    return true;
  }

  function collideLabyrinthBallWithPlatforms(
    runtime,
    ball,
    previousY
  ) {
    const rows =
      runtime.labyrinth?.platformRows || [];

    for (const row of rows) {
      for (const segment of row.segments) {
        if (
          collideLabyrinthBallWithSegment(
            ball,
            segment,
            previousY
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function getLabyrinthReleaseDirection(
    runtime,
    ball
  ) {
    const rows =
      runtime.labyrinth?.platformRows || [];
    let nearestRow = null;
    let nearestDistance = Infinity;

    for (const row of rows) {
      const distance =
        Math.abs(
          (row.y - ball.radius) -
          ball.y
        );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestRow = row;
      }
    }

    if (
      nearestRow &&
      Number.isFinite(nearestRow.gapCenter)
    ) {
      const delta =
        nearestRow.gapCenter - ball.x;

      if (
        Math.abs(delta) >
        ball.radius * 0.5
      ) {
        return delta > 0 ? 1 : -1;
      }
    }

    return ball.id % 2 === 0 ? -1 : 1;
  }

  function recoverStuckLabyrinthBall(
    runtime,
    ball,
    now
  ) {
    const state = runtime.labyrinth;
    if (!state || !ball) return false;

    const progressDistance =
      Math.max(
        ball.radius * 0.8,
        runtime.width * 0.012
      );

    if (
      !Number.isFinite(
        ball.labyrinthProgressAt
      )
    ) {
      ball.labyrinthProgressAt = now;
      ball.labyrinthProgressX = ball.x;
      ball.labyrinthProgressY = ball.y;
      return false;
    }

    const dx =
      ball.x -
      Number(ball.labyrinthProgressX);
    const dy =
      ball.y -
      Number(ball.labyrinthProgressY);

    if (
      Number.isFinite(dx) &&
      Number.isFinite(dy) &&
      dx * dx + dy * dy >=
        progressDistance * progressDistance
    ) {
      ball.labyrinthProgressAt = now;
      ball.labyrinthProgressX = ball.x;
      ball.labyrinthProgressY = ball.y;
      return false;
    }

    if (
      now - ball.labyrinthProgressAt <
      LABYRINTH_STUCK_MS
    ) {
      return false;
    }

    const direction =
      getLabyrinthReleaseDirection(
        runtime,
        ball
      );
    const releaseSpeed =
      runtime.width *
      LABYRINTH_RELEASE_SPEED_SCALE;

    ball.vx = clamp(
      ball.vx +
        direction * releaseSpeed,
      -state.maxHorizontalSpeed,
      state.maxHorizontalSpeed
    );
    ball.vy = Math.max(
      ball.vy,
      runtime.height * 0.04
    );
    ball.labyrinthProgressAt = now;
    ball.labyrinthProgressX = ball.x;
    ball.labyrinthProgressY = ball.y;
    ball.labyrinthReleaseCount =
      Math.max(
        0,
        Number(
          ball.labyrinthReleaseCount
        ) || 0
      ) + 1;

    return true;
  }

  function updateLabyrinthBall(
    runtime,
    ball,
    dt,
    now
  ) {
    const state = runtime.labyrinth;
    if (!state) return;

    addTrailPoint(ball, now);

    ball.vx +=
      state.steering *
      state.steerAcceleration *
      dt;
    ball.vx *=
      Math.pow(
        state.horizontalDamping,
        dt * 60
      );
    ball.vx = clamp(
      ball.vx,
      -state.maxHorizontalSpeed,
      state.maxHorizontalSpeed
    );
    ball.vy = Math.min(
      state.maxVerticalSpeed,
      ball.vy + state.gravity * dt
    );

    const previousY = ball.y;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.rotation +=
      (ball.vx / Math.max(1, ball.radius)) *
      dt * 0.65;

    collideLabyrinthBallWithWalls(
      runtime,
      ball
    );
    collideLabyrinthBallWithPlatforms(
      runtime,
      ball,
      previousY
    );
    recoverStuckLabyrinthBall(
      runtime,
      ball,
      now
    );
  }

  function advanceLabyrinthPet(
    position,
    direction,
    speed,
    dt,
    minX,
    maxX
  ) {
    let nextDirection =
      direction >= 0 ? 1 : -1;
    let nextPosition =
      position +
      nextDirection * speed * dt;

    while (
      nextPosition < minX ||
      nextPosition > maxX
    ) {
      if (nextPosition > maxX) {
        nextPosition =
          maxX - (nextPosition - maxX);
        nextDirection = -1;
      } else if (nextPosition < minX) {
        nextPosition =
          minX + (minX - nextPosition);
        nextDirection = 1;
      }
    }

    return {
      position:
        clamp(
          nextPosition,
          minX,
          maxX
        ),
      direction: nextDirection
    };
  }

  function updateLabyrinthPet(
    runtime,
    dt
  ) {
    const state = runtime.labyrinth;
    if (!state) return;

    const next =
      advanceLabyrinthPet(
        runtime.catcherX,
        state.petDirection,
        state.petSpeed,
        dt,
        runtime.petRadius,
        runtime.width - runtime.petRadius
      );

    state.petDirection =
      next.direction;
    setCatcherX(
      runtime,
      next.position
    );
    updatePetLean(runtime, dt);
  }

  function updateLabyrinthPhysicsStep(
    runtime,
    dt,
    now
  ) {
    updateLabyrinthPet(runtime, dt);

    for (const ball of runtime.balls) {
      updateLabyrinthBall(
        runtime,
        ball,
        dt,
        now
      );
    }

    runtime.balls =
      runtime.balls.filter((ball) => {
        if (ballTouchesPet(runtime, ball)) {
          catchBall(runtime, ball);
          return false;
        }

        if (
          ball.y - ball.radius >
          runtime.height + 20
        ) {
          return false;
        }

        return true;
      });
  }

  function updateLabyrinthMode(
    runtime,
    dt,
    now
  ) {
    processLabyrinthSpawns(
      runtime,
      now
    );

    const steps = Math.max(
      1,
      Math.ceil(
        dt / LABYRINTH_PHYSICS_STEP
      )
    );
    const step = dt / steps;

    for (
      let index = 0;
      index < steps;
      index += 1
    ) {
      updateLabyrinthPhysicsStep(
        runtime,
        step,
        now
      );
    }
  }

  function drawLabyrinthPlatformSegment(
    runtime,
    segment
  ) {
    const ctx = runtime.ctx;

    ctx.save();
    ctx.shadowColor =
      "rgba(48, 25, 8, 0.42)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "#8a572f";
    ctx.fillRect(
      segment.x,
      segment.y,
      segment.width,
      segment.height
    );
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#c48a50";
    ctx.fillRect(
      segment.x,
      segment.y,
      segment.width,
      Math.max(2, segment.height * 0.24)
    );
    ctx.fillStyle =
      "rgba(70, 37, 14, 0.58)";
    ctx.fillRect(
      segment.x,
      segment.y + segment.height - 2,
      segment.width,
      2
    );
    ctx.restore();
  }

  function drawLabyrinthMode(
    runtime,
    now
  ) {
    const ctx = runtime.ctx;

    ctx.setTransform(
      runtime.dpr,
      0,
      0,
      runtime.dpr,
      0,
      0
    );
    ctx.clearRect(
      0,
      0,
      runtime.width,
      runtime.height
    );

    for (const ball of runtime.balls) {
      drawTrail(runtime, ball, now);
    }

    for (
      const row of
      runtime.labyrinth?.platformRows || []
    ) {
      for (const segment of row.segments) {
        drawLabyrinthPlatformSegment(
          runtime,
          segment
        );
      }
    }

    for (const ball of runtime.balls) {
      drawBall(runtime, ball);
    }
  }

  function handleLabyrinthTilt(
    runtime,
    event
  ) {
    if (
      !runtime ||
      !runtime.labyrinth ||
      !runtime.tiltEnabled ||
      runtime.dragging ||
      activeRuntime !== runtime
    ) {
      return;
    }

    const gamma = Number(event?.gamma);
    if (!Number.isFinite(gamma)) return;

    const now = performance.now();

    if (now < runtime.tiltCalibrationUntil) {
      runtime.tiltSamples.push(gamma);
      if (runtime.tiltSamples.length > 24) {
        runtime.tiltSamples.shift();
      }
      return;
    }

    if (!Number.isFinite(runtime.neutralGamma)) {
      const samples =
        runtime.tiltSamples.length
          ? runtime.tiltSamples
          : [gamma];
      const average =
        samples.reduce(
          (sum, value) => sum + value,
          0
        ) / samples.length;

      runtime.neutralGamma = average;
      runtime.tiltSamples = [];
      runtime.smoothedTilt = 0;
    }

    const relative = clamp(
      gamma - runtime.neutralGamma,
      -25,
      25
    );
    runtime.smoothedTilt =
      runtime.smoothedTilt * 0.72 +
      relative * 0.28;
    runtime.labyrinth.steering =
      runtime.smoothedTilt / 25;
  }

  function handleLabyrinthModeInput(
    runtime,
    input
  ) {
    if (!runtime?.labyrinth) return;

    if (input?.type === "tilt") {
      handleLabyrinthTilt(
        runtime,
        input.event
      );
      return;
    }

    if (input?.type === "pointer") {
      const halfWidth =
        Math.max(1, runtime.width / 2);
      runtime.labyrinth.steering =
        clamp(
          (
            Number(input.x) -
            halfWidth
          ) /
          (halfWidth * 0.72),
          -1,
          1
        );
      return;
    }

    if (input?.type === "pointerend") {
      runtime.labyrinth.steering = 0;
    }
  }

  function isLabyrinthModeComplete(
    runtime,
    now
  ) {
    return maybeFinish(runtime, now);
  }

  function buildLabyrinthResult(runtime) {
    return buildStandardResult(runtime);
  }

  function disposeLabyrinthMode(runtime) {
    if (runtime?.labyrinth) {
      runtime.labyrinth.steering = 0;
    }
  }

  const LABYRINTH_MODE_CONTROLLER =
    Object.freeze({
      id: FEED_MODES.LABYRINTH,
      initialize: initializeLabyrinthMode,
      update: updateLabyrinthMode,
      draw: drawLabyrinthMode,
      handleInput: handleLabyrinthModeInput,
      isComplete: isLabyrinthModeComplete,
      buildResult: buildLabyrinthResult,
      dispose: disposeLabyrinthMode
    });

  function getMelodySnackConfig(index) {
    const configs = [...SOLID_BALLS, RAINBOW_BALL];
    return configs[index % configs.length];
  }

  function updateMelodyScore(runtime) {
    const state = runtime?.melody;
    if (!state) return;

    runtime.score =
      calculateMelodyCatchPercent(
        runtime.caughtCount,
        runtime.totalCount
      );

    if (!runtime.scoreEl) return;
    runtime.scoreEl.textContent = `${runtime.score}%`;
    const badge =
      runtime.scoreEl.closest(
        ".daily-feed-score-badge"
      );
    if (!badge) return;
    badge.classList.remove("is-bumped");
    void badge.offsetWidth;
    badge.classList.add("is-bumped");
  }

  function playMelodyTone(runtime, midi) {
    const context = runtime?.audioContext;
    const state = runtime?.melody;

    if (
      !state ||
      !context ||
      context.state === "closed" ||
      !Number.isFinite(Number(midi))
    ) {
      return false;
    }

    if (context.state !== "running") {
      context.resume?.().catch?.(() => {});
      return false;
    }

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime;
      const voice = { oscillator, gain };

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(
        midiToFrequency(midi),
        startAt
      );
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        MELODY_TONE_VOLUME,
        startAt + 0.012
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + MELODY_TONE_DURATION
      );

      oscillator.connect(gain);
      gain.connect(context.destination);
      state.activeVoices.add(voice);

      oscillator.onended = () => {
        state.activeVoices.delete(voice);
        try { oscillator.disconnect(); } catch (err) { }
        try { gain.disconnect(); } catch (err) { }
      };

      oscillator.start(startAt);
      oscillator.stop(
        startAt + MELODY_TONE_DURATION + 0.04
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  function stopMelodyVoices(runtime) {
    const voices = runtime?.melody?.activeVoices;
    if (!voices) return;

    for (const voice of voices) {
      try { voice.oscillator?.stop?.(); } catch (err) { }
      try { voice.oscillator?.disconnect?.(); } catch (err) { }
      try { voice.gain?.disconnect?.(); } catch (err) { }
    }
    voices.clear();
  }

  function initializeMelodyMode(runtime) {
    const tune = FEED_MELODIES[0];
    const timeline =
      createMelodyTimeline(
        tune?.notes,
        runtime.width,
        {
          bpm: MELODY_BPM,
          travelMs: MELODY_TRAVEL_MS
        }
      );
    const totalCount =
      timeline.filter(
        (entry) => Number.isFinite(entry.midi)
      ).length;

    runtime.pegs = [];
    runtime.bursts = [];
    runtime.balls = [];
    runtime.scheduled = [];
    runtime.scheduledIndex = 0;
    runtime.nextScheduledAt = Infinity;
    runtime.score = 0;
    runtime.caughtCount = 0;
    runtime.totalCount = totalCount;
    runtime.melody = {
      tuneId: tune?.id || "odeToJoy",
      bpm: MELODY_BPM,
      beatMs: MELODY_BEAT_MS,
      travelMs: MELODY_TRAVEL_MS,
      timeline,
      startTime: null,
      lastUpdateAt: 0,
      classifiedCount: 0,
      activeVoices: new Set()
    };

    if (runtime.scoreEl) {
      runtime.scoreEl.textContent = "0%";
    }
  }

  function spawnMelodyNote(runtime, entry) {
    const radius = runtime.pegRadius * 0.66;
    const config = getMelodySnackConfig(entry.index);
    const x = clamp(
      Number(entry.x) || runtime.width / 2,
      radius * 1.25,
      runtime.width - radius * 1.25
    );

    entry.status = "active";
    runtime.balls.push({
      id: runtime.nextBallId++,
      config,
      melodyEntry: entry,
      x,
      y: -radius * 1.25,
      vx: 0,
      vy: 0,
      radius,
      rotation: 0,
      angularVelocity: 0,
      points: 0,
      trail: [],
      lastTrailAt: 0
    });
  }

  function classifyMelodyMiss(runtime, entry) {
    if (!entry || entry.status === "missed" || entry.status === "caught") {
      return;
    }
    entry.status = "missed";
    runtime.melody.classifiedCount += 1;
    updateMelodyScore(runtime);
  }

  function catchMelodyNote(runtime, ball) {
    const entry = ball?.melodyEntry;
    if (!entry || entry.status !== "active") return;

    entry.status = "caught";
    runtime.caughtCount += 1;
    runtime.melody.classifiedCount += 1;
    updateMelodyScore(runtime);
    playMelodyTone(runtime, entry.midi);

    runtime.catcher.classList.remove("is-catching");
    void runtime.catcher.offsetWidth;
    runtime.catcher.classList.add("is-catching");
  }

  function updateMelodyMode(
    runtime,
    dt,
    now
  ) {
    const state = runtime.melody;
    if (!state) return;

    if (!Number.isFinite(state.startTime)) {
      state.startTime = now;
      state.lastUpdateAt = now;
    }

    const resumedAfterGap =
      state.lastUpdateAt > 0 &&
      now - state.lastUpdateAt > MELODY_BACKGROUND_GAP_MS;
    state.lastUpdateAt = now;

    const elapsed = now - state.startTime;

    for (const entry of state.timeline) {
      if (entry.status !== "pending") continue;

      if (!Number.isFinite(entry.midi)) {
        if (elapsed >= entry.spawnOffsetMs) {
          entry.status = "rest";
        }
        continue;
      }

      if (elapsed >= entry.arrivalOffsetMs) {
        classifyMelodyMiss(runtime, entry);
        continue;
      }

      if (elapsed >= entry.spawnOffsetMs) {
        spawnMelodyNote(runtime, entry);
      }
    }

    const nextBalls = [];
    const startY = -runtime.pegRadius;
    const arrivalY = runtime.petCenterY;

    for (const ball of runtime.balls) {
      const entry = ball.melodyEntry;
      if (!entry || entry.status !== "active") continue;

      const progress =
        (elapsed - entry.spawnOffsetMs) /
        Math.max(1, state.travelMs);

      if (progress >= 1) {
        if (resumedAfterGap) {
          classifyMelodyMiss(runtime, entry);
        } else {
          const catchHalfWidth =
            runtime.petRadius +
            ball.radius * 0.65;
          if (
            Math.abs(ball.x - runtime.catcherX) <=
            catchHalfWidth
          ) {
            catchMelodyNote(runtime, ball);
          } else {
            classifyMelodyMiss(runtime, entry);
          }
        }
        continue;
      }

      const visibleProgress = clamp(progress, 0, 1);
      ball.y =
        startY +
        (arrivalY - startY) * visibleProgress;
      ball.rotation = visibleProgress * Math.PI * 2;
      nextBalls.push(ball);
    }

    runtime.balls = nextBalls;
    updatePetLean(runtime, dt);
  }

  function drawMelodyMode(runtime) {
    const ctx = runtime.ctx;

    ctx.setTransform(
      runtime.dpr,
      0,
      0,
      runtime.dpr,
      0,
      0
    );
    ctx.clearRect(
      0,
      0,
      runtime.width,
      runtime.height
    );

    for (const ball of runtime.balls) {
      drawBall(runtime, ball);
    }
  }

  function handleMelodyModeInput(
    runtime,
    input
  ) {
    if (input?.type === "tilt") {
      handleTilt(runtime, input.event);
      return;
    }

    if (input?.type === "pointer") {
      setCatcherX(runtime, input.x);
    }
  }

  function isMelodyModeComplete(
    runtime,
    now
  ) {
    const state = runtime.melody;
    if (
      !state ||
      state.classifiedCount < runtime.totalCount ||
      runtime.balls.length
    ) {
      runtime.finishAt = 0;
      return false;
    }

    if (!runtime.finishAt) {
      runtime.finishAt =
        now +
        (
          Number(runtime.modeConfig?.finishDelayMs) ||
          900
        );
      return false;
    }

    return now >= runtime.finishAt;
  }

  function buildMelodyResult(runtime) {
    const catchPercent =
      calculateMelodyCatchPercent(
        runtime.caughtCount,
        runtime.totalCount
      );
    runtime.score = catchPercent;

    return {
      ...buildStandardResult(runtime),
      score: catchPercent,
      totalCount: runtime.totalCount,
      catchPercent
    };
  }

  function disposeMelodyMode(runtime) {
    stopMelodyVoices(runtime);
    if (runtime?.melody) {
      runtime.melody.lastUpdateAt = 0;
    }
  }

  const MELODY_MODE_CONTROLLER =
    Object.freeze({
      id: FEED_MODES.MELODY,
      initialize: initializeMelodyMode,
      update: updateMelodyMode,
      draw: drawMelodyMode,
      handleInput: handleMelodyModeInput,
      isComplete: isMelodyModeComplete,
      buildResult: buildMelodyResult,
      dispose: disposeMelodyMode
    });

  function initializeClassicMode() { }

  function updateClassicMode(
    runtime,
    dt,
    now
  ) {
    processSpawns(runtime, now);
    const step = dt / 2;
    updateBalls(runtime, step, now);
    updateBalls(runtime, step, now);
    updatePetLean(runtime, dt);
  }

  function drawClassicMode(runtime, now) {
    draw(runtime, now);
  }

  function handleClassicModeInput(
    runtime,
    input
  ) {
    if (input?.type === "tilt") {
      handleTilt(
        runtime,
        input.event
      );
      return;
    }

    if (input?.type === "pointer") {
      setCatcherX(
        runtime,
        input.x
      );
    }
  }

  function isClassicModeComplete(
    runtime,
    now
  ) {
    return maybeFinish(runtime, now);
  }

  function buildClassicResult(runtime) {
    return buildStandardResult(runtime);
  }

  function disposeClassicMode() { }

  const CLASSIC_MODE_CONTROLLER =
    Object.freeze({
      id: FEED_MODES.CLASSIC,
      initialize: initializeClassicMode,
      update: updateClassicMode,
      draw: drawClassicMode,
      handleInput: handleClassicModeInput,
      isComplete: isClassicModeComplete,
      buildResult: buildClassicResult,
      dispose: disposeClassicMode
    });

  const FEED_MODE_CONTROLLERS =
    Object.freeze({
      [FEED_MODES.CLASSIC]:
        CLASSIC_MODE_CONTROLLER,
      [FEED_MODES.LABYRINTH]:
        LABYRINTH_MODE_CONTROLLER,
      [FEED_MODES.MELODY]:
        MELODY_MODE_CONTROLLER
    });

  function resolveFeedMode(value) {
    const mode =
      normalizeFeedMode(value);
    const config =
      getFeedModeConfig(mode);

    if (
      config?.implemented === true &&
      FEED_MODE_CONTROLLERS[mode]
    ) {
      return mode;
    }

    return FEED_MODES.CLASSIC;
  }

  function getModeController(value) {
    return (
      FEED_MODE_CONTROLLERS[
        resolveFeedMode(value)
      ] ||
      CLASSIC_MODE_CONTROLLER
    );
  }

  function showResult(runtime, result) {
    if (!runtime || activeRuntime !== runtime) return;

    runtime.finished = true;
    runtime.roundStarted = false;
    runtime.running = false;

    if (runtime.rafId) {
      cancelAnimationFrame(runtime.rafId);
      runtime.rafId = 0;
    }

    detachGameplayInput(runtime);
    disposeMode(runtime);

    if (runtime.starAudio) {
      try {
        runtime.starAudio.pause();
        runtime.starAudio.currentTime = 0;
      } catch (err) { }
    }
    if (runtime.chompAudio) {
      try {
        runtime.chompAudio.pause();
        runtime.chompAudio.currentTime = 0;
      } catch (err) { }
    }

    stopAudioContext(runtime.audioContext);
    runtime.audioContext = null;

    const copy =
      getResultCopy(
        result.score,
        result.caughtCount,
        runtime.petName
      );

    runtime.gameEl.classList.add(
      "is-finished"
    );

    runtime.startOverlay.hidden = true;
    runtime.resultTitleEl.textContent =
      runtime.dailyTodoSnack
        ? `Thanks for the snack, ${runtime.zookeeperName}!`
        : copy.title;
    runtime.resultScoreEl.textContent =
      result.mode === FEED_MODES.MELODY
        ? `Snacks Caught: ${Number(result.catchPercent) || 0}%`
        : `Score: ${result.score}`;
    runtime.resultOverlay.hidden = false;
  }

  function complete(runtime) {
    if (
      activeRuntime !== runtime ||
      runtime.finished
    ) {
      return;
    }

    const result =
      runtime.modeController
        .buildResult(runtime);

    showResult(runtime, result);
    runtime.onComplete?.(result);
  }

  function startRound(runtime) {
    if (
      !runtime ||
      activeRuntime !== runtime ||
      runtime.roundStarted ||
      runtime.finished
    ) {
      return;
    }

    runtime.roundStarted = true;
    runtime.running = true;
    runtime.startOverlay.hidden = true;

    if (runtime.startOverlayHandler) {
      runtime.startOverlay.removeEventListener(
        "click",
        runtime.startOverlayHandler
      );
      runtime.startOverlayHandler = null;
    }

    const now = performance.now();

    runtime.lastFrameAt = now;
    runtime.finishAt = 0;
    runtime.nextScheduledAt =
      now +
      (
        runtime.tiltEnabled
          ? TILT_CALIBRATION_MS + 300
          : 650
      );

    if (runtime.tiltEnabled) {
      beginTiltCalibration(runtime);
      window.addEventListener(
        "deviceorientation",
        runtime.orientationHandler
      );
    }

    runtime.stage.addEventListener(
      "pointerdown",
      runtime.pointerDownHandler
    );
    runtime.stage.addEventListener(
      "pointermove",
      runtime.pointerMoveHandler
    );
    runtime.stage.addEventListener(
      "pointerup",
      runtime.pointerEndHandler
    );
    runtime.stage.addEventListener(
      "pointercancel",
      runtime.pointerEndHandler
    );

    runtime.rafId =
      requestAnimationFrame(
        (frameNow) =>
          runFrame(runtime, frameNow)
      );
  }

  function runFrame(runtime, now) {
    if (!runtime.running || activeRuntime !== runtime) return;
    const dt = clamp((now - runtime.lastFrameAt) / 1000, 0.001, 0.032);
    runtime.lastFrameAt = now;
    runtime.modeController
      .update(runtime, dt, now);
    runtime.modeController
      .draw(runtime, now);
    if (
      runtime.modeController
        .isComplete(runtime, now)
    ) {
      complete(runtime);
      return;
    }
    runtime.rafId = requestAnimationFrame((nextNow) => runFrame(runtime, nextNow));
  }

  function start(
    rootEl,
    {
      session,
      onComplete,
      onBackToZoo
    } = {}
  ) {
    const savedAudio = preparedAudioContext;
    preparedAudioContext = null;
    stop();
    preparedAudioContext = savedAudio;

    if (!rootEl || !session) return null;

    const requestedMode =
      normalizeFeedMode(session?.feedMode);
    const mode =
      resolveFeedMode(requestedMode);
    const modeConfig =
      getFeedModeConfig(mode);
    const modeController =
      getModeController(mode);

    const gameEl =
      rootEl.querySelector(
        "[data-daily-feed-game]"
      );

    const stage =
      rootEl.querySelector(
        "[data-daily-feed-stage]"
      );

    const canvas =
      rootEl.querySelector(
        "[data-daily-feed-canvas]"
      );

    const catcher =
      rootEl.querySelector(
        "[data-daily-feed-catcher]"
      );

    const petCircle =
      rootEl.querySelector(
        "[data-daily-feed-pet-circle]"
      );

    const scoreEl =
      rootEl.querySelector(
        "[data-daily-feed-score]"
      );

    const scorePopupsEl =
      rootEl.querySelector(
        "[data-daily-feed-score-popups]"
      );

    const startOverlay =
      rootEl.querySelector(
        "[data-daily-feed-start-overlay]"
      );

    const resultOverlay =
      rootEl.querySelector(
        "[data-daily-feed-result-overlay]"
      );

    const resultTitleEl =
      rootEl.querySelector(
        "[data-daily-feed-result-title]"
      );

    const resultScoreEl =
      rootEl.querySelector(
        "[data-daily-feed-result-score]"
      );

    const resultBackButton =
      rootEl.querySelector(
        "[data-daily-feed-result-back]"
      );

    if (
      !gameEl ||
      !stage ||
      !canvas ||
      !catcher ||
      !petCircle ||
      !scoreEl ||
      !scorePopupsEl ||
      !startOverlay ||
      !resultOverlay ||
      !resultTitleEl ||
      !resultScoreEl ||
      !resultBackButton
    ) {
      return null;
    }

    const width = stage.clientWidth;
    const height = stage.clientHeight;

    if (width < 120 || height < 260) {
      requestAnimationFrame(() => {
        if (rootEl.isConnected) {
          start(
            rootEl,
            {
              session,
              onComplete,
              onBackToZoo
            }
          );
        }
      });
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const dpr = clamp(
      window.devicePixelRatio || 1,
      1,
      2
    );

    canvas.width =
      Math.round(width * dpr);

    canvas.height =
      Math.round(height * dpr);

    const earnedStarPegCount =
      Math.min(
        2,
        Math.max(0, Number(session.earnedStarPegCount) || 0)
      );

    const field =
      createPegField(
        width,
        height,
        earnedStarPegCount
      );

    const images =
      buildImageMap();

    catcher.style.setProperty(
      "--daily-feed-pet-size",
      `${field.pegRadius * 4}px`
    );

    const stageRect =
      stage.getBoundingClientRect();

    const petRect =
      petCircle.getBoundingClientRect();

    const audioContext =
      preparedAudioContext ||
      prepareAudio();

    preparedAudioContext = null;

    const starAudio =
      audioContext
        ? null
        : new Audio(
          `${ASSET_BASE}dq_feed_star.mp3`
        );

    if (starAudio) {
      starAudio.preload = "auto";
      starAudio.volume = 0.82;

      try {
        starAudio.load();
      } catch (err) { }
    }

    const chompAudio = audioContext
      ? null
      : new Audio(`${ASSET_BASE}dq_feed_chomp.mp3`);

    if (chompAudio) {
      chompAudio.preload = "auto";
      chompAudio.volume = 0.85;
      try { chompAudio.load(); } catch (err) { }
    }

    const now = performance.now();
    const scheduled =
      buildScheduledBalls();

    const runtime = {
      running: false,
      roundStarted: false,
      finished: false,
      requestedMode,
      mode,
      modeConfig,
      modeController,
      modeDisposed: false,
      modeTimers: new Set(),
      rafId: 0,
      lastFrameAt: now,
      width,
      height,
      dpr,
      ctx,
      gameEl,
      stage,
      canvas,
      catcher,
      petCircle,
      scoreEl,
      scorePopupsEl,
      startOverlay,
      resultOverlay,
      resultTitleEl,
      resultScoreEl,
      resultBackButton,
      startOverlayHandler: null,
      resultBackHandler: null,
      introUnlockAt:
        now + INTRO_TAP_LOCKOUT_MS,
      petName:
        String(
          session.petName ||
          "BibloPet"
        ).trim() ||
        "BibloPet",
      dailyTodoSnack:
        session.dailyTodoSnack === true,
      zookeeperName:
        String(
          session.zookeeperName ||
          "Zookeeper"
        ).trim() ||
        "Zookeeper",
      catcherX: width / 2,
      petRadius: petRect.width / 2,
      petCenterY:
        (
          petRect.top -
          stageRect.top
        ) +
        petRect.height / 2,
      petTilt: 0,
      lastCatcherX: width / 2,
      smoothedPetVelocity: 0,
      dragging: false,
      activePointerId: null,
      tiltEnabled:
        session.rewardTiltEnabled ===
        true,
      neutralGamma: null,
      smoothedTilt: 0,
      tiltSamples: [],
      tiltCalibrationUntil: 0,
      orientationHandler: null,
      pointerDownHandler: null,
      pointerMoveHandler: null,
      pointerEndHandler: null,
      pegs: field.pegs,
      pegRadius: field.pegRadius,
      starImage: images.star,
      ballImages: images.balls,
      balls: [],
      nextBallId: 1,
      scheduled,
      totalCount:
        scheduled.length,
      scheduledIndex: 0,
      nextScheduledAt: Infinity,
      bursts: [],
      gravity: height * 0.31,
      score: 0,
      caughtCount: 0,
      lastPegNoteIndex: -1,
      lastPegSoundAt: 0,
      audioContext,
      starAudio,
      chompAudio,
      finishAt: 0,
      onComplete:
        typeof onComplete ===
        "function"
          ? onComplete
          : null,
      onBackToZoo:
        typeof onBackToZoo ===
        "function"
          ? onBackToZoo
          : null
    };

    activeRuntime = runtime;
    runtime.modeController
      .initialize(runtime);

    stage.style.backgroundImage =
      `url("${chooseBackground(
        width,
        height
      )}")`;

    setCatcherX(
      runtime,
      width / 2
    );

    runtime.orientationHandler =
      (event) =>
        runtime.modeController
          .handleInput(
            runtime,
            {
              type: "tilt",
              event
            }
          );

    const moveCatcher =
      (event) => {
        const rect =
          stage
            .getBoundingClientRect();

        runtime.modeController
          .handleInput(
            runtime,
            {
              type: "pointer",
              x:
                event.clientX -
                rect.left
            }
          );
      };

    runtime.pointerDownHandler =
      (event) => {
        if (
          activeRuntime !== runtime ||
          !runtime.roundStarted ||
          runtime.finished
        ) {
          return;
        }

        event.preventDefault();

        runtime.dragging = true;
        runtime.activePointerId =
          event.pointerId;

        try {
          stage.setPointerCapture(
            event.pointerId
          );
        } catch (err) { }

        moveCatcher(event);
      };

    runtime.pointerMoveHandler =
      (event) => {
        if (
          !runtime.dragging ||
          activeRuntime !== runtime ||
          runtime.finished
        ) {
          return;
        }

        event.preventDefault();
        moveCatcher(event);
      };

    runtime.pointerEndHandler =
      (event) => {
        if (
          activeRuntime !== runtime
        ) {
          return;
        }

        runtime.dragging = false;
        runtime.activePointerId =
          null;

        runtime.modeController
          .handleInput(
            runtime,
            { type: "pointerend" }
          );

        if (runtime.tiltEnabled) {
          runtime.smoothedTilt = 0;
        }

        try {
          stage.releasePointerCapture(
            event.pointerId
          );
        } catch (err) { }
      };

    runtime.startOverlayHandler =
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          activeRuntime !== runtime ||
          performance.now() <
            runtime.introUnlockAt
        ) {
          return;
        }

        startRound(runtime);
      };

    runtime.resultBackHandler =
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          activeRuntime !== runtime ||
          !runtime.finished
        ) {
          return;
        }

        const goBack =
          runtime.onBackToZoo;

        const shouldClose =
          goBack?.();

        if (shouldClose === false) {
          return;
        }

        stop();
      };

    startOverlay.addEventListener(
      "click",
      runtime.startOverlayHandler
    );

    resultBackButton.addEventListener(
      "click",
      runtime.resultBackHandler
    );

    runtime.modeController
      .draw(runtime, now);

    if (session.rewardComplete) {
      runtime.score =
        Math.max(
          0,
          Number(
            session.rewardScore
          ) || 0
        );

      runtime.caughtCount =
        Math.max(
          0,
          Number(
            session.rewardCaught
          ) || 0
        );

      showResult(
        runtime,
        runtime.modeController
          .buildResult(runtime)
      );
    }

    return runtime;
  }

  function getResultCopy(score, caughtCount, petName) {
    const safeScore = Math.max(0, Number(score) || 0);
    const safeCaught = Math.max(0, Number(caughtCount) || 0);
    const cleanPetName = String(petName || "Your BibloPet").trim() || "Your BibloPet";

    if (safeScore >= 13) {
      return {
        chomp: "CHOMP!",
        title: "Amazing Catching!",
        message: `${cleanPetName} caught a huge pile of snacks!`
      };
    }

    if (safeScore >= 12) {
      return {
        chomp: "CHOMP!",
        title: "Snack Superstar!",
        message: `${cleanPetName} is one happy BibloPet!`
      };
    }

    if (safeScore >= 8) {
      return {
        chomp: "CHOMP!",
        title: "Great Catching!",
        message: `${cleanPetName} had a really good snack!`
      };
    }

    if (safeScore >= 4) {
      return {
        chomp: "CHOMP!",
        title: "Nice Catching!",
        message: `${cleanPetName} loved those tasty catches!`
      };
    }

    return {
      chomp: safeCaught > 0 ? "CHOMP!" : "ALL DONE!",
      title: "Nice Catching!",
      message: `${cleanPetName} had fun chasing the snacks!`
    };
  }

  window.BibloZooDailyFeedGame = Object.freeze({
    version: 1,
    prepareAudio,
    render,
    start,
    stop,
    getResultCopy
  });
})();
