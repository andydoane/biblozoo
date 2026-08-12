(async function(){
  const app = document.getElementById("app");
  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "verse_munch";

  const GAME_TITLE = "Verse Munch";
  const GAME_ICON = "😋";
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
    bg: "#7f66c6",
    accent: "#7f66c6"
  };

  const BUILD_AREA = "compact";

  const HELP_OVERLAY_ID = "vmunchHelpOverlay";
    const VMUNCH_DEBUG_VERSION = "VMUNCH v5.19";

const BOOKS = window.VerseGameShell.getBibleBookDecoys();
  
const FUN_DECOYS = window.VerseGameShell.getFunDecoys();
  
  const FOOD_EMOJIS = ["🍎","🍇","🍓","🍉","🍊","🍒","🍍","🥝","🍋","🥨","🧀","🥕"];
  const BONUS_FRUITS = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;

    return {
      id: `fruit_${number}`,
      src: `verse_munch_images/verse_munch_fruit_${number}.png`,
      label: `fruit ${number}`
    };
  });

  const BONUS_INTRO_DURATION = 2.4;
  const BONUS_PLAY_DURATION = 20;
  const BONUS_SCORE_CONTINUE_ARM_DELAY = 0.55;
  const BONUS_TARGET_CHANCE = 0.4;
  const BONUS_FORCE_TARGET_AFTER = 2;

  const SOUND_BASE_PATH = "./verse_munch_sounds/";
  const UI_SOUND_BASE_PATH = "../../ui_audio/";

  const SOUND_FILES = {
    uiTap1: `${UI_SOUND_BASE_PATH}ui_sound_pop_1.mp3`,
    uiTap2: `${UI_SOUND_BASE_PATH}ui_sound_pop_2.mp3`,

    wordTap1: `${SOUND_BASE_PATH}verse_munch_tap_1.mp3`,
    wordTap2: `${SOUND_BASE_PATH}verse_munch_tap_2.mp3`,
    chew1: `${SOUND_BASE_PATH}verse_munch_chew_1.mp3`,
    chew2: `${SOUND_BASE_PATH}verse_munch_chew_2.mp3`,
    chew3: `${SOUND_BASE_PATH}verse_munch_chew_3.mp3`,
    chomp: `${SOUND_BASE_PATH}verse_munch_chomp.mp3`,
    correct: `${SOUND_BASE_PATH}verse_munch_correct.mp3`,
    spew: `${SOUND_BASE_PATH}verse_munch_spew.mp3`,
    dizzy: `${SOUND_BASE_PATH}verse_munch_dizzy.mp3`,
    streak: `${SOUND_BASE_PATH}verse_munch_streak.mp3`,
    bonusStart: `${SOUND_BASE_PATH}verse_munch_bonus_start.mp3`,
    bonusResult: `${SOUND_BASE_PATH}verse_munch_bonus_result.mp3`,
    wrongFruit: `${SOUND_BASE_PATH}verse_munch_wrong_fruit.mp3`
  };

  const SOUND_TUNING = {
    masterVolume: 0.90,
    volumes: {
      uiTap: 0.45,
      wordTap: 0.48,
      chew: 0.58,
      chomp: 0.36,
      correct: 0.53,
      spew: 0.50,
      dizzy: 0.70,
      streak: 0.63,
      bonusStart: 0.71,
      bonusResult: 0.72,
      wrongFruit: 0.65
    }
  };

  const BONUS_POOF_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;
  const HAPPY_REACTIONS = ["😋","☺️","😁"];
  const SAD_REACTIONS = ["🤮","🤢","😵‍💫"];
  const ANTICIPATION_FACES = ["😕","🫤","😐"];
  const EMOTION_FACE = {
    "-3":"😡",
    "-2":"😠",
    "-1":"🤨",
    "0":"😐",
    "1":"🙂",
    "2":"😊",
    "3":"😁"
  };

  const EMOTION_LABEL = {
    "-3":"Mad",
    "-2":"Grumpy",
    "-1":"Annoyed",
    "0":"Calm",
    "1":"Pleased",
    "2":"Cheerful",
    "3":"Happy"
  };

const FACE_MAP = {
  // moods
  "😡":"munch_angry_3.png",
  "😠":"munch_angry_2.png",
  "🤨":"munch_angry_1.png",
  "😐":"munch_neutral.png",
  "🙂":"munch_happy_1.png",
  "😊":"munch_happy_2.png",
  "😁":"munch_happy_3.png",

  // negatives
  "🤢":"munch_negative_sick.png",
  "🤮":"munch_negative_puke.png",
  "😵‍💫":"munch_negative_dizzy.png",

  // positives
  "☺️":"munch_positive_1.png",
  "😋":"munch_positive_2.png",
  "🌈": "verse_munch_rainbow_eyes.svg",
  "🤩":"munch_positive_3.png",

  // mouth open (all map to same)
  "😄":"munch_mouth_open.png",
  "😮":"munch_mouth_open.png",
  "😦":"munch_mouth_open.png",

  // chew
  "😀":"munch_chew_open.png",
  "😬":"munch_chew_closed.png",

  // anticipation
  "😕":"munch_anticipation_1.png",
  "🫤":"munch_anticipation_2.png",

  // bonus
  "🥳":"munch_celebration.png"
};


  const FACE_IMAGE_PATH = "verse_munch_images/";
  const FACE_FALLBACK_FILE = "munch_neutral.png";
  const faceImageCache = new Map();

  function getFaceSrc(file){
    return `${FACE_IMAGE_PATH}${file}`;
  }

  function preloadFaceImages(){
    const files = Array.from(new Set([
      ...Object.values(FACE_MAP),
      FACE_FALLBACK_FILE
    ].filter(Boolean)));

    files.forEach(file => {
      if (faceImageCache.has(file)) return;

      const img = new Image();
      const record = {
        file,
        img,
        loaded:false,
        failed:false
      };

      faceImageCache.set(file, record);

      img.onload = () => {
        record.loaded = true;
      };

      img.onerror = () => {
        record.failed = true;
      };

      img.decoding = "async";
      img.src = getFaceSrc(file);
    });
  }

  function getSafeFaceFile(faceKey){
    const file = FACE_MAP[faceKey] || FACE_FALLBACK_FILE;
    const record = faceImageCache.get(file);

    if (record && record.failed){
      return FACE_FALLBACK_FILE;
    }

    return file || FACE_FALLBACK_FILE;
  }

  function ensureFaceLayers(face){
    const existingLayers = Array.from(face.querySelectorAll(".vmunch-face-layer"));

    if (existingLayers.length === 2){
      return existingLayers;
    }

    face.innerHTML = "";
    face.dataset.activeLayer = "0";

    for (let i = 0; i < 2; i++){
      const img = document.createElement("img");
      img.className = i === 0 ? "vmunch-face-layer is-active" : "vmunch-face-layer";
      img.dataset.faceLayer = String(i);
      img.dataset.faceFile = FACE_FALLBACK_FILE;
      img.alt = "";
      img.draggable = false;
      img.src = getFaceSrc(FACE_FALLBACK_FILE);
      face.appendChild(img);
    }

    return Array.from(face.querySelectorAll(".vmunch-face-layer"));
  }

  function swapFaceLayer(face, file){
    const layers = ensureFaceLayers(face);
    const activeIndex = face.dataset.activeLayer === "1" ? 1 : 0;
    const nextIndex = activeIndex === 0 ? 1 : 0;
    const currentImg = layers[activeIndex];
    const nextImg = layers[nextIndex];
    const safeFile = file || FACE_FALLBACK_FILE;
    const src = getFaceSrc(safeFile);

    if (currentImg && currentImg.dataset.faceFile === safeFile){
      return;
    }

    function activateNextLayer(){
      requestAnimationFrame(() => {
        nextImg.classList.add("is-active");

        if (currentImg){
          currentImg.classList.remove("is-active");
        }

        face.dataset.activeLayer = String(nextIndex);
      });
    }

    function useFallbackFace(){
      if (safeFile === FACE_FALLBACK_FILE) return;

      const record = faceImageCache.get(safeFile);
      if (record){
        record.failed = true;
      }

      swapFaceLayer(face, FACE_FALLBACK_FILE);
    }

    nextImg.onload = activateNextLayer;
    nextImg.onerror = useFallbackFace;
    nextImg.dataset.faceFile = safeFile;

    if (nextImg.getAttribute("src") !== src){
      nextImg.src = src;
    }

    if (nextImg.complete && nextImg.naturalWidth > 0){
      activateNextLayer();
    }
  }

  const TRAIL_EMOJIS = ["✨","⭐","💫","🫧","🌟"];

  const POSITIVE_REACTIONS = [
  "is-react-yum-tilt",
  "is-react-sparkle-pop",
  "is-react-jelly",
  "is-react-hop",
  "is-react-victory-wiggle"
];

  const NO_SPEW_WORDS = new Set([
    "god",
    "lord",
    "jesus",
    "christ",
    "savior",
    "saviour",
    "son",
    "father",
    "spirit",
    "holy",
    "lamb",
    "word",
    "scripture",
    "scriptures",
    "messiah",
    "redeemer",
    "king",
    "blood"
  ]);

  let selectedMode = null;
  let completed = false;
  let completionResult = null;
  let muted = false;
  let bonusRunning = false;

  let audioCtx = null;
  let silenceAudio = null;
  let audioUnlocked = false;
  let uiSoundFlip = false;
  let wordTapSoundFlip = false;
  let chewSoundIndex = 0;
  const soundBuffers = new Map();
  const soundBufferPromises = new Map();

  const state = {
    running:false,
    rafId:0,
    lastTs:0,
    paused:false,
    pauseReason:"",
    scale:1,
    fieldWidth:0,
    fieldHeight:0,
    words:tokenizeVerse(ctx.verseText),
    segments:[],
    bookLabel:"",
    referenceLabel:"",
    referenceMeta:null,
    progressIndex:0,
    streak:0,
    emotionLevel:0,
    carouselItems:[],
    carouselIndex:0,
    beltItems:[],
    beltNextId:1,
    beltForceCorrectIn:0,
    beltHidden:false,
    inputLocked:false,
    faceBase:"😐",
    faceDisplay:"😐",
    faceClasses:new Set(),
    idleTimer:0,
    flyingFood:null,
    hitWord:null,
    feedingWord:null,
    flyingLetters:[],
    trails: [],
    behindFaceParticles: [],
    particles: [],
    confetti: [],
    feedbackBadge:"",
    feedbackType:"",
    feedbackUntil:0,
    buildSizeClass:"is-normal",
    buildFitDone:false,
    reactionFlash:"",
    reactionFlashUntil:0,
    streakSunburstUntil:0,
    faceScaleBoost:0,
    bonusCount:0,
    bonusCorrectStreak:0,
    bonusMultiplier:1,
    bonusPhase:"",
    bonusTargetFruit:null,
    bonusIntroText:"",
    bonusIntroShown:false,
    bonusFoodItems:[],
    bonusFoodNextId:1,
    bonusFoodSpawnTimer:0,
    bonusNonTargetStreak:0,
    bonusFeedQueue:[],
    bonusEating:false,
    bonusFlyingFruit:null,
    bonusEatToken:0,
    buildShakeUntil:0,
    lastFaceFile:"",
    runToken:0,
    resizeListenerActive:false
  };

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
    const key = uiSoundFlip ? "uiTap2" : "uiTap1";
    uiSoundFlip = !uiSoundFlip;
    playGameSound(key, "uiTap");
  }

  function playWordTapSound() {
    const key = wordTapSoundFlip ? "wordTap2" : "wordTap1";
    wordTapSoundFlip = !wordTapSoundFlip;
    playGameSound(key, "wordTap");
  }

  function playChewSound() {
    const chewKeys = ["chew1", "chew2", "chew3"];
    const key = chewKeys[chewSoundIndex % chewKeys.length];
    chewSoundIndex += 1;
    playGameSound(key, "chew");
  }

  setupReferenceSegments();
  renderIntro();
  preloadFaceImages();

function introHelpHtml(){
  return `
    Words will scroll by along the bottom.<br><br>
    Tap a word to feed it to Versey Monster.<br><br>
    Feed him the next correct word of the verse and he'll be happy. Any other words will make him mad!
  `;
}

function modeHelpHtml(){
  return `
    Easy: slower animation timing and gentler pace.<br><br>
    Medium: balanced default timing.<br><br>
    Hard: snappier timing and less dwell before the next choice.
  `;
}

function gameHelpHtml(){
  return `
    Words will scroll by along the bottom.<br><br>
    Tap a word to feed it to Versey Monster.<br><br>
    Feed him the next correct word of the verse and he'll be happy. Any other words will make him mad!
  `;
}

