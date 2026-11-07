/* N4a — Native-only Classic and Melody Feeding in isolated iOS Audio Test.
 * Got It!/Resume prepares mode-specific fixed AVAudioEngine PCM buffers:
 * Classic star/chomp/peg; Melody only its prewarmed triangle-note bank.
 * No Web fallback, automatic playback, or "accepted means audible" claim. */
(function installFeedingNativeAudioPilot(root) {
  "use strict";

  const IDS = Object.freeze(["feed-star", "feed-chomp", "feed-peg"]);
  const MELODY_IDS = Object.freeze(["feed-melody"]);
  const PEG_NOTE_COUNT = 6;
  const MELODY_MIDI_MIN = 55;
  const MELODY_MIDI_MAX = 83;
  const PREFLIGHT_TIMEOUT_MS = 1500;
  const PLAY_TIMEOUT_MS = 1800;

  function isIOS() {
    try {
      return root.Capacitor?.isNativePlatform?.() === true &&
        root.Capacitor?.getPlatform?.() === "ios";
    } catch (_) { return false; }
  }

  function bridge() {
    return root.Capacitor?.Plugins?.BibloZooNativeSound;
  }

  function bounded(promise, ms) {
    let timeout;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timeout = root.setTimeout(() => reject(new Error("timeout")), ms);
      })
    ]).finally(() => root.clearTimeout(timeout));
  }

  function safeReason(value) {
    return typeof value === "string" && /^[a-z][a-z0-9-]{0,55}$/.test(value)
      ? value : "bridge-error";
  }

  function create({ isCurrent, onFailure, mode = "classic" } = {}) {
    // Only these two audited native sound profiles exist in N4a.
    // Browser/PWA/Android never create this native controller.
    if (!isIOS() || !["classic", "melody"].includes(mode)) return null;
    const selectedIds = mode === "melody" ? MELODY_IDS : IDS;

    let generation = 0;
    let ready = false;
    let failed = false;
    let failureNotified = false;
    let nextSoundEventId = 0;

    function current(token) {
      return generation === token && typeof isCurrent === "function" &&
        isCurrent() === true && !root.document?.hidden;
    }

    function stopNative() {
      const api = bridge();
      if (typeof api?.stop !== "function") return;
      for (const soundId of selectedIds) {
        try {
          Promise.resolve(api.stop({ soundId })).catch(() => {});
        } catch (_) { /* stop is always best effort; never block navigation */ }
      }
    }

    function stop() {
      generation += 1;
      ready = false;
      failed = false;
      failureNotified = false;
      stopNative();
    }

    function markFailed(reason) {
      if (failed) return;
      ready = false;
      failed = true;
      // No silent switch to web during an active round: the preview keeps
      // its chosen native backend, with missing effects and a visible warning.
      stopNative();
      if (!failureNotified) {
        failureNotified = true;
        try { onFailure?.(safeReason(reason)); } catch (_) { }
      }
    }

    async function prepare() {
      const token = ++generation;
      ready = false;
      failed = false;
      failureNotified = false;
      if (!current(token)) return { ready: false, reason: "stale" };
      const api = bridge();
      if (typeof api?.activateFromGesture !== "function" ||
          typeof api?.preload !== "function" ||
          typeof api?.play !== "function" ||
          typeof api?.stop !== "function") {
        return { ready: false, reason: "missing-bridge" };
      }
      let session;
      try {
        // Called directly as part of the user-tapped Got It!/Resume
        // sequence. The Swift coordinator decides whether native session
        // activation is needed; no Web Audio clock or fallback is consulted.
        session = await bounded(
          api.activateFromGesture({ purpose: "feeding" }), PREFLIGHT_TIMEOUT_MS);
      } catch (_) {
        if (current(token)) stop();
        return { ready: false, reason: "native-session-timeout-or-error" };
      }
      if (!current(token)) {
        stopNative();
        return { ready: false, reason: "stale" };
      }
      if (session?.ready !== true) {
        const reason = safeReason(session?.reason);
        stop();
        return { ready: false, reason };
      }
      for (const soundId of selectedIds) {
        let result;
        try {
          // The bridge is fixed-ID only; no caller-controlled file names.
          result = await bounded(api.preload({ soundId }), PREFLIGHT_TIMEOUT_MS);
        } catch (_) {
          if (current(token)) stop();
          return { ready: false, reason: "prepare-timeout-or-error" };
        }
        if (!current(token)) {
          // A delayed preload can prepare an asset but must never trigger play.
          stopNative();
          return { ready: false, reason: "stale" };
        }
        if (result?.prepared !== true) {
          const reason = safeReason(result?.reason);
          stop();
          return { ready: false, reason };
        }
      }
      if (!current(token)) {
        stopNative();
        return { ready: false, reason: "stale" };
      }
      ready = true;
      return { ready: true, reason: "prepared" };
    }

    function play(soundId, volume, collisionEpochMs, noteIndex) {
      if (!selectedIds.includes(soundId) || !Number.isFinite(volume) ||
          volume < 0 || volume > 1 || !ready || failed) return false;
      if (soundId === "feed-peg" &&
          (!Number.isInteger(noteIndex) ||
           noteIndex < 0 || noteIndex >= PEG_NOTE_COUNT)) return false;
      if (soundId === "feed-melody" &&
          (!Number.isInteger(noteIndex) || noteIndex < MELODY_MIDI_MIN ||
           noteIndex > MELODY_MIDI_MAX)) return false;
      const token = generation;
      if (!current(token)) return false;
      const api = bridge();
      if (typeof api?.play !== "function") {
        markFailed("missing-bridge");
        return false;
      }
      try {
        // Cheap event metadata only: no await, layout read or extra bridge
        // call on the actual physics collision frame. Native records the
        // worker and AVAudioPlayer.play() dispatch times independently.
        const eventId = "feed-" + (++nextSoundEventId);
        const requestEpochMs = Date.now();
        const validCollision = Number.isFinite(collisionEpochMs) &&
          collisionEpochMs > 0 && collisionEpochMs <= requestEpochMs;
        const timing = validCollision ? { collisionEpochMs } : {};
        // The note number is a closed 0–5 mapping to Swift's fixed six
        // frequencies. No user-supplied oscillator/asset is ever accepted.
        const note = soundId === "feed-peg" ? { noteIndex } :
          soundId === "feed-melody" ? { midi: noteIndex } : {};
        // Fire exactly once. Never queue a Web/HTML fallback.
        void bounded(api.play({
          soundId, volume, eventId, requestEpochMs, ...timing, ...note
        }), PLAY_TIMEOUT_MS).then(
          result => {
            if (!current(token)) return;
            if (result?.accepted !== true) {
              markFailed(safeReason(result?.reason));
            }
          },
          () => { if (current(token)) markFailed("play-timeout-or-error"); }
        );
        return true; // dispatched, NOT necessarily audible
      } catch (_) {
        markFailed("play-bridge-error");
        return false;
      }
    }

    return Object.freeze({
      prepare,
      play,
      stop,
      isReady: () => ready && !failed && current(generation),
      hasFailed: () => failed
    });
  }

  root.BibloZooFeedingNativeAudioPilot = Object.freeze({
    isIOS,
    create,
    soundIds: IDS
  });
})(window);
