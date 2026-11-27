# BibloZoo — isolated synthetic age-assurance simulator testing

## Post-#266 iPad visual acceptance (November 27, 2026)

Merged [#266](https://github.com/andydoane/biblozoo/pull/266) at `eedf0eae0618e47bd0331dddec118df3d9d48e34`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/46070282895) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/46070624282) SUCCESS. Owner screenshot confirms enlarged portrait minor-unknown fixture on iPad Pro 11-inch (M5), iOS 26.5; owner accepted proportions. Larger Text worked by owner report. All five additional fixture screens performed as expected by owner report:

| Fixture | Expected heading / behavior | Result |
| --- | --- | --- |
| declined | A Grown-up Can Help! — age-sharing | PASS |
| denied | Permission Isn't Available | PASS |
| update-pending | App Update Permission | PASS |
| unavailable | Let's Try Again | PASS |
| unsupported | This Device Needs Help — no retry | PASS |

Final simulator checks reported PASS: same standard purple in light/dark appearances and images stable during retry. A prior shell glob error from accidentally copied placeholder text was resolved by giving literal commands; no app defect indicated. Portrait only per owner; physical iPad unavailable. No real consent, Apple account, full gameplay, production audio or unsupported OS acceptance inferred from synthetic fixture. iPad narrow-window testing and real-device acceptance remain open if needed. Earlier signed iPhone Baloo 2/size stability/Larger Text/VoiceOver evidence documented in signed sandbox runbook; #266 post-change physical iPhone color smoke not supplied. Documentation-only checkpoint; Release HOLD.

## CURRENT — iPad portrait scaling and consistent purple (November 27, 2026 US Eastern)

Merged [#265](https://github.com/andydoane/biblozoo/pull/265) at `931347d60e925f95950b7bcd1f814569ea5a8de0`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/46063134299) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/46063486586) SUCCESS. Owner reports signed 1.1 sandbox compile succeeded, valid signature/exact ID and version, signed age entitlement and get-task-allow true, bundled Baloo2.ttf and both PNGs present, separate sandbox installed/launched. Owner confirms actual Baloo 2 appearance and images no longer change size during retries. Nine completed minor holdInitialConsent traces across three launches, no allow shown; Control+C terminations expected. Position not separately measured. Owner confirms darker purple appearance worked, max Larger Text screenshot showed readable wrapping, image proportions and scrolling to retry, VoiceOver passed by owner report (specific announcements not supplied). Owner elected standard BibloZoo purple in both system appearances to match existing app. iPad Pro 11-inch (M5) iOS 26.5 simulator fixture build/install and minor-unknown portrait screenshot showed correct branding and layout but content too small. Owner confirms portrait-only app; no landscape acceptance requested; physical iPad unavailable. No actual child permission established.

Candidate presentation-only change: single #7f66c6 background in both system appearances, white status text and existing ink unchanged; iPad idiom uses 1.5x artwork holder heights and column cap (630pt vs 420), 1.35x base font/button height, 1.25x spacing, 36pt horizontal safe margins and viewport top offset -300pt vs -210pt. iPhone geometry unchanged, existing Dynamic Type scaling, scroll, fixed image holders and state-independent width/top constraints retained. No change to orientation configuration, font registration, retry/state/policy, production/PWA, signing or storage. iPad scaling is proposed, not visually verified; narrow iPad windows remain safe-area bounded. After owner merge and CI, rebuild isolated simulator fixture, verify exact identity and portrait screenshot, retry image stability, max Larger Text/scroll, other hold states and unsupported/no retry; check standard purple in both appearances and iPhone smoke with signed sandbox. No real accounts, production activation or new cost. Initial consent, durable update and actual revocation remain RELEASE HOLD.

## CURRENT — native Baloo 2 compile correction (November 27, 2026 US Eastern)

Merged [#264](https://github.com/andydoane/biblozoo/pull/264) at `e70944fab5cf38d7db1a5fa522aa8e20ee55a6f5`; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/46061080281) and [merge CI](https://github.com/andydoane/biblozoo/actions/runs/46061959688) SUCCESS. Owner build log: npm build (33 guarded HTML entrypoints), Capacitor sync, package resolution and sandbox provisioning inputs succeeded; signed sandbox SDK 26.5 compile failed at BibloZooAgeAssurance.swift:968:40, type 'UIFontDescriptor' has no member 'Attribute'. Candidate changes only this type spelling to UIKit UIFontDescriptor.AttributeName. CoreText registration, variable weight settings, fallback, artwork geometry, state copy, retry and access decisions unchanged. Host CI did not catch UIKit type error; actual iOS compile and rendered font/weight/geometry not yet verified. No signing or dependency changes. Owner review/merge after green checks, clean pull ios-prep, build/sync, repeat signed sandbox 1.1 build and signature/profile/identity/resource validation before install; retest under-13 retry and Baloo 2 visual appearance. No failed build installation, no uninstall or original identity changes. Release HOLD remains.

## Typography and retry artwork refinement — candidate (November 27, 2026)

Owner observed branded #263 under-13 hold on signed iPhone, with repeated correct holdInitialConsent, but actual image shrink then restoration during Try Again and rounded system font not Baloo 2. Candidate registers existing local variable Baloo2-Regular (wght 400–800) with CoreText, uses Dynamic Type / rounded fallback, non-intrinsic fixed-height image holders, required capped width with strong viewport width preference, and viewport-relative top spacer independent of status content. No changes to copy, retry policy, native access decisions, existing web setup or compile fences. After merge and green CI, compile with local iOS SDK (CI host parse is not UIKit/CoreText typechecking), verify font exists in app bundle and artwork renders. Compare both images' size and placement before/during/after repeated retry; use screen recording if transition is brief; verify Baloo 2 appearance and no clipped text at Larger Text/VoiceOver, short layout, iPhone and iPad. At large text scroll position can naturally change when content length changes; no image size changes solely from state. Do not claim visual fix until observed; use only existing fixture/sandbox identities. No release activation.

## Visual redesign acceptance — candidate (November 27, 2026)

Owner requests match to existing fresh-install Grown-up Setup permission screens, not a new design. Native gate loads already packaged animal and logo PNGs from bundle public/verse_images without creating WebView, uses rounded native Dynamic Type text, purple background (dark-mode deeper purple), white capsule button, scrollable safe-area layout, checking spinner and friendly copy. Existing microphone/Photos setup and policy untouched; fixture/sandbox warning labels remain. No new permission action or skip; missing decorative images use text fallback. CI parse/synthetic checks do not prove UIKit compile or visual quality. After green merge, clean pull ios-prep, npm run build && npx cap sync ios, rerun 199 Debug synthetic assertions, then use stage A fixture build command and exact ID check (do not run historical detached checkout commands). On a disposable booted simulator install only fixture ID and launch using stage B. Verify assets visible, correct purple and readable copy, no clipped logo or button; check iPhone and iPad, light/dark, large accessibility text with scrolling, VoiceOver reading order and 54pt retry. Cases: slow-allow (checking spinner and no retry while checking), minor-unknown, declined, denied, update-pending, unavailable, unsupported (no retry), retry-allow, reentry-denied; allow transition retains existing behavior. Report screenshots/observations with synthetic data only, no real Apple Account. Pending update sandbox-only appearance may be checked later with existing separate signed identity; no new Apple test required just for initial visual review. No claim of current consent or real revocation. Release HOLD unchanged.

November 24, 2026. Merged [#242](https://github.com/andydoane/biblozoo/pull/242) at `5f7f4753be55b6e702c136201329f08ba9dcfc88`; owner verified `f8ca90f3`: 179 Debug assertions, both unsigned SDK 26.5 builds PASS; [PR CI](https://github.com/andydoane/biblozoo/actions/runs/45470611910), [merge CI](https://github.com/andydoane/biblozoo/actions/runs/45470829861) and [acceptance](https://github.com/andydoane/biblozoo/pull/242#issuecomment-7142275725). Prior #241 runtime acceptance retained. Current docs-only [native feasibility decision](IOS-AGE-ASSURANCE-NATIVE-FEASIBILITY.md): initial consent and no-server revocation sufficiency unresolved; release HOLD. No code, signing, enrollment, backend, new costs or family data changes. No new Mac test needed. Owner decision on next evidence route required; see [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md).

## Isolation

The existing native gate and foreground authorization ticket use fake decisions, not Apple API calls. Requires Debug, iOS simulator, explicit BIBLOZOO_AGE_ASSURANCE_FIXTURE flag and exact bundle ID com.andydoane.biblozoo.agefixture. Live flag is mutually exclusive; fixture flag on non-simulator/non-Debug is a compile error. Production and Audio Test identities do not accept fixtures. No tracked build settings/signing changes. Gate shows SIMULATOR TEST — FAKE CONSENT. Fixture identity deliberately does not enable production-only native audio or Audio Test diagnostics; exercise UI, bridge transition and state retention only, not production audio parity. App after approval may have normal icon/display name; launch by exact fixture ID from Terminal. No real profiles, photos, recordings, backups or Apple Account. No physical-device install, backend or new cost. Fake evidence never represents genuine consent.

## A — compile-only acceptance

**Recorded acceptance:** #241 exact source head `c6301837` passed 164 local Debug assertions, ordinary and fixture unsigned builds, fixture ID check and runtime retest; CI passed portable ordinary/Debug tests and fences. Prior #239 Mac negative fences passed; not rerun locally for #241. Do not reinstall original identity or use family data.

From clean repo root (do not switch with uncommitted changes):

```bash
git status --short
git fetch origin feat/ios-age-assurance-storekit-rating && git switch --detach FETCH_HEAD
git rev-parse --short HEAD

tmpdir="$(mktemp -d)"
xcrun swiftc -D DEBUG ios/App/App/BibloZooAgeAssurance.swift scripts/validate_ios_age_assurance_foundation.swift -o "$tmpdir/age-test" && "$tmpdir/age-test"
```

For the StoreKit comparison candidate expect 154 ordinary + 25 Debug fixture assertions = 179, including 15 new comparison cases. Without -D DEBUG, 154. #241 historical totals were 139/164. Tests are pure logic, not UIKit or real Apple responses.

These commands must fail with intentional #error messages:

```bash
xcrun swiftc -D BIBLOZOO_AGE_ASSURANCE_LIVE -typecheck ios/App/App/BibloZooAgeAssurance.swift
xcrun swiftc -D DEBUG -D BIBLOZOO_AGE_ASSURANCE_FIXTURE -typecheck ios/App/App/BibloZooAgeAssurance.swift
```

First rejects non-Debug live build; second rejects fixture on macOS. Normal unsigned simulator compile:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeAssuranceBuild CODE_SIGNING_ALLOWED=NO build
```

Distinct fixture compile only:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/BibloZooAgeFixtureBuild CODE_SIGNING_ALLOWED=NO PRODUCT_BUNDLE_IDENTIFIER=com.andydoane.biblozoo.agefixture 'SWIFT_ACTIVE_COMPILATION_CONDITIONS=DEBUG BIBLOZOO_AGE_ASSURANCE_FIXTURE' build
```

For a changed source candidate, both builds must report BUILD SUCCEEDED; the previous fixture runtime acceptance remains historical. Verify actual bundle identity before any subsequent installation:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' /tmp/BibloZooAgeFixtureBuild/Build/Products/Debug-iphonesimulator/App.app/Info.plist
```

Must output com.andydoane.biblozoo.agefixture. Report exact candidate head and results. #241 owner compile/identity passed. Commands retained for future source changes.

## B — after compile acceptance, isolated simulator runtime

Use a disposable simulator and fake data only. Open Simulator and list booted devices:

```bash
open -a Simulator
xcrun simctl list devices booted
```

Replace SIMULATOR_UDID below with exact simulator UUID; do not choose an unspecified booted device if multiple. Verify fixture ID again; install only if exact match:

```bash
fixture_app=/tmp/BibloZooAgeFixtureBuild/Build/Products/Debug-iphonesimulator/App.app
if [ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$fixture_app/Info.plist")" = "com.andydoane.biblozoo.agefixture" ]; then
  xcrun simctl install SIMULATOR_UDID "$fixture_app"
else
  echo "STOP: unexpected app identity"
fi
```

Do not change physical-device signing or use original ID to work around installation failure. If game assets missing inspect existing normal native packaging instructions; rebuild locally, no deployment. Launch by exact ID:

```bash
xcrun simctl launch SIMULATOR_UDID com.andydoane.biblozoo.agefixture --biblozoo-age-fixture=minor-unknown
```

Between scenarios terminate only fixture app with `xcrun simctl terminate SIMULATOR_UDID com.andydoane.biblozoo.agefixture` (not-running error benign). Repeat launch with new argument. No family backups or real data.

| Fixture | Expected behavior — observed on #241 unless noted |
| --- | --- |
| allow | normal bridge opens, no Apple call |
| adult | normal app opened; Grown-up Check not separately exercised |
| minor-approved | synthetic consent opens bridge |
| minor-unknown | adult assistance consent hold; #241 correct hold observed after prior startup stall |
| declined | age-sharing help |
| denied | permission unavailable hold |
| unavailable | retryable hold |
| unsupported | unsupported hold, retry hidden |
| update-pending | update hold |
| retry-allow | first hold; tap Try Again; bridge opens |
| reentry-denied | first allows; background/return; gate denies before bridge restore |
| slow-allow | five-second fake check; background before result; return held; explicit retry; late result cannot unlock |
| missing/invalid/duplicate | unavailable hold |

If readiness times out, capture only the fixture diagnostic (booleans, no age data): `xcrun simctl spawn SIMULATOR_UDID log show --last 2m --predicate 'eventMessage CONTAINS "[BibloZooAgeFixture]"' --style compact`. A retryable unavailable hold is safer than endless checking but is not a pass for minor-unknown. Also test allow across background/foreground (fake progress remains, intended same controller), large Dynamic Type, VoiceOver, absence of unexpected prompts. Actual bridge reattachment, storyboard initialization, layer/audio state, modal transitions, direct URL handling need verification. Fixture does not emulate Apple's real API availability, account, network, consent or revocation. Production native audio parity explicitly not tested under fixture identity. Report blockers and evidence for each scenario, not just compilation. No iPhone install or production activation.

## Recorded owner runtime evidence — #241

- All 15 scenarios in the table passed (missing, invalid and duplicate counted separately). `minor-unknown` showed actual consent hold, not generic unavailable; `allow`, `adult`, `minor-approved` opened normal setup/app. `retry-allow` held then opened on Retry. Unsupported had no retry. Missing/conflicting arguments stayed blocked.
- `reentry-denied`: an initial ambiguous observation was not counted; controlled background/return using exact fixture ID retained PID 9692 and screenshot showed permission denial. `slow-allow`: PID 9801 retained on return, screenshot showed unavailable/retry hold; owner tapped Retry, check screen then normal app. No claim about every frame of the transition.
- `allow`: owner reported fake gameplay progress retained after background/return. Larger Text passed. VoiceOver could not be located in Simulator settings; deferred to a supported environment. No production microphone/audio parity: fixture bundle is excluded from native permission/audio paths; owner observed microphone access unavailable. No change to those guards. Prompt absence, modal/direct-link handling and full layer/audio behavior not independently established; retain as outstanding targeted checks before live activation. No real consent or family data tested.
- Local ordinary build completed `BUILD SUCCEEDED` with SDK 26.5, arm64/x86_64; nonblocking AVAudioSession/age declaration deprecation and skipped AppIntents metadata warnings. Source head unchanged by this documentation follow-up.

## Next

After each owner merge return to ios-prep, pull --ff-only, update [roadmap](IOS-AGE-ASSURANCE-ROADMAP.md). Startup stall resolved in tested fixture; complete deferred checks and resolve initial consent evidence, notification obligations, older OS/offline behavior and actual StoreKit/PermissionKit evidence. No release activation or enrollment without explicit decision; stop/reassess if no-server policy cannot be established.
