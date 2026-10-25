/* Patch 64: pause-aware activity clock. Time spent in another app or in
 * the Welcome Back prompt never advances animation deadlines or game timers.
 * This is intentionally independent of Web Audio's clock and iOS recovery. */
(function (root) {
  "use strict";
  function create() {
    let pausedAt = 0;
    let elapsedPauseMs = 0;
    let paused = false;
    function now() {
      const wall = paused ? pausedAt : root.performance.now();
      return wall - elapsedPauseMs;
    }
    function pause() {
      if (paused) return;
      pausedAt = root.performance.now();
      paused = true;
    }
    function resume() {
      if (!paused) return;
      elapsedPauseMs += Math.max(0, root.performance.now() - pausedAt);
      paused = false;
    }
    // Game cutscenes and delayed game-state changes also stop while away.
    // Short bounded polling means returning never depends on a stale timeout.
    function sleep(ms) {
      const deadline = now() + Math.max(0, Number(ms) || 0);
      return new Promise(resolve => {
        function check() {
          if (!paused && now() >= deadline) { resolve(); return; }
          root.setTimeout(check, paused ? 80 : Math.min(80, Math.max(8, deadline - now())));
        }
        check();
      });
    }
    return Object.freeze({ now, pause, resume, sleep, isPaused: () => paused });
  }
  root.BibloZooWelcomeBackClock = Object.freeze({ create });
})(window);
