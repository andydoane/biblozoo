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
  const VERSE_CRAWL_ACTIVITY_ID =
    "star_wars";
  const BALLOONS_ACTIVITY_ID =
    "balloons";
  const FISH_ACTIVITY_ID = "fish";
  const CHUNK_PAUSE_MS = 480;
  const READ_TEST_MODES =
    Object.freeze([
      "normal",
      "one_chunk",
      "many_chunk",
      "reduced_motion",
      "early_exit"
    ]);
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
      }),
      star_wars: Object.freeze({
        id: VERSE_CRAWL_ACTIVITY_ID,
        title: "Verse Crawl",
        enabled: true,
        backgrounds: Object.freeze({
          phone:
            `${ASSET_BASE}starfield_phone.png`,
          ipad:
            `${ASSET_BASE}starfield_ipad.png`
        })
      }),
      balloons: Object.freeze({
        id: BALLOONS_ACTIVITY_ID,
        title: "Balloons",
        enabled: true,
        decorations: Object.freeze({
          red:
            `${ASSET_BASE}red_balloon.png`,
          blue:
            `${ASSET_BASE}blue_balloon.png`
        })
      }),
      fish: Object.freeze({
        id: FISH_ACTIVITY_ID,
        title: "Fish",
        enabled: true,
        backgrounds: Object.freeze({
          phone:
            `${ASSET_BASE}underwater_phone.png`,
          ipad:
            `${ASSET_BASE}underwater_ipad.png`
        }),
        decorations: Object.freeze({
          small:
            `${ASSET_BASE}fish_small.png`,
          medium:
            `${ASSET_BASE}fish_medium.png`,
          long:
            `${ASSET_BASE}fish_long.png`,
          hook:
            `${ASSET_BASE}fish_hook.png`
        })
      })
    });

  let appApi = null;
  let activeAudio = null;
  let keySoundAudio = [];
  let audioRequest = 0;
  let pauseTimer = 0;
  let animationTimer = 0;
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
    activatedCharacterIndex: -1,
    readTestMode: "normal",
    reducedMotion: false,
    animationKey: "",
    decorations: []
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

  function isAnimatedActivity(activityId) {
    return [
      VERSE_CRAWL_ACTIVITY_ID,
      BALLOONS_ACTIVITY_ID,
      FISH_ACTIVITY_ID
    ].includes(cleanString(activityId));
  }

  function normalizeReadTestMode(
    mode,
    previewScope
  ) {
    const safeMode = cleanString(mode);

    if (
      previewScope === "read_test" &&
      READ_TEST_MODES.includes(safeMode)
    ) {
      return safeMode;
    }

    return "normal";
  }

  function prefersReducedMotion() {
    if (
      state.readTestMode ===
      "reduced_motion"
    ) {
      return true;
    }

    try {
      return root?.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      )?.matches === true;
    } catch (err) {
      return false;
    }
  }

  function getAnimatedActivityTiming(
    activityId,
    wordCount = 1,
    reducedMotion = false
  ) {
    const count = Math.max(
      1,
      Math.floor(Number(wordCount) || 1)
    );

    if (reducedMotion) {
      return Object.freeze({
        wordStaggerMs: 45,
        audioStartMs: 520
      });
    }

    if (
      activityId ===
      VERSE_CRAWL_ACTIVITY_ID
    ) {
      return Object.freeze({
        wordStaggerMs: 0,
        audioStartMs: 5200
      });
    }

    if (
      activityId ===
      BALLOONS_ACTIVITY_ID
    ) {
      return Object.freeze({
        wordStaggerMs: 620,
        audioStartMs:
          1850 + (count - 1) * 620
      });
    }

    return Object.freeze({
      wordStaggerMs: 560,
      audioStartMs:
        1650 + (count - 1) * 560
    });
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
        cleanString(context.previewScope),
      readTestMode:
        normalizeReadTestMode(
          context.readTestMode,
          cleanString(context.previewScope)
        )
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
      !READ_ACTIVITY_MANIFEST[
        normalized.readActivityId
      ]?.enabled
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

    keySoundAudio.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (err) { }
    });
  }

  function clearTimers() {
    clearTimeout(pauseTimer);
    clearTimeout(animationTimer);
    clearTimeout(wordFeedbackTimer);
    pauseTimer = 0;
    animationTimer = 0;
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
    state.readTestMode = "normal";
    state.reducedMotion = false;
    state.animationKey = "";
    state.decorations = [];
  }

  function initialize(nextApi) {
    appApi = nextApi || null;
    ensureKeySoundAudio();
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

    const oneChunkPreview =
      validatedContext.readTestMode ===
      "one_chunk";
    const chunks = oneChunkPreview
      ? [String(verse.verseText || "")]
      : buildDisplayChunks(
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
      !oneChunkPreview &&
      Array.isArray(verse.echoParts) &&
      verse.echoParts.length > 0;
    state.chunkIndex = 0;
    state.revealCount =
      getInitialRevealCount(chunks[0]);
    state.readTestMode =
      validatedContext.readTestMode;
    state.reducedMotion =
      prefersReducedMotion();
    state.phase = isAnimatedActivity(
      safeActivityId
    )
      ? "animating"
      : "typing";
    state.decorations =
      createDecorations(safeActivityId);

    if (
      safeActivityId ===
      TYPEWRITER_ACTIVITY_ID
    ) {
      ensureKeySoundAudio();
    }

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

  function ensureKeySoundAudio() {
    if (
      keySoundAudio.length ||
      !root?.Audio
    ) {
      return keySoundAudio;
    }

    keySoundAudio =
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

    return keySoundAudio;
  }

  function playKeySound() {
    if (appApi?.isMuted?.()) return;

    const sounds = ensureKeySoundAudio();

    if (!sounds.length) return;

    const index = chooseKeySoundIndex(
      sounds.length
    );
    const audio = sounds[index];

    try {
      sounds.forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      audio.muted = false;
      audio.volume = 1;
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch?.(() => { });
    } catch (err) { }
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
      state.phase = isAnimatedActivity(
        state.activityId
      )
        ? "animating"
        : "typing";
      state.animationKey = "";
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
    state.phase = isAnimatedActivity(
      state.activityId
    )
      ? "animating"
      : "typing";
    state.activatedCharacterIndex = -1;
    state.animationKey = "";
    state.decorations =
      createDecorations(state.activityId);
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

  function beginAnimatedChunkAudio() {
    if (state.phase !== "animating") {
      return;
    }

    state.phase = "pause";
    appApi?.requestRender?.();
    pauseTimer = setTimeout(
      playCurrentChunk,
      state.reducedMotion ? 80 : 180
    );
  }

  function scheduleAnimatedChunk() {
    if (
      state.phase !== "animating" ||
      !isAnimatedActivity(
        state.activityId
      )
    ) {
      return;
    }

    const key = [
      state.activityId,
      state.verseId,
      state.chunkIndex,
      state.context?.launchToken || ""
    ].join(":");

    if (state.animationKey === key) {
      return;
    }

    state.animationKey = key;
    clearTimeout(animationTimer);

    const wordCount = getChunkWords(
      state.chunks[state.chunkIndex]
    ).length;
    const timing =
      getAnimatedActivityTiming(
        state.activityId,
        wordCount,
        state.reducedMotion
      );

    animationTimer = setTimeout(
      beginAnimatedChunkAudio,
      timing.audioStartMs
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

  function getChunkWords(text) {
    return String(text || "")
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
  }

  function createDecorations(activityId) {
    if (
      activityId ===
      BALLOONS_ACTIVITY_ID
    ) {
      const colors = ["red", "blue"];
      return Array.from(
        { length: Math.random() < 0.48 ? 1 : 2 },
        (_, index) => ({
          id: `balloon-${index}`,
          kind:
            colors[
              Math.floor(
                Math.random() *
                colors.length
              )
            ],
          left: 8 + Math.random() * 78,
          delay: 0.3 + Math.random() * 1.8
        })
      );
    }

    if (activityId === FISH_ACTIVITY_ID) {
      const kinds = [
        "small",
        "medium",
        "long"
      ];
      return Array.from(
        { length: Math.random() < 0.52 ? 1 : 2 },
        (_, index) => ({
          id: `fish-${index}`,
          kind:
            kinds[
              Math.floor(
                Math.random() *
                kinds.length
              )
            ],
          top: 25 + Math.random() * 52,
          delay: 0.2 + Math.random() * 2.2
        })
      );
    }

    return [];
  }

  function animatedBackgroundStyle(
    manifest
  ) {
    const phone = cleanString(
      manifest?.backgrounds?.phone
    );
    const ipad = cleanString(
      manifest?.backgrounds?.ipad
    );

    return [
      phone
        ? `--read-bg-phone:url('${phone}')`
        : "",
      ipad
        ? `--read-bg-ipad:url('${ipad}')`
        : ""
    ].filter(Boolean).join(";");
  }

  function renderCrawlChunkHtml(chunk) {
    return `
      <div class="read-crawl-window">
        <div class="read-crawl-chunk">${escapeHtml(chunk)}</div>
      </div>
    `;
  }

  function renderBalloonWordsHtml(
    chunk,
    timing
  ) {
    return `
      <div class="read-balloon-words" aria-label="${escapeHtml(chunk)}">
        ${getChunkWords(chunk).map(
          (word, index) => `
            <span class="read-balloon-word" style="--read-word-index:${index};--read-word-delay:${index * timing.wordStaggerMs}ms;--read-lane-offset:${(((index * 37) % 5) - 2) * 8}vw">${escapeHtml(word)}</span>
          `
        ).join("")}
      </div>
    `;
  }

  function renderFishWordsHtml(
    chunk,
    timing
  ) {
    return `
      <div class="read-fish-words" aria-label="${escapeHtml(chunk)}">
        ${getChunkWords(chunk).map(
          (word, index) => `
            <span class="read-fish-word" style="--read-word-index:${index};--read-word-delay:${index * timing.wordStaggerMs}ms;--read-word-top:${19 + (index % 4) * 17}%">${escapeHtml(word)}</span>
          `
        ).join("")}
      </div>
    `;
  }

  function renderBalloonDecorationsHtml(
    manifest
  ) {
    return state.decorations.map(
      (decoration) => `
        <button class="read-decorative-balloon" type="button" data-read-decoration aria-label="Pop decorative balloon" style="--read-decor-left:${decoration.left.toFixed(1)}%;--read-decor-delay:${decoration.delay.toFixed(2)}s">
          <img src="${escapeHtml(manifest.decorations?.[decoration.kind] || "")}" alt="" draggable="false" onerror="this.hidden=true;this.parentElement.classList.add('is-image-missing')">
          <span class="read-balloon-string" aria-hidden="true"></span>
        </button>
      `
    ).join("");
  }

  function renderFishDecorationsHtml(
    manifest
  ) {
    return state.decorations.map(
      (decoration) => `
        <button class="read-decorative-fish" type="button" data-read-decoration aria-label="Catch decorative fish" style="--read-decor-top:${decoration.top.toFixed(1)}%;--read-decor-delay:${decoration.delay.toFixed(2)}s">
          <span class="read-fish-hook-line" aria-hidden="true"></span>
          <img class="read-fish-hook" src="${escapeHtml(manifest.decorations?.hook || "")}" alt="" draggable="false" onerror="this.hidden=true;this.parentElement.classList.add('is-hook-missing')">
          <span class="read-fish-hook-fallback" aria-hidden="true">J</span>
          <img class="read-fish-image" src="${escapeHtml(manifest.decorations?.[decoration.kind] || "")}" alt="" draggable="false" onerror="this.hidden=true;this.parentElement.classList.add('is-image-missing')">
          <span class="read-fish-fallback" aria-hidden="true"></span>
        </button>
      `
    ).join("");
  }

  function bindDecorativeInteractions(wrap) {
    wrap.querySelectorAll(
      "[data-read-decoration]"
    ).forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          button.classList.contains(
            "is-activated"
          )
        ) {
          return;
        }

        button.classList.add(
          "is-activated"
        );
        button.disabled = true;
      };
    });
  }

  function renderAnimatedScreen(idx, verse) {
    const manifest =
      READ_ACTIVITY_MANIFEST[
        state.activityId
      ];
    const chunk =
      state.chunks[state.chunkIndex] || "";
    const words = getChunkWords(chunk);
    const timing =
      getAnimatedActivityTiming(
        state.activityId,
        words.length,
        state.reducedMotion
      );
    const activityClass =
      state.activityId ===
      VERSE_CRAWL_ACTIVITY_ID
        ? "crawl"
        : state.activityId;
    const isListening = [
      "pause",
      "playing"
    ].includes(state.phase);
    const previewHint =
      state.readTestMode === "early_exit"
        ? "Early-exit check: use Back before it finishes"
        : isListening
          ? "Listen to this part"
          : state.activityId ===
              BALLOONS_ACTIVITY_ID
            ? "Watch the words float"
            : state.activityId ===
                FISH_ACTIVITY_ID
              ? "Watch the words swim"
              : "Watch the verse rise";
    let activityHtml = "";
    let decorationsHtml = "";

    if (
      state.activityId ===
      VERSE_CRAWL_ACTIVITY_ID
    ) {
      activityHtml =
        renderCrawlChunkHtml(chunk);
    } else if (
      state.activityId ===
      BALLOONS_ACTIVITY_ID
    ) {
      activityHtml =
        renderBalloonWordsHtml(
          chunk,
          timing
        );
      decorationsHtml =
        renderBalloonDecorationsHtml(
          manifest
        );
    } else {
      activityHtml = renderFishWordsHtml(
        chunk,
        timing
      );
      decorationsHtml =
        renderFishDecorationsHtml(
          manifest
        );
    }

    const wrap = root.document.createElement(
      "div"
    );
    wrap.className = [
      "read-my-verse-screen",
      "read-animated-screen",
      `read-${activityClass}-screen`,
      state.reducedMotion
        ? "is-reduced-motion"
        : ""
    ].filter(Boolean).join(" ");
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit ${escapeHtml(manifest.title)}">‹</button>
      <main class="read-animated-stage${isListening ? " is-listening" : ""}" style="${animatedBackgroundStyle(manifest)}">
        <header class="read-animated-header">
          <div class="read-animated-reference">${escapeHtml(verse.ref || state.verseId)}</div>
          <div class="read-animated-title">${escapeHtml(manifest.title)}</div>
          <div class="read-animated-instruction" aria-live="polite">${escapeHtml(previewHint)}</div>
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(chunk)}">
          ${activityHtml}
          <div class="read-animated-decorations" aria-hidden="false">${decorationsHtml}</div>
        </section>
        <div class="read-animated-progress" aria-live="polite">Part ${state.chunkIndex + 1} of ${state.chunks.length}</div>
      </main>
    `;

    wrap.querySelector(
      "[data-read-exit]"
    ).onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
    bindDecorativeInteractions(wrap);
    scheduleAnimatedChunk();

    return appApi.makeSlide({
      idx,
      bg:
        state.activityId ===
        VERSE_CRAWL_ACTIVITY_ID
          ? "#030815"
          : state.activityId ===
              FISH_ACTIVITY_ID
            ? "#197ea7"
            : "#82d7f4",
      navHidden: true,
      inner: wrap
    });
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

    if (
      isAnimatedActivity(
        state.activityId
      )
    ) {
      return renderAnimatedScreen(
        idx,
        verse
      );
    }

    const wrap = root.document.createElement(
      "div"
    );
    const isLocked = state.phase !== "typing";
    const typewriterInstruction =
      state.readTestMode === "early_exit"
        ? "Early-exit check: use Back before finishing"
        : isLocked
          ? "Listen to this part"
          : "Tap to type the verse";

    wrap.className = [
      "read-my-verse-screen",
      "read-typewriter-screen",
      state.reducedMotion
        ? "is-reduced-motion"
        : ""
    ].filter(Boolean).join(" ");
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Typewriter">‹</button>
      <main class="read-typewriter-stage${isLocked ? " is-input-locked" : ""}" data-read-type-area data-no-ui-sound role="button" tabindex="0" aria-label="Tap to type ${escapeHtml(verse.ref || state.verseId)}">
        <div class="read-typewriter-reference">${escapeHtml(verse.ref || state.verseId)}</div>
        <div class="read-typewriter-instruction">${typewriterInstruction}</div>
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
    VERSE_CRAWL_ACTIVITY_ID,
    BALLOONS_ACTIVITY_ID,
    FISH_ACTIVITY_ID,
    READ_TEST_MODES,
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
      chunkCount: state.chunks.length,
      usesChunkAudio:
        state.usesChunkAudio,
      readTestMode: state.readTestMode,
      reducedMotion:
        state.reducedMotion,
      context: getSessionContext()
    }),
    isTypeableCharacter,
    getInitialRevealCount,
    getNextRevealCount,
    buildDisplayChunks,
    getChunkAudioPath,
    getReferenceAudioPath,
    getAnimatedActivityTiming,
    isAnimatedActivity,
    validateContext
  });
});
