# BibloZoo — isolated synthetic age-assurance simulator testing

November 24, 2026. Merged [#240](https://github.com/andydoane/biblozoo/pull/240) at `c6ef302f8d1496e9e5fec31309ba8f49a938e007`. [PR CI](https://github.com/andydoane/biblozoo/actions/runs/45458987332) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45459264030) passed, including the portable age-assurance step. Owner tested #239 head `25b9827b`: 153 Debug assertions, normal and isolated fixture unsigned builds on SDK 26.5 (arm64/x86_64), both Mac negative compile fences and exact built `com.andydoane.biblozoo.agefixture` identity PASS. The owner fast-forwarded to #240; native files unchanged from tested head. Isolated iPhone 17 / iOS 26.5 simulator installation, launch and fake-consent banner PASS, but `minor-unknown` remained on Checking App Store requirements indefinitely, including after terminate/relaunch; no gameplay access observed. Runtime acceptance FAIL, remaining scenarios not yet tested. Candidate fix addresses a likely startup readiness race: one bounded cancellable preflight waits for all existing application/scene/window/presenter guards (20 x 100 ms), then starts one check or displays retryable unavailable hold; gate appearance also triggers the guarded preflight. True background invalidates/cancels, requires explicit Retry for interrupted initial checks, and retains prior reauthorization rules. Adds 11 portable assertions (expected 139 ordinary / 164 Debug). Exact cause and actual fix not yet proven; candidate CI and Mac rebuild/retest pending. No changes to ordinary app routing, release fences, consent policy, signing, production identity, backend, costs or family data. No live release, signed Apple calls or legal acceptance. Initial consent, notification/serverless sufficiency, older OS/offline and revocation remain blockers.

## Isolation

The existing native gate and foreground authorization ticket use fake decisions, not Apple API calls. Requires Debug, iOS simulator, explicit BIBLOZOO_AGE_ASSURANCE_FIXTURE flag and exact bundle ID com.andydoane.biblozoo.agefixture. Live flag is mutually exclusive; fixture flag on non-simulator/non-Debug is a compile error. Production and Audio Test identities do not accept fixtures. No tracked build settings/signing changes. Gate shows SIMULATOR TEST — FAKE CONSENT. Fixture identity deliberately does not enable production-only native audio or Audio Test diagnostics; exercise UI, bridge transition and state retention only, not production audio parity. App after approval may have normal icon/display name; launch by exact fixture ID from Terminal. No real profiles, photos, recordings, backups or Apple Account. No physical-device install, backend or new cost. Fake evidence never represents genuine consent.

## A — compile-only acceptance

**Recorded acceptance:** prior #239 compile acceptance complete; #240 CI green. Candidate readiness fix requires fresh ordinary and fixture builds, exact bundle ID check and runtime retest. Do not reinstall original identity or use family data.

From clean repo root (do not switch with uncommitted changes):

```bash
git status --short
git fetch origin fix/ios-age-assurance-startup-readiness && git switch --detach FETCH_HEAD
git rev-parse --short HEAD

tmpdir="$(mktemp -d)"
xcrun swiftc -D DEBUG ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

Expect 139 ordinary + 25 Debug fixture assertions = 164, including 11 startup readiness assertions. Without -D DEBUG, 139. Tests are pure logic, not UIKit or real Apple responses.

These commands must fail with intentional #error messages:

```bash
xcrun swiftc -D BIBLOZOO_AGE_ASSURANCE_LIVE -typecheck ios/App/App/BibloZooAgeAssurance.swift
xcrun swiftc -D DEBUG -D BIBLOZOO_AGE_ASSURANCE_FIXTURE -typecheck ios/App/App/BibloZooAgeAssurance.swift
```

First rejects non-Debug live build; second rejects fixture on macOS. Normal unsigned simulator compile:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Distinct fixture compile only:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeFixtureBuild CODE_SIGNING_ALLOWED=NO PRODUCT_BUNDLE_IDENTIFIER=com.andydoane.biblozoo.agefixture 'SWIFT_ACTIVE_COMPILATION_CONDITIONS=DEBUG BIBLOZOO_AGE_ASSURANCE_FIXTURE' build
```

Both builds must report BUILD SUCCEEDED for the new candidate. Verify actual bundle identity before any subsequent installation:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' /tmp/BibloZooAgeFixtureBuild/Build/Products/Debug-iphonesimulator/App.app/Info.plist
```

Must output com.andydoane.biblozoo.agefixture. Report exact candidate head and results. Prior compile/identity passed; candidate rebuild/retest pending.

## B — after compile acceptance, isolated simulator runtime

Use a disposable simulator and fake data only. Open Simulator and list booted devices:

```bash
open -a Simulator
xcrun simctl list devices booted
```

Replace SIMULATOR_UDID below with exact simulator UUID; do not choose an unspecified booted device if multiple. Verify fixture ID again; install only if exact match:

```bash
fixture_app=/tmp/BibloZooAgeFixtureBuild/Build/Products/Debug-iphonesimulator/App.app
if [ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$fixture_app/Info.plist")" = "com.andydoane.biblozoo.agefixture" ]; then
  xcrun simctl install SIMULATOR_UDID "$fixture_app"
else
  echo "STOP: unexpected app identity"
fi
```

Do not change physical-device signing or use original ID to work around installation failure. If game assets missing inspect existing normal native packaging instructions; rebuild locally, no deployment. Launch by exact ID:

```bash
xcrun simctl launch SIMULATOR_UDID com.andydoane.biblozoo.agefixture --biblozoo-age-fixture=minor-unknown
```

Between scenarios terminate only fixture app with `xcrun simctl terminate SIMULATOR_UDID com.andydoane.biblozoo.agefixture` (not-running error benign). Repeat launch with new argument. No family backups or real data.

| Fixture | Expected behavior, not observed yet |
| --- | --- |
| allow | normal bridge opens, no Apple call |
| adult | normal child-safe experience; Grown-up Check unchanged |
| minor-approved | synthetic consent opens bridge |
| minor-unknown | adult assistance hold; prior build stuck on checking, retest first (must show actual consent hold, not just unavailable) |
| declined | age-sharing help |
| denied | permission unavailable hold |
| unavailable | retryable hold |
| unsupported | unsupported hold, retry hidden |
| update-pending | update hold |
| retry-allow | first hold; tap Try Again; bridge opens |
| reentry-denied | first allows; background/return; gate denies before bridge restore |
| slow-allow | five-second fake check; background before result; return held; explicit retry; late result cannot unlock |
| missing/invalid/duplicate | unavailable hold |

If readiness times out, capture only the fixture diagnostic (booleans, no age data): `xcrun simctl spawn SIMULATOR_UDID log show --last 2m --predicate 'eventMessage CONTAINS "[BibloZooAgeFixture]"' --style compact`. A retryable unavailable hold is safer than endless checking but is not a pass for minor-unknown. Also test allow across background/foreground (fake progress remains, intended same controller), large Dynamic Type, VoiceOver, absence of unexpected prompts. Actual bridge reattachment, storyboard initialization, layer/audio state, modal transitions, direct URL handling need verification. Fixture does not emulate Apple's real API availability, account, network, consent or revocation. Production native audio parity explicitly not tested under fixture identity. Report blockers and evidence for each scenario, not just compilation. No iPhone install or production activation.

## Next

After owner merge return to ios-prep, pull --ff-only, update [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md). Resolve observed UI/lifecycle defects, initial consent evidence, notification obligations, older OS/offline behavior and actual StoreKit/PermissionKit evidence. No release activation or enrollment without explicit decision; stop/reassess if no-server policy cannot be established.
