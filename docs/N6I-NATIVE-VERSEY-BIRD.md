# N6i — Versey Bird native iOS audio: owner test and handoff

> **CURRENT RESULT — OWNER ACCEPTED (2026-11-08):** [N6i PR #50](https://github.com/andydoane/biblozoo/pull/50) was **MERGED** into `experiment/native-ios-audio` on 2026-11-08 at `5d6378fbd3ee441bd2def561975a5c8ed2f340a0`. The owner subsequently reports successful real-iPhone Versey Bird testing, so N6i is now the **eighth of 12 accepted standalone native-audio games (8/12)**. Exact individual test steps, iOS version and speaker logs were not supplied; don't fabricate them. This guide's steps and pending checkboxes below describe the **historical pre-merge acceptance plan**. Current next feature is open [N6j Tower of Bible PR #51](https://github.com/andydoane/biblozoo/pull/51) with independent iPhone/Swift testing still pending. Stable `ios-prep`, original installed app, Web/PWA/Android and mic/Zoo unchanged.

## Baseline and purpose

The owner merged [N6h.2 #49](https://github.com/andydoane/biblozoo/pull/49) as `d19a314fe39eac57c944bc16de96d84e3b2cd891` on 2026-11-08, and **now reports successful iPhone audio recovery over multiple PiP scenarios**. That owner report supersedes the older pre-merge handoff's "#49 open / PiP not accepted" marker. Exact scenarios, timings and device logs were not supplied, so don't invent them. Post-merge GitHub Actions Node regressions and web build passed at [run #42530212683](https://github.com/andydoane/biblozoo/actions/runs/42530212683).

N6i adds the next standalone game, **Versey Bird**. Eleven existing shipped effects are allowlisted in the sole Swift plugin, and the two shared UI clips give a 13-ID native PCM bank. Original Web/PWA/Android audio is untouched.

| Original Versey Bird effect | Fixed native PCM ID | Bundled MP3 |
| --- | --- | --- |
| Random nonrepeating flap 1–4 | `bird-flap-1` through `bird-flap-4` | `versey_bird_flap_1.mp3` through `versey_bird_flap_4.mp3` |
| Boulder | `bird-boulder` | `versey_bird_boulder.mp3` |
| Correct word | `bird-correct` | `versey_bird_correct.mp3` |
| Pipe cleared | `bird-pipe-cleared` | `versey_bird_pipe_cleared.mp3` |
| Pipe crash | `bird-pipe-crash` | `versey_bird_pipe_crash.mp3` |
| Streak | `bird-streak` | `versey_bird_streak.mp3` |
| Wrong word | `bird-wrong` | `versey_bird_wrong.mp3` |
| Bee hit | `bird-bee-hit` | `versey_bird_bee_hit.mp3` |
| Shared two UI pops | `ui-pop-1`, `ui-pop-2` | Already packaged shared `ui_sound_pop_1/2.mp3` |

The old unreferenced `versey_bird_flap.mp3` stays in source unchanged; gameplay uses the original four randomized files. Do not create replacement sounds.

## Native contract

- `verse_games/shared/native-versey-bird-audio.js` follows the seven-game fixed PCM/preflight contract: only real title/UI, difficulty, Retry, Game/Speed Close, halfway wake, and Welcome Back **tap** may request `activateFromGesture`. Title Help/Back only prewarms two UI clips; mode/Close/Resume need **all 13 IDs prepared** before a round runs.
- Never play or decode native sound from an automatic foreground notification, game timer, app launch, image loader or oscillator. Hot gameplay `play` schedules only predecoded Swift `AVAudioEngine` PCM. Keep exactly one `.soloAmbient` native session, no category change, separate recording or fallback Web/HTML output.
- Existing Versey Bird gameplay, flapping variation, bonus pipes, score, reward and physics are unchanged. The `BibloZooWelcomeBackClock` freezes timers while away; only a genuine Let's go prepares PCM and resumes the same in-memory round. An OS "busy" / `activation-os-rejected` must defer via the plain Welcome Back route, not increment terminal audio retry counts.
- **Special halfway nap:** Versey Bird saves progress then reloads into a wake-up interlude. A wake-up click is the first valid *new* gesture to prepare the native bank. All 13 clips must be ready before the final wake resumes the saved checkpoint. If OS or assets refuse, leave it in the interlude or show a **failure-only** Retry/Back instead of silently starting or losing the saved verse. No automatic page-load takeover.
- Intentional mute keeps controls usable, but does not claim audible output; unmuting and pressing a real Close/Resume prewarms again. Missing bundled effects / bridge errors surface an accessible failure-only native Try Again/Back dialog.
- No stable `ios-prep`, original BibloZoo installation, Web/PWA/Android sound, microphone, Zoo Escape, privacy, profile state or rewards are altered.

## Owner Mac / VS Code terminal commands (after inspecting PR #50)

In your dedicated **`biblozoo-native-audio`** folder, open VS Code and choose **Terminal → New Terminal**. Do not run these in the stable `ios-prep` worktree.

```bash
git status --short
git fetch origin
git switch experiment/n6i-native-versey-bird
git pull --ff-only origin experiment/n6i-native-versey-bird
node scripts/validate_native_versey_bird_n6i.js
node scripts/validate_native_pip_takeover_n6h2.js
node scripts/validate_native_pip_interruption_n6h1.js
npm ci
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

If `git switch` says this branch isn't available locally yet, use `git switch --track origin/experiment/n6i-native-versey-bird`. Confirm Xcode runs **BibloZoo Audio Test** bundle `com.andydoane.biblozoo.audiotest` on an actual iPhone. Do NOT install over the original BibloZoo app. The JS/CI tests and web build do **not** compile Swift or establish speaker audibility.

## Manual physical iPhone checklist — report before merging

1. **Ordinary play:** fresh launch Home native pop; enter Versey Bird. Hear Start/Back/Help/Close UI pops, choose Easy then another mode, and hear real alternating four nonconsecutive flap variations, correct/wrong words, boulder, bee hit, streak, pipes cleared/crash and bonus sounds. Check normal web-looking verse, score, medals, physics and safe Back.
2. **Title/mode quiet preflight:** there is **no routine gray loading dialog**. A genuine missing asset/bridge failure alone gets accessible Try Again and Back; do not fake a pass when a clip is silent.
3. **Game Menu + Speed Menu:** menu opens without physics advancing behind it. Close is a real whole-bank preflight; same bird, words, score and bonus continue only after preparation. Reopen/close rapidly, change speed, mute/unmute, exit and re-enter. No duplicate ghost rounds.
4. **Halfway nap reload:** with an eligible long verse (including John 3:16 / Psalm 23:4 when available), reach halfway, let the interlude reload, tap the sleeping bird to wake it. Audible native correct/streak cues return; resume the **saved** verse, mode, speed, score and streak rather than starting again. Repeat with a task switch during the wake flow. Test Back safely if a genuine sound failure occurs.
5. **App Switcher:** from active gameplay, swipe up and **hold** the card; plain Welcome Back appears and movement freezes. Tap Let's go only after returning. Full-switch away and back, screen lock/unlock, then a second interruption; same positions and timer, native effects audible. No automatic foreground playback.
6. **YouTube PiP, paused and still playing:** open a video while Versey Bird is running. First pause the video before returning and test Let's go. Then leave PiP **still playing** and return; your real Let's go tap should ask iOS to reclaim native priority. If iOS grants it, audio resumes and video yields; if it refuses, a persistent actionable retry prompt appears with a safe Back, never an inert flash or fatal PCM dialog. Also cold-launch the test app while PiP already runs; first in-app Home/mode tap may request audio priority.
7. **Regression:** revisit Verse Munch, Invaders, Dino Dash, Snake, Bugs, Food Slice, Verse Splat; Feeding all four modes including Bounce; Learn and verse previews; Home pops after leaving Versey Bird. None should lose their existing native audio/recovery.
8. **Before restarting on failure:** open DEV **Inspect native state**, then **Copy Audio Timing Report**. Include whether the speaker actually sounded, whether YouTube was playing, iOS version, and values `pending`, `otherAudioPlaying`, `needsGestureAfterInterruption`, `lastActivationResult`. Swift `prepared:true`/`accepted:true` isn't acoustic proof.

## Validation / exit status

- N6i source and VM validator: `node scripts/validate_native_versey_bird_n6i.js`.
- Previous seven game, PiP and global output-isolation regressions remain in `.github/workflows/ios-prep-validation.yml`; production web build `npm run build` is a second job.
- **Mac Swift/Xcode build: PENDING** until owner runs it.
- **Owner-heard iPhone audio and game recovery: PENDING** until owner reports them.
- **Owner alone reviews/merges.** In the next PR, update `docs/PROJECT-HANDOFF.md` with the actual #50 CI/merge/device outcome. Do not raise the accepted milestone to 8/12 solely because code exists.
