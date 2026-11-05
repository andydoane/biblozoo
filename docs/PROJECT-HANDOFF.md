# BibloZoo — Living Project Handoff

> **Snapshot, not source of truth.** This file helps new ChatGPT conversations and contributors orient themselves. The current GitHub `ios-prep` branch, open/merged PRs, source code, tests, and the owner's latest instructions are authoritative. Verify those before changing code or claiming anything is complete. **Every relevant feature/bug-fix PR must keep this handoff current (see §6).**

**Repository:** https://github.com/andydoane/biblozoo  
**Working/integration branch:** `ios-prep` (PRs target this branch; not `main`)  
**Last source review for this document:** 2026-11-05; `ios-prep` HEAD `1e1deb2f8d486e55e95511a4b098d9b3d0aec252` (Patch 73–73.1 commit)  
**Package version at that review:** `1.0.0` in `package.json` (not a substitute for the iOS build number)  
**Related guides:** [Audio Recovery](AUDIO-RECOVERY.md) · [Testing](TESTING.md)  
**Inspiration:** [Worksheet Studio's living handoff](https://github.com/andydoane/worksheet-generator/blob/main/docs/PROJECT-HANDOFF.md)

## 1. Product and audience

BibloZoo is a Bible verse memorization app for children and families. It combines guided verse learning, 12 standalone practice games, five Playground activities, Flashcards, Read My Verse, Daily Questions / Zoo To-Do, Feeding (Classic, Labyrinth, Melody, Bounce), and collectible BibloPets. Family/Zookeeper profiles and progress are stored locally; backup export/import is user-directed.

The web/PWA app is also packaged for iPhone/iPad with Capacitor. iOS testing is performed on physical hardware by the owner after merging a PR to `ios-prep`. A passing Node validator or successful web build does **not** establish that gestures, sound, motion permissions, or animations work correctly in iOS WebKit.

## 2. Non-negotiable safeguards

- **Preserve activity-owned audio recovery.** A real, advancing Web Audio clock and the owning activity's own verification—not native activation, a sound effect, a promise resolution, or an animation—determine successful recovery. Pending native interruptions are deferred, not counted as failed attempts. See [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md).
- **Preserve native iOS audio-session behavior.** Do not casually alter the existing Solo Ambient audio-session policy (`AVAudioSessionCategorySoloAmbient` / its Swift equivalent), native recovery bridge, or interruption lifecycle. Review native changes separately and require iPhone testing.
- **Never fabricate recovery success or awards.** Zoo Escape developer simulations must not count as genuine BibloPets Rescued, Zoo Breaks Stopped, Daily Questions completion, score, or reward. A final stopped Zoo Break requires an actual verified LOCK GATE recovery. Preserve exit cleanup.
- **Keep session state and navigation stable.** Returning after app switches must not duplicate pets, lose progress, restart recording unexpectedly, or silently switch the chosen Feeding Tilt/Drag method. Screens intentionally without Welcome Back should remain that way.
- **Protect offline operation.** Web service-worker caching and Capacitor's bundled `dist/` are different deployment paths. Update cache manifests/version when assets change; do not modify generated `dist/` as the source.
- **Protect family data and privacy.** Profiles, local progress, saves, rewards, and backup import/export require backward-compatible, non-destructive changes. Review `privacy_policy.html` and `ios/App/App/PrivacyInfo.xcprivacy` if data handling changes.
- **Honor accessibility.** Large touch targets, tap alternatives to dragging, text labels, screen-reader guidance, keyboard access where appropriate, and Reduce Motion behavior should be preserved.
- **Do not enable or ship developer-only shortcuts inadvertently.** Inspect Zoo Escape, Feeding, and Daily Questions test/debug flags before a production release.

## 3. Architecture and where to look

| Area | Starting points |
| --- | --- |
| App shell, Learn, navigation, current verse, local progress | `index.html`, `app.js`, `styles.css` |
| Zookeeper profiles, pet identity | `profiles.js`, `profiles.css`, `verse_data/`, `profile_pictures/` |
| Daily Questions, sessions and rewards | `daily_questions.js`, `daily_question_sessions.js`, `daily_question_generators.js`, `daily_zoo_todo*.js` |
| Feeding: four modes, control selection, physics and sound | `daily_questions_feed_game.js`, `daily_questions_feed_game.css`, `verse_images/daily_questions/` |
| Twelve practice games and shared shell | `verse_games/registry.js`, `verse_games/*/game.js`, `verse_games/shared/` |
| Five Playground activities | `verse_playground/registry.js`, `verse_playground/*/game.js` |
| Flashcards | `flashcards/` |
| Read My Verse | `read_my_verse.js`, `read_my_verse.css` |
| Welcome Back and Zoo Escape | `verse_games/shared/welcome-back*.js`, `verse_games/shared/welcome-back.css` |
| Audio diagnostics, coordinator, native wrapper | `verse_games/shared/audio-*.js`, `verse_games/shared/native-audio-recovery.js`, `ios/App/App/AppDelegate.swift` |
| Offline assets | `service-worker.js`, `scripts/build.js`, `verse_fonts/`, `ui_audio/` |
| Validation | `scripts/validate_*.js`, `package.json` scripts |
| Native iOS project | `capacitor.config.json`, `ios/` |

**Build pipeline:** Static web source → `npm run build` (`scripts/build.js`) → generated `dist/` → `npx cap sync ios` → Xcode build/run. `dist/` and `node_modules/` are ignored by Git. The service worker is for the web/PWA build, not the native Capacitor runtime. Check the current source and package versions; never infer them from this table alone.

## 4. Current implemented baseline (verify before relying on it)

- **Patches 72.1A–72.1D.1:** Shared three-stage Zoo Escape Welcome Back, activity-owned recovery, personalized animal rescues, optional sound effects, test harness, persistent per-Zookeeper rescue and stopped-break stats, accessibility, and home-screen Zoo Hero celebration. The permanent stats tally was removed from the home screen; counters remain in Zookeeper Stats.
- **Patches 73–73.1:** Feeding's two-step Tilt/Drag selection and session-locked controls; increased Bounce and Melody object sizes; Labyrinth collision notes and individual steering multipliers; simplified second-step instruction layout; Melody visual contact alignment; clickable Current Verse with Titan One typography.
- **Latest commit reviewed:** `1e1deb2f8d48` on `ios-prep`. The owner reported applying the latest patch and then committed/pushed it. **Do not infer that every Patch 73.1 behavior has passed final iPhone acceptance from the commit message alone.**
- **Developer controls:** Hidden test menus were deliberately retained during earlier Zoo Escape acceptance rounds. Confirm their *current* flags/availability in code before release; their presence is not a release endorsement.

This summary is intentionally short. Use `git log`, individual PRs and source for details rather than expanding it into an exhaustive patch diary.

## 5. Collaboration: GitHub PRs, not source ZIPs

For normal work, read source directly from the current `andydoane/biblozoo` **`ios-prep`** branch. A source ZIP is only needed for unpushed local work, files absent from GitHub, or access problems. The owner normally wants the assistant to implement requested changes and open a **PR targeting `ios-prep`**, leaving it **unmerged**.

1. Verify repository access, exact `ios-prep` HEAD SHA, recent commits, open/merged PRs, issues, and any workflow status. Confirm the requested change is not already present.
2. Read affected source and existing tests; state the intended behavior and any important compatibility or iPhone risks.
3. Create a focused feature branch **from current `ios-prep`**; never commit directly to `main` or `ios-prep` for normal code work.
4. Implement narrowly; add targeted regression tests, update offline assets if necessary, and maintain this document **in the same PR** as described below.
5. Run relevant Node validators and `npm run build` where tooling allows. If GitHub Actions is available, review its actual results for the final PR commit. If tests or a build cannot run, record the exact limitation—never claim green CI or iPhone verification.
6. Open a PR with summary, affected components, test commands/results, risks, and a short iPhone checklist. Leave it **unmerged** for the owner's review.
7. The owner merges, chooses `ios-prep` in GitHub Desktop and pulls, then runs `npm run build && npx cap sync ios && npx cap open ios` and tests on iPhone. Report findings in the PR or a follow-up chat; use a focused follow-up PR for fixes.

For risky audio/native/score changes, prefer letting the owner test the **feature branch before merging**. No force push, merge, release, or production-status claims without appropriate authority/verification.

## 6. Mandatory living-handoff maintenance — instructions to future chats

**This section is itself part of the handoff contract. Do not remove it in routine PRs.** Every new ChatGPT conversation should read it, verify the actual branch, and carry it forward.

For **every feature, bug fix, architecture, audio, persistence, UI-flow, or release-related PR**:

1. Read `docs/PROJECT-HANDOFF.md` first; check the current `ios-prep` HEAD, open PRs, relevant recent merges and code. This document can be stale.
2. **Edit this document in the same PR**, updating the architecture/guardrails if relevant, the implemented-baseline summary, **Current work** below, verification date/commit, and known risks. Maintain [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md) or [TESTING.md](TESTING.md) when those contracts change.
3. **Replace stale statuses** rather than blindly appending patch history. Keep the document concise and navigable. Link to authoritative PRs and tests.
4. Label evidence correctly: **Implemented** = code exists in a branch/PR; **Merged** = verified on `ios-prep`; **iPhone verified** = owner actually confirmed physical-device behavior. Never conflate these.
5. A newly opened PR is **not merged yet**. Describe pending work truthfully and update its status in a later PR once verified; don't write future merge or test results as facts.
6. In the PR description, check the handoff-maintenance box, or explain clearly why a documentation-only/mechanical change does not affect the handoff.
7. Keep the README's link to this file and the PR template's maintenance prompt. New contributors must be able to find these instructions without old chats.

No living document can update itself without a person/agent making a commit; **the PR workflow makes that update an explicit, repeatable requirement.**

## 7. Current work, acceptance and next steps

**Status last checked:** 2026-11-05 against `ios-prep` at `1e1deb2f8d48`, before this documentation-only PR. Open PRs targeting `ios-prep`: none at that check. Recheck immediately in a new conversation.

| Status at last check | Item | Next step |
| --- | --- | --- |
| **Committed on `ios-prep`** | Patch 73–73.1 Feeding controls and polish | Confirm final physical-iPhone acceptance for icon layout, tilt/drag isolation, Labyrinth feel, and Melody contact timing if still outstanding |
| **Committed on `ios-prep`** | 72.1C–72.1D Zoo Escape rollout | Keep genuine-recovery statistics and release-only developer harness checks on the acceptance list; verify new state against the latest source |
| **Documentation PR proposed** | Living handoff, audio safeguards, testing guide and PR template | Owner reviews and merges; future PRs update handoff as part of implementation |
| **Not configured at last check** | GitHub Actions on `ios-prep` | Consider a separate focused CI PR after choosing a reliable minimum build/validator matrix |

Avoid treating these statuses as timeless facts. Check GitHub and revise them in the next relevant PR.

## 8. Starting a fresh ChatGPT conversation

Suggested first message:

> Read `docs/PROJECT-HANDOFF.md` on `ios-prep` in `andydoane/biblozoo`, including its mandatory handoff-maintenance rules. Verify the current GitHub branch, open PRs, recent commits, issues, and test setup; then inspect the relevant source. Implement agreed changes as focused PRs **targeting `ios-prep`**, update the living handoff in each relevant PR, and leave PRs unmerged for my review. Distinguish code, automated checks, and my physical-iPhone acceptance.

If this file conflicts with the current source or the owner's newer instructions, follow the current evidence and correct the handoff in the next relevant PR.
