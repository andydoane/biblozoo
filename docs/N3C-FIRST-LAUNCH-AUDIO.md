# N3c — First-Launch Native Audio Preflight Reliability

> **Experimental iOS `.audiotest` only**, [PR #26](https://github.com/andydoane/biblozoo/pull/26) into `experiment/native-ios-audio` after merged N3b [PR #25](https://github.com/andydoane/biblozoo/pull/25) at `29b424fa`. Do **not** change stable `ios-prep`, ordinary BibloZoo, Web/PWA/Android, pet/verse/progress/recording/mic data or the .soloAmbient output category.

## Verified owner feedback and unresolved diagnosis

On November 7, 2026, after building N3b the owner reported **one entirely silent first launch immediately after the Xcode build**. The owner then **restarted the app**, and **both subsequent test runs played all sounds successfully** with pleasant Classic peg notes and real star/chomp audio. Both successful runs **switched apps and recovered**. The two copied after-restart N2.2 timing reports retained **80 events each (160 total)**; **zero events >=120 ms**, native software dispatch roughly **0–3 ms** (most 1–2 ms), worker queue **0 ms**, with `feed-peg` `avengine-tone` and `feed-chomp` `avengine-pcm`. No actual failure report was copied **before** the restart, so it is **unknown** whether the first silent launch involved native session activation, preflight refusal/timeout, Web bridge state or scheduled buffers that iOS never rendered audibly. Subsequent good reports do not diagnose the first silent run; software dispatch and `scheduled` never prove audible speaker onset.

**Decision:** Make a small reliability/diagnostic PR **before** broad Melody or other game-mode audio migrations. This PR is a constrained hypothesis and retry-quality improvement, not a guaranteed cold-start cure.

## Implementation

1. **First actual user tap activates the native output session once.** `BibloZooNativeSoundPlugin.activateFromGesture()` previously returned `ready:true, attempted:false, reason:not-needed` on a fresh process if no interruption/reset was signaled, without requesting explicit `AVAudioSession.setActive(true)`. N3c tracks `hasGestureActivatedSession` and treats the **first real Got It!/Resume/DEV gesture** as an activation candidate, subject to the **existing** foreground, .soloAmbient, true interruption, 4-second cooldown and maximum per-foreground activation attempt limits. It calls `setActive(true)` **only from the same explicit gesture entry point**. A real OS refusal returns `activation-os-rejected` and never lies about success, switches category, unblocks a genuine ongoing .began event, starts sound automatically, or invokes any Web/HTML fallback. Once accepted, subsequent healthy gesture checks may return `not-needed` as before. This is a plausible remedy, **not yet proven causal** by owner device feedback.
2. **Never start a knowingly silent native Classic round.** If `BibloZooFeedingNativeAudioPilot.prepare()` reports failure or is missing, `startPreviewRoundWithAudioChoice()` now keeps the **same Instructions/Start confirmation** visible, re-enables the button labeled **Try Again**, shows the sanitized reason and **DEV → Copy Audio Timing Report** hint, and returns *before* `startRound`. The owner can tap Try Again after any OS cooldown or use Back; no forced app restart. No automatic retries, rewards, audio fallback, duplicate rounds, Web Audio probes, or stale sounds. If all software preflight steps succeed but speaker is still silent, native APIs cannot prove that; the game may still start and the owner should copy the report **without restarting**.
3. **Copyable preflight history:** Swift records the most recent **18** fixed-schema native outcomes in RAM on the main queue for `activateFromGesture` and each `preload`: sanitized native phase, validated fixed sound ID, reason code, OS/preparation acceptance boolean, preparation duration (or -1), foreground epoch, interruption pending and app active state. They are appended to the **existing** one-tap native **Copy Audio Timing Report** *after* the unchanged 80 most recent sound events. `getDebugState` also exposes the last preflight and first activation flag. No network, disk persistence, personal names, route identifiers, device IDs, recording audio or Bible verses. A restarted app **loses the evidence**; copy on failure **before** restarting.
4. **Preserved behavior:** N3a warm `AVAudioEngine` PCM star/chomp, N3b six native peg notes and 2/4 voice pools, off-main serial worker and timing, .soloAmbient activation policy, no WebKit output in `.audiotest`, safe app background/route/interruption semantics, explicit Resume, native-only refusal and all Web/PWA/Android code remain intact. Existing successful after-task-switch audio is not a reason to change the engine again.

## Physical iPhone acceptance after owner review and merge

In dedicated `biblozoo-native-audio` GitHub Desktop worktree Fetch/Pull `experiment/native-ios-audio` and run:

```sh
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_first_launch_n3c.js
node scripts/validate_native_peg_voices_n3b.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on real iPhone. Source/Node CI **does not compile Swift or hear output**.

1. **Most important:** On the **very first launch immediately after Xcode build**, open Native-only Classic, press Got It! exactly once and listen. Did pegs, chomp and star actually sound, and did ball animation remain smooth? The report should show a `gesture | session | os-accepted` entry followed by successful `preload | feed-star/chomp/peg | prepared` rows. If instead the instructions say **Native sounds unavailable**, no round should start: the button should say **Try Again**, reason displayed and Back usable.
2. **On any initial silence or rejection, do NOT immediately restart.** Open DEV → **Copy Audio Timing Report**, paste the entire text into the chat, and report whether the round actually started but was silent versus being blocked. If rejected, you may then wait a few seconds (existing 4-second cooldown) and tap Try Again **once**. Report the outcome. If the report contains `ready/accepted` events but your ear heard no sound, explicitly say so: that is an important difference and requires a separate output-render investigation.
3. After the first-run check, play Classic normally and ensure **every chomp, star and peg beep remains audible/pleasant**, no new 400–750ms stalls, animation still smooth, and the 80-event timing copy still contains `avengine-tone`/`avengine-pcm` rows. No Web fallback, duplicate rewards, or spontaneous foreground playback.
4. Task switch during the same round (including a video if convenient), return and tap **Let's go!/Resume**; the score/round should be preserved, sound should work and the brief false **Try again!** flicker should remain fixed. A genuine failure must stay retryable with Back. Confirm no activity resumes sound without a tap.

**Stop/go:** Only a genuine first-build-first-launch **heard-sound** pass, plus native retry/Resume and expected safety, can close the original intermittent-silence observation. CI can verify gating/reporting but cannot certify this physical symptom fixed. If one successful build is followed by a silent one, collect the report *before* restarting and do a narrow N3c follow-up rather than start N4. After reliable native first-launch and repeated return tests, continue remaining N3 Melody/voice improvements, then broader N4 Feeding and independent Zoo Escape/ZOO BREAK fun much later in N8.
