(() => {
  "use strict";

  const ASSET_BASE = "./verse_images/daily_questions/";
  const BACKGROUND_SCENES = Object.freeze([
    "beach", "canyon", "clouds", "glacier", "hills", "mesa",
    "moon", "mountain", "swamp", "volcano", "waterfall"
  ]);
  const SOLID_BALLS = Object.freeze([
    { id: "red", color: "#ff5a51", asset: `${ASSET_BASE}dq_feed_ball_red.png` },
    { id: "yellow", color: "#ffc751", asset: `${ASSET_BASE}dq_feed_ball_yellow.png` },
    { id: "orange", color: "#ff963f", asset: `${ASSET_BASE}dq_feed_ball_orange.png` },
    { id: "green", color: "#78ad4f", asset: `${ASSET_BASE}dq_feed_ball_green.png` },
    { id: "blue", color: "#46aef0", asset: `${ASSET_BASE}dq_feed_ball_blue.png` },
    { id: "purple", color: "#7f66c6", asset: `${ASSET_BASE}dq_feed_ball_purple.png` }
  ]);
  const RAINBOW_BALL = Object.freeze({
    id: "rainbow",
    color: "#ffc751",
    asset: `${ASSET_BASE}dq_feed_ball_rainbow.png`,
    points: 5,
    trailColors: ["#ff5a51", "#ff963f", "#ffc751", "#78ad4f", "#46aef0", "#7f66c6"]
  });
  const PEG_NOTE_FREQUENCIES = Object.freeze([
    523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98
  ]);
  const TILT_CALIBRATION_MS = 750;
  const TILT_NEUTRAL_LIMIT = 3.5;

  let activeRuntime = null;
  let preparedAudioContext = null;
  let preparedStarBuffer = null;
  let starBufferPromise = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomFrom = (items) => items?.length
    ? items[Math.floor(Math.random() * items.length)]
    : null;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function createImage(src) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    return image;
  }

  function buildScheduledBalls() {
    const scheduled = [];
    while (scheduled.length < 9) {
      const bag = shuffle(SOLID_BALLS);
      const previous = scheduled[scheduled.length - 1];
      if (previous && bag.length > 1 && bag[0].id === previous.id) {
        [bag[0], bag[1]] = [bag[1], bag[0]];
      }
      for (const config of bag) {
        if (scheduled.length >= 9) break;
        scheduled.push(config);
      }
    }
    scheduled.push(RAINBOW_BALL);
    return scheduled;
  }

  function chooseBackground(width, height) {
    const scene = randomFrom(BACKGROUND_SCENES) || "waterfall";
    const format = width / Math.max(1, height) >= 0.66 ? "tablet" : "phone";
    return `${ASSET_BASE}dq_feed_bg_${scene}_${format}.jpg`;
  }

  function createPegField(width, height) {
    const pegs = [];
    const rows = 9;
    const radius = clamp(width * 0.04, 14, 26);
    const foodRadius = radius * 0.66;
    const edgeGap = foodRadius * 3;
    const edgeCenter = clamp(
      radius + edgeGap,
      radius * 1.35,
      width * 0.18
    );
    const regularSpacing = (width - edgeCenter * 2) / 4;
    const topY = Math.max(radius * 2.6, height * 0.12);
    const bottomY = height * 0.76;

    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 === 1;
      const columns = offset ? 4 : 5;
      const y = topY + ((bottomY - topY) * row / (rows - 1));
      for (let column = 0; column < columns; column += 1) {
        const x = offset
          ? edgeCenter + regularSpacing * (column + 0.5)
          : edgeCenter + regularSpacing * column;

        pegs.push({
          id: `${row}-${column}`,
          row,
          column,
          x,
          y,
          radius,
          isStar: false
        });
      }
    }

    const starPeg = randomFrom(pegs.filter((peg) => peg.row > 0 && peg.row < rows - 1));
    if (starPeg) starPeg.isStar = true;
    return { pegs, pegRadius: radius, starPeg };
  }

  function buildImageMap() {
    const balls = {};
    for (const config of SOLID_BALLS) balls[config.id] = createImage(config.asset);
    balls.rainbow = createImage(RAINBOW_BALL.asset);
    return {
      balls,
      star: createImage(`${ASSET_BASE}dq_feed_star_peg.png`)
    };
  }

  function loadStarBuffer(context) {
    if (!context) return Promise.resolve(null);
    if (preparedStarBuffer) return Promise.resolve(preparedStarBuffer);
    if (starBufferPromise) return starBufferPromise;

    starBufferPromise = fetch(`${ASSET_BASE}dq_feed_star.mp3`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((bytes) => context.decodeAudioData(bytes))
      .then((buffer) => {
        preparedStarBuffer = buffer;
        return buffer;
      })
      .catch((err) => {
        console.warn("Daily feeding star sound could not load", err);
        starBufferPromise = null;
        return null;
      });

    return starBufferPromise;
  }

  function prepareAudio() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (preparedAudioContext && preparedAudioContext.state !== "closed") {
      preparedAudioContext.resume?.().catch?.(() => {});
      loadStarBuffer(preparedAudioContext);
      return preparedAudioContext;
    }
    try {
      preparedAudioContext = new Ctor();
      preparedAudioContext.resume?.().catch?.(() => {});
      loadStarBuffer(preparedAudioContext);
      return preparedAudioContext;
    } catch (err) {
      preparedAudioContext = null;
      return null;
    }
  }

  function stopAudioContext(context) {
    if (!context || context.state === "closed") return;
    try { context.close(); } catch (err) { }
  }

  function stop() {
    const runtime = activeRuntime;
    activeRuntime = null;
    if (runtime) {
      runtime.running = false;
      if (runtime.rafId) cancelAnimationFrame(runtime.rafId);
      if (runtime.orientationHandler) {
        window.removeEventListener("deviceorientation", runtime.orientationHandler);
      }
      if (runtime.pointerDownHandler) stageRemove(runtime, "pointerdown", runtime.pointerDownHandler);
      if (runtime.pointerMoveHandler) stageRemove(runtime, "pointermove", runtime.pointerMoveHandler);
      if (runtime.pointerEndHandler) {
        stageRemove(runtime, "pointerup", runtime.pointerEndHandler);
        stageRemove(runtime, "pointercancel", runtime.pointerEndHandler);
      }
      if (Number.isInteger(runtime.activePointerId)) {
        try { runtime.stage?.releasePointerCapture(runtime.activePointerId); } catch (err) { }
      }
      if (runtime.starAudio) {
        try { runtime.starAudio.pause(); runtime.starAudio.currentTime = 0; } catch (err) { }
      }
      stopAudioContext(runtime.audioContext);
    }
    if (preparedAudioContext) {
      stopAudioContext(preparedAudioContext);
      preparedAudioContext = null;
    }
  }

  function stageRemove(runtime, type, handler) {
    runtime.stage?.removeEventListener(type, handler);
  }

  function render({ session, profilePictureHtml = "" } = {}) {
    const petName = String(session?.petName || "BibloPet").trim() || "BibloPet";
    return `
      <div class="daily-feed-game" data-daily-feed-game data-daily-session-phase="reward_game">
        <div class="daily-feed-score-badge" aria-live="polite" aria-label="Score">
          <span class="daily-feed-score-label">Score</span>
          <strong class="daily-feed-score-value" data-daily-feed-score>0</strong>
        </div>
        <div class="daily-feed-stage" data-daily-feed-stage role="application"
          aria-label="Tilt or drag ${petName} left and right to catch the falling food">
          <canvas class="daily-feed-canvas" data-daily-feed-canvas aria-hidden="true"></canvas>
          <div class="daily-feed-catcher" data-daily-feed-catcher aria-hidden="true">
            <div class="daily-feed-pet-circle" data-daily-feed-pet-circle>
              ${profilePictureHtml}
            </div>
            <img class="daily-feed-shadow" src="${ASSET_BASE}dq_feed_shadow.png" alt="" draggable="false">
          </div>
        </div>
      </div>`;
  }

  function setCatcherX(runtime, nextX, tiltHint = null) {
    if (!runtime) return;
    const previous = runtime.catcherX;
    const safeX = clamp(Number(nextX) || runtime.width / 2, runtime.petRadius, runtime.width - runtime.petRadius);
    runtime.catcherX = safeX;
    runtime.catcher.style.left = `${safeX}px`;
    runtime.petTilt = Number.isFinite(tiltHint)
      ? clamp(tiltHint, -13, 13)
      : clamp((safeX - previous) * 0.62, -13, 13);
    runtime.petCircle.style.setProperty("--daily-feed-pet-tilt", `${runtime.petTilt}deg`);
  }

  function beginTiltCalibration(runtime) {
    if (!runtime?.tiltEnabled) return;
    runtime.neutralGamma = null;
    runtime.smoothedTilt = 0;
    runtime.tiltSamples = [];
    runtime.tiltCalibrationUntil =
      performance.now() + TILT_CALIBRATION_MS;
    setCatcherX(runtime, runtime.width / 2, 0);
  }

  function handleTilt(runtime, event) {
    if (!runtime || !runtime.tiltEnabled || runtime.dragging || activeRuntime !== runtime) return;
    const gamma = Number(event?.gamma);
    if (!Number.isFinite(gamma)) return;

    const now = performance.now();

    if (now < runtime.tiltCalibrationUntil) {
      runtime.tiltSamples.push(gamma);
      if (runtime.tiltSamples.length > 24) {
        runtime.tiltSamples.shift();
      }
      return;
    }

    if (!Number.isFinite(runtime.neutralGamma)) {
      const samples = runtime.tiltSamples.length
        ? runtime.tiltSamples
        : [gamma];
      const average = samples.reduce(
        (sum, value) => sum + value,
        0
      ) / samples.length;

      runtime.neutralGamma = clamp(
        average,
        -TILT_NEUTRAL_LIMIT,
        TILT_NEUTRAL_LIMIT
      );
      runtime.tiltSamples = [];
      runtime.smoothedTilt = 0;
    }

    const relative = clamp(gamma - runtime.neutralGamma, -25, 25);
    runtime.smoothedTilt = runtime.smoothedTilt * 0.85 + relative * 0.15;
    const travel = Math.max(0, runtime.width / 2 - runtime.petRadius);
    setCatcherX(
      runtime,
      runtime.width / 2 + (runtime.smoothedTilt / 25) * travel,
      runtime.smoothedTilt * 0.5
    );
  }

  function playPegTone(runtime, now) {
    const context = runtime.audioContext;
    if (!context || context.state === "closed" || now - runtime.lastPegSoundAt < 55) return;

    let noteIndex = Math.floor(Math.random() * PEG_NOTE_FREQUENCIES.length);
    if (noteIndex === runtime.lastPegNoteIndex) {
      noteIndex = (noteIndex + 1 + Math.floor(Math.random() * (PEG_NOTE_FREQUENCIES.length - 1))) % PEG_NOTE_FREQUENCIES.length;
    }
    runtime.lastPegNoteIndex = noteIndex;
    runtime.lastPegSoundAt = now;

    try {
      if (context.state === "suspended") context.resume?.().catch?.(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(PEG_NOTE_FREQUENCIES[noteIndex], startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.042, startAt + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.105);
    } catch (err) { }
  }

  function playStarSound(runtime) {
    const context = runtime.audioContext;

    if (context && context.state !== "closed" && preparedStarBuffer) {
      try {
        if (context.state === "suspended") context.resume?.().catch?.(() => {});
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = preparedStarBuffer;
        gain.gain.setValueAtTime(0.78, context.currentTime);
        source.connect(gain);
        gain.connect(context.destination);
        source.start();
        return;
      } catch (err) { }
    }

    if (!runtime.starAudio) return;
    try {
      runtime.starAudio.currentTime = 0;
      runtime.starAudio.play().catch?.(() => {});
    } catch (err) { }
  }

  function createStarBurst(runtime, peg, now) {
    const colors = ["#ffc751", "#ffffff", "#ff5a51", "#78ad4f", "#46aef0", "#7f66c6"];
    const particles = [];
    for (let index = 0; index < 28; index += 1) {
      particles.push({
        angle: (Math.PI * 2 * index / 28) + (Math.random() - 0.5) * 0.18,
        distance: runtime.pegRadius * (2.1 + Math.random() * 2.6),
        size: 2.5 + Math.random() * 5,
        color: colors[index % colors.length],
        sparkle: index % 4 === 0
      });
    }
    runtime.bursts.push({ x: peg.x, y: peg.y, startedAt: now, duration: 780, particles });
  }

  function chooseBonusBall(runtime) {
    const choices = SOLID_BALLS.filter((config) => config.id !== runtime.lastSpawnedColor);
    return randomFrom(choices) || randomFrom(SOLID_BALLS);
  }

  function queueBonusBalls(runtime, now) {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let index = 0; index < count; index += 1) {
      runtime.pendingBonus.push({
        at: now + 160 + index * 190,
        config: chooseBonusBall(runtime)
      });
    }
  }

  function triggerStarPeg(runtime, peg, now) {
    if (!runtime.starActive || !peg?.isStar) return;
    runtime.starActive = false;
    peg.isStar = false;
    createStarBurst(runtime, peg, now);
    playStarSound(runtime);
    queueBonusBalls(runtime, now);
  }

  function spawnBall(runtime, config, now, { bonus = false } = {}) {
    if (!config) return;
    const radius = runtime.pegRadius * 0.66;
    const padding = Math.max(radius * 2.4, runtime.width * 0.06);
    const x = padding + Math.random() * Math.max(1, runtime.width - padding * 2);
    runtime.balls.push({
      id: runtime.nextBallId++,
      config,
      x,
      y: -radius - Math.random() * radius,
      vx: (Math.random() - 0.5) * runtime.width * 0.055,
      vy: runtime.height * (0.018 + Math.random() * 0.012),
      radius,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 2.1,
      points: config.points || 1,
      bonus,
      bornAt: now,
      trail: [],
      lastTrailAt: 0
    });
    runtime.lastSpawnedColor = config.id;
  }

  function processSpawns(runtime, now) {
    while (runtime.pendingBonus.length && runtime.pendingBonus[0].at <= now) {
      const bonus = runtime.pendingBonus.shift();
      spawnBall(runtime, bonus.config, now, { bonus: true });
    }
    if (runtime.scheduledIndex >= runtime.scheduled.length || now < runtime.nextScheduledAt) return;
    spawnBall(runtime, runtime.scheduled[runtime.scheduledIndex], now);
    runtime.scheduledIndex += 1;
    if (runtime.scheduledIndex < runtime.scheduled.length) {
      runtime.nextScheduledAt = now + 4000 + Math.random() * 1000;
    }
  }

  function addTrailPoint(ball, now) {
    if (now - ball.lastTrailAt < 42) return;
    ball.lastTrailAt = now;
    ball.trail.push({ x: ball.x, y: ball.y, bornAt: now });
    if (ball.trail.length > 12) ball.trail.shift();
  }

  function collideBallWithWalls(runtime, ball) {
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.72;
      ball.angularVelocity += 0.75;
    } else if (ball.x + ball.radius > runtime.width) {
      ball.x = runtime.width - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.72;
      ball.angularVelocity -= 0.75;
    }
  }

  function collideBallWithPeg(runtime, ball, peg, now) {
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const minDistance = ball.radius + peg.radius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minDistance * minDistance) return;

    const distance = Math.sqrt(distanceSquared) || 0.001;
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minDistance - distance;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const velocityAlongNormal = ball.vx * nx + ball.vy * ny;
    if (velocityAlongNormal >= 0) return;

    if (peg.isStar && runtime.starActive) triggerStarPeg(runtime, peg, now);
    else playPegTone(runtime, now);

    const impulse = (1 + 0.68) * velocityAlongNormal;
    ball.vx -= impulse * nx;
    ball.vy -= impulse * ny;
    ball.vx += nx * (Math.random() - 0.5) * 7;

    const tangentSpeed = -ny * ball.vx + nx * ball.vy;
    ball.angularVelocity += tangentSpeed / Math.max(1, ball.radius) * 0.34;
    ball.angularVelocity = clamp(ball.angularVelocity, -7, 7);
  }

  function collideBalls(runtime) {
    const balls = runtime.balls;
    for (let aIndex = 0; aIndex < balls.length; aIndex += 1) {
      const a = balls[aIndex];
      for (let bIndex = aIndex + 1; bIndex < balls.length; bIndex += 1) {
        const b = balls[bIndex];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDistance = a.radius + b.radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= minDistance * minDistance) continue;

        const distance = Math.sqrt(distanceSquared) || 0.001;
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = (minDistance - distance) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative >= 0) continue;
        const impulse = -relative * 0.82;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        a.angularVelocity -= relative * 0.012;
        b.angularVelocity += relative * 0.012;
      }
    }
  }

  function updateScoreBadge(runtime) {
    if (!runtime.scoreEl) return;
    runtime.scoreEl.textContent = String(runtime.score);
    const badge = runtime.scoreEl.closest(".daily-feed-score-badge");
    if (!badge) return;
    badge.classList.remove("is-bumped");
    void badge.offsetWidth;
    badge.classList.add("is-bumped");
  }

  function catchBall(runtime, ball) {
    runtime.score += ball.points;
    runtime.caughtCount += 1;
    updateScoreBadge(runtime);
    runtime.catcher.classList.remove("is-catching");
    void runtime.catcher.offsetWidth;
    runtime.catcher.classList.add("is-catching");
  }

  function updateBall(runtime, ball, dt, now) {
    addTrailPoint(ball, now);
    ball.vy = Math.min(runtime.height * 0.46, ball.vy + runtime.gravity * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.rotation += ball.angularVelocity * dt;
    ball.angularVelocity = ball.angularVelocity * 0.997 + (ball.vx / Math.max(1, ball.radius)) * 0.003;
    collideBallWithWalls(runtime, ball);
    for (const peg of runtime.pegs) collideBallWithPeg(runtime, ball, peg, now);
    ball.vx = clamp(ball.vx, -runtime.width * 0.44, runtime.width * 0.44);
    ball.vy = clamp(ball.vy, -runtime.height * 0.26, runtime.height * 0.46);
  }

  function ballTouchesPet(runtime, ball) {
    const dx = ball.x - runtime.catcherX;
    const dy = ball.y - runtime.petCenterY;
    const minDistance = ball.radius + runtime.petRadius;
    return dx * dx + dy * dy <= minDistance * minDistance;
  }

  function updateBalls(runtime, dt, now) {
    for (const ball of runtime.balls) updateBall(runtime, ball, dt, now);
    collideBalls(runtime);
    runtime.balls = runtime.balls.filter((ball) => {
      if (ballTouchesPet(runtime, ball)) {
        catchBall(runtime, ball);
        return false;
      }
      if (ball.y - ball.radius > runtime.height + 20) return false;
      if (now - ball.bornAt > 22000) return false;
      return true;
    });
  }

  function drawTrail(runtime, ball, now) {
    const ctx = runtime.ctx;
    const colors = ball.config.trailColors || [ball.config.color];
    ball.trail = ball.trail.filter((point) => now - point.bornAt < 520);
    ball.trail.forEach((point, index) => {
      const progress = (now - point.bornAt) / 520;
      const alpha = (1 - progress) * 0.72;
      const size = ball.radius * (0.18 + (1 - progress) * 0.34);
      const color = colors[index % colors.length];
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 1.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPeg(runtime, peg) {
    const ctx = runtime.ctx;
    if (peg.isStar && runtime.starImage?.complete && runtime.starImage.naturalWidth) {
      const size = peg.radius * 2.25;
      ctx.drawImage(runtime.starImage, peg.x - size / 2, peg.y - size / 2, size, size);
      return;
    }
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(runtime, ball) {
    const ctx = runtime.ctx;
    const image = runtime.ballImages[ball.config.id];
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    ctx.shadowColor = "rgba(255, 255, 255, 0.96)";
    ctx.shadowBlur = ball.radius * 1.25;
    if (image?.complete && image.naturalWidth) {
      const size = ball.radius * 2;
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = ball.config.color;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBurst(runtime, burst, now) {
    const ctx = runtime.ctx;
    const progress = clamp((now - burst.startedAt) / burst.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = "#ffc751";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, runtime.pegRadius * (0.8 + eased * 3.2), 0, Math.PI * 2);
    ctx.stroke();

    for (const particle of burst.particles) {
      const distance = particle.distance * eased;
      const x = burst.x + Math.cos(particle.angle) * distance;
      const y = burst.y + Math.sin(particle.angle) * distance;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 1.4;
      if (particle.sparkle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(particle.angle + progress * Math.PI);
        ctx.fillRect(-particle.size / 2, -particle.size * 1.6, particle.size, particle.size * 3.2);
        ctx.fillRect(-particle.size * 1.6, -particle.size / 2, particle.size * 3.2, particle.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw(runtime, now) {
    const ctx = runtime.ctx;
    ctx.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0);
    ctx.clearRect(0, 0, runtime.width, runtime.height);
    for (const ball of runtime.balls) drawTrail(runtime, ball, now);
    for (const peg of runtime.pegs) drawPeg(runtime, peg);
    runtime.bursts = runtime.bursts.filter((burst) => now - burst.startedAt < burst.duration);
    for (const burst of runtime.bursts) drawBurst(runtime, burst, now);
    for (const ball of runtime.balls) drawBall(runtime, ball);
  }

  function maybeFinish(runtime, now) {
    const allScheduledBallsSpawned =
      runtime.scheduledIndex >= runtime.scheduled.length;
    const allBonusBallsSpawned =
      runtime.pendingBonus.length === 0;
    const noActiveBalls =
      runtime.balls.length === 0;

    const complete =
      allScheduledBallsSpawned &&
      allBonusBallsSpawned &&
      noActiveBalls;

    if (!complete) {
      runtime.finishAt = 0;
      return false;
    }
    if (!runtime.finishAt) {
      runtime.finishAt = now + 900;
      return false;
    }
    return now >= runtime.finishAt;
  }

  function complete(runtime) {
    if (activeRuntime !== runtime) return;
    const result = { score: runtime.score, caughtCount: runtime.caughtCount };
    const onComplete = runtime.onComplete;
    stop();
    onComplete?.(result);
  }

  function runFrame(runtime, now) {
    if (!runtime.running || activeRuntime !== runtime) return;
    const dt = clamp((now - runtime.lastFrameAt) / 1000, 0.001, 0.032);
    runtime.lastFrameAt = now;
    processSpawns(runtime, now);
    const step = dt / 2;
    updateBalls(runtime, step, now);
    updateBalls(runtime, step, now);
    runtime.petTilt *= 0.88;
    runtime.petCircle.style.setProperty("--daily-feed-pet-tilt", `${runtime.petTilt}deg`);
    draw(runtime, now);
    if (maybeFinish(runtime, now)) {
      complete(runtime);
      return;
    }
    runtime.rafId = requestAnimationFrame((nextNow) => runFrame(runtime, nextNow));
  }

  function start(rootEl, { session, onComplete } = {}) {
    const savedAudio = preparedAudioContext;
    preparedAudioContext = null;
    stop();
    preparedAudioContext = savedAudio;

    if (!rootEl || !session) return null;
    const stage = rootEl.querySelector("[data-daily-feed-stage]");
    const canvas = rootEl.querySelector("[data-daily-feed-canvas]");
    const catcher = rootEl.querySelector("[data-daily-feed-catcher]");
    const petCircle = rootEl.querySelector("[data-daily-feed-pet-circle]");
    const scoreEl = rootEl.querySelector("[data-daily-feed-score]");
    if (!stage || !canvas || !catcher || !petCircle) return null;

    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width < 120 || height < 260) {
      requestAnimationFrame(() => {
        if (rootEl.isConnected) start(rootEl, { session, onComplete });
      });
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const field = createPegField(width, height);
    const images = buildImageMap();

    catcher.style.setProperty(
      "--daily-feed-pet-size",
      `${field.pegRadius * 4}px`
    );

    const stageRect = stage.getBoundingClientRect();
    const petRect = petCircle.getBoundingClientRect();
    const audioContext = preparedAudioContext;
    preparedAudioContext = null;
    const starAudio = new Audio(`${ASSET_BASE}dq_feed_star.mp3`);
    starAudio.preload = "auto";
    starAudio.volume = 0.82;
    const now = performance.now();

    const runtime = {
      running: true,
      rafId: 0,
      lastFrameAt: now,
      width,
      height,
      dpr,
      ctx,
      stage,
      canvas,
      catcher,
      petCircle,
      scoreEl,
      catcherX: width / 2,
      petRadius: petRect.width / 2,
      petCenterY: (petRect.top - stageRect.top) + petRect.height / 2,
      petTilt: 0,
      dragging: false,
      activePointerId: null,
      tiltEnabled: session.rewardTiltEnabled === true,
      neutralGamma: null,
      smoothedTilt: 0,
      tiltSamples: [],
      tiltCalibrationUntil: 0,
      orientationHandler: null,
      pointerDownHandler: null,
      pointerMoveHandler: null,
      pointerEndHandler: null,
      pegs: field.pegs,
      pegRadius: field.pegRadius,
      starActive: !!field.starPeg,
      starImage: images.star,
      ballImages: images.balls,
      balls: [],
      nextBallId: 1,
      scheduled: buildScheduledBalls(),
      scheduledIndex: 0,
      nextScheduledAt:
        now +
        (
          session.rewardTiltEnabled === true
            ? TILT_CALIBRATION_MS + 300
            : 650
        ),
      pendingBonus: [],
      lastSpawnedColor: "",
      bursts: [],
      gravity: height * 0.31,
      score: 0,
      caughtCount: 0,
      lastPegNoteIndex: -1,
      lastPegSoundAt: 0,
      audioContext: audioContext || prepareAudio(),
      starAudio,
      finishAt: 0,
      onComplete
    };

    activeRuntime = runtime;
    stage.style.backgroundImage = `url("${chooseBackground(width, height)}")`;
    setCatcherX(runtime, width / 2, 0);

    if (runtime.tiltEnabled) {
      beginTiltCalibration(runtime);
      runtime.orientationHandler = (event) => handleTilt(runtime, event);
      window.addEventListener("deviceorientation", runtime.orientationHandler);
    }

    const moveCatcher = (event) => {
      const rect = stage.getBoundingClientRect();
      setCatcherX(runtime, event.clientX - rect.left);
    };

    runtime.pointerDownHandler = (event) => {
      if (activeRuntime !== runtime) return;
      event.preventDefault();
      runtime.dragging = true;
      runtime.activePointerId = event.pointerId;
      try { stage.setPointerCapture(event.pointerId); } catch (err) { }
      moveCatcher(event);
    };
    runtime.pointerMoveHandler = (event) => {
      if (!runtime.dragging || activeRuntime !== runtime) return;
      event.preventDefault();
      moveCatcher(event);
    };
    runtime.pointerEndHandler = (event) => {
      if (activeRuntime !== runtime) return;
      runtime.dragging = false;
      runtime.activePointerId = null;
      if (runtime.tiltEnabled) {
        runtime.smoothedTilt = 0;
      }
      try { stage.releasePointerCapture(event.pointerId); } catch (err) { }
    };

    stage.addEventListener("pointerdown", runtime.pointerDownHandler);
    stage.addEventListener("pointermove", runtime.pointerMoveHandler);
    stage.addEventListener("pointerup", runtime.pointerEndHandler);
    stage.addEventListener("pointercancel", runtime.pointerEndHandler);
    draw(runtime, now);
    runtime.rafId = requestAnimationFrame((frameNow) => runFrame(runtime, frameNow));
    return runtime;
  }

  function getResultCopy(score, caughtCount, petName) {
    const safeScore = Math.max(0, Number(score) || 0);
    const safeCaught = Math.max(0, Number(caughtCount) || 0);
    const cleanPetName = String(petName || "Your BibloPet").trim() || "Your BibloPet";

    if (safeScore >= 15) {
      return {
        chomp: "CHOMP!",
        title: "Amazing feast!",
        message: `${cleanPetName} caught a huge pile of snacks!`
      };
    }

    if (safeScore >= 12) {
      return {
        chomp: "CHOMP!",
        title: "Snack superstar!",
        message: `${cleanPetName} is one happy BibloPet!`
      };
    }

    if (safeScore >= 8) {
      return {
        chomp: "CHOMP!",
        title: "Great catching!",
        message: `${cleanPetName} had a really good snack!`
      };
    }

    if (safeScore >= 4) {
      return {
        chomp: "CHOMP!",
        title: "Nice feeding!",
        message: `${cleanPetName} loved those tasty catches!`
      };
    }

    return {
      chomp: safeCaught > 0 ? "CHOMP!" : "ALL DONE!",
      title: "Good try!",
      message: `${cleanPetName} had fun chasing the snacks!`
    };
  }

  window.BibloZooDailyFeedGame = Object.freeze({
    version: 1,
    prepareAudio,
    render,
    start,
    stop,
    getResultCopy
  });
})();
