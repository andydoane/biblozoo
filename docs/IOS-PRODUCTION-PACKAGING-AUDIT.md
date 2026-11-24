# BibloZoo 1.0 — production packaging and beta readiness audit

## CURRENT — Credits routing correction and owner device-testing preference (November 24, 2026)

Merged [#245](https://github.com/andydoane/biblozoo/pull/245) at `ef87a85e079e62eb4e4db8fcb3054cfd183b803c`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/45475723521) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45476133418) passed. Owner source `a22baa9e` dist/regression checks PASS: 2,199 files / 116,344,281 bytes, 33 guarded HTML pages, four notice matches, 55 duplicate groups / 1,695,101 extra bytes, 11 review-only assets / 1,593,846 bytes; all 16 previously observed OS metadata files excluded. Merged-head cap sync and unsigned fixture SDK 26.5 arm64/x86_64 build passed. Owner simulator observed raw HTML in SoundTouchJS License: [Capacitor 8.5.2 Router.swift](https://github.com/ionic-team/capacitor/blob/8.5.2/ios/Capacitor/Capacitor/Router.swift) routes extensionless paths to index.html. Candidate generates exact LICENSE.txt display alias from original vendor LICENSE (unchanged), reads it locally, rejects HTML MIME/document and empty responses, adds alias/response regression tests. Other UI/offline results not independently reported. Candidate CI, iPhone Credits acceptance and fresh unsigned Release archive pending. Owner explicitly prefers ordinary real-iPhone updates and confirms current saves are disposable testing data; no mandatory repeat backup for ordinary non-destructive updates, preserve data/identity and existing signing workflow where practical, never deliberately erase or uninstall without explicit separate approval. Continue isolated simulator for synthetic age assurance/destructive tests and iPad-specific checks. No fake consent/live activation, signing configuration, dependency, backend, cost or public distribution changes. Rights, iPad orientation validation and native-only age-assurance feasibility HOLD remain open. See [packaging audit](IOS-PRODUCTION-PACKAGING-AUDIT.md).

## CURRENT — release polish and verified native packaging (November 24, 2026)

Merged [#244](https://github.com/andydoane/biblozoo/pull/244) at `b7f2a35a1af07056e2deef0a98dd1972afeb61f6`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/45473774108), [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45474032096) and [owner archive acceptance](https://github.com/andydoane/biblozoo/pull/244#issuecomment-7142734081) passed. Exact merged head unsigned Release arm64 generic-device archive (SDK 26.5, deployment target iOS 15) passed; 2,203 public files / 116,343,267 uncompressed bytes, four notices byte-match, 56 duplicate groups / 1,695,101 extra bytes, 13 review candidates / 1,595,880 bytes. Xcode excluded 14 local .DS_Store files; two desktop.ini files remained. App/Capacitor/Cordova manifests declare no tracking, domains or collected data; app reasons 35F9.1 and 3B52.1, SDKs no declared reasons. Runtime npm audit 0 vulnerabilities; full install 7 advisories (6 moderate, 1 high), no upgrades. Git status clean. Current candidate excludes only OS metadata from generated dist and adds local plain-text expandable notice access in production-style native Credits; external link parent guard preserved, no asset deletions or dependency changes. CI, fresh package/archive and isolated Credits UI checks pending. iPad portrait-only unchanged: preliminary archive orientation warning remains; [Apple TN3192](https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-UIRequiresFullScreen-key) describes deprecated full-screen key and evolving resizing behavior; test actual iPad windows and signed validation before choosing a fix. No licensing clearance, production privacy certification or live age-assurance activation; feasibility HOLD unchanged. No enrollment, upload, device install or family data changes. See [packaging audit](IOS-PRODUCTION-PACKAGING-AUDIT.md).

November 24, 2026. Baseline merged [#243](https://github.com/andydoane/biblozoo/pull/243), `f922305b70fccab48675bb1357b6f3bdbc395067`; [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45472618806) passed. This checkpoint adds read-only packaging checks, not a release or authorization to distribute. Age-assurance [feasibility HOLD](IOS-AGE-ASSURANCE-NATIVE-FEASIBILITY.md) remains unchanged. No app runtime, asset, signing, version, deployment target, web/PWA, profile/backup or dependency change. No enrollment, upload or new charges.

## Credits routing correction — candidate acceptance

The actual simulator defect was missed by the prior fake fetch test. Use generated `flashcards/vendor/soundtouchjs-2.1.1/LICENSE.txt` copied from the unchanged extensionless vendor file; the archive/dist audit requires both the four originals and exact alias bytes. All displayed text remains `textContent`, and HTML MIME or document-leading markup and blank text produce retry instead of being cached. Regression tests include HTTP-success wrong HTML with HTML or plain MIME, blank response, retries and original MPL text; no actual iOS runtime proof yet.

Owner now prefers ordinary iPhone testing; current saves are disposable test data. Normal same-ID update via existing Xcode workflow is permitted by owner, no deliberate wipe/uninstall, use existing local team/signing settings only; no new paid membership, capability, distribution, live/fixture flags. No requirement to export another backup for this small update (optional); preserve data and safety by default. Test on iPhone after clean checkout/build/sync and CI, with actual production identity and ordinary configuration, no original-ID installs of fixture builds. Open Settings > Credits; expand all four sections, verify MPL text (not HTML), scroll, collapse/reopen, close OK, cancel external Grown-up Check without navigating. Repeat after closing/reopening Credits in airplane mode with Wi-Fi off; restore connectivity. Do not claim offline or all sections passed without observations. Repeat unsigned Release archive packaging and manifest checks on exact candidate after clean build/sync. Owner reviews and merges; draft until acceptance. No other runtime behavior changes.

## Release polish candidate

Build filter rejects exact case-insensitive `.DS_Store` and `desktop.ini` basenames during recursive copy only; source files remain, no gameplay assets removed. Audit now refuses such metadata in dist/archive. Existing Credits dialog in packaged production-style native iOS adds four expandable sections with fixed bundled relative paths, loaded on expansion as plain text (`textContent`, no HTML interpretation or clickable license URLs); retry on failure, no persistent cache. Existing SoundTouchJS external link remains action-bound parent-gated; browser/PWA and Audio Test Credits unchanged. Verify four sections online/offline on disposable simulator with production-style JS (no original device install), close/reopen, scroll and large text, cancel outgoing adult challenge. No family data. New CI synthetic tests exercise actual filter, metadata refusal, local file text, retry and existing guard contract. No Xcode behavior asserted yet.

Orientation: current Info.plist declares portrait on both idioms, no UIRequiresFullScreen. #244 archive emitted shallow validation warning, not a failure. TN3192 describes deprecated full-screen compatibility and evolving iPadOS resizing; no blanket declaration that portrait-only passes final validation. Preserve current behavior; independently test iPad portrait layout, rotation/window resizing including latest OS, then signed upload validation; if blocker, owner-reviewed targeted change rather than adding unsupported landscape or deprecated key blindly.

## Source findings

- `scripts/build.js` explicitly selects root runtime files and recursively copies 11 runtime directories into dist. Generated dist and Capacitor public are ignored by Git. The Xcode project copies public as a folder reference, plus six root MP3s and app privacy manifest; current Capacitor/Cordova version 8.5.2. Existing native resource, identity/diagnostic guard and archive privacy checks remain intact.
- At baseline the 11 tracked runtime directories contain 2,173 blobs/paths totaling 114,448,688 bytes (uncompressed, excluding root allowlist and native frameworks). This is source-tree evidence only, not a measurement of the built archive or App Store download.
- Wholesale copy includes desktop.ini files, the owner-identified unused Suno jingle, old Scripture Scrub background, testverse assets, tester pages and JS diagnostic/smoke-test code. Names are review leads, not evidence of disuse or child accessibility. Existing production identity guards prohibit legacy diagnostic access in tested paths; don't remove JS just because its name contains test. Confirm dynamic references, native lookup maps, PWA and Audio Test dependencies before any exclusion. The source jingle is 426,691 bytes and the old background 840,004 bytes; potential savings are not established until runtime use and build output are verified. Do not remove the original source media or rewrite Git history.
- Font/software notices and SoundTouchJS LICENSE/SOURCE.md exist inside runtime directories. Existing archive check samples resources and app manifest but did not require exact notice bytes or both known SDK manifest paths. New audit closes that measurement gap, not overall license clearance.
- `app.js` showCreditsDialog includes BSB credit, Baloo 2 attribution and SoundTouchJS project link; the outgoing link is action-bound parent-gated in production iOS. No full local notice access was established in that dialog. Follow-up: make the shipped legal notices readable offline in a suitable user-accessible surface, retaining external link safeguards and avoiding claims of rights not granted. No UI changes here.
- [Rights ledger](ASSET-LICENSES.md) remains open: Chalkboard embedding/public TTF rights, ZapSplat raw GitHub exposure, exact font/binary notices, per-track music/audio rights and trademark/visual review. No permission outreach or asset replacement performed.

## New read-only audit

`scripts/audit_ios_production_packaging.js --dist` inventories all regular dist files, verifies four nonempty notice/source files byte-for-byte against repository source, groups payload size by folder, counts exact duplicate SHA-256 payload groups and lists explicitly scoped review candidates. It refuses missing/empty/changed notices, missing index and public symlinks. Duplicate byte totals are additional uncompressed copies, not proven removable bytes; no code or data is printed, only relative file names and totals. The helper does not inspect personal device storage.

`--archive <explicit .xcarchive>` additionally reuses the existing production bundle identity, audio resource, native guard and app privacy-manifest checks and requires the known Capacitor and Cordova privacy manifests. It inventories the actual archived public directory. No silent fallback to a stale archive. Existing manifest summary helper reads declarations separately. Neither script verifies signatures, entitlement validity, full SDK code/data behavior, accessibility of notices, legal clearance or actual download size. Use only an archive of the exact current checkout, not a family device or unrelated build. CI runs synthetic refusal/inventory tests and a real dist inventory on the normal web build; Mac archive acceptance is separate and pending.

## Owner acceptance — pre-enrollment, compile/archive only

From clean repository root, fetch the PR head and verify short SHA. Do not switch if working tree dirty. The production flag remains disabled. Run:

```bash
npm ci && npm run build && node scripts/audit_ios_production_packaging.js --dist
```

If successful, sync the generated assets and make a new unsigned generic iOS archive in a fresh temporary folder. Do NOT use Run, install on an iPhone, enable live flags, enroll, or upload. If any step fails stop and report the error; don't change signing or use a physical device to work around it.

```bash
npx cap sync ios
```

```bash
auditdir="$(mktemp -d /tmp/BibloZooPackagingAudit.XXXXXX)"
archive="$auditdir/BibloZoo.xcarchive"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$archive" \
  -derivedDataPath "$auditdir/DerivedData" CODE_SIGNING_ALLOWED=NO archive
```

Only after ARCHIVE SUCCEEDED:

```bash
node scripts/audit_ios_production_packaging.js --archive "$archive"
node scripts/audit_ios_archive_privacy_manifests.js "$archive"
git status --short
```

Send audit summaries, exact head, any warnings, and status. Generated sync artifacts are ignored; do not commit generated files or unexpected project changes. No install, family data or signed distribution. This is not the final signed release archive, and a successful check is not rights/privacy clearance. Candidate CI and Mac archive evidence pending.

## TestFlight milestone — after enrollment and eligible beta approval

[Apple Developer Program](https://developer.apple.com/programs/) lists US $99/year membership; [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/) and [external testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers) describe signed build upload, up to 100 authorized App Store Connect internal testers and 10,000 external testers, first external build review, free TestFlight app, invitation by email/public link and 90-day build expiry. The planned $4.99 retail app can be beta-tested without charging testers; beta access is temporary, not a permanent retail purchase. TestFlight itself adds no separate membership or per-tester fee.

Order: finish unblocked pre-enrollment prep; explicit owner approval of enrollment and signing; create app record, beta metadata and safe isolated signed test plan; upload eligible build, internal test, first external TestFlight App Review; invite a small trusted adult group via email, fictional profiles only, then expand if appropriate. No developer-account roles for ordinary friends/family. TestFlight review is separate from final App Store review and does not exempt rights, privacy, state consent or Kids obligations. Resolve applicable beta distribution obligations and safety beforehand; do not distribute unresolved live enforcement or synthetic fake-consent fixture. Do not infer approval of production age assurance from beta approval. No enrollment or external testing authorized in this PR.

Next: review actual inventory, decide narrow native packaging cleanup/notice accessibility only with verified dependencies; screenshot captures and targeted release tests, then owner enrollment decision. See [handoff](PROJECT-HANDOFF.md), [listing](APP-STORE-LISTING-DRAFT.md), [privacy](APP-PRIVACY-PREFLIGHT.md) and [Kids acceptance](IOS-KIDS-CATEGORY-FINAL-ACCEPTANCE.md).
