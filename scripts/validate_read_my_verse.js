"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

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
    "verse_images/read_my_verse/fish_hook.png"
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

function main() {
  const tests = [
    testOneTapRevealsOneActualCharacter,
    testChunkTextPreservesPunctuation,
    testOneThroughEightChunkFilenames,
    testDailyContextValidation,
    testAssetsExist,
    testAnimatedActivityManifest,
    testAnimatedTimingAndReducedMotion,
    testPreviewChunkModes,
    testTypewriterSoundsAreShortAndDistinct,
    testEveryVerseChunkRecordingExists
  ];

  tests.forEach((test) => test());

  console.log(
    `Read My Verse validation passed (${tests.length} checks).`
  );
}

main();
