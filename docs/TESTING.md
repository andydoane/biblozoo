# BibloZoo — Testing & iPhone Acceptance

> **Verification must match the actual PR commit.** A successful source inspection, mock test or ZIP patch validation does not imply a successful iOS build or on-device acceptance. See [Living Handoff](PROJECT-HANDOFF.md) and [Audio Recovery](AUDIO-RECOVERY.md).

## Branch and PR workflow

- Base all normal feature branches on the current **`ios-prep`** SHA; target PRs to `ios-prep`, **not `main`**.
- The assistant implements, documents and opens a PR, **but does not merge**. The owner reviews/merges and tests on an iPhone. For risky native/audio changes, test the feature branch before merging.
- Update `docs/PROJECT-HANDOFF.md` in the same PR for relevant changes. Keep known pending iPhone tests visible until the owner confirms them.
- No GitHub Actions workflow existed under `.github/` on `ios-prep` at the initial 2026-11-05 review. **Do not claim CI passed** until a workflow is actually configured and the final commit's run was checked.

## Available local commands

From the repository root:

```bash
npm ci
npm run validate:daily-feed-game
npm run validate:daily-questions
npm run validate:daily-question-sessions
npm run validate:daily-question-generators
npm run validate:daily-zoo-todo
npm run validate:read-my-verse
npm run build
npx cap sync ios
npx cap open ios
```

These scripts come from `package.json`; inspect it for changes. There is currently no single `npm test` command in that file. More focused tests live under `scripts/validate_*.js`, for example:

```bash
node scripts/validate_patch73_feeding_controls.js
node scripts/validate_patch73_feeding_controls_polish.js
node scripts/validate_patch73_1_feeding_polish.js
node scripts/validate_patch72_1d_zookeeper_stats.js
node scripts/validate_patch72_1c_whole_app_zoo_escape.js
node scripts/validate_patch72_1c3_zoo_escape_sounds.js
node scripts/validate_feeding_audio_bounce_patch24.js
node scripts/validate_read_my_verse_audio_patch70_2.js
```

Run validators appropriate to the edited subsystem **and** broader regressions when shared assets, progress, daily rewards, native audio or startup behavior are involved. A few historical validators embed versioned cache-name expectations; diagnose failures honestly and never conceal a real behavior regression by loosening an assertion.

`npm run build` creates `dist/`. For the native app, **rebuild then sync** before testing code changes. In GitHub Desktop: select `ios-prep`, pull after the owner merges, then in Terminal run:

```bash
npm run build && npx cap sync ios && npx cap open ios
```

Finally build and run on the device in Xcode. Use signing and the correct target. Do not commit generated `dist/` or dependency caches.

## Physical-iPhone acceptance matrix

| Area | Manual checks |
| --- | --- |
| Startup, profiles and home | Launch after update/fresh install, open Current Verse → My Verses, switch Zookeeper, confirm saved progress |
| Feeding Classic/Labyrinth/Melody/Bounce | Choose Tilt or Drag → chosen-method instructions → Got It; only that control steers; check permission denied/no sensor; Bounce serves do not re-ask; larger balls, collisions, notes, and scores work |
| Normal return | Switch apps / lock-unlock and return: correct Welcome Back, same score/progress/audio context, no duplicate rewards |
| Zoo Escape | Developer test Stage 2/3, tap alternative, pen lock, deferred recovery, safe terminal exit, app switch with loose animals, no developer statistics |
| Actual audio recovery | Test real audio playback/recording when possible; never treat simulated success as proof of actual audio recovery |
| Learn, games, Playground, Flashcards, Read My Verse | Correct pause/resume, score/recording/timeline preservation and cleanup; no unexpected popup |
| Offline | Verify packaged Capacitor assets on-device; separately test browser/PWA service worker if changed |
| Accessibility | VoiceOver, keyboard where supported, reduced-motion stationary/catchable pets, readable labels and touch targets |
| Privacy/storage | Profile isolation, backup import/export, safe storage failure, no unexpected data capture |

## PR reporting

In the PR description report: branch base SHA, files/behavior changed, **exact commands run** and pass/fail, any skipped checks and why, CI run if actually available, iPhone checklist, release/debug flags, and status of open acceptance items. Label:

- **Implemented** — code exists in the feature branch/PR.
- **Merged** — verified in `ios-prep` after merge.
- **iPhone verified** — the owner has confirmed physical-device behavior.

Do not prematurely mark the final item. Any failed iPhone check should result in a focused follow-up PR and a corresponding handoff update.
