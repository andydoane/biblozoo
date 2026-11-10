# N7f.2 — Immediate Read My Verse pause + six waveform audition choices

**Status:** isolated native iOS experiment PR, **owner physical iPhone acceptance PENDING**. Based on user-merged [N7f.1 Flashcards no-shift toast PR #74](https://github.com/andydoane/biblozoo/pull/74) at `9b998089bdce58dac17f31c4605d869627abc1f9`. User has **not** yet reported N7f.1 physical toast test results, and reports N7f Read My Verse **generally works very well on iPhone** but two specific problems remain: **Balloons and Underwater/Fish continue moving while the App Switcher is held open**; Typewriter/Keyboard may also advance during their short intro; native **Unscramble beeps** and **Tap Words in Order finale** sound noticeably different from original Web sounds. This PR fixes pause timing and adds an *audition-only* sound Lab; no new default tone is chosen.

## What the held App Switcher fix does

**What was wrong:** `read_my_verse.js` already had a thoughtful `pauseReadForInterruption()` and `freezeReadScene()`: CSS `read-audio-paused` plus direct Web Animations snapshots and residual animated scene timers. But it mostly waited for WebKit `document.visibilitychange`/`pagehide`. iOS can defer these while the App Switcher is being swiped upward and **held**, leaving Balloons/Fish moving even though the app has already started losing the foreground. A Safari timeout alone is not reliable for that gesture. On typing screens, the old interruption path actually **finished** the tiny typewriter intro instead of saving its remaining delay.

**New exact Audio Test native behavior:**

1. `SceneDelegate.sceneWillResignActive` on exact `com.andydoane.biblozoo.audiotest` **immediately freezes the existing root view's CoreAnimation layer clock** (`layer.speed = 0`, preserving `timeOffset`) at the START of the iOS App Switcher gesture, regardless of whether WebKit's page-visibility event has fired. No app audio is started/deactivated by this visual freeze. `sceneDidBecomeActive` restores/rebases the native layer time without playing through the held interval. This is the immediate visual protection while WebKit may be suspended.
2. The existing native Read output plugin already observes `UIApplication.willResignActiveNotification` to stop audio. It now also sends a lightweight `biblozooReadLifecycle {phase:"willResignActive"}` event, including when *no* narration is currently playing. Its JavaScript output facade subscribes eagerly on native iOS, invalidates permission to auto-play more Read audio, and notifies the original Read controller without activating the microphone/audio session.
3. The **same original** `pauseReadForInterruption()` owns scene/audio/score state. On early native inactive it freezes CSS animations/actual timeline positions and retains each Balloons/Fish/Crawl timer remainder. Read My Verse's existing Welcome Back overlay is still the only way to resume. **No automatic animation/song restart when app returns.**
4. Typewriter **and** Keyboard now freeze the *actual* pending intro callback (typed letter, hold, fade) and remaining milliseconds, and apply `read-audio-paused` to their screen, including the cursor. They no longer force the intro to “done” on multitasking. Their short intro only resumes with its saved remainder **after deliberate Welcome Back/Resume Audio**. Input remains locked/unchanged until the same existing owner resumes.
5. Existing Web/PWA/Android Read uses the original `visibilitychange`/`pagehide` path and is not affected by the new native event or native layer clock. The original N7f output native `.soloAmbient`, actual AVAudioPlayer media clock / native end callbacks, real published verse assets, scene grade/Zoo owner and no mic remain unchanged. Owner did *not* request a broad redo of the activities.

## New DEV Tools — Read Beep Lab · 6 Waveforms

This is **another entry in the existing small Home DEV Tools drawer**. It does **not** replace the existing ten Wacky effects Lab, Demon/Chorus 5+5 Lab or the two hidden-by-default DEV panels.

The Lab has **three direct sample groups**, and **six choices each**, making **18 instant comparison buttons** with no need to play through a verse. All options use the exact same fixed pitches, per-note delays, note lengths and native gain within each sample group, so differences you hear are primarily waveform/envelope character rather than changing melodies.

| Sample group | What it plays |
| --- | --- |
| **Unscramble · Word Beep** | Two original rising notes at 0 / 100ms |
| **Unscramble · Finish Tune** | Four original completion notes at 0 / 90 / 190 / 300ms |
| **Tap Words in Order · Ending Tune** | Four original end notes at 0 / 90 / 180 / 270ms |

| Option | Technical character / listening hint |
| --- | --- |
| **Current Native** | Existing raw native **triangle** plus 18ms attack/40ms linear release (unchanged child sound) |
| **Web-like Triangle** | Same triangle but more original **WebAudio 20ms attack + exponential fade**, closer to how the browser feels |
| **Pure Sine** | Very clean, smooth, rounded, gentle beep |
| **Rounded Square** | Sine blended with a quieter third harmonic, a somewhat brighter/electronic tone without a harsh full square |
| **Sawtooth** | More buzzy/bright upper harmonics; may feel sharper |
| **Warm Triangle + Sine** | More mellow rounded triangle/sine blend |

These choices are *not* “six mp3 files”: they are six native **wave shapes** synthesized to short in-memory PCM WAV samples at 44.1 kHz; no recording or voice data involved. The sole new Capacitor method is `auditionCue({sample,waveform})`. Its Swift implementation requires the **exact Audio Test bundle**, live foreground app, original **nonmixing `.soloAmbient` session**, and exact static allowlists for sample and waveform IDs. It calls `setActive(true)` **only inside an explicit sample tap**, and immediately cancels previous samples so fast comparisons don't mix. WAV sample data is transient native RAM only (no file, upload, WebAudio/HTML fallback, microphone or child progress). **No DEV selection is saved or applied to regular Read My Verse yet**. The child-facing `playCue` remains unchanged (including its original negative note waveform).

**What to report:** For each sample group, tell me the option you prefer: e.g. **“Unscramble Word: Web-like Triangle; Unscramble Finish: Warm; Tap Ending: Sine”**, or “same current sound.” We can then implement the chosen default(s) in a later tiny PR after hearing your preferences.

## Physical iPhone acceptance after merging this PR

Use the **separate** Mac GitHub Desktop audio experiment worktree, pull from `experiment/native-ios-audio` and run:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build Xcode **App** on a real iPhone under `com.andydoane.biblozoo.audiotest`. Linux Swift parsing/Node mocks/Production Web bundle cannot prove Apple SDK linking, hardware sound or held-switcher animation behavior.

1. **Balloons first:** Start a published verse with several visible moving balloons. Swipe upward to begin switching apps and **HOLD your finger while the all-apps switcher view is shown**. The balloon positions must freeze immediately, not continue floating; ideally take a mental snapshot before/after a 3–5s hold. Return without exiting. The activity must stay frozen behind the existing Welcome Back popup until you deliberately tap **Resume Audio**; then it should resume the same verses/balloon positions, without restarting or skipping chunks or granting duplicate Zoo/task credit.
2. **Underwater/Fish:** Repeat an extended held switcher. Swimming words, decorative fish and hook/catch motion should all stop immediately. No fish should vanish/catch/score while the app is inactive. On explicit return/resume, continue the remaining animation, not fast-forward or duplicate fish.
3. **Typewriter and Keyboard:** Enter near the beginning of the short automatic intro, start and hold the switcher. Typed letters should not continue appearing, cursor/scanline animation freezes, and the intro must **not skip to completed**. On real return/resume, remaining typing/fade continues once from the same point. Taps to type the verse are not auto-executed on return.
4. **Verse Crawl and remaining activities:** Check its soundtrack, scroll and spoken audio still respect the same interruption/Resume gate. Unscramble/Tap Words/Chunk Sequence word feedback, ordinary navigation and any progress must not advance while the scene is held. No spontaneous output resumes after AirPods Play/Apple Music takes priority. Repeat one held switcher with Bluetooth/AirPods, and a lock/unlock if convenient. No mic permission appears (Read is output-only).
5. **Audition sounds:** On Home tap tiny **DEV Tools → Read Beep Lab · 6 Waveforms**. Merely opening should be silent (and should never ask for mic). In **Unscramble · Word Beep**, tap **Current Native** then the other five; repeat for **Unscramble · Finish Tune** and **Tap Words in Order · Ending Tune**. All **18 buttons** should sound (or show honest refused native output) and be directly repeatable. Tap different buttons rapidly—old tones must stop before the next; **Stop Sound** and **× Close** must silence remaining delayed notes. Test speaker and optionally AirPods.
6. **No accidental child change:** Regular Unscramble and Tap Words ending cues must still sound like the previously tested current native audio, **not** silently adopt a Lab selection. Approved D4 Haunted Whisper and C5 Wobbling Chorus child Wacky, N7f.1 coral Flashcards toast, all N6 accepted games, Web/PWA/Android and original installed BibloZoo are unchanged.

**Report separate results** for the held-switcher pause, Typewriter/Keyboard intro, each favorite waveform, and any Mac Xcode compiler errors. The owner has already said N7f Read activities work “very well overall”; this is valuable **partial positive evidence, not full N7f signoff** until the reported pause/tonal issues are addressed and heard. N7f.1 #74 was merged but owner said they will test it soon; don't invent a toast PASS.

## Tests, safety, roadmap

`node scripts/validate_native_n7f2_read_pause_waveform_lab.js` validates the UIKit scene freeze/rebase source, early JS lifecycle registration without voice activity, exact single Read recovery owner, real Typewriter/Keyboard remaining-timer VM over a simulated 9-second held switcher (250ms intro, 100ms elapsed, 150ms resumed), source waveform DSP differences and strict native DEV gating, unchanged child `playCue`, exact 3×6 direct DEV button inventory, sample playback/Stop/close/leave/no-Web behavior. Original Read recovery Patch20/70, N7f native media, N7f.1 Flashcards, N7e.1/Wacky, N7d.2 audio priority, N1–N6 and Zoo regression suites remain, plus both Swift whole-file frontend parse and Production Web bundle. **The CI Swift parser does not typecheck UIKit/QuartzCore/AVFAudio against the Mac SDK**, nor can any VM prove the scene really freezes in a held iPhone App Switcher. Owner device test is the acceptance gate.

After N7f.2 hardware signoff and waveform choice, follow-up can promote the exact chosen tone(s), then **N7g** final integrated Bluetooth/PiP/route/privacy reliability before N8/N9.

[Living project handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7f Read owner guide](N7F-READ-MY-VERSE-NATIVE-OUTPUT-WACKY-PROMOTION.md) · [N7f.1 toast guide](N7F1-FLASHCARDS-NO-SHIFT-TOP-TOAST.md).
