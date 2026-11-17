# iPhone owner audio and gameplay acceptance findings — 2026-11-17

> **Status: OWNER-REPORTED / NOT REPRODUCED BY ASSISTANT / UNFIXED.** This is an issue inventory from the owner's extensive physical-iPhone checklist, **not** a fix, feature roadmap, claim of regression cause, or proof of iOS acceptance. The owner reported **only problems**, stating that other attempted checklist items appeared to work. Therefore, unlisted areas may be recorded as *owner reported no problem*, **not** as independently verified PASS or as proof every optional interruption/device combination was attempted. Preserve the original descriptions and any uncertainty below when triaging.

## Build, branch and data scope

- Findings provided November 17, 2026, from physical iPhone testing of the production-bundle-ID **native-audio integration** app. The precise locally installed source revision when each item was tested is **not reported**. In particular, the owner said that the former hidden Read My Verse DEV tester had been removed and that they had to find Read activities through Daily To-Do; do **not** assume they had already installed and tried the new child-facing picker.
- [PR #124](https://github.com/andydoane/biblozoo/pull/124) subsequently added **Home Review → Learn → Listen Activities** (all eight Read activities) and was merged to `integration/native-audio-to-ios-prep`. [PR #125](https://github.com/andydoane/biblozoo/pull/125) fixed historical CI assertions and was merged; the post-merge integration [run 44183466029](https://github.com/andydoane/biblozoo/actions/runs/44183466029) was green. **Neither merged PR is evidence that these owner-reported issues are fixed**, and the child picker still requires the owner's physical-iPhone verification.
- Original production app has **10 profiles** reported intact after first integration install. The private production family-v2 export passed read-only structural checks (10 distinct profiles, 148 progress records, 589893 bytes), but **has not been independently restore-tested**. The separately verified **11-profile** export comes from the **Audio Test** app, not this production app. Both are private; no raw backup/profile names or recordings belong in GitHub. Zoo rescue/surprise stats are outside family-v2 backup.
- Do **not** merge the integration branch into `ios-prep`, reinstall a production-ID build without the owner's explicit permission, import a backup, or claim hardware acceptance because a Node/Web workflow is green.

## Cross-cutting product decision: required sound versus iPhone Silent Mode

**AUDIO-01 — Sound-essential app is silent when the physical Silent switch is enabled.** Owner observation: children need narration and auditory feedback to use BibloZoo successfully, but iPhone Silent Mode suppresses current audio. Owner asks whether the app can *detect* Silent Mode, instruct children/parents to turn it off, or use another approach. **Design question, not an observed code error**; no unilateral behavior change in this documentation PR.

**Current technical context:** Native audio is deliberately built around `AVAudioSession.Category.soloAmbient` and a temporary `.playAndRecord` mic session. The Swift plugin, SceneDelegate, interrupted-state verification, Flashcards capture handoff and Apple Music/PiP tests assume the foreground `.soloAmbient` category. A global move to `.playback` cannot be treated as a one-line fix because it risks changing other-app interruption, silent-mode behavior, lifecycle, recording, Web/PWA behavior and child expectations. No supported direct public API reliably reveals the hardware Ring/Silent switch state to an iOS app, so don't promise automatic switch-position detection.

**Options for the *future* design decision (none selected/implemented):**
1. Retain `.soloAmbient` and show a **contextual “Can't hear the verse?” help prompt** explaining volume, Silent switch/Action Button and output route (AirPods), without falsely claiming the switch was detected; do not require a global master mute.
2. Evaluate `.playback` for **explicitly child-initiated essential narration**; Apple documents that this category ignores the Ring/Silent switch. Carefully preserve current foreground-only/pause-on-lock and external-media takeover policies, and return from mic `.playAndRecord` correctly. Don't indiscriminately turn incidental game pops/music into surprise audible sounds.
3. Test a **hybrid essential narration versus optional effects** category/policy, if feasible without introducing category thrash or breaking interruption recovery. Explicit design choice, not a decided roadmap.

Apple references: [Playing audio — HIG](https://developer.apple.com/design/human-interface-guidelines/playing-audio), [AVAudioSession.Category.playback](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback), [playAndRecord](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playandrecord).

**Home audio-control clarification:** The owner confirms there is **no Home-screen master mute button** and does **not** currently want one. This is a preference, **not an issue to “fix”**. Distinguish app-specific existing sound settings, if any, from a hypothetical master toggle.

## B. Learn the Verse

**LEARN-01 — Welcome Back duplicates the rotating playful “busy” phrase.** During the Learn flow, after the owner taps **Let's go!**, phrases such as **“Tickling the giraffes”** appear *both inside the button and in separate text below*. Expected: playful status text lives **in the button only**, with no duplicate line below. Owner believes this was previously fixed elsewhere. Check Learn-specific Welcome Back markup/recovery and all response states; preserve other contexts and accessible status.

**LEARN-02 — Missing Words continues running in held App Switcher.** While the iPhone App Switcher/multitasking card view is open, the **Missing Words** phase visibly continues advancing within its app thumbnail rather than pausing immediately. Expected: detect the inactive transition as soon as the App Switcher is held open, **freeze timers/progress/animation immediately**, show Welcome Back at appropriate reentry, and advance again only after an explicit **Let's go!**; no missed-word credit or duplicated progress. Do not wait only for `document.hidden` if `blur`, `pagehide`, native `willResignActive` or other legitimate signal is needed.

## C. Daily Questions

**DAILY-01 — Check the Verse narration gets stuck in “Listening” after held App Switcher.** During **Check the Verse → Listen** in Daily Questions, holding the App Switcher interrupts the audio but **does not show Welcome Back**; bottom control remains **“Listening”**. Current workaround: close the Check the Verse window and reopen it. Expected: genuine interruption records a paused checkpoint, clear/disable stale `verseAudioPlaying` UI, and present an explicit recoverable Welcome Back / retry; don't grant task credit or silently replay. Verify separate Daily Questions audio paths (ordinary question cue vs this verse panel) without assuming both fail.

## D. Feeding

The owner supplied **no Feeding-specific failures** in this report, across Classic, Labyrinth, Bounce and Melody. This is owner-reported observation only, not proof of every optional route/interruption case.

## E. Practice Games

**PRACTICE-01 — Traffic Tap bonus truck is too slow.** The bonus truck moving across the screen is noticeably **too slow**. User request: **speed it up** (gameplay feel/animation, not an audio bug). Current source reference: `verse_games/traffic_tap/game.js` `startBonusTruckIntro` and `startBonusTruckOutro` set `bonusTruckSpeed = Math.round(clamp(130 * trafficSpeedMultiplier(), 120, 190))` at the time of reporting; this is a *candidate* tuning site, not a prescribed final speed. Future change should test phone/tablet, speed selector, intro/outro, pausing and rewards without affecting gameplay clocks.

## F. Playground

**PLAY-01 — Verse Typer caterpillar visual activity continues in held App Switcher.** In Playground **Verse Typer**'s Bible-book segment, while the owner is holding the iPhone App Switcher, the caterpillar's head / blinking lines **keep changing color**, suggesting gameplay/visual time is not frozen. Expected: true immediate pause of **all** time-driven visual states on `inactive` (not merely audio), with explicit Welcome Back recovery; verify scoring/progress do not advance. Owner observed animation continuing; whether actual scoring continued is **not proven**.

**PLAY-02 — Ghost Writer displays a transient unwanted overlay after selecting mode.** After choosing a Ghost Writer mode, an unexpected popup/screen **flashes for a split second** and disappears. Need a short screen recording or description of the overlay to identify whether it's a transition frame, loading message, stale modal or unexpected gameplay UI. Expected: clean navigation with no flicker. No cause asserted.

## G. Flashcards

**FLASH-01 — UI pop audio stops everywhere after the first voice recording.** The app's button/UI pop sounds work before Flashcards recording, but after a native mic take they **stop for the rest of Flashcards** and remain silent even after leaving Flashcards and returning to the **main BibloZoo app**. This is high-impact shared audio-state ownership, not just a Flashcards UX issue. Check `SceneDelegate.swift` temporary `.playAndRecord` capture and `.soloAmbient` restoration, app-level UI sound gating and native session reacquisition; the specific failure has **not** yet been diagnosed.

**FLASH-02 — AirPods external Play during Flashcards instructions gives an error, not Welcome Back.** While Flashcards instruction narration is playing, press an AirPods remote **Play** action to resume Apple Music/MP3. Instead of the normal **Welcome Back** overlay, a red warning strip at the top reads **“Instructions couldn't play.”** Expected: a **genuine external audio interruption** leads to the standard paused/explicit recovery flow, rather than being misclassified as narration playback failure. Do not automatically steal Apple Music audio back. This is separate from a legitimate missing file/corrupt audio error.

**FLASH-03 — Same incorrect error when external Play interrupts verse playback.** Reproduce at **How do you want to say the verse? → Listen to the Verse**; AirPods remote Play while the verse is playing yields the same red instruction/verse-playback failure warning rather than Welcome Back. It may share root cause with FLASH-02, but must be tested as a **distinct playback context**.

**FLASH-04 — Recorded take is silent after AirPods disconnect before playback.** Record the verse with AirPods connected, **disconnect the AirPods**, then tap Play My Recording with speaker as output: owner hears **no playback**. Expected: an explicit route-change handoff/pause and subsequent Play routes the existing in-memory take to available iPhone output, or supplies a recoverable reason/retry; do not silently discard the recording. Compare connected/disconnected routes and audio interruption recovery, no recordings uploaded.

**FLASH-05 — Native voice recording sounds quieter than Web recording.** Owner perceives **substantially lower voice playback loudness** from native Flashcards versus prior Web experience. Unknown whether microphone capture level, native playback gain, speaker routing, audio sample normalization or A/B device volume causes the difference. Future test: compare same speaking distance/volume and playback route, confirm recorded sample peak/RMS without storing or uploading a child's voice, check for clipping and safe, limited level normalization if needed. **Do not turn up system volume automatically** or claim the mic input itself is lower without measurement.

## H. Read My Verse

**READ-ACCESS — Owner could not select all eight activities in the installed test build.** The removed DEV tester forced the owner to encounter Read activities through randomly assigned Daily To-Dos across profiles. Owner says they found all but **“Typer”**; exact intended activity is unclear (the report also describes a Typewriter chunk-punctuation issue). This is **testing-coverage context, not necessarily an outstanding product defect**: merged PR #124 now includes a legitimate child-facing eight-card picker under **Review → Learn → Listen Activities**. Owner has not yet confirmed installing/testing the new picker or which activity remained untested. Retest both original Daily path and picker, **without restoring DEV controls**.

**READ-01 — Typewriter (possibly Keyboard) opens quote on wrong audio chunk.** In the verse fragment **“They replied, ‘Believe in the Lord Jesus…’”**, the first *spoken* chunk is **“They replied”**. The text the user is asked to type for that chunk includes **“They replied, ‘”** (comma is acceptable; the **opening quotation mark** attached to the first chunk feels visually wrong). Owner explicitly says **Typewriter** and possibly **Keyboard**. Expected: chunk/text punctuation boundaries match sensible spoken grouping; attach the opening quotation mark to the next chunk when appropriate, without accidentally altering canonical verse text, audio indices, preview or progress. Check typographic curly and straight quotes, punctuation-only tokens, both activities.

**READ-02 — Balloons freezes visually but loses word position when playback resumes.** While Balloons words are low on screen, AirPods Play resumes Apple Music, Welcome Back appears and words freeze. After ~10 seconds waiting, pressing **Let's go!** causes the words to be **immediately gone** as if elapsed real time advanced under the paused animation. Expected: preserve exact scene/word positions, elapsed animation clock and pending timers while paused; resume from the frozen point. Distinguish frozen CSS animation from JavaScript wall-clock deadlines. Native Read scene freeze/thaw calculations in `read_my_verse.js` are candidate investigation sites, not confirmed root cause.

**READ-03 — Fish has the same frozen-animation / elapsed-time drift.** AirPods external Play correctly displays Welcome Back and freezes Fish activity visually. After waiting, **Let's go!** makes words/fish skip ahead or disappear as though hidden paused time was counted. Expected identical time-correct freeze/thaw to Balloons. Validate both separately; they may share animation clock logic.

**READ-04 — Tap in Order and Unscramble tones sound quieter than other games.** Owner perceives quieter beeps/melodies compared with separate Practice Games and Playground activities, asking whether actual gain differs. This is **not objectively measured**. Candidate comparison: `read_my_verse.js` native cue `playCue("order"/"scramble")` and shared native PCM tone mix versus the other games, across speaker/AirPods and matched system volume. Future fix must preserve comfortable loudness and avoid clipping or unexpectedly loud notes.

**READ-05 — Tap in Order post-switch cue suppression/delayed bursts.** After an interruption/task switch, on a **five-word** screen, tapping words 1–4 produces **no audible notes**, then the fifth word sounds; some returned audio feels delayed/rushed. Expected: each correct tap generates its proper timely response after explicitly verified Welcome Back, without replaying a backlog of previously missed cues. Record whether headphones/Apple Music is still playing and whether native session is available; avoid awarding extra credit.

**READ-06 — Unscramble post-switch two-note melody timing collapses.** After a task switch, some normal two-note feedback melodies fire **almost simultaneously**, with a rushed/delayed feel. Expected: original spacing/duration per valid action and no stale queue replay or compressed timing after interrupted ownership. Could share audio cue/session recovery with READ-05 but do not assume an identical cause.

## What is deliberately not concluded

- **No automatic PASS claim** for the new Review/Listen Activities picker or any exact GitHub revision installed on the owner's phone; no build/reinstall authorization in this report.
- Owner did not list failures under Basic Home audio or Feeding, and most other checklist features had no reported problems. Do not translate that into blanket independent certification of microphone, sound routes, accessibility, offline PWA, all 12 Practice/5 Playground games, or every interruption variant.
- Distinguish audio-session bugs, animation/gameplay pause bugs, UI copy duplication, game speed tuning and transient Ghost Writer UI. The categories may need different PRs later.
- No fix, package change, audio-session category decision, dev control, altered product requirement or shipped roadmap is authorized by this issue inventory.

## Follow-up evidence worth gathering (not required to log these issues)

- **Activity naming:** When the owner says the single Read activity not tested was **“Typer”**, did they mean **Read Typewriter**, **Read Keyboard**, or **Playground Verse Typer**? Do not silently mark Typewriter tested or untested on this ambiguous sentence; its chunk-specific bug is separately recorded as an observation.
- **Ghost Writer:** A screen recording or a few visible words from the transient popup would identify it, but an exact repro is not yet known.
- **Voice volume:** Was the native recording replay through the iPhone speaker or AirPods? Was the comparison made at the same output/volume?
- **Test baseline:** If a new on-phone build is installed after PRs #124/#125, mark issues **retested** versus **reported on an earlier build** rather than deleting reports without proof.
- **Silent policy decision:** Confirm whether the owner prefers essential verse narration to be heard even while Silent Mode is enabled; a separate product/design decision before implementation.

## Deferred future roadmap

**Do not create the implementation roadmap PR now.** Owner explicitly requested: *first document the full issue inventory; later, in a separate future documentation PR, propose a roadmap of focused PRs to fix these items.* That future roadmap should propose sequencing, risk boundaries, test criteria, expected iPhone repro steps and separate decisions for Silent Mode, native Flashcards session ownership, interruption freeze/recovery, Read scene clocks and tone balance, gameplay polish, and accessibility/other regressions. It must update `docs/PROJECT-HANDOFF.md` in that future PR as usual.

**Current acceptance gate remains blocked** until owner-reported issues are triaged and native iPhone feature-by-feature retesting is completed, ahead of any integration → `ios-prep` promotion.
