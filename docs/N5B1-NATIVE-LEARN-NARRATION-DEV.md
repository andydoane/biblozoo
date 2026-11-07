# N5b.1 — Native long-form Learn narration player, DEV hardware pilot

> **PR #33 (N5b.1) — experiment only.** Base `experiment/native-ios-audio` after owner-merged N5a PR #32 (`a4ed899e`). Do not merge into `ios-prep`, `main`, or the original installed BibloZoo. This first slice establishes an explicit AVFoundation narration *player contract* before rewiring child-facing Learn modes.

## Owner report and scope

On November 7, the owner reviewed, merged and physically tested N5a [PR #32](https://github.com/andydoane/biblozoo/pull/32) and reported **all steps passed**: UI pops work, Feeding popup cleanup and regressions passed under the testing guide. An occasional **silent first UI pop** after fresh launch or task switch remains. This is an expected N5a compromise: on an actual gesture Swift may need time to reactivate/prewarm the native pop samples, and after the 350 ms deadline the request is intentionally dropped rather than producing a late ghost tap. It is *not* proof of perfect first-tap reliability; record as known UX debt for N9. The owner builds successfully using `npm run build && npx cap sync ios && npx cap open ios` (correct `run`, not `rum`).

N5b.1 adds **one fixed allowlisted** `learn-john-3-16` native AVAudioPlayer DEV test. `verse_audio/john_3_16.mp3` is a checked-in local source and an explicit Xcode bundle resource, never a URL supplied by JS. The existing `BibloZooNativeSound` session owner remains the only activation/coordinator; `activateFromGesture({purpose:"learn"})` is requested **only within a real DEV Play button tap**. A separate main-thread AVAudioPlayer handles long-form narration, not the short-clip PCM engine. `prepareNarration`, `playNarration`, `pauseNarration`, `seekNarration`, `getNarrationState`, `stopNarration`, and native completion/invalidated events are isolated to an opaque, bounded request ID. Playback state returns local position/duration in milliseconds, and a native delegate `ended` callback is accepted only for that current player/request while active.

A genuine UIKit inactive/background event, audio interruption, route change, or media reset stops the player and invalidates the old request. Foreground return never autoplays. The next **new human Play tap** starts a fresh DEV request; source-owned mid-verse positioning after interruption belongs to later N5b Learn integration. A stale `ended` event must never award progress. No Web/HTML fallback, browser APIs, audio category change, microphone activation, personal/verse text telemetry, or capture/DSP changes.

**Not part of N5b.1:** Regular Learn Listen → chunks → Echo is *not* yet wired. All child-facing Learn progress, verse completion, two chunk passes, Echo pacing, Hide/Final Recall timer, and source-specific Learn Welcome Back recovery remain owned by their existing JavaScript logic. Their unconverted audible output in `.audiotest` remains blocked, not falsely marked as fully migrated. Subsequent N5b.2+ slice(s) must extend the reviewed fixed manifest to **all published verses**, integrate activity/request ownership and native position/completion/seek so that no false Learn completion, stale chunk advance or unrelated UI-audio recovery is possible. Web/PWA/Android keep existing HTML narration.

## Automated validation

Run from your separate `biblozoo-native-audio` worktree with PR branch checked out, or after owner merges PR #33 and Fetch/Pull of `experiment/native-ios-audio`:

```sh
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_learn_narration_recovery_gate.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

The experimental GitHub workflow must have **green Node regression checks and production web build on final PR HEAD**; neither proves Swift compiled or a human heard the long narration.

## Physical iPhone acceptance (owner)

1. In Xcode verify the separate **BibloZoo Audio Test** target `com.andydoane.biblozoo.audiotest` is selected, build and run on your physical iPhone. Your original BibloZoo must remain installed separately.
2. On the home/title screen open the existing **DEV · Native Audio** panel. In the new **N5b.1 · Learn narration** section tap **Play John 3:16**. You should hear the actual full spoken verse through the native player. No WebKit/HTML Audio or UI pop should substitute for its speech. The status `Native playback accepted` is not itself proof of hearing.
3. While it is speaking, tap **Read position** twice a few seconds apart. The displayed elapsed seconds should increase; duration should be reasonable and stable. Tap **Pause**, then **Read position**; the elapsed position should hold steady. Tap **Skip +5s**; the position should advance by approximately five seconds (clamped at the end), without the clip unexpectedly restarting. Tap **Continue**; hear the remainder and observe a single native **completion event** at the true end, not while paused or seeking.
4. Repeat **Play John 3:16** to start a fresh explicit request, then open the iOS App Switcher by swiping **up and holding** while narration is audible, without selecting another app. Native speech must stop immediately; returning to the test app must **not** automatically continue. Reopen DEV if needed and deliberately tap **Play John 3:16** to start from the beginning. Repeat a **full task switch** to a video app and back; no stale completion, ghost audio, or new session/mic prompt.
5. Tap the DEV panel **×** while speaking: narration must stop and not produce an old completion event later. Confirm existing DEV star/chomp/Melody E4, app UI pops and all four Feeding modes (Classic/Melody/Labyrinth/Bounce) still work normally. The very first UI pop may remain silent after prewarming, but subsequent taps should work and not play late.
6. Open a normal Learn flow: **this pilot does not migrate its sounds yet**. Never treat silence or a blocked WebKit `play()` result as a successful verse/chunk/echo advance; navigation and user progress should remain intact. Do not force completion through this developer pilot.

If a voice fails, **do not restart first**. Note if DEV says `Native narrator unavailable`, or `Native playback accepted` with real silence. In DEV, tap **Inspect native state** and **Copy Audio Timing Report** before closing the app. The old timing ring is for short PCM sounds; it does not claim an acoustic onset for narration. Report whether you actually heard John 3:16, whether position moved, and which step failed.

## Next PR / handoff rule

After owner Xcode/physical device acceptance, design and implement **N5b.2** to route regular Learn **Listen reference + full verse** through a vetted published-verse audio manifest, with native ownership/position/completion/Welcome Back semantics; subsequent small N5b slices will migrate chunk/Echo/instruction output and verify end-to-end Learn. Every PR updates `docs/PROJECT-HANDOFF.md` **in that same PR**, plus relevant `TESTING.md` and `AUDIO-RECOVERY.md`; owner reviews and merges. N6 other games, N7 microphone/DSP, N8 Zoo surprises later.
