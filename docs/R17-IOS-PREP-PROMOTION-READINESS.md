# R17 — final iOS integration acceptance and `ios-prep` promotion readiness

**Status: [R17 documentation/handoff closeout PR #154](https://github.com/andydoane/biblozoo/pull/154) is the candidate, targeting integration only; STABLE PROMOTION NOT YET APPROVED OR MERGED.** Updated 2026-11-19 from the owner's iPhone reports and GitHub evidence. The current source is `integration/native-audio-to-ios-prep`; the proposed eventual destination is `ios-prep`. This document is an acceptance ledger, **not** evidence that a native Xcode Archive or full device test matrix has been independently witnessed.

## Latest objective checkpoints

- [R16b.3 PR #153](https://github.com/andydoane/biblozoo/pull/153) **MERGED** on 2026-11-18 EST / 2026-11-19 UTC to integration at `4619f248dbfcfed722b8de4e75320407455c1f20`. The previously failed pre-merge CI was corrected (stale test assertions), and [post-merge GitHub Actions #44439057661](https://github.com/andydoane/biblozoo/actions/runs/44439057661) **PASS at that exact merge SHA**: Node regressions and production web build, including Swift source parse and resource/privacy validators. **Not an Xcode SDK compile, Archive, signing validation, or hardware audio measurement.**
- Owner then **merged, physically iPhone-tested and reported #153 “doing exactly what we need”**. Mark **R16b.3 OWNER PASS for the intended behavior**: Verse Crawl starts with both music + spoken verse audible under the approved scoped Silent-Mode exception; the small yellow-note music button can stop/restore the soundtrack independently without disrupting verse. Owner subsequently reported **“I've tested the app thoroughly and haven't found any issues.”** Record as a **broad owner iPhone smoke/acceptance report**; the exact OS, output route, per-activity coverage, interruption matrix and tested local build SHA were not individually supplied. Do not replace unreported case results with invented PASS labels.
- [R16b.2 #152](https://github.com/andydoane/biblozoo/pull/152) remains **MERGED but not accepted** for Silent-ON default music+voice: the owner found neither audible until Music OFF, which enabled voice only. This is a **historical FAIL, superseded by #153**, not an outstanding code fix.
- As of this checkpoint, public GitHub shows **no open pull requests** before this R17 docs proposal. The integration branch is ahead of stable `ios-prep` by **2,047 commits, 0 behind** in the 2026-11-19 GitHub comparison; the API lists a capped selection of 300 changed files. This is a broad accumulated promotion, not just a one-file sound change. **Recheck immediately before promotion.**

## Focused issue closure ledger

These rows distinguish targeted owner confirmations, policy decisions and the broad final owner report. Details and earlier exceptions remain in [the stabilization roadmap](IOS-NATIVE-AUDIO-STABILIZATION-PR-ROADMAP.md), [device findings](IOS-OWNER-AUDIO-FINDINGS-2026-11-17.md) and [testing history](TESTING.md).

| Phase | Issue / result | Evidence and bounded acceptance |
| --- | --- | --- |
| R01 | `FLASH-01` — **OWNER PASS** | [#128](https://github.com/andydoane/biblozoo/pull/128): UI pops after Flashcards recording |
| R02 | `FLASH-02/03` — **OWNER PASS after follow-up** | [#129](https://github.com/andydoane/biblozoo/pull/129) + [#130](https://github.com/andydoane/biblozoo/pull/130): Flashcards external audio/controls |
| R03 | `FLASH-04` — **OWNER PASS** | [#131](https://github.com/andydoane/biblozoo/pull/131): recorded voice AirPods route handling |
| R04 | `LEARN-02` — **OWNER PASS** | [#132](https://github.com/andydoane/biblozoo/pull/132): held App Switcher visual pause |
| R05 | `DAILY-01`, Learn Menu pause — **OWNER PASS** | [#133](https://github.com/andydoane/biblozoo/pull/133): Daily Questions recovery and menu pause |
| R06 | `PLAY-01` — **OWNER PASS** | [#134](https://github.com/andydoane/biblozoo/pull/134): Verse Typer visual freeze |
| R07 | `READ-02/03` — **OWNER PASS** | [#135](https://github.com/andydoane/biblozoo/pull/135): Balloons/Fish pause-clock |
| R08 | `READ-05/06` — **OWNER PASS** | [#136](https://github.com/andydoane/biblozoo/pull/136): Tap Order/Unscramble native cue timing |
| R09/R09b | `FLASH-05` — **OWNER PASS after follow-up** | [#137](https://github.com/andydoane/biblozoo/pull/137) + [#138](https://github.com/andydoane/biblozoo/pull/138): RAM voice leveling and meter |
| R10 | `READ-04` — **OWNER PASS** | [#139](https://github.com/andydoane/biblozoo/pull/139): Read sound balance |
| R11 | `LEARN-01` — **OWNER PASS** | [#140](https://github.com/andydoane/biblozoo/pull/140): duplicate Welcome Back busy text |
| R12/R12b | `READ-01` — **OWNER PASS after follow-up** | [#141](https://github.com/andydoane/biblozoo/pull/141) + [#142](https://github.com/andydoane/biblozoo/pull/142): quote grouping and Typewriter/Keyboard intro fitting |
| R13 | `PLAY-02` — **OWNER PASS** | [#143](https://github.com/andydoane/biblozoo/pull/143): Ghost Writer transition overlay |
| R14 | `PRACTICE-01` — **OWNER PASS** | [#144](https://github.com/andydoane/biblozoo/pull/144): Traffic Tap bonus truck |
| R15 | `AUDIO-01` policy — **OWNER DECISION** | [#145](https://github.com/andydoane/biblozoo/pull/145): spoken learning/recorded voice audible in iOS Silent Mode, incidental effects normally silent; **explicit Verse Crawl exception approved later** |
| R16a/a.1/a.2 | `AUDIO-01` essential narration and false Learn menu interruption — **TARGETED OWNER PASS** | [#146](https://github.com/andydoane/biblozoo/pull/146), [#147](https://github.com/andydoane/biblozoo/pull/147), [#148](https://github.com/andydoane/biblozoo/pull/148): scoped category, diagnostics and Learn fix |
| R16b/b.1 | `AUDIO-01` Read narration and false Typewriter Welcome Back — **TARGETED OWNER PASS** | [#149](https://github.com/andydoane/biblozoo/pull/149) + [#150](https://github.com/andydoane/biblozoo/pull/150): original #149 Typewriter regression resolved by #150 |
| R16b.2 | Verse Crawl initial Silent-ON behavior — **HISTORICAL OWNER FAIL** | [#152](https://github.com/andydoane/biblozoo/pull/152) merged; silent default failed owner's intent, prompting corrective #153 |
| R16b.3 | Verse Crawl soundtrack-only reversible music note — **OWNER PASS** | [#153](https://github.com/andydoane/biblozoo/pull/153) merged and owner iPhone-tested: “doing exactly what we need”; post-merge CI PASS |

**Interpretation:** All originally listed focused R01–R16 fix scopes have owner-reported closure (with the superseded #152 failure preserved). This is **not** a claim that every hardware route/OS/permission/accessibility combination was separately tested or that R17 packaging/data risks are closed.

## Outstanding R17 promotion gates — do not turn unknown into PASS

| Gate | Evidence currently held | Remaining owner / Mac action |
| --- | --- | --- |
| Clean source/web automation | **PASS** on merged integration `4619f248`, Actions [#44439057661](https://github.com/andydoane/biblozoo/actions/runs/44439057661) | After this documentation PR merges, verify the new integration HEAD's full CI and exact SHA; do not reuse prior run as final-head evidence |
| Final real-device functional smoke | **BROAD OWNER PASS report**, following focused PR acceptances | Record the owner's report; do not demand redundant exhaustive retests, but note speaker/AirPods/PiP/lock/OS/switch positions as **NOT INDIVIDUALLY ITEMIZED** unless subsequently supplied |
| Native Mac packaging and Archive | Previous successful production-ID Xcode Run is documented; **final integration HEAD Archive NOT VERIFIED** | On Mac, from clean **integration** HEAD after closeout merge: `npm ci`, `npm run build`, `npx cap sync ios`, Xcode target/device build **and Archive**. Verify signing Team/IDs, entitlements, required-reason and third-party privacy manifests, resource inclusion and microphone strings. Record actual results, warnings and tool versions. Avoid replacement or data reset simply to run an Archive |
| Private profile and backup safety | Prior owner-confirmed original **10 production** and separate **11 Audio Test** profiles; a 10-profile family-v2 export passed structural check. [Safety guide](IOS-FAMILY-BACKUP-SAFETY.md) | Owner confirms two **private off-phone** production backup copies, separately retains the 11-profile Audio Test data; the 10-profile disposable restore is not documented. Existing family-v2 backup omits per-profile Zoo rescue/surprise keys, so explicitly **preserve that risk / decide mitigation or accepted deferral** before risky install or data migration. No public upload, reset, import, or uninstall |
| Cross-platform/offline/privacy accessibility | Automated Node/production web build PASS, no new runtime changes in docs PR | Final Web/PWA smoke, Android if feasible, and any unreported route/accessibility matrix remain **not individually recorded**; document any explicit owner deferral or additional evidence; no guessing |
| Branch promotion | **NOT STARTED** | Once gates above are accepted, create a **separate** owner-reviewed PR, **base: `ios-prep`**, **compare/head: `integration/native-audio-to-ios-prep`**, with precise release ledger and handoff included. Do not merge the docs-only R17 PR directly into `ios-prep` or target `main` |

## The living handoff will continue on `ios-prep`

**Canonical handoff: [`docs/PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md).** The current `ios-prep` branch **already has this file** (originally added by PR #2); it is outdated, not missing. The future promotion PR will bring the much newer integration copy of **the same path** into stable `ios-prep`. This is deliberate: one handoff per branch, **not** a second competing master file. README and PR template must point to and require updates to that branch-local canonical file **in every future `ios-prep` PR**, including docs-only and CI-only work.

After an owner-approved promotion merge, verify `https://github.com/andydoane/biblozoo/blob/ios-prep/docs/PROJECT-HANDOFF.md` contains this R17 status and no longer says #153 is pending in its current section. Then in the **first subsequent `ios-prep` PR**, record the actual promotion PR number, final merge SHA, validation and any post-promotion observations at the top of that same canonical file. Preserve historical integration reports as history beneath fresh current status; never let an older “CURRENT” paragraph override a newer verified checkpoint.

## Owner-controlled merge flow (future; not part of this PR)

1. Merge this **docs-only** closeout PR into **integration** after review and green checks; pull the integration branch in GitHub Desktop. This PR is **not the promotion**.
2. Confirm the Mac Archive and data-safety acceptance above (or explicitly record what remains deferred and why). Verify the final source HEAD, clean working tree, full integration Actions PASS and private profiles remain protected.
3. Prepare a **new** promotion PR with **base `ios-prep`**, **compare `integration/native-audio-to-ios-prep`**. Review its full diff and check that the existing handoff, README and PR template appear in it. Do **not** merge directly/automatically.
4. Owner receives a click-by-click GitHub walkthrough, reviews checks and presses **Merge pull request → Confirm merge** only after the decision. No automatic changes to installed iPhone apps, TestFlight, App Store, `main` or production profiles.
5. After merge, check the `ios-prep` branch handoff and Actions on its real merge SHA, then **Fetch origin / switch to `ios-prep` / Pull origin** in GitHub Desktop. Treat any later native phone installation as a separately approved step, preserving local device data.

**No new runtime code, native audio policies, backups or production app behavior are changed by this documentation closeout.**
