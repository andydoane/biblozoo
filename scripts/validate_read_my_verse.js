"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ScrambleSafety = require("../safe_word_scramble.js");

const ReadMyVerse = require(
  "../read_my_verse.js"
);

const rootDir = path.resolve(__dirname, "..");

function testOneTapRevealsOneActualCharacter() {
  const text = "Hi, there!";
  let revealed =
    ReadMyVerse.getInitialRevealCount(text);

  assert.strictEqual(revealed, 0);

  revealed =
    ReadMyVerse.getNextRevealCount(
      text,
      revealed
    );
  assert.strictEqual(revealed, 1);
  assert.strictEqual(text.slice(0, revealed), "H");

  revealed =
    ReadMyVerse.getNextRevealCount(
      text,
      revealed
    );
  assert.strictEqual(text.slice(0, revealed), "Hi, ");

  const typedCharacters = [];
  while (revealed < text.length) {
    const before = revealed;
    revealed =
      ReadMyVerse.getNextRevealCount(
        text,
        revealed
      );
    typedCharacters.push(
      Array.from(
        text.slice(before, revealed)
      ).filter(
        ReadMyVerse.isTypeableCharacter
      ).length
    );
  }

  assert.ok(
    typedCharacters.every(
      (count) => count === 1
    )
  );
  assert.strictEqual(revealed, text.length);
}

function testChunkTextPreservesPunctuation() {
  const verse =
    "For the wages of sin is death, but the gift of God is eternal life.";
  const chunks =
    ReadMyVerse.buildDisplayChunks(
      verse,
      [
        "For the wages of sin is death",
        "but the gift of God",
        "is eternal life"
      ]
    );

  assert.deepStrictEqual(chunks, [
    "For the wages of sin is death, ",
    "but the gift of God ",
    "is eternal life."
  ]);
  assert.strictEqual(chunks.join(""), verse);
}

function testOneThroughEightChunkFilenames() {
  for (let count = 1; count <= 8; count += 1) {
    for (let index = 0; index < count; index += 1) {
      const path =
        ReadMyVerse.getChunkAudioPath(
          "romans_6_23",
          index,
          count
        );

      const suffix = String.fromCharCode(
        "a".charCodeAt(0) + index
      );
      assert.strictEqual(
        path,
        `./verse_audio/romans_6_23${suffix}.mp3`
      );
    }
  }

  assert.strictEqual(
    ReadMyVerse.getChunkAudioPath(
      "romans_6_23",
      0,
      1,
      false
    ),
    "./verse_audio/romans_6_23.mp3"
  );
}

function testDailyContextValidation() {
  const context = {
    source: "daily_todo",
    profileId: "profile-a",
    planId: "plan-a",
    planDay: "2026-10-09",
    taskId: "review",
    launchToken: "token-a",
    verseId: "romans_6_23",
    readActivityId: "typewriter",
    previewScope: "read_test"
  };

  assert.deepStrictEqual(
    ReadMyVerse.validateContext(
      context,
      "romans_6_23",
      "typewriter"
    ),
    {
      ...context,
      readTestMode: "normal"
    }
  );
  assert.strictEqual(
    ReadMyVerse.validateContext(
      {
        ...context,
        launchToken: ""
      },
      "romans_6_23",
      "typewriter"
    ),
    null
  );
  assert.strictEqual(
    ReadMyVerse.validateContext(
      context,
      "john_11_35",
      "typewriter"
    ),
    null
  );

  [
    "star_wars",
    "balloons",
    "fish"
  ].forEach((activityId) => {
    const animatedContext = {
      ...context,
      readActivityId: activityId,
      readTestMode: "reduced_motion"
    };

    assert.deepStrictEqual(
      ReadMyVerse.validateContext(
        animatedContext,
        "romans_6_23",
        activityId
      ),
      animatedContext
    );
  });

  [
    "keyboard",
    "unscramble",
    "tap_words_order",
    "chunk_sequence"
  ].forEach((activityId) => {
    const interactiveContext = {
      ...context,
      readActivityId: activityId,
      readTestMode: "normal"
    };

    assert.deepStrictEqual(
      ReadMyVerse.validateContext(
        interactiveContext,
        "romans_6_23",
        activityId
      ),
      interactiveContext
    );
  });

  assert.strictEqual(
    ReadMyVerse.validateContext(
      {
        ...context,
        readActivityId: "not_real"
      },
      "romans_6_23",
      "not_real"
    ),
    null
  );
}

