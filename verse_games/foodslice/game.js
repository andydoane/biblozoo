(async function () {
  const app = document.getElementById("app");
  const ctx = await window.VerseGameBridge.getVerseContext();
  const GAME_ID = "foodslice";

  const GAME_TITLE = "Food Slice";
  const GAME_ICON = "🍉";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);

  const GAME_THEME = {
    bg: "#333333",
    accent: "#333333"
  };

  const BUILD_AREA = "large";

  const HELP_OVERLAY_ID = "fsHelpOverlay";

  const BONUS_DURATION_MS = 24000;
  const BONUS_STAGE_MS = BONUS_DURATION_MS / 3;

  const SLICE_EFFECT_TUNING = {
    duration: 240,
    slashDuration: 170,
    dotDuration: 360,
    colors: ["#ffc751", "#ffa351", "#ff5a51"]
  };

  const SOUND_BASE_PATH = "./food_slice_sounds/";

  const SOUND_FILES = {
    bomb: `${SOUND_BASE_PATH}food_slice_bomb.mp3`,
    wrong: `${SOUND_BASE_PATH}food_slice_wrong.mp3`,

    slice1: `${SOUND_BASE_PATH}food_slice_slice_1.mp3`,
    slice2: `${SOUND_BASE_PATH}food_slice_slice_2.mp3`,
    slice3: `${SOUND_BASE_PATH}food_slice_slice_3.mp3`,
    slice4: `${SOUND_BASE_PATH}food_slice_slice_4.mp3`,
    slice5: `${SOUND_BASE_PATH}food_slice_slice_5.mp3`,

    swoosh1: `${SOUND_BASE_PATH}food_slice_swoosh_1.mp3`,
    swoosh2: `${SOUND_BASE_PATH}food_slice_swoosh_2.mp3`,
    swoosh3: `${SOUND_BASE_PATH}food_slice_swoosh_3.mp3`,

    uiTap1: "../../ui_audio/ui_sound_pop_1.mp3",
    uiTap2: "../../ui_audio/ui_sound_pop_2.mp3"
  };

  const SOUND_GROUPS = {
    slice: ["slice1", "slice2", "slice3", "slice4", "slice5"],
    swoosh: ["swoosh1", "swoosh2", "swoosh3"]
  };

  const SOUND_TUNING = {
    masterVolume: 0.85,
    volumes: {
      bomb: 0.9,
      wrong: 0.65,
      slice: 0.72,
      swoosh: 0.42,
      uiTap: 0.45
    },
    minSwooshGapMs: 85
  };

  const TRAIL_TUNING = {
    maxPoints: 13,
    minPointDistance: 10,
    sparkleDuration: 520,
    sparkleSpawnGapMs: 105,
    maxSparkles: 18,
    uniquePalette: ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6"],
    white: {
      colors: ["#ffffff"],
      glow: 0.42,
      sizeMin: 0.055,
      sizeMax: 0.18
    },
    snow: {
      colors: ["#7ed1ff", "#ffffff"],
      glow: 0.78,
      sizeMin: 0.06,
      sizeMax: 0.2
    },
    rainbow: {
      colors: ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6"],
      glow: 0.82,
      sizeMin: 0.065,
      sizeMax: 0.21
    },
    unique: {
      glow: 0.84,
      sizeMin: 0.07,
      sizeMax: 0.22
    },
    sparkle: {
      colors: ["#ffffff", "#7ed1ff"],
      sizeMin: 0.11,
      sizeMax: 0.2,
      glow: 0.88
    }
  };

  const FIREWORK_TUNING = {
    triggerStreak: 15,
    duration: 430,
    sizeScale: 1.24,
    mainRays: 12,
    shortRays: 6,
    sparkles: 8,
    rayThicknessScale: 0.11,
    glow: 0.42,
    rainbowChance: 0.5,
    fallbackColor: "#40b9c5",
    rainbowColors: ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6"]
  };

  const DECOY_TUNING = {
    baseCorrectChance: 0.6,
    softLimitCorrectStreak: 2,
    softLimitCorrectChance: 0.35,
    hardLimitCorrectStreak: 3,
    maxWrongChoicesInRow: 2
  };

  const FS_BOMB_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;

  const FOOD_THEMES = [
    ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🥭", "🍍", "🥥", "🥝"],
    ["🍕", "🍔", "🍟", "🌭", "🍿", "🥓", "🥪", "🥨", "🌮", "🌯", "🥗", "🥘", "🍝", "🍜", "🍲", "🍣", "🍱"],
    ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯"],
    ["🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🥚", "🍳"],
    ["🥦", "🥬", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥑", "🍄", "🥔", "🧅", "🧄"],
    ["🍗", "🍖", "🥩", "🍤", "🦀", "🦞", "🧀", "🥚", "🥛"]
  ];

  const BOOKS = window.VerseGameShell.getBibleBookDecoys();

  const GENERIC_DECOYS = window.VerseGameShell.getFunDecoys();

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

  let selectedMode = null;
  let muted = false;
  let audioCtx = null;
  let audioUnlocked = false;
  let silenceAudio = null;
  let lastSliceSound = "";
  let lastSwooshSound = "";
  let lastSwooshAt = 0;
  let uiSoundFlip = false;
  let lastUiTapAt = 0;
  const soundBuffers = new Map();
  const soundBufferPromises = new Map();
  let completionMarked = false;
  let alreadyCompletedForMode = false;
  let completionResult = null;
  let resizeBound = false;
  let foodSliceZoomLockBound = false;
  let lastFoodSliceTouchEnd = 0;
  let endScreenUnlockTimer = 0;

  const state = {
    running: false,
    paused: false,
    pauseReason: "",
    rafId: 0,
    lastTs: 0,
    fieldWidth: 0,
    fieldHeight: 0,
    fruitHitSize: 96,
    fruitEmojiSize: 56,
    bombHitSize: 84,
    bombEmojiSize: 50,
    sliceSize: 54,
    sliceEmojiSize: 42,
    theme: pickRandom(FOOD_THEMES),
    verseMeta: parseVerseMeta(ctx.verseId || "", ctx.verseRef || ""),
    buildData: null,
    tokens: tokenizeVerseWithSpaces(ctx.verseText || ""),
    wordEntries: [],
    wordsBuilt: 0,
    phase: "words",
    bookBuilt: false,
    referenceBuilt: false,
    buildSizeClass: "is-normal",
    buildFitDone: false,
    activeFruit: null,
    activeBomb: null,
    activeSlices: [],
    activeMessageSlices: [],
    activeSliceEffects: [],
    activeTrailSparkles: [],
    wrongStreak: 0,
    correctStreak: 0,
    correctChoiceStreak: 0,
    buildShakeUntil: 0,
    fieldFlashUntil: 0,
    messageSequence: null,
    messagePill: null,
    bonusRound: false,
    bonusBannerUntil: 0,
    bonusStartedAt: 0,
    bonusEndsAt: 0,
    bonusFruits: [],
    bonusIdCounter: 0,
    bonusCount: 0,
    done: false,
    bookChoices: [],
    referenceChoices: []
  };

  state.buildData = window.VerseGameShell.buildVerseSegments({
    verseText: ctx.verseText || "",
    book: state.verseMeta.book,
    reference: state.verseMeta.reference,
    buildArea: BUILD_AREA
  });

  state.wordEntries = state.buildData.words.map((word) => ({ display: word }));
  state.buildSizeClass = state.buildData.buildSizeClass;

  renderIntro();

  function renderIntro() {
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

  function renderModeSelect() {
    stopLoop();

    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      icon: "🥉🥈🥇",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Food Slice title",
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

  function startGame(mode) {
    void unlockAudio();

    selectedMode = mode;
    completionMarked = false;
    completionResult = null;
    alreadyCompletedForMode = !!window.VerseGameBridge.wasAlreadyCompleted?.(ctx.verseId, GAME_ID, selectedMode);

    state.running = true;
    state.paused = false;
    state.pauseReason = "";
    state.lastTs = 0;
    state.wordsBuilt = 0;
    state.bookBuilt = false;
    state.referenceBuilt = false;
    state.buildFitDone = false;
    updatePhaseFromProgress();
    state.activeFruit = null;
    state.activeBomb = null;
    state.activeSlices = [];
    state.activeMessageSlices = [];
    state.activeSliceEffects = [];
    state.activeTrailSparkles = [];
    state.wrongStreak = 0;
    state.correctStreak = 0;
    state.correctChoiceStreak = 0;
    state.buildShakeUntil = 0;
    state.fieldFlashUntil = 0;
    state.messageSequence = createMessageSequence("intro");
    state.messagePill = null;
    state.bonusRound = false;
    state.bonusBannerUntil = 0;
    state.bonusStartedAt = 0;
    state.bonusEndsAt = 0;
    state.bonusFruits = [];
    state.bonusIdCounter = 0;
    state.bonusCount = 0;
    state.done = false;
    state.theme = pickRandom(FOOD_THEMES);
    state.bookChoices = makeBookChoices(state.verseMeta.book);
    state.referenceChoices = makeReferenceChoices(state.verseMeta, selectedMode);

    app.innerHTML = `
      <div class="fs-shell">
        <div class="fs-stage">
          <div class="fs-build-wrap">
            <div class="fs-build vm-build vm-build--${BUILD_AREA}" id="fsBuild">
              <div class="fs-build-text vm-build-text ${state.buildSizeClass}" id="fsBuildText"></div>
            </div>
          </div>
          <div class="fs-field-wrap">
            <div class="fs-field" id="fsField">
              <div class="fs-play-layer" id="fsPlayLayer"></div>
              <div class="fs-slice-layer" id="fsSliceLayer"></div>
              <div class="fs-firework-layer" id="fsFireworkLayer"></div>
              <div class="fs-bomb-burst-layer" id="fsBombBurstLayer"></div>
              <div class="fs-banner-layer" id="fsBannerLayer"></div>
              <div class="fs-controls-layer">
                <button class="fs-corner-pill fs-corner-left" id="fsMenuPill" type="button" aria-label="Game menu">☰</button>
                <div class="fs-corner-pill fs-corner-right" id="fsPhasePill"></div>
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
    renderHud();
    startLoop();
  }

  function renderEndScreen(reward) {
    stopLoop();

    window.clearTimeout(endScreenUnlockTimer);
    endScreenUnlockTimer = 0;

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
      gameMessage: `Bonus slices: ${state.bonusCount}`,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: () => {
        void unlockAudio();
        playUiTapSound();
        renderModeSelect();
      },
      onMoreGames: () => {
        void unlockAudio();
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
      onChangeVerse: () => {
        void unlockAudio();
        playUiTapSound();
        window.VerseGameBridge.returnToTitle();
      }
    });
  }

  function renderHelpOverlay(body) {
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body,
      closeText: "Close"
    });
  }

  function renderGameMenuOverlay() {
    return window.VerseGameShell.gameMenuHtml({
      id: "fsGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function helpHtml() {
    return `Tap to slice the food of each correct word.<br><br>
      When the verse is finished, slice as much food as you can during the bonus round.`;
  }

  function wireCommonNav() {
    window.VerseGameShell.wireGameMenu({
      id: "fsGameMenuOverlay",
      menuButtonId: "fsMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (!muted) {
          void unlockAudio();
          playUiTapSound();
        }
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
      onOpen: () => {
        playUiTapSound();
        setPaused(true, "menu");
      },
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

  function bindFoodSliceZoomLock() {
    if (foodSliceZoomLockBound) return;

    foodSliceZoomLockBound = true;

    const preventGesture = (e) => {
      if (e.cancelable) e.preventDefault();
    };

    ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
      document.addEventListener(eventName, preventGesture, { passive: false });
    });

    document.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches.length > 1 && e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener("touchend", (e) => {
      const field = document.getElementById("fsField");

      if (!field || !field.contains(e.target)) return;

      const now = Date.now();

      if (now - lastFoodSliceTouchEnd <= 320 && e.cancelable) {
        e.preventDefault();
      }

      lastFoodSliceTouchEnd = now;
    }, { passive: false });
  }


  function wireGameInput() {
    bindFoodSliceZoomLock();

    if (!resizeBound) {
      window.addEventListener("resize", recalcField);
      resizeBound = true;
    }

    const menuPill = document.getElementById("fsMenuPill");
    if (menuPill) {
      const openFromPill = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        void unlockAudio();
        playUiTapSound();
        openGameMenu();
      };
      menuPill.onclick = openFromPill;
      menuPill.onpointerdown = openFromPill;
      menuPill.ontouchstart = openFromPill;
    }

    window.onkeydown = (e) => {
      if (e.key === "Escape" && state.running) {
        if (document.getElementById("fsGameMenuOverlay")?.classList.contains("is-open")) closeGameMenu();
        else openGameMenu();
      }
    };
  }

  function openGameMenu() {
    const menuOverlay = document.getElementById("fsGameMenuOverlay");
    if (menuOverlay) {
      setPaused(true, "menu");
      menuOverlay.classList.add("is-open");
      menuOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeGameMenu() {
    const menuOverlay = document.getElementById("fsGameMenuOverlay");

    if (menuOverlay && menuOverlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    if (menuOverlay) {
      menuOverlay.classList.remove("is-open");
      menuOverlay.setAttribute("aria-hidden", "true");
    }

    const helpOverlay = document.getElementById("fsHelpOverlay");
    if (!helpOverlay || !helpOverlay.classList.contains("is-open")) setPaused(false, "");
  }

  function openHelpFromMenu() {
    const menuOverlay = document.getElementById("fsGameMenuOverlay");

    if (menuOverlay) menuOverlay.classList.remove("is-open");

    window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");

    setPaused(true, "help");
  }


  function closeHelpOverlay() {
    playUiTapSound();
    window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);
    setPaused(false, "");
  }

  function backToMenuFromHelp() {
    playUiTapSound();
    window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);

    const menuOverlay = document.getElementById("fsGameMenuOverlay");
    if (menuOverlay) menuOverlay.classList.add("is-open");

    setPaused(true, "menu");
  }

  function setPaused(paused, reason = "") {
    state.paused = paused;
    state.pauseReason = paused ? reason : "";
    if (!paused) state.lastTs = performance.now();
  }

  function recalcField() {
    const field = document.getElementById("fsField");
    if (!field) return;
    const rect = field.getBoundingClientRect();
    state.fieldWidth = rect.width;
    state.fieldHeight = rect.height;

    state.fruitHitSize = clamp(state.fieldWidth * 0.27, 108, 182);
    state.fruitEmojiSize = clamp(state.fieldWidth * 0.155, 62, 102);
    state.bombHitSize = clamp(state.fieldWidth * 0.19, 84, 134);
    state.bombEmojiSize = clamp(state.fieldWidth * 0.108, 46, 72);
    state.sliceSize = clamp(state.fieldWidth * 0.11, 40, 74);
    state.sliceEmojiSize = clamp(state.fieldWidth * 0.092, 32, 58);

    field.style.setProperty("--fs-fruit-hit", `${state.fruitHitSize}px`);
    field.style.setProperty("--fs-fruit-emoji", `${state.fruitEmojiSize}px`);
    field.style.setProperty("--fs-bomb-hit", `${state.bombHitSize}px`);
    field.style.setProperty("--fs-bomb-emoji", `${state.bombEmojiSize}px`);
    field.style.setProperty("--fs-slice-size", `${state.sliceSize}px`);
    field.style.setProperty("--fs-slice-emoji", `${state.sliceEmojiSize}px`);

    renderHud();
  }

  function renderHud() {
    const phasePill = document.getElementById("fsPhasePill");
    if (phasePill) {
      phasePill.textContent = state.bonusRound ? `🍽️ ${state.bonusCount}` : getPhaseLabel();
    }
    renderBuildArea();
    renderField();
  }

  function getPhaseLabel() {
    if (state.phase === "words") return `${state.wordsBuilt}/${state.wordEntries.length}`;
    if (state.phase === "book") return "Book";
    if (state.phase === "reference") return "Reference";
    return "Ready";
  }

  function getLinearProgressIndex() {
    return (
      state.wordsBuilt +
      (state.bookBuilt ? 1 : 0) +
      (state.referenceBuilt ? 1 : 0)
    );
  }

  function updatePhaseFromProgress() {
    const phase = window.VerseGameShell.getPhaseForProgress({
      progressIndex: getLinearProgressIndex(),
      wordCount: state.wordEntries.length,
      totalSegments: state.buildData?.segments?.length || 0,
      bookLabel: state.verseMeta.book,
      referenceLabel: state.verseMeta.reference
    });

    state.phase = phase;
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

  function fitFoodBuildText() {
    if (state.buildFitDone) return;

    requestAnimationFrame(() => {
      const build = document.getElementById("fsBuild");
      const text = document.getElementById("fsBuildText");

      if (!build || !text) return;
      if (state.bonusRound) return;

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
    const build = document.getElementById("fsBuild");
    const text = document.getElementById("fsBuildText");
    if (!build || !text) return;

    build.classList.toggle("is-shake", state.buildShakeUntil > performance.now());
    if (state.bonusRound) {
      clearBuildTextFit(text);
      text.className = "fs-build-text vm-build-text fs-bonus-build-text";
      text.innerHTML = renderBonusCounterHtml();
      return;
    }

    const buildRender = window.VerseGameShell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: state.verseMeta.book,
      reference: state.verseMeta.reference,
      progressIndex: getLinearProgressIndex(),
      buildArea: BUILD_AREA,
      hideUnbuilt: selectedMode === "hard",
      extraClass: "fs-build-text"
    });

    text.className = buildRender.className;
    text.innerHTML = buildRender.html;

    fitFoodBuildText();
  }

  function renderField() {
    const playLayer = document.getElementById("fsPlayLayer");
    const sliceLayer = document.getElementById("fsSliceLayer");
    const bannerLayer = document.getElementById("fsBannerLayer");
    const field = document.getElementById("fsField");
    if (!playLayer || !sliceLayer || !bannerLayer || !field) return;

    field.classList.toggle("is-flash-bad", state.fieldFlashUntil > performance.now());

    let playHtml = "";
    if (state.messagePill?.alive) playHtml += renderMessagePill(state.messagePill);
    if (state.activeFruit?.alive) playHtml += renderFruitItem(state.activeFruit, false);
    if (state.activeBomb?.alive) playHtml += renderBombItem(state.activeBomb);
    for (const bonusFruit of state.bonusFruits) {
      if (bonusFruit?.alive) playHtml += renderFruitItem(bonusFruit, true);
    }
    playLayer.innerHTML = playHtml;

    playLayer.querySelectorAll("[data-role='fruit']").forEach((el) => {
      const onActivate = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        const id = el.dataset.id;
        if (id === "main") handleMainFruitTap();
        else handleBonusTap(Number(id));
      };
      el.onclick = onActivate;
      el.onpointerdown = onActivate;
    });

    playLayer.querySelectorAll("[data-role='bomb']").forEach((el) => {
      const onActivate = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        handleBombTap();
      };
      el.onclick = onActivate;
      el.onpointerdown = onActivate;
    });


    playLayer.querySelectorAll("[data-role='message-pill']").forEach((el) => {
      const onActivate = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        handleMessagePillTap(el);
      };
      el.onclick = onActivate;
      el.onpointerdown = onActivate;
    });

    const slicePiecesHtml = state.activeSlices.filter(Boolean).map((piece) => `
      <div class="fs-slice-piece ${piece.side}" style="transform:translate(${piece.x}px, ${piece.y}px) translate(-50%, -50%) rotate(${piece.rotation}deg)">
        <div class="fs-slice-inner">${escapeHtml(piece.fruit || "🍎")}</div>
      </div>
    `).join("");

    const messageSlicePiecesHtml = state.activeMessageSlices.filter(Boolean).map(renderMessageSlicePiece).join("");

    const trailSparklesHtml = state.activeTrailSparkles.filter(Boolean).map(renderTrailSparkle).join("");

    const sliceEffectsHtml = state.activeSliceEffects.filter(Boolean).map(renderSliceEffect).join("");

    sliceLayer.innerHTML = slicePiecesHtml + messageSlicePiecesHtml + trailSparklesHtml + sliceEffectsHtml;

    bannerLayer.innerHTML = (state.bonusRound && performance.now() < state.bonusBannerUntil)
      ? `<div class="fs-bonus-banner"><div class="fs-bonus-banner-text">Bonus Round!</div></div>`
      : "";




  }

  function renderFruitItem(item, isBonus) {
    const cls = `fs-item ${item.flashWrong ? "is-wrong" : ""} ${item.rejecting ? "is-rejecting" : ""}`;
    const id = isBonus ? item.id : "main";
    const wordHtml = isBonus ? "" : `<div class="fs-word-chip">${escapeHtml(item.word || "")}</div>`;
    const trailHtml = !isBonus ? renderFruitTrail(item) : "";

    return `
      <div class="${cls}" style="transform:translate(${item.x}px, ${item.y}px) translate(-50%, -50%)">
        ${trailHtml}
        <button class="fs-fruit-btn" data-role="fruit" data-id="${id}" type="button" aria-label="Slice food">
          <span class="fs-fruit-emoji" style="transform:rotate(${Math.round((item.tilt || 0) + (item.rotation || 0))}deg)">${escapeHtml(item.fruit || "🍎")}</span>
          ${wordHtml}
        </button>
      </div>
    `;
  }

  function renderBombItem(item) {
    return `
      <div class="fs-item ${item.wasHit ? "is-bomb-hit" : ""}" style="transform:translate(${item.x}px, ${item.y}px) translate(-50%, -50%)">
        <button class="fs-bomb-btn" data-role="bomb" type="button" aria-label="Bomb">
          <span class="fs-bomb-emoji" style="transform:rotate(${Math.round(item.rotation || 0)}deg)">💣</span>
        </button>
      </div>
    `;
  }

  function renderMessagePill(item) {
    const scale = getMessagePillScale(item);
    const tilt = Math.round((item.tilt || 0) + (item.rotation || 0));
    return `
      <div
        class="fs-message-item"
        data-role="message-pill"
        style="transform:translate(${item.x}px, ${item.y}px) translate(-50%, -50%) rotate(${tilt}deg) scale(${scale})"
      >
        <div class="fs-message-pill" style="background:${item.bg}; color:${item.color};">
          ${escapeHtml(item.text)}
        </div>
      </div>
    `;
  }

  function startLoop() {
    stopLoop();
    state.lastTs = 0;
    state.rafId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  }

  function frame(ts) {
    if (!state.running) return;
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(34, ts - state.lastTs);
    state.lastTs = ts;

    if (!state.paused) {
      step(dt, ts);
      renderHud();
    }
    state.rafId = requestAnimationFrame(frame);
  }

  function step(dt, now) {
    if (state.messageSequence) {
      stepMessageSequence(dt, now);
      return;
    }

    if (!state.done && !state.bonusRound && !state.activeFruit) {
      spawnMainFruit();
      maybeSpawnBomb();
    }

    updateMovingEntity(state.activeFruit, dt);
    updateMovingEntity(state.activeBomb, dt);
    state.activeSlices.forEach((piece) => updateMovingEntity(piece, dt));
    state.activeSlices = state.activeSlices.filter((piece) => piece.alive);
    state.activeMessageSlices.forEach((piece) => updateMovingEntity(piece, dt));
    state.activeMessageSlices = state.activeMessageSlices.filter((piece) => piece.alive);
    state.activeTrailSparkles = state.activeTrailSparkles.filter((sparkle) => now - sparkle.createdAt < sparkle.duration);
    state.activeSliceEffects = state.activeSliceEffects.filter((effect) => now - effect.createdAt < effect.duration);

    if (state.activeFruit && state.activeFruit.y > state.fieldHeight + 140) state.activeFruit = null;
    if (state.activeBomb && state.activeBomb.y > state.fieldHeight + 140) state.activeBomb = null;

    if (state.bonusRound) {
      if (now >= state.bonusBannerUntil && now < state.bonusEndsAt) {
        const targetCount = getBonusTargetLiveCount(now);
        const live = state.bonusFruits.filter((item) => item.alive).length;
        if (live < targetCount) spawnBonusFruit();
      }
      state.bonusFruits.forEach((item) => updateMovingEntity(item, dt));
      state.bonusFruits = state.bonusFruits.filter((item) => item.alive && item.y <= state.fieldHeight + 140);
      if (!state.done && now >= state.bonusEndsAt && state.bonusFruits.length === 0 && state.activeSlices.length === 0) {
        startBonusScoreOutro();
      }
    }
  }

  function updateMovingEntity(item, dt) {
    if (!item || !item.alive) return;
    const stepScale = dt / 16.6667;
    item.x += item.vx * stepScale;
    item.y += item.vy * stepScale;
    item.vy += item.gravity * stepScale;
    item.rotation += item.spin * stepScale;

    const halfSize = item.kind === "bomb"
      ? state.bombHitSize * 0.34
      : state.fruitHitSize * 0.34;

    item.x = clamp(item.x, halfSize, state.fieldWidth - halfSize);

    if (item.kind === "fruit" && item.trailLevel > 0) {
      updateTrailPoints(item);
    }

    if (item.y > state.fieldHeight + Math.max(160, state.fruitHitSize * 1.1)) item.alive = false;
  }

  function spawnMainFruit() {
    const target = getCurrentTargetText();
    const { text, isCorrect } = pickDisplayTextForCurrentPhase(target);
    state.activeFruit = createFlyingFood({ word: text, isCorrect });
    playRandomSwooshSound();
  }

  function maybeSpawnBomb() {
    if (selectedMode !== "hard" || state.bonusRound || state.done) return;
    if (!state.activeFruit?.alive) return;
    if (Math.random() >= 0.28) return;

    state.activeBomb = createFlyingBomb();
    keepBombAwayFromFruit(state.activeBomb, state.activeFruit);
  }

  function keepBombAwayFromFruit(bomb, fruit) {
    if (!bomb || !fruit) return;

    const fieldW = Math.max(320, state.fieldWidth || 320);
    const safeDistance = Math.max(
      state.fruitHitSize * 0.72,
      state.bombHitSize * 0.9,
      fieldW * 0.24
    );

    const currentDistance = Math.abs(bomb.x - fruit.x);
    if (currentDistance >= safeDistance) return;

    const pushDirection = fruit.x < fieldW / 2 ? 1 : -1;
    const preferredX = fruit.x + safeDistance * pushDirection;
    const fallbackX = fruit.x - safeDistance * pushDirection;
    const bombHalfSize = state.bombHitSize * 0.42;
    const minX = bombHalfSize;
    const maxX = fieldW - bombHalfSize;

    if (preferredX >= minX && preferredX <= maxX) {
      bomb.x = preferredX;
    } else {
      bomb.x = clamp(fallbackX, minX, maxX);
    }

    if (Math.abs(bomb.x - fruit.x) < safeDistance * 0.72) {
      bomb.x = fruit.x < fieldW / 2 ? maxX : minX;
    }

    bomb.vx += bomb.x > fruit.x ? 0.65 : -0.65;
  }


  function createFlyingFood({ word, isCorrect }) {
    const motion = createArcMotion();
    const trailLevel = getTrailLevelForStreak(state.correctStreak);
    const trailAccentColor = trailLevel >= 5 ? pickUniqueTrailAccentColor() : "";
    const trailColors = getTrailColorsForLevel(trailLevel, trailAccentColor);

    return {
      ...motion,
      fruit: pickRandom(state.theme),
      word,
      isCorrect,
      alive: true,
      flashWrong: false,
      rejecting: false,
      wasTapped: false,
      tilt: -16 + Math.random() * 32,
      kind: "fruit",
      trailLevel,
      trailAccentColor,
      trailColors,
      trailPoints: [],
      lastTrailSparkleAt: 0
    };
  }

  function createFlyingBomb() {
    return {
      ...createArcMotion(true),
      alive: true,
      wasTapped: false,
      wasHit: false,
      kind: "bomb"
    };
  }


  function getTrailLevelForStreak(streak) {
    if (streak >= 11) return 5;
    if (streak >= 9) return 4;
    if (streak >= 6) return 3;
    if (streak >= 4) return 2;
    if (streak >= 2) return 1;
    return 0;
  }

  function getTrailStyleForLevel(level) {
    if (level >= 5) return TRAIL_TUNING.unique;
    if (level >= 4) return TRAIL_TUNING.rainbow;
    if (level >= 2) return TRAIL_TUNING.snow;
    if (level >= 1) return TRAIL_TUNING.white;
    return null;
  }

  function getTrailColorsForLevel(level, accentColor = "") {
    if (level >= 5) return [accentColor || pickRandom(TRAIL_TUNING.uniquePalette)];
    if (level >= 4) return TRAIL_TUNING.rainbow.colors;
    if (level >= 2) return TRAIL_TUNING.snow.colors;
    if (level >= 1) return TRAIL_TUNING.white.colors;
    return [];
  }

  function pickUniqueTrailAccentColor() {
    const used = new Set();

    if (state.activeFruit?.alive && state.activeFruit.trailAccentColor) {
      used.add(state.activeFruit.trailAccentColor);
    }

    const available = TRAIL_TUNING.uniquePalette.filter((color) => !used.has(color));
    return pickRandom(available.length ? available : TRAIL_TUNING.uniquePalette);
  }

  function updateTrailPoints(item) {
    if (!item.trailPoints) item.trailPoints = [];

    const last = item.trailPoints[item.trailPoints.length - 1];
    const minDistance = TRAIL_TUNING.minPointDistance;
    const dx = last ? item.x - last.x : minDistance + 1;
    const dy = last ? item.y - last.y : minDistance + 1;

    if (!last || Math.hypot(dx, dy) >= minDistance) {
      item.trailPoints.push({
        x: item.x,
        y: item.y
      });

      while (item.trailPoints.length > TRAIL_TUNING.maxPoints) {
        item.trailPoints.shift();
      }

      maybeSpawnTrailSparkle(item);
    }
  }

  function maybeSpawnTrailSparkle(item) {
    if (!item || item.trailLevel < 3) return;

    const now = performance.now();
    if (now - (item.lastTrailSparkleAt || 0) < TRAIL_TUNING.sparkleSpawnGapMs) return;
    if (state.activeTrailSparkles.length >= TRAIL_TUNING.maxSparkles) return;

    const points = item.trailPoints || [];
    const anchor = points.length > 2 ? points[points.length - 2] : points[points.length - 1];
    if (!anchor) return;

    item.lastTrailSparkleAt = now;

    const sparkleStyle = TRAIL_TUNING.sparkle;
    const sparkleColors = item.trailColors?.length ? item.trailColors : sparkleStyle.colors;
    const sizeScale = sparkleStyle.sizeMin + Math.random() * (sparkleStyle.sizeMax - sparkleStyle.sizeMin);
    const offset = state.fruitEmojiSize * 0.18;
    const x = anchor.x + (-offset + Math.random() * offset * 2);
    const y = anchor.y + (-offset + Math.random() * offset * 2);

    state.activeTrailSparkles.push({
      x,
      y,
      sizeScale,
      rotation: Math.random() * 90,
      color: pickRandom(sparkleColors),
      glow: sparkleStyle.glow,
      createdAt: now,
      duration: TRAIL_TUNING.sparkleDuration
    });
  }

  function renderFruitTrail(item) {
    const style = getTrailStyleForLevel(item.trailLevel);
    const points = item.trailPoints || [];
    if (!style || points.length < 2) return "";

    const colors = item.trailColors?.length ? item.trailColors : style.colors;

    const dots = points.map((point, index) => {
      const progress = points.length <= 1 ? 1 : index / (points.length - 1);
      const opacity = 0.08 + progress * 0.84;
      const sizeScale = style.sizeMin + progress * (style.sizeMax - style.sizeMin);
      const color = colors[index % colors.length] || "#ffffff";
      const relX = point.x - item.x;
      const relY = point.y - item.y;

      return `
        <span
          class="fs-trail-dot"
          style="
            --trail-dot-size:${sizeScale.toFixed(3)};
            --trail-dot-color:${color};
            --trail-dot-glow:${style.glow};
            opacity:${opacity.toFixed(3)};
            transform:translate(${relX.toFixed(1)}px, ${relY.toFixed(1)}px) translate(-50%, -50%);
          "
        ></span>
      `;
    }).join("");

    return `<div class="fs-fruit-trail" aria-hidden="true">${dots}</div>`;
  }

  function renderTrailSparkle(sparkle) {
    const age = performance.now() - sparkle.createdAt;
    const progress = Math.max(0, Math.min(1, age / sparkle.duration));
    const pop = Math.sin(progress * Math.PI);
    const opacity = Math.max(0, (1 - progress) * 0.92);
    const scale = 0.55 + pop * 0.72;

    return `
      <span
        class="fs-trail-sparkle"
        style="
          --trail-sparkle-size:${sparkle.sizeScale.toFixed(3)};
          --trail-sparkle-color:${sparkle.color};
          --trail-sparkle-glow:${sparkle.glow};
          opacity:${opacity.toFixed(3)};
          transform:translate(${sparkle.x.toFixed(1)}px, ${sparkle.y.toFixed(1)}px) translate(-50%, -50%) rotate(${sparkle.rotation.toFixed(1)}deg) scale(${scale.toFixed(3)});
        "
      ></span>
    `;
  }

  function createMessageSequence(kind) {
    const bonusColors = ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6"];

    let steps;

    if (kind === "bonus") {
      steps = ["SLICE", "ALL", "THE", "FOOD!"].map((text, index) => {
        const bg = bonusColors[index % bonusColors.length];
        return {
          text,
          bg,
          color: bg === "#ffc751" ? "#333333" : "#ffffff"
        };
      });
    } else if (kind === "scoreOutro") {
      const displayScore = state.bonusCount > 99 ? "99+" : String(state.bonusCount);

      steps = [
        {
          text: "SCORE",
          bg: "#7f66c6",
          color: "#ffffff",
          fireworksAtApex: true,
          outroRole: "label"
        },
        {
          text: displayScore,
          bg: "#ff5a51",
          color: "#ffc751",
          fireworksAtApex: true,
          outroRole: "score",
          endsGameOnSlice: true
        }
      ];
    } else {
      steps = [
        { text: "TAP", bg: "#ff5a51", color: "#ffc751" },
        { text: "TO", bg: "#ff5a51", color: "#ffc751" },
        { text: "SLICE!", bg: "#ff5a51", color: "#ffc751" },
        { text: "GO!", bg: "#a7cb6f", color: "#ffffff" }
      ];
    }

    return {
      kind,
      steps,
      index: 0,
      nextAt: 0
    };
  }

  function stepMessageSequence(dt, now) {
    if (!state.messageSequence) return;

    state.activeMessageSlices.forEach((piece) => updateMovingEntity(piece, dt));
    state.activeMessageSlices = state.activeMessageSlices.filter((piece) => piece.alive);
    state.activeTrailSparkles = state.activeTrailSparkles.filter((sparkle) => now - sparkle.createdAt < sparkle.duration);
    state.activeSliceEffects = state.activeSliceEffects.filter((effect) => now - effect.createdAt < effect.duration);

    if (!state.messagePill && now >= state.messageSequence.nextAt) {
      let step = state.messageSequence.steps[state.messageSequence.index];

      if (!step && state.messageSequence.kind === "scoreOutro") {
        state.messageSequence.index = 1;
        step = state.messageSequence.steps[state.messageSequence.index];
      }

      if (!step) {
        finishMessageSequence();
        return;
      }

      state.messagePill = createMessagePill(step);
      state.messageSequence.index += 1;
    }

    updateMessagePill(state.messagePill, dt, now);

    if (state.messagePill && !state.messagePill.alive) {
      state.messagePill = null;
      state.messageSequence.nextAt = now + 110;
    }
  }

  function finishMessageSequence() {
    const kind = state.messageSequence?.kind || "intro";
    state.messageSequence = null;
    state.messagePill = null;

    if (kind === "bonus") {
      beginBonusGameplay();
    }
  }

  function createMessagePill(step) {
    playRandomSwooshSound();

    const motion = createArcMotion(false);
    motion.spin = (-0.45 + Math.random() * 0.9);

    return {
      ...motion,
      text: step.text,
      bg: step.bg,
      color: step.color,
      alive: true,
      kind: "message",
      tilt: -5 + Math.random() * 10,
      hasPausedAtApex: false,
      hasTriggeredFireworks: false,
      fireworksAtApex: !!step.fireworksAtApex,
      outroRole: step.outroRole || "",
      endsGameOnSlice: !!step.endsGameOnSlice,
      pauseUntil: 0,
      popUntil: 0
    };
  }

  function updateMessagePill(item, dt, now) {
    if (!item || !item.alive) return;

    if (item.fireworksAtApex && !item.hasTriggeredFireworks && item.vy >= 0) {
      item.hasTriggeredFireworks = true;
      triggerScoreOutroFireworks(item);
    }

    updateMovingEntity(item, dt);
  }

  function getMessagePillScale(item) {
    return 1;
  }

  function createArcMotion(isBomb = false) {
    const fieldW = Math.max(320, state.fieldWidth || 320);
    const fieldH = Math.max(260, state.fieldHeight || 260);
    const sideInset = Math.max(state.fruitHitSize * 0.46, fieldW * 0.12);
    const startX = sideInset + Math.random() * Math.max(24, fieldW - sideInset * 2);
    const peakRatio = fieldW >= 900 ? 0.24 : 0.30;
    const targetPeakY = fieldH * peakRatio;
    const startY = fieldH + Math.max(24, state.fruitHitSize * 0.22);
    const riseDistance = Math.max(fieldH * 0.42, startY - targetPeakY);

    const gravity = fieldH * (isBomb ? 0.00115 : 0.00105);
    const baseVy = Math.sqrt(2 * gravity * riseDistance);
    const vy = -(baseVy + (Math.random() * fieldH * 0.00035 - fieldH * 0.000175));

    const horizontalRange = fieldW * (isBomb ? 0.0025 : 0.0022);
    const vx = (Math.random() * 2 - 1) * horizontalRange;
    const spin = isBomb ? (-3.4 + Math.random() * 6.8) : (-2.8 + Math.random() * 5.6);

    return { x: startX, y: startY, vx, vy, gravity, rotation: 0, spin };
  }

  function handleMainFruitTap() {
    const item = state.activeFruit;
    if (!item || !item.alive || item.wasTapped || state.paused || state.done) return;
    item.wasTapped = true;

    if (item.isCorrect) {
      playRandomSliceSound();

      if (state.correctStreak >= FIREWORK_TUNING.triggerStreak - 1) {
        createFireworkFrom(item);
      } else {
        createSlicesFrom(item);
      }

      state.activeFruit = null;
      state.wrongStreak = 0;
      state.correctStreak += 1;

      if (state.phase === "words") {
        state.wordsBuilt += 1;
      } else if (state.phase === "book") {
        state.bookBuilt = true;
      } else if (state.phase === "reference") {
        state.referenceBuilt = true;
      }

      updatePhaseFromProgress();

      if (state.phase === "done") {
        startBonusRound();
        return;
      }

      return;
    }

    playRandomSliceSound();
    playGameSound("wrong");

    item.flashWrong = true;
    item.rejecting = true;
    state.wrongStreak += 1;
    state.correctStreak = 0;
    state.buildShakeUntil = performance.now() + 320;
    state.fieldFlashUntil = performance.now() + 260;

    setPaused(true, "wrong");
    renderHud();
    window.setTimeout(() => {
      item.alive = false;
      if (state.activeFruit === item) state.activeFruit = null;
      if (!state.done) setPaused(false, "");
      renderHud();
    }, 320);
  }

  function handleBombTap() {
    const bomb = state.activeBomb;
    if (!bomb || !bomb.alive || bomb.wasTapped || state.paused || state.done || state.bonusRound) return;

    const burstX = bomb.x;
    const burstY = bomb.y;

    bomb.wasTapped = true;
    bomb.wasHit = true;
    bomb.alive = false;
    state.activeBomb = null;

    if (state.phase === "reference" && state.referenceBuilt) {
      state.referenceBuilt = false;
    } else if (state.phase === "book" && state.bookBuilt) {
      state.bookBuilt = false;
    } else if (state.wordsBuilt > 0) {
      state.wordsBuilt = Math.max(0, state.wordsBuilt - 1);
    }

    updatePhaseFromProgress();
    state.correctStreak = 0;
    state.buildShakeUntil = performance.now() + 320;
    state.fieldFlashUntil = performance.now() + 260;
    setPaused(true, "bomb");
    renderHud();
    playGameSound("bomb");
    spawnBombBurst(burstX, burstY);

    window.setTimeout(() => {
      if (!state.done) setPaused(false, "");
      renderHud();
    }, 320);
  }

  function startBonusRound() {
    state.activeFruit = null;
    state.activeBomb = null;
    state.activeSlices = [];
    state.activeMessageSlices = [];
    state.activeSliceEffects = [];
    state.activeTrailSparkles = [];
    state.correctStreak = 0;
    state.messagePill = null;
    state.messageSequence = createMessageSequence("bonus");
    state.bonusRound = false;
    state.bonusBannerUntil = 0;
    state.bonusStartedAt = 0;
    state.bonusEndsAt = 0;
    state.bonusFruits = [];
    state.bonusCount = 0;
    setPaused(false, "");
    renderHud();
  }

  function beginBonusGameplay() {
    const now = performance.now();

    state.bonusRound = true;
    state.bonusBannerUntil = 0;
    state.bonusStartedAt = now;
    state.bonusEndsAt = now + BONUS_DURATION_MS;
    state.bonusFruits = [];
    state.bonusCount = 0;
  }

  function startBonusScoreOutro() {
    state.activeFruit = null;
    state.activeBomb = null;
    state.bonusFruits = [];
    state.activeSlices = [];
    state.activeMessageSlices = [];
    state.activeSliceEffects = [];
    state.activeTrailSparkles = [];
    state.messagePill = null;
    state.messageSequence = createMessageSequence("scoreOutro");
    state.bonusBannerUntil = 0;
    setPaused(false, "");
    renderHud();
  }

  function getBonusTargetLiveCount(now) {
    const elapsed = Math.max(0, now - state.bonusStartedAt);

    if (elapsed < BONUS_STAGE_MS) return 1;
    if (elapsed < BONUS_STAGE_MS * 2) return 2;
    return 3;
  }

  function renderBonusCounterHtml() {
    const displayScore = state.bonusCount > 99 ? "99+" : String(state.bonusCount);

    return `
      <div class="fs-bonus-score-line" aria-label="Bonus slices ${escapeHtml(displayScore)}">
        <span class="fs-bonus-score-emoji" aria-hidden="true">🍎</span>
        <span class="fs-bonus-score-x" aria-hidden="true">x</span>
        <span class="fs-bonus-score-pill">${escapeHtml(displayScore)}</span>
      </div>
    `;
  }


  function spawnBonusFruit() {
    state.bonusIdCounter += 1;
    state.bonusFruits.push({
      id: state.bonusIdCounter,
      ...createArcMotion(),
      fruit: pickRandom(state.theme),
      alive: true,
      wasTapped: false,
      tilt: -16 + Math.random() * 32,
      kind: "fruit"
    });
    playRandomSwooshSound();
  }

  function handleBonusTap(id) {
    const item = state.bonusFruits.find((fruit) => fruit.id === id);
    if (!item || item.wasTapped || state.paused || !state.bonusRound) return;
    item.wasTapped = true;
    item.alive = false;
    state.bonusCount += 1;
    playRandomSliceSound();
    createSlicesFrom(item);
  }

  function handleMessagePillTap(el) {
    const item = state.messagePill;
    if (!item || !item.alive || item.wasTapped || state.paused || state.done) return;

    const field = document.getElementById("fsField");
    const pill = el?.querySelector(".fs-message-pill");
    if (!field || !pill) return;

    const fieldRect = field.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const styles = window.getComputedStyle(pill);

    const x = pillRect.left - fieldRect.left + pillRect.width / 2;
    const y = pillRect.top - fieldRect.top + pillRect.height / 2;
    const rotation = Math.round((item.tilt || 0) + (item.rotation || 0));

    item.wasTapped = true;

    playRandomSliceSound();

    const effect = createSliceEffectFrom({
      x,
      y,
      kind: "message"
    });

    createMessageSlicesFromPill({
      item,
      x,
      y,
      width: pillRect.width,
      height: pillRect.height,
      rotation,
      fontSize: styles.fontSize,
      letterSpacing: styles.letterSpacing,
      bg: item.bg,
      color: item.color,
      sliceAngle: effect?.rotation ?? 90
    });

    item.alive = false;
    state.messagePill = null;

    if (item.endsGameOnSlice) {
      state.done = true;
      state.messageSequence = null;
      window.setTimeout(() => {
        finishGame();
      }, 420);
    } else if (state.messageSequence) {
      state.messageSequence.nextAt = performance.now() + 90;
    }

    renderHud();
  }

  function createMessageSlicesFromPill(data) {
    const split = getSliceSplitMotion(data.sliceAngle);
    const splitBurst = getSliceBurstTuning();
    const splitOffset = Math.max(14, data.width * 0.09);
    const splitSpeed = splitBurst.speed * 0.85;
    const lift = splitBurst.lift * 0.7;
    const baseRotation = data.rotation || 0;

    state.activeMessageSlices.push(
      {
        side: "left",
        text: data.item.text,
        bg: data.bg,
        color: data.color,
        width: data.width,
        height: data.height,
        fontSize: data.fontSize,
        letterSpacing: data.letterSpacing,
        x: data.x + split.nx * splitOffset,
        y: data.y + split.ny * splitOffset,
        vx: split.nx * splitSpeed,
        vy: split.ny * splitSpeed + lift,
        gravity: 0.42,
        rotation: baseRotation - 6 + split.rotationNudge - splitBurst.rotationJitter,
        spin: -2.8 + split.spinNudge - splitBurst.spinJitter,
        alive: true,
        kind: "message-slice"
      },
      {
        side: "right",
        text: data.item.text,
        bg: data.bg,
        color: data.color,
        width: data.width,
        height: data.height,
        fontSize: data.fontSize,
        letterSpacing: data.letterSpacing,
        x: data.x - split.nx * splitOffset,
        y: data.y - split.ny * splitOffset,
        vx: -split.nx * splitSpeed,
        vy: -split.ny * splitSpeed + lift,
        gravity: 0.42,
        rotation: baseRotation + 6 + split.rotationNudge + splitBurst.rotationJitter,
        spin: 2.8 + split.spinNudge + splitBurst.spinJitter,
        alive: true,
        kind: "message-slice"
      }
    );
  }

  function renderMessageSlicePiece(piece) {
    return `
      <div
        class="fs-message-slice-piece ${piece.side}"
        style="
          width:${piece.width.toFixed(1)}px;
          height:${piece.height.toFixed(1)}px;
          transform:translate(${piece.x}px, ${piece.y}px) translate(-50%, -50%) rotate(${piece.rotation}deg);
        "
      >
        <div
          class="fs-message-pill fs-message-slice-pill"
          style="
            width:${piece.width.toFixed(1)}px;
            height:${piece.height.toFixed(1)}px;
            background:${piece.bg};
            color:${piece.color};
            font-size:${piece.fontSize};
            letter-spacing:${piece.letterSpacing};
          "
        >
          ${escapeHtml(piece.text)}
        </div>
      </div>
    `;
  }


  function createFireworkFrom(item) {
    const sliceEffect = createSliceEffectFrom(item);
    spawnFireworkAt({
      x: item.x,
      y: item.y,
      colors: getFireworkColors(item)
    });
    return sliceEffect;
  }

  function spawnFireworkAt({ x, y, colors }) {
    const layer = document.getElementById("fsFireworkLayer");
    if (!layer) return;

    const baseSize = state.fruitEmojiSize * FIREWORK_TUNING.sizeScale;
    const rayThickness = Math.max(3, state.fruitEmojiSize * FIREWORK_TUNING.rayThicknessScale);
    const duration = FIREWORK_TUNING.duration;

    const firework = {
      x,
      y,
      colors,
      baseSize,
      rayThickness,
      duration,
      mainRays: makeFireworkRays({
        count: FIREWORK_TUNING.mainRays,
        colors,
        baseSize,
        rayThickness,
        long: true
      }),
      shortRays: makeFireworkRays({
        count: FIREWORK_TUNING.shortRays,
        colors,
        baseSize,
        rayThickness,
        long: false
      }),
      sparkles: makeFireworkSparkles({
        count: FIREWORK_TUNING.sparkles,
        colors,
        baseSize,
        rayThickness
      })
    };

    const wrapper = document.createElement("div");
    wrapper.className = "fs-firework";
    wrapper.style.transform = `translate(${firework.x.toFixed(1)}px, ${firework.y.toFixed(1)}px) translate(-50%, -50%)`;
    wrapper.innerHTML = renderFireworkDom(firework);

    layer.appendChild(wrapper);

    window.setTimeout(() => {
      wrapper.remove();
    }, duration + 220);
  }

  function getFireworkColors(item) {
    if (Math.random() < FIREWORK_TUNING.rainbowChance) {
      return FIREWORK_TUNING.rainbowColors;
    }

    return [
      item.trailAccentColor || item.trailColors?.[0] || FIREWORK_TUNING.fallbackColor,
      "#ffffff"
    ];
  }


  function triggerScoreOutroFireworks(item) {
    if (!item) return;

    const leftX = state.fieldWidth * 0.27 + (-state.fruitEmojiSize * 0.25 + Math.random() * state.fruitEmojiSize * 0.5);
    const rightX = state.fieldWidth * 0.73 + (-state.fruitEmojiSize * 0.25 + Math.random() * state.fruitEmojiSize * 0.5);
    const y = clamp(item.y - state.fruitEmojiSize * 0.18, state.fruitEmojiSize * 0.8, state.fieldHeight - state.fruitEmojiSize * 0.8);

    spawnFireworkAt({
      x: leftX,
      y,
      colors: getCelebrationFireworkColors()
    });

    spawnFireworkAt({
      x: rightX,
      y,
      colors: getCelebrationFireworkColors()
    });
  }

  function getCelebrationFireworkColors() {
    if (Math.random() < 0.5) {
      return FIREWORK_TUNING.rainbowColors;
    }

    return [
      pickRandom(FIREWORK_TUNING.rainbowColors),
      "#ffffff"
    ];
  }

  function makeFireworkRays({ count, colors, baseSize, rayThickness, long }) {
    const angleOffset = Math.random() * 360;
    const rays = [];

    for (let i = 0; i < count; i += 1) {
      const spread = 360 / Math.max(1, count);
      const angle = angleOffset + spread * i + (-4 + Math.random() * 8);
      const length = long
        ? baseSize * (0.72 + Math.random() * 0.32)
        : baseSize * (0.34 + Math.random() * 0.24);
      const start = baseSize * (long ? 0.06 + Math.random() * 0.1 : 0.03 + Math.random() * 0.1);
      const thickness = rayThickness * (long ? 0.72 + Math.random() * 0.4 : 0.46 + Math.random() * 0.34);
      const delay = long ? Math.random() * 35 : 20 + Math.random() * 70;

      rays.push({
        angle,
        length,
        start,
        thickness,
        color: colors[i % colors.length],
        delay
      });
    }

    return rays;
  }

  function makeFireworkSparkles({ count, colors, baseSize, rayThickness }) {
    const sparkles = [];

    for (let i = 0; i < count; i += 1) {
      sparkles.push({
        angle: Math.random() * 360,
        distance: baseSize * (0.45 + Math.random() * 0.83),
        size: rayThickness * (0.72 + Math.random() * 0.83),
        color: Math.random() < 0.22 ? "#ffffff" : pickRandom(colors),
        delay: 40 + Math.random() * 90,
        isSpark: Math.random() < 0.45
      });
    }

    return sparkles;
  }

  function renderFireworkDom(firework) {
    const duration = firework.duration;
    const centerSize = firework.rayThickness * 2.4;

    const mainRaysHtml = firework.mainRays.map((ray) => renderFireworkRayDom(ray, duration, true)).join("");
    const shortRaysHtml = firework.shortRays.map((ray) => renderFireworkRayDom(ray, duration, false)).join("");
    const sparklesHtml = firework.sparkles.map((sparkle) => renderFireworkSparkleDom(sparkle, duration)).join("");

    return `
      <span
        class="fs-firework-center"
        style="
          width:${centerSize.toFixed(1)}px;
          height:${centerSize.toFixed(1)}px;
          margin-left:${(-centerSize / 2).toFixed(1)}px;
          margin-top:${(-centerSize / 2).toFixed(1)}px;
          --fw-color:${firework.colors[0] || "#ffffff"};
          --fw-duration:${Math.min(duration, 680)}ms;
        "
      ></span>
      ${mainRaysHtml}
      ${shortRaysHtml}
      ${sparklesHtml}
    `;
  }

  function renderFireworkRayDom(ray, duration, isMain) {
    return `
      <span
        class="fs-firework-ray ${isMain ? "is-main" : "is-short"}"
        style="
          --fw-angle:${ray.angle.toFixed(1)}deg;
          --fw-length:${ray.length.toFixed(1)}px;
          --fw-start:${ray.start.toFixed(1)}px;
          --fw-thickness:${ray.thickness.toFixed(1)}px;
          --fw-color:${ray.color};
          --fw-duration:${duration}ms;
          --fw-delay:${ray.delay.toFixed(0)}ms;
          filter:
            drop-shadow(0 0 ${(ray.thickness * (0.7 + FIREWORK_TUNING.glow * 1.5)).toFixed(1)}px ${ray.color})
            drop-shadow(0 0 ${(ray.thickness * (1.8 + FIREWORK_TUNING.glow * 4)).toFixed(1)}px ${hexToRgba(ray.color, 0.24 + FIREWORK_TUNING.glow * 0.35)});
        "
      ></span>
    `;
  }

  function renderFireworkSparkleDom(sparkle, duration) {
    const cls = sparkle.isSpark ? "fs-firework-spark" : "fs-firework-dot";

    return `
      <span
        class="${cls}"
        style="
          --fw-angle:${sparkle.angle.toFixed(1)}deg;
          --fw-distance:${sparkle.distance.toFixed(1)}px;
          --fw-dot-size:${sparkle.size.toFixed(1)}px;
          --fw-color:${sparkle.color};
          --fw-duration:${duration}ms;
          --fw-delay:${sparkle.delay.toFixed(0)}ms;
          filter:
            drop-shadow(0 0 ${(sparkle.size * (0.8 + FIREWORK_TUNING.glow * 1.7)).toFixed(1)}px ${sparkle.color})
            drop-shadow(0 0 ${(sparkle.size * (1.8 + FIREWORK_TUNING.glow * 3.4)).toFixed(1)}px ${hexToRgba(sparkle.color, 0.26 + FIREWORK_TUNING.glow * 0.36)});
        "
      ></span>
    `;
  }
  


  function hexToRgba(hex, alpha) {
    const clean = String(hex || "#ffffff").replace("#", "");
    const normalized = clean.length === 3
      ? clean.split("").map((ch) => ch + ch).join("")
      : clean.padEnd(6, "f").slice(0, 6);
    const value = parseInt(normalized, 16);

    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }


  function createSlicesFrom(item) {
    const sliceEffect = createSliceEffectFrom(item);
    const sliceAngle = sliceEffect?.rotation ?? 90;
    const baseRotation = item.rotation || 0;

    const split = getSliceSplitMotion(sliceAngle);
    const splitBurst = getSliceBurstTuning();
    const splitOffset = state.fruitHitSize * splitBurst.offsetScale;
    const splitSpeed = splitBurst.speed;
    const lift = splitBurst.lift;

    state.activeSlices.push(
      {
        side: "left",
        fruit: item.fruit,
        x: item.x + split.nx * splitOffset,
        y: item.y + split.ny * splitOffset,
        vx: (item.vx || 0) + split.nx * splitSpeed,
        vy: (item.vy || 0) + split.ny * splitSpeed + lift,
        gravity: item.gravity || 0.42,
        rotation: baseRotation - 10 + split.rotationNudge - splitBurst.rotationJitter,
        spin: -3.8 + split.spinNudge - splitBurst.spinJitter,
        alive: true
      },
      {
        side: "right",
        fruit: item.fruit,
        x: item.x - split.nx * splitOffset,
        y: item.y - split.ny * splitOffset,
        vx: (item.vx || 0) - split.nx * splitSpeed,
        vy: (item.vy || 0) - split.ny * splitSpeed + lift,
        gravity: item.gravity || 0.42,
        rotation: baseRotation + 10 + split.rotationNudge + splitBurst.rotationJitter,
        spin: 3.8 + split.spinNudge + splitBurst.spinJitter,
        alive: true
      }
    );
  }

  function getSliceSplitMotion(sliceAngle) {
    const normalAngle = (sliceAngle + 90) * Math.PI / 180;
    const nx = Math.cos(normalAngle);
    const ny = Math.sin(normalAngle);

    return {
      nx,
      ny,
      rotationNudge: (sliceAngle - 90) * 0.18,
      spinNudge: (sliceAngle - 90) * 0.025
    };
  }

  function getSliceBurstTuning() {
    return {
      offsetScale: 0.14 + Math.random() * 0.10,
      speed: 1.2 + Math.random() * 0.9,
      lift: -0.75 - Math.random() * 0.85,
      rotationJitter: Math.random() * 8,
      spinJitter: Math.random() * 1.1
    };
  }

  function spawnBombBurst(x, y, opts = {}) {
    const layer = document.getElementById("fsBombBurstLayer");
    if (!layer) return;

    const count = opts.count ?? 11;
    const distance = opts.distance ?? Math.max(44, state.bombEmojiSize * 0.96);
    const jitter = opts.jitter ?? Math.max(4, state.bombEmojiSize * 0.09);
    const duration = opts.duration ?? 650;
    const cloudSize = opts.cloudSize ?? Math.max(62, state.bombEmojiSize * 1.45);
    const colors = opts.colors ?? ["#ffffff"];
    const sizePool = opts.sizePool ?? [
      state.bombEmojiSize * 0.12,
      state.bombEmojiSize * 0.16,
      state.bombEmojiSize * 0.20,
      state.bombEmojiSize * 0.24
    ];

    const burst = document.createElement("div");
    burst.className = "fs-bomb-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;

    const burstBoxSize = Math.max(132, Math.ceil((distance + cloudSize) * 2.05));
    burst.style.width = `${burstBoxSize}px`;
    burst.style.height = `${burstBoxSize}px`;

    const shockwave = document.createElement("div");
    shockwave.className = "fs-bomb-shockwave";
    shockwave.style.setProperty("--fs-bomb-shockwave-size", `${Math.max(96, state.bombEmojiSize * 2.35)}px`);
    shockwave.style.setProperty("--fs-bomb-shockwave-dur", "430ms");
    burst.appendChild(shockwave);

    const cloud = document.createElement("div");
    cloud.className = "fs-bomb-burst-cloud";
    cloud.style.setProperty("--fs-bomb-burst-cloud-size", `${cloudSize}px`);
    cloud.style.setProperty("--fs-bomb-burst-cloud-dur", `${Math.max(500, duration - 90)}ms`);
    cloud.innerHTML = FS_BOMB_CLOUD_SVG;
    burst.appendChild(cloud);

    const baseAngle = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + step * i + randomBetween(-0.12, 0.12);
      const dist = distance + randomBetween(-jitter, jitter);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const size = pickRandom(sizePool) + randomBetween(-0.5, 0.5);

      const particle = document.createElement("div");
      particle.className = "fs-bomb-burst-particle";
      particle.style.setProperty("--fs-bomb-burst-size", `${Math.max(5, size).toFixed(1)}px`);
      particle.style.setProperty("--fs-bomb-burst-dur", `${duration}ms`);
      particle.style.setProperty("--fs-bomb-burst-start-scale", `${randomBetween(0.68, 0.82).toFixed(2)}`);
      particle.style.setProperty("--fs-bomb-burst-end-scale", `${randomBetween(1.10, 1.24).toFixed(2)}`);
      particle.style.setProperty("--fs-bomb-burst-tx", `${tx.toFixed(1)}px`);
      particle.style.setProperty("--fs-bomb-burst-ty", `${ty.toFixed(1)}px`);
      particle.style.setProperty("--fs-bomb-burst-delay", `${Math.round(randomBetween(0, 18))}ms`);
      particle.style.background = colors[i % colors.length];

      burst.appendChild(particle);
    }

    layer.appendChild(burst);

    requestAnimationFrame(() => {
      shockwave.classList.add("is-live");
      cloud.classList.add("is-live");

      burst.querySelectorAll(".fs-bomb-burst-particle").forEach((particle) => {
        const delay = Number.parseInt(particle.style.getPropertyValue("--fs-bomb-burst-delay"), 10) || 0;
        window.setTimeout(() => particle.classList.add("is-live"), delay);
      });
    });

    window.setTimeout(() => burst.remove(), duration + 160);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }


  function createSliceEffectFrom(item) {
    if (!item) return;

    const createdAt = performance.now();
    const baseAngle = Math.random() * 180;
    const yOffset = item.word ? -state.fruitHitSize * 0.08 : 0;
    const dots = createSliceParticleFan(baseAngle);

    const effect = {
      x: item.x,
      y: item.y + yOffset,
      rotation: baseAngle,
      createdAt,
      duration: SLICE_EFFECT_TUNING.duration,
      dots
    };

    state.activeSliceEffects.push(effect);

    return effect;
  }

  function createSliceParticleFan(sliceAngle) {
    const particles = [];
    const sideAngles = [-26, 0, 26];

    for (let side = -1; side <= 1; side += 2) {
      sideAngles.forEach((fanOffset, index) => {
        const angle = sliceAngle + (side * 90) + fanOffset + (-5 + Math.random() * 10);
        const distanceScale = 0.38 + index * 0.12 + Math.random() * 0.1;
        const sizeScale = 0.11 + Math.random() * 0.08;
        const radians = angle * Math.PI / 180;

        particles.push({
          dx: Math.cos(radians) * distanceScale,
          dy: Math.sin(radians) * distanceScale,
          sizeScale,
          delay: 12 + Math.random() * 42,
          color: SLICE_EFFECT_TUNING.colors[particles.length % SLICE_EFFECT_TUNING.colors.length]
        });
      });
    }

    return particles;
  }

  function getParticleTravelPixels(dot, progress) {
    const travel = state.fruitEmojiSize || 72;

    return {
      x: dot.dx * travel * progress,
      y: dot.dy * travel * progress + travel * 0.18 * progress * progress
    };
  }


  function renderSliceEffect(effect) {
    const now = performance.now();
    const age = Math.max(0, now - effect.createdAt);
    const slashProgress = clamp(age / SLICE_EFFECT_TUNING.slashDuration, 0, 1);
    const slashOpacity = slashProgress < 0.22
      ? slashProgress / 0.22
      : 1 - ((slashProgress - 0.22) / 0.78);
    const slashScaleX = 0.16 + Math.sin(slashProgress * Math.PI * 0.72) * 1.04;
    const slashScaleY = 0.82 + Math.sin(slashProgress * Math.PI) * 0.18;

    const dotsHtml = effect.dots.map((dot) => {
      const dotAge = Math.max(0, age - dot.delay);
      const dotProgress = clamp(dotAge / SLICE_EFFECT_TUNING.dotDuration, 0, 1);
      const dotOpacity = dotProgress <= 0
        ? 0
        : dotProgress < 0.2
          ? dotProgress / 0.2
          : 1 - ((dotProgress - 0.2) / 0.8);
      const dotTravel = getParticleTravelPixels(dot, dotProgress);
      const dotScale = 0.95 - dotProgress * 0.65;

      return `
        <span
          class="fs-juice-dot"
          style="
            --dot-size-scale:${dot.sizeScale.toFixed(3)};
            --dot-color:${dot.color};
            opacity:${Math.max(0, dotOpacity).toFixed(3)};
            transform:translate(${dotTravel.x.toFixed(1)}px, ${dotTravel.y.toFixed(1)}px) translate(-50%, -50%) scale(${Math.max(0.18, dotScale).toFixed(3)});
          "
        ></span>
      `;
    }).join("");

    return `
      <div class="fs-slice-effect" style="transform:translate(${effect.x}px, ${effect.y}px)">
        <span
          class="fs-slice-slash"
          style="
            opacity:${Math.max(0, slashOpacity).toFixed(3)};
            transform:translate(-50%, -50%) rotate(${effect.rotation.toFixed(1)}deg) scale(${Math.max(0.05, slashScaleX).toFixed(3)}, ${slashScaleY.toFixed(3)});
          "
        ></span>
        ${dotsHtml}
      </div>
    `;
  }


  async function finishGame() {
    state.running = false;
    state.done = true;
    stopLoop();

    let reward = { ok: false, petUnlockTriggered: false };

    if (!completionMarked && ctx.verseId && selectedMode) {
      completionMarked = true;

      try {
        completionResult = await window.VerseGameBridge.completeGameRun({
          verseId: ctx.verseId,
          gameId: GAME_ID,
          mode: selectedMode,
          stats: {
            bonusCount: state.bonusCount,
            wordsBuilt: state.wordsBuilt,
            wrongStreak: state.wrongStreak
          }
        });

        reward = completionResult.reward;
      } catch (err) {
        console.error("completeGameRun failed", err);

        completionResult = {
          ok: false,
          alreadyCompleted: alreadyCompletedForMode,
          newlyCompleted: false,
          reward: {
            ok: false,
            petUnlockTriggered: false
          }
        };

        reward = completionResult.reward;
      }
    }

    renderEndScreen(reward);
  }

  function getCurrentTargetText() {
    if (state.phase === "book") return state.verseMeta.book || "";
    if (state.phase === "reference") return state.verseMeta.reference || "";
    return state.wordEntries[state.wordsBuilt]?.display || "";
  }

  function pickDisplayTextForCurrentPhase(correct) {
    if (state.phase === "book") return pickPhaseChoice(correct, state.bookChoices);
    if (state.phase === "reference") return pickPhaseChoice(correct, state.referenceChoices);


    let wrongPool = [];
    if (selectedMode === "medium" || selectedMode === "hard") {
      wrongPool = getVerseDerivedDecoys(state.wordsBuilt, correct);
    } else {
      wrongPool = window.VerseGameShell.getFunWordDecoys(
        correct,
        state.wordEntries.map((entry) => entry.display),
        12
      );
    }

    return pickCorrectOrDecoy(correct, wrongPool);
  }

  function pickPhaseChoice(correct, choicePool) {
    const wrongs = (choicePool || []).filter((item) => item !== correct);
    return pickCorrectOrDecoy(correct, wrongs);
  }

  function pickCorrectOrDecoy(correct, wrongPool) {
    const wrongs = (wrongPool || []).filter(Boolean);
    const mustUseCorrect = state.wrongStreak >= DECOY_TUNING.maxWrongChoicesInRow;
    const mustUseDecoy = state.correctChoiceStreak >= DECOY_TUNING.hardLimitCorrectStreak && wrongs.length > 0;

    let correctChance = DECOY_TUNING.baseCorrectChance;
    if (state.correctChoiceStreak >= DECOY_TUNING.softLimitCorrectStreak) {
      correctChance = DECOY_TUNING.softLimitCorrectChance;
    }

    const useCorrect = !mustUseDecoy && (
      mustUseCorrect ||
      Math.random() < correctChance ||
      !wrongs.length
    );

    if (useCorrect) {
      state.wrongStreak = 0;
      state.correctChoiceStreak += 1;
      return { text: correct, isCorrect: true };
    }

    state.wrongStreak += 1;
    state.correctChoiceStreak = 0;
    return { text: pickRandom(wrongs), isCorrect: false };
  }


  function getVerseDerivedDecoys(targetIndex, correct) {
    return window.VerseGameShell.getVerseWordDecoys({
      words: state.wordEntries.map((entry) => entry.display),
      correct,
      targetIndex,
      count: 12,
      avoidNext: 2,
      fallbackToFun: true
    });
  }

  function makeBookChoices(correctBook) {
    const correct = String(correctBook || "").trim();
    if (!correct) return [];

    const others = window.VerseGameShell.getBookDecoys(correct, 3);

    return shuffle([correct, ...others]).slice(0, 4);
  }

  function makeReferenceChoices(referenceMeta, mode) {
    const correct = String(referenceMeta?.reference || "").trim();

    if (!correct) return [];

    const decoys = window.VerseGameShell.getReferenceDecoys(referenceMeta, mode, 3);

    return shuffle([
      correct,
      ...decoys.filter((ref) => normalizeWord(ref) !== normalizeWord(correct))
    ]).slice(0, 4);
  }

  function parseVerseMeta(verseId, fallbackRef) {
    return window.VerseGameShell.parseReferenceParts(
      fallbackRef,
      ctx.translation,
      verseId
    );
  }


  function tokenizeVerseWithSpaces(text) {
    return window.VerseGameShell.tokenizeVerseForBuild(text);
  }

  function extractWordEntries(tokens) {
    return window.VerseGameShell.extractWordEntries(tokens);
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
      if (!audioUnlocked || ctx.state === "suspended") {
        await unlockAudio();
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

  function pickRandomSoundKey(group, previousKey) {
    const choices = SOUND_GROUPS[group] || [];
    if (!choices.length) return "";

    if (choices.length === 1) return choices[0];

    let next = pickRandom(choices);
    while (next === previousKey) {
      next = pickRandom(choices);
    }

    return next;
  }

  function playUiTapSound() {
    const now = performance.now();
    if (now - lastUiTapAt < 70) return;

    lastUiTapAt = now;
    uiSoundFlip = !uiSoundFlip;
    playGameSound(uiSoundFlip ? "uiTap1" : "uiTap2", "uiTap");
  }


  function playRandomSliceSound() {
    const key = pickRandomSoundKey("slice", lastSliceSound);
    if (!key) return;

    lastSliceSound = key;
    playGameSound(key, "slice");
  }

  function playRandomSwooshSound() {
    const now = performance.now();
    if (now - lastSwooshAt < SOUND_TUNING.minSwooshGapMs) return;

    const key = pickRandomSoundKey("swoosh", lastSwooshSound);
    if (!key) return;

    lastSwooshAt = now;
    lastSwooshSound = key;
    playGameSound(key, "swoosh");
  }


  const clamp = window.VerseGameShell.clamp;
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  const shuffle = window.VerseGameShell.shuffle;
  const capitalize = window.VerseGameShell.capitalize;

  const normalizeWord = window.VerseGameShell.normalizeWord;
  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
