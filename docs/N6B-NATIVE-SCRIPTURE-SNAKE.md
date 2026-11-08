# N6b — native Scripture Snake gameplay sounds & original clean Verse Detail Listen

> Owner acceptance checklist for [PR #37](https://github.com/andydoane/biblozoo/pull/37), based on owner-merged N6a [#36](https://github.com/andydoane/biblozoo/pull/36) `0be4612ba918feca83dc53f816db111950892a9d` on the isolated `experiment/native-ios-audio` branch. **Do not touch `ios-prep`, `main` or original BibloZoo app**. Dedicated Mac worktree `biblozoo-native-audio`; experimental iOS app **BibloZoo Audio Test**, app ID `com.andydoane.biblozoo.audiotest`. **Only owner reviews/merges.**

## Latest owner iPhone evidence and requested change

Owner explicitly reports **N6a succeeded**: both BibloPet Detail and Flashcards preview Listen buttons worked as specified. N5b.3 also succeeded: John 3:16 and Psalm 23:4 had spoken instructions/all chunks, John 3:16 completed entire Learn, Psalm interruption recovery worked.

Owner observed that PR #36 added small visible narration/status lines below BibloPet Detail **Listen to the Verse**, including “Reading the verse reference…” and “Playback paused. Tap Listen to start again.” These were NOT in the original app. **N6b removes only that visible paragraph** on the detail screen, while preserving the original Listen button, N6a **Stop Listening**, native ref→full-verse sequence, cancellation/retry and Flashcards behavior. Status text was diagnostic UI, not required by narration.

## Precisely migrated sound ownership

N6b migrates **Scripture Snake only**, one of the 12 standalone practice games. On isolated native-only iOS, this game used Web Audio/HTML sound producers blocked by N1. It now uses `window.BibloZooNativeSnakeAudio`, loaded before Snake's existing `game.js`, which routes **fixed** keys into **the same Swift NativeSoundPlugin** / single `.soloAmbient` session and worker-owned prewarmed PCM AVAudioEngine already proven in Feeding.

| Original Snake event | Fixed native ID | Resource / notes |
| --- | --- | --- |
| Correct word | `snake-correct` | `verse_snake_correct.mp3` |
| Wrong word | `snake-wrong` | `verse_snake_wrong.mp3` |
| Fruit pickup | `snake-fruit` | `verse_snake_fruit.mp3` |
| Double-tap speed boost | `snake-boost` | `verse_snake_boost.mp3` |
| Bonus round start | `snake-bonus-start` | `verse_snake_bonus_start.mp3` |
| Eat mini snake | `snake-eat` | `verse_snake_eat.mp3` |
| Bonus result | `snake-bonus-result` | `verse_snake_bonus_result.mp3` |
| Orb pickup | `snake-orb` | Six precomputed C5–C6 triangle PCM notes; indices 0–5 |
| UI tap 1 / tap 2 | `ui-pop-1` / `ui-pop-2` | Existing fixed native UI PCM pop resources |

All seven original MP3 sources are static bundled files under `public/verse_games/verse_snake/verse_snake_sounds`. Swift rejects any other Snake ID or invalid orb index. The orb is an intentionally close native triangle-tone approximation (same six-note sequence and size-driven volume), **not** a Web oscillator and not guaranteed sample-for-sample parity. This PR does not implement unheard `boostReady` / `verseComplete` MP3 placeholders that are `null` in Snake's existing sound map.

A child's genuine **Choose Difficulty**, **Try Again**, menu/speed **Close**, or explicit Welcome Back **Let's go!** activates session with Swift `purpose:"game"` *synchronously* before awaiting preload. All 7 sounds + existing 2 UI pops + 6-tone orb bank must report prepared before game starts or physics resumes. Decoding, engine startup and note synthesis happen off the hot gameplay collision path. Native preflight refusal offers **Try Again** with a genuine new tap, rather than beginning a silent round or enabling HTML/Web output. An unexpected active playback failure pauses the current game and offers retry. The game owner preserves original physics, collision flags, scoring, medals and completion; **audio results do not modify progress**.

**App Switcher:** `biblozooAppLifecycle.active === false` on UIKit .inactive stops PCM and pauses the game clock **even if the WebKit card stays visible in a swipe-up-and-HOLD**. The existing *plain* Welcome Back overlay appears on return, requiring real **Let's go!** to prewarm and continue the **same round** without catch-up. No auto sound on foreground. Existing Web/PWA/Android Zoo Escape/recovery path remains untouched; native Snake does **not** misinterpret an unavailable clip as a reason to start Zoo Break. Mute/menu/speed/exit stop effects; closing menu or speed re-prepares on the actual tap before movement resumes. Subsequent game modes are **not** silently marked migrated.

## Local source and build

In the dedicated Mac worktree, while PR branch is checked out to test before merge, or after owner merges and Fetch/Pulls the updated `experiment/native-ios-audio`:

```sh
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_verse_previews_n6a.js
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

Build **BibloZoo Audio Test** in Xcode and run on a **physical iPhone**. GitHub CI Node/VM/source checks + the web production build are not Swift compilation, the actual installed app’s bundle, or acoustic hearing. Run the new validator to check the exact source assets (not merely tests of state).

## Owner physical iPhone checklist — include full steps directly in ChatGPT

1. **Detail UI cleanup:** Open the BibloPet Zoo, select John 3:16 and tap **Listen to the Verse**. There should now be **NO text underneath the button** saying “Reading the verse reference…” or “Playback paused…”. The button itself becomes **Stop Listening** during native reference→whole verse and returns afterward. Repeat Stop and Psalm 23:4. Flashcards Listen and its own retry UI must be unchanged.
2. **Native Snake entry:** In the separate Audio Test, enter **Practice Games → Scripture Snake**, choose **Easy**, then tap a difficulty. Native sounds must finish prewarming before the round moves. It may show “Getting native game sounds ready…” momentarily. A refusal presents **Try Again** / **Choose Difficulty**, not a fake silent round or Zoo Break.
3. **Core effects actually heard in gameplay:** Guide snake into a **correct word** and an intentionally **wrong word**; they must make distinct native sounds. Eat **fruit** and a glowing **orb**; listen for fruit sound and a short changing-pitch orb tone. Use a **double tap** for speed boost and hear boost. Test a second orb: note should vary with collection order. No Web effect should emerge on isolated iOS.
4. **Bonus and completion:** Progress to the **bonus snake round**. Listen for **bonus start**, **eating mini snakes**, and **bonus result** when it ends. Finish one complete real Scripture Snake run and ensure game completion screen, score, medal and progress behave exactly like the established original. No bonus/score/medal should be awarded merely by a native `accepted` result; physical collisions alone drive them. The original unused `verseComplete`/boost-ready placeholder sounds remain silent as before.
5. **Difficulty/verse isolation:** Try Medium or Hard and a second published verse (for example Psalm 23:4), confirming effects are the same native IDs but words, snake physics, speed and rewards reflect the selected verse/mode. The game must not replay any John 3:16 narration or interfere with real Learn.
6. **Mute and menus:** During a round, open the **Game Menu**. Native effects stop; old orb/fruit/bonus sound must not continue under the paused menu. Close it: the **actual Close tap** re-prepares native assets, then the same round resumes. Try **How to Play**, **speed menu**, Close, **mute**, continue silently while intentionally muted, then unmute using the menu and explicitly Close to restore native effects. Try leaving/returning to difficulty selection, returning to title and fully exiting; no stale audio/ghost collisions.
7. **App Switcher held:** During active Snake motion and sound, swipe up and **HOLD** iPhone App Switcher thumbnail, without fully changing apps. Sound must stop and snake position/game clock must freeze. Return: a **plain Welcome Back** should be visible, with **NO automatic effect, no Zoo Break and no game motion**. Tap **Let's go!**: the native bank warms and **the same round** resumes, with no catch-up collisions/score changes.
8. **Full task switch:** Switch completely to another app mid-Snake and back, then repeat explicit Let's go! recovery. Also try switching while intentionally muted and during the prewarm screen; after background the game must not activate sound by itself, and Retry must require a new tap.
9. **Missing audio/retry:** A refused native sound should leave a visible **Try Again** instead of silently claiming prepared output. This can be observed if session is interrupted/prewarm fails; no need to deliberately delete assets. A normal retry must preserve the current game round where applicable. No HTML/Web Audio fallback, no failed-clip Zoo Escape or unrelated pet/reward changes.
10. **Regressions:** Test full John 3:16 Learn instruction/Chunks/Echo sequence, Psalm 23:4 switch recovery, N6a BibloPet Detail/Flashcards previews, DEV John 3:16 Play/Pause/+5s/Continue, app UI pops, and all four Feeding modes Classic, Melody, Labyrinth, Bounce. First post-cold/return native UI pop may still be intentionally skipped under N5a prewarm deadline (N9 known UX debt); collision sounds must work after successful Snake bank preparation.
11. **If audio is silent/late/wrong:** use DEV **Inspect native state** and **Copy Audio Timing Report before restarting**. Report which Snake event should have fired (fruit/orb/word/boost/bonus), mode, first/cold or post-switch, native readiness/retry state, and what you really heard. The audio timing ring measures native dispatch, not actual speaker output.

**Non-goals:** Web/PWA/Android game output; other 11 standalone games, Playground, Daily, Read My Verse, Flashcards microphone/recording/Wacky Replay/DSP (N7), independent Zoo surprises (N8), N9 prewarm reliability, or stable iOS original. Preserve single native session, `.soloAmbient`, no auto sound on foreground, original pet/reward/verse progress. Owner merges; every PR includes the living [handoff](PROJECT-HANDOFF.md).
