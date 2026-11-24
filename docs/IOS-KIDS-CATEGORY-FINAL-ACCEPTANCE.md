# BibloZoo 1.0 — Kids Category final acceptance and remaining release gates

**Status: PARENTAL-GATE FUNCTIONALITY MERGED; SCOPED VOICEOVER RECHECK PASSED; LARGER TEXT NOT SUPPORTED/DEFERRED FOR 1.0 BY OWNER — November 23, 2026 (US Eastern; some GitHub commits are Nov. 24 UTC).**
**Current verified code baseline when drafted:** `ios-prep` at `18db0c3cad8dc703a9b5b94344eb1328ad88304c` (merged [PR #199](https://github.com/andydoane/biblozoo/pull/199)). This is an acceptance plan, **not a code-change request or proof of Apple's Kids Category approval**. Retire this baseline when future implementation PRs merge.

**Intent:** Focus on previously unverified behavior and required App Store decisions. Do **not** repeat established normal Learn/gameplay/audio/Ghost Writer functionality tests without a specific regression or new dependency. Use [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) as the release tracker, [IOS-KIDS-CATEGORY-PREFLIGHT.md](IOS-KIDS-CATEGORY-PREFLIGHT.md) for the original source inventory, [IOS-PARENTAL-GATE-IMPLEMENTATION-PLAN.md](IOS-PARENTAL-GATE-IMPLEMENTATION-PLAN.md) for the original four-PR design, [APP-PRIVACY-PREFLIGHT.md](APP-PRIVACY-PREFLIGHT.md) for privacy limits, and [TESTING.md](TESTING.md) for earlier targeted tests.

## Completed and independently evidenced as of this baseline

- [x] **Parental gate** implemented and merged: [#190](https://github.com/andydoane/biblozoo/pull/190)–[#198](https://github.com/andydoane/biblozoo/pull/198) cover shared gate, Ghost Writer Share Picture/Video, parent-only management and outgoing links, first-time microphone/Photos permission requests, optional skippable Grown-up Setup, first-permission Flashcards recovery and challenge keyboard UX. All PRs are confirmed merged to `ios-prep`.
- [x] **Owner-reported physical iPhone functional acceptance** for Ghost Writer share gate, parent management controls, existing child-accessible Zookeeper editing, Grown-up Setup, Flashcards first grant/narration and keyboard presentation. Specific owner observations are evidence, **not a complete VoiceOver, iPad or native bridge security certificate**.
- [x] **Family and individual backup format v3** via merged [#199](https://github.com/andydoane/biblozoo/pull/199). Captures the two formerly omitted Zoo records: rescue totals/pending celebrations and same-day surprise history. Import accepts v2/v3; synthetic tests cover add/replace/rollback paths.
- [x] **Positive read-only real iPhone v3 export verification:** owner supplied a Zookeeper Stats screenshot and immediately exported individual v3 JSON; reported visible rescue/break values matched saved Zoo state. **Do not add actual names, IDs, screenshots or real backup JSON to the repository**. This validates tested export field accuracy, not complete real-device restore.
- [x] **#199 exact PR-head CI:** [Actions #45301713790](https://github.com/andydoane/biblozoo/actions/runs/45301713790), head `158cff3c79af21a21679e5e94717c447e61262b7`, **Node regression checks PASS + Production web build PASS**. Merged `ios-prep` head `18db0c3` was verified separately in GitHub; do not call the PR-head run post-merge CI.
- [x] **Public web pages:** owner verified [App Privacy Policy](https://andydoane.github.io/biblozoo/app-store-privacy.html) and [App Support](https://andydoane.github.io/biblozoo/app-support.html). GitHub Pages `main` remains independent of native `ios-prep`.

## Focused acceptance checklist — do not mark PASS without an observed result

### A. Kids adult-level challenge review (owner / compliance)

- [ ] Confirm the **actual production challenge** is randomized `A − B + C`, where A=20–99, B=10..A−1, C=1–9, result 2–98; max three failed answers, new question on wrong answer, Cancel always safe, no permanent unlock. Source and synthetic regressions support this. Assess whether it is **genuinely adult-level for children ages 6–8**. Apple illustrates math as a possible parental task but does not approve this specific equation. A child who can read and do subtraction may solve it. **Do not label this adult gate definitively Apple-approved** without explicit product assessment and actual App Review.
- [ ] Confirm native Kids release offers parent approval **before** genuine outside-app links/sharing and new system permission requests: Ghost Writer picture/video share separately, external Mail/GitHub actions, family/profile exports, protected import/reset/delete actions, first-time Flashcards mic and Ghost Writer add-only Photos. No need for a permanent per-action grant. Previously granted OS permissions should not challenge on every recording/Photos Save. Keep privacy text/credits readable, edits and games accessible without a gate.
- [ ] Recheck current Apple [App Review Guideline 1.3](https://developer.apple.com/app-store/review/guidelines/#kids-category), [Kids design guidance](https://developer.apple.com/kids/), and [Guideline 5.1.4 child privacy](https://developer.apple.com/app-store/review/guidelines/). Selecting **Made for Kids / 6–8** is a **proposed** listing decision, not yet approved. Apple's rules extend to later app updates.

### B. Small, specific accessibility / device matrix (owner; disposable tester preferred)

**HISTORICAL issue before merged #201 (November 23 ET):** The Settings Grown-up Check announced "I'm a Grown-up," then the extra spoken label **"Description"** and "A grown-up needs to approve these settings." On the math stage VoiceOver read an equation such as `90 − 14 + 8`, then repeated "Description" and the same explanation. **Current status: limited iPhone VoiceOver observation, needs focused fix/retest; not a PASS.** The candidate remedy is to remove the dialog-wide `aria-describedby` association while keeping visible readable text and focus the static heading/prompt in reading order. After the fix is merged, separately test **Settings** and **Ghost Writer Share Picture** on iPhone; confirm the dialog/title, purpose, prompt, math, Answer and buttons are all reachable, that VoiceOver no longer says "Description" unnecessarily, and that the keyboard still opens only on an explicit Answer tap. Do not infer behavior from synthetic tests alone.

**VERSION 1.0 SCOPE DECISION — owner approved after the iPhone Larger Text observation:**

- [x] **Decide Larger Text / Dynamic Type release scope:** No whole-app Dynamic Type implementation or redesign of precisely fitted game text for 1.0. Preserve existing gameplay containers/layouts. **Do not claim Larger Text accessibility support** for version 1.0; comprehensive scaling is deferred to a possible post-1.0 enhancement. The previous observed no-change test is **not a PASS** and does not become one through deferral. This is not a claimed App Store exemption or full accessibility sign-off.
- [ ] **Critical readability defects still actionable:** If an important Grown-up Check, backup, privacy, safety, or cancellation control is actually clipped, unreachable or illegible on a supported device, address that specific problem with a small release-fix PR. This is distinct from a whole-app text-scaling project.
- [x] **iPad portrait popup presentation — limited PASS reported:** On a real iPad, the owner reports the Grown-up Check popup generally fits and works well. This observation covers basic presentation, **not keyboard-visible access to all controls, complete VoiceOver, or a separately verified no-export/cancel result**.
- [ ] **iPad on-screen keyboard obscures Check Answer — focused fix/retest OPEN:** After selecting the Answer input, the keyboard appears but the popup does not rise as on iPhone. The input remains visible; the owner must **dismiss the keyboard** to access the Check Answer button. This is an **observed usability issue**, not complete iPad acceptance. Investigate modal-only keyboard/visual-viewport handling or a usable submit alternative, with no unrelated game layout changes. Retest that both **Check Answer** and **Not Now** remain reachable while the keyboard is open, preserve no-auto-keyboard/VoiceOver behavior and safe cancellation, and record an actual device PASS before checking this item.
- [ ] **After the focused iPad fix:** Continue with remaining native bridge threat model, Kids/privacy and synthetic v3 restore sign-offs. **Portrait only**; no landscape requirement for 1.0.

**LATEST OWNER CHECKPOINT — actual iPhone after merged [PR #201](https://github.com/andydoane/biblozoo/pull/201):**

- [x] **Scoped VoiceOver announcements and swipe-navigation observation:** The gate automatically says **"Grown up Check, heading level 2"**. Selecting/tapping a subtitle or button reads it. After entering the math stage, the instruction **"Solve this problem to continue"** is spoken. One-finger swipes right/left traverse and read next/previous accessible elements. The old extra **"Description"** repetition was not reported in the latest test. **This check is complete for the observed behaviors only**, not full accessibility approval.
- [ ] **VoiceOver remaining behavior:** Modal focus confinement (no unrelated game/Settings controls behind the popup), complete equation/Answer/buttons order when swiping, safe cancellation and optional Ghost Writer-specific screen reader check have not been independently evidenced. Do not infer these from swipe direction alone.
- [x] **Larger Text observation documented and 1.0 scope disposition approved:** On the same iPhone, turning on **Larger Accessibility Sizes** and increasing the slider produced **no visible change to BibloZoo text size**. **Not a functional PASS:** the owner decided not to pursue system-wide scaling for 1.0, given tightly fitted game layouts. Do not advertise Larger Text support. Reopen only for an actual critical control readability defect or a deliberate future accessibility initiative.
- [ ] **Next targeted accessibility activity:** Perform the **iPad portrait** Grown-up Check visual/action/cancel acceptance test. Do not investigate generalized native-to-WebView text scaling for 1.0 unless a specific essential-control issue appears. Keep unrelated gameplay, completed VoiceOver announcement fix and `main` PWA stable.

| Test | Expected PASS / observation to record |
| --- | --- |
| **VoiceOver on iPhone (portrait)** | Announces "Grown-up Check," action, full randomized equation, Answer label, feedback and Not Now/Check Answer buttons in logical order; focus does not escape modal; focus restores after cancel. |
| **Large Text / Dynamic Type** | On **small iPhone portrait**, challenge, buttons, keyboard and errors remain readable/scrollable at larger text sizes; no clipping/hidden Cancel. |
| **iPad portrait** | **Basic popup presentation owner-reported PASS**, but keyboard-visible **Check Answer is obscured and not yet accepted**. Ensure math, Answer, Not Now and Check Answer remain reachable with iPad keyboard displayed, plus safe cancellation. iPhone/iPad are portrait-only; do not require unsupported landscape acceptance. |
| **External keyboard / Switch Control where available** | Keyboard Tab/Shift-Tab and Return activate expected controls; Escape or Not Now cancels. VoiceOver and keyboard focus order remain usable. Do not claim a Switch Control pass if not tested. |
| **Challenge failure/cancel** | Wrong answer gives fresh math; three wrong answers deny; Not Now returns to the original view without sharing/export/permission change. |
| **App background, return, navigation or profile switch** | An unfinished gate cannot reopen/authorize an action after returning; parent Settings visit expires appropriately. |
| **Previously granted permissions** | First-time gate is not repeated for each Flashcards recording or Photos Save; existing denial/fallback remains usable. |

**Acceptance evidence:** Record device/simulator, iOS version, test surface and pass/fail with a short, factual note in [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) or [TESTING.md](TESTING.md). Keep actual family names, pictures, voices and backups out of screenshots/logs. Tests should cover the **new gate behavior**, not a redundant complete gameplay matrix.

### C. Native bridge security / bypass analysis (technical release review)

- [ ] Inventory every **native production** entry point for permission requests, file/media sharing and Photos save. JS controllers (`verse_games/shared/parental-gate.js`, `kids-first-permission.js`, Ghost Writer share helper, Settings/backup checks) enforce the normal intended user flow. The underlying Capacitor bridge methods may still be reachable if **arbitrary code executes in the WebView**. No independent cryptographic/native parent-proof is currently evidenced. This is a defense-in-depth risk, **not evidence of an actual child-reachable bypass**.
- [ ] Decide and document the realistic threat model for a packaged offline/local app (trusted bundled assets, any remote navigation/WebView content, injected scripts or debug entry points, platform/plugin access). Inspect relevant Swift `SceneDelegate.swift`, native permission methods and `UIActivityViewController` bridge exports; keep direct native APIs from silently raising a first-time OS sheet without checked intent. Add a scoped hardening PR **only if** a concrete weakness/release requirement is identified; don't invent cryptographic ceremony with no viable native trust root.
- [ ] Verify JS-side paths fail closed on canceled/backgrounded/stale/double-tapped actions; PWA and Audio Test identities remain isolated. Focus existing automated tests first; only narrow new source/OS tests for specific gaps.

### D. Safe backup v3 round-trip acceptance (fictional test data only)

- [ ] On a **disposable simulator/browser**, create fictional Zookeeper(s) with known verse/progress, nonzero `petsRescued`, `zooBreaksStopped`, `pendingPets`, `pendingBreaks`, and current-day `surprise.day` / `breaksTriggered`. Export v3 family and individual backups.
- [ ] Import **Add as New**: verify Zoo values map to new profile ID and original profile remains unchanged.
- [ ] Import **Replace Progress**: verify appropriate present or explicit-null Zoo records and main progress on intended profile.
- [ ] Import **Replace All**: verify removed profiles' Zoo keys are cleaned, surviving profiles preserve intended values.
- [ ] Export again: compare recovered fields to expected **synthetic** input, not merely an import success dialog. Repeat with legacy v2 (missing Zoo fields cannot be manufactured), plus a simulated failed restore/rollback where practical.
- [ ] Record PASS/FAIL separately from the already-passed **real iPhone export** and already-passed **automated v3 import/rollback tests**. No real-family restore is authorized or needed. Preserve separate original production and Audio Test apps and backups.

### E. Separate App Store release sign-offs (still open)

- [ ] App Privacy/SDK: confirm final data classification from real release/runtime code and third-party behavior; source/Proxyman/empty privacy manifests do not certify `No data collected`. Owner reviews policy wording; distinguish local use from user-directed sharing. See [APP-PRIVACY-PREFLIGHT.md](APP-PRIVACY-PREFLIGHT.md).
- [ ] App Store age-rating questionnaire and **Kids Category** final product/legal decision; Education primary / ages 6–8 remain proposed. A parental gate is not legal verifiable consent for collecting children's data.
- [ ] License/rights: per-file audio/ZapSplat public raw media, deferred Chalkboard font embedding permission, other assets/attributions and Scripture/legal review. See [ASSET-LICENSES.md](ASSET-LICENSES.md).
- [ ] Store listing, test-only screenshots, seller identity, regions/DSA, encryption/export compliance, current Xcode toolchain/validation/upload warnings and App Review notes. Don't claim completion from earlier Node tests.
- [ ] Final archive / release candidate acceptance using safe test identities; retain portrait-only orientation and no destructive real-family migration. Do not change feature set merely to increase checklist coverage.

## Priority and stop conditions

**Next focused activity:** Owner/technical reviewer evaluates the Kids adult-level challenge and the limited VoiceOver/large-text/iPad-portrait gate checks. A concrete FAIL becomes a small `ios-prep` fix PR. A PASS gets recorded without redesign. In parallel or after, review native bridge security and the synthetic v3 restore round trip. None of these actions justifies restoring or reinstalling the owner's real data.

**Stop / do not overclaim:** Neither Apple's Kids approval nor full restoration nor security hardening nor final App Privacy classification is accomplished by this document. All checkboxes above stay open until actual acceptance evidence is documented. The App Store listing's **Kids Category selection has not been made**.

**Repo workflow:** Changes target `ios-prep`; PRs are owner-reviewed and never merged by the assistant without explicit approval. Public PWA `main` is not a destination for these native release changes.
