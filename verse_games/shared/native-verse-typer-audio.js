/* N6n: Verse Typer eight correct-note pitches and eight fixed generated tones/noise + two shared native UI pops.
 * Reuse sole Swift .soloAmbient and serialized predecoded AVAudioEngine PCM;
 * never fall back to Web or HTML Audio on native iOS.
 */
(function installNativeVerseTyperAudio(root) {
  "use strict";
  const KEYS = Object.freeze({
    uiTap1: "ui-pop-1",
    uiTap2: "ui-pop-2",
    note55: "typer-note-55",
    note60: "typer-note-60",
    note62: "typer-note-62",
    note64: "typer-note-64",
    note65: "typer-note-65",
    note67: "typer-note-67",
    note69: "typer-note-69",
    note71: "typer-note-71",
    note72: "typer-note-72",
    wrong: "typer-wrong",
    wordDone: "typer-word-done",
    popup: "typer-popup",
    cocoon: "typer-cocoon",
    flap0: "typer-flap0",
    flap1: "typer-flap1",
    flap2: "typer-flap2",
    flyAway: "typer-fly-away"
  });
  const IDS = Object.freeze(Object.values(KEYS)); // 9 correct pitches + 8 fixed effects + 2 UI = 19
  const UI_IDS = Object.freeze(["ui-pop-1", "ui-pop-2"]);
  const UI_FIRST_TAP_MAX_DELAY_MS = 350; // N5a: no late cold-start pop
  const SESSION_TIMEOUT_MS = 1800;
  const BANK_TIMEOUT_MS = 15000; // fixed 19-ID bank; no hot decode
  const PLAY_TIMEOUT_MS = 1800;
  let generation = 0;
  let ready = false;
  let failed = false;
  let lastError = "";
  let nextEvent = 0;
  let bound = false;
  let onFailure = null;
  let onInactive = null;
  let onActive = null;
  let teardown = Promise.resolve();
  let uiReady = false; // UI bank does not imply gameplay readiness
  let uiPreparation = null;
  // Use the existing N5b published-verse native narrator. A chunk is never
  // accepted as "heard" until its matching AVAudioPlayerDelegate ended.
  let chunkSequence=120000+Math.floor(Math.random()*500000),activeChunk=null;
  function stopChunk(){
    const old=activeChunk;
    if(!old)return;
    activeChunk=null;
    root.clearTimeout(old.poll);
    root.clearTimeout(old.watchdog);
    old.resolve({ended:false,reason:"interrupted",positionMs:old.positionMs});
    try{void Promise.resolve(api()?.stopNarration?.({requestId:old.id})).catch(()=>{});}
    catch(_){}
  }
  function settleChunk(id,ended,why="ended"){
    const old=activeChunk;
    if(!old || old.id!==id)return;
    activeChunk=null;
    root.clearTimeout(old.poll);
    root.clearTimeout(old.watchdog);
    old.resolve({ended,reason:why,positionMs:old.positionMs});
  }
  function pollChunk(id){
    const old=activeChunk;
    if(!old || old.id!==id)return;
    try{void Promise.resolve(api()?.getNarrationState?.()).then(st=>{
      if(activeChunk?.id!==id)return;
      if(st?.requestId===id && Number.isFinite(st.positionMs))
        activeChunk.positionMs=Math.max(activeChunk.positionMs,st.positionMs);
    }).catch(()=>{});}catch(_){}
    if(activeChunk?.id===id)
      old.poll=root.setTimeout(()=>pollChunk(id),220);
  }
  function playChunk(verseId,partIndex,positionMs=0){
    if(!isAvailable() || !ready || failed || root.document?.hidden ||
       !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(verseId) ||
       !Number.isInteger(partIndex) || partIndex<1 || partIndex>26)
      return Promise.resolve({ended:false,reason:"invalid-native-chunk",positionMs});
    stopChunk();
    const id=++chunkSequence;
    return new Promise(resolve=>{
      const current={id,resolve,positionMs:Math.max(0,positionMs),poll:0};
      activeChunk=current;
      void (async()=>{
        try {
          const bridge=api(),soundId="learn-part-"+verseId+"-"+partIndex;
          const prep=await bounded(bridge.prepareNarration({soundId,requestId:id}),5000);
          if(activeChunk?.id!==id)return;
          if(prep?.prepared!==true){
            settleChunk(id,false,reason(prep?.reason));return;
          }
          if(current.positionMs>0 && current.positionMs<prep.durationMs-100){
            const seek=await bounded(bridge.seekNarration({
              requestId:id,positionMs:Math.floor(current.positionMs)}),3500);
            if(activeChunk?.id!==id)return;
            if(seek?.seeked!==true){settleChunk(id,false,"seek-failed");return;}
          }
          const played=await bounded(bridge.playNarration({requestId:id}),5000);
          if(activeChunk?.id!==id)return;
          if(played?.accepted!==true){
            settleChunk(id,false,reason(played?.reason));return;
          }
          pollChunk(id);
          // If AVAudioPlayerDelegate never arrives, expose genuine failure
          // rather than hanging forever or falsely claiming the verse heard.
          const watchdog=Math.max(8000,Math.min(90000,
            (Number(prep.durationMs)||10000)+7000));
          current.watchdog=root.setTimeout(()=>
            settleChunk(id,false,"narration-ended-timeout"),watchdog);
          // NO timeout completion. Only matching native 'ended' releases the
          // same word-review progression; OS interruption stops/preserves it.
        }catch(_){settleChunk(id,false,"narration-bridge-error");}
      })();
    });
  }

  function isAvailable() {
    return root.BibloZooNativeOnlyOutput?.enabled === true &&
      root.Capacitor?.isNativePlatform?.() === true &&
      root.Capacitor?.getPlatform?.() === "ios";
  }
  function api() { return root.Capacitor?.Plugins?.BibloZooNativeSound; }
  function reason(value) {
    return typeof value === "string" &&
      /^[a-z][a-z0-9-]{0,65}$/.test(value) ? value : "native-error";
  }
  function bounded(promise, ms) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject) => {
        timer = root.setTimeout(() => reject(Error("timeout")), ms);
      })
    ]).finally(() => root.clearTimeout(timer));
  }
  function stopNative() {
    // Swift stop for any one fixed PCM ID discards ALL warmed effects.
    // Never call stopNarration or touch the long-form Learn owner.
    if (!isAvailable()) return Promise.resolve();
    try {
      return Promise.resolve(api()?.stop?.({soundId:"typer-note-55"}))
        .catch(() => {});
    } catch (_) { return Promise.resolve(); }
  }
  function stop() {
    stopChunk();
    generation++;
    ready = false;
    uiReady = false;
    failed = false;
    // Track the worker teardown so an immediate menu-close tap can activate
    // synchronously yet MUST wait for old AVAudioEngine disposal before
    // preloading any new bank; prevents late Stop from clearing fresh voices.
    teardown = stopNative();
    return teardown;
  }
  function invalidate() { void stop(); }
  function bind() {
    if (bound || !isAvailable()) return;
    bound = true;
    root.document?.addEventListener?.("visibilitychange", () => {
      if (root.document?.hidden) invalidate();
    });
    root.addEventListener?.("pagehide", invalidate);
    root.addEventListener?.("blur", invalidate);
    try {
      Promise.resolve(api()?.addListener?.("biblozooNarration",event=>{
        if(!activeChunk || event?.requestId!==activeChunk.id)return;
        if(event.type==="ended")settleChunk(event.requestId,true,"ended");
        else if(event.type==="invalidated" || event.type==="failed")
          settleChunk(event.requestId,false,reason(event.reason||event.type));
      })).catch(()=>{});
    }catch(_){}
    try {
      Promise.resolve(api()?.addListener?.("biblozooAppLifecycle", event => {
        if (event?.active === false || event?.active === true) invalidate();
        if (event?.active === false) {
          // UIKit swipe-up-and-HOLD can make WebKit appear visible.
          // Notify Verse Typer owner to freeze its game and bonus clocks too.
          try { onInactive?.(); } catch (_) { /* Never restart audio. */ }
        } else if (event?.active === true) {
          // Reveal Welcome Back only; activation still needs a new tap.
          try { onActive?.(); } catch (_) { /* Never auto-play. */ }
        }
      })).catch(() => {});
    } catch (_) { /* UIKit/visibility remain output safety fences. */ }
  }
  function current(token) {
    return isAvailable() && generation === token && !root.document?.hidden;
  }
  // A competing YouTube PiP/phone audio session is an OS interruption,
  // not a permanently corrupt MP3. Freeze this game and show its existing
  // plain Welcome Back instead of trapping the child in gray Try Again.
  // Genuine missing PCM/bridge failures still use onPlaybackFailure.
  const TEMPORARY_AUDIO_REASONS = new Set([
    "other-audio-playing", "interruption-pending",
    "gesture-required-after-interruption", "not-foreground", "stale",
    "activation-cooldown", "foreground-attempt-limit",
    // iOS may reject a real foreground takeover while higher-priority audio
    // (e.g. a call) plays. Remain paused/retriable, never fatal PCM error.
    "activation-os-rejected"
  ]);
  function markFailed(token, why) {
    if (!current(token) || failed) return;
    if (TEMPORARY_AUDIO_REASONS.has(reason(why))) {
      lastError = reason(why);
      invalidate(); // invalidate all hot voices; no automatic restart
      try { onInactive?.(); } catch (_) {}
      if (!root.document?.hidden) {
        try { onActive?.(); } catch (_) {}
      }
      return;
    }
    ready = false;
    uiReady = false;
    failed = true;
    lastError = reason(why);
    teardown = stopNative();
    try { onFailure?.(lastError); } catch (_) { /* Never mutate game logic. */ }
  }
  function configure({ onPlaybackFailure, onAppInactive, onAppActive } = {}) {
    onFailure = typeof onPlaybackFailure === "function" ?
      onPlaybackFailure : null;
    onInactive = typeof onAppInactive === "function" ?
      onAppInactive : null;
    onActive = typeof onAppActive === "function" ?
      onAppActive : null;
  }
  // Title/back taps precede the full game bank. Prepare only the two fixed
  // Swift PCM UI effects on a real gesture; this never means gameplay is ready.
  function dispatchUi(key, volume) {
    const soundId = KEYS[key];
    if (!UI_IDS.includes(soundId) || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1 || root.document?.hidden) return Promise.resolve(false);
    try {
      return bounded(api().play({
        soundId, volume, eventId: "typer-ui-" + (++nextEvent),
        requestEpochMs: Date.now()
      }), PLAY_TIMEOUT_MS).then(result => result?.accepted === true)
        .catch(() => false);
    } catch (_) { return Promise.resolve(false); }
  }
  function tapUiFromGesture(key, volume) {
    if (!isAvailable() || root.document?.hidden ||
        !UI_IDS.includes(KEYS[key]) || !Number.isFinite(volume) ||
        volume <= 0 || volume > 1) return false;
    bind();
    if (ready && !failed) return play(key, volume);
    if (uiReady && !failed) {
      void dispatchUi(key, volume);
      return true;
    }
    // Duplicate rapid title taps must not start competing PCM banks or
    // create delayed ghosts after the child changes screens.
    if (uiPreparation) return false;
    const token = ++generation;
    failed = false;
    let activation;
    try { activation = api()?.activateFromGesture({purpose:"ui"}); }
    catch (_) { return false; }
    const startedAt = Date.now();
    const pending = (async () => {
      try {
        await bounded(teardown, SESSION_TIMEOUT_MS);
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token) || session?.ready !== true) return false;
        const clips = await bounded(Promise.all(UI_IDS.map(soundId =>
          api().preload({soundId}))), BANK_TIMEOUT_MS);
        if (!current(token) || clips.some(result =>
          result?.prepared !== true ||
          typeof result.durationMs !== "number" || result.durationMs <= 0)) return false;
        uiReady = true;
        if (Date.now() - startedAt <= UI_FIRST_TAP_MAX_DELAY_MS)
          return dispatchUi(key, volume);
        return false; // Never replay a stale cold-start tap seconds later.
      } catch (_) { return false; }
    })();
    uiPreparation = pending;
    void pending.finally(() => {
      if (uiPreparation === pending) uiPreparation = null;
    });
    return true; // Request scheduled, not evidence of speaker output.
  }

  // IMPORTANT: activateFromGesture is invoked in the SAME synchronous stack
  // as the child's actual mode selection / Retry / Resume button event.
  function prepareFromGesture(uiTap = null) {
    if (uiTap && (!UI_IDS.includes(KEYS[uiTap.key]) ||
        !Number.isFinite(uiTap.volume) || uiTap.volume <= 0 || uiTap.volume > 1))
      return Promise.resolve({ready:false,reason:"invalid-ui-pop"});
    if (!isAvailable() || root.document?.hidden)
      return Promise.resolve({ready:false,reason:"not-native-ios"});
    bind();
    const prior = ready;
    const precedingUi = uiPreparation; // settle prior title preload before new bank
    const token = ++generation;
    ready = false;
    uiReady = false;
    failed = false;
    lastError = "";
    const bridge = api();
    if (!["activateFromGesture","preload","play","stop"].every(
      key => typeof bridge?.[key] === "function"))
      return Promise.resolve({ready:false,reason:"missing-bridge"});
    let activation;
    try { activation = bridge.activateFromGesture({ purpose: "game" }); }
    catch (_) { return Promise.resolve({ready:false,reason:"activation-error"}); }
    const cleanup = prior ? stopNative() : teardown;
    return (async () => {
      try {
        await bounded(Promise.all([cleanup, precedingUi || Promise.resolve()]), SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        const session = await bounded(activation, SESSION_TIMEOUT_MS);
        if (!current(token)) return {ready:false,reason:"stale"};
        if (session?.ready !== true) {
          const why = reason(session?.reason);
          if (TEMPORARY_AUDIO_REASONS.has(why)) {
            // A competing PiP stream is an OS busy state, NOT corrupt PCM.
            // Cancel the pending Start/Close callback and let the game's
            // plain Welcome Back own the next real recovery gesture.
            lastError = why;
            invalidate();
            try { onInactive?.(); } catch (_) {}
            if (!root.document?.hidden) {
              try { onActive?.(); } catch (_) {}
            }
          }
          return {ready:false,reason:why};
        }
        // Prepare 17 fixed Verse Typer generated cues (9 correct pitches + 8 effects) plus 2 UI pops before gameplay.
        // Swift serializes AVAudioEngine mutations on its existing worker.
        // For a mode/Close gesture, schedule its native UI pop after the two
        // UI clips preload but BEFORE decoding the gameplay bank.
        let prepared;
        if (uiTap) {
          const uiClips = await bounded(Promise.all(UI_IDS.map(soundId =>
            bridge.preload({soundId}))), BANK_TIMEOUT_MS);
          if (!current(token)) return {ready:false,reason:"stale"};
          if (uiClips.some(result => result?.prepared !== true ||
              typeof result.durationMs !== "number" || result.durationMs <= 0)) {
            teardown = stopNative();
            return {ready:false,reason:"ui-pop-preflight-failed"};
          }
          const uiPlayed = await bounded(dispatchUi(uiTap.key, uiTap.volume), PLAY_TIMEOUT_MS);
          if (!current(token)) return {ready:false,reason:"stale"};
          if (!uiPlayed) {
            teardown = stopNative();
            return {ready:false,reason:"ui-pop-play-failed"};
          }
          const effects = await bounded(Promise.all(IDS.filter(soundId =>
            !UI_IDS.includes(soundId)).map(soundId =>
            bridge.preload({soundId}))), BANK_TIMEOUT_MS);
          prepared = [...uiClips, ...effects];
        } else {
          prepared = await bounded(Promise.all(IDS.map(soundId =>
            bridge.preload({ soundId }))), BANK_TIMEOUT_MS);
        }
        if (!current(token)) {
          // The stop that invalidated this generation already tore down its
          // worker queue. A stale Promise MUST NOT queue a second Stop after
          // a newer legitimate gesture has prepared its own warm bank.
          return {ready:false,reason:"stale"};
        }
        const rejected = prepared.find((result,index) =>
          result?.prepared !== true ||
          // A returned status alone is never evidence of speaker audibility.
          typeof result.durationMs !== "number" || result.durationMs <= 0);
        if (rejected) {
          lastError = reason(rejected.reason);
          failed = true;
          teardown = stopNative();
          return {ready:false,reason:lastError};
        }
        ready = true;
        uiReady = true;
        return {ready:true,reason:"prepared"};
      } catch (_) {
        if (current(token)) {
          failed = true;
          lastError = "preflight-timeout-or-error";
          teardown = stopNative();
        }
        return {ready:false,reason:lastError || "stale"};
      }
    })();
  }
  function play(key, volume) {
    if (!isAvailable() || !ready || failed || root.document?.hidden ||
        typeof KEYS[key] !== "string" ||
        !Number.isFinite(volume) || volume < 0 || volume > 1) return false;
     const soundId = KEYS[key];
    const token = generation;
    const timestamp = Date.now();
    try {
      // A correct-note, magnet fall, word, fanfare or bonus cue never decodes or starts an engine.
      void bounded(api().play({
        soundId, volume, eventId:"typer-" + (++nextEvent),
        requestEpochMs:timestamp
      }), PLAY_TIMEOUT_MS).then(result => {
        if (current(token) && result?.accepted !== true)
          markFailed(token, result?.reason);
      }).catch(() => { if (current(token)) markFailed(token, "play-timeout"); });
      return true; // dispatched, NOT acoustic proof
    } catch (_) {
      markFailed(token, "play-bridge-error");
      return false;
    }
  }
  root.BibloZooNativeVerseTyperAudio = Object.freeze({
    isAvailable, configure, prepareFromGesture, tapUiFromGesture, play, stop,
    playChunk, stopChunk,
    isReady: () => ready && !failed && !root.document?.hidden,
    lastError: () => lastError,
    soundIds: IDS
  });
})(window);
