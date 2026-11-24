# BibloZoo — staged native age-assurance access policy

## CURRENT — staged StoreKit app-rating comparison (November 24, 2026)

Merged [#241](https://github.com/andydoane/biblozoo/pull/241) at `4ee00467a6dec937178dcf85ff2947fb9a07690f`; [final PR CI](https://github.com/andydoane/biblozoo/actions/runs/45469095169) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45469430157) passed. Owner source `c6301837` passed 164 Debug assertions, both unsigned builds, fixture identity, all 15 synthetic runtime scenarios, progress retention and Larger Text. VoiceOver, native audio parity, prompt/modal/direct-link and real-device checks deferred. Current candidate stages [StoreKit app-rating comparison](IOS-AGE-ASSURANCE-STOREKIT-RATING.md): optional opaque integer, iOS 26.2+, no runtime caller, no consent inference or persistence; 15 new cases expected (154 ordinary / 179 Debug). Zero in development/sandbox/TestFlight is not production rating evidence. CI and Mac compile pending. Initial consent, notification/serverless sufficiency, baseline provenance, older OS/offline and revocation still block live activation. No backend, new costs, signing or family data changes. See [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md).

## CURRENT — availability policy and age-assurance roadmap (November 24, 2026)

Merged #237 at `089b72844d5f31a770e97c3cba6706cac9194ed5`. Owner tested exact head `a8b28874`: all 110 synthetic assertions PASS; unsigned simulator BUILD SUCCEEDED (SDK 26.5, arm64/x86_64, iOS 15 target); branch validation passed. Current candidate #238 separates unsupported platform from transient system failures and adds a non-Debug live-flag compile fence. The conservative staged gate still holds unresolved consent/errors, not a final older-OS or offline release policy. It does not assume connectivity, cache approvals, infer consent from installation, or alter normal builds. No backend, iCloud, signing, new costs, PWA or Audio Test changes. See [standalone age-assurance roadmap and resume instructions](IOS-AGE-ASSURANCE-ROADMAP.md) for exact baseline, completed PRs, remaining acceptance and stop/go gates. The roadmap is the current entry point for this workstream; older checkpoints are historical. Apple's [Q&A](https://developer.apple.com/support/age-assurance/) and [June 3 Texas update](https://developer.apple.com/news/?id=sg176nne) were rechecked November 24; initial minor consent signal, server notification applicability, legacy-account eligibility and offline behavior remain unresolved. Expected prior 110 + 18 availability/offline-policy assertions; candidate compile not yet verified. Do not activate for release, enroll/pay or install on family devices. Next: obtain decisive evidence and run isolated synthetic lifecycle/UI acceptance, not speculative implementation of consent.

## CURRENT — staged foreground reauthorization (November 24, 2026)

Merged #236 at `4a7c45a850545f06d8d68b1b7ac110ffae8f43e7`. Owner's exact head `0d8ad7bb` passed all 89 synthetic assertions and unsigned simulator BUILD SUCCEEDED on Xcode 26.6 / SDK 26.5, arm64 and x86_64. PermissionKit correction compiled; expected legacy age declaration warnings and skipped AppIntents metadata remain nonblocking. GitHub Actions validation succeeded. Current candidate adds [foreground lifecycle safeguards](IOS-AGE-ASSURANCE-LIFECYCLE.md): transient foreground ticket, invalidate before cancellation, reject stale completion, return to native gate after authorized scene backgrounds, fresh check before restoring same retained bridge, explicit Retry after interruption/denial. No live flag activation, server, signing, data persistence or new expenses. Initial minor consent still unknown; Apple's [current Q&A](https://developer.apple.com/support/age-assurance/) confirms OS prevents launch after parental revocation, but directs developers to RESCIND_CONSENT server notifications. This is not a verified initial consent signal or complete revocation mechanism; no backend authorized. Ordinary builds, PWA and Audio Test unchanged. Root transition, native bridge/audio behavior, offline/older OS compatibility and real signed responses remain untested. No production install. Expected 89 prior + 21 foreground assertions, unsigned simulator compile; candidate not yet tested by author.

## CURRENT — significant-update system adapter (November 24, 2026)

Merged #234 (`bef654266bb7c545c3def8bc5a9970321e767154`); owner tested exact head 5172c734, reported 14 + 7 + 10 + 9 + 24 synthetic assertions PASS and normal unsigned simulator BUILD SUCCEEDED; branch validation passed. Separate opt-in build remains unverified. Current candidate adds [Apple significant-update adapter](IOS-AGE-ASSURANCE-CONSENT.md): documented adult acknowledgment and PermissionKit question/response APIs, scoped to an actual version-specific change, matched in-memory response ID, conservative decline default and cancellation/unknown handling. The adapter has no live startup caller, and the live gate remains disabled. First release 1.0 has no pending significant update. Initial minor consent is not exposed as a field in Apple's documented AgeRange response; no substitute invented, so initial consent, persistence/recovery, account change/revocation, older OS/offline and signed sandbox acceptance remain release blockers. No backend, iCloud, accounts, extra cost, signing or visible ordinary app change. App Review not legal clearance.

**Baseline:** `ios-prep` at `191ca61a27e4ce38ee4dca93e14436180f7b9110` (merged #233). November 24, 2026. Owner reported 14 classification, 7 regulatory, 10 startup assertions PASS and unsigned simulator BUILD SUCCEEDED with Xcode 26.6/SDK 26.5, both arm64 and x86_64, target iOS 15. Deprecated pre-26.5 declaration names generated nonblocking warnings. No live age check performed. Owner asks that relevant repo docs remain current.

## Scope and evidence

[Apple age assurance Q&A](https://developer.apple.com/support/age-assurance/), [Apple native significant-change sample](https://developer.apple.com/documentation/declaredagerange/implementing-age-assurance-and-permissions), [Texas chapter 121 §§121.021, .022, .024, .054–.055](https://tcss.legis.texas.gov/resources/BC/htm/BC.121.v3.htm). Apple documents distinct age and significant-update obligations, confirmed adult vs unconfirmed, parental approval and OS launch blocking after revocation. Texas separately requires verification of assigned age category and whether minor consent has been obtained; do not infer consent from age category, parental controls, a signed purchase/install or Grown-up Check alone. No explicit developer server mandate found; Apple's notification instructions and no-server sufficiency remain unresolved. Owner chooses native implementation/testing and App Review, no forum post. Review is not legal clearance.

This PR adds a pure access policy and **staged**, opt-in-only native startup shell; not yet a releasable implementation. No live flag enabled, entitlement or signing change, SDK dependency change, paid infrastructure, account, iCloud, remote database, PWA, Audio Test or family/game data change.

## Decision matrix

| Input | Proposed staged decision |
| --- | --- |
| No applicable requirements; no pending update | Allow unchanged child-safe experience |
| Update-only region; first release/no pending update | Allow; no age prompt just for hypothetical future update |
| Confirmed adult; no pending update | Allow child-safe experience, retain Grown-up Check |
| Minor with separately verified store consent; no pending update | Allow child-safe experience (synthetic case only) |
| Minor without independent consent evidence | Hold; do not infer consent |
| Unconfirmed adult, ambiguous category, declined sharing | Hold for age verification |
| Unknown regulatory features, error, unsupported OS, incomplete check | Hold unavailable; no unsupported-device exemption assumed |
| Pending significant update | Hold until version-scoped required response verified |
| Denied/revoked consent | Hold denied, preserve family data |

The current service requests 13, 16, 18 gates for regional categories and detects ambiguous minor ranges; raw bounds and confirmation method are transient, not returned to JS, logged or persisted. It retains only in-flight assessment flags for adult update notice, minor update consent and unknown requirements. Actual initial consent input is always unknown: a minor is intentionally blocked in opt-in test until a genuine store signal is implemented. No PermissionKit or version-scoped approval source is connected yet; pure policy cases illustrate separate inputs, not real approvals. For the staged 1.0 build only, first release has no prior significant update; other versions hold until update state implemented. Do not reuse 1.0 assumption for future releases or claim full coverage of legacy eligibility API.

## Native lifecycle

Only exact production bundle plus `BIBLOZOO_AGE_ASSURANCE_LIVE` can choose the native gate root before any WKWebView or JS bridge is created. Flag remains unset in all tracked build configurations. Ordinary launch follows existing root setup; Audio Test and PWA unaffected. Gate performs one automatic attempt, explicit native Retry if held, cancels in true background/disconnect, rejects stale or inactive completions; no automatic prompt loop, no game data deletion. When allowed, installs existing root controller. A successful initial grant is not revalidated on every foreground yet: account changes, revocation while running, repeated offline access and old-OS behavior need separate acceptance before activation. Generic native holding screen only, not final user-facing design. No normal build behavior change. Do not enable the flag on owner family phones; no release with this candidate policy until remaining consent/lifecycle/compatibility checks are addressed.

## Acceptance (no install)

From clean repo root, obtain PR head by PR ref (works even if branch deleted, unless already on verified merged commit):

```bash
git status --short
git fetch origin refs/pull/234/head && git switch --detach FETCH_HEAD
git rev-parse --short HEAD
```

Do not switch if working tree is dirty. If already merged and local ios-prep matches, test that commit instead. Run:

```bash
tmpdir="$(mktemp -d)"
xcrun swiftc ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

Expected 14 age-range classification, 7 regulatory routing, 10 startup lifecycle, 9 regulated age-category cases, 24 access policy assertions. Counts are synthetic, not actual Apple responses.

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Also compile opt-in branch only, not run or install, using a separate build output to keep the earlier ordinary build distinct:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceLiveCompile CODE_SIGNING_ALLOWED=NO 'SWIFT_ACTIVE_COMPILATION_CONDITIONS=DEBUG BIBLOZOO_AGE_ASSURANCE_LIVE' build
```

Expected BUILD SUCCEEDED for each. Opt-in compile may not be necessary to verify most code (both branches typecheck in normal build except conditional constant); no entitlement or sandbox proven. No author-side compile or test claimed. After merge switch back to ios-prep and pull --ff-only. Preserve existing saved data/Audio Test; no device install.

## Release blockers and next checkpoint

Determine actual native store evidence for initial minor consent, version-scoped significant update notice and PermissionKit approval/denial; implement safe handling for decline/error/unknown/older systems and offline, lifecycle rechecks without destroying web state, and actual revocation. Keep no-server/no-fee constraint; if it cannot be met reassess with owner. Enable capability only in approved isolated signed test build after policy complete, run real sandbox/physical device scenarios and inspect final archive/privacy/metadata. No claim of compliance, signed entitlement, server notification exemption, Apple approval or legal clearance. Review owner-approved provisional Data Not Collected answer and published policy when actual behavior established. Existing Kids, asset rights and other release gates remain.
