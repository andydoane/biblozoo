# N6l — Traffic Tap native iOS audio owner acceptance guide

> **[PR #53](https://github.com/andydoane/biblozoo/pull/53)**: `experiment/n6l-native-traffic-tap` → `experiment/native-ios-audio` (isolated experiment only). **Open for review, not merged or owner-heard yet.** Only the owner merges. If accepted after normal iPhone tests, Traffic Tap becomes **11/12** standalone games (10/12 at this baseline). Stable `ios-prep`, original installed BibloZoo, browser/PWA/Android, recording/mic, Zoo and game data remain untouched.

## Latest verified baseline

[N6k Verse Launch PR #52](https://github.com/andydoane/biblozoo/pull/52) **MERGED** into `experiment/native-ios-audio` at `21912befabff7f7e3819ed0b01349db579447319` on 2026-11-09 at 00:44:38 UTC (evening Nov 8 Michigan). Owner reports ordinary real-iPhone tests **PASS / no issues**. No exact iPhone logs or step-by-step sound list were provided, so do not invent them. **10/12 standalone games now accepted**, including Tower #51 and Versey Bird #50, on owner-reported evidence. [N6h.2 PiP fix #49](https://github.com/andydoane/biblozoo/pull/49) also merged/owner-reported successful. N6l is proposed eleventh; after Traffic Tap only **Verse Scramble Neo** remains.

## Exact fixed PCM sound inventory

Traffic Tap's source `verse_games/traffic_tap/game.js` plays one original MP3 and synthesizes the other gameplay cues via Web Audio. N6l uses the existing serialized Swift `AVAudioEngine` and sole `.soloAmbient` AVAudioSession to **pre-render all 13 original generated recipes** (including all eight different bonus pairs). With two preexisting shared native UI pops, the bank has **16 unique fixed IDs**; no hot decode, oscillator, network or new audio session.

| Original sound | Native fixed ID | Source |
| --- | --- | --- |
| zoomLaunch | `traffic-zoom` | Existing packaged `traffic_tap_sounds/sound_zoom.mp3` |
| correctTap | `traffic-correct` | Swift-baked original 659→784 Hz, triangle |
| wrongTap | `traffic-wrong` | Swift-baked original descending 220→170 plus 170 Hz triangles |
| truckIntro | `traffic-truck-intro` | Fixed D5/E5/G5 three-note tune |
| truckOutro | `traffic-truck-outro` | Fixed C6/G5/E6 three-note tune |
| rainbowJackpot | `traffic-rainbow` | Fixed G5/C6/E6/C6 four-note rainbow fanfare |
| bonusTap at streak positions 1–8 | `traffic-bonus-1` to `traffic-bonus-8` | All **eight** different two-note ascending pairs; repeats by `(bonusStreak-1) % 8` |
| uiTap1 / uiTap2 | `ui-pop-1`, `ui-pop-2` | Existing shared packaged UI pop effects |

Original `SOUND_TUNING` volumes (including authored Web gains greater than 1) are baked into precomputed fixed note PCM to preserve approximate original loudness without clipping; zoom keeps its existing `0.25` volume and the fixed clips play at native volume 1. Keep their recognizable musical contour; human ears on an iPhone must verify.

## Audio/interrupt safety requirements

- **Native iOS only:** `verse_games/shared/native-traffic-tap-audio.js` routes all traffic/truck/bonus/zoom effects and UI pops to the one allowlisted serial Swift PCM worker. No `AudioContext`, HTML silence prime, Web fallback or arbitrary sound ID from the game. Web/PWA/Android retain the original untouched oscillator and MP3 audio paths.
- Title/Help/Back can prepare **only two UI pops** on a real tap; Mode select, Game Menu/Speed Close, failure Retry and Welcome Back **Let's go** must request native session in the *same real user gesture* and preload all **16** before driving/physics/bonus time resumes. No routine gray loading dialog. Genuine asset/bridge failure gets accessible Try Again/Back. Only a real gesture may attempt to take priority from YouTube PiP STILL PLAYING; neither app load, game timer, OS interruption end, hot PCM play/preload nor foreground notifications can auto-reactivate.
- Held App Switcher (UIKit inactive while WebView still visible), switching apps, lock and YouTube PiP PAUSED/STILL PLAYING freeze **the same round's virtual clock** and preserve road vehicles, selected verse, correct/wrong hits, target truck, eight-note bonus streak, rainbow bus, bonus score and rewards. True `activation-os-rejected` stays retriable via plain Welcome Back; never delete progress, falsely claim success or pop terminal gray error. A late callback cannot restart a run after exiting.

## Your familiar testing routine (no unusual terminal commands)

After both GitHub Actions checks are green on **final PR HEAD**, use your normal workflow:

1. **Merge PR #53** yourself to `experiment/native-ios-audio` on GitHub.
2. Open **GitHub Desktop**, select `experiment/native-ios-audio` and click **Pull origin** in your dedicated `biblozoo-native-audio` directory (not stable `ios-prep`).
3. In that VS Code folder, run **only**:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

4. Choose the **App** scheme targeting `com.andydoane.biblozoo.audiotest` and your **physical iPhone** in Xcode; press **Play**.
5. Test the audio and game; report **PASS or anything unexpected**. If you discover a problem *after merging* on this isolated experimental branch, we can submit a focused corrective PR. No changes to the stable installed app.

Optional **troubleshooting only if needed**: `node scripts/validate_native_traffic_tap_n6l.js`, `node scripts/validate_native_verse_launch_n6k.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `node scripts/validate_native_only_ios_output.js`. GitHub Actions already runs these, so owner routine acceptance needs only the familiar one-line build command.

## Quick actual iPhone test checklist

- **Title/modes/Help:** hear UI pops on Start, Back, Help, choose Easy/Medium/Hard. No game driving or timer before native full bank is prepared; no routine gray popup.
- **Road gameplay:** listen for original zoom MP3, synthetic correct and wrong note; ensure two roads, obstacles, repeated taps, spawn/speed timing, word progression and scores behave as before.
- **Bonus:** reach bonus round; hear truck intro/outro, tap target vehicles repeatedly and verify **different two-note bonus tones** across streak steps 1–8 (not always identical); hear rainbow bus jackpot fanfare. Preserve existing target/countdown/reward flow.
- **Menus/mute:** open and close Game Menu and Speed Menu, change speed mid-run, intentionally mute/unmute, use Help/Back and possible duplicate rapid taps; same verse, vehicles and streak after resume.
- **Switch/PiP:** while road active and separately during bonus, swipe up **and HOLD** App Switcher; switch/lock and return, tap plain Welcome Back Let's go. Try YouTube PiP **PAUSED** before return and **STILL PLAYING** on return, and cold-launch with PiP already playing. Game should freeze until a real gesture; genuine higher-priority OS denial is retriable via plain Welcome Back, not a stuck screen.
- **Regression/Home:** return Home (sound still works) and sample Verse Launch rockets/countdown, Tower, Versey Bird, Munch and other previously accepted games; Feeding four modes, Learn/verse previews remain okay.
- **If silent or Xcode fails:** before restart DEV **Inspect native state** and **Copy Audio Timing Report**, then report game event, mode, whether PiP paused/playing, iOS version, Xcode compiler messages. Native `prepared:true`/`accepted:true` only proves PCM scheduling, **not actually audible output**.

**Acceptance gates:** (1) final-head GitHub Node/production web CI; (2) Mac Swift compilation; (3) owner-heard actual iPhone test, independently confirmed. Only the owner decides merge and marks 11/12 after device PASS. Every PR updates `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md`, and this dedicated guide.
