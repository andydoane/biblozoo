# BibloZoo — staged Apple consent adapter

Baseline merged #234, `bef654266bb7c545c3def8bc5a9970321e767154`. Owner reported 64 synthetic assertions and ordinary unsigned simulator build PASS on exact PR head 5172c734, branch validation passed. Opt-in compile not verified.

## Evidence and scope

Apple's [age assurance Q&A](https://developer.apple.com/support/age-assurance/) distinguishes initial App Store revocation (OS prevents launch) and significant-update developer handling. Its [Texas announcement](https://developer.apple.com/news/?id=sg176nne) describes App Store download consent. The [AgeRange structure](https://developer.apple.com/documentation/declaredagerange/agerangeservice/agerange) exposes bounds, declaration and parental controls, not a separate initial app consent flag. This is an unresolved evidence gap, not a reason to infer consent from installation, age or parental-control settings. Apple's [sample](https://developer.apple.com/documentation/declaredagerange/implementing-age-assurance-and-permissions) describes significant updates, uses iCloud storage and currently lists Xcode 27 in its sample requirements; this PR uses the documented individual APIs supported by earlier SDKs, not that sample project. No iCloud, server or persistent response store added.

- Real pending update descriptor must match installed marketing version and have a nonblank description, never 1.0. Synthetic 1.1 only in tests; no real update declared. Future release owner must explicitly determine significant changes and use verified original installation/version history, not automatically prompt for every build.
- Resolve required flow from current age and regulatory flags; if update-only region and pending change, age check still needed. Unknown/declined/unconfirmed/unsupported is unavailable, not approval. No prompt if no pending change or no corresponding regulatory obligation.
- Adapter calls documented [adult acknowledgment](https://developer.apple.com/documentation/declaredagerange/agerangeservice/showsignificantupdateacknowledgment(in:updatedescription:)) (iOS 26.4+) and [PermissionKit AskCenter](https://developer.apple.com/documentation/permissionkit/askcenter) (iOS 26.2+) with [SignificantAppUpdateTopic](https://developer.apple.com/documentation/permissionkit/significantappupdatetopic). Register response sequence before request. Set decline default, only accept matching question ID, distinguish denial/unknown/cancellation; successful request submission alone is never approval. Adult successful acknowledgment maps to update approved only, not minor initial consent. No response remains pending; caller must cancel on teardown, future lifecycle must handle delay, timeout/retry, late responses, account scope, persistence/recovery and revocation. No production caller wired. SDK symbols and actual framework behavior require compilation and sandbox confirmation.
- Native gate flag remains unset. No new screen, system prompt or behavior in ordinary production, Audio Test or PWA. Do not enable live mode for family devices. Initial minor consent still unknown; no release acceptance. No new entitlements, signing, privacy data storage, fees, developer backend or accounts.

## Acceptance

From clean repo root, fetch PR ref if not already on verified merged commit:

```bash
git status --short
git fetch origin refs/pull/235/head && git switch --detach FETCH_HEAD
git rev-parse --short HEAD
```

```bash
tmpdir="$(mktemp -d)"
xcrun swiftc ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

Expected: 14 classification, 7 regulatory routing, 10 startup lifecycle, 9 regulated category, 24 access policy, 18 significant-update routing, 7 significant-update response assertions. 89 total synthetic checks. No Apple response actually simulated by the OS.

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Expected BUILD SUCCEEDED. No run/install. Previous opt-in compile instructions in [access checkpoint](IOS-AGE-ASSURANCE-ACCESS.md) still apply, only compile, no activation. If SDK errors, inspect exact local swiftinterface for PermissionKit before changing code; do not guess newer API availability. Author has not compiled or tested candidate. After owner merges return to ios-prep and pull --ff-only.

## Remaining

Resolve initial minor consent from supported Apple evidence, legal obligations and no-server feasibility; complete actual version-scoped request caller, delayed responses and recovery/expiration without unapproved persistence or iCloud; resolve old-OS/offline and foreground/account change/revocation lifecycle. Apple explicitly directs developers to RESCIND_CONSENT server notifications; OS launch blocking alone not confirmed sufficient. App Review is unchanged per Q&A and is not legal clearance. Complete isolated signed capability and sandbox tests before enabling production gate. No owner cost or family data changes. Maintain relevant repo docs as implementation progresses.
