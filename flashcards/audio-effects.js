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
    }),
    alien: Object.freeze({
      label: "Alien",
      category: "experimental",
      description: "A shifting voice with a sweeping space filter.",
      pitchLabel: "Moving",
      characterLabel: "Alien filter",
      semitones: 0,
      speed: 0.96,
      pitchTargets: Object.freeze([
        5, 9, 3, 8
      ]),
      pitchStepSeconds: 0.38,
      characterEffect: "alien",
      filterHz: 1450,
      filterDepthHz: 650,
      filterModulationHz: 4.5
    }),
    alien_echo: Object.freeze({
      label: "Alien Echo",
      category: "experimental",
      description: "A high alien voice with a fading space echo.",
      pitchLabel: "+7",
      characterLabel: "Echo",
      semitones: 7,
      speed: 0.93,
      characterEffect: "alien_echo",
      filterHz: 1650,
      filterDepthHz: 500,
      filterModulationHz: 3.2,
      delaySeconds: 0.18,
      feedback: 0.3,
      tailSeconds: 0.75
    }),
    classic_robot: Object.freeze({
      label: "Classic Robot",
      category: "experimental",
      description: "Metallic voice modulation with a focused robot tone.",
      pitchLabel: "Original",
      characterLabel: "42 Hz robot",
      semitones: 0,
      speed: 1,
      characterEffect: "robot",
      modulationHz: 42,
      filterType: "bandpass",
      filterHz: 1350,
      filterQ: 1.1,
      distortion: 8
    }),
    tiny_robot: Object.freeze({
      label: "Tiny Robot",
      category: "experimental",
      description: "A small, bright robot with faster metallic motion.",
      pitchLabel: "+7",
      characterLabel: "72 Hz robot",
      semitones: 7,
      speed: 1.08,
      characterEffect: "robot",
      modulationHz: 72,
      filterType: "bandpass",
      filterHz: 1950,
      filterQ: 1,
      distortion: 6
    }),
    deep_robot: Object.freeze({
      label: "Deep Robot",
      category: "experimental",
      description: "A slower, lower machine voice with a dark tone.",
      pitchLabel: "-7",
      characterLabel: "28 Hz robot",
      semitones: -7,
      speed: 0.92,
      characterEffect: "robot",
      modulationHz: 28,
      filterType: "lowpass",
      filterHz: 1250,
      filterQ: 0.8,
      distortion: 10
    }),
    robot_radio: Object.freeze({
      label: "Robot Radio",
      category: "experimental",
      description: "A narrow, crunchy robot voice from an old radio.",
      pitchLabel: "-2",
      characterLabel: "Radio filter",
      semitones: -2,
      speed: 1,
      characterEffect: "robot",
      modulationHz: 55,
      filterType: "bandpass",
      filterHz: 1150,
      filterQ: 3.2,
      distortion: 20
    }),
    ascending: Object.freeze({
      label: "Ascending",
      category: "experimental",
      description: "Climbs smoothly from very low to very high.",
      pitchLabel: "-10 → +10",
      semitones: 0,
      speed: 1,
      pitchRampStart: -10,
      pitchRampEnd: 10
    }),
    descending: Object.freeze({
      label: "Descending",
      category: "experimental",
      description: "Falls smoothly from very high to very low.",
      pitchLabel: "+10 → -10",
      semitones: 0,
      speed: 1,
      pitchRampStart: 10,
      pitchRampEnd: -10
    }),
    old_telephone: Object.freeze({
      label: "Old Telephone",
      category: "experimental",
      description: "A thin, slightly crunchy old phone call.",
      pitchLabel: "Original",
      characterLabel: "Phone filter",
      semitones: 0,
      speed: 1,
      characterEffect: "transmission",
      lowCutHz: 300,
      highCutHz: 3400,
      distortion: 4,
      makeupGain: 2.35
    }),
    megaphone: Object.freeze({
      label: "Megaphone",
      category: "experimental",
      description: "A driven public-address voice with short slapback.",
      pitchLabel: "Original",
      characterLabel: "Horn + slapback",
      semitones: 0,
      speed: 1,
      characterEffect: "transmission",
      lowCutHz: 450,
      highCutHz: 4200,
      distortion: 25,
      makeupGain: 2.05,
      delaySeconds: 0.075,
      feedback: 0.12,
      echoMix: 0.28,
      tailSeconds: 0.35
    }),
    eight_bit_voice: Object.freeze({
      label: "8-Bit Voice",
      category: "experimental",
      description: "A blocky retro-game voice with reduced resolution.",
      pitchLabel: "+2",
      characterLabel: "5-bit crush",
      semitones: 2,
      speed: 1,
      characterEffect: "bitcrusher",
      bitDepth: 5,
      highCutHz: 5200
    }),
    demon: Object.freeze({
      label: "Demon",
      category: "experimental",
      description: "A deep, driven voice in a dark cavern.",
      pitchLabel: "-8",
      characterLabel: "Dark reverb",
      semitones: -8,
      speed: 0.92,
      characterEffect: "atmosphere",
      filterType: "lowpass",
      filterHz: 1500,
      filterQ: 0.8,
      distortion: 14,
      makeupGain: 2.15,
      dryMix: 0.62,
      reverbMix: 0.52,
      reverbSeconds: 2.4,
      reverbDecay: 2.4,
      reverbFilterHz: 1800,
      tailSeconds: 2.4
    }),
    ghost: Object.freeze({
      label: "Ghost",
      category: "experimental",
      description: "A wavering, distant voice with echo and reverb.",
      pitchLabel: "Moving",
      characterLabel: "Haunted echo",
      semitones: 0,
      speed: 0.97,
      pitchTargets: Object.freeze([
        2, -1, 1, -2
      ]),
      pitchStepSeconds: 0.85,
      characterEffect: "atmosphere",
      filterType: "highpass",
      filterHz: 220,
      filterQ: 0.7,
      dryMix: 0.5,
      reverbMix: 0.48,
      reverbSeconds: 2.2,
      reverbDecay: 2,
      reverbFilterHz: 3000,
      tremoloHz: 4.2,
      tremoloDepth: 0.22,
      delaySeconds: 0.24,
      feedback: 0.24,
      echoMix: 0.25,
      tailSeconds: 2.2
    }),
    cave: Object.freeze({
      label: "Cave",
      category: "experimental",
      description: "Your natural voice reflected through a huge cavern.",
      pitchLabel: "Original",
      characterLabel: "Long reverb",
      semitones: 0,
      speed: 1,
      characterEffect: "atmosphere",
      filterType: "lowpass",
      filterHz: 7200,
      filterQ: 0.7,
      dryMix: 0.55,
      reverbMix: 0.58,
      reverbSeconds: 3.2,
      reverbDecay: 1.7,
      reverbFilterHz: 4200,
      tailSeconds: 3.2
    }),
    frog: Object.freeze({
      label: "Frog",
      category: "experimental",
      description: "A low croak with a quick resonant wobble.",
      pitchLabel: "-4",
      characterLabel: "Croak filter",
      semitones: -4,
      speed: 0.94,
      characterEffect: "alien",
      filterHz: 720,
      filterDepthHz: 190,
      filterModulationHz: 5.2
    }),
    chorus_alien: Object.freeze({
      label: "Chorus Alien",
      category: "experimental",
      description: "Several swirling alien voices speaking together.",
      pitchLabel: "+3",
      characterLabel: "Modulated chorus",
      semitones: 3,
      speed: 0.98,
      characterEffect: "chorus",
      chorusRateHz: 1.8,
      chorusDepthSeconds: 0.0045,
      chorusDelaySeconds: 0.014,
      chorusWetMix: 0.34,
      tailSeconds: 0.2
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

    for (
      const source of
      playback.effectSources || []
    ) {
      try { source.stop(); } catch (_) { }
      try { source.disconnect(); } catch (_) { }
    }

    for (
      const node of
      playback.effectNodes || []
    ) {
      try { node.disconnect(); } catch (_) { }
    }

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

    if (
      Number.isFinite(preset.pitchRampStart) &&
      Number.isFinite(preset.pitchRampEnd)
    ) {
      parameter.setValueAtTime(
        preset.pitchRampStart,
        startTime
      );
      parameter.linearRampToValueAtTime(
        preset.pitchRampEnd,
        startTime + duration
      );
      return;
    }

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

  function createDistortionCurve(
    amount = 0
  ) {
    const strength =
      Math.max(0, Number(amount) || 0);
    const samples = 2048;
    const curve =
      new Float32Array(samples);

    for (let index = 0; index < samples; index += 1) {
      const value =
        (index * 2) / samples - 1;

      curve[index] =
        ((3 + strength) * value * 20 *
          (Math.PI / 180)) /
        (Math.PI + strength *
          Math.abs(value));
    }

    return curve;
  }

  function createBitcrusherCurve(
    bitDepth = 5
  ) {
    const bits =
      Math.max(
        2,
        Math.min(12, Number(bitDepth) || 5)
      );
    const levels =
      2 ** (bits - 1);
    const samples = 65536;
    const curve =
      new Float32Array(samples);

    for (let index = 0; index < samples; index += 1) {
      const value =
        (index * 2) / (samples - 1) - 1;

      curve[index] =
        Math.round(value * levels) /
        levels;
    }

    return curve;
  }

  function createReverbImpulse(
    audioContext,
    seconds,
    decay
  ) {
    const length =
      Math.max(
        1,
        Math.floor(
          audioContext.sampleRate * seconds
        )
      );
    const impulse =
      audioContext.createBuffer(
        2,
        length,
        audioContext.sampleRate
      );
    let seed = 0x2f6e2b1;

    for (let channel = 0; channel < 2; channel += 1) {
      const data =
        impulse.getChannelData(channel);

      for (let index = 0; index < length; index += 1) {
        seed =
          (seed * 1664525 + 1013904223) >>> 0;

        const noise =
          (seed / 0xffffffff) * 2 - 1;
        const envelope =
          (1 - index / length) ** decay;

        data[index] = noise * envelope;
      }
    }

    return impulse;
  }

  function createTransmissionEffectChain(
    audioContext,
    preset,
    startTime
  ) {
    const highPass =
      audioContext.createBiquadFilter();
    const lowPass =
      audioContext.createBiquadFilter();
    const shaper =
      audioContext.createWaveShaper();
    const makeup =
      audioContext.createGain();
    const nodes = [
      highPass,
      lowPass,
      shaper,
      makeup
    ];

    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(
      preset.lowCutHz,
      startTime
    );
    highPass.Q.setValueAtTime(
      0.7,
      startTime
    );

    lowPass.type = "lowpass";
    lowPass.frequency.setValueAtTime(
      preset.highCutHz,
      startTime
    );
    lowPass.Q.setValueAtTime(
      0.7,
      startTime
    );

    shaper.curve =
      createDistortionCurve(
        preset.distortion
      );
    shaper.oversample = "2x";
    makeup.gain.setValueAtTime(
      preset.makeupGain,
      startTime
    );

    highPass.connect(lowPass);
    lowPass.connect(shaper);
    shaper.connect(makeup);

    let output = makeup;

    if (preset.delaySeconds) {
      const dry =
        audioContext.createGain();
      const delay =
        audioContext.createDelay(1);
      const feedback =
        audioContext.createGain();
      const echo =
        audioContext.createGain();
      const mix =
        audioContext.createGain();

      dry.gain.setValueAtTime(
        0.82,
        startTime
      );
      delay.delayTime.setValueAtTime(
        preset.delaySeconds,
        startTime
      );
      feedback.gain.setValueAtTime(
        preset.feedback,
        startTime
      );
      echo.gain.setValueAtTime(
        preset.echoMix,
        startTime
      );

      makeup.connect(dry);
      dry.connect(mix);
      makeup.connect(delay);
      delay.connect(echo);
      echo.connect(mix);
      delay.connect(feedback);
      feedback.connect(delay);

      nodes.push(
        dry,
        delay,
        feedback,
        echo,
        mix
      );
      output = mix;
    }

    return {
      input: highPass,
      output,
      nodes,
      sources: []
    };
  }

  function createBitcrusherEffectChain(
    audioContext,
    preset,
    startTime
  ) {
    const shaper =
      audioContext.createWaveShaper();
    const filter =
      audioContext.createBiquadFilter();

    shaper.curve =
      createBitcrusherCurve(
        preset.bitDepth
      );
    shaper.oversample = "none";

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      preset.highCutHz,
      startTime
    );
    filter.Q.setValueAtTime(
      0.75,
      startTime
    );

    shaper.connect(filter);

    return {
      input: shaper,
      output: filter,
      nodes: [shaper, filter],
      sources: []
    };
  }

  function createAtmosphereEffectChain(
    audioContext,
    preset,
    startTime,
    stopTime
  ) {
    const input =
      audioContext.createGain();
    const filter =
      audioContext.createBiquadFilter();
    const dry =
      audioContext.createGain();
    const convolver =
      audioContext.createConvolver();
    const reverbFilter =
      audioContext.createBiquadFilter();
    const wet =
      audioContext.createGain();
    const mix =
      audioContext.createGain();
    const nodes = [input];
    const sources = [];
    let chainOutput = input;

    if (preset.distortion) {
      const shaper =
        audioContext.createWaveShaper();

      shaper.curve =
        createDistortionCurve(
          preset.distortion
        );
      shaper.oversample = "2x";
      const makeup =
        audioContext.createGain();

      makeup.gain.setValueAtTime(
        preset.makeupGain || 2.1,
        startTime
      );
      chainOutput.connect(shaper);
      shaper.connect(makeup);
      chainOutput = makeup;
      nodes.push(shaper, makeup);
    }

    filter.type = preset.filterType;
    filter.frequency.setValueAtTime(
      preset.filterHz,
      startTime
    );
    filter.Q.setValueAtTime(
      preset.filterQ,
      startTime
    );
    chainOutput.connect(filter);
    chainOutput = filter;
    nodes.push(filter);

    if (preset.tremoloHz) {
      const tremolo =
        audioContext.createGain();
      const oscillator =
        audioContext.createOscillator();
      const depth =
        audioContext.createGain();

      tremolo.gain.setValueAtTime(
        1 - preset.tremoloDepth,
        startTime
      );
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        preset.tremoloHz,
        startTime
      );
      depth.gain.setValueAtTime(
        preset.tremoloDepth,
        startTime
      );

      oscillator.connect(depth);
      depth.connect(tremolo.gain);
      chainOutput.connect(tremolo);
      chainOutput = tremolo;
      oscillator.start(startTime);
      oscillator.stop(stopTime);

      nodes.push(tremolo, depth);
      sources.push(oscillator);
    }

    dry.gain.setValueAtTime(
      preset.dryMix,
      startTime
    );
    convolver.buffer =
      createReverbImpulse(
        audioContext,
        preset.reverbSeconds,
        preset.reverbDecay
      );
    reverbFilter.type = "lowpass";
    reverbFilter.frequency.setValueAtTime(
      preset.reverbFilterHz,
      startTime
    );
    reverbFilter.Q.setValueAtTime(
      0.7,
      startTime
    );
    wet.gain.setValueAtTime(
      preset.reverbMix,
      startTime
    );

    chainOutput.connect(dry);
    dry.connect(mix);
    chainOutput.connect(convolver);
    convolver.connect(reverbFilter);
    reverbFilter.connect(wet);
    wet.connect(mix);

    nodes.push(
      dry,
      convolver,
      reverbFilter,
      wet,
      mix
    );

    if (preset.delaySeconds) {
      const delay =
        audioContext.createDelay(1);
      const feedback =
        audioContext.createGain();
      const echo =
        audioContext.createGain();

      delay.delayTime.setValueAtTime(
        preset.delaySeconds,
        startTime
      );
      feedback.gain.setValueAtTime(
        preset.feedback,
        startTime
      );
      echo.gain.setValueAtTime(
        preset.echoMix,
        startTime
      );

      chainOutput.connect(delay);
      delay.connect(echo);
      echo.connect(mix);
      delay.connect(feedback);
      feedback.connect(delay);
      nodes.push(delay, feedback, echo);
    }

    return {
      input,
      output: mix,
      nodes,
      sources
    };
  }

  function createChorusEffectChain(
    audioContext,
    preset,
    startTime,
    stopTime
  ) {
    const input =
      audioContext.createGain();
    const dry =
      audioContext.createGain();
    const mix =
      audioContext.createGain();
    const nodes = [input, dry, mix];
    const sources = [];

    dry.gain.setValueAtTime(
      0.68,
      startTime
    );
    input.connect(dry);
    dry.connect(mix);

    for (let voice = 0; voice < 2; voice += 1) {
      const delay =
        audioContext.createDelay(0.1);
      const wet =
        audioContext.createGain();
      const oscillator =
        audioContext.createOscillator();
      const depth =
        audioContext.createGain();
      const voiceScale =
        voice ? 1.35 : 1;

      delay.delayTime.setValueAtTime(
        preset.chorusDelaySeconds *
          voiceScale,
        startTime
      );
      wet.gain.setValueAtTime(
        preset.chorusWetMix,
        startTime
      );
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        preset.chorusRateHz *
          (voice ? 1.17 : 1),
        startTime
      );
      depth.gain.setValueAtTime(
        preset.chorusDepthSeconds *
          (voice ? -0.86 : 1),
        startTime
      );

      oscillator.connect(depth);
      depth.connect(delay.delayTime);
      input.connect(delay);
      delay.connect(wet);
      wet.connect(mix);
      oscillator.start(startTime);
      oscillator.stop(stopTime);

      nodes.push(delay, wet, depth);
      sources.push(oscillator);
    }

    return {
      input,
      output: mix,
      nodes,
      sources
    };
  }

  function createAlienEffectChain(
    audioContext,
    preset,
    startTime,
    stopTime
  ) {
    const filter =
      audioContext.createBiquadFilter();
    const oscillator =
      audioContext.createOscillator();
    const filterDepth =
      audioContext.createGain();

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(
      preset.filterHz,
      startTime
    );
    filter.Q.setValueAtTime(
      0.9,
      startTime
    );

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      preset.filterModulationHz,
      startTime
    );
    filterDepth.gain.setValueAtTime(
      preset.filterDepthHz,
      startTime
    );
    oscillator.connect(filterDepth);
    filterDepth.connect(filter.frequency);

    const nodes = [
      filter,
      filterDepth
    ];
    let output = filter;

    if (
      preset.characterEffect ===
      "alien_echo"
    ) {
      const dry =
        audioContext.createGain();
      const wet =
        audioContext.createGain();
      const delay =
        audioContext.createDelay(1);
      const feedback =
        audioContext.createGain();
      const mix =
        audioContext.createGain();

      dry.gain.setValueAtTime(
        0.76,
        startTime
      );
      wet.gain.setValueAtTime(
        0.44,
        startTime
      );
      delay.delayTime.setValueAtTime(
        preset.delaySeconds,
        startTime
      );
      feedback.gain.setValueAtTime(
        preset.feedback,
        startTime
      );

      filter.connect(dry);
      dry.connect(mix);
      filter.connect(delay);
      delay.connect(wet);
      wet.connect(mix);
      delay.connect(feedback);
      feedback.connect(delay);

      nodes.push(
        dry,
        wet,
        delay,
        feedback,
        mix
      );
      output = mix;
    }

    oscillator.start(startTime);
    oscillator.stop(stopTime);

    return {
      input: filter,
      output,
      nodes,
      sources: [oscillator]
    };
  }

  function createRobotEffectChain(
    audioContext,
    preset,
    startTime,
    stopTime
  ) {
    const ring =
      audioContext.createGain();
    const oscillator =
      audioContext.createOscillator();
    const modulationDepth =
      audioContext.createGain();
    const filter =
      audioContext.createBiquadFilter();
    const shaper =
      audioContext.createWaveShaper();

    ring.gain.setValueAtTime(
      0.28,
      startTime
    );
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(
      preset.modulationHz,
      startTime
    );
    modulationDepth.gain.setValueAtTime(
      0.72,
      startTime
    );

    filter.type = preset.filterType;
    filter.frequency.setValueAtTime(
      preset.filterHz,
      startTime
    );
    filter.Q.setValueAtTime(
      preset.filterQ,
      startTime
    );

    shaper.curve =
      createDistortionCurve(
        preset.distortion
      );
    shaper.oversample = "2x";

    oscillator.connect(
      modulationDepth
    );
    modulationDepth.connect(
      ring.gain
    );
    ring.connect(filter);
    filter.connect(shaper);

    oscillator.start(startTime);
    oscillator.stop(stopTime);

    return {
      input: ring,
      output: shaper,
      nodes: [
        ring,
        modulationDepth,
        filter,
        shaper
      ],
      sources: [oscillator]
    };
  }

  function createCharacterEffectChain(
    audioContext,
    preset,
    startTime,
    stopTime
  ) {
    if (
      preset.characterEffect === "alien" ||
      preset.characterEffect === "alien_echo"
    ) {
      return createAlienEffectChain(
        audioContext,
        preset,
        startTime,
        stopTime
      );
    }

    if (
      preset.characterEffect === "robot"
    ) {
      return createRobotEffectChain(
        audioContext,
        preset,
        startTime,
        stopTime
      );
    }

    if (
      preset.characterEffect ===
      "transmission"
    ) {
      return createTransmissionEffectChain(
        audioContext,
        preset,
        startTime
      );
    }

    if (
      preset.characterEffect ===
      "bitcrusher"
    ) {
      return createBitcrusherEffectChain(
        audioContext,
        preset,
        startTime
      );
    }

    if (
      preset.characterEffect ===
      "atmosphere"
    ) {
      return createAtmosphereEffectChain(
        audioContext,
        preset,
        startTime,
        stopTime
      );
    }

    if (
      preset.characterEffect === "chorus"
    ) {
      return createChorusEffectChain(
        audioContext,
        preset,
        startTime,
        stopTime
      );
    }

    return null;
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
    const tailSeconds =
      Math.max(
        0,
        Number(preset.tailSeconds) || 0
      );
    const effectStopTime =
      startTime +
      expectedDuration +
      tailSeconds +
      0.25;

    if (
      preset.pitchTargets?.length ||
      (
        Number.isFinite(
          preset.pitchRampStart
        ) &&
        Number.isFinite(
          preset.pitchRampEnd
        )
      )
    ) {
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
    const effectChain =
      createCharacterEffectChain(
        runtime.context,
        preset,
        startTime,
        effectStopTime
      );

    if (effectChain) {
      soundTouch.connect(
        effectChain.input
      );
      effectChain.output.connect(gain);
    } else {
      soundTouch.connect(gain);
    }
    gain.connect(
      runtime.context.destination
    );

    return new Promise((resolve) => {
      const playback = {
        source,
        soundTouch,
        gain,
        effectNodes:
          effectChain?.nodes || [],
        effectSources:
          effectChain?.sources || [],
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
            Math.max(
              180,
              tailSeconds * 1000
            )
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
            pitchLabel:
              preset.pitchLabel || "",
            characterLabel:
              preset.characterLabel || "",
            semitones:
              preset.semitones,
            speed: preset.speed
          })
        ),
      playRecordedVerse,
      stop
    });
})();
