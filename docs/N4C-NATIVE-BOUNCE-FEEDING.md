# N4c — Native Bounce Feeding Audio: Rally Cues, Star Bonus and Catches

> **Focused [PR #31](https://github.com/andydoane/biblozoo/pull/31)** on `experiment/native-ios-audio`, based on owner-merged [N4b PR #30](https://github.com/andydoane/biblozoo/pull/30) (`18332f9016c458cc87e12003892d61afc42a9761`). Only the separate **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`). Stable `ios-prep`, the original iOS app and browser/PWA/Android versions are not changed. **Owner reviews and merges.**

## Confirmed prior device tests

On **November 7, 2026**, after merging N4b #30, the owner tested it on the physical iPhone and reported **everything working as intended**. That is the N4b Labyrinth gameplay/native sound/recovery acceptance as reported by the owner, not a machine-measured acoustic latency report. N4a native Melody catches and original Classic Feeding had previously passed real task-switch and human-heard sound tests. For N4a.1 [PR #29](https://github.com/andydoane/biblozoo/pull/29), the owner explicitly reported the **swipe-up-and-hold App Switcher** now pauses immediately with **Welcome Back visible inside the thumbnail** and native audio **recovered both times** after explicit Resume.

N4c is the final planned N4 **Feeding mode** output slice: actual native **Bounce**. Before it, Bounce remained native-only **silent** because it was never included in a native sound profile. Bounce's original browser sound effects and physical rules already exist; they do **not** need a different sound engine. **N4c physical Bounce audio has not been owner-tested yet.**

## Sound routing, gameplay preservation and no-Web policy

The existing JS Bounce engine invokes its established sound functions. N4c only permits those to reach the fixed prewarmed Swift sounds on the isolated native-only iOS app:

| Existing Bounce event | Existing game action | N4c native sound |
| --- | --- | --- |
| White ball hits sidewall or ceiling | Reflect velocity once per collision | `feed-peg` six-note sine family |
| White ball bounces off the paddle | Preserve angle based on paddle offset | `feed-peg` |
| White ball breaks an ordinary gray/snack brick | Mark brick inactive and release snack when colored | `feed-peg` |
| White ball breaks a star brick | Extra white ball spawned; star bonus continues normally | `feed-star` PCM sample |
| Pet or paddle catches a falling colored snack | Increment original score and caught count | `feed-chomp` PCM sample |

The existing **55ms global peg sound cooldown** and don't-repeat-the-previous-pitch behavior remain; the six sine notes, four warmed peg voices and two sample voices are reused from owner-tested Classic/Labyrinth. There is no new Swift asset, synthesis, `AVAudioSession` call, background sound entitlement, sample decode in collision path, arbitrary URI, user-controlled MIDI or Web Audio route. Bounce's existing browser-only star-bonus audio clock check stays in the **browser path** and is not run on native iOS. If Swift refuses or times out, there is **no Web/HTML backup**—the native-only experiment must remain silent with diagnostic status rather than disguise the failure.

**Do not change:** Bounce's 5×4 brick board, white-ball speed/angle/aging, three serves and **Launch!** on later serves, paddle/tilt/drag movement, seven colored snack goal, bonus multiball, score/points, pet animations, rewards, Back, result overlay, music/other Feeding modes, mic/recording, stable `ios-prep` or independent N8 Zoo Escape surprises. This PR changes only the mode's fixed native audio integration and regression contracts.

## Explicit user gesture and interruptions

1. **Got It!:** Choose Bounce's normal Tilt/Drag control; the real Got It! tap is the sole initial user activation. The native pilot for `mode:"bounce"` activates Swift's existing `.soloAmbient` session, then preloads **only `feed-star`, `feed-chomp`, `feed-peg`**, and only then starts the original Bounce game. If preparation fails, **Instructions / Try Again / Back remain**, with no known-silent started round or automatic retry. The original `Launch!` subsequent-serve tap still works and is not an audio activation by itself.
2. **Swipe-up-and-hold App Switcher:** The N4a.1 native inactive signal **pauses immediately**, stopping native sound and freezing the existing rally/ball positions, score, lives, snacks, brick destruction and deadlines. The system card should already show **Welcome Back**. Returning to BibloZoo's own card does **not** restart the round or auto-play sound. A real **Let's go!** tap explicitly reactivates and preloads Bounce's three fixed assets, then resumes **the same** game. No reward duplication, no new serve/score reset.
3. **Full app switch:** Switching fully to YouTube/Facebook or a competing picture-in-picture video and returning follows the same frozen-round Welcome Back / Let's go! path, not an automatic native playback unlock. A failed Resume remains paused with **Try again!** and Back. If the owner exits, stale native responses may never start/resume the game.

## Owner physical iPhone test after PR #31 review/merge

In GitHub Desktop, use the dedicated `biblozoo-native-audio` worktree, **Fetch/Pull Origin** on `experiment/native-ios-audio`, then from repo root:

```sh
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_app_switcher_pause_n4a1.js
node scripts/validate_native_melody_gameplay_n4a.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build and run **BibloZoo Audio Test** on a real iPhone. GitHub's Node/source and production web build **do not compile Swift or prove speaker output**.

1. **Bounce sounds during real play.** Open Feeding → **Bounce**, choose Tilt or Drag, tap **Got It!**, then watch the white ball. It should make pleasant **short native pitched notes** on wall, paddle and ordinary-brick rebounds. It should not chirp continuously at rest, glitch animations or miss its target collision. Colored falling snacks should give a **chomp** only when caught and the score should increment normally.
2. **Star and extra balls.** If a star-marked brick is hit, listen for the native star sound and check that the **extra white ball** appears and behaves normally. Multiple balls and snack catches should remain smooth; star bonus does not change the seven-snack objective or reward rules. If practical, let a ball be missed and use **Launch!** for another serve—same board and lives logic, no false restart.
3. **The formerly broken gesture.** Mid-rally while a white ball is moving, swipe up and **HOLD** to show the iPhone App Switcher cards without selecting another app. The ball/game should freeze and Welcome Back should be visible **in the thumbnail**. Tap BibloZoo's own card, then **Let's go!**. Native audio and the **exact same brick/ball/score/lives state** should resume. No sound or time progress in App Switcher or on foreground before the gesture.
4. **Ordinary full switch + regression.** Switch completely to another video app and back, tap Let's go!, confirm sound. Briefly play Classic (peg/star/chomp), Melody (real caught pitches) and Labyrinth (platform landing/chomp); test App Switcher recovery again if possible. Web/PWA/Android behavior should remain unchanged; stable installed BibloZoo must remain untouched. No microphone prompt, Web fallback or emergency Zoo Escape as an audio-error fix.
5. **First-tap / silent incident.** If Bounce remains silent or initial preparation is refused, **do not restart yet**. Copy **DEV → Audio Timing Report**, including last 80 event rows and 18 native first-tap preparation entries, before closing the app. State whether Got It! showed Try Again or began the round and what was actually audible. `avengine-tone` / `avengine-pcm` with `scheduled` measures **software buffer dispatch**, not proof the speaker emitted sound.

## Scope boundary and acceptance gate

The N4c Node VM/source test exercises the actual Feeding controller with mock native bridge: exactly three Bounce native preloads; real bounced note requests at 55ms cooldown; star bonus and chomp routing; pause suppresses stale impacts; failed initial preparation keeps Instructions/Try Again and can recover on another real tap; Melody mode cannot leak pitches into Bounce; Web keeps its original sound output. Earlier N3a–N4b and N4a.1 checks + production web build must stay green. **Owner Xcode compilation, real audible Bounce sounds, true bonus multiball, three serves and both task-switch recoveries are independent tests and currently pending.**

**After owner approves all four Feeding modes on-device**, the next roadmap phase is **N5: native UI/Learn output**, followed by N6 other games, N7 recording/DSP, and N8 independent Zoo Escape fun—not another speculative native audio engine refactor. See [living handoff](PROJECT-HANDOFF.md), [Testing](TESTING.md) and [Audio Recovery](AUDIO-RECOVERY.md).
