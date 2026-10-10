"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Generators = require("../daily_question_generators.js");
const ScrambleSafety = require("../safe_word_scramble.js");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "verse_data");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadVerses() {
  return readJson(path.join(dataDir, "verse_list.json"))
    .map((verseId) => {
      const verse = readJson(path.join(dataDir, `${verseId}.json`));
      assert.strictEqual(verse.verseId, verseId);
      assert.strictEqual(verse.published, true);
      return verse;
    });
}

function choiceKey(choice) {
  if (choice.kind === "emoji") return `emoji:${choice.emoji}`;
  if (choice.kind === "image") return `image:${choice.src}`;
  return `text:${Generators.normalizeComparison(choice.label)}`;
}

function stringsIn(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) {
    value.forEach((entry) => stringsIn(entry, result));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => stringsIn(entry, result));
  }
  return result;
}

function assertNoHtml(value, label) {
  stringsIn(value).forEach((text) => {
    assert.ok(!/<\/?[a-z][^>]*>/i.test(text), `${label} generated HTML`);
  });
}

function normalizedWords(verse) {
  return new Set(
    Generators.tokenizeWords(verse.verseText)
      .map((token) => token.normalized)
  );
}

function sortedLetters(value) {
  return Array.from(Generators.normalizeComparison(value)).sort().join("");
}

function assertMask(original, masked, label) {
  assert.ok(original, `${label} has a target`);
  assert.strictEqual(masked, "???", `${label} fixed mask`);
}

