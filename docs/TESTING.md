# BibloZoo — Testing, PR Review, and iPhone Acceptance

> This document describes the **current `ios-prep` workflow**, verified against source on 2026-11-05. Check [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md), `package.json`, and the current scripts before claiming any test exists or passed. Automated checks and physical iPhone acceptance are different.

## 1. Working with GitHub pull requests

1. Before work, check current `ios-prep` HEAD, latest commits, open PRs and owner instructions. Local uncommitted changes are **not** visible to GitHub; have the owner push relevant work first when necessary.
2. Branch from latest `ios-prep`, **not `main`**. Make focused edits with tests and an update to [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) **in the same PR**. Update this guide/audio guide if contracts change.
3. Open a PR with **base `ios-prep`** for ordinary development, or **base `experiment/native-ios-audio`** for the isolated native-audio experiment. Draft while incomplete. Include risk, changed behavior, exact validators run, their results, and what needs the iPhone.
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

On `ios-prep`, Capacitor config is `capacitor.config.json`, application ID `com.andydoane.biblozoo`, web directory `dist`. The isolated native-audio experiment instead uses `com.andydoane.biblozoo.audiotest` after the experimental identity PR is merged. A successful `npm run build` doesn't prove native playback or layout is correct. The native iOS bundle uses copied assets; the web/PWA separately uses `service-worker.js` caching. Check both if offline behavior changes.

Do not commit `dist/` or `node_modules/` (both ignored). After changing runtime assets, regenerate `dist/` **before** syncing; avoid interpreting stale bundled files as a code regression.

### macOS worktree: 21 CRLF-only tracked files (November 2026)

The repository already declares `*.js`, `*.css`, `*.html`, `*.json`, `*.md` and `*.txt` as `text eol=lf` in `.gitattributes`. However, the `ios-prep` base at `f4a80c35` still contained 20 JSON files and `verse_playground/ghost_writer/game.css` as CRLF *committed blobs*. A fresh macOS worktree therefore reported 21 modified files immediately. `git ls-files --eol -- <path>` showed `i/crlf w/crlf attr/text eol=lf` even though `git --no-pager diff --ignore-space-at-eol --stat 2>/dev/null` produced no meaningful diff. This is not a source-data change, and changing `core.autocrlf` or repeatedly clicking Discard does not fix the inconsistent index blobs.

The focused `fix/normalize-lf-tracked-text` PR changes only CRLF to LF and adds a Node check of the **committed blob bytes** as well as the checked-out file bytes. After the owner merges it into `ios-prep`, an existing `experiment/native-ios-audio` branch must also be advanced; **Fetch Origin by itself does not move the local branch**. For the specific freshly created experiment branch, only if there are no valuable local edits or separate commits, verify the expected line-ending-only diff, then fetch the merged baseline and run `git reset --hard origin/ios-prep` **inside the experimental worktree**, check `git status --short` and `git ls-files --eol`, and push the updated experiment branch. That reset deliberately discards *all* uncommitted tracked-file changes and resets the branch pointer: never run it if the experiment already contains independent work. Prefer a normal merge or a separate PR to sync a branch containing work.

### Isolated native-audio experiment — Mac/Xcode smoke check

The `experiment/native-ios-audio` branch has a dedicated macOS worktree (`biblozoo-native-audio`). Its **test app identity must be different from the existing installed BibloZoo app**:

| Property | Stable `ios-prep` | Native-audio experiment |
| --- | --- | --- |
| App label | BibloZoo | BibloZoo Audio Test |
| Capacitor `appId` | `com.andydoane.biblozoo` | `com.andydoane.biblozoo.audiotest` |
| Xcode Debug + Release `PRODUCT_BUNDLE_IDENTIFIER` | `com.andydoane.biblozoo` | `com.andydoane.biblozoo.audiotest` |
| Info.plist `CFBundleDisplayName` | BibloZoo | BibloZoo Audio Test |

