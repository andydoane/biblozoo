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
  const SPAWN_MS = 1000;
  const RECOVERY_WATCHDOG_MS = 7500;
  // Identical vector silhouette used by Traffic Tap and Verse Launch for wrong answers.
  // No platform-dependent cloud emoji; no dependency on the other game's DOM.
  const CRASH_CLOUD_SVG = `
<svg viewBox="0 0 26.458333 26.458333" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M 12.949771,1.5464282 A 6.0017493,5.3230522 7.1160496 0 0 6.9820601,6.4190471 5.3405872,4.7400094 7.154063 0 0 6.8563886,6.4134999 5.3405872,4.7400094 7.154063 0 0 1.5243277,11.020646 5.3405872,4.7400094 7.154063 0 0 2.4259083,13.677302 4.0181559,3.5662928 7.1540647 0 0 0.66145837,16.583588 4.0181559,3.5662928 7.1540647 0 0 4.6728467,20.261811 4.0181559,3.5662928 7.1540647 0 0 5.1732885,20.243 a 5.3405872,4.7400094 7.154063 0 0 5.2883005,4.342428 5.3405872,4.7400094 7.154063 0 0 3.656255,-1.210431 4.0181559,3.5662928 7.1540647 0 0 3.300558,1.639798 4.0181559,3.5662928 7.1540647 0 0 4.011389,-3.466536 4.0181559,3.5662928 7.1540647 0 0 -0.416848,-1.594767 5.3405872,4.7400094 7.154063 0 0 4.783932,-4.586787 5.3405872,4.7400094 7.154063 0 0 -1.9322,-3.706541 4.0181559,3.5662928 7.1540647 0 0 0.764128,-2.0624453 4.0181559,3.5662928 7.1540647 0 0 -4.011389,-3.6776624 4.0181559,3.5662928 7.1540647 0 0 -1.744813,0.3148283 6.0017493,5.3230522 7.1160496 0 0 -5.92283,-4.6884523 z"/>
</svg>`;
  const clampCount = n => Math.min(MAX_PETS, Math.max(MIN_PETS, Math.floor(Number(n) || MIN_PETS)));
  const nextStage = (stage, recovered) => recovered === true ? "recovered" :
    stage === "welcome" ? "escape" : stage === "escape" ? "break" : "exit";
  const rand = (min, max) => min + Math.random() * (max - min);

  function create({ overlay, recover, onRecovered, onExit, onRescue,
    onBreakComplete, soundIsReady, onPop, onBounce, profileId, pictureBase = "",
    petName = "BibloPet", name, reducedMotion } = {}) {
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
    const gateSrc = safeBase + "verse_images/zoobreak_gate.png";
    const lockSrc = safeBase + "verse_images/zoobreak_lock.png";
    const reduced = reducedMotion === true || (reducedMotion !== false &&
      !!root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    const pen = doc.createElement("button");
    pen.type = "button";
    pen.className = "bz-zoo-pen no-zoom";
    pen.setAttribute("aria-label", "Return selected BibloPet to the pen");
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
    field.setAttribute("aria-label", "Escaped BibloPets");
    overlay.appendChild(field);
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
    let pets = [];
    let dragging = null;
    let lastBounceSoundAt = -Infinity;
    const effectTimers = new Set();
    const laterEffect = (callback, delay) => {
      const id = root.setTimeout(() => { effectTimers.delete(id); callback(); }, delay);
      effectTimers.add(id);
    };

    const log = (type, details = {}) => {
      try { root.BibloZooAudioDiagnostics?.record(type, details); } catch (_) {}
    };
    const running = () => !disposed && pending && !doc.hidden && !overlay.hidden;
    const sound = kind => {
      // Strictly optional; never unlock or create audio merely to add an effect.
      if (typeof soundIsReady !== "function" || soundIsReady() !== true) return;
      try { if (kind === "bounce") onBounce?.(); else onPop?.(); } catch (_) {}
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
        shakeCard("escape");
        setTitle(String(petName || "BibloPet").slice(0, 40), "escaped!");
        setInstruction("Drag them back!");
        total = 1;
        spawning = 0;
        rescued = 0;
        createPet(pictureSrc || fallbackSrc, 1);
      } else if (next === "break") {
        emptyField();
        setTitle("WARNING!", "Zoo BREAK!");
        setInstruction("Drag them back!");
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
      const shuffled = [...new Set(catalog)];
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
      img.onerror = () => { if (fallbackSrc && img.src !== new URL(fallbackSrc, doc.baseURI).href) img.src = fallbackSrc; };
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
      if (!raf && running() && pets.some(p => p.state !== "rescued")) {
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
      try { recovery = recover({ stage: from, attempt: attemptCount }); }
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
        if (ok === true && running()) successful();
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
      serial++;
      emptyField();
      pending = true;
      busy = false;
      attemptCount = 0;
      rescued = 0;
      total = 0;
      spawning = 0;
      breakCredited = false;
      stage = "welcome";
      resetDisplay();
      log("zoo-escape-start");
      return true;
    }
    function destroy() {
      if (disposed) return;
      disposed = true;
      pending = false;
      serial++;
      emptyField();
      doc.removeEventListener("visibilitychange", onVisibility);
      button.removeEventListener("click", attempt);
      pen.removeEventListener("click", tapPen);
      exitButton.removeEventListener("click", exitToZoo);
      field.remove(); effects.remove(); pen.remove(); instruction.remove();
      slot.parentNode?.insertBefore(button, slot);
      slot.remove(); exitButton.remove();
      resetDisplay();
    }
    button.addEventListener("click", attempt);
    pen.addEventListener("click", tapPen);
    exitButton.addEventListener("click", exitToZoo);
    doc.addEventListener("visibilitychange", onVisibility);
    return Object.freeze({ start, destroy, exit: exitToZoo,
      isPaused: () => pending, getStage: () => stage,
      getState: () => ({ stage, pending, attemptCount, total, spawning, rescued,
        active: pets.filter(p => p.state !== "rescued").length }) });
  }

  root.BibloZooZooEscape = Object.freeze({ create, nextStage, clampCount,
    MAX_ATTEMPTS, MIN_PETS, MAX_PETS, EMERGE_MS, SPAWN_MS });
})(window);
