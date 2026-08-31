(async function(){
  const app = document.getElementById("app");
  if (app) app.classList.add("vm-shell");

  const ctx = await window.VerseGameBridge.getVerseContext();
  const GAME_ID = "scramble";
  const GAME_TITLE = "Verse Scramble";
  const GAME_ICON = "🔄";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);

  const GAME_THEME = {
    bg: "#7f66c6",
    accent: "#7f66c6",
    pageBg: "#000000"
  };

  const BUILD_AREA = "compact";
  const HELP_OVERLAY_ID = "vsnHelpOverlay";


  const SILENCE_AUDIO_FILE = "../../verse_audio/silence.mp3";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

  const UI_SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`
  };

  const SOUND_TUNING = {
    // Master volume for every generated sound.
    // Keep this at 1.00; use the individual event volumes below for tuning.
    masterVolume: 1.00,

    // Individual sound volume multipliers.
    // These are intentionally higher than 1 because Verse Scramble's generated
    // sound recipes use smaller base oscillator/noise gains than Verse Typer.
    volumes: {
      correctLetter: 0.85,  // Verse Typer-style melody tones
      wrongLetter: 3.60,    // Rubber Bump
      wordComplete: 3.40,   // Mini Fanfare
      lettersFall: 2.40,    // Fridge Slide
      messagePop: 3.60,     // Happy Upturn
      bonusStart: 3.20,     // Magnet Race
      bonusYouWin: 3.20,    // Happy Bells
      bonusIWin: 3.20,      // Soft Slide Down
      bonusFinal: 3.20,     // Little Crown
      uiTap: 0.45           // Shared UI pop sounds
    }
  };

  const MAGNET_COLORS = [
    "#fc171a",
    "#fc7e0e",
    "#feca02",
    "#74d025",
    "#007df4",
    "#8956d9"
  ];

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const DIGITS = "0123456789".split("");

  const PROFILE_PICTURE_LIST_URL =
    "../../verse_data/verse_list.json";

  const PROFILE_PICTURE_DIR =
    "../../profile_pictures/";

  const PROFILE_PICTURE_FALLBACK_SRC =
    `${PROFILE_PICTURE_DIR}profile_picture_fallback.png`;

  const PROFILE_MAGNET_COLORS = [
    "#ff5a51",
    "#ffa351",
    "#ffc751",
    "#a7cb6f",
    "#40b9c5",
    "#7f66c6"
  ];

  const PROFILE_FIREWORK_TUNING = {
    duration: 430,
    sizeScale: 1.24,
    mainRays: 12,
    shortRays: 6,
    sparkles: 8,
    rayThicknessScale: 0.11,
    rainbowChance: 0.5
  };

  let selectedMode = null;
  let muted = false;
  let easyHintTimer = null;
  let audioCtx = null;
  let masterGain = null;
  let silenceAudioEl = null;
  let audioUnlocked = false;
  let currentCorrectMelody = [];
  let uiSoundFlip = false;
  let profilePictureVerseIds = [];
  let profilePictureCatalogPromise = null;
  let lastProfileRewardVerseId = "";
  let queuedProfileReward = null;
  let queuedProfileRewardPromise = null;

  const uiSoundBuffers = new Map();
  const uiSoundBufferPromises = new Map();

  const shuffle = window.VerseGameShell.shuffle;

  const state = {
    screen: "intro",
    words: [],
    segments: [],
    targetGroups: [],
    targetGroupIndex: 0,
    metaIndices: new Set(),
    progressIndex: 0,
    buildSizeClass: "is-normal",
    bookLabel: "",
    referenceLabel: "",
    referenceMeta: null,
    currentTarget: null,
    tiles: [],
    letterIndex: 0,
    tileSeed: 0,
    busy: false,
    completed: false,
    menuOpen: false,
    helpOpen: false,
    helpBackMode: false,
    startTime: 0,
    completionResult: null,
    correctLetters: 0,
    wrongTaps: 0,
    targetsCompleted: 0,
    streak: 0,
    bestStreak: 0,
    profileRewardQueue: 0,
    activeProfileReward: null,
    showingInstruction: false,
    instructionToken: 0,
    bonusActive: false,
    bonusStage: "none",
    bonusRound: 0,
    bonusPlayerWins: 0,
    bonusPointerWins: 0,
    bonusTargetLetter: "",
    bonusTargetColor: "",
    bonusTargetShade: "",
    bonusRoundToken: 0,
    bonusDeadline: 0,
    bonusPointerRunning: false,
    bonusResultText: "",
    bonusResultKind: ""
  };

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


  function escapeHtml(str){
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitForMagnetFont() {
    if (!document.fonts || !document.fonts.ready) return;

    try {
      await document.fonts.load('1em "CaprasimoLocal"');
      await document.fonts.ready;
    } catch (err) {
      // Font loading should never block gameplay if the browser rejects this.
    }
  }

  function darkenHexColor(hex, percent = 30) {
    const clean = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#000000";

    const amount = Math.max(0, Math.min(100, percent)) / 100;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);

    const darken = value => Math.max(0, Math.round(value * (1 - amount)));
    const toHex = value => darken(value).toString(16).padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }


  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function loadProfilePictureCatalog() {
    if (profilePictureCatalogPromise) {
      return profilePictureCatalogPromise;
    }

    profilePictureCatalogPromise = fetch(
      PROFILE_PICTURE_LIST_URL,
      { cache: "no-store" }
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Unable to load profile pictures: ${response.status}`
          );
        }

        return response.json();
      })
      .then(list => {
        profilePictureVerseIds =
          Array.isArray(list)
            ? list
              .map(item =>
                String(item || "").trim()
              )
              .filter(Boolean)
            : [];

        return profilePictureVerseIds;
      })
      .catch(() => {
        profilePictureVerseIds = [];
        return profilePictureVerseIds;
      });

    return profilePictureCatalogPromise;
  }

  function chooseProfileRewardVerseId() {
    const fallbackVerseId =
      String(ctx.verseId || "").trim();

    const catalog =
      profilePictureVerseIds.length
        ? profilePictureVerseIds
        : fallbackVerseId
          ? [fallbackVerseId]
          : [];

    if (!catalog.length) return "";

    const nonRepeating =
      catalog.length > 1
        ? catalog.filter(
            verseId =>
              verseId !==
              lastProfileRewardVerseId
          )
        : catalog;

    const verseId =
      randomItem(
        nonRepeating.length
          ? nonRepeating
          : catalog
      ) ||
      fallbackVerseId;

    lastProfileRewardVerseId = verseId;

    return verseId;
  }

  function preloadProfileRewardImage(src) {
    return new Promise(resolve => {
      const img = new Image();

      const finishLoaded = async () => {
        try {
          if (
            typeof img.decode ===
            "function"
          ) {
            await img.decode();
          }
        } catch (err) {
          /*
            The load event already confirmed
            the image file is usable.
          */
        }

        resolve(img);
      };

      img.onload = finishLoaded;

      img.onerror = () => {
        resolve(null);
      };

      img.src = src;
    });
  }

  function makePreparedProfileReward(
    verseId,
    profileSrc,
    preloadedImage
  ) {
    const borderColor =
      randomItem(
        PROFILE_MAGNET_COLORS
      ) ||
      "#7f66c6";

    return {
      verseId,
      profileSrc,
      preloadedImage,
      profileShape:
        Math.random() < 0.5
          ? "circle"
          : "rounded",
      profileBorderColor:
        borderColor,
      color:
        borderColor,
      shade:
        darkenHexColor(
          borderColor,
          30
        ),
      rotation:
        Math.round(
          Math.random() * 34 - 17
        )
    };
  }

  async function preloadNextProfileReward() {
    if (queuedProfileReward) {
      return queuedProfileReward;
    }

    if (queuedProfileRewardPromise) {
      return queuedProfileRewardPromise;
    }

    queuedProfileRewardPromise =
      (async () => {
        await loadProfilePictureCatalog();

        const verseId =
          chooseProfileRewardVerseId();

        if (!verseId) {
          return null;
        }

        let profileSrc =
          `${PROFILE_PICTURE_DIR}profile_picture_${verseId}.png`;

        let preloadedImage =
          await preloadProfileRewardImage(
            profileSrc
          );

        if (!preloadedImage) {
          profileSrc =
            PROFILE_PICTURE_FALLBACK_SRC;

          preloadedImage =
            await preloadProfileRewardImage(
              profileSrc
            );
        }

        if (!preloadedImage) {
          return null;
        }

        queuedProfileReward =
          makePreparedProfileReward(
            verseId,
            profileSrc,
            preloadedImage
          );

        return queuedProfileReward;
      })();

    try {
      return await queuedProfileRewardPromise;
    } finally {
      queuedProfileRewardPromise = null;
    }
  }

  function makeProfileRewardMagnet(
    preparedReward
  ) {
    if (
      !preparedReward ||
      !preparedReward.profileSrc
    ) {
      return null;
    }

    return {
      id:
        `vsn_tile_${state.tileSeed++}`,
      char: "",
      source: "profile-reward",
      isProfileReward: true,
      ...preparedReward
    };
  }

  function ensureActiveProfileReward() {
    if (
      state.profileRewardQueue <= 0
    ) {
      return null;
    }

    if (state.activeProfileReward) {
      return state.activeProfileReward;
    }

    if (!queuedProfileReward) {
      /*
        Never create an unready reward.
        If loading is unusually slow,
        it can appear on a later set
        instead of visibly popping in.
      */
      void preloadNextProfileReward();
      return null;
    }

    const nextReward =
      makeProfileRewardMagnet(
        queuedProfileReward
      );

    if (!nextReward) {
      return null;
    }

    state.activeProfileReward =
      nextReward;

    queuedProfileReward = null;

    /*
      The current queued picture has
      just been promoted. Immediately
      begin preparing the next one.
    */
    void preloadNextProfileReward();

    return state.activeProfileReward;
  }


  function queueProfileRewardForCurrentStreak() {
    if (
      state.streak <= 0 ||

      /*
      Edit this next line to change streak threshold
    */
      state.streak % 20 !== 0
    ) {
      return;
    }

    state.profileRewardQueue += 1;
    ensureActiveProfileReward();
  }

  /*
    Start preparing the first possible
    streak reward while the player is
    still on the title/mode screens.
  */
  void preloadNextProfileReward();

  function bonusBaseTimeMs() {
    const roundIndex =
      Math.max(
        0,
        state.bonusRound - 1
      );

    if (selectedMode === "easy") {
      return 10000;
    }

    if (selectedMode === "medium") {
      return Math.max(
        4600,
        6000 - roundIndex * 350
      );
    }

    return Math.max(
      3100,
      4000 - roundIndex * 225
    );
  }

  const BONUS_POINTER_CHEAT_CHANCE = 0.5;

  const BONUS_POINTER_CHEAT_TIME_MULTIPLIER = {
    easy: 0.75,
    medium: 0.82,
    hard: 0.88
  };

  function bonusPointerCheatMultiplier() {
    const playerIsAhead =
      state.bonusPlayerWins >
      state.bonusPointerWins;

    if (
      !playerIsAhead ||
      Math.random() >=
        BONUS_POINTER_CHEAT_CHANCE
    ) {
      return 1;
    }

    return (
      BONUS_POINTER_CHEAT_TIME_MULTIPLIER[
        selectedMode
      ] || 1
    );
  }

  function bonusTimeWithWiggle() {
    const base =
      bonusBaseTimeMs();

    const wiggle =
      selectedMode === "easy"
        ? 600
        : selectedMode === "medium"
          ? 300
          : 200;

    const cheatMultiplier =
      bonusPointerCheatMultiplier();

    return Math.round(
      (
        base +
        randomBetween(
          -wiggle,
          wiggle
        )
      ) *
      cheatMultiplier
    );
  }

  function bonusNearMatchCounts() {
    if (selectedMode === "medium") {
      return {
        sameLetterWrongColor: 18,
        sameColorWrongLetter: 24
      };
    }

    if (selectedMode === "hard") {
      return {
        sameLetterWrongColor: 28,
        sameColorWrongLetter: 36
      };
    }

    return {
      sameLetterWrongColor: 8,
      sameColorWrongLetter: 12
    };
  }

  function bonusPointerWanderDelayMs() {
    if (selectedMode === "easy") {
      return randomBetween(
        650,
        1150
      );
    }

    if (selectedMode === "medium") {
      return randomBetween(
        500,
        850
      );
    }

    return randomBetween(
      380,
      650
    );
  }

  function bonusPointerFinalMoveMs() {
    if (selectedMode === "easy") {
      return 520;
    }

    if (selectedMode === "medium") {
      return 360;
    }

    return 260;
  }

  function bonusPointerTapMs() {
    if (selectedMode === "easy") {
      return 360;
    }

    if (selectedMode === "medium") {
      return 240;
    }

    return 180;
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
      preloadUiSounds();
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

  function playNoise(eventId, start, duration, gain = 0.12, filterFreq = 900, type = "lowpass") {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = soundEnvelope(eventId, start, duration, gain, 0.002, 0.05);
    if (!envelope) return;

    src.buffer = buffer;
    filter.type = type;
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;

    src.connect(filter);
    filter.connect(envelope);
    src.start(start);
    src.stop(start + duration + 0.08);
  }

  function playClick(eventId, start, gain = 0.1, freq = 1400) {
    playNoise(eventId, start, 0.025, gain, freq, "bandpass");
  }


  function preloadUiSounds() {
    Object.keys(UI_SOUND_FILES).forEach(key => {
      loadUiSoundBuffer(key);
    });
  }

  function loadUiSoundBuffer(key) {
    if (uiSoundBuffers.has(key)) {
      return Promise.resolve(uiSoundBuffers.get(key));
    }

    if (uiSoundBufferPromises.has(key)) {
      return uiSoundBufferPromises.get(key);
    }

    const url = UI_SOUND_FILES[key];
    if (!url) return Promise.resolve(null);

    const promise = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Unable to load UI sound: ${key}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        const ctx = ensureAudioContext();
        if (!ctx) return null;
        return ctx.decodeAudioData(arrayBuffer);
      })
      .then(buffer => {
        if (buffer) uiSoundBuffers.set(key, buffer);
        return buffer;
      })
      .catch(() => null);

    uiSoundBufferPromises.set(key, promise);
    return promise;
  }

  function playBufferedUiSound(key, eventId = "uiTap", allowWhenMuted = false) {
    if (muted && !allowWhenMuted) return;

    unlockAudio();

    const ctx = ensureAudioContext();
    if (!ctx || !masterGain) return;

    masterGain.gain.value = SOUND_TUNING.masterVolume;

    const startBuffer = buffer => {
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
        // UI sounds should never break gameplay.
      }
    };

    const existingBuffer = uiSoundBuffers.get(key);
    if (existingBuffer) {
      startBuffer(existingBuffer);
      return;
    }

    loadUiSoundBuffer(key).then(startBuffer);
  }

  function playUiTapSound(allowWhenMuted = false) {
    const key = uiSoundFlip ? "uiTap2" : "uiTap1";
    uiSoundFlip = !uiSoundFlip;
    playBufferedUiSound(key, "uiTap", allowWhenMuted);
  }

  const TUNE_TEMPO = 0.65;

  const TUNE_NOTES = {
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    G5: 783.99,
    A5: 880.00,
    C6: 1046.50,
    E6: 1318.51
  };

  const VERSE_SCRAMBLE_TUNES = {
    titleIntro: [
      ["C5", 0, 0.065, 0.052],
      ["E5", 0.06, 0.065, 0.052],
      ["A5", 0.12, 0.075, 0.05],
      ["G5", 0.2, 0.13, 0.045]
    ],
    bonusStart: [
      ["D5", 0, 0.05, 0.045],
      ["E5", 0.055, 0.05, 0.045],
      ["G5", 0.11, 0.1, 0.05]
    ],
    bonusYouWin: [
      ["C6", 0, 0.07, 0.045],
      ["G5", 0.06, 0.07, 0.045],
      ["E6", 0.13, 0.13, 0.05]
    ],
    bonusIWin: [
      ["E5", 0, 0.08, 0.045],
      ["D5", 0.08, 0.08, 0.045],
      ["C5", 0.16, 0.13, 0.045]
    ],
    bonusFinal: [
      ["G5", 0, 0.06, 0.04],
      ["C6", 0.055, 0.07, 0.045],
      ["E6", 0.12, 0.09, 0.045],
      ["C6", 0.23, 0.16, 0.05]
    ]
  };

  function playTuneNote(eventId, noteName, start, duration, gain, wave = "sine") {
    const freq = TUNE_NOTES[noteName] || TUNE_NOTES.C5;
    playOsc(eventId, wave, freq, start, duration, gain, freq * 1.015);
  }

  function playTune(eventId, tuneName, t) {
    const tune = VERSE_SCRAMBLE_TUNES[tuneName];
    if (!tune) return;

    tune.forEach((note, index) => {
      const [noteName, offset, duration, gain] = note;
      const wave = index % 3 === 1 ? "triangle" : "sine";

      playTuneNote(
        eventId,
        noteName,
        t + offset / TUNE_TEMPO,
        duration / TUNE_TEMPO,
        gain,
        wave
      );
    });
  }

  function midiToFreq(midi){
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function melodyPoolsForLength(length){
    const pools = {
      1: [
        [67],
        [72],
        [64],
        [60],
        [69]
      ],

      2: [
        [60, 67],
        [64, 67],
        [67, 72],
        [72, 67],
        [60, 64]
      ],

      3: [
        [60, 64, 67],
        [67, 69, 72],
        [72, 67, 64],
        [60, 62, 64],
        [64, 67, 72]
      ],

      4: [
        [60, 62, 64, 67],
        [60, 64, 67, 72],
        [67, 69, 67, 72],
        [64, 67, 69, 67],
        [72, 69, 67, 64]
      ],

      5: [
        [60, 62, 64, 67, 72],
        [60, 64, 67, 69, 72],
        [67, 69, 72, 69, 67],
        [64, 67, 69, 67, 72],
        [72, 69, 67, 64, 60]
      ],

      6: [
        [60, 62, 64, 67, 69, 72],
        [60, 64, 67, 72, 67, 72],
        [67, 69, 72, 69, 67, 64],
        [64, 67, 69, 72, 69, 67],
        [72, 69, 67, 64, 62, 60]
      ],

      7: [
        [60, 62, 64, 67, 69, 72, 67],
        [60, 64, 67, 69, 72, 69, 67],
        [60, 62, 65, 62, 69, 69, 67],
        [64, 67, 69, 67, 64, 67, 72],
        [72, 69, 67, 64, 60, 64, 67]
      ],

      8: [
        [60, 62, 64, 67, 69, 72, 69, 67],
        [60, 64, 67, 72, 67, 69, 67, 72],
        [67, 69, 72, 71, 72, 69, 67, 64],
        [64, 67, 69, 72, 69, 67, 64, 60],
        [72, 69, 67, 64, 60, 62, 64, 67]
      ],

      9: [
        [60, 62, 64, 67, 69, 72, 69, 67, 64],
        [60, 64, 67, 72, 69, 67, 64, 67, 72],
        [67, 69, 72, 71, 72, 69, 67, 64, 60],
        [64, 67, 69, 72, 69, 67, 64, 62, 60],
        [72, 69, 67, 64, 60, 62, 64, 67, 72]
      ],

      10: [
        [60, 62, 64, 67, 69, 72, 69, 67, 64, 60],
        [60, 64, 67, 72, 69, 67, 64, 67, 69, 72],
        [67, 69, 72, 71, 72, 69, 67, 64, 62, 60],
        [64, 67, 69, 72, 71, 72, 69, 67, 64, 67],
        [72, 69, 67, 64, 60, 62, 64, 67, 69, 72]
      ]
    };

    return pools[length] || [];
  }

  function chooseCorrectMelodyForLength(length){
    const cappedLength = Math.max(1, Math.min(10, Math.round(length || 1)));
    const pool = melodyPoolsForLength(cappedLength);

    if (!pool.length){
      return [60, 62, 64, 67, 69, 72, 69, 67, 64, 60];
    }

    return pool[Math.floor(Math.random() * pool.length)].slice();
  }

  function soundCorrectLetter(t) {
    const targetLength = state.currentTarget?.playableText?.length || 1;

    if (!currentCorrectMelody.length){
      currentCorrectMelody = chooseCorrectMelodyForLength(targetLength);
    }

    const midi = currentCorrectMelody[state.letterIndex % currentCorrectMelody.length] || 60;
    const freq = midiToFreq(midi);

    playOsc("correctLetter", "triangle", freq, t, 0.13, 0.48);
  }

  function soundWrongLetter(t) {
    playOsc("wrongLetter", "triangle", 220, t, 0.08, 0.10, 170);
    playOsc("wrongLetter", "triangle", 170, t + 0.07, 0.09, 0.07);
  }

  function soundWordComplete(t) {
    playOsc("wordComplete", "sine", 523, t, 0.08, 0.07);
    playOsc("wordComplete", "sine", 659, t + 0.07, 0.08, 0.07);
    playOsc("wordComplete", "sine", 784, t + 0.14, 0.12, 0.08);
    playOsc("wordComplete", "sine", 1046, t + 0.20, 0.16, 0.06);
  }

  function soundLettersFall(t) {
    playNoise("lettersFall", t, 0.38, 0.09, 650, "lowpass");
    playOsc("lettersFall", "sine", 240, t + 0.18, 0.18, 0.035, 110);
  }

  function soundMessagePop(t) {
    playTune("messagePop", "titleIntro", t);
  }

  function soundBonusStart(t) {
    playTune("bonusStart", "bonusStart", t);
  }

  function soundBonusYouWin(t) {
    playTune("bonusYouWin", "bonusYouWin", t);
  }

  function soundBonusIWin(t) {
    playTune("bonusIWin", "bonusIWin", t);
  }

  function soundBonusFinal(t) {
    playTune("bonusFinal", "bonusFinal", t);
  }

  const SOUND_PLAYERS = {
    correctLetter: soundCorrectLetter,
    wrongLetter: soundWrongLetter,
    wordComplete: soundWordComplete,
    lettersFall: soundLettersFall,
    messagePop: soundMessagePop,
    bonusStart: soundBonusStart,
    bonusYouWin: soundBonusYouWin,
    bonusIWin: soundBonusIWin,
    bonusFinal: soundBonusFinal
  };

  function playGameSound(eventId) {
    if (muted) return;

    unlockAudio();

    const ctx = ensureAudioContext();
    const player = SOUND_PLAYERS[eventId];
    if (!ctx || !masterGain || !player) return;

    masterGain.gain.value = SOUND_TUNING.masterVolume;

    try {
      player(ctx.currentTime + 0.02);
    } catch (err) {
      // Sound should never break gameplay.
    }
  }

  function initVerseData(){
    clearEasyHint();
    const parsed = window.VerseGameShell.parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
    const buildData = window.VerseGameShell.buildVerseSegments({
      verseText: ctx.verseText || "",
      book: parsed.book,
      reference: parsed.reference,
      buildArea: BUILD_AREA
    });

    state.words = buildData.words;
    state.segments = buildData.segments;
    state.metaIndices = buildData.metaIndices;
    state.bookLabel = buildData.bookLabel;
    state.referenceLabel = buildData.referenceLabel;
    state.referenceMeta = parsed;
    state.buildSizeClass = buildData.buildSizeClass;
    state.progressIndex = 0;
    state.targetGroups = buildTargetGroups();
    state.targetGroupIndex = 0;
    state.currentTarget = null;
    state.tiles = [];
    state.letterIndex = 0;
    state.tileSeed = 0;
    state.busy = false;
    state.completed = false;
    state.completionResult = null;
    state.correctLetters = 0;
    state.wrongTaps = 0;
    state.targetsCompleted = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.profileRewardQueue = 0;
    state.activeProfileReward = null;
    state.showingInstruction = false;
    state.instructionToken += 1;
    state.bonusActive = false;
    state.bonusStage = "none";
    state.bonusRound = 0;
    state.bonusPlayerWins = 0;
    state.bonusPointerWins = 0;
    state.bonusTargetLetter = "";
    state.bonusTargetColor = "";
    state.bonusTargetShade = "";
    state.bonusRoundToken += 1;
    state.bonusDeadline = 0;
    state.bonusPointerRunning = false;
    state.bonusResultText = "";
    state.bonusResultKind = "";
  }

  function currentPhase(index = state.progressIndex){
    return window.VerseGameShell.getPhaseForProgress({
      progressIndex: index,
      wordCount: state.words.length,
      totalSegments: state.segments.length,
      bookLabel: state.bookLabel,
      referenceLabel: state.referenceLabel
    });
  }

  function isPlayableChar(ch, kind){
    if (!ch) return false;
    if (kind === "reference") return /[0-9]/.test(ch);
    if (kind === "book" || kind === "book-reference") return /[A-Za-z0-9]/.test(ch);
    return /[A-Za-z]/.test(ch);
  }

  function getPlayableText(displayText, kind){
    return Array.from(displayText)
      .filter(ch => isPlayableChar(ch, kind))
      .join("")
      .toUpperCase();
  }

  function displayTextForSegments(startIndex, count){
    return state.segments.slice(startIndex, startIndex + count).join(" ");
  }

  function displayTextForTargetGroup(group, kind){
    if (kind === "book-reference") {
      return `${state.bookLabel || ""} ${state.referenceLabel || ""}`
        .replace(/\s+/g, " ")
        .trim();
    }

    return displayTextForSegments(group.startIndex, group.segmentCount);
  }

  function targetKindForPhase(phase){
    if (phase === "book") return "book";
    if (phase === "reference") return "reference";
    return "word";
  }


  function isVerseWordIndex(index) {
    return currentPhase(index) === "words";
  }

  function playableLetterCountAt(index) {
    return getPlayableText(state.segments[index] || "", "word").length;
  }

  function endsWithStrongBreak(text) {
    return /[.!?;:]["'”’)\]]*$/.test(String(text || "").trim());
  }

  function canPairVerseWords(startIndex) {
    const nextIndex =
      startIndex + 1;

    if (
      !isVerseWordIndex(startIndex) ||
      !isVerseWordIndex(nextIndex)
    ) {
      return false;
    }

    const currentText =
      state.segments[startIndex] ||
      "";

    if (endsWithStrongBreak(currentText)) {
      return false;
    }

    const currentCount =
      playableLetterCountAt(
        startIndex
      );

    const nextCount =
      playableLetterCountAt(
        nextIndex
      );

    return (
      currentCount > 0 &&
      nextCount > 0 &&
      currentCount + nextCount <= 7
    );
  }

  function buildTargetGroups() {
    const groups = [];
    let index = 0;

    while (index < state.segments.length) {
      const phase =
        currentPhase(index);

      if (phase !== "words") {
        const nextIndex =
          index + 1;

        const nextPhase =
          nextIndex < state.segments.length
            ? currentPhase(nextIndex)
            : "";

        if (
          phase === "book" &&
          nextPhase === "reference"
        ) {
          groups.push({
            startIndex: index,
            segmentCount: 2,
            kind: "book-reference"
          });

          index += 2;
          continue;
        }

        groups.push({
          startIndex: index,
          segmentCount: 1
        });

        index += 1;
        continue;
      }

      if (canPairVerseWords(index)) {
        groups.push({
          startIndex: index,
          segmentCount: 2
        });

        index += 2;
        continue;
      }

      groups.push({
        startIndex: index,
        segmentCount: 1
      });

      index += 1;
    }

    return groups;
  }

  function makeTarget() {
    const group = state.targetGroups[state.targetGroupIndex] || {
      startIndex: state.progressIndex,
      segmentCount: 1
    };

    const phase = currentPhase(group.startIndex);
    const kind = group.kind || targetKindForPhase(phase);
    const displayText = displayTextForTargetGroup(group, kind);
    const playableText = getPlayableText(displayText, kind);

    return {
      startIndex: group.startIndex,
      segmentCount: group.segmentCount,
      phase,
      kind,
      displayText,
      playableText
    };
  }

  function allowedDecoyPool(target){
    const targetChars = new Set(target.playableText.split(""));
    let basePool = LETTERS;

    if (target.kind === "reference") {
      basePool = DIGITS;
    } else if (target.kind === "book-reference") {
      basePool = LETTERS.concat(DIGITS);
    }

    return basePool.filter(ch => !targetChars.has(ch));
  }

  function extraCountForMode(target){
    if (selectedMode === "easy") return 0;
    if (selectedMode === "medium") return 3;
    return 80;
  }

  function makeTilesForTarget(target){
    const targetTiles = target.playableText.split("").map(ch => ({
      id: `vsn_tile_${state.tileSeed++}`,
      char: ch,
      source: "target"
    }));

    const pool = allowedDecoyPool(target);
    const extraCount = extraCountForMode(target);
    const decoys = [];
    for (let i = 0; i < extraCount && pool.length; i++){
      decoys.push({
        id: `vsn_tile_${state.tileSeed++}`,
        char: pool[Math.floor(Math.random() * pool.length)],
        source: "decoy"
      });
    }

    return shuffle(targetTiles.concat(decoys)).map((tile, index) => {
      const color = MAGNET_COLORS[index % MAGNET_COLORS.length];
      return {
        ...tile,
        color,
        shade: darkenHexColor(color, 30),
        rotation: Math.round(Math.random() * 34 - 17)
      };
    });
  }

  function prepareCurrentTarget(){
    state.currentTarget = makeTarget();
    state.letterIndex = 0;
    currentCorrectMelody = chooseCorrectMelodyForLength(state.currentTarget.playableText.length);
    state.tiles = makeTilesForTarget(state.currentTarget);

    const profileReward =
      ensureActiveProfileReward();

    if (profileReward) {
      state.tiles.push(
        profileReward
      );
    }
  }

  function setScreen(screen){
    state.screen = screen;
    render();
  }

  function clearMenuAndHelpState(){
    state.menuOpen = false;
    state.helpOpen = false;
    state.helpBackMode = false;
  }

  function renderBuildText(){
    return window.VerseGameShell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: state.bookLabel,
      reference: state.referenceLabel,
      progressIndex: state.progressIndex,
      buildArea: BUILD_AREA,
      hideUnbuilt: selectedMode === "hard",
      extraClass: "vsn-build-text"
    });
  }

  function fitBuildText(){
    requestAnimationFrame(() => {
      window.VerseGameShell.fitBuildTextOnce({
        buildEl: document.getElementById("vsnBuild"),
        textEl: document.getElementById("vsnBuildText"),
        buildArea: BUILD_AREA
      });
    });
  }

  function positionTargetNote(){
    const board = document.getElementById("vsnBoard");
    const menu = document.getElementById("vsnMenuPill");
    const note = document.getElementById("vsnTargetNote");

    if (!board || !menu || !note) return;

    const boardRect = board.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    if (!boardRect.width) return;

    const boardLeft = boardRect.left;
    const menuRight = menuRect.right - boardLeft;
    const boardRight = boardRect.width;

    const gap = 10;
    const spaceLeft = Math.min(boardRight - gap, menuRight + gap);
    const spaceRight = boardRight - gap;
    const availableWidth = Math.max(80, spaceRight - spaceLeft);
    const centerX = spaceLeft + availableWidth / 2;

    note.style.setProperty("--vsn-target-center-x", `${centerX}px`);
    note.style.setProperty("--vsn-target-max-width", `${availableWidth}px`);
  }

  function fitTargetText(){
    requestAnimationFrame(() => {
      const note = document.getElementById("vsnTargetNote");
      const text = document.getElementById("vsnTargetText");
      if (!note || !text) return;

      positionTargetNote();

      text.style.fontSize = "";
      const textStyles = getComputedStyle(text);
      const noteStyles = getComputedStyle(note);
      const maxPx = Number(textStyles.fontSize.replace("px", "")) || 42;
      const minPx = 18;
      let size = maxPx;
      const horizontalPadding =
        (parseFloat(noteStyles.paddingLeft) || 0) +
        (parseFloat(noteStyles.paddingRight) || 0);
      const maxWidth = Math.max(24, note.clientWidth - horizontalPadding);
      while (size > minPx && text.scrollWidth > maxWidth){
        size -= 1;
        text.style.fontSize = `${size}px`;
      }
    });
  }

  function renderTargetHtml(){
    const target = state.currentTarget;
    if (!target) return "";

    let playableIndex = 0;
    return Array.from(target.displayText).map(ch => {
      if (ch === " ") return `<span class="vsn-target-space"> </span>`;

      if (!isPlayableChar(ch, target.kind)){
        return `<span class="vsn-target-static">${escapeHtml(ch)}</span>`;
      }

      const isRevealed = playableIndex < state.letterIndex;
      const html = `<span class="vsn-target-char ${isRevealed ? "is-revealed" : ""}" data-target-index="${playableIndex}">${escapeHtml(ch.toUpperCase())}</span>`;
      playableIndex += 1;
      return html;
    }).join("");
  }

  function updateTargetReveal(){
    const target = state.currentTarget;
    if (!target) return;
    document.querySelectorAll("[data-target-index]").forEach(el => {
      const index = Number(el.getAttribute("data-target-index"));
      el.classList.toggle("is-revealed", index < state.letterIndex);
    });
  }

  function updateBuildArea(){
    const buildText = document.getElementById("vsnBuildText");
    if (!buildText) return;
    const buildRender = renderBuildText();
    buildText.className = buildRender.className;
    buildText.innerHTML = buildRender.html;
    fitBuildText();
  }

  function renderIntro(){
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
        setScreen("mode");
      }
    });
  }

  function renderMode(){
    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Difficulty",
      icon: "🥉🥈🥇",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      theme: GAME_THEME,
      backLabel: "Back to Verse Scramble title",
      onBack: () => {
        playUiTapSound();
        setScreen("intro");
      },
      onSelect: async (mode) => {
        unlockAudio();
        playUiTapSound();
        await waitForMagnetFont();
        selectedMode = mode;
        initVerseData();

        await preloadNextProfileReward();

        state.startTime = performance.now();
        state.showingInstruction = true;
        state.instructionToken += 1;
        state.busy = true;
        state.currentTarget = null;
        state.tiles = [];
        setScreen("game");
      }
    });
  }


  function introLetterHtml(ch, index){
    const color = MAGNET_COLORS[index % MAGNET_COLORS.length];
    const shade = darkenHexColor(color, 30);
    const rotation = Math.round(Math.random() * 20 - 10);
    const delay = Math.min(520, index * 32);
    return `<span class="vsn-intro-letter" style="--magnet-color:${color}; --magnet-shade:${shade}; --magnet-rot:${rotation}deg; --intro-delay:${delay}ms;">${escapeHtml(ch)}</span>`;
  }

  function renderInstructionHtml(lines = ["TAP THE", "LETTERS", "IN ORDER"], label = "Tap the letters in order"){
    let letterIndex = 0;
    return `
      <div class="vsn-instruction-message" id="vsnInstructionMessage" aria-label="${escapeHtml(label)}">
        ${lines.map(line => `
          <div class="vsn-instruction-line">
            ${Array.from(line).map(ch => {
              if (ch === " ") return `<span class="vsn-intro-space"></span>`;
              return introLetterHtml(ch, letterIndex++);
            }).join("")}
          </div>
        `).join("")}
      </div>`;
  }

  function renderBonusIntroHtml(){
    return renderInstructionHtml(
      ["FIND THE", "RIGHT", "LETTER", "BEFORE", "I DO!"],
      "Find the right letter before I do"
    );
  }

  function renderBonusFindHtml(){
    return `
      <div class="vsn-instruction-message vsn-bonus-find-message" id="vsnInstructionMessage" aria-label="Find ${escapeHtml(state.bonusTargetLetter)}">
        <div class="vsn-instruction-line">
          ${Array.from("FIND").map((ch, index) => introLetterHtml(ch, index)).join("")}
        </div>
        <div class="vsn-instruction-line">
          <span
            class="vsn-intro-letter vsn-bonus-find-letter"
            style="--magnet-color:${state.bonusTargetColor}; --magnet-shade:${state.bonusTargetShade}; --magnet-rot:${Math.round(Math.random() * 12 - 6)}deg; --intro-delay:80ms;"
          >${escapeHtml(state.bonusTargetLetter)}</span>
        </div>
      </div>`;
  }

  function renderBonusFinalHtml(){
    const playerWon = state.bonusPlayerWins > state.bonusPointerWins;
    const lines = playerWon
      ? ["YOU WIN", `${state.bonusPlayerWins} - ${state.bonusPointerWins}`]
      : ["I WIN", `${state.bonusPointerWins} - ${state.bonusPlayerWins}`];

    return renderInstructionHtml(lines, playerWon ? "You win" : "I win");
  }

  async function runInstructionIntro(token){
    playGameSound("messagePop");
    await sleep(3400);
    if (state.screen !== "game" || !state.showingInstruction || token !== state.instructionToken) return;
    const msg = document.getElementById("vsnInstructionMessage");
    if (msg){
      msg.classList.add("is-exiting");
      await sleep(430);
    }
    if (state.screen !== "game" || token !== state.instructionToken) return;
    state.showingInstruction = false;
    state.busy = false;
    clearMenuAndHelpState();
    prepareCurrentTarget();
    render();
  }


  function startBonusIntro() {
    state.bonusActive = true;
    state.bonusStage = "intro";
    state.bonusRound = 0;
    state.bonusPlayerWins = 0;
    state.bonusPointerWins = 0;
    state.bonusResultText = "";
    state.bonusResultKind = "";
    state.bonusRoundToken += 1;
    state.busy = true;
    state.tiles = [];
    render();

    const token = state.bonusRoundToken;
    runBonusIntro(token);
  }

  async function runBonusIntro(token) {
    playGameSound("messagePop");
    await sleep(4200);
    if (!isCurrentBonusToken(token) || state.bonusStage !== "intro") return;
    const msg = document.getElementById("vsnInstructionMessage");
    if (msg) {
      msg.classList.add("is-exiting");
      await sleep(430);
    }
    if (!isCurrentBonusToken(token)) return;
    clearMenuAndHelpState();
    startBonusRound();
  }

  function startBonusRound() {
    if (state.bonusRound >= 5) {
      startBonusFinal();
      return;
    }

    state.bonusRound += 1;
    state.bonusStage = "find";
    state.bonusResultText = "";
    state.bonusResultKind = "";
    state.bonusPointerRunning = false;
    state.bonusRoundToken += 1;

    const color = randomItem(MAGNET_COLORS);
    state.bonusTargetLetter = randomItem(LETTERS);
    state.bonusTargetColor = color;
    state.bonusTargetShade = darkenHexColor(color, 30);
    state.tiles = [];

    render();

    const token = state.bonusRoundToken;
    runBonusFindMessage(token);
  }

  async function runBonusFindMessage(token) {
    playGameSound("bonusStart");
    await sleep(1350);
    if (!isCurrentBonusToken(token) || state.bonusStage !== "find") return;
    const msg = document.getElementById("vsnInstructionMessage");
    if (msg) {
      msg.classList.add("is-exiting");
      await sleep(360);
    }
    if (!isCurrentBonusToken(token)) return;

    clearMenuAndHelpState();
    state.bonusStage = "round";
    state.tiles = makeBonusTiles();
    state.bonusDeadline = performance.now() + bonusTimeWithWiggle();
    state.busy = false;
    render();
  }

  function startBonusFinal() {
    state.bonusStage = "final";
    state.bonusResultText = "";
    state.bonusResultKind = "";
    state.busy = true;
    state.tiles = [];
    state.bonusRoundToken += 1;
    render();

    const token = state.bonusRoundToken;
    runBonusFinal(token);
  }

  async function runBonusFinal(token) {
    playGameSound("bonusFinal");
    await sleep(2800);
    if (!isCurrentBonusToken(token) || state.bonusStage !== "final") return;
    const msg = document.getElementById("vsnInstructionMessage");
    if (msg) {
      msg.classList.add("is-exiting");
      await sleep(430);
    }
    if (!isCurrentBonusToken(token)) return;
    clearMenuAndHelpState();
    state.bonusActive = false;
    state.bonusStage = "none";
    state.busy = false;
    setScreen("end");
  }

  function isCurrentBonusToken(token) {
    return state.screen === "game" &&
      state.bonusActive &&
      token === state.bonusRoundToken;
  }

  function makeBonusTiles() {
    const targetTile = {
      id: `vsn_tile_${state.tileSeed++}`,
      char: state.bonusTargetLetter,
      source: "bonus-target",
      isBonusTarget: true,
      color: state.bonusTargetColor,
      shade: state.bonusTargetShade,
      rotation: Math.round(Math.random() * 34 - 17)
    };

    const tiles = [targetTile];
    const desiredTotal = 110;
    const nonTargetLetters = LETTERS.filter(ch => ch !== state.bonusTargetLetter);
    const nonTargetColors = MAGNET_COLORS.filter(color => color !== state.bonusTargetColor);
    const nearMatchCounts = bonusNearMatchCounts();

    const sameLetterWrongColorEnd =
      nearMatchCounts.sameLetterWrongColor;

    const sameColorWrongLetterEnd =
      sameLetterWrongColorEnd +
      nearMatchCounts.sameColorWrongLetter;

    for (let i = 0; i < desiredTotal - 1; i++) {
      let char;
      let color;

      if (
        i < sameLetterWrongColorEnd &&
        nonTargetColors.length
      ) {
        char =
          state.bonusTargetLetter;

        color =
          randomItem(
            nonTargetColors
          );
      } else if (
        i < sameColorWrongLetterEnd &&
        nonTargetLetters.length
      ) {
        char =
          randomItem(
            nonTargetLetters
          );

        color =
          state.bonusTargetColor;
      } else {
        char = randomItem(LETTERS);
        color = randomItem(MAGNET_COLORS);

        if (char === state.bonusTargetLetter && color === state.bonusTargetColor) {
          color = randomItem(nonTargetColors.length ? nonTargetColors : MAGNET_COLORS);
          if (color === state.bonusTargetColor) {
            char = randomItem(nonTargetLetters.length ? nonTargetLetters : LETTERS);
          }
        }
      }

      tiles.push({
        id: `vsn_tile_${state.tileSeed++}`,
        char,
        source: "bonus-decoy",
        isBonusTarget: false,
        color,
        shade: darkenHexColor(color, 30),
        rotation: Math.round(Math.random() * 34 - 17)
      });
    }

    return shuffle(tiles);
  }

  function renderBonusTargetHtml() {
    if (state.bonusStage !== "round") return "";
    return `Find: <span class="vsn-bonus-target-letter" style="color:${state.bonusTargetColor};">${escapeHtml(state.bonusTargetLetter)}</span>`;
  }

  function renderBonusPointerHtml() {
    if (!state.bonusActive || state.bonusStage !== "round") return "";
    return `
      <div class="vsn-bonus-pointer" id="vsnBonusPointer" aria-hidden="true">
        <img src="./verse_scramble_images/pointer.svg" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <span style="display:none;">👉</span>
      </div>`;
  }

  function renderBonusResultHtml() {
    if (!state.bonusResultText) return "";
    return `<div class="vsn-bonus-result vsn-bonus-result--${state.bonusResultKind}" id="vsnBonusResult">${escapeHtml(state.bonusResultText)}</div>`;
  }

  function handleBonusTileTap(btn) {
    unlockAudio();

    if (state.busy || state.menuOpen || state.helpOpen || state.bonusStage !== "round") return;

    const tile = tileObjectForButton(btn);
    if (!tile || btn.classList.contains("is-used")) return;

    if (tile.isBonusTarget) {
      resolveBonusRound("player", btn);
      return;
    }

    state.bonusDeadline = Math.max(performance.now() + 900, state.bonusDeadline - 1000);
    shakeElement(btn);
  }

  async function resolveBonusRound(winner, btn) {
    if (state.busy || state.bonusStage !== "round") return;

    state.busy = true;
    state.bonusRoundToken += 1;

    if (winner === "player") {
      state.bonusPlayerWins += 1;
      state.bonusResultText = "YOU WON!";
      state.bonusResultKind = "player";
      playGameSound("bonusYouWin");
    } else {
      state.bonusPointerWins += 1;
      state.bonusResultText = "I WON!";
      state.bonusResultKind = "pointer";
      playGameSound("bonusIWin");
    }

    if (btn) {
      btn.classList.add("is-correct", "is-used");
      btn.disabled = true;
    }

    const result = document.getElementById("vsnBonusResult");
    if (result) result.remove();

    const board = document.getElementById("vsnBoard");
    if (board) {
      board.insertAdjacentHTML("beforeend", renderBonusResultHtml());
    }

    await sleep(1500);

    state.busy = false;
    startBonusRound();
  }

  function startBonusPointerLoop() {
    if (!state.bonusActive || state.bonusStage !== "round" || state.bonusPointerRunning) return;
    state.bonusPointerRunning = true;
    const token = state.bonusRoundToken;
    runBonusPointerLoop(token);
  }

  async function runBonusPointerLoop(token) {
    const pointer = document.getElementById("vsnBonusPointer");
    const board = document.getElementById("vsnBoard");
    if (!pointer || !board) return;

    positionPointerOffscreen(pointer, board);
    await sleep(80);

    while (isCurrentBonusToken(token) && state.bonusStage === "round" && performance.now() < state.bonusDeadline) {
      const decoys = visibleBonusButtons(false);
      if (decoys.length) {
        movePointerToButton(pointer, board, randomItem(decoys), false);
      }
      await sleep(
        bonusPointerWanderDelayMs()
      );
    }

    if (!isCurrentBonusToken(token) || state.bonusStage !== "round") return;

    const targetBtn = visibleBonusButtons(true)[0];
    if (!targetBtn) return;

    movePointerToButton(pointer, board, targetBtn, true);

    await sleep(
      bonusPointerFinalMoveMs()
    );

    if (!isCurrentBonusToken(token) || state.bonusStage !== "round") return;

    pointer.classList.add("is-tapping");

    await sleep(
      bonusPointerTapMs()
    );

    if (!isCurrentBonusToken(token) || state.bonusStage !== "round") return;
    resolveBonusRound("pointer", targetBtn);
  }

  function visibleBonusButtons(targetOnly) {
    return Array.from(document.querySelectorAll(".vsn-magnet"))
      .filter(btn => {
        const tile = tileObjectForButton(btn);
        if (!tile || btn.style.display === "none" || btn.style.visibility === "hidden") return false;
        return targetOnly ? tile.isBonusTarget : !tile.isBonusTarget;
      });
  }

  function positionPointerOffscreen(pointer, board) {
    const rect = board.getBoundingClientRect();
    const side = Math.floor(Math.random() * 4);
    let x = rect.width / 2;
    let y = rect.height / 2;

    if (side === 0) {
      x = -80;
      y = randomBetween(60, rect.height - 60);
    } else if (side === 1) {
      x = rect.width + 80;
      y = randomBetween(60, rect.height - 60);
    } else if (side === 2) {
      x = randomBetween(60, rect.width - 60);
      y = -80;
    } else {
      x = randomBetween(60, rect.width - 60);
      y = rect.height + 80;
    }

    pointer.classList.add("is-instant");
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
    void pointer.offsetWidth;
    pointer.classList.remove("is-instant");
  }

  function movePointerToButton(pointer, board, btn, finalMove) {
    const boardRect = board.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const x = btnRect.left - boardRect.left + btnRect.width * .5;
    const y = btnRect.top - boardRect.top + btnRect.height * .5;

    pointer.classList.toggle("is-final", !!finalMove);
    pointer.classList.remove("is-tapping");
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
  }

  function renderScrambleTileHtml(tile) {
    if (tile.isProfileReward) {
      const shapeClass =
        tile.profileShape === "circle"
          ? "is-circle"
          : "is-rounded";

      return `
        <button
          class="vsn-magnet vsn-profile-magnet ${shapeClass} no-zoom is-spawning"
          type="button"
          id="${tile.id}"
          data-tile-id="${tile.id}"
          data-profile-reward="1"
          style="--magnet-color:${tile.color}; --magnet-shade:${tile.shade}; --magnet-rot:${tile.rotation}deg; --profile-border:${tile.profileBorderColor};"
          aria-label="Streak reward profile magnet"
        >
          <span class="vsn-profile-magnet-frame">
            <img
              class="vsn-profile-magnet-img"
              src="${escapeHtml(tile.profileSrc)}"
              alt=""
              draggable="false"
              onerror="this.onerror=null;this.src='${PROFILE_PICTURE_FALLBACK_SRC}';"
            >
          </span>
        </button>
      `;
    }

    return `
      <button
        class="vsn-magnet no-zoom is-spawning"
        type="button"
        id="${tile.id}"
        data-tile-id="${tile.id}"
        data-char="${escapeHtml(tile.char)}"
        style="--magnet-color:${tile.color}; --magnet-shade:${tile.shade}; --magnet-rot:${tile.rotation}deg;"
        aria-label="Letter ${escapeHtml(tile.char)}"
      >${escapeHtml(tile.char)}</button>
    `;
  }

  function renderGame(){
    const buildRender = renderBuildText();
    const rootBonusClass = state.bonusActive ? "vsn-bonus-active" : "";
    const targetIsBlank = state.showingInstruction ||
      state.bonusStage === "intro" ||
      state.bonusStage === "find" ||
      state.bonusStage === "final";
    const targetHtml = state.bonusActive ? renderBonusTargetHtml() : renderTargetHtml();
    const isMessageField = state.showingInstruction ||
      state.bonusStage === "intro" ||
      state.bonusStage === "find" ||
      state.bonusStage === "final";
    const fieldHtml = state.showingInstruction
      ? renderInstructionHtml()
      : state.bonusStage === "intro"
        ? renderBonusIntroHtml()
        : state.bonusStage === "find"
          ? renderBonusFindHtml()
          : state.bonusStage === "final"
            ? renderBonusFinalHtml()
            : state.tiles.map(renderScrambleTileHtml).join("");

    app.innerHTML = `
      <div class="vsn-root vsn-mode-${selectedMode || "easy"} ${rootBonusClass}">
        <div class="vsn-stage">
          <div class="vsn-build-wrap">
            <div class="vsn-build vm-build vm-build--${BUILD_AREA}" id="vsnBuild">
              <div class="${buildRender.className}" id="vsnBuildText">${buildRender.html}</div>
            </div>
          </div>

          <div class="vsn-game-wrap">
            <div class="vsn-fridge-board" id="vsnBoard">
              <button class="vsn-menu-pill no-zoom" id="vsnMenuPill" aria-label="Game Menu" type="button">☰</button>

              <div class="vsn-target-note ${targetIsBlank ? "is-blank" : ""}" id="vsnTargetNote" aria-live="polite">
                <div class="vsn-target-text" id="vsnTargetText">${targetIsBlank ? "" : targetHtml}</div>
              </div>

              <div class="vsn-letter-field ${isMessageField ? "is-message-field" : ""}" id="vsnLetterField" aria-label="Scrambled magnet letters">
                ${fieldHtml}
              </div>
              ${renderBonusPointerHtml()}
              ${renderBonusResultHtml()}
            </div>

            <div
              class="vsn-firework-layer"
              id="vsnFireworkLayer"
              aria-hidden="true"
            ></div>
          </div>
        </div>
        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>`;

    wireGameScreen();
    fitBuildText();
    fitTargetText();

    if (state.showingInstruction){
      const token = state.instructionToken;
      runInstructionIntro(token);
    } else if (state.bonusStage === "round"){
      requestAnimationFrame(() => {
        layoutMagnets();
        requestAnimationFrame(startBonusPointerLoop);
      });
    } else if (state.bonusStage === "intro" || state.bonusStage === "find" || state.bonusStage === "final"){
      // Bonus message animations manage their own timing.
    } else {
      requestAnimationFrame(() => {
        layoutMagnets();
        requestAnimationFrame(scheduleEasyHint);
      });
    }
  }

  function renderEnd(){
    const earnedMedalIconHtml = state.completionResult?.alreadyCompleted
      ? GAME_ICON_HTML
      : medalIconHtmlForMode(selectedMode);

    window.VerseGameShell.renderCompleteScreen({
      app,
      icon: GAME_ICON,
      iconHtml: earnedMedalIconHtml,
      gameIcon: GAME_ICON,
      mode: selectedMode,
      verseId: ctx.verseId,
      gameId: GAME_ID,
      completion: state.completionResult,
      gameMessage: `${state.wrongTaps} Wrong Taps · Best Streak: ${state.bestStreak}`,
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

  function helpHtml(){
    return `
      Spell the word in the yellow box by tapping the scrambled magnet letters in order.<br><br>
      Continue until you finish the verse.<br><br>
      During the bonus round, find each hidden letter before the computer does.
    `;
  }

  function renderHelpOverlay(){
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body: helpHtml(),
      closeText: state.helpBackMode ? "Back" : "Close"
    });
  }

  function renderGameMenuOverlay(){
    return window.VerseGameShell.gameMenuHtml({
      id: "vsnGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function wireGameScreen(){
    document.querySelectorAll("[data-tile-id]").forEach(btn => {
      let handledByPointer = false;

      btn.addEventListener("pointerdown", (event) => {
        if (btn.disabled) return;

        handledByPointer = true;
        btn.classList.add("is-pressed");

        /*
          Trigger immediately on touch/mouse press instead of waiting
          for the later click event after release.
        */
        event.preventDefault();
        handleTileTap(btn);
      });

      btn.addEventListener("pointerup", () => {
        btn.classList.remove("is-pressed");
      });

      btn.addEventListener("pointerleave", () => {
        btn.classList.remove("is-pressed");
      });

      btn.addEventListener("pointercancel", () => {
        btn.classList.remove("is-pressed");
      });

      btn.addEventListener("click", (event) => {
        /*
          Pointer users already triggered the tile on pointerdown.
          Keep click as a keyboard/accessibility fallback.
        */
        if (handledByPointer) {
          handledByPointer = false;
          event.preventDefault();
          return;
        }

        handleTileTap(btn);
      });
    });

    window.VerseGameShell.wireGameMenu({
      id: "vsnGameMenuOverlay",
      menuButtonId: "vsnMenuPill",
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
        state.menuOpen = false;
        state.helpOpen = true;
        state.helpBackMode = true;

        const menuOverlay = document.getElementById("vsnGameMenuOverlay");
        if (menuOverlay){
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
        setScreen("mode");
      },
      onExit: () => {
        playUiTapSound();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        if (state.busy) return;
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

  function tileObjectForButton(btn){
    const tileId = btn && btn.dataset ? btn.dataset.tileId : "";
    return state.tiles.find(tile => tile.id === tileId);
  }

  function collectProfileRewardMagnet(
    btn,
    tile
  ) {
    if (
      !btn ||
      !tile ||
      !tile.isProfileReward
    ) {
      return;
    }

    const gameWrap =
      document.querySelector(
        ".vsn-game-wrap"
      );

    const btnRect =
      btn.getBoundingClientRect();

    const wrapRect =
      gameWrap
        ? gameWrap.getBoundingClientRect()
        : null;

    btn.classList.add(
      "is-used",
      "is-profile-collected"
    );

    btn.disabled = true;

    state.tiles =
      state.tiles.filter(
        item =>
          item.id !== tile.id
      );

    state.profileRewardQueue =
      Math.max(
        0,
        state.profileRewardQueue - 1
      );

    state.activeProfileReward = null;

    playGameSound("wordComplete");

    if (gameWrap && wrapRect) {
      spawnProfileFireworkAt({
        x:
          btnRect.left -
          wrapRect.left +
          btnRect.width * 0.5,
        y:
          btnRect.top -
          wrapRect.top +
          btnRect.height * 0.5,
        baseSize:
          Math.max(
            btnRect.width,
            btnRect.height
          ) *
          PROFILE_FIREWORK_TUNING.sizeScale,
        accentColor:
          tile.profileBorderColor
      });
    }

    ensureActiveProfileReward();

    window.setTimeout(() => {
      btn.remove();
    }, 240);
  }

  function spawnProfileFireworkAt({
    x,
    y,
    baseSize,
    accentColor
  }) {
    const layer =
      document.getElementById(
        "vsnFireworkLayer"
      );

    if (!layer) return;

    const colors =
      Math.random() <
      PROFILE_FIREWORK_TUNING.rainbowChance
        ? PROFILE_MAGNET_COLORS
        : [
            accentColor ||
              randomItem(
                PROFILE_MAGNET_COLORS
              ) ||
              "#7f66c6",
            "#ffffff"
          ];

    const duration =
      PROFILE_FIREWORK_TUNING.duration;

    const rayThickness =
      Math.max(
        3,
        baseSize *
          PROFILE_FIREWORK_TUNING
            .rayThicknessScale
      );

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "vsn-firework";

    wrapper.style.transform =
      `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;

    wrapper.style.setProperty(
      "--vsn-fw-glow-small",
      `${(baseSize * 0.13).toFixed(1)}px`
    );

    wrapper.style.setProperty(
      "--vsn-fw-glow-large",
      `${(baseSize * 0.34).toFixed(1)}px`
    );

    const centerSize =
      rayThickness * 2.4;

    let html = `
      <span
        class="vsn-firework-center"
        style="
          width:${centerSize.toFixed(1)}px;
          height:${centerSize.toFixed(1)}px;
          margin-left:${(-centerSize / 2).toFixed(1)}px;
          margin-top:${(-centerSize / 2).toFixed(1)}px;
          --fw-color:${colors[0] || "#ffffff"};
          --fw-duration:${duration}ms;
        "
      ></span>
    `;

    const appendRaySet = (
      count,
      isMain
    ) => {
      const angleOffset =
        Math.random() * 360;

      for (
        let i = 0;
        i < count;
        i += 1
      ) {
        const spread =
          360 /
          Math.max(1, count);

        const angle =
          angleOffset +
          spread * i +
          (-4 + Math.random() * 8);

        const length =
          isMain
            ? baseSize *
              (
                0.72 +
                Math.random() * 0.32
              )
            : baseSize *
              (
                0.34 +
                Math.random() * 0.24
              );

        const start =
          baseSize *
          (
            isMain
              ? 0.06 +
                Math.random() * 0.10
              : 0.03 +
                Math.random() * 0.10
          );

        const thickness =
          rayThickness *
          (
            isMain
              ? 0.72 +
                Math.random() * 0.40
              : 0.46 +
                Math.random() * 0.34
          );

        const delay =
          isMain
            ? Math.random() * 35
            : 20 +
              Math.random() * 70;

        const color =
          colors[
            i % colors.length
          ];

        html += `
          <span
            class="vsn-firework-ray ${isMain ? "is-main" : "is-short"}"
            style="
              --fw-angle:${angle.toFixed(1)}deg;
              --fw-length:${length.toFixed(1)}px;
              --fw-start:${start.toFixed(1)}px;
              --fw-thickness:${thickness.toFixed(1)}px;
              --fw-color:${color};
              --fw-duration:${duration}ms;
              --fw-delay:${delay.toFixed(0)}ms;
              filter:drop-shadow(0 0 ${(thickness * 1.7).toFixed(1)}px ${color});
            "
          ></span>
        `;
      }
    };

    appendRaySet(
      PROFILE_FIREWORK_TUNING.mainRays,
      true
    );

    appendRaySet(
      PROFILE_FIREWORK_TUNING.shortRays,
      false
    );

    for (
      let i = 0;
      i <
      PROFILE_FIREWORK_TUNING.sparkles;
      i += 1
    ) {
      const angle =
        Math.random() * 360;

      const distance =
        baseSize *
        (
          0.45 +
          Math.random() * 0.83
        );

      const size =
        rayThickness *
        (
          0.72 +
          Math.random() * 0.83
        );

      const color =
        Math.random() < 0.22
          ? "#ffffff"
          : randomItem(colors);

      const delay =
        40 +
        Math.random() * 90;

      const cls =
        Math.random() < 0.45
          ? "vsn-firework-spark"
          : "vsn-firework-dot";

      html += `
        <span
          class="${cls}"
          style="
            --fw-angle:${angle.toFixed(1)}deg;
            --fw-distance:${distance.toFixed(1)}px;
            --fw-dot-size:${size.toFixed(1)}px;
            --fw-color:${color};
            --fw-duration:${duration}ms;
            --fw-delay:${delay.toFixed(0)}ms;
            filter:drop-shadow(0 0 ${(size * 1.8).toFixed(1)}px ${color});
          "
        ></span>
      `;
    }

    wrapper.innerHTML = html;
    layer.appendChild(wrapper);

    window.setTimeout(() => {
      wrapper.remove();
    }, duration + 220);
  }

  function expectedChar(){
    const target = state.currentTarget;
    if (!target) return "";
    return target.playableText[state.letterIndex] || "";
  }

  function shakeElement(el){
    if (!el) return;
    el.classList.remove("vsn-shake");
    void el.offsetWidth;
    el.classList.add("vsn-shake");
  }

  function clearEasyHint() {
    if (easyHintTimer) {
      clearTimeout(easyHintTimer);
      easyHintTimer = null;
    }

    document.querySelectorAll(".vsn-magnet.is-hinting").forEach(btn => {
      btn.classList.remove("is-hinting");
    });
  }

  function scheduleEasyHint() {
    clearEasyHint();

    if (selectedMode !== "easy") return;
    if (state.screen !== "game") return;
    if (state.bonusActive || state.showingInstruction) return;
    if (state.busy || state.menuOpen || state.helpOpen || state.completed) return;
    if (!state.currentTarget) return;

    easyHintTimer = setTimeout(() => {
      showEasyHint();
    }, 4000);
  }

  function showEasyHint() {
    easyHintTimer = null;

    if (selectedMode !== "easy") return;
    if (state.screen !== "game") return;
    if (state.bonusActive || state.showingInstruction) return;
    if (state.busy || state.menuOpen || state.helpOpen || state.completed) return;

    const expected = expectedChar();
    if (!expected) return;

    document.querySelectorAll(".vsn-magnet").forEach(btn => {
      const tile = tileObjectForButton(btn);
      const shouldHint = tile &&
        tile.char === expected &&
        !btn.classList.contains("is-used") &&
        !btn.disabled &&
        btn.style.display !== "none" &&
        btn.style.visibility !== "hidden";

      btn.classList.toggle("is-hinting", !!shouldHint);
    });
  }

  async function animateRemainingLettersFall() {
    const field = document.getElementById("vsnLetterField");
    if (!field) return;

    const magnets = Array.from(field.querySelectorAll(".vsn-magnet"))
      .filter(btn => !btn.classList.contains("is-used") && btn.style.display !== "none");

    if (!magnets.length) return;

    playGameSound("lettersFall");

    magnets.forEach((btn, index) => {
      const delay = Math.round(randomBetween(0, 260));
      const duration = Math.round(randomBetween(680, 920));

      btn.style.setProperty("--fall-delay", `${delay}ms`);
      btn.style.setProperty("--fall-duration", `${duration}ms`);
      btn.style.zIndex = `${30 + index}`;
      btn.classList.remove("is-spawning", "is-pressed");
      btn.classList.add("is-falling");
      btn.disabled = true;
    });

    await sleep(1120);
  }

  async function handleTileTap(btn){
    unlockAudio();

    if (state.bonusActive){
      handleBonusTileTap(btn);
      return;
    }

    if (state.busy || state.menuOpen || state.helpOpen || state.completed) return;

    const tile = tileObjectForButton(btn);

    if (
      !tile ||
      btn.classList.contains(
        "is-used"
      )
    ) {
      return;
    }

    if (tile.isProfileReward) {
      collectProfileRewardMagnet(
        btn,
        tile
      );
      return;
    }

    const expected =
      expectedChar();

    if (!expected) return;

    if (tile.char === expected){
      playGameSound("correctLetter");
      clearEasyHint();
      state.busy = true;
      state.correctLetters += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);

      queueProfileRewardForCurrentStreak();

      state.letterIndex += 1;

      btn.classList.add("is-correct", "is-used");
      btn.disabled = true;
      updateTargetReveal();

      await sleep(170);
      btn.remove();

      if (state.letterIndex >= state.currentTarget.playableText.length){
        await completeCurrentTarget();
        return;
      }

      state.busy = false;
      scheduleEasyHint();
      return;
    }

    playGameSound("wrongLetter");
    state.wrongTaps += 1;
    state.streak = 0;
    shakeElement(btn);
    shakeElement(document.getElementById("vsnBuild"));
  }

  async function completeCurrentTarget(){
    clearEasyHint();
    playGameSound("wordComplete");
    const note = document.getElementById("vsnTargetNote");
    if (note){
      note.classList.remove("is-complete");
      void note.offsetWidth;
      note.classList.add("is-complete");
    }

    await sleep(180);
    await animateRemainingLettersFall();

    state.targetGroupIndex += 1;
    state.progressIndex = state.currentTarget.startIndex + state.currentTarget.segmentCount;
    state.targetsCompleted += 1;
    updateBuildArea();

    if (state.progressIndex >= state.segments.length){
      state.completed = true;
      state.completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: selectedMode,
        startedAt: state.startTime,
        stats: {
          correctLetters: state.correctLetters,
          wrongTaps: state.wrongTaps,
          targetsCompleted: state.targetsCompleted,
          bestStreak: state.bestStreak
        }
      });
      state.busy = false;
      startBonusIntro();
      return;
    }

    prepareCurrentTarget();
    state.busy = false;
    render();
  }

  function layoutMagnets(){
    const field = document.getElementById("vsnLetterField");
    if (!field) return;

    const rect = field.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const buttons = Array.from(field.querySelectorAll(".vsn-magnet"));
    const byId = new Map(buttons.map(btn => [btn.dataset.tileId, btn]));

    const priorityTiles =
      state.tiles.filter(
        tile =>
          tile.source === "target" ||
          tile.source === "bonus-target" ||
          tile.source === "profile-reward"
      );

    const decoyTiles =
      state.tiles.filter(
        tile =>
          tile.source === "decoy" ||
          tile.source === "bonus-decoy"
      );

    const ordered =
      shuffle(priorityTiles)
        .concat(
          shuffle(decoyTiles)
        );

    const placed = [];
    const isHard = selectedMode === "hard";

    for (const tile of ordered){
      const btn = byId.get(tile.id);
      if (!btn) continue;

      btn.style.left = "0px";
      btn.style.top = "0px";
      btn.style.visibility = "hidden";
      btn.classList.remove("is-hidden-decoy", "is-laid-out");

      const bw = btn.offsetWidth || 54;
      const bh = btn.offsetHeight || 54;
      const gap = Math.max(4, Math.min(10, rect.width * 0.012));
      const maxX = Math.max(0, rect.width - bw - 4);
      const maxY = Math.max(0, rect.height - bh - 4);
      const isPriorityTile =
        tile.source === "target" ||
        tile.source === "bonus-target" ||
        tile.source === "profile-reward";

      const tries =
        isPriorityTile
          ? 360
          : (isHard ? 90 : 180);
      let chosen = null;

      for (let i = 0; i < tries; i++){
        const x = 2 + Math.random() * Math.max(1, maxX - 2);
        const y = 2 + Math.random() * Math.max(1, maxY - 2);
        const candidate = { x, y, w: bw, h: bh };
        const overlaps = placed.some(p => !(
          candidate.x + candidate.w + gap < p.x ||
          candidate.x > p.x + p.w + gap ||
          candidate.y + candidate.h + gap < p.y ||
          candidate.y > p.y + p.h + gap
        ));
        if (!overlaps){
          chosen = candidate;
          break;
        }
      }

      if (!chosen){
        if (tile.source === "decoy" || tile.source === "bonus-decoy"){
          btn.classList.add("is-hidden-decoy");
          btn.style.display = "none";
          continue;
        }
        chosen = findFallbackSlot(placed, rect, bw, bh, gap);
      }

      placed.push(chosen);
      btn.style.left = `${chosen.x}px`;
      btn.style.top = `${chosen.y}px`;
      btn.style.visibility = "visible";
      btn.style.setProperty("--spawn-delay", `${Math.floor(Math.random() * 360)}ms`);
      btn.classList.add("is-laid-out");
    }
  }

  function findFallbackSlot(placed, rect, bw, bh, gap){
    const stepX = Math.max(8, bw * 0.72);
    const stepY = Math.max(8, bh * 0.72);
    for (let y = 2; y <= Math.max(2, rect.height - bh - 2); y += stepY){
      for (let x = 2; x <= Math.max(2, rect.width - bw - 2); x += stepX){
        const candidate = { x, y, w: bw, h: bh };
        const overlaps = placed.some(p => !(
          candidate.x + candidate.w + gap < p.x ||
          candidate.x > p.x + p.w + gap ||
          candidate.y + candidate.h + gap < p.y ||
          candidate.y > p.y + p.h + gap
        ));
        if (!overlaps) return candidate;
      }
    }
    return {
      x: Math.max(2, Math.random() * Math.max(1, rect.width - bw - 4)),
      y: Math.max(2, Math.random() * Math.max(1, rect.height - bh - 4)),
      w: bw,
      h: bh
    };
  }

  function render(){
    if (state.screen === "intro") return renderIntro();
    if (state.screen === "mode") return renderMode();
    if (state.screen === "game") return renderGame();
    if (state.screen === "end") return renderEnd();
  }

  window.addEventListener("resize", () => {
    if (state.screen === "game"){
      positionTargetNote();
      fitTargetText();
      layoutMagnets();
    }
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      if (state.screen === "game"){
        positionTargetNote();
        fitTargetText();
        layoutMagnets();
      }
    }, 120);
  });

  setScreen("intro");
})();
