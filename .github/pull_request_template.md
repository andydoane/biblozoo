## Summary

<!-- What changed, why, and which user-visible behavior is affected? -->

## Base and scope

- **Target branch:** During R17 closeout, use `integration/native-audio-to-ios-prep` for documentation/remaining stabilization; only the **separately approved promotion PR** targets `ios-prep` from that integration branch. After promotion, ordinary feature/doc PRs target stable `ios-prep` (never `main` unless explicitly requested). Isolated Audio Test branches use their separately approved target/identity.
- **Base commit verified:** <!-- SHA -->
- **Key files / state touched:** <!-- source, audio, profile storage, daily rewards, native, cache, etc. -->

## Validation

<!-- State exact commands AND actual results; never claim a check was run if it wasn't. -->

- [ ] Inspected the relevant current source and existing tests
- [ ] Ran focused regression checks (or documented why not)
- [ ] Ran broader regressions where shared audio, rewards, state, or storage changed (or documented why not)
- [ ] Ran `npm run build` when runtime code/assets changed (or documented why not)
- [ ] Reviewed offline/PWA vs Capacitor packaging implications
- [ ] Recorded any unavailable checks, missing assets, or failures honestly

**Commands and results:**

```text
<!-- e.g. node scripts/validate_...js — PASS on <SHA>; npm run build — NOT RUN (docs-only) -->
```

## iPhone acceptance

<!-- The owner tests and merges. Passing JS checks or CI does not mean real device acceptance. -->

- **Manual test steps:** <!-- precise and short -->
- **Status:** Not yet iPhone-verified / owner verified (with date and device if supplied)

## Preservation / risk review

- [ ] Activity-owned audio-clock recovery preserved; no unauthorized AVAudioSession category changes
- [ ] Progress, timers, recordings, navigation and exit cleanup preserved
- [ ] Daily Questions / Zoo To-Do rewards and Zookeeper statistics protected from duplicates
- [ ] Accessibility, Reduce Motion, and touch interactions checked where relevant
- [ ] Hidden developer testing controls remain gated for any public release

<!-- Check boxes as applicable; document exceptions instead of asserting tests occurred. -->

## Living handoff — **required for every PR**

- [ ] Read the **one canonical branch-local** `docs/PROJECT-HANDOFF.md` and verified it against **this PR's actual target branch** (integration during R17, stable `ios-prep` after owner-approved promotion, or a separately authorized experiment), current GitHub SHA/PRs and the owner's real reports
- [ ] Updated **that same file** `docs/PROJECT-HANDOFF.md` **in this PR**, even if the PR is docs-only, build-only, or CI-only: freshness stamp, branch/ref, tested evidence, status, known gaps and next owner action
- [ ] Updated `docs/TESTING.md` and/or `docs/AUDIO-RECOVERY.md` if their contracts changed
- [ ] Distinguished **implemented**, **merged**, **automated checks passed**, and **iPhone verified**
- [ ] If any handoff update cannot be completed, explained the blocker below for owner review (do not silently skip)

**Handoff changes / blockers:**

<!-- Mention the updated sections, current branch, any caveat, and next action. Do not assume the old integration-only 'CURRENT' headings remain authoritative after promotion. -->

**Post-R17 `ios-prep` maintenance rule:** Stable `ios-prep` already contains a living handoff from [PR #2](https://github.com/andydoane/biblozoo/pull/2). The R17 promotion carries the newer integration copy into **the same path**, not a second competing file. Every subsequent `ios-prep` PR updates the **stable branch's copy** with verified current status and actual owner testing. The first stable follow-up should record the final promotion PR number, real merge SHA and post-merge checks. See [R17 gates](../docs/R17-IOS-PREP-PROMOTION-READINESS.md).

## Merge control

**Please leave this PR unmerged for owner review.** Before clicking Merge, verify **base** and **compare**: the final R17 promotion is **base `ios-prep` ← compare `integration/native-audio-to-ios-prep`**, not `main`. A docs-only R17 closeout PR targets **integration** and is **not** the promotion. After the owner merges into the stated target, **Fetch/Pull Origin** on that branch in GitHub Desktop; when a native build is required, run `npm run build && npx cap sync ios` and use the appropriate Xcode workspace. Do not install/replace the production-ID app, import a family backup, delete a branch/worktree, or reset local data as an implicit part of merging. Isolated Audio Test uses its separate `com.andydoane.biblozoo.audiotest` identity and profiles. The owner controls merge and any later device update.
