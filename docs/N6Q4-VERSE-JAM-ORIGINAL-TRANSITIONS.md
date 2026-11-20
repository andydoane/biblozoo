# N6q.4 — Restore original ios-prep Verse Jam between-round music

> **Owner iPhone report after merged [N6q.3 PR #62](https://github.com/andydoane/biblozoo/pull/62)** (`cbc90148457752865af9fc2ae2a27629c01a13bb`, merged 2026-11-09 21:58:39 UTC): interstitial words remain musically wrong. In the tested original `ios-prep` WebAudio build, **“Time” coincides with its chord and an individual word note, “to” has its word note, and “Jam!” has its word note**. On the current native iPhone, “Time” was silent, its chord was heard near “to”, and “Jam!” had no distinct note. All other between-round phrases behave similarly. **User requested examine the actual ios-prep source before making changes. We did.**

## Source of truth: `ios-prep` WebAudio version

Reviewed `verse_playground/verse_jam/game.js` directly on `ios-prep`, especially `handleRoundOrEnd` (~3258), `playRoundTransitionSting` (~3382), `showRoundTransition` (~3624), `stopMusic` (~2048), `startBeatLoop`, and WebAudio `playTone` (~1953). Original observable contract:

- **Background beat stops at the round boundary.** This is deliberate; when the next round starts the groove returns on its normal downbeat.
- The “**time / to / jam!**” sting has **six authored notes**: beat 0 = MIDI 60, 67, 72 (**C/G/C chord**, 420/420/460ms triangle voices); beat 1 MIDI 76 (E, 160ms square); beat 2 MIDI 79 (G, 180ms square); beat 3 MIDI 84 (C, 160ms triangle).
- That same three-word animation also has a **separate individual word-note layer**, MIDI **76, 79, 84** (110ms squares) on beats 0, 1, 2, respectively. Thus beat 0 deliberately combines a three-note chord **plus an E word note**. Some later word pitches coincide with sting pitches by design: their attack/duration mix is part of the original user-facing soundtrack. **Do not remove the word layer merely because notes coincide.**
- “**speed / it / up**” source sting MIDI **72, 76, 79, 84** on beats 0–3, plus its distinct word-note layer **72, 76, 79** on beats 0–2.
- “**feel / that / groove**” sting MIDI **67, 72, 79, 84** on beats 0–3, plus its distinct word-note layer **67, 72, 79** on beats 0–2.
- Each phrase occupies **four beats**. Visual word inserts on beats **0, 1, 2**, and the beat restarts with the new round **at beat 4**. Original Web Audio uses `AudioContext.currentTime + 0.08` for the first word/chord and schedules tones with oscillator envelopes against the audio clock. **Leave original browser/Web/PWA/Android implementation unchanged.**

The earlier [N6q.3 #62](https://github.com/andydoane/biblozoo/pull/62) misdiagnosed the second note layer as redundant and removed it **on native only**; user hearing demonstrates that was not the desired original. **N6q.4 explicitly restores both original score layers on native.** We cannot yet claim acoustic equality just because MIDI/durations/tempo are source-equal.

## Actual native timing failure and targeted change

In N6q.3, `handleRoundOrEnd` called `stopMusic()`, issuing scoped native `jam-group` stop which **stopped, prepared, and restarted all 12 `jam-note` voices on Swift's serial AVAudioEngine worker** together with the drums/pads/voice clips. Only **80ms later**, JS requested a four-voice first “Time” chord/word combined note through Capacitor. These calls could queue **behind** the expensive stop/prep. Swift's bounded due time falls back to immediate playback if already late; the initial chord could therefore be heard closer to “to” and subsequent notes could be suppressed or shifted.

N6q.4 changes only **native interstitial entry**:
1. Cancel active JS beat/pad timers and call existing scoped native **`stopEffect("jam-groove")`** instead of whole `jam-group`. This still stops background drums, pads and five recorded filler voices, just **not** the hot twelve note players needed by the transition; browser still performs original `stopMusic()`.
2. **Await actual Swift stopEffect acknowledgement** before scheduling the next four-beat phrase; don't treat a fire-and-forget stop as free. The native first beat is scheduled **260ms after this completed stop**, versus original 80ms WebAudio to allow bounded bridge/worker lookahead; all subsequent beats and user-visible word-to-word rhythm preserve their original timing. If the native stop itself takes time, there can be a slightly longer break between rounds—the goal is to hear each original cue on its intended word, not blindly launch the animation before audio can be ready.
3. **Restore three extra 110ms square per-word notes** to native, pre-scheduled ahead of word DOM painting, while preserving *every original authored sting note and chord* untouched. The original Web Audio still plays its word notes at the original source point.
4. Keep **one** serial native AVAudioEngine and fixed prewarmed source recipes, `.soloAmbient` and all explicit UIKit gesture/PiP policies. No arbitrary new sound IDs/files, no Web Audio/HTML sound on native, no automatic foreground activation, no changes to reward/verse/game scoring.

## Owner's Xcode Debug Console evidence

N6q.4 adds an explicit **read-only, finite** native `traceJamTransition` bridge method and `#if DEBUG` Swift `NSLog` markers. Running Xcode's **App** scheme/physical iPhone in Debug mode, filter console by **`VerseJamTiming`**. A single between-round phrase should display messages like:

```text
[VerseJamTiming] word phase=stop-request round=1 index=-1 ...
[VerseJamTiming] groove-stop queued nativeEpochMs=...
[VerseJamTiming] groove-stop finished workerEpochMs=...
[VerseJamTiming] word phase=stop-complete round=1 index=-1 ...
[VerseJamTiming] word phase=phrase-scheduled round=1 index=-1 ...
[VerseJamTiming] pcm cue=transition-sting recipe=60-420-t leadMs=... queueMs=... hostScheduled=true ...
[VerseJamTiming] pcm cue=transition-word recipe=76-110-q leadMs=... queueMs=... hostScheduled=true ...
[VerseJamTiming] word phase=word-visible round=1 index=0 jsMs=... nativeReceiveMs=...
```

The initial chord should show **four events on the same beat** (3 `transition-sting` + 1 `transition-word`). Then note cues for beats 1 and 2. **Positive `leadMs`** means the worker scheduled *before* the requested target. A significantly **negative `leadMs`** means scheduling arrived after its deadline; `hostScheduled=false` indicates immediate fallback. `queueMs` shows the delay on the serial worker. The log's `word-visible jsMs` records the actual JavaScript DOM insertion time and **nativeReceiveMs** captures time that marker reached Swift. Their difference estimates diagnostic bridge overhead. These are internal timing markers, **not microphone/speaker timestamps or acoustic PASS**. No verse text, child/profile data or sound content is logged; release builds skip `NSLog` entirely.

**Suggested owner diagnostic only if it still sounds wrong:** After the phrase, in Xcode's Debug Console search for `VerseJamTiming`, copy the lines for a single “Time / to / Jam!” transition and share them. That is enough to identify whether the stop took too long, the notes reached the worker late, or the visual word clock is misaligned. No manual console commands or extra installation required.

## Mandatory independent verification gates

- GitHub final PR **HEAD**: original N6q/N6q.1/N6q.3 checks, new `node scripts/validate_native_verse_jam_original_transition_n6q4.js` VM test of actual native controller plus real `stopMusic/handleRoundOrEnd`, all 3 original sting + word-note source inventories vs native, all existing external games, full Swift file **`swiftc -frontend -parse`**, and Production Web build. CI is **not** Xcode Apple SDK compilation or proof of physical audio.
- Owner personally merges into **`experiment/native-ios-audio` only** when CI green → dedicated GitHub Desktop experiment checkout **Pull origin** → `npm run build && npx cap sync ios && npx cap open ios` → Xcode **App** scheme on real iPhone using independent `com.andydoane.biblozoo.audiotest`; original stable `ios-prep`, main and original installed BibloZoo unaffected.
- Repeat **Slow/Medium/Fast**. Let first background beat finish, hear the correct and on-time **chord + separate “Time” note**, the notes when **“to”** and **“Jam!”** appear, and the equivalent **Speed/it/up** and **Feel/that/groove** stings. Background beat should stop before each phrase, and the new groove should begin cleanly **after its four beats**, no stale late note bursts. Compare against personally heard `ios-prep` source. Check original opening/closing phrases, title/mode UI pops, Got It tactile animation/first kick, correct Groovy score and “Great!”/verse practice once, Menu/mute/restarts, true held App Switcher/full switch/lock and YouTube PiP PAUSED/STILL PLAYING requiring real **Welcome Back → Let's go!** gesture with no Zoo punishment. Test accepted other games unaffected.
- **Status:** Verse Jam **merged but NOT yet accepted** given real owner-reported transition failure. Ghost Writer #59 merged but STILL untested. **12/12 external standalone, 3/5 Playground owner PASS** (Verse Typer #55, Scripture Scrub #56, Wheel #57); 5/5 Playground native code merged. Do not advance counts based on this PR, green CI or a passed Xcode compile.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N6q.3 historical test](N6Q3-VERSE-JAM-UI-AND-TRANSITIONS.md).
