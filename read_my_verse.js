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

  const ScrambleSafety = typeof module === "object" && module.exports
    ? require("./safe_word_scramble.js")
    : root?.BibloZooSafeWordScramble;

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
  const CHUNK_SEQUENCE_ACTIVITY_ID =
    "chunk_sequence";
  const CHUNK_PAUSE_MS = 480;
  const CRAWL_MUSIC_SRC = `${ASSET_BASE}verse_crawl_theme.mp3`;
  const CRAWL_FANFARE_SECONDS = 8;
  const CRAWL_UNDERSCORE_VOLUME = 0.22;
  const CRAWL_DUCK_FADE_MS = 1350;
  const CHUNK_SEQUENCE_COLORS =
    Object.freeze([
      Object.freeze({
        id: "red",
        value: "#ff5a51",
        light: "#ff8882",
        dark: "#d83d36",
        deep: "#6f1713"
      }),
      Object.freeze({
        id: "orange",
        value: "#ffa351",
        light: "#ffc087",
        dark: "#db792c",
        deep: "#71350f"
      }),
      Object.freeze({
        id: "yellow",
        value: "#ffc751",
        light: "#ffdc91",
        dark: "#dda52f",
        deep: "#72500e"
      }),
      Object.freeze({
        id: "green",
        value: "#a7cb6f",
        light: "#c9e39f",
        dark: "#7ea447",
        deep: "#385018"
      }),
      Object.freeze({
        id: "blue",
        value: "#40b9c5",
        light: "#79d4dc",
        dark: "#238e99",
        deep: "#0d454b"
      }),
      Object.freeze({
        id: "purple",
        value: "#7f66c6",
        light: "#aa98df",
        dark: "#5c43a3",
        deep: "#291d55"
      }),
      Object.freeze({
        id: "gray",
        value: "#666666",
        light: "#999999",
        dark: "#444444",
        deep: "#181818"
      }),
      Object.freeze({
        id: "light_gray",
        value: "#f2f2f2",
        light: "#ffffff",
        dark: "#c8c8c8",
        deep: "#686868"
      })
    ]);
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
      "sequence_two",
      "sequence_five",
      "sequence_eight",
      "sequence_explore",
      "sequence_ready",
      "sequence_challenge",
      "sequence_easy_wrong",
      "sequence_easy_help",
      "sequence_hard_reset",
      "sequence_hard_help",
      "sequence_help_active",
      "sequence_final",
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
        backgrounds: Object.freeze({
          phone: `${ASSET_BASE}cloud_phone.jpg`,
          ipad: `${ASSET_BASE}cloud_ipad.jpg`
        }),
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
      }),
      chunk_sequence: Object.freeze({
        id: CHUNK_SEQUENCE_ACTIVITY_ID,
        title: "Chunk Audio Matching",
        enabled: true,
        backgrounds: Object.freeze({
          phone:
            `${ASSET_BASE}simon_says_phone.png`,
          ipad:
            `${ASSET_BASE}simon_says_ipad.png`
        }),
        colors: CHUNK_SEQUENCE_COLORS
      })
    });

  let appApi = null;
  let activeAudio = null;
  let keySoundAudio = [];
  let keySoundActivityId = "";
  // Layout is part of the session, not a property of its transient audio phase.
  let typingFitCache = null;
  let activeTypingFitWrap = null;
  let typingResizeBound = false;
  let keySoundContext = null;
  let keySoundBuffers = [];
  let keySoundLoadAttempted = false;
  let keySoundGeneration = 0;
  let keySoundVoices = [];
  let fallbackKeyVoiceIndex = 0;
  const KEY_SOUND_MAX_VOICES = 4;
  const KEY_SOUND_FALLBACK_VOICES = 2;
  let negativeFeedbackAudio = null;
  let audioRequest = 0;
  let pauseTimer = 0;
  let animationTimer = 0;
  let wordFeedbackTimer = 0;
  let lastKeySoundIndex = -1;
  let completionReported = false;
  let crawlSession = null;
  let crawlMusic = null;
  let balloonSession = null;

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

  function isChunkSequenceActivity(
    activityId
  ) {
    return cleanString(activityId) ===
      CHUNK_SEQUENCE_ACTIVITY_ID;
  }

  function getActivePhase(activityId) {
    if (isAnimatedActivity(activityId)) {
      return "animating";
    }

    if (isTypingActivity(activityId)) {
      return "typing";
    }

    if (isChunkSequenceActivity(activityId)) {
      return "sequence_mode";
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

    const isAcceptable = (candidate) =>
      candidate.join("") !== original.join("") &&
      ScrambleSafety?.isSafeWord(candidate.join("")) === true;

    let scrambled = original;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = shuffleArray(
        original,
        random
      );

      if (isAcceptable(candidate)) {
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

        if (isAcceptable(candidate)) {
          scrambled = candidate;
          break;
        }
      }
    }

    if (!isAcceptable(scrambled)) {
      return null;
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

    if (
      safeActivityId ===
      CHUNK_SEQUENCE_ACTIVITY_ID
    ) {
      return String(chunk || "").trim()
        .length > 0;
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

    if (
      activityId ===
      CHUNK_SEQUENCE_ACTIVITY_ID
    ) {
      const forcedCounts = {
        sequence_two: 2,
        sequence_five: 5,
        sequence_eight: 8
      };
      const forcedCount =
        forcedCounts[readTestMode] || 0;

      if (
        chunks.length < 2 ||
        (forcedCount &&
          chunks.length < forcedCount)
      ) {
        return null;
      }

      const selectedChunks = forcedCount
        ? chunks.slice(0, forcedCount)
        : chunks;

      return {
        chunks: selectedChunks,
        audioIndices: selectedChunks.map(
          (_, index) => index
        ),
        usesChunkAudio:
          Array.isArray(verse?.echoParts) &&
          verse.echoParts.length > 0
      };
    }

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

    if (
      readTestMode.startsWith?.(
        "sequence_"
      ) &&
      activityId !==
        CHUNK_SEQUENCE_ACTIVITY_ID
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

  function chooseChunkSequenceColors(
    chunkCount,
    random = Math.random
  ) {
    const count = Math.max(
      0,
      Math.min(
        CHUNK_SEQUENCE_COLORS.length,
        Math.floor(Number(chunkCount) || 0)
      )
    );
    const pool = count === 8
      ? CHUNK_SEQUENCE_COLORS
      : CHUNK_SEQUENCE_COLORS.filter(
          (color) => color.id !== "gray"
        );

    return shuffleArray(pool, random)
      .slice(0, count)
      .map((color) => ({ ...color }));
  }

  function createChunkSequenceData(
    chunkCount,
    readTestMode = "normal",
    random = Math.random
  ) {
    const count = Math.max(
      2,
      Math.min(8, Number(chunkCount) || 2)
    );
    const data = {
      mode: "",
      phase: "mode",
      colors:
        chooseChunkSequenceColors(
          count,
          random
        ),
      buttonOrder: shuffleArray(
        Array.from(
          { length: count },
          (_, index) => index
        ),
        random
      ),
      explored: Array(count).fill(false),
      activeButtonIndex: -1,
      challengeIndex: 0,
      wrongAt: -1,
      easyMisses: 0,
      hardResets: 0,
      helpAvailable: false,
      helpActive: false,
      message: "Choose how you want to play."
    };

    if (!readTestMode.startsWith("sequence_")) {
      return data;
    }

    data.mode = readTestMode.includes("hard") ||
      readTestMode === "sequence_help_active"
        ? "hard"
        : "easy";
    data.phase = "explore";
    data.message = "Listen to each button.";

    if (readTestMode === "sequence_explore") {
      data.explored[0] = true;
    }

    if (
      [
        "sequence_ready",
        "sequence_challenge",
        "sequence_easy_wrong",
        "sequence_easy_help",
        "sequence_hard_reset",
        "sequence_hard_help",
        "sequence_help_active",
        "sequence_final"
      ].includes(readTestMode)
    ) {
      data.explored.fill(true);
      data.phase =
        readTestMode === "sequence_ready"
          ? "ready"
          : "challenge";
      data.message =
        data.phase === "ready"
          ? "You heard every button."
          : "Tap them in order.";
    }

    if (
      [
        "sequence_challenge",
        "sequence_easy_wrong",
        "sequence_final"
      ].includes(readTestMode)
    ) {
      data.challengeIndex =
        readTestMode === "sequence_final"
          ? count - 1
          : Math.min(2, count - 1);
    }

    if (
      readTestMode ===
      "sequence_easy_wrong"
    ) {
      data.wrongAt = data.challengeIndex;
      data.message = "Try that one again!";
    }

    if (
      readTestMode ===
      "sequence_easy_help"
    ) {
      data.easyMisses = 3;
      data.helpAvailable = true;
    }

    if (
      readTestMode ===
      "sequence_hard_reset"
    ) {
      data.hardResets = 1;
      data.wrongAt = 0;
      data.message = "Oops! Start over!";
    }

    if (
      [
        "sequence_hard_help",
        "sequence_help_active"
      ].includes(readTestMode)
    ) {
      data.hardResets = 3;
      data.helpAvailable = true;
    }

    if (
      readTestMode ===
      "sequence_help_active"
    ) {
      data.helpActive = true;
      data.message = "Try the glowing button.";
    }

    return data;
  }

  function evaluateChunkSequenceChoice(
    data,
    buttonIndex,
    chunkCount
  ) {
    const expected = Math.max(
      0,
      Number(data?.challengeIndex) || 0
    );
    const count = Math.max(
      2,
      Number(chunkCount) || 2
    );
    const correct =
      Number(buttonIndex) === expected;

    if (correct) {
      const nextIndex = expected + 1;
      return {
        correct: true,
        expected,
        nextIndex,
        complete: nextIndex >= count,
        reset: false,
        easyMisses: 0,
        hardResets:
          Number(data?.hardResets) || 0,
        helpAvailable: false
      };
    }

    const hard = data?.mode === "hard";
    const easyMisses = hard
      ? Number(data?.easyMisses) || 0
      : (Number(data?.easyMisses) || 0) + 1;
    const hardResets = hard
      ? (Number(data?.hardResets) || 0) + 1
      : Number(data?.hardResets) || 0;

    return {
      correct: false,
      expected,
      nextIndex: hard ? 0 : expected,
      complete: false,
      reset: hard,
      easyMisses,
      hardResets,
      helpAvailable: hard
        ? hardResets >= 3
        : easyMisses >= 3
    };
  }

  function markChunkSequenceExplored(
    data,
    buttonIndex
  ) {
    if (
      !Array.isArray(data?.explored) ||
      buttonIndex < 0 ||
      buttonIndex >= data.explored.length
    ) {
      return false;
    }

    data.explored[buttonIndex] = true;
    return data.explored.every(Boolean);
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
      const motion = getBalloonMotion(620, 54, count);
      return Object.freeze({
        wordStaggerMs: motion.staggerMs,
        audioStartMs: motion.audioStartMs
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
    stopCrawlSequence();
    stopCrawlMusic();
    stopBalloonSequence();
    typingFitCache = null;
    activeTypingFitWrap = null;

    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.removeAttribute?.("src");
        activeAudio.load?.();
      } catch (err) { }
    }

    activeAudio = null;

    stopKeySoundVoices();

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

    // Start in the launch gesture so iOS permits music playback.
    if (safeActivityId === VERSE_CRAWL_ACTIVITY_ID) {
      startCrawlMusic();
    }

    if (
      isTypingActivity(safeActivityId)
    ) {
      ensureKeySoundAudio(safeActivityId);
    }

    if (isWordActivity(safeActivityId)) {
      prepareInteractiveChunk();
    }

    if (
      isChunkSequenceActivity(
        safeActivityId
      )
    ) {
      state.activityData =
        createChunkSequenceData(
          chunks.length,
          state.readTestMode
        );
      state.phase =
        `sequence_${state.activityData.phase}`;
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

  // Key clicks may overlap during rapid taps; never rewind all players on a tap.
  function stopKeySoundVoices() {
    keySoundVoices.forEach(({ source, gain }) => {
      try { source.onended = null; source.stop(); } catch (err) { }
      try { source.disconnect(); gain.disconnect(); } catch (err) { }
    });
    keySoundVoices = [];
    keySoundAudio.forEach((audio) => {
      try { audio.pause(); audio.currentTime = 0; } catch (err) { }
    });
  }

  function ensureKeySoundAudio(
    activityId = state.activityId
  ) {
    const safeActivityId =
      isTypingActivity(activityId)
        ? activityId
        : TYPEWRITER_ACTIVITY_ID;
    const sources = READ_ACTIVITY_MANIFEST[safeActivityId].keySounds;

    if (keySoundActivityId !== safeActivityId) {
      stopKeySoundVoices();
      keySoundAudio = [];
      keySoundBuffers = [];
      keySoundLoadAttempted = false;
      keySoundGeneration += 1;
      keySoundActivityId = safeActivityId;
      lastKeySoundIndex = -1;
      fallbackKeyVoiceIndex = 0;
    }

    // Decode ahead of the first tap. iOS may leave the context suspended
    // until a gesture; the tap itself will resume it.
    if (!keySoundLoadAttempted) {
      keySoundLoadAttempted = true;
      const AudioContextClass =
        root?.AudioContext || root?.webkitAudioContext;
      if (AudioContextClass && root?.fetch) {
        try {
          keySoundContext ||= new AudioContextClass();
          const context = keySoundContext;
          const generation = keySoundGeneration;
          Promise.all(sources.map(async (src) => {
            const response = await root.fetch(src);
            if (!response.ok) throw new Error("Key sound unavailable");
            return context.decodeAudioData(await response.arrayBuffer());
          })).then((buffers) => {
            if (generation === keySoundGeneration) {
              keySoundBuffers = buffers;
            }
          }).catch(() => {
            // HTML audio stays ready if decoding is unavailable.
          });
        } catch (err) { }
      }
    }

    if (!keySoundAudio.length && root?.Audio) {
      keySoundAudio = sources.flatMap((src) =>
        Array.from({ length: KEY_SOUND_FALLBACK_VOICES }, () => {
          const audio = new root.Audio(src);
          audio.preload = "auto";
          audio.setAttribute("playsinline", "");
          audio.setAttribute("webkit-playsinline", "");
          try { audio.load(); } catch (err) { }
          return audio;
        })
      );
    }

    return keySoundAudio;
  }

  function playKeySound() {
    if (appApi?.isMuted?.()) return;

    const sounds = ensureKeySoundAudio(state.activityId);
    const variants = READ_ACTIVITY_MANIFEST[state.activityId]?.keySounds;
    if (!variants?.length) return;
    const index = chooseKeySoundIndex(variants.length);
    const context = keySoundContext;
    const buffer = keySoundBuffers[index];

    if (context && buffer) {
      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }
      if (context.state === "running") {
        try {
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = buffer;
          gain.gain.value = 0.58;
          source.connect(gain);
          gain.connect(context.destination);
          if (keySoundVoices.length >= KEY_SOUND_MAX_VOICES) {
            const oldest = keySoundVoices.shift();
            oldest.gain.gain.setTargetAtTime(0, context.currentTime, 0.006);
            oldest.source.stop(context.currentTime + 0.03);
          }
          const voice = { source, gain };
          keySoundVoices.push(voice);
          source.onended = () => {
            keySoundVoices = keySoundVoices.filter((item) => item !== voice);
            source.disconnect();
            gain.disconnect();
          };
          source.start();
          return;
        } catch (err) {
          // Try the compatible HTML audio pool below.
        }
      }
    }

    // Keep two players per sample so quick taps don't cut each other off
    // even before Web Audio has decoded the sounds.
    const slot = fallbackKeyVoiceIndex++ % KEY_SOUND_FALLBACK_VOICES;
    const audio = sounds[index * KEY_SOUND_FALLBACK_VOICES + slot];
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 0.7;
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
      if (
        isChunkSequenceActivity(
          state.activityId
        ) &&
        state.activityData
      ) {
        state.activityData.challengeIndex =
          Math.max(
            0,
            state.chunks.length - 1
          );
        state.activityData.phase =
          "challenge";
        state.activityData.message =
          "Tap the final button again.";
        state.phase =
          "sequence_challenge";
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
    if (!syncTypingScreen()) {
      appApi?.requestRender?.();
    }
  }

  function playCurrentChunk() {
    if (state.phase !== "pause") return;

    stopKeySoundVoices();
    if (negativeFeedbackAudio) {
      try {
        negativeFeedbackAudio.pause();
        negativeFeedbackAudio.currentTime = 0;
      } catch (err) { }
    }

    state.phase = "playing";
    if (!syncTypingScreen()) {
      appApi?.requestRender?.();
    }

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
    if (!syncTypingScreen()) {
      appApi?.requestRender?.();
    }
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

  function setChunkSequencePhase(
    phase
  ) {
    const data = state.activityData;
    if (!data) return;

    data.phase = phase;
    state.phase = `sequence_${phase}`;
  }

  function playChunkSequenceAudio(
    buttonIndex,
    onFinished
  ) {
    const data = state.activityData;

    if (
      !data ||
      data.activeButtonIndex >= 0 ||
      buttonIndex < 0 ||
      buttonIndex >= state.chunks.length
    ) {
      return false;
    }

    data.activeButtonIndex = buttonIndex;
    appApi?.requestRender?.();

    const request = ++audioRequest;
    const src = getChunkAudioPath(
      state.verseId,
      state.chunkAudioIndices[
        buttonIndex
      ] ?? buttonIndex,
      state.chunks.length,
      state.usesChunkAudio
    );
    let finished = false;
    const finish = () => {
      if (
        finished ||
        request !== audioRequest
      ) {
        return;
      }

      finished = true;
      activeAudio = null;
      data.activeButtonIndex = -1;
      onFinished?.();
      appApi?.requestRender?.();
    };

    if (
      !src ||
      !root?.Audio ||
      appApi?.isMuted?.()
    ) {
      pauseTimer = setTimeout(
        finish,
        520
      );
      return true;
    }

    try {
      activeAudio?.pause?.();
      activeAudio = new root.Audio(src);
      activeAudio.preload = "auto";
      activeAudio.setAttribute(
        "playsinline",
        ""
      );
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
      activeAudio.play()
        .catch?.(() => {
          pauseTimer = setTimeout(
            finish,
            520
          );
        });
    } catch (err) {
      pauseTimer = setTimeout(
        finish,
        520
      );
    }

    return true;
  }

  function chooseChunkSequenceMode(mode) {
    const data = state.activityData;
    const safeMode = cleanString(mode);

    if (
      !data ||
      data.phase !== "mode" ||
      !["easy", "hard"].includes(
        safeMode
      )
    ) {
      return false;
    }

    data.mode = safeMode;
    data.message =
      "Listen to each button.";
    setChunkSequencePhase("explore");
    appApi?.requestRender?.();
    return true;
  }

  function handleChunkSequenceExplore(
    buttonIndex
  ) {
    const data = state.activityData;

    if (
      !data ||
      !["explore", "ready"].includes(
        data.phase
      )
    ) {
      return false;
    }

    return playChunkSequenceAudio(
      buttonIndex,
      () => {
        const allExplored =
          markChunkSequenceExplored(
            data,
            buttonIndex
          );
        data.message = allExplored
          ? "You heard every button."
          : "Listen to each button.";
        setChunkSequencePhase(
          allExplored ? "ready" : "explore"
        );
      }
    );
  }

  function beginChunkSequenceChallenge() {
    const data = state.activityData;

    if (
      !data ||
      data.phase !== "ready" ||
      !data.explored.every(Boolean)
    ) {
      return false;
    }

    data.challengeIndex = 0;
    data.wrongAt = -1;
    data.easyMisses = 0;
    data.hardResets = 0;
    data.helpAvailable = false;
    data.helpActive = false;
    data.message = "Tap them in order.";
    setChunkSequencePhase("challenge");
    appApi?.requestRender?.();
    return true;
  }

  function finishChunkSequenceMistake(
    evaluation
  ) {
    const data = state.activityData;
    if (!data) return;

    data.easyMisses =
      evaluation.easyMisses;
    data.hardResets =
      evaluation.hardResets;
    data.helpAvailable =
      evaluation.helpAvailable;

    if (evaluation.reset) {
      data.message = "Oops! Start over!";
    } else {
      data.message = "Try that one again!";
    }

    setChunkSequencePhase("feedback");
    appApi?.requestRender?.();
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      if (evaluation.reset) {
        data.challengeIndex =
          evaluation.nextIndex;
      }
      data.wrongAt = -1;
      data.message = data.helpActive
        ? "Try the glowing button."
        : "Tap them in order.";
      setChunkSequencePhase("challenge");
      appApi?.requestRender?.();
    }, state.reducedMotion ? 250 : 780);
  }

  function handleChunkSequenceChallenge(
    buttonIndex
  ) {
    const data = state.activityData;

    if (
      !data ||
      data.phase !== "challenge" ||
      data.activeButtonIndex >= 0
    ) {
      return false;
    }

    const expected = data.challengeIndex;
    const evaluation =
      evaluateChunkSequenceChoice(
        data,
        buttonIndex,
        state.chunks.length
      );

    if (!evaluation.correct) {
      data.wrongAt = expected;
      return playChunkSequenceAudio(
        buttonIndex,
        () =>
          finishChunkSequenceMistake(
            evaluation
          )
      );
    }

    return playChunkSequenceAudio(
      buttonIndex,
      () => {
        data.challengeIndex =
          evaluation.nextIndex;
        data.wrongAt = -1;
        data.easyMisses = 0;
        data.helpAvailable = false;
        data.helpActive = false;
        data.message = "Tap them in order.";

        if (evaluation.complete) {
          reportCompletion();
        }
      }
    );
  }

  function activateChunkSequenceHelp() {
    const data = state.activityData;

    if (
      !data ||
      !data.helpAvailable ||
      !["challenge", "feedback"].includes(
        data.phase
      )
    ) {
      return false;
    }

    clearTimeout(pauseTimer);
    if (
      data.mode === "hard" &&
      data.phase === "feedback"
    ) {
      data.challengeIndex = 0;
    }
    data.wrongAt = -1;
    data.helpActive = true;
    data.helpAvailable = false;
    data.message = "Try the glowing button.";
    setChunkSequencePhase("challenge");
    appApi?.requestRender?.();
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

  // Music is independent of spoken chunk audio. It starts in the launch tap,
  // before the crawl screen is mounted, to satisfy iOS playback restrictions.
  function startCrawlMusic() {
    if (appApi?.isMuted?.() || !root?.Audio) return;
    try {
      const audio = new root.Audio(CRAWL_MUSIC_SRC);
      audio.preload = "auto";
      audio.loop = false;
      audio.volume = 1;
      audio.setAttribute("playsinline", "");
      audio.setAttribute("webkit-playsinline", "");
      const music = {
        audio, context: null, gain: null,
        failed: false, fadeFrame: 0
      };
      crawlMusic = music;
      audio.addEventListener("error", () => { music.failed = true; });

      // iOS WebKit may ignore HTMLMediaElement.volume. Route the music
      // through a GainNode so the fanfare and spoken verse can be balanced.
      const AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (AudioContextClass) {
        let context = null;
        try {
          context = new AudioContextClass();
          const source = context.createMediaElementSource(audio);
          const gain = context.createGain();
          source.connect(gain);
          gain.connect(context.destination);
          music.context = context;
          music.gain = gain;
          context.resume()?.catch?.(() => { music.failed = true; });
        } catch (err) {
          context?.close?.()?.catch?.(() => {});
        }
      }
      audio.play()?.catch?.(() => { music.failed = true; });
    } catch (err) {
      stopCrawlMusic();
    }
  }

  function stopCrawlMusic() {
    const music = crawlMusic;
    crawlMusic = null;
    if (!music) return;
    if (music.fadeFrame) root?.cancelAnimationFrame?.(music.fadeFrame);
    try {
      music.audio.pause();
      music.audio.removeAttribute?.("src");
      music.audio.load?.();
    } catch (err) { }
    music.context?.close?.()?.catch?.(() => {});
  }

  function fadeCrawlMusic(target, durationMs) {
    const music = crawlMusic;
    if (!music || music.failed || music.audio.ended) return;
    const level = Math.max(0, Math.min(1, target));
    const seconds = Math.max(0.01, durationMs / 1000);
    if (music.gain && music.context) {
      const now = music.context.currentTime;
      const param = music.gain.gain;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(level, now + seconds);
      return;
    }
    // Compatible fallback for browsers where element volume is writable.
    if (music.fadeFrame) root?.cancelAnimationFrame?.(music.fadeFrame);
    const startVolume = music.audio.volume;
    const startedAt = Date.now();
    const tick = () => {
      if (crawlMusic !== music) return;
      const fraction = Math.min(1, (Date.now() - startedAt) / (seconds * 1000));
      music.audio.volume = startVolume + (level - startVolume) * fraction;
      music.fadeFrame = fraction < 1 ? root.requestAnimationFrame(tick) : 0;
    };
    tick();
  }

  function waitForCrawlFanfare(session, start) {
    const music = crawlMusic;
    if (!music || music.failed || appApi?.isMuted?.()) {
      if (music?.failed || appApi?.isMuted?.()) stopCrawlMusic();
      start();
      return;
    }
    let lastProgress = Date.now();
    let lastTime = -1;
    const check = () => {
      if (!session.active || crawlSession !== session) return;
      if (crawlMusic !== music || music.failed || music.audio.ended ||
          appApi?.isMuted?.()) {
        stopCrawlMusic();
        start();
        return;
      }
      const elapsed = music.audio.currentTime || 0;
      if (elapsed >= CRAWL_FANFARE_SECONDS) {
        fadeCrawlMusic(CRAWL_UNDERSCORE_VOLUME, CRAWL_DUCK_FADE_MS);
        start();
        return;
      }
      if (elapsed > lastTime + 0.02) {
        lastTime = elapsed;
        lastProgress = Date.now();
      }
      // A blocked or stalled soundtrack must never strand the activity.
      if (Date.now() - lastProgress > 3500) {
        stopCrawlMusic();
        start();
        return;
      }
      crawlTimer(session, check, 125);
    };
    check();
  }
  // A crawl has one persistent scene: each chunk keeps moving independently
  // of later audio and later chunks. No shared animated-activity rerenders.
  function getCrawlMotion(sceneHeight, chunkHeight, sceneTop, viewportHeight) {
    const height = Math.max(120, Number(sceneHeight) || 120);
    const textHeight = Math.max(1, Number(chunkHeight) || 1);
    const screenHeight = Math.max(height, Number(viewportHeight) || height);
    const top = Math.max(0, Number(sceneTop) || 0);
    const vanishingY = Math.max(0, Math.min(height * 0.7, screenHeight * 0.30 - top));
    const travel = height - vanishingY + textHeight * 0.5;
    const durationMs = Math.max(10500, Math.min(22000, Math.round(travel / 0.06)));
    const visibleMs = Math.min(
      durationMs * 0.78,
      Math.ceil(durationMs * Math.min(0.78, (textHeight + 14) / travel) + 220)
    );
    return { travel, durationMs, visibleMs, vanishingY };
  }

  // Travel speed stays gentle while the final word clears the bottom edge
  // as soon as it is entirely readable, not after it finishes its journey.
  function getBalloonMotion(sceneHeight, wordHeight, wordCount = 1) {
    const height = Math.max(120, Number(sceneHeight) || 120);
    const textHeight = Math.max(1, Number(wordHeight) || 1);
    const count = Math.max(1, Math.floor(Number(wordCount) || 1));
    const travel = height + textHeight + 24;
    const durationMs = Math.max(6000,
      Math.min(10500, Math.round(travel / 0.115)));
    const staggerMs = 450;
    const visibleMs = Math.min(durationMs * 0.75,
      Math.ceil(durationMs * (textHeight + 18) / travel) + 120);
    return {
      travel, durationMs, staggerMs, visibleMs,
      audioStartMs: (count - 1) * staggerMs + visibleMs
    };
  }

  function stopCrawlSequence() {
    const session = crawlSession;
    if (!session) return;
    session.active = false;
    session.timers.forEach((timer) => clearTimeout(timer));
    session.timers.clear();
    session.items.forEach((item) => {
      item.node.style.animation = "none";
      item.node.remove();
    });
    crawlSession = null;
  }

  function crawlTimer(session, callback, delayMs) {
    const timer = setTimeout(() => {
      session.timers.delete(timer);
      if (session.active && crawlSession === session) callback();
    }, delayMs);
    session.timers.add(timer);
    return timer;
  }

  function completeCrawlIfReady(session) {
    const last = session.items.get(state.chunks.length - 1);
    if (
      session.active &&
      crawlSession === session &&
      !completionReported &&
      last?.audioDone &&
      last?.vanished
    ) {
      reportCompletion();
    }
  }

  function markCrawlVanished(session, item) {
    if (!session.active || item.vanished) return;
    item.vanished = true;
    item.node.remove();
    completeCrawlIfReady(session);
  }

  function finishCrawlAudio(session, item) {
    if (!session.active || item.audioDone) return;
    item.audioDone = true;
    if (item.index === state.chunks.length - 1 &&
        (item.pausedForAudio || state.reducedMotion)) {
      fadeCrawlMusic(0, state.reducedMotion ? 450 :
        Math.ceil(item.durationMs * 0.16));
    }
    if (item.pausedForAudio) {
      item.node.style.animationPlayState = "running";
      // In case WebKit omits animationend after resuming a paused animation.
      crawlTimer(session, () => markCrawlVanished(session, item),
        Math.ceil(item.durationMs * 0.16) + 1500);
    }
    if (state.reducedMotion) {
      item.node.classList.add("is-fading");
      crawlTimer(session, () => markCrawlVanished(session, item), 450);
    }
    if (item.index + 1 < state.chunks.length) {
      // Earlier chunks stay in the DOM and continue their own journey.
      crawlTimer(session, () => launchCrawlChunk(session, item.index + 1), 100);
    } else {
      completeCrawlIfReady(session);
    }
  }

  function playCrawlAudio(session, item) {
    if (!session.active || item.audioStarted || item.vanished) return;
    item.audioStarted = true;
    state.phase = "playing";
    const request = ++audioRequest;
    const src = getChunkAudioPath(
      state.verseId,
      state.chunkAudioIndices[item.index] ?? item.index,
      state.chunks.length,
      state.usesChunkAudio
    );
    const finish = () => {
      if (!session.active || request !== audioRequest) return;
      activeAudio = null;
      finishCrawlAudio(session, item);
    };
    if (!src || typeof Audio === "undefined" || appApi?.isMuted?.()) {
      crawlTimer(session, finish, 650);
      return;
    }
    try {
      activeAudio = new Audio(src);
      activeAudio.preload = "auto";
      activeAudio.addEventListener("ended", finish, { once: true });
      activeAudio.addEventListener("error", finish, { once: true });
      activeAudio.play()?.catch?.(() => crawlTimer(session, finish, 650));
    } catch (err) {
      crawlTimer(session, finish, 650);
    }
  }

  function launchCrawlChunk(session, index) {
    if (!session.active || crawlSession !== session || session.items.has(index)) return;
    state.chunkIndex = index;
    state.phase = "animating";
    const node = root.document.createElement("div");
    node.className = "read-crawl-chunk";
    node.textContent = String(state.chunks[index] || "").trim();
    node.dataset.readCrawlChunk = String(index);
    const item = {
      index, node, audioStarted: false, audioDone: false,
      pausedForAudio: false, vanished: false
    };
    session.items.set(index, item);
    session.window.appendChild(node);
    session.progress.textContent = `Part ${index + 1} of ${state.chunks.length}`;

    if (state.reducedMotion) {
      // Reduced Motion: stationary centered text with a gentle fade.
      crawlTimer(session, () => playCrawlAudio(session, item), 520);
      return;
    }

    const rect = session.scene.getBoundingClientRect();
    const motion = getCrawlMotion(
      rect.height,
      node.getBoundingClientRect().height,
      rect.top,
      root.innerHeight
    );
    item.durationMs = motion.durationMs;
    node.style.setProperty("--read-crawl-travel", `-${motion.travel}px`);
    node.style.setProperty("--read-crawl-duration", `${motion.durationMs}ms`);
    node.addEventListener("animationend", (event) => {
      if (event.target === node) markCrawlVanished(session, item);
    }, { once: true });
    // Avoid the text fading away while a longer recording is still playing.
    crawlTimer(session, () => {
      if (!item.audioDone && !item.vanished) {
        item.pausedForAudio = true;
        node.style.animationPlayState = "paused";
      }
    }, Math.round(motion.durationMs * 0.84));
    if (index === state.chunks.length - 1) {
      // Match the music fade to the last 15% of the final crawl fade.
      crawlTimer(session, () => {
        if (item.audioDone && !item.pausedForAudio && !item.vanished) {
          fadeCrawlMusic(0, motion.durationMs * 0.15);
        }
      }, Math.round(motion.durationMs * 0.85));
    }
    crawlTimer(session, () => playCrawlAudio(session, item), motion.visibleMs);
    // Fallback for a missing animationend event (never before audio ends).
    crawlTimer(session, () => {
      if (item.audioDone) markCrawlVanished(session, item);
    }, motion.durationMs + 1500);
  }

  function renderCrawlScreen(idx, verse) {
    if (crawlSession) {
      stopCrawlSequence();
      audioRequest += 1;
      activeAudio?.pause?.();
      activeAudio = null;
    }
    const manifest = READ_ACTIVITY_MANIFEST[VERSE_CRAWL_ACTIVITY_ID];
    const wrap = root.document.createElement("div");
    wrap.className = "read-my-verse-screen read-animated-screen read-crawl-screen" +
      (state.reducedMotion ? " is-reduced-motion" : "");
    const instruction = state.readTestMode === "early_exit"
      ? "Early-exit check: use Back before it finishes"
      : state.reducedMotion
        ? "Listen to the verse"
        : "Watch and listen as the verse rises";
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Verse Crawl">‹</button>
      <main class="read-animated-stage" style="${animatedBackgroundStyle(manifest)}">
        <header class="read-animated-header">
          <div class="read-animated-reference">${escapeHtml(verse.ref || state.verseId)}</div>
          <div class="read-animated-title">Verse Crawl</div>
          <div class="read-animated-instruction" aria-live="polite">${escapeHtml(instruction)}</div>
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(verse.verseText)}">
          <div class="read-crawl-window" data-read-crawl-window></div>
        </section>
        <div class="read-animated-progress" data-read-progress aria-live="polite">Part 1 of ${state.chunks.length}</div>
      </main>
    `;
    wrap.querySelector("[data-read-exit]").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
    const session = {
      active: true, wrap,
      scene: wrap.querySelector(".read-animated-scene"),
      window: wrap.querySelector("[data-read-crawl-window]"),
      progress: wrap.querySelector("[data-read-progress]"),
      items: new Map(), timers: new Set()
    };
    crawlSession = session;
    let started = false;
    const start = () => {
      if (started || !session.active) return;
      started = true;
      root.requestAnimationFrame(() => {
        if (session.active && crawlSession === session && wrap.isConnected) {
          launchCrawlChunk(session, 0);
        }
      });
    };
    // Wait for both font layout and eight seconds of actual music playback.
    // A stalled/blocked soundtrack falls back to the normal silent crawl.
    let waiting = false;
    const ready = () => {
      if (waiting || !session.active) return;
      waiting = true;
      waitForCrawlFanfare(session, start);
    };
    const fontReady = root.document.fonts?.load?.('700 40px "News Cycle Bold"');
    if (fontReady?.then) {
      fontReady.then(ready, ready);
      crawlTimer(session, ready, 2500);
    } else {
      ready();
    }
    return appApi.makeSlide({ idx, bg: "#030815", navHidden: true, inner: wrap });
  }

  // Balloons keeps a single scene so words and decorations survive
  // transitions from floating -> listening -> the following chunk.
  function stopBalloonSequence() {
    const session = balloonSession;
    if (!session) return;
    session.active = false;
    session.timers.forEach((timer) => clearTimeout(timer));
    session.timers.clear();
    balloonSession = null;
  }

  function balloonTimer(session, callback, delayMs) {
    const timer = setTimeout(() => {
      session.timers.delete(timer);
      if (session.active && balloonSession === session) callback();
    }, delayMs);
    session.timers.add(timer);
    return timer;
  }

  function completeBalloonsIfReady(session) {
    const last = session.items.get(state.chunks.length - 1);
    if (session.active && balloonSession === session &&
        !completionReported && last?.audioDone && last?.vanished) {
      reportCompletion();
    }
  }

  function markBalloonWordsVanished(session, item) {
    if (!session.active || item.vanished) return;
    item.vanished = true;
    item.group.remove();
    completeBalloonsIfReady(session);
  }

  function finishBalloonAudio(session, item) {
    if (!session.active || item.audioDone) return;
    item.audioDone = true;
    if (state.reducedMotion) {
      item.group.classList.add("is-fading");
      balloonTimer(session, () => markBalloonWordsVanished(session, item), 450);
    }
    if (item.index + 1 < state.chunks.length) {
      // Old words and balloons continue floating independently.
      balloonTimer(session, () => launchBalloonChunk(session, item.index + 1), 200);
    } else {
      completeBalloonsIfReady(session);
    }
  }

  function playBalloonAudio(session, item) {
    if (!session.active || item.audioStarted) return;
    item.audioStarted = true;
    state.phase = "playing";
    const request = ++audioRequest;
    const src = getChunkAudioPath(
      state.verseId,
      state.chunkAudioIndices[item.index] ?? item.index,
      state.chunks.length,
      state.usesChunkAudio
    );
    const finish = () => {
      if (!session.active || balloonSession !== session ||
          request !== audioRequest) return;
      activeAudio = null;
      finishBalloonAudio(session, item);
    };
    if (!src || typeof Audio === "undefined" || appApi?.isMuted?.()) {
      balloonTimer(session, finish, 250);
      return;
    }
    try {
      activeAudio?.pause?.();
      activeAudio = new Audio(src);
      activeAudio.preload = "auto";
      activeAudio.addEventListener("ended", finish, { once: true });
      activeAudio.addEventListener("error", finish, { once: true });
      activeAudio.play()?.catch?.(() => balloonTimer(session, finish, 650));
    } catch (err) {
      balloonTimer(session, finish, 650);
    }
  }

  // A cloudless, color-matched adaptation of Verse Launch's wrong-tap
  // radial particles. The original balloon is removed in the same tick.
  function popReadBalloon(session, button) {
    if (!session.active || !button.isConnected) return;
    const kind = button.dataset.readBalloonKind === "blue" ? "blue" : "red";
    const colors = kind === "blue"
      ? ["#1776e8", "#53b1ff", "#a8ddff"]
      : ["#e72e4c", "#ff6880", "#ffc2c9"];
    const imageRect = (button.querySelector("img") || button)
      .getBoundingClientRect();
    const sceneRect = session.scene.getBoundingClientRect();
    const burst = root.document.createElement("div");
    burst.className = "read-balloon-particles";
    burst.style.left = `${imageRect.left + imageRect.width / 2 - sceneRect.left}px`;
    burst.style.top = `${imageRect.top + imageRect.height / 2 - sceneRect.top}px`;
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < 9; i += 1) {
      const angle = offset + i * Math.PI * 2 / 9 + (Math.random() - 0.5) * 0.22;
      const distance = 36 + Math.random() * 22;
      const particle = root.document.createElement("span");
      particle.className = "read-balloon-particle";
      particle.style.backgroundColor = colors[i % colors.length];
      particle.style.setProperty("--read-particle-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--read-particle-y", `${Math.sin(angle) * distance}px`);
      particle.style.setProperty("--read-particle-size", `${7 + (i % 4) * 2}px`);
      burst.appendChild(particle);
    }
    session.effects.appendChild(burst);
    button.remove(); // Includes the string: no lingering pop animation.
    balloonTimer(session, () => burst.remove(), 700);
  }

  // Predict occupied rectangles as decorations and word pills cross the scene.
  // A little extra clearance also covers sway, lean and image movement.
  function readBalloonRectAt(track, timeMs) {
    const elapsed = timeMs - track.startMs;
    if (elapsed < 0 || elapsed > track.durationMs) return null;
    const fraction = Math.min(1, elapsed / track.durationMs);
    let x = track.x;
    let y;
    let width = track.width;
    let height = track.height;
    if (track.kind === "word") {
      y = track.sceneHeight - fraction * track.travel;
      x -= width / 2;
      x -= track.sway;
      width += track.sway * 2;
    } else {
      // Match readDecorBalloon's 0%, 35%, 65%, 100% waypoints.
      const points = [[0, 0], [0.35, -0.52], [0.65, -0.97], [1, -1.45]];
      let vhOffset = 0;
      for (let i = 1; i < points.length; i += 1) {
        if (fraction <= points[i][0]) {
          const [p0, y0] = points[i - 1];
          const [p1, y1] = points[i];
          vhOffset = y0 + (y1 - y0) * (fraction - p0) / (p1 - p0);
          break;
        }
      }
      y = track.startY + vhOffset * track.viewportHeight;
      x -= track.sway;
      width += track.sway * 2;
    }
    if (y + height < 0 || y > track.sceneHeight) return null;
    return { left: x, right: x + width, top: y, bottom: y + height };
  }

  function readBalloonPathsOverlap(candidate, other, padding = 12) {
    const start = Math.max(candidate.startMs, other.startMs);
    const end = Math.min(candidate.startMs + candidate.durationMs,
      other.startMs + other.durationMs);
    if (end < start) return false;
    // Sample repeatedly along the future trajectories, not just at spawn.
    for (let time = start; time <= end + 180; time += 180) {
      const a = readBalloonRectAt(candidate, Math.min(time, end));
      const b = readBalloonRectAt(other, Math.min(time, end));
      if (a && b && a.left < b.right + padding &&
          a.right + padding > b.left && a.top < b.bottom + padding &&
          a.bottom + padding > b.top) return true;
    }
    return false;
  }

  function chooseReadBalloonSpawn(track, sceneWidth, words, balloons, random = Math.random) {
    const edge = Math.max(18, Math.min(38, sceneWidth * 0.07));
    const minX = edge + track.sway;
    const maxX = sceneWidth - edge - track.sway - track.width;
    if (maxX < minX) return null;
    // Check left and right lanes first; use center only when genuinely clear.
    const lanes = [0, 1, 0.1, 0.9, 0.22, 0.78, 0.36, 0.64, 0.5];
    if (random() < 0.5) lanes.reverse();
    const active = [...words, ...balloons].filter((item) =>
      item.startMs + item.durationMs >= track.startMs);
    for (const lane of lanes) {
      const x = minX + lane * (maxX - minX);
      const proposal = { ...track, x };
      if (active.every((other) => !readBalloonPathsOverlap(proposal, other))) {
        return proposal;
      }
    }
    return null;
  }

  function launchBalloonChunk(session, index) {
    if (!session.active || balloonSession !== session ||
        session.items.has(index)) return;
    state.chunkIndex = index;
    state.phase = "animating";
    const holder = root.document.createElement("div");
    holder.innerHTML = renderBalloonWordsHtml(state.chunks[index]);
    const group = holder.firstElementChild;
    session.scene.appendChild(group);
    const item = {
      index, group, audioStarted: false, audioDone: false,
      vanished: false
    };
    session.items.set(index, item);
    session.progress.textContent = `Part ${index + 1} of ${state.chunks.length}`;

    if (state.reducedMotion) {
      balloonTimer(session, () => playBalloonAudio(session, item), 520);
      return;
    }

    const words = Array.from(group.querySelectorAll(".read-balloon-word"));
    const sceneRect = session.scene.getBoundingClientRect();
    const height = sceneRect.height;
    const width = sceneRect.width;
    const now = Date.now();
    session.wordTracks = session.wordTracks.filter((track) =>
      track.startMs + track.durationMs > now);
    let lastEntryMs = 0;
    let lastExitMs = 0;
    words.forEach((word, wordIndex) => {
      const box = word.getBoundingClientRect();
      const motion = getBalloonMotion(height, box.height, words.length);
      const delayMs = wordIndex * motion.staggerMs;
      const sway = 14 + (wordIndex % 3) * 3;
      const idealX = width / 2 + (((wordIndex * 37) % 5) - 2) * width * 0.07;
      // Keep wide pills inside the scene for their full sideways swing.
      const half = Math.min(width / 2, box.width / 2 + sway + 16);
      const centerX = Math.max(half, Math.min(width - half, idealX));
      word.style.left = `${centerX}px`;
      word.style.setProperty("--read-balloon-travel", `${motion.travel}px`);
      word.style.setProperty("--read-balloon-duration", `${motion.durationMs}ms`);
      word.style.setProperty("--read-word-delay", `${delayMs}ms`);
      session.wordTracks.push({
        kind: "word", x: centerX, width: box.width, height: box.height,
        sway, sceneHeight: height, travel: motion.travel,
        startMs: now + delayMs, durationMs: motion.durationMs
      });
      lastEntryMs = Math.max(lastEntryMs, delayMs + motion.visibleMs);
      lastExitMs = Math.max(lastExitMs, delayMs + motion.durationMs);
    });
    // Wait for every word to leave before completing the final chunk.
    let remainingWords = words.length;
    words.forEach((word) => {
      word.addEventListener("animationend", (event) => {
        if (event.target !== word || item.vanished) return;
        remainingWords -= 1;
        if (remainingWords === 0) markBalloonWordsVanished(session, item);
      }, { once: true });
    });
    balloonTimer(session, () => markBalloonWordsVanished(session, item),
      lastExitMs + 800);
    balloonTimer(session, () => playBalloonAudio(session, item), lastEntryMs);

    const balloons = createDecorations(BALLOONS_ACTIVITY_ID);
    session.balloonTracks = session.balloonTracks.filter((track) =>
      track.element.isConnected && track.startMs + track.durationMs > now);
    balloons.forEach((decoration) => {
      const wrapper = root.document.createElement("div");
      wrapper.innerHTML = renderBalloonDecorationsHtml(
        READ_ACTIVITY_MANIFEST[BALLOONS_ACTIVITY_ID], [decoration]);
      const button = wrapper.firstElementChild;
      session.decorations.appendChild(button);
      const box = button.getBoundingClientRect();
      const candidate = {
        kind: "balloon", element: button,
        width: box.width,
        // The visible balloon body occupies only the top of its button;
        // the remainder is the string and tap area.
        height: Math.min(box.height, box.width * 1.35),
        sway: 16, sceneHeight: height,
        viewportHeight: root.innerHeight || height,
        startY: height * 1.28 - box.height,
        startMs: Date.now() + decoration.delay * 1000,
        durationMs: 12000
      };
      const placed = chooseReadBalloonSpawn(candidate, width,
        session.wordTracks, session.balloonTracks);
      if (!placed) {
        button.remove(); // Never force a balloon into a crowded scene.
        return;
      }
      button.style.left = `${placed.x}px`;
      session.balloonTracks.push(placed);
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        popReadBalloon(session, button);
      };
      button.addEventListener("animationend", (event) => {
        if (event.target === button) button.remove();
      }, { once: true });
    });
  }

  function renderBalloonScreen(idx, verse) {
    if (balloonSession) {
      stopBalloonSequence();
      audioRequest += 1;
      activeAudio?.pause?.();
      activeAudio = null;
    }
    const manifest = READ_ACTIVITY_MANIFEST[BALLOONS_ACTIVITY_ID];
    const wrap = root.document.createElement("div");
    wrap.className = "read-my-verse-screen read-animated-screen read-balloons-screen" +
      (state.reducedMotion ? " is-reduced-motion" : "");
    const instruction = state.readTestMode === "early_exit"
      ? "Early-exit check: use Back before it finishes"
      : "Watch and listen as the words float";
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Balloons">‹</button>
      <main class="read-animated-stage" style="${animatedBackgroundStyle(manifest)}">
        <header class="read-animated-header">
          <div class="read-animated-reference">${escapeHtml(verse.ref || state.verseId)}</div>
          <div class="read-animated-title">Balloons</div>
          <div class="read-animated-instruction" aria-live="polite">${escapeHtml(instruction)}</div>
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(verse.verseText)}">
          <div class="read-animated-decorations" data-read-balloons></div>
          <div class="read-balloon-effects" data-read-balloon-effects aria-hidden="true"></div>
        </section>
        <div class="read-animated-progress" data-read-progress aria-live="polite">Part 1 of ${state.chunks.length}</div>
      </main>
    `;
    wrap.querySelector("[data-read-exit]").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
    const session = {
      active: true, wrap,
      scene: wrap.querySelector(".read-animated-scene"),
      decorations: wrap.querySelector("[data-read-balloons]"),
      effects: wrap.querySelector("[data-read-balloon-effects]"),
      progress: wrap.querySelector("[data-read-progress]"),
      wordTracks: [], balloonTracks: [],
      items: new Map(), timers: new Set()
    };
    balloonSession = session;
    root.requestAnimationFrame(() => {
      if (session.active && balloonSession === session && wrap.isConnected) {
        launchBalloonChunk(session, 0);
      }
    });
    return appApi.makeSlide({ idx, bg: "#82d7f4", navHidden: true, inner: wrap });
  }

  function renderBalloonWordsHtml(
    chunk,
    timing
  ) {
    if (state.reducedMotion) {
      return `<div class="read-balloon-words is-stationary"><div class="read-balloon-reduced-text">${escapeHtml(chunk)}</div></div>`;
    }
    return `
      <div class="read-balloon-words" aria-label="${escapeHtml(chunk)}">
        ${getChunkWords(chunk).map(
          (word, index) => `
            <span class="read-balloon-word" style="--read-lane-offset:${(((index * 37) % 5) - 2) * 7}vw;--read-sway-amplitude:${14 + (index % 3) * 3}px;--read-sway-phase:-${(index * 277) % 2400}ms;--read-sway-duration:${3100 + (index % 4) * 580}ms"><span class="read-balloon-word-inner">${escapeHtml(word)}</span></span>
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
    manifest,
    decorations = state.decorations
  ) {
    return decorations.map(
      (decoration) => `
        <button class="read-decorative-balloon" type="button" data-read-decoration data-read-balloon-kind="${decoration.kind}" aria-label="Pop decorative balloon" style="--read-decor-left:${decoration.left.toFixed(1)}%;--read-decor-delay:${decoration.delay.toFixed(2)}s">
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
    if (state.activityId === VERSE_CRAWL_ACTIVITY_ID) {
      return renderCrawlScreen(idx, verse);
    }
    if (state.activityId === BALLOONS_ACTIVITY_ID) {
      return renderBalloonScreen(idx, verse);
    }
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

  // Change only the typing display's state; never discard the fitted verse
  // simply because an audio chunk starts, ends, or advances.
  function syncTypingScreen() {
    if (!isTypingActivity(state.activityId)) return false;

    const keyboard = state.activityId === KEYBOARD_ACTIVITY_ID;
    const selector = keyboard
      ? ".read-keyboard-screen"
      : ".read-typewriter-screen";
    const wrap = root.document?.querySelector(selector);
    const stage = wrap?.querySelector("[data-read-type-area]");
    if (!wrap?.isConnected || !stage) return false;

    stage.classList.toggle("is-input-locked", state.phase !== "typing");
    const instruction = wrap.querySelector(keyboard
      ? ".read-keyboard-instruction"
      : ".read-typewriter-instruction");
    if (instruction) {
      instruction.textContent = state.readTestMode === "early_exit"
        ? (keyboard
          ? "EARLY-EXIT CHECK: USE BACK BEFORE FINISHING"
          : "Early-exit check: use Back before finishing")
        : state.phase === "typing"
          ? (keyboard ? "TAP TO TYPE THE VERSE" : "Tap to type the verse")
          : (keyboard ? "PLAYING VERSE AUDIO..." : "Listen to this part");
    }

    const listening = state.phase === "pause" || state.phase === "playing";
    wrap.querySelectorAll("[data-read-chunk]").forEach((chunk, chunkIndex) => {
      chunk.classList.toggle("is-listening", listening && chunkIndex === state.chunkIndex);
      chunk.querySelectorAll("[data-read-char-index]").forEach((character) => {
        const index = Number(character.getAttribute("data-read-char-index"));
        character.classList.toggle("is-revealed",
          chunkIndex < state.chunkIndex ||
          (chunkIndex === state.chunkIndex && index < state.revealCount));
      });
    });

    if (keyboard) {
      const cursor = wrap.querySelector("[data-read-keyboard-cursor]");
      const activeChunk = wrap.querySelector(`[data-read-chunk="${state.chunkIndex}"]`);
      const nextCharacter = activeChunk?.querySelector(
        `[data-read-char-index="${state.revealCount}"]`);
      if (cursor && activeChunk) {
        if (nextCharacter) nextCharacter.before(cursor);
        else activeChunk.append(cursor);
      }
    }

    const progress = wrap.querySelector("[data-read-progress]");
    if (progress) {
      progress.textContent = keyboard
        ? `CHUNK ${state.chunkIndex + 1} / ${state.chunks.length}`
        : `Chunk ${state.chunkIndex + 1} of ${state.chunks.length}`;
    }
    return true;
  }

  function typingFitKey() {
    return `${state.verseId}|${state.activityId}|${state.readTestMode}`;
  }

  function restoreReadTypingFit(wrap) {
    const cache = typingFitCache;
    if (!cache || cache.key !== typingFitKey() ||
        cache.viewportWidth !== root.innerWidth ||
        cache.viewportHeight !== root.innerHeight) return;
    const block = wrap.querySelector("[data-read-typing-fit]");
    if (!block) return;
    block.style.width = `${cache.width}px`;
    block.style.maxWidth = `${cache.width}px`;
    block.style.setProperty("--smart-line-height", cache.lineHeight);
    block.style.setProperty("--smart-font-size", `${cache.fontSize}px`);
    block.classList.add("is-fit-ready");
  }

  // Unlike the Learn fitter, typing screens render each character separately.
  // Measure the real laid-out word spans as well as the whole text body so a
  // large font cannot pass merely because its parent container fits.
  function fitReadTypingVerseText(wrap, force = false) {
    const block = wrap.querySelector("[data-read-typing-fit]");
    const stage = block?.closest(".learn-stage");
    const body = block?.querySelector(".smart-learn-body");
    if (!stage || !body) return;

    const style = root.getComputedStyle(stage);
    const horizontalPadding =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0);
    const verticalPadding =
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0);
    const contentWidth = stage.clientWidth - horizontalPadding;
    const contentHeight = stage.clientHeight - verticalPadding;
    if (contentWidth <= 0 || contentHeight <= 0) return;

    const fitWidth = Math.floor(contentWidth * 0.98);
    const fitHeight = Math.floor(contentHeight * 0.94);
    const lineHeight = block.classList.contains("read-keyboard-fit")
      ? "1.12" : "1.16";
    const cache = typingFitCache;
    if (!force && cache && cache.key === typingFitKey() &&
        cache.contentWidth === contentWidth &&
        cache.contentHeight === contentHeight &&
        cache.viewportWidth === root.innerWidth &&
        cache.viewportHeight === root.innerHeight) {
      restoreReadTypingFit(wrap);
      return;
    }

    const previousSize = block.style.getPropertyValue("--smart-font-size");
    block.style.width = `${fitWidth}px`;
    block.style.maxWidth = `${fitWidth}px`;
    block.style.setProperty("--smart-line-height", lineHeight);

    const words = body.querySelectorAll(".read-typewriter-word");
    const fits = (fontSize) => {
      block.style.setProperty("--smart-font-size", `${fontSize}px`);
      const bounds = body.getBoundingClientRect();
      if (bounds.height > fitHeight + 1 ||
          body.scrollHeight > fitHeight + 1 ||
          body.scrollWidth > fitWidth + 1) return false;
      return Array.from(words).every((word) =>
        word.getBoundingClientRect().width <= fitWidth + 1);
    };

    const low = 10;
    let high = Math.max(low, Math.min(100, contentWidth * 0.2));
    let best = low;
    if (!fits(low)) {
      // A failed 10px trial must never become the displayed font size.
      if (previousSize) block.style.setProperty("--smart-font-size", previousSize);
      else block.style.removeProperty("--smart-font-size");
      block.classList.add("is-fit-ready");
      return;
    }

    let lower = low;
    for (let i = 0; i < 12; i += 1) {
      const mid = (lower + high) / 2;
      if (fits(mid)) {
        best = mid;
        lower = mid;
      } else {
        high = mid;
      }
    }
    const fontSize = Math.floor(best);
    block.style.setProperty("--smart-font-size", `${fontSize}px`);
    typingFitCache = {
      key: typingFitKey(),
      viewportWidth: root.innerWidth,
      viewportHeight: root.innerHeight,
      contentWidth,
      contentHeight,
      width: fitWidth,
      fontSize,
      lineHeight
    };
    block.classList.add("is-fit-ready");
  }

  function scheduleReadTypingVerseFit(wrap) {
    activeTypingFitWrap = wrap;
    const run = (force = false) => {
      if (wrap.isConnected) fitReadTypingVerseText(wrap, force);
    };
    root.requestAnimationFrame(() => run());
    root.setTimeout(() => run(), 120);
    root.setTimeout(() => run(), 420);
    root.document.fonts?.ready?.then(() => run(true)).catch(() => {});

    if (!typingResizeBound && root.addEventListener) {
      typingResizeBound = true;
      root.addEventListener("resize", () => {
        const active = activeTypingFitWrap;
        if (active?.isConnected) {
          root.requestAnimationFrame(() =>
            fitReadTypingVerseText(active, true));
        }
      });
    }
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
          <div class="smart-learn-text read-keyboard-fit" data-read-typing-fit>
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
    restoreReadTypingFit(wrap);
    scheduleReadTypingVerseFit(wrap);

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

  function chunkSequenceColorStyle(color) {
    return [
      `--chunk-button-color:${color?.value || "#40b9c5"}`,
      `--chunk-button-light:${color?.light || "#79d4dc"}`,
      `--chunk-button-dark:${color?.dark || "#238e99"}`,
      `--chunk-button-deep:${color?.deep || "#0d454b"}`
    ].join(";");
  }

  function renderChunkSequenceProgressHtml() {
    const data = state.activityData;
    const inChallenge = [
      "challenge",
      "feedback"
    ].includes(data?.phase);

    return state.chunks.map((_, index) => {
      const color = data?.colors?.[index];
      const complete = inChallenge &&
        index < data.challengeIndex;
      const wrong = inChallenge &&
        index === data.wrongAt;
      const classes = [
        "read-chunk-sequence-progress-dot",
        complete ? "is-complete" : "",
        wrong ? "is-wrong" : ""
      ].filter(Boolean).join(" ");
      const label = wrong
        ? `Part ${index + 1}, try again`
        : complete
          ? `Part ${index + 1}, complete`
          : `Part ${index + 1}, not complete`;

      return `
        <span class="${classes}" style="${complete ? chunkSequenceColorStyle(color) : ""}" aria-label="${label}">
          ${wrong
            ? `<span aria-hidden="true">×</span>`
            : `<span aria-hidden="true">${index + 1}</span>`}
        </span>
      `;
    }).join("");
  }

  function renderChunkSequenceButtonsHtml() {
    const data = state.activityData;
    const interactive = [
      "explore",
      "ready",
      "challenge"
    ].includes(data?.phase);

    return (data?.buttonOrder || [])
      .map((chunkIndex, visualIndex) => {
        const color = data.colors[chunkIndex];
        const active =
          data.activeButtonIndex ===
          chunkIndex;
        const helped =
          data.helpActive &&
          data.challengeIndex ===
            chunkIndex;
        const classes = [
          "read-chunk-arcade-button",
          active ? "is-pushed" : "",
          helped ? "is-helped" : "",
          color?.id === "light_gray"
            ? "is-light-gray"
            : ""
        ].filter(Boolean).join(" ");

        return `
          <button class="${classes}" type="button" data-read-chunk-button="${chunkIndex}" data-no-ui-sound style="${chunkSequenceColorStyle(color)}"${!interactive || data.activeButtonIndex >= 0 ? " disabled" : ""} aria-label="Audio button ${visualIndex + 1}${active ? ", playing" : ""}">
            <span class="read-chunk-arcade-gloss" aria-hidden="true"></span>
          </button>
        `;
      })
      .join("");
  }

  function renderChunkSequenceActionsHtml() {
    const data = state.activityData;

    if (data?.phase === "mode") {
      return `
        <div class="read-chunk-sequence-mode" aria-label="Choose difficulty">
          <h1>Choose a Mode</h1>
          <button type="button" data-read-sequence-mode="easy" data-no-ui-sound>
            <strong>Easy</strong>
            <span>Keep your correct answers after a mistake.</span>
          </button>
          <button type="button" data-read-sequence-mode="hard" data-no-ui-sound>
            <strong>Hard</strong>
            <span>A mistake sends you back to the beginning.</span>
          </button>
        </div>
      `;
    }

    if (data?.phase === "ready") {
      return `
        <button class="read-chunk-sequence-action" type="button" data-read-sequence-ready data-no-ui-sound>I’m Ready</button>
      `;
    }

    if (data?.helpAvailable) {
      return `
        <button class="read-chunk-sequence-action" type="button" data-read-sequence-help data-no-ui-sound>I’d Like Help</button>
      `;
    }

    return "";
  }

  function renderChunkSequenceScreen(
    idx,
    verse
  ) {
    const data = state.activityData;
    const manifest =
      READ_ACTIVITY_MANIFEST[
        CHUNK_SEQUENCE_ACTIVITY_ID
      ];
    const wrap = root.document.createElement(
      "div"
    );
    const count = state.chunks.length;
    const instruction =
      state.readTestMode === "early_exit"
        ? "Early-exit check: use Back before completing"
        : data?.message ||
          "Choose how you want to play.";

    wrap.className = [
      "read-my-verse-screen",
      "read-chunk-sequence-screen",
      `has-${count}-buttons`,
      data?.phase === "mode"
        ? "is-mode-select"
        : "",
      state.reducedMotion
        ? "is-reduced-motion"
        : ""
    ].filter(Boolean).join(" ");
    wrap.innerHTML = `
      <button class="read-my-verse-back read-chunk-sequence-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Chunk Audio Matching">‹</button>
      <main class="read-chunk-sequence-stage" style="${animatedBackgroundStyle(manifest)}">
        <div class="read-chunk-sequence-progress" role="group" aria-label="Sequence progress">
          ${renderChunkSequenceProgressHtml()}
        </div>
        <div class="read-chunk-sequence-instruction" aria-live="polite">${escapeHtml(instruction)}</div>
        <div class="read-chunk-sequence-actions">
          ${renderChunkSequenceActionsHtml()}
        </div>
        <section class="read-chunk-sequence-buttons read-chunk-sequence-layout-${count}" aria-label="Audio buttons">
          ${renderChunkSequenceButtonsHtml()}
        </section>
        <div class="read-chunk-sequence-mode-label">${data?.mode ? `${escapeHtml(data.mode)} mode` : escapeHtml(manifest.title)}</div>
      </main>
    `;

    wrap.querySelectorAll(
      "[data-read-sequence-mode]"
    ).forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        chooseChunkSequenceMode(
          button.dataset.readSequenceMode
        );
      };
    });
    wrap.querySelectorAll(
      "[data-read-chunk-button]"
    ).forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        const chunkIndex = Number(
          button.dataset.readChunkButton
        );

        if (
          ["explore", "ready"].includes(
            data.phase
          )
        ) {
          handleChunkSequenceExplore(
            chunkIndex
          );
        } else {
          handleChunkSequenceChallenge(
            chunkIndex
          );
        }
      };
    });
    const readyButton = wrap.querySelector(
      "[data-read-sequence-ready]"
    );
    if (readyButton) {
      readyButton.onclick = (event) => {
        event.preventDefault();
        beginChunkSequenceChallenge();
      };
    }
    const helpButton = wrap.querySelector(
      "[data-read-sequence-help]"
    );
    if (helpButton) {
      helpButton.onclick = (event) => {
        event.preventDefault();
        activateChunkSequenceHelp();
      };
    }
    bindExitButton(wrap);

    return appApi.makeSlide({
      idx,
      bg: "#202020",
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

    if (
      isChunkSequenceActivity(
        state.activityId
      )
    ) {
      return renderChunkSequenceScreen(
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
          <div class="smart-learn-text read-typewriter-fit" data-read-typing-fit>
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

    restoreReadTypingFit(wrap);
    scheduleReadTypingVerseFit(wrap);

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
    CHUNK_SEQUENCE_ACTIVITY_ID,
    CHUNK_SEQUENCE_COLORS,
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
      context: getSessionContext(),
      activityData: state.activityData
        ? JSON.parse(
            JSON.stringify(
              state.activityData
            )
          )
        : null
    }),
    isTypeableCharacter,
    getInitialRevealCount,
    getNextRevealCount,
    buildDisplayChunks,
    getChunkAudioPath,
    getReferenceAudioPath,
    getAnimatedActivityTiming,
    getCrawlMotion,
    getBalloonMotion,
    readBalloonRectAt,
    readBalloonPathsOverlap,
    chooseReadBalloonSpawn,
    isAnimatedActivity,
    isTypingActivity,
    isWordActivity,
    isChunkSequenceActivity,
    chooseChunkSequenceColors,
    createChunkSequenceData,
    evaluateChunkSequenceChoice,
    markChunkSequenceExplored,
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
