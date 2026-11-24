# Native age assurance — foundation compile checkpoint

## CURRENT — isolated simulator fixtures (November 24, 2026)

Merged #238 owner-tested exact head 0288c201: 128 synthetic checks and unsigned simulator compile PASS; branch CI passed. Candidate #239 adds [isolated synthetic simulator mode](IOS-AGE-ASSURANCE-SIMULATOR.md) only with Debug, simulator, explicit fixture flag and exact separate bundle ID. No real age API call in fixture mode, no production activation, native audio parity, signing, backend, iCloud, cost or family data change. Normal production, Audio Test and PWA unchanged by design. No genuine consent, revocation, older OS or offline evidence. Initial consent and notification obligations unresolved. Release/physical-device fixture compile fences added; testing pending. See [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md) for remaining gates; previous legal, privacy, listing and Kids decisions unchanged.

## CURRENT — age-assurance roadmap and availability checkpoint (November 24, 2026)

See [standalone age-assurance roadmap](IOS-AGE-ASSURANCE-ROADMAP.md) for the complete current checkpoint and remaining release gates. Merged #237 owner-tested exact head a8b28874: 110 synthetic checks and unsigned simulator compile PASS. Candidate #238 distinguishes unsupported platform from temporary/unavailable check, adds a non-Debug live-flag compile fence and synthetic offline policy assertions. No live activation, new data persistence, connectivity probe, signing, backend, iCloud, cost or changes to ordinary app, PWA or Audio Test. Initial minor consent, legacy-account eligibility, offline/revocation behavior and notification obligations unresolved; no implied legal clearance or new privacy-label/metadata decision. Existing release gates remain. Candidate acceptance pending; future updates must maintain the roadmap and relevant docs.

## CURRENT — foreground reauthorization checkpoint (November 24, 2026)

See [current lifecycle implementation](IOS-AGE-ASSURANCE-LIFECYCLE.md). #236 merged and owner verified 89 synthetic checks and unsigned simulator BUILD SUCCEEDED on exact head 0d8ad7bb. Candidate adds foreground-scoped ticket invalidation and recheck before restoring retained gameplay controller, only in the still-disabled staged live mode. No retained age/consent proof, raw age storage, developer network client, new signing, cloud service or ordinary app/PWA/Audio Test behavior change. No actual initial minor consent signal or complete revocation mechanism yet; Apple [Q&A](https://developer.apple.com/support/age-assurance/) directs developers to RESCIND_CONSENT notifications as well as OS launch enforcement. No-server sufficiency, retained bridge/audio behavior, older OS/offline and signed sandbox acceptance remain open. Existing privacy, Kids, listing, parental gate and legal release gates remain; no enrollment, backend, family-device installation or cost authorized.

## CURRENT — significant-update system adapter (November 24, 2026)

Merged #234 (`bef654266bb7c545c3def8bc5a9970321e767154`); owner tested exact head 5172c734, reported 14 + 7 + 10 + 9 + 24 synthetic assertions PASS and normal unsigned simulator BUILD SUCCEEDED; branch validation passed. Separate opt-in build remains unverified. Current candidate adds [Apple significant-update adapter](IOS-AGE-ASSURANCE-CONSENT.md): documented adult acknowledgment and PermissionKit question/response APIs, scoped to an actual version-specific change, matched in-memory response ID, conservative decline default and cancellation/unknown handling. The adapter has no live startup caller, and the live gate remains disabled. First release 1.0 has no pending significant update. Initial minor consent is not exposed as a field in Apple's documented AgeRange response; no substitute invented, so initial consent, persistence/recovery, account change/revocation, older OS/offline and signed sandbox acceptance remain release blockers. No backend, iCloud, accounts, extra cost, signing or visible ordinary app change. App Review not legal clearance.

## CURRENT — follow-up checkpoints (November 24, 2026)

PR #232 merged and owner-reported 14 synthetic cases and unsigned simulator build PASS at e573925f; PR #233 merged at `191ca61a27e4ce38ee4dca93e14436180f7b9110` with 14 + 7 + 10 tests PASS and simulator build success. The foundation's original lack of callers below is historical; see [startup](IOS-AGE-ASSURANCE-STARTUP.md) and current [access policy](IOS-AGE-ASSURANCE-ACCESS.md). Live requests still disabled, no signing changes or live tests. Current combined test suite supersedes older expected counts; use current access acceptance commands.

Baseline `d9fe4065b20aeab1dfbeeab608e0d23854a5f81c` (merged #231). Owner's Mac reports Xcode 26.6 build 17F113 and iPhoneOS SDK 26.5. This is an isolated source foundation, **not active compliance functionality**. It deliberately does not call Apple's APIs on launch or from JavaScript. No entitlement or signing change; do not add capability to a free team or install on the original production identity yet.

References: [Apple age assurance Q&A](https://developer.apple.com/support/age-assurance/), [native request](https://developer.apple.com/documentation/declaredagerange/agerangeservice/requestagerange(agegates:_:_:in:)-2go8c), [response](https://developer.apple.com/documentation/declaredagerange/agerangeservice/response), [required regulatory features](https://developer.apple.com/documentation/declaredagerange/agerangeservice/requiredregulatoryfeatures), [confirmed](https://developer.apple.com/documentation/declaredagerange/agerangeservice/agerangedeclaration/confirmed). SDK symbols and availability still require actual compilation. 26.4+ regulatory features are detected as a set; a nonempty set conservatively triggers the candidate age check rather than an automatic grant. Future caller must distinguish specific obligations and invoke only required age queries. 26.2/26.3 eligibility fallback; older runtime or error unavailable. No age category returned to web code, logged, persisted, used for profile switching or used as evidence of parental consent. Existing child-safe defaults remain. No runtime launch or access policy implemented.

From the repo root **on the PR branch**, run the synthetic classification test without installing anything:

```bash
tmpdir="$(mktemp -d)"
xcrun swiftc ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
rm -rf "$tmpdir"
```

Expected: PASS: 14 synthetic age-range classification cases. This exercises pure logic only, not the native system request.

Compile the real iOS target without signing or running/installing (uses a separate derived-data directory; the existing Capacitor packages may need resolution):

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Expected BUILD SUCCEEDED; report exact errors if not. If local build prerequisites require generated web assets, use existing repo build instructions, not an installation. Check old-OS weak linkage in a later disposable simulator. Do not run on family devices or modify production signing. No actual Xcode build, test, signing or sandbox results claimed by PR author.

After compile: review exact legal and Apple regulatory-feature routing, minor initial consent, verification methods (including other methods), account changes, denied/unavailable/older OS and offline states, significant update and acknowledgement, revocation and native lifecycle gating before enabling live checks. Implement only in isolated later PRs; no developer server, endpoint, iCloud, paid verifier, user accounts, data store or changed gameplay. Review feasibility and owner acceptance, then App Review; approval is not legal clearance.
