/* N1 — output-only isolation in the separate BibloZoo Audio Test iOS app.
 * This script is injected FIRST into every packaged HTML entrypoint by
 * scripts/build.js, and only when capacitor.config.json has the .audiotest ID.
 *
 * This is intentionally NOT a native audio engine: the existing Capacitor
 * BibloZooNativeSound/AVAudioPlayer plugin remains the only permitted sound
 * producer. Unmigrated Web/HTML effects must fail visibly or stay silent, not
 * secretly become a fallback. This script does not change getUserMedia,
 * MediaRecorder, MediaStream, or the native audio session/category.
 */
(function installExperimentalNativeOnlyOutput(root) {
  "use strict";

  function isNativeIOS() {
    try {
      var cap = root.Capacitor;
      return (cap && cap.isNativePlatform?.() === true &&
        cap.getPlatform?.() === "ios") ||
        root.location?.protocol === "capacitor:";
    } catch (_) { return root.location?.protocol === "capacitor:"; }
  }

  // The build adds this script only to the independent .audiotest bundle.
  // On a web/PWA/Android page, even one served from dist, do nothing.
  if (!isNativeIOS()) return;
  if (root.BibloZooNativeOnlyOutput?.enabled === true) return;

  var blockedMediaPlays = 0;
  var mutedVideoPlays = 0;
  var failures = [];

  // No real Web Audio context may be allocated in the experimental iOS app.
  // Old callers generally check these constructors and fall through to
  // HTMLAudioElement; its playback is blocked separately below. This also
  // suppresses WebAudio mic-meter/AudioWorklet output; getUserMedia and
  // MediaRecorder INPUT are deliberately left intact for later native work.
  function hideWebAudioConstructor(name) {
    try {
      Object.defineProperty(root, name, {
        configurable: false,
        enumerable: true,
        get: function () { return undefined; }
      });
    } catch (_) {
      try { root[name] = undefined; } catch (_) { /* non-writable */ }
    }
    if (typeof root[name] === "function") failures.push(name);
  }

  hideWebAudioConstructor("AudioContext");
  hideWebAudioConstructor("webkitAudioContext");

  // HTML audio/HTMLMedia playback cannot be a fallback when native is
  // unavailable. A rejected play() is deliberate: do NOT invent playback
  // progress or success for owner recovery/narration/recording controllers.
  var mediaProto = root.HTMLMediaElement?.prototype;
  var originalPlay = mediaProto?.play;
  var videoCtor = root.HTMLVideoElement;
  if (!mediaProto || typeof originalPlay !== "function") {
    failures.push("HTMLMediaElement.play");
  } else {
    try {
      Object.defineProperty(mediaProto, "play", {
        configurable: false,
        writable: false,
        value: function nativeOnlyMediaPlay() {
          // Visual videos may continue, but never with HTML/WebKit sound.
          if (typeof videoCtor === "function" && this instanceof videoCtor) {
            try { this.muted = true; this.defaultMuted = true; } catch (_) { }
            mutedVideoPlays += 1;
            return originalPlay.apply(this, arguments);
          }
          blockedMediaPlays += 1;
          try { this.pause(); } catch (_) { }
          var message = "WebKit media sound is disabled in BibloZoo Audio Test";
          var error = typeof root.DOMException === "function"
            ? new root.DOMException(message, "NotSupportedError")
            : new Error(message);
          return Promise.reject(error);
        }
      });
    } catch (_) {
      failures.push("HTMLMediaElement.play");
    }
  }

  // Prevent parser autoplay and future dynamically inserted <audio> elements
  // from bypassing the explicit play() interception. For <video>, preserve
  // picture playback but keep its sound muted.
  function guardElement(element) {
    if (!element || element.nodeType !== 1) return;
    if (element.tagName === "AUDIO") {
      if (element.autoplay || element.hasAttribute?.("autoplay")) {
        try { element.autoplay = false; element.removeAttribute("autoplay"); }
        catch (_) { /* best effort */ }
      }
      try { element.pause(); } catch (_) { }
    } else if (element.tagName === "VIDEO") {
      try { element.muted = true; element.defaultMuted = true; }
      catch (_) { /* best effort */ }
    }
  }

  function guardTree(node) {
    if (!node) return;
    guardElement(node);
    try {
      node.querySelectorAll?.("audio,video").forEach(guardElement);
    } catch (_) { /* no DOM or preflight element */ }
  }

  var doc = root.document;
  function watchMedia() {
    if (!doc?.documentElement) return;
    guardTree(doc.documentElement);
    if (typeof root.MutationObserver !== "function") return;
    var observer = new root.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i += 1) {
        var record = records[i];
        if (record.type === "attributes") {
          guardElement(record.target);
        } else {
          for (var j = 0; j < record.addedNodes.length; j += 1) {
            guardTree(record.addedNodes[j]);
          }
        }
      }
    });
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["autoplay", "muted"]
    });
  }

  if (doc?.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", watchMedia, { once: true });
  } else {
    watchMedia();
  }

  // Fail closed rather than silently permitting a fallback on a browser that
  // refuses the necessary prototype/constructor guards. This should be rare,
  // and a failed bootstrap must be investigated on a physical iPhone.
  if (failures.length) {
    root.BibloZooNativeOnlyOutput = Object.freeze({
      enabled: false,
      installationFailed: true,
      reasons: failures.slice()
    });
    try { root.stop?.(); } catch (_) { }
    throw new Error("BibloZoo native-only output isolation failed: " + failures.join(", "));
  }

  root.BibloZooNativeOnlyOutput = Object.freeze({
    enabled: true,
    mode: "native-only-ios-experiment",
    status: function () {
      return {
        enabled: true,
        webAudioDisabled: true,
        htmlAudioPlaybackDisabled: true,
        blockedMediaPlays: blockedMediaPlays,
        mutedVideoPlays: mutedVideoPlays
      };
    }
  });
})(window);
