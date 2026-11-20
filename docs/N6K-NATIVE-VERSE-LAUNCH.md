# N6k — Verse Launch native iOS audio acceptance and handoff

> **CURRENT RESULT — OWNER ACCEPTED (2026-11-08 Michigan):** [N6k Verse Launch PR #52](https://github.com/andydoane/biblozoo/pull/52) was **MERGED** to `experiment/native-ios-audio` at `21912befabff7f7e3819ed0b01349db579447319` on 2026-11-09 00:44:38 UTC. Owner now reports **normal real-iPhone tests worked great (PASS)**, so Verse Launch is the **tenth of 12 owner-accepted standalone native games (10/12)**. No specific event/device metrics were supplied; don't invent them. Any pending checklists below describe the *historical pre-merge test plan*, not current status. Next is open [N6l Traffic Tap PR #53](https://github.com/andydoane/biblozoo/pull/53), pending independent Mac Swift/iPhone acceptance. Stable `ios-prep`, original installed BibloZoo, Web/PWA/Android, mic/Zoo and user data unchanged.

## Actual owner-accepted baseline

[N6j Tower of Bible #51](https://github.com/andydoane/biblozoo/pull/51) is **MERGED**, at integration SHA `1593a98bb60709582e8fa6b1a5fd4ac9a7e9d07d`, on November 8, 2026 (Nov 9 UTC). Owner reports **successful normal real-iPhone tests, no issues**. This makes **9 of 12** standalone native games accepted. [#49](https://github.com/andydoane/biblozoo/pull/49) YouTube PiP real-gesture correction, [#50](https://github.com/andydoane/biblozoo/pull/50) Versey Bird and #51 Tower are merged and owner-accepted. Do not invent device metrics/test case logs. N6k becomes 10/12 **only after owner iPhone PASS and merge**. Two other standalone games then remain, Traffic Tap and Verse Scramble Neo.

## Fixed native 14-ID sound inventory

Verse Launch originally uses 8 distinct shipped gameplay MP3s, one repeated for two events, two distinct countdown beeps and two alternating generated projectile tones. Add the existing two UI pop samples for **14 unique native PCM IDs**.

| Game event | Native ID | Exact source / original preset |
| --- | --- | --- |
| correctTap | `launch-correct` | `verse_launch_zoom.mp3` |
| wrongTap | `launch-wrong` | `verse_launch_wrong.mp3` |
| wordAdded, starCollected | `launch-collect` | `verse_launch_collect.mp3` (same native buffer, no duplicate ID) |
| asteroidDestroyed | `launch-explode` | `verse_launch_explode.mp3` |
| playerAsteroidHit | `launch-hit` | `verse_launch_explode_2.mp3` |
| landingStart | `launch-land` | `verse_launch_land.mp3` |
| launchButton | `launch-launch` | `verse_launch_launch.mp3` |
| cutsceneRocketEnter | `launch-enter` | `verse_launch_launch_2.mp3` |
| countdownBeep | `launch-countdown-low` | Swift 261.63 Hz C4 sine, 180 ms |
| countdownFinalBeep | `launch-countdown-high` | Swift 523.25 Hz C5 sine, 180 ms |
| projectileTick | `launch-projectile-tick` | Swift 880→1180 Hz triangle, 58 ms |
| projectileTock | `launch-projectile-tock` | Swift 620→820 Hz triangle, 58 ms |
| uiTap1, uiTap2 | `ui-pop-1`, `ui-pop-2` | Existing shared UI PCM |

Original master `0.90` and per-effect gains are kept for the eight packaged clips; Swift bakes the original gains for four precomputed notes (played at native volume 1). The unused extra `verse_launch_wrong_2.mp3`, `verse_launch_explode_1.mp3` and a one-byte `delete.mp3` remain untouched and are **not** allowlisted.

## Native-only contract and preserved game semantics

- All 14 fixed IDs decode or synthesize and prewarm on the **existing sole** nonmixing `.soloAmbient` AVAudioSession and serial Swift `AVAudioEngine`. The four generated notes use hardcoded bounded `AVAudioPCMBuffer`, never an arbitrary caller frequency. Hot projectile volleys, countdown, rocket, word, collision and asteroid events only schedule already-loaded PCM; **no WebAudio or HTML audio fallback** on native iOS.
- Real Title, Back, Help and UI taps prewarm two shared UI pops. Real difficulty choice, Game or Speed Menu Close, bonus asteroid Game Menu Close, Retry and plain Welcome Back **Let's go** prewarm all 14 before the conveyor, physics or star timer can run. Real `activateFromGesture` is called synchronously from tap; never from passive app launch/foreground, audio interruption `.ended`, tick or Web audio recovery timer.
- During a held App Switcher, full switch, lock, or YouTube PiP interruption, freeze the same virtual game clock and current screen/flight. The next real Let's go may reclaim priority from PiP STILL PLAYING; a genuine OS denial remains retryable Welcome Back. Preserve exact collected words, star count, asteroid hits/locations, rocket upgrades, countdown/bonus, progress and reward eligibility. No cold-game restart, duplicate completion or silent auto-replay.
- Failure-only accessible Try Again/Back for missing PCM/bridge. Quiet ordinary preflight; no routine gray popup. Preserve original Web/PWA/Android sound handling, UI and controls unchanged. Stable `ios-prep` and installed app untouched.

## Your normal Mac / GitHub Desktop workflow

**This is the default. No special npm test scripts required for routine acceptance.** After GitHub Actions shows both Node checks and Production web build green on this PR, use your usual steps:

1. **Merge PR #52** on GitHub yourself (only in the isolated native experiment).
2. Open **GitHub Desktop**, make sure the selected branch is **`experiment/native-ios-audio`**, and click **Pull origin**. Do not accidentally test `ios-prep`.
3. In VS Code Terminal in the native-audio working directory, run exactly:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

4. Select your physical iPhone in Xcode, select the **App** scheme for the separate test bundle `com.andydoane.biblozoo.audiotest`, and press **Play**.
5. Listen and play normally. Report **PASS or anything unusual**. If there is an issue after merge, make a focused corrective PR; the stable app remains unaffected.

Optional one-off diagnostics only when a failure occurs: `node scripts/validate_native_verse_launch_n6k.js`, `node scripts/validate_native_tower_bible_n6j.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `node scripts/validate_native_only_ios_output.js`. GitHub Actions already runs these automatically; ordinary owner testing should not require these extra commands.

## Actual iPhone listening checklist

- **Home / title / difficulty / menus:** Title Start and Back, Help, Easy/Medium/Hard native UI pops; full bank ready before choices move. Open Game Menu and Speed Menu, change speed, Close and continue with same verse and conveyor timing. Mute → unmute → Close; no sound while muted and no early timer advance.
- **Verse gameplay:** Hear correct zoom, wrong sound, collect word sound and original launch/landing cues; correct score, verse order, medals/completion, no double rewards.
- **Bonus:** Launch the rocket, hear 3 low C4 countdown beeps and high C5 final beep; cutscene rocket-entry, space asteroid explosion and player-hit, collect star, alternating tick/tock projectile sound. Test speed/game menu during bonus flight, if available. Spaceflight/rocket position, stars/hits/timer should not reset.
- **Interrupted run:** While conveyor moving and separately during asteroid/space bonus, swipe up **and hold** App Switcher, return and tap **Let's go**. Try YouTube PiP PAUSED and STILL PLAYING; cold launch while PiP plays and Home afterwards. Genuine refusal must leave a retryable Welcome Back, not silent running game.
- **Regression:** Return Home, test native sounds in Tower of Bible, Versey Bird, Verse Munch and other accepted seven game effects; spot check Feeding, Learn, UI/preview, no microphone/recording change.
- **If silent:** Before restarting, DEV **Inspect native state** + **Copy Audio Timing Report**, save Xcode Swift compiler messages, iOS device version, speaker status, event/phase, and whether YouTube PiP was still playing. `prepared:true` and `accepted:true` only confirm native scheduling, **not actual human-audible sound**.

**CI vs iPhone gates:** GitHub Node VM checks and production web build can be green without Mac Swift compiling or any sound reaching an iPhone speaker. Keep owner test and merged status explicit. Every PR also updates `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and the relevant dedicated handoff guide.
