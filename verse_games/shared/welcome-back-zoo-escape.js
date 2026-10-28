/* BibloZoo Patch 72.1A — opt-in, silent-capable Zoo Escape presentation.
 * Does not alter the active game's recovery, audio-session or progress logic.
 * Activity owners opt in via create({ overlay, recover, onRecovered, onExit }).
 * recover() is invoked synchronously INSIDE the actual LOCK GATE click.
 * Patch 72.1B pilots this with Feeding; 72.1C rolls out to other owners.
 */
(function installZooEscape(root) {
  "use strict";
  const MAX_ATTEMPTS = 3;
  const MIN_PETS = 6;
  const MAX_PETS = 10;
  const EMERGE_MS = 750;
  // Twelve verified real portraits from verse_data/verse_list.json. These are
  // offline precached and keep standalone game pages varied even when their
  // normal (main-app-initialized) in-memory picture catalog is empty.
  const ZOO_BREAK_PORTRAITS = Object.freeze([
    "ephesians_2_8_9", "galatians_2_20", "philippians_4_6", "romans_12_2",
    "2_corinthians_5_17", "psalm_119_105", "joshua_1_9", "romans_5_8",
    "isaiah_26_3", "psalm_121_1_2", "psalm_46_1", "matthew_11_28"
  ]);
  const SPAWN_MS = 1000;
  // Patch 72.1C.3: Feeding's six-note pop/bounce palette, played ONLY through
  // an already-existing, passively advancing activity-owned Web Audio context.
  // Never allocate, unlock, resume or replace a context to play a cosmetic sound.
  const ZOO_NOTE_FREQUENCIES = Object.freeze([
    523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98
  ]);
  const RECOVERY_WATCHDOG_MS = 7500;
  // Identical vector silhouette used by Traffic Tap and Verse Launch for wrong answers.
  // No platform-dependent cloud emoji; no dependency on the other game's DOM.
  const CRASH_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;
  const clampCount = n => Math.min(MAX_PETS, Math.max(MIN_PETS, Math.floor(Number(n) || MIN_PETS)));
  // Patch 72.1C.1: developer-only, in-dialog deterministic failure testing.
  // DISABLE before a public release. Feeding retains its separate score-badge
  // harness, which already guards daily reward credit.
  const ENABLE_ZOO_RETURN_TEST_HARNESS = true;
  const TEST_HOLD_MS = 2400;
  const TEST_SCENARIOS = Object.freeze([
    { id: "stage2-real", label: "Stage 2 → Verify real recovery", results: [false, "real"] },
    { id: "stage3-real", label: "Stage 3 → Verify real recovery", results: [false, false, "real"] },
    { id: "stage3-exit", label: "Stage 3 → Zoo Exit", results: [false, false, false] },
    { id: "deferred-real", label: "Pending interruption → Real recovery", results: ["deferred", "real"] },
    { id: "early-stage2", label: "Early Exit at Stage 2", results: [false] },
    { id: "early-stage3", label: "Early Exit at Stage 3", results: [false, false] }
  ]);
  const nextStage = (stage, recovered) => recovered === true ? "recovered" :
    stage === "welcome" ? "escape" : stage === "escape" ? "break" : "exit";
  // Patch 72.1D: per-Zookeeper, idempotent-once-per-pet rescue totals.
  // Independent of the audio/progress store: failed or unavailable storage
  // never blocks a child from completing a rescue or leaving the overlay.
  const ZOO_STATS_PREFIX = "biblozooZooEscapeStats:v1:";
  const emptyStats = () => ({ petsRescued: 0, zooBreaksStopped: 0, pendingPets: 0, pendingBreaks: 0 });
  const cleanStat = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
  function profileForStats(explicitId) {
    const id = String(explicitId || root.VerseGameBridge?.getLaunchParams?.()?.profileId ||
      root.BibloZooProfiles?.getActiveProfileId?.() || "").trim();
    return id && id.length <= 128 && !/[\x00-\x1f]/.test(id) ? id : "";
  }
  function statsKey(id) { return id ? ZOO_STATS_PREFIX + id : ""; }
  function readStats(id) {
    const key = statsKey(id);
    if (!key) return emptyStats();
    try {
      const parsed = JSON.parse(root.localStorage?.getItem(key) || "{}");
      const values = emptyStats();
      for (const name of Object.keys(values)) values[name] = cleanStat(parsed?.[name]);
      return values;
    } catch (_) { return emptyStats(); }
  }
  function writeStats(id, values) {
    const key = statsKey(id);
    if (!key) return false;
    try {
      if (!root.localStorage?.setItem) return false;
      root.localStorage.setItem(key, JSON.stringify(values));
      return true;
    }
    catch (_) { return false; }
  }
  function addStat(explicitId, kind) {
    const id = profileForStats(explicitId);
    if (!id || (kind !== "pet" && kind !== "break")) return false;
    const values = readStats(id);
    const total = kind === "pet" ? "petsRescued" : "zooBreaksStopped";
    const pending = kind === "pet" ? "pendingPets" : "pendingBreaks";
    if (values[total] >= Number.MAX_SAFE_INTEGER || values[pending] >= Number.MAX_SAFE_INTEGER)
      return false;
    values[total]++;
    values[pending]++;
    if (!writeStats(id, values)) return false;
    try { root.dispatchEvent?.(new CustomEvent("biblozoo-zoo-stats-changed", { detail: { profileId: id } })); }
    catch (_) { /* A missing CustomEvent implementation is harmless. */ }
    return true;
  }
  function acknowledgeCelebration(explicitId) {
    const id = profileForStats(explicitId);
    if (!id) return null;
    const values = readStats(id);
    if (!values.pendingPets && !values.pendingBreaks) return null;
    if (!writeStats(id, { ...values, pendingPets: 0, pendingBreaks: 0 })) return null;
    return { petsRescued: values.pendingPets, zooBreaksStopped: values.pendingBreaks };
  }
  const statsApi = Object.freeze({ get: id => readStats(profileForStats(id)),
    acknowledgeCelebration, storageKey: id => statsKey(profileForStats(id)) });
  root.BibloZooZooStats = statsApi;
  const rand = (min, max) => min + Math.random() * (max - min);

  function create({ overlay, recover, onRecovered, onExit, onRescue,
    onBreakComplete, soundIsReady, onPop, onBounce, getSoundContext, isSoundMuted,
    isTestRun,
    profileId, pictureBase = "",
    petName, verseId, name, reducedMotion } = {}) {
    if (!overlay?.querySelector || typeof recover !== "function" ||
        typeof onExit !== "function") return null;
    const doc = overlay.ownerDocument || root.document;
    const card = overlay.querySelector("[data-welcome-back-card]");
    const avatar = overlay.querySelector(".bz-welcome-avatar");
    const title = overlay.querySelector(".bz-welcome-title");
    const button = overlay.querySelector("[data-welcome-back-action]");
    if (!card || !avatar || !title || !button) return null;
    const status = overlay.querySelector("[data-welcome-back-status]");
    const originalTitle = title.innerHTML;
    const originalButton = button.innerHTML;
    const safeBase = pictureBase === "../../" ? "../../" : "";
    const identity = root.BibloZooWelcomeBack?.getIdentity?.(name, profileId) || {};
    const pictureSrc = safeBase + (identity.src || identity.fallback || "");
    const fallbackSrc = safeBase + (identity.fallback || "");
    // Main app, Learn, Read My Verse and standalone game pages share the
    // same per-profile verse progress. Read only; never mutate game progress.
    function activeVerseId() {
      let selected = typeof verseId === "function" ? verseId() : verseId;
      if (!selected) selected = root.VerseGameBridge?.getLaunchParams?.()?.verseId;
      return String(selected || "").trim();
    }
    const defaultPetNames = new Map();
    function activePetName() {
      const explicit = typeof petName === "function" ? petName() : petName;
      if (String(explicit || "").trim()) return String(explicit).trim().slice(0, 40);
      const id = activeVerseId();
      if (!id) return "BibloPet";
      try {
        const api = root.BibloZooProfiles;
        const profile = profileId || root.VerseGameBridge?.getLaunchParams?.()?.profileId ||
          api?.getActiveProfileId?.();
        const key = api?.getProfileProgressStorageKey?.(profile);
        if (key) {
          const progress = JSON.parse(root.localStorage?.getItem(key) || "{}");
          const saved = String(progress?.verses?.[id]?.petName || "")
            .replace(/\s+/g, " ").trim().slice(0, 40);
          if (saved) return saved;
        }
      } catch (_) { /* Optional saved name; use official verse default. */ }
      return defaultPetNames.get(id) || "BibloPet";
    }
    function preloadDefaultPetName() {
      const id = activeVerseId();
      if (!/^[a-z0-9_]+$/.test(id) || defaultPetNames.has(id) ||
          typeof root.fetch !== "function") return;
      // The activity's official verse JSON contains its default BibloPet name.
      // Start loading well before a child reaches Stage 2; never block audio.
      defaultPetNames.set(id, "");
      Promise.resolve(root.fetch(safeBase + "verse_data/" + id + ".json"))
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (disposed) return;
          const value = String(data?.biblopetDefaultName || "")
            .replace(/\s+/g, " ").trim().slice(0, 40);
          defaultPetNames.set(id, value);
          if (value && stage === "escape" && id === activeVerseId())
            setTitle(activePetName(), "escaped!");
        }).catch(() => { /* Keep safe fallback if verse metadata is unavailable. */ });
    }
    function activePetPicture() {
      const id = activeVerseId();
      const relative = id && root.BibloZooProfiles?.getProfilePictureSrc?.(id);
      return relative ? safeBase + relative : pictureSrc || fallbackSrc;
    }
    const gateSrc = safeBase + "verse_images/zoobreak_gate.png";
    const lockSrc = safeBase + "verse_images/zoobreak_lock.png";
    const reduced = reducedMotion === true || (reducedMotion !== false &&
      !!root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const pen = doc.createElement("button");
    pen.type = "button";
    pen.className = "bz-zoo-pen no-zoom";
    pen.setAttribute("aria-label", "Pen: tap here after selecting an escaped BibloPet to rescue it");
    pen.hidden = true;
    const penImg = doc.createElement("img");
    penImg.src = gateSrc;
    penImg.alt = "";
    penImg.draggable = false;
    pen.appendChild(penImg);
    avatar.appendChild(pen);
    const slot = doc.createElement("div");
    slot.className = "bz-zoo-action-slot";
    button.parentNode.insertBefore(slot, button);
    slot.appendChild(button);
    const instruction = doc.createElement("p");
    instruction.className = "bz-zoo-instruction";
    instruction.hidden = true;
    instruction.setAttribute("aria-live", "polite");
    slot.appendChild(instruction);
    const exitButton = doc.createElement("button");
    exitButton.type = "button";
    exitButton.className = "bz-zoo-exit no-zoom";
    exitButton.textContent = "Back to Zoo";
    exitButton.hidden = true;
    card.appendChild(exitButton);
    const field = doc.createElement("div");
    field.className = "bz-zoo-field";
    field.setAttribute("role", "group");
    field.setAttribute("aria-label", "Escaped BibloPets. Select a pet, then select the pen to rescue it.");
    overlay.appendChild(field);
    const rescueStatus = doc.createElement("p");
    rescueStatus.className = "bz-zoo-rescue-status";
    rescueStatus.setAttribute("role", "status");
    rescueStatus.setAttribute("aria-live", "polite");
    rescueStatus.setAttribute("aria-atomic", "true");
    overlay.appendChild(rescueStatus);
    const effects = doc.createElement("div");
    effects.className = "bz-zoo-effects";
    effects.setAttribute("aria-hidden", "true");
    overlay.appendChild(effects);
    let stage = "welcome";
    let pending = false;
    let attemptCount = 0;
    let busy = false;
    let serial = 0;
    let disposed = false;
    let raf = 0;
    let lastFrame = 0;
    let spawnTimer = 0;
    let watchdog = 0;
    let transitionTimer = 0;
    let spawning = 0;
    let total = 0;
    let rescued = 0;
    let selected = null;
    let breakCredited = false;
    let completedBreakStats = false;
    let pets = [];
    let dragging = null;
    let lastBounceSoundAt = -Infinity;
    let testScenario = null;
    let testMenu = null;
    let testHoldTimer = 0;
    let testPointer = null;
    const isDeveloperRun = () => !!testScenario || (typeof isTestRun === "function" && isTestRun() === true);
    const allowTestMenu = ENABLE_ZOO_RETURN_TEST_HARNESS &&
      !overlay.classList.contains("daily-feed-resume-overlay");
    const effectTimers = new Set();
    const laterEffect = (callback, delay) => {
      const id = root.setTimeout(() => { effectTimers.delete(id); callback(); }, delay);
      effectTimers.add(id);
    };

    const log = (type, details = {}) => {
      try { root.BibloZooAudioDiagnostics?.record(type, details); } catch (_) {}
    };
    const running = () => !disposed && pending && !doc.hidden && !overlay.hidden;
    // Feeding continues to own its existing soundIsReady/onPop/onBounce path.
    // Other activities opt in with getters for EXISTING audio only; simply
    // constructing an AudioContext here can worsen iOS's stalled-session bug.
    let soundClockSample = null;
    let soundLastAt = -Infinity;
    let soundLastNote = -1;
    const getVerifiedEffectContext = () => {
      if (typeof getSoundContext !== "function" || disposed || doc.hidden ||
          overlay.hidden || (typeof isSoundMuted === "function" && isSoundMuted()))
        return null;
      let context;
      try { context = getSoundContext(); } catch (_) { return null; }
      if (!context || context.state !== "running") {
        soundClockSample = null;
        return null;
      }
      const now = root.performance?.now?.() ?? Date.now();
      const audio = Number(context.currentTime);
      if (!Number.isFinite(audio)) return null;
      const prior = soundClockSample;
      soundClockSample = { context, wall: now, audio };
      if (!prior || prior.context !== context || now < prior.wall ||
          now - prior.wall > 1500 || now - prior.wall < 65) return null;
      return audio - prior.audio > 0.03 ? context : null;
    };
    const playPassiveSound = kind => {
      const context = getVerifiedEffectContext();
      if (!context) return;
      const now = root.performance?.now?.() ?? Date.now();
      if (now - soundLastAt < (kind === "bounce" ? 180 : 85)) return;
      soundLastAt = now;
      try {
        let index = Math.floor(Math.random() * ZOO_NOTE_FREQUENCIES.length);
        if (index === soundLastNote) index = (index + 1) % ZOO_NOTE_FREQUENCIES.length;
        soundLastNote = index;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(ZOO_NOTE_FREQUENCIES[index], start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.20, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          try { oscillator.disconnect(); gain.disconnect(); } catch (_) {}
        };
        oscillator.start(start);
        oscillator.stop(start + 0.105);
      } catch (_) { /* Missing/blocked audio never breaks Zoo Escape. */ }
    };
    const sound = kind => {
      if (typeof soundIsReady === "function") {
        // Do not change Feeding's owner-verified behavior or fall back to a
        // different engine when Feeding itself rejects sound playback.
        try {
          if (soundIsReady() !== true) return;
          if (kind === "bounce") onBounce?.(); else onPop?.();
        } catch (_) {}
        return;
      }
      playPassiveSound(kind);
    };
    function clearScheduled() {
      if (raf) root.cancelAnimationFrame(raf);
      if (spawnTimer) root.clearTimeout(spawnTimer);
      if (watchdog) root.clearTimeout(watchdog);
      if (transitionTimer) root.clearTimeout(transitionTimer);
      for (const id of effectTimers) root.clearTimeout(id);
      effectTimers.clear();
      raf = spawnTimer = watchdog = transitionTimer = 0;
      lastFrame = 0;
    }
    function emptyField() {
      clearScheduled();
      for (const pet of pets) pet.node.remove();
      pets = [];
      selected = null;
      dragging = null;
      field.replaceChildren();
      rescueStatus.textContent = "";
      effects.replaceChildren();
    }
    function place(node, x, y, degrees = 0, scale = 1) {
      node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${degrees}deg) scale(${scale})`;
    }
    function bounds() {
      const r = overlay.getBoundingClientRect();
      const size = Math.min(78, Math.max(54, r.width * .18));
      // Reserve room for the invisible 16px catch halo. The artwork, not
      // only its center, must remain fully visible from the first spawn frame.
      return { width: r.width, height: r.height, left: r.left, top: r.top,
        size, edge: 28 };
    }
    function penCenter() {
      const b = pen.getBoundingClientRect();
      const o = overlay.getBoundingClientRect();
      return { x: b.left - o.left + b.width / 2, y: b.top - o.top + b.height / 2 };
    }
    function poof(x, y) {
      if (reduced || !running()) return;
      // Traffic Tap spawnCrashBurst: real 26.46-unit SVG cloud, nine white
      // outward particles, identical burst timing and ripple choreography.
      const count = 9, distance = 58, jitter = 5, duration = 650;
      const cloudSize = 74, sizePool = [8, 9, 10, 12, 15, 18];
      const burst = doc.createElement("div");
      burst.className = "bz-zoo-poof";
      burst.style.left = `${x}px`;
      burst.style.top = `${y}px`;
      const boxSize = Math.max(132, Math.ceil((distance + cloudSize) * 2.05));
      burst.style.width = burst.style.height = `${boxSize}px`;
      const cloud = doc.createElement("div");
      cloud.className = "bz-zoo-poof-cloud";
      cloud.style.setProperty("--tt-crash-cloud-size", `${cloudSize}px`);
      cloud.style.setProperty("--tt-crash-cloud-dur", `${Math.max(520, duration - 90)}ms`);
      cloud.innerHTML = CRASH_CLOUD_SVG;
      burst.appendChild(cloud);
      const baseAngle = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.PI * 2 / count) * i + rand(-.12, .12);
        const dist = distance + rand(-jitter, jitter);
        const size = sizePool[Math.floor(Math.random() * sizePool.length)] + rand(-.5, .5);
        const particle = doc.createElement("div");
        particle.className = "bz-zoo-poof-dot";
        particle.style.setProperty("--tt-size", `${size.toFixed(1)}px`);
        particle.style.setProperty("--tt-dur", `${duration}ms`);
        particle.style.setProperty("--tt-start-scale", `${rand(.68, .82).toFixed(2)}`);
        particle.style.setProperty("--tt-end-scale", `${(rand(1.02, 1.14) + .08).toFixed(2)}`);
        particle.style.setProperty("--tt-tx", `${(Math.cos(angle) * dist).toFixed(1)}px`);
        particle.style.setProperty("--tt-ty", `${(Math.sin(angle) * dist).toFixed(1)}px`);
        particle.style.setProperty("--tt-delay", `${Math.round(rand(0, 18))}ms`);
        burst.appendChild(particle);
      }
      effects.appendChild(burst);
      // Transition start on the next animation frame, as in Traffic Tap.
      // Unlike the game, this is also safe when interrupted mid-transition.
      root.requestAnimationFrame(() => {
        if (!burst.parentNode || !running()) return;
        cloud.classList.add("is-live");
        for (const particle of burst.querySelectorAll?.(".bz-zoo-poof-dot") || []) {
          particle.classList.add("is-live");
        }
        // Also works in minimal browser shims with no querySelectorAll.
        if (!burst.querySelectorAll) {
          for (const particle of Array.from(burst.children).slice(1)) particle.classList.add("is-live");
        }
      });
      laterEffect(() => burst.remove(), duration + 120);
    }
    function announceZooBreak() {
      if (!running()) return;
      const center = penCenter();
      // Three layers keep pen centering, frenetic shake and the Verse Jam
      // GROOVY scale/rotation independent. There are no fireworks/particles.
      const anchor = doc.createElement("div");
      anchor.className = "bz-zoo-break-anchor";
      anchor.style.left = `${center.x}px`;
      anchor.style.top = `${center.y}px`;
      const shake = doc.createElement("div");
      shake.className = "bz-zoo-break-shake";
      const splash = doc.createElement("div");
      splash.className = "bz-zoo-break-splash";
      splash.textContent = "ZOO BREAK!";
      shake.appendChild(splash);
      anchor.appendChild(shake);
      effects.appendChild(anchor);
      laterEffect(() => anchor.remove(), 1300);
    }
    function setTitle(first, second) {
      title.replaceChildren();
      for (const text of [first, second]) {
        const line = doc.createElement("span");
        line.className = "bz-zoo-title-line";
        line.textContent = text;
        title.appendChild(line);
      }
    }
    function setInstruction(text) {
      instruction.textContent = text;
      instruction.hidden = false;
      button.hidden = true;
      button.disabled = false;
    }
    function setLockButton() {
      instruction.hidden = true;
      button.hidden = false;
      button.replaceChildren();
      const icon = doc.createElement("img");
      icon.src = lockSrc;
      icon.alt = "";
      icon.className = "bz-zoo-lock-icon";
      icon.onerror = () => { icon.replaceWith(doc.createTextNode("🔒")); };
      button.appendChild(icon);
      button.appendChild(doc.createTextNode(" LOCK GATE"));
      button.disabled = false;
      button.focus?.({ preventScroll: true });
    }
    function shakeCard(kind) {
      if (reduced) return;
      card.classList.remove("bz-zoo-shake-escape", "bz-zoo-shake-break");
      // Restart on each distinct event, without changing the card's layout.
      void card.offsetWidth;
      const cls = kind === "break" ? "bz-zoo-shake-break" : "bz-zoo-shake-escape";
      card.classList.add(cls);
      laterEffect(() => card.classList.remove(cls), kind === "break" ? 570 : 360);
    }
    function setStage(next) {
      stage = next;
      card.classList.toggle("bz-zoo-active", next === "escape" || next === "break");
      overlay.classList.toggle("bz-zoo-escape", next === "escape" || next === "break");
      pen.hidden = next !== "escape" && next !== "break";
      exitButton.hidden = next === "welcome" || next === "recovered" || next === "exiting";
      if (status) status.hidden = true;
      if (next === "escape") {
        rescueStatus.textContent = "One BibloPet escaped. Select it and the pen to rescue it.";
        shakeCard("escape");
        setTitle(activePetName(), "escaped!");
        setInstruction("Drag a pet to the pen, or tap a pet and then the pen!");
        total = 1;
        spawning = 0;
        rescued = 0;
        createPet(activePetPicture(), 1);
      } else if (next === "break") {
        emptyField();
        rescueStatus.textContent = "Zoo Break! Select each escaped BibloPet, then select the pen.";
        setTitle("WARNING!", "Zoo BREAK!");
        setInstruction("Drag a pet to the pen, or tap a pet and then the pen!");
        total = MIN_PETS + Math.floor(Math.random() * (MAX_PETS - MIN_PETS + 1));
        spawning = 0;
        rescued = 0;
        breakCredited = false;
        shakeCard("break");
        announceZooBreak();
        spawnNext();
      }
      log("zoo-escape-stage", { stage: next, attemptCount, total });
    }
    function possiblePictures() {
      let catalog = [];
      try { catalog = root.BibloZooProfiles?.getProfilePictureCatalog?.() || []; } catch (_) {}
      // `getProfilePictureCatalog()` is initialized by app.js, not by a
      // standalone game. Use a verified, offline-ready real portrait pool
      // rather than falling back to one repeated zookeeper avatar.
      const shuffled = [...new Set(catalog.length ? catalog : ZOO_BREAK_PORTRAITS)];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const api = root.BibloZooProfiles;
      return shuffled.map(id => safeBase + (api?.getProfilePictureSrc?.(id) || ""))
        .filter(src => src !== safeBase);
    }
    let breakPictures = [];
    function createPet(src, number) {
      if (!running() || (stage !== "escape" && stage !== "break")) return;
      const b = bounds();
      const c = penCenter();
      const el = doc.createElement("button");
      el.className = "bz-zoo-pet no-zoom";
      el.type = "button";
      el.style.width = el.style.height = `${b.size}px`;
      el.setAttribute("aria-label", `Catch escaped BibloPet ${number} of ${total}`);
      el.disabled = true;
      el.tabIndex = -1;
      const img = doc.createElement("img");
      img.src = src || fallbackSrc;
      img.alt = "";
      img.draggable = false;
      img.onerror = () => {
        // If an uncached portrait is missing, try the independently precached
        // portrait for this pet instead of showing the SAME fallback for all.
        const id = ZOO_BREAK_PORTRAITS[(number - 1) % ZOO_BREAK_PORTRAITS.length];
        const distinct = safeBase + "profile_pictures/profile_picture_" + id + ".png";
        const resolved = new URL(distinct, doc.baseURI).href;
        if (img.src !== resolved) img.src = distinct;
        else if (fallbackSrc && img.src !== new URL(fallbackSrc, doc.baseURI).href)
          img.src = fallbackSrc;
      };
      el.appendChild(img);
      field.appendChild(el);
      const pet = { node: el, x: c.x - b.size / 2, y: c.y - b.size / 2,
        vx: rand(300, 440) * Math.max(.78, Math.min(1.15, b.width / 390)) * (Math.random() < .5 ? -1 : 1),
        vy: rand(290, 420) * Math.max(.78, Math.min(1.15, b.width / 390)) * (Math.random() < .5 ? -1 : 1),
        angle: rand(-12, 12), size: b.size, state: "emerging", born: Date.now(),
        number };
      const maxX = Math.max(b.edge, b.width - b.size - b.edge);
      const maxY = Math.max(b.edge, b.height - b.size - b.edge);
      pet.x = Math.max(b.edge, Math.min(maxX, pet.x));
      pet.y = Math.max(b.edge, Math.min(maxY, pet.y));
      if (reduced) {
        // Reduced Motion: no drifting, bouncing, growth, or invincible wait.
        // Scatter at full size around the pen while preserving tap/drag rescue.
        const angle = (number * 2.399963229728653) + (stage === "break" ? 0.4 : 0);
        const distance = Math.max(b.size * 1.25, Math.min(b.width, b.height) * .28);
        pet.x = Math.max(b.edge, Math.min(maxX, c.x - b.size / 2 + Math.cos(angle) * distance));
        pet.y = Math.max(b.edge, Math.min(maxY, c.y - b.size / 2 + Math.sin(angle) * distance));
        pet.angle = 0;
        pet.state = "ready";
        el.disabled = false;
        el.tabIndex = 0;
        el.classList.add("bz-zoo-catchable");
      }
      pets.push(pet);
      place(el, pet.x, pet.y, pet.angle, reduced ? 1 : .15);
      // The expanding portrait signals invincibility. Touch and keyboard
      // activation are disabled until 100% scaling AND a clear pen exit.
      el.addEventListener("pointerdown", event => takePet(event, pet));
      el.addEventListener("pointermove", event => movePet(event, pet));
      el.addEventListener("pointerup", event => releasePet(event, pet));
      el.addEventListener("pointercancel", () => dropPet(pet));
      el.addEventListener("click", event => {
        if (!running() || pet.state !== "ready" || dragging) return;
        event.preventDefault();
        selected = pet;
        pet.node.classList.add("bz-zoo-selected");
        pen.focus?.({ preventScroll: true });
      });
      sound("appear");
      runAnimation();
    }
    function spawnNext() {
      if (!running() || stage !== "break" || spawning >= total) return;
      spawning++;
      const src = breakPictures[(spawning - 1) % breakPictures.length] ||
        pictureSrc || fallbackSrc;
      createPet(src, spawning);
      if (spawning < total) {
        spawnTimer = root.setTimeout(() => { spawnTimer = 0; spawnNext(); }, SPAWN_MS);
      }
    }
    function runAnimation() {
      if (!reduced && !raf && running() && pets.some(p => p.state !== "rescued")) {
        lastFrame = 0;
        raf = root.requestAnimationFrame(tick);
      }
    }
    function advanceAndBounce(p, b, delta) {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      let bounced = false;
      const maxX = Math.max(b.edge, b.width - p.size - b.edge);
      const maxY = Math.max(b.edge, b.height - p.size - b.edge);
      if (p.x < b.edge || p.x > maxX) {
        p.vx = -p.vx;
        p.x = Math.max(b.edge, Math.min(maxX, p.x));
        bounced = true;
      }
      if (p.y < b.edge || p.y > maxY) {
        p.vy = -p.vy;
        p.y = Math.max(b.edge, Math.min(maxY, p.y));
        bounced = true;
      }
      if (bounced && Date.now() - lastBounceSoundAt >= 180) {
        lastBounceSoundAt = Date.now();
        sound("bounce");
      }
    }
    function tick(now) {
      raf = 0;
      if (!running()) return;
      const delta = lastFrame ? Math.min(0.035, Math.max(0, (now - lastFrame) / 1000)) : 0;
      lastFrame = now;
      const b = bounds();
      for (const p of pets) {
        if (p.state === "rescued" || p.state === "held") continue;
        if (p.state === "emerging") {
          // Move straight out while scaling; user cannot cheap-catch.
          const ratio = Math.min(1, (Date.now() - p.born) / EMERGE_MS);
          advanceAndBounce(p, b, delta);
          place(p.node, p.x, p.y, p.angle, reduced ? 1 : Math.max(.15, ratio));
          const c = penCenter();
          const escaped = Math.hypot(p.x + p.size/2 - c.x, p.y + p.size/2 - c.y) >= p.size * .75;
          if (ratio >= 1 && escaped) {
            p.state = "ready";
            p.node.disabled = false;
            p.node.tabIndex = 0;
            p.node.classList.add("bz-zoo-catchable");
          }
          continue;
        }
        advanceAndBounce(p, b, delta);
        p.angle = Math.max(-18, Math.min(18, p.angle + p.vx * delta * .08));
        place(p.node, p.x, p.y, p.angle);
      }
      if (pets.some(p => p.state !== "rescued")) raf = root.requestAnimationFrame(tick);
    }
    function takePet(e, pet) {
      if (!running() || pet.state !== "ready" || dragging) return;
      if (e.cancelable) e.preventDefault();
      selected = null;
      pet.state = "held";
      pet.node.classList.remove("bz-zoo-selected");
      dragging = { pet, pointerId: e.pointerId, x: e.clientX - (bounds().left + pet.x), y: e.clientY - (bounds().top + pet.y) };
      try { pet.node.setPointerCapture(e.pointerId); } catch (_) {}
    }
    function movePet(e, pet) {
      if (!dragging || dragging.pet !== pet || dragging.pointerId !== e.pointerId) return;
      if (e.cancelable) e.preventDefault();
      const b = bounds();
      pet.x = Math.max(0, Math.min(b.width - pet.size, e.clientX - b.left - dragging.x));
      pet.y = Math.max(0, Math.min(b.height - pet.size, e.clientY - b.top - dragging.y));
      place(pet.node, pet.x, pet.y);
    }
    function releasePet(e, pet) {
      if (!dragging || dragging.pet !== pet || dragging.pointerId !== e.pointerId) return;
      if (e.cancelable) e.preventDefault();
      dragging = null;
      const c = penCenter();
      if (Math.hypot(pet.x + pet.size/2 - c.x, pet.y + pet.size/2 - c.y) <= pet.size * 1.0) rescue(pet);
      else { pet.state = "ready"; runAnimation(); }
    }
    function dropPet(pet) {
      if (!dragging || dragging.pet !== pet) return;
      dragging = null;
      pet.state = "ready";
      runAnimation();
    }
    function rescue(pet) {
      if (!running() || !pet || pet.state === "rescued" || pet.state === "emerging") return;
      pet.state = "rescued";
      pet.node.disabled = true;
      pet.node.remove();
      if (selected === pet) selected = null;
      rescued++;
      if (!isDeveloperRun()) addStat(profileId, "pet");
      rescueStatus.textContent = `${rescued} of ${total} BibloPets rescued. ${rescued === total ? "All pets are safe! Lock the gate." : "Select another pet and then the pen."}`;
      const c = penCenter();
      poof(c.x, c.y);
      sound("rescue");
      try { onRescue?.({ stage, count: 1, rescued, total }); } catch (_) {}
      log("zoo-escape-pet-rescued", { stage, rescued, total });
      if (rescued === total && (stage !== "break" || spawning === total)) {
        if (stage === "break" && !breakCredited) {
          breakCredited = true;
          try { onBreakComplete?.({ rescued, total }); } catch (_) {}
        }
        setLockButton();
      }
    }
    function tapPen() {
      if (selected && selected.state === "ready") rescue(selected);
    }
    function onVisibility() {
      if (disposed) return;
      overlay.classList.toggle("bz-zoo-backgrounded", !!doc.hidden);
      if (doc.hidden) {
        cancelTestHold();
        closeTestMenu();
        if (raf) root.cancelAnimationFrame(raf);
        if (dragging) dropPet(dragging.pet);
        raf = 0;
        lastFrame = 0;
        if (spawnTimer) { root.clearTimeout(spawnTimer); spawnTimer = 0; }
        if (watchdog) { root.clearTimeout(watchdog); watchdog = 0; busy = false; serial++; button.disabled = false; }
        if (transitionTimer) { root.clearTimeout(transitionTimer); transitionTimer = 0; }
        // Intentional: keep stage and captured pets when the child switches away.
      } else if (running()) {
        if (stage === "exiting" && !transitionTimer) {
          transitionTimer = root.setTimeout(() => { transitionTimer = 0; exitToZoo(); }, reduced ? 60 : 420);
        }
        if (busy) { busy = false; serial++; }
        if (stage === "break" && spawning < total) spawnNext();
        runAnimation();
      }
    }
    function successful() {
      if (stage === "break" && breakCredited && !completedBreakStats && !isDeveloperRun()) {
        completedBreakStats = true;
        addStat(profileId, "break");
      }
      pending = false;
      stage = "recovered";
      emptyField();
      resetDisplay();
      try { onRecovered?.(); } catch (_) {}
      log("zoo-escape-recovered", { attemptCount });
    }
    function finishFailure(from) {
      if (!running()) return;
      const next = nextStage(from, false);
      if (next === "escape") setStage("escape");
      else if (next === "break") {
        breakPictures = possiblePictures();
        setStage("break");
      } else {
        stage = "exiting";
        exitButton.hidden = true;
        overlay.classList.add("bz-zoo-fade-black");
        log("zoo-escape-terminal", { attemptCount, rescued, total });
        transitionTimer = root.setTimeout(() => { transitionTimer = 0; exitToZoo(); }, reduced ? 60 : 420);
      }
    }
    // This never synthesizes success. A scripted failure/deferred result skips
    // the owner's audio handler. A scripted "real" result invokes the owner's
    // original recovery SYNCHRONOUSLY inside the real LOCK GATE click.
    // Thus even in test mode, successful recovery must be verified by its owner.
    function recoveryForAttempt(info) {
      if (testScenario && testScenario.index < testScenario.results.length) {
        const outcome = testScenario.results[testScenario.index++];
        log("zoo-escape-dev-attempt", { scenario: testScenario.id,
          index: testScenario.index, outcome: outcome === "real" ? "owner" : outcome });
        if (outcome === false) return false;
        if (outcome === "deferred") return { deferred: true, reason: "developer-test" };
      }
      return recover(info);
    }
    function attempt() {
      if (!running() || busy || (stage !== "welcome" && stage !== "escape" && stage !== "break")) return;
      if ((stage === "escape" || stage === "break") && !instruction.hidden) return;
      if (attemptCount >= MAX_ATTEMPTS) return;
      const from = stage;
      attemptCount++;
      busy = true;
      const token = ++serial;
      button.disabled = true;
      exitButton.hidden = false;
      log("zoo-escape-gesture", { stage: from, attemptCount });
      // Invoke recovery synchronously while WebKit's direct user activation
      // exists. Do not await a cosmetic animation before calling this.
      let recovery;
      try { recovery = recoveryForAttempt({ stage: from, attempt: attemptCount }); }
      catch (_) { recovery = false; }
      watchdog = root.setTimeout(() => {
        watchdog = 0;
        if (disposed || !busy || token !== serial) return;
        busy = false;
        button.disabled = false;
        finishFailure(from);
      }, RECOVERY_WATCHDOG_MS);
      Promise.resolve(recovery).then(ok => {
        if (disposed || token !== serial || !busy) return;
        busy = false;
        if (watchdog) { root.clearTimeout(watchdog); watchdog = 0; }
        if (ok?.deferred === true && running()) {
          // A native interruption/cooldown is not a failed user attempt.
          // Keep the same gate, allow another *real* tap, and expose Back.
          attemptCount = Math.max(0, attemptCount - 1);
          button.disabled = false;
          exitButton.hidden = false;
          if (status) {
            status.textContent = "Sound isn't ready yet. Try again!";
            status.hidden = false;
          }
          log("zoo-escape-recovery-deferred", { stage: from, reason: ok.reason || "native-interruption" });
        } else if (ok === true && running()) successful();
        else if (running()) finishFailure(from);
      }, () => {
        if (disposed || token !== serial || !busy) return;
        busy = false;
        if (watchdog) { root.clearTimeout(watchdog); watchdog = 0; }
        finishFailure(from);
      });
    }
    function exitToZoo() {
      if (disposed) return;
      stage = "exiting";
      pending = false;
      serial++;
      emptyField();
      log("zoo-escape-exit", { attemptCount, rescued, total });
      try { onExit?.({ attemptCount, rescued, total, completedBreak: breakCredited }); } catch (_) {
        // A caller can provide its own visible navigation fallback.
        exitButton.hidden = false;
        overlay.classList.remove("bz-zoo-fade-black");
      }
    }
    function cancelTestHold() {
      if (testHoldTimer) root.clearTimeout(testHoldTimer);
      testHoldTimer = 0;
      testPointer = null;
    }
    function closeTestMenu() {
      testMenu?.remove();
      testMenu = null;
    }
    function showTestMenu() {
      cancelTestHold();
      if (!allowTestMenu || !running() || busy || testMenu) return;
      const menu = doc.createElement("div");
      menu.className = "bz-zoo-dev-menu";
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-modal", "true");
      menu.setAttribute("aria-label", "Zoo Escape developer test menu");
      const content = doc.createElement("div");
      content.className = "bz-zoo-dev-card";
      const heading = doc.createElement("h2");
      heading.textContent = "Zoo Escape TEST MODE";
      content.appendChild(heading);
      const note = doc.createElement("p");
      note.textContent = "Simulates failures only. Success always uses the activity's real recovery check. No audio is faked.";
      content.appendChild(note);
      for (const item of TEST_SCENARIOS) {
        const option = doc.createElement("button");
        option.type = "button";
        option.textContent = item.label;
        option.addEventListener("click", () => {
          if (!running() || busy || testMenu !== menu) return;
          closeTestMenu();
          start();
          testScenario = { id: item.id, results: item.results, index: 0 };
          log("zoo-escape-dev-selected", { scenario: item.id });
          button.focus?.({ preventScroll: true });
        });
        content.appendChild(option);
      }
      const cancel = doc.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel / normal recovery";
      cancel.addEventListener("click", closeTestMenu);
      content.appendChild(cancel);
      menu.appendChild(content);
      overlay.appendChild(menu);
      testMenu = menu;
      content.querySelector?.("button")?.focus?.({ preventScroll: true });
    }
    function testPointerDown(event) {
      if (!allowTestMenu || !running() || busy || testMenu ||
          (event.button != null && event.button !== 0)) return;
      cancelTestHold();
      testPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      testHoldTimer = root.setTimeout(showTestMenu, TEST_HOLD_MS);
    }
    function testPointerMove(event) {
      if (testPointer && testPointer.id === event.pointerId &&
          Math.hypot(event.clientX - testPointer.x,
            event.clientY - testPointer.y) > 14) cancelTestHold();
    }
    function testPointerEnd() { cancelTestHold(); }
    function testContextMenu(event) {
      if (allowTestMenu && running()) event.preventDefault?.();
    }
    function resumeVisible() {
      if (disposed || !running()) return;
      overlay.classList.remove("bz-zoo-backgrounded");
      if (stage === "break" && spawning < total && !spawnTimer) spawnNext();
      runAnimation();
    }
    function resetDisplay() {
      card.classList.remove("bz-zoo-active", "bz-zoo-shake-escape", "bz-zoo-shake-break");
      overlay.classList.remove("bz-zoo-escape", "bz-zoo-fade-black", "bz-zoo-backgrounded");
      title.innerHTML = originalTitle; // original template content, not user data
      root.BibloZooWelcomeBack?.populate?.(overlay, { profileId, name, pictureBase: safeBase });
      button.innerHTML = originalButton;
      button.hidden = false;
      button.disabled = false;
      instruction.hidden = true;
      pen.hidden = true;
      exitButton.hidden = true;
      if (status) status.hidden = true;
    }
    function start() {
      if (disposed) return false;
      preloadDefaultPetName();
      cancelTestHold();
      closeTestMenu();
      testScenario = null;
      serial++;
      emptyField();
      pending = true;
      busy = false;
      attemptCount = 0;
      rescued = 0;
      total = 0;
      spawning = 0;
      breakCredited = false;
      completedBreakStats = false;
      stage = "welcome";
      resetDisplay();
      log("zoo-escape-start");
      return true;
    }
    function destroy() {
      if (disposed) return;
      cancelTestHold();
      closeTestMenu();
      testScenario = null;
      disposed = true;
      pending = false;
      serial++;
      emptyField();
      doc.removeEventListener("visibilitychange", onVisibility);
      if (allowTestMenu) {
        title.removeEventListener("pointerdown", testPointerDown);
        title.removeEventListener("pointermove", testPointerMove);
        title.removeEventListener("pointerup", testPointerEnd);
        title.removeEventListener("pointercancel", testPointerEnd);
        title.removeEventListener("contextmenu", testContextMenu);
      }
      button.removeEventListener("click", attempt);
      pen.removeEventListener("click", tapPen);
      exitButton.removeEventListener("click", exitToZoo);
      field.remove(); effects.remove(); rescueStatus.remove(); pen.remove(); instruction.remove();
      slot.parentNode?.insertBefore(button, slot);
      slot.remove(); exitButton.remove();
      resetDisplay();
    }
    if (allowTestMenu) {
      title.addEventListener("pointerdown", testPointerDown);
      title.addEventListener("pointermove", testPointerMove);
      title.addEventListener("pointerup", testPointerEnd);
      title.addEventListener("pointercancel", testPointerEnd);
      title.addEventListener("contextmenu", testContextMenu);
    }
    button.addEventListener("click", attempt);
    pen.addEventListener("click", tapPen);
    exitButton.addEventListener("click", exitToZoo);
    doc.addEventListener("visibilitychange", onVisibility);
    return Object.freeze({ start, resumeVisible, destroy, exit: exitToZoo,
      isPaused: () => pending, getStage: () => stage,
      getState: () => ({ stage, pending, attemptCount, total, spawning, rescued,
        active: pets.filter(p => p.state !== "rescued").length }) });
  }

  root.BibloZooZooEscape = Object.freeze({ create, nextStage, clampCount,
    MAX_ATTEMPTS, MIN_PETS, MAX_PETS, EMERGE_MS, SPAWN_MS });
})(window);
