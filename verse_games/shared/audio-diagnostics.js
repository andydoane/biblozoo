/* Developer-only instrumentation for external game audio. No gameplay audio changes. */
(function installBibloZooAudioDiagnostics(root) {
  "use strict";

  const ENABLE_KEY = "biblozooAudioDiagnostics";
  const LOG_KEY = "biblozooAudioDiagnosticsLog";
  const MAX_EVENTS = 120;

  try {
    if (root.localStorage?.getItem(ENABLE_KEY) !== "1") return;
  } catch (err) {
    return;
  }

  let events = [];
  try {
    const stored = JSON.parse(root.sessionStorage?.getItem(LOG_KEY) || "[]");
    if (Array.isArray(stored)) events = stored.slice(-MAX_EVENTS);
  } catch (err) {
    // Diagnostics must continue if session storage is unavailable.
  }

  function record(type, details = {}) {
    const entry = {
      time: new Date().toISOString(),
      page: root.location?.pathname || "",
      type,
      ...details
    };
    events.push(entry);
    if (events.length > MAX_EVENTS) events.shift();
    try {
      root.sessionStorage?.setItem(LOG_KEY, JSON.stringify(events));
    } catch (err) { }
    root.console?.debug?.("[BibloZoo audio diagnostics]", entry);
  }

  function sourcePath(value) {
    try {
      return new URL(String(value || ""), root.location.href).pathname;
    } catch (err) {
      return "";
    }
  }

  function errorName(error) {
    return String(error?.name || "Error");
  }

  const observedContexts = new WeakSet();
  function observeContext(ctx) {
    if (!ctx || observedContexts.has(ctx)) return;
    observedContexts.add(ctx);
    record("context-created", { state: ctx.state });
    ctx.addEventListener?.("statechange", () => {
      record("context-state", { state: ctx.state });
    });
  }

  // Observe unlock requests and their actual resulting state, not just a game's
  // local `audioUnlocked` flag. Return the native promise unchanged.
  const nativeContextCtors = [root.AudioContext, root.webkitAudioContext]
    .filter(ctor => typeof ctor === "function");
  const contextProtos = [...new Set(nativeContextCtors.map(ctor => ctor.prototype))];
  for (const contextProto of contextProtos) {
    if (typeof contextProto?.resume !== "function") continue;
    const nativeResume = contextProto.resume;
    try {
      contextProto.resume = function (...args) {
        observeContext(this);
        record("context-resume-attempt", { state: this.state });
        let result;
        try {
          result = nativeResume.apply(this, args);
        } catch (err) {
          record("context-resume-rejected", { state: this.state, error: errorName(err) });
          throw err;
        }
        if (result?.then) {
          result.then(
            () => record("context-resume-settled", { state: this.state }),
            err => record("context-resume-rejected", { state: this.state, error: errorName(err) })
          );
        } else {
          record("context-resume-settled", { state: this.state });
        }
        return result;
      };
    } catch (err) {
      record("instrumentation-unavailable", { method: "resume" });
    }
  }

  // Observe contexts even if a game never attempts resume().
  const replacements = new Map();
  for (const key of ["AudioContext", "webkitAudioContext"]) {
    const NativeAudioContext = root[key];
    if (typeof NativeAudioContext !== "function") continue;
    if (!replacements.has(NativeAudioContext)) {
      function TrackedAudioContext(...args) {
        const ctx = new NativeAudioContext(...args);
        observeContext(ctx);
        return ctx;
      }
      TrackedAudioContext.prototype = NativeAudioContext.prototype;
      try {
        Object.setPrototypeOf(TrackedAudioContext, NativeAudioContext);
      } catch (err) {
        // Prototype chaining is optional for diagnostic observation.
      }
      replacements.set(NativeAudioContext, TrackedAudioContext);
    }
    try {
      root[key] = replacements.get(NativeAudioContext);
    } catch (err) {
      record("instrumentation-unavailable", { method: key });
    }
  }

  const mediaProto = root.HTMLMediaElement?.prototype;
  if (typeof mediaProto?.play === "function") {
    const nativePlay = mediaProto.play;
    try {
      mediaProto.play = function (...args) {
      const src = sourcePath(this.currentSrc || this.src);
      record("media-play-attempt", { src });
      let result;
      try {
        result = nativePlay.apply(this, args);
      } catch (err) {
        record("media-play-rejected", { src, error: errorName(err) });
        throw err;
      }
      if (result?.then) {
        result.then(
          () => record("media-play-settled", { src }),
          err => record("media-play-rejected", { src, error: errorName(err) })
        );
      }
      return result;
      };
    } catch (err) {
      record("instrumentation-unavailable", { method: "play" });
    }
  }

  // A sound-file HTTP failure and a decode failure are separate diagnostics.
  // Neither handler reads the response body or changes the returned promise.
  if (typeof root.fetch === "function") {
    const nativeFetch = root.fetch;
    try {
      root.fetch = function (input, ...args) {
      const src = sourcePath(input?.url || input);
      const soundRequest = /\.(?:mp3|m4a|wav|ogg|aac)$/i.test(src);
      if (!soundRequest) return nativeFetch.call(this, input, ...args);
      let result;
      try {
        result = nativeFetch.call(this, input, ...args);
      } catch (err) {
        record("sound-fetch-failed", { src, error: errorName(err) });
        throw err;
      }
      result?.then?.(
        response => {
          const localCapacitorResponse = root.location?.protocol === "capacitor:" && response.status === 0;
          if (!response.ok && !localCapacitorResponse) {
            record("sound-fetch-failed", { src, status: response.status });
          }
        },
        err => record("sound-fetch-failed", { src, error: errorName(err) })
      );
      return result;
      };
    } catch (err) {
      record("instrumentation-unavailable", { method: "fetch" });
    }
  }

  const decodeProtos = root.BaseAudioContext?.prototype
    ? [root.BaseAudioContext.prototype]
    : contextProtos;
  for (const decodeProto of decodeProtos) {
    if (typeof decodeProto?.decodeAudioData !== "function") continue;
    const nativeDecode = decodeProto.decodeAudioData;
    try {
      decodeProto.decodeAudioData = function (...args) {
        let result;
        try {
          result = nativeDecode.apply(this, args);
        } catch (err) {
          record("sound-decode-failed", { error: errorName(err) });
          throw err;
        }
        result?.then?.(
          () => { },
          err => record("sound-decode-failed", { error: errorName(err) })
        );
        return result;
      };
    } catch (err) {
      record("instrumentation-unavailable", { method: "decodeAudioData" });
    }
  }

  root.BibloZooAudioDiagnostics = Object.freeze({
    record,
    getEvents: () => events.slice(),
    clear() {
      events = [];
      try { root.sessionStorage?.removeItem(LOG_KEY); } catch (err) { }
    }
  });
  record("diagnostics-enabled");
})(window);
