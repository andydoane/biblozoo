# N6h.2 — YouTube PiP STILL PLAYING: explicit native audio takeover, Home and all seven games

**PR:** [#49 — N6h.2 real-gesture PiP activation](https://github.com/andydoane/biblozoo/pull/49) → isolated `experiment/native-ios-audio`; base owner-merged [#48](https://github.com/andydoane/biblozoo/pull/48) `a7d5660bfc262b2384b71bfb2fd65f2de487e645`, merged 2026-11-08 21:42:56 UTC. **Owner's NEW real-iPhone results of #48:** when game runs normally, all native sound works; switching to YouTube, watching then PAUSING video and returning to the game restores audio correctly. **Still broken with YouTube PLAYING on return**: Let's go! briefly flashes status but cannot resume. **Also broken on fresh BibloZoo Audio Test launch while YouTube PiP already PLAYING**: Home silent, and difficulty selection in EVERY migrated game cannot proceed. Thus **#48 is MERGED/PARTIALLY owner-tested, NOT PiP-complete. #49 is unmerged/untested on real iPhone.** Don't suppress this history in the handoff.

## Cause verified in #48 source, design/OS contract

The normal `.soloAmbient` iOS `AVAudioSession` is **nonmixable**. Apple's documentation explicitly says activating it can interrupt other nonmixable audio. [Apple soloAmbient documentation](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/soloambient). #48 accidentally blocked `activateFromGesture` whenever `AVAudioSession.isOtherAudioPlaying == true`; it also blocked pending `.began` while PiP kept playing. This yielded an endless `other-audio-playing` return from any real Home/Mode/Let's go tap, and no Swift `setActive(true)` call was actually attempted. We overprotected a NORMAL foreground activation; #48's passive interruption pause/gesture-required persistence are useful and retained.

**N6h.2 only:** Keep the **existing single Swift `.soloAmbient` AVAudioSession and serialized predecoded `AVAudioEngine` worker**. In `activateFromGesture` only, recognize `isOtherAudioPlaying` as reason for the next **real child UI/mode/Resume tap to request** `setActive(true)`, even if Swift remembers an earlier activation or an interruption `.began` persists. Let iOS decide if a nonmixable YouTube PiP session yields audio. No guarantee about external player behavior or speaker audibility can come from static tests or `setActive` success. Hot `play`, `preload`, diagnostics, background/UI lifecycle, `.ended`, timers and loading a page **never** request takeover; those paths still reject playing another app's audio until a real user gesture succeeds. **Never change category/mode/mixWithOthers, never create a second AVAudioSession or Web/HTML audio fallback.**

The seven native game PCM owners (Scripture Snake, Bible Bugs, Food Slice, Verse Splat, Dino Dash, Verse Invaders, Verse Munch) and shared `welcome-back-return.js` additionally classify a **true iOS `activation-os-rejected`** (e.g. high-priority call) as a *temporary* interruption: preserve the same paused round, show retryable **plain Welcome Back** with **“BibloZoo couldn't start sound yet. Pause the video or tap Let's go! again.”** Never mislabel an OS denial as missing PCM or consume two terminal retry attempts. A missing shipped PCM file remains a genuine error, with failure-only Try Again/Back. The N6h.1 notification forwarding, UIKit held App Switcher pause, fixed native UI Home pops and 4 Feeding mode architecture remain in place.

## Automated tests and limits

```bash
node scripts/validate_native_pip_takeover_n6h2.js
node scripts/validate_native_pip_interruption_n6h1.js
node scripts/validate_native_verse_munch_n6h.js
node scripts/validate_native_verse_invaders_n6g.js
node scripts/validate_native_dino_dash_n6f.js
node scripts/validate_native_verse_splat_n6e.js
node scripts/validate_native_food_slice_n6d.js
node scripts/validate_native_snake_title_ui_n6c2.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

N6h.2 checks **the actual Swift code** for one and only one `setActive(true)`, an explicit gesture exemption for `other-audio-playing`, readiness despite prior session activation, non-gesture `preload`/`play` and lifecycle never acquiring session. Real JavaScript VM checks seven native game owners, Home's shared UI pop, cold start with PiP already playing, return while PiP STILL plays, pause-video-then-return path that previously passed, no automatic foreground activation, and explicit iOS priority rejection stays retryable. Full final-head GitHub Actions Node tests + production web build must pass. **No Node test compiles Swift with Mac Xcode, observes iOS PiP arbitration, or proves actual speaker audibility.**

## Owner physical-device test, after reviewing and MERGING #49 yourself

In **separate `biblozoo-native-audio` Mac worktree**, switch to `experiment/native-ios-audio` and Pull Origin, then:

```bash
node scripts/validate_native_pip_takeover_n6h2.js
npm run build
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` in Xcode on a **physical iPhone**, without replacing stable BibloZoo.

1. **Already successful baseline:** start Verse Munch/Dino Dash/Invaders, hear sounds; switch to YouTube, play video, **PAUSE it before returning**, then tap **Let's go!**. Expect plain Welcome Back, same round/score/bonus timing and audible game PCM after genuine tap.
2. **New critical gate — PiP still PLAYING:** start any migrated game → leave for YouTube and start video → return to BibloZoo **without pausing PiP**. Plain Welcome Back may appear. Tap **Let's go!** once. This is a real user gesture: it should request iOS native session activation while PiP remains running. If iOS grants it, YouTube sound yields and original game/bonus resumes at same point with audible PCM. If OS genuinely rejects, the app must show persistent actionable plain retry, not a flash/no-op/gray trap, and a later real tap (or pause video then tap) can recover.
3. **New critical gate — PiP running BEFORE cold launch:** force-quit test app, start YouTube video with PiP playing, then launch **BibloZoo Audio Test**. App load/foreground alone must **not** auto-interrupt the video, but its **first deliberate in-app Home UI tap** should request `.soloAmbient` priority; if iOS grants it, hear fixed UI pop. Enter each game (Snake, Bugs, Food Slice, Splat, Dino, Invaders, Munch); tap Start / Easy, Medium or Hard while PiP is playing. Each deliberate mode tap should be able to prewarm full PCM bank and progress into gameplay, rather than staying frozen. Check John 3:16 and Psalm 23:4. Title and Help navigation must not get stuck.
4. **Home-after-game:** exit each active game normally and after playing PiP, then tap Home UI: native pops still audible. Regress Feeding including Bounce, Learn instructions and previews; verify PiP does not permanently poison audio throughout the installed test app.
5. **Held App Switcher without PiP:** swipe up and HOLD; return → plain Welcome Back, no automatic foreground audio, same monster/score/bonus timer only after real Let's go tap. Preserve mute semantics and original browser/PWA/Android output.
6. **OS denial is a valid alternate result:** if competing high-priority audio (e.g. phone call) refuses takeover, show informative retry and safe Back with no fake `prepared`/speaker claim; only real later tap retries. Do not start an actual call just to exercise this.
7. **Before any restart on failure:** DEV **Inspect native state** plus **Copy Audio Timing Report**; capture `pending`, `otherAudioPlaying`, `needsGestureAfterInterruption`, `lastActivationResult`, `lastSignal`, event step and actual iPhone speaker/YouTube behavior. Report OS version, whether YouTube PiP continued, and whether tap happened on Home, mode selection or Let's go. `accepted:true`/`prepared:true` only means bridge accepted/scheduled.

Owner alone merges. **Do NOT start N6i next game until physical N6h.2 PiP acceptance**. No changes to stable `ios-prep`, original app or mic/Zoo. Subsequent PR's living handoff MUST reconcile #49 owner results.
