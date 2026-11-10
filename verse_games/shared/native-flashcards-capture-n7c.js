/* N7c: experimental native-only Flashcards recorder facade.
 * Original ios-prep MediaRecorder remains literally unchanged on Web/Android.
 * Capture lives as bounded mono PCM in Swift RAM. N7d will add native replay.
 * No HTML Audio, AudioContext, Blob, file or fake audible success on native.
 */
(function installN7cFlashcardsCapture(root) {
  "use strict";
  const doc = root.document;
  if (root.BibloZooNativeOnlyOutput?.enabled !== true ||
      root.Capacitor?.isNativePlatform?.() !== true ||
      root.Capacitor?.getPlatform?.() !== "ios" ||
      !root.BibloZooRecording?.create || !doc) return;

  // Keep original browser implementation untouched. Experimental iOS
  // fail-closes here if a native bridge method is absent; NEVER falls back.
  function create({onChange, onInterrupted} = {}) {
    let generation = 0;
    let status = "idle";
    let nativeOwned = false;
    let cleanup = Promise.resolve();
    let hasRecording = false;
    let message = "";
    let playbackFailed = false;
    let recordingDeadline = 0;
    let stopTimer = null;
    let active = false;
    let takeMetadata = null;
    const notify = () => onChange?.();
    const mic = () => root.Capacitor?.Plugins?.BibloZooMicSessionProbe;
    const sound = () => root.Capacitor?.Plugins?.BibloZooNativeSound;

    function resetLocal() {
      generation += 1;
      clearTimeout(stopTimer);stopTimer = null;
      status = "idle";
      hasRecording = false;
      message = "";
      playbackFailed = false;
      takeMetadata = null;
      recordingDeadline = 0;
      active = false;
    }
    function dispose() {
      const hadNative = nativeOwned;
      nativeOwned = false;
      resetLocal();
      if (hadNative) {
        // Serialize the cleanup ACK before any future prepare on a new tap.
        // A late Swift recording callback cannot revive a newer generation.
        const previous = cleanup;
        cleanup = previous.catch(()=>{}).then(() =>
          Promise.resolve(mic()?.discardCapture?.()).catch(()=>{}));
      }
    }
    function interrupt() {
      if (!["requesting","preparing","recording","stopping"].includes(status)) return;
      dispose();
      notify();
      onInterrupted?.();
    }

    function failed(reason) {
      if (reason === "permission-denied") {
        dispose();notify();return "permission-denied";
      }
      dispose();notify();return "failed";
    }

    function captured(result) {
      if (doc.hidden || result?.ready !== true || result?.restored !== true ||
          !Number.isInteger(result?.frameCount) || result.frameCount < 256) {
        interrupt();
        return false;
      }
      clearTimeout(stopTimer); stopTimer = null;
      recordingDeadline = 0;
      status = "ready";
      active = false;
      hasRecording = true;
      takeMetadata = {
        frameCount: result.frameCount,
        durationMs: Number.isInteger(result.durationMs) ? result.durationMs : 0
      };
      // N7c is CAPTURE ONLY. No false playbackComplete or Wacky unlock. The
      // existing comparison UI offers an explicit Continue Without Listening.
      playbackFailed = true;
      message = "Recording captured on this iPhone. Native playback arrives in N7d. Choose Continue Without Listening or Re-record.";
      notify();
      return true;
    }

    async function start(onStart, beforeStart, getLimitMs = () => 120000) {
      dispose();
      const token = generation;
      status = "requesting"; notify();
      const api = mic(), output = sound();
      if (typeof api?.requestPermission !== "function" ||
          typeof api?.prepareCapture !== "function" ||
          typeof api?.beginCapture !== "function" ||
          typeof api?.finishCapture !== "function" ||
          typeof api?.discardCapture !== "function" ||
          typeof output?.devPrepareForMicrophone !== "function") {
        return failed("missing-native-bridge");
      }
      try {
        await cleanup.catch(()=>{});
        if (token !== generation || doc.hidden) return "cancelled";
        // The ONLY microphone prompt, from Flashcards' true Record tap.
        const permission = await api.requestPermission();
        if (token !== generation || doc.hidden) return "cancelled";
        if (permission?.granted !== true) return failed(
          permission?.reason === "permission-denied" ? "permission-denied" :
          "permission-required");
        // All AVAudioEngine playback nodes must actually finish stopping
        // before the shared AVAudioSession changes category.
        const handoff = await output.devPrepareForMicrophone();
        if (token !== generation || doc.hidden) return "cancelled";
        if (handoff?.prepared !== true) return failed("output-busy");
        nativeOwned = true;
        const prepared = await api.prepareCapture();
        if (token !== generation || doc.hidden) return "cancelled";
        if (prepared?.prepared !== true) return failed("prepare-failed");
        status = "preparing";notify();

        // EXACT original 3,2,1 UI countdown. Do not capture samples here.
        const proceed = beforeStart ? await beforeStart() : true;
        if (token !== generation || doc.hidden) return "cancelled";
        if (!proceed) {
          interrupt();return "cancelled";
        }
        let limitMs = Number(getLimitMs());
        if (!Number.isFinite(limitMs) || limitMs <= 0) limitMs = 120000;
        limitMs = Math.min(120000, Math.max(1000, Math.floor(limitMs)));
        const started = await api.beginCapture({limitMs});
        if (token !== generation || doc.hidden) return "cancelled";
        if (started?.started !== true) return failed("begin-failed");
        active = true;
        recordingDeadline = performance.now() + limitMs;
        status = "recording";
        // Challenge appears when the native input engine is actually live.
        onStart?.();
        notify();
        return "recording";
      } catch (_) {
        if (token !== generation) return "cancelled";
        return failed("native-error");
      }
    }
    function stop() {
      if (status !== "recording") return;
      const token = generation;
      status = "stopping";recordingDeadline = 0;notify();
      stopTimer = setTimeout(() => {
        if (token === generation && status === "stopping") interrupt();
      }, 5000);
      Promise.resolve(mic()?.finishCapture?.()).then(result => {
        if (token !== generation || status !== "stopping") return;
        captured(result);
      }).catch(() => {
        if (token === generation) interrupt();
      });
    }
    function pause() { /* N7d: no native replay yet. */ }
    async function play() {
      if (!hasRecording) return false;
      playbackFailed = true;
      message = "Native playback is not ready in N7c. Continue Without Listening or Re-record.";
      notify();
      return false;
    }
    function stopFun() { return false; }
    async function playFun() { return false; }
    function readLevel() { return null; } // N7d: 16-bar native live meter

    // Native 120-second limit and UIKit-interruption events also work when
    // WKWebView was paused or never delivered visibilitychange.
    const api = mic();
    if (typeof api?.addListener === "function") {
      try {
        Promise.resolve(api.addListener("biblozooCaptureLifecycle", event => {
          if (event?.kind === "interrupted") {
            interrupt();
          } else if (event?.kind === "completed" &&
              status === "recording") {
            captured(event);
          }
        })).catch(()=>{});
      } catch (_) {}
    }
    function onHidden() {
      if (!doc.hidden) return;
      interrupt();
    }
    doc.addEventListener("visibilitychange", onHidden);
    root.addEventListener("pagehide", interrupt);

    return Object.freeze({
      start, stop, play, pause, playFun, stopFun, dispose, readLevel,
      interruptCapture: interrupt,
      snapshot() {
        return {
          status,
          hasRecording,
          message,
          playbackComplete: false,
          playbackFailed,
          playbackAvailable: false,
          captureOnly: true,
          capturedFrames: takeMetadata?.frameCount || 0,
          remainingSeconds: status === "recording"
            ? Math.max(0, Math.ceil((recordingDeadline - performance.now()) / 1000))
            : null
        };
      }
    });
  }

  root.BibloZooRecording = Object.freeze({create});
})(window);