function testAssetsExist() {
  const assets = [
    "verse_fonts/SpecialElite-Regular.ttf",
    "verse_images/read_my_verse/paper_phone.png",
    "verse_images/read_my_verse/paper_ipad.png",
    "verse_images/read_my_verse/typewriter_1.mp3",
    "verse_images/read_my_verse/typewriter_2.mp3",
    "verse_images/read_my_verse/typewriter_3.mp3",
    "verse_images/read_my_verse/starfield_phone.png",
    "verse_images/read_my_verse/starfield_ipad.png",
    "verse_images/read_my_verse/red_balloon.png",
    "verse_images/read_my_verse/blue_balloon.png",
    "verse_images/read_my_verse/underwater_phone.png",
    "verse_images/read_my_verse/underwater_ipad.png",
    "verse_images/read_my_verse/fish_small.png",
    "verse_images/read_my_verse/fish_medium.png",
    "verse_images/read_my_verse/fish_long.png",
    "verse_images/read_my_verse/fish_hook.png",
    "verse_fonts/VT323-Regular.ttf",
    "verse_images/read_my_verse/keyboard_1.mp3",
    "verse_images/read_my_verse/keyboard_2.mp3",
    "verse_images/read_my_verse/keyboard_3.mp3",
    "verse_images/read_my_verse/keyboard_4.mp3",
    "verse_images/read_my_verse/keyboard_5.mp3",
    "verse_images/read_my_verse/keyboard_6.mp3",
    "verse_images/read_my_verse/keyboard_7.mp3",
    "verse_images/daily_questions/dq_incorrect.mp3",
    "verse_fonts/TitanOne.ttf",
    "verse_images/read_my_verse/simon_says_phone.png",
    "verse_images/read_my_verse/simon_says_ipad.png"
  ];

  assets.forEach((asset) => {
    assert.strictEqual(
      fs.existsSync(
        path.join(rootDir, asset)
      ),
      true,
      `Missing Read asset: ${asset}`
    );
  });
}

function testInteractiveActivityManifest() {
  const expected = {
    keyboard: "Keyboard",
    unscramble: "Unscramble",
    tap_words_order:
      "Tap Words in Order"
  };

  Object.entries(expected).forEach(
    ([activityId, title]) => {
      assert.strictEqual(
        ReadMyVerse.READ_ACTIVITY_MANIFEST[
          activityId
        ].enabled,
        true
      );
      assert.strictEqual(
        ReadMyVerse.READ_ACTIVITY_MANIFEST[
          activityId
        ].title,
        title
      );
    }
  );

  assert.strictEqual(
    ReadMyVerse.isTypingActivity(
      "keyboard"
    ),
    true
  );
  assert.strictEqual(
    ReadMyVerse.isWordActivity(
      "unscramble"
    ),
    true
  );
}

function testChunkAudioMatchingRules() {
  const manifest =
    ReadMyVerse.READ_ACTIVITY_MANIFEST
      .chunk_sequence;

  assert.strictEqual(
    manifest.title,
    "Chunk Audio Matching"
  );
  assert.strictEqual(manifest.enabled, true);
  assert.strictEqual(
    ReadMyVerse.isChunkSequenceActivity(
      "chunk_sequence"
    ),
    true
  );

  for (let count = 2; count <= 8; count += 1) {
    const colors =
      ReadMyVerse.chooseChunkSequenceColors(
        count,
        () => 0.41
      );

    assert.strictEqual(colors.length, count);
    assert.strictEqual(
      new Set(
        colors.map((color) => color.id)
      ).size,
      count
    );
    assert.strictEqual(
      colors.some(
        (color) => color.id === "gray"
      ),
      count === 8
    );
  }

  const easy =
    ReadMyVerse.createChunkSequenceData(
      5,
      "sequence_challenge",
      () => 0.23
    );
  easy.mode = "easy";
  easy.challengeIndex = 2;

  const explore =
    ReadMyVerse.createChunkSequenceData(
      2,
      "normal",
      () => 0.17
    );
  assert.strictEqual(explore.phase, "mode");
  explore.phase = "explore";
  assert.strictEqual(
    ReadMyVerse.markChunkSequenceExplored(
      explore,
      0
    ),
    false
  );
  assert.strictEqual(
    ReadMyVerse.markChunkSequenceExplored(
      explore,
      1
    ),
    true
  );

  let result =
    ReadMyVerse.evaluateChunkSequenceChoice(
      easy,
      4,
      5
    );
  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.reset, false);
  assert.strictEqual(result.nextIndex, 2);
  assert.strictEqual(result.easyMisses, 1);

  easy.easyMisses = 2;
  result =
    ReadMyVerse.evaluateChunkSequenceChoice(
      easy,
      4,
      5
    );
  assert.strictEqual(
    result.helpAvailable,
    true
  );

  const hard = {
    ...easy,
    mode: "hard",
    hardResets: 2
  };
  result =
    ReadMyVerse.evaluateChunkSequenceChoice(
      hard,
      4,
      5
    );
  assert.strictEqual(result.reset, true);
  assert.strictEqual(result.nextIndex, 0);
  assert.strictEqual(result.hardResets, 3);
  assert.strictEqual(
    result.helpAvailable,
    true
  );

  result =
    ReadMyVerse.evaluateChunkSequenceChoice(
      {
        ...easy,
        challengeIndex: 4
      },
      4,
      5
    );
  assert.strictEqual(result.correct, true);
  assert.strictEqual(result.complete, true);
}

