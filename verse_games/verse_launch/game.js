(async function () {
  const app = document.getElementById("app");
  if (app) app.classList.add("vm-shell", "vl-shell");

  const ctx = await window.VerseGameBridge.getVerseContext();
  const GAME_ID = "chain";
  const GAME_TITLE = "Verse Launch";
  const GAME_ICON = "🚀";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);

  const GAME_THEME = {
    bg: "#7f66c6",
    accent: "#7f66c6"
  };

  const BUILD_AREA = "large";

  const HELP_OVERLAY_ID = "vlHelpOverlay";

  const ROCKETS = [
    { key: "red", src: "./verse_launch_images/verse_launch_rocket_red.png", color: "#ff5a51", textDark: false },
    { key: "blue", src: "./verse_launch_images/verse_launch_rocket_blue.png", color: "#64b5f6", textDark: false },
    { key: "yellow", src: "./verse_launch_images/verse_launch_rocket_yellow.png", color: "#ffc751", textDark: true }
  ];

  const ASTEROID_IMAGE_SRC = "./verse_launch_images/verse_launch_asteroid.png";
  const MOON_IMAGE_SRC = "./verse_launch_images/verse_launch_moon.png";
  const STAR_IMAGE_SRC = "./verse_launch_images/verse_launch_star.svg";
  const RAINBOW_ROCKET_IMAGE_SRC = "./verse_launch_images/verse_images_rainbow_rocket.svg";
  const UFO_TOP_IMAGE_SRC = "./verse_launch_images/verse_launch_ship_top.svg";
  const UFO_LIGHTS_IMAGE_SRC = "./verse_launch_images/verse_launch_ship_lights.svg";
  const UFO_BOTTOM_IMAGE_SRC = "./verse_launch_images/verse_launch_ship_bottom.svg";

  const SOUND_BASE_PATH = "./verse_launch_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

  const SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,

    correctTap: `${SOUND_BASE_PATH}verse_launch_zoom.mp3`,
    wrongTap: `${SOUND_BASE_PATH}verse_launch_wrong.mp3`,
    wordAdded: `${SOUND_BASE_PATH}verse_launch_collect.mp3`,
    asteroidDestroyed: `${SOUND_BASE_PATH}verse_launch_explode.mp3`,
    playerAsteroidHit: `${SOUND_BASE_PATH}verse_launch_explode_2.mp3`,
    landingStart: `${SOUND_BASE_PATH}verse_launch_land.mp3`,
    launchButton: `${SOUND_BASE_PATH}verse_launch_launch.mp3`,
    cutsceneRocketEnter: `${SOUND_BASE_PATH}verse_launch_launch_2.mp3`,
    starCollected: `${SOUND_BASE_PATH}verse_launch_collect.mp3`
  };

  const SOUND_TUNING = {
    masterVolume: 0.90,
    volumes: {
      correctTap: 0.50,
      wrongTap: 0.75,
      wordAdded: 0.55,
      asteroidDestroyed: 0.55,
      playerAsteroidHit: 0.90,
      landingStart: 0.80,
      launchButton: 0.90,
      cutsceneRocketEnter: 0.80,
      starCollected: 0.50,
      countdownBeep: 0.92,
      countdownFinalBeep: 0.52,

      // Generated projectile volley sounds.
      // Tick is the brighter shot, tock is the softer/lower shot.
      projectileTick: 0.12,
      projectileTock: 0.085,

      // Shared UI/menu tap sounds.
      uiTap: 0.45
    }
  };

  const COUNTDOWN_BEEP_C4 = 261.63;
  const COUNTDOWN_BEEP_C5 = 523.25;
  const PROJECTILE_TICK_FREQ_START = 880;
  const PROJECTILE_TICK_FREQ_END = 1180;
  const PROJECTILE_TOCK_FREQ_START = 620;
  const PROJECTILE_TOCK_FREQ_END = 820;
  const PROJECTILE_FIRE_SOUND_MS = 58;

  const BUILD_STREAK_COLORS = [
    "#ffc751", // level 1
    "#a7cb6f", // level 2
    "#64b5f6", // level 3
    "#ff8cc8", // level 4
    "#ffffff"  // level 5
  ];

  

  const WORD_BURST_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;

  const FUN_DECOYS = window.VerseGameShell.getFunDecoys();

  const BIBLE_BOOKS = window.VerseGameShell.getBibleBookDecoys();

  const state = {
    screen: "intro",
    mode: null,
    words: [],
    segments: [],
    metaIndices: new Set(),
    buildSizeClass: "is-normal",
    progressIndex: 0,
    buildRemoving: new Set(),
    choices: [],
    choiceIndex: 0,

    conveyorItems: [],
    conveyorRaf: 0,
    conveyorLastTs: 0,
    conveyorNextId: 0,
    conveyorTextHidden: false,
    conveyorCorrectVisible: false,
    conveyorSpawnCount: 0,
    conveyorForceCorrectIn: 1,
    conveyorCorrectLabel: "",
    conveyorDecoyLabels: [],

    busy: false,
    menuOpen: false,
    helpOpen: false,
    helpBackMode: false,
    completed: false,
    startTime: 0,
    endTime: 0,
    completionResult: null,
    bookLabel: "",
    referenceLabel: "",
    referenceMeta: null,
    medalMessage: "",
    medalSubmessage: "",
    countdownValue: "",
    bonusReady: false,
    bonusTravelTextVisible: false,
    hasShownInitialCountdown: false,
    bonusFadeActive: false,
    bonusRocketColorKey: "red",
    bonusOutcome: "",
    bonusMedalAlreadyEarned: false,
    correctStreak: 0,
    uiSoundFlip: false,

    astroHits: 0,
    astroInvulnerable: false,
    astroTimerMs: 0,
    astroPlayerX: 0.5,
    astroMoveDir: 0,
    astroPlayerTilt: 0,
    astroSpinDeg: 0,
    astroSpinMs: 0,
    astroAsteroids: [],
    astroStars: [],
    astroProjectiles: [],
    astroStarCount: 0,
    astroSpawnCooldownMs: 0,
    astroStarSpawnCooldownMs: 0,
    astroProjectileCooldownMs: 0,
    astroProjectileColorIndex: 0,
    astroProjectileSoundFlip: false,
    astroLastSpawnX: -1,
    astroLastStarSpawnX: -1,
    astroDrainPhase: false,
    astroDrainFadeMs: 0,
    astroLandingMessageVisible: false,
    astroRunning: false,
    astroMoonPhase: false,
    astroMoonY: -240,
    astroMoonVisible: false,
    astroMoonDone: false,
    astroLandingPhase: false,
    astroPlayerLiftPx: 0,
    astroPlayerScale: 1,
    astroLastTs: 0,
    astroRaf: 0,
  };

  let muted = false;

  let audioCtx = null;
  let silenceAudio = null;
  let audioUnlocked = false;
  const soundBuffers = new Map();
  const soundBufferPromises = new Map();

  const astroInput = {
    leftKey: false,
    rightKey: false,
    pointerDir: 0,
    tiltEnabled: false,
    tiltPermissionState: "unknown",
    tiltRawDir: 0,
    tiltDir: 0
  };

  const ASTRO_DURATION_BY_MODE_MS = {
    easy: 22000,
    medium: 25500,
    hard: 30000
  };

  const ASTRO_HITBOX_SCALE = 0.5;
  const STAR_HITBOX_SCALE = 0.78;
  const PROJECTILE_HITBOX_SCALE = 0.85;
  const PROJECTILE_ASTEROID_HITBOX_SCALE = 0.78;
  const ASTRO_BASE_SPEED_VH_PER_SEC = 42;
  const STAR_BASE_SPEED_VH_PER_SEC = 34;
  const PROJECTILE_BASE_SPEED_VH_PER_SEC = 126;
  const ASTRO_MODE_MULTIPLIER = { easy: 1, medium: 1.18, hard: 1.38 };
  const STAR_MODE_MULTIPLIER = { easy: 0.92, medium: 1, hard: 1.08 };
  const BLASTER_STAR_COUNT = 4;
  const SPREAD_SHOT_STAR_COUNT = 5;
  const ASTEROID_SHOT_STAR_REWARD = 5;
  const ASTEROID_REWARD_STAR_SCALE = 0.20;
  const PROJECTILE_COOLDOWN_MS = 520;
  const PROJECTILE_COLORS = [
    "#ff5a51",
    "#ffa351",
    "#ffc751",
    "#a7cb6f",
    "#64b5f6",
    "#7f66c6",
    "#ff8cc8"
  ];

  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

  function medalIconHtmlForMode(mode) {
    const medalByMode = {
      easy: {
        src: "../../verse_images/bronze_medal.png",
        fallback: "🥉",
        alt: "Bronze medal"
      },
      medium: {
        src: "../../verse_images/silver_medal.png",
        fallback: "🥈",
        alt: "Silver medal"
      },
      hard: {
        src: "../../verse_images/gold_medal.png",
        fallback: "🥇",
        alt: "Gold medal"
      }
    };

    const medal = medalByMode[mode];

    if (!medal) return "";

    return window.VerseGameShell.gameIconImageHtml(
      medal.src,
      medal.fallback,
      medal.alt
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  const shuffle = window.VerseGameShell.shuffle;


  function tokenizeVerse(text) {
    return window.VerseGameShell.tokenizeVerseWords(text);
  }

  function normalizeWord(value) {
    return window.VerseGameShell.normalizeWord(value);
  }

  function preloadImages(srcList) {
    return Promise.all(
      srcList.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't block the game if one fails
        img.src = src;
      }))
    );
  }

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx = new AudioContextCtor();
    }

    return audioCtx;
  }

  function ensureSilenceAudio() {
    if (silenceAudio) return silenceAudio;

    silenceAudio = new Audio("../../verse_audio/silence.mp3");
    silenceAudio.preload = "auto";
    silenceAudio.loop = false;
    silenceAudio.volume = 0.001;
    silenceAudio.setAttribute("playsinline", "true");

    return silenceAudio;
  }

  async function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return false;

    try {
      const silent = ensureSilenceAudio();
      silent.currentTime = 0;

      const silentPlay = silent.play();
      if (silentPlay && typeof silentPlay.catch === "function") {
        silentPlay.catch(() => { });
      }
    } catch (err) {
      // Best effort only.
    }

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.value = 0.0001;
      osc.frequency.value = 440;
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);

      audioUnlocked = true;
      preloadSoundBuffers();

      return true;
    } catch (err) {
      return false;
    }
  }

  function soundVolume(key) {
    const master = Number(SOUND_TUNING.masterVolume);
    const individual = Number(SOUND_TUNING.volumes[key]);

    const safeMaster = Number.isFinite(master) ? master : 1;
    const safeIndividual = Number.isFinite(individual) ? individual : 1;

    return Math.max(0, Math.min(1, safeMaster * safeIndividual));
  }

  async function loadSoundBuffer(key) {
    const ctx = getAudioContext();
    const src = SOUND_FILES[key];

    if (!ctx || !src) return null;
    if (soundBuffers.has(key)) return soundBuffers.get(key);
    if (soundBufferPromises.has(key)) return soundBufferPromises.get(key);

    const promise = fetch(src)
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load sound: ${src}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
      .then(buffer => {
        soundBuffers.set(key, buffer);
        return buffer;
      })
      .catch(err => {
        console.warn(err);
        return null;
      })
      .finally(() => {
        soundBufferPromises.delete(key);
      });

    soundBufferPromises.set(key, promise);
    return promise;
  }

  function preloadSoundBuffers() {
    Object.keys(SOUND_FILES).forEach(key => {
      loadSoundBuffer(key);
    });
  }

  async function playGameSound(key, volumeKey = key) {
    if (muted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const buffer = await loadSoundBuffer(key);
      if (!buffer) return;

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      gain.gain.value = soundVolume(volumeKey);
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0);
    } catch (err) {
      // Sound should never break gameplay.
    }
  }

  function playUiTapSound() {
    const key = state.uiSoundFlip ? "uiTap2" : "uiTap1";
    state.uiSoundFlip = !state.uiSoundFlip;
    playGameSound(key, "uiTap");
  }

  async function playCountdownBeep(finalBeep = false) {
    if (muted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const volumeKey = finalBeep ? "countdownFinalBeep" : "countdownBeep";

      osc.type = "sine";
      osc.frequency.setValueAtTime(finalBeep ? COUNTDOWN_BEEP_C5 : COUNTDOWN_BEEP_C4, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, soundVolume(volumeKey)), now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (err) {
      // Best effort only.
    }
  }

  async function playProjectileFireSound() {
    if (muted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const isTock = state.astroProjectileSoundFlip;
      state.astroProjectileSoundFlip = !state.astroProjectileSoundFlip;

      const now = ctx.currentTime;
      const durationSec = PROJECTILE_FIRE_SOUND_MS / 1000;
      const volumeKey = isTock ? "projectileTock" : "projectileTick";
      const startFreq = isTock ? PROJECTILE_TOCK_FREQ_START : PROJECTILE_TICK_FREQ_START;
      const endFreq = isTock ? PROJECTILE_TOCK_FREQ_END : PROJECTILE_TICK_FREQ_END;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, soundVolume(volumeKey)), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch (err) {
      // Sound should never break gameplay.
    }
  }

  function parseReferenceParts(ref, translation, verseId) {
    return window.VerseGameShell.parseReferenceParts(ref, translation, verseId);
  }


  await preloadImages([
    ...ROCKETS.map(r => r.src),
    ASTEROID_IMAGE_SRC,
    MOON_IMAGE_SRC,
    STAR_IMAGE_SRC,
    RAINBOW_ROCKET_IMAGE_SRC,
    UFO_TOP_IMAGE_SRC,
    UFO_LIGHTS_IMAGE_SRC,
    UFO_BOTTOM_IMAGE_SRC
  ]);

  function initVerseData() {
    const parsed = parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
    const buildData = window.VerseGameShell.buildVerseSegments({
      verseText: ctx.verseText || "",
      book: parsed.book,
      reference: parsed.reference,
      buildArea: BUILD_AREA
    });

    state.words = buildData.words;
    state.referenceMeta = parsed;
    state.bookLabel = buildData.bookLabel;
    state.referenceLabel = buildData.referenceLabel;
    state.buildSizeClass = buildData.buildSizeClass;
    state.segments = buildData.segments;
    state.metaIndices = buildData.metaIndices;
    state.progressIndex = 0;
    state.buildRemoving = new Set();
    state.choices = [];
    state.choiceIndex = 0;

    stopConveyorLoop();
    state.conveyorItems = [];
    state.conveyorLastTs = 0;
    state.conveyorNextId = 0;
    state.conveyorTextHidden = false;
    state.conveyorCorrectVisible = false;
    state.conveyorSpawnCount = 0;
    state.conveyorForceCorrectIn = 1;
    state.conveyorCorrectLabel = "";
    state.conveyorDecoyLabels = [];

    state.busy = false;
    state.menuOpen = false;
    state.helpOpen = false;
    state.helpBackMode = false;
    state.completed = false;
    state.completionResult = null;
    state.medalMessage = "";
    state.medalSubmessage = "";
    state.countdownValue = "";
    state.hasShownInitialCountdown = false;
    state.bonusReady = false;
    state.bonusTravelTextVisible = false;
    state.bonusFadeActive = false;
    state.bonusRocketColorKey = "red";
    state.bonusOutcome = "";
    state.bonusMedalAlreadyEarned = false;
    state.correctStreak = 0;
    state.uiSoundFlip = false;

    state.astroHits = 0;
    state.astroInvulnerable = false;
    state.astroTimerMs = 0;
    state.astroPlayerX = 0.5;
    state.astroMoveDir = 0;
    state.astroPlayerTilt = 0;
    state.astroSpinDeg = 0;
    state.astroSpinMs = 0;
    state.astroAsteroids = [];
    state.astroStars = [];
    state.astroProjectiles = [];
    state.astroStarCount = 0;
    state.astroSpawnCooldownMs = 0;
    state.astroStarSpawnCooldownMs = 0;
    state.astroProjectileCooldownMs = 0;
    state.astroProjectileColorIndex = 0;
    state.astroProjectileSoundFlip = false;
    state.astroLastSpawnX = -1;
    state.astroLastStarSpawnX = -1;
    state.astroDrainPhase = false;
    state.astroDrainFadeMs = 0;
    state.astroLandingMessageVisible = false;
    state.astroRunning = false;
    state.astroMoonPhase = false;
    state.astroMoonY = -340;
    state.astroMoonVisible = false;
    state.astroMoonDone = false;
    state.astroLandingPhase = false;
    state.astroPlayerLiftPx = 0;
    state.astroPlayerScale = 1;
    state.astroDrainPhase = false;
    state.astroLastTs = 0;
    if (state.astroRaf) {
      cancelAnimationFrame(state.astroRaf);
      state.astroRaf = 0;
    }
  }

  function currentPhase() {
    return window.VerseGameShell.getPhaseForProgress({
      progressIndex: state.progressIndex,
      wordCount: state.words.length,
      totalSegments: state.segments.length,
      bookLabel: state.bookLabel,
      referenceLabel: state.referenceLabel
    });
  }
  function currentCorrectLabel() { return state.segments[state.progressIndex] || ""; }

  function uniqueVisibleChoices(correct, decoys) {
    const out = [correct];
    const seen = new Set([normalizeWord(correct)]);
    for (const d of decoys) {
      const key = normalizeWord(d);
      if (!key || seen.has(key)) continue;
      seen.add(key); out.push(d);
      if (out.length >= 3) break;
    }
    return out;
  }
  function verseWordDecoys(correct) {
    return window.VerseGameShell.getVerseWordDecoys({
      words: state.words,
      correct,
      targetIndex: state.progressIndex,
      count: 24,
      avoidNext: 2,
      fallbackToFun: false
    });
  }

  function verseOnlyFallbackDecoys(correct) {
    const correctKey = normalizeWord(correct);
    const seen = new Set([correctKey]);
    const out = [];

    for (const word of state.words) {
      const key = normalizeWord(word);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      out.push(word);
    }

    return shuffle(out);
  }
  function easyDecoys(correct) {
    return window.VerseGameShell.getFunWordDecoys(correct, state.words, 12);
  }

  function bookDecoys(correct) {
    return window.VerseGameShell.getBookDecoys(correct, 12);
  }

  function refDecoys(correctRef) {
    return shuffle(
      window.VerseGameShell
        .getReferenceDecoys(state.referenceMeta, state.mode, 6)
        .filter((ref) => normalizeWord(ref) !== normalizeWord(correctRef))
    );
  }

  function buildChoices() {
    const correct = currentCorrectLabel();
    const phase = currentPhase();
    let decoyPool = [];

    if (phase === "words") {
      if (state.mode === "easy") {
        decoyPool = easyDecoys(correct);
      } else {
        decoyPool = verseWordDecoys(correct);

        if (decoyPool.length < 8) {
          decoyPool = decoyPool.concat(verseOnlyFallbackDecoys(correct));
        }
      }
    } else if (phase === "book") {
      decoyPool = bookDecoys(correct);
    } else if (phase === "reference") {
      decoyPool = refDecoys(correct);
    }

    const normalizedCorrect = normalizeWord(correct);
    const conveyorDecoys = [];
    const seenDecoys = new Set([normalizedCorrect]);

    for (const label of decoyPool) {
      const key = normalizeWord(label);
      if (!key || seenDecoys.has(key)) continue;

      seenDecoys.add(key);
      conveyorDecoys.push(label);
    }

    while (conveyorDecoys.length < 10) {
      let fallback = [];

      if (phase === "words") {
        fallback = state.mode === "easy"
          ? easyDecoys(correct)
          : verseOnlyFallbackDecoys(correct);
      } else if (phase === "book") {
        fallback = bookDecoys(correct);
      } else if (phase === "reference") {
        fallback = refDecoys(correct);
      }

      let added = false;

      for (const item of fallback) {
        const key = normalizeWord(item);
        if (!key || seenDecoys.has(key)) continue;

        seenDecoys.add(key);
        conveyorDecoys.push(item);
        added = true;

        if (conveyorDecoys.length >= 10) break;
      }

      if (!added) break;
    }

    const labels = uniqueVisibleChoices(correct, conveyorDecoys).slice(0, 3);

    while (labels.length < 3) {
      for (const item of conveyorDecoys) {
        if (labels.map(normalizeWord).includes(normalizeWord(item))) continue;
        labels.push(item);
        if (labels.length >= 3) break;
      }

      if (labels.length < 3) break;
    }

    const skins = shuffle(ROCKETS).slice(0, 3);

    state.choices = shuffle(labels).map((label, index) => ({
      id: `choice_${index}_${Date.now()}`,
      label,
      isCorrect: normalizeWord(label) === normalizedCorrect,
      rocket: skins[index % skins.length]
    }));

    state.conveyorCorrectLabel = correct;
    state.conveyorDecoyLabels = conveyorDecoys;
    state.choiceIndex = 1;
  }

  function renderBuildText() {
    return window.VerseGameShell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: state.bookLabel,
      reference: state.referenceLabel,
      progressIndex: state.progressIndex,
      buildArea: BUILD_AREA,
      hideUnbuilt: state.mode === "hard",
      extraClass: "vl-build-text"
    });
  }

  function fitBuildText() {
    requestAnimationFrame(() => {
      window.VerseGameShell.fitBuildTextOnce({
        buildEl: document.getElementById("vlBuild"),
        textEl: document.getElementById("vlBuildText"),
        buildArea: BUILD_AREA
      });
    });
  }

  function syncBuildStreakOverlay({ pulse = false, broken = false } = {}) {
    const buildEl = document.getElementById("vlBuild");
    if (!buildEl || !window.VerseGameShell.updateBuildStreakOverlay) return;

    window.VerseGameShell.updateBuildStreakOverlay({
      buildEl,
      streak: state.correctStreak,
      colors: BUILD_STREAK_COLORS,
      
      pulse,
      broken
    });
  }

  function formatMode(mode) { return mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "Mode"; }
  function totalElapsedMs() { return Math.max(1, (state.endTime || performance.now()) - state.startTime); }

  function helpHtml() {
    return `
    Tap the next correct word to launch it into the verse.<br><br>
    After the verse, steer your rocket to avoid the asteroids and make it to the moon!
  `;
  }


  function renderHelpOverlay() {
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body: helpHtml(),
      closeText: "Close"
    });
  }

  function renderGameMenuOverlay() {
    return window.VerseGameShell.gameMenuHtml({
      id: "vlGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function syncGameMenuOpenState() {
    const menuOverlay = $("#vlGameMenuOverlay");
    if (!menuOverlay) return;

    if (state.menuOpen) {
      menuOverlay.classList.add("is-open");
      menuOverlay.setAttribute("aria-hidden", "false");
    } else {
      menuOverlay.classList.remove("is-open");
      menuOverlay.setAttribute("aria-hidden", "true");
    }
  }

  function canOpenGameMenu() {
    if (state.busy) return false;
    if (state.screen === "travel") return false;
    return true;
  }

  function renderCountdownOverlay() {
    if (!state.countdownValue) return "";
    return `
      <div class="vl-countdown-overlay" aria-hidden="true">
        <div class="vl-countdown-box is-pop">${escapeHtml(state.countdownValue)}</div>
      </div>`;
  }

  function renderAstroLandingOverlay() {
    return `
      <div
        class="vl-landing-overlay ${state.astroLandingMessageVisible ? "is-visible" : ""}"
        id="vlLandingOverlay"
        aria-hidden="${state.astroLandingMessageVisible ? "false" : "true"}">
        <div class="vl-landing-box">LANDING</div>
      </div>`;
  }

  function syncAstroLandingOverlay() {
    const overlay = document.getElementById("vlLandingOverlay");
    if (!overlay) return;

    overlay.classList.toggle("is-visible", !!state.astroLandingMessageVisible);
    overlay.setAttribute("aria-hidden", state.astroLandingMessageVisible ? "false" : "true");
  }

  function getPreviewChoice(offset) {
    if (!state.choices.length) return null;
    const total = state.choices.length;
    return state.choices[(state.choiceIndex + offset + total) % total];
  }

  function renderLauncher(choice, preview = false) {
    if (!choice) return "";
    return `
      <div class="${preview ? "vl-side-preview" : "vl-main-launcher"} no-zoom" data-choice-id="${choice.id}">
        <div class="${preview ? "" : "vl-rocket-stack"}">
          <img class="${preview ? "vl-preview-rocket" : "vl-rocket"}" src="${choice.rocket.src}" alt="" />
          ${preview ? "" : `<button class="vl-launcher-hitbox no-zoom" data-choice-id="${choice.id}" type="button" aria-label="Launch ${escapeHtml(choice.label)}"></button>`}
        </div>
        <div class="${preview ? "vl-preview-bubble" : `vl-choice-bubble ${choice.rocket.textDark ? "vl-text-dark" : ""}`}" style="--bubble:${choice.rocket.color}">${escapeHtml(choice.label)}</div>
      </div>`;
  }

// Conveyor Belt Speed
  const CONVEYOR_LIGHTS_ONLY_TRAVELED_THRESHOLD = 0.5;
  const CONVEYOR_SHIP_HEIGHT_MULTIPLIER = 2.10;
  const CONVEYOR_SPEED_SHIP_HEIGHTS_PER_SEC = {
    easy: 1.20,
    medium: 1.50,
    hard: 1.80
  };

  function conveyorSpeedPxPerSec() {
    const shipHeightsPerSecond =
      CONVEYOR_SPEED_SHIP_HEIGHTS_PER_SEC[state.mode] ||
      CONVEYOR_SPEED_SHIP_HEIGHTS_PER_SEC.medium;

    return conveyorShipHeightPx() * shipHeightsPerSecond;
  }

  function conveyorShipTopWidthPx() {
    const buttonHeight = Math.min(68, Math.max(44, window.innerWidth * 0.105));
    return buttonHeight * 1.17 * 1.686;
  }

  function conveyorShipHeightPx() {
    const buttonHeight = Math.min(68, Math.max(44, window.innerWidth * 0.105));
    return buttonHeight * CONVEYOR_SHIP_HEIGHT_MULTIPLIER;
  }

  function randomConveyorCorrectDelay() {
    const roll = Math.random();

    // Number of forced decoys before the correct word can spawn.
    // 0 = correct can be the next new UFO.
    // 3 = longest wait, used rarely.
    if (roll < 0.40) return 0;
    if (roll < 0.75) return 1;
    if (roll < 0.95) return 2;
    return 3;
  }

  function resetConveyorTargetPlanner() {
    state.conveyorCorrectVisible = false;
    state.conveyorSpawnCount = 0;
    state.conveyorForceCorrectIn = randomConveyorCorrectDelay();
  }

  function conveyorVisibleItems() {
    return state.conveyorItems.filter(item => !item.removing);
  }

  function conveyorItemsOnscreen() {
    const conveyor = document.getElementById("vlConveyor");
    const rect = conveyor?.getBoundingClientRect();

    if (!rect) return conveyorVisibleItems();

    return conveyorVisibleItems().filter(item => {
      const width = item.width || 0;
      return item.x + width > 0 && item.x < rect.width;
    });
  }

  function conveyorItemsInStream() {
    return conveyorVisibleItems()
      .filter(item => item.id && !item.removing)
      .sort((a, b) => a.x - b.x);
  }

  function shouldKeepConveyorLightsOnly(item) {
    const conveyor = document.getElementById("vlConveyor");
    const rect = conveyor?.getBoundingClientRect();

    if (!rect || !rect.width) return false;

    const width = item.width || 0;
    const centerX = item.x + width / 2;
    const traveledRatio = 1 - (centerX / rect.width);

    return traveledRatio >= CONVEYOR_LIGHTS_ONLY_TRAVELED_THRESHOLD;
  }

  function conveyorVisibleLabelKeys(exceptItemId = "") {
    const keys = new Set();

    conveyorItemsOnscreen().forEach(item => {
      if (item.id === exceptItemId) return;
      if (!item.label || item.blank || item.lightsOnly) return;

      const key = normalizeWord(item.label);
      if (key) keys.add(key);
    });

    return keys;
  }

  function pickUniqueConveyorDecoy(reservedKeys = new Set()) {
    const decoys = shuffle(state.conveyorDecoyLabels || []);

    for (const label of decoys) {
      const key = normalizeWord(label);
      if (!key || reservedKeys.has(key)) continue;

      return label;
    }

    return "";
  }

  function pickConveyorChoiceForSpawn() {
    if (state.conveyorTextHidden) {
      const label = pickUniqueConveyorDecoy(conveyorVisibleLabelKeys());

      return {
        label,
        isCorrect: false,
        blank: !label
      };
    }

    const correctLabel = state.conveyorCorrectLabel || currentCorrectLabel();
    if (!correctLabel) return null;

    const reservedKeys = conveyorVisibleLabelKeys();
    const correctKey = normalizeWord(correctLabel);

    const maySpawnCorrect =
      !state.conveyorCorrectVisible &&
      state.conveyorSpawnCount > 0 &&
      state.conveyorForceCorrectIn <= 0 &&
      !reservedKeys.has(correctKey);

    let label = "";

    if (maySpawnCorrect) {
      label = correctLabel;
    } else {
      label = pickUniqueConveyorDecoy(reservedKeys);
    }

    if (!label) {
      return {
        label: "",
        isCorrect: false,
        blank: true
      };
    }

    const isCorrect = normalizeWord(label) === correctKey;

    if (isCorrect) {
      state.conveyorCorrectVisible = true;
      state.conveyorForceCorrectIn = 0;
    } else if (!state.conveyorCorrectVisible && state.conveyorSpawnCount > 0) {
      state.conveyorForceCorrectIn -= 1;
    }

    state.conveyorSpawnCount += 1;

    return {
      label,
      isCorrect,
      blank: false
    };
  }

  function makeUfoHoverMotion() {
    return {
      bobDelay: Math.round(-Math.random() * 2200),
      bobDuration: Math.round(1500 + Math.random() * 900),
      bobAmount: Number((4 + Math.random() * 6).toFixed(1)),
      wobbleAmount: Number((0.6 + Math.random() * 1.2).toFixed(2))
    };
  }

  function makeConveyorItem(choiceData, x) {
    const id = `conveyor_${Date.now()}_${++state.conveyorNextId}`;
    const hover = makeUfoHoverMotion();

    return {
      id,
      label: choiceData?.label || "",
      isCorrect: !!choiceData?.isCorrect,
      blank: !!choiceData?.blank,
      lightsOnly: !!choiceData?.lightsOnly,
      lockedWidth: 0,
      x,
      width: 0,
      removing: false,
      bobDelay: hover.bobDelay,
      bobDuration: hover.bobDuration,
      bobAmount: hover.bobAmount,
      wobbleAmount: hover.wobbleAmount
    };
  }

  function conveyorItemHtml(item) {
    const hiddenClass = state.conveyorTextHidden || item.blank ? "is-text-hidden" : "";
    const lightsOnlyClass = item.lightsOnly ? "is-lights-only" : "";
    const label = item.label || "";

    const lockedWidthStyle = item.lockedWidth
      ? `--vl-ufo-locked-width:${item.lockedWidth}px;`
      : "";

    return `
      <button
        class="vl-conveyor-choice vl-ufo-choice no-zoom ${hiddenClass} ${lightsOnlyClass}"
        data-choice-id="${item.id}"
        type="button"
        ${state.conveyorTextHidden || item.blank || item.lightsOnly ? "disabled" : ""}
        aria-label="${label ? `Choose ${escapeHtml(label)}` : "Blank UFO"}"
        style="--vl-conveyor-x:${item.x}px;${lockedWidthStyle}">
        <span class="vl-ufo-float" style="--vl-ufo-bob-delay:${item.bobDelay}ms;--vl-ufo-bob-duration:${item.bobDuration || 1800}ms;--vl-ufo-bob-amount:${item.bobAmount || 6}px;--vl-ufo-wobble-amount:${item.wobbleAmount || 1}deg">
          <span class="vl-ufo-top-wrap" aria-hidden="true">
            <img class="vl-ufo-top" src="${UFO_TOP_IMAGE_SRC}" alt="">
          </span>
          <span class="vl-ufo-bottom-wrap" aria-hidden="true">
            <img class="vl-ufo-bottom" src="${UFO_BOTTOM_IMAGE_SRC}" alt="">
          </span>
          <span class="vl-ufo-base">
            <span class="vl-ufo-word">${escapeHtml(label)}</span>
            <img class="vl-ufo-lights" src="${UFO_LIGHTS_IMAGE_SRC}" alt="" aria-hidden="true">
          </span>
        </span>
      </button>`;
  }

  function renderConveyor() {
    return `
      <div class="vl-conveyor" id="vlConveyor" aria-label="Tap the next correct word">
        <div class="vl-conveyor-track ${state.conveyorTextHidden ? "is-text-hidden" : ""}" id="vlConveyorTrack">
          ${state.conveyorItems.map(item => conveyorItemHtml(item)).join("")}
        </div>
      </div>`;
  }

  function appendConveyorItemDom(item) {
    const track = document.getElementById("vlConveyorTrack");
    if (!track) return null;

    const wrap = document.createElement("div");
    wrap.innerHTML = conveyorItemHtml(item).trim();

    const el = wrap.firstElementChild;
    if (!el) return null;

    el.onclick = () => handleLaunch(item.id);
    track.appendChild(el);

    const rect = el.getBoundingClientRect();
    item.width = rect.width || Math.max(220, conveyorShipTopWidthPx() * 1.5);

    return el;
  }

  function updateConveyorItemDom(item) {
    const el = document.querySelector(`.vl-conveyor-choice[data-choice-id="${item.id}"]`);
    if (!el) return;

    el.style.setProperty("--vl-conveyor-x", `${item.x}px`);
  }

  function updateConveyorItemLabelDom(item) {
    const el = document.querySelector(`.vl-conveyor-choice[data-choice-id="${item.id}"]`);
    if (!el) return;

    const word = el.querySelector(".vl-ufo-word");
    if (word) word.textContent = item.label || "";

    el.classList.toggle("is-lights-only", !!item.lightsOnly);

    if (item.lockedWidth) {
      el.style.setProperty("--vl-ufo-locked-width", `${item.lockedWidth}px`);
    } else {
      el.style.removeProperty("--vl-ufo-locked-width");
    }

    if (item.label && !state.conveyorTextHidden && !item.blank && !item.lightsOnly) {
      el.disabled = false;
      el.classList.remove("is-text-hidden");
      el.setAttribute("aria-label", `Choose ${item.label}`);
    } else {
      el.disabled = true;
      el.classList.toggle("is-text-hidden", state.conveyorTextHidden || item.blank);
      el.setAttribute("aria-label", item.lightsOnly ? "UFO lights" : "Blank UFO");
    }

    const rect = el.getBoundingClientRect();
    if (rect.width) item.width = rect.width;
  }

  function removeConveyorItem(itemId) {
    const index = state.conveyorItems.findIndex(item => item.id === itemId);
    if (index < 0) return;

    const [item] = state.conveyorItems.splice(index, 1);

    if (item?.isCorrect) {
      state.conveyorCorrectVisible = false;
    }

    const el = document.querySelector(`.vl-conveyor-choice[data-choice-id="${itemId}"]`);
    if (el) el.remove();
  }

  function setConveyorWordsHidden(hidden) {
    state.conveyorTextHidden = hidden;

    const track = document.getElementById("vlConveyorTrack");
    if (track) track.classList.toggle("is-text-hidden", hidden);

    document.querySelectorAll(".vl-conveyor-choice").forEach(el => {
      el.disabled = hidden;
      el.classList.toggle("is-text-hidden", hidden);
    });
  }

  function relabelVisibleConveyorItemsForCurrentTarget() {
    state.conveyorCorrectVisible = false;

    const items = conveyorItemsInStream();

    const reservedKeys = new Set();

    items.forEach(item => {
      const keepLightsOnly = shouldKeepConveyorLightsOnly(item);
      const el = document.querySelector(`.vl-conveyor-choice[data-choice-id="${item.id}"]`);

      if (keepLightsOnly && el) {
        const rect = el.getBoundingClientRect();
        item.lockedWidth = rect.width || item.width || 0;
        item.width = item.lockedWidth || item.width;
      } else {
        item.lockedWidth = 0;
      }

      let label = pickUniqueConveyorDecoy(reservedKeys);

      if (!label) {
        label = pickUniqueConveyorDecoy(new Set());
      }

      const key = normalizeWord(label);

      item.label = label;
      item.isCorrect = false;
      item.blank = !label;
      item.lightsOnly = keepLightsOnly;

      if (key && !keepLightsOnly) reservedKeys.add(key);

      updateConveyorItemLabelDom(item);
    });

    state.conveyorSpawnCount = 1;
    state.conveyorForceCorrectIn = randomConveyorCorrectDelay();
    state.conveyorCorrectVisible = false;
  }
  
  function spawnConveyorItem() {
    const conveyor = document.getElementById("vlConveyor");
    if (!conveyor) return;

    const choiceData = pickConveyorChoiceForSpawn();
    if (!choiceData) return;

    const rect = conveyor.getBoundingClientRect();
    const startX = rect.width + conveyorShipTopWidthPx();

    const item = makeConveyorItem(choiceData, startX);
    state.conveyorItems.push(item);

    appendConveyorItemDom(item);
  }

  function maybeSpawnConveyorItems() {
    const conveyor = document.getElementById("vlConveyor");
    if (!conveyor) return;

    const topGapPx = conveyorShipTopWidthPx();
    const rect = conveyor.getBoundingClientRect();
    const spawnX = rect.width + topGapPx;

    let safety = 0;

    while (safety < 5) {
      safety += 1;

      const visible = conveyorVisibleItems();
      const rightMost = visible.length
        ? Math.max(...visible.map(item => item.x + (item.width || 0)))
        : -Infinity;

      if (visible.length && spawnX - rightMost < topGapPx) break;

      spawnConveyorItem();
    }
  }

  function conveyorTick(ts) {
    if (state.screen !== "game" || state.bonusReady) {
      stopConveyorLoop();
      return;
    }

    const lastTs = state.conveyorLastTs || ts;
    const dt = Math.min(40, ts - lastTs);
    state.conveyorLastTs = ts;

    const speed = conveyorSpeedPxPerSec();
    const topGapPx = conveyorShipTopWidthPx();

    state.conveyorItems.forEach(item => {
      item.x -= speed * (dt / 1000);
      updateConveyorItemDom(item);
    });

    const removed = [];

    state.conveyorItems = state.conveyorItems.filter(item => {
      const isOffscreen = item.x + (item.width || 0) < -topGapPx;
      if (isOffscreen) removed.push(item);
      return !isOffscreen;
    });

    removed.forEach(item => {
      if (item.isCorrect) {
        state.conveyorCorrectVisible = false;
        state.conveyorForceCorrectIn = randomConveyorCorrectDelay();
      }

      const el = document.querySelector(`.vl-conveyor-choice[data-choice-id="${item.id}"]`);
      if (el) el.remove();
    });

    maybeSpawnConveyorItems();

    state.conveyorRaf = requestAnimationFrame(conveyorTick);
  }

  function startConveyorLoop() {
    if (state.conveyorRaf) return;

    state.conveyorLastTs = 0;
    maybeSpawnConveyorItems();
    state.conveyorRaf = requestAnimationFrame(conveyorTick);
  }

  function stopConveyorLoop() {
    if (state.conveyorRaf) {
      cancelAnimationFrame(state.conveyorRaf);
      state.conveyorRaf = 0;
    }

    state.conveyorLastTs = 0;
  }

  function updateBuildDisplay() {
    const buildRender = renderBuildText();
    const buildText = document.getElementById("vlBuildText");

    if (buildText) {
      buildText.className = buildRender.className;
      buildText.innerHTML = buildRender.html;
    }

    fitBuildText();
    syncBuildStreakOverlay();
  }


  async function fadeOutBonusLaunchButton() {
    const wrap = document.querySelector(".vl-bonus-launch-wrap");
    if (!wrap) return;
    wrap.classList.add("is-fading");
    await sleep(260);
  }

  function renderIntro() {
    window.VerseGameShell.renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onBack: () => window.VerseGameBridge.exitGame(),
      onStart: () => {
        unlockAudio();
        playUiTapSound();
        setScreen("mode");
      }
    });
  }

  function renderMode() {
    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      icon: "🥉🥈🥇",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Verse Launch title",
      onBack: () => setScreen("intro"),
      onSelect: (mode) => {
        unlockAudio();
        playUiTapSound();
        state.mode = mode;
        initVerseData();
        state.startTime = performance.now();
        buildChoices();
        setScreen("game");
      }
    });
  }

  function renderGame() {
    const center = getPreviewChoice(0);

    const launcherMarkup = state.bonusReady
      ? `
        <div class="vl-bonus-launch-wrap">
          <button class="vl-star-launch-btn no-zoom" data-choice-id="bonus_launch" type="button">LAUNCH</button>
        </div>`
      : renderConveyor();

    app.innerHTML = `
      <div class="vl-root">
        <div class="vl-stage">
          ${(() => {
        const buildRender = renderBuildText();

        return `
    <div class="vl-build-wrap">
      <div class="vl-build vm-build vm-build--${BUILD_AREA} ${state.buildRemoving.size ? "vl-shake" : ""}" id="vlBuild">
        <div class="${buildRender.className}" id="vlBuildText">
          ${buildRender.html}
        </div>
      </div>
    </div>
  `;
      })()}
          <div class="vl-game-wrap">
            <div class="vl-game-board" id="vlBoard">
              <div class="vl-red-flash" id="vlRedFlash"></div>
              <div class="vl-flight-layer" id="vlFlightLayer"></div>
              <div class="vl-smoke-layer" id="vlSmokeLayer"></div>
              <div class="vl-firework-layer" id="vlFireworkLayer"></div>
              <div class="vl-board-content">
                <div class="vl-overlay-pills"><button class="vl-pill vl-menu-pill no-zoom" id="vlMenuPill" type="button" aria-label="Game Menu">☰</button></div>
                <div class="vl-launch-area">
                  <div class="vl-flight-space">
                    ${renderCountdownOverlay()}
                  </div>
                  <div class="vl-launcher-band">
                    ${launcherMarkup}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>`;
    wireGameScreen();
    syncGameMenuOpenState();
    fitBuildText();
    syncBuildStreakOverlay();
    if (!state.bonusReady) startConveyorLoop();
  }

  function renderTravel() {
    const rocket = getBonusRocket();
    app.innerHTML = `
      <div class="vl-travel-screen">
        <div class="vl-bonus-topbar">
          <button class="vl-pill vl-menu-pill no-zoom" id="vlMenuPill" type="button" aria-label="Game Menu">☰</button>
        </div>
        <div class="vl-bonus-stage" id="vlTravelStage">
          <div class="vl-travel-vignette"></div>
          <div class="vl-travel-rocket-unit vl-flight-unit--blastoff is-blasting" id="vlTravelRocketUnit">
            <div class="vl-blast-ship">
              <img class="vl-flight-rocket vl-travel-ship-rocket" id="vlTravelRocket" src="${rocket.src}" alt="">
              <div class="vl-blast-trail" aria-hidden="true"></div>
            </div>
          </div>
          <div class="vl-travel-text ${state.bonusTravelTextVisible ? "is-visible" : ""}" id="vlTravelText">
            ${bonusTravelInstructionHtml()}
          </div>
          <div class="vl-screen-fade ${state.bonusFadeActive ? "is-active" : ""}"></div>
        </div>
        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>`;
    wireBonusMenuOnly();
    syncGameMenuOpenState();
  }

  function renderAsteroidGame() {
    const rocket = getBonusRocket();
    app.innerHTML = `
      <div class="vl-asteroid-screen">
        <div class="vl-bonus-topbar">
          <button class="vl-pill vl-menu-pill no-zoom" id="vlMenuPill" type="button" aria-label="Game Menu">☰</button>
        </div>
        <div class="vl-bonus-stage" id="vlAstroStage">
          <div class="vl-space-layer" id="vlSpaceLayer">
            <img class="vl-moon" id="vlMoon" src="./verse_launch_images/verse_launch_moon.png" alt="">
          </div>
          <div class="vl-player-unit vl-flight-unit--blastoff is-blasting" id="vlPlayerUnit">
            <div class="vl-blast-ship vl-player-blast-ship">
              <img class="vl-player-rocket-img" id="vlPlayerRocket" src="${rocket.src}" alt="">
              <div class="vl-player-particle-trail" id="vlPlayerTrail" aria-hidden="true"></div>
            </div>
          </div>
          <div class="vl-space-status">
            <div class="vl-star-counter" id="vlStarCounter" aria-label="Stars collected">
              <img class="vl-star-counter-icon" src="${STAR_IMAGE_SRC}" alt="">
              <span id="vlStarCount">${state.astroStarCount}</span>
            </div>
          </div>
          ${renderAstroLandingOverlay()}
          ${shouldShowAstroArrowButtons() ? `
            <div class="vl-space-controls">
              <button class="vl-space-arrow no-zoom" id="vlLeftBtn" type="button" aria-label="Move left">‹</button>
              <button class="vl-space-arrow no-zoom" id="vlRightBtn" type="button" aria-label="Move right">›</button>
            </div>
          ` : ""}
        </div>
        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>`;
    wireBonusMenuOnly();
    syncGameMenuOpenState();
    wireAstroControls();
  }

  function renderEnd() {
    const earnedMedalIconHtml = state.completionResult?.newlyCompleted
      ? medalIconHtmlForMode(state.mode)
      : "";
    const starsCollected = Number(state.astroStarCount) || 0;
    const starWord = starsCollected === 1 ? "star" : "stars";
    const gameMessage = `${starsCollected} ${starWord} collected.`;

    window.VerseGameShell.renderCompleteScreen({
      app,
      icon: GAME_ICON,
      iconHtml: earnedMedalIconHtml,
      gameIcon: GAME_ICON,
      mode: state.mode,
      verseId: ctx.verseId,
      gameId: GAME_ID,
      completion: state.completionResult,
      gameMessage,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: () => {
        unlockAudio();
        playUiTapSound();
        setScreen("mode");
      },
      onMoreGames: () => {
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
      onChangeVerse: () => {
        playUiTapSound();
        window.VerseGameBridge.returnToTitle();
      }
    });
  }

  function prevChoice() { if (state.busy || state.completed || !state.choices.length) return; state.choiceIndex = (state.choiceIndex - 1 + state.choices.length) % state.choices.length; render(); }
  function nextChoice() { if (state.busy || state.completed || !state.choices.length) return; state.choiceIndex = (state.choiceIndex + 1) % state.choices.length; render(); }

  function wireGameScreen() {
    const menuPill = $("#vlMenuPill");
    const prevBtn = $("#vlPrevBtn"), nextBtn = $("#vlNextBtn");
    if (prevBtn) prevBtn.onclick = prevChoice;
    if (nextBtn) nextBtn.onclick = nextChoice;
    document.querySelectorAll("[data-choice-id]").forEach(el => { el.onclick = () => handleLaunch(el.dataset.choiceId); });

    window.VerseGameShell.wireGameMenu({
      id: "vlGameMenuOverlay",
      menuButtonId: "vlMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (!muted) playUiTapSound();
        return muted;
      },
      onHowToPlay: () => {
        playUiTapSound();
        state.menuOpen = false;
        state.helpOpen = true;
        state.helpBackMode = true;

        const menuOverlay = $("#vlGameMenuOverlay");
        if (menuOverlay) {
          menuOverlay.classList.remove("is-open");
          menuOverlay.setAttribute("aria-hidden", "true");
        }

        window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");
      },
      onModeSelect: () => {
        playUiTapSound();
        state.menuOpen = false;
        state.helpOpen = false;
        state.helpBackMode = false;
        state.busy = false;
        setScreen("mode");
      },
      onExit: () => {
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        if (!canOpenGameMenu()) return false;

        playUiTapSound();
        state.menuOpen = true;
        state.helpOpen = false;
        state.helpBackMode = false;
      },
      onClose: () => {
        playUiTapSound();
        state.menuOpen = false;
      },
      onBackFromHelp: () => {
        playUiTapSound();
        state.helpOpen = false;
        state.menuOpen = true;
        state.helpBackMode = false;
      }
    });
  }

  function wireBonusMenuOnly() {
    const menuPill = $("#vlMenuPill");

    window.VerseGameShell.wireGameMenu({
      id: "vlGameMenuOverlay",
      menuButtonId: "vlMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (!muted) playUiTapSound();
        return muted;
      },
      onHowToPlay: () => {
        playUiTapSound();
        state.menuOpen = false;
        state.helpOpen = true;
        state.helpBackMode = true;
        state.astroMoveDir = 0;

        const menuOverlay = $("#vlGameMenuOverlay");
        if (menuOverlay) {
          menuOverlay.classList.remove("is-open");
          menuOverlay.setAttribute("aria-hidden", "true");
        }

        window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");
      },
      onModeSelect: () => {
        playUiTapSound();
        state.menuOpen = false;
        state.helpOpen = false;
        state.helpBackMode = false;
        state.busy = false;
        state.astroMoveDir = 0;
        stopAstroLoop();
        setScreen("mode");
      },
      onExit: () => {
        playUiTapSound();
        stopAstroLoop();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        if (!canOpenGameMenu()) return false;

        playUiTapSound();
        state.menuOpen = true;
        state.helpOpen = false;
        state.helpBackMode = false;
        state.astroMoveDir = 0;
      },
      onClose: () => {
        playUiTapSound();
        state.menuOpen = false;
        state.astroMoveDir = 0;
      },
      onBackFromHelp: () => {
        playUiTapSound();
        state.helpOpen = false;
        state.menuOpen = true;
        state.helpBackMode = false;
        state.astroMoveDir = 0;
      }
    });

  }

  function wireAstroControls() {
    const leftBtn = $("#vlLeftBtn");
    const rightBtn = $("#vlRightBtn");

    if (leftBtn) {
      leftBtn.onpointerdown = (e) => { e.preventDefault(); setAstroPointerDir(-1); };
      leftBtn.onpointerup = (e) => { e.preventDefault(); clearAstroPointerDir(-1); };
      leftBtn.onpointercancel = (e) => { e.preventDefault(); clearAstroPointerDir(-1); };
      leftBtn.onpointerleave = (e) => { e.preventDefault(); clearAstroPointerDir(-1); };
      leftBtn.oncontextmenu = (e) => e.preventDefault();
    }

    if (rightBtn) {
      rightBtn.onpointerdown = (e) => { e.preventDefault(); setAstroPointerDir(1); };
      rightBtn.onpointerup = (e) => { e.preventDefault(); clearAstroPointerDir(1); };
      rightBtn.onpointercancel = (e) => { e.preventDefault(); clearAstroPointerDir(1); };
      rightBtn.onpointerleave = (e) => { e.preventDefault(); clearAstroPointerDir(1); };
      rightBtn.oncontextmenu = (e) => e.preventDefault();
    }
  }

  function flashWrongBoard() {
    const el = $("#vlRedFlash");
    if (!el) return;
    el.classList.remove("is-flashing"); void el.offsetWidth; el.classList.add("is-flashing");
  }

  function spawnSmoke(x, y, count = 8, options = {}) {
    const layer = $("#vlSmokeLayer") || document.body;
    const {
      spreadX = 30,
      spreadY = 16,
      size = 18,
      color = "rgba(255,255,255,.68)"
    } = options;

    for (let i = 0; i < count; i++) {
      const puff = document.createElement("div");
      puff.className = "vl-smoke-puff";
      puff.style.left = `${x + (Math.random() * spreadX - spreadX / 2)}px`;
      puff.style.top = `${y + (Math.random() * spreadY - spreadY / 2)}px`;
      puff.style.width = `${size}px`;
      puff.style.height = `${size}px`;
      puff.style.setProperty("--vl-smoke-color", color);
      puff.style.setProperty("--sx", `${Math.round(Math.random() * 28 - 14)}px`);
      puff.style.setProperty("--sy", `${Math.round(-16 - Math.random() * 26)}px`);
      layer.appendChild(puff);
      puff.addEventListener("animationend", () => puff.remove(), { once: true });
    }
  }

  function spawnFireworks(x, y) {
    const layer = $("#vlFireworkLayer") || document.body;
    const palette = ["#ffffff", "#ffd54f", "#ff8a65", "#81c784", "#64b5f6", "#ff8cc8"];
    const count = 28 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "vl-firework";
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.setProperty("--dx", `${Math.round(Math.random() * 160 - 80)}px`);
      p.style.setProperty("--dy", `${Math.round(Math.random() * 160 - 80)}px`);
      p.style.setProperty("--pcolor", palette[i % palette.length]);
      layer.appendChild(p);
      p.addEventListener("animationend", () => p.remove(), { once: true });
    }
  }

  function getModeMedal(mode) { return mode === "easy" ? "🥉" : mode === "medium" ? "🥈" : mode === "hard" ? "🥇" : "🏅"; }

  function getRocketByKey(key) {
    return ROCKETS.find(r => r.key === key) || ROCKETS[0];
  }

  function getSmokeTrailColor() {
    if (state.astroHits <= 0) return "#ffc751";
    if (state.astroHits === 1) return "#ffa351";
    return "#ff5a51";
  }

  function bonusRocketKeyForStarCount(count) {
    if (count >= 3) return "rainbow";
    if (count >= 2) return "blue";
    if (count >= 1) return "yellow";
    return "red";
  }

  function bonusGlowLevelForStarCount(count) {
    return 0;
  }

  function bonusBlasterActive() {
    return state.astroStarCount >= BLASTER_STAR_COUNT;
  }

  function bonusSpreadShotActive() {
    return state.astroStarCount >= SPREAD_SHOT_STAR_COUNT;
  }

  function bonusTrailVarsForStarCount(count) {
    const glowLevel = bonusGlowLevelForStarCount(count);

    if (count >= 3) {
      return {
        colors: ["#ffffff", "#ffc751", "#a7cb6f", "#64b5f6", "#7f66c6", "#ff8cc8", "#ff5a51"],
        glowColor: glowLevel >= 3
          ? "rgba(255,255,255,.92)"
          : glowLevel >= 2
            ? "rgba(255,140,200,.90)"
            : glowLevel >= 1
              ? "rgba(255,140,200,.84)"
              : "rgba(255,140,200,.78)",
        rainbow: true,
        glowLevel
      };
    }

    if (count >= 2) {
      return {
        colors: ["#ffffff", "#d4fafe", "#9ee7ff", "#64b5f6", "#4b7bec"],
        glowColor: "rgba(100,181,246,.82)",
        rainbow: false,
        glowLevel
      };
    }

    if (count >= 1) {
      return {
        colors: ["#ffffff", "#fff5b8", "#ffe066", "#ffc751", "#ffa351"],
        glowColor: "rgba(255,199,81,.82)",
        rainbow: false,
        glowLevel
      };
    }

    return {
      colors: ["#ffffff", "#ffd0cc", "#ff8a65", "#ff5a51", "#d83e36"],
      glowColor: "rgba(255,90,81,.82)",
      rainbow: false,
      glowLevel
    };
  } 

  function syncBonusRocketUpgrade() {
    state.bonusRocketColorKey = bonusRocketKeyForStarCount(state.astroStarCount);
  }

  function getBonusRocket() {
    if (state.bonusRocketColorKey === "rainbow") {
      return {
        key: "rainbow",
        src: RAINBOW_ROCKET_IMAGE_SRC,
        color: "#ffffff",
        textDark: false
      };
    }

    return getRocketByKey(state.bonusRocketColorKey || "red");
  }


  function pseudoTrailRandom(index, salt) {
    const n = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function readPlayerRocketSizePx() {
    const unit = $("#vlPlayerUnit");
    if (!unit) return 84;

    const value = getComputedStyle(unit).getPropertyValue("--vl-player-rocket-size").trim();
    const parsed = parseFloat(value);

    return Number.isFinite(parsed) ? parsed : 84;
  }

  function bonusRocketVisualSizePx() {
    return readPlayerRocketSizePx();
  }

  function bonusAsteroidAverageSizePx() {
    return bonusRocketVisualSizePx() * 0.75;
  }

  function bonusAsteroidSpawnSizePx() {
    const average = bonusAsteroidAverageSizePx();
    return average * rand(0.85, 1.15);
  }

  function bonusStarSizePx() {
    return bonusAsteroidAverageSizePx();
  }

  function bonusProjectileSizePx() {
    return Math.max(8, bonusAsteroidAverageSizePx() * 0.25);
  }

  function bonusAsteroidExplosionParticleSizePx(asteroid) {
    return Math.max(8, asteroid.size * 0.20);
  }

  function bonusAsteroidRewardStarSizePx(asteroid) {
    return Math.max(8, asteroid.size * ASTEROID_REWARD_STAR_SCALE);
  }

  function bonusRocketBottomOffsetPx() {
    return bonusRocketVisualSizePx() * 0.5;
  }

  function astroRocketCenterYPx(stageRect) {
    const rocketSize = bonusRocketVisualSizePx();
    return stageRect.height -
      bonusRocketBottomOffsetPx() -
      rocketSize / 2 -
      state.astroPlayerLiftPx;
  }

  function astroRocketNoseYPx(stageRect) {
    return astroRocketCenterYPx(stageRect) - bonusRocketVisualSizePx() * 0.55;
  }

  function renderCyanUfoTrail(trail) {
    if (!trail || trail.dataset.ready === "true") return;

    const owner = trail.closest(".vl-ufo-launch-clone") || trail.parentElement;
    const styles = owner ? getComputedStyle(owner) : null;
    const rawButtonHeight = styles
      ? parseFloat(styles.getPropertyValue("--vl-ufo-button-height"))
      : 60;

    const buttonHeight = Number.isFinite(rawButtonHeight) ? rawButtonHeight : 60;

    const colors = ["#ffffff", "#b9ffff", "#83fbff", "#4df9fd"];
    const settings = {
      particleCount: 30,
      streamSources: 5,
      particleSize: Math.max(13, buttonHeight * 0.25),
      coneSpread: buttonHeight * 1.05,
      trailLength: buttonHeight * 2.35,
      speed: 1.28,
      trajectoryRandomness: buttonHeight * 0.26,
      glow: Math.max(10, buttonHeight * 0.18),
      originWidth: buttonHeight * 0.48
    };

    trail.dataset.ready = "true";

    const cycles = Math.max(1, Math.ceil(settings.particleCount / settings.streamSources));

    for (let i = 0; i < settings.particleCount; i++) {
      const particle = document.createElement("span");
      particle.className = "vl-ufo-launch-particle";

      const streamIndex = i % settings.streamSources;
      const streamRatio = settings.streamSources === 1 ? 0.5 : streamIndex / (settings.streamSources - 1);
      const centeredStream = (streamRatio - 0.5) * 2;
      const cycle = Math.floor(i / settings.streamSources);
      const progress = settings.particleCount <= 1 ? 0 : i / (settings.particleCount - 1);

      const r1 = pseudoTrailRandom(i, 11);
      const r2 = pseudoTrailRandom(i, 12);
      const r3 = pseudoTrailRandom(i, 13);
      const r4 = pseudoTrailRandom(i, 14);

      const startX = centeredStream * settings.originWidth * 0.5;
      const coneX = centeredStream * settings.coneSpread;
      const wobbleX = (r1 - 0.5) * settings.trajectoryRandomness * 2;
      const x = startX + coneX + wobbleX;

      const yBase = settings.trailLength * (0.22 + progress * 0.86);
      const y = yBase + (r2 - 0.5) * settings.trajectoryRandomness;
      const size = Math.max(8, settings.particleSize + (r3 - 0.5) * buttonHeight * 0.12);
      const duration = (760 + r4 * 520) / settings.speed;
      const delay = -((cycle / cycles) * duration);
      const color = colors[(i + streamIndex) % colors.length];

      particle.style.setProperty("--vl-ufo-particle-x", `${x.toFixed(1)}px`);
      particle.style.setProperty("--vl-ufo-particle-y", `${y.toFixed(1)}px`);
      particle.style.setProperty("--vl-ufo-particle-size", `${size.toFixed(1)}px`);
      particle.style.setProperty("--vl-ufo-particle-duration", `${duration.toFixed(0)}ms`);
      particle.style.setProperty("--vl-ufo-particle-delay", `${delay.toFixed(0)}ms`);
      particle.style.setProperty("--vl-ufo-particle-color", color);
      particle.style.setProperty("--vl-ufo-particle-glow", `${settings.glow.toFixed(1)}px`);
      particle.style.setProperty("--vl-ufo-particle-end-scale", `${(0.30 + r2 * 0.42).toFixed(2)}`);
      particle.style.setProperty("--vl-ufo-particle-rotation", `${(120 + r1 * 280).toFixed(0)}deg`);
      particle.style.setProperty("--vl-ufo-particle-peak-opacity", `${(0.74 + r4 * 0.26).toFixed(2)}`);

      trail.appendChild(particle);
    }
  }

  function makeUfoLaunchClone(sourceEl) {
    const rect = sourceEl.getBoundingClientRect();
    const clone = sourceEl.cloneNode(true);
    const styles = getComputedStyle(sourceEl);

    [
      "--vl-ufo-button-height",
      "--vl-ufo-top-aspect",
      "--vl-ufo-top-height",
      "--vl-ufo-top-width",
      "--vl-ufo-bottom-aspect",
      "--vl-ufo-bottom-width",
      "--vl-ufo-bottom-height",
      "--vl-ufo-bottom-visible-height",
      "--vl-ufo-bottom-rise",
      "--vl-ufo-button-min-width",
      "--vl-ufo-button-max-width"
    ].forEach(name => {
      const value = styles.getPropertyValue(name).trim();
      if (value) clone.style.setProperty(name, value);
    });

    clone.classList.remove("vl-conveyor-choice", "is-selected-launch", "is-fading-choice");
    clone.classList.add("vl-ufo-launch-clone");
    clone.removeAttribute("data-choice-id");
    clone.removeAttribute("data-slot");
    clone.removeAttribute("aria-label");
    clone.disabled = true;

    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;

    const trail = document.createElement("span");
    trail.className = "vl-ufo-launch-trail";
    clone.appendChild(trail);
    renderCyanUfoTrail(trail);

    document.body.appendChild(clone);

    return { clone, rect };
  }


  function renderPlayerParticleTrail(trail, trailVars) {
    if (!trail) return;

    const rocketSize = readPlayerRocketSizePx();

    const settings = {
      particleCount: 35,
      streamSources: 5,
      particleSize: rocketSize * 0.25,
      sizeRandomness: 0,
      coneSpread: rocketSize * 0.375,
      trailLength: rocketSize * 1.80,
      speed: 1.25,
      trajectoryRandomness: rocketSize * 0.146,
      glow: rocketSize * 0.115,
      originWidth: rocketSize * 0.219
    };

    const glowMultiplier =
      trailVars.glowLevel >= 3 ? 2.25 :
        trailVars.glowLevel >= 2 ? 1.75 :
          trailVars.glowLevel >= 1 ? 1.35 :
            1;

    const signature = JSON.stringify({
      rocketSize,
      colors: trailVars.colors,
      glowColor: trailVars.glowColor,
      glowLevel: trailVars.glowLevel,
      settings
    });

    if (trail.dataset.signature === signature) return;

    trail.dataset.signature = signature;
    trail.innerHTML = "";

    const cycles = Math.max(1, Math.ceil(settings.particleCount / settings.streamSources));

    for (let i = 0; i < settings.particleCount; i++) {
      const particle = document.createElement("span");
      particle.className = "vl-player-trail-particle";

      const streamIndex = i % settings.streamSources;
      const streamRatio = settings.streamSources === 1 ? 0.5 : streamIndex / (settings.streamSources - 1);
      const centeredStream = (streamRatio - 0.5) * 2;
      const cycle = Math.floor(i / settings.streamSources);
      const progress = settings.particleCount <= 1 ? 0 : i / (settings.particleCount - 1);

      const r1 = pseudoTrailRandom(i, 1);
      const r2 = pseudoTrailRandom(i, 2);
      const r3 = pseudoTrailRandom(i, 3);
      const r4 = pseudoTrailRandom(i, 4);

      const startX = centeredStream * settings.originWidth * 0.5;
      const coneX = centeredStream * settings.coneSpread;
      const wobbleX = (r1 - 0.5) * settings.trajectoryRandomness * 2;
      const x = startX + coneX + wobbleX;

      const yBase = settings.trailLength * (0.48 + progress * 0.72);
      const y = yBase + (r2 - 0.5) * settings.trajectoryRandomness;

      const size = Math.max(2, settings.particleSize + (r3 - 0.5) * settings.sizeRandomness * 2);
      const duration = (820 + r4 * 560) / settings.speed;
      const delay = -((cycle / cycles) * duration);
      const color = trailVars.colors[(i + streamIndex) % trailVars.colors.length];

      particle.style.setProperty("--vl-particle-x", `${x.toFixed(1)}px`);
      particle.style.setProperty("--vl-particle-y", `${y.toFixed(1)}px`);
      particle.style.setProperty("--vl-particle-size", `${size.toFixed(1)}px`);
      particle.style.setProperty("--vl-particle-duration", `${duration.toFixed(0)}ms`);
      particle.style.setProperty("--vl-particle-delay", `${delay.toFixed(0)}ms`);
      particle.style.setProperty("--vl-particle-color", color);
      particle.style.setProperty("--vl-particle-glow", `${(settings.glow * glowMultiplier).toFixed(1)}px`);
      particle.style.setProperty("--vl-particle-glow-color", trailVars.glowColor);
      particle.style.setProperty("--vl-particle-end-scale", `${(0.28 + r2 * 0.42).toFixed(2)}`);
      particle.style.setProperty("--vl-particle-rotation", `${(120 + r1 * 280).toFixed(0)}deg`);
      particle.style.setProperty("--vl-particle-peak-opacity", `${(0.72 + r4 * 0.28).toFixed(2)}`);

      trail.appendChild(particle);
    }
  }

  async function finalizeBonusOutcome(success) {
    state.completed = true;
    state.endTime = performance.now();
    state.bonusOutcome = success ? "success" : "crash";

    try {
      state.completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: state.mode,
        startedAt: state.startTime,
        stats: {
          bonusOutcome: state.bonusOutcome,
          astroHits: state.astroHits,
          timeSecs: Number((totalElapsedMs() / 1000).toFixed(1))
        }
      });
    } catch (err) {
      console.error("completeGameRun failed", err);
      state.completionResult = {
        ok: false,
        alreadyCompleted: false,
        newlyCompleted: false,
        reward: {
          ok: false,
          petUnlockTriggered: false
        }
      };
    }

    const alreadyEarned = !!state.completionResult.alreadyCompleted;
    state.bonusMedalAlreadyEarned = alreadyEarned;

    if (success) {
      if (alreadyEarned) {
        state.medalMessage = "Mission accomplished!";
        state.medalSubmessage = "You reached the moon again. Try to beat your time!";
      } else {
        state.medalMessage = `Mission accomplished! You earned a ${getModeMedal(state.mode)}`;
        state.medalSubmessage = "You reached the moon!";
      }
    } else {
      if (alreadyEarned) {
        state.medalMessage = "Rocket lost!";
        state.medalSubmessage = "You already earned this medal. Try again for a cleaner run!";
      } else {
        state.medalMessage = `Launch complete! You earned a ${getModeMedal(state.mode)}`;
        state.medalSubmessage = "You built the verse, but your rocket crashed.";
      }
    }

    state.busy = false;
    setScreen("end");
  }

  function stopAstroLoop() {
    if (state.astroRaf) {
      cancelAnimationFrame(state.astroRaf);
      state.astroRaf = 0;
    }

    resetAstroInput();
    state.astroRunning = false;
  }

  function safeLeftPct(x) {
    return Math.max(0.08, Math.min(0.92, x));
  }


  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isLikelyTouchDevice() {
    return navigator.maxTouchPoints > 0 ||
      window.matchMedia?.("(pointer: coarse)")?.matches;
  }

  function hasDeviceOrientationSupport() {
    return typeof window.DeviceOrientationEvent !== "undefined";
  }

  function shouldTryTiltControls() {
    return isLikelyTouchDevice() && hasDeviceOrientationSupport();
  }

  function shouldShowAstroArrowButtons() {
    return !astroInput.tiltEnabled;
  }


  function bonusTravelInstructionHtml() {
    if (shouldTryTiltControls()) {
      if (astroInput.tiltEnabled) {
        return `
            Reach the moon!<br>
            Dodge the asteroids.<br>
            Tilt to steer.
          `;
      }

      if (astroInput.tiltPermissionState === "denied") {
        return `
            Reach the moon!<br>
            Dodge the asteroids.<br>
            Tap the arrows to steer.
          `;
      }

      return `
            Reach the moon!<br>
            Dodge the asteroids.<br>
            Tilt to steer, or tap the arrows.
          `;
    }

    return `
            Reach the moon!<br>
            Dodge the asteroids.<br>
            Use arrow keys to steer.
          `;
  }

  async function requestAstroTiltPermission() {
    if (!shouldTryTiltControls()) {
      astroInput.tiltPermissionState = "unavailable";
      astroInput.tiltEnabled = false;
      return false;
    }

    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        astroInput.tiltPermissionState = result;
        astroInput.tiltEnabled = result === "granted";
        return astroInput.tiltEnabled;
      }

      astroInput.tiltPermissionState = "granted";
      astroInput.tiltEnabled = true;
      return true;
    } catch (err) {
      console.warn("Tilt permission request failed", err);
      astroInput.tiltPermissionState = "denied";
      astroInput.tiltEnabled = false;
      return false;
    }
  }

  function handleAstroOrientation(event) {
    if (!astroInput.tiltEnabled) return;

    const gamma = Number(event.gamma);
    if (!Number.isFinite(gamma)) return;

    const deadZone = 3;
    const maxTilt = 22;

    let targetDir = 0;

    if (Math.abs(gamma) > deadZone) {
      const adjusted = gamma > 0 ? gamma - deadZone : gamma + deadZone;
      targetDir = clamp(adjusted / maxTilt, -1, 1);
    }

    astroInput.tiltRawDir = targetDir;
    astroInput.tiltDir = (astroInput.tiltDir * 0.78) + (targetDir * 0.22);

    if (Math.abs(astroInput.tiltDir) < 0.08) {
      astroInput.tiltDir = 0;
    }

    syncAstroMoveDir();
  }

  function canUseAstroControls() {
    return state.screen === "asteroids" &&
      state.astroRunning &&
      !state.astroMoonPhase &&
      !state.menuOpen &&
      !state.helpOpen &&
      !state.completed;
  }

  function syncAstroMoveDir() {
    if (!canUseAstroControls()) {
      state.astroMoveDir = 0;
      return;
    }

    const keyboardDir =
      astroInput.leftKey && !astroInput.rightKey ? -1 :
        astroInput.rightKey && !astroInput.leftKey ? 1 :
          0;

    const tiltDir = astroInput.tiltEnabled ? astroInput.tiltDir : 0;

    state.astroMoveDir = astroInput.pointerDir || keyboardDir || tiltDir;
  }

  function resetAstroInput() {
    astroInput.leftKey = false;
    astroInput.rightKey = false;
    astroInput.pointerDir = 0;
    astroInput.tiltRawDir = 0;
    astroInput.tiltDir = 0;
    state.astroMoveDir = 0;
  }

  function setAstroPointerDir(dir) {
    if (!canUseAstroControls()) return;
    astroInput.pointerDir = dir;
    syncAstroMoveDir();
  }

  function clearAstroPointerDir(dir) {
    if (astroInput.pointerDir === dir) {
      astroInput.pointerDir = 0;
    }

    syncAstroMoveDir();
  }

  function astroKeyboardDirForKey(key) {
    const normalized = String(key || "").toLowerCase();

    if (normalized === "arrowleft" || normalized === "a") return -1;
    if (normalized === "arrowright" || normalized === "d") return 1;

    return 0;
  }

  function handleAstroKeyDown(event) {
    const dir = astroKeyboardDirForKey(event.key);
    if (!dir || !canUseAstroControls()) return;

    event.preventDefault();

    if (dir < 0) {
      astroInput.leftKey = true;
    } else {
      astroInput.rightKey = true;
    }

    syncAstroMoveDir();
  }

  function handleAstroKeyUp(event) {
    const dir = astroKeyboardDirForKey(event.key);
    if (!dir) return;

    event.preventDefault();

    if (dir < 0) {
      astroInput.leftKey = false;
    } else {
      astroInput.rightKey = false;
    }

    syncAstroMoveDir();
  }

  window.addEventListener("keydown", handleAstroKeyDown);
  window.addEventListener("keyup", handleAstroKeyUp);
  window.addEventListener("deviceorientation", handleAstroOrientation, true);

  function modeAstroMultiplier() {
    return ASTRO_MODE_MULTIPLIER[state.mode] || 1;
  }

  function modeStarMultiplier() {
    return STAR_MODE_MULTIPLIER[state.mode] || 1;
  }

  function astroDurationMs() {
    return ASTRO_DURATION_BY_MODE_MS[state.mode] || ASTRO_DURATION_BY_MODE_MS.medium;
  }

  function starSpeedPxPerSec(viewH) {
    return (STAR_BASE_SPEED_VH_PER_SEC / 100) * viewH * modeStarMultiplier();
  }

  function nextStarCooldownMs(stageWidth) {
    const compactBonus = stageWidth < 420 ? 120 : 0;

    if (state.mode === "easy") {
      return 1050 + compactBonus + Math.random() * 650;
    }

    if (state.mode === "hard") {
      return 1900 + compactBonus + Math.random() * 850;
    }

    return 1400 + compactBonus + Math.random() * 750;
  }

  function maybeSpawnAsteroid(dtMs, stageWidth) {
    if (state.astroMoonPhase || state.astroDrainPhase) return;

    state.astroSpawnCooldownMs = Math.max(0, state.astroSpawnCooldownMs - dtMs);
    if (state.astroSpawnCooldownMs > 0) return;

    const chancePerSecond = 1.45;
    const roll = Math.random();
    if (roll > chancePerSecond * (dtMs / 1000)) return;

    const size = bonusAsteroidSpawnSizePx();

    const leftBound = 0.14;
    const rightBound = 0.86;
    const minGapPct = stageWidth < 420 ? 0.26 : stageWidth < 560 ? 0.22 : 0.18;

    const candidates = [];
    for (let i = 0; i < 7; i++) {
      candidates.push(leftBound + ((rightBound - leftBound) * (i / 6)));
    }

    const playerX = state.astroPlayerX;
    const source = candidates.filter(x => {
      return state.astroLastSpawnX < 0 || Math.abs(x - state.astroLastSpawnX) >= (minGapPct * 0.82);
    });

    const usable = source.length ? source : candidates;
    const weightedPool = [];

    usable.forEach(x => {
      const distFromPlayer = Math.abs(x - playerX);

      if (distFromPlayer >= (minGapPct * 0.75)) {
        weightedPool.push(x, x);
      } else if (distFromPlayer >= (minGapPct * 0.32)) {
        weightedPool.push(x, x);
      } else {
        weightedPool.push(x, x, x);
      }
    });

    const pool = weightedPool.length ? weightedPool : usable;
    const chosenX = pool[Math.floor(Math.random() * pool.length)];

    state.astroAsteroids.push({
      id: `ast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      x: chosenX,
      yPx: -size - 20,
      size,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() * 90) - 45
    });

    state.astroLastSpawnX = chosenX;
    state.astroSpawnCooldownMs = stageWidth < 420 ? 420 : stageWidth < 560 ? 340 : 280;
  }

  function maybeSpawnStar(dtMs, stageWidth) {
    if (state.astroMoonPhase || state.astroDrainPhase) return;

    state.astroStarSpawnCooldownMs = Math.max(0, state.astroStarSpawnCooldownMs - dtMs);
    if (state.astroStarSpawnCooldownMs > 0) return;

    const size = bonusStarSizePx();

    const leftBound = 0.13;
    const rightBound = 0.87;
    const candidates = [];

    for (let i = 0; i < 7; i++) {
      candidates.push(leftBound + ((rightBound - leftBound) * (i / 6)));
    }

    const source = candidates.filter(x => {
      return state.astroLastStarSpawnX < 0 || Math.abs(x - state.astroLastStarSpawnX) >= 0.18;
    });

    const usable = source.length ? source : candidates;
    const chosenX = usable[Math.floor(Math.random() * usable.length)];

    state.astroStars.push({
      id: `star_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      x: chosenX,
      yPx: -size - 20,
      size,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() * 80) - 40
    });

    state.astroLastStarSpawnX = chosenX;
    state.astroStarSpawnCooldownMs = nextStarCooldownMs(stageWidth);
  }


  function asteroidSpeedPxPerSec(viewH) {
    return (ASTRO_BASE_SPEED_VH_PER_SEC / 100) * viewH * modeAstroMultiplier();
  }

  function resetMoonOffscreen() {
    const moon = $("#vlMoon");
    if (moon) {
      const moonHeight = moon.getBoundingClientRect().height || 240;
      state.astroMoonY = -moonHeight - 24;
    } else {
      state.astroMoonY = -340;
    }
  }

  async function playLaunchCountdown() {
    const host =
      document.querySelector(".vl-flight-space") ||
      document.querySelector(".vl-bonus-stage") ||
      document.body;

    const overlay = document.createElement("div");
    overlay.className = "vl-countdown-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const box = document.createElement("div");
    box.className = "vl-countdown-box";
    overlay.appendChild(box);
    host.appendChild(overlay);

    for (const value of ["3", "2", "1"]) {
      box.textContent = value;
      box.classList.remove("is-pop");
      void box.offsetWidth;
      box.classList.add("is-pop");
      playCountdownBeep(false);
      await sleep(520);
    }

    playCountdownBeep(true);
    await sleep(220);

    overlay.remove();
    state.countdownValue = "";
  }

  function spawnFixedLaunchSmoke(x, y, count = 3, options = {}) {
    const {
      spreadX = 18,
      spreadY = 10,
      size = 22,
      color = "rgba(255,199,81,.82)"
    } = options;

    for (let i = 0; i < count; i++) {
      const puff = document.createElement("div");
      puff.className = "vl-smoke-puff";
      puff.style.position = "fixed";
      puff.style.left = `${x + (Math.random() * spreadX - spreadX / 2)}px`;
      puff.style.top = `${y + (Math.random() * spreadY - spreadY / 2)}px`;
      puff.style.width = `${size}px`;
      puff.style.height = `${size}px`;
      puff.style.zIndex = "10001";
      puff.style.setProperty("--vl-smoke-color", color);
      puff.style.setProperty("--sx", `${Math.round(Math.random() * 28 - 14)}px`);
      puff.style.setProperty("--sy", `${Math.round(18 + Math.random() * 30)}px`);
      document.body.appendChild(puff);
      puff.addEventListener("animationend", () => puff.remove(), { once: true });
    }
  }

  async function animateLaunch(choice, sourceEl) {
    const boardRect = $("#vlBoard")?.getBoundingClientRect();
    const buildRect = $("#vlBuild")?.getBoundingClientRect();

    if (!sourceEl || !boardRect || !buildRect) return;

    const { clone, rect } = makeUfoLaunchClone(sourceEl);

    sourceEl.classList.add("is-hidden-during-flight");

    const startX = rect.left;
    const startY = rect.top;

    const targetCenterX = boardRect.left + boardRect.width / 2;
    const targetX = targetCenterX - rect.width / 2;
    const targetY = boardRect.top - rect.height - Math.max(260, boardRect.height * 0.45);

    const driftX = targetX - startX;
    const driftY = targetY - startY;

    clone.animate(
      [
        {
          transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
          opacity: 1,
          offset: 0
        },
        {
          transform: `translate3d(${driftX * 0.22}px, ${driftY * 0.18}px, 0) scale(1.03) rotate(-2deg)`,
          opacity: 1,
          offset: 0.28
        },
        {
          transform: `translate3d(${driftX}px, ${driftY}px, 0) scale(1.08) rotate(2deg)`,
          opacity: 1,
          offset: 1
        }
      ],
      {
        duration: 760,
        easing: "cubic-bezier(.42, 0, 1, 1)",
        fill: "forwards"
      }
    );

    await sleep(760);
    clone.remove();
  }
  

  async function animateFinalLaunch() {
    const rocket = getBonusRocket();
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight + 36;

    const unit = document.createElement("div");
    unit.className = "vl-flight-unit vl-flight-unit--blastoff vl-flight-unit--final-blastoff";
    unit.innerHTML = `
      <div class="vl-blast-ship">
        <img class="vl-flight-rocket" src="${rocket.src}" alt="">
        <div class="vl-blast-trail" aria-hidden="true"></div>
      </div>
    `;
    document.body.appendChild(unit);

    const unitRect = unit.getBoundingClientRect();
    unit.style.left = `${startX - unitRect.width / 2}px`;
    unit.style.top = `${startY}px`;
    unit.style.opacity = "1";
    unit.style.transform = "translateY(0)";

    await sleep(80);

    unit.classList.add("is-blasting");

    unit.style.transition = "transform 180ms linear";
    unit.style.transform = "translateY(-82px)";
    await sleep(180);

    const travelDistance = startY + unitRect.height + 48;

    // Final launch speed.
    // Higher number = faster rocket.
    // Lower number = slower rocket.
    const rocketSpeedPxPerSec = 800;
    const travelMs = Math.round((travelDistance / rocketSpeedPxPerSec) * 1000);

    unit.style.transition = `transform ${travelMs}ms linear, opacity ${travelMs}ms linear`;
    unit.style.transform = `translateY(${-travelDistance}px)`;
    unit.style.opacity = ".98";

    await sleep(travelMs + 80);
    unit.remove();
  }


  function showBuildShake() {
    const build = $("#vlBuild");
    if (!build) return;
    build.classList.remove("vl-shake"); void build.offsetWidth; build.classList.add("vl-shake");
  }

  function spawnWordBurst(x, y, opts = {}) {
    const layer = document.getElementById("vlFireworkLayer") || document.getElementById("vlSmokeLayer");
    if (!layer) return;

    const count = opts.count ?? 9;
    const distance = opts.distance ?? 54;
    const jitter = opts.jitter ?? 5;
    const duration = opts.duration ?? 620;
    const cloudSize = opts.cloudSize ?? 70;
    const colors = opts.colors ?? ["#ffffff", "#ffd54f", "#ff8a65"];
    const sizePool = opts.sizePool ?? [8, 10, 12, 15, 18];

    const burst = document.createElement("div");
    burst.className = "vl-word-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;

    const burstBoxSize = Math.max(128, Math.ceil((distance + cloudSize) * 2.05));
    burst.style.width = `${burstBoxSize}px`;
    burst.style.height = `${burstBoxSize}px`;

    const cloud = document.createElement("div");
    cloud.className = "vl-word-burst-cloud";
    cloud.style.setProperty("--vl-word-burst-cloud-size", `${cloudSize}px`);
    cloud.style.setProperty("--vl-word-burst-cloud-dur", `${Math.max(500, duration - 90)}ms`);
    cloud.innerHTML = WORD_BURST_CLOUD_SVG;
    burst.appendChild(cloud);

    const baseAngle = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + step * i + rand(-0.12, 0.12);
      const dist = distance + rand(-jitter, jitter);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const size = pickRandom(sizePool) + rand(-0.5, 0.5);
      const particle = document.createElement("div");
      particle.className = "vl-word-burst-particle";
      particle.style.setProperty("--vl-word-burst-size", `${size.toFixed(1)}px`);
      particle.style.setProperty("--vl-word-burst-dur", `${duration}ms`);
      particle.style.setProperty("--vl-word-burst-start-scale", `${rand(0.68, 0.82).toFixed(2)}`);
      particle.style.setProperty("--vl-word-burst-end-scale", `${rand(1.10, 1.24).toFixed(2)}`);
      particle.style.setProperty("--vl-word-burst-tx", `${tx.toFixed(1)}px`);
      particle.style.setProperty("--vl-word-burst-ty", `${ty.toFixed(1)}px`);
      particle.style.setProperty("--vl-word-burst-delay", `${Math.round(rand(0, 18))}ms`);
      particle.style.background = colors[i % colors.length];
      burst.appendChild(particle);
    }

    layer.appendChild(burst);

    requestAnimationFrame(() => {
      cloud.classList.add("is-live");
      burst.querySelectorAll(".vl-word-burst-particle").forEach((particle) => {
        const delay = Number.parseInt(particle.style.getPropertyValue("--vl-word-burst-delay"), 10) || 0;
        window.setTimeout(() => particle.classList.add("is-live"), delay);
      });
    });

    window.setTimeout(() => burst.remove(), duration + 140);
  }


  async function animateFailedLaunch(sourceEl) {
    const rocket = sourceEl?.querySelector(".vl-rocket");
    if (!rocket) {
      const rect = sourceEl?.getBoundingClientRect();
      const layerRect = (document.getElementById("vlFireworkLayer") || document.body).getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2 - layerRect.left;
        const centerY = rect.top + rect.height / 2 - layerRect.top;
        const sizeBase = Math.max(48, Math.min(rect.width, 96));

        sourceEl.classList.add("is-wrong-choice");

        if (sourceEl.animate) {
          sourceEl.animate(
            [
              { filter: "brightness(1)" },
              { filter: "brightness(1.25)" },
              { filter: "brightness(1)" }
            ],
            { duration: 260, easing: "ease" }
          );
        }

        spawnWordBurst(centerX, centerY, {
          count: 9,
          distance: Math.round(sizeBase * 0.72),
          jitter: Math.round(sizeBase * 0.08),
          duration: 620,
          cloudSize: Math.round(sizeBase * 0.88),
          colors: ["#ffffff"],
          sizePool: [8, 10, 12, 15, 18]
        });

        await sleep(420);
        sourceEl.classList.remove("is-wrong-choice");
      }
      return;
    }

    const rocketRect = rocket.getBoundingClientRect();
    const smokeLayerRect = ($("#vlSmokeLayer") || document.body).getBoundingClientRect();

    const centerX = rocketRect.left + rocketRect.width / 2 - smokeLayerRect.left;
    const centerY = rocketRect.top + rocketRect.height / 2 - smokeLayerRect.top;
    const smokeSize = Math.round(rocketRect.width * 1.5);

    spawnSmoke(centerX, centerY, 22, {
      spreadX: smokeSize * 0.50,
      spreadY: smokeSize * 0.50,
      size: smokeSize,
      color: "rgba(70,70,70,.82)"
    });

    await sleep(280);
  }

  async function animateBonusLaunch(sourceEl) {
    const rocket = sourceEl?.querySelector(".vl-rocket");
    const button = sourceEl?.querySelector(".vl-star-launch-btn");
    if (!rocket || !button) return;

    const rocketRect = rocket.getBoundingClientRect();
    const smokeLayerRect = ($("#vlSmokeLayer") || document.body).getBoundingClientRect();
    const startX = rocketRect.left + rocketRect.width / 2;
    const startY = rocketRect.top + rocketRect.height / 2;
    const smokeX = startX - smokeLayerRect.left;
    const smokeY = startY - smokeLayerRect.top;

    const unit = document.createElement("div");
    unit.className = "vl-flight-unit";
    unit.innerHTML = `<img class="vl-flight-rocket" src="${rocket.getAttribute("src")}" alt="">`;
    document.body.appendChild(unit);

    const unitRect = unit.getBoundingClientRect();
    unit.style.left = `${rocketRect.left + (rocketRect.width / 2) - (unitRect.width / 2)}px`;
    unit.style.top = `${rocketRect.top - 8}px`;

    sourceEl.classList.add("is-hidden-during-flight");
    spawnSmoke(smokeX, smokeY + 42, 8, { color: getSmokeTrailColor() });
    await sleep(220);
    spawnSmoke(smokeX, smokeY + 38, 10, { color: getSmokeTrailColor() });

    unit.style.transition = "transform 220ms ease, opacity 220ms ease";
    unit.style.transform = "translate(0,-26px) scale(.98)";
    await sleep(220);

    const endY = -window.innerHeight - 200;
    unit.style.transition = "transform 980ms cubic-bezier(.12,.2,.18,1), opacity 980ms linear";
    unit.style.transform = `translate(0, ${endY}px) scale(.42)`;
    unit.style.opacity = ".96";

    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      spawnSmoke(smokeX, smokeY - (window.innerHeight * 0.75 * t), 2, { color: getSmokeTrailColor() });
      await sleep(36);
    }

    await sleep(980);
    unit.remove();
    sourceEl.classList.remove("is-hidden-during-flight");
  }

  async function startBonusSequence() {
    setScreen("travel");
    await sleep(220);

    playGameSound("cutsceneRocketEnter");

    const rocketUnit = $("#vlTravelRocketUnit");

    if (rocketUnit) {
      const travelDistance = window.innerHeight + 260;

      rocketUnit.animate(
        [
          { transform: "translateX(-50%) translateY(0)" },
          { transform: `translateX(-50%) translateY(${-travelDistance}px)` }
        ],
        {
          duration: 1900,
          easing: "linear",
          fill: "forwards"
        }
      );
    }

    await sleep(650);

    const travelText = $("#vlTravelText");
    if (travelText) {
      travelText.classList.add("is-visible");
    }

    state.bonusTravelTextVisible = true;

    // Keep this readable a little longer than before.
    await sleep(3000);

    const fade = document.querySelector(".vl-screen-fade");
    if (fade) {
      fade.classList.add("is-active");
    }

    state.bonusFadeActive = true;
    await sleep(430);

    state.bonusFadeActive = false;
    state.bonusTravelTextVisible = false;
    setScreen("asteroids");
    startAstroLoop();
  }

  function renderAstroEntities() {
    const stage = $("#vlAstroStage");
    const layer = $("#vlSpaceLayer");
    const unit = $("#vlPlayerUnit");
    syncAstroLandingOverlay();
    const rocket = $("#vlPlayerRocket");
    const moon = $("#vlMoon");
    const trail = $("#vlPlayerTrail");
    if (!stage || !layer || !unit || !rocket || !moon || !trail) return;

    syncBonusRocketUpgrade();

    const rect = stage.getBoundingClientRect();
    const leftPx = rect.width * state.astroPlayerX;

    rocket.src = getBonusRocket().src;

    const trailVars = bonusTrailVarsForStarCount(state.astroStarCount);
    renderPlayerParticleTrail(trail, trailVars);
    trail.classList.toggle("is-rainbow", !!trailVars.rainbow);

    unit.classList.toggle("is-rainbow-rocket", state.bonusRocketColorKey === "rainbow");
    unit.classList.toggle("is-blaster-active", bonusBlasterActive());

    unit.style.left = `${leftPx}px`;
    unit.style.transform = `translateX(-50%) translateY(${-state.astroPlayerLiftPx}px) rotate(${state.astroPlayerTilt + state.astroSpinDeg}deg) scale(${state.astroPlayerScale})`;

    layer.querySelectorAll(".vl-asteroid, .vl-star, .vl-astro-projectile").forEach(n => n.remove());

    const drainOpacity = state.astroDrainPhase
      ? Math.max(0, 1 - state.astroDrainFadeMs / 1300)
      : 1;

    state.astroStars.forEach(star => {
      const img = document.createElement("img");
      img.className = "vl-star";
      img.src = STAR_IMAGE_SRC;
      img.style.width = `${star.size}px`;
      img.style.height = `${star.size}px`;
      img.style.left = `${rect.width * star.x - star.size / 2}px`;
      img.style.top = `${star.yPx}px`;
      img.style.transform = `rotate(${star.rot}deg)`;
      img.style.opacity = drainOpacity;
      layer.appendChild(img);
    });

    state.astroProjectiles.forEach(projectile => {
      const shot = document.createElement("div");
      shot.className = "vl-astro-projectile";
      shot.style.width = `${projectile.size}px`;
      shot.style.height = `${projectile.size}px`;
      shot.style.left = `${rect.width * projectile.x - projectile.size / 2}px`;
      shot.style.top = `${projectile.yPx - projectile.size / 2}px`;
      shot.style.setProperty("--vl-projectile-color", projectile.color);
      shot.style.opacity = drainOpacity;
      layer.appendChild(shot);
    });


    state.astroAsteroids.forEach(ast => {
      const img = document.createElement("img");
      img.className = "vl-asteroid";
      img.src = ASTEROID_IMAGE_SRC;
      img.style.width = `${ast.size}px`;
      img.style.height = `${ast.size}px`;
      img.style.left = `${rect.width * ast.x - ast.size / 2}px`;
      img.style.top = `${ast.yPx}px`;
      img.style.transform = `rotate(${ast.rot}deg)`;
      img.style.opacity = drainOpacity;
      layer.appendChild(img);
    });

    const starCount = document.getElementById("vlStarCount");
    if (starCount) {
      starCount.textContent = String(state.astroStarCount);
    }

    moon.style.top = `${state.astroMoonY}px`;
    moon.classList.toggle("is-visible", !!state.astroMoonVisible);
  }


  function asteroidHitTest(stageRect, asteroid) {
    const rocketSize = bonusRocketVisualSizePx();
    const rocketX = stageRect.width * state.astroPlayerX;
    const rocketY = astroRocketCenterYPx(stageRect);
    const rocketW = rocketSize * ASTRO_HITBOX_SCALE;
    const rocketH = rocketSize * ASTRO_HITBOX_SCALE;

    const astW = asteroid.size * ASTRO_HITBOX_SCALE;
    const astH = asteroid.size * ASTRO_HITBOX_SCALE;
    const astX = stageRect.width * asteroid.x;
    const astY = asteroid.yPx + asteroid.size / 2;

    return Math.abs(rocketX - astX) < (rocketW + astW) / 2 &&
      Math.abs(rocketY - astY) < (rocketH + astH) / 2;
  }

  function projectileSpeedPxPerSec(viewH) {
    return (PROJECTILE_BASE_SPEED_VH_PER_SEC / 100) * viewH;
  }

  function maybeFireAstroProjectile(dtMs, stageRect) {
    if (!bonusBlasterActive()) return;
    if (state.astroMoonPhase || state.astroDrainPhase || state.astroLandingPhase) return;

    state.astroProjectileCooldownMs = Math.max(0, state.astroProjectileCooldownMs - dtMs);
    if (state.astroProjectileCooldownMs > 0) return;

    const size = bonusProjectileSizePx();
    const noseY = astroRocketNoseYPx(stageRect);
    const color = PROJECTILE_COLORS[state.astroProjectileColorIndex % PROJECTILE_COLORS.length];

    state.astroProjectileColorIndex += 1;

    const spreadXPerSec = projectileSpeedPxPerSec(stageRect.height) * 0.22;
    const volley = bonusSpreadShotActive()
      ? [-spreadXPerSec, 0, spreadXPerSec]
      : [0];

    volley.forEach(xVelocityPxPerSec => {
      state.astroProjectiles.push({
        id: `projectile_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        x: state.astroPlayerX,
        yPx: noseY,
        size,
        color,
        xVelocityPxPerSec
      });
    });

    playProjectileFireSound();

    state.astroProjectileCooldownMs = PROJECTILE_COOLDOWN_MS;
  }

  function updateAstroProjectiles(dtSec, stageRect) {
    const speed = projectileSpeedPxPerSec(stageRect.height);

    state.astroProjectiles.forEach(projectile => {
      projectile.yPx -= speed * dtSec;

      if (projectile.xVelocityPxPerSec) {
        projectile.x += (projectile.xVelocityPxPerSec * dtSec) / stageRect.width;
      }
    });

    state.astroProjectiles = state.astroProjectiles.filter(projectile => {
      return projectile.yPx > -projectile.size - 24 &&
        projectile.x > -0.12 &&
        projectile.x < 1.12;
    });
  }

  function asteroidIsHalfVisible(stageRect, asteroid) {
    const asteroidTop = asteroid.yPx;
    const asteroidBottom = asteroid.yPx + asteroid.size;

    const visibleTop = Math.max(0, asteroidTop);
    const visibleBottom = Math.min(stageRect.height, asteroidBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    return visibleHeight >= asteroid.size * 0.5;
  }

  function projectileHitTest(stageRect, projectile, asteroid) {
    const projectileX = stageRect.width * projectile.x;
    const projectileY = projectile.yPx;
    const projectileW = projectile.size * PROJECTILE_HITBOX_SCALE;
    const projectileH = projectile.size * PROJECTILE_HITBOX_SCALE;

    const astX = stageRect.width * asteroid.x;
    const astY = asteroid.yPx + asteroid.size / 2;
    const astW = asteroid.size * PROJECTILE_ASTEROID_HITBOX_SCALE;
    const astH = asteroid.size * PROJECTILE_ASTEROID_HITBOX_SCALE;

    return Math.abs(projectileX - astX) < (projectileW + astW) / 2 &&
      Math.abs(projectileY - astY) < (projectileH + astH) / 2;
  }

  function spawnAsteroidPopBurst(stageRect, asteroid) {
    const layer = $("#vlSpaceLayer");
    if (!layer) return;

    const x = stageRect.width * asteroid.x;
    const y = asteroid.yPx + asteroid.size / 2;
    const size = bonusAsteroidRewardStarSizePx(asteroid);
    const baseDistance = Math.max(36, asteroid.size * 0.78);

    const spread = [
      { x: -1.10, y: -0.58, rot: -32, delay: 0 },
      { x: -0.55, y: -0.98, rot: -16, delay: 35 },
      { x: 0.00, y: -1.18, rot: 0, delay: 70 },
      { x: 0.55, y: -0.98, rot: 16, delay: 35 },
      { x: 1.10, y: -0.58, rot: 32, delay: 0 }
    ];

    spread.forEach((item, index) => {
      const rewardStar = document.createElement("img");
      rewardStar.className = "vl-asteroid-reward-star";
      rewardStar.src = STAR_IMAGE_SRC;
      rewardStar.alt = "";

      const distance = baseDistance * (0.9 + Math.random() * 0.18);
      const dx = item.x * distance;
      const dy = item.y * distance;

      rewardStar.style.left = `${x}px`;
      rewardStar.style.top = `${y}px`;
      rewardStar.style.width = `${size}px`;
      rewardStar.style.height = `${size}px`;
      rewardStar.style.setProperty("--dx", `${dx}px`);
      rewardStar.style.setProperty("--dy", `${dy}px`);
      rewardStar.style.setProperty("--rot", `${item.rot + (Math.random() * 18 - 9)}deg`);
      rewardStar.style.animationDelay = `${item.delay}ms`;

      layer.appendChild(rewardStar);
      rewardStar.addEventListener("animationend", () => rewardStar.remove(), { once: true });
    });
  }

  function awardAsteroidShotStars(stageRect, asteroid) {
    playGameSound("asteroidDestroyed");

    const previousRocketKey = bonusRocketKeyForStarCount(state.astroStarCount);

    state.astroStarCount += ASTEROID_SHOT_STAR_REWARD;
    syncBonusRocketUpgrade();
    spawnAsteroidPopBurst(stageRect, asteroid);

    const nextRocketKey = bonusRocketKeyForStarCount(state.astroStarCount);
    const upgraded =
      previousRocketKey !== nextRocketKey ||
      state.astroStarCount >= BLASTER_STAR_COUNT ||
      state.astroStarCount >= SPREAD_SHOT_STAR_COUNT;

    const counter = $("#vlStarCounter");
    if (counter) {
      counter.classList.remove("is-pop", "is-upgrade");
      void counter.offsetWidth;
      counter.classList.add(upgraded ? "is-upgrade" : "is-pop");
    }

    const unit = $("#vlPlayerUnit");
    if (unit && upgraded) {
      unit.classList.remove("is-upgrade");
      void unit.offsetWidth;
      unit.classList.add("is-upgrade");
    }
  }

  function handleAstroProjectileCollisions(stageRect) {
    if (!state.astroProjectiles.length || !state.astroAsteroids.length) return;

    const destroyedProjectileIds = new Set();
    const destroyedAsteroidIds = new Set();

    for (const projectile of state.astroProjectiles) {
      if (destroyedProjectileIds.has(projectile.id)) continue;

      for (const asteroid of state.astroAsteroids) {
        if (destroyedAsteroidIds.has(asteroid.id)) continue;
        if (!asteroidIsHalfVisible(stageRect, asteroid)) continue;

        if (projectileHitTest(stageRect, projectile, asteroid)) {
          destroyedProjectileIds.add(projectile.id);
          destroyedAsteroidIds.add(asteroid.id);
          awardAsteroidShotStars(stageRect, asteroid);
          break;
        }
      }
    }

    if (!destroyedProjectileIds.size && !destroyedAsteroidIds.size) return;

    state.astroProjectiles = state.astroProjectiles.filter(projectile => {
      return !destroyedProjectileIds.has(projectile.id);
    });

    state.astroAsteroids = state.astroAsteroids.filter(asteroid => {
      return !destroyedAsteroidIds.has(asteroid.id);
    });
  }

  function starHitTest(stageRect, star) {
    const rocketSize = bonusRocketVisualSizePx();
    const rocketX = stageRect.width * state.astroPlayerX;
    const rocketY = astroRocketCenterYPx(stageRect);
    const rocketW = rocketSize * STAR_HITBOX_SCALE;
    const rocketH = rocketSize * STAR_HITBOX_SCALE;

    const starW = star.size * STAR_HITBOX_SCALE;
    const starH = star.size * STAR_HITBOX_SCALE;
    const starX = stageRect.width * star.x;
    const starY = star.yPx + star.size / 2;

    return Math.abs(rocketX - starX) < (rocketW + starW) / 2 &&
      Math.abs(rocketY - starY) < (rocketH + starH) / 2;
  }
  

  function spawnStarCollectBurst(stageRect, star) {
    const layer = $("#vlSpaceLayer");
    if (!layer) return;

    const x = stageRect.width * star.x;
    const y = star.yPx + star.size / 2;
    const count = 12;

    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "vl-star-sparkle";

      const angle = (Math.PI * 2 * i) / count;
      const distance = 24 + Math.random() * 24;

      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      sparkle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

      layer.appendChild(sparkle);
      sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
    }
  }

  function astroHandleStarCollect(stageRect, star) {
    playGameSound("starCollected");

    const previousRocketKey = bonusRocketKeyForStarCount(state.astroStarCount);

    state.astroStarCount += 1;
    state.astroStars = state.astroStars.filter(item => item.id !== star.id);
    syncBonusRocketUpgrade();
    spawnStarCollectBurst(stageRect, star);

    const nextRocketKey = bonusRocketKeyForStarCount(state.astroStarCount);
    const upgraded =
      previousRocketKey !== nextRocketKey ||
      state.astroStarCount === 3 ||
      state.astroStarCount === BLASTER_STAR_COUNT;

    const counter = $("#vlStarCounter");
    if (counter) {
      counter.classList.remove("is-pop", "is-upgrade");
      void counter.offsetWidth;
      counter.classList.add(upgraded ? "is-upgrade" : "is-pop");
    }

    const unit = $("#vlPlayerUnit");
    if (unit && upgraded) {
      unit.classList.remove("is-upgrade");
      void unit.offsetWidth;
      unit.classList.add("is-upgrade");
    }

    renderAstroEntities();
  }

  async function astroHandleHit() {
    if (state.astroInvulnerable || state.astroMoonPhase) return;

    playGameSound("playerAsteroidHit");

    state.astroInvulnerable = true;
    state.astroHits += 1;

    const rocket = $("#vlPlayerUnit");
    const isFatalHit = (state.astroHits >= 3);

    state.astroSpinDeg = 0;
    state.astroSpinMs = isFatalHit ? 0 : 1000;

    if (rocket) {
      rocket.classList.remove("is-hit", "is-flash", "is-despawned");
      void rocket.offsetWidth;
      if (!isFatalHit) {
        rocket.classList.add("is-flash");
      }
    }

    if (state.astroHits >= 3) {
      const stage = $("#vlAstroStage")?.getBoundingClientRect();
      const rocket = $("#vlPlayerUnit");

      if (stage) {
        const centerX = stage.width * state.astroPlayerX;
        const centerY = stage.height - 118;
        const smokeSize = 126;

        spawnSmoke(centerX, centerY, 22, {
          spreadX: smokeSize * 0.50,
          spreadY: smokeSize * 0.50,
          size: smokeSize,
          color: "rgba(255,255,255,.92)"
        });
      }

      if (rocket) {
        rocket.classList.add("is-despawned");
      }
      state.astroSpinDeg = 0;
      state.astroSpinMs = 0;

      await sleep(900);
      stopAstroLoop();
      await finalizeBonusOutcome(false);
      return;
    }

    renderAstroEntities();
    await sleep(1000);
    state.astroInvulnerable = false;
  }

  function astroTick(ts) {
    if (!state.astroRunning) return;
    if (!state.astroLastTs) state.astroLastTs = ts;
    const dtMs = Math.min(34, ts - state.astroLastTs);
    state.astroLastTs = ts;

    const stage = $("#vlAstroStage");
    if (!stage) {
      state.astroRaf = requestAnimationFrame(astroTick);
      return;
    }

    const rect = stage.getBoundingClientRect();
    if (state.menuOpen || state.helpOpen) {
      state.astroLastTs = ts;
      renderAstroEntities();
      state.astroRaf = requestAnimationFrame(astroTick);
      return;
    }
    const dtSec = dtMs / 1000;
    const moveSpeed = 0.62 * dtSec;
    state.astroPlayerX = safeLeftPct(state.astroPlayerX + state.astroMoveDir * moveSpeed);
    const targetTilt = state.astroMoveDir === 0 ? 0 : (state.astroMoveDir < 0 ? -12 : 12);
    state.astroPlayerTilt += (targetTilt - state.astroPlayerTilt) * 0.18;

    if (state.astroSpinMs > 0) {
      const spinStep = 360 * dtSec;
      state.astroSpinDeg += spinStep;
      state.astroSpinMs = Math.max(0, state.astroSpinMs - dtMs);
    }

    if (state.astroSpinMs <= 0 && state.astroSpinDeg !== 0) {
      state.astroSpinDeg *= 0.82;
      if (Math.abs(state.astroSpinDeg) < 2) {
        state.astroSpinDeg = 0;
      }
    }

    if (state.astroSpinDeg > 180) {
      state.astroSpinDeg -= 360;
    } else if (state.astroSpinDeg < -180) {
      state.astroSpinDeg += 360;
    }

    if (!state.astroMoonPhase) {
      state.astroTimerMs += dtMs;
      maybeSpawnAsteroid(dtMs, rect.width);
      maybeSpawnStar(dtMs, rect.width);
      maybeFireAstroProjectile(dtMs, rect);

      const fallSpeed = asteroidSpeedPxPerSec(rect.height);
      const starFallSpeed = starSpeedPxPerSec(rect.height);

      state.astroAsteroids.forEach(ast => {
        ast.yPx += fallSpeed * dtSec;
        ast.rot += ast.rotSpeed * dtSec;
      });

      state.astroStars.forEach(star => {
        star.yPx += starFallSpeed * dtSec;
        star.rot += star.rotSpeed * dtSec;
      });

      updateAstroProjectiles(dtSec, rect);

      state.astroAsteroids = state.astroAsteroids.filter(ast => ast.yPx < rect.height + ast.size + 20);
      state.astroStars = state.astroStars.filter(star => star.yPx < rect.height + star.size + 20);

      handleAstroProjectileCollisions(rect);

      for (const star of [...state.astroStars]) {
        if (starHitTest(rect, star)) {
          astroHandleStarCollect(rect, star);
        }
      }

      if (!state.astroInvulnerable) {
        for (const ast of state.astroAsteroids) {
          if (asteroidHitTest(rect, ast)) {
            astroHandleHit();
            break;
          }
        }
      }

      if (state.astroTimerMs >= astroDurationMs()) {
        state.astroMoonPhase = true;
        state.astroDrainPhase = true;
        state.astroDrainFadeMs = 0;
        state.astroLandingMessageVisible = true;
        state.astroMoveDir = 0;
        playGameSound("landingStart");
      }
    } else {
      const fallSpeed = asteroidSpeedPxPerSec(rect.height);
      const starFallSpeed = starSpeedPxPerSec(rect.height);

      state.astroAsteroids.forEach(ast => {
        ast.yPx += fallSpeed * dtSec;
        ast.rot += ast.rotSpeed * dtSec;
      });

      state.astroStars.forEach(star => {
        star.yPx += starFallSpeed * dtSec;
        star.rot += star.rotSpeed * dtSec;
      });

      updateAstroProjectiles(dtSec, rect);

      state.astroAsteroids = state.astroAsteroids.filter(ast => ast.yPx < rect.height + ast.size + 20);
      state.astroStars = state.astroStars.filter(star => star.yPx < rect.height + star.size + 20);

      if (state.astroDrainPhase) {
        state.astroDrainFadeMs += dtMs;
        state.astroPlayerTilt *= 0.88;

        if (state.astroAsteroids.length === 0 && state.astroStars.length === 0) {
          state.astroDrainPhase = false;
        }
      } else if (!state.astroLandingPhase) {
        const moonTargetY = rect.height * 0.14;
        const moonRiseSpeed = rect.height * 0.0038;

        state.astroMoonVisible = true;

        if (state.astroMoonY < moonTargetY) {
          state.astroMoonY = Math.min(moonTargetY, state.astroMoonY + moonRiseSpeed);
          state.astroPlayerTilt *= 0.90;
        } else {
          state.astroMoonDone = true;
          state.astroLandingPhase = true;
          state.astroLandingMessageVisible = false;
          state.astroMoveDir = 0;
        }
      } else {
        const targetX = 0.5;
        const targetLiftPx = rect.height * 0.42;
        const targetScale = 0.05;

        state.astroPlayerX += (targetX - state.astroPlayerX) * 0.08;
        state.astroPlayerLiftPx += (targetLiftPx - state.astroPlayerLiftPx) * 0.08;
        state.astroPlayerScale += (targetScale - state.astroPlayerScale) * 0.08;
        state.astroPlayerTilt *= 0.90;

        const centered = Math.abs(targetX - state.astroPlayerX) < 0.008;
        const lifted = Math.abs(targetLiftPx - state.astroPlayerLiftPx) < 3;
        const scaled = Math.abs(targetScale - state.astroPlayerScale) < 0.02;

        if (centered && lifted && scaled) {
          stopAstroLoop();
          finalizeBonusOutcome(true);
          return;
        }
      }
    }

    renderAstroEntities();
    state.astroRaf = requestAnimationFrame(astroTick);
  }

  function startAstroLoop() {
    state.astroRunning = true;
    state.astroLastTs = 0;
    state.astroTimerMs = 0;
    state.astroHits = 0;
    state.astroInvulnerable = false;
    state.astroPlayerX = 0.5;
    resetAstroInput();
    state.astroPlayerTilt = 0;
    state.astroSpinDeg = 0;
    state.astroSpinMs = 0;
    state.astroAsteroids = [];
    state.astroStars = [];
    state.astroProjectiles = [];
    state.astroStarCount = 0;
    state.bonusRocketColorKey = "red";
    state.astroSpawnCooldownMs = 0;
    state.astroStarSpawnCooldownMs = 650;
    state.astroProjectileCooldownMs = 0;
    state.astroProjectileColorIndex = 0;
    state.astroLastSpawnX = -1;
    state.astroLastStarSpawnX = -1;
    state.astroDrainPhase = false;
    state.astroDrainFadeMs = 0;
    state.astroLandingMessageVisible = false;
    state.astroMoonPhase = false;
    state.astroMoonDone = false;
    state.astroLandingPhase = false;
    state.astroPlayerLiftPx = 0;
    state.astroPlayerScale = 1;

    renderAstroEntities();
    resetMoonOffscreen();
    renderAstroEntities();
    state.astroMoonVisible = false;

    state.astroRaf = requestAnimationFrame(astroTick);
  }

  async function finishGame() {
    state.completed = true;
    state.endTime = performance.now();

    try {
      state.completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: state.mode,
        startedAt: state.startTime,
        stats: {
          timeSecs: Number((totalElapsedMs() / 1000).toFixed(1)),
          progressIndex: state.progressIndex
        }
      });
    } catch (err) {
      console.error("completeGameRun failed", err);
      state.completionResult = {
        ok: false,
        alreadyCompleted: false,
        newlyCompleted: false,
        reward: {
          ok: false,
          petUnlockTriggered: false
        }
      };
    }

    const alreadyEarned = !!state.completionResult.alreadyCompleted;

    if (alreadyEarned) {
      state.medalMessage = "Great job!";
      state.medalSubmessage = "You finished Verse Launch!";
    } else {
      state.medalMessage = `Well done! You earned a ${getModeMedal(state.mode)}`;
      state.medalSubmessage = "You finished Verse Launch!";
    }

    state.busy = false;
    setScreen("end");
  }

  async function handleLaunch(choiceId) {
    if (state.busy || state.menuOpen || state.helpOpen || state.completed) return;

    unlockAudio();

    if (choiceId === "bonus_launch") {
      state.busy = true;

      await requestAstroTiltPermission();

      await fadeOutBonusLaunchButton();
      await playLaunchCountdown();
      playGameSound("launchButton");
      await animateFinalLaunch();
      state.busy = false;
      await startBonusSequence();
      return;
    }

    const item = state.conveyorItems.find(entry => entry.id === choiceId);
    if (!item || item.blank || item.lightsOnly || state.conveyorTextHidden) return;

    const tappedLabelKey = normalizeWord(item.label);
    const currentCorrectKey = normalizeWord(currentCorrectLabel());
    const tappedIsCorrect = !!tappedLabelKey && tappedLabelKey === currentCorrectKey;

    state.busy = true;

    const liveSourceEl = document.querySelector(`.vl-conveyor-choice[data-choice-id="${choiceId}"]`);

    if (!liveSourceEl) {
      state.busy = false;
      return;
    }

    if (tappedIsCorrect) {
      item.isCorrect = true;
      setConveyorWordsHidden(true);
      playGameSound("correctTap");

      await animateLaunch(item, liveSourceEl);

      removeConveyorItem(choiceId);

      state.correctStreak += 1;
      state.progressIndex += 1;
      updateBuildDisplay();
      syncBuildStreakOverlay({ pulse: true });
      playGameSound("wordAdded");

      if (state.progressIndex >= state.segments.length) {
        state.bonusReady = true;
        stopConveyorLoop();
        state.busy = false;
        render();
        return;
      }

      buildChoices();

      setConveyorWordsHidden(false);
      relabelVisibleConveyorItemsForCurrentTarget();

      state.busy = false;
      return;
    }

    playGameSound("wrongTap");
    state.correctStreak = 0;
    syncBuildStreakOverlay({ broken: true });

    animateFailedLaunch(liveSourceEl);
    removeConveyorItem(choiceId);

    flashWrongBoard();
    showBuildShake();

    await sleep(140);

    state.busy = false;
  }

  function setScreen(screen) {
    if (screen !== "game") stopConveyorLoop();
    state.screen = screen;
    render();
  }

  function render() {
    if (state.screen === "intro") return renderIntro();
    if (state.screen === "mode") return renderMode();
    if (state.screen === "game") return renderGame();
    if (state.screen === "travel") return renderTravel();
    if (state.screen === "asteroids") return renderAsteroidGame();
    if (state.screen === "end") return renderEnd();
  }

  setScreen("intro");
})();
