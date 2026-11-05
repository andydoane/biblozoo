# BibloZoo — Audio Recovery and Zoo Escape Contract

> **Read with** [the living handoff](PROJECT-HANDOFF.md). This describes the safety boundaries of the current `ios-prep` implementation as checked on 2026-11-05 (base `1e1deb2`). **Source and current tests are authoritative.** Do not replace the activity-owned recovery path with a global approximation.

## Why this subsystem exists

iOS / WKWebView app switches and interruptions may leave Web Audio playback stalled even when a JavaScript object says its `AudioContext` is running. BibloZoo must distinguish genuinely advancing audio from merely available or resumed APIs. A failed recovery can trigger the child-friendly Zoo Escape minigame without changing the underlying activity's audio truth.

The shared recovery UI is **not** an audio engine. It must remain fully playable without sound.

## Important source files

- **Native diagnostics:** `ios/App/App/AppDelegate.swift` (read-only `BibloZooAudioSessionDiagnostics` plugin).
- **Native bounded recovery experiment / signal state:** `ios/App/App/SceneDelegate.swift` (`BibloZooAudioSessionRecovery` plugin).
- **Shared JS/native adapters:** `verse_games/shared/native-audio-recovery.js`, `audio-recovery-coordinator.js`, `welcome-back-clock.js`, `audio-diagnostics.js`.
- **Shared UI and standalone bridge:** `verse_games/shared/welcome-back.js`, `welcome-back.css`, `welcome-back-return.js`, `welcome-back-zoo-escape.js`, `bridge.js`.
- **Activity owners:** `app.js` (Learn/app), `daily_questions_feed_game.js` (Feeding), `read_my_verse.js`, `flashcards/`, individual `verse_games/` and `verse_playground/` controllers.

## Non-negotiable behavior

1. **Only a real recovery probe can establish success.** A successful note, a resumed `AudioContext` state, a native diagnostic snapshot, a tap, animation completion, or a simulated developer result is not sufficient. The owner checks that its actual audio/playback clock advances.
2. **No automatic native activation from foreground or decorative sounds.** The bounded native path is considered only after observed stalled Web Audio, through the existing guarded coordinator. Do not create/resume/replace a context just to play Zoo Escape sounds.
3. **Preserve the existing native category and interruption policy.** The app intentionally retains **`AVAudioSessionCategorySoloAmbient`**; do not change category, mode, or audio-session handling without a deliberate, device-tested design review. Native diagnostics must remain observational; the existing bounded reactivation must not be expanded into a generic auto-recovery loop.
4. **Keep a pending interruption distinct from a failed attempt.** If the native signal still says interruption began / recovery deferred, preserve the current LOCK GATE stage and allow another deliberate attempt. Never escalate Zoo Escape just because iOS has not finished the interruption.
5. **Activity-owned callbacks.** The shared Welcome Back/Zoo Escape controller may display stages and request a recovery, but the owner still pauses physics/audio, checks its own playback, resumes on verified success, and cleans up or navigates on exit.
6. **Real gesture and bounded deadlines.** On LOCK GATE, the activity-owned recovery callback must run in the real user gesture; avoid introducing deferred synthetic clicks that break iOS unlock behavior. Timeouts and stale-generation guards prevent loops or delayed state changes after exit.
7. **Respect quiet or microphone activities.** A quiet Daily return may be acknowledgement-only; do not invent an audio test. Flashcards / Read My Verse must never spontaneously begin recording or overwrite a partially completed take.
8. **Do not break gameplay on failure.** Zoo Escape may be silent, and rescue stages must still be interactive. On final failure or early exit, execute the owner cleanup and correct route (including special Daily To-Do returns). Preserve score/progress and avoid duplicate rewards.
9. **Do not credit developer simulations.** The hidden testing harness can force failures or deferred outcomes, but the real recovery owner is still required for success. Simulated rescues must not increase persistent per-Zookeeper rescue statistics.

## Zoo Escape lifecycle in brief

| Phase | Expected action |
| --- | --- |
| Return after an interruption | Show Welcome Back and pause activity-owned gameplay |
| Recovery verified | Dismiss safely and resume same activity/progress |
| First genuine failure | Stage 2: one named pet escapes; rescue it; LOCK GATE retries |
| Second genuine failure | Stage 3: ZOO BREAK, several distinct pets; catch all; final LOCK GATE |
| Recovery still pending | **No additional failed attempt**; keep the gate at its current stage |
| Verified final-gate success | Activity resumes; a genuinely stopped Zoo Break can earn credit |
| Final verified failure | Fade and execute a safe, activity-owned exit to home/title where appropriate |
| App switched while animals loose | Suspend and resume the **same** rescue stage and caught-pet state; no duplicated pets |

Appearance details can evolve; the audio and state boundaries above must not.

## Diagnostics and validation

Start with relevant existing validators; inspect the current scripts and modify the selection as needed:

```sh
node scripts/validate_audio_clock_recovery_patch56.js
node scripts/validate_native_audio_session_patch58.js
node scripts/validate_native_audio_recovery_patch59.js
node scripts/validate_audio_recovery_coordinator_patch60.js
node scripts/validate_app_audio_patch23b.js
node scripts/validate_feeding_audio_bounce_patch24.js
node scripts/validate_patch72_1b_feeding_zoo_escape.js
node scripts/validate_patch72_1c_whole_app_zoo_escape.js
node scripts/validate_patch72_1c3_zoo_escape_sounds.js
node scripts/validate_read_my_verse_audio_patch70_2.js
```

These are **commands to run**, not evidence that they were executed for this documentation-only change. See [TESTING.md](TESTING.md) for broader checks and iPhone acceptance.

### Physical iOS scenarios

- Foreground/background return with active sound; successful recovery must resume *the same round*.
- Lock/unlock, route change (e.g. headphones), competing playback; none guarantees a failure and none should falsely be treated as success.
- Interrupt recording in Read My Verse / applicable Flashcards flow; no surprise mic restart.
- Use the hidden developer harness to test Stage 2 / Stage 3 / deferred / final failure; keep these distinct from genuine recovery.
- Background again while a Zoo Break is in progress, then return; preserve rescued pets and remaining state.
- Try with sound unavailable; catching pets and leaving must still work.

### Release gate

Review both the standalone shared harness flag and Feeding's separate hidden test path before public distribution. In the 2026-11-05 source, `welcome-back-zoo-escape.js` defines `ENABLE_ZOO_RETURN_TEST_HARNESS = true`. A development-branch push does not equal approval for public release.

## For a future PR changing audio

Before editing, read the current activity controller, coordinator, native bridge, and their validators; identify the exact **recovery verification boundary**. In the same PR, document any changed invariant here and update [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md), add relevant failure/deferred/exit regression tests, and state what still requires a physical iPhone. Never claim the native audio session is healthy based only on `AVAudioSession` metadata.
