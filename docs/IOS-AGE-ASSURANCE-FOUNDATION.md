# Native age assurance — foundation compile checkpoint

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
