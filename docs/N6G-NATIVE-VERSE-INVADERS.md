# N6g — Verse Invaders native-only iOS PCM, source and physical iPhone acceptance

**PR:** [#46 Verse Invaders native PCM](https://github.com/andydoane/biblozoo/pull/46) → isolated `experiment/native-ios-audio`. Base is **owner-merged [Dino Dash #45](https://github.com/andydoane/biblozoo/pull/45)**, integration SHA `a2c32f343239dd9e38de22ca1016010d78b41a76`, merged November 8, 2026 at 19:48:06 UTC. **Owner post-merge physical iPhone feedback: “I MERGED and tested that PR and it's working great!”** Record N6f Dino Dash MERGED and OWNER-PASSED in the SAME new PR's `docs/PROJECT-HANDOFF.md`; its earlier pending state is stale. **N6g #46 itself remains unmerged and not physically verified**, regardless of Node CI.

## Audio and gameplay contract

**One game only: Verse Invaders**, through the existing sole Swift `.soloAmbient` AVAudioSession and serialized predecoded `AVAudioEngine` PCM effect worker. **Never** open Web Audio/AudioContext, create HTML Audio/silence, generate oscillator sounds or fall back to Web/HTML on native iOS. The original browser/PWA/Android retain the old Web Audio/HTML prime path unchanged; stable `ios-prep` and the original installed BibloZoo remain untouched.

Exactly **13 distinct original shipped MP3 effects**, plus the **two existing fixed native UI pops**; no new sound files or arbitrary caller URLs:

| Game events | Native Swift fixed PCM IDs | Shipped original MP3s |
| --- | --- | --- |
| Rocket launch | `inv-launch` | `verse_invaders_launch.mp3` |
| Correct alien hit | `inv-correct` | `verse_invaders_correct.mp3` |
| Wrong alien hit | `inv-wrong` | `verse_invaders_wrong.mp3` |
| Alien abduction | `inv-abduction` | `verse_invaders_abduction.mp3` |
| Four streak levels + bonus multiplier up | **`inv-streak` for all five keys** | **ONE** `verse_invaders_streak.mp3` |
| Bonus begins | `inv-bonus-start` | `verse_invaders_bonus_start.mp3` |
| Five randomized bonus pops | `inv-pop-1..5` | `verse_invaders_pop_1.mp3` through `verse_invaders_pop_5.mp3` |
| Bonus penalty | `inv-bonus-penalty` | `verse_invaders_wrong_2.mp3` |
| Bonus result/reveal | `inv-bonus-reveal` | `verse_invaders_bonus_result.mp3` |
| Title, Back, Help, difficulty, menu | `ui-pop-1/2` | Existing `ui_sound_pop_1/2.mp3` |

Total **15 unique PCM IDs**, although original JS has **19 keys** including sound aliases. The native controller deduplicates allowlisted IDs at preload while retaining **original event keys, volume multipliers and five randomly selected bonus-pop keys**. Full bank before hot launch/collision, no effect decode/engine start on hot event. `prepared:true` and `accepted:true` are only Swift state/scheduling signals, not physical speaker proof.

**Title/Back/How to Play/Close**: real child's UI gesture requests the **two native UI clips only**, not full-game ready. **Difficulty select, Game Menu Close, Try Again, and plain Welcome Back Let's go!**: call native activation synchronously inside that genuine gesture; mode/Close UI pop plays *before* loading the remaining thirteen PCM samples; game starts/resumes only after **all 15 IDs** have prepared. No routine gray successful-preparation overlay; on real native sample/session error show accessible **Try Again / Back**. The first cold UI pop may be intentionally omitted when exceeding the old 350ms stale-sound cutoff (separate N9 debt).

Existing Verse Invaders tutorial, aliens and color lanes, rockets, score/streak, bonus clock, multiplier and medal completion remain game-owned. Opening the Game Menu/Help pauses physics and PCM; explicit menu Close restores the *same* aliens/rockets/bonus timing after the bank is ready. Mute means intentional silence without blocking navigation. **UIKit `.inactive` including a held App Switcher while WebKit appears visible**, full switching and lock cause native stop plus original `welcomeClock` and animation pause. No automatic sound on foreground and no Zoo Escape for isolated native test. Existing **plain Welcome Back** and actual **Let's go!** gesture reprepare native PCM and restore the *same* aliens/rockets/score/streak/bonus time.

## Automated gates

```bash
node scripts/validate_native_verse_invaders_n6g.js
node scripts/validate_native_dino_dash_n6f.js
node scripts/validate_native_verse_splat_n6e.js
node scripts/validate_native_food_slice_n6d.js
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

N6g regression checks shipped MP3 existence, exact Swift fixed allowlist, **deduplicated 15-ID native full bank** even with aliased JS streak keys, UI-only preflight, mode UI pop ordering, failed sample and native playback failure, stale UI/mode/held inactive, browser isolation. It executes **actual Verse Invaders Start/Back/Help/Close, difficulty, menu, mute, native game sound/bonus-volume, and Let's go! callback source** in a Node VM without any fake global `volumeScale` (avoiding Snake #41/#42 bug). Final-head Actions full existing Node regressions and production web build must be green. These tests **do not compile Swift via Xcode and cannot prove audible iPhone speaker playback**.

## Owner physical iPhone acceptance — after owner review/merge only

In the dedicated **`biblozoo-native-audio` Mac worktree**, switch to `experiment/native-ios-audio` and Pull Origin after reviewing/merging #46, then run:

```bash
node scripts/validate_native_verse_invaders_n6g.js
npm run build
npx cap sync ios
npx cap open ios
```

Build and run **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on a **physical iPhone**, without replacing the original app.

1. On **John 3:16 → Practice Games → Verse Invaders**, tap title **Start**, mode **Back**, title **Back**, **How to Play** and **Close** on both screens. All buttons navigate and request native UI pops, even when preparation is cold; no `ReferenceError` or routine gray success popup.
2. Enter Easy, Medium and Hard in separate rounds. Each difficulty UI pop should start *before* full thirteen-game sample preparation; gameplay **never starts without all fifteen distinct PCM IDs ready** (unless intentionally muted). Test Psalm 23:4 for a second verse. Double/rapid Start→Back/mode→Back must not launch ghost rounds or play late UI sounds.
3. Shoot correct/wrong aliens and observe rocket launch, correct/wrong hit, alien abduction, streak at **4, 8, 12 and 16**. Listen for original sound levels and same original tutorial, word order, physics, score and medals. Confirm no Web Audio/HTML fallback on native iOS.
4. Reach **bonus round**. Hear bonus start, **five randomized bonus-pop files**, multiplier-up streak (same one original MP3 as ordinary streak), bonus wrong penalty and bonus final reveal. Confirm score/multiplier/bonus timer and reward behavior unchanged.
5. Open **Game Menu/Help**, mute and unmute. Native effects must pause while menus are open; menu Close from the real child gesture preps complete bank and resumes the **same** aliens/rockets/score and bonus timing. Intentional mute is silent, never stuck.
6. During moving rockets and during bonus, swipe up and **HOLD** in App Switcher (WebKit can remain visible); repeat with full app switch and lock/unlock. Confirm no audio/physics advancement, **plain Welcome Back**, no auto output. Only tap **Let's go!** to restart native PCM and continue same round/bonus timer. Repeat a quick mode selection interrupted by held App Switcher.
7. Regress previously owner-passed **Dino Dash**, especially the midway feeding reload/SUN/night saved checkpoint (owner just said #45 worked great), Verse Splat, Food Slice, Snake, Bugs, Feeding including Bounce, Learn instructions/Chunks/Echo and verse previews. Stable `ios-prep`, original iOS app and browser/PWA/Android unchanged.

If any sound is absent or a button sticks, **before restarting** capture DEV **Inspect native state** and **Copy Audio Timing Report**; note actual speaker hearing vs `accepted/prepared`, exact event, verse/mode, cold/warm state, switch/lock status, and any Xcode JS exception.

**Owner alone reviews and merges; assistant does not auto-merge.** Reconcile owner N6g postmerge physical findings in next PR's `docs/PROJECT-HANDOFF.md` or docs-only update before N6h. Remaining games/Playground/Daily/Read My Verse and N7 mic/DSP, N8 independent Zoo, N9 cold pop remain separately scoped.
