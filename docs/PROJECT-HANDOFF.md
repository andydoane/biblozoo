# BibloZoo — Living Project Handoff

> **Orientation snapshot, not source of truth.** This document is for future ChatGPT conversations and contributors. The current GitHub `ios-prep` branch, its source, tests, PRs, and the owner's latest instructions are authoritative. **Verify them before acting.** Never presume a task is still open, a PR is merged, or a device test passed merely because it appears here.
>
> **Mandatory maintenance:** Every BibloZoo PR must review and update this handoff **in the same PR**, including code fixes and follow-ups. See [§7](#7-mandatory-handoff-maintenance-self-perpetuating) and the [PR template](../.github/pull_request_template.md).

- **Repository:** https://github.com/andydoane/biblozoo
- **Active integration branch and usual PR target:** `ios-prep` (not `main`). **Explicit owner-approved exception:** native audio experiments use `experiment/native-ios-audio` as the PR target and separate Mac worktree, until tested changes are approved for integration.
- **Last verified against `ios-prep` and `experiment/native-ios-audio`:** 2026-11-06, both at `c0a3b4bfc32e52a17b2f9227b6f899a6345ff5f4` (PR #7 merged and LF-cleaned; [post-merge CI passed](https://github.com/andydoane/biblozoo/actions/runs/42323470774)). The experimental app identity is **open as [PR #8](https://github.com/andydoane/biblozoo/pull/8)** on `setup/native-audio-test-identity`, targeting `experiment/native-ios-audio`; it is not merged or iPhone-verified.
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
- **Native-audio experiment identity ([PR #8](https://github.com/andydoane/biblozoo/pull/8), open):** A branch `setup/native-audio-test-identity` from `experiment/native-ios-audio` changes the *experimental copy only*: Capacitor `appId=com.andydoane.biblozoo.audiotest` and `appName=BibloZoo Audio Test`, Xcode App target Debug/Release `PRODUCT_BUNDLE_IDENTIFIER` to the same unique ID, and Info.plist `CFBundleDisplayName` to `BibloZoo Audio Test`. The existing development-team identifier, Info.plist microphone permission, AVAudioSession, app icon artwork, data formats, rewards, web runtime, and native audio logic are unchanged. This lets the test app coexist with original BibloZoo if signing and installation succeed. It does **not** clone families or saved profiles between app containers. Owner must export a backup, verify Xcode target signing and test bundle ID, build/sync and install on a physical iPhone before any new native audio pilot. The experimental workflow adds triggers for later PRs/pushes to `experiment/native-ios-audio`; its *first* PR will not have automatic checks until the workflow is merged into the base. See [TESTING.md](TESTING.md).

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

For **all app, game, native, documentation and regression work**, use feature branches and PRs:

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

**Last checked:** 2026-11-06, `ios-prep` and `experiment/native-ios-audio` both at `c0a3b4bf` after [PR #7](https://github.com/andydoane/biblozoo/pull/7) merged, with [post-merge integration CI success](https://github.com/andydoane/biblozoo/actions/runs/42323470774). The owner fetched, reset the previously unchanged experiment branch to the same commit, confirmed LF/clean status, and pushed it. [PR #8](https://github.com/andydoane/biblozoo/pull/8) introduces the separate iPhone test identity, **targets `experiment/native-ios-audio`**, and has not merged or been iPhone-verified. The initial PR has **no automatic CI trigger** because the base experiment branch does not yet contain the new workflow configuration; source consistency was inspected, not natively compiled. CI for PRs targeting `experiment/native-ios-audio` first becomes active **after this setup PR's workflow change is merged**.

| Status at last check | Item | Next action |
| --- | --- | --- |
| **Merged [PR #2](https://github.com/andydoane/biblozoo/pull/2)** | GitHub PR workflow and living handoff | Keep handoff updated in every future PR |
| **Merged [PR #3](https://github.com/andydoane/biblozoo/pull/3)** | Automatic regression and web-build checks on `ios-prep` PRs and pushes | Check current Actions results before each merge; still require manual native/iPhone acceptance |
| **Merged [PR #4](https://github.com/andydoane/biblozoo/pull/4); iPhone listening still pending** | Read My Verse feedback volume and [audio audit](READ-MY-VERSE-FEEDBACK-LEVELS.md) | Listen on iPhone against Tower of Bible / Verse Scramble at constant volume; verify narration/music remain unchanged |
| **Merged [PR #5](https://github.com/andydoane/biblozoo/pull/5); iPhone verification not reported** | Learn Listen/Chunks/Echo narration-only success gate, cleanup, focused simulated-clock regression in CI | Owner tests narration with UI Web Audio unavailable, ordinary playback, repeated backgrounding and retries on iPhone |
| **Merged [PR #6](https://github.com/andydoane/biblozoo/pull/6); iPhone verification not reported** | Verse Launch Game Menu / How to Play / Speed Menu pause for word conveyor, bonus activity clock and task-switch ownership | Owner tests live word movement, bonus asteroid timer, Help/Close/Mode Select, and task switch with menu open on iPhone |
| **Merged [PR #7](https://github.com/andydoane/biblozoo/pull/7); post-merge CI passed; Mac worktree issue resolved** | Normalize 21 CRLF tracked text blobs to LF under existing `.gitattributes` and add CI guard | Preserve LF requirement; owner-confirmed experimental worktree clean and synced to `c0a3b4bf` |
| **Open [PR #8](https://github.com/andydoane/biblozoo/pull/8), targeting `experiment/native-ios-audio`; not merged or iPhone verified; no pre-merge CI trigger** | Distinct native test app name and bundle ID, source-level validator, experiment-branch CI triggers | Owner reviews setup PR; after merge pulls the **experimental worktree**, runs `node scripts/validate_native_audio_test_identity.js`, builds/syncs, checks Xcode signing and tests coexistence on iPhone |
| **Merged in `ios-prep` code; device acceptance is separate** | Patch 73–73.1 Feeding refinements | Owner confirms final two-step chooser, tilt/drag isolation, Labyrinth response, Melody contact and Current Verse typography on iPhone |
| **Implemented in branch; release gate remains** | Zoo Escape developer test harness | Audit and disable/gate whole-app and Feeding hidden test controls before public release |
| **Not confirmed on a real failure in the prior acceptance conversation** | Genuine Zoo Escape statistics and Zoo Hero celebration | Check with a genuine failure if feasible; never award simulated credit simply to force a test |

Do not assume the above remains current after this PR merges or later work is done.

## 10. First steps in a brand-new ChatGPT chat

The owner can say:

> **Read `docs/PROJECT-HANDOFF.md` on the `ios-prep` branch of `andydoane/biblozoo`. Check current branch HEAD, open PRs, recent commits, relevant source and tests. Treat my latest instructions and GitHub as authoritative. Make changes through feature branches and PRs targeting `ios-prep`, leave merges to me, and update the living handoff in every PR.**

If this document conflicts with current code or owner feedback, **verify and correct it** in the next PR. The purpose is continuity, not a second repository of truth.
