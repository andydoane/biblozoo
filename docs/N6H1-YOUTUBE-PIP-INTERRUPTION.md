# N6h.1 — YouTube picture-in-picture interruption: global native iOS audio recovery

**PR:** [#48 — Cross-app PiP interruption](https://github.com/andydoane/biblozoo/pull/48), targeted **ONLY** at the separate `experiment/native-ios-audio` integration branch, based on owner-merged [Verse Munch #47](https://github.com/andydoane/biblozoo/pull/47) `db387f7a8eeec4c40d40bb033cc7415bf0ebd2f1`. Stable `ios-prep`, original BibloZoo app, Web/PWA/Android, mic/DSP and Zoo architecture are out of scope; owner alone reviews and merges.

**Owner observed on a real iPhone (2026-11-08):** Verse Munch sounds and normal recovery work; BUT when YouTube picture-in-picture is over the game (paused initially) and the child presses **Play** in PiP, an unrelated gray modal appears: **“A native sound stopped. Tap Try Again.”** Try Again never works, Back exits but the app/Home and **every migrated game** can remain silent. Record #47 as owner-merged and tested, **with this critical cross-app regression**, not as entirely trouble-free. This is different from the six earlier owner-passed isolated-game audio tests: PiP was not previously part of acceptance.

## Why

Apple documents `AVAudioSession.Category.soloAmbient` as **nonmixable**: another app's active PiP audio may interrupt BibloZoo, and we must not steal its sound. [Apple `soloAmbient` documentation](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/soloambient) and [`interruptionNotification` contract](https://developer.apple.com/documentation/avfaudio/avaudiosession/interruptionnotification). The existing native owner already registers iOS interruption notifications and stops sample voices. Two missing transitions made loss persistent:

1. On `.began` while UIKit remained **`.active`** because YouTube PiP floated over WKWebView, Swift silently discarded AVAudioEngine PCM but **did not notify JavaScript to freeze its current game**. The next asynchronous native `play` bridge returned `interruption-pending`, which game controllers treated like a missing/corrupt MP3 and raised a **gray failure** instead of a pause.
2. On `.ended`, Swift cleared `interrupted`, but retained `hasGestureActivatedSession = true`. The next user tap could get `ready:true`, `reason:not-needed` **without `setActive(true)`** after OS deactivation. This could leave Home UI pops and all later prepared game sounds silent despite state reporting success.

## Corrected contract

- **SAME sole `.soloAmbient` AVAudioSession and serialized `AVAudioEngine` PCM worker.** No category change to `.ambient`, no `mixWithOthers`, no new session, no duplicate engine, no Web/HTML fallback, and no false claim to play simultaneously with YouTube. While YouTube PiP is actually playing, BibloZoo **yields**; video sound continues.
- A genuine `AVAudioSession.interruptionNotification` `.began` in the **active** app broadcasts **pause → visible plain Welcome Back** via the already-used `biblozooAppLifecycle` game-owner callbacks, with event `reason:"audio-interruption"`. Each game stops PCM and freezes score/physics/streak/bonus virtual time; no gray fatal Try Again. Inactive/background App Switcher remains on its original path.
- On `.ended` Swift retains `needsGestureAfterInterruption = true`; NEVER auto-activates or plays. The next explicit child **Let's go / UI tap / Feeding Resume / Try Again** calls `activateFromGesture`; **only then** may it call bounded `setActive(true)` even though the legacy `interrupted` flag was cleared. This also permits a fresh real gesture after PiP pauses **if `.ended` arrives late**: only when `isOtherAudioPlaying == false` and iOS accepts activation. OS accepted is not speaker proof.
- While `AVAudioSession.isOtherAudioPlaying == true`, reject activation with `other-audio-playing` **BEFORE the attempt counter/cooldown or OS `setActive`**. PiP-blocked taps do not use up retries or interrupt YouTube. On each *new* actual interruption, reset the short two-attempt/4s budget so attempts from before YouTube took over cannot permanently block recovery afterward; no unbounded timer loop.
- Seven migrated games (Scripture Snake, Bible Bugs, Food Slice, Verse Splat, Dino Dash, Verse Invaders, Verse Munch) now classify `other-audio-playing`, `interruption-pending`, `gesture-required-after-interruption`, and related OS busy/foreground statuses as **temporary pause**, not an asset failure. During a pending difficulty/Close preflight, cancel stale callbacks so no ghost round starts. During active gameplay, show the game's original **plain Welcome Back** and retain **same word/score/bonus**. Actual missing/corrupt PCM or programming mistakes still use the existing failure-only accessible retry, not masked as PiP.
- Shared plain Welcome Back recognizes `{deferred:true,reason}`: child sees **“Pause the other video's audio, then tap Let's go!”**, Back remains available, and this does NOT count toward terminal failed recovery or unfreeze time. Tap again *after* YouTube is paused. All seven native-only games use this path; Web/PWA/Android stay on their original Web clock/Zoo Escape behavior.
- All four Feeding native pilot modes reuse their existing pause/Resume same-round screen when PiP interrupts; external audio status is temporary, not an irreversible “Native ONLY failed” effect. Home's native two-pop UI module invalidates on PiP lifecycle event, then on another real child tap after PiP pause it **reactivates** the one Swift session and re-prepares the original two UI clips; no automatic Home audio on notification.
- Read-only **DEV Inspect native state** now includes `otherAudioPlaying` and `needsGestureAfterInterruption`, interruption event history, activation attempt reason, and timing. These are *state* not speaker measurement. The `AVAudioSession` should stay `.soloAmbient`.

## Automated source gates

```bash
node scripts/validate_native_pip_interruption_n6h1.js
node scripts/validate_native_verse_munch_n6h.js
node scripts/validate_native_verse_invaders_n6g.js
node scripts/validate_native_dino_dash_n6f.js
node scripts/validate_native_verse_splat_n6e.js
node scripts/validate_native_food_slice_n6d.js
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

New N6h.1 VM exercises **all seven native controllers** with a mocked PiP session: initial full bank succeeds; external Play causes native hot-play refusal → **onAppInactive/onAppActive** and **no fatal failure**; PiP-blocked difficulty preflight cannot start a round; after audio pauses, a new child gesture prepares exactly the same bank; true missing/invalid assets are **not** misclassified as PiP. It also tests shared Welcome Back deferred reason and Home two-pop invalidation/restoration, and structural Swift `.began/.ended` / `isOtherAudioPlaying` / gesture-only activation with no automatic `setActive`. Final HEAD GitHub Actions **Node regression checks** + **Production web build** must both pass. These are not Xcode Swift compilation or physical audible proof.

## Real iPhone owner acceptance (after reviewing/merging #48)

In **separate Mac `biblozoo-native-audio` worktree**, pull `experiment/native-ios-audio` after owner merge, then:

```bash
node scripts/validate_native_pip_interruption_n6h1.js
npm run build
npx cap sync ios
npx cap open ios
```

Build separate **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on a physical iPhone, leaving original app installed.

1. **Reproduce exact bug** in Verse Munch with John 3:16: have a **paused YouTube PiP tile floating over the game**; BibloZoo sounds normally. Press **Play in the PiP** without switching apps. BibloZoo should stop sound and pause the feeding round into **plain Welcome Back**, **not** gray “A native sound stopped” failure. The YouTube video should remain audible; BibloZoo should not try to mix or steal it.
2. While PiP is **still playing**, tap **Let's go!** once/twice: keep the paused round and visibly explain to **pause the other video's audio first**, don't enter terminal failure, don't count failed attempts, keep **Back** available. No ghost sound, movement, lost bonus seconds or automatic retry.
3. **Pause YouTube PiP** while remaining in BibloZoo; if needed wait a moment for OS interruption notification and tap **Let's go!**. Native sounds should be heard again through the actual speaker, with the **same monster, word positions, speed, score and remaining 20s fruit-bonus time**, not restart a round.
4. **Home app**: exit a game normally, with YouTube PiP still over the **Audio Test Home/title screen**; press Play then Pause in YouTube PiP. Verify Home navigation always works and **Home UI pops become audible again on a fresh real tap after PiP pause**. Launch a *different* game and confirm normal native effects. Do this even if PiP starts **before opening BibloZoo**; the first unmuted game preflight while PiP plays must defer, not steal YouTube audio.
5. Repeat in **Verse Invaders** rocket and bonus, **Dino Dash** jump and saved halfway sun/night checkpoint, Verse Splat bonus, Food Slice slice/wrong/bomb, Scripture Snake, Bible Bugs, and **Feeding four modes incl Bounce/Melody/Labyrinth**. Test PiP while both normal play and bonus are active. Confirm no gray native sound trap and no permanently silent Home.
6. Regression: held **swipe-up-and-HOLD App Switcher**, full switching and lock/unlock without YouTube: existing plain Welcome Back and same-round restoration; normal single tap sounds, mute/unmute, Learn instruction/Chunks/Echo, verse Detail/Flashcards previews, Psalm 23:4. Stable Web/PWA/Android unchanged.

**If still silent or stuck**, BEFORE restarting capture **DEV → Inspect native state** (new `otherAudioPlaying`, `needsGestureAfterInterruption`, `pending`, `lastSignal`, `lastActivationResult`, `foregroundEpoch`), **DEV → Copy Audio Timing Report**, actual PiP playing/paused and whether native `accepted` or *audibly heard*. Note Xcode errors. No source CI can certify acoustic output or simulate iOS audio focus.

**Owner alone reviews and merges**, never automatic. Document owner’s actual physical outcome in next handoff/PR before resuming N6i one more standalone game. 7/12 game migrations have been merged (#47 Verse Munch), **but external PiP cross-game acceptance is OPEN until #48 passes on device**.
