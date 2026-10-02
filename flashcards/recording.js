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
    let message = "";
    const notify = () => onChange?.();
    const stopTracks = (value) => value?.getTracks().forEach((track) => track.stop());

    function dispose() {
      generation += 1;
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

    async function start(onStart) {
      dispose();
      const current = generation;
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
          track.onended = () => { if (current === generation && status === "recording") interrupt(); };
        });
        recorder.onstop = () => {
          if (current !== generation) return;
          clearTimeout(stopTimer);
          stopTimer = null;
          stopTracks(stream);
          stream = recorder = null;
          const blob = new Blob(chunks, { type: activeRecorder.mimeType || chunks[0]?.type || "" });
          chunks = [];
          if (!blob.size) { interrupt(); return; }
          url = URL.createObjectURL(blob);
          player = new Audio(url);
          player.onended = () => {
            if (current !== generation) return;
            status = "ready";
            notify();
          };
          player.onerror = () => {
            if (current !== generation) return;
            status = "ready";
            message = "This recording couldn't play. You can re-record or continue.";
            notify();
          };
          status = "ready";
          notify();
        };
        // Render the challenge before starting capture; no permission prompt remains.
        onStart();
        if (current !== generation) return "cancelled";
        recorder.start();
        status = "recording";
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
      status = "stopping";
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
      }
      notify();
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) return;
      if (["requesting", "recording", "stopping"].includes(status)) interrupt();
      else pause();
    });
    window.addEventListener("pagehide", () => {
      if (status !== "idle" || url) interrupt();
    });

    return Object.freeze({
      start, stop, play, dispose,
      snapshot: () => ({ status, hasRecording: !!url, message })
    });
  }
})();
