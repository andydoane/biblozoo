(function (root, factory) {
  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.BibloZooReadMyVerse = api;
  }
})(typeof window !== "undefined" ? window : null, function (root) {
  "use strict";

  const ASSET_BASE =
    "./verse_images/read_my_verse/";
  const AUDIO_BASE = "./verse_audio/";
  const TYPEWRITER_ACTIVITY_ID =
    "typewriter";
  const CHUNK_PAUSE_MS = 480;
  const READ_ACTIVITY_MANIFEST =
    Object.freeze({
      typewriter: Object.freeze({
        id: TYPEWRITER_ACTIVITY_ID,
        title: "Typewriter",
        enabled: true,
        backgrounds: Object.freeze({
          phone:
            `${ASSET_BASE}paper_phone.png`,
          ipad:
            `${ASSET_BASE}paper_ipad.png`
        }),
        keySounds: Object.freeze([
          `${ASSET_BASE}typewriter_1.mp3`,
          `${ASSET_BASE}typewriter_2.mp3`,
          `${ASSET_BASE}typewriter_3.mp3`
        ]),
        font:
          "./verse_fonts/SpecialElite-Regular.ttf"
      })
    });

  let appApi = null;
  let activeAudio = null;
  let keySoundBuffers = [];
  let keySoundBuffersPromise = null;
  let keySoundBufferContext = null;
  let keyFallbackAudio = [];
  const activeKeySources = new Set();
  let audioRequest = 0;
  let pauseTimer = 0;
  let wordFeedbackTimer = 0;
  let lastKeySoundIndex = -1;
  let completionReported = false;

  const state = {
    verseId: "",
    activityId: "",
    context: null,
    chunks: [],
    usesChunkAudio: true,
    chunkIndex: 0,
    revealCount: 0,
    phase: "idle",
    activatedCharacterIndex: -1
  };

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isTypeableCharacter(character) {
    return /[\p{L}\p{N}]/u.test(
      String(character || "")
    );
  }

  function getNextRevealCount(
    text,
    revealCount = 0
  ) {
    const characters = Array.from(
      String(text || "")
    );
    let index = Math.max(
      0,
      Math.min(
        characters.length,
        Number(revealCount) || 0
      )
    );

    while (
      index < characters.length &&
      !isTypeableCharacter(
        characters[index]
      )
    ) {
      index += 1;
    }

    if (index >= characters.length) {
      return characters.length;
    }

    index += 1;

    while (
      index < characters.length &&
      !isTypeableCharacter(
        characters[index]
      )
    ) {
      index += 1;
    }

    return index;
  }

  function getInitialRevealCount(text) {
    const characters = Array.from(
      String(text || "")
    );
    let index = 0;

    while (
      index < characters.length &&
      !isTypeableCharacter(
        characters[index]
      )
    ) {
      index += 1;
    }

    return index;
  }

  function buildDisplayChunks(
    verseText,
    echoParts
  ) {
    const text = String(verseText || "");
    const parts = Array.isArray(echoParts)
      ? echoParts
          .map((part) =>
            String(part || "").trim()
          )
          .filter(Boolean)
          .slice(0, 8)
      : [];

    if (!parts.length) {
      return text ? [text] : [];
    }

    const lowerText = text.toLocaleLowerCase();
    const starts = [];
    let cursor = 0;

    for (const part of parts) {
      const start = lowerText.indexOf(
        part.toLocaleLowerCase(),
        cursor
      );

      if (start < 0) {
        return parts;
      }

      starts.push(start);
      cursor = start + part.length;
    }

    return starts.map((start, index) => {
      const from = index === 0 ? 0 : start;
      const to = index + 1 < starts.length
        ? starts[index + 1]
        : text.length;

      return text.slice(from, to);
    });
  }

  function getChunkAudioPath(
    verseId,
    chunkIndex,
    chunkCount,
    usesChunkAudio = true
  ) {
    const safeVerseId = cleanString(verseId);
    const safeIndex = Math.max(
      0,
      Math.floor(Number(chunkIndex) || 0)
    );
    const safeCount = Math.max(
      1,
      Math.floor(Number(chunkCount) || 1)
    );

    if (!safeVerseId) return "";

    if (!usesChunkAudio) {
      return `${AUDIO_BASE}${safeVerseId}.mp3`;
    }

    const suffix = String.fromCharCode(
      "a".charCodeAt(0) + safeIndex
    );

    return `${AUDIO_BASE}${safeVerseId}${suffix}.mp3`;
  }

  function getReferenceAudioPath(verseId) {
    const safeVerseId = cleanString(verseId);

    return safeVerseId
      ? `${AUDIO_BASE}${safeVerseId}_ref.mp3`
      : "";
  }

  function validateContext(
    context,
    verseId,
    activityId
  ) {
    if (!context || typeof context !== "object") {
      return null;
    }

    const normalized = {
      source: cleanString(context.source),
      profileId: cleanString(context.profileId),
      planId: cleanString(context.planId),
      planDay: cleanString(context.planDay),
      taskId: cleanString(context.taskId),
      launchToken:
        cleanString(context.launchToken),
      verseId: cleanString(context.verseId),
      readActivityId:
        cleanString(context.readActivityId),
      previewScope:
        cleanString(context.previewScope)
    };

    if (
      normalized.source !== "daily_todo" ||
      !normalized.profileId ||
      !normalized.planId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        normalized.planDay
      ) ||
      normalized.taskId !== "review" ||
      !normalized.launchToken ||
      normalized.verseId !==
        cleanString(verseId) ||
      normalized.readActivityId !==
        cleanString(activityId) ||
      normalized.readActivityId !==
        TYPEWRITER_ACTIVITY_ID
    ) {
      return null;
    }

    return normalized;
  }

  function getVerse() {
    return (
      appApi?.getVerseList?.() || []
    ).find(
      (verse) =>
        cleanString(verse?.id) ===
        state.verseId
    ) || null;
  }

  function getSessionContext() {
    return state.context
      ? { ...state.context }
      : null;
  }

  function stopAudio() {
    audioRequest += 1;

    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.removeAttribute?.("src");
        activeAudio.load?.();
      } catch (err) { }
    }

    activeAudio = null;

    keyFallbackAudio.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (err) { }
    });

    activeKeySources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (err) { }
    });
    activeKeySources.clear();
  }

  function clearTimers() {
    clearTimeout(pauseTimer);
    clearTimeout(wordFeedbackTimer);
    pauseTimer = 0;
    wordFeedbackTimer = 0;
  }

  function resetSession() {
    clearTimers();
    stopAudio();
    completionReported = false;
    lastKeySoundIndex = -1;
    state.verseId = "";
    state.activityId = "";
    state.context = null;
    state.chunks = [];
    state.usesChunkAudio = true;
    state.chunkIndex = 0;
    state.revealCount = 0;
    state.phase = "idle";
    state.activatedCharacterIndex = -1;
  }

  function initialize(nextApi) {
    appApi = nextApi || null;
    ensureKeyFallbackAudio();
    preloadKeySoundBuffers();
  }

  function startForVerse(
    verseId,
    activityId,
    context
  ) {
    resetSession();

    const safeVerseId = cleanString(verseId);
    const safeActivityId =
      cleanString(activityId);
    const verse = (
      appApi?.getVerseList?.() || []
    ).find(
      (item) =>
        cleanString(item?.id) ===
        safeVerseId
    );
    const validatedContext =
      validateContext(
        context,
        safeVerseId,
        safeActivityId
      );

    if (
      !verse ||
      !READ_ACTIVITY_MANIFEST[
        safeActivityId
      ]?.enabled ||
      !validatedContext
    ) {
      return false;
    }

    const chunks = buildDisplayChunks(
      verse.verseText,
      verse.echoParts
    );

    if (
      !chunks.length ||
      chunks.length > 8
    ) {
      return false;
    }

    state.verseId = safeVerseId;
    state.activityId = safeActivityId;
    state.context = validatedContext;
    state.chunks = chunks;
    state.usesChunkAudio =
      Array.isArray(verse.echoParts) &&
      verse.echoParts.length > 0;
    state.chunkIndex = 0;
    state.revealCount =
      getInitialRevealCount(chunks[0]);
    state.phase = "typing";

    ensureKeyFallbackAudio();
    preloadKeySoundBuffers();

    return true;
  }

  function chooseKeySoundIndex(
    length,
    random = Math.random
  ) {
    if (length <= 1) return 0;

    const choices = Array.from(
      { length },
      (_, index) => index
    ).filter(
      (index) =>
        index !== lastKeySoundIndex
    );
    const selected = choices[
      Math.floor(random() * choices.length)
    ] ?? 0;

    lastKeySoundIndex = selected;
    return selected;
  }

  function ensureKeyFallbackAudio() {
    if (
      keyFallbackAudio.length ||
      !root?.Audio
    ) {
      return keyFallbackAudio;
    }

    keyFallbackAudio =
      READ_ACTIVITY_MANIFEST.typewriter
        .keySounds.map((src) => {
          const audio = new root.Audio(src);
          audio.preload = "auto";
          audio.setAttribute("playsinline", "");
          audio.setAttribute(
            "webkit-playsinline",
            ""
          );

          try {
            audio.load();
          } catch (err) { }

          return audio;
        });

    return keyFallbackAudio;
  }

  function decodeAudioDataCompat(
    context,
    arrayBuffer
  ) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback) =>
        (value) => {
          if (settled) return;
          settled = true;
          callback(value);
        };
      const succeed = finish(resolve);
      const fail = finish(reject);

      try {
        const result = context.decodeAudioData(
          arrayBuffer,
          succeed,
          fail
        );

        result?.then?.(succeed).catch?.(fail);
      } catch (err) {
        fail(err);
      }
    });
  }

  function preloadKeySoundBuffers() {
    const context =
      appApi?.getAudioContext?.();

    if (!context || !root?.fetch) {
      return Promise.resolve([]);
    }

    if (
      keySoundBufferContext === context &&
      keySoundBuffers.length
    ) {
      return Promise.resolve(
        keySoundBuffers
      );
    }

    if (
      keySoundBufferContext === context &&
      keySoundBuffersPromise
    ) {
      return keySoundBuffersPromise;
    }

    keySoundBufferContext = context;
    keySoundBuffers = [];
    const sounds =
      READ_ACTIVITY_MANIFEST.typewriter
        .keySounds;

    keySoundBuffersPromise = Promise.all(
      sounds.map(async (src) => {
        try {
          const response = await root.fetch(
            src,
            { cache: "force-cache" }
          );
          const capacitorResponse =
            appApi?.isNativePlatform?.() &&
            response.status === 0;

          if (
            !response.ok &&
            !capacitorResponse
          ) {
            throw new Error(
              `HTTP ${response.status}`
            );
          }

          const data =
            await response.arrayBuffer();
          return await decodeAudioDataCompat(
            context,
            data
          );
        } catch (err) {
          return null;
        }
      })
    ).then((decoded) => {
      if (keySoundBufferContext !== context) {
        return keySoundBuffers;
      }

      keySoundBuffers = decoded.filter(Boolean);
      return keySoundBuffers;
    }).finally(() => {
      if (keySoundBufferContext === context) {
        keySoundBuffersPromise = null;
      }
    });

    return keySoundBuffersPromise;
  }

  function playBufferedKeySound(context) {
    if (!keySoundBuffers.length) {
      return false;
    }

    const index = chooseKeySoundIndex(
      keySoundBuffers.length
    );

    try {
      const source =
        context.createBufferSource();
      const gain = context.createGain();

      source.buffer = keySoundBuffers[index];
      gain.gain.value = 0.72;
      source.connect(gain);
      gain.connect(context.destination);
      activeKeySources.add(source);
      source.onended = () => {
        activeKeySources.delete(source);

        try {
          source.disconnect();
          gain.disconnect();
        } catch (err) { }
      };
      source.start(0);
      return true;
    } catch (err) {
      return false;
    }
  }

  function playFallbackKeySound() {
    const sounds = ensureKeyFallbackAudio();

    if (!sounds.length) return;

    const index = chooseKeySoundIndex(
      sounds.length
    );
    const audio = sounds[index];

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch?.(() => { });
    } catch (err) { }
  }

  function playKeySound() {
    if (appApi?.isMuted?.()) return;

    appApi?.primeAudioFromGesture?.();

    const context =
      appApi?.getAudioContext?.();

    if (context) {
      if (
        context.state === "suspended" &&
        typeof context.resume === "function"
      ) {
        context.resume().catch?.(() => { });
      }

      if (playBufferedKeySound(context)) {
        return;
      }

      preloadKeySoundBuffers();
    }

    playFallbackKeySound();
  }

  function isWordCompleted(
    text,
    typedIndex,
    nextRevealCount
  ) {
    const characters = Array.from(text);
    const current = characters[typedIndex] || "";
    const between = characters
      .slice(typedIndex + 1, nextRevealCount)
      .join("");

    return isTypeableCharacter(current) &&
      (
        nextRevealCount >=
          characters.length ||
        /[^\p{L}\p{N}'’]/u.test(
          between
        )
      );
  }

  function wordActivated(
    text,
    characterIndex
  ) {
    state.activatedCharacterIndex =
      characterIndex;
    appApi?.onWordActivated?.({
      verseId: state.verseId,
      activityId: state.activityId,
      chunkIndex: state.chunkIndex,
      characterIndex
    });

    clearTimeout(wordFeedbackTimer);
    wordFeedbackTimer = setTimeout(() => {
      state.activatedCharacterIndex = -1;
      root?.document
        ?.querySelectorAll?.(
          ".read-typewriter-char.is-word-feedback"
        )
        ?.forEach?.((element) =>
          element.classList.remove(
            "is-word-feedback"
          )
        );
    }, 340);
  }

  function updateTypedCharacters(
    oldCount,
    newCount
  ) {
    const screen = root?.document
      ?.querySelector?.(
        ".read-my-verse-screen"
      );

    if (!screen) return;

    for (
      let index = oldCount;
      index < newCount;
      index += 1
    ) {
      screen.querySelector(
        `[data-read-chunk="${state.chunkIndex}"] [data-read-char-index="${index}"]`
      )?.classList.add("is-revealed");
    }

    const progress = screen.querySelector(
      "[data-read-progress]"
    );

    if (progress) {
      progress.textContent =
        `Chunk ${state.chunkIndex + 1} of ${state.chunks.length}`;
    }
  }

  function reportCompletion() {
    if (completionReported) return;

    completionReported = true;
    state.phase = "complete";

    const handled =
      appApi?.onContextComplete?.({
        context: getSessionContext(),
        verseId: state.verseId,
        readActivityId:
          state.activityId
      });

    if (handled === false) {
      completionReported = false;
      state.phase = "typing";
      appApi?.requestRender?.();
    }
  }

  function advanceAfterChunk() {
    if (
      state.phase !== "playing" &&
      state.phase !== "pause"
    ) {
      return;
    }

    if (
      state.chunkIndex + 1 >=
      state.chunks.length
    ) {
      reportCompletion();
      return;
    }

    state.chunkIndex += 1;
    state.revealCount =
      getInitialRevealCount(
        state.chunks[state.chunkIndex]
      );
    state.phase = "typing";
    state.activatedCharacterIndex = -1;
    appApi?.requestRender?.();
  }

  function playCurrentChunk() {
    if (state.phase !== "pause") return;

    state.phase = "playing";
    appApi?.requestRender?.();

    const request = ++audioRequest;
    const src = getChunkAudioPath(
      state.verseId,
      state.chunkIndex,
      state.chunks.length,
      state.usesChunkAudio
    );

    if (
      !src ||
      typeof Audio === "undefined" ||
      appApi?.isMuted?.()
    ) {
      pauseTimer = setTimeout(
        advanceAfterChunk,
        650
      );
      return;
    }

    try {
      activeAudio?.pause?.();
      activeAudio = new Audio(src);
      activeAudio.preload = "auto";

      const finish = () => {
        if (request !== audioRequest) return;
        activeAudio = null;
        advanceAfterChunk();
      };

      activeAudio.addEventListener(
        "ended",
        finish,
        { once: true }
      );
      activeAudio.addEventListener(
        "error",
        finish,
        { once: true }
      );

      const playPromise =
        activeAudio.play();

      playPromise?.catch?.(() => {
        if (request !== audioRequest) return;
        pauseTimer = setTimeout(
          finish,
          650
        );
      });
    } catch (err) {
      pauseTimer = setTimeout(
        advanceAfterChunk,
        650
      );
    }
  }

  function finishCurrentChunk() {
    if (state.phase !== "typing") return;

    state.phase = "pause";
    appApi?.requestRender?.();
    pauseTimer = setTimeout(
      playCurrentChunk,
      CHUNK_PAUSE_MS
    );
  }

  function handleTypeTap() {
    if (state.phase !== "typing") {
      return false;
    }

    const text =
      state.chunks[state.chunkIndex] || "";
    const oldCount = state.revealCount;
    const nextCount = getNextRevealCount(
      text,
      oldCount
    );

    if (nextCount <= oldCount) {
      finishCurrentChunk();
      return false;
    }

    const characters = Array.from(text);
    let typedIndex = oldCount;

    while (
      typedIndex < nextCount &&
      !isTypeableCharacter(
        characters[typedIndex]
      )
    ) {
      typedIndex += 1;
    }

    state.revealCount = nextCount;
    playKeySound();
    updateTypedCharacters(
      oldCount,
      nextCount
    );

    if (
      isWordCompleted(
        text,
        typedIndex,
        nextCount
      )
    ) {
      wordActivated(text, typedIndex);
      root?.document
        ?.querySelector?.(
          `[data-read-chunk="${state.chunkIndex}"] [data-read-char-index="${typedIndex}"]`
        )
        ?.classList.add(
          "is-word-feedback"
        );
    }

    if (nextCount >= characters.length) {
      finishCurrentChunk();
    }

    return true;
  }

  function characterStyle(index) {
    const rotation =
      ((index * 17) % 7 - 3) * 0.22;
    const offset =
      ((index * 11) % 5 - 2) * 0.24;

    return `--read-char-rotate:${rotation.toFixed(2)}deg;--read-char-y:${offset.toFixed(2)}px;`;
  }

  function characterHtml(
    character,
    index,
    revealed
  ) {
    const isSpace = /\s/u.test(character);
    const classes = [
      "read-typewriter-char",
      revealed ? "is-revealed" : "",
      isSpace ? "is-space" : ""
    ].filter(Boolean).join(" ");

    return `<span class="${classes}" data-read-char-index="${index}" style="${characterStyle(index)}">${escapeHtml(character)}</span>`;
  }

  function chunkCharactersHtml(
    text,
    chunkIndex,
    globalOffset
  ) {
    const characters = Array.from(text);
    let html = "";
    let word = "";

    function flushWord() {
      if (!word) return;
      html += `<span class="read-typewriter-word">${word}</span>`;
      word = "";
    }

    characters.forEach((character, index) => {
      const globalIndex = globalOffset + index;
      const revealed =
        chunkIndex < state.chunkIndex ||
        (
          chunkIndex === state.chunkIndex &&
          index < state.revealCount
        );
      const characterMarkup =
        characterHtml(
          character,
          index,
          revealed
        );

      if (/\s/u.test(character)) {
        flushWord();
        html += characterMarkup;
      } else {
        word += characterMarkup;
      }
    });

    flushWord();
    return html;
  }

  function renderVerseHtml() {
    let globalOffset = 0;

    return state.chunks
      .map((chunk, index) => {
        const html = chunkCharactersHtml(
          chunk,
          index,
          globalOffset
        );
        globalOffset += Array.from(chunk).length;
        const active =
          index === state.chunkIndex;
        const listening =
          active &&
          ["pause", "playing"].includes(
            state.phase
          );

        return `<span class="read-typewriter-chunk${listening ? " is-listening" : ""}" data-read-chunk="${index}">${html}</span>`;
      })
      .join("");
  }

  function exitSession() {
    const context = getSessionContext();
    const completed = completionReported;

    resetSession();

    if (!completed) {
      const handled =
        appApi?.onContextExit?.(context);

      if (handled !== false) return;
    }

    appApi?.goToHome?.();
  }

  function renderScreen(idx) {
    if (!appApi?.makeSlide) return null;

    const verse = getVerse();

    if (!verse || state.phase === "idle") {
      return null;
    }

    const wrap = root.document.createElement(
      "div"
    );
    const isLocked = state.phase !== "typing";

    wrap.className =
      "read-my-verse-screen read-typewriter-screen";
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Typewriter">‹</button>
      <main class="read-typewriter-stage${isLocked ? " is-input-locked" : ""}" data-read-type-area data-no-ui-sound role="button" tabindex="0" aria-label="Tap to type ${escapeHtml(verse.ref || state.verseId)}">
        <div class="read-typewriter-reference">${escapeHtml(verse.ref || state.verseId)}</div>
        <div class="read-typewriter-instruction">${isLocked ? "Listen to this part" : "Tap to type the verse"}</div>
        <section class="learn-stage read-typewriter-paper" aria-label="${escapeHtml(verse.verseText)}">
          <div class="smart-learn-text read-typewriter-fit" data-smart-learn-text data-smart-fit-text="${escapeHtml(verse.verseText)}">
            <div class="smart-learn-body read-typewriter-body" aria-hidden="true">${renderVerseHtml()}</div>
          </div>
        </section>
        <div class="read-typewriter-progress" data-read-progress aria-live="polite">Chunk ${state.chunkIndex + 1} of ${state.chunks.length}</div>
      </main>
    `;

    const stage = wrap.querySelector(
      "[data-read-type-area]"
    );
    const activate = (event) => {
      event?.preventDefault?.();
      handleTypeTap();
    };

    stage.onclick = activate;
    stage.onkeydown = (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        activate(event);
      }
    };
    wrap.querySelector(
      "[data-read-exit]"
    ).onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };

    appApi.scheduleSmartLearnTextFit?.(
      wrap
    );

    return appApi.makeSlide({
      idx,
      bg: "#d8c59f",
      navHidden: true,
      inner: wrap
    });
  }

  return Object.freeze({
    ASSET_BASE,
    AUDIO_BASE,
    TYPEWRITER_ACTIVITY_ID,
    READ_ACTIVITY_MANIFEST,
    initialize,
    startForVerse,
    stopSession: resetSession,
    renderScreen,
    getSessionContext,
    getSessionState: () => ({
      verseId: state.verseId,
      activityId: state.activityId,
      chunkIndex: state.chunkIndex,
      revealCount: state.revealCount,
      phase: state.phase,
      context: getSessionContext()
    }),
    isTypeableCharacter,
    getInitialRevealCount,
    getNextRevealCount,
    buildDisplayChunks,
    getChunkAudioPath,
    getReferenceAudioPath,
    validateContext
  });
});