function testChunkAudioMatchingEligibility() {
  const verse = (count) => ({
    id: `chunks_${count}`,
    verseText: Array.from(
      { length: count },
      (_, index) => `Part ${index + 1}`
    ).join(" "),
    echoParts: Array.from(
      { length: count },
      (_, index) => `Part ${index + 1}`
    )
  });

  assert.strictEqual(
    ReadMyVerse.isActivityEligibleForVerse(
      "chunk_sequence",
      verse(1)
    ),
    false
  );

  for (let count = 2; count <= 8; count += 1) {
    assert.strictEqual(
      ReadMyVerse.isActivityEligibleForVerse(
        "chunk_sequence",
        verse(count)
      ),
      true
    );
  }
}

function testScramblePreservesLettersAndPunctuation() {
  const token =
    ReadMyVerse.splitWordToken(
      "(Grace!),"
    );

  assert.strictEqual(token.leading, "(");
  assert.strictEqual(token.core, "Grace");
  assert.strictEqual(token.trailing, "!),");

  const scrambled =
    ReadMyVerse.scrambleCore(
      "can't",
      () => 0
    );

  assert.notStrictEqual(scrambled, "can't");
  assert.strictEqual(scrambled[3], "'");
  assert.deepStrictEqual(
    Array.from(scrambled)
      .filter(ReadMyVerse.isTypeableCharacter)
      .map((letter) =>
        letter.toLocaleLowerCase()
      )
      .sort(),
    Array.from("cant").sort()
  );

  const puzzle =
    ReadMyVerse.buildUnscramblePuzzle(
      "I am in.",
      () => 0
    );

  assert.strictEqual(puzzle.threshold, 2);
  assert.ok(puzzle.requiredCount >= 1);
  puzzle.tokens
    .filter((item) => item.required)
    .forEach((item) => {
      assert.notStrictEqual(
        item.scrambled,
        item.core
      );
      assert.deepStrictEqual(
        Array.from(item.scrambled)
          .filter(
            ReadMyVerse.isTypeableCharacter
          )
          .map((letter) =>
            letter.toLocaleLowerCase()
          )
          .sort(),
        Array.from(item.core)
          .filter(
            ReadMyVerse.isTypeableCharacter
          )
          .map((letter) =>
            letter.toLocaleLowerCase()
          )
          .sort()
      );
    });
}

function testTapOrderHintsAndReset() {
  const puzzle =
    ReadMyVerse.buildTapOrderPuzzle(
      "one two three",
      () => 0.23
    );
  const expected = puzzle.tokens[0];
  const wrong = puzzle.tokens.find(
    (token) =>
      token.normalized !==
      expected.normalized
  );

  assert.ok(wrong);

  ReadMyVerse.applyTapOrderChoice(
    puzzle,
    wrong.id
  );
  assert.strictEqual(
    puzzle.incorrectStreak,
    1
  );
  assert.strictEqual(
    puzzle.hintedTokenId,
    ""
  );

  ReadMyVerse.applyTapOrderChoice(
    puzzle,
    wrong.id
  );
  assert.strictEqual(
    puzzle.incorrectStreak,
    2
  );
  assert.ok(puzzle.hintedTokenId);

  const correctId = puzzle.displayOrder
    .find((id) =>
      puzzle.tokens.find(
        (token) => token.id === id
      )?.normalized ===
        expected.normalized
    );
  const result =
    ReadMyVerse.applyTapOrderChoice(
      puzzle,
      correctId
    );

  assert.strictEqual(result.correct, true);
  assert.strictEqual(
    puzzle.incorrectStreak,
    0
  );
  assert.strictEqual(
    puzzle.hintedTokenId,
    ""
  );
}

