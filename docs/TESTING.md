# BibloZoo — Testing, PR Review, and iPhone Acceptance

> This document describes the **current `ios-prep` workflow**, verified against source on 2026-11-05. Check [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md), `package.json`, and the current scripts before claiming any test exists or passed. Automated checks and physical iPhone acceptance are different.

## 1. Working with GitHub pull requests

1. Before work, check current `ios-prep` HEAD, latest commits, open PRs and owner instructions. Local uncommitted changes are **not** visible to GitHub; have the owner push relevant work first when necessary.
2. Branch from latest `ios-prep`, **not `main`**. Make focused edits with tests and an update to [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) **in the same PR**. Update this guide/audio guide if contracts change.
3. Open a PR with **base `ios-prep`**; draft while incomplete. Include risk, changed behavior, exact validators run, their results, and what needs the iPhone.
4. Inspect the PR diff and available Actions status on the **final commit**. If checks don't exist, don't imply they ran. A docs-only PR need not alter runtime code or bump an app version.
5. **The owner reviews and merges**; the assistant does not merge or push directly to `ios-prep` unless separately instructed.
6. In GitHub Desktop: switch to `ios-prep` → **Fetch Origin / Pull Origin**. Build, sync, run on iPhone, and report failures; address those in a focused follow-up PR.

For especially risky changes, the owner may instead check out/test the PR branch *before* merging. That is optional, but enables pre-merge iPhone acceptance.

## 2. Local setup and production build

From the repository root on macOS:

```sh
git status --short
git branch --show-current         # should be ios-prep after the merge and pull
npm ci                             # initial setup or lockfile/dependency changes
npm run build                      # scripts/build.js regenerates ignored dist/
npx cap sync ios                   # copies dist/ and syncs Capacitor project
npx cap open ios                   # then build/run App target in Xcode
```

Capacitor config is `capacitor.config.json`, application ID `com.andydoane.biblozoo`, web directory `dist`. A successful `npm run build` doesn't prove native playback or layout is correct. The native iOS bundle uses copied assets; the web/PWA separately uses `service-worker.js` caching. Check both if offline behavior changes.

Do not commit `dist/` or `node_modules/` (both ignored). After changing runtime assets, regenerate `dist/` **before** syncing; avoid interpreting stale bundled files as a code regression.

## 3. Existing automated validation commands

**Package scripts currently declared in `package.json`:**

```sh
npm run validate:daily-questions
npm run validate:daily-question-sessions
npm run validate:daily-question-generators
npm run validate:daily-zoo-todo
npm run validate:daily-feed-game
npm run validate:read-my-verse
```

**Additional direct Node validators relevant to recent systems:**

```sh
# Feeding selection, input locking, visuals/physics and audio
node scripts/validate_patch73_feeding_controls.js
node scripts/validate_patch73_feeding_controls_polish.js
node scripts/validate_patch73_1_feeding_polish.js
node scripts/validate_feeding_audio_bounce_patch24.js

# Zoo Escape and achievement safeguards
node scripts/validate_patch72_1a_zoo_escape.js
node scripts/validate_patch72_1b_feeding_zoo_escape.js
node scripts/validate_patch72_1c_whole_app_zoo_escape.js
node scripts/validate_patch72_1c1_whole_app_test_harness.js
node scripts/validate_patch72_1c2_identity_artwork_exit.js
node scripts/validate_patch72_1c3_zoo_escape_sounds.js
node scripts/validate_patch72_1d_zookeeper_stats.js

# Other recovery/recording owners
node scripts/validate_playground_welcome_back_patch68.js
node scripts/validate_flashcards_patch69.js
node scripts/validate_read_my_verse_audio_patch70_2.js
node scripts/validate_app_audio_patch23b.js
```

This is a **starting selection, not every validator**. There are many historical `scripts/validate_*.js` programs. Choose the suites appropriate to the change, and run broader recovery/regression coverage for shared code. Record precise failures; don't label a failing old test “outdated” without investigating it. Check for actual missing runtime assets versus broken code.

### Automatic GitHub Actions validation for `ios-prep`

The new workflow `[.github/workflows/ios-prep-validation.yml](../.github/workflows/ios-prep-validation.yml)` is introduced in a dedicated CI PR. It runs when **any PR targets `ios-prep`** (including when new commits update that PR) and whenever commits are **pushed or merged to `ios-prep`**. There is no path filter, so documentation-only PRs trigger the checks too.

GitHub will display two separately named jobs:

- **Node regression checks:** `npm ci`, all six existing package validation scripts, Feeding 73–73.1, current Zoo Escape/statistics, Flashcards, Read My Verse, and app audio tests.
- **Production web build:** `npm ci`, `npm run build`, then checks that key `dist/` runtime files were created.

