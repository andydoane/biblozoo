# N6o — Scripture Scrub: Second Verse Playground Native Audio (PR #56)

> **CURRENT RESULT — OWNER ACCEPTED (2026-11-09):** [N6o Scripture Scrub PR #56](https://github.com/andydoane/biblozoo/pull/56) **MERGED** to `experiment/native-ios-audio` at `1aa5c7d510b542a6261e47f82a07ce5589f6f41b` on Nov 9 14:36:40 UTC. Owner now reports all normal physical iPhone tests **PASS**, including held App Switcher and interrupted audio. That makes **Playground 2/5 accepted**, with three remaining; all **12/12 separate external games** remain completed. No individual per-effect device logs supplied—do not invent. Historic pre-merge tests below are the accepted test plan, not current status. [N6p Wheel of Bible #57](https://github.com/andydoane/biblozoo/pull/57) OPEN and proposed third; its CI/Mac Swift and owner-heard speaker tests independently pending. Stable `ios-prep`, original installed BibloZoo, Web/PWA/Android, microphone, Zoo and user data untouched.

## Exact source sound inventory: not generic replacements

Scripture Scrub's source declares **18 original packaged MP3 effect keys**. These are included unchanged in the native iOS app's bundled public folder, decoded ONCE during explicit Start/Resume preflight on the existing serial Swift `.soloAmbient` `AVAudioEngine`. Plus seven fixed original progress-note frequencies, a four-note original victory fanfare, and the shared two UI taps = **28 unique predecoded PCM IDs**. The extra checked-in `scripture_scrub_peel.mp3` was *not referenced in `SOUND_FILES`* and remains unmodified/unmigrated rather than being invented as an audible source cue.

| Source event | Native IDs / behavior |
| --- | --- |
| Cookie bites | `scrub-bite1`, `scrub-bite2`, `scrub-bite3` — original random nonrepeating selection |
| Sticker pops | `scrub-pop1` through `scrub-pop5` — original random nonrepeating selection |
| Round introduction/environment | `scrub-splat`, `scrub-squeak`, `scrub-chalk`, `scrub-glow`, `scrub-rainbow`, `scrub-dig`, `scrub-popup`, `scrub-leaves`; original `scrub-complete` file preserved in defined bank |
| Mower | `scrub-mower` original MP3 rendered to a bounded **1.25-second fade-in/fade-out loop** in native PCM; new allowlisted `stopEffect` stops **only** mower voices without clearing the other 27 prewarmed clips. Original source reused a looped WebAudio buffer while the same-length mowing animation ran |
| Scrubbing melody at original **2% progress steps** | `scrub-progress-g3` 196 Hz, `-c4` 261.63, `-d4` 293.66, `-e4` 329.63, `-f4` 349.23, `-g4` 392, `-a4` 440. Reuse **original 28-note scale** with repeated notes, 75ms sine, existing 90ms throttling. Don't replace with a generic chirp or play every 2% note simultaneously |
| Round completion | `scrub-completion-arpeggio` — original G4/C5/E5/G5 four-note sine melody at 95ms intervals, 130ms notes and source `0.98` volume |
| Menus/Title | `ui-pop-1`, `ui-pop-2` — original two shared taps, volume `0.42` |

**Important:** 28 PCM IDs = 18 packaged sound assets + 7 note pitches + 1 arpeggio + 2 shared UI pops. The native bridge accepts only hardcoded IDs and fixed source-owned frequencies/paths; no caller-supplied arbitrary note, path, hot decoder, second AVAudioSession, WebAudio, HTML silence prime, Web fallback or microphone change. Web/PWA/Android retain existing audio code and appearance.

## Lifecycle and same-run constraints

Scripture Scrub randomly selects **four varied activities followed by the always-final Archaeology round** from source groups (mud/paint/fog; cookies/stickers/leaves/mower; glow/chalkboard/rainbow), retaining existing canvas masks, scores, rewards, stickers and original sound choices. Native Start takes a child's **real tap** (preloads only two UI pops for early navigation, then all 28 gameplay sounds before starting); Game Menu Close, actual failure Try Again and plain Welcome Back **Let's go** are other allowed real-gesture priorities. Do **not** auto-activate Swift from page load, foreground event, OS callback, timer, audio play, or mouse-move. On genuine `activation-os-rejected`, keep ordinary retriable Welcome Back rather than fatal error or silent-running game.

The Game Menu or held UIKit App Switcher (including WebView thumbnail still visibly lit), full app switch/lock, and YouTube PiP **PAUSED** or **STILL PLAYING** must pause the same `BibloZooWelcomeBackClock` and same round, brush progress, object count, mower travel animation, paint/chalk/fog/glow effects, final Archaeology score and rewards. Invalidate old PCM, stop mower only when intended, cancel in-flight canvas pointer strokes, and rewarm all 28 on the next deliberate Continue/Close tap. Do not advance a round, award a silent completion or fast-forward the mower while paused. **Only genuine PCM/bridge failures** show accessible Retry/Back; successful preflight is quiet. Native `play` `accepted` means scheduled, not that sound reached the speaker.

**Technical caveat to listen for:** the original Web mower loops its MP3 and fades dynamically across the requested animation duration. The new bounded native buffer is 1250ms with matching source-authored envelope; after a mid-mower interruption it may restart its phase when audio rewarms. A user-heard test must check whether that remains natural relative to the resumed visual pass. Do not claim sample-exact mid-loop seamlessness.

## Your familiar GitHub Desktop → VS Code → Xcode routine

No unusual terminal commands are required for normal acceptance. Only after the **final PR HEAD** shows GitHub Actions **Node regression suite** AND **production web build** GREEN:

1. Owner **merges [PR #56](https://github.com/andydoane/biblozoo/pull/56)** personally to isolated `experiment/native-ios-audio` (not stable `ios-prep`).
2. In **GitHub Desktop**, select the dedicated `biblozoo-native-audio` checkout on branch **`experiment/native-ios-audio`** and click **Pull origin**.
3. In that folder's VS Code terminal paste the usual one-liner:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

4. In Xcode select **App** scheme, **physical iPhone**, separate test bundle `com.andydoane.biblozoo.audiotest` and press **Play**.
5. Try the checklist and report **PASS** or specific sound/behavior issue.

Optional only during troubleshooting (Actions runs checks automatically): `node scripts/validate_native_playground_scripture_scrub_n6o.js`, `node scripts/validate_native_playground_verse_typer_n6n.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `node scripts/validate_native_only_ios_output.js`. Mac Swift compile and actual acoustic iPhone success are separate from Linux CI.

## Practical iPhone listening and visual checklist

1. **Title/start/Help/Back and cold Home entry:** Hear the shared UI pop (first cold pop may deliberately suppress if too late), Start prewarms the 28-ID bank quietly, without routine gray loading. Normal random round selection/round count and saved verse remain the same.
2. **Progress-song rounds:** Scrub **Mud/Paint/Fog/Chalkboard/Glow/Rainbow** whenever they appear (random selection changes each run). Hear the original rising/falling **seven-pitch melody**, updated each two percentage points and 90ms throttled. Check correct visual scrub masks, brush drawing, percentage and four-note victory arpeggio at round completion. No silent progress and no ghost fast notes during menu.
3. **Other random activities:** In several plays, hear three random **cookie bites**, five random **sticker pop** variants, **Leaves**, **Glow**, **Chalk**, **Splat**, **Squeak**, **Rainbow**, **Dig/Archaeology** and original instruction `popup`. No stale sound from a previous randomized round.
4. **Mower:** Hear the original looping mower fading in/out during its **1250ms visual sweep**, and stopping when it ends; the progress/cookie/other bank must remain hot even after stopping the mower. Try interrupting **mid-mower**, return on plain Welcome Back; visual mower continues same lane and score without racing ahead or doubling completion. Listen for any weirdly restarted or extended mower hum.
5. **Game Menu/Help/Mute:** Open mid-scrub (or mid-mowing), switch to How to Play, Back/Keep Scrubbing, intentional mute and unmute, exit. While menu is open no brush movement or generated progress sounds should leak; the same visible percentage/round should resume, only after a real-gesture PCM preflight. Test rapid duplicate menu taps.
6. **PiP and App Switcher:** During active brush and again during mower, swipe up-and-**HOLD** UIKit App Switcher while the WebView still appears visible, return and choose plain Welcome Back **Let's go**. Repeat with YouTube PiP **PAUSED**, then **STILL PLAYING**, app switching/lock. No auto-takeover without user tap, no unexpected Zoo BREAK for an audio denial, no silent running game.
7. **Completion and regressions:** The always-final **Archaeology** must retain correct Bible discovery score, verse practiced and completion rewards; Try Again restarts random rounds correctly. Return Home, sample Verse Typer native letter melody **and published spoken chunk reviews**, Verse Scramble, Traffic Tap and a few other external games, Feeding, Learn and preview audio.
8. **Failure diagnostics:** Before restarting, DEV **Inspect native state** and **Copy Audio Timing Report**, save any Xcode Swift build errors, note which selected scrub round, percentage/brush or mower stage, route/speaker, iOS version and whether YouTube PiP was still playing. `prepared:true`/`accepted:true` are NOT speaker measurements.

## Acceptance and next work

Current evidence establishes **12/12 external standalone games** plus **Playground 1/5 (Verse Typer)** merged/owner iPhone PASS. Scripture Scrub is **proposed Playground 2/5**, pending PR green CI, independent Mac Xcode Swift compile, and owner-heard iPhone gameplay/PiP test. Only after reported PASS can the living roadmap record **2/5 accepted, 3 remaining** (Verse Jam, Wheel of Bible, Ghost Writer). Future mic/recording N7 work remains a separate phase. Every PR must update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and its dedicated test guide, while stable `ios-prep` stays untouched.
