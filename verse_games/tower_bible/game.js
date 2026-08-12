(async function () {
  const app = document.getElementById("app");
  const ctx = await window.VerseGameBridge.getVerseContext();
  const GAME_ID = "tower_bible";

  const GAME_TITLE = "Tower of Bible";
  const GAME_ICON = "🏰";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);

  const GAME_THEME = {
    bg: "#a0dce2",
    accent: "#40b9c5"
  };

  const HELP_OVERLAY_ID = "tbHelpOverlay";

  const BOOKS = window.VerseGameShell.getBibleBookDecoys();

  const FUN_DECOYS = window.VerseGameShell.getFunDecoys();

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

  const ZONE_PERCENTAGES = {
    easy: [0.05, 0.15, 0.60, 0.15, 0.05],
    medium: [0.10, 0.20, 0.40, 0.20, 0.10],
    hard: [0.20, 0.20, 0.20, 0.20, 0.20]
  };
  const BELT_SPEED_BRICK_HEIGHTS_PER_SECOND = {
    easy: 2.75,
    medium: 3.50,
    hard: 4.25
  };

  const THRESHOLDS = {
    easy: { warn1: 999, warn2: 999, collapse: 999 },
    medium: { warn1: 8, warn2: 12, collapse: 16 },
    hard: { warn1: 7, warn2: 11, collapse: 15 }
  };

  const DEBUG_COLLAPSE = false;

  const SILENCE_AUDIO_FILE = "../../verse_audio/silence.mp3";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";
  const TOWER_SOUND_BASE_PATH = "tower_bible_sounds/";

  const UI_SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`
  };

  const TOWER_SOUND_FILES = {
    brickLand: `${TOWER_SOUND_BASE_PATH}tower_bible_land.mp3`,
    warning: `${TOWER_SOUND_BASE_PATH}tower_bible_warning_1.mp3`,
    dangerWarning: `${TOWER_SOUND_BASE_PATH}tower_bible_warning_2.mp3`,
    collapse: `${TOWER_SOUND_BASE_PATH}tower_bible_collapse.mp3`,
    brickBreak: `${TOWER_SOUND_BASE_PATH}tower_bible_break.mp3`,
    streak: `${TOWER_SOUND_BASE_PATH}tower_bible_success.mp3`
  };

  const SOUND_TUNING = {
    debug: false,
    masterVolume: 1.00,
    volumes: {
      correctWord: 3.40,     // Verse Scramble wordComplete generated sound
      wrongWord: 3.60,       // Verse Scramble wrongLetter generated sound
      brickLand: 0.55,
      warning: 0.78,
      dangerWarning: 0.88,
      collapse: 0.90,
      brickBreak: 0.82,
      streak: 0.90,
      uiTap: 0.45
    }
  };

  const BRICK_BREAK_TUNING = {
    particleCount: 11,
    minSizePctOfBrickHeight: 0.12,
    maxSizePctOfBrickHeight: 0.26,
    colors: ["#6f4320", "#87532b", "#9b6436", "#b67643", "#c98a49", "#7f4d28"]
  };

  const INTRO_SEQUENCE = [
    { type: "brick", label: "TAP", textureClass: "tb-intro-green" },
    { type: "brick", label: "THE", textureClass: "tb-intro-green" },
    { type: "brick", label: "CORRECT", textureClass: "tb-intro-green" },
    { type: "brick", label: "WORDS!", textureClass: "tb-intro-green" },
    { type: "pause", ms: 900 },
    { type: "brick", label: "TIME", textureClass: "tb-intro-red" },
    { type: "brick", label: "YOUR", textureClass: "tb-intro-red" },
    { type: "brick", label: "TAPS", textureClass: "tb-intro-red" },
    { type: "brick", label: "CAREFULLY!", textureClass: "tb-intro-red" },
    { type: "pause", ms: 900 },
    { type: "guide", ms: 1150 },
    { type: "break", ms: 260 }
  ];

  const STREAK_CELEBRATION_TUNING = {
    milestones: [5, 10, 15, 20],
    colors: {
      rainbow: ["#ff5a51", "#ffa351", "#ffc751", "#a7cb6f", "#40b9c5", "#7f66c6", "#ff7ad9"],
      yellowStar: ["#ffc751", "#ffe27a"],
      white: ["#ffffff", "#fff6d7"]
    },
    byStreak: {
      5: {
        duration: 1300,
        particleCount: 34,
        shapeMode: "confetti",
        fireworkPairs: 0
      },
      10: {
        duration: 1700,
        particleCount: 52,
        shapeMode: "confetti",
        fireworkPairs: 1
      },
      15: {
        duration: 2100,
        particleCount: 70,
        shapeMode: "yellowStarsWhiteConfetti",
        fireworkPairs: 1
      },
      20: {
        duration: 2600,
        particleCount: 94,
        shapeMode: "rainbowStarsConfetti",
        fireworkPairs: 2
      }
    }
  };

  let selectedMode = null;
  let muted = false;
  let completionMarked = false;
  let alreadyCompletedForMode = false;
  let completionResult = null;
  let resizeBound = false;
  let endScreenUnlockTimer = 0;

  let audioCtx = null;
  let masterGain = null;
  let silenceAudioEl = null;
  let audioUnlocked = false;
  let uiSoundFlip = false;

  const audioBuffers = new Map();
  const audioBufferPromises = new Map();

  const verseMeta = parseVerseMeta(ctx.verseId || "", ctx.verseRef || "");
  const verseTokens = tokenizeVerse(ctx.verseText || "");
  const wordEntries = extractWordEntries(verseTokens);

  const state = {
    running: false,
    paused: false,
    pauseReason: "",
    rafId: 0,
    lastTs: 0,

    fieldWidth: 0,
    fieldHeight: 0,
    laneY: 0,
    laneHeight: 0,
    lanePadX: 0,
    guideCenterX: 0,
    guideLeftX: 0,
    guideRightX: 0,
    guideWidth: 0,
    brickWidth: 0,
    brickHeight: 0,
    brickGap: 0,
    brickStep: 0,
    beltSpeed: 0,
    towerWidth: 0,

    progress: [],
    phase: "words",
    wordIndex: 0,

    introActive: false,
    introStepIndex: 0,
    introNextAt: 0,
    introBreaking: false,
    introBreakNextAt: 0,
    introGuideVisible: true,
    introGuidePoppedAt: 0,

    towerShakeUntil: 0,
    towerSettleUntil: 0,
    guideFlashUntil: 0,
    overlayMessage: "",
    overlayTone: "",
    overlayStartedAt: 0,
    overlayUntil: 0,
    warningLevel: 0,
    warningOverlayLevel: 0,
    warningOverlayStartedAt: 0,
    warningOverlayUntil: 0,
    hadWarning2BeforePlacement: false,
    beltRespawnLockUntil: 0,
    beltNeedsFreshSpawn: false,
    collapseTriggered: false,
    collapseEndsAt: 0,
    collapseStartedAt: 0,
    collapseDir: 1,
    collapseBasePose: null,
    lastStableTowerPose: null,
    pendingPreCollapsePose: null,
    collapseBurstFired: {},
    collapseDebugFramesLeft: 0,

    stream: [],
    streamId: 0,
    fx: [],
    enteringBrick: null,
    enteringId: 0,
    done: false,
    frenzyActive: false,
    frenzyInputLockedUntil: 0,
    frenzyBreakSeq: 0,
    frenzyDropDelays: {},
    frenzyDropMotion: {},

    pendingCorrectLabel: "",
    pendingCorrectType: "word",
    pendingCorrectVisible: 0,
    spawnIndex: 0,

    correctStreak: 0,
    streakMilestonesShown: {}
  };

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
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
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
      backLabel: "Back to Tower of Bible title",
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
    alreadyCompletedForMode = !!window.VerseGameBridge.wasAlreadyCompleted?.(ctx.verseId, GAME_ID, selectedMode);

    Object.assign(state, {
      running: true, paused: false, pauseReason: "", lastTs: 0,
      progress: [], phase: "words", wordIndex: 0,
      introActive: true, introStepIndex: 0, introNextAt: 0, introBreaking: false, introBreakNextAt: 0, introGuideVisible: false, introGuidePoppedAt: 0,
      towerShakeUntil: 0, towerSettleUntil: 0, guideFlashUntil: 0,
      overlayMessage: "", overlayTone: "", overlayStartedAt: 0, overlayUntil: 0,
      warningLevel: 0, warningOverlayLevel: 0, warningOverlayStartedAt: 0, warningOverlayUntil: 0, hadWarning2BeforePlacement: false, beltRespawnLockUntil: 0, beltNeedsFreshSpawn: false, collapseTriggered: false, collapseEndsAt: 0, collapseStartedAt: 0, collapseDir: 1, collapseBasePose: null, lastStableTowerPose: null, pendingPreCollapsePose: null, collapseBurstFired: {}, collapseDebugFramesLeft: 0,
      stream: [], streamId: 0, fx: [], enteringBrick: null, enteringId: 0,
      done: false, frenzyActive: false, frenzyInputLockedUntil: 0, frenzyBreakSeq: 0, frenzyDropDelays: {}, frenzyDropMotion: {}, pendingCorrectLabel: "", pendingCorrectType: "word",
      pendingCorrectVisible: 0, spawnIndex: 0,
      correctStreak: 0, streakMilestonesShown: {}
    });
    updatePhaseFromProgress(0);
    seedPendingCorrect();

    app.innerHTML = `
      <div class="tb-shell">
        <div class="tb-stage">
          <div class="tb-field-wrap">
            <div class="tb-field" id="tbField">
              <img
                class="tb-cloud tb-cloud-back"
                src="tower_bible_images/tower_bible_cloud_1.svg"
                alt=""
                aria-hidden="true"
              >
              <div class="tb-tower-layer" id="tbTowerLayer"></div>
              <img
                class="tb-cloud tb-cloud-front"
                src="tower_bible_images/tower_bible_cloud_2.svg"
                alt=""
                aria-hidden="true"
              >
              <div class="tb-warning-layer" id="tbWarningLayer"></div>
              <div class="tb-guide-layer" id="tbGuideLayer"></div>
              <div class="tb-conveyor-layer" id="tbConveyorLayer"></div>
              <div class="tb-enter-layer" id="tbEnterLayer"></div>
              <div class="tb-smoke-layer" id="tbSmokeLayer"></div>
              <div class="tb-popup-layer" id="tbPopupLayer"></div>
              <div class="tb-celebration-layer" id="tbCelebrationLayer"></div>
              <div id="tbDebugLayer" style="position:absolute;left:8px;bottom:8px;z-index:20;pointer-events:none;"></div>
              <div class="tb-controls-layer">
                <button class="tb-corner-pill tb-corner-left" id="tbMenuPill" type="button" aria-label="Game menu">☰</button>
                <div class="tb-corner-pill tb-corner-right" id="tbPhasePill"></div>
              </div>
            </div>
          </div>
        </div>
        ${renderHelpOverlay(helpHtml())}
        ${renderGameMenuOverlay()}
      </div>`;

    wireCommonNav();
    wireGameInput();
    recalcField();
    startIntroSequence();
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

    const gameMessage = completionResult?.alreadyCompleted
      ? "Tower rebuilt!"
      : "Tower complete!";

    window.VerseGameShell.renderCompleteScreen({
      app,
      icon: GAME_ICON,
      iconHtml: earnedMedalIconHtml,
      gameIcon: GAME_ICON,
      mode: selectedMode,
      verseId: ctx.verseId,
      gameId: GAME_ID,
      completion: completionResult,
      gameMessage,
      theme: GAME_THEME,
      backLabel: "Back to Practice Games",
      onPlayAgain: () => {
        unlockAudio();
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
      id: "tbGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function helpHtml() {
    return `Tap the correct brick when it reaches the center arrows.<br><br>
      The closer you tap to the center, the straighter your tower will build.<br><br>
      Keep your tower from leaning too far left or right.`;
  }

  function wireCommonNav() {
    window.VerseGameShell.wireGameMenu({
      id: "tbGameMenuOverlay",
      menuButtonId: "tbMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        unlockAudio();

        const wasMuted = muted;
        muted = !muted;

        if (wasMuted) {
          playUiTapSound(true);
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

  function wireGameInput() {
    if (!resizeBound) {
      window.addEventListener("resize", recalcField);
      resizeBound = true;
    }
    const menuPill = document.getElementById("tbMenuPill");
    if (menuPill) {
      menuPill.onclick = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        openGameMenu();
      };
    }

    const field = document.getElementById("tbField");
    if (field) {
      field.onpointerdown = (e) => {
        const menuPillEl = document.getElementById("tbMenuPill");
        if (menuPillEl && menuPillEl.contains(e.target)) return;
        if (state.frenzyActive) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          handleFrenzyTap();
        }
      };
    }

    window.onkeydown = (e) => {
      if (e.key === "Escape" && state.running) {
        if (document.getElementById("tbGameMenuOverlay")?.classList.contains("is-open")) closeGameMenu();
        else openGameMenu();
      }
    };
  }

  function openGameMenu() {
    playUiTapSound();

    const menuOverlay = document.getElementById("tbGameMenuOverlay");
    if (menuOverlay) {
      setPaused(true, "menu");
      menuOverlay.classList.add("is-open");
      menuOverlay.setAttribute("aria-hidden", "false");
    }
  }
  function closeGameMenu() {
    playUiTapSound();

    const menuOverlay = document.getElementById("tbGameMenuOverlay");

    if (menuOverlay && menuOverlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    if (menuOverlay) {
      menuOverlay.classList.remove("is-open");
      menuOverlay.setAttribute("aria-hidden", "true");
    }

    const helpOverlay = document.getElementById("tbHelpOverlay");
    if (!helpOverlay || !helpOverlay.classList.contains("is-open")) setPaused(false, "");
  }

  function openHelpFromMenu() {
    playUiTapSound();

    const menuOverlay = document.getElementById("tbGameMenuOverlay");

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

    const menuOverlay = document.getElementById("tbGameMenuOverlay");
    if (menuOverlay) menuOverlay.classList.add("is-open");

    setPaused(true, "menu");
  }

  function getSoundVolume(eventId) {
    const volume = SOUND_TUNING.volumes[eventId];
    return typeof volume === "number" ? volume : 1;
  }

  function getSilenceAudioElement() {
    if (silenceAudioEl) return silenceAudioEl;

    silenceAudioEl = document.createElement("audio");
    silenceAudioEl.preload = "auto";
    silenceAudioEl.playsInline = true;
    silenceAudioEl.setAttribute("playsinline", "");
    silenceAudioEl.src = SILENCE_AUDIO_FILE;
    silenceAudioEl.style.display = "none";
    document.body.appendChild(silenceAudioEl);

    return silenceAudioEl;
  }

  function primeHtmlAudio() {
    try {
      const audio = getSilenceAudioElement();
      audio.muted = false;
      audio.volume = 0.01;
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(() => {
          setTimeout(() => {
            try {
              audio.pause();
              audio.currentTime = 0;
            } catch (err) {
              // Ignore audio reset errors.
            }
          }, 80);
        }).catch(() => {
          // iOS may reject this outside a user gesture. We retry on the next tap.
        });
      }
    } catch (err) {
      // Silent audio unlock is best-effort.
    }
  }

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = SOUND_TUNING.masterVolume;
    masterGain.connect(audioCtx.destination);

    return audioCtx;
  }

  function unlockAudio() {
    primeHtmlAudio();

    const ctx = ensureAudioContext();
    if (!ctx || !masterGain) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { });
    }

    try {
      const t = ctx.currentTime + 0.01;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, t);
      gain.gain.setValueAtTime(0.0001, t);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.03);

      audioUnlocked = true;
      preloadAudioFiles();
    } catch (err) {
      // Unlock blip is best-effort.
    }
  }

  function soundEnvelope(eventId, start, duration, peak = 0.2, attack = 0.005, release = 0.06) {
    const ctx = ensureAudioContext();
    if (!ctx || !masterGain) return null;

    const gain = ctx.createGain();
    const scaledPeak = Math.max(0.0002, peak * getSoundVolume(eventId));

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(scaledPeak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);
    gain.connect(masterGain);

    return gain;
  }

  function playOsc(eventId, type, freq, start, duration, gain = 0.18, endFreq = null) {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const envelope = soundEnvelope(eventId, start, duration, gain);
    if (!envelope) return;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
    }

    osc.connect(envelope);
    osc.start(start);
    osc.stop(start + duration + 0.1);
  }

  function soundCorrectWord(t) {
    playOsc("correctWord", "sine", 523, t, 0.08, 0.07);
    playOsc("correctWord", "sine", 659, t + 0.07, 0.08, 0.07);
    playOsc("correctWord", "sine", 784, t + 0.14, 0.12, 0.08);
    playOsc("correctWord", "sine", 1046, t + 0.20, 0.16, 0.06);
  }

  function soundWrongWord(t) {
    playOsc("wrongWord", "triangle", 220, t, 0.08, 0.10, 170);
    playOsc("wrongWord", "triangle", 170, t + 0.07, 0.09, 0.07);
  }

  function playGeneratedSound(eventId) {
    if (muted) {
      if (SOUND_TUNING.debug) console.log("[TowerBibleSound] muted generated", eventId);
      return;
    }

    unlockAudio();

    const ctx = ensureAudioContext();
    if (!ctx || !masterGain) {
      if (SOUND_TUNING.debug) console.warn("[TowerBibleSound] no audio context for", eventId);
      return;
    }

    if (SOUND_TUNING.debug) {
      console.log("[TowerBibleSound] generated", eventId, "ctx:", ctx.state);
    }

    masterGain.gain.value = SOUND_TUNING.masterVolume;

    const t = ctx.currentTime + 0.01;

    if (eventId === "correctWord") {
      soundCorrectWord(t);
    } else if (eventId === "wrongWord") {
      soundWrongWord(t);
    }
  }

  function preloadAudioFiles() {
    Object.values(UI_SOUND_FILES).forEach((url) => loadAudioBuffer(url));
    Object.values(TOWER_SOUND_FILES).forEach((url) => loadAudioBuffer(url));
  }

  function loadAudioBuffer(url) {
    if (!url) return Promise.resolve(null);

    if (audioBuffers.has(url)) {
      return Promise.resolve(audioBuffers.get(url));
    }

    if (audioBufferPromises.has(url)) {
      return audioBufferPromises.get(url);
    }

    if (SOUND_TUNING.debug) {
      console.log("[TowerBibleSound] loading", url);
    }

    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load sound: ${url} (${response.status})`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const ctx = ensureAudioContext();
        if (!ctx) throw new Error("No AudioContext available");
        return ctx.decodeAudioData(arrayBuffer);
      })
      .then((buffer) => {
        if (buffer) {
          audioBuffers.set(url, buffer);
          if (SOUND_TUNING.debug) {
            console.log("[TowerBibleSound] loaded", url);
          }
        }
        return buffer;
      })
      .catch((err) => {
        if (SOUND_TUNING.debug) {
          console.warn("[TowerBibleSound] failed", url, err);
        }
        return null;
      });

    audioBufferPromises.set(url, promise);
    return promise;
  }

  function playBufferedSound(url, eventId, allowWhenMuted = false) {
    if (muted && !allowWhenMuted) return;

    unlockAudio();

    const ctx = ensureAudioContext();
    if (!ctx || !masterGain || !url) return;

    masterGain.gain.value = SOUND_TUNING.masterVolume;

    const startBuffer = (buffer) => {
      if (!buffer) return;
      if (muted && !allowWhenMuted) return;

      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        gain.gain.value = getSoundVolume(eventId);

        source.connect(gain);
        gain.connect(masterGain);

        source.start(ctx.currentTime + 0.01);
      } catch (err) {
        // Sounds should never break gameplay.
      }
    };

    const existingBuffer = audioBuffers.get(url);
    if (existingBuffer) {
      startBuffer(existingBuffer);
      return;
    }

    loadAudioBuffer(url).then(startBuffer);
  }

  function playUiTapSound(allowWhenMuted = false) {
    const key = uiSoundFlip ? "uiTap2" : "uiTap1";
    uiSoundFlip = !uiSoundFlip;
    playBufferedSound(UI_SOUND_FILES[key], "uiTap", allowWhenMuted);
  }

  function playGameSound(eventId) {
    if (SOUND_TUNING.debug) {
      console.log("[TowerBibleSound] request", eventId);
    }

    if (eventId === "correctWord" || eventId === "wrongWord") {
      playGeneratedSound(eventId);
      return;
    }

    playBufferedSound(TOWER_SOUND_FILES[eventId], eventId);
  }

  window.tbTestSound = function tbTestSound(eventId = "brickLand") {
    unlockAudio();
    playGameSound(eventId);
  };

  window.tbSetBeltSpeed = function tbSetBeltSpeed(brickHeightsPerSecond = 2.12) {
    state.beltSpeed = state.brickHeight * brickHeightsPerSecond;
    console.log(
      `[TowerBible] belt speed set to ${brickHeightsPerSecond} brick-heights/sec = ${Math.round(state.beltSpeed)} px/sec`
    );
  };

  function setPaused(paused, reason = "") {
    state.paused = paused;
    state.pauseReason = paused ? reason : "";
    if (!paused) state.lastTs = performance.now();
  }

  function recalcField() {
    const field = document.getElementById("tbField");
    if (!field) return;
    const rect = field.getBoundingClientRect();

    state.fieldWidth = rect.width;
    state.fieldHeight = rect.height;

    state.brickWidth = clamp(state.fieldWidth * 0.27, 130, 188);
    state.brickHeight = clamp(state.fieldWidth * 0.11, 58, 78);
    field.style.setProperty("--tb-live-brick-height", `${state.brickHeight}px`);
    state.brickGap = clamp(state.brickWidth * 1.08, 150, 236);
    state.brickStep = state.brickWidth + state.brickGap;
    state.guideWidth = state.brickWidth;
    state.laneHeight = Math.max(state.brickHeight + 18, clamp(state.fieldWidth * 0.16, 94, 126));
    state.lanePadX = 0;
    state.laneY = state.fieldHeight - laneBottomOffset() - state.laneHeight / 2;
    state.guideCenterX = state.fieldWidth / 2;
    state.guideLeftX = state.guideCenterX - state.guideWidth / 2;
    state.guideRightX = state.guideCenterX + state.guideWidth / 2;
    state.towerWidth = Math.min(state.fieldWidth * 0.86, 560);

    const speedInBrickHeights = BELT_SPEED_BRICK_HEIGHTS_PER_SECOND[selectedMode || "easy"];
    state.beltSpeed = state.brickHeight * speedInBrickHeights;

    renderHud();
  }

  function renderHud() {
    const phasePill = document.getElementById("tbPhasePill");
    if (phasePill) phasePill.textContent = currentPhaseLabel();
    renderField();
  }

  function currentPhaseLabel() {
    if (state.introActive) return "Watch";
    if (state.frenzyActive) return "Destroy!";
    if (state.done) return "Done";
    if (state.phase === "words") return `${state.wordIndex}/${wordEntries.length}`;
    if (state.phase === "book") return "Book";
    if (state.phase === "reference") return "Reference";
    return "Ready";
  }

  function getLinearProgressIndex() {
    if (state.phase === "words") {
      return state.wordIndex;
    }

    if (state.phase === "book") {
      return wordEntries.length;
    }

    if (state.phase === "reference") {
      return wordEntries.length + (verseMeta.book ? 1 : 0);
    }

    return wordEntries.length + (verseMeta.book ? 1 : 0) + (verseMeta.reference ? 1 : 0);
  }

  function updatePhaseFromProgress(progressIndex = getLinearProgressIndex()) {
    const phase = window.VerseGameShell.getPhaseForProgress({
      progressIndex,
      wordCount: wordEntries.length,
      totalSegments: wordEntries.length + (verseMeta.book ? 1 : 0) + (verseMeta.reference ? 1 : 0),
      bookLabel: verseMeta.book,
      referenceLabel: verseMeta.reference
    });

    state.phase = phase;
    return phase;
  }

  function renderField() {
    const towerLayer = document.getElementById("tbTowerLayer");
    const guideLayer = document.getElementById("tbGuideLayer");
    const conveyorLayer = document.getElementById("tbConveyorLayer");
    const enterLayer = document.getElementById("tbEnterLayer");
    const smokeLayer = document.getElementById("tbSmokeLayer");
    const popupLayer = document.getElementById("tbPopupLayer");
    const warningLayer = document.getElementById("tbWarningLayer");
    const debugLayer = document.getElementById("tbDebugLayer");
    if (!towerLayer || !guideLayer || !conveyorLayer || !enterLayer || !smokeLayer || !popupLayer || !warningLayer) return;

    renderTower(towerLayer);
    renderGuide(guideLayer);
    renderConveyor(conveyorLayer);
    renderEnteringBrick(enterLayer);
    renderOverlayMessage(popupLayer);
    renderEffects(smokeLayer);
    renderWarning(warningLayer);
    renderDebug(debugLayer);
  }

  function renderGuide(layer) {
    if (state.introActive && !state.introGuideVisible) {
      layer.innerHTML = "";
      return;
    }

    const laneBottom = clamp(state.fieldWidth * 0.055, 24, 42);
    const groundHeight = laneBottom + state.laneHeight;
    const laneTop = state.fieldHeight - groundHeight;
    const indicatorHeight = state.laneHeight * 0.25;
    const revealClass = state.introActive &&
      state.introGuideVisible &&
      performance.now() - state.introGuidePoppedAt < 900
      ? " is-intro-reveal"
      : "";

    layer.innerHTML = `
      <div class="tb-center-indicator-wrap${revealClass}" style="left:${state.guideCenterX}px;top:${laneTop}px;height:${groundHeight}px;--tb-indicator-height:${indicatorHeight}px;">
        <img
          class="tb-center-indicator tb-center-indicator-top"
          src="tower_bible_images/tower_bible_center_indicator.svg"
          alt=""
          aria-hidden="true"
        >
        <img
          class="tb-center-indicator tb-center-indicator-bottom"
          src="tower_bible_images/tower_bible_center_indicator.svg"
          alt=""
          aria-hidden="true"
        >
      </div>`;
  }

  function renderOverlayMessage(layer) {
    const now = performance.now();
    if (!layer) return;

    const hasTimingOverlay = state.overlayMessage && now < state.overlayUntil;

    let message = "";
    let tone = "";
    let startedAt = state.overlayStartedAt || now;
    let duration = Math.max(1, state.overlayUntil - startedAt);

    if (hasTimingOverlay) {
      message = state.overlayMessage;
      tone = state.overlayTone;
    } else if (
      !state.collapseTriggered &&
      !state.done &&
      !state.frenzyActive &&
      state.warningOverlayLevel > 0 &&
      now < state.warningOverlayUntil
    ) {
      if (state.warningOverlayLevel >= 2) {
        message = "ABOUT\nTO FALL!";
        tone = "warning2";
      } else {
        message = "TOWER IS\nLEANING!";
        tone = "warning1";
      }

      startedAt = state.warningOverlayStartedAt || now;
      duration = Math.max(1, state.warningOverlayUntil - startedAt);
    }

    if (!message) {
      layer.innerHTML = "";
      return;
    }

    const toneClass = tone ? ` is-timing is-${tone}` : "";
    const t = clamp((now - startedAt) / duration, 0, 1);

    let opacity = 1;
    let scale = 1;
    let y = -50;
    let rot = 0;

    if (tone === "warning1") {
      scale = 1 + Math.sin(now / 175) * 0.025;
      rot = Math.sin(now / 260) * 0.8;
    } else if (tone === "warning2") {
      scale = 1 + Math.sin(now / 95) * 0.045;
      rot = Math.sin(now / 120) * 1.7;
    } else if (tone) {
      if (t < 0.16) {
        const p = t / 0.16;
        opacity = p;
        scale = lerp(0.25, 1.12, p);
        rot = lerp(-9, 3, p);
      } else if (t < 0.35) {
        const p = (t - 0.16) / 0.19;
        opacity = 1;
        scale = lerp(1.12, 0.98, p);
        rot = lerp(3, -2, p);
      } else if (t < 0.72) {
        const p = (t - 0.35) / 0.37;
        opacity = 1;
        scale = lerp(0.98, 1.02, p);
        rot = lerp(-2, 1, p);
      } else {
        const p = (t - 0.72) / 0.28;
        opacity = 1 - p;
        scale = lerp(1.02, 0.72, p);
        y = lerp(-50, -68, p);
        rot = lerp(1, 7, p);
      }
    }

    const bgPos = tone === "perfect" ? `${Math.round(t * 260)}% 50%` : "50% 50%";

    layer.innerHTML = `<div class="tb-center-overlay-msg${toneClass}" style="opacity:${opacity.toFixed(3)};transform:translate(-50%, ${y.toFixed(1)}%) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg);background-position:${bgPos};">${formatOverlayMessage(message)}</div>`;
  }

  function renderConveyor(layer) {
    const laneBottom = clamp(state.fieldWidth * 0.055, 24, 42);
    const groundHeight = laneBottom + state.laneHeight;
    const tuftHeight = state.brickHeight * 0.42;
    const rightBrickEdge = state.fieldWidth * 0.5 + (state.towerWidth * 0.76) * 0.5;

    let html = `
      <div class="tb-conveyor-ground" style="height:${groundHeight}px;">
        <div class="tb-grass-overlay"></div>
      </div>

      <img
        class="tb-grass-tuft tb-grass-tuft-left"
        src="tower_bible_images/tower_bible_grass_tuft_1.svg"
        alt=""
        aria-hidden="true"
        style="left:${-tuftHeight * 0.5}px;bottom:${groundHeight - 1}px;height:${tuftHeight}px;"
      >

      <img
        class="tb-grass-tuft tb-grass-tuft-mid"
        src="tower_bible_images/tower_bible_grass_tuft_2.svg"
        alt=""
        aria-hidden="true"
        style="left:${rightBrickEdge + tuftHeight}px;bottom:${groundHeight - 1}px;height:${tuftHeight}px;"
      >

      <img
        class="tb-grass-tuft tb-grass-tuft-right"
        src="tower_bible_images/tower_bible_grass_tuft_1.svg"
        alt=""
        aria-hidden="true"
        style="right:${-tuftHeight * 0.5}px;bottom:${groundHeight - 1}px;height:${tuftHeight}px;"
      >
    `;

    if (!state.introActive) {
      html += `
        <div class="tb-conveyor-lane" style="left:${state.lanePadX}px;right:${state.lanePadX}px;bottom:0;height:${groundHeight}px;">
      `;

      for (const brick of state.stream) {
        const tappable = isBrickTappable(brick) && !state.collapseTriggered && !state.enteringBrick;
        const classes = ["tb-choice-brick"];
        if (brick.kind === "book") classes.push("is-book");
        if (brick.kind === "reference") classes.push("is-ref");
        if (brick.flashWrong) classes.push("is-wrong");
        html += `
          <button class="${classes.join(" ")}" data-id="${brick.id}" style="left:${Math.round(brick.left)}px;width:${state.brickWidth}px;height:${state.brickHeight}px;font-size:${brick.fontSize}px;" aria-label="${brick.isCorrect ? "Correct brick" : "Brick"}">${escapeHtml(brick.label)}</button>`;
      }

      html += `
        </div>`;
    }

    layer.innerHTML = html;

    if (state.introActive) return;

    layer.querySelectorAll("[data-id]").forEach((el) => {
      const id = Number(el.dataset.id);
      const brick = state.stream.find((b) => b.id === id);
      if (!brick) return;
      const onActivate = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        handleBrickTap(id);
      };
      el.onclick = onActivate;
      el.onpointerdown = onActivate;
    });
  }

  function renderEnteringBrick(layer) {
    const e = state.enteringBrick;
    if (!e) {
      layer.innerHTML = "";
      return;
    }

    const cls = ["tb-enter-brick", e.textureClass || "tb-texture-normal"];
    if (e.kind === "book") cls.push("book");
    if (e.kind === "reference") cls.push("ref");

    layer.innerHTML = `
      <div class="${cls.join(" ")}"
           style="
             left:${e.left}px;
             bottom:${e.bottom}px;
             width:${e.width}px;
             height:${e.height}px;
             font-size:${e.fontSize}px;
             transform:translateX(0) rotate(${e.rot}deg);
             opacity:1;
           ">
        ${escapeHtml(e.label)}
      </div>
    `;
  }

  function renderTower(layer) {
    const now = performance.now();
    layer.classList.toggle("is-frenzy", state.frenzyActive);
    const towerShellClass = ["tb-tower-shell"];
    if (!state.collapseTriggered) {
      if (state.towerShakeUntil > now) towerShellClass.push("tb-tower-shake");
      else if (state.towerSettleUntil > now) towerShellClass.push("tb-tower-settle");
    }

    const lean = getVisualLean();
    const count = state.progress.length;
    const maxLeanPx = Math.min(state.fieldWidth * 0.065, 46);
    const collapseElapsed = state.collapseTriggered ? (now - state.collapseStartedAt) : 0;
    const collapseTensionMs = 180;
    const collapseStepMs = 250;
    const collapseTipMs = 240;
    const collapseDropMs = 900;

    const shellRot = getTowerShellRotation(now);
    const enteringTowerLift = getEnteringTowerLift();
    let html = `<div class="${towerShellClass.join(" ")}" id="tbTowerShell" style="transform:translateX(-50%) rotate(${shellRot}deg);">`;

    let cumulativeBottom = 0;
    const debugRenderedBricks = [];
    for (let i = 0; i < count; i++) {
      const brick = state.progress[i];
      const level = i;
      const t = count <= 1 ? 0 : level / Math.max(1, count - 1);
      const curve = Math.pow(t, 1.55);
      const scale = Math.max(0.26, Math.pow(0.95, level));
      const width = state.towerWidth * 0.76 * scale;
      const height = Math.max(34, state.brickHeight * 0.9 * scale);
      const fontSize = Math.max(13, state.brickHeight * 0.33 * scale);


      const liveBaseOffsetX = count <= 1 ? 0 : lean * maxLeanPx * curve;
      const liveBaseRot = count <= 2 ? 0 : lean * 1.15 * Math.pow(t, 1.7);
      const frozenPose = state.collapseBasePose?.[i] || null;
      const baseOffsetX = frozenPose ? frozenPose.offsetX : liveBaseOffsetX;
      const baseRot = frozenPose ? frozenPose.rot : liveBaseRot;

      const cls = ["tb-tower-brick", brick.textureClass || "tb-texture-normal"];
      let opacity = Math.max(0.72, 1 - level * 0.02);
      let bottom = cumulativeBottom + enteringTowerLift;
      let offsetX = baseOffsetX;
      let rot = baseRot;

      if (brick.kind === "book") cls.push("book");
      if (brick.kind === "reference") cls.push("ref", "capstone");

      if (state.collapseTriggered) {
        cls.push("is-collapsing");

        const topIndex = count - 1 - i; // top brick starts first
        const localStart = collapseTensionMs + topIndex * collapseStepMs;
        const elapsedForBrick = collapseElapsed - localStart;

        const tipT = clamp(elapsedForBrick / collapseTipMs, 0, 1);
        const fallT = clamp((elapsedForBrick - collapseTipMs) / collapseDropMs, 0, 1);

        const tipEase = tipT <= 0 ? 0 : Math.pow(tipT, 1.65);
        const fallEase = fallT <= 0 ? 0 : (1 - Math.pow(1 - fallT, 2.25));

        const burstKey = `c${i}`;
        if (fallT > 0 && !state.collapseBurstFired[burstKey]) {
          const burstX = state.fieldWidth * 0.5 + baseOffsetX;
          const burstY = state.fieldHeight - (towerBaseBottom() + cumulativeBottom + height * 0.5);
          addChunkBurst(burstX, burstY, Math.max(0.9, scale * 0.95));
          state.collapseBurstFired[burstKey] = true;
        }

        const tipRot = state.collapseDir * (22 * tipEase);
        const fallRot = state.collapseDir * (84 * fallEase);
        const fallShift = state.collapseDir * (132 * fallEase);

        offsetX = baseOffsetX + fallShift;
        bottom = cumulativeBottom - ((state.fieldHeight + 260 + topIndex * 44) * fallEase);
        rot = baseRot + tipRot + fallRot;
        opacity = Math.max(0, opacity * (1 - fallEase * 0.84));
      }

      else {
        const sway = getBrickWarningSway(now, i, count);
        offsetX += sway.x;
        rot += sway.rot;
      }



      if (DEBUG_COLLAPSE && state.collapseTriggered) {
        debugRenderedBricks.push({
          i,
          label: brick.label,
          baseOffsetX,
          offsetX,
          baseRot,
          rot,
          bottom
        });
      }

      const dropMotion = state.frenzyActive && state.frenzyDropMotion
        ? state.frenzyDropMotion[i]
        : null;

      if (dropMotion) {
        const delay = Number(dropMotion.delay || 0);
        const duration = Number(dropMotion.duration || 360);
        const rawT = clamp((now - dropMotion.startedAt - delay) / duration, 0, 1);
        const easedT = rawT <= 0 ? 0 : 1 - Math.pow(1 - rawT, 3);

        bottom += dropMotion.fromBottomOffset * (1 - easedT);

        if (rawT >= 1) {
          delete state.frenzyDropMotion[i];
        }
      }

      const frenzyAttrs = state.frenzyActive
        ? ` data-frenzy-index="${i}" role="button" aria-label="Break ${escapeHtml(brick.label)} brick"`
        : "";

      html += `<div class="${cls.join(" ")}" ${frenzyAttrs} style="bottom:${bottom}px;width:${width}px;height:${height}px;font-size:${fontSize}px;opacity:${opacity.toFixed(3)};transform:translateX(calc(-50% + ${offsetX}px)) rotate(${rot}deg);">${escapeHtml(brick.label)}</div>`;


      cumulativeBottom += height - 1;
    }

    if (!state.collapseTriggered) {
      state.lastStableTowerPose = state.progress.map((brick, i) => {
        const level = i;
        const t = count <= 1 ? 0 : level / Math.max(1, count - 1);
        const curve = Math.pow(t, 1.55);
        const liveBaseOffsetX = count <= 1 ? 0 : lean * maxLeanPx * curve;
        const liveBaseRot = count <= 2 ? 0 : lean * 1.15 * Math.pow(t, 1.7);
        const sway = getBrickWarningSway(now, i, count);

        return {
          offsetX: liveBaseOffsetX + sway.x,
          rot: liveBaseRot + sway.rot
        };
      });
    }

    html += `</div>`;
    layer.innerHTML = html;

    if (state.frenzyActive) {
      layer.querySelectorAll("[data-frenzy-index]").forEach((el) => {
        const index = Number(el.dataset.frenzyIndex);
        const onBreak = (e) => {
          if (e) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
          }
          handleFrenzyTap(index);
        };

        el.onclick = onBreak;
        el.onpointerdown = onBreak;
      });
    }

    logCollapseFrame(now, debugRenderedBricks);

  }

  function renderEffects(layer) {
    const now = performance.now();
    state.fx = state.fx.filter((fx) => fx.until > now);

    let html = "";

    if (state.collapseTriggered && (now - state.collapseStartedAt) < 700) {
      html += `
        <div class="tb-base-smoke is-open">
          <div class="p p1"></div><div class="p p2"></div><div class="p p3"></div><div class="p p4"></div><div class="p p5"></div>
        </div>`;
    }

    for (const fx of state.fx) {
      if (fx.kind === "chunk") {
        const life = Math.max(0, (fx.until - now) / 480);
        const t = 1 - life;
        const x = fx.x + (fx.dx || 0) * t;
        const y = fx.y + (fx.dy || 0) * t + 18 * t * t;
        html += `<div class="tb-chunk-puff" style="left:${x}px;top:${y}px;width:${fx.size}px;height:${fx.size}px;opacity:${life.toFixed(3)};background:${fx.color || "#9b6436"};transform:translate(-50%,-50%) rotate(${fx.rot}deg);"></div>`;
      } else {
        const scale = fx.scale || 1;
        html += `<div class="tb-smoke-puff" style="left:${fx.x}px;top:${fx.y}px;transform:translate(-50%,-50%) scale(${scale});"></div>`;
      }
    }

    layer.innerHTML = html;
  }

  function renderWarning(layer) {
    if (!layer) return;
    layer.innerHTML = "";
  }

  function renderDebug(layer) {
    if (!layer) return;
    layer.innerHTML = "";
  }

  function logCollapseFrame(now, renderedBricks) {
    if (!DEBUG_COLLAPSE) return;
    if (!state.collapseTriggered) return;
    if (state.collapseDebugFramesLeft <= 0) return;

    const elapsed = now - state.collapseStartedAt;
    const summary = renderedBricks.slice(0, 5).map((b) => ({
      i: b.i,
      label: b.label,
      baseOffsetX: Number(b.baseOffsetX.toFixed(2)),
      offsetX: Number(b.offsetX.toFixed(2)),
      baseRot: Number(b.baseRot.toFixed(2)),
      rot: Number(b.rot.toFixed(2)),
      bottom: Number(b.bottom.toFixed(2))
    }));

    console.group(`[TowerCollapseDebug] frame ${9 - state.collapseDebugFramesLeft}`);
    console.log("elapsed", Number(elapsed.toFixed(2)));
    console.log("warningLevel", state.warningLevel);
    console.log("leanScore", Number(getLeanScore().toFixed(3)));
    console.log("visualLean", Number(getVisualLean().toFixed(3)));
    console.table(summary);
    console.groupEnd();

    state.collapseDebugFramesLeft -= 1;
  }

  function startLoop() { stopLoop(); state.lastTs = 0; state.rafId = requestAnimationFrame(frame); }
  function stopLoop() { if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = 0; } }

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
    if (state.done) return;

    if (state.introActive) {
      stepIntro(dt, now);
      return;
    }

    if (state.frenzyActive) return;

    if (state.collapseTriggered) {
      stepCollapse(dt);
      if (now >= state.collapseEndsAt) resetAfterCollapse();
      return;
    }

    stepStream(dt);
    stepEntering(dt);
    updateWarnings();
  }

  function stepStream(dt) {
    const distance = state.beltSpeed * (dt / 1000);
    for (const brick of state.stream) {
      brick.left -= distance;
      brick.center = brick.left + brick.width / 2;
      if (brick.flashWrongUntil && performance.now() >= brick.flashWrongUntil) {
        brick.flashWrong = false;
        brick.flashWrongUntil = 0;
      }
    }

    const leftCull = -state.brickWidth - 40;
    state.stream = state.stream.filter((brick) => brick.left > leftCull);
    state.pendingCorrectVisible = state.stream.filter((brick) => brick.isCorrect).length;

    if (performance.now() >= state.beltRespawnLockUntil) {
      ensureStreamFilled();
    }
  }

  function stepEntering(dt) {
    if (!state.enteringBrick) return;
    const e = state.enteringBrick;
    e.progress = clamp(e.progress + dt / 320, 0, 1);
    const eased = easeOutBack(e.progress);
    e.left = lerp(e.fromLeft, e.toLeft, eased);
    e.bottom = lerp(e.fromBottom, e.toBottom, eased);
    e.width = lerp(e.fromWidth, e.toWidth, eased);
    e.height = lerp(e.fromHeight, e.toHeight, eased);
    e.fontSize = lerp(e.fromFontSize, e.toFontSize, eased);
    e.rot = lerp(0, e.toRot, eased);

    if (e.progress >= 1) {
      state.pendingPreCollapsePose = state.lastStableTowerPose
        ? state.lastStableTowerPose.map((p) => ({ offsetX: p.offsetX, rot: p.rot }))
        : [];

      const prevWarningLevel = state.warningLevel;
      const prevLeanScore = getLeanScore();

      state.progress.unshift({
        label: e.label,
        kind: e.kind,
        zone: e.zone,
        textureClass: e.textureClass || getRandomBrickTextureClass()
      });
      playGameSound("brickLand");
      state.enteringBrick = null;

      state.towerSettleUntil = performance.now() + 220;

      advancePhaseAfterPlacement();

      if (state.frenzyActive || state.done) {
        state.warningLevel = 0;
        state.warningOverlayLevel = 0;
        state.warningOverlayStartedAt = 0;
        state.warningOverlayUntil = 0;
        state.hadWarning2BeforePlacement = false;
        return;
      }

      state.hadWarning2BeforePlacement = prevWarningLevel >= 2;
      updateWarnings(prevLeanScore, e.zone);

      if (!state.done) {
        state.pendingCorrectVisible = state.stream.filter((brick) => brick.isCorrect).length;
        seedPendingCorrect();
        retargetExistingCorrectBricks();
        ensureStreamFilled();
      }
    }
  }

  function stepCollapse(dt) {
    // Visual collapse is driven directly from render time using
    // collapseStartedAt and collapseDir, so no per-frame mutation is needed here.
  }

  function resetAfterCollapse() {
    state.collapseTriggered = false;
    state.collapseStartedAt = 0;
    state.collapseDir = 1;
    state.collapseBasePose = null;
    state.lastStableTowerPose = null;
    state.pendingPreCollapsePose = null;
    state.collapseBurstFired = {};

    state.collapseDebugFramesLeft = 0;
    state.progress = [];
    state.phase = "words";
    state.wordIndex = 0;
    state.warningLevel = 0;
    state.warningOverlayLevel = 0;
    state.warningOverlayStartedAt = 0;
    state.warningOverlayUntil = 0;
    state.hadWarning2BeforePlacement = false;
    state.beltRespawnLockUntil = 0;
    state.beltNeedsFreshSpawn = false;
    state.enteringBrick = null;
    state.frenzyActive = false;
    state.frenzyInputLockedUntil = 0;
    state.frenzyBreakSeq = 0;
    state.frenzyDropDelays = {};
    state.frenzyDropMotion = {};
    state.pendingCorrectVisible = 0;
    resetCorrectStreak();
    seedPendingCorrect();
    state.stream = [];
    fillInitialStream();
    state.collapseEndsAt = 0;
  }

  function fillInitialStream() {
    state.stream = [];
    let left = -state.brickWidth * 0.35;
    while (left < state.fieldWidth + state.brickWidth + 40) {
      const brick = createStreamBrick(left);
      state.stream.push(brick);
      left += state.brickStep;
    }
    state.pendingCorrectVisible = state.stream.filter((brick) => brick.isCorrect).length;
  }

  function ensureStreamFilled() {
    let rightMostLeft = state.stream.reduce((m, b) => Math.max(m, b.left), -Infinity);

    if (state.beltNeedsFreshSpawn || !Number.isFinite(rightMostLeft)) {
      let left = state.fieldWidth + state.brickWidth * 0.35;
      while (left < state.fieldWidth + state.brickWidth + state.brickStep * 3) {
        const brick = createStreamBrick(left);
        state.stream.push(brick);
        left += state.brickStep;
      }
      state.beltNeedsFreshSpawn = false;
      state.pendingCorrectVisible = state.stream.filter((brick) => brick.isCorrect).length;
      return;
    }

    while (rightMostLeft < state.fieldWidth + state.brickStep) {
      const left = rightMostLeft + state.brickStep;
      const brick = createStreamBrick(left);
      state.stream.push(brick);
      rightMostLeft = left;
    }
    state.pendingCorrectVisible = state.stream.filter((brick) => brick.isCorrect).length;
  }

  function createStreamBrick(left) {
    const correctKind = getPendingCorrectKind();
    const correctLabel = getPendingCorrectLabel();
    let isCorrect = false;
    let label = "";
    let kind = "word";

    if (shouldSpawnCorrect(left)) {
      isCorrect = true;
      label = correctLabel;
      kind = correctKind;
      state.pendingCorrectVisible += 1;
    } else {
      const decoy = makeDecoy(correctKind, correctLabel);
      label = decoy.label;
      kind = decoy.kind;
    }

    const fontSize = getConveyorFontSize(label, kind);
    const brick = {
      id: ++state.streamId,
      left,
      width: state.brickWidth,
      label,
      isCorrect,
      kind,
      fontSize,
      flashWrong: false,
      flashWrongUntil: 0,
      spawnIndex: state.spawnIndex++
    };
    brick.center = brick.left + brick.width / 2;
    return brick;
  }

  function shouldSpawnCorrect(left) {
    if (state.pendingCorrectVisible >= 2) return false;
    if (!getPendingCorrectLabel()) return false;

    const recentCorrects = state.stream.filter((brick) => brick.isCorrect).sort((a, b) => b.left - a.left);
    if (recentCorrects.length) {
      const nearest = recentCorrects[0];
      if (left - nearest.left < state.brickStep * 2.2) return false;
    }

    if (state.pendingCorrectVisible === 0) return true;
    return Math.random() < 0.48;
  }

  function retargetExistingCorrectBricks() {
    const remaining = state.stream.filter((brick) => brick.isCorrect);
    for (const brick of remaining) {
      brick.label = getPendingCorrectLabel();
      brick.kind = getPendingCorrectKind();
      brick.fontSize = getConveyorFontSize(brick.label, brick.kind);
    }
  }

  function getConveyorFontSize(label, kind) {
    const len = String(label || "").length;
    if (kind === "reference") return clamp(state.brickWidth * 0.13 - Math.max(0, len - 8) * 0.22, 13, 23);
    if (kind === "book") return clamp(state.brickWidth * 0.13 - Math.max(0, len - 10) * 0.2, 13, 23);
    return clamp(state.brickWidth * 0.145 - Math.max(0, len - 8) * 0.22, 14, 24);
  }



  function isBrickTappable(brick) {
    return brick.left < state.fieldWidth && (brick.left + brick.width) > 0;
  }

  function handleBrickTap(id) {
    if (state.frenzyActive) {
      handleFrenzyTap();
      return;
    }

    if (state.paused || state.done || state.collapseTriggered || state.enteringBrick) return;

    const brick = state.stream.find((b) => b.id === id);
    if (!brick || !isBrickTappable(brick)) return;

    if (!brick.isCorrect) {
      playGameSound("wrongWord");
      resetCorrectStreak();
      brick.flashWrong = true;
      brick.flashWrongUntil = performance.now() + 260;
      state.towerShakeUntil = performance.now() + 300;
      state.guideFlashUntil = performance.now() + 300;
      clearStreamWithBurst();
      return;
    }

    playGameSound("correctWord");

    const zone = getTapZone(brick);
    const visual = 0;
    const timingOverlay = getTimingOverlayForZone(zone);
    showOverlay(timingOverlay.message, 850, timingOverlay.tone);
    registerCorrectStreak();
    state.stream = state.stream.filter((b) => b.id !== id);
    state.pendingCorrectVisible = state.stream.filter((b) => b.isCorrect).length;

    const startWidth = state.brickWidth;
    const startHeight = state.brickHeight;
    const startFontSize = brick.fontSize;

    const endWidth = state.towerWidth * 0.76;
    const endHeight = state.brickHeight * 0.9;
    const endFontSize = Math.max(14, state.brickHeight * 0.33);

    const startLeft = brick.left;
    const startBottom = state.fieldHeight - state.laneY - startHeight * 0.5;

    const endLeft = (state.fieldWidth * 0.5) - (endWidth * 0.5) + visual;
    const endBottom = towerBaseBottom();

    state.enteringBrick = {
      id: ++state.enteringId,
      label: brick.label,
      kind: brick.kind,
      zone,
      textureClass: getRandomBrickTextureClass(),
      progress: 0,

      fromLeft: startLeft,
      toLeft: endLeft,
      left: startLeft,

      fromBottom: startBottom,
      toBottom: endBottom,
      bottom: startBottom,

      fromWidth: startWidth,
      toWidth: endWidth,
      width: startWidth,

      fromHeight: startHeight,
      toHeight: endHeight,
      height: startHeight,

      fromFontSize: startFontSize,
      toFontSize: endFontSize,
      fontSize: startFontSize,

      fromXOffset: 0,
      toXOffset: 0,
      xOffset: 0,

      toRot: 0,
      rot: 0
    };

    seedPendingCorrect();
    retargetExistingCorrectBricks();
    ensureStreamFilled();
  }

  function getTapZone(brick) {
    const delta = brick.center - state.guideCenterX;
    const normalized = clamp(delta / state.brickWidth, -0.5, 0.5);

    const [far, slight, centerPct] = [ZONE_PERCENTAGES[selectedMode || "easy"][0], ZONE_PERCENTAGES[selectedMode || "easy"][1], ZONE_PERCENTAGES[selectedMode || "easy"][2]];
    const centerHalf = centerPct / 2;
    const slightHalf = centerHalf + slight;

    if (normalized <= -slightHalf) return -2;
    if (normalized < -centerHalf) return -1;
    if (normalized <= centerHalf) return 0;
    if (normalized < slightHalf) return 1;
    return 2;
  }

  function getTimingOverlayForZone(zone) {
    if (zone <= -2) {
      return { message: "TOO\nLATE!", tone: "late" };
    }

    if (zone === -1) {
      return { message: "A LITTLE\nLATE!", tone: "late" };
    }

    if (zone === 0) {
      return { message: "PERFECT!", tone: "perfect" };
    }

    if (zone === 1) {
      return { message: "A LITTLE\nEARLY!", tone: "early" };
    }

    return { message: "TOO\nEARLY!", tone: "early" };
  }

  function seedPendingCorrect() {
    state.pendingCorrectType = getCurrentCorrectKind();
    state.pendingCorrectLabel = getCurrentCorrectLabel();
  }
  function getPendingCorrectKind() { return state.pendingCorrectType || getCurrentCorrectKind(); }
  function getPendingCorrectLabel() { return state.pendingCorrectLabel || getCurrentCorrectLabel(); }

  function getCurrentCorrectKind() {
    if (state.phase === "words") return "word";
    if (state.phase === "book") return "book";
    if (state.phase === "reference") return "reference";
    return "";
  }

  function getCurrentCorrectLabel() {
    if (state.phase === "words") return wordEntries[state.wordIndex]?.display || "";
    if (state.phase === "book") return verseMeta.book || "";
    if (state.phase === "reference") return verseMeta.reference || "";
    return "";
  }

  function makeDecoy(kind, correct) {
    if (kind === "book") {
      return {
        label: pickRandom(window.VerseGameShell.getBookDecoys(correct, 8)),
        kind: "book"
      };
    }

    if (kind === "reference") {
      return {
        label: pickRandom(
          makeReferenceChoices(verseMeta, selectedMode)
            .filter((ref) => normalizeWord(ref) !== normalizeWord(correct))
        ),
        kind: "reference"
      };
    }

    if (selectedMode === "medium" || selectedMode === "hard") return { label: pickRandom(getVerseDerivedDecoys(state.wordIndex, correct)), kind: "word" };
    return {
      label: pickRandom(
        window.VerseGameShell.getFunWordDecoys(
          correct,
          wordEntries.map((entry) => entry.display),
          8
        )
      ),
      kind: "word"
    };
  }

  function advancePhaseAfterPlacement() {
    const previousPhase = state.phase;

    if (previousPhase === "words") {
      state.wordIndex += 1;
      const nextPhase = updatePhaseFromProgress(state.wordIndex);

      if (nextPhase === "done") {
        startDestroyFrenzy();
      }

      return;
    }

    if (previousPhase === "book") {
      const nextPhase = updatePhaseFromProgress(
        wordEntries.length + (verseMeta.book ? 1 : 0)
      );

      if (nextPhase === "done") {
        startDestroyFrenzy();
      }

      return;
    }

    if (previousPhase === "reference") {
      const nextPhase = updatePhaseFromProgress(
        wordEntries.length + (verseMeta.book ? 1 : 0) + (verseMeta.reference ? 1 : 0)
      );

      if (nextPhase === "done") {
        startDestroyFrenzy();
      }
    }
  }

  function getLeanScore() {
    const count = state.progress.length;
    if (count <= 1) return 0;

    let sum = 0;
    for (let i = 0; i < count; i++) {
      const brick = state.progress[i];
      const weight = 1 + (i / Math.max(1, count - 1)) * 1.6;
      sum += (brick.zone || 0) * weight;
    }
    return sum;
  }

  function getVisualLean() {
    const raw = getLeanScore();
    const sign = Math.sign(raw);
    const mag = Math.abs(raw);
    const soft = 1 - Math.exp(-mag / 7.4);
    return sign * soft;
  }

  function getBrickWarningSway(now, index, count) {
    if (count < 3) {
      return { x: 0, rot: 0 };
    }

    const leanScore = getLeanScore();
    const leanMag = Math.abs(leanScore);
    const thresholds = THRESHOLDS[selectedMode || "easy"];
    const softStart = Math.max(2.5, thresholds.warn1 * 0.36);

    if (leanMag < softStart) {
      return { x: 0, rot: 0 };
    }

    const heightT = index / Math.max(1, count - 1);
    const topWeight = Math.pow(heightT, 1.45);
    const midWeight = Math.pow(heightT, 0.9);
    const leanDir = Math.sign(getVisualLean()) || 1;

    let levelStrength = 0.24;
    let speed = 235;
    let maxRotBase = 1.15;

    if (state.warningLevel >= 2) {
      levelStrength = 1;
      speed = 95;
      maxRotBase = 3.4;
    } else if (state.warningLevel === 1) {
      levelStrength = 0.58;
      speed = 165;
      maxRotBase = 1.7;
    } else {
      const softT = clamp((leanMag - softStart) / Math.max(1, thresholds.warn1 - softStart), 0, 1);
      levelStrength = lerp(0.16, 0.36, softT);
      speed = lerp(255, 205, softT);
      maxRotBase = lerp(0.7, 1.2, softT);
    }

    const wave = Math.sin(now / speed + heightT * 1.55);
    const counterWave = Math.sin(now / (speed * 1.37) + heightT * 2.35);

    const maxX = clamp(state.fieldWidth * 0.025, 8, 18) * levelStrength;
    const maxRot = maxRotBase * levelStrength;

    const x = (wave * maxX * topWeight) + (counterWave * maxX * 0.22 * midWeight);
    const rot = (wave * maxRot * topWeight) + (leanDir * counterWave * maxRot * 0.18 * midWeight);

    return { x, rot };
  }

  function updateWarnings(prevLeanScore = null, placedZone = null) {
    if (state.frenzyActive || state.done) {
      state.warningLevel = 0;
      state.warningOverlayLevel = 0;
      state.warningOverlayStartedAt = 0;
      state.warningOverlayUntil = 0;
      return;
    }

    const previousWarningLevel = state.warningLevel;
    const leanScore = getLeanScore();
    const mag = Math.abs(leanScore);
    const t = THRESHOLDS[selectedMode || "easy"];
    let level = 0;

    if (mag >= t.warn2) level = 2;
    else if (mag >= t.warn1) level = 1;

    state.warningLevel = level;

    if (level > 0 && level !== previousWarningLevel) {
      const isWarningDowngradeImprovement =
        previousWarningLevel >= 2 &&
        level === 1;

      if (!isWarningDowngradeImprovement) {
        playGameSound(level >= 2 ? "dangerWarning" : "warning");
      }

      showWarningOverlay(level);
    } else if (level === 0) {
      state.warningOverlayLevel = 0;
      state.warningOverlayStartedAt = 0;
      state.warningOverlayUntil = 0;
    }

    const prevMag = Number.isFinite(prevLeanScore) ? Math.abs(prevLeanScore) : mag;
    const madeLeanWorseBy = mag - prevMag;
    const placedZoneValue = Number(placedZone) || 0;
    const previousLeanDirection = Number.isFinite(prevLeanScore)
      ? Math.sign(prevLeanScore)
      : Math.sign(leanScore);
    const placedBrickWorsenedExistingLean =
      previousLeanDirection !== 0 &&
      placedZoneValue !== 0 &&
      Math.sign(placedZoneValue) === previousLeanDirection;

    if (
      selectedMode !== "easy" &&
      mag >= t.collapse &&
      state.hadWarning2BeforePlacement &&
      madeLeanWorseBy >= 1 &&
      placedBrickWorsenedExistingLean &&
      !state.collapseTriggered
    ) {
      triggerCollapse();
    }
  }

  function triggerCollapse() {
    const lean = getVisualLean();
    const count = state.progress.length;

    playGameSound("collapse");

    state.collapseTriggered = true;
    state.collapseStartedAt = performance.now();
    state.collapseDir = lean < 0 ? -1 : 1;
    state.collapseBurstFired = {};

    const previousPose = state.pendingPreCollapsePose || state.lastStableTowerPose || [];

    state.collapseBasePose = state.progress.map((brick, i) => {
      if (i === 0) {
        return { offsetX: 0, rot: 0 };
      }
      return previousPose[i - 1] || { offsetX: 0, rot: 0 };
    });

    const collapseTensionMs = 180;
    const collapseStepMs = 250;
    const collapseTipMs = 240;
    const collapseDropMs = 900;
    const collapseBufferMs = 220;

    state.collapseEndsAt =
      state.collapseStartedAt +
      collapseTensionMs +
      Math.max(0, count - 1) * collapseStepMs +
      collapseTipMs +
      collapseDropMs +
      collapseBufferMs;

    state.towerShakeUntil = 0;

    if (DEBUG_COLLAPSE) {
      const fmtPoseRows = (arr) => (arr || []).map((p, i) => ({
        i,
        x: Number((p?.offsetX || 0).toFixed(2)),
        r: Number((p?.rot || 0).toFixed(2))
      }));

      const fmtDeltaRows = (a, b) => {
        const out = [];
        const n = Math.max(a?.length || 0, b?.length || 0);
        for (let i = 0; i < n; i++) {
          const ax = Number(a?.[i]?.offsetX || 0);
          const bx = Number(b?.[i]?.offsetX || 0);
          const ar = Number(a?.[i]?.rot || 0);
          const br = Number(b?.[i]?.rot || 0);
          out.push({
            i,
            dx: Number((bx - ax).toFixed(2)),
            dr: Number((br - ar).toFixed(2))
          });
        }
        return out;
      };

      state.collapseDebugFramesLeft = 8;

      console.group("[TowerCollapseDebug] trigger");
      console.log("warningLevel", state.warningLevel);
      console.log("leanScore", Number(getLeanScore().toFixed(3)));
      console.log("visualLean", Number(getVisualLean().toFixed(3)));
      console.table(state.progress.map((b, i) => ({
        i,
        label: b.label,
        zone: b.zone,
        kind: b.kind
      })));
      console.log("lastStable raw", state.lastStableTowerPose);
      console.log("pendingPre raw", state.pendingPreCollapsePose);
      console.log("collapseBase raw", state.collapseBasePose);
      console.table(fmtPoseRows(state.lastStableTowerPose));
      console.table(fmtPoseRows(state.pendingPreCollapsePose));
      console.table(fmtPoseRows(state.collapseBasePose));
      console.table(fmtDeltaRows(state.pendingPreCollapsePose, state.collapseBasePose));
      console.groupEnd();
    }

    state.pendingPreCollapsePose = null;
  }

  function getTowerBrickRenderInfo(index, count = state.progress.length) {
    const safeIndex = clamp(index, 0, Math.max(0, count - 1));
    const lean = getVisualLean();
    const maxLeanPx = Math.min(state.fieldWidth * 0.065, 46);

    let cumulativeBottom = 0;

    for (let i = 0; i < safeIndex; i++) {
      const level = i;
      const scale = Math.max(0.26, Math.pow(0.95, level));
      const height = Math.max(34, state.brickHeight * 0.9 * scale);
      cumulativeBottom += height - 1;
    }

    const level = safeIndex;
    const t = count <= 1 ? 0 : level / Math.max(1, count - 1);
    const curve = Math.pow(t, 1.55);
    const scale = Math.max(0.26, Math.pow(0.95, level));
    const height = Math.max(34, state.brickHeight * 0.9 * scale);
    const baseOffsetX = count <= 1 ? 0 : lean * maxLeanPx * curve;
    const sway = getBrickWarningSway(performance.now(), safeIndex, count);

    return {
      x: state.fieldWidth * 0.5 + baseOffsetX + sway.x,
      y: state.fieldHeight - (towerBaseBottom() + cumulativeBottom + height * 0.5),
      scale,
      height,
      bottom: cumulativeBottom
    };
  }

  function addSmoke(x, y) {
    state.fx.push({ x, y, until: performance.now() + 420, scale: 1, kind: "smoke" });
  }

  function addChunkBurst(x, y, scale = 1) {
    const now = performance.now();
    const count = BRICK_BREAK_TUNING.particleCount;
    const minSize = state.brickHeight * BRICK_BREAK_TUNING.minSizePctOfBrickHeight;
    const maxSize = state.brickHeight * BRICK_BREAK_TUNING.maxSizePctOfBrickHeight;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
      const speed = 22 + Math.random() * 38;
      const size = (minSize + Math.random() * (maxSize - minSize)) * scale;
      const color = BRICK_BREAK_TUNING.colors[Math.floor(Math.random() * BRICK_BREAK_TUNING.colors.length)];

      state.fx.push({
        kind: "chunk",
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 8,
        size,
        color,
        rot: (Math.random() * 80) - 40,
        until: now + 380 + Math.random() * 130
      });
    }
  }

  function clearStreamWithBurst() {
    for (const brick of state.stream) {
      addChunkBurst(brick.center, state.laneY, 1);
    }
    state.stream = [];
    state.pendingCorrectVisible = 0;
    state.beltNeedsFreshSpawn = true;
    state.beltRespawnLockUntil = performance.now() + 520;
  }

  function startIntroSequence() {
    const now = performance.now();

    state.introActive = true;
    state.introStepIndex = 0;
    state.introNextAt = now + 250;
    state.introBreaking = false;
    state.introBreakNextAt = 0;
    state.introGuideVisible = false;
    state.introGuidePoppedAt = 0;

    state.progress = [];
    state.stream = [];
    state.fx = [];
    state.enteringBrick = null;
    state.pendingCorrectVisible = 0;
    state.warningLevel = 0;
    state.warningOverlayLevel = 0;
    state.warningOverlayStartedAt = 0;
    state.warningOverlayUntil = 0;
    resetCorrectStreak();
  }

  function stepIntro(dt, now) {
    if (state.enteringBrick) {
      stepIntroEntering(dt);
      return;
    }

    if (state.introBreaking) {
      stepIntroBreaking(now);
      return;
    }

    if (now < state.introNextAt) return;

    const step = INTRO_SEQUENCE[state.introStepIndex];

    if (!step) {
      finishIntroSequence();
      return;
    }

    state.introStepIndex += 1;

    if (step.type === "brick") {
      startIntroBrick(step.label, step.textureClass);
      state.introNextAt = now + 560;
      return;
    }

    if (step.type === "pause") {
      state.introNextAt = now + step.ms;
      return;
    }

    if (step.type === "guide") {
      state.introGuideVisible = true;
      state.introGuidePoppedAt = now;
      state.towerSettleUntil = now + 320;
      state.introNextAt = now + step.ms;
      return;
    }

    if (step.type === "break") {
      state.introBreaking = true;
      state.introBreakNextAt = now + step.ms;
      return;
    }

    state.introNextAt = now + 250;
  }

  function startIntroBrick(label, textureClass = "tb-intro-green") {
    const now = performance.now();
    const width = state.towerWidth * 0.76;
    const height = state.brickHeight * 0.9;
    const fontSize = Math.max(14, state.brickHeight * 0.33);
    const fromWidth = state.brickWidth;
    const fromHeight = state.brickHeight;
    const fromFontSize = clamp(state.brickHeight * 0.34, 18, 28);

    state.enteringBrick = {
      id: ++state.enteringId,
      label,
      kind: "word",
      zone: 0,
      textureClass,
      isIntro: true,
      progress: 0,

      fromLeft: (state.fieldWidth * 0.5) - (fromWidth * 0.5),
      toLeft: (state.fieldWidth * 0.5) - (width * 0.5),
      left: (state.fieldWidth * 0.5) - (fromWidth * 0.5),

      fromBottom: laneBottomOffset() + state.laneHeight * 0.35,
      toBottom: towerBaseBottom(),
      bottom: laneBottomOffset() + state.laneHeight * 0.35,

      fromWidth,
      toWidth: width,
      width: fromWidth,

      fromHeight,
      toHeight: height,
      height: fromHeight,

      fromFontSize,
      toFontSize: fontSize,
      fontSize: fromFontSize,

      fromXOffset: 0,
      toXOffset: 0,
      xOffset: 0,

      toRot: 0,
      rot: 0
    };

    state.towerSettleUntil = now + 220;
  }

  function stepIntroEntering(dt) {
    const e = state.enteringBrick;
    if (!e) return;

    e.progress = clamp(e.progress + dt / 520, 0, 1);
    const eased = easeOutBack(e.progress);
    e.left = lerp(e.fromLeft, e.toLeft, eased);
    e.bottom = lerp(e.fromBottom, e.toBottom, eased);
    e.width = lerp(e.fromWidth, e.toWidth, eased);
    e.height = lerp(e.fromHeight, e.toHeight, eased);
    e.fontSize = lerp(e.fromFontSize, e.toFontSize, eased);
    e.rot = lerp(0, e.toRot, eased);

    if (e.progress >= 1) {
      state.progress.unshift({
        label: e.label,
        kind: "word",
        zone: 0,
        isIntro: true,
        textureClass: e.textureClass || getRandomBrickTextureClass()
      });
      playGameSound("brickLand");
      state.enteringBrick = null;
      state.towerSettleUntil = performance.now() + 220;
    }
  }

  function stepIntroBreaking(now) {
    if (now < state.introBreakNextAt) return;

    if (!state.progress.length) {
      finishIntroSequence();
      return;
    }

    const topIndex = state.progress.length - 1;
    const breakInfo = getTowerBrickRenderInfo(topIndex, state.progress.length);

    playGameSound("brickBreak");
    addChunkBurst(breakInfo.x, breakInfo.y, Math.max(0.9, breakInfo.scale * 0.95));
    state.progress.pop();
    state.towerSettleUntil = now + 180;
    state.introBreakNextAt = now + 170;
  }

  function finishIntroSequence() {
    state.introActive = false;
    state.introStepIndex = 0;
    state.introNextAt = 0;
    state.introBreaking = false;
    state.introBreakNextAt = 0;
    state.introGuideVisible = true;
    state.introGuidePoppedAt = 0;

    state.progress = [];
    state.stream = [];
    state.fx = [];
    state.enteringBrick = null;
    state.warningLevel = 0;
    state.warningOverlayLevel = 0;
    state.warningOverlayStartedAt = 0;
    state.warningOverlayUntil = 0;
    state.hadWarning2BeforePlacement = false;
    state.beltRespawnLockUntil = 0;
    state.beltNeedsFreshSpawn = false;

    updatePhaseFromProgress(0);
    seedPendingCorrect();
    fillInitialStream();

    state.lastTs = performance.now();
    renderHud();
  }

  function startDestroyFrenzy() {
    const now = performance.now();

    state.frenzyActive = true;
    state.frenzyInputLockedUntil = now + 250;
    state.frenzyBreakSeq = 0;
    state.frenzyDropDelays = {};
    state.frenzyDropMotion = {};

    state.overlayMessage = "BREAK\nTHE BRICKS!";
    state.overlayTone = "";
    state.overlayStartedAt = now;
    state.overlayUntil = now + 999999;

    state.stream = [];
    state.pendingCorrectVisible = 0;
    state.enteringBrick = null;
    state.warningLevel = 0;
    state.warningOverlayLevel = 0;
    state.warningOverlayStartedAt = 0;
    state.warningOverlayUntil = 0;
  }

  function handleFrenzyTap(index = null) {
    const now = performance.now();
    if (!state.frenzyActive) return;
    if (now < state.frenzyInputLockedUntil) return;
    if (!state.progress.length) return;

    const oldCount = state.progress.length;
    const breakIndex = Number.isFinite(index)
      ? clamp(Math.round(index), 0, oldCount - 1)
      : oldCount - 1;

    if (state.overlayMessage) {
      state.overlayMessage = "";
      state.overlayTone = "";
      state.overlayStartedAt = 0;
      state.overlayUntil = 0;
    }

    const breakInfo = getTowerBrickRenderInfo(breakIndex, oldCount);
    const oldInfos = state.progress.map((brick, i) => getTowerBrickRenderInfo(i, oldCount));

    playGameSound("brickBreak");
    addChunkBurst(breakInfo.x, breakInfo.y, Math.max(0.95, breakInfo.scale));

    state.progress.splice(breakIndex, 1);
    state.frenzyBreakSeq += 1;
    state.frenzyDropDelays = {};
    state.frenzyDropMotion = {};

    const newCount = state.progress.length;

    for (let i = breakIndex; i < newCount; i++) {
      const oldInfo = oldInfos[i + 1];
      const newInfo = getTowerBrickRenderInfo(i, newCount);
      const delay = Math.min((i - breakIndex) * 48, 280);

      state.frenzyDropDelays[i] = delay;
      state.frenzyDropMotion[i] = {
        startedAt: now,
        delay,
        duration: 360,
        fromBottomOffset: oldInfo ? oldInfo.bottom - newInfo.bottom : 0
      };
    }

    const longestDelay = newCount > breakIndex
      ? Math.min((newCount - 1 - breakIndex) * 48, 280)
      : 0;

    state.towerSettleUntil = now + longestDelay + 360;
    state.frenzyInputLockedUntil = now + longestDelay + 430;

    if (!state.progress.length) {
      state.frenzyActive = false;
      state.frenzyDropDelays = {};
      state.frenzyDropMotion = {};
      state.overlayMessage = "";
      state.overlayTone = "";
      state.overlayStartedAt = 0;
      state.overlayUntil = 0;
      state.frenzyInputLockedUntil = performance.now() + 350;

      window.setTimeout(() => {
        if (!state.done) {
          finishGame();
        }
      }, 350);
    }
  }

  async function finishGame() {
    state.running = false;
    state.done = true;
    state.frenzyActive = false;
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
            towerBlocks: state.progress.length,
            wordIndex: state.wordIndex,
            warningLevel: state.warningLevel,
            collapsed: state.collapseTriggered
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

  function registerCorrectStreak() {
    state.correctStreak += 1;

    const streak = state.correctStreak;
    if (!STREAK_CELEBRATION_TUNING.milestones.includes(streak)) return;
    if (state.streakMilestonesShown[streak]) return;

    state.streakMilestonesShown[streak] = true;
    triggerStreakCelebration(streak);
  }

  function resetCorrectStreak() {
    state.correctStreak = 0;
    state.streakMilestonesShown = {};
  }

  function triggerStreakCelebration(streak) {
    const layer = document.getElementById("tbCelebrationLayer");
    if (!layer) return;

    const config = STREAK_CELEBRATION_TUNING.byStreak[streak];
    if (!config) return;

    playGameSound("streak");

    const brick = Math.max(36, state.brickHeight || 58);
    const duration = config.duration;
    const group = document.createElement("div");
    group.className = `tb-streak-celebration is-streak-${streak}`;
    group.style.setProperty("--tb-streak-duration", `${duration}ms`);
    group.style.setProperty("--tb-brick-height", `${brick}px`);

    group.innerHTML = `
      <div class="tb-streak-text" style="font-size:${clamp(brick * 0.58, 30, 58).toFixed(1)}px;">
        ${streak} IN A ROW!
      </div>
      <div class="tb-confetti-shower">
        ${renderStreakConfetti(streak, config, brick)}
      </div>
      ${renderStreakFireworks(streak, config, brick)}
    `;

    layer.appendChild(group);

    window.setTimeout(() => {
      group.remove();
    }, duration + 900);
  }

  function renderStreakConfetti(streak, config, brick) {
    const pieces = [];
    const count = config.particleCount;
    const duration = config.duration;

    for (let i = 0; i < count; i++) {
      const piece = makeStreakConfettiPiece(streak, config, brick, i);
      pieces.push(`
        <span
          class="tb-confetti-piece ${piece.shapeClass}"
          style="
            --tb-confetti-x:${piece.x.toFixed(2)}%;
            --tb-confetti-y:${piece.y.toFixed(1)}px;
            --tb-confetti-size:${piece.size.toFixed(1)}px;
            --tb-confetti-fall:${piece.fall.toFixed(1)}px;
            --tb-confetti-drift:${piece.drift.toFixed(1)}px;
            --tb-confetti-spin:${piece.spin.toFixed(1)}deg;
            --tb-confetti-color:${piece.color};
            --tb-confetti-duration:${duration + piece.durationExtra}ms;
            --tb-confetti-delay:${piece.delay.toFixed(0)}ms;
          "
        ></span>
      `);
    }

    return pieces.join("");
  }

  function makeStreakConfettiPiece(streak, config, brick, index) {
    const rainbow = STREAK_CELEBRATION_TUNING.colors.rainbow;
    const yellowStar = STREAK_CELEBRATION_TUNING.colors.yellowStar;
    const white = STREAK_CELEBRATION_TUNING.colors.white;

    let shapeClass = "is-confetti";
    let color = pickRandom(rainbow);

    if (config.shapeMode === "yellowStarsWhiteConfetti") {
      const isStar = Math.random() < 0.42;
      shapeClass = isStar ? "is-star" : "is-confetti";
      color = isStar ? pickRandom(yellowStar) : pickRandom(white);
    } else if (config.shapeMode === "rainbowStarsConfetti") {
      const isStar = Math.random() < 0.38;
      shapeClass = isStar ? "is-star" : "is-confetti";
      color = pickRandom(rainbow);
    }

    const sizeBase = shapeClass === "is-star"
      ? randomBetween(brick * 0.24, brick * 0.42)
      : randomBetween(brick * 0.13, brick * 0.27);

    return {
      x: randomBetween(0, 100),
      y: randomBetween(-brick * 1.7, -brick * 0.25),
      size: sizeBase,
      fall: state.fieldHeight + randomBetween(brick * 1.4, brick * 4.2),
      drift: randomBetween(-brick * 1.4, brick * 1.4),
      spin: randomBetween(220, 900) * (Math.random() < 0.5 ? -1 : 1),
      delay: randomBetween(0, Math.max(90, config.duration * 0.34)),
      durationExtra: Math.round(randomBetween(0, config.duration * 0.26)),
      color,
      shapeClass
    };
  }

  function renderStreakFireworks(streak, config, brick) {
    if (!config.fireworkPairs) return "";

    const colors = streak >= 20
      ? STREAK_CELEBRATION_TUNING.colors.rainbow
      : streak >= 15
        ? ["#ffc751", "#ffe27a", "#ffffff"]
        : STREAK_CELEBRATION_TUNING.colors.rainbow;

    const centerX = state.fieldWidth * 0.5;
    const textY = clamp(state.fieldHeight * 0.18, brick * 1.25, brick * 2.6);
    const sideOffset = clamp(state.fieldWidth * 0.25, brick * 2.0, brick * 4.6);
    const size = brick * (streak >= 20 ? 1.65 : streak >= 15 ? 1.45 : 1.22);

    const fireworks = [
      renderStreakFireworkDom(centerX - sideOffset, textY, size, colors, 0),
      renderStreakFireworkDom(centerX + sideOffset, textY, size, colors, 70)
    ];

    if (config.fireworkPairs >= 2) {
      const lowerY = textY + brick * 1.15;
      const wideOffset = clamp(state.fieldWidth * 0.34, brick * 2.8, brick * 6.1);
      fireworks.push(renderStreakFireworkDom(centerX - wideOffset, lowerY, size * 0.82, colors, 210));
      fireworks.push(renderStreakFireworkDom(centerX + wideOffset, lowerY, size * 0.82, colors, 270));
    }

    return fireworks.join("");
  }

  function renderStreakFireworkDom(x, y, size, colors, delayBase = 0) {
    const duration = 520;
    const rayThickness = Math.max(3, size * 0.085);
    const mainRays = makeStreakFireworkRays(12, colors, size, rayThickness, true);
    const shortRays = makeStreakFireworkRays(6, colors, size, rayThickness, false);
    const sparkles = makeStreakFireworkSparkles(8, colors, size, rayThickness);

    const raysHtml = mainRays.map((ray) => renderStreakFireworkRay(ray, duration, delayBase, true)).join("")
      + shortRays.map((ray) => renderStreakFireworkRay(ray, duration, delayBase, false)).join("");

    const sparklesHtml = sparkles.map((sparkle) => renderStreakFireworkSparkle(sparkle, duration, delayBase)).join("");
    const centerSize = rayThickness * 2.4;

    return `
      <div class="tb-streak-firework" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;">
        <span
          class="tb-streak-firework-center"
          style="
            width:${centerSize.toFixed(1)}px;
            height:${centerSize.toFixed(1)}px;
            margin-left:${(-centerSize / 2).toFixed(1)}px;
            margin-top:${(-centerSize / 2).toFixed(1)}px;
            --tb-fw-color:${colors[0] || "#ffffff"};
            --tb-fw-duration:${duration}ms;
            --tb-fw-delay:${delayBase}ms;
          "
        ></span>
        ${raysHtml}
        ${sparklesHtml}
      </div>
    `;
  }

  function makeStreakFireworkRays(count, colors, baseSize, rayThickness, long) {
    const angleOffset = Math.random() * 360;
    const rays = [];

    for (let i = 0; i < count; i++) {
      const spread = 360 / Math.max(1, count);
      const angle = angleOffset + spread * i + randomBetween(-4, 4);
      const length = long
        ? baseSize * randomBetween(0.72, 1.04)
        : baseSize * randomBetween(0.34, 0.58);
      const start = baseSize * (long ? randomBetween(0.06, 0.16) : randomBetween(0.03, 0.13));
      const thickness = rayThickness * (long ? randomBetween(0.72, 1.12) : randomBetween(0.46, 0.8));
      const delay = long ? randomBetween(0, 35) : randomBetween(20, 90);

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

  function makeStreakFireworkSparkles(count, colors, baseSize, rayThickness) {
    const sparkles = [];

    for (let i = 0; i < count; i++) {
      sparkles.push({
        angle: Math.random() * 360,
        distance: baseSize * randomBetween(0.45, 1.28),
        size: rayThickness * randomBetween(0.72, 1.55),
        color: Math.random() < 0.22 ? "#ffffff" : pickRandom(colors),
        delay: randomBetween(40, 130),
        isSpark: Math.random() < 0.45
      });
    }

    return sparkles;
  }

  function renderStreakFireworkRay(ray, duration, delayBase, isMain) {
    return `
      <span
        class="tb-streak-firework-ray ${isMain ? "is-main" : "is-short"}"
        style="
          --tb-fw-angle:${ray.angle.toFixed(1)}deg;
          --tb-fw-length:${ray.length.toFixed(1)}px;
          --tb-fw-start:${ray.start.toFixed(1)}px;
          --tb-fw-thickness:${ray.thickness.toFixed(1)}px;
          --tb-fw-color:${ray.color};
          --tb-fw-duration:${duration}ms;
          --tb-fw-delay:${(delayBase + ray.delay).toFixed(0)}ms;
          filter:drop-shadow(0 0 ${(ray.thickness * 1.4).toFixed(1)}px ${ray.color});
        "
      ></span>
    `;
  }

  function renderStreakFireworkSparkle(sparkle, duration, delayBase) {
    const cls = sparkle.isSpark ? "tb-streak-firework-spark" : "tb-streak-firework-dot";

    return `
      <span
        class="${cls}"
        style="
          --tb-fw-angle:${sparkle.angle.toFixed(1)}deg;
          --tb-fw-distance:${sparkle.distance.toFixed(1)}px;
          --tb-fw-dot-size:${sparkle.size.toFixed(1)}px;
          --tb-fw-color:${sparkle.color};
          --tb-fw-duration:${duration}ms;
          --tb-fw-delay:${(delayBase + sparkle.delay).toFixed(0)}ms;
          filter:drop-shadow(0 0 ${(sparkle.size * 1.6).toFixed(1)}px ${sparkle.color});
        "
      ></span>
    `;
  }

  function showOverlay(message, duration = 1400, tone = "") {
    const now = performance.now();
    state.overlayMessage = message;
    state.overlayTone = tone;
    state.overlayStartedAt = now;
    state.overlayUntil = now + duration;
  }

  function showWarningOverlay(level) {
    const now = performance.now();
    state.warningOverlayLevel = level;
    state.warningOverlayStartedAt = now;
    state.warningOverlayUntil = now + (level >= 2 ? 2300 : 2100);
  }

  function getVerseDerivedDecoys(targetIndex, correct) {
    return window.VerseGameShell.getVerseWordDecoys({
      words: wordEntries.map((entry) => entry.display),
      correct,
      targetIndex,
      count: 12,
      avoidNext: 2,
      fallbackToFun: true
    });
  }

  function makeReferenceChoices(referenceMeta, mode) {
    return window.VerseGameShell.getReferenceDecoys(referenceMeta, mode, 10);
  }

  function parseVerseMeta(verseId, fallbackRef) {
    return window.VerseGameShell.parseReferenceParts(
      fallbackRef,
      ctx.translation,
      verseId
    );
  }

  function tokenizeVerse(text) {
    return window.VerseGameShell.tokenizeVerseForBuild(text);
  }

  function extractWordEntries(tokens) {
    return window.VerseGameShell.extractWordEntries(tokens);
  }

  function laneBottomOffset() { return clamp(state.fieldWidth * 0.055, 24, 42); }
  function towerBaseBottom() { return laneBottomOffset() + state.laneHeight - 1; }

  function getTowerShellRotation(now) {
    return 0;
  }

  function showBottomWarningOverlay(now) {
    if (state.warningLevel <= 0 || state.collapseTriggered) return false;
    const cycleMs = state.warningLevel >= 2 ? 1600 : 3000;
    const onMs = state.warningLevel >= 2 ? 800 : 1500;
    return (now % cycleMs) < onMs;
  }

  function getTopBrickWarningWobble(now) {
    if (state.collapseTriggered) return 0;
    if (state.warningLevel === 1) {
      return Math.sin(now / 180) * 1.35;
    }
    if (state.warningLevel >= 2) {
      return Math.sin(now / 120) * 2.4;
    }
    return 0;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function getRandomBrickTextureClass() {
    const variants = [
      "tb-texture-normal",
      "tb-texture-flip-x",
      "tb-texture-flip-y",
      "tb-texture-flip-both"
    ];

    return variants[Math.floor(Math.random() * variants.length)];
  }

  function getEnteringTowerLift() {
    const e = state.enteringBrick;

    if (!e) return 0;
    if (state.collapseTriggered || state.frenzyActive) return 0;
    if (!state.progress.length) return 0;

    const targetHeight = Number(e.toHeight || 0);
    if (!targetHeight) return 0;

    const p = clamp(Number(e.progress || 0), 0, 1);
    const eased = easeOutCubic(p);

    return Math.max(0, targetHeight - 1) * eased;
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  const clamp = window.VerseGameShell.clamp;
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  const shuffle = window.VerseGameShell.shuffle;
  const capitalize = window.VerseGameShell.capitalize;

  function normalizeWord(value) {
    return window.VerseGameShell.normalizeWord(value);
  }

  function formatOverlayMessage(str) {
    return escapeHtml(str).replace(/\n/g, "<br>");
  }

  function escapeHtml(str) { return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }

})();
