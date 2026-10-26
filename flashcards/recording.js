(() => {
  "use strict";

  // Audio stays in this closure. Never include it in profile data or backups.
  window.BibloZooRecording = Object.freeze({ create });

  function isPermissionDeniedError(error) {
    const name = String(error?.name || "");
    return [
      "NotAllowedError",
      "PermissionDeniedError",
      "SecurityError"
    ].includes(name);
  }

  function create({ onChange, onInterrupted }) {
    let generation = 0;
    let status = "idle";
    let stream = null;
    let recorder = null;
    let chunks = [];
    let blob = null;
    let player = null;
    let url = "";
    let stopTimer = null;
    let limitTimer = null;
    let recordingDeadline = 0;
    let message = "";
    let playbackComplete = false;
    let playbackFailed = false;
    let playbackRequest = 0;
    let meterContext = null;
    let meterSource = null;
    let meterSink = null;
    let analyser = null;
    let samples = null;
    let meterResumeAttempts = 0;
    let meterResumePending = false;
    let meterActivationToken = 0;
    let meterResumeTimeout = null;
    let meterRetryTimer = null;
    let meterReconnectTimer = null;
    let meterReconnectAttempts = 0;
    const METER_MAX_RESUME_ATTEMPTS = 4;
    const METER_STALL_MS = 900;
    let meterClockAt = null;
    let meterClockWallAt = 0;

    function log(type, details = {}) {
      try { window.BibloZooAudioDiagnostics?.record(type, details); } catch (_) {}
    }

    function meterMayRun() {
      return !document.hidden &&
        ["requesting", "preparing", "recording"].includes(status);
    }

    function closeMeter() {
      // Invalidate old resume promises and reconnect timers before closing.
      meterActivationToken += 1;
      meterClockAt = null;
      meterClockWallAt = 0;
      meterResumePending = false;
      clearTimeout(meterResumeTimeout);
      clearTimeout(meterRetryTimer);
      clearTimeout(meterReconnectTimer);
      meterResumeTimeout = meterRetryTimer = meterReconnectTimer = null;
      try { meterSource?.disconnect(); } catch (_) {}
      try { analyser?.disconnect(); } catch (_) {}
      try { meterSink?.disconnect(); } catch (_) {}
      const context = meterContext;
      meterContext = meterSource = meterSink = analyser = samples = null;
      if (context) {
        try { Promise.resolve(context.close()).catch(() => {}); } catch (_) {}
      }
    }

    function resumeMeter() {
      const context = meterContext;
      if (!context || !meterMayRun() || context.state === "running" ||
          context.state === "closed" || meterResumePending ||
          meterRetryTimer !== null ||
          meterResumeAttempts >= METER_MAX_RESUME_ATTEMPTS) return;

      meterResumePending = true;
      meterResumeAttempts += 1;
      const token = ++meterActivationToken;
      const finish = () => {
        if (token !== meterActivationToken || context !== meterContext ||
            !meterResumePending) return;
        clearTimeout(meterResumeTimeout);
        meterResumeTimeout = null;
        meterResumePending = false;
        if (context.state !== "running" && stream && meterMayRun() &&
            meterResumeAttempts < METER_MAX_RESUME_ATTEMPTS &&
            meterRetryTimer === null) {
          // Short, bounded recovery window; never repeatedly restart the mic.
          meterRetryTimer = setTimeout(() => {
            meterRetryTimer = null;
            resumeMeter();
          }, 450);
        }
      };

      // Invoke resume synchronously on the initial Record tap when possible.
      // iOS may reject, suspend again on microphone acquisition, or never settle.
      try {
        Promise.resolve(context.resume()).then(finish, finish);
      } catch (_) {
        finish();
      }
      if (meterResumePending) meterResumeTimeout = setTimeout(finish, 1500);
    }

    function prepareMeter() {
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        meterContext = new Context();
        resumeMeter();
      } catch (_) { closeMeter(); }
    }

    function reconnectMeterOnce() {
      if (!stream || !meterMayRun() || meterReconnectAttempts >= 1 ||
          meterReconnectTimer !== null) return;
      meterReconnectAttempts += 1;
      const current = generation;
      meterReconnectTimer = setTimeout(() => {
        meterReconnectTimer = null;
        if (current !== generation || !stream || !meterMayRun()) return;
        prepareMeter();
        connectMeter();
      }, 400);
    }

    function connectMeter() {
      try {
        if (!stream || !meterContext) {
          reconnectMeterOnce();
          return;
        }
        analyser = meterContext.createAnalyser();
        analyser.fftSize = 256;
        samples = new Uint8Array(analyser.fftSize);
        meterSource = meterContext.createMediaStreamSource(stream);
        // Safari needs the graph to be pulled by an output. A zero-gain sink
        // keeps the meter active without sending microphone sound to speakers.
        meterSink = meterContext.createGain();
        meterSink.gain.value = 0;
        meterSource.connect(analyser);
        analyser.connect(meterSink);
        meterSink.connect(meterContext.destination);
        // Recheck after getUserMedia: iOS may suspend the earlier activation.
        meterClockAt = null;
        meterClockWallAt = 0;
        resumeMeter();
      } catch (_) {
        closeMeter();
        reconnectMeterOnce();
      }
    }

    function readLevel() {
      if (status !== "recording") return null;
      if (meterContext?.state !== "running" || !analyser) {
        resumeMeter();
        return null;
      }
      try {
        // On WKWebView, a meter context may report `running` even though
        // its audio clock froze during microphone setup. Rebuild only this
        // analyser graph; never request a new microphone or restart recording.
        const clock = Number(meterContext.currentTime);
        const wall = performance.now();
        if (Number.isFinite(clock)) {
          if (meterClockAt === null || clock > meterClockAt + 0.005) {
            meterClockAt = clock;
            meterClockWallAt = wall;
          } else if (wall - meterClockWallAt >= METER_STALL_MS) {
            log("flashcards-meter-clock-stalled", { attempts: meterReconnectAttempts });
            closeMeter();
            reconnectMeterOnce();
            return null;
          }
        }
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / samples.length);
        return Math.max(0, Math.min(1, (20 * Math.log10(Math.max(rms, 0.00001)) + 55) / 55));
      } catch (_) {
        closeMeter();
        reconnectMeterOnce();
        return null;
      }
    }
    const notify = () => onChange?.();
    const stopTracks = (value) => value?.getTracks().forEach((track) => track.stop());

    function dispose() {
      playbackRequest += 1;
      stopFun();
      playbackComplete = false;
      playbackFailed = false;
      clearTimeout(limitTimer);
      limitTimer = null;
      recordingDeadline = 0;
      generation += 1;
      closeMeter();
      meterResumeAttempts = 0;
      meterReconnectAttempts = 0;
      clearTimeout(stopTimer);
      stopTimer = null;
      if (recorder) {
        recorder.ondataavailable = recorder.onstop = recorder.onerror = null;
        if (recorder.state !== "inactive") {
          try { recorder.stop(); } catch (_) { /* Already interrupted. */ }
        }
      }
      stopTracks(stream);
      stream = recorder = null;
      chunks = [];
      blob = null;
      if (player) {
        player.onended = player.onerror = null;
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
      player = null;
      if (url) URL.revokeObjectURL(url);
      url = "";
      status = "idle";
      message = "";
    }

    function interrupt() {
      dispose();
      onInterrupted?.();
    }

    async function start(onStart, beforeStart, getLimitMs = () => 120000) {
      dispose();
      const current = generation;
      let requestingMicrophonePermission = false;
      status = "requesting";
      // Start Web Audio on the user's Record gesture, not a later promise.
      prepareMeter();
      notify();
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
          throw new Error("Recording unavailable");
        }
        requestingMicrophonePermission = true;
        const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
        requestingMicrophonePermission = false;
        if (current !== generation || document.hidden) {
          stopTracks(acquired);
          if (current === generation) interrupt();
          return "cancelled";
        }
        stream = acquired;
        connectMeter();
        const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
          .find((type) => MediaRecorder.isTypeSupported?.(type));
        try {
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        } catch (_) {
          recorder = new MediaRecorder(stream);
        }
        const activeRecorder = recorder;
        recorder.ondataavailable = (event) => {
          if (current === generation && event.data?.size) chunks.push(event.data);
        };
        recorder.onerror = () => { if (current === generation) interrupt(); };
        stream.getTracks().forEach((track) => {
          track.onended = () => { if (current === generation && ["preparing", "recording"].includes(status)) interrupt(); };
        });
        recorder.onstop = () => {
          if (current !== generation) return;
          clearTimeout(limitTimer);
          limitTimer = null;
          recordingDeadline = 0;
          clearTimeout(stopTimer);
          stopTimer = null;
          closeMeter();
          stopTracks(stream);
          stream = recorder = null;
          blob = new Blob(chunks, { type: activeRecorder.mimeType || chunks[0]?.type || "" });
          chunks = [];
          if (!blob.size) { interrupt(); return; }
          url = URL.createObjectURL(blob);
          player = new Audio(url);
          player.onended = () => {
            if (current !== generation || document.hidden ||
              (status !== "playing" && status !== "loading")) return;
            playbackComplete = true;
            playbackFailed = false;
            message = "";
            status = "ready";
            notify();
          };
          player.onerror = () => {
            if (current !== generation || document.hidden) return;
            playbackFailed = true;
            status = "ready";
            message = "This recording couldn't play. You can re-record or continue.";
            notify();
          };
          status = "ready";
          notify();
        };
        // Hold the stream without capturing audio while the UI counts down.
        if (beforeStart) {
          status = "preparing";
          notify();
          const proceed = await beforeStart();
          if (current !== generation) return "cancelled";
          if (!proceed || document.hidden) {
            interrupt();
            return "cancelled";
          }
        }
        // Reveal the challenge only after the countdown, then begin capture.
        onStart();
        if (current !== generation) return "cancelled";
        recorder.start();
        status = "recording";
        // Microphone startup can change the iOS audio session a second time.
        resumeMeter();
        const requestedLimit = getLimitMs();
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 120000;
        recordingDeadline = performance.now() + limit;
        limitTimer = setTimeout(() => {
          if (current === generation) stop();
        }, limit);
        notify();
        return "recording";
      } catch (error) {
        if (current !== generation) return "cancelled";
        const permissionDenied =
          requestingMicrophonePermission &&
          isPermissionDeniedError(error);
        dispose();
        notify();
        return permissionDenied
          ? "permission-denied"
          : "failed";
      }
    }

    function stop() {
      if (status !== "recording") return;
      clearTimeout(limitTimer);
      limitTimer = null;
      recordingDeadline = 0;
      status = "stopping";
      closeMeter();
      notify();
      stopTimer = setTimeout(interrupt, 5000);
      try {
        recorder.stop();
        // Final data arrives before onstop; release the microphone immediately.
        stopTracks(stream);
      } catch (_) { interrupt(); }
    }

    function pause() {
      playbackRequest += 1; // A late play() result cannot revive paused audio.
      if (!player) return;
      player.pause();
      if (status === "playing" || status === "loading") {
        status = "ready";
        notify();
      }
    }

    async function play() {
      if (!player || status === "loading") return;
      if (status === "playing") { pause(); return; }
      stopFun();
      const current = generation;
      const request = ++playbackRequest;
      const audio = player;
      playbackFailed = false;
      message = "";
      status = "loading";
      notify();
      try {
        audio.currentTime = 0;
        await audio.play();
        // A late result from an older attempt must not pause a newer one.
        if (current !== generation || request !== playbackRequest) return;
        if (document.hidden || status !== "loading") {
          audio.pause();
          return;
        }
        status = "playing";
      } catch (_) {
        if (current !== generation || request !== playbackRequest || document.hidden) return;
        status = "ready";
        message = "Playback couldn't start. Tap Play to try again.";
        playbackFailed = true;
      }
      notify();
    }

    function stopFun() {
      return window
        .BibloZooAudioEffects
        ?.stop?.() === true;
    }

    async function playFun(preset, onStarted) {
      if (!blob?.size) return false;

      const effects =
        window.BibloZooAudioEffects;

      if (
        !effects?.isSupported?.() ||
        typeof effects.playRecordedVerse !==
          "function"
      ) {
        return false;
      }

      pause();

      try {
        return (
          await effects.playRecordedVerse(
            blob,
            preset,
            onStarted
          )
        ) === true;
      } catch (_) {
        return false;
      }
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) return;
      if (["requesting", "preparing", "recording", "stopping"].includes(status)) interrupt();
      else {
        pause();
        stopFun();
      }
    });
    window.addEventListener("pagehide", () => {
      // Pagehide can occur with a completed recording (e.g. iOS app switching).
      // Do not revoke its Blob URL unless the microphone is still active.
      if (["requesting", "preparing", "recording", "stopping"].includes(status)) {
        interrupt();
      } else {
        pause();
        stopFun();
      }
    });

    return Object.freeze({
      start, stop, play, pause, playFun, stopFun, dispose, readLevel,
      interruptCapture() {
        if (["requesting", "preparing", "recording", "stopping"].includes(status)) interrupt();
      },
      snapshot: () => ({ status, hasRecording: !!url, message, playbackComplete, playbackFailed,
        remainingSeconds: status === "recording" ? Math.max(0, Math.ceil((recordingDeadline - performance.now()) / 1000)) : null })
    });
  }
})();
