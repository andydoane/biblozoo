/* =========================================================
   BibloZoo Daily Pet Questions
   ========================================================= */

(function () {
  "use strict";

  /*
    The Daily Pet Questions feature will live in this module.

    app.js will remain responsible for:
      - global app navigation
      - profile progress storage
      - shared verse/audio helpers
      - deciding whether the feature is enabled

    This file will eventually handle:
      - daily question eligibility
      - question session state
      - title-screen question offer
      - question and verse-help screens
      - "Something to Chew On"
      - snack reward
      - feeding game
      - debug testing helpers
  */

  const MODULE_VERSION = 1;

  /*
    Version 1 / initial testing allowlist.

    Only these verses may participate in Daily Pet Questions.
    Additional verses can be added later without changing the
    rest of the feature.
  */
  const DAILY_PET_QUESTION_VERSE_IDS =
    Object.freeze([
      "genesis_1_1",
      "john_3_16",
      "romans_6_23",
      "psalm_23_4"
    ]);

  const DAILY_PET_QUESTION_VERSE_ID_SET =
    new Set(DAILY_PET_QUESTION_VERSE_IDS);

  function getAllowedVerseIds() {
    return [...DAILY_PET_QUESTION_VERSE_IDS];
  }

  function isAllowedVerseId(verseId) {
    const cleanVerseId =
      String(verseId || "").trim();

    return DAILY_PET_QUESTION_VERSE_ID_SET
      .has(cleanVerseId);
  }

  function normalizeQuestion(rawQuestion) {
    if (
      !rawQuestion ||
      typeof rawQuestion !== "object"
    ) {
      return null;
    }

    const question =
      String(rawQuestion.question || "").trim();

    const choices =
      Array.isArray(rawQuestion.choices)
        ? rawQuestion.choices.map((choice) =>
          String(choice || "").trim()
        )
        : [];

    const answer =
      rawQuestion.answer;

    if (!question) {
      return null;
    }

    if (
      choices.length !== 3 ||
      choices.some((choice) => !choice)
    ) {
      return null;
    }

    if (
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer > 2
    ) {
      return null;
    }

    return {
      question,
      choices,
      answer
    };
  }

  function normalizeReflection(rawReflection) {
    if (
      !rawReflection ||
      typeof rawReflection !== "object"
    ) {
      return null;
    }

    const recall =
      normalizeQuestion(rawReflection.recall);

    const meaning =
      normalizeQuestion(rawReflection.meaning);

    const applicationPrompt =
      String(
        rawReflection.application?.prompt || ""
      ).trim();

    if (
      !recall ||
      !meaning ||
      !applicationPrompt
    ) {
      return null;
    }

    return {
      recall,
      meaning,
      application: {
        prompt: applicationPrompt
      }
    };
  }

  window.BibloZooDailyQuestions =
    Object.freeze({
      version: MODULE_VERSION,
      getAllowedVerseIds,
      isAllowedVerseId,
      normalizeReflection
    });

})();