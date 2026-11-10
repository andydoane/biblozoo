/* N7f: output-only Read My Verse adapter for the *separate* native Audio
 * Test iOS bundle. Never overrides window.Audio, getUserMedia or WebAudio;
 * original browser/PWA/Android activity code remains unmodified in behavior.
 * AVAudioPlayer events/position, not timers or promises, prove completion.
 */
(function installNativeReadMyVerseOutput(root) {
  "use strict";
  const enabled = root.BibloZooNativeOnlyOutput?.enabled === true &&
    root.Capacitor?.isNativePlatform?.() === true &&
    root.Capacitor?.getPlatform?.() === "ios";
  if (!enabled) return;
  const api = () => root.Capacitor?.Plugins?.BibloZooNativeReadOutput;
  // N7g: ONLY in-flight clips belong in this map. The original constructor
  // retained every short Typewriter/Keyboard Audio forever, and stopAll()
  // cleared the map without re-registering reusable clips on Resume.
  const clips = new Map();
  let counter = 0;
  let activation = null;
  let lifecycleEpoch = 0;
  function invalidateActivation() {
    lifecycleEpoch++;
    activation = null;
  }
  let listenersReady = false;
  const inactiveCallbacks = new Set();
  const mkError = reason => Object.assign(
    new Error(String(reason || "native-read-audio-failed")),
    {name:"NotAllowedError"});
  function clipIdFor(src) {
    if (typeof src !== "string") return "";
    const verse = /^\.\/verse_audio\/([a-z0-9_-]{1,80})\.mp3$/.exec(src);
    if (verse) return "verse:" + verse[1];
    const fixed = Object.freeze({
      "./verse_images/read_my_verse/verse_crawl_theme_ducked.mp3":"crawl-theme",
      "./verse_images/read_my_verse/verse_crawl_theme_ending.mp3":"crawl-ending",
      "./verse_images/read_my_verse/typewriter_alert.mp3":"typewriter-alert",
      "./verse_images/read_my_verse/keyboard_alert.mp3":"keyboard-alert",
      "./verse_images/daily_questions/dq_incorrect.mp3":"incorrect"
    });
    if (fixed[src]) return fixed[src];
    const key = /^\.\/verse_images\/read_my_verse\/(typewriter|keyboard)_([1-7])\.mp3$/.exec(src);
    if (key && Number(key[2]) <= (key[1] === "typewriter" ? 3 : 7))
      return key[1] + "-" + key[2];
    return "";
  }
  function listen() {
    if (listenersReady || typeof api()?.addListener !== "function") return;
    listenersReady = true;
    Promise.resolve(api().addListener("biblozooReadOutput", event => {
      const audio = clips.get(event?.requestId);
      if (audio) audio._onNativeEvent(event);
    })).catch(()=>{ listenersReady = false; });
    // UIApplication.willResignActive arrives at the FIRST App Switcher
    // gesture; document.visibilitychange can arrive much later in WebKit.
    // Registration has no mic request, audio activation or playback.
    Promise.resolve(api().addListener("biblozooReadLifecycle", event => {
      if (event?.phase !== "willResignActive") return;
      invalidateActivation();
      for (const audio of [...clips.values()]) {
        if (!audio.paused || audio._playingRequest !== null) {
          audio._stopLocal();
          audio._emit("error");
        }
      }
      for (const callback of inactiveCallbacks) {
        try { callback(); } catch (_) { /* Don't strand another handler. */ }
      }
    })).catch(()=>{ listenersReady = false; });
  }
  function onAppInactive(callback) {
    if (typeof callback !== "function") return () => {};
    inactiveCallbacks.add(callback);
    listen();
    return () => inactiveCallbacks.delete(callback);
  }
  function activateFromGesture() {
    if (!enabled || root.document?.hidden ||
        typeof api()?.activateFromGesture !== "function")
      return Promise.resolve(false);
    listen();
    // Only the owner calling this in a real Start/Resume interaction can
    // request .soloAmbient takeover. Animated verse timers never reactivate.
    const epoch = ++lifecycleEpoch;
    activation = Promise.resolve(api().activateFromGesture())
      .then(r => epoch === lifecycleEpoch && r?.activated === true,
        () => false);
    return activation;
  }
  function stopCues() {
    try { return Promise.resolve(api()?.stopCues?.()).catch(()=>{}); }
    catch (_) { return Promise.resolve(); }
  }
  function stopAll() {
    invalidateActivation();
    for (const audio of [...clips.values()]) audio._stopLocal();
    clips.clear();
    try { return Promise.resolve(api()?.stopAll?.()).catch(()=>{}); }
    catch (_) { return Promise.resolve(); }
  }
  function playCue(kind, index=1, complete=false, wrong=false) {
    if (!enabled || root.document?.hidden || !activation) return false;
    if (!["order","scramble","negative"].includes(kind)) return false;
    const args={kind,index:Math.max(1,Math.min(64,Math.floor(index)||1)),
      complete:complete===true,wrong:wrong===true};
    const epoch = lifecycleEpoch;
    const claimedActivation = activation;
    // N7g: a queued cue may resolve AFTER Exit/lock/external AirPods Play.
    // A stale gesture must never launch a new native note after revocation.
    // No browser oscillator fallback or raw child PCM crosses this bridge.
    void Promise.resolve(claimedActivation).then(ready=>{
      if (!ready || epoch !== lifecycleEpoch ||
          activation !== claimedActivation || root.document?.hidden) return;
      return Promise.resolve(api()?.playCue?.(args)).catch(()=>{});
    }).catch(()=>{});
    return true;
  }
  class NativeAudio {
    constructor(src) {
      this._src=String(src||"");
      this.preload="none";
      this.loop=false;
      this.muted=false;
      this.volume=1;
      this.ended=false;
      this.paused=true;
      this.duration=NaN;
      this._position=0;
      this._handlers=new Map();
      this._generation=0;
      this._playingRequest=null;
      this._requestId="";
      this._clipId=clipIdFor(this._src);
      listen();
      // N7g: a newly allocated Audio object is not itself an active player.
      // Register only when play() actually starts a native attempt.
    }
    get src() { return this._src; }
    set src(value) {
      const next=String(value||"");
      if(next===this._src) return;
      // Media src may be replaced on a reused Audio object. Retire the
      // previous native player and validate the NEW fixed asset key; do not
      // accidentally play the previous verse under an updated src string.
      if(this._requestId) this.pause();
      this._src=next;
      this._clipId=clipIdFor(next);
      this._position=0;
      this.duration=NaN;
      this.ended=false;
    }
    get currentTime() {return this._position;}
    set currentTime(value) {
      const target=Number(value);
      if(!Number.isFinite(target))return;
      this._position=Math.max(0,target);
      this.ended=false;
      if(this._playingRequest && this._requestId) {
        try{void Promise.resolve(api()?.seekClip?.({
          requestId:this._requestId,positionMs:this._position*1000
        })).catch(()=>{});}catch(_){}
      }
    }
    setAttribute(name,value) {
      if(name==="src") this.src=String(value||"");
    }
    removeAttribute(name) {
      if(name==="src") this.src="";
    }
    load() { /* Bundled native audio is loaded exclusively on a real Play. */ }
    addEventListener(name,fn,options) {
      if(typeof fn!=="function")return;
      const entries=this._handlers.get(name)||[];
      entries.push({fn,once:options?.once===true});
      this._handlers.set(name,entries);
    }
    removeEventListener(name,fn) {
      this._handlers.set(name,(this._handlers.get(name)||[])
        .filter(item=>item.fn!==fn));
    }
    _emit(name) {
      const entries=[...(this._handlers.get(name)||[])];
      for(const entry of entries) {
        if(entry.once)this.removeEventListener(name,entry.fn);
        try{entry.fn({type:name,target:this});}catch(_){}
      }
    }
    _onNativeEvent(event) {
      if(!this._playingRequest || this._playingRequest!==this._generation)
        return;
      if(Number.isFinite(event.positionMs))
        this._position=Math.max(0,event.positionMs/1000);
      if(Number.isFinite(event.durationMs) && event.durationMs>0)
        this.duration=event.durationMs/1000;
      if(event.kind==="started" || event.kind==="progress") {
        this.paused=false;return;
      }
      if(event.kind==="ended") {
        this.ended=true;
        this.paused=true;
        this._releaseCurrent();
        this._playingRequest=null;
        this._emit("ended"); // native AVAudioPlayerDelegate only
      } else if(event.kind==="interrupted") {
        this.paused=true;
        this._releaseCurrent();
        this._playingRequest=null;
        this._emit("error"); // never a fake 'ended'
      }
    }
    _releaseCurrent() {
      if (this._requestId && clips.get(this._requestId) === this)
        clips.delete(this._requestId);
    }
    _stopLocal() {
      this._releaseCurrent();
      this._generation++;
      this._playingRequest=null;
      this.paused=true;
      this.ended=false;
    }
    pause() {
      const id=this._requestId;
      this._stopLocal();
      try{void Promise.resolve(api()?.stopClip?.({requestId:id})).catch(()=>{});}
      catch(_){}
    }
    async play() {
      if(root.document?.hidden || !this._clipId ||
         typeof api()?.playClip!=="function") {
        this._emit("error");
        throw mkError("unavailable-clip");
      }
      if(!activation) {
        this._emit("error");
        throw mkError("needs-real-gesture");
      }
      if (this._playingRequest !== null) return true;
      const epoch=++this._generation;
      // Fresh request ID per playback, not per Audio object. If an old
      // ended/interrupt event arrives after Pause→Play/Welcome Back, it
      // cannot complete the replacement clip with the same owner.
      const requestId="rmv-"+(++counter);
      this._requestId=requestId;
      this._playingRequest=epoch;
      this.ended=false;
      clips.set(requestId,this);
      const claim=activation;
      try {
        if(await claim!==true || activation!==claim)
          throw mkError("audio-session-denied");
        if(epoch!==this._generation || root.document?.hidden)
          throw mkError("stale-or-inactive");
        const started=await api().playClip({
          requestId,clipId:this._clipId,
          positionMs:Math.max(0,this._position*1000),
          volume:this.muted?0:Math.max(0,Math.min(1,this.volume))
        });
        if(epoch!==this._generation || root.document?.hidden ||
           activation!==claim){
          try{void api()?.stopClip?.({requestId});}catch(_){}
          throw mkError("stale-or-hidden");
        }
        if(started?.started!==true)throw mkError(started?.reason);
        if(Number.isFinite(started.durationMs) && started.durationMs>0)
          this.duration=started.durationMs/1000;
        if(Number.isFinite(started.positionMs) && !this.ended)
          this._position=started.positionMs/1000;
        // Native can actually finish a very short clip BEFORE this
        // asynchronous bridge start response reaches JS. Never resurrect
        // an already ended/stopped/interrupted media owner on late ACK.
        if(!this.ended && this._playingRequest!==epoch)
          throw mkError("interrupted-before-ack");
        if(!this.ended) this.paused=false;
        this._emit("loadedmetadata");
        return true; // ACK is NOT an ended event
      } catch(err) {
        if(epoch===this._generation) {
          this._releaseCurrent();
          this._playingRequest=null;this.paused=true;
          this._emit("error");
        }
        throw err;
      }
    }
  }
  root.document?.addEventListener?.("visibilitychange",()=>{
    if(root.document?.hidden) {
      invalidateActivation();
      for(const audio of [...clips.values()]){
        if(!audio.paused || audio._playingRequest!==null) {
          audio._stopLocal();
          audio._emit("error");
        }
      }
    }
  });
  root.addEventListener?.("pagehide",stopAll);
  // Always listen for app-state changes, even during a purely visual
  // Balloon/Fish/Typewriter/Keyboard sequence without active narration.
  listen();
  root.BibloZooNativeReadOutputController=Object.freeze({
    enabled:true,NativeAudio,clipIdFor,activateFromGesture,
    onAppInactive,playCue,stopCues,stopAll
  });
})(window);
