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

  // Feeding Game audio tuning knobs. Edit these values to balance the sounds
  // on your iPhone; no developer UI is required. 1.00 = normal overall level.
  // The master scales ALL Feeding effects, including the existing MP3 sounds.
  // Keep the master at or below 1.00 to avoid clipping overlapping effects.
  const FEED_AUDIO_MASTER_VOLUME = 1.00;
  const FEED_COLLISION_TONE_VOLUME = 0.20; // Classic pegs + Bounce bricks/walls/paddle.
  const FEED_MELODY_TONE_VOLUME = 0.25;    // Melody notes only.
  // Recovery happens only after a deliberate Resume gesture. An advancing
  // Web Audio clock is necessary (but not sufficient) evidence of usable sound.
  const FEED_AUDIO_CLOCK_PROBE_MS = 180;
  const FEED_AUDIO_CLOCK_MIN_ADVANCE = 0.012;
  // C.2d: Native-only does not depend on the Web Audio clock.
  const FEED_NATIVE_STATE_READ_TIMEOUT_MS = 500;
  const FEED_AUDIO_REPLACEMENT_COOLDOWN_MS = 1500;
  const FEED_AUDIO_REPLACEMENT_BURST_LIMIT = 2;
  const FEED_AUDIO_REPLACEMENT_BACKOFF_MS = 15000;

  function feedingSoundVolume(baseVolume) {
    return clamp(baseVolume * FEED_AUDIO_MASTER_VOLUME, 0, 1);
  }
  const TILT_CALIBRATION_MS = 750;
  const INTRO_TAP_LOCKOUT_MS = 800;

  // Patch 72.1B.1: temporary iPhone pilot harness, deliberately hidden from
  // ordinary play. Hold the active Feeding score pill for 2.4 seconds.
  // Set this switch to false (or remove the harness) before public release.
  const ENABLE_FEED_ZOO_ESCAPE_TEST_HARNESS = true;
  const FEED_ZOO_TEST_HOLD_MS = 2400;


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
        prompt: "Steer to catch snacks"
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
        prompt: "Guide snacks through the gaps!"
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
        prompt: "Catch the snacks to play the tune!"
      })
    }),
    [FEED_MODES.BOUNCE]: Object.freeze({
      id: FEED_MODES.BOUNCE,
      implemented: true,
      schedule: "bounce-bricks",
      inputTarget: "paddle",
      catchTarget: "pet",
      scoring: "points",
      finishDelayMs: 900,
      instructions: Object.freeze({
        title: "Bounce the BibloSnacks!",
        prompt: "Bounce the white ball and catch the snacks!"
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
  // Labyrinth only: double snack diameter without changing other feeding modes.
  const LABYRINTH_BALL_SIZE_MULTIPLIER = 2;
  const LABYRINTH_GRAVITY_SCALE = 0.60;
  const LABYRINTH_MAX_VERTICAL_SPEED_SCALE = 0.55;
  const LABYRINTH_STUCK_MS = 3500;
  const LABYRINTH_STEER_ACCELERATION_SCALE = 3.2;
  const LABYRINTH_MAX_HORIZONTAL_SPEED_SCALE = 0.72;
  const LABYRINTH_HORIZONTAL_DAMPING = 0.982;
  const LABYRINTH_PLATFORM_ROLL_DAMPING = 0.998;
  const LABYRINTH_PLATFORM_RESTITUTION = 0.34;
  const LABYRINTH_PLATFORM_SETTLE_SPEED_RADIUS_SCALE = 4;
  const LABYRINTH_PLATFORM_MAX_BOUNCE_SPEED_RADIUS_SCALE = 6.5;
  const LABYRINTH_RELEASE_SPEED_SCALE = 0.32;
  // Stable per-ball steering response: a wider 30% spread gives the balls
  // noticeably different-feeling weights for both tilt and drag. Physics
  // gravity, maximum speeds, scoring and collision response are unchanged.
  const LABYRINTH_ACCELERATION_FACTORS = Object.freeze([
    0.85, 1.15, 0.90, 1.10, 0.95, 1.05, 1.00
  ]);
  const LABYRINTH_IMPACT_SOUND_GAP_MS = 135;

  const BOUNCE_COLUMNS = 5;
  const BOUNCE_ROWS = 4;
  const BOUNCE_SERVES = 3;
  const BOUNCE_STEP = 1 / 120;
  const BOUNCE_SNACK_SPEED_SCALE = 0.14;
  const BOUNCE_BALL_SPEED_SCALE = 0.39;
  const BOUNCE_MIN_VERTICAL_FRACTION = 0.48;
  const BOUNCE_SPEED_GAIN_PER_SECOND = 0.025;
  const BOUNCE_MAX_SPEED_MULTIPLIER = 1.60;
  const BOUNCE_PADDLE_HALF_WIDTH_RADIUS_SCALE = 1.50;
  const BOUNCE_PADDLE_HEIGHT_RADIUS_SCALE = 0.36;
  const BOUNCE_PADDLE_GAP_RADIUS_SCALE = 0.08;

  const MELODY_BPM = 116;
  const MELODY_BEAT_MS = 60000 / MELODY_BPM;
  const MELODY_TRAVEL_MS = 2400;
  const MELODY_BACKGROUND_GAP_MS = 250;
  const MELODY_LANE_FRACTIONS = Object.freeze({
    farLeft: 0.20,
    left: 0.35,
    middle: 0.50,
    right: 0.65,
    farRight: 0.80
  });
  const MELODY_HOLD_LENGTHS = Object.freeze([3, 5, 4, 6]);
  const MELODY_TRANSITION_NOTES = 4;
  const MELODY_TARGET_LANE_SEQUENCE = Object.freeze([
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
  ]);
  const MELODY_TONE_DURATION = 0.22;
  const MELODY_TONE_VOLUME = FEED_MELODY_TONE_VOLUME;

  const FEED_MELODIES = Object.freeze([
    Object.freeze({
      id: "odeToJoy",
      label: "Ode to Joy",
      bpm: MELODY_BPM,
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
    }),
    Object.freeze({
      id: "turkeyInTheStraw",
      label: "Turkey in the Straw",
      bpm: 132,
      /*
        A strain / verse melody in G major.
        Beat values are quarter-note beats; the
        final rest closes the 4/4 phrase after
        the verse ending instead of restarting
        into the pickup.
      */
      notes: Object.freeze([
        { midi: 71, beats: 0.5 },
        { midi: 69, beats: 0.5 },

        { midi: 67, beats: 0.5 },
        { midi: 66, beats: 0.5 },
        { midi: 67, beats: 0.5 },
        { midi: 69, beats: 0.5 },
        { midi: 67, beats: 1 },
        { midi: 59, beats: 0.5 },
        { midi: 60, beats: 0.5 },

        { midi: 62, beats: 0.5 },
        { midi: 64, beats: 0.5 },
        { midi: 62, beats: 0.5 },
        { midi: 59, beats: 0.5 },
        { midi: 62, beats: 1 },
        { midi: 67, beats: 0.5 },
        { midi: 69, beats: 0.5 },

        { midi: 71, beats: 1 },
        { midi: 71, beats: 1 },
        { midi: 71, beats: 0.5 },
        { midi: 69, beats: 0.5 },
        { midi: 67, beats: 0.5 },
        { midi: 69, beats: 0.5 },

        { midi: 71, beats: 1 },
        { midi: 69, beats: 1 },
        { midi: 69, beats: 1 },
        { midi: 71, beats: 0.5 },
        { midi: 69, beats: 0.5 },

        { midi: 67, beats: 0.5 },
        { midi: 66, beats: 0.5 },
        { midi: 67, beats: 0.5 },
        { midi: 69, beats: 0.5 },
        { midi: 67, beats: 1 },
        { midi: 59, beats: 0.5 },
        { midi: 60, beats: 0.5 },

        { midi: 62, beats: 0.5 },
        { midi: 64, beats: 0.5 },
        { midi: 62, beats: 0.5 },
        { midi: 59, beats: 0.5 },
        { midi: 62, beats: 1 },
        { midi: 67, beats: 0.5 },
        { midi: 69, beats: 0.5 },

        { midi: 71, beats: 0.5 },
        { midi: 74, beats: 1 },
        { midi: 76, beats: 0.5 },
        { midi: 74, beats: 0.5 },
        { midi: 71, beats: 0.5 },
        { midi: 67, beats: 0.5 },
        { midi: 69, beats: 0.5 },

        { midi: 71, beats: 1 },
        { midi: 69, beats: 1 },
        { midi: 67, beats: 1 },
        { midi: null, beats: 1 }
      ])
    }),

    // Beethoven, WoO 59: opening A-theme with repeat. Sixteenth-note notation is deliberately spaced as half-beat catches.
    // Original melody reference: https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fmirror%2Fmusicaviva.com%2Ftunes%2Fbeethoven-ludwig-van%2Fbe059%2Fbe059-pno2%2F0000
    Object.freeze({
      id: "furElise",
      label: "Für Elise",
      bpm: 116,
      notes: Object.freeze([
        { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 69, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 60, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 68, beats: 0.5 }, { midi: 71, beats: 0.5 },
        { midi: 72, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 69, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 60, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 71, beats: 0.5 },
        { midi: 69, beats: 1 }, { midi: null, beats: 1 },
        { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 69, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 60, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 68, beats: 0.5 }, { midi: 71, beats: 0.5 },
        { midi: 72, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 75, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 69, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 60, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 1 }, { midi: null, beats: 0.5 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 71, beats: 0.5 },
        { midi: 69, beats: 1 },
      ])
    }),
    // Scott Joplin (1902), first A strain: the recognizable syncopated lead, without copyrighted later harmonizations.
    // Original melody reference: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263
    Object.freeze({
      id: "theEntertainer",
      label: "The Entertainer",
      bpm: 126,
      notes: Object.freeze([
        { midi: 62, beats: 0.5 }, { midi: 63, beats: 0.5 },
        { midi: 64, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 72, beats: 2 }, { midi: 72, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 75, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 1 },
        { midi: 72, beats: 3 }, { midi: 62, beats: 0.5 }, { midi: 63, beats: 0.5 },
        { midi: 64, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 72, beats: 3 }, { midi: 69, beats: 0.5 }, { midi: 67, beats: 0.5 },
        { midi: 66, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 69, beats: 0.5 },
        { midi: 74, beats: 3 }, { midi: 62, beats: 0.5 }, { midi: 63, beats: 0.5 },
        { midi: 64, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 64, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 72, beats: 2 }, { midi: 72, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 75, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 1 },
        { midi: 72, beats: 3 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 1 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 1 }, { midi: 74, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 1 },
        { midi: 72, beats: 4 },
      ])
    }),
    // Traditional song, from 1882 Ryan’s Mammoth Collection, verse strain twice.
    // Original melody reference: https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fmirror%2Fsbigraf.tamu.edu%2FPopGoesTheWeasel%2F0000
    Object.freeze({
      id: "popGoesTheWeasel",
      label: "Pop Goes the Weasel",
      bpm: 126,
      notes: Object.freeze([
        { midi: 67, beats: 1 }, { midi: 67, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 67, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 71, beats: 1.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 67, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 76, beats: 1.5 }, { midi: 69, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 71, beats: 1.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 67, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 67, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 71, beats: 1.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 67, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: null, beats: 0.5 },
        { midi: 76, beats: 1.5 }, { midi: 69, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 71, beats: 1.5 }, { midi: 67, beats: 1.5 },
      ])
    }),
    // Public-domain 19th-century tune “When Johnny Comes Marching Home” (Kerr c.1880), familiar children’s-song verse; no later lyrics.
    // Original melody reference: https://abcnotation.com/tunePage?a=tunearch.org%2Fwiki%2FWhen_Johnny_comes_marching_home.no-ext%2F0001
    Object.freeze({
      id: "theAntsGoMarching",
      label: "The Ants Go Marching",
      bpm: 132,
      notes: Object.freeze([
        { midi: 69, beats: 0.5 },
        { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 71, beats: 0.5 },
        { midi: 72, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 67, beats: 1.5 }, { midi: 67, beats: 1 }, { midi: 64, beats: 0.5 },
        { midi: 67, beats: 1.5 }, { midi: 67, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 71, beats: 0.5 },
        { midi: 72, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 72, beats: 1 }, { midi: 74, beats: 0.5 },
        { midi: 76, beats: 1.5 }, { midi: 76, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 76, beats: 1.5 }, { midi: 76, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 76, beats: 1 }, { midi: 76, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 74, beats: 1 }, { midi: 74, beats: 0.5 }, { midi: 74, beats: 1 }, { midi: 71, beats: 0.5 },
        { midi: 72, beats: 1 }, { midi: 72, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 69, beats: 0.5 },
        { midi: 71, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 76, beats: 1.5 }, { midi: 74, beats: 1.5 },
        { midi: 72, beats: 1.5 }, { midi: 71, beats: 1.5 },
        { midi: 64, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 69, beats: 1 }, { midi: 68, beats: 0.5 },
        { midi: 69, beats: 1.5 },
      ])
    }),
    // Traditional nursery-song melody, one complete verse; only the melody, without recent lyrics or arrangements.
    // Original melody reference: https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fsong%2FItsy_Bitsy_Spider_F%2F0000
    Object.freeze({
      id: "itsyBitsySpider",
      label: "The Itsy Bitsy Spider",
      bpm: 126,
      notes: Object.freeze([
        { midi: 60, beats: 0.5 },
        { midi: 65, beats: 1 }, { midi: 65, beats: 0.5 }, { midi: 65, beats: 1 }, { midi: 67, beats: 0.5 },
        { midi: 69, beats: 1.5 }, { midi: 69, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 65, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 65, beats: 1.5 }, { midi: null, beats: 1 }, { midi: 65, beats: 0.5 },
        { midi: 69, beats: 1.5 }, { midi: 69, beats: 1 }, { midi: 70, beats: 0.5 },
        { midi: 72, beats: 1.5 }, { midi: 72, beats: 1.5 },
        { midi: 70, beats: 1 }, { midi: 69, beats: 0.5 }, { midi: 70, beats: 1 }, { midi: 72, beats: 0.5 },
        { midi: 69, beats: 1.5 }, { midi: null, beats: 1.5 },
        { midi: 65, beats: 1.5 }, { midi: 65, beats: 1 }, { midi: 67, beats: 0.5 },
        { midi: 69, beats: 1.5 }, { midi: 69, beats: 1.5 },
        { midi: 67, beats: 1 }, { midi: 65, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 65, beats: 1.5 }, { midi: 60, beats: 1 }, { midi: 60, beats: 0.5 },
        { midi: 65, beats: 1 }, { midi: 65, beats: 0.5 }, { midi: 65, beats: 1 }, { midi: 67, beats: 0.5 },
        { midi: 69, beats: 1.5 }, { midi: 69, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 67, beats: 1 }, { midi: 65, beats: 0.5 }, { midi: 67, beats: 1 }, { midi: 69, beats: 0.5 },
        { midi: 65, beats: 1.5 },
      ])
    }),
    // Grieg, Peer Gynt, Op. 46 No. 4: opening B-minor theme repeated
    // in a shortened, single-voice gameplay excerpt at an even tempo.
    // Historical piano score (public domain):
    // https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1888
    Object.freeze({
      id: "inTheHallOfTheMountainKing",
      label: "In the Hall of the Mountain King",
      bpm: 122,
      notes: Object.freeze([
        { midi: 71, beats: 0.5 }, { midi: 73, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 78, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 78, beats: 1 }, { midi: 77, beats: 0.5 }, { midi: 73, beats: 0.5 },
        { midi: 77, beats: 1 }, { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 },
        { midi: 77, beats: 1 }, { midi: 71, beats: 0.5 }, { midi: 73, beats: 0.5 },
        { midi: 74, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 78, beats: 0.5 },
        { midi: 74, beats: 0.5 }, { midi: 78, beats: 0.5 }, { midi: 83, beats: 0.5 },
        { midi: 81, beats: 0.5 }, { midi: 78, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 78, beats: 0.5 }, { midi: 81, beats: 2 }, { midi: 71, beats: 0.5 },
        { midi: 73, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 0.5 },
        { midi: 78, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 78, beats: 1 },
        { midi: 77, beats: 0.5 }, { midi: 73, beats: 0.5 }, { midi: 77, beats: 1 },
        { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 }, { midi: 77, beats: 1 },
        { midi: 71, beats: 0.5 }, { midi: 73, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 76, beats: 0.5 }, { midi: 78, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 78, beats: 0.5 }, { midi: 83, beats: 0.5 }, { midi: 81, beats: 0.5 },
        { midi: 78, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 78, beats: 0.5 },
        { midi: 81, beats: 2 }, { midi: 71, beats: 0.5 }, { midi: 73, beats: 0.5 },
        { midi: 74, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 78, beats: 0.5 },
        { midi: 74, beats: 0.5 }, { midi: 78, beats: 1 }, { midi: 77, beats: 0.5 },
        { midi: 73, beats: 0.5 }, { midi: 77, beats: 1 }, { midi: 76, beats: 0.5 },
        { midi: 72, beats: 0.5 }, { midi: 77, beats: 1 }, { midi: 71, beats: 0.5 },
        { midi: 73, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 76, beats: 0.5 },
        { midi: 78, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 78, beats: 0.5 },
        { midi: 83, beats: 0.5 }, { midi: 81, beats: 0.5 }, { midi: 78, beats: 0.5 },
        { midi: 74, beats: 0.5 }, { midi: 78, beats: 0.5 }, { midi: 71, beats: 2 }
      ])
    }),
    // "NEW BRITAIN", the traditional melody sung to Amazing Grace;
    // a single hymn stanza in G. Pitch/rhythm from historical hymn notation.
    // Reference: https://hymnary.org/tune/new_britain
    Object.freeze({
      id: "amazingGrace",
      label: "Amazing Grace",
      bpm: 104,
      notes: Object.freeze([
        { midi: 62, beats: 1 }, { midi: 67, beats: 2 }, { midi: 71, beats: 0.5 },
        { midi: 67, beats: 0.5 }, { midi: 71, beats: 2 }, { midi: 69, beats: 1 },
        { midi: 67, beats: 2 }, { midi: 64, beats: 1 }, { midi: 62, beats: 2 },
        { midi: 62, beats: 1 }, { midi: 67, beats: 2 }, { midi: 71, beats: 0.5 },
        { midi: 67, beats: 0.5 }, { midi: 71, beats: 2 }, { midi: 69, beats: 1 },
        { midi: 74, beats: 4 }, { midi: null, beats: 1 }, { midi: 71, beats: 1 },
        { midi: 74, beats: 1.5 }, { midi: 71, beats: 0.5 }, { midi: 74, beats: 0.5 },
        { midi: 71, beats: 0.5 }, { midi: 67, beats: 2 }, { midi: 62, beats: 1 },
        { midi: 64, beats: 1.5 }, { midi: 67, beats: 0.5 }, { midi: 67, beats: 0.5 },
        { midi: 64, beats: 0.5 }, { midi: 62, beats: 2 }, { midi: 62, beats: 1 },
        { midi: 67, beats: 2 }, { midi: 71, beats: 0.5 }, { midi: 67, beats: 0.5 },
        { midi: 71, beats: 2 }, { midi: 69, beats: 1 }, { midi: 67, beats: 4 }
      ])
    }),
  ]);

  // Only these approved tunes may be chosen in regular Daily Feeding.
  // All FEED_MELODIES entries remain selectable by explicit id in Preview.
  const FEED_MELODY_ROTATION_IDS = Object.freeze([
    "odeToJoy", "turkeyInTheStraw", "furElise", "theEntertainer",
    "popGoesTheWeasel", "theAntsGoMarching", "itsyBitsySpider",
    "inTheHallOfTheMountainKing", "amazingGrace"
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

  function getFeedMelodyById(value) {
    const id = String(value || "").trim();
    return FEED_MELODIES.find(
      (tune) => tune.id === id
    ) || null;
  }

  function selectFeedMelody(
    requestedId,
    random = Math.random
  ) {
    const requested =
      getFeedMelodyById(requestedId);

    if (requested) return requested;

    const rotation = FEED_MELODIES.filter(
      (tune) => FEED_MELODY_ROTATION_IDS.includes(tune.id)
    );
    if (!rotation.length) return null;

    let sample = 0;
    try {
      sample =
        typeof random === "function"
          ? Number(random())
          : 0;
    } catch (err) {
      sample = 0;
    }

    const normalized =
      Number.isFinite(sample)
        ? clamp(sample, 0, 0.999999999)
        : 0;
    const index =
      Math.floor(
        normalized * rotation.length
      );

    return rotation[index] ||
      rotation[0];
  }

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

    const targetSequence =
      MELODY_TARGET_LANE_SEQUENCE
        .map((laneName) =>
          MELODY_LANE_FRACTIONS[laneName]
        );
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

  // Diagnostic events are opt-in. The PWA and Capacitor use the same web path.
  function recordFeedAudioRecovery(type, runtime, details = {}) {
    try {
      window.BibloZooAudioDiagnostics?.record(type, {
        activity: "feeding", mode: runtime?.mode || "unknown", ...details
      });
    } catch (err) { /* Diagnostics must never affect gameplay. */ }
  }

  function feedAudioClockAdvances(context) {
    if (!context || context.state !== "running" || document.hidden)
      return Promise.resolve(false);
    const before = Number(context.currentTime);
    if (!Number.isFinite(before)) return Promise.resolve(false);
    return new Promise(resolve => {
      setTimeout(() => {
        const after = Number(context.currentTime);
        resolve(!document.hidden && context.state === "running" &&
          Number.isFinite(after) && after - before > FEED_AUDIO_CLOCK_MIN_ADVANCE);
      }, FEED_AUDIO_CLOCK_PROBE_MS);
    });
  }

  // A resume request is not proof that Web Audio is usable. Retry only on
  // fresh gestures; automatic, obsolete collision effects never call resume().
  function resumeFeedAudioContext(context) {
    if (!context || context.state === "closed") return Promise.resolve(false);
    if (context.state === "running") return Promise.resolve(true);
    try {
      return Promise.resolve(context.resume?.()).then(
        () => context.state === "running",
        () => false
      );
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  function prepareAudio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (preparedAudioContext && preparedAudioContext.state !== "closed") {
      void resumeFeedAudioContext(preparedAudioContext);
      loadStarBuffer(preparedAudioContext);
      loadChompBuffer(preparedAudioContext);
      return preparedAudioContext;
    }
    try {
      preparedAudioContext = new Ctor();
      void resumeFeedAudioContext(preparedAudioContext);
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
      if (runtime.resizeHandler) {
        window.removeEventListener("resize", runtime.resizeHandler);
        window.removeEventListener("orientationchange", runtime.resizeHandler);
      }
      runtime.resizeObserver?.disconnect();
      runtime.feedResumeGeneration = (runtime.feedResumeGeneration || 0) + 1;
      destroyFeedZooTestHarness(runtime);
      // Destroy animations, timers, input captures and overlay handlers before
      // the Feeding DOM can be replaced by its owning screen.
      runtime.zooEscape?.destroy?.();
      runtime.zooEscape = null;
      runtime.feedFrameGeneration = (runtime.feedFrameGeneration || 0) + 1;
      clearTimeout(runtime.feedStartAudioWatchdog);
      clearTimeout(runtime.feedResumeWatchdog);
      stopFeedingEffects(runtime);
      runtime.gameEl?.classList?.remove?.("is-interruption-paused");
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
      if (runtime.nativePilotCheckbox && runtime.nativePilotChangeHandler) {
        runtime.nativePilotCheckbox.removeEventListener(
          "change", runtime.nativePilotChangeHandler
        );
      }

      if (runtime.resumeButton && runtime.resumeButtonHandler) {
        runtime.resumeButton.removeEventListener("click", runtime.resumeButtonHandler);
      }
      if (runtime.resumeBackButton && runtime.resumeBackHandler) {
        runtime.resumeBackButton.removeEventListener("click", runtime.resumeBackHandler);
      }
      if (runtime.exitButton && runtime.exitHandler) {
        runtime.exitButton.removeEventListener("click", runtime.exitHandler);
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
      runtime.exitHandler = null;
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

    detachMelodyInterruptionHandlers(runtime);
    detachFeedInterruptionHandlers(runtime);

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

  // Shared normalized input: every mode receives a horizontal axis in [-1, 1].
  // Mode controllers remain responsible for how that axis affects gameplay.
  function normalizeFeedAxis(value) {
    return clamp(Number.isFinite(Number(value)) ? Number(value) : 0, -1, 1);
  }

  function pointerFeedAxis(x, width) {
    return normalizeFeedAxis((Number(x) / Math.max(1, width) - 0.5) * 2);
  }

  function feedTiltAngle(event) {
    const orientation = Number(
      window.screen?.orientation?.angle ?? window.orientation ?? 0
    );
    const angle = ((orientation % 360) + 360) % 360;
    const gamma = event?.gamma == null ? NaN : Number(event.gamma);
    const beta = event?.beta == null ? NaN : Number(event.beta);
    // A landscape display changes which physical device axis is horizontal.
    if (angle === 90 && Number.isFinite(beta)) return -beta;
    if (angle === 270 && Number.isFinite(beta)) return beta;
    return Number.isFinite(gamma) ? gamma : null;
  }

  function feedInstructionPrompt(mode, tiltEnabled) {
    // Boolean compatibility is retained for existing callers and validators.
    const control = typeof tiltEnabled === "string"
      ? (tiltEnabled === "tilt" ? "Tilt" : "Drag")
      : (tiltEnabled ? "Tilt or drag" : "Drag");
    switch (mode) {
      case FEED_MODES.LABYRINTH:
        return `${control} to guide snacks through the gaps!`;
      case FEED_MODES.MELODY:
        return `${control} to catch snacks and play the tune!`;
      case FEED_MODES.BOUNCE:
        return `${control} to rebound the white ball; feed your pet the colored snacks!`;
      default:
        return `${control} to steer and catch the snacks!`;
    }
  }

  function render({ session, profilePictureHtml = "" } = {}) {
    const petName = String(session?.petName || "BibloPet").trim() || "BibloPet";
    const isDailyTodoSnack =
      session?.dailyTodoSnack === true && session?.dailyTodoPreview !== true;
    const tiltAvailable =
      session?.rewardTiltEnabled === true &&
      typeof window.DeviceOrientationEvent !== "undefined";
    const mode =
      resolveFeedMode(session?.feedMode);
    const modeConfig =
      getFeedModeConfig(mode);
    // Default-off; never expose an experimental backend in real Daily Feeding.
    const nativePilotPreview =
      session?.dailyTodoPreview === true &&
      mode === FEED_MODES.CLASSIC &&
      window.BibloZooFeedingNativeAudioPilot?.isIOS?.() === true;
    const stageAriaLabel =
      mode === FEED_MODES.LABYRINTH
        ? "Tilt or drag to steer the falling snacks while the BibloPet moves automatically"
        : mode === FEED_MODES.MELODY
          ? `Tilt or drag ${petName} left and right to catch the falling musical snacks`
          : mode === FEED_MODES.BOUNCE
            ? `Tilt or drag the paddle to bounce the white ball while ${petName} catches colored snacks`
            : `Tilt or drag ${petName} left and right to catch the falling food`;
    return `
      <div class="daily-feed-game${isDailyTodoSnack ? " is-daily-todo-snack" : ""}" data-daily-feed-game data-daily-feed-mode="${mode}" data-daily-session-phase="reward_game">
        <button
          class="daily-feed-exit no-zoom"
          type="button"
          data-daily-feed-exit
          aria-label="${isDailyTodoSnack ? "Exit feeding game and return Home" : "Back to Zoo"}"
        >◀</button>
        <div class="daily-feed-score-badge" aria-live="polite" aria-label="Score">
          <span class="daily-feed-score-label">${mode === FEED_MODES.MELODY ? "Caught" : "Score"}</span>
          <strong class="daily-feed-score-value" data-daily-feed-score>${mode === FEED_MODES.MELODY ? "0%" : "0"}</strong>
        </div>
        ${nativePilotPreview
          ? '<div class="daily-feed-native-pilot-badge" data-daily-feed-native-badge role="status" aria-live="polite">Preview audio: Web (default)</div>'
          : ""}
        ${nativePilotPreview
          ? '<div class="daily-feed-native-pilot-phases" data-daily-feed-native-phases aria-label="Read-only native sound startup trace">Native-only diagnostic: select the DEV checkbox</div>'
          : ""}

        <div class="daily-feed-stage" data-daily-feed-stage role="application"
          aria-label="${stageAriaLabel}">
          <canvas class="daily-feed-canvas" data-daily-feed-canvas aria-hidden="true"></canvas>

          <div class="daily-feed-catcher" data-daily-feed-catcher aria-hidden="true">
            <div class="daily-feed-pet-circle" data-daily-feed-pet-circle>
              ${profilePictureHtml}
            </div>

            ${mode === FEED_MODES.BOUNCE
              ? `<div class="daily-feed-paddle" data-daily-feed-paddle></div>`
              : `<img class="daily-feed-shadow" src="${ASSET_BASE}dq_feed_shadow.png" alt="" draggable="false">`}
          </div>

          <div class="daily-feed-score-popups" data-daily-feed-score-popups aria-hidden="true"></div>
        </div>

        <div
          class="daily-feed-start-overlay"
          data-daily-feed-start-overlay
          role="dialog"
          aria-modal="true"
          aria-label="Feeding game instructions"
          ${nativePilotPreview ? "data-no-ui-sound" : ""}
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

            <div class="daily-feed-start-title" data-daily-feed-start-title>
              ${modeConfig.instructions.title}
            </div>

            <div class="daily-feed-start-choice" data-daily-feed-start-choice>
              <div class="daily-feed-control-heading">Choose Controls</div>
              <div class="daily-feed-control-options" role="group" aria-label="Choose one steering control">
                <button class="daily-feed-control-option no-zoom" type="button"
                  data-daily-feed-control="tilt" aria-label="Choose Tilt controls">
                  <img src="${ASSET_BASE}dq_feed_control_tilt.png" alt="">
                  <span>Tilt</span>
                </button>
                <button class="daily-feed-control-option no-zoom" type="button"
                  data-daily-feed-control="drag" aria-label="Choose Drag controls">
                  <img src="${ASSET_BASE}dq_feed_control_drag.png" alt="">
                  <span>Drag</span>
                </button>
              </div>
              <p class="daily-feed-control-message" data-daily-feed-control-message
                role="status" aria-live="polite" hidden></p>
            </div>
            <div class="daily-feed-start-confirm" data-daily-feed-start-confirm hidden>
              <div class="daily-feed-selected-control-tile" aria-hidden="true">
                <img class="daily-feed-selected-control-icon"
                  data-daily-feed-selected-icon alt="" hidden>
              </div>
              <div class="daily-feed-start-instruction" data-daily-feed-start-instruction>
                ${feedInstructionPrompt(mode, tiltAvailable)}
              </div>
              ${nativePilotPreview ? `
                <label class="daily-feed-native-pilot-opt"
                  data-daily-feed-native-pilot-opt data-no-ui-sound>
                  <input type="checkbox" data-daily-feed-native-opt-in>
                  <span>DEV: Native ONLY (no Web fallback; star + chomp)</span>
                </label>
                <p class="daily-feed-native-pilot-status" data-daily-feed-native-choice-status
                  role="status" aria-live="polite">Web effects are the default.</p>
              ` : ""}
              <button class="daily-feed-control-got-it no-zoom" type="button"
                data-daily-feed-confirm-button>Got It!</button>
            </div>
          </div>
        </div>

        <div
          class="daily-feed-resume-overlay"
          data-daily-feed-resume-overlay
          role="dialog"
          aria-modal="true"
          aria-label="Feeding game paused"
          hidden
        >
          <button
            class="daily-feed-resume-back no-zoom"
            type="button"
            data-daily-feed-resume-back
            aria-label="${isDailyTodoSnack ? "Back Home" : "Back to Zoo"}"
          >◀</button>
          <div class="daily-feed-resume-content bz-welcome-card" data-welcome-back-card>
            <div class="bz-welcome-avatar" aria-hidden="true">
              <span class="bz-welcome-avatar-fallback" data-welcome-back-picture-fallback>🐾</span>
              <img class="bz-welcome-avatar-image" data-welcome-back-picture
                   alt="" draggable="false" hidden>
            </div>
            <h2 class="bz-welcome-title">Welcome back,<span class="bz-welcome-name-line"
                data-welcome-back-name-line><span class="bz-welcome-name"
                data-welcome-back-name>Zookeeper</span><span class="bz-welcome-punctuation">!</span></span></h2>
            <button class="daily-feed-resume-button bz-welcome-action no-zoom"
              type="button" data-welcome-back-action data-daily-feed-resume>Let's go!</button>
            <p class="daily-feed-resume-status bz-welcome-status"
               data-welcome-back-status data-daily-feed-resume-status
               role="status" aria-live="polite" hidden></p>
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
              ${mode === FEED_MODES.MELODY ? "Snacks Caught: 0%" : "Score: 0"}
            </div>
            <div class="daily-feed-result-catches" data-daily-feed-result-catches
              ${mode === FEED_MODES.MELODY ? "hidden" : ""}>
              Caught 0 of 7 snacks
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
  }

  function readNormalizedTilt(runtime, event, smoothing = 0.15) {
    if (!runtime?.tiltEnabled || runtime.dragging || activeRuntime !== runtime) {
      return null;
    }
    const angle = feedTiltAngle(event);
    if (angle === null) return null;
    runtime.tiltObserved = true;
    const now = performance.now();
    if (now < runtime.tiltCalibrationUntil) {
      runtime.tiltSamples.push(angle);
      if (runtime.tiltSamples.length > 24) runtime.tiltSamples.shift();
      return null;
    }
    if (!Number.isFinite(runtime.neutralGamma)) {
      const samples = runtime.tiltSamples.length ? runtime.tiltSamples : [angle];
      runtime.neutralGamma = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      runtime.tiltSamples = [];
      runtime.smoothedTilt = 0;
    }
    const relative = clamp(angle - runtime.neutralGamma, -25, 25);
    runtime.smoothedTilt = runtime.smoothedTilt * (1 - smoothing) + relative * smoothing;
    return normalizeFeedAxis(runtime.smoothedTilt / 25);
  }

  function handleTilt(runtime, event) {
    const axis = readNormalizedTilt(runtime, event);
    if (axis === null) return;
    const targetX = runtime.width / 2 + axis * Math.max(0, runtime.width / 2 - runtime.petRadius);
    if (runtime.mode === FEED_MODES.BOUNCE) setBouncePaddleX(runtime, targetX);
    else setCatcherX(runtime, targetX);
  }

  function trackFeedingEffect(runtime, source) {
    if (!runtime || !source) return;
    if (!runtime.feedSoundNodes) runtime.feedSoundNodes = new Set();
    runtime.feedSoundNodes.add(source);
    const finish = () => runtime.feedSoundNodes?.delete(source);
    try { source.addEventListener?.("ended", finish, { once: true }); }
    catch (err) { /* Some audio-node stubs do not support listeners. */ }
  }

  function stopFeedingEffects(runtime) {
    for (const source of runtime?.feedSoundNodes || []) {
      try { source.stop?.(); } catch (err) { /* Already ended. */ }
      try { source.disconnect?.(); } catch (err) { }
    }
    runtime?.feedSoundNodes?.clear();
    for (const audio of [runtime?.starAudio, runtime?.chompAudio]) {
      if (!audio) continue;
      try { audio.pause(); audio.currentTime = 0; } catch (err) { }
    }
    runtime?.nativePilot?.stop?.();
  }

  // Silent-first Zoo Escape effects: no new context, no resume(), no promise
  // that audio is audible. A passively advancing clock is a prerequisite.
  function zooEscapeSoundReady(runtime) {
    const context = runtime?.audioContext;
    if (!runtime || activeRuntime !== runtime || !context ||
        context.state !== "running" || document.hidden || runtime.feedPageHidden ||
        runtime.feedPausedAt == null) return false;
    const wall = performance.now();
    const audio = Number(context.currentTime);
    if (!Number.isFinite(audio)) return false;
    const previous = runtime.zooSoundClockSample;
    if (!previous || wall < previous.wall || wall - previous.wall > 1500) {
      runtime.zooSoundClockSample = { wall, audio };
      return false;
    }
    if (wall - previous.wall < 65) return false;
    runtime.zooSoundClockSample = { wall, audio };
    return audio - previous.audio > 0.03;
  }

  function playZooEscapeSound(runtime, kind) {
    // Bouncing ten pets could otherwise create dozens of simultaneous notes.
    const now = performance.now();
    const minGap = kind === "bounce" ? 180 : 85;
    if (now - (runtime.zooSoundLastAt || -Infinity) < minGap) return;
    runtime.zooSoundLastAt = now;
    // Reuse a bounded, tracked Feeding note; the effects are optional.
    playPegTone(runtime, now);
  }

  function playPegTone(runtime, now) {
    // Native-only Classic does not emit a Web oscillator, even while paused.
    // Peg tones have not yet been migrated and are intentionally silent.
    if (runtime.nativePilotBackend === "native" &&
        runtime.mode === FEED_MODES.CLASSIC) return;
    const context = runtime.audioContext;
    if (!context || context.state !== "running" || now - runtime.lastPegSoundAt < 55) return;

    let noteIndex = Math.floor(Math.random() * PEG_NOTE_FREQUENCIES.length);
    if (noteIndex === runtime.lastPegNoteIndex) {
      noteIndex = (noteIndex + 1 + Math.floor(Math.random() * (PEG_NOTE_FREQUENCIES.length - 1))) % PEG_NOTE_FREQUENCIES.length;
    }
    runtime.lastPegNoteIndex = noteIndex;
    runtime.lastPegSoundAt = now;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(PEG_NOTE_FREQUENCIES[noteIndex], startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, feedingSoundVolume(FEED_COLLISION_TONE_VOLUME)),
        startAt + 0.008
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      trackFeedingEffect(runtime, oscillator);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.105);
    } catch (err) { }
  }

  function playStarSound(runtime) {
    if (runtime.nativePilotBackend === "native") {
      // The backend was fixed before this round. Never double-play the star.
      runtime.nativePilot?.play("feed-star", feedingSoundVolume(0.78));
      return;
    }
    const context = runtime.audioContext;

    if (
      context &&
      context.state !== "closed"
    ) {
      // Keep earned rewards, but never queue a chomp/star to play after unlock.
      if (context.state !== "running") return;
      try {
        if (preparedStarBuffer) {
          const source =
            context.createBufferSource();

          const gain =
            context.createGain();

          source.buffer =
            preparedStarBuffer;

          gain.gain.setValueAtTime(
            feedingSoundVolume(0.78),
            context.currentTime
          );

          source.connect(gain);
          gain.connect(
            context.destination
          );

          trackFeedingEffect(runtime, source);
          source.start();
          if (runtime.mode === FEED_MODES.BOUNCE &&
              activeRuntime === runtime && runtime.feedPausedAt == null) {
            recordFeedAudioRecovery("feed-bounce-bonus-sound-start", runtime,
              { contextState: context.state });
            // Passive clock probe ONLY: do not activate audio or infer that
            // source.start() proves audible output. If this clock really
            // stalls during a bonus, freeze gameplay and offer Zoo Escape.
            void feedAudioClockAdvances(context).then(advanced => {
              if (activeRuntime !== runtime || runtime.finished ||
                  !runtime.running || runtime.feedPausedAt != null) return;
              recordFeedAudioRecovery("feed-bounce-bonus-clock-check", runtime,
                { clockAdvanced: advanced });
              if (!advanced) pauseFeedingGame(runtime);
            });
          }
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
    if (runtime.nativePilotBackend === "native") {
      // A rejected native call never triggers an in-round web fallback.
      runtime.nativePilot?.play("feed-chomp", feedingSoundVolume(0.85));
      return;
    }
    const context = runtime.audioContext;

    if (context && context.state !== "closed") {
      if (context.state !== "running") return;
      if (preparedChompBuffer) {
        try {
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = preparedChompBuffer;
          gain.gain.setValueAtTime(feedingSoundVolume(0.85), context.currentTime);
          source.connect(gain);
          gain.connect(context.destination);
          trackFeedingEffect(runtime, source);
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
    if (runtime.reducedMotion) return;
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
    popup.style.left = `${
      runtime.mode === FEED_MODES.BOUNCE
        ? runtime.bounce.paddleX
        : runtime.catcherX
    }px`;
    popup.style.top = `${runtime.petCenterY - runtime.petRadius * 0.65}px`;
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
    runtime.scorePopupsEl.appendChild(popup);
    if (runtime.reducedMotion) setTimeout(() => popup.remove(), 850);
  }

  function pulseFeedPet(runtime) {
    if (!runtime?.catcher) return;
    runtime.catcher.classList.remove("is-catching");
    void runtime.catcher.offsetWidth;
    runtime.catcher.classList.add("is-catching");
  }

  function catchBall(runtime, ball) {
    runtime.score += ball.points;
    runtime.caughtCount += 1;
    updateScoreBadge(runtime);
    showCatchScore(runtime, ball);
    playChompSound(runtime);
    pulseFeedPet(runtime);
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
    if (runtime.reducedMotion) return;
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
    if (!runtime.reducedMotion) {
      for (const burst of runtime.bursts) drawBurst(runtime, burst, now);
    }
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

  function getLabyrinthBallRadius(runtime) {
    return runtime.pegRadius * 0.66 * LABYRINTH_BALL_SIZE_MULTIPLIER;
  }

  // Exactly the onscreen diameter of the star artwork inside Bounce's gray
  // brick (not the invisible collision circle around a regular peg).
  function getFeedStarPegDiameter(runtime) {
    const brick = bounceBrickGeometry(runtime.width, runtime.height, 0, 0);
    return Math.min(brick.height * 0.87, brick.width * 0.64);
  }

  function initializeLabyrinthMode(runtime) {
    const ballRadius = getLabyrinthBallRadius(runtime);
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
        runtime.height * LABYRINTH_GRAVITY_SCALE,
      maxVerticalSpeed:
        runtime.height * LABYRINTH_MAX_VERTICAL_SPEED_SCALE,
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

    const radius = getLabyrinthBallRadius(runtime);
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
      accelerationFactor: LABYRINTH_ACCELERATION_FACTORS[
        spawnIndex % LABYRINTH_ACCELERATION_FACTORS.length
      ],
      lastPlatformSoundAt: -Infinity,
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
      (ball.accelerationFactor ?? 1) *
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
    const impactSpeed = Math.max(0, ball.vy);
    const hitPlatform = collideLabyrinthBallWithPlatforms(
      runtime,
      ball,
      previousY
    );
    // A real downward landing sounds like the existing peg notes; sliding or
    // resting contacts do not retrigger on every 120Hz physics step.
    if (hitPlatform && impactSpeed > Math.max(runtime.height * 0.06, ball.radius * 3.5) &&
        now - (ball.lastPlatformSoundAt ?? -Infinity) >= LABYRINTH_IMPACT_SOUND_GAP_MS) {
      ball.lastPlatformSoundAt = now;
      playPegTone(runtime, now);
    }
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

  function handleLabyrinthTilt(runtime, event) {
    if (!runtime?.labyrinth) return;
    const axis = readNormalizedTilt(runtime, event, 0.28);
    if (axis !== null) runtime.labyrinth.steering = axis;
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
      const axis = input.axis === undefined
        ? pointerFeedAxis(input.x, runtime.width)
        : normalizeFeedAxis(input.axis);
      runtime.labyrinth.steering = normalizeFeedAxis(axis / 0.72);
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

    if (context.state !== "running") return false;

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
        Math.max(0.0001, feedingSoundVolume(MELODY_TONE_VOLUME)),
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
    const tune =
      selectFeedMelody(
        runtime.dailyTodoPreview ? runtime.requestedMelodyId : ""
      );
    const bpm =
      Math.max(
        1,
        Number(tune?.bpm) || MELODY_BPM
      );
    const timeline =
      createMelodyTimeline(
        tune?.notes,
        runtime.width,
        {
          bpm,
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
      tuneLabel:
        String(tune?.label || "").trim(),
      bpm,
      beatMs: 60000 / bpm,
      travelMs: MELODY_TRAVEL_MS,
      timeline,
      startTime: null,
      lastUpdateAt: 0,
      pausedAt: null,
      classifiedCount: 0,
      activeVoices: new Set()
    };

    if (runtime.scoreEl) {
      runtime.scoreEl.textContent = "0%";
    }
  }

  // Keep Melody's musical clock frozen while the app is backgrounded.
  // The other modes retain their existing frame-time-based behavior.
  function pauseMelodyForInterruption(runtime, now = performance.now()) {
    const state = runtime?.melody;
    if (
      !state ||
      activeRuntime !== runtime ||
      runtime.mode !== FEED_MODES.MELODY ||
      !runtime.roundStarted ||
      !runtime.running ||
      runtime.finished ||
      state.pausedAt !== null
    ) {
      return false;
    }

    state.pausedAt = now;
    stopMelodyVoices(runtime);
    if (runtime.rafId) {
      cancelAnimationFrame(runtime.rafId);
      runtime.rafId = 0;
    }
    return true;
  }

  function resumeMelodyAfterInterruption(runtime, now = performance.now()) {
    const state = runtime?.melody;
    if (
      !state ||
      activeRuntime !== runtime ||
      runtime.finished ||
      !runtime.running ||
      state.pausedAt === null ||
      runtime.melodyPageHidden ||
      (typeof document !== "undefined" && document.hidden)
    ) {
      return false;
    }

    const pauseDuration = Math.max(0, now - state.pausedAt);
    state.pausedAt = null;
    if (Number.isFinite(state.startTime)) {
      state.startTime += pauseDuration;
    }
    if (runtime.finishAt > 0) {
      runtime.finishAt += pauseDuration;
    }
    state.lastUpdateAt = now;
    runtime.lastFrameAt = now;
    if (!runtime.rafId) {
      runtime.rafId = scheduleFeedFrame(runtime);
    }
    return true;
  }

  function attachMelodyInterruptionHandlers(runtime) {
    if (runtime?.mode !== FEED_MODES.MELODY) return;

    runtime.melodyVisibilityHandler = () => {
      if (document.hidden) {
        pauseMelodyForInterruption(runtime);
      } else {
        resumeMelodyAfterInterruption(runtime);
      }
    };
    runtime.melodyPageHideHandler = () => {
      runtime.melodyPageHidden = true;
      pauseMelodyForInterruption(runtime);
    };
    runtime.melodyPageShowHandler = () => {
      runtime.melodyPageHidden = false;
      resumeMelodyAfterInterruption(runtime);
    };

    document.addEventListener("visibilitychange", runtime.melodyVisibilityHandler);
    window.addEventListener("pagehide", runtime.melodyPageHideHandler);
    window.addEventListener("pageshow", runtime.melodyPageShowHandler);
  }

  function detachMelodyInterruptionHandlers(runtime) {
    if (!runtime) return;
    if (runtime.melodyVisibilityHandler) {
      document.removeEventListener("visibilitychange", runtime.melodyVisibilityHandler);
      runtime.melodyVisibilityHandler = null;
    }
    if (runtime.melodyPageHideHandler) {
      window.removeEventListener("pagehide", runtime.melodyPageHideHandler);
      runtime.melodyPageHideHandler = null;
    }
    if (runtime.melodyPageShowHandler) {
      window.removeEventListener("pageshow", runtime.melodyPageShowHandler);
      runtime.melodyPageShowHandler = null;
    }
  }

  // Patch 21A: the four Feeding modes share one intentional interruption
  // pause. Keep the existing mode state and advance its deadlines by precisely
  // the real time spent away instead of simulating missed gameplay frames.
  function shiftFeedingDeadlines(runtime, durationMs) {
    const shift = (owner, key) => {
      if (owner && Number.isFinite(owner[key]) && owner[key] > 0) {
        owner[key] += durationMs;
      }
    };
    shift(runtime, "nextScheduledAt");
    shift(runtime, "introUnlockAt");
    shift(runtime, "tiltCalibrationUntil");
    shift(runtime, "lastPegSoundAt");
    // Melody's existing precise musical-clock recovery owns finishAt.
    if (runtime.mode !== FEED_MODES.MELODY) shift(runtime, "finishAt");
    for (const ball of runtime.balls || []) {
      shift(ball, "bornAt");
      shift(ball, "labyrinthProgressAt");
      shift(ball, "lastTrailAt");
      for (const point of ball.trail || []) shift(point, "bornAt");
    }
    for (const burst of runtime.bursts || []) shift(burst, "startedAt");
  }

  function armTiltObservationFallback(runtime) {
    if (!runtime?.tiltEnabled || runtime.tiltObserved || runtime.tiltFallbackId) return;
    const timer = setTimeout(() => {
      runtime.modeTimers?.delete(timer);
      if (runtime.tiltFallbackId === timer) runtime.tiltFallbackId = null;
      if (activeRuntime !== runtime || !runtime.running ||
          runtime.feedPausedAt != null || runtime.tiltObserved) return;
      runtime.tiltEnabled = false;
      window.removeEventListener("deviceorientation", runtime.orientationHandler);
      // Never silently change a locked Tilt session into Drag. Suspend the
      // round at its exact progress and offer a deliberate alternative.
      runtime.controlStoppedAt = performance.now();
      if (runtime.startTitleEl) runtime.startTitleEl.textContent = runtime.modeConfig.instructions.title;
      runtime.controlMode = null;
      runtime.running = false;
      if (runtime.rafId) cancelAnimationFrame(runtime.rafId);
      runtime.rafId = 0;
      showFeedingControlChoice(runtime,
        "Tilt isn't responding. Choose Drag to keep playing.");
    }, 2000);
    runtime.tiltFallbackId = timer;
    runtime.modeTimers?.add(timer);
  }

  function setFeedingResumeStatus(runtime, message = "") {
    // The opt-in Zoo Escape owns its own stage/action labels. Do not let the
    // old retry status turn LOCK GATE back into a generic Try again button.
    if (runtime.zooEscape?.isPaused?.()) {
      if (runtime.resumeStatus) runtime.resumeStatus.hidden = true;
      return;
    }
    if (runtime.resumeStatus) {
      runtime.resumeStatus.textContent = message;
      runtime.resumeStatus.hidden = !message;
    }
    window.BibloZooWelcomeBack?.setAction?.(runtime.resumeOverlay, { retry: !!message, busy: !!runtime.feedResumePending });
    if (!window.BibloZooWelcomeBack && runtime.resumeButton) runtime.resumeButton.textContent = message ? "Try again!" : "Let's go!";
  }

  // Developer-only manual test. Simulated outcomes replace ONLY the Feeding
  // recovery result at the shared-controller boundary; no AudioContext or
  // AVAudioSession manipulation takes place in this code path.
  // The same real UI, rescue hit detection, timers, and navigation are used.
  function getFeedZooTestResult(runtime) {
    const test = runtime?.zooDevScenario;
    if (!test || !Array.isArray(test.results)) return null;
    const index = test.index++;
    const wantsSuccess = test.results[index] === true;
    recordFeedAudioRecovery("feed-zoo-test-simulated-result", runtime,
      { scenario: test.id, attempt: index + 1, simulatedSuccess: wantsSuccess });
    if (!wantsSuccess) return false;
    // Resume the *actual* frozen game loop without claiming the audio probe
    // succeeded. The normal sound engine is not reset or reactivated here.
    // In a genuine audio failure, a non-running context is still rejected.
    const continued = continueFeedingAfterGesture(runtime,
      performance.now(), true);
    if (!continued) {
      recordFeedAudioRecovery("feed-zoo-test-resume-blocked", runtime,
        { scenario: test.id });
    }
    return continued;
  }

  function destroyFeedZooTestHarness(runtime) {
    if (!runtime) return;
    runtime.zooDevTeardown?.();
    runtime.zooDevTeardown = null;
    runtime.zooDevScenario = null;
  }

  function attachFeedZooTestHarness(runtime) {
    if (!ENABLE_FEED_ZOO_ESCAPE_TEST_HARNESS ||
        !runtime?.zooEscape || !runtime.gameEl) return;
    const badge = runtime.gameEl.querySelector(".daily-feed-score-badge");
    if (!badge) return;
    badge.classList.add("bz-zoo-test-arm");
    // A menu is created only after the deliberate, stationary long press.
    let hold = 0;
    let tracking = null;
    let panel = null;
    const cancelHold = () => {
      if (hold) clearTimeout(hold);
      hold = 0;
      tracking = null;
    };
    const removeMenu = () => {
      panel?.remove();
      panel = null;
    };
    const isActive = () => activeRuntime === runtime &&
      runtime.running && runtime.roundStarted && !runtime.finished &&
      runtime.feedPausedAt == null && !runtime.feedPageHidden &&
      !document.hidden;
    const choose = (id, results) => {
      if (!panel || activeRuntime !== runtime ||
          runtime.feedPausedAt == null || !runtime.zooEscape?.isPaused?.()) return;
      runtime.zooDevScenario = { id, results, index: 0 };
      runtime.zooDevTestEverActivated = true;
      removeMenu();
      recordFeedAudioRecovery("feed-zoo-test-selected", runtime, { scenario: id });
      runtime.resumeButton?.focus?.({ preventScroll: true });
    };
    const showMenu = () => {
      hold = 0;
      tracking = null;
      if (!isActive() || panel) return;
      // Freeze gameplay before the selector appears. Its cancel button
      // leaves the normal Welcome Back gesture intact.
      if (!pauseFeedingGame(runtime)) return;
      const doc = runtime.gameEl.ownerDocument || document;
      panel = doc.createElement("div");
      panel.className = "bz-zoo-test-menu";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Zoo Escape developer test scenarios");
      const card = doc.createElement("div");
      card.className = "bz-zoo-test-card";
      const heading = doc.createElement("h2");
      heading.textContent = "Zoo Escape TEST MODE";
      card.appendChild(heading);
      const explain = doc.createElement("p");
      explain.textContent = "Simulates recovery outcomes, not iOS audio. No daily reward credit.";
      card.appendChild(explain);
      const scenarios = [
        ["Stage 2 → Success", "stage2-success", [false, true]],
        ["Stage 3 → Success", "stage3-success", [false, false, true]],
        ["Stage 3 → Zoo Exit", "stage3-exit", [false, false, false]],
        ["Early Exit (Stage 2)", "early-stage2", [false, false, false]],
        ["Early Exit (Stage 3)", "early-stage3", [false, false, false]]
      ];
      for (const [label, id, results] of scenarios) {
        const button = doc.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", () => choose(id, results));
        card.appendChild(button);
      }
      const cancel = doc.createElement("button");
      cancel.type = "button";
      cancel.className = "bz-zoo-test-cancel";
      cancel.textContent = "Cancel test / normal resume";
      cancel.addEventListener("click", removeMenu);
      card.appendChild(cancel);
      panel.appendChild(card);
      runtime.gameEl.appendChild(panel);
      panel.querySelector("button")?.focus?.({ preventScroll: true });
    };
    const pointerDown = e => {
      if (!isActive() || panel || (e.button != null && e.button !== 0)) return;
      cancelHold();
      tracking = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      hold = setTimeout(showMenu, FEED_ZOO_TEST_HOLD_MS);
    };
    const pointerMove = e => {
      if (tracking && tracking.pointerId === e.pointerId &&
          Math.hypot(e.clientX - tracking.x, e.clientY - tracking.y) > 14) {
        cancelHold();
      }
    };
    const pointerEnd = () => cancelHold();
    const visibility = () => { if (document.hidden) { cancelHold(); removeMenu(); } };
    badge.addEventListener("pointerdown", pointerDown);
    badge.addEventListener("pointermove", pointerMove);
    badge.addEventListener("pointerup", pointerEnd);
    badge.addEventListener("pointercancel", pointerEnd);
    badge.addEventListener("contextmenu", preventFeedTestContextMenu);
    document.addEventListener("visibilitychange", visibility);
    runtime.zooDevTeardown = () => {
      cancelHold();
      removeMenu();
      badge.removeEventListener("pointerdown", pointerDown);
      badge.removeEventListener("pointermove", pointerMove);
      badge.removeEventListener("pointerup", pointerEnd);
      badge.removeEventListener("pointercancel", pointerEnd);
      badge.removeEventListener("contextmenu", preventFeedTestContextMenu);
      document.removeEventListener("visibilitychange", visibility);
      badge.classList.remove("bz-zoo-test-arm");
    };
  }

  function preventFeedTestContextMenu(event) { event.preventDefault(); }

  function pauseFeedingGame(runtime, now = performance.now()) {
    if (!runtime || activeRuntime !== runtime || !runtime.roundStarted ||
        !runtime.running || runtime.finished || runtime.feedPausedAt != null) return false;
    runtime.feedPausedAt = now;
    runtime.feedResumeGeneration = (runtime.feedResumeGeneration || 0) + 1;
    runtime.feedFrameGeneration = (runtime.feedFrameGeneration || 0) + 1;
    clearTimeout(runtime.feedStartAudioWatchdog);
    runtime.feedStartAudioWatchdog = null;
    runtime.feedResumePending = false;
    // A paused round is never declared recovered until a gesture-driven
    // clock probe succeeds. Preserve this marker across unrelated redraws.
    runtime.feedAudioRecoveryVerified = false;
    runtime.zooSoundClockSample = null;
    if (runtime.mode === FEED_MODES.MELODY) {
      pauseMelodyForInterruption(runtime, now);
    }
    if (runtime.rafId) {
      cancelAnimationFrame(runtime.rafId);
      runtime.rafId = 0;
    }
    if (runtime.tiltFallbackId) {
      clearTimeout(runtime.tiltFallbackId);
      runtime.modeTimers?.delete(runtime.tiltFallbackId);
      runtime.tiltFallbackId = null;
    }
    if (runtime.activePointerId != null) {
      try { runtime.stage?.releasePointerCapture?.(runtime.activePointerId); }
      catch (err) { }
    }
    runtime.dragging = false;
    runtime.activePointerId = null;
    // A pointerup may never arrive once the app is hidden. Drop stale
    // Labyrinth steering rather than moving the ball after the next Resume.
    runtime.modeController?.handleInput?.(runtime, { type: "pointerend" });
    stopFeedingEffects(runtime);
    runtime.gameEl?.classList?.add?.("is-interruption-paused");
    if (runtime.resumeOverlay) {
      window.BibloZooWelcomeBack?.populate?.(runtime.resumeOverlay, { name: runtime.zookeeperName });
      runtime.resumeOverlay.hidden = false;
    }
    if (runtime.resumeButton) runtime.resumeButton.disabled = false;
    setFeedingResumeStatus(runtime);
    // Native-only tests pause with explicit Resume/Back, not Zoo Escape
    // as an audio-repair minigame. All non-native paths retain that feature.
    if (runtime.nativePilotBackend !== "native") runtime.zooEscape?.start?.();
    return true;
  }

  function continueFeedingAfterGesture(runtime, now = performance.now(), keepOverlay = false) {
    if (!runtime || activeRuntime !== runtime || !runtime.running ||
        runtime.finished || runtime.feedPausedAt == null ||
        runtime.feedPageHidden || document.hidden ||
        (runtime.nativePilotBackend === "native" &&
          runtime.nativePilot?.isReady?.() !== true) ||
        (runtime.nativePilotBackend !== "native" &&
          runtime.audioContext && runtime.audioContext.state !== "running")) return false;
    const elapsed = Math.max(0, now - runtime.feedPausedAt);
    // Shift time-dependent effects, including Classic's 22s expiry and
    // Labyrinth's stuck-ball timer. Never touch positions or rewards.
    shiftFeedingDeadlines(runtime, elapsed);
    runtime.feedFrameGeneration = (runtime.feedFrameGeneration || 0) + 1;
    if (runtime.mode === FEED_MODES.MELODY) {
      if (!resumeMelodyAfterInterruption(runtime, now)) return false;
    } else {
      runtime.lastFrameAt = now;
      if (!runtime.rafId) runtime.rafId = scheduleFeedFrame(runtime);
    }
    runtime.feedPausedAt = null;
    runtime.feedResumePending = false;
    runtime.gameEl?.classList?.remove?.("is-interruption-paused");
    // The shared controller dismisses its own overlay only AFTER its
    // promise resolves to a verified success, not during the audio probe.
    if (!keepOverlay && runtime.resumeOverlay) runtime.resumeOverlay.hidden = true;
    if (!keepOverlay) {
      if (runtime.resumeButton) runtime.resumeButton.disabled = false;
      setFeedingResumeStatus(runtime);
    }
    if (runtime.tiltEnabled) {
      // Keep the child's original neutral angle. Returning while the phone
      // is tilted must not redefine what "center" means. A fresh sensor
      // event still confirms that motion controls are available after unlock.
      runtime.tiltObserved = false;
      armTiltObservationFallback(runtime);
    }
    return true;
  }

  // Called by a real click, never automatically on pageshow. Do not queue
  // stale effects; the same button remains usable if iOS rejects resume().
  function attemptFeedingResumeFromGesture(runtime, onSettled) {
    // onSettled is optional: legacy callers still get the old return boolean;
    // Zoo Escape gets a definitive, clock-verified completion notification.
    const report = (ok) => {
      try { onSettled?.(ok === true); } catch (_) { /* caller owns UI */ }
    };
    if (!runtime || activeRuntime !== runtime || runtime.finished ||
        runtime.feedPausedAt == null || runtime.feedPageHidden ||
        document.hidden || runtime.feedResumePending) {
      report(false);
      return false;
    }
    if (runtime.nativePilotBackend === "native") {
      // No Web clock, no Web AudioRecoveryCoordinator and no audio-driven
      // Zoo Escape in the opt-in Native-only preview. A fresh Resume gesture
      // must re-prepare the two native samples before unfreezing this round.
      runtime.feedResumePending = true;
      setFeedingResumeStatus(runtime,
        "Preparing native sounds… This preview has no Web fallback.");
      if (runtime.resumeButton) runtime.resumeButton.disabled = true;
      const generation = ++runtime.feedResumeGeneration;
      let settled = false;
      const finish = (ready, reason) => {
        if (settled) return;
        settled = true;
        clearTimeout(runtime.feedResumeWatchdog);
        runtime.feedResumeWatchdog = null;
        if (activeRuntime !== runtime ||
            runtime.feedResumeGeneration !== generation ||
            runtime.feedPausedAt == null || runtime.finished ||
            document.hidden || runtime.feedPageHidden) {
          report(false);
          return;
        }
        runtime.feedResumePending = false;
        if (runtime.resumeButton) runtime.resumeButton.disabled = false;
        if (!ready) {
          // No silent backend change. Keep the same frozen round with
          // explicit retry/Back; never award progress for an audio failure.
          const detail = typeof reason === "string" &&
            /^[a-z][a-z0-9-]{0,55}$/.test(reason) ? reason : "bridge-error";
          setFeedingResumeStatus(runtime,
            "Native sounds unavailable (" + detail + "). Tap Resume again or Back.");
          report(false);
          return;
        }
        runtime.feedAudioRecoveryVerified = true;
        const resumed = continueFeedingAfterGesture(runtime, performance.now(), false);
        report(resumed);
      };
      runtime.feedResumeWatchdog = setTimeout(
        () => finish(false, "native-resume-timeout"), 4200);
      try {
        void Promise.resolve(runtime.nativePilot?.prepare?.() ||
          { ready: false, reason: "missing-bridge" }).then(
          value => finish(value?.ready === true, value?.reason),
          () => finish(false, "native-prepare-error")
        );
      } catch (_) { finish(false, "native-prepare-error"); }
      return true;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    const needsReplacement = runtime.feedAudioNeedsFreshContext ||
      !runtime.audioContext || runtime.audioContext.state === "closed";
    if (needsReplacement && Ctor) {
      const now = performance.now();
      const sinceReplacement = now - runtime.feedAudioLastReplacementAt;
      if (runtime.feedAudioReplacements > 0 &&
          sinceReplacement < FEED_AUDIO_REPLACEMENT_COOLDOWN_MS) {
        recordFeedAudioRecovery("feed-audio-retry-delayed", runtime);
        setFeedingResumeStatus(runtime, "Sound needs a moment. Please try again.");
        report(false);
        return false;
      }
      const burstExhausted = runtime.feedAudioReplacements >= FEED_AUDIO_REPLACEMENT_BURST_LIMIT &&
        sinceReplacement < FEED_AUDIO_REPLACEMENT_BACKOFF_MS;
      if (burstExhausted && runtime.audioContext && runtime.audioContext.state !== "closed") {
        // A fresh user tap can still test the old context's clock. iOS may
        // revive it without needing yet another AudioContext allocation.
        recordFeedAudioRecovery("feed-audio-replacement-deferred", runtime);
      } else {
        if (runtime.feedAudioReplacements >= FEED_AUDIO_REPLACEMENT_BURST_LIMIT &&
            sinceReplacement >= FEED_AUDIO_REPLACEMENT_BACKOFF_MS) {
          runtime.feedAudioReplacements = 0;
        }
        try {
          // Construct and resume the new context within this same real tap.
          const fresh = new Ctor();
          stopFeedingEffects(runtime);
          stopMelodyVoices(runtime);
          const old = runtime.audioContext;
          runtime.audioContext = fresh;
          runtime.feedAudioNeedsFreshContext = false;
          runtime.feedAudioReplacements = (runtime.feedAudioReplacements || 0) + 1;
          runtime.feedAudioLastReplacementAt = now;
          stopAudioContext(old);
          void loadStarBuffer(fresh);
          void loadChompBuffer(fresh);
          recordFeedAudioRecovery("feed-audio-context-replaced", runtime,
            { replacements: runtime.feedAudioReplacements });
        } catch (err) {
          recordFeedAudioRecovery("feed-audio-context-create-failed", runtime);
          setFeedingResumeStatus(runtime, "Sound isn't ready. Please try again, or go back.");
          report(false);
          return false;
        }
      }
    }
    runtime.feedResumePending = true;
    // Share the same spinning zookeeper feedback while Feeding verifies sound.
    setFeedingResumeStatus(runtime);
    if (runtime.resumeButton) runtime.resumeButton.disabled = true;
    const generation = ++runtime.feedResumeGeneration;
    const context = runtime.audioContext;
    // A native preview's players are forgotten on interruption. Re-preload
    // BOTH IDs from this real Resume tap; never resume those sounds on
    // foreground by itself or change audio engines during the round.
    const nativeRetry = runtime.nativePilotBackend === "native"
      ? Promise.resolve(runtime.nativePilot?.prepare?.()).catch(
        () => ({ ready: false, reason: "native-prepare-error" }))
      : null;
    let settled = false;
    const valid = () => activeRuntime === runtime &&
      runtime.feedResumeGeneration === generation &&
      runtime.feedPausedAt != null && runtime.audioContext === context &&
      !document.hidden && !runtime.feedPageHidden;
    const finishResume = (nativeReady) => {
      if (!valid()) {
        if (activeRuntime === runtime && runtime.feedResumeGeneration === generation) {
          runtime.feedResumePending = false;
          if (runtime.resumeButton) runtime.resumeButton.disabled = false;
        }
        report(false);
        return;
      }
      runtime.feedResumePending = false;
      if (runtime.resumeButton) runtime.resumeButton.disabled = false;
      if (!nativeReady) {
        // Native stays the chosen backend. Never silently play Web Audio
        // after an interrupted or failed native preflight mid-round.
        recordFeedAudioRecovery("feed-native-preview-resume-blocked", runtime);
        setFeedingResumeStatus(runtime,
          "Native sounds aren't ready. Tap Resume again or go back.");
        report(false);
        return;
      }
      // Only a verified user gesture can dismiss the activity's overlay.
      runtime.feedAudioRecoveryVerified = true;
      const continued = continueFeedingAfterGesture(runtime,
        performance.now(), !!runtime.zooEscape);
      if (continued) {
        runtime.feedAudioNeedsFreshContext = false;
        runtime.feedAudioReplacements = 0;
        recordFeedAudioRecovery("feed-audio-resume-verified", runtime);
      }
      report(continued);
    };
    const settle = (ready, reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(runtime.feedResumeWatchdog);
      runtime.feedResumeWatchdog = null;
      if (!valid()) {
        if (activeRuntime === runtime && runtime.feedResumeGeneration === generation) {
          runtime.feedResumePending = false;
          if (runtime.resumeButton) runtime.resumeButton.disabled = false;
        }
        report(false);
        return;
      }
      if (!ready) {
        runtime.feedResumePending = false;
        if (runtime.resumeButton) runtime.resumeButton.disabled = false;
        runtime.feedAudioNeedsFreshContext = !!Ctor;
        recordFeedAudioRecovery("feed-audio-resume-failed", runtime,
          { reason: reason || "unavailable" });
        setFeedingResumeStatus(runtime,
          "Sound isn't ready yet. Wait a moment, then try again or go back.");
        report(false);
        return;
      }
      if (nativeRetry) {
        // Web clock verification still owns recovery; the additional native
        // preflight must also finish before the SAME frozen round continues.
        void nativeRetry.then(result => finishResume(result?.ready === true),
          () => finishResume(false));
      } else {
        finishResume(true);
      }
    };
    // Older browsers with no Web Audio continue to use the existing HTML
    // audio fallback. Do not trap them behind an impossible clock probe.
    if (!Ctor && !context) {
      settle(true);
      return true;
    }
    if (!context || context.state === "closed") {
      settle(false, "no-context");
      return false;
    }
    recordFeedAudioRecovery("feed-audio-resume-attempt", runtime);
    // The watchdog covers BOTH resume() and the clock probe. Old promises
    // cannot dismiss the overlay or affect a later round once timed out.
    // Patch 60 coordinator's finite settling windows require a longer
    // watchdog only on the native iOS path. Browser/PWA/Android stay at 2.5s.
    const coordinator = window.BibloZooAudioRecoveryCoordinator;
    runtime.feedResumeWatchdog = setTimeout(() => settle(false, "timeout"),
      coordinator?.isAvailable?.() ? 4200 : 2500);
    void resumeFeedAudioContext(context).then(ready => {
      if (!ready) {
        settle(false, "resume");
        return;
      }
      if (settled || activeRuntime !== runtime ||
          runtime.feedResumeGeneration !== generation || runtime.audioContext !== context ||
          document.hidden || runtime.feedPageHidden) return;
      void feedAudioClockAdvances(context).then(advanced => {
        if (advanced) { settle(true, "verified"); return; }
        // Patch 60: only an actual failed clock check can enter the shared
        // iOS coordinator. Delayed checks remain owned by this Resume tap;
        // stale generations cannot dismiss an overlay or alter gameplay.
        if (coordinator?.isAvailable?.()) {
          const isCurrent = () => !settled && activeRuntime === runtime &&
            runtime.feedResumeGeneration === generation &&
            runtime.audioContext === context && runtime.feedPausedAt != null &&
            !document.hidden && !runtime.feedPageHidden;
          void coordinator.recoverAfterStall({
            source: "feeding",
            probe: () => feedAudioClockAdvances(context),
            isCurrent
          }).then(result => {
            if (!isCurrent()) return;
            recordFeedAudioRecovery("feed-audio-coordinated-result", runtime,
              { recovered: result?.recovered === true, reason: result?.reason });
            settle(result?.recovered === true,
              result?.recovered ? "coordinated-verified" : "clock-stalled-after-coordination");
          }, () => settle(false, "coordination-error"));
          return;
        }
        // Patch 59 fallback: only an *actually frozen* clock may request native
        // reactivation. A successful native call must pass a second 180 ms
        // probe before the paused round can resume; no automatic foreground
        // activation or new context is created in this path.
        const nativeRecovery = window.BibloZooNativeAudioRecovery;
        if (!nativeRecovery?.isEnabled?.()) {
          settle(false, "clock-stalled");
          return;
        }
        void nativeRecovery.tryAfterClockStall("feeding").then(result => {
          if (!result?.activated || settled || activeRuntime !== runtime ||
              runtime.feedResumeGeneration !== generation ||
              runtime.audioContext !== context || document.hidden || runtime.feedPageHidden) {
            settle(false, "clock-stalled");
            return;
          }
          recordFeedAudioRecovery("feed-audio-native-recheck", runtime);
          void feedAudioClockAdvances(context).then(rechecked => {
            settle(rechecked, rechecked ? "native-verified" : "clock-stalled-after-native");
          }, () => settle(false, "native-clock-error"));
        }, () => settle(false, "native-bridge-error"));
      }, () => settle(false, "clock-error"));
    }, () => settle(false, "resume"));
    return true;
  }

  function attachFeedInterruptionHandlers(runtime) {
    runtime.feedVisibilityHandler = () => {
      if (document.hidden) {
        pauseFeedingGame(runtime);
        if (runtime.nativePilotBackend === "native" && runtime.feedPausedAt != null) {
          // A second hide while Resume is pending invalidates all async
          // native attempts and leaves Zoo Escape's overlay available.
          runtime.nativePilot?.stop?.();
          runtime.feedResumeGeneration += 1;
          runtime.feedResumePending = false;
          if (runtime.resumeButton) runtime.resumeButton.disabled = false;
        }
      }
      // Returning never automatically unfreezes the round.
    };
    runtime.feedPageHideHandler = () => {
      runtime.feedPageHidden = true;
      pauseFeedingGame(runtime);
      if (runtime.nativePilotBackend === "native" && runtime.feedPausedAt != null) {
        runtime.nativePilot?.stop?.();
        runtime.feedResumeGeneration += 1;
        runtime.feedResumePending = false;
        if (runtime.resumeButton) runtime.resumeButton.disabled = false;
      }
    };
    runtime.feedPageShowHandler = () => {
      runtime.feedPageHidden = false;
    };
    document.addEventListener("visibilitychange", runtime.feedVisibilityHandler);
    window.addEventListener("pagehide", runtime.feedPageHideHandler);
    window.addEventListener("pageshow", runtime.feedPageShowHandler);
  }

  function detachFeedInterruptionHandlers(runtime) {
    if (!runtime) return;
    if (runtime.feedVisibilityHandler) {
      document.removeEventListener("visibilitychange", runtime.feedVisibilityHandler);
      runtime.feedVisibilityHandler = null;
    }
    if (runtime.feedPageHideHandler) {
      window.removeEventListener("pagehide", runtime.feedPageHideHandler);
      runtime.feedPageHideHandler = null;
    }
    if (runtime.feedPageShowHandler) {
      window.removeEventListener("pageshow", runtime.feedPageShowHandler);
      runtime.feedPageShowHandler = null;
    }
  }

  function spawnMelodyNote(runtime, entry) {
    const radius = getFeedStarPegDiameter(runtime) / 2;
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

    // The melody note takes the place of a chomp sound, but pet feedback is shared.
    showCatchScore(runtime, { config: ball.config, points: 1 });
    pulseFeedPet(runtime);
  }

  function updateMelodyMode(
    runtime,
    dt,
    now
  ) {
    const state = runtime.melody;
    if (!state || state.pausedAt != null) return;

    if (!Number.isFinite(state.startTime)) {
      state.startTime = now;
      state.lastUpdateAt = now;
    }

    // Also handle long frame stalls that occur without a visibility event.
    const gapMs = now - state.lastUpdateAt;
    if (
      state.lastUpdateAt > 0 &&
      gapMs > MELODY_BACKGROUND_GAP_MS
    ) {
      state.startTime += gapMs;
      if (runtime.finishAt > 0) runtime.finishAt += gapMs;
    }
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

    for (const ball of runtime.balls) {
      const entry = ball.melodyEntry;
      if (!entry || entry.status !== "active") continue;

      const progress =
        (elapsed - entry.spawnOffsetMs) /
        Math.max(1, state.travelMs);

      if (progress >= 1) {
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
        continue;
      }

      const visibleProgress = clamp(progress, 0, 1);
      // Patch 73.1: the larger snack must *touch* the pet when its scheduled
      // note sounds. Previously the ball center reached petCenterY at the
      // beat, so its larger radius overlapped the portrait long beforehand.
      // Keep all melody timing and catch scoring unchanged; only shorten the
      // drawn travel to the pet's top contact boundary.
      const contactY = runtime.petCenterY - runtime.petRadius - ball.radius;
      ball.y =
        startY +
        (contactY - startY) * visibleProgress;
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
      const axis = input.axis === undefined
        ? pointerFeedAxis(input.x, runtime.width)
        : normalizeFeedAxis(input.axis);
      setCatcherX(runtime, runtime.width * (axis + 1) / 2);
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
      runtime.melody.pausedAt = null;
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

  // Bounce (Breakout): white balls and falling snacks have separate physics.
  // The pet position is kept in bounce.paddleX, not Classic's catcherX.
  function bounceBrickGeometry(width, height, row, column) {
    const gap = clamp(width * 0.008, 4, 8);
    const margin = Math.max(8, width * 0.015);
    const brickWidth = (width - margin * 2 - gap * (BOUNCE_COLUMNS - 1)) / BOUNCE_COLUMNS;
    const brickHeight = clamp(height * 0.045, 26, 54);
    const top = Math.max(72, height * 0.09);
    return {
      x: margin + column * (brickWidth + gap),
      y: top + row * (brickHeight + gap),
      width: brickWidth,
      height: brickHeight
    };
  }

  function createBounceBrickField(
    width,
    height,
    earnedStars = 0,
    random = Math.random
  ) {
    const slots = [];
    for (let row = 0; row < BOUNCE_ROWS; row += 1) {
      for (let column = 0; column < BOUNCE_COLUMNS; column += 1) {
        slots.push({
          row, column,
          ...bounceBrickGeometry(width, height, row, column),
          config: null, isStar: false, active: true
        });
      }
    }

    // Exactly one of each normal snack, plus one rainbow brick.
    const indices = slots.map((_, index) => index);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(clamp(random(), 0, 0.999999) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    [...SOLID_BALLS, RAINBOW_BALL].forEach((config, index) => {
      slots[indices[index]].config = config;
    });

    // Question-earned stars belong to gray bricks, with no base star.
    const starCount = clamp(
      Math.floor(Number(earnedStars) || 0), 0, 2
    );
    indices.slice(7, 7 + starCount).forEach((index) => {
      slots[index].isStar = true;
    });
    return slots;
  }

  function setBouncePaddleX(runtime, nextX) {
    if (!runtime?.bounce) return;
    const x = Number(nextX);
    const halfWidth = runtime.bounce.paddleHalfWidth;
    const safeX = clamp(
      Number.isFinite(x) ? x : runtime.width / 2,
      halfWidth,
      runtime.width - halfWidth
    );
    runtime.bounce.paddleX = safeX;
    runtime.catcher.style.left = `${safeX}px`;
  }

  function makeBounceWhiteBall(runtime, x, y, downward = true) {
    const state = runtime.bounce;
    const side = Math.random() < 0.5 ? -1 : 1;
    const horizontal = side * (0.28 + Math.random() * 0.43);
    const vertical = Math.sqrt(1 - horizontal * horizontal);
    return {
      id: state.nextWhiteId++,
      x: clamp(x, state.ballRadius, runtime.width - state.ballRadius),
      y,
      vx: state.ballSpeed * horizontal,
      vy: state.ballSpeed * vertical * (downward ? 1 : -1),
      radius: state.ballRadius,
      ageSeconds: 0
    };
  }

  function initializeBounceMode(runtime) {
    runtime.pegs = [];
    runtime.bursts = [];
    runtime.balls = [];
    runtime.scheduled = [];
    runtime.scheduledIndex = 0;
    runtime.nextScheduledAt = Infinity;
    runtime.score = 0;
    runtime.caughtCount = 0;
    runtime.totalCount = 7;
    const bricks = createBounceBrickField(
      runtime.width, runtime.height, runtime.earnedStarPegCount
    );
    const bottom = Math.max(...bricks.map((brick) => brick.y + brick.height));
    const paddleHalfWidth =
      runtime.petRadius * BOUNCE_PADDLE_HALF_WIDTH_RADIUS_SCALE;
    const paddleHeight = clamp(
      runtime.petRadius * BOUNCE_PADDLE_HEIGHT_RADIUS_SCALE,
      16,
      28
    );
    const paddleGap = clamp(
      runtime.petRadius * BOUNCE_PADDLE_GAP_RADIUS_SCALE,
      4,
      8
    );
    runtime.bounce = {
      bricks,
      whiteBalls: [],
      pendingWhiteBalls: [],
      nextWhiteId: 1,
      paddleX: runtime.width / 2,
      lastPaddleX: runtime.width / 2,
      paddleHalfWidth,
      paddleHeight,
      paddleGap,
      paddleTopY: runtime.petCenterY + runtime.petRadius + paddleGap,
      smoothedVelocity: 0,
      petTilt: 0,
      ballRadius: clamp(runtime.width * 0.023, 8, 14),
      ballSpeed: Math.max(runtime.width * 0.62, runtime.height * BOUNCE_BALL_SPEED_SCALE),
      snackSpeed: runtime.height * BOUNCE_SNACK_SPEED_SCALE,
      serveY: bottom + clamp(runtime.height * 0.035, 24, 44),
      livesLeft: BOUNCE_SERVES,
      waitingServe: true,
      snacksReleased: false,
      ended: false
    };
  }

  function launchBounceServe(runtime) {
    const state = runtime?.bounce;
    if (!state?.waitingServe || state.livesLeft <= 0 || state.ended || state.snacksReleased) {
      return false;
    }
    state.waitingServe = false;
    state.whiteBalls.push(
      makeBounceWhiteBall(
        runtime,
        runtime.width * (0.35 + Math.random() * 0.30),
        state.serveY
      )
    );
    runtime.startOverlay.hidden = true;
    runtime.finishAt = 0;
    return true;
  }

  function spawnBounceSnack(runtime, brick) {
    const config = brick.config;
    if (!config) return;
    const radius = getFeedStarPegDiameter(runtime) / 2;
    runtime.balls.push({
      id: runtime.nextBallId++,
      config,
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: 0,
      vy: runtime.bounce.snackSpeed,
      radius,
      rotation: 0,
      angularVelocity: 0,
      points: config.points || 1,
      trail: [],
      lastTrailAt: 0
    });
  }

  function breakBounceBrick(runtime, brick, ball, now) {
    if (!brick.active) return;
    brick.active = false;
    if (brick.config) spawnBounceSnack(runtime, brick);
    if (brick.isStar) {
      const state = runtime.bounce;
      const bonus = makeBounceWhiteBall(
        runtime,
        brick.x + brick.width / 2,
        brick.y + brick.height + state.ballRadius * 2 + 3
      );
      state.pendingWhiteBalls.push(bonus);
      playStarSound(runtime);
    } else {
      playPegTone(runtime, now);
    }
  }

  // Circle/rectangle collision; resolve outside the brick before reflecting.
  // One brick can be destroyed only once, including during multiball.
  function collideBounceBallWithBricks(runtime, ball, previousX, previousY, now) {
    for (const brick of runtime.bounce.bricks) {
      if (!brick.active) continue;
      const nearestX = clamp(ball.x, brick.x, brick.x + brick.width);
      const nearestY = clamp(ball.y, brick.y, brick.y + brick.height);
      const dx = ball.x - nearestX;
      const dy = ball.y - nearestY;
      if (dx * dx + dy * dy >= ball.radius * ball.radius) continue;

      if (previousY + ball.radius <= brick.y && ball.vy > 0) {
        ball.y = brick.y - ball.radius;
        ball.vy = -Math.abs(ball.vy);
      } else if (previousY - ball.radius >= brick.y + brick.height && ball.vy < 0) {
        ball.y = brick.y + brick.height + ball.radius;
        ball.vy = Math.abs(ball.vy);
      } else if (previousX + ball.radius <= brick.x && ball.vx > 0) {
        ball.x = brick.x - ball.radius;
        ball.vx = -Math.abs(ball.vx);
      } else if (previousX - ball.radius >= brick.x + brick.width && ball.vx < 0) {
        ball.x = brick.x + brick.width + ball.radius;
        ball.vx = Math.abs(ball.vx);
      } else {
        // Corner/overlap fallback for a ball launched very near a brick.
        const horizontalPenetration = ball.radius - Math.abs(dx);
        const verticalPenetration = ball.radius - Math.abs(dy);
        if (horizontalPenetration < verticalPenetration) {
          const direction = ball.x < brick.x + brick.width / 2 ? -1 : 1;
          ball.x += direction * Math.max(0, horizontalPenetration);
          ball.vx = direction * Math.abs(ball.vx);
        } else {
          const direction = ball.y < brick.y + brick.height / 2 ? -1 : 1;
          ball.y += direction * Math.max(0, verticalPenetration);
          ball.vy = direction * Math.abs(ball.vy);
        }
      }
      breakBounceBrick(runtime, brick, ball, now);
      return true;
    }
    return false;
  }

  function normalizeBounceBallVelocity(ball, speed) {
    const direction = ball.vy < 0 ? -1 : 1;
    let vx = Number(ball.vx) || 0;
    let vy = Number(ball.vy) || direction;
    let magnitude = Math.hypot(vx, vy);
    if (magnitude < 0.00001) {
      vx = speed * 0.4;
      vy = direction * speed * 0.9165;
      magnitude = Math.hypot(vx, vy);
    }
    vx = vx / magnitude * speed;
    vy = vy / magnitude * speed;
    const minimum = speed * BOUNCE_MIN_VERTICAL_FRACTION;
    if (Math.abs(vy) < minimum) {
      vy = direction * minimum;
      const side = vx < 0 ? -1 : 1;
      vx = side * Math.sqrt(speed * speed - minimum * minimum);
    }
    // Avoid an endless perfectly vertical orbit.
    const minHorizontal = speed * 0.12;
    if (Math.abs(vx) < minHorizontal) {
      vx = (vx < 0 ? -1 : 1) * minHorizontal;
      vy = direction * Math.sqrt(speed * speed - minHorizontal * minHorizontal);
    }
    ball.vx = vx;
    ball.vy = vy;
  }

  function getBounceBallSpeed(runtime, ball) {
    const ageSeconds = Math.max(0, Number(ball?.ageSeconds) || 0);
    const multiplier = Math.min(
      BOUNCE_MAX_SPEED_MULTIPLIER,
      1 + ageSeconds * BOUNCE_SPEED_GAIN_PER_SECOND
    );
    return runtime.bounce.ballSpeed * multiplier;
  }

  function updateBounceWhiteBall(runtime, ball, dt, now) {
    const state = runtime.bounce;
    ball.ageSeconds = Math.max(0, Number(ball.ageSeconds) || 0) + dt;
    const currentSpeed = getBounceBallSpeed(runtime, ball);
    normalizeBounceBallVelocity(ball, currentSpeed);
    const previousX = ball.x;
    const previousY = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    let hitBoundary = false;
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      hitBoundary = true;
    } else if (ball.x + ball.radius > runtime.width) {
      ball.x = runtime.width - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      hitBoundary = true;
    }
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      hitBoundary = true;
    }
    // A wall-and-ceiling corner is one collision cue, not two overlapping beeps.
    if (hitBoundary) playPegTone(runtime, now);

    // White balls rebound only from the rounded-rectangle paddle below the pet.
    const paddleY = state.paddleTopY;
    const paddleHalfWidth = state.paddleHalfWidth;
    if (
      ball.vy > 0 &&
      previousY + ball.radius <= paddleY &&
      ball.y + ball.radius >= paddleY &&
      Math.abs(ball.x - state.paddleX) <= paddleHalfWidth + ball.radius * 0.5
    ) {
      ball.y = paddleY - ball.radius;
      const offset = clamp(
        (ball.x - state.paddleX) / paddleHalfWidth, -1, 1
      );
      ball.vx = currentSpeed * clamp(offset * 0.78, -0.78, 0.78);
      ball.vy = -Math.sqrt(currentSpeed ** 2 - ball.vx ** 2);
      playPegTone(runtime, now);
    } else {
      collideBounceBallWithBricks(runtime, ball, previousX, previousY, now);
    }
    normalizeBounceBallVelocity(ball, currentSpeed);
    return ball.y - ball.radius <= runtime.height;
  }

  function bounceSnackTouchesPet(runtime, ball) {
    const dx = ball.x - runtime.bounce.paddleX;
    const dy = ball.y - runtime.petCenterY;
    const radius = ball.radius + runtime.petRadius * 0.9;
    return dx * dx + dy * dy <= radius * radius;
  }

  function bounceSnackTouchesPaddle(runtime, ball) {
    const paddle = runtime.bounce;
    const nearestX = clamp(
      ball.x,
      paddle.paddleX - paddle.paddleHalfWidth,
      paddle.paddleX + paddle.paddleHalfWidth
    );
    const nearestY = clamp(
      ball.y, paddle.paddleTopY, paddle.paddleTopY + paddle.paddleHeight
    );
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    return dx * dx + dy * dy <= ball.radius * ball.radius;
  }

  function updateBounceSnacks(runtime, dt) {
    runtime.balls = runtime.balls.filter((ball) => {
      ball.y += ball.vy * dt;
      ball.rotation += dt * 1.4;
      if (bounceSnackTouchesPet(runtime, ball) ||
          bounceSnackTouchesPaddle(runtime, ball)) {
        // Reuse the existing single-collection scoring and chomp path.
        catchBall(runtime, ball);
        return false;
      }
      return ball.y - ball.radius <= runtime.height;
    });
  }

  function updateBouncePetLean(runtime, dt) {
    const state = runtime.bounce;
    const velocity = (state.paddleX - state.lastPaddleX) / Math.max(dt, 0.008);
    state.lastPaddleX = state.paddleX;
    state.smoothedVelocity = state.smoothedVelocity * 0.76 + velocity * 0.24;
    const targetLean = clamp(
      state.smoothedVelocity / Math.max(1, runtime.width * 1.5) * 13,
      -15, 15
    );
    state.petTilt += (targetLean - state.petTilt) * 0.25;
    if (Math.abs(state.petTilt) < 0.12 && Math.abs(targetLean) < 0.12) {
      state.petTilt = 0;
    }
    runtime.petCircle.style.setProperty(
      "--daily-feed-pet-tilt", `${state.petTilt}deg`
    );
  }

  function showBounceNextServe(runtime, now) {
    const state = runtime.bounce;
    state.waitingServe = true;
    runtime.introUnlockAt = now + 550;
    runtime.startTitleEl.textContent = `${state.livesLeft} Balls Left!`;
    runtime.startInstructionEl.textContent = "Tap to launch";
    runtime.controlPhase = "serve";
    if (runtime.startChoiceEl) runtime.startChoiceEl.hidden = true;
    if (runtime.startConfirmEl) runtime.startConfirmEl.hidden = false;
    if (runtime.startSelectedIconEl) runtime.startSelectedIconEl.hidden = true;
    if (runtime.startConfirmButton) runtime.startConfirmButton.textContent = "Launch!";
    runtime.startOverlay.hidden = false;
  }

  function updateBounceMode(runtime, dt, now) {
    const state = runtime.bounce;
    if (!state) return;
    if (!state.ended && !state.snacksReleased && !state.waitingServe) {
      const steps = Math.max(1, Math.ceil(dt / BOUNCE_STEP));
      const step = dt / steps;
      for (let i = 0; i < steps; i += 1) {
        state.whiteBalls = state.whiteBalls.filter(
          (ball) => updateBounceWhiteBall(runtime, ball, step, now)
        );
        if (state.pendingWhiteBalls.length) {
          state.whiteBalls.push(...state.pendingWhiteBalls);
          state.pendingWhiteBalls.length = 0;
        }
        // Feeding, not clearing gray bricks, is the objective.
        // Stop the rally after the seventh snack brick is broken;
        // let released snacks finish falling before showing results.
        if (!state.bricks.some((brick) => brick.active && brick.config)) {
          state.snacksReleased = true;
          state.whiteBalls = [];
          state.pendingWhiteBalls = [];
          break;
        }
        if (!state.whiteBalls.length) break;
      }
      if (!state.snacksReleased && !state.whiteBalls.length) {
        state.livesLeft -= 1;
        if (state.livesLeft > 0) {
          showBounceNextServe(runtime, now);
        } else {
          state.ended = true;
          runtime.balls = [];
        }
      }
    }
    if (!state.waitingServe && !state.ended) {
      updateBounceSnacks(runtime, dt);
    }
    updateBouncePetLean(runtime, dt);
  }

  function drawBounceMode(runtime, now) {
    const state = runtime.bounce;
    const ctx = runtime.ctx;
    ctx.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0);
    ctx.clearRect(0, 0, runtime.width, runtime.height);

    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const { x, y, width, height } = brick;
      ctx.save();
      ctx.fillStyle = brick.config?.color || "rgba(49, 66, 79, 0.68)";
      if (brick.config?.id === "rainbow") {
        ctx.globalAlpha = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(now / 240));
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        RAINBOW_BALL.trailColors.forEach((color, index) => {
          gradient.addColorStop(index / (RAINBOW_BALL.trailColors.length - 1), color);
        });
        ctx.fillStyle = gradient;
      }
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, width, height);
      if (brick.isStar) {
        const size = Math.min(height * 0.87, width * 0.64);
        if (runtime.starImage?.complete && runtime.starImage.naturalWidth) {
          ctx.drawImage(
            runtime.starImage,
            x + (width - size) / 2, y + (height - size) / 2,
            size, size
          );
        } else {
          ctx.fillStyle = "#ffd061";
          ctx.font = `bold ${size}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("★", x + width / 2, y + height / 2);
        }
      }
      ctx.restore();
    }
    for (const snack of runtime.balls) drawBall(runtime, snack);
    for (const ball of state.whiteBalls) {
      ctx.save();
      ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
      ctx.shadowBlur = ball.radius * 1.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }

  function handleBounceModeInput(runtime, input) {
    if (input?.type === "tilt") {
      handleTilt(runtime, input.event);
    } else if (input?.type === "pointer") {
      const axis = input.axis === undefined
        ? pointerFeedAxis(input.x, runtime.width)
        : normalizeFeedAxis(input.axis);
      setBouncePaddleX(runtime, runtime.width * (axis + 1) / 2);
    }
  }

  function isBounceModeComplete(runtime, now) {
    const state = runtime.bounce;
    if (!state?.ended && !(state?.snacksReleased && runtime.balls.length === 0)) {
      runtime.finishAt = 0;
      return false;
    }
    if (!runtime.finishAt) {
      runtime.finishAt = now + runtime.modeConfig.finishDelayMs;
      return false;
    }
    return now >= runtime.finishAt;
  }

  function disposeBounceMode(runtime) {
    if (!runtime?.bounce) return;
    runtime.bounce.whiteBalls = [];
    runtime.bounce.pendingWhiteBalls = [];
    runtime.bounce.waitingServe = false;
  }

  const BOUNCE_MODE_CONTROLLER = Object.freeze({
    id: FEED_MODES.BOUNCE,
    initialize: initializeBounceMode,
    update: updateBounceMode,
    draw: drawBounceMode,
    handleInput: handleBounceModeInput,
    isComplete: isBounceModeComplete,
    buildResult: buildStandardResult,
    dispose: disposeBounceMode
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
      const axis = input.axis === undefined
        ? pointerFeedAxis(input.x, runtime.width)
        : normalizeFeedAxis(input.axis);
      setCatcherX(runtime, runtime.width * (axis + 1) / 2);
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
        MELODY_MODE_CONTROLLER,
      [FEED_MODES.BOUNCE]:
        BOUNCE_MODE_CONTROLLER
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
    runtime.feedResumeGeneration = (runtime.feedResumeGeneration || 0) + 1;
    runtime.feedFrameGeneration = (runtime.feedFrameGeneration || 0) + 1;
    clearTimeout(runtime.feedStartAudioWatchdog);
    clearTimeout(runtime.feedResumeWatchdog);
    runtime.nativePilot?.stop?.();
    runtime.gameEl?.classList?.remove?.("is-interruption-paused");
    if (runtime.resumeOverlay) runtime.resumeOverlay.hidden = true;

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
      runtime.dailyTodoSnack && !runtime.dailyTodoPreview
        ? `Thanks for the snack, ${runtime.zookeeperName}!`
        : copy.title;
    runtime.resultScoreEl.textContent =
      result.mode === FEED_MODES.MELODY
        ? `Snacks Caught: ${Number(result.catchPercent) || 0}%`
        : `Score: ${result.score}`;
    if (runtime.resultCatchesEl) {
      const caught = Math.max(0, Number(result.caughtCount) || 0);
      const total = Math.max(0, Number(result.totalCount) || 0);
      runtime.resultCatchesEl.textContent = `Caught ${caught} of ${total} snacks`;
      runtime.resultCatchesEl.hidden = result.mode === FEED_MODES.MELODY;
    }
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
    // Simulated recovery never awards daily-session or Zoo To-Do progress.
    if (!runtime.zooDevTestEverActivated) runtime.onComplete?.(result);
  }

  function showFeedingControlChoice(runtime, message = "") {
    runtime.controlPhase = "choose";
    // The game branding belongs to the chooser only, not the focused tutorial.
    if (runtime.startTitleEl) runtime.startTitleEl.hidden = false;
    if (runtime.startBallsEl) runtime.startBallsEl.hidden = false;
    if (runtime.startChoiceEl) runtime.startChoiceEl.hidden = false;
    if (runtime.startConfirmEl) runtime.startConfirmEl.hidden = true;
    if (runtime.startControlMessageEl) {
      runtime.startControlMessageEl.textContent = message;
      runtime.startControlMessageEl.hidden = !message;
    }
    runtime.startOverlay.hidden = false;
  }

  function showFeedingControlInstructions(runtime, choice) {
    // Keep the selected-method screen minimal and avoid overflowing the card.
    if (runtime.startTitleEl) runtime.startTitleEl.hidden = true;
    if (runtime.startBallsEl) runtime.startBallsEl.hidden = true;
    runtime.controlMode = choice;
    runtime.tiltEnabled = choice === "tilt";
    runtime.controlPhase = "instructions";
    if (runtime.startChoiceEl) runtime.startChoiceEl.hidden = true;
    if (runtime.startConfirmEl) runtime.startConfirmEl.hidden = false;
    if (runtime.startSelectedIconEl) {
      runtime.startSelectedIconEl.src = `${ASSET_BASE}dq_feed_control_${choice}.png`;
      runtime.startSelectedIconEl.hidden = false;
    }
    if (runtime.startInstructionEl) {
      runtime.startInstructionEl.textContent = feedInstructionPrompt(runtime.mode, choice);
    }
    if (runtime.startConfirmButton) runtime.startConfirmButton.textContent = "Got It!";
    runtime.introUnlockAt = performance.now() + 200;
  }

  // Called directly by a real tap so iOS motion authorization retains user
  // activation. It never unlocks audio or changes the activity's recovery.
  async function chooseFeedingControl(runtime, choice) {
    if (runtime.controlChoicePending || runtime.controlPhase !== "choose") return;
    if (choice === "drag") {
      showFeedingControlInstructions(runtime, "drag");
      return;
    }
    const OrientationEvent = window.DeviceOrientationEvent;
    if (!OrientationEvent) {
      showFeedingControlChoice(runtime, "Tilt isn't available. Please choose Drag.");
      return;
    }
    runtime.controlChoicePending = true;
    let allowed = runtime.tiltPermissionPreapproved;
    if (!allowed) {
      if (typeof OrientationEvent.requestPermission === "function") {
        try {
          allowed = (await OrientationEvent.requestPermission()) === "granted";
        } catch (_) { allowed = false; }
      } else {
        allowed = true;
      }
    }
    runtime.controlChoicePending = false;
    if (activeRuntime !== runtime || runtime.controlPhase !== "choose") return;
    if (!allowed) {
      showFeedingControlChoice(runtime, "Tilt permission wasn't granted. Please choose Drag.");
      return;
    }
    runtime.tiltPermissionPreapproved = true;
    showFeedingControlInstructions(runtime, "tilt");
  }

  // Stage C.2c: snapshots are read-only and in-memory. They show the native
  // interruption sequence around Web-clock and native-preload boundaries.
  // Requests are async: "before-web" is captured on the separate checkbox
  // gesture, not guaranteed to describe the exact instant of Got It!.
  function nativeFeedDebugNumber(value) {
    return Number.isInteger(value) && value >= 0 && value < 100000 ? value : "?";
  }

  function boundedNativeFeedStage(promise, timeoutMs) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("stage-timeout")), timeoutMs);
      })
    ]).finally(() => clearTimeout(timer));
  }

  async function recordNativePreviewPhase(runtime, label) {
    if (!runtime?.nativePilotAllowed || activeRuntime !== runtime ||
        document.hidden || runtime.feedPageHidden ||
        !runtime.nativePilotCheckbox?.checked) return;
    if (!runtime.nativePilotTrace) runtime.nativePilotTrace = [];
    const step = { label, text: "reading…" };
    runtime.nativePilotTrace.push(step);
    // Developer-only counts, not persistent telemetry or user audio content.
    if (runtime.nativePilotTrace.length > 5) runtime.nativePilotTrace.shift();
    const paint = () => {
      if (activeRuntime === runtime && runtime.nativePilotPhases) {
        runtime.nativePilotPhases.textContent = runtime.nativePilotTrace
          .map(item => item.label + ": " + item.text).join("\n");
      }
    };
    paint();
    try {
      const api = window.Capacitor?.Plugins?.BibloZooNativeSound;
      if (typeof api?.getDebugState !== "function") {
        step.text = "bridge-unavailable";
      } else {
        const state = await boundedNativeFeedStage(
          api.getDebugState(), FEED_NATIVE_STATE_READ_TIMEOUT_MS);
        if (activeRuntime !== runtime || document.hidden ||
            !runtime.nativePilotCheckbox?.checked) return;
        const last = typeof state?.lastSignal === "string" &&
          /^[a-z][a-z0-9-]{0,40}$/.test(state.lastSignal)
            ? state.lastSignal : "?";
        const reason = Number.isInteger(state?.lastReasonCode) &&
          state.lastReasonCode >= -1 && state.lastReasonCode < 10000
            ? state.lastReasonCode : "?";
        step.text = state?.available === true
          ? "pending=" + (state.pending === true ? "YES" : "no") +
            " began=" + nativeFeedDebugNumber(state.beganCount) +
            " ended=" + nativeFeedDebugNumber(state.endedCount) +
            " events=" + nativeFeedDebugNumber(state.eventCount) +
            " last=" + last + " reason=" + reason
          : "bridge-unavailable";
      }
    } catch (_) {
      step.text = "read-timeout-or-error";
    }
    paint();
  }

  // The unchecked Web baseline prepares its original sounds only when
  // explicitly chosen. The native-only path never calls this helper.
  function prepareWebClassicPreviewOnTap(runtime) {
    if (runtime.audioContext || runtime.starAudio || runtime.chompAudio) return;
    runtime.audioContext = prepareAudio();
    if (runtime.audioContext) return;
    // Preserve the existing HTML fallback on devices without Web Audio.
    try {
      runtime.starAudio = new Audio(`${ASSET_BASE}dq_feed_star.mp3`);
      runtime.starAudio.preload = "auto";
      runtime.starAudio.volume = feedingSoundVolume(0.82);
      runtime.starAudio.load();
      runtime.chompAudio = new Audio(`${ASSET_BASE}dq_feed_chomp.mp3`);
      runtime.chompAudio.preload = "auto";
      runtime.chompAudio.volume = feedingSoundVolume(0.85);
      runtime.chompAudio.load();
    } catch (_) { /* Web baseline keeps its original best-effort behavior. */ }
  }

  async function startPreviewRoundWithAudioChoice(runtime) {
    if (!runtime || activeRuntime !== runtime ||
        runtime.nativePilotChoicePending || runtime.roundStarted ||
        runtime.finished || runtime.controlPhase !== "instructions") return;
    if (!runtime.nativePilotAllowed ||
        runtime.nativePilotCheckbox?.checked !== true) {
      // Explicit Web comparison, not an audio-error fallback from Native.
      runtime.nativePilotBackend = "web";
      prepareWebClassicPreviewOnTap(runtime);
      if (runtime.nativePilotBadge)
        runtime.nativePilotBadge.textContent = "Preview audio: Web (explicit choice)";
      startRound(runtime);
      return;
    }

    // C.2d experiment: once the owner chooses Native, do not create, resume,
    // clock-probe or silently select Web Audio. A failed native sound remains
    // intentionally SILENT and carries an accurate diagnostic reason.
    runtime.nativePilotBackend = "native";
    if (preparedAudioContext) {
      stopAudioContext(preparedAudioContext);
      preparedAudioContext = null;
    }
    const factory = window.BibloZooFeedingNativeAudioPilot;
    const pilot = factory?.create?.({
      isCurrent: () => activeRuntime === runtime && !runtime.finished &&
        !document.hidden && !runtime.feedPageHidden,
      onFailure: (reason) => {
        if (activeRuntime !== runtime || runtime.finished) return;
        if (runtime.nativePilotBadge) {
          const detail = typeof reason === "string" &&
            /^[a-z][a-z0-9-]{0,55}$/.test(reason) ? reason : "bridge-error";
          runtime.nativePilotBadge.textContent =
            "Native ONLY failed (" + detail + "); silent effects. Exit/retry";
        }
        void recordNativePreviewPhase(runtime, "play-fail");
      }
    });
    runtime.nativePilotChoicePending = true;
    if (runtime.startConfirmButton) runtime.startConfirmButton.disabled = true;
    if (runtime.nativePilotCheckbox) runtime.nativePilotCheckbox.disabled = true;
    if (runtime.nativePilotChoiceStatus)
      runtime.nativePilotChoiceStatus.textContent = "Preparing ONLY native star/chomp…";
    const live = () => activeRuntime === runtime && !runtime.finished &&
      !runtime.roundStarted && runtime.controlPhase === "instructions" &&
      !document.hidden && !runtime.feedPageHidden;
    const cancelStale = () => {
      pilot?.stop?.();
      if (activeRuntime === runtime) {
        runtime.nativePilotChoicePending = false;
        if (runtime.startConfirmButton) runtime.startConfirmButton.disabled = false;
        if (runtime.nativePilotCheckbox) runtime.nativePilotCheckbox.disabled = false;
      }
    };
    // Read-only state is not a readiness gate; it cannot veto native audio.
    await recordNativePreviewPhase(runtime, "before-native");
    if (!live()) { cancelStale(); return; }
    let result;
    try {
      result = await pilot?.prepare?.() || { ready: false, reason: "missing-bridge" };
    } catch (_) { result = { ready: false, reason: "prepare-error" }; }
    if (!live()) { cancelStale(); return; }
    await recordNativePreviewPhase(runtime, "after-native");
    if (!live()) { cancelStale(); return; }

    runtime.nativePilotChoicePending = false;
    if (runtime.startConfirmButton) runtime.startConfirmButton.disabled = false;
    if (runtime.nativePilotCheckbox) runtime.nativePilotCheckbox.disabled = false;
    runtime.nativePilot = pilot || null;
    if (result?.ready === true && pilot) {
      if (runtime.nativePilotBadge)
        runtime.nativePilotBadge.textContent =
          "Native ONLY: star/chomp ready; Web audio OFF";
    } else {
      // A failed pilot does NOT silently start a Web backend. The owner can
      // observe silent gameplay + the exact failure code, or exit/restart.
      pilot?.stop?.();
      const reason = typeof result?.reason === "string" &&
        /^[a-z][a-z0-9-]{0,55}$/.test(result.reason)
        ? result.reason : "bridge-error";
      if (runtime.nativePilotBadge)
        runtime.nativePilotBadge.textContent =
          "Native ONLY unavailable (" + reason + "); sounds SILENT";
    }
    startRound(runtime);
    void recordNativePreviewPhase(runtime, "round-start");
  }

  function startRound(runtime) {
    if (
      !runtime ||
      activeRuntime !== runtime ||
      runtime.roundStarted ||
      runtime.finished ||
      !["tilt", "drag"].includes(runtime.controlMode) ||
      runtime.controlPhase !== "instructions"
    ) {
      return;
    }

    runtime.controlPhase = "playing";
    runtime.roundStarted = true;
    runtime.running = true;
    runtime.startOverlay.hidden = true;

    // Keep the intro listener for every mode: it is needed if a Tilt sensor
    // stops responding and the player explicitly chooses Drag mid-round.

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
      window.addEventListener("deviceorientation", runtime.orientationHandler);
      armTiltObservationFallback(runtime);
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

    if (runtime.mode === FEED_MODES.BOUNCE) {
      launchBounceServe(runtime);
    }

    // Starting is itself a gesture. Give its Web Audio resume promise a
    // chance to settle BEFORE advancing game time, rather than flashing a
    // needless second Resume prompt during an ordinary new round.
    if (runtime.nativePilotBackend !== "native" &&
        runtime.audioContext && runtime.audioContext.state !== "running") {
      const beganAt = performance.now();
      runtime.feedStartAudioWatchdog = setTimeout(() => {
        runtime.feedStartAudioWatchdog = null;
        if (activeRuntime === runtime && runtime.running &&
            !runtime.finished && runtime.feedPausedAt == null && !runtime.rafId) {
          pauseFeedingGame(runtime, beganAt);
        }
      }, 1000);
      void resumeFeedAudioContext(runtime.audioContext).then((ready) => {
        clearTimeout(runtime.feedStartAudioWatchdog);
        runtime.feedStartAudioWatchdog = null;
        if (activeRuntime !== runtime || !runtime.running ||
            runtime.finished || runtime.feedPausedAt != null || runtime.rafId) return;
        if (!ready) {
          pauseFeedingGame(runtime, beganAt);
          return;
        }
        const nowReady = performance.now();
        shiftFeedingDeadlines(runtime, Math.max(0, nowReady - beganAt));
        runtime.lastFrameAt = nowReady;
        runtime.rafId = scheduleFeedFrame(runtime);
      });
    } else {
      runtime.rafId = scheduleFeedFrame(runtime);
    }
  }

  function scheduleFeedFrame(runtime) {
    const generation = runtime.feedFrameGeneration || 0;
    return requestAnimationFrame((now) => runFrame(runtime, now, generation));
  }

  function runFrame(runtime, now, generation = runtime.feedFrameGeneration || 0) {
    if (
      generation !== (runtime.feedFrameGeneration || 0) ||
      !runtime.running ||
      activeRuntime !== runtime ||
      runtime.feedPausedAt != null ||
      (runtime.mode === FEED_MODES.MELODY &&
        runtime.melody?.pausedAt != null)
    ) return;
    // iOS occasionally suspends JS without dispatching pagehide. A very long
    // rAF gap is treated as time away, beginning at the last good frame.
    if (document.hidden || runtime.feedPageHidden ||
        now - runtime.lastFrameAt > 1500) {
      pauseFeedingGame(runtime, runtime.lastFrameAt);
      return;
    }
    if (runtime.nativePilotBackend !== "native" &&
        runtime.audioContext && runtime.audioContext.state !== "running") {
      pauseFeedingGame(runtime, now);
      return;
    }
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
    runtime.rafId = scheduleFeedFrame(runtime);
  }

  // Maintain the same live game when orientation or viewport dimensions change.
  // Bricks are repositioned by row/column, never reshuffled or reactivated.
  function resizeFeedStage(runtime) {
    if (!runtime || activeRuntime !== runtime || runtime.finished) return false;
    const width = runtime.stage.clientWidth;
    const height = runtime.stage.clientHeight;
    if (width < 120 || height < 260) return false;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    if (width === runtime.width && height === runtime.height && dpr === runtime.dpr) return false;

    const oldWidth = runtime.width;
    const oldHeight = runtime.height;
    const oldPegRadius = runtime.pegRadius;
    const sx = width / oldWidth;
    const sy = height / oldHeight;
    const fieldRadius = clamp(width * 0.04, 14, 26);
    const radiusScale = fieldRadius / oldPegRadius;
    const petFraction = (runtime.mode === FEED_MODES.BOUNCE
      ? runtime.bounce.paddleX : runtime.catcherX) / oldWidth;
    runtime.width = width;
    runtime.height = height;
    runtime.dpr = dpr;
    runtime.canvas.width = Math.round(width * dpr);
    runtime.canvas.height = Math.round(height * dpr);
    runtime.pegRadius = fieldRadius;
    runtime.catcher.style.setProperty("--daily-feed-pet-size", `${fieldRadius * 4}px`);

    const stageRect = runtime.stage.getBoundingClientRect();
    const petRect = runtime.petCircle.getBoundingClientRect();
    runtime.petRadius = petRect.width / 2;
    runtime.petCenterY = petRect.top - stageRect.top + petRect.height / 2;
    runtime.gravity = height * 0.31;
    runtime.lastCatcherX = width * petFraction;
    runtime.smoothedPetVelocity = 0;

    const scalePoint = (point) => {
      point.x *= sx;
      point.y *= sy;
    };
    const scaleBall = (ball) => {
      scalePoint(ball);
      ball.x = clamp(ball.x, ball.radius * radiusScale, width - ball.radius * radiusScale);
      ball.vx = (Number(ball.vx) || 0) * sx;
      ball.vy = (Number(ball.vy) || 0) * sy;
      ball.radius *= radiusScale;
      if (Number.isFinite(ball.labyrinthProgressX)) ball.labyrinthProgressX *= sx;
      if (Number.isFinite(ball.labyrinthProgressY)) ball.labyrinthProgressY *= sy;
      if (Array.isArray(ball.trail)) ball.trail.forEach(scalePoint);
    };
    runtime.balls.forEach(scaleBall);
    runtime.pegs.forEach((peg) => {
      scalePoint(peg);
      peg.radius *= radiusScale;
    });
    runtime.bursts.forEach(scalePoint);

    if (runtime.labyrinth) {
      const state = runtime.labyrinth;
      for (const row of state.platformRows) {
        row.y *= sy;
        row.thickness *= sy;
        row.gapCenter *= sx;
        row.gapWidth *= sx;
        row.gapLeft *= sx;
        row.gapRight *= sx;
        for (const segment of row.segments) {
          segment.x *= sx;
          segment.y *= sy;
          segment.width *= sx;
          segment.height *= sy;
        }
      }
      state.steerAcceleration = width * LABYRINTH_STEER_ACCELERATION_SCALE;
      state.maxHorizontalSpeed = width * LABYRINTH_MAX_HORIZONTAL_SPEED_SCALE;
      state.gravity = height * LABYRINTH_GRAVITY_SCALE;
      state.maxVerticalSpeed = height * LABYRINTH_MAX_VERTICAL_SPEED_SCALE;
      state.petSpeed = width * 0.19;
    }
    if (runtime.melody) {
      const radius = getFeedStarPegDiameter(runtime) / 2;
      for (const ball of runtime.balls) ball.radius = radius;
      for (const entry of runtime.melody.timeline) {
        if (entry.x !== null) entry.x = width * entry.laneFraction;
      }
      // Keep the existing startTime and note statuses; no tune restart.
    }
    if (runtime.bounce) {
      const state = runtime.bounce;
      state.bricks.forEach((brick) => {
        Object.assign(brick, bounceBrickGeometry(width, height, brick.row, brick.column));
      });
      for (const ball of [...state.whiteBalls, ...state.pendingWhiteBalls]) {
        scaleBall(ball);
      }
      state.ballRadius = clamp(width * 0.023, 8, 14);
      state.ballSpeed = Math.max(width * 0.62, height * BOUNCE_BALL_SPEED_SCALE);
      state.snackSpeed = height * BOUNCE_SNACK_SPEED_SCALE;
      const snackRadius = getFeedStarPegDiameter(runtime) / 2;
      runtime.balls.forEach((snack) => {
        snack.vy = state.snackSpeed;
        snack.radius = snackRadius;
        snack.x = clamp(snack.x, snackRadius, width - snackRadius);
      });
      state.paddleHalfWidth = runtime.petRadius * BOUNCE_PADDLE_HALF_WIDTH_RADIUS_SCALE;
      state.paddleHeight = clamp(runtime.petRadius * BOUNCE_PADDLE_HEIGHT_RADIUS_SCALE, 16, 28);
      state.paddleGap = clamp(runtime.petRadius * BOUNCE_PADDLE_GAP_RADIUS_SCALE, 4, 8);
      state.paddleTopY = runtime.petCenterY + runtime.petRadius + state.paddleGap;
      const bottom = Math.max(...state.bricks.map((brick) => brick.y + brick.height));
      state.serveY = bottom + clamp(height * 0.035, 24, 44);
      state.lastPaddleX = width * petFraction;
      state.smoothedVelocity = 0;
      setBouncePaddleX(runtime, width * petFraction);
      state.whiteBalls.forEach((ball) => normalizeBounceBallVelocity(ball, getBounceBallSpeed(runtime, ball)));
      state.pendingWhiteBalls.forEach((ball) => normalizeBounceBallVelocity(ball, getBounceBallSpeed(runtime, ball)));
    } else {
      setCatcherX(runtime, width * petFraction);
    }
    if (runtime.tiltEnabled) {
      runtime.neutralGamma = null;
      runtime.smoothedTilt = 0;
      runtime.tiltSamples = [];
      runtime.tiltCalibrationUntil = performance.now() + TILT_CALIBRATION_MS;
    }
    runtime.modeController.draw(runtime, performance.now());
    return true;
  }

  function start(
    rootEl,
    {
      session,
      onComplete,
      onBackToZoo,
      onRecoveryExitToZoo
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
    const exitButton = rootEl.querySelector("[data-daily-feed-exit]");

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

    const resumeOverlay = rootEl.querySelector("[data-daily-feed-resume-overlay]");
    const resumeButton = rootEl.querySelector("[data-daily-feed-resume]");
    const resumeStatus = rootEl.querySelector("[data-daily-feed-resume-status]");
    const resumeBackButton = rootEl.querySelector("[data-daily-feed-resume-back]");

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
    const resultCatchesEl =
      rootEl.querySelector(
        "[data-daily-feed-result-catches]"
      );

    if (
      !gameEl ||
      !exitButton ||
      !stage ||
      !canvas ||
      !catcher ||
      !petCircle ||
      !scoreEl ||
      !scorePopupsEl ||
      !startOverlay ||
      !resumeOverlay ||
      !resumeButton ||
      !resumeBackButton ||
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
              onBackToZoo,
              onRecoveryExitToZoo
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

    // The Native-only Classic tester cannot create/resume a Feeding
    // AudioContext before the user has even checked the Native box.
    // Defer Web-only resource allocation until Got It! in the unchecked
    // comparison run. All other game modes retain their original setup.
    const nativePilotAllowed =
      session.dailyTodoPreview === true &&
      mode === FEED_MODES.CLASSIC &&
      window.BibloZooFeedingNativeAudioPilot?.isIOS?.() === true;
    if (nativePilotAllowed && preparedAudioContext) {
      stopAudioContext(preparedAudioContext);
      preparedAudioContext = null;
    }
    const audioContext = nativePilotAllowed
      ? null : (preparedAudioContext || prepareAudio());
    preparedAudioContext = null;

    const starAudio =
      audioContext || nativePilotAllowed
        ? null
        : new Audio(
          `${ASSET_BASE}dq_feed_star.mp3`
        );

    if (starAudio) {
      starAudio.preload = "auto";
      starAudio.volume = feedingSoundVolume(0.82);

      try {
        starAudio.load();
      } catch (err) { }
    }

    const chompAudio = audioContext || nativePilotAllowed
      ? null
      : new Audio(`${ASSET_BASE}dq_feed_chomp.mp3`);

    if (chompAudio) {
      chompAudio.preload = "auto";
      chompAudio.volume = feedingSoundVolume(0.85);
      try { chompAudio.load(); } catch (err) { }
    }

    const now = performance.now();
    const scheduled =
      buildScheduledBalls();

    const runtime = {
      running: false,
      roundStarted: false,
      finished: false,
      nativePilotAllowed,
      nativePilotCheckbox: nativePilotAllowed
        ? startOverlay.querySelector("[data-daily-feed-native-opt-in]") : null,
      nativePilotChoiceStatus: nativePilotAllowed
        ? startOverlay.querySelector("[data-daily-feed-native-choice-status]") : null,
      nativePilotBadge: nativePilotAllowed
        ? gameEl.querySelector("[data-daily-feed-native-badge]") : null,
      nativePilotPhases: nativePilotAllowed
        ? gameEl.querySelector("[data-daily-feed-native-phases]") : null,
      nativePilotTrace: [],
      nativePilot: null,
      nativePilotBackend: "web",
      nativePilotChoicePending: false,
      nativePilotChangeHandler: null,
      requestedMode,
      earnedStarPegCount,
      requestedMelodyId:
        String(
          session.feedMelodyId || ""
        ).trim(),
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
      exitButton,
      exitHandler: null,
      stage,
      canvas,
      catcher,
      petCircle,
      scoreEl,
      scorePopupsEl,
      startOverlay,
      resumeOverlay,
      resumeButton,
      resumeStatus,
      resumeBackButton,
      resumeButtonHandler: null,
      resumeBackHandler: null,
      zooEscape: null,
      zooDevScenario: null,
      zooDevTeardown: null,
      zooDevTestEverActivated: false,
      zooSoundClockSample: null,
      zooSoundLastAt: -Infinity,
      feedPausedAt: null,
      feedResumePending: false,
      feedResumeGeneration: 0,
      feedAudioRecoveryVerified: false,
      feedAudioNeedsFreshContext: false,
      feedAudioReplacements: 0,
      feedAudioLastReplacementAt: 0,
      feedFrameGeneration: 0,
      feedStartAudioWatchdog: null,
      feedResumeWatchdog: null,
      feedPageHidden: false,
      tiltFallbackId: null,
      feedSoundNodes: new Set(),
      startTitleEl: startOverlay.querySelector("[data-daily-feed-start-title]"),
      startBallsEl: startOverlay.querySelector(".daily-feed-start-balls"),
      startInstructionEl: startOverlay.querySelector("[data-daily-feed-start-instruction]"),
      startChoiceEl: startOverlay.querySelector("[data-daily-feed-start-choice]"),
      startConfirmEl: startOverlay.querySelector("[data-daily-feed-start-confirm]"),
      startSelectedIconEl: startOverlay.querySelector("[data-daily-feed-selected-icon]"),
      startConfirmButton: startOverlay.querySelector("[data-daily-feed-confirm-button]"),
      startControlMessageEl: startOverlay.querySelector("[data-daily-feed-control-message]"),
      controlPhase: "choose",
      controlMode: null,
      controlChoicePending: false,
      controlStoppedAt: null,
      resultOverlay,
      resultTitleEl,
      resultScoreEl,
      resultBackButton,
      resultCatchesEl,
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
      dailyTodoPreview:
        session.dailyTodoPreview === true,
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
      // No input method is active until the child chooses it.
      tiltEnabled: false,
      tiltPermissionPreapproved: session.rewardTiltPermissionGranted === true,
      tiltObserved: false,
      neutralGamma: null,
      smoothedTilt: 0,
      tiltSamples: [],
      tiltCalibrationUntil: 0,
      orientationHandler: null,
      pointerDownHandler: null,
      pointerMoveHandler: null,
      pointerEndHandler: null,
      resizeHandler: null,
      resizeObserver: null,
      reducedMotion: !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
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
          : null,
      onRecoveryExitToZoo: typeof onRecoveryExitToZoo === "function"
        ? onRecoveryExitToZoo : null
    };

    activeRuntime = runtime;
    runtime.modeController
      .initialize(runtime);
    attachFeedInterruptionHandlers(runtime);

    stage.style.backgroundImage =
      `url("${chooseBackground(
        width,
        height
      )}")`;

    if (mode === FEED_MODES.BOUNCE) {
      setBouncePaddleX(runtime, width / 2);
    } else {
      setCatcherX(runtime, width / 2);
    }

    runtime.orientationHandler = (event) => {
      if (runtime.controlMode !== "tilt" || activeRuntime !== runtime ||
          !runtime.roundStarted || runtime.finished ||
          runtime.feedPausedAt != null) return;
      runtime.modeController.handleInput(runtime, { type: "tilt", event });
    };

    runtime.resizeHandler = () => {
      if (activeRuntime !== runtime) return;
      resizeFeedStage(runtime);
    };
    window.addEventListener("resize", runtime.resizeHandler);
    window.addEventListener("orientationchange", runtime.resizeHandler);
    if (typeof ResizeObserver !== "undefined") {
      runtime.resizeObserver = new ResizeObserver(runtime.resizeHandler);
      runtime.resizeObserver.observe(stage);
    }

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
                rect.left,
              axis: pointerFeedAxis(event.clientX - rect.left, rect.width)
            }
          );
      };

    runtime.pointerDownHandler =
      (event) => {
        if (
          activeRuntime !== runtime ||
          runtime.controlMode !== "drag" ||
          !runtime.roundStarted ||
          runtime.finished ||
          runtime.feedPausedAt != null
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
          runtime.controlMode !== "drag" ||
          activeRuntime !== runtime ||
          runtime.finished ||
          runtime.feedPausedAt != null
        ) {
          return;
        }

        event.preventDefault();
        moveCatcher(event);
      };

    runtime.pointerEndHandler =
      (event) => {
        if (
          activeRuntime !== runtime ||
          runtime.controlMode !== "drag" ||
          !runtime.dragging ||
          runtime.activePointerId !== event.pointerId ||
          runtime.feedPausedAt != null
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
          runtime.neutralGamma = null;
          runtime.tiltSamples = [];
          runtime.tiltCalibrationUntil = performance.now() + TILT_CALIBRATION_MS;
        }

        try {
          stage.releasePointerCapture(
            event.pointerId
          );
        } catch (err) { }
      };

    runtime.startOverlayHandler = (event) => {
      // The ordinary intro uses delegated clicks and preventDefault to
      // avoid accidental gestures. That same preventDefault canceled the
      // iPhone's checkbox/label default toggle in the experimental preview.
      // Let ONLY the native-choice label and its input retain their normal
      // click default; they never start a round or choose a control.
      if (runtime.nativePilotAllowed &&
          event.target?.closest?.("[data-daily-feed-native-pilot-opt]")) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (activeRuntime !== runtime || runtime.feedPausedAt != null) return;

      if (runtime.controlPhase === "choose") {
        const button = event.target?.closest?.("[data-daily-feed-control]");
        const choice = button?.getAttribute?.("data-daily-feed-control");
        if (choice === "drag" || choice === "tilt") {
          void chooseFeedingControl(runtime, choice);
        }
        return;
      }
      if (performance.now() < runtime.introUnlockAt) return;
      if (runtime.controlPhase === "instructions") {
        if (!event.target?.closest?.("[data-daily-feed-confirm-button]")) return;
        if (runtime.roundStarted && runtime.controlStoppedAt != null) {
          // Recover the original round, including Melody's song timeline.
          const now = performance.now();
          const duration = Math.max(0, now - runtime.controlStoppedAt);
          shiftFeedingDeadlines(runtime, duration);
          if (runtime.melody?.startTime != null) runtime.melody.startTime += duration;
          runtime.controlStoppedAt = null;
          runtime.controlPhase = "playing";
          runtime.lastFrameAt = now;
          runtime.running = true;
          runtime.startOverlay.hidden = true;
          if (runtime.tiltEnabled) {
            beginTiltCalibration(runtime);
            window.addEventListener("deviceorientation", runtime.orientationHandler);
            armTiltObservationFallback(runtime);
          }
          runtime.rafId = scheduleFeedFrame(runtime);
        } else {
          if (runtime.nativePilotAllowed) {
            void startPreviewRoundWithAudioChoice(runtime);
          } else {
            startRound(runtime);
          }
        }
      } else if (runtime.controlPhase === "serve" &&
                 runtime.mode === FEED_MODES.BOUNCE && runtime.roundStarted) {
        launchBounceServe(runtime);
        runtime.controlPhase = "playing";
      }
    };

    runtime.exitHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeRuntime !== runtime || runtime.finished || runtime.feedPausedAt != null) return;
      const shouldClose = runtime.onBackToZoo?.();
      if (shouldClose !== false) stop();
    };

    // Feeding is the first activity to opt into Zoo Escape. The shared
    // controller supplies UI and a bounded state machine; only Feeding owns
    // its audio probe, session/score data, and navigation cleanup.
    if (window.BibloZooZooEscape?.create) {
      runtime.zooEscape = window.BibloZooZooEscape.create({
        overlay: runtime.resumeOverlay,
        name: runtime.zookeeperName,
        petName: runtime.petName,
        reducedMotion: runtime.reducedMotion,
        isTestRun: () => !!runtime.zooDevScenario,
        recover: () => {
          // A deliberate pilot scenario substitutes only this bool result.
          // Normal players still enter the unchanged verified audio path.
          if (runtime.zooDevScenario) {
            return getFeedZooTestResult(runtime);
          }
          return new Promise(resolve => {
            // Native activation and AudioContext.resume() stay directly
            // inside the child's click in real (non-test) gameplay.
            attemptFeedingResumeFromGesture(runtime, resolve);
          });
        },
        onRecovered: () => {
          // The next *real* interruption must always use verified audio,
          // never retain this manually chosen developer scenario.
          runtime.zooDevScenario = null;
          if (activeRuntime === runtime && runtime.feedPausedAt == null) {
            runtime.resumeOverlay.hidden = true;
            runtime.zooSoundClockSample = null;
          }
        },
        onExit: () => {
          if (activeRuntime !== runtime) return;
          // Exit is never conditioned on earning a daily reward: the host
          // may provide an explicit abort path with no completion credit.
          const exit = runtime.onRecoveryExitToZoo || runtime.onBackToZoo;
          const handled = exit?.();
          if (handled !== false) stop();
          else {
            recordFeedAudioRecovery("feed-zoo-escape-exit-deferred", runtime);
            // Never leave the child trapped behind an expired modal.
            stop();
          }
        },
        // Optional in-mini-game sounds are allowed only after a passive
        // clock-advance check. They never unlock audio or resume gameplay.
        soundIsReady: () => runtime.nativePilotBackend !== "native" &&
          zooEscapeSoundReady(runtime),
        onPop: () => {
          if (runtime.nativePilotBackend !== "native")
            playZooEscapeSound(runtime, "pop");
        },
        onBounce: () => {
          if (runtime.nativePilotBackend !== "native")
            playZooEscapeSound(runtime, "bounce");
        }
      });
    }

    // Pilot-only hidden entry: hold the active score badge for 2.4s.
    attachFeedZooTestHarness(runtime);

    runtime.resumeButtonHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      attemptFeedingResumeFromGesture(runtime);
    };
    runtime.resumeBackHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeRuntime !== runtime || runtime.feedPausedAt == null) return;
      // The visible Back pill is available throughout all three stages.
      // A Daily Questions reward may decline the normal Back action, so its
      // owner supplies an explicit abort without awarding completion credit.
      const exit = runtime.nativePilotBackend === "native" ||
        runtime.zooEscape?.isPaused?.()
        ? (runtime.onRecoveryExitToZoo || runtime.onBackToZoo)
        : runtime.onBackToZoo;
      const shouldClose = exit?.();
      if (shouldClose !== false) stop();
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

        const goBack = runtime.zooDevTestEverActivated
          ? (runtime.onRecoveryExitToZoo || runtime.onBackToZoo)
          : runtime.onBackToZoo;

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
    if (runtime.nativePilotAllowed && runtime.nativePilotCheckbox) {
      runtime.nativePilotChangeHandler = () => {
        if (activeRuntime !== runtime || runtime.roundStarted ||
            runtime.finished || runtime.controlPhase !== "instructions") return;
        if (runtime.nativePilotChoiceStatus) {
          runtime.nativePilotChoiceStatus.textContent =
            runtime.nativePilotCheckbox.checked
              ? "Native ONLY selected. Got It! tests native star/chomp, no Web fallback."
              : "Web effects selected (default).";
        }
        runtime.nativePilotTrace = [];
        if (runtime.nativePilotPhases && !runtime.nativePilotCheckbox.checked) {
          runtime.nativePilotPhases.textContent = "Native-only diagnostic: Web comparison selected";
        }
        if (runtime.nativePilotCheckbox.checked) {
          // Separate checkbox gesture precedes Got It!, so this is our
          // best read-only baseline without consuming Got It's activation.
          void recordNativePreviewPhase(runtime, "selected-native");
        }
      };
      runtime.nativePilotCheckbox.addEventListener(
        "change", runtime.nativePilotChangeHandler
      );
    }

    exitButton.addEventListener("click", runtime.exitHandler);
    if (!runtime.zooEscape) {
      // Older builds without the shared controller retain a usable resume.
      resumeButton.addEventListener("click", runtime.resumeButtonHandler);
    }
    resumeBackButton.addEventListener("click", runtime.resumeBackHandler);

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
