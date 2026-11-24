# BibloZoo 1.0 — Parental-gate implementation plan (four PRs)

**CURRENT STATUS / NOVEMBER 23 ET (FINAL MERGE NOVEMBER 24 UTC):** The four planned implementation phases [#190](https://github.com/andydoane/biblozoo/pull/190)–[#195](https://github.com/andydoane/biblozoo/pull/195) and follow-up setup/usability [#196](https://github.com/andydoane/biblozoo/pull/196)–[#198](https://github.com/andydoane/biblozoo/pull/198) are **MERGED** into `ios-prep`. Family/profile Zoo backup v3 [#199](https://github.com/andydoane/biblozoo/pull/199) is also merged. The owner reported key iPhone tests PASS and positive v3 Zoo export field matching; final Kids/accessibility/security and fictional end-to-end restore acceptance are **open**. **See the current [Kids Category final acceptance checklist](IOS-KIDS-CATEGORY-FINAL-ACCEPTANCE.md) and [living handoff](PROJECT-HANDOFF.md)**. The original plan and intermediate OPEN/UNMERGED descriptions below are **historical**, not current PR states.


**Follow-up to the four-PR plan — optional first-launch setup candidate (November 23, 2026):** [PR #195](https://github.com/andydoane/biblozoo/pull/195) **merged** to `ios-prep` at `0b760f366cee8a7262ac81fb7e59d60c091ec5a0` after successful source-head CI; owner first-time permission testing remains in progress. The next focused [PR #196](https://github.com/andydoane/biblozoo/pull/196) (OPEN/unmerged, `feat/ios-kids-first-launch-grownup-setup-20261123`) adds a skippable, native-production-only invitation after the familiar Welcome splash and a protected setup page with a **smaller splash animals/logo at the top**. Only explicit feature Enable taps (microphone / PhotoKit add-only) after a parent check request a fresh OS permission. The short-lived adult setup session expires on interruption or leaving, never authorizes sharing or unrelated Settings actions, and persists only an invitation-shown marker. Current Flashcards/Ghost Writer first-use permission gates remain as fallback. Owner must review/test separate from PR4 acceptance; Apple permission-timing, Kids accessiblity and App Review remain open. See [TESTING.md](TESTING.md).



**PR4 current implementation candidate (November 23, 2026):** [PR #194](https://github.com/andydoane/biblozoo/pull/194) is now **merged** to `ios-prep` at `7a4a26666e0d8a54f4d43439577439cd09f4ca60`; owner confirms the simpler subtraction-and-addition gate and child-accessible Zookeeper editor work on iPhone. [PR #195](https://github.com/andydoane/biblozoo/pull/195), branch `feat/ios-kids-pr4-permissions-audit-20261123` (OPEN/unmerged, owner phone test pending) adds read-only native `getPermissionStatus` for mic and `getPhotosPermissionStatus` for PhotoKit `.addOnly`, requires the common adult check only for OS **`undetermined`** before explicit `requestFirstPermission` / `requestPhotosPermission` calls, and stops ordinary mic request / Save-to-Photos native bridges from opening that first OS sheet. It preserves already allowed/denied behavior, Audio Test, and PHPicker/Files import. JS/native source and bundle CI check these routes. See current testing guide and handoff. **Explicit native first-request methods still trust JS-controlled approval flow; this is not an independent native proof of an adult**; native/WebView injection resistance, actual App Review and privacy/SDK acceptance require separate sign-off. Older specs below are historical.



**Current UX follow-up before PR 4 (November 23, 2026):** PR 1 [#190](https://github.com/andydoane/biblozoo/pull/190), Safari fix [#191](https://github.com/andydoane/biblozoo/pull/191), PR 2 [#192](https://github.com/andydoane/biblozoo/pull/192) and PR 3 [#193](https://github.com/andydoane/biblozoo/pull/193) are now **MERGED** to `ios-prep`, latest baseline `d9532717742e5f4a047cb0139f35c626bb352678`. The owner reports all previously checked gates pass on their iPhone. Owner's next requested refinement in [PR #194](https://github.com/andydoane/biblozoo/pull/194), branch `fix/ios-kids-gate-ux-math-profile-edit-20261123` (not yet owner accepted): new shared adult problem `A − B + C`, with A=20..99, B=10..A−1, C=1..9, and result 2..98; remove the gate from **Settings → Manage Zookeeper** navigation and **Edit Zookeeper name/picture**. Preserve gated Add Zookeeper, imports/exports, destructive reset/delete/erase, outgoing Mail/GitHub links and Ghost Writer shares. **PR 4 remains pending until the owner tests the UX follow-up**; it covers first-time native microphone/Photos permission prompts when needed, native bridge/bypass audit and accessibility/release acceptance. The math task must remain reviewable as adult-level for the intended 6–8 band; Apple does not specify this exact formula.

**Historical specifications below document the prior implementation choices and are not the current challenge formula.**


**Planning baseline:** November 23, 2026, `ios-prep` after [merged Kids Category preflight PR #188](https://github.com/andydoane/biblozoo/pull/188).

**Owner's updated challenge choice for PR 2 (November 23):** A fresh `(A × B) + C` math question where `A` is **11–29, excluding 20**, `B` is 2–9, and `C` is 1–9. The app generates new numbers; do not reuse the existing easy reset arithmetic. This tightens the originally approved PR 1 11–99 range in one shared helper for all future gates.

**PR 3 implementation note (November 23):** The owner reports Ghost Writer sharing works; [#192](https://github.com/andydoane/biblozoo/pull/192) is **MERGED** to `ios-prep` at `79e2e2dde2a5d854546cf8a9bee176ee6e3cc83f`. [PR #193](https://github.com/andydoane/biblozoo/pull/193) is the PR 3 branch `feat/ios-parental-gate-pr3-settings-redesign-20261123` targets Settings backups/management and the actual Support/Privacy/Credits outbound actions, plus the owner's **shared visual redesign**: app purple `#7f66c6` background, white text, balanced subtitle, white borderless buttons/purple labels, and `verse_images/zoobreak_lock.png` without a circle. This PR remains **unmerged/untested on simulator** until owner acceptance. PR 4 first-time OS permission prompts, native bypass audit and final Kids acceptance remain open.

**Historical planning status at PR 2 kickoff (superseded):** PR 1 [#190](https://github.com/andydoane/biblozoo/pull/190) and Safari correction [#191](https://github.com/andydoane/biblozoo/pull/191) are **MERGED** to `ios-prep`, latest merge baseline `fdda49bc2bfdcc07792a9a190e809c73b7891704`; the owner confirmed the corrected local popup preview **passes all checks**. PR 2 is [#192](https://github.com/andydoane/biblozoo/pull/192), a scoped `feat/ios-parental-gate-pr2-ghost-share-20261123` candidate: it connects native Ghost Writer Share Picture/Video in both Simple/More Options to fresh one-shot checks **before** PNG/MP4 creation, adds stale/background/duplicate protection, narrows math to 11–29 except 20, runs synthetic tests, and updates the handoff. **PR 2 is not yet owner-merged or simulator-tested.** PR 3 (Settings/backups/outbound links) and PR 4 (first-time native permissions/acceptance audit) remain unimplemented.

Four independently reviewed PRs remain the recommended sequence. Do not interpret implemented code or automated tests as final Kids Category eligibility or device acceptance.
**Release direction:** The owner confirms BibloZoo is designed primarily for independent-reading elementary children. Proposed storefront: **Education** + **Made for Kids**, age band **6–8**; older elementary users remain welcome. **Do not select Made for Kids in App Store Connect until compliance is accepted.**

**Read first:** [Kids Category source preflight](IOS-KIDS-CATEGORY-PREFLIGHT.md), [privacy/source audit](APP-PRIVACY-PREFLIGHT.md), [family backup safety](IOS-FAMILY-BACKUP-SAFETY.md), and [living release handoff](PROJECT-HANDOFF.md). Do not mistake planning approval for authorization to merge or install an app update.

## Goal, scope, and experience

Implement **one reusable adult-level "Grown-up Check"** for relevant outgoing/sensitive actions in the **native iOS Kids build**, without turning ordinary Bible-memorization gameplay into a parent-only experience. **Keep the existing PWA on `main` unchanged.**

**Child flow:** Tapping a protected action shows a BibloZoo-themed notice ("A grown-up needs to help with this") with **Not Now** and **I'm a Grown-up**. Not Now returns to the exact activity with draft media/progress intact. I'm a Grown-up opens an accessible adult-level challenge; wrong/canceled/bypassed attempts do nothing externally. On success, carry out **only the intended pending action**. A simple confirmation, a fixed/reusable answer, or the app's existing low-difficulty reset arithmetic is not enough by assumption; choose and review a challenge genuinely intended to distinguish an adult from a 6–8-year-old. The design must be accessible for parents and compatible with VoiceOver, keyboard, and large text. No accounts, passwords, ID documents, internet connection, or transmission of child's data should be needed for the gate.

**Approval scope / repeat frequency:**

- **Ghost Writer Share Picture / Share Video:** Require a **fresh grown-up check for each separate share action** before opening any iOS share sheet or generating outgoing media. Approval of one picture is **not** a permanent or blanket sharing permission; Save Picture/Video to Photos are separate actions.
- **Parent-only Settings area:** Allow **one successful check per uninterrupted visit** to the parent area for multiple backup/management tasks. Lock on leaving, backgrounding/interruption, navigation out, profile switch, relaunch, or any unsafe state; do not persist authorization in `localStorage` or between sessions. **An unlocked Settings visit never authorizes later Ghost Writer sharing.**
- **External email/web links outside a protected area:** Require a check for the specific outgoing action, or offer it only inside a currently unlocked parent-only area; no implicit permanent unlock.
- **iOS permission requests:** Gate **immediately before a new system microphone/Photos permission request**, where required by Apple's Kids rules. Once granted, iOS remembers the OS authorization—do **not** challenge again on every Flashcards record or Photos Save. If a permission is denied/revoked, normal denial handling still works, and any later explicit new request can require a fresh grown-up check. A system Photos/Files picker for user-selected files is **not automatically equivalent** to requesting broad photo-library permission; inspect actual API/status behavior. No app-controlled gate can override a system denial.

**Security/usability constraints:** Fail closed on missing/malformed gate module, failed challenge, focus loss, stale pending action or platform uncertainty. Do not expose a reusable approval token to child-facing scripts, navigation URLs, storage, or asynchronous callbacks. No bypass via double-tap/race, background/reopen, deep link, back button, alternative share/download path, or profile switching. If the approved action fails, do not silently open another share route. Gate challenges themselves do **not** constitute statutory verifiable parental consent; child-data privacy/SDK review is a separate release gate.

## Complete gate inventory from the November 23 source audit

| Surface / action | Gate expectation | Existing code / nuance |
| --- | --- | --- |
| **Ghost Writer: Share Picture** | **Required per share** | `verse_playground/ghost_writer/game.js`, both simple/more Remix modes, `onPictureAction("share")`; native `UIActivityViewController` via `SceneDelegate.swift` |
| **Ghost Writer: Share Video** | **Required per share** | `game.js` `onVideoAction("share")`, native MP4 export/share; ensure any pre-generation step cannot bypass gate |
| **Ghost Writer: Save Picture / Save Video** | **No per-save gate after OS permission**; first **new Photos authorization prompt** may need gate | Existing `saveToPhotos` uses add-only PhotoKit and is distinct from sharing. Preserve it. |
| **Ghost Writer: Import Background (Photos / Files)** | **Do not blanket-gate**; revisit if an actual system permission request or outside-app action occurs | `BibloZooGhostBackgroundPickerPlugin` uses Photos/Files system pickers; owner reports successful import and cancel tests. |
| **Settings: Export Family Backup** | **Parent area gate**, before file construction/share/download | `app.js` `exportSaveData` / `shareOrDownloadJsonSave`; JSON can include children's names, IDs and progress |
| **Manage profile: Export Zookeeper Backup** | **Parent area gate**, before file construction/share/download | `app.js` `exportActiveProfileSaveData`; audit all call sites |
| **Settings: Import Backup / Replace All / reset / Erase All Family Data** | **Recommended parent-only management**, PLUS preserve separate destructive confirmation | `app.js` settings handlers and `openFamilyImportDialog`/`openProfileDestructiveMathDialog`; math reset today is a data-loss confirmation, not automatically an Apple parental gate |
| **Settings: Contact Support Email** | Gate before opening Mail | `app.js` `showContactSupportDialog` `mailto:`; keep the support email readable without unlocking |
| **In-app Privacy Policy email link** | Gate before opening Mail | `screenPrivacyPolicy` `mailto:`; policy text should remain readable with no gate |
| **Credits: external SoundTouchJS GitHub link** | Gate before leaving the app | `showCreditsDialog` external anchor; keep attribution text available |
| **Any other true external URL/native sharing path** | Gate after a call-site audit, before action | Search active `href`, `window.open`, `location.href`, `mailto:`, `navigator.share`, `UIActivityViewController`. **Do not** wrap `navigateToExternalPage` blindly: it also powers internal game-page navigation. |
| **Flashcards microphone: first new OS request** | Gate before the native permission request; **not every recording** | Differentiate permission state and optional recording. Keep denial fallback and RAM-only processing. |
| **Core Learn/games/Daily/BibloPets, Ghost Writer edit/replay** | **No gate** | Gameplay should remain exactly as currently owner-tested. |
| **In-app privacy text, contact details, Credits text** | **No gate to read** | Only gate the *outgoing link/action*. |

**Review caveat:** This inventory is anchored to the source paths reviewed during PR #188, **not a certification that every future link or permission source has been found**. Before implementing, inspect the current `ios-prep` head and update coverage for new call sites.

## Proposed architecture

- Build a **shared, testable parental-gate helper/UI** with operations like "require adult approval for this one action" and "enter parent-only settings"; these are conceptual contracts, not mandated API names. Challenge presentation should be a compact accessible modal and should not overwrite/lose the current Ghost Writer remix.
- Use **native iOS-only activation** based on the app's actual Capacitor/native identity. `index.html` and standalone `verse_playground/ghost_writer/index.html` are separate entrypoints: both need the helper. The current `scripts/build.js` copies source files to `dist/` and already injects an early iOS-specific output guard; consider the least invasive and tested pattern for packaging new gate code **without changing the live PWA**.
- Do not make the PWA accidentally start showing gates, and do not let unknown/partially initialized native state become a bypass. Keep the separate Audio Test identity from being mistaken for production, and do not disturb its stored profiles.
- Expose narrowly scoped callbacks, **not a global boolean "parentApprovedForever"**. Do not rely on an easily forged URL parameter, mutable localStorage flag, simple alert or the current child-solvable reset math to protect outward actions. Consider native-side checks/bridge constraints for defense in depth when practical.
- Deny external actions on app backgrounding, screen exit, failed/canceled challenge or invalidated work. Avoid recursive re-gating loops and duplicate share sheets. Existing asynchronous audio/image/video cleanup still runs correctly.

## Implementation sequence (four small owner-reviewed PRs to `ios-prep`)

### PR 1 — Reusable gate, visual design, isolated tests

**Create:** shared adult-check module + styling/packaging and a safe demo/harness or test-only invocation, without gating any existing production feature yet.

Acceptance:
- [ ] Native iOS identity/entrypoint loads the helper in the main app and Ghost Writer; ordinary PWA/main and unrelated Android/web experiences are unchanged.
- [ ] Responsive, accessible "Grown-up Check" with Not Now, explicit adult continue, randomized adult-level task, retry/cancel, and VoiceOver/keyboard/large-text support.
- [ ] Isolated helper tests prove success runs the **one** pending callback; cancel, wrong answer, repeated clicks, navigation, backgrounding, or stale calls cannot invoke it; no durable unlocked state is stored.
- [ ] Build and CI checks run at the exact PR head; no active gameplay behavior changes.
- [ ] Update `docs/PROJECT-HANDOFF.md` with actual findings, CI and unresolved issues. Owner reviews and merges separately.

### PR 2 — Ghost Writer native sharing

**Connect:** **Share Picture** and **Share Video** in both simple/more Remix paths to the shared gate; keep local Save buttons and media rendering untouched.

Acceptance:
- [ ] On denied/canceled check, **no share sheet, outgoing-file generation, media transfer or fallback** occurs, and the child remains on Remix with the same work.
- [ ] After approval, exactly the selected image/video share sheet is presented; double-tap/rapid interactions do not duplicate actions; pending state is cleared on cancellation/interruptions.
- [ ] Saving the same image/video to Photos still works with prior permissions; replay/remix/import remain unchanged.
- [ ] Targeted automated tests + **disposable simulator with fictional data**, not original phones; PR-head CI and handoff evidence; owner merges separately.

### PR 3 — Parent-only Settings, backup, and external links

**Connect:** the same adult gate to family backup export and individual-profile export, support email, Credits GitHub link, Privacy Policy support email; group sensitive management actions in a parent-only area as practical.

Acceptance:
- [ ] Parent unlock lasts **only while inside the active parent settings area**, not across pages, other Zookeeper profiles, app background/relaunch, or separate Ghost Writer shares.
- [ ] Before export or any download/share fallback, require parent authorization. No JSON is created/shared/downloaded while locked; child cannot bypass via profile management.
- [ ] Import/replace/reset/erase have parent-only entry plus the existing explicit destructive confirmation. Keep normal restore paths intact and distinguish data-loss confirmation from the Apple parental gate.
- [ ] Privacy policy, credits/license notices, help contact *text* and the app's core Settings information remain viewable without a gate. Outbound `mailto:` or external website cannot launch without authorization, including raw anchors.
- [ ] Audit every other real outgoing URL/share surface; guard genuine external actions, **not internal game navigation**. Verify PWA behavior unchanged and no original family data used.
- [ ] Targeted automated tests, disposable simulator acceptance, PR-head CI and living handoff; owner merges separately.

### PR 4 — First-time OS permission gates, bypass audit, final Kids acceptance

**Connect:** adult gate before **new iOS microphone and Photos add-only authorization prompts**, where required; review Photos/Files picker distinctions without adding unnecessary prompts. Strengthen protection based on findings.

Acceptance:
- [ ] Native permission-state checks distinguish `notDetermined` from already granted/denied; a new request is parent-gated, previously granted access is not repeatedly challenged, and a denial/revocation fails gracefully.
- [ ] Explicitly verify Flashcards record/replay/exit and Ghost Writer Photos add/cancel/save flows are unchanged except at a **new OS permission request**; retain normal child-safe fallbacks.
- [ ] Enumerate external action/permission entry points and assert **no bypass** via raw anchors, navigator sharing, native share plugins, other pages, app lifecycle, direct navigation, retry/double tap, missing helper or offline mode.
- [ ] Test cross-page gate behavior, accessibility, cold launch and recovery on **disposable iOS simulator with entirely fictional profiles**. Do **not** repeat comprehensive gameplay testing already passed; focus on gate/new permission paths and minimal regression smoke tests.
- [ ] Document App Review notes explaining adult gate and optional permissions; verify current Apple Kids guidelines, child privacy/SDK obligations and accurate age rating. **App Review eligibility remains unconfirmed until owner sign-off and actual review.**
- [ ] Exact PR-head CI, updated handoff, owner review/merge. No upload or App Store Connect selection in this step.

**If a dependency changes the plan:** split a PR rather than widen it into unrelated native audio, gameplay, backup-format, asset-rights or PWA changes. Three PRs may suffice if settings+permissions are safely combined; more than four can be justified by unresolved native permission behaviors. Four is a **planning estimate**, not a promise or fixed budget.

## Test safety and independent release gates

- **Original profiles are irreplaceable:** protect the **10 production Zookeepers** and **11 separate Audio Test Zookeepers**. Do not reinstall, reset, import into or overwrite either real app as part of this work. Use test-only disposable simulator and fictional backup/media. Never commit real JSON, child names, profile IDs, photos or voice.
- **Backup gap stays OPEN:** family v2 export omits standalone `biblozooZooEscapeStats:v1:<id>` and `biblozooZooSurprise:v2:<id>` keys. A parental gate does not restore those. Handle format preservation as a separately approved project.
- **Privacy sign-off stays OPEN:** empty archive manifest declarations and Proxyman observations do not guarantee every third-party SDK or bypass route has been vetted. `No data collected` is still provisional.
- **Other App Store gates stay OPEN:** support/privacy pages are verified, but content/audio/font rights, category/age rating, app metadata/screenshots, seller/storefront choices and final native acceptance need their own work.
- All PRs target **`ios-prep`**, begin from current head, include **`docs/PROJECT-HANDOFF.md`**, and remain **open/unmerged** for owner review. **Never merge `ios-prep` into `main`** to complete a native feature.
- Avoid introducing a third-party gate SDK, accounts, subscriptions, or collecting parents' information to solve this.

## Apple policy references (re-check at implementation/release)

- [App Review Guidelines 1.3 and 5.1.4](https://developer.apple.com/app-store/review/guidelines/) — Kids external-link restrictions and child privacy; a parental gate is not legal consent.
- [Design safe and age-appropriate experiences](https://developer.apple.com/kids/) — adult-level tasks, Kids age bands and parental gates for outside apps.
- [Apple announcement about Kids Category permission requests](https://developer.apple.com/news/?id=01212020b) — Apple expressly describes gating link-outs, permission requests and purchase opportunities. Confirm current applicability and actual API request sequence before changing code.
- [Apple App Store Connect Kids category and age rating guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating) — Kids age band selection and continuing obligations.

## New chat kickoff — paste or link this

> Please implement **PR 1 of the four-PR native iOS Kids parental-gate plan** for `andydoane/biblozoo`. Read `docs/IOS-PARENTAL-GATE-IMPLEMENTATION-PLAN.md`, `docs/IOS-KIDS-CATEGORY-PREFLIGHT.md` and the top of `docs/PROJECT-HANDOFF.md` from the **current `ios-prep`**. Implement **only** the reusable adult-level gate/harness with tests as scoped in PR 1; leave gameplay, backups, sharing and real app installations unchanged. Preserve `main` PWA behavior and the separate family/Audio Test data. Create a focused PR **targeting `ios-prep`**, update the living handoff, verify changed-file scope and CI, and **do not merge the PR**. The owner will review and decide. Subsequent PRs 2–4 are separate tasks.
