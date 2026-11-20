# N7d.1 — Flashcards explicit Record / Play takes foreground audio priority

**Status:** Isolated experimental native-iOS follow-up PR, **not yet owner-tested on hardware**. Target `experiment/native-ios-audio` only; never `ios-prep` or `main`. Do not claim full N7d acceptance until owner confirms this exact Apple Music/AirPods scenario on a physical iPhone. This PR changes native session gates and source tests, not child gameplay, original Web/PWA/Android, Wacky presets or stable BibloZoo.

## Owner evidence from merged N7d #68

Owner merged [N7d #68](https://github.com/andydoane/biblozoo/pull/68) into the isolated experiment at `055e717845774eb7ce87f4b00d651f556899534d`, built and tested on an actual iPhone. **Owner reports all tested N7d meter/normal replay behavior is as intended except this reproducible competing-audio gap**:

1. During Flashcards native capture, press Play on AirPods. Apple Music starts an MP3, stops/cancels BibloZoo recording, and continues playing. **That interruption is correct and must remain.**
2. With Apple Music *still playing*, tap **Record** inside BibloZoo. Instead of interrupting the music and starting the original 3→2→1 flow, the app shows a **Continue without recording / microphone unavailable** fallback.
3. With a previously completed RAM take and Apple Music *still playing*, tap **Play My Recording**. Instead of pausing Apple Music and playing the real take, BibloZoo says **Playback couldn't start…**.

The regression is source-traceable: N7c `prepareCapture` and N7d `playCapture` both rejected `AVAudioSession.isOtherAudioPlaying` *before* any deliberate `setActive(true)` attempt. N7d also rejected other audio again after an asynchronous off-main RAM PCM copy. `isOtherAudioPlaying` is an observation, not proof the OS would refuse the requested nonmixing session.

The accepted precedent is [N6h.2 #49](https://github.com/andydoane/biblozoo/pull/49): normal Home/game `activateFromGesture` can request `.soloAmbient` priority on a **real child tap** with PiP still playing, while hot/preload/background methods never seize other apps' sound. Flashcards should have the same deliberate gesture boundary, even though microphone capture temporarily uses `.playAndRecord/.measurement/.defaultToSpeaker` instead of `.soloAmbient`.

## N7d.1 source changes

- In existing compiled `ios/App/App/SceneDelegate.swift`, `BibloZooMicSessionProbePlugin.prepareCapture` **preserves** exact test-bundle, foreground, granted permission, existing `.soloAmbient` starting category, no DEV probe/active mic/playback and output-worker idle barriers. It **no longer denies** an explicit Record request just because music is playing; it attempts the same temporary nonmixing `.playAndRecord/.measurement/.defaultToSpeaker` and `setActive(true)`. A high-priority phone call or genuine iOS denial still fails without recording, and iOS alone decides takeover.
- **Important denial rollback correction:** mark the temporary capture-session snapshot prepared **before** attempting `setCategory/setActive`. Previously, when activation threw, `stopCaptureInternal` returned immediately because `capturePrepared` was still false, potentially leaving a saved snapshot/altered category and trapping future taps. Now it runs real cleanup, deactivates, restores previous category/mode/options, and returns only error domain/code metadata, not voice content. The UI continues to show its existing non-recording fallback for genuine failures.
- `playCapture` retains explicit foreground, exact opaque take ID, stopped microphone, current generation, player exclusivity and restored `.soloAmbient`. Both initial and asynchronous `isOtherAudioPlaying` vetoes are removed; the real Play tap requests `setActive(true)` before starting `AVAudioEngine + AVAudioPlayerNode`. If OS activation fails, native `started:false` and existing Retry / Continue Without Listening remain; **only `.dataPlayedBack` marks full listened-to completion**, never bridge acceptance.
- The route-change observer now checks actual Flashcards capture and playback even when the unrelated N7b DEV probe is inactive. The existing bounded setup/first-play settling guards, real AirPods route interruption, task switch/lock cancellation and no automatic foreground resume remain.
- No `.mixWithOthers`, `.duckOthers`, new audio session, WebAudio/HTML fallback, file, cloud/raw JS PCM, autoplay, microphone monitor, child grade/verse score/Zoo change, or alteration to the accepted 12 standalone + 5 Playground games. Original Wacky native effects remain intentionally absent until N7e.

## Owner physical iPhone acceptance checklist

Work in the dedicated **BibloZoo Audio Test** GitHub Desktop worktree and pull the owner's merged experiment branch. From the repo root:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode select the **App** scheme for a real iPhone; confirm `com.andydoane.biblozoo.audiotest` and a successful **full Apple SDK compile**. Do not install this test app as the original production bundle.

1. **Apple Music takes over BibloZoo (preserve known PASS).** Start real Flashcards Record→painted 3→2→1→active recording and speak. Press Play on AirPods to start Apple Music MP3. BibloZoo must stop the microphone, show interrupted status and never retain a fabricated ready take, auto-record, grade, or penalize Zoo; Apple Music should continue.
2. **BibloZoo takes over Apple Music on Record (NEW).** With MP3 still audible, return to Flashcards and deliberately tap **Record**. Apple Music should yield if iOS grants this nonmixing session, the existing full 3→2→1 should paint, then the real mic and 16-bar meter should start. Speak a phrase, Stop, and confirm a ready ephemeral take. Do not accept a microphone-unavailable popup solely because another app was playing music.
3. **BibloZoo takes over Apple Music on Play (NEW).** Record/Stop a distinct phrase. Start an Apple Music MP3 again while leaving the completed take available. Deliberately tap **Play My Recording**. Apple Music should yield if iOS grants the `.soloAmbient` session. Hear the exact voice, not mixed music; Next unlocks only *after* the last actual sample/end event. Tap Stop Playback early on a longer phrase: no false completion; replay must restart from the beginning on a new tap.
4. **AirPods routes.** Repeat with AirPods connected and also iPhone speaker when practical. Unplug/disconnect AirPods while actually capturing or playing: route loss should cancel the active operation, not auto-start it later; completed RAM take may be replayed on a fresh tap. Pay attention to AirPods microphone routing, potential audio-profile change and any false route cancellation during the 3-second countdown; report exact observations rather than assuming all Bluetooth routes work.
5. **Apple's genuine OS denial.** A real high-priority session can refuse activation. BibloZoo must not fake recording/playback or leave the audio session stuck. Once competing audio is ended, a **fresh** Record/Play should work. Do not initiate a real phone call just to test this; report if a naturally occurring failure happens, including Xcode error domain/code or UI state. Recording should not remain active after any failed preparation.
6. **Regression checks.** Hold App Switcher/lock during countdown, recording and playback; no automatic mic/voice restart on return. Test normal native game or DEV star/chomp after stopping recording; original category must be restored. Verify source N6 12/12 standalone and Playground 5/5 remains untouched, and Web/PWA/Android baseline still works. Wacky is still pending N7e.

If iOS does not pause Apple Music, record which tap failed, whether it was while **recording** or **playing a saved take**, whether AirPods or speaker were selected, the on-screen message and any Mac Xcode console `AVAudioSession` error. Do not submit voice recordings. A true iOS priority denial should remain retryable rather than forcing a fake PASS.

## Regression and acceptance gates

- New `node scripts/validate_native_n7d1_flashcards_audio_takeover.js`: bounded static checks on actual Swift methods and route observer plus actual original/native recorder JavaScript VM for successful explicit Record+Play while another source is present, denied activation, real playback end and no passive mic.
- Updated N7d source contract validation (old static "never seize other audio" assumption removed), all existing N7c/N7b/N6 regressions and original Web build.
- GitHub Actions runs full Node suite and `swiftc -frontend -parse` on BOTH compiled Swift files. Linux syntax parsing is **not** Apple iOS SDK type-check/linking, Apple Music interruption arbitration or physical iPhone audible validation.
- Merge and real-device acceptance remain strictly **owner-controlled**. After owner evidence, the **next PR** must update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and its own guide before declaring N7d complete or beginning N7e.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7d original physical test guide](N7D-FLASHCARDS-NATIVE-METER-REPLAY.md).
