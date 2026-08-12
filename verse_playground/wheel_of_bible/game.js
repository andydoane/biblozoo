(async function () {
  "use strict";

  const app = document.getElementById("app");
  if (app) app.classList.add("vm-shell");

  const shell = () => window.VerseGameShell || {};
  const bridge = () => window.VerseGameBridge || {};
  const ctx = await bridge().getVerseContext?.() || {
    verseId: "",
    verseText: "",
    verseRef: "",
    translation: "",
    attribution: ""
  };

  const GAME_ID = "wheel_of_bible";
  const GAME_TITLE = "Wheel of Bible";
  const GAME_ICON = "🎡";
  const GAME_ICON_HTML = window.VerseGameShell.gameIconImageHtmlForId(GAME_ID, GAME_ICON, `${GAME_TITLE} icon`);
  const WHEEL_BUTTON_IMAGE = "./wheel_of_bible_images/button_wheel.png";
  const WHEEL_FACE_IMAGE = "./wheel_of_bible_images/wheel_face.svg";
  const DOLLAR_BILL_IMAGE = "./wheel_of_bible_images/dollar_bill.png";
  const CLOCK_IMAGE = "./wheel_of_bible_images/clock.png";
  const MARQUEE_IMAGE = "./wheel_of_bible_images/marquee.svg";
  const BIBLE_BUX_SPIN_IMAGE_PREFIX = "./wheel_of_bible_images/wheel_of_bible_bible_bux_";
  const PRIZE_SPIN_IMAGE = "./wheel_of_bible_images/wheel_of_bible_prize.svg";
  const SPIN_RESULT_IMAGE_HOLD_MS = 1550;
  const SPIN_RESULT_IMAGE_LOAD_TIMEOUT_MS = 1400;
  const WHEEL_ICON_HTML = `<img class="wob-shell-title-icon" src="${WHEEL_BUTTON_IMAGE}" alt="" draggable="false">`;
  const WHEEL_BUTTON_HTML = `<img class="wob-wheel-button-img" src="${WHEEL_BUTTON_IMAGE}" alt="" draggable="false">`;
  const HELP_OVERLAY_ID = "wheelOfBibleHelpOverlay";
  const MENU_OVERLAY_ID = "wheelOfBibleGameMenuOverlay";

  const GAME_THEME = {
    bg: "#40b9c5",
    accent: "#2f7a32",
    helpTitleBg: "#40b9c5",
    helpTitleColor: "#ffffff",
    helpCloseBg: "#ff5a51",
    helpCloseColor: "#ffffff"
  };

  const SILENCE_AUDIO_FILE = "../../verse_audio/silence.mp3";
  const WEB_AUDIO_MASTER_VOLUME = 0.82;

  const WORD_COLORS = [
    "#ffc751", "#a7cb6f", "#40b9c5", "#ff9e3d",
    "#bda0ff", "#ff8fb9", "#8fd7ff", "#ffe382"
  ];

  const WHEEL_VALUES = [
    { kind: "cash", label: "$800", value: 800 },
    { kind: "cash", label: "$1000", value: 1000 },
    { kind: "prize", label: "PRIZE" },
    { kind: "cash", label: "$100", value: 100 },
    { kind: "cash", label: "$300", value: 300 },
    { kind: "cash", label: "$500", value: 500 },
    { kind: "cash", label: "$700", value: 700 },
    { kind: "cash", label: "$900", value: 900 },
    { kind: "prize", label: "PRIZE" },
    { kind: "cash", label: "$200", value: 200 },
    { kind: "cash", label: "$400", value: 400 },
    { kind: "cash", label: "$600", value: 600 }
  ];

  const PRIZES = [
    { name: "Treasure Chest", value: 10000, image: "./wheel_of_bible_images/wheel_of_bible_prize_treasure.png" },
    { name: "Go-Kart", value: 6000, image: "./wheel_of_bible_images/wheel_of_bible_prize_go_kart.png" },
    { name: "Balloon Ride", value: 5500, image: "./wheel_of_bible_images/wheel_of_bible_prize_hot_air_balloon.png" },
    { name: "Brick Castle Set", value: 4500, image: "./wheel_of_bible_images/wheel_of_bible_prize_brick_castle.png" },
    { name: "Bounce Party", value: 4000, image: "./wheel_of_bible_images/wheel_of_bible_prize_bouncy_house.png" },
    { name: "Video Games", value: 3500, image: "./wheel_of_bible_images/wheel_of_bible_prize_video_game_console.png" },
    { name: "Water Park Day", value: 3000, image: "./wheel_of_bible_images/wheel_of_bible_prize_water_park.png" },
    { name: "Monster Truck", value: 2800, image: "./wheel_of_bible_images/wheel_of_bible_prize_monster_truck.png" },
    { name: "Robot Assistant", value: 2600, image: "./wheel_of_bible_images/wheel_of_bible_prize_robot.png" },
    { name: "Remote Control Car", value: 2400, image: "./wheel_of_bible_images/wheel_of_bible_prize_rc_car.png" },
    { name: "Science Lab", value: 2200, image: "./wheel_of_bible_images/wheel_of_bible_prize_science_lab.png" },
    { name: "Trading Cards", value: 2000, image: "./wheel_of_bible_images/wheel_of_bible_prize_trading_cards.png" },
    { name: "Art Kit", value: 1800, image: "./wheel_of_bible_images/wheel_of_bible_prize_art_kit.png" },
    { name: "Headphones", value: 1600, image: "./wheel_of_bible_images/wheel_of_bible_prize_headphones.png" },
    { name: "Juggling Lessons", value: 1400, image: "./wheel_of_bible_images/wheel_of_bible_prize_juggling_lessons.png" },
    { name: "Movie Night", value: 1300, image: "./wheel_of_bible_images/wheel_of_bible_prize_movie_night.png" },
    { name: "Taco Tuesday", value: 1100, image: "./wheel_of_bible_images/wheel_of_bible_prize_taco_tuesday.png" }
  ];

  const NORMAL_ROUND_MIN_SELECTED = 6;
  const NORMAL_ROUND_UNIQUE_RATIO = 0.55;
  const FINAL_ROUND_HIDE_RATIO = 0.5;
  const FINAL_ROUND_SECONDS = 60;

  // TESTING: Set to true only when you want the normal round to require 1 spin/letter.
  // Keep false for normal gameplay.
  const DEBUG_ONE_SPIN_ROUND = false;

  // Smart verse layout is the production/default board layout.
  // Set to false only if you need to compare against the old flex-wrap board.
  const USE_SMART_VERSE_ROWS = true;

  // Long-word hyphenation support.
  // The row planner may split long words into visual pieces when it improves fit.
  const USE_VISUAL_HYPHENATION_RENDER = true;
  const USE_SMART_HYPHENATION_PLANNER = true;
  const SMART_HYPHENATE_MIN_LETTERS = 11;


  const LOW_CONTENT_CHALLENGE_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "but", "by",
    "for", "from", "had", "has", "have", "he", "her", "him",
    "his", "i", "if", "in", "is", "it", "its", "me", "my",
    "of", "on", "or", "our", "she", "so", "that", "the",
    "their", "them", "then", "they", "this", "to", "up",
    "us", "was", "we", "were", "who", "with", "you", "your"
  ]);

  let muted = false;
  let audioCtx = null;
  let masterGain = null;
  let htmlAudioPrimed = false;
  let htmlAudioPrimePromise = null;
  let audioUnlocked = false;
  let audioUnlockPromise = null;
  let verseAudioEl = null;
  let sleepIds = [];
  let finalTimerId = null;
  let currentFitRaf = 0;

  const state = {
    screen: "intro",
    verseJson: null,
    verseText: ctx.verseText || "",
    verseRef: ctx.verseRef || "",
    translation: ctx.translation || "",
    tokens: [],
    words: [],
    uniqueLetters: [],
    echoParts: [],
    keywordSet: new Set(),
    hidePlanWords: [],
    revealedLetters: new Set(),
    challengeHistory: new Map(),
    referenceMeta: null,
    refChallengeDone: { book: false, chapter: false, verse: false },
    selectedSpin: null,
    lastSelectedLetter: "",
    turnCount: 0,
    baseCash: 0,
    prizeCash: 0,
    finalCash: 0,
    prizeEarnings: [],
    prizeBagIndices: [],
    nextPrize: null,
    currentChallenge: null,
    challengeInputIndex: 0,
    challengeFlash: "",
    challengeBad: false,
    challengeHintCount: 0,
    challengeHintIndexes: new Set(),
    finalStartedAt: 0,
    finalTimeLeft: FINAL_ROUND_SECONDS,
    finalSolvedWordIndices: new Set(),
    finalHiddenTileKeys: new Set(),
    finalFilledTileKeys: new Set(),
    finalActiveWord: null,
    finalInputIndex: 0,
    finalLetterStreak: 0,
    finalFlash: "",
    finalBad: false,
    completed: false
  };

  function escapeHtml(value) {
    if (shell().escapeHtml) return shell().escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clamp(value, min, max) {
    if (shell().clamp) return shell().clamp(value, min, max);
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  const sleep = (ms) => new Promise(resolve => {
    const id = setTimeout(() => {
      sleepIds = sleepIds.filter(item => item !== id);
      resolve();
    }, Math.max(0, Number(ms) || 0));
    sleepIds.push(id);
  });

  function clearSleeps() { sleepIds.forEach(id => clearTimeout(id)); sleepIds = []; }

  function clearTimers() {
    clearSleeps();
    if (finalTimerId) { clearInterval(finalTimerId); finalTimerId = null; }
    if (currentFitRaf) { cancelAnimationFrame(currentFitRaf); currentFitRaf = 0; }
  }

  function formatMoney(value) {
    return `$${Math.max(0, Math.round(Number(value) || 0)).toLocaleString()}`;
  }


  function spinResultImageSrc(result) {
    if (result?.kind === "prize") return PRIZE_SPIN_IMAGE;

    const value = Math.max(0, Math.round(Number(result?.value) || 0));
    return `${BIBLE_BUX_SPIN_IMAGE_PREFIX}${value}.png`;
  }

  function spinResultImageAlt(result) {
    if (result?.kind === "prize") return "Prize!";
    return `${formatMoney(result?.value)} Bible Bux`;
  }


  const spinResultImageCache = new Map();

  function allSpinResultImageSrcs() {
    const srcs = WHEEL_VALUES
      .filter(item => item.kind === "cash")
      .map(item => `${BIBLE_BUX_SPIN_IMAGE_PREFIX}${Math.max(0, Math.round(Number(item.value) || 0))}.png`);

    srcs.push(PRIZE_SPIN_IMAGE);
    return Array.from(new Set(srcs));
  }

  function preloadImage(src) {
    const clean = String(src || "").trim();
    if (!clean) return Promise.resolve(false);
    if (spinResultImageCache.has(clean)) return spinResultImageCache.get(clean);

    const promise = new Promise(resolve => {
      const img = new Image();

      img.onload = async () => {
        try { await img.decode?.(); } catch (err) { }
        resolve(true);
      };

      img.onerror = () => resolve(false);
      img.src = clean;
    });

    spinResultImageCache.set(clean, promise);
    return promise;
  }

  function preloadSpinResultImages() {
    allSpinResultImageSrcs().forEach(src => preloadImage(src));
  }


  function prizeImageSrc(prize) {
    return String(prize?.image || "").trim();
  }

  function prizeImageAlt(prize) {
    return prize?.name ? `${prize.name} prize` : "Prize";
  }

  function shuffledPrizeIndices() {
    const indices = PRIZES.map((_, index) => index);

    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }

    return indices;
  }

  function prepareNextPrize() {
    if (!PRIZES.length) {
      state.nextPrize = null;
      return null;
    }

    if (!state.prizeBagIndices.length) {
      state.prizeBagIndices = shuffledPrizeIndices();
    }

    const nextIndex = state.prizeBagIndices.shift();
    const prize = PRIZES[nextIndex] || PRIZES[0];

    state.nextPrize = prize;
    preloadImage(prizeImageSrc(prize));

    return prize;
  }

  function consumeNextPrize() {
    const prize = state.nextPrize || prepareNextPrize() || PRIZES[0];

    // Queue and preload the next unused prize in the background.
    prepareNextPrize();

    return prize;
  }

  async function waitForSpinResultImage(scope) {
    const img = scope?.querySelector?.(".wob-spin-result-image");
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      try { await img.decode?.(); } catch (err) { }
      return;
    }

    await new Promise(resolve => {
      let done = false;
      let fallbackId = null;

      const finish = () => {
        if (done) return;
        done = true;
        img.removeEventListener("load", finish);
        img.removeEventListener("error", finish);
        if (fallbackId) clearTimeout(fallbackId);
        resolve();
      };

      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      fallbackId = setTimeout(finish, SPIN_RESULT_IMAGE_LOAD_TIMEOUT_MS);
    });

    try { await img.decode?.(); } catch (err) { }
  }

  function totalCash() { return state.baseCash + state.prizeCash + state.finalCash; }

  function normalRoundTarget() {
    if (DEBUG_ONE_SPIN_ROUND) return 1;

    const total = state.uniqueLetters.length || 0;
    if (!total) return NORMAL_ROUND_MIN_SELECTED;
    return Math.min(
      total,
      Math.max(
        NORMAL_ROUND_MIN_SELECTED,
        Math.ceil(total * NORMAL_ROUND_UNIQUE_RATIO)
      )
    );
  }

  function normalRoundComplete() {
    return state.uniqueLetters.length > 0 && state.revealedLetters.size >= normalRoundTarget();
  }

  function finalRoundComplete() {
    if (!state.finalHiddenTileKeys.size) return false;

    for (const key of state.finalHiddenTileKeys) {
      if (!state.finalFilledTileKeys.has(key)) return false;
    }

    return true;
  }

  function challengeBonusAfterHints(rawBonus, hintCount) {
    const base = Math.max(0, Number(rawBonus) || 0);
    const hints = Math.max(0, Number(hintCount) || 0);

    if (hints >= 3) return Math.round(base * .25);
    if (hints === 2) return Math.round(base * .5);
    if (hints === 1) return Math.round(base * .75);
    return base;
  }

  function challengePrefilledCount() {
    return 0;
  }

  function normalizeLetters(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
  }

  function normalizeDigits(value) {
    return String(value || "").replace(/[^0-9]/g, "");
  }

  function normalizeWord(value) {
    if (shell().normalizeWord) return shell().normalizeWord(value);
    return String(value ?? "")
      .trim()
      .replace(/[‘’]/g, "'")
      .toLowerCase()
      .replace(/^[^a-z0-9]+/gi, "")
      .replace(/[^a-z0-9]+$/gi, "")
      .replace(/[^a-z0-9']/gi, "");
  }

  function tokenizeVerse(text) {
    const raw = String(text || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, "-");
    const tokens = [];
    const re = /(\s+|[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+(?:,[0-9]{3})*|[^\sA-Za-z0-9]+)/g;
    let wordIndex = 0;

    for (const part of raw.match(re) || []) {
      if (/^\s+$/.test(part)) tokens.push({ kind: "space", text: part });
      else if (/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(part)) tokens.push({ kind: "word", text: part, wordIndex: wordIndex++ });
      else if (/^[0-9]+(?:,[0-9]{3})*$/.test(part)) tokens.push({ kind: "word", text: part, wordIndex: wordIndex++, numeric: true });
      else tokens.push({ kind: "punct", text: part });
    }
    return tokens;
  }

  function extractKeywords(json) {
    const out = new Set();
    const addWord = (value) => {
      const text = String(value || "").trim();
      if (!text) return;
      for (const part of text.split(/\s+/g)) {
        const norm = normalizeWord(part);
        if (norm) out.add(norm);
      }
      const phraseNorm = normalizeWord(text);
      if (phraseNorm) out.add(phraseNorm);
    };

    const generic = [json?.keywords, json?.keyWords, json?.keywordWords, json?.memoryKeywords, json?.verseKeywords];
    for (const item of generic) {
      if (Array.isArray(item)) item.forEach(addWord);
      else if (typeof item === "string") item.split(/[;,]/g).forEach(addWord);
    }

    if (Array.isArray(json?.hidePlan)) {
      for (const item of json.hidePlan) {
        if (item?.word) addWord(item.word);
      }
    }

    return out;
  }

  function extractHidePlanWords(json) {
    if (!Array.isArray(json?.hidePlan)) return [];
    return json.hidePlan
      .map(item => String(item?.word || "").trim())
      .filter(Boolean);
  }

  function parseReference() {
    if (shell().parseReferenceParts) {
      return shell().parseReferenceParts(state.verseRef, state.translation, ctx.verseId);
    }
    const raw = String(state.verseRef || "").trim();
    const match = raw.match(/^(.*?)\s+(\d+):(\d+)(?:-(\d+))?/);
    return match ? {
      book: match[1],
      chapter: Number(match[2]),
      verse: Number(match[3]),
      verseEnd: match[4] ? Number(match[4]) : null,
      reference: match[4] ? `${match[2]}:${match[3]}-${match[4]}` : `${match[2]}:${match[3]}`,
      display: raw
    } : { book: raw, chapter: null, verse: null, verseEnd: null, reference: "", display: raw };
  }

  function buildVerseModel() {
    state.tokens = tokenizeVerse(state.verseText);
    state.words = [];
    state.referenceMeta = parseReference();

    for (const token of state.tokens) {
      if (token.kind !== "word") continue;
      const display = token.text;
      const clean = normalizeWord(display);
      const letters = Array.from(display).map((char, index) => ({
        char,
        index,
        normalized: normalizeLetters(char),
        isLetter: /^[A-Za-z]$/.test(char)
      }));
      state.words.push({
        index: token.wordIndex,
        display,
        clean,
        letters,
        color: WORD_COLORS[token.wordIndex % WORD_COLORS.length],
        isKeyword: state.keywordSet.has(clean)
      });
    }

    const unique = new Set();
    for (const word of state.words) {
      for (const letter of word.letters) {
        if (letter.isLetter && letter.normalized) unique.add(letter.normalized);
      }
    }
    state.uniqueLetters = Array.from(unique).sort();
  }

  async function loadVerseJson() {
    if (state.verseJson) return state.verseJson;
    const verseId = ctx.verseId || bridge().getLaunchParams?.()?.verseId || "";
    if (!verseId) { buildVerseModel(); return null; }

    try {
      const res = await fetch(`../../verse_data/${verseId}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.verseJson = await res.json();
      state.verseText = state.verseJson.verseText || state.verseText;
      state.translation = state.verseJson.translation || state.translation;
      state.echoParts = Array.isArray(state.verseJson.echoParts) ? state.verseJson.echoParts.filter(Boolean).map(String) : [];
      state.keywordSet = extractKeywords(state.verseJson);
      state.hidePlanWords = extractHidePlanWords(state.verseJson);
      return state.verseJson;
    } catch (err) {
      console.warn("Wheel of Bible could not load full verse JSON", err);
      state.keywordSet = new Set();
      state.hidePlanWords = [];
      state.echoParts = [];
      return null;
    }
  }

  function getVerseAudioCandidates() {
    const json = state.verseJson || {};
    const candidates = [];
    const add = (src) => {
      const clean = String(src || "").trim();
      if (!clean) return;
      if (/^https?:\/\//i.test(clean) || clean.startsWith("../")) candidates.push(clean);
      else if (clean.startsWith("verse_audio/")) candidates.push(`../../${clean}`);
      else candidates.push(`../../verse_audio/${clean}`);
    };
    add(json.audioFile); add(json.audio); add(json.verseAudio); add(json.audioSrc);
    if (ctx.verseId) add(`${ctx.verseId}.mp3`);
    return Array.from(new Set(candidates));
  }

  function getReferenceAudioCandidates() {
    const json = state.verseJson || {};
    const candidates = [];
    const add = (src) => {
      const clean = String(src || "").trim();
      if (!clean) return;
      if (/^https?:\/\//i.test(clean) || clean.startsWith("../")) candidates.push(clean);
      else if (clean.startsWith("verse_audio/")) candidates.push(`../../${clean}`);
      else candidates.push(`../../verse_audio/${clean}`);
    };
    add(json.referenceAudioFile);
    add(json.referenceAudio);
    add(json.refAudio);
    add(json.refAudioSrc);
    if (ctx.verseId) add(`${ctx.verseId}_ref.mp3`);
    return Array.from(new Set(candidates));
  }

  function createVerseAudioElement() {
    if (verseAudioEl) return verseAudioEl;
    verseAudioEl = document.createElement("audio");
    verseAudioEl.preload = "auto";
    verseAudioEl.playsInline = true;
    verseAudioEl.setAttribute("playsinline", "");
    verseAudioEl.style.display = "none";
    document.body.appendChild(verseAudioEl);
    return verseAudioEl;
  }

  function audioContextConstructor() { return window.AudioContext || window.webkitAudioContext; }
  function createAudio() {
    if (audioCtx) { if (masterGain) masterGain.gain.value = muted ? 0 : WEB_AUDIO_MASTER_VOLUME; return; }
    const AudioCtor = audioContextConstructor();
    if (!AudioCtor) return;
    audioCtx = new AudioCtor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : WEB_AUDIO_MASTER_VOLUME;
    masterGain.connect(audioCtx.destination);
  }

  function primeHtmlAudio() {
    if (htmlAudioPrimed) return Promise.resolve(true);
    if (htmlAudioPrimePromise) return htmlAudioPrimePromise;
    const audio = createVerseAudioElement();
    htmlAudioPrimePromise = new Promise(resolve => {
      let done = false, fallbackId = null;
      const cleanup = () => { audio.onended = null; audio.onerror = null; audio.oncanplay = null; audio.oncanplaythrough = null; if (fallbackId) clearTimeout(fallbackId); };
      const finish = ok => { if (done) return; done = true; cleanup(); htmlAudioPrimed = !!ok; htmlAudioPrimePromise = null; resolve(!!ok); };
      const tryPlay = () => { const p = audio.play(); if (p?.then) p.then(() => { }).catch(() => finish(false)); };
      try {
        audio.pause(); audio.currentTime = 0; audio.muted = false; audio.volume = 0.01; audio.src = SILENCE_AUDIO_FILE; audio.load();
        audio.onended = () => finish(true); audio.onerror = () => finish(false);
        if (audio.readyState >= 3) tryPlay(); else { audio.oncanplay = tryPlay; audio.oncanplaythrough = tryPlay; }
        fallbackId = setTimeout(() => finish(false), 1800);
      } catch (err) { finish(false); }
    });
    return htmlAudioPrimePromise;
  }

  async function unlockAudio() {
    createAudio(); createVerseAudioElement();
    if (!audioCtx || !masterGain) return false;
    if (audioUnlocked && audioCtx.state === "running") return true;
    if (audioUnlockPromise) return audioUnlockPromise;
    audioUnlockPromise = (async () => {
      try {
        if (audioCtx.state !== "running") { try { await audioCtx.resume?.(); } catch (err) { } }
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine"; osc.frequency.setValueAtTime(440, now); gain.gain.setValueAtTime(0.0001, now);
        osc.connect(gain); gain.connect(masterGain); osc.start(now); osc.stop(now + 0.03);
        audioUnlocked = audioCtx.state === "running";
        return audioUnlocked;
      } catch (err) { console.warn("Wheel of Bible audio unlock failed", err); audioUnlocked = false; return false; }
      finally { audioUnlockPromise = null; }
    })();
    return audioUnlockPromise;
  }

  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function playTone({ midi = 60, duration = 0.12, volume = 0.18, type = "triangle" } = {}) {
    if (muted) return;
    createAudio();
    if (!audioCtx || !masterGain) return;
    if (audioCtx.state !== "running") { unlockAudio().then(ok => { if (ok) playTone({ midi, duration, volume, type }); }); return; }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(midiToFreq(midi), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(masterGain); osc.start(now); osc.stop(now + duration + 0.04);
  }
  function playBeep(index = 0) { playTone({ midi: 67 + (index % 3) * 4, duration: .10, volume: .24 }); }
  function playGood() { playTone({ midi: 72, duration: .10, volume: .28 }); setTimeout(() => playTone({ midi: 79, duration: .14, volume: .22 }), 70); }
  function playBad() { playTone({ midi: 43, duration: .13, volume: .32, type: "sine" }); setTimeout(() => playTone({ midi: 38, duration: .12, volume: .24, type: "sine" }), 58); }
  function playPop(i = 0) { playTone({ midi: 64 + (i % 5) * 2, duration: .08, volume: .18 }); }
  function playPrize() { playTone({ midi: 72, duration: .10, volume: .25 }); setTimeout(() => playTone({ midi: 76, duration: .10, volume: .24 }), 70); setTimeout(() => playTone({ midi: 84, duration: .18, volume: .28 }), 145); }

  function playHint() {
    playTone({ midi: 67, duration: .08, volume: .18, type: "triangle" });
    setTimeout(() => playTone({ midi: 72, duration: .09, volume: .18, type: "triangle" }), 70);
    setTimeout(() => playTone({ midi: 76, duration: .12, volume: .16, type: "triangle" }), 145);
  }

  function stopVerseAudio() { if (!verseAudioEl) return; try { verseAudioEl.pause(); verseAudioEl.currentTime = 0; } catch (err) { } }
  async function tryPlayAudioCandidatesAndWait(candidates, fallbackMs = 1200) {
    const audio = createVerseAudioElement();
    audio.muted = muted;
    audio.volume = muted ? 0 : 1;

    for (const src of candidates || []) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = src;
        audio.load();

        await new Promise(resolve => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            cleanup();
            resolve();
          };
          const cleanup = () => {
            audio.removeEventListener("loadedmetadata", finish);
            audio.removeEventListener("canplay", finish);
            audio.removeEventListener("error", finish);
          };
          audio.addEventListener("loadedmetadata", finish);
          audio.addEventListener("canplay", finish);
          audio.addEventListener("error", finish);
          setTimeout(finish, 1200);
        });

        const durationMs = Number.isFinite(Number(audio.duration)) && Number(audio.duration) > 0
          ? clamp(Number(audio.duration) * 1000, 500, 30000)
          : Math.max(500, Number(fallbackMs) || 1200);

        await audio.play();

        await new Promise(resolve => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            cleanup();
            resolve();
          };
          const cleanup = () => {
            audio.removeEventListener("ended", finish);
            audio.removeEventListener("error", finish);
            if (timeoutId) clearTimeout(timeoutId);
          };
          audio.addEventListener("ended", finish);
          audio.addEventListener("error", finish);
          const timeoutId = setTimeout(finish, durationMs + 900);
        });

        return true;
      } catch (err) { }
    }

    return false;
  }

  async function tryPlayVerseAudio() {
    return tryPlayAudioCandidatesAndWait(getVerseAudioCandidates(), estimateListenMs());
  }
  function estimateListenMs() {
    const wordCount = state.words.length || String(state.verseText || "").split(/\s+/).filter(Boolean).length;
    const duration = Number(verseAudioEl?.duration);
    if (Number.isFinite(duration) && duration > 1) return clamp(duration * 1000, 3500, 30000);
    return clamp(wordCount * 620, 3500, 18000);
  }

  function helpHtml() {
    return `
      <div class="wob-help-copy">
        <p>Spin the wheel, then pick a letter.</p>
        <p>Every matching letter tile on the gameboard earns you Bible Bux.</p>
        <p>Tap the wiggling tiles to solve each Word Challenge to earn even more.</p>
        <p>In the final Round, fill in as many missing letters as you can.</p>
      </div>
    `;
  }

  function rootHtml(inner, { status = "", rootClass = "" } = {}) {
    return `
      <div class="wob-root ${escapeHtml(rootClass)}">
        <div class="wob-stage">
          <div class="wob-topbar">
            <button class="wob-pill wob-menu-pill no-zoom" id="wobMenuPill" type="button" aria-label="Open game menu">☰</button>
            <div class="wob-pill wob-status-pill" id="wobStatusPill">${escapeHtml(status || "Wheel of Bible")}</div>
            <div class="wob-pill wob-money-pill" id="wobMoneyPill">${escapeHtml(formatMoney(totalCash()))}</div>
          </div>
          <div class="wob-card">
            <div class="wob-main" id="wobMain">${inner}</div>
          </div>
          ${renderHelpOverlay()}
          ${renderGameMenuOverlay()}
        </div>
      </div>
    `;
  }

  function renderHelpOverlay() { return shell().helpOverlayHtml ? shell().helpOverlayHtml({ id: HELP_OVERLAY_ID, title: "How to Play", body: helpHtml() }) : ""; }
  function renderGameMenuOverlay() { return shell().gameMenuHtml ? shell().gameMenuHtml({ id: MENU_OVERLAY_ID, title: "Wheel of Bible Menu", muted, showModeSelect: false, exitText: "Exit Playground" }) : ""; }

  function wireGameMenu() {
    if (!shell().wireGameMenu) return;
    shell().wireGameMenu({
      id: MENU_OVERLAY_ID,
      menuButtonId: "wobMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (masterGain && audioCtx) masterGain.gain.setValueAtTime(muted ? 0 : WEB_AUDIO_MASTER_VOLUME, audioCtx.currentTime);
        if (verseAudioEl) verseAudioEl.muted = muted;
        return muted;
      },
      onHowToPlay: () => { document.getElementById(MENU_OVERLAY_ID)?.classList.remove("is-open"); shell().openHelp?.(HELP_OVERLAY_ID, "back", "Back"); },
      onExit: () => { stopVerseAudio(); clearTimers(); bridge().exitGame?.(); }
    });
  }

  function updateHud(status = "") {
    const money = document.getElementById("wobMoneyPill");
    const pill = document.getElementById("wobStatusPill");
    if (money) money.textContent = formatMoney(totalCash());
    if (pill && status) pill.textContent = status;
  }

  function renderIntro() {
    clearTimers(); stopVerseAudio(); state.screen = "intro";
    shell().renderTitleScreen?.({
      app, title: GAME_TITLE, icon: GAME_ICON, iconHtml: GAME_ICON_HTML, helpHtml: helpHtml(), helpOverlayId: HELP_OVERLAY_ID,
      startText: "Start", helpText: "How to Play", theme: GAME_THEME, backLabel: "Back to Verse Playground",
      onBack: () => bridge().exitGame?.(),
      onStart: async () => { createVerseAudioElement(); primeHtmlAudio(); unlockAudio(); await beginRun(); }
    });
  }

  async function beginRun() {
    clearTimers();
    await loadVerseJson();
    buildVerseModel();
    resetRunState();
    preloadSpinResultImages();
    await playIntroSequence();
  }

  function resetRunState() {
    state.revealedLetters = new Set();
    state.challengeHistory = new Map();
    state.refChallengeDone = { book: false, chapter: false, verse: false };
    state.selectedSpin = null; state.lastSelectedLetter = ""; state.turnCount = 0;
    state.baseCash = 0; state.prizeCash = 0; state.finalCash = 0; state.prizeEarnings = [];
    state.prizeBagIndices = [];
    state.nextPrize = null;
    prepareNextPrize();
    state.currentChallenge = null; state.challengeInputIndex = 0; state.challengeWrongCount = 0; state.challengeAutoFilled = false;
    state.challengeHintCount = 0; state.challengeHintIndexes = new Set();
    state.finalSolvedWordIndices = new Set(); state.finalHiddenTileKeys = new Set(); state.finalFilledTileKeys = new Set(); state.finalActiveWord = null; state.finalInputIndex = 0; state.finalLetterStreak = 0;
    state.completed = false;
  }

  async function playIntroSequence() {
    state.screen = "introSequence";
    app.innerHTML = rootHtml(`
      <div class="wob-panel">
        <div class="wob-intro-wheel-wrap"><div class="wob-wheel-shell"><div class="wob-wheel-pointer"></div><div class="wob-wheel" id="introWheel"><img class="wob-wheel-face" src="${WHEEL_FACE_IMAGE}" alt="" draggable="false"></div></div></div>
        <div class="wob-intro-words"><span class="wob-intro-word" id="introWord0">WHEEL</span><span class="wob-intro-word" id="introWord1">OF</span><span class="wob-intro-word" id="introWord2">BIBLE!</span></div>
      </div>
    `, { status: "Get Ready", rootClass: "is-simple-screen" });
    wireGameMenu();
    document.getElementById("introWheel")?.style.setProperty("--spin-deg", "1080deg");
    for (let i = 0; i < 3; i += 1) { await sleep(420); document.getElementById(`introWord${i}`)?.classList.add("is-in"); playBeep(i); }
    await sleep(320); playPrize(); await sleep(900); renderMeetVerse();
  }

  function renderMeetVerse() {
    state.screen = "meetVerse";
    app.innerHTML = rootHtml(`
      <div class="wob-panel wob-meet-panel">
        <button class="wob-marquee-button no-zoom" id="meetVerseBtn" type="button" aria-label="Let’s meet today’s verse">
          <img class="wob-meet-marquee-img" src="${MARQUEE_IMAGE}" alt="Let’s meet today’s verse!" draggable="false">
        </button>
      </div>
    `, { status: "Today's Verse", rootClass: "is-simple-screen is-meet-screen" });
    wireGameMenu();
    document.getElementById("meetVerseBtn")?.addEventListener("click", async () => { await unlockAudio(); await playVerseIntro(); });
  }

  async function playVerseIntro() {
    state.screen = "verseIntro";
    app.innerHTML = rootHtml(`
      <div class="wob-verse-wrap">
        ${verseBoardHtml({ allVisible: true })}
        <button class="wob-spin-float-button is-verse-intro no-zoom is-hidden" id="verseIntroSpinPrompt" type="button" aria-label="Go spin the wheel">
          ${WHEEL_BUTTON_HTML}
        </button>
      </div>
    `, { status: "Listen", rootClass: "is-board-screen is-listen-screen" });
    wireGameMenu();
    fitVerseBoardSoon();

    document.getElementById("verseIntroSpinPrompt")?.addEventListener("click", () => {
      stopVerseAudio();
      renderSpinScreen();
    });

    const versePlayed = await tryPlayVerseAudio();
    if (!versePlayed) await sleep(1800);

    const refPlayed = await tryPlayAudioCandidatesAndWait(getReferenceAudioCandidates(), 1600);
    if (!refPlayed) await sleep(250);

    showVerseIntroSpinPrompt();
  }

  function showVerseIntroSpinPrompt() {
    if (state.screen !== "verseIntro") return;
    const btn = document.getElementById("verseIntroSpinPrompt");
    if (!btn) return;
    btn.classList.remove("is-hidden");
    playGood();
  }

  function referenceLine() { return [state.verseRef || state.referenceMeta?.display || "", state.translation || ""].filter(Boolean).join(" • "); }

  function wheelLabelsHtml() {
    const step = 360 / WHEEL_VALUES.length;
    return WHEEL_VALUES.map((seg, index) => {
      const angle = index * step + step / 2;
      return `<div class="wob-wheel-label" style="--label-angle:${angle}deg;">${escapeHtml(seg.label)}</div>`;
    }).join("");
  }

  function renderSpinScreen() {
    clearTimers(); state.screen = "spin";
    if (normalRoundComplete()) { renderFinalIntro(); return; }
    state.selectedSpin = null;
    const remainingSpins = Math.max(0, normalRoundTarget() - state.revealedLetters.size);
    app.innerHTML = rootHtml(`
      <div class="wob-panel wob-spin-layout">
        <button class="wob-wheel-shell wob-spin-wheel-button no-zoom" id="spinWheelBtn" type="button" aria-label="Spin the wheel">
          <div class="wob-wheel-pointer"></div>
          <div class="wob-wheel" id="gameWheel"><img class="wob-wheel-face" src="${WHEEL_FACE_IMAGE}" alt="" draggable="false"></div>
        </button>
        <div class="wob-spins-remaining" aria-label="${remainingSpins} spins remaining">
          <span class="wob-spins-remaining-main">SPINS x ${escapeHtml(remainingSpins)}</span>
        </div>
      </div>
    `, { status: "Spin", rootClass: "is-spin-screen" });
    wireGameMenu(); document.getElementById("spinWheelBtn")?.addEventListener("click", spinWheel);
  }

  async function spinWheel() {
    const btn = document.getElementById("spinWheelBtn"); if (btn) btn.disabled = true; await unlockAudio();
    const index = Math.floor(Math.random() * WHEEL_VALUES.length);
    const step = 360 / WHEEL_VALUES.length;
    const degrees = 360 * 5 + ((360 - (index * step)) % 360);
    document.getElementById("gameWheel")?.style.setProperty("--spin-deg", `${degrees}deg`);
    for (let i = 0; i < 22; i += 1) setTimeout(() => playTone({ midi: 50 + (i % 3) * 3, duration: .045, volume: .12, type: "square" }), i * 95);
    await sleep(3300);
    const raw = WHEEL_VALUES[index];
    let result = { ...raw };
    if (raw.kind === "prize") {
      const prize = consumeNextPrize();
      result = { kind: "prize", label: "PRIZE", value: prize.value, prize };
      playPrize();
    } else playGood();
    state.selectedSpin = result;
    await renderSpinResult(result);
  }

  async function renderSpinResult(result) {
    const card = document.querySelector(".wob-card");
    if (!card) { renderSelectLetterScreen(); return; }

    const overlay = document.createElement("div");
    overlay.className = "wob-spin-pop-overlay";
    card.appendChild(overlay);

    const imageSrc = spinResultImageSrc(result);
    const imageAlt = spinResultImageAlt(result);

    if (result.kind === "prize") {
      overlay.innerHTML = `
        <div class="wob-spin-pop-card is-image is-prize">
          <button class="wob-spin-result-image-button no-zoom" id="wobPrizeGiftButton" type="button" aria-label="Open prize">
            <img class="wob-spin-result-image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}" draggable="false">
          </button>
        </div>
      `;

      await waitForSpinResultImage(overlay);

      await new Promise(resolve => {
        const btn = document.getElementById("wobPrizeGiftButton");
        if (!btn) { resolve(); return; }

        btn.addEventListener("click", () => {
          btn.disabled = true;
          playPrize();

          const popCard = overlay.querySelector(".wob-spin-pop-card");
          if (popCard) {
            const prizeSrc = prizeImageSrc(result.prize);
            const prizeAlt = prizeImageAlt(result.prize);

            popCard.className = "wob-spin-pop-card is-opened is-prize-opened";
            popCard.innerHTML = `
              <img class="wob-spin-result-image wob-open-prize-image" src="${escapeHtml(prizeSrc)}" alt="${escapeHtml(prizeAlt)}" draggable="false">
              <div class="wob-spin-pop-title">${escapeHtml(result.prize.name)}</div>
              <div class="wob-spin-pop-value">${escapeHtml(formatMoney(result.value))}</div>
            `;
          }

          waitForSpinResultImage(popCard).then(() => setTimeout(resolve, 2500));
        }, { once: true });
      });

      renderSelectLetterScreen();
      return;
    }

    overlay.innerHTML = `
      <div class="wob-spin-pop-card is-image is-cash">
        <img class="wob-spin-result-image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}" draggable="false">
      </div>
    `;

    await waitForSpinResultImage(overlay);
    playGood();
    await sleep(SPIN_RESULT_IMAGE_HOLD_MS);
    renderSelectLetterScreen();
  }

  function renderSelectLetterScreen() {
    state.screen = "selectLetter";
    const spinValue = Math.max(0, Number(state.selectedSpin?.value) || 0);
    const prize = state.selectedSpin?.kind === "prize" ? state.selectedSpin.prize : null;
    const prizeSrc = prizeImageSrc(prize);

    app.innerHTML = rootHtml(`
      <div class="wob-panel wob-letter-select-panel">
        <div class="wob-letter-value-wrap">
          ${prizeSrc ? `<img class="wob-letter-value-prize-image" src="${escapeHtml(prizeSrc)}" alt="${escapeHtml(prizeImageAlt(prize))}" draggable="false">` : ""}
          <div class="wob-letter-value-card">
            <div class="wob-letter-value-money">${escapeHtml(formatMoney(spinValue))}</div>
            <div class="wob-letter-value-label">per letter</div>
          </div>
        </div>
        <div class="wob-letter-grid">
          ${state.uniqueLetters.map(letter => {
      const used = state.revealedLetters.has(letter);
      return `<button class="wob-letter-choice no-zoom ${used ? "is-used" : ""}" data-letter="${escapeHtml(letter)}" type="button" ${used ? "disabled" : ""}>${escapeHtml(letter)}</button>`;
    }).join("")}
        </div>
      </div>
    `, { status: "Choose Letter", rootClass: "is-select-screen" });
    wireGameMenu();
    document.querySelectorAll("[data-letter]").forEach(btn => btn.addEventListener("click", () => handleLetterChoice(btn.dataset.letter || "")));
  }

  function countUnrevealedLetter(letter) {
    let count = 0;
    for (const word of state.words) {
      for (const item of word.letters) {
        if (item.isLetter && item.normalized === letter && !state.revealedLetters.has(item.normalized)) count += 1;
      }
    }
    return count;
  }

  async function handleLetterChoice(letter) {
    const selected = normalizeLetters(letter).charAt(0);
    if (!selected || state.revealedLetters.has(selected)) return;
    await unlockAudio();
    const matches = countUnrevealedLetter(selected);
    state.lastSelectedLetter = selected;
    state.revealedLetters.add(selected);
    state.turnCount += 1;
    const value = Math.max(0, Number(state.selectedSpin?.value) || 0);
    const earnings = value * matches;
    if (state.selectedSpin?.kind === "prize") {
      state.prizeCash += earnings;
      state.prizeEarnings.push({ ...state.selectedSpin.prize, perLetter: value, matches, total: earnings, letter: selected });
    } else state.baseCash += earnings;
    await renderLetterReveal({ letter: selected, matches, earnings, perLetter: value });
  }

  async function renderLetterReveal({ letter, matches, earnings, perLetter }) {
    state.screen = "revealLetter";

    // The letter was added before this function. Temporarily hide it so
    // we can reveal each matching tile one at a time.
    state.revealedLetters.delete(letter);

    app.innerHTML = rootHtml(`
      <div class="wob-verse-wrap">
        ${verseBoardHtml({ animatingLetter: letter })}
      </div>
    `, { status: "Letters Reveal", rootClass: "is-board-screen" });

    wireGameMenu();
    fitVerseBoardSoon();
    await sleep(80);

    const tiles = Array.from(document.querySelectorAll(`.wob-tile[data-normalized="${letter}"]`));
    const delayMs = tiles.length > 18 ? 55 : 85;

    for (let i = 0; i < tiles.length; i += 1) {
      const tile = tiles[i];
      tile.textContent = letter;
      tile.classList.remove("is-hidden");
      tile.classList.add("is-pop-revealed");
      playPop(i);
      showFloatingMoneyAtElement(tile, formatMoney(perLetter));
      await sleep(delayMs);
    }

    state.revealedLetters.add(letter);
    await sleep(260);
    updateHud();

    await showRoundTotalPopup(earnings);

    const challenge = chooseChallengeTarget();
    if (challenge) {
      renderWigglingVerse(challenge);
      return;
    }

    if (normalRoundComplete()) {
      renderFinalIntro();
      return;
    }

    renderSpinScreen();
  }

  function showFloatingMoney(text) {
    const card = document.querySelector(".wob-card"); if (!card) return;
    const el = document.createElement("div");
    el.className = "wob-floating-money";
    el.textContent = text;
    card.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function showFloatingMoneyAtElement(targetEl, text) {
    const card = document.querySelector(".wob-card");
    if (!card || !targetEl) return;

    const cardBox = card.getBoundingClientRect();
    const box = targetEl.getBoundingClientRect();
    const x = box.left + box.width / 2 - cardBox.left;
    const y = box.top - cardBox.top;

    const el = document.createElement("div");
    el.className = "wob-floating-money is-tile-money";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    card.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  async function showChallengeBonusPopup(bonus) {
    const card = document.querySelector(".wob-card");
    if (!card) { await sleep(1000); return; }

    const amount = Math.max(0, Number(bonus) || 0);
    const popup = document.createElement("div");
    popup.className = "wob-round-total-pop is-challenge-bonus";
    popup.innerHTML = `
      <div class="wob-round-total-label">Nice!</div>
      <div class="wob-round-total-amount">+${escapeHtml(formatMoney(amount))}</div>
    `;
    card.appendChild(popup);

    playPrize();

    await sleep(1250);
    popup.classList.add("is-leaving");
    await sleep(340);
    popup.remove();
  }

  async function showRoundTotalPopup(amount) {
    const card = document.querySelector(".wob-card");
    if (!card) return;

    const total = Math.max(0, Number(amount) || 0);
    const popup = document.createElement("div");
    popup.className = "wob-round-total-pop";
    popup.innerHTML = `
      <div class="wob-round-total-label">Bible Bux</div>
      <div class="wob-round-total-amount">+${escapeHtml(formatMoney(total))}</div>
    `;
    card.appendChild(popup);

    await sleep(420);

    const rainTiming = spawnDollarRain(card, total);
    playPrize();

    await sleep(rainTiming.totalMs + 260);

    popup.classList.add("is-leaving");
    await sleep(360);
    popup.remove();
  }

  function spawnDollarRain(card, total) {
    if (!card) return { totalMs: 0 };

    const safeTotal = Math.max(0, Number(total) || 0);
    const count = clamp(18 + Math.floor(safeTotal / 500), 18, 78);
    const rainSpanMs = clamp(900 + Math.floor(safeTotal / 5000) * 650 + count * 18, 1100, 4400);
    const fallMs = clamp(1200 + Math.floor(count * 7), 1250, 1850);
    const cardWidth = card.clientWidth || 360;
    const cardHeight = card.clientHeight || 520;
    const fallDistance = Math.round(cardHeight * .58);

    const lanes = makeShuffledRainLanes(count, cardWidth);

    for (let i = 0; i < count; i += 1) {
      const bill = document.createElement("img");
      const x = lanes[i];
      const delay = Math.round((i / count) * rainSpanMs + Math.random() * 160);
      const drift = (Math.random() * 110) - 55;
      const rotStart = (Math.random() * 80) - 40;
      const rotEnd = rotStart + (Math.random() * 260 - 130);
      const scale = .74 + Math.random() * .34;

      bill.className = "wob-dollar-bill is-dollar-rain";
      bill.src = DOLLAR_BILL_IMAGE;
      bill.alt = "";
      bill.draggable = false;
      bill.style.left = `${x}px`;
      bill.style.top = `-82px`;
      bill.style.setProperty("--drift", `${drift}px`);
      bill.style.setProperty("--fall", `${fallDistance}px`);
      bill.style.setProperty("--rot-start", `${rotStart}deg`);
      bill.style.setProperty("--rot-end", `${rotEnd}deg`);
      bill.style.setProperty("--scale", String(scale));
      bill.style.setProperty("--duration", `${fallMs}ms`);
      bill.style.setProperty("--delay", `${delay}ms`);
      card.appendChild(bill);

      setTimeout(() => bill.remove(), delay + fallMs + 80);
    }

    return { totalMs: rainSpanMs + fallMs };
  }

  function makeShuffledRainLanes(count, width) {
    const safeCount = Math.max(1, Number(count) || 1);
    const safeWidth = Math.max(120, Number(width) || 360);
    const edge = 24;
    const usableWidth = Math.max(60, safeWidth - edge * 2);

    const lanes = [];
    for (let i = 0; i < safeCount; i += 1) {
      const lane = safeCount > 1 ? i / (safeCount - 1) : .5;
      const jitter = (Math.random() * 42) - 21;
      lanes.push(clamp(edge + lane * usableWidth + jitter, 18, safeWidth - 18));
    }

    for (let i = lanes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = temp;
    }

    return lanes;
  }

  function spawnDollarExplosion(card, burstIndex = 0, durationMs = 950, style = "classic") {
    if (!card) return;

    const count = style === "confetti" ? 26 : (style === "popcorn" ? 28 : 22);
    const centerX = card.clientWidth / 2;
    const centerY = card.clientHeight / 2;

    for (let i = 0; i < count; i += 1) {
      const scale = dollarExplosionScale(card);
      const path = dollarExplosionPath(style, i, count, burstIndex, scale);
      const bill = document.createElement("img");
      bill.className = "wob-dollar-bill";
      bill.src = DOLLAR_BILL_IMAGE;
      bill.alt = "";
      bill.draggable = false;
      bill.style.left = `${centerX}px`;
      bill.style.top = `${centerY}px`;
      bill.style.setProperty("--x1", `${path.x1}px`);
      bill.style.setProperty("--y1", `${path.y1}px`);
      bill.style.setProperty("--x2", `${path.x2}px`);
      bill.style.setProperty("--y2", `${path.y2}px`);
      bill.style.setProperty("--rot1", `${path.rot1}deg`);
      bill.style.setProperty("--rot2", `${path.rot2}deg`);
      bill.style.setProperty("--scale", String(path.scale));
      bill.style.setProperty("--duration", `${durationMs}ms`);
      bill.style.setProperty("--delay", `${path.delay || 0}ms`);
      card.appendChild(bill);
      setTimeout(() => bill.remove(), durationMs + (path.delay || 0) + 40);
    }
  }

  function dollarExplosionScale(card) {
    if (!card) return 1.6;
    const shortSide = Math.min(card.clientWidth || 360, card.clientHeight || 520);
    return clamp(shortSide / 280, 1.45, 2.35);
  }

  function scaleExplosionPath(path, scale) {
    const finalX = path.x2 * scale;
    const finalY = path.y2 * scale;
    return {
      ...path,
      x1: finalX * .52,
      y1: finalY * .52,
      x2: finalX,
      y2: finalY
    };
  }

  function dollarExplosionPath(style, i, count, burstIndex, scale = 1.6) {
    const path = style === "confetti"
      ? confettiExplosionPath(i, count, burstIndex)
      : style === "popcorn"
        ? popcornExplosionPath(i, count, burstIndex)
        : classicExplosionPath(i, count, burstIndex);

    return scaleExplosionPath(path, scale);
  }

  function classicExplosionPath(i, count, burstIndex) {
    const angle = -90 + burstIndex * 17 + (360 / count) * i + (Math.random() * 4 - 2);
    const radians = angle * Math.PI / 180;
    const distance1 = 150 + (i % 3) * 34;
    const distance2 = distance1 + 190 + burstIndex * 18;
    return {
      x1: Math.cos(radians) * distance1,
      y1: Math.sin(radians) * distance1,
      x2: Math.cos(radians) * distance2,
      y2: Math.sin(radians) * distance2,
      rot1: angle + 90 + (Math.random() * 20 - 10),
      rot2: angle + 180 + (Math.random() * 28 - 14),
      scale: 0.76 + (i % 4) * 0.07,
      delay: 0
    };
  }

  function confettiExplosionPath(i, count, burstIndex) {
    const row = (i % 5) - 2;
    const side = i % 2 === 0 ? -1 : 1;
    const lane = Math.floor(i / 2);
    const x1 = side * (115 + lane * 22);
    const y1 = row * 42 - 82 + (i % 3) * 10;
    return {
      x1,
      y1,
      x2: x1 * 1.9,
      y2: y1 + 120 + burstIndex * 14,
      rot1: side * (95 + lane * 13),
      rot2: side * (190 + lane * 20),
      scale: 0.72 + (i % 4) * 0.07,
      delay: 0
    };
  }

  function popcornExplosionPath(i, count, burstIndex) {
    const angle = -90 + burstIndex * 14 + (360 / count) * i + (Math.random() * 6 - 3);
    const radians = angle * Math.PI / 180;
    const distance1 = 142 + Math.sin(i * 1.7) * 48;
    const distance2 = distance1 + 175 + (i % 3) * 22;
    return {
      x1: Math.cos(radians) * distance1,
      y1: Math.sin(radians) * distance1,
      x2: Math.cos(radians) * distance2,
      y2: Math.sin(radians) * distance2 + 38,
      rot1: angle + 90 + (Math.random() * 24 - 12),
      rot2: angle + 190 + (Math.random() * 34 - 17),
      scale: 0.72 + (i % 4) * 0.07,
      delay: i * 14
    };
  }

  function tileKeyFor(wordIndex, letterIndex) {
    return `${wordIndex}-${letterIndex}`;
  }

  function revealedCountForWord(word) { return word.letters.filter(item => item.isLetter && state.revealedLetters.has(item.normalized)).length; }

  function finalMissingItemsForWord(word) {
    if (!word) return [];
    return word.letters
      .filter(item => item.isLetter)
      .filter(item => {
        const key = tileKeyFor(word.index, item.index);
        return state.finalHiddenTileKeys.has(key) && !state.finalFilledTileKeys.has(key);
      });
  }

  function buildFinalHiddenTiles() {
    const allKeys = [];
    const forcedVisibleKeys = new Set();
    const forcedHiddenKeys = new Set();
    const extraCandidateKeys = [];

    for (const word of state.words) {
      const letterItems = word.letters.filter(item => item.isLetter);

      for (const item of letterItems) {
        allKeys.push(tileKeyFor(word.index, item.index));
      }

      if (letterItems.length === 1) {
        // One-letter words like "a" or "I" may be fully missing.
        extraCandidateKeys.push(tileKeyFor(word.index, letterItems[0].index));
        continue;
      }

      if (letterItems.length >= 2) {
        const shuffledItems = shuffle(letterItems);
        const hiddenItem = shuffledItems[0];
        const visibleItem = shuffledItems[1];

        const hiddenKey = tileKeyFor(word.index, hiddenItem.index);
        const visibleKey = tileKeyFor(word.index, visibleItem.index);

        forcedHiddenKeys.add(hiddenKey);
        forcedVisibleKeys.add(visibleKey);

        for (const item of shuffledItems.slice(2)) {
          extraCandidateKeys.push(tileKeyFor(word.index, item.index));
        }
      }
    }

    const targetHideCount = Math.floor(allKeys.length * FINAL_ROUND_HIDE_RATIO);
    const hidden = new Set(forcedHiddenKeys);

    for (const key of shuffle(extraCandidateKeys)) {
      if (hidden.size >= targetHideCount) break;
      if (forcedVisibleKeys.has(key)) continue;
      hidden.add(key);
    }

    state.finalHiddenTileKeys = hidden;
    state.finalFilledTileKeys = new Set();
    state.finalSolvedWordIndices = new Set();
  }


  function alphaCountForWord(word) { return word.letters.filter(item => item.isLetter).length; }


  function hidePlanRankForWord(word) {
    const clean = normalizeWord(word?.display || word?.clean || "");
    if (!clean) return -1;

    return state.hidePlanWords.findIndex(item => normalizeWord(item) === clean);
  }

  function isLowContentChallengeWord(word) {
    const clean = normalizeWord(word?.display || word?.clean || "");
    return LOW_CONTENT_CHALLENGE_WORDS.has(clean);
  }

  function challengeWordQualityScore(word) {
    const alpha = alphaCountForWord(word);
    const revealed = revealedCountForWord(word);
    const hidePlanRank = hidePlanRankForWord(word);
    let score = 0;

    if (hidePlanRank >= 0) {
      score += 120 - Math.min(12, hidePlanRank) * 2;
    } else if (word.isKeyword) {
      score += 80;
    }

    if (isLowContentChallengeWord(word)) score -= 110;

    if (alpha >= 7) score += 35;
    else if (alpha >= 5) score += 22;
    else if (alpha <= 3) score -= 15;

    score += Math.min(8, revealed) * 10;
    if (revealed <= 0) score -= 8;

    return score;
  }

  function chooseChallengeTarget() {
    const progress = state.uniqueLetters.length ? state.revealedLetters.size / state.uniqueLetters.length : 0;

    if (!referenceChallengeAlreadyDone() && (state.turnCount >= 3 || progress >= .33)) {
      const referenceChallenge = makeReferenceComboChallenge();
      if (referenceChallenge) return referenceChallenge;
    }

    return chooseWordChallenge();
  }

  function referenceChallengeAlreadyDone() {
    return !!(state.refChallengeDone.book || state.refChallengeDone.chapter || state.refChallengeDone.verse);
  }

  function chooseWordChallenge() {
    const candidates = state.words.filter(word => {
      const alpha = alphaCountForWord(word);
      if (alpha < 3) return false;
      if (state.challengeHistory.has(word.index)) return false;
      return true;
    });

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const as = challengeWordQualityScore(a);
      const bs = challengeWordQualityScore(b);
      if (bs !== as) return bs - as;

      const ar = revealedCountForWord(a), br = revealedCountForWord(b);
      if (br !== ar) return br - ar;

      return alphaCountForWord(b) - alphaCountForWord(a);
    });

    const pool = candidates.slice(0, Math.min(5, candidates.length));
    const word = pool[Math.floor(Math.random() * pool.length)];
    return makeWordChallenge(word);
  }

  function findEchoContext(word, hintIndexes = new Set()) {
    const target = normalizeWord(word.display);
    const parts = state.echoParts.length ? state.echoParts : [state.verseText];

    const firstLetterBlank = (text) => {
      const letters = normalizeLetters(text).split("");
      if (!letters.length) return "___";

      return letters.map((letter, index) => {
        if (index === 0 || hintIndexes.has(index)) return letter;
        return "_";
      }).join("");
    };

    const wordCountInText = (text) => tokenizeVerse(text).filter(token => token.kind === "word").length;

    const contextWindowFromVerseText = () => {
      const tokens = tokenizeVerse(state.verseText || "");
      const wordTokenPositions = [];

      tokens.forEach((token, index) => {
        if (token.kind === "word") wordTokenPositions.push(index);
      });

      const targetWordListIndex = wordTokenPositions.findIndex(tokenIndex => {
        return normalizeWord(tokens[tokenIndex]?.text || "") === target;
      });

      if (targetWordListIndex < 0) {
        return `Complete the word: <span class="wob-context-blank">${escapeHtml(firstLetterBlank(word.display))}</span>`;
      }

      const startWordListIndex = Math.max(0, targetWordListIndex - 3);
      const endWordListIndex = Math.min(wordTokenPositions.length - 1, targetWordListIndex + 3);
      const startTokenIndex = wordTokenPositions[startWordListIndex];
      const endTokenIndex = wordTokenPositions[endWordListIndex];

      let replaced = false;
      return tokens.slice(startTokenIndex, endTokenIndex + 1).map(token => {
        if (token.kind === "space") return " ";
        if (token.kind === "punct") return escapeHtml(token.text);
        if (!replaced && normalizeWord(token.text) === target) {
          replaced = true;
          return `<span class="wob-context-blank">${escapeHtml(firstLetterBlank(token.text))}</span>`;
        }
        return escapeHtml(token.text);
      }).join("");
    };

    for (const part of parts) {
      const tokens = tokenizeVerse(part);
      let found = false;
      const html = tokens.map(token => {
        if (token.kind === "space") return " ";
        if (token.kind === "punct") return escapeHtml(token.text);
        if (!found && normalizeWord(token.text) === target) {
          found = true;
          return `<span class="wob-context-blank">${escapeHtml(firstLetterBlank(token.text))}</span>`;
        }
        return escapeHtml(token.text);
      }).join("");

      if (found) {
        if (wordCountInText(part) >= 3) return html;
        return contextWindowFromVerseText();
      }
    }

    return contextWindowFromVerseText();
  }

  function hexToRgb(hex) {
    const clean = String(hex || "").trim().replace(/^#/, "");
    if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function colorDistance(a, b) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    if (!ca || !cb) return 999;
    const dr = ca.r - cb.r;
    const dg = ca.g - cb.g;
    const db = ca.b - cb.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function challengeDisplayColor(originalColor) {
    const choiceTileColor = "#fff7db";
    const color = originalColor || "#ffc751";

    // If the word display is too close to the cream/yellow choice tiles,
    // switch it to purple so kids can tell the display from the tap targets.
    if (colorDistance(color, choiceTileColor) < 130) return "#7f66c6";

    // Orange/yellow tiles can still feel close to the choice tiles even when
    // the raw color distance is not tiny, so move those to purple too.
    const warmConfusingColors = new Set(["#ffc751", "#ff9e3d", "#ffe382"]);
    if (warmConfusingColors.has(String(color).toLowerCase())) return "#7f66c6";

    return color;
  }

  function makeWordChallenge(word) {
    const expected = normalizeLetters(word.display).split("");
    return {
      type: "word",
      wordIndex: word.index,
      word,
      expected,
      prefilledCount: expected.length > 1 ? 1 : 0,
      inputKind: "letters",
      title: word.isKeyword ? "Key Word Challenge" : "Word Challenge",
      prompt: "Build the missing word from this part of the verse.",
      contextHtml: findEchoContext(word),
      color: "#2f7a32",
      bonus: (word.isKeyword ? 900 : 550) + Math.min(800, expected.length * 100)
    };
  }

  function splitBookForChallenge(book) {
    const text = String(book || "").trim();
    const match = text.match(/^(\d+)\s+(.+)$/);
    if (match) return { fixedPrefix: match[1], fillText: match[2] };
    return { fixedPrefix: "", fillText: text };
  }

  function makeReferenceChallenge(kind) {
    return makeReferenceStep(kind);
  }

  function makeReferenceStep(kind) {
    const meta = state.referenceMeta || {};

    if (kind === "book") {
      const parts = splitBookForChallenge(meta.book || "");
      const expected = normalizeLetters(parts.fillText).split("");
      if (!expected.length) return null;

      return {
        type: "reference",
        refKind: "book",
        inputKind: "letters",
        expected,
        title: "Reference Challenge",
        instruction: "Type the Bible book this verse is from",
        fixedPrefix: parts.fixedPrefix,
        displayText: parts.fillText,
        color: "#2f7a32",
        bonus: 1200 + Math.min(1000, expected.length * 100)
      };
    }

    if (kind === "chapterVerse") {
      const chapter = String(meta.chapter || "");
      const verseStart = String(meta.verse || "");
      const verseEnd = meta.verseEnd == null ? "" : String(meta.verseEnd);
      const verseDisplay = verseEnd ? `${verseStart}-${verseEnd}` : verseStart;
      const displayText = [chapter, verseDisplay].filter(Boolean).join(":");
      const expected = normalizeDigits(displayText).split("");
      if (!expected.length) return null;

      return {
        type: "reference",
        refKind: "chapterVerse",
        inputKind: "numbers",
        expected,
        title: "Reference Challenge",
        instruction: "Type the chapter and verse",
        displayText,
        color: "#2f7a32",
        bonus: 1600 + expected.length * 300
      };
    }

    return null;
  }

  function makeReferenceComboChallenge() {
    const steps = ["book", "chapterVerse"]
      .map(kind => makeReferenceStep(kind))
      .filter(Boolean);

    if (!steps.length) return null;

    const challenge = {
      type: "reference",
      isReferenceSequence: true,
      referenceSteps: steps,
      referenceStepIndex: 0,
      totalBonus: steps.reduce((sum, step) => sum + (Number(step.bonus) || 0), 0),
      sequenceEarnedBonus: 0
    };

    hydrateReferenceSequenceStep(challenge);
    return challenge;
  }

  function hydrateReferenceSequenceStep(challenge) {
    if (!challenge?.isReferenceSequence) return challenge;

    const steps = challenge.referenceSteps || [];
    const index = clamp(challenge.referenceStepIndex || 0, 0, Math.max(0, steps.length - 1));
    const step = steps[index];
    if (!step) return challenge;

    challenge.referenceStepIndex = index;
    challenge.refKind = step.refKind;
    challenge.inputKind = step.inputKind;
    challenge.expected = step.expected;
    challenge.instruction = step.instruction || "";
    challenge.fixedPrefix = step.fixedPrefix || "";
    challenge.displayText = step.displayText || "";
    challenge.contextHtml = step.contextHtml || "";
    challenge.color = step.color || "#2f7a32";
    challenge.stepBonus = Number(step.bonus) || 0;
    challenge.bonus = Number(challenge.totalBonus) || challenge.stepBonus;
    challenge.title = "Reference Challenge";
    challenge.choices = null;

    return challenge;
  }

  function renderWigglingVerse(challenge) {
    state.screen = "findWord";
    state.currentChallenge = challenge;
    app.innerHTML = rootHtml(`
      <div class="wob-verse-wrap">
        ${verseBoardHtml({ challenge })}
      </div>
    `, { status: "Find Tile", rootClass: "is-board-screen is-find-screen" });
    wireGameMenu(); fitVerseBoardSoon();
    const selector = challenge.type === "reference" ? `[data-ref-kind="${challenge.refKind}"]` : `[data-word-index="${challenge.wordIndex}"]`;
    document.querySelectorAll(selector).forEach(item => {
      item.addEventListener("click", () => renderChallenge(challenge));
    });
  }

  function makeChoiceLetters(correctLetters, sourceLetters, targetCount = 9) {
    const out = [], seen = new Set();
    for (const letter of correctLetters) { if (!letter || seen.has(letter)) continue; out.push(letter); seen.add(letter); }
    const decoys = (sourceLetters || state.uniqueLetters).filter(letter => letter && !seen.has(letter));
    shuffle(decoys);
    for (const letter of decoys) { if (out.length >= targetCount) break; out.push(letter); seen.add(letter); }
    while (out.length < targetCount) {
      const bag = correctLetters.every(ch => /^[0-9]$/.test(ch)) ? "0123456789" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const letter = bag[Math.floor(Math.random() * bag.length)];
      if (!seen.has(letter)) { out.push(letter); seen.add(letter); }
    }
    return shuffle(out);
  }

  function shuffle(items) {
    const copy = Array.isArray(items) ? items.slice() : [];
    for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1));[copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  }

  function choiceRowPattern(count) {
    const n = Math.max(0, Number(count) || 0);
    if (n <= 5) return [n].filter(Boolean);
    if (n === 6) return [3, 3];
    if (n === 7) return [4, 3];
    if (n === 8) return [4, 4];
    if (n === 9) return [5, 4];
    if (n === 10) return [5, 5];
    if (n === 11) return [4, 4, 3];
    if (n === 12) return [4, 4, 4];
    if (n === 13) return [5, 4, 4];
    if (n === 14) return [5, 5, 4];
    if (n === 15) return [5, 5, 5];
    if (n === 16) return [4, 4, 4, 4];
    if (n === 17) return [5, 4, 4, 4];
    if (n === 18) return [5, 5, 4, 4];
    if (n === 19) return [5, 5, 5, 4];
    if (n === 20) return [5, 5, 5, 5];

    const rows = [];
    let left = n;
    while (left > 0) {
      const size = Math.min(5, left);
      rows.push(size);
      left -= size;
    }
    return rows;
  }

  function choiceRowsHtml(choices, flashValue, isBad, dataName) {
    const items = Array.isArray(choices) ? choices : [];
    const rows = choiceRowPattern(items.length);
    let offset = 0;

    return rows.map(rowSize => {
      const row = items.slice(offset, offset + rowSize);
      offset += rowSize;
      return `<div class="wob-choice-row">${row.map(letter => `<button class="wob-choice-tile no-zoom ${flashValue === letter ? (isBad ? "is-bad" : "is-good") : ""}" data-${dataName}="${escapeHtml(letter)}" type="button">${escapeHtml(letter)}</button>`).join("")}</div>`;
    }).join("");
  }

  function renderChallenge(challenge = state.currentChallenge) {
    if (!challenge) return renderSpinScreen();
    if (challenge.isReferenceSequence) hydrateReferenceSequenceStep(challenge);
    state.screen = "challenge";
    state.currentChallenge = challenge;
    state.challengeInputIndex = challengePrefilledCount(challenge);
    state.challengeFlash = "";
    state.challengeBad = false;
    state.challengeWrongCount = 0;
    state.challengeAutoFilled = false;
    state.challengeHintCount = 0;
    state.challengeHintIndexes = new Set();

    const remainingExpected = (challenge.expected || []).slice(state.challengeInputIndex);
    const uniqueCorrect = Array.from(new Set(remainingExpected));
    const targetCount = challenge.inputKind === "numbers" ? 10 : Math.max(10, uniqueCorrect.length);
    challenge.choices = challenge.inputKind === "numbers"
      ? shuffle(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])
      : makeChoiceLetters(uniqueCorrect, state.uniqueLetters, targetCount);

    drawChallenge();
  }

  function referenceClueText(challenge) {
    if (!challenge || challenge.type !== "reference") return "";

    if (challenge.refKind === "book") {
      let letterIndex = 0;

      const clue = Array.from(String(challenge.displayText || "")).map(char => {
        if (/[A-Za-z]/.test(char)) {
          const show =
            letterIndex === 0 ||
            state.challengeHintIndexes.has(letterIndex);

          const text = show
            ? challenge.expected[letterIndex] || char
            : "_";

          letterIndex += 1;
          return text;
        }

        return char;
      }).join("");

      return challenge.fixedPrefix
        ? `${challenge.fixedPrefix} ${clue}`
        : clue;
    }

    let digitIndex = 0;

    return Array.from(String(challenge.displayText || "")).map(char => {
      if (/\d/.test(char)) {
        const show =
          digitIndex === 0 ||
          state.challengeHintIndexes.has(digitIndex);

        const text = show
          ? challenge.expected[digitIndex] || char
          : "_";

        digitIndex += 1;
        return text;
      }

      return char;
    }).join("");
  }

  function referenceClueHtml(challenge) {
    if (!challenge || challenge.type !== "reference") return "";

    return `<div class="wob-reference-clue"><span class="wob-context-blank">${escapeHtml(referenceClueText(challenge))}</span></div>`;
  }

  function drawChallenge() {
    const challenge = state.currentChallenge;
    const choiceClass = challenge.choices.length > 9 || challenge.inputKind === "numbers" ? "is-wide" : "";
    const isReferenceChallenge = challenge.type === "reference";
    const isWordChallenge = challenge.type === "word";
    const canUseHints = isWordChallenge || isReferenceChallenge;

    const instruction = isReferenceChallenge
      ? challenge.instruction
      : (challenge.inputKind === "numbers"
        ? "Tap the numbers in order"
        : "Tap the letters in order");

    const contextHtml = isWordChallenge
      ? findEchoContext(challenge.word, state.challengeHintIndexes)
      : challenge.contextHtml;

    const hintAvailable =
      canUseHints &&
      challengeHintableIndexes(challenge).length > 0;

    app.innerHTML = rootHtml(`
      <div class="wob-word-challenge-root">
        <div class="wob-big-title ${challenge.title === "Key Word Challenge" ? "is-key-word-title" : ""}">${escapeHtml(challenge.title || "Challenge")}</div>
        <div class="wob-challenge-instruction">${escapeHtml(instruction)}</div>
        ${isReferenceChallenge ? referenceClueHtml(challenge) : ""}
        ${contextHtml ? `<div class="wob-context-card">${contextHtml}</div>` : ""}
        ${typedChallengeHtml(challenge, state.challengeInputIndex)}
        <div class="wob-choice-grid is-rowed ${choiceClass}">
          ${choiceRowsHtml(challenge.choices, state.challengeFlash, state.challengeBad, "choice")}
        </div>
        ${canUseHints ? `<button class="wob-hint-button no-zoom ${hintAvailable ? "" : "is-disabled"}" id="challengeHintButton" type="button" ${hintAvailable ? "" : "disabled"}>Hint</button>` : ""}
      </div>
    `, { status: "Challenge", rootClass: "is-challenge-screen" });

    wireGameMenu();

    document.querySelectorAll("[data-choice]").forEach(btn => {
      btn.addEventListener("click", () => {
        handleChallengeChoice(btn.dataset.choice || "");
      });
    });

    document
      .getElementById("challengeHintButton")
      ?.addEventListener("click", handleChallengeHint);
  }

  function typedChallengeHtml(challenge, filledCount) {
    if (challenge.type === "reference" && challenge.refKind === "book") {
      return `
        <div
          class="wob-challenge-word ${state.challengeBad ? "is-no" : ""}"
          id="challengeWord"
          style="--challenge-count:${Math.max(1, challenge.expected.length + (challenge.fixedPrefix ? 1 : 0))}"
        >
          ${challenge.fixedPrefix
            ? `<span class="wob-ref-separator">${escapeHtml(challenge.fixedPrefix)}</span>`
            : ""}
          ${lettersToTiles(
            challenge.displayText,
            challenge.expected,
            filledCount,
            challenge.color
          )}
        </div>
      `;
    }

    if (challenge.type === "reference") {
      let digitIndex = 0;

      return `
        <div
          class="wob-challenge-word is-reference-number ${state.challengeBad ? "is-no" : ""}"
          id="challengeWord"
          style="--challenge-count:${Math.max(1, String(challenge.displayText || "").length)}"
        >
          ${Array.from(String(challenge.displayText || "")).map(char => {
            if (/\d/.test(char)) {
              const show = digitIndex < filledCount;
              const text = show
                ? challenge.expected[digitIndex]
                : "";

              digitIndex += 1;

              return `<span class="wob-tile ${show ? "" : "is-hidden"}" style="--tile-bg:${challenge.color}">${escapeHtml(text)}</span>`;
            }

            return `<span class="wob-ref-separator">${escapeHtml(char)}</span>`;
          }).join("")}
        </div>
      `;
    }

    return `
      <div
        class="wob-challenge-word ${state.challengeBad ? "is-no" : ""}"
        id="challengeWord"
        style="--challenge-count:${Math.max(1, challenge.expected.length)}"
      >
        ${lettersToTiles(
          challenge.word.display,
          challenge.expected,
          filledCount,
          challenge.color
        )}
      </div>
    `;
  }


  function challengeHintableIndexes(challenge) {
    if (!challenge) return [];

    const expected = challenge.expected || [];
    const filledCount = Math.max(
      0,
      Number(state.challengeInputIndex) || 0
    );

    if (challenge.type === "word") {
      return expected
        .map((_, index) => index)
        .filter(index => {
          return index > 0 &&
            !state.challengeHintIndexes.has(index);
        });
    }

    if (challenge.type === "reference") {
      return expected
        .map((_, index) => index)
        .filter(index => {
          return index > 0 &&
            index >= filledCount &&
            !state.challengeHintIndexes.has(index);
        });
    }

    return [];
  }

  async function handleChallengeHint() {
    const challenge = state.currentChallenge;
    if (!challenge) return;

    const hintable = challengeHintableIndexes(challenge);

    if (!hintable.length) {
      drawChallenge();
      return;
    }

    const revealCount = challenge.type === "reference"
      ? 1
      : ((challenge.expected || []).length >= 8 ? 3 : 2);

    hintable
      .slice(0, revealCount)
      .forEach(index => {
        state.challengeHintIndexes.add(index);
      });

    state.challengeHintCount += 1;
    playHint();
    drawChallenge();
  }

  function lettersToTiles(displayText, expected, filledCount, color, hintIndexes = new Set()) {
    let alphaIndex = 0;
    return Array.from(String(displayText || "")).map(char => {
      if (/[A-Za-z]/.test(char)) {
        const show = alphaIndex < filledCount || hintIndexes.has(alphaIndex);
        const text = show ? expected[alphaIndex] : "";
        alphaIndex += 1;
        return `<span class="wob-tile ${show ? "" : "is-hidden"}" style="--tile-bg:${color || "#ffc751"}">${escapeHtml(text)}</span>`;
      }
      if (/\s/.test(char)) return `<span class="wob-space"> </span>`;
      return `<span class="wob-punct">${escapeHtml(char)}</span>`;
    }).join("");
  }

  async function handleChallengeChoice(letter) {
    const challenge = state.currentChallenge;
    if (!challenge) return;

    const choice = challenge.inputKind === "numbers" ? normalizeDigits(letter).charAt(0) : normalizeLetters(letter).charAt(0);
    const expected = challenge.expected[state.challengeInputIndex];
    if (!expected) return;

    if (choice !== expected) {
      state.challengeFlash = choice;
      state.challengeBad = true;
      playBad();
      document.getElementById("challengeWord")?.classList.add("is-no");

      await sleep(300);
      state.challengeFlash = "";
      state.challengeBad = false;
      drawChallenge();
      return;
    }

    playGood();
    state.challengeFlash = choice;
    state.challengeBad = false;
    state.challengeInputIndex += 1;

    if (state.challengeInputIndex >= challenge.expected.length) {
      await finishChallenge(challenge);
      return;
    }

    drawChallenge();
  }

  async function finishChallenge(challenge) {
    if (!challenge) return;

    if (challenge.isReferenceSequence) {
      const stepEarned = challengeBonusAfterHints(challenge.stepBonus, state.challengeHintCount);
      challenge.sequenceEarnedBonus = (Number(challenge.sequenceEarnedBonus) || 0) + stepEarned;

      const steps = challenge.referenceSteps || [];
      const nextIndex = (challenge.referenceStepIndex || 0) + 1;

      if (nextIndex < steps.length) {
        challenge.referenceStepIndex = nextIndex;
        hydrateReferenceSequenceStep(challenge);
        renderChallenge(challenge);
        return;
      }

      state.refChallengeDone.book = true;
      state.refChallengeDone.chapter = true;
      state.refChallengeDone.verse = true;
      state.refChallengeDone.chapterVerse = true;

      const bonus = Math.max(0, Math.round(Number(challenge.sequenceEarnedBonus) || 0));
      state.baseCash += bonus;
      updateHud();
      drawChallenge();

      if (bonus > 0) await showChallengeBonusPopup(bonus);
      else await sleep(650);

      if (normalRoundComplete()) renderFinalIntro();
      else renderSpinScreen();

      return;
    }

    if (challenge.type === "word") state.challengeHistory.set(challenge.wordIndex, revealedCountForWord(challenge.word));
    if (challenge.type === "reference") state.refChallengeDone[challenge.refKind] = true;

    const rawBonus = Math.max(0, Number(challenge.bonus) || 500);
    const bonus = challengeBonusAfterHints(rawBonus, challenge.type === "word" ? state.challengeHintCount : 0);

    state.baseCash += bonus;
    updateHud();
    drawChallenge();

    if (bonus > 0) await showChallengeBonusPopup(bonus);
    else await sleep(650);

    if (normalRoundComplete()) renderFinalIntro();
    else renderSpinScreen();
  }

  function visualWordPiecesForWord(word, { allowSplit = USE_VISUAL_HYPHENATION_RENDER } = {}) {
    const letterItems = (word?.letters || []).filter(item => item.isLetter);
    const shouldSplit =
      allowSplit &&
      letterItems.length >= SMART_HYPHENATE_MIN_LETTERS &&
      letterItems.length >= 10;

    if (!shouldSplit) {
      return [{
        items: letterItems,
        pieceIndex: 0,
        pieceCount: 1,
        trailingHyphen: false
      }];
    }

    const splitAt = Math.round(clamp(Math.floor(letterItems.length / 2), 5, letterItems.length - 5));

    return [
      {
        items: letterItems.slice(0, splitAt),
        pieceIndex: 0,
        pieceCount: 2,
        trailingHyphen: true
      },
      {
        items: letterItems.slice(splitAt),
        pieceIndex: 1,
        pieceCount: 2,
        trailingHyphen: false
      }
    ];
  }

  function verseWordPieceHtml(word, piece, { allVisible = false, revealingLetter = "", animatingLetter = "", challenge = null, finalMode = false } = {}) {
    const isChallenge = challenge?.type === "word" && challenge.wordIndex === word.index;
    const finalMissingCount = finalMode ? finalMissingItemsForWord(word).length : 0;
    const solved = finalMode ? state.finalSolvedWordIndices.has(word.index) : false;
    const tag = isChallenge || (finalMode && finalMissingCount > 0) ? "button" : "span";
    const attrs = tag === "button"
      ? `type="button" data-word-index="${word.index}" data-word-piece="${piece.pieceIndex}"`
      : `data-word-index="${word.index}" data-word-piece="${piece.pieceIndex}"`;
    const pieceClass = piece.pieceCount > 1
      ? (piece.pieceIndex === 0 ? "is-hyphen-piece" : "is-hyphen-continuation")
      : "";

    const tileHtml = piece.items.map(item => {
      const tileKey = tileKeyFor(word.index, item.index);
      const hidden = finalMode
        ? (state.finalHiddenTileKeys.has(tileKey) && !state.finalFilledTileKeys.has(tileKey))
        : (!allVisible && !state.revealedLetters.has(item.normalized));
      const revealing = revealingLetter && item.normalized === revealingLetter ? "is-revealing" : "";
      const animating = animatingLetter && item.normalized === animatingLetter ? "is-pending-reveal" : "";
      const wiggleTile = isChallenge ? "is-wiggle-tile" : "";
      const tileText = isChallenge ? "?" : (hidden ? "" : item.normalized);

      return `<span class="wob-tile ${hidden && !isChallenge ? "is-hidden" : ""} ${revealing} ${animating} ${wiggleTile} ${isChallenge ? "is-question-tile" : ""}" data-tile-key="${escapeHtml(tileKey)}" data-normalized="${escapeHtml(item.normalized)}" style="--tile-bg:${word.color};--wiggle-delay:${item.index * 70}ms">${escapeHtml(tileText)}</span>`;
    }).join("");

    const lastIndex = piece.items[piece.items.length - 1]?.index || 0;
    const hyphenHtml = piece.trailingHyphen
      ? `<span class="wob-tile is-hyphen-tile ${isChallenge ? "is-wiggle-tile" : ""}" aria-hidden="true" style="--tile-bg:#8b8b8b;--wiggle-delay:${(lastIndex + 1) * 70}ms">-</span>`
      : "";

    return `<${tag} class="wob-word ${pieceClass} ${isChallenge ? "is-wiggling" : ""} ${solved ? "is-solved" : ""}" ${attrs} style="--word-color:${word.color}">
      ${tileHtml}${hyphenHtml}
    </${tag}>`;
  }

  function verseWordHtml(word, options = {}) {
    return visualWordPiecesForWord(word)
      .map(piece => verseWordPieceHtml(word, piece, options))
      .join("");
  }


  function smartLayoutPiecesForWords(words, { allowHyphenation = false } = {}) {
    const allowSplit = USE_VISUAL_HYPHENATION_RENDER && allowHyphenation;

    return words.filter(Boolean).flatMap(word => {
      return visualWordPiecesForWord(word, { allowSplit })
        .map(piece => ({ word, piece }));
    });
  }

  function smartVerseItemHtml(item, options = {}) {
    if (item?.word && item?.piece) {
      return verseWordPieceHtml(item.word, item.piece, options);
    }

    return verseWordHtml(item, options);
  }

  function smartWordLetterCount(word) {
    if (word?.piece?.items) return word.piece.items.filter(item => item.isLetter).length;
    return (word?.letters || []).filter(item => item.isLetter).length;
  }

  function smartWordUnits(word) {
    const letters = smartWordLetterCount(word);
    const hyphenUnits = word?.piece?.trailingHyphen ? 1.12 : 0;
    return Math.max(1.25, letters + Math.max(0, letters - 1) * .12 + .72 + hyphenUnits);
  }

  function smartRowWidthFromUnits(units, start, end) {
    let width = 0;

    for (let i = start; i < end; i += 1) {
      width += Number(units[i]) || 0;
      if (i > start) width += .72;
    }

    return width;
  }


  function smartMinimumLineUnits() {
    return 4.6;
  }

  function smartReferenceUnits() {
    const meta = state.referenceMeta || {};
    const bookText = String(meta.book || "").trim();
    const chapterText = meta.chapter ? String(meta.chapter) : "";
    const verseText = meta.reference || (meta.verse ? String(meta.verse) : "");

    const parts = [];

    if (bookText) {
      const bookLetters = normalizeLetters(bookText).length || bookText.length;
      parts.push(clamp(bookLetters * .58 + 2.4, 4.6, 11.5));
    }

    if (chapterText) {
      parts.push(clamp(chapterText.length * .75 + 1.8, 2.4, 4.2));
    }

    if (verseText) {
      parts.push(clamp(String(verseText).length * .62 + 1.8, 2.4, 5.2));
    }

    if (!parts.length) return 0;

    return parts.reduce((sum, value) => sum + value, 0) + Math.max(0, parts.length - 1) * .62;
  }

  function smartAvailableBoxEstimate() {
    const stageWidth = Math.min(920, Math.max(280, window.innerWidth - 20));
    const stageHeight = Math.max(280, window.innerHeight - 68);

    return {
      width: stageWidth,
      height: stageHeight,
      ratio: stageWidth / Math.max(1, stageHeight)
    };
  }

  function buildSmartLinePlanForCount(words, units, lineCount, targetWidth) {
    const n = words.length;
    const rowsWanted = Math.max(1, Math.min(n, Math.round(Number(lineCount) || 1)));
    const minLineUnits = smartMinimumLineUnits();
    const dp = Array.from({ length: rowsWanted + 1 }, () => Array(n + 1).fill(null));

    dp[0][0] = { score: 0, prev: -1 };

    for (let row = 1; row <= rowsWanted; row += 1) {
      for (let end = row; end <= n; end += 1) {
        let best = null;

        for (let start = row - 1; start < end; start += 1) {
          const previous = dp[row - 1][start];
          if (!previous) continue;

          const rowWidth = smartRowWidthFromUnits(units, start, end);
          const diff = rowWidth - targetWidth;
          const wordCount = end - start;
          const shortBy = Math.max(0, minLineUnits - rowWidth);

          const balanceScore = diff * diff;
          const shortLinePenalty = shortBy ? shortBy * shortBy * 140 : 0;
          const singleShortWordPenalty = wordCount === 1 && shortBy > 0 ? 90 : 0;
          const tooWidePenalty = rowWidth > targetWidth ? Math.abs(diff) * 1.8 : 0;

          const score =
            previous.score +
            balanceScore +
            shortLinePenalty +
            singleShortWordPenalty +
            tooWidePenalty;

          if (!best || score < best.score) {
            best = { score, prev: start };
          }
        }

        dp[row][end] = best;
      }
    }

    if (!dp[rowsWanted][n]) return null;

    const rows = [];
    let end = n;

    for (let row = rowsWanted; row > 0; row -= 1) {
      const item = dp[row][end];
      if (!item) return null;

      rows.unshift(words.slice(item.prev, end));
      end = item.prev;
    }

    return rows;
  }

  function scoreSmartLinePlan(rows, box, refUnits) {
    const minLineUnits = smartMinimumLineUnits();

    const rowWidths = rows.map(row => row.reduce((sum, word, index) => {
      return sum + smartWordUnits(word) + (index > 0 ? .72 : 0);
    }, 0));

    const verseWidth = Math.max(1, ...rowWidths);
    const layoutHeight =
      rows.length +
      Math.max(0, rows.length - 1) * .36 +
      (refUnits > 0 ? 1.05 : 0) +
      (refUnits > 0 ? .72 : 0);

    const idealVerseWidth = Math.max(minLineUnits, box.ratio * layoutHeight);
    const verseRatio = verseWidth / Math.max(1, layoutHeight);
    const tileByWidth = box.width / Math.max(1, Math.max(verseWidth, refUnits * .72));
    const tileByHeight = box.height / Math.max(1, layoutHeight);
    const tileSize = Math.min(tileByWidth, tileByHeight);

    const averageWidth = rowWidths.reduce((sum, value) => sum + value, 0) / Math.max(1, rowWidths.length);

    const aspectPenalty = Math.abs(Math.log(verseRatio / Math.max(.1, box.ratio))) * 330;

    const widestLinePenalty = Math.max(0, verseWidth - idealVerseWidth);
    const widestPenalty = widestLinePenalty * widestLinePenalty * 28;

    const balancePenalty = rowWidths.reduce((sum, value) => {
      return sum + Math.abs(value - averageWidth);
    }, 0) / Math.max(1, rowWidths.length);

    const shortLinePenalty = rowWidths.reduce((sum, width) => {
      const shortBy = Math.max(0, minLineUnits - width);
      return sum + shortBy * shortBy * 95;
    }, 0);

    const tinySingleWordPenalty = rows.reduce((sum, row, index) => {
      if (row.length !== 1) return sum;
      const width = rowWidths[index] || 0;
      return width < minLineUnits ? sum + 120 : sum;
    }, 0);

    return aspectPenalty +
      widestPenalty +
      balancePenalty * .65 +
      shortLinePenalty +
      tinySingleWordPenalty -
      tileSize * .45;
  }

  function chooseSmartVerseRows(words) {
    const cleanWords = words.filter(Boolean);
    if (!cleanWords.length) return [];

    const box = smartAvailableBoxEstimate();
    const refUnits = smartReferenceUnits();
    const minLineUnits = smartMinimumLineUnits();

    const variants = [
      {
        items: smartLayoutPiecesForWords(cleanWords, { allowHyphenation: false }),
        hyphenated: false
      }
    ];

    if (USE_SMART_HYPHENATION_PLANNER) {
      variants.push({
        items: smartLayoutPiecesForWords(cleanWords, { allowHyphenation: true }),
        hyphenated: true
      });
    }

    let best = null;

    for (const variant of variants) {
      const cleanItems = variant.items.filter(Boolean);
      if (!cleanItems.length) continue;

      const units = cleanItems.map(smartWordUnits);
      const totalUnits = units.reduce((sum, value) => sum + value, 0) + Math.max(0, units.length - 1) * .72;
      const hyphenationPenalty = variant.hyphenated ? 18 : 0;

      for (let rowCount = 1; rowCount <= cleanItems.length; rowCount += 1) {
        const estimatedHeight =
          rowCount +
          Math.max(0, rowCount - 1) * .36 +
          (refUnits > 0 ? 1.05 : 0) +
          (refUnits > 0 ? .72 : 0);

        const aspectTargetWidth = Math.max(minLineUnits, box.ratio * estimatedHeight);
        const averageTargetWidth = totalUnits / rowCount;

        const targetWidths = [
          aspectTargetWidth * .86,
          aspectTargetWidth,
          aspectTargetWidth * 1.14,
          (aspectTargetWidth + averageTargetWidth) / 2,
          averageTargetWidth
        ].map(value => clamp(value, minLineUnits, totalUnits));

        for (const targetWidth of Array.from(new Set(targetWidths.map(value => Math.round(value * 10) / 10)))) {
          const rows = buildSmartLinePlanForCount(cleanItems, units, rowCount, targetWidth);
          if (!rows) continue;

          const score = scoreSmartLinePlan(rows, box, refUnits) + hyphenationPenalty;

          if (!best || score < best.score) {
            best = { rows, score };
          }
        }
      }
    }

    return best?.rows || [smartLayoutPiecesForWords(cleanWords, { allowHyphenation: false })];
  }

  function smartVerseRowsHtml(options = {}) {
    const rows = chooseSmartVerseRows(state.words);

    return rows.map((rowItems, rowIndex) => {
      return `<div class="wob-verse-row" data-row-index="${rowIndex}">
        ${rowItems.map(item => smartVerseItemHtml(item, options)).join("")}
      </div>`;
    }).join("");
  }


  function oldFlexVerseHtml(options = {}) {
    return state.tokens.map(token => {
      if (token.kind === "space") return `<span class="wob-space"> </span>`;
      if (token.kind === "punct") return "";
      const word = state.words[token.wordIndex];
      if (!word) return "";
      return verseWordHtml(word, options);
    }).join("");
  }

  function verseBoardHtml({ allVisible = false, revealingLetter = "", animatingLetter = "", challenge = null, finalMode = false } = {}) {
    const options = { allVisible, revealingLetter, animatingLetter, challenge, finalMode };
    const boardClass = [
      finalMode ? "wob-final-board" : "",
      USE_SMART_VERSE_ROWS ? "is-smart-rows" : ""
    ].filter(Boolean).join(" ");

    return `
      <div class="wob-verse-card is-with-reference">
        <div class="wob-verse-board ${boardClass}" id="wobVerseBoard">
          ${USE_SMART_VERSE_ROWS ? smartVerseRowsHtml(options) : oldFlexVerseHtml(options)}
          ${referenceTilesHtml(challenge, { finalMode })}
        </div>
      </div>`;
  }


  function referenceTilesHtml(challenge, { finalMode = false } = {}) {
    const meta = state.referenceMeta || {};
    const bookText = String(meta.book || "").trim().toUpperCase();
    const chapter = meta.chapter == null ? "" : String(meta.chapter);
    const verseText = meta.verse == null ? "" : (meta.verseEnd ? `${meta.verse}-${meta.verseEnd}` : String(meta.verse));
    if (finalMode) return finalProgressHtml();
    if (!bookText && !chapter && !verseText) return "";

    const bookClass = challenge?.type === "reference" && challenge.refKind === "book" ? "is-wiggling" : "";
    const chapterClass = challenge?.type === "reference" && challenge.refKind === "chapter" ? "is-wiggling" : "";
    const verseClass = challenge?.type === "reference" && challenge.refKind === "verse" ? "is-wiggling" : "";

    const bookTag = bookClass ? "button" : "span";
    const chapterTag = chapterClass ? "button" : "span";
    const verseTag = verseClass ? "button" : "span";

    return `<span class="wob-ref-board" id="wobReferenceBoard">
      ${bookText ? `<${bookTag} class="wob-ref-group ${bookClass}" ${bookClass ? 'type="button" data-ref-kind="book"' : ''}><span class="wob-ref-tile is-book ${bookClass ? "is-wiggle-tile" : ""}" style="--wiggle-delay:0ms">${escapeHtml(bookText)}</span></${bookTag}>` : ""}
      ${chapter ? `<${chapterTag} class="wob-ref-group ${chapterClass}" ${chapterClass ? 'type="button" data-ref-kind="chapter"' : ''}><span class="wob-ref-tile ${chapterClass ? "is-wiggle-tile" : ""}" style="--wiggle-delay:70ms">${escapeHtml(chapter)}</span></${chapterTag}>` : ""}
      ${verseText ? `<${verseTag} class="wob-ref-group ${verseClass}" ${verseClass ? 'type="button" data-ref-kind="verse"' : ''}><span class="wob-ref-tile ${verseClass ? "is-wiggle-tile" : ""}" style="--wiggle-delay:140ms">${escapeHtml(verseText)}</span></${verseTag}>` : ""}
    </span>`;
  }

  function fitVerseBoardSoon() {
    if (currentFitRaf) cancelAnimationFrame(currentFitRaf);
    currentFitRaf = requestAnimationFrame(() => { currentFitRaf = 0; fitVerseBoard(); });
  }
  function fitVerseBoard() {
    const board = document.getElementById("wobVerseBoard");
    const card = board?.closest(".wob-verse-card");
    if (!board || !card) return;

    const box = card.getBoundingClientRect();
    const fitWidth = Math.max(80, box.width - 4);
    const fitHeight = Math.max(80, box.height - 4);
    const isSmartRows = board.classList.contains("is-smart-rows");

    const apply = (tileSize, lineGap) => {
      board.style.setProperty("--wob-tile-size", `${tileSize}px`);
      board.style.setProperty("--wob-tile-gap", `${Math.max(2, tileSize * .12)}px`);
      board.style.setProperty("--wob-line-gap", `${lineGap}px`);
    };

    const overflows = () => {
      const rowOver = Array.from(board.querySelectorAll(".wob-verse-row, .wob-ref-board"))
        .some(item => item.scrollWidth > item.clientWidth + 2);

      return rowOver ||
        board.scrollWidth > fitWidth + 2 ||
        board.scrollHeight > fitHeight + 2;
    };

    if (!isSmartRows) {
      const letterCount = state.words.reduce((sum, word) => sum + word.letters.length, 0);
      let size = clamp(Math.sqrt((fitWidth * fitHeight) / Math.max(24, letterCount)) * 1.38, 18, 56);
      let lineGap = Math.max(6, size * .32);

      for (let i = 0; i < 28; i += 1) {
        apply(size, lineGap);
        if (!overflows()) break;

        size -= 1.5;
        lineGap = Math.max(4, size * .25);
        if (size <= 13) break;
      }

      const extra = Math.max(0, (fitHeight - board.scrollHeight) / Math.max(1, Math.ceil(state.words.length / 4)));
      if (extra > 8) apply(size, Math.min(size * .72, lineGap + extra * .38));
      return;
    }

    const maxTileSize = fitWidth < 520
      ? 78
      : fitWidth < 760
        ? 88
        : 98;

    let size = maxTileSize;
    let lineGap = Math.max(5, size * .27);

    for (let i = 0; i < 70; i += 1) {
      apply(size, lineGap);
      if (!overflows()) break;

      size -= size > 48 ? 1.25 : 1;
      lineGap = Math.max(4, size * .23);

      if (size <= 13) break;
    }

    apply(Math.max(13, size), Math.max(4, lineGap));
  }
  window.addEventListener("resize", fitVerseBoardSoon);
  window.addEventListener("orientationchange", () => setTimeout(fitVerseBoardSoon, 250));

  function renderFinalIntro() {
    clearTimers(); state.screen = "finalIntro";
    app.innerHTML = rootHtml(`
      <div class="wob-panel wob-final-intro-panel">
        <div class="wob-final-intro-center">
          <div class="wob-final-intro-wheel-wrap">
            <img class="wob-final-intro-wheel" src="${WHEEL_FACE_IMAGE}" alt="" draggable="false">
          </div>
          <div class="wob-big-title wob-final-intro-title">FINAL ROUND!</div>
          <div class="wob-subtitle wob-final-intro-subtitle">One minute to fill in as many missing letters as possible.</div>
        </div>
        <button class="wob-btn wob-final-begin-btn no-zoom" id="startFinalBtn" type="button">Begin!</button>
      </div>
    `, { status: "Final Round", rootClass: "is-final-intro-screen" });
    wireGameMenu(); document.getElementById("startFinalBtn")?.addEventListener("click", startFinalRound);
  }

  function startFinalRound() {
    state.screen = "finalRound";
    preloadImage(CLOCK_IMAGE);
    state.finalStartedAt = Date.now();
    state.finalTimeLeft = FINAL_ROUND_SECONDS;
    state.finalActiveWord = null;
    state.finalInputIndex = 0;
    state.finalLetterStreak = 0;
    buildFinalHiddenTiles();
    renderFinalRound();
    updateFinalProgressBar();

    finalTimerId = setInterval(() => {
      const elapsedMs = Date.now() - state.finalStartedAt;
      state.finalTimeLeft = Math.max(0, FINAL_ROUND_SECONDS - Math.floor(elapsedMs / 1000));
      updateFinalProgressBar();

      if (elapsedMs >= FINAL_ROUND_SECONDS * 1000) {
        state.finalTimeLeft = 0;
        updateFinalProgressBar();
        finishFinalRound();
      }
    }, 250);
  }


  function finalRoundProgressRatio() {
    const startedAt = Number(state.finalStartedAt) || Date.now();
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    return clamp(1 - (elapsedMs / (FINAL_ROUND_SECONDS * 1000)), 0, 1);
  }

  function finalRoundProgressClass(ratio) {
    if (ratio <= .2) return "is-red";
    if (ratio <= .5) return "is-yellow";
    return "is-green";
  }

  function finalProgressHtml() {
    const ratio = finalRoundProgressRatio();

    return `<span class="wob-ref-board wob-final-progress-board" id="wobFinalProgressBoard" aria-label="Final round time remaining">
      <span class="wob-final-progress-track">
        <span class="wob-final-progress-fill ${finalRoundProgressClass(ratio)}" id="finalProgressFill" style="--final-progress:${ratio}"></span>
      </span>
    </span>`;
  }

  function updateFinalProgressBar() {
    const fill = document.getElementById("finalProgressFill");
    if (!fill) return;

    const ratio = finalRoundProgressRatio();
    fill.style.setProperty("--final-progress", ratio.toFixed(4));
    fill.classList.toggle("is-green", ratio > .5);
    fill.classList.toggle("is-yellow", ratio <= .5 && ratio > .2);
    fill.classList.toggle("is-red", ratio <= .2);
  }

  function renderFinalRound() {
    app.innerHTML = rootHtml(`
      <div class="wob-verse-wrap">
        <div class="wob-final-hud"><div class="wob-subtitle wob-final-instruction">Tap words with missing letters!</div></div>
        ${verseBoardHtml({ finalMode: true })}
      </div>
    `, { status: "Final Round", rootClass: "is-board-screen is-final-round-screen" });
    wireGameMenu(); fitVerseBoardSoon(); updateFinalProgressBar();
    document.querySelectorAll("button[data-word-index]").forEach(btn => btn.addEventListener("click", () => {
      const index = Number(btn.dataset.wordIndex); if (state.finalSolvedWordIndices.has(index)) return; openFinalWord(index);
    }));
  }

  function openFinalWord(wordIndex) {
    const word = state.words[wordIndex];
    if (!word || state.finalTimeLeft <= 0) return;

    const missingItems = finalMissingItemsForWord(word);
    if (!missingItems.length) return;

    state.finalActiveWord = {
      wordIndex,
      word,
      missingItems,
      expected: missingItems.map(item => item.normalized)
    };
    state.finalInputIndex = 0;
    state.finalLetterStreak = 0;
    state.finalFlash = "";
    state.finalBad = false;
    renderFinalModal();
  }

  function renderFinalModal() {
    const active = state.finalActiveWord; if (!active) return;
    const uniqueCorrect = Array.from(new Set(active.expected));
    const targetCount = Math.max(10, uniqueCorrect.length);
    if (!active.choices) active.choices = makeChoiceLetters(uniqueCorrect, state.uniqueLetters, targetCount);

    const modal = document.createElement("div");
    modal.className = "wob-final-modal";
    modal.id = "wobFinalModal";
    modal.innerHTML = `<div class="wob-final-modal-panel"><div class="wob-big-title">Fill the Blanks</div>${finalWordHtml(active)}<div class="wob-choice-grid is-rowed is-wide">${choiceRowsHtml(active.choices, state.finalFlash, state.finalBad, "final-choice")}</div><div class="wob-bonus-line">Streak: ${escapeHtml(String(state.finalLetterStreak))} • Next: ${escapeHtml(formatMoney((state.finalLetterStreak + 1) * 100))}</div></div>`;

    document.getElementById("wobFinalModal")?.remove();
    document.querySelector(".wob-card")?.appendChild(modal);
    modal.querySelectorAll("[data-final-choice]").forEach(btn => btn.addEventListener("click", () => handleFinalChoice(btn.dataset.finalChoice || "")));
  }

  function finalWordHtml(active) {
    const missingIndexByLetterIndex = new Map();
    active.missingItems.forEach((item, index) => {
      missingIndexByLetterIndex.set(item.index, index);
    });

    let alphaIndex = 0;
    const html = Array.from(String(active.word.display || "")).map(char => {
      const item = active.word.letters[alphaIndex];

      if (/[A-Za-z]/.test(char)) {
        const missingIndex = item ? missingIndexByLetterIndex.get(item.index) : undefined;
        const isMissing = missingIndex !== undefined;
        const show = !isMissing || missingIndex < state.finalInputIndex;
        const text = show && item ? item.normalized : "";

        alphaIndex += 1;

        return `<span class="wob-tile ${show ? "" : "is-hidden"}" style="--tile-bg:${active.word.color}">${escapeHtml(text)}</span>`;
      }

      if (/\s/.test(char)) return `<span class="wob-space"> </span>`;
      return `<span class="wob-punct">${escapeHtml(char)}</span>`;
    }).join("");

    return `<div class="wob-challenge-word ${state.finalBad ? "is-no" : ""}" id="finalWordDisplay" style="--challenge-count:${Math.max(1, active.word.letters.length)}">${html}</div>`;
  }

  async function handleFinalChoice(letter) {
    const active = state.finalActiveWord; if (!active || state.finalTimeLeft <= 0) return;
    const choice = normalizeLetters(letter).charAt(0); const expected = active.expected[state.finalInputIndex]; if (!expected) return;
    if (choice !== expected) {
      state.finalLetterStreak = 0; state.finalFlash = choice; state.finalBad = true; playBad(); renderFinalModal(); await sleep(260); state.finalFlash = ""; state.finalBad = false; renderFinalModal(); return;
    }
    state.finalLetterStreak += 1; const earned = state.finalLetterStreak * 100; state.finalCash += earned; state.finalInputIndex += 1; state.finalFlash = choice; state.finalBad = false; updateHud(); playGood();
    if (state.finalInputIndex >= active.expected.length) {
      for (const item of active.missingItems) {
        state.finalFilledTileKeys.add(tileKeyFor(active.word.index, item.index));
      }

      state.finalSolvedWordIndices.add(active.wordIndex);
      document.getElementById("wobFinalModal")?.remove();
      state.finalActiveWord = null;

      if (finalRoundComplete()) {
        await finishFinalRound({ showTimesUp: false, showVerseComplete: true });
        return;
      }

      renderFinalRound();
      return;
    }
    renderFinalModal();
  }

  async function finishFinalRound({ showTimesUp = true, showVerseComplete = false } = {}) {
    if (finalTimerId) { clearInterval(finalTimerId); finalTimerId = null; }
    document.getElementById("wobFinalModal")?.remove();

    if (showTimesUp) await showTimesUpPopup();
    else if (showVerseComplete) await showVerseCompletePopup();

    renderMoneyTotalScreen();
  }

  async function showTimesUpPopup() {
    const card = document.querySelector(".wob-card");
    if (!card) {
      await sleep(900);
      return;
    }

    const popup = document.createElement("div");
    popup.className = "wob-times-up-overlay";
    popup.innerHTML = `
      <div class="wob-times-up-card">
        <img class="wob-times-up-clock" src="${CLOCK_IMAGE}" alt="" draggable="false">
        <div class="wob-times-up-title">Time’s Up!</div>
      </div>
    `;
    card.appendChild(popup);

    playPrize();
    await sleep(2500);

    popup.classList.add("is-leaving");
    await sleep(320);
    popup.remove();
  }


  async function showVerseCompletePopup() {
    const card = document.querySelector(".wob-card");
    if (!card) {
      await sleep(900);
      return;
    }

    const popup = document.createElement("div");
    popup.className = "wob-times-up-overlay";
    popup.innerHTML = `
      <div class="wob-times-up-card wob-verse-complete-card">
        <div class="wob-times-up-title wob-verse-complete-title">Verse complete!</div>
      </div>
    `;
    card.appendChild(popup);

    playPrize();
    await sleep(2500);

    popup.classList.add("is-leaving");
    await sleep(320);
    popup.remove();
  }

  async function renderMoneyTotalScreen() {
    clearTimers(); state.screen = "moneyTotal";
    const normalTotal = state.baseCash + state.finalCash;
    app.innerHTML = rootHtml(`
      <div class="wob-panel wob-money-panel">
        <div class="wob-money-center">
          <div class="wob-big-title wob-money-total-title">Bible Bux</div>
          <div class="wob-money-total" id="moneyCount">$0</div>
          <div class="wob-prize-list" id="prizeList"></div>
        </div>
        <button class="wob-btn wob-complete-btn no-zoom" id="completeBtn" type="button" style="display:none">Complete</button>
      </div>
    `, { status: "Total", rootClass: "is-money-screen" });
    wireGameMenu(); await animateMoneyCount(document.getElementById("moneyCount"), 0, normalTotal, 1400);
    const prizeList = document.getElementById("prizeList"); let running = normalTotal;
    for (const prize of state.prizeEarnings) {
      const card = document.createElement("div");
      const img = document.createElement("img");

      card.className = "wob-prize-card is-image-only";
      img.className = "wob-prize-card-image";
      img.src = prizeImageSrc(prize);
      img.alt = prizeImageAlt(prize);
      img.draggable = false;

      card.appendChild(img);
      prizeList?.appendChild(card);

      playPrize(); await animateMoneyCount(document.getElementById("moneyCount"), running, running + prize.total, 520); running += prize.total; await sleep(160);
    }
    document.getElementById("completeBtn").style.display = "inline-flex";
    document.getElementById("completeBtn")?.addEventListener("click", renderComplete);
  }

  function animateMoneyCount(el, from, to, ms) {
    return new Promise(resolve => {
      if (!el) return resolve(); const start = performance.now(); const duration = Math.max(120, Number(ms) || 500);
      const step = now => {
        const t = clamp((now - start) / duration, 0, 1); const eased = 1 - Math.pow(1 - t, 3); const value = from + (to - from) * eased; el.textContent = formatMoney(value);
        if (t < 1) { if (Math.random() < .18) playTone({ midi: 72 + Math.floor(Math.random() * 7), duration: .035, volume: .07 }); requestAnimationFrame(step); }
        else { el.textContent = formatMoney(to); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  async function markVersePracticed() {
    const verseId = ctx.verseId; if (!verseId) return { ok: false };
    if (typeof bridge().markVersePracticed === "function") {
      try { return bridge().markVersePracticed({ verseId }); }
      catch (err) { console.warn("Wheel of Bible bridge markVersePracticed failed", err); }
    }
    return { ok: false };
  }

  async function renderComplete() {
    if (state.completed) return; state.completed = true; await markVersePracticed();
    const statsText = `${formatMoney(totalCash())} earned • ${state.finalFilledTileKeys.size} final letters filled`;
    if (shell().renderCompleteScreen) {
      shell().renderCompleteScreen({
        app, title: "Wheel Complete!", icon: GAME_ICON, iconHtml: GAME_ICON_HTML, statsText, playAgainText: "Play Again", moreGamesText: "Back to Playground", backLabel: "Back to Playground", theme: GAME_THEME,
        onPlayAgain: () => beginRun(), onMoreGames: () => bridge().exitGame?.()
      });
    } else {
      app.innerHTML = `<div class="wob-root"><div class="wob-panel"><div class="wob-big-title">Complete!</div><button class="wob-btn" id="backBtn">Back</button></div></div>`;
      document.getElementById("backBtn")?.addEventListener("click", () => bridge().exitGame?.());
    }
  }

  renderIntro();
})();
