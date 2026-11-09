/* N6p: Wheel of Bible 36 exact source-authored fixed MIDI/duration/volume/waveform recipes plus 2 shared UI pops; native published verse/reference narration uses existing N5b player.
 * Reuse sole Swift .soloAmbient and serialized predecoded AVAudioEngine PCM;
 * never fall back to Web or HTML Audio on native iOS.
 */
(function installNativeWheelOfBibleAudio(root) {
  "use strict";
  const KEYS = Object.freeze({
    uiTap1: "ui-pop-1",
    uiTap2: "ui-pop-2",
    t50_45_120_q: "wheel-note-50-45-120-q",
    t53_45_120_q: "wheel-note-53-45-120-q",
    t56_45_120_q: "wheel-note-56-45-120-q",
    t67_100_240_t: "wheel-note-67-100-240-t",
    t71_100_240_t: "wheel-note-71-100-240-t",
    t75_100_240_t: "wheel-note-75-100-240-t",
    t72_100_280_t: "wheel-note-72-100-280-t",
    t79_140_220_t: "wheel-note-79-140-220-t",
    t60_130_480_t: "wheel-note-60-130-480-t",
    t62_130_480_t: "wheel-note-62-130-480-t",
    t64_130_480_t: "wheel-note-64-130-480-t",
    t65_130_480_t: "wheel-note-65-130-480-t",
    t67_130_480_t: "wheel-note-67-130-480-t",
    t69_130_480_t: "wheel-note-69-130-480-t",
    t71_130_480_t: "wheel-note-71-130-480-t",
    t72_130_480_t: "wheel-note-72-130-480-t",
    t43_130_320_s: "wheel-note-43-130-320-s",
    t38_120_240_s: "wheel-note-38-120-240-s",
    t64_80_180_t: "wheel-note-64-80-180-t",
    t66_80_180_t: "wheel-note-66-80-180-t",
    t68_80_180_t: "wheel-note-68-80-180-t",
    t70_80_180_t: "wheel-note-70-80-180-t",
    t72_80_180_t: "wheel-note-72-80-180-t",
    t72_100_250_t: "wheel-note-72-100-250-t",
    t76_100_240_t: "wheel-note-76-100-240-t",
    t84_180_280_t: "wheel-note-84-180-280-t",
    t67_80_180_t: "wheel-note-67-80-180-t",
    t72_90_180_t: "wheel-note-72-90-180-t",
    t76_120_160_t: "wheel-note-76-120-160-t",
    t72_35_70_t: "wheel-note-72-35-70-t",
    t73_35_70_t: "wheel-note-73-35-70-t",
    t74_35_70_t: "wheel-note-74-35-70-t",
    t75_35_70_t: "wheel-note-75-35-70-t",
    t76_35_70_t: "wheel-note-76-35-70-t",
    t77_35_70_t: "wheel-note-77-35-70-t",
    t78_35_70_t: "wheel-note-78-35-70-t"
  });
  const IDS = Object.freeze(Object.values(KEYS)); // 36 source tones + 2 shared UI
  const UI_IDS = Object.freeze(["ui-pop-1", "ui-pop-2"]);
  const UI_FIRST_TAP_MAX_DELAY_MS = 350; // N5a: no late cold-start pop
  const SESSION_TIMEOUT_MS = 1800;
  const BANK_TIMEOUT_MS = 24000; // 28-ID sound bank: 18 MP3s decoded serially during preflight only
  const PLAY_TIMEOUT_MS = 1800;
  const MOWER_ID = "wheel-mower";
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
  // Reuse the one existing published-verse AVAudioPlayer, never a new
  // AVAudioSession or Web HTML audio element on native iOS.
  let narratorSequence=650000+Math.floor(Math.random()*100000);
  let activeNarration=null;
  function stopSpoken(){
    const old=activeNarration;
    if(!old)return;
    activeNarration=null;
    root.clearTimeout(old.poll);
    root.clearTimeout(old.watchdog);
    old.resolve({ended:false,reason:"interrupted",positionMs:old.positionMs});
    try{void Promise.resolve(api()?.stopNarration?.({requestId:old.id})).catch(()=>{});}catch(_){}
  }
  function settleSpoken(id,ended,why="ended"){
    const old=activeNarration;
    if(!old || old.id!==id)return;
    activeNarration=null;
    root.clearTimeout(old.poll);
    root.clearTimeout(old.watchdog);
    old.resolve({ended,reason:why,positionMs:old.positionMs});
  }
  function pollSpoken(id){
    const old=activeNarration;
    if(!old || old.id!==id)return;
    try{void Promise.resolve(api()?.getNarrationState?.()).then(st=>{
      if(activeNarration?.id!==id)return;
      if(st?.requestId===id && Number.isFinite(st.positionMs))
        activeNarration.positionMs=Math.max(activeNarration.positionMs,st.positionMs);
    }).catch(()=>{});}catch(_){}
    if(activeNarration?.id===id)
      old.poll=root.setTimeout(()=>pollSpoken(id),220);
  }
  function playSpoken(verseId,kind,positionMs=0){
    if(!isAvailable() || !ready || failed || root.document?.hidden ||
       !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(verseId) ||
       !["verse","ref"].includes(kind))
      return Promise.resolve({ended:false,reason:"invalid-native-spoken",positionMs});
    stopSpoken();
    const id=++narratorSequence;
    return new Promise(resolve=>{
      const current={id,resolve,positionMs:Math.max(0,positionMs),poll:0,watchdog:0};
      activeNarration=current;
      void (async()=>{
        try{
          const bridge=api(),soundId="learn-"+kind+"-"+verseId;
          const prepared=await bounded(bridge.prepareNarration({soundId,requestId:id}),6000);
          if(activeNarration?.id!==id)return;
          if(prepared?.prepared!==true){
            settleSpoken(id,false,reason(prepared?.reason));return;
          }
          if(current.positionMs>0 && current.positionMs<prepared.durationMs-100){
            const seek=await bounded(bridge.seekNarration({
              requestId:id,positionMs:Math.floor(current.positionMs)}),4000);
            if(activeNarration?.id!==id)return;
            if(seek?.seeked!==true){settleSpoken(id,false,"seek-failed");return;}
          }
          const playing=await bounded(bridge.playNarration({requestId:id}),6000);
          if(activeNarration?.id!==id)return;
          if(playing?.accepted!==true){
            settleSpoken(id,false,reason(playing?.reason));return;
          }
          pollSpoken(id);
          current.watchdog=root.setTimeout(()=>settleSpoken(id,false,
            "narration-ended-timeout"),
            Math.max(8000,Math.min(90000,(Number(prepared.durationMs)||10000)+7000)));
          // Only the MATCHING AVAudioPlayerDelegate ended event advances.
        }catch(_){settleSpoken(id,false,"narration-bridge-error");}
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
      return Promise.resolve(api()?.stop?.({soundId:"wheel-note-50-45-120-q"}))
        .catch(() => {});
    } catch (_) { return Promise.resolve(); }
  }
  function stop() {
    stopSpoken();
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
        if(!activeNarration || event?.requestId!==activeNarration.id)return;
        if(event.type==="ended")settleSpoken(event.requestId,true,"ended");
        else if(event.type==="invalidated" || event.type==="failed")
          settleSpoken(event.requestId,false,reason(event.reason||event.type));
      })).catch(()=>{});
    }catch(_){}
    try {
      Promise.resolve(api()?.addListener?.("biblozooAppLifecycle", event => {
        if (event?.active === false || event?.active === true) invalidate();
        if (event?.active === false) {
          // UIKit swipe-up-and-HOLD can make WebKit appear visible.
          // Notify Wheel of Bible owner to freeze its game and bonus clocks too.
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
        soundId, volume, eventId: "wheel-ui-" + (++nextEvent),
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
        // Prepare all 28 exact Wheel of Bible IDs: 18 shipped effects, 7 fixed sine progress pitches, 1 fixed finish fanfare, 2 shared UI pops.
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
      // A brush, bite, sticker, progress note, mower or finish cue only schedules prewarmed native PCM.
      void bounded(api().play({
        soundId, volume, eventId:"wheel-" + (++nextEvent),
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
  root.BibloZooNativeWheelOfBibleAudio = Object.freeze({
    isAvailable, configure, prepareFromGesture, tapUiFromGesture, play, stop,
    playSpoken, stopSpoken,
    isReady: () => ready && !failed && !root.document?.hidden,
    lastError: () => lastError,
    soundIds: IDS
  });
})(window);
