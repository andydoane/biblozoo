# BibloZoo — staged age assurance foreground lifecycle

Baseline merged #236 `4a7c45a850545f06d8d68b1b7ac110ffae8f43e7`. Owner tested exact #236 head `0d8ad7bb`: 89 synthetic checks PASS, unsigned iOS simulator BUILD SUCCEEDED (both architectures, SDK 26.5, iOS 15 target). GitHub Actions validation passed. No live mode test. November 24, 2026.

## Scope and evidence

Apple's [current Q&A](https://developer.apple.com/support/age-assurance/) confirms OS launch prevention after parental revocation and directs developers to RESCIND_CONSENT server notifications. It describes age-category and parental-controls signals, not an independent initial-download consent property. The [AgeRange reference](https://developer.apple.com/documentation/declaredagerange/agerangeservice/agerange) does not identify such a field. OS launch prevention is not itself a per-app API response verifying initial minor consent or an assurance that an already-running/offline scene will receive revocation. [Sandbox testing](https://developer.apple.com/documentation/storekit/testing-age-assurance-in-sandbox) includes revocation notification scenarios. Keep initial consent unknown in real adapter; do not substitute age category, ordinary installation, Grown-up Check or significant-update approval. No-server sufficiency remains unconfirmed. The owner has not authorized an endpoint, paid verifier, cloud store or additional recurring cost. No developer forum post; App Review not legal clearance.

## Candidate mechanics

- One transient UUID ticket identifies the active foreground check; no account identifiers or age persistence. Invalidate before cancelling on true background or disconnect. Only current, uncancelled foreground completion can authorize; obsolete completion cannot clear a newer task or unlock access.
- If an authorized scene backgrounds, detach and retain the same existing Capacitor controller in RAM, install a native gate, reset automatic attempt for the next foreground, require a fresh decision before restoring the controller. Do not instantiate a new game controller on successful reentry. Preserve the existing paused gameplay layer until restore; no explicit data reload, reset, restore, backup or erase. An interrupted initial check instead shows Retry; a system sheet's transient resign-active alone does not invalidate or automatically prompt. Reject direct scene URL/activity forwarding while gated. No deep-link replay.
- Gate and reentry path remain compiled but disabled in all tracked configurations; production exact identity only if the live flag is explicitly enabled later. Ordinary launch and existing audio restoration path, Audio Test and PWA remain unchanged. No new SDK APIs, entitlement, signing, server, persistence or JS change.
- This is a UI/lifecycle safeguard, not a verified revocation mechanism or complete protection of every retained native plugin. Actual root-controller reattachment, modal transitions, ongoing native audio/JS tasks, app-switcher snapshots, foreground race, account switch while active, multiple scenes, delayed permission responses and offline/old OS behavior need real acceptance. No promise of seamless offline play in opt-in mode. No current production activation. Do not enable flag or install on family device. Initial consent and significant-update caller/recovery remain release blockers; stop and reassess if a backend is mandatory.

## Acceptance (no installation)

From the clean repo root:

```bash
git status --short
git fetch origin refs/pull/237/head && git switch --detach FETCH_HEAD
git rev-parse --short HEAD
```

Do not switch if uncommitted changes exist. Use the verified merged commit instead if already merged. Then:

```bash
tmpdir="$(mktemp -d)"
xcrun swiftc ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

Expected prior 89 checks plus `PASS: 21 synthetic foreground authorization assertions` (110 total). These test policy and ticket invalidation, not a real Apple revocation or UIKit lifecycle.

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Expected BUILD SUCCEEDED. Existing opt-in compile-only instruction in [access guide](IOS-AGE-ASSURANCE-ACCESS.md) remains a separate verification; do not launch opt-in build. Author has not compiled or tested this candidate. Owner reviews/merges after successful build; switch back to ios-prep and pull --ff-only. Future isolated signed test must confirm real Apple consent evidence, revocation and reentry, device age/account changes, cold and repeated offline launch, older OS, denial/retry, significant updates, retained bridge/audio and family data preservation before release. No backend added or approved.
