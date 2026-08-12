(function(){
  function getParams(){
    const params = new URLSearchParams(window.location.search);

    return {
      verseId: params.get("verseId") || "",
      returnTo: params.get("returnTo") || "../../index.html",
      ref: params.get("ref") || "",
      translation: params.get("translation") || "",
      source: params.get("source") || "",
      mix: params.get("mix") === "1",
      mode: params.get("mode") || "",
      profileId: params.get("profileId") || "",

      todoSource: params.get("todoSource") || "",
      todoType: params.get("todoType") || "",
      todoVerseId: params.get("todoVerseId") || "",
      todoPetName: params.get("todoPetName") || "",
      todoPetEmoji: params.get("todoPetEmoji") || "",
      todoText: params.get("todoText") || ""
    };
  }

  async function getVerseContext(){
    const params = getParams();
    const verseId = params.verseId;
    const verseUrl = `../../verse_data/${verseId}.json`;

    if (!verseId){
      return {
        verseId: "",
        verseText: "",
        verseRef: params.ref || "",
        translation: params.translation || "",
        attribution: ""
      };
    }

    try {
      const res = await fetch(verseUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      return {
        verseId: json.verseId || verseId,
        verseText: json.verseText || "",
        verseRef: params.ref || "",
        translation: json.translation || params.translation || "",
        attribution: json.attribution || ""
      };
    } catch (err) {
      console.warn("Could not load verse context for external game", verseUrl, err);

      return {
        verseId,
        verseText: "",
        verseRef: params.ref || "",
        translation: params.translation || "",
        attribution: ""
      };
    }
  }

  function getProgressStorageKey(){
    const profileId = String(
      getParams().profileId || ""
    ).trim();

    if (!profileId) return "";

    return `verseMemoryProgress:${profileId}`;
  }

  function loadProgress(){
    try {
      const storageKey = getProgressStorageKey();

      if (!storageKey) {
        return {
          ok: false,
          progress: null,
          error: new Error(
            "No Zookeeper profile was supplied to the external game."
          )
        };
      }

      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        return {
          ok: true,
          progress: { version: 2, verses: {} }
        };
      }

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        return {
          ok: false,
          progress: null,
          error: new Error("Progress JSON was not an object")
        };
      }

      if (!parsed.verses || typeof parsed.verses !== "object") {
        parsed.verses = {};
      }

      if (!parsed.version) {
        parsed.version = 2;
      }

      return {
        ok: true,
        progress: parsed
      };
    } catch (err) {
      console.warn("Could not load progress in external bridge", err);
      return {
        ok: false,
        progress: null,
        error: err
      };
    }
  }

  function saveProgress(progress){
    try {
      const storageKey = getProgressStorageKey();

      if (!storageKey) {
        console.warn(
          "Progress was not saved because the external game has no Zookeeper profile."
        );
        return false;
      }

      localStorage.setItem(
        storageKey,
        JSON.stringify(progress)
      );

      return true;
    } catch (err) {
      console.warn("Could not save progress in external bridge", err);
      return false;
    }
  }

function isTrackedGameCompleted(gameId, gameProgress){
  if (!gameId || !gameProgress) return false;

  if (gameId === "traffic"){
    return !!(gameProgress.roadCompleted || gameProgress.trailCompleted || gameProgress.riverCompleted);
  }

  return !!(gameProgress.easyCompleted || gameProgress.mediumCompleted || gameProgress.hardCompleted);
}

function markCompleted(payload){
  if (!payload || !payload.verseId || !payload.gameId || !payload.mode) {
    return { ok: false, petUnlockTriggered: false };
  }

  const loaded = loadProgress();
  if (!loaded.ok || !loaded.progress) {
    console.warn("markCompleted aborted because progress could not be loaded safely.");
    return { ok: false, petUnlockTriggered: false };
  }

  const progress = loaded.progress;

  if (!progress.verses[payload.verseId]) {
    progress.verses[payload.verseId] = {
      learnCompleted: false,
      games: {}
    };
  }

  const verseProgress = progress.verses[payload.verseId];

  const wasUnlockedBefore =
    !!verseProgress.learnCompleted &&
    Object.entries(verseProgress.games || {}).some(([gameId, gp]) =>
      isTrackedGameCompleted(gameId, gp)
    );

  if (!verseProgress.games[payload.gameId]) {
    verseProgress.games[payload.gameId] = {
      easyCompleted: false,
      mediumCompleted: false,
      hardCompleted: false
    };
  }

  const gameProgress = verseProgress.games[payload.gameId];

  if (payload.mode === "easy") gameProgress.easyCompleted = true;
  if (payload.mode === "medium") gameProgress.mediumCompleted = true;
  if (payload.mode === "hard") gameProgress.hardCompleted = true;

  const now = Date.now();
  const currentTimesPlayed = Number(gameProgress.timesPlayed || 0);

  gameProgress.timesPlayed = Number.isFinite(currentTimesPlayed)
    ? currentTimesPlayed + 1
    : 1;

  gameProgress.lastPlayedAt = now;
  verseProgress.lastPracticedAt = now;

  const isUnlockedNow =
    !!verseProgress.learnCompleted &&
    Object.entries(verseProgress.games || {}).some(([gameId, gp]) =>
      isTrackedGameCompleted(gameId, gp)
    );

  let petUnlockTriggered = false;

  if (!wasUnlockedBefore && isUnlockedNow && !verseProgress.petUnlockShown) {
    verseProgress.petUnlockShown = true;
    verseProgress.externalPetUnlockPending = true;
    petUnlockTriggered = true;
  }

  saveProgress(progress);

  return {
    ok: true,
    petUnlockTriggered
  };
}

  function markVersePracticed({ verseId = "" } = {}) {
    const safeVerseId = String(verseId || "").trim();

    if (!safeVerseId) {
      return { ok: false, verseId: safeVerseId };
    }

    const loaded = loadProgress();
    if (!loaded.ok || !loaded.progress) {
      console.warn("markVersePracticed aborted because progress could not be loaded safely.");
      return { ok: false, verseId: safeVerseId };
    }

    const progress = loaded.progress;

    if (!progress.verses[safeVerseId]) {
      progress.verses[safeVerseId] = {
        learnCompleted: false,
        games: {}
      };
    }

    progress.verses[safeVerseId].lastPracticedAt = Date.now();
    saveProgress(progress);

    return { ok: true, verseId: safeVerseId };
  }
  
  function wasAlreadyCompleted(verseId, gameId, mode){
    if (!verseId || !gameId || !mode) return false;

    const loaded = loadProgress();
    if (!loaded.ok || !loaded.progress) return false;

    const progress = loaded.progress;
    const verseProgress = progress.verses?.[verseId];
    const gameProgress = verseProgress?.games?.[gameId];

    if (!gameProgress) return false;

    if (mode === "easy") return !!gameProgress.easyCompleted;
    if (mode === "medium") return !!gameProgress.mediumCompleted;
    if (mode === "hard") return !!gameProgress.hardCompleted;

    return false;
  }

  function getGameCompletionStatus({
    verseId = "",
    gameId = ""
  } = {}){
    const safeVerseId = String(verseId || "").trim();
    const safeGameId = String(gameId || "").trim();

    const empty = {
      easy: false,
      medium: false,
      hard: false
    };

    if (!safeVerseId || !safeGameId) return empty;

    const loaded = loadProgress();
    if (!loaded.ok || !loaded.progress) return empty;

    const progress = loaded.progress;
    const verseProgress = progress.verses?.[safeVerseId];
    const gameProgress = verseProgress?.games?.[safeGameId];

    if (!gameProgress) return empty;

    return {
      easy: !!gameProgress.easyCompleted,
      medium: !!gameProgress.mediumCompleted,
      hard: !!gameProgress.hardCompleted
    };
  }

  async function completeGameRun({
    verseId = "",
    gameId = "",
    mode = "",
    startedAt = 0,
    stats = {},
    mark = true
  } = {}){
    const safeVerseId = String(verseId || "").trim();
    const safeGameId = String(gameId || "").trim();
    const safeMode = String(mode || "").trim();

    const elapsedMs = startedAt
      ? Math.max(0, performance.now() - Number(startedAt))
      : 0;

    if (!safeVerseId || !safeGameId || !safeMode){
      return {
        ok: false,
        verseId: safeVerseId,
        gameId: safeGameId,
        mode: safeMode,
        alreadyCompleted: false,
        newlyCompleted: false,
        elapsedMs,
        stats,
        reward: {
          ok: false,
          petUnlockTriggered: false
        }
      };
    }

    const alreadyCompleted = wasAlreadyCompleted(
      safeVerseId,
      safeGameId,
      safeMode
    );

    const reward = mark
      ? markCompleted({
          verseId: safeVerseId,
          gameId: safeGameId,
          mode: safeMode
        })
      : {
          ok: true,
          petUnlockTriggered: false
        };

    return {
      ok: !!reward.ok,
      verseId: safeVerseId,
      gameId: safeGameId,
      mode: safeMode,
      alreadyCompleted,
      newlyCompleted: !alreadyCompleted && !!reward.ok,
      elapsedMs,
      stats,
      reward
    };
  }

  function applyProfileIdentityToTarget(target) {
    const params = getParams();

    if (params.profileId) {
      target.searchParams.set("internalReturn", "1");
      target.searchParams.set(
        "profileId",
        params.profileId
      );
    }

    return target;
  }

  function buildFallbackReturnUrl() {
    const params = getParams();
    const fallback = new URL(
      "../../index.html",
      window.location.href
    );

    if (params.verseId) {
      fallback.searchParams.set("v", params.verseId);
    }

    fallback.searchParams.set("screen", "practice");
    applyProfileIdentityToTarget(fallback);

    return fallback.href;
  }


  function buildParentAppUrl({
    screen = "",
    petUnlock = false
  } = {}) {
    const params = getParams();

    let target;

    try {
      const raw = params.returnTo || "";
      target = raw
        ? new URL(raw, window.location.href)
        : new URL("../../index.html", window.location.href);
    } catch (err) {
      target = new URL("../../index.html", window.location.href);
    }

    target.searchParams.delete("screen");
    target.searchParams.delete("petUnlock");

    if (params.verseId) {
      target.searchParams.set("v", params.verseId);
    }

    if (screen) {
      target.searchParams.set("screen", screen);
    }

    if (petUnlock && params.verseId) {
      target.searchParams.set("petUnlock", params.verseId);
    }

    applyProfileIdentityToTarget(target);

    return target;
  }


  function clearExternalPetUnlockPending(verseId){
    if (!verseId) return;

    const loaded = loadProgress();
    if (!loaded.ok || !loaded.progress) return;

    const progress = loaded.progress;
    const verseProgress = progress.verses?.[verseId];

    if (!verseProgress) return;

    if (verseProgress.externalPetUnlockPending){
      delete verseProgress.externalPetUnlockPending;
      saveProgress(progress);
    }
  }

  function returnToTitle(){
    const target = buildParentAppUrl({
      screen: "title"
    });

    window.location.href = target.href;
  }

  function openZooTodo() {
    // While Zoo To-Do is still hidden behind the Coming Soon page,
    // return testers directly to the real clipboard prototype.
    const target = buildParentAppUrl({
      screen: "todo_dev"
    });

    window.location.href = target.href;
  }

  function openPetUnlock(){
    const params = getParams();

    if (params.verseId){
      clearExternalPetUnlockPending(params.verseId);
    }

    const target = buildParentAppUrl({
      petUnlock: true
    });

    window.location.href = target.href;
  }

  function clearGameMixState(){
    try {
      sessionStorage.removeItem("verseMemoryGameMix");
    } catch (err) {
      console.warn("Could not clear Game Mix state from bridge", err);
    }
  }

  function continueGameMix(gameId = ""){
    const params = getParams();

    const target = buildParentAppUrl({
      screen: "practice"
    });

    target.searchParams.set("mixNext", "1");

    const safeGameId = String(gameId || "").trim();
    if (safeGameId){
      target.searchParams.set("completedGameId", safeGameId);
    }

    window.location.href = target.href;
  }

  function endGameMix(){
    clearGameMixState();
    returnToTitle();
  }

  function openPetUnlockFromMix(gameId = ""){
    const params = getParams();

    if (params.verseId){
      clearExternalPetUnlockPending(params.verseId);
    }

    const target = buildParentAppUrl({
      petUnlock: true
    });

    target.searchParams.set("mixPetUnlock", "1");

    const safeGameId = String(gameId || "").trim();
    if (safeGameId){
      target.searchParams.set("completedGameId", safeGameId);
    }

    window.location.href = target.href;
  }

function exitGame(){
  const params = getParams();

  try {
    const raw = params.returnTo || "";
    const target = raw
      ? new URL(raw, window.location.href)
      : new URL("../../index.html", window.location.href);

    applyProfileIdentityToTarget(target);

    const loaded = loadProgress();
    const progress = loaded.ok && loaded.progress ? loaded.progress : null;
    const verseProgress = progress?.verses?.[params.verseId];

    if (params.verseId && verseProgress?.externalPetUnlockPending && progress){
      target.searchParams.set("petUnlock", params.verseId);
      delete verseProgress.externalPetUnlockPending;
      saveProgress(progress);
    }

    window.location.href = target.href;
  } catch (err) {
    console.warn("Could not resolve return target", err);
    window.location.href = buildFallbackReturnUrl();
  }
}

  window.VerseGameBridge = {
    getLaunchParams: getParams,
    getVerseContext,
    wasAlreadyCompleted,
    getGameCompletionStatus,
    markCompleted,
    markVersePracticed,
    completeGameRun,
    returnToTitle,
    openZooTodo,
    openPetUnlock,
    openPetUnlockFromMix,
    continueGameMix,
    endGameMix,
    exitGame
  };
})();
