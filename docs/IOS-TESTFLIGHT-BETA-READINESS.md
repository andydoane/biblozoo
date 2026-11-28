# BibloZoo — first TestFlight beta readiness runbook

## CURRENT — App Store Connect validation 90474 / iPad multitasking (November 27, 2026 US Eastern)

#269 merged at `87481ee76cf1b8a841a9c086fdad86b6c85a5eff`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/46091870598) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/46092067475) SUCCESS. Owner created Nov 27 8:22 PM production-identity archive 1.0 (1), SDK 26.5. All three read-only inspections passed under prior checker: 16 sampled assets, 2,203 public files / 129,984,777 uncompressed bytes, four exact source notices plus alias, 57 duplicate groups / 1,695,385 extra bytes, 10 review candidates / 1,167,155 bytes. App/Capacitor/Cordova manifests no declared tracking/domains/collection; app reasons 35F9.1 and 3B52.1; SDK manifests no declared reasons. Signature valid, designated requirement satisfied, expected production bundle/version/build/team, development-stage get-task-allow true, no Declared Age Range entitlement. Not final distribution signing, privacy certification or a download-size estimate. Local Xcode pbxproj diff reviewed: same Swift/debug.xcconfig references reordered, both configurations added display name BibloZoo and Education category; no changes to team, ID, build/version or deployment target. Leave local metadata change separate; no commit/discard needed for this candidate. Exact archive payload increase versus older unsigned baseline noted, not independently attributed. No upload or installation performed.

