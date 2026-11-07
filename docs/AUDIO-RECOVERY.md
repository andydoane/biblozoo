# BibloZoo — Audio Recovery and Zoo Escape Contract

> **Read with** [the living handoff](PROJECT-HANDOFF.md). This describes the safety boundaries of the current `ios-prep` implementation as checked on 2026-11-05 (base `1e1deb2`). **Source and current tests are authoritative.** On the focused Learn recovery PR (`fix/learn-narration-recovery-gate`), narration itself—not app UI effects—is the required playback source for Learn's recovery success. Do not replace the activity-owned recovery path with a global approximation.

## Why this subsystem exists

iOS / WKWebView app switches and interruptions may leave Web Audio playback stalled even when a JavaScript object says its `AudioContext` is running. BibloZoo must distinguish genuinely advancing audio from merely available or resumed APIs. A failed recovery can trigger the child-friendly Zoo Escape minigame without changing the underlying activity's audio truth.

The shared recovery UI is **not** an audio engine. It must remain fully playable without sound.

## Important source files

- **Native diagnostics:** `ios/App/App/AppDelegate.swift` (read-only `BibloZooAudioSessionDiagnostics` plugin).
- **Native bounded recovery experiment / signal state:** `ios/App/App/SceneDelegate.swift` (`BibloZooAudioSessionRecovery` plugin).
- **Separate native *output-only* PR B smoke pilot (experiment branch):** `ios/App/App/BibloZooNativeSoundPlugin.swift`, registered in `SceneDelegate.swift`, with a single explicitly packaged `ui_audio/ui_pet_unlock.mp3` test asset and `verse_games/shared/native-sound-smoke-test.js` developer-only tap UI. This has **no call path** from Feeding, Learn, game audio or the activity recovery coordinator.
- **Shared JS/native adapters:** `verse_games/shared/native-audio-recovery.js`, `audio-recovery-coordinator.js`, `welcome-back-clock.js`, `audio-diagnostics.js`.
- **Shared UI and standalone bridge:** `verse_games/shared/welcome-back.js`, `welcome-back.css`, `welcome-back-return.js`, `welcome-back-zoo-escape.js`, `bridge.js`.
- **Activity owners:** `app.js` (Learn/app), `daily_questions_feed_game.js` (Feeding), `read_my_verse.js`, `flashcards/`, individual `verse_games/` and `verse_playground/` controllers.

## Non-negotiable behavior

1. **Only a real recovery probe can establish success.** A successful note, a resumed `AudioContext` state, a native diagnostic snapshot, a tap, animation completion, or a simulated developer result is not sufficient. The owner checks that its actual audio/playback clock advances.
2. **No automatic native activation from foreground or decorative sounds.** The bounded native path is considered only after observed stalled Web Audio, through the existing guarded coordinator. Do not create/resume/replace a context just to play Zoo Escape sounds.
3. **Preserve the existing native category and interruption policy.** The app intentionally retains **`AVAudioSessionCategorySoloAmbient`**; do not change category, mode, or audio-session handling without a deliberate, device-tested design review. Native diagnostics must remain observational; the existing bounded reactivation must not be expanded into a generic auto-recovery loop.
4. **Keep a pending interruption distinct from a failed attempt.** If the native signal still says interruption began / recovery deferred, preserve the current LOCK GATE stage and allow another deliberate attempt. Never escalate Zoo Escape just because iOS has not finished the interruption.
5. **Activity-owned callbacks.** The shared Welcome Back/Zoo Escape controller may display stages and request a recovery, but the owner still pauses physics/audio, checks its own playback, resumes on verified success, and cleans up or navigates on exit. In Verse Launch, local Game Menu, Help and Speed Menu pauses share one pause-aware activity clock with task-switch handling: closing a menu must not resume clock time while Welcome Back still owns the pause, or advance the conveyor/bonus timer behind overlays. This local menu behavior does **not** change the audio recovery gate.
6. **Real gesture and bounded deadlines.** On LOCK GATE, the activity-owned recovery callback must run in the real user gesture; avoid introducing deferred synthetic clicks that break iOS unlock behavior. Timeouts and stale-generation guards prevent loops or delayed state changes after exit.
7. **Respect quiet or microphone activities.** A quiet Daily return may be acknowledgement-only; do not invent an audio test. Learn's Listen/Chunks/Echo recovery must verify advancement of its actual HTML narration position; an independent app UI Web Audio failure must not veto narration. A fulfilled `HTMLMediaElement.play()` alone is insufficient. Flashcards / Read My Verse must never spontaneously begin recording or overwrite a partially completed take.
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
node scripts/validate_learn_narration_recovery_gate.js
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

