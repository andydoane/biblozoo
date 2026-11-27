# BibloZoo — isolated development-signed Apple age-assurance sandbox

## Scope / stop conditions

November 27, 2026. Owner elects sandbox-first and defers contacting Apple. Membership active, paid developer team selected with automatic signing, ordinary iPhone app runs normally. Owner verified Debug/Release effective signing and unchanged production ID; Debug has DEBUG only, Release no conditions reported. Production identifier registered and App Store Connect BibloZoo iOS 1.0 record created/corrected, Prepare for Submission. Xcode project diff showed only reorder of three existing references, no functional settings changes; advised discard cosmetic change only after review. Verify clean checkout before test. Never publish account email, team/device IDs, provisioning contents, sandbox credentials or raw age/transaction responses. Owner approved preparation, not production activation, upload, additional spending or server.

Candidate adds distinct BIBLOZOO_AGE_ASSURANCE_SANDBOX flag: iOS physical-device Debug only, mutually exclusive with live/fixture flags, exact ID com.andydoane.biblozoo.agesandbox. Native gate calls existing real adapter and conservative policy, not fake fixtures. Initial minor consent remains unknown, first-release update policy unchanged, PermissionKit and rating comparison are not invoked by this experiment. No persistent age data, JS transport, new service or production entitlements. Native audio and production parental gate do not recognize this test identity; do not use this app for normal gameplay, real family data, or production audio acceptance. Gate has visible sandbox label while shown. Successful sandbox results are not proof of initial consent or real revocation behavior. Release activation remains compile-blocked.

## A — owner first verifies candidate compile and isolation (no account changes)

After green PR/merge checks and clean pull of ios-prep, from repo root:

```bash
git status --short
git rev-parse --short HEAD
npm run build && npx cap sync ios
tmpdir="$(mktemp -d)"
xcrun swiftc -D DEBUG ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath "$tmpdir/Sandbox" CODE_SIGNING_ALLOWED=NO PRODUCT_BUNDLE_IDENTIFIER=com.andydoane.biblozoo.agesandbox 'SWIFT_ACTIVE_COMPILATION_CONDITIONS=DEBUG BIBLOZOO_AGE_ASSURANCE_SANDBOX' build
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$tmpdir/Sandbox/Build/Products/Debug-iphoneos/App.app/Info.plist"
```

Expected: clean at start, 186 Debug assertions (160 without DEBUG), BUILD SUCCEEDED, exact sandbox ID. This is unsigned compile only; do not install. Report pass/fail and any compiler errors, not full account/device listing. The new forbidden-mode checks run in CI; physical SDK compilation remains owner verification. If failure stop. Do not modify production settings to get it to compile.

## B — separate registration and sandbox account (after A passes)

Apple requires the Declared Age Range capability/entitlement and an iOS/iPadOS 26.2+ sandbox environment. See [framework](https://developer.apple.com/documentation/declaredagerange), [age assurance testing](https://developer.apple.com/documentation/storekit/testing-age-assurance-in-sandbox), [sandbox account creation](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account). Confirm capability is available for an explicit separate sandbox App ID, not the existing production identifier. Owner manually creates only the separate ID after approving this step, selects Declared Age Range, and creates a disposable US Sandbox Apple Account using an unused test email (not personal enrollment account). No second public app record unless Apple specifically requires it and owner approves. No IAP product, significant-update submission, iCloud, server URL, paid service or real child account. If Apple requires any of those, stop.

On a supported test device with Developer Mode, use Developer settings → Sandbox Apple Account; do not sign out of primary Apple Account or change production account data. Sandbox settings may affect other development-signed apps on the device; avoid ordinary app testing during this session and prefer dedicated device if available. No credentials shared in chat. If menu absent, stop and report OS/menu state. No destructive account changes to troubleshoot.

## C — isolated signing and identity check (after B, separate owner go-ahead)

Use the existing project without changing tracked settings; use command-line Debug override, exact sandbox ID, and explicit `scripts/ios-age-sandbox.entitlements` only for sandbox build. Apple documents the entitlement must be present in the signed app and supported by the provisioned App ID. File is not referenced by production project. On the Mac use new temporary DerivedData, automatic development signing, and allow provisioning updates only when owner explicitly approves registration/profile operations. Inspect the actual signed app's bundle ID, signed entitlements and embedded profile locally before any install; verify exact sandbox ID, Declared Age Range true, development signing / get-task-allow true and matching provisioning. Report only yes/no, no raw profile or signed entitlement dump. Do not install if wrong ID, missing entitlement, signature or profile mismatch. Use exact connected test device, not generic destination for installation. Provide exact signed-build/install commands after A and B confirmed; no distribution archive, TestFlight upload or production entitlement changes.

## D — initial live-API matrix, after isolation verified

Select documented scenarios under Developer → Sandbox Apple Account → Manage → Age Assurance. Record only coarse result (allow / age hold / consent hold / unavailable / unsupported / unexpected), OS version and scenario name; no numeric age bounds, account IDs, transaction payload, screenshots containing personal details or persistence. Relaunch only the sandbox identity between cases. Compare to existing policy:

| Apple sandbox scenario | Expected if real regulatory check indicates age required and API returns documented response |
| --- | --- |
| Under 13, update approved | initial consent hold; update approval is not initial consent |
| 13–15, update approved | initial consent hold |
| 16–17, update declined | initial consent hold in first-release test; update flow not called |
| 18+, unconfirmed, update not applicable | age verification hold |
| 18+, confirmed, update not applicable | allow child-safe bridge |
| 18+, confirmed, update applicable | record regulatory response as reflected in existing first-release policy; no actual significant update is simulated by our code |
| No applicable requirements / unsupported / declined / unavailable | respective policy outcome; record if scenario does not exercise required branch |

If Apple's sandbox returns notRequired despite a selected scenario, or prompt unavailable, record limitation rather than overriding the real regulatory signal. No forced real requests, fake grant, receipt inference or test of real child's account. Recheck foreground/background, offline cold/reentry, retry/cancellation, VoiceOver gate only with synthetic sandbox account. Use of a different bundle may not reproduce production app purchase/download history. Apple documents Revoke App Consent sends a simulated server notification when V2 server enabled; no server here, don't infer actual launch blocking or restored permission from this simulation. Defer revocation experiment until explicitly authorized against sandbox ID only. Significant-update PermissionKit response, rating metadata, actual initial consent and native-only legal sufficiency remain unresolved; separate test PR/decision as evidence warrants. No live activation or public distribution.

