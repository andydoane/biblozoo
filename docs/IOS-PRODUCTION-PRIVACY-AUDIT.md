# BibloZoo — Step 3b iOS first-party privacy and release audit

**Status (2026-11-15):** Review-only PR into `integration/native-audio-to-ios-prep`. The current production-ID branch has **not** been compiled with Apple's SDK or installed on a real iPhone for acceptance. This document records exactly what the source supports and what must still be verified. Do not treat it as a release certification.

## 1. Required-reason API inventory — first-party Swift code

Apple requires an approved reason for any listed API actually used by the app, in `PrivacyInfo.xcprivacy`. Relevant Apple references:

- [Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)
- [NSPrivacyAccessedAPIType and approved reasons](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype)
- [Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)

| Declared category | Reason | Verified first-party usage and limitation |
| --- | --- | --- |
| `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | `SceneDelegate.swift` reads `ProcessInfo.processInfo.systemUptime` for bounded Flashcards microphone meter update spacing; `BibloZooNativeSoundPlugin.swift` reads uptime and `mach_absolute_time()` for timing intervals / precisely scheduled native beat audio. Internal timing and diagnostics are never automatically transmitted; no fingerprinting or device identification. |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `3B52.1` | `SceneDelegate.swift` Ghost Writer photo picker calls `FileManager.default.attributesOfItem(atPath: url.path)` on a **user-selected Photos/Files** image and reads only `attributes[.size]` to reject oversized input before decoding; no timestamp value is used, tracked or uploaded. Reason for metadata of user-granted file. |

**No speculative other reasons added.** The first-party Swift files inspected (AppDelegate, SceneDelegate, NativeSound plugin) do not directly call `UserDefaults`, disk-capacity APIs or active-keyboard APIs. Capacitor, Apple frameworks and other transitive packages **require separate on-Mac dependency/binary audit**; do not infer their final declarations from this source scan.

The Xcode project already lists the manifest in app target **Resources**. The Node CI check makes this, the exact source call sites, declared reasons and the existing permission-purpose strings regression-tested. It is **not** an Xcode-produced privacy report.

## 2. Personal data, microphone, Photos, and user consent — source-level status

- **Microphone:** `Info.plist` keeps `NSMicrophoneUsageDescription`; native Flashcards requests it only after Record. Child-facing countdown completes before input PCM capture begins. The original code stores the bounded sample in temporary RAM, emits only a 0–1 level to JS, retains it for playback / one-use Wacky and discards on exit, re-record, or interruption. The existing `validate_native_n7c_flashcards_capture.js` and `validate_native_n7_recording_audit_n7a.js` cover source/VM policies, not hardware proof. No extra recording or upload is introduced here.
- **Ghost Writer Photos:** `NSPhotoLibraryAddUsageDescription` remains; adding Photos requires explicit Save and add-only permission. Photo picking is a user-initiated Photos/Files flow with size/dimension validation, not camera capture. The Ghost Writer encoder creates bounded temporary PNG/MP4 outputs for explicit Share/Save and cleans up its temporary folder. This is **distinct** from never writing Flashcards voice to disk.
- **Family profiles:** local names/pictures, games, BibloPets and progress stay in the existing local store; backup export/share is user-initiated. Installing an app with the original `com.andydoane.biblozoo` identity can replace the original sandbox. **Always verify a usable export/backup before attempting a production-ID installation.** Code reverts do not restore erased data.
- **Tracking/collection:** manifest `NSPrivacyTracking=false` and currently empty `NSPrivacyCollectedDataTypes` mirror the no-automatic-upload/no-ad-tracking design described in the existing privacy policy. They are **not evidence that third-party SDKs or the final signed binary are privacy-clear**. Review App Store Connect disclosures separately before distribution.

## 3. Open gates — NOT tested, do not check off early

1. **Mac Xcode privacy report:** after `npm run build`, `npx cap sync ios`, use Xcode's resolved Apple SDK/dependencies and inspect the **generated Privacy Report** and all embedded `PrivacyInfo.xcprivacy` files, especially Capacitor SPM/other transitive packages. Reconcile any new required API categories with **actual use and Apple-approved reasons**, never by adding guesses.
2. **Signed bundle and resources:** inspect the app's built `PrivacyInfo.xcprivacy`, its Xcode target membership, Flashcards/Read/native MP3 assets and any optional developer diagnostic plugins. A Linux Swift parse or Node check cannot confirm iOS SDK linking or asset lookup.
3. **Physical audio + microphone/privacy:** after backup and owner approval, test first permission request, deny, change via Settings, record countdown, level meter, Play My Recording, one-use Wacky, Exit cleanup, 2-minute max, lock/App Switcher, AirPods/Bluetooth, PiP/Apple Music, foreground retry. No unintended microphone start or voice file/network upload; verify iOS microphone indicator behavior.
4. **Data integrity:** verify exported family backup can be opened/read/restored on a safe spare device or otherwise independently validated. Do not install this production-ID build over the original app until this is done.
5. **Release readiness:** verify original disclosure and Photos purpose strings with the owner, accessibility, privacy-policy claims, all diagnostics available to children, and App Store Connect privacy questionnaires. No release or `ios-prep` merge is part of this PR.

## 4. Automated evidence and boundaries

Run `node scripts/validate_native_ios_privacy_manifest.js` and the existing native privacy/identity, Ghost Writer, Flashcards and resource validators. GitHub Actions should run the validator on feature PRs targeting `integration/native-audio-to-ios-prep`. PASS establishes **source structure**, not the complete app privacy report, actual audio privacy or safe iOS installation.

**Maintenance:** The newest PR status and next-chat owner instructions belong near the top of `docs/PROJECT-HANDOFF.md`. Update that file in every subsequent PR, including tests-only changes.