After the experiment-specific setup PR is **merged into `experiment/native-ios-audio`**, switch to that worktree in GitHub Desktop, Fetch/Pull Origin, and in **that folder** use:

```sh
git branch --show-current            # experiment/native-ios-audio
git status --short                   # should be clean before syncing
npm ci                               # if new worktree dependencies not yet installed
node scripts/validate_native_audio_test_identity.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select the **App** target, open **Signing & Capabilities**, confirm the **Bundle Identifier** ends in `.audiotest`, select the owner's valid Apple development **Team**, and enable **Automatically manage signing** as needed. The existing project's team setting has deliberately *not* been changed in source. Select the physical iPhone as the run destination, then Build/Run and confirm **BibloZoo** and **BibloZoo Audio Test** appear as separate apps. Do **not** run/install a test build if Xcode still shows `com.andydoane.biblozoo`; that identifier could replace the existing app. Export a family backup first, and don't assume existing profiles/progress carry over to the separate bundle ID. The test icon currently shares artwork with the normal app—read the home-screen labels.

The setup PR changes **only identity**, not native playback. Check a normal verse/game and ordinary sound, plus basic foreground/background behavior before adding experimental audio code. No native app compile or on-device signing can be validated by web/Node CI.

The workflow file is extended **only on the experimental branch** to watch PRs/pushes to `experiment/native-ios-audio` and run the identity validator there, while keeping `ios-prep` compatible if the workflow is ever integrated. GitHub **did start a PR Actions run on the initial identity setup PR (#8)** even though the pre-merge experiment branch lacked the updated trigger; check the **final PR commit's actual Checks tab** rather than assuming checks are absent or have passed. After owner merge, also verify the experimental branch's post-merge push checks and subsequent PR checks. None of these Node/web jobs compiles or signs native iOS code.

### PR B: one-sound native iPhone smoke test (experiment branch only)

The `experiment/native-sound-smoke-test` PR adds a branch-only `BibloZooNativeSound` Capacitor 8 plugin (`ios/App/App/BibloZooNativeSoundPlugin.swift`). It uses **AVAudioPlayer** with one allowlisted ID `pilot-unlock`, mapped to existing `ui_audio/ui_pet_unlock.mp3`. Xcode's App target **Sources** explicitly includes the Swift file, and **Copy Bundle Resources** explicitly includes the MP3 at the root of the app bundle. This is *separate* from the copied `dist/ui_audio` web asset; the plugin looks up `Bundle.main.url(forResource: "ui_pet_unlock", withExtension: "mp3")`. No new binary asset or rights assumption is needed.

The developer panel `verse_games/shared/native-sound-smoke-test.js` appears at the top-right of **the experimental native iOS app only**. It is installed for this experiment, deliberately not public-release UI. There is **no auto-play or gameplay routing**; a human tap sends `preload("pilot-unlock")` followed by `play("pilot-unlock", volume:0.85)` with bounded JS wait, then offers an honest prompt asking whether the sound was **actually heard**. A native `accepted:true` is NOT a sound-health/recovery verdict.

After the owner merges this PR **into `experiment/native-ios-audio` only**:

```sh
# Run from the biblozoo-native-audio worktree; Fetch/Pull Origin first.
git branch --show-current            # experiment/native-ios-audio
git status --short                   # clean before building
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode's **App** target: verify **Signing & Capabilities** still has bundle ID `com.andydoane.biblozoo.audiotest` and the owner's development Team. Inspect **Build Phases → Compile Sources** for `BibloZooNativeSoundPlugin.swift` and **Copy Bundle Resources** for `ui_pet_unlock.mp3`. If the test asset is missing at runtime, check that resource phase before modifying Web Audio or `dist`. Run on the **real iPhone**, not just simulator; leave the original BibloZoo installed.

