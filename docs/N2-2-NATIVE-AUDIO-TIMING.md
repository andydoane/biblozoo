# N2.2 — Capture Native Feeding Sound Latency Without Screenshots

> **N3a update (PR #24):** The original N2.2 report's `worker play()` column measured `AVAudioPlayer.play()` for all effects. N3a now uses **predecoded `AVAudioEngine` PCM scheduling** for star/chomp and retains native AVAudioPlayer only for pet unlock. The same copyable 80-event report now labels `worker call` and adds a final `backend` column (`avengine-pcm` or `avfoundation-player`). For PCM effects, dispatch means `AVAudioPlayerNode.scheduleBuffer()` returned, **not that the speaker produced sound**. The original N2.2 owner reports are historical and must not be compared as if the method measured were identical. See [N3a technical guide](N3-NATIVE-PCM-EFFECTS.md).

> **Experimental `.audiotest` iOS app only.** [PR #23](https://github.com/andydoane/biblozoo/pull/23) targets `experiment/native-ios-audio` after merged [PR #22](https://github.com/andydoane/biblozoo/pull/22) (`07e91e3`). No stable iOS `ios-prep`, Web/PWA, Android or recording changes. See [living handoff §§9–10](PROJECT-HANDOFF.md) and [TESTING.md](TESTING.md).

## Why we added this

The owner reported **real native star and chomp MP3s playing on every event** in Classic Feeding after N2.1, with **no more visible one-second gameplay hitches**. However, a pet-snack collision sometimes makes the chomp sound almost immediately and sometimes noticeably later. Taking a screenshot during a fast-moving game is impractical. The exact cause of the delay, its distribution, and the timing of actual speaker audibility are **unknown**. The owner has not yet confirmed whether task-switch → Resume now works after N2.1.

N2.2 is a **diagnostic PR, not a latency-engine rewrite**: collect per-event timing, then let the owner send a report after finishing a normal round.

## Simple iPhone workflow

1. Owner merges PR #23, then in the dedicated `biblozoo-native-audio` worktree Fetch/Pull `experiment/native-ios-audio`. From the repo root run `npm run build && npx cap sync ios && npx cap open ios`. Build/run **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a physical iPhone, not the original installed BibloZoo.
2. Open Daily To-Do Preview → Feeding Game Tester → Classic, tap Got It! and play normally for **1–2 minutes**. No screenshot, recording or developer-panel interaction is required while playing. Check that every star and chomp still plays and game animation remains smooth; native peg beeps intentionally remain silent until N3.
3. Optionally, if you can conveniently tap the floating DEV panel within **60 seconds of a chomp that sounded late**, tap **Mark last chomp late (optional)**. It flags the *most recent chomp*, not necessarily the precise event you noticed if another chomp followed. Do not interrupt gameplay or claim the flag is an acoustic measurement.
4. At any convenient moment afterward, tap **DEV · Native Audio → Copy Audio Timing Report**. Look for **Copied N sounds! Paste into ChatGPT when ready.** It copies directly to the native iOS clipboard through a Swift bridge, rather than depending on WebKit permissions after an awaited read-only request.
5. Paste the clipboard text into the next ChatGPT conversation message and mention roughly whether the delays were rare/frequent and noticeable or subtle. No need to decode numbers. **Nothing is uploaded or sent automatically.** You control pasting; like any clipboard, copied content may be accessible to other apps, so paste only where you want to share it. The report does not contain child names, pets, verse text, microphone content, raw audio or device IDs.
6. Separately, task-switch away/back during active Classic and confirm whether the same round resumes with the Welcome Back action, scores/balls intact, no automatic replay and usable Back. Owner did not explicitly test this after PR #22; do not infer acceptance.

If the report says `Copied 0 sounds`, verify you played actual Native-only Classic on the same app process. The last **80 native play events** are held in memory: earlier events roll off, and a force-quit/relaunch resets the history. The report includes DEV sounds too if played. The owner can collect a second report after a different round.

## What the timing columns mean

`daily_questions_feed_game.js` captures `Date.now()` at the **start of the JavaScript physics callback** that detects pet-snack contact (`catchBall`) or star-peg contact (`triggerStarPeg`), before DOM score/pulse/starburst work. `feeding-native-audio-pilot.js` supplies a safe sequential `eventId` such as `feed-7` and timestamps the existing single `BibloZooNativeSound.play` bridge invocation, without an extra bridge trip or synchronous file operation on the frame.

The same existing native Swift plugin captures native receipt time, worker queue entry, completion of `AVAudioPlayer.play()` and its returned status. The native plugin keeps only 80 events in a fixed-schema in-memory ring, never on disk/cloud, plus optional manual late flags. All log calls happen after playback on the main queue rather than blocking the AVAudioPlayer worker.

| Report column | Meaning |
| --- | --- |
| `event`, `sound`, `result` | Numeric nonpersonal event ID; fixed native sound ID (`feed-star`, `feed-chomp`, `pilot-unlock`); whether `AVAudioPlayer.play()` accepted the command. |
| `collision->JS` | Milliseconds from the game's collision callback to the JavaScript bridge request. A large value would suggest game/DOM work before sound dispatch. |
| `JS->bridge` | Approximate milliseconds between the JavaScript request and Swift receiving it. |
| `bridge->worker` | Monotonic wait between Swift receiving the call and the serial native playback queue starting it. |
| `worker play()` | Monotonic duration of the native `AVAudioPlayer.play()` call, not the length of the MP3. |
| `collision->native dispatch` | Approximate end-to-end milliseconds from collision callback to `play()` return. **NOT** when audible sound begins in the hardware/speaker. |
| `marked late` | Optional **human observation** pinned to the newest chomp if within 60 seconds; not a latency threshold or proof of acoustic delay. |

The report also counts `collision->native dispatch >=120 ms` as **diagnostic heuristic**, not a verdict that the speaker sounded late or failed. Timing values are integer milliseconds; `-1` indicates no collision value or invalid/skewed wall clock. JavaScript Date.now() and Swift Date use a shared device wall clock but can be skewed by clock changes or precision differences; the worker queue/play call durations use monotonic uptime. Native status remains separate from a real person hearing the clip. Logging has no hidden Web/HTML sound output and never activates, deactivates or changes the native AVAudioSession.

## Safety / next steps

- [ ] Node/VM and build CI for final PR SHA; checks can validate wiring/metadata/report schema, not compile Swift, run a real iPhone, or hear a sample.
- [ ] Xcode build and owner actual iPhone test after merge; latency report needs physical-device data.
- [ ] Confirm iPhone **no audible misses**, **smooth ball animation**, and **task-switch Resume** explicitly; acceptance for all three is distinct.
- [ ] Paste one report with both immediate and late-sounding events; compare `collision->JS`, `JS->bridge`, `bridge->worker`, `worker play()`, `collision->native dispatch`, and manual flag. If dispatch times stay low when heard onset is late, investigate actual hardware/audio-output scheduling or consider N3 `AVAudioEngine`/buffer scheduling; do not misdiagnose `AVAudioPlayer.play()` success as speaker onset.
- [ ] N3 remains deferred for voice pools/polyphonic effects, real native peg tones, Melody timing. Do not change category, add Web fallback, resurrect old Web-clock/Zoo Escape repairs, or invent random Zoo events in this diagnostics PR.