function testDuplicateTapWordsAreFair() {
  const puzzle =
    ReadMyVerse.buildTapOrderPuzzle(
      "go go now",
      () => 0.61
    );
  const secondGo = puzzle.tokens[1];
  const result =
    ReadMyVerse.applyTapOrderChoice(
      puzzle,
      secondGo.id
    );

  assert.strictEqual(result.correct, true);
  assert.strictEqual(puzzle.nextIndex, 1);
}

function testActivityEligibilityAndForcedChunks() {
  const verse = {
    verseText: "Alone. Two useful words.",
    echoParts: [
      "Alone",
      "Two useful words"
    ]
  };

  assert.strictEqual(
    ReadMyVerse.isActivityEligibleForVerse(
      "tap_words_order",
      verse,
      "normal"
    ),
    false
  );
  assert.strictEqual(
    ReadMyVerse.isActivityEligibleForVerse(
      "keyboard",
      verse,
      "forced_hint"
    ),
    false
  );
  assert.strictEqual(
    ReadMyVerse.isActivityEligibleForVerse(
      "not_real",
      verse,
      "normal"
    ),
    false
  );
  assert.strictEqual(
    ReadMyVerse.isActivityEligibleForVerse(
      "tap_words_order",
      verse,
      "forced_long"
    ),
    true
  );

  const longSelection =
    ReadMyVerse.selectActivityChunks(
      verse,
      "tap_words_order",
      "forced_long"
    );
  assert.deepStrictEqual(
    longSelection.audioIndices,
    [1]
  );

  assert.strictEqual(
    ReadMyVerse.isActivityEligibleForVerse(
      "unscramble",
      {
        verseText: "aaa",
        echoParts: ["aaa"]
      },
      "normal"
    ),
    false
  );
}

function testTileLayoutKeepsSolvedPositions() {
  const css = fs.readFileSync(
    path.join(rootDir, "read_my_verse.css"),
    "utf8"
  );

  assert.match(
    css,
    /\.read-order-tile\.is-solved\s*\{[^}]*visibility:\s*hidden;/s
  );
  assert.match(
    css,
    /readKeyboardCursorBlink 1s step-end infinite/
  );
}

function testKeyboardSoundsAreShortAndDistinct() {
  const soundPaths = Array.from(
    { length: 7 },
    (_, index) => path.join(
      rootDir,
      `verse_images/read_my_verse/keyboard_${index + 1}.mp3`
    )
  );
  const hashes = soundPaths.map(
    (soundPath) => crypto
      .createHash("sha256")
      .update(fs.readFileSync(soundPath))
      .digest("hex")
  );

  soundPaths.forEach((soundPath) => {
    assert.ok(
      fs.statSync(soundPath).size < 50000,
      `${path.basename(soundPath)} should be a short keystroke sample`
    );
  });
  assert.strictEqual(
    new Set(hashes).size,
    soundPaths.length,
    "Keyboard samples must be distinct"
  );
}

function testInteractiveSessionsWithoutTts() {
  const verse = {
    id: "interactive_preview",
    ref: "Preview 2:1",
    verseText:
      "One useful part, two worthy words.",
    echoParts: [
      "One useful part",
      "two worthy words"
    ]
  };
  const contextFor = (activityId) => ({
    source: "daily_todo",
    profileId: "profile-a",
    planId: "plan-interactive",
    planDay: "2026-10-10",
    taskId: "review",
    launchToken: "token-interactive",
    verseId: verse.id,
    readActivityId: activityId,
    previewScope: "read_test",
    readTestMode: "normal"
  });

  ReadMyVerse.initialize({
    getVerseList: () => [verse]
  });

  [
    ["keyboard", "typing"],
    ["unscramble", "interacting"],
    ["tap_words_order", "interacting"]
  ].forEach(([activityId, phase]) => {
    assert.strictEqual(
      ReadMyVerse.startForVerse(
        verse.id,
        activityId,
        contextFor(activityId)
      ),
      true
    );
    assert.strictEqual(
      ReadMyVerse.getSessionState().phase,
      phase
    );
    ReadMyVerse.stopSession();
  });

  const invalidVerse = {
    ...verse,
    id: "invalid_preview",
    verseText: "Alone.",
    echoParts: ["Alone"]
  };

  ReadMyVerse.initialize({
    getVerseList: () => [invalidVerse]
  });
  assert.strictEqual(
    ReadMyVerse.startForVerse(
      invalidVerse.id,
      "tap_words_order",
      {
        ...contextFor("tap_words_order"),
        verseId: invalidVerse.id
      }
    ),
    false
  );
  ReadMyVerse.stopSession();
}

