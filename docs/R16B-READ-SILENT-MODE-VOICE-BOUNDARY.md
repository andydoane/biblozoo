# R16b / AUDIO-01 — Read My Verse essential voice vs overlapping soundtrack

**Prepared:** 2026-11-18 (America/Detroit). **Branch:** `fix/r16b-read-verse-voice-silent-mode-safe-scope` from verified integration `bdd7d657ee1cf723e36429f5accbee9363fb26ec`. **Status:** IMPLEMENTATION CANDIDATE / PARTIAL; CI and physical iPhone PASS **NOT YET ESTABLISHED**. Do not merge automatically, move `ios-prep` or `main`, or claim R16/AUDIO-01 closed.

## Owner-approved policy and preexisting device findings

Option B: ONLY actual spoken verse narration, spoken instructions, and explicitly replayed RAM-only child voice may bypass iPhone Silent Mode. Optional game notes, UI pops, typing sounds, celebratory effects, music and soundtrack remain under the iOS Silent switch. Earlier R16a (#146) and its follow-up #148 worked for Learn and Flashcards; the owner reported the Chunks/Echo Menu fix PASS on iPhone after #148 was merged. The owner confirmed on-device with Silent ON + iPhone speaker that essential Learn/Flashcards audio is audible but Home/Verse Scramble effects are quiet. With AirPods the optional effects were audible while native traces showed `SoloAmbient` and `BluetoothA2DPOutput`; no speculative Bluetooth-specific workaround is authorized.

Apple's [AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession) is a process-wide singleton. Apple documents [`playback`](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback) as audible under the Silent switch and [`soloAmbient`](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/soloambient) as silenced. The session category is NOT per AVAudioPlayer. Thus applying `playback` to the entire Read session could leak Verse Crawl theme music and ending, typing notes, UI pops and other optional cues when voice overlaps them. A category flip without an accompanying sound-ownership policy is **not an acceptable fix**.

## Scope implemented in this PR

The Read My Verse native adapter uses a local source-validated `NativeAudio.markEssentialVoice()` only from **`beginReadNarration` and only when the current activity is NOT Verse Crawl**. This covers the actual packaged, published verse/reference/chunk audio in:
- Typewriter and Keyboard sequential verse narration
- Tap Words in Order, Unscramble and Chunk Sequence per-child-tap verse clips
- Balloons and Fish animated verse narration

This does **not** label keyboard typing samples, typewriter keys/alerts, word correctness notes, generic UI pops, the Zoo unlock cue, background music or Crawl ending as voice. The mark resets on `src` change so an Audio wrapper cannot inherit prior voice trust.

The existing `BibloZooNativeReadOutputPlugin.playClip` validates the fixed `verse:` key via published verse JSON and requires `essentialVoice == true` in addition to actual Read Start/Resume session ownership and UIKit foreground. The **short-lived `BibloZooEssentialVoiceSession` lease** uses distinct owner `read-narration`; it requires `.soloAmbient`, **no other active native Read clips**, no scheduled cues, and no previous Read voice owner. It switches to `.playback` only immediately before starting the prepared spoken player, then restores `.soloAmbient` on actual end, explicit stop, global stopAll/Exit, OS interruption/reset/route loss, player refusal, decode failure and plugin cleanup. No `setActive(true)` occurs in the voice lease. Only the existing explicit Read Start/Resume gesture may activate the shared session.

Every nonvoice `playClip` still requires `.soloAmbient` and returns a truthful denial outside it, with no WebAudio/HTML fallback or fake completion. Generated Read notes (`playCue`) now also require `.soloAmbient`. Global app UI effects are rejected harmlessly during Read's valid active voice lease so they cannot kill speech and manufacture a Welcome Back, but all **real** OS/foreground/media interruptions keep their original fail-closed teardown. No microphone, data, profile, recording, background entitlement or scoring behavior changes.

## Intentionally NOT implemented: Verse Crawl voice + theme overlap

Verse Crawl intentionally plays pre-ducked music *simultaneously with spoken verse*, and overlaps its music with the ending clip. A single iOS app-wide audio category cannot give each player separate hardware Silent Mode treatment. There is no reliable supported public API in this project for reading the hardware Silent switch, and the owner has **not** authorized removing Crawl's soundtrack overlap when Silent is OFF.

Therefore **Verse Crawl keeps its existing `.soloAmbient` audio path** in this candidate. It preserves visual/audio overlap and normal non-Silent operation, but its spoken narration **may remain inaudible through the iPhone speaker in Silent Mode**. Do not claim full R16b/AUDIO-01 success until a separately designed and owner-approved Crawl option exists. Options to evaluate later: an explicit **Voice Only** child-facing playback choice (deliberately suppressing Crawl music for that run), or owner-approved change to Crawl music/voice overlap. Do not use private switch-state hacks, global `.playback` for all music, per-clip category assumptions, or forced Bluetooth muting.

## Automated regression and device gate

CI source and adapter VM: `node scripts/validate_r16b_read_essential_voice_silent_mode.js`. It checks voice source eligibility, audio owner isolation, `.soloAmbient` optional guards, no overlapping clips/cues, lease cleanup on stop/finish/OS, real JS adapter API flags/clip identity and unchanged Crawl selection. Historical R16a regression is adjusted to explicitly recognize the *later*, separately owned R16b Read lease. Existing N7f/N7g/N7m Read lifecycle tests, N7j Learn menu, N7k quiet interval, R16a.2 false UI-interruption, production web build and Linux Swift syntax checks remain required. These are source/virtual tests, **not** an iOS SDK link or physical acoustic proof.

**Owner acceptance after CI green + review/merge only:** 
1. iPhone speaker, Silent ON: start a non-Crawl **Read Typewriter or Keyboard** session; tap through a genuine verse chunk and verify spoken words audible, typing/key/correct/wrong effects quiet. Verify the scene only advances on the native speaker end, not on an API ACK.
2. In **Balloons or Fish**, verify spoken verse audible with Silent ON; no incidental effects bleed while speaking. Run one **Tap Words/Chunk Sequence** spoken replay if convenient.
3. Silent OFF: repeat one spoken Read sequence; effects/notes retain expected normal behavior. AirPods optional if available; no special Bluetooth change expected.
4. While speaking, lock phone or hold App Switcher and return: audio stops and explicit Welcome Back is required; no auto-completion. Try a real AirPods disconnect or Apple Music/YouTube PiP interruption if practical; never assume the absence of an OS notification is a PASS.
5. **Verse Crawl** is intentionally **NOT TESTED for voice under Silent ON as a passing requirement in this PR**; verify normal Silent OFF soundtrack+voice overlap still works, and that its soundtrack does **not** unexpectedly become audible through the speaker under Silent ON.
6. Flashcards Record→Replay, Learn Chunks/Echo Menu, Home UI-pop silence, no zombie audio, external media priority and private Zookeeper profiles remain protected as regression gates. No uninstall, bundle swaps, microphone export, backup mutation, new telemetry or child data uploads.

**Results recording:** Mark each case PASS / FAIL / NOT TESTED with bundle, device route, Silent ON/OFF, exact installed SHA, owner-reported observations. If a case fails, STOP and fix on a new scoped PR; keep `ios-prep` and `main` stable. R17 comprehensive acceptance/promotion remains deferred until all required Read behavior and owner signoff.