Manual gate — report observed results rather than assuming them:
- Launch **BibloZoo Audio Test**: normal app works; **no sample sound on launch**. See small **DEV · Native Audio** panel; if absent, confirm the native project actually rebuilt and the test app is current.
- Tap **Play native test sound** once: a brief unlock sound should be audible with sound enabled. The panel should say **"Native playback requested. Did you hear the sound?"** only when native `AVAudioPlayer.play()` reported accepted. This is **not** automated proof of hearing.
- Repeat with silent switch enabled: audio may be silent under intentional `.soloAmbient`; do not call that a defect. Compare with sound on and stable BibloZoo at the same hardware volume.
- Background/lock/unlock, then foreground: there must be **no automatic replay**. Tap again; confirm audible output. A task switch while a preload is pending should cancel the old JS request and native sound rather than queue a stale sound.
- Try wired/headphone/Bluetooth output and route changes if available: sound should follow current output on a fresh tap, never self-resume or leave a repeating clip.
- Tap **×** to dismiss the test panel: native sound stops and the panel does not interfere with normal gameplay. Feeding effects and the Web Audio/HTML recovery/Welcome Back/Zoo Escape paths are intentionally **unchanged**.
- In the case of **Native bridge missing**, **bundled-asset-missing**, `category-not-soloambient`, Xcode Swift compiler errors or silent output despite sound enabled, report the exact label/error; **pause before Feeding PR C**.

The plugin deliberately never calls `setCategory`, `setMode`, or `setActive`. It guards `.soloAmbient`, foreground and interruptions; rejects non-allowlisted IDs/invalid volumes; and forgets the player on app inactivity, route changes and media resets. These safeguards do not replace recording/microphone tests later.

**Automated check:** `node scripts/validate_native_sound_smoke_test.js` validates static Xcode source/resource memberships and runs the real smoke JavaScript in a Node VM for missing-bridge, missing-asset response, bounded timeout, double-tap, background cancellation, explicit tap and no web/PWA UI. It is added to the experiment-only CI job. GitHub Actions do **not** compile Swift or verify actual iPhone audibility; the owner's reported results decide whether PR C is allowed.

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
node scripts/validate_read_my_verse_feedback_levels.js
node scripts/validate_app_audio_patch23b.js
node scripts/validate_learn_narration_recovery_gate.js

# Verse Launch Game Menu / How to Play / Speed Menu / bonus pause
node scripts/validate_verse_launch_menu_pause.js

# Committed LF source and consistent macOS worktrees
node scripts/validate_tracked_lf_endings.js

# Experimental iOS app identity (only on the native-audio experiment branch)
node scripts/validate_native_audio_test_identity.js

