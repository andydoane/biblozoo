(function (root, factory) {
  const Generators =
    typeof module === "object" && module.exports
      ? require("./daily_question_generators.js")
      : root?.BibloZooDailyQuestionGenerators;
  const api = factory(Generators);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.BibloZooDailyQuestionSessions = api;
  }
})(typeof window !== "undefined" ? window : null, function (Generators) {
  "use strict";

  const SESSION_VERSION = 1;
  const SESSION_ITEM_COUNT = 3;
  const ITEM_KINDS = Object.freeze({
    AUTHORED_RECALL: "authored_recall",
    AUTHORED_MEANING: "authored_meaning",
    GENERATED: "generated",
    APPLICATION: "application"
  });
  const CHOICE_KINDS = Object.freeze([
    "text",
    "emoji",
    "image"
  ]);

  function cleanString(value) {
    return String(value ?? "").trim();
  }

  function toNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? Math.floor(number)
      : 0;
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeChoice(rawChoice) {
    if (
      !rawChoice ||
      typeof rawChoice !== "object" ||
      Array.isArray(rawChoice)
    ) {
      return null;
    }

    const kind = cleanString(rawChoice.kind) || "text";
    const label = cleanString(rawChoice.label);
    if (!CHOICE_KINDS.includes(kind) || !label) {
      return null;
    }

    if (kind === "emoji") {
      const emoji = cleanString(rawChoice.emoji);
      return emoji ? { kind, emoji, label } : null;
    }

    if (kind === "image") {
      const src = cleanString(rawChoice.src);
      return src ? { kind, src, label } : null;
    }

    return { kind: "text", label };
  }

  function normalizeContext(rawContext) {
    if (
      !rawContext ||
      typeof rawContext !== "object" ||
      Array.isArray(rawContext)
    ) {
      return null;
    }

    const segments = Array.isArray(rawContext.segments)
      ? rawContext.segments
          .map((segment) => ({
            text: String(segment?.text ?? ""),
            accent: segment?.accent === true
          }))
          .filter((segment) => segment.text)
      : [];

    if (!segments.length) return null;

    return {
      segments,
      wordCount: toNonNegativeInteger(rawContext.wordCount)
    };
  }

  function normalizeMedia(rawMedia) {
    if (
      !rawMedia ||
      typeof rawMedia !== "object" ||
      Array.isArray(rawMedia) ||
      rawMedia.kind !== "audio"
    ) {
      return null;
    }

    const src = cleanString(rawMedia.src);
    if (!src || !src.startsWith("./verse_audio/")) {
      return null;
    }

    return {
      kind: "audio",
      src,
      sourceVerseId: cleanString(rawMedia.sourceVerseId),
      chunkIndex: toNonNegativeInteger(rawMedia.chunkIndex),
      belongs: rawMedia.belongs === true
    };
  }

  function normalizeChoiceQuestion(rawQuestion) {
    if (
      !rawQuestion ||
      typeof rawQuestion !== "object" ||
      Array.isArray(rawQuestion)
    ) {
      return null;
    }

    const prompt = cleanString(
      rawQuestion.prompt || rawQuestion.question
    );
    const type = cleanString(rawQuestion.type);
    const choices = Array.isArray(rawQuestion.choices)
      ? rawQuestion.choices.map(normalizeChoice)
      : [];
    const answer = Number(rawQuestion.answer);

    if (
      !prompt ||
      !type ||
      ![2, 3].includes(choices.length) ||
      choices.some((choice) => !choice) ||
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= choices.length
    ) {
      return null;
    }

    return {
      kind: "choice",
      type,
      prompt,
      context: normalizeContext(rawQuestion.context),
      choices,
      answer,
      showReferencePill:
        rawQuestion.showReferencePill !== false,
      media: normalizeMedia(rawQuestion.media),
      metadata:
        rawQuestion.metadata &&
        typeof rawQuestion.metadata === "object" &&
        !Array.isArray(rawQuestion.metadata)
          ? cloneJson(rawQuestion.metadata)
          : {}
    };
  }

  function normalizeSessionItem(rawItem) {
    if (
      !rawItem ||
      typeof rawItem !== "object" ||
      Array.isArray(rawItem)
    ) {
      return null;
    }

    const kind = cleanString(rawItem.kind);
    if (kind === ITEM_KINDS.APPLICATION) {
      const prompt = cleanString(rawItem.prompt);
      return prompt ? { kind, prompt } : null;
    }

    if (
      ![
        ITEM_KINDS.AUTHORED_RECALL,
        ITEM_KINDS.AUTHORED_MEANING,
        ITEM_KINDS.GENERATED
      ].includes(kind)
    ) {
      return null;
    }

    const question = normalizeChoiceQuestion(rawItem.question);
    return question ? { kind, question } : null;
  }

  function normalizeSessionPlan(rawPlan, verseId = "") {
    if (
      !rawPlan ||
      typeof rawPlan !== "object" ||
      Array.isArray(rawPlan)
    ) {
      return null;
    }

    const safeVerseId = cleanString(rawPlan.verseId);
    const expectedVerseId = cleanString(verseId);
    const items = Array.isArray(rawPlan.items)
      ? rawPlan.items.map(normalizeSessionItem)
      : [];

    if (
      Number(rawPlan.version) !== SESSION_VERSION ||
      !safeVerseId ||
      (expectedVerseId && safeVerseId !== expectedVerseId) ||
      items.length !== SESSION_ITEM_COUNT ||
      items.some((item) => !item)
    ) {
      return null;
    }

    const generatedTypeIds = items
      .filter((item) => item.kind === ITEM_KINDS.GENERATED)
      .map((item) => cleanString(item.question?.type))
      .filter(Boolean);

    if (
      new Set(generatedTypeIds).size !==
      generatedTypeIds.length
    ) {
      return null;
    }

    return {
      version: SESSION_VERSION,
      verseId: safeVerseId,
      confirmedSessions:
        toNonNegativeInteger(rawPlan.confirmedSessions),
      seed: cleanString(rawPlan.seed),
      initialStarPegCount: Math.min(
        2,
        toNonNegativeInteger(rawPlan.initialStarPegCount)
      ),
      items,
      generatedTypeIds
    };
  }

  function shuffleAuthoredQuestion(rawQuestion, type, random) {
    const prompt = cleanString(rawQuestion?.question);
    const rawChoices = Array.isArray(rawQuestion?.choices)
      ? rawQuestion.choices.map(cleanString)
      : [];
    const answer = Number(rawQuestion?.answer);

    if (
      !prompt ||
      rawChoices.length !== 3 ||
      rawChoices.some((choice) => !choice) ||
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer > 2
    ) {
      return null;
    }

    const indexed = rawChoices.map((label, index) => ({
      originalIndex: index,
      choice: { kind: "text", label }
    }));

    for (let index = indexed.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [indexed[index], indexed[swapIndex]] =
        [indexed[swapIndex], indexed[index]];
    }

    return normalizeChoiceQuestion({
      type,
      prompt,
      context: null,
      choices: indexed.map((entry) => entry.choice),
      answer: indexed.findIndex(
        (entry) => entry.originalIndex === answer
      ),
      showReferencePill: true,
      media: null,
      metadata: { authored: true }
    });
  }

  function createSessionPlan({
    verse = null,
    verses = [],
    confirmedSessions = 0,
    recentTypes = [],
    seed = "daily-questions",
    forcedGeneratedTypes = [],
    initialStarPegCount = 0
  } = {}) {
    if (!Generators || !verse) return null;

    const verseId = cleanString(verse.verseId || verse.id);
    const reflection = verse.reflection;
    const safeConfirmedSessions =
      toNonNegativeInteger(confirmedSessions);
    const safeSeed = cleanString(seed) || "daily-questions";
    const random = Generators.createSeededRandom(
      `${safeSeed}:authored`
    );
    const usedTypes = [];
    const forced = Array.isArray(forcedGeneratedTypes)
      ? forcedGeneratedTypes.map(cleanString).filter(Boolean)
      : [];
    let forcedIndex = 0;

    if (!verseId || !reflection) return null;

    const makeGeneratedItem = (itemIndex) => {
      const forcedType = forced[forcedIndex] || "";
      let result;

      if (forcedType) {
        forcedIndex += 1;
        if (usedTypes.includes(forcedType)) return null;
        result = Generators.generateQuestion(forcedType, {
          verse,
          verses,
          seed: `${safeSeed}:item:${itemIndex}:${forcedType}`
        });
      } else {
        result = Generators.selectGeneratedQuestion({
          verse,
          verses,
          usedTypes,
          recentTypes,
          seed: `${safeSeed}:item:${itemIndex}`
        });
      }

      if (!result?.eligible || usedTypes.includes(result.type)) {
        return null;
      }

      const question = normalizeChoiceQuestion(result.question);
      if (!question) return null;

      usedTypes.push(result.type);
      return {
        kind: ITEM_KINDS.GENERATED,
        question
      };
    };

    const makeAuthoredItem = (kind, rawQuestion) => {
      const question = shuffleAuthoredQuestion(
        rawQuestion,
        kind,
        random
      );
      return question ? { kind, question } : null;
    };

    let items;
    if (safeConfirmedSessions === 0) {
      items = [
        makeAuthoredItem(
          ITEM_KINDS.AUTHORED_RECALL,
          reflection.recall
        ),
        makeGeneratedItem(1),
        {
          kind: ITEM_KINDS.APPLICATION,
          prompt: cleanString(reflection.application?.prompt)
        }
      ];
    } else if (safeConfirmedSessions === 1) {
      items = [
        makeAuthoredItem(
          ITEM_KINDS.AUTHORED_MEANING,
          reflection.meaning
        ),
        makeGeneratedItem(1),
        makeGeneratedItem(2)
      ];
    } else {
      items = [
        makeGeneratedItem(0),
        makeGeneratedItem(1),
        makeGeneratedItem(2)
      ];
    }

    if (
      items.length !== SESSION_ITEM_COUNT ||
      items.some((item) => !item) ||
      items.some(
        (item) =>
          item.kind === ITEM_KINDS.APPLICATION &&
          !item.prompt
      )
    ) {
      return null;
    }

    return normalizeSessionPlan({
      version: SESSION_VERSION,
      verseId,
      confirmedSessions: safeConfirmedSessions,
      seed: safeSeed,
      initialStarPegCount,
      items,
      generatedTypeIds: usedTypes
    }, verseId);
  }

  return Object.freeze({
    SESSION_VERSION,
    SESSION_ITEM_COUNT,
    ITEM_KINDS,
    CHOICE_KINDS,
    normalizeChoice,
    normalizeChoiceQuestion,
    normalizeSessionItem,
    normalizeSessionPlan,
    createSessionPlan
  });
});
