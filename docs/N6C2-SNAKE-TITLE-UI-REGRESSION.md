# N6c.2 — Scripture Snake title-menu JavaScript crash and native Help pops

**PR:** [#42 — N6c.2 Scripture Snake title/menu fix](https://github.com/andydoane/biblozoo/pull/42), targeting **`experiment/native-ios-audio`** after owner-merged [N6c.1 #41](https://github.com/andydoane/biblozoo/pull/41), base merge `dd81ee6e1e3021a2df386640f538848bfdf83920`. **Status: proposed, owner physical iPhone acceptance pending.** No stable `ios-prep`, original installed BibloZoo, browser/PWA/Android or Bible Bugs code change.

## Owner's real iPhone failure after #41

Owner tested the merged N6c.1 build. **Bible Bugs title/mode UI pops seemed fixed.** **Scripture Snake** title How to Play opened but made **no pop**; its **Start and Back did not respond**. Xcode reports:

```
ReferenceError: Can't find variable: volumeScale
capacitor://localhost/verse_games/verse_snake/game.js:896:52
```

The error occurs on Start. In the source from #41, **two** newly introduced expressions use `volumeScale` outside its only valid scope (parameter of `playGameSound(key, volumeScale = 1)`): one in `unlockAndTap()` for title/Back/Help, and one in `primeSnakeAudioAndContinue()` for real mode/menu Close preflight. The first throws synchronously before Start/Back navigation; the second would prevent difficulty/Close preflight. The log's `prepared:true` and `accepted:true` are valid native bridge responses but NOT physical speaker proof. Numerous OS sandbox/WebContent/AX warnings in that log are not evidence of this JavaScript exception.

## Scope of the correction

- Remove **both** invalid variable references, preserving existing volume from `SOUND_VOLUMES.uiTap1/2` bounded to 0–1. No new global variable, no gameplay or audio tuning change, and no modified original `playGameSound(key, volumeScale=1)` behavior.
- The title and difficulty screens use the shared `game-shell.js` for rendering/Help behavior. **Only in native Snake**, attach `unlockAndTap` to the already-wired **How to Play / Help Close** buttons without overriding their click handlers. Native `ui-pop-1/2` is still routed through the same existing Swift AVAudioEngine and `.soloAmbient` session; no Web/HTML audio fallback. Original Web/PWA/Android Help behavior remains.
- Keep the N6c.1 real-gesture, two-UI-clip PCM preparation and mode/Close pop-before-full-effect-bank logic; no round before full bank, no success gray popup, no late stale/automatic return pop. Preserve task-switch held App Switcher → plain Welcome Back manual same-round recovery, failure-only Try Again and all scores/modes.
- Add a **real-source Node VM** that loads original `unlockAndTap`, `primeSnakeAudioAndContinue`, `renderIntroScreen` and `renderModeSelect` functions, invokes their **actual** callbacks with NO global `volumeScale`, checks Start/Back navigation, Help and Help Close pop request, real mode/Close prepared volume `0.55`, mute, browser isolation and whole-bank success. This would have caught the #41 defect, which a static-only regex and full web build did not.

## Source/CI validation (not a physical hearing test)

```bash
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_standalone_ui_pops_n6c1.js
node scripts/validate_native_snake_quiet_preflight_n6b1.js
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

New VM gate is added to `.github/workflows/ios-prep-validation.yml`, along with existing full Node regressions and production web build. Verify the **final PR head** both jobs green; they do **not** compile Swift or certify actual speaker output.

## Physical iPhone steps — owner review/merge then build

In GitHub Desktop on the **separate `biblozoo-native-audio` worktree** switch to **`experiment/native-ios-audio` after you approve and merge #42**, Pull Origin. At repository root run:

```bash
node scripts/validate_native_snake_title_ui_n6c2.js
npm run build && npx cap sync ios && npx cap open ios
```

Build **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) in Xcode on a **physical iPhone**; leave the original installed BibloZoo app intact.

1. **Scripture Snake title:** Select John 3:16 → Practice Games → Scripture Snake. Tap **Start**: it MUST open **Choose Difficulty** (no JS error), and the native title pop should be heard. Tap **Back** to title, then **Back to Practice Games**: both navigate; verify intended UI pops and no runaway/late audio.
2. **How to Play:** On Snake title, tap **How to Play**: help should open and request an audible native pop. Tap **Close**: it closes and requests a pop. Also test How to Play/Close on the difficulty screen. Repeat after returning from mode/gameplay. No extra pop or blocked navigation.
3. **Difficulty and game:** Re-enter Snake, select **Easy**, then **Medium**/**Hard** after Back or a completed game. Each tap should open the corresponding **same difficulty** round only when all native effects are prepared; its UI pop should be heard while preparing, before gameplay. No routine gray success/loading overlay. Test correct and wrong word, orbs, fruit, boosts, bonus and unchanged scores/medals. Repeat on Psalm 23:4.
4. **Menu and mute:** During a moving round, open Game Menu/How to Play and **Close**, plus Snake speed menu **Close**. Full native audio re-preparation must occur on the explicit child tap without resetting the score, position or clock, and audible UI/actual gameplay cues must recover. Mute suppresses sounds and never blocks button action; unmute works. No late ghost/double pops.
5. **App Switcher and locking:** During movement, swipe up and **HOLD** in the App Switcher while the WebKit thumbnail may still be visible; also do a complete app switch and return and lock/unlock the phone. Audio/physics pause, **plain Welcome Back** (not gray success popup) appears, no automatic sound, and **Let's go!** resumes the **same** round after native sound preparation without time catch-up. Repeat with mute and during an early click if possible.
6. **Fast taps:** Start → Back, difficulty → Back, double taps and menus during preparation must not throw, start the wrong round, or play an abandoned pop. The VM test covers timing too fast to reproduce reliably.
7. **Regression:** Bible Bugs title/mode/end pops must remain as owner reported (the #41 Bugs result was good). Briefly regress all four Feeding modes including Bounce, Learn John 3:16 and Psalm 23:4/Chunks/Echo, BibloPet Detail and Flashcards previews, and main UI pops/DEV. Original Web/PWA/Android and stable iOS installed app must remain unchanged.

**If anything is still silent or navigation stops:** capture **DEV → Inspect native state** and **Copy Audio Timing Report BEFORE restarting**, plus the exact visible JS error/line, screen/button, verse/difficulty, cold or warm attempt, switch type and whether the sound was actually heard. `prepared` or `accepted` alone does not establish speaker output.

**Owner alone reviews and merges.** After a passing device test, update [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) in the next PR (or docs-only correction) with actual post-merge owner results. Only then resume N6d migration of another standalone game. Preserve N7 microphone/DSP, N8 independent Zoo and N9 occasional first cold/return pop as separate work.
