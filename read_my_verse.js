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
  const KEYBOARD_ACTIVITY_ID =
    "keyboard";
  const UNSCRAMBLE_ACTIVITY_ID =
    "unscramble";
  const TAP_WORDS_ORDER_ACTIVITY_ID =
    "tap_words_order";
  const CHUNK_PAUSE_MS = 480;
  const READ_FEEDBACK_ASSETS =
    Object.freeze({
      negative:
        "./verse_images/daily_questions/dq_incorrect.mp3"
    });
  const READ_TEST_MODES =
    Object.freeze([
      "normal",
      "one_chunk",
      "many_chunk",
      "forced_short",
      "forced_long",
      "forced_hint",
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
      }),
      keyboard: Object.freeze({
        id: KEYBOARD_ACTIVITY_ID,
        title: "Keyboard",
        enabled: true,
        keySounds: Object.freeze([
          `${ASSET_BASE}keyboard_1.mp3`,
          `${ASSET_BASE}keyboard_2.mp3`,
          `${ASSET_BASE}keyboard_3.mp3`,
          `${ASSET_BASE}keyboard_4.mp3`,
          `${ASSET_BASE}keyboard_5.mp3`,
          `${ASSET_BASE}keyboard_6.mp3`,
          `${ASSET_BASE}keyboard_7.mp3`
        ]),
        font:
          "./verse_fonts/VT323-Regular.ttf"
      }),
      unscramble: Object.freeze({
        id: UNSCRAMBLE_ACTIVITY_ID,
        title: "Unscramble",
        enabled: true
      }),
      tap_words_order: Object.freeze({
        id:
          TAP_WORDS_ORDER_ACTIVITY_ID,
        title: "Tap Words in Order",
        enabled: true,
        feedback:
          READ_FEEDBACK_ASSETS
      })
    });

  let appApi = null;
  let activeAudio = null;
  let keySoundAudio = [];
  let keySoundActivityId = "";
  let negativeFeedbackAudio = null;
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
    activatedTokenId: "",
    readTestMode: "normal",
    reducedMotion: false,
    animationKey: "",
    decorations: [],
    chunkAudioIndices: [],
    activityData: null
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

  function isTypingActivity(activityId) {
    return [
      TYPEWRITER_ACTIVITY_ID,
      KEYBOARD_ACTIVITY_ID
    ].includes(cleanString(activityId));
  }

  function isWordActivity(activityId) {
    return [
      UNSCRAMBLE_ACTIVITY_ID,
      TAP_WORDS_ORDER_ACTIVITY_ID
    ].includes(cleanString(activityId));
  }

  function getActivePhase(activityId) {
    if (isAnimatedActivity(activityId)) {
      return "animating";
    }

    if (isTypingActivity(activityId)) {
      return "typing";
    }

    return "interacting";
  }

  function splitWordToken(raw, index = 0) {
    const value = String(raw || "");
    const characters = Array.from(value);
    const meaningfulIndices = characters
      .map((character, characterIndex) =>
        isTypeableCharacter(character)
          ? characterIndex
          : -1
      )
      .filter((characterIndex) =>
        characterIndex >= 0
      );
    const first = meaningfulIndices[0];
    const last = meaningfulIndices[
      meaningfulIndices.length - 1
    ];

    if (
      first === undefined ||
      last === undefined
    ) {
      return {
        id: `word-${index}`,
        raw: value,
        leading: value,
        core: "",
        trailing: "",
        normalized: "",
        meaningfulCount: 0
      };
    }

    const core = characters
      .slice(first, last + 1)
      .join("");
    const normalized = Array.from(core)
      .filter(isTypeableCharacter)
      .join("")
      .toLocaleLowerCase();

    return {
      id: `word-${index}`,
      raw: value,
      leading: characters
        .slice(0, first)
        .join(""),
      core,
      trailing: characters
        .slice(last + 1)
        .join(""),
      normalized,
      meaningfulCount:
        Array.from(normalized).length
    };
  }

  function tokenizeChunkWords(text) {
    return String(text || "")
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .map(splitWordToken)
      .filter((token) => token.normalized);
  }

  function canScrambleCore(
    core,
    minimumLength = 2
  ) {
    const letters = Array.from(
      String(core || "")
    ).filter(isTypeableCharacter);

    return (
      letters.length >= minimumLength &&
      new Set(
        letters.map((letter) =>
          letter.toLocaleLowerCase()
        )
      ).size > 1
    );
  }

  function shuffleArray(
    values,
    random = Math.random
  ) {
    const result = [...values];

    for (
      let index = result.length - 1;
      index > 0;
      index -= 1
    ) {
      const swapIndex = Math.floor(
        Math.max(
          0,
          Math.min(0.999999, random())
        ) * (index + 1)
      );
      [result[index], result[swapIndex]] =
        [result[swapIndex], result[index]];
    }

    return result;
  }

  function scrambleCore(
    core,
    random = Math.random
  ) {
    const characters = Array.from(
      String(core || "")
    );
    const positions = characters
      .map((character, index) =>
        isTypeableCharacter(character)
          ? index
          : -1
      )
      .filter((index) => index >= 0);
    const original = positions.map(
      (index) => characters[index]
    );

    if (!canScrambleCore(core, 2)) {
      return null;
    }

    let scrambled = original;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = shuffleArray(
        original,
        random
      );

      if (
        candidate.join("") !==
        original.join("")
      ) {
        scrambled = candidate;
        break;
      }
    }

    if (
      scrambled.join("") ===
      original.join("")
    ) {
      for (
        let shift = 1;
        shift < original.length;
        shift += 1
      ) {
        const candidate = [
          ...original.slice(shift),
          ...original.slice(0, shift)
        ];

        if (
          candidate.join("") !==
          original.join("")
        ) {
          scrambled = candidate;
          break;
        }
      }
    }

    const result = [...characters];
    positions.forEach((position, index) => {
      result[position] = scrambled[index];
    });

    return result.join("");
  }

  function buildUnscramblePuzzle(
    text,
    random = Math.random
  ) {
    const tokens = tokenizeChunkWords(text);
    const threshold = [4, 3, 2].find(
      (minimumLength) =>
        tokens.some((token) =>
          canScrambleCore(
            token.core,
            minimumLength
          )
        )
    ) || 0;
    let requiredCount = 0;
    const puzzleTokens = tokens.map(
      (token) => {
        const eligible = threshold > 0 &&
          canScrambleCore(
            token.core,
            threshold
          );
        const scrambled = eligible
          ? scrambleCore(token.core, random)
          : null;
        const required = !!scrambled &&
          scrambled !== token.core;

        if (required) requiredCount += 1;

        return {
          ...token,
          scrambled:
            required
              ? scrambled
              : token.core,
          required,
          solved: !required
        };
      }
    );

    return {
      threshold,
      requiredCount,
      tokens: puzzleTokens
    };
  }

  function buildTapOrderPuzzle(
    text,
    random = Math.random,
    { forceHint = false } = {}
  ) {
    const tokens = tokenizeChunkWords(text);
    let displayOrder = shuffleArray(
      tokens.map((token) => token.id),
      random
    );
    const originalOrder = tokens.map(
      (token) => token.id
    );

    if (
      displayOrder.length > 1 &&
      displayOrder.every(
        (id, index) =>
          id === originalOrder[index]
      )
    ) {
      displayOrder = [
        ...displayOrder.slice(1),
        displayOrder[0]
      ];
    }

    const firstExpected = tokens[0]
      ?.normalized || "";
    const hintedTokenId = forceHint
      ? displayOrder.find((id) =>
          tokens.find(
            (token) => token.id === id
          )?.normalized === firstExpected
        ) || ""
      : "";

    return {
      tokens: tokens.map((token) => ({
        ...token,
        solved: false
      })),
      displayOrder,
      nextIndex: 0,
      incorrectStreak: forceHint ? 2 : 0,
      hintedTokenId
    };
  }

  function applyTapOrderChoice(
    data,
    tokenId
  ) {
    const token = data?.tokens?.find(
      (item) => item.id === tokenId
    );
    const expected = data?.tokens?.[
      data.nextIndex
    ];

    if (!token || token.solved || !expected) {
      return {
        valid: false,
        correct: false,
        complete: false
      };
    }

    if (
      token.normalized !==
      expected.normalized
    ) {
      data.incorrectStreak += 1;

      if (data.incorrectStreak >= 2) {
        data.hintedTokenId =
          data.displayOrder.find((id) => {
            const candidate =
              data.tokens.find(
                (item) => item.id === id
              );

            return (
              !candidate?.solved &&
              candidate?.normalized ===
                expected.normalized
            );
          }) || "";
      }

      return {
        valid: true,
        correct: false,
        complete: false,
        token,
        expected
      };
    }

    token.solved = true;
    data.nextIndex += 1;
    data.incorrectStreak = 0;
    data.hintedTokenId = "";

    return {
      valid: true,
      correct: true,
      complete:
        data.nextIndex >=
        data.tokens.length,
      token,
      expected
    };
  }

  function isChunkEligible(
    activityId,
    chunk
  ) {
    const safeActivityId =
      cleanString(activityId);

    if (
      safeActivityId ===
      UNSCRAMBLE_ACTIVITY_ID
    ) {
      return buildUnscramblePuzzle(
        chunk,
        () => 0.37
      ).requiredCount > 0;
    }

    if (
      safeActivityId ===
      TAP_WORDS_ORDER_ACTIVITY_ID
    ) {
      return tokenizeChunkWords(chunk)
        .length >= 2;
    }

    return String(chunk || "").trim()
      .length > 0;
  }

  function selectActivityChunks(
    verse,
    activityId,
    readTestMode = "normal"
  ) {
    if (
      readTestMode === "forced_hint" &&
      activityId !==
        TAP_WORDS_ORDER_ACTIVITY_ID
    ) {
      return null;
    }

    const chunks = buildDisplayChunks(
      verse?.verseText,
      verse?.echoParts
    );

    if (!chunks.length) return null;

    if (readTestMode === "one_chunk") {
      const fullText = String(
        verse?.verseText || ""
      );

      return isChunkEligible(
        activityId,
        fullText
      )
        ? {
            chunks: [fullText],
            audioIndices: [0],
            usesChunkAudio: false
          }
        : null;
    }

    if (
      ["forced_short", "forced_long"]
        .includes(readTestMode)
    ) {
      const candidates = chunks
        .map((chunk, index) => ({
          chunk,
          index,
          length: Array.from(chunk).length
        }))
        .filter((entry) =>
          isChunkEligible(
            activityId,
            entry.chunk
          )
        )
        .sort((left, right) =>
          readTestMode === "forced_short"
            ? left.length - right.length
            : right.length - left.length
        );
      const selected = candidates[0];

      return selected
        ? {
            chunks: [selected.chunk],
            audioIndices: [selected.index],
            usesChunkAudio: true
          }
        : null;
    }

    if (
      !chunks.every((chunk) =>
        isChunkEligible(
          activityId,
          chunk
        )
      )
    ) {
      return null;
    }

    return {
      chunks,
      audioIndices: chunks.map(
        (_, index) => index
      ),
      usesChunkAudio:
        Array.isArray(verse?.echoParts) &&
        verse.echoParts.length > 0
    };
  }

  function isActivityEligibleForVerse(
    activityId,
    verse,
    readTestMode = "normal"
  ) {
    if (
      !READ_ACTIVITY_MANIFEST[
        cleanString(activityId)
      ]?.enabled
    ) {
      return false;
    }

    if (
      readTestMode === "forced_hint" &&
      activityId !==
        TAP_WORDS_ORDER_ACTIVITY_ID
    ) {
      return false;
    }

    return !!selectActivityChunks(
      verse,
      activityId,
      readTestMode
    );
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

    if (negativeFeedbackAudio) {
      try {
        negativeFeedbackAudio.pause();
        negativeFeedbackAudio.currentTime = 0;
      } catch (err) { }
    }
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
    state.activatedTokenId = "";
    state.readTestMode = "normal";
    state.reducedMotion = false;
    state.animationKey = "";
    state.decorations = [];
    state.chunkAudioIndices = [];
    state.activityData = null;
  }

  function initialize(nextApi) {
    appApi = nextApi || null;
    ensureKeySoundAudio(
      TYPEWRITER_ACTIVITY_ID
    );
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

    const selectedChunks =
      selectActivityChunks(
        verse,
        safeActivityId,
        validatedContext.readTestMode
      );
    const chunks = selectedChunks?.chunks || [];

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
      selectedChunks.usesChunkAudio;
    state.chunkAudioIndices =
      selectedChunks.audioIndices;
    state.chunkIndex = 0;
    state.revealCount =
      getInitialRevealCount(chunks[0]);
    state.readTestMode =
      validatedContext.readTestMode;
    state.reducedMotion =
      prefersReducedMotion();
    state.phase = getActivePhase(
      safeActivityId
    );
    state.decorations =
      createDecorations(safeActivityId);

    if (
      isTypingActivity(safeActivityId)
    ) {
      ensureKeySoundAudio(safeActivityId);
    }

    if (isWordActivity(safeActivityId)) {
      prepareInteractiveChunk();
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

  function ensureKeySoundAudio(
    activityId = state.activityId
  ) {
    const safeActivityId =
      isTypingActivity(activityId)
        ? activityId
        : TYPEWRITER_ACTIVITY_ID;

    if (
      keySoundActivityId !==
      safeActivityId
    ) {
      keySoundAudio.forEach((audio) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (err) { }
      });
      keySoundAudio = [];
      keySoundActivityId =
        safeActivityId;
      lastKeySoundIndex = -1;
    }

    if (
      keySoundAudio.length ||
      !root?.Audio
    ) {
      return keySoundAudio;
    }

    keySoundAudio =
      READ_ACTIVITY_MANIFEST[
        safeActivityId
      ]
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

    const sounds = ensureKeySoundAudio(
      state.activityId
    );

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

  function playGeneratedNegativeTone() {
    const AudioContextClass =
      root?.AudioContext ||
      root?.webkitAudioContext;

    if (!AudioContextClass) return;

    try {
      const context = new AudioContextClass();
      const oscillator =
        context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(
        180,
        now
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        105,
        now + 0.12
      );
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.14
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      oscillator.addEventListener(
        "ended",
        () => context.close?.(),
        { once: true }
      );
    } catch (err) { }
  }

  function playNegativeFeedback() {
    if (appApi?.isMuted?.()) return;

    if (!root?.Audio) {
      playGeneratedNegativeTone();
      return;
    }

    if (!negativeFeedbackAudio) {
      negativeFeedbackAudio =
        new root.Audio(
          READ_FEEDBACK_ASSETS.negative
        );
      negativeFeedbackAudio.preload =
        "auto";
      negativeFeedbackAudio.setAttribute(
        "playsinline",
        ""
      );
      try {
        negativeFeedbackAudio.load();
      } catch (err) { }
    }

    try {
      negativeFeedbackAudio.pause();
      negativeFeedbackAudio.currentTime = 0;
      negativeFeedbackAudio.play()
        .catch?.(playGeneratedNegativeTone);
    } catch (err) {
      playGeneratedNegativeTone();
    }
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
    characterIndex,
    extra = {}
  ) {
    state.activatedCharacterIndex =
      characterIndex;
    state.activatedTokenId =
      cleanString(extra.tokenId);
    appApi?.onWordActivated?.({
      verseId: state.verseId,
      activityId: state.activityId,
      chunkIndex: state.chunkIndex,
      characterIndex,
      ...extra
    });

    clearTimeout(wordFeedbackTimer);
    wordFeedbackTimer = setTimeout(() => {
      state.activatedCharacterIndex = -1;
      state.activatedTokenId = "";
      root?.document
        ?.querySelectorAll?.(
          ".is-word-feedback"
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

    if (
      state.activityId ===
      KEYBOARD_ACTIVITY_ID
    ) {
      const chunk = screen.querySelector(
        `[data-read-chunk="${state.chunkIndex}"]`
      );
      const cursor = chunk?.querySelector(
        "[data-read-keyboard-cursor]"
      );
      const nextCharacter = chunk
        ?.querySelector?.(
          `[data-read-char-index="${newCount}"]`
        );

      if (cursor && nextCharacter) {
        nextCharacter.before(cursor);
      } else if (cursor && chunk) {
        chunk.append(cursor);
      }
    }

    const progress = screen.querySelector(
      "[data-read-progress]"
    );

    if (progress) {
      progress.textContent =
        state.activityId ===
          KEYBOARD_ACTIVITY_ID
          ? `CHUNK ${state.chunkIndex + 1} / ${state.chunks.length}`
          : `Chunk ${state.chunkIndex + 1} of ${state.chunks.length}`;
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
      state.phase = getActivePhase(
        state.activityId
      );
      state.animationKey = "";

      if (isWordActivity(state.activityId)) {
        prepareInteractiveChunk();
      }
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
    state.phase = getActivePhase(
      state.activityId
    );
    state.activatedCharacterIndex = -1;
    state.activatedTokenId = "";
    state.animationKey = "";
    state.decorations =
      createDecorations(state.activityId);
    state.activityData = null;

    if (isWordActivity(state.activityId)) {
      prepareInteractiveChunk();
    }
    appApi?.requestRender?.();
  }

  function playCurrentChunk() {
    if (state.phase !== "pause") return;

    keySoundAudio.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (err) { }
    });
    if (negativeFeedbackAudio) {
      try {
        negativeFeedbackAudio.pause();
        negativeFeedbackAudio.currentTime = 0;
      } catch (err) { }
    }

    state.phase = "playing";
    appApi?.requestRender?.();

    const request = ++audioRequest;
    const src = getChunkAudioPath(
      state.verseId,
      state.chunkAudioIndices[
        state.chunkIndex
      ] ?? state.chunkIndex,
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

  function finishInteractiveChunk() {
    if (state.phase !== "interacting") {
      return;
    }

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

  function prepareInteractiveChunk() {
    const chunk =
      state.chunks[state.chunkIndex] || "";

    if (
      state.activityId ===
      UNSCRAMBLE_ACTIVITY_ID
    ) {
      state.activityData =
        buildUnscramblePuzzle(chunk);
      return state.activityData;
    }

    if (
      state.activityId ===
      TAP_WORDS_ORDER_ACTIVITY_ID
    ) {
      state.activityData =
        buildTapOrderPuzzle(
          chunk,
          Math.random,
          {
            forceHint:
              state.readTestMode ===
              "forced_hint"
          }
        );
      return state.activityData;
    }

    state.activityData = null;
    return null;
  }

  function handleUnscrambleTap(tokenId) {
    if (
      state.phase !== "interacting" ||
      state.activityId !==
        UNSCRAMBLE_ACTIVITY_ID
    ) {
      return false;
    }

    const data = state.activityData;
    const tokenIndex = data?.tokens
      ?.findIndex((token) =>
        token.id === tokenId
      );
    const token =
      data?.tokens?.[tokenIndex];

    if (
      !token ||
      !token.required ||
      token.solved
    ) {
      return false;
    }

    token.solved = true;
    wordActivated(
      token.core,
      tokenIndex,
      {
        tokenId: token.id,
        word: token.normalized
      }
    );

    const complete = data.tokens
      .filter((item) => item.required)
      .every((item) => item.solved);

    appApi?.requestRender?.();

    if (complete) {
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(
        finishInteractiveChunk,
        280
      );
    }

    return true;
  }

  function handleTapOrderTap(tokenId) {
    if (
      state.phase !== "interacting" ||
      state.activityId !==
        TAP_WORDS_ORDER_ACTIVITY_ID
    ) {
      return false;
    }

    const data = state.activityData;
    const result = applyTapOrderChoice(
      data,
      tokenId
    );

    if (!result.valid) {
      return false;
    }

    if (!result.correct) {
      playNegativeFeedback();

      appApi?.requestRender?.();
      const wrongTile = root?.document
        ?.querySelector?.(
          `[data-read-order-token="${result.token.id}"]`
        );
      wrongTile?.classList.add("is-wrong");
      setTimeout(() => {
        wrongTile?.classList.remove(
          "is-wrong"
        );
      }, 300);
      return false;
    }

    wordActivated(
      result.token.core,
      data.nextIndex - 1,
      {
        tokenId: result.token.id,
        word: result.token.normalized
      }
    );

    appApi?.requestRender?.();

    if (
      result.complete
    ) {
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(
        finishInteractiveChunk,
        280
      );
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
      state.activityId ===
        KEYBOARD_ACTIVITY_ID
        ? "read-keyboard-char"
        : "read-typewriter-char",
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
    const keyboardActive =
      state.activityId ===
        KEYBOARD_ACTIVITY_ID &&
      chunkIndex === state.chunkIndex;
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
      const cursorMarkup =
        keyboardActive &&
        index === state.revealCount
          ? `<span class="read-keyboard-cursor" data-read-keyboard-cursor aria-hidden="true"></span>`
          : "";

      if (/\s/u.test(character)) {
        flushWord();
        html +=
          cursorMarkup +
          characterMarkup;
      } else {
        word +=
          cursorMarkup +
          characterMarkup;
      }
    });

    flushWord();

    if (
      keyboardActive &&
      state.revealCount >= characters.length
    ) {
      html += `<span class="read-keyboard-cursor" data-read-keyboard-cursor aria-hidden="true"></span>`;
    }

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

        const chunkClass =
          state.activityId ===
          KEYBOARD_ACTIVITY_ID
            ? "read-keyboard-chunk"
            : "read-typewriter-chunk";

        return `<span class="${chunkClass}${listening ? " is-listening" : ""}" data-read-chunk="${index}">${html}</span>`;
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

  function bindExitButton(wrap) {
    wrap.querySelector(
      "[data-read-exit]"
    ).onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
  }

  function renderKeyboardScreen(idx, verse) {
    const wrap = root.document.createElement(
      "div"
    );
    const isLocked = state.phase !== "typing";
    const instruction =
      state.readTestMode === "early_exit"
        ? "EARLY-EXIT CHECK: USE BACK BEFORE FINISHING"
        : isLocked
          ? "PLAYING VERSE AUDIO..."
          : "TAP TO TYPE THE VERSE";

    wrap.className = [
      "read-my-verse-screen",
      "read-keyboard-screen",
      state.reducedMotion
        ? "is-reduced-motion"
        : ""
    ].filter(Boolean).join(" ");
    wrap.innerHTML = `
      <button class="read-my-verse-back read-keyboard-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Keyboard">‹</button>
      <main class="read-keyboard-stage${isLocked ? " is-input-locked" : ""}" data-read-type-area data-no-ui-sound role="button" tabindex="0" aria-label="Tap to type ${escapeHtml(verse.ref || state.verseId)}">
        <div class="read-keyboard-scanlines" aria-hidden="true"></div>
        <header class="read-keyboard-header">
          <div class="read-keyboard-reference">${escapeHtml(verse.ref || state.verseId)}</div>
          <div class="read-keyboard-instruction">${instruction}</div>
        </header>
        <section class="learn-stage read-keyboard-terminal" aria-label="${escapeHtml(verse.verseText)}">
          <div class="smart-learn-text read-keyboard-fit" data-smart-learn-text data-smart-fit-text="${escapeHtml(verse.verseText)}">
            <div class="smart-learn-body read-keyboard-body" aria-hidden="true">${renderVerseHtml()}</div>
          </div>
        </section>
        <div class="read-keyboard-progress" data-read-progress aria-live="polite">CHUNK ${state.chunkIndex + 1} / ${state.chunks.length}</div>
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
    bindExitButton(wrap);
    appApi.scheduleSmartLearnTextFit?.(
      wrap
    );

    return appApi.makeSlide({
      idx,
      bg: "#000000",
      navHidden: true,
      inner: wrap
    });
  }

  function renderUnscrambleTokensHtml() {
    const tokens =
      state.activityData?.tokens || [];

    return tokens.map((token) => {
      const classes = [
        "read-unscramble-token",
        token.required
          ? "is-interactive"
          : "is-static",
        token.solved ? "is-solved" : "",
        state.activatedTokenId === token.id
          ? "is-word-feedback"
          : ""
      ].filter(Boolean).join(" ");
      const core = token.solved
        ? token.core
        : token.scrambled;
      const contents = `
        <span class="read-token-punctuation">${escapeHtml(token.leading)}</span><span class="read-token-core">${escapeHtml(core)}</span><span class="read-token-punctuation">${escapeHtml(token.trailing)}</span>
      `;

      if (!token.required) {
        return `<span class="${classes}" data-read-word>${contents}</span>`;
      }

      return `
        <button class="${classes}" type="button" data-read-word data-read-unscramble-token="${escapeHtml(token.id)}" data-no-ui-sound${token.solved ? " disabled" : ""} aria-label="${token.solved ? "Restored" : "Unscramble"} ${escapeHtml(token.core)}">
          ${contents}
        </button>
      `;
    }).join("");
  }

  function renderTapOrderTilesHtml() {
    const data = state.activityData;
    const tokens = data?.tokens || [];

    return (data?.displayOrder || [])
      .map((tokenId) =>
        tokens.find((token) =>
          token.id === tokenId
        )
      )
      .filter(Boolean)
      .map((token) => {
        const classes = [
          "read-order-tile",
          token.solved ? "is-solved" : "",
          data.hintedTokenId === token.id
            ? "is-hinted"
            : "",
          state.activatedTokenId === token.id
            ? "is-word-feedback"
            : ""
        ].filter(Boolean).join(" ");

        return `
          <button class="${classes}" type="button" data-read-word data-read-order-token="${escapeHtml(token.id)}" data-no-ui-sound${token.solved ? " disabled tabindex=\"-1\" aria-hidden=\"true\"" : ""}>
            ${escapeHtml(token.raw)}
          </button>
        `;
      })
      .join("");
  }

  function renderWordActivityScreen(
    idx,
    verse
  ) {
    const manifest =
      READ_ACTIVITY_MANIFEST[
        state.activityId
      ];
    const isUnscramble =
      state.activityId ===
      UNSCRAMBLE_ACTIVITY_ID;
    const isListening = [
      "pause",
      "playing"
    ].includes(state.phase);
    const instruction =
      state.readTestMode === "early_exit"
        ? "Early-exit check: use Back before finishing"
        : isListening
          ? "Listen to this part"
          : isUnscramble
            ? "Tap each mixed-up word"
            : "Tap the words in verse order";
    const wrap = root.document.createElement(
      "div"
    );

    wrap.className = [
      "read-my-verse-screen",
      "read-word-activity-screen",
      isUnscramble
        ? "read-unscramble-screen"
        : "read-order-screen",
      state.reducedMotion
        ? "is-reduced-motion"
        : ""
    ].filter(Boolean).join(" ");
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit ${escapeHtml(manifest.title)}">‹</button>
      <main class="read-word-activity-stage${isListening ? " is-listening" : ""}">
        <header class="read-word-activity-header">
          <div class="read-word-activity-reference">${escapeHtml(verse.ref || state.verseId)}</div>
          <div class="read-word-activity-title">${escapeHtml(manifest.title)}</div>
          <div class="read-word-activity-instruction" aria-live="polite">${escapeHtml(instruction)}</div>
        </header>
        <section class="${isUnscramble ? "read-unscramble-words" : "read-order-grid"}" aria-label="${escapeHtml(state.chunks[state.chunkIndex] || "")}">
          ${isUnscramble ? renderUnscrambleTokensHtml() : renderTapOrderTilesHtml()}
        </section>
        <div class="read-word-activity-progress" aria-live="polite">Part ${state.chunkIndex + 1} of ${state.chunks.length}</div>
      </main>
    `;

    if (isUnscramble) {
      wrap.querySelectorAll(
        "[data-read-unscramble-token]"
      ).forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          handleUnscrambleTap(
            button.dataset
              .readUnscrambleToken
          );
        };
      });
    } else {
      wrap.querySelectorAll(
        "[data-read-order-token]"
      ).forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          handleTapOrderTap(
            button.dataset.readOrderToken
          );
        };
      });
    }

    bindExitButton(wrap);

    return appApi.makeSlide({
      idx,
      bg: isUnscramble
        ? "#f3b84b"
        : "#5b4fbd",
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

    if (
      state.activityId ===
      KEYBOARD_ACTIVITY_ID
    ) {
      return renderKeyboardScreen(
        idx,
        verse
      );
    }

    if (isWordActivity(state.activityId)) {
      return renderWordActivityScreen(
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
    KEYBOARD_ACTIVITY_ID,
    UNSCRAMBLE_ACTIVITY_ID,
    TAP_WORDS_ORDER_ACTIVITY_ID,
    READ_FEEDBACK_ASSETS,
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
    isTypingActivity,
    isWordActivity,
    splitWordToken,
    tokenizeChunkWords,
    canScrambleCore,
    scrambleCore,
    buildUnscramblePuzzle,
    buildTapOrderPuzzle,
    applyTapOrderChoice,
    isChunkEligible,
    selectActivityChunks,
    isActivityEligibleForVerse,
    validateContext
  });
});
