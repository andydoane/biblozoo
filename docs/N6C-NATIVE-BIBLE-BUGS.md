# N6c — Bible Bugs, fixed native iPhone game sounds

> **Owner review and physical iPhone gate for [PR #39](https://github.com/andydoane/biblozoo/pull/39).** PR targets **only** `experiment/native-ios-audio` from owner-merged [N6b.1 #38](https://github.com/andydoane/biblozoo/pull/38) SHA `6f2ab22a85204cb5434e3d51313314e632df213c`. Use separate Mac worktree `biblozoo-native-audio`, iOS test app **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest`. Original installed app / `ios-prep` / Web/PWA/Android **untouched**. Only the owner reviews and merges.

## Last physical evidence and next single-game slice

The owner says **all N6b.1 quiet Scripture Snake popup tests worked well**, and requests the next planned PR. Previously Scripture Snake was tested many times with multiple successful iPhone task-switch recoveries. This is evidence of the tested scenarios, **not an acoustic latency measurement or an assertion that every individual Snake effect was audited**. N5b.3 full John 3:16 Learn and Psalm 23:4 interruption recovery, N6a BibloPet Detail/Flashcards previews, four Feeding modes and DEV narrator were already owner-tested.

N6c is **only Bible Bugs**, the frog game in Practice Games. It does not touch Snake, the other ten unmigrated games, pet progression, recording, microphone/DSP, standalone Zoo surprises or game-scoring behavior. Native-only iOS now routes game sound events into the **same sole `.soloAmbient` AVAudioSession owner and prewarmed Swift AVAudioEngine PCM worker** already proven for Feeding and Snake.

| Actual original Bible Bugs event | Fixed Swift ID(s) | Bundled resource |
| --- | --- | --- |
| Tongue fired on tutorial/word/bonus bug | `bugs-tongue` | `bible_bugs_tongue.mp3` |
| Bug popped/eaten (five random variations) | `bugs-pop-1` … `bugs-pop-5` | `bible_bugs_pop_1.mp3` … `_5.mp3` |
| Correct word / incorrect word | `bugs-correct`, `bugs-incorrect` | `bible_bugs_correct.mp3`, `bible_bugs_incorrect.mp3` |
| Word streak and increasing bonus multiplier | `bugs-streak` | `bible_bugs_streak.mp3` |
| Bonus start / bonus result | `bugs-bonus-start`, `bugs-bonus-end` | `bible_bugs_bonus_start.mp3`, `bible_bugs_bonus_end.mp3` |
| Stink bug penalty | `bugs-stink-bug` | `bible_bugs_stink_bug.mp3` |
| Original shared UI taps | `ui-pop-1`, `ui-pop-2` | Existing native UI samples |

All 12 Bible Bugs MP3s are prepackaged at `public/verse_games/bible_bugs/bible_bugs_sounds`. The Swift bridge accepts only 12 fixed `bugs-` keys plus existing shared UI fixed IDs. **Never** pass dynamically assembled paths, remote URLs or input-controlled tones. Existing JavaScript random pop choice, all event triggers and original volume ratios remain; only the audio *output backend* changes. The hot tongue/bug physics handler does no decoding, engine start or Web Audio resume.

## Gesture, quiet UI, interruptions, recovery

- Child's real **Choose Difficulty** tap calls native `activateFromGesture({purpose:"game"})` synchronously; then all 14 fixed sounds must preload and warm **before** entering the round. The original difficulty screen remains visible during normal preparation: **no new gray loading popup** (N6b.1 successful-UX standard). Accessibility `aria-busy` is invisible. Swift `prepared` status is **not** human speaker-proof.
- Native **Game Menu → Close**, any touch-end fallback Close, or explicit **Welcome Back → Let's go!** rewarms the bank from the actual child gesture **before** resuming the same bug state/timer. The menu and pause continue until ready, with no new normal success modal.
- **Game Menu, Help, mute, exit, task switch, UIKit inactive/held App Switcher** stop/discard effects and cancel pending attempts. UIKit swipe-up-and-**HOLD** can mark the app inactive while WebKit remains visible; the native-only game requests the established *plain* Welcome Back and pauses physics, with no automatic sound/clock on foreground. On return the child taps Let's go to rewarm; **not** a Zoo Break, no score/physics catch-up.
- A **genuine failed** activation/preload/playback is different from normal preparation. Only then an accessible **Try Again/Back** dialog appears. A child must tap Try Again for fresh native activation; a successful retry re-enters the selected difficulty or resumes the same running round. **Never** silently switch to Web Audio/HTML or pretend an accepted bridge event is speaker audibility.
- Duplicate Choose Difficulty taps during preflight do not start parallel native banks; Back/title/mode/exit and offscreen invalidation reject late async results before a new game starts. This prevents surprise game starts and ghost sounds. Mute permits intentional quiet gameplay, with a new user gesture to prepare sounds on unmute.

## Source CI status

Full native Bible Bugs source/VM and asset-allowlist check (including stale preload cannot stop newer warm bank), all older Node regressions, and production web build **GREEN at `22a2ec99`** ([Actions #42442016620](https://github.com/andydoane/biblozoo/actions/runs/42442016620)). Final documentation-only HEAD rerun still required. **No Swift Xcode compilation or physically audible iPhone sign-off yet.**

## Automated validation

```bash
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_snake_quiet_preflight_n6b1.js
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_verse_previews_n6a.js
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

The GitHub Actions full regression suite and production web build are *source-level* tests. They do **not** prove Xcode Swift compilation, installed bundle packaging, successful on-device AVAudioEngine playback, an actual audible effect or perceived latency. Run Xcode on a physical iPhone, not just the simulator. If compilation fails, record the real Swift error; do not claim a CI-green device pass.

## Owner physical iPhone test procedure — also give in chat

1. **Separate app and normal startup:** Launch **BibloZoo Audio Test**, select John 3:16 → Practice Games → **Bible Bugs**, choose Easy. Normal difficulty selection should remain visible (briefly if needed) while native sounds prepare; **no routine light-gray “getting sounds ready” popup**. When prepared, start the original frog-and-bugs tutorial. No unexpected Zoo Break, native failure UI or audible Web fallback.
2. **Actual tutorial and word sounds:** Tap the tutorial bug and a falling word bug. Hear a **tongue** sound and one of five randomized **bug-pop** sounds. Intentionally eat a **correct** and an **incorrect** word; hear distinct correct/incorrect reactions. Continue to a word **streak** and hear its effect. Confirm original selected word, verse build, mistakes/misses and frog animation untouched.
3. **Bonus sounds and outcomes:** Finish enough of the verse to reach Bible Bugs bonus. Listen for **bonus-start**, catch normal bonus bugs (tongue and varied pops) and deliberately catch a **stink bug** (penalty sound). Finish bonus and hear **bonus-end**. Confirm Bugs Eaten counter, score, multiplier, medals and completion screen use the original rules, not an audio result. Complete at least one real game if possible.
4. **Another verse/difficulty:** Repeat with Psalm 23:4 and Medium or Hard. Check bugs/words correspond to chosen verse, correct/incorrect/tongue/bonus effects still use native samples, and no cross-verse game credit.
5. **Menus and mute:** Mid-round open Game Menu. Sounds and frog movement should stop. Close it and check the game **quietly prewarms** without an extra gray success popup, then resumes the **same** bug positions and timer. Use How to Play and the speed/game controls if present. Test iPhone touch menu buttons, mute and unmute. Muted gameplay is intentionally silent; after unmuting and closing the menu, real bug/word effects should work. Exit/back: no old pops or ghost effects.
6. **iPhone App Switcher swipe-up-and-HOLD:** While a bug is falling, swipe up into App Switcher and **HOLD** with the Bible Bugs thumbnail still visible. Sound/physics stop promptly. Return: one **plain Welcome Back**, no effects or game motion automatically, no Zoo Break. Tap **Let's go!**: the same bug placement, timer and score resumes after native rewarm, **without a second gray loading popup** or physics catch-up.
7. **Full task switch repeatedly:** Switch fully to another app during active gameplay, return and tap Let's go. Repeat several times; try during bonus if feasible. No repeated/misordered word credit, lost state, duplicate audio or automatic foreground sound. Try muted switch as well.
8. **Preflight race / stale Back:** At difficulty selection, tap a mode and rapidly Back or switch apps during the quiet prewarm (only if the interval is long enough). A delayed native response **must not** open a game after leaving. Return requires a new actual mode tap; repeated taps do not start multiple games. If this window is too short to reproduce on iPhone, the controlled Node VM test exercises it.
9. **Failure-only Retry:** If a native sound/session genuinely fails, an explicit **Try Again** dialog is appropriate. Tap it and verify a fresh sound attempt, not silent gameplay, Web Audio fallback or a Zoo Break. **Do not intentionally delete assets or corrupt the installation** to induce this.
10. **Regression across proven owners:** Briefly play Scripture Snake: quiet difficulty and successful held-switch Welcome Back from N6b.1, no gray success dialog. Test BibloPet Detail Listen/Stop (no extra under-button text) and Flashcards Listen. Revisit full John 3:16 Learn instructions/Chunks/Echo, Psalm 23:4 interrupted Learn, DEV John narrator, app UI pops and all four Feeding modes Classic, Melody, Labyrinth and Bounce. First native UI pop after cold/return may still be omitted by N5a's bounded first-pop UX (N9 future); not proof Bible Bugs is working or broken.
11. **If any audio or resume fails:** Before restarting, DEV → **Inspect native state** and **Copy Audio Timing Report**. Note which Bible Bugs sound should have occurred (tongue/pop/correct/wrong/streak/bonus/stink), what actually was heard, mode and verse, first launch vs held/full switch, error/Welcome Back screen, whether frog movement/timer/score changed. Swift timing says *dispatched*, not measured speaker output.

**Owner sign-off is pending**. Future N6d another small game, then additional Playground/Daily/Read My Verse slices; N7 microphone/DSP, N8 independent Zoo, N9 reliability remain separate. Maintain the living [PROJECT-HANDOFF](PROJECT-HANDOFF.md) in every PR and never merge via assistant.
