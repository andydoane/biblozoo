# Native age assurance — startup integration checkpoint

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
