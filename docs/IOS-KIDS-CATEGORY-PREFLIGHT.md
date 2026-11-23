# BibloZoo 1.0 — Kids Category / parental-gate preflight

**November 23, 2026 | status: INITIAL SOURCE REVIEW COMPLETE; DETAILED FOUR-PR IMPLEMENTATION PLAN DOCUMENTED; IMPLEMENTATION AND APP REVIEW ACCEPTANCE OPEN.**

**Proposed, not yet selected in App Store Connect:** Primary category **Education**, **Made for Kids / Kids Category**, age band **6–8** (early independent readers). The owner describes the sweet spot as elementary-age readers; older elementary children remain welcome. The owner agreed this positioning sounds good. **Do not treat this document as confirmation that App Review will approve the category or that the owner has made an irreversible App Store Connect selection.**

## Apple requirements used for this review

- [App Review Guidelines §1.3 — Kids Category](https://developer.apple.com/app-store/review/guidelines/#kids-category): links out of the app, purchasing opportunities, and other distractions need a designated area behind a parental gate; children’s identifying/device information must not be sent to third parties; advertising and analytics are strongly restricted. Once customers rely on Kids requirements, later deselection does not eliminate the obligation.
- [§5.1.4 — Kids](https://developer.apple.com/app-store/review/guidelines/#kids): comply with applicable children’s privacy laws; a parental gate is **not itself** legal parental consent for collection/sharing.
- [Apple — Design safe and age-appropriate experiences](https://developer.apple.com/kids/): a gate requires an **adult-level task**, not an ordinary confirmation or a child-readable “ask your parent” button.
- [Categories and Discoverability](https://developer.apple.com/app-store/categories/): Kids age bands 5 and under, 6–8, 9–11. Kids apps can also be found in primary/secondary categories.
- Age rating is distinct from the Kids **age band**; the actual questionnaire still requires accurate answers for content and app capabilities.

This is a product/code preflight, not independent legal advice or an Apple approval prediction.

## Inspected `ios-prep` code — feature-by-feature

| Surface | Source evidence and current behavior | Kids Category decision / required follow-up |
| --- | --- | --- |
| Learn, Daily To-Do, Flashcards, games | Core activities and voice processing are local-first; see [privacy preflight](APP-PRIVACY-PREFLIGHT.md). | **No Kids-specific code change identified** in the inspected core flows; preserve gameplay and optional recording. Continue independent SDK/privacy verification. |
| Ghost Writer picture/video **Save to Photos** | `verse_playground/ghost_writer/game.js` `ghostSaveImageBtn`/`ghostSaveVideoBtn`; `ios/App/App/SceneDelegate.swift` `saveToPhotos` uses add-only PhotoKit after user action. | Keep available; local saving is **different from sending to other apps**. No blanket requirement for a parental gate on every Photos permission was established in this review. |
| Ghost Writer **Share Picture / Share Video** | `game.js` directly calls `onPictureAction("share")` / `onVideoAction("share")` from child-facing Remix UI; native Swift `presentShare` opens `UIActivityViewController` with a temporary PNG/MP4. | **Priority 1: gate before the native share sheet or any export file generation for sharing.** Keep Save actions separate and ungated unless later review identifies a requirement. A share sheet can reach messaging, social, cloud or other apps. |
| Family/Zookeeper **backup export** | `app.js` `exportSaveData`, `exportActiveProfileSaveData`, `shareOrDownloadJsonSave` use `navigator.share({files:[file]})` when supported; JSON may contain child profile names and progress. Entry points in Settings and individual profile management. | **Priority 1: parent-only access before exporting/sharing**. Cover *both* whole-family and individual profile backup entry points; avoid bypasses via download fallback or profile editors. Keep backups usable to parents. |
| **Contact Support / Credits / Privacy Policy** | `app.js` `showContactSupportDialog` opens `mailto:`; `showCreditsDialog` embeds an external GitHub SoundTouchJS link; `screenPrivacyPolicy` includes a support `mailto:` link. | **Priority 1: gate external Mail/GitHub navigation**; keep local privacy text, licensing acknowledgements and contact address readable without a gate. Do not remove required acknowledgements. |
| Backup **import / replace / reset** | `app.js` exposes import in Settings; `openFamilyImportDialog` has Add/Replace; destructive flows use `openProfileDestructiveMathDialog` or related reset math. Current confirmation uses an 11–89 + 5–15 problem. | **Priority 2: parent-only Settings safeguards and data-loss design review.** Existing math confirmation was made to protect destructive actions; **do not presume** it satisfies Apple's adult-level parental-gate standard for readers age 6–8. Preserve all non-destructive recovery paths and real family data. |
| Custom picture import and optional Flashcards microphone | Native Photos/Files selection via `BibloZooGhostBackgroundPickerPlugin`; Flashcards recording is explicitly user-initiated and optional. Owner completed positive photo-import and denial/cancel/voice simulator tests; see privacy preflight. | **Scoped privacy testing passed; Kids-specific protection needs deliberate review**, but do not automatically gate all OS pickers/permission prompts or call them uploads. |
| External/navigation and debug paths | `app.js` `navigateToExternalPage` is also used for **in-app relative game** transitions; `BROWSER_VERSION_URL`/`BIBLOZOO_INSTALL_URL` constants exist. Hidden utilities are production-guarded by earlier #179 tests. | Gate **genuine external destinations**, not every location change. Confirm active call sites before changing a shared navigation helper. Keep debug tooling inaccessible in production. |
| Advertising, analytics, online chat/feed | No direct advertising or analytics SDK was declared in `package.json`; source/privacy review found no automatic first-party profile upload. No public chat/feed functionality identified in inspected paths. | Favor no ads, tracking or online user-content posting. **Do not** claim complete third-party runtime clearance based only on manifest declarations or Proxyman. Finish the separate App Privacy audit. |

## Follow-on implementation handoff

The complete proposed **four-PR delivery plan**, including the parent-gate interaction, approval lifetime, exact protected surfaces, module/entrypoint constraints, per-PR acceptance criteria, simulator safety, and a ready-to-paste next-chat kickoff is in **[IOS-PARENTAL-GATE-IMPLEMENTATION-PLAN.md](IOS-PARENTAL-GATE-IMPLEMENTATION-PLAN.md)**. The source matrix below is still the initial risk inventory. **Neither this document nor the plan implements any gate.**

## Recommended implementation sequence — **no code changes in this review**

1. **Design a consistent adult-entry flow** for the native iOS Kids build, backed by an actual adult-level task with Cancel. Gate immediately before any external link, email, native share sheet or profile/family backup export. Avoid a “tap Yes” check or easily solved arithmetic targeted at 6–8-year-olds. Provide accessible instructions and do not persist an unlimited bypass. Decide whether a short in-session adult unlock is appropriate and ensure it cannot be carried over to another Zookeeper unexpectedly.
2. **Audit all entry points**: Ghost Writer share both media types and Remix modes, Settings family export, individual Zookeeper export, contact Mail, embedded policy Mail, Credits GitHub link, and any other native `href`/`window.open`/`navigator.share`/`UIActivityViewController` call sites. Include export failures/download fallbacks in the protection.
3. **Preserve gameplay**: Flashcards recording, Photo/Files pickers, Save Picture and Save Video to the local photo library, learning and games should continue to work. Keep privacy policy and contact *information* accessible without a gate. Protect sending/leaving rather than hiding information.
4. **Review the parent-only data-management UX**: decide whether backup import and destructive reset should live behind the same parent entry; keep existing confirmation steps and add safe cancellation. Local backups v2 still **omit standalone Zoo rescue/surprise keys**; gating cannot solve that format gap.
5. **Add automated and disposable-simulator acceptance**: simulate a child failing/canceling the gate; assert no external URL, mail composer, share sheet, file export, or data deletion occurred. Confirm a correct adult gate permits exactly the selected action; exercise Ghost Writer both simple/more Remix and family/profile backup paths. Check PWA paths remain unaffected; do not install over original family Zookeepers. Treat the owner’s already-passed functional/media/privacy checks as established; test **only the new gate behavior**.
6. **Before App Store submission**: obtain owner-approved Kids positioning, age questionnaire answers, final SDK/data-collection clearance, matching policy/App Review notes, and confirm actual release build behavior.

## Evidence and ownership status

- [x] Intended audience established: independent-reading elementary children, with **6–8 as proposed main Kids band** and Education as proposed primary category.
- [x] Initial Apple rules review and source-level risk inventory completed on `ios-prep` as of November 23, 2026.
- [x] Public App Store privacy page [verified by owner](https://andydoane.github.io/biblozoo/app-store-privacy.html) and [support page verified by owner](https://andydoane.github.io/biblozoo/app-support.html); support page was published through merged [PR #187](https://github.com/andydoane/biblozoo/pull/187) on `main`.
- [x] Detailed four-PR gate implementation plan prepared for a separate chat; **planning is not implementation** ([plan](IOS-PARENTAL-GATE-IMPLEMENTATION-PLAN.md)).
- [ ] Owner reviews/approves final parental-gate UX/spec and scope; **no gate implementation is claimed** in this document.
- [ ] Native-only external link, share, backup gates implemented and verified, including bypasses and accessibility.
- [ ] Confirm Kids Category/age band in App Store Connect only after compliance acceptance.
- [ ] Finish independent privacy/SDK, legal, content/asset rights, and review metadata requirements.

**Branch/data safety:** Any implementation PR targets `ios-prep`, not `main`. Shared JS modifications must not unintentionally change live PWA behavior. Keep owner’s real 10 production and separate 11 Audio Test Zookeepers and backups out of tests, source control and destructive restore flows. Owner decides when to merge.
