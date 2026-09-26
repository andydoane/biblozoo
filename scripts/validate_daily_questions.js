"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const verseDataDir = path.join(rootDir, "verse_data");
const verseListPath = path.join(verseDataDir, "verse_list.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function validateQuestion(verseId, label, question, errors) {
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    errors.push(`${verseId}: missing ${label} question object`);
    return;
  }

  if (!cleanText(question.question)) {
    errors.push(`${verseId}: ${label} question text is empty`);
  }

  if (!Array.isArray(question.choices) || question.choices.length !== 3) {
    errors.push(`${verseId}: ${label} must have exactly 3 choices`);
  } else {
    const choices = question.choices.map(cleanText);

    if (choices.some((choice) => !choice)) {
      errors.push(`${verseId}: ${label} has an empty choice`);
    }

    const normalized = choices.map((choice) => choice.toLocaleLowerCase());

    if (new Set(normalized).size !== normalized.length) {
      errors.push(`${verseId}: ${label} has duplicate choices`);
    }
  }

  if (
    !Number.isInteger(question.answer) ||
    question.answer < 0 ||
    question.answer > 2
  ) {
    errors.push(`${verseId}: ${label} answer must be 0, 1, or 2`);
  }
}

function main() {
  const errors = [];
  let verseIds;

  try {
    verseIds = readJson(verseListPath);
  } catch (err) {
    console.error("Could not read verse_data/verse_list.json");
    console.error(err);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(verseIds)) {
    console.error("verse_data/verse_list.json must contain an array.");
    process.exitCode = 1;
    return;
  }

  for (const rawVerseId of verseIds) {
    const verseId = cleanText(rawVerseId);

    if (!verseId) {
      errors.push("verse_list.json contains an empty verse id");
      continue;
    }

    const filePath = path.join(verseDataDir, `${verseId}.json`);
    let verse;

    try {
      verse = readJson(filePath);
    } catch (err) {
      errors.push(`${verseId}: could not parse ${path.basename(filePath)} (${err.message})`);
      continue;
    }

    const reflection = verse?.reflection;

    if (!reflection || typeof reflection !== "object" || Array.isArray(reflection)) {
      errors.push(`${verseId}: missing reflection object`);
      continue;
    }

    validateQuestion(verseId, "recall", reflection.recall, errors);
    validateQuestion(verseId, "meaning", reflection.meaning, errors);

    if (!cleanText(reflection.application?.prompt)) {
      errors.push(`${verseId}: application prompt is empty`);
    }
  }

  if (errors.length) {
    console.error(`Daily Question validation failed with ${errors.length} issue(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Daily Question validation passed for ${verseIds.length} verses.`);
}

main();