function testAnimatedActivityManifest() {
  assert.strictEqual(
    ReadMyVerse.READ_ACTIVITY_MANIFEST
      .star_wars.title,
    "Verse Crawl"
  );

  [
    "star_wars",
    "balloons",
    "fish"
  ].forEach((activityId) => {
    assert.strictEqual(
      ReadMyVerse.READ_ACTIVITY_MANIFEST[
        activityId
      ].enabled,
      true
    );
    assert.strictEqual(
      ReadMyVerse.isAnimatedActivity(
        activityId
      ),
      true
    );
  });
}

function testAnimatedTimingAndReducedMotion() {
  [
    "star_wars",
    "balloons",
    "fish"
  ].forEach((activityId) => {
    const normal =
      ReadMyVerse.getAnimatedActivityTiming(
        activityId,
        6,
        false
      );
    const reduced =
      ReadMyVerse.getAnimatedActivityTiming(
        activityId,
        6,
        true
      );

    assert.ok(normal.audioStartMs > 0);
    assert.ok(
      reduced.audioStartMs <
      normal.audioStartMs
    );
  });

  const oneWord =
    ReadMyVerse.getAnimatedActivityTiming(
      "balloons",
      1,
      false
    );
  const manyWords =
    ReadMyVerse.getAnimatedActivityTiming(
      "balloons",
      8,
      false
    );

  assert.ok(
    manyWords.audioStartMs >
    oneWord.audioStartMs
  );
}

function testPreviewChunkModes() {
  const verse = {
    id: "preview_verse",
    ref: "Preview 1:1",
    verseText: "One part, two parts.",
    echoParts: ["One part", "two parts"]
  };
  const makeContext = (
    activityId,
    readTestMode
  ) => ({
    source: "daily_todo",
    profileId: "profile-a",
    planId: "plan-a",
    planDay: "2026-10-09",
    taskId: "review",
    launchToken: "token-a",
    verseId: verse.id,
    readActivityId: activityId,
    previewScope: "read_test",
    readTestMode
  });

  ReadMyVerse.initialize({
    getVerseList: () => [verse]
  });

  assert.strictEqual(
    ReadMyVerse.startForVerse(
      verse.id,
      "balloons",
      makeContext(
        "balloons",
        "one_chunk"
      )
    ),
    true
  );
  assert.strictEqual(
    ReadMyVerse.getSessionState()
      .chunkCount,
    1
  );
  assert.strictEqual(
    ReadMyVerse.getSessionState()
      .usesChunkAudio,
    false
  );

  ReadMyVerse.stopSession();
  assert.strictEqual(
    ReadMyVerse.startForVerse(
      verse.id,
      "fish",
      makeContext(
        "fish",
        "reduced_motion"
      )
    ),
    true
  );
  assert.strictEqual(
    ReadMyVerse.getSessionState()
      .chunkCount,
    2
  );
  assert.strictEqual(
    ReadMyVerse.getSessionState()
      .reducedMotion,
    true
  );
  ReadMyVerse.stopSession();
}

function testTypewriterSoundsAreShortAndDistinct() {
  const soundPaths = [1, 2, 3].map(
    (index) => path.join(
      rootDir,
      `verse_images/read_my_verse/typewriter_${index}.mp3`
    )
  );
  const hashes = soundPaths.map(
    (soundPath) => crypto
      .createHash("sha256")
      .update(fs.readFileSync(soundPath))
      .digest("hex")
  );

  soundPaths.forEach((soundPath) => {
    assert.ok(
      fs.statSync(soundPath).size < 50000,
      `${path.basename(soundPath)} should be a short keystroke sample`
    );
  });
  assert.strictEqual(
    new Set(hashes).size,
    soundPaths.length,
    "Typewriter keystroke samples must be distinct"
  );
}

