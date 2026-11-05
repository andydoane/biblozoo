# Read My Verse — Feedback Sound Level Audit

**Audited:** 2026-11-05 on `ios-prep` at `3c92f6bdeafb2418acea8e815c354ecfe56992e6`  
**Purpose:** Balance Read My Verse's activity-feedback effects against existing external games without touching verse narration, audio recovery, speech recordings, Verse Crawl music, or the global device volume.  
**Implementation status:** Proposed in the Read My Verse feedback-volume PR; verify merge and iPhone acceptance separately.

## What was compared

The eight Read My Verse activities use different audio sources, so there is **no single Read My Verse beep-volume setting**.

| Read My Verse activity | Current feedback path | Decision in this PR |
| --- | --- | --- |
| **Typewriter** | `typewriter_*.mp3` keystrokes and `typewriter_alert.mp3` chunk sound, Web Audio decoded buffer with HTMLAudio fallback | Modest boost to key and alert playback only |
| **Keyboard** | `keyboard_*.mp3` keystrokes and `keyboard_alert.mp3`, same dual-path player | Same modest boost |
| **Unscramble** | Generated short triangle-wave two-note success pattern and four-note finish | Increase gain peak from **0.075 to 0.22** |
| **Tap Words in Order** | Generated triangle-wave correct notes / four-note finish; softer sine-wave incorrect note | Raise correct **0.072 to 0.22**; incorrect **0.034 to 0.11** |
| **Verse Crawl** | Dedicated pre-ducked MP3 soundtrack and verse narration | Leave untouched |
| **Balloons** | Verse chunk narration synchronized with animation | Leave untouched |
| **Fish** | Verse chunk narration synchronized with animation | Leave untouched |
| **Chunk Audio Matching** | Verse chunk narration; the activity's audio is part of the exercise | Leave untouched |

A generic generated negative-tone fallback exists in `read_my_verse.js`, but it is not used by the active Read My Verse gameplay paths observed in this audit. It is not retuned speculatively.

## External-game references (source-code comparison only)

- **Tower of Bible** uses `soundCorrectWord`: its `0.07` sine oscillator multiplied by `correctWord: 3.40` (master `1.00`) gives approximately **0.238** peak on one correct-word note. Verse Scramble uses a similar generated-sound scaling system.
- **Verse Snake**'s generated triangle orb note uses about **0.115–0.15** peak depending on the orb.
- **Verse Typer** uses a `0.48` correct-letter level under a `0.85` master (approx. **0.408** nominal gain).
- These are **not measured acoustic loudness values**: oscillator type, note duration, mixing, pitch, source MP3 amplitude, and the device's actual speaker determine perceived loudness. A numeric match does not guarantee a subjective match.

The previous Read success peaks of `0.072–0.075` are several times lower than Tower of Bible's comparable synthesized correct-word voice. The new `0.22` target is just under that external reference, offering roughly a **9–10 dB amplitude increase** for the synthesized positive feedback without going near the higher Verse Typer levels. The intentionally softer wrong answer stays about half the positive tone.

## Proposed bounded levels

The new single source of these Read My Verse effect settings is `READ_EFFECT_LEVELS` in `read_my_verse.js`:

| Feedback | Previous | Proposed | Note |
| --- | ---: | ---: | --- |
| Decoded Typewriter/Keyboard key sample | 0.58 | **0.82** | Conservative gain; samples may have different original mastering |
| Decoded Typewriter/Keyboard chunk alert | 0.70 | **0.90** | Keep alert distinct from typing |
| HTMLAudio key fallback | 0.70 | **0.92** | Fallback already used a different gain from Web Audio |
| HTMLAudio alert fallback | 0.85 | **1.00** | Browser volume is capped at 1 |
| Unscramble reward and finish | 0.075 | **0.22** | Same pitches, durations, note counts and envelope |
| Tap Words correct and finish | 0.072 | **0.22** | Same pitches, durations, note counts and envelope |
| Tap Words wrong | 0.034 | **0.11** | Still deliberately softer than a correct answer |

All updated gains are no greater than `1.0`. The changes are **per-effect**, not a new master or compressor. Multiple voices can overlap, so a final loudness/clipping check belongs on the actual iPhone. The source audio files themselves are unchanged.

## Explicitly preserved

- No changes to verse narration, Chunk Audio Matching, Verse Crawl MP3/music, soundtrack ducking or timing.
- No changes to mute checks, real user-gesture unlocks, audio-clock probes, cancellation/deferred states, Welcome Back, Zoo Escape, native audio session category, or any recovery path.
- No changes to activity progression, keyboard/typewriter asset selection, sound voice pooling, maximum voice counts, timing, note counts, pitch or waveform.

## Validation and owner acceptance

The new `scripts/validate_read_my_verse_feedback_levels.js` exercises live scheduling in an instrumented VM, including success and wrong-note peaks, four-note finish counts, Web Audio sample gains, HTMLAudio fallback volumes for Typewriter and Keyboard, mute, and basic recovery guardrails. It runs with the established `ios-prep` Actions workflow alongside existing Read My Verse tests.

The source and test changes do not measure actual speaker output or MP3 source loudness. After merging the PR, **the owner should compare at one unchanged iPhone hardware volume**:

1. Tap several correct words and one incorrect word in Tap Words in Order.
2. Finish an Unscramble word and its final verse to hear the two-note / four-note rewards.
3. Type at normal and rapid pace in both Typewriter and Keyboard, and hear their chunk alerts.
4. Switch to an external game such as Tower of Bible or Verse Scramble; compare the same device volume.
5. Check no harsh/clipped sound when finishing a four-note pattern, and no unusually loud typing overlaps.
6. Verify mute, interrupted audio recovery, Verse Crawl music, and chunk narration remain unchanged.

If any particular sound is still too soft or harsh, adjust **only its own level**, based on the iPhone observations, in a follow-up PR. Do not raise all narration/music to compensate.
