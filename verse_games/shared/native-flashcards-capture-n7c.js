/* N7d: native-only Flashcards record, 16-bar level and original dry replay.
 * Original ios-prep MediaRecorder/WebAudio remain unchanged on Web/Android.
 * Voice PCM stays bounded and opaque in Swift RAM; no Web/HTML fallback.
 * N7e routes the official ten Wacky effects through native AVFoundation,
 * with event-scoped heard-end completion and NO WebAudio fallback.
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
    let playbackComplete = false;
    let playbackRequest = 0;
    let activePlayToken = null;
    let earlyPlaybackEvent = null;
    // Independent Wacky replay handshake. A stopped / stale Wacky event
    // cannot complete normal raw playback or spend a new user-selected test.
    let funRequest = 0;
    let funPlayToken = null;
    let funEarlyEvent = null;
    let funResolve = null;
    let funStarted = false;
    let captureKey = -1;
    let level = null;
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
      playbackComplete = false;
      playbackRequest += 1;
      activePlayToken = null;
      earlyPlaybackEvent = null;
      funRequest += 1;
      funPlayToken = null;
      funEarlyEvent = null;
      funStarted = false;
      const pendingFun = funResolve;
      funResolve = null;
      pendingFun?.(false);
      captureKey = -1;
      level = null;
      takeMetadata = null;
      recordingDeadline = 0;
      active = false;
    }
    function dispose() {
      const hadNative = nativeOwned;
      // Explicitly stop any replay before deleting the RAM take; a delayed
      // playCapture callback is also invalidated by the native stop method.
      pause();
      stopFun();
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
        takeId: typeof result.takeId === "string" ? result.takeId : "",
        frameCount: result.frameCount,
        durationMs: Number.isInteger(result.durationMs) ? result.durationMs : 0
      };
      if (!takeMetadata.takeId) {
        // A missing opaque ID is not a playable take, even if frameCount > 0.
        hasRecording = false;
        playbackFailed = true;
        message = "Recording couldn't be prepared. Please re-record.";
      } else {
        playbackFailed = false;
        playbackComplete = false;
        message = "";
      }
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
          typeof api?.playCapture !== "function" ||
          typeof api?.stopCapturePlayback !== "function" ||
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
        captureKey = Number.isInteger(started.captureKey) ?
          started.captureKey : -1;
        level = null;
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
    function pause() {
      if (status === "fun-loading" || status === "fun-playing") {
        stopFun();
        return;
      }
      playbackRequest += 1;
      activePlayToken = null;
      earlyPlaybackEvent = null;
      if (status !== "playing" && status !== "loading") return;
      status = "ready";
      notify();
      // Actual pause/Stop Playback must stop native PCM even when JS loses
      // focus or a previous asynchronous play request is still preparing.
      try { void Promise.resolve(mic()?.stopCapturePlayback?.()).catch(()=>{}); }
      catch (_) {}
    }

    async function play() {
      if (!hasRecording || !takeMetadata?.takeId || doc.hidden ||
          status === "fun-loading" || status === "fun-playing") return false;
      if (status === "loading") return false;
      if (status === "playing") { pause(); return false; }
      const api = mic();
      if (typeof api?.playCapture !== "function") return false;
      const token = ++playbackRequest;
      activePlayToken = null;
      earlyPlaybackEvent = null;
      status = "loading";
      playbackFailed = false;
      message = "";
      notify();
      try {
        // Called only by the child's actual Play My Recording button.
        const reply = await api.playCapture({takeId: takeMetadata.takeId});
        if (token !== playbackRequest || doc.hidden) {
          try { void Promise.resolve(api.stopCapturePlayback()).catch(()=>{}); }
          catch (_) {}
          return false;
        }
        if (reply?.started !== true ||
            !Number.isInteger(reply.playToken)) {
          status = "ready";
          playbackFailed = true;
          message = "Playback couldn't start. Tap Play to try again.";
          notify();
          return false;
        }
        activePlayToken = reply.playToken;
        if (status === "loading") {
          status = "playing";
          notify();
        }
        // A tiny take can finish before the bridge result arrives. Hold
        // that event until we know the new playToken, and reject an old
        // take's delayed completion from the previous Play/Stop attempt.
        const early = earlyPlaybackEvent;
        earlyPlaybackEvent = null;
        if (early && early.playToken === activePlayToken) {
          finishPlaybackEvent(early);
        }
        return true;
      } catch (_) {
        if (token !== playbackRequest || doc.hidden) return false;
        status = "ready";
        playbackFailed = true;
        message = "Playback couldn't start. Tap Play to try again.";
        notify();
        return false;
      }
    }

    const OFFICIAL_WACKY_IDS = new Set([
      "squirrel","giant","sleepy","rocket","roller_coaster",
      "ascending","descending","demon","chorus_alien","cave"
    ]);

    function stopFun() {
      if (status !== "fun-loading" && status !== "fun-playing") return false;
      funRequest += 1;
      funPlayToken = null;
      funEarlyEvent = null;
      funStarted = false;
      const done = funResolve;
      funResolve = null;
      status = "ready";
      done?.(false);
      notify();
      // Stop native output also invalidates an in-flight PCM preparation.
      try { void Promise.resolve(mic()?.stopCapturePlayback?.()).catch(()=>{}); }
      catch (_) {}
      return true;
    }

    function finishFunEvent(event) {
      if (!takeMetadata?.takeId || event?.takeId !== takeMetadata.takeId ||
          event?.playToken !== funPlayToken ||
          !["fun-loading", "fun-playing"].includes(status)) return;
      if (event.kind === "started") return; // distinct real event, no completion
      const done = funResolve;
      funResolve = null;
      funPlayToken = null;
      funEarlyEvent = null;
      status = "ready";
      notify();
      done?.(event.kind === "ended");
    }

    function playFun(presetId, onStarted) {
      if (!OFFICIAL_WACKY_IDS.has(presetId) ||
          !hasRecording || !takeMetadata?.takeId || doc.hidden ||
          status !== "ready" || typeof mic()?.playCapture !== "function") {
        return Promise.resolve(false);
      }
      const token = ++funRequest;
      funPlayToken = null;
      funEarlyEvent = null;
      funStarted = false;
      status = "fun-loading";
      notify();
      return new Promise(resolve => {
        funResolve = resolve;
        Promise.resolve(mic().playCapture({
          takeId: takeMetadata.takeId, presetId
        })).then(reply => {
          if (token !== funRequest || doc.hidden || status !== "fun-loading") {
            // A stale response may otherwise sound after a new Record/Exit.
            try { void Promise.resolve(mic()?.stopCapturePlayback?.()).catch(()=>{}); }
            catch (_) {}
            return;
          }
          if (reply?.started !== true || !Number.isInteger(reply.playToken)) {
            status = "ready";
            funResolve = null;
            notify();
            resolve(false);
            return;
          }
          funPlayToken = reply.playToken;
          status = "fun-playing";
          // "started" is the native AVAudioEngine/player ACK; actual
          // completion still requires the exact .dataPlayedBack event.
          // onStarted is only the original Wacky one-time entitlement gate.
          funStarted = true;
          try { onStarted?.(); } catch (_) {}
          notify();
          const early = funEarlyEvent;
          funEarlyEvent = null;
          if (early && early.playToken === funPlayToken) finishFunEvent(early);
        }).catch(() => {
          if (token !== funRequest) return;
          status = "ready";
          funResolve = null;
          notify();
          resolve(false);
        });
      });
    }
    function readLevel() {
      return status === "recording" ? level : null;
    }

    function finishPlaybackEvent(event) {
      if (!takeMetadata?.takeId ||
          event?.takeId !== takeMetadata.takeId ||
          !["playing", "loading"].includes(status) ||
          event?.playToken !== activePlayToken) return;
      activePlayToken = null;
      earlyPlaybackEvent = null;
      if (event.kind === "ended") {
        status = "ready";
        playbackComplete = true; // real .dataPlayedBack only
        playbackFailed = false;
        message = "";
      } else {
        status = "ready";
        playbackFailed = true;
        message = "Playback was interrupted. Tap Play to retry.";
      }
      notify();
    }

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
        Promise.resolve(api.addListener("biblozooCaptureLevel", event => {
          // One bounded 0...1 level, never actual mic samples.
          if (status !== "recording" || captureKey < 0 ||
              event?.captureKey !== captureKey ||
              !Number.isFinite(event.level)) return;
          level = Math.max(0, Math.min(1, event.level));
        })).catch(()=>{});
        Promise.resolve(api.addListener("biblozooCapturePlayback", event => {
          if (!takeMetadata?.takeId ||
              event?.takeId !== takeMetadata.takeId ||
              !Number.isInteger(event.playToken)) return;
          if (status === "fun-loading" || status === "fun-playing") {
            if (status === "fun-loading" && funPlayToken === null) {
              funEarlyEvent = event;
              return;
            }
            finishFunEvent(event);
            return;
          }
          if (!["playing", "loading"].includes(status)) return;
          if (status === "loading" && activePlayToken === null) {
            earlyPlaybackEvent = event;
            return;
          }
          finishPlaybackEvent(event);
        })).catch(()=>{});
      } catch (_) {}
    }
    function onHidden() {
      if (!doc.hidden) return;
      if (["requesting","preparing","recording","stopping"].includes(status)) {
        interrupt();
      } else {
        // Preserve completed RAM take, but cut audible output immediately.
        pause();
      }
    }
    doc.addEventListener("visibilitychange", onHidden);
    root.addEventListener("pagehide", () => {
      if (["requesting","preparing","recording","stopping"].includes(status))
        interrupt();
      else pause();
    });

    return Object.freeze({
      start, stop, play, pause, playFun, stopFun, dispose, readLevel,
      interruptCapture: interrupt,
      snapshot() {
        return {
          status,
          hasRecording,
          message,
          playbackComplete,
          playbackFailed,
          playbackAvailable: !!takeMetadata?.takeId,
          captureOnly: false,
          nativeReplay: true,
          nativeWacky: true,
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
