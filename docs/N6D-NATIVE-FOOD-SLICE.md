# N6d — Food Slice native-only iOS sound migration

**PR:** [#43 N6d Food Slice Native PCM](https://github.com/andydoane/biblozoo/pull/43) targeting isolated \`experiment/native-ios-audio\`, based on owner-merged [#42](https://github.com/andydoane/biblozoo/pull/42) at \`cd913f52b2242b93e3a57fce12429623280b773d\`. **Physical iPhone and Mac Xcode sound acceptance pending** until the owner separately tests and approves the PR. Stable \`ios-prep\`, original installed app, Web/PWA/Android behavior and other game rules are out of scope.

## Updated owner findings from previous merge

After the focused #42 fix for undefined \`volumeScale\` in Scripture Snake's new title/menu sound functions, **the owner tested the merged build on iPhone and reported “That worked.”** The earlier #41 test also indicated Bible Bugs' previously missing title/mode pops seemed fixed. This N6d PR must update \`docs/PROJECT-HANDOFF.md\` with both results and the owner-merged #42 state. Previous N6c.1/2 all-green Node checks had missed the #41 real title-button exception until a physical click exposed it; **run actual buttons in the VM, not only source regex or sound-controller tests**.

## Audio contract, fixed resource inventory

Same existing Swift \`.soloAmbient\` **AVAudioSession** and serialized \`AVAudioEngine\` PCM worker. No new engine/category/Swift-generated oscillator, Web/HTML audio native fallback, dynamic URLs, new sample, mic or Zoo surprise.

| JS original key | Allowlisted Swift native ID | Bundled unchanged MP3 |
| --- | --- | --- |
| \`bomb\` | \`slice-bomb\` | \`food_slice_bomb.mp3\` |
| \`wrong\` | \`slice-wrong\` | \`food_slice_wrong.mp3\` |
| \`slice1..5\` | \`slice-cut-1..5\` | \`food_slice_slice_1.mp3\` through \`food_slice_slice_5.mp3\` |
| \`swoosh1..3\` | \`slice-swoosh-1..3\` | \`food_slice_swoosh_1.mp3\` through \`food_slice_swoosh_3.mp3\` |
| \`uiTap1/2\` | \`ui-pop-1/2\` | Existing shared \`ui_sound_pop_1.mp3\` and \`ui_sound_pop_2.mp3\` |

All **twelve** IDs are predecoded on a genuine mode-selection / menu-close / retry / manual Welcome Back gesture. Before entering gameplay the **whole bank** must be ready. The two UI clip IDs may be prepared earlier on **title/Back/Help** gestures; a mode/Close pop is scheduled after its two native UI PCM samples prepare but *before* other effects. A first cold tap exceeding 350 ms may still be deliberately omitted rather than played late (separate N9 latency debt); never declare automatic first-tap acoustic success.

Food Slice keeps original sound randomization, \`minSwooshGapMs\`, \`lastSwooshSound\`/slice repeat exclusion and \`SOUND_TUNING.masterVolume * SOUND_TUNING.volumes\`: bomb, wrong, slice, swoosh and UI. The existing JS animation/physics/verse progression/bonus/deadlines/medals are still game-owned. The native bridge returns \`accepted\` or \`prepared\` only as backend statuses, not a guarantee that an actual speaker emits sound.

A real PCM asset/session failure blocks unmuted round start and presents **accessible Try Again / Back**, while successful preparation stays on the existing difficulty/menu screen with **nonvisual \`aria-busy\` only**. No routine gray success modal or unrelated Zoo Escape. Native \`.inactive\` can occur when the held App Switcher still displays WebKit; the controller invalidates PCM and the game freezes its own clock/physics, reveals the **plain Welcome Back**, and never auto activates/audio-plays on foreground. The deliberate Let's go! tap re-prepares all clips before restoring **the same** verse/mode, fruit positions, paused game timer, score and bonus; mute permits intentional silence.

## Automated source / real-callback gate

\`\`\`sh
node scripts/validate_native_food_slice_n6d.js
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_standalone_ui_pops_n6c1.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_snake_quiet_preflight_n6b1.js
node scripts/validate_native_only_ios_output.js
npm run build
\`\`\`

The new N6d Node test checks checked-in resource existence, fixed Swift/JS allowlists, genuine \`ui\` and \`game\` activation, UI-only vs full-game bank, UI-before-game scheduling, rejection, mute, stale title/mode, UIKit held App Switcher, no auto foreground activation and **executes the actual Food Slice \`renderIntro\`, \`renderModeSelect\`, \`wireCommonNav\`, game sound routing and Welcome Back callbacks without a stray \`volumeScale\` global**. Full GitHub Actions Node regression suite and web production build must be green on the **final PR HEAD**. CI does not compile Swift or establish acoustic audibility.

## Exact owner iPhone test after review/merge

In GitHub Desktop, select the **separate \`biblozoo-native-audio\` Mac worktree**, switch to \`experiment/native-ios-audio\` **after approving and merging #43**, and Pull Origin. From repository root:

\`\`\`sh
node scripts/validate_native_food_slice_n6d.js
npm run build
npx cap sync ios
npx cap open ios
\`\`\`

Use Xcode to build/run the **separately installed BibloZoo Audio Test**, bundle \`com.andydoane.biblozoo.audiotest\`, on a physical iPhone. Do not replace the original/stable installed BibloZoo app.

1. **Title / Help / Back:** Choose John 3:16 → Practice Games → Food Slice. Tap **Start** and hear a native pop; it must open **Choose Difficulty** even if sound preparation is cold/slow. Tap **Back** to title, and Back to Practice Games. Tap **How to Play** and Close on title and mode screens: both navigate correctly and request native UI pops. Re-enter and repeat. No JavaScript exceptions like the old Snake \`volumeScale\` failure.
2. **Mode-selection readiness:** Select Easy, Medium, then Hard across separate rounds. Each mode-selection click should pop **before its native game bank has finished preparing**, and the matching round must start only once *all twelve* IDs have prepared. No routine gray loading overlay, double/late pop, wrong difficulty, phantom Back launch, or Web Audio fallback. Use Psalm 23:4 for a second verse.
3. **Actual game effects:** Slice correct/incorrect words and bonus fruit; listen for variation among **five cut/slice** and **three incoming swoosh** sound files. On wrong word, hear its wrong sound and original brief shake/recovery. On **Hard**, intentionally hit a bomb and hear its native bomb effect; verify original penalty and animation. Check 24-second bonus, count, medals/rewards and progress remain unchanged. There must be no replay of an old sound on a different screen.
4. **Menu/Help/mute:** While a fruit moves, open Game Menu, How to Play and close both. Game physics and effects must stay paused while menus are open; the actual Close gesture re-prepares the full native bank and resumes **the same** fruit, positions and score. Test mute/unmute and exit/return: intentional mute silent; unmute + deliberate menu Close resumes native effects. The original Web/PWA/Android path remains outside this audio test.
5. **Held App Switcher and lock:** While fruit flies, swipe up and **HOLD** on the iPhone App Switcher thumbnail, then return. Repeat by switching fully into another app, and by screen locking/unlocking. Gameplay/PCM must pause immediately without hidden clock advance. On return show the **plain Welcome Back** (no auto playback/round reset or gray success modal). Tap **Let's go!** to re-prepare native PCM from the real child gesture and continue the **same** fruit/bonus timer/score/mode. Test once muted and once early after start.
6. **Rapid/stale navigation:** Tap Start→Back, difficulty→Back and different difficulty during preparation. No crashes, late pop on another screen, ghost round or unexpected native session reactivation. If a native preload genuinely fails, only then show **Try Again / Back**, never silently begin an unprepared game.
7. **Previously owner-accepted areas:** Briefly revisit Bible Bugs (title/mode and end pop), Scripture Snake (Start/Back/How to Play/Close, mode and native gameplay), four Feeding modes including Bounce, Learn John 3:16/Psalm 23:4 instruction+Chunks/Echo, and BibloPet Detail/Flashcards native verse previews. Keep stable original app and normal Web/PWA/Android unchanged.

**If any sound is missing or task-switching stalls:** before restarting, use DEV **Inspect native state** and **Copy Audio Timing Report**. Record exact button/game event, verse/mode, cold/warm status, paused/held/full switch state, whether the sound was *actually heard*, and any Xcode JavaScript exception. Swift \`prepared:true\` or \`accepted:true\` is backend scheduling, not speaker proof.

**Owner alone reviews and merges.** Record post-merge physical evidence in the **next** PR or documentation-only reconciliation, and only then advance one additional standalone game (N6e). N7 microphone/DSP, N8 independent Zoo and N9 cold UI-pop reliability remain separately scoped.
