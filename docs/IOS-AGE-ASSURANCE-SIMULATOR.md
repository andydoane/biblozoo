# BibloZoo — isolated synthetic age-assurance simulator testing

November 24, 2026. Merged [#242](https://github.com/andydoane/biblozoo/pull/242) at `5f7f4753be55b6e702c136201329f08ba9dcfc88`; owner verified `f8ca90f3`: 179 Debug assertions, both unsigned SDK 26.5 builds PASS; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/45470611910), [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45470829861) and [acceptance](https://github.com/andydoane/biblozoo/pull/242#issuecomment-7142275725). Prior #241 runtime acceptance retained. Current docs-only [native feasibility decision](IOS-AGE-ASSURANCE-NATIVE-FEASIBILITY.md): initial consent and no-server revocation sufficiency unresolved; release HOLD. No code, signing, enrollment, backend, new costs or family data changes. No new Mac test needed. Owner decision on next evidence route required; see [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md).

## Isolation

The existing native gate and foreground authorization ticket use fake decisions, not Apple API calls. Requires Debug, iOS simulator, explicit BIBLOZOO_AGE_ASSURANCE_FIXTURE flag and exact bundle ID com.andydoane.biblozoo.agefixture. Live flag is mutually exclusive; fixture flag on non-simulator/non-Debug is a compile error. Production and Audio Test identities do not accept fixtures. No tracked build settings/signing changes. Gate shows SIMULATOR TEST — FAKE CONSENT. Fixture identity deliberately does not enable production-only native audio or Audio Test diagnostics; exercise UI, bridge transition and state retention only, not production audio parity. App after approval may have normal icon/display name; launch by exact fixture ID from Terminal. No real profiles, photos, recordings, backups or Apple Account. No physical-device install, backend or new cost. Fake evidence never represents genuine consent.

## A — compile-only acceptance

**Recorded acceptance:** #241 exact source head `c6301837` passed 164 local Debug assertions, ordinary and fixture unsigned builds, fixture ID check and runtime retest; CI passed portable ordinary/Debug tests and fences. Prior #239 Mac negative fences passed; not rerun locally for #241. Do not reinstall original identity or use family data.

From clean repo root (do not switch with uncommitted changes):

```bash
git status --short
git fetch origin feat/ios-age-assurance-storekit-rating && git switch --detach FETCH_HEAD
git rev-parse --short HEAD

tmpdir="$(mktemp -d)"
xcrun swiftc -D DEBUG ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

For the StoreKit comparison candidate expect 154 ordinary + 25 Debug fixture assertions = 179, including 15 new comparison cases. Without -D DEBUG, 154. #241 historical totals were 139/164. Tests are pure logic, not UIKit or real Apple responses.

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

For a changed source candidate, both builds must report BUILD SUCCEEDED; the previous fixture runtime acceptance remains historical. Verify actual bundle identity before any subsequent installation:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' /tmp/BibloZooAgeFixtureBuild/Build/Products/Debug-iphonesimulator/App.app/Info.plist
```

Must output com.andydoane.biblozoo.agefixture. Report exact candidate head and results. #241 owner compile/identity passed. Commands retained for future source changes.

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

| Fixture | Expected behavior — observed on #241 unless noted |
| --- | --- |
| allow | normal bridge opens, no Apple call |
| adult | normal app opened; Grown-up Check not separately exercised |
| minor-approved | synthetic consent opens bridge |
| minor-unknown | adult assistance consent hold; #241 correct hold observed after prior startup stall |
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

## Recorded owner runtime evidence — #241

- All 15 scenarios in the table passed (missing, invalid and duplicate counted separately). `minor-unknown` showed actual consent hold, not generic unavailable; `allow`, `adult`, `minor-approved` opened normal setup/app. `retry-allow` held then opened on Retry. Unsupported had no retry. Missing/conflicting arguments stayed blocked.
- `reentry-denied`: an initial ambiguous observation was not counted; controlled background/return using exact fixture ID retained PID 9692 and screenshot showed permission denial. `slow-allow`: PID 9801 retained on return, screenshot showed unavailable/retry hold; owner tapped Retry, check screen then normal app. No claim about every frame of the transition.
- `allow`: owner reported fake gameplay progress retained after background/return. Larger Text passed. VoiceOver could not be located in Simulator settings; deferred to a supported environment. No production microphone/audio parity: fixture bundle is excluded from native permission/audio paths; owner observed microphone access unavailable. No change to those guards. Prompt absence, modal/direct-link handling and full layer/audio behavior not independently established; retain as outstanding targeted checks before live activation. No real consent or family data tested.
- Local ordinary build completed `BUILD SUCCEEDED` with SDK 26.5, arm64/x86_64; nonblocking AVAudioSession/age declaration deprecation and skipped AppIntents metadata warnings. Source head unchanged by this documentation follow-up.

## Next

After each owner merge return to ios-prep, pull --ff-only, update [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md). Startup stall resolved in tested fixture; complete deferred checks and resolve initial consent evidence, notification obligations, older OS/offline behavior and actual StoreKit/PermissionKit evidence. No release activation or enrollment without explicit decision; stop/reassess if no-server policy cannot be established.
