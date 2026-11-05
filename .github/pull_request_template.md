## Summary
<!-- What changes, and why? Include relevant issue / previous PR. -->

## Base and scope
- Target branch: `ios-prep`
- Base SHA: <!-- exact commit on ios-prep when the branch was created -->
- Areas affected:

## Validation
- [ ] Relevant focused Node validators run (commands and results below)
- [ ] Broader regressions run when shared behavior changed
- [ ] `npm run build` completed (or explain why not)
- [ ] GitHub Actions / CI results checked for the final commit **if configured** (otherwise state "Not configured")
- [ ] Offline/caching, persistence/rewards, audio, and accessibility implications reviewed

**Actual commands and results:**  
<!-- Do not claim a test passed if it was not run. -->

## iPhone acceptance — owner
- [ ] Needs physical iPhone testing after merge (or feature-branch test if risky)
- [ ] Verified on iPhone by owner (only after confirmation)
- Manual test steps:

## Living handoff maintenance
- [ ] Updated `docs/PROJECT-HANDOFF.md` in this PR to reflect behavior, architecture, status, risks and next steps, plus `docs/AUDIO-RECOVERY.md` / `docs/TESTING.md` where relevant
- [ ] Or explicitly explain why no handoff update is needed (e.g., documentation-only housekeeping)

**Implemented ≠ merged ≠ iPhone verified.** Follow [the mandatory handoff rules](../docs/PROJECT-HANDOFF.md#6-mandatory-living-handoff-maintenance--instructions-to-future-chats). Leave PR unmerged for the owner.
