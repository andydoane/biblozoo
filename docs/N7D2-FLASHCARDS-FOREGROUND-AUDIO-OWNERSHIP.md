# N7d.2 — Flashcards keeps foreground audio ownership after intentional Record/Play

**Status: isolated experimental native-iOS PR, owner physical-iPhone test PENDING.** Target only `experiment/native-ios-audio` / separate `com.andydoane.biblozoo.audiotest`, not the original `ios-prep`, main, installed stable BibloZoo or Web/PWA/Android. N7d.2 is the follow-up to merged [N7d.1 #69](https://github.com/andydoane/biblozoo/pull/69), at `140e9eb3c7205c9f1162deb0f70483f91a9f905b`.

## Owner's latest physical iPhone report after N7d.1

- **Partial PASS:** When Apple Music MP3 is already playing, tapping **Play My Recording** in BibloZoo now interrupts it and *plays the correct saved voice*.
- **FAIL on Record:** With music playing, tapping **Record** now briefly pauses Apple Music but BibloZoo displays **Recording is interrupted…** and the MP3 resumes. The expected fresh Record gesture should hold priority through the original 3→2→1 countdown and live microphone capture.
- **FAIL on ownership after output:** When the saved voice finishes playing, Apple Music resumes without another explicit action in Apple Music/AirPods. Owner wants a BibloZoo interaction to **take over and keep priority** as existing games do with YouTube PiP, until the user genuinely acts in the competing app or otherwise leaves/interrupts BibloZoo.
- Earlier accepted direction remains: **pressing Play on AirPods during a *live* BibloZoo recording** should interrupt and cancel that recording while Apple Music continues. No auto-capture/replay on return.

Do **not** mark N7d or N7d.1 end-to-end Apple Music/AirPods PASS yet, even though #69 code and CI were green. N7d original 16-bar meter and normal dry voice replay otherwise worked in owner's tests. N6 12/12 standalone games and Playground 5/5 remain previous owner PASS.

## Why this happens in actual merged source

1. The N7c microphone plugin registers a common observer for UIApplication inactivity **and** `AVAudioSession.interruptionNotification`, but previously **never checks** `AVAudioSessionInterruptionTypeKey`. In particular, iOS can report `.ended` separately from `.began` after changing who owns audio; an `.ended` event must NOT cancel the newly initiated capture. [Apple interruption handling](https://developer.apple.com/documentation/avfaudio/handling-audio-interruptions).
2. N7d.1 correctly removed a top-level DEV-probe-only route guard but then treated nearly any route notification more than **0.5 seconds** after preparation as loss. Switching an AirPods audio category/profile from A2DP playback to input-capable `.playAndRecord` can emit its own category/route-configuration notification; this is not necessarily a device disconnect. The source previously did not inspect `AVAudioSessionRouteChangeReasonKey`. [Apple route reasons](https://developer.apple.com/documentation/avfaudio/avaudiosession/routechangereason).
3. `stopCaptureInternal` and `stopPlaybackInternal` each called `setActive(false, options: [.notifyOthersOnDeactivation])`, including normal **Stop**, **Stop Playback** and full native `.dataPlayedBack` completion. That expressly lets previously interrupted Apple Music/PiP re-activate; it conflicts with user's newly clarified “BibloZoo keeps audio priority after a genuine tap” contract. [Apple deactivation notification](https://developer.apple.com/documentation/avfaudio/avaudiosession/setactiveoptions/notifyothersondeactivation).

The exact source event that cancelled the owner's Record tap was not captured from Xcode, so N7d.2 addresses **both** over-broad cancellation paths rather than assigning a definitive hardware cause without evidence.

## Narrow native changes and safety

- **New interruption `.began` only:** Separately observe Apple `interruptionNotification` and check its type. A real **begin** still stops an active mic, cancels incomplete RAM voice, stops player and releases foreground priority. A corresponding **ended** does not pretend to be a *new* interruption and cannot restart anything.
- **Route reasons:** Treat `.categoryChange`, `.override`, `.routeConfigurationChange` and unrecognized policy/config notices as non-cancellation for this N7 capture/playback bridge. A real device loss, new device or no suitable route remains relevant; during the painted countdown, allow normal mic-route setup and require a fresh `beginCapture` input-format check. While actively recording or playing, an actual relevant route change cancels the active activity. App inactivity/media reset still cancels unconditionally. This is a focused AirPods stabilization, **not** final Bluetooth reliability signoff (N7g).
- **Keep a foreground audio claim:** A genuine `prepareCapture` or `playCapture` `setActive(true)` success records that Flashcards owns native audio priority. After normal explicit **Stop** or capture timeout, stop the input engine and restore the prior `.soloAmbient` category **while keeping the nonmixing session active**. On normal **Play My Recording** ended event or manual **Stop Playback**, stop just the temporary PCM player while keeping the session active; **do not** send `.notifyOthersOnDeactivation`. This prevents automatically offering control back to Apple Music merely because a child finished one recorded voice clip.
- **Relinquish intentionally:** Background/held App Switcher, actual Apple interruption **began**, real route failure, or setup failure releases Flashcards priority **without** an opt-in resume notification to other audio. A new physical **AirPods Play** or Apple Music Play may claim priority normally via iOS, and BibloZoo must never fight it or auto-replay. No infinite audio-loop or background AVAudioSession lock.
- **Honor existing owner boundaries:** One nonmixing native AVAudioSession, temporary `.playAndRecord/.measurement/.defaultToSpeaker` only during real mic use, `.soloAmbient` for playback, serial worker-drain before input, one bounded opaque RAM take, `AVAudioPlayerNode.dataPlayedBack` for true completion. No Web/HTML fallback, file, upload, raw JS PCM, new session category, microphone self-monitor, modified Web/PWA/Android source, original verse/grade/Zoo/score, 12 games, 5 Playground or accepted Verse Jam music. Native Wacky remains N7e, Read My Verse N7f, full Bluetooth/PiP/privacy N7g.

## Owner physical iPhone acceptance — after merge, **not** CI

GitHub Desktop dedicated experiment worktree → **Pull origin** → from repository root:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build the Xcode **App** scheme on a real iPhone, confirm `com.andydoane.biblozoo.audiotest` (not the stable original app). Linux GitHub Actions syntax parses Swift but **cannot typecheck Apple UIKit/AVFAudio/Capacitor**, or reproduce AirPods arbitration.

1. **Record takes over and holds:** Start Apple Music MP3 and let it play audibly on AirPods. Open Flashcards and tap **Record**. MP3 must pause, **original fully painted 3→2→1** must run, then actual mic/moving 16 bars. Speak a recognizable phrase, tap Stop. No spurious `Recording is interrupted`; comparison should have a positive RAM take.
2. **Music stays paused after Stop:** After Stop and comparison, listen carefully: **Apple Music must remain paused**, even when no voice is playing and before Play My Recording. It should not automatically resume when the recording session returns to `.soloAmbient`.
3. **Replay takes over and stays:** Start MP3 again with Apple Music/AirPods Play (fresh external intent). Tap **Play My Recording**; MP3 yields and exact voice sounds. When voice finishes, Next unlocks on actual end, **Apple Music must stay paused** until its own user Play. Repeat with an early **Stop Playback**: sound stops without fake listened-to completion, MP3 still paused, a fresh Play restarts the same voice.
4. **External Play still wins:** During a new **active** BibloZoo recording, press AirPods **Play** to start music. BibloZoo stops mic, shows interrupted/try-again without an invented ready take, and **Apple Music keeps playing**. It should never reclaim audio on foreground/Welcome Back. Repeat while voice playback is running: external music should take priority and stop that playback without auto-replay.
5. **Routes and app lifecycle:** With AirPods attached, separately unplug/disconnect while actually recording and playing; real route change safely stops activity. Repeat on iPhone speaker. Held App Switcher or lock during countdown, capture and replay still cancels appropriately; no spontaneous mic/voice restart. Changing the audio category during Record setup alone should **not** trigger interruption dialogue. If one appears, note whether during 3→2→1 or after "Recording" began and capture exact on-screen reason.
6. **Cross-activity and failure:** Exit/re-record frees temporary voice RAM; after an ordinary recording, fresh DEV star/chomp or normal game tap still works. Genuine iOS high-priority call denial must not be bypassed, create fake next/grade or leave session in `.playAndRecord`. No double rewards, Zoo surprise or broken profile progress. Original browser/Android unaffected. Wacky deliberately missing until N7e.

**Please report:** Did Record finish its 3→2→1 without interruption? Did Apple Music remain paused after **both** Stop Recording and end of Play My Recording? Does a fresh AirPods Play still interrupt BibloZoo? Any accidental AirPods route-change cancellation, Xcode compiler errors or failure state? No voice file or audio recording needed. Physical owner PASS of these is required before closing N7d and proceeding to N7e.

## Automated source/regression gate

`node scripts/validate_native_n7d2_flashcards_foreground_audio_ownership.js` checks distinct `.began` vs `.ended` handling, reason-aware route guard, no normal playback/capture deactivation, explicit foreground priority ownership/release, original voice RAM/Next end event and JS interrupted capture behavior. Update N7d.1 route static check, retain all earlier N1–N7d suites, run both full Swift syntax parses plus Production Web build on final PR HEAD. **No green CI is a substitute for Xcode SDK and human iPhone AirPods confirmation.** Owner alone merges to experiment; next PR updates handoff for actual merge SHA/device outcome.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7d.1](N7D1-FLASHCARDS-EXPLICIT-AUDIO-TAKEOVER.md).
