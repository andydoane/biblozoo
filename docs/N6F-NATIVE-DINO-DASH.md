# N6f — Dino Dash native-only iOS PCM and saved halfway sun-tap recovery

**PR:** [#45 — N6f Dino Dash](https://github.com/andydoane/biblozoo/pull/45), targeting the separate `experiment/native-ios-audio` branch. Base is owner-merged [#44 Verse Splat](https://github.com/andydoane/biblozoo/pull/44), integration merge `c89b5008aa4ef566ed81e6a9d3693902f852edad` (2026-11-08). **New owner feedback after testing #44 on iPhone: “That PR worked great!”** Record N6e as MERGED and OWNER-PASSED in `docs/PROJECT-HANDOFF.md` in this same PR. N6f source CI is separate from Mac Xcode Swift compilation and **physical iPhone audible acceptance, which remain PENDING** until owner testing.

## N6f sound inventory and unchanged architecture

**Only Dino Dash** receives new native sound routing on iOS Audio Test. Exactly **eight shipped original game MP3s + the two shared native UI pops**; no new resource generation, Web Audio/HTML audio fallback, new audio category/engine, mic or unrelated Zoo surprise. Swift's existing sole `.soloAmbient` AVAudioSession and serialized `AVAudioEngine` PCM sample worker handles every fixed ID.

| Original Dino Dash event | Swift fixed-ID PCM | Shipped unchanged resource |
| --- | --- | --- |
| Obstacle / collision | `dino-collision` | `dino_dash_collision.mp3` |
| Correct word | `dino-correct` | `dino_dash_correct.mp3` |
| Fall / crash | `dino-fall` | `dino_dash_fall.mp3` |
| Bonus course finish | `dino-finish` | `dino_dash_finish.mp3` |
| First jump | `dino-jump` | `dino_dash_jump.mp3` |
| Double jump | `dino-jump2` | `dino_dash_jump_2.mp3` |
| Correct streak | `dino-streak` | `dino_dash_streak.mp3` |
| Wrong word | `dino-wrong` | `dino_dash_wrong.mp3` |
| Title/Back/Help/mode/menu/speed UI | `ui-pop-1/2` | Shared `ui_sound_pop_1/2.mp3` |

No caller-supplied filenames/URLs pass from JS to Swift. Gameplay hot cues use predecoded PCM only; jumps stay immediate. The original browser/PWA/Android game keeps its existing Web Audio output, including its browser-only silent HTML prime; native iOS never enters the Web Audio context, silent HTML Audio prime, oscillator or browser sound decoding path.

On a **real title/Back/Help tap**, activate/prepare only two fixed UI PCM clips. This is distinct from gameplay readiness. On **difficulty selection, Game Menu Close, Speed Menu Close, Try Again, or plain Welcome Back Let's go!**, synchronously request Swift `activateFromGesture`, prepare the complete **10-clip bank**, scheduling the selected UI pop *before* the eight effects prepare where appropriate. No round begins/resumes unmuted without full bank. Successful preparation stays quiet with no routine gray overlay; genuine failure only → accessible Try Again/Back. The first cold UI tap might exceed the existing bounded 350ms and be deliberately omitted rather than played late (N9 separate). Native `prepared:true` and `accepted:true` are scheduling reports, NOT audible proof.

**Special Dino Dash halfway flow:** Dino Dash persists the current verse/round at its feeding checkpoint, reloads the WebView, and shows a sun/moon transition. In the fresh WebView document, the child **tapping the sun** is a new genuine audio-activation gesture. Start the full native 10-clip bank preparation **synchronously on that sun tap**, in parallel with the original sun/moon visual sequence. After the transition and original asset preparation, **resume the saved second-half/night checkpoint only if the native bank is ready** (or the user intentionally muted). If Swift fails or an App Switcher interruption invalidates the request, show **Try Again** rather than silently playing the saved course with an unprepared engine. Preserve the actual saved progress, course position, night sprites, diagnostic data and scoring. No new automatic gesture at reload, blackout or animation timeout.

**UIKit interruption:** swipe up and **HOLD** in the App Switcher while WebKit still appears visible, full switch or lock/unlock: stop native PCM, invalidate pending preflight, freeze existing pause-aware `welcomeClock` and CSS animations. Foreground alone must not activate/play audio. Show existing **plain Welcome Back** (not routine gray loading or unrelated Zoo Escape). Real **Let's go!** triggers full Swift bank preparation before resuming the **same round, dino position, physics, speed setting, streak and bonus progress** without time catch-up. Keep original menu/help pauses respected.

## Automated gates

```bash
node scripts/validate_native_dino_dash_n6f.js
node scripts/validate_native_verse_splat_n6e.js
node scripts/validate_native_food_slice_n6d.js
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

The new N6f source VM checks the actual fixed MP3 files/Swift allowlist, controller UI-only vs full bank, proper mode pop sequencing, missing clip/preflight failure, stale title taps and UIKit `.inactive`, no native Web/HTML fallback. Crucially it invokes **the actual Dino Dash Start/Back/How to Play/Close, difficulty, Game Menu, Speed Menu, first/double jump, Let's go! and real halfway sun tap callbacks** in a VM without any fabricated global `volumeScale`. It tests that back/inactive cancels pending mode start. Verify all existing CI Node regressions and production web build **GREEN on FINAL PR HEAD**. These are **not** Mac Xcode compilation or speaker measurements.

## Physical iPhone checklist after owner review/merge of #45

On the **separate Mac `biblozoo-native-audio` worktree**, switch to `experiment/native-ios-audio` after owner merge and Pull Origin:

```bash
node scripts/validate_native_dino_dash_n6f.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode build **BibloZoo Audio Test**, bundle `com.andydoane.biblozoo.audiotest`, on a **physical iPhone** without replacing the original installed BibloZoo app.

1. **Title and Help:** John 3:16 → Practice Games → Dino Dash. Tap title **Start** (opens difficulty), mode **Back** (returns to title), title Back (returns to Practice Games), and **How to Play/Close** on title and mode. Buttons always respond, no `ReferenceError`; hear native UI pops when native two-clip preparation meets the cold bound.
2. **Modes and immediate jumps:** Select Easy, then Medium and Hard in separate rounds; hear mode pop before gameplay bank finishes, no routine success gray modal and no game until all ten PCM clips prepared. Tap and tap again in air to trigger **first and double-jump MP3** promptly; jump motion must not wait for an audio promise. Collect correct tablets and wrong ones; listen for correct, streak, wrong and collisions/fall with unchanged obstacles, speed and score. Test Psalm 23:4 too.
3. **Menu/Help/Speed/mute:** During a moving course, open Game Menu, How to Play and Back/Close, and Speed Menu open/choose speed/Close. Each explicit native Close gesture prepares the full bank before resuming the **same** position/streak/timer; no phantom fast-forward or round reset. Mute suppresses output without breaking navigation; unmute then Close restores native sounds. Check native UI pops and that no Web/HTML audio is used.
4. **Halfway feeding reload (critical):** Play far enough to reach the halfway feeding cutscene and WebView reload. Wait for the **sun**. Tap it exactly once and observe the original sun-to-moon transition. Verify the night half of the **same round** resumes after native PCM preparation, with correct progress/streak and audible jump/collision clips; original night art remains. Repeat if possible and briefly hold App Switcher just after tapping the sun—there must be no stale ghost game start; Try Again if needed.
5. **Bonus/completion:** Trigger bonus running/jumps, fall/crash and finish course; hear fall/finish and the original Dino end-screen and medal results, with preserved progress/diagnostics. Test Replay/Back.
6. **Task switch/lock:** During active movement, swipe up and **HOLD** in the App Switcher so WebKit stays visibly in the thumbnail. Also switch fully away and back and lock/unlock. Confirm immediate pause, **plain Welcome Back**, no auto sound, explicit Let's go! full bank and the **same** round, speed and physics with no time catch-up. Repeat while menu is paused; quick Start→Back, difficulty→Back, double taps must not launch an abandoned round.
7. **Regress prior owner-passed audio:** Verse Splat title/mode/pop/correct/bonus/return (owner just reported #44 working great), Food Slice slice/swoosh/bomb/bonus, Scripture Snake Start/Back/Help/game effects, Bible Bugs title/mode/end, four Feeding modes incl Bounce, Learn Chunks/Echo and Detail/Flashcards previews. Original stable app, `ios-prep`, Web/PWA/Android untouched.

**When anything is silent/stuck:** before restarting capture DEV → **Inspect native state** and **Copy Audio Timing Report**; note exact event/screen/difficulty/verse, cold/warm, held vs full switch, and any Xcode JS exception. Native `prepared:true` or `accepted:true` does not confirm audible speaker output.

**Owner alone reviews/merges**; no automatic merge. In the next PR or docs-only update, reconcile actual post-merge iPhone findings in `docs/PROJECT-HANDOFF.md`. After N6f passes, N6g one additional standalone game; remaining standalone games, Playground/Daily/Read My Verse, N7 mic/DSP, N8 independent Zoo and N9 cold first-pop timing stay separate.
