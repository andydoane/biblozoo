(async function () {
  const app = document.getElementById("app");
  if (app) app.classList.add("vm-shell", "verse-clap-app");

  const ctx = await window.VerseGameBridge.getVerseContext();

  const GAME_ID = "verse_clap";
  const GAME_TITLE = "Verse Clap";
  const GAME_ICON = "👏";
  const HELP_OVERLAY_ID = "verseClapHelpOverlay";
  const MENU_OVERLAY_ID = "verseClapMenuOverlay";

  const GAME_THEME = {
    bg: "linear-gradient(180deg, #55c7ff 0%, #8fe6ff 42%, #fff0aa 100%)",
    accent: "#ff66a3",
    helpTitleBg: "#ff66a3",
    helpTitleColor: "#ffffff",
    helpCloseBg: "#ffe27a",
    helpCloseColor: "#221447"
  };

  const ROUNDS = [
    {
      id: "balloons",
      title: "Pop the Balloons",
      icon: "🎈",
      prompt: "Clap once!",
      activeEmoji: "🎈",
      inactiveEmoji: "🎈",
      doneEmoji: "💥",
      objectClass: "theme-balloons",
      wordBurst: "POP!"
    },
    {
      id: "monsters",
      title: "Scare the Monsters",
      icon: "👾",
      prompt: "Clap once!",
      activeEmoji: "👾",
      inactiveEmoji: "👹",
      doneEmoji: "💨",
      objectClass: "theme-monsters",
      wordBurst: "BOO!"
    },
    {
      id: "sleepy",
      title: "Wake the Sleepy Faces",
      icon: "😴",
      prompt: "Clap once!",
      activeEmoji: "😴",
      inactiveEmoji: "😴",
      doneEmoji: "😄",
      objectClass: "theme-sleepy",
      wordBurst: "WAKE!"
    }
  ];

  const LETTERS = "abcdefghijklmnopqrstuvwxyz";
  const MIN_REVEAL_INTERVAL_MS = 260;
  const MAX_REVEAL_INTERVAL_MS = 950;
  const REVEAL_START_DELAY_MS = 180;
  const READY_DELAY_AFTER_AUDIO_MS = 320;
  const WORD_CELEBRATION_MS = 850;
  const QUIET_HOLD_MS = 420;
  const MIN_TIME_BETWEEN_CLAPS_MS = 650;

  const state = {
    screen: "title",
    verseJson: null,
    chunks: [],
    parsedRef: null,
    items: [],
    roundIndex: 0,
    itemIndex: 0,
    wordIndex: 0,
    revealedCount: 0,
    phase: "idle",
    muted: false,
    micReady: false,
    tapFallback: false,
    backgroundLevel: 0.025,
    clapLevel: 0.25,
    clapThreshold: 0.16,
    quietThreshold: 0.055,
    currentVolume: 0,
    lastClapAt: 0,
    quietSince: 0,
    practiceMarked: false,
    timers: new Set(),
    activeAudio: null,
    audioGeneration: 0
  };

  const mic = {
    stream: null,
    audioCtx: null,
    analyser: null,
    source: null,
    data: null,
    raf: 0
  };

  function shell() {
    return window.VerseGameShell;
  }

  function bridge() {
    return window.VerseGameBridge;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(value, min, max) {
    const helper = shell()?.clamp;
    if (typeof helper === "function") return helper(value, min, max);
    return Math.min(max, Math.max(min, value));
  }

  function setTimer(fn, ms) {
    const id = window.setTimeout(() => {
      state.timers.delete(id);
      fn();
    }, ms);
    state.timers.add(id);
    return id;
  }

  function clearTimers() {
    state.timers.forEach((id) => window.clearTimeout(id));
    state.timers.clear();
  }

  function stopAudio() {
    state.audioGeneration += 1;
    if (state.activeAudio) {
      try {
        state.activeAudio.pause();
        state.activeAudio.currentTime = 0;
      } catch (err) {}
      state.activeAudio = null;
    }
  }

  function cleanupRun({ stopMic = false } = {}) {
    clearTimers();
    stopAudio();
    if (stopMic) stopMicLoop();
  }

  function helpHtml() {
    return `
      <div class="vc-help">
        <p>Listen to each verse part. The words float in.</p>
        <p>When you see <strong>Clap once!</strong>, clap one time to pop, scare, or wake the next word.</p>
        <p>After each clap, wait for <strong>SHH!</strong> to disappear before clapping again.</p>
      </div>
    `;
  }

  function renderTitleScreen() {
    cleanupRun();
    state.screen = "title";

    shell().renderTitleScreen({
      app,
      title: GAME_TITLE,
      icon: GAME_ICON,
      helpHtml: helpHtml(),
      helpOverlayId: HELP_OVERLAY_ID,
      startText: "Start",
      helpText: "How to Play",
      backLabel: "Back to Playground",
      theme: GAME_THEME,
      onBack: () => bridge().exitGame?.(),
      onStart: () => renderCalibrationScreen()
    });
  }

  async function loadVerseJson() {
    if (state.verseJson) return state.verseJson;

    const verseId = String(ctx.verseId || "").trim();
    if (!verseId) throw new Error("Missing verseId.");

    const res = await fetch(`../../verse_data/${encodeURIComponent(verseId)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load verse JSON: HTTP ${res.status}`);

    const json = await res.json();
    state.verseJson = json;
    return json;
  }

  function getReferenceItems() {
    const parsed = shell().parseReferenceParts(
      ctx.verseRef,
      ctx.translation,
      ctx.verseId
    );

    state.parsedRef = parsed;

    const book = String(parsed?.book || "").trim();
    const reference = String(parsed?.reference || "").trim();

    return [book, reference].filter(Boolean);
  }

  function splitWords(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean);
  }

  async function prepareItems() {
    const json = await loadVerseJson();
    const chunks = Array.isArray(json.echoParts) ? json.echoParts.filter(Boolean) : [];
    const referenceItems = getReferenceItems();

    state.chunks = chunks;
    state.items = chunks.map((text, index) => ({
      type: "chunk",
      text: String(text || ""),
      words: splitWords(text),
      audioUrl: `../../verse_audio/${ctx.verseId}${LETTERS[index] || ""}.mp3`
    }));

    if (referenceItems.length) {
      state.items.push({
        type: "reference",
        text: referenceItems.join(" "),
        words: referenceItems,
        audioUrl: `../../verse_audio/${ctx.verseId}_ref.mp3`
      });
    }
  }

  function rootHtml(inner, { menu = true, rootClass = "" } = {}) {
    const safeRootClass = rootClass ? ` ${escapeHtml(rootClass)}` : "";

    return `
      <div class="verse-clap-root${safeRootClass}">
        ${menu ? `<button class="vc-menu-pill no-zoom" id="verseClapMenuPill" type="button" aria-label="Open game menu">☰</button>` : ""}
        <div class="verse-clap-stage">
          ${inner}
        </div>
        ${shell().helpOverlayHtml ? shell().helpOverlayHtml({ id: HELP_OVERLAY_ID, title: "How to Play", body: helpHtml(), closeText: "Close" }) : ""}
        ${shell().gameMenuHtml ? shell().gameMenuHtml({
          id: MENU_OVERLAY_ID,
          title: "Verse Clap Menu",
          muted: state.muted,
          showModeSelect: false,
          exitText: "Back to Playground"
        }) : ""}
      </div>
    `;
  }

  function wireMenu() {
    if (!shell().wireGameMenu) return;

    shell().wireGameMenu({
      id: MENU_OVERLAY_ID,
      menuButtonId: "verseClapMenuPill",
      helpOverlayId: HELP_OVERLAY_ID,
      isMuted: () => state.muted,
      onMuteToggle: () => {
        state.muted = !state.muted;
        if (state.activeAudio) state.activeAudio.muted = state.muted;
        return state.muted;
      },
      onExit: () => bridge().exitGame?.(),
      onOpen: () => {
        cleanupRun();
        state.phase = "paused";
        return true;
      },
      onClose: () => {
        if (state.screen === "play") restartCurrentItem();
      },
      onBackFromHelp: () => {}
    });
  }

  function renderCalibrationScreen() {
    cleanupRun();
    state.screen = "calibration";
    state.phase = "calibrationIntro";
    state.tapFallback = false;

    app.innerHTML = rootHtml(`
      <section class="vc-calibration-card" aria-live="polite">
        <div class="vc-big-emoji" aria-hidden="true">👏</div>
        <h1>Wake up Verse Clap!</h1>
        <p id="vcCalibrationText">First, let Verse Clap hear the room. Then clap two times.</p>
        <div class="vc-meter vc-meter--large" aria-hidden="true">
          <div class="vc-meter-fill" id="vcMeterFill"></div>
          <div class="vc-meter-quiet-line"></div>
        </div>
        <button class="vc-primary-btn" id="vcStartMicBtn" type="button">Start Microphone</button>
        <button class="vc-secondary-btn is-hidden" id="vcTapFallbackBtn" type="button">Use Tap Mode</button>
      </section>
    `, { rootClass: "is-calibration" });

    wireMenu();

    document.getElementById("vcStartMicBtn")?.addEventListener("pointerdown", async () => {
      await startMicCalibration();
    }, { once: true });

    document.getElementById("vcTapFallbackBtn")?.addEventListener("click", async () => {
      state.tapFallback = true;
      await startPlay();
    });
  }

  async function startMicCalibration() {
    const button = document.getElementById("vcStartMicBtn");
    const fallback = document.getElementById("vcTapFallbackBtn");
    const text = document.getElementById("vcCalibrationText");

    if (button) button.disabled = true;
    if (text) text.textContent = "Listening to the quiet room...";

    try {
      await setupMic();
      await measureBackground(1500);
      if (text) text.textContent = "Great. Now clap two times!";
      await collectClaps(2, 5000);
      computeThresholds();
      state.micReady = true;
      if (text) text.textContent = "Ready!";
      setTimer(() => startPlay(), 450);
    } catch (err) {
      console.warn("Verse Clap microphone setup failed", err);
      if (text) text.textContent = "The microphone did not start.";
      if (button) {
        button.disabled = false;
        button.textContent = "Try Microphone Again";
        button.addEventListener("pointerdown", async () => startMicCalibration(), { once: true });
      }
      if (fallback) fallback.classList.remove("is-hidden");
    }
  }

  async function setupMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia is not available.");
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) throw new Error("Web Audio is not available.");

    mic.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    mic.audioCtx = mic.audioCtx || new AudioCtor();
    if (mic.audioCtx.state === "suspended") await mic.audioCtx.resume();

    mic.analyser = mic.audioCtx.createAnalyser();
    mic.analyser.fftSize = 1024;
    mic.data = new Uint8Array(mic.analyser.fftSize);
    mic.source = mic.audioCtx.createMediaStreamSource(mic.stream);
    mic.source.connect(mic.analyser);

    startMicLoop();
  }

  function stopMicLoop() {
    if (mic.raf) cancelAnimationFrame(mic.raf);
    mic.raf = 0;

    if (mic.stream) {
      mic.stream.getTracks().forEach((track) => track.stop());
      mic.stream = null;
    }
  }

  function startMicLoop() {
    if (mic.raf) cancelAnimationFrame(mic.raf);

    const tick = () => {
      state.currentVolume = readVolume();
      updateMeter();
      maybeHandleClap();
      mic.raf = requestAnimationFrame(tick);
    };

    tick();
  }

  function readVolume() {
    if (!mic.analyser || !mic.data) return 0;

    mic.analyser.getByteTimeDomainData(mic.data);

    let sum = 0;
    for (let i = 0; i < mic.data.length; i += 1) {
      const centered = (mic.data[i] - 128) / 128;
      sum += centered * centered;
    }

    return Math.sqrt(sum / mic.data.length);
  }

  function updateMeter() {
    const fill = document.getElementById("vcMeterFill");
    if (!fill) return;

    const scaled = clamp((state.currentVolume / Math.max(0.01, state.clapThreshold)) * 74, 0, 100);
    fill.style.width = `${scaled}%`;
    fill.classList.toggle("is-loud", state.currentVolume > state.quietThreshold);
  }

  function measureBackground(ms) {
    return new Promise((resolve) => {
      const samples = [];
      const start = performance.now();

      const sample = () => {
        samples.push(state.currentVolume || readVolume());
        if (performance.now() - start >= ms) {
          const average = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
          state.backgroundLevel = clamp(average, 0.01, 0.20);
          resolve();
          return;
        }
        setTimer(sample, 60);
      };

      sample();
    });
  }

  function collectClaps(targetCount, timeoutMs) {
    return new Promise((resolve, reject) => {
      const text = document.getElementById("vcCalibrationText");
      const peaks = [];
      const startedAt = performance.now();
      let lastHit = 0;

      const check = () => {
        const now = performance.now();
        const volume = state.currentVolume || readVolume();
        const threshold = Math.max(0.12, state.backgroundLevel * 3.4);

        if (volume > threshold && now - lastHit > 550) {
          lastHit = now;
          peaks.push(volume);
          showCalibrationPop(peaks.length);
          if (text) text.textContent = peaks.length >= targetCount ? "Nice claps!" : "Good! One more clap!";
        }

        if (peaks.length >= targetCount) {
          state.clapLevel = peaks.reduce((sum, value) => sum + value, 0) / peaks.length;
          resolve();
          return;
        }

        if (now - startedAt > timeoutMs) {
          reject(new Error("Calibration clap timeout."));
          return;
        }

        setTimer(check, 45);
      };

      check();
    });
  }

  function showCalibrationPop(count) {
    const card = document.querySelector(".vc-calibration-card");
    if (!card) return;

    const pop = document.createElement("div");
    pop.className = "vc-calibration-pop";
    pop.textContent = count === 1 ? "👏" : "🎉";
    card.appendChild(pop);
    setTimer(() => pop.remove(), 700);
  }

  function computeThresholds() {
    state.clapThreshold = clamp(Math.max(state.backgroundLevel * 3.25, state.clapLevel * 0.42, 0.11), 0.09, 0.42);
    state.quietThreshold = clamp(Math.max(state.backgroundLevel * 1.8, state.clapThreshold * 0.28, 0.035), 0.03, 0.16);
  }

  async function startPlay() {
    cleanupRun();
    await prepareItems();

    state.screen = "play";
    state.phase = "roundIntro";
    state.roundIndex = 0;
    state.itemIndex = 0;
    state.wordIndex = 0;
    state.revealedCount = 0;
    state.practiceMarked = false;

    renderPlayScreen();
    showRoundIntro();
  }

  function renderPlayScreen() {
    const round = currentRound();

    app.innerHTML = rootHtml(`
      <main class="vc-play ${escapeHtml(round.objectClass)}">
        <div class="vc-top-row">
          <div class="vc-round-badge" id="vcRoundBadge">${escapeHtml(round.icon)} Round ${state.roundIndex + 1}</div>
          <div class="vc-chunk-badge" id="vcChunkBadge"></div>
        </div>

        <section class="vc-playfield" id="vcPlayfield" aria-live="polite"></section>

        <div class="vc-prompt" id="vcPrompt" aria-live="polite"></div>
        <div class="vc-word-burst" id="vcWordBurst" aria-live="polite"></div>

        <button class="vc-tap-fallback ${state.tapFallback ? "" : "is-hidden"}" id="vcTapFallbackPlayBtn" type="button">
          Tap instead
        </button>

        <div class="vc-bottom-meter" aria-hidden="true">
          <div class="vc-meter-label">quiet</div>
          <div class="vc-meter">
            <div class="vc-meter-fill" id="vcMeterFill"></div>
            <div class="vc-meter-quiet-line"></div>
          </div>
          <div class="vc-meter-label">loud</div>
        </div>
      </main>
    `, { rootClass: "is-play" });

    wireMenu();
    document.getElementById("vcTapFallbackPlayBtn")?.addEventListener("click", () => {
      if (state.tapFallback && state.phase === "ready") popCurrentWord();
    });
  }

  function currentRound() {
    return ROUNDS[state.roundIndex] || ROUNDS[0];
  }

  function currentItem() {
    return state.items[state.itemIndex] || null;
  }

  function showRoundIntro() {
    const round = currentRound();
    state.phase = "roundIntro";
    updateBadges();
    clearObjects();
    setPrompt(`<div class="vc-round-card"><div>${escapeHtml(round.icon)}</div><strong>${escapeHtml(round.title)}</strong></div>`);
    setTimer(() => startCurrentItem(), 1200);
  }

  function restartCurrentItem() {
    if (state.screen !== "play") return;
    renderPlayScreen();
    startCurrentItem();
  }

  function startCurrentItem() {
    cleanupRun();

    const item = currentItem();
    if (!item) {
      finishRound();
      return;
    }

    state.phase = "audio";
    state.wordIndex = 0;
    state.revealedCount = 0;
    updateBadges();
    renderObjects();
    setPrompt(`<div class="vc-graphic-prompt"><div class="vc-prompt-emoji">👂</div><div>Listen</div></div>`);

    playItemAudioAndReveal(item);
  }

  function playItemAudioAndReveal(item) {
    const generation = state.audioGeneration + 1;
    state.audioGeneration = generation;

    const audio = new Audio(item.audioUrl);
    state.activeAudio = audio;
    audio.muted = state.muted;
    audio.preload = "auto";

    let revealStarted = false;

    const startReveal = () => {
      if (revealStarted || generation !== state.audioGeneration) return;
      revealStarted = true;
      revealWordsForItem(audio.duration, item.words.length);
    };

    audio.addEventListener("loadedmetadata", startReveal, { once: true });
    audio.addEventListener("ended", () => {
      if (generation !== state.audioGeneration) return;
      state.activeAudio = null;
      state.revealedCount = item.words.length;
      renderObjects();
      setTimer(() => armForClap(), READY_DELAY_AFTER_AUDIO_MS);
    }, { once: true });

    audio.addEventListener("error", () => {
      console.warn("Verse Clap audio failed", item.audioUrl);
      startReveal();
      setTimer(() => armForClap(), Math.max(900, item.words.length * 450));
    }, { once: true });

    audio.play().then(() => {
      setTimer(startReveal, 500);
    }).catch((err) => {
      console.warn("Verse Clap audio play failed", err);
      startReveal();
      setTimer(() => armForClap(), Math.max(900, item.words.length * 450));
    });
  }

  function revealWordsForItem(durationSeconds, wordCount) {
    if (!wordCount) return;

    const usableDurationMs = Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds * 1000
      : wordCount * 520;

    const interval = clamp(usableDurationMs / Math.max(1, wordCount), MIN_REVEAL_INTERVAL_MS, MAX_REVEAL_INTERVAL_MS);

    for (let index = 0; index < wordCount; index += 1) {
      setTimer(() => {
        if (state.phase !== "audio") return;
        state.revealedCount = Math.max(state.revealedCount, index + 1);
        renderObjects();
      }, REVEAL_START_DELAY_MS + index * interval);
    }
  }

  function armForClap() {
    if (state.phase === "paused") return;
    const item = currentItem();
    if (!item) return;

    if (state.wordIndex >= item.words.length) {
      advanceItem();
      return;
    }

    state.phase = "ready";
    state.quietSince = 0;
    renderObjects();
    showClapPrompt();
  }

  function maybeHandleClap() {
    if (!state.micReady || state.phase !== "ready") return;

    const now = performance.now();
    if (now - state.lastClapAt < MIN_TIME_BETWEEN_CLAPS_MS) return;
    if (state.currentVolume < state.clapThreshold) return;

    state.lastClapAt = now;
    popCurrentWord();
  }

  function popCurrentWord() {
    const item = currentItem();
    if (!item || state.phase !== "ready") return;

    state.phase = "reacting";
    const index = state.wordIndex;
    const word = item.words[index] || "";

    hidePrompt();
    markObjectDone(index);
    showWordBurst(word);

    setTimer(() => {
      state.wordIndex += 1;
      state.phase = "waitingQuiet";
      waitForQuietThenContinue();
    }, WORD_CELEBRATION_MS);
  }

  function waitForQuietThenContinue() {
    if (state.tapFallback || !state.micReady) {
      setTimer(() => armForClap(), 250);
      return;
    }

    showShhPrompt();

    const check = () => {
      if (state.phase !== "waitingQuiet") return;

      const now = performance.now();
      const quiet = state.currentVolume <= state.quietThreshold;

      if (quiet) {
        if (!state.quietSince) state.quietSince = now;
        if (now - state.quietSince >= QUIET_HOLD_MS) {
          hidePrompt();
          setTimer(() => armForClap(), 140);
          return;
        }
      } else {
        state.quietSince = 0;
      }

      setTimer(check, 55);
    };

    check();
  }

  function advanceItem() {
    state.itemIndex += 1;
    state.wordIndex = 0;
    state.revealedCount = 0;

    if (state.itemIndex >= state.items.length) {
      finishRound();
      return;
    }

    startCurrentItem();
  }

  function finishRound() {
    state.phase = "roundDone";
    clearObjects();
    const round = currentRound();
    setPrompt(`<div class="vc-round-card"><div>🎉</div><strong>${escapeHtml(round.title)} done!</strong></div>`);

    setTimer(() => {
      state.roundIndex += 1;
      state.itemIndex = 0;
      state.wordIndex = 0;
      state.revealedCount = 0;

      if (state.roundIndex >= ROUNDS.length) {
        renderCompleteScreen();
      } else {
        renderPlayScreen();
        showRoundIntro();
      }
    }, 1300);
  }

  async function renderCompleteScreen() {
    cleanupRun();
    state.screen = "complete";

    if (!state.practiceMarked) {
      state.practiceMarked = true;
      try {
        await bridge().markVersePracticed?.({ verseId: ctx.verseId });
      } catch (err) {
        console.warn("Verse Clap could not mark verse as practiced", err);
      }
    }

    shell().renderCompleteScreen({
      app,
      title: "Great Clapping!",
      icon: "👏",
      statsHtml: `<div>You clapped through the verse three ways!</div>`,
      playAgainText: "Try Again",
      moreGamesText: "More Activities",
      backLabel: "Back to Playground",
      theme: GAME_THEME,
      onPlayAgain: () => renderCalibrationScreen(),
      onMoreGames: () => bridge().exitGame?.()
    });
  }

  function updateBadges() {
    const round = currentRound();
    const item = currentItem();
    const roundBadge = document.getElementById("vcRoundBadge");
    const chunkBadge = document.getElementById("vcChunkBadge");

    if (roundBadge) roundBadge.textContent = `${round.icon} Round ${state.roundIndex + 1}`;
    if (chunkBadge && item) {
      const label = item.type === "reference" ? "Reference" : `Part ${state.itemIndex + 1}`;
      chunkBadge.textContent = label;
    }
  }

  function clearObjects() {
    const playfield = document.getElementById("vcPlayfield");
    if (playfield) playfield.innerHTML = "";
  }

  function renderObjects() {
    const playfield = document.getElementById("vcPlayfield");
    const item = currentItem();
    const round = currentRound();
    if (!playfield || !item) return;

    playfield.innerHTML = item.words.map((word, index) => {
      const revealed = index < state.revealedCount;
      const done = index < state.wordIndex;
      const active = state.phase === "ready" && index === state.wordIndex;
      const waiting = revealed && !done;
      const drift = (index % 5) + 1;
      const left = 9 + ((index * 23) % 76);
      const top = 10 + ((index * 31) % 62);
      const emoji = done ? round.doneEmoji : active ? round.activeEmoji : round.inactiveEmoji;

      return `
        <div class="vc-word-object drift-${drift} ${revealed ? "is-revealed" : ""} ${waiting ? "is-waiting" : ""} ${active ? "is-active" : ""} ${done ? "is-done" : ""}"
             style="left:${left}%; top:${top}%; --delay:${(index % 6) * -0.45}s;"
             data-index="${index}">
          <div class="vc-object-emoji" aria-hidden="true">${escapeHtml(emoji)}</div>
          <div class="vc-balloon-string" aria-hidden="true"></div>
          <div class="vc-word-label">${escapeHtml(word)}</div>
        </div>
      `;
    }).join("");
  }

  function markObjectDone(index) {
    const object = document.querySelector(`.vc-word-object[data-index="${index}"]`);
    if (!object) return;

    object.classList.remove("is-active");
    object.classList.add("is-popping", "is-done");
  }

  function setPrompt(html) {
    const prompt = document.getElementById("vcPrompt");
    if (!prompt) return;
    prompt.innerHTML = html;
    prompt.classList.remove("is-hidden");
  }

  function hidePrompt() {
    const prompt = document.getElementById("vcPrompt");
    if (prompt) prompt.classList.add("is-hidden");
  }

  function showClapPrompt() {
    setPrompt(`
      <div class="vc-graphic-prompt vc-graphic-prompt--clap">
        <div class="vc-prompt-emoji">👏</div>
        <div>Clap once!</div>
      </div>
    `);
  }

  function showShhPrompt() {
    setPrompt(`
      <div class="vc-graphic-prompt vc-graphic-prompt--shh">
        <div class="vc-prompt-emoji">🤫</div>
        <div>SHH!</div>
      </div>
    `);
  }

  function showWordBurst(word) {
    const burst = document.getElementById("vcWordBurst");
    if (!burst) return;

    const round = currentRound();
    burst.innerHTML = `
      <div class="vc-word-burst-card">
        <span>${escapeHtml(round.wordBurst)}</span>
        <strong>${escapeHtml(word)}</strong>
      </div>
    `;
    burst.classList.remove("is-visible");
    void burst.offsetWidth;
    burst.classList.add("is-visible");
    setTimer(() => burst.classList.remove("is-visible"), WORD_CELEBRATION_MS - 80);
  }

  renderTitleScreen();
})();
