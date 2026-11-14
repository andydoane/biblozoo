/* Flashcards instruction narration. One fixed file per instruction screen,
 * separate from the child's native RAM-only capture and replay.
 * Native Audio Test uses the existing allowlisted AVFoundation narration path;
 * browser/PWA keeps ordinary HTML media. Neither uses a timer as an "ended" event.
 */
(function installFlashcardsInstructions(root) {
  "use strict";

  const SOURCES = Object.freeze({
    really_well: Object.freeze({
      id: "flashcard-instruction-no-help",
      file: "flashcard_instruction_no_help.mp3"
    }),
    pretty_good: Object.freeze({
      id: "flashcard-instruction-first-letter",
      file: "flashcard_instruction_first_letter.mp3"
    }),
    still_learning: Object.freeze({
      id: "flashcard-instruction-pictures",
      file: "flashcard_instruction_pictures.mp3"
    }),
    recording_intro: Object.freeze({
      id: "flashcard-instruction-record",
      file: "flashcard_instruction_record.mp3"
    }),
    comparison: Object.freeze({
      id: "flashcard-instruction-listen",
      file: "flashcard_instruction_listen.mp3"
    })
  });
  const MAX_WAIT_MS = 20000;

  function sourceFor(view, difficulty) {
    return view === "difficulty_intro"
      ? SOURCES[difficulty] || null
      : SOURCES[view] || null;
  }

  function create({ onChange, onError, isMuted } = {}) {
    let current = null;
    let serial = 0;
    const nativeOnly = () =>
      root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.getPlatform?.() === "ios";
    const tracks = () => root.BibloZooNativeLearnTracks;

    function still(a) {
      return current === a && !a.cancelled && a.token === serial;
    }
    function cleanup(a) {
      if (a.timer != null) root.clearTimeout(a.timer);
      a.timer = null;
      if (a.audio) {
        a.audio.pause();
        a.audio.removeAttribute("src");
        a.audio.load();
        a.audio = null;
      }
    }
    function stop() {
      const a = current;
      current = null;
      ++serial;
      if (!a) return;
      a.cancelled = true;
      cleanup(a);
      if (a.nativeStarted) tracks()?.stop?.();
    }
    function change(a, status, attempt) {
      if (!still(a) || a.status !== "playing" ||
          a.attempt !== attempt) return;
      a.status = status;
      cleanup(a);
      if (status === "failed") {
        onError?.("Instructions couldn't play. Tap Try Instructions Again.");
      }
      onChange?.();
    }
    function start(a) {
      const attempt = ++a.attempt;
      if (!still(a) || root.document?.hidden) {
        change(a, "failed", attempt);
        return;
      }
      if (isMuted?.()) {
        // A deliberately muted session does not make the child wait for silence.
        change(a, "done", attempt);
        return;
      }
      a.timer = root.setTimeout(() => {
        if (!still(a) || a.status !== "playing" ||
            a.attempt !== attempt) return;
        if (a.nativeStarted) tracks()?.stop?.();
        change(a, "failed", attempt);
      }, MAX_WAIT_MS);

      if (nativeOnly()) {
        const player = tracks();
        if (!player?.isAvailable?.()) {
          change(a, "failed", attempt);
          return;
        }
        a.nativeStarted = true;
        Promise.resolve(player.play(a.source.id))
          .then(result => change(a, result?.ended === true ? "done" : "failed", attempt))
          .catch(() => change(a, "failed", attempt));
      } else {
        const audio = new root.Audio("flashcards/" + a.source.file);
        a.audio = audio;
        audio.preload = "auto";
        audio.addEventListener("ended", () => change(a, "done", attempt), { once: true });
        audio.addEventListener("error", () => change(a, "failed", attempt), { once: true });
        try {
          Promise.resolve(audio.play()).catch(() => change(a, "failed", attempt));
        } catch (_) { change(a, "failed", attempt); }
      }
    }
    function sync(view, difficulty, verseId) {
      const source = sourceFor(view, difficulty);
      if (!source) {
        stop();
        return { locked: false, failed: false };
      }
      const key = [view, difficulty, verseId].join(":");
      if (!current || current.key !== key) {
        stop();
        const a = {
          key, source, status: "playing", cancelled: false,
          token: serial, timer: null, audio: null, nativeStarted: false,
          attempt: 0
        };
        current = a;
        root.requestAnimationFrame(() => start(a));
      }
      return snapshot();
    }
    function snapshot() {
      return {
        locked: !!current && current.status !== "done",
        failed: current?.status === "failed",
        status: current?.status || "idle",
        soundId: current?.source.id || null
      };
    }
    // Only a real next/retry/selection tap is permitted to claim iOS priority.
    function primeFromGesture() {
      if (nativeOnly()) tracks()?.primeFromGesture?.();
    }
    function retryFromGesture() {
      if (!current || current.status !== "failed") return;
      primeFromGesture();
      const a = current;
      a.attempt += 1; // revoke an earlier failed attempt's late promise
      a.status = "playing";
      onChange?.();
      // Browser autoplay restrictions require the retry's media.play() to
      // execute in this real click task, not a later animation frame.
      // Native activation was already claimed on this same user gesture.
      if (nativeOnly()) root.requestAnimationFrame(() => start(a));
      else start(a);
    }
    // Never replay narration automatically on a task switch/return.
    function interrupt() {
      if (!current || current.status !== "playing") return;
      const a = current;
      a.attempt += 1;
      a.status = "failed";
      cleanup(a);
      if (a.nativeStarted) tracks()?.stop?.();
      a.nativeStarted = false;
      onChange?.();
    }
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document.hidden) interrupt();
    });
    root.addEventListener?.("pagehide", interrupt);
    root.addEventListener?.("blur", interrupt);

    return Object.freeze({
      sourceFor, sync, snapshot, stop, primeFromGesture,
      retryFromGesture, interrupt
    });
  }
  root.BibloZooFlashcardsInstructions = Object.freeze({ sourceFor, create });
})(window);