The jobs use an Ubuntu runner, Node.js 22, read-only repository permissions, npm lockfile, and no deployment credentials. **This is not a native Xcode/iOS build, an App Store release, or a GitHub Pages deployment.** Physical iPhone and offline/audio-interruption tests still belong to the owner.

Some older patch-specific validators hard-code historic service-worker cache version strings (for example an Oct 26 stamp). The included Flashcards Patch 69 validator was updated in this CI PR to check the **durable versioned-cache and offline-asset contract** instead of requiring an obsolete Patch 72.1 substring. Other historical validators with stale patch-version assertions remain outside this initial CI selection; do not mistake their absence for full recovery regression coverage. For related changes, run older tests deliberately, refreshing stale assertions only when their underlying contract still applies.

**How to see results:** Open [Actions filtered to `ios-prep`](https://github.com/andydoane/biblozoo/actions?query=branch%3Aios-prep) for post-merge push runs. A PR's **Checks** tab (and overall Actions history) shows its PR-triggered run even though its head is a feature branch; filtering Actions by `branch:ios-prep` may not show every pre-merge PR run. Workflow files and run history are separate: when first introduced, confirm the workflow appears and that GitHub reports actual jobs before telling the owner CI passed. Recheck GitHub Actions repository settings if events are disabled.



## 4. Physical iPhone smoke tests

Choose cases from each affected group and report device/iOS version when useful:

| Feature | What to check on the device |
| --- | --- |
| Main app / Current Verse | Main home, Verse selection, font, clickable Current Verse, navigation to My Verses |
| Feeding — four modes | Two-step Tilt/Drag chooser, full-size icons, Got It!, selected-input isolation, Tilt permission denial fallback |
| Bounce and Melody | Larger ball/snack art, collision geometry, Melody note/contact synchronization, Bounce between-serves flow |
| Labyrinth | Different per-ball acceleration/weight feel and non-overlapping platform impact sounds |
| Learning and 12 games | Same verse/score/timer after task switch; real audio-clock recovery before resume |
| Playground — 5 activities | Preserve text/drawing/musical state and return cleanup |
| Flashcards / Read My Verse | Preserve recording/playback state; no auto microphone restart |
| Zoo Escape | Stage 2 / Stage 3 / pending interruption / safe exit / pet rescue state after repeated backgrounding |
| Daily Questions and Zoo To-Do | One-time completion, correct reward protection and special exit routing |
| Accessibility | Reduced Motion, tap-then-pen alternative, readable controls and screen-reader announcements |
| Offline | Correct local images/fonts/sounds and standalone game shell behavior in the intended web or native deployment |

If an interrupted AudioContext *won't* fail, use the deliberate developer harness to test visuals and exit. **Developer simulations do not validate genuine rescue achievement credit**. Do not break native audio or mark those unobserved achievement events as passed.

## 5. Results and release status in PRs / the handoff

Keep separate labels:

- **Implemented in PR:** Code exists on a PR branch, not yet on `ios-prep`.
- **Automated validated:** State exact commands, commit/ref, and pass/fail output; command suggestions aren't results.
- **Merged to `ios-prep`:** Verify PR merge and target commit.
- **iPhone verified:** Owner actually tested the merged (or checked-out PR) build and reported success.
- **Release-ready:** Separate gate: all mandatory tests/acceptance done, developer test controls disabled, native signing/version/privacy checked.

For every PR, revisit the [handoff](PROJECT-HANDOFF.md), update its date/baseline/current work/technical decisions in the **same PR**, and explain in the description what changed. Never copy stale milestone statuses forward without checking GitHub.

## 6. Test and rollback hygiene

- Preserve user saves, localStorage keys, profile IDs, backups, and rewards. If migration is necessary, validate old and new values and fail safely.
- Test both success and failure/deferred/exit paths for recovery and lifecycle work; no accidental double completion.
- Check resource cleanup (timers, RAF, pointer events, audio contexts, background observers).
- Test web/PWA offline caching and native Capacitor packaging separately; update asset cache manifest/version only when relevant to runtime changes.
- Keep PR changes focused for straightforward review and Git revert. If the owner discovers a regression, prefer a small follow-up PR; if serious, revert the merged PR deliberately rather than layering unreviewed local patches.

## 7. Documentation-only PR acceptance

For the initial living-handoff PR, review the Markdown files, README link, PR template, and cross-links against current `ios-prep`. No gameplay, audio, service worker, bundle version, or native file should be changed. Report documentation inspection separately from tests that were *not run*.

New PRs should keep this testing guide updated as commands, CI, and release workflows evolve.
