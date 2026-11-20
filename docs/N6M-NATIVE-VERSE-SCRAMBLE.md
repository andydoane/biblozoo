# N6m — Verse Scramble final standalone native iOS audio PR #54

> **CURRENT RESULT — ALL 12 STANDALONE GAMES ACCEPTED (2026-11-08 Michigan):** [N6m Verse Scramble PR #54](https://github.com/andydoane/biblozoo/pull/54) **MERGED** to `experiment/native-ios-audio` as `76148dfd281aa91d7838908497def114756c0cfd` on 2026-11-09 02:09:43 UTC. Owner now reports actual real-iPhone Verse Scramble tests worked and marks the game complete. This brings **12/12 external standalone games owner-accepted**; per-event device metrics were not provided and must not be invented. The pending tests below describe the historical pre-merge plan, not current status. The next [N6n Playground Verse Typer PR #55](https://github.com/andydoane/biblozoo/pull/55) is OPEN, proposed **first of five Verse Playground activities** and independently needs Mac Swift/iPhone hearing tests. Stable `ios-prep`, original installed app, Web/PWA/Android, microphone and Zoo remain unchanged.

## Baseline now accepted by owner

[N6l Traffic Tap PR #53](https://github.com/andydoane/biblozoo/pull/53) was **MERGED** on November 9, 2026 01:24:22 UTC, commit `e0defada177a723401d3968c29fde99e4ecc827d`. Owner reports Traffic Tap real-iPhone testing **SUCCESS**, with no reported issue. Along with #49 PiP and all ten earlier standalone game migrations, this is **11 of 12 owner-accepted standalone games**. No exact iPhone logs or sound-event measurements were supplied—do not invent them. This PR aims to make Verse Scramble game 12.

## All sounds preserved, none substituted with a generic jingle

Verse Scramble Neo originally generates its gameplay sounds with Web Audio, not the five dormant `verse_scramble_pop_*.mp3` shipped under `verse_scramble_sounds/`. Those unused files are **left untouched**, not mistakenly used as replacement cues. On iOS, pre-render **all source-authored fixed sound possibilities** as 18 bounded PCM clips using the existing sole serial `AVAudioEngine` and `.soloAmbient` session.

| Original gameplay event | Fixed native ID | Source behavior |
| --- | --- | --- |
| correctLetter, 8 possible pitches | `scramble-note-60`, `-62`, `-64`, `-65`, `-67`, `-69`, `-71`, `-72` | Triangle 0.13 s, base gain `0.48 × 0.85`; **same `melodyPoolsForLength(1..10)` selects the note for the current letter** |
| wrongLetter | `scramble-wrong-letter` | Original descending two-triangle rubber bump, authored 3.60 gain multiplier |
| wordComplete | `scramble-word-complete` | Original four rising sine notes, 3.40 tuning |
| lettersFall | `scramble-letters-fall` | Original ~650 Hz filtered-noise Fridge Slide plus 240→110 Hz descending sine, 2.40 tuning; deterministic lowpass PCM approximation |
| messagePop | `scramble-message-pop` | Four-note C5/E5/A5/G5 Title/Instruction melody, tempo 0.65, gain 3.60 |
| bonusStart | `scramble-bonus-start` | Three-note D5/E5/G5 melody, 3.20 |
| bonusYouWin | `scramble-bonus-you-win` | C6/G5/E6 upbeat victory, 3.20 |
| bonusIWin | `scramble-bonus-iwin` | E5/D5/C5 descending opponent win, 3.20 |
| bonusFinal | `scramble-bonus-final` | G5/C6/E6/C6 final fanfare, 3.20 |
| uiTap1, uiTap2 | `ui-pop-1`, `ui-pop-2` | Existing native shared two UI pops at 0.45 |

**18 unique IDs = eight correct-letter pitch variants + eight other generated gameplay cues + two shared UI pops.** All notes/gains are predetermined in Swift; the JS bridge may select an allowlisted sound ID only, **never send arbitrary frequencies, durations, paths or oscillator parameters**. Actual iPhone sound is the final authority for pitch/timbre/volume. The filtered-noise effect uses repeatable pre-rendered noise rather than fresh random noise each trigger; listen especially for whether it still sounds like the intended falling magnets.

## Audio/recovery and gameplay constraints

- **Native iOS only**: no Web `AudioContext`, HTML silence prime, Web MP3 decode or fallback for Verse Scramble. The exact original Web Audio synthesis, source files, menu controls and mode logic remain intact for browser/PWA/Android.
- **Gesture-only iOS ownership**: Title/Help/Back pops may prewarm only two UI sounds. Genuine Difficulty select, Game Menu Close, failure Retry and the ordinary Welcome Back **Let's go** gesture must synchronously request `activateFromGesture` and fully prewarm all 18 before instruction countdown, falling magnets, bonus opponent or gameplay timers continue. No AVAudioSession reactivation from a lifecycle callback, auto-foreground, passive OS event, timer, background, or hot sound play.
- **PiP and interruptions**: UIKit App Switcher *held* while WebView looks visible, full switch, lock, and YouTube PiP playing/paused must invalidate old native PCM and present retriable **plain Welcome Back**. A true iOS `activation-os-rejected` (other audio still playing) is temporary, not fatal PCM error. Preserve the exact same randomly chosen word melody, letter/reward magnets, word progress, streak, selected verse, reward completion, and all five bonus pointer rounds. Game virtual time is frozen separately for any native Menu Close preflight and task switch; do not double-count or fast-forward bonus opponent.
- **Failure-only screen**: accessible Try Again and Back appear only for genuine sound bank/bridge failures, not quiet normal preflight. No misleading success badge, speaker claim or silent fallback. Leave stable `ios-prep`, separate original app, learn/audio-preview and all other 11 games untouched.

## Your normal GitHub Desktop → Xcode routine

You do **not** need the unusual Node commands for ordinary owner testing; GitHub runs them automatically. After both PR jobs (Node regressions and production web build) are GREEN on the **final PR HEAD**:

1. **Merge PR #54 yourself** into `experiment/native-ios-audio`. This is the isolated experimental branch, so your usual *merge first, physically test second* process is appropriate here; if a problem appears, we can do a corrective PR.
2. Open **GitHub Desktop**, confirm you're on **`experiment/native-ios-audio`** in the separate **`biblozoo-native-audio`** checkout, and click **Pull origin**. Do not use stable `ios-prep`.
3. Open that folder in VS Code → Terminal → New Terminal, paste **one command only**:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

4. In Xcode, choose the **App** scheme, your **physical iPhone**, and the separate testing app `com.andydoane.biblozoo.audiotest`. Press **Play**.
5. Test normally and tell me **PASS or any unusual behavior**.

Optional only if troubleshooting (not required for normal owner test): `node scripts/validate_native_verse_scramble_n6m.js`, `node scripts/validate_native_traffic_tap_n6l.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `node scripts/validate_native_only_ios_output.js`. GitHub Actions runs these.

## What to actually listen for and test

1. **Start/Help/difficulty/Back**: shared UI pop sounds work; choosing Easy/Medium/Hard prewarms 18 fixed clips quietly. No routine gray popup, premature instruction timer, lost Start tap, or duplicate entry.
2. **Original correct-letter *melodies***: choose short and long words, including 1–10 letter targets if your verse contains them. Each correct letter should advance through the **same selected note sequence** with pitch changes, not repeat a single success chirp. Incorrect magnet has the rubber bump; completing a word plays the ascending four-note fanfare and **remaining magnets fall with a noisy slide**.
3. **Bonus/profile pictures**: finish a verse and play the five-round “find the right letter before I do” bonus. Hear instruction/message pop, bonus-start melody, **You Win** and **I Win** distinct outcomes, and final fanfare. Verify pointer timing, correct color/letter identification, rewards, streak and profile picture magnet handling; original progress and medals should match browser.
4. **Game Menu and mute**: during active tiles and during bonus, if menu available, Open/Help/Back/Close, intentional mute then unmute, mode change and duplicate fast taps. No clock advancing behind native preflight; no phantom late audio; return to **same** magnets and same bonus pointer progress on Close.
5. **Switch/PiP**: *during correct letters* and separately *mid-bonus*, swipe up and **HOLD** App Switcher while WebView is still visible, return and tap plain Welcome Back **Let's go**. Test full app switch/lock, YouTube PiP **PAUSED** then **STILL PLAYING** while returning, and a fresh Home→game entry with PiP active. True OS denial should stay on a retriable plain Welcome Back without a silent running game.
6. **Home and eleven-game regression**: return Home and hear UI, then sample Traffic Tap's eight streak pairs, Verse Launch countdown, Tower word tones, Versey Bird, Munch and earlier accepted games, Feeding, Learn and verse previews.
7. **If silence/build failure**: *before restarting*, DEV **Inspect native state**, **Copy Audio Timing Report**, and save Xcode build errors; note iOS version, route/speaker, game stage/word length, whether PiP still playing. `prepared:true` or `accepted:true` means scheduling only, **not actual audible confirmation**.

## Final acceptance boundary

GitHub Linux Node+web CI verifies source/VM behavior, but **does not compile Mac AVFoundation Swift or prove iPhone speaker audio**. Mac Xcode compile and owner-heard functional recovery are independent gates. Current count **11/12 accepted**. After owner merges #54, tests on a real iPhone and reports PASS, and **only then**, we may record **12/12 standalone native-audio games completed** (not a claim about unrelated future app work). Every PR continues to update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` plus the dedicated guide.
