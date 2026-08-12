(function () {
  let currentGameShellGameId = "";

  const MEDAL_ICON_PATHS = Object.freeze({
    easy: "../../verse_images/bronze_medal.png",
    medium: "../../verse_images/silver_medal.png",
    hard: "../../verse_images/gold_medal.png"
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function gameIconImageHtml(src = "", fallbackIcon = "🎮", alt = "") {
    const safeSrc = escapeHtml(src || "");
    const safeFallbackIcon = escapeHtml(fallbackIcon || "🎮");
    const safeAlt = escapeHtml(alt || "");

    if (!safeSrc) {
      return safeFallbackIcon;
    }

    return `
      <img
        class="vm-game-icon-img"
        src="${safeSrc}"
        alt="${safeAlt}"
        loading="lazy"
        decoding="async"
        draggable="false"
        onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
      >
      <span class="vm-game-icon-fallback" hidden>${safeFallbackIcon}</span>
    `;
  }

  function gameIconImageHtmlForId(gameId = "", fallbackIcon = "🎮", alt = "") {
    const safeGameId = String(gameId || "").trim();

    if (safeGameId) {
      currentGameShellGameId = safeGameId;
    }

    if (!safeGameId) {
      return gameIconImageHtml("", fallbackIcon, alt);
    }

    return gameIconImageHtml(
      `../../verse_images/game_icons/app_icon_${safeGameId}.png`,
      fallbackIcon,
      alt
    );
  }

  function getModeMedalIconSrc(mode) {
    return MEDAL_ICON_PATHS[String(mode || "").trim()] || "";
  }

  function getModeMedalFallback(mode) {
    if (mode === "easy") return "🥉";
    if (mode === "medium") return "🥈";
    if (mode === "hard") return "🥇";
    return "🏅";
  }

  function medalIconHtml(mode, className = "") {
    const src = getModeMedalIconSrc(mode);
    const fallback = getModeMedalFallback(mode);
    const safeClassName = className ? ` ${escapeHtml(className)}` : "";

    if (!src) {
      return `<span class="vm-medal-icon-fallback${safeClassName}" aria-hidden="true">${escapeHtml(fallback)}</span>`;
    }

    return `
      <img
        class="vm-medal-icon${safeClassName}"
        src="${escapeHtml(src)}"
        alt=""
        aria-hidden="true"
        draggable="false"
        onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
      >
      <span class="vm-medal-icon-fallback${safeClassName}" hidden aria-hidden="true">${escapeHtml(fallback)}</span>
    `;
  }

  function medalSetIconHtml(className = "") {
    const safeClassName = className ? ` ${escapeHtml(className)}` : "";

    return `
      <span class="vm-medal-set${safeClassName}" aria-hidden="true">
        ${medalIconHtml("easy", "vm-medal-set-img")}
        ${medalIconHtml("medium", "vm-medal-set-img")}
        ${medalIconHtml("hard", "vm-medal-set-img")}
      </span>
    `;
  }

  function modeSelectIconHtml(icon = "", iconHtml = "") {
    if (iconHtml) return iconHtml;

    const rawIcon = String(icon || "").trim();

    if (
      !rawIcon ||
      rawIcon.includes("🥉") ||
      rawIcon.includes("🥈") ||
      rawIcon.includes("🥇") ||
      rawIcon.includes("🏅")
    ) {
      return medalSetIconHtml("vm-mode-select-medal-set");
    }

    return escapeHtml(rawIcon);
  }

  function modeButtonContentHtml(mode = {}) {
    const modeId = String(mode?.id || "").trim();
    const rawLabel = String(mode?.label || getModeLabel(modeId));

    const cleanLabel = rawLabel
      .replace(/[🥉🥈🥇🏅]/g, "")
      .trim() || getModeLabel(modeId);

    return `
      ${medalIconHtml(modeId, "vm-mode-btn-medal")}
      <span class="vm-mode-btn-label">${escapeHtml(cleanLabel)}</span>
    `;
  }

  function styleVarsHtml(options = {}) {
    const vars = [];

    if (options.bg) vars.push(`--vm-game-bg:${options.bg}`);
    if (options.pageBg) vars.push(`--vm-page-bg:${options.pageBg}`);
    if (options.accent) vars.push(`--vm-game-accent:${options.accent}`);
    if (options.helpTitleBg) vars.push(`--vm-game-help-title-bg:${options.helpTitleBg}`);
    if (options.helpTitleColor) vars.push(`--vm-game-help-title-color:${options.helpTitleColor}`);
    if (options.helpCloseBg) vars.push(`--vm-game-help-close-bg:${options.helpCloseBg}`);
    if (options.helpCloseColor) vars.push(`--vm-game-help-close-color:${options.helpCloseColor}`);

    return vars.length ? ` style="${vars.join("; ")};"` : "";
  }

  function syncGameShellTheme(options = {}) {
    const pageBg = String(
      options.pageBg ||
      options.bg ||
      options.accent ||
      "#7f66c6"
    ).trim() || "#7f66c6";

    try {
      document.documentElement.style.setProperty(
        "--vm-page-bg",
        pageBg
      );

      document.body.style.setProperty(
        "--vm-page-bg",
        pageBg
      );

      document.getElementById("app")?.style?.setProperty(
        "--vm-page-bg",
        pageBg
      );

      let themeMeta = document.querySelector('meta[name="theme-color"]');

      if (!themeMeta) {
        themeMeta = document.createElement("meta");
        themeMeta.setAttribute("name", "theme-color");
        document.head.appendChild(themeMeta);
      }

      themeMeta.setAttribute("content", pageBg);
    } catch (err) {
      console.warn(
        "Could not sync external game shell theme",
        err
      );
    }
  }

  function getLaunchParams() {
    try {
      return window.VerseGameBridge?.getLaunchParams?.() || {};
    } catch (err) {
      console.warn("Could not read launch params", err);
      return {};
    }
  }

  function isGameMixLaunch() {
    return !!getLaunchParams().mix;
  }

  function getGameMixMode() {
    const mode = String(getLaunchParams().mode || "").trim();
    return ["easy", "medium", "hard"].includes(mode) ? mode : "";
  }

  function isZooTodoLaunchForVerse(verseId = "") {
    const params = getLaunchParams();

    if (params.todoSource !== "zoo_todo") return false;
    if (params.todoType !== "feed_pet" && params.todoType !== "wake_pet") return false;

    const safeVerseId = String(verseId || params.verseId || "").trim();
    const todoVerseId = String(params.todoVerseId || "").trim();

    if (!safeVerseId || !todoVerseId) return false;

    return safeVerseId === todoVerseId;
  }

  function getZooTodoActionText() {
    const params = getLaunchParams();

    if (params.todoText) return params.todoText;

    const petName = params.todoPetName || "BibloPet";

    if (params.todoType === "wake_pet") return `You woke up ${petName}!`;
    if (params.todoType === "feed_pet") return `You fed ${petName}!`;

    return "You helped your BibloPet!";
  }

  function getZooTodoCompleteTitleMarkup() {
    return `
      <div class="vm-game-title vm-complete-title">
        <div>Zoo To-Do</div>
        <div>Complete!</div>
      </div>
    `;
  }

  function getZooTodoCompleteSubtitleMarkup() {
    return `
      <div class="vm-zoo-todo-complete-subtitle">
        ✅ ${escapeHtml(getZooTodoActionText())}
      </div>
    `;
  }

  function getZooTodoCompleteIconHtml(verseId = "") {
    const params = getLaunchParams();
    const safeVerseId = String(verseId || params.todoVerseId || params.verseId || "").trim();
    const safeEmoji = params.todoPetEmoji || "🐾";

    if (!safeVerseId) {
      return escapeHtml(safeEmoji);
    }

    const imgSrc = `../../pet_images/pet_${safeVerseId}.png`;

    return `
      <img
        src="${escapeHtml(imgSrc)}"
        alt=""
        draggable="false"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"
      >
      <span style="display:none">${escapeHtml(safeEmoji)}</span>
    `;
  }

  function showGameMixQuitConfirm({
    title = "Quit Game Mix?",
    noText = "Keep Playing",
    yesText = "Quit Mix",
    onConfirm = () => { }
  } = {}) {
    const existing = document.getElementById("vmGameMixConfirmOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "vmGameMixConfirmOverlay";
    overlay.className = "vm-game-mix-confirm-overlay";

    overlay.innerHTML = `
      <div class="vm-game-mix-confirm-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="vm-game-mix-confirm-title">${escapeHtml(title)}</div>

        <div class="vm-game-mix-confirm-actions">
          <button class="vm-btn vm-btn-secondary vm-game-mix-keep-playing" id="vmGameMixConfirmNo" type="button">
            ${escapeHtml(noText)}
          </button>

          <button class="vm-btn vm-game-mix-quit" id="vmGameMixConfirmYes" type="button">
            ${escapeHtml(yesText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
    };

    const noBtn = overlay.querySelector("#vmGameMixConfirmNo");
    const yesBtn = overlay.querySelector("#vmGameMixConfirmYes");

    if (noBtn) noBtn.onclick = close;

    if (yesBtn) {
      yesBtn.onclick = () => {
        close();
        onConfirm();
      };
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close();
      }
    });
  }

  const SHARED_FUN_DECOYS = Object.freeze([
    "taco",
    "banana",
    "penguin",
    "cupcake",
    "pickle",
    "waffle",
    "rocket",
    "robot",
    "balloon",
    "otter",
    "pretzel",
    "pancake",
    "donut",
    "cookie",
    "muffin",
    "noodle",
    "pizza",
    "popcorn",
    "jellybean",
    "sloth",
    "blueberry",
    "melon",
    "coconut",
    "burrito",
    "sundae",
    "snowman",
    "rainbow",
    "unicorn",
    "dinosaur",
    "kangaroo",
    "hamster",
    "kitten",
    "puppy",
    "monkey",
    "zebra",
    "narwhal",
    "pirate",
    "scooter",
    "backpack",
    "firetruck",
    "yo-yo",
    "treasure",
    "volcano",
    "bubble",
    "bongo",
    "slipper",
    "meatball",
    "spaghetti",
    "burger",
    "brush",
    "glimmer",
    "wobble",
    "dazzle",
    "bloop",
    "pibble",
    "snorf"
  ]);

  let sharedFunDecoyBag = [];

  const SHARED_BIBLE_BOOK_DECOYS = Object.freeze([
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalm",
    "Proverbs",
    "Isaiah",
    "Jeremiah",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "Galatians",
    "Ephesians",
    "Colossians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation"
  ]);

  function getFunDecoys() {
    return [...SHARED_FUN_DECOYS];
  }

  function getBibleBookDecoys() {
    return [...SHARED_BIBLE_BOOK_DECOYS];
  }

  function getBookDecoys(correctBook, count = 6) {
    const correctNorm = normalizeWord(correctBook);
    const desiredCount = Math.max(0, Number(count) || 0);

    if (!desiredCount) return [];

    return shuffle(
      getBibleBookDecoys().filter((book) => normalizeWord(book) !== correctNorm)
    ).slice(0, desiredCount);
  }

  function getFunWordDecoys(correctWord, verseWords = [], count = 6) {
    const correctNorm = normalizeWord(correctWord);
    const desiredCount = Math.max(0, Number(count) || 0);

    if (!desiredCount) return [];

    const verseWordSet = new Set(
      (Array.isArray(verseWords) ? verseWords : [])
        .map(normalizeWord)
        .filter(Boolean)
    );

    return shuffle(
      getFunDecoys().filter((word) => {
        const key = normalizeWord(word);
        if (!key) return false;
        if (key === correctNorm) return false;
        if (verseWordSet.has(key)) return false;
        return true;
      })
    ).slice(0, desiredCount);
  }

  function getVerseWordDecoys({
    words = [],
    correct = "",
    targetIndex = -1,
    count = 6,
    avoidNext = 2,
    fallbackToFun = true
  } = {}) {
    const desiredCount = Math.max(0, Number(count) || 0);
    const correctNorm = normalizeWord(correct);
    const safeWords = Array.isArray(words) ? words : [];
    const safeTargetIndex = Number(targetIndex);
    const safeAvoidNext = Math.max(0, Number(avoidNext) || 0);

    if (!desiredCount) return [];

    const blocked = new Set();

    if (correctNorm) {
      blocked.add(correctNorm);
    }

    if (
      Number.isFinite(safeTargetIndex) &&
      safeTargetIndex >= 0 &&
      safeAvoidNext > 0
    ) {
      for (
        let index = safeTargetIndex + 1;
        index <= safeTargetIndex + safeAvoidNext && index < safeWords.length;
        index += 1
      ) {
        const nextKey = normalizeWord(safeWords[index]);
        if (nextKey) {
          blocked.add(nextKey);
        }
      }
    }

    const candidates = [];
    const used = new Set();

    for (const word of safeWords) {
      const key = normalizeWord(word);

      if (!key) continue;
      if (blocked.has(key)) continue;
      if (used.has(key)) continue;

      candidates.push(word);
      used.add(key);
    }

    const out = shuffle(candidates).slice(0, desiredCount);

    if (out.length < desiredCount && fallbackToFun) {
      const alreadyUsed = new Set(out.map(normalizeWord));

      for (const word of getFunWordDecoys(correct, safeWords, desiredCount * 2)) {
        const key = normalizeWord(word);

        if (!key) continue;
        if (blocked.has(key)) continue;
        if (alreadyUsed.has(key)) continue;

        out.push(word);
        alreadyUsed.add(key);

        if (out.length >= desiredCount) break;
      }
    }

    return out.slice(0, desiredCount);
  }

  function shuffle(array) {
    const copy = Array.isArray(array) ? array.slice() : [];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function clamp(value, min, max) {
    const number = Number(value);
    const lower = Number(min);
    const upper = Number(max);

    if (!Number.isFinite(number)) return lower;
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) return number;

    return Math.max(lower, Math.min(upper, number));
  }

  function capitalize(value) {
    const text = String(value ?? "");
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function normalizeWord(value) {
    return String(value ?? "")
      .trim()
      .replace(/[‘’]/g, "'")
      .toLowerCase()
      .replace(/^[^a-z0-9]+/gi, "")
      .replace(/[^a-z0-9]+$/gi, "")
      .replace(/[^a-z0-9']/gi, "");
  }

  function tokenizeVerseWords(text) {
    const normalized = String(text ?? "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—−]/g, "-");

    const words = [];
    const re = /[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?(?:,[0-9]{3})*/g;

    for (const match of normalized.matchAll(re)) {
      const word = match[0];
      if (word) words.push(word);
    }

    return words;
  }

  function tokenizeVerseForBuild(text) {
    const raw = String(text ?? "");
    const tokens = [];
    const re = /(\s+|[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)?(?:,[0-9]{3})*|[^\sA-Za-z0-9]+)/g;

    for (const part of raw.match(re) || []) {
      if (/^\s+$/.test(part)) {
        tokens.push({ kind: "space", text: part });
      } else if (/^[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)?(?:,[0-9]{3})*$/.test(part)) {
        tokens.push({ kind: "word", text: part });
      } else {
        tokens.push({ kind: "punct", text: part });
      }
    }

    return tokens;
  }

  function extractWordEntries(tokens) {
    return Array.isArray(tokens)
      ? tokens
        .filter((token) => token && token.kind === "word")
        .map((token) => ({ display: token.text }))
      : [];
  }

  function getBuildLengthScore(verseText, book, reference) {
    return (
      String(verseText || "").length +
      String(book || "").length +
      String(reference || "").length
    );
  }

  function getBuildSizeClass(verseText, book, reference, buildArea = "large") {
    const score = getBuildLengthScore(verseText, book, reference);

    const profiles = {
      large: {
        mediumAt: 82,
        smallAt: 118
      },
      compact: {
        mediumAt: 73,
        smallAt: 121
      },
      none: {
        mediumAt: Infinity,
        smallAt: Infinity
      }
    };

    const profile = profiles[String(buildArea || "large").toLowerCase()] || profiles.large;

    if (score >= profile.smallAt) return "is-small";
    if (score >= profile.mediumAt) return "is-medium";
    return "is-normal";
  }

  function buildVerseSegments({
    verseText = "",
    book = "",
    reference = "",
    buildArea = "large"
  } = {}) {
    const words = tokenizeVerseWords(verseText);
    const bookLabel = String(book || "").trim();
    const referenceLabel = String(reference || "").trim();
    const area = String(buildArea || "large").toLowerCase();

    const segments = [...words];
    const metaIndices = new Set();

    if (bookLabel) {
      metaIndices.add(segments.length);
      segments.push(bookLabel);
    }

    if (referenceLabel) {
      metaIndices.add(segments.length);
      segments.push(referenceLabel);
    }

    return {
      words,
      segments,
      metaIndices,
      bookLabel,
      referenceLabel,
      buildArea: area,
      buildSizeClass: getBuildSizeClass(verseText, bookLabel, referenceLabel, area)
    };
  }

  function getBuildDisplayTokens({
    verseText = "",
    book = "",
    reference = ""
  } = {}) {
    const tokens = [];
    let wordIndex = 0;

    for (const token of tokenizeVerseForBuild(verseText)) {
      if (!token) continue;

      if (token.kind === "word") {
        tokens.push({
          kind: "word",
          text: token.text,
          wordIndex,
          segmentIndex: wordIndex,
          isMeta: false
        });

        wordIndex += 1;
        continue;
      }

      if (token.kind === "space") {
        tokens.push({
          kind: "space",
          text: token.text,
          wordIndex: null,
          segmentIndex: Math.max(0, wordIndex - 1),
          isMeta: false
        });

        continue;
      }

      tokens.push({
        kind: "punct",
        text: token.text,
        wordIndex: null,
        segmentIndex: Math.max(0, wordIndex - 1),
        isMeta: false
      });
    }

    const bookLabel = String(book || "").trim();
    const referenceLabel = String(reference || "").trim();

    if (bookLabel || referenceLabel) {
      tokens.push({
        kind: "space",
        text: " ",
        wordIndex: null,
        segmentIndex: Math.max(0, wordIndex - 1),
        isMeta: false
      });
    }

    if (bookLabel) {
      tokens.push({
        kind: "meta",
        text: bookLabel,
        wordIndex: null,
        segmentIndex: wordIndex,
        isMeta: true,
        metaType: "book"
      });

      wordIndex += 1;
    }

    if (bookLabel && referenceLabel) {
      tokens.push({
        kind: "space",
        text: " ",
        wordIndex: null,
        segmentIndex: Math.max(0, wordIndex - 1),
        isMeta: true
      });
    }

    if (referenceLabel) {
      tokens.push({
        kind: "meta",
        text: referenceLabel,
        wordIndex: null,
        segmentIndex: wordIndex,
        isMeta: true,
        metaType: "reference"
      });
    }

    return tokens;
  }

  function isBuildDisplayTokenBuilt(token, progressIndex = 0) {
    const progress = Math.max(0, Number(progressIndex) || 0);

    if (!token) return false;

    if (token.kind === "word" || token.kind === "meta") {
      return Number(token.segmentIndex) < progress;
    }

    if (token.kind === "punct") {
      return Number(token.segmentIndex) < progress;
    }

    if (token.kind === "space") {
      return Number(token.segmentIndex) < progress;
    }

    return false;
  }

  function renderBuildProgressHtml({
    verseText = "",
    book = "",
    reference = "",
    progressIndex = 0,
    buildArea = "large",
    hideUnbuilt = false,
    extraClass = ""
  } = {}) {
    const sizeClass = getBuildSizeClass(verseText, book, reference, buildArea);
    const classes = [
      "vm-build-text",
      "vm-build-text--progress",
      sizeClass,
      hideUnbuilt ? "is-hide-unbuilt" : "",
      extraClass
    ].filter(Boolean).join(" ");

    const tokens = getBuildDisplayTokens({
      verseText,
      book,
      reference
    });

    const html = tokens.map((token) => {
      const built = isBuildDisplayTokenBuilt(token, progressIndex);

      if (token.kind === "space") {
        return `<span class="vm-build-space ${built ? "is-built" : ""}">${escapeHtml(token.text)}</span>`;
      }

      if (token.kind === "punct") {
        return `<span class="vm-build-punct ${built ? "is-built" : ""}">${escapeHtml(token.text)}</span>`;
      }

      if (token.kind === "meta") {
        return `<span class="vm-build-word vm-build-meta vm-build-meta--${escapeHtml(token.metaType || "meta")} ${built ? "is-built" : ""}">${escapeHtml(token.text)}</span>`;
      }

      return `<span class="vm-build-word ${built ? "is-built" : ""}">${escapeHtml(token.text)}</span>`;
    }).join("");

    return {
      className: classes,
      html,
      buildSizeClass: sizeClass,
      tokens
    };
  }

  function countBuildTextLines(textEl) {
    if (!textEl) return 0;

    const tops = [];

    const nodes = Array.from(textEl.children || []);
    for (const node of nodes) {
      const rects = Array.from(node.getClientRects ? node.getClientRects() : []);

      for (const rect of rects) {
        if (rect.width < 0.5 || rect.height < 0.5) continue;

        const top = Math.round(rect.top);
        if (!tops.some((existing) => Math.abs(existing - top) <= 2)) {
          tops.push(top);
        }
      }
    }

    return tops.length || 1;
  }

  function getBuildTextFitBox(buildEl) {
    if (!buildEl) return { width: 0, height: 0 };

    const style = window.getComputedStyle(buildEl);

    const paddingX =
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0);

    const paddingY =
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0);

    return {
      width: Math.max(0, buildEl.clientWidth - paddingX),
      height: Math.max(0, buildEl.clientHeight - paddingY)
    };
  }

  function buildTextOverflows(buildEl, textEl) {
    if (!buildEl || !textEl) return true;

    const box = getBuildTextFitBox(buildEl);
    const fudge = 1.5;

    return (
      textEl.scrollWidth > box.width + fudge ||
      textEl.scrollHeight > box.height + fudge
    );
  }

  function fitBuildTextOnce({
    buildEl = null,
    textEl = null,
    buildArea = "large",
    min = null,
    max = null,
    candidates = null,
    debug = false
  } = {}) {
    if (!buildEl || !textEl) return null;

    const area = String(buildArea || "large").toLowerCase();

    const profile = area === "compact"
      ? {
        min: 11,
        max: 34,
        candidates: [
          { maxWidth: "100%", lineHeight: 1.06 },
          { maxWidth: "96%", lineHeight: 1.05 },
          { maxWidth: "92%", lineHeight: 1.04 },
          { maxWidth: "88%", lineHeight: 1.03 }
        ]
      }
      : {
        min: 13,
        max: 46,
        candidates: [
          { maxWidth: "100%", lineHeight: 1.10 },
          { maxWidth: "96%", lineHeight: 1.08 },
          { maxWidth: "92%", lineHeight: 1.06 },
          { maxWidth: "88%", lineHeight: 1.05 }
        ]
      };

    const hasCustomMin = min !== null && min !== undefined && Number.isFinite(Number(min));
    const hasCustomMax = max !== null && max !== undefined && Number.isFinite(Number(max));

    const safeMin = hasCustomMin ? Number(min) : profile.min;
    const safeMax = hasCustomMax ? Number(max) : profile.max;
    const testCandidates = Array.isArray(candidates) && candidates.length
      ? candidates
      : profile.candidates;

    const previous = {
      fontSize: textEl.style.fontSize,
      lineHeight: textEl.style.lineHeight,
      maxWidth: textEl.style.maxWidth,
      width: textEl.style.width,
      marginLeft: textEl.style.marginLeft,
      marginRight: textEl.style.marginRight
    };

    let best = null;

    for (const candidate of testCandidates) {
      textEl.style.width = "100%";
      textEl.style.maxWidth = candidate.maxWidth || "100%";
      textEl.style.marginLeft = "auto";
      textEl.style.marginRight = "auto";
      textEl.style.lineHeight = String(candidate.lineHeight || "");

      let low = safeMin;
      let high = safeMax;
      let bestSize = safeMin;

      for (let i = 0; i < 10; i += 1) {
        const mid = (low + high) / 2;
        textEl.style.fontSize = `${mid}px`;

        if (buildTextOverflows(buildEl, textEl)) {
          high = mid;
        } else {
          bestSize = mid;
          low = mid;
        }
      }

      textEl.style.fontSize = `${bestSize}px`;

      const lineCount = countBuildTextLines(textEl);
      const box = getBuildTextFitBox(buildEl);
      const verticalFill = box.height
        ? Math.min(1, textEl.scrollHeight / box.height)
        : 0;

      const result = {
        fontSize: Math.floor(bestSize * 10) / 10,
        maxWidth: candidate.maxWidth || "100%",
        lineHeight: candidate.lineHeight || "",
        lineCount,
        verticalFill,
        overflows: buildTextOverflows(buildEl, textEl)
      };

      if (!result.overflows) {
        if (!best) {
          best = result;
        } else {
          const sizeDiff = result.fontSize - best.fontSize;

          if (sizeDiff > 0.75) {
            best = result;
          } else if (Math.abs(sizeDiff) <= 0.75) {
            if (result.lineCount < best.lineCount) {
              best = result;
            } else if (
              result.lineCount === best.lineCount &&
              result.verticalFill > best.verticalFill
            ) {
              best = result;
            }
          }
        }
      }
    }

    if (!best) {
      textEl.style.fontSize = previous.fontSize;
      textEl.style.lineHeight = previous.lineHeight;
      textEl.style.maxWidth = previous.maxWidth;
      textEl.style.width = previous.width;
      textEl.style.marginLeft = previous.marginLeft;
      textEl.style.marginRight = previous.marginRight;
      return null;
    }

    textEl.style.fontSize = `${best.fontSize}px`;
    textEl.style.lineHeight = String(best.lineHeight);
    textEl.style.maxWidth = best.maxWidth;
    textEl.style.width = "100%";
    textEl.style.marginLeft = "auto";
    textEl.style.marginRight = "auto";

    textEl.dataset.vmFitFontSize = String(best.fontSize);
    textEl.dataset.vmFitMaxWidth = String(best.maxWidth);
    textEl.dataset.vmFitLineHeight = String(best.lineHeight);
    textEl.dataset.vmFitLines = String(best.lineCount);
    textEl.dataset.vmFitArea = area;

    if (debug) {
      console.table({
        fontSize: best.fontSize,
        maxWidth: best.maxWidth,
        lineHeight: best.lineHeight,
        lineCount: best.lineCount,
        verticalFill: Math.round(best.verticalFill * 100) + "%",
        overflows: best.overflows
      });
    }

    return best;
  }

  const BUILD_STREAK_DEFAULT_THRESHOLDS = [1, 3, 5, 7, 9];

  function getBuildStreakLevel(streak = 0, thresholds = BUILD_STREAK_DEFAULT_THRESHOLDS) {
    const safeStreak = Math.max(0, Number(streak) || 0);
    const safeThresholds = Array.isArray(thresholds) && thresholds.length
      ? thresholds.map(value => Math.max(0, Number(value) || 0))
      : BUILD_STREAK_DEFAULT_THRESHOLDS;

    let level = 0;

    safeThresholds.forEach((threshold, index) => {
      if (safeStreak >= threshold) {
        level = index + 1;
      }
    });

    return Math.max(0, Math.min(5, level));
  }

  function updateBuildStreakOverlay({
    buildEl = null,
    streak = 0,
    colors = [],
    thresholds = BUILD_STREAK_DEFAULT_THRESHOLDS,
    pulse = false,
    broken = false
  } = {}) {
    if (!buildEl) return null;

    const safeColors = [
      colors[0] || "#ffc751",
      colors[1] || "#a7cb6f",
      colors[2] || "#64b5f6",
      colors[3] || "#ff8cc8",
      colors[4] || "#ffffff"
    ];

    const level = getBuildStreakLevel(streak, thresholds);

    const computedPosition = window.getComputedStyle(buildEl).position;
    if (computedPosition === "static") {
      buildEl.style.position = "relative";
    }

    let overlay = buildEl.querySelector(":scope > .vm-build-streak-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "vm-build-streak-overlay";
      overlay.setAttribute("aria-hidden", "true");
      buildEl.appendChild(overlay);
    }

    overlay.classList.remove(
      "is-level-0",
      "is-level-1",
      "is-level-2",
      "is-level-3",
      "is-level-4",
      "is-level-5",
      "is-pulsing",
      "is-broken"
    );

    overlay.classList.add(`is-level-${level}`);
    overlay.dataset.streak = String(Math.max(0, Number(streak) || 0));
    overlay.dataset.level = String(level);

    overlay.style.setProperty("--vm-build-streak-color-1", safeColors[0]);
    overlay.style.setProperty("--vm-build-streak-color-2", safeColors[1]);
    overlay.style.setProperty("--vm-build-streak-color-3", safeColors[2]);
    overlay.style.setProperty("--vm-build-streak-color-4", safeColors[3]);
    overlay.style.setProperty("--vm-build-streak-color-5", safeColors[4]);
    overlay.style.setProperty("--vm-build-streak-color", safeColors[Math.max(0, level - 1)] || safeColors[0]);

    if (pulse && level > 0) {
      void overlay.offsetWidth;
      overlay.classList.add("is-pulsing");
    }

    if (broken) {
      void overlay.offsetWidth;
      overlay.classList.add("is-broken");
    }

    return {
      overlay,
      level,
      streak: Math.max(0, Number(streak) || 0)
    };
  }


  function getPhaseForProgress({
    progressIndex = 0,
    wordCount = 0,
    totalSegments = 0,
    bookLabel = "",
    referenceLabel = "",
    hasBook = null,
    hasReference = null
  } = {}) {
    const index = Math.max(0, Number(progressIndex) || 0);
    const words = Math.max(0, Number(wordCount) || 0);
    const total = Math.max(words, Number(totalSegments) || 0);

    const book = hasBook === null ? !!String(bookLabel || "").trim() : !!hasBook;
    const reference = hasReference === null ? !!String(referenceLabel || "").trim() : !!hasReference;

    if (index < words) return "words";

    let cursor = words;

    if (book) {
      if (index === cursor) return "book";
      cursor += 1;
    }

    if (reference) {
      if (index === cursor) return "reference";
      cursor += 1;
    }

    if (index < total) return "reference";

    return "done";
  }

  function titleCaseBookFromSlug(slug) {
    const smallWords = new Set(["of", "the"]);

    return String(slug ?? "")
      .replace(/\.json$/i, "")
      .split("_")
      .filter(Boolean)
      .map((part, index) => {
        const lower = part.toLowerCase();
        if (index > 0 && smallWords.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  function stripTranslationFromReference(ref, translation) {
    let raw = String(ref ?? "").trim();
    const trans = String(translation ?? "").trim();

    const knownTranslations = [
      "ESV", "NIV", "NLT", "KJV", "NKJV", "CSB", "HCSB", "NASB", "NASB95",
      "LSB", "AMP", "RSV", "NRSV", "NRSVUE", "NET", "MSG", "GW", "CEV",
      "GNT", "ERV", "ICB"
    ];

    const stripCode = (text, code) => {
      const escaped = String(code).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return String(text)
        .replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, "i"), "")
        .replace(new RegExp(`\\s+${escaped}\\s*$`, "i"), "")
        .replace(new RegExp(`\\s*[-–—]\\s*${escaped}\\s*$`, "i"), "")
        .trim();
    };

    if (trans) raw = stripCode(raw, trans);
    for (const code of knownTranslations) {
      raw = stripCode(raw, code);
    }

    return raw.trim();
  }

  function parseReferenceParts(ref, translation, verseId) {
    const rawId = String(verseId ?? "")
      .trim()
      .replace(/\.json$/i, "")
      .replace(/[–—−]/g, "-");

    if (rawId) {
      const parts = rawId.split("_").filter(Boolean);
      const nums = [];

      while (parts.length && /^\d+$/.test(parts[parts.length - 1])) {
        nums.unshift(Number(parts.pop()));
      }

      if (parts.length && nums.length >= 2) {
        const book = titleCaseBookFromSlug(parts.join("_"));
        const chapter = nums[0];
        const verse = nums[1];
        const verseEnd = nums.length >= 3 ? nums[2] : null;
        const reference = verseEnd ? `${chapter}:${verse}-${verseEnd}` : `${chapter}:${verse}`;

        return {
          book,
          chapter,
          verse,
          verseEnd,
          reference,
          display: `${book} ${reference}`
        };
      }
    }

    const rawRef = stripTranslationFromReference(ref, translation).replace(/[–—−]/g, "-");

    const match = rawRef.match(/^(.*?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?\s*$/);
    if (match) {
      const book = match[1].trim();
      const chapter = Number(match[2]);
      const verse = Number(match[3]);
      const endChapter = match[4] ? Number(match[4]) : null;
      const verseEnd = match[5] ? Number(match[5]) : null;

      const reference = verseEnd
        ? endChapter && endChapter !== chapter
          ? `${chapter}:${verse}-${endChapter}:${verseEnd}`
          : `${chapter}:${verse}-${verseEnd}`
        : `${chapter}:${verse}`;

      return {
        book,
        chapter,
        verse,
        verseEnd,
        reference,
        display: `${book} ${reference}`
      };
    }

    const lastSpace = rawRef.lastIndexOf(" ");
    if (lastSpace > 0) {
      const book = rawRef.slice(0, lastSpace).trim();
      const reference = rawRef.slice(lastSpace + 1).trim();

      return {
        book,
        chapter: null,
        verse: null,
        verseEnd: null,
        reference,
        display: rawRef
      };
    }

    return {
      book: rawRef,
      chapter: null,
      verse: null,
      verseEnd: null,
      reference: "",
      display: rawRef
    };
  }

  function getReferenceDecoys(referenceMeta, mode = "easy", count = 6) {
    const chapter = Number(referenceMeta?.chapter);
    const verse = Number(referenceMeta?.verse);
    const verseEnd = referenceMeta?.verseEnd == null ? null : Number(referenceMeta.verseEnd);
    const correct = String(referenceMeta?.reference ?? "").trim();
    const difficulty = String(mode || "easy").toLowerCase();
    const desiredCount = Math.max(0, Number(count) || 0);

    if (!desiredCount) return [];

    const hasParsedReference =
      Number.isFinite(chapter) &&
      chapter >= 1 &&
      Number.isFinite(verse) &&
      verse >= 1;

    const span =
      Number.isFinite(verseEnd) && verseEnd > verse
        ? verseEnd - verse
        : 0;

    const formatReference = (rawChapter, rawVerse) => {
      const safeChapter = Math.max(1, Math.floor(Number(rawChapter) || 1));
      const safeVerse = Math.max(1, Math.floor(Number(rawVerse) || 1));

      return span > 0
        ? `${safeChapter}:${safeVerse}-${safeVerse + span}`
        : `${safeChapter}:${safeVerse}`;
    };

    const addCandidate = (set, candidate) => {
      const text = String(candidate ?? "").trim();
      if (!text) return;
      if (text === correct) return;
      set.add(text);
    };

    const fallbackRefs = [
      "1:1",
      "3:16",
      "8:28",
      "23:4",
      "4:12",
      "5:13",
      "6:27",
      "10:10",
      "12:2",
      "15:3"
    ];

    const out = new Set();

    if (!hasParsedReference) {
      for (const ref of fallbackRefs) {
        addCandidate(out, ref);
        if (out.size >= desiredCount) return [...out];
      }
      return [...out].slice(0, desiredCount);
    }

    if (difficulty === "medium" || difficulty === "hard") {
      const offsets = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
        [0, -2],
        [0, 2],
        [-2, 0],
        [2, 0]
      ];

      for (const [chapterOffset, verseOffset] of offsets) {
        addCandidate(out, formatReference(chapter + chapterOffset, verse + verseOffset));
        if (out.size >= desiredCount) return [...out];
      }
    }

    let tries = 0;
    while (out.size < desiredCount && tries < 200) {
      tries += 1;

      const randomChapter = 1 + Math.floor(Math.random() * 28);
      const randomVerse = 1 + Math.floor(Math.random() * 40);

      addCandidate(out, formatReference(randomChapter, randomVerse));
    }

    for (const ref of fallbackRefs) {
      addCandidate(out, ref);
      if (out.size >= desiredCount) break;
    }

    return [...out].slice(0, desiredCount);
  }

  function helpOverlayHtml({
    id = "verseGameHelpOverlay",
    title = "How to Play",
    body = "",
    closeText = "Close"
  } = {}) {
    return `
      <div class="vm-game-help-overlay" id="${escapeHtml(id)}" aria-hidden="true">
        <div class="vm-game-help-panel">
          <div class="vm-game-help-title">${escapeHtml(title)}</div>

          <div class="vm-game-help-body-wrap">
            <div class="vm-game-help-body">${body}</div>
          </div>

          <div class="vm-game-help-actions">
            <button class="vm-btn" id="${escapeHtml(id)}CloseBtn" type="button">${escapeHtml(closeText)}</button>
          </div>
        </div>
      </div>
    `;
  }

  function openHelp(id = "verseGameHelpOverlay", mode = "close", closeText = "Close") {
    const overlay = document.getElementById(id);
    const closeBtn = document.getElementById(`${id}CloseBtn`);

    if (!overlay) return;

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    overlay.dataset.mode = mode;

    if (closeBtn) closeBtn.textContent = closeText;
  }

  function closeHelp(id = "verseGameHelpOverlay") {
    const overlay = document.getElementById(id);
    if (!overlay) return;

    if (overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function wireHelp({
    id = "verseGameHelpOverlay",
    triggerId = "helpBtn",
    onBack = null,
    onClose = null,
    closeText = "Close"
  } = {}) {
    const trigger = document.getElementById(triggerId);
    const overlay = document.getElementById(id);
    const closeBtn = document.getElementById(`${id}CloseBtn`);

    if (trigger) {
      trigger.onclick = () => {
        openHelp(id, "close", closeText);
      };
    }

    const closeAction = () => {
      const mode = overlay?.dataset.mode || "close";

      if (mode === "back" && typeof onBack === "function") {
        onBack();
        return;
      }

      closeHelp(id);

      if (typeof onClose === "function") {
        onClose();
      }
    };

    if (closeBtn) closeBtn.onclick = closeAction;

    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeAction();
      };
    }
  }

  function renderTitleScreen({
    app,
    title,
    icon = "🎮",
    iconHtml = "",
    helpHtml = "",
    helpOverlayId = "verseGameHelpOverlay",
    startText = "Start",
    helpText = "How to Play",
    backLabel = "Back",
    theme = {},
    debugBadge = "",
    onBack,
    onStart
  } = {}) {
    if (!app) return;

    syncGameShellTheme(theme);

    const debugBadgeMarkup = debugBadge
      ? `<div class="vm-game-debug-badge">${escapeHtml(debugBadge)}</div>`
      : "";
    const medalPillMarkup = renderShellMedalPill();

    if (isGameMixLaunch() && getGameMixMode() && typeof onStart === "function") {
      app.innerHTML = `
        <div class="vm-game-screen"${styleVarsHtml(theme)}>
          <div class="vm-game-stage">
            <div class="vm-game-center">
              <div class="vm-game-icon" aria-hidden="true">🔀</div>
              <div class="vm-game-title">Loading Game Mix...</div>
            </div>
          </div>
        </div>
      `;

      setTimeout(() => onStart(), 0);
      return;
    }

    app.innerHTML = `
      <div class="vm-game-screen"${styleVarsHtml(theme)}>
        ${debugBadgeMarkup}
        ${medalPillMarkup}

        <button class="vm-game-back-pill no-zoom" id="gameShellBackBtn" type="button" aria-label="${escapeHtml(backLabel)}">
          ◀
        </button>

        <div class="vm-game-stage">
          <div class="vm-game-center">
            <div class="vm-game-icon" aria-hidden="true">
              ${iconHtml || escapeHtml(icon)}
            </div>

            <div class="vm-game-title">${escapeHtml(title)}</div>

            <div class="vm-game-actions">
              <button class="vm-btn" id="gameShellStartBtn" type="button">${escapeHtml(startText)}</button>
              <button class="vm-btn vm-btn-secondary" id="helpBtn" type="button">${escapeHtml(helpText)}</button>
            </div>
          </div>
        </div>

        ${helpOverlayHtml({ id: helpOverlayId, body: helpHtml })}
      </div>
    `;

    const backBtn = document.getElementById("gameShellBackBtn");
    const startBtn = document.getElementById("gameShellStartBtn");

    if (backBtn && typeof onBack === "function") backBtn.onclick = onBack;
    if (startBtn && typeof onStart === "function") startBtn.onclick = onStart;

    wireHelp({ id: helpOverlayId, triggerId: "helpBtn" });
  }

  function renderModeSelect({
    app,
    title = "Choose Your Difficulty",
    icon = "🥉🥈🥇",
    iconHtml = "",
    helpHtml = "",
    helpOverlayId = "verseGameHelpOverlay",
    backLabel = "Back to title",
    theme = {},
    modes = [
      { id: "easy", label: "Easy" },
      { id: "medium", label: "Medium" },
      { id: "hard", label: "Hard" }
    ],
    onBack,
    onSelect
  } = {}) {
    if (!app) return;

    syncGameShellTheme(theme);

    const mixMode = getGameMixMode();

    if (isGameMixLaunch() && mixMode && typeof onSelect === "function") {
      app.innerHTML = `
        <div class="vm-game-screen"${styleVarsHtml(theme)}>
          <div class="vm-game-stage">
            <div class="vm-game-center">
              <div class="vm-game-difficulty-icon" aria-hidden="true">🔀</div>
              <div class="vm-game-title">Starting Game Mix...</div>
            </div>
          </div>
        </div>
      `;

      setTimeout(() => onSelect(mixMode), 0);
      return;
    }

    const medalPillMarkup = renderShellMedalPill();

    const modeButtons = modes.map((mode) => `
      <button class="vm-btn" data-game-shell-mode="${escapeHtml(mode.id)}" type="button">
        ${modeButtonContentHtml(mode)}
      </button>
    `).join("");

    app.innerHTML = `
      <div class="vm-game-screen"${styleVarsHtml(theme)}>
        ${medalPillMarkup}

        <button class="vm-game-back-pill no-zoom" id="gameShellModeBackBtn" type="button" aria-label="${escapeHtml(backLabel)}">
          ◀
        </button>

        <div class="vm-game-stage">
          <div class="vm-game-center">
            <div class="vm-game-difficulty-icon" aria-hidden="true">
              ${modeSelectIconHtml(icon, iconHtml)}
            </div>

            <div class="vm-game-title">${escapeHtml(title)}</div>

            <div class="vm-game-actions">
              ${modeButtons}
            </div>
          </div>
        </div>

        ${helpOverlayHtml({ id: helpOverlayId, body: helpHtml })}
      </div>
    `;

    const backBtn = document.getElementById("gameShellModeBackBtn");
    if (backBtn && typeof onBack === "function") backBtn.onclick = onBack;

    document.querySelectorAll("[data-game-shell-mode]").forEach((btn) => {
      btn.onclick = () => {
        if (typeof onSelect === "function") {
          onSelect(btn.dataset.gameShellMode);
        }
      };
    });

    wireHelp({ id: helpOverlayId, triggerId: "helpBtn" });
  }


  function getModeMedal(mode) {
    if (mode === "easy") return "🥉";
    if (mode === "medium") return "🥈";
    if (mode === "hard") return "🥇";
    return "🏅";
  }

  function getModeLabel(mode) {
    if (mode === "easy") return "Easy";
    if (mode === "medium") return "Medium";
    if (mode === "hard") return "Hard";
    return "Game";
  }

  function renderCompleteMedalPill(status = {}, currentMode = "") {
    const medals = [
      { mode: "easy" },
      { mode: "medium" },
      { mode: "hard" }
    ];

    return `
    <div class="vm-complete-medal-pill" aria-label="Mode medals">
      ${medals.map((item) => {
      const earned = !!status[item.mode];
      const current = item.mode === currentMode;

      return `
          <span
            class="vm-complete-medal ${earned ? "is-earned" : "is-unearned"} ${current ? "is-current" : ""}"
            aria-hidden="true"
          >
            ${medalIconHtml(item.mode, "vm-complete-medal-img")}
          </span>
        `;
    }).join("")}
    </div>
  `;
  }

  function getCompletionStatusFromBridge({ verseId = "", gameId = "" } = {}) {
    if (
      window.VerseGameBridge &&
      typeof window.VerseGameBridge.getGameCompletionStatus === "function"
    ) {
      try {
        return window.VerseGameBridge.getGameCompletionStatus({ verseId, gameId });
      } catch (err) {
        console.warn("getGameCompletionStatus failed", err);
      }
    }

    return {
      easy: false,
      medium: false,
      hard: false
    };
  }

  function renderShellMedalPill({ gameId = "", currentMode = "" } = {}) {
    const params = getLaunchParams();
    const safeVerseId = String(params.verseId || params.todoVerseId || "").trim();
    const safeGameId = String(gameId || currentGameShellGameId || "").trim();

    if (!safeVerseId || !safeGameId) return "";

    const status = getCompletionStatusFromBridge({
      verseId: safeVerseId,
      gameId: safeGameId
    });

    return renderCompleteMedalPill(status, currentMode);
  }


  function renderCompleteScreen({
    app,
    title = "Complete!",
    icon = "🎉",
    iconHtml = "",
    gameIcon = "",
    mode = "",
    verseId = "",
    gameId = "",
    completion = null,
    gameMessage = "",
    statsText = "",
    statsHtml = "",
    playAgainText = "Play Again",
    moreGamesText = "More Games",
    changeVerseText = "Change Verse",
    backLabel = "Back to Practice Games",
    theme = {},
    onPlayAgain,
    onMoreGames,
    onChangeVerse
  } = {}) {
    if (!app) return;

    syncGameShellTheme(theme);

    const useStandardComplete = !!(mode || completion || gameMessage || gameId || verseId || gameIcon);
    const gameMix = isGameMixLaunch();

    const status = getCompletionStatusFromBridge({ verseId, gameId });
    const normalizedMode = String(mode || completion?.mode || "").trim();
    const modeLabel = getModeLabel(normalizedMode);
    const medal = getModeMedal(normalizedMode);
    const alreadyCompleted = !!completion?.alreadyCompleted;
    const petUnlocked = !!completion?.reward?.petUnlockTriggered;

    if (petUnlocked) {
      if (gameMix && typeof window.VerseGameBridge?.openPetUnlockFromMix === "function") {
        window.VerseGameBridge.openPetUnlockFromMix(gameId);
        return;
      }

      if (typeof window.VerseGameBridge?.openPetUnlock === "function") {
        window.VerseGameBridge.openPetUnlock();
        return;
      }
    }

    const zooTodoComplete = !petUnlocked && isZooTodoLaunchForVerse(verseId);

    const displayIcon = petUnlocked
      ? "📦"
      : zooTodoComplete
        ? ""
        : alreadyCompleted
          ? (gameIcon || icon)
          : medal;

    const zooTodoIconHtml = zooTodoComplete
      ? getZooTodoCompleteIconHtml(verseId)
      : "";

    const completeIconMarkup = zooTodoComplete
      ? zooTodoIconHtml
      : iconHtml && !petUnlocked
        ? iconHtml
        : !petUnlocked && !alreadyCompleted
          ? medalIconHtml(normalizedMode, "vm-complete-large-medal")
          : escapeHtml(displayIcon);

    const iconButtonAttrs = petUnlocked
      ? `button type="button" id="gameShellPetUnlockBtn" aria-label="Open BibloPet box"`
      : `div aria-hidden="true"`;

    const iconButtonClose = petUnlocked ? "button" : "div";

    const messageMarkup = gameMessage || statsText || statsHtml
      ? `<div class="vm-game-complete-stats">${statsHtml || escapeHtml(gameMessage || statsText)}</div>`
      : "";

    const zooTodoMessageMarkup = zooTodoComplete
      ? getZooTodoCompleteSubtitleMarkup()
      : "";

    if (!useStandardComplete) {
      const oldStatsMarkup = statsHtml
        ? `<div class="vm-game-complete-stats">${statsHtml}</div>`
        : statsText
          ? `<div class="vm-game-complete-stats">${escapeHtml(statsText)}</div>`
          : "";

      app.innerHTML = `
      <div class="vm-game-screen"${styleVarsHtml(theme)}>
        <button class="vm-game-back-pill no-zoom" id="gameShellCompleteBackBtn" type="button" aria-label="${escapeHtml(backLabel)}">
          ◀
        </button>

        <div class="vm-game-stage">
          <div class="vm-game-center">
            <div class="vm-game-icon" aria-hidden="true">
              ${iconHtml || escapeHtml(icon)}
            </div>

            <div class="vm-game-title">${escapeHtml(title)}</div>

            ${oldStatsMarkup}

            <div class="vm-game-actions">
              <button class="vm-btn" id="gameShellPlayAgainBtn" type="button">${escapeHtml(playAgainText)}</button>
              <button class="vm-btn vm-btn-secondary" id="gameShellMoreGamesBtn" type="button">${escapeHtml(moreGamesText)}</button>
            </div>
          </div>
        </div>
      </div>
    `;

      const oldPlayAgainBtn = document.getElementById("gameShellPlayAgainBtn");
      const oldMoreGamesBtn = document.getElementById("gameShellMoreGamesBtn");
      const oldBackBtn = document.getElementById("gameShellCompleteBackBtn");

      if (oldPlayAgainBtn && typeof onPlayAgain === "function") oldPlayAgainBtn.onclick = onPlayAgain;
      if (oldMoreGamesBtn && typeof onMoreGames === "function") oldMoreGamesBtn.onclick = onMoreGames;
      if (oldBackBtn && typeof onMoreGames === "function") oldBackBtn.onclick = onMoreGames;

      return;
    }

    const titleMarkup = petUnlocked
      ? `
      <div class="vm-game-title vm-complete-title">
        <div>You've unlocked</div>
        <div>a BibloPet box!</div>
      </div>
    `
      : zooTodoComplete
        ? getZooTodoCompleteTitleMarkup()
        : alreadyCompleted
          ? `
          <div class="vm-game-title vm-complete-title">
            <div>You completed</div>
            <div>${escapeHtml(modeLabel)} again!</div>
          </div>
        `
          : `
          <div class="vm-game-title vm-complete-title">
            <div>You've earned</div>
            <div>a new medal!</div>
          </div>
        `;

    const backButtonMarkup = petUnlocked
      ? ""
      : `
      <button class="vm-game-back-pill no-zoom" id="gameShellCompleteBackBtn" type="button" aria-label="${escapeHtml(backLabel)}">
        ◀
      </button>
    `;

    const medalPillMarkup = petUnlocked
      ? ""
      : renderCompleteMedalPill(status, normalizedMode);

    const finalMessageMarkup = petUnlocked
      ? ""
      : zooTodoComplete
        ? zooTodoMessageMarkup
        : messageMarkup;

    const actionButtonsMarkup = petUnlocked
      ? ""
      : gameMix
        ? `
        <div class="vm-game-actions vm-complete-actions">
          <button class="vm-btn vm-game-mix-action" id="gameShellContinueMixBtn" type="button">Continue Mix</button>
          <button class="vm-btn vm-btn-secondary" id="gameShellEndMixBtn" type="button">End Mix</button>
        </div>
      `
        : zooTodoComplete
          ? `
          <div class="vm-game-actions vm-complete-actions">
            <button class="vm-btn" id="gameShellCheckZooTodoBtn" type="button">Check Zoo To-Do</button>
            <button class="vm-btn vm-btn-secondary" id="gameShellMoreGamesBtn" type="button">${escapeHtml(moreGamesText)}</button>
            <button class="vm-btn vm-btn-secondary" id="gameShellChangeVerseBtn" type="button">${escapeHtml(changeVerseText)}</button>
          </div>
        `
          : `
          <div class="vm-game-actions vm-complete-actions">
            <button class="vm-btn" id="gameShellPlayAgainBtn" type="button">${escapeHtml(playAgainText)}</button>
            <button class="vm-btn vm-btn-secondary" id="gameShellMoreGamesBtn" type="button">${escapeHtml(moreGamesText)}</button>
            <button class="vm-btn vm-btn-secondary" id="gameShellChangeVerseBtn" type="button">${escapeHtml(changeVerseText)}</button>
          </div>
        `;

    app.innerHTML = `
    <div class="vm-game-screen vm-complete-screen ${petUnlocked ? "is-pet-unlock" : ""}"${styleVarsHtml(theme)}>
      ${backButtonMarkup}

      ${medalPillMarkup}

      <div class="vm-game-stage">
        <div class="vm-game-center vm-complete-center">
          <${iconButtonAttrs} class="vm-game-icon vm-complete-icon ${petUnlocked ? "is-pet-box" : (alreadyCompleted || zooTodoComplete) ? "is-repeat" : "is-new-medal"}">
            ${completeIconMarkup}
          </${iconButtonClose}>

          ${titleMarkup}

          ${finalMessageMarkup}

          ${actionButtonsMarkup}
        </div>
      </div>
    </div>
  `;

    const playAgainBtn = document.getElementById("gameShellPlayAgainBtn");
    const checkZooTodoBtn = document.getElementById("gameShellCheckZooTodoBtn");
    const moreGamesBtn = document.getElementById("gameShellMoreGamesBtn");
    const changeVerseBtn = document.getElementById("gameShellChangeVerseBtn");
    const continueMixBtn = document.getElementById("gameShellContinueMixBtn");
    const endMixBtn = document.getElementById("gameShellEndMixBtn");
    const backBtn = document.getElementById("gameShellCompleteBackBtn");
    const petUnlockBtn = document.getElementById("gameShellPetUnlockBtn");

    const changeVerseAction = typeof onChangeVerse === "function"
      ? onChangeVerse
      : () => window.VerseGameBridge?.returnToTitle?.();

    const moreGamesAction = typeof onMoreGames === "function"
      ? onMoreGames
      : () => window.VerseGameBridge?.exitGame?.();

    const petUnlockAction = () => {
      if (gameMix && typeof window.VerseGameBridge?.openPetUnlockFromMix === "function") {
        window.VerseGameBridge.openPetUnlockFromMix(gameId);
        return;
      }

      if (typeof window.VerseGameBridge?.openPetUnlock === "function") {
        window.VerseGameBridge.openPetUnlock();
      }
    };

    const endMixAction = () => {
      showGameMixQuitConfirm({
        title: "Quit Game Mix?",
        noText: "Keep Playing",
        yesText: "Quit Mix",
        onConfirm: () => window.VerseGameBridge?.endGameMix?.()
      });
    };

    if (playAgainBtn && typeof onPlayAgain === "function") playAgainBtn.onclick = onPlayAgain;

    if (checkZooTodoBtn) {
      checkZooTodoBtn.onclick = () => {
        if (typeof window.VerseGameBridge?.openZooTodo === "function") {
          window.VerseGameBridge.openZooTodo();
          return;
        }

        moreGamesAction();
      };
    }

    if (moreGamesBtn) moreGamesBtn.onclick = moreGamesAction;
    if (changeVerseBtn) changeVerseBtn.onclick = changeVerseAction;

    if (continueMixBtn) {
      continueMixBtn.onclick = () => {
        window.VerseGameBridge?.continueGameMix?.(gameId);
      };
    }

    if (endMixBtn) {
      endMixBtn.onclick = endMixAction;
    }

    if (backBtn) {
      backBtn.onclick = gameMix ? endMixAction : moreGamesAction;
    }

    if (petUnlockBtn) petUnlockBtn.onclick = petUnlockAction;
  }

  function gameMenuHtml({
    id = "verseGameMenuOverlay",
    title = "Game Menu",
    muted = false,
    howToText = "How to Play",
    modeSelectText = "Mode Select",
    exitText = "Exit Game",
    closeText = "Close",
    showModeSelect = true
  } = {}) {
    const safeId = escapeHtml(id);
    const gameMix = isGameMixLaunch();
    const effectiveShowModeSelect = gameMix ? false : showModeSelect;
    const effectiveExitText = gameMix ? "Exit Game Mix" : exitText;

    return `
      <div class="vm-game-menu-overlay" id="${safeId}" aria-hidden="true">
        <div class="vm-game-menu-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <div class="vm-game-menu-header">
            <div class="vm-game-menu-title">${escapeHtml(title)}</div>

            <button
              class="vm-game-menu-mute-btn"
              id="${safeId}MuteBtn"
              type="button"
              aria-label="${muted ? "Unmute" : "Mute"}"
              title="${muted ? "Unmute" : "Mute"}"
            >${muted ? "🔇" : "🔊"}</button>
          </div>

          <div class="vm-game-menu-actions">
            <button class="vm-btn vm-game-menu-btn" id="${safeId}HowToBtn" type="button">${escapeHtml(howToText)}</button>
            ${effectiveShowModeSelect ? `<button class="vm-btn vm-game-menu-btn" id="${safeId}ModeSelectBtn" type="button">${escapeHtml(modeSelectText)}</button>` : ""}
            <button class="vm-btn vm-game-menu-btn" id="${safeId}ExitBtn" type="button">${escapeHtml(effectiveExitText)}</button>
            <button class="vm-btn vm-game-menu-btn vm-game-menu-close-btn" id="${safeId}CloseBtn" type="button">${escapeHtml(closeText)}</button>
          </div>
        </div>
      </div>
    `;
  }

  function wireGameMenu({
    id = "verseGameMenuOverlay",
    menuButtonId = "",
    helpOverlayId = "",
    closeHelpText = "Close",
    backHelpText = "Back",
    isMuted = null,
    onMuteToggle = null,
    onHowToPlay = null,
    onModeSelect = null,
    onExit = null,
    onOpen = null,
    onClose = null,
    onBackFromHelp = null
  } = {}) {
    const overlay = document.getElementById(id);
    const menuButton = menuButtonId ? document.getElementById(menuButtonId) : null;

    const howToBtn = document.getElementById(`${id}HowToBtn`);
    const modeSelectBtn = document.getElementById(`${id}ModeSelectBtn`);
    const muteBtn = document.getElementById(`${id}MuteBtn`);
    const exitBtn = document.getElementById(`${id}ExitBtn`);
    const closeBtn = document.getElementById(`${id}CloseBtn`);

    const updateMuteButton = () => {
      if (overlay && overlay.classList.contains("is-open")) {
        overlay.setAttribute("aria-hidden", "false");
      }

      if (!muteBtn) return;

      const muted = typeof isMuted === "function" ? !!isMuted() : false;
      muteBtn.textContent = muted ? "🔇" : "🔊";
      muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      muteBtn.setAttribute("title", muted ? "Unmute" : "Mute");
    };

    const openMenu = (event) => {
      if (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
      }

      if (typeof onOpen === "function") {
        const shouldOpen = onOpen();

        if (shouldOpen === false) {
          return;
        }
      }

      if (overlay) {
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
      }

      updateMuteButton();
    };

    const closeMenu = () => {
      if (overlay && overlay.contains(document.activeElement)) {
        document.activeElement.blur();
      }

      if (overlay) {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
      }

      if (typeof onClose === "function") {
        onClose();
      }
    };

    const openHelp = () => {
      if (overlay && overlay.contains(document.activeElement)) {
        document.activeElement.blur();
      }

      if (typeof onHowToPlay === "function") {
        onHowToPlay();
        return;
      }

      if (overlay) {
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
      }

      if (helpOverlayId) {
        openHelp(helpOverlayId, "back", backHelpText);
      }
    };

    if (menuButton) {
      menuButton.onclick = openMenu;
      menuButton.onpointerdown = openMenu;
      menuButton.ontouchstart = openMenu;
    }

    if (howToBtn) {
      howToBtn.onclick = openHelp;
    }

    if (modeSelectBtn) {
      modeSelectBtn.onclick = () => {
        if (overlay) {
          overlay.classList.remove("is-open");
          overlay.setAttribute("aria-hidden", "true");
        }

        if (typeof onModeSelect === "function") {
          onModeSelect();
        }
      };
    }

    if (muteBtn) {
      muteBtn.onclick = () => {
        if (overlay && overlay.classList.contains("is-open")) {
          overlay.setAttribute("aria-hidden", "false");
        }

        if (typeof onMuteToggle === "function") {
          onMuteToggle();
        }

        updateMuteButton();
      };
    }

    if (exitBtn) {
      exitBtn.onclick = () => {
        if (isGameMixLaunch()) {
          showGameMixQuitConfirm({
            title: "Quit Game Mix?",
            noText: "Keep Playing",
            yesText: "Quit Mix",
            onConfirm: () => window.VerseGameBridge?.endGameMix?.()
          });
          return;
        }

        if (typeof onExit === "function") {
          onExit();
        }
      };
    }

    if (closeBtn) {
      closeBtn.onclick = closeMenu;
    }

    if (overlay) {
      overlay.onclick = (event) => {
        if (event.target === overlay) {
          closeMenu();
        }
      };
    }

    if (helpOverlayId) {
      wireHelp({
        id: helpOverlayId,
        closeText: closeHelpText,
        onBack: () => {
          closeHelp(helpOverlayId);

          if (overlay) {
            overlay.classList.add("is-open");
            overlay.setAttribute("aria-hidden", "false");
          }

          if (typeof onBackFromHelp === "function") {
            onBackFromHelp();
          }
        },
        onClose
      });
    }

    updateMuteButton();

    return {
      open: openMenu,
      close: closeMenu,
      updateMuteButton
    };
  }


  window.VerseGameShell = {
    escapeHtml,
    getFunDecoys,
    getBibleBookDecoys,
    getBookDecoys,
    getFunWordDecoys,
    getVerseWordDecoys,
    shuffle,
    clamp,
    capitalize,
    normalizeWord,
    tokenizeVerseWords,
    tokenizeVerseForBuild,
    extractWordEntries,
    getBuildLengthScore,
    getBuildSizeClass,
    buildVerseSegments,
    getBuildDisplayTokens,
    renderBuildProgressHtml,
    fitBuildTextOnce,
    getBuildStreakLevel,
    updateBuildStreakOverlay,
    countBuildTextLines,
    buildTextOverflows,
    getPhaseForProgress,
    titleCaseBookFromSlug,
    parseReferenceParts,
    getReferenceDecoys,
    helpOverlayHtml,
    openHelp,
    closeHelp,
    wireHelp,
    gameMenuHtml,
    wireGameMenu,
    gameIconImageHtml,
    gameIconImageHtmlForId,
    medalIconHtml,
    medalSetIconHtml,
    renderTitleScreen,
    renderModeSelect,
    renderCompleteScreen
  };
})();
