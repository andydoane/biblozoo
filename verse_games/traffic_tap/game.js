(async function () {
  const app = document.getElementById("app");
  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "traffic_tap_external";

  const GAME_TITLE = "Traffic Tap";
  const GAME_ICON = "🚗";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);



  const GAME_THEME = {
    bg: "#a7cb6f",
    accent: "#a7cb6f"
  };

  const BUILD_AREA = "compact";

  const HELP_OVERLAY_ID = "ttHelpOverlay";

  const SILENCE_AUDIO_FILE = "../../verse_audio/silence.mp3";
  const ZOOM_AUDIO_FILE = "./traffic_tap_sounds/sound_zoom.mp3";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

  const UI_SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`
  };

  const SOUND_TUNING = {
    masterVolume: 1.00,
    volumes: {
      correctTap: 0.85,
      zoomLaunch: 0.25,
      wrongTap: 3.40,
      bonusTap: 1.15,
      rainbowJackpot: 3.20,
      truckIntro: 3.00,
      truckOutro: 3.00,
      uiTap: 0.45
    }
  };


  const BOOKS = window.VerseGameShell.getBibleBookDecoys();

  const FUN_DECOYS = window.VerseGameShell.getFunDecoys();

  const VEHICLES = [
    { id: "police", label: "police car", src: "./traffic_tap_images/car_police.svg" },
    { id: "ambulance", label: "ambulance", src: "./traffic_tap_images/car_ambulance.svg" },
    { id: "red-sports-car", label: "red car", src: "./traffic_tap_images/car_12.png" },
    { id: "green-truck", label: "green truck", src: "./traffic_tap_images/car_10.png" },
    { id: "red-taxi", label: "red taxi", src: "./traffic_tap_images/car_9.png" },
    { id: "yellow-bus", label: "yellow bus", src: "./traffic_tap_images/car_11.png" },
    { id: "purple-race-car", label: "purple race car", src: "./traffic_tap_images/car_8.png" },
    { id: "blue-pickup", label: "blue pickup truck", src: "./traffic_tap_images/car_7.png" },
    { id: "green-suv", label: "green SUV", src: "./traffic_tap_images/car_4.png" },
    { id: "orange-van", label: "orange van", src: "./traffic_tap_images/car_3.png" },
    { id: "gray-van", label: "gray van", src: "./traffic_tap_images/car_2.png" },
    { id: "yellow-taxi", label: "yellow taxi", src: "./traffic_tap_images/car_1.png" }
  ];

  const BONUS_RIVALS = VEHICLES;
  const DEFAULT_VEHICLE = VEHICLES[0];
  const RAINBOW_BUS = {
    id: "rainbow-bus",
    label: "rainbow bus",
    src: "./traffic_tap_images/car_rainbow_bonus.svg",
    isRainbowBonus: true,
    bonusPoints: 10
  };
  const BONUS_TRUCK_ASSETS = {
    front: "./traffic_tap_images/car_truck_front.svg",
    trailer: "./traffic_tap_images/car_truck_trailer.svg",
    wheels: "./traffic_tap_images/car_truck_wheels.svg"
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

  function vehicleLabel(vehicle) {
    if (typeof vehicle === "string") return vehicle;
    return vehicle?.label || "vehicle";
  }

  function vehicleImgHtml(vehicle, className = "tt-car-img") {
    const v = vehicle || DEFAULT_VEHICLE;

    if (typeof v === "string") {
      return `<span class="${className}">${escapeHtml(v)}</span>`;
    }

    return `<img class="${className}" src="${escapeHtml(v.src)}" alt="" draggable="false">`;
  }

  function sameVehicle(a, b) {
    if (!a || !b) return false;
    if (typeof a === "string" || typeof b === "string") return a === b;
    return a.id === b.id;
  }

  function trafficTapImageSources() {
    const vehicleSources = VEHICLES
      .map(vehicle => typeof vehicle === "string" ? "" : vehicle.src)
      .filter(Boolean);

    return [...new Set([
      ...vehicleSources,
      RAINBOW_BUS.src,
      BONUS_TRUCK_ASSETS.front,
      BONUS_TRUCK_ASSETS.trailer,
      BONUS_TRUCK_ASSETS.wheels
    ].filter(Boolean))];
  }

  function preloadTrafficTapImage(src) {
    if (!src) return Promise.resolve(null);

    const cached = trafficTapImageCache.get(src);
    if (cached) return cached.promise;

    const img = new Image();

    const promise = new Promise(resolve => {
      img.onload = () => resolve({ src, ok: true });
      img.onerror = () => {
        console.warn("Could not preload Traffic Tap image", src);
        resolve({ src, ok: false });
      };
    });

    img.decoding = "async";
    img.src = src;

    trafficTapImageCache.set(src, { img, promise });

    return promise;
  }

  function preloadTrafficTapImages() {
    if (trafficTapImagePreloadPromise) return trafficTapImagePreloadPromise;

    trafficTapImagePreloadPromise = Promise.all(
      trafficTapImageSources().map(preloadTrafficTapImage)
    ).catch(err => {
      console.warn("Could not preload all Traffic Tap images", err);
      return [];
    });

    return trafficTapImagePreloadPromise;
  }

  const DECOY_CLASSES = ["is-deco1", "is-deco2", "is-deco3", "is-deco4", "is-deco5"];
  const SPAWN_PATTERNS = [
    ["upper"],
    ["lower"],
    ["upper", "lower"],
    ["lower", "upper"],
    ["upper", "upper", "lower"],
    ["lower", "lower", "upper"]
  ];

  const CRASH_SCALE = 1.75;
  const BONUS_SUCCESS_SCALE = 1.25;
  const SUCCESS_LAUNCH_SPEED = 1100;

  const CRASH_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;

  let selectedMode = null;
  let muted = false;
  let audioCtx = null;
  let masterGain = null;
  let silenceAudioEl = null;
  let zoomAudioBuffer = null;
  let zoomAudioLoadPromise = null;
  let trafficTapImagePreloadPromise = null;
  const trafficTapImageCache = new Map();
  let uiSoundFlip = false;
  let lastUiSoundAt = 0;
  const uiSoundBuffers = new Map();
  const uiSoundBufferPromises = new Map();
  let audioUnlocked = false;
  let completionMarked = false;
  let alreadyCompletedForMode = false;
  let completionResult = null;
  let resizeBound = false;
  let endScreenUnlockTimer = 0;
  let itemsClickBound = false;

  const verseMeta = parseVerseMeta(ctx.verseId || "", ctx.verseRef || "");
  const buildData = window.VerseGameShell.buildVerseSegments({
    verseText: ctx.verseText || "",
    book: verseMeta.book,
    reference: verseMeta.reference,
    buildArea: BUILD_AREA
  });

  const verseWords = buildData.words;

  const state = {
    running: false,
    paused: false,
    pauseReason: "",
    lastTs: 0,
    rafId: 0,
    fieldWidth: 0,
    fieldHeight: 0,
    roadHeight: 0,
    gapHeight: 0,
    mainDone: false,
    bonusRound: false,
    bonusIntro: false,
    bonusIntroUntil: 0,
    buildPopUntil: 0,
    buildShakeUntil: 0,
    overlayMessage: "",
    overlayUntil: 0,
    buildSizeClass: buildData.buildSizeClass,
    buildFitDone: false,
    phase: "words",
    wordsBuilt: 0,
    bookBuilt: false,
    referenceBuilt: false,
    mainItems: [],
    nextItemId: 1,
    lastSpawnAt: 0,
    nextSpawnDelay: 860,
    totalSpawned: 0,
    lastCorrectSpawnAt: 0,
    roadCrashUntil: [0, 0],
    effectPopups: [],
    recentCorrectConverted: false,
    bonusTargetEmoji: "",
    bonusTargetLabel: "",
    bonusTimeLeft: 0,
    bonusEndsAt: 0,
    bonusScore: 0,
    bonusCorrectHits: 0,
    bonusWrongHits: 0,
    bonusStreak: 0,
    bonusBestStreak: 0,
    bonusItems: [],
    bonusNextSpawnAt: 0,
    bonusRoundDuration: 20000,
    rainbowBusSpawned: false,
    rainbowBusTapped: false,
    rainbowBusSpawnAt: 0,
    rainbowJackpotStopUntil: 0,
    bonusIntroTarget: "",
    bonusTruckX: 0,
    bonusTruckWidth: 0,
    bonusTruckSpeed: 0,
    bonusTruckMode: "",
    bonusTruckPending: false,
    bonusClearStartedAt: 0,
    debugHitboxes: false,
    bonusEnding: false,
    bonusEndingUntil: 0,
    bonusStopSpawn: false,
    bonusShowScore: false,
    awaitingBonusStart: false,
    awaitingBonusItemId: 0
  };

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

  function getZoomVolume() {
    return clamp(getSoundVolume("zoomLaunch"), 0, 1);
  }

  function loadZoomAudioBuffer() {
    if (zoomAudioBuffer) return Promise.resolve(zoomAudioBuffer);
    if (zoomAudioLoadPromise) return zoomAudioLoadPromise;

    const ctx = ensureAudioContext();
    if (!ctx) return Promise.resolve(null);

    zoomAudioLoadPromise = fetch(ZOOM_AUDIO_FILE)
      .then(response => {
        if (!response.ok) throw new Error(`Could not load ${ZOOM_AUDIO_FILE}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
      .then(buffer => {
        zoomAudioBuffer = buffer;
        return buffer;
      })
      .catch(err => {
        console.warn("Could not decode Traffic Tap zoom sound", err);
        zoomAudioLoadPromise = null;
        return null;
      });

    return zoomAudioLoadPromise;
  }

  function primeZoomAudio() {
    loadZoomAudioBuffer();
  }

  function playZoomSound() {
    if (muted) return;

    unlockAudio();

    try {
      const volume = getZoomVolume();
      if (volume <= 0) return;

      const ctx = ensureAudioContext();
      if (!ctx || !masterGain) return;

      if (!zoomAudioBuffer) {
        loadZoomAudioBuffer();
        return;
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = zoomAudioBuffer;
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(masterGain);

      source.start(ctx.currentTime);
    } catch (err) {
      // Sound should never break gameplay.
    }
  }

  function loadUiSoundBuffer(key) {
    if (uiSoundBuffers.has(key)) return Promise.resolve(uiSoundBuffers.get(key));
    if (uiSoundBufferPromises.has(key)) return uiSoundBufferPromises.get(key);

    const ctx = ensureAudioContext();
    const src = UI_SOUND_FILES[key];

    if (!ctx || !src) return Promise.resolve(null);

    const promise = fetch(src)
      .then(response => {
        if (!response.ok) throw new Error(`Could not load ${src}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
      .then(buffer => {
        uiSoundBuffers.set(key, buffer);
        return buffer;
      })
      .catch(err => {
        console.warn("Could not decode Traffic Tap UI sound", err);
        return null;
      })
      .finally(() => {
        uiSoundBufferPromises.delete(key);
      });

    uiSoundBufferPromises.set(key, promise);
    return promise;
  }

  function preloadUiSoundBuffers() {
    Object.keys(UI_SOUND_FILES).forEach(loadUiSoundBuffer);
  }

  async function playUiBufferSound(key, volumeKey = "uiTap") {
    if (muted) return;

    try {
      const ctx = ensureAudioContext();
      if (!ctx || !masterGain) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const buffer = await loadUiSoundBuffer(key);
      if (!buffer) return;

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      gain.gain.setValueAtTime(clamp(getSoundVolume(volumeKey), 0, 1), ctx.currentTime);

      source.connect(gain);
      gain.connect(masterGain);

      source.start(ctx.currentTime);
    } catch (err) {
      // UI sound should never break navigation.
    }
  }

  function playUiTapSound() {
    if (muted) return;

    const now = performance.now();
    if (now - lastUiSoundAt < 80) return;
    lastUiSoundAt = now;

    unlockAudio();

    const key = uiSoundFlip ? "uiTap2" : "uiTap1";
    uiSoundFlip = !uiSoundFlip;
    playUiBufferSound(key, "uiTap");
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
    primeZoomAudio();
    preloadUiSoundBuffers();

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

    for (let i = 0; i < length; i += 1) {
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

  const TT_TUNE_TEMPO = 0.65;

  const TT_TUNE_NOTES = {
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    G5: 783.99,
    A5: 880.00,
    C6: 1046.50,
    E6: 1318.51
  };

  const TT_TUNES = {
    truckIntro: [
      ["D5", 0, 0.05, 0.045],
      ["E5", 0.055, 0.05, 0.045],
      ["G5", 0.11, 0.1, 0.05]
    ],
    truckOutro: [
      ["C6", 0, 0.07, 0.045],
      ["G5", 0.06, 0.07, 0.045],
      ["E6", 0.13, 0.13, 0.05]
    ],
    rainbowJackpot: [
      ["G5", 0, 0.06, 0.04],
      ["C6", 0.055, 0.07, 0.045],
      ["E6", 0.12, 0.09, 0.045],
      ["C6", 0.23, 0.16, 0.05]
    ]
  };

  const BONUS_TAP_MELODY = [
    ["C5", "E5"],
    ["D5", "G5"],
    ["E5", "A5"],
    ["G5", "C6"],
    ["A5", "E6"],
    ["G5", "C6"],
    ["E5", "A5"],
    ["D5", "G5"]
  ];

  function playTuneNote(eventId, noteName, start, duration, gain, wave = "sine") {
    const freq = TT_TUNE_NOTES[noteName] || TT_TUNE_NOTES.C5;
    playOsc(eventId, wave, freq, start, duration, gain, freq * 1.015);
  }

  function playTune(eventId, tuneName, t) {
    const tune = TT_TUNES[tuneName];
    if (!tune) return;

    tune.forEach((note, index) => {
      const [noteName, offset, duration, gain] = note;
      const wave = index % 3 === 1 ? "triangle" : "sine";

      playTuneNote(
        eventId,
        noteName,
        t + offset / TT_TUNE_TEMPO,
        duration / TT_TUNE_TEMPO,
        gain,
        wave
      );
    });
  }

  function soundCorrectTap(t) {
    playOsc("correctTap", "triangle", 659, t, 0.09, 0.30, 784);
  }

  function soundWrongTap(t) {
    playOsc("wrongTap", "triangle", 220, t, 0.08, 0.10, 170);
    playOsc("wrongTap", "triangle", 170, t + 0.07, 0.09, 0.07);
  }

  function soundBonusTap(t) {
    const melodyIndex = Math.max(0, state.bonusStreak - 1) % BONUS_TAP_MELODY.length;
    const [noteA, noteB] = BONUS_TAP_MELODY[melodyIndex];

    playTuneNote("bonusTap", noteA, t, 0.055, 0.075, "sine");
    playTuneNote("bonusTap", noteB, t + 0.045, 0.075, 0.06, "triangle");
  }

  function soundRainbowJackpot(t) {
    playTune("rainbowJackpot", "rainbowJackpot", t);
  }

  function soundTruckIntro(t) {
    playTune("truckIntro", "truckIntro", t);
  }

  function soundTruckOutro(t) {
    playTune("truckOutro", "truckOutro", t);
  }

  const SOUND_PLAYERS = {
    correctTap: soundCorrectTap,
    wrongTap: soundWrongTap,
    bonusTap: soundBonusTap,
    rainbowJackpot: soundRainbowJackpot,
    truckIntro: soundTruckIntro,
    truckOutro: soundTruckOutro
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

  preloadTrafficTapImages();
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
      onBack: () => window.VerseGameBridge.exitGame(),
      onStart: () => {
        preloadTrafficTapImages();
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
      backLabel: "Back to Traffic Tap title",
      onBack: () => {
        playUiTapSound();
        renderIntro();
      },
      onSelect: (mode) => {
        preloadTrafficTapImages();
        unlockAudio();
        playUiTapSound();
        startGame(mode);
      }
    });
  }

  function startGame(mode) {
    selectedMode = mode;
    itemsClickBound = false;
    completionMarked = false;
    completionResult = null;
    alreadyCompletedForMode = !!window.VerseGameBridge.wasAlreadyCompleted?.(ctx.verseId, GAME_ID, selectedMode);

    state.running = true;
    state.paused = false;
    state.pauseReason = "";
    state.lastTs = 0;
    state.mainDone = false;
    state.bonusRound = false;
    state.bonusIntro = false;
    state.bonusIntroUntil = 0;
    state.buildPopUntil = 0;
    state.buildShakeUntil = 0;
    state.buildFitDone = false;
    state.overlayMessage = "";
    state.overlayUntil = 0;
    state.wordsBuilt = 0;
    state.bookBuilt = false;
    state.referenceBuilt = false;
    updatePhaseFromProgress();
    state.mainItems = [];
    state.nextItemId = 1;
    state.lastSpawnAt = 0;
    state.nextSpawnDelay = randomSpawnDelay();
    state.totalSpawned = 0;
    state.lastCorrectSpawnAt = 0;
    state.roadCrashUntil = [0, 0];
    state.effectPopups = [];
    state.recentCorrectConverted = false;
    state.bonusTargetEmoji = "";
    state.bonusTargetLabel = "";
    state.bonusTimeLeft = 0;
    state.bonusEndsAt = 0;
    state.bonusScore = 0;
    state.bonusCorrectHits = 0;
    state.bonusWrongHits = 0;
    state.bonusStreak = 0;
    state.bonusBestStreak = 0;
    state.bonusItems = [];
    state.bonusNextSpawnAt = 0;
    state.bonusRoundDuration = 20000;
    state.rainbowBusSpawned = false;
    state.rainbowBusTapped = false;
    state.rainbowBusSpawnAt = 0;
    state.rainbowJackpotStopUntil = 0;
    state.bonusIntroTarget = "";
    state.bonusTruckX = 0;
    state.bonusTruckWidth = 0;
    state.bonusTruckSpeed = 0;
    state.bonusTruckMode = "";
    state.bonusTruckPending = false;
    state.bonusClearStartedAt = 0;
    state.bonusShowScore = false;
    state.bonusEnding = false;
    state.bonusEndingUntil = 0;
    state.bonusStopSpawn = false;
    state.awaitingBonusStart = false;
    state.awaitingBonusItemId = 0;

    itemsClickBound = false;

    app.innerHTML = `
    <div class="tt-shell">
      <div class="tt-stage">
        <div class="tt-build-wrap">
          <div class="tt-build vm-build vm-build--${BUILD_AREA}" id="ttBuild">
            <div class="tt-build-text vm-build-text ${state.buildSizeClass}" id="ttBuildText"></div>
          </div>
        </div>
        <div class="tt-field-wrap">
          <div class="tt-field" id="ttField">
            <div class="tt-roads" id="ttRoads"></div>
            <div class="tt-road-mark-layer" id="ttRoadMarks"></div>
            <div class="tt-items-layer" id="ttItemsLayer"></div>
            <div class="tt-effects-layer" id="ttEffectsLayer"></div>
            <div class="tt-bonus-layer" id="ttBonusLayer"></div>
            <div class="tt-overlay-msg" id="ttOverlay"></div>
            <div class="tt-bonus-intro-overlay" id="ttBonusIntroOverlay" aria-hidden="true">
              <div class="tt-bonus-intro-burst"></div>
              <div class="tt-bonus-intro-content">
                <div class="tt-bonus-intro-title">BONUS ROUND!</div>
                <div class="tt-bonus-intro-targetline">
                  <span class="tt-bonus-intro-bullseye">🎯</span>
                  <span class="tt-bonus-intro-equals">=</span>
                  <span class="tt-bonus-intro-target" id="ttBonusIntroTarget">${vehicleImgHtml(DEFAULT_VEHICLE, "tt-bonus-target-img")}</span>
                </div>
              </div>
            </div>
            <div class="tt-controls-layer">
              <button class="tt-corner-pill tt-corner-left" id="ttMenuPill" type="button" aria-label="Game menu">☰</button>
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
    applyDebugHitboxes();
    renderHud();
    startLoop();
  }

  async function completeGameAndRenderEndScreen() {
    let reward = null;

    if (!completionMarked && ctx?.verseId && GAME_ID && selectedMode) {
      completionMarked = true;

      try {
        completionResult = await window.VerseGameBridge.completeGameRun({
          verseId: ctx.verseId,
          gameId: GAME_ID,
          mode: selectedMode,
          stats: {
            bonusScore: state.bonusScore,
            bonusCorrectHits: state.bonusCorrectHits,
            bonusWrongHits: state.bonusWrongHits,
            bonusBestStreak: state.bonusBestStreak
          }
        });

        reward = completionResult.reward;
      } catch (err) {
        console.warn("Could not complete Traffic Tap run", err);

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
      gameMessage: `Bonus score: ${state.bonusScore}`,
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
      id: "ttGameMenuOverlay",
      title: "Game Menu",
      muted,
      showModeSelect: true
    });
  }

  function helpHtml() {
    return `Add the next word to the verse by tapping its car.<br><br>
Continue until the verse is finished.<br><br>
In the bonus round, tap as many of the target vehicle as you can.`;
  }

  function wireCommonNav() {
    window.VerseGameShell.wireGameMenu({
      id: "ttGameMenuOverlay",
      menuButtonId: "ttMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (!muted) {
          unlockAudio();
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
        renderModeSelect();
      },
      onExit: () => {
        playUiTapSound();
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

  function toggleMute(muteBtn, menuMuteBtn) {
    muted = !muted;
    if (!muted) {
      unlockAudio();
      playUiTapSound();
    }
    if (muteBtn) muteBtn.textContent = muted ? "🔇" : "🔊";
    if (menuMuteBtn) menuMuteBtn.textContent = muted ? "Unmute" : "Mute";
  }

  function wireGameInput() {
    if (!resizeBound) {
      window.addEventListener("resize", recalcField);
      resizeBound = true;
    }

    const menuPill = document.getElementById("ttMenuPill");
    if (menuPill) {
      const open = (e) => {
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }
        playUiTapSound();
        openGameMenu();
      };
      menuPill.onclick = open;
      menuPill.onpointerdown = open;
      menuPill.ontouchstart = open;
    }


    const itemsLayer = document.getElementById("ttItemsLayer");
    if (itemsLayer && !itemsClickBound) {
      const activateHit = (e) => {
        const hit = e.target.closest(".tt-hit-btn");
        if (!hit) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        unlockAudio();
        const id = Number(hit.dataset.itemId);
        if (!Number.isFinite(id)) return;
        if (state.bonusRound) chooseBonusItem(id, hit);
        else chooseMainItem(id, hit);
      };
      itemsLayer.addEventListener("pointerdown", activateHit);
      itemsClickBound = true;
    }

    window.onkeydown = (e) => {

      if (e.key === "d" || e.key === "D") {
        state.debugHitboxes = !state.debugHitboxes;
        applyDebugHitboxes();
        return;
      }

      if (e.key === "Escape" && state.running) {
        if (document.getElementById("ttGameMenuOverlay")?.classList.contains("is-open")) closeGameMenu();
        else openGameMenu();
      }
      if (!state.bonusRound) return;
    };
  }

  function openGameMenu() {
    const overlay = document.getElementById("ttGameMenuOverlay");
    if (overlay) {
      setPaused(true, "menu");
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeGameMenu() {
    const overlay = document.getElementById("ttGameMenuOverlay");

    if (overlay && overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    if (overlay) {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }

    const helpOverlay = document.getElementById("ttHelpOverlay");
    if (!helpOverlay || !helpOverlay.classList.contains("is-open")) setPaused(false, "");
  }

  function openHelpFromMenu() {
    const menuOverlay = document.getElementById("ttGameMenuOverlay");

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

    const menuOverlay = document.getElementById("ttGameMenuOverlay");
    if (menuOverlay) menuOverlay.classList.add("is-open");

    setPaused(true, "menu");
  }

  function setPaused(paused, reason = "") {
    state.paused = paused;
    state.pauseReason = paused ? reason : "";

    const field = document.getElementById("ttField");
    if (field) {
      field.classList.toggle("is-paused", !!paused);
    }

    if (!paused) state.lastTs = performance.now();
  }

  function recalcField() {
    const field = document.getElementById("ttField");
    if (!field) return;
    const rect = field.getBoundingClientRect();
    state.fieldWidth = rect.width;
    state.fieldHeight = rect.height;
    state.gapHeight = clamp(rect.height * 0.06, 12, 28);
    state.roadHeight = Math.max(110, (rect.height - state.gapHeight) / 2);
    renderHud();
  }

  function renderHud() {
    renderBuildArea();
    renderField();
  }

  function getLinearProgressIndex() {
    return (
      state.wordsBuilt +
      (state.bookBuilt ? 1 : 0) +
      (state.referenceBuilt ? 1 : 0)
    );
  }

  function updatePhaseFromProgress() {
    state.phase = window.VerseGameShell.getPhaseForProgress({
      progressIndex: getLinearProgressIndex(),
      wordCount: verseWords.length,
      totalSegments: buildData.segments.length,
      bookLabel: verseMeta.book,
      referenceLabel: verseMeta.reference
    });
  }

  function renderBuildArea() {
    const build = document.getElementById("ttBuild");
    const text = document.getElementById("ttBuildText");
    if (!build || !text) return;

    const now = performance.now();
    build.classList.toggle("is-shake", state.buildShakeUntil > now);
    build.classList.toggle("is-pop", state.buildPopUntil > now);

    if (state.bonusShowScore) {
      clearBuildTextFit(text);
      text.className = "tt-build-text vm-build-text";
      text.innerHTML = `
      <div class="tt-bonus-build">
        <div class="tt-bonus-build-copy">Bonus Complete!</div>
        <div class="tt-bonus-build-score is-results">
          <span>Score: ${state.bonusScore}</span>
          <span>Correct: ${state.bonusCorrectHits}</span>
          <span>Best Streak: ${state.bonusBestStreak}</span>
        </div>
      </div>
    `;
      return;
    }

    if (state.bonusRound) {
      clearBuildTextFit(text);
      text.className = "tt-build-text vm-build-text";
      text.innerHTML = `
      <div class="tt-bonus-build">
        <div class="tt-bonus-score-hud">
          <span class="tt-bonus-score-target">${vehicleImgHtml(state.bonusTargetEmoji || DEFAULT_VEHICLE, "tt-bonus-target-img")}</span>
          <span class="tt-bonus-score-times">×</span>
          <span class="tt-bonus-score-badge">${state.bonusScore}</span>
        </div>
      </div>
    `;
      return;
    }



    const buildRender = window.VerseGameShell.renderBuildProgressHtml({
      verseText: ctx.verseText || "",
      book: verseMeta.book,
      reference: verseMeta.reference,
      progressIndex: getLinearProgressIndex(),
      buildArea: BUILD_AREA,
      hideUnbuilt: selectedMode === "hard",
      extraClass: "tt-build-text"
    });

    text.className = buildRender.className;
    text.innerHTML = buildRender.html;

    fitTrafficBuildText();

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

  function fitTrafficBuildText() {
    if (state.buildFitDone) return;

    requestAnimationFrame(() => {
      const build = document.getElementById("ttBuild");
      const text = document.getElementById("ttBuildText");

      if (!build || !text) return;
      if (state.bonusRound || state.bonusShowScore) return;

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

  function renderField() {
    renderRoads();
    renderItems();
    renderEffects();
    renderBonus();
    renderOverlays();
  }

  function renderRoads() {
    const roads = document.getElementById("ttRoads");
    const marks = document.getElementById("ttRoadMarks");
    if (!roads || !marks) return;

    const top = 0;
    const bottom = state.roadHeight + state.gapHeight;
    roads.innerHTML = `
    <div class="tt-road top ${state.roadCrashUntil[0] > performance.now() ? "is-crashing" : ""}" style="top:${top}px;height:${state.roadHeight}px"></div>
    <div class="tt-road bottom ${state.roadCrashUntil[1] > performance.now() ? "is-crashing" : ""}" style="top:${bottom}px;height:${state.roadHeight}px"></div>
  `;
    marks.innerHTML = `
    <div class="tt-road top" style="top:${top}px;height:${state.roadHeight}px"><div class="tt-road-center-line"></div></div>
    <div class="tt-road bottom" style="top:${bottom}px;height:${state.roadHeight}px"><div class="tt-road-center-line"></div></div>
  `;
  }

  function renderItems() {
    const layer = document.getElementById("ttItemsLayer");
    if (!layer) return;
    if (state.bonusRound) {
      const html = state.bonusItems.map(item => {
        const y = roadTopY(item.road);
        const cls = [
          "tt-item",
          item.direction > 0 ? "is-flipped" : "",
          item.removeAt ? "is-crashing" : "",
          state.bonusEnding ? "is-exiting" : ""
        ];
        const unitCls = ["tt-unit"];
        if (item.flashWrongUntil > performance.now()) unitCls.push("is-wrong");
        if (item.vanishUntil > performance.now()) unitCls.push("is-vanish");

        return `
        <div class="${cls.filter(Boolean).join(" ")}" style="transform:translate3d(${item.x}px, ${y}px, 0);--tt-item-w:${item.width}px;--tt-item-h:${item.height}px;--tt-car-size:${item.carSize}px;--tt-car-hit-h:${item.carHitHeight}px;--tt-car-center-y:${item.slot === "lower" ? 72 : 24}%;--tt-item-tilt:0deg;">
          <div class="${unitCls.join(" ")}">
            <button type="button" class="tt-car-btn tt-hit-btn" data-item-id="${item.id}" aria-label="${escapeHtml(vehicleLabel(item.vehicle))}">${vehicleImgHtml(item.vehicle)}</button>
          </div>
        </div>
      `;
      }).join("");

      layer.innerHTML = html;
      return;
    }

    const html = state.mainItems.map(item => {
      const y = roadTopY(item.road);
      const cls = ["tt-item", item.direction > 0 ? "is-flipped" : "", item.crashing ? "is-crashing" : ""];
      const unitCls = ["tt-unit"];
      if (item.flashWrongUntil > performance.now()) unitCls.push("is-wrong");
      if (item.swerveUntil > performance.now()) unitCls.push("is-swerve");
      if (item.vanishUntil > performance.now()) unitCls.push("is-vanish");
      if (item.bonkUntil > performance.now()) unitCls.push("is-bonk");
      const now = performance.now();

      let rideBob = 0;
      let rideScaleX = 1;
      let rideScaleY = 1;

      if (!item.launching && !item.crashing && !(item.vanishUntil > now)) {
        const cycleMs = 1680;
        const t = (((now + (item.bounceOffset * cycleMs)) % cycleMs) / cycleMs);

        if (t < 0.12) {
          const p = t / 0.12;
          rideBob = 5 * p;
          rideScaleX = 1 + (0.03 * p);
          rideScaleY = 1 - (0.05 * p);
        } else if (t < 0.24) {
          const p = (t - 0.12) / 0.12;
          rideBob = 5 - (4 * p);
          rideScaleX = 1.03 - (0.035 * p);
          rideScaleY = 0.95 + (0.055 * p);
        } else if (t < 0.36) {
          const p = (t - 0.24) / 0.12;
          rideBob = 1 + (3 * p);
          rideScaleX = 0.995 + (0.025 * p);
          rideScaleY = 1.005 - (0.035 * p);
        } else if (t < 0.48) {
          const p = (t - 0.36) / 0.12;
          rideBob = 4 - (4 * p);
          rideScaleX = 1.02 - (0.02 * p);
          rideScaleY = 0.97 + (0.03 * p);
        } else if (t < 0.60) {
          const p = (t - 0.48) / 0.12;
          rideBob = 5 * p;
          rideScaleX = 1 + (0.03 * p);
          rideScaleY = 1 - (0.05 * p);
        } else if (t < 0.72) {
          const p = (t - 0.60) / 0.12;
          rideBob = 5 - (4 * p);
          rideScaleX = 1.03 - (0.035 * p);
          rideScaleY = 0.95 + (0.055 * p);
        } else if (t < 0.84) {
          const p = (t - 0.72) / 0.12;
          rideBob = 1 + (3 * p);
          rideScaleX = 0.995 + (0.025 * p);
          rideScaleY = 1.005 - (0.035 * p);
        } else {
          const p = (t - 0.84) / 0.16;
          rideBob = 4 - (4 * p);
          rideScaleX = 1.02 - (0.02 * p);
          rideScaleY = 0.97 + (0.03 * p);
        }
      }
      const tilt = item.tilt || 0;

      let launchScaleX = 1;
      let launchScaleY = 1;

      if (item.launching && now < item.launchPhaseUntil) {
        const total = Math.max(1, item.launchPhaseUntil - item.launchStartAt);
        const t = clamp((now - item.launchStartAt) / total, 0, 1);

        if (t < 0.45) {
          const p = t / 0.45;
          launchScaleX = 1 - (0.22 * p);
          launchScaleY = 1 + (0.22 * p);
        } else {
          const p = (t - 0.45) / 0.55;
          launchScaleX = 0.78 + (0.28 * p);
          launchScaleY = 1.22 - (0.28 * p);
        }
      }

      return `
      <div class="${cls.filter(Boolean).join(" ")}" style="transform:translate3d(${item.x}px, ${y + rideBob}px, 0);--tt-item-w:${item.width}px;--tt-item-h:${item.height}px;--tt-word-w:${item.wordWidth}px;--tt-word-h:${item.wordHeight}px;--tt-word-size:${item.wordFont}px;--tt-car-size:${item.carSize}px;--tt-car-hit-h:${item.carHitHeight}px;--tt-car-center-y:${item.carCenterY}%;--tt-word-center-y:${item.wordCenterY}%;--tt-item-tilt:${tilt}deg;">
        <div class="${unitCls.join(" ")}" style="--tt-launch-scale-x:${(launchScaleX * rideScaleX).toFixed(4)};--tt-launch-scale-y:${(launchScaleY * rideScaleY).toFixed(4)};">
          <button type="button" class="tt-car-btn tt-hit-btn" data-item-id="${item.id}" aria-label="${escapeHtml(`${vehicleLabel(item.vehicle)}: ${item.label}`)}">${vehicleImgHtml(item.vehicle)}</button>
          <button type="button" class="tt-word-btn tt-hit-btn ${item.launching ? "is-launch-fade" : ""}" data-item-id="${item.id}" aria-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>
        </div>
      </div>
    `;
    }).join("");

    layer.innerHTML = html;
  }

  function renderEffects() {
    const layer = document.getElementById("ttEffectsLayer");
    if (!layer) return;

    layer.querySelectorAll(".tt-popup").forEach((node) => node.remove());

    for (const pop of state.effectPopups) {
      const el = document.createElement("div");
      el.className = `tt-popup ${pop.good ? "good" : "bad"}`;
      el.style.left = `${pop.x}px`;
      el.style.top = `${pop.y}px`;
      el.textContent = pop.text;
      layer.appendChild(el);
    }
  }

  function crashBurstOptionsForItem(item) {
    const carH = Math.max(46, item?.carHitHeight || item?.carSize || 70);
    const scale = CRASH_SCALE;

    return {
      count: 9,
      distance: Math.round(carH * 0.70 * scale),
      jitter: Math.round(carH * 0.07 * scale),
      duration: 650,
      cloudSize: Math.round(carH * 0.90 * scale),
      sizePool: [
        Math.round(carH * 0.10 * scale),
        Math.round(carH * 0.12 * scale),
        Math.round(carH * 0.14 * scale),
        Math.round(carH * 0.17 * scale),
        Math.round(carH * 0.20 * scale)
      ],
      showCloud: true
    };
  }

  function spawnCrashBurst(x, y, opts = {}) {
    const layer = document.getElementById("ttEffectsLayer");
    if (!layer) return;

    const count = opts.count ?? 9;
    const distance = opts.distance ?? 58;
    const jitter = opts.jitter ?? 5;
    const duration = opts.duration ?? 650;
    const cloudSize = opts.cloudSize ?? 74;
    const sizePool = opts.sizePool ?? [8, 9, 10, 12, 15, 18];
    const colors = opts.colors ?? ["#ffffff"];
    const showCloud = opts.showCloud ?? true;

    const burst = document.createElement("div");
    burst.className = "tt-crash-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;

    const burstBoxSize = Math.max(132, Math.ceil((distance + cloudSize) * 2.05));
    burst.style.width = `${burstBoxSize}px`;
    burst.style.height = `${burstBoxSize}px`;

    let cloud = null;
    if (showCloud) {
      cloud = document.createElement("div");
      cloud.className = "tt-crash-burst-cloud";
      cloud.style.setProperty("--tt-crash-cloud-size", `${cloudSize}px`);
      cloud.style.setProperty("--tt-crash-cloud-dur", `${Math.max(520, duration - 90)}ms`);
      cloud.innerHTML = CRASH_CLOUD_SVG;
      burst.appendChild(cloud);
    }

    const baseAngle = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + step * i + rand(-0.12, 0.12);
      const dist = distance + rand(-jitter, jitter);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const size = pickRandom(sizePool) + rand(-0.5, 0.5);
      const grow = rand(1.02, 1.14);
      const color = colors[i % colors.length];

      const particle = document.createElement("div");
      particle.className = "tt-crash-particle";
      particle.style.setProperty("--tt-size", `${size.toFixed(1)}px`);
      particle.style.setProperty("--tt-dur", `${duration}ms`);
      particle.style.setProperty("--tt-start-scale", `${rand(0.68, 0.82).toFixed(2)}`);
      particle.style.setProperty("--tt-end-scale", `${(grow + 0.08).toFixed(2)}`);
      particle.style.setProperty("--tt-tx", `${tx.toFixed(1)}px`);
      particle.style.setProperty("--tt-ty", `${ty.toFixed(1)}px`);
      particle.style.setProperty("--tt-delay", `${Math.round(rand(0, 18))}ms`);
      particle.style.background = color;
      burst.appendChild(particle);
    }

    layer.appendChild(burst);

    requestAnimationFrame(() => {
      if (cloud) cloud.classList.add("is-live");
      burst.querySelectorAll(".tt-crash-particle").forEach((particle) => {
        const delay = Number.parseInt(particle.style.getPropertyValue("--tt-delay"), 10) || 0;
        window.setTimeout(() => {
          particle.classList.add("is-live");
        }, delay);
      });
    });

    window.setTimeout(() => {
      burst.remove();
    }, duration + 120);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnWakePuff(x, y, size = 10) {
    const layer = document.getElementById("ttEffectsLayer");
    if (!layer) return;

    const puff = document.createElement("div");
    puff.className = "tt-wake-puff";
    puff.style.left = `${x}px`;
    puff.style.top = `${y}px`;
    puff.style.width = `${size}px`;
    puff.style.height = `${size}px`;
    puff.style.marginLeft = `${size / -2}px`;
    puff.style.marginTop = `${size / -2}px`;
    layer.appendChild(puff);

    requestAnimationFrame(() => puff.classList.add("is-live"));
    window.setTimeout(() => puff.remove(), 280);
  }

  function boostCarsAheadForSuccessLaunch(tappedItem) {
    const now = performance.now();
    const launchSpeed = tappedItem.launchSpeed || SUCCESS_LAUNCH_SPEED;

    for (const item of state.mainItems) {
      if (item.id === tappedItem.id) continue;
      if (item.road !== tappedItem.road) continue;
      if (item.crashing || item.launching || item.removeAt) continue;

      const isAhead = tappedItem.direction < 0
        ? item.x < tappedItem.x
        : item.x > tappedItem.x;

      if (!isAhead) continue;

      item.vanishUntil = 0;
      item.clearAheadUntil = now + 1400;
      item.clearAheadSpeed = launchSpeed;
      item.speed = launchSpeed;
      item.targetSpeed = launchSpeed;
      item.tilt = item.direction < 0 ? 4 : -4;
    }
  }

  function startSuccessLaunch(item) {
    const now = performance.now();
    const launchSpeed = Math.max(item.speed || item.targetSpeed || item.baseSpeed || 120, SUCCESS_LAUNCH_SPEED);

    item.launching = true;
    item.launchStartAt = now;
    item.launchPhaseUntil = now + 110;
    item.launchTrailUntil = Infinity;
    item.launchTrailNextAt = now + 36;
    item.wordFadeUntil = now + 90;
    item.launchSpeed = launchSpeed;

    item.speed = launchSpeed;
    item.targetSpeed = launchSpeed;

    boostCarsAheadForSuccessLaunch(item);
  }

  function launchTrailPoint(item) {
    const width = item.width || 150;
    const x = item.x + (width / 2) - (item.direction * width * 0.18);
    const y = itemCenter(item).y + rand(-4, 4);
    return { x, y };
  }

  function clearMainTrafficForBonus(dt, now) {
    if (!state.bonusClearStartedAt) state.bonusClearStartedAt = now;

    const clearSpeed = Math.max(430, 230 * trafficSpeedMultiplier());

    for (const item of state.mainItems) {
      if (item.removeAt) continue;

      item.crashing = false;
      item.launching = false;
      item.vanishUntil = 0;
      item.flashWrongUntil = 0;
      item.bonkUntil = 0;
      item.swerveUntil = 0;

      item.speed = Math.max(item.speed || item.baseSpeed || 120, clearSpeed);
      item.targetSpeed = item.speed;
      item.x += (item.direction < 0 ? -1 : 1) * item.speed * (dt / 1000);
      item.tilt = item.direction < 0 ? 4 : -4;
    }

    const buffer = 300;
    state.mainItems = state.mainItems.filter(item => {
      if (item.direction < 0 && item.x < -buffer) return false;
      if (item.direction > 0 && item.x > state.fieldWidth + buffer) return false;
      return true;
    });
  }

  function topLaneRightHalfIsClearForBonusTruck() {
    return !state.mainItems.some(item =>
      item.road === 0 &&
      item.x > state.fieldWidth * 0.5 &&
      !item.removeAt
    );
  }

  function bonusTruckMetrics(mode = state.bonusTruckMode || "intro") {
    const metrics = getItemMetrics("car");
    const truckHeight = Math.round(metrics.carSize * 1.5);
    const frontWidth = Math.round(truckHeight * 1.5);
    const trailerVisualHeight = Math.round(truckHeight * 0.69);
    const targetHeight = Math.round(trailerVisualHeight * 0.86);
    const targetWidth = Math.round(targetHeight * 2.15);
    const textWidth = Math.round(targetHeight * 3.15);
    const trailerPadding = Math.round(truckHeight * 1.2);

    const contentWidth = textWidth + targetWidth + trailerPadding;
    const trailerWidth = Math.round(clamp(
      contentWidth,
      380,
      760
    ));

    const overlap = 10;
    const totalWidth = frontWidth + trailerWidth - overlap;
    const road = mode === "outro" ? 1 : 0;
    const y = Math.round(roadTopY(road) + (state.roadHeight * 0.5) - (truckHeight / 2));

    return {
      truckHeight,
      frontWidth,
      trailerWidth,
      targetWidth,
      targetHeight,
      overlap,
      totalWidth,
      y
    };
  }

  function startBonusTruckIntro(now = performance.now()) {
    state.bonusTruckMode = "intro";

    const metrics = bonusTruckMetrics("intro");

    state.bonusIntro = true;
    state.bonusIntroUntil = Infinity;
    state.bonusIntroTarget = pickBonusTargetEmoji();
    state.bonusTruckWidth = metrics.totalWidth;
    state.bonusTruckX = state.fieldWidth + 28;
    state.bonusTruckSpeed = Math.round(clamp(130 * trafficSpeedMultiplier(), 120, 190));
    state.overlayMessage = "";
    state.overlayUntil = 0;

    playGameSound("truckIntro");

    const introTarget = document.getElementById("ttBonusIntroTarget");
    if (introTarget) introTarget.innerHTML = vehicleImgHtml(state.bonusIntroTarget, "tt-bonus-target-img");
  }

  function startBonusTruckOutro(now = performance.now()) {
    state.bonusTruckMode = "outro";

    const metrics = bonusTruckMetrics("outro");

    state.bonusTruckWidth = metrics.totalWidth;
    state.bonusTruckX = state.fieldWidth + 28;
    state.bonusTruckSpeed = Math.round(clamp(130 * trafficSpeedMultiplier(), 120, 190));
    state.overlayMessage = "";
    state.overlayUntil = 0;

    playGameSound("truckOutro");

  }

  function pickBonusTargetEmoji() {
    return pickRandom(VEHICLES);
  }

  function startBonusRound() {
    const now = performance.now();

    state.bonusRound = true;
    state.bonusShowScore = false;
    state.bonusItems = [];
    state.bonusTargetEmoji = state.bonusIntroTarget || pickBonusTargetEmoji();
    state.bonusTargetLabel = vehicleLabel(state.bonusTargetEmoji);
    state.bonusScore = 0;
    state.bonusCorrectHits = 0;
    state.bonusWrongHits = 0;
    state.bonusStreak = 0;
    state.bonusBestStreak = 0;
    state.bonusEndsAt = now + state.bonusRoundDuration;
    state.bonusTimeLeft = state.bonusRoundDuration;
    state.bonusNextSpawnAt = now + 220;
    state.rainbowBusSpawned = false;
    state.rainbowBusTapped = false;
    state.rainbowBusSpawnAt = now + Math.round(clamp(state.bonusRoundDuration * rand(0.35, 0.52), 4500, 10500));
    state.rainbowJackpotStopUntil = 0;
    state.bonusEnding = false;
    state.bonusEndingUntil = 0;
    state.bonusStopSpawn = false;
  }

  function makeBonusItem({ road, slot, vehicle, speed }) {
    const metrics = getItemMetrics("car");
    const direction = road === 0 ? -1 : 1;
    const x = direction < 0 ? state.fieldWidth + metrics.width + 30 : -(metrics.width + 30);

    return {
      id: state.nextItemId++,
      road,
      slot,
      direction,
      x,
      width: metrics.width,
      height: metrics.height,
      carSize: metrics.carSize,
      carHitHeight: metrics.carHitHeight,
      vehicle,
      isTarget: !vehicle?.isRainbowBonus && sameVehicle(vehicle, state.bonusTargetEmoji),
      isRainbowBonus: !!vehicle?.isRainbowBonus,
      bonusPoints: vehicle?.bonusPoints || 1,
      speed,
      vanishUntil: 0,
      flashWrongUntil: 0,
      removeAt: 0
    };
  }

  function bonusSpawnGap() {
    return Math.round(getItemMetrics("car").width * 0.96);
  }


  function spawnRainbowBus(now) {
    if (state.rainbowBusSpawned || state.bonusStopSpawn) return;

    const progress = 1 - (state.bonusTimeLeft / state.bonusRoundDuration);
    const speedBase = 165 + progress * 95;
    const rawSpeed = speedBase + Math.random() * 45;
    const spawnGap = bonusSpawnGap();

    let chosenRoad = Math.random() < 0.5 ? 0 : 1;
    let chosenSlot = Math.random() < 0.5 ? "upper" : "lower";

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const road = Math.random() < 0.5 ? 0 : 1;
      const slot = Math.random() < 0.5 ? "upper" : "lower";

      if (bonusLaneHasSpawnRoom(road, slot, spawnGap)) {
        chosenRoad = road;
        chosenSlot = slot;
        break;
      }
    }

    const speed = cappedBonusSpeed(chosenRoad, chosenSlot, rawSpeed);

    state.bonusItems.push(makeBonusItem({
      road: chosenRoad,
      slot: chosenSlot,
      vehicle: RAINBOW_BUS,
      speed
    }));

    state.rainbowBusSpawned = true;
  }


  function spawnBonusTraffic(now) {
    if (state.bonusStopSpawn) return;

    if (!state.rainbowBusSpawned && (now >= state.rainbowBusSpawnAt || state.bonusTimeLeft <= 8500)) {
      spawnRainbowBus(now);
    }

    if (now < state.bonusNextSpawnAt) return;

    const progress = 1 - (state.bonusTimeLeft / state.bonusRoundDuration);
    const speedBase = 170 + progress * 135;
    const burstCount = Math.random() < 0.72 ? 1 : 2;
    const spawnGap = bonusSpawnGap();
    const usedLaneKeys = new Set();

    for (let i = 0; i < burstCount; i += 1) {
      let chosenRoad = null;
      let chosenSlot = "";

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const road = Math.random() < 0.5 ? 0 : 1;
        const slot = Math.random() < 0.58 ? "upper" : "lower";
        const laneKey = `${road}:${slot}`;

        if (usedLaneKeys.has(laneKey)) continue;
        if (!bonusLaneHasSpawnRoom(road, slot, spawnGap)) continue;

        chosenRoad = road;
        chosenSlot = slot;
        usedLaneKeys.add(laneKey);
        break;
      }

      if (chosenRoad === null) continue;

      const vehicle = Math.random() < 0.38 ? state.bonusTargetEmoji : pickRandom(VEHICLES);
      const rawSpeed = speedBase + Math.random() * 90;
      const speed = cappedBonusSpeed(chosenRoad, chosenSlot, rawSpeed);

      state.bonusItems.push(makeBonusItem({
        road: chosenRoad,
        slot: chosenSlot,
        vehicle,
        speed
      }));
    }

    state.bonusNextSpawnAt = now + (280 - progress * 35) + Math.random() * 130;
  }

  function bonusLaneHasSpawnRoom(road, slot, minGap) {
    const direction = road === 0 ? -1 : 1;
    const metrics = getItemMetrics("car");
    const spawnX = direction < 0 ? state.fieldWidth + metrics.width + 30 : -(metrics.width + 30);

    for (const item of state.bonusItems) {
      if (item.road !== road || item.slot !== slot) continue;
      if (Math.abs(item.x - spawnX) < minGap) return false;
    }
    return true;
  }

  function chooseBonusItem(itemId, tappedEl) {
    const item = state.bonusItems.find(x => x.id === itemId);
    if (!item || item.removeAt || item.vanishUntil) return;

    const layerRect = document.getElementById("ttField")?.getBoundingClientRect();
    const rect = tappedEl.getBoundingClientRect();
    const x = rect.left - layerRect.left + rect.width / 2;
    const y = rect.top - layerRect.top + rect.height / 2;

    if (item.isRainbowBonus) {
      const now = performance.now();
      const points = item.bonusPoints || 10;

      item.vanishUntil = now + 140;
      item.removeAt = now + 150;
      state.rainbowBusTapped = true;
      state.bonusCorrectHits += 1;
      state.bonusStreak += 1;
      state.bonusBestStreak = Math.max(state.bonusBestStreak, state.bonusStreak);
      state.bonusScore += points;
      playGameSound("rainbowJackpot");
      spawnRainbowJackpot(x, y, points);
    } else if (item.isTarget) {
      item.vanishUntil = performance.now() + 140;
      item.removeAt = performance.now() + 150;
      state.bonusCorrectHits += 1;
      state.bonusStreak += 1;
      state.bonusBestStreak = Math.max(state.bonusBestStreak, state.bonusStreak);
      state.bonusScore += 1;
      playGameSound("bonusTap");
      addPopup(x, y, "+1", true);
      spawnBonusSuccessBurst(x, y, item);
    } else {
      const now = performance.now();
      item.flashWrongUntil = now + 260;
      item.vanishUntil = now + 140;
      item.removeAt = now + 150;
      state.bonusWrongHits += 1;
      state.bonusStreak = 0;
      playGameSound("wrongTap");
      addPopup(x, y, "Nope!", false);
      spawnCrashBurst(x, y, crashBurstOptionsForItem(item));
    }
  }

  function spawnRainbowJackpot(x, y, points = 10) {
    const layer = document.getElementById("ttEffectsLayer");
    const field = document.getElementById("ttField");
    if (!layer || !field) return;

    const flash = document.createElement("div");
    flash.className = "tt-rainbow-jackpot-flash";
    field.appendChild(flash);

    const banner = document.createElement("div");
    banner.className = "tt-rainbow-jackpot-banner";
    banner.textContent = `+${points}!`;
    layer.appendChild(banner);

    spawnCrashBurst(x, y, {
      count: 28,
      distance: 112,
      jitter: 18,
      duration: 920,
      cloudSize: 116,
      sizePool: [8, 10, 12, 14, 16, 20, 24],
      colors: ["#ff5252", "#ff9f1c", "#ffe45e", "#59d65f", "#33c3ff", "#6c63ff", "#c55cff"],
      showCloud: false
    });

    window.setTimeout(() => flash.remove(), 760);
    window.setTimeout(() => banner.remove(), 980);
  }

  function cappedBonusSpeed(road, slot, proposedSpeed) {
    const direction = road === 0 ? -1 : 1;
    const sameLane = state.bonusItems.filter(item =>
      item.road === road &&
      item.slot === slot &&
      !item.removeAt
    );

    if (!sameLane.length) return proposedSpeed;

    let nearestAhead = null;

    for (const item of sameLane) {
      const isAhead = direction < 0 ? item.x > state.fieldWidth * 0.5 : item.x < state.fieldWidth * 0.5;
      if (!isAhead) continue;

      if (!nearestAhead) {
        nearestAhead = item;
        continue;
      }

      if (direction < 0) {
        if (item.x < nearestAhead.x) nearestAhead = item;
      } else {
        if (item.x > nearestAhead.x) nearestAhead = item;
      }
    }

    if (!nearestAhead) return proposedSpeed;
    return Math.min(proposedSpeed, Math.max(120, nearestAhead.speed - 18));
  }

  function preventBonusHorizontalOverlap() {
    const lanes = new Map();
    const minGap = bonusSpawnGap();


    for (const item of state.bonusItems) {
      if (item.removeAt) continue;

      const key = `${item.road}:${item.slot}`;
      if (!lanes.has(key)) lanes.set(key, []);
      lanes.get(key).push(item);
    }

    for (const laneItems of lanes.values()) {
      if (laneItems.length < 2) continue;

      const direction = laneItems[0].direction;

      laneItems.sort((a, b) => {
        return direction < 0
          ? a.x - b.x
          : b.x - a.x;
      });

      for (let i = 1; i < laneItems.length; i += 1) {
        const front = laneItems[i - 1];
        const rear = laneItems[i];

        const desiredRearX = direction < 0
          ? front.x + minGap
          : front.x - minGap;

        const isTooClose = direction < 0
          ? rear.x < desiredRearX
          : rear.x > desiredRearX;

        if (!isTooClose) continue;

        rear.x = desiredRearX;
        rear.speed = Math.min(rear.speed, Math.max(115, front.speed - 8));
      }
    }
  }

  function spawnBonusSuccessBurst(x, y, item) {
    const carH = Math.max(46, item?.carHitHeight || item?.carSize || 70);
    const scale = BONUS_SUCCESS_SCALE;

    spawnCrashBurst(x, y, {
      count: 14,
      distance: Math.round(carH * 0.62 * scale),
      jitter: Math.round(carH * 0.08 * scale),
      duration: 520,
      cloudSize: 0,
      sizePool: [
        Math.round(carH * 0.08 * scale),
        Math.round(carH * 0.10 * scale),
        Math.round(carH * 0.12 * scale),
        Math.round(carH * 0.15 * scale),
        Math.round(carH * 0.18 * scale)
      ],
      colors: [
        "#ff5252",
        "#ff9f1c",
        "#ffe45e",
        "#59d65f",
        "#33c3ff",
        "#6c63ff",
        "#c55cff",
        "#ffffff"
      ],
      showCloud: false
    });
  }

  function finishBonusRound() {
    const now = performance.now();

    state.bonusStopSpawn = true;
    state.bonusEnding = true;
    state.bonusEndingUntil = Infinity;
    state.bonusShowScore = false;

    startBonusTruckOutro(now);

    for (const item of state.bonusItems) {
      item.speed = Math.max(item.speed || 0, 520);
      item.vanishUntil = 0;
      item.flashWrongUntil = 0;
    }
  }

  function renderBonus() {
    const layer = document.getElementById("ttBonusLayer");
    if (!layer) return;

    if (!state.bonusIntro && !state.bonusEnding) {
      layer.innerHTML = "";
      return;
    }

    const metrics = bonusTruckMetrics();
    const target = state.bonusIntroTarget || state.bonusTargetEmoji || DEFAULT_VEHICLE;
    const now = performance.now();
    const cycleMs = 1680;
    const t = ((now % cycleMs) / cycleMs);

    let rideBob = 0;
    let rideScaleX = 1;
    let rideScaleY = 1;

    if (t < 0.12) {
      const p = t / 0.12;
      rideBob = 2.5 * p;
      rideScaleX = 1 + (0.012 * p);
      rideScaleY = 1 - (0.018 * p);
    } else if (t < 0.24) {
      const p = (t - 0.12) / 0.12;
      rideBob = 2.5 - (2 * p);
      rideScaleX = 1.012 - (0.014 * p);
      rideScaleY = 0.982 + (0.020 * p);
    } else if (t < 0.36) {
      const p = (t - 0.24) / 0.12;
      rideBob = 0.5 + (1.5 * p);
      rideScaleX = 0.998 + (0.010 * p);
      rideScaleY = 1.002 - (0.014 * p);
    } else if (t < 0.48) {
      const p = (t - 0.36) / 0.12;
      rideBob = 2 - (2 * p);
      rideScaleX = 1.008 - (0.008 * p);
      rideScaleY = 0.988 + (0.012 * p);
    } else if (t < 0.60) {
      const p = (t - 0.48) / 0.12;
      rideBob = 2.5 * p;
      rideScaleX = 1 + (0.012 * p);
      rideScaleY = 1 - (0.018 * p);
    } else if (t < 0.72) {
      const p = (t - 0.60) / 0.12;
      rideBob = 2.5 - (2 * p);
      rideScaleX = 1.012 - (0.014 * p);
      rideScaleY = 0.982 + (0.020 * p);
    } else if (t < 0.84) {
      const p = (t - 0.72) / 0.12;
      rideBob = 0.5 + (1.5 * p);
      rideScaleX = 0.998 + (0.010 * p);
      rideScaleY = 1.002 - (0.014 * p);
    } else {
      const p = (t - 0.84) / 0.16;
      rideBob = 2 - (2 * p);
      rideScaleX = 1.008 - (0.008 * p);
      rideScaleY = 0.988 + (0.012 * p);
    }

    const trailerMessage = state.bonusTruckMode === "outro"
      ? `
        <div class="tt-bonus-trailer-message is-results">
          ${vehicleImgHtml(target, "tt-bonus-trailer-target-img")}
          <span class="tt-bonus-trailer-times">×</span>
          <span class="tt-bonus-trailer-score-badge">${state.bonusScore}</span>
        </div>
      `
      : `
        <div class="tt-bonus-trailer-message">
          <span class="tt-bonus-trailer-text">TAP THIS CAR:</span>
          ${vehicleImgHtml(target, "tt-bonus-trailer-target-img")}
        </div>
      `;

    layer.innerHTML = `
    <div class="tt-bonus-truck" style="transform:translate3d(${state.bonusTruckX}px, ${metrics.y}px, 0); --tt-bonus-truck-h:${metrics.truckHeight}px; --tt-bonus-front-w:${metrics.frontWidth}px; --tt-bonus-trailer-w:${metrics.trailerWidth}px; --tt-bonus-overlap:${metrics.overlap}px; --tt-bonus-target-w:${metrics.targetWidth}px; --tt-bonus-target-h:${metrics.targetHeight}px;">
      <div class="tt-bonus-truck-ride" style="transform:translate3d(0, ${rideBob.toFixed(2)}px, 0) scale(${rideScaleX.toFixed(4)}, ${rideScaleY.toFixed(4)});">
        <img class="tt-bonus-truck-front" src="${escapeHtml(BONUS_TRUCK_ASSETS.front)}" alt="" draggable="false">
        <div class="tt-bonus-trailer-wrap">
          <img class="tt-bonus-trailer-bg" src="${escapeHtml(BONUS_TRUCK_ASSETS.trailer)}" alt="" draggable="false">
          <img class="tt-bonus-trailer-wheels is-left" src="${escapeHtml(BONUS_TRUCK_ASSETS.wheels)}" alt="" draggable="false">
          <img class="tt-bonus-trailer-wheels is-middle" src="${escapeHtml(BONUS_TRUCK_ASSETS.wheels)}" alt="" draggable="false">
          <img class="tt-bonus-trailer-wheels is-right" src="${escapeHtml(BONUS_TRUCK_ASSETS.wheels)}" alt="" draggable="false">
          ${trailerMessage}
        </div>
      </div>
    </div>
  `;
  }

  function renderOverlays() {
    const overlay = document.getElementById("ttOverlay");
    const bonusIntro = document.getElementById("ttBonusIntroOverlay");
    if (!overlay || !bonusIntro) return;

    if (state.overlayUntil > performance.now() && state.overlayMessage) {
      const current = overlay.firstElementChild;
      if (!current || current.textContent !== state.overlayMessage) {
        overlay.innerHTML = `<div class="tt-overlay-pill is-show">${escapeHtml(state.overlayMessage)}</div>`;
      }
    } else {
      overlay.innerHTML = "";
    }

    bonusIntro.classList.toggle("is-open", false);
  }

  function startLoop() {
    stopLoop();
    state.lastTs = 0;
    state.rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  }

  function loop(ts) {
    if (!state.running) {
      state.rafId = 0;
      return;
    }
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(34, ts - state.lastTs);
    state.lastTs = ts;

    if (!state.paused) {
      cleanupTransientEffects(ts);
      if (state.bonusRound) updateBonus(dt, ts);
      else updateMain(dt, ts);
      renderHud();
    }

    state.rafId = requestAnimationFrame(loop);
  }

  function cleanupTransientEffects(now) {
    state.effectPopups = state.effectPopups.filter(p => now < p.until);
    state.bonusItems = state.bonusItems.filter(item => !item.removeAt || now < item.removeAt);
    state.mainItems = state.mainItems.filter(item => !item.removeAt || now < item.removeAt);
  }

  function updateMain(dt, now) {
    if (state.bonusTruckPending) {
      clearMainTrafficForBonus(dt, now);

      if (!state.bonusIntro && topLaneRightHalfIsClearForBonusTruck()) {
        startBonusTruckIntro(now);
      }

      if (!state.bonusIntro) {
        return;
      }
    }

    if (state.bonusIntro) {
      if (state.bonusTruckPending) {
        clearMainTrafficForBonus(dt, now);
      }

      state.bonusTruckX -= state.bonusTruckSpeed * (dt / 1000);

      if (state.bonusTruckX < -(state.bonusTruckWidth + 40)) {
        state.bonusTruckPending = false;
        state.bonusIntro = false;
        state.bonusClearStartedAt = 0;
        state.bonusTruckX = 0;
        state.bonusTruckWidth = 0;
        state.bonusTruckSpeed = 0;
        state.mainItems = [];
        startBonusRound();
      }

      return;
    }

    trafficSpawnTick(now);

    const multiplier = trafficSpeedMultiplier();
    for (const item of state.mainItems) {

      item.speed = item.speed || item.baseSpeed;

      if (item.launching) {
        if (now < item.launchPhaseUntil) {
          item.speed = Math.max(item.baseSpeed || 120, 40);
        } else {
          item.speed = item.launchSpeed || SUCCESS_LAUNCH_SPEED;
          item.targetSpeed = item.speed;
          item.x += (item.direction < 0 ? -1 : 1) * item.speed * (dt / 1000);

          if (now >= item.launchTrailNextAt) {
            const wake = launchTrailPoint(item);
            spawnWakePuff(wake.x, wake.y, rand(8, 14));
            item.launchTrailNextAt = now + rand(28, 42);
          }
        }

        item.tilt = item.direction < 0 ? 10 : -10;

        const offscreen = item.direction < 0
          ? item.x < -(item.width || 150) - 120
          : item.x > state.fieldWidth + (item.width || 150) + 120;

        if (offscreen) {
          item.removeAt = now;
        }

        continue;
      }

      if (item.clearAheadUntil && now < item.clearAheadUntil) {
        item.speed = item.clearAheadSpeed || SUCCESS_LAUNCH_SPEED;
        item.targetSpeed = item.speed;
        item.x += (item.direction < 0 ? -1 : 1) * item.speed * (dt / 1000);
        item.tilt = item.direction < 0 ? 4 : -4;

        const offscreen = item.direction < 0
          ? item.x < -(item.width || 150) - 120
          : item.x > state.fieldWidth + (item.width || 150) + 120;

        if (offscreen) {
          item.removeAt = now;
        }

        continue;
      }

      item.targetSpeed = (item.baseSpeed || 90) * multiplier;
      updateItemSpeed(item, dt);
      if (!item.crashing && !item.vanishUntil) {
        item.x += (item.direction < 0 ? -1 : 1) * item.speed * (dt / 1000);
      }
      item.tilt = (item.targetSpeed - item.speed) * 0.06 * (item.direction < 0 ? -1 : 1);

    }

    const buffer = 240;
    state.mainItems = state.mainItems.filter(item => {
      if (item.removeAt && now >= item.removeAt) return false;
      if (item.direction < 0 && item.x < -buffer) return false;
      if (item.direction > 0 && item.x > state.fieldWidth + buffer) return false;
      return true;
    });

    if (state.awaitingBonusStart) {
      const launchedRefCarStillExists = state.mainItems.some(item => item.id === state.awaitingBonusItemId);
      if (!launchedRefCarStillExists) {
        state.awaitingBonusStart = false;
        state.awaitingBonusItemId = 0;
        finishMainGame();
      }
    }
  }

  function trafficSpawnTick(now) {
    if (!state.fieldWidth) return;

    if (!state.lastSpawnAt) {
      state.lastSpawnAt = now;
      state.nextSpawnDelay = randomSpawnDelay();
      return;
    }

    if (now - state.lastSpawnAt < state.nextSpawnDelay) return;

    const delayUsed = state.nextSpawnDelay;
    const roadOrder = shuffle([0, 1]);
    let spawned = false;

    for (const road of roadOrder) {
      if (!laneHasSpawnRoom(road)) continue;

      spawned = spawnMainItem(road, now, delayUsed);
      if (spawned) break;
    }

    state.lastSpawnAt = now;
    state.nextSpawnDelay = spawned
      ? randomSpawnDelay()
      : mainBlockedSpawnRetryDelay();
  }

  function spawnMainItem(road, now, delayUsed) {
    const correctLabel = currentTargetLabel();
    if (!correctLabel) return false;

    const roadHasCorrect = state.mainItems.some(item => item.road === road && item.isCorrect && !item.crashing);
    const shouldTryCorrect = !roadHasCorrect && canSpawnCorrect(now);
    const spawnCorrect = shouldTryCorrect && (Math.random() < 0.48 || now - state.lastCorrectSpawnAt > 2600);

    const label = spawnCorrect ? correctLabel : nextDecoyLabel(correctLabel);
    const item = makeMainItem({ road, label, isCorrect: spawnCorrect, delayUsed });
    state.mainItems.push(item);
    state.totalSpawned += 1;
    if (spawnCorrect) state.lastCorrectSpawnAt = now;

    return true;
  }

  function makeMainItem({ road, label, isCorrect, delayUsed }) {
    const direction = road === 0 ? -1 : 1;
    const metrics = getItemMetrics(label);
    const x = direction < 0 ? state.fieldWidth + metrics.width + 40 : -(metrics.width + 40);
    const width = metrics.width;
    const norm = clamp((delayUsed - 700) / 440, 0, 1);
    const baseMin = 104;
    const baseMax = 146;
    const baseSpeed = baseMin + ((0.25 + norm * 0.75) * (baseMax - baseMin));
    return {
      id: state.nextItemId++,
      road,
      direction,
      x,
      width,
      label,
      isCorrect,
      vehicle: pickRandom(VEHICLES),
      speed: baseSpeed,
      baseSpeed,
      targetSpeed: baseSpeed,
      bounceOffset: Math.random(),
      height: metrics.height,
      wordWidth: metrics.wordWidth,
      wordHeight: metrics.wordHeight,
      wordFont: metrics.wordFont,
      carSize: metrics.carSize,
      carHitHeight: metrics.carHitHeight,
      carCenterY: metrics.carCenterY,
      wordCenterY: metrics.wordCenterY,
      styleClass: DECOY_CLASSES[state.nextItemId % DECOY_CLASSES.length],
      flashWrongUntil: 0,
      bonkUntil: 0,
      swerveUntil: 0,
      crashing: false,
      removeAt: 0,
      launching: false,
      launchStartAt: 0,
      launchPhaseUntil: 0,
      launchTrailNextAt: 0,
      launchTrailUntil: 0,
      wordFadeUntil: 0,
      launchSpeed: 0,
      clearAheadUntil: 0,
      clearAheadSpeed: 0,
      tilt: 0
    };
  }

  function laneHasSpawnRoom(road, minGap = mainSpawnGap()) {
    const direction = road === 0 ? -1 : 1;
    const spawnMetrics = getItemMetrics(currentTargetLabel() || "word");
    const spawnRect = visibleCarRectForSpawn(road, spawnMetrics);
    const requiredGap = Number.isFinite(minGap) ? minGap : mainSpawnGap();

    for (const item of state.mainItems) {
      if (item.road !== road || item.crashing || item.removeAt) continue;

      const itemRect = visibleCarRectForItem(item);
      const visualGap = direction < 0
        ? spawnRect.left - itemRect.right
        : itemRect.left - spawnRect.right;

      if (visualGap < requiredGap) return false;
    }

    return true;
  }

  function canSpawnCorrect(now) {
    if (state.mainItems.filter(item => item.isCorrect && !item.crashing).length >= 2) return false;
    if (state.totalSpawned < 2) return false;
    return (now - state.lastCorrectSpawnAt > 1700) || Math.random() < 0.34;
  }

  function updateItemSpeed(item, dt) {
    const accelPerSec = 62;
    const desiredGap = mainSpawnGap();
    const closeGap = desiredGap * 0.6;
    const followGap = desiredGap;
    const releaseGap = desiredGap * 1.5;
    const itemRect = visibleCarRectForItem(item);
    const others = state.mainItems.filter(other => other.road === item.road && other.id !== item.id && !other.crashing);
    let leader = null;
    let bestGap = Infinity;

    for (const other of others) {
      const otherRect = visibleCarRectForItem(other);
      let gap = Infinity;

      if (item.direction < 0) {
        if (otherRect.centerX >= itemRect.centerX) continue;
        gap = itemRect.left - otherRect.right;
      } else {
        if (otherRect.centerX <= itemRect.centerX) continue;
        gap = otherRect.left - itemRect.right;
      }

      if (gap < bestGap) {
        bestGap = gap;
        leader = other;
      }
    }

    let targetSpeed = item.targetSpeed || item.baseSpeed;

    if (leader) {
      const leaderSpeed = leader.speed || leader.targetSpeed || leader.baseSpeed || targetSpeed;

      if (bestGap < closeGap) {
        targetSpeed = Math.min(targetSpeed, Math.max(leaderSpeed - 14, 52));
      } else if (bestGap < followGap) {
        targetSpeed = Math.min(targetSpeed, leaderSpeed);
      } else if (bestGap < releaseGap) {
        targetSpeed = Math.min(targetSpeed, leaderSpeed + 10);
      }
    }

    const maxStep = accelPerSec * (dt / 1000);

    if (item.speed < targetSpeed) {
      item.speed = Math.min(targetSpeed, item.speed + maxStep);
    } else if (item.speed > targetSpeed) {
      item.speed = Math.max(targetSpeed, item.speed - maxStep * 1.45);
    }
  }

  function chooseMainItem(itemId, tappedEl) {
    const item = state.mainItems.find(x => x.id === itemId);
    if (item && (item.vanishUntil || item.crashing || item.removeAt)) return;
    if (!item || state.bonusRound || state.bonusIntro) return;
    const layerRect = document.getElementById("ttField")?.getBoundingClientRect();
    const rect = tappedEl.getBoundingClientRect();
    const x = rect.left - layerRect.left + rect.width / 2;
    const y = rect.top - layerRect.top + rect.height / 2;

    if (!item.isCorrect) {
      item.flashWrongUntil = performance.now() + 280;
      state.buildShakeUntil = performance.now() + 260;
      playGameSound("wrongTap");
      addPopup(x, y, "✖", false);
      crashRoad(item.road, item.id);
      return;
    }

    playGameSound("correctTap");
    playZoomSound();
    addPopup(x, y, "✔", true);
    state.buildPopUntil = performance.now() + 200;
    startSuccessLaunch(item);

    const target = currentTargetLabel();
    if (item.label === target) {
      const previousPhase = state.phase;

      if (state.phase === "words") {
        state.wordsBuilt += 1;
      } else if (state.phase === "book") {
        state.bookBuilt = true;
      } else if (state.phase === "reference") {
        state.referenceBuilt = true;
      }

      updatePhaseFromProgress();

      if (previousPhase === "reference" && state.phase === "done") {
        state.awaitingBonusStart = true;
        state.awaitingBonusItemId = item.id;
      }

      convertOtherCorrectCopies(item.road, target);
    }
  }

  function convertOtherCorrectCopies(chosenRoad, previousTarget) {
    for (const item of state.mainItems) {
      if (!item.isCorrect || item.road === chosenRoad || item.label !== previousTarget || item.crashing) continue;
      item.isCorrect = false;
      item.label = nextDecoyLabel(previousTarget);
      item.styleClass = DECOY_CLASSES[(item.id + 1) % DECOY_CLASSES.length];
      item.bonkUntil = performance.now() + 260;
    }
  }

  function crashRoad(road, tappedId) {
    const now = performance.now();
    state.roadCrashUntil[road] = now + 330;
    const roadItems = state.mainItems.filter(item => item.road === road && !item.crashing);
    roadItems.sort((a, b) => {
      if (road === 0) return b.x - a.x; // spawn side to front
      return a.x - b.x;
    });

    const tapped = roadItems.find(item => item.id === tappedId);
    if (!tapped) return;

    const ordered = [tapped, ...roadItems.filter(item => item.id !== tappedId)];
    ordered.forEach((item, index) => {
      item.crashing = true;
      item.swerveUntil = now + 180 + index * 40;
      item.removeAt = now + 240 + index * 90;
      const center = itemCenter(item);
      window.setTimeout(() => {
        spawnCrashBurst(center.x, center.y, crashBurstOptionsForItem(item));
      }, index * 85);
    });
  }

  function finishMainGame() {
    state.mainDone = true;
    state.bonusTruckPending = true;
    state.bonusClearStartedAt = performance.now();
    state.overlayMessage = "";
    state.overlayUntil = 0;

    for (const item of state.mainItems) {
      item.crashing = false;
      item.vanishUntil = 0;
      item.flashWrongUntil = 0;
      item.bonkUntil = 0;
      item.swerveUntil = 0;
    }
  }


  function updateBonus(dt, now) {
    if (state.bonusEnding) {
      for (const item of state.bonusItems) {
        item.x += (item.direction < 0 ? -1 : 1) * (item.speed || 520) * (dt / 1000);
      }

      const buffer = 260;
      state.bonusItems = state.bonusItems.filter(item => {
        if (item.direction < 0 && item.x < -buffer) return false;
        if (item.direction > 0 && item.x > state.fieldWidth + buffer) return false;
        return true;
      });

      state.bonusTruckX -= state.bonusTruckSpeed * (dt / 1000);

      if (state.bonusTruckX < -(state.bonusTruckWidth + 40)) {
        state.bonusRound = false;
        state.bonusEnding = false;
        state.bonusShowScore = false;
        state.bonusTruckMode = "";
        state.bonusTruckX = 0;
        state.bonusTruckWidth = 0;
        state.bonusTruckSpeed = 0;
        state.bonusItems = [];
        state.running = false;
        completeGameAndRenderEndScreen();
      }
      return;
    }

    state.bonusTimeLeft = Math.max(0, state.bonusEndsAt - now);


    spawnBonusTraffic(now);

    for (const item of state.bonusItems) {
      item.x += (item.direction < 0 ? -1 : 1) * item.speed * (dt / 1000);
    }

    preventBonusHorizontalOverlap();

    const buffer = 240;
    state.bonusItems = state.bonusItems.filter(item => {
      if (item.removeAt && now >= item.removeAt) return false;
      if (item.direction < 0 && item.x < -buffer) return false;
      if (item.direction > 0 && item.x > state.fieldWidth + buffer) return false;
      return true;
    });

    if (state.awaitingBonusStart) {
      const launchedRefCarStillExists = state.mainItems.some(item => item.id === state.awaitingBonusItemId);
      if (!launchedRefCarStillExists) {
        state.awaitingBonusStart = false;
        state.awaitingBonusItemId = 0;
        finishMainGame();
      }
    }

    if (state.bonusTimeLeft <= 0) {
      finishBonusRound();
    }
  }


  function currentTargetLabel() {
    if (state.phase === "words") return verseWords[state.wordsBuilt] || "";
    if (state.phase === "book") return verseMeta.book || "";
    if (state.phase === "reference") return verseMeta.reference || "";
    return "";
  }

  function nextDecoyLabel(correctLabel) {
    const lowerCorrect = normalizeWord(correctLabel);

    if (state.phase === "words") {
      if (selectedMode === "easy") {
        const pool = window.VerseGameShell.getFunWordDecoys(correctLabel, verseWords, 12);
        return pickRandom(pool) || pickRandom(FUN_DECOYS);
      }

      const pool = window.VerseGameShell.getVerseWordDecoys({
        words: verseWords,
        correct: correctLabel,
        targetIndex: state.wordsBuilt,
        count: 12,
        avoidNext: 2,
        fallbackToFun: true
      });

      return pickRandom(pool) || pickRandom(FUN_DECOYS);
    }

    if (state.phase === "book") {
      const pool = window.VerseGameShell.getBookDecoys(correctLabel, 12);
      return pickRandom(pool) || "Psalm";
    }

    if (state.phase === "reference") {
      const pool = window.VerseGameShell
        .getReferenceDecoys(verseMeta, selectedMode, 8)
        .filter(ref => normalizeWord(ref) !== lowerCorrect);

      return pickRandom(pool) || "1:1";
    }

    return pickRandom(FUN_DECOYS);
  }



  function trafficSpeedMultiplier() {
    if (selectedMode === "easy") return 1;

    const progress = clamp(state.wordsBuilt / Math.max(1, verseWords.length - 1), 0, 1);

    if (selectedMode === "medium") {
      return state.phase === "words"
        ? 1.10 + (0.20 * progress)
        : 1.30;
    }

    return state.phase === "words"
      ? 1.15 + (0.30 * progress)
      : 1.45;
  }

  function mainSpeedMultiplierForSpacing() {
    return Math.max(1, trafficSpeedMultiplier());
  }

  function randomSpawnDelay() {
    const baseDelay = 720 + Math.random() * 420;
    return baseDelay / mainSpeedMultiplierForSpacing();
  }

  function mainBlockedSpawnRetryDelay() {
    return clamp(90 / mainSpeedMultiplierForSpacing(), 50, 90);
  }

  function roadTopY(road) {
    return road === 0 ? 0 : (state.roadHeight + state.gapHeight);
  }

  function laneCenterY(road) {
    return roadTopY(road) + (state.roadHeight * 0.5);
  }

  function bonusLaneY(lane) {
    const roadTop = state.fieldHeight * 0.18;
    const roadHeight = state.fieldHeight * 0.56;
    return lane === "upper"
      ? roadTop + roadHeight * 0.35
      : roadTop + roadHeight * 0.65;
  }

  function itemCenter(item) {
    const width = item.width || 150;
    const roadTop = roadTopY(item.road);
    const height = item.height || state.roadHeight;
    const carCenterPct = (typeof item.carCenterY === "number" ? item.carCenterY : 25) / 100;

    return {
      x: item.x + (width / 2),
      y: roadTop + (height * carCenterPct)
    };
  }

  function addPopup(x, y, text, good) {
    state.effectPopups.push({ x, y, text, good, until: performance.now() + 620 });
  }

  function showPhaseOverlay(text) {
    state.overlayMessage = text;
    state.overlayUntil = performance.now() + 900;
  }

  function getItemMetrics(label) {
    const labelLen = String(label || "").length;
    const roadH = Math.max(110, state.roadHeight || 160);

    const isMobile = state.fieldWidth < 520;
    const maxByField = Math.max(250, state.fieldWidth * (isMobile ? 0.42 : 0.36));
    const width = clamp(
      (isMobile ? state.fieldWidth * 0.42 : state.fieldWidth * 0.285) + labelLen * 8,
      190,
      Math.min(430, maxByField)
    );

    const height = Math.round(roadH);
    const laneH = roadH * 0.5;
    const carSize = clamp(laneH * 0.78, 56, 126);
    const carHitHeight = clamp(laneH * 0.82, 46, 92);

    const wordWidth = clamp(width * 0.94, 146, width - 2);
    const wordHeight = clamp(carSize * 0.48, 38, 68);
    const wordFont = clamp(carSize * (isMobile ? 0.27 : 0.31), 18, 38);

    const carCenterY = 24;
    const wordCenterY = 74;
    return { width, height, wordWidth, wordHeight, wordFont, carSize, carHitHeight, carCenterY, wordCenterY };
  }

  function visibleCarWidthFromMetrics(metrics) {
    return (metrics.carSize || 70) * 2.25;
  }

  function visibleCarWidthForItem(item) {
    return (item.carSize || 70) * 2.25;
  }

  function mainSpawnGap() {
    const metrics = getItemMetrics(currentTargetLabel() || "car");
    return Math.round(visibleCarWidthFromMetrics(metrics) * 0.45);
  }

  function visibleCarRectForItem(item) {
    const width = visibleCarWidthForItem(item);
    const centerX = (item.x || 0) + ((item.width || width) / 2);

    return {
      left: centerX - (width / 2),
      right: centerX + (width / 2),
      centerX,
      width
    };
  }

  function visibleCarRectForSpawn(road, metrics) {
    const direction = road === 0 ? -1 : 1;
    const itemWidth = metrics.width || 190;
    const x = direction < 0
      ? state.fieldWidth + itemWidth + 40
      : -(itemWidth + 40);
    const width = visibleCarWidthFromMetrics(metrics);
    const centerX = x + (itemWidth / 2);

    return {
      left: centerX - (width / 2),
      right: centerX + (width / 2),
      centerX,
      width
    };
  }


  function parseVerseMeta(verseId, fallbackRef) {
    return window.VerseGameShell.parseReferenceParts(
      fallbackRef,
      ctx.translation,
      verseId
    );
  }



  function applyDebugHitboxes() {
    const field = document.getElementById("ttField");
    if (!field) return;
    field.classList.toggle("is-hitbox-debug", !!state.debugHitboxes);
  }

  function uniqueStrings(items) {
    const out = [];
    const seen = new Set();
    for (const item of items) {
      const key = String(item).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function normalizeWord(value) {
    return window.VerseGameShell.normalizeWord(value);
  }

  const shuffle = window.VerseGameShell.shuffle;

  function pickRandom(items) {
    if (!items || !items.length) return "";
    return items[Math.floor(Math.random() * items.length)];
  }

  const clamp = window.VerseGameShell.clamp;
  const capitalize = window.VerseGameShell.capitalize;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
