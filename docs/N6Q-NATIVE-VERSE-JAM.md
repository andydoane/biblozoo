# N6q — Verse Jam Native iOS Audio: Fourth Verse Playground Migration

> **Proposed N6q PR** from `experiment/n6q-native-verse-jam` into **isolated `experiment/native-ios-audio` only**. Not merged or owner-heard; do not count as accepted. The owner already merged [N6p Wheel of Bible #57](https://github.com/andydoane/biblozoo/pull/57) at `46971fb8ec7456fa66892d059dea38054b8c976f` (Nov 9, 2026 15:15 UTC) and reported all real-iPhone Wheel tests PASS, so **12/12 external standalone games + Playground 3/5 accepted**. When this PR passes the independent gates and you report an actual iPhone PASS, the count becomes **4/5**, leaving only Ghost Writer. Stable `ios-prep`, the original installed app, browser/PWA/Android, microphone, Zoo, saved progress and rewards must remain untouched.

## Why this activity needs a different approach

Verse Jam is a rhythm game. Its existing Web Audio clock determines when drum bars (kick/snare/hat/extra), words, countdown, chord pads and transitions sound; the same beat determines GROOVY scoring. Moving only the short MP3 shouts or replacing everything with a generic chime would silently change the game and make native iOS unreliable under PiP/App Switcher. This migration deliberately retains the **same source rhythms, seven tempos, word melody and scoring mathematics** while replacing Web-generated output with pre-rendered Swift PCM and the `AudioContext.currentTime` dependency with a JS monotonic beat timeline in the native-only experiment. The original Web/PWA/Android audio graph remains intact.

## Original source sound inventory

| Original family | Native target |
| --- | --- |
| Basic/middle/final chiptune drum patterns | Four finite chiptune PCM drums: `jam-drum-kick`, `jam-drum-snare`, `jam-drum-hat`, `jam-drum-extra`; keep all original per-loop kick/snare/hat/extra offsets, 4 beats per bar and source accents |
| Original tempo choices | Slow/Medium/Fast configs: **92, 100, 104, 108, 112, 120, 128 BPM**; the JS owner schedules the correct existing loop at each source tempo |
| Verse/intro/countdown/challenge notes | Finite Swift `jam-note` recipe bank with specific MIDI, duration and waveform; preserve source chosen 5 base melodies, rising higher round notes, wrong double bass, 3-2-1-GO, clap filler, intro six words, word spawn/tap, transition and score/end arpeggios |
| Sustained harmonies | `jam-pad` combined C-major triangle chord (MIDI 48/52/55/60) banked by supported BPM and 4/8/12/16-beat phrase; not four dynamically created iOS oscillators |
| Five original sampled fillers | `jam-voice-boom`, `jam-voice-hey`, `jam-voice-woo`, `jam-voice-yeah`, `jam-voice-yo` from original shipped five local MP3 assets |
| Title, speed/headphones, menu and completion | Existing two `ui-pop-1/2` native UI sounds |

There are **13 fixed bridge IDs** (2 UI, 5 recorded voice, 4 drum, one note bank and one pad bank), with multiple finite PCM subrecipes inside the note/pad banks. IDs never grant arbitrary local URLs, unknown pitches/frequencies or user-supplied MP3s. The same one Swift serialized `.soloAmbient` `AVAudioEngine` is used; no hot decode/oscillator, second session or iOS Web/HTML output fallback.

## Musical timing and recovery decisions

- The child’s actual **headphones Got it!**, Game Menu Close, failure Try Again or plain Welcome Back **Let's go** must synchronously request `activateFromGesture`; waiting for the full native PCM bank cannot start/advance gameplay. Title UI pop taps may warm only two shared UI samples; a late cold pop is omitted rather than replayed seconds after the screen changes.
- Native Jam uses the original verse/round/score/beat JS calculations, with a `performance.now()`-based monotonic native substitute clock rather than `AudioContext.currentTime`. It schedules native PCM at the intended sound time (bounded timers) and cancels outstanding sound callbacks when music generation changes. Avoid stale bursts after an interruption or a background throttle.
- Game Menu/Help, an immediate held UIKit App Switcher swipe-up, full app switch, lock or YouTube PiP **PAUSED/STILL PLAYING** must stop the drum/word/pad/voice output and freeze the current phrase without advancing recorded progress. Successful real-tap return starts the unfinished current phrase on a **clean musical beat**, not at a stale elapsed point. GROOVY score/rewards are never credited twice.
- A competing higher-priority YouTube/call audio session may produce `activation-os-rejected`; keep **plain Welcome Back** and let the child tap again. No gray false-corruption or Zoo BREAK escalation. A genuine unavailable PCM/bridge gets accessible Try Again/Back. Do not silently play Web Audio in the native iOS experiment.
- Do not change Flashcards or Read My Verse microphone recording in this PR. Ghost Writer's microphone-adjacent migration and N7 recording/DSP must be reviewed separately.
- The built `dist/` includes the native-only output guard in experimental iOS; source web/PWA paths keep the original graph. The iOS test bundle is `com.andydoane.biblozoo.audiotest` and can coexist with the original BibloZoo installation; its local profile data is separate.

## Owner workflow — your usual steps only

1. Confirm the PR’s **final HEAD** has both GitHub Actions jobs **GREEN**: Node native regressions and Production Web build. They do **not** compile Swift.
2. **Merge the PR personally** into `experiment/native-ios-audio`, not `ios-prep` or `main`.
3. In GitHub Desktop, select the dedicated `biblozoo-native-audio` checkout on `experiment/native-ios-audio`, then **Pull origin**.
4. In that VS Code folder execute your familiar one-liner:

   ```sh
   npm run build && npx cap sync ios && npx cap open ios
   ```

5. In Xcode, use the **App** scheme and physical iPhone, press **Play**. Verify that the separate audio-test application, not original BibloZoo, is selected.
6. Test on the phone and tell me **PASS** or the exact unexpected symptom. If failure, before restart capture Xcode compile messages or DEV **Inspect native state / Copy Audio Timing Report** and note whether YouTube PiP was playing or paused.

## Physical iPhone checklist

1. **Cold Start and selection:** Home → Playground → Verse Jam → Start → Slow. Hear UI sounds if warmed (the very first cold pop may be intentionally omitted), select speed, see wireless-headphones warning and tap **Got it!**. No routine gray dialog or music playing before preflight completes. Repeat from scratch with **Medium** and **Fast**.
2. **Groove across modes:** Hear the original distinct kick, snare, hat, extra accents in basic/middle/final patterns. Gradually faster tempos must feel like original slow 92 through fast 128 BPM, not a fixed metronome. The beat UI and word timing should align; no drift or double kick on bar boundaries.
3. **Intro/countdown:** Hear “tap / the / words / match / my / beat” tonal intro at original six beats and a clear **3, 2, 1, GO!**; input is allowed slightly ahead of the visible TAP! cue, preserving GROOVY/PERFECT timing.
4. **Word/clap/voice sounds:** Correct verse words produce the original varied pitches (warmup triangle versus later square); incorrect taps play low bass warning; clap buttons sound two-note chiptune claps. Later rounds must really play *all five* original recorded filler shouts **Boom!, Hey!, Woo!, Yeah!, Yo!**, not generic synthesized fallback.
5. **Pad/transition/end:** Listen for soft sustained chord pads under later phrases without overwhelming word or drum audio, the “time to jam,” “speed it up,” and “feel that groove” transitions, score sparkle and final arpeggio. Confirm Groovy Score is calculated once; Tap to Continue → completion/Play Again.
6. **Game Menu & Help:** During a drum groove, countdown, phrase or score, open Game Menu/How to Play; try mute/unmute, speed change, menu Close and return. Audio must stop, no ghost shouts, no delayed sounds/score changes behind menu and clean new downbeat on return.
7. **Held App Switcher:** While beat and words are active, swipe up and **HOLD** the iPhone App Switcher so the app thumbnail is visible. Return and tap plain **Welcome Back — Let's go**. Verify pause and native sound recovery, same saved verse/score/chunk, no duplicated completion. Repeat during countdown, score and end transition.
8. **YouTube PiP:** Do the same with YouTube Picture-in-Picture **PAUSED**, then **STILL PLAYING**, and full switch/Home/lock. An OS refusal must remain a retriable plain Welcome Back instead of silently continuing or triggering Zoo BREAK.
9. **Regressions:** Try Home, Learn audio, Feeding Classic/Melody/Labyrinth/Bounce, at least some of 12 accepted games, Verse Typer voiced chunk review, Scripture Scrub mower/progress, and Wheel of Bible narrated verse/spin.
10. **Failure evidence:** A returned `prepared:true`/`accepted:true` status proves only that the native engine accepted a schedule; it cannot prove a child heard the speaker. If there is silence, report the exact state, step, current mode/BPM, PiP state, iOS version and route (speaker/Bluetooth). Mac Swift compile and heard iPhone output are independent gates.

## Acceptance / future work

N6q is the **fourth proposed Playground**, so **Playground remains 3/5 until owner merge and physical-device PASS**. After acceptance, fifth is Ghost Writer, then N7 microphone/recording/DSP, N8 independent Zoo Escape and N9 physical-device reliability/integration decision. Future PRs must keep the living `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and a relevant dedicated owner test guide current, with accurate owner-reported evidence.
