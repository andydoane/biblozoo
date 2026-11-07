# N3b — Native Classic Peg Notes, Bounded Voices, and Resume Label

> Experimental `BibloZoo Audio Test` only; [PR #25](https://github.com/andydoane/biblozoo/pull/25) targets `experiment/native-ios-audio` after **merged N3a [PR #24](https://github.com/andydoane/biblozoo/pull/24)** at `d49919bc`. Original/stable `ios-prep`, Web/PWA, Android, Zookeeper profiles/rewards, and microphone data are not changed. Source/CI does **not** prove Swift compilation or actual iPhone sound.

## Why N3b

On November 7 the owner tested merged N3a on a physical iPhone and pasted a native timing report: **13 real Feeding events** (2 stars and 11 chomps) were all scheduled on `backend=avengine-pcm`, with **0** events at or above 120 ms collision→native dispatch and **1–5 ms** for each. Each event had **0 ms worker queue wait** and a **0–1 ms PCM scheduling call**. This is a substantial measured improvement from the prior N2.2 `AVAudioPlayer.play()` delays (13/27 events slow, many ~400–750 ms). The owner said perceived sound timing was much better and playback seemed undelayed or noticeably less delayed; this is listening evidence, **not** a microphone/actual speaker-onset measurement. The DEV native `pilot-unlock` control still exhibited 873 ms on its first `AVAudioPlayer.play()`, 31 ms on a subsequent call. The owner **switched to a Facebook video and back** and reported that tapping the visible Feeding button resumed the game **with native sound**. Its label briefly flickered **“Try again!”** before successful continuation. This confirms a real positive Resume experience, though not a 50-cycle reliability matrix. Code review traced the label to `setFeedingResumeStatus()`: it sent `retry: !!message` to the shared Welcome Back control while `feedResumePending=true`, mistaking the informative “Preparing native sounds…” message for an error.

Classic peg collision tones were intentionally still silent on native-only iOS through N3a, as the original Web oscillator had been blocked by N1.

## Native peg design and overlap limits

- The original Classic peg pitch scale, `[523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]` Hz, and 55 ms per-tone minimum gap remain **unchanged**. The Web/PWA/Android Classic oscillator remains intact. The Native-only Classic `playPegTone()` selects the same randomized pitch (avoiding immediate repeats) and calls the existing allowlisted Capacitor bridge: `play({soundId:"feed-peg",noteIndex:0…5,volume:feedingSoundVolume(0.20),collisionEpochMs,eventId,...})`. No raw frequency or filename is user-controlled and no Web oscillator/HTML playback is created in Native-only mode. Other Native Feeding modes still don't adopt peg notes automatically.
- On real `Got It!` or **explicit Resume** `BibloZooFeedingNativeAudioPilot.prepare()` first activates the existing Swift session as needed, then preloads fixed star MP3, chomp MP3, and the third **generated** `feed-peg` tone resource. Swift generates six bounded, 105 ms **mono PCM buffers** at 44.1 kHz from sine waves with an 8 ms attack and end fade. It does so in the native serial worker **before gameplay**, not on each collision. The native `AVAudioEngine` stays warm, with **four prestarted `AVAudioPlayerNode` peg voices** and two prestarted nodes **per star/chomp sample**; all nodes start with no audible buffer queued.
- Each collision only selects the next prewarmed voice, sets its volume and schedules the matching existing PCM buffer with `.interrupts`. Separate voices may overlap until the bounded pool wraps; reusing a voice may interrupt its earlier sound. There is no unbounded node allocation, MP3 decode, engine.start(), AVAudioPlayer.play(), microphone work or audio-session activation on the collision hot path. Peg rows have `backend=avengine-tone`, star/chomp `avengine-pcm`; native `pilot-unlock` remains the AVAudioPlayer comparison sample.
- The existing in-memory last-80-event report, `Copy Audio Timing Report` and optional late-chomp marker remain local and manually shared. The `worker call` metric measures native buffer *scheduling*, **not actual sound reaching the speaker**. A `scheduled` response cannot establish audible success; the owner must listen.

## Resume label correction

During an explicit Native-only Resume attempt, `feedResumePending=true` indicates preparation. The shared Welcome Back action is disabled and keeps **“Let's go!”** while the status separately says **“Preparing native sounds…”**. When a native prepare actually fails and pending is cleared, the overlay remains and the action becomes **“Try again!”**, with reason text, a new tap retry and working Back. After successful prep, the original frozen round resumes; the overlay disappears. Web/Zoo Escape retains its existing retry semantics. No fake session activation, automatic resume or Web fallback is added.

## Owner's physical iPhone test after PR #25 merge

In the dedicated `biblozoo-native-audio` worktree, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_pcm_effects_n3a.js
node scripts/validate_native_peg_voices_n3b.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a **physical iPhone**. Preserve installed stable BibloZoo. Xcode compile and human hearing are distinct from Linux Node CI.

1. **Classic peg notes:** Daily To-Do Preview → Feeding Game Tester → Classic → Got It!. Listen for short, gentle musical beeps when snacks/balls hit regular pegs, in addition to the already-working star and chomp MP3s. Are they pleasant or too loud/quiet? With rapid hits, do notes overlap naturally without popping or sticking? Actual audible output is required; the bridge may return `scheduled` when silent.
2. **Performance:** During two rounds with rapid collisions, check balls still animate smoothly and the chomp/star timing remains near-immediate, with no missing or cut-off effects. Pegs are capped at one note every 55 ms; pool overlap is finite. If something feels delayed, tap DEV **Copy Audio Timing Report** after the game and paste here; expect `feed-peg` rows with `avengine-tone` plus `feed-chomp`/`feed-star` `avengine-pcm`.
3. **Resume label:** Switch away during an unfinished Classic round (e.g., briefly watch a video), return, tap the existing **Let's go! / Resume** control. It should stay labeled **Let's go!** during a momentary preparation (no misleading “Try again!” flicker), then dismiss and continue the **same round and score** with functioning effects. Back should still work. A genuine native failure must show the correct Retry UI, not silently advance or replay.
4. **Safety:** No Web tap/peg sounds in native-only iOS, no auto-play on app switching, no duplicate rewards, no microphone prompt, and no affected original/stable app. Other native Feeding modes' missing audio and native Melody are later migrations, not silently included in this Classic-only slice.

**Gate / next roadmap:** If Swift Xcode build, actual peg/star/chomp sound, pleasant bounded overlap, smooth animation, same-round Resume and label pass, record the results in the next handoff. Then consider remaining N3 Melody-tone/voice improvements and N4 other Feeding modes. Independent random Zoo Escape/ZOO BREAK fun remains N8. A failed prepare must remain retryable with Back and native-only silence; **never restore Web Audio fallback**.