function renderIntro(){
  stopLoop();

  window.VerseGameShell.renderTitleScreen({
    app,
    title: "Verse Munch",
    iconHtml: `<img src="verse_munch_images/munch_positive_2.png" alt="" draggable="false">`,

    title: GAME_TITLE,
    icon: GAME_ICON,
    iconHtml: GAME_ICON_HTML,

    helpHtml: introHelpHtml(),
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

function renderModeSelect(){
  stopLoop();

  window.VerseGameShell.renderModeSelect({
    app,
    title: "Choose Your Difficulty",
    icon: "🥉🥈🥇",
    helpHtml: modeHelpHtml(),
    helpOverlayId: HELP_OVERLAY_ID,
    theme: GAME_THEME,
    backLabel: "Back to Verse Munch title",
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

  function startGame(mode){
    state.runToken += 1;
    const runToken = state.runToken;

    selectedMode = mode;
    completed = false;
    completionResult = null;
    bonusRunning = false;
    state.running = true;
    state.lastTs = 0;
    state.paused = false;
    state.pauseReason = "";
    state.progressIndex = 0;
    state.streak = 0;
    state.buildFitDone = false;
    state.emotionLevel = 0;
    state.faceBase = getEmotionFace();
    state.faceDisplay = state.faceBase;
    state.faceClasses = new Set();
    state.lastFaceFile = "";
    state.idleTimer = getIdleDelay();
    state.flyingFood = null;
    state.hitWord = null;
    state.feedingWord = null;
    state.flyingLetters = [];
    state.trails = [];
    state.behindFaceParticles = [];
    state.particles = [];
    state.confetti = [];
    state.feedbackBadge = "";
    state.feedbackType = "";
    state.feedbackUntil = 0;
    state.reactionFlash = "";
    state.reactionFlashUntil = 0;
    state.streakSunburstUntil = 0;
    state.faceScaleBoost = 0;
    state.bonusCount = 0;
    state.bonusCorrectStreak = 0;
    state.bonusMultiplier = 1;
    state.bonusPhase = "";
    state.bonusTargetFruit = null;
    state.bonusIntroText = "";
    state.bonusIntroShown = false;
    state.bonusFoodItems = [];
    state.bonusFoodNextId = 1;
    state.bonusFoodSpawnTimer = 0;
    state.bonusNonTargetStreak = 0;
    state.bonusFeedQueue = [];
    state.bonusEating = false;
    state.bonusFlyingFruit = null;
    state.bonusEatToken = 0;
    state.buildShakeUntil = 0;
    state.beltItems = [];
    state.beltNextId = 1;
    state.beltForceCorrectIn = 0;
    state.beltHidden = false;
    state.inputLocked = false;
    resetBeltForCurrentStep();

app.innerHTML = `
  <div class="vmunch-root">
    <div class="vmunch-stage">
      <div class="vmunch-build-wrap">
        <div class="vmunch-build vm-build vm-build--${BUILD_AREA}" id="vmunchBuild">
          <div class="vmunch-build-text vm-build-text" id="vmunchBuildText"></div>
        </div>
      </div>

      <div class="vmunch-overlay-pills">
        <button class="vmunch-pill vmunch-menu-pill" id="vmunchMenuPill" aria-label="Game Menu">☰</button>
        <div class="vmunch-pill vmunch-mood-pill" id="vmunchMoodPill">${escapeHtml(getMoodLabel())}</div>
      </div>

      <div class="vmunch-field-wrap">
        <div class="vmunch-field" id="vmunchField">
        <div class="vmunch-bg" id="vmunchBg"></div>

        <div class="vmunch-streak-sunburst" id="vmunchStreakSunburst"></div>
        <div class="vmunch-behind-face-particles" id="vmunchBehindFaceParticles"></div>
        <div class="vmunch-trails" id="vmunchTrails"></div>
        <div class="vmunch-particles" id="vmunchParticles"></div>
        <div class="vmunch-bonus-poofs" id="vmunchBonusPoofs"></div>
        <div class="vmunch-bonus-score-pops" id="vmunchBonusScorePops"></div>
          <div class="vmunch-food-flight" id="vmunchFoodFlight"></div>
          <div class="vmunch-feedback" id="vmunchFeedback"></div>
          <div class="vmunch-bonus-hud" id="vmunchBonusHud"></div>
          <div class="vmunch-confetti" id="vmunchConfetti"></div>

          <div class="vmunch-main">
            <div class="vmunch-face-zone">
              <div class="vmunch-bonus-intro" id="vmunchBonusIntro"></div>
              <div class="vmunch-bonus-score-reveal" id="vmunchBonusScoreReveal"></div>

              <div class="vmunch-face-stack">
                <div class="vmunch-face-glow"></div>
                <div class="vmunch-face" id="vmunchFace"></div>
              </div>
            </div>

            <div class="vmunch-food-zone">
              <div class="vmunch-food-display" id="vmunchFoodDisplay"></div>
            </div>

            <div class="vmunch-carousel-zone">
              <div class="vmunch-belt-shell">
                <div class="vmunch-belt-track" id="vmunchBeltLayer" aria-label="Moving word choices"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${renderHelpOverlay(gameHelpHtml())}
    ${renderGameMenuOverlay()}
  </div>
`;

    seedBackground();
    wireCommonNav();
    wireGameInput();
    recalcField();
    renderFrame(performance.now());
    startLoop();
  }

function renderComplete(){
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
    gameMessage: `Bonus bites: ${state.bonusCount}`,
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


function renderHelpOverlay(body){
  return window.VerseGameShell.helpOverlayHtml({
    id: HELP_OVERLAY_ID,
    title: "How to Play",
    body,
    closeText: "Close"
  });
}

function renderGameMenuOverlay(){
  return window.VerseGameShell.gameMenuHtml({
    id: "vmunchGameMenuOverlay",
    title: "Game Menu",
    muted,
    showModeSelect: true
  });
}

function wireCommonNav(){
  window.VerseGameShell.wireGameMenu({
    id: "vmunchGameMenuOverlay",
    menuButtonId: "vmunchMenuPill",
    helpOverlayId: HELP_OVERLAY_ID,
    isMuted: () => muted,
    onMuteToggle: () => {
      muted = !muted;
      if (!muted) playUiTapSound();
      return muted;
    },
    onHowToPlay: () => {
      playUiTapSound();
      openHelpFromMenu();
    },
    onModeSelect: () => {
      playUiTapSound();
      cancelActiveRun();
      setPaused(false, "");
      renderModeSelect();
    },
    onExit: () => {
      playUiTapSound();
      cancelActiveRun();
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

  wireMobileGameMenuFallbacks();
}

function setPaused(paused, reason = ""){
  state.paused = paused;
  state.pauseReason = paused ? reason : "";
  if (!paused){
    state.lastTs = performance.now();
  }
}

  function wireMobileGameMenuFallbacks() {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const bindTouchEnd = (id, handler) => {
      const btn = document.getElementById(id);
      if (!btn || btn.dataset.vmunchTouchFallback === "1") return;

      btn.dataset.vmunchTouchFallback = "1";

      btn.addEventListener("touchend", (event) => {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        handler();
      }, { passive: false });
    };

    bindTouchEnd("vmunchGameMenuOverlayCloseBtn", () => {
      playUiTapSound();
      closeGameMenu();
    });

    bindTouchEnd("vmunchGameMenuOverlayHowToBtn", () => {
      playUiTapSound();
      openHelpFromMenu();
    });

    bindTouchEnd("vmunchGameMenuOverlayModeSelectBtn", () => {
      playUiTapSound();
      cancelActiveRun();
      setPaused(false, "");
      renderModeSelect();
    });

    bindTouchEnd("vmunchGameMenuOverlayExitBtn", () => {
      playUiTapSound();
      cancelActiveRun();
      window.VerseGameBridge.exitGame();
    });

    bindTouchEnd("vmunchGameMenuOverlayMuteBtn", () => {
      muted = !muted;
      if (!muted) playUiTapSound();

      const muteBtn = document.getElementById("vmunchGameMenuOverlayMuteBtn");
      if (muteBtn) {
        muteBtn.textContent = muted ? "🔇" : "🔊";
        muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
        muteBtn.setAttribute("title", muted ? "Unmute" : "Mute");
      }
    });
  }

  function cancelActiveRun() {
    state.runToken += 1;
    state.running = false;
    state.inputLocked = false;
    bonusRunning = false;
  }

  function isActiveRun(token) {
    return state.running && token === state.runToken;
  }

  function resetActiveGameplayVisuals() {
    state.flyingFood = null;
    state.hitWord = null;
    state.feedingWord = null;
    state.flyingLetters = [];
    state.trails = [];
    state.behindFaceParticles = [];
    state.particles = [];
    state.confetti = [];
    state.feedbackBadge = "";
    state.feedbackType = "";
    state.feedbackUntil = 0;
    state.reactionFlash = "";
    state.reactionFlashUntil = 0;
    state.streakSunburstUntil = 0;
    state.faceScaleBoost = 0;
    state.bonusPhase = "";
    state.bonusTargetFruit = null;
    state.bonusIntroText = "";
    state.bonusFoodItems = [];
    state.bonusFoodNextId = 1;
    state.bonusFoodSpawnTimer = 0;
    state.bonusNonTargetStreak = 0;
    state.bonusFeedQueue = [];
    state.bonusEating = false;
    state.bonusFlyingFruit = null;
    state.bonusEatToken = 0;
    state.faceClasses = new Set();
    state.beltItems = [];
    state.beltHidden = false;
  }

function openGameMenu(){
  const menuOverlay = document.getElementById("vmunchGameMenuOverlay");
  if (menuOverlay){
    setPaused(true, "menu");
    menuOverlay.classList.add("is-open");
    menuOverlay.setAttribute("aria-hidden", "false");
  }
}

function closeGameMenu(){
  const menuOverlay = document.getElementById("vmunchGameMenuOverlay");
  if (menuOverlay){
    menuOverlay.classList.remove("is-open");
    menuOverlay.setAttribute("aria-hidden", "true");
  }
  const helpOverlay = document.getElementById("vmunchHelpOverlay");
  if (!helpOverlay || !helpOverlay.classList.contains("is-open")){
    setPaused(false, "");
  }
}

function openHelpFromMenu(){
  const menuOverlay = document.getElementById("vmunchGameMenuOverlay");

  if (menuOverlay) menuOverlay.classList.remove("is-open");

  window.VerseGameShell.openHelp(HELP_OVERLAY_ID, "back", "Back");

  setPaused(true, "help");
}


function closeHelpOverlay(){
  window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);
  setPaused(false, "");
}

function backToMenuFromHelp(){
  window.VerseGameShell.closeHelp(HELP_OVERLAY_ID);

  const menuOverlay = document.getElementById("vmunchGameMenuOverlay");
  if (menuOverlay) menuOverlay.classList.add("is-open");

  setPaused(true, "menu");
}

  function wireGameInput(){
    const beltLayer = document.getElementById("vmunchBeltLayer");

    if (beltLayer){
      beltLayer.addEventListener("pointerdown", (e) => {
        if (state.paused) return;
        if (state.bonusPhase !== "playing") return;

        const bonusChip = e.target.closest(".vmunch-bonus-food-chip");
        if (!bonusChip) return;

        e.preventDefault();
        handleBonusFoodSelection(bonusChip.dataset.bonusFoodId, bonusChip);
      });

      beltLayer.addEventListener("pointerup", (e) => {
        e.preventDefault();
        if (state.paused) return;

        if (state.bonusPhase === "playing") {
          return;
        }

        if (state.inputLocked) return;

        const chip = e.target.closest(".vmunch-belt-chip");
        if (!chip) return;

        handleBeltItemSelection(chip.dataset.itemId);
      });
    }

    if (!state.resizeListenerActive){
      window.addEventListener("resize", recalcField);
      state.resizeListenerActive = true;
    }

    window.onkeydown = (e) => {
      if (!state.running || state.inputLocked || state.paused) return;

      if (e.key === "Escape"){
        e.preventDefault();
        openGameMenu();
      }
    };
  }

  function startLoop(){
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(loop);
  }

  function stopLoop(){
    state.running = false;
    state.runToken += 1;
    resetActiveGameplayVisuals();
    clearPageStreakFlash();

    if (state.rafId){
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }

    if (state.resizeListenerActive){
      window.removeEventListener("resize", recalcField);
      state.resizeListenerActive = false;
    }

    window.onkeydown = null;
  }

  function loop(ts){
    if (!state.running) return;
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.032, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    recalcField();

    if (!state.paused){
      updateIdle(dt);
      updateBonusFoodBelt(dt);
      updateBelt(dt);
      updateFlyingFood(dt);
      updateTrails(dt);
      updateBehindFaceParticles(dt);
      updateParticles(dt);
      updateConfetti(dt);
    }

    renderFrame(ts);
    state.rafId = requestAnimationFrame(loop);
  }

  function recalcField(){
    const field = document.getElementById("vmunchField");
    if (!field) return;
    const rect = field.getBoundingClientRect();
    state.fieldWidth = rect.width;
    state.fieldHeight = rect.height;
    const t = clamp((rect.width - 360) / (920 - 360), 0, 1);
    state.scale = 1 + t * 0.25;

    updateFeedbackLayoutMetrics();
  }

  function updateFeedbackLayoutMetrics() {
    const field = document.getElementById("vmunchField");
    const face = document.getElementById("vmunchFace");
    const belt = document.querySelector(".vmunch-belt-shell");

    if (!field || !face || !belt) return;

    const fieldRect = field.getBoundingClientRect();
    const faceRect = face.getBoundingClientRect();
    const beltRect = belt.getBoundingClientRect();

    const faceBottom = faceRect.bottom - fieldRect.top;
    const beltTop = beltRect.top - fieldRect.top;
    const gapHeight = Math.max(0, beltTop - faceBottom);

    const hasUsefulGap = gapHeight >= 46;
    const feedbackTop = hasUsefulGap
      ? faceBottom + gapHeight * 0.5
      : state.fieldHeight * 0.64;

    const widthBasedSize = state.fieldWidth * 0.115;
    const gapBasedSize = hasUsefulGap ? gapHeight * 0.48 : state.fieldHeight * 0.09;
    const feedbackFontSize = clamp(
      Math.min(widthBasedSize, gapBasedSize),
      30,
      82
    );

    field.style.setProperty("--vmunch-feedback-top", `${Math.round(feedbackTop)}px`);
    field.style.setProperty("--vmunch-feedback-font-size", `${Math.round(feedbackFontSize)}px`);
  }

  function updateIdle(dt){
    if (state.inputLocked || bonusRunning) return;
    state.idleTimer -= dt;
    if (state.idleTimer > 0) return;

    const variants = getIdleVariants();
    const variant = variants[Math.floor(Math.random() * variants.length)];
    state.faceClasses = new Set([variant]);
    state.idleTimer = getIdleDelay();

    setTimeout(() => {
      if (!state.inputLocked) state.faceClasses = new Set();
    }, 640);
  }

  function updateFlyingFood(dt) {
    const food = state.flyingFood;
    if (food) {
      food.elapsed += dt;
      const t = clamp(food.elapsed / food.duration, 0, 1);
      const eased = easeOutCubic(t);
      food.x = lerp(food.startX, food.endX, eased);
      food.y = lerp(food.startY, food.endY, eased);
      food.scale = lerp(food.startScale, food.endScale, eased);
      if (t >= 1 && food.active) food.active = false;
    }

    const bonusFruit = state.bonusFlyingFruit;
    if (bonusFruit) {
      bonusFruit.elapsed += dt;
      const t = clamp(bonusFruit.elapsed / bonusFruit.duration, 0, 1);
      const eased = easeOutCubic(t);
      const arc = Math.sin(t * Math.PI) * bonusFruit.arc;

      bonusFruit.x = lerp(bonusFruit.startX, bonusFruit.endX, eased);
      bonusFruit.y = lerp(bonusFruit.startY, bonusFruit.endY, eased) - arc;
      bonusFruit.scale = lerp(bonusFruit.startScale, bonusFruit.endScale, eased);

      if (t >= 1) {
        state.bonusFlyingFruit = null;
      }
    }

    if (state.feedingWord){
      state.feedingWord.age += dt;
      const popT = clamp(state.feedingWord.age / 0.24, 0, 1);
      const easedPop = easeOutBack(popT);
      state.feedingWord.opacity = popT < 1 ? popT : 1;
      state.feedingWord.scale = lerp(0.72, 1, easedPop);
    }

    for (const letter of state.flyingLetters) {
      letter.age += dt;

      if (letter.mode === "feed") {
        if (letter.age < 0) {
          letter.x = letter.startX;
          letter.y = letter.startY;
          letter.opacity = 0;
          continue;
        }

        const t = clamp(letter.age / letter.duration, 0, 1);
        const eased = easeOutCubic(t);
        const arc = Math.sin(t * Math.PI) * letter.arc;

        letter.x = lerp(letter.startX, letter.endX, eased);
        letter.y = lerp(letter.startY, letter.endY, eased) - arc;
        letter.scale = lerp(1.08, 0.62, eased);
        letter.opacity = t < 0.96 ? 1 : 1 - ((t - 0.96) / 0.04);
        letter.rotation = lerp(letter.startRotation, letter.endRotation, eased);
      } else if (letter.mode === "spew") {
        letter.x += letter.vx * dt;
        letter.y += letter.vy * dt;
        letter.vy += letter.gravity * dt;
        letter.rotation += letter.spin * dt;
        letter.opacity = 1 - clamp(letter.age / letter.life, 0, 1);
        letter.scale = lerp(1, 0.62, clamp(letter.age / letter.life, 0, 1));
      }
    }

    state.flyingLetters = state.flyingLetters.filter(letter => {
      if (letter.mode === "feed") return letter.age < letter.duration + 0.06;
      return letter.age < letter.life;
    });
  }

  function updateTrails(dt){
    for (const part of state.trails){
      part.age += dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
    }
    state.trails = state.trails.filter(part => part.age < part.life);
  }

  function updateBehindFaceParticles(dt) {
    for (const p of state.behindFaceParticles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }

    state.behindFaceParticles = state.behindFaceParticles.filter(p => p.age < p.life);
  }

  function updateParticles(dt){
    for (const p of state.particles){
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
    state.particles = state.particles.filter(p => p.age < p.life);
  }

  function updateConfetti(dt){
    for (const c of state.confetti){
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += c.gravity * dt;
      c.rotation += c.spin * dt;
    }
    state.confetti = state.confetti.filter(c => c.age < c.life);
  }

  function rotateCarousel(dir){
    if (!state.running || state.inputLocked || !state.carouselItems.length) return;
    const len = state.carouselItems.length;
    state.carouselIndex = (state.carouselIndex + dir + len) % len;
    renderFrame(performance.now());
  }

  function handleBonusFoodSelection(itemId, chipEl) {
    if (state.bonusPhase !== "playing" || !state.bonusTargetFruit) return;

    const item = state.bonusFoodItems.find(entry => String(entry.id) === String(itemId));
    if (!item || item.tapped) return;

    if (!item.isTarget) {
      item.tapped = true;
      state.bonusCount = Math.max(0, state.bonusCount - 1);
      state.bonusCorrectStreak = 0;
      state.bonusMultiplier = 1;

      playGameSound("wrongFruit");

      const poofPoint = getBonusFoodChipCenter(chipEl);
      spawnBonusWrongPoof(poofPoint.x, poofPoint.y, item.size);
      spawnBonusScorePop(poofPoint.x, poofPoint.y - item.size * 0.20, "-1", "negative", item.size);
      playBonusWrongFaceFlash();

      renderFrame(performance.now());
      return;
    }

    item.tapped = true;
    state.bonusCorrectStreak += 1;
    state.bonusMultiplier = getBonusMultiplierForStreak(state.bonusCorrectStreak);

    const awardedPoints = state.bonusMultiplier;
    state.bonusCount += awardedPoints;

    playWordTapSound();

    if (state.bonusCorrectStreak === 5) {
      triggerBonusMultiplierMilestone(2);
    } else if (state.bonusCorrectStreak === 10) {
      triggerBonusMultiplierMilestone(3);
    }

    const startPoint = getBonusFoodChipCenter(chipEl);
    spawnBonusScorePop(
      startPoint.x,
      startPoint.y - item.size * 0.20,
      `+${awardedPoints}`,
      "positive",
      item.size
    );

    const feedItem = {
      fruit: item.fruit,
      size: item.size,
      startX: startPoint.x,
      startY: startPoint.y
    };

    state.bonusFeedQueue = [];
    state.bonusEatToken += 1;
    state.bonusEating = false;
    state.bonusFlyingFruit = null;

    playBonusFruitEatAnimation(feedItem, state.runToken, state.bonusEatToken);
    renderFrame(performance.now());
  }

  function getBonusFoodChipCenter(chipEl) {
    const field = document.getElementById("vmunchField");

    if (!chipEl || !field) {
      return {
        x: state.fieldWidth * 0.5,
        y: state.fieldHeight * 0.78
      };
    }

    const chipRect = chipEl.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();

    return {
      x: chipRect.left - fieldRect.left + chipRect.width * 0.5,
      y: chipRect.top - fieldRect.top + chipRect.height * 0.5
    };
  }


  function spawnBonusScorePop(x, y, text, type = "positive", fruitSize = 72) {
    const layer = document.getElementById("vmunchBonusScorePops");
    if (!layer) return;

    const size = clamp(fruitSize || 72, 48, 104);
    const fontSize = clamp(size * 0.52, 26, 46);
    const strokeSize = clamp(size * 0.028, 1.5, 2.6);
    const shadowSize = clamp(size * 0.055, 2.5, 5);
    const driftMax = size * 0.18;
    const driftX = Math.round(-driftMax + Math.random() * driftMax * 2);
    const rise = Math.round(size * (0.66 + Math.random() * 0.12));

    const pop = document.createElement("div");

    pop.className = `vmunch-bonus-score-pop is-${type}`;
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    pop.style.setProperty("--vmunch-score-pop-font-size", `${fontSize.toFixed(1)}px`);
    pop.style.setProperty("--vmunch-score-pop-stroke-size", `${strokeSize.toFixed(1)}px`);
    pop.style.setProperty("--vmunch-score-pop-shadow-size", `${shadowSize.toFixed(1)}px`);
    pop.style.setProperty("--vmunch-score-pop-drift-x", `${driftX}px`);
    pop.style.setProperty("--vmunch-score-pop-rise", `${rise}px`);
    pop.textContent = text;

    layer.appendChild(pop);

    requestAnimationFrame(() => {
      pop.classList.add("is-live");
    });

    window.setTimeout(() => {
      pop.remove();
    }, 760);
  }

  function spawnBonusWrongPoof(x, y, fruitSize) {
    const layer = document.getElementById("vmunchBonusPoofs");
    if (!layer) return;

    const size = clamp(fruitSize || 72, 46, 100);
    const duration = 560;
    const distance = Math.round(size * 0.78);
    const jitter = Math.round(size * 0.08);
    const cloudSize = Math.round(size * 1.08);
    const count = 9;
    const sizePool = [
      size * 0.08,
      size * 0.10,
      size * 0.12,
      size * 0.15,
      size * 0.17
    ];

    const burst = document.createElement("div");
    burst.className = "vmunch-bonus-poof";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;

    const burstBoxSize = Math.max(116, Math.ceil((distance + cloudSize) * 2.05));
    burst.style.width = `${burstBoxSize}px`;
    burst.style.height = `${burstBoxSize}px`;

    const cloud = document.createElement("div");
    cloud.className = "vmunch-bonus-poof-cloud";
    cloud.style.setProperty("--vmunch-poof-cloud-size", `${cloudSize}px`);
    cloud.style.setProperty("--vmunch-poof-cloud-dur", `${Math.max(480, duration - 80)}ms`);
    cloud.innerHTML = BONUS_POOF_CLOUD_SVG;
    burst.appendChild(cloud);

    const baseAngle = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + step * i + (-0.12 + Math.random() * 0.24);
      const dist = distance + (-jitter + Math.random() * jitter * 2);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const particleSize = randomFrom(sizePool) + (-0.5 + Math.random());
      const grow = 1.10 + Math.random() * 0.12;

      const particle = document.createElement("div");
      particle.className = "vmunch-bonus-poof-particle";
      particle.style.setProperty("--vmunch-poof-size", `${particleSize.toFixed(1)}px`);
      particle.style.setProperty("--vmunch-poof-dur", `${duration}ms`);
      particle.style.setProperty("--vmunch-poof-start-scale", `${(0.68 + Math.random() * 0.14).toFixed(2)}`);
      particle.style.setProperty("--vmunch-poof-end-scale", `${grow.toFixed(2)}`);
      particle.style.setProperty("--vmunch-poof-tx", `${tx.toFixed(1)}px`);
      particle.style.setProperty("--vmunch-poof-ty", `${ty.toFixed(1)}px`);
      particle.style.setProperty("--vmunch-poof-delay", `${Math.round(Math.random() * 18)}ms`);
      burst.appendChild(particle);
    }

    layer.appendChild(burst);

    requestAnimationFrame(() => {
      cloud.classList.add("is-live");

      burst.querySelectorAll(".vmunch-bonus-poof-particle").forEach((particle) => {
        const delay = Number.parseInt(particle.style.getPropertyValue("--vmunch-poof-delay"), 10) || 0;

        window.setTimeout(() => {
          particle.classList.add("is-live");
        }, delay);
      });
    });

    window.setTimeout(() => {
      burst.remove();
    }, duration + 140);
  }

  function playBonusWrongFaceFlash() {
    if (state.bonusPhase !== "playing") return;
    if (state.bonusEating) return;

    state.faceDisplay = "🤨";
    state.faceClasses = new Set(["is-bonus-wrong-soft"]);

    window.setTimeout(() => {
      if (state.bonusPhase !== "playing") return;
      if (state.bonusEating) return;

      state.faceBase = "😐";
      state.faceDisplay = state.faceBase;
      state.faceClasses = new Set();
      renderFrame(performance.now());
    }, 440);
  }

  async function processBonusFeedQueue(runToken) {
    if (state.bonusEating) return;

    state.bonusEating = true;

    while (isActiveRun(runToken) && state.bonusPhase === "playing" && state.bonusFeedQueue.length) {
      const feedItem = state.bonusFeedQueue.shift();
      await playBonusFruitEatAnimation(feedItem, runToken);
    }

    state.bonusEating = false;
  }

  async function playBonusFruitEatAnimation(feedItem, runToken, eatToken = state.bonusEatToken) {
    if (!isActiveRun(runToken) || state.bonusPhase !== "playing") return false;
    if (eatToken !== state.bonusEatToken) return false;

    state.bonusEating = true;

    const mouth = getMouthPoint();
    const flightDuration = 0.24;

    state.faceDisplay = getOpenMouthFace();
    state.faceClasses = new Set(["is-open"]);

    state.bonusFlyingFruit = {
      fruit: feedItem.fruit,
      startX: feedItem.startX,
      startY: feedItem.startY,
      endX: mouth.x,
      endY: mouth.y,
      x: feedItem.startX,
      y: feedItem.startY,
      size: clamp(feedItem.size || 72, 54, 96),
      startScale: 1,
      endScale: 0.42,
      scale: 1,
      arc: 28,
      elapsed: 0,
      duration: flightDuration
    };

    renderFrame(performance.now());

    if (!await waitSeconds(flightDuration, runToken)) return false;
    if (!isActiveRun(runToken) || state.bonusPhase !== "playing") return false;
    if (eatToken !== state.bonusEatToken) return false;

    state.bonusFlyingFruit = null;
    spawnChewCrumbs(false);

    if (!await waitSeconds(0.08, runToken)) return false;
    if (!isActiveRun(runToken) || state.bonusPhase !== "playing") return false;
    if (eatToken !== state.bonusEatToken) return false;

    playChewSound();

    state.faceBase = "😐";
    state.faceDisplay = state.faceBase;
    state.faceClasses = new Set();
    if (state.bonusFeedQueue.length === 0) {
      state.bonusEating = false;
    }

    renderFrame(performance.now());

    return true;
  }

  async function handleBeltItemSelection(itemId) {
    if (!state.running || state.inputLocked || !state.beltItems.length) return;

    const runToken = state.runToken;
    const item = state.beltItems.find(entry => String(entry.id) === String(itemId));
    if (!item || item.tapped) return;

    unlockAudio();
    playWordTapSound();

    const currentCorrect = getCurrentCorrectLabel();
    const isCorrect = normalizeWord(item.label) === normalizeWord(currentCorrect);
    const useDizzyWrongReaction = !isCorrect && shouldUseDizzyWrongReaction(item.label);
    const feedPoint = getBeltFeedPoint();

    item.tapped = true;
    state.inputLocked = true;
    state.beltHidden = true;
    state.faceClasses = new Set();
    state.feedbackBadge = "";
    state.feedbackType = "";
    state.feedbackUntil = 0;

    const feedItem = {
      label: item.label,
      food: item.food,
      startX: feedPoint.x,
      startY: feedPoint.y
    };

    if (!await playWordFeedAnimation(feedItem, runToken)) return;
    if (!await playMouthClosedReceiveAnimation(runToken)) return;
    if (!await playChewAnimation(runToken)) return;
    if (!await playAnticipationAnimation(runToken)) return;

    if (isCorrect) {
      const nextStreak = state.streak + 1;
      const streakTier = getStreakMilestoneTier(nextStreak);

      playGameSound("correct");

      if (!await playReactionAnimation(true, runToken, streakTier)) return;
      if (!isActiveRun(runToken)) return;

      state.progressIndex += 1;
      state.streak += 1;

      state.emotionLevel = clamp(state.emotionLevel + 1, -3, 3);
      state.faceBase = getEmotionFace();
      state.faceDisplay = state.faceBase;
      state.faceClasses = new Set();

      if (getCurrentPhase() === "done") {
        state.beltHidden = true;
        await finishRun(runToken);
        return;
      }
    } else {
      if (!await playWrongWordReaction(item.label, runToken, useDizzyWrongReaction)) return;
      if (!isActiveRun(runToken)) return;

      state.streak = 0;
      state.emotionLevel = clamp(state.emotionLevel - 1, -3, 3);
      state.faceBase = getEmotionFace();
      state.faceDisplay = state.faceBase;
      state.faceClasses = new Set();
      state.buildShakeUntil = performance.now() + 280;
    }

    state.feedingWord = null;
    state.flyingLetters = [];
    state.beltHidden = false;
    resetBeltForCurrentStep();
    state.inputLocked = false;
    state.idleTimer = getIdleDelay();
    renderFrame(performance.now());
  }


  async function playFoodLaunchAnimation(item, runToken) {
    if (!isActiveRun(runToken)) return false;

    const launchDuration = getTiming().launch;
    const startPoint = {
      x: Number.isFinite(item.startX) ? item.startX : getFoodStartPoint().x,
      y: Number.isFinite(item.startY) ? item.startY : getFoodStartPoint().y
    };

    state.flyingFood = {
      emoji: item.food,
      label: item.label,
      startX: startPoint.x,
      startY: startPoint.y,
      endX: getMouthPoint().x,
      endY: getMouthPoint().y,
      x: startPoint.x,
      y: startPoint.y,
      startScale: 1,
      endScale: 2,
      scale: 1,
      elapsed: 0,
      duration: launchDuration,
      active: true
    };

    const trailTier = getTrailTier();
    if (trailTier > 0) {
      const trailCount = 4 + trailTier * 2;
      for (let i = 0; i < trailCount; i++) {
        state.trails.push({
          id: Math.random().toString(36).slice(2),
          emoji: randomFrom(TRAIL_EMOJIS),
          x: startPoint.x,
          y: startPoint.y,
          vx: -40 + Math.random() * 80,
          vy: -60 - Math.random() * 50,
          age: 0,
          life: 0.42 + trailTier * 0.08,
          size: 16 + trailTier * 3 + Math.random() * 8
        });
      }
    }

    return await waitSeconds(launchDuration * 0.84, runToken);
  }

  async function playWordFeedAnimation(item, runToken) {
    if (!isActiveRun(runToken)) return false;

    const startPoint = {
      x: Number.isFinite(item.startX) ? item.startX : getFoodStartPoint().x,
      y: Number.isFinite(item.startY) ? item.startY : getFoodStartPoint().y
    };

    const mouth = getMouthPoint();
    const chars = getFeedCharacters(item.label);
    const spacing = clamp(34 - chars.length * 1.1, 18, 34);
    const baseDuration = getTiming().launch + 0.08;
    const stagger = selectedMode === "hard" ? 0.035 : selectedMode === "medium" ? 0.045 : 0.055;

    state.flyingFood = null;
    state.hitWord = null;
    state.flyingLetters = [];
    state.feedingWord = {
      text: item.label,
      x: startPoint.x,
      y: startPoint.y,
      age:0,
      opacity:0,
      scale:0.72
    };

    state.faceDisplay = getOpenMouthFace();
    state.faceClasses = new Set(["is-open"]);

    renderFrame(performance.now());

    if (!await waitSeconds(0.34, runToken)) return false;
    if (!isActiveRun(runToken)) return false;

    state.faceClasses = new Set();
    renderFrame(performance.now());

    chars.forEach((char, index) => {
      const centeredIndex = index - (chars.length - 1) / 2;
      const letterStartX = startPoint.x + centeredIndex * spacing;
      const letterStartY = startPoint.y;
      const delay = index * stagger;

      state.flyingLetters.push({
        mode: "feed",
        char,
        startX: letterStartX,
        startY: letterStartY,
        endX: mouth.x + (Math.random() * 18 - 9),
        endY: mouth.y + (Math.random() * 10 - 5),
        x: letterStartX,
        y: letterStartY,
        age: -delay,
        duration: baseDuration,
        arc: 44 + Math.random() * 22,
        opacity: 0,
        scale: 1,
        startRotation: -8 + Math.random() * 16,
        endRotation: -16 + Math.random() * 32,
        rotation: 0
      });
    });

    const totalDuration = baseDuration + Math.max(0, chars.length - 1) * stagger + 0.08;
    return await waitSeconds(totalDuration, runToken);
  }

  async function playWrongWordReaction(label, runToken, useDizzyReaction = false) {
    if (!isActiveRun(runToken)) return false;

    state.reactionFlash = "";
    state.reactionFlashUntil = 0;
    showReactionPopup(false);

    if (useDizzyReaction){
      playGameSound("dizzy");
      state.faceDisplay = "😵‍💫";
      state.faceClasses = new Set(["is-react-head-no-hard"]);
      return await waitSeconds(0.68, runToken);
    }

    state.faceDisplay = "🤢";
    state.faceClasses = new Set(["is-react-barf-bounce"]);
    if (!await waitSeconds(0.28, runToken)) return false;

    state.faceDisplay = "🤮";
    state.faceClasses = new Set(["is-react-barf-bounce"]);

    playGameSound("spew");
    spawnWordSpewLetters(label);
    spawnGreenSpewParticles();

    return await waitSeconds(0.62, runToken);
  }

  function spawnWordSpewLetters(label) {
    const mouth = getMouthPoint();
    const chars = getFeedCharacters(label);
    const count = Math.max(chars.length, 1);

    chars.forEach((char, index) => {
      const spread = count <= 1 ? 0.5 : index / (count - 1);
      const angle = Math.PI * (0.12 + spread * 0.76) + (Math.random() * 0.18 - 0.09);
      const speed = 180 + Math.random() * 130;

      state.flyingLetters.push({
        mode: "spew",
        char,
        x: mouth.x + (Math.random() * 18 - 9),
        y: mouth.y + (Math.random() * 10 - 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 360 + Math.random() * 180,
        age: 0,
        life: 0.78 + Math.random() * 0.24,
        opacity: 1,
        scale: 1,
        rotation: -20 + Math.random() * 40,
        spin: -240 + Math.random() * 480
      });
    });
  }

  function spawnGreenSpewParticles() {
    const mouth = getMouthPoint();
    const colors = ["#9cff5f", "#64d947", "#caff7a", "#48b85f", "#dfffb4"];

    for (let i = 0; i < 22; i++) {
      const angle = Math.PI * (0.10 + Math.random() * 0.82);
      const speed = 80 + Math.random() * 250;

      state.particles.push({
        type: "dot",
        x: mouth.x + (Math.random() * 22 - 11),
        y: mouth.y + (Math.random() * 14 - 7),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 260 + Math.random() * 180,
        age: 0,
        life: 0.48 + Math.random() * 0.34,
        size: 7 + Math.random() * 12,
        color: randomFrom(colors)
      });
    }

    for (let i = 0; i < 8; i++) {
      state.particles.push({
        type: "spark",
        value: randomFrom(["🤢", "💚", "🟢"]),
        x: mouth.x + (Math.random() * 20 - 10),
        y: mouth.y + (Math.random() * 12 - 6),
        vx: -120 + Math.random() * 240,
        vy: 30 + Math.random() * 180,
        gravity: 320,
        age: 0,
        life: 0.42 + Math.random() * 0.22,
        size: 14 + Math.random() * 10,
        color: "#9cff5f"
      });
    }
  }

  function getFeedCharacters(label) {
    const chars = Array.from(String(label || "")).filter(char => char.trim());
    return chars.length ? chars : ["?"];
  }

  function shouldUseDizzyWrongReaction(label) {
    const normalized = normalizeWord(label);
    const possessiveBase = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;

    return NO_SPEW_WORDS.has(normalized) || NO_SPEW_WORDS.has(possessiveBase);
  }
  
  function getStreakMilestoneTier(streak) {
    if (streak < 3 || streak % 3 !== 0) return 0;
    if (streak >= 9) return 3;
    if (streak >= 6) return 2;
    return 1;
  }

  function getStreakFlashClass(streakTier) {
    if (streakTier >= 3) return "is-flash-streak-rainbow";
    if (streakTier === 2) return "is-flash-streak-2";
    return "is-flash-streak-1";
  }

  function getBonusMultiplierForStreak(streak) {
    if (streak >= 10) return 3;
    if (streak >= 5) return 2;
    return 1;
  }

  function triggerBonusMultiplierMilestone(multiplier) {
    const now = performance.now();
    const streakTier = multiplier >= 3 ? 3 : 2;

    state.reactionFlash = getStreakFlashClass(streakTier);
    state.reactionFlashUntil = now + 820;
    state.streakSunburstUntil = now + 1040;

    state.feedbackBadge = `${multiplier}X`;
    state.feedbackType = "positive";
    state.feedbackUntil = now + 900;

    playGameSound("streak");
  }

  function spawnStreakRainbowCircleBurst(streakTier) {
    const metrics = getMonsterFaceMetrics();
    const centerX = metrics.centerX;
    const centerY = metrics.centerY;
    const headSize = metrics.headSize;

    const palette = [
      "#ff5f6d",
      "#ff9f43",
      "#ffe66d",
      "#6bd66b",
      "#46c6ff",
      "#6d83ff",
      "#b36cff",
      "#ff79c6"
    ];

    const count = streakTier >= 3 ? 18 : streakTier === 2 ? 14 : 10;
    const sizeMin = headSize * (streakTier >= 3 ? 0.10 : streakTier === 2 ? 0.09 : 0.08);
    const sizeMax = headSize * (streakTier >= 3 ? 0.17 : streakTier === 2 ? 0.15 : 0.13);
    const speedMin = headSize * (streakTier >= 3 ? 1.25 : streakTier === 2 ? 1.10 : 0.95);
    const speedMax = headSize * (streakTier >= 3 ? 2.05 : streakTier === 2 ? 1.75 : 1.45);

    for (let i = 0; i < count; i++) {
      const angle = (-Math.PI / 2) + (i / count) * Math.PI * 2 + (Math.random() * 0.12 - 0.06);
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);

      state.particles.push({
        type: "dot",
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: headSize * 1.05,
        age: 0,
        life: 0.56 + Math.random() * 0.16,
        size,
        color: palette[i % palette.length]
      });
    }
  }

  function getMonsterFaceMetrics() {
    const face = document.getElementById("vmunchFace");
    const field = document.getElementById("vmunchField");

    if (!face || !field) {
      const fallbackHeadSize = Math.max(80, Math.min(state.fieldWidth, state.fieldHeight) * 0.22);
      return {
        centerX: state.fieldWidth * 0.5,
        centerY: state.fieldHeight * 0.44,
        headSize: fallbackHeadSize
      };
    }

    const faceRect = face.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const headSize = Math.min(faceRect.width, faceRect.height);

    return {
      centerX: faceRect.left - fieldRect.left + faceRect.width * 0.5,
      centerY: faceRect.top - fieldRect.top + faceRect.height * 0.5,
      headSize
    };
  }

  async function playMouthOpenAnimation(runToken) {
    if (!isActiveRun(runToken)) return false;

    state.faceDisplay = getOpenMouthFace();
    state.faceClasses = new Set(["is-open"]);

    return await waitSeconds(getTiming().mouthOpen, runToken);
  }

  async function playMouthClosedReceiveAnimation(runToken) {
    if (!isActiveRun(runToken)) return false;

    state.faceDisplay = "😬";
    state.faceClasses = new Set();

    playGameSound("chomp");
    renderFrame(performance.now());

    return await waitSeconds(0.18, runToken);
  }

  async function playChewAnimation(runToken) {
    if (!isActiveRun(runToken)) return false;

    const chewSteps = [
      { face: "😀", hold: 0.12 },
      { face: "😐", hold: 0.14 },
      { face: "😀", hold: 0.12 },
      { face: "😐", hold: 0.14 },
      { face: "😀", hold: 0.12 },
      { face: "😐", hold: 0.20 }
    ];

    state.flyingFood = null;
    spawnChewCrumbs();

    for (let i = 0; i < chewSteps.length; i++) {
      if (!isActiveRun(runToken)) return false;

      const step = chewSteps[i];

      state.faceDisplay = step.face;
      state.faceClasses = new Set(["is-chew"]);

      if (step.face === "😐") {
        playChewSound();
      }

      if (i === 2 || i === 4) {
        spawnChewCrumbs(true);
      }

      renderFrame(performance.now());

      if (!await waitSeconds(step.hold, runToken)) return false;
    }

    return true;
  }

  async function playAnticipationAnimation(runToken) {
    if (!isActiveRun(runToken)) return false;

    const faces = ["😕", "🫤", "😐", "🤨"];
    const face = randomFrom(faces);
    state.faceDisplay = face;

    const steps = [
      "is-tilt-left",
      "is-tilt-right",
      "is-tilt-left-strong"
    ];

    for (const tiltClass of steps) {
      if (!isActiveRun(runToken)) return false;

      state.faceClasses = new Set([tiltClass, "is-anticipation-lean-in"]);
      if (!await waitSeconds(0.28, runToken)) return false;

      state.faceClasses = new Set([tiltClass]);
      if (!await waitSeconds(0.10, runToken)) return false;
    }

    state.faceClasses = new Set();
    return true;
  }

  async function playReactionAnimation(isCorrect, runToken, streakTier = 0) {
    if (!isActiveRun(runToken)) return false;

    const reactionDuration = getTiming().reaction;
    const now = performance.now();

    if (isCorrect && streakTier > 0) {
      state.reactionFlash = getStreakFlashClass(streakTier);
      state.reactionFlashUntil = now + (reactionDuration * 1000);
    } else {
      state.reactionFlash = "";
      state.reactionFlashUntil = 0;
    }

    if (isCorrect) {
      if (streakTier > 0) {
        state.streakSunburstUntil = now + (reactionDuration * 1000) + 220;
        playGameSound("streak");

        if (streakTier >= 3) {
          state.faceDisplay = "🌈";
          state.faceClasses = new Set(["is-react-victory-wiggle"]);
        } else if (streakTier === 2) {
          state.faceDisplay = "😁";
          state.faceClasses = new Set(["is-react-hop"]);
        } else {
          state.faceDisplay = "😁";
          state.faceClasses = new Set(["is-react-jelly"]);
        }

        showReactionPopup(true);
        spawnSuccessParticles();

        if (!await waitSeconds(reactionDuration, runToken)) return false;
        if (!isActiveRun(runToken)) return false;

        spawnStreakRainbowCircleBurst(streakTier);
        return true;
      }

      const reaction = randomFrom(HAPPY_REACTIONS);
      state.faceDisplay = reaction;

      const animClass = randomFrom(POSITIVE_REACTIONS);
      state.faceClasses = new Set([animClass]);

      showReactionPopup(true);
      spawnSuccessParticles();

      if (animClass === "is-react-sparkle-pop") {
        spawnReactionSparkles();
      }
    } else {
      state.faceDisplay = "🤮";
      state.faceClasses = new Set(["is-react-barf-bounce"]);
    }

    return await waitSeconds(reactionDuration, runToken);
  }

  function waitForBonusScoreContinue(runToken) {
    return new Promise((resolve) => {
      const field = document.getElementById("vmunchField");
      const target = field || window;
      let done = false;
      let armed = false;
      let rafId = 0;

      const cleanup = () => {
        target.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("keydown", onKeyDown);

        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };

      const finish = (ok) => {
        if (done) return;

        done = true;
        cleanup();
        resolve(ok);
      };

      const onPointerDown = (event) => {
        if (!armed) return;
        if (state.bonusPhase !== "score") return;

        if (event.cancelable) event.preventDefault();
        playUiTapSound();
        finish(isActiveRun(runToken));
      };

      const onKeyDown = (event) => {
        if (!armed) return;
        if (state.bonusPhase !== "score") return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        playUiTapSound();
        finish(isActiveRun(runToken));
      };

      const checkStillActive = () => {
        if (!isActiveRun(runToken) || state.bonusPhase !== "score") {
          finish(false);
          return;
        }

        rafId = requestAnimationFrame(checkStillActive);
      };

      window.setTimeout(() => {
        armed = true;
      }, BONUS_SCORE_CONTINUE_ARM_DELAY * 1000);

      target.addEventListener("pointerdown", onPointerDown, { passive: false });
      window.addEventListener("keydown", onKeyDown);

      rafId = requestAnimationFrame(checkStillActive);
    });
  }

  async function startBonusRound(runToken) {
    if (!isActiveRun(runToken)) return false;
    if (bonusRunning) return true;

    state.flyingFood = null;
    state.hitWord = null;
    state.feedingWord = null;
    state.flyingLetters = [];
    state.trails = [];
    state.particles = [];

    bonusRunning = true;
    state.inputLocked = true;
    state.beltHidden = true;
    state.bonusCount = 0;
    state.bonusCorrectStreak = 0;
    state.bonusMultiplier = 1;
    state.bonusTargetFruit = chooseBonusTargetFruit();
    state.bonusFoodItems = [];
    state.bonusFoodNextId = 1;
    state.bonusFoodSpawnTimer = 0;
    state.bonusNonTargetStreak = 0;
    state.bonusFeedQueue = [];
    state.bonusEating = false;
    state.bonusFlyingFruit = null;
    state.bonusEatToken += 1;
    state.bonusPhase = "intro";
    state.bonusIntroText = "FEED ME!";
    state.faceDisplay = "😕";
    state.faceClasses = new Set(["is-anticipation-lean-in"]);
    state.faceScaleBoost = 0;

    playGameSound("bonusStart");
    renderFrame(performance.now());

    if (!await waitSeconds(BONUS_INTRO_DURATION, runToken)) return false;
    if (!isActiveRun(runToken)) return false;

    state.bonusPhase = "playing";
    state.bonusIntroText = "";
    state.flyingFood = null;
    state.hitWord = null;
    state.feedingWord = null;
    state.flyingLetters = [];
    state.beltHidden = false;
    state.faceBase = "😐";
    state.faceDisplay = state.faceBase;
    state.faceClasses = new Set();

    renderFrame(performance.now());

    if (!await waitSeconds(BONUS_PLAY_DURATION, runToken)) return false;
    if (!isActiveRun(runToken)) return false;

    state.bonusPhase = "score";
    state.bonusIntroText = "";
    state.bonusFoodItems = [];
    state.bonusFoodSpawnTimer = 0;
    state.bonusNonTargetStreak = 0;
    state.bonusFeedQueue = [];
    state.bonusEating = false;
    state.bonusFlyingFruit = null;
    state.bonusEatToken += 1;
    state.beltHidden = true;
    state.inputLocked = true;
    state.faceDisplay = "🥳";
    state.faceClasses = new Set();

    playGameSound("bonusResult");
    triggerBonusScoreCelebration();

    renderFrame(performance.now());

    if (!await waitForBonusScoreContinue(runToken)) return false;
    if (!isActiveRun(runToken)) return false;

    state.bonusPhase = "";
    state.bonusIntroText = "";
    state.bonusTargetFruit = null;
    state.beltHidden = false;
    state.inputLocked = false;
    bonusRunning = false;

    renderFrame(performance.now());

    return true;
  }

  async function finishRun(runToken) {
    if (!isActiveRun(runToken)) return;
    if (completed) return;

    if (!state.bonusIntroShown) {
      const bonusIntroOk = await startBonusRound(runToken);
      if (!bonusIntroOk) return;
      state.bonusIntroShown = true;
    }

    completed = true;
    state.running = false;

    try {
      completionResult = await window.VerseGameBridge.completeGameRun({
        verseId: ctx.verseId,
        gameId: GAME_ID,
        mode: selectedMode,
        stats: {
          streak: state.streak,
          emotionLevel: state.emotionLevel,
          bonusCount: state.bonusCount,
          progressIndex: state.progressIndex
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

    if (!completed) return;

    renderComplete();
  }

  function seedBackground(){
    const bg = document.getElementById("vmunchBg");
    if (!bg) return;
    bg.innerHTML = "";
  }

  function renderFrame(ts){
    renderReactionFlash(ts);
    renderStreakSunburst(ts);
    updateBuildText();
    renderBuildShake(ts);
    renderFace();
    renderBelt(ts);
    renderFlight();
    renderBehindFaceParticles();
    renderTrails();
    renderParticles();
    renderConfetti();
    renderFeedback(ts);
    renderBonusIntro();
    renderBonusScoreReveal();
    renderBonusHud();
    updateMenuPill();
    updateMoodPill();
  }

function fitMunchBuildText(){
  if (state.buildFitDone) return;

  requestAnimationFrame(() => {
    const build = document.getElementById("vmunchBuild");
    const text = document.getElementById("vmunchBuildText");

    if (!build || !text) return;

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

function updateBuildText(){
  const el = document.getElementById("vmunchBuildText");
  if (!el) return;

  const buildRender = window.VerseGameShell.renderBuildProgressHtml({
    verseText: ctx.verseText || "",
    book: state.bookLabel,
    reference: state.referenceLabel,
    progressIndex: state.progressIndex,
    buildArea: BUILD_AREA,
    hideUnbuilt: selectedMode === "hard",
    extraClass: "vmunch-build-text"
  });

  el.className = buildRender.className;
  el.innerHTML = buildRender.html;

  fitMunchBuildText();
}

  function renderBuildShake(ts){
    const build = document.getElementById("vmunchBuild");
    if (!build) return;
    build.classList.toggle("vmunch-build-shake", ts < state.buildShakeUntil);
  }

  function renderFace(){
    const face = document.getElementById("vmunchFace");
    const foodDisplay = document.getElementById("vmunchFoodDisplay");
    const faceStack = document.querySelector(".vmunch-face-stack");
    if (!face) return;

    const bonusFaceCardActive = state.bonusPhase === "intro" || state.bonusPhase === "score";

    if (faceStack) {
      faceStack.classList.toggle("is-hidden-for-bonus-intro", bonusFaceCardActive);
    }

    face.className = "vmunch-face";
    for (const cls of state.faceClasses) face.classList.add(cls);

    ensureFaceLayers(face);

    const file = getSafeFaceFile(state.faceDisplay);

    if (file !== state.lastFaceFile){
      swapFaceLayer(face, file);
      state.lastFaceFile = file;
    }

    face.style.transform = state.faceScaleBoost > 0 ? `scale(${state.faceScaleBoost})` : "";

    if (foodDisplay){
      if (state.inputLocked){
        foodDisplay.textContent = "";
      } else {
        foodDisplay.textContent = getCurrentFoodEmoji();
      }
    }
  }

  function renderBelt(ts) {
    const layer = document.getElementById("vmunchBeltLayer");
    if (!layer) return;

    if (state.bonusPhase === "playing") {
      if (!state.bonusFoodItems.length) {
        layer.innerHTML = "";
        return;
      }

      layer.innerHTML = state.bonusFoodItems.map((item) => {
        const classes = [
          "vmunch-bonus-food-chip",
          item.isTarget ? "is-target" : "",
          item.tapped ? "is-hidden" : ""
        ].filter(Boolean).join(" ");

        return `
          <button
            class="${classes}"
            type="button"
            data-bonus-food-id="${item.id}"
            style="--x:${item.x}px;--size:${item.size}px;--tilt:${item.tilt}deg;"
            aria-label="${escapeHtml(item.fruit.label)}"
          >
            <img
              class="vmunch-bonus-food-img"
              src="${escapeHtml(item.fruit.src)}"
              alt=""
              draggable="false"
            >
          </button>
        `;
      }).join("");

      return;
    }

    if (state.inputLocked || bonusRunning || state.beltHidden) {
      layer.innerHTML = "";
      return;
    }

    if (!state.beltItems.length) {
      layer.innerHTML = "";
      return;
    }

    layer.innerHTML = state.beltItems.map((item) => {
      const isWrong = item.wrongUntil && ts < item.wrongUntil;
      const isHidden = item.tapped && !isWrong;
      const classes = [
        "vmunch-belt-chip",
        item.isCorrect ? "is-correct" : "",
        isWrong ? "is-wrong" : "",
        isHidden ? "is-hidden" : ""
      ].filter(Boolean).join(" ");

      return `
        <button
          class="${classes}"
          type="button"
          data-item-id="${item.id}"
          style="--x:${item.x}px;width:${item.width}px;"
          aria-label="${escapeHtml(item.label)}"
        >${escapeHtml(item.label)}</button>
      `;
    }).join("");
  }

  function renderFlight() {
    const layer = document.getElementById("vmunchFoodFlight");
    if (!layer) return;

    let html = "";

    if (state.flyingFood) {
      html += `
        <div class="vmunch-flying-food" style="left:${state.flyingFood.x}px;top:${state.flyingFood.y}px;transform:translate(-50%,-50%) scale(${state.flyingFood.scale});">
          ${escapeHtml(state.flyingFood.emoji)}
        </div>
      `;
    }

    if (state.bonusFlyingFruit) {
      html += `
        <img
          class="vmunch-bonus-flying-fruit"
          src="${escapeHtml(state.bonusFlyingFruit.fruit.src)}"
          alt=""
          draggable="false"
          style="left:${state.bonusFlyingFruit.x}px;top:${state.bonusFlyingFruit.y}px;width:${state.bonusFlyingFruit.size}px;height:${state.bonusFlyingFruit.size}px;transform:translate(-50%,-50%) scale(${state.bonusFlyingFruit.scale});"
        >
      `;
    }

    if (state.feedingWord) {
      const opacity = Number.isFinite(state.feedingWord.opacity) ? state.feedingWord.opacity : 1;
      const scale = Number.isFinite(state.feedingWord.scale) ? state.feedingWord.scale : 1;

      html += `
        <div class="vmunch-feed-word" style="left:${state.feedingWord.x}px;top:${state.feedingWord.y}px;opacity:${opacity};transform:translate(-50%,-50%) scale(${scale});">
          ${escapeHtml(state.feedingWord.text)}
        </div>
      `;
    }

    if (state.hitWord) {
      html += `
        <div class="vmunch-hit-word" style="left:${state.hitWord.x}px;top:${state.hitWord.y}px;transform:translate(-50%,-50%);">
          ${escapeHtml(state.hitWord.text)}
        </div>
      `;
    }

    html += state.flyingLetters.map((letter) => {
      const cls = letter.mode === "spew" ? "vmunch-spew-letter" : "vmunch-flying-letter";
      const opacity = Number.isFinite(letter.opacity) ? letter.opacity : 1;
      const scale = Number.isFinite(letter.scale) ? letter.scale : 1;
      const rotation = Number.isFinite(letter.rotation) ? letter.rotation : 0;

      return `
        <div class="${cls}" style="left:${letter.x}px;top:${letter.y}px;opacity:${opacity};transform:translate(-50%,-50%) rotate(${rotation}deg) scale(${scale});">
          ${escapeHtml(letter.char)}
        </div>
      `;
    }).join("");

    layer.innerHTML = html;
  }

  function renderTrails(){
    const layer = document.getElementById("vmunchTrails");
    if (!layer) return;
    layer.innerHTML = state.trails.map((part) => {
      const alpha = 1 - (part.age / part.life);
      return `<div class="vmunch-spark" style="left:${part.x}px;top:${part.y}px;opacity:${alpha};transform:translate(-50%,-50%) scale(${part.size / 24});">${part.emoji}</div>`;
    }).join("");
  }

  function renderBehindFaceParticles() {
    const layer = document.getElementById("vmunchBehindFaceParticles");
    if (!layer) return;

    layer.innerHTML = state.behindFaceParticles.map((p) => {
      const t = clamp(p.age / p.life, 0, 1);
      const alpha = 1 - t;
      const scale = lerp(1.08, 0.72, t);

      return `<div class="vmunch-trail-particle" style="left:${p.x}px;top:${p.y}px;width:${p.size}px;height:${p.size}px;opacity:${alpha};transform:translate(-50%,-50%) scale(${scale});background:${p.color};"></div>`;
    }).join("");
  }

  function renderParticles(){
    const layer = document.getElementById("vmunchParticles");
    if (!layer) return;
    layer.innerHTML = state.particles.map((p) => {
      const alpha = 1 - (p.age / p.life);
      if (p.type === "spark"){
        return `<div class="vmunch-spark" style="left:${p.x}px;top:${p.y}px;opacity:${alpha};transform:translate(-50%,-50%) scale(${p.size / 22});">${p.value}</div>`;
      }
      return `<div class="vmunch-trail-particle" style="left:${p.x}px;top:${p.y}px;width:${p.size}px;height:${p.size}px;opacity:${alpha};transform:translate(-50%,-50%);background:${p.color};"></div>`;
    }).join("");
  }

  function renderConfetti(){
    const layer = document.getElementById("vmunchConfetti");
    if (!layer) return;
    layer.innerHTML = state.confetti.map((c) => {
      const alpha = 1 - (c.age / c.life);
      return `<div class="vmunch-confetto" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;opacity:${alpha};background:${c.color};transform:translate(-50%,-50%) rotate(${c.rotation}deg);"></div>`;
    }).join("");
  }

  function renderReactionFlash(ts){
    const root = document.querySelector(".vmunch-root, .vmunch-mode-shell");

    if (root){
      root.classList.remove(
        "is-flash-positive",
        "is-flash-streak-1",
        "is-flash-streak-2",
        "is-flash-streak-rainbow",
        "is-flash-negative"
      );
    }

    clearPageStreakFlash();

    const streakActiveUntil = Math.max(state.reactionFlashUntil, state.streakSunburstUntil);

    if (state.reactionFlash && ts < streakActiveUntil){
      const pageClass = state.reactionFlash.replace("is-flash-", "vmunch-page-flash-");

      if (pageClass.startsWith("vmunch-page-flash-streak")){
        document.body.classList.add(pageClass);
      }
    }
  }

  function clearPageStreakFlash(){
    document.body.classList.remove(
      "vmunch-page-flash-streak-1",
      "vmunch-page-flash-streak-2",
      "vmunch-page-flash-streak-rainbow"
    );
  }

  function renderStreakSunburst(ts){
    const layer = document.getElementById("vmunchStreakSunburst");
    if (!layer) return;

    layer.classList.remove("is-active");
  }

  function renderFeedback(ts){
    const layer = document.getElementById("vmunchFeedback");
    if (!layer) return;

    if (!state.feedbackBadge || ts > state.feedbackUntil){
      if (layer.dataset.vmunchFeedbackKey){
        layer.innerHTML = "";
        layer.dataset.vmunchFeedbackKey = "";
      }
      return;
    }

    const typeClass = state.feedbackType ? ` is-${state.feedbackType}` : "";
    const feedbackKey = `${state.feedbackType}|${state.feedbackBadge}`;

    if (layer.dataset.vmunchFeedbackKey === feedbackKey) return;

    layer.dataset.vmunchFeedbackKey = feedbackKey;
    layer.innerHTML = `<div class="vmunch-feedback-badge${typeClass}">${escapeHtml(state.feedbackBadge)}</div>`;
  }

  function renderBonusIntro() {
    const layer = document.getElementById("vmunchBonusIntro");
    if (!layer) return;

    if (state.bonusPhase !== "intro" || !state.bonusTargetFruit) {
      if (layer.dataset.vmunchBonusIntroKey) {
        layer.innerHTML = "";
        layer.dataset.vmunchBonusIntroKey = "";
      }
      return;
    }

    const introText = state.bonusIntroText || "FEED ME!";
    const introKey = `${introText}|${state.bonusTargetFruit.id}`;

    if (layer.dataset.vmunchBonusIntroKey === introKey) return;

    layer.dataset.vmunchBonusIntroKey = introKey;
    layer.innerHTML = `
      <div class="vmunch-bonus-intro-card">
        <div class="vmunch-bonus-intro-title">${escapeHtml(introText)}</div>
        <img
          class="vmunch-bonus-intro-fruit"
          src="${escapeHtml(state.bonusTargetFruit.src)}"
          alt=""
          draggable="false"
        >
      </div>
    `;
  }

  function renderBonusScoreReveal() {
    const layer = document.getElementById("vmunchBonusScoreReveal");
    if (!layer) return;

    if (state.bonusPhase !== "score" || !state.bonusTargetFruit) {
      if (layer.dataset.vmunchBonusScoreKey) {
        layer.innerHTML = "";
        layer.dataset.vmunchBonusScoreKey = "";
      }
      return;
    }

    const displayScore = state.bonusCount > 99 ? "99+" : String(state.bonusCount);
    const scoreKey = `${state.bonusTargetFruit.id}|${displayScore}`;

    if (layer.dataset.vmunchBonusScoreKey === scoreKey) return;

    layer.dataset.vmunchBonusScoreKey = scoreKey;
    layer.innerHTML = `
      <div class="vmunch-bonus-score-card is-celebrating">
        <div class="vmunch-bonus-score-title">BONUS BITES!</div>
        <div class="vmunch-bonus-score-line" aria-label="Bonus bites ${escapeHtml(displayScore)}">
          <img
            class="vmunch-bonus-score-fruit"
            src="${escapeHtml(state.bonusTargetFruit.src)}"
            alt=""
            draggable="false"
          >
          <span class="vmunch-bonus-score-x" aria-hidden="true">x</span>
          <span class="vmunch-bonus-score-number">${escapeHtml(displayScore)}</span>
        </div>
        <div class="vmunch-bonus-continue-prompt">TAP TO CONTINUE</div>
      </div>
    `;
  }

  function renderBonusHud() {
    const fieldLayer = document.getElementById("vmunchBonusHud");
    const moodPill = document.getElementById("vmunchMoodPill");

    const shouldShowHud = state.bonusTargetFruit && (
      state.bonusPhase === "hud-test" ||
      state.bonusPhase === "playing" ||
      state.bonusPhase === "score"
    );

    if (fieldLayer) {
      fieldLayer.innerHTML = "";
      fieldLayer.dataset.vmunchBonusHudKey = "";
    }

    if (!moodPill) return;

    if (!shouldShowHud) {
      if (moodPill.classList.contains("is-bonus-hud-pill")) {
        moodPill.classList.remove("is-bonus-hud-pill");
        moodPill.dataset.vmunchBonusHudKey = "";
      }
      return;
    }

    const displayScore = state.bonusCount > 99 ? "99+" : String(state.bonusCount);
    const displayMultiplier = Math.max(1, Number(state.bonusMultiplier) || 1);
    const multiplierLabel = `${displayMultiplier}X`;
    const multiplierClass = displayMultiplier >= 3 ? "is-three" : "is-two";
    const multiplierAria = displayMultiplier > 1
      ? `, ${displayMultiplier} times multiplier`
      : "";
    const multiplierBadgeHtml = displayMultiplier > 1
      ? `<span class="vmunch-bonus-hud-multiplier ${multiplierClass}">${escapeHtml(multiplierLabel)}</span>`
      : "";

    const hudKey = `${state.bonusTargetFruit.id}|${displayScore}|${displayMultiplier}`;

    moodPill.classList.add("is-bonus-hud-pill");

    if (moodPill.dataset.vmunchBonusHudKey === hudKey) return;

    moodPill.dataset.vmunchBonusHudKey = hudKey;
    moodPill.innerHTML = `
      <div class="vmunch-bonus-hud-card" aria-label="Bonus bites ${escapeHtml(displayScore)}${escapeHtml(multiplierAria)}">
        <img
          class="vmunch-bonus-hud-fruit"
          src="${escapeHtml(state.bonusTargetFruit.src)}"
          alt=""
          draggable="false"
        >
        <span class="vmunch-bonus-hud-x" aria-hidden="true">x</span>
        <span class="vmunch-bonus-hud-score">${escapeHtml(displayScore)}</span>
        ${multiplierBadgeHtml}
      </div>
    `;
  }

  function chooseBonusTargetFruit() {
    return randomFrom(BONUS_FRUITS);
  }

  function getCurrentPhase(){
    return window.VerseGameShell.getPhaseForProgress({
      progressIndex: state.progressIndex,
      wordCount: state.words.length,
      totalSegments: state.segments.length,
      bookLabel: state.bookLabel,
      referenceLabel: state.referenceLabel
    });
  }

  function getCurrentCorrectLabel(){
    return state.segments[state.progressIndex] || "";
  }

  function buildCarouselForCurrentStep(){
    const phase = getCurrentPhase();
    if (phase === "done"){
      state.carouselItems = [];
      return;
    }

    const correctLabel = getCurrentCorrectLabel();
    const decoys = getDecoysForPhase(phase, correctLabel, 3);
    const labels = shuffle([correctLabel, ...decoys]);
    // pick 4 unique random foods
    const foods = shuffle(FOOD_EMOJIS).slice(0, labels.length);

    state.carouselItems = labels.map((label, index) => ({
      label,
      food:foods[index],
      type:phase === "words" ? "word" : phase === "book" ? "book" : "reference"
    }));
    state.carouselIndex = Math.floor(Math.random() * state.carouselItems.length);
  }

  function resetBeltForCurrentStep() {
    state.beltItems = [];
    state.beltNextId = 1;
    state.beltHidden = false;

    if (selectedMode === "hard") {
      state.beltForceCorrectIn = getStartingCorrectDelay("hard");
    } else if (selectedMode === "medium") {
      state.beltForceCorrectIn = getStartingCorrectDelay("medium");
    } else {
      state.beltForceCorrectIn = getStartingCorrectDelay("easy");
    }
  }

  function getBeltConfig() {
    const chipHeight = 56;

    if (selectedMode === "hard") {
      return {
        speed: chipHeight * 4.35,
        gap: 98,
        minWidth: 92,
        maxCorrectVisible: 1,
        decoyCount: 10,
        correctDelayMode: "hard"
      };
    }

    if (selectedMode === "medium") {
      return {
        speed: chipHeight * 3.35,
        gap: 92,
        minWidth: 98,
        maxCorrectVisible: 1,
        decoyCount: 8,
        correctDelayMode: "medium"
      };
    }

    return {
      speed: chipHeight * 2.45,
      gap: 86,
      minWidth: 108,
      maxCorrectVisible: 2,
      decoyCount: 4,
      correctDelayMode: "easy"
    };
  }

  function updateBonusFoodBelt(dt) {
    if (state.bonusPhase !== "playing") return;

    const cfg = getBonusFoodBeltConfig();

    for (const item of state.bonusFoodItems) {
      item.x -= cfg.speed * dt;
    }

    state.bonusFoodItems = state.bonusFoodItems.filter(item => {
      return item.x + item.size > -40;
    });

    state.bonusFoodSpawnTimer -= dt;

    let guard = 0;
    while (state.bonusFoodSpawnTimer <= 0 && guard < 3) {
      spawnBonusFoodItem(cfg);
      state.bonusFoodSpawnTimer += randomBonusSpawnDelay();
      guard += 1;
    }
  }

  function getBonusFoodBeltConfig() {
    const hardModeBeltSpeed = 56 * 4.35;

    return {
      speed: hardModeBeltSpeed,
      gap: 70,
      size: clamp(state.fieldWidth * 0.13, 58, 86)
    };
  }

  function randomBonusSpawnDelay() {
    return 0.42 + Math.random() * 0.22;
  }

  function spawnBonusFoodItem(cfg) {
    if (!state.bonusTargetFruit) return;

    const beltWidth = getBonusBeltWidth();
    const forceTarget = state.bonusNonTargetStreak >= BONUS_FORCE_TARGET_AFTER;
    const makeTarget = forceTarget || Math.random() < BONUS_TARGET_CHANCE;

    let fruit = state.bonusTargetFruit;

    if (!makeTarget) {
      const decoys = BONUS_FRUITS.filter(entry => entry.id !== state.bonusTargetFruit.id);
      fruit = randomFrom(decoys);
      state.bonusNonTargetStreak += 1;
    } else {
      state.bonusNonTargetStreak = 0;
    }

    const currentRightEdge = state.bonusFoodItems.length
      ? Math.max(...state.bonusFoodItems.map(item => item.x + item.size))
      : beltWidth + 18;

    const x = Math.max(beltWidth + 18, currentRightEdge + cfg.gap);

    state.bonusFoodItems.push({
      id: state.bonusFoodNextId++,
      fruit,
      isTarget: fruit.id === state.bonusTargetFruit.id,
      x,
      size: cfg.size + Math.random() * 8,
      tilt: -8 + Math.random() * 16,
      tapped: false
    });
  }

  function getBonusBeltWidth() {
    const layer = document.getElementById("vmunchBeltLayer");
    if (!layer) return state.fieldWidth || 360;

    const rect = layer.getBoundingClientRect();
    return rect.width || state.fieldWidth || 360;
  }

  function updateBelt(dt) {
    if (state.inputLocked || bonusRunning || state.beltHidden) return;
    if (getCurrentPhase() === "done") return;

    const cfg = getBeltConfig();
    const now = performance.now();

    for (const item of state.beltItems) {
      item.x -= cfg.speed * dt;
    }

    state.beltItems = state.beltItems.filter(item => {
      if (item.removeAt && now > item.removeAt) return false;
      return item.x + item.width > -24;
    });

    let guard = 0;
    while (shouldAddBeltItem(cfg) && guard < 4) {
      spawnBeltItem(cfg);
      guard += 1;
    }
  }

  function shouldAddBeltItem(cfg) {
    if (!state.fieldWidth) return false;
    if (!state.beltItems.length) return true;

    const rightEdge = Math.max(...state.beltItems.map(item => item.x + item.width));
    return rightEdge < state.fieldWidth + cfg.gap;
  }

  function spawnBeltItem(cfg) {
    const phase = getCurrentPhase();
    if (phase === "done") return;

    const correctLabel = getCurrentCorrectLabel();
    const visibleCorrectCount = state.beltItems.filter(item => {
      return item.isCorrect && !item.tapped && item.x + item.width > 0 && item.x < state.fieldWidth;
    }).length;

    let makeCorrect = false;

    if (visibleCorrectCount < cfg.maxCorrectVisible && state.beltForceCorrectIn <= 0) {
      makeCorrect = true;
    }

    let label = correctLabel;

    if (!makeCorrect) {
      const decoys = getDecoysForPhase(phase, correctLabel, cfg.decoyCount);
      label = randomFrom(decoys.length ? decoys : FUN_DECOYS);
      state.beltForceCorrectIn -= 1;
    } else {
      state.beltForceCorrectIn = getNextCorrectDelay(cfg.correctDelayMode);
    }

    const width = estimateBeltItemWidth(label, cfg);
    const currentRightEdge = state.beltItems.length
      ? Math.max(...state.beltItems.map(item => item.x + item.width))
      : state.fieldWidth + 18;

    const x = Math.max(state.fieldWidth + 18, currentRightEdge + cfg.gap);
    const foods = shuffle(FOOD_EMOJIS);

    state.beltItems.push({
      id: state.beltNextId++,
      label,
      isCorrect: makeCorrect,
      kind: phase,
      food: foods[0],
      x,
      width,
      tapped: false,
      wrongUntil: 0,
      removeAt: 0
    });
  }

  function estimateBeltItemWidth(label, cfg) {
    const text = String(label || "");
    const basePadding = 48;
    const perCharacter = 19;
    const rough = basePadding + text.length * perCharacter;

    return Math.max(cfg.minWidth, rough);
  }

  function getBeltItemCenter(item) {
    const layer = document.getElementById("vmunchBeltLayer");
    const field = document.getElementById("vmunchField");

    if (!layer || !field) {
      return {
        x: item.x + item.width * 0.5,
        y: state.fieldHeight * 0.82
      };
    }

    const layerRect = layer.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();

    return {
      x: layerRect.left - fieldRect.left + item.x + item.width * 0.5,
      y: layerRect.top - fieldRect.top + layerRect.height * 0.5
    };
  }

  function getBeltFeedPoint() {
    const layer = document.getElementById("vmunchBeltLayer");
    const field = document.getElementById("vmunchField");

    if (!layer || !field) {
      return {
        x: state.fieldWidth * 0.5,
        y: state.fieldHeight * 0.82
      };
    }

    const layerRect = layer.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();

    return {
      x: layerRect.left - fieldRect.left + layerRect.width * 0.5,
      y: layerRect.top - fieldRect.top + layerRect.height * 0.5
    };
  }

  function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function getNextCorrectDelay(mode) {
    const roll = Math.random();

    if (mode === "hard") {
      if (roll < 0.18) return 1;
      if (roll < 0.58) return 2;
      return 3;
    }

    if (mode === "medium") {
      if (roll < 0.28) return 0;
      if (roll < 0.72) return 1;
      return 2;
    }

    if (roll < 0.58) return 0;
    return 1;
  }

  function getStartingCorrectDelay(mode) {
    const roll = Math.random();

    if (mode === "hard") {
      return roll < 0.65 ? 1 : 2;
    }

    if (mode === "medium") {
      return roll < 0.75 ? 0 : 1;
    }

    return 0;
  }

  function getDecoysForPhase(phase, correctLabel, count){
    const out = [];
    const seen = new Set([normalizeWord(correctLabel)]);

    function addDecoys(list){
      for (const item of list || []){
        const key = normalizeWord(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        if (out.length >= count) break;
      }
    }

    if (phase === "words"){
      if (selectedMode === "easy"){
        addDecoys(window.VerseGameShell.getFunWordDecoys(correctLabel, state.words, count));
      } else {
        addDecoys(window.VerseGameShell.getVerseWordDecoys({
          words: state.words,
          correct: correctLabel,
          targetIndex: state.progressIndex,
          count,
          avoidNext: 2,
          fallbackToFun: true
        }));

        if (out.length < count){
          addDecoys(window.VerseGameShell.getFunWordDecoys(correctLabel, state.words, count));
        }

        if (out.length < count){
          addDecoys(FUN_DECOYS);
        }
      }
    } else if (phase === "book"){
      addDecoys(window.VerseGameShell.getBookDecoys(correctLabel, count));
    } else if (phase === "reference"){
      addDecoys(window.VerseGameShell.getReferenceDecoys(state.referenceMeta, selectedMode, count + 4));
    }

    return out.slice(0, count);
  }

  function triggerBonusScoreCelebration() {
    const now = performance.now();

    state.reactionFlash = "is-flash-streak-rainbow";
    state.reactionFlashUntil = now + 1050;
    state.streakSunburstUntil = now + 1050;

    spawnConfettiBurst();
    spawnSuccessParticles(true);

    window.setTimeout(() => {
      if (state.bonusPhase !== "score") return;
      spawnSuccessParticles(true);
    }, 360);
  }

  function spawnSuccessParticles(isBonus = false) {
    const metrics = getMonsterFaceMetrics();
    const centerX = metrics.centerX;
    const centerY = metrics.centerY;
    const headSize = metrics.headSize;

    const palette = [
      "#ff5f6d",
      "#ff9f43",
      "#ffe66d",
      "#6bd66b",
      "#46c6ff",
      "#6d83ff",
      "#b36cff",
      "#ff79c6"
    ];

    const count = isBonus ? 18 : 14;
    const sizeMin = headSize * (isBonus ? 0.085 : 0.07);
    const sizeMax = headSize * (isBonus ? 0.145 : 0.12);
    const speedMin = headSize * (isBonus ? 0.98 : 0.82);
    const speedMax = headSize * (isBonus ? 1.62 : 1.38);

    for (let i = 0; i < count; i++) {
      const angle = (-Math.PI / 2) + (i / count) * Math.PI * 2 + (Math.random() * 0.16 - 0.08);
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);

      state.behindFaceParticles.push({
        type: "dot",
        x: centerX + (Math.random() * headSize * 0.035 - headSize * 0.0175),
        y: centerY + (Math.random() * headSize * 0.035 - headSize * 0.0175),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: headSize * 0.56,
        age: 0,
        life: isBonus ? 0.72 + Math.random() * 0.18 : 0.62 + Math.random() * 0.16,
        size,
        color: palette[i % palette.length]
      });
    }
  }

  function spawnMissParticles(){
    const center = getMouthPoint();
    for (let i = 0; i < 10; i++){
      state.particles.push({
        type:i % 2 === 0 ? "spark" : "dot",
        value:i % 2 === 0 ? "💨" : "🫧",
        x:center.x + (Math.random() * 24 - 12),
        y:center.y + (Math.random() * 18 - 9),
        vx:-120 + Math.random() * 240,
        vy:-40 + Math.random() * 130,
        gravity:260,
        age:0,
        life:0.45 + Math.random() * 0.2,
        size:11 + Math.random() * 8,
        color:randomFrom(["#ffffff", "#e8e4ff", "#ffcad0"])
      });
    }
  }

function spawnChewCrumbs(isSecondary = false){
  const sources = getChewCrumbSources();
  const crumbColors = ["#ffffff", "#fff7dc", "#ffeab0", "#f6dfa6"];
  const countPerSide = isSecondary ? 4 : 7;

  for (const source of sources){
    for (let i = 0; i < countPerSide; i++){
      const angle = source.baseAngle + (Math.random() * 0.86 - 0.43);
      const speed = source.headSize * (isSecondary
        ? 0.72 + Math.random() * 0.46
        : 0.88 + Math.random() * 0.62
      );

      const size = source.headSize * (isSecondary
        ? 0.035 + Math.random() * 0.035
        : 0.045 + Math.random() * 0.05
      );

      state.particles.push({
        type: "dot",
        x: source.x + (Math.random() * source.headSize * 0.018 - source.headSize * 0.009),
        y: source.y + (Math.random() * source.headSize * 0.018 - source.headSize * 0.009),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: source.headSize * (0.82 + Math.random() * 0.28),
        age: 0,
        life: isSecondary ? 0.38 + Math.random() * 0.16 : 0.46 + Math.random() * 0.20,
        size,
        color: randomFrom(crumbColors)
      });
    }
  }
}

  function getChewCrumbSources() {
    const face = document.getElementById("vmunchFace");
    const field = document.getElementById("vmunchField");

    if (!face || !field) {
      const fallback = getMouthPoint();
      const headSize = Math.max(80, Math.min(state.fieldWidth, state.fieldHeight) * 0.22);

      return [
        {
          x: fallback.x - headSize * 0.20,
          y: fallback.y,
          headSize,
          baseAngle: Math.PI
        },
        {
          x: fallback.x + headSize * 0.20,
          y: fallback.y,
          headSize,
          baseAngle: 0
        }
      ];
    }

    const faceRect = face.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const headSize = Math.min(faceRect.width, faceRect.height);

    const faceLeft = faceRect.left - fieldRect.left;
    const faceTop = faceRect.top - fieldRect.top;

    const y = faceTop + faceRect.height * 0.64;

    return [
      {
        x: faceLeft + faceRect.width * 0.30,
        y,
        headSize,
        baseAngle: Math.PI
      },
      {
        x: faceLeft + faceRect.width * 0.70,
        y,
        headSize,
        baseAngle: 0
      }
    ];
  }

  function spawnConfettiBurst(){
    const centerX = state.fieldWidth * 0.5;
    const centerY = state.fieldHeight * 0.32;
    for (let i = 0; i < 70; i++){
      state.confetti.push({
        x:centerX,
        y:centerY,
        vx:-220 + Math.random() * 440,
        vy:-260 + Math.random() * 130,
        gravity:380,
        age:0,
        life:1.5 + Math.random() * 0.8,
        w:7 + Math.random() * 9,
        h:12 + Math.random() * 12,
        color:randomFrom(["#ff5a51", "#ffc751", "#40b9c5", "#a7cb6f", "#ffffff", "#7f66c6"]),
        rotation:Math.random() * 180,
        spin:-340 + Math.random() * 680
      });
    }
  }

  function spawnReactionSparkles(){
    const center = getMouthPoint();
    const sparks = ["✨","⭐","💫","🌟"];

    for (let i = 0; i < 6; i++){
      state.particles.push({
        type: "spark",
        value: randomFrom(sparks),
        x: center.x + (Math.random()*20 - 10),
        y: center.y - 20 + (Math.random()*10),
        vx: -60 + Math.random()*120,
        vy: -120 + Math.random()*80,
        gravity: 180,
        age: 0,
        life: 0.5 + Math.random()*0.2,
        size: 12 + Math.random()*8,
        color: "#fff"
      });
    }
  }



  function setupReferenceSegments(){
    const parsed = parseReferenceParts(ctx.verseRef, ctx.translation, ctx.verseId);
    const buildData = window.VerseGameShell.buildVerseSegments({
      verseText: ctx.verseText || "",
      book: parsed.book,
      reference: parsed.reference,
      buildArea: BUILD_AREA
    });

    state.referenceMeta = parsed;
    state.words = buildData.words;
    state.bookLabel = buildData.bookLabel;
    state.referenceLabel = buildData.referenceLabel;
    state.buildSizeClass = buildData.buildSizeClass;
    state.segments = buildData.segments;
  }

  function getOpenMouthFace(){
    if (state.emotionLevel >= 2) return "😄";
    if (state.emotionLevel >= 0) return "😮";
    return "😦";
  }

  function getEmotionFace(){
    return EMOTION_FACE[String(state.emotionLevel)] || "😐";
  }

  function getMoodLabel(){
    return EMOTION_LABEL[String(state.emotionLevel)] || "Calm";
  }

  function showReactionPopup(isCorrect) {
    state.feedbackBadge = isCorrect
      ? randomFrom(["YUM!", "MMM!"])
      : randomFrom(["GROSS!", "BLEH!", "YUCK!"]);

    state.feedbackType = isCorrect ? "positive" : "negative";
    state.feedbackUntil = performance.now() + 760;
  }

  function clearReactionPopup() {
    state.feedbackBadge = "";
    state.feedbackType = "";
    state.feedbackUntil = 0;
  }

  function getIdleVariants(){
    if (state.emotionLevel >= 2) return ["is-idle-bob", "is-idle-sway", "is-idle-wiggle"];
    if (state.emotionLevel <= -2) return ["is-idle-blink", "is-idle-sway"];
    return ["is-idle-bob", "is-idle-blink", "is-idle-sway"];
  }

  function getPositiveCaption(){
    if (getCurrentPhase() === "book") return "Book unlocked!";
    if (getCurrentPhase() === "reference") return "Reference unlocked!";
    if (state.progressIndex >= state.words.length) return "Verse complete! Keep feeding the reference.";
    return state.streak >= 4 ? "Yum. On a roll!" : "Nice bite!";
  }

  function getNegativeCaption(chosen, correct){
    if (getCurrentPhase() === "book") return `Not ${chosen}. The right book is still hiding.`;
    if (getCurrentPhase() === "reference") return `${chosen} was off. Try the right reference.`;
    return `Not ${chosen}. Looking for ${correct}.`;
  }


  function updateMenuPill(){
    const pill = document.getElementById("vmunchMenuPill");
    if (!pill) return;
    pill.textContent = "☰";
    pill.setAttribute("aria-label", "Game Menu");
    pill.onclick = () => openGameMenu();
  }

  function updateMoodPill(){
    const pill = document.getElementById("vmunchMoodPill");
    if (!pill) return;

    const bonusHudActive = state.bonusTargetFruit && (
      state.bonusPhase === "hud-test" ||
      state.bonusPhase === "playing" ||
      state.bonusPhase === "score"
    );

    if (bonusHudActive) return;

    pill.classList.remove("is-bonus-hud-pill");
    pill.dataset.vmunchBonusHudKey = "";
    pill.innerHTML = `
      <span class="vmunch-mood-pill-label">MOOD</span>
      <span class="vmunch-mood-pill-value">${escapeHtml(getMoodLabel())}</span>
    `;
  }

  function getTrailTier(){
    if (state.streak < 2) return 0;
    if (state.streak < 4) return 1;
    if (state.streak < 7) return 2;
    return 3;
  }

  function getTiming(){
    if (selectedMode === "hard"){
      return { launch:0.34, mouthOpen:0.14, chew:0.80, anticipation:0.22, reaction:0.36, bonusReaction:0.22 };
    }
    if (selectedMode === "medium"){
      return { launch:0.40, mouthOpen:0.16, chew:0.80, anticipation:0.26, reaction:0.40, bonusReaction:0.24 };
    }
    return { launch:0.46, mouthOpen:0.18, chew:0.80, anticipation:0.30, reaction:0.46, bonusReaction:0.28 };
  }

  function getIdleDelay(){
    if (selectedMode === "hard") return 1.3 + Math.random() * 1.0;
    if (selectedMode === "medium") return 1.6 + Math.random() * 1.1;
    return 1.9 + Math.random() * 1.2;
  }

  function getCurrentFoodEmoji(){
    if (bonusRunning){
      return FOOD_EMOJIS[state.bonusCount % FOOD_EMOJIS.length];
    }

    return FOOD_EMOJIS[state.progressIndex % FOOD_EMOJIS.length];
  }

  function getFoodStartPoint(){
    const el = document.getElementById("vmunchFoodDisplay");
    const field = document.getElementById("vmunchField");
    if (!el || !field){
      return { x:state.fieldWidth * 0.5, y:state.fieldHeight * 0.68 };
    }
    const rect = el.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    return {
      x:rect.left - fieldRect.left + rect.width * 0.5,
      y:rect.top - fieldRect.top + rect.height * 0.5
    };
  }

  function getChoiceCenterX(){
    const btn = document.getElementById("vmunchChoiceBtn");
    const field = document.getElementById("vmunchField");
    if (!btn || !field) return state.fieldWidth * 0.5;
    const rect = btn.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    return rect.left - fieldRect.left + rect.width * 0.5;
  }

  function getChoiceCenterY(){
    const btn = document.getElementById("vmunchChoiceBtn");
    const field = document.getElementById("vmunchField");
    if (!btn || !field) return state.fieldHeight * 0.82;
    const rect = btn.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    return rect.top - fieldRect.top + rect.height * 0.5;
  }

function getMouthPoint(){
  const face = document.getElementById("vmunchFace");
  const field = document.getElementById("vmunchField");

  if (!face || !field){
    return {
      x: state.fieldWidth * 0.5,
      y: state.fieldHeight * 0.42
    };
  }

  const faceRect = face.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();

  return {
    x: faceRect.left - fieldRect.left + faceRect.width * 0.5,
    y: faceRect.top - fieldRect.top + faceRect.height * 0.64
  };
}

  function tokenizeVerse(text){
    return window.VerseGameShell.tokenizeVerseWords(text);
  }

  function normalizeWord(value){
    return window.VerseGameShell.normalizeWord(value);
  }

  function parseReferenceParts(ref, translation, verseId){
    return window.VerseGameShell.parseReferenceParts(ref, translation, verseId);
  }


const clamp = window.VerseGameShell.clamp;
function lerp(a, b, t){ return a + (b - a) * t; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
const capitalize = window.VerseGameShell.capitalize;
function randomFrom(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function waitSeconds(seconds, runToken){
  return new Promise(resolve => {
    const targetMs = Math.max(0, seconds * 1000);
    let elapsedMs = 0;
    let lastTs = performance.now();

    function step(ts){
      if (!isActiveRun(runToken)){
        resolve(false);
        return;
      }

      if (!state.paused){
        elapsedMs += ts - lastTs;
      }

      lastTs = ts;

      if (elapsedMs >= targetMs){
        resolve(true);
        return;
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  });
}

const shuffle = window.VerseGameShell.shuffle;

  function escapeHtml(str){
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }


})();