## Experimental AVFoundation output smoke test (PR B)

On the separate `experiment/native-ios-audio` branch only, PR B proposes a user-tapped `BibloZooNativeSound` `AVAudioPlayer` test. It does not attempt Web Audio recovery, set session category/mode/active state, replace a narration clock, create a UI-audio success gate, or automatically resume. Swift requires foreground + the existing `.soloAmbient` category, accepts only `pilot-unlock`, rejects invalid/nonfinite volume, and stops/forgets playback on inactivity, interruptions, route changes or media resets. The JS test button times out rather than waiting forever, cancels stale playback on background and never runs in browsers/PWA.

A successful `preload` or `play` bridge result means the native request was prepared/accepted, **not** that sound reached the speaker. The owner reports the PR #10 sample was audible on a physical iPhone across tried conditions, **but** the panel sometimes reported `interruption-pending`; a blocked preload cannot invoke the same tap's `play`. The B.1 follow-up addresses a stale-state hazard without claiming to reproduce the precise source of those sounds. Apple documents delayed `interruptionWasSuspended` notifications after process suspension ([AVAudioSession interruption notification](https://developer.apple.com/documentation/avfaudio/avaudiosession/interruptionnotification)): the pilot now recognizes genuine `.began`/`.ended`, ignores unknown types and suspended-history `.began` as **new** pending interruptions, and only allows a **fresh human-tapped retry** of a genuine prior `.began` after the app has actually left and returned to foreground. No automatic restart or `setActive` is introduced. This relaxation is **strictly within the isolated output smoke plugin**; it must not be copied into the activity-owned recovery success gate. Re-test the Swift notifications and audible tap behavior on the physical iPhone, as described in [TESTING.md](TESTING.md) and §10 of the [living roadmap](PROJECT-HANDOFF.md). **Do not promote the AVAudioPlayer bridge response to the shared Welcome Back or Zoo Escape audio-success gate**; those activity-owned contracts are unchanged, and Feeding PR C remains blocked until B.1 is cleared.

### Stage B.2: distinguish Web Audio tap feedback from AVAudioPlayer

The owner's refined device report after [PR #11](https://github.com/andydoane/biblozoo/pull/11) identifies **two distinct effects**: BibloZoo's existing `ui_sound_pop_1/2.mp3` from a capture-phase global tap handler **on every press**, and the experimental native `ui_pet_unlock.mp3` **only on the first tap per foreground interval (sometimes not even then)**. The next tap reports native `interruption-pending`; switching out and back permits one more accepted native sound. **Stage B has not met consecutive-tap acceptance; Stage C Feeding must not begin.** The pop is not evidence of native health.

The controlled B.2 follow-up makes the DEV panel opt out of the global tap feedback using **existing `data-no-ui-sound` support**, leaving all real BibloZoo buttons unchanged. Its separate `getDebugState()` Capacitor method and **Inspect native state** UI return read-only, transient, bounded **interruption began/ended/suspended counts, route count, last reason code/age and pending flag**. No automatic audio request occurs on inspection; no category/activation changes or user-content logging. Collect before/after the first native tap, a second consecutive tap, and task-switch return. If pending persists, these observations narrow the next hypothesis but cannot establish causation by themselves. **Never substitute a debug count or `AVAudioPlayer.play() = true` for human-audible playback evidence, and never bypass real interruption signals to advance a game.**

## For a future PR changing audio

Before editing, read the current activity controller, coordinator, native bridge, and their validators; identify the exact **recovery verification boundary**. In the same PR, document any changed invariant here and update [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md), add relevant failure/deferred/exit regression tests, and state what still requires a physical iPhone. Never claim the native audio session is healthy based only on `AVAudioSession` metadata.
