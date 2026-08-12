
(async function(){
  const app = document.getElementById("app");
  if (app) app.classList.add("vm-shell", "vsp-shell");

  const ctx = await window.VerseGameBridge.getVerseContext();
  const GAME_ID = "verse_splat";
  const GAME_TITLE = "Verse Splat";
  const GAME_ICON = "🫟";
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
  accent: "#7f66c6"
};

const BUILD_AREA = "compact";

const HELP_OVERLAY_ID = "vspHelpOverlay";

  const BONUS_TIME_LIMIT_MS = 10000;
  const BONUS_BLOB_COUNT = 3;
  const BONUS_MASTERPIECE_PAUSE_MS = 2000;
  const BONUS_RESPAWN_DELAY_MS = 1000;
  const CORRECT_TAP_LOCK_MS = 180;
  const MAX_STATIC_PAINT_SPLATS = 96;

  function coverageGridSize(){
    const opportunities = Math.max(1, state.segments.length || 1);

    if (opportunities <= 15){
      return { cols: 6, rows: 8 };
    }

    if (opportunities <= 21){
      return { cols: 7, rows: 9 };
    }

    if (opportunities <= 28){
      return { cols: 8, rows: 10 };
    }

    return { cols: 9, rows: 11 };
  }

  function coverageGridTotal(){
    const grid = coverageGridSize();
    return grid.cols * grid.rows;
  }

  const STATIC_PAINT_BLOB_SHAPES = [
    "./verse_splat_images/verse_splat_paint_blob_1.svg",
    "./verse_splat_images/verse_splat_paint_blob_2.svg",
    "./verse_splat_images/verse_splat_paint_blob_3.svg",
    "./verse_splat_images/verse_splat_paint_blob_4.svg",
    "./verse_splat_images/verse_splat_paint_blob_5.svg",
    "./verse_splat_images/verse_splat_paint_blob_6.svg",
    "./verse_splat_images/verse_splat_paint_blob_7.svg",
    "./verse_splat_images/verse_splat_paint_blob_8.svg",
    "./verse_splat_images/verse_splat_paint_blob_9.svg",
    "./verse_splat_images/verse_splat_paint_blob_10.svg",
    "./verse_splat_images/verse_splat_paint_blob_11.svg"
  ];

  const staticPaintBlobImageCache = new Map();

  function getStaticPaintBlobImage(src) {
    if (!src) return null;

    if (staticPaintBlobImageCache.has(src)) {
      return staticPaintBlobImageCache.get(src);
    }

    const img = new Image();
    img.decoding = "async";
    img.onload = () => renderStaticPaintSplats();
    img.onerror = () => { };
    img.src = src;

    staticPaintBlobImageCache.set(src, img);

    return img;
  }

  STATIC_PAINT_BLOB_SHAPES.forEach(getStaticPaintBlobImage);

  let muted = false;
  let lastBoardPressAt = 0;

  const VERSE_SPLAT_SOUND_BASE = "./verse_splat_sounds/";
  const SHARED_UI_SOUND_BASE = "../../ui_audio/";

  const VERSE_SPLAT_SOUNDS = {
    uiTap: [
      `${SHARED_UI_SOUND_BASE}ui_sound_pop_1.mp3`,
      `${SHARED_UI_SOUND_BASE}ui_sound_pop_2.mp3`
    ],
    pop: [
      "verse_splat_pop_1.mp3",
      "verse_splat_pop_2.mp3",
      "verse_splat_pop_3.mp3",
      "verse_splat_pop_4.mp3",
      "verse_splat_pop_5.mp3"
    ],
    correct: [
      "verse_splat_correct_1.mp3",
      "verse_splat_correct_2.mp3",
      "verse_splat_correct_3.mp3"
    ],
    wrong: "verse_splat_wrong.mp3",
    streak: "verse_splat_streak.mp3",
    paintScore: "verse_splat_paint_score.mp3",
    start: "verse_splat_start.mp3",
    positive: "verse_splat_positive.mp3"
  };

  const verseSplatSoundCache = new Map();
  const verseSplatLastSoundByGroup = {};
  let verseSplatAudioUnlocked = false;

  function verseSplatSoundSrc(file){
    const value = String(file || "");

    if (value.includes("/") || value.startsWith("http") || value.startsWith("data:")){
      return value;
    }

    return `${VERSE_SPLAT_SOUND_BASE}${value}`;
  }

  function primeVerseSplatSound(file){
    if (!file) return null;

    const src = verseSplatSoundSrc(file);

    if (!verseSplatSoundCache.has(src)){
      const audio = new Audio(src);
      audio.preload = "auto";
      verseSplatSoundCache.set(src, audio);
    }

    return verseSplatSoundCache.get(src);
  }

  function unlockVerseSplatAudio(){
    if (verseSplatAudioUnlocked) return;

    verseSplatAudioUnlocked = true;

    Object.values(VERSE_SPLAT_SOUNDS).flat().forEach(file => {
      primeVerseSplatSound(file);
    });
  }

  document.addEventListener("pointerdown", unlockVerseSplatAudio, { capture:true, once:true });
  document.addEventListener("touchstart", unlockVerseSplatAudio, { capture:true, once:true });
  document.addEventListener("keydown", unlockVerseSplatAudio, { capture:true, once:true });

  function chooseVerseSplatSound(groupName){
    const group = VERSE_SPLAT_SOUNDS[groupName];
    if (!Array.isArray(group) || !group.length) return group || null;

    let choices = group;

    if (group.length > 1 && verseSplatLastSoundByGroup[groupName]){
      choices = group.filter(file => file !== verseSplatLastSoundByGroup[groupName]);
    }

    const file = choices[Math.floor(Math.random() * choices.length)] || group[0];
    verseSplatLastSoundByGroup[groupName] = file;

    return file;
  }

  function playVerseSplatSoundFile(file, volume=1){
    if (muted || !file) return;

    try {
      unlockVerseSplatAudio();

      const base = primeVerseSplatSound(file);
      if (!base) return;

      const audio = base.cloneNode(true);
      audio.volume = volume;
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function"){
        playPromise.catch(() => {});
      }
    } catch (err) {}
  }

  function playVerseSplatSoundGroup(groupName, volume=1){
    playVerseSplatSoundFile(chooseVerseSplatSound(groupName), volume);
  }

  function playSharedUiPopSound(){
    playVerseSplatSoundGroup("uiTap", 0.45);
  }

  function playPopSound(){
    playVerseSplatSoundGroup("pop", 0.72);
  }

  function playCorrectSound(){
    playVerseSplatSoundGroup("correct", 0.88);
  }

  function playWrongSound(){
    playVerseSplatSoundFile(VERSE_SPLAT_SOUNDS.wrong, 0.9);
  }

  function playStreakSound(){
    playVerseSplatSoundFile(VERSE_SPLAT_SOUNDS.streak, 0.95);
  }

  function playPaintScoreSound(){
    playVerseSplatSoundFile(VERSE_SPLAT_SOUNDS.paintScore, 0.92);
  }

  function playStartSound(){
    playVerseSplatSoundFile(VERSE_SPLAT_SOUNDS.start, 0.92);
  }

  function playPositiveSound(){
    playVerseSplatSoundFile(VERSE_SPLAT_SOUNDS.positive, 0.9);
  }

  function playSpawnPopSoundForCount(count=1){
    const total = Math.max(0, Math.min(count, 4));

    for (let i = 0; i < total; i++){
      setTimeout(() => playPopSound(), i * 48);
    }
  }

  const $ = (s, root=document) => root.querySelector(s);
  const escapeHtml = (str) => String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const clamp = window.VerseGameShell.clamp;
  const rand = (min, max) => min + Math.random() * (max - min);

  function hexToRgb(hex){
    const clean = String(hex || "").replace("#", "").trim();
    if (clean.length !== 6) return { r:255, g:255, b:255 };
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b){
    const toHex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function adjustHexColor(hex, amount){
    const { r, g, b } = hexToRgb(hex);
    if (amount >= 0){
      return rgbToHex(
        r + (255 - r) * amount,
        g + (255 - g) * amount,
        b + (255 - b) * amount
      );
    }
    const factor = 1 + amount;
    return rgbToHex(r * factor, g * factor, b * factor);
  }

  const BLOB_COLORS = [
    { fill:"#ff5a51", text:"#fff" },
    { fill:"#ffa351", text:"#fff" },
    { fill:"#ffc751", text:"#333" },
    { fill:"#a7cb6f", text:"#fff" },
    { fill:"#40b9c5", text:"#fff" },
    { fill:"#7f66c6", text:"#fff" }
  ];

  const BLOB_SHAPES = {
    compact: {
      type: "compact",
      src: "./verse_splat_images/verse_splat_blob_compact.svg",
      ratio: 617.24402 / 352
    },
    normal: {
      type: "normal",
      src: "./verse_splat_images/verse_splat_blob_normal.svg",
      ratio: 942.30499 / 352
    },
    long: {
      type: "long",
      src: "./verse_splat_images/verse_splat_blob_long.svg",
      ratio: 1143.769 / 352
    }
  };

  function cleanBlobLabelLength(label){
    const cleaned = String(label || "").replace(/[^a-zA-Z0-9]/g, "");
    return cleaned.length;
  }

  function blobShapeForLabel(label){
    const len = cleanBlobLabelLength(label);

    if (len <= 4) return BLOB_SHAPES.compact;
    if (len <= 9) return BLOB_SHAPES.normal;
    return BLOB_SHAPES.long;
  }

  const SPLAT_SVG = `<svg
   width="100"
   height="100"
   viewBox="0 0 26.458333 26.458333"
   version="1.1"
   id="svg1"
   xml:space="preserve"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview
     id="namedview1"
     pagecolor="#ffffff"
     bordercolor="#000000"
     borderopacity="0.25"
     borderlayer="false" /><defs
     id="defs1" /><g
     id="layer1"><path
       style="fill:currentColor;stroke-width:0.403725"
       d="m 16.398026,23.907619 c -0.87602,-0.44524 -1.1569,-1.01346 -1.3654,-2.76221 -0.10453,-0.87674 -0.22365,-1.38053 -0.42254,-1.78704 -0.81496,-1.66572 -2.71338,-1.8616 -3.98673,-0.41133 -0.42654,0.4858 -0.6618002,0.95858 -1.0247902,2.05944 -0.51819,1.57153 -1.31318,2.42504 -2.37599,2.55092 -1.04936,0.12428 -1.84866,-0.61853 -1.84866,-1.71801 0,-0.95529 0.54104,-1.73365 1.89213,-2.72213 1.38506,-1.01333 1.99395,-2.05567 1.7437,-2.98501 -0.19614,-0.72842 -0.78194,-1.09774 -1.74779,-1.10192 -0.52682,-0.002 -0.87999,0.0852 -1.75424,0.43435 -1.7736,0.70839 -2.72393,0.69385 -3.5521,-0.0544 -1.31141004,-1.18478 -0.46907,-3.08582 1.46901,-3.31536 0.40294,-0.0477 0.84603,0.018 1.82496,0.27063 2.05645,0.53072 3.04526,0.40441 3.71517,-0.47458 0.25909,-0.33996 0.30747,-0.50246 0.30438,-1.02244 -0.003,-0.50988 -0.0597,-0.6985 -0.32337,-1.0761797 -0.17583,-0.25188 -0.54802,-0.60216 -0.82708,-0.77841 -1.53759,-0.97112 -1.85957,-1.21441 -2.13998,-1.61693 -1.01553,-1.45778 0.22508,-3.28292 1.92109,-2.82623 0.69593,0.1874 1.35361,0.85293 1.86232,1.88456 0.2449602,0.49676 0.6325302,1.1158 0.8612502,1.37565 1.0582,1.20218 2.55655,1.00823 3.29488,-0.42649 0.23432,-0.45533 0.2745,-0.7011 0.32993,-2.01817 0.0521,-1.23651 0.10291,-1.57701 0.28979,-1.94024 0.88848,-1.72692 3.1241,-1.3062 3.15276,0.59331 0.008,0.50867 -0.16715,0.93876 -0.99306,2.44312 -0.49707,0.90537 -0.56548,1.55728 -0.22245,2.11984 0.58953,0.96681 2.09007,0.53256 3.15024,-0.91168 0.99862,-1.3604 2.17946,-2.06315 3.06571,-1.82451 0.85084,0.22911 1.36522,0.98547 1.21924,1.79279 -0.15944,0.88168 -0.96395,1.61994 -2.23028,2.0466 -1.95116,0.6573897 -2.85333,1.7995197 -2.1886,2.7706997 0.46358,0.6773 0.89556,0.8099 2.65296,0.81441 1.44172,0.004 1.58185,0.0222 2.02543,0.26705 0.66444,0.3668 0.9655,0.84853 0.9655,1.5449 0,0.70479 -0.30531,1.19024 -0.96223,1.52996 -0.74777,0.38671 -1.50284,0.28749 -2.95785,-0.38865 -0.63987,-0.29735 -1.40281,-0.5724 -1.69542,-0.61121 -1.01399,-0.13451 -1.96086,0.31405 -2.36921,1.12238 -0.48435,0.95875 -0.24435,2.01633 0.72604,3.19938 0.89217,1.0877 1.06317,1.45523 1.06317,2.28495 0,0.74445 -0.21412,1.19163 -0.76648,1.60073 -0.43319,0.32084 -1.21814,0.35065 -1.77541,0.0674 z"
       id="path7" /></g></svg>`;

const FUN_DECOYS = window.VerseGameShell.getFunDecoys();

const BOOK_DECOY_LABELS = window.VerseGameShell.getBibleBookDecoys();


const MODE_CONFIG = {
  easy: { speedMultiplier: 1, rollbackCount: 0, decoyMode: "fun" },
  medium: { speedMultiplier: 1, rollbackCount: 0, decoyMode: "verse" },
  hard: { speedMultiplier: 1.05, rollbackCount: 0, decoyMode: "verse" }
};

  function medalEmojiForMode(mode){
    if (mode === "easy") return "🥉";
    if (mode === "medium") return "🥈";
    return "🥇";
  }

  const state = {
    screen: "intro",
    mode: null,
    menuOpen: false,
    helpOpen: false,
    helpBackMode: false,
    busy: false,
    completed: false,
    completionResult: null,
    startedAt: 0,

    words: [],
    bookTokens: [],
    referenceToken: "",
    referenceMeta: null,
    segments: [],
    metaIndices: new Set(),
    progressIndex: 0,
    buildSizeClass: "is-normal",
    buildFitDone: false,
    buildRemoving: new Set(),
    phase: "words",

    blobs: [],
    nextBlobId: 1,
    paintSplats: [],
    coveredCells: new Set(),
    wrongCountThisField: 0,
    correctStreak: 0,

    tutorialActive: false,
    tutorialStep: "",
    tutorialPending: false,

    rafId: 0,
    lastTs: 0,
    fieldRect: null,
    inputLockedUntil: 0,

    shakeKey: 0,
    flashKey: 0,

    bonusIntroVisible: false,
    bonusBlobs: [],
    nextBonusBlobId: 1,
    bonusRafId: 0,
    bonusStartedAt: 0,
    bonusRemainingMs: BONUS_TIME_LIMIT_MS,
    bonusScore: 0,
    bonusEnding: false,
    bonusAwaitingContinue: false,
    bonusColorQueue: [],
    bonusLastShownSecond: 0,
    bonusRespawnTimers: [],

    coverageResultPercent: 0,
    coverageResultBarPercent: 0,
    coverageResultPhase: "bar",
    coverageResultRafId: 0,
    coverageResultTimers: [],
    coverageResultContinuePending: false,

    medalAlreadyEarned: false,
    medalMessage: "",
    medalSubmessage: ""
  };

const shuffle = window.VerseGameShell.shuffle;

  function normalizeWord(value){
    return window.VerseGameShell.normalizeWord(value);
  }

  function tokenizeVerse(text){
    return window.VerseGameShell.tokenizeVerseWords(text);
  }

  function parseReferenceParts(ref, translation, verseId){
    return window.VerseGameShell.parseReferenceParts(ref, translation, verseId);
  }



  function initVerseData(){
    const parts = parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
    const buildData = window.VerseGameShell.buildVerseSegments({
      verseText: ctx.verseText || "",
      book: parts.book,
      reference: parts.reference,
      buildArea: BUILD_AREA
    });

    state.words = buildData.words;
    state.referenceMeta = parts;
    state.bookTokens = buildData.bookLabel ? [buildData.bookLabel] : [];
    state.referenceToken = buildData.referenceLabel;
    state.segments = buildData.segments;
    state.metaIndices = buildData.metaIndices;
    state.buildSizeClass = buildData.buildSizeClass;
  }

  function setScreen(screen){
    stopLoops();
    state.screen = screen;
    render();

    requestAnimationFrame(() => {
      renderStaticPaintSplats();
    });

    if (screen === "game") afterGameScreenRender();
    if (screen === "coverage_result") afterCoverageResultRender();
    if (screen === "bonus") afterBonusScreenRender();
  }

  function resetForMode(mode){
    state.mode = mode;
    state.menuOpen = false;
    state.helpOpen = false;
    state.helpBackMode = false;
    state.busy = false;
    state.completed = false;
    state.completionResult = null;
    state.progressIndex = 0;
    state.buildFitDone = false;
    state.buildRemoving = new Set();
    state.phase = "words";
    state.blobs = [];
    state.nextBlobId = 1;
    state.paintSplats = [];
    state.coveredCells = new Set();
    state.wrongCountThisField = 0;
    state.correctStreak = 0;
    state.tutorialActive = false;
    state.tutorialStep = "";
    state.tutorialPending = false;
    state.lastTs = 0;
    state.inputLockedUntil = 0;
    state.shakeKey = 0;
    state.flashKey = 0;
    clearBonusRespawnTimers();
    state.bonusIntroVisible = false;
    state.bonusBlobs = [];
    state.nextBonusBlobId = 1;
    state.bonusStartedAt = 0;
    state.bonusRemainingMs = BONUS_TIME_LIMIT_MS;
    state.bonusScore = 0;
    state.bonusEnding = false;
    state.bonusAwaitingContinue = false;
    state.bonusColorQueue = [];
    state.bonusLastShownSecond = 0;
    state.bonusRespawnTimers = [];
    state.coverageResultPercent = 0;
    state.coverageResultBarPercent = 0;
    state.coverageResultPhase = "bar";
    state.coverageResultRafId = 0;
    state.coverageResultTimers = [];
    state.coverageResultContinuePending = false;
    state.medalAlreadyEarned = false;
    state.medalMessage = "";
    state.medalSubmessage = "";
    state.startedAt = Date.now();
    updatePhase();
  }

  function updatePhase(){
    const phase = window.VerseGameShell.getPhaseForProgress({
      progressIndex: state.progressIndex,
      wordCount: state.words.length,
      totalSegments: state.segments.length,
      bookLabel: state.bookTokens[0] || "",
      referenceLabel: state.referenceToken
    });

    state.phase = phase === "done" ? "complete" : phase;
  }

  function releaseSpawningBlobsSoon(delay = CORRECT_TAP_LOCK_MS){
    window.setTimeout(() => {
      for (const blob of state.blobs){
        if (blob.state === "spawning"){
          blob.state = "live";
        }
      }
    }, delay);
  }

  function currentCorrectLabel(){
    return state.segments[state.progressIndex] || "";
  }


function renderBuildText(){
  return window.VerseGameShell.renderBuildProgressHtml({
    verseText: ctx.verseText || "",
    book: state.bookTokens[0] || "",
    reference: state.referenceToken,
    progressIndex: state.progressIndex,
    buildArea: BUILD_AREA,
    hideUnbuilt: state.mode === "hard",
    extraClass: "vsp-build-text"
  });
}

function fitSplatBuildText(){
  if (state.buildFitDone) return;

  requestAnimationFrame(() => {
    const build = $("#vspBuild");
    const text = $("#vspBuildText");

    if (!build || !text) return;
    if (state.screen !== "game") return;

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

function applyBuildTextRender(){
  const buildText = $("#vspBuildText");
  if (!buildText) return;

  const buildRender = renderBuildText();
  buildText.className = buildRender.className;
  buildText.innerHTML = buildRender.html;
}


  function extractClientPoint(event){
    if (event.touches && event.touches[0]) return { x:event.touches[0].clientX, y:event.touches[0].clientY };
    if (event.changedTouches && event.changedTouches[0]) return { x:event.changedTouches[0].clientX, y:event.changedTouches[0].clientY };
    return { x:event.clientX, y:event.clientY };
  }

  function clientPointToBoardPoint(clientX, clientY){
    const boardMain = $("#vspBoardMain");
    if (!boardMain) return null;
    const rect = boardMain.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function hitTestBlobIdAtBoardPoint(boardX, boardY, bonus=false){
    const bounds = currentBounds();
    const list = bonus
      ? state.bonusBlobs.filter(blob => blob.alive)
      : state.blobs.filter(blob => blob.state === "live");
    const hits = [];

    for (let i = list.length - 1; i >= 0; i--){
      const blob = list[i];
      const width = bonus ? blob.width : blob.width;
      const height = bonus ? blob.height : blob.height;
      const left = blob.x * bounds.width;
      const top = blob.y * bounds.height;
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const nx = (boardX - centerX) / (width / 2);
      const ny = (boardY - centerY) / (height / 2);
      const ellipseScore = nx * nx + ny * ny;
      if (ellipseScore <= 1.08){
        hits.push({
          id: blob.id,
          isCorrect: bonus ? false : !!blob.isCorrect,
          score: ellipseScore,
          area: width * height,
          order: i
        });
      }
    }

    if (!hits.length) return null;
    if (!bonus){
      const correctHits = hits.filter(hit => hit.isCorrect);
      if (correctHits.length === 1) return correctHits[0].id;
    }

    hits.sort((a, b) => (a.score - b.score) || (a.area - b.area) || (a.order - b.order));
    return hits[0].id;
  }


  function bindBoardMainInteraction() {
    const boardMain = $("#vspBoardMain");
    if (!boardMain || boardMain.dataset.boundVerseSplatPress === "1") return;

    const onPress = (event) => {
      if (state.menuOpen || state.helpOpen || state.busy) return;
      if (state.screen !== "game" && state.screen !== "bonus") return;

      const now = performance.now();

      if (now < state.inputLockedUntil) return;
      if (now - lastBoardPressAt < 120) return;

      const point = extractClientPoint(event);
      const boardPoint = clientPointToBoardPoint(point.x, point.y);
      if (!boardPoint) return;

      const blobId = hitTestBlobIdAtBoardPoint(boardPoint.x, boardPoint.y, state.screen === "bonus");
      if (!blobId) return;

      lastBoardPressAt = now;
      state.inputLockedUntil = now + CORRECT_TAP_LOCK_MS;

      event.preventDefault();
      event.stopPropagation();

      if (state.screen === "game") handleBlobTap(blobId);
      else handleBonusBlobTap(blobId);
    };

    if (window.PointerEvent) {
      boardMain.addEventListener("pointerdown", onPress, { passive: false });
    } else {
      boardMain.addEventListener("touchstart", onPress, { passive: false });
      boardMain.addEventListener("mousedown", onPress, { passive: false });
    }

    boardMain.dataset.boundVerseSplatPress = "1";
  }



function nonGameHelpHtml(){
  return `Tap blobs with correct words to splatter paint. Try to splatter paint into every grid square.`;
}

function renderHelpOverlay(){
  return window.VerseGameShell.helpOverlayHtml({
    id: HELP_OVERLAY_ID,
    title: "How to Play",
    body: nonGameHelpHtml(),
    closeText: "Close"
  });
}

function renderGameMenuOverlay(){
  return window.VerseGameShell.gameMenuHtml({
    id: "vspGameMenuOverlay",
    title: "Game Menu",
    muted,
    showModeSelect: true
  });
}

function syncGameMenuOpenState(){
  const menuOverlay = $("#vspGameMenuOverlay");
  if (!menuOverlay) return;

  if (state.menuOpen){
    menuOverlay.classList.add("is-open");
    menuOverlay.setAttribute("aria-hidden", "false");
  } else {
    menuOverlay.classList.remove("is-open");
    menuOverlay.setAttribute("aria-hidden", "true");
  }
}

function renderIntro(){
  window.VerseGameShell.renderTitleScreen({
    app,
    title: GAME_TITLE,
    debugBadge: "",
    icon: GAME_ICON,
    iconHtml: GAME_ICON_HTML,
    helpHtml: nonGameHelpHtml(),
    helpOverlayId: HELP_OVERLAY_ID,
    theme: GAME_THEME,
    backLabel: "Back to Practice Games",
    onBack: () => {
      playSharedUiPopSound();
      window.VerseGameBridge.exitGame();
    },
    onStart: () => {
      playSharedUiPopSound();
      setScreen("mode");
    }
  });
}

function renderModeScreen(){
  window.VerseGameShell.renderModeSelect({
    app,
    title: "Choose Your Difficulty",
    icon: "🥉🥈🥇",
    helpHtml: nonGameHelpHtml(),
    helpOverlayId: HELP_OVERLAY_ID,
    theme: GAME_THEME,
    backLabel: "Back to Verse Splat title",
    onBack: () => {
      playSharedUiPopSound();
      setScreen("intro");
    },
    onSelect: (mode) => {
      playSharedUiPopSound();
      startMode(mode);
    }
  });
}


function overlayMarkup(){
  if (state.helpOpen){
    return `
      <div class="vsp-overlay">
        <div class="vsp-overlay-card">
          <div class="vsp-overlay-title">How to Play</div>
          <div class="vsp-overlay-copy">Tap the next correct blob word to build the verse. After the verse, finish the book and then the reference. Wrong taps poof blobs away.</div>
          <div class="vsp-overlay-actions">
            <button class="vm-btn vsp-menu-action" data-action="close-help">${state.helpBackMode ? 'Back' : 'OK'}</button>
          </div>
        </div>
      </div>
    `;
  }
  if (state.menuOpen){
    return `
      <div class="vsp-overlay">
        <div class="vsp-overlay-card vsp-overlay-card-menu">
          <div class="vsp-overlay-title vsp-overlay-title-menu">Game Menu</div>
          <div class="vsp-overlay-actions">
            <button class="vm-btn vsp-menu-action" data-action="open-help-from-menu">How to Play</button>
            <button class="vm-btn vsp-menu-action" data-action="toggle-mute">${muted ? 'Unmute' : 'Mute'}</button>
            <button class="vm-btn vsp-menu-action" data-action="exit-game">Exit Game</button>
            <button class="vm-btn vsp-menu-action" data-action="resume-game">Close</button>
          </div>
        </div>
      </div>
    `;
  }
  return "";
}

function gameplayShell({ bonus=false }){
    return `
      <div class="${bonus ? 'vsp-bonus-screen' : 'vsp-game-screen'}">
        ${bonus ? '' : `
          <div class="vsp-build-wrap">
            <div class="vsp-build vm-build vm-build--${BUILD_AREA} ${state.shakeKey ? 'is-error' : ''}" id="vspBuild">
              ${(() => {
  const buildRender = renderBuildText();

  return `
    <div class="${buildRender.className}" id="vspBuildText">
      ${buildRender.html}
    </div>
  `;
})()}
            </div>
          </div>
        `}
        <div class="vsp-board-wrap">
          <div class="vsp-board" id="vspBoard">
            <div class="vsp-board-topbar">
              <button class="vsp-menu-pill" id="vspMenuPill" data-action="open-menu" aria-label="Open game menu" type="button">☰</button>
              ${bonus ? `<div class="vsp-bonus-timer-chip" id="vspBonusTimerChip">Time ${Math.ceil(state.bonusRemainingMs / 1000)}</div>` : `<div class="vsp-coverage-chip" id="vspCoverageChip">Painted ${state.coveredCells.size}/${coverageGridTotal()}</div>`}
            </div>
            <div class="vsp-board-main" id="vspBoardMain">
              ${bonus ? "" : `<div class="vsp-grid-layer" id="vspGridLayer" style="--vsp-grid-cols:${coverageGridSize().cols};--vsp-grid-rows:${coverageGridSize().rows};"></div>`}
              ${bonus ? "" : `<div class="vsp-coverage-layer" id="vspCoverageLayer"></div>`}
              <div class="vsp-paint-layer" id="vspPaintLayer">
                <canvas class="vsp-paint-canvas" id="vspPaintCanvas"></canvas>
              </div>
              <div class="vsp-flash-layer ${state.flashKey ? 'is-active' : ''}" id="vspFlashLayer"></div>
              <div class="vsp-back-effect-layer" id="vspBackEffectLayer"></div>
              <div class="vsp-blob-layer" id="vspBlobLayer"></div>
              <div class="vsp-effect-layer" id="vspEffectLayer"></div>
              <div class="vsp-front-effect-layer" id="vspFrontEffectLayer"></div>
              ${bonus && state.bonusIntroVisible ? `<div class="vsp-bonus-intro"><div class="vsp-bonus-rainbow-popup">Make a Mess</div></div>` : ''}
            </div>
          </div>
        </div>

        ${renderHelpOverlay()}
        ${renderGameMenuOverlay()}
      </div>
    `;
  }

  function renderBonusScreen(){
    return gameplayShell({ bonus:true });
  }

  function coveragePercentScore() {
    return clamp(Math.round((state.coveredCells.size / Math.max(1, coverageGridTotal())) * 100), 0, 100);
  }

  function coverageResultCardClass(percent) {
    if (percent >= 91) return "is-score-rainbow";
    if (percent >= 81) return "is-score-teal";
    if (percent >= 71) return "is-score-green";
    if (percent >= 61) return "is-score-orange";
    if (percent >= 51) return "is-score-red";
    return "is-score-low";
  }

  function coverageResultMessage(percent) {
    if (percent >= 91) return "Masterpiece!";
    if (percent >= 81) return "A Work of Art!";
    if (percent >= 71) return "Colorific!";
    if (percent >= 61) return "Paint Party!";
    if (percent >= 51) return "Splat-tastic!";
    return "What a Mess!";
  }

  function renderCoverageResultScreen() {
    const percent = state.coverageResultPercent;
    const barPercent = clamp(state.coverageResultBarPercent, 0, percent);
    const cardClass = coverageResultCardClass(percent);
    const showCard = state.coverageResultPhase === "card";

    return `
      <div class="vsp-coverage-result-screen" id="vspCoverageResultScreen">
        <div class="vsp-coverage-result-stage">
          <div class="vsp-coverage-result-title">PAINTING SCORE</div>

          <div class="vsp-coverage-result-progress" aria-label="Painting coverage">
            <div class="vsp-coverage-result-fill" id="vspCoverageResultFill" style="width:${barPercent}%"></div>
            <div class="vsp-coverage-result-percent" id="vspCoverageResultPercent">${barPercent}%</div>
          </div>

          ${showCard ? `
            <button class="vsp-coverage-result-card ${cardClass}" data-action="coverage-result-continue" type="button">
              <div class="vsp-coverage-result-card-message">${coverageResultMessage(percent)}</div>
              <div class="vsp-coverage-result-card-copy">Tap to Continue</div>
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }

  function clearCoverageResultTimers() {
    if (state.coverageResultRafId) {
      cancelAnimationFrame(state.coverageResultRafId);
      state.coverageResultRafId = 0;
    }

    for (const timer of state.coverageResultTimers) {
      clearTimeout(timer);
    }

    state.coverageResultTimers = [];
  }

  function afterCoverageResultRender() {
    const screen = $("#vspCoverageResultScreen");
    if (!screen || screen.dataset.started === "1") return;
    if (state.coverageResultPhase !== "bar") return;

    screen.dataset.started = "1";

    const target = clamp(state.coverageResultPercent, 0, 100);
    const fill = $("#vspCoverageResultFill");
    const label = $("#vspCoverageResultPercent");
    const duration = 1550;
    const started = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(now) {
      const t = clamp((now - started) / duration, 0, 1);
      const value = Math.round(target * easeOutCubic(t));

      state.coverageResultBarPercent = value;

      if (fill) fill.style.width = `${value}%`;
      if (label) label.textContent = `${value}%`;

      if (t < 1) {
        state.coverageResultRafId = requestAnimationFrame(step);
        return;
      }

      state.coverageResultRafId = 0;
      state.coverageResultBarPercent = target;

      const cardTimer = setTimeout(() => {
        state.coverageResultPhase = "card";
        playPositiveSound();
        render();
      }, 260);

      state.coverageResultTimers.push(cardTimer);
    }

    state.coverageResultRafId = requestAnimationFrame(step);
  }

  function startCoverageResultCeremony() {
    updatePaintCoverage();

    state.coverageResultPercent = coveragePercentScore();
    state.coverageResultBarPercent = 0;
    state.coverageResultPhase = "bar";
    state.coverageResultContinuePending = false;

    playPaintScoreSound();
    setScreen("coverage_result");
  }

  async function continueAfterCoverageResult() {
    if (state.coverageResultContinuePending) return;
    if (state.coverageResultPhase !== "card") return;

    playPopSound();

    state.coverageResultContinuePending = true;
    clearCoverageResultTimers();
    clearPaintForBonusRound();

    state.bonusIntroVisible = true;
    playStartSound();
    state.bonusAwaitingContinue = false;
    setScreen("bonus");

    await sleep(1200);

    if (state.screen !== "bonus") return;

    state.bonusIntroVisible = false;
    render();
    afterBonusScreenRender();
  }

  function clearPaintForBonusRound() {
    state.paintSplats = [];
    state.coveredCells = new Set();

    renderStaticPaintSplats();
    renderCoverageCells();
    updateCoverageHud();
  }


  function finalScoreMessage() {
    return `Painted ${state.coverageResultPercent}%`;
  }


function renderEndScreen(){
  const earnedMedalIconHtml = state.completionResult?.newlyCompleted
    ? medalIconHtmlForMode(state.mode)
    : "";

  window.VerseGameShell.renderCompleteScreen({
    app,
    icon: GAME_ICON,
    iconHtml: earnedMedalIconHtml,
    gameIcon: GAME_ICON,
    mode: state.mode,
    verseId: ctx.verseId,
    gameId: GAME_ID,
    completion: state.completionResult,
    gameMessage: finalScoreMessage(),
    theme: GAME_THEME,
    backLabel: "Back to Practice Games",
    onPlayAgain: () => {
      playSharedUiPopSound();
      setScreen("mode");
    },
    onMoreGames: () => {
      playSharedUiPopSound();
      window.VerseGameBridge.exitGame();
    },
    onChangeVerse: () => {
      playSharedUiPopSound();
      window.VerseGameBridge.returnToTitle();
    }
  });
}

function render(){
  if (state.screen === "intro"){
    renderIntro();
  } else if (state.screen === "mode"){
    renderModeScreen();
  } else if (state.screen === "game"){
    app.innerHTML = gameplayShell({ bonus:false });
  } else if (state.screen === "coverage_result"){
    app.innerHTML = renderCoverageResultScreen();
  } else if (state.screen === "bonus_intro"){
    app.innerHTML = gameplayShell({ bonus:true });
  } else if (state.screen === "bonus"){
    app.innerHTML = renderBonusScreen();
  } else if (state.screen === "end"){
    renderEndScreen();
  }

  bindScreenEvents();
}

  function bindScreenEvents(){
    app.querySelectorAll("[data-mode]").forEach(btn => btn.onclick = () => {
      playSharedUiPopSound();
      startMode(btn.dataset.mode);
    });

    app.querySelectorAll("[data-action='show-help-intro']").forEach(btn => btn.onclick = () => {
      playSharedUiPopSound();
      state.helpBackMode = false;
      state.helpOpen = true;
      render();
    });

    app.querySelectorAll("[data-action='close-help']").forEach(btn => btn.onclick = () => {
      playSharedUiPopSound();
      closeHelp();
    });

    app.querySelectorAll("[data-action='play-again']").forEach(btn => btn.onclick = () => {
      playSharedUiPopSound();
      setScreen("mode");
    });

    app.querySelectorAll("[data-action='exit-game']").forEach(btn => btn.onclick = () => {
      playSharedUiPopSound();
      window.VerseGameBridge.exitGame();
    });
    app.querySelectorAll("[data-action='coverage-result-continue']").forEach(btn => btn.onclick = continueAfterCoverageResult);
    app.querySelectorAll("[data-action='bonus-continue']").forEach(btn => btn.onclick = continueFromBonusArtwork);

    if (state.screen === "game" || state.screen === "bonus"){
      wireSharedGameMenu();
      syncGameMenuOpenState();
    }
  }

  function wireSharedGameMenu(){
    window.VerseGameShell.wireGameMenu({
      id: "vspGameMenuOverlay",
      menuButtonId: "vspMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => muted,
      onMuteToggle: () => {
        muted = !muted;
        if (!muted) playSharedUiPopSound();
        return muted;
      },
      onHowToPlay: () => {
        playSharedUiPopSound();
        state.helpBackMode = true;
        state.menuOpen = false;
        state.helpOpen = true;

        const menuOverlay = $("#vspGameMenuOverlay");
        if (menuOverlay){
          menuOverlay.classList.remove("is-open");
          menuOverlay.setAttribute("aria-hidden", "true");
        }

        window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");
      },
      onModeSelect: () => {
        playSharedUiPopSound();
        state.menuOpen = false;
        state.helpOpen = false;
        state.helpBackMode = false;
        state.busy = false;
        stopLoops();
        setScreen("mode");
      },
      onExit: () => {
        playSharedUiPopSound();
        stopLoops();
        window.VerseGameBridge.exitGame();
      },
      onOpen: () => {
        if (state.busy) return false;

        playSharedUiPopSound();

        state.menuOpen = true;
        state.helpOpen = false;
        state.helpBackMode = false;
        stopLoops();
      },
      onClose: () => {
        playSharedUiPopSound();
        closeMenu();
      },
      onBackFromHelp: () => {
        playSharedUiPopSound();
        state.helpOpen = false;
        state.menuOpen = true;
        state.helpBackMode = false;
        stopLoops();
      }
    });
  }

  function openMenu(){
    state.menuOpen = true;
    stopLoops();
    render();
  }

  function closeMenu(){
    state.menuOpen = false;
    syncGameMenuOpenState();

    if (state.screen === "game") afterGameScreenRender();
    if (state.screen === "bonus") afterBonusScreenRender();
  }

  function closeHelp(){
    const returnToMenu = state.helpBackMode && (state.screen === "game" || state.screen === "bonus");

    state.helpOpen = false;
    state.helpBackMode = false;

    if (returnToMenu) {
      state.menuOpen = true;
      stopLoops();
      syncGameMenuOpenState();
      return;
    }

    window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);

    if (state.screen === "game" && !state.menuOpen) afterGameScreenRender();
    if (state.screen === "bonus" && !state.menuOpen) afterBonusScreenRender();
  }

  function startMode(mode){
    resetForMode(mode);
    state.tutorialActive = true;
    state.tutorialStep = "tap";
    state.tutorialPending = false;
    setScreen("game");
  }

  function currentBounds(){
    const boardMain = $("#vspBoardMain");
    if (!boardMain) return { width: 300, height: 300, topInset: 0, leftInset: 0, rightInset: 0, bottomInset: 0 };
    const rect = boardMain.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      topInset: 0,
      leftInset: 0,
      rightInset: 0,
      bottomInset: 0,
      node: boardMain,
      blobLayer: $("#vspBlobLayer"),
      effectLayer: $("#vspEffectLayer")
    };
  }

  function labelSizeForBoard(label, bounds, stationary=false){
    const shape = blobShapeForLabel(label);
    const baseH = stationary ? bounds.height * 0.13 : bounds.height * 0.125;
    const h = clamp(baseH, stationary ? 58 : 62, stationary ? 102 : 106);
    const maxW = bounds.width * (stationary ? 0.52 : 0.86);
    const w = Math.min(h * shape.ratio, maxW);

    return {
      width: w,
      height: h,
      blobType: shape.type,
      blobImg: shape.src
    };
  }

  function uniqueLabels(list){
    const out = [];
    const seen = new Set();
    for (const item of list){
      const key = normalizeWord(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function easyDecoys(correct){
    return window.VerseGameShell.getFunWordDecoys(correct, state.words, 12);
  }

  function verseWordDecoys(correct){
    return window.VerseGameShell.getVerseWordDecoys({
      words: state.words,
      correct,
      targetIndex: state.progressIndex,
      count: 12,
      avoidNext: 2,
      fallbackToFun: true
    });
  }

  function bookDecoys(correct){
    return window.VerseGameShell.getBookDecoys(correct, 12);
  }

  function referenceDecoys(correct){
    return window.VerseGameShell
      .getReferenceDecoys(state.referenceMeta, state.mode, 12)
      .filter((ref) => normalizeWord(ref) !== normalizeWord(correct));
  }

  function decoysForCurrentPhase(correct){
    if (state.phase === "book"){
      return bookDecoys(correct);
    }

    if (state.phase === "reference"){
      return referenceDecoys(correct);
    }

    const out = [];
    const seen = new Set([normalizeWord(correct)]);

    function addDecoys(list){
      for (const item of list || []){
        const key = normalizeWord(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        if (out.length >= 2) break;
      }
    }

    if (MODE_CONFIG[state.mode].decoyMode === "fun"){
      addDecoys(easyDecoys(correct));
      return out;
    }

    addDecoys(verseWordDecoys(correct));

    if (out.length < 2){
      addDecoys(easyDecoys(correct));
    }

    if (out.length < 2){
      addDecoys(FUN_DECOYS);
    }

    return out;
  }

  function randomColorSet(count, takenColors=[]){
    const pool = shuffle(BLOB_COLORS.filter(c => !takenColors.includes(c.fill)));
    return pool.slice(0, count);
  }

  function buildFieldChoices(survivorCount){
    const correct = currentCorrectLabel();
    const decoys = decoysForCurrentPhase(correct).slice(0, Math.max(0, 3 - 1));
    const need = Math.max(0, 3 - survivorCount);
    return uniqueLabels([correct, ...decoys]).slice(0, Math.max(need, 1));
  }

  function blobMarkup(blob){
    const blobType = blob.blobType || "normal";
    const blobImg = blob.blobImg || BLOB_SHAPES.normal.src;

    return `
      <div class="vsp-blob vsp-blob--word vsp-blob--${blobType} ${blob.state === 'spawning' ? 'is-spawning' : ''} ${blob.tutorial ? 'is-tutorial' : ''} ${blob.streakReward ? 'is-streak-reward' : ''}" data-blob-id="${blob.id}" role="button" tabindex="0" aria-label="${escapeHtml(blob.label)}" style="width:${blob.width}px;height:${blob.height}px;">
        <div class="vsp-blob-body" style="--vsp-blob-mask:url('${blobImg}');--vsp-blob-fill:${blob.color};--vsp-blob-text:${blob.textColor};color:${blob.textColor};">
          <span class="vsp-blob-label">${escapeHtml(blob.label)}</span>
        </div>
      </div>
    `;
  }

  function renderBlobNodes(){
    const layer = $("#vspBlobLayer");
    if (!layer) return;
    layer.innerHTML = state.blobs.map(blobMarkup).join("");
    bindBoardMainInteraction();
    state.blobs.forEach(blob => updateBlobDom(blob));
  }

  function updateBlobDom(blob){
    const node = document.querySelector(`[data-blob-id="${blob.id}"]`);
    if (!node) return;
    const bounds = currentBounds();
    const wobbleX = Math.sin(blob.wobblePhase) * 0.044;
    const wobbleY = Math.cos(blob.wobblePhase * 0.9) * 0.044;
    const scaleX = 1 + wobbleX + blob.impactX;
    const scaleY = 1 + wobbleY + blob.impactY;
    node.style.transform = `translate(${blob.x * bounds.width}px, ${blob.y * bounds.height}px)`;
    const body = $(".vsp-blob-body", node);
    if (body) body.style.transform = `scale(${scaleX}, ${scaleY}) rotate(${Math.sin(blob.wobblePhase * 0.55) * 6}deg)`;
    const label = $(".vsp-blob-label", node);
    if (label) label.style.letterSpacing = `${Math.sin(blob.wobblePhase) * 0.012}em`;
  }

  function safeSpawnPoint(size, existing, insetOverrides=null){
    const bounds = currentBounds();
    const insetX = size.width / bounds.width;
    const insetY = size.height / bounds.height;

    const leftInset = insetOverrides?.leftInset ?? bounds.leftInset;
    const rightInset = insetOverrides?.rightInset ?? bounds.rightInset;
    const topInset = insetOverrides?.topInset ?? bounds.topInset;
    const bottomInset = insetOverrides?.bottomInset ?? bounds.bottomInset;

    const minX = leftInset / bounds.width;
    const maxX = Math.max(minX, 1 - insetX - (rightInset / bounds.width));
    const minY = topInset / bounds.height;
    const maxY = Math.max(minY, 1 - insetY - (bottomInset / bounds.height));

    for (let attempt = 0; attempt < 40; attempt++){
      const x = rand(minX, maxX);
      const y = rand(minY, maxY);
      const overlaps = existing.some(other => {
        const dx = ((x + insetX/2) - (other.x + (other.width / bounds.width) / 2)) * bounds.width;
        const dy = ((y + insetY/2) - (other.y + (other.height / bounds.height) / 2)) * bounds.height;
        const minDist = Math.max(size.width, other.width) * 0.68;
        return Math.hypot(dx, dy) < minDist;
      });
      if (!overlaps) return { x, y };
    }

    return { x: rand(minX, maxX), y: rand(minY, maxY) };
  }

  function bonusSpawnInsets(size){
    const board = $("#vspBoard");
    const topbar = $(".vsp-board-topbar", board || document);
    if (!board || !topbar){
      return { topInset: 0, leftInset: 0, rightInset: 0, bottomInset: 0 };
    }

    const boardRect = board.getBoundingClientRect();
    const topbarRect = topbar.getBoundingClientRect();

    const topbarBottom = topbarRect.bottom - boardRect.top;

    // Let blobs overlap the pills a little, but not sit fully under them.
    const allowedOverlap = size * 0.35;
    const topInset = Math.max(0, topbarBottom - allowedOverlap);

    return {
      topInset,
      leftInset: 0,
      rightInset: 0,
      bottomInset: 0
    };
  }

  function makeBlob({ label, isCorrect=false, preserveColor=null, preserveMotion=null }){
    const bounds = currentBounds();
    const size = labelSizeForBoard(label, bounds, false);
    const velocityMag = 0.25 * MODE_CONFIG[state.mode].speedMultiplier;
    const angle = rand(0, Math.PI * 2);
    const chosenColor = preserveColor || randomColorSet(1, state.blobs.map(b => b.color))[0] || BLOB_COLORS[0];
    const existing = state.blobs.filter(blob => blob.state === "live" || blob.state === "spawning");
    const point = safeSpawnPoint(size, existing);
    return {
      id: state.nextBlobId++,
      label,
      normalizedLabel: normalizeWord(label),
      isCorrect,
      color: chosenColor.fill,
      textColor: chosenColor.text,
      x: point.x,
      y: point.y,
      vx: preserveMotion ? preserveMotion.vx : Math.cos(angle) * velocityMag,
      vy: preserveMotion ? preserveMotion.vy : Math.sin(angle) * velocityMag,
      width: size.width,
      height: size.height,
      blobType: size.blobType,
      blobImg: size.blobImg,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: rand(1.2, 2.3),
      impactX: 0,
      impactY: 0,
      state: "spawning"
    };
  }

  function allocateLabelsToBlobs(blobs, labels){
    const shuffled = shuffle(blobs.slice());
    labels.forEach((label, index) => {
      const blob = shuffled[index];
      if (!blob) return;
      blob.label = label;
      blob.normalizedLabel = normalizeWord(label);
      blob.isCorrect = normalizeWord(label) === normalizeWord(currentCorrectLabel());
      const size = labelSizeForBoard(label, currentBounds(), false);
      blob.width = size.width;
      blob.height = size.height;
      blob.blobType = size.blobType;
      blob.blobImg = size.blobImg;
      blob.state = blob.state === "live" ? "live" : "spawning";
      const node = document.querySelector(`[data-blob-id="${blob.id}"]`);
      if (node){
        node.style.width = `${size.width}px`;
        node.style.height = `${size.height}px`;
        const labelNode = $(".vsp-blob-label", node);
        if (labelNode) labelNode.textContent = label;
      }
    });
  }

  function hasStreakRewardBlob(streakValue) {
    return state.blobs.some(blob =>
      blob.streakReward &&
      blob.streakValue === streakValue &&
      (blob.state === "live" || blob.state === "spawning")
    );
  }

  function makeStreakRewardBlob(streakValue) {
    const bounds = currentBounds();
    const shape = BLOB_SHAPES.normal;
    const height = clamp(bounds.height * 0.13, 66, 104);
    const width = Math.min(height * shape.ratio, bounds.width * 0.78);
    const velocityMag = 0.22 * MODE_CONFIG[state.mode].speedMultiplier;
    const angle = rand(0, Math.PI * 2);
    const existing = state.blobs.filter(blob => blob.state === "live" || blob.state === "spawning");
    const point = safeSpawnPoint({ width, height }, existing);

    return {
      id: state.nextBlobId++,
      label: `STREAK X ${streakValue}`,
      normalizedLabel: `streakx${streakValue}`,
      isCorrect: false,
      streakReward: true,
      streakValue,
      color: "#ff5a51",
      textColor: "#ffffff",
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * velocityMag,
      vy: Math.sin(angle) * velocityMag,
      width,
      height,
      blobType: shape.type,
      blobImg: shape.src,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: rand(1.35, 2.35),
      impactX: 0,
      impactY: 0,
      state: "spawning"
    };
  }

  function spawnStreakRewardBlob(streakValue) {
    if (state.screen !== "game") return;
    if (state.tutorialActive) return;
    if (state.phase !== "words") return;
    if (![5, 10, 15].includes(streakValue)) return;
    if (hasStreakRewardBlob(streakValue)) return;

    state.blobs.push(makeStreakRewardBlob(streakValue));
    renderBlobNodes();
    playStreakSound();
    releaseSpawningBlobsSoon();
  }


  function makeTutorialBlob(label, options = {}) {
    const bounds = currentBounds();
    const shape = BLOB_SHAPES.long;
    const height = clamp(bounds.height * 0.13, 62, 96);
    const width = Math.min(height * shape.ratio, bounds.width * 0.84);
    const color = options.color || BLOB_COLORS[state.blobs.length % BLOB_COLORS.length] || BLOB_COLORS[0];
    const centerXRatio = options.centerXRatio ?? 0.5;
    const centerYRatio = options.centerYRatio ?? 0.5;

    return {
      id: state.nextBlobId++,
      label,
      normalizedLabel: normalizeWord(label),
      isCorrect: true,
      tutorial: true,
      color: color.fill,
      textColor: color.text,
      x: bounds.width ? clamp((bounds.width * centerXRatio) - (width / 2), 0, bounds.width - width) / bounds.width : 0.5,
      y: bounds.height ? clamp((bounds.height * centerYRatio) - (height / 2), 0, bounds.height - height) / bounds.height : centerYRatio,
      vx: 0,
      vy: 0,
      width,
      height,
      blobType: shape.type,
      blobImg: shape.src,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: rand(1.0, 1.7),
      impactX: 0,
      impactY: 0,
      state: "live"
    };
  }

  function startTutorialStep(step) {
    state.tutorialStep = step;
    state.tutorialPending = false;
    state.blobs = [];

    if (step === "tap") {
      state.blobs.push(makeTutorialBlob("TAP TO SPLAT", {
        centerXRatio: 0.50,
        centerYRatio: 0.50,
        color: BLOB_COLORS[0]
      }));
    }

    if (step === "fill") {
      state.blobs.push(makeTutorialBlob("TRY TO FILL IN", {
        centerXRatio: 0.32,
        centerYRatio: 0.27,
        color: BLOB_COLORS[2]
      }));

      state.blobs.push(makeTutorialBlob("THE SQUARES", {
        centerXRatio: 0.68,
        centerYRatio: 0.73,
        color: BLOB_COLORS[4]
      }));
    }

    renderBlobNodes();
    playSpawnPopSoundForCount(state.blobs.length);
  }

  function spawnTutorialGoPopup() {
    playStartSound();

    const center = viewportCenterPx("#vspFrontEffectLayer");
    const node = effectNodeAt(center.x, center.y, `<div class="vsp-tutorial-go-popup">GO!</div>`, "#vspFrontEffectLayer");

    if (node) setTimeout(() => node.remove(), 760);
  }

  function clearTutorialPaintAndStartGame() {
    state.tutorialActive = false;
    state.tutorialStep = "";
    state.tutorialPending = false;
    state.blobs = [];
    state.paintSplats = [];
    state.coveredCells = new Set();

    renderBlobNodes();
    renderStaticPaintSplats();
    updatePaintCoverage();

    spawnInitialField();
    startGameLoop();
  }

  function handleTutorialBlobTap(blobId) {
    if (!state.tutorialActive || state.tutorialPending) return;

    const blob = state.blobs.find(entry => entry.id === blobId);
    if (!blob) return;

    playCorrectSound();

    addStaticPaintSplats(blob, false, true);
    spawnSplatEffect(blob);
    spawnParticleBurst(blob);
    removeBlobById(blob.id);
    renderBlobNodes();

    if (state.tutorialStep === "tap") {
      state.tutorialPending = true;

      setTimeout(() => {
        if (!state.tutorialActive || state.screen !== "game") return;
        startTutorialStep("fill");
      }, 360);

      return;
    }

    if (state.tutorialStep === "fill" && !state.blobs.length) {
      state.tutorialPending = true;

      setTimeout(() => {
        if (!state.tutorialActive || state.screen !== "game") return;

        spawnTutorialGoPopup();

        setTimeout(() => {
          if (!state.tutorialActive || state.screen !== "game") return;
          clearTutorialPaintAndStartGame();
        }, 760);
      }, 360);
    }
  }


  function spawnInitialField(){
    const correct = currentCorrectLabel();
    const decoys = decoysForCurrentPhase(correct).slice(0, 2);
    const labels = shuffle(uniqueLabels([correct, ...decoys])).slice(0, 3);
    state.blobs = [];
    labels.forEach((label) => {
      const blob = makeBlob({ label, isCorrect: normalizeWord(label) === normalizeWord(correct) });
      state.blobs.push(blob);
    });
    renderBlobNodes();
    playSpawnPopSoundForCount(labels.length);
    releaseSpawningBlobsSoon();
  }

  function refillFieldAfterCorrect(){
    const survivors = state.blobs.filter(blob => blob.state === "live" && !blob.streakReward);
    const correct = currentCorrectLabel();
    const labels = uniqueLabels([correct, ...decoysForCurrentPhase(correct)]).slice(0, 3);
    const chosenLabels = shuffle(labels).slice(0, 3);
    const existingColors = survivors.map(blob => blob.color);
    allocateLabelsToBlobs(survivors, chosenLabels.slice(0, survivors.length));
    const needed = 3 - survivors.length;
    const newColors = randomColorSet(needed, existingColors);
    for (let i = 0; i < needed; i++){
      const label = chosenLabels[survivors.length + i] || chosenLabels[i] || correct;
      state.blobs.push(makeBlob({ label, isCorrect: normalizeWord(label) === normalizeWord(correct), preserveColor:newColors[i] }));
    }
    renderBlobNodes();
    playSpawnPopSoundForCount(needed);
    releaseSpawningBlobsSoon();
  }

  function refillFieldAfterSecondWrong(){
    state.blobs = [];
    state.wrongCountThisField = 0;
    spawnInitialField();
  }

  function triggerBuildShake(){
    const build = $("#vspBuild");
    if (!build) return;
    build.classList.remove("is-error");
    void build.offsetWidth;
    build.classList.add("is-error");
    setTimeout(() => build.classList.remove("is-error"), 300);
  }

  function triggerWrongFlash(){
    const layer = $("#vspFlashLayer");
    if (!layer) return;
    layer.classList.remove("is-active");
    void layer.offsetWidth;
    layer.classList.add("is-active");
    setTimeout(() => layer.classList.remove("is-active"), 280);
  }

  async function animateHardRollback(count){
    const actual = Math.min(count, state.progressIndex);
    if (!actual) return;
    const removing = [];
    for (let i = 0; i < actual; i++) removing.push(state.progressIndex - 1 - i);
    state.buildRemoving = new Set(removing);
    applyBuildTextRender();
    await sleep(260);
    state.progressIndex -= actual;
    state.buildRemoving = new Set();
    updatePhase();
    applyBuildTextRender();
  }

function appendBuildProgress(){
  applyBuildTextRender();
}

  function effectNodeAt(x, y, markup, layerSelector="#vspEffectLayer"){
    const layer = $(layerSelector);
    if (!layer) return null;
    const node = document.createElement("div");
    node.className = "vsp-effect";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.innerHTML = markup;
    layer.appendChild(node);
    return node;
  }

  function blobCenterPx(blob, layerSelector="#vspEffectLayer"){
    const node = document.querySelector(`[data-blob-id="${blob.id}"]`);
    const layer = $(layerSelector);
    if (node && layer){
      const nodeRect = node.getBoundingClientRect();
      const layerRect = layer.getBoundingClientRect();
      return {
        x: (nodeRect.left - layerRect.left) + nodeRect.width / 2,
        y: (nodeRect.top - layerRect.top) + nodeRect.height / 2
      };
    }
    const bounds = currentBounds();
    return {
      x: blob.x * bounds.width + blob.width / 2,
      y: blob.y * bounds.height + blob.height / 2
    };
  }

function viewportCenterPx(layerSelector="#vspFrontEffectLayer"){
  const layer = $(layerSelector);
  if (layer){
    const rect = layer.getBoundingClientRect();
    return {
      x: rect.width / 2,
      y: rect.height / 2
    };
  }
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };
}

  function coverageCellKey(col, row) {
    return `${col},${row}`;
  }

  function ellipseTouchesRect(cx, cy, rx, ry, left, top, right, bottom) {
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) return true;

    const nearestX = clamp(cx, left, right);
    const nearestY = clamp(cy, top, bottom);
    const nx = (nearestX - cx) / Math.max(1, rx);
    const ny = (nearestY - cy) / Math.max(1, ry);

    return (nx * nx + ny * ny) <= 1;
  }

  function markCellsForPaintSplat(splat, bounds) {
    if (!splat || !bounds.width || !bounds.height) return;

    const grid = coverageGridSize();
    const cellW = bounds.width / grid.cols;
    const cellH = bounds.height / grid.rows;
    const cx = splat.xRatio * bounds.width;
    const cy = splat.yRatio * bounds.height;
    const rx = Math.max(1, splat.w / 2);
    const ry = Math.max(1, splat.h / 2);

    const minCol = clamp(Math.floor((cx - rx) / cellW), 0, grid.cols - 1);
    const maxCol = clamp(Math.floor((cx + rx) / cellW), 0, grid.cols - 1);
    const minRow = clamp(Math.floor((cy - ry) / cellH), 0, grid.rows - 1);
    const maxRow = clamp(Math.floor((cy + ry) / cellH), 0, grid.rows - 1);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const left = col * cellW;
        const top = row * cellH;
        const right = left + cellW;
        const bottom = top + cellH;

        if (ellipseTouchesRect(cx, cy, rx, ry, left, top, right, bottom)) {
          state.coveredCells.add(coverageCellKey(col, row));
        }
      }
    }
  }

  function renderCoverageCells() {
    const layer = $("#vspCoverageLayer");
    if (!layer) return;

    const grid = coverageGridSize();

    layer.innerHTML = Array.from(state.coveredCells).map((key) => {
      const [col, row] = key.split(",").map(Number);

      return `
        <span class="vsp-coverage-cell"
          style="
            left:${((col / grid.cols) * 100).toFixed(3)}%;
            top:${((row / grid.rows) * 100).toFixed(3)}%;
            width:${(100 / grid.cols).toFixed(3)}%;
            height:${(100 / grid.rows).toFixed(3)}%;
          ">
        </span>
      `;
    }).join("");
  }

  function updateCoverageHud() {
    const chip = $("#vspCoverageChip");
    if (!chip) return;
    chip.textContent = `Painted ${state.coveredCells.size}/${coverageGridTotal()}`;
  }

  function coverageScorePopupClass(added) {
    if (added >= 5) return "is-rainbow";
    if (added >= 3) return "is-teal";
    return "is-basic";
  }

  function spawnCoverageScorePopup(added, center) {
    if (!added || added < 1 || !center) return;

    const popupClass = coverageScorePopupClass(added);
    const markup = `<div class="vsp-score-popup ${popupClass}">+${added}</div>`;
    const node = effectNodeAt(center.x, center.y, markup, "#vspEffectLayer");

    if (node) setTimeout(() => node.remove(), 950);
  }


  function updatePaintCoverage() {
    const bounds = currentBounds();
    state.coveredCells = new Set();

    for (const splat of state.paintSplats) {
      markCellsForPaintSplat(splat, bounds);
    }

    renderCoverageCells();
    updateCoverageHud();
  }


  function staticPaintSplatsPerCorrectTap() {
    const opportunities = Math.max(1, state.segments.length || 1);
    return clamp(Math.floor(60 / opportunities), 2, 5);
  }

  function addStaticPaintSplats(blob, showScorePopup = true, updateCoverageScore = true, bonusLight = false) {
    const layer = $("#vspPaintLayer");
    if (!layer || !blob) return;

    const center = blobCenterPx(blob, "#vspPaintLayer");
    const coveredBefore = state.coveredCells.size;
    const bounds = currentBounds();
    const boardMin = Math.max(1, Math.min(bounds.width, bounds.height));
    const svgShape = STATIC_PAINT_BLOB_SHAPES[Math.floor(Math.random() * STATIC_PAINT_BLOB_SHAPES.length)] || STATIC_PAINT_BLOB_SHAPES[0];
    const centerSize = Math.max(1, blob.height * 0.85);
    const baseAngle = rand(0, Math.PI * 2);
    const circleCount = bonusLight ? 3 : 6;
    const spread = clamp(blob.height * 1.05 + boardMin * 0.045, 58, 150);

    function pushPaintMark({ x, y, w, h, shape, blobImg = null, opacity = 1, rot = 0 }) {
      state.paintSplats.push({
        xRatio: bounds.width ? clamp(x, 0, bounds.width) / bounds.width : 0.5,
        yRatio: bounds.height ? clamp(y, 0, bounds.height) / bounds.height : 0.5,
        w,
        h,
        color: blob.color,
        opacity,
        rot,
        shape,
        blobImg,
        seed: Math.random()
      });
    }

    pushPaintMark({
      x: center.x,
      y: center.y,
      w: centerSize,
      h: centerSize,
      shape: "svg",
      blobImg: svgShape,
      opacity: 1,
      rot: rand(-180, 180)
    });

    for (let i = 0; i < circleCount; i++) {
      const angle = baseAngle + ((Math.PI * 2) / circleCount) * i + rand(-0.28, 0.28);
      const distance = rand(spread * 0.45, spread * 1.12);
      const dotSize = clamp(blob.height * rand(0.16, 0.34), 14, 46);
      const x = center.x + Math.cos(angle) * distance;
      const y = center.y + Math.sin(angle) * distance;

      pushPaintMark({
        x,
        y,
        w: dotSize * rand(0.92, 1.18),
        h: dotSize * rand(0.92, 1.18),
        shape: "dot",
        opacity: rand(0.85, 1.00),
        rot: 0
      });
    }

    if (state.paintSplats.length > MAX_STATIC_PAINT_SPLATS) {
      state.paintSplats.splice(0, state.paintSplats.length - MAX_STATIC_PAINT_SPLATS);
    }

    renderStaticPaintSplats();

    if (updateCoverageScore) {
      updatePaintCoverage();

      const coveredAdded = state.coveredCells.size - coveredBefore;
      if (showScorePopup) spawnCoverageScorePopup(coveredAdded, center);
    }
  }
  
  function paintCanvasContext() {
    const canvas = $("#vspPaintCanvas");
    const layer = $("#vspPaintLayer");

    if (!canvas || !layer) return null;

    const rect = layer.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { canvas, ctx, width, height };
  }

  function paintBlobNoise(seed, index) {
    const value = Math.sin((seed * 9999) + (index * 127.1)) * 43758.5453;
    return value - Math.floor(value);
  }

  function drawCanvasOrganicPaintBlob(ctx, w, h, seed) {
    const pointCount = 18;
    const points = [];

    for (let i = 0; i < pointCount; i++) {
      const angle = (Math.PI * 2 * i) / pointCount;
      const wobble = 0.74 + paintBlobNoise(seed, i) * 0.34;
      const x = Math.cos(angle) * (w * 0.5) * wobble;
      const y = Math.sin(angle) * (h * 0.5) * wobble;

      points.push({ x, y });
    }

    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      if (i === 0) {
        ctx.moveTo(midX, midY);
      } else {
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
      }
    }

    const first = points[0];
    const second = points[1];
    ctx.quadraticCurveTo(first.x, first.y, (first.x + second.x) / 2, (first.y + second.y) / 2);
    ctx.closePath();
    ctx.fill();
  }

  function drawCanvasSvgPaintBlob(ctx, splat, w, h, seed) {
    const img = getStaticPaintBlobImage(splat.blobImg);

    if (!img || !img.complete || !img.naturalWidth) {
      drawCanvasOrganicPaintBlob(ctx, w, h, seed);
      return;
    }

    const maskCanvas = drawCanvasSvgPaintBlob.maskCanvas || document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    const drawW = Math.max(1, Math.ceil(w));
    const drawH = Math.max(1, Math.ceil(h));

    drawCanvasSvgPaintBlob.maskCanvas = maskCanvas;

    if (!maskCtx) {
      drawCanvasOrganicPaintBlob(ctx, w, h, seed);
      return;
    }

    if (maskCanvas.width !== drawW || maskCanvas.height !== drawH) {
      maskCanvas.width = drawW;
      maskCanvas.height = drawH;
    }

    maskCtx.setTransform(1, 0, 0, 1, 0, 0);
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.globalAlpha = 1;
    maskCtx.clearRect(0, 0, drawW, drawH);
    maskCtx.drawImage(img, 0, 0, drawW, drawH);

    maskCtx.globalCompositeOperation = "source-in";
    maskCtx.fillStyle = splat.color || "#7f66c6";
    maskCtx.fillRect(0, 0, drawW, drawH);

    ctx.drawImage(maskCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
  }

  function drawCanvasPaintSplat(ctx, splat, width, height) {
    const x = splat.xRatio * width;
    const y = splat.yRatio * height;
    const w = Math.max(1, splat.w);
    const h = Math.max(1, splat.h);
    const seed = typeof splat.seed === "number" ? splat.seed : 0.5;

    ctx.save();
    ctx.globalAlpha = clamp(splat.opacity ?? 1, 0, 1);
    ctx.fillStyle = splat.color || "#7f66c6";
    ctx.translate(x, y);
    ctx.rotate(((splat.rot || 0) * Math.PI) / 180);

    if (splat.shape === "dot") {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (splat.blobImg) {
      drawCanvasSvgPaintBlob(ctx, splat, w, h, seed);
    } else {
      drawCanvasOrganicPaintBlob(ctx, w, h, seed);
    }

    ctx.restore();
  }

  function renderStaticPaintSplats() {
    const paint = paintCanvasContext();
    if (!paint) return;

    const { ctx, width, height } = paint;

    ctx.clearRect(0, 0, width, height);

    for (const splat of state.paintSplats) {
      drawCanvasPaintSplat(ctx, splat, width, height);
    }
  }


  function spawnParticleBurst(blob, centerOverride=null, layerSelector="#vspBackEffectLayer"){
    const center = centerOverride || blobCenterPx(blob, layerSelector);
    const fill = blob.color;
    const count = Math.floor(rand(7, 11));
    const splatScale = rand(0.92, 1.08);
    const splatBase = clamp(currentBounds().width * 0.20, 120, 200);
    const splatSize = splatBase * splatScale;
    const baseAngle = rand(0, Math.PI * 2);
    const step = (Math.PI * 2) / count;
    let particles = "";

    for (let i = 0; i < count; i++){
      const angleJitter = rand(-0.10, 0.10);
      const angle = baseAngle + (i * step) + angleJitter;

      const distance = rand(splatSize * 0.62, splatSize * 1.08);
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      const dotSize = rand(splatSize * 0.10, splatSize * 0.18);
      const w = dotSize.toFixed(1);
      const h = (dotSize * rand(0.94, 1.03)).toFixed(1);

      const rot = rand(-40, 40).toFixed(1);
      const dur = rand(420, 620).toFixed(0);

      const shadeAmount = Math.random() < 0.5
        ? rand(0.10, 0.18)
        : -rand(0.10, 0.18);

      const particleColor = adjustHexColor(fill, shadeAmount);

      particles += `
        <div class="vsp-particle"
          style="
            --tx:${tx.toFixed(1)}px;
            --ty:${ty.toFixed(1)}px;
            --pw:${w}px;
            --ph:${h}px;
            --prot:${rot}deg;
            --pdur:${dur}ms;
            --pcolor:${particleColor};
          ">
        </div>`;
    }

    const markup = `<div class="vsp-particle-burst" style="color:${fill};">${particles}</div>`;
    const node = effectNodeAt(center.x, center.y, markup, layerSelector);
    if (node) setTimeout(() => node.remove(), 800);
  }

  
  function spawnSplatEffect(blob, centerOverride=null, layerSelector="#vspBackEffectLayer"){
    const center = centerOverride || blobCenterPx(blob, layerSelector);
    const fill = blob.color;
    const rotation = rand(-18, 18).toFixed(2);
    const finalScale = rand(0.92, 1.08).toFixed(3);
    const popScale = (parseFloat(finalScale) * 1.12).toFixed(3);
    const markup = `
      <div class="vsp-splat-svg is-quick" style="color:${fill};--splat-rot:${rotation}deg;--splat-scale-final:${finalScale};--splat-scale-pop:${popScale};">
        ${SPLAT_SVG}
      </div>`;
    const node = effectNodeAt(center.x, center.y, markup, layerSelector);
    if (node) setTimeout(() => node.remove(), 620);
  }

  function addRainbowStaticPaintSplats(blob) {
    const layer = $("#vspPaintLayer");
    if (!layer || !blob) return;

    const center = blobCenterPx(blob, "#vspPaintLayer");
    const coveredBefore = state.coveredCells.size;
    const bounds = currentBounds();
    const boardMin = Math.max(1, Math.min(bounds.width, bounds.height));
    const baseAngle = rand(0, Math.PI * 2);
    const centerSize = Math.max(1, blob.height * 0.92);
    const circleCount = 10;
    const spread = clamp(blob.height * 1.12 + boardMin * 0.055, 68, 165);
    const svgShape = STATIC_PAINT_BLOB_SHAPES[Math.floor(Math.random() * STATIC_PAINT_BLOB_SHAPES.length)] || STATIC_PAINT_BLOB_SHAPES[0];

    function pushRainbowPaintMark({ x, y, w, h, shape, blobImg = null, opacity = 1, rot = 0, color }) {
      state.paintSplats.push({
        xRatio: bounds.width ? clamp(x, 0, bounds.width) / bounds.width : 0.5,
        yRatio: bounds.height ? clamp(y, 0, bounds.height) / bounds.height : 0.5,
        w,
        h,
        color,
        opacity,
        rot,
        shape,
        blobImg
      });
    }

    pushRainbowPaintMark({
      x: center.x,
      y: center.y,
      w: centerSize,
      h: centerSize,
      shape: "svg",
      blobImg: svgShape,
      opacity: 1,
      rot: rand(-180, 180),
      color: BLOB_COLORS[0].fill
    });

    for (let i = 0; i < circleCount; i++) {
      const color = BLOB_COLORS[i % BLOB_COLORS.length].fill;
      const angle = baseAngle + ((Math.PI * 2) / circleCount) * i + rand(-0.22, 0.22);
      const distance = rand(spread * 0.42, spread * 1.14);
      const dotSize = clamp(blob.height * rand(0.16, 0.36), 14, 48);
      const x = center.x + Math.cos(angle) * distance;
      const y = center.y + Math.sin(angle) * distance;

      pushRainbowPaintMark({
        x,
        y,
        w: dotSize * rand(0.92, 1.18),
        h: dotSize * rand(0.92, 1.18),
        shape: "dot",
        opacity: rand(0.88, 1.00),
        rot: 0,
        color
      });
    }

    renderStaticPaintSplats();
    updatePaintCoverage();

    const coveredAdded = state.coveredCells.size - coveredBefore;
    spawnCoverageScorePopup(coveredAdded, center);
  }

  function spawnRainbowSplatEffect(blob) {
    const center = blobCenterPx(blob, "#vspBackEffectLayer");
    const pieces = BLOB_COLORS.map((color, index) => {
      const rot = (-28 + index * 12).toFixed(1);
      const scale = (1.02 - index * 0.035).toFixed(3);

      return `
        <span class="vsp-streak-splat-piece" style="--piece-color:${color.fill};--piece-rot:${rot}deg;--piece-scale:${scale};">
          ${SPLAT_SVG}
        </span>
      `;
    }).join("");

    const markup = `
      <div class="vsp-streak-splat-burst">
        ${pieces}
      </div>
    `;

    const node = effectNodeAt(center.x, center.y, markup, "#vspBackEffectLayer");
    if (node) setTimeout(() => node.remove(), 720);
  }

  function handleStreakRewardTap(blob) {
    if (state.busy) return;

    state.busy = true;
    state.inputLockedUntil = performance.now() + CORRECT_TAP_LOCK_MS;

    playCorrectSound();

    addRainbowStaticPaintSplats(blob);
    spawnRainbowSplatEffect(blob);
    spawnParticleBurst(blob);
    removeBlobById(blob.id);
    renderBlobNodes();

    state.busy = false;
  }


  function spawnPoofEffect(blob){
    const center = blobCenterPx(blob);
    const markup = `
      <div class="vsp-poof">
        <div class="vsp-poof-puff" style="background:rgba(255,255,255,.95)"></div>
        <div class="vsp-poof-puff" style="background:rgba(255,255,255,.92)"></div>
        <div class="vsp-poof-puff" style="background:rgba(255,255,255,.9)"></div>
        <div class="vsp-poof-puff" style="background:rgba(255,255,255,.88)"></div>
      </div>`;
    const node = effectNodeAt(center.x, center.y, markup);
    if (node) setTimeout(() => node.remove(), 420);
  }

function spawnWrongFaceSplat(){
  const center = viewportCenterPx("#vspFrontEffectLayer");
  const bounds = currentBounds();
  const fill = "#333333";
  const rotation = rand(-18, 18).toFixed(2);
  const finalScale = rand(0.92, 1.08).toFixed(3);
  const popScale = (parseFloat(finalScale) * 1.12).toFixed(3);
  const wrongSplatSize = `${Math.max(bounds.width, 240)}px`;

  const markup = `
    <div class="vsp-splat-svg is-wrong-face" style="color:${fill};--wrong-splat-size:${wrongSplatSize};--splat-rot:${rotation}deg;--splat-scale-final:${finalScale};--splat-scale-pop:${popScale};">
      ${SPLAT_SVG}
    </div>`;

  const node = effectNodeAt(center.x, center.y, markup, "#vspFrontEffectLayer");
  if (node) setTimeout(() => node.remove(), 1400);
}

function spawnWrongFaceParticleBurst(){
  const center = viewportCenterPx("#vspFrontEffectLayer");
  const bounds = currentBounds();
  const fill = "#333333";
  const count = Math.floor(rand(7, 11));
  const splatScale = rand(0.92, 1.08);
  const splatBase = bounds.width;
  const splatSize = splatBase * splatScale;
  const baseAngle = rand(0, Math.PI * 2);
  const step = (Math.PI * 2) / count;
  let particles = "";

  for (let i = 0; i < count; i++){
    const angleJitter = rand(-0.10, 0.10);
    const angle = baseAngle + (i * step) + angleJitter;

    const distance = rand(splatSize * 0.62, splatSize * 1.08);
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    const dotSize = rand(splatSize * 0.10, splatSize * 0.18);
    const w = dotSize.toFixed(1);
    const h = (dotSize * rand(0.94, 1.03)).toFixed(1);

    const rot = rand(-40, 40).toFixed(1);
    const dur = rand(420, 620).toFixed(0);

    const particleColor = adjustHexColor(fill, rand(0.10, 0.18));

    particles += `
      <div class="vsp-particle"
        style="
          --tx:${tx.toFixed(1)}px;
          --ty:${ty.toFixed(1)}px;
          --pw:${w}px;
          --ph:${h}px;
          --prot:${rot}deg;
          --pdur:${dur}ms;
          --pcolor:${particleColor};
        ">
      </div>`;
  }

  const markup = `<div class="vsp-particle-burst" style="color:${fill};">${particles}</div>`;
  const node = effectNodeAt(center.x, center.y, markup, "#vspFrontEffectLayer");
  if (node) setTimeout(() => node.remove(), 800);
}

  function removeBlobById(id){
    state.blobs = state.blobs.filter(blob => blob.id !== id);
    const node = document.querySelector(`[data-blob-id="${id}"]`);
    if (node) node.remove();
  }

  async function handleCorrectTap(blob){
    if (state.busy) return;

    const wasVerseWordPhase = state.phase === "words";

    state.busy = true;
    state.inputLockedUntil = performance.now() + CORRECT_TAP_LOCK_MS;
    playCorrectSound();
    addStaticPaintSplats(blob);
    spawnSplatEffect(blob);
    spawnParticleBurst(blob);
    removeBlobById(blob.id);
    state.progressIndex += 1;
    state.wrongCountThisField = 0;

    if (wasVerseWordPhase){
      state.correctStreak += 1;
    }

    updatePhase();
    appendBuildProgress();
    if (state.phase === "complete"){
      await sleep(650);
      await completeMainGame();
      state.busy = false;
      return;
    }
    refillFieldAfterCorrect();

    if (wasVerseWordPhase && state.phase === "words" && [5, 10, 15].includes(state.correctStreak)){
      spawnStreakRewardBlob(state.correctStreak);
    }

    state.busy = false;
  }

  async function handleWrongTap(blob){
    if (state.busy) return;
    state.busy = true;
    playWrongSound();
    spawnWrongFaceSplat();
    spawnWrongFaceParticleBurst();
    removeBlobById(blob.id);
    triggerBuildShake();
    triggerWrongFlash();
    state.correctStreak = 0;
    state.wrongCountThisField += 1;
    if (MODE_CONFIG[state.mode].rollbackCount){
      await animateHardRollback(MODE_CONFIG[state.mode].rollbackCount);
    }
    if (state.wrongCountThisField >= 2){
      state.blobs = [];
      renderBlobNodes();
      await sleep(140);
      refillFieldAfterSecondWrong();
    } else {
      renderBlobNodes();
    }
    state.busy = false;
  }

  async function handleBlobTap(blobId){
    if (state.menuOpen || state.helpOpen || state.screen !== "game" || state.busy) return;

    if (state.tutorialActive){
      handleTutorialBlobTap(blobId);
      return;
    }

    const blob = state.blobs.find(entry => entry.id === blobId);
    if (!blob) return;

    if (blob.streakReward){
      handleStreakRewardTap(blob);
      return;
    }

    if (blob.isCorrect) await handleCorrectTap(blob);
    else await handleWrongTap(blob);
  }

  function updateBlobMotion(blob, dt, bounds){
    blob.x += blob.vx * dt;
    blob.y += blob.vy * dt;

    const minX = bounds.leftInset / bounds.width;
    const maxX = Math.max(minX, 1 - blob.width / bounds.width - (bounds.rightInset / bounds.width));
    const minY = bounds.topInset / bounds.height;
    const maxY = Math.max(minY, 1 - blob.height / bounds.height - (bounds.bottomInset / bounds.height));

    if (blob.x <= minX){
      blob.x = minX;
      blob.vx = Math.abs(blob.vx);
      blob.impactX = -0.23;
      blob.impactY = 0.8;
    }
    else if (blob.x >= maxX){
      blob.x = maxX;
      blob.vx = -Math.abs(blob.vx);
      blob.impactX = -0.23;
      blob.impactY = 0.8;
    }

    if (blob.y <= minY){
      blob.y = minY;
      blob.vy = Math.abs(blob.vy);
      blob.impactY = -0.57;
      blob.impactX = 0.39;
    }
    else if (blob.y >= maxY){
      blob.y = maxY;
      blob.vy = -Math.abs(blob.vy);
      blob.impactY = -0.57;
      blob.impactX = 0.39;
    }

    blob.wobblePhase += dt * blob.wobbleSpeed * 3.2;
    const decay = Math.pow(0.001, dt * 1);
    blob.impactX *= decay;
    blob.impactY *= decay;
  }

  function tickGame(ts){
    if (state.screen !== "game" || state.menuOpen || state.helpOpen) return;
    const bounds = currentBounds();
    const dt = state.lastTs ? Math.min((ts - state.lastTs) / 1000, 0.032) : 0.016;
    state.lastTs = ts;
    state.blobs.forEach(blob => {
      if (blob.tutorial){
        blob.wobblePhase += dt * blob.wobbleSpeed * 2.2;
        updateBlobDom(blob);
        return;
      }

      updateBlobMotion(blob, dt, bounds);
      updateBlobDom(blob);
    });
    state.rafId = requestAnimationFrame(tickGame);
  }

  function startGameLoop(){
    stopGameLoop();
    state.lastTs = 0;
    state.rafId = requestAnimationFrame(tickGame);
  }

  function stopGameLoop(){
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }


  function nextBonusColor() {
    if (!state.bonusColorQueue.length) {
      state.bonusColorQueue = shuffle(BLOB_COLORS.slice());
    }

    return state.bonusColorQueue.shift() || BLOB_COLORS[0];
  }

  function makeBonusBlob() {
    const bounds = currentBounds();
    const shape = BLOB_SHAPES.compact;
    const height = clamp(bounds.height * 0.13, 62, 94);
    const width = Math.min(height * shape.ratio, bounds.width * 0.48);
    const velocityMag = 0.28;
    const angle = rand(0, Math.PI * 2);
    const color = nextBonusColor();
    const existing = state.bonusBlobs
      .filter(blob => blob.alive)
      .map(blob => ({ x: blob.x, y: blob.y, width: blob.width, height: blob.height }));

    const point = safeSpawnPoint(
      { width, height },
      existing,
      bonusSpawnInsets(height)
    );

    return {
      id: state.nextBonusBlobId++,
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * velocityMag,
      vy: Math.sin(angle) * velocityMag,
      width,
      height,
      size: height,
      color: color.fill,
      textColor: color.text,
      blobType: shape.type,
      blobImg: shape.src,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: rand(1.2, 2.3),
      impactX: 0,
      impactY: 0,
      alive: true
    };
  }

  function bonusBlobMarkup(blob) {
    return `
      <div class="vsp-blob vsp-blob--word vsp-blob--compact vsp-bonus-blob" data-bonus-id="${blob.id}" role="button" tabindex="0" aria-label="splat blob" style="width:${blob.width}px;height:${blob.height}px;">
        <div class="vsp-blob-body" style="--vsp-blob-mask:url('${blob.blobImg}');--vsp-blob-fill:${blob.color};--vsp-blob-text:${blob.textColor};color:${blob.textColor};"></div>
      </div>
    `;
  }

  function renderBonusBlobNodes() {
    const layer = $("#vspBlobLayer");
    if (!layer) return;

    layer.innerHTML = state.bonusBlobs
      .filter(blob => blob.alive)
      .map(bonusBlobMarkup)
      .join("");

    bindBoardMainInteraction();

    const bounds = currentBounds();
    state.bonusBlobs.forEach(blob => updateBonusBlobDom(blob, bounds));
  }

  function appendBonusBlobNode(blob, bounds = currentBounds()) {
    const layer = $("#vspBlobLayer");
    if (!layer || !blob || !blob.alive) return;

    if (document.querySelector(`[data-bonus-id="${blob.id}"]`)) {
      updateBonusBlobDom(blob, bounds);
      return;
    }

    layer.insertAdjacentHTML("beforeend", bonusBlobMarkup(blob));
    updateBonusBlobDom(blob, bounds);
  }

  function updateBonusBlobDom(blob, bounds = currentBounds()) {
    const node = document.querySelector(`[data-bonus-id="${blob.id}"]`);
    if (!node) return;

    node.style.transform = `translate(${blob.x * bounds.width}px, ${blob.y * bounds.height}px)`;

    const body = $(".vsp-blob-body", node);
    if (body) {
      const scaleX = 1 + Math.sin(blob.wobblePhase) * 0.044 + blob.impactX;
      const scaleY = 1 + Math.cos(blob.wobblePhase * 0.9) * 0.044 + blob.impactY;
      body.style.transform = `scale(${scaleX}, ${scaleY}) rotate(${Math.sin(blob.wobblePhase * .55) * 6}deg)`;
    }
  }

  function clearBonusRespawnTimers() {
    for (const timer of state.bonusRespawnTimers || []) {
      clearTimeout(timer);
    }

    state.bonusRespawnTimers = [];
  }

  function scheduleBonusBlobRespawn() {
    const timer = window.setTimeout(() => {
      state.bonusRespawnTimers = state.bonusRespawnTimers.filter(entry => entry !== timer);

      if (state.screen !== "bonus" || state.bonusEnding) return;

      state.bonusBlobs = state.bonusBlobs.filter(blob => blob.alive);

      if (state.bonusBlobs.length >= BONUS_BLOB_COUNT) return;

      const bounds = currentBounds();
      const blob = makeBonusBlob();

      state.bonusBlobs.push(blob);
      appendBonusBlobNode(blob, bounds);
    }, BONUS_RESPAWN_DELAY_MS);

    state.bonusRespawnTimers.push(timer);
  }

  function ensureBonusBlobCount() {
    if (state.bonusEnding) return;

    state.bonusBlobs = state.bonusBlobs.filter(blob => blob.alive);

    const spawnedBlobs = [];
    const bounds = currentBounds();

    while (state.bonusBlobs.length < BONUS_BLOB_COUNT) {
      const blob = makeBonusBlob();
      state.bonusBlobs.push(blob);
      spawnedBlobs.push(blob);
    }

    spawnedBlobs.forEach(blob => appendBonusBlobNode(blob, bounds));
  }

  function spawnBonusBlobs() {
    state.bonusBlobs = [];
    state.bonusColorQueue = shuffle(BLOB_COLORS.slice());

    for (let i = 0; i < BONUS_BLOB_COUNT; i++) {
      state.bonusBlobs.push(makeBonusBlob());
    }

    renderBonusBlobNodes();
    playSpawnPopSoundForCount(BONUS_BLOB_COUNT);
  }

  function tickBonus(ts) {
    if (state.screen !== "bonus" || state.menuOpen || state.helpOpen || state.bonusEnding) return;
    if (!state.bonusStartedAt) state.bonusStartedAt = ts;

    const elapsed = ts - state.bonusStartedAt;
    const bounds = currentBounds();
    const dt = state.lastTs ? Math.min((ts - state.lastTs) / 1000, 0.032) : 0.016;

    state.lastTs = ts;
    state.bonusRemainingMs = Math.max(0, BONUS_TIME_LIMIT_MS - elapsed);

    state.bonusBlobs.forEach(blob => {
      if (!blob.alive) return;
      updateBlobMotion(blob, dt, bounds);
      updateBonusBlobDom(blob, bounds);
    });

    const shownSecond = Math.ceil(state.bonusRemainingMs / 1000);

    if (shownSecond !== state.bonusLastShownSecond) {
      state.bonusLastShownSecond = shownSecond;

      const pill = $("#vspBonusTimerChip");
      if (pill) pill.textContent = `Time ${shownSecond}`;
    }

    if (state.bonusRemainingMs <= 0) {
      finishBonusRound();
      return;
    }

    state.bonusRafId = requestAnimationFrame(tickBonus);
  }

  function startBonusLoop() {
    stopBonusLoop();

    state.lastTs = 0;
    const elapsedBeforePause = BONUS_TIME_LIMIT_MS - state.bonusRemainingMs;
    state.bonusStartedAt = performance.now() - Math.max(0, elapsedBeforePause);

    state.bonusRafId = requestAnimationFrame(tickBonus);
  }

  function stopBonusLoop() {
    if (state.bonusRafId) cancelAnimationFrame(state.bonusRafId);
    state.bonusRafId = 0;
  }

  function stopLoops() {
    stopGameLoop();
    stopBonusLoop();
    clearCoverageResultTimers();
  }

  function bonusBlobCenterPx(blob, layerSelector = "#vspEffectLayer") {
    const node = document.querySelector(`[data-bonus-id="${blob.id}"]`);
    const layer = $(layerSelector);
    if (node && layer) {
      const nodeRect = node.getBoundingClientRect();
      const layerRect = layer.getBoundingClientRect();
      return {
        x: (nodeRect.left - layerRect.left) + nodeRect.width / 2,
        y: (nodeRect.top - layerRect.top) + nodeRect.height / 2
      };
    }

    const bounds = currentBounds();

    return {
      x: blob.x * bounds.width + blob.width / 2,
      y: blob.y * bounds.height + blob.height / 2
    };
  }

  function splatBonusBlob(blob, countScore = false) {
    if (!blob || !blob.alive) return;

    const center = bonusBlobCenterPx(blob, "#vspBackEffectLayer");

    addStaticPaintSplats(blob, false, false, true);
    spawnSplatEffect(blob, center, "#vspBackEffectLayer");
    spawnParticleBurst(blob, center, "#vspBackEffectLayer");

    blob.alive = false;

    if (countScore) {
      state.bonusScore += 1;
    }

    const blobNode = document.querySelector(`[data-bonus-id="${blob.id}"]`);
    if (blobNode) blobNode.remove();
  }

  function handleBonusBlobTap(id) {
    if (state.screen !== "bonus" || state.menuOpen || state.helpOpen || state.bonusEnding) return;

    const blob = state.bonusBlobs.find(entry => entry.id === id);
    if (!blob || !blob.alive) return;

    playCorrectSound();

    splatBonusBlob(blob, false);
    scheduleBonusBlobRespawn();
  }

  async function completeMainGame(){
    stopGameLoop();

    try {
      state.completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: state.mode,
        startedAt: state.startedAt,
        stats: {
          bonusScore: state.bonusScore,
          progressIndex: state.progressIndex
        }
      });
    } catch (err) {
      console.error("completeGameRun failed", err);
      state.completionResult = {
        ok: false,
        alreadyCompleted: false,
        newlyCompleted: false,
        reward: {
          ok: false,
          petUnlockTriggered: false
        }
      };
    }

    const wasAlreadyCompleted = !!state.completionResult.alreadyCompleted;

    state.medalAlreadyEarned = wasAlreadyCompleted;
    state.medalMessage = wasAlreadyCompleted ? `You finished ${state.mode} again.` : `${medalEmojiForMode(state.mode)} earned!`;
    state.medalSubmessage = wasAlreadyCompleted ? "The medal was already yours, but the splats were still worth it." : "Your verse progress, stars, and BibloPet flow have been updated.";

    startCoverageResultCeremony();
  }

  function continueFromBonusArtwork() {
    if (!state.bonusAwaitingContinue) return;

    playPopSound();

    setScreen("end");
  }

  function showBonusContinuePrompt() {
    const boardMain = $("#vspBoardMain");
    if (!boardMain || $("#vspBonusContinuePrompt")) return;

    boardMain.insertAdjacentHTML("beforeend", `
      <button class="vsp-bonus-continue-prompt" id="vspBonusContinuePrompt" data-action="bonus-continue" type="button">
        Tap to Continue
      </button>
    `);

    const button = $("#vspBonusContinuePrompt");
    if (button) button.onclick = continueFromBonusArtwork;
  }


  async function finishBonusRound(){
    if (state.bonusEnding) return;

    state.bonusEnding = true;
    state.bonusAwaitingContinue = true;
    stopBonusLoop();
    clearBonusRespawnTimers();

    const liveBlobs = state.bonusBlobs.filter(blob => blob.alive);

    if (liveBlobs.length){
      playCorrectSound();
    }

    for (const blob of liveBlobs){
      splatBonusBlob(blob, false);
    }

    renderBonusBlobNodes();
    renderStaticPaintSplats();
    showBonusContinuePrompt();
  }

  function afterGameScreenRender(){
    if (state.menuOpen || state.helpOpen) return;
    fitSplatBuildText();
    renderStaticPaintSplats();
    updatePaintCoverage();

    if (state.tutorialActive){
      if (!state.blobs.length && !state.tutorialPending){
        startTutorialStep(state.tutorialStep || "tap");
      } else {
        renderBlobNodes();
      }

      startGameLoop();
      return;
    }

    if (!state.blobs.length) spawnInitialField();
    else renderBlobNodes();
    startGameLoop();
  }

  function afterBonusScreenRender(){
    if (state.menuOpen || state.helpOpen) return;

    renderStaticPaintSplats();

    if (!state.bonusBlobs.length) spawnBonusBlobs();
    else renderBonusBlobNodes();

    if (!state.bonusIntroVisible && !state.bonusEnding) startBonusLoop();
  }

  initVerseData();
  render();
})();
