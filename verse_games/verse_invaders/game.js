(async function () {
  const app = document.getElementById("app");
  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "verse_invaders";
  const GAME_TITLE = "Verse Invaders";
  const GAME_ICON = "👾";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);

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

  const GAME_THEME = {
    bg: "#333333",
    accent: "#333333"
  };

  const BUILD_AREA = "compact";

  const HELP_OVERLAY_ID = "vinvHelpOverlay";
  const ALIEN_SVG_URL = "./verse_invaders_images/verse_invaders_alien.svg";

  const SOUND_BASE_PATH = "./verse_invaders_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

  const SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,

    rocketLaunch: `${SOUND_BASE_PATH}verse_invaders_launch.mp3`,
    correctHit: `${SOUND_BASE_PATH}verse_invaders_correct.mp3`,
    wrongHit: `${SOUND_BASE_PATH}verse_invaders_wrong.mp3`,
    abduction: `${SOUND_BASE_PATH}verse_invaders_abduction.mp3`,

    streak4: `${SOUND_BASE_PATH}verse_invaders_streak.mp3`,
    streak8: `${SOUND_BASE_PATH}verse_invaders_streak.mp3`,
    streak12: `${SOUND_BASE_PATH}verse_invaders_streak.mp3`,
    streak16: `${SOUND_BASE_PATH}verse_invaders_streak.mp3`,

    bonusStart: `${SOUND_BASE_PATH}verse_invaders_bonus_start.mp3`,
    bonusPop1: `${SOUND_BASE_PATH}verse_invaders_pop_1.mp3`,
    bonusPop2: `${SOUND_BASE_PATH}verse_invaders_pop_2.mp3`,
    bonusPop3: `${SOUND_BASE_PATH}verse_invaders_pop_3.mp3`,
    bonusPop4: `${SOUND_BASE_PATH}verse_invaders_pop_4.mp3`,
    bonusPop5: `${SOUND_BASE_PATH}verse_invaders_pop_5.mp3`,
    bonusPenalty: `${SOUND_BASE_PATH}verse_invaders_wrong_2.mp3`,
    bonusMultiplierUp: `${SOUND_BASE_PATH}verse_invaders_streak.mp3`,
    bonusReveal: `${SOUND_BASE_PATH}verse_invaders_bonus_result.mp3`
  };

  const BONUS_POP_SOUND_KEYS = ["bonusPop1", "bonusPop2", "bonusPop3", "bonusPop4", "bonusPop5"];

  const SOUND_TUNING = {
    masterVolume: 0.74,
    volumes: {
      uiTap: 0.45,

      rocketLaunch: 0.43,
      correctHit: 0.70,
      wrongHit: 0.30,
      abduction: 0.47,

      streak4: 0.41,
      streak8: 0.41,
      streak12: 0.41,
      streak16: 0.74,

      bonusStart: 0.57,
      bonusHit: 0.62,
      bonusPenalty: 0.58,
      bonusMultiplierUp: 0.44,
      bonusReveal: 0.51
    }
  };

  const LANE_KEYS = ["left", "center", "right"];
  const LANE_COLORS = [
    {
      key: "red",
      hex: "#ff5a51",
      alienImg: "./verse_invaders_images/verse_invaders_alien_red.png",
      alienAlt: "Red alien"
    },
    {
      key: "orange",
      hex: "#ffa351",
      alienImg: "./verse_invaders_images/verse_invaders_alien_yellow.png",
      alienAlt: "Orange alien"
    },
    {
      key: "yellow",
      hex: "#ffc751",
      alienImg: "./verse_invaders_images/verse_invaders_alien_yellow.png",
      alienAlt: "Yellow alien"
    },
    {
      key: "green",
      hex: "#a7cb6f",
      alienImg: "./verse_invaders_images/verse_invaders_alien_blue.png",
      alienAlt: "Green alien"
    },
    {
      key: "blue",
      hex: "#40b9c5",
      alienImg: "./verse_invaders_images/verse_invaders_alien_blue.png",
      alienAlt: "Blue alien"
    },
    {
      key: "purple",
      hex: "#7f66c6",
      alienImg: "./verse_invaders_images/verse_invaders_alien_red.png",
      alienAlt: "Purple alien"
    }
  ];

  const ABDUCTEE_IMAGES = [
    "./verse_invaders_images/verse_invaders_abductee_1.png",
    "./verse_invaders_images/verse_invaders_abductee_2.png"
  ];

  const POOF_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;

  const BUTTON_COLOR_ORDER = {
    left: LANE_COLORS[0],
    center: LANE_COLORS[1],
    right: LANE_COLORS[2]
  };
  const ALIEN_BURST_CHUNK_SHAPE = "rounded";

  const CORRECT_HIT_IMPACT_DELAY_MS = 120;
  const ALIEN_BURST_LIFE_MS = 680;
  const STRONG_ALIEN_BURST_LIFE_MS = 760;
  const POOF_LIFE_MS = 650;
  const POOF_EXTRA_FADE_MS = 120;
  const ROUND_ADVANCE_BUFFER_MS = 90;
  const ROUND_CLEAR_FADE_MS = 260;
  const ROUND_ADVANCE_AFTER_TWO_WRONGS_MS = POOF_LIFE_MS + POOF_EXTRA_FADE_MS + ROUND_ADVANCE_BUFFER_MS;
  const ROUND_ADVANCE_AFTER_CORRECT_MS = CORRECT_HIT_IMPACT_DELAY_MS + STRONG_ALIEN_BURST_LIFE_MS + ROUND_ADVANCE_BUFFER_MS;
  const ABDUCTION_LIFE_MS = 1850;
  const BONUS_SWARM_DURATION_MS = 20000;
  const BONUS_SPAWN_START_SEC = 1.05;
  const BONUS_SPAWN_END_SEC = 0.48;
  const BONUS_SPEED_START_MULTIPLIER = 1.0;
  const BONUS_SPEED_END_MULTIPLIER = 1.35;
  const BONUS_MODE_SPEED_MULTIPLIERS = {
    easy: 1,
    medium: 1.12,
    hard: 1.25
  };
  const STREAK_MILESTONE_CONFIG = {
    4: {
      tone: "red",
      bg: "#ff5a51",
      text: "#ffffff",
      rainbow: false,
      burst: false
    },
    8: {
      tone: "blue",
      bg: "#40b9c5",
      text: "#ffffff",
      rainbow: false,
      burst: false
    },
    12: {
      tone: "rainbow",
      bg: "#ffffff",
      text: "#333333",
      rainbow: true,
      burst: false
    },
    16: {
      tone: "rainbow",
      bg: "#ffffff",
      text: "#333333",
      rainbow: true,
      burst: true
    }
  };
  const BOOKS = window.VerseGameShell.getBibleBookDecoys();
  const FUN_DECOYS = window.VerseGameShell.getFunDecoys();

  let selectedMode = null;
  let muted = false;
  let completionMarked = false;
  let completionResult = null;
  let resizeHandlerBound = false;
  let alienSvgTemplate = "";
  let tutorialPlayedThisSession = false;
  let audioCtx = null;
  let silenceAudio = null;
  let audioUnlocked = false;
  const soundBuffers = new Map();
  const soundBufferPromises = new Map();

  const state = {
    running: false,
    rafId: 0,
    lastTs: 0,
    paused: false,
    pauseReason: "",
    scale: 1,
    fieldWidth: 0,
    fieldHeight: 0,
    controlsTopY: 0,
    bottomZoneY: 0,
    buttonsLocked: false,
    activeLane: null,
    buttonColors: null,
    flashBadUntil: 0,
    buildShakeUntil: 0,
    overlayMessage: "",
    overlayUntil: 0,
    buildSizeClass: "normal",
    buildFitDone: false,
    queue: [],
    builtCount: 0,
    phase: "words",
    streak: 0,
    mistakes: 0,
    wrongGuessesThisRound: 0,
    roundIndex: 0,
    roundSpeed: 0,
    entities: [],
    entityRenderSignature: "",
    rocket: null,
    trails: [],
    effects: [],
    roundStatus: "idle",
    scheduledActions: [],
    tutorialMode: false,
    tutorialMessageVisible: false,
    tutorialGoVisible: false,
    tutorialRenderSignature: "",
    bonusIntroMode: false,
    bonusIntroMessage: "",
    bonusIntroRenderSignature: "",
    bonusMode: false,
    bonusScore: 0,
    bonusCleanStreak: 0,
    bonusStartedAt: 0,
    bonusEndsAt: 0,
    bonusAutoTimer: 0,
    bonusSpawnCount: 0,
    bonusRockets: [],
    bonusFinished: false,
    bonusRevealVisible: false,
    bonusFinalScore: 0,
    bonusMaxMultiplier: 1,
    uiSoundFlip: false,
    modeTiming: {
      easy: { start: 6.2, step: 0 },
      medium: { start: 5.8, step: -0.08 },
      hard: { start: 5.1, step: -0.10 }
    }
  };

  const parsedRef = parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
  const buildData = window.VerseGameShell.buildVerseSegments({
    verseText: ctx.verseText || "",
    book: parsedRef.book,
    reference: parsedRef.reference,
    buildArea: BUILD_AREA
  });
  const verseWords = buildData.words;

  await preloadAlienSvg();
  renderIntro();


  async function preloadAlienSvg() {
    try {
      const response = await fetch(ALIEN_SVG_URL, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Could not load alien SVG: ${response.status}`);

      const svgText = await response.text();
      if (!svgText.includes("<svg")) throw new Error("Alien SVG did not contain an <svg> tag.");

      alienSvgTemplate = svgText
        .replace(/<\?xml[\s\S]*?\?>/g, "")
        .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
        .replace(/dur="5s"/g, 'dur="2.6s"')
        .trim();
    } catch (err) {
      console.warn("Verse Invaders SVG alien fallback active:", err);
      alienSvgTemplate = "";
    }
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

  function playRandomBonusPopSound() {
    playGameSound(randomFrom(BONUS_POP_SOUND_KEYS), "bonusHit");
  }


  function renderAlienHtml(color, altText = "Alien", extraClass = "", blinkDelay = 0.35, partDelay = 0) {
    const colorHex = color?.hex || "#ffc751";
    const safeBlinkDelay = clamp(Number(blinkDelay) || 0.35, 0.12, 1.4);
    const safePartDelay = clamp(Number(partDelay) || 0, -2, 0);

    if (alienSvgTemplate) {
      const staggeredSvg = alienSvgTemplate.replace(
        /begin="[^"]*"/g,
        `begin="${safeBlinkDelay.toFixed(2)}s"`
      );

      return `
            <div
              class="vinv-alien-svg ${extraClass}"
              role="img"
              aria-label="${escapeHtml(altText)}"
              style="--vinv-alien-color:${colorHex}; --vinv-part-delay:${safePartDelay.toFixed(2)}s;"
            >
              ${staggeredSvg}
            </div>
      `;
    }

    return `
            <img
              class="vinv-alien-img"
              src="${color.alienImg}"
              alt="${escapeHtml(color.alienAlt || altText)}"
              draggable="false"
            />
    `;
  }

  function renderIntro() {
    stopLoop();

    window.VerseGameShell.renderTitleScreen({
      app,
      title: GAME_TITLE,
      debugBadge: "",
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
        renderModeSelect();
      }
    });
  }

  function renderModeSelect() {
    stopLoop();

    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      icon: "🥉🥈🥇",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Verse Invaders title",
      onBack: () => {
        playUiTapSound();
        renderIntro();
      },
      onSelect: (mode) => {
        unlockAudio();
        playUiTapSound();
        startGame(mode);
      }
    });
  }

  function startGame(mode) {
    selectedMode = mode;
    completionMarked = false;
    completionResult = null;
    state.running = true;
    state.lastTs = 0;
    state.paused = false;
    state.pauseReason = "";
    state.buttonsLocked = false;
    state.activeLane = null;
    state.buttonColors = null;
    state.flashBadUntil = 0;
    state.buildShakeUntil = 0;
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.queue = buildData.segments;
    state.buildSizeClass = buildData.buildSizeClass;
    state.buildFitDone = false;
    state.builtCount = 0;
    state.phase = "words";
    state.streak = 0;
    state.mistakes = 0;
    state.wrongGuessesThisRound = 0;
    state.roundIndex = 0;
    state.entities = [];
    state.entityRenderSignature = "";
    state.rocket = null;
    state.trails = [];
    state.effects = [];
    state.roundStatus = "idle";
    state.scheduledActions = [];
    state.tutorialMode = false;
    state.tutorialMessageVisible = false;
    state.tutorialGoVisible = false;
    state.tutorialRenderSignature = "";
    state.bonusIntroMode = false;
    state.bonusIntroMessage = "";
    state.bonusIntroRenderSignature = "";
    state.bonusMode = false;
    state.bonusScore = 0;
    state.bonusCleanStreak = 0;
    state.bonusStartedAt = 0;
    state.bonusEndsAt = 0;
    state.bonusAutoTimer = 0;
    state.bonusSpawnCount = 0;
    state.bonusRockets = [];
    state.bonusFinished = false;
    state.bonusRevealVisible = false;
    state.bonusFinalScore = 0;
    state.bonusMaxMultiplier = 1;
    state.uiSoundFlip = false;
    state.roundSpeed = 0;

    app.innerHTML = `
      <div class="vinv-shell">
        <div class="vinv-stage">
          <div class="vinv-build-wrap">
            <div class="vinv-build vm-build vm-build--${BUILD_AREA}" id="vinvBuild">
              <div class="vinv-build-text vm-build-text" id="vinvBuildText"></div>
            </div>
          </div>

          <div class="vinv-field-wrap">
            <div class="vinv-field" id="vinvField">
              <img
                class="vinv-starfield"
                src="./verse_invaders_images/verse_invaders_starfield_twinkling.svg"
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              <div class="vinv-lanes" id="vinvLanes"></div>
              <div class="vinv-entities" id="vinvEntities"></div>
              <div class="vinv-rockets" id="vinvRockets"></div>
              <div class="vinv-effects" id="vinvEffects"></div>
              <div class="vinv-bottom" id="vinvBottom"></div>
              <div class="vinv-bonus" id="vinvBonus"></div>
              <div class="vinv-tutorial" id="vinvTutorial"></div>
              <div class="vinv-overlay-msg" id="vinvOverlay"></div>
              <div class="vinv-hud-overlay">
                <div class="vinv-corner-pill vinv-corner-left" id="vinvModePill"></div>
                <div class="vinv-corner-pill vinv-corner-right" id="vinvStreakPill"></div>
              </div>
            </div>

            <div class="vinv-controls" id="vinvControls">
              <button class="vinv-lane-btn" data-lane="left"></button>
              <button class="vinv-lane-btn" data-lane="center"></button>
              <button class="vinv-lane-btn" data-lane="right"></button>
            </div>
          </div>
        </div>

        ${renderHelpOverlay(helpHtml())}
        ${renderGameMenuOverlay()}
      </div>
    `;

    wireCommonNav();
    wireGameInput();
    recalcField();
    renderHud();
    renderStaticField();

    if (tutorialPlayedThisSession) {
      spawnRound();
    } else {
      startTutorialRound();
    }

    startLoop();
  }

  function renderHelpOverlay(body) {
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      body
    });
  }

  function renderGameMenuOverlay() {
    return window.VerseGameShell.gameMenuHtml({
      id: "vinvGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function helpHtml() {
    return `Tap a color button to shoot the alien of that color.<br><br>
      Shoot the next correct word of the verse until you finish it.<br><br>
      Then see how many aliens you can shoot down in the bonus round.`;
  }

  function wireCommonNav() {
    window.VerseGameShell.wireGameMenu({
      id: "vinvGameMenuOverlay",
      menuButtonId: "vinvModePill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        return muted;
      },
      onHowToPlay: () => {
        playUiTapSound();
        openHelpFromMenu();
      },
      onModeSelect: () => {
        playUiTapSound();
        setPaused(false, "");
        stopLoop();
        renderModeSelect();
      },
      onExit: () => {
        playUiTapSound();
        stopLoop();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => setPaused(true, "menu"),
      onClose: () => {
        playUiTapSound();
        setPaused(false, "");
      },
      onBackFromHelp: () => {
        playUiTapSound();
        setPaused(true, "menu");
      }
    });
  }

  function setPaused(paused, reason = "") {
    state.paused = paused;
    state.pauseReason = paused ? reason : "";
    if (!paused) {
      state.lastTs = performance.now();
    }
  }

  function openGameMenu() {
    const menuOverlay = document.getElementById("vinvGameMenuOverlay");
    if (menuOverlay) {
      setPaused(true, "menu");
      menuOverlay.classList.add("is-open");
      menuOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeGameMenu() {
    const menuOverlay = document.getElementById("vinvGameMenuOverlay");

    if (menuOverlay && menuOverlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    if (menuOverlay) {
      menuOverlay.classList.remove("is-open");
      menuOverlay.setAttribute("aria-hidden", "true");
    }

    const helpOverlay = document.getElementById("vinvHelpOverlay");
    if (!helpOverlay || !helpOverlay.classList.contains("is-open")) {
      setPaused(false, "");
    }
  }

  function openHelpFromMenu() {
    const menuOverlay = document.getElementById("vinvGameMenuOverlay");

    if (menuOverlay) menuOverlay.classList.remove("is-open");
    window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");

    setPaused(true, "help");
  }

  function closeHelpOverlay() {
    window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);
    setPaused(false, "");
  }

  function backToMenuFromHelp() {
    window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);

    const menuOverlay = document.getElementById("vinvGameMenuOverlay");
    if (menuOverlay) menuOverlay.classList.add("is-open");

    setPaused(true, "menu");
  }

  function wireGameInput() {
    if (!resizeHandlerBound) {
      window.addEventListener("resize", recalcField);
      resizeHandlerBound = true;
    }

    document.querySelectorAll(".vinv-lane-btn").forEach((btn) => {
      btn.onclick = () => handleColorPress(btn.dataset.lane);
    });

    window.onkeydown = (e) => {
      if (!state.running || state.paused) return;

      if (state.bonusRevealVisible) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          continueFromBonusReveal();
        }
        return;
      }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") handleColorPress("left");
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") handleColorPress("center");
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") handleColorPress("right");
    };
  }

  function recalcField() {
    const field = document.getElementById("vinvField");
    const controls = document.getElementById("vinvControls");
    if (!field) return;

    const fieldRect = field.getBoundingClientRect();
    state.fieldWidth = fieldRect.width;
    state.fieldHeight = fieldRect.height;
    state.scale = clamp(fieldRect.width / 390, 0.88, 1.45);

    if (controls) {
      const controlsRect = controls.getBoundingClientRect();
      state.controlsTopY = Math.max(0, controlsRect.top - fieldRect.top);
      state.bottomZoneY = Math.max(110, state.controlsTopY - 8);
    } else {
      state.controlsTopY = Math.max(180, state.fieldHeight - 90);
      state.bottomZoneY = Math.max(110, state.fieldHeight - 98);
    }

    const tutorialLayout = state.tutorialMode ? getTutorialLayout() : null;

    state.entities.forEach((entity) => {
      entity.x = getLaneCenterX(entity.lane);
      if (tutorialLayout) {
        entity.y = tutorialLayout.alienY;
      }
    });

    if (state.rocket) {
      state.rocket.x = getLaneCenterX(state.rocket.lane);
    }

    state.roundSpeed = getRoundSpeed();
    state.buildFitDone = false;

    renderStaticField();
    renderBuildArea();
    renderDynamic();
  }

  function renderStaticField() {
    const lanesEl = document.getElementById("vinvLanes");
    const bottomEl = document.getElementById("vinvBottom");
    if (!lanesEl || !bottomEl) return;

    lanesEl.innerHTML = LANE_KEYS.map((lane, index) => `
      <div class="vinv-lane" style="left:${index * 33.3333}%">
        <div class="vinv-lane-guide"></div>
      </div>
    `).join("");

    bottomEl.innerHTML = "";
  }

  function renderHud() {
    const modePill = document.getElementById("vinvModePill");
    const streakPill = document.getElementById("vinvStreakPill");

    if (modePill) {
      modePill.textContent = "☰";
      modePill.setAttribute("aria-label", "Game Menu");
      modePill.onclick = () => {
        playUiTapSound();
        openGameMenu();
      };
    }

    if (streakPill) {
      streakPill.classList.toggle("vinv-bonus-score-pill", state.bonusMode);

      if (state.bonusMode) {
        const multiplier = getBonusMultiplier();
        const multiplierHtml = multiplier > 1
          ? `<span class="vinv-bonus-score-multiplier is-x${multiplier}">${multiplier}x</span>`
          : "";

        streakPill.innerHTML = `
          <img
            class="vinv-bonus-score-icon"
            src="./verse_invaders_images/verse_invaders_alien_yellow.png"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <span class="vinv-bonus-score-value">${state.bonusScore}</span>
          ${multiplierHtml}
        `;
        streakPill.setAttribute("aria-label", `Bonus score ${state.bonusScore}${multiplier > 1 ? `, ${multiplier} times multiplier` : ""}`);
      } else {
        streakPill.textContent = `🔥 ${state.streak}`;
        streakPill.setAttribute("aria-label", `Streak ${state.streak}`);
      }
    }
    renderBuildArea();
    renderButtons();
  }

  function fitInvadersBuildText() {
    if (state.buildFitDone) return;

    requestAnimationFrame(() => {
      const build = document.getElementById("vinvBuild");
      const text = document.getElementById("vinvBuildText");

      if (!build || !text) return;

      const result = window.VerseGameShell.fitBuildTextOnce({
        buildEl: build,
        textEl: text,
        buildArea: BUILD_AREA
      });

      if (result) {
        state.buildFitDone = true;
      }
    });
  }

  function renderBuildArea() {
    const buildText = document.getElementById("vinvBuildText");
    const build = document.getElementById("vinvBuild");
    if (!buildText || !build) return;

    build.classList.toggle("is-shake", state.buildShakeUntil > performance.now());

    const buildRender = window.VerseGameShell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: parsedRef.book,
      reference: parsedRef.reference,
      progressIndex: state.builtCount,
      buildArea: BUILD_AREA,
      hideUnbuilt: selectedMode === "hard",
      extraClass: "vinv-build-text"
    });

    buildText.className = buildRender.className;
    buildText.innerHTML = buildRender.html;

    fitInvadersBuildText();
  }




  function renderButtons() {
    const buttons = document.querySelectorAll(".vinv-lane-btn");
    buttons.forEach((btn) => {
      const lane = btn.dataset.lane;
      const fixedColor = buttonLaneToColor(lane);
      btn.dataset.color = fixedColor.key;
      btn.textContent = "";
      btn.setAttribute("aria-label", fixedColor.key.toUpperCase());
      const shouldDim = state.activeLane && state.activeLane !== lane;
      btn.classList.toggle("is-dim", !!shouldDim);

      const needsMatchingAlien = !state.bonusMode && !hasVisibleEntityForColor(fixedColor.key);
      btn.disabled = state.buttonsLocked || needsMatchingAlien;
    });
  }

  function getTutorialAlienColors() {
    const fixedButtonColors = [
      BUTTON_COLOR_ORDER.left,
      BUTTON_COLOR_ORDER.center,
      BUTTON_COLOR_ORDER.right
    ];

    const shiftedLeft = [
      BUTTON_COLOR_ORDER.center,
      BUTTON_COLOR_ORDER.right,
      BUTTON_COLOR_ORDER.left
    ];

    const shiftedRight = [
      BUTTON_COLOR_ORDER.right,
      BUTTON_COLOR_ORDER.left,
      BUTTON_COLOR_ORDER.center
    ];

    return Math.random() < 0.5 ? shiftedLeft : shiftedRight;
  }


  function getTutorialLayout() {
    const unit = getAlienUnit();
    const gap = clamp(unit * 0.18, 10, 22);
    const cardHeight = clamp(state.fieldWidth * 0.24, 86, 126);
    const groupHeight = unit + gap + cardHeight;
    const desiredCenterY = state.fieldHeight * 0.48;
    const minTop = 18;
    const maxTop = Math.max(minTop, state.fieldHeight - groupHeight - 18);
    const groupTop = clamp(desiredCenterY - groupHeight / 2, minTop, maxTop);

    return {
      alienY: groupTop,
      cardY: groupTop + unit + gap + cardHeight / 2
    };
  }


  function startTutorialRound() {
    tutorialPlayedThisSession = true;
    state.tutorialMode = true;
    state.tutorialMessageVisible = true;
    state.tutorialGoVisible = false;
    state.tutorialRenderSignature = "";
    state.roundStatus = "tutorialEntering";
    state.buttonsLocked = true;
    state.activeLane = null;
    state.rocket = null;
    state.trails = [];
    state.effects = state.effects.filter(effect => effect.until > performance.now());
    state.scheduledActions = [];
    state.roundSpeed = 0;
    playGameSound("bonusStart");

    state.buttonColors = {
      left: BUTTON_COLOR_ORDER.left,
      center: BUTTON_COLOR_ORDER.center,
      right: BUTTON_COLOR_ORDER.right
    };

    const tutorialLayout = getTutorialLayout();
    const tutorialAlienColors = getTutorialAlienColors();

    state.entities = LANE_KEYS.map((lane, index) => {
      const color = tutorialAlienColors[index];

      return {
        id: `tutorial-${lane}`,
        lane,
        label: "",
        correct: true,
        color,
        x: getLaneCenterX(lane),
        y: tutorialLayout.alienY,
        visible: true,
        status: "hover",
        motionPhase: index * 1.9,
        blinkDelay: randBetween(0.12, 1.15),
        partDelay: randBetween(-1.8, 0)
      };
    });

    state.entityRenderSignature = "";
    renderHud();
    renderDynamic();

    scheduleAction(1120, () => {
      if (!state.tutorialMode) return;

      state.roundStatus = "tutorial";
      state.buttonsLocked = false;
      renderHud();
      renderDynamic();
    });
  }


  function spawnRound() {
    if (state.builtCount >= state.queue.length) {
      startBonusIntro();
      return;
    }

    state.roundIndex += 1;
    state.roundStatus = "falling";
    state.buttonsLocked = false;
    state.activeLane = null;
    state.wrongGuessesThisRound = 0;
    state.rocket = null;
    state.trails = [];
    state.effects = state.effects.filter(effect => effect.until > performance.now());
    state.scheduledActions = [];
    state.roundSpeed = getRoundSpeed();

    const correctLabel = state.queue[state.builtCount];
    state.phase = getCurrentPhase();
    const decoys = getDecoysForPhase(state.phase, correctLabel, 2);
    const labels = shuffle([correctLabel, ...decoys]);

    const shouldPickNewColors = selectedMode === "hard" || !state.buttonColors;
    const roundColors = shouldPickNewColors
      ? shuffle([...LANE_COLORS]).slice(0, 3)
      : LANE_KEYS.map(lane => state.buttonColors[lane]);

    const entityColors = shuffle([...roundColors]);
    const buttonColors = shouldPickNewColors
      ? shuffle([...roundColors])
      : LANE_KEYS.map(lane => state.buttonColors[lane]);

    state.buttonColors = {
      left: buttonColors[0],
      center: buttonColors[1],
      right: buttonColors[2]
    };

    state.entities = LANE_KEYS.map((lane, index) => {
      const label = labels[index];
      return {
        id: `entity-${state.roundIndex}-${lane}`,
        lane,
        label,
        correct: label === correctLabel,
        color: entityColors[index],
        x: getLaneCenterX(lane),
        y: -22 - index * 18,
        visible: true,
        status: "falling",
        motionPhase: Math.random() * Math.PI * 2,
        blinkDelay: randBetween(0.12, 1.15),
        partDelay: randBetween(-1.8, 0)
      };
    });
    state.entityRenderSignature = "";
    renderHud();
    renderDynamic();
  }

  function handleColorPress(buttonLane) {
    if (!state.running) return;
    if (state.buttonsLocked) return;

    if (state.bonusMode) {
      handleBonusColorPress(buttonLane);
      return;
    }

    const buttonColor = buttonLaneToColor(buttonLane);
    const target = state.entities.find(item => item.visible && item.color.key === buttonColor.key);
    if (!target) return;

    playGameSound("rocketLaunch");

    state.buttonsLocked = true;
    state.activeLane = buttonLane;

    const rocketStartX = getLaneCenterX(buttonLane);
    const rocketStartY = state.controlsTopY - 16;
    const rocketSpeed = Math.max(420, state.fieldHeight * 1.62);
    const targetPoint = getEntityHitPoint(target);
    const intercept = computeIntercept(
      rocketStartX,
      rocketStartY,
      targetPoint.x,
      targetPoint.y,
      0,
      state.roundSpeed,
      rocketSpeed
    );
    const dx = intercept.x - rocketStartX;
    const dy = intercept.y - rocketStartY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const flightTime = Math.max(0.08, distance / rocketSpeed);
    const vx = dx / flightTime;
    const vy = dy / flightTime;
    const angleDeg = Math.atan2(vy, vx) * 180 / Math.PI + 90;

    state.rocket = {
      lane: buttonLane,
      x: rocketStartX,
      y: rocketStartY,
      vx,
      vy,
      speed: rocketSpeed,
      targetId: target.id,
      targetColorKey: target.color.key,
      colorHex: buttonColor.hex,
      resolved: false,
      white: false,
      age: 0,
      maxAge: flightTime + 0.12,
      hitRadius: Math.max(28, 22 * state.scale),
      angleDeg
    };
    renderButtons();
  }

  function resolveRocketHit() {
    if (!state.rocket || state.rocket.resolved) return;
    state.rocket.resolved = true;
    const target = state.entities.find(item => item.id === state.rocket.targetId);
    if (!target || !target.visible) {
      unlockAfterDelay(260);
      return;
    }

    if (state.tutorialMode) {
      handleTutorialHit(target);
      return;
    }

    if (target.correct) handleCorrectHit(target);
    else handleWrongHit(target);
  }

  function handleTutorialHit(target) {
    if (!target || !target.visible) {
      unlockAfterDelay(180);
      return;
    }

    if (state.tutorialMessageVisible) {
      state.tutorialMessageVisible = false;
    }

    const targetPoint = getEntityHitPoint(target);
    playRandomBonusPopSound();
    addEffect(makeCorrectHitEffect(targetPoint.x, target.y + 22, target.color.hex, 1));

    target.visible = false;
    state.rocket = null;
    state.buttonsLocked = false;
    state.activeLane = null;

    renderHud();
    renderDynamic();

    const tutorialDone = !state.entities.some(item => item.visible);

    if (tutorialDone) {
      state.buttonsLocked = true;
      state.activeLane = null;

      scheduleAction(720, () => {
        if (!state.tutorialMode) return;

        state.tutorialGoVisible = true;
        state.tutorialMessageVisible = false;
        state.tutorialRenderSignature = "";
        renderDynamic();
      });

      scheduleAction(2300, () => {
        state.tutorialMode = false;
        state.tutorialMessageVisible = false;
        state.tutorialGoVisible = false;
        state.tutorialRenderSignature = "";
        state.entities = [];
        state.entityRenderSignature = "";
        state.rocket = null;
        state.trails = [];
        state.buttonColors = null;
        spawnRound();
      });
    }
  }


  function handleWrongHit(target) {
    state.streak = 0;
    state.mistakes += 1;
    state.wrongGuessesThisRound += 1;
    state.flashBadUntil = performance.now() + 260;
    state.buildShakeUntil = performance.now() + 280;
    state.overlayMessage = state.wrongGuessesThisRound >= 2 ? "Too many wrong guesses!" : "Wrong color!";
    state.overlayUntil = performance.now() + 420;
    target.visible = false;
    playGameSound("wrongHit");
    const targetPoint = getEntityHitPoint(target);
    addEffect(makePoofEffect(targetPoint.x, target.y + 28));
    renderHud();
    renderDynamic();

    if (state.wrongGuessesThisRound >= 2) {
      state.buttonsLocked = true;
      state.activeLane = null;
      scheduleAction(ROUND_CLEAR_FADE_MS, () => {
        state.entities.forEach(item => {
          if (item.visible) item.status = "fade";
        });
        renderDynamic();
      });
      scheduleAction(ROUND_ADVANCE_AFTER_TWO_WRONGS_MS, () => {
        state.entities.forEach(item => { item.visible = false; });
        spawnRound();
      });
    } else {
      unlockAfterDelay(320);
    }
  }

  function handleCorrectHit(target) {
    state.streak += 1;
    state.buttonsLocked = true;
    renderDynamic();

    scheduleAction(CORRECT_HIT_IMPACT_DELAY_MS, () => {
      const targetPoint = getEntityHitPoint(target);
      playRandomBonusPopSound();
      addEffect(makeCorrectHitEffect(targetPoint.x, target.y + 22, target.color.hex, state.streak));
      showStreakMilestone(state.streak);
      target.visible = false;

      state.entities.forEach(item => {
        if (item.id !== target.id && item.visible) {
          item.status = "crtVanish";
        }
      });

      state.builtCount += 1;
      renderHud();
      renderDynamic();
    });

    scheduleAction(ROUND_ADVANCE_AFTER_CORRECT_MS, () => {
      if (state.builtCount >= state.queue.length) startBonusIntro();
      else spawnRound();
    });
  }

  function showStreakMilestone(streak) {
    const config = STREAK_MILESTONE_CONFIG[streak];
    if (!config || state.bonusMode || state.tutorialMode) return;

    const x = state.fieldWidth / 2;
    const y = clamp(state.bottomZoneY / 2, 118, Math.max(118, state.bottomZoneY - 80));
    playGameSound(`streak${streak}`, `streak${streak}`);

    if (config.burst) {
      addEffect(makeStreakMilestoneBurstEffect(x, y));
    }

    addEffect(makeStreakMilestonePopupEffect(x, y, streak, config));
  }

  function makeStreakMilestonePopupEffect(x, y, streak, config) {
    const born = performance.now();
    const life = 980;

    return {
      kind: "streakMilestone",
      x,
      y,
      streak,
      tone: config.tone,
      bg: config.bg,
      textColor: config.text,
      rainbow: config.rainbow,
      born,
      life,
      until: born + life
    };
  }

  function makeStreakMilestoneBurstEffect(x, y) {
    const born = performance.now();
    const unit = getAlienUnit();
    const life = 1050;
    const count = 34;
    const palette = ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6", "#ffffff"];
    const styles = ["dot", "star", "shard", "confetti", "petal"];

    const particles = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i / count) + randBetween(-0.16, 0.16);
      const distanceScale = unit / 42;

      return {
        angle,
        speed: randBetween(160, 310) * distanceScale,
        size: randBetween(7, 15) * distanceScale,
        color: randomFrom(palette),
        alpha: randBetween(0.82, 1),
        gravity: randBetween(4, 10),
        drift: randBetween(-16, 16),
        style: randomFrom(styles),
        spin: randBetween(-360, 360)
      };
    });

    return {
      kind: "particle",
      group: "hit",
      preset: "streakRainbowBurst",
      x,
      y,
      born,
      life,
      until: born + life,
      particles,
      ring: 0,
      center: 0,
      flash: true,
      shell: false,
      cross: false
    };
  }


  function handleBottomMiss(target) {
    state.streak = 0;
    state.mistakes += 1;
    state.buttonsLocked = true;
    state.activeLane = null;
    state.overlayMessage = "Abducted!";
    state.overlayUntil = performance.now() + 720;
    state.flashBadUntil = performance.now() + 260;
    state.buildShakeUntil = performance.now() + 280;

    state.entities.forEach(item => {
      item.visible = false;
    });
    state.entityRenderSignature = "";

    const targetPoint = getEntityHitPoint(target);

    scheduleAction(ABDUCTION_LIFE_MS * 0.16, () => {
      playGameSound("abduction");
    });

    addEffect(makeAbductionEffect(targetPoint.x, state.bottomZoneY - 12, target.color, () => {
      spawnRound();
    }));

    renderHud();
    renderDynamic();
  }

  function unlockAfterDelay(ms) {
    scheduleAction(ms, () => {
      state.buttonsLocked = false;
      state.activeLane = null;
      state.rocket = null;
      renderButtons();
    });
  }

  function startBonusIntro() {
    if (state.bonusIntroMode || state.bonusMode) return;

    state.bonusIntroMode = true;
    state.bonusIntroMessage = "Shoot the aliens!";
    state.bonusIntroRenderSignature = "";
    state.buttonsLocked = true;
    state.activeLane = null;
    state.entities = [];
    state.entityRenderSignature = "";
    state.rocket = null;
    state.trails = [];
    state.effects = state.effects.filter(effect => effect.until > performance.now());

    renderHud();
    renderDynamic();

    scheduleAction(120, () => {
      if (state.bonusIntroMode) playGameSound("bonusStart");
    });

    scheduleAction(2000, () => {
      if (!state.bonusIntroMode) return;

      state.bonusIntroMessage = "Go!";
      state.bonusIntroRenderSignature = "";
      renderDynamic();
    });

    scheduleAction(3300, () => {
      if (!state.bonusIntroMode) return;

      state.bonusIntroMode = false;
      state.bonusIntroMessage = "";
      state.bonusIntroRenderSignature = "";
      startBonusRound();
    });
  }


  async function startBonusRound() {
    if (state.bonusMode) return;

    const now = performance.now();

    state.bonusIntroMode = false;
    state.bonusIntroMessage = "";
    state.bonusIntroRenderSignature = "";
    state.bonusMode = true;
    state.buttonsLocked = false;
    state.activeLane = null;
    state.entities = [];
    state.entityRenderSignature = "";
    state.rocket = null;
    state.trails = [];
    state.effects = state.effects.filter(effect => effect.until > now);
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.bonusScore = 0;
    state.bonusCleanStreak = 0;
    state.bonusStartedAt = now;
    state.bonusEndsAt = now + BONUS_SWARM_DURATION_MS;
    state.bonusAutoTimer = 0.18;
    state.bonusSpawnCount = 0;
    state.bonusRockets = [];
    state.bonusFinished = false;
    state.bonusRevealVisible = false;
    state.bonusFinalScore = 0;
    state.bonusMaxMultiplier = 1;

    spawnBonusAlien();
    renderHud();
    renderDynamic();


  }

  function handleBonusColorPress(buttonLane) {
    if (state.bonusFinished) return;

    const buttonColor = buttonLaneToColor(buttonLane);
    const target = getBonusTargetForColor(buttonColor.key);

    if (!target) {
      applyBonusPenalty(getLaneCenterX(buttonLane), state.controlsTopY - 18);
      return;
    }

    target.locked = true;
    playGameSound("rocketLaunch");

    const rocketStartX = getLaneCenterX(buttonLane);
    const rocketStartY = state.controlsTopY - 16;
    const targetPoint = getEntityHitPoint(target);
    const rocketSpeed = Math.max(620, state.fieldHeight * 2.15);
    const dx = targetPoint.x - rocketStartX;
    const dy = targetPoint.y - rocketStartY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const flightTime = clamp(distance / rocketSpeed, 0.08, 0.36);

    state.bonusRockets.push({
      id: `bonus-rocket-${Date.now()}-${Math.random()}`,
      lane: buttonLane,
      targetId: target.id,
      x: rocketStartX,
      y: rocketStartY,
      vx: dx / flightTime,
      vy: dy / flightTime,
      age: 0,
      maxAge: flightTime,
      colorHex: buttonColor.hex
    });

    renderDynamic();
  }

  function getBonusTargetForColor(colorKey) {
    return state.entities.find(item =>
      item.visible &&
      !item.locked &&
      item.status === "bonus" &&
      item.color.key === colorKey
    );
  }

  function updateBonusSwarm(dt, ts) {
    if (state.bonusFinished) return;

    if (ts >= state.bonusEndsAt) {
      finishBonusRound();
      return;
    }

    state.bonusAutoTimer -= dt;
    if (state.bonusAutoTimer <= 0) {
      spawnBonusAlien();
      state.bonusAutoTimer = getBonusSpawnIntervalSec();
    }

    const fallSpeed = getBonusFallSpeed();

    state.entities.forEach((entity) => {
      if (!entity.visible || entity.status !== "bonus") return;

      entity.y += fallSpeed * dt;

      if (entity.y >= state.bottomZoneY - 48) {
        handleBonusAbduction(entity);
      }
    });

    state.bonusRockets.forEach((rocket) => {
      rocket.age += dt;
      rocket.x += rocket.vx * dt;
      rocket.y += rocket.vy * dt;
      addTrail(rocket.x, rocket.y + 16, rocket.colorHex);

      if (rocket.age >= rocket.maxAge) {
        rocket.done = true;
        resolveBonusRocketHit(rocket);
      }
    });

    state.bonusRockets = state.bonusRockets.filter(rocket => !rocket.done);
    state.entities = state.entities.filter(entity => entity.visible || entity.locked);

    renderHud();
  }

  function spawnBonusAlien() {
    const colors = getBonusAvailableSpawnColors();
    const lanes = getBonusAvailableSpawnLanes();
    if (!colors.length || !lanes.length) return;

    const safeOptions = [];
    const fallbackOptions = [];

    colors.forEach((color) => {
      lanes.forEach((lane) => {
        const option = { color, lane };
        fallbackOptions.push(option);

        if (buttonLaneToColor(lane).key !== color.key) {
          safeOptions.push(option);
        }
      });
    });

    const choice = randomFrom(safeOptions.length ? safeOptions : fallbackOptions);
    const color = choice.color;
    const lane = choice.lane;
    const index = state.bonusSpawnCount++;

    state.entities.push({
      id: `bonus-${index}-${Date.now()}`,
      lane,
      label: "",
      correct: true,
      color,
      x: getLaneCenterX(lane),
      y: -getAlienUnit() * randBetween(0.45, 0.9),
      visible: true,
      locked: false,
      status: "bonus",
      motionPhase: Math.random() * Math.PI * 2,
      blinkDelay: randBetween(0.12, 1.15),
      partDelay: randBetween(-1.8, 0)
    });

    state.entityRenderSignature = "";
  }

  function getBonusAvailableSpawnColors() {
    const buttonColors = LANE_KEYS.map(lane => buttonLaneToColor(lane));
    const used = new Set(
      state.entities
        .filter(entity =>
          entity.visible &&
          (entity.status === "bonus" || entity.status === "bonusTargeted")
        )
        .map(entity => entity.color.key)
    );

    return buttonColors.filter(color => !used.has(color.key));
  }

  function getBonusAvailableSpawnLanes() {
    const used = new Set(
      state.entities
        .filter(entity =>
          entity.visible &&
          (entity.status === "bonus" || entity.status === "bonusTargeted")
        )
        .map(entity => entity.lane)
    );

    return LANE_KEYS.filter(lane => !used.has(lane));
  }

  function resolveBonusRocketHit(rocket) {
    const target = state.entities.find(entity => entity.id === rocket.targetId);

    if (!target || !target.visible) return;

    const targetPoint = getEntityHitPoint(target);
    target.visible = false;
    target.locked = false;

    const previousMultiplier = getBonusMultiplier();

    state.bonusCleanStreak += 1;
    const multiplier = getBonusMultiplier();
    const points = multiplier;

    playRandomBonusPopSound();

    if (multiplier > previousMultiplier) {
      playGameSound("bonusMultiplierUp");
    }

    state.bonusMaxMultiplier = Math.max(state.bonusMaxMultiplier, multiplier);
    state.bonusScore += points;
    addEffect(makeCorrectHitEffect(targetPoint.x, target.y + 22, target.color.hex, state.bonusCleanStreak));
    addEffect(makeScorePopupEffect(targetPoint.x, target.y + 8, `+${points}`, "plus"));

    state.entityRenderSignature = "";
    renderHud();
  }

  function handleBonusAbduction(entity) {
    if (!entity || !entity.visible) return;

    entity.visible = false;
    entity.locked = false;

    const targetPoint = getEntityHitPoint(entity);
    addEffect(makeAbductionEffect(targetPoint.x, state.bottomZoneY - 12, entity.color));
    applyBonusPenalty(targetPoint.x, state.bottomZoneY - 34);

    state.entityRenderSignature = "";
  }

  function applyBonusPenalty(x, y) {
    playGameSound("bonusPenalty");

    state.bonusScore -= 1;
    state.bonusCleanStreak = 0;
    addEffect(makeScorePopupEffect(x, y, "-1", "minus"));
    renderHud();
  }

  function getBonusMultiplier() {
    if (state.bonusCleanStreak >= 10) return 3;
    if (state.bonusCleanStreak >= 5) return 2;
    return 1;
  }

  function getBonusProgress() {
    if (!state.bonusStartedAt || !state.bonusEndsAt) return 0;
    return clamp((performance.now() - state.bonusStartedAt) / BONUS_SWARM_DURATION_MS, 0, 1);
  }

  function getBonusSpawnIntervalSec() {
    const progress = getBonusProgress();
    const baseInterval = BONUS_SPAWN_START_SEC + (BONUS_SPAWN_END_SEC - BONUS_SPAWN_START_SEC) * progress;
    const modeMultiplier = BONUS_MODE_SPEED_MULTIPLIERS[selectedMode] || 1;

    return baseInterval / modeMultiplier;
  }

  function getBonusFallSpeed() {
    const progress = getBonusProgress();
    const rampMultiplier = BONUS_SPEED_START_MULTIPLIER +
      (BONUS_SPEED_END_MULTIPLIER - BONUS_SPEED_START_MULTIPLIER) * progress;
    const modeMultiplier = BONUS_MODE_SPEED_MULTIPLIERS[selectedMode] || 1;

    return getHardBaselineSpeed() * rampMultiplier * modeMultiplier;
  }

  function getHardBaselineSpeed() {
    const usableDistance = Math.max(180, state.bottomZoneY + 28);
    const hardCfg = state.modeTiming.hard;
    const roundSeconds = clamp(
      hardCfg.start,
      2.2,
      5.4
    );

    return usableDistance / roundSeconds;
  }

  function finishBonusRound() {
    state.bonusFinished = true;
    state.bonusRevealVisible = true;
    state.bonusFinalScore = state.bonusScore;
    state.buttonsLocked = true;
    state.activeLane = null;
    state.entities = [];
    state.entityRenderSignature = "__force_bonus_reveal_clear__";
    state.bonusRockets = [];
    state.trails = [];
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.tutorialRenderSignature = "";
    state.bonusIntroRenderSignature = "";
    playGameSound("bonusReveal");
    renderHud();
    renderDynamic();
  }

  async function markGameComplete() {
    if (completionMarked) return completionResult;

    completionMarked = true;

    try {
      completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: selectedMode,
        stats: {
          streak: state.streak,
          mistakes: state.mistakes,
          builtCount: state.builtCount,
          bonusScore: state.bonusFinalScore,
          bonusCleanStreak: state.bonusCleanStreak,
          bonusMaxMultiplier: state.bonusMaxMultiplier
        }
      });
    } catch (err) {
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

    return completionResult;
  }


  async function continueFromBonusReveal() {
    if (!state.bonusRevealVisible) return;

    playUiTapSound();

    state.bonusRevealVisible = false;
    state.bonusMode = false;
    state.buttonsLocked = true;

    const tutorialEl = document.getElementById("vinvTutorial");
    if (tutorialEl) {
      tutorialEl.classList.remove("is-bonus-reveal");
      tutorialEl.innerHTML = "";
    }

    await markGameComplete();
    renderVictory();
  }

  function renderVictory() {
    stopLoop();

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
      gameMessage: "",
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: () => {
        playUiTapSound();
        renderModeSelect();
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

  function loop(ts) {
    if (!state.running && !state.bonusMode) return;
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.032, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    if (!state.paused) {
      updateGame(dt, ts);
    }

    renderDynamic();
    state.rafId = requestAnimationFrame(loop);
  }

  function updateGame(dt, ts) {
    completeExpiredEffects(ts);
    state.effects = state.effects.filter(effect => effect.until > ts);
    state.trails = state.trails.filter(trail => trail.until > ts);
    processScheduledActions(ts);

    if (state.buildShakeUntil && ts > state.buildShakeUntil) {
      state.buildShakeUntil = 0;
      renderHud();
    }

    if (!state.bonusMode) {
      const speed = state.roundSpeed;
      for (const entity of state.entities) {
        if (!entity.visible || entity.status !== "falling") continue;
        entity.y += speed * dt;
        if (entity.correct && entity.y >= state.bottomZoneY - 48) {
          handleBottomMiss(entity);
          break;
        }
      }

      if (state.rocket) {
        state.rocket.age += dt;
        state.rocket.x += state.rocket.vx * dt;
        state.rocket.y += state.rocket.vy * dt;
        addTrail(state.rocket.x, state.rocket.y + 18, state.rocket.colorHex);

        const target = state.entities.find(item => item.id === state.rocket.targetId && item.visible);
        if (!target) {
          state.rocket = null;
          unlockAfterDelay(220);
        } else {
          const targetPoint = getEntityHitPoint(target, ts);
          const dx = targetPoint.x - state.rocket.x;
          const dy = targetPoint.y - state.rocket.y;
          if (Math.hypot(dx, dy) <= state.rocket.hitRadius || state.rocket.age >= state.rocket.maxAge) {
            resolveRocketHit();
            state.rocket = null;
          }
        }
      }
    } else {
      updateBonusSwarm(dt, ts);
    }
  }

  function renderDynamic() {
    const entitiesEl = document.getElementById("vinvEntities");
    const rocketsEl = document.getElementById("vinvRockets");
    const effectsEl = document.getElementById("vinvEffects");
    const bonusEl = document.getElementById("vinvBonus");
    const tutorialEl = document.getElementById("vinvTutorial");
    const overlayEl = document.getElementById("vinvOverlay");
    const field = document.getElementById("vinvField");
    if (!entitiesEl || !rocketsEl || !effectsEl || !overlayEl || !field || !bonusEl || !tutorialEl) return;

    const now = performance.now();
    field.classList.toggle("is-flash-bad", state.flashBadUntil > now);

    const entityRenderSignature = getEntityRenderSignature();

    if (state.entityRenderSignature !== entityRenderSignature) {
      entitiesEl.innerHTML = state.entities.map((entity) => renderEntityHtml(entity, now)).join("");
      state.entityRenderSignature = entityRenderSignature;
    }

    updateEntityElements(entitiesEl, now);

    rocketsEl.innerHTML = `
      ${state.rocket ? `
        <div
          class="vinv-shot-core"
          style="left:${state.rocket.x}px; top:${state.rocket.y}px; --vinv-shot-color:${state.rocket.colorHex || "#ffffff"};"
        ></div>
      ` : ""}

      ${state.trails.map(trail => `
        <div
          class="vinv-shot-trail-dot ${trail.white ? "white" : ""}"
          style="
            left:${trail.x}px;
            top:${trail.y}px;
            width:${trail.size}px;
            height:${trail.size}px;
            opacity:${trail.opacity};
            --vinv-shot-color:${trail.colorHex};
          "
        ></div>
      `).join("")}

      ${state.bonusRockets.map(rocket => `
        <div
          class="vinv-shot-core vinv-shot-core--bonus"
          style="left:${rocket.x}px; top:${rocket.y}px; --vinv-shot-color:${rocket.colorHex || "#ffffff"};"
        ></div>
      `).join("")}


    `;

    effectsEl.innerHTML = state.effects.map((effect) => renderEffect(effect, now)).join("");

    bonusEl.innerHTML = "";
    tutorialEl.classList.toggle("is-bonus-reveal", state.bonusRevealVisible);
    overlayEl.classList.remove("is-bonus-reveal");

    if (state.bonusRevealVisible) {
      if (!tutorialEl.querySelector(".vinv-bonus-reveal")) {
        tutorialEl.innerHTML = renderBonusRevealHtml();
      }

      const revealCard = tutorialEl.querySelector(".vinv-bonus-reveal");
      if (revealCard) {
        revealCard.onclick = continueFromBonusReveal;
      }
    } else if (state.tutorialMode) {
      renderTutorialLayer(tutorialEl);
    } else {
      renderBonusIntroLayer(tutorialEl);
    }

    overlayEl.innerHTML = state.overlayUntil > now && state.overlayMessage
      ? `<div class="vinv-overlay-pill">${escapeHtml(state.overlayMessage)}</div>`
      : "";
  }

  function renderBonusRevealHtml() {
    return `
      <button class="vinv-bonus-reveal" type="button" aria-label="Bonus score ${state.bonusFinalScore}. Tap to continue.">
        <div class="vinv-bonus-reveal-title">Bonus Score!</div>

        <div class="vinv-bonus-reveal-row">
          <img
            class="vinv-bonus-reveal-alien"
            src="./verse_invaders_images/verse_invaders_alien_yellow.png"
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <span class="vinv-bonus-reveal-times">×</span>
          <span class="vinv-bonus-reveal-score">${state.bonusFinalScore}</span>
        </div>

        <div class="vinv-bonus-reveal-prompt">Tap to continue</div>
      </button>
    `;
  }


  function renderTutorialLayer(tutorialEl) {
    if (!state.tutorialMode) {
      if (state.tutorialRenderSignature !== "off") {
        tutorialEl.innerHTML = "";
        state.tutorialRenderSignature = "off";
      }
      return;
    }

    const tutorialLayout = getTutorialLayout();
    const cardY = tutorialLayout.cardY.toFixed(1);
    const isHidden = state.tutorialMessageVisible ? "" : "is-hidden";
    const isEntering = state.roundStatus === "tutorialEntering" ? "is-entering" : "";
    const goVisible = state.tutorialGoVisible ? "go" : "no-go";
    const signature = `${cardY}:${isHidden}:${isEntering}:${goVisible}`;

    if (state.tutorialRenderSignature === signature) return;

    state.tutorialRenderSignature = signature;

    if (state.tutorialGoVisible) {
      tutorialEl.innerHTML = `
        <div class="vinv-tutorial-go">
          Go!
        </div>
      `;
      return;
    }

    tutorialEl.innerHTML = `
      <div
        class="vinv-tutorial-card ${isHidden} ${isEntering}"
        style="top:${cardY}px;"
      >
        Tap the buttons to shoot the aliens.
      </div>
    `;
  }

  function renderBonusIntroLayer(introEl) {
    if (!state.bonusIntroMode) {
      if (state.bonusIntroRenderSignature !== "off") {
        introEl.innerHTML = "";
        state.bonusIntroRenderSignature = "off";
      }
      return;
    }

    const message = state.bonusIntroMessage || "";
    const signature = `bonus-intro:${message}`;

    if (state.bonusIntroRenderSignature === signature) return;

    state.bonusIntroRenderSignature = signature;

    if (message === "Go!") {
      introEl.innerHTML = `
        <div class="vinv-tutorial-go vinv-bonus-intro-go">
          Go!
        </div>
      `;
      return;
    }

    introEl.innerHTML = `
      <div class="vinv-tutorial-card vinv-bonus-intro-card">
        ${escapeHtml(message)}
      </div>
    `;
  }



  function getEntityRenderSignature() {
    return state.entities.map((entity) => {
      return `${entity.id}:${entity.color.key}:${entity.label}:${entity.blinkDelay}:${entity.partDelay}`;
    }).join("|");
  }

  function getEntityClassName(entity) {
    if (state.tutorialMode && state.roundStatus === "tutorialEntering" && entity.id.startsWith("tutorial-")) {
      return "is-tutorial-enter";
    }

    if (entity.status === "bonus" || entity.status === "bonusTargeted") return "is-bonus-alien";

    if (entity.status === "fade") return "is-fade";
    if (entity.status === "correct") return "is-correct-pause";
    if (entity.status === "crtVanish") return "is-crt-vanish";
    return "";
  }

  function getEntityStyle(entity, now = performance.now()) {
    const hidden = entity.visible ? "" : "opacity:0;";
    const motion = getEntityMotionState(entity, now);

    return `
      left:${entity.x}px;
      top:${entity.y}px;
      ${hidden}
      transform:translate(calc(-50% + ${motion.swayX.toFixed(1)}px), 0)
        rotate(${motion.rotateDeg.toFixed(2)}deg)
        skewX(${motion.skewXDeg.toFixed(2)}deg)
        scale(${motion.scaleX.toFixed(3)}, ${motion.scaleY.toFixed(3)});
    `;
  }

  function renderEntityHtml(entity, now = performance.now()) {
    const className = getEntityClassName(entity);

    return `
        <div
          class="vinv-entity ${className}"
          data-entity-id="${escapeHtml(entity.id)}"
          style="${getEntityStyle(entity, now)}"
        >
          <div class="vinv-alien">
            ${renderAlienHtml(entity.color, entity.color.alienAlt, "", entity.blinkDelay, entity.partDelay)}
          </div>
          <div class="vinv-word" style="color:${entity.color.hex}">${escapeHtml(entity.label)}</div>
        </div>
    `;
  }

  function updateEntityElements(entitiesEl, now = performance.now()) {
    state.entities.forEach((entity) => {
      const entityEl = entitiesEl.querySelector(`[data-entity-id="${entity.id}"]`);
      if (!entityEl) return;

      const className = getEntityClassName(entity);
      entityEl.className = className ? `vinv-entity ${className}` : "vinv-entity";
      entityEl.setAttribute("style", getEntityStyle(entity, now));
    });
  }

  function getCurrentPhase() {
    return window.VerseGameShell.getPhaseForProgress({
      progressIndex: state.builtCount,
      wordCount: verseWords.length,
      totalSegments: state.queue.length,
      bookLabel: buildData.bookLabel,
      referenceLabel: buildData.referenceLabel
    });
  }

  function getDecoysForPhase(phase, correctLabel, count) {
    const out = [];
    const seen = new Set([normalizeWord(correctLabel)]);

    function addDecoys(list) {
      for (const item of list || []) {
        const key = normalizeWord(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        if (out.length >= count) break;
      }
    }

    if (phase === "words") {
      if (selectedMode === "easy") {
        addDecoys(window.VerseGameShell.getFunWordDecoys(correctLabel, verseWords, count));
      } else {
        addDecoys(window.VerseGameShell.getVerseWordDecoys({
          words: verseWords,
          correct: correctLabel,
          targetIndex: state.builtCount,
          count,
          avoidNext: 2,
          fallbackToFun: true
        }));

        if (out.length < count) {
          addDecoys(window.VerseGameShell.getFunWordDecoys(correctLabel, verseWords, count));
        }

        if (out.length < count) {
          addDecoys(FUN_DECOYS);
        }
      }
    }

    if (phase === "book") {
      addDecoys(window.VerseGameShell.getBookDecoys(correctLabel, count));
    }

    if (phase === "reference") {
      addDecoys(window.VerseGameShell.getReferenceDecoys(parsedRef, selectedMode, count + 4));
    }

    return out.slice(0, count);
  }

  function getRoundSpeed() {
    const usableDistance = Math.max(180, state.bottomZoneY + 28);
    const cfg = state.modeTiming[selectedMode] || state.modeTiming.easy;
    const streakRamp = Math.max(0, state.streak);
    const roundSeconds = clamp(cfg.start + streakRamp * cfg.step, 2.2, 5.4);

    return usableDistance / roundSeconds;
  }

  function getBonusShots() {
    const max = 12;
    const penalty = Math.min(8, state.mistakes);
    return Math.max(4, max - penalty);
  }

  function getLaneCenterX(lane) {
    const index = LANE_KEYS.indexOf(lane);
    return state.fieldWidth * ((index + 0.5) / 3);
  }

  function getEntityMotionState(entity, now = performance.now()) {
    const phase = entity.motionPhase || 0;
    const sway = Math.sin(now * 0.0032 + phase) * 18;
    const pulse = Math.sin(now * 0.0044 + phase * 0.7);

    return {
      swayX: sway,
      renderX: entity.x + sway,
      rotateDeg: Math.sin(now * 0.0032 + phase) * 4.5,
      skewXDeg: Math.sin(now * 0.0032 + phase) * 3.5,
      scaleX: 1 + pulse * 0.035,
      scaleY: 1 - pulse * 0.035
    };
  }

  function getEntityHitPoint(entity, now = performance.now()) {
    const motion = getEntityMotionState(entity, now);
    return {
      x: motion.renderX,
      y: entity.y + 40
    };
  }

  function laneLabel(lane) {
    if (lane === "left") return "LEFT";
    if (lane === "center") return "CENTER";
    return "RIGHT";
  }

  function buttonLaneToColor(lane) {
    return state.buttonColors?.[lane] || BUTTON_COLOR_ORDER[lane] || BUTTON_COLOR_ORDER.left;
  }

  function hasVisibleEntityForColor(colorKey) {
    return state.entities.some(item => item.visible && item.color.key === colorKey);
  }

  function computeIntercept(sx, sy, tx, ty, tvx, tvy, projectileSpeed) {
    const rx = tx - sx;
    const ry = ty - sy;
    const a = (tvx * tvx + tvy * tvy) - (projectileSpeed * projectileSpeed);
    const b = 2 * (rx * tvx + ry * tvy);
    const c = (rx * rx + ry * ry);

    let t = null;
    if (Math.abs(a) < 0.0001) {
      if (Math.abs(b) > 0.0001) t = -c / b;
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const root = Math.sqrt(disc);
        const t1 = (-b - root) / (2 * a);
        const t2 = (-b + root) / (2 * a);
        const candidates = [t1, t2].filter(v => Number.isFinite(v) && v > 0);
        if (candidates.length) t = Math.min(...candidates);
      }
    }

    if (!Number.isFinite(t) || t <= 0) t = Math.max(0.12, Math.hypot(rx, ry) / projectileSpeed);
    t = clamp(t, 0.12, 1.35);

    return { x: tx + tvx * t, y: ty + tvy * t, t };
  }

  function parseReferenceParts(ref, translation, verseId) {
    return window.VerseGameShell.parseReferenceParts(ref, translation, verseId);
  }


  function tokenizeVerse(text) {
    return window.VerseGameShell.tokenizeVerseWords(text);
  }

  function normalizeWord(value) {
    return window.VerseGameShell.normalizeWord(value);
  }

  function getAlienUnit() {
    const width = state.fieldWidth || window.innerWidth || 390;
    return clamp(width * 0.15, 62, 118);
  }

  function addTrail(x, y, colorHex = "#ffffff", white = false) {
    const unit = getAlienUnit();
    const baseColor = colorHex || "#ffffff";
    const colorChoices = white
      ? ["#ffffff", baseColor, lightenColor(baseColor, 0.18)]
      : [baseColor, lightenColor(baseColor, 0.18), lightenColor(baseColor, 0.34)];

    state.trails.push({
      x: x + randBetween(unit * -0.035, unit * 0.035),
      y: y + randBetween(unit * -0.035, unit * 0.045),
      colorHex: randomFrom(colorChoices),
      size: randBetween(unit * 0.06, unit * 0.13),
      opacity: white ? randBetween(0.48, 0.78) : randBetween(0.54, 0.9),
      white: !!white,
      until: performance.now() + randBetween(190, 290)
    });

    if (state.trails.length > 42) state.trails.shift();
  }

  function addEffect(effect) {
    state.effects.push(effect);
    if (state.effects.length > 70) state.effects.shift();
  }

  function makeScorePopupEffect(x, y, text, tone) {
    const born = performance.now();
    const life = 820;

    return {
      kind: "scorePopup",
      x,
      y,
      text,
      tone,
      born,
      life,
      until: born + life
    };
  }


  function makePoofEffect(x, y) {
    const born = performance.now();
    const unit = getAlienUnit();
    const life = POOF_LIFE_MS;
    const count = 9;
    const baseAngle = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / count;
    const distance = unit * 0.61;
    const jitter = unit * 0.06;
    const sizePool = [
      unit * 0.09,
      unit * 0.105,
      unit * 0.125,
      unit * 0.15,
      unit * 0.175
    ];

    const dots = Array.from({ length: count }, (_, i) => {
      const angle = baseAngle + step * i + randBetween(-0.12, 0.12);
      const dist = distance + randBetween(-jitter, jitter);

      return {
        angle,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        size: randomFrom(sizePool) + randBetween(-0.5, 0.5),
        startScale: randBetween(0.68, 0.82),
        endScale: randBetween(1.1, 1.22),
        delay: randBetween(0, 18),
        color: "#ffffff"
      };
    });

    return {
      kind: "poof",
      x,
      y,
      born,
      life,
      until: born + life + POOF_EXTRA_FADE_MS,
      cloudSize: unit * 0.79,
      dots
    };
  }

  function makeCorrectHitEffect(x, y, baseColor, streak) {
    return makeAlienBurstEffect(x, y, baseColor, streak);
  }

  function makeAlienBurstEffect(x, y, baseColor, streak) {
    const born = performance.now();
    const unit = getAlienUnit();
    const strong = streak >= 4;
    const life = strong ? STRONG_ALIEN_BURST_LIFE_MS : ALIEN_BURST_LIFE_MS;
    const chunkCount = strong ? 16 : 12;
    const sparkCount = strong ? 7 : 5;
    const palette = [
      baseColor,
      lightenColor(baseColor, 0.18),
      lightenColor(baseColor, 0.36),
      "#ffffff"
    ];

    const chunks = Array.from({ length: chunkCount }, (_, i) => {
      const angle = (Math.PI * 2 * i / chunkCount) + randBetween(-0.18, 0.18);
      const distance = randBetween(unit * 0.48, unit * 0.92);
      const size = randBetween(unit * 0.13, unit * 0.26);

      return {
        angle,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        size,
        color: randomFrom(palette),
        shape: ALIEN_BURST_CHUNK_SHAPE,
        spin: randBetween(-260, 260),
        startScale: randBetween(0.68, 0.9),
        endScale: randBetween(1.02, 1.28),
        gravity: randBetween(unit * 0.08, unit * 0.18)
      };
    });

    const sparks = Array.from({ length: sparkCount }, (_, i) => {
      const angle = (Math.PI * 2 * i / sparkCount) + randBetween(-0.26, 0.26);
      const distance = randBetween(unit * 0.36, unit * 0.72);
      const size = randBetween(unit * 0.045, unit * 0.075);

      return {
        angle,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        size,
        spin: randBetween(-180, 180)
      };
    });

    return {
      kind: "alienBurst",
      group: "hit",
      x,
      y,
      born,
      life,
      until: born + life,
      baseColor,
      unit,
      chunks,
      sparks
    };
  }


  function makeParticleEffect(preset, x, y, baseColor, streak, group) {
    const born = performance.now();
    const strong = streak >= 4;
    const configMap = {
      alienPop: { life: 620, count: strong ? 16 : 12, speedMin: 88, speedMax: 162, sizeMin: 4, sizeMax: 9, gravity: 6, ring: 0, center: 0, style: "dot", shell: false, flash: false, cross: false },
      starburst: { life: 680, count: strong ? 15 : 11, speedMin: 96, speedMax: 176, sizeMin: 5, sizeMax: 10, gravity: 4, ring: 0, center: 0, style: "star", shell: false, flash: false, cross: false },
      chrysanthemum: { life: 760, count: strong ? 20 : 16, speedMin: 82, speedMax: 154, sizeMin: 4, sizeMax: 8, gravity: 3, ring: 0, center: 0, style: "petal", shell: false, flash: false, cross: false },
      novaBurst: { life: 720, count: strong ? 18 : 14, speedMin: 108, speedMax: 186, sizeMin: 4, sizeMax: 10, gravity: 5, ring: 0, center: 0, style: "shard", shell: false, flash: false, cross: false },

      flashRing: { life: 900, count: 18, speedMin: 92, speedMax: 154, sizeMin: 5, sizeMax: 10, gravity: 8, ring: 0, center: 0, style: "dot", shell: false, flash: false, cross: false },
      classicFirework: { life: 980, count: 24, speedMin: 102, speedMax: 188, sizeMin: 4, sizeMax: 9, gravity: 10, ring: 0, center: 0, style: "petal", shell: false, flash: false, cross: false },
      confettiBloom: { life: 980, count: 22, speedMin: 84, speedMax: 148, sizeMin: 5, sizeMax: 10, gravity: 14, ring: 0, center: 0, style: "confetti", shell: false, flash: false, cross: false },
      plasmaBurst: { life: 920, count: 20, speedMin: 112, speedMax: 198, sizeMin: 5, sizeMax: 11, gravity: 6, ring: 0, center: 0, style: "plasma", shell: false, flash: false, cross: false },
      cosmicCrackle: { life: 1040, count: 26, speedMin: 74, speedMax: 176, sizeMin: 3, sizeMax: 8, gravity: 12, ring: 0, center: 0, style: "crackle", shell: false, flash: false, cross: false }
    };
    const cfg = configMap[preset] || configMap.alienPop;
    const palette = buildPalette(baseColor, preset);
    const unit = getAlienUnit();
    const particleScale = group === "hit" ? unit / 42 : unit / 86;
    const particles = [];
    for (let i = 0; i < cfg.count; i++) {
      particles.push({
        angle: (Math.PI * 2 * i / cfg.count) + randBetween(-0.18, 0.18),
        speed: randBetween(cfg.speedMin, cfg.speedMax),
        size: randBetween(cfg.sizeMin, cfg.sizeMax) * particleScale,
        color: randomFrom(palette),
        alpha: randBetween(0.82, 1),
        gravity: cfg.gravity,
        drift: randBetween(-8, 8),
        style: cfg.style,
        spin: randBetween(-220, 220)
      });
      if (preset === "cosmicCrackle" && i % 5 === 0) {
        particles.push({
          angle: (Math.PI * 2 * i / cfg.count) + randBetween(-0.12, 0.12),
          speed: randBetween(cfg.speedMax * 0.65, cfg.speedMax * 1.05),
          size: randBetween(2, 4) * particleScale,
          color: "#ffffff",
          alpha: 1,
          gravity: cfg.gravity + 4,
          drift: randBetween(-10, 10),
          style: "spark",
          spin: randBetween(-280, 280)
        });
      }
    }
    return {
      kind: "particle",
      group,
      preset,
      x,
      y,
      born,
      life: cfg.life,
      until: born + cfg.life,
      particles,
      ring: cfg.ring,
      center: cfg.center,
      flash: cfg.flash,
      shell: cfg.shell,
      cross: cfg.cross
    };
  }

  function makeAbductionEffect(x, y, color, onDone) {
    const born = performance.now();
    const unit = getAlienUnit();

    return {
      kind: "abduction",
      group: "abduction",
      x,
      y,
      born,
      life: ABDUCTION_LIFE_MS,
      until: born + ABDUCTION_LIFE_MS,
      colorHex: color.hex,
      alienImg: color.alienImg,
      alienAlt: color.alienAlt,
      abducteeImg: randomFrom(ABDUCTEE_IMAGES),
      unit,
      onDone,
      done: false
    };
  }

  function buildPalette(baseColor, preset) {
    if (preset === "confettiBloom") return ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6", "#f28fff", "#ffffff"];
    if (preset === "plasmaBurst") return [baseColor, lightenColor(baseColor, 0.3), "#ffffff", "#d596ff", "#77f0ff"];
    if (preset === "cosmicCrackle") return [baseColor, "#ffffff", "#ffd96c", "#8af2ff", "#ff9fe7"];
    return [baseColor, lightenColor(baseColor, 0.2), lightenColor(baseColor, 0.36), "#ffffff", "#ffe082"];
  }

  function renderEffect(effect, now) {

    if (effect.kind === "abduction") {
      const progress = clamp((now - effect.born) / effect.life, 0, 1);
      const powerOnProgress = clamp(progress / 0.16, 0, 1);
      const ascendProgress = clamp((progress - 0.16) / 0.84, 0, 1);
      const ascendEase = ascendProgress * ascendProgress * (3 - 2 * ascendProgress);

      const unit = effect.unit || getAlienUnit();
      const liftDistance = Math.max(effect.y + unit * 3.1, state.fieldHeight + unit * 1.6);
      const liftY = -ascendEase * liftDistance;

      const beamOpacity = progress < 0.82
        ? 0.84 * powerOnProgress
        : Math.max(0, 0.84 - ((progress - 0.82) / 0.18) * 0.84);

      const wholeOpacity = progress < 0.9
        ? 1
        : Math.max(0, 1 - ((progress - 0.9) / 0.1));

      const beamPulse = 0.94 + Math.sin(now * 0.018) * 0.035;
      const abducteeFloat = Math.sin(now * 0.01) * unit * 0.035;

      return `
        <div
          class="vinv-effect-wrap vinv-abduct-wrap"
          style="
            left:${effect.x}px;
            top:${effect.y}px;
            --vinv-alien-size:${unit.toFixed(1)}px;
            --vinv-abduct-unit:${unit.toFixed(1)}px;
            --vinv-abductee-size:${(unit * 0.6).toFixed(1)}px;
            --vinv-abduct-beam-height:${(unit * 1.72).toFixed(1)}px;
            --vinv-abduct-beam-width:${(unit * 1.02).toFixed(1)}px;
            transform:translate(-50%,-50%) translateY(${liftY.toFixed(1)}px);
            opacity:${wholeOpacity.toFixed(3)};
          "
        >
          <div class="vinv-abduct-group">
            <div class="vinv-abduct-alien">
              ${renderAlienHtml({
        hex: effect.colorHex,
        alienImg: effect.alienImg,
        alienAlt: effect.alienAlt
      }, effect.alienAlt, "vinv-alien-svg--abduct")}
            </div>

            <div
              class="vinv-abduct-cone"
              style="
                opacity:${beamOpacity.toFixed(3)};
                transform:translateX(-50%) scaleX(${beamPulse.toFixed(3)});
              "
            ></div>

            <div
              class="vinv-abduct-passenger"
              style="transform:translate(-50%, ${abducteeFloat.toFixed(1)}px);"
            >
              <img
                class="vinv-abductee-img"
                src="${effect.abducteeImg}"
                alt="Abductee"
                draggable="false"
              />
            </div>
          </div>
        </div>
      `;
    }

    if (effect.kind === "scorePopup") {
      const progress = clamp((now - effect.born) / effect.life, 0, 1);
      const lift = -34 * progress;
      const opacity = progress < 0.75 ? 1 : Math.max(0, 1 - ((progress - 0.75) / 0.25));
      const scale = progress < 0.18
        ? 0.72 + (1.14 - 0.72) * (progress / 0.18)
        : 1.14 + (1 - 1.14) * Math.min(1, (progress - 0.18) / 0.18);

      return `
        <div
          class="vinv-score-popup ${effect.tone === "minus" ? "is-minus" : "is-plus"}"
          style="
            left:${effect.x}px;
            top:${effect.y}px;
            opacity:${opacity.toFixed(3)};
            transform:translate(-50%, -50%) translateY(${lift.toFixed(1)}px) scale(${scale.toFixed(3)});
          "
        >
          ${escapeHtml(effect.text)}
        </div>
      `;
    }

    if (effect.kind === "streakMilestone") {
      const progress = clamp((now - effect.born) / effect.life, 0, 1);
      const opacity = progress < 0.72 ? 1 : Math.max(0, 1 - ((progress - 0.72) / 0.28));
      const rise = -18 * progress;
      const scale = progress < 0.2
        ? 0.56 + (1.12 - 0.56) * (progress / 0.2)
        : 1.12 + (1 - 1.12) * Math.min(1, (progress - 0.2) / 0.18);

      return `
        <div
          class="vinv-streak-milestone ${effect.rainbow ? "is-rainbow" : ""} is-${effect.tone}"
          style="
            left:${effect.x}px;
            top:${effect.y}px;
            --vinv-streak-bg:${effect.bg};
            --vinv-streak-text:${effect.textColor};
            opacity:${opacity.toFixed(3)};
            transform:translate(-50%, -50%) translateY(${rise.toFixed(1)}px) scale(${scale.toFixed(3)});
          "
        >
          ${effect.streak} IN A ROW!
        </div>
      `;
    }



    if (effect.kind === "poof") {
      const progress = clamp((now - effect.born) / effect.life, 0, 1);

      let cloudOpacity = 0;
      let cloudScale = 0.14;

      if (progress < 0.1) {
        cloudOpacity = (progress / 0.1) * 0.62;
        cloudScale = 0.14 + (1.06 - 0.14) * (progress / 0.1);
      } else if (progress < 0.22) {
        cloudOpacity = 0.62;
        cloudScale = 1.06 + (0.97 - 1.06) * ((progress - 0.1) / 0.12);
      } else if (progress < 0.48) {
        cloudOpacity = 0.62 + (0.48 - 0.62) * ((progress - 0.22) / 0.26);
        cloudScale = 0.97 + (1.02 - 0.97) * ((progress - 0.22) / 0.26);
      } else if (progress < 0.72) {
        cloudOpacity = 0.48 + (0.18 - 0.48) * ((progress - 0.48) / 0.24);
        cloudScale = 1.02 + (1.06 - 1.02) * ((progress - 0.48) / 0.24);
      } else {
        cloudOpacity = Math.max(0, 0.18 * (1 - ((progress - 0.72) / 0.28)));
        cloudScale = 1.06 + (1.08 - 1.06) * ((progress - 0.72) / 0.28);
      }

      const dotHtml = effect.dots.map((dot) => {
        const localProgress = clamp((now - effect.born - dot.delay) / effect.life, 0, 1);
        const eased = 1 - Math.pow(1 - localProgress, 3);
        const dx = dot.tx * eased;
        const dy = dot.ty * eased;
        const opacity = clamp((1 - localProgress) * 0.58, 0, 0.58);
        const scale = dot.startScale + (dot.endScale - dot.startScale) * eased;

        return `
          <div
            class="vinv-poof-dot"
            style="
              width:${dot.size.toFixed(1)}px;
              height:${dot.size.toFixed(1)}px;
              margin-left:${(dot.size / -2).toFixed(1)}px;
              margin-top:${(dot.size / -2).toFixed(1)}px;
              transform:translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(2)});
              background:${dot.color};
              opacity:${opacity.toFixed(3)};
            "
          ></div>
        `;
      }).join("");

      return `
        <div class="vinv-effect-wrap vinv-poof-wrap" style="left:${effect.x}px; top:${effect.y}px;">
          <div
            class="vinv-poof-cloud"
            style="
              width:${effect.cloudSize.toFixed(1)}px;
              height:${effect.cloudSize.toFixed(1)}px;
              opacity:${cloudOpacity.toFixed(3)};
              transform:translate(-50%, -50%) scale(${cloudScale.toFixed(3)});
            "
          >
            ${POOF_CLOUD_SVG}
          </div>
          ${dotHtml}
        </div>
      `;
    }

    if (effect.kind === "alienBurst") {
      const progress = clamp((now - effect.born) / effect.life, 0, 1);
      const travel = 1 - Math.pow(1 - progress, 1.55);
      const pop = 1 - Math.pow(1 - progress, 3);
      const fade = clamp(1 - Math.pow(progress, 1.35), 0, 1);
      const unit = effect.unit || getAlienUnit();

      const flashProgress = clamp(progress / 0.28, 0, 1);
      const flashOpacity = Math.max(0, 0.82 - flashProgress * 0.82);
      const flashSize = unit * (0.34 + flashProgress * 0.72);

      const ringProgress = clamp(progress / 0.48, 0, 1);
      const ringOpacity = Math.max(0, 0.62 - ringProgress * 0.62);
      const ringSize = unit * (0.32 + ringProgress * 1.15);

      const chunkHtml = effect.chunks.map((chunk) => {
        const dx = chunk.tx * travel;
        const dy = chunk.ty * travel + chunk.gravity * progress * progress;
        const rotation = chunk.spin * progress;
        const scale = chunk.startScale + (chunk.endScale - chunk.startScale) * pop;
        const opacity = clamp(fade * 0.96, 0, 0.96);

        return `
          <div
            class="vinv-alien-burst-piece is-${chunk.shape}"
            style="
              width:${chunk.size.toFixed(1)}px;
              height:${chunk.size.toFixed(1)}px;
              margin-left:${(chunk.size / -2).toFixed(1)}px;
              margin-top:${(chunk.size / -2).toFixed(1)}px;
              background:${chunk.color};
              opacity:${opacity.toFixed(3)};
              transform:translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(2)});
            "
          ></div>
        `;
      }).join("");

      const sparkHtml = effect.sparks.map((spark) => {
        const sparkProgress = clamp(progress / 0.84, 0, 1);
        const sparkTravel = 1 - Math.pow(1 - sparkProgress, 1.45);
        const dx = spark.tx * sparkTravel;
        const dy = spark.ty * sparkTravel;
        const opacity = clamp((1 - sparkProgress) * 0.82, 0, 0.82);
        const rotation = spark.spin * sparkProgress;

        return `
          <div
            class="vinv-alien-burst-spark"
            style="
              width:${spark.size.toFixed(1)}px;
              height:${spark.size.toFixed(1)}px;
              margin-left:${(spark.size / -2).toFixed(1)}px;
              margin-top:${(spark.size / -2).toFixed(1)}px;
              opacity:${opacity.toFixed(3)};
              transform:translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rotation.toFixed(1)}deg);
            "
          ></div>
        `;
      }).join("");

      return `
        <div class="vinv-effect-wrap vinv-alien-burst-wrap" style="left:${effect.x}px; top:${effect.y}px;">
          <div
            class="vinv-alien-burst-flash"
            style="
              width:${flashSize.toFixed(1)}px;
              height:${flashSize.toFixed(1)}px;
              opacity:${flashOpacity.toFixed(3)};
            "
          ></div>
          <div
            class="vinv-alien-burst-ring"
            style="
              width:${ringSize.toFixed(1)}px;
              height:${ringSize.toFixed(1)}px;
              opacity:${ringOpacity.toFixed(3)};
              border-color:${effect.baseColor};
            "
          ></div>
          ${chunkHtml}
          ${sparkHtml}
        </div>
      `;
    }

    if (effect.kind !== "particle") return "";

    const progress = clamp((now - effect.born) / effect.life, 0, 1);
    const poofCloud = effect.cloud
      ? `<div class="vinv-poof-cloud" style="width:${effect.cloudSize.toFixed(1)}px;height:${effect.cloudSize.toFixed(1)}px;"></div>`
      : "";

    const particleHtml = effect.particles.map((particle) => {
      const dx = Math.cos(particle.angle) * particle.speed * progress + particle.drift * progress;
      const dy = Math.sin(particle.angle) * particle.speed * progress + (particle.gravity || 0) * progress * progress * 40;
      const opacity = clamp((particle.alpha || 1) * (1 - Math.pow(progress, effect.preset === "smokePuff" ? 1.05 : 1.55)), 0, 1);
      const scale = effect.preset === "smokePuff" ? (0.82 + progress * 0.62) : (0.72 + progress * 0.62);
      const rotation = (particle.spin || 0) * progress;
      return `<div class="vinv-particle is-${particle.style}" style="transform:translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) translate(-50%,-50%) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(2)});width:${particle.size.toFixed(1)}px;height:${particle.size.toFixed(1)}px;background:${particle.color};opacity:${opacity.toFixed(3)};"></div>`;
    }).join("");

    const ringSize = 18 + progress * 84 * (effect.ring || 0);
    const centerSize = 18 + (effect.center || 0) * 18 + progress * 10;
    const ring = effect.ring ? `<div class="vinv-effect-ring" style="width:${ringSize.toFixed(1)}px;height:${ringSize.toFixed(1)}px;opacity:${Math.max(0, 0.82 - progress * 0.95).toFixed(3)};border-width:${Math.max(2, 4 - progress * 2).toFixed(1)}px;"></div>` : "";
    const center = effect.center ? `<div class="vinv-effect-center" style="width:${centerSize.toFixed(1)}px;height:${centerSize.toFixed(1)}px;opacity:${Math.max(0, 0.95 - progress * 1.2).toFixed(3)};"></div>` : "";
    const flash = effect.flash ? `<div class="vinv-effect-flash" style="width:${(74 + progress * 50).toFixed(1)}px;height:${(74 + progress * 50).toFixed(1)}px;opacity:${Math.max(0, 0.28 - progress * 0.32).toFixed(3)};"></div>` : "";
    const shell = effect.shell ? `<div class="vinv-effect-shell" style="width:${(42 + progress * 36).toFixed(1)}px;height:${(42 + progress * 36).toFixed(1)}px;opacity:${Math.max(0, 0.3 - progress * 0.36).toFixed(3)};"></div>` : "";
    const cross = effect.cross ? `<div class="vinv-effect-cross" style="opacity:${Math.max(0, 0.54 - progress * 0.6).toFixed(3)};"></div>` : "";

    return `<div class="vinv-effect-wrap" style="left:${effect.x}px; top:${effect.y}px;">${flash}${shell}${ring}${center}${cross}${poofCloud}${particleHtml}</div>`;
  }

  function lightenColor(hex, amount) {
    const clean = String(hex || "#ffffff").replace("#", "");
    if (clean.length !== 6) return "#ffffff";
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const nr = Math.round(r + (255 - r) * amount);
    const ng = Math.round(g + (255 - g) * amount);
    const nb = Math.round(b + (255 - b) * amount);
    return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
  }

  function completeExpiredEffects(ts) {
    state.effects.forEach((effect) => {
      if (effect.until > ts) return;
      if (effect.done) return;
      if (typeof effect.onDone !== "function") return;

      effect.done = true;
      effect.onDone();
    });
  }

  function scheduleAction(delayMs, fn) {
    state.scheduledActions.push({ at: performance.now() + delayMs, run: fn });
  }

  function processScheduledActions(ts) {
    if (!state.scheduledActions.length) return;
    const ready = [];
    const later = [];
    for (const action of state.scheduledActions) {
      if (ts >= action.at) ready.push(action);
      else later.push(action);
    }
    state.scheduledActions = later;
    for (const action of ready) action.run();
  }

  function stopLoop() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    state.running = false;
  }

  function startLoop() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(loop);
  }

  const clamp = window.VerseGameShell.clamp;
  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randBetween(min, max) { return min + Math.random() * (max - min); }
  const capitalize = window.VerseGameShell.capitalize;
  const shuffle = window.VerseGameShell.shuffle;
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
