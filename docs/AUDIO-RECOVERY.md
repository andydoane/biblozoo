# BibloZoo — Audio Recovery Contract

> **Safety-critical reference.** Read current code before changing recovery. This document summarizes the contract observed on `ios-prep` on 2026-11-05; source and the owner's latest iPhone results take precedence.

See [Living Project Handoff](PROJECT-HANDOFF.md) and [Testing](TESTING.md).

## What must stay true

1. **The activity owns the recovery decision.** `verse_games/shared/welcome-back.js` provides presentation. `welcome-back-return.js` and `welcome-back-zoo-escape.js` orchestrate the return experience, but do not substitute a visual success or effect sound for an activity's verified audio readiness.
2. **Check the real Web Audio clock.** A successful `AudioContext.resume()`, a successful native activation, or a synthetic UI sound alone does **not** prove sound was restored. The relevant activity must test an advancing `AudioContext.currentTime` / its established audio-clock checks and preserve its own state transitions.
3. **Pending native interruption is not failure.** A deferred result during an active iOS interruption must leave the same LOCK GATE/retry available; don't advance Zoo Escape solely because native audio remains pending.
4. **Native audio policy must be preserved.** The existing iOS Solo Ambient session policy (`AVAudioSessionCategorySoloAmbient` / Swift equivalent) and native bridge are deliberate. Never casually change native session category, activation timing, or diagnostic semantics. `ios/App/App/AppDelegate.swift` contains native audio session diagnostics/recovery implementation; verify current files before edits.
5. **The native fallback is bounded and conditional.** `verse_games/shared/native-audio-recovery.js` only calls the native recovery bridge for supported iOS foreground conditions after a real stalled clock; its activation result does not confirm audio recovery. Never automatically retry indefinitely or invoke native activation on browser/PWA paths.
6. **Optional sounds are optional.** Zoo Escape pop/bounce effects can use an existing activity audio context only when available/healthy. They must not create or resume a second context, force native audio activation, award credit, or block a child from playing silently.
7. **Preserve state on interruption.** Don't lose verse, score, timers, selected Feeding Tilt/Drag mode, recording state, or rescued pets when backgrounding and returning. Welcome Back should not appear on screens that intentionally omit it.
8. **Safe exits and credit.** Failed terminal recovery leads to the proper home/title destination with activity-specific cleanup; no endless retry. Developer simulations may exercise stages but cannot award genuine rescue statistics, completed Zoo Breaks, or daily rewards. A stopped break only counts after all pets are rescued **and** the final LOCK GATE passes real recovery verification.
9. **Respect accessibility.** Rescues must remain usable by selecting a pet then its pen, with Reduce Motion and screen-reader alternatives as implemented.

## Relevant code

- `verse_games/shared/welcome-back.js`, `welcome-back.css`: shared popup identity, presentation, button states.
- `verse_games/shared/welcome-back-zoo-escape.js`: stage state, animation, rescue, optional sounds, retries.
- `verse_games/shared/welcome-back-return.js`: shared app-return lifecycle and owner callbacks.
- `verse_games/shared/welcome-back-clock.js`: return clock handling.
- `verse_games/shared/audio-recovery-coordinator.js`, `native-audio-recovery.js`, `audio-diagnostics.js`: coordination, native fallback and diagnostics.
- `daily_questions_feed_game.js`: Feeding-owned audio, four game modes, Zoo Escape hooks.
- `app.js`, `read_my_verse.js`, `flashcards/`, `verse_games/*/game.js`, `verse_playground/*/game.js`: other activity-owned verification.
- `ios/App/App/AppDelegate.swift`: native audio observation and recovery code.

## Change/test protocol

- Identify the exact owning activity and its **verified** success condition before editing a shared module.
- Add tests for success, failure, deferred/native-pending, unavailable/stalled/suspended audio, second app switch during rescue, terminal exit, and cleanup where relevant.
- Run existing audio-related tests; useful examples are `scripts/validate_audio_clock_recovery_patch56.js`, `validate_audio_recovery_coordinator_patch60.js`, `validate_native_audio_recovery_patch59.js`, `validate_patch72_1b_feeding_zoo_escape.js`, `validate_patch72_1c_whole_app_zoo_escape.js`, and `validate_patch72_1c3_zoo_escape_sounds.js`.
- Verify the iPhone lifecycle (task switch, lock/unlock, audio route changes, real recording) on hardware. Simulated tests are **not** substitutes for actual iOS interruptions.
- Explicitly report unverified physical-device behavior in the PR. Avoid changing Swift audio-session code as incidental cleanup.
