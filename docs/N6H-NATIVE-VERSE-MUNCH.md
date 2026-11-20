# N6h — Verse Munch native PCM, iPhone touchend menu, bonus and owner test

**PR:** [#47 — N6h Verse Munch](https://github.com/andydoane/biblozoo/pull/47) into isolated `experiment/native-ios-audio`. **Base:** owner-merged [#46 Verse Invaders](https://github.com/andydoane/biblozoo/pull/46) integration `33fd3f7ab2c002d808d7ccaab2120255453bebc4`, merged 2026-11-08 20:15:39 UTC. **Latest owner physical iPhone report after #46:** “I put Verse Invaders through its paces and the sounds are working well. Audio is recovering nicely.” This supersedes the earlier #46 open/untested state and is explicitly recorded in the same-PR [living handoff](PROJECT-HANDOFF.md). **N6h source CI is not Mac Xcode Swift compilation or physically heard iPhone output; owner device acceptance of #47 remains pending** until owner merges/tests.

## Milestone count

The repository contains **12 standalone practice verse games** (all `verse_games/*/game.js`): Bible Bugs, Scripture Snake, Food Slice, Verse Splat, Dino Dash, Verse Invaders, Verse Munch, Verse Launch, Verse Scramble Neo, Tower Bible, Traffic Tap, and Versey Bird. **Six** were merged and owner-tested as of #46: Snake, Bugs, Food Slice, Splat, Dino and Invaders (**6/12 = exactly half**). N6h is the **seventh game's PR**; **only after owner acceptance** will the milestone be **7/12, over halfway**. The remaining five have different sound architectures, including generated browser tones, which must be reimplemented/predecoded natively rather than silently using Web Audio on iOS.

## Native output contract

Native **iOS Audio Test only**: same sole Swift `.soloAmbient` AVAudioSession/serialized `AVAudioEngine` worker and the **original unchanged 13 Munch MP3 files + two existing UI pop files**. No new category, dynamic file paths, synthetic Web Audio/oscillator, HTML silent prime/clone, Web Audio fallback, new Zoo sound owner, or microphone. Web/PWA/Android keep original Web Audio code.

| Original game sound key | Fixed native PCM ID | Bundled MP3 |
| --- | --- | --- |
| `wordTap1`, `wordTap2` | `munch-word-tap1`, `munch-word-tap2` | `verse_munch_tap_1.mp3`, `verse_munch_tap_2.mp3` |
| `chew1`, `chew2`, `chew3` | `munch-chew1` … `munch-chew3` | `verse_munch_chew_1.mp3` … `verse_munch_chew_3.mp3` |
| `chomp` | `munch-chomp` | `verse_munch_chomp.mp3` |
| `correct` | `munch-correct` | `verse_munch_correct.mp3` |
| `spew` | `munch-spew` | `verse_munch_spew.mp3` |
| `dizzy` | `munch-dizzy` | `verse_munch_dizzy.mp3` |
| `streak` | `munch-streak` | `verse_munch_streak.mp3` |
| `bonusStart` | `munch-bonus-start` | `verse_munch_bonus_start.mp3` |
| `bonusResult` | `munch-bonus-result` | `verse_munch_bonus_result.mp3` |
| `wrongFruit` | `munch-wrong-fruit` | `verse_munch_wrong_fruit.mp3` |
| Shared title/Back/Help/game/speed/menu | `ui-pop-1/2` | Original `ui_sound_pop_1/2.mp3` |

Total **15 unique predecoded PCM samples**. Original JS chooses alternating word taps, cycles three chews, and chooses all event-volume multipliers (master `0.90`); hot gameplay only selects a fixed prepared PCM ID/volume. A Swift `prepared:true` or `accepted:true` means scheduled/loaded, **not proven audible through the actual device speaker**.

### Interaction rules

- Actual child title Start, Back, Help and Close taps request **two UI PCM clips only**. Title navigation always works even if early UI pop misses the bounded 350ms cold-first-tap limit; such late pops are dropped (N9 separately). Shared shell keeps responsibility for navigation.
- Actual child Easy/Medium/Hard selection, Game Menu and Speed Menu **Close**, Try Again, and plain Welcome Back **Let's go!** request the **whole 15-ID** bank from `activateFromGesture`, within that genuine gesture. Game/bonus cannot start/resume unmuted unless all sounds are prepared. The mode or Close UI pop must be scheduled ahead of game PCM decode. Success uses **no gray blocking popup**, only genuine session/sample failure shows accessible Try Again/Back.
- **iPhone-specific** Verse Munch `wireMobileGameMenuFallbacks` `touchend` handles Close/Help/Mode/Exit/Mute separately from the shared menu. This fallback **must not bypass the native full-bank guard**, undo menu pause prematurely, or double-stop/pop on pointer+click. Unmuted menu Close preps PCM before same-round return. Mute keeps app navigable and silence intentional.
- Preserve game word/face/mood/food movement, speed selection, correct/streak/mistake reactions, fruit bonus (20s), score/multiplier/medals, touch interactions and original browser/PWA/Android output.
- UIKit `.inactive` including swipe-up-and-HOLD App Switcher, full switch or lock stops PCM and freezes original pause-aware timers/animated states. Native foreground **never** automatically resumes playback or advances the round; existing **plain Welcome Back** with real **Let's go!** must preprepare whole bank and resume the **same score, word/food positions, mood and bonus time**. No Zoo Escape in native Audio Test.

## Automated tests

```bash
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

N6h checks packaged MP3 files/Swift fixed allowlist, native 15 unique preflight and failure, UI-only ≠ gameplay readiness, mode pop before game decode, no iOS Web/HTML path, **real source callbacks** for Start/Back/How to Play/difficulty/Game Menu/Speed Menu/touchend fallback/mute, original wordTap/chew rotations/volumes, pending mode cancellation, held App Switcher and manual plain Welcome Back. No made-up `volumeScale` global (lesson from Snake #41/#42). Verify **final PR HEAD** GitHub Actions Node regressions and production web build both green. Mac Xcode Swift compilation and physical sound are separate owner checks.

## Owner real iPhone checklist (also send directly in ChatGPT)

After reviewing/merging PR #47 yourself, in dedicated Mac worktree `biblozoo-native-audio` switch to `experiment/native-ios-audio` and Pull Origin. In the repo root:

```bash
node scripts/validate_native_verse_munch_n6h.js
npm run build
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** bundle `com.andydoane.biblozoo.audiotest` on a **physical iPhone** without replacing the stable BibloZoo app.

1. John 3:16 → Practice Games → Verse Munch. Title **Start**, difficulty **Back**, title Back, **How to Play/Close** on title and mode: every button navigates without JS exceptions; sound UI pops on real taps when prepared; no routine gray loading screen.
2. **Easy/Medium/Hard**: difficulty pop starts before the game PCM decode, and monster/scrolling words begin only once all 15 native effects are ready (or deliberately muted). Rapid Start/Back/mode Back while preparing cannot ghost-start. Retry from genuine sample-failure gate should be real tap only.
3. **Word taps & chews**: tap multiple moving words, hear alternating wordTap1/2 and the three chew variations, chomp, correct, streak, spew/dizzy, and wrong fruit. Verify original monster face, mood animation, feeding mechanics, word order and score.
4. **Bonus:** reach fruit bonus and let all 20 seconds play; hear bonus start/result and appropriate wrong-fruit feedback. Keep existing multiplier, medals, reward state and timing. Repeat key effects with Psalm 23:4.
5. **Game Menu/Help/Speed/mute:** Open menu, How to Play and Back, change Speed, Close, mute/unmute. On physical touch screen test both normal click and `touchend` fallback (ordinary tap exercises it); **no early unpause** before real whole-bank native readiness and no double pop/ghost audio. Same monster, word, timer and bonus position resume.
6. **Held App Switcher/lock:** while words move and again in bonus, swipe up and HOLD App Switcher with WebKit thumbnail still visible; repeat full switch and lock/unlock. Plain Welcome Back only; no sound or gameplay advance automatically. Child's **Let's go!** actually requests Swift PCM and continues the same score, mood, word/fruit and bonus time without catch-up.
7. Regress owner-passed Verse Invaders (#46 just tested working/recovery), Dino Dash (#45 midway SUN/night), Verse Splat, Food Slice, Bible Bugs, Scripture Snake, Feeding incl Bounce, Learn and preview sounds. Original `ios-prep`, installed app, Web/PWA/Android untouched.

If any issue: **before restarting**, DEV → **Inspect native state** and **Copy Audio Timing Report**, exact event, verse/difficulty, cold/warm, App Switcher held/full status and any Xcode JS error. Native accepted/prepared do **not** measure acoustic output.

**Owner alone reviews and merges.** Reconcile #47 owner iPhone findings in next PR's living handoff; no assistant merge. After passing N6h, **7/12 migrated**; remaining five standalone games and later Playground/Daily/Read My Verse, N7 microphone/DSP, N8 Zoo and N9 cold-pop work are separate.
