# Native age assurance — startup integration checkpoint

## CURRENT — staged foreground reauthorization (November 24, 2026)

Merged #236 at `4a7c45a850545f06d8d68b1b7ac110ffae8f43e7`. Owner's exact head `0d8ad7bb` passed all 89 synthetic assertions and unsigned simulator BUILD SUCCEEDED on Xcode 26.6 / SDK 26.5, arm64 and x86_64. PermissionKit correction compiled; expected legacy age declaration warnings and skipped AppIntents metadata remain nonblocking. GitHub Actions validation succeeded. Current candidate adds [foreground lifecycle safeguards](IOS-AGE-ASSURANCE-LIFECYCLE.md): transient foreground ticket, invalidate before cancellation, reject stale completion, return to native gate after authorized scene backgrounds, fresh check before restoring same retained bridge, explicit Retry after interruption/denial. No live flag activation, server, signing, data persistence or new expenses. Initial minor consent still unknown; Apple's [current Q&A](https://developer.apple.com/support/age-assurance/) confirms OS prevents launch after parental revocation, but directs developers to RESCIND_CONSENT server notifications. This is not a verified initial consent signal or complete revocation mechanism; no backend authorized. Ordinary builds, PWA and Audio Test unchanged. Root transition, native bridge/audio behavior, offline/older OS compatibility and real signed responses remain untested. No production install. Expected 89 prior + 21 foreground assertions, unsigned simulator compile; candidate not yet tested by author.

## CURRENT — significant-update system adapter (November 24, 2026)

Merged #234 (`bef654266bb7c545c3def8bc5a9970321e767154`); owner tested exact head 5172c734, reported 14 + 7 + 10 + 9 + 24 synthetic assertions PASS and normal unsigned simulator BUILD SUCCEEDED; branch validation passed. Separate opt-in build remains unverified. Current candidate adds [Apple significant-update adapter](IOS-AGE-ASSURANCE-CONSENT.md): documented adult acknowledgment and PermissionKit question/response APIs, scoped to an actual version-specific change, matched in-memory response ID, conservative decline default and cancellation/unknown handling. The adapter has no live startup caller, and the live gate remains disabled. First release 1.0 has no pending significant update. Initial minor consent is not exposed as a field in Apple's documented AgeRange response; no substitute invented, so initial consent, persistence/recovery, account change/revocation, older OS/offline and signed sandbox acceptance remain release blockers. No backend, iCloud, accounts, extra cost, signing or visible ordinary app change. App Review not legal clearance.

## CURRENT — owner acceptance and next checkpoint (November 24, 2026)

PR #233 merged at `191ca61a27e4ce38ee4dca93e14436180f7b9110`, which matches the owner's reported build commit. 14 classification, 7 regulatory, 10 startup assertions PASS; unsigned iOS simulator BUILD SUCCEEDED (arm64/x86_64, SDK 26.5); legacy declaration deprecation warnings nonblocking. The original discarded-outcome path below is historical: [access policy candidate](IOS-AGE-ASSURANCE-ACCESS.md) consumes a transient assessment and uses a native gate before WebView only if the live compile condition is enabled; it is still off by default. No live calls, actual minor consent or significant-update flow confirmed. Follow current combined testing instructions.

Baseline `e573925f24a78aee8fe19de9d2bbf7eca2c993ee`, merged #232 plus Documentation Update. Owner reported 14/14 pure Swift tests and successful unsigned simulator build on that clean matching commit. This candidate is **not yet a release-compliant access gate**.

## What changed

- `SceneDelegate.sceneDidBecomeActive` invokes the native startup coordinator after existing visual/audio restoration, including its early-return path on cold launch. True scene background/disconnect cancels the task; an Apple sheet's transient deactivation does not. One attempt per scene prevents prompt loops; a skipped presenter/identity/disabled condition does not consume the attempt.
- Only exact production identity is eligible. No web bridge, age data storage, logs, network client, game changes, PWA, Audio Test behavior, project settings, or signing changes.
- Apple's [26.4 regulatory feature cases](https://developer.apple.com/documentation/declaredagerange/agerangeservice/regulatoryfeature) distinguish mandatory age sharing and significant-update requirements. Update-only is a separate pending responsibility, not a reason to ask for age range on first launch. Unknown-only or unknown plus update without age requirement yields unavailable, never not-required. Mixed required-age/unknown still performs the age request and leaves other obligations unresolved. On 26.2/26.3 the legacy eligibility signal remains broad. Prior systems return unavailable; no assumption of exemption.
- The live request is disabled by default (`BIBLOZOO_AGE_ASSURANCE_LIVE` is not set in any build config). Apple [requires the capability](https://developer.apple.com/documentation/declaredagerange/); no entitlement/provisioning change yet. No unauthorized API call in normal builds. The opt-in path is compiled and connected to startup but not used to grant or restrict access yet; its transient outcome is discarded. Do not enable it for release or on the owner's family device. This is deliberately a staged integration, not proof that live age assurance works.

## Owner acceptance (no installation)

From the clean repo root, obtain the PR branch explicitly if it has not already been merged:

```bash
git fetch origin feat/ios-age-assurance-startup
git switch --detach FETCH_HEAD
git rev-parse --short HEAD
git status --short
```

Do not switch with uncommitted changes. The detached checkout is temporary; after merge use `git switch ios-prep` and `git pull --ff-only`. If PR is already merged, verify local ios-prep contains it and compile that commit instead.

```bash
tmpdir="$(mktemp -d)"
xcrun swiftc ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

Expected: 14 classification, 7 regulatory routing cases, 10 startup lifecycle assertions. These are synthetic logic tests, not live Apple responses.

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Expected BUILD SUCCEEDED. Reuses previous derived data. No device install or signing. Report exact output/commit before merge. No author-side compile or runtime acceptance claimed.

## Next checkpoint

Implement a native access/consent coordinator that consumes required outcomes instead of discarding them; define minor initial consent, adult confirmation, unknown/declined/error/old-OS and offline states, significant-update consent/acknowledgement and no prompt loops. Preserve family data and child-safe defaults. Do not use an adult Apple Account to bypass Grown-up Check. Only then enable the Apple capability and live startup condition in an approved isolated signed test build, verify Apple's sandbox and offline/old-OS behavior. Server notification applicability and no-server revocation enforcement remain unresolved; App Review is not legal clearance. No developer endpoint, recurring costs or accounts.
