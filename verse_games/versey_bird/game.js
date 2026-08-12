(async function(){
  const app = document.getElementById("app");
  const launch = window.VerseGameBridge.getLaunchParams();
  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "versey_bird";
  const GAME_TITLE = "Versey Bird";
  const GAME_ICON = "🐤";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);
  const GAME_THEME = { bg: "#333333", accent: "#333333" };
  const BUILD_AREA = "compact";
  const HELP_OVERLAY_ID = "vb2HelpOverlay";
  const MENU_OVERLAY_ID = "vb2GameMenuOverlay";
  const IMAGE_PATH = "./versey_bird_images/";
  const SOUND_BASE_PATH = "./versey_bird_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

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

  const SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,

    flap1: `${SOUND_BASE_PATH}versey_bird_flap_1.mp3`,
    flap2: `${SOUND_BASE_PATH}versey_bird_flap_2.mp3`,
    flap3: `${SOUND_BASE_PATH}versey_bird_flap_3.mp3`,
    flap4: `${SOUND_BASE_PATH}versey_bird_flap_4.mp3`,
    boulder: `${SOUND_BASE_PATH}versey_bird_boulder.mp3`,
    correct: `${SOUND_BASE_PATH}versey_bird_correct.mp3`,
    pipeCleared: `${SOUND_BASE_PATH}versey_bird_pipe_cleared.mp3`,
    pipeCrash: `${SOUND_BASE_PATH}versey_bird_pipe_crash.mp3`,
    streak: `${SOUND_BASE_PATH}versey_bird_streak.mp3`,
    wrong: `${SOUND_BASE_PATH}versey_bird_wrong.mp3`,
    beeHit: `${SOUND_BASE_PATH}versey_bird_bee_hit.mp3`
  };

  const SOUND_TUNING = {
    masterVolume: 0.82,
    volumes: {
      uiTap: 0.45,
      flap: 0.15,
      correct: 0.58,
      wrong: 0.62,
      beeHit: 0.70,
      boulder: 0.72,
      pipeCleared: 0.58,
      pipeCrash: 0.78,
      streak: 0.68
    }
  };
  const TARGET_FIELD_UNITS_WIDE = 6.75;
  const MIN_UNIT = 42;
  const MAX_UNIT = 116;
  const MAX_UNIT_BY_HEIGHT = 0.19;
  const DECOY_CLOUD_HITBOX_SCALE = 0.80;
  const WORD_CLOUD_RENDER_HEIGHT_U = 1.00;
  const WORD_CLOUD_TEXT_HEIGHT_RATIO = 0.30;
  const LIGHTNING_PARTICLE_IMAGE = "versey_bird_lightning.svg";
  const PARTICLE_COLORS = {
    rainbow: [
      "#ff5a51",
      "#ff9f43",
      "#ffc751",
      "#7ed957",
      "#38bdf8",
      "#7f66c6",
      "#ff7ab6"
    ],
    white: [
      "rgba(255,255,255,0.96)",
      "rgba(245,252,255,0.92)"
    ],
    brown: [
      "#8a5a32",
      "#a86f3d",
      "#c58a4a",
      "#6f4728"
    ],
    green: [
      "#4ade80",
      "#22c55e",
      "#86efac",
      "#16a34a"
    ]
  };

  const BIRD_COLORS = [
    { name: "yellow", primary: "#ffc751", secondary: "#a68235" },
    { name: "red", primary: "#ff5a51", secondary: "#a63b35" },
    { name: "green", primary: "#a7cb6f", secondary: "#6d8448" },
    { name: "purple", primary: "#7f66c6", secondary: "#534281" },
    { name: "black", primary: "#4d4d4d", secondary: "#8b8b8b" },
    { name: "orange", primary: "#ffa351", secondary: "#a66a35" },
    { name: "white", primary: "#f2f2f2", secondary: "#cccccc" },
    { name: "pink", primary: "#ff948e", secondary: "#a6605c" },
    { name: "teal", primary: "#1ea8aa", secondary: "#146d6f" }
  ];

  const CLOUD_SHAPES = {
    compact: {
      image: "versey_bird_cloud_compact.svg",
      aspect: 290 / 225,
      heightU: WORD_CLOUD_RENDER_HEIGHT_U,
      textX: 50.0,
      textY: 54.8
    },
    normal: {
      image: "versey_bird_cloud_normal.svg",
      aspect: 380 / 225,
      heightU: WORD_CLOUD_RENDER_HEIGHT_U,
      textX: 49.7,
      textY: 52.1
    },
    long: {
      image: "versey_bird_cloud_long.svg",
      aspect: 560 / 225,
      heightU: WORD_CLOUD_RENDER_HEIGHT_U,
      textX: 49.5,
      textY: 55.4
    }
  };

  const FLYING_WORD_TRAVEL_SECONDS = 3.0;
  const FLYING_MESSAGE_GRACE_SECONDS = 0.25;

  const BONUS_WORDS = [
    { text: "BONUS", line: 0, delay: 0.15 },
    { text: "ROUND", line: 0, delay: 0.65 },
    { text: "WATCH", line: 1, delay: 1.45 },
    { text: "OUT", line: 1, delay: 1.85 },
    { text: "FOR", line: 1, delay: 2.20 },
    { text: "THE", line: 1, delay: 2.55 },
    { text: "PIPES", line: 1, delay: 2.90 }
  ];

  const INTRO_WORDS = [
    { text: "TAP", line: 0, delay: 0.15 },
    { text: "TO", line: 0, delay: 0.55 },
    { text: "FLY", line: 0, delay: 0.95 },
    { text: "COLLECT", line: 1, delay: 2.05 },
    { text: "CORRECT", line: 1, delay: 2.55 },
    { text: "WORDS", line: 1, delay: 3.05 }
  ];

  const DIFFICULTY = {
    easy: {
      worldSpeedU: 2.25,
      gravityU: 11.8,
      flapU: -4.85,
      cloudGapU: 2.75,
      hitPaddingU: 0.28,
      bonusStartSpeedU: 2.45,
      bonusRampU: 0.090,
      bonusStartGapU: 4.65,
      bonusMinGapU: 3.35,
      bonusPipeEveryU: 5.45,
      obstacleCloudMin: 4,
      obstacleCloudMax: 5,
      obstacleCloudChoices: [4, 4, 5],
      obstacleBeeChance: 0.35,
      streakSpeedBoostsU: [0, 0.07, 0.15, 0.23, 0.31],
      streakSpeedEaseU: 1.0
    },
    medium: {
      worldSpeedU: 2.55,
      gravityU: 12.7,
      flapU: -5.15,
      cloudGapU: 2.55,
      hitPaddingU: 0.22,
      bonusStartSpeedU: 2.75,
      bonusRampU: 0.115,
      bonusStartGapU: 4.25,
      bonusMinGapU: 2.95,
      bonusPipeEveryU: 5.10,
      obstacleCloudMin: 3,
      obstacleCloudMax: 4,
      obstacleCloudChoices: [3, 3, 4],
      obstacleBeeChance: 0.50,
      streakSpeedBoostsU: [0, 0.12, 0.25, 0.37, 0.50],
      streakSpeedEaseU: 1.35
    },
    hard: {
      worldSpeedU: 2.85,
      gravityU: 13.4,
      flapU: -5.35,
      cloudGapU: 2.35,
      hitPaddingU: 0.17,
      bonusStartSpeedU: 3.05,
      bonusRampU: 0.145,
      bonusStartGapU: 3.90,
      bonusMinGapU: 2.65,
      bonusPipeEveryU: 4.85,
      obstacleCloudMin: 2,
      obstacleCloudMax: 3,
      obstacleCloudChoices: [2, 2, 3],
      obstacleBeeChance: 0.60,
      streakSpeedBoostsU: [0, 0.17, 0.33, 0.49, 0.65],
      streakSpeedEaseU: 1.7
    }
  };

  let selectedMode = null;
  let completed = false;
  let completionResult = null;
  let muted = false;
  let birdSvgText = "";
  let audioCtx = null;
  let silenceAudio = null;
  let audioUnlocked = false;
  let uiSoundFlip = false;
  let lastFlapSound = "";
  const soundBuffers = new Map();
  const soundBufferPromises = new Map();

  const state = {
    running: false,
    phase: "title",
    rafId: 0,
    paused: false,
    pauseReason: "",
    field: null,
    resizeHandler: null,
    lastInputAt: 0,
    lastTs: 0,
    startTs: 0,
    phaseStartedAt: 0,
    introStartedAt: 0,
    bonusStartedAt: 0,
    bonusIntroUnlockAt: 0,
    crashStartedAt: 0,
    worldX: 0,
    cloudBgX: 0,
    layout: null,
    birdColor: BIRD_COLORS[0],
    birdColorCycleIndex: 0,
    birdX: 0,
    birdY: 0,
    birdVY: 0,
    birdAngle: 0,
    birdSpinUntil: 0,
    birdFlapUntil: 0,
    birdHidden: false,
    bgClouds: [],
    nextBgCloudId: 1,
    bgCloudCooldown: 0,
    poofs: [],
    obstacles: [],
    beeTrailDots: [],
    birdTrailDots: [],
    birdTrailSparkles: [],
    nextObstacleId: 1,
    nextBeeTrailDotId: 1,
    nextBirdTrailId: 1,
    obstacleCloudCountdown: 0,
    wordCloud: null,
    nextCloudId: 1,
    cloudCooldown: 0,
    spawnHistory: [],
    forceCorrectNext: false,
    progressIndex: 0,
    streak: 0,
    bestStreak: 0,
    buildFitDone: false,
    words: [],
    bookLabel: "",
    referenceLabel: "",
    referenceMeta: null,
    segments: [],
    buildSizeClass: "is-normal",
    bonusPipes: [],
    nextPipeId: 1,
    pipeCooldown: 0,
    pipesCleared: 0,
    bonusElapsed: 0,
    resultShown: false,
    flashUntil: 0,
    flashColor: "rgba(255,255,255,0.3)",
    shakeUntil: 0,
    skidCooldown: 0,
    birdTrailCooldown: 0,
    birdSparkleCooldown: 0,
    streakSpeedBoostU: 0
  };

  setupReferenceSegments();
  ensureSilenceAudio();
  renderIntro();
  preloadBirdSvg();

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
    const key = uiSoundFlip ? "uiTap2" : "uiTap1";
    uiSoundFlip = !uiSoundFlip;
    playGameSound(key, "uiTap");
  }

  function playRandomFlapSound() {
    const keys = ["flap1", "flap2", "flap3", "flap4"];
    let choices = keys.filter(key => key !== lastFlapSound);

    if (!choices.length) {
      choices = keys;
    }

    const key = choices[Math.floor(Math.random() * choices.length)];
    lastFlapSound = key;
    playGameSound(key, "flap");
  }

  function introHelpHtml(){
    return `
      Tap to flap.<br><br>
      Collect the next correct word. Avoid wrong words, bees, and boulders.<br><br>
      When the verse is finished, see how long you can fly through the pipes.
    `;
  }

  function modeHelpHtml(){
    return `
      Easy: gentler flying and easier decoys.<br><br>
      Medium: balanced flying with trickier decoys.<br><br>
      Hard: faster flying with the toughest decoys.
    `;
  }

  function gameHelpHtml(){
    return `
      Tap or click to flap.<br><br>
      Collect the next correct word cloud. Avoid decoy clouds, bees, and boulders.<br><br>
      Missing a correct word resets your streak in Medium and Hard only.<br><br>
      After the verse is built, fly through as many pipes as you can.
    `;
  }

  function renderIntro(){
    stopLoop();
    cleanupResize();
    state.phase = "title";

    window.VerseGameShell.renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      helpHtml: introHelpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onBack: () => {
        void unlockAudio();
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
      onStart: () => {
        void unlockAudio();
        playUiTapSound();
        renderModeSelect();
      }
    });
  }

  function renderModeSelect(){
    stopLoop();
    cleanupResize();
    state.phase = "mode";

    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      icon: "🥉🥈🥇",
      helpHtml: modeHelpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Versey Bird title",
      onBack: () => {
        void unlockAudio();
        playUiTapSound();
        renderIntro();
      },
      onSelect: (mode) => {
        void unlockAudio();
        playUiTapSound();
        startGame(mode);
      }
    });
  }

  function startGame(mode){
    stopLoop();
    cleanupResize();

    selectedMode = mode;
    completed = false;
    completionResult = null;
    resetStateForRun();

    app.innerHTML = `
      <div class="vb2-root">
        <div class="vb2-stage">
          <div class="vb2-build-wrap">
            <div class="vb2-build vm-build vm-build--${BUILD_AREA}" id="vb2Build">
              <div class="vb2-build-text vm-build-text" id="vb2BuildText"></div>
            </div>
          </div>

          <div class="vb2-field-wrap">
            <div class="vb2-field" id="vb2Field">
              <div class="vb2-bg-clouds" id="vb2BgClouds"></div>
              <div class="vb2-hills" id="vb2Hills">
                <div class="vb2-hill-strip" id="vb2HillStripA"></div>
                <div class="vb2-hill-strip" id="vb2HillStripB"></div>
              </div>
              <div class="vb2-ground" id="vb2Ground"></div>

              <button class="vb2-menu-pill" id="vb2MenuPill" aria-label="Game Menu">☰</button>

              <div class="vb2-poofs" id="vb2Poofs"></div>
              <div class="vb2-word-clouds" id="vb2WordClouds"></div>
              <div class="vb2-obstacles" id="vb2Obstacles"></div>
              <div class="vb2-pipes" id="vb2Pipes"></div>
              <div class="vb2-bird-trail-layer" id="vb2BirdTrailLayer"></div>
              <div class="vb2-bird-layer"><div class="vb2-bird" id="vb2Bird"></div></div>
              <div class="vb2-intro-layer" id="vb2IntroLayer"></div>
              <div class="vb2-flash" id="vb2Flash"></div>
              <div class="vb2-result-layer" id="vb2ResultLayer" hidden></div>

            </div>
          </div>
        </div>

        ${renderHelpOverlay(gameHelpHtml())}
        ${renderGameMenuOverlay()}
      </div>
    `;

    state.field = document.getElementById("vb2Field");
    wireCommonNav();
    wireGameInput();
    updateBuildText();
    installResize();
    recalcLayout();
    renderBirdAsset();
    enterIntroPhase();
    startLoop();
  }

  function resetStateForRun(){
    state.running = true;
    state.paused = false;
    state.pauseReason = "";
    state.phase = "intro";
    state.lastTs = 0;
    state.startTs = 0;
    state.phaseStartedAt = 0;
    state.introStartedAt = 0;
    state.bonusStartedAt = 0;
    state.bonusIntroUnlockAt = 0;
    state.crashStartedAt = 0;
    state.worldX = 0;
    state.cloudBgX = 0;
    state.layout = null;
    state.birdColorCycleIndex = Math.floor(Math.random() * BIRD_COLORS.length);
    state.birdColor = BIRD_COLORS[state.birdColorCycleIndex];
    state.birdVY = 0;
    state.birdAngle = 0;
    state.birdSpinUntil = 0;
    state.birdFlapUntil = 0;
    state.birdHidden = false;
    state.bgClouds = [];
    state.nextBgCloudId = 1;
    state.bgCloudCooldown = 0.65;
    state.poofs = [];
    state.obstacles = [];
    state.beeTrailDots = [];
    state.birdTrailDots = [];
    state.birdTrailSparkles = [];
    state.nextObstacleId = 1;
    state.nextBeeTrailDotId = 1;
    state.nextBirdTrailId = 1;
    state.obstacleCloudCountdown = getNextObstacleCloudCountdown();
    state.wordCloud = null;
    state.nextCloudId = 1;
    state.cloudCooldown = 0;
    state.spawnHistory = [];
    state.forceCorrectNext = false;
    state.progressIndex = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.buildFitDone = false;
    state.bonusPipes = [];
    state.nextPipeId = 1;
    state.pipeCooldown = 0;
    state.pipesCleared = 0;
    state.bonusElapsed = 0;
    state.resultShown = false;
    state.flashUntil = 0;
    state.flashColor = "rgba(255,255,255,0.3)";
    state.shakeUntil = 0;
    state.skidCooldown = 0;
    state.birdTrailCooldown = 0;
    state.birdSparkleCooldown = 0;
    state.streakSpeedBoostU = 0;
    state.fpsFrames = 0;
    state.fpsLastAt = 0;
    state.fpsValue = 0;
    state.fpsLow = 999;
    state.fpsWorkTotal = 0;
    state.fpsWorkMax = 0;
    state.fpsWorkAvg = 0;
  }

  function enterIntroPhase(){
    state.phase = "intro";
    state.phaseStartedAt = performance.now();
    state.introStartedAt = state.phaseStartedAt;
    state.wordCloud = null;
    state.bonusPipes = [];
    state.birdHidden = false;
    clearBirdTrail();
    resetBird();
  }

  function enterVersePhase(){
    state.phase = "verse";
    state.phaseStartedAt = performance.now();
    state.wordCloud = null;
    state.obstacles = [];
    state.beeTrailDots = [];
    state.obstacleCloudCountdown = getNextObstacleCloudCountdown();
    state.cloudCooldown = 0.25;
    state.birdHidden = false;
  }

  function enterBonusIntroPhase() {
    state.phase = "bonusIntro";
    state.phaseStartedAt = performance.now();
    state.bonusIntroUnlockAt = 0;
    state.wordCloud = null;
    state.obstacles = [];
    state.beeTrailDots = [];
    state.bonusPipes = [];
    state.nextPipeId = 1;
    state.pipeCooldown = 0;
    state.pipesCleared = 0;
    state.bonusElapsed = 0;
    state.resultShown = false;
    state.birdHidden = false;
    clearBirdTrail();
    updateBuildText();
  }

  function enterBonusPhase() {
    state.phase = "bonus";
    state.phaseStartedAt = performance.now();
    state.bonusStartedAt = state.phaseStartedAt;
    state.bonusIntroUnlockAt = 0;
    state.bonusPipes = [];
    state.nextPipeId = 1;
    state.pipeCooldown = 0.55;
    state.pipesCleared = 0;
    state.bonusElapsed = 0;
    state.resultShown = false;
    state.birdHidden = false;
    clearBirdTrail();
    updateBuildText();
  }

  function enterBonusCrashPhase(){
    if (state.phase !== "bonus") return;
    state.phase = "bonusCrash";
    state.phaseStartedAt = performance.now();
    state.crashStartedAt = state.phaseStartedAt;
    state.birdSpinUntil = state.crashStartedAt + 1500;
    state.birdVY = -2.2 * state.layout.unit;
    flash("rgba(255, 90, 81, 0.28)", 160);
  }

  function showBonusResult(){
    if (state.resultShown) return;
    state.resultShown = true;
    state.phase = "bonusResult";
    state.running = false;
    stopLoop();

    const layer = document.getElementById("vb2ResultLayer");
    if (!layer) return;

    layer.hidden = false;
    layer.innerHTML = `
      <div class="vb2-result-card" role="dialog" aria-live="polite" aria-label="Bonus result">
        <h2 class="vb2-result-title">Great flying!</h2>
        <p class="vb2-result-stat">Pipes cleared: ${state.pipesCleared}</p>
        <button class="vb2-result-button" id="vb2ContinueButton" type="button">Continue</button>
      </div>
    `;

    const button = document.getElementById("vb2ContinueButton");
    if (button){
      button.addEventListener("click", () => finishRun());
      button.focus({ preventScroll: true });
    }
  }

  function renderComplete(){
    stopLoop();
    cleanupResize();

    const earnedMedalIconHtml = completionResult?.newlyCompleted
      ? medalIconHtmlForMode(selectedMode)
      : "";

    window.VerseGameShell.renderCompleteScreen({
      app,
      icon: GAME_ICON,
      iconHtml: earnedMedalIconHtml,
      gameIcon: GAME_ICON,
      mode: selectedMode,
      verseId: ctx.verseId,
      gameId: GAME_ID,
      completion: completionResult,
      gameMessage: `Finished ${ctx.verseRef || "the verse"}`,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: renderModeSelect,
      onMoreGames: () => window.VerseGameBridge.exitGame(),
      onChangeVerse: () => window.VerseGameBridge.returnToTitle()
    });
  }

  function renderHelpOverlay(body){
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body,
      closeText: "Close"
    });
  }

  function renderGameMenuOverlay(){
    return window.VerseGameShell.gameMenuHtml({
      id: MENU_OVERLAY_ID,
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function wireCommonNav(){
    window.VerseGameShell.wireGameMenu({
      id: MENU_OVERLAY_ID,
      menuButtonId: "vb2MenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        void unlockAudio();

        const nextMuted = !muted;
        if (!nextMuted) {
          playUiTapSound();
        }

        muted = nextMuted;
        return muted;
      },
      onHowToPlay: () => {
        void unlockAudio();
        playUiTapSound();
        openHelpFromMenu();
      },
      onModeSelect: () => {
        void unlockAudio();
        playUiTapSound();
        setPaused(false, "");
        renderModeSelect();
      },
      onExit: () => {
        void unlockAudio();
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        void unlockAudio();
        playUiTapSound();
        setPaused(true, "menu");
      },
      onClose: () => {
        void unlockAudio();
        playUiTapSound();
        setPaused(false, "");
      },
      onBackFromHelp: () => {
        void unlockAudio();
        playUiTapSound();
        setPaused(true, "menu");
      }
    });
  }

  function openHelpFromMenu(){
    const overlay = document.getElementById(HELP_OVERLAY_ID);
    if (overlay){
      overlay.removeAttribute("hidden");
    }
  }

  function setPaused(paused, reason = ""){
    if (!state.running && state.phase !== "bonusIntro") return;
    state.paused = paused;
    state.pauseReason = paused ? reason : "";
    if (!paused){
      state.lastTs = 0;
    }
  }

  function wireGameInput(){
    const field = document.getElementById("vb2Field");
    if (!field) return;

    field.addEventListener("pointerdown", (event) => {
      if (event.target && event.target.closest("button")) return;
      event.preventDefault();
      handleInput(event);
    }, { passive: false });

    window.addEventListener("keydown", (event) => {
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      if (!state.field) return;
      event.preventDefault();
      handleInput(event);
    });
  }

  function handleInput(event){
    const now = performance.now();
    if (now - state.lastInputAt < 70) return;
    state.lastInputAt = now;

    void unlockAudio();

    if (state.paused) return;

    if (state.phase === "intro" || state.phase === "verse" || state.phase === "bonusIntro" || state.phase === "bonus"){
      flap();
    }
  }

  function flap(){
    if (!state.layout) return;
    state.birdVY = getDifficulty().flapU * state.layout.unit;
    state.birdFlapUntil = performance.now() + 160;
    addFlapTrail();
    playRandomFlapSound();

    if (getBirdTrailLevel() >= 4){
      cycleBirdColor();
    }
  }

  function installResize(){
    state.resizeHandler = () => {
      recalcLayout();
      state.lastTs = 0;
    };
    window.addEventListener("resize", state.resizeHandler, { passive: true });
  }

  function cleanupResize(){
    if (!state.resizeHandler) return;
    window.removeEventListener("resize", state.resizeHandler);
    state.resizeHandler = null;
  }

  function recalcLayout(){
    const field = document.getElementById("vb2Field");
    if (!field) return;

    const rect = field.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    const widthBasedUnit = width / TARGET_FIELD_UNITS_WIDE;
    const heightBasedMaxUnit = height * MAX_UNIT_BY_HEIGHT;
    const birdH = clamp(widthBasedUnit, MIN_UNIT, Math.min(MAX_UNIT, heightBasedMaxUnit));
    const unit = birdH;
    const birdAspect = 155 / 136;
    const groundH = clamp(unit * 1.28, height * 0.14, height * 0.20);
    const hillH = unit * 3.0;
    const playTop = unit * 0.70;
    const groundY = height - groundH;
    const playBottom = groundY - unit * 0.54;
    const playH = Math.max(unit * 3.1, playBottom - playTop);

    state.layout = {
      width,
      height,
      unit,
      birdW: unit * birdAspect,
      birdH: unit,
      birdRadius: unit * 0.43,
      birdX: width * 0.25,
      groundH,
      groundY,
      hillH,
      playTop,
      playBottom,
      lanes: [
        playTop + playH * 0.20,
        playTop + playH * 0.50,
        playTop + playH * 0.80
      ],
      cloudSpawnX: width + unit * 2.3,
      cloudOffscreenX: -unit * 3.1,
      pipeSpawnX: width + unit * 1.85,
      pipeOffscreenX: -unit * 1.85,
      pipeW: unit * 1.72,
      pipeCapH: unit * 0.66,
      pipeMinH: unit * 0.78
    };

    document.documentElement.style.setProperty("--vb2-last-unit", `${unit}px`);
    field.style.setProperty("--vb2-ground-h", `${groundH}px`);
    field.style.setProperty("--vb2-hill-h", `${hillH}px`);
    field.style.setProperty("--vb2-hill-w", `${Math.ceil(hillH * 10 + 4)}px`);

    if (!state.birdX || state.birdX > width){
      state.birdX = state.layout.birdX;
    } else {
      state.birdX = state.layout.birdX;
    }

    if (!state.birdY){
      state.birdY = playTop + playH * 0.48;
    }

    state.birdY = clamp(state.birdY, playTop, groundY - state.layout.birdRadius);
  }

  function resetBird(){
    if (!state.layout) return;
    state.birdX = state.layout.birdX;
    state.birdY = state.layout.playTop + (state.layout.playBottom - state.layout.playTop) * 0.48;
    state.birdVY = 0;
    state.birdAngle = 0;
  }

  function startLoop(){
    stopLoop();
    state.running = true;
    state.lastTs = 0;
    state.rafId = requestAnimationFrame(tick);
  }

  function stopLoop(){
    if (state.rafId){
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
    state.running = false;
  }


  function tick(ts) {
    if (!state.running) {
      state.rafId = 0;
      return;
    }

    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.033, Math.max(0, (ts - state.lastTs) / 1000));
    state.lastTs = ts;

    if (!state.paused) {
      update(dt, ts);
    }

    render(ts);

    state.rafId = requestAnimationFrame(tick);
  }

  function update(dt, ts){
    if (!state.layout) return;

    updateStreakSpeedBoost(dt);
    updateWorldScroll(dt);
    updateBackgroundClouds(dt);
    updatePoofs(dt);
    updateBirdTrail(dt);

    if (state.phase === "intro"){
      updateBird(dt, false);

      const elapsed = (ts - state.introStartedAt) / 1000;
      if (isFlyingMessageComplete(INTRO_WORDS, elapsed)){
        enterVersePhase();
      }

      return;
    }

    if (state.phase === "verse"){
      updateBird(dt, false);
      updateVerseCloud(dt, ts);
      updateObstacles(dt, ts);
      return;
    }

    if (state.phase === "bonusIntro"){
      updateBird(dt, false);

      const elapsed = (ts - state.phaseStartedAt) / 1000;
      if (isFlyingMessageComplete(BONUS_WORDS, elapsed)){
        enterBonusPhase();
      }

      return;
    }

    if (state.phase === "bonus"){
      updateBird(dt, true);
      updateBonusPipes(dt, ts);
      return;
    }

    if (state.phase === "bonusCrash"){
      updateCrash(dt, ts);
    }
  }

  function updateStreakSpeedBoost(dt) {
    if (!state.layout) return;

    const target = getStreakSpeedBoostTargetU();
    const ease = getDifficulty().streakSpeedEaseU || 1.25;
    const step = ease * dt;
    const current = state.streakSpeedBoostU || 0;

    if (current < target) {
      state.streakSpeedBoostU = Math.min(target, current + step);
    } else if (current > target) {
      state.streakSpeedBoostU = Math.max(target, current - step * 1.65);
    }
  }

  function getStreakSpeedBoostTargetU() {
    if (state.phase !== "verse") return 0;

    const boosts = getDifficulty().streakSpeedBoostsU || [0];
    const level = getBirdTrailLevel();

    return boosts[Math.min(level, boosts.length - 1)] || 0;
  }

  function getVerseWorldSpeedU() {
    const d = getDifficulty();
    return d.worldSpeedU + (state.streakSpeedBoostU || 0);
  }

  function updateWorldScroll(dt){
    const speed = getActiveWorldSpeed();
    state.worldX -= speed * dt;
    state.cloudBgX -= speed * dt;
  }

  function updateBird(dt, bonusMode){
    const layout = state.layout;
    const difficulty = getDifficulty();
    state.birdVY += difficulty.gravityU * layout.unit * dt;
    state.birdY += state.birdVY * dt;

    if (state.birdY < layout.playTop){
      state.birdY = layout.playTop;
      state.birdVY = Math.max(0, state.birdVY * 0.25);
    }

    const floorY = layout.groundY - layout.birdRadius;
    if (state.birdY > floorY){
      state.birdY = floorY;
      if (bonusMode){
        enterBonusCrashPhase();
      } else {
        state.birdVY = Math.min(0, state.birdVY) * -0.12;
        updateGroundSkidDust(dt);
      }
    }
    state.birdAngle = clamp(state.birdVY / (layout.unit * 0.13), -24, 56);
  }

  function updateCrash(dt, ts){
    const layout = state.layout;
    state.birdVY += layout.unit * 16.5 * dt;
    state.birdY += state.birdVY * dt;

    for (const pipe of state.bonusPipes){
      pipe.x -= getBonusSpeed() * dt;
    }
    state.bonusPipes = state.bonusPipes.filter(pipe => pipe.x > layout.pipeOffscreenX);

    if (state.birdY > layout.height + layout.unit * 1.6 || ts - state.crashStartedAt > 1700){
      showBonusResult();
    }
  }

  function updateBackgroundClouds(dt) {
    if (!state.layout) return;

    state.bgCloudCooldown -= dt;
    if (state.bgCloudCooldown <= 0) {
      spawnBackgroundCloud();
      state.bgCloudCooldown = 2.8 + Math.random() * 3.2;
    }

    const baseSpeed = getActiveWorldSpeed();
    for (const cloud of state.bgClouds) {
      cloud.x -= baseSpeed * cloud.speedMult * dt;
      cloud.age += dt;
    }

    state.bgClouds = state.bgClouds.filter(cloud => {
      return cloud.x > -cloud.w * 0.75 && cloud.age < 30;
    });
  }

  function spawnBackgroundCloud() {
    const layout = state.layout;
    if (!layout) return;

    const keys = ["compact", "normal"];
    const shapeKey = keys[Math.floor(Math.random() * keys.length)];
    const shape = CLOUD_SHAPES[shapeKey];
    const heightU = getBackgroundCloudHeightU();
    const h = layout.unit * heightU;
    const w = h * shape.aspect;
    const minY = layout.playTop + layout.unit * 0.25;
    const maxY = Math.max(minY, layout.groundY - layout.hillH * 0.62);
    const y = minY + Math.random() * (maxY - minY);
    const opacity = heightU >= 1.55
      ? 0.07 + Math.random() * 0.08
      : 0.11 + Math.random() * 0.13;

    state.bgClouds.push({
      id: state.nextBgCloudId++,
      shapeKey,
      x: layout.width + w * 0.75,
      y,
      w,
      h,
      opacity,
      speedMult: 0.22 + Math.random() * 0.18,
      age: 0
    });
  }

  function getBackgroundCloudHeightU() {
    const roll = Math.random();

    if (roll < 0.70) {
      return 0.65 + Math.random() * 0.50;
    }

    if (roll < 0.95) {
      return 1.15 + Math.random() * 0.50;
    }

    return 1.65 + Math.random() * 0.35;
  }

  function updatePoofs(dt){
    for (const poof of state.poofs){
      poof.age += dt;
      poof.x += (poof.vx || 0) * dt;
      poof.x -= getWorldSpeed() * dt * 0.55;
      poof.y += poof.vy * dt;
      poof.rotation = (poof.rotation || 0) + (poof.spin || 0) * dt;
    }
    state.poofs = state.poofs.filter(poof => poof.age < poof.life);
  }

  function getBirdTrailProgressCount() {
    if (state.phase === "verse") {
      return state.streak;
    }

    if (state.phase === "bonusIntro" || state.phase === "bonus" || state.phase === "bonusCrash") {
      return state.pipesCleared;
    }

    return 0;
  }

  function getBirdTrailLevel() {
    const count = getBirdTrailProgressCount();

    if (count >= 13) return 4;
    if (count >= 10) return 3;
    if (count >= 7) return 2;
    if (count >= 4) return 1;
    return 0;
  }

  function clearBirdTrail() {
    state.birdTrailDots = [];
    state.birdTrailSparkles = [];
    state.birdTrailCooldown = 0;
    state.birdSparkleCooldown = 0;
  }

  function updateBirdTrail(dt) {
    if (!state.layout) return;

    const level = getBirdTrailLevel();
    if (level <= 0 || state.birdHidden) {
      clearBirdTrail();
      return;
    }

    const speed = getWorldSpeed();

    for (const dot of state.birdTrailDots) {
      dot.age += dt;
      dot.x -= speed * dt;
      dot.x += dot.vx * dt;
      dot.y += dot.vy * dt;
    }

    for (const sparkle of state.birdTrailSparkles) {
      sparkle.age += dt;
      sparkle.x -= speed * dt;
      sparkle.x += sparkle.vx * dt;
      sparkle.y += sparkle.vy * dt;
      sparkle.rotation += sparkle.spin * dt;
    }

    state.birdTrailCooldown -= dt;
    if (state.birdTrailCooldown <= 0) {
      addBirdTrailDot(level);
      state.birdTrailCooldown = level >= 3 ? 0.034 : 0.044;
    }

    if (level >= 2) {
      state.birdSparkleCooldown -= dt;
      if (state.birdSparkleCooldown <= 0) {
        addBirdTrailSparkle(level);
        state.birdSparkleCooldown = level >= 4 ? 0.075 : 0.13;
      }
    }

    state.birdTrailDots = state.birdTrailDots.filter(dot => {
      return dot.age < dot.life && dot.x > -dot.size * 2.2;
    });

    state.birdTrailSparkles = state.birdTrailSparkles.filter(sparkle => {
      return sparkle.age < sparkle.life && sparkle.x > -sparkle.size * 2.2;
    });
  }

  function addBirdTrailDot(level) {
    if (!state.layout) return;

    const unit = state.layout.unit;
    const isRainbow = level >= 3;
    const colors = isRainbow
      ? PARTICLE_COLORS.rainbow
      : ["rgba(255,255,255,0.88)", "rgba(245,252,255,0.78)"];

    const color = colors[state.nextBirdTrailId % colors.length];
    const sizeMin = isRainbow ? 0.13 : 0.10;
    const sizeMax = isRainbow ? 0.22 : 0.18;

    state.birdTrailDots.push({
      id: state.nextBirdTrailId++,
      x: state.birdX - unit * 0.48 + randomBetween(-0.06, 0.08) * unit,
      y: state.birdY + randomBetween(-0.26, 0.26) * unit,
      vx: randomBetween(-0.18, 0.04) * unit,
      vy: randomBetween(-0.15, 0.15) * unit,
      size: randomBetween(sizeMin, sizeMax) * unit,
      color,
      opacity: isRainbow ? 0.86 : 0.72,
      life: 3.2,
      age: 0
    });
  }

  function addBirdTrailSparkle(level) {
    if (!state.layout) return;

    const unit = state.layout.unit;
    const colors = level >= 4
      ? PARTICLE_COLORS.rainbow
      : ["#ffc751", "#ffe58a", "#fff4b8"];

    state.birdTrailSparkles.push({
      id: state.nextBirdTrailId++,
      x: state.birdX - unit * randomBetween(0.42, 0.78),
      y: state.birdY + randomBetween(-0.36, 0.36) * unit,
      vx: randomBetween(-0.16, 0.06) * unit,
      vy: randomBetween(-0.26, 0.26) * unit,
      size: randomBetween(0.11, level >= 4 ? 0.22 : 0.18) * unit,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      spin: randomBetween(-260, 260),
      opacity: level >= 4 ? 0.92 : 0.86,
      life: randomBetween(0.48, 0.78),
      age: 0
    });
  }

  function updateVerseCloud(dt, ts){
    const layout = state.layout;

    if (!state.wordCloud){
      state.cloudCooldown = Math.max(0, state.cloudCooldown - dt);
      if (state.cloudCooldown <= 0 && getCurrentPhase() !== "done"){
        spawnVerseCloud();
      }
      return;
    }

    const cloud = state.wordCloud;
    cloud.x -= getWorldSpeed() * dt;

    if (!cloud.collected && circlesOverlap(state.birdX, state.birdY, layout.birdRadius, cloud.x, cloud.y, cloud.hitRadius)){
      if (cloud.correct){
        collectCorrectCloud(cloud, ts);
      } else {
        collectDecoyCloud(cloud, ts);
      }
    }

    const cloudRightEdge = cloud.x + cloud.w * 0.5;

    if (cloudRightEdge <= 0){
      if (!cloud.collected && cloud.correct){
        missCorrectCloud(ts);
      }
      state.wordCloud = null;
      state.cloudCooldown = 0.18;
    }
  }

  function spawnVerseCloud(){
    const phase = getCurrentPhase();
    if (phase === "done"){
      enterBonusIntroPhase();
      return;
    }

    const correctLabel = getCurrentCorrectLabel();
    const shouldBeCorrect = chooseCorrectOrDecoy();
    const decoys = getDecoysForPhase(phase, correctLabel, 4);
    const label = (shouldBeCorrect || decoys.length === 0)
      ? correctLabel
      : decoys[Math.floor(Math.random() * decoys.length)];
    const isCorrectCloud = label === correctLabel;

    const shapeKey = getCloudShapeKey(label);
    const shape = CLOUD_SHAPES[shapeKey];
    const layout = state.layout;
    const h = shape.heightU * layout.unit;
    const w = h * shape.aspect;
    const laneIndex = Math.floor(Math.random() * layout.lanes.length);
    const laneY = layout.lanes[laneIndex];
    const hitPadding = getDifficulty().hitPaddingU * layout.unit;
    const baseHitRadius = Math.max(w * 0.34, h * 0.54) + hitPadding;
    const hitRadius = isCorrectCloud
      ? baseHitRadius
      : baseHitRadius * DECOY_CLOUD_HITBOX_SCALE;

    state.wordCloud = {
      id: state.nextCloudId++,
      label,
      phase,
      correct: isCorrectCloud,
      x: layout.cloudSpawnX,
      y: clamp(laneY, layout.playTop + h * 0.52, layout.playBottom - h * 0.28),
      laneIndex,
      w,
      h,
      shapeKey,
      textX: shape.textX,
      textY: shape.textY,
      hitRadius,
      collected: false,
      collectAt: 0
    };

    tickObstacleCloudRhythm();
  }

  function getNextObstacleCloudCountdown() {
    const difficulty = getDifficulty();
    const choices = difficulty.obstacleCloudChoices;

    if (Array.isArray(choices) && choices.length) {
      return choices[Math.floor(Math.random() * choices.length)];
    }

    const min = difficulty.obstacleCloudMin || 3;
    const max = difficulty.obstacleCloudMax || min;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function tickObstacleCloudRhythm() {
    if (state.phase !== "verse" || !state.layout) return;

    state.obstacleCloudCountdown -= 1;
    if (state.obstacleCloudCountdown > 0) return;

    if (!hasRecentObstacleNearSpawn()) {
      spawnObstacle();
    }

    state.obstacleCloudCountdown = getNextObstacleCloudCountdown();
  }

  function hasRecentObstacleNearSpawn() {
    if (!state.layout) return true;
    const minX = state.layout.width - state.layout.unit * 0.15;
    return state.obstacles.some(obstacle => !obstacle.hit && obstacle.x > minX);
  }

  function spawnObstacle() {
    if (!state.layout) return;

    const difficulty = getDifficulty();
    const type = Math.random() < difficulty.obstacleBeeChance ? "bee" : "boulder";

    if (type === "bee") {
      spawnBeeObstacle();
    } else {
      spawnBoulderObstacle();
    }
  }

  function spawnBoulderObstacle() {
    const layout = state.layout;
    const h = layout.unit;
    const w = h * 1.48;
    const bottomY = layout.groundY + h * 0.135;
    const y = bottomY - h * 0.5;

    state.obstacles.push({
      id: state.nextObstacleId++,
      type: "boulder",
      x: layout.width + layout.unit * 4.0,
      y,
      baseY: y,
      w,
      h,
      hitRadius: h * 0.43,
      age: 0,
      hit: false,
      hitAt: 0
    });
  }

  function spawnBeeObstacle() {
    const layout = state.layout;
    const h = layout.unit;
    const w = h * 1.02;
    const laneIndex = chooseBeeLaneIndex();
    const baseY = layout.lanes[laneIndex];

    state.obstacles.push({
      id: state.nextObstacleId++,
      type: "bee",
      x: layout.width + layout.unit * 4.2,
      y: baseY,
      baseY,
      laneIndex,
      w,
      h,
      hitRadius: h * 0.38,
      age: 0,
      wavePhase: Math.random() * Math.PI * 2,
      trailCooldown: 0,
      hit: false,
      hitAt: 0
    });
  }

  function chooseBeeLaneIndex() {
    const layout = state.layout;
    if (!layout) return 1;

    const lanes = layout.lanes.map((_, index) => index);
    const cloudLaneIndex = state.wordCloud && Number.isFinite(state.wordCloud.laneIndex)
      ? state.wordCloud.laneIndex
      : -1;

    const openLanes = lanes.filter(index => index !== cloudLaneIndex);
    const choices = openLanes.length ? openLanes : lanes;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function updateObstacles(dt, ts) {
    const layout = state.layout;
    if (!layout) return;

    const speed = getWorldSpeed();
    const beeSpeed = speed * 1.5;

    for (const obstacle of state.obstacles) {
      obstacle.age += dt;

      if (obstacle.type === "bee") {
        const hitElapsed = obstacle.hit ? Math.max(0, (ts - obstacle.hitAt) / 1000) : 0;
        const currentBeeSpeed = obstacle.hit ? speed * 4.4 : beeSpeed;
        const amplitude = obstacle.hit ? layout.unit * 1.05 : layout.unit * 0.36;
        const waveRate = obstacle.hit ? 15.5 : 6.1;
        const wildWiggle = obstacle.hit
          ? Math.sin(obstacle.age * 28 + obstacle.wavePhase) * amplitude * 0.28
          : 0;
        const extraLift = obstacle.hit ? -hitElapsed * layout.unit * 1.15 : 0;

        obstacle.x -= currentBeeSpeed * dt;
        obstacle.y = obstacle.baseY
          + Math.sin(obstacle.age * waveRate + obstacle.wavePhase) * amplitude
          + wildWiggle
          + extraLift;

        obstacle.trailCooldown -= dt;

        if (!obstacle.hit && obstacle.trailCooldown <= 0) {
          addBeeTrailDot(obstacle);
          obstacle.trailCooldown = 0.045;
        }
      } else {
        obstacle.x -= speed * dt;
      }

      if (!obstacle.hit && circlesOverlap(state.birdX, state.birdY, layout.birdRadius, obstacle.x, obstacle.y, obstacle.hitRadius)) {
        hitObstacle(obstacle, ts);
      }
    }

    for (const dot of state.beeTrailDots) {
      dot.age += dt;
      dot.x -= speed * dt;
    }

    state.obstacles = state.obstacles.filter(obstacle => {
      if (obstacle.hit) {
        const keepMs = obstacle.type === "bee" ? 900 : 270;
        if (ts - obstacle.hitAt > keepMs) return false;
      }
      return obstacle.x > -layout.unit * 2.2;
    });

    state.beeTrailDots = state.beeTrailDots.filter(dot => dot.age < dot.life && dot.x > -layout.unit);
  }

  function addBeeTrailDot(bee) {
    if (!state.layout) return;

    state.beeTrailDots.push({
      id: state.nextBeeTrailDotId++,
      x: bee.x + bee.w * 0.28,
      y: bee.y + (Math.random() - 0.5) * state.layout.unit * 0.10,
      size: state.layout.unit * (0.055 + Math.random() * 0.025),
      life: 1.65,
      age: 0
    });
  }

  function hitObstacle(obstacle, ts) {
    obstacle.hit = true;
    obstacle.hitAt = ts;
    state.streak = 0;
    clearBirdTrail();
    state.birdSpinUntil = ts + 620;
    state.shakeUntil = ts + 260;
    if (obstacle.type === "boulder") {
      playGameSound("boulder");
      addBoulderBurst(obstacle);
    } else {
      playGameSound("beeHit");
      addBeeLightningBurst(obstacle);
    }
    flash("rgba(255, 90, 81, 0.25)", 130);
  }

  function chooseCorrectOrDecoy(){
    if (state.forceCorrectNext){
      state.forceCorrectNext = false;
      rememberSpawn(true);
      return true;
    }

    const history = state.spawnHistory.slice(-4);
    const decoyRun = countRun(false);
    const correctRun = countRun(true);

    let decoyChance = 0.28;
    if (decoyRun >= 2) decoyChance = 0;
    else if (correctRun >= 4) decoyChance = 0.62;
    else if (correctRun >= 3) decoyChance = 0.42;
    else if (history.length >= 3 && !history.includes(false)) decoyChance = 0.48;

    const isDecoy = Math.random() < decoyChance;
    const isCorrect = !isDecoy;
    rememberSpawn(isCorrect);
    return isCorrect;
  }

  function rememberSpawn(isCorrect){
    state.spawnHistory.push(isCorrect);
    if (state.spawnHistory.length > 10){
      state.spawnHistory.shift();
    }
  }

  function countRun(value){
    let total = 0;
    for (let i = state.spawnHistory.length - 1; i >= 0; i--){
      if (state.spawnHistory[i] !== value) break;
      total += 1;
    }
    return total;
  }

  function collectCorrectCloud(cloud, ts){
    cloud.collected = true;
    cloud.collectAt = ts;

    const previousTrailLevel = getBirdTrailLevel();

    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.progressIndex += 1;

    const nextTrailLevel = getBirdTrailLevel();

    playGameSound("correct");
    if (nextTrailLevel > previousTrailLevel) {
      playGameSound("streak");
    }

    addCorrectCloudBurst(cloud);
    flash("rgba(120, 220, 190, 0.25)", 110);
    updateBuildText();

    setTimeout(() => {
      if (state.wordCloud && state.wordCloud.id === cloud.id){
        state.wordCloud = null;
        state.cloudCooldown = getDifficulty().cloudGapU / Math.max(1, getVerseWorldSpeedU());
        if (getCurrentPhase() === "done"){
          enterBonusIntroPhase();
        }
      }
    }, 220);
  }

  function collectDecoyCloud(cloud, ts){
    cloud.collected = true;
    cloud.collectAt = ts;
    state.streak = 0;
    clearBirdTrail();
    state.birdSpinUntil = ts + 620;
    state.shakeUntil = ts + 260;
    playGameSound("wrong");
    addWrongCloudBurst(cloud);
    flash("rgba(255, 90, 81, 0.25)", 130);

    setTimeout(() => {
      if (state.wordCloud && state.wordCloud.id === cloud.id){
        state.wordCloud = null;
        state.cloudCooldown = 0.24;
      }
    }, 230);
  }

  function missCorrectCloud(ts){
    playGameSound("wrong");

    if (selectedMode !== "easy"){
      state.streak = 0;
      clearBirdTrail();
      state.shakeUntil = ts + 220;
      flash("rgba(255, 199, 81, 0.24)", 120);
    }
    state.forceCorrectNext = true;
  }

  function updateBonusPipes(dt, ts){
    const layout = state.layout;
    state.bonusElapsed = Math.max(0, (ts - state.bonusStartedAt) / 1000);

    state.pipeCooldown -= dt;
    if (state.pipeCooldown <= 0){
      spawnPipePair();
      state.pipeCooldown = getPipeSpacingSeconds();
    }

    const speed = getBonusSpeed();
    for (const pipe of state.bonusPipes){
      pipe.x -= speed * dt;
      if (!pipe.passed && pipe.x + layout.pipeW * 0.5 < state.birdX){
        pipe.passed = true;
        state.pipesCleared += 1;
        playGameSound("pipeCleared");
        updateBuildText();
      }
    }

    state.bonusPipes = state.bonusPipes.filter(pipe => pipe.x > layout.pipeOffscreenX);

    for (const pipe of state.bonusPipes){
      if (pipeHitsBird(pipe)){
        playGameSound("pipeCrash");
        addPipeBurst();
        enterBonusCrashPhase();
        break;
      }
    }
  }

  function spawnPipePair(){
    const layout = state.layout;
    const gap = getBonusGap();
    const capOverlap = Math.max(1, layout.unit * 0.035);
    const groundClearance = layout.unit * 0.10;
    const safeTop = layout.playTop + gap * 0.5 + layout.unit * 0.3;
    const safeBottom = layout.groundY - groundClearance - layout.pipeCapH + capOverlap - gap * 0.5;
    const gapY = safeTop >= safeBottom
      ? safeBottom
      : safeTop + Math.random() * (safeBottom - safeTop);

    state.bonusPipes.push({
      id: state.nextPipeId++,
      x: layout.pipeSpawnX,
      gapY,
      gap,
      passed: false
    });
  }

  function pipeHitsBird(pipe){
    const layout = state.layout;
    const birdLeft = state.birdX - layout.birdRadius * 0.78;
    const birdRight = state.birdX + layout.birdRadius * 0.78;
    const birdTop = state.birdY - layout.birdRadius * 0.78;
    const birdBottom = state.birdY + layout.birdRadius * 0.78;

    const pipeLeft = pipe.x - layout.pipeW * 0.5;
    const pipeRight = pipe.x + layout.pipeW * 0.5;
    if (birdRight < pipeLeft || birdLeft > pipeRight) return false;

    const gapTop = pipe.gapY - pipe.gap * 0.5;
    const gapBottom = pipe.gapY + pipe.gap * 0.5;
    return birdTop < gapTop || birdBottom > gapBottom;
  }

  function render(ts){
    renderBackground();
    renderBackgroundClouds();
    renderPoofs();
    renderBirdTrail();
    renderWordCloud(ts);
    renderObstacles();
    renderPipes();
    renderBird(ts);
    renderIntroLayer(ts);
    renderFlash(ts);
    renderBuildShake(ts);

  }

  function renderHillStrips() {
    const stripA = document.getElementById("vb2HillStripA");
    const stripB = document.getElementById("vb2HillStripB");
    if (!stripA || !stripB || !state.layout) return;

    const hillW = Math.ceil(state.layout.hillH * 10 + 4);
    const overlap = 6;
    const loopW = hillW - overlap;
    const x = ((state.worldX % loopW) + loopW) % loopW - loopW;

    stripA.style.transform = `translateX(${x}px)`;
    stripB.style.transform = `translateX(${x + loopW}px)`;
  }

  function renderBackground(){
    const field = document.getElementById("vb2Field");
    if (!field || !state.layout) return;

    field.style.setProperty("--vb2-ground-x", `${state.worldX}px`);
    field.style.setProperty("--vb2-cloud-x", `${state.cloudBgX}px`);
    renderHillStrips();
  }

  function renderBackgroundClouds() {
    const layer = document.getElementById("vb2BgClouds");
    if (!layer || !state.layout) return;

    layer.innerHTML = state.bgClouds.map(cloud => {
      const shape = CLOUD_SHAPES[cloud.shapeKey];
      return `
        <div class="vb2-bg-cloud"
             style="
               --x:${cloud.x}px;
               --y:${cloud.y}px;
               --w:${cloud.w}px;
               --h:${cloud.h}px;
               --opacity:${cloud.opacity};
               --cloud-img:url('${IMAGE_PATH}${shape.image}');
             ">
        </div>
      `;
    }).join("");
  }

  function renderPoofs(){
    const layer = document.getElementById("vb2Poofs");
    if (!layer || !state.layout) return;

    layer.innerHTML = state.poofs.map(poof => {
      const p = clamp(poof.age / poof.life, 0, 1);
      const grow = Number.isFinite(poof.grow) ? poof.grow : 0.65;
      const size = poof.size * (1 + p * grow);
      const opacity = (poof.opacity || 1) * (1 - p);
      const rotation = poof.rotation || 0;

      if (poof.image) {
        return `
          <div class="vb2-poof vb2-poof--image"
               style="
                 left:${poof.x}px;
                 top:${poof.y}px;
                 width:${size}px;
                 height:${size}px;
                 opacity:${opacity};
                 transform: translate(-50%, -50%) rotate(${rotation}deg);
                 --poof-img:url('${IMAGE_PATH}${poof.image}');
               ">
          </div>
        `;
      }

      const color = poof.color || "rgba(255,255,255,0.78)";
      const ringColor = poof.ringColor || "rgba(255,255,255,0.30)";

      return `
        <div class="vb2-poof"
             style="
               left:${poof.x}px;
               top:${poof.y}px;
               width:${size}px;
               height:${size}px;
               opacity:${opacity};
               --poof-color:${color};
               --poof-ring-color:${ringColor};
             ">
        </div>
      `;
    }).join("");
  }

  function renderBirdTrail() {
    const layer = document.getElementById("vb2BirdTrailLayer");
    if (!layer || !state.layout) return;

    if (!state.birdTrailDots.length && !state.birdTrailSparkles.length) {
      if (layer.innerHTML) layer.innerHTML = "";
      return;
    }

    const dotsHtml = state.birdTrailDots.map(dot => {
      const p = clamp(dot.age / dot.life, 0, 1);
      const size = dot.size * (1 - p * 0.32);
      const opacity = dot.opacity * (1 - p);
      return `
        <div class="vb2-bird-trail-dot"
             style="
               --x:${dot.x}px;
               --y:${dot.y}px;
               --size:${size}px;
               --trail-color:${dot.color};
               opacity:${opacity};
             ">
        </div>
      `;
    }).join("");

    const sparklesHtml = state.birdTrailSparkles.map(sparkle => {
      const p = clamp(sparkle.age / sparkle.life, 0, 1);
      const size = sparkle.size * (1 - p * 0.18);
      const opacity = sparkle.opacity * (1 - p);
      return `
        <div class="vb2-bird-trail-sparkle"
             style="
               --x:${sparkle.x}px;
               --y:${sparkle.y}px;
               --size:${size}px;
               --sparkle-color:${sparkle.color};
               --rotation:${sparkle.rotation}deg;
               opacity:${opacity};
             ">
        </div>
      `;
    }).join("");

    layer.innerHTML = dotsHtml + sparklesHtml;
  }

  function renderWordCloud(ts) {
    const layer = document.getElementById("vb2WordClouds");
    if (!layer || !state.layout) return;

    if (!state.wordCloud) {
      if (layer.innerHTML) {
        layer.innerHTML = "";
        delete layer.dataset.cloudRenderKey;
      }
      return;
    }

    const cloud = state.wordCloud;
    const shape = CLOUD_SHAPES[cloud.shapeKey];
    const collectedClass = cloud.collected ? " vb2-collected" : "";
    const correctnessClass = cloud.correct ? " is-correct" : " is-decoy";
    const renderKey = [
      cloud.id,
      cloud.label,
      cloud.shapeKey,
      cloud.correct ? "correct" : "decoy",
      cloud.collected ? "collected" : "active"
    ].join("|");

    let token = layer.firstElementChild;

    if (!token || layer.dataset.cloudRenderKey !== renderKey) {
      layer.dataset.cloudRenderKey = renderKey;
      layer.innerHTML = `
        <div class="vb2-cloud-token${correctnessClass}${collectedClass}">
          <div class="vb2-cloud-word">${escapeHtml(cloud.label)}</div>
        </div>
      `;
      token = layer.firstElementChild;
    }

    if (!token) return;

    const wordSize = getWordFontSize(cloud);
    const danceDelay = cloud.collected ? "0ms" : `${-((ts + cloud.id * 389) % 3600)}ms`;

    token.style.left = `${cloud.x}px`;
    token.style.top = `${cloud.y}px`;
    token.style.setProperty("--cloud-w", `${cloud.w}px`);
    token.style.setProperty("--cloud-h", `${cloud.h}px`);
    token.style.setProperty("--cloud-img", `url('${IMAGE_PATH}${shape.image}')`);
    token.style.setProperty("--text-x", `${cloud.textX}%`);
    token.style.setProperty("--text-y", `${cloud.textY}%`);
    token.style.setProperty("--word-size", `${wordSize}px`);
    token.style.animationDelay = danceDelay;
  }
  

  function renderObstacles() {
    const layer = document.getElementById("vb2Obstacles");
    if (!layer || !state.layout) return;

    const dotsHtml = state.beeTrailDots.map(dot => {
      const p = clamp(dot.age / dot.life, 0, 1);
      const opacity = 0.50 * (1 - p);
      const size = dot.size * (1 - p * 0.10);
      return `
        <div class="vb2-bee-trail-dot"
             style="
               --x:${dot.x}px;
               --y:${dot.y}px;
               --size:${size}px;
               opacity:${opacity};
             ">
        </div>
      `;
    }).join("");

    const obstacleHtml = state.obstacles.map(obstacle => {
      const hitClass = obstacle.hit ? " is-hit" : "";
      return `
        <div class="vb2-obstacle vb2-obstacle--${obstacle.type}${hitClass}"
             style="
               --x:${obstacle.x}px;
               --y:${obstacle.y}px;
               --w:${obstacle.w}px;
               --h:${obstacle.h}px;
             ">
        </div>
      `;
    }).join("");

    layer.innerHTML = dotsHtml + obstacleHtml;
  }

  function renderPipes(){
    const layer = document.getElementById("vb2Pipes");
    if (!layer || !state.layout) return;

    const layout = state.layout;
    const capH = layout.pipeCapH;
    const pieces = [];

    for (const pipe of state.bonusPipes){
      const gapTop = pipe.gapY - pipe.gap * 0.5;
      const gapBottom = pipe.gapY + pipe.gap * 0.5;
      const topPieceH = Math.max(0, gapTop + 2);
      const bottomPieceTop = gapBottom - 2;
      const bottomPieceH = Math.max(layout.pipeMinH, layout.groundY - bottomPieceTop + 4);
      const capOverlap = Math.max(1, layout.unit * 0.035);

      pieces.push(`
        <div class="vb2-pipe-piece" style="--x:${pipe.x}px; --pipe-w:${layout.pipeW}px; top:0px; height:${topPieceH}px;"></div>
        <div class="vb2-pipe-cap vb2-pipe-cap--top" style="--x:${pipe.x}px; --pipe-w:${layout.pipeW}px; top:${gapTop - capH + capOverlap}px; height:${capH}px;"></div>
        <div class="vb2-pipe-piece" style="--x:${pipe.x}px; --pipe-w:${layout.pipeW}px; top:${bottomPieceTop}px; height:${bottomPieceH}px;"></div>
        <div class="vb2-pipe-cap vb2-pipe-cap--bottom" style="--x:${pipe.x}px; --pipe-w:${layout.pipeW}px; top:${gapBottom - capOverlap}px; height:${capH}px;"></div>
      `);
    }

    layer.innerHTML = pieces.join("");
  }

  function renderBird(ts){
    const bird = document.getElementById("vb2Bird");
    if (!bird || !state.layout) return;

    bird.classList.toggle("is-hidden", state.birdHidden);
    bird.classList.toggle("is-flapping", ts < state.birdFlapUntil);
    bird.style.setProperty("--bird-w", `${state.layout.birdW}px`);
    bird.style.setProperty("--bird-h", `${state.layout.birdH}px`);
    bird.style.left = `${state.birdX}px`;
    bird.style.top = `${state.birdY}px`;

    let angle = state.birdAngle;
    if (ts < state.birdSpinUntil){
      angle = ((ts / 1000) * 880) % 360;
    }

    if (state.phase === "bonusCrash"){
      angle = ((ts - state.crashStartedAt) / 1000) * 720;
    }

    bird.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
  }

  function renderIntroLayer(ts){
    const layer = document.getElementById("vb2IntroLayer");
    if (!layer || !state.layout) return;

    if (state.phase === "intro"){
      const elapsed = (ts - state.introStartedAt) / 1000;
      layer.innerHTML = INTRO_WORDS.map((word, index) => renderFlyingIntroWord(INTRO_WORDS, word, index, elapsed)).join("");
      return;
    }

    if (state.phase === "bonusIntro"){
      const elapsed = (ts - state.phaseStartedAt) / 1000;
      layer.innerHTML = BONUS_WORDS.map((word, index) => renderFlyingIntroWord(BONUS_WORDS, word, index, elapsed)).join("");
      return;
    }

    layer.innerHTML = "";
  }

  function isFlyingMessageComplete(words, elapsed) {
    if (!Array.isArray(words) || words.length === 0) return true;

    const lastDelay = words.reduce((latest, word) => {
      return Math.max(latest, Number(word.delay) || 0);
    }, 0);

    return elapsed >= lastDelay + FLYING_WORD_TRAVEL_SECONDS + FLYING_MESSAGE_GRACE_SECONDS;
  }

  function getFlyingWordWidth(word, size) {
    const text = String(word && word.text ? word.text : "");
    return text.length * size * 0.72 + size * 1.70;
  }

  function getFlyingWordLineOffset(words, index, size) {
    if (!Array.isArray(words)) return 0;

    const current = words[index];
    if (!current) return 0;

    const pillGap = size * 1.1;
    let offset = 0;

    for (let i = 0; i < index; i += 1) {
      const previous = words[i];
      if (!previous || previous.line !== current.line) continue;

      offset += getFlyingWordWidth(previous, size) + pillGap;
    }

    return offset;
  }

  function renderFlyingIntroWord(words, word, index, elapsed) {
    const layout = state.layout;
    const t = elapsed - word.delay;
    const travel = FLYING_WORD_TRAVEL_SECONDS;
    const size = clamp(layout.unit * 0.42, 18, 34);
    const wordW = getFlyingWordWidth(word, size);
    const lineOffset = getFlyingWordLineOffset(words, index, size);
    const startX = layout.width + wordW * 0.5 + layout.unit * 0.65 + lineOffset;
    const endX = -(wordW * 0.5 + layout.unit * 0.25);
    const progress = clamp(t / travel, 0, 1);
    const x = startX + (endX - startX) * progress;
    const baseY = word.line === 0
      ? layout.playTop + (layout.playBottom - layout.playTop) * 0.32
      : layout.playTop + (layout.playBottom - layout.playTop) * 0.60;
    const y = baseY + Math.sin((t * 5.4) + index) * layout.unit * 0.18;
    const tilt = Math.sin((t * 4.2) + index) * 5;
    const opacity = t < 0 || t > travel ? 0 : 1;

    const phraseClass = word.line === 0 ? " is-first-phrase" : " is-second-phrase";

    return `
      <div class="vb2-flying-word${phraseClass}" style="--x:${x}px; --y:${y}px; --tilt:${tilt}deg; --size:${size}px; opacity:${opacity};">
        ${escapeHtml(word.text)}
      </div>
    `;
  }

  function renderFlash(ts){
    const flash = document.getElementById("vb2Flash");
    if (!flash) return;

    if (ts <= state.flashUntil){
      flash.classList.add("is-on");
      flash.style.background = state.flashColor;
    } else {
      flash.classList.remove("is-on");
    }
  }


  function renderBuildShake(ts){
    const build = document.getElementById("vb2Build");
    if (!build) return;

    if (ts <= state.shakeUntil){
      build.classList.add("vb2-shake");
    } else {
      build.classList.remove("vb2-shake");
    }
  }

  function getWordFontSize(cloud) {
    return cloud.h * WORD_CLOUD_TEXT_HEIGHT_RATIO;
  }

  function addFlapTrail(){
    if (!state.layout) return;

    const unit = state.layout.unit;
    const exhaustAngleDeg = -45;
    const exhaustAngleRad = exhaustAngleDeg * Math.PI / 180;
    const dirX = Math.sin(exhaustAngleRad);
    const dirY = Math.cos(exhaustAngleRad);

    const baseX = state.birdX;
    const baseY = state.birdY + unit * 0.18;

    const puffs = [
      { distanceU: 0.14, sizeU: 0.16, life: 0.24, speedU: 0.55 },
      { distanceU: 0.42, sizeU: 0.27, life: 0.32, speedU: 0.40 },
      { distanceU: 0.74, sizeU: 0.40, life: 0.40, speedU: 0.25 }
    ];

    for (const puff of puffs){
      addPoof(
        baseX + dirX * puff.distanceU * unit,
        baseY + dirY * puff.distanceU * unit,
        puff.sizeU,
        puff.life,
        dirX * puff.speedU * unit,
        dirY * puff.speedU * unit
      );
    }
  }

  function addPoof(x, y, sizeU, life, vx = 0, vy = null, color = "rgba(255,255,255,0.78)"){
    if (!state.layout) return;
    state.poofs.push({
      id: Math.random().toString(36).slice(2),
      x,
      y,
      size: sizeU * state.layout.unit,
      vx,
      vy: vy === null ? (Math.random() - 0.5) * state.layout.unit * 0.25 : vy,
      color,
      ringColor: "rgba(255,255,255,0.30)",
      grow: 0.65,
      opacity: 1,
      life,
      age: 0
    });
  }

  function addParticleBurst(x, y, options = {}){
    if (!state.layout) return;

    const unit = state.layout.unit;
    const count = options.count || 12;
    const colors = options.colors || PARTICLE_COLORS.white;
    const sizeU = options.sizeU || [0.10, 0.20];
    const speedU = options.speedU || [1.8, 3.8];
    const life = options.life || [0.34, 0.62];
    const grow = Number.isFinite(options.grow) ? options.grow : 0.18;
    const jitter = Number.isFinite(options.jitter) ? options.jitter : 0.22;
    const image = options.image || "";
    const spinU = options.spinU || [0, 0];
    const startAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < count; i++){
      const evenAngle = startAngle + (Math.PI * 2 * i) / count;
      const angle = evenAngle + (Math.random() - 0.5) * jitter;
      const speed = randomBetween(speedU[0], speedU[1]) * unit;
      const size = randomBetween(sizeU[0], sizeU[1]) * unit;
      const particleLife = randomBetween(life[0], life[1]);
      const color = colors[Math.floor(Math.random() * colors.length)];

      state.poofs.push({
        id: Math.random().toString(36).slice(2),
        x,
        y,
        size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        image,
        rotation: Math.random() * 360,
        spin: randomBetween(spinU[0], spinU[1]) * (Math.random() < 0.5 ? -1 : 1),
        ringColor: "rgba(255,255,255,0.24)",
        grow,
        opacity: options.opacity || 1,
        life: particleLife,
        age: 0
      });
    }
  }

  function randomBetween(min, max){
    return min + Math.random() * (max - min);
  }

  function addBurst(x, y, count){
    addParticleBurst(x, y, {
      count,
      colors: PARTICLE_COLORS.white,
      sizeU: [0.11, 0.22],
      speedU: [1.4, 3.2],
      life: [0.28, 0.48],
      grow: 0.45
    });
  }

  function addCorrectCloudBurst(cloud){
    addParticleBurst(cloud.x, cloud.y, {
      count: 18,
      colors: PARTICLE_COLORS.rainbow,
      sizeU: [0.10, 0.21],
      speedU: [2.1, 4.6],
      life: [0.42, 0.72],
      grow: 0.12,
      jitter: 0.18
    });
  }

  function addWrongCloudBurst(cloud){
    addParticleBurst(cloud.x, cloud.y, {
      count: 11,
      colors: PARTICLE_COLORS.white,
      sizeU: [0.07, 0.14],
      speedU: [1.5, 3.0],
      life: [0.30, 0.52],
      grow: 0.20,
      jitter: 0.22
    });
  }

  function addBoulderBurst(obstacle){
    addParticleBurst(obstacle.x, obstacle.y, {
      count: 16,
      colors: PARTICLE_COLORS.brown,
      sizeU: [0.18, 0.36],
      speedU: [1.3, 3.2],
      life: [0.44, 0.78],
      grow: 0.36,
      jitter: 0.30
    });
  }

  function updateGroundSkidDust(dt) {
    if (!state.layout || state.birdHidden) return;
    if (state.phase !== "intro" && state.phase !== "verse") return;

    state.skidCooldown -= dt;
    if (state.skidCooldown > 0) return;

    addGroundSkidDust();
    state.skidCooldown = 0.065 + Math.random() * 0.035;
  }

  function addGroundSkidDust() {
    if (!state.layout) return;

    const unit = state.layout.unit;
    const dustCount = 2 + Math.floor(Math.random() * 2);
    const originX = state.birdX - unit * 0.44;
    const originY = state.layout.groundY - unit * 0.18;
    const colors = PARTICLE_COLORS.brown;

    for (let i = 0; i < dustCount; i++) {
      const size = unit * randomBetween(0.10, 0.22);
      const vx = -unit * randomBetween(0.65, 1.45);
      const vy = -unit * randomBetween(0.18, 0.62);
      const color = colors[Math.floor(Math.random() * colors.length)];

      state.poofs.push({
        id: Math.random().toString(36).slice(2),
        x: originX + (Math.random() - 0.5) * unit * 0.28,
        y: originY + (Math.random() - 0.5) * unit * 0.08,
        size,
        vx,
        vy,
        color,
        ringColor: "rgba(255,255,255,0.16)",
        grow: 0.95,
        opacity: 0.72,
        life: randomBetween(0.24, 0.42),
        age: 0
      });
    }
  }

  function addPipeBurst(){
    addParticleBurst(state.birdX, state.birdY, {
      count: 17,
      colors: PARTICLE_COLORS.green,
      sizeU: [0.11, 0.23],
      speedU: [2.0, 4.2],
      life: [0.38, 0.68],
      grow: 0.16,
      jitter: 0.20
    });
  }

  function addBeeLightningBurst(obstacle) {
    addParticleBurst(state.birdX, state.birdY, {
      count: 15,
      image: LIGHTNING_PARTICLE_IMAGE,
      sizeU: [0.18, 0.34],
      speedU: [2.5, 5.4],
      life: [0.34, 0.66],
      grow: -0.10,
      jitter: 0.28,
      spinU: [360, 820],
      opacity: 0.95
    });

    addParticleBurst(obstacle.x, obstacle.y, {
      count: 7,
      image: LIGHTNING_PARTICLE_IMAGE,
      sizeU: [0.12, 0.24],
      speedU: [1.8, 3.8],
      life: [0.26, 0.48],
      grow: -0.08,
      jitter: 0.40,
      spinU: [420, 900],
      opacity: 0.88
    });
  }

  function flash(color, ms){
    state.flashColor = color;
    state.flashUntil = performance.now() + ms;
  }

  async function preloadBirdSvg(){
    try{
      const response = await fetch(`${IMAGE_PATH}versey_bird_bird.svg`, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Bird SVG request failed: ${response.status}`);
      birdSvgText = await response.text();
      renderBirdAsset();
    }catch(err){
      console.warn("Could not inline bird SVG. Falling back to image.", err);
      birdSvgText = "";
      renderBirdAsset();
    }
  }

  function cycleBirdColor() {
    if (!BIRD_COLORS.length) return;

    state.birdColorCycleIndex = (state.birdColorCycleIndex + 1) % BIRD_COLORS.length;
    state.birdColor = BIRD_COLORS[state.birdColorCycleIndex];

    const bird = document.getElementById("vb2Bird");
    if (bird) {
      recolorBirdSvg(bird);
    }
  }

  function renderBirdAsset(){
    const bird = document.getElementById("vb2Bird");
    if (!bird) return;

    if (birdSvgText){
      bird.innerHTML = birdSvgText;
      prepareWingAnimator(bird);
      recolorBirdSvg(bird);
    } else {
      bird.innerHTML = `<img src="${IMAGE_PATH}versey_bird_bird.svg" alt="">`;
    }
  }

  function prepareWingAnimator(root) {
    const wingGroup = root.querySelector("#bird_wing_group");
    if (!wingGroup || wingGroup.parentNode?.id === "vb2_wing_animator") return;

    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrapper.setAttribute("id", "vb2_wing_animator");

    wingGroup.parentNode.insertBefore(wrapper, wingGroup);
    wrapper.appendChild(wingGroup);
  }

  function recolorBirdSvg(root){
    const body = root.querySelector("#bird_body");
    const wing = root.querySelector("#bird_wing");
    const tail = root.querySelector("#bird_tail");

    applySvgFill(body, state.birdColor.primary);
    applySvgFill(wing, state.birdColor.secondary);
    applySvgFill(tail, state.birdColor.secondary);
  }

  function applySvgFill(el, color){
    if (!el) return;

    el.style.fill = color;
    el.setAttribute("fill", color);

    const children = el.querySelectorAll("path, polygon, circle, ellipse, rect");
    for (const child of children){
      child.style.fill = color;
      child.setAttribute("fill", color);
    }
  }

  async function finishRun(){
    if (completed) return;
    completed = true;

    try{
      completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: selectedMode,
        stats: {
          streak: state.bestStreak,
          finalStreak: state.streak,
          progressIndex: state.progressIndex,
          pipesCleared: state.pipesCleared
        }
      });
    }catch(err){
      console.error("completeGameRun failed", err);
      completionResult = {
        ok: false,
        alreadyCompleted: false,
        newlyCompleted: false,
        reward: {
          ok: false,
          petUnlockTriggered: false
        }
      };
    }

    renderComplete();
  }

  function renderBonusScoreBuild() {
    const el = document.getElementById("vb2BuildText");
    const build = document.getElementById("vb2Build");
    if (!el) return;

    const buildH = build ? build.getBoundingClientRect().height : 72;
    const pipeH = clamp(buildH - 8, 42, 74);
    const fontSize = pipeH * 0.75;

    el.className = "vb2-build-text vm-build-text vb2-bonus-score-build";
    el.innerHTML = `
      <div class="vb2-bonus-pipe-score"
           style="
             --bonus-pipe-h:${pipeH}px;
             --bonus-score-font:${fontSize}px;
           "
           aria-label="Pipes cleared ${state.pipesCleared}">
        <img
          class="vb2-bonus-pipe-score-img"
          src="${IMAGE_PATH}versey_bird_score_pipe.png"
          alt=""
          aria-hidden="true"
        >
        <div class="vb2-bonus-pipe-score-number">${state.pipesCleared}</div>
      </div>
    `;
  }


  function updateBuildText(){
    const el = document.getElementById("vb2BuildText");
    if (!el) return;

    if (state.phase === "bonusIntro" || state.phase === "bonus" || state.phase === "bonusCrash"){
      renderBonusScoreBuild();
      return;
    }

    const buildRender = window.VerseGameShell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: state.bookLabel,
      reference: state.referenceLabel,
      progressIndex: state.progressIndex,
      buildArea: BUILD_AREA,
      hideUnbuilt: selectedMode === "hard",
      extraClass: "vb2-build-text"
    });

    el.className = buildRender.className;
    el.innerHTML = buildRender.html;
    fitBuildText();
  }

  function fitBuildText(){
    if (state.buildFitDone) return;

    requestAnimationFrame(() => {
      const build = document.getElementById("vb2Build");
      const text = document.getElementById("vb2BuildText");
      if (!build || !text) return;

      const result = window.VerseGameShell.fitBuildTextOnce({
        buildEl: build,
        textEl: text,
        buildArea: BUILD_AREA
      });

      if (result){
        state.buildFitDone = true;
      }
    });
  }

  function setupReferenceSegments(){
    const parsed = parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
    const buildData = window.VerseGameShell.buildVerseSegments({
      verseText: ctx.verseText || "",
      book: parsed.book,
      reference: parsed.reference,
      buildArea: BUILD_AREA
    });

    state.referenceMeta = parsed;
    state.words = buildData.words;
    state.bookLabel = buildData.bookLabel;
    state.referenceLabel = buildData.referenceLabel;
    state.buildSizeClass = buildData.buildSizeClass;
    state.segments = buildData.segments;
  }

  function getCurrentPhase(){
    return window.VerseGameShell.getPhaseForProgress({
      progressIndex: state.progressIndex,
      wordCount: state.words.length,
      totalSegments: state.segments.length,
      bookLabel: state.bookLabel,
      referenceLabel: state.referenceLabel
    });
  }

  function getCurrentCorrectLabel(){
    return state.segments[state.progressIndex] || "";
  }

  function getDecoysForPhase(phase, correctLabel, count){
    const out = new Set();

    if (phase === "words"){
      const correctNorm = normalizeWord(correctLabel);

      if (selectedMode === "easy"){
        for (const word of window.VerseGameShell.getFunWordDecoys(correctLabel, state.words, count)){
          if (out.size >= count) break;
          if (normalizeWord(word) !== correctNorm) out.add(word);
        }
      } else {
        const verseDecoys = window.VerseGameShell.getVerseWordDecoys({
          words: state.words,
          correct: correctLabel,
          targetIndex: state.progressIndex,
          count,
          avoidNext: 2,
          fallbackToFun: true
        });

        for (const word of verseDecoys){
          if (out.size >= count) break;
          const norm = normalizeWord(word);
          if (!norm || norm === correctNorm) continue;
          out.add(word);
        }
      }
    }

    if (phase === "book"){
      for (const book of window.VerseGameShell.getBookDecoys(correctLabel, count)){
        if (out.size >= count) break;
        out.add(book);
      }
    }

    if (phase === "reference"){
      for (const ref of window.VerseGameShell.getReferenceDecoys(state.referenceMeta, selectedMode, count + 4)){
        if (out.size >= count) break;
        if (normalizeWord(ref) !== normalizeWord(correctLabel)) out.add(ref);
      }
    }

    return Array.from(out).slice(0, count);
  }

  function getCloudShapeKey(label){
    const len = String(label || "").length;
    if (len <= 4) return "compact";
    if (len <= 8) return "normal";
    return "long";
  }

  function getDifficulty(){
    return DIFFICULTY[selectedMode] || DIFFICULTY.medium;
  }

  function getWorldSpeed(){
    return getVerseWorldSpeedU() * state.layout.unit;
  }

  function getActiveWorldSpeed(){
    if (state.phase === "bonus" || state.phase === "bonusCrash"){
      return getBonusSpeed();
    }

    return getWorldSpeed();
  }

  function getBonusSpeed(){
    const d = getDifficulty();
    const speedU = d.bonusStartSpeedU + state.bonusElapsed * d.bonusRampU;
    return speedU * state.layout.unit;
  }

  function getBonusGap(){
    const d = getDifficulty();
    const shrink = state.bonusElapsed * 0.040 * state.layout.unit;
    return Math.max(d.bonusMinGapU * state.layout.unit, d.bonusStartGapU * state.layout.unit - shrink);
  }

  function getPipeSpacingSeconds(){
    const d = getDifficulty();
    const spacingPx = d.bonusPipeEveryU * state.layout.unit;
    return spacingPx / Math.max(1, getBonusSpeed());
  }

  function circlesOverlap(x1, y1, r1, x2, y2, r2){
    const dx = x1 - x2;
    const dy = y1 - y2;
    const r = r1 + r2;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function tokenizeVerse(text){
    return window.VerseGameShell.tokenizeVerseWords(text);
  }

  function normalizeWord(value){
    return window.VerseGameShell.normalizeWord(value);
  }

  function parseReferenceParts(ref, translation, verseId){
    return window.VerseGameShell.parseReferenceParts(ref, translation, verseId);
  }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clamp(value, min, max){
    if (window.VerseGameShell && window.VerseGameShell.clamp){
      return window.VerseGameShell.clamp(value, min, max);
    }
    return Math.min(max, Math.max(min, value));
  }
})();
