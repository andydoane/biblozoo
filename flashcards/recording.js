(() => {
  "use strict";

  // Audio stays in this closure. Never include it in profile data or backups.
  window.BibloZooRecording = Object.freeze({ create });

  function create({ onChange, onInterrupted }) {
    let generation = 0;
    let status = "idle";
    let stream = null;
    let recorder = null;
    let chunks = [];
    let player = null;
    let url = "";
    let stopTimer = null;
    let limitTimer = null;
    let recordingDeadline = 0;
    let message = "";
    let playbackComplete = false;
    let playbackFailed = false;
    let meterContext = null;
    let meterSource = null;
    let analyser = null;
    let samples = null;

    function closeMeter() {
      try { meterSource?.disconnect(); } catch (_) {}
      try { analyser?.disconnect(); } catch (_) {}
      const context = meterContext;
      meterContext = meterSource = analyser = samples = null;
      if (context) void context.close().catch(() => {});
    }

    function prepareMeter() {
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        meterContext = new Context();
        // Called from the Record/Re-record gesture for iOS audio activation.
        void meterContext.resume().catch(() => {});
      } catch (_) { closeMeter(); }
    }

    function connectMeter() {
      try {
        if (!meterContext) return;
        analyser = meterContext.createAnalyser();
        analyser.fftSize = 256;
        samples = new Uint8Array(analyser.fftSize);
        meterSource = meterContext.createMediaStreamSource(stream);
        meterSource.connect(analyser);
        // Never connect the microphone to the speakers.
      } catch (_) { closeMeter(); }
    }

    function readLevel() {
      if (status !== "recording" || meterContext?.state !== "running" || !analyser) return null;
      try {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / samples.length);
        return Math.max(0, Math.min(1, (20 * Math.log10(Math.max(rms, 0.00001)) + 55) / 55));
      } catch (_) { closeMeter(); return null; }
    }
    const notify = () => onChange?.();
    const stopTracks = (value) => value?.getTracks().forEach((track) => track.stop());

    function dispose() {
      playbackComplete = false;
      playbackFailed = false;
      clearTimeout(limitTimer);
      limitTimer = null;
      recordingDeadline = 0;
      generation += 1;
      closeMeter();
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
      prepareMeter();
      status = "requesting";
      notify();
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
          throw new Error("Recording unavailable");
        }
        const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          const blob = new Blob(chunks, { type: activeRecorder.mimeType || chunks[0]?.type || "" });
          chunks = [];
          if (!blob.size) { interrupt(); return; }
          url = URL.createObjectURL(blob);
          player = new Audio(url);
          player.onended = () => {
            if (current !== generation) return;
            playbackComplete = true;
            playbackFailed = false;
            message = "";
            status = "ready";
            notify();
          };
          player.onerror = () => {
            if (current !== generation) return;
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
        const requestedLimit = getLimitMs();
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 120000;
        recordingDeadline = performance.now() + limit;
        limitTimer = setTimeout(() => {
          if (current === generation) stop();
        }, limit);
        notify();
        return "recording";
      } catch (_) {
        if (current !== generation) return "cancelled";
        dispose();
        notify();
        return "failed";
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
      const current = generation;
      const audio = player;
      playbackFailed = false;
      message = "";
      status = "loading";
      notify();
      try {
        audio.currentTime = 0;
        await audio.play();
        if (current !== generation || status !== "loading") { audio.pause(); return; }
        status = "playing";
      } catch (_) {
        if (current !== generation) return;
        status = "ready";
        message = "Playback couldn't start. Tap Play to try again.";
        playbackFailed = true;
      }
      notify();
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) return;
      if (["requesting", "preparing", "recording", "stopping"].includes(status)) interrupt();
      else pause();
    });
    window.addEventListener("pagehide", () => {
      if (status !== "idle" || url) interrupt();
    });

    return Object.freeze({
      start, stop, play, pause, dispose, readLevel,
      snapshot: () => ({ status, hasRecording: !!url, message, playbackComplete, playbackFailed,
        remainingSeconds: status === "recording" ? Math.max(0, Math.ceil((recordingDeadline - performance.now()) / 1000)) : null })
    });
  }
})();
