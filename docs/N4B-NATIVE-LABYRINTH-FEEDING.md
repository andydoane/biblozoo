# N4b — Native Labyrinth Feeding Sounds: Platform Landings and Catches

> **[PR #30](https://github.com/andydoane/biblozoo/pull/30)**, first next roadmap step after physically accepted N4a.1 [PR #29](https://github.com/andydoane/biblozoo/pull/29) merged at `ee7cbae6374303430a40f542882aa20074980ed4`. Only experimental **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on `experiment/native-ios-audio`. Stable `ios-prep`, original app, Web/PWA/Android, user progress/rewards, mic/recording and independent N8 Zoo Escape/ZOO BREAK are protected.

## Evidence from owner, and why Labyrinth is next

**Owner's latest actual iPhone test (2026-11-07):** The N4a.1 inactivity fix **worked**. The moment the owner **swiped up to open the iPhone App Switcher**, Feeding froze and **Welcome Back appeared already in the app thumbnail**. Native audio **recovered both times** after returning and using the explicit gesture. This closes the original app-card issue for the tested runs; it was previously reproduced in Classic and Melody. It does **not** yet prove native Labyrinth or Bounce audio. N4a [PR #28](https://github.com/andydoane/biblozoo/pull/28) already enabled actual Melody catch sounds and ordinary full-app switch recovery, and N3a/N3b/N3c/N3d native Classic effects/pegs and the single DEV Melody note were owner-heard. One historical N3b fresh-build silent start remains undiagnosed; use the existing copyable native report if silence recurs.

The N4 roadmap has remaining Feeding game modes **Labyrinth** and **Bounce**. Labyrinth's Web game uses the exact existing **sine peg impact tone** on a sufficiently hard landing on a moving platform, with 135 ms per-ball cooldown and a 55 ms shared peg-tone rate limit, plus existing chomp catch and star bonus effects. Thus this slice can **reuse the same fixed Native Classic `feed-peg`, `feed-chomp`, `feed-star` IDs, PCM buffers and 2/4-node voice pools** without Swift audio synthesis or any AVAudioSession change. Bounce's separate brick/bonus pathways require their own N4c acceptance; do not preemptively migrate Bounce here.

## Changes / invariants

1. **Native-only Labyrinth opt-in based on bundle, not user choice:** In `daily_questions_feed_game.js`, only on Capacitor native iOS when `BibloZooNativeOnlyOutput.enabled===true`, the `labyrinth` mode now enters the existing audited **Got It! → `activateFromGesture({purpose:"feeding"})` → fixed sound preloads → ready gate** path before beginning the actual round. Status explicitly says Labyrinth; no hidden Classic checkbox is required, no `AudioContext` or HTML audio gets created. Web/PWA/Android and the original installed app keep their original browser Labyrinth sounds. Non-native-only Classic preview remains the same opt-in path.
2. **Strict fixed Labyrinth sound bank:** The JS `BibloZooFeedingNativeAudioPilot.create({mode:"labyrinth"})` has an explicit immutable list `["feed-star","feed-chomp","feed-peg"]`. The source shares the already-bundled/prewarmed Classic native sounds; six sine peg notes are indexed 0–5. Cross-mode `feed-melody` MIDI sounds, arbitrary sound IDs, URLs and external file/frequency data are rejected. The native worker already schedules these fixed buffers without hot-path decoding. The existing `.soloAmbient` output owner, first-tap activation attempts and preflight logging stay untouched.
3. **Actual game physics remains unchanged:** The existing `updateLabyrinthBall` checks a **real strong platform landing** and then calls `playPegTone`. N4b permits this exact function to dispatch the fixed native peg sound in **Labyrinth as well as Classic**, preserving **135ms** per-ball impact and **55ms** global sound cooldown, anti-repeat pitches, and original tone volume. Existing `catchBall` chomp, any star/bonus event, ball collision/steering, moving gates, stuck recovery, scoring, reward eligibility, score popups, start/finish/Back remain as before. No new sound on resting contacts and no native fallback if a sound refuses.
4. **Native recovery unchanged:** N3c first-tap refusal keeps the **Instructions screen with Try Again/Back** and no knowingly silent round. On a task switch, including **swipe-up-and-hold App Switcher**, merged N4a.1's UIKit inactive event pauses the entire original Labyrinth game and shows **Welcome Back**; only an actual **Let's go!** human tap re-activates the session and re-prepares the three Labyrinth sounds before unfreezing the same ball positions, score and deadlines. No autoplay, Web/HTML backup, automatic restart or Zoo Escape audio-repair distraction.
5. **Still-unmigrated work:** Native-only **Bounce** tone effects remain intentionally silent; original browser Bounce/other modes continue normally. N4c will cover Bounce after N4b hardware acceptance. N5 UI/Learn output, N6 other games, N7 microphone/DSP and independent fun N8 are deferred.

## Owner physical iPhone acceptance after review and merge

In the dedicated GitHub Desktop worktree `biblozoo-native-audio`, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_app_switcher_pause_n4a1.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Xcode-run **BibloZoo Audio Test** on a physical iPhone. GitHub Node/production web CI cannot compile Swift or tell whether the speaker actually plays the note.

1. **Fresh Labyrinth:** Open Feeding → Labyrinth, choose Tilt or Drag, tap **Got It!**. A snack landing **hard enough on the moving platform** should make a short, pleasant native peg note. Sliding/resting balls should **not** make a nonstop beep. Snack caught by pet should make **chomp**; star/bonus if encountered should use the same native sample effect. The moving gates, ball gravity/gaps, catch score and animations must feel unchanged. A successful diagnostic `feed-peg | scheduled | avengine-tone` is only native scheduling, not acoustic proof.
2. **Exact formerly broken gesture:** Mid-Labyrinth with balls moving, swipe up and **HOLD** to display iPhone App Switcher thumbnails, without opening a different app. Confirm game **freezes immediately** and **Welcome Back is visible even in the card**, as it was in your last Classic/Melody test. Select BibloZoo's own card and tap **Let's go!** once. The **same original Labyrinth score/balls/steering/timer** resume with real peg landing and chomp sounds. No output by itself during the switcher or on foreground.
3. **Full app-switch regression:** Switch fully to YouTube/Facebook/video, return, tap **Let's go!** and verify the same round and audible effects again. If resume preparation fails, **Try again!** must be deliberate and Back available, not a silent running game.
4. **Other modes:** Play Classic: six pleasant native pegs, chomp/star and normal Welcome Back. Play Melody: **real caught musical notes** and same tune/Caught % after the app switcher. Try DEV **Melody E4** if convenient. Bounce has **not been migrated** and should not secretly emit Web/HTML sound in `.audiotest`. Browser/PWA/Android continue their original audio.
5. **If first launch, impact or Resume is silent:** **DO NOT restart immediately.** From DEV tap **Copy Audio Timing Report**; paste the 80-event sound rows and 18 recent gesture/preload results, plus what you actually heard. A `feed-peg` scheduled event is not proof the speaker emitted sound. Mention whether Got It! failed and showed Try Again or gameplay began silently.

**N4b owner acceptance:** Hear actual native Labyrinth impacts/catches, confirm correct collision spacing/physics/scores, same-round **app-switcher and full-switch Resume**, and no Classic/Melody regression or Web Audio fallback. Until that happens, PR #30 is code/CI-tested **only** and must not be described as an iPhone sound pass. Owner reviews and merges; assistant does not.

References: [living handoff](PROJECT-HANDOFF.md), [TESTING](TESTING.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md).
