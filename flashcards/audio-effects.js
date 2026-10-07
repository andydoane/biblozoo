(() => {
  "use strict";

  const scriptUrl =
    document.currentScript?.src ||
    new URL(
      "flashcards/audio-effects.js",
      document.baseURI
    ).href;

  const vendorRoot = new URL(
    "vendor/soundtouchjs-2.1.1/",
    scriptUrl
  );

  const soundTouchModuleUrl = new URL(
    "SoundTouchNode.js",
    vendorRoot
  ).href;

  const soundTouchProcessorUrl = new URL(
    "soundtouch-processor.js",
    vendorRoot
  ).href;

  const PRESETS = Object.freeze({
    squirrel: Object.freeze({
      label: "Squirrel",
      category: "current",
      description: "Higher and a little faster.",
      semitones: 9,
      speed: 1.15
    }),
    giant: Object.freeze({
      label: "Giant",
      category: "current",
      description: "Lower and slightly slower.",
      semitones: -7,
      speed: 0.9
    }),
    monster: Object.freeze({
      label: "Monster",
      category: "current",
      description: "Very low and heavy.",
      semitones: -10,
      speed: 0.85
    }),
    turtle: Object.freeze({
      label: "Turtle",
      category: "current",
      description: "Slow with the original pitch.",
      semitones: 0,
      speed: 0.65
    }),
    rocket: Object.freeze({
      label: "Rocket",
      category: "current",
      description: "Fast with the original pitch.",
      semitones: 0,
      speed: 1.65
    }),
    wacky: Object.freeze({
      label: "Wacky",
      category: "current",
      description: "Pitch swoops up and down.",
      semitones: 0,
      speed: 1,
      pitchTargets: Object.freeze([
        7, -5, 8, -7, 6, -4
      ]),
      pitchStepSeconds: 0.7
    }),
    helium: Object.freeze({
      label: "Helium",
      category: "experimental",
      description: "One octave higher at normal speed.",
      semitones: 12,
      speed: 1
    }),
    deep_voice: Object.freeze({
      label: "Deep Voice",
      category: "experimental",
      description: "Lower pitch without slowing down.",
      semitones: -5,
      speed: 1
    }),
    sleepy: Object.freeze({
      label: "Sleepy",
      category: "experimental",
      description: "Extra slow with a small pitch drop.",
      semitones: -3,
      speed: 0.55
    }),
    speedster: Object.freeze({
      label: "Speedster",
      category: "experimental",
      description: "Fast and slightly higher.",
      semitones: 4,
      speed: 1.35
    }),
    roller_coaster: Object.freeze({
      label: "Roller Coaster",
      category: "experimental",
      description: "Wide, smooth pitch climbs and dives.",
      semitones: 0,
      speed: 1,
      pitchTargets: Object.freeze([
        12, -12, 10, -10
      ]),
      pitchStepSeconds: 0.75
    }),
    staircase: Object.freeze({
      label: "Staircase",
      category: "experimental",
      description: "Climbs upward in distinct pitch steps.",
      semitones: 0,
      speed: 1,
      pitchTargets: Object.freeze([
        -12, -8, -4, 0, 4, 8, 12
      ]),
      pitchStepSeconds: 0.45,
      steppedPitch: true
    }),
    wobble: Object.freeze({
      label: "Wobble",
      category: "experimental",
      description: "A quick, gentle pitch wobble.",
      semitones: 0,
      speed: 1,
      pitchTargets: Object.freeze([
        3, -3
      ]),
      pitchStepSeconds: 0.22
    })
  });

  let context = null;
  let soundTouchModulePromise = null;
  let processorRegistrationPromise = null;
  let activePlayback = null;
  let playbackGeneration = 0;

  function getAudioContextConstructor() {
    return (
      window.AudioContext ||
      window.webkitAudioContext ||
      null
    );
  }

  function isSupported() {
    const Context =
      getAudioContextConstructor();

    return !!(
      Context &&
      window.AudioWorkletNode &&
      Blob.prototype.arrayBuffer
    );
  }

  function disconnectPlayback(
    playback
  ) {
    if (!playback) return;

    clearTimeout(playback.finishTimer);
    playback.finishTimer = null;

    try {
      playback.source.onended = null;
      playback.source.disconnect();
    } catch (_) { }

    try {
      playback.soundTouch.disconnect();
    } catch (_) { }

    try {
      playback.gain.disconnect();
    } catch (_) { }
  }

  function stop() {
    playbackGeneration += 1;

    const playback = activePlayback;
    activePlayback = null;

    if (!playback) return false;

    try {
      playback.source.stop();
    } catch (_) { }

    disconnectPlayback(playback);
    playback.resolve?.(false);
    return true;
  }

  async function getRuntime() {
    if (!isSupported()) {
      throw new Error(
        "Wacky Replay is not supported on this device."
      );
    }

    if (context?.state === "closed") {
      context = null;
      processorRegistrationPromise = null;
    }

    if (!context) {
      const Context =
        getAudioContextConstructor();

      context = new Context({
        latencyHint: "playback"
      });
    }

    if (context.state !== "running") {
      await context.resume();
    }

    if (!soundTouchModulePromise) {
      soundTouchModulePromise = import(
        soundTouchModuleUrl
      );
    }

    let module = null;

    try {
      module =
        await soundTouchModulePromise;
    } catch (error) {
      soundTouchModulePromise = null;
      throw error;
    }

    if (!module?.SoundTouchNode) {
      throw new Error(
        "Wacky Replay audio could not load."
      );
    }

    if (!processorRegistrationPromise) {
      processorRegistrationPromise =
        module.SoundTouchNode.register(
          context,
          soundTouchProcessorUrl
        );
    }

    try {
      await processorRegistrationPromise;
    } catch (error) {
      processorRegistrationPromise = null;
      throw error;
    }

    return {
      context,
      SoundTouchNode:
        module.SoundTouchNode
    };
  }

  function scheduleDynamicPitch(
    parameter,
    startTime,
    duration,
    preset
  ) {
    const targets =
      preset.pitchTargets;
    const stepSeconds =
      preset.pitchStepSeconds;

    parameter.cancelScheduledValues(
      startTime
    );
    parameter.setValueAtTime(
      0,
      startTime
    );

    let targetIndex = 0;

    for (
      let offset = stepSeconds;
      offset < duration;
      offset += stepSeconds
    ) {
      const target =
        targets[
          targetIndex % targets.length
        ];

      if (preset.steppedPitch) {
        parameter.setValueAtTime(
          target,
          startTime + offset
        );
      } else {
        parameter.linearRampToValueAtTime(
          target,
          startTime + offset
        );
      }
      targetIndex += 1;
    }

    parameter.linearRampToValueAtTime(
      0,
      startTime + duration
    );
  }

  async function playRecordedVerse(
    blob,
    presetName
  ) {
    stop();

    if (!(blob instanceof Blob) || !blob.size) {
      throw new Error(
        "No recording is available."
      );
    }

    const preset =
      PRESETS[presetName];

    if (!preset) {
      throw new Error(
        "Unknown Wacky Replay preset."
      );
    }

    const generation =
      ++playbackGeneration;
    const runtime = await getRuntime();

    if (generation !== playbackGeneration) {
      return false;
    }

    const encodedAudio =
      await blob.arrayBuffer();

    if (generation !== playbackGeneration) {
      return false;
    }

    const audioBuffer =
      await runtime.context.decodeAudioData(
        encodedAudio
      );

    if (generation !== playbackGeneration) {
      return false;
    }

    const source =
      runtime.context.createBufferSource();
    const soundTouch =
      new runtime.SoundTouchNode({
        context: runtime.context,
        outputChannelCount: 2
      });
    const gain =
      runtime.context.createGain();

    source.buffer = audioBuffer;
    source.playbackRate.value =
      preset.speed;
    soundTouch.playbackRate.value =
      preset.speed;
    gain.gain.value = 0.88;

    const startTime =
      runtime.context.currentTime;
    const expectedDuration =
      Math.max(
        0.1,
        audioBuffer.duration /
          preset.speed
      );

    if (preset.pitchTargets?.length) {
      scheduleDynamicPitch(
        soundTouch.pitchSemitones,
        startTime,
        expectedDuration,
        preset
      );
    } else {
      soundTouch.pitchSemitones
        .setValueAtTime(
          preset.semitones,
          startTime
        );
    }

    source.connect(soundTouch);
    soundTouch.connect(gain);
    gain.connect(
      runtime.context.destination
    );

    return new Promise((resolve) => {
      const playback = {
        source,
        soundTouch,
        gain,
        finishTimer: null,
        resolve
      };

      const finish = () => {
        if (
          activePlayback !== playback
        ) {
          return;
        }

        activePlayback = null;
        disconnectPlayback(playback);
        resolve(true);
      };

      source.onended = () => {
        playback.finishTimer =
          window.setTimeout(
            finish,
            180
          );
      };

      activePlayback = playback;

      try {
        source.start();
      } catch (error) {
        activePlayback = null;
        disconnectPlayback(playback);
        resolve(false);
      }
    });
  }

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
    }
  );

  window.addEventListener(
    "pagehide",
    stop
  );

  window.BibloZooAudioEffects =
    Object.freeze({
      isSupported,
      getPresets: () =>
        Object.entries(PRESETS).map(
          ([id, preset]) => ({
            id,
            label: preset.label,
            category: preset.category,
            description:
              preset.description,
            semitones:
              preset.semitones,
            speed: preset.speed
          })
        ),
      playRecordedVerse,
      stop
    });
})();
