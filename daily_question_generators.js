(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.BibloZooDailyQuestionGenerators = api;
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const ScrambleSafety = typeof module === "object" && module.exports
    ? require("./safe_word_scramble.js")
    : window.BibloZooSafeWordScramble;

  const CONTEXT_WORD_LIMIT = 7;
  const ANDYMOJI_BASE =
    "./verse_images/andymoji/";
  const AUDIO_BASE = "./verse_audio/";

  const GENERATOR_TYPES = Object.freeze([
    "missing_word",
    "scrambled_word",
    "imposter_word",
    "picture",
    "reference",
    "doesnt_belong",
    "first_word",
    "last_word",
    "does_this_belong",
    "sounds_like"
  ]);

  const GENERATOR_DEFINITIONS =
    Object.freeze({
      missing_word: Object.freeze({
        id: "missing_word",
        title: "Missing Word"
      }),
      scrambled_word: Object.freeze({
        id: "scrambled_word",
        title: "Scrambled Word"
      }),
      imposter_word: Object.freeze({
        id: "imposter_word",
        title: "Imposter Word"
      }),
      picture: Object.freeze({
        id: "picture",
        title: "Picture"
      }),
      reference: Object.freeze({
        id: "reference",
        title: "Reference"
      }),
      doesnt_belong: Object.freeze({
        id: "doesnt_belong",
        title: "Doesn’t Belong"
      }),
      first_word: Object.freeze({
        id: "first_word",
        title: "First Word"
      }),
      last_word: Object.freeze({
        id: "last_word",
        title: "Last Word"
      }),
      does_this_belong: Object.freeze({
        id: "does_this_belong",
        title: "Does This Belong?"
      }),
      sounds_like: Object.freeze({
        id: "sounds_like",
        title: "Sounds Like?"
      })
    });

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  function normalizeComparison(value) {
    return Array.from(
      String(value ?? "")
        .normalize("NFKD")
        .toLocaleLowerCase()
    )
      .filter((character) =>
        /[\p{L}\p{N}]/u.test(character)
      )
      .join("");
  }

  function tokenizeWords(text) {
    const source = String(text ?? "");
    const expression =
      /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
    const tokens = [];
    let match = null;

    while ((match = expression.exec(source))) {
      const raw = match[0];
      const normalized =
        normalizeComparison(raw);

      if (!normalized) continue;

      tokens.push({
        index: tokens.length,
        raw,
        normalized,
        start: match.index,
        end: match.index + raw.length
      });
    }

    return tokens;
  }

  function uniqueTokens(tokens) {
    const seen = new Set();

    return (Array.isArray(tokens) ? tokens : [])
      .filter((token) => {
        const key = cleanString(
          token?.normalized
        );
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  function hashSeed(value) {
    const text = String(value ?? "0");
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function createSeededRandom(seed = "0") {
    let value = hashSeed(seed) || 0x6d2b79f5;

    return function seededRandom() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(
        result ^ (result >>> 15),
        result | 1
      );
      result ^= result + Math.imul(
        result ^ (result >>> 7),
        result | 61
      );
      return (
        (result ^ (result >>> 14)) >>> 0
      ) / 4294967296;
    };
  }

  function normalizeRandomValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(
      0,
      Math.min(0.999999999, number)
    );
  }

  function resolveRandom({
    random = null,
    seed = "0"
  } = {}) {
    return typeof random === "function"
      ? () => normalizeRandomValue(random())
      : createSeededRandom(seed);
  }

  function randomIndex(length, random) {
    if (!length) return -1;
    return Math.floor(
      normalizeRandomValue(random()) * length
    );
  }

  function chooseRandom(values, random) {
    const list = Array.isArray(values)
      ? values
      : [];
    const index = randomIndex(
      list.length,
      random
    );
    return index >= 0 ? list[index] : null;
  }

  function shuffle(values, random) {
    const result = [
      ...(Array.isArray(values) ? values : [])
    ];

    for (
      let index = result.length - 1;
      index > 0;
      index -= 1
    ) {
      const swapIndex = randomIndex(
        index + 1,
        random
      );
      [result[index], result[swapIndex]] =
        [result[swapIndex], result[index]];
    }

    return result;
  }

  function makeTextChoice(label) {
    return {
      kind: "text",
      label: cleanString(label)
    };
  }

  function arrangeChoices(
    choices,
    correctKey,
    random
  ) {
    const ordered = shuffle(choices, random);
    const answer = ordered.findIndex(
      (choice) => choice.key === correctKey
    );

    return {
      choices: ordered.map((choice) => {
        const { key, ...safeChoice } = choice;
        return safeChoice;
      }),
      answer
    };
  }

  function ineligible(type, reason) {
    return {
      eligible: false,
      type,
      reason: cleanString(reason) ||
        "This question type is not available for this verse."
    };
  }

  function eligible(type, question) {
    return {
      eligible: true,
      type,
      reason: "",
      question
    };
  }

  function getVerseId(verse) {
    return cleanString(
      verse?.verseId || verse?.id
    );
  }

  function getVerseText(verse) {
    return cleanString(verse?.verseText);
  }

  function getVerseRef(verse) {
    return cleanString(verse?.ref);
  }

  function getPublishedVerses(verses) {
    return (Array.isArray(verses) ? verses : [])
      .filter((verse) =>
        verse &&
        verse.published !== false &&
        getVerseId(verse) &&
        getVerseText(verse)
      );
  }

  function getOtherVerses(verse, verses) {
    const verseId = getVerseId(verse);
    return getPublishedVerses(verses)
      .filter((candidate) =>
        getVerseId(candidate) !== verseId
      );
  }

  function getContextBounds(
    tokenCount,
    targetIndex,
    limit = CONTEXT_WORD_LIMIT
  ) {
    const count = Math.max(
      0,
      Number(tokenCount) || 0
    );
    const safeLimit = Math.max(
      1,
      Math.min(count, Number(limit) || 1)
    );
    const target = Math.max(
      0,
      Math.min(count - 1, targetIndex)
    );
    let start = Math.max(0, target - 3);
    let end = Math.min(count, start + safeLimit);

    start = Math.max(0, end - safeLimit);

    return { start, end };
  }

  function buildContextWindow(
    text,
    tokens,
    targetIndex,
    replacement
  ) {
    const list = Array.isArray(tokens)
      ? tokens
      : tokenizeWords(text);
    const target = list[targetIndex];
    if (!target) return null;

    const bounds = getContextBounds(
      list.length,
      targetIndex,
      CONTEXT_WORD_LIMIT
    );
    const first = list[bounds.start];
    const last = list[bounds.end - 1];
    if (!first || !last) return null;

    const source = String(text ?? "");
    const before = source.slice(
      first.start,
      target.start
    );
    const after = source.slice(
      target.end,
      last.end
    );

    return {
      segments: [
        ...(before
          ? [{ text: before, accent: false }]
          : []),
        {
          text: String(replacement ?? target.raw),
          accent: true
        },
        ...(after
          ? [{ text: after, accent: false }]
          : [])
      ],
      wordCount: bounds.end - bounds.start,
      targetWordIndex: targetIndex,
      startWordIndex: bounds.start,
      endWordIndex: bounds.end - 1
    };
  }

  function maskWord(value) {
    // Target tokens contain only word characters and optional apostrophes.
    // All targets use a fixed-length clue; punctuation outside the token
    // remains intact in the original context window.
    return "???";
  }

  function canScrambleWord(value) {
    const letters = Array.from(
      String(value ?? "")
    ).filter((character) =>
      /[\p{L}\p{N}]/u.test(character)
    );

    return letters.length >= 2 &&
      new Set(
        letters.map((letter) =>
          letter.toLocaleLowerCase()
        )
      ).size > 1;
  }

  function scrambleWord(value, random) {
    const characters = Array.from(
      String(value ?? "")
    );
    const positions = characters
      .map((character, index) =>
        /[\p{L}\p{N}]/u.test(character)
          ? index
          : -1
      )
      .filter((index) => index >= 0);
    const original = positions.map(
      (index) => characters[index]
    );

    if (!canScrambleWord(value)) return "";

    const isAcceptable = (candidate) =>
      candidate.join("") !== original.join("") &&
      ScrambleSafety?.isSafeWord(candidate.join("")) === true;

    let scrambled = original;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate = shuffle(original, random);
      if (isAcceptable(candidate)) {
        scrambled = candidate;
        break;
      }
    }

    if (scrambled.join("") === original.join("")) {
      for (let shift = 1; shift < original.length; shift += 1) {
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
      return "";
    }

    const result = [...characters];
    positions.forEach((position, index) => {
      result[position] = scrambled[index];
    });
    return result.join("");
  }

  function resolveHidePlanEntries(verse) {
    const tokens = tokenizeWords(
      getVerseText(verse)
    );

    return (Array.isArray(verse?.hidePlan)
      ? verse.hidePlan
      : [])
      .map((entry, planIndex) => {
        const word = cleanString(entry?.word);
        const normalized =
          normalizeComparison(word);
        const occurrence = Math.max(
          1,
          Math.floor(Number(entry?.occurrence) || 1)
        );
        let seen = 0;
        const token = tokens.find((candidate) => {
          if (candidate.normalized !== normalized) {
            return false;
          }
          seen += 1;
          return seen === occurrence;
        });

        if (!token) return null;

        return {
          planIndex,
          type: cleanString(entry?.type),
          word,
          normalized,
          occurrence,
          tokenIndex: token.index,
          emoji: cleanString(entry?.emoji),
          image: cleanString(entry?.image)
        };
      })
      .filter(Boolean);
  }

  function getVisualHidePlanEntries(verse) {
    const seen = new Set();

    return resolveHidePlanEntries(verse)
      .map((entry) => {
        if (entry.type === "emoji" && entry.emoji) {
          return {
            ...entry,
            visualKey: `emoji:${entry.emoji}`,
            choice: {
              kind: "emoji",
              emoji: entry.emoji,
              label: entry.word
            }
          };
        }

        if (entry.type === "image" && entry.image) {
          return {
            ...entry,
            visualKey: `image:${entry.image}`,
            choice: {
              kind: "image",
              src: `${ANDYMOJI_BASE}${entry.image}.png`,
              label: entry.word
            }
          };
        }

        return null;
      })
      .filter((entry) => {
        if (!entry || seen.has(entry.visualKey)) {
          return false;
        }
        seen.add(entry.visualKey);
        return true;
      });
  }

  function getTargetCandidates(
    verse,
    {
      minimumLength = 1,
      requireScramble = false
    } = {}
  ) {
    const tokens = tokenizeWords(
      getVerseText(verse)
    );
    const preferredIndices = new Set(
      resolveHidePlanEntries(verse)
        .map((entry) => entry.tokenIndex)
    );
    const eligible = tokens.filter((token) =>
      Array.from(token.normalized).length >= minimumLength &&
      (!requireScramble ||
        canScrambleWord(token.raw))
    );
    const preferred = eligible.filter(
      (token) => preferredIndices.has(token.index)
    );

    return {
      tokens,
      preferred,
      eligible
    };
  }

  function chooseTarget(
    verse,
    options,
    random
  ) {
    const candidates = getTargetCandidates(
      verse,
      options
    );
    const pool = candidates.preferred.length
      ? candidates.preferred
      : candidates.eligible;

    return {
      tokens: candidates.tokens,
      target: chooseRandom(pool, random)
    };
  }

  function chooseSameVerseDecoys(
    tokens,
    excluded,
    count,
    random
  ) {
    const excludedSet = new Set(
      (Array.isArray(excluded) ? excluded : [])
        .map(normalizeComparison)
        .filter(Boolean)
    );
    const pool = uniqueTokens(tokens)
      .filter((token) =>
        !excludedSet.has(token.normalized)
      );

    return shuffle(pool, random)
      .slice(0, count);
  }

  function buildWordQuestion({
    type,
    prompt,
    verse,
    tokens,
    target,
    replacement,
    choices,
    correctKey,
    random,
    metadata = {}
  }) {
    const arranged = arrangeChoices(
      choices,
      correctKey,
      random
    );
    const context = buildContextWindow(
      getVerseText(verse),
      tokens,
      target.index,
      replacement
    );

    if (!context || arranged.answer < 0) {
      return ineligible(
        type,
        "A safe context and answer set could not be built."
      );
    }

    return eligible(type, {
      kind: "choice",
      type,
      prompt,
      context,
      choices: arranged.choices,
      answer: arranged.answer,
      showReferencePill: true,
      media: null,
      metadata: {
        verseId: getVerseId(verse),
        targetWord: target.raw,
        targetNormalized: target.normalized,
        ...metadata
      }
    });
  }

  function generateMissingWord(
    verse,
    verses,
    random
  ) {
    const type = "missing_word";
    const selected = chooseTarget(
      verse,
      { minimumLength: 1 },
      random
    );
    if (!selected.target) {
      return ineligible(type, "No usable target word was found.");
    }
    const decoys = chooseSameVerseDecoys(
      selected.tokens,
      [selected.target.raw],
      2,
      random
    );
    if (decoys.length < 2) {
      return ineligible(type, "Three distinct verse words are required.");
    }
    const correctKey =
      `word:${selected.target.normalized}`;
    const choices = [selected.target, ...decoys]
      .map((token) => ({
        key: `word:${token.normalized}`,
        ...makeTextChoice(token.raw)
      }));

    return buildWordQuestion({
      type,
      prompt: "What is the missing word?",
      verse,
      tokens: selected.tokens,
      target: selected.target,
      replacement: maskWord(selected.target.raw),
      choices,
      correctKey,
      random,
      metadata: {
        maskedWord:
          maskWord(selected.target.raw)
      }
    });
  }

  function generateScrambledWord(
    verse,
    verses,
    random
  ) {
    const type = "scrambled_word";
    let selected = null;

    for (const minimumLength of [4, 3, 2]) {
      const candidate = chooseTarget(
        verse,
        {
          minimumLength,
          requireScramble: true
        },
        random
      );
      if (candidate.target) {
        selected = candidate;
        break;
      }
    }

    if (!selected?.target) {
      return ineligible(type, "No verse word can be visibly scrambled.");
    }

    const scrambled = scrambleWord(
      selected.target.raw,
      random
    );
    const decoys = chooseSameVerseDecoys(
      selected.tokens,
      [selected.target.raw],
      2,
      random
    );

    if (!scrambled || decoys.length < 2) {
      return ineligible(type, "A distinct scramble and three choices are required.");
    }

    const correctKey =
      `word:${selected.target.normalized}`;
    const choices = [selected.target, ...decoys]
      .map((token) => ({
        key: `word:${token.normalized}`,
        ...makeTextChoice(token.raw)
      }));

    return buildWordQuestion({
      type,
      prompt: "What is the scrambled word?",
      verse,
      tokens: selected.tokens,
      target: selected.target,
      replacement: scrambled,
      choices,
      correctKey,
      random,
      metadata: {
        scrambledWord: scrambled
      }
    });
  }

  function generateImposterWord(
    verse,
    verses,
    random
  ) {
    const type = "imposter_word";
    const selected = chooseTarget(
      verse,
      { minimumLength: 1 },
      random
    );
    if (!selected.target) {
      return ineligible(type, "No usable target word was found.");
    }

    const alternatives = chooseSameVerseDecoys(
      selected.tokens,
      [selected.target.raw],
      2,
      random
    );
    if (alternatives.length < 2) {
      return ineligible(type, "Three distinct verse words are required.");
    }

    const imposter = alternatives[0];
    const other = alternatives[1];
    const correctKey =
      `word:${selected.target.normalized}`;
    const choices = [
      selected.target,
      imposter,
      other
    ].map((token) => ({
      key: `word:${token.normalized}`,
      ...makeTextChoice(token.raw)
    }));

    return buildWordQuestion({
      type,
      prompt: "Which word should be here?",
      verse,
      tokens: selected.tokens,
      target: selected.target,
      replacement: imposter.raw,
      choices,
      correctKey,
      random,
      metadata: {
        imposterWord: imposter.raw,
        imposterNormalized:
          imposter.normalized
      }
    });
  }

  function generatePicture(
    verse,
    verses,
    random
  ) {
    const type = "picture";
    const visuals =
      getVisualHidePlanEntries(verse);
    if (visuals.length < 3) {
      return ineligible(type, "Three distinct Hide Plan visuals are required.");
    }

    const selected = chooseRandom(
      visuals,
      random
    );
    const decoys = shuffle(
      visuals.filter((entry) =>
        entry.visualKey !== selected.visualKey
      ),
      random
    ).slice(0, 2);
    const tokens = tokenizeWords(
      getVerseText(verse)
    );
    const target = tokens[
      selected.tokenIndex
    ];
    if (!target || decoys.length < 2) {
      return ineligible(type, "A visual target and two visual decoys are required.");
    }

    const choices = [selected, ...decoys]
      .map((entry) => ({
        key: entry.visualKey,
        ...entry.choice
      }));

    return buildWordQuestion({
      type,
      prompt: "Which picture is the missing word?",
      verse,
      tokens,
      target,
      replacement: maskWord(target.raw),
      choices,
      correctKey: selected.visualKey,
      random,
      metadata: {
        visualKey: selected.visualKey,
        hidePlanIndex: selected.planIndex
      }
    });
  }

  function generateReference(
    verse,
    verses,
    random
  ) {
    const type = "reference";
    const correctRef = getVerseRef(verse);
    if (!correctRef) {
      return ineligible(type, "The verse has no reference.");
    }
    const otherRefs = [];
    const seen = new Set([
      normalizeComparison(correctRef)
    ]);

    shuffle(
      getOtherVerses(verse, verses),
      random
    ).forEach((candidate) => {
      const ref = getVerseRef(candidate);
      const key = normalizeComparison(ref);
      if (!ref || !key || seen.has(key)) return;
      seen.add(key);
      otherRefs.push({
        ref,
        verseId: getVerseId(candidate)
      });
    });

    if (otherRefs.length < 2) {
      return ineligible(type, "Two other published verse references are required.");
    }

    const correctKey = `ref:${getVerseId(verse)}`;
    const choices = [
      {
        key: correctKey,
        ...makeTextChoice(correctRef)
      },
      ...otherRefs.slice(0, 2).map(
        (candidate) => ({
          key: `ref:${candidate.verseId}`,
          ...makeTextChoice(candidate.ref)
        })
      )
    ];
    const arranged = arrangeChoices(
      choices,
      correctKey,
      random
    );

    return eligible(type, {
      kind: "choice",
      type,
      prompt: "Where is my verse found in the Bible?",
      context: null,
      choices: arranged.choices,
      answer: arranged.answer,
      showReferencePill: false,
      media: null,
      metadata: {
        verseId: getVerseId(verse),
        correctReference: correctRef,
        decoyVerseIds:
          otherRefs.slice(0, 2)
            .map((candidate) =>
              candidate.verseId
            )
      }
    });
  }

  function getOutsiderCandidates(
    verse,
    verses
  ) {
    const targetWords = new Set(
      tokenizeWords(getVerseText(verse))
        .map((token) => token.normalized)
    );
    const seen = new Set();
    const candidates = [];

    getOtherVerses(verse, verses)
      .forEach((sourceVerse) => {
        const entries =
          resolveHidePlanEntries(sourceVerse);
        entries.forEach((entry) => {
          if (
            !entry.normalized ||
            targetWords.has(entry.normalized) ||
            seen.has(entry.normalized)
          ) {
            return;
          }
          seen.add(entry.normalized);
          candidates.push({
            word: entry.word,
            normalized: entry.normalized,
            sourceVerseId:
              getVerseId(sourceVerse)
          });
        });
      });

    return candidates;
  }

  function generateDoesntBelong(
    verse,
    verses,
    random
  ) {
    const type = "doesnt_belong";
    const targetTokens = uniqueTokens(
      tokenizeWords(getVerseText(verse))
    );
    const hideWords = new Set(
      resolveHidePlanEntries(verse)
        .map((entry) => entry.normalized)
    );
    const commonWords = new Set([
      "a", "an", "and", "are", "as", "at", "be", "but",
      "by", "for", "from", "he", "in", "is", "it", "of",
      "on", "or", "the", "to", "was", "were", "with"
    ]);
    const shuffled = shuffle(targetTokens, random);
    const targetChoices = [
      ...shuffled.filter((token) =>
        hideWords.has(token.normalized)
      ),
      ...shuffled.filter((token) =>
        token.normalized.length >= 4 &&
        !commonWords.has(token.normalized)
      ),
      ...shuffled
    ].filter((token, index, all) =>
      all.indexOf(token) === index
    ).slice(0, 2);
    const outsider = chooseRandom(
      getOutsiderCandidates(verse, verses),
      random
    );

    if (targetChoices.length < 2 || !outsider) {
      return ineligible(type, "Two verse words and one outside Hide Plan word are required.");
    }

    const correctKey =
      `outside:${outsider.normalized}`;
    const choices = [
      ...targetChoices.map((token) => ({
        key: `inside:${token.normalized}`,
        ...makeTextChoice(token.raw)
      })),
      {
        key: correctKey,
        ...makeTextChoice(outsider.word)
      }
    ];
    const arranged = arrangeChoices(
      choices,
      correctKey,
      random
    );

    return eligible(type, {
      kind: "choice",
      type,
      prompt: `Which word isn’t in ${getVerseRef(verse)}?`,
      context: null,
      choices: arranged.choices,
      answer: arranged.answer,
      showReferencePill: true,
      media: null,
      metadata: {
        verseId: getVerseId(verse),
        outsiderWord: outsider.word,
        outsiderNormalized:
          outsider.normalized,
        outsiderVerseId:
          outsider.sourceVerseId
      }
    });
  }

  function generateEdgeWord(
    type,
    verse,
    random
  ) {
    const tokens = tokenizeWords(
      getVerseText(verse)
    );
    const target = type === "first_word"
      ? tokens[0]
      : tokens[tokens.length - 1];

    if (!target) {
      return ineligible(type, "The verse has no usable word tokens.");
    }

    const decoys = chooseSameVerseDecoys(
      tokens,
      [target.raw],
      2,
      random
    );
    if (decoys.length < 2) {
      return ineligible(type, "Two distinct same-verse decoys are required.");
    }

    const correctKey =
      `word:${target.normalized}`;
    const arranged = arrangeChoices(
      [target, ...decoys].map((token) => ({
        key: `word:${token.normalized}`,
        ...makeTextChoice(token.raw)
      })),
      correctKey,
      random
    );
    const first = type === "first_word";

    return eligible(type, {
      kind: "choice",
      type,
      prompt:
        `What is the ${first ? "first" : "last"} word of ${getVerseRef(verse)}?`,
      context: null,
      choices: arranged.choices,
      answer: arranged.answer,
      showReferencePill: true,
      media: null,
      metadata: {
        verseId: getVerseId(verse),
        targetWord: target.raw,
        targetNormalized: target.normalized,
        edge: first ? "first" : "last"
      }
    });
  }

  function getChunks(verse) {
    const chunks = Array.isArray(verse?.echoParts)
      ? verse.echoParts
          .map(cleanString)
          .filter(Boolean)
      : [];

    return chunks.length
      ? chunks
      : (getVerseText(verse)
          ? [getVerseText(verse)]
          : []);
  }

  function getFalseChunkCandidates(
    verse,
    verses
  ) {
    const targetChunks = new Set(
      getChunks(verse)
        .map(normalizeComparison)
    );
    const candidates = [];
    const seen = new Set();

    getOtherVerses(verse, verses)
      .forEach((sourceVerse) => {
        getChunks(sourceVerse)
          .forEach((chunk) => {
            const normalized =
              normalizeComparison(chunk);
            if (
              !normalized ||
              targetChunks.has(normalized) ||
              seen.has(normalized)
            ) {
              return;
            }
            seen.add(normalized);
            candidates.push({
              chunk,
              sourceVerseId:
                getVerseId(sourceVerse)
            });
          });
      });

    return candidates;
  }

  function yesNoChoices(answerYes) {
    return {
      choices: [
        makeTextChoice("Yes"),
        makeTextChoice("No")
      ],
      answer: answerYes ? 0 : 1
    };
  }

  function generateDoesThisBelong(
    verse,
    verses,
    random
  ) {
    const type = "does_this_belong";
    const targetChunks = getChunks(verse);
    const falseChunks =
      getFalseChunkCandidates(verse, verses);
    if (!targetChunks.length || !falseChunks.length) {
      return ineligible(type, "A target chunk and a different verse chunk are required.");
    }

    const belongs = random() < 0.5;
    const selected = belongs
      ? {
          chunk: chooseRandom(
            targetChunks,
            random
          ),
          sourceVerseId: getVerseId(verse)
        }
      : chooseRandom(falseChunks, random);
    const arranged = yesNoChoices(
      belongs,
      random
    );

    return eligible(type, {
      kind: "choice",
      type,
      prompt: `Is this from ${getVerseRef(verse)}?`,
      context: {
        segments: [
          { text: selected.chunk, accent: true }
        ],
        wordCount:
          tokenizeWords(selected.chunk).length
      },
      choices: arranged.choices,
      answer: arranged.answer,
      showReferencePill: true,
      media: null,
      metadata: {
        verseId: getVerseId(verse),
        belongs,
        sourceVerseId:
          selected.sourceVerseId,
        chunk: selected.chunk
      }
    });
  }

  function generateSoundsLike(
    verse,
    verses,
    random
  ) {
    const type = "sounds_like";
    const hasChunks = (candidate) =>
      Array.isArray(candidate?.echoParts) &&
      candidate.echoParts.length >= 1 &&
      candidate.echoParts.length <= 8 &&
      candidate.echoParts.every((chunk) => cleanString(chunk));
    const others = getOtherVerses(verse, verses)
      .filter(hasChunks);
    if (!getVerseId(verse) || !hasChunks(verse) || !others.length) {
      return ineligible(type, "Two verses with chunk recordings are required.");
    }

    const belongs = random() < 0.5;
    const sourceVerse = belongs
      ? verse
      : chooseRandom(others, random);
    const sourceVerseId = getVerseId(sourceVerse);
    const chunkIndex = randomIndex(
      sourceVerse.echoParts.length, random
    );
    const suffix = String.fromCharCode(97 + chunkIndex);
    const chunkAudio = `${AUDIO_BASE}${sourceVerseId}${suffix}.mp3`;
    const arranged = yesNoChoices(
      belongs,
      random
    );

    return eligible(type, {
      kind: "choice",
      type,
      prompt: `Is this from ${getVerseRef(verse)}?`,
      context: null,
      choices: arranged.choices,
      answer: arranged.answer,
      showReferencePill: true,
      media: {
        kind: "audio",
        src: chunkAudio,
        sourceVerseId,
        chunkIndex,
        belongs
      },
      metadata: {
        verseId: getVerseId(verse),
        belongs,
        sourceVerseId,
        chunkIndex,
        chunkText: sourceVerse.echoParts[chunkIndex]
      }
    });
  }

  const GENERATORS = Object.freeze({
    missing_word: generateMissingWord,
    scrambled_word: generateScrambledWord,
    imposter_word: generateImposterWord,
    picture: generatePicture,
    reference: generateReference,
    doesnt_belong: generateDoesntBelong,
    first_word: (
      verse,
      verses,
      random
    ) => generateEdgeWord(
      "first_word",
      verse,
      random
    ),
    last_word: (
      verse,
      verses,
      random
    ) => generateEdgeWord(
      "last_word",
      verse,
      random
    ),
    does_this_belong:
      generateDoesThisBelong,
    sounds_like: generateSoundsLike
  });

  function generateQuestion(
    type,
    {
      verse = null,
      verses = [],
      seed = "0",
      random = null
    } = {}
  ) {
    const safeType = cleanString(type);
    const generator = GENERATORS[safeType];
    if (!generator) {
      return ineligible(
        safeType,
        "Unknown generated-question type."
      );
    }
    if (!verse || !getVerseId(verse) || !getVerseText(verse)) {
      return ineligible(
        safeType,
        "Structured verse data is required."
      );
    }

    try {
      const result = generator(
        verse,
        getPublishedVerses(verses),
        resolveRandom({ random, seed })
      );

      if (!result?.eligible) {
        return ineligible(
          safeType,
          result?.reason
        );
      }

      return {
        ...result,
        seed: String(seed)
      };
    } catch (err) {
      return ineligible(
        safeType,
        "The generator could not safely build this question."
      );
    }
  }

  function getEligibility(
    type,
    options = {}
  ) {
    const result = generateQuestion(
      type,
      options
    );

    return result.eligible
      ? {
          eligible: true,
          type: result.type,
          reason: "Eligible"
        }
      : {
          eligible: false,
          type: result.type,
          reason: result.reason
        };
  }

  function listEligibility(options = {}) {
    return GENERATOR_TYPES.map((type) =>
      getEligibility(type, {
        ...options,
        seed: `${options.seed ?? "0"}:${type}`
      })
    );
  }

  function selectGeneratedQuestion({
    verse = null,
    verses = [],
    usedTypes = [],
    recentTypes = [],
    seed = "0",
    random = null
  } = {}) {
    const used = new Set(
      (Array.isArray(usedTypes) ? usedTypes : [])
        .map(cleanString)
    );
    const recent = new Set(
      (Array.isArray(recentTypes) ? recentTypes : [])
        .map(cleanString)
    );
    const candidates = GENERATOR_TYPES
      .filter((type) => !used.has(type))
      .map((type) => ({
        type,
        result: generateQuestion(type, {
          verse,
          verses,
          seed: `${seed}:${type}`
        })
      }))
      .filter((entry) =>
        entry.result.eligible
      );

    if (!candidates.length) {
      return {
        eligible: false,
        type: "",
        reason:
          "No unused generated-question type is eligible for this verse."
      };
    }

    const preferred = candidates.filter(
      (entry) => !recent.has(entry.type)
    );
    const pool = preferred.length
      ? preferred
      : candidates;
    const chooser = resolveRandom({
      random,
      seed: `${seed}:selection`
    });
    const selected = chooseRandom(pool, chooser);

    return selected?.result || {
      eligible: false,
      type: "",
      reason:
        "No generated-question type could be selected."
    };
  }

  return Object.freeze({
    CONTEXT_WORD_LIMIT,
    ANDYMOJI_BASE,
    AUDIO_BASE,
    GENERATOR_TYPES,
    GENERATOR_DEFINITIONS,
    normalizeComparison,
    tokenizeWords,
    createSeededRandom,
    buildContextWindow,
    maskWord,
    canScrambleWord,
    scrambleWord,
    resolveHidePlanEntries,
    getVisualHidePlanEntries,
    getChunks,
    getFalseChunkCandidates,
    getOutsiderCandidates,
    generateQuestion,
    getEligibility,
    listEligibility,
    selectGeneratedQuestion
  });
});
