# BibloZoo — Living Project Handoff

> **Orientation snapshot, not source of truth.** This document is for future ChatGPT conversations and contributors. The current GitHub `ios-prep` branch, its source, tests, PRs, and the owner's latest instructions are authoritative. **Verify them before acting.** Never presume a task is still open, a PR is merged, or a device test passed merely because it appears here.
>
> **Mandatory maintenance:** Every BibloZoo PR must review and update this handoff **in the same PR**, including code fixes and follow-ups. See [§7](#7-mandatory-handoff-maintenance-self-perpetuating) and the [PR template](../.github/pull_request_template.md).

- **Repository:** https://github.com/andydoane/biblozoo
- **Active integration branch and usual PR target:** `ios-prep` (not `main`). **Explicit owner-approved exception:** native audio experiments use `experiment/native-ios-audio` as the PR target and separate Mac worktree, until tested changes are approved for integration.
- **Last verified:** 2026-11-06. Integration `ios-prep` remains at `c0a3b4bf`; experiment `experiment/native-ios-audio` is `dc13434ef5e4ddcd2ebba8a972670da6580a830b` after [PR #14](https://github.com/andydoane/biblozoo/pull/14) merged. Owner reports Classic tester **default Web audio behaves normally** but the DEV native-checkbox **never shows a checkmark when tapped**, preventing native gameplay A/B testing. Source diagnosis: `daily_questions_feed_game.js`'s delegated `startOverlayHandler` unconditionally `preventDefault()` on bubbling clicks; that cancels the checkbox/label's default action on iPhone. A focused `fix/native-feeding-preview-checkbox` follow-up preserves native label/input defaults while leaving ordinary intro controls unchanged. Stage C.2 native gameplay **has NOT been device-verified**, and Stage D remains blocked. Earlier C.1 sample-only listening passed with occasional historical first-launch slowness not causally attributed.
- **Handoff introduced by:** merged [PR #2](https://github.com/andydoane/biblozoo/pull/2) from `docs/living-handoff-ios-prep`
- **Related guides:** [Audio recovery](AUDIO-RECOVERY.md) · [Testing and PR acceptance](TESTING.md) · [README](../README.md)

## 1. Product and users

BibloZoo helps children memorize Bible verses through guided learning, practice games, Playground activities, Flashcards, Read My Verse, daily activities, and collectible BibloPets. A parent/family can use multiple **Zookeeper profiles** on one device. The application is primarily static HTML/CSS/JavaScript, also available as a web/PWA experience and packaged on iOS with Capacitor.

Progress and profiles are kept locally on the device. Backup export/import is an explicit user action. Verify the live [privacy policy](../privacy_policy.html) and native privacy manifest before making any claim about data collection, accounts, tracking, or release readiness.

## 2. Non-negotiable preservation rules

1. **Audio recovery is activity-owned.** Do not treat a tapped button, successful animation, native session state, or sound effect as proof of restored audio. Verify the activity's real Web Audio clock / playback health before resuming, and preserve the existing bounded recovery path. Native `AVAudioSessionCategorySoloAmbient` behavior is intentional. Read [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md).
2. **Do not silently lose child progress.** Preserve active verse, score, round, timers, recordings, Playground work, and saved profile data across interruptions, exits, and migration. Respect normal versus special Daily Zoo To-Do navigation.
3. **No accidental rewards.** Daily Questions, Daily Zoo To-Do, Feeding, rescue statistics, and developer simulations have distinct eligibility rules. Do not award completion twice or give achievements for simulated failures.
4. **Interruptions and cancellation are real lifecycle events.** Clean up listeners, timers, pointer capture, audio handles, and overlays; stale asynchronous callbacks must not revive a completed/exited activity.
5. **One experience, different owners.** Shared Welcome Back / Zoo Escape controls presentation and rescue stages; Learn, Feeding, games, Playground, Flashcards, and Read My Verse still own their audio, pause/resume, and exit logic. Screens that never needed a prompt should remain unchanged.
6. **Accessibility and offline are first-class.** Retain tap-to-rescue alongside dragging, reduced-motion behavior, screen-reader guidance, and the asset/service-worker path needed by standalone games. Native Capacitor and web/PWA loading are not identical.
7. **No silent release of developer tools.** The hidden whole-app Zoo Escape test harness has historically been enabled, as has Feeding's separate test path. Check their *current source flags* and disable or gate them for public release; do not infer they were already disabled.
8. **Native / privacy changes require special review.** Do not casually alter Capacitor packaging, AVAudioSession category/activation rules, backup format, privacy policy, or `PrivacyInfo.xcprivacy`.

## 3. Architecture — where to look

| Area | Current source of truth |
| --- | --- |
| Main app, title/home, Learn, navigation, local verse progress, backups | `index.html`, `app.js`, `styles.css` |
| Zookeeper profiles and profile-scoped data | `profiles.js`, `profiles.css` |
| Verse inventory and individual verse configuration | `verse_data/verse_list.json`, `verse_data/*.json` |
| 12 standalone practice games | `verse_games/registry.js`, `verse_games/<game>/index.html`, `game.js`, `game.css` |
| 5 Playground activities | `verse_playground/registry.js`, `verse_playground/<activity>/` |
| Shared game bridge, standalone lifecycle and Welcome Back | `verse_games/shared/bridge.js`, `welcome-back-return.js`, `welcome-back.js`, `welcome-back.css` |
| Zoo Escape stages, rescue stats, optional effect sounds and developer harness | `verse_games/shared/welcome-back-zoo-escape.js` |
| Web/native audio diagnostics and bounded recovery | `verse_games/shared/audio-diagnostics.js`, `welcome-back-clock.js`, `native-audio-recovery.js`, `audio-recovery-coordinator.js` |
| Native diagnostics/recovery bridges and scene lifecycle | `ios/App/App/AppDelegate.swift`, `ios/App/App/SceneDelegate.swift` |
| **Experimental native sound PR B (not merged)** | `ios/App/App/BibloZooNativeSoundPlugin.swift`, `ios/App/App.xcodeproj/project.pbxproj` resource/source memberships, `ui_audio/ui_pet_unlock.mp3`, `verse_games/shared/native-sound-smoke-test.js` developer panel, `scripts/validate_native_sound_smoke_test.js` |
| Daily Questions and sessions | `daily_questions.js`, `daily_question_sessions.js`, `daily_question_generators.js`, `daily_questions.css` |
| Daily Zoo To-Do and completion UI | `daily_zoo_todo.js`, `daily_zoo_todo_ui.js`, `daily_zoo_todo.css` |
| Feeding Classic, Labyrinth, Melody, Bounce | `daily_questions_feed_game.js`, `daily_questions_feed_game.css` |
| Flashcards including microphone and effect handling | `flashcards/flashcards.js`, `flashcards/recording.js`, `flashcards/audio-effects.js` |
| Read My Verse playback/recording | `read_my_verse.js`, `read_my_verse.css` |
| Production bundle and native packaging | `scripts/build.js`, `capacitor.config.json`, `ios/`; experimental bundle ID also in `ios/App/App.xcodeproj/project.pbxproj`, display label in `ios/App/App/Info.plist` |
| Web/PWA offline cache | `service-worker.js` |
| Existing regression tests | `scripts/validate_*.js` and `package.json` scripts |
| Automatic PR and integration-branch checks (merged PR #3) | `.github/workflows/ios-prep-validation.yml` |

The production build copies root runtime files and asset folders into ignored `dist/`; **the Capacitor sync does not replace `npm run build`**. Assets live in `profile_pictures/`, `pet_images/`, `verse_images/`, `verse_audio/`, `ui_audio/`, and `verse_fonts/`. Inspect `scripts/build.js` rather than assuming all source assets are bundled automatically.

## 4. Current behavior and important product decisions

- **Zoo Escape (72.1A–72.1D):** A failed Welcome Back audio-recovery attempt starts an escaped-pet rescue; a second failure can trigger ZOO BREAK with multiple pets; a final genuine failure exits safely to the title/home route. Pending native interruption is **deferred**, not counted as a failed attempt. The card remains playable without sound. The Zoo Escape developer menu tests failure/deferred cases without faking successful audio. Stage 3 rescue is not proof of restored audio—LOCK GATE still requires an activity-owned check.
- **Rescue achievements:** `BibloPets Rescued` and `Zoo Breaks Stopped` are per-Zookeeper; simulations must not increase them. The latter counts only after all Stage 3 animals are caught *and* real final-gate recovery succeeds. Stats belong in **Zookeeper Stats**, not as a persistent line beneath Zoo To-Do on the home screen. A genuine new achievement may trigger the one-time Zoo Hero home celebration.
- **Feeding (73–73.1):** Classic, Labyrinth, Melody, and Bounce use a two-step start: choose **Tilt** or **Drag**, then selected-method instructions and **Got It!**. The choice applies to that game session, including interruption recovery. Bounce re-serves do not reopen control choice. Collision notes and sizes have been tuned; Melody's visual contact should align with the scheduled musical note. Verify real iPhone behavior, especially motion permission and touch/tilt isolation.
- **Learn narration return gate ([PR #5](https://github.com/andydoane/biblozoo/pull/5), merged 2026-11-06):** Learn Listen/Chunks/Echo recovery now requires advancing HTML narration `currentTime` from the same source/attempt, not success of the unrelated UI Web Audio context. The 3.5-second bounded retry, interruption cleanup, and existing Zoo Escape owner callbacks remain. The final PR regression and web-build checks passed; physical iPhone verification has not been reported.
- **Verse Launch Game Menu pause ([PR #6](https://github.com/andydoane/biblozoo/pull/6), merged 2026-11-06; iPhone verification pending):** The word conveyor previously continued moving behind Game Menu. The fix stops and restarts it only when no menu/help/speed overlay or iOS Welcome Back owns pause, and freezes the asteroid bonus activity clock and delayed work behind menus. No audio-session or completion/reward changes. [Post-merge integration CI passed](https://github.com/andydoane/biblozoo/actions/runs/42313008623); owner physical-device acceptance has not been reported.
- **Flashcards and Read My Verse:** These involve sensitive audio/recording state and must not auto-restart a recording or mistake an acknowledgement for audio recovery.
- **Read My Verse feedback-level audit ([PR #4](https://github.com/andydoane/biblozoo/pull/4), merged 2026-11-05):** [Detailed comparison](READ-MY-VERSE-FEEDBACK-LEVELS.md) found low synthesized peaks in Unscramble (0.075) and Tap Words in Order (0.072 correct / 0.034 wrong) versus about 0.238 for a comparable Tower of Bible correct-word voice. The PR increases positive peaks to 0.22 and Tap Words wrong to 0.11; typing sample levels receive a modest lift in Web Audio and HTML fallback. This is *not* narration or soundtrack gain normalization; device-level loudness and overlapping voices need owner testing.
- **PWA vs iOS:** `service-worker.js` is for the web/PWA; the native iOS app uses its bundled `dist/` content. Offline acceptance requires checking the relevant deployment, not just existence of a precache string.
- **Git line endings / native-audio experiment setup:** [PR #7](https://github.com/andydoane/biblozoo/pull/7) was merged on 2026-11-06 and normalized 20 JSON blobs plus Ghost Writer CSS to LF under existing `.gitattributes`; `scripts/validate_tracked_lf_endings.js` now guards that contract. Owner confirmed the Mac experiment worktree is clean at `c0a3b4bf` with `i/lf w/lf attr/text eol=lf`, and pushed `experiment/native-ios-audio` to the same commit.
- **Native-audio experiment identity ([PR #8](https://github.com/andydoane/biblozoo/pull/8), merged to `experiment/native-ios-audio`):** The merged setup changes the *experimental copy only*: Capacitor `appId=com.andydoane.biblozoo.audiotest` and `appName=BibloZoo Audio Test`, Xcode App target Debug/Release `PRODUCT_BUNDLE_IDENTIFIER` to the same unique ID, and Info.plist `CFBundleDisplayName` to `BibloZoo Audio Test`. The existing development-team identifier, Info.plist microphone permission, AVAudioSession, app icon artwork, data formats, rewards, web runtime, and native audio logic are unchanged. This lets the test app coexist with original BibloZoo if signing and installation succeed. It does **not** clone families or saved profiles between app containers. Owner reported the two-app setup working on their Mac/iPhone. Continue to preserve/export backups, independently verify Xcode target signing and bundle ID, and do **not** interpret separate installation as proof of AVFoundation reliability. The experimental workflow watches PRs/pushes to `experiment/native-ios-audio`. PR #8 and the experiment branch's post-merge run passed Node and web build tests; neither result proves the native iOS app compiled or produced audible sound. See [TESTING.md](TESTING.md).

- **Native output PR B ([PR #10](https://github.com/andydoane/biblozoo/pull/10), merged into experiment; audible iPhone pilot with an unresolved status error):** A single fixed-ID MP3 test (`pilot-unlock` → existing `ui_audio/ui_pet_unlock.mp3`) is explicitly copied by Xcode's App resource phase and played from `Bundle.main` using `AVAudioPlayer`; a new Capacitor plugin is registered alongside, not in place of, existing audio diagnostics/recovery plugins. The on-screen **DEV · Native Audio** panel is shown only on native iOS test builds, **never auto-plays**, and needs a tap to preload/play. JS bounds timeouts and cancels stale background calls; Swift only allows foreground + `.soloAmbient`, filters IDs/volume, and stops on background/route changes/interruptions. **No Feeding, Learn, game audio or shared recovery is routed through native output yet.** A bridge `accepted:true` is *not* evidence of audible sound. Owner actually heard the clip in several tests; however, `interruption-pending` occurred on some taps, so a B.1 correction and explicit retest remain before PR C. See [TESTING.md](TESTING.md) and [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md). Remove this developer UI before release.

These descriptions summarize the source and earlier project decisions; recheck the active code and tests for changes.

## 5. Build and testing

Read [TESTING.md](TESTING.md) for exact commands and manual device coverage. The normal Mac/iPhone loop after merging into `ios-prep` is:

```sh
# In GitHub Desktop, switch to ios-prep and Pull Origin first
npm ci                   # when dependencies or lockfile change / initial setup
npm run build
npx cap sync ios
npx cap open ios
# Then build/run the App target on the physical iPhone in Xcode
```

Run the relevant `npm run validate:...` and `node scripts/validate_*.js` suites for the changed systems. Run a broader regression selection before declaring a risky audio, storage, or daily-reward change safe. Existing `package.json` does not define one complete all-tests command. The initial `ios-prep` workflow adds two automated jobs—selected Node regressions and a production web build—on PRs targeting `ios-prep` and on pushes to `ios-prep`. Its included Flashcards Patch 69 validator was updated to verify versioned caching and offline asset inclusion without depending on the obsolete Patch 72.1 cache name. It does **not** compile the native Xcode target, deploy GitHub Pages, or cover every historical validator. The workflow was merged in [PR #3](https://github.com/andydoane/biblozoo/pull/3); check GitHub Actions for the **current PR commit's actual runs** before claiming new tests passed. CI/test pass and **owner's iPhone verification** are distinct results.

## 6. PR collaboration workflow (mandatory)

For **all app, game, native, documentation and regression work**, use feature branches and PRs. For the native-audio experiment, also follow the staged gates in [§10](#10-native-avfoundation-experiment-roadmap--living-experiment-only):

1. Re-read this handoff, then **refresh GitHub `ios-prep` HEAD**, open/merged PRs, issues, relevant source, `package.json`, and any available checks. Do not design from a stale chat or handoff.
2. Confirm the owner's latest requirement. Check whether their local edits have been **committed and pushed**; GitHub cannot see unpushed work. Normally **do not request a ZIP** when GitHub holds the correct source.
3. Create a short-lived feature branch from the current PR **target branch**—normally `ios-prep`, or `experiment/native-ios-audio` for the explicitly isolated native-audio workstream—never `main`. Keep changes focused, preserving the guardrails above.
4. Implement the code, focused regression tests, and **handoff update in the same branch/PR**. Update [TESTING.md](TESTING.md) or [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md) when their contracts change.
5. Run what the environment actually supports; state commands, exact result and limitations truthfully. On GitHub, review any applicable Actions checks on the **final PR commit**, not an earlier one.
6. Open a PR targeting **`ios-prep` normally**, or **`experiment/native-ios-audio`** for the native-audio experiment. Prefer a draft while checks are incomplete; include the summary, risks, verification evidence, and a short iPhone checklist. **Leave it unmerged.** The owner reviews and merges.
7. After merge, the owner switches in GitHub Desktop to **the PR's target branch/worktree**, pulls, builds/syncs, and tests on a physical iPhone. If the device test fails, open a **follow-up PR** to that branch. An automated green check is not a claim of physical-device acceptance. Do not install experimental code using the original iPhone bundle identifier.
8. No direct pushes to `ios-prep` or `main`, PR merges, or releases without the owner's explicit instruction. Branches for each task, PR review, and owner-controlled merge are the default.

## 7. Mandatory handoff maintenance (self-perpetuating)

**Every future PR must update this file.** A future assistant reading this handoff must carry this instruction forward, not treat it as optional housekeeping:

- At the **start** of a task, compare this document with current `ios-prep`, recent commits, relevant PRs and tests; list any stale claims.
- **In the same PR as changes**, refresh the **last verified branch/commit and date**, update affected architecture/guardrail statements, note consequential decisions and test coverage, and revise the **Current work** table below. For a tiny change, a short accurate status/update is sufficient; do not append an endless patch-by-patch journal.
- Describe statuses precisely: **proposed**, **PR open**, **merged on `ios-prep`**, **automated checks passed**, **iPhone verified**, or **not yet verified**. Never turn one of these into another without evidence.
- Update [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md) and [TESTING.md](TESTING.md) whenever applicable. Keep links and filenames accurate.
- Include the handoff in the PR's changed files and tick the corresponding [PR template](../.github/pull_request_template.md) box. If unable to update it, disclose the reason in the PR and flag it as unfinished for the owner; **do not silently skip maintenance**.
- Document only durable decisions and actionable open work. Correct stale content rather than preserving it as authority. The source, current tests and owner's latest directions always win.
- **At the end of each PR**, tell the owner what this document now says, what was actually verified, and what remains for the owner to test.

This policy is deliberately written *inside* the handoff so a completely new conversation can continue maintaining it without the old chat.

## 8. Recent milestones (verify status on GitHub)

| `ios-prep` commit | Verified commit subject / scope |
| --- | --- |
| [`1e1deb2`](https://github.com/andydoane/biblozoo/commit/1e1deb2f8d486e55e95511a4b098d9b3d0aec252) | Patch 73–73.1: Feeding controls, sizes, weight feel, Melody presentation and UI polish |
| [`0c2b0ca`](https://github.com/andydoane/biblozoo/commit/0c2b0ca7677ee4b3aaa82cf0cf0bc84cc8c24484) | Patch 72.1C–72.1D: whole-app Zoo Escape and Zookeeper statistics |
| [`3c3c91e`](https://github.com/andydoane/biblozoo/commit/3c3c91ef2c3390478621ad119c4b2860b01a2c27) | Patch 72.1B–72.1B.5: Feeding Zoo Escape integration and polish |
| [`d5bf7a0`](https://github.com/andydoane/biblozoo/commit/d5bf7a05d4fdd90e67839408451327d9b5829f71) | Patch 72.1A: shared Zoo Escape framework |

These are historical milestones, **not** an exhaustive change log or evidence of final release acceptance.

## 9. Current work and next actions

**Last checked:** 2026-11-06. Experiment `experiment/native-ios-audio` is `dc13434e` after merged [PR #14](https://github.com/andydoane/biblozoo/pull/14); `ios-prep` unchanged. Owner confirmed **default Web Classic Feeding preview works**, but cannot check the DEV native audio box: it never gains a checkmark. Native star/chomp **gameplay routing has not yet been tested on iPhone**. The delegated intro handler's unconditional `preventDefault` cancels checkbox defaults. A narrow follow-up corrects the checkbox and immediate selected-state feedback, adds a test executing the actual delegated handler, and keeps all other gameplay, Web fallback, Zoo Escape and `.soloAmbient` rules unchanged. Rebuild/verify on iPhone before advancing to Stage D.

| Status at last check | Item | Next action |
| --- | --- | --- |
| **Merged [PR #2](https://github.com/andydoane/biblozoo/pull/2)** | GitHub PR workflow and living handoff | Keep handoff and experiment roadmap statuses updated in every future PR |
| **Merged [PR #3](https://github.com/andydoane/biblozoo/pull/3)** | Automatic regression and web-build checks on `ios-prep` PRs and pushes | Check current Actions results before each merge; still require manual native/iPhone acceptance |
| **Merged [PR #4](https://github.com/andydoane/biblozoo/pull/4); iPhone listening still pending** | Read My Verse feedback volume and [audio audit](READ-MY-VERSE-FEEDBACK-LEVELS.md) | Listen on iPhone against Tower of Bible / Verse Scramble at constant volume; verify narration/music remain unchanged |
| **Merged [PR #5](https://github.com/andydoane/biblozoo/pull/5); iPhone verification not reported** | Learn Listen/Chunks/Echo narration-only success gate, cleanup, focused simulated-clock regression in CI | Owner tests narration with UI Web Audio unavailable, ordinary playback, repeated backgrounding and retries on iPhone |
| **Merged [PR #6](https://github.com/andydoane/biblozoo/pull/6); iPhone verification not reported** | Verse Launch Game Menu / How to Play / Speed Menu pause for word conveyor, bonus activity clock and task-switch ownership | Owner tests live word movement, bonus asteroid timer, Help/Close/Mode Select, and task switch with menu open on iPhone |
| **Merged [PR #7](https://github.com/andydoane/biblozoo/pull/7); post-merge CI passed; Mac worktree issue resolved** | Normalize 21 CRLF tracked text blobs to LF under existing `.gitattributes` and add CI guard | Preserve LF requirement; owner-confirmed experimental worktree clean and synced to `c0a3b4bf` |
| **Merged [PR #8](https://github.com/andydoane/biblozoo/pull/8) into `experiment/native-ios-audio`; owner reports two-app installation successful** | Distinct test app name and bundle ID, identity validator, experimental-branch CI | Keep experiment and stable app separate; retain backups and confirm the `.audiotest` ID on any native build |
| **Merged [roadmap PR #9](https://github.com/andydoane/biblozoo/pull/9); post-merge CI passed** | Living staged audio migration plan and iPhone stop/go gates | Maintain the §10 table and follow a small reviewed PR per stage |
| **Merged [PR #10](https://github.com/andydoane/biblozoo/pull/10); partial initial native sound only** | First `AVAudioPlayer` pet-unlock pilot; existing Web Audio pop also played on every tap | Reframed device evidence: pop is unrelated; native MP3 fails on repeat tap. Stage B incomplete |
| **Merged [PR #11](https://github.com/andydoane/biblozoo/pull/11); device retest still fails repeat tap** | Recognize suspended/unknown interruption events and allow fresh tap after background/return | Owner observed one native MP3 per foreground interval, then `interruption-pending`; root cause remains unknown |
| **Merged [PR #12](https://github.com/andydoane/biblozoo/pull/12); native-only five-tap acceptance reported** | Suppressed normal Web Audio pop on DEV panel; added read-only native interruption diagnostics | Owner heard 5 consecutive pet-unlock samples without leaving the app, and sound after task switches; pending notification sometimes remains shown, so continue to observe and never equate bridge status with audibility |
| **Merged [PR #13](https://github.com/andydoane/biblozoo/pull/13); Stage C.1 device gate passed** | Added independent fixed-ID native AVAudioPlayers for real Feeding star/chomp MP3s and DEV test buttons, with no gameplay routing | Owner reports both clips and pet-unlock work repeatedly, even with rapid taps and task switches; occasional first-launch lag also seen in older builds, unmeasured |
| **Merged [PR #14](https://github.com/andydoane/biblozoo/pull/14) — C.2; native path blocked by checkbox bug on iPhone** | Default-off native star/chomp in iOS Classic tester preview; pre-round web fallback, fixed backend, recovery gates | Owner confirmed OFF/Web works, but the checkbox is unresponsive, so native gameplay has not been exercised; fix UI first |
| **Proposed fix on `fix/native-feeding-preview-checkbox`; not merged or iPhone-tested** | Allow experimental checkbox/label default click, immediate selected-state text, protect preflight from retoggling; leave other intro controls unchanged | Review source regression and full CI; after merge verify check/uncheck, ON preflight/backend label, actual sound and task-switch/Resume; no Stage D until accepted |
| **Merged in `ios-prep` code; device acceptance is separate** | Patch 73–73.1 Feeding refinements | Owner confirms final two-step chooser, tilt/drag isolation, Labyrinth response, Melody contact and Current Verse typography on iPhone |
| **Implemented in branch; release gate remains** | Zoo Escape developer test harness | Audit and disable/gate whole-app and Feeding hidden test controls before public release |
| **Not confirmed on a real failure in the prior acceptance conversation** | Genuine Zoo Escape statistics and Zoo Hero celebration | Check with a genuine failure if feasible; never award simulated credit simply to force a test |

Do not assume the above remains current after this PR merges or later work is done.

## 10. Native AVFoundation experiment roadmap — living, experiment-only

**Purpose and source.** This roadmap adapts the owner's *Reliable iOS Audio for BibloZoo — Architecture Decision and Migration Plan* (November 6, 2026), which reviewed the earlier `ios-prep` snapshot. Its high-level recommendation is to test a native **sound output** backend for Feeding before migrating other activities; it does not claim native playback cures every WebKit/iOS failure. Recheck the current source and the physical-device results after **each** PR. The original plan's Phase 0 / PR-A Learn gate fix is already merged as [PR #5](https://github.com/andydoane/biblozoo/pull/5), not a future experiment step.

**Branch and review rules.** Keep all experimental PRs based on and **targeted to `experiment/native-ios-audio`**, never `ios-prep` or `main`; the owner controls every merge. Update **this section** and the §9 status table in every experimental PR, including proposed PR identifier, merged state, test evidence and next stop/go decision. The owner's Mac `biblozoo-native-audio` worktree should remain on the experiment branch. **Never delete, reset, or overwrite** original BibloZoo data and Apple app identity to run the test. A later candidate for `ios-prep` needs a separate, explicit integration PR only after reproducible evidence.

### Planned PR sequence and gates

| Slice / state (as of November 6) | Proposed focused PR (number when opened) | Automated/source verification | Required owner iPhone gate before advancing |
| --- | --- | --- | --- |
| **A0 — completed** | [PR #5](https://github.com/andydoane/biblozoo/pull/5): Learn narration success no longer depends on unrelated app/UI AudioContext | Learn advancement/clock regression and CI; still review iPhone acceptance separately | Learn Listen/Chunks/Echo narration return across task switches, including simulated UI-context failure; does not prove native output |
| **A1 — completed** | [PR #8](https://github.com/andydoane/biblozoo/pull/8): separate iPhone app identity + CI | Capacitor, both Xcode bundle IDs, Info.plist, identity validator, experimental CI | Owner reports two separate apps installed/running; no native playback yet |
| **A2 — [PR #9](https://github.com/andydoane/biblozoo/pull/9), merged** | This documentation-only roadmap records stages, invariants, evidence and decisions | [Final-head CI](https://github.com/andydoane/biblozoo/actions/runs/42325283257) and [post-merge CI](https://github.com/andydoane/biblozoo/actions/runs/42325495772) passed; no native compile | Owner merged roadmap; stage B follows only on experiment branch |
| **B — [PR #10](https://github.com/andydoane/biblozoo/pull/10) merged; smoke result incomplete** | Native `ui_pet_unlock.mp3` with `AVAudioPlayer` behind explicit test button; standard capture-phase UI tap handler also plays `ui_sound_pop_1/2.mp3` | Initial native audible sample and Xcode compile reported; repeated native playback is unreliable, independent of always-heard Web Audio pop | Require **two consecutive audible native-only taps**, plus after-return operation, before PR C |
| **B.1 — [PR #11](https://github.com/andydoane/biblozoo/pull/11) merged; repeat-tap failure persists** | Refine `.began`/`.ended`/suspended notifications and explicit foreground-tap retry. No automatic activation | Node/web CI passed; iPhone retest shows native clip commonly only on first foreground tap, while normal Web Audio pop sounded on every tap | **Do not advance to C**; establish whether the global pop is involved and capture the actual interruption sequence |
| **B.2 — merged [PR #12](https://github.com/andydoane/biblozoo/pull/12), owner passed five consecutive native-only taps** | Existing `data-no-ui-sound` isolates DEV test from global Web Audio feedback; read-only iOS notification inspection | [Final CI](https://github.com/andydoane/biblozoo/actions/runs/42329926446) passed; owner heard all 5 native pet-unlock samples without task switching, plus playback during task-switch trials | Keep recording unmatched `.began` events; they do not alone veto owner-confirmed audibility; next verify the **actual Feeding clips independently** |
| **C.1 — merged [PR #13](https://github.com/andydoane/biblozoo/pull/13), iPhone sample acceptance reported** | Existing `dq_feed_star.mp3` and `dq_feed_chomp.mp3` bundled natively; three independent prepared native players, DEV panel sample buttons only | [Final GitHub Actions](https://github.com/andydoane/biblozoo/actions/runs/42333528757) passed. Owner heard all three samples rapidly/repeatedly and after task switching; no gameplay coupling | Proceed to C.2 **Classic tester-only** A/B; keep first-launch slowness as a separate unverified observation |
| **C.2 — [PR #14](https://github.com/andydoane/biblozoo/pull/14) merged; native A/B blocked on iPhone** | Default-off iOS `dailyTodoPreview` Classic-only checkbox, pre-round dual native preflight, Web fallback before start, fixed backend per round; no real Daily Feeding or non-Classic routing | Prior [PR #14 CI](https://github.com/andydoane/biblozoo/actions/runs/42335529586) passed. Owner confirmed Web OFF baseline, but clicking checkbox gives **no checkmark**, so native gameplay is **unverified** | Fix the delegated checkbox click; retest OFF and ON actual iPhone, repeats and Welcome Back before moving to D |
| **C.2a — proposed on `fix/native-feeding-preview-checkbox`; not merged/device-retaken** | Preserve native checkbox/label default action by exempting only its click from intro `preventDefault()`; show immediate selected text, disable retoggle only during async preflight, clean up listener | Run focused actual overlay-handler click default regression plus existing C.2, Feeding/Zoo Escape and web-build tests; no Swift/native session change | Owner confirms **checkmark appears/disappears on two taps**, status updates, Got It! native preflight and Native/Web badge; then full gameplay star/chomp, Resume and progress acceptance |
| **D — reliability measurement and decision** | Small instrumentation/report PR only if useful; no broad rewrite. Log local bounded, opt-in event IDs, timestamps, backend, accepted/error and lifecycle epochs—**not** verse content/recordings/profile data | Event schema and reset/exit privacy tests; no “accepted means audible” assertion | Compare original web vs native on matched device/settings. Target **100 normal returns plus 100 mixed interruption/route tests across two iPhone configurations where feasible**; record silence, delay, duplicate, route, crash and lost progress. A clean run is promising, not proof of universal reliability |
| **E — only if C/D justify** | Feeding Melody/peg tones and overlapping/polyphonic effects using a bounded AVAudioEngine or sample/player pool; do not casually migrate synthesized tones in C | Priority/voice budget, overlap, latency, stop/epoch, mute and error tests | Melody score/timing and collisions unchanged; ear-check latency/quality on actual device; revert if worse |
| **F — only after reliable Feeding** | Separate Learn verse-MP3/chunk/echo native narration adapter with playback/completion IDs; preserve HTML/web fallback and progress | Specific source-ID/segment/owner-generation/recovery regressions | Repeated task-switch narration resumes the **correct** verse/chunk, no ghost completion, no UI-context veto |
| **G — gradual, separate PRs** | Individual games and Playground activity effects; then Read My Verse *prerecorded* sound, then Flashcards *simple output* only | Per-activity game ownership and welcome-back gates, recorder safety, saved progress and rewards tests | Preserve game score/timer, Read My Verse audio/animation timeline and Flashcards microphone recording; never auto-restart mic or Wacky Replay |
| **H — release or stop** | Clean up dead paths **only after** measured evidence and separate explicit approval for integration into `ios-prep`; otherwise leave experiment isolated or turn pilot off | Full web/build and selected cross-activity suites, Xcode build, documentation and hidden-test-harness audit | Owner-approved release/rollback decision, family backups, real iPhone checks for offline/lock/route/headphones/microphone; no claim that CI replaces device tests |

### Hard contracts for every pilot PR

- **Session policy:** Preserve native `AVAudioSessionCategorySoloAmbient`, the current diagnostics and bounded `setActive(true)` recovery. Do **not** change category, background audio entitlement, or microphone capture policy during the first pilot. No automatic native `setActive` on launch, foreground or incidental UI sound.
- **Truth of sound:** `preload`/bridge `resolve`, a successful activation request, `AVAudioPlayer.isPlaying` and native timeline progress **do not prove hardware audibility**. Separate `available`, `accepted`, `progress` and **human-audible** verification, and retain the activity-owned Welcome Back / Zoo Escape gate.
- **Safety:** Pass allowlisted logical sound IDs only; reject URL/path traversal, nonfinite volume, stale owner/foreground epochs, and unexpected commands during interruptions/recording. Stop native voices on background/exit/mute. Do not queue stale collision audio for a later foreground.
- **Fallback:** Pilot switch defaults off; if plugin or assets unavailable, choose existing web backend before gameplay starts. Never play native **and** web for the same event. If native fails mid-round, preserve gameplay safely, surface bounded recovery/exit and do not silently swap engines under timing-sensitive game state.
- **Assets:** One minimal, explicitly bundled iOS asset for B, with an Xcode Copy Bundle Resources check. Do not assume `dist/ui_audio` URL equals a Swift `Bundle.main` resource path. Keep all web assets for PWA/Android.
- **Privacy and progress:** No microphone bytes, recordings, verse text, profile names, reward or backup-schema changes in the native pilot. Logs must be local, opt-in, bounded, and user-exported only. No accidental completion, second reward, lost active round or auto recording.
- **Tests and sign-off:** Each PR has `node`/web CI and focused mocks; the owner must additionally confirm native **Swift compilation, signing, packaged asset and audible iPhone behavior**. Every PR explicitly reports what was and was not tested.

### A/B evidence to record before expanding

Use the same iPhone/iOS version, volume, sound route, mute setting and action sequence for web baseline and native pilot. Count ordinary Home/app-return, lock/unlock, fast app switches, other music, Bluetooth/headphone routes, microphone interaction and offline cold start. Record **backend**, **sound event actually heard**, delay/duplicates, interruption state, game progress and action taken. Native bridge acceptance must **never** be recorded as “heard.” Stop/revert if a native sound stalls or duplicates, source IDs drift, game progress/rewards change, session policy is stolen, or microphone capture regresses.

**Next actionable handoff:** review the narrow **C.2a checkbox follow-up** from `fix/native-feeding-preview-checkbox`, targeting `experiment/native-ios-audio` **only**. Once the owner merges, GitHub Desktop `biblozoo-native-audio` worktree → Fetch/Pull, then in VS Code run `node scripts/validate_native_feeding_preview_c2.js`, `npm run build`, `npx cap sync ios`, `npx cap open ios`, and build/run the `com.andydoane.biblozoo.audiotest` App target. Open Classic Feeding Game Tester, choose Drag, then confirm the native checkbox visibly checks/unchecks on consecutive taps, updates `Native selected`/`Web effects selected` without starting a round, and defaults OFF in a fresh preview. Select ON → Got It! and verify native preflight/backend label and actual audible star/chomp on events; compare OFF/Web and recheck pause/Welcome Back and no rewards. **Do not claim C.2 is accepted or start Stage D until the owner reports iPhone acceptance.**

## 11. First steps in a brand-new ChatGPT chat

The owner can say:

> **For normal BibloZoo work:** Read `docs/PROJECT-HANDOFF.md` on the `ios-prep` branch of `andydoane/biblozoo`. Verify current HEAD, PRs, source and tests; target `ios-prep` and leave merges to me. **For the native-audio experiment:** Read the living roadmap (§10) on `experiment/native-ios-audio`, check its current HEAD and native files, use a short-lived feature branch targeting `experiment/native-ios-audio` (not `ios-prep`), keep the test iPhone app isolated, document source/Node versus actual Xcode/device verification, and update the handoff and roadmap statuses in every PR.**

If this document conflicts with current code or owner feedback, **verify and correct it** in the next PR. The purpose is continuity, not a second repository of truth.
