"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const Generators = require(
  "../daily_question_generators.js"
);
const Sessions = require(
  "../daily_question_sessions.js"
);
const DailyTodo = require(
  "../daily_zoo_todo.js"
);

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "verse_data");

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(filePath, "utf8")
  );
}

function loadVerses() {
  return readJson(
    path.join(dataDir, "verse_list.json")
  ).map((verseId) =>
    readJson(
      path.join(dataDir, `${verseId}.json`)
    )
  );
}

function makePlan(verseId, questionSession) {
  return {
    kind: DailyTodo.PLAN_KINDS.CARE,
    id: "question-session-plan",
    profileId: "profile-a",
    day: "2026-10-10",
    verseId,
    requiredTaskIds: [
      DailyTodo.TASK_IDS.REVIEW,
      DailyTodo.TASK_IDS.QUESTIONS,
      DailyTodo.TASK_IDS.ACTIVITY
    ],
    reviewAssignment: {
      kind: DailyTodo.REVIEW_KINDS.FLASHCARD,
      activityId: ""
    },
    activity: {
      kind: "game",
      id: "game-a",
      mode: "easy"
    },
    questionSession,
    earnedStarPegCount: 0,
    tasks: {
      review: { status: "open" },
      questions: { status: "open" },
      activity: { status: "open" }
    },
    educationalCompletedAt: 0,
    snack: {
      unlocked: false,
      claimed: false,
      claimedAt: 0
    },
    rolloverHold: null
  };
}

function build(verse, verses, confirmedSessions, extra = {}) {
  return Sessions.createSessionPlan({
    verse,
    verses,
    confirmedSessions,
    recentTypes: [],
    seed: `${verse.verseId}:${confirmedSessions}`,
    ...extra
  });
}

function assertChoiceItem(item, label) {
  assert.ok(item?.question, `${label} has a question`);
  assert.ok([2, 3].includes(item.question.choices.length));
  assert.ok(
    item.question.answer >= 0 &&
      item.question.answer < item.question.choices.length
  );
  item.question.choices.forEach((choice) => {
    assert.ok(choice.label, `${label} has accessible choice labels`);
    assert.ok(["text", "emoji", "image"].includes(choice.kind));
  });
}

function testProgressionForEveryVerse(verses) {
  verses.forEach((verse) => {
    const first = build(verse, verses, 0);
    const second = build(verse, verses, 1);
    const later = build(verse, verses, 2);

    assert.ok(first, `${verse.verseId} first session`);
    assert.ok(second, `${verse.verseId} second session`);
    assert.ok(later, `${verse.verseId} later session`);

    assert.deepStrictEqual(
      first.items.map((item) => item.kind),
      ["authored_recall", "generated", "application"]
    );
    assert.deepStrictEqual(
      second.items.map((item) => item.kind),
      ["authored_meaning", "generated", "generated"]
    );
    assert.deepStrictEqual(
      later.items.map((item) => item.kind),
      ["generated", "generated", "generated"]
    );

    [first, second, later].forEach((session, sessionIndex) => {
      assert.strictEqual(session.items.length, 3);
      assert.strictEqual(
        new Set(session.generatedTypeIds).size,
        session.generatedTypeIds.length,
        `${verse.verseId}/${sessionIndex} has no duplicate generated type`
      );
      session.items
        .filter((item) => item.kind !== "application")
        .forEach((item, itemIndex) =>
          assertChoiceItem(
            item,
            `${verse.verseId}/${sessionIndex}/${itemIndex}`
          )
        );
    });
  });
}

function testReproducibleAndPersisted(verses) {
  const verse = verses.find(
    (entry) => entry.verseId === "romans_6_23"
  ) || verses[0];
  const options = {
    verse,
    verses,
    confirmedSessions: 2,
    recentTypes: ["reference", "last_word"],
    seed: "persisted-session"
  };
  const first = Sessions.createSessionPlan(options);
  const repeated = Sessions.createSessionPlan(options);

  assert.deepStrictEqual(repeated, first, "same seed reproduces the full set");
  assert.deepStrictEqual(
    Sessions.normalizeSessionPlan(
      JSON.parse(JSON.stringify(first)),
      verse.verseId
    ),
    first,
    "saved session normalizes without reordering"
  );

  const plan = makePlan(verse.verseId, first);
  plan.questionSession = first;
  const state = DailyTodo.normalizeState({
    activePlan: plan
  });
  assert.deepStrictEqual(
    state.activePlan.questionSession,
    first,
    "Daily plan preserves the exact question set"
  );
}

function testForcedTypesAndRenderingShapes(verses) {
  Generators.GENERATOR_TYPES.forEach((type) => {
    const verse = verses.find((candidate) =>
      Generators.getEligibility(type, {
        verse: candidate,
        verses,
        seed: `force:${type}`
      }).eligible
    );
    assert.ok(verse, `${type} has an eligible release verse`);

    const session = Sessions.createSessionPlan({
      verse,
      verses,
      confirmedSessions: 2,
      seed: `force:${type}`,
      forcedGeneratedTypes: [type]
    });
    assert.ok(session, `${type} can be forced into a session`);
    assert.strictEqual(session.generatedTypeIds[0], type);
  });

  const verse = verses.find((candidate) =>
    Generators.getEligibility("does_this_belong", {
      verse: candidate,
      verses,
      seed: "two-choice"
    }).eligible
  );
  const twoChoice = Sessions.createSessionPlan({
    verse,
    verses,
    confirmedSessions: 2,
    seed: "two-choice",
    forcedGeneratedTypes: ["does_this_belong"]
  });
  assert.strictEqual(twoChoice.items[0].question.choices.length, 2);

  const reference = Sessions.createSessionPlan({
    verse,
    verses,
    confirmedSessions: 2,
    seed: "reference",
    forcedGeneratedTypes: ["reference"]
  });
  assert.strictEqual(
    reference.items[0].question.showReferencePill,
    false,
    "Reference does not reveal the answer in the pill"
  );

  const soundsLike = Sessions.createSessionPlan({
    verse,
    verses,
    confirmedSessions: 2,
    seed: "sounds-like",
    forcedGeneratedTypes: ["sounds_like"]
  });
  const media = soundsLike.items[0].question.media;
  assert.ok(media.src.endsWith(".mp3"));
  assert.ok(!media.src.includes("_ref"));
}

function testRecentTypesAndStars(verses) {
  const verse = verses.find((candidate) =>
    Generators.listEligibility({
      verse: candidate,
      verses,
      seed: "recent"
    }).filter((entry) => entry.eligible).length >= 7
  );
  assert.ok(verse);

  const recentTypes = [
    "missing_word",
    "scrambled_word",
    "imposter_word"
  ];
  const session = Sessions.createSessionPlan({
    verse,
    verses,
    confirmedSessions: 2,
    recentTypes,
    seed: "avoid-recent",
    initialStarPegCount: 2
  });
  assert.ok(
    session.generatedTypeIds.every(
      (type) => !recentTypes.includes(type)
    ),
    "recent types are avoided when three alternatives exist"
  );
  assert.strictEqual(session.initialStarPegCount, 2);
}

const verses = loadVerses();
testProgressionForEveryVerse(verses);
testReproducibleAndPersisted(verses);
testForcedTypesAndRenderingShapes(verses);
testRecentTypesAndStars(verses);

console.log(
  `Daily Question session validation passed for ${verses.length} published verses.`
);
