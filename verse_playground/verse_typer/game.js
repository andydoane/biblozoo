(async function () {
  const app = document.getElementById("app");
  if (app) app.classList.add("vm-shell");

  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "verse_typer";
  const GAME_TITLE = "Verse Typer";
  const GAME_ICON = "🐛";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);
  const HELP_OVERLAY_ID = "verseTyperHelpOverlay";

  const GAME_THEME = {
    bg: "#f7cf5d",
    accent: "#3b8f3f",
    helpTitleBg: "#7ebf4f",
    helpTitleColor: "#ffffff",
    helpCloseBg: "#ff5a51",
    helpCloseColor: "#ffffff"
  };

  const MODES = [
    { id: "easy", label: "Beginner" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Advanced" }
  ];

  const INTERNAL_MODE_BY_SHELL_MODE = {
    easy: "beginner",
    medium: "medium",
    hard: "advanced"
  };

  const LETTER_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ];

  const NUMBER_ROWS = [
    ["1", "2", "3", "4", "5"],
    ["6", "7", "8", "9", "0"]
  ];

  const THEME_SKINS = {
    caterpillar: {
      id: "caterpillar",
      wordClass: "vt-skin-caterpillar",
      itemName: "caterpillar"
    }
  };

  const skin = THEME_SKINS.caterpillar;

  let selectedMode = "beginner";
  let muted = false;
  let audioCtx = null;
  let masterGain = null;
  let chunkAudio = null;
  let chunkAudioEl = null;
  let audioUnlocked = false;
  let audioUnlockPromise = null;
  let htmlAudioPrimed = false;
  let htmlAudioPrimePromise = null;
  let gameFontReadyPromise = null;
  let gameAssetPreloadPromise = null;

  const imagePreloadCache = new Map();
  const uiPopAudioEls = [];
  let uiPopFlip = false;

  const ENTER_INPUT_MS = 400;
  const ENTER_DONE_MS = 960;
  const ENTER_CRAWL_STOP_MS = 830;
  const EXIT_DONE_MS = 1000;
  const RIPPLE_DELAY_MS = 45;

  const AUDIO_DEBUG = false;
  const SILENCE_AUDIO_FILE = "../../verse_audio/silence.mp3";
  const UI_POP_SOUND_FILES = [
    "../../ui_audio/ui_sound_pop_1.mp3",
    "../../ui_audio/ui_sound_pop_2.mp3"
  ];
  const UI_POP_SOUND_VOLUME = 0.48;
  const COCOON_IMAGE_FILE = "./verse_typer_images/cocoon.png";
  const BUTTERFLY_IMAGE_FILE = "./verse_typer_images/butterfly.svg";
  const BUTTERFLY_FLAPS_TO_FINISH = 5;

  // TTS chunks average around -20 dBFS active speech.
  // These Web Audio levels are intentionally below exact RMS match,
  // because short tones feel louder/more piercing than speech.
  const WEB_AUDIO_MASTER_VOLUME = 0.85;
  const CORRECT_LETTER_VOLUME = 0.48;
  const WRONG_TONE_VOLUME_1 = 0.40;
  const WRONG_TONE_VOLUME_2 = 0.30;
  const WORD_DONE_VOLUME_1 = 0.38;
  const WORD_DONE_VOLUME_2 = 0.34;
  const POPUP_TONE_VOLUME_1 = 0.26;
  const POPUP_TONE_VOLUME_2 = 0.22;

  function audioDebug(...args) {
    if (!AUDIO_DEBUG) return;
    console.log("[VerseTyperAudio]", ...args);
  }

  function waitForGameFont(timeoutMs = 900) {
    if (gameFontReadyPromise) return gameFontReadyPromise;

    gameFontReadyPromise = new Promise(resolve => {
      let done = false;
      let timeoutId = null;

      const finish = () => {
        if (done) return;
        done = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(true);
      };

      timeoutId = setTimeout(finish, timeoutMs);

      try {
        if (!document.fonts?.load) {
          finish();
          return;
        }

        document.fonts.load('1em "DD2 Titan One"')
          .then(() => document.fonts.ready)
          .then(finish)
          .catch(finish);
      } catch (err) {
        finish();
      }
    });

    return gameFontReadyPromise;
  }

  function preloadImage(src) {
    if (!src) return Promise.resolve(false);
    if (imagePreloadCache.has(src)) return imagePreloadCache.get(src);

    const promise = new Promise(resolve => {
      const img = new Image();
      let done = false;

      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(!!ok);
      };

      img.onload = async () => {
        try {
          if (img.decode) await img.decode();
        } catch (err) { }
        finish(true);
      };

      img.onerror = () => finish(false);
      img.src = src;
    });

    imagePreloadCache.set(src, promise);
    return promise;
  }

  function headImageFileForStage(stage) {
    return `./verse_typer_images/caterpillar_head_${stage}.svg`;
  }

  function preloadHeadImages() {
    return Promise.all([0, 1, 2, 3, 4].map(stage => preloadImage(headImageFileForStage(stage))));
  }

  function preloadGameAssets() {
    if (gameAssetPreloadPromise) return gameAssetPreloadPromise;

    gameAssetPreloadPromise = Promise.allSettled([
      waitForGameFont(1200),
      preloadHeadImages(),
      preloadImage(COCOON_IMAGE_FILE),
      preloadImage("./verse_typer_images/verse_typer_cloud.svg"),
      loadButterflySvg()
    ]);

    return gameAssetPreloadPromise;
  }

  const state = {
    screen: "intro",
    verseJson: null,
    chunks: [],
    bookWords: [],
    referenceChars: [],
    referenceExpectedDigits: [],
    referenceDigitPositions: [],
    currentChunkIndex: 0,
    currentWordIndex: 0,
    currentItem: null,
    typedIndex: 0,
    wordOffsetX: 0,
    currentMelody: [],
    revealed: false,
    advancedHintLevel: 0,
    advancedHintWordsSeen: 0,
    advancedFullHintUsed: false,
    verseIntroShown: false,
    bookIntroShown: false,
    referenceIntroShown: false,
    megaIntroShown: false,
    justTypedIndex: -1,
    justTypedSegmentIndex: -1,
    acceptingInput: false,
    transitionLocked: false,
    entranceDone: false,
    pendingCompleteAfterEntrance: false,
    paused: false,
    startTime: 0,
    correctLetters: 0,
    typos: 0,
    streak: 0,
    bestStreak: 0,
    badges: [],
    sparkles: [],
    headShakeUntil: 0,
    keyFlash: "",
    keyFlashBad: false,
    phaseLabel: "",
    menuOpen: false,
    completed: false,
    butterflySvg: "",
    butterflyColors: null,
    butterflyFlaps: 0,
    sleepIds: [],
    runToken: 0
  };

  function clearTrackedTimeout(id) {
    if (!id) return;
    clearTimeout(id);
    state.sleepIds = state.sleepIds.filter(item => item !== id);
  }

  function trackedTimeout(callback, ms, runToken = state.runToken) {
    const id = setTimeout(() => {
      state.sleepIds = state.sleepIds.filter(item => item !== id);
      if (runToken !== null && state.runToken !== runToken) return;
      callback();
    }, ms);
    state.sleepIds.push(id);
    return id;
  }

  const sleep = (ms, runToken = state.runToken) => new Promise(resolve => {
    trackedTimeout(() => resolve(true), ms, runToken);
  });

  function clearSleeps() {
    state.sleepIds.forEach(id => clearTimeout(id));
    state.sleepIds = [];
  }

  function invalidateRun() {
    state.runToken += 1;
    clearSleeps();
  }

  function beginRunToken() {
    invalidateRun();
    return state.runToken;
  }

  function isLiveRun(runToken = state.runToken) {
    return state.screen === "game" && state.runToken === runToken;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function audioContextConstructor() {
    return window.AudioContext || window.webkitAudioContext;
  }

  function createChunkAudioElement() {
    if (chunkAudioEl) return chunkAudioEl;

    chunkAudioEl = document.createElement("audio");
    chunkAudioEl.preload = "auto";
    chunkAudioEl.playsInline = true;
    chunkAudioEl.setAttribute("playsinline", "");
    chunkAudioEl.style.display = "none";

    document.body.appendChild(chunkAudioEl);

    chunkAudio = chunkAudioEl;
    return chunkAudioEl;
  }

  // iPadOS Safari may not fully enable Web Audio until an HTML audio element
  // has successfully played from a user gesture. This silent MP3 primes that path.

  function primeHtmlAudio() {
    if (htmlAudioPrimed) return Promise.resolve(true);
    if (htmlAudioPrimePromise) return htmlAudioPrimePromise;

    const audio = createChunkAudioElement();

    htmlAudioPrimePromise = new Promise(resolve => {
      let done = false;
      let fallbackId = null;

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.oncanplay = null;
        audio.oncanplaythrough = null;
        if (fallbackId) clearTimeout(fallbackId);
      };

      const finish = (ok, reason) => {
        if (done) return;
        done = true;
        cleanup();
        htmlAudioPrimed = !!ok;
        htmlAudioPrimePromise = null;
        audioDebug("html audio prime finish", { ok, reason, htmlAudioPrimed });
        resolve(!!ok);
      };

      const tryPlay = () => {
        audioDebug("html audio prime tryPlay", {
          readyState: audio.readyState,
          networkState: audio.networkState
        });

        const playPromise = audio.play();

        if (playPromise?.then) {
          playPromise
            .then(() => {
              audioDebug("html audio prime play resolved");
            })
            .catch(err => {
              console.warn("Verse Typer silent audio prime rejected", err);
              finish(false, "play rejected");
            });
        }
      };

      try {
        audioDebug("html audio prime start", SILENCE_AUDIO_FILE);

        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = 0.01;
        audio.src = SILENCE_AUDIO_FILE;
        audio.load();

        audio.onended = () => finish(true, "ended");

        audio.onerror = () => {
          console.warn("Verse Typer silent audio prime failed", SILENCE_AUDIO_FILE, audio.error);
          finish(false, "error");
        };

        if (audio.readyState >= 3) {
          tryPlay();
        } else {
          audio.oncanplay = tryPlay;
          audio.oncanplaythrough = tryPlay;
        }

        fallbackId = setTimeout(() => {
          if (!done) {
            audioDebug("html audio prime timeout", {
              readyState: audio.readyState,
              networkState: audio.networkState
            });
            finish(false, "timeout");
          }
        }, 1800);
      } catch (err) {
        console.warn("Verse Typer silent audio prime exception", err);
        finish(false, "exception");
      }
    });

    return htmlAudioPrimePromise;
  }

  function createAudio() {
    if (audioCtx) {
      if (masterGain) masterGain.gain.value = muted ? 0 : WEB_AUDIO_MASTER_VOLUME;
      return;
    }

    const AudioCtor = audioContextConstructor();
    if (!AudioCtor) return;

    audioCtx = new AudioCtor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : WEB_AUDIO_MASTER_VOLUME;
    masterGain.connect(audioCtx.destination);
  }

  async function unlockAudio() {
    createAudio();
    if (!audioCtx || !masterGain) return false;

    if (audioUnlocked && audioCtx.state === "running") return true;

    if (audioUnlockPromise) return audioUnlockPromise;

    audioUnlockPromise = (async () => {
      try {
        audioDebug("unlock start", audioCtx.state);

        if (audioCtx.state !== "running") {
          try {
            await audioCtx.resume?.();
          } catch (err) {
            audioDebug("resume rejected", err);
          }
        }

        createChunkAudioElement();

        audioDebug("unlock after resume", audioCtx.state);

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.0001, now);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.03);

        audioUnlocked = audioCtx.state === "running";
        audioDebug("unlock done", { audioUnlocked, state: audioCtx.state });
        return audioUnlocked;
      } catch (err) {
        console.warn("Verse Typer audio unlock failed", err);
        audioUnlocked = false;
        return false;
      } finally {
        audioUnlockPromise = null;
      }
    })();

    return audioUnlockPromise;
  }

  function uiPopAudioForIndex(index) {
    const src = UI_POP_SOUND_FILES[index];
    if (!src) return null;

    if (uiPopAudioEls[index]) return uiPopAudioEls[index];

    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.src = src;
    audio.volume = UI_POP_SOUND_VOLUME;
    audio.style.display = "none";

    document.body.appendChild(audio);
    uiPopAudioEls[index] = audio;

    return audio;
  }

  function preloadUiPopSounds() {
    UI_POP_SOUND_FILES.forEach((_, index) => {
      const audio = uiPopAudioForIndex(index);
      try {
        audio?.load();
      } catch (err) { }
    });
  }

  function playUiPopSound() {
    if (muted) return;

    const index = uiPopFlip ? 1 : 0;
    uiPopFlip = !uiPopFlip;

    const audio = uiPopAudioForIndex(index);
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = UI_POP_SOUND_VOLUME;

      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => { });
      }
    } catch (err) {
      // UI sound should never break gameplay.
    }
  }

  function wireShellUiPopSounds(root = app) {
    if (!root) return;

    preloadUiPopSounds();

    root.querySelectorAll("button").forEach(button => {
      if (button.dataset.vtUiPopSound === "wired") return;
      if (button.closest(".vt-root")) return;

      button.dataset.vtUiPopSound = "wired";

      const play = () => {
        playUiPopSound();
      };

      if (window.PointerEvent) {
        button.addEventListener("pointerdown", play, { passive: true });
      } else {
        button.addEventListener("touchstart", play, { passive: true });
        button.addEventListener("mousedown", play);
      }
    });
  }


  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function playTone({ midi = 60, duration = 0.16, volume = 0.16, type = "triangle" } = {}) {
    if (muted) return;

    createAudio();
    if (!audioCtx || !masterGain) return;

    if (audioCtx.state !== "running") {
      unlockAudio().then((ok) => {
        if (ok) playTone({ midi, duration, volume, type });
      });
      return;
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(midiToFreq(midi), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  function melodyPoolsForLength(length) {
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

  function chooseMelodyForLength(length) {
    const cappedLength = clampNumber(Math.max(1, length || 1), 1, 10);
    const pool = melodyPoolsForLength(cappedLength);

    if (!pool.length) {
      return [60, 62, 64, 67, 69, 72, 69, 67, 64, 60];
    }

    return pool[Math.floor(Math.random() * pool.length)].slice();
  }

  const MEGA_TUNES = [
    {
      id: "odeToJoy",
      melody: [
        64, 64, 65, 67,
        67, 65, 64, 62,
        60, 60, 62, 64,
        64, 62, 62,

        64, 64, 65, 67,
        67, 65, 64, 62,
        60, 60, 62, 64,
        62, 60, 60,

        62, 62, 64, 60,
        62, 64, 65, 60,
        62, 64, 64, 62,
        60, 62, 55,

        64, 64, 65, 67,
        67, 65, 64, 62,
        60, 60, 62, 64,
        62, 60, 60,
      ]
    }

    /*
    To add another Mega-pillar tune later, add a comma after the Ode to Joy block above,
    then add another object like this:

    {
      id: "myNewTune",
      melody: [
        60, 62, 64, 65,
        67, 65, 64, 62
      ]
    }
    */
  ];

  function chooseMegaMelodyForLength(length) {
    const tunes = MEGA_TUNES
      .map(tune => Array.isArray(tune.melody) ? tune.melody.filter(Number.isFinite) : [])
      .filter(melody => melody.length);

    if (!tunes.length) {
      return chooseMelodyForLength(length);
    }

    return tunes[Math.floor(Math.random() * tunes.length)].slice();
  }

  function playCorrectLetterSound() {
    const melody = state.currentMelody.length
      ? state.currentMelody
      : chooseMelodyForLength(state.currentItem?.expected?.length || 1);

    const midi = melody[state.typedIndex % melody.length] || 60;
    playTone({ midi, duration: 0.13, volume: CORRECT_LETTER_VOLUME, type: "triangle" });
  }

  function playWrongSound() {
    const runToken = state.runToken;
    playTone({ midi: 43, duration: 0.13, volume: WRONG_TONE_VOLUME_1, type: "sine" });
    trackedTimeout(() => playTone({ midi: 38, duration: 0.11, volume: WRONG_TONE_VOLUME_2, type: "sine" }), 55, runToken);
  }

  function playWordDoneSound() {
    const runToken = state.runToken;
    playTone({ midi: 72, duration: 0.14, volume: WORD_DONE_VOLUME_1, type: "triangle" });
    trackedTimeout(() => playTone({ midi: 76, duration: 0.18, volume: WORD_DONE_VOLUME_2, type: "triangle" }), 70, runToken);
  }

  function normalizeLetters(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
  }

  function tokenizeWords(value) {
    if (window.VerseGameShell?.tokenizeVerseWords) {
      return window.VerseGameShell.tokenizeVerseWords(String(value || ""))
        .map(word => normalizeLetters(word))
        .filter(Boolean);
    }

    return String(value || "")
      .match(/[A-Za-z]+(?:[’'][A-Za-z]+)?|[0-9]+/g)?.map(normalizeLetters).filter(Boolean) || [];
  }

  function titleCase(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function prettyWord(value) {
    const clean = normalizeLetters(value);
    return clean || String(value || "").trim();
  }

  function echoPartFileByIndex(index) {
    const suffix = String.fromCharCode("a".charCodeAt(0) + index);
    return `../../verse_audio/${ctx.verseId}${suffix}.mp3`;
  }

  async function loadVerseJson() {
    if (state.verseJson) return state.verseJson;

    const params = window.VerseGameBridge.getLaunchParams?.() || {};
    const verseId = ctx.verseId || params.verseId || "";
    if (!verseId) return null;

    try {
      const res = await fetch(`../../verse_data/${verseId}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.verseJson = await res.json();
      return state.verseJson;
    } catch (err) {
      console.warn("Verse Typer could not load full verse JSON", err);
      return null;
    }
  }

  function splitFallbackChunks(verseText) {
    const words = tokenizeWords(verseText);
    const chunks = [];
    for (let i = 0; i < words.length; i += 6) {
      const partWords = words.slice(i, i + 6);
      chunks.push({
        text: partWords.map(titleCase).join(" "),
        words: partWords,
        audioFile: ""
      });
    }
    return chunks;
  }

  function makeChunks(verseJson) {
    const echoParts = Array.isArray(verseJson?.echoParts)
      ? verseJson.echoParts.filter(part => String(part || "").trim())
      : [];

    if (!echoParts.length) {
      return splitFallbackChunks(ctx.verseText || verseJson?.verseText || "");
    }

    return echoParts.map((part, index) => ({
      text: String(part || "").trim(),
      words: tokenizeWords(part),
      audioFile: echoPartFileByIndex(index)
    })).filter(chunk => chunk.words.length);
  }

  function makeBookWords(book) {
    const raw = String(book || "").trim();
    if (!raw) return [];

    const parts = raw.split(/\s+/).filter(Boolean);
    const out = [];

    parts.forEach((part) => {
      if (part === "1") out.push("FIRST");
      else if (part === "2") out.push("SECOND");
      else if (part === "3") out.push("THIRD");
      else out.push(prettyWord(part));
    });

    return out.filter(Boolean);
  }

  function makeReferenceData(reference) {
    const chars = String(reference || "").replace(/[–—−]/g, "-").split("");
    const expected = [];
    const positions = [];

    chars.forEach((char, index) => {
      if (/\d/.test(char)) {
        expected.push(char);
        positions.push(index);
      }
    });

    return { chars, expected, positions };
  }

  function megaVerseText() {
    if (state.chunks.length) {
      return state.chunks.map(chunk => chunk.text).join(" ");
    }

    return String(state.verseJson?.verseText || ctx.verseText || "");
  }

  function makeMegaParts(text) {
    const parts = [];
    const expected = [];
    let typeIndex = 0;
    let lastWasSpace = false;

    String(text || "").split("").forEach(char => {
      if (/[A-Za-z]/.test(char)) {
        const letter = normalizeLetters(char);
        if (!letter) return;

        parts.push({
          kind: "letter",
          char: letter,
          typeIndex
        });

        expected.push(letter);
        typeIndex += 1;
        lastWasSpace = false;
        return;
      }

      if (/\s/.test(char) && !lastWasSpace && parts.length) {
        parts.push({
          kind: "space"
        });

        lastWasSpace = true;
      }
    });

    while (parts.length && parts[parts.length - 1].kind === "space") {
      parts.pop();
    }

    return {
      parts,
      expected: expected.join("")
    };
  }

  async function initRunData() {
    const verseJson = await loadVerseJson();
    const parsed = window.VerseGameShell.parseReferenceParts(
      ctx.verseRef,
      ctx.translation,
      ctx.verseId
    );

    const chunks = makeChunks(verseJson || {});
    const fallbackChunks = chunks.length ? chunks : splitFallbackChunks(ctx.verseText || "");
    const bookWords = makeBookWords(parsed.book);
    const referenceData = makeReferenceData(parsed.reference);

    state.chunks = fallbackChunks;
    state.bookWords = bookWords;
    state.referenceChars = referenceData.chars;
    state.referenceExpectedDigits = referenceData.expected;
    state.referenceDigitPositions = referenceData.positions;
  }

  function resetStats() {
    state.currentChunkIndex = 0;
    state.currentWordIndex = 0;
    state.currentItem = null;
    state.typedIndex = 0;
    state.wordOffsetX = 0;
    state.currentMelody = [];
    state.revealed = false;
    state.advancedHintLevel = 0;
    state.advancedHintWordsSeen = 0;
    state.advancedFullHintUsed = false;
    state.verseIntroShown = false;
    state.bookIntroShown = false;
    state.referenceIntroShown = false;
    state.megaIntroShown = false;
    state.justTypedIndex = -1;
    state.justTypedSegmentIndex = -1;
    state.acceptingInput = false;
    state.transitionLocked = false;
    state.entranceDone = false;
    state.pendingCompleteAfterEntrance = false;
    state.paused = false;
    state.startTime = performance.now();
    state.correctLetters = 0;
    state.typos = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.badges = [];
    state.sparkles = [];
    state.headShakeUntil = 0;
    state.keyFlash = "";
    state.keyFlashBad = false;
    state.completed = false;
    state.butterflySvg = "";
    state.butterflyColors = null;
    state.butterflyFlaps = 0;
    gameAssetPreloadPromise = null;
  }

  function renderIntro() {
    stopAllAudio();
    clearSleeps();

    window.VerseGameShell.renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      debugBadge: "",
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      startText: "Start",
      helpText: "How to Play",
      theme: GAME_THEME,
      backLabel: "Back to Verse Playground",
      onBack: () => window.VerseGameBridge.exitGame(),
      onStart: () => {
        createChunkAudioElement();
        primeHtmlAudio();
        unlockAudio();
        preloadGameAssets();
        setScreen("mode");
      }
    });

    wireShellUiPopSounds();
  }

  function renderMode() {
    stopAllAudio();
    clearSleeps();

    window.VerseGameShell.renderModeSelect({
      app,
      title: "Choose Your Mode",
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      backLabel: "Back to Verse Typer title",
      theme: GAME_THEME,
      modes: MODES,
      onBack: () => setScreen("intro"),
      onSelect: async (mode) => {
        createChunkAudioElement();
        primeHtmlAudio();
        unlockAudio();
        preloadGameAssets();
        selectedMode = INTERNAL_MODE_BY_SHELL_MODE[mode] || "beginner";
        await beginRun();
      }
    });

    wireShellUiPopSounds();
  }

  async function beginRun() {
    const runToken = beginRunToken();

    await initRunData();
    if (state.runToken !== runToken) return;

    resetStats();
    preloadGameAssets();
    await waitForGameFont(900);
    if (state.runToken !== runToken) return;

    state.screen = "game";
    renderGameShell();
    startVersePhase(runToken);
  }

  function renderGameShell() {
    app.innerHTML = `
      <div class="vt-root ${skin.wordClass}">
        <div class="vt-stage">
          <div class="vt-topbar">
            <button class="vt-pill vt-menu-pill no-zoom" id="vtMenuPill" type="button" aria-label="Game Menu">☰</button>
            <div class="vt-pill vt-phase-pill" id="vtPhasePill">Verse</div>
            <div class="vt-pill vt-streak-pill" id="vtStreakPill">🔥 0</div>
          </div>

          <div class="vt-play-card" id="vtPlayCard">
            <div class="vt-sky" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>

            <div class="vt-badge-layer" id="vtBadgeLayer"></div>
            <div class="vt-sparkle-layer" id="vtSparkleLayer"></div>
            <div class="vt-main" id="vtMain"></div>
          </div>

          <div class="vt-keyboard-wrap" id="vtKeyboardWrap"></div>
        </div>

        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>
    `;

    wireGameMenu();
    wirePhysicalKeyboard();
    renderHud();
    renderKeyboard("letters");
  }

  function renderHelpOverlay() {
    return window.VerseGameShell.helpOverlayHtml({
      id: HELP_OVERLAY_ID,
      title: "How to Play",
      body: helpHtml()
    });
  }

  function renderGameMenuOverlay() {
    return window.VerseGameShell.gameMenuHtml({
      id: "verseTyperGameMenuOverlay",
      title: "Verse Typer Menu",
      muted,
      showModeSelect: true,
      exitText: "Exit Playground"
    });
  }

  function wireGameMenu() {
    window.VerseGameShell.wireGameMenu({
      id: "verseTyperGameMenuOverlay",
      menuButtonId: "vtMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (masterGain && audioCtx) {
          masterGain.gain.setValueAtTime(muted ? 0 : WEB_AUDIO_MASTER_VOLUME, audioCtx.currentTime);
        }
        if (chunkAudio) chunkAudio.muted = muted;
        if (!muted) playUiPopSound();
        return muted;
      },
      onHowToPlay: () => {
        playUiPopSound();

        const menuOverlay = document.getElementById("verseTyperGameMenuOverlay");
        if (menuOverlay) {
          menuOverlay.classList.remove("is-open");
          menuOverlay.setAttribute("aria-hidden", "true");
        }

        window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");
        state.paused = true;
      },
      onModeSelect: () => {
        playUiPopSound();
        state.paused = false;
        stopAllAudio();
        setScreen("mode");
      },
      onExit: () => {
        playUiPopSound();
        stopAllAudio();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        playUiPopSound();
        state.paused = true;
      },
      onClose: () => {
        playUiPopSound();
        state.paused = false;
      },
      onBackFromHelp: () => {
        playUiPopSound();
        state.paused = true;
      }
    });
  }

  function wirePhysicalKeyboard() {
    window.onkeydown = (event) => {
      if (state.screen !== "game") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = String(event.key || "").toUpperCase();
      if (/^[A-Z]$/.test(key) || /^\d$/.test(key)) {
        event.preventDefault();
        handleKey(key);
      }
    };
  }

  function streakHudTier(value) {
    const streak = Number(value) || 0;

    if (streak >= 20) return "rainbow";
    if (streak >= 10) return "teal";
    if (streak >= 5) return "green";
    return "yellow";
  }

  function renderHud() {
    const streak = document.getElementById("vtStreakPill");
    const phase = document.getElementById("vtPhasePill");

    if (streak) {
      const tier = streakHudTier(state.streak);

      streak.textContent = `🔥 ${state.streak}`;
      streak.classList.remove(
        "is-streak-yellow",
        "is-streak-green",
        "is-streak-teal",
        "is-streak-rainbow"
      );
      streak.classList.add(`is-streak-${tier}`);
    }

    if (phase) phase.textContent = state.phaseLabel || "Verse";
  }

  function renderKeyboard(type) {
    const wrap = document.getElementById("vtKeyboardWrap");
    if (!wrap) return;

    const rows = type === "numbers" ? NUMBER_ROWS : LETTER_ROWS;
    const extraClass = type === "numbers" ? "is-numbers" : "is-letters";

    wrap.innerHTML = `
      <div class="vt-keyboard ${extraClass}">
        ${rows.map(row => `
          <div class="vt-key-row">
            ${row.map(key => `
              <button class="vt-key no-zoom ${state.keyFlash === key ? (state.keyFlashBad ? "is-bad" : "is-good") : ""}" data-vt-key="${escapeHtml(key)}" type="button">${escapeHtml(key)}</button>
            `).join("")}
          </div>
        `).join("")}
      </div>
    `;

    wrap.querySelectorAll("[data-vt-key]").forEach(btn => {
      const pressKey = (event) => {
        event.preventDefault();
        createChunkAudioElement();
        primeHtmlAudio();
        unlockAudio();
        handleKey(btn.dataset.vtKey);
      };

      if (window.PointerEvent) {
        btn.addEventListener("pointerdown", pressKey);
      } else {
        btn.addEventListener("touchstart", pressKey, { passive: false });
        btn.addEventListener("mousedown", pressKey);
      }

      btn.addEventListener("click", event => event.preventDefault());
    });
  }

  function setPhaseLabel(label) {
    state.phaseLabel = label;
    renderHud();
  }

  function canUseAdvancedHint(item = state.currentItem) {
    return selectedMode === "advanced"
      && !!item
      && item.kind !== "mega";
  }

  function shouldShowAdvancedHintPrompt(item = state.currentItem) {
    return canUseAdvancedHint(item)
      && item.kind === "word"
      && !state.advancedFullHintUsed
      && state.advancedHintWordsSeen <= 4;
  }

  function renderAdvancedHintPrompt(item = state.currentItem, runToken = state.runToken) {
    const existing = document.getElementById("vtAdvancedHintPrompt");

    if (!shouldShowAdvancedHintPrompt(item)) {
      if (existing) existing.remove();
      return;
    }

    const playCard = document.getElementById("vtPlayCard");
    if (!playCard || !isLiveRun(runToken)) return;

    const title = state.advancedHintLevel >= 1 ? "More Hints" : "Tap for a Hint";
    const prompt = existing || document.createElement("div");

    if (!existing) {
      prompt.className = "vt-play-area-prompt vt-play-area-prompt-hint vt-advanced-hint-prompt";
      prompt.id = "vtAdvancedHintPrompt";
      prompt.removeAttribute("aria-hidden");
      prompt.setAttribute("role", "button");
      playCard.appendChild(prompt);
    }

    if (prompt.textContent !== title) {
      prompt.textContent = title;
    }

    prompt.setAttribute("aria-label", title);
    prompt.onclick = (event) => {
      event.preventDefault();
      handleAdvancedHintTap(item);
    };
  }

  function handleAdvancedHintTap(item = state.currentItem) {
    if (!canUseAdvancedHint(item)) return false;

    if (state.advancedHintLevel <= 0) {
      state.advancedHintLevel = 1;
      state.revealed = false;
      renderCurrentItem();
      return true;
    }

    if (state.advancedHintLevel === 1) {
      state.advancedHintLevel = 2;
      state.revealed = true;
      state.advancedFullHintUsed = true;
      renderCurrentItem();
      return true;
    }

    return true;
  }

  async function startVersePhase(runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    renderKeyboard("letters");

    if (!state.verseIntroShown) {
      state.verseIntroShown = true;

      await showTyperPopup({
        title: "Type the Word!",
        variant: "word"
      });
      if (!isLiveRun(runToken)) return;


    }

    startChunkWord(0, 0, runToken);
  }

  function startChunkWord(chunkIndex, wordIndex, runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    const chunk = state.chunks[chunkIndex];
    if (!chunk) {
      startBookPhase(runToken);
      return;
    }

    const word = chunk.words[wordIndex];
    if (!word) {
      startChunkReview(chunkIndex, runToken);
      return;
    }

    state.currentChunkIndex = chunkIndex;
    state.currentWordIndex = wordIndex;
    setCurrentItem({
      kind: "word",
      display: word,
      expected: normalizeLetters(word),
      phase: "verse",
      chunkIndex,
      wordIndex
    });
    setPhaseLabel(`Chunk ${chunkIndex + 1}/${state.chunks.length}`);
    renderKeyboard("letters");
    renderCurrentItem("enter");
  }

  async function startBookPhase(runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    if (!state.bookWords.length) {
      startReferencePhase(runToken);
      return;
    }

    renderKeyboard("letters");

    const showPrompt = !state.bookIntroShown;
    state.bookIntroShown = true;

    state.currentWordIndex = 0;
    startBookWord(0, runToken, showPrompt);
  }

  function startBookWord(index, runToken = state.runToken, showPrompt = false) {
    if (!isLiveRun(runToken)) return;

    const word = state.bookWords[index];
    if (!word) {
      startReferencePhase(runToken);
      return;
    }

    state.currentWordIndex = index;
    setCurrentItem({
      kind: "book",
      display: word,
      expected: normalizeLetters(word),
      phase: "book"
    });
    setPhaseLabel("Book");
    renderKeyboard("letters");
    renderCurrentItem("enter");

    if (showPrompt) {
      showPlayAreaPrompt({ title: "Type the Book!", variant: "book", runToken });
    }
  }

  async function startReferencePhase(runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    if (!state.referenceExpectedDigits.length) {
      startAfterReferencePhase(runToken);
      return;
    }

    const showPrompt = !state.referenceIntroShown;
    state.referenceIntroShown = true;

    setCurrentItem({
      kind: "reference",
      display: state.referenceChars.join(""),
      expected: state.referenceExpectedDigits.join(""),
      chars: state.referenceChars,
      digitPositions: state.referenceDigitPositions,
      phase: "reference"
    });
    setPhaseLabel("Chapter & Verse");
    renderKeyboard("numbers");
    renderCurrentItem("enter");

    if (showPrompt) {
      showPlayAreaPrompt({ title: "Type the Numbers!", variant: "numbers", runToken });
    }
  }

  function startAfterReferencePhase(runToken = state.runToken) {
    if (selectedMode === "beginner") {
      startCocoonPhase(runToken);
      return;
    }

    startMegaPillarPhase(runToken);
  }


  async function startMegaPillarPhase(runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    renderKeyboard("letters");

    if (!state.megaIntroShown) {
      state.megaIntroShown = true;

      await showTyperPopup({
        title: "Mega-pillar<br>Time!",
        variant: "mega"
      });
      if (!isLiveRun(runToken)) return;
    }

    const mega = makeMegaParts(megaVerseText());

    if (!mega.expected) {
      finishRun(runToken);
      return;
    }

    setCurrentItem({
      kind: "mega",
      display: mega.expected,
      expected: mega.expected,
      parts: mega.parts,
      phase: "mega"
    });

    setPhaseLabel("Mega-pillar");
    renderKeyboard("letters");
    renderCurrentItem("enter");
  }

  async function showTyperPopup({ title, subtitle = "", variant = "word" } = {}) {
    const runToken = state.runToken;
    const main = document.getElementById("vtMain");
    if (!main || !isLiveRun(runToken)) return;

    state.acceptingInput = false;
    state.transitionLocked = true;
    state.entranceDone = false;
    state.pendingCompleteAfterEntrance = false;

    main.innerHTML = `
      <button class="vt-popup-scene no-zoom" id="vtPopupScene" type="button" aria-label="Continue">
        <div class="vt-popup-card vt-popup-${escapeHtml(variant)}">
          <div class="vt-popup-title">${escapeHtml(title).replace(/&lt;br&gt;/g, "<br>")}</div>
          ${subtitle ? `<div class="vt-popup-subtitle">${escapeHtml(subtitle)}</div>` : ""}

        </div>
      </button>
    `;

    playPopupSound();

    await waitForPopupDismiss(2500, runToken);

    if (!isLiveRun(runToken)) return;
  }

  function waitForPopupDismiss(ms = 3000, runToken = state.runToken) {
    return new Promise(resolve => {
      let done = false;
      let timeoutId = null;

      const finish = () => {
        if (!isLiveRun(runToken)) return;
        primeHtmlAudio();
        unlockAudio();
        if (done) return;
        done = true;
        clearTrackedTimeout(timeoutId);

        const popup = document.getElementById("vtPopupScene");
        if (popup) {
          popup.removeEventListener("click", finish);
          popup.classList.add("is-leaving");
        }

        trackedTimeout(resolve, 180, runToken);
      };

      const popup = document.getElementById("vtPopupScene");
      if (popup) {
        popup.addEventListener("click", finish);
      }

      timeoutId = trackedTimeout(finish, ms, runToken);
    });
  }

  function showPlayAreaPrompt({ title, variant = "book", runToken = state.runToken, ms = 1700, playSound = true } = {}) {
    if (!isLiveRun(runToken)) return;

    const scene = document.querySelector(".vt-word-scene");
    if (!scene) return;

    const existing = document.getElementById("vtPlayAreaPrompt");
    if (existing) existing.remove();

    const prompt = document.createElement("div");
    prompt.className = `vt-play-area-prompt vt-play-area-prompt-${variant}`;
    prompt.id = "vtPlayAreaPrompt";
    prompt.textContent = title;
    prompt.setAttribute("aria-hidden", "true");
    scene.appendChild(prompt);

    if (playSound) playPopupSound();

    if (ms === null) return;

    trackedTimeout(() => {
      if (!isLiveRun(runToken) || !prompt.isConnected) return;
      prompt.classList.add("is-leaving");
      trackedTimeout(() => {
        if (prompt.isConnected) prompt.remove();
      }, 220, runToken);
    }, ms, runToken);
  }

  function renderCocoonPrompt(runToken = state.runToken) {
    const wrap = document.getElementById("vtKeyboardWrap");
    if (!wrap || !isLiveRun(runToken)) return;

    wrap.innerHTML = `
      <div class="vt-cocoon-prompt-wrap">
        <button class="vt-cocoon-prompt no-zoom" id="vtCocoonPrompt" type="button">
          Tap the Cocoon!
        </button>
      </div>
    `;

    const prompt = document.getElementById("vtCocoonPrompt");
    if (prompt) {
      prompt.onclick = () => {
        createChunkAudioElement();
        primeHtmlAudio();
        unlockAudio();
        openCocoon(runToken);
      };
    }
  }

  function playPopupSound() {
    const runToken = state.runToken;
    playTone({ midi: 67, duration: 0.10, volume: POPUP_TONE_VOLUME_1, type: "triangle" });
    trackedTimeout(() => {
      playTone({ midi: 72, duration: 0.13, volume: POPUP_TONE_VOLUME_2, type: "triangle" });
    }, 58, runToken);
  }

  function playCocoonOpenSound() {
    const runToken = state.runToken;
    playTone({ midi: 60, duration: 0.10, volume: 0.32, type: "triangle" });
    trackedTimeout(() => playTone({ midi: 64, duration: 0.11, volume: 0.34, type: "triangle" }), 82, runToken);
    trackedTimeout(() => playTone({ midi: 67, duration: 0.12, volume: 0.36, type: "triangle" }), 164, runToken);
    trackedTimeout(() => playTone({ midi: 72, duration: 0.18, volume: 0.40, type: "triangle" }), 248, runToken);
  }

  function playFlapSound() {
    const runToken = state.runToken;
    const base = 76 + (state.butterflyFlaps % 3) * 2;
    playTone({ midi: base, duration: 0.09, volume: 0.28, type: "triangle" });
    trackedTimeout(() => playTone({ midi: base + 7, duration: 0.11, volume: 0.24, type: "triangle" }), 52, runToken);
  }

  function playButterflyFlyAwaySound() {
    const runToken = state.runToken;
    playTone({ midi: 72, duration: 0.08, volume: 0.28, type: "triangle" });
    trackedTimeout(() => playTone({ midi: 76, duration: 0.08, volume: 0.30, type: "triangle" }), 70, runToken);
    trackedTimeout(() => playTone({ midi: 79, duration: 0.10, volume: 0.32, type: "triangle" }), 140, runToken);
    trackedTimeout(() => playTone({ midi: 84, duration: 0.18, volume: 0.34, type: "triangle" }), 220, runToken);
  }

  function clearKeyboardForFinale() {
    const wrap = document.getElementById("vtKeyboardWrap");
    if (!wrap) return;

    wrap.innerHTML = `<div class="vt-finale-keyboard-placeholder" aria-hidden="true"></div>`;
  }

  function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randomColorExcept(excluded = []) {
    const colors = [
      "#ff5a51",
      "#ffa351",
      "#ffc751",
      "#a7cb6f",
      "#40b9c5",
      "#7f66c6"
    ];

    const blocked = new Set(excluded.map(color => String(color).toLowerCase()));
    const available = colors.filter(color => !blocked.has(color.toLowerCase()));

    return randomChoice(available.length ? available : colors);
  }

  function makeButterflyColors() {
    const wingTop = randomColorExcept();
    const wingBottom = randomColorExcept();

    return {
      wingTop,
      wingBottom,
      bottomDecoration: randomColorExcept([wingBottom]),
      bigTopDecoration: randomColorExcept([wingTop]),
      smallTopDecoration: randomColorExcept([wingTop]),
      bodyColor: randomColorExcept([wingTop, wingBottom]),
      bodyDarkFirst: Math.random() < 0.5
    };
  }

  function setSvgPartColor(svgDoc, id, color) {
    const el = svgDoc.getElementById(id);
    if (!el) return;

    el.setAttribute("fill", color);

    const style = el.getAttribute("style") || "";
    const nextStyle = style
      .replace(/fill\s*:\s*[^;]+;?/gi, "")
      .replace(/fill-opacity\s*:\s*[^;]+;?/gi, "")
      .trim();

    el.setAttribute("style", `${nextStyle ? `${nextStyle};` : ""}fill:${color};fill-opacity:1;`);
  }

  function colorButterflySvg(svgText) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = svgDoc.querySelector("svg");

    if (!svg) return svgText;

    const colors = makeButterflyColors();
    state.butterflyColors = colors;

    svg.classList.add("vt-butterfly-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    setSvgPartColor(svgDoc, "antenna", "#333333");
    setSvgPartColor(svgDoc, "head", "#ffc751");
    setSvgPartColor(svgDoc, "eye-white", "#ffffff");
    setSvgPartColor(svgDoc, "eye-pupil", "#333333");

    setSvgPartColor(svgDoc, "wing-top-left", colors.wingTop);
    setSvgPartColor(svgDoc, "wing-top-right", colors.wingTop);

    setSvgPartColor(svgDoc, "wing-bottom-left", colors.wingBottom);
    setSvgPartColor(svgDoc, "wing-bottom-right", colors.wingBottom);

    setSvgPartColor(svgDoc, "wing-decoration-bottom-left", colors.bottomDecoration);
    setSvgPartColor(svgDoc, "wing-decoration-bottom-right", colors.bottomDecoration);

    setSvgPartColor(svgDoc, "wing-decoration-big-top-left", colors.bigTopDecoration);
    setSvgPartColor(svgDoc, "wing-decoration-big-top-right", colors.bigTopDecoration);

    setSvgPartColor(svgDoc, "wing-decoration-small-top-left", colors.smallTopDecoration);
    setSvgPartColor(svgDoc, "wing-decoration-small-top-right", colors.smallTopDecoration);

    const bodyColor1 = colors.bodyDarkFirst ? "#333333" : colors.bodyColor;
    const bodyColor2 = colors.bodyDarkFirst ? colors.bodyColor : "#333333";

    setSvgPartColor(svgDoc, "body-segment-1", bodyColor1);
    setSvgPartColor(svgDoc, "body-segment-2", bodyColor2);

    return new XMLSerializer().serializeToString(svg);
  }

  async function loadButterflySvg() {
    if (state.butterflySvg) return state.butterflySvg;

    try {
      const res = await fetch(BUTTERFLY_IMAGE_FILE, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawSvg = await res.text();
      state.butterflySvg = colorButterflySvg(rawSvg);
      return state.butterflySvg;
    } catch (err) {
      console.warn("Verse Typer could not load butterfly SVG", err);

      state.butterflySvg = `
        <svg class="vt-butterfly-svg" viewBox="0 0 220 180" aria-hidden="true" focusable="false">
          <ellipse cx="78" cy="82" rx="58" ry="42" fill="#ff5a51"/>
          <ellipse cx="142" cy="82" rx="58" ry="42" fill="#40b9c5"/>
          <ellipse cx="110" cy="92" rx="18" ry="54" fill="#333333"/>
          <circle cx="110" cy="42" r="18" fill="#ffc751"/>
        </svg>
      `;
      return state.butterflySvg;
    }
  }

  function renderFlapButton() {
    const wrap = document.getElementById("vtKeyboardWrap");
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="vt-flap-wrap">
        <button class="vt-flap-button no-zoom" id="vtFlapButton" type="button">
          Flap!
        </button>
      </div>
    `;

    const btn = document.getElementById("vtFlapButton");
    if (btn) {
      btn.onclick = () => {
        createChunkAudioElement();
        primeHtmlAudio();
        unlockAudio();
        flapButterfly();
      };
    }
  }

  async function startCocoonPhase(runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    state.currentItem = null;
    state.acceptingInput = false;
    state.transitionLocked = true;
    state.entranceDone = false;
    state.pendingCompleteAfterEntrance = false;
    state.phaseLabel = "Cocoon";
    renderHud();
    clearKeyboardForFinale();

    await preloadImage(COCOON_IMAGE_FILE);
    if (!isLiveRun(runToken)) return;

    renderCocoonScene(runToken);
    renderCocoonPrompt(runToken);
    playPopupSound();
  }

  function renderCocoonScene(runToken = state.runToken) {
    const main = document.getElementById("vtMain");
    if (!main || !isLiveRun(runToken)) return;

    main.innerHTML = `
      <div class="vt-cocoon-scene">
        <button class="vt-cocoon-button no-zoom" id="vtCocoonButton" type="button" aria-label="Open the cocoon">
          <span class="vt-cocoon-hanger" aria-hidden="true">
            <span class="vt-cocoon-twig"></span>
            <img class="vt-cocoon-img" src="${escapeHtml(COCOON_IMAGE_FILE)}" alt="">
          </span>
        </button>
        <div class="vt-poof" id="vtPoof" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
    `;

    const cocoonButton = document.getElementById("vtCocoonButton");
    if (cocoonButton) {
      cocoonButton.onclick = () => openCocoon(runToken);
    }
  }

  function openCocoon(runToken = state.runToken) {
    const cocoonButton = document.getElementById("vtCocoonButton");
    const poof = document.getElementById("vtPoof");

    if (!isLiveRun(runToken) || !cocoonButton || cocoonButton.classList.contains("is-opening")) return;

    cocoonButton.classList.add("is-opening");
    clearKeyboardForFinale();
    playCocoonOpenSound();

    trackedTimeout(() => {
      if (poof) poof.classList.add("is-active");
    }, 150, runToken);

    trackedTimeout(() => {
      renderButterflyScene(runToken);
    }, 760, runToken);
  }

  async function renderButterflyScene(runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    state.currentItem = null;
    state.acceptingInput = false;
    state.transitionLocked = true;
    state.butterflyFlaps = 0;
    state.phaseLabel = "Butterfly";
    renderHud();

    const main = document.getElementById("vtMain");
    if (!main) return;

    const svg = await loadButterflySvg();
    if (!isLiveRun(runToken)) return;

    main.innerHTML = `
      <div class="vt-butterfly-scene" id="vtButterflyScene">
        <div class="vt-butterfly-stage" id="vtButterflyStage">
          ${svg}
        </div>
      </div>
    `;

    renderFlapButton();
  }

  function flapButterfly() {
    const runToken = state.runToken;
    const scene = document.getElementById("vtButterflyScene");
    const butterfly = document.querySelector(".vt-butterfly-svg");
    const btn = document.getElementById("vtFlapButton");

    if (!isLiveRun(runToken) || !scene || !butterfly || scene.classList.contains("is-flying-away")) return;

    state.butterflyFlaps += 1;
    playFlapSound();

    butterfly.classList.remove("is-flapping");
    void butterfly.getBoundingClientRect();
    butterfly.classList.add("is-flapping");

    if (btn) {
      const remaining = Math.max(0, BUTTERFLY_FLAPS_TO_FINISH - state.butterflyFlaps);
      btn.textContent = "Flap!";
    }

    if (state.butterflyFlaps >= BUTTERFLY_FLAPS_TO_FINISH) {
      trackedTimeout(() => flyButterflyAway(runToken), 260, runToken);
    }
  }

  function flyButterflyAway(runToken = state.runToken) {
    const scene = document.getElementById("vtButterflyScene");
    const butterfly = document.querySelector(".vt-butterfly-svg");
    const btn = document.getElementById("vtFlapButton");

    if (!isLiveRun(runToken) || !scene || !butterfly || scene.classList.contains("is-flying-away")) return;

    scene.classList.add("is-flying-away");
    butterfly.classList.remove("is-flapping");
    butterfly.classList.add("is-flying-away");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Whee!";
    }

    playButterflyFlyAwaySound();

    trackedTimeout(() => {
      finishRun(runToken);
    }, 1180, runToken);
  }

  function setCurrentItem(item) {
    state.currentItem = item;
    state.typedIndex = 0;
    state.wordOffsetX = 0;
    const expectedLength = (item.expected || "").length;
    state.currentMelody = item.kind === "mega"
      ? chooseMegaMelodyForLength(expectedLength)
      : chooseMelodyForLength(expectedLength);
    state.revealed = false;
    state.advancedHintLevel = 0;

    if (selectedMode === "advanced" && item.kind === "word") {
      state.advancedHintWordsSeen += 1;
    }

    state.justTypedIndex = -1;
    state.justTypedSegmentIndex = -1;
    state.acceptingInput = false;
    state.transitionLocked = true;
    state.entranceDone = false;
    state.pendingCompleteAfterEntrance = false;
  }

  function finishEntranceVisual(item) {
    if (state.screen !== "game" || state.currentItem !== item) return;

    const travelLayer = document.getElementById("vtTravelLayer");
    const wordObject = document.getElementById("vtWordObject");

    if (travelLayer) {
      travelLayer.classList.remove("is-entering", "is-crawling");
    }

    if (wordObject) {
      wordObject.querySelectorAll(".vt-head, .vt-segment, .vt-tail").forEach(part => {
        part.style.removeProperty("--vt-wave-delay");
        delete part.dataset.vtWaveDelay;
      });
    }

    updateCaterpillarPosition();
  }


  function renderCurrentItem(animationState = "") {
    const main = document.getElementById("vtMain");
    if (!main || !state.currentItem) return;

    const item = state.currentItem;
    const glowClass = state.streak >= 20 ? "is-glow-strong" : state.streak >= 10 ? "is-glow" : "";
    const megaClass = item.kind === "mega" ? "is-mega-pillar" : "";

    main.innerHTML = `
      <div class="vt-word-scene">
        <div class="vt-word-window" id="vtWordWindow">
          <div class="vt-word-track" id="vtWordTrack" style="transform:translateX(${state.wordOffsetX}px)">
            <div class="vt-travel-layer" id="vtTravelLayer">
              <button class="vt-word-object ${skin.wordClass} ${glowClass} ${megaClass} no-zoom" id="vtWordObject" type="button" aria-label="Current word caterpillar">
                ${renderItemSegments(item)}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const wordObject = document.getElementById("vtWordObject");
    if (wordObject) {
      wordObject.onclick = () => {
        handleAdvancedHintTap(item);
      };
    }

    renderSparklesOnly();
    renderAdvancedHintPrompt(item);

    if (animationState === "enter" || animationState === "exit") {
      prepareTravelAnimation(animationState, item);
    } else {
      scheduleCaterpillarPositionUpdate();
    }

    if (animationState === "enter") {
      const runToken = state.runToken;

      trackedTimeout(() => {
        if (!isLiveRun(runToken) || state.currentItem !== item) return;

        state.acceptingInput = true;
        state.transitionLocked = false;
      }, ENTER_INPUT_MS, runToken);

      trackedTimeout(() => {
        if (!isLiveRun(runToken) || state.currentItem !== item) return;

        state.entranceDone = true;

        if (state.pendingCompleteAfterEntrance) {
          state.acceptingInput = false;
          state.transitionLocked = true;
          state.pendingCompleteAfterEntrance = false;
          completeCurrentItem();
          return;
        }

        state.acceptingInput = true;
        state.transitionLocked = false;

        finishEntranceVisual(item);
      }, ENTER_DONE_MS, runToken);
    }
  }

  function renderItemSegments(item) {
    if (item.kind === "reference") {
      const typedPositions = new Set(item.digitPositions.slice(0, state.typedIndex));
      const advancedHidden = selectedMode === "advanced";
      const fullReveal = !advancedHidden || state.revealed || state.advancedHintLevel >= 2;
      const hintedDigitIndex = advancedHidden
        && state.advancedHintLevel >= 1
        && item.expected.length
        ? Math.min(state.typedIndex, item.expected.length - 1)
        : -1;

      return `
        <span class="vt-head ${state.headShakeUntil > performance.now() ? "is-no" : ""}">${faceHtml()}</span>
        <span class="vt-body vt-reference-body">
          ${item.chars.map((char, index) => {
        const isDigit = /\d/.test(char);
        const typed = typedPositions.has(index);
        const just = index === state.justTypedSegmentIndex;
        const typeIndex = isDigit ? item.digitPositions.indexOf(index) : -1;
        const visible = !isDigit
          || fullReveal
          || typed
          || typeIndex === hintedDigitIndex;
        const dataAttr = typeIndex >= 0 ? ` data-vt-type-index="${typeIndex}"` : "";

        return `<span class="vt-segment ${isDigit ? "" : "is-fixed"} ${typed ? "is-typed" : ""} ${just ? "is-hop" : ""}"${dataAttr}>${visible ? escapeHtml(char) : ""}</span>`;
      }).join("")}
        </span>
        <span class="vt-tail ${tailStageClass()}"></span>
      `;
    }

    if (item.kind === "mega") {
      return `
        <span class="vt-head ${state.headShakeUntil > performance.now() ? "is-no" : ""}">${faceHtml()}</span>
        <span class="vt-body vt-mega-body">
          ${(item.parts || []).map(part => {
        if (part.kind === "space") {
          return `<span class="vt-space-segment" aria-hidden="true"></span>`;
        }

        const typed = part.typeIndex < state.typedIndex;
        const just = part.typeIndex === state.justTypedIndex;

        return `<span class="vt-segment ${typed ? "is-typed" : ""} ${just ? "is-hop" : ""}" data-vt-type-index="${part.typeIndex}">${escapeHtml(part.char)}</span>`;
      }).join("")}
        </span>
        <span class="vt-tail ${tailStageClass()}"></span>
      `;
    }

    const letters = item.expected.split("");
    const advancedHidden = selectedMode === "advanced";
    const fullReveal = !advancedHidden || state.revealed || state.advancedHintLevel >= 2;
    const hintedIndex = advancedHidden && state.advancedHintLevel >= 1 && letters.length
      ? Math.min(state.typedIndex, letters.length - 1)
      : -1;

    return `
      <span class="vt-head ${state.headShakeUntil > performance.now() ? "is-no" : ""}">${faceHtml()}</span>
      <span class="vt-body">
        ${letters.map((letter, index) => {
      const typed = index < state.typedIndex;
      const just = index === state.justTypedIndex;
      const visible = fullReveal || typed || index === hintedIndex;
      return `<span class="vt-segment ${typed ? "is-typed" : ""} ${just ? "is-hop" : ""}" data-vt-type-index="${index}">${visible ? escapeHtml(letter) : ""}</span>`;
    }).join("")}
      </span>
      <span class="vt-tail ${tailStageClass()}"></span>
    `;
  }

  function scheduleCaterpillarPositionUpdate(options = {}) {
    requestAnimationFrame(() => {
      updateCaterpillarPosition(options);
    });
  }

  function prepareTravelAnimation(animationState, item) {
    if (animationState !== "enter" && animationState !== "exit") return;

    requestAnimationFrame(() => {
      if (state.screen !== "game" || state.currentItem !== item) return;

      updateCaterpillarPosition({ instant: true });
      updateTravelDistances();

      const travelLayer = document.getElementById("vtTravelLayer");
      if (!travelLayer) return;

      void travelLayer.offsetWidth;

      travelLayer.classList.add(
        animationState === "enter" ? "is-entering" : "is-exiting",
        "is-crawling"
      );

      if (animationState === "enter") {
        trackedTimeout(() => stopCrawlVisual(item), ENTER_CRAWL_STOP_MS);
      }

      startRippleDelayLoop(animationState === "enter" ? ENTER_CRAWL_STOP_MS : EXIT_DONE_MS, item);
    });
  }

  function updateTravelDistances() {
    const windowEl = document.getElementById("vtWordWindow");
    const travelLayer = document.getElementById("vtTravelLayer");

    if (!windowEl || !travelLayer) return;

    const windowRect = windowEl.getBoundingClientRect();
    const travelRect = travelLayer.getBoundingClientRect();
    const buffer = 28;

    const enterX = Math.ceil(windowRect.right - travelRect.left + buffer);
    const exitX = Math.floor(windowRect.left - travelRect.right - buffer);

    travelLayer.style.setProperty("--vt-enter-x", `${enterX}px`);
    travelLayer.style.setProperty("--vt-exit-x", `${exitX}px`);
  }

  function stopCrawlVisual(item) {
    if (state.screen !== "game" || state.currentItem !== item) return;

    const travelLayer = document.getElementById("vtTravelLayer");
    const wordObject = document.getElementById("vtWordObject");

    if (travelLayer) {
      travelLayer.classList.remove("is-crawling");
    }

    if (wordObject) {
      wordObject.querySelectorAll(".vt-head, .vt-segment, .vt-tail").forEach(part => {
        part.style.removeProperty("--vt-wave-delay");
        delete part.dataset.vtWaveDelay;
      });
    }
  }

  function startRippleDelayLoop(durationMs, item) {
    const startedAt = performance.now();

    const tick = () => {
      if (state.screen !== "game" || state.currentItem !== item) return;

      updateRippleDelays();

      if (performance.now() - startedAt < durationMs - 40) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  function updateRippleDelays() {
    const windowEl = document.getElementById("vtWordWindow");
    const wordEl = document.getElementById("vtWordObject");

    if (!windowEl || !wordEl) return;

    const windowRect = windowEl.getBoundingClientRect();
    const parts = Array.from(wordEl.querySelectorAll(".vt-head, .vt-segment, .vt-tail"));

    const visibleParts = parts
      .map(part => {
        const rect = part.getBoundingClientRect();
        return { part, rect };
      })
      .filter(({ rect }) => rect.right > windowRect.left && rect.left < windowRect.right)
      .sort((a, b) => a.rect.left - b.rect.left);

    visibleParts.forEach(({ part }, visibleIndex) => {
      const nextDelay = `${visibleIndex * RIPPLE_DELAY_MS}ms`;

      if (part.dataset.vtWaveDelay !== nextDelay) {
        part.dataset.vtWaveDelay = nextDelay;
        part.style.setProperty("--vt-wave-delay", nextDelay);
      }
    });

    parts.forEach(part => {
      if (!visibleParts.some(item => item.part === part)) {
        if (part.dataset.vtWaveDelay !== "0ms") {
          part.dataset.vtWaveDelay = "0ms";
          part.style.setProperty("--vt-wave-delay", "0ms");
        }
      }
    });
  }

  function setTrackTransform(trackEl, value, { instant = false } = {}) {
    if (!trackEl) return;

    if (instant) {
      trackEl.classList.add("is-positioning");
      trackEl.style.transform = value;

      requestAnimationFrame(() => {
        trackEl.classList.remove("is-positioning");
      });

      return;
    }

    trackEl.style.transform = value;
  }


  function updateCaterpillarPosition(options = {}) {
    if (state.screen !== "game" || !state.currentItem) return;

    const instant = !!options.instant;

    const windowEl = document.getElementById("vtWordWindow");
    const trackEl = document.getElementById("vtWordTrack");
    const wordEl = document.getElementById("vtWordObject");

    if (!windowEl || !trackEl || !wordEl) return;

    const windowWidth = windowEl.clientWidth;
    const wordWidth = Math.max(
      wordEl.scrollWidth || 0,
      wordEl.offsetWidth || 0
    );

    if (!windowWidth || !wordWidth) return;

    const overflowing = wordWidth > windowWidth + 8;

    windowEl.classList.toggle("is-overflowing", overflowing);

    if (!overflowing) {
      state.wordOffsetX = 0;
      setTrackTransform(trackEl, "translateX(0px)", { instant });
      updateRippleDelays();
      return;
    }

    const maxIndex = Math.max(0, (state.currentItem.expected || "").length - 1);
    const targetIndex = Math.min(state.typedIndex, maxIndex);
    const targetSegment = wordEl.querySelector(`[data-vt-type-index="${targetIndex}"]`);

    if (!targetSegment) return;

    const segmentLeft = targetSegment.offsetLeft;
    const segmentRight = segmentLeft + targetSegment.offsetWidth;

    const leftSafe = Math.max(12, windowWidth * 0.12);
    const rightSafe = Math.max(82, windowWidth * 0.76);

    const visibleLeft = -state.wordOffsetX;
    const visibleRight = visibleLeft + windowWidth;

    let desiredVisibleLeft = visibleLeft;

    if (segmentRight > visibleLeft + rightSafe) {
      desiredVisibleLeft = segmentRight - rightSafe;
    } else if (segmentLeft < visibleLeft + leftSafe) {
      desiredVisibleLeft = segmentLeft - leftSafe;
    }

    const maxVisibleLeft = Math.max(0, wordWidth - windowWidth + 10);
    desiredVisibleLeft = clampNumber(desiredVisibleLeft, 0, maxVisibleLeft);

    const nextOffset = -Math.round(desiredVisibleLeft);

    state.wordOffsetX = nextOffset;
    setTrackTransform(trackEl, `translateX(${state.wordOffsetX}px)`, { instant });
    updateRippleDelays();
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function streakStage() {
    return clampNumber(Math.floor(state.streak / 10), 0, 4);
  }

  function tailStageClass() {
    return `is-tail-stage-${streakStage()}`;
  }

  function headImageFile() {
    return headImageFileForStage(streakStage());
  }

  function faceHtml() {
    const stage = streakStage();

    return `
      <img
        class="vt-head-img"
        src="${escapeHtml(headImageFile())}"
        alt=""
        aria-hidden="true"
        draggable="false"
        data-vt-head-stage="${stage}"
      >
    `;
  }

  function handleKey(rawKey) {
    if (state.paused || state.transitionLocked || !state.acceptingInput || !state.currentItem) return;
    if (state.currentItem.kind === "reference" && !/^\d$/.test(rawKey)) return;
    if (state.currentItem.kind !== "reference" && !/^[A-Z]$/.test(rawKey)) return;

    const expected = state.currentItem.expected[state.typedIndex];
    if (!expected) return;

    if (rawKey === expected) {
      handleCorrectKey(rawKey);
    } else {
      handleWrongKey(rawKey);
    }
  }

  function handleCorrectKey(key) {
    const runToken = state.runToken;
    playCorrectLetterSound();

    const item = state.currentItem;
    const typedTypeIndex = state.typedIndex;

    state.correctLetters += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.keyFlash = key;
    state.keyFlashBad = false;

    if (item.kind === "reference") {
      state.justTypedSegmentIndex = item.digitPositions[state.typedIndex];
      state.justTypedIndex = -1;
    } else {
      state.justTypedIndex = state.typedIndex;
      state.justTypedSegmentIndex = -1;
    }

    state.typedIndex += 1;

    if (shouldShowStreakBadge(state.streak)) {
      addStreakBadge(state.streak);
    }

    if (state.streak >= 10) {
      addSparkleBurstFromTypedSegment(typedTypeIndex);
    }

    renderHud();
    renderKeyboard(item.kind === "reference" ? "numbers" : "letters");
    renderCurrentItem();

    trackedTimeout(() => {
      if (!isLiveRun(runToken) || state.currentItem !== item) return;

      const travelLayer = document.getElementById("vtTravelLayer");

      if ((!state.acceptingInput && state.transitionLocked) || travelLayer?.classList.contains("is-exiting")) return;

      state.keyFlash = "";
      state.justTypedIndex = -1;
      state.justTypedSegmentIndex = -1;
      renderKeyboard(item.kind === "reference" ? "numbers" : "letters");
      renderCurrentItem();
    }, 260, runToken);

    if (state.typedIndex >= item.expected.length) {
      state.acceptingInput = false;
      state.transitionLocked = true;
      playWordDoneSound();

      if (!state.entranceDone) {
        state.pendingCompleteAfterEntrance = true;
        return;
      }

      trackedTimeout(() => completeCurrentItem(), 420, runToken);
    }
  }

  function handleWrongKey(key) {
    const runToken = state.runToken;
    const item = state.currentItem;

    state.typos += 1;
    state.streak = 0;
    state.keyFlash = key;
    state.keyFlashBad = true;
    state.headShakeUntil = performance.now() + 420;

    playWrongSound();
    renderHud();
    renderKeyboard(state.currentItem.kind === "reference" ? "numbers" : "letters");
    renderCurrentItem();

    trackedTimeout(() => {
      if (!isLiveRun(runToken) || state.currentItem !== item) return;

      state.keyFlash = "";
      state.headShakeUntil = 0;
      renderKeyboard(state.currentItem?.kind === "reference" ? "numbers" : "letters");
      renderCurrentItem();
    }, 430, runToken);
  }

  function completeCurrentItem() {
    const runToken = state.runToken;
    const item = state.currentItem;
    if (!isLiveRun(runToken) || !item) return;

    state.acceptingInput = false;
    state.transitionLocked = true;
    state.pendingCompleteAfterEntrance = false;

    renderCurrentItem("exit");

    trackedTimeout(() => {
      if (!isLiveRun(runToken) || state.currentItem !== item) return;

      if (item.kind === "word") {
        startChunkWord(state.currentChunkIndex, state.currentWordIndex + 1, runToken);
        return;
      }

      if (item.kind === "book") {
        startBookWord(state.currentWordIndex + 1, runToken);
        return;
      }

      if (item.kind === "reference") {
        startAfterReferencePhase(runToken);
        return;
      }

      if (item.kind === "mega") {
        startCocoonPhase(runToken);
      }
    }, EXIT_DONE_MS, runToken);
  }

  function fitReviewText(runToken = state.runToken) {
    const card = document.getElementById("vtReviewCard");
    const text = document.getElementById("vtReviewText");

    if (!card || !text || !isLiveRun(runToken)) return;

    text.style.fontSize = "";
    text.style.maxWidth = "";

    requestAnimationFrame(() => {
      if (!card.isConnected || !text.isConnected || !isLiveRun(runToken)) return;

      const cardStyle = window.getComputedStyle(card);
      const textStyle = window.getComputedStyle(text);
      const paddingX = parseFloat(cardStyle.paddingLeft) + parseFloat(cardStyle.paddingRight);
      const paddingY = parseFloat(cardStyle.paddingTop) + parseFloat(cardStyle.paddingBottom);
      const availableWidth = Math.max(0, card.clientWidth - paddingX);
      const availableHeight = Math.max(0, card.clientHeight - paddingY);
      const minSize = parseFloat(textStyle.getPropertyValue("--vt-review-min-font-size")) || 26;
      let size = parseFloat(textStyle.fontSize) || 34;

      text.style.maxWidth = `${availableWidth}px`;

      const overflows = () => {
        return text.scrollWidth > availableWidth + 1
          || text.scrollHeight > availableHeight + 1;
      };

      while (size > minSize && overflows()) {
        size = Math.max(minSize, size - 2);
        text.style.fontSize = `${size}px`;
      }
    });
  }

  async function startChunkReview(chunkIndex, runToken = state.runToken) {
    if (!isLiveRun(runToken)) return;

    const chunk = state.chunks[chunkIndex];
    if (!chunk) {
      startBookPhase(runToken);
      return;
    }

    state.acceptingInput = false;
    state.transitionLocked = true;
    setPhaseLabel(`Listen ${chunkIndex + 1}/${state.chunks.length}`);
    renderKeyboard("letters");

    const main = document.getElementById("vtMain");
    if (main) {
      main.innerHTML = `
        <div class="vt-review-scene">

          <div class="vt-review-card" id="vtReviewCard">
            <div class="vt-review-text" id="vtReviewText">${escapeHtml(chunk.text)}</div>
          </div>
        </div>
      `;

      fitReviewText(runToken);
    }

    await sleep(260, runToken);
    if (!isLiveRun(runToken)) return;

    await playChunkAudio(chunk.audioFile, runToken);
    if (!isLiveRun(runToken)) return;

    await sleep(420, runToken);
    if (!isLiveRun(runToken)) return;

    startChunkWord(chunkIndex + 1, 0, runToken);
  }

  function stopAllAudio() {
    clearSleeps();

    const audio = chunkAudioEl || chunkAudio;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        htmlAudioPrimed = false;
        htmlAudioPrimePromise = null;
      } catch (err) { }
    }

    chunkAudio = chunkAudioEl;
  }

  function playChunkAudio(file, runToken = state.runToken) {
    if (!file) return sleep(900, runToken);

    return new Promise(resolve => {
      const audio = createChunkAudioElement();
      let done = false;
      let fallbackId = null;

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.oncanplay = null;
        audio.oncanplaythrough = null;
        clearTrackedTimeout(fallbackId);
      };

      const finish = (reason = "ended") => {
        if (done) return;
        done = true;
        cleanup();
        audioDebug("chunk finish", reason, file);
        resolve();
      };

      try {
        audioDebug("chunk start", file);

        audio.pause();
        audio.currentTime = 0;
        audio.muted = muted;
        audio.volume = 1;
        audio.src = file;
        audio.load();

        audio.onended = () => finish("ended");

        audio.onerror = () => {
          console.warn("Verse Typer chunk audio missing or failed", file, audio.error);
          finish("error");
        };

        const tryPlay = () => {
          audioDebug("chunk tryPlay", {
            file,
            readyState: audio.readyState,
            networkState: audio.networkState,
            muted: audio.muted
          });

          const playPromise = audio.play();

          if (playPromise?.then) {
            playPromise
              .then(() => {
                audioDebug("chunk play resolved", file);
              })
              .catch(err => {
                console.warn("Verse Typer chunk audio could not play", file, err);
                finish("play rejected");
              });
          }
        };

        if (audio.readyState >= 3) {
          tryPlay();
        } else {
          audio.oncanplay = tryPlay;
          audio.oncanplaythrough = tryPlay;
        }

        fallbackId = trackedTimeout(() => {
          if (!done) {
            console.warn("Verse Typer chunk audio timed out", file, {
              readyState: audio.readyState,
              networkState: audio.networkState
            });
            finish("timeout");
          }
        }, 9000, runToken);
      } catch (err) {
        console.warn("Verse Typer chunk audio failed", file, err);
        finish("exception");
      }
    });
  }

  function shouldShowStreakBadge(streak) {
    return streak === 5
      || streak === 10
      || streak === 15
      || streak === 20
      || (streak >= 30 && streak % 10 === 0);
  }

  function streakBadgeTier(streak) {
    if (streak >= 30) return "rainbow";
    if (streak >= 20) return "purple";
    if (streak >= 15) return "blue";
    if (streak >= 10) return "green";
    return "red";
  }

  function addStreakBadge(streak) {
    const runToken = state.runToken;
    const id = `badge-${Date.now()}-${Math.random()}`;
    const tier = streakBadgeTier(streak);

    state.badges.push({
      id,
      text: `${streak} STREAK!`,
      className: `is-streak-pop-${tier}`
    });

    renderBadgesOnly();

    trackedTimeout(() => {
      state.badges = state.badges.filter(item => item.id !== id);
      renderBadgesOnly();
    }, 1150, runToken);
  }

  function addSparkleBurstFromTypedSegment(typeIndex) {
    const sparkleLayer = document.getElementById("vtSparkleLayer");
    const segment = document.querySelector(`[data-vt-type-index="${typeIndex}"]`);

    if (!sparkleLayer || !segment) return;

    const layerRect = sparkleLayer.getBoundingClientRect();
    const segmentRect = segment.getBoundingClientRect();

    const originX = segmentRect.left + segmentRect.width / 2 - layerRect.left;
    const originY = segmentRect.top + segmentRect.height / 2 - layerRect.top;

    const stage = streakStage();
    const count = stage >= 2 ? 10 : 6;
    const baseDistance = stage >= 2 ? 74 : 52;
    const sparkleChars = ["✦", "✧", "★"];

    for (let i = 0; i < count; i += 1) {
      const angle = (-Math.PI / 2) + ((Math.PI * 2) * i / count) + (Math.random() * 0.34 - 0.17);
      const distance = baseDistance * (0.72 + Math.random() * 0.46);
      const delay = Math.random() * 45;

      const spark = document.createElement("span");
      spark.className = "vt-sparkle";
      spark.setAttribute("aria-hidden", "true");
      spark.textContent = sparkleChars[i % sparkleChars.length];

      spark.style.left = `${originX.toFixed(1)}px`;
      spark.style.top = `${originY.toFixed(1)}px`;
      spark.style.setProperty("--vt-dx", `${(Math.cos(angle) * distance).toFixed(1)}px`);
      spark.style.setProperty("--vt-dy", `${(Math.sin(angle) * distance).toFixed(1)}px`);
      spark.style.animationDelay = `${delay}ms`;

      sparkleLayer.appendChild(spark);

      trackedTimeout(() => {
        spark.remove();
      }, 820);
    }
  }

  function renderBadgesAndSparkles() {
    renderBadgesOnly();
    renderSparklesOnly();
  }

  function renderBadgesOnly() {
    const badgeLayer = document.getElementById("vtBadgeLayer");
    if (!badgeLayer) return;

    badgeLayer.innerHTML = state.badges.map(badge => `
        <div class="vt-streak-badge ${escapeHtml(badge.className || "")}">${escapeHtml(badge.text)}</div>
      `).join("");
  }

  function renderSparklesOnly() {
    // Sparkles are appended as live DOM nodes so their CSS animation
    // does not restart when the caterpillar re-renders.
  }

  function correctPercentage() {
    const total = state.correctLetters + state.typos;
    if (!total) return 100;
    return Math.round((state.correctLetters / total) * 100);
  }

  async function finishRun(runToken = state.runToken) {
    if (!isLiveRun(runToken) || state.completed) return;
    state.completed = true;
    stopAllAudio();

    try {
      window.VerseGameBridge.markVersePracticed?.({ verseId: ctx.verseId });
    } catch (err) { }

    await sleep(260, runToken);
    if (state.runToken !== runToken) return;

    renderEnd();
  }

  function renderEnd() {
    state.screen = "end";
    clearSleeps();
    const pct = correctPercentage();

    window.VerseGameShell.renderCompleteScreen({
      app,
      title: "Verse Typed!",
      icon: GAME_ICON,
      iconHtml: GAME_ICON_HTML,
      statsHtml: `Correct typing: ${pct}%<br>Best streak: ${state.bestStreak}`,
      playAgainText: "Play Again",
      moreGamesText: "More Playground",
      backLabel: "Back to Verse Playground",
      theme: GAME_THEME,
      onPlayAgain: () => {
        setScreen("mode");
        createChunkAudioElement();
        primeHtmlAudio();
        unlockAudio();
      },
      onMoreGames: () => window.VerseGameBridge.exitGame(),
      onChangeVerse: () => window.VerseGameBridge.returnToTitle()
    });

    wireShellUiPopSounds();
  }

  function helpHtml() {
    return `
      Type each caterpillar word.<br><br>
      Advanced hides the letters, but you can tap the caterpillar for a hint.<br><br>
      Complete the Mega-Pillar by typing the entire verse in one go!
    `;
  }

  function setScreen(screen) {
    if (screen !== "game") {
      invalidateRun();
    }

    state.screen = screen;
    if (screen !== "game") {
      stopAllAudio();
    }
    if (screen === "intro") renderIntro();
    if (screen === "mode") renderMode();
  }


  document.addEventListener("pointerdown", () => {
    createChunkAudioElement();
  }, { capture: true, passive: true });
  window.addEventListener("resize", () => {
    scheduleCaterpillarPositionUpdate();
  });

  setScreen("intro");
})();