Apple Organizer Validate App rejected this archive with server error 90474: portrait-only UISupportedInterfaceOrientations does not meet four-orientation iPad multitasking requirement. Warning also says iOS 27 SDK or later/Xcode 27 or later required starting April 2027; SDK 26.5 warning not the reported validation rejection. No upload occurred. [Apple orientation key](https://developer.apple.com/documentation/bundleresources/information_property_list/uisupportedinterfaceorientations), [TN3192](https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key) and [iPad multitasking](https://developer.apple.com/documentation/uikit/multitasking-on-ipad-mac-and-apple-vision-pro) checked November 27. Apple recommends adaptive resizing rather than deprecated UIRequiresFullScreen. Owner explicitly authorizes this narrow repair. Candidate adds upside-down and both landscape orientations ONLY to UISupportedInterfaceOrientations~ipad, leaves base iPhone portrait only, no UIRequiresFullScreen opt-out. Existing web layout retained (main CSS has a landscape Home grid rule and shared responsive layout; no proven universal portrait letterboxing in full landscape); do not promise exact centered portrait geometry before testing. No Swift, gameplay, asset, signing, PWA, entitlement, age gate, deployment target or version changes. Existing archive inspector now checks exact phone/iPad orientation arrays on source and actual archived Info.plist; synthetic tests refuse old portrait-only, missing/duplicated orientations, phone expansion and full-screen opt-out, accept reordered iPad array. This is a declaration test, not a runtime UI or Apple validation result.

After green CI and merge: pull ios-prep, preserve reviewed local pbxproj change if GitHub Desktop permits; if pull conflict stop, do not reset/discard. Run npm run build and npx cap sync ios (no dependency change); open ordinary production configuration on an iPad simulator or available iPad with disposable/local test profile. Focus only on launch portrait, both landscape sides and upside down if device permits, window resize/multitasking, Home and one game touch/legibility, back to portrait without losing state, and iPhone portrait preference if needed. Existing game proportions intended, exact behavior unverified; if clipping, unusable controls or major visual expansion occurs, report screenshot before upload and make narrow layout repair only if needed. No sandbox flags/fixture identity for this test. If local profiles valuable preserve them; no uninstall. Fresh generic iOS Release archive (1.0 build 1 only if still unused; check ASC) and actual read-only inspector, packaging, privacy and signing checks on exact new archive; Apple Validate App again. Do not reuse rejected archive. If validation succeeds, proceed separately with owner-approved standard TestFlight & App Store upload; no public review/release. Controlled adult-only beta legal/eligibility checks and public-release parental authorization HOLD unchanged.

Status: November 27, 2026 US Eastern. Owner-approved preparation PR #269, based on merged `2ecc43999d7480ab01adfeadf9c0a915813175c5` (#268). This is a documentation-only change. Actual signed archive, upload, processing, TestFlight install, beta review and invitation acceptance are NOT yet performed. Follow the steps in order; stop on discrepancies. Public distribution remains HOLD. This guide supersedes historical no-upload instructions solely for the separately owner-directed controlled beta workflow.

## 1. Verified source configuration and remaining checks

| Item | Observed in current source / proposed first beta |
| --- | --- |
| Capacitor app ID and both Xcode target configurations | com.andydoane.biblozoo |
| Display name | BibloZoo |
| Marketing version / build | 1.0 / 1; verify build 1 unused in App Store Connect; if used increment build only and record actual uploaded number |
| Shared App scheme | ArchiveAction Release, buildForArchiving YES |
| Signing | Automatic, existing configured team; actual team/account/certificate/profile checked on owner's Mac, not here |
| Target | iOS 15.0 minimum, device family 1,2; verify current supported SDK/upload requirements and real archive |
| Age assurance | useNativeGate, useFixtureGate, useSandboxGate all false for ordinary Release; compile-time errors prohibit Release live/fixture/sandbox activation; SceneDelegate only stages native gate when useStagedGate true |
| Developer controls | app.js DEBUG_MODE=false; existing production identity-gated dev controls/diagnostics validators; do not claim absence of all diagnostic code |
| Content | 123 published, 124 retained; #268 PR and merge CI success, owner confirms John 11:35 unlisted |
| Privacy | Info.plist microphone and Photos-add strings unchanged; app manifest no declared collection/tracking, reasons 35F9.1 and 3B52.1; prior SDK manifest archive evidence, recheck fresh archive |
| Encryption | ITSAppUsesNonExemptEncryption=false already present; verify actual current use/export answers before upload; not independent export classification |
| Grown-up Check / optional setup | Existing flows unchanged; do not equate arithmetic gate or permission prompts with statutory authorization |
| App Store Connect | Existing record ID 6840024555, owner reports listing/screenshots/manual release, banking/tax entry completed; paid agreement Active, tax/bank processing, privacy Publish, final price/territory/rating not independently verified |

No runtime, scheme, entitlements, signing, packaging, version, dependency, artwork, PWA or data changes are needed for this preparation PR. Prior unsigned archive is not evidence of present signed distribution validity. Current repository is ios-prep, not the historical integration branch or agesandbox/agefixture. Never use sandbox flags, entitlements file or version 1.1 experiment. No production parental gate activation. Preserve free PWA and existing local profile data.

## 2. Beta eligibility and authorization (before any distribution)

Apple's [Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/) requires verifying legal adult age for testers of primarily child-directed apps; external distribution is for evaluation only and requires Apple approval. No fee to beta testers. Start with owner (verified adult), then a small named invitation-only US adult group, not children. Before external invitations, owner must verify each adult's age of majority in their jurisdiction based on reliable personal knowledge or appropriate adult verification, and confirm applicable regional requirements for that particular beta distribution; self-attestation alone is not asserted sufficient. Restrict to jurisdictions where this controlled beta can lawfully proceed without the unresolved gate, not simply assume adult-only is exempt. Do not invite if unsure. Do not collect/store ID copies, birthdates, child information or add identity collection to BibloZoo. Keep minimal private record of eligibility confirmation and jurisdiction (not in repo); use contact emails only in Apple's invitation interface. No public link, forwarding invitations or letting minors use this beta. No new external account access/ASC roles for family or friends. Pause/remove testers or expire build if scope cannot be maintained. Owner reviews legal and platform requirements before inviting; unresolved consent/public release HOLD is not waived by beta.

## 3. Prepare fresh archive (owner Mac)

Merge after CI passes; GitHub Desktop Pull ios-prep, Repository > Open in Terminal. If dirty or on wrong branch stop without discarding anything.

```bash
git branch --show-current
git status --short
git rev-parse HEAD
xcodebuild -version
npm ci
npm run build
node scripts/audit_ios_production_packaging.js --dist
node scripts/validate_release_bsb_verse_corpus.js
npx cap sync ios
npx cap open ios
```

Run commands one at a time; stop on unexpected failures or unreviewed changes. The first prints ios-prep. Confirm ASC TestFlight has no prior 1.0 build 1; otherwise choose next unused increasing build number. Record exact SHA and actual uploaded build. Do not blindly upgrade packages. In Xcode App target > Signing & Capabilities select existing team, automatic signing, exact production ID; no new capabilities or alternate IDs. General version 1.0/build 1 if unused. Select App scheme, Any iOS Device (arm64) / generic iOS device. Product > Archive (NOT Play). The archive operation does not install on a device. Do not overwrite/delete original app or reset profiles; backup optional for disposable owner data but preserve any needed local profiles before TestFlight installation because same ID can replace installed app. Never uninstall to troubleshoot.

## 4. Inspect exact fresh archive before upload

Organizer > Archives > select fresh BibloZoo archive > Show in Finder (context menu). In Terminal type `archive=` then drag the exact .xcarchive from Finder into Terminal, press Return. Verify path (or enter a quoted absolute path manually). These commands are read-only; no automatic latest-archive guessing.

```bash
printf '%s\n' "$archive"
node scripts/inspect_ios_archive.js "$archive"
node scripts/audit_ios_production_packaging.js --archive "$archive"
node scripts/audit_ios_archive_privacy_manifests.js "$archive"
app="$archive/Products/Applications/App.app"
test -d "$app" && codesign --verify --deep --strict --verbose=2 "$app"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$app/Info.plist"
codesign -d --entitlements :- "$app"
git status --short
```

Expected exact ID, 1.0, chosen build, valid archive signature, manifest and resource audits, no sandbox Declared Age Range entitlement or unexpected capability. Archive may carry a development signature before Organizer re-signs for distribution; do not mistake archive get-task-allow for final distribution signing. Check distribution signing/profile at Organizer validation/export summary, not force an archive to be distribution-signed manually. If generated Privacy Report is available inspect it, including app/Capacitor/Cordova manifests; a blank report is not privacy certification. Compare against approved policy and actual collection behavior. Stop if signature, bundle ID, entitlement, asset/privacy check or export status is unexpected. Prior iPad orientation warning: record actual Organizer validation result; no speculative landscape workaround. Do not share certificates, passwords, device IDs or private profile data in logs. Confirm current Xcode/SDK accepted by Apple's upload requirements at time of upload.

## 5. Upload to TestFlight only after archive checks and owner review

Apple [Xcode distribution guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases) and [upload help](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds). In Organizer choose Validate App if available; resolve validation failures, then Distribute App > TestFlight & App Store (or App Store Connect upload equivalent). NOT TestFlight Internal Only, which prevents external testing. Use automatic distribution signing, inspect summary and actual build number (Xcode may manage/increment build number; record it or disable automatic numbering if appropriate). Upload symbols per normal workflow; Apple crash/feedback handling distinct from in-app collection. Do not select a public App Store release, attach beta to final review, Add for Review or submit public version. Upload merely makes build available for processing. No archive or upload performed in this PR. In App Store Connect > BibloZoo > TestFlight, wait for processing; record status/version/build. If Missing Compliance, answer accurately using actual encryption usage (OS HTTPS etc.), existing Info.plist declaration and [Apple export guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance); do not guess or change declaration merely to clear warning. Confirm published privacy disclosures and link, actual test metadata before distribution. TestFlight data collection by Apple and voluntarily provided tester feedback is separate; do not promise zero data collected by Apple.

## 6. Copy-ready TestFlight fields (not final public App Review notes)

Beta app description:
> BibloZoo is a Bible verse memorization app with over a hundred Scripture lessons, narrated learning, memory games, collectible BibloPets and creative activities. Core learning works offline; no app account is required. This private beta is for verified adults evaluating the app with fictional Zookeeper profiles, not for children to use. Please do not share the invitation.

What to Test:
> Please create a fictional Zookeeper, learn a verse, practice a game and explore the Zoo. Try daily practice, Flashcards or Ghost Writer if you wish. Optional microphone and Photos permissions can be declined. Check that progress remains after reopening and core lessons work offline. Tell us what was confusing, broken or enjoyable. Report your device model, iOS version, app build, steps to reproduce and expected versus actual behavior. Use fictional names and test media only. Do not include children’s names, photos, voice recordings, backup files or other personal information.

Feedback email: biblozooapp@gmail.com (owner-monitored). Use [TestFlight feedback](https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-tester-feedback) or this email; no personal/child data or sensitive screenshots. Reviewer contact name, phone and email entered privately in ASC. Sign-in required: No. Beta App Review notes:
> BibloZoo is a child-directed educational Scripture memory app; this pre-release beta is restricted to verified adult evaluators, with no public invitation link or child testers. No sign-in or demo credentials are required. Create a fictional Zookeeper to access lessons, games, daily practice and the Zoo. Optional microphone recording and Photos saving are protected by the existing grown-up permission/check flows; sharing and external links also use grown-up checks. No ads, in-app purchases or subscriptions. The staged native age-assurance experiment is disabled in this Release beta; public-release parental authorization and legal review are not complete. This submission is for TestFlight evaluation only, not public App Store release.

[Provide test information](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/).

Private invitation draft (after verified eligibility and review approval):
> I'm inviting you to try BibloZoo on your iPhone or iPad for free through Apple's TestFlight app. This beta is for adult evaluation only; please do not share the invitation or let children use it. Use fictional names and test photos/recordings, and send feedback via TestFlight or biblozooapp@gmail.com without personal or child information. I'll send the private invitation to your Apple/TestFlight email once eligibility is confirmed. Thank you for helping test BibloZoo!

## 7. Internal first, then external

Install Apple's TestFlight app. In ASC > TestFlight create internal group for owner only, add eligible build and invite owner; no external users granted ASC access. Install on owner device after preserving any needed same-ID local data. Confirm app opens normally without age sandbox or dev banners, optional setup is as expected (may not recur on existing profiles), a normal lesson and one game work, no loss of expected profile data, and app can reopen. Check core offline path and optional mic/Photos only as targeted sanity checks of new distribution build, not exhaustive repeat. Report exact version/build and symptoms. Do not deliberately clear data. If gate appears or app fails, stop external distribution and diagnose.

Once owner accepts and beta eligibility/legal scope is verified, create private external group of verified adults, add standard build, complete Test Information and submit for TestFlight App Review. First external build requires review; do not invite until approved. Use individual email invitations, no public link, no minor testers, no paid fee. See [internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/) and [external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/). Track minimal feedback, prioritize real defects, no new feature churn. TestFlight builds expire after 90 days; stop testing when done. No automatic public release.

## 8. Post-beta parental authorization decision

Owner explicitly prefers relying on Apple's authorization mechanisms with native age checks instead of a duplicate consent system. Desired flow: Apple approves acquisition for affected child accounts; native app checks applicable regulatory features/age and documented authorization evidence; only authorized users enter Zoo; appropriate native hold if required authorization unavailable/denied/revoked. Apple's [age assurance Q&A](https://developer.apple.com/support/age-assurance/) rechecked Nov 27: developer retains age checking and significant-update responsibility; OS prevents launch after consent revocation, Apple also directs developers to server notifications. No new App Review process does not mean compliance or approval. Initial local app-specific consent proof, no-server revocation sufficiency (including foreground/offline/restoration), older OS and state obligations still unresolved. Do not treat age sharing, receipt, OS download, significant-update approval or arithmetic Grown-up Check as independently established affirmative initial consent. Keep gate compile-fenced until documented legal and technical basis and explicit owner approval. Do not grant minors on unknown consent; no fake consent, additional identity collection, backend/iCloud or spending. Revisit significant-update durability when actual update planned, subject to legal needs of first release. If no defensible route, retain public HOLD or reconsider lawful release scope/timing, not silently bypass. Beta review and adult-only testing do not waive applicable law. No additional repetitive sandbox experiments without a new release-critical question.

Final paid release remains intended US-only $4.99, Kids 6–8 conditional on accurate rating and legal/Apple review, no ads/IAP/subscriptions, preserve free PWA. Before public review: resolve parental access/revocation/older OS/legal, confirm all ASC statuses, update age questionnaire and exact listing description (over a hundred), confirm privacy/rights, final signed archive and targeted acceptance, separate public review and manual release authorization.
