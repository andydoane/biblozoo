## Summary

<!-- What changed, why, and which user-visible behavior is affected? -->

## Base and scope

- **Target branch:** `ios-prep` (not `main`)
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

- [ ] Read `docs/PROJECT-HANDOFF.md` **and verified it against current `ios-prep`**, PRs and code
- [ ] Updated `docs/PROJECT-HANDOFF.md` **in this PR**: freshness stamp, relevant decisions, current status, remaining owner tests
- [ ] Updated `docs/TESTING.md` and/or `docs/AUDIO-RECOVERY.md` if their contracts changed
- [ ] Distinguished **implemented**, **merged**, **automated checks passed**, and **iPhone verified**
- [ ] If any handoff update cannot be completed, explained the blocker below for owner review (do not silently skip)

**Handoff changes / blockers:**

<!-- Mention the updated sections, any caveat, and next action -->

## Merge control

**Please leave this PR unmerged for owner review.** After the owner merges into `ios-prep`, they will Pull Origin in GitHub Desktop, run `npm run build && npx cap sync ios`, and verify the final app on iPhone. Risky changes may be tested from the feature branch before merge.
