(async function () {
  const app = document.getElementById("app");
  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "bible_bugs";
  const GAME_TITLE = "Bible Bugs";
  const GAME_ICON = "🐸";
  const BUILD_AREA = "compact";
  const HELP_OVERLAY_ID = "bbHelpOverlay";
  const GAME_MENU_ID = "bbGameMenuOverlay";

  const GAME_THEME = {
    bg: "#a7cb6f",
    pageBg: "#a7cb6f",
    accent: "#a7cb6f",
    helpTitleBg: "#a7cb6f",
    helpTitleColor: "#ffffff",
    helpCloseBg: "#a7cb6f",
    helpCloseColor: "#ffffff"
  };

  const IMAGE_PATHS = {
    frogIdle: "./bible_bugs_images/bible_bugs_frog_idle.png",
    frogHappy: "./bible_bugs_images/bible_bugs_frog_happy.png",
    frogGross: "./bible_bugs_images/bible_bugs_frog_gross.png",
    lilyPad: "./bible_bugs_images/bible_bugs_lilypad.png"
  };

  const BUG_IMAGE_PATHS = [
    "./bible_bugs_images/bible_bugs_bug_1.png",
    "./bible_bugs_images/bible_bugs_bug_2.png",
    "./bible_bugs_images/bible_bugs_bug_3.png",
    "./bible_bugs_images/bible_bugs_bug_4.png",
    "./bible_bugs_images/bible_bugs_bug_5.png",
    "./bible_bugs_images/bible_bugs_bug_6.png",
    "./bible_bugs_images/bible_bugs_bug_7.png",
    "./bible_bugs_images/bible_bugs_bug_8.png",
    "./bible_bugs_images/bible_bugs_bug_9.png",
    "./bible_bugs_images/bible_bugs_bug_10.png"
  ];

  const BONUS_GOOD_BUG_IMAGE_PATHS = BUG_IMAGE_PATHS.filter((_, index) => index !== 7);
  const VERSE_BUG_IMAGE_PATHS = BONUS_GOOD_BUG_IMAGE_PATHS;
  const BONUS_STINK_BUG_IMAGE_PATH = BUG_IMAGE_PATHS[7];
  const BONUS_STINK_CHANCE = 0.22;
  const BONUS_STINK_IDLE_INTERVAL_MS = 150;
  const BONUS_STINK_SWATCHES = [
    { fill: "#6d7638", edge: "#5d572c", glow: "rgba(109, 118, 56, 0.40)" },
    { fill: "#716636", edge: "#5d572c", glow: "rgba(113, 102, 54, 0.40)" },
    { fill: "#5d572c", edge: "#4b4723", glow: "rgba(93, 87, 44, 0.36)" }
  ];

  // Change these back to "fancy" if we want the old gradient/shadow stink bubbles again.
  const BONUS_STINK_BURST_STYLE = "simple";
  const BONUS_STINK_AMBIENT_STYLE = "simple";

  const BUG_EMOJIS = ["🪰", "🐞", "🐝", "🦟", "🪲", "🐛"];
  const LANES = [0.18, 0.50, 0.82];
  const BONUS_SECONDS = 20;
  const BONUS_MAX_BUGS = 3;

  const MODE_TIMING = {
    easy: { fallSeconds: 6.8, nextDelay: 0, reactionMs: 620, missDelay: 520 },
    medium: { fallSeconds: 5.8, nextDelay: 0, reactionMs: 580, missDelay: 460 },
    hard: { fallSeconds: 4.9, nextDelay: 0, reactionMs: 540, missDelay: 420 }
  };

  const BONUS_BUG_LIFE_MS = 1850;
  const BONUS_BUG_EXTRA_LIFE_MS = 950;
  const BONUS_INITIAL_STAGGER_MS = [0, 360, 780];
  const BONUS_EAT_MS = 360;
  const BONUS_SCORE_REVEAL_MS = 1850;
  const MAIN_EAT_MS = 420;
  const TUTORIAL_EAT_MS = 420;
  const TUTORIAL_GO_MS = 1500;

  const BUG_MOTION = {
    sideAmountRatio: 0.03,
    sideSpeed: 0.55,
    rotationAmount: 3,
    squishAmount: 0.02
  };

  const TONGUE_FX = {
    subtleSparkInterval: 12,
    rainbowSparkInterval: 12
  };

  const WATER_FX = {
    opacity: 0.09,
    speed: 1.80,
    spacing: 60,
    thickness: 8,
    amplitude: 23,
    frequency: 3.15,
    slantDeg: -5,
    viewSize: 1000,
    segments: 96
  };

  const SOUND_BASE_PATH = "./bible_bugs_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

  const SOUND_FILES = {
    silence: "../../verse_audio/silence.mp3",
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,

    tongue: `${SOUND_BASE_PATH}bible_bugs_tongue.mp3`,
    pop1: `${SOUND_BASE_PATH}bible_bugs_pop_1.mp3`,
    pop2: `${SOUND_BASE_PATH}bible_bugs_pop_2.mp3`,
    pop3: `${SOUND_BASE_PATH}bible_bugs_pop_3.mp3`,
    pop4: `${SOUND_BASE_PATH}bible_bugs_pop_4.mp3`,
    pop5: `${SOUND_BASE_PATH}bible_bugs_pop_5.mp3`,
    correct: `${SOUND_BASE_PATH}bible_bugs_correct.mp3`,
    incorrect: `${SOUND_BASE_PATH}bible_bugs_incorrect.mp3`,
    streak: `${SOUND_BASE_PATH}bible_bugs_streak.mp3`,
    bonusStart: `${SOUND_BASE_PATH}bible_bugs_bonus_start.mp3`,
    bonusEnd: `${SOUND_BASE_PATH}bible_bugs_bonus_end.mp3`,
    stinkBug: `${SOUND_BASE_PATH}bible_bugs_stink_bug.mp3`
  };

  const SOUND_TUNING = {
    masterVolume: 0.90,
    volumes: {
      uiTap: 0.42,
      tongue: 0.48,
      pop: 0.52,
      correct: 0.58,
      incorrect: 0.28,
      streak: 0.68,
      bonusStart: 0.70,
      bonusEnd: 0.72,
      stinkBug: 0.57
    }
  };

  const BUG_POP_SOUND_KEYS = ["pop1", "pop2", "pop3", "pop4", "pop5"];

  let selectedMode = null;
  let muted = false;
  let completionMarked = false;
  let completionResult = null;
  let bonusRevealCompletionPromise = Promise.resolve();
  let bonusRevealContinuePending = false;
  let resizeBound = false;

  let audioCtx = null;
  let audioUnlocked = false;
  let silenceAudio = null;
  const soundBuffers = new Map();
  const soundBufferPromises = new Map();

  const shell = window.VerseGameShell;
  const GAME_ICON_HTML = shell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);

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

    return shell.gameIconImageHtml(
      medal.src,
      medal.fallback,
      medal.alt
    );
  }

  const parsedRef = shell.parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
  const buildData = shell.buildVerseSegments({
    verseText: ctx.verseText || "",
    book: parsedRef.book,
    reference: parsedRef.reference,
    buildArea: BUILD_AREA
  });

  const state = {
    running: false,
    paused: false,
    pauseReason: "",
    pausedAt: 0,
    rafId: 0,
    lastTs: 0,
    fieldWidth: 0,
    fieldHeight: 0,
    progressIndex: 0,
    buildFitDone: false,
    buildShakeUntil: 0,
    fieldFlashUntil: 0,
    reaction: null,
    overlayMessage: "",
    overlayUntil: 0,
    overlayClass: "",
    overlayRenderKey: "",
    tutorialActive: false,
    tutorialStep: "",
    tutorialBug: null,
    phase: "words",
    waveId: 0,
    waveStatus: "idle",
    bugs: [],
    tongue: null,
    spitParticles: [],
    poofParticles: [],
    stinkParticles: [],
    tongueSparkles: [],
    scheduledActions: [],
    currentStreak: 0,
    maxStreak: 0,
    frogChompUntil: 0,
    misses: 0,
    mistakes: 0,
    correctEaten: 0,
    bonusIntroActive: false,
    bonusIntroUntil: 0,
    bonusMode: false,
    bonusEndsAt: 0,
    bonusBugs: [],
    bonusBugId: 0,
    bonusEating: false,
    bonusSpawnPendingCount: 0,
    bonusScore: 0,
    bonusCorrectStreak: 0,
    bonusMultiplier: 1,
    bonusScorePops: [],
    bonusScoreRevealActive: false,
    bugsEaten: 0,
    done: false,
    uiSoundFlip: false
  };

  preloadBibleBugsImages();
  renderIntro();

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

    silenceAudio = new Audio(SOUND_FILES.silence);
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
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load sound: ${src}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        soundBuffers.set(key, buffer);
        return buffer;
      })
      .catch((err) => {
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
    Object.keys(SOUND_FILES).forEach((key) => {
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

  function playUiTapAndUnlock() {
    unlockAudio();
    playUiTapSound();
  }

  function playTongueSound() {
    unlockAudio();
    playGameSound("tongue");
  }

  function playRandomBugPopSound() {
    const key = BUG_POP_SOUND_KEYS[Math.floor(Math.random() * BUG_POP_SOUND_KEYS.length)] || "pop1";
    playGameSound(key, "pop");
  }

  function maybePlayTongueUpgradeSound(previousStreak, nextStreak) {
    const before = Number(previousStreak) || 0;
    const after = Number(nextStreak) || 0;
    const thresholds = [3, 5, 8, 10, 12, 15];

    if (thresholds.some((value) => before < value && after >= value)) {
      playGameSound("streak");
    }
  }

  function preloadBibleBugsImages() {
    const imageSources = [
      ...Object.values(IMAGE_PATHS),
      ...BUG_IMAGE_PATHS
    ];

    for (const src of imageSources) {
      if (!src) continue;

      const img = new Image();
      img.decoding = "async";
      img.src = src;

      if (typeof img.decode === "function") {
        img.decode().catch(() => { });
      }
    }
  }


  function renderIntro() {
    stopLoop();

    shell.renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      debugBadge: "",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onBack: () => {
        playUiTapAndUnlock();
        window.VerseGameBridge.exitGame();
      },
      onStart: () => {
        playUiTapAndUnlock();
        renderModeSelect();
      }
    });
  }

  function renderModeSelect() {
    stopLoop();

    shell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      iconHtml: shell.medalSetIconHtml("vm-mode-select-medal-set"),
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: `Back to ${GAME_TITLE} title`,
      onBack: () => {
        playUiTapAndUnlock();
        renderIntro();
      },
      onSelect: (mode) => {
        playUiTapAndUnlock();
        startGame(mode);
      }
    });
  }

  function startGame(mode) {
    selectedMode = mode;
    completionMarked = false;
    completionResult = null;
    bonusRevealCompletionPromise = Promise.resolve();
    bonusRevealContinuePending = false;

    state.running = true;
    state.paused = false;
    state.pauseReason = "";
    state.pausedAt = 0;
    state.lastTs = 0;
    state.progressIndex = 0;
    state.buildFitDone = false;
    state.buildShakeUntil = 0;
    state.fieldFlashUntil = 0;
    state.reaction = null;
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.overlayClass = "";
    state.overlayRenderKey = "";
    state.tutorialActive = false;
    state.tutorialStep = "";
    state.tutorialBug = null;
    state.phase = "words";
    state.waveId = 0;
    state.waveStatus = "idle";
    state.bugs = [];
    state.tongue = null;
    state.spitParticles = [];
    state.poofParticles = [];
    state.stinkParticles = [];
    state.tongueSparkles = [];
    state.scheduledActions = [];
    state.currentStreak = 0;
    state.maxStreak = 0;
    state.frogChompUntil = 0;
    state.misses = 0;
    state.mistakes = 0;
    state.correctEaten = 0;
    state.bonusIntroActive = false;
    state.bonusIntroUntil = 0;
    state.bonusMode = false;
    state.bonusEndsAt = 0;
    state.bonusBugs = [];
    state.bonusBugId = 0;
    state.bonusEating = false;
    state.bonusSpawnPendingCount = 0;
    state.bonusScore = 0;
    state.bonusCorrectStreak = 0;
    state.bonusMultiplier = 1;
    state.bonusScorePops = [];
    state.bonusScoreRevealActive = false;
    state.bugsEaten = 0;
    state.done = false;

    app.innerHTML = `
      <div class="bb-shell">
        <div class="bb-stage">
          <div class="bb-build-wrap">
            <div class="bb-build vm-build vm-build--${BUILD_AREA}" id="bbBuild">
              <div class="bb-build-text vm-build-text" id="bbBuildText"></div>
            </div>
          </div>

          <div class="bb-field-wrap">
            <div class="bb-field" id="bbField">
              <div class="bb-water-layer" id="bbWaterLayer" aria-hidden="true">
                <svg class="bb-water-wave-svg" id="bbWaterWaveSvg" viewBox="0 0 1000 1000" preserveAspectRatio="none"></svg>

              </div>
              <div class="bb-play-layer" id="bbPlayLayer"></div>
              <div class="bb-effects-layer" id="bbEffectsLayer"></div>
              <div class="bb-frog-layer" id="bbFrogLayer">
                ${renderFrog()}
              </div>
              <div class="bb-overlay-msg" id="bbOverlay"></div>
              <div class="bb-reaction-layer" id="bbReactionLayer"></div>
              <div class="bb-bonus-score-reveal-layer" id="bbBonusScoreRevealLayer"></div>
              <div class="bb-bonus-intro-overlay" id="bbBonusIntroOverlay" aria-hidden="true">
                <div class="bb-bonus-intro-card">
                  <div class="bb-bonus-intro-title">BONUS ROUND!</div>
                  <div class="bb-bonus-intro-subtitle">Eat as many bugs as you can!</div>
                </div>
              </div>
              <div class="bb-hud-layer">
                <button class="bb-corner-pill bb-corner-left" id="bbMenuPill" type="button" aria-label="Game menu">☰</button>
                <div class="bb-corner-pill bb-corner-right" id="bbStatusPill"></div>
              </div>
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
    updatePhase();
    updateBuildText();
    startTutorial();
    renderFrame();
    startLoop();
  }

  function renderHelpOverlay(body) {
    return shell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body,
      closeText: "Close"
    });
  }

  function renderGameMenuOverlay() {
    return shell.gameMenuHtml({
      id: GAME_MENU_ID,
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function helpHtml() {
    return `Eat bugs to add words to the verse.<br><br>
      Tap the bug with the correct words until you finish the verse.<br><br>
      During the bonus round, eat as many bugs as you can. Watch out for stink bugs!`;
  }

  function wireCommonNav() {
    shell.wireGameMenu({
      id: GAME_MENU_ID,
      menuButtonId: "bbMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        playUiTapAndUnlock();
        muted = !muted;
        return muted;
      },
      onHowToPlay: () => {
        playUiTapAndUnlock();
        openHelpFromMenu();
      },
      onModeSelect: () => {
        playUiTapAndUnlock();
        setPaused(false, "");
        stopLoop();
        renderModeSelect();
      },
      onExit: () => {
        playUiTapAndUnlock();
        stopLoop();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        playUiTapAndUnlock();
        setPaused(true, "menu");
      },
      onClose: () => {
        playUiTapAndUnlock();
        setPaused(false, "");
      },
      onBackFromHelp: () => {
        playUiTapAndUnlock();
        setPaused(true, "menu");
      }
    });

    installMenuTouchFallbacks();
  }

  function installMenuTouchFallbacks() {
    const overlay = document.getElementById(GAME_MENU_ID);
    if (!overlay || overlay.dataset.bbTouchFallbacks === "1") return;

    overlay.dataset.bbTouchFallbacks = "1";

    function closeMenu() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      setPaused(false, "");
    }

    function wireTouchButton(id, action) {
      const button = document.getElementById(id);
      if (!button) return;

      button.addEventListener("touchend", (event) => {
        event.preventDefault();
        event.stopPropagation();
        playUiTapAndUnlock();
        action();
      }, { passive: false });
    }

    wireTouchButton(`${GAME_MENU_ID}HowToBtn`, () => {
      openHelpFromMenu();
    });

    wireTouchButton(`${GAME_MENU_ID}ModeSelectBtn`, () => {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      setPaused(false, "");
      stopLoop();
      renderModeSelect();
    });

    wireTouchButton(`${GAME_MENU_ID}ExitBtn`, () => {
      stopLoop();
      window.VerseGameBridge.exitGame();
    });

    wireTouchButton(`${GAME_MENU_ID}CloseBtn`, () => {
      closeMenu();
    });

    wireTouchButton(`${GAME_MENU_ID}MuteBtn`, () => {
      muted = !muted;

      const muteButton = document.getElementById(`${GAME_MENU_ID}MuteBtn`);
      if (muteButton) {
        muteButton.textContent = muted ? "🔇" : "🔊";
        muteButton.setAttribute("aria-label", muted ? "Unmute" : "Mute");
        muteButton.setAttribute("title", muted ? "Unmute" : "Mute");
      }

      overlay.setAttribute("aria-hidden", "false");
    });

    function closeHelpFromTouch() {
      const helpOverlay = document.getElementById(HELP_OVERLAY_ID);
      const menuOverlay = document.getElementById(GAME_MENU_ID);
      const mode = helpOverlay?.dataset.mode || "close";

      if (helpOverlay) {
        helpOverlay.classList.remove("is-open");
        helpOverlay.setAttribute("aria-hidden", "true");
      }

      if (mode === "back") {
        if (menuOverlay) {
          menuOverlay.classList.add("is-open");
          menuOverlay.setAttribute("aria-hidden", "false");
        }

        setPaused(true, "menu");
      } else {
        setPaused(false, "");
      }
    }

    wireTouchButton(`${HELP_OVERLAY_ID}CloseBtn`, closeHelpFromTouch);

    if (!document.documentElement.dataset.bbHelpTouchFallbacks) {
      document.documentElement.dataset.bbHelpTouchFallbacks = "1";

      const catchHelpBackTouch = (event) => {
        const helpOverlay = document.getElementById(HELP_OVERLAY_ID);
        if (!helpOverlay || !helpOverlay.classList.contains("is-open")) return;

        const button = event.target?.closest?.(`#${HELP_OVERLAY_ID}CloseBtn`);
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        closeHelpFromTouch();
      };

      document.addEventListener("touchend", catchHelpBackTouch, { capture: true, passive: false });
      document.addEventListener("pointerup", catchHelpBackTouch, { capture: true });
      document.addEventListener("click", catchHelpBackTouch, { capture: true });
    }
  }


  function openHelpFromMenu() {
    const menuOverlay = document.getElementById(GAME_MENU_ID);

    if (menuOverlay) {
      menuOverlay.classList.remove("is-open");
      menuOverlay.setAttribute("aria-hidden", "true");
    }

    shell.openHelp(HELP_OVERLAY_ID, "back", "Back");
    setPaused(true, "help");
  }

  function setPaused(paused, reason = "") {
    const now = performance.now();

    if (paused) {
      if (state.paused) {
        state.pauseReason = reason || state.pauseReason;
        return;
      }

      state.paused = true;
      state.pauseReason = reason;
      state.pausedAt = now;
      return;
    }

    if (!state.paused) {
      state.pauseReason = "";
      state.pausedAt = 0;
      state.lastTs = now;
      return;
    }

    const pauseDuration = Math.max(0, now - (Number(state.pausedAt) || now));
    shiftGameTimers(pauseDuration);

    state.paused = false;
    state.pauseReason = "";
    state.pausedAt = 0;
    state.lastTs = now;
  }

  function shiftGameTimers(deltaMs) {
    const delta = Number(deltaMs) || 0;
    if (delta <= 0) return;

    function shiftBugTimes(bug) {
      if (!bug) return;

      if (Number.isFinite(bug.bornAt)) bug.bornAt += delta;
      if (Number.isFinite(bug.poofAt) && bug.poofAt > 0) bug.poofAt += delta;
      if (Number.isFinite(bug.eatStartedAt)) bug.eatStartedAt += delta;
      if (Number.isFinite(bug.expiresAt)) bug.expiresAt += delta;
      if (Number.isFinite(bug.nextStinkAt) && bug.nextStinkAt > 0) bug.nextStinkAt += delta;
    }

    for (const bug of state.bugs) {
      shiftBugTimes(bug);
    }

    shiftBugTimes(state.tutorialBug);

    for (const bug of state.bonusBugs) {
      shiftBugTimes(bug);
    }

    if (state.tongue && Number.isFinite(state.tongue.startedAt)) {
      state.tongue.startedAt += delta;
    }

    if (state.reaction) {
      if (Number.isFinite(state.reaction.startedAt)) state.reaction.startedAt += delta;
      if (Number.isFinite(state.reaction.until)) state.reaction.until += delta;
    }

    for (const particle of state.spitParticles) {
      if (Number.isFinite(particle.bornAt)) particle.bornAt += delta;
    }

    for (const particle of state.poofParticles) {
      if (Number.isFinite(particle.bornAt)) particle.bornAt += delta;
    }

    for (const particle of state.stinkParticles) {
      if (Number.isFinite(particle.bornAt)) particle.bornAt += delta;
    }

    for (const particle of state.tongueSparkles) {
      if (Number.isFinite(particle.bornAt)) particle.bornAt += delta;
    }

    for (const pop of state.bonusScorePops) {
      if (Number.isFinite(pop.bornAt)) pop.bornAt += delta;
    }

    if (Number.isFinite(state.frogChompUntil) && state.frogChompUntil > 0) {
      state.frogChompUntil += delta;
    }

    if (state.tongue && Number.isFinite(state.tongue.lastSparkAt)) {
      state.tongue.lastSparkAt += delta;
    }

    for (const action of state.scheduledActions) {
      if (Number.isFinite(action.at)) action.at += delta;
    }

    if (Number.isFinite(state.buildShakeUntil) && state.buildShakeUntil > 0) {
      state.buildShakeUntil += delta;
    }

    if (Number.isFinite(state.fieldFlashUntil) && state.fieldFlashUntil > 0) {
      state.fieldFlashUntil += delta;
    }

    if (Number.isFinite(state.overlayUntil) && state.overlayUntil > 0) {
      state.overlayUntil += delta;
    }

    if (Number.isFinite(state.bonusIntroUntil) && state.bonusIntroUntil > 0) {
      state.bonusIntroUntil += delta;
    }

    if (Number.isFinite(state.bonusEndsAt) && state.bonusEndsAt > 0) {
      state.bonusEndsAt += delta;
    }
  }

  function wireGameInput() {
    const field = document.getElementById("bbField");
    if (!field) return;

    field.addEventListener("pointerdown", (event) => {
      if (state.bonusScoreRevealActive) {
        event.preventDefault();
        continueAfterBonusScoreReveal();
        return;
      }

      const bugButton = event.target.closest("[data-bug-id]");
      if (!bugButton) return;
      event.preventDefault();
      handleBugTap(String(bugButton.dataset.bugId));
    });

    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener("resize", () => {
        if (!state.running) return;
        state.buildFitDone = false;
        recalcField();
        updateBuildText();
        renderFrame();
      }, { passive: true });
    }
  }

  function recalcField() {
    const field = document.getElementById("bbField");
    if (!field) return;
    const rect = field.getBoundingClientRect();
    state.fieldWidth = rect.width || 320;
    state.fieldHeight = rect.height || 420;
  }

  function updateBuildText() {
    const buildText = document.getElementById("bbBuildText");
    if (!buildText) return;

    const buildRender = shell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: buildData.bookLabel,
      reference: buildData.referenceLabel,
      progressIndex: state.progressIndex,
      buildArea: BUILD_AREA,
      hideUnbuilt: selectedMode === "hard",
      extraClass: "bb-build-text"
    });

    buildText.className = buildRender.className;
    buildText.innerHTML = buildRender.html;

    fitBibleBugsBuildText();
  }

  function fitBibleBugsBuildText() {
    if (state.buildFitDone) return;

    requestAnimationFrame(() => {
      const build = document.getElementById("bbBuild");
      const text = document.getElementById("bbBuildText");
      if (!build || !text) return;

      const result = shell.fitBuildTextOnce({
        buildEl: build,
        textEl: text,
        buildArea: BUILD_AREA
      });

      if (result) state.buildFitDone = true;
    });
  }

  function clearBuildTextFit(text) {
    if (!text) return;

    text.style.fontSize = "";
    text.style.lineHeight = "";
    text.style.maxWidth = "";
    text.style.width = "";
    text.style.marginLeft = "";
    text.style.marginRight = "";

    delete text.dataset.vmFitFontSize;
    delete text.dataset.vmFitMaxWidth;
    delete text.dataset.vmFitLineHeight;
    delete text.dataset.vmFitLines;
    delete text.dataset.vmFitArea;
  }

  function updatePhase() {
    state.phase = shell.getPhaseForProgress({
      progressIndex: state.progressIndex,
      wordCount: buildData.words.length,
      totalSegments: buildData.segments.length,
      bookLabel: buildData.bookLabel,
      referenceLabel: buildData.referenceLabel
    });
  }

  function currentTarget() {
    return buildData.segments[state.progressIndex] || "";
  }

  function getDecoysForPhase(phase, correctLabel, count) {
    const out = [];
    const seen = new Set([shell.normalizeWord(correctLabel)]);

    function addDecoys(list) {
      for (const item of list || []) {
        const key = shell.normalizeWord(item);
        if (!key || seen.has(key)) continue;

        seen.add(key);
        out.push(item);

        if (out.length >= count) break;
      }
    }

    if (phase === "words") {
      if (selectedMode === "easy") {
        addDecoys(shell.getFunWordDecoys(correctLabel, buildData.words, count));
      } else {
        addDecoys(shell.getVerseWordDecoys({
          words: buildData.words,
          correct: correctLabel,
          targetIndex: state.progressIndex,
          count,
          avoidNext: 2,
          fallbackToFun: true
        }));

        if (out.length < count) {
          addDecoys(shell.getFunWordDecoys(correctLabel, buildData.words, count * 2));
        }

        if (out.length < count) {
          addDecoys(shell.getFunDecoys());
        }
      }
    } else if (phase === "book") {
      addDecoys(shell.getBookDecoys(correctLabel, count));
    } else if (phase === "reference") {
      addDecoys(shell.getReferenceDecoys(parsedRef, selectedMode, count + 4));
    }

    if (out.length < count) {
      addDecoys(shell.getFunWordDecoys(correctLabel, buildData.words, count * 3));
    }

    if (out.length < count) {
      addDecoys(shell.getFunDecoys());
    }

    return out.slice(0, count);
  }

  function getChoices() {
    updatePhase();

    const correctLabel = currentTarget();
    const phase = state.phase;
    const decoys = getDecoysForPhase(phase, correctLabel, 2);
    const labels = shell.shuffle([correctLabel, ...decoys]).slice(0, 3);

    return labels.map((label) => ({
      text: label,
      correct: label === correctLabel
    }));
  }

  function startTutorial() {
    const now = performance.now();

    state.tutorialActive = true;
    state.tutorialStep = "waiting";
    state.waveStatus = "tutorial";
    state.bugs = [];
    state.bonusBugs = [];
    state.tongue = null;
    state.reaction = null;

    state.tutorialBug = {
      id: "tutorial-bug",
      text: "",
      correct: true,
      tutorial: true,
      emoji: "🐞",
      imgSrc: VERSE_BUG_IMAGE_PATHS[1] || BUG_IMAGE_PATHS[1],
      xRatio: 0.5,
      yRatio: 0.36,
      bornAt: now,
      status: "tutorial",
      poofAt: 0,
      selected: false,
      eaten: false,
      pullPoofed: false,
      motionPhase: Math.random() * Math.PI * 2,
      jitterSeed: Math.random() * Math.PI * 2
    };

    showOverlay("TAP THE BUG\nTO EAT IT!", 60000, "is-tutorial");
  }

  function handleTutorialTap(id) {
    if (!state.tutorialActive || state.tutorialStep !== "waiting") return;

    const bug = state.tutorialBug;
    if (!bug || bug.id !== id || bug.status !== "tutorial") return;

    const now = performance.now();
    playTongueSound();

    state.tutorialStep = "eating";
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.overlayClass = "";
    state.overlayRenderKey = "";
    state.waveStatus = "tutorial_eating";
    state.frogChompUntil = now + 280;

    bug.status = "eating";
    fireTongueToBug(bug, now, TUTORIAL_EAT_MS, false, 0);

    scheduleAction(TUTORIAL_EAT_MS, finishTutorialEat);
  }

  function finishTutorialEat() {
    if (!state.tutorialActive) return;

    const now = performance.now();

    playRandomBugPopSound();

    state.tongue = null;
    state.tutorialBug = null;
    state.tutorialStep = "go";
    state.waveStatus = "tutorial_go";
    state.frogChompUntil = now + 280;

    showOverlay("GO!", TUTORIAL_GO_MS, "is-go");

    scheduleAction(TUTORIAL_GO_MS, finishTutorialGo);
  }

  function finishTutorialGo() {
    if (!state.tutorialActive) return;

    state.tutorialActive = false;
    state.tutorialStep = "";
    state.tutorialBug = null;
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.overlayClass = "";
    state.overlayRenderKey = "";

    if (!state.done && !state.bonusMode && !state.bonusIntroActive) {
      spawnWave();
    }
  }

  function spawnWave() {
    updatePhase();

    if (state.phase === "done") {
      startBonusIntro();
      return;
    }

    const now = performance.now();
    const choices = getChoices();
    const timing = MODE_TIMING[selectedMode] || MODE_TIMING.medium;
    const fallMs = timing.fallSeconds * 1000;
    const shuffledLanes = shell.shuffle(LANES);
    const shuffledBugImages = shell.shuffle(VERSE_BUG_IMAGE_PATHS);
    const staggerMs = 145;

    state.waveId += 1;
    state.waveStatus = "falling";
    state.tongue = null;
    state.bugs = choices.map((choice, index) => ({
      id: `w${state.waveId}-${index}`,
      text: choice.text,
      correct: choice.correct,
      emoji: BUG_EMOJIS[(state.waveId + index) % BUG_EMOJIS.length],
      imgSrc: shuffledBugImages[index % shuffledBugImages.length],
      xRatio: shuffledLanes[index] || LANES[index] || 0.5,
      startY: -0.06,
      endY: 0.76,
      bornAt: now + index * staggerMs,
      fallMs,
      status: "falling",
      poofAt: 0,
      selected: false,
      eaten: false,
      pullPoofed: false,
      motionPhase: Math.random() * Math.PI * 2,
      jitterSeed: Math.random() * Math.PI * 2
    }));
  }

  function handleBugTap(id) {
    if (state.paused || state.done || state.bonusIntroActive) return;

    if (state.tutorialActive) {
      handleTutorialTap(id);
      return;
    }

    if (state.bonusMode) {
      handleBonusTap(id);
      return;
    }

    if (state.waveStatus !== "falling") return;

    const bug = state.bugs.find((item) => item.id === id);
    if (!bug || bug.status !== "falling") return;

    const now = performance.now();
    playTongueSound();
    state.waveStatus = "eating";

    for (const item of state.bugs) {
      if (item.id === id) {
        item.selected = true;
        item.status = "eating";
      } else {
        addBugPoof(item, now);
        item.status = "poof";
        item.poofAt = now;
      }
    }

    const tongueStreak = bug.correct ? state.currentStreak + 1 : 0;

    if (bug.correct) {
      maybePlayTongueUpgradeSound(state.currentStreak, tongueStreak);
    }

    fireTongueToBug(bug, now, MAIN_EAT_MS, false, tongueStreak);

    scheduleAction(MAIN_EAT_MS, () => finishMainEat(bug));
  }

  function finishMainEat(bug) {
    const isCorrect = !!bug.correct;
    const now = performance.now();

    playRandomBugPopSound();

    state.tongue = null;
    state.spitParticles = [];
    state.bugs = [];
    state.waveStatus = "resolving";
    state.frogChompUntil = now + 280;

    if (isCorrect) {
      state.currentStreak += 1;
      state.maxStreak = Math.max(state.maxStreak, state.currentStreak);

      state.progressIndex = Math.min(buildData.segments.length, state.progressIndex + 1);
      state.correctEaten += 1;
      updatePhase();
      updateBuildText();
      showReaction("correct");
    } else {
      state.currentStreak = 0;

      state.mistakes += 1;
      state.buildShakeUntil = now + 320;
      addSpitSpray(now);
      showReaction("incorrect");
    }

    if (!state.done && !state.bonusMode && !state.bonusIntroActive) {
      spawnWave();
    }
  }


  function missCorrectBug() {
    const now = performance.now();
    state.waveStatus = "missed";
    state.misses += 1;
    state.currentStreak = 0;
    state.fieldFlashUntil = now + 240;

    for (const bug of state.bugs) {
      addBugPoof(bug, now);
      bug.status = "poof";
      bug.poofAt = now;
    }



    const timing = MODE_TIMING[selectedMode] || MODE_TIMING.medium;
    scheduleAction(timing.missDelay, () => {
      if (!state.done && !state.bonusMode && !state.bonusIntroActive) spawnWave();
    });
  }

  function fireTongueToBug(bug, now, duration, isBonus, streakForTongue = 0) {
    const frog = getFrogPoint();
    const bugPoint = getBugPoint(bug, now, { ignoreEat: true });

    if (bug) {
      bug.eatFromX = bugPoint.x;
      bug.eatFromY = bugPoint.y;
      bug.eatToX = frog.x;
      bug.eatToY = frog.y;
      bug.eatStartedAt = now;
      bug.eatDuration = duration;
      bug.pullPoofed = false;
    }

    state.tongue = {
      fromX: frog.x,
      fromY: frog.y,
      toX: bugPoint.x,
      toY: bugPoint.y,
      startedAt: now,
      duration,
      isBonus: !!isBonus,
      streak: Number(streakForTongue) || 0,
      lastSparkAt: 0,
      wavePhase: Math.random() * Math.PI * 2
    };
  }

  function getFrogPoint() {
    const field = document.getElementById("bbField");
    const frogImg = document.querySelector("#bbFrog .bb-frog-img:not([hidden])");
    const frog = document.getElementById("bbFrog");
    const target = frogImg || frog;

    if (field && target) {
      const fieldRect = field.getBoundingClientRect();
      const frogRect = target.getBoundingClientRect();

      return {
        x: frogRect.left - fieldRect.left + frogRect.width * 0.5,
        y: frogRect.top - fieldRect.top + frogRect.height * 0.25
      };
    }

    return {
      x: state.fieldWidth * 0.5,
      y: state.fieldHeight * 0.84
    };
  }

  function getBugPoint(bug, now = performance.now(), options = {}) {
    if (!bug) return { x: state.fieldWidth * 0.5, y: state.fieldHeight * 0.35 };

    if (bug.status === "eating" && !options.ignoreEat && Number.isFinite(bug.eatFromX)) {
      const duration = Math.max(1, Number(bug.eatDuration) || MAIN_EAT_MS);
      const elapsed = Math.max(0, now - (Number(bug.eatStartedAt) || now));
      const pullStart = duration * 0.44;
      const pullWindow = Math.max(1, duration - pullStart);
      const pullT = shell.clamp((elapsed - pullStart) / pullWindow, 0, 1);
      const eased = easeInCubic(pullT);

      return {
        x: bug.eatFromX + (bug.eatToX - bug.eatFromX) * eased,
        y: bug.eatFromY + (bug.eatToY - bug.eatFromY) * eased
      };
    }

    return {
      x: (bug.xRatio || 0.5) * state.fieldWidth,
      y: (bug.yRatio || 0.35) * state.fieldHeight
    };
  }

  function showReaction(type) {
    const now = performance.now();
    const timing = MODE_TIMING[selectedMode] || MODE_TIMING.medium;
    const duration = Math.max(420, Number(timing.reactionMs) || 580);

    state.reaction = {
      type,
      startedAt: now,
      duration,
      until: now + duration
    };

    if (type === "correct") {
      playGameSound("correct");
    } else if (type === "incorrect") {
      playGameSound("incorrect");
    }
  }

  function showOverlay(message, ms, extraClass = "") {
    state.overlayMessage = message;
    state.overlayUntil = performance.now() + ms;
    state.overlayClass = extraClass;
    state.overlayRenderKey = "";
  }

  function updateChosenBugSmokePoofs(now) {
    function maybePoofBug(bug) {
      if (!bug || bug.status !== "eating" || bug.pullPoofed) return;

      const duration = Math.max(1, Number(bug.eatDuration) || MAIN_EAT_MS);
      const elapsed = Math.max(0, now - (Number(bug.eatStartedAt) || now));
      const pullStart = duration * 0.44;

      if (elapsed < pullStart) return;

      addBugSmokePoof(bug, now);
      bug.pullPoofed = true;
    }

    for (const bug of state.bugs) {
      maybePoofBug(bug);
    }

    maybePoofBug(state.tutorialBug);

    for (const bug of state.bonusBugs) {
      maybePoofBug(bug);
    }
  }

  function addBugSmokePoof(bug, now = performance.now()) {
    if (!bug) return;

    const point = getBugPoint(bug, now);
    const count = 14;

    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index / count) + (Math.random() - 0.5) * 0.6;
      const speed = Math.min(state.fieldWidth, state.fieldHeight) * (0.12 + Math.random() * 0.16);
      const life = 260 + Math.random() * 130;

      state.poofParticles.push({
        id: `smoke-poof-${now}-${index}-${Math.random()}`,
        x: point.x + (Math.random() - 0.5) * 10,
        y: point.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 12 + Math.random() * 18,
        bornAt: now,
        life,
        spin: (Math.random() - 0.5) * 90,
        emoji: ""
      });
    }

    if (state.poofParticles.length > 100) {
      state.poofParticles.splice(0, state.poofParticles.length - 100);
    }
  }

  function addBugPoof(bug, now = performance.now()) {
    if (!bug) return;

    const point = getBugPoint(bug, now);
    const count = 12;

    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index / count) + (Math.random() - 0.5) * 0.45;
      const speed = Math.min(state.fieldWidth, state.fieldHeight) * (0.16 + Math.random() * 0.18);
      const life = 320 + Math.random() * 160;

      state.poofParticles.push({
        id: `poof-${now}-${index}-${Math.random()}`,
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 9 + Math.random() * 14,
        bornAt: now,
        life,
        spin: (Math.random() - 0.5) * 140,
        emoji: Math.random() < 0.22 ? "✨" : ""
      });
    }

    if (state.poofParticles.length > 80) {
      state.poofParticles.splice(0, state.poofParticles.length - 80);
    }
  }

  function getBonusMultiplierForStreak(streak) {
    const value = Number(streak) || 0;

    if (value >= 10) return 3;
    if (value >= 5) return 2;

    return 1;
  }

  function getRandomStinkSwatch() {
    return BONUS_STINK_SWATCHES[Math.floor(Math.random() * BONUS_STINK_SWATCHES.length)] || BONUS_STINK_SWATCHES[0];
  }

  function maybeEmitAmbientStink(bug, now = performance.now()) {
    if (!bug || bug.kind !== "stink" || bug.status !== "bonus") return;
    if (now < (Number(bug.nextStinkAt) || 0)) return;

    const point = getBugPoint(bug, now, { ignoreEat: true });

    addStinkCloud(point.x, point.y - 4, now, {
      count: 2 + (Math.random() < 0.35 ? 1 : 0),
      minSize: 4,
      maxSize: 8,
      lifeMin: 480,
      lifeMax: 760,
      spreadX: 12,
      spreadY: 8,
      speedMin: 0.05,
      speedMax: 0.10,
      verticalLift: 16,
      kind: "ambient"
    });

    bug.nextStinkAt = now + BONUS_STINK_IDLE_INTERVAL_MS + Math.random() * 110;
  }

  function addStinkCloud(x, y, now = performance.now(), options = {}) {
    const count = Math.max(1, Number(options.count) || 11);
    const minField = Math.min(state.fieldWidth || 320, state.fieldHeight || 420);
    const minSize = Number(options.minSize) || Math.max(8, minField * 0.030);
    const maxSize = Number(options.maxSize) || Math.max(14, minField * 0.055);
    const lifeMin = Number(options.lifeMin) || 720;
    const lifeMax = Number(options.lifeMax) || 1080;
    const spreadX = Number(options.spreadX) || 22;
    const spreadY = Number(options.spreadY) || 18;
    const speedMin = Number(options.speedMin) || 0.10;
    const speedMax = Number(options.speedMax) || 0.18;
    const verticalLift = Number(options.verticalLift) || 22;
    const kind = options.kind || "burst";

    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const speed = minField * (speedMin + Math.random() * (speedMax - speedMin));
      const size = minSize + Math.random() * Math.max(1, maxSize - minSize);
      const life = lifeMin + Math.random() * Math.max(1, lifeMax - lifeMin);
      const swatch = getRandomStinkSwatch();
      const styleType = kind === "burst" ? BONUS_STINK_BURST_STYLE : BONUS_STINK_AMBIENT_STYLE;
      const opacityFactor = styleType === "simple"
        ? 0.46 + Math.random() * 0.34
        : 1;

      state.stinkParticles.push({
        id: `stink-${now}-${index}-${Math.random()}`,
        x: x + (Math.random() - 0.5) * spreadX,
        y: y + (Math.random() - 0.5) * spreadY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        bornAt: now,
        life,
        wobble: Math.random() * Math.PI * 2,
        lift: verticalLift,
        fill: swatch.fill,
        edge: swatch.edge,
        glow: swatch.glow,
        opacityFactor,
        styleType,
        kind
      });
    }

    if (state.stinkParticles.length > 100) {
      state.stinkParticles.splice(0, state.stinkParticles.length - 100);
    }
  }



  function addBonusScorePop(x, y, label = "+1", kind = "positive") {
    const now = performance.now();

    state.bonusScorePops.push({
      id: `bonus-score-pop-${now}-${Math.random()}`,
      x,
      y,
      label,
      kind,
      bornAt: now,
      life: 760,
      driftX: (Math.random() - 0.5) * 18,
      driftY: -42 - Math.random() * 18
    });

    if (state.bonusScorePops.length > 24) {
      state.bonusScorePops.splice(0, state.bonusScorePops.length - 24);
    }
  }


  function addSpitSpray(now = performance.now()) {
    const origin = getFrogPoint();
    const count = 22;

    for (let index = 0; index < count; index += 1) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.05;
      const baseAngle = -Math.PI / 2 + spread;
      const speed = Math.min(state.fieldWidth, state.fieldHeight) * (0.32 + Math.random() * 0.42);
      const life = 360 + Math.random() * 220;

      state.spitParticles.push({
        id: `spit-${now}-${index}-${Math.random()}`,
        x: origin.x,
        y: origin.y,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed,
        size: 4 + Math.random() * 7,
        bornAt: now,
        life
      });
    }
  }

  function scheduleAction(delayMs, fn) {
    state.scheduledActions.push({
      at: performance.now() + Math.max(0, Number(delayMs) || 0),
      fn
    });
  }

  function runScheduledActions(now) {
    const ready = [];
    state.scheduledActions = state.scheduledActions.filter((action) => {
      if (now >= action.at) {
        ready.push(action);
        return false;
      }
      return true;
    });

    for (const action of ready) {
      try { action.fn(); }
      catch (err) { console.error("Bible Bugs scheduled action failed", err); }
    }
  }

  function startBonusIntro() {
    if (state.bonusIntroActive || state.bonusMode || state.done) return;

    state.waveStatus = "bonus_intro";
    state.bugs = [];
    state.tongue = null;
    state.reaction = null;
    state.bonusIntroActive = true;
    state.bonusIntroUntil = performance.now() + 1700;
    playGameSound("bonusStart");
    showOverlay("", 0);
  }

  function startBonusRound() {
    state.bonusIntroActive = false;
    state.bonusMode = true;
    state.bonusEndsAt = performance.now() + BONUS_SECONDS * 1000;
    state.bonusBugs = [];
    state.bonusEating = false;
    state.bonusSpawnPendingCount = 0;
    state.bonusScore = 0;
    state.bonusCorrectStreak = 0;
    state.bonusMultiplier = 1;
    state.bonusScorePops = [];
    state.stinkParticles = [];
    state.bugsEaten = 0;

    updateBuildText();

    for (const delay of BONUS_INITIAL_STAGGER_MS) {
      scheduleBonusSpawn(delay);
    }
  }

  function getBonusSpawnSlotCount() {
    return state.bonusBugs.length + Math.max(0, Number(state.bonusSpawnPendingCount) || 0);
  }

  function scheduleBonusSpawn(delayMs = 0) {
    if (!state.bonusMode || state.done) return;
    if (performance.now() >= state.bonusEndsAt) return;
    if (getBonusSpawnSlotCount() >= BONUS_MAX_BUGS) return;

    state.bonusSpawnPendingCount += 1;

    scheduleAction(delayMs, () => {
      state.bonusSpawnPendingCount = Math.max(0, state.bonusSpawnPendingCount - 1);

      if (!state.bonusMode || state.done || state.paused) return;
      if (performance.now() >= state.bonusEndsAt) return;
      if (state.bonusEating) return;
      if (state.bonusBugs.length >= BONUS_MAX_BUGS) return;

      spawnBonusBug(1);
    });
  }


  function getBonusSpawnSpot(marginX, marginTop, marginBottom) {
    const fieldWidth = state.fieldWidth || 320;
    const fieldHeight = state.fieldHeight || 420;
    const minDistance = Math.max(92, Math.min(fieldWidth, fieldHeight) * 0.34);
    let fallback = null;

    for (let attempt = 0; attempt < 28; attempt += 1) {
      const spot = {
        xRatio: shell.clamp(marginX + Math.random() * (1 - marginX * 2), marginX, 1 - marginX),
        yRatio: shell.clamp(marginTop + Math.random() * (1 - marginTop - marginBottom), marginTop, 1 - marginBottom)
      };

      if (!fallback) fallback = spot;

      const tooClose = state.bonusBugs.some((bug) => {
        if (!bug || bug.status === "poof") return false;

        const dx = (spot.xRatio - bug.xRatio) * fieldWidth;
        const dy = (spot.yRatio - bug.yRatio) * fieldHeight;

        return Math.hypot(dx, dy) < minDistance;
      });

      if (!tooClose) return spot;
    }

    return fallback || { xRatio: 0.5, yRatio: 0.35 };
  }

  function spawnBonusBug(count = 1) {
    if (!state.bonusMode || state.done) return;

    const now = performance.now();
    const marginX = 0.16;
    const marginTop = 0.14;
    const marginBottom = 0.34;
    const spawnCount = Math.max(1, Number(count) || 1);

    for (let index = 0; index < spawnCount; index += 1) {
      if (state.bonusBugs.length >= BONUS_MAX_BUGS) return;
      if (now >= state.bonusEndsAt) return;

      state.bonusBugId += 1;

      const activeStinkExists = state.bonusBugs.some((bug) => {
        return bug && bug.kind === "stink" && bug.status === "bonus";
      });

      const shouldSpawnStink = !activeStinkExists
        && state.bonusBugId > 4
        && Math.random() < BONUS_STINK_CHANCE;

      const kind = shouldSpawnStink ? "stink" : "good";
      const imgSrc = shouldSpawnStink
        ? BONUS_STINK_BUG_IMAGE_PATH
        : BONUS_GOOD_BUG_IMAGE_PATHS[state.bonusBugId % BONUS_GOOD_BUG_IMAGE_PATHS.length];

      const spot = getBonusSpawnSpot(marginX, marginTop, marginBottom);
      const extraLife = Math.random() * BONUS_BUG_EXTRA_LIFE_MS;

      state.bonusBugs.push({
        id: `b${state.bonusBugId}`,
        kind,
        imgSrc,
        emoji: BUG_EMOJIS[state.bonusBugId % BUG_EMOJIS.length],
        xRatio: spot.xRatio,
        yRatio: spot.yRatio,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.055 + Math.random() * 0.055),
        vy: (Math.random() < 0.5 ? -1 : 1) * (0.040 + Math.random() * 0.050),
        baseRotateDeg: -24 + Math.random() * 48,
        bornAt: now,
        expiresAt: now + BONUS_BUG_LIFE_MS + extraLife,
        status: "bonus",
        poofAt: 0,
        pullPoofed: false,
        motionPhase: Math.random() * Math.PI * 2,
        jitterSeed: Math.random() * Math.PI * 2,
        nextStinkAt: kind === "stink" ? now + 90 + Math.random() * 140 : 0
      });
    }
  }

  function handleBonusTap(id) {
    if (!state.bonusMode || state.bonusEating || state.paused || state.done) return;

    const bug = state.bonusBugs.find((item) => item.id === id);
    if (!bug || bug.status !== "bonus") return;

    const now = performance.now();
    playTongueSound();
    const scorePoint = getBugPoint(bug, now, { ignoreEat: true });

    if (bug.kind === "stink") {
      state.bonusEating = true;
      bug.status = "poof";
      bug.poofAt = now;

      state.bonusScore = Math.max(0, state.bonusScore - 1);
      state.bonusCorrectStreak = 0;
      state.bonusMultiplier = 1;
      state.fieldFlashUntil = now + 260;
      state.frogChompUntil = now + 320;

      addBonusScorePop(scorePoint.x, scorePoint.y - 18, "-1", "negative");
      scheduleAction(180, () => playGameSound("stinkBug"));
      addStinkCloud(scorePoint.x, scorePoint.y, now);

      scheduleAction(115, () => addStinkCloud(scorePoint.x, scorePoint.y, performance.now()));
      scheduleAction(230, () => addStinkCloud(scorePoint.x, scorePoint.y, performance.now()));

      scheduleAction(560, () => {
        state.bonusBugs = state.bonusBugs.filter((item) => item.id !== bug.id);
        state.bonusEating = false;
        scheduleBonusSpawn(160 + Math.random() * 320);
      });

      return;
    }

    state.bonusEating = true;
    bug.status = "eating";
    state.bugsEaten += 1;

    const previousBonusMultiplier = state.bonusMultiplier;

    state.bonusCorrectStreak += 1;
    state.bonusMultiplier = getBonusMultiplierForStreak(state.bonusCorrectStreak);

    if (state.bonusMultiplier > previousBonusMultiplier) {
      playGameSound("streak");
    }

    const awardedPoints = state.bonusMultiplier;
    state.bonusScore += awardedPoints;

    addBonusScorePop(scorePoint.x, scorePoint.y - 18, `+${awardedPoints}`, "positive");

    fireTongueToBug(bug, now, BONUS_EAT_MS, true, state.bonusCorrectStreak);

    scheduleAction(BONUS_EAT_MS, () => {
      playRandomBugPopSound();

      state.tongue = null;
      state.bonusBugs = state.bonusBugs.filter((item) => item.id !== bug.id);
      state.bonusEating = false;
      scheduleBonusSpawn(120 + Math.random() * 260);
    });
  }


  function update(dt, now) {
    runScheduledActions(now);

    state.spitParticles = state.spitParticles.filter((particle) => now - particle.bornAt < particle.life);

    state.poofParticles = state.poofParticles.filter((particle) => now - particle.bornAt < particle.life);

    state.stinkParticles = state.stinkParticles.filter((particle) => now - particle.bornAt < particle.life);

    updateTongueSparkles(now);
    state.tongueSparkles = state.tongueSparkles.filter((particle) => now - particle.bornAt < particle.life);

    state.bonusScorePops = state.bonusScorePops.filter((pop) => now - pop.bornAt < pop.life);

    updateChosenBugSmokePoofs(now);

    if (state.bonusIntroActive && now >= state.bonusIntroUntil) {
      startBonusRound();
    }

    if (state.waveStatus === "falling") {
      let correctMissed = false;

      for (const bug of state.bugs) {
        if (bug.status !== "falling") continue;
        const t = shell.clamp((now - bug.bornAt) / bug.fallMs, 0, 1);
        bug.yRatio = bug.startY + (bug.endY - bug.startY) * t;
        if (t >= 1 && bug.correct) correctMissed = true;
      }

      if (correctMissed) missCorrectBug();
    }

    updateBonusBug(dt, now);

    if (state.reaction && now >= state.reaction.until) {
      state.reaction = null;
    }

    if (state.bonusMode && now >= state.bonusEndsAt) {
      if (!state.bonusEating && state.bonusBugs.length === 0) {
        finishGame();
      }
    }
  }

  function updateBonusBug(dt, now) {
    if (!state.bonusMode) return;

    const fieldRatio = state.fieldWidth && state.fieldHeight ? state.fieldWidth / state.fieldHeight : 0.75;

    for (const bug of state.bonusBugs) {
      if (bug.status === "bonus") {
        bug.xRatio += bug.vx * dt;
        bug.yRatio += bug.vy * dt * fieldRatio;

        if (bug.xRatio < 0.12 || bug.xRatio > 0.88) {
          bug.vx *= -1;
          bug.xRatio = shell.clamp(bug.xRatio, 0.12, 0.88);
        }

        if (bug.yRatio < 0.14 || bug.yRatio > 0.66) {
          bug.vy *= -1;
          bug.yRatio = shell.clamp(bug.yRatio, 0.14, 0.66);
        }

        maybeEmitAmbientStink(bug, now);

        if (now >= bug.expiresAt) {
          bug.status = "poof";
          bug.poofAt = now;
        }
      }
    }

    state.bonusBugs = state.bonusBugs.filter((bug) => {
      return !(bug.status === "poof" && now - bug.poofAt > 560);
    });

    if (state.bonusMode && now < state.bonusEndsAt && !state.bonusEating && getBonusSpawnSlotCount() < BONUS_MAX_BUGS) {
      scheduleBonusSpawn(140 + Math.random() * 360);
    }
  }

  function startLoop() {
    cancelAnimationFrame(state.rafId);
    state.lastTs = 0;
    state.rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    state.running = false;
  }

  function loop(ts) {
    if (!state.running) return;

    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - state.lastTs) / 1000));
    state.lastTs = ts;

    if (!state.paused) {
      update(dt, ts);
    }

    renderFrame();
    state.rafId = requestAnimationFrame(loop);
  }

  function finishGame() {
    if (state.done) return;

    state.done = true;
    state.tutorialActive = false;
    state.tutorialStep = "";
    state.tutorialBug = null;
    state.bonusMode = false;
    state.bonusIntroActive = false;
    state.bonusBugs = [];
    state.bonusSpawnPendingCount = 0;
    state.tongue = null;
    state.spitParticles = [];
    state.poofParticles = [];
    state.stinkParticles = [];
    state.tongueSparkles = [];
    state.bonusScorePops = [];
    state.bonusScoreRevealActive = true;
    bonusRevealContinuePending = false;
    state.bugs = [];

    playGameSound("bonusEnd");

    renderFrame();

    if (!completionMarked) {
      completionMarked = true;

      bonusRevealCompletionPromise = window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: selectedMode,
        stats: {
          correctEaten: state.correctEaten,
          mistakes: state.mistakes,
          misses: state.misses,
          bugsEaten: state.bugsEaten,
          bonusScore: state.bonusScore
        }
      }).then((result) => {
        completionResult = result;
      }).catch((err) => {
        console.error("completeGameRun failed", err);
        completionResult = null;
      });
    } else {
      bonusRevealCompletionPromise = Promise.resolve();
    }
  }

  async function continueAfterBonusScoreReveal() {
    if (!state.bonusScoreRevealActive || bonusRevealContinuePending) return;

    bonusRevealContinuePending = true;

    try {
      await bonusRevealCompletionPromise;
    } catch (err) {
      console.error("Bonus reveal completion wait failed", err);
    }

    state.bonusScoreRevealActive = false;
    bonusRevealContinuePending = false;
    renderEndScreen();
  }

  

  function renderEndScreen() {
    stopLoop();

    const earnedMedalIconHtml = completionResult?.newlyCompleted
      ? medalIconHtmlForMode(selectedMode)
      : "";

    shell.renderCompleteScreen({
      app,
      icon: GAME_ICON,
      iconHtml: earnedMedalIconHtml,
      gameIcon: GAME_ICON,
      mode: selectedMode,
      verseId: ctx.verseId,
      gameId: GAME_ID,
      completion: completionResult,
      gameMessage: `Bugs eaten: ${state.bugsEaten}`,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: () => {
        playUiTapAndUnlock();
        renderModeSelect();
      },
      onMoreGames: () => {
        playUiTapAndUnlock();
        window.VerseGameBridge.exitGame();
      },
      onChangeVerse: () => {
        playUiTapAndUnlock();
        window.VerseGameBridge.returnToTitle();
      }
    });
  }

  function renderBonusScoreReveal() {
    if (!state.bonusScoreRevealActive) return "";

    const score = Math.max(0, Number(state.bonusScore) || 0);

    return `
      <div class="bb-bonus-score-reveal">
        <div class="bb-bonus-score-card">
          <div class="bb-bonus-score-title">BONUS SCORE!</div>
          <div class="bb-bonus-score-line">
            <img class="bb-bonus-score-bug" src="${escapeHtml(BUG_IMAGE_PATHS[3])}" alt="" aria-hidden="true">
            <span class="bb-bonus-score-x">×</span>
            <span class="bb-bonus-score-number">${score}</span>
          </div>
        </div>
        <div class="bb-bonus-continue-prompt">Tap to Continue</div>
      </div>
    `;
  }


  function renderBonusHud() {
    const score = Math.max(0, Number(state.bonusScore) || 0);
    const multiplier = Math.max(1, Number(state.bonusMultiplier) || 1);
    const multiplierClass = multiplier >= 3 ? " is-three" : multiplier >= 2 ? " is-two" : "";
    const multiplierHtml = multiplier > 1
      ? `<span class="bb-bonus-hud-multiplier${multiplierClass}">${multiplier}X</span>`
      : "";

    return `
      <div class="bb-bonus-hud-card" aria-label="Bonus score ${score}">
        <img class="bb-bonus-hud-bug" src="${escapeHtml(BUG_IMAGE_PATHS[3])}" alt="" aria-hidden="true">
        <span class="bb-bonus-hud-x">×</span>
        <span class="bb-bonus-hud-score">${score}</span>
        ${multiplierHtml}
      </div>
    `;
  }


  function renderFrame() {
    const field = document.getElementById("bbField");
    const waterSvg = document.getElementById("bbWaterWaveSvg");
    const play = document.getElementById("bbPlayLayer");
    const effects = document.getElementById("bbEffectsLayer");
    const frogTongueSlot = document.getElementById("bbFrogTongueSlot");
    const reactionLayer = document.getElementById("bbReactionLayer");
    const bonusScoreRevealLayer = document.getElementById("bbBonusScoreRevealLayer");
    const overlay = document.getElementById("bbOverlay");
    const bonusIntro = document.getElementById("bbBonusIntroOverlay");
    const statusPill = document.getElementById("bbStatusPill");
    const build = document.getElementById("bbBuild");
    const frog = document.getElementById("bbFrog");

    if (!field || !waterSvg || !play || !effects || !frogTongueSlot || !reactionLayer || !bonusScoreRevealLayer || !overlay || !bonusIntro || !statusPill || !build || !frog) return;

    const now = performance.now();
    field.classList.toggle("is-flash-bad", now < state.fieldFlashUntil);
    build.classList.toggle("is-shake", now < state.buildShakeUntil);
    frog.classList.toggle("is-chomping", now < state.frogChompUntil);

    renderWaterWaves(waterSvg, now);

    play.innerHTML = renderBugs();
    frogTongueSlot.innerHTML = renderTongue(now);
    effects.innerHTML = renderStinkParticles(now) + renderSpitParticles(now) + renderPoofParticles(now) + renderTongueSparkles(now) + renderBonusScorePops(now);
    reactionLayer.innerHTML = renderReaction(now);
    bonusScoreRevealLayer.innerHTML = "";

    renderOverlay(now, overlay);

    const showBonusIntro = state.bonusIntroActive && now < state.bonusIntroUntil;
    bonusIntro.classList.toggle("is-open", showBonusIntro);
    bonusIntro.setAttribute("aria-hidden", showBonusIntro ? "false" : "true");

    statusPill.classList.toggle("is-bonus-hud", state.bonusMode);
    statusPill.classList.toggle("is-verse-hidden", !state.bonusMode);
    statusPill.innerHTML = state.bonusMode ? renderBonusHud() : "";
  }

  function renderOverlay(now, overlay) {
    if (!overlay) return;

    if (state.bonusScoreRevealActive) {
      const key = `bonus-score-reveal|${state.bonusScore}|${state.bugsEaten}|${state.bonusMultiplier}`;

      if (state.overlayRenderKey !== key) {
        state.overlayRenderKey = key;
        overlay.innerHTML = renderBonusScoreReveal();
      }

      return;
    }

    const isVisible = now < state.overlayUntil && !!state.overlayMessage;
    const key = isVisible
      ? `${state.overlayMessage}|${state.overlayClass}|visible`
      : "hidden";

    if (state.overlayRenderKey === key) return;

    state.overlayRenderKey = key;

    if (!isVisible) {
      overlay.innerHTML = "";
      return;
    }

    const overlayClass = state.overlayClass ? ` ${escapeHtml(state.overlayClass)}` : "";

    overlay.innerHTML = `<div class="bb-overlay-bubble${overlayClass}">${escapeHtml(state.overlayMessage).replace(/\n/g, "<br>")}</div>`;
  }


  function renderBugs() {
    const items = [];
    const now = performance.now();

    for (const bug of state.bugs) {
      if (bug.status === "gone" || bug.status === "poof") continue;
      items.push(renderBugButton(bug, now, false));
    }

    if (state.tutorialBug) {
      items.push(renderBugButton(state.tutorialBug, now, false));
    }

    for (const bug of state.bonusBugs) {
      items.push(renderBugButton(bug, now, true));
    }

    return items.join("");
  }


  function renderBugButton(bug, now, isBonus) {
    const p = getBugPoint(bug, now);
    const motion = getBugMotionState(bug, now, isBonus);
    const isTutorial = !!bug.tutorial;
    const statusClass = bug.status === "poof" ? " is-poof" : bug.status === "eating" ? " is-eating" : "";
    const bonusClass = isBonus ? ` bb-bug--bonus${bug.kind === "stink" ? " bb-bug--stink" : ""}` : "";
    const popClass = now >= bug.bornAt && now - bug.bornAt < 260 ? " is-pop" : "";
    const word = isBonus || isTutorial ? "" : `<div class="bb-bug-word">${escapeHtml(bug.text)}</div>`;

    const isBonusPoof = isBonus && bug.status === "poof";
    const poofAge = isBonusPoof && Number.isFinite(bug.poofAt)
      ? Math.max(0, now - bug.poofAt)
      : 0;
    const poofT = isBonusPoof ? shell.clamp(poofAge / 560, 0, 1) : 0;
    const poofEase = 1 - Math.pow(1 - poofT, 3);

    const sinkScale = isBonusPoof ? Math.max(0.02, 1 - poofEase * 0.98) : 1;
    const sinkOpacity = isBonusPoof ? Math.max(0, 1 - poofEase) : 1;
    const sinkY = isBonusPoof ? poofEase * 14 : 0;

    function renderRippleRing(delayMs, maxScale, maxOpacity) {
      const ringT = shell.clamp((poofAge - delayMs) / 560, 0, 1);
      const ringEase = 1 - Math.pow(1 - ringT, 3);
      const scale = 0.18 + ringEase * (maxScale - 0.18);
      const opacity = ringT <= 0 ? 0 : Math.max(0, 1 - ringT) * maxOpacity;

      return `<span style="--bb-ripple-scale:${scale.toFixed(3)}; --bb-ripple-opacity:${opacity.toFixed(3)};"></span>`;
    }

    const bonusRipple = isBonusPoof
      ? `<span class="bb-bonus-ripple" aria-hidden="true">
          ${renderRippleRing(0, 2.15, 0.82)}
          ${renderRippleRing(90, 2.35, 0.58)}
          ${renderRippleRing(170, 2.55, 0.38)}
        </span>`
      : "";

    let bugVisual = "";

    if (bug.imgSrc) {
      bugVisual = `<img class="bb-bug-img" src="${escapeHtml(bug.imgSrc)}" alt="" aria-hidden="true" onerror="this.hidden=true;this.nextElementSibling.hidden=false;"><span class="bb-bug-emoji bb-bug-emoji--fallback" hidden aria-hidden="true">${escapeHtml(bug.emoji || "🪰")}</span>`;
    } else {
      bugVisual = `<span class="bb-bug-emoji" aria-hidden="true">${escapeHtml(bug.emoji || "🪰")}</span>`;
    }

    const disabled = isTutorial
      ? state.tutorialStep !== "waiting" ? " disabled" : ""
      : (!isBonus && state.waveStatus !== "falling") || (isBonus && state.bonusEating) ? " disabled" : "";

    const x = p.x + motion.swayX;
    const y = p.y;
    const baseRotateDeg = Number(bug.baseRotateDeg) || 0;
    const rotateDeg = baseRotateDeg + motion.rotateDeg;
    const scaleX = motion.scaleX * sinkScale;
    const scaleY = motion.scaleY * sinkScale;
    const buttonTransform = `rotate(${rotateDeg.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) translateY(${sinkY.toFixed(2)}px)`;
    const buttonOpacity = isBonusPoof ? ` opacity:${sinkOpacity.toFixed(3)};` : "";

    return `
      <div class="bb-bug-wrap${bonusClass}${statusClass}${popClass}" style="--bb-x:${x.toFixed(2)}px; --bb-y:${y.toFixed(2)}px;">
        <button class="bb-bug-btn" type="button" data-bug-id="${escapeHtml(bug.id)}"${disabled} style="transform:${buttonTransform};${buttonOpacity}">
          ${word}
          ${bugVisual}
        </button>
        ${bonusRipple}
      </div>
    `;
  }

  

  function renderWaterWaves(svg, now) {
    if (!svg) return;

    const cfg = WATER_FX;
    const size = cfg.viewSize;
    const spacing = cfg.spacing;
    const rows = Math.ceil(size / spacing) + 4;

    // Seamless loop: phase moves from 0 to 2π, then returns to 0.
    // Because sin(x + 2π) === sin(x), there is no visible jump.
    const loopMs = 7200 / Math.max(0.1, cfg.speed);
    const phase = ((now % loopMs) / loopMs) * Math.PI * 2;

    const paths = [];

    for (let row = -2; row < rows; row += 1) {
      const y = row * spacing + 28;
      const rowPhase = phase + row * 0.72;
      const alt = row % 2 !== 0;
      const d = buildWaterSinePath({
        y,
        size,
        amplitude: cfg.amplitude,
        frequency: cfg.frequency,
        phase: rowPhase,
        slantDeg: cfg.slantDeg,
        segments: cfg.segments
      });

      paths.push(`<path class="bb-water-wave-path${alt ? " is-alt" : ""}" d="${d}"></path>`);
    }

    svg.innerHTML = paths.join("");
  }

  function buildWaterSinePath({ y, size, amplitude, frequency, phase, slantDeg, segments }) {
    const points = [];
    const center = size * 0.5;
    const slant = Math.tan((Number(slantDeg) || 0) * Math.PI / 180);

    for (let index = 0; index <= segments; index += 1) {
      const s = index / segments;

      // Extend beyond the viewBox so the slanted waves do not expose edges.
      const x = -120 + s * (size + 240);
      const baseY = y + (x - center) * slant;
      const wave = Math.sin((Math.PI * 2 * frequency * s) + phase);

      points.push({
        x,
        y: baseY + wave * amplitude
      });
    }

    return points.map((point, index) => {
      const prefix = index === 0 ? "M" : "L";
      return `${prefix}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }).join(" ");
  }

  function renderTongue(now) {
    const t = state.tongue;
    if (!t) return "";

    const frog = document.getElementById("bbFrog");
    const field = document.getElementById("bbField");

    if (!frog || !field) return "";

    const frogRect = frog.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();

    const localFromX = t.fromX - (frogRect.left - fieldRect.left);
    const localFromY = t.fromY - (frogRect.top - fieldRect.top);
    const localToX = t.toX - (frogRect.left - fieldRect.left);
    const localToY = t.toY - (frogRect.top - fieldRect.top);

    const elapsed = now - t.startedAt;
    const half = t.duration / 2;
    let progress = elapsed <= half ? elapsed / half : 1 - ((elapsed - half) / half);
    progress = shell.clamp(progress, 0, 1);

    const eased = easeOutCubic(progress);
    const dxFull = localToX - localFromX;
    const dyFull = localToY - localFromY;
    const fullLength = Math.max(1, Math.hypot(dxFull, dyFull));

    const sparkleTier = getTongueSparkleTier(t.streak);
    const glowClass =
      sparkleTier === "rainbow"
        ? " bb-tongue--rainbow"
        : sparkleTier === "subtle"
          ? " bb-tongue--subtle"
          : "";

    const wave = getTongueWaveConfig(t.streak);

    if (wave && fullLength > 4) {
      const visibleToX = localFromX + dxFull * eased;
      const visibleToY = localFromY + dyFull * eased;
      const dxVisible = visibleToX - localFromX;
      const dyVisible = visibleToY - localFromY;
      const visibleLength = Math.max(1, Math.hypot(dxVisible, dyVisible));
      const dirX = dxVisible / visibleLength;
      const dirY = dyVisible / visibleLength;
      const perpX = -dirY;
      const perpY = dirX;
      const fieldMin = Math.max(1, Math.min(state.fieldWidth, state.fieldHeight));
      const amp = fieldMin * wave.ampRatio * eased;
      const phase = (Number(t.wavePhase) || 0) + elapsed * wave.speed;
      const segments = Math.round(shell.clamp(
        visibleLength / 7 + wave.waves * 8,
        40,
        78
      ));
      const points = [];

      for (let index = 0; index <= segments; index += 1) {
        const s = index / segments;
        const baseX = localFromX + dxVisible * s;
        const baseY = localFromY + dyVisible * s;

        // Envelope keeps the tongue attached cleanly at frog and bug ends.
        const envelope = Math.sin(Math.PI * s);
        const wiggle = Math.sin((Math.PI * 2 * wave.waves * s) + phase);
        const offset = envelope * wiggle * amp;

        points.push({
          x: baseX + perpX * offset,
          y: baseY + perpY * offset
        });
      }

      const path = points.map((point, index) => {
        const prefix = index === 0 ? "M" : "L";
        return `${prefix}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }).join(" ");

      const tipRadius = shell.clamp(fieldMin * 0.026, 8, 14);
      const svgClass = `bb-tongue-svg ${wave.tierClass}${glowClass}`;

      return `
      <svg class="${svgClass}" aria-hidden="true">
        <path class="bb-tongue-svg-glow" d="${path}"></path>
        <path class="bb-tongue-svg-line" d="${path}"></path>
        <circle class="bb-tongue-svg-tip" cx="${visibleToX.toFixed(2)}" cy="${visibleToY.toFixed(2)}" r="${tipRadius.toFixed(2)}"></circle>
      </svg>
    `;
    }

    const length = Math.max(0, fullLength * eased);
    const angle = Math.atan2(dyFull, dxFull) * 180 / Math.PI;

    return `
    <div class="bb-tongue${glowClass}" style="--bb-tongue-x:${localFromX}px; --bb-tongue-y:${localFromY}px; --bb-tongue-l:${length}px; --bb-tongue-a:${angle}deg;">
      <div class="bb-tongue-glow"></div>
      <div class="bb-tongue-line"></div>
      <div class="bb-tongue-tip"></div>
    </div>
  `;
  }

  function renderBonusScorePops(now) {
    if (!state.bonusScorePops.length) return "";

    return state.bonusScorePops.map((pop) => {
      const age = Math.max(0, now - pop.bornAt);
      const lifeT = shell.clamp(age / pop.life, 0, 1);
      const easeOut = 1 - Math.pow(1 - lifeT, 3);
      const x = pop.x + pop.driftX * easeOut;
      const y = pop.y + pop.driftY * easeOut;
      const scale = 0.72 + Math.sin(Math.min(1, lifeT * 2.2) * Math.PI) * 0.32;
      const opacity = lifeT < 0.72 ? 1 : Math.max(0, 1 - ((lifeT - 0.72) / 0.28));
      const kindClass = pop.kind === "negative" ? " is-negative" : " is-positive";

      return `<span class="bb-bonus-score-pop${kindClass}" style="left:${x.toFixed(2)}px; top:${y.toFixed(2)}px; opacity:${opacity.toFixed(3)}; transform:translate(-50%, -50%) scale(${scale.toFixed(3)});">${escapeHtml(pop.label)}</span>`;
    }).join("");
  }

  function renderStinkParticles(now) {
    if (!state.stinkParticles.length) return "";

    return state.stinkParticles.map((particle) => {
      const age = Math.max(0, now - particle.bornAt);
      const lifeT = shell.clamp(age / particle.life, 0, 1);
      const eased = easeOutCubic(lifeT);
      const wobble = Math.sin(particle.wobble + age * 0.012) * (particle.kind === "ambient" ? 5 : 10);
      const t = age / 1000;
      const x = particle.x + particle.vx * t + wobble;
      const y = particle.y + particle.vy * t - eased * (particle.lift || 22);
      const scale = particle.kind === "ambient"
        ? 0.65 + eased * 0.75
        : 0.45 + eased * 1.25;
      const opacityBase = particle.kind === "ambient" ? 0.68 : 0.88;
      const opacityRaw = lifeT < 0.68
        ? opacityBase
        : Math.max(0, opacityBase * (1 - ((lifeT - 0.68) / 0.32)));
      const opacityFactor = Number.isFinite(particle.opacityFactor) ? particle.opacityFactor : 1;
      const opacity = Math.max(0, Math.min(1, opacityRaw * opacityFactor));

      const kindClass = particle.kind === "ambient" ? " is-ambient" : "";
      const styleClass = particle.styleType === "simple" ? " is-simple" : "";

      return `<span class="bb-stink-dot${kindClass}${styleClass}" style="left:${x.toFixed(1)}px; top:${y.toFixed(1)}px; width:${particle.size.toFixed(1)}px; height:${particle.size.toFixed(1)}px; opacity:${opacity.toFixed(3)}; transform:translate(-50%,-50%) scale(${scale.toFixed(3)}); --bb-stink-fill:${particle.fill}; --bb-stink-edge:${particle.edge}; --bb-stink-glow:${particle.glow};"></span>`;
    }).join("");
  }



  function renderSpitParticles(now) {
    if (!state.spitParticles.length) return "";

    const gravity = state.fieldHeight * 1.7;

    return state.spitParticles.map((particle) => {
      const age = Math.max(0, now - particle.bornAt);
      const t = age / 1000;
      const lifeT = shell.clamp(age / particle.life, 0, 1);
      const x = particle.x + particle.vx * t;
      const y = particle.y + particle.vy * t + 0.5 * gravity * t * t;
      const opacity = Math.max(0, 1 - lifeT);
      const scale = 1 - lifeT * 0.35;

      return `<span class="bb-spit-dot" style="left:${x}px; top:${y}px; width:${particle.size}px; height:${particle.size}px; opacity:${opacity}; transform:translate(-50%,-50%) scale(${scale});"></span>`;
    }).join("");
  }

  function getTongueWaveConfig(streak) {
    const value = Number(streak) || 0;

    if (value >= 15) {
      return {
        ampRatio: 0.064,
        waves: 3.35,
        speed: 0.024,
        tierClass: "bb-tongue-svg--legendary"
      };
    }

    if (value >= 12) {
      return {
        ampRatio: 0.052,
        waves: 2.75,
        speed: 0.021,
        tierClass: "bb-tongue-svg--strong"
      };
    }

    if (value >= 10) {
      return {
        ampRatio: 0.042,
        waves: 2.25,
        speed: 0.019,
        tierClass: "bb-tongue-svg--medium"
      };
    }

    if (value >= 8) {
      return {
        ampRatio: 0.030,
        waves: 1.65,
        speed: 0.017,
        tierClass: "bb-tongue-svg--gentle"
      };
    }

    return null;
  }

  function getTongueSparkleTier(streak) {
    const value = Number(streak) || 0;

    if (value >= 5) return "rainbow";
    if (value >= 3) return "subtle";

    return "none";
  }

  function getTongueTipPoint(tongue, now) {
    if (!tongue) {
      return {
        x: state.fieldWidth * 0.5,
        y: state.fieldHeight * 0.75
      };
    }

    const elapsed = now - tongue.startedAt;
    const half = tongue.duration / 2;
    let progress = elapsed <= half ? elapsed / half : 1 - ((elapsed - half) / half);
    progress = shell.clamp(progress, 0, 1);

    const eased = easeOutCubic(progress);

    return {
      x: tongue.fromX + (tongue.toX - tongue.fromX) * eased,
      y: tongue.fromY + (tongue.toY - tongue.fromY) * eased,
      progress,
      extending: elapsed <= half
    };
  }

  function updateTongueSparkles(now) {
    const tongue = state.tongue;
    if (!tongue || tongue.isBonus) return;

    const tier = getTongueSparkleTier(tongue.streak);
    if (tier === "none") return;

    const elapsed = now - tongue.startedAt;
    const half = tongue.duration / 2;

    // Only leave a trail while the tongue is stretching outward.
    if (elapsed < 0 || elapsed > half) return;

    const interval = tier === "rainbow"
      ? TONGUE_FX.rainbowSparkInterval
      : TONGUE_FX.subtleSparkInterval;
    if (tongue.lastSparkAt && now - tongue.lastSparkAt < interval) return;

    tongue.lastSparkAt = now;

    const tip = getTongueTipPoint(tongue, now);
    const count = tier === "rainbow" ? 3 : 2;
    const colors = tier === "rainbow"
      ? ["#ff5ec4", "#ffd34d", "#5ee7ff", "#8cff7a", "#b879ff"]
      : ["#ffffff", "#ffd6ef", "#ff9bd0"];

    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.min(state.fieldWidth, state.fieldHeight) * (0.045 + Math.random() * 0.085);
      const life = tier === "rainbow"
        ? 360 + Math.random() * 140
        : 260 + Math.random() * 100;
      const size = tier === "rainbow"
        ? 6 + Math.random() * 7
        : 3 + Math.random() * 5;

      state.tongueSparkles.push({
        id: `tongue-spark-${now}-${index}-${Math.random()}`,
        x: tip.x + (Math.random() - 0.5) * 8,
        y: tip.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        bornAt: now,
        life,
        color: colors[Math.floor(Math.random() * colors.length)],
        rainbow: tier === "rainbow",
        spin: (Math.random() - 0.5) * 220
      });
    }

    if (state.tongueSparkles.length > 90) {
      state.tongueSparkles.splice(0, state.tongueSparkles.length - 90);
    }
  }

  function renderTongueSparkles(now) {
    if (!state.tongueSparkles.length) return "";

    return state.tongueSparkles.map((particle) => {
      const age = Math.max(0, now - particle.bornAt);
      const t = age / 1000;
      const lifeT = shell.clamp(age / particle.life, 0, 1);
      const eased = easeOutCubic(lifeT);

      const x = particle.x + particle.vx * t;
      const y = particle.y + particle.vy * t;
      const opacity = Math.max(0, 1 - eased);
      const scale = particle.rainbow
        ? 0.65 + eased * 0.75
        : 0.55 + eased * 0.55;
      const rotate = (particle.spin || 0) * lifeT;

      return `<span class="bb-tongue-sparkle${particle.rainbow ? " is-rainbow" : ""}" style="left:${x.toFixed(1)}px; top:${y.toFixed(1)}px; width:${particle.size.toFixed(1)}px; height:${particle.size.toFixed(1)}px; background:${escapeHtml(particle.color)}; opacity:${opacity.toFixed(3)}; transform:translate(-50%,-50%) rotate(${rotate.toFixed(1)}deg) scale(${scale.toFixed(3)});"></span>`;
    }).join("");
  }

  function renderPoofParticles(now) {
    if (!state.poofParticles.length) return "";

    const gravity = state.fieldHeight * 0.32;

    return state.poofParticles.map((particle) => {
      const age = Math.max(0, now - particle.bornAt);
      const t = age / 1000;
      const lifeT = shell.clamp(age / particle.life, 0, 1);
      const eased = easeOutCubic(lifeT);

      const x = particle.x + particle.vx * t;
      const y = particle.y + particle.vy * t + 0.5 * gravity * t * t;
      const opacity = Math.max(0, 1 - eased);
      const scale = 0.45 + eased * 1.05;
      const rotate = (particle.spin || 0) * lifeT;

      if (particle.emoji) {
        return `<span class="bb-poof-spark" style="left:${x}px; top:${y}px; opacity:${opacity.toFixed(3)}; transform:translate(-50%,-50%) rotate(${rotate.toFixed(1)}deg) scale(${scale.toFixed(3)});">${particle.emoji}</span>`;
      }

      return `<span class="bb-poof-dot" style="left:${x}px; top:${y}px; width:${particle.size}px; height:${particle.size}px; opacity:${opacity.toFixed(3)}; transform:translate(-50%,-50%) scale(${scale.toFixed(3)});"></span>`;
    }).join("");
  }

  function renderReaction(now) {
    const reaction = state.reaction;
    if (!reaction || now >= reaction.until) return "";

    const isIncorrect = reaction.type === "incorrect";
    const duration = Math.max(1, Number(reaction.duration) || 580);
    const startedAt = Number(reaction.startedAt) || (reaction.until - duration);
    const age = Math.max(0, now - startedAt);
    const t = shell.clamp(age / duration, 0, 1);

    let scale = 1;
    let rotate = 0;

    if (t < 0.18) {
      const popT = easeOutCubic(t / 0.18);
      scale = 0.55 + (1.14 - 0.55) * popT;
      rotate = isIncorrect ? 5 - 8 * popT : -5 + 8 * popT;
    } else if (t < 0.62) {
      const settleT = easeOutCubic((t - 0.18) / 0.44);
      scale = 1.14 + (1 - 1.14) * settleT;
      rotate = isIncorrect ? -3 + (0 + 3) * settleT : 3 + (0 - 3) * settleT;
    } else {
      const fadeT = easeOutCubic((t - 0.62) / 0.38);
      scale = 1 + 0.08 * fadeT;
      rotate = 0;
    }

    const fadeIn = easeOutCubic(shell.clamp(t / 0.12, 0, 1));
    const fadeOut = shell.clamp((t - 0.72) / 0.28, 0, 1);
    const opacity = Math.max(0, fadeIn * (1 - fadeOut));

    const imgSrc = isIncorrect ? IMAGE_PATHS.frogGross : IMAGE_PATHS.frogHappy;
    const altText = isIncorrect ? "Grossed-out frog" : "Happy frog";
    const fallback = isIncorrect ? "🐸🤢" : "🐸✨";
    const typeClass = isIncorrect ? "bb-reaction--incorrect" : "bb-reaction--correct";

    return `
    <div
      class="bb-reaction ${typeClass}"
      style="opacity:${opacity.toFixed(3)}; transform:translate(-50%, -50%) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(2)}deg);"
    >
      <img class="bb-reaction-img" src="${escapeHtml(imgSrc)}" alt="${altText}" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
      <div class="bb-reaction-fallback" hidden>${fallback}</div>
    </div>
  `;
  }


  function renderFrog() {
    return `
      <div class="bb-frog" id="bbFrog">
        <img class="bb-lilypad-img" src="${escapeHtml(IMAGE_PATHS.lilyPad)}" alt="" aria-hidden="true" onerror="this.hidden=true;">
        <div class="bb-frog-tongue-slot" id="bbFrogTongueSlot"></div>
        <img class="bb-frog-img" src="${escapeHtml(IMAGE_PATHS.frogIdle)}" alt="Frog" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
        <div class="bb-frog-fallback" hidden>🐸</div>
      </div>
    `;
  }

  function getStatusText(now) {
    if (state.bonusMode) {
      const secondsLeft = Math.max(0, Math.ceil((state.bonusEndsAt - now) / 1000));
      return `🐞 ${state.bugsEaten} · ${secondsLeft}s`;
    }

    if (state.bonusIntroActive) return "Bonus!";

    const label = state.phase === "book"
      ? "Book"
      : state.phase === "reference"
        ? "Reference"
        : `${Math.min(state.progressIndex + 1, buildData.words.length)}/${Math.max(1, buildData.words.length)}`;

    return label;
  }

  function getBugMotionState(bug, now = performance.now(), isBonus = false) {
    if (!bug || bug.status === "eating") {
      return {
        swayX: 0,
        rotateDeg: 0,
        scaleX: 1,
        scaleY: 1
      };
    }

    const phase = Number(bug.motionPhase) || 0;
    const elapsed = Math.max(0, now - (Number(bug.bornAt) || now)) / 1000;

    const fieldWidth = Math.max(1, Number(state.fieldWidth) || 1);
    const amount = fieldWidth * BUG_MOTION.sideAmountRatio * (isBonus ? 0.72 : 1);

    // Gentle side-to-side from the sampler.
    const w = elapsed * Math.PI * 2 * BUG_MOTION.sideSpeed;
    const swayX = Math.sin(w + phase) * amount;

    // Gentle rotate from the sampler.
    const rotateDeg = Math.sin(elapsed * 3 + phase) * BUG_MOTION.rotationAmount;

    // Gentle pulse from the sampler. This grows/shrinks both axes together.
    const pulse = Math.sin(elapsed * 4.5 + phase) * BUG_MOTION.squishAmount;

    return {
      swayX,
      rotateDeg,
      scaleX: 1 + pulse,
      scaleY: 1 + pulse
    };
  }

  function easeInQuad(t) { return t * t; }
  function easeInCubic(t) { return t * t * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
