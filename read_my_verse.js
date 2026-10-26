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
  const TYPEWRITER_INTRO_TEXT = "Tap to type the verse.";
  const TYPEWRITER_INTRO_KEY_MS = 75;
  const TYPEWRITER_INTRO_HOLD_MS = 3000;
  const TYPEWRITER_INTRO_FADE_MS = 300;
  // The quiet underscore and the horn's one-second fade-in are in the MP3s.
  // Verse Crawl uses ordinary HTML audio for PWA, iOS and Android alike.
  const CRAWL_MUSIC_SRC = `${ASSET_BASE}verse_crawl_theme_ducked.mp3`;
  const CRAWL_ENDING_SRC = `${ASSET_BASE}verse_crawl_theme_ending.mp3`;
  const CRAWL_FANFARE_SECONDS = 7;
  const CRAWL_RESUME_SECONDS = 9;
  const CRAWL_ENDING_OVERLAP_MS = 1000;
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
        chunkAlert: `${ASSET_BASE}typewriter_alert.mp3`,
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
        chunkAlert: `${ASSET_BASE}keyboard_alert.mp3`,
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
  let readAudioRecovery = null;
  let readAudioRecoveryAttempt = null;
  let readAudioRecoveryGeneration = 0;
  let readAudioStartPromise = null;
  let readActiveAnimatedNarration = null;
  let readActiveSequenceReplay = null;
  let readDeferredNarrationFinish = null;
  let readEffectRecoveryPending = false;
  let readKeyResumeFailures = 0;
  let readToneResumeFailures = 0;
  let readToneClockProbe = null;
  let balloonNarrationWatchdog = null;
  let chunkNarrationWatchdog = null;
  let pauseTimer = 0;
  let readPauseTimerTask = null;
  let animationTimer = 0;
  let wordFeedbackTimer = 0;
  let typewriterIntroTimer = 0;
  let typewriterIntroWrap = null;
  let chunkGlowFadeTimer = 0;
  let lastKeySoundIndex = -1;
  let completionReported = false;
  let crawlSession = null;
  let crawlMusic = null;
  let crawlEnding = null;
  // Patch 20F was temporary. Discard any saved diagnostic report now that
  // the production HTML-media soundtrack has replaced the experiment.
  try { root?.localStorage?.removeItem?.("biblozooPatch20FAudioLog"); }
  catch (err) { /* Private browsing may block storage; playback is unaffected. */ }
  let balloonSession = null;
  let fishSession = null;
  let scrambleAudioContext = null;
  const scrambleSoundVoices = new Set();
  const scrambleParticleBursts = new Set();

  const state = {
    verseId: "",
    activityId: "",
    context: null,
    chunks: [],
    usesChunkAudio: true,
    chunkIndex: 0,
    revealCount: 0,
    typewriterIntroPhase: "done",
    typewriterIntroCount: 0,
    typewriterIntroStarted: false,
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
      (minimumLength) => tokens.some((token) =>
        canScrambleCore(token.core, minimumLength)
      )
    ) || 0;
    let requiredCount = 0;
    const puzzleTokens = tokens.map((token) => ({
      ...token,
      scrambled: token.core,
      required: false,
      solved: true
    }));
    const tryScramble = (token) => {
      if (token.required) return;
      const result = scrambleCore(token.core, random);
      if (!result || result === token.core) return;
      token.scrambled = result;
      token.required = true;
      token.solved = false;
      requiredCount += 1;
    };

    // Preserve the usual preference for longer words. If only one can be
    // mixed up, include a safe three-letter word, then a two-letter word.
    if (threshold) {
      puzzleTokens.forEach((token) => {
        if (canScrambleCore(token.core, threshold)) tryScramble(token);
      });
      for (let length = threshold - 1;
        length >= 2 && requiredCount < 2; length -= 1) {
        for (const token of puzzleTokens) {
          if (requiredCount >= 2) break;
          if (!token.required && canScrambleCore(token.core, length)) {
            tryScramble(token);
          }
        }
      }
    }

    // An impossible or disallowed anagram is never forced for the quota.
    return { threshold, requiredCount, tokens: puzzleTokens };
  }

  // Pick balanced, consecutive rows without changing the verse word order.
  // The scorer penalizes both uneven line lengths and single-word orphans.
  function balanceScrambleRows(widths, maxWidth, gap, rowCount) {
    const count = widths.length;
    if (!count || rowCount < 1 || rowCount > count) return null;
    const target = (widths.reduce((a, b) => a + b, 0) +
      gap * (count - rowCount)) / rowCount;
    const cache = new Map();
    const solve = (from, rowsLeft) => {
      if (rowsLeft === 0) {
        return from === count ? { score: 0, lines: [] } : null;
      }
      const key = `${from}:${rowsLeft}`;
      if (cache.has(key)) return cache.get(key);
      let best = null;
      let rowWidth = 0;
      for (let end = from + 1; end <= count - rowsLeft + 1; end += 1) {
        rowWidth += widths[end - 1] + (end > from + 1 ? gap : 0);
        if (rowWidth > maxWidth + 0.25) break;
        const next = solve(end, rowsLeft - 1);
        if (!next) continue;
        const imbalance = ((rowWidth - target) / Math.max(1, target)) ** 2;
        const orphan = count > 2 && rowCount > 1 && end === from + 1
          ? 0.32 : 0;
        const candidate = {
          score: imbalance + orphan + next.score,
          lines: [[from, end], ...next.lines]
        };
        if (!best || candidate.score < best.score) best = candidate;
      }
      cache.set(key, best);
      return best;
    };
    return solve(0, rowCount);
  }

  // Tap in Order displays only the word, while retaining the original
  // token (including punctuation) for verse ordering and other activities.
  // The core preserves meaningful internal apostrophes and hyphens.
  function getTapOrderDisplayWord(token) {
    return String(token?.core || "");
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
      fadeButtonIndex: -1,
      challengeIndex: 0,
      wrongAt: -1,
      easyMisses: 0,
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
      // Keep the existing preview identifier, but never reset progress.
      data.challengeIndex = Math.min(2, count - 1);
      data.wrongAt = data.challengeIndex;
      data.message = "Try that one again!";
    }

    if (
      [
        "sequence_hard_help",
        "sequence_help_active"
      ].includes(readTestMode)
    ) {
      data.easyMisses = 3;
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
        helpAvailable: false
      };
    }

    // Easy and Hard now share the same forgiving mistake rules.
    // Difficulty comes from the numbers displayed in Easy challenge mode.
    const easyMisses =
      (Number(data?.easyMisses) || 0) + 1;

    return {
      correct: false,
      expected,
      nextIndex: expected,
      complete: false,
      reset: false,
      easyMisses,
      helpAvailable: easyMisses >= 3
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

  // Patch 20: preserve a reading session when WebKit interrupts spoken audio.
  // These helpers never advance a chunk or grant completion credit.
  function readNarrationBlocked(error) {
    return !!root?.document?.hidden ||
      ["NotAllowedError", "AbortError", "InvalidStateError", "NotReadableError"]
        .includes(String(error?.name || ""));
  }

  function beginReadNarration(audio, fallback) {
    let result;
    try { result = audio.play(); } catch (error) { result = Promise.reject(error); }
    const promise = Promise.resolve(result);
    readDeferredNarrationFinish = null;
    readAudioStartPromise = promise;
    promise.catch((error) => {
      if (activeAudio !== audio || completionReported) return;
      if (readNarrationBlocked(error)) pauseReadForInterruption();
      else fallback?.();
    });
    return promise;
  }

  // Timers for the persistent animated scenes retain their remaining delay
  // while iOS is backgrounded or the Resume Audio overlay is visible.
  function scheduleReadSceneTimer(session, current, callback, delayMs) {
    const entry = {
      id: 0, remaining: Math.max(0, delayMs), startedAt: 0,
      callback, current
    };
    const arm = () => {
      entry.startedAt = Date.now();
      entry.id = setTimeout(() => {
        entry.id = 0;
        if (!session.active || !current()) {
          session.timers.delete(entry);
          return;
        }
        // A visibility event may race a timer callback. Keep it queued
        // instead of silently losing the next chunk while recovery is open.
        if (readAudioRecovery) {
          entry.remaining = 0;
          return;
        }
        session.timers.delete(entry);
        callback();
      }, entry.remaining);
    };
    entry.arm = arm;
    session.timers.add(entry);
    if (!readAudioRecovery) arm();
    return entry;
  }

  function freezeReadScene(session) {
    if (!session?.active) return;
    session.wrap?.classList.add("read-audio-paused");
    // WebKit can advance CSS animations while backgrounded even with a paused
    // ancestor style. Snapshot each actual animation timeline and pause it
    // directly; on pageshow, restore the saved times before the next paint.
    const frozen = session.pausedAnimations ||= new Map();
    let animations = [];
    try { animations = session.wrap?.getAnimations?.({ subtree: true }) || []; }
    catch (err) { /* CSS pause remains the fallback. */ }
    for (const animation of animations) {
      try {
        if (!frozen.has(animation)) frozen.set(animation, animation.currentTime);
        animation.pause();
        // Set after pause(): Safari may otherwise overwrite our restored
        // position with its already-advanced background timeline.
        if (frozen.get(animation) !== null) animation.currentTime = frozen.get(animation);
      } catch (err) { /* A finished or detached animation is harmless. */ }
    }
    for (const entry of session.timers) {
      if (!entry.id) continue;
      clearTimeout(entry.id);
      entry.id = 0;
      entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
    }
  }

  function thawReadScene(session, pausedMs = 0) {
    if (!session?.active) return;
    // Balloon collision tracks use wall-clock times, unlike CSS animations.
    for (const track of [...(session.wordTracks || []), ...(session.balloonTracks || [])]) {
      track.startMs += pausedMs;
    }
    session.fanfareLastProgress = Date.now();
    session.wrap?.classList.remove("read-audio-paused");
    for (const [animation, originalTime] of session.pausedAnimations || []) {
      try {
        if (originalTime !== null) animation.currentTime = originalTime;
        animation.play();
      } catch (err) { /* The element may have left the scene. */ }
    }
    session.pausedAnimations?.clear();
    for (const entry of session.timers) if (!entry.id) entry.arm();
  }

  function recordReadRecoveryCheck(phase, details = {}) {
    try { root?.BibloZooAudioDiagnostics?.record?.("read-my-verse-recovery", {
      activity: state.activityId, phase, ...details
    }); } catch (_) { /* Diagnostics must never prevent playback. */ }
  }

  function clearBalloonNarrationWatchdog() {
    if (balloonNarrationWatchdog?.timer) clearTimeout(balloonNarrationWatchdog.timer);
    balloonNarrationWatchdog = null;
  }

  function clearReadChunkNarrationWatchdog() {
    if (chunkNarrationWatchdog?.timer) clearTimeout(chunkNarrationWatchdog.timer);
    chunkNarrationWatchdog = null;
  }

  function stopReadNarration() {
    clearBalloonNarrationWatchdog();
    clearReadChunkNarrationWatchdog();
    audioRequest += 1;
    const audio = activeAudio;
    activeAudio = null;
    readAudioStartPromise = null;
    readDeferredNarrationFinish = null;
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch (err) { }
  }

  function activeReadScene() {
    if (state.activityId === VERSE_CRAWL_ACTIVITY_ID) return crawlSession;
    if (state.activityId === BALLOONS_ACTIVITY_ID) return balloonSession;
    if (state.activityId === FISH_ACTIVITY_ID) return fishSession;
    return null;
  }

  function attachReadRecoveryScene(session) {
    if (readAudioRecovery?.kind !== "animated") return;
    if (readAudioRecovery.scene && readAudioRecovery.scene !== session) {
      readAudioRecovery.narration = null; // Original slide was replaced.
    }
    readAudioRecovery.scene = session;
    freezeReadScene(session);
  }

  // Patch 70: Read My Verse already owns lifecycle and media continuation.
  // Reuse only the shared Welcome Back *presentation* here. Attaching another
  // lifecycle controller would double-pause narration and frozen scene clocks.
  function ensureReadAudioOverlay() {
    const doc = root?.document;
    if (!doc?.body) return null;
    let overlay = doc.getElementById("readAudioResumeOverlay");
    if (overlay) return overlay;
    overlay = doc.createElement("div");
    overlay.id = "readAudioResumeOverlay";
    overlay.className = "read-audio-resume-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "readAudioResumeTitle");
    // Plain emergency fallback only for a missing shared script; no second
    // styling system or competing recovery implementation is introduced.
    const card = root?.BibloZooWelcomeBack?.markup?.("game") || `
      <div class="bz-welcome-card" data-welcome-back-card>
        <h2 class="bz-welcome-title" id="readAudioResumeTitle">Welcome back!</h2>
        <button type="button" id="readAudioResumeButton" data-no-ui-sound
          data-welcome-back-action>Let's go!</button>
        <p id="readAudioResumeStatus" data-welcome-back-status role="status" hidden></p>
      </div>`;
    overlay.innerHTML = `
      <button class="read-my-verse-back read-audio-overlay-back no-zoom"
        type="button" id="readAudioOverlayBack" data-no-ui-sound aria-label="Back to activities">‹</button>
      ${card}`;
    // Shared markup supplies data hooks, while the existing Read My Verse
    // selectors continue to own the same action and status elements.
    const button = overlay.querySelector("[data-welcome-back-action]") ||
      overlay.querySelector("#readAudioResumeButton");
    const status = overlay.querySelector("[data-welcome-back-status]") ||
      overlay.querySelector("#readAudioResumeStatus");
    const title = overlay.querySelector(".bz-welcome-title") ||
      overlay.querySelector("#readAudioResumeTitle");
    if (button) {
      button.id = "readAudioResumeButton";
      // The app-wide capture listener must not play an extra UI sound before
      // this gesture starts the required narration or soundtrack.
      button.setAttribute?.("data-no-ui-sound", "");
    }
    if (status) status.id = "readAudioResumeStatus";
    if (title) title.id = "readAudioResumeTitle";
    if (button) button.onclick = resumeReadAudioFromGesture;
    // Keep the existing Back escape path if audio cannot be recovered.
    overlay.querySelector("#readAudioOverlayBack").onclick = exitSession;
    doc.body.appendChild(overlay);
    return overlay;
  }

  function syncReadAudioOverlay() {
    const overlay = readAudioRecovery ? ensureReadAudioOverlay() :
      root?.document?.getElementById?.("readAudioResumeOverlay");
    if (!overlay) return;
    const show = !!readAudioRecovery && !root.document.hidden &&
      state.phase !== "idle" && !completionReported;
    overlay.hidden = !show;
    if (!show) {
      root?.BibloZooWelcomeBack?.setAction?.(overlay, { busy: false });
      return;
    }
    const button = overlay.querySelector("#readAudioResumeButton");
    const status = overlay.querySelector("#readAudioResumeStatus");
    const error = readAudioRecovery.error || "";
    if (status) {
      status.textContent = error;
      status.hidden = !error;
    }
    root?.BibloZooWelcomeBack?.populate?.(overlay, {
      profileId: state.context?.profileId
    });
    root?.BibloZooWelcomeBack?.setAction?.(overlay, {
      retry: !!error,
      busy: !!readAudioRecoveryAttempt
    });
    // When the shared module is absent, the fallback remains usable.
    if (!root?.BibloZooWelcomeBack?.setAction && button) {
      button.textContent = error ? "Try again!" : "Let's go!";
      button.disabled = !!readAudioRecoveryAttempt;
    }
  }

  // The short completion/feedback timers used by word and sequence games must
  // not consume their remaining delay while a quiet Welcome Back is open.
  // Playback and animated-scene timers retain their existing separate owners.
  function scheduleReadPauseTimer(callback, delayMs) {
    const task = { id: 0, remaining: Math.max(0, delayMs), startedAt: 0 };
    task.arm = () => {
      task.startedAt = Date.now();
      task.id = setTimeout(() => {
        task.id = 0;
        if (readPauseTimerTask !== task) return;
        if (readAudioRecovery) {
          task.remaining = 0;
          return;
        }
        readPauseTimerTask = null;
        callback();
      }, task.remaining);
      pauseTimer = task.id;
    };
    readPauseTimerTask = task;
    task.arm();
    return task.id;
  }

  function freezeReadPauseTimer() {
    const task = readPauseTimerTask;
    if (!task?.id) return;
    clearTimeout(task.id);
    task.remaining = Math.max(0, task.remaining - (Date.now() - task.startedAt));
    task.id = 0;
    pauseTimer = 0;
  }

  function thawReadPauseTimer() {
    const task = readPauseTimerTask;
    if (task && !task.id) task.arm();
  }

  function pauseReadForInterruption() {
    if (!state.verseId || state.phase === "idle" || completionReported) return false;
    if (readAudioRecovery) {
      // Another background event invalidates a pending Resume Audio attempt.
      if (root?.document?.hidden) {
        readAudioRecoveryGeneration += 1;
        readAudioRecoveryAttempt = null;
        stopReadNarration();
        if (readAudioRecovery.kind === "animated") {
          freezeReadScene(readAudioRecovery.scene);
          if (readAudioRecovery.narration) readAudioRecovery.narration.item.audioStarted = false;
          if (crawlMusic) { try { crawlMusic.audio.pause(); } catch (err) { } }
          if (crawlEnding) { try { crawlEnding.pause(); } catch (err) { } }
        } else if (readAudioRecovery.kind === "sequence") {
          readAudioRecovery.data.activeButtonIndex = -1;
          readActiveSequenceReplay = null;
        } else if (readAudioRecovery.kind === "chunk") {
          state.phase = "pause";
        }
      }
      syncReadAudioOverlay();
      return false;
    }
    readEffectRecoveryPending = true;
    readToneClockProbe = null;
    const scene = activeReadScene();
    let recovery = null;
    if (isAnimatedActivity(state.activityId)) {
      recovery = { kind: "animated", scene: scene?.active ? scene : null,
        narration: scene?.active && readActiveAnimatedNarration?.session === scene
          ? readActiveAnimatedNarration : null };
    } else if (readActiveSequenceReplay && state.activityData === readActiveSequenceReplay.data) {
      recovery = { kind: "sequence", ...readActiveSequenceReplay };
    } else if (state.phase === "playing" || state.phase === "pause") {
      recovery = { kind: "chunk" };
    }
    if (!recovery) {
      // Typing and word activities need acknowledgement, not an invented
      // audio replay or a new game pause state. Keep the existing intro policy.
      if (isTypingActivity(state.activityId) && state.typewriterIntroPhase !== "done") {
        finishTypewriterIntro();
      }
      recovery = { kind: "ack" };
    }
    recovery.startedAt = Date.now();
    recovery.error = "";
    readAudioRecovery = recovery;
    readAudioRecoveryGeneration += 1;
    readAudioRecoveryAttempt = null;
    if (recovery.kind === "animated") {
      freezeReadPauseTimer();
      freezeReadScene(scene);
      if (crawlMusic) { try { crawlMusic.audio.pause(); } catch (err) { } }
        if (crawlEnding) { try { crawlEnding.pause(); } catch (err) { } }
      if (recovery.narration) recovery.narration.item.audioStarted = false;
    } else if (recovery.kind === "sequence") {
      // This replay starts afresh from the next deliberate tap.
      clearTimeout(pauseTimer);
      readPauseTimerTask = null;
      pauseTimer = 0;
      recovery.data.activeButtonIndex = -1;
      readActiveSequenceReplay = null;
    } else if (recovery.kind === "ack") {
      freezeReadPauseTimer();
    } else {
      clearTimeout(pauseTimer);
      readPauseTimerTask = null;
      pauseTimer = 0;
      state.phase = "pause";
    }
    stopReadNarration();
    stopKeySoundVoices();
    stopScrambleRewards();
    syncReadAudioOverlay();
    return true;
  }

  // play() fulfilling only means the request was accepted by WebKit. A
  // foregrounded iOS media element may still have a frozen playback clock.
  // Do not thaw moving scenes on that unverified promise alone. This probe
  // intentionally observes the same media element the tap just started.
  async function waitReadMediaProgress(audio, isCurrent, maxChecks = 6) {
    if (!audio || appApi?.isMuted?.()) return true;
    const initial = Number(audio.currentTime);
    if (!Number.isFinite(initial)) return false;
    for (let check = 0; check < maxChecks; check += 1) {
      if (!isCurrent() || root?.document?.hidden) return false;
      if (readDeferredNarrationFinish || audio.ended) return true;
      const current = Number(audio.currentTime);
      if (Number.isFinite(current) && current > initial + 0.035) return true;
      await new Promise(resolve => setTimeout(resolve, 220));
    }
    const finished = !!readDeferredNarrationFinish || !!audio.ended;
    if (!finished && isCurrent()) recordReadRecoveryCheck("media-clock-stalled");
    return finished;
  }

  function waitReadRecoveryResult(promise, ms = 1500) {
    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      };
      const timeout = setTimeout(() => finish(false), ms);
      Promise.resolve(promise).then(value => finish(value !== false), () => finish(false));
    });
  }

  // Patch 20J: restore the frozen verse scene, not the old Web Audio graph.
  // The HTML soundtrack restarts at the configurable, already-ducked mark
  // from this user gesture. No native plugin and no scene reset are involved.
  function resumeInterruptedCrawlFromGesture(recovery, generation) {
    const scene = recovery.scene;
    stopCrawlMusic();
    const hadEnding = !!crawlEnding;
    stopCrawlEnding();
    readAudioStartPromise = null;
    // Play BEFORE awaiting any promise, so iOS sees this as a direct tap.
    startCrawlMusic("interruption-resume", CRAWL_RESUME_SECONDS);
    const song = crawlMusic;
    if (recovery.narration && recovery.narration.session.active) {
      const { session, item } = recovery.narration;
      item.audioStarted = false;
      playCrawlAudio(session, item);
    }
    const narrationStart = readAudioStartPromise;
    const narrationAudio = activeAudio;
    if (hadEnding && scene?.active) {
      scene.endingStarted = false;
      startCrawlEnding(scene);
    }
    // UI effects are separate; they must not veto a successful media restart.
    if (!appApi?.isMuted?.() && typeof appApi?.unlockAudio === "function") {
      try { void Promise.resolve(appApi.unlockAudio()).catch(() => {}); }
      catch (err) { /* Nonessential UI sound. */ }
    }
    syncReadAudioOverlay();
    void (async () => {
      const started = !!appApi?.isMuted?.() || !!song &&
        await waitReadRecoveryResult(song.startPromise, 3000);
      const narrated = !narrationStart ||
        await waitReadRecoveryResult(narrationStart, 3000);
      const current = () => generation === readAudioRecoveryGeneration &&
        readAudioRecovery === recovery;
      // Verse Crawl's direct HTML soundtrack is distinct from its narration.
      // Recheck both clocks before releasing the frozen scene.
      const movingSong = started && (appApi?.isMuted?.() ||
        await waitReadMediaProgress(song?.audio, current));
      const movingNarration = narrated && (!narrationStart ||
        await waitReadMediaProgress(narrationAudio, current));
      if (!current()) return;
      recordReadRecoveryCheck("crawl-resume-check", {
        soundtrackClockAdvanced: !!movingSong, narrationClockAdvanced: !!movingNarration
      });
      readAudioRecoveryAttempt = null;
      if (!movingSong || !movingNarration || root?.document?.hidden) {
        stopReadNarration();
        if (recovery.narration) recovery.narration.item.audioStarted = false;
        stopCrawlMusic();
        stopCrawlEnding();
        recovery.error = "Audio isn't ready yet. Try again!";
        syncReadAudioOverlay();
        return;
      }
      readAudioRecovery = null;
      thawReadPauseTimer();
      thawReadScene(scene, Date.now() - recovery.startedAt);
      syncReadAudioOverlay();
      const delayedFinish = readDeferredNarrationFinish;
      readDeferredNarrationFinish = null;
      delayedFinish?.();
    })();
    return true;
  }

  function resumeReadAudioFromGesture() {
    const recovery = readAudioRecovery;
    if (!recovery || readAudioRecoveryAttempt || root?.document?.hidden) return false;
    const generation = readAudioRecoveryGeneration;
    readAudioRecoveryAttempt = { generation };
    recovery.error = "";
    if (recovery.kind === "ack") {
      // Nothing must replay. This real tap can prime nonessential UI effects,
      // but no asynchronous unlock can restart input or stall acknowledgement.
      if (!appApi?.isMuted?.() && typeof appApi?.unlockAudio === "function") {
        try { void Promise.resolve(appApi.unlockAudio()).catch(() => {}); }
        catch (err) { /* A later activity gesture can retry UI effects. */ }
      }
      const needsToneRecovery = !appApi?.isMuted?.() &&
        (state.activityId === TAP_WORDS_ORDER_ACTIVITY_ID ||
          state.activityId === UNSCRAMBLE_ACTIVITY_ID) &&
        !!(root?.AudioContext || root?.webkitAudioContext);
      if (!needsToneRecovery) {
        if (generation !== readAudioRecoveryGeneration || readAudioRecovery !== recovery ||
            root?.document?.hidden) return false;
        readAudioRecoveryAttempt = null;
        readAudioRecovery = null;
        thawReadPauseTimer();
        syncReadAudioOverlay();
        return true;
      }
      // Starting context.resume() here retains the original user gesture.
      const toneCheck = prepareReadTonesFromGesture();
      void Promise.resolve(toneCheck).then(ready => {
        if (generation !== readAudioRecoveryGeneration || readAudioRecovery !== recovery) return;
        readAudioRecoveryAttempt = null;
        if (!ready || root?.document?.hidden) {
          recovery.error = "Audio isn't ready yet. Try again!";
          syncReadAudioOverlay();
          return;
        }
        readAudioRecovery = null;
        thawReadPauseTimer();
        syncReadAudioOverlay();
      });
      return true;
    }
    if (recovery.kind === "animated" &&
        state.activityId === VERSE_CRAWL_ACTIVITY_ID) {
      return resumeInterruptedCrawlFromGesture(recovery, generation);
    }
    // Start the real narration / music first in this user gesture. App UI
    // Web Audio is a separate sound system and must not preempt this playback.
    const kind = recovery.kind;
    readAudioStartPromise = null;
    let media = Promise.resolve();
    if (kind === "chunk") {
      state.phase = "pause";
      playCurrentChunk();
      media = readAudioStartPromise || Promise.resolve();
    } else if (kind === "sequence") {
      recovery.data.activeButtonIndex = -1;
      playChunkSequenceAudio(recovery.buttonIndex, recovery.onFinished);
      media = readAudioStartPromise || Promise.resolve();
    } else if (kind === "animated") {
      if (recovery.narration && recovery.narration.session.active) {
        const { session, item } = recovery.narration;
        item.audioStarted = false;
        if (state.activityId === VERSE_CRAWL_ACTIVITY_ID) playCrawlAudio(session, item);
        else if (state.activityId === BALLOONS_ACTIVITY_ID) playBalloonAudio(session, item);
        else if (state.activityId === FISH_ACTIVITY_ID) playFishAudio(session, item);
        media = readAudioStartPromise || Promise.resolve();
      }
    }
    const narrationAudio = activeAudio;
    // Prime app UI effects as best effort, AFTER starting the requested media.
    // A frozen app AudioContext must never veto a successfully playing verse.
    if (!appApi?.isMuted?.() && typeof appApi?.unlockAudio === "function") {
      try { void Promise.resolve(appApi.unlockAudio()).catch(() => {}); }
      catch (err) { /* UI effects can retry on a later gesture. */ }
    }
    // Narration and the word-button notes use different audio engines.
    // Start tone recovery within the SAME deliberate Welcome Back gesture,
    // after the essential HTML narration has been started. Do not dismiss the
    // prompt with a still-frozen tone clock, or the first word tap is silent.
    const needsWordTones = kind === "chunk" && !appApi?.isMuted?.() &&
      (state.activityId === TAP_WORDS_ORDER_ACTIVITY_ID ||
        state.activityId === UNSCRAMBLE_ACTIVITY_ID);
    const toneReady = needsWordTones ? prepareReadTonesFromGesture() : Promise.resolve(true);
    syncReadAudioOverlay();
    void (async () => {
      const started = await waitReadRecoveryResult(media);
      const current = () => generation === readAudioRecoveryGeneration &&
        readAudioRecovery === recovery;
      const heard = started && (appApi?.isMuted?.() || !narrationAudio ||
        await waitReadMediaProgress(narrationAudio, current));
      const tonesReady = await toneReady;
      if (!current()) return;
      readAudioRecoveryAttempt = null;
      if (!heard || !tonesReady || root?.document?.hidden) {
        stopReadNarration();
        if (kind === "sequence") {
          recovery.data.activeButtonIndex = -1;
          readActiveSequenceReplay = null;
        }
        if (kind === "animated" && recovery.narration) recovery.narration.item.audioStarted = false;
        if (kind === "chunk") state.phase = "pause";
        if (crawlMusic) { try { crawlMusic.audio.pause(); } catch (err) { } }
        if (crawlEnding) { try { crawlEnding.pause(); } catch (err) { } }
        recovery.error = "Audio isn't ready yet. Try again!";
        syncReadAudioOverlay();
        return;
      }
      readAudioRecovery = null;
      thawReadPauseTimer();
      if (kind === "animated") thawReadScene(recovery.scene, Date.now() - recovery.startedAt);
      syncReadAudioOverlay();
      const delayedFinish = readDeferredNarrationFinish;
      readDeferredNarrationFinish = null;
      delayedFinish?.();
    })();
    return true;
  }

  function restorePausedReadSceneOnReturn() {
    // Reassert the exact animation clock captured before iOS backgrounding.
    if (readAudioRecovery?.kind === "animated") freezeReadScene(readAudioRecovery.scene);
    syncReadAudioOverlay();
  }
  root?.document?.addEventListener?.("visibilitychange", () => {
    if (root.document.hidden) pauseReadForInterruption();
    else restorePausedReadSceneOnReturn();
  });
  root?.addEventListener?.("pagehide", pauseReadForInterruption);
  root?.addEventListener?.("pageshow", restorePausedReadSceneOnReturn);

  function stopAudio() {
    readAudioRecoveryGeneration += 1;
    readAudioRecovery = null;
    readAudioRecoveryAttempt = null;
    readActiveAnimatedNarration = null;
    readActiveSequenceReplay = null;
    readAudioStartPromise = null;
    readDeferredNarrationFinish = null;
    readPauseTimerTask = null;
    readToneClockProbe = null;
    clearBalloonNarrationWatchdog();
    clearReadChunkNarrationWatchdog();
    syncReadAudioOverlay();
    audioRequest += 1;
    stopCrawlSequence();
    stopCrawlMusic();
    stopCrawlEnding();
    stopBalloonSequence();
    stopFishSequence();
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
    stopScrambleRewards();

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
    clearTimeout(typewriterIntroTimer);
    typewriterIntroTimer = 0;
    typewriterIntroWrap = null;
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
    state.typewriterIntroPhase = "done";
    state.typewriterIntroCount = 0;
    state.typewriterIntroStarted = false;
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
    if (isTypingActivity(safeActivityId)) {
      state.typewriterIntroPhase = state.reducedMotion ? "hold" : "typing";
      state.typewriterIntroCount = state.reducedMotion
        ? TYPEWRITER_INTRO_TEXT.length : 0;
    }
    state.phase = getActivePhase(
      safeActivityId
    );
    state.decorations =
      createDecorations(safeActivityId);

    // Start in the launch gesture so iOS permits music playback.
    if (safeActivityId === VERSE_CRAWL_ACTIVITY_ID) {
      startCrawlMusic("activity-launch");
    }

    if (
      isTypingActivity(safeActivityId)
    ) {
      ensureKeySoundAudio(safeActivityId);
      // Unlock Web Audio during the launch gesture so the delayed intro
      // keystrokes can play on iOS without requiring another tap.
      if (!appApi?.isMuted?.()) {
        keySoundContext?.resume?.()?.catch?.(() => {});
      }
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
  function resumeReadEffects(context, kind) {
    if (!context || root?.document?.hidden || readAudioRecovery) return Promise.resolve(false);
    if (context.state === "running") return Promise.resolve(true);
    let started;
    try { started = context.resume(); }
    catch (err) { started = Promise.reject(err); }
    // An interrupted iOS context may never settle. Do not cache that promise.
    return waitReadRecoveryResult(started, 900).then((ok) => {
      if (ok && context.state === "running") {
        if (kind === "key") readKeyResumeFailures = 0;
        else readToneResumeFailures = 0;
        return true;
      }
      if (kind === "key" && keySoundContext === context) {
        if (++readKeyResumeFailures >= 2) {
          keySoundContext = null;
          keySoundBuffers = [];
          keySoundLoadAttempted = false;
          keySoundGeneration += 1;
          void context.close?.()?.catch?.(() => {});
        }
      }
      if (kind === "tone" && scrambleAudioContext === context) {
        if (++readToneResumeFailures >= 2) {
          scrambleAudioContext = null;
          void context.close?.()?.catch?.(() => {});
        }
      }
      return false;
    });
  }

  function stopKeySoundVoices({ keepChunkAlert = false } = {}) {
    keySoundVoices = keySoundVoices.filter(({ source, gain, isChunkAlert }) => {
      if (keepChunkAlert && isChunkAlert) return true;
      try { source.onended = null; source.stop(); } catch (err) { }
      try { source.disconnect(); gain.disconnect(); } catch (err) { }
      return false;
    });
    const keyCount = READ_ACTIVITY_MANIFEST[keySoundActivityId]
      ?.keySounds?.length || 0;
    keySoundAudio.forEach((audio, index) => {
      if (keepChunkAlert && index >= keyCount * KEY_SOUND_FALLBACK_VOICES) return;
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
    const manifest = READ_ACTIVITY_MANIFEST[safeActivityId];
    // The alert uses its own sample/voices, so it can overlap the last key.
    const sources = [...manifest.keySounds, manifest.chunkAlert];

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
            try {
              const response = await root.fetch(src);
              if (!response.ok) throw new Error("Key sound unavailable");
              return await context.decodeAudioData(await response.arrayBuffer());
            } catch (err) {
              // Missing alerts must not prevent the keystroke samples decoding.
              return null;
            }
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

  function playTypingSample(index, isChunkAlert = false) {
    if (appApi?.isMuted?.()) return;

    const sounds = ensureKeySoundAudio(state.activityId);
    const context = keySoundContext;
    const buffer = keySoundBuffers[index];

    if (context && buffer) {
      if (readEffectRecoveryPending && context.state === "running") {
        const before = context.currentTime;
        setTimeout(() => {
          if (keySoundContext !== context) return;
          if (context.state === "running" && context.currentTime > before + 0.012) {
            readEffectRecoveryPending = false;
          } else {
            // A frozen output must not masquerade as a working context.
            keySoundContext = null;
            keySoundBuffers = [];
            keySoundLoadAttempted = false;
            keySoundGeneration += 1;
            void context.close?.()?.catch?.(() => {});
            readEffectRecoveryPending = false;
          }
        }, 90);
      }
      if (context.state !== "running") {
        void resumeReadEffects(context, "key");
      }
      if (context.state === "running" && !readEffectRecoveryPending) {
        try {
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = buffer;
          gain.gain.value = isChunkAlert ? 0.7 : 0.58;
          source.connect(gain);
          gain.connect(context.destination);
          if (keySoundVoices.length >= KEY_SOUND_MAX_VOICES) {
            const oldest = keySoundVoices.shift();
            oldest.gain.gain.setTargetAtTime(0, context.currentTime, 0.006);
            oldest.source.stop(context.currentTime + 0.03);
          }
          const voice = { source, gain, isChunkAlert };
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
      audio.volume = isChunkAlert ? 0.85 : 0.7;
      audio.play().catch?.(() => { });
    } catch (err) { }
  }

  function playKeySound() {
    if (appApi?.isMuted?.()) return;
    const count = READ_ACTIVITY_MANIFEST[state.activityId]?.keySounds?.length || 0;
    if (count) playTypingSample(chooseKeySoundIndex(count));
  }

  function playChunkAlertSound() {
    const manifest = READ_ACTIVITY_MANIFEST[state.activityId];
    if (manifest?.chunkAlert) {
      playTypingSample(manifest.keySounds.length, true);
    }
  }

  function retireReadToneContext(context) {
    if (scrambleAudioContext !== context) return;
    scrambleAudioContext = null;
    readToneResumeFailures = 0;
    readToneClockProbe = null;
    stopScrambleRewards();
    try { void Promise.resolve(context.close?.()).catch(() => {}); }
    catch (_) { /* Interruption teardown remains best effort. */ }
  }

  function waitReadToneClock(context, ms = 300) {
    const before = Number(context?.currentTime);
    if (context?.state !== "running" || !Number.isFinite(before))
      return Promise.resolve(false);
    return new Promise(resolve => setTimeout(() => {
      resolve(context.state === "running" &&
        Number(context.currentTime) > before + 0.015);
    }, ms));
  }

  // Used after a note is scheduled. A running-but-frozen context is retired
  // only after a *second* settled clock check; no notes are replayed later.
  function monitorReadToneClock(context) {
    if (readToneClockProbe || root?.document?.hidden || readAudioRecovery) return;
    const probe = { context };
    readToneClockProbe = probe;
    void (async () => {
      let advanced = await waitReadToneClock(context);
      if (!advanced && scrambleAudioContext === context &&
          !root?.document?.hidden && !readAudioRecovery)
        advanced = await waitReadToneClock(context, 350);
      if (readToneClockProbe !== probe) return;
      readToneClockProbe = null;
      if (scrambleAudioContext !== context || root?.document?.hidden || readAudioRecovery) return;
      if (!advanced && context.state === "running") {
        recordReadRecoveryCheck("tone-clock-stalled", { during: "word-tap" });
        retireReadToneContext(context);
      }
    })();
  }

  // The quiet Welcome Back gesture must also restore the separate Web Audio
  // tone context used by Tap Words in Order and Unscramble. Restoring only the
  // app UI context leaves the word taps silent despite audible chunk audio.
  function prepareReadTonesFromGesture() {
    if (state.activityId !== TAP_WORDS_ORDER_ACTIVITY_ID &&
        state.activityId !== UNSCRAMBLE_ACTIVITY_ID) return Promise.resolve(true);
    const AudioContextClass = root?.AudioContext || root?.webkitAudioContext;
    if (!AudioContextClass || appApi?.isMuted?.()) return Promise.resolve(true);
    let context = scrambleAudioContext;
    try { context ||= (scrambleAudioContext = new AudioContextClass()); }
    catch (_) { return Promise.resolve(false); }
    let request;
    try { request = context.state === "running" ? true : context.resume(); }
    catch (_) { request = false; }
    return (async () => {
      const resumed = await waitReadRecoveryResult(request, 950);
      if (!resumed || context !== scrambleAudioContext ||
          root?.document?.hidden) return false;
      let advanced = await waitReadToneClock(context, 360);
      if (!advanced && context === scrambleAudioContext && !root?.document?.hidden)
        advanced = await waitReadToneClock(context, 420);
      if (context !== scrambleAudioContext || root?.document?.hidden) return false;
      recordReadRecoveryCheck(advanced ? "tone-gesture-verified" : "tone-gesture-stalled");
      if (!advanced) retireReadToneContext(context);
      else readEffectRecoveryPending = false;
      return advanced;
    })();
  }

  function stopScrambleRewards() {
    scrambleSoundVoices.forEach(({ oscillator, gain }) => {
      try { oscillator.onended = null; oscillator.stop(); } catch (err) { }
      try { oscillator.disconnect(); gain.disconnect(); } catch (err) { }
    });
    scrambleSoundVoices.clear();
    scrambleParticleBursts.forEach(({ node, timer }) => {
      clearTimeout(timer);
      node.remove();
    });
    scrambleParticleBursts.clear();
  }

  // Gentle pitched rewards, modeled on Verse Typer's triangle-wave tones.
  // Notes are scheduled together, so no delayed callback can outlive a game.
  function playScrambleReward(solvedCount, complete) {
    if (appApi?.isMuted?.()) return;
    const AudioContextClass = root?.AudioContext || root?.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      scrambleAudioContext ||= new AudioContextClass();
      const context = scrambleAudioContext;
      if (context.state !== "running") void resumeReadEffects(context, "tone");
      if (context.state !== "running") return;
      const base = [60, 62, 64, 67, 69, 72][(solvedCount - 1) % 6];
      const notes = complete
        ? [[base, 0], [base + 4, 0.09], [base + 7, 0.19], [base + 12, 0.3]]
        : [[base, 0], [base + 4, 0.1]];
      notes.forEach(([midi, delay]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const begin = context.currentTime + delay;
        const end = begin + (complete ? 0.2 : 0.17);
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(
          440 * 2 ** ((midi - 69) / 12), begin
        );
        gain.gain.setValueAtTime(0.0001, begin);
        gain.gain.linearRampToValueAtTime(0.075, begin + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const voice = { oscillator, gain };
        scrambleSoundVoices.add(voice);
        oscillator.onended = () => {
          scrambleSoundVoices.delete(voice);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(begin);
        oscillator.stop(end + 0.01);
      });
      monitorReadToneClock(context);
    } catch (err) { /* Unsupported Web Audio: continue silently. */ }
  }

  // Tap in Order plays one rising melody note per correct word, with a
  // completion flourish. These voices use the same lifecycle as Scramble's.
  function playOrderTone(nextIndex, complete = false, wrong = false) {
    if (appApi?.isMuted?.()) return;
    const AudioContextClass = root?.AudioContext || root?.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      if (scrambleAudioContext?.state === "closed")
        retireReadToneContext(scrambleAudioContext);
      scrambleAudioContext ||= new AudioContextClass();
      const context = scrambleAudioContext;
      // A freshly created context is usually suspended on iOS. Queue the
      // FIRST note in this real tap, after requesting resume synchronously;
      // otherwise the old early return silently discarded the first note.
      // Interrupted contexts are instead prepared by Welcome Back first.
      const startingSuspended = context.state === "suspended";
      if (context.state !== "running") {
        const resume = resumeReadEffects(context, "tone");
        if (!startingSuspended) return;
        void resume.then(ok => {
          if (ok && context === scrambleAudioContext &&
              !root?.document?.hidden && !readAudioRecovery)
            monitorReadToneClock(context);
        });
      }
      const firstClock = Number(context.currentTime) || 0;
      const queuedVoices = [];
      const scale = [60, 62, 64, 67, 69, 72];
      const midi = wrong ? 48 : scale[(Math.max(1, nextIndex) - 1) % scale.length];
      const notes = wrong ? [[midi, 0]] : complete
        ? [[midi, 0], [midi + 4, 0.09], [midi + 7, 0.18], [midi + 12, 0.27]]
        : [[midi, 0]];
      notes.forEach(([pitch, delay]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + delay;
        const end = start + (wrong ? 0.14 : complete ? 0.17 : 0.16);
        oscillator.type = wrong ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(
          440 * 2 ** ((pitch - 69) / 12), start
        );
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(wrong ? 0.034 : 0.072, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const voice = { oscillator, gain };
        scrambleSoundVoices.add(voice);
        queuedVoices.push(voice);
        oscillator.onended = () => {
          scrambleSoundVoices.delete(voice);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(end + 0.01);
      });
      if (startingSuspended) {
        // No sound may unexpectedly arrive seconds after an abandoned tap.
        // A note queued on a still-frozen clock is canceled, not replayed.
        setTimeout(() => {
          if (context === scrambleAudioContext && context.state === "running" &&
              Number(context.currentTime) > firstClock + 0.015) return;
          for (const voice of queuedVoices) {
            if (!scrambleSoundVoices.delete(voice)) continue;
            try { voice.oscillator.onended = null; voice.oscillator.stop(); } catch (_) {}
            try { voice.oscillator.disconnect(); voice.gain.disconnect(); } catch (_) {}
          }
          recordReadRecoveryCheck("tone-first-gesture-expired");
        }, 600);
      } else {
        monitorReadToneClock(context);
      }
    } catch (err) { /* Audio is optional on locked-down devices. */ }
  }

  // The word grid rerenders immediately. An independent visual copy lets the
  // 380ms Verse Invaders CRT shutdown finish without holding up the next tap.
  function vanishOrderWord(rect, text, fontSize) {
    if (state.reducedMotion || !root?.document?.body || !rect) return;
    const ghost = root.document.createElement("div");
    ghost.className = "read-order-crt-ghost";
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.fontSize = fontSize;
    const letters = root.document.createElement("span");
    letters.className = "read-order-crt-letters";
    letters.textContent = text;
    ghost.appendChild(letters);
    ghost.appendChild(root.document.createElement("i")).className = "read-order-crt-line";
    ghost.appendChild(root.document.createElement("i")).className = "read-order-crt-dot";
    root.document.body.appendChild(ghost);
    const effect = { node: ghost, timer: 0 };
    scrambleParticleBursts.add(effect);
    effect.timer = setTimeout(() => {
      scrambleParticleBursts.delete(effect);
      ghost.remove();
    }, 430);
  }

  function burstScrambleRainbow(rect) {
    if (state.reducedMotion || !root?.document?.body || !rect) return;
    const burst = root.document.createElement("div");
    burst.className = "read-unscramble-burst";
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;
    const colors = CHUNK_SEQUENCE_COLORS.slice(0, 6).map((color) => color.value);
    const offset = Math.random() * Math.PI * 2;
    for (let index = 0; index < 15; index += 1) {
      const angle = offset + index * Math.PI * 2 / 15 +
        (Math.random() - 0.5) * 0.23;
      const distance = 42 + Math.random() * 45;
      const particle = root.document.createElement("span");
      particle.className = "read-unscramble-particle";
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.setProperty("--read-particle-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--read-particle-y", `${Math.sin(angle) * distance}px`);
      particle.style.setProperty("--read-particle-size", `${7 + Math.random() * 7}px`);
      burst.appendChild(particle);
    }
    root.document.body.appendChild(burst);
    const effect = { node: burst, timer: 0 };
    scrambleParticleBursts.add(effect);
    effect.timer = setTimeout(() => {
      scrambleParticleBursts.delete(effect);
      burst.remove();
    }, 730);
  }

  function playGeneratedNegativeTone() {
    const AudioContextClass =
      root?.AudioContext ||
      root?.webkitAudioContext;

    if (!AudioContextClass) return;

    try {
      scrambleAudioContext ||= new AudioContextClass();
      const context = scrambleAudioContext;
      if (context.state !== "running") {
        void resumeReadEffects(context, "tone");
        return;
      }
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
      const voice = { oscillator, gain };
      scrambleSoundVoices.add(voice);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      oscillator.addEventListener(
        "ended",
        () => {
          scrambleSoundVoices.delete(voice);
          try { oscillator.disconnect(); } catch (err) { }
          try { gain.disconnect(); } catch (err) { }
        },
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
    readAudioRecoveryGeneration += 1;
    readAudioRecovery = null;
    readAudioRecoveryAttempt = null;
    syncReadAudioOverlay();

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

  // Ordinary spoken chunks (including Tap Words in Order) also depend on
  // an HTML audio ended event to reveal the next chunk. If WebKit loses that
  // event, advance ONLY once the media clock is stably at the actual end;
  // if the clock stalls mid-chunk, reopen Welcome Back for a deliberate retry.
  // This never guesses a duration or grants completion to unfinished audio.
  function watchReadChunkNarration(audio, request, finish) {
    clearReadChunkNarrationWatchdog();
    const watch = { timer: 0, lastTime: Number(audio.currentTime) || 0,
      stallChecks: 0 };
    chunkNarrationWatchdog = watch;
    const tick = () => {
      if (chunkNarrationWatchdog !== watch || request !== audioRequest ||
          activeAudio !== audio || completionReported) {
        if (chunkNarrationWatchdog === watch) clearReadChunkNarrationWatchdog();
        return;
      }
      const time = Number(audio.currentTime) || 0;
      if (root?.document?.hidden || readAudioRecovery) {
        // A frozen foreground scene must not consume watchdog checks while
        // the child is outside BibloZoo or the resume attempt is pending.
        watch.lastTime = time;
        watch.stallChecks = 0;
        watch.timer = setTimeout(tick, 950);
        return;
      }
      const duration = Number(audio.duration);
      const atEnd = Number.isFinite(duration) && duration > 0 &&
        time >= duration - 0.06;
      if (audio.ended || (atEnd && time <= watch.lastTime + 0.015)) {
        clearReadChunkNarrationWatchdog();
        if (!audio.ended) recordReadRecoveryCheck("chunk-ended-fallback", {
          chunkIndex: state.chunkIndex
        });
        finish();
        return;
      }
      watch.stallChecks = time > watch.lastTime + 0.025 ? 0 : watch.stallChecks + 1;
      watch.lastTime = time;
      if (watch.stallChecks >= 3) {
        clearReadChunkNarrationWatchdog();
        recordReadRecoveryCheck("chunk-media-stalled", {
          chunkIndex: state.chunkIndex, mediaTime: time
        });
        pauseReadForInterruption();
        return;
      }
      watch.timer = setTimeout(tick, 950);
    };
    watch.timer = setTimeout(tick, 950);
  }

  function playCurrentChunk() {
    if (state.phase !== "pause") return;
    clearReadChunkNarrationWatchdog();

    // Let the completion alert finish while spoken chunk audio begins.
    stopKeySoundVoices({ keepChunkAlert: true });
    stopScrambleRewards();
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
      pauseTimer = scheduleReadPauseTimer(
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
        if (readAudioRecovery) {
          if (readAudioRecoveryAttempt) readDeferredNarrationFinish = finish;
          return;
        }
        clearReadChunkNarrationWatchdog();
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
        () => {
          if (root?.document?.hidden) pauseReadForInterruption();
          else finish();
        },
        { once: true }
      );

      beginReadNarration(activeAudio, () => {
        if (request !== audioRequest) return;
        pauseTimer = scheduleReadPauseTimer(finish, 650);
      });
      watchReadChunkNarration(activeAudio, request, finish);
    } catch (err) {
      pauseTimer = scheduleReadPauseTimer(
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
    pauseTimer = scheduleReadPauseTimer(
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
    pauseTimer = scheduleReadPauseTimer(
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
    pauseTimer = scheduleReadPauseTimer(
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
    if (readAudioRecovery) return false;
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
      // Start alongside the last keystroke, not after the narration pause.
      playChunkAlertSound();
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
    if (readAudioRecovery) return false;
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
      pauseTimer = scheduleReadPauseTimer(
        finishInteractiveChunk,
        280
      );
    }

    return true;
  }

  function handleTapOrderTap(tokenId) {
    if (readAudioRecovery) return false;
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
      playOrderTone(data.nextIndex + 1, false, true);

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
      pauseTimer = scheduleReadPauseTimer(
        finishInteractiveChunk,
        440 // Let the CRT collapse and final melody finish before continuing.
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

    // A fresh tap takes precedence over any lingering glow on this button.
    if (data.fadeButtonIndex === buttonIndex) {
      data.fadeButtonIndex = -1;
    }
    data.activeButtonIndex = buttonIndex;
    readActiveSequenceReplay = { data, buttonIndex, onFinished };
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

      if (readAudioRecovery) {
        if (readAudioRecoveryAttempt) readDeferredNarrationFinish = finish;
        return;
      }
      finished = true;
      activeAudio = null;
      if (readActiveSequenceReplay?.data === data) readActiveSequenceReplay = null;
      data.activeButtonIndex = -1;
      // Let the halo settle after the sound ends; never lock input for it.
      data.fadeButtonIndex = buttonIndex;
      clearTimeout(chunkGlowFadeTimer);
      chunkGlowFadeTimer = setTimeout(() => {
        if (state.activityData !== data) return;
        data.fadeButtonIndex = -1;
        appApi?.requestRender?.();
      }, 350);
      onFinished?.();
      appApi?.requestRender?.();
    };

    if (
      !src ||
      !root?.Audio ||
      appApi?.isMuted?.()
    ) {
      pauseTimer = scheduleReadPauseTimer(
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
        () => {
          if (root?.document?.hidden) pauseReadForInterruption();
          else finish();
        },
        { once: true }
      );
      beginReadNarration(activeAudio, () => {
        if (request !== audioRequest) return;
        pauseTimer = scheduleReadPauseTimer(finish, 520);
      });
    } catch (err) {
      pauseTimer = scheduleReadPauseTimer(
        finish,
        520
      );
    }

    return true;
  }

  function chooseChunkSequenceMode(mode) {
    if (readAudioRecovery) return false;
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
    if (readAudioRecovery) return false;
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
    if (readAudioRecovery) return false;
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
    data.helpAvailable =
      evaluation.helpAvailable;

    data.message = "Try that one again!";

    setChunkSequencePhase("feedback");
    appApi?.requestRender?.();
    clearTimeout(pauseTimer);
    pauseTimer = scheduleReadPauseTimer(() => {
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
    if (readAudioRecovery) return false;
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
    readPauseTimerTask = null;
    pauseTimer = 0;
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

  // A reference travels as the first animated item (index -1), but it
  // never becomes a verse chunk or changes chunk progress/completion.
  function animatedItemAudioPath(item) {
    return item.index === -1
      ? getReferenceAudioPath(state.verseId)
      : getChunkAudioPath(
          state.verseId,
          state.chunkAudioIndices[item.index] ?? item.index,
          state.chunks.length,
          state.usesChunkAudio
        );
  }

  function renderCrawlChunkHtml(chunk) {
    return `
      <div class="read-crawl-window">
        <div class="read-crawl-chunk">${escapeHtml(chunk)}</div>
      </div>
    `;
  }

  // The pre-ducked track is intentionally played without Web Audio or JS
  // volume automation. Direct HTML media is the proven Patch 20B recovery path.
  function startCrawlMusic(reason = "unspecified", resumeAt = 0) {
    if (appApi?.isMuted?.() || !root?.Audio) return;
    try {
      const audio = new root.Audio(CRAWL_MUSIC_SRC);
      audio.preload = "auto";
      audio.loop = false;
      audio.setAttribute?.("playsinline", "");
      audio.setAttribute?.("webkit-playsinline", "");
      const music = { audio, context: null, gain: null,
        engine: "html-media-direct-20j", failed: false };
      crawlMusic = music;
      audio.addEventListener?.("error", () => {
        music.failed = true;
      });
      if (resumeAt > 0) {
        const seek = () => {
          if (crawlMusic !== music) return;
          try { audio.currentTime = resumeAt; }
          catch (err) { /* Metadata can arrive later; retry the seek then. */ }
        };
        // iOS may ignore seeks before metadata; retry after metadata arrives.
        audio.addEventListener?.("loadedmetadata", seek, { once: true });
        seek();
      }
      // play() is invoked synchronously during the launch/resume gesture.
      music.startPromise = Promise.resolve(audio.play()).then(
        () => true,
        () => { music.failed = true; return false; });
    } catch (error) {
      stopCrawlMusic();
    }
  }

  function stopCrawlMusic() {
    const music = crawlMusic;
    crawlMusic = null;
    if (!music) return;
    try {
      music.audio.pause();
      music.audio.removeAttribute?.("src");
      music.audio.load?.();
    } catch (error) { /* Audio teardown remains best effort. */ }
  }

  function stopCrawlEnding() {
    const ending = crawlEnding;
    crawlEnding = null;
    if (!ending) return;
    try { ending.pause(); ending.removeAttribute?.("src"); ending.load?.(); }
    catch (error) { /* Audio teardown remains best effort. */ }
  }

  function startCrawlEnding(session) {
    if (!session?.active || session.endingStarted) return;
    session.endingStarted = true;
    session.endingDone = false;
    if (appApi?.isMuted?.() || !root?.Audio) {
      session.endingDone = true;
      completeCrawlIfReady(session);
      return;
    }
    let ending;
    try {
      ending = new root.Audio(CRAWL_ENDING_SRC);
      ending.preload = "auto";
      ending.setAttribute?.("playsinline", "");
      ending.setAttribute?.("webkit-playsinline", "");
      crawlEnding = ending;
      const finish = () => {
        if (crawlEnding !== ending) return;
        session.endingDone = true;
        stopCrawlMusic();
        stopCrawlEnding();
        completeCrawlIfReady(session);
      };
      ending.addEventListener?.("ended", finish, { once: true });
      ending.addEventListener?.("error", finish, { once: true });
      Promise.resolve(ending.play()).then(
        () => {
          if (crawlEnding !== ending) return;
          // Count the one-second overlap from actual playback, not from an
          // asynchronous iOS media-load request that may take time to start.
          crawlTimer(session, () => {
            if (crawlEnding === ending) {
              stopCrawlMusic();
            }
          }, CRAWL_ENDING_OVERLAP_MS);
        },
        () => finish());
      // Never strand completion if WebKit omits ended/error.
      crawlTimer(session, finish, 6500);
    } catch (error) {
      session.endingDone = true;
      stopCrawlEnding();
      completeCrawlIfReady(session);
    }
  }

  function waitForCrawlFanfare(session, start) {
    let music = crawlMusic;
    if (!music || music.failed || appApi?.isMuted?.()) {
      if (music?.failed || appApi?.isMuted?.()) stopCrawlMusic();
      start();
      return;
    }
    session.fanfareLastProgress = Date.now();
    let lastTime = -1;
    const check = () => {
      if (!session.active || crawlSession !== session) return;
      // A recovery tap can rebuild the soundtrack without restarting the
      // crawl scene. Follow its replacement rather than stopping it.
      if (crawlMusic !== music && crawlMusic) {
        music = crawlMusic;
        lastTime = -1;
        session.fanfareLastProgress = Date.now();
      }
      if (crawlMusic !== music || music.failed || music.audio.ended ||
          appApi?.isMuted?.()) {
        stopCrawlMusic();
        start();
        return;
      }
      const elapsed = music.audio.currentTime || 0;
      if (elapsed >= CRAWL_FANFARE_SECONDS) {
        start();
        return;
      }
      if (elapsed > lastTime + 0.02) {
        lastTime = elapsed;
        session.fanfareLastProgress = Date.now();
      }
      // A blocked or stalled soundtrack must never strand the activity.
      if (Date.now() - session.fanfareLastProgress > 3500) {
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

  // A full right-to-left crossing takes about 4.5–5.5 seconds on phones.
  // The fish spurts/glides share these distance waypoints with the CSS.
  const FISH_SWIM_PATH = [
    [0, 0], [0.16, 0.10], [0.30, 0.31],
    [0.54, 0.50], [0.68, 0.71], [0.85, 0.83], [1, 1]
  ];

  function getFishMotion(sceneWidth, wordWidth, wordCount = 1) {
    const width = Math.max(120, Number(sceneWidth) || 120);
    const textWidth = Math.max(1, Number(wordWidth) || 1);
    const count = Math.max(1, Math.floor(Number(wordCount) || 1));
    // A 12px gap on either side ensures the entire pill enters and exits.
    const travel = width + textWidth + 24;
    const durationMs = Math.max(4500,
      Math.min(width <= 460 ? 5500 : 9000,
        Math.round(travel / 0.105)));
    // Convert the moment the right edge clears the screen into animation time.
    const entryProgress = (textWidth + 12) / travel;
    let fraction = 1;
    for (let i = 1; i < FISH_SWIM_PATH.length; i += 1) {
      const [endTime, endDistance] = FISH_SWIM_PATH[i];
      if (entryProgress <= endDistance) {
        const [startTime, startDistance] = FISH_SWIM_PATH[i - 1];
        fraction = startTime + (endTime - startTime) *
          (entryProgress - startDistance) / (endDistance - startDistance);
        break;
      }
    }
    const staggerMs = 500;
    const visibleMs = Math.ceil(durationMs * fraction) + 90;
    return {
      travel, durationMs, staggerMs, visibleMs,
      audioStartMs: (count - 1) * staggerMs + visibleMs
    };
  }

  function fishSwimDistanceAt(progress) {
    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    for (let index = 1; index < FISH_SWIM_PATH.length; index += 1) {
      const [endTime, endDistance] = FISH_SWIM_PATH[index];
      if (t <= endTime) {
        const [startTime, startDistance] = FISH_SWIM_PATH[index - 1];
        return startDistance + (endDistance - startDistance) *
          (t - startTime) / (endTime - startTime);
      }
    }
    return 1;
  }

  function fishWordTrackRectAt(track, timeMs, sceneWidth) {
    const progress = (timeMs - track.delayMs) / track.motion.durationMs;
    if (progress < 0 || progress > 1) return null;
    const left = sceneWidth + 12 - track.motion.travel *
      fishSwimDistanceAt(progress);
    return { left, right: left + track.width };
  }

  function fishWordTracksOverlap(first, second, sceneWidth) {
    const verticalGap = 10; // Include the independent 3px swim wiggle.
    if (first.top + first.height + verticalGap <= second.top ||
        second.top + second.height + verticalGap <= first.top) return false;
    const start = Math.max(first.delayMs, second.delayMs);
    const end = Math.min(first.delayMs + first.motion.durationMs,
      second.delayMs + second.motion.durationMs);
    if (end < start) return false;
    for (let t = start; t <= end + 50; t += 50) {
      const a = fishWordTrackRectAt(first, Math.min(t, end), sceneWidth);
      const b = fishWordTrackRectAt(second, Math.min(t, end), sceneWidth);
      if (!a || !b || a.right <= 0 || b.right <= 0 ||
          a.left >= sceneWidth || b.left >= sceneWidth) continue;
      if (a.left < b.right + 10 && a.right + 10 > b.left) return true;
    }
    return false;
  }

  // Keep a short chunk together, rather than stretching it top to bottom.
  // Longer chunks use more of the playfield and rely on horizontal staggering
  // only when their rendered word-pill heights cannot fit without overlap.
  function getFishWordLayout(sceneWidth, sceneHeight, wordSizes,
    positionFraction = 0.5) {
    const width = Math.max(120, Number(sceneWidth) || 120);
    const height = Math.max(120, Number(sceneHeight) || 120);
    const sizes = wordSizes.map((size) => ({
      width: Math.max(1, Number(size.width) || 1),
      height: Math.max(1, Number(size.height) || 1)
    }));
    if (!sizes.length) return [];

    // A comfortable gap is half the average height of neighboring pills.
    // Measure real rendered heights: wrapped words may be taller than others.
    const margin = Math.max(8, Math.min(36, height * 0.07));
    const availableHeight = Math.max(1, height - 2 * margin);
    const offsets = [0];
    for (let index = 1; index < sizes.length; index += 1) {
      const previous = sizes[index - 1];
      const current = sizes[index];
      const idealGap = (previous.height + current.height) * 0.25;
      offsets.push(offsets[index - 1] + previous.height + idealGap);
    }
    const idealHeight = offsets[offsets.length - 1] +
      sizes[sizes.length - 1].height;

    // Keep ideal gaps when they fit. Otherwise compress only as far as
    // needed, accounting for each individual pill's height at every row.
    let compression = 1;
    if (idealHeight > availableHeight) {
      sizes.forEach((size, index) => {
        if (!offsets[index]) return;
        compression = Math.min(compression,
          Math.max(0, availableHeight - size.height) / offsets[index]);
      });
      // Extremely short scenes cannot fit every pill; preserve reading
      // order and let the collision scheduler add horizontal separation.
      compression = Math.max(0.001, compression);
    }
    const groupHeight = Math.max(...sizes.map((size, index) =>
      offsets[index] * compression + size.height));
    const remainingSpace = Math.max(0, availableHeight - groupHeight);
    const location = Math.max(0, Math.min(1,
      Number.isFinite(Number(positionFraction)) ? Number(positionFraction) : 0.5));
    const groupTop = margin + remainingSpace * location;

    const tracks = [];
    sizes.forEach((size, index) => {
      const top = groupTop + offsets[index] * compression;
      const motion = getFishMotion(width, size.width, sizes.length);
      const track = { ...size, top, motion,
        delayMs: index ? tracks[index - 1].delayMs + motion.staggerMs : 0 };
      // Check the full spurt/glide trajectory, not just positions at entry.
      // A later word must never catch the one before it in crowded rows.
      while (tracks.some((prior) =>
        fishWordTracksOverlap(prior, track, width))) {
        track.delayMs += 75;
      }
      tracks.push(track);
    });
    return tracks;
  }

  // Hook tip: 18.9% from PNG left, 40.5% down from PNG top.
  // Target: flipped fish's right edge, inset 3% of hook width, mid-height.
  function getFishHookPlacement(fishRect, buttonRect, hookWidth) {
    const width = Math.max(1, Number(hookWidth) || 1);
    const hookHeight = width * (690 / 494);
    const targetX = fishRect.right - buttonRect.left - width * 0.03;
    const targetY = fishRect.top - buttonRect.top + fishRect.height / 2;
    return {
      left: targetX - width * 0.189,
      top: targetY - hookHeight * 0.405,
      hookHeight
    };
  }

  function stopCrawlSequence() {
    const session = crawlSession;
    if (!session) return;
    session.active = false;
    session.timers.forEach((entry) => clearTimeout(entry.id));
    session.timers.clear();
    session.items.forEach((item) => {
      item.node.style.animation = "none";
      item.node.remove();
    });
    crawlSession = null;
  }

  function crawlTimer(session, callback, delayMs) {
    return scheduleReadSceneTimer(session, () => crawlSession === session,
      callback, delayMs);
  }

  function completeCrawlIfReady(session) {
    const last = session.items.get(state.chunks.length - 1);
    if (session.active && crawlSession === session && !completionReported &&
        last?.audioDone && last?.vanished) {
      if (!session.endingStarted) startCrawlEnding(session);
      if (session.endingDone) reportCompletion();
    }
  }

  function markCrawlVanished(session, item) {
    if (!session.active || readAudioRecovery || item.vanished) return;
    item.vanished = true;
    item.node.remove();
    completeCrawlIfReady(session);
  }

  function finishCrawlAudio(session, item) {
    if (!session.active || item.audioDone) return;
    item.audioDone = true;
    if (item.index === state.chunks.length - 1 &&
        (item.pausedForAudio || state.reducedMotion)) {
      startCrawlEnding(session);
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
    readActiveAnimatedNarration = { session, item };
    const request = ++audioRequest;
    const src = animatedItemAudioPath(item);
    const finish = () => {
      if (!session.active || request !== audioRequest) return;
      if (readAudioRecovery) {
        if (readAudioRecoveryAttempt) readDeferredNarrationFinish = finish;
        return;
      }
      activeAudio = null;
      if (readActiveAnimatedNarration?.item === item) readActiveAnimatedNarration = null;
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
      activeAudio.addEventListener("error", () => {
        if (root?.document?.hidden) pauseReadForInterruption();
        else finish();
      }, { once: true });
      beginReadNarration(activeAudio, () => crawlTimer(session, finish, 650));
    } catch (err) {
      crawlTimer(session, finish, 650);
    }
  }

  function launchCrawlChunk(session, index) {
    if (!session.active || crawlSession !== session || session.items.has(index)) return;
    if (index >= 0) state.chunkIndex = index;
    state.phase = "animating";
    const node = root.document.createElement("div");
    node.className = "read-crawl-chunk" + (index < 0 ? " is-reference" : "");
    node.textContent = index < 0 ? session.reference :
      String(state.chunks[index] || "").trim();
    node.dataset.readCrawlChunk = String(index);
    const item = {
      index, node, audioStarted: false, audioDone: false,
      pausedForAudio: false, vanished: false
    };
    session.items.set(index, item);
    session.window.appendChild(node);

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
      // Start the baked-fade horn in the last part of the final visual fade.
      crawlTimer(session, () => {
        if (item.audioDone && !item.pausedForAudio && !item.vanished) {
          startCrawlEnding(session);
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
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Verse Crawl">‹</button>
      <main class="read-animated-stage" style="${animatedBackgroundStyle(manifest)}">
        <header class="read-animated-header">
          <div class="read-animated-reference">${escapeHtml(verse.ref || state.verseId)}</div>
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(verse.verseText)}">
          <div class="read-crawl-window" data-read-crawl-window></div>
        </section>
      </main>
    `;
    wrap.querySelector("[data-read-exit]").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
    const session = {
      active: true, wrap,
      reference: String(verse.ref || state.verseId),
      scene: wrap.querySelector(".read-animated-scene"),
      window: wrap.querySelector("[data-read-crawl-window]"),
      items: new Map(), timers: new Set()
    };
    crawlSession = session;
    attachReadRecoveryScene(session);
    let started = false;
    const start = () => {
      if (started || !session.active) return;
      started = true;
      root.requestAnimationFrame(() => {
        if (session.active && crawlSession === session && wrap.isConnected) {
          if (readAudioRecovery) crawlTimer(session, () => launchCrawlChunk(session, -1), 0);
          else launchCrawlChunk(session, -1);
        }
      });
    };
    // Wait for both font layout and seven seconds of actual music playback.
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
    session.timers.forEach((entry) => clearTimeout(entry.id));
    session.timers.clear();
    balloonSession = null;
  }

  function balloonTimer(session, callback, delayMs) {
    return scheduleReadSceneTimer(session, () => balloonSession === session,
      callback, delayMs);
  }

  function completeBalloonsIfReady(session) {
    const last = session.items.get(state.chunks.length - 1);
    if (session.active && balloonSession === session &&
        !completionReported && last?.audioDone && last?.vanished) {
      reportCompletion();
    }
  }

  function markBalloonWordsVanished(session, item) {
    if (!session.active || readAudioRecovery || item.vanished) return;
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

  // The reference's first verse chunk is scheduled by the audio-ended
  // callback. If iOS stalls *after* an accepted play(), no callback arrives;
  // the reference can float away with no next chunk. A bounded, scene-owned
  // watcher detects this state and returns to the same Welcome Back prompt.
  // An element at the end of its duration can also lose the WebKit ended event.
  function watchBalloonNarration(session, item, audio, request, finish) {
    clearBalloonNarrationWatchdog();
    const watch = { timer: 0, lastTime: Number(audio.currentTime) || 0,
      stallChecks: 0 };
    balloonNarrationWatchdog = watch;
    const tick = () => {
      if (balloonNarrationWatchdog !== watch || !session.active ||
          balloonSession !== session || audioRequest !== request ||
          activeAudio !== audio || item.audioDone) {
        if (balloonNarrationWatchdog === watch) clearBalloonNarrationWatchdog();
        return;
      }
      if (root?.document?.hidden || readAudioRecovery) {
        clearBalloonNarrationWatchdog();
        return;
      }
      const time = Number(audio.currentTime) || 0;
      const duration = Number(audio.duration);
      const nearlyEnded = Number.isFinite(duration) && duration > 0 &&
        time >= duration - 0.06;
      if (audio.ended || (nearlyEnded && time <= watch.lastTime + 0.015)) {
        clearBalloonNarrationWatchdog();
        if (!audio.ended) recordReadRecoveryCheck("balloon-ended-fallback", {
          reference: item.index === -1
        });
        finish();
        return;
      }
      watch.stallChecks = time > watch.lastTime + 0.025 ? 0 : watch.stallChecks + 1;
      watch.lastTime = time;
      if (watch.stallChecks >= 2) {
        clearBalloonNarrationWatchdog();
        recordReadRecoveryCheck("balloon-media-stalled", {
          reference: item.index === -1, mediaTime: time
        });
        // A second visible prompt is safer than losing the remaining verse.
        pauseReadForInterruption();
        return;
      }
      watch.timer = setTimeout(tick, 1100);
    };
    watch.timer = setTimeout(tick, 1100);
  }

  function playBalloonAudio(session, item) {
    if (!session.active || item.audioStarted) return;
    item.audioStarted = true;
    state.phase = "playing";
    readActiveAnimatedNarration = { session, item };
    const request = ++audioRequest;
    const src = animatedItemAudioPath(item);
    const finish = () => {
      if (!session.active || balloonSession !== session ||
          request !== audioRequest) return;
      if (readAudioRecovery) {
        if (readAudioRecoveryAttempt) readDeferredNarrationFinish = finish;
        return;
      }
      clearBalloonNarrationWatchdog();
      activeAudio = null;
      if (readActiveAnimatedNarration?.item === item) readActiveAnimatedNarration = null;
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
      activeAudio.addEventListener("error", () => {
        if (root?.document?.hidden) pauseReadForInterruption();
        else finish();
      }, { once: true });
      beginReadNarration(activeAudio, () => balloonTimer(session, finish, 650));
      watchBalloonNarration(session, item, activeAudio, request, finish);
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
    if (index >= 0) state.chunkIndex = index;
    state.phase = "animating";
    const holder = root.document.createElement("div");
    holder.innerHTML = renderBalloonWordsHtml(
      index < 0 ? session.reference : state.chunks[index], index < 0);
    const group = holder.firstElementChild;
    session.scene.appendChild(group);
    const item = {
      index, group, audioStarted: false, audioDone: false,
      vanished: false
    };
    session.items.set(index, item);


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
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Balloons">‹</button>
      <main class="read-animated-stage" style="${animatedBackgroundStyle(manifest)}">
        <header class="read-animated-header">
          <div class="read-animated-reference">${escapeHtml(verse.ref || state.verseId)}</div>
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(verse.verseText)}">
          <div class="read-animated-decorations" data-read-balloons></div>
          <div class="read-balloon-effects" data-read-balloon-effects aria-hidden="true"></div>
        </section>
      </main>
    `;
    wrap.querySelector("[data-read-exit]").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
    const session = {
      active: true, wrap,
      reference: String(verse.ref || state.verseId),
      scene: wrap.querySelector(".read-animated-scene"),
      decorations: wrap.querySelector("[data-read-balloons]"),
      effects: wrap.querySelector("[data-read-balloon-effects]"),
      wordTracks: [], balloonTracks: [],
      items: new Map(), timers: new Set()
    };
    balloonSession = session;
    attachReadRecoveryScene(session);
    root.requestAnimationFrame(() => {
      if (session.active && balloonSession === session && wrap.isConnected) {
        if (readAudioRecovery) balloonTimer(session, () => launchBalloonChunk(session, -1), 0);
        else launchBalloonChunk(session, -1);
      }
    });
    return appApi.makeSlide({ idx, bg: "#82d7f4", navHidden: true, inner: wrap });
  }

  function renderBalloonWordsHtml(chunk, isReference = false) {
    if (state.reducedMotion) {
      return `<div class="read-balloon-words is-stationary"><div class="read-balloon-reduced-text">${escapeHtml(chunk)}</div></div>`;
    }
    return `
      <div class="read-balloon-words${isReference ? " is-reference" : ""}" aria-label="${escapeHtml(chunk)}">
        ${(isReference ? [chunk] : getChunkWords(chunk)).map(
          (word, index) => `
            <span class="read-balloon-word" style="--read-lane-offset:${(((index * 37) % 5) - 2) * 7}vw;--read-sway-amplitude:${12 + (index % 3) * 1.5}px;--read-sway-phase:-${(index * 277) % 2400}ms;--read-sway-duration:${4200 + (index % 4) * 260}ms"><span class="read-balloon-word-inner">${escapeHtml(word)}</span></span>
          `
        ).join("")}
      </div>
    `;
  }

  // Keep fish, hooks and swimming words alive across audio/chunk changes.
  function stopFishSequence() {
    const session = fishSession;
    if (!session) return;
    session.active = false;
    session.timers.forEach((entry) => clearTimeout(entry.id));
    session.timers.clear();
    fishSession = null;
  }

  function fishTimer(session, callback, delayMs) {
    return scheduleReadSceneTimer(session, () => fishSession === session,
      callback, delayMs);
  }

  function completeFishIfReady(session) {
    const last = session.items.get(state.chunks.length - 1);
    if (session.active && fishSession === session &&
        !completionReported && last?.audioDone && last?.vanished) {
      reportCompletion();
    }
  }

  function markFishWordsVanished(session, item) {
    if (!session.active || readAudioRecovery || item.vanished) return;
    item.vanished = true;
    item.group.remove();
    completeFishIfReady(session);
  }

  function finishFishAudio(session, item) {
    if (!session.active || item.audioDone) return;
    item.audioDone = true;
    if (state.reducedMotion) {
      item.group.classList.add("is-fading");
      fishTimer(session, () => markFishWordsVanished(session, item), 450);
    }
    if (item.index + 1 < state.chunks.length) {
      // Let earlier words and decorative fish finish their own journeys.
      fishTimer(session, () => launchFishChunk(session, item.index + 1), 200);
    } else {
      completeFishIfReady(session);
    }
  }

  function playFishAudio(session, item) {
    if (!session.active || item.audioStarted) return;
    item.audioStarted = true;
    state.phase = "playing";
    readActiveAnimatedNarration = { session, item };
    const request = ++audioRequest;
    const src = animatedItemAudioPath(item);
    const finish = () => {
      if (!session.active || fishSession !== session ||
          request !== audioRequest) return;
      if (readAudioRecovery) {
        if (readAudioRecoveryAttempt) readDeferredNarrationFinish = finish;
        return;
      }
      activeAudio = null;
      if (readActiveAnimatedNarration?.item === item) readActiveAnimatedNarration = null;
      finishFishAudio(session, item);
    };
    if (!src || typeof Audio === "undefined" || appApi?.isMuted?.()) {
      fishTimer(session, finish, 250);
      return;
    }
    try {
      activeAudio?.pause?.();
      activeAudio = new Audio(src);
      activeAudio.preload = "auto";
      activeAudio.addEventListener("ended", finish, { once: true });
      activeAudio.addEventListener("error", () => {
        if (root?.document?.hidden) pauseReadForInterruption();
        else finish();
      }, { once: true });
      beginReadNarration(activeAudio, () => fishTimer(session, finish, 650));
    } catch (err) {
      fishTimer(session, finish, 650);
    }
  }

  function launchFishDecorations(session) {
    const manifest = READ_ACTIVITY_MANIFEST[FISH_ACTIVITY_ID];
    const decorations = createDecorations(FISH_ACTIVITY_ID);
    const sceneWidth = session.scene.getBoundingClientRect().width;
    decorations.forEach((decoration) => {
      const holder = root.document.createElement("div");
      holder.innerHTML = renderFishDecorationsHtml(manifest, [decoration]);
      const button = holder.firstElementChild;
      session.decorations.appendChild(button);
      const width = button.getBoundingClientRect().width;
      const travel = sceneWidth + width + 24;
      button.style.left = `${-width - 12}px`;
      button.style.setProperty("--read-fish-decor-travel", `${travel}px`);
      button.style.setProperty("--read-fish-decor-duration",
        `${Math.max(9500, Math.min(18000, Math.round(travel / 0.051)))}ms`);
      const assembly = button.querySelector(".read-fish-catch-assembly");
      const hookRig = button.querySelector(".read-fish-hook-rig");
      let catchState = "swimming"; // Every fish owns its catch lifecycle.
      const removeFish = () => {
        catchState = "removed";
        button.remove();
      };
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!session.active || catchState !== "swimming") return;
        catchState = "hooking";
        const buttonRect = button.getBoundingClientRect();
        const sceneRect = session.scene.getBoundingClientRect();
        const fishImage = button.querySelector(".read-fish-image");
        const fishFallback = button.querySelector(".read-fish-fallback");
        const fishRect = fishImage && !fishImage.hidden &&
          fishImage.getBoundingClientRect().height
          ? fishImage.getBoundingClientRect()
          : fishFallback.getBoundingClientRect();
        const hookWidth = hookRig.getBoundingClientRect().width;
        const placement = getFishHookPlacement(fishRect, buttonRect, hookWidth);
        hookRig.style.left = `${placement.left}px`;
        hookRig.style.top = `${placement.top}px`;
        // The hook starts above the scene and descends to where this fish
        // WILL be: the rig is a child of the still-swimming fish button.
        const targetSceneY = buttonRect.top - sceneRect.top +
          placement.top + placement.hookHeight * 0.405;
        hookRig.style.setProperty("--read-fish-hook-drop",
          `${Math.max(80, targetSceneY + placement.hookHeight)}px`);
        assembly.style.setProperty("--read-fish-reel-travel",
          `${Math.max(220, buttonRect.bottom - sceneRect.top +
            placement.hookHeight + 70)}px`);
        button.classList.add("is-activated", "is-hooking");
        button.disabled = true;
        // Keep swimming during descent; then lift fish, hook AND line
        // inside the same assembly. Separate timers allow simultaneous taps.
        fishTimer(session, () => {
          if (catchState !== "hooking" || !button.isConnected) return;
          catchState = "reeling";
          button.classList.add("is-reeling");
          fishTimer(session, () => {
            if (catchState === "reeling") removeFish();
          }, 730); // Fallback for WebKit missing animationend.
        }, 620);
      };
      button.addEventListener("animationend", (event) => {
        if (event.target === button && event.animationName === "readDecorFish" &&
            catchState === "swimming") removeFish();
        if (event.target === assembly &&
            event.animationName === "readFishCatchReel" &&
            catchState === "reeling") removeFish();
      });
    });
  }

  function launchFishChunk(session, index) {
    if (!session.active || fishSession !== session ||
        session.items.has(index)) return;
    if (index >= 0) state.chunkIndex = index;
    state.phase = "animating";
    const holder = root.document.createElement("div");
    holder.innerHTML = renderFishWordsHtml(
      index < 0 ? session.reference : state.chunks[index], index < 0);
    const group = holder.firstElementChild;
    session.scene.appendChild(group);
    const item = {
      index, group, audioStarted: false, audioDone: false, vanished: false
    };
    session.items.set(index, item);


    if (state.reducedMotion) {
      fishTimer(session, () => playFishAudio(session, item), 520);
      return;
    }

    const words = Array.from(group.querySelectorAll(".read-fish-word"));
    const scene = session.scene.getBoundingClientRect();
    let lastEntryMs = 0;
    let lastExitMs = 0;
    const sizes = words.map((word) => word.getBoundingClientRect());
    // Cycle between upper, middle and lower zones across consecutive chunks.
    // Short word groups can swim at different heights without stretching;
    // crowded groups naturally fill the space regardless of the zone.
    const zone = index < 0 ? 1 : (session.fishGroupZoneOffset + index) % 3;
    const positionFraction = (zone + 0.15 + Math.random() * 0.7) / 3;
    const layout = getFishWordLayout(scene.width, scene.height, sizes,
      positionFraction);
    words.forEach((word, wordIndex) => {
      const { top, delayMs, motion } = layout[wordIndex];
      word.style.top = `${top}px`;
      word.style.setProperty("--read-fish-travel", `${motion.travel}px`);
      word.style.setProperty("--read-fish-duration", `${motion.durationMs}ms`);
      word.style.setProperty("--read-word-delay", `${delayMs}ms`);
      word.style.setProperty("--read-fish-wiggle-duration",
        `${Math.round(motion.durationMs / 2)}ms`);
      lastEntryMs = Math.max(lastEntryMs, delayMs + motion.visibleMs);
      lastExitMs = Math.max(lastExitMs, delayMs + motion.durationMs);
    });
    let remaining = words.length;
    words.forEach((word) => {
      word.addEventListener("animationend", (event) => {
        if (event.target !== word || event.animationName !== "readFishWordSwim" ||
            item.vanished) return;
        remaining -= 1;
        if (remaining === 0) markFishWordsVanished(session, item);
      });
    });
    fishTimer(session, () => markFishWordsVanished(session, item),
      lastExitMs + 800);
    fishTimer(session, () => playFishAudio(session, item), lastEntryMs);
    launchFishDecorations(session);
  }

  function renderFishScreen(idx, verse) {
    if (fishSession) {
      stopFishSequence();
      audioRequest += 1;
      activeAudio?.pause?.();
      activeAudio = null;
    }
    const manifest = READ_ACTIVITY_MANIFEST[FISH_ACTIVITY_ID];
    const wrap = root.document.createElement("div");
    wrap.className = "read-my-verse-screen read-animated-screen read-fish-screen" +
      (state.reducedMotion ? " is-reduced-motion" : "");
    wrap.innerHTML = `
      <button class="read-my-verse-back no-zoom" type="button" data-read-exit data-no-ui-sound aria-label="Exit Fish Read">‹</button>
      <main class="read-animated-stage" style="${animatedBackgroundStyle(manifest)}">
        <header class="read-animated-header">
          <div class="read-animated-reference">${escapeHtml(verse.ref || state.verseId)}</div>
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(verse.verseText)}">
          <div class="read-animated-decorations" data-read-fish></div>
        </section>
      </main>
    `;
    wrap.querySelector("[data-read-exit]").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSession();
    };
    const session = {
      active: true, wrap,
      reference: String(verse.ref || state.verseId),
      scene: wrap.querySelector(".read-animated-scene"),
      decorations: wrap.querySelector("[data-read-fish]"),
      items: new Map(), timers: new Set(),
      fishGroupZoneOffset: Math.floor(Math.random() * 3)
    };
    fishSession = session;
    attachReadRecoveryScene(session);
    root.requestAnimationFrame(() => {
      if (session.active && fishSession === session && wrap.isConnected) {
        if (readAudioRecovery) fishTimer(session, () => launchFishChunk(session, -1), 0);
        else launchFishChunk(session, -1);
      }
    });
    return appApi.makeSlide({ idx, bg: "#197ea7", navHidden: true, inner: wrap });
  }

  function renderFishWordsHtml(chunk, isReference = false) {
    if (state.reducedMotion) {
      return `<div class="read-fish-words is-stationary"><div class="read-fish-reduced-text">${escapeHtml(chunk)}</div></div>`;
    }
    return `
      <div class="read-fish-words${isReference ? " is-reference" : ""}" aria-label="${escapeHtml(chunk)}">
        ${(isReference ? [chunk] : getChunkWords(chunk)).map((word, index) => `
          <span class="read-fish-word" style="--read-fish-wiggle-phase:-${(index * 173) % 900}ms"><span class="read-fish-word-inner">${escapeHtml(word)}</span></span>
        `).join("")}
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

  function renderFishDecorationsHtml(manifest, decorations = state.decorations) {
    return decorations.map((decoration) => `
      <button class="read-decorative-fish" type="button" data-read-decoration aria-label="Catch decorative fish" data-read-fish-kind="${decoration.kind}" style="--read-decor-top:${decoration.top.toFixed(1)}%;--read-decor-delay:${decoration.delay.toFixed(2)}s">
        <span class="read-fish-catch-assembly">
          <span class="read-fish-hook-rig" aria-hidden="true">
            <span class="read-fish-hook-line"></span>
            <img class="read-fish-hook" src="${escapeHtml(manifest.decorations?.hook || "")}" alt="" draggable="false" onerror="this.hidden=true;this.parentElement.classList.add('is-hook-missing')">
            <span class="read-fish-hook-fallback">J</span>
          </span>
          <img class="read-fish-image" src="${escapeHtml(manifest.decorations?.[decoration.kind] || "")}" alt="" draggable="false" onerror="this.hidden=true;this.parentElement.parentElement.classList.add('is-image-missing')">
          <span class="read-fish-fallback" aria-hidden="true"></span>
        </span>
      </button>
    `).join("");
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
    if (state.activityId === FISH_ACTIVITY_ID) {
      return renderFishScreen(idx, verse);
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
        renderBalloonWordsHtml(chunk);
      decorationsHtml =
        renderBalloonDecorationsHtml(
          manifest
        );
    } else {
      activityHtml = renderFishWordsHtml(chunk);
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
        </header>
        <section class="read-animated-scene" aria-label="${escapeHtml(chunk)}">
          ${activityHtml}
          <div class="read-animated-decorations" aria-hidden="false">${decorationsHtml}</div>
        </section>
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

  // Keep the words "the verse." together if the intro wraps. Reserve the
  // complete sentence while typing so neither line shifts as letters appear.
  function renderTypingIntroText(count) {
    const head = "Tap to type ";
    const tail = "the verse.";
    const headCount = Math.min(count, head.length);
    const tailCount = Math.max(0, count - head.length);
    return `${escapeHtml(head.slice(0, headCount))}` +
      `<span class="read-typewriter-intro-untyped">${escapeHtml(head.slice(headCount))}</span>` +
      `<span class="read-typewriter-intro-tail">${escapeHtml(tail.slice(0, tailCount))}` +
      `<span class="read-typewriter-intro-untyped">${escapeHtml(tail.slice(tailCount))}</span></span>`;
  }

  // Both typing activities share the cutscene timing, but retain their own
  // fitted verse, fonts, audio effects, and original tap-to-reveal gameplay.
  function finishTypewriterIntro() {
    clearTimeout(typewriterIntroTimer);
    typewriterIntroTimer = 0;
    if (state.typewriterIntroPhase === "done") return;
    state.typewriterIntroPhase = "done";
    typewriterIntroWrap?.querySelector("[data-read-typewriter-intro]")?.remove();
    typewriterIntroWrap?.querySelector(".read-typewriter-paper, .read-keyboard-terminal")
      ?.classList.remove("is-intro-active");
    typewriterIntroWrap = null;
    syncTypingScreen();
  }

  function fadeTypewriterIntro() {
    if (state.typewriterIntroPhase !== "hold") return;
    state.typewriterIntroPhase = "fading";
    typewriterIntroWrap?.querySelector("[data-read-typewriter-intro]")
      ?.classList.add("is-fading");
    typewriterIntroTimer = setTimeout(
      finishTypewriterIntro,
      state.reducedMotion ? 0 : TYPEWRITER_INTRO_FADE_MS
    );
  }

  function startTypewriterIntro() {
    if (!isTypingActivity(state.activityId) ||
        state.typewriterIntroStarted ||
        state.typewriterIntroPhase === "done") return;
    state.typewriterIntroStarted = true;

    if (state.typewriterIntroPhase === "hold") {
      typewriterIntroTimer = setTimeout(
        fadeTypewriterIntro, TYPEWRITER_INTRO_HOLD_MS);
      return;
    }

    const typeNext = () => {
      if (state.typewriterIntroPhase !== "typing") return;
      const character = TYPEWRITER_INTRO_TEXT[state.typewriterIntroCount];
      state.typewriterIntroCount += 1;
      const label = typewriterIntroWrap?.querySelector(
        "[data-read-typewriter-intro-text]");
      if (label) label.innerHTML = renderTypingIntroText(
        state.typewriterIntroCount);
      if (!/\s/u.test(character)) playKeySound();

      if (state.typewriterIntroCount >= TYPEWRITER_INTRO_TEXT.length) {
        state.typewriterIntroPhase = "hold";
        typewriterIntroTimer = setTimeout(
          fadeTypewriterIntro, TYPEWRITER_INTRO_HOLD_MS);
      } else {
        typewriterIntroTimer = setTimeout(typeNext, TYPEWRITER_INTRO_KEY_MS);
      }
    };
    typewriterIntroTimer = setTimeout(typeNext, TYPEWRITER_INTRO_KEY_MS);
  }

  function scheduleTypewriterIntro(wrap) {
    if (state.typewriterIntroPhase === "done") return;
    typewriterIntroWrap = wrap;
    const begin = () => {
      if (typewriterIntroWrap === wrap && wrap.isConnected) {
        startTypewriterIntro();
      }
    };
    root.requestAnimationFrame?.(begin);
    // A second chance for slides that mount after the first animation frame.
    root.setTimeout(begin, 120);
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
    // Both typing activities display their instruction just once at launch.
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
    // The intro shares the fitted verse size, including when fit is cached.
    wrap.querySelector("[data-read-typewriter-intro]")
      ?.style.setProperty("--typewriter-intro-font-size", `${cache.fontSize}px`);
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
    // Keep the introduction matched to the real verse on every refit/resize.
    wrap.querySelector("[data-read-typewriter-intro]")
      ?.style.setProperty("--typewriter-intro-font-size", `${fontSize}px`);
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
    const hasIntro = state.typewriterIntroPhase !== "done";

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
        </header>
        <section class="learn-stage read-keyboard-terminal${hasIntro ? " is-intro-active" : ""}" aria-label="${escapeHtml(verse.verseText)}">
          <div class="smart-learn-text read-keyboard-fit" data-read-typing-fit>
            <div class="smart-learn-body read-keyboard-body" aria-hidden="true">${renderVerseHtml()}</div>
          </div>
          ${hasIntro ? `<div class="read-typewriter-intro read-keyboard-intro" data-read-typewriter-intro>
            <div class="read-typewriter-intro-line">
              <span class="read-typewriter-intro-guide" aria-hidden="true">${renderTypingIntroText(TYPEWRITER_INTRO_TEXT.length)}</span>
              <span class="read-typewriter-intro-text" data-read-typewriter-intro-text>${renderTypingIntroText(state.typewriterIntroCount)}</span>
            </div>
          </div>` : ""}
        </section>
      </main>
    `;

    const stage = wrap.querySelector(
      "[data-read-type-area]"
    );
    const activate = (event) => {
      event?.preventDefault?.();
      // While the intro is being typed, taps must not skip letters or
      // advance the verse. Once it finishes, a tap can begin normally.
      if (state.typewriterIntroPhase === "typing") return;
      if (state.typewriterIntroPhase !== "done") {
        stopKeySoundVoices();
        finishTypewriterIntro();
      }
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
    if (hasIntro) scheduleTypewriterIntro(wrap);

    return appApi.makeSlide({
      idx,
      bg: "#000000",
      navHidden: true,
      inner: wrap
    });
  }

  // Compare the largest fitting font *for each row count*, not just the
  // first layout that fits. An extra line is worthwhile when it makes the
  // text at least 10% larger; otherwise keep the more compact layout.
  function chooseScrambleFit({ maxSize, maxRows, availableWidth,
    availableHeight, measureWidths }) {
    let best = null;
    for (let rows = 1; rows <= maxRows; rows += 1) {
      for (let size = maxSize; size >= 22; size -= 2) {
        const gap = Math.max(6, Math.min(16, size * .19));
        const rowHeight = size * 1.4;
        const rowGap = Math.max(9, Math.min(22, size * .22));
        if (rows * rowHeight + (rows - 1) * rowGap > availableHeight) continue;
        const candidate = balanceScrambleRows(
          measureWidths(size), availableWidth, gap, rows
        );
        if (!candidate) continue;
        // Only switch to a taller layout for a visible readability gain.
        if (!best || size >= best.size * 1.10) {
          best = { size, gap, rowGap, lines: candidate.lines,
            cost: candidate.score };
        }
        // Smaller sizes of this same row count cannot improve the result.
        break;
      }
    }
    return best;
  }

  // Fit the largest comfortable Titan One words into balanced rows.
  // Measure both solved and scrambled spellings, keeping rows stable on tap.
  function layoutScrambleWords(wrap) {
    if (!wrap.isConnected || state.activityId !== UNSCRAMBLE_ACTIVITY_ID) return;
    const area = wrap.querySelector(".read-unscramble-words");
    const tokens = state.activityData?.tokens || [];
    if (!area || !tokens.length) return;
    const elements = Array.from(area.querySelectorAll(".read-unscramble-token"));
    if (elements.length !== tokens.length) return;
    const style = root.getComputedStyle(area);
    const availableWidth = area.clientWidth - parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight) - 2;
    const availableHeight = area.clientHeight - parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) - 2;
    if (!(availableWidth > 0 && availableHeight > 0)) return;
    const canvas = root.document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    // Allow long standalone words to grow when a third row makes room.
    const maxSize = Math.min(82, Math.max(50, Math.round(availableWidth * .25)));
    const maxRows = Math.min(tokens.length, Math.max(3, Math.ceil(tokens.length / 2)));
    const best = chooseScrambleFit({
      maxSize, maxRows, availableWidth, availableHeight,
      measureWidths: (size) => {
        context.font = `${size}px "Titan One"`;
        return tokens.map((token) => {
          const original = token.leading + token.core + token.trailing;
          const mixed = token.leading + token.scrambled + token.trailing;
          return Math.ceil(Math.max(context.measureText(original).width,
            context.measureText(mixed).width) + size * .56 + 6);
        });
      }
    });
    if (!best) return;
    area.style.setProperty("--read-scramble-font-size", `${best.size}px`);
    area.style.setProperty("--read-scramble-row-gap", `${best.rowGap}px`);
    area.style.setProperty("--read-scramble-word-gap", `${best.gap}px`);
    // Recreate only the row wrappers; the interactive buttons retain handlers.
    const fragment = root.document.createDocumentFragment();
    best.lines.forEach(([from, to]) => {
      const row = root.document.createElement("div");
      row.className = "read-unscramble-line";
      for (let index = from; index < to; index += 1) {
        row.appendChild(elements[index]);
      }
      fragment.appendChild(row);
    });
    area.replaceChildren(fragment);
    area.classList.add("is-layout-ready");
  }

  function scheduleScrambleLayout(wrap) {
    const schedule = () => root.requestAnimationFrame?.(() =>
      layoutScrambleWords(wrap)
    );
    schedule();
    // WebKit may initially lay out the fallback font. Refit after Titan One
    // is loaded, and only while this particular screen remains mounted.
    root.document.fonts?.load?.('48px "Titan One"')?.then?.(
      schedule, schedule
    );
  }

  // Share Scramble's font/line solver; order is the *shuffled* display order,
  // never the verse order. Solved words stay in their original row slots.
  function layoutTapOrderWords(wrap) {
    if (!wrap.isConnected || state.activityId !== TAP_WORDS_ORDER_ACTIVITY_ID) return;
    const area = wrap.querySelector(".read-order-grid");
    const data = state.activityData;
    if (!area || !data?.tokens?.length) return;
    const elements = Array.from(area.querySelectorAll(".read-order-tile"));
    if (elements.length !== data.displayOrder.length) return;
    const style = root.getComputedStyle(area);
    const availableWidth = area.clientWidth - parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight) - 2;
    const availableHeight = area.clientHeight - parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) - 2;
    if (!(availableWidth > 0 && availableHeight > 0)) return;
    const context = root.document.createElement("canvas").getContext("2d");
    if (!context) return;
    const words = data.displayOrder.map((id) =>
      getTapOrderDisplayWord(data.tokens.find((token) => token.id === id))
    );
    const maxSize = Math.min(82, Math.max(50, Math.round(availableWidth * .25)));
    const maxRows = Math.min(words.length, Math.max(3, Math.ceil(words.length / 2)));
    const best = chooseScrambleFit({
      maxSize, maxRows, availableWidth, availableHeight,
      measureWidths: (size) => {
        context.font = `${size}px "Titan One"`;
        return words.map((word) =>
          Math.ceil(context.measureText(word).width + size * .56 + 6)
        );
      }
    });
    if (!best) return;
    area.style.setProperty("--read-order-font-size", `${best.size}px`);
    area.style.setProperty("--read-order-row-gap", `${best.rowGap}px`);
    area.style.setProperty("--read-order-word-gap", `${best.gap}px`);
    const fragment = root.document.createDocumentFragment();
    best.lines.forEach(([from, to]) => {
      const row = root.document.createElement("div");
      row.className = "read-order-line";
      for (let index = from; index < to; index += 1) {
        row.appendChild(elements[index]);
      }
      fragment.appendChild(row);
    });
    area.replaceChildren(fragment);
    area.classList.add("is-layout-ready");
  }

  function scheduleTapOrderLayout(wrap) {
    const schedule = () => root.requestAnimationFrame?.(() =>
      layoutTapOrderWords(wrap)
    );
    schedule();
    root.document.fonts?.load?.('48px "Titan One"')?.then?.(
      schedule, schedule
    );
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
            ${escapeHtml(getTapOrderDisplayWord(token))}
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
        </header>
        <section class="${isUnscramble ? "read-unscramble-words" : "read-order-grid"}" aria-label="${escapeHtml(state.chunks[state.chunkIndex] || "")}">
          ${isUnscramble ? renderUnscrambleTokensHtml() : renderTapOrderTilesHtml()}
        </section>
      </main>
    `;

    if (isUnscramble) {
      wrap.querySelectorAll(
        "[data-read-unscramble-token]"
      ).forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          const rect = button.getBoundingClientRect();
          if (!handleUnscrambleTap(button.dataset.readUnscrambleToken)) return;
          burstScrambleRainbow(rect);
          const count = state.activityData?.tokens.filter(
            (item) => item.required && item.solved
          ).length || 1;
          const complete = state.activityData?.tokens.every(
            (item) => !item.required || item.solved
          );
          playScrambleReward(count, complete);
        };
      });
    } else {
      wrap.querySelectorAll(
        "[data-read-order-token]"
      ).forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          const rect = button.getBoundingClientRect();
          const fontSize = root.getComputedStyle(button).fontSize;
          const word = button.textContent;
          if (!handleTapOrderTap(button.dataset.readOrderToken)) return;
          const data = state.activityData;
          vanishOrderWord(rect, word, fontSize);
          playOrderTone(data.nextIndex, data.nextIndex >= data.tokens.length);
        };
      });
    }

    bindExitButton(wrap);

    const slide = appApi.makeSlide({
      idx,
      bg: isUnscramble
        ? "#f3b84b"
        : "#5b4fbd",
      navHidden: true,
      inner: wrap
    });
    if (isUnscramble) scheduleScrambleLayout(wrap);
    else scheduleTapOrderLayout(wrap);
    return slide;
  }

  function chunkSequenceColorStyle(color) {
    return [
      `--chunk-button-color:${color?.value || "#40b9c5"}`,
      `--chunk-button-light:${color?.light || "#79d4dc"}`,
      `--chunk-button-dark:${color?.dark || "#238e99"}`,
      `--chunk-button-deep:${color?.deep || "#0d454b"}`
    ].join(";");
  }

  function showChunkSequenceNumbers(data) {
    return data?.mode === "easy" &&
      ["challenge", "feedback"].includes(data?.phase);
  }

  function renderChunkSequenceProgressHtml() {
    const data = state.activityData;
    const inChallenge = [
      "challenge",
      "feedback"
    ].includes(data?.phase);

    const dots = state.chunks.map((_, index) => {
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
    });

    // Always use the same rows for a given chunk count. Seven is 4 + 3;
    // eight is 4 + 4. These do not change as progress colors update.
    const rowSize = dots.length >= 7 ? 4 :
      dots.length >= 5 ? 3 : dots.length;
    const rows = [];
    for (let index = 0; index < dots.length; index += rowSize) {
      rows.push(`
        <div class="read-chunk-sequence-progress-row">
          ${dots.slice(index, index + rowSize).join("")}
        </div>
      `);
    }
    return rows.join("");
  }

  function renderChunkSequenceButtonsHtml() {
    const data = state.activityData;
    const interactive = [
      "explore",
      "ready",
      "challenge"
    ].includes(data?.phase);
    const showNumbers = showChunkSequenceNumbers(data);

    return (data?.buttonOrder || [])
      .map((chunkIndex, visualIndex) => {
        const color = data.colors[chunkIndex];
        const active =
          data.activeButtonIndex ===
          chunkIndex;
        const fading =
          data.fadeButtonIndex === chunkIndex && !active;
        const helped =
          data.helpActive &&
          data.challengeIndex ===
            chunkIndex;
        const classes = [
          "read-chunk-arcade-button",
          active ? "is-pushed" : "",
          fading ? "is-glow-fading" : "",
          helped ? "is-helped" : "",
          color?.id === "yellow" ? "is-yellow" : "",
          color?.id === "light_gray"
            ? "is-light-gray"
            : ""
        ].filter(Boolean).join(" ");

        return `
          <button class="${classes}" type="button" data-read-chunk-button="${chunkIndex}" data-no-ui-sound style="${chunkSequenceColorStyle(color)}"${!interactive || data.activeButtonIndex >= 0 ? " disabled" : ""} aria-label="${showNumbers ? `Chunk ${chunkIndex + 1}` : `Audio button ${visualIndex + 1}`}${active ? ", playing" : ""}">
            <span class="read-chunk-arcade-gloss" aria-hidden="true"></span>
            ${showNumbers ? `<span class="read-chunk-arcade-number" aria-hidden="true">${chunkIndex + 1}</span>` : ""}
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
          </button>
          <button type="button" data-read-sequence-mode="hard" data-no-ui-sound>
            <strong>Hard</strong>
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
        <div class="read-chunk-sequence-guidance">
          <div class="read-chunk-sequence-instruction" aria-live="polite">${escapeHtml(instruction)}</div>
          <div class="read-chunk-sequence-actions">
            ${renderChunkSequenceActionsHtml()}
          </div>
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
    const hasIntro = state.typewriterIntroPhase !== "done";

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
        <section class="learn-stage read-typewriter-paper${hasIntro ? " is-intro-active" : ""}" aria-label="${escapeHtml(verse.verseText)}">
          <div class="smart-learn-text read-typewriter-fit" data-read-typing-fit>
            <div class="smart-learn-body read-typewriter-body" aria-hidden="true">${renderVerseHtml()}</div>
          </div>
          ${hasIntro ? `<div class="read-typewriter-intro" data-read-typewriter-intro>
            <div class="read-typewriter-intro-line">
              <span class="read-typewriter-intro-guide" aria-hidden="true">${renderTypingIntroText(TYPEWRITER_INTRO_TEXT.length)}</span>
              <span class="read-typewriter-intro-text" data-read-typewriter-intro-text>${renderTypingIntroText(state.typewriterIntroCount)}</span>
            </div>
          </div>` : ""}
        </section>
      </main>
    `;

    const stage = wrap.querySelector(
      "[data-read-type-area]"
    );
    const activate = (event) => {
      event?.preventDefault?.();
      // While the intro is being typed, taps must not skip letters or
      // advance the verse. Once it finishes, a tap can begin normally.
      if (state.typewriterIntroPhase === "typing") return;
      if (state.typewriterIntroPhase !== "done") {
        // This same tap dismisses the cutscene AND types the first letter.
        stopKeySoundVoices();
        finishTypewriterIntro();
      }
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
    if (hasIntro) scheduleTypewriterIntro(wrap);

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
      typewriterIntroPhase: state.typewriterIntroPhase,
      typewriterIntroCount: state.typewriterIntroCount,
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
    getFishMotion,
    getFishWordLayout,
    fishWordTracksOverlap,
    getFishHookPlacement,
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
    showChunkSequenceNumbers,
    markChunkSequenceExplored,
    splitWordToken,
    tokenizeChunkWords,
    canScrambleCore,
    scrambleCore,
    buildUnscramblePuzzle,
    balanceScrambleRows,
    chooseScrambleFit,
    buildTapOrderPuzzle,
    getTapOrderDisplayWord,
    applyTapOrderChoice,
    isChunkEligible,
    selectActivityChunks,
    isActivityEligibleForVerse,
    validateContext
  });
});
