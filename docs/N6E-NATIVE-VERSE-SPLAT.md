# N6e — Verse Splat native-only iOS PCM migration

**PR:** [#44 — N6e Verse Splat native-only PCM](https://github.com/andydoane/biblozoo/pull/44), targeting isolated `experiment/native-ios-audio` after owner-merged [#43 Food Slice](https://github.com/andydoane/biblozoo/pull/43) `90833629bfb0e351f70d87f31b885d5fcfa06161`. **Owner physically tested #43 on iPhone and reported “I went thorugh all the tests and the PR is working great.”** The successful Food Slice result must be represented as **post-merge owner acceptance**, not `untested/open`, in the living `PROJECT-HANDOFF.md`. **N6e Xcode and real iPhone hearing remain PENDING.** Owner alone reviews/merges.

## Intent and exact output contract

Convert **only Verse Splat** on the isolated iOS Audio Test app to native **AVFoundation output, zero Web/HTML audio fallback**. Preserve the sole existing Swift `.soloAmbient` `AVAudioSession`, existing serialized `AVAudioEngine` PCM effects worker and existing fixed shipped MP3s. Swift changes only fixed sound-ID/filename allowlists; no session category change, no new backend, no dynamic URLs or filenames from JS, no new synthesized oscillators, no microphone, no unrelated Zoo surprises. Original Web/PWA/Android keeps Web Audio, including its existing HTML Audio browser fallback.

| Original Splat sounds | Native fixed-ID PCM | Original local MP3s |
| --- | --- | --- |
| Five randomized paint pops | `splat-pop-1..5` | `verse_splat_pop_1.mp3` … `verse_splat_pop_5.mp3` |
| Three randomized correct clips | `splat-correct-1..3` | `verse_splat_correct_1.mp3` … `verse_splat_correct_3.mp3` |
| Wrong | `splat-wrong` | `verse_splat_wrong.mp3` |
| Streak | `splat-streak` | `verse_splat_streak.mp3` |
| Painting percentage result | `splat-paint-score` | `verse_splat_paint_score.mp3` |
| Bonus start | `splat-start` | `verse_splat_start.mp3` |
| Positive/prize feedback | `splat-positive` | `verse_splat_positive.mp3` |
| Shared title/mode/menu/help pops | `ui-pop-1/2` | Existing `ui_sound_pop_1/2.mp3` |

Total **13 game clips + 2 UI pops = 15 fixed native PCM IDs**. Existing JS chooses the random file, non-repeat rule and cooldown and preserves the original effect volumes: 0.45 UI, 0.72 pop, 0.88 correct, 0.9 wrong/positive, 0.95 streak, 0.92 paint score/start, 0.48 spawn. N6e changes only the output backend on native iOS, not the game timing/rules/rewards. The backend returning `prepared:true`/`accepted:true` means prepared/scheduled in Swift, **not confirmed audible**.

Native title/Back/Help gestures activate Swift and prepare only the two UI PCM clips; **UI-only readiness never means gameplay is ready**. A real mode selection or game menu Close/Retry gesture synchronously calls `activateFromGesture`, prepares both UI clips and schedules that button pop before preloading the 13 gameplay clips. **Do not begin/resume gameplay until all 15 have prepared successfully**, preserving navigation buttons while preparation proceeds silently; no routine gray success overlay. Only real session/sample failures show accessible **Try Again / Back**. Cold-first title UI preparation exceeding the bounded **350ms** first-tap deadline can deliberately omit a stale pop, tracked separately as N9 latency work, never play it on the next screen.

Native output is invalidated on UIKit `.inactive`, including swipe-up-and-HOLD while WebKit appears visible; Splat's game/bonus RAF and pause-aware delays stop. On foreground: **no automatic audio, no automatic gameplay**; use the existing **plain Welcome Back** / real **Let's go!** gesture to reprepare the full native PCM bank and continue the **same** verse, paint coverage, blobs, score, bonus time and medal state. No unrelated Zoo Escape in native case. A full app switch or screen lock follows the same rule. Browser/PWA/Android welcome behavior remains unchanged.

## Automated source + real click regression

```sh
node scripts/validate_native_verse_splat_n6e.js
node scripts/validate_native_food_slice_n6d.js
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_standalone_ui_pops_n6c1.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

N6e actual-source VM tests the Swift allowlist, on-disk MP3s, native controller's UI-only vs whole-bank state, native original effect randomization/cooldown output, stale race and held UIKit `.inactive` fences; it executes the real **title Start/Back/How to Play/Close, difficulty select, Game Menu open/Close, bonus menu, mute, Let's go!** JS callbacks without an invented `volumeScale` global (lesson from Snake #41/#42). Existing experiment CI Node suite and production web build must be green on **final PR HEAD**. CI cannot compile Swift in Mac Xcode or certify audible speaker output.

## Owner real physical iPhone checklist (also send steps in ChatGPT)

After owner review/merge of #44, in **separate `biblozoo-native-audio` Mac worktree** select `experiment/native-ios-audio`, Pull Origin. At the repository root:

```sh
node scripts/validate_native_verse_splat_n6e.js
npm run build
npx cap sync ios
npx cap open ios
```

Build and run **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` in Xcode on a **physical iPhone**; do not replace the stable BibloZoo app.

1. **Title/mode and help:** John 3:16 → Practice Games → Verse Splat. Tap title **Start** → Choose Difficulty and **Back** → title, then back to Practice Games. Try **How to Play** and **Close** on both title and mode screens. Each button responds without a JS exception, with intended native pop where a prepared sample is available. Cold first tap may occasionally drop after 350ms instead of playing late. No routine gray success loading modal.
2. **Full native readiness:** Select Easy; hear its **own** mode pop before entering round. Check tutorial paint and correct-word selection, no game beginning until all native effects ready. Repeat Medium and Hard and a second verse **Psalm 23:4**. Do not let stale mode/back taps start a different difficulty or make delayed sounds on the wrong screen.
3. **Effects and rewards:** Listen for several of **five paint pops**, **three correct-word clips**, wrong/decoy, streak, soft blob-spawn pop, painting percentage score, bonus start, positive/prize feedback. Confirm all sound variations' original pacing/cooldowns, tutorial/word order/paint coverage/percentage score, prize, medals and progress. **No native Web/HTML audio fallback.**
4. **Menu, Help, Mute and recovery:** In an active round and again during bonus, open Game Menu, **How to Play**, Back, Close; opening pauses native effects and paint physics, closing from real click re-prepares full bank and resumes **the same** blobs, paint coverage and bonus time. Mute/unmute: intentionally muted silence, no inability to navigate; game effects recover after deliberate unmuted Close.
5. **Task switching/locking:** While blobs move, swipe up and **HOLD** in App Switcher (WebKit thumbnail may remain visibly active); then return. Repeat full switch to another app and screen lock/unlock. Physics and PCM pause. A **plain Welcome Back** appears, never auto-plays sound/advances paint or bonus clocks. Only **Let's go!** genuinely reactivates/prepares Swift PCM and resumes the same round, paint and bonus timer. Check a paused menu and during bonus too.
6. **Fast navigation and failure:** Repeated Start/Back/difficulty taps must not throw, start an abandoned round or play stale pop. A genuine missing native sample/session error should block unmuted round start or pause resumed game, showing **Try Again/Back** rather than a silent broken game; no gray success popup.
7. **Regression:** Recheck owner-passed Food Slice title/menu/5 slice+3 swoosh/wrong/bomb/bonus/native return, Bible Bugs title/mode/end pops, Scripture Snake Start/Back/Help and effects, all four Feeding modes including Bounce, Learn instruction/Chunks/Echo, BibloPet Detail and Flashcards native previews. Original app, stable `ios-prep`, browser/PWA/Android remain unchanged.

If sound or UI fails, **before restarting** capture **DEV → Inspect native state** + **Copy Audio Timing Report**, exact button/event and verse/mode, cold vs warm, how you switched apps, whether the speaker was actually audible, and any Xcode JavaScript exception. `accepted:true` is not a loudspeaker measurement.

**Stop/go:** owner Xcode compile and real iPhone audio test PENDING. Owner alone reviews and merges. Once owner reports post-merge status, update `docs/PROJECT-HANDOFF.md` in next PR or docs-only correction, and only then move one additional standalone game (N6f); N7 microphone/DSP, N8 independent Zoo surprises and N9 first-pop reliability remain separately scoped.