function assertQuestion(result, verse, verseById, label) {
  const question = result.question;
  assert.ok(question, `${label} returns a question`);
  assert.strictEqual(question.type, result.type, `${label} type`);
  assert.ok(Number.isInteger(question.answer), `${label} integer answer`);
  assert.ok(
    question.answer >= 0 && question.answer < question.choices.length,
    `${label} answer index`
  );
  assert.ok(
    question.choices.length === 2 || question.choices.length === 3,
    `${label} choice count`
  );
  const keys = question.choices.map(choiceKey);
  assert.strictEqual(new Set(keys).size, keys.length, `${label} unique choices`);
  assert.strictEqual(question.metadata.verseId, verse.verseId, `${label} verse`);
  assertNoHtml(result, label);

  const answer = question.choices[question.answer];
  const words = normalizedWords(verse);
  if (["missing_word", "scrambled_word", "imposter_word", "picture"].includes(result.type)) {
    assert.ok(
      question.context?.wordCount <= Generators.CONTEXT_WORD_LIMIT,
      `${label} context limit`
    );
  }

  switch (result.type) {
    case "missing_word":
      assert.strictEqual(
        Generators.normalizeComparison(answer.label),
        question.metadata.targetNormalized,
        `${label} correct target`
      );
      assertMask(question.metadata.targetWord, question.metadata.maskedWord, label);
      break;
    case "scrambled_word":
      assert.strictEqual(
        Generators.normalizeComparison(answer.label),
        question.metadata.targetNormalized,
        `${label} correct target`
      );
      assert.notStrictEqual(
        question.metadata.scrambledWord,
        question.metadata.targetWord,
        `${label} changed scramble`
      );
      assert.strictEqual(
        sortedLetters(question.metadata.scrambledWord),
        sortedLetters(question.metadata.targetWord),
        `${label} same scramble letters`
      );
      assert.strictEqual(
        ScrambleSafety.isSafeWord(question.metadata.scrambledWord),
        true,
        `${label} safe scramble`
      );
      break;
    case "imposter_word":
      assert.strictEqual(
        Generators.normalizeComparison(answer.label),
        question.metadata.targetNormalized,
        `${label} correct target`
      );
      assert.notStrictEqual(
        question.metadata.imposterNormalized,
        question.metadata.targetNormalized,
        `${label} genuine imposter`
      );
      break;
    case "picture":
      assert.ok(["emoji", "image"].includes(answer.kind), `${label} visual answer`);
      assert.strictEqual(
        choiceKey(answer),
        answer.kind === "image"
          ? `image:${Generators.ANDYMOJI_BASE}${question.metadata.visualKey.slice("image:".length)}.png`
          : question.metadata.visualKey,
        `${label} visual key`
      );
      question.choices.forEach((choice) => {
        if (choice.kind !== "image") return;
        assert.ok(
          fs.existsSync(path.join(rootDir, choice.src.replace(/^\.\//, ""))),
          `${label} image exists`
        );
      });
      break;
    case "reference":
      assert.strictEqual(question.showReferencePill, false, `${label} hides reference`);
      assert.strictEqual(answer.label, verse.ref, `${label} correct reference`);
      question.choices.filter((_, index) => index !== question.answer)
        .forEach((choice) => assert.notStrictEqual(choice.label, verse.ref));
      break;
    case "doesnt_belong":
      assert.strictEqual(
        Generators.normalizeComparison(answer.label),
        question.metadata.outsiderNormalized,
        `${label} correct outsider`
      );
      assert.ok(!words.has(question.metadata.outsiderNormalized), `${label} outsider absent`);
      assert.notStrictEqual(question.metadata.outsiderVerseId, verse.verseId);
      const hideWords = new Set(
        Generators.resolveHidePlanEntries(verse).map((entry) => entry.normalized)
      );
      if (hideWords.size >= 2) {
        question.choices.filter((_, index) => index !== question.answer)
          .forEach((choice) => assert.ok(
            hideWords.has(Generators.normalizeComparison(choice.label)),
            `${label} prefers target Hide Plan words`
          ));
      }
      break;
    case "first_word":
    case "last_word": {
      const tokens = Generators.tokenizeWords(verse.verseText);
      const expected = result.type === "first_word" ? tokens[0] : tokens.at(-1);
      assert.strictEqual(question.metadata.targetNormalized, expected.normalized, `${label} edge token`);
      assert.strictEqual(Generators.normalizeComparison(answer.label), expected.normalized);
      break;
    }
    case "does_this_belong": {
      assert.deepStrictEqual(question.choices.map((choice) => choice.label), ["Yes", "No"]);
      assert.strictEqual(answer.label === "Yes", question.metadata.belongs, `${label} Yes/No`);
      if (question.metadata.belongs) {
        assert.strictEqual(question.metadata.sourceVerseId, verse.verseId);
        assert.ok(Generators.getChunks(verse).includes(question.metadata.chunk));
      } else {
        assert.notStrictEqual(question.metadata.sourceVerseId, verse.verseId);
        assert.ok(verseById.has(question.metadata.sourceVerseId));
      }
      break;
    }
    case "sounds_like":
      assert.strictEqual(
        question.media?.src,
        `./verse_audio/${question.metadata.sourceVerseId}${String.fromCharCode(97 + question.metadata.chunkIndex)}.mp3`,
        `${label} chunk recording`
      );
      assert.ok(!question.media.src.includes("_ref"), `${label} excludes reference audio`);
      assert.ok(
        fs.existsSync(path.join(rootDir, question.media.src.replace(/^\.\//, ""))),
        `${label} audio exists`
      );
      assert.deepStrictEqual(question.choices.map((choice) => choice.label), ["Yes", "No"]);
      const sourceVerse = verseById.get(question.metadata.sourceVerseId);
      assert.ok(sourceVerse?.echoParts?.[question.metadata.chunkIndex]);
      assert.strictEqual(question.metadata.chunkText, sourceVerse.echoParts[question.metadata.chunkIndex]);
      assert.strictEqual(answer.label === "Yes", question.metadata.belongs);
      assert.strictEqual(
        question.metadata.belongs,
        question.metadata.sourceVerseId === verse.verseId
      );
      break;
    default:
      assert.fail(`${label} unknown type`);
  }
}

function validateAll(verses) {
  const verseById = new Map(verses.map((verse) => [verse.verseId, verse]));
  let eligible = 0;
  let ineligible = 0;

  verses.forEach((verse) => {
    Generators.GENERATOR_TYPES.forEach((type) => {
      ["alpha", "beta", "gamma"].forEach((suffix) => {
        const options = {
          verse,
          verses,
          seed: `${verse.verseId}:${type}:${suffix}`
        };
        const result = Generators.generateQuestion(type, options);
        const repeated = Generators.generateQuestion(type, options);
        const label = `${verse.verseId}/${type}/${suffix}`;
        assert.deepStrictEqual(repeated, result, `${label} reproducible seed`);
        assert.strictEqual(result.type, type);
        if (!result.eligible) {
          ineligible += 1;
          assert.ok(result.reason, `${label} ineligibility reason`);
          assertNoHtml(result, label);
        } else {
          eligible += 1;
          assertQuestion(result, verse, verseById, label);
        }
      });
    });
  });
  return { eligible, ineligible };
}

function testSelection(verses) {
  const verse = verses.find((candidate) =>
    Generators.listEligibility({ verse: candidate, verses, seed: "selection" })
      .filter((entry) => entry.eligible).length >= 4
  );
  assert.ok(verse);
  const report = Generators.listEligibility({ verse, verses, seed: "selection" });
  assert.strictEqual(report.length, 10);
  const available = report.filter((entry) => entry.eligible).map((entry) => entry.type);
  const only = available.slice(0, 2);
  const selected = Generators.selectGeneratedQuestion({
    verse,
    verses,
    usedTypes: Generators.GENERATOR_TYPES.filter((type) => !only.includes(type)),
    recentTypes: [only[0]],
    seed: "prefer-fresh"
  });
  assert.strictEqual(selected.type, only[1], "selection avoids a recent eligible type");
  assert.strictEqual(
    Generators.selectGeneratedQuestion({
      verse,
      verses,
      usedTypes: [...Generators.GENERATOR_TYPES],
      seed: "none"
    }).eligible,
    false,
    "selection safely reports no unused type"
  );
}

function testShortDevelopmentVerse(verses) {
  const verse = verses.find((entry) => entry.verseId === "john_11_35");
  if (!verse) return;
  const report = Generators.listEligibility({ verse, verses, seed: "short" });
  assert.ok(report.some((entry) => entry.eligible));
  assert.ok(report.some((entry) => !entry.eligible));
}

function testSafeScrambleSeeds() {
  assert.strictEqual(ScrambleSafety.isSafeWord("SHIT"), false);
  for (let index = 0; index < 1000; index += 1) {
    const scrambled = Generators.scrambleWord(
      "THIS",
      Generators.createSeededRandom(`safe-scramble-${index}`)
    );
    assert.ok(!scrambled || ScrambleSafety.isSafeWord(scrambled));
  }
}

const verses = loadVerses();
assert.strictEqual(Generators.GENERATOR_TYPES.length, 10);
const counts = validateAll(verses);
testSelection(verses);
testShortDevelopmentVerse(verses);
testSafeScrambleSeeds();
console.log(
  `Generated-question validation passed for ${verses.length} published verses ` +
  `(${counts.eligible} eligible samples, ${counts.ineligible} safe ineligible samples).`
);
