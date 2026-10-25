/* Patch 55: developer-only audio diagnostics. No playback or gameplay changes. */
(function installBibloZooAudioDiagnostics(root) {
  "use strict";

  const ENABLE_KEY = "biblozooAudioDiagnostics";
  const LOG_KEY = "biblozooAudioDiagnosticsLog";
  const MAX_EVENTS = 300;
  const RESUME_WATCHDOG_MS = 1800;
  const CLOCK_PROBE_MS = 180;

  // Entire instrumentation layer is inert unless explicitly enabled.
  try {
    if (root.localStorage?.getItem(ENABLE_KEY) !== "1") return;
  } catch (err) {
    return;
  }
  if (root.BibloZooAudioDiagnostics) return;

  const doc = root.document;
  const localStore = root.localStorage;
  let events = [];
  try {
    const stored = JSON.parse(localStore?.getItem(LOG_KEY) ||
      root.sessionStorage?.getItem(LOG_KEY) || "[]");
    if (Array.isArray(stored)) events = stored.slice(-MAX_EVENTS);
  } catch (err) { /* Corrupt or unavailable logs never block the application. */ }

  const page = String(root.location?.pathname || "");
  let environment = "web";
  try {
    if (root.Capacitor?.isNativePlatform?.()) environment = "capacitor";
    else if (root.navigator?.standalone === true ||
      root.matchMedia?.("(display-mode: standalone)")?.matches) environment = "pwa";
  } catch (err) { /* Environment metadata is optional. */ }

  function record(type, details = {}) {
    const entry = { time: new Date().toISOString(), page, type, ...details };
    events.push(entry);
    if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
    try { localStore?.setItem(LOG_KEY, JSON.stringify(events)); }
    catch (err) {
      try { root.sessionStorage?.setItem(LOG_KEY, JSON.stringify(events)); }
      catch (ignored) { /* Storage failure must not affect audio. */ }
    }
    root.console?.debug?.("[BibloZoo audio diagnostics]", entry);
    observeNativeMilestone(type);
  }

  // Only retain the filename of static sound assets. Never log URL queries,
  // blob identifiers, narration content, microphone data or profile details.
  function soundFilename(value) {
    try {
      const pathname = new URL(String(value || ""), root.location.href).pathname;
      const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
      return /\.(mp3|m4a|wav|ogg|aac)$/i.test(filename) ? filename.slice(0, 110) : "";
    } catch (err) { return ""; }
  }
  function errorName(error) { return String(error?.name || "Error").slice(0, 80); }

  const observedContexts = new WeakSet();
  const contextIds = new WeakMap();
  const contexts = [];
  let nextContextId = 1;
  function contextId(ctx) {
    if (!contextIds.has(ctx)) contextIds.set(ctx, nextContextId++);
    return contextIds.get(ctx);
  }
  function contextStates() {
    return contexts.map(ctx => ({ id: contextId(ctx), state: ctx.state }));
  }
  function observeContext(ctx) {
    if (!ctx || observedContexts.has(ctx)) return;
    observedContexts.add(ctx);
    contextId(ctx);
    contexts.push(ctx);
    if (contexts.length > 24) contexts.shift();
    record("context-created", { id: contextId(ctx), state: ctx.state });
    try {
      ctx.addEventListener?.("statechange", () =>
        record("context-state", { id: contextId(ctx), state: ctx.state }));
    } catch (err) { record("instrumentation-unavailable", { method: "statechange" }); }
  }

  // A clock advancing does not prove that the speaker is audible; a frozen
  // clock is nevertheless a useful symptom of interrupted Web Audio.
  function probeClock(ctx, cause) {
    if (!ctx || doc?.hidden || ctx.state !== "running") return;
    const start = Number(ctx.currentTime);
    if (!Number.isFinite(start)) return;
    root.setTimeout?.(() => {
      if (doc?.hidden || ctx.state !== "running") return;
      const advanced = Number(ctx.currentTime) - start;
      record(advanced > 0.01 ? "context-clock-advanced" : "context-clock-stalled",
        { id: contextId(ctx), cause, elapsedAudioMs: Math.round(advanced * 1000) });
    }, CLOCK_PROBE_MS);
  }

  // Observe promises without replacing their resolution or rejection.
  const nativeCtors = [root.AudioContext, root.webkitAudioContext]
    .filter(ctor => typeof ctor === "function");
  const contextProtos = [...new Set(nativeCtors.map(ctor => ctor.prototype))];
  for (const proto of contextProtos) {
    if (typeof proto?.resume !== "function") continue;
    const nativeResume = proto.resume;
    try {
      proto.resume = function (...args) {
        observeContext(this);
        const ctx = this;
        const id = contextId(ctx);
        record("context-resume-attempt", { id, state: ctx.state });
        let result;
        try { result = nativeResume.apply(ctx, args); }
        catch (err) {
          record("context-resume-rejected", { id, state: ctx.state, error: errorName(err) });
          throw err;
        }
        if (result?.then) {
          let settled = false;
          const timeout = root.setTimeout?.(() => {
            if (!settled) record("context-resume-pending", { id, state: ctx.state,
              afterMs: RESUME_WATCHDOG_MS });
          }, RESUME_WATCHDOG_MS);
          // Promise callbacks are observation only. The original promise is returned.
          try {
            result.then(() => {
              settled = true;
              root.clearTimeout?.(timeout);
              record("context-resume-settled", { id, state: ctx.state });
              probeClock(ctx, "resume");
            }, err => {
              settled = true;
              root.clearTimeout?.(timeout);
              record("context-resume-rejected", { id, state: ctx.state,
                error: errorName(err) });
            });
          } catch (err) { root.clearTimeout?.(timeout); }
        } else {
          record("context-resume-settled", { id, state: ctx.state });
          probeClock(ctx, "resume");
        }
        return result;
      };
    } catch (err) { record("instrumentation-unavailable", { method: "resume" }); }
  }

  const replacements = new Map();
  for (const key of ["AudioContext", "webkitAudioContext"]) {
    const Native = root[key];
    if (typeof Native !== "function") continue;
    if (!replacements.has(Native)) {
      function TrackedAudioContext(...args) {
        const ctx = new Native(...args);
        observeContext(ctx);
        return ctx;
      }
      TrackedAudioContext.prototype = Native.prototype;
      try { Object.setPrototypeOf(TrackedAudioContext, Native); } catch (err) { }
      replacements.set(Native, TrackedAudioContext);
    }
    try { root[key] = replacements.get(Native); }
    catch (err) { record("instrumentation-unavailable", { method: key }); }
  }

  // A running context alone cannot explain missing sound effects. Observe
  // when game code actually schedules a Web Audio source, without playing,
  // rescheduling or inspecting its audio data. Throttle noisy game loops.
  const sharedStartProto = root.AudioScheduledSourceNode?.prototype;
  const startProtos = typeof sharedStartProto?.start === "function"
    ? [sharedStartProto]
    : [...new Set([
      root.AudioBufferSourceNode?.prototype,
      root.OscillatorNode?.prototype
    ].filter(proto => typeof proto?.start === "function"))];
  const lastSourceLogAt = new WeakMap();
  for (const proto of startProtos) {
    const nativeStart = proto.start;
    try {
      proto.start = function (...args) {
        // Delegate immediately, inside the original user-gesture stack.
        const result = nativeStart.apply(this, args);
        const ctx = this.context;
        if (ctx) {
          const now = Date.now();
          const last = lastSourceLogAt.get(ctx) || 0;
          if (now - last > 750) {
            lastSourceLogAt.set(ctx, now);
            observeContext(ctx);
            record("context-source-start", { id: contextId(ctx), state: ctx.state });
          }
        }
        return result;
      };
    } catch (err) { record("instrumentation-unavailable", { method: "source-start" }); }
  }

  const mediaProto = root.HTMLMediaElement?.prototype;
  if (typeof mediaProto?.play === "function") {
    const nativePlay = mediaProto.play;
    try {
      mediaProto.play = function (...args) {
        const element = this;
        const src = soundFilename(element.currentSrc || element.src);
        // Do not report blob URLs, microphone streams or unknown media sources.
        const details = src ? { src } : {};
        record("media-play-attempt", details);
        let result;
        try { result = nativePlay.apply(element, args); }
        catch (err) {
          record("media-play-rejected", { ...details, error: errorName(err) });
          throw err;
        }
        if (result?.then) {
          let settled = false;
          const timeout = root.setTimeout?.(() => {
            if (!settled && !doc?.hidden) record("media-play-pending", details);
          }, RESUME_WATCHDOG_MS);
          try {
            result.then(() => {
              settled = true;
              root.clearTimeout?.(timeout);
              record("media-play-settled", details);
              if (doc?.hidden || element.paused || element.ended ||
                  (Number.isFinite(element.duration) && element.duration < 1.5)) return;
              const before = Number(element.currentTime) || 0;
              root.setTimeout?.(() => {
                if (doc?.hidden || element.paused || element.ended) return;
                const after = Number(element.currentTime) || 0;
                if (after - before < 0.02) record("media-progress-stalled", details);
              }, 1200);
            }, err => {
              settled = true;
              root.clearTimeout?.(timeout);
              record("media-play-rejected", { ...details, error: errorName(err) });
            });
          } catch (err) { root.clearTimeout?.(timeout); /* Never affect play(). */ }
        } else record("media-play-settled", details);
        return result;
      };
    } catch (err) { record("instrumentation-unavailable", { method: "play" }); }
  }

  // Lifecycle events observe but NEVER automatically resume, suspend or play.
  const onVisibility = () => {
    record("lifecycle-visibility", { hidden: !!doc.hidden, contexts: contextStates() });
    if (!doc.hidden) {
      root.setTimeout?.(() => {
        if (!doc.hidden) contexts.forEach(ctx => probeClock(ctx, "foreground"));
      }, 500);
    }
  };
  doc?.addEventListener?.("visibilitychange", onVisibility);
  root.addEventListener?.("pagehide", e => record("lifecycle-pagehide",
    { persisted: !!e?.persisted, contexts: contextStates() }));
  root.addEventListener?.("pageshow", e => {
    record("lifecycle-pageshow", { persisted: !!e?.persisted, contexts: contextStates() });
    if (!doc?.hidden) root.setTimeout?.(() => {
      contexts.forEach(ctx => probeClock(ctx, "pageshow"));
    }, 500);
  });
  root.addEventListener?.("blur", () => record("lifecycle-blur", { contexts: contextStates() }));
  root.addEventListener?.("focus", () => record("lifecycle-focus", { contexts: contextStates() }));

  // Capture noteworthy HTML media state without attaching to individual tracks.
  for (const type of ["stalled", "waiting", "error"]) {
    doc?.addEventListener?.(type, event => {
      if (typeof root.HTMLMediaElement !== "function" ||
          !(event.target instanceof root.HTMLMediaElement)) return;
      const src = soundFilename(event.target.currentSrc || event.target.src);
      record(`media-${type}`, { ...(src ? { src } : {}),
        readyState: event.target.readyState, networkState: event.target.networkState });
    }, true);
  }

  // Keep the previous diagnostic hooks for sound asset fetch and decode failures.
  if (typeof root.fetch === "function") {
    const nativeFetch = root.fetch;
    try {
      root.fetch = function (input, ...args) {
        const src = soundFilename(input?.url || input);
        if (!src) return nativeFetch.call(this, input, ...args);
        let result;
        try { result = nativeFetch.call(this, input, ...args); }
        catch (err) {
          record("sound-fetch-failed", { src, error: errorName(err) });
          throw err;
        }
        try {
          result?.then?.(response => {
            const localResponse = root.location?.protocol === "capacitor:" && response.status === 0;
            if (!response.ok && !localResponse)
              record("sound-fetch-failed", { src, status: response.status });
          }, err => record("sound-fetch-failed", { src, error: errorName(err) }));
        } catch (err) { /* Do not alter fetch. */ }
        return result;
      };
    } catch (err) { record("instrumentation-unavailable", { method: "fetch" }); }
  }

  const decodeProtos = root.BaseAudioContext?.prototype
    ? [root.BaseAudioContext.prototype] : contextProtos;
  for (const proto of decodeProtos) {
    if (typeof proto?.decodeAudioData !== "function") continue;
    const nativeDecode = proto.decodeAudioData;
    try {
      proto.decodeAudioData = function (...args) {
        let result;
        try { result = nativeDecode.apply(this, args); }
        catch (err) { record("sound-decode-failed", { error: errorName(err) }); throw err; }
        try { result?.then?.(() => {}, err =>
          record("sound-decode-failed", { error: errorName(err) })); }
        catch (err) { /* Do not alter decoding. */ }
        return result;
      };
    } catch (err) { record("instrumentation-unavailable", { method: "decodeAudioData" }); }
  }

  // Patch 58: optional native iOS audio-session observations, only when the
  // existing developer opt-in is enabled. Never call native audio mutators.
  // The plugin isn't present in browsers, PWAs, or Android; in those cases
  // this integration is inert and the existing export format is preserved.
  let nativeSince = 0;
  let nativeEpoch = 0;
  let nativeStarted = false;
  let nativeStartPromise = null;
  let nativeSyncPromise = null;
  let lastNativeSnapshotAt = 0;
  const NATIVE_KEYS = ["label", "category", "mode", "categoryOptions",
    "otherAudioPlaying", "secondaryAudioSilenced", "outputPorts",
    "interruptionType", "shouldResume", "routeChangeReason", "hintType"];

  function nativePlugin() {
    if (environment !== "capacitor") return null;
    try { return root.Capacitor?.Plugins?.BibloZooAudioSessionDiagnostics || null; }
    catch (err) { return null; }
  }
  function startNative() {
    const plugin = nativePlugin();
    if (!plugin || typeof plugin.enable !== "function" ||
        typeof plugin.getEvents !== "function") return Promise.resolve(null);
    if (nativeStarted) return Promise.resolve(plugin);
    if (nativeStartPromise) return nativeStartPromise;
    nativeStartPromise = Promise.resolve().then(() => plugin.enable())
      .then(() => { nativeStarted = true; return plugin; }, () => null)
      .finally(() => { nativeStartPromise = null; });
    return nativeStartPromise;
  }
  function syncNativeEvents(label = "") {
    if (!nativePlugin()) return Promise.resolve();
    if (nativeSyncPromise) return nativeSyncPromise;
    const epoch = nativeEpoch;
    nativeSyncPromise = (async () => {
      const plugin = await startNative();
      if (!plugin || epoch !== nativeEpoch) return;
      if (label && typeof plugin.snapshot === "function") {
        try { await plugin.snapshot({ label }); } catch (err) { /* optional */ }
      }
      const result = await plugin.getEvents({ since: nativeSince });
      if (epoch !== nativeEpoch || !Array.isArray(result?.events)) return;
      let changed = false;
      for (const item of result.events) {
        const sequence = Number(item?.sequence);
        if (!Number.isSafeInteger(sequence) || sequence <= nativeSince) continue;
        nativeSince = sequence;
        if (!/^native-audio-[a-z-]+$/.test(String(item.type || "")) ||
            !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(String(item.time || ""))) continue;
        const entry = { time: String(item.time), page: "/native-ios",
          type: item.type, nativeSequence: sequence };
        for (const key of NATIVE_KEYS) {
          if (item[key] !== undefined) entry[key] = item[key];
        }
        events.push(entry);
        changed = true;
      }
      if (changed) {
        events.sort((a, b) => String(a.time).localeCompare(String(b.time)));
        if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
        try { localStore?.setItem(LOG_KEY, JSON.stringify(events)); }
        catch (err) {
          try { root.sessionStorage?.setItem(LOG_KEY, JSON.stringify(events)); }
          catch (ignored) { /* Native observation must never block gameplay. */ }
        }
      }
    })().catch(() => { /* Native bridge is optional. */ })
      .finally(() => { nativeSyncPromise = null; });
    return nativeSyncPromise;
  }
  function observeNativeMilestone(type) {
    if (!nativePlugin() || !/^(feed-audio-resume-(attempt|failed|verified)|app-audio-(resume-verified|clock-stalled)|lifecycle-visibility)$/.test(type)) return;
    const now = Date.now();
    if (now - lastNativeSnapshotAt < 350) return;
    lastNativeSnapshotAt = now;
    const label = type === "lifecycle-visibility" ? "foreground" :
      type.endsWith("attempt") ? "resume-attempt" :
      type.endsWith("failed") || type.endsWith("stalled") ? "resume-failed" : "resume-verified";
    // Yield past the logging stack; observation must never delay audio calls.
    Promise.resolve().then(() => syncNativeEvents(label));
  }
  function clearNativeEvents() {
    nativeEpoch++;
    nativeSince = 0;
    const plugin = nativePlugin();
    if (plugin && nativeStarted && typeof plugin.clear === "function") {
      Promise.resolve().then(() => plugin.clear()).catch(() => {});
    }
  }

  function report() {
    return { version: 55, createdAt: new Date().toISOString(),
      environment, events: events.slice() };
  }
  function exportReport() { return JSON.stringify(report(), null, 2); }
  function clear() {
    clearNativeEvents();
    events = [];
    try { localStore?.removeItem(LOG_KEY); } catch (err) { }
    try { root.sessionStorage?.removeItem(LOG_KEY); } catch (err) { }
    record("diagnostics-cleared");
  }
  function downloadReport() {
    if (!doc?.createElement || !root.Blob || !root.URL?.createObjectURL) return false;
    try {
      const blob = new root.Blob([exportReport()], { type: "application/json" });
      const url = root.URL.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = "BibloZoo_Audio_Diagnostics.json";
      doc.body?.appendChild(link);
      link.click();
      link.remove();
      root.setTimeout?.(() => root.URL.revokeObjectURL(url), 2000);
      return true;
    } catch (err) { return false; }
  }

  // Developer UI is present ONLY when the persistent opt-in flag is enabled.
  // Text area permits manual Select All / Copy on iOS when downloads are blocked.
  function installDeveloperPanel() {
    if (!doc?.body || doc.getElementById("biblozooAudioDiagOpen")) return;
    const launcher = doc.createElement("button");
    launcher.id = "biblozooAudioDiagOpen";
    launcher.type = "button";
    launcher.textContent = "Audio log";
    launcher.setAttribute("aria-label", "Open developer audio diagnostics");
    launcher.style.cssText = "position:fixed;z-index:2147483630;right:8px;bottom:8px;" +
      "font:12px system-ui;padding:7px;color:#fff;background:#28223b;" +
      "border:1px solid #fff;border-radius:8px;opacity:.83";
    const panel = doc.createElement("div");
    panel.id = "biblozooAudioDiagPanel";
    panel.hidden = true;
    panel.style.cssText = "position:fixed;z-index:2147483640;inset:0;" +
      "box-sizing:border-box;padding:20px;background:#151222;color:#fff;" +
      "font:14px system-ui;overflow:auto";
    panel.innerHTML = '<h2>Developer Audio Diagnostics</h2>' +
      '<p>Audio events only. No microphone sound, spoken words, or profiles.</p>' +
      '<textarea aria-label="Audio diagnostic report" readonly spellcheck="false" ' +
      'style="width:100%;height:55vh;box-sizing:border-box;font:11px monospace"></textarea>' +
      '<p data-status role="status"></p>' +
      '<button type="button" data-action="copy">Copy log</button> ' +
      '<button type="button" data-action="share">Share log</button> ' +
      '<button type="button" data-action="download">Download JSON</button> ' +
      '<button type="button" data-action="clear">Clear log</button> ' +
      '<button type="button" data-action="disable">Disable diagnostics</button> ' +
      '<button type="button" data-action="close">Close</button>';
    const field = panel.querySelector("textarea");
    const status = panel.querySelector("[data-status]");
    const open = () => {
      field.value = exportReport(); panel.hidden = false; launcher.hidden = true;
      void syncNativeEvents("export").then(() => {
        if (!panel.hidden) field.value = exportReport();
      });
    };
    const close = () => { panel.hidden = true; launcher.hidden = false; };
    launcher.addEventListener("click", open);
    panel.addEventListener("click", async event => {
      const action = event.target?.getAttribute?.("data-action");
      if (!action) return;
      if (action === "close") return close();
      if (action === "clear") { clear(); field.value = exportReport(); status.textContent = "Log cleared."; return; }
      if (action === "disable") {
        nativeEpoch++;
        const plugin = nativePlugin();
        if (plugin && nativeStarted) void Promise.resolve().then(() => plugin.disable?.()).catch(() => {});
        try { localStore.setItem(ENABLE_KEY, "0"); } catch (err) { }
        status.textContent = "Diagnostics disabled for future page loads. Reload the app.";
        close(); launcher.remove(); return;
      }
      if (action === "download") {
        await syncNativeEvents("export"); field.value = exportReport();
        status.textContent = downloadReport() ? "Download requested." : "Download unavailable; copy the text instead.";
        return;
      }
      if (action === "copy") {
        await syncNativeEvents("export"); field.value = exportReport();
        try {
          if (!root.navigator?.clipboard?.writeText) throw new Error("Clipboard unavailable");
          await root.navigator.clipboard.writeText(field.value);
          status.textContent = "Copied to clipboard.";
        } catch (err) {
          field.focus(); field.select();
          status.textContent = "Select All and Copy the selected text manually.";
        }
        return;
      }
      if (action === "share") {
        await syncNativeEvents("export"); field.value = exportReport();
        try {
          if (!root.navigator?.share) throw new Error("Share unavailable");
          await root.navigator.share({ title: "BibloZoo Audio Diagnostics", text: field.value });
          status.textContent = "Share sheet opened.";
        } catch (err) {
          field.focus(); field.select();
          status.textContent = "Sharing unavailable or cancelled. Copy the selected text instead.";
        }
      }
    });
    doc.body.appendChild(launcher);
    doc.body.appendChild(panel);
  }
  if (doc?.readyState === "loading") doc.addEventListener("DOMContentLoaded", installDeveloperPanel, { once: true });
  else installDeveloperPanel();

  root.BibloZooAudioDiagnostics = Object.freeze({
    record, getEvents: () => events.slice(), getReport: report,
    exportReport, downloadReport, refreshNative: () => syncNativeEvents("manual"), showReport: () => doc?.getElementById("biblozooAudioDiagOpen")?.click(),
    clear
  });
  record("diagnostics-enabled", { environment });
  void syncNativeEvents("manual");
})(window);