function testEveryVerseChunkRecordingExists() {
  const verseIds = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "verse_data/verse_list.json"
      ),
      "utf8"
    )
  );

  verseIds.forEach((verseId) => {
    const verse = JSON.parse(
      fs.readFileSync(
        path.join(
          rootDir,
          `verse_data/${verseId}.json`
        ),
        "utf8"
      )
    );
    const chunks = verse.echoParts || [];
    const fullRecording =
      ReadMyVerse.getChunkAudioPath(
        verseId,
        0,
        1,
        false
      ).replace(/^\.\//, "");

    assert.strictEqual(
      fs.existsSync(
        path.join(rootDir, fullRecording)
      ),
      true,
      `Missing full recording: ${fullRecording}`
    );

    assert.ok(
      chunks.length >= 1 &&
      chunks.length <= 8,
      `${verseId} must have one through eight chunks`
    );

    chunks.forEach((unused, index) => {
      const relativePath =
        ReadMyVerse.getChunkAudioPath(
          verseId,
          index,
          chunks.length
        ).replace(/^\.\//, "");

      assert.strictEqual(
        fs.existsSync(
          path.join(rootDir, relativePath)
        ),
        true,
        `Missing chunk recording: ${relativePath}`
      );
    });
  });
}

function testSafeWordScrambles() {
  assert.strictEqual(ScrambleSafety.isSafeWord("SHIT"), false);
  assert.strictEqual(ScrambleSafety.isSafeWord("friendly"), true);
  for (let seed = 0; seed < 1000; seed += 1) {
    let state = (seed + 1) >>> 0;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const scrambled = ReadMyVerse.scrambleCore("THIS", random);
    assert.ok(scrambled === null || ScrambleSafety.isSafeWord(scrambled));
  }
  const puzzle = ReadMyVerse.buildUnscramblePuzzle("THIS is the Word.", () => 0.5);
  assert.ok(puzzle.tokens.every((token) =>
    !token.required || ScrambleSafety.isSafeWord(token.scrambled)
  ));
}

function testVerseCrawlMotion() {
  const phone = ReadMyVerse.getCrawlMotion(620, 110, 100, 840);
  assert.ok(phone.travel > 400, "Crawl must cross most of the scene");
  assert.ok(phone.visibleMs > 0 && phone.visibleMs < phone.durationMs);
  assert.ok(Math.abs(phone.vanishingY + 100 - 840 * 0.30) < 1);
  const tablet = ReadMyVerse.getCrawlMotion(890, 180, 120, 1180);
  assert.ok(tablet.travel > phone.travel);
  assert.ok(tablet.durationMs >= 10500 && tablet.durationMs <= 22000);
  // The new font must be cached for offline PWA use.
  const sw = fs.readFileSync(path.join(rootDir, "service-worker.js"), "utf8");
  assert.ok(sw.includes('"./verse_fonts/NewsCycle-Bold.ttf"'));
  const styles = fs.readFileSync(path.join(rootDir, "read_my_verse.css"), "utf8");
  assert.ok(styles.includes('font-family: "News Cycle Bold", sans-serif !important'));
  assert.ok(styles.includes('--read-crawl-travel'));
}

function main() {
  const tests = [
    testSafeWordScrambles,
    testOneTapRevealsOneActualCharacter,
    testChunkTextPreservesPunctuation,
    testOneThroughEightChunkFilenames,
    testDailyContextValidation,
    testAssetsExist,
    testAnimatedActivityManifest,
    testInteractiveActivityManifest,
    testChunkAudioMatchingRules,
    testChunkAudioMatchingEligibility,
    testAnimatedTimingAndReducedMotion,
    testVerseCrawlMotion,
    testPreviewChunkModes,
    testScramblePreservesLettersAndPunctuation,
    testTapOrderHintsAndReset,
    testDuplicateTapWordsAreFair,
    testActivityEligibilityAndForcedChunks,
    testTileLayoutKeepsSolvedPositions,
    testTypewriterSoundsAreShortAndDistinct,
    testKeyboardSoundsAreShortAndDistinct,
    testInteractiveSessionsWithoutTts,
    testEveryVerseChunkRecordingExists
  ];

  tests.forEach((test) => test());

  console.log(
    `Read My Verse validation passed (${tests.length} checks).`
  );
}

main();
