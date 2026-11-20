/* N7h: Daily Questions correct/incorrect answer MP3s on AVFoundation ONLY.
 * The separately installed .audiotest iOS app is the sole consumer.
 * The original Web/PWA/Android Audio path remains in daily_questions.js.
 * No preload/activation on page load, no browser fallback on native failure.
 */
(function installNativeDailyQuestionAudio(root) {
  "use strict";

  const IDS = Object.freeze({
    correct: "daily-question-correct",
    incorrect: "daily-question-incorrect"
  });
  const MAX_TAP_TO_PLAY_MS = 1200;
  let generation = 0;
  let bound = false;

  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function bridge() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function stopNative() {
    if (!isAvailable()) return [];
    return Object.values(IDS).map(soundId => {
      try { return Promise.resolve(bridge()?.stopEffect?.({soundId})).catch(() => {}); }
      catch (_) { return Promise.resolve(); }
    });
  }
  function stop() {
    generation++;
    // stopEffect is scoped to these two PCM voices. Unlike stop(), it does
    // not discard Learn/Feeding/UI/game PCM banks or deactivate AVAudioSession.
    void Promise.all(stopNative());
  }
  function bindLifecycle() {
    if (bound || !isAvailable()) return;
    bound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document.hidden) stop();
    });
    root.addEventListener?.("pagehide", stop);
    root.addEventListener?.("blur", stop);
    // UIKit sends this BEFORE WebKit's visibilitychange during a held switcher.
    try {
      Promise.resolve(bridge()?.addListener?.("biblozooAppLifecycle", event => {
        if (event?.active === false) stop();
      })).catch(() => {});
    } catch (_) { /* WebKit lifecycle is the backup. */ }
  }
  function tapAnswer({ correct, isCurrent } = {}) {
    if (!isAvailable() || root.document?.hidden ||
        typeof isCurrent !== "function" || !isCurrent()) return false;
    const soundId = correct === true ? IDS.correct : IDS.incorrect;
    const api = bridge();
    if (typeof api?.activateFromGesture !== "function" ||
        typeof api?.preload !== "function" ||
        typeof api?.play !== "function" ||
        typeof api?.stopEffect !== "function") return false;
    bindLifecycle();
    const token = ++generation;
    const startedAt = root.performance?.now?.() ?? Date.now();
    const stillCurrent = () =>
      token === generation && isAvailable() && !root.document?.hidden &&
      isCurrent() &&
      (root.performance?.now?.() ?? Date.now()) - startedAt <= MAX_TAP_TO_PLAY_MS;

    // Both native activation and scoped stop are invoked by the ACTUAL answer
    // gesture, never by a delayed response to visibility/another audio app.
    let activation;
    try { activation = api.activateFromGesture({purpose:"daily-questions"}); }
    catch (_) { return false; }
    const stops = stopNative();
    void Promise.all(stops).then(async () => {
      const activated = await Promise.resolve(activation);
      if (!stillCurrent() || activated?.ready !== true) return;
      const prepared = await api.preload({soundId});
      if (!stillCurrent() || prepared?.prepared !== true) return;
      // Original fixed MP3, decoded by the native worker into in-memory PCM.
      // Accepted means scheduled, NOT proof the child heard the clip.
      await api.play({soundId,volume:1,eventId:"dq-"+token,
        requestEpochMs:Date.now()});
    }).catch(() => { /* A denied native sound must not alter question rewards. */ });
    return true;
  }
  root.BibloZooNativeDailyQuestionAudio = Object.freeze({
    isAvailable, tapAnswer, stop
  });
})(window);
