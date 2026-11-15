# BibloZoo — No-install Mac Xcode archive + privacy report review

**Status:** Step 3e / Step 4 preparation, review-only on `integration/native-audio-to-ios-prep`. The author cannot access the owner's Mac or Xcode from GitHub Actions; **the actual Apple build, Privacy Report and signed-app evidence are NOT TESTED until the owner runs these steps and reports the result**.

**Safety rule:** Creating an Xcode **archive** with a generic iOS destination does **not** mean installing or running BibloZoo on your iPhone. Do **not** click Xcode's Run/Play button, choose the original iPhone as the run destination, select `Distribute App` or overwrite/uninstall the existing `com.andydoane.biblozoo` app. Original Zookeeper profiles are local-only and a code rollback cannot restore missing data. Audio Test (`.audiotest`) is a separate app.

## Part A — Mac, prepare build without installing

1. In **GitHub Desktop**, use the existing BibloZoo repository/worktree with Current Branch exactly **`integration/native-audio-to-ios-prep`**, and ensure the owner has merged this PR. You already know how to update GitHub Desktop; this guide intentionally omits fetch/pull walkthroughs. If there are uncommitted edits, stop rather than discarding or switching worktrees.
2. Use GitHub Desktop's **Repository > Open in Terminal** for the integration repository. Keep `ios-prep` and the experimental worktree separate. Confirm the Terminal starts inside the project folder.
3. Enter the following commands **one at a time**:

```bash
git branch --show-current
npm ci
npm run build
node scripts/validate_native_ios_resource_packaging.js
npx cap sync ios
npx cap open ios
```

The first command **must print `integration/native-audio-to-ios-prep`**; if it does not, stop and ask before continuing. `npm ci` installs locked dependencies in the local project; `npm run build` creates `dist/`; `npx cap sync ios` copies the packaged web files into the local Xcode project and may update generated iOS files; `npx cap open ios` **opens Xcode, not the iPhone app**. If a command fails, stop and share the last error. Don't delete old app folders, reset the repository or change bundle identifiers as a workaround. Do not commit/generated changes without review.

## Part B — Xcode Archive (NOT Run)

1. In Xcode, select the **App** scheme. In the run-destination menu, choose **Any iOS Device (arm64)**, **Any iOS Device**, or the equivalent generic device for your installed Xcode. **Do not choose your original iPhone.**
2. From the top menu select **Product > Archive**. Xcode must compile/link the actual app against Apple's iOS SDK and resolve its Capacitor Swift Package dependencies. This action does **not** install BibloZoo on any phone.
3. If Xcode reports an error about signing, Swift/Capacitor package resolution, linker errors or unavailable assets, **stop**. Record the exact failure and do not bypass it by changing the production ID, original signing settings or device. Report the error for a narrow PR repair.

## Part C — Generate and inspect Apple's Privacy Report

1. Once Archive finishes, open **Window > Organizer > Archives** if not already shown.
2. **Control-click the newly created BibloZoo archive > Generate Privacy Report.** Choose a location on your Mac to save its PDF.
3. Read that report for declared collected data, tracking and third-party SDK details. Compare with BibloZoo's existing `PrivacyInfo.xcprivacy`, privacy policy, microphone and Photos purposes. **Report problems, warnings or unusual third-party entries; do not invent privacy reasons or modify Capacitor-managed packages without source evidence.** Apple: [Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests).

## Part D — One read-only check of the actual archive

Return to the Terminal still in the integration repository and run:

```bash
node scripts/inspect_ios_archive.js
```

The checker automatically selects the **newest matching original-ID BibloZoo archive made in the last 48 hours**. It **only reads** that archive; it does not build, modify, install, publish, copy data, upload or access Zookeeper profiles. It checks the app's real bundle identifier, home-screen name, microphone/Photos purpose strings, first-party privacy manifest reasons, the six root-bundled sound files, ten representative bundled `public/` resources, and the correctly injected production native-only audio guard. It enumerates any extra SDK manifests embedded under Frameworks/PlugIns/Watch **without declaring those dependencies privacy-safe**. Never treat `PASS` as speaker, microphone, signed-distribution or full-privacy approval.

If the newest archive is older than 48 hours, the check refuses it. Make a new generic iOS archive instead of declaring an old one current. A checker failure is a prompt for review, not a reason to delete or reinstall the original app.

## What to send back to the assistant

Simply say whether **Product > Archive** succeeded, whether **Generate Privacy Report** succeeded, and whether the read-only checker printed **PASS or NOT ACCEPTED**. If there was a failure, paste the error message or send a screenshot; you may also share the generated Privacy Report PDF for a closer source-specific review.

**Not requested now:** Do not connect/install the normal original-app candidate on your iPhone, test Flashcards microphone, merge `integration/native-audio-to-ios-prep` to `ios-prep`, or distribute through TestFlight. Before any installation, the owner must independently verify that the existing Zookeeper backup is readable and recoverable and explicitly approve the test plan.

**Follow-up after Mac evidence:** Update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md` and these audit notes with **actual Xcode Archive PASS/FAIL and Privacy Report observations** in the same PR as any repair. The owner still needs to approve final accessibility, microphone/Photos, signed-app and physical speaker/interruptions acceptance.
