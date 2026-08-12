(async function(){
  const app = document.getElementById("app");
  const launch = window.VerseGameBridge.getLaunchParams();
  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "verse_snake";
  const GAME_TITLE = "Verse Snake";
  const GAME_ICON = "🐍";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);
  const HELP_OVERLAY_ID = "vslHelpOverlay";

  const GAME_THEME = {
    bg: "#333333",
    accent: "#333333"
  };

  const SLITHER_TUNING = {
    maxStageWidth: 840,
    speeds: { easy: 128, medium: 142, hard: 156 },
    turnRate: { easy: 4.0, medium: 3.7, hard: 3.45 },
    spawnDistanceScreens: { easy: 1.12, medium: 1.32, hard: 1.48 },
    pairSeparationScreen: { easy: 0.20, medium: 0.23, hard: 0.26 },
    pairRoamScreen: { easy: 0.10, medium: 0.12, hard: 0.14 },
    targetMinScreenDistance: 0.95,
    wrongFleeSpeeds: { easy: 54, medium: 72, hard: 92 },
    wrongFleeMaxScreenDistance: 1.22,
    encounterMaxDistanceScreens: 1.1,
    patternScrollFactor: 1,
    fruitChance: 0.62
  };

  const FRUIT_IMAGES = [
    "./verse_snake_images/verse_snake_fruit_1.png",
    "./verse_snake_images/verse_snake_fruit_2.png",
    "./verse_snake_images/verse_snake_fruit_3.png",
    "./verse_snake_images/verse_snake_fruit_4.png",
    "./verse_snake_images/verse_snake_fruit_5.png",
    "./verse_snake_images/verse_snake_fruit_6.png",
    "./verse_snake_images/verse_snake_fruit_7.png",
    "./verse_snake_images/verse_snake_fruit_8.png",
    "./verse_snake_images/verse_snake_fruit_9.png",
    "./verse_snake_images/verse_snake_fruit_10.png"
  ];

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

  const SNAKE_STYLE_DEFS = [
    {
      id: "default",
      body: "#a7cb6f",
      stripe: "rgba(73,105,30,0.18)",
      head: "#a7cb6f"
    },
    {
      id: "red",
      body: "#ff5a51",
      stripe: "rgba(153,34,28,0.30)",
      head: "#ff5a51"
    },
    {
      id: "orange",
      body: "#ffa351",
      stripe: "rgba(168,82,20,0.30)",
      head: "#ffa351"
    },
    {
      id: "yellow",
      body: "#ffc751",
      stripe: "rgba(172,126,20,0.32)",
      head: "#ffc751"
    },
    {
      id: "blue",
      body: "#40b9c5",
      stripe: "rgba(17,92,104,0.30)",
      head: "#40b9c5"
    },
    {
      id: "purple",
      body: "#7f66c6",
      stripe: "rgba(54,35,112,0.32)",
      head: "#7f66c6"
    },
    {
      id: "fire",
      pulseColors: ["#ff5a51", "#ffa351", "#ffc751", "#ffa351"],
      stripe: "rgba(255,255,255,0.30)",
      head: "#ff8c5f",
      glow: "rgba(255,140,95,0.62)"
    },
    {
      id: "ice",
      pulseColors: ["#40b9c5", "#d8f7ff", "#ffffff", "#a9f5ff"],
      stripe: "rgba(255,255,255,0.52)",
      head: "#d8f7ff",
      glow: "rgba(169,245,255,0.58)"
    },
    {
      id: "polka",
      body: "#7f66c6",
      stripe: "#ffc751",
      head: "#7f66c6",
      dotted: true
    },
    {
      id: "cow",
      body: "#ffffff",
      stripe: "#11151d",
      head: "#ffffff",
      dotted: true
    },
    {
      id: "randomDot",
      body: "#40b9c5",
      stripe: "#ffc751",
      head: "#40b9c5",
      dotted: true,
      randomDotted: true
    },
    {
      id: "rainbow",
      pulseColors: ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6"],
      stripe: "rgba(255,255,255,0.42)",
      head: "#a7cb6f",
      glow: "rgba(255,255,255,0.50)"
    }
  ];

  const SNAKE_STYLES = SNAKE_STYLE_DEFS.map((style) => style.id);

  const SNAKE_RANDOM_DOT_COLORS = [
    "#ff5a51",
    "#ffa351",
    "#ffc751",
    "#a7cb6f",
    "#40b9c5",
    "#7f66c6",
    "#ffffff"
  ];

  const SNAKE_SPECIAL_STYLE_IDS = [
    "fire",
    "ice",
    "polka",
    "cow",
    "randomDot",
    "rainbow"
  ];

  const FRUIT_STYLE_TUNING = {
    fruitPerWordRatio: 0.45,
    minFruitForRainbow: 6,
    maxFruitForRainbow: 11
  };

  const SNAKE_HEAD_ASSET = "./verse_snake_images/verse_snake_head_1.svg";
  const MINI_SNAKE_HEAD_ASSET = "./verse_snake_images/verse_snake_head_small.svg";
  const BONUS_SNAKE_ICON_ASSET = "./verse_snake_images/verse_snake_icon.png";

  const PATTERN_ASSETS = [
    "./verse_snake_images/verse_snake_pattern_hex.svg",
    "./verse_snake_images/verse_snake_pattern_oval.svg",
    "./verse_snake_images/verse_snake_pattern_square.svg"
  ];

  const SOUND_BASE_PATH = "./verse_snake_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";
  const SILENCE_SOUND_PATH = "../../verse_audio/silence.mp3";

  const SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,

    correctWord: `${SOUND_BASE_PATH}verse_snake_correct.mp3`,
    wrongWord: `${SOUND_BASE_PATH}verse_snake_wrong.mp3`,
    fruit: `${SOUND_BASE_PATH}verse_snake_fruit.mp3`,
    boostStart: `${SOUND_BASE_PATH}verse_snake_boost.mp3`,
    bonusStart: `${SOUND_BASE_PATH}verse_snake_bonus_start.mp3`,
    miniSnakeEat: `${SOUND_BASE_PATH}verse_snake_eat.mp3`,
    bonusResult: `${SOUND_BASE_PATH}verse_snake_bonus_result.mp3`,

    // Generated with Web Audio instead of an mp3.
    orb: null,

    // Not currently used.
    boostReady: null,
    verseComplete: null
  };

  const SOUND_VOLUMES = {
    uiTap1: 0.55,
    uiTap2: 0.55,
    correctWord: 0.78,
    wrongWord: 0.72,
    fruit: 0.70,
    orb: 0.48,
    boostStart: 0.70,
    boostReady: 0.52,
    bonusStart: 0.78,
    miniSnakeEat: 0.62,
    bonusResult: 0.78,
    verseComplete: 0.78
  };

  let snakeHeadSvgPromise = null;
  let miniSnakeHeadSvgPromise = null;
  let audioContext = null;
  let audioUnlocked = false;
  let silenceAudio = null;
  let uiTapToggle = false;
  let orbToneIndex = 0;
  const soundBuffers = new Map();
  const soundLoadPromises = new Map();

  const ORB_TONE_TUNING = {
    volume: 0.115,
    duration: 0.145,
    attack: 0.012,
    release: 0.115,
    detuneCents: 5,
    notes: [72, 74, 76, 79, 81, 84] // C5, D5, E5, G5, A5, C6
  };
  const SNAKE_HEAD_COLLISION_RADIUS = 20;

  const VISUAL_SCALE_TUNING = {
    desktopFieldWidth: 840,
    phoneFieldWidth: 390,
    minScale: 0.66,
    desktopHeadPx: 44,
    bacteriaHeightRatio: 2.25,
    compactWidthRatio: 1.36,
    normalWidthRatio: 1.80,
    longWidthRatio: 2.48
  };

  const GAMEPLAY_SCALE_TUNING = {
    speedMinScale: 0.85,
    spawnDistanceMinScale: 0.92,
    worldSpeedMultiplier: 1.50,
    pairSeparationBacteriaRatio: 2.85,
    pairSeparationMinHeadRatio: 3.2,
    pairSeparationMaxHeadRatio: 5.0,
    targetPaddingHeadRatio: 0.42,
    roamHeadRatio: 2.0,
    roamMinHeadRatio: 1.25,
    roamMaxHeadRatio: 2.65,
    targetPulseHeadRatio: 0.27,
    targetSwayHeadRatio: 0.41
  };

  const TAIL_LENGTH_TUNING = {
    defaultHeads: 10.75,
    maxBonusHeads: 15.75
  };

  const ORB_TUNING = {
    targetCount: 14,
    minSizeHeadRatio: 0.10,
    maxSizeHeadRatio: 0.50,
    minGrowthHeads: 0.05,
    maxGrowthHeads: 0.20,
    pathStart: 0.12,
    pathEnd: 0.88,
    sideSpreadScreens: 0.22,
    collectPopDuration: 360
  };

  const ORB_COLORS = [
    "#ffd66f",
    "#ffc751",
    "#a7cb6f",
    "#40b9c5",
    "#7f66c6",
    "#ff8c5f",
    "#ffffff"
  ];

  const YUCK_BODY_TUNING = {
    durationMs: 520,
    attackMs: 55,
    holdMs: 95,
    amplitudePx: 11,
    waveStep: 2,
    headRampPoints: 3,
    tailFalloffPoints: 18
  };

  const DECOY_ESCAPE_TUNING = {
    durationMs: 620,
    speedPxPerSecond: 760,
    spinRate: 980
  };

  const BOOST_TUNING = {
    durationMs: 2000,
    cooldownMs: 4000,
    speedMultiplier: 2.00,
    doubleTapWindowMs: 380,
    doubleTapMinGapMs: 40,
    doubleTapMaxMovePx: 110,
    mouseDoubleTapMaxMovePx: 180
  };

  const BONUS_TUNING = {
    durationMs: 20000,
    activeMiniSnakes: 10,
    miniScale: 0.68,
    miniLengthHeads: 4.5,
    miniSpeedMin: 86,
    miniSpeedMax: 132,
    miniTurnRate: 1.9,
    spawnPaddingScreens: 0.42,
    despawnPaddingScreens: 0.72,
    offscreenPaddingHeads: 3.2,
    entryGraceMs: 1400,
    exitSpeedMultiplier: 1.35,
    exitMaxMs: 1700,
    resultPauseMs: 2600,
    collisionSampleStep: 3
  };

  const BACTERIA_ASSETS = {
    compact: "./verse_snake_images/verse_snake_bacteria_compact.svg",
    normal: "./verse_snake_images/verse_snake_bacteria_normal.svg",
    long: "./verse_snake_images/verse_snake_bacteria_long.svg"
  };

  const BACTERIA_PALETTE = [
    { name: "red", body: "#ff5a51", dark: "#cc4841", text: "#ffffff" },
    { name: "orange", body: "#ffa351", dark: "#cc8241", text: "#ffffff" },
    { name: "yellow", body: "#ffc751", dark: "#cc9f41", text: "#11151d" },
    { name: "green", body: "#a7cb6f", dark: "#86a259", text: "#ffffff" },
    { name: "blue", body: "#40b9c5", dark: "#33949e", text: "#ffffff" },
    { name: "purple", body: "#7f66c6", dark: "#66529e", text: "#ffffff" }
  ];

  const bacteriaSvgCache = new Map();

  let selectedMode = null;
  let muted = false;
  let completed = false;
  let completionResult = null;
  let verseSnakeGestureGuardBound = false;

  const state = {
    rafId: 0,
    running: false,
    paused: false,
    pauseReason: "",
    pauseStartedAt: 0,
    flashText: "",
    flashUntil: 0,
    happyUntil: 0,
    headPopUntil: 0,
    yuckUntil: 0,
    yuckStartedAt: 0,
    yuckVector: { x: 0, y: 0 },
    yuckTrailSnapshot: null,
    pickupPops: [],
    burstEffects: [],
    snakeStyle: "default",
    snakeStyleIndex: 0,
    snakeRandomDotStyle: null,
    fruitCount: 0,
    patternAsset: PATTERN_ASSETS[0],
    bonusActive: false,
    bonusPlayed: false,
    bonusEnding: false,
    bonusExitStartedAt: 0,
    bonusExitResultAt: 0,
    bonusExitCamera: null,
    bonusStartedAt: 0,
    bonusEndsAt: 0,
    bonusScore: 0,
    snakeHidden: false,
    miniSnakes: [],
    nextMiniSnakeId: 1,
    orbs: [],
    boostActiveUntil: 0,
    boostCooldownUntil: 0,
    boostStartedAt: 0,
    boostCooldownStartedAt: 0,
    boostReadySoundPlayed: true,
    lastTapAt: 0,
    lastTapX: 0,
    lastTapY: 0,
    fieldWidth: 1,
    fieldHeight: 1,
    visualScale: 1,
    headSizePx: 44,
    camera: { x: 0, y: 0 },
    pointer: { x: 0, y: -140, active: false },
    head: { x: 0, y: 0, angle: -Math.PI / 2, speed: 130 },
    trail: [],
    snakeLengthPx: 440,
    snakeBonusLengthHeads: 0,
    words: [],
    bookLabel: "",
    referenceLabel: "",
    referenceMeta: null,
    segments: [],
    progressIndex: 0,
    encounter: null,
    targets: [],
    escapingTargets: [],
    fruit: null,
    nextTargetId: 1,
    lastSpawnAngle: -Math.PI / 2
  };

  const clamp = window.VerseGameShell.clamp;

  function helpHtml(){
    return `
      <p>Guide the snake by pointing where you want it to slither.</p>
      <p>Follow the arrow to the words and eat the correct one.</p>
      <p>Double tap for a speed boost. Eat fruit to change color. Eat orbs to grow your tail.</p>
    `;
  }

  function renderHelpOverlay(){
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body: helpHtml(),
      closeText: "Close"
    });
  }

  function renderGameMenuOverlay(){
    return window.VerseGameShell.gameMenuHtml({
      id: "vslGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function getAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }

    return audioContext;
  }

  function unlockAudio() {
    if (audioUnlocked) return Promise.resolve(true);

    const ctx = getAudioContext();
    const tasks = [];

    try {
      if (!silenceAudio) {
        silenceAudio = new Audio(SILENCE_SOUND_PATH);
        silenceAudio.preload = "auto";
        silenceAudio.volume = 0.001;
        silenceAudio.muted = false;
      }

      silenceAudio.currentTime = 0;
      tasks.push(silenceAudio.play().catch(() => { }));
    } catch (_) { }

    if (ctx) {
      if (ctx.state === "suspended") {
        tasks.push(ctx.resume().catch(() => { }));
      }

      try {
        const source = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        source.stop(ctx.currentTime + 0.03);
      } catch (_) { }
    }

    audioUnlocked = true;
    preloadSoundBuffers();

    return Promise.all(tasks).then(() => true).catch(() => true);
  }

  function loadSoundBuffer(key) {
    const src = SOUND_FILES[key];

    if (!src) return Promise.resolve(null);
    if (soundBuffers.has(key)) return Promise.resolve(soundBuffers.get(key));
    if (soundLoadPromises.has(key)) return soundLoadPromises.get(key);

    const ctx = getAudioContext();
    if (!ctx) return Promise.resolve(null);

    const promise = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Sound not found: ${src}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        soundBuffers.set(key, buffer);
        return buffer;
      })
      .catch(() => null);

    soundLoadPromises.set(key, promise);
    return promise;
  }

  function preloadSoundBuffers() {
    Object.keys(SOUND_FILES).forEach((key) => {
      if (SOUND_FILES[key]) loadSoundBuffer(key);
    });
  }

  function playGameSound(key, volumeScale = 1) {
    if (muted || !audioUnlocked) return;

    const ctx = getAudioContext();
    if (!ctx || !SOUND_FILES[key]) return;

    loadSoundBuffer(key).then((buffer) => {
      if (!buffer || muted) return;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => { });
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      gain.gain.value = (SOUND_VOLUMES[key] ?? 0.7) * volumeScale;

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    });
  }

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function playOrbTone(sizeRatio = 0.25) {
    if (muted || !audioUnlocked) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { });
    }

    const notes = ORB_TONE_TUNING.notes;
    const note = notes[orbToneIndex % notes.length];
    orbToneIndex += 1;

    const sizeBoost = clamp(
      (sizeRatio - ORB_TUNING.minSizeHeadRatio) /
      Math.max(0.001, ORB_TUNING.maxSizeHeadRatio - ORB_TUNING.minSizeHeadRatio),
      0,
      1
    );

    const now = ctx.currentTime;
    const duration = ORB_TONE_TUNING.duration + sizeBoost * 0.035;
    const volume = ORB_TONE_TUNING.volume + sizeBoost * 0.035;
    const freq = midiToFreq(note);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime((Math.random() * 2 - 1) * ORB_TONE_TUNING.detuneCents, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + ORB_TONE_TUNING.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + ORB_TONE_TUNING.release);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + ORB_TONE_TUNING.release + 0.02);
  }


  function playUiTapSound() {
    uiTapToggle = !uiTapToggle;
    playGameSound(uiTapToggle ? "uiTap1" : "uiTap2");
  }

  function unlockAndTap() {
    unlockAudio();
    playUiTapSound();
  }

  function stopLoop(){
    state.running = false;
    if (state.rafId){
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
    window.onkeydown = null;
    window.onkeyup = null;
    window.onpointermove = null;
  }

  function setPaused(paused, reason = ""){
    if (paused){
      if (state.paused) return;
      state.paused = true;
      state.pauseReason = reason;
      state.pauseStartedAt = performance.now();
      return;
    }

    if (!state.paused) return;
    const deltaMs = performance.now() - (state.pauseStartedAt || performance.now());
    state.paused = false;
    state.pauseReason = "";
    state.pauseStartedAt = 0;
    if (state.flashUntil) state.flashUntil += deltaMs;
    if (state.happyUntil) state.happyUntil += deltaMs;
  }

  function openGameMenu(){
    unlockAndTap();
    const menuOverlay = document.getElementById("vslGameMenuOverlay");
    if (!menuOverlay) return;
    setPaused(true, "menu");
    menuOverlay.classList.add("is-open");
    menuOverlay.setAttribute("aria-hidden", "false");
  }

  function openHelpFromMenu(){
    unlockAndTap();
    const menuOverlay = document.getElementById("vslGameMenuOverlay");
    if (menuOverlay){
      menuOverlay.classList.remove("is-open");
      menuOverlay.setAttribute("aria-hidden", "true");
    }
    window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");
    setPaused(true, "help");
  }

  function renderIntroScreen(){
    stopLoop();
    window.VerseGameShell.renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onBack: () => {
        unlockAndTap();
        window.VerseGameBridge.exitGame();
      },
      onStart: () => {
        unlockAndTap();
        renderModeSelect();
      }
    });
  }

  function renderModeSelect(){
    stopLoop();
    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      icon: "🥉🥈🥇",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: `Back to ${GAME_TITLE} title`,
      onBack: () => {
        unlockAndTap();
        renderIntroScreen();
      },
      onSelect: (mode) => {
        unlockAndTap();
        selectedMode = mode;
        completed = false;
        completionResult = null;
        renderGameScreen();
      }
    });
  }

  function renderGameScreen(){
    stopLoop();
    resetStateForRun();

    app.innerHTML = `
      <div class="vsl-root">
        <div class="vsl-stage">
          <div class="vsl-build-shell">
            <div class="vsl-build-line" id="vslBuildLine">
              <div class="vsl-build-track" id="vslBuildTrack"></div>
            </div>
          </div>

          <div class="vsl-field-wrap">
            <div class="vsl-field" id="vslField">
              <div class="vsl-pattern-layer" id="vslPatternLayer"></div>

              <div class="vsl-overlay-pills">
                <button class="vsl-pill vsl-menu-pill no-zoom" id="vslMenuPill" aria-label="Game Menu" type="button">☰</button>
                <div class="vsl-boost-meter is-ready" id="vslBoostMeter" aria-label="Speed boost ready">
                  <span class="vsl-boost-icon" aria-hidden="true">⚡</span>
                  <span class="vsl-boost-track" aria-hidden="true">
                    <span class="vsl-boost-fill" id="vslBoostFill"></span>
                  </span>
                </div>
              </div>

              <div class="vsl-orb-layer" id="vslOrbLayer"></div>
              <div class="vsl-fruit-layer" id="vslFruitLayer"></div>
              <div class="vsl-target-layer" id="vslTargetLayer"></div>
              <div class="vsl-effect-layer" id="vslEffectLayer"></div>
              <div class="vsl-pickup-pop-layer" id="vslPickupPopLayer"></div>
              <div class="vsl-arrow-layer"><div class="vsl-arrow" id="vslArrow"></div></div>
              <div class="vsl-flash-message" id="vslFlashMessage"></div>
              <div class="vsl-bonus-result" id="vslBonusResult" aria-live="polite"></div>

              <svg class="vsl-svg" id="vslSvg" aria-hidden="true">
                <g id="vslMiniSnakeLayer"></g>
                <g id="vslSnakeGroup" class="vsl-snake-style-default">
                  <path class="vsl-snake-body" id="vslSnakeBody" d=""></path>
                  <path class="vsl-snake-body-2" id="vslSnakeBodyStripe" d=""></path>
                  <g id="vslSnakeHeadGroup">
                    <path class="vsl-snake-tongue" id="vslSnakeTongue" d=""></path>
                    <g class="vsl-snake-head-art" id="vslSnakeHeadArt"></g>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>

        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>
    `;

    wireGameControls();

    requestAnimationFrame(() => {
      initializeGame();
      startLoop();
    });
  }

  function isVerseSnakeGestureTarget(target) {
    const field = document.getElementById("vslField");
    return !!field && field.contains(target);
  }

  function preventVerseSnakeGesture(e) {
    if (!isVerseSnakeGestureTarget(e.target)) return;
    if (e.cancelable) e.preventDefault();
  }

  function preventVerseSnakeMultiTouch(e) {
    if (!isVerseSnakeGestureTarget(e.target)) return;

    if (e.touches && e.touches.length > 1 && e.cancelable) {
      e.preventDefault();
    }
  }

  function bindVerseSnakeGestureGuard() {
    if (verseSnakeGestureGuardBound) return;

    verseSnakeGestureGuardBound = true;

    ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
      document.addEventListener(eventName, preventVerseSnakeGesture, { passive: false });
    });

    document.addEventListener("touchmove", preventVerseSnakeMultiTouch, { passive: false });
    document.addEventListener("selectstart", preventVerseSnakeGesture, { passive: false });
    document.addEventListener("contextmenu", preventVerseSnakeGesture, { passive: false });
    document.addEventListener("dragstart", preventVerseSnakeGesture, { passive: false });
  }


  function wireGameControls(){
    bindVerseSnakeGestureGuard();

    const field = document.getElementById("vslField");
    const menuPill = document.getElementById("vslMenuPill");

    if (menuPill){
      menuPill.onclick = (e) => {
        e.stopPropagation();
        openGameMenu();
      };
    }

    if (field){
      const updatePointer = (clientX, clientY) => {
        const rect = field.getBoundingClientRect();
        state.pointer.x = clientX - rect.left - rect.width / 2;
        state.pointer.y = clientY - rect.top - rect.height / 2;
        state.pointer.active = true;
      };

      field.addEventListener("pointerdown", (e) => {
        if (state.paused) return;
        e.preventDefault();
        unlockAudio();
        field.setPointerCapture?.(e.pointerId);
        updatePointer(e.clientX, e.clientY);
        handleBoostTap(e.clientX, e.clientY, e.pointerType);
      });

      field.addEventListener("pointermove", (e) => {
        if (state.paused) return;
        if (e.pointerType !== "mouse" && !e.isPrimary) return;
        if (e.cancelable) e.preventDefault();
        updatePointer(e.clientX, e.clientY);
      }, { passive: false });

      field.addEventListener("pointerup", (e) => {
        field.releasePointerCapture?.(e.pointerId);
      });

      field.addEventListener("pointercancel", (e) => {
        field.releasePointerCapture?.(e.pointerId);
      });
    }

    window.VerseGameShell.wireGameMenu({
      id: "vslGameMenuOverlay",
      menuButtonId: "vslMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        unlockAudio();
        muted = !muted;
        if (!muted) playUiTapSound();
        return muted;
      },
      onHowToPlay: openHelpFromMenu,
      onModeSelect: () => {
        unlockAndTap();
        setPaused(false, "");
        renderModeSelect();
      },
      onExit: () => {
        unlockAndTap();
        stopLoop();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => setPaused(true, "menu"),
      onClose: () => {
        unlockAndTap();
        setPaused(false, "");
      },
      onBackFromHelp: () => {
        unlockAndTap();
        setPaused(true, "menu");
      }
    });
  }

  function resetStateForRun(){
    state.running = false;
    state.paused = false;
    state.pauseReason = "";
    state.flashText = "";
    state.flashUntil = 0;
    state.happyUntil = 0;
    state.headPopUntil = 0;
    state.yuckUntil = 0;
    state.yuckStartedAt = 0;
    state.yuckVector = { x: 0, y: 0 };
    state.yuckTrailSnapshot = null;
    state.pickupPops = [];
    state.burstEffects = [];
    state.snakeStyle = "default";
    state.snakeStyleIndex = 0;
    state.snakeRandomDotStyle = null;
    state.fruitCount = 0;
    state.patternAsset = PATTERN_ASSETS[Math.floor(Math.random() * PATTERN_ASSETS.length)];
    state.bonusActive = false;
    state.bonusPlayed = false;
    state.bonusEnding = false;
    state.bonusExitStartedAt = 0;
    state.bonusExitResultAt = 0;
    state.bonusExitCamera = null;
    state.bonusStartedAt = 0;
    state.bonusEndsAt = 0;
    state.bonusScore = 0;
    state.snakeHidden = false;
    state.miniSnakes = [];
    state.nextMiniSnakeId = 1;
    state.orbs = [];
    state.boostActiveUntil = 0;
    state.boostCooldownUntil = 0;
    state.boostStartedAt = 0;
    state.boostCooldownStartedAt = 0;
    state.boostReadySoundPlayed = true;
    orbToneIndex = 0;
    state.lastTapAt = 0;
    state.lastTapX = 0;
    state.lastTapY = 0;
    state.camera.x = 0;
    state.camera.y = 0;
    state.pointer.x = 0;
    state.pointer.y = -140;
    state.pointer.active = false;
    state.head.x = 0;
    state.head.y = 0;
    state.head.angle = -Math.PI / 2;
    state.head.speed = getCurrentSpeed();
    state.trail = [];
    state.snakeBonusLengthHeads = 0;
    state.progressIndex = 0;
    state.encounter = null;
    state.targets = [];
    state.escapingTargets = [];
    state.fruit = null;
    state.nextTargetId = 1;
    state.lastSpawnAngle = -Math.PI / 2;
    const miniLayer = document.getElementById("vslMiniSnakeLayer");
    if (miniLayer) miniLayer.innerHTML = "";
  }

  function initializeGame(){
    syncFieldMetrics();

    const refParts = window.VerseGameShell.parseReferenceParts(
      ctx.verseRef || launch.ref || "",
      ctx.translation,
      ctx.verseId || launch.verseId || ""
    );

    const buildData = window.VerseGameShell.buildVerseSegments({
      verseText: ctx.verseText || "",
      book: refParts.book,
      reference: refParts.reference,
      buildArea: "compact"
    });

    state.words = buildData.words;
    state.bookLabel = buildData.bookLabel;
    state.referenceLabel = buildData.referenceLabel;
    state.referenceMeta = refParts;
    state.segments = buildData.segments;

    state.snakeBonusLengthHeads = 0;
    syncSnakeLengthFromHeads(true);
    hydrateSnakeHead();
    seedTrail();
    updateBuildHud();
    spawnEncounter();
    maybeSpawnFruit(true);
    renderTargets();
    renderOrbs();
    renderFruit();
    drawSnake();
  }

  function syncFieldMetrics(){
    const field = document.getElementById("vslField");
    const svg = document.getElementById("vslSvg");
    if (!field || !svg) return;

    const rect = field.getBoundingClientRect();
    state.fieldWidth = Math.max(1, rect.width);
    state.fieldHeight = Math.max(1, rect.height);
    svg.setAttribute("viewBox", `0 0 ${state.fieldWidth} ${state.fieldHeight}`);

    updateVisualScaleVars(field);
  }

  function updateVisualScaleVars(field) {
    const width = state.fieldWidth || VISUAL_SCALE_TUNING.desktopFieldWidth;
    const t = clamp(
      (width - VISUAL_SCALE_TUNING.phoneFieldWidth) /
      (VISUAL_SCALE_TUNING.desktopFieldWidth - VISUAL_SCALE_TUNING.phoneFieldWidth),
      0,
      1
    );

    state.visualScale = VISUAL_SCALE_TUNING.minScale + (1 - VISUAL_SCALE_TUNING.minScale) * t;
    state.headSizePx = VISUAL_SCALE_TUNING.desktopHeadPx * state.visualScale;

    const head = getSnakeHeadSize();
    const targetH = head * VISUAL_SCALE_TUNING.bacteriaHeightRatio;

    field.style.setProperty("--vsl-scale", state.visualScale.toFixed(4));
    field.style.setProperty("--vsl-head-size", `${head.toFixed(2)}px`);
    field.style.setProperty("--vsl-body-width", `${(head * 34 / 44).toFixed(2)}px`);
    field.style.setProperty("--vsl-stripe-width", `${(head * 18 / 44).toFixed(2)}px`);

    field.style.setProperty("--vsl-target-h", `${targetH.toFixed(2)}px`);
    field.style.setProperty("--vsl-target-compact-w", `${(targetH * VISUAL_SCALE_TUNING.compactWidthRatio).toFixed(2)}px`);
    field.style.setProperty("--vsl-target-normal-w", `${(targetH * VISUAL_SCALE_TUNING.normalWidthRatio).toFixed(2)}px`);
    field.style.setProperty("--vsl-target-long-w", `${(targetH * VISUAL_SCALE_TUNING.longWidthRatio).toFixed(2)}px`);

    field.style.setProperty("--vsl-target-font", `${(head * 0.54).toFixed(2)}px`);
    field.style.setProperty("--vsl-target-long-font", `${(head * 0.48).toFixed(2)}px`);

    field.style.setProperty("--vsl-fruit-size", `${(head * 1.30).toFixed(2)}px`);
    field.style.setProperty("--vsl-fruit-font", `${(head * 0.80).toFixed(2)}px`);
    field.style.setProperty("--vsl-arrow-size", `${(head * 1.74).toFixed(2)}px`);

    field.style.setProperty("--vsl-pickup-font", `${(head * 0.56).toFixed(2)}px`);
    field.style.setProperty("--vsl-pickup-pad-y", `${(head * 0.17).toFixed(2)}px`);
    field.style.setProperty("--vsl-pickup-pad-x", `${(head * 0.34).toFixed(2)}px`);
    field.style.setProperty("--vsl-pickup-lift", `${(head * 0.95).toFixed(2)}`);

    syncSnakeHeadSvgSize();
    syncSnakeLengthFromHeads(false);

    for (const target of [...state.targets, ...state.escapingTargets]) {
      target.r = estimateTargetRadius(target.word);
    }

    for (const orb of state.orbs) {
      syncOrbSize(orb);
    }

    if (state.fruit) {
      state.fruit.r = getFruitRadius();
    }
  }

  function getVisualScale() {
    return state.visualScale || 1;
  }

  function getDistanceScale() {
    return getVisualScale();
  }

  function getSpeedScale() {
    const visualScale = getVisualScale();
    return GAMEPLAY_SCALE_TUNING.speedMinScale + (1 - GAMEPLAY_SCALE_TUNING.speedMinScale) * visualScale;
  }

  function getSpawnDistanceScale() {
    const visualScale = getVisualScale();
    return GAMEPLAY_SCALE_TUNING.spawnDistanceMinScale + (1 - GAMEPLAY_SCALE_TUNING.spawnDistanceMinScale) * visualScale;
  }

  function getWorldSpeedMultiplier() {
    return GAMEPLAY_SCALE_TUNING.worldSpeedMultiplier || 1;
  }

  function getWorldDistanceMultiplier() {
    return getWorldSpeedMultiplier();
  }

  function getSnakeHeadSize() {
    return state.headSizePx || VISUAL_SCALE_TUNING.desktopHeadPx;
  }

  function getTotalSnakeLengthHeads() {
    return TAIL_LENGTH_TUNING.defaultHeads + state.snakeBonusLengthHeads;
  }

  function syncSnakeLengthFromHeads(forceTrim) {
    const nextLength = getSnakeHeadSize() * getTotalSnakeLengthHeads();
    const wasLonger = nextLength < state.snakeLengthPx;

    state.snakeLengthPx = nextLength;

    if ((forceTrim || wasLonger) && state.trail.length) {
      trimTrail();
    }
  }

  function growSnakeByHeadLengths(amountHeads) {
    const amount = Math.max(0, Number(amountHeads) || 0);
    state.snakeBonusLengthHeads = clamp(
      state.snakeBonusLengthHeads + amount,
      0,
      TAIL_LENGTH_TUNING.maxBonusHeads
    );
    syncSnakeLengthFromHeads(false);
  }

  function resetSnakeBonusLength() {
    state.snakeBonusLengthHeads = 0;
    syncSnakeLengthFromHeads(true);
  }

  function getSnakeHeadCollisionRadius() {
    return SNAKE_HEAD_COLLISION_RADIUS * getVisualScale();
  }

  function getFruitRadius() {
    return getSnakeHeadSize() * 0.59;
  }

  function getTargetMetrics(word) {
    const variant = getBacteriaVariant(word);
    const h = getSnakeHeadSize() * VISUAL_SCALE_TUNING.bacteriaHeightRatio;
    const ratio = variant === "compact"
      ? VISUAL_SCALE_TUNING.compactWidthRatio
      : variant === "long"
        ? VISUAL_SCALE_TUNING.longWidthRatio
        : VISUAL_SCALE_TUNING.normalWidthRatio;

    return {
      variant,
      h,
      w: h * ratio
    };
  }

  function startLoop(){
    state.running = true;
    let lastTs = performance.now();

    function tick(ts){
      if (!state.running) return;
      const dt = Math.min(34, ts - lastTs);
      lastTs = ts;
      syncFieldMetrics();

      if (!state.paused){
        if (state.bonusEnding){
          updateBonusExit(dt, ts);
        } else {
          updateMotion(dt);

          if (state.bonusActive){
            updateBonusRound(dt, ts);
            checkBonusSnakeCollisions(ts);
            maybeRecenterWorld();
          } else {
            keepObjectiveWithinRange();
            updateEncounter(dt, ts);
            updateEscapingTargets(dt, ts);
            updateOrbs(dt, ts);
            updateFruit(dt, ts);
            checkCollisions(ts);
            maybeRecenterWorld();
          }
        }
      }

      updateCamera();
      updatePatternLayer();
      updateBuildHudShift();
      drawSnake();
      renderMiniSnakes();
      renderTargets();
      renderOrbs();
      renderFruit();
      renderBurstEffects(ts);
      renderPickupPops(ts);
      renderArrow();
      renderBoostMeter(ts);
      renderFlash(ts);
      state.rafId = requestAnimationFrame(tick);
    }

    state.rafId = requestAnimationFrame(tick);
  }

  function isBoostActive(now = performance.now()) {
    return now < state.boostActiveUntil;
  }

  function isBoostReady(now = performance.now()) {
    return now >= state.boostActiveUntil && now >= state.boostCooldownUntil;
  }

  function handleBoostTap(clientX, clientY, pointerType = "touch") {
    const now = performance.now();
    const dt = now - state.lastTapAt;
    const move = Math.hypot(clientX - state.lastTapX, clientY - state.lastTapY);

    const maxMove = pointerType === "mouse"
      ? BOOST_TUNING.mouseDoubleTapMaxMovePx
      : BOOST_TUNING.doubleTapMaxMovePx;

    const isDoubleTap =
      dt >= BOOST_TUNING.doubleTapMinGapMs &&
      dt <= BOOST_TUNING.doubleTapWindowMs &&
      move <= maxMove;

    state.lastTapAt = now;
    state.lastTapX = clientX;
    state.lastTapY = clientY;

    if (isDoubleTap) {
      activateBoost(now);
    }
  }

  function activateBoost(now = performance.now()) {
    if (!state.running || state.paused || completed) return;
    if (!isBoostReady(now)) return;

    state.boostStartedAt = now;
    state.boostActiveUntil = now + BOOST_TUNING.durationMs;
    state.boostCooldownStartedAt = now;
    state.boostCooldownUntil = now + BOOST_TUNING.durationMs + BOOST_TUNING.cooldownMs;
    state.boostReadySoundPlayed = false;

    playGameSound("boostStart");
  }

  function getBoostMeterValue(now = performance.now()) {
    if (isBoostActive(now)) {
      return clamp((state.boostActiveUntil - now) / BOOST_TUNING.durationMs, 0, 1);
    }

    if (now < state.boostCooldownUntil) {
      const cooldownStart = state.boostActiveUntil || state.boostCooldownStartedAt;
      return clamp((now - cooldownStart) / BOOST_TUNING.cooldownMs, 0, 1);
    }

    return 1;
  }

  function renderBoostMeter(ts) {
    const meter = document.getElementById("vslBoostMeter");
    const fill = document.getElementById("vslBoostFill");
    if (!meter || !fill) return;

    const value = getBoostMeterValue(ts);
    const active = isBoostActive(ts);
    const ready = isBoostReady(ts);

    fill.style.transform = `scaleX(${value.toFixed(3)})`;

    meter.classList.toggle("is-ready", ready);
    meter.classList.toggle("is-boosting", active);
    meter.classList.toggle("is-charging", !ready && !active);

    if (ready && !state.boostReadySoundPlayed){
      state.boostReadySoundPlayed = true;
    }

    meter.setAttribute(
      "aria-label",
      active
        ? "Speed boost active"
        : ready
          ? "Speed boost ready"
          : "Speed boost recharging"
    );
  }

  function getCurrentSpeed(){
    const baseSpeed = SLITHER_TUNING.speeds[selectedMode] || SLITHER_TUNING.speeds.medium;
    const boostMultiplier = isBoostActive() ? BOOST_TUNING.speedMultiplier : 1;
    return baseSpeed * getSpeedScale() * getWorldSpeedMultiplier() * boostMultiplier;
  }

  function getCurrentTurnRate(){
    return SLITHER_TUNING.turnRate[selectedMode] || SLITHER_TUNING.turnRate.medium;
  }

  function getWrongFleeSpeed() {
    const baseSpeed = SLITHER_TUNING.wrongFleeSpeeds[selectedMode] || SLITHER_TUNING.wrongFleeSpeeds.medium;
    return baseSpeed * getSpeedScale() * getWorldSpeedMultiplier();
  }

  function seedTrail(){
    state.trail = [];
    const step = 8;
    for (let i = 0; i < state.snakeLengthPx; i += step){
      state.trail.push({ x: state.head.x, y: state.head.y + i });
    }
  }

  function updateMotion(dt){
    const now = performance.now();

    if (now < state.yuckUntil){
      updateYuckMotion(dt, now);
      return;
    }

    const aimAngle = Math.atan2(state.pointer.y, state.pointer.x);
    const diff = angleDelta(state.head.angle, aimAngle);
    const maxTurn = getCurrentTurnRate() * (dt / 1000);
    state.head.angle += clamp(diff, -maxTurn, maxTurn);
    state.head.speed = getCurrentSpeed();

    state.head.x += Math.cos(state.head.angle) * state.head.speed * (dt / 1000);
    state.head.y += Math.sin(state.head.angle) * state.head.speed * (dt / 1000);

    state.trail.unshift({ x: state.head.x, y: state.head.y });
    trimTrail();
  }

  function updateYuckMotion(dt, now) {
    const elapsed = now - state.yuckStartedAt;
    const t = Math.min(1, elapsed / 520);
    const wobble = Math.sin(t * Math.PI * 5) * 0.42 * (1 - t);
    const recoilStrength = elapsed < 180 ? 92 : 36;

    state.head.angle += wobble * (dt / 1000) * 10;

    state.head.x += state.yuckVector.x * recoilStrength * (dt / 1000);
    state.head.y += state.yuckVector.y * recoilStrength * (dt / 1000);

    if (elapsed >= 180) {
      state.head.x += Math.cos(state.head.angle) * getCurrentSpeed() * 0.32 * (dt / 1000);
      state.head.y += Math.sin(state.head.angle) * getCurrentSpeed() * 0.32 * (dt / 1000);
    }

    state.trail.unshift({ x: state.head.x, y: state.head.y });
    trimTrail();
  }

  function trimTrail(){
    let total = 0;
    const trimmed = [];

    for (let i = 0; i < state.trail.length; i++){
      const p = state.trail[i];
      trimmed.push(p);
      if (i > 0){
        const prev = state.trail[i - 1];
        total += Math.hypot(p.x - prev.x, p.y - prev.y);
      }
      if (total >= state.snakeLengthPx) break;
    }

    state.trail = trimmed;
  }

  function updateCamera(){
    if (state.bonusEnding && state.bonusExitCamera){
      state.camera.x = state.bonusExitCamera.x;
      state.camera.y = state.bonusExitCamera.y;
      return;
    }

    state.camera.x = state.head.x - state.fieldWidth / 2;
    state.camera.y = state.head.y - state.fieldHeight / 2;
  }

  function updatePatternLayer() {
    const layer = document.getElementById("vslPatternLayer");
    if (!layer) return;

    const headHeight = getSnakeHeadSize();

    const tileHeight = Math.round(headHeight / 0.14);
    const tileWidth = Math.round(tileHeight * (471.133 / 408.010));
    const scrollFactor = SLITHER_TUNING.patternScrollFactor || 1;

    const x = -Math.round(mod(state.camera.x * scrollFactor, tileWidth));
    const y = -Math.round(mod(state.camera.y * scrollFactor, tileHeight));

    layer.style.setProperty("--vsl-pattern-image", `url("${state.patternAsset}")`);
    layer.style.setProperty("--vsl-pattern-w", `${tileWidth}px`);
    layer.style.setProperty("--vsl-pattern-h", `${tileHeight}px`);
    layer.style.setProperty("--vsl-pattern-x", `${x}px`);
    layer.style.setProperty("--vsl-pattern-y", `${y}px`);
  }

  function worldToScreen(p){
    return {
      x: p.x - state.camera.x,
      y: p.y - state.camera.y
    };
  }

  function screenDiagonal(){
    return Math.hypot(state.fieldWidth, state.fieldHeight);
  }

  function normalizeWord(value){
    return String(value || "").trim().toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^a-z0-9']/g, "");
  }

  function getPhaseForIndex(index){
    return window.VerseGameShell.getPhaseForProgress({
      progressIndex: index,
      wordCount: state.words.length,
      totalSegments: state.segments.length,
      bookLabel: state.bookLabel,
      referenceLabel: state.referenceLabel
    });
  }

  function getCurrentPhase(){
    return getPhaseForIndex(state.progressIndex);
  }

  function getCurrentCorrectLabel(){
    return state.segments[state.progressIndex] || "";
  }

  function getChoicesForCurrentPhase(){
    const phase = getCurrentPhase();
    const correct = getCurrentCorrectLabel();

    if (phase === "words"){
      const decoys = selectedMode === "easy"
        ? window.VerseGameShell.getFunWordDecoys(correct, state.words, 1)
        : window.VerseGameShell.getVerseWordDecoys({
            words: state.words,
            correct,
            targetIndex: state.progressIndex,
            count: 1,
            avoidNext: 2,
            fallbackToFun: true
          });
      return [
        { word: correct, isCorrect: true },
        { word: decoys[0] || "apple", isCorrect: false }
      ];
    }

    if (phase === "book"){
      const decoys = window.VerseGameShell.getBookDecoys(state.bookLabel, 1);
      return [
        { word: correct, isCorrect: true },
        { word: decoys[0] || "Psalm", isCorrect: false }
      ];
    }

    if (phase === "reference"){
      const decoys = window.VerseGameShell.getReferenceDecoys(state.referenceMeta, selectedMode, 1)
        .filter((ref) => normalizeWord(ref) !== normalizeWord(correct));
      return [
        { word: correct, isCorrect: true },
        { word: decoys[0] || "1:1", isCorrect: false }
      ];
    }

    return [];
  }

  function spawnEncounter(){
    if (state.progressIndex >= state.segments.length){
      finishGame();
      return;
    }

    const choices = getChoicesForCurrentPhase();
    if (choices.length < 2) return;

    let angle = randomAngleAwayFrom(state.lastSpawnAngle);
    const scale = Math.max(state.fieldWidth, state.fieldHeight);
    const modeFactor = SLITHER_TUNING.spawnDistanceScreens[selectedMode] || 1.32;
    const distance = scale * (modeFactor + Math.random() * 0.28) * getSpawnDistanceScale() * getWorldDistanceMultiplier();
    const center = {
      x: state.head.x + Math.cos(angle) * distance,
      y: state.head.y + Math.sin(angle) * distance
    };

    state.lastSpawnAngle = angle;
    state.encounter = {
      center,
      baseCenter: { ...center },
      driftAngle: angle + Math.PI / 2,
      driftPhase: Math.random() * Math.PI * 2,
      bornAt: performance.now(),
      collapsed: false
    };

    const normalTargetH = getSnakeHeadSize() * VISUAL_SCALE_TUNING.bacteriaHeightRatio;
    const modeSeparationFactor = (SLITHER_TUNING.pairSeparationScreen[selectedMode] || 0.23) / 0.23;
    const separation = clamp(
      normalTargetH * GAMEPLAY_SCALE_TUNING.pairSeparationBacteriaRatio * modeSeparationFactor,
      getSnakeHeadSize() * GAMEPLAY_SCALE_TUNING.pairSeparationMinHeadRatio,
      getSnakeHeadSize() * GAMEPLAY_SCALE_TUNING.pairSeparationMaxHeadRatio
    );
    const sideAngle = angle + Math.PI / 2 + (Math.random() < 0.5 ? 0 : Math.PI);

    const targetColors = getTwoDifferentBacteriaColors();

    state.targets = shuffle(choices).map((choice, index) => {
      const sign = index === 0 ? -1 : 1;
      const palette = targetColors[index] || BACTERIA_PALETTE[index % BACTERIA_PALETTE.length];
      return {
        id: state.nextTargetId++,
        word: choice.word,
        isCorrect: choice.isCorrect,
        bacteriaVariant: getBacteriaVariant(choice.word),
        bacteriaPalette: palette,
        x: center.x + Math.cos(sideAngle) * separation * 0.5 * sign,
        y: center.y + Math.sin(sideAngle) * separation * 0.5 * sign,
        anchorX: center.x,
        anchorY: center.y,
        offsetAngle: sideAngle + (sign < 0 ? Math.PI : 0),
        baseOffset: separation * 0.5,
        phase: Math.random() * Math.PI * 2,
        wiggle: 0,
        r: estimateTargetRadius(choice.word),
        wrongHitUntil: 0,
        fleeing: false,
        fleeAngle: 0,
        freeAnchor: null
      };
    });

    spawnOrbsForEncounter();
    maybeSpawnFruit(false);
  }

  function keepObjectiveWithinRange() {
    const maxDist = Math.max(state.fieldWidth, state.fieldHeight) * (SLITHER_TUNING.encounterMaxDistanceScreens || 1.85) * getDistanceScale() * getWorldDistanceMultiplier();

    if (state.encounter && !state.encounter.collapsed) {
      const dx = state.encounter.baseCenter.x - state.head.x;
      const dy = state.encounter.baseCenter.y - state.head.y;
      const dist = Math.hypot(dx, dy);

      if (dist > maxDist) {
        const ux = dx / dist;
        const uy = dy / dist;
        const newBase = {
          x: state.head.x + ux * maxDist,
          y: state.head.y + uy * maxDist
        };

        const moveX = newBase.x - state.encounter.baseCenter.x;
        const moveY = newBase.y - state.encounter.baseCenter.y;

        state.encounter.baseCenter.x += moveX;
        state.encounter.baseCenter.y += moveY;
        state.encounter.center.x += moveX;
        state.encounter.center.y += moveY;

        for (const target of state.targets) {
          if (target.fleeing) continue;
          target.anchorX += moveX;
          target.anchorY += moveY;
        }

        if (state.fruit) {
          const fruitDist = Math.hypot(state.fruit.x - state.head.x, state.fruit.y - state.head.y);
          if (fruitDist > maxDist * 1.1) {
            state.fruit.x += moveX;
            state.fruit.y += moveY;
          }
        }
      }

      return;
    }

    const correct = state.targets.find((target) => target.isCorrect);
    if (!correct || correct.fleeing) return;

    const anchor = correct.freeAnchor || correct;
    const dx = anchor.x - state.head.x;
    const dy = anchor.y - state.head.y;
    const dist = Math.hypot(dx, dy);

    if (dist > maxDist) {
      const ux = dx / dist;
      const uy = dy / dist;
      const newAnchor = {
        x: state.head.x + ux * maxDist,
        y: state.head.y + uy * maxDist
      };

      const moveX = newAnchor.x - anchor.x;
      const moveY = newAnchor.y - anchor.y;

      if (correct.freeAnchor) {
        correct.freeAnchor.x += moveX;
        correct.freeAnchor.y += moveY;
      }

      correct.x += moveX;
      correct.y += moveY;
      correct.anchorX += moveX;
      correct.anchorY += moveY;
    }
  }

  function updateEncounter(dt, ts){
    if (!state.targets.length) return;

    const encounter = state.encounter;
    const headSize = getSnakeHeadSize();
    const modeRoamFactor = (SLITHER_TUNING.pairRoamScreen[selectedMode] || 0.12) / 0.12;
    const roam = clamp(
      headSize * GAMEPLAY_SCALE_TUNING.roamHeadRatio * modeRoamFactor,
      headSize * GAMEPLAY_SCALE_TUNING.roamMinHeadRatio,
      headSize * GAMEPLAY_SCALE_TUNING.roamMaxHeadRatio
    );

    if (encounter && !encounter.collapsed){
      encounter.driftPhase += dt / 1000;
      encounter.center.x = encounter.baseCenter.x + Math.cos(encounter.driftPhase * 0.45 + encounter.driftAngle) * roam * 0.42;
      encounter.center.y = encounter.baseCenter.y + Math.sin(encounter.driftPhase * 0.45 + encounter.driftAngle) * roam * 0.42;
    }

    for (const target of state.targets){
      if (target.fleeing){
        const fleeSpeed = getWrongFleeSpeed();
        target.x += Math.cos(target.fleeAngle) * fleeSpeed * (dt / 1000);
        target.y += Math.sin(target.fleeAngle) * fleeSpeed * (dt / 1000);
        const distFromPlayer = Math.hypot(target.x - state.head.x, target.y - state.head.y);
        const maxDist = Math.max(state.fieldWidth, state.fieldHeight) * SLITHER_TUNING.wrongFleeMaxScreenDistance * getDistanceScale() * getWorldDistanceMultiplier();
        if (distFromPlayer >= maxDist){
          target.fleeing = false;
          target.freeAnchor = { x: target.x, y: target.y };
        }
        continue;
      }

      target.phase += dt / 1000;
      const center = target.freeAnchor || (encounter ? encounter.center : { x: target.anchorX, y: target.anchorY });
      const pulse = Math.sin(target.phase * 1.8) * headSize * GAMEPLAY_SCALE_TUNING.targetPulseHeadRatio;
      const side = target.baseOffset + pulse;
      const sway = Math.sin(target.phase * 2.7) * headSize * GAMEPLAY_SCALE_TUNING.targetSwayHeadRatio;
      const a = target.offsetAngle;
      target.x = center.x + Math.cos(a) * side + Math.cos(a + Math.PI / 2) * sway;
      target.y = center.y + Math.sin(a) * side + Math.sin(a + Math.PI / 2) * sway;
    }

    keepTargetsSeparated();
  }

  function keepTargetsSeparated(){
    if (state.targets.length < 2) return;
    const a = state.targets[0];
    const b = state.targets[1];
    const minDist = Math.max(
      a.r + b.r + getSnakeHeadSize() * GAMEPLAY_SCALE_TUNING.targetPaddingHeadRatio,
      getSnakeHeadSize() * GAMEPLAY_SCALE_TUNING.pairSeparationMinHeadRatio
    );
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d >= minDist) return;
    const push = (minDist - d) * 0.5;
    const ux = dx / d;
    const uy = dy / d;
    a.x -= ux * push;
    a.y -= uy * push;
    b.x += ux * push;
    b.y += uy * push;
  }

  function getOrbRadius(sizeRatio) {
    return getSnakeHeadSize() * sizeRatio * 0.5;
  }

  function getOrbGrowthHeads(sizeRatio) {
    const t = clamp(
      (sizeRatio - ORB_TUNING.minSizeHeadRatio) /
      Math.max(0.001, ORB_TUNING.maxSizeHeadRatio - ORB_TUNING.minSizeHeadRatio),
      0,
      1
    );

    return ORB_TUNING.minGrowthHeads +
      (ORB_TUNING.maxGrowthHeads - ORB_TUNING.minGrowthHeads) * t;
  }

  function syncOrbSize(orb) {
    orb.r = getOrbRadius(orb.sizeRatio);
    orb.sizePx = orb.r * 2;
    orb.growthHeads = getOrbGrowthHeads(orb.sizeRatio);
  }

  function spawnOrbsForEncounter() {
    if (!state.encounter) return;

    const start = { x: state.head.x, y: state.head.y };
    const end = state.encounter.baseCenter || state.encounter.center;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);

    if (distance < getSnakeHeadSize() * 4) {
      state.orbs = [];
      return;
    }

    const ux = dx / distance;
    const uy = dy / distance;
    const sideX = -uy;
    const sideY = ux;
    const spread = Math.min(state.fieldWidth, state.fieldHeight) * ORB_TUNING.sideSpreadScreens * getWorldDistanceMultiplier();

    const count = ORB_TUNING.targetCount;
    const orbs = [];

    for (let i = 0; i < count; i++) {
      const pathT = randRange(ORB_TUNING.pathStart, ORB_TUNING.pathEnd);
      const side = randRange(-spread, spread);
      const jitter = randRange(-getSnakeHeadSize() * 1.8, getSnakeHeadSize() * 1.8);
      const sizeRatio = randRange(ORB_TUNING.minSizeHeadRatio, ORB_TUNING.maxSizeHeadRatio);

      const orb = {
        id: `${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`,
        x: start.x + dx * pathT + sideX * side + ux * jitter,
        y: start.y + dy * pathT + sideY * side + uy * jitter,
        sizeRatio,
        color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        collectedAt: 0
      };

      syncOrbSize(orb);
      orbs.push(orb);
    }

    state.orbs = orbs;
  }

  function updateOrbs(dt, ts) {
    if (!state.orbs.length) return;

    for (const orb of state.orbs) {
      orb.phase += dt / 1000;
    }

    state.orbs = state.orbs.filter((orb) => {
      return !orb.collectedAt || ts - orb.collectedAt < ORB_TUNING.collectPopDuration;
    });
  }

  function checkOrbCollisions(ts) {
    if (!state.orbs.length) return;

    for (const orb of state.orbs) {
      if (orb.collectedAt) continue;

      const d = Math.hypot(state.head.x - orb.x, state.head.y - orb.y);
      if (d <= orb.r + getSnakeHeadCollisionRadius()) {
        orb.collectedAt = ts;
        growSnakeByHeadLengths(orb.growthHeads);
        state.headPopUntil = performance.now() + 180;
        playOrbTone(orb.sizeRatio);
      }
    }
  }

  function renderOrbs() {
    const layer = document.getElementById("vslOrbLayer");
    if (!layer) return;

    const activeIds = new Set(state.orbs.map((orb) => String(orb.id)));

    for (const child of [...layer.children]) {
      if (!activeIds.has(child.dataset.id)) child.remove();
    }

    for (const orb of state.orbs) {
      let el = layer.querySelector(`[data-id="${orb.id}"]`);

      if (!el) {
        el = document.createElement("div");
        el.className = "vsl-orb";
        el.dataset.id = orb.id;
        el.innerHTML = `<span></span>`;
        layer.appendChild(el);
      }

      const p = worldToScreen(orb);
      const bob = Math.sin(orb.phase * 2.4) * getSnakeHeadSize() * 0.06;
      const pulse = 1 + Math.sin(orb.phase * 3.2) * 0.08;

      let collectScale = 1;
      let opacity = 1;

      if (orb.collectedAt) {
        const t = clamp((performance.now() - orb.collectedAt) / ORB_TUNING.collectPopDuration, 0, 1);
        collectScale = 1 + easeOutCubic(t) * 1.8;
        opacity = 1 - t;
      }

      el.style.setProperty("--vsl-orb-size", `${orb.sizePx.toFixed(2)}px`);
      el.style.setProperty("--vsl-orb-color", orb.color);
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y + bob).toFixed(1)}px) translate(-50%, -50%) scale(${(pulse * collectScale).toFixed(3)})`;
    }
  }

  function startBonusRound() {
    const now = performance.now();

    playGameSound("bonusStart");

    state.bonusActive = true;
    state.bonusPlayed = true;
    state.bonusStartedAt = now;
    state.bonusEndsAt = now + BONUS_TUNING.durationMs;
    state.bonusScore = 0;

    state.encounter = null;
    state.targets = [];
    state.escapingTargets = [];
    state.fruit = null;
    state.orbs = [];
    state.pickupPops = [];

    spawnBonusMiniSnakes();
    updateBonusHud(now);

    state.flashText = "BONUS ROUND!";
    state.flashUntil = now + 1100;
  }

  function updateBonusRound(dt, ts) {
    if (!state.bonusActive) return;

    if (ts >= state.bonusEndsAt) {
      endBonusRound();
      return;
    }

    while (state.miniSnakes.length < BONUS_TUNING.activeMiniSnakes) {
      state.miniSnakes.push(createMiniSnake());
    }

    for (const snake of state.miniSnakes) {
      updateMiniSnake(snake, dt);
    }

    state.miniSnakes = state.miniSnakes.filter((snake) => !isMiniSnakeTooFar(snake));

    while (state.miniSnakes.length < BONUS_TUNING.activeMiniSnakes) {
      state.miniSnakes.push(createMiniSnake());
    }

    updateBonusHud(ts);
  }

  function endBonusRound() {
    startBonusExit();
  }

  function startBonusExit() {
    const now = performance.now();

    state.bonusActive = false;
    state.bonusEnding = true;
    state.bonusExitStartedAt = now;
    state.bonusExitResultAt = 0;
    state.bonusExitCamera = {
      x: state.camera.x,
      y: state.camera.y
    };

    state.miniSnakes = [];
    state.targets = [];
    state.escapingTargets = [];
    state.orbs = [];
    state.fruit = null;
    state.pickupPops = [];
    state.burstEffects = [];

    state.boostActiveUntil = 0;
    state.boostCooldownUntil = 0;
    state.pointer.active = false;

    renderMiniSnakes();
    renderTargets();
    renderOrbs();
    renderFruit();
    updateBonusHud(now);
  }

  function updateBonusExit(dt, ts) {
    if (!state.bonusExitResultAt) {
      updateBonusExitMotion(dt);

      const elapsed = ts - state.bonusExitStartedAt;
      const offscreen = isPlayerSnakeOffscreen();

      if (offscreen || elapsed >= BONUS_TUNING.exitMaxMs) {
        showBonusResult(ts);
      }

      return;
    }

    if (ts >= state.bonusExitResultAt + BONUS_TUNING.resultPauseMs) {
      completeGameAfterBonus();
    }
  }

  function updateBonusExitMotion(dt) {
    const seconds = dt / 1000;
    const speed = getCurrentSpeed() * BONUS_TUNING.exitSpeedMultiplier;

    state.head.speed = speed;
    state.head.x += Math.cos(state.head.angle) * speed * seconds;
    state.head.y += Math.sin(state.head.angle) * speed * seconds;

    state.trail.unshift({ x: state.head.x, y: state.head.y });
    trimTrail();
  }

  function isPlayerSnakeOffscreen() {
    const head = worldToScreen(state.head);
    const margin = getSnakeHeadSize() * 2.4;

    return (
      head.x < -margin ||
      head.x > state.fieldWidth + margin ||
      head.y < -margin ||
      head.y > state.fieldHeight + margin
    );
  }

  function showBonusResult(ts) {
    state.bonusExitResultAt = ts;
    state.snakeHidden = true;
    state.trail = [];

    state.flashText = "";
    state.flashUntil = 0;

    playGameSound("bonusResult");
    renderBonusResult(true);
  }

  function formatBonusResultText() {
    const count = state.bonusScore;
    const noun = count === 1 ? "snake" : "snakes";
    return `You ate ${count} ${noun}!`;
  }

  function renderBonusResult(visible) {
    const el = document.getElementById("vslBonusResult");
    if (!el) return;

    if (!visible) {
      el.classList.remove("is-visible");
      el.innerHTML = "";
      return;
    }

    el.innerHTML = `
      <div class="vsl-bonus-result-card">
        ${escapeHtml(formatBonusResultText())}
      </div>
    `;

    el.classList.add("is-visible");
  }

  function spawnBonusMiniSnakes() {
    state.miniSnakes = [];

    for (let i = 0; i < BONUS_TUNING.activeMiniSnakes; i++) {
      state.miniSnakes.push(createMiniSnake());
    }
  }

  function createMiniSnake() {
    const headSize = getSnakeHeadSize();
    const scale = BONUS_TUNING.miniScale;
    const lengthPx = headSize * BONUS_TUNING.miniLengthHeads * scale;
    const width = headSize * 0.74 * scale;
    const stripeWidth = headSize * 0.38 * scale;
    const headRadius = width * 0.58;
    const colors = getTwoDifferentMiniSnakeColors();
    const pos = getMiniSnakeSpawnPoint();
    const angle = pos.angle;

    const snake = {
      id: state.nextMiniSnakeId++,
      x: pos.x,
      y: pos.y,
      angle,
      speed: randRange(BONUS_TUNING.miniSpeedMin, BONUS_TUNING.miniSpeedMax) * getSpeedScale() * getWorldSpeedMultiplier(),
      turnPhase: Math.random() * Math.PI * 2,
      turnWobble: randRange(0.8, 1.35),
      entryGraceUntil: performance.now() + BONUS_TUNING.entryGraceMs,
      lengthPx,
      width,
      stripeWidth,
      headRadius,
      bodyColor: colors.body,
      dotColor: colors.dot,
      trail: []
    };

    seedMiniSnakeTrail(snake);
    return snake;
  }

  function getTwoDifferentMiniSnakeColors() {
    const colors = SNAKE_RANDOM_DOT_COLORS;
    const body = colors[Math.floor(Math.random() * colors.length)];
    let dot = body;

    for (let i = 0; i < 8 && dot === body; i++) {
      dot = colors[Math.floor(Math.random() * colors.length)];
    }

    return { body, dot };
  }

  function getMiniSnakeSpawnPoint() {
    const pad = getSnakeHeadSize() * BONUS_TUNING.offscreenPaddingHeads;
    const edge = Math.floor(Math.random() * 4);

    let screenX = 0;
    let screenY = 0;

    if (edge === 0) {
      // top
      screenX = randRange(-pad, state.fieldWidth + pad);
      screenY = -pad;
    } else if (edge === 1) {
      // right
      screenX = state.fieldWidth + pad;
      screenY = randRange(-pad, state.fieldHeight + pad);
    } else if (edge === 2) {
      // bottom
      screenX = randRange(-pad, state.fieldWidth + pad);
      screenY = state.fieldHeight + pad;
    } else {
      // left
      screenX = -pad;
      screenY = randRange(-pad, state.fieldHeight + pad);
    }

    const targetScreenX = randRange(state.fieldWidth * 0.24, state.fieldWidth * 0.76);
    const targetScreenY = randRange(state.fieldHeight * 0.24, state.fieldHeight * 0.76);
    const angle = Math.atan2(targetScreenY - screenY, targetScreenX - screenX);

    return {
      x: state.camera.x + screenX,
      y: state.camera.y + screenY,
      angle
    };
  }

  function seedMiniSnakeTrail(snake) {
    snake.trail = [];
    const step = Math.max(4, snake.width * 0.38);
    const backAngle = snake.angle + Math.PI;

    for (let d = 0; d <= snake.lengthPx; d += step) {
      snake.trail.push({
        x: snake.x + Math.cos(backAngle) * d,
        y: snake.y + Math.sin(backAngle) * d
      });
    }
  }

  function updateMiniSnake(snake, dt) {
    const seconds = dt / 1000;
    snake.turnPhase += seconds * snake.turnWobble;

    const entering = performance.now() < snake.entryGraceUntil;
    const entryWanderScale = entering ? 0.35 : 1;
    const wander = Math.sin(snake.turnPhase * 1.9) * BONUS_TUNING.miniTurnRate * entryWanderScale;
    snake.angle += wander * seconds;

    snake.x += Math.cos(snake.angle) * snake.speed * seconds;
    snake.y += Math.sin(snake.angle) * snake.speed * seconds;

    snake.trail.unshift({ x: snake.x, y: snake.y });
    trimMiniSnakeTrail(snake);
  }

  function trimMiniSnakeTrail(snake) {
    let total = 0;
    const trimmed = [];

    for (let i = 0; i < snake.trail.length; i++) {
      const p = snake.trail[i];
      trimmed.push(p);

      if (i > 0) {
        const prev = snake.trail[i - 1];
        total += Math.hypot(p.x - prev.x, p.y - prev.y);
      }

      if (total >= snake.lengthPx) break;
    }

    snake.trail = trimmed;
  }

  function isMiniSnakeTooFar(snake) {
    if (performance.now() < snake.entryGraceUntil) {
      return false;
    }

    const dist = Math.hypot(snake.x - state.head.x, snake.y - state.head.y);
    const maxDist = screenDiagonal() * BONUS_TUNING.despawnPaddingScreens * getWorldDistanceMultiplier();
    return dist > maxDist;
  }

  function checkBonusSnakeCollisions(ts) {
    if (!state.bonusActive || !state.miniSnakes.length) return;

    const headRadius = getSnakeHeadCollisionRadius();

    for (const snake of [...state.miniSnakes]) {
      const hitRadius = headRadius + snake.width * 0.55;

      for (let i = 0; i < snake.trail.length; i += BONUS_TUNING.collisionSampleStep) {
        const p = snake.trail[i];
        const d = Math.hypot(state.head.x - p.x, state.head.y - p.y);

        if (d <= hitRadius) {
          eatMiniSnake(snake, p, ts);
          break;
        }
      }
    }
  }

  function eatMiniSnake(snake, hitPoint, ts) {
    state.bonusScore += 1;
    state.headPopUntil = performance.now() + 180;
    playGameSound("miniSnakeEat");

    showCorrectBurst(hitPoint.x, hitPoint.y);

    state.miniSnakes = state.miniSnakes.filter((item) => item.id !== snake.id);
    state.miniSnakes.push(createMiniSnake());

    updateBonusHud(ts);
  }

  function hydrateMiniSnakeHead(headGroup, snake) {
    if (!headGroup || headGroup.dataset.loaded === "true" || headGroup.dataset.loaded === "loading") return;

    headGroup.dataset.loaded = "loading";

    loadMiniSnakeHeadSvg().then((svgText) => {
      if (!headGroup.isConnected) return;

      const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const svg = doc.querySelector("svg");

      if (!svg) {
        headGroup.dataset.loaded = "";
        return;
      }

      const size = snake.width * 1.55;
      const half = size / 2;

      svg.setAttribute("x", `${(-half).toFixed(2)}`);
      svg.setAttribute("y", `${(-half).toFixed(2)}`);
      svg.setAttribute("width", `${size.toFixed(2)}`);
      svg.setAttribute("height", `${size.toFixed(2)}`);
      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("vsl-mini-snake-head-svg");

      const imported = document.importNode(svg, true);
      const headShape = imported.querySelector("#head");

      if (headShape) {
        headShape.style.fill = snake.bodyColor;
      }

      headGroup.innerHTML = "";
      headGroup.appendChild(imported);
      headGroup.dataset.loaded = "true";
    }).catch(() => {
      headGroup.dataset.loaded = "";
    });
  }

  function renderMiniSnakes() {
    const layer = document.getElementById("vslMiniSnakeLayer");
    if (!layer) return;

    const activeIds = new Set(state.miniSnakes.map((snake) => String(snake.id)));

    for (const child of [...layer.children]) {
      if (!activeIds.has(child.dataset.id)) child.remove();
    }

    for (const snake of state.miniSnakes) {
      let group = layer.querySelector(`[data-id="${snake.id}"]`);

      if (!group) {
        group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.classList.add("vsl-mini-snake");
        group.dataset.id = snake.id;

        const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
        body.classList.add("vsl-mini-snake-body");

        const dots = document.createElementNS("http://www.w3.org/2000/svg", "path");
        dots.classList.add("vsl-mini-snake-dots");

        const tongue = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tongue.classList.add("vsl-mini-snake-tongue");

        const head = document.createElementNS("http://www.w3.org/2000/svg", "g");
        head.classList.add("vsl-mini-snake-head");

        group.appendChild(body);
        group.appendChild(dots);
        group.appendChild(tongue);
        group.appendChild(head);
        layer.appendChild(group);
      }

      const body = group.querySelector(".vsl-mini-snake-body");
      const dots = group.querySelector(".vsl-mini-snake-dots");
      const tongue = group.querySelector(".vsl-mini-snake-tongue");
      const headGroup = group.querySelector(".vsl-mini-snake-head");

      const screenTrail = snake.trail.map(worldToScreen);
      const d = buildBodyPath(screenTrail);
      const head = worldToScreen(snake);

      body.setAttribute("d", d);
      body.style.stroke = snake.bodyColor;
      body.style.strokeWidth = snake.width.toFixed(2);

      dots.setAttribute("d", d);
      dots.style.stroke = snake.dotColor;
      dots.style.strokeWidth = snake.stripeWidth.toFixed(2);
      dots.style.strokeDasharray = `0.01 ${Math.max(6, snake.stripeWidth * 1.65).toFixed(2)}`;

      if (headGroup) {
        const angleDeg = (snake.angle * 180 / Math.PI + 90).toFixed(1);
        const r = snake.headRadius || snake.width * 0.58;

        if (tongue) {
          const tongueBase = -r * 0.92;
          const tongueStem = -r * 1.52;
          const tongueTip = -r * 1.86;
          const tongueFork = r * 0.22;

          tongue.setAttribute(
            "transform",
            `translate(${head.x.toFixed(1)} ${head.y.toFixed(1)}) rotate(${angleDeg})`
          );

          tongue.setAttribute(
            "d",
            `M 0 ${tongueBase.toFixed(1)} L 0 ${tongueStem.toFixed(1)} M 0 ${tongueStem.toFixed(1)} L ${(-tongueFork).toFixed(1)} ${tongueTip.toFixed(1)} M 0 ${tongueStem.toFixed(1)} L ${tongueFork.toFixed(1)} ${tongueTip.toFixed(1)}`
          );

          tongue.style.strokeWidth = Math.max(1.2, r * 0.22).toFixed(2);
        }

        hydrateMiniSnakeHead(headGroup, snake);

        headGroup.setAttribute(
          "transform",
          `translate(${head.x.toFixed(1)} ${head.y.toFixed(1)}) rotate(${angleDeg})`
        );

        const headShape = headGroup.querySelector("#head");
        if (headShape) {
          headShape.style.fill = snake.bodyColor;
        }
      }
    }
  }

  function getFruitSpawnCandidate(attempt = 0) {
    const targetPoint = state.encounter ? state.encounter.center : state.head;
    const dx = targetPoint.x - state.head.x;
    const dy = targetPoint.y - state.head.y;
    const angle = Math.atan2(dy, dx);
    const along = 0.25 + Math.random() * 0.60;
    const sideSpread =
      Math.min(state.fieldWidth, state.fieldHeight) *
      (0.26 + Math.min(attempt, 8) * 0.035) *
      getWorldDistanceMultiplier();
    const side = (Math.random() * 2 - 1) * sideSpread;

    return {
      x: state.head.x + dx * along + Math.cos(angle + Math.PI / 2) * side,
      y: state.head.y + dy * along + Math.sin(angle + Math.PI / 2) * side
    };
  }

  function isFruitClearOfWordTargets(candidate, fruitRadius) {
    const activeTargets = state.targets.filter((target) => target && !target.hit);

    if (!activeTargets.length) return true;

    const clearanceBuffer = getSnakeHeadSize() * 0.95;

    return activeTargets.every((target) => {
      const targetRadius =
        Number(target.r) ||
        estimateTargetRadius(target.word) ||
        getSnakeHeadSize();

      const distance = Math.hypot(candidate.x - target.x, candidate.y - target.y);

      return distance >= fruitRadius + targetRadius + clearanceBuffer;
    });
  }

  function maybeSpawnFruit(force){
    if (state.fruit) return;
    if (!force && Math.random() > SLITHER_TUNING.fruitChance) return;

    const fruitRadius = getFruitRadius();
    const attempts = force ? 24 : 14;
    let candidate = null;

    for (let i = 0; i < attempts; i += 1) {
      const nextCandidate = getFruitSpawnCandidate(i);

      if (isFruitClearOfWordTargets(nextCandidate, fruitRadius)) {
        candidate = nextCandidate;
        break;
      }
    }

    if (!candidate) return;

    state.fruit = {
      x: candidate.x,
      y: candidate.y,
      r: fruitRadius,
      image: FRUIT_IMAGES[Math.floor(Math.random() * FRUIT_IMAGES.length)],
      phase: Math.random() * Math.PI * 2
    };
  }

  function updateFruit(dt){
    if (!state.fruit) return;
    state.fruit.phase += dt / 1000;
  }

  function checkCollisions(ts){
    checkOrbCollisions(ts);
    checkFruitCollision();
    checkTargetCollision(ts);
  }

  function checkFruitCollision(){
    if (!state.fruit) return;
    const d = Math.hypot(state.head.x - state.fruit.x, state.head.y - state.fruit.y);
    if (d <= state.fruit.r + getSnakeHeadCollisionRadius()){
      state.fruit = null;
      state.fruitCount += 1;
      playGameSound("fruit");
      advanceSnakeStyle();
      state.headPopUntil = performance.now() + 340;
      applySnakeStyle();
    }
  }

  function checkTargetCollision(ts){
    for (const target of [...state.targets]){
      if (target.hit) continue;
      const d = Math.hypot(state.head.x - target.x, state.head.y - target.y);
      if (d <= target.r + getSnakeHeadCollisionRadius()){
        if (target.isCorrect){
          handleCorrectTarget(target);
        } else {
          handleWrongTarget(target, ts);
        }
        break;
      }
    }
  }

  function launchDecoyEscape(correctTarget) {
    const decoy = state.targets.find((target) => target.id !== correctTarget.id && !target.isCorrect);
    if (!decoy) return;

    const dx = decoy.x - state.head.x;
    const dy = decoy.y - state.head.y;
    const d = Math.hypot(dx, dy) || 1;
    const now = performance.now();

    state.escapingTargets.push({
      ...decoy,
      hit: true,
      escaping: true,
      escapeAngle: Math.atan2(dy, dx),
      escapeStartedAt: now,
      escapeUntil: now + DECOY_ESCAPE_TUNING.durationMs,
      escapeSpin: Math.random() < 0.5 ? -1 : 1
    });
  }

  function updateEscapingTargets(dt, ts) {
    if (!state.escapingTargets.length) return;

    const speed = DECOY_ESCAPE_TUNING.speedPxPerSecond * getSpeedScale() * getWorldSpeedMultiplier();
    const seconds = dt / 1000;

    for (const target of state.escapingTargets) {
      target.x += Math.cos(target.escapeAngle) * speed * seconds;
      target.y += Math.sin(target.escapeAngle) * speed * seconds;
    }

    const margin = Math.max(state.fieldWidth, state.fieldHeight) * 0.35;

    state.escapingTargets = state.escapingTargets.filter((target) => {
      if (ts >= target.escapeUntil) return false;

      const p = worldToScreen(target);
      return (
        p.x > -margin &&
        p.x < state.fieldWidth + margin &&
        p.y > -margin &&
        p.y < state.fieldHeight + margin
      );
    });
  }

  function handleCorrectTarget(target){
    playGameSound("correctWord");
    showCorrectBurst(target.x, target.y);
    launchDecoyEscape(target);

    showPickupPop({
      text: target.word,
      kind: "correct",
      x: target.x,
      y: target.y
    });

    state.progressIndex += 1;
    state.targets = [];
    state.encounter = null;
    state.headPopUntil = performance.now() + 260;
    updateBuildHud();

    if (state.progressIndex >= state.segments.length){
      finishGame();
      return;
    }

    spawnEncounter();
  }

  function handleWrongTarget(target, ts){
    playGameSound("wrongWord");
    target.hit = true;
    target.wrongHitUntil = ts + 320;

    triggerSnakeYuck(target);
    resetSnakeBonusLength();

    showPickupPop({
      text: "OOPS!",
      kind: "wrong",
      x: target.x,
      y: target.y
    });

    state.flashText = "";
    state.flashUntil = 0;

    setTimeout(() => {
      if (!state.running || completed) return;
      state.targets = state.targets.filter((item) => item.id !== target.id);
      const correct = state.targets.find((item) => item.isCorrect);
      if (correct){
        const fleeAngle = Math.atan2(correct.y - state.head.y, correct.x - state.head.x);
        correct.fleeing = true;
        correct.fleeAngle = fleeAngle;
        correct.freeAnchor = null;
        if (state.encounter) state.encounter.collapsed = true;
      }
    }, 180);
  }

  function finishGame(){
    if (completed) return;

    if (!state.bonusPlayed){
      startBonusRound();
      return;
    }

    completeGameAfterBonus();
  }

  async function completeGameAfterBonus(){
    if (completed) return;
    completed = true;
    state.bonusActive = false;

    // Keep bonusEnding true and keep the bonus result visible until the
    // completion screen replaces the game. This prevents one last camera-follow
    // frame from slipping in before renderDone().
    completionResult = null;

    stopLoop();

    if (window.VerseGameBridge.completeGameRun){
      try {
        completionResult = await window.VerseGameBridge.completeGameRun({
          verseId: ctx.verseId,
          gameId: GAME_ID,
          mode: selectedMode,
          stats: {
            fruitCount: state.fruitCount,
            bonusScore: state.bonusScore,
            progressIndex: state.progressIndex
          }
        });
      } catch (err) {
        console.warn("Verse Snake completion save failed:", err);
        completionResult = null;
      }
    }

    setTimeout(() => {
      state.bonusEnding = false;
      renderBonusResult(false);
      renderDone();
    }, 220);
  }

  function renderDone(){
    stopLoop();
    playGameSound("verseComplete");

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
      gameMessage: `Bonus Score: ${state.bonusScore}`,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: () => {
        unlockAndTap();
        completed = false;
        renderModeSelect();
      },
      onMoreGames: () => {
        unlockAndTap();
        window.VerseGameBridge.exitGame();
      },
      onChangeVerse: () => {
        unlockAndTap();
        window.VerseGameBridge.returnToTitle();
      }
    });
  }

  function updateBonusHud(ts = performance.now()) {
    const line = document.getElementById("vslBuildLine");
    const track = document.getElementById("vslBuildTrack");
    if (!track) return;

    if (line) {
      line.classList.add("is-bonus");
    }

    track.innerHTML = `
      <span class="vsl-bonus-score" id="vslBuildPrompt">
        <img class="vsl-bonus-score-icon" src="${BONUS_SNAKE_ICON_ASSET}" alt="" aria-hidden="true">
        <span class="vsl-bonus-score-text">x ${state.bonusScore}</span>
      </span>
    `;

    track.style.setProperty("--vsl-build-shift", "0px");
    updateBuildHudShift();
  }

  function updateBuildHud() {
    const track = document.getElementById("vslBuildTrack");
    const line = document.getElementById("vslBuildLine");

    if (line) {
      line.classList.remove("is-bonus");
    }

    if (!track) return;

    const current = getCurrentCorrectLabel();
    const built = state.segments.slice(0, state.progressIndex);
    const maxContextWords = Math.min(built.length, 14);

    const currentHtml = current
      ? buildCurrentPromptHtml(current)
      : `<span class="vsl-build-current is-easy" id="vslBuildPrompt">DONE!</span>`;

    const renderCandidate = (visibleCount) => {
      const visibleBuilt = visibleCount > 0 ? built.slice(-visibleCount) : [];
      const showPrefix = built.length > visibleCount;

      const prefix = showPrefix
        ? `<span class="vsl-build-built">…</span>`
        : "";

      const builtHtml = visibleBuilt.map((word) => {
        return `<span class="vsl-build-built">${escapeHtml(word)}</span>`;
      }).join("");

      track.innerHTML = `
        ${prefix}
        ${builtHtml}
        ${currentHtml}
      `;

      track.style.setProperty("--vsl-build-shift", "0px");
    };

    renderCandidate(maxContextWords);

    if (!line) return;

    const fitsBuildLine = () => {
      return track.scrollWidth <= track.clientWidth + 2;
    };

    for (let visibleCount = maxContextWords; visibleCount >= 0; visibleCount--) {
      renderCandidate(visibleCount);

      if (fitsBuildLine()) {
        break;
      }
    }

    if (!fitsBuildLine()) {
      renderCandidate(0);
    }

    updateBuildHudShift();
  }
  
  
  function buildCurrentPromptHtml(word) {
    const cleanWord = String(word || "").trim();
    const mode = selectedMode || "medium";

    if (mode === "easy") {
      return `<span class="vsl-build-current is-easy" id="vslBuildPrompt">${escapeHtml(cleanWord.toUpperCase())}</span>`;
    }

    if (mode === "medium") {
      const firstLetter = cleanWord.charAt(0);
      const lineCh = getPromptLineLength(cleanWord);
      return `
        <span class="vsl-build-current is-medium" id="vslBuildPrompt">
          <span class="vsl-build-first-letter">${escapeHtml(firstLetter)}</span><span class="vsl-build-line-fill" style="--vsl-line-ch:${lineCh}ch"></span>
        </span>
      `;
    }

    const lineCh = getPromptLineLength(cleanWord);
    return `
      <span class="vsl-build-current is-hard" id="vslBuildPrompt">
        <span class="vsl-build-line-fill" style="--vsl-line-ch:${lineCh}ch"></span>
      </span>
    `;
  }

  function getPromptLineLength(word) {
    return Math.max(2.4, Math.min(String(word || "").length * 0.72, 7.5));
  }

  function updateBuildHudShift() {
    const track = document.getElementById("vslBuildTrack");
    if (!track) return;
    track.style.setProperty("--vsl-build-shift", "0px");
  }
  
  function triggerSnakeYuck(target) {
    const dx = state.head.x - target.x;
    const dy = state.head.y - target.y;
    const d = Math.hypot(dx, dy) || 1;

    state.yuckStartedAt = performance.now();
    state.yuckUntil = state.yuckStartedAt + YUCK_BODY_TUNING.durationMs;
    state.yuckVector = {
      x: dx / d,
      y: dy / d
    };
    state.headPopUntil = state.yuckStartedAt + 260;
    captureYuckTrailSnapshot();
  }
  

  function showCorrectBurst(x, y) {
    const starColors = ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6", "#ffffff"];
    const cloudColors = ["#ffd66f", "#ffc751", "#ffe08a", "#ffa351"];
    const particles = [];
    const puffs = [];
    const whooshes = [];

    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i / 14) + randRange(-0.18, 0.18);
      const distance = randRange(18, 46);
      puffs.push({
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance * 0.78,
        size: randRange(28, 54),
        color: cloudColors[i % cloudColors.length],
        delay: Math.round(randRange(0, 55))
      });
    }

    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i / 18) + randRange(-0.14, 0.14);
      const distance = randRange(48, 92);
      particles.push({
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        size: randRange(10, 22),
        rotate: randRange(-260, 260),
        color: starColors[i % starColors.length],
        delay: Math.round(randRange(20, 95))
      });
    }

    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i / 7) + randRange(-0.25, 0.25);
      const distance = randRange(36, 72);
      whooshes.push({
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        rotate: angle * 180 / Math.PI + randRange(-28, 28),
        delay: Math.round(randRange(0, 70))
      });
    }

    state.burstEffects.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x,
      y,
      bornAt: performance.now(),
      duration: 760,
      puffs,
      particles,
      whooshes
    });
  }

  function renderBurstEffects(ts) {
    const layer = document.getElementById("vslEffectLayer");
    if (!layer) return;

    state.burstEffects = state.burstEffects.filter((effect) => ts - effect.bornAt < effect.duration);
    const activeIds = new Set(state.burstEffects.map((effect) => effect.id));

    for (const child of [...layer.children]) {
      if (!activeIds.has(child.dataset.id)) child.remove();
    }

    for (const effect of state.burstEffects) {
      let el = layer.querySelector(`[data-id="${effect.id}"]`);

      if (!el) {
        el = document.createElement("div");
        el.className = "vsl-correct-burst";
        el.dataset.id = effect.id;
        el.innerHTML = `
          <div class="vsl-burst-flash" aria-hidden="true"></div>
          <div class="vsl-burst-cloud" aria-hidden="true"></div>
        `;

        const cloud = el.querySelector(".vsl-burst-cloud");

        for (const puff of effect.puffs || []) {
          const puffEl = document.createElement("span");
          puffEl.className = "vsl-burst-puff";
          puffEl.style.setProperty("--vsl-puff-tx", `${puff.tx.toFixed(1)}px`);
          puffEl.style.setProperty("--vsl-puff-ty", `${puff.ty.toFixed(1)}px`);
          puffEl.style.setProperty("--vsl-puff-size", `${puff.size.toFixed(1)}px`);
          puffEl.style.setProperty("--vsl-puff-color", puff.color);
          puffEl.style.setProperty("--vsl-puff-delay", `${puff.delay}ms`);
          cloud.appendChild(puffEl);
        }

        for (const whoosh of effect.whooshes || []) {
          const whooshEl = document.createElement("span");
          whooshEl.className = "vsl-burst-whoosh";
          whooshEl.style.setProperty("--vsl-whoosh-tx", `${whoosh.tx.toFixed(1)}px`);
          whooshEl.style.setProperty("--vsl-whoosh-ty", `${whoosh.ty.toFixed(1)}px`);
          whooshEl.style.setProperty("--vsl-whoosh-rotate", `${whoosh.rotate.toFixed(1)}deg`);
          whooshEl.style.setProperty("--vsl-whoosh-delay", `${whoosh.delay}ms`);
          el.appendChild(whooshEl);
        }

        for (const particle of effect.particles || []) {
          const star = document.createElement("span");
          star.className = "vsl-burst-star";
          star.textContent = "★";
          star.style.setProperty("--vsl-star-tx", `${particle.tx.toFixed(1)}px`);
          star.style.setProperty("--vsl-star-ty", `${particle.ty.toFixed(1)}px`);
          star.style.setProperty("--vsl-star-size", `${particle.size.toFixed(1)}px`);
          star.style.setProperty("--vsl-star-rotate", `${particle.rotate.toFixed(1)}deg`);
          star.style.setProperty("--vsl-star-color", particle.color);
          star.style.setProperty("--vsl-star-delay", `${particle.delay}ms`);
          el.appendChild(star);
        }

        layer.appendChild(el);

        requestAnimationFrame(() => {
          el.classList.add("is-live");
        });
      }

      const p = worldToScreen(effect);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%) scale(${getVisualScale().toFixed(3)})`;
    }
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function renderTargets() {
    const layer = document.getElementById("vslTargetLayer");
    if (!layer) return;

    const visibleTargets = [...state.targets, ...state.escapingTargets];
    const activeIds = new Set(visibleTargets.map((target) => String(target.id)));
    for (const child of [...layer.children]) {
      if (!activeIds.has(child.dataset.id)) child.remove();
    }

    for (const target of visibleTargets) {
      let el = layer.querySelector(`[data-id="${target.id}"]`);

      if (!el) {
        el = document.createElement("div");
        el.className = `vsl-word-target is-${target.bacteriaVariant || "normal"}`;
        el.dataset.id = String(target.id);
        el.dataset.asset = "";
        el.innerHTML = `
          <div class="vsl-bacteria-art" aria-hidden="true"></div>
          <div class="vsl-bacteria-label"></div>
        `;
        layer.appendChild(el);
      }

      const palette = target.bacteriaPalette || BACTERIA_PALETTE[0];
      el.className = `vsl-word-target is-${target.bacteriaVariant || "normal"}`;
      el.style.setProperty("--vsl-bacteria-body", palette.body);
      el.style.setProperty("--vsl-bacteria-dark", palette.dark);
      el.style.setProperty("--vsl-bacteria-text", palette.text || "#ffffff");
      el.querySelector(".vsl-bacteria-label").textContent = target.word;

      hydrateBacteriaTarget(el, target);

      const p = worldToScreen(target);
      let extraTransform = "";

      if (target.escaping){
        const age = performance.now() - target.escapeStartedAt;
        const t = clamp(age / DECOY_ESCAPE_TUNING.durationMs, 0, 1);
        const spin = target.escapeSpin * DECOY_ESCAPE_TUNING.spinRate * t;
        const scale = 1 - t * 0.34;
        extraTransform = ` rotate(${spin.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      }

      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)${extraTransform}`;
      el.classList.toggle("is-wrong-hit", performance.now() < target.wrongHitUntil);
      el.classList.toggle("is-escaping", !!target.escaping);
    }
  }

  function getBacteriaVariant(word) {
    const len = String(word || "").trim().length;
    if (len <= 4) return "compact";
    if (len <= 9) return "normal";
    return "long";
  }

  function getTwoDifferentBacteriaColors() {
    const firstIndex = Math.floor(Math.random() * BACTERIA_PALETTE.length);
    let secondIndex = Math.floor(Math.random() * BACTERIA_PALETTE.length);

    if (secondIndex === firstIndex) {
      secondIndex = (secondIndex + 1 + Math.floor(Math.random() * (BACTERIA_PALETTE.length - 1))) % BACTERIA_PALETTE.length;
    }

    return [BACTERIA_PALETTE[firstIndex], BACTERIA_PALETTE[secondIndex]];
  }

  function hydrateBacteriaTarget(el, target) {
    const art = el.querySelector(".vsl-bacteria-art");
    if (!art) return;

    const variant = target.bacteriaVariant || getBacteriaVariant(target.word);
    const assetUrl = BACTERIA_ASSETS[variant] || BACTERIA_ASSETS.normal;
    const palette = target.bacteriaPalette || BACTERIA_PALETTE[0];
    const assetKey = `${assetUrl}|${palette.name}`;

    if (el.dataset.asset === assetKey) return;
    el.dataset.asset = assetKey;
    art.innerHTML = "";

    loadBacteriaSvg(assetUrl).then((svgText) => {
      if (el.dataset.asset !== assetKey) return;

      art.innerHTML = svgText;
      const svg = art.querySelector("svg");
      if (!svg) return;

      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("vsl-bacteria-svg");

      const body = svg.querySelector("#body");
      if (body) body.style.fill = palette.body;

      svg.querySelectorAll('[id^="light_hair_"], [id*="light_hair_"]').forEach((hair, index) => {
        hair.style.stroke = palette.body;
        hair.style.animationDelay = `${-(index % 9) * 0.075}s`;
        hair.style.animationDuration = `${0.58 + (index % 5) * 0.055}s`;
      });

      svg.querySelectorAll('[id^="dark_hair_"], [id*="dark_hair_"]').forEach((hair, index) => {
        hair.style.stroke = palette.dark;
        hair.style.animationDelay = `${-(index % 11) * 0.065}s`;
        hair.style.animationDuration = `${0.62 + (index % 6) * 0.05}s`;
      });
    }).catch(() => {
      art.innerHTML = "";
      el.classList.add("is-bacteria-missing");
    });
  }

  function loadBacteriaSvg(assetUrl) {
    if (!bacteriaSvgCache.has(assetUrl)) {
      bacteriaSvgCache.set(
        assetUrl,
        fetch(assetUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`Could not load ${assetUrl}`);
            return res.text();
          })
      );
    }

    return bacteriaSvgCache.get(assetUrl);
  }

  function showPickupPop({ text, kind, x, y }) {
    state.pickupPops.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      kind,
      x,
      y,
      bornAt: performance.now(),
      duration: 720
    });
  }

  function renderPickupPops(ts) {
    const layer = document.getElementById("vslPickupPopLayer");
    if (!layer) return;

    state.pickupPops = state.pickupPops.filter((pop) => ts - pop.bornAt < pop.duration);
    const activeIds = new Set(state.pickupPops.map((pop) => pop.id));

    for (const child of [...layer.children]) {
      if (!activeIds.has(child.dataset.id)) child.remove();
    }

    for (const pop of state.pickupPops) {
      let el = layer.querySelector(`[data-id="${pop.id}"]`);
      if (!el) {
        el = document.createElement("div");
        el.className = `vsl-pickup-pop is-${pop.kind}`;
        el.dataset.id = pop.id;
        el.textContent = pop.text;
        layer.appendChild(el);
      }

      const age = ts - pop.bornAt;
      const t = Math.min(1, age / pop.duration);
      const p = worldToScreen(pop);
      const lift = getSnakeHeadSize() * 0.95 * easeOutCubic(t);
      const scale = 0.76 + 0.24 * easeOutBack(Math.min(1, t * 2.4));
      const opacity = t > 0.68 ? 1 - ((t - 0.68) / 0.32) : 1;

      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y - lift).toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function renderFruit(){
    const layer = document.getElementById("vslFruitLayer");
    if (!layer) return;
    layer.innerHTML = "";
    if (!state.fruit) return;

    const el = document.createElement("div");
    el.className = "vsl-fruit";

    const img = document.createElement("img");
    img.className = "vsl-fruit-img";
    img.src = state.fruit.image;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");

    el.appendChild(img);

    const p = worldToScreen(state.fruit);
    const bob = Math.sin(state.fruit.phase * 2.2) * getSnakeHeadSize() * 0.09;
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y + bob).toFixed(1)}px) translate(-50%, -50%)`;

    layer.appendChild(el);
  }

  function renderArrow(){
    const arrow = document.getElementById("vslArrow");
    if (!arrow) return;
    if (state.bonusActive) {
      arrow.classList.remove("is-visible");
      return;
    }
    const target = getArrowTargetPoint();
    if (!target){
      arrow.classList.remove("is-visible");
      return;
    }

    const screen = worldToScreen(target);
    const cx = state.fieldWidth / 2;
    const cy = state.fieldHeight / 2;
    const dx = screen.x - cx;
    const dy = screen.y - cy;
    const angle = Math.atan2(dy, dx);
    const margin = Math.max(30, Math.min(state.fieldWidth, state.fieldHeight) * 0.07);

    const inside = screen.x > margin && screen.x < state.fieldWidth - margin && screen.y > margin && screen.y < state.fieldHeight - margin;
    if (inside){
      arrow.classList.remove("is-visible");
      return;
    }

    const pos = edgePointForAngle(angle, margin);
    const rotation = angle + Math.PI / 2;
    arrow.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) translate(-50%, -50%) rotate(${rotation}rad)`;
    arrow.classList.add("is-visible");
  }

  function getArrowTargetPoint(){
    const correct = state.targets.find((target) => target.isCorrect);
    if (state.targets.length > 1 && state.encounter && !state.encounter.collapsed){
      return state.encounter.center;
    }
    return correct || null;
  }

  function edgePointForAngle(angle, margin){
    const cx = state.fieldWidth / 2;
    const cy = state.fieldHeight / 2;
    const halfW = Math.max(10, cx - margin);
    const halfH = Math.max(10, cy - margin);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const t = Math.min(
      cos !== 0 ? Math.abs(halfW / cos) : Infinity,
      sin !== 0 ? Math.abs(halfH / sin) : Infinity
    );
    return {
      x: cx + cos * t,
      y: cy + sin * t
    };
  }

  function renderFlash(ts){
    const el = document.getElementById("vslFlashMessage");
    if (!el) return;
    if (state.flashText && ts < state.flashUntil){
      el.textContent = state.flashText;
      el.classList.add("is-visible");
    } else {
      el.classList.remove("is-visible");
    }
  }

  function hydrateSnakeHead() {
    const holder = document.getElementById("vslSnakeHeadArt");
    if (!holder || holder.dataset.loaded === "true" || holder.dataset.loaded === "loading") return;

    holder.dataset.loaded = "loading";

    loadSnakeHeadSvg().then((svgText) => {
      if (!holder.isConnected) return;

      const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) {
        holder.dataset.loaded = "";
        return;
      }

      syncSnakeHeadSvgSize(svg);
      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("vsl-snake-head-svg");

      holder.innerHTML = "";
      holder.appendChild(document.importNode(svg, true));
      holder.dataset.loaded = "true";
      applySnakeStyle();
    }).catch(() => {
      holder.dataset.loaded = "";
    });
  }

  function syncSnakeHeadSvgSize(svgEl) {
    const svg = svgEl || document.querySelector("#vslSnakeHeadArt svg");
    if (!svg) return;

    const size = getSnakeHeadSize();
    const half = size / 2;

    svg.setAttribute("x", `${(-half).toFixed(2)}`);
    svg.setAttribute("y", `${(-half).toFixed(2)}`);
    svg.setAttribute("width", `${size.toFixed(2)}`);
    svg.setAttribute("height", `${size.toFixed(2)}`);
  }

  function loadSnakeHeadSvg() {
    if (!snakeHeadSvgPromise) {
      snakeHeadSvgPromise = fetch(SNAKE_HEAD_ASSET).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${SNAKE_HEAD_ASSET}`);
        return res.text();
      });
    }

    return snakeHeadSvgPromise;
  }

  function loadMiniSnakeHeadSvg() {
    if (!miniSnakeHeadSvgPromise) {
      miniSnakeHeadSvgPromise = fetch(MINI_SNAKE_HEAD_ASSET).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${MINI_SNAKE_HEAD_ASSET}`);
        return res.text();
      });
    }

    return miniSnakeHeadSvgPromise;
  }

  function drawSnake(){
    applySnakeStyle();
    hydrateSnakeHead();

    const body = document.getElementById("vslSnakeBody");
    const stripe = document.getElementById("vslSnakeBodyStripe");
    const headGroup = document.getElementById("vslSnakeHeadGroup");
    const tongue = document.getElementById("vslSnakeTongue");
    const group = document.getElementById("vslSnakeGroup");
    if (!body || !stripe || !headGroup || !tongue || !group) return;

    if (state.snakeHidden){
      group.style.display = "none";
      body.setAttribute("d", "");
      stripe.setAttribute("d", "");
      return;
    }

    group.style.display = "";
    group.classList.toggle("is-boosting", isBoostActive());

    const screenTrail = state.trail.map(worldToScreen);
    const d = buildBodyPath(screenTrail);
    body.setAttribute("d", d);
    stripe.setAttribute("d", d);

    const head = worldToScreen(state.head);
    const now = performance.now();
    const headPulse = now < state.headPopUntil ? 1.14 : 1;
    const headArt = document.getElementById("vslSnakeHeadArt");

    headGroup.setAttribute("transform", `translate(${head.x.toFixed(1)} ${head.y.toFixed(1)}) rotate(${(state.head.angle * 180 / Math.PI + 90).toFixed(1)})`);

    if (headArt){
      headArt.setAttribute("transform", `scale(${headPulse})`);
    }

    const r = getSnakeHeadSize() / 2;
    const tongueBase = -r * 0.95;
    const tongueStem = -r * 1.64;
    const tongueTip = -r * 2.0;
    const tongueFork = r * 0.32;

    tongue.setAttribute(
      "d",
      `M 0 ${tongueBase.toFixed(1)} L 0 ${tongueStem.toFixed(1)} M 0 ${tongueStem.toFixed(1)} L ${(-tongueFork).toFixed(1)} ${tongueTip.toFixed(1)} M 0 ${tongueStem.toFixed(1)} L ${tongueFork.toFixed(1)} ${tongueTip.toFixed(1)}`
    );
  }

  function buildBodyPath(points){
    if (!points.length) return "";

    const simplified = simplifyTrail(points, 9);
    const visualPoints = applyYuckBodyZigZag(simplified);

    let d = `M ${visualPoints[0].x.toFixed(1)} ${visualPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < visualPoints.length; i++){
      d += ` L ${visualPoints[i].x.toFixed(1)} ${visualPoints[i].y.toFixed(1)}`;
    }

    return d;
  }

  function captureYuckTrailSnapshot() {
    const simplified = simplifyTrail(state.trail, 9);
    if (simplified.length < 3) {
      state.yuckTrailSnapshot = null;
      return;
    }

    state.yuckTrailSnapshot = makeYuckZigZagPose(simplified);
  }

  function getYuckBodyIntensity() {
    if (!state.yuckStartedAt || performance.now() >= state.yuckUntil) return 0;

    const elapsed = performance.now() - state.yuckStartedAt;
    const duration = YUCK_BODY_TUNING.durationMs;
    const attack = YUCK_BODY_TUNING.attackMs;
    const hold = YUCK_BODY_TUNING.holdMs;

    if (elapsed <= attack) {
      const t = clamp(elapsed / attack, 0, 1);
      return easeOutCubic(t);
    }

    if (elapsed <= hold) {
      return 1;
    }

    const decayT = clamp((elapsed - hold) / Math.max(1, duration - hold), 0, 1);
    return Math.pow(1 - decayT, 2);
  }

  function makeYuckZigZagPose(points) {
    const amp = YUCK_BODY_TUNING.amplitudePx;
    const waveStep = YUCK_BODY_TUNING.waveStep;
    const headRampPoints = YUCK_BODY_TUNING.headRampPoints;
    const tailFalloffPoints = YUCK_BODY_TUNING.tailFalloffPoints;

    return points.map((point, index) => {
      if (index === 0) return { ...point };

      const prev = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;

      const normalX = -dy / len;
      const normalY = dx / len;

      const wave = Math.floor(index / waveStep) % 2 === 0 ? 1 : -1;
      const headRamp = clamp(index / Math.max(1, headRampPoints), 0, 1);
      const tailFalloff = clamp(1 - (index / Math.max(1, tailFalloffPoints)), 0, 1);
      const offset = amp * headRamp * tailFalloff * wave;

      return {
        x: point.x + normalX * offset,
        y: point.y + normalY * offset
      };
    });
  }

  function applyYuckBodyZigZag(points) {
    const intensity = getYuckBodyIntensity();
    if (intensity <= 0 || points.length < 3 || !state.yuckTrailSnapshot) {
      if (intensity <= 0) state.yuckTrailSnapshot = null;
      return points;
    }

    const snapshotScreen = state.yuckTrailSnapshot.map(worldToScreen);

    return points.map((point, index) => {
      const snap = snapshotScreen[Math.min(index, snapshotScreen.length - 1)];
      if (!snap) return point;

      return {
        x: point.x + (snap.x - point.x) * intensity,
        y: point.y + (snap.y - point.y) * intensity
      };
    });
  }

  function simplifyTrail(points, minDistance){
    if (points.length <= 2) return points;
    const out = [points[0]];
    let last = points[0];
    for (let i = 1; i < points.length - 1; i++){
      const p = points[i];
      if (Math.hypot(p.x - last.x, p.y - last.y) >= minDistance){
        out.push(p);
        last = p;
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  function advanceSnakeStyle() {
    const rainbowIndex = SNAKE_STYLES.indexOf("rainbow");
    const fruitGoal = getFruitNeededForRainbow();

    if (rainbowIndex < 0) {
      state.snakeStyleIndex = Math.min(state.snakeStyleIndex + 1, SNAKE_STYLES.length - 1);
      state.snakeStyle = SNAKE_STYLES[state.snakeStyleIndex];
      refreshSnakeSpecialStyle();
      return;
    }

    if (state.fruitCount <= fruitGoal) {
      const progressIndex = Math.ceil(state.fruitCount * rainbowIndex / fruitGoal);
      const nextIndex = Math.max(state.snakeStyleIndex + 1, progressIndex);

      state.snakeStyleIndex = clamp(nextIndex, 0, rainbowIndex);
      state.snakeStyle = SNAKE_STYLES[state.snakeStyleIndex];
      refreshSnakeSpecialStyle();
      return;
    }

    state.snakeStyle = pickRandomSpecialSnakeStyle();
    state.snakeStyleIndex = SNAKE_STYLES.indexOf(state.snakeStyle);
    refreshSnakeSpecialStyle();
  }

  function getFruitNeededForRainbow() {
    const wordCount = state.words?.length || state.segments?.length || 18;
    return clamp(
      Math.round(wordCount * FRUIT_STYLE_TUNING.fruitPerWordRatio),
      FRUIT_STYLE_TUNING.minFruitForRainbow,
      FRUIT_STYLE_TUNING.maxFruitForRainbow
    );
  }

  function pickRandomSpecialSnakeStyle() {
    const options = SNAKE_SPECIAL_STYLE_IDS.filter((id) => SNAKE_STYLES.includes(id));

    if (!options.length) {
      return "rainbow";
    }

    let next = options[Math.floor(Math.random() * options.length)];

    if (options.length > 1) {
      for (let i = 0; i < 8 && next === state.snakeStyle; i++) {
        next = options[Math.floor(Math.random() * options.length)];
      }
    }

    return next;
  }

  function refreshSnakeSpecialStyle() {
    if (state.snakeStyle === "randomDot") {
      state.snakeRandomDotStyle = makeRandomDottedSnakeStyle();
    } else {
      state.snakeRandomDotStyle = null;
    }
  }

  function makeRandomDottedSnakeStyle() {
    const body = SNAKE_RANDOM_DOT_COLORS[Math.floor(Math.random() * SNAKE_RANDOM_DOT_COLORS.length)];
    let stripe = body;

    for (let i = 0; i < 8 && stripe === body; i++) {
      stripe = SNAKE_RANDOM_DOT_COLORS[Math.floor(Math.random() * SNAKE_RANDOM_DOT_COLORS.length)];
    }

    return {
      body,
      stripe,
      head: body
    };
  }

  function getSnakeStyleDef() {
    return SNAKE_STYLE_DEFS.find((style) => style.id === state.snakeStyle) || SNAKE_STYLE_DEFS[0];
  }

  function getPulseColor(colors, speedMs = 620) {
    if (!colors || colors.length === 0) return null;
    if (colors.length === 1) return colors[0];

    const now = performance.now();
    const cycle = now / speedMs;
    const index = Math.floor(cycle) % colors.length;
    const nextIndex = (index + 1) % colors.length;
    const localT = cycle - Math.floor(cycle);

    const easedT = smoothstep(localT);

    return mixHexColors(colors[index], colors[nextIndex], easedT);
  }

  function smoothstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function mixHexColors(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);

    if (!ca || !cb) {
      return t < 0.5 ? a : b;
    }

    const x = clamp(t, 0, 1);
    const r = Math.round(ca.r + (cb.r - ca.r) * x);
    const g = Math.round(ca.g + (cb.g - ca.g) * x);
    const bl = Math.round(ca.b + (cb.b - ca.b) * x);

    return `rgb(${r}, ${g}, ${bl})`;
  }

  function hexToRgb(value) {
    const raw = String(value || "").trim();

    if (!raw.startsWith("#")) return null;

    let hex = raw.slice(1);

    if (hex.length === 3) {
      hex = hex.split("").map((ch) => ch + ch).join("");
    }

    if (hex.length !== 6) return null;

    const num = Number.parseInt(hex, 16);
    if (Number.isNaN(num)) return null;

    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function applySnakeStyle() {
    const group = document.getElementById("vslSnakeGroup");
    if (!group) return;

    const def = getSnakeStyleDef();
    const randomDot = def.randomDotted
      ? (state.snakeRandomDotStyle || makeRandomDottedSnakeStyle())
      : null;

    if (def.randomDotted && !state.snakeRandomDotStyle) {
      state.snakeRandomDotStyle = randomDot;
    }

    const pulseColor = def.pulseColors ? getPulseColor(def.pulseColors) : null;
    const bodyColor = randomDot?.body || pulseColor || def.body || "#a7cb6f";
    const stripeColor = randomDot?.stripe || def.stripe || "rgba(73,105,30,0.18)";
    const headColor = randomDot?.head || pulseColor || def.head || bodyColor;

    group.classList.toggle("is-dotted", !!def.dotted);
    group.classList.toggle("is-pulsing", !!def.pulseColors);
    group.classList.toggle("is-special-glow", !!def.glow);

    group.style.setProperty("--vsl-snake-body-color", bodyColor);
    group.style.setProperty("--vsl-snake-stripe-color", stripeColor);
    group.style.setProperty("--vsl-snake-head-color", headColor);
    group.style.setProperty("--vsl-snake-glow-color", def.glow || "rgba(255,255,255,0)");

    const headShape = document.querySelector("#vslSnakeHeadArt #head");
    if (headShape) {
      headShape.style.fill = headColor;
    }
  }

  function maybeRecenterWorld(){
    const limit = 50000;
    if (Math.abs(state.head.x) < limit && Math.abs(state.head.y) < limit) return;
    const ox = state.head.x;
    const oy = state.head.y;
    state.head.x = 0;
    state.head.y = 0;
    state.trail = state.trail.map((p) => ({ x: p.x - ox, y: p.y - oy }));
    if (state.yuckTrailSnapshot) {
      state.yuckTrailSnapshot = state.yuckTrailSnapshot.map((p) => ({ x: p.x - ox, y: p.y - oy }));
    }
    for (const target of state.targets){
      target.x -= ox;
      target.y -= oy;
      target.anchorX -= ox;
      target.anchorY -= oy;
      if (target.freeAnchor){
        target.freeAnchor.x -= ox;
        target.freeAnchor.y -= oy;
      }
    }
    if (state.encounter){
      state.encounter.center.x -= ox;
      state.encounter.center.y -= oy;
      state.encounter.baseCenter.x -= ox;
      state.encounter.baseCenter.y -= oy;
    }
    if (state.fruit){
      state.fruit.x -= ox;
      state.fruit.y -= oy;
    }
  }

  function randomAngleAwayFrom(previous){
    let angle = Math.random() * Math.PI * 2;
    for (let i = 0; i < 8; i++){
      const diff = Math.abs(angleDelta(previous, angle));
      if (diff > Math.PI * 0.45) break;
      angle = Math.random() * Math.PI * 2;
    }
    return angle;
  }

  function estimateTargetRadius(word){
    const metrics = getTargetMetrics(word);
    return Math.hypot(metrics.w, metrics.h) * 0.34;
  }

  function modeLabel(){
    return selectedMode ? selectedMode[0].toUpperCase() + selectedMode.slice(1) : "Mode";
  }

  function angleDelta(from, to){
    let diff = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function mod(value, size){
    return ((value % size) + size) % size;
  }

  function shuffle(items){
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  renderIntroScreen();
})();
