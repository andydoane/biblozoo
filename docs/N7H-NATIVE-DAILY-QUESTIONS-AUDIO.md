# N7h — Daily Questions native-only answer and Sounds Like? audio

**Branch/target:** `experiment/native-daily-questions-audio` → **only** `experiment/native-ios-audio`, base merge `758d182232a80cf49de21f7885c1ca9360f78927` (N7g #76). Experiment bundle `com.andydoane.biblozoo.audiotest`, not stable `ios-prep` or `main`. **PR code and CI pending owner Mac Xcode/iPhone signoff; do not mark as an audible PASS.**

## Source-verified gap

September 28 `3e6b6a3` added the two answer sounds and October 17 `29dee43` improved browser audio mute/retry. The current `daily_questions.js` is identical in stable and experiment. Answer selection calls `new Audio("./verse_images/daily_questions/dq_correct.mp3")` or `dq_incorrect.mp3`; Sounds Like? creates `new Audio("./verse_audio/<published verse chunk>.mp3")`. N1 intentionally rejects *all* HTMLAudioElement playback on Audio Test iOS. Daily Questions catches rejected answer promises, causing silence. N1's inventory listed Daily Questions for later migration; N4 Feeding and N5 Learn do **not** mean the two answer clips migrated. Daily Question Verse Help Listen calls the existing `playVerseDetailListen` app route; that is already native Learn Listen in this experiment, but requires separate owner smoke testing.

## Implementation boundary

- **Original exact two MP3 effects; no invented tones:** Swift `BibloZooNativeSoundPlugin` accepts only `daily-question-correct` → `dq_correct.mp3` and `daily-question-incorrect` → `dq_incorrect.mp3` in the shipped Capacitor `public/verse_images/daily_questions` directory. Reuse existing predecoded `AVAudioEngine` PCM worker and `.soloAmbient` session policy; no new audio session coordinator, mixing/ducking, Web fallback, microphone, recording, file output, network or telemetry.
- **First direct answer tap owns activation:** New iOS-only `native-daily-questions-audio.js` calls `activateFromGesture({purpose:"daily-questions"})` *during* the answer click, stops only previous Daily Questions voices via scoped `stopEffect`, preloads the exact clip and plays only if the same answer/session is still current and native approval arrives promptly. Stale confirmations after leaving, mute, lock, held switcher, hidden or external audio are discarded. Never automatically retake session priority. A successful bridge `accepted` means scheduled native PCM, not proof of hearing.
- **Sounds Like? uses *native published verse audio*, not HTML:** The same original `playGeneratedQuestionAudio` progress/ended/retry UI routes through existing `BibloZooNativeReadOutputController.NativeAudio` for exact `./verse_audio/<published asset>.mp3`. Its Swift plugin validates actual bundled published assets and AVAudioPlayer end/position, with per-play IDs and stale result rejection from N7g. Start activation is invoked synchronously on the child's **Play Sound** click. An unavailable native bridge or invalid clip fails silent/closed; never creates Web audio in test iOS.
- **Verse Help:** existing `window.playVerseDetailListen` uses N5b.2 native reference/verse on Audio Test iOS, unchanged here. The Daily Question Listen/Close overlay remains the original owner. Test it on device.
- **Other platforms:** Original `Audio` answer and generated-audio playback are preserved on Web/PWA/Android and stable `ios-prep`; new facade is inert outside the exact native-only guard. No score, star peg, Daily To-Do eligibility, question generator, progress, Zoo stats or UI copy/animation changes.

## Automated gates

`node scripts/validate_native_daily_questions_audio_n7h.js` checks fixed MP3s, published-asset/bundle route, Swift allowlist/PCM/scoped stop, browser path isolation, native generated audio path, and VM-executes the real answer adapter with correct/incorrect taps, mute/Exit/held-switcher/hidden cancellation, late activation and refusal. It runs in experiment GitHub Actions along with previous N1–N7g native gates, Daily Questions generator/session/activity tests, Swift full-file grammar parses and production Web build. **Linux grammar parsing is not Apple SDK typecheck or iPhone speaker verification.** Report CI state only after checking final PR head.

## Owner physical iPhone gate AFTER review/merge

In the **separate** Audio Test GitHub Desktop worktree, **Pull Origin** and run:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build Xcode **App** onto a real iPhone as `com.andydoane.biblozoo.audiotest`. Keep original installed BibloZoo separate.

1. Open Daily Questions / Daily Zoo To-Do. **Correct answer:** actually HEAR original `dq_correct` once on first tap, see correct popup/star peg behavior unchanged. **Wrong answer:** actually HEAR `dq_incorrect`, see Nice try and no unearned star. Alternate across successive questions; answer-lock/Next never emits a second effect.
2. Test **global mute** (no output), unmute and tap a fresh question. Test rapid answer/Next and Back/Exit; no delayed old answer after leaving. Re-enter and answer after a deliberate new tap.
3. On an eligible generated **Sounds Like?** question, tap **Play Sound** and hear the actual published verse chunk, not silence or an effect. Verify the button resets on **real** end, Next/answer cancels prior clip, a failed native start exposes retry rather than leaving Playing… forever. Try a different published verse.
4. Open **Check the Verse → Listen** and hear native reference+verse, close the overlay during playback and confirm stop. The existing direct Learn Listen path is supposed to own this audio; report if it remains silent.
5. Hold the partial iOS App Switcher, background and lock during a question sound/verse chunk; return explicitly, confirm no ghost audio, no auto-resume or unexpected extra credit. Repeat with AirPods connect/disconnect, external AirPods Play or still-playing YouTube PiP/Apple Music. The test app must never auto-steal priority back on return.
6. Smoke-test Learn, Feeding and one previously accepted N6 game, and Read/Flashcards. No new mic permission, no changes to recording privacy/Wacky D4/C5, no Web sounds in Audio Test iOS, and no double Zoo/score.
7. Optionally compare original web/PWA Daily Questions audio to confirm the old Web behavior remains. Do **not** use the unchanged browser app as proof of native output.

**N7h owner Mac SDK compile/iPhone audio and integrated Bluetooth/PiP acceptance: PENDING.** After actual results, update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md` and `docs/AUDIO-RECOVERY.md` in the next PR. N7g #76 owner full hardware PASS remains independently pending; `ios-prep`/main and final N8/N9 decisions require explicit owner approval.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7g integrated gate](N7G-INTEGRATED-AUDIO-RELIABILITY-PRIVACY-GATE.md).
