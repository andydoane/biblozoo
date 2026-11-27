# BibloZoo — isolated development-signed Apple age-assurance sandbox

## I — signed significant-update sandbox results (November 27, 2026)

[#261](https://github.com/andydoane/biblozoo/pull/261) merged at `6300d58664bfec4aa31abbfa2e3325bcf31acde0`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/46044370576) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/46045225725) SUCCESS. Owner reports signed build succeeded, exact sandbox ID and version 1.1, signature/designated requirement valid, signed/profile age entitlement and get-task-allow true, matching profile ID suffix, clean Git status. Previous #260 199 assertion output PASS; no repeat output after #261 supplied. New signed experiment traces confirm installed sandbox launched. No real-family data or distribution.

| Owner-selected Apple scenario | adultNotice / minorConsent | Route and result | First applied policy |
| --- | --- | --- | --- |
| Under 13, approved | false / true | parentalPermission, pending, approved | holdInitialConsent |
| 13–15, approved | false / true | parentalPermission, pending, approved | holdInitialConsent |
| 16–17, declined | false / true | parentalPermission, pending, denied | holdDenied |
| 18+ confirmed, change applicable | true / false | adultAcknowledgment, approved | holdUpdate |
| 18+ confirmed, no change | false / false | noPrompt, verifiedNoPending | holdUpdate |
| 18+ unconfirmed, no change | false / false | unavailable, unknown | holdAgeVerification |

All six reported regulatory=needsCheck, unknown=false, age request attempted/completed, updateEvent=started/finished. Owner saw system adult acknowledgment prompt and tapped Continue; then native screen said permission for app update needed. Last two cases went to native block. Minor visual prompt details not supplied. No WebView load shown in supplied traces. All six scoped diagnostic expectations met; experiment never grants access on update approval. Not a real significant app update, real child authorization or durable consent test.

Subsequent assessments in both approved minor runs, declined minor run and applicable adult run reported updateEvent=repeated and applied=holdUpdate, no repeated update request in observed coordinator lifetime. Generic barrier replaced more specific minor reasons; fix messaging/state semantics before production, not evidence of durable permission. Two devicectl connection invalidations after recorded results; exact cause unknown, screen timeout suspected for one. No actual permission API failure recovery, account-scoped persistence, pending cancellation/restart recovery or consent revocation tested.

Stop console (Control+C), set sandbox Age Assurance Off, leave separate sandbox installed; advised, not independently confirmed. Next review revocation documentation/sandbox limits; no server-based simulation can establish native-only revocation acceptance. No trigger on production ID or real accounts. No new build required for this documentation checkpoint. Native branded barrier design follows revocation investigation; system prompts remain Apple-owned. Initial app-specific consent, durable update handling, actual revocation/restoration and release feasibility remain HOLD.

## H follow-up — compile correction (November 27, 2026)

Owner-reported clean #260 merge checkout, build/sync and 199 Debug assertions PASS. Signed 1.1 build failed at the iOS-only call to evaluateSandboxUpdate: generic UIViewController argument incompatible with BibloZooAgeGateViewController. The sole caller already supplies the specific native gate controller; candidate narrows private evaluate(in:) signature accordingly, no forced cast or access-policy change. Provisioning inputs prepared, but no successful signed build, final entitlement/profile validation or install. After green PR/merge checks, clean pull and repeat synthetic suite and signed stage H build (fresh temporary DerivedData). Do not alter signing or reinstall until successful verification. Host CI is not device SDK typechecking evidence. All stage H scope and stop conditions remain in force.

## H — isolated significant-update response experiment (candidate, November 27, 2026)

Only after green PR and merge CI: clean pull, build/sync, run synthetic suite (199 Debug assertions expected). Repeat separate development-signed sandbox build from stage C with fresh temporary DerivedData and command-line `MARKETING_VERSION=1.1` in addition to the existing exact sandbox ID, sandbox entitlement and Debug flag. No tracked version change, no App Store update. Verify signed app, profile, exact sandbox ID, version 1.1 and entitlements before installing. Use only the existing disposable Sandbox Apple Account; confirm it is active and select the intended scenario before launch. Never test with real family account or actual production app. If Apple requests another entitlement, account or service, stop.

Use exact sandbox process and explicit argument after bundle identifier (check devicectl launch --help if necessary):
```bash
xcrun devicectl device process launch --device "$sandbox_device" --terminate-existing --console com.andydoane.biblozoo.agesandbox --biblozoo-test-significant-update
```
Report only tagged lines and visible system prompt/hold behavior. Do not restart or change scenario while awaiting a response; if no result after about 60 seconds, record pending/unknown and stop console; no automatic retry. Relaunch per case with correct Settings selection. Test under 13 approved first, then 13–15 approved, 16–17 declined, adult confirmed change applicable (acknowledge system prompt if shown), adult confirmed change not applicable (no request), unconfirmed adult (no request). Expected parental route for minor update flags, approved/denied from matching PermissionKit response only; adult acknowledgment only for applicable flag. Unknown, cancelled, unexpected/default-denial mismatch or unavailable remains non-authorizing. The experiment deliberately blocks content even for adult approval or noPrompt. Minor approval cannot resolve initial consent. No actual update or revocation, no real permission to use app proved. Version 1.0 and ordinary launch behavior unchanged; after tests revert to previous 1.0 sandbox build if further first-release testing needed. Pending UI is test-only; branded native redesign deferred until update/revocation evidence. No server or iCloud, no Release activation.

## G — signed diagnostic and reliability acceptance (November 27, 2026)

Baseline [#258](https://github.com/andydoane/biblozoo/pull/258), merge `904db90179d58ad08372ebfb6beef1d651beb482`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/46022964296) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/46023289616) SUCCESS. Owner reports fresh web build/sync, 186 assertions, signed sandbox build, signature and matching sandbox profile/entitlements verified, clean Git status, and tagged console output on iPhone 15 Plus / iOS 27.0.1. All listed assessments had regulatory=needsCheck, unknown=false, request attempted/completed and policy decision applied.

| Selected scenario | adultNotice | minorConsent | Classification | Applied decision |
| --- | --- | --- | --- | --- |
| 18+, confirmed, change applicable (owner corrected earlier selection) | true | false | confirmedAdult | allowChildSafe |
| 18+, confirmed, change not applicable | false | false | confirmedAdult | allowChildSafe |
| 18+, not confirmed, change not applicable | false | false | adultNotConfirmed | holdAgeVerification |
| Under 13, change approved | false | true | minor | holdInitialConsent |

Native holds observed for unconfirmed adult and under 13. Original unexpected allow in stage E not reproduced; cause unknown. Prior 13–15 and 16–17 visible results remain scoped to E. No actual update permission call or verified initial consent.

| Reliability case | Owner-reported evidence / scope |
| --- | --- |
| Adult allow → minor hold after Settings change and foreground return | Same process, epoch 0→1, fresh completed request, applied hold and white barrier |
| Repeated minor restriction | Epoch 2 and another applied minor hold; no bypass in recorded policy; exact visual continuity and retry trigger not separately confirmed |
| Offline adult cold launch | Airplane Mode/Wi-Fi off per test instructions; confirmedAdult, allowChildSafe, WebView loaded |
| Offline scenario change | Developer Settings required internet; changed to under 13 online instead |
| Offline minor cold launch | Two completed minor/holdInitialConsent assessments; not an offline foreground transition test |
| Reconnect / restoration | Same console session: third minor hold, then confirmedAdult/allowChildSafe and WebView loaded; owner says app opened after Try Again following instructed reconnect and adult restoration sequence; no independent connectivity timestamp for each line |

No actual connectivity-related error or timeout, so no error recovery tested. No evidence of real-account offline availability, actual parental consent revocation, authorization of a real child, or legal sufficiency. Do not infer that WebView lifecycle messages imply content was visible or that absence of a reported flash proves none occurred. Production microphone retest, accessibility and native UI polish remain separate. Do not enable Release gate.

End this round by stopping the console (Control+C), setting sandbox Age Assurance to Off, and restoring normal connectivity; leave the separate sandbox installed. Owner was advised to do so; completion not separately confirmed. Next decision is initial/current minor app-specific consent feasibility, not another forced sandbox request or policy change. Preserve no-backend boundary and Release HOLD.

## E — owner-reported initial signed device matrix (November 27, 2026)

iPhone 15 Plus, iOS 27.0.1; 186 synthetic checks, unsigned and signed device builds, signature and matching profile entitlement/identity checks, sandbox installation and account configuration reported passed. All six scenario launches completed.

| Scenario | Observed |
| --- | --- |
| 18+, confirmed, no change | Allowed; no Apple prompt reported |
| 18+, unconfirmed, no change | Allowed unexpectedly; no Apple prompt reported |
| Under 13, change approved | Initial consent hold; retry returns to hold |
| 13–15, change approved | Initial consent hold |
| 16–17, change declined | Initial consent hold |
| 18+, confirmed, change applicable | Allowed |

First two launches alone do not establish whether regulatory status required age or the request was invoked. Remaining prompt behavior not established. No PermissionKit or initial consent verification. Optional setup reported microphone unavailable and Photos ready; verify regular production identity separately, not an audio regression claim.

## F — diagnostic retest (candidate, pending CI and owner approval)

After green PR/merge checks, pull ios-prep and repeat the existing clean build/sync, synthetic checks and separately signed Stage C build with sandbox-only entitlement, same separate ID, new temporary DerivedData. Verify actual signed app, profile and identity again before reinstalling sandbox only. Do not uninstall normal app or change tracked production settings. Retest unconfirmed adult, confirmed adult and under 13 first. Use the existing exact device and app identity. To collect stdout, inspect `xcrun devicectl device process launch --help` for console support, then:

```bash
xcrun devicectl device process launch --device "$sandbox_device" --terminate-existing --console com.andydoane.biblozoo.agesandbox
```

Stop the console session before changing scenario and relaunching. Share only lines prefixed `[BibloZooAgeSandbox]` and visible hold/allow outcome; no full console dump. If console is unavailable or no tagged lines arrive, report limitation; do not infer a regulatory result. Diagnostics distinguish regulatory outcome/feature booleans, request skipped/attempted/completed/failed/cancelled, classification/policy, and applied or discarded epoch result. A completed request is not proof of consent; no raw bounds, method, identifiers, payloads or errors. Console output may be captured by host tooling; no app-owned storage or telemetry. Diagnostics compiled only for physical iOS Debug sandbox and emitted only for exact sandbox identity. Do not change policy or force requests to produce desired results. Release HOLD remains. No new server, production entitlement or distribution.

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

