# N7j — Learn menu Close resumes native narration without false Welcome Back

**Issue (owner, 2026-11-10 local):** While a native Learn narration is playing, tapping the BibloZoo/Learn menu and then **Close** displays “Welcome Back…” / “Let's go!” instead of simply resuming. The owner confirms the existing recovery **does play correctly** once Let's go is tapped. This is an in-app menu classification/UX regression, **not evidence that the native clip itself fails**.

**Target and verified base:** isolated `experiment/native-ios-audio` at `60646e97e26d654fc718b783cce11db65dcf73b2` (owner-merged **N7i #78**, [merge-head GitHub Actions #42941080240](https://github.com/andydoane/biblozoo/actions/runs/42941080240) both Node and Web jobs SUCCESS). Branch `experiment/n7j-learn-menu-native-resume` → same experimental target. N7i **owner reports Choose a New Verse speaker fix worked**; this is a specific owner device success on that feature, not automatic N7h Daily Questions or N7g integrated PASS. Stable `ios-prep`, `main`, Web/PWA/Android and original installed BibloZoo untouched. Experimental iOS bundle ID `com.andydoane.biblozoo.audiotest`.

## Root cause confirmed from source

`app.js openLearnMenu()` calls `pauseLearnAudioForInterruption()` for active native **Listen/Chunks/Echo**. This same path is designed to stop native output, record a checkpoint and require an explicit **Welcome Back → Let's go!** after a real OS interruption. On closing the menu, `closeLearnMenu()` previously only hid the menu and called `syncLearnAudioResumeOverlay()`, immediately exposing the pending recovery popup. The existing native Listen/Chunks/Echo resume machinery already knows how to resume at the saved stage, part index and `positionMs`; no Swift decoder/player/category change is needed.

## Implementation and safety

- Opening the native Learn menu continues to immediately stop/pause its owned current native sound and record the *existing* exact Listen/Chunks/Echo recovery checkpoint. It now marks that recovery as **menu-local** only when the menu itself initiated the pause (never when a prior Welcome Back was already pending). Background/lock/partial iOS App Switcher, blur, pagehide or `biblozooAppLifecycle` inactive **revokes** menu-local privilege.
- The **Close** button or clicking its backdrop is an actual child gesture. If it matches the original pending menu checkpoint, app is still foreground, same Learn screen and unmuted, it immediately calls the pre-existing `resumeInterruptedLearnAudio(true)` native restart. Listen calls the existing `BibloZooNativeLearnListen.startFromGesture` and native AVAudioPlayer at `listen_ref` or `listen_verse` with saved `positionMs`; Chunks/Echo use existing `primeNativeLearnTracks` then their original indexed/positioned sequence. No Web sound output or HTML `Audio.play()` in the native test bundle; no phantom "ended", grade, checkpoint or Zoo progress.
- Only **menu-local** pending native restarts suppress the visible Welcome Back dialog while waiting for actual audio progress/ended; native `play/activate` ACK alone cannot finish success. A **genuine native startup failure / no progress watchdog** clears menu-local attempt and restores the original Welcome Back retry, without quietly giving up narration. A real OS interruption stays on the explicit Welcome Back route. **Exit Learn** is never interpreted as a resume request.
- The original Web/PWA/Android menu `audioEl.pause()` then `safePlay()` behavior is unchanged. Native-only return skips the optional Web Audio unlock step; Swift maintains its accepted `.soloAmbient` priority/AVAudioSession policy. No new AVAudioSession category/mix/duck, Wacky/Flashcards mic, child recording or profile change.

## Automated gates (CI versus hardware)

`node scripts/validate_native_learn_menu_close_n7j.js` runs actual extracted production `openLearnMenu`, `closeLearnMenu`, `pauseLearnAudioForInterruption`, `resumeInterruptedLearnAudio`, `syncLearnAudioResumeOverlay`, success/failure handlers in a DOM/native VM. Cases: native **Listen/Chunks/Echo** checkpoint, Close resumes without modal, silent request only completes after native progress/ended, failed restart restores Welcome Back, early UIKit inactive prevents automatic menu resume, hidden/Exit/muted suppress resume, Web/PWA original resume remains. It is added to existing native-only experimental CI along with previous N1–N7i regressions, full Swift syntax parsing and production Web build. **Linux/VM checks are not a macOS/iOS SDK compile or proof of actual physical audio.** Inspect final PR-head GitHub Actions before marking CI success.

## Owner physical iPhone gate — AFTER review/merge

On the separate Audio Test worktree switch to `experiment/native-ios-audio`, Pull Origin, then:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Use Xcode **App** on a real iPhone, retaining `com.andydoane.biblozoo.audiotest` as the separate bundle.

1. Learn **Listen** reference narration (John 3:16): while speaking, open the BibloZoo/Learn menu; audio stops. Tap **Close**; it continues native narration at/near the same reference position **without** Welcome Back. Repeat during the **full verse** segment (must not rewind to reference or skip to Meaning), then with Psalm 23:4.
2. Learn **Chunks** and **Echo**: open menu during a spoken part (mid-part, not merely an idle wait). Close; original indexed part resumes with saved native `positionMs`. Avoid skipped/duplicate chunks, repeat windows, badges, Learn completion and Daily Zoo To-Do credit. Check menu **Exit Learn** never restarts sound.
3. Trigger the menu and then **hold the iOS App Switcher halfway**, fully switch apps or lock before closing. Return and close menu: it **must** require ordinary Welcome Back/Let's go, not auto-reclaim AirPods/Apple Music audio without a deliberate recovery tap. Try an external AirPods Play / YouTube PiP interruption during/after menu Close.
4. Test muted state, rapid menu open/Close twice, Close when narration was already finished, and navigation immediately after Close: no stale voice, delayed popups or false reward. A deliberate native failure should keep a usable Welcome Back retry rather than silently mark sound successful.
5. Smoke-test previously accepted **Choose a New Verse** speakers (N7i owner confirms fixed), Verse Detail/Flashcards native Listen, Daily Questions native answer, and original Web/PWA/Android menu behavior separately.

**N7j owner Mac SDK/Xcode and audible physical iPhone PASS: PENDING.** N7h and N7g broader hardware gates are separate and not inferred from N7i's reported successful picker fix. [Handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio Recovery](AUDIO-RECOVERY.md).