# PR B explicit native sound test (experiment branch only)
node scripts/validate_native_sound_smoke_test.js
```

This is a **starting selection, not every validator**. There are many historical `scripts/validate_*.js` programs. Choose the suites appropriate to the change, and run broader recovery/regression coverage for shared code. Record precise failures; don't label a failing old test “outdated” without investigating it. Check for actual missing runtime assets versus broken code.

### Automatic GitHub Actions validation for `ios-prep`

The workflow [`.github/workflows/ios-prep-validation.yml`](../.github/workflows/ios-prep-validation.yml) was merged in [PR #3](https://github.com/andydoane/biblozoo/pull/3). It runs when **any PR targets `ios-prep`** (including when new commits update that PR) and whenever commits are **pushed or merged to `ios-prep`**. There is no path filter, so documentation-only PRs trigger the checks too.

GitHub will display two separately named jobs:

- **Node regression checks:** `npm ci`, the committed-blob LF line-ending guard, all six existing package validation scripts, Feeding 73–73.1, current Zoo Escape/statistics, Verse Launch menu pause, Flashcards, Read My Verse, and app audio tests.
- **Production web build:** `npm ci`, `npm run build`, then checks that key `dist/` runtime files were created.

The jobs use an Ubuntu runner, Node.js 22, read-only repository permissions, npm lockfile, and no deployment credentials. **This is not a native Xcode/iOS build, an App Store release, or a GitHub Pages deployment.** Physical iPhone and offline/audio-interruption tests still belong to the owner.

Some older patch-specific validators hard-code historic service-worker cache version strings (for example an Oct 26 stamp). The included Flashcards Patch 69 validator was updated in this CI PR to check the **durable versioned-cache and offline-asset contract** instead of requiring an obsolete Patch 72.1 substring. Other historical validators with stale patch-version assertions remain outside this initial CI selection; do not mistake their absence for full recovery regression coverage. For related changes, run older tests deliberately, refreshing stale assertions only when their underlying contract still applies.

**Learn narration return gate (focused fix on `fix/learn-narration-recovery-gate`):** `scripts/validate_learn_narration_recovery_gate.js` uses the actual Learn recovery functions in a simulated media-clock harness. It asserts that an advancing narration clock can succeed even when the unrelated UI Web Audio unlock fails or hangs, and that blocked/stalled media, stale attempts, second interruptions and source changes cannot fake success. It is included in CI for this PR; physical iPhone listening remains mandatory. Older `validate_learn_resume_overlay_patch19a.js` has historical expectations for the replaced two-engine gate and is not the acceptance test for this change.

**Verse Launch menu pause (proposed in `fix/verse-launch-menu-pause`):** `scripts/validate_verse_launch_menu_pause.js` executes the actual Verse Launch menu and loop callbacks against a simulated clock/animation scheduler, covering conveyor stop/restart, Help and Speed overlays, bonus asteroid/menu pause, and task-switch/Welcome Back overlap. Included as a dedicated CI step on this PR. In the original source the bonus asteroid loop already skipped menu/help physics; this fix also freezes the shared activity clock while a local overlay owns pause, without releasing a pending Welcome Back pause. Manual iPhone checks must verify visible word motion, bonus timer/asteroid movement, Help/Close/Mode Select, and backgrounding with menus open.

**Read My Verse beep level audit:** [Feedback Sound Level Audit](READ-MY-VERSE-FEEDBACK-LEVELS.md) records the per-activity gain comparison to external games and the owner hearing checklist. This proposed PR also registers `node scripts/validate_read_my_verse_feedback_levels.js` in CI. Static and virtual Web Audio gain tests do **not** measure actual output loudness; compare on a physical iPhone at the same hardware volume.

**How to see results:** Open [Actions filtered to `ios-prep`](https://github.com/andydoane/biblozoo/actions?query=branch%3Aios-prep) for post-merge push runs. A PR's **Checks** tab (and overall Actions history) shows its PR-triggered run even though its head is a feature branch; filtering Actions by `branch:ios-prep` may not show every pre-merge PR run. Workflow files and run history are separate: when first introduced, confirm the workflow appears and that GitHub reports actual jobs before telling the owner CI passed. Recheck GitHub Actions repository settings if events are disabled.



## 4. Physical iPhone smoke tests

Choose cases from each affected group and report device/iOS version when useful:

| Feature | What to check on the device |
| --- | --- |
| Main app / Current Verse | Main home, Verse selection, font, clickable Current Verse, navigation to My Verses |
| Feeding — four modes | Two-step Tilt/Drag chooser, full-size icons, Got It!, selected-input isolation, Tilt permission denial fallback |
| Bounce and Melody | Larger ball/snack art, collision geometry, Melody note/contact synchronization, Bounce between-serves flow |
| Labyrinth | Different per-ball acceleration/weight feel and non-overlapping platform impact sounds |
| Learning and 12 games | Learn Listen/Chunks/Echo: narration time actually advances on return even if UI sounds fail; frozen narration keeps retry/Zoo Escape. Verse Launch: word rockets/score should freeze when Game Menu, Help or Speed Menu is open; asteroid bonus time, entities and delayed actions should freeze through Game Menu/Help, then resume without jump. Check menu while task-switch Welcome Back is pending. Preserve verse, chunk, score and timer across switching; other games retain their own real audio-clock recovery |
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
