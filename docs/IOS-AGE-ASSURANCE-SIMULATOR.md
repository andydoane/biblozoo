# BibloZoo — isolated synthetic age-assurance simulator testing

November 24, 2026. Merged [#239](https://github.com/andydoane/biblozoo/pull/239) at `6408916e5c043578e716e3759c454a040834c63f`. Owner's Terminal log for exact PR head `25b9827b` confirms all 153 Debug synthetic Swift assertions PASS (128 prior + 25 fixtures), ordinary unsigned simulator BUILD SUCCEEDED on iOS SDK 26.5 (arm64/x86_64, iOS 15 target), with nonblocking legacy age declaration and AppIntents metadata warnings. [PR CI](https://github.com/andydoane/biblozoo/actions/runs/45453241058) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45455557027) passed; those runs did not execute the age-assurance Swift tests. The fixture-flag simulator build, exact built fixture bundle ID, compile-failure fences and interactive simulator scenarios are not present in the supplied log and remain unverified. See [simulator acceptance guide](IOS-AGE-ASSURANCE-SIMULATOR.md) and [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md). No release activation, live Apple API, entitlement/signing, backend, iCloud, cost or family data change. Initial minor consent, notification/serverless sufficiency, older OS/offline and actual revocation remain release blockers. Fixture identity deliberately excludes production native audio parity. Owner reviews and merges.

## Isolation

The existing native gate and foreground authorization ticket use fake decisions, not Apple API calls. Requires Debug, iOS simulator, explicit BIBLOZOO_AGE_ASSURANCE_FIXTURE flag and exact bundle ID com.andydoane.biblozoo.agefixture. Live flag is mutually exclusive; fixture flag on non-simulator/non-Debug is a compile error. Production and Audio Test identities do not accept fixtures. No tracked build settings/signing changes. Gate shows SIMULATOR TEST — FAKE CONSENT. Fixture identity deliberately does not enable production-only native audio or Audio Test diagnostics; exercise UI, bridge transition and state retention only, not production audio parity. App after approval may have normal icon/display name; launch by exact fixture ID from Terminal. No real profiles, photos, recordings, backups or Apple Account. No physical-device install, backend or new cost. Fake evidence never represents genuine consent.

## A — compile-only acceptance

**Recorded acceptance:** exact #239 head passed 153 Debug assertions and the ordinary unsigned simulator build. The two intentional failure commands, fixture-only build and bundle ID check below remain pending on the owner's Mac; do not repeat successful commands unless source changes or needed to recreate a build. Current follow-up: portable ordinary and Debug synthetic Swift tests plus diagnostic-checked compile fences in the existing Ubuntu CI on ios-prep only. No new runner or infrastructure. Candidate CI results pending; Linux does not type-check UIKit/Apple frameworks or verify actual iOS fixture builds. Continue outstanding Mac-only acceptance in the simulator guide.

From clean repo root (do not switch with uncommitted changes):

```bash
git status --short
git fetch origin refs/pull/239/head && git switch --detach FETCH_HEAD
git rev-parse --short HEAD

tmpdir="$(mktemp -d)"
xcrun swiftc -D DEBUG ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

Expect previous 128 plus PASS: 25 synthetic simulator fixture assertions = 153. Without -D DEBUG, original 128. Tests are pure logic, not UIKit or real Apple responses.

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

Ordinary build already succeeded at the tested head; the distinct fixture build should also report BUILD SUCCEEDED. Verify actual bundle identity before any subsequent installation:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' /tmp/BibloZooAgeFixtureBuild/Build/Products/Debug-iphonesimulator/App.app/Info.plist
```

Must output com.andydoane.biblozoo.agefixture. Report exact head and remaining results. #239 is merged; fixture compile/identity and runtime acceptance are still pending.

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
| minor-unknown | adult assistance hold |
| declined | age-sharing help |
| denied | permission unavailable hold |
| unavailable | retryable hold |
| unsupported | unsupported hold, retry hidden |
| update-pending | update hold |
| retry-allow | first hold; tap Try Again; bridge opens |
| reentry-denied | first allows; background/return; gate denies before bridge restore |
| slow-allow | five-second fake check; background before result; return held; explicit retry; late result cannot unlock |
| missing/invalid/duplicate | unavailable hold |

Also test allow across background/foreground (fake progress remains, intended same controller), large Dynamic Type, VoiceOver, absence of unexpected prompts. Actual bridge reattachment, storyboard initialization, layer/audio state, modal transitions, direct URL handling need verification. Fixture does not emulate Apple's real API availability, account, network, consent or revocation. Production native audio parity explicitly not tested under fixture identity. Report blockers and evidence for each scenario, not just compilation. No iPhone install or production activation.

## Next

After owner merge return to ios-prep, pull --ff-only, update [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md). Resolve observed UI/lifecycle defects, initial consent evidence, notification obligations, older OS/offline behavior and actual StoreKit/PermissionKit evidence. No release activation or enrollment without explicit decision; stop/reassess if no-server policy cannot be established.
