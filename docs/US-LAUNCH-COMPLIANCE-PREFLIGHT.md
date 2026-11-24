# BibloZoo 1.0 — US launch compliance preflight

## CURRENT — native-only implementation checkpoint (November 24, 2026)

Owner elected native implementation/testing and App Review rather than a forum post. Current [access policy candidate](IOS-AGE-ASSURANCE-ACCESS.md) handles known age outcomes separately from verified minor consent and significant-update state, retaining no raw age data. Live compile condition remains OFF; no actual initial minor consent signal, PermissionKit approval, revocation enforcement, older OS/offline acceptance or legal clearance established. No server, endpoint, iCloud or new recurring costs authorized. Texas §§121.054–.055 and [Apple Q&A](https://developer.apple.com/support/age-assurance/) remain release gates; App Review does not substitute for law. No change to US-only release scope.

## CURRENT — serverless release constraint and state timeline clarification (November 24, 2026)

The owner has stated that recurring server costs could make this hobby release infeasible. Follow the [native-only feasibility plan](IOS-AGE-ASSURANCE-PLAN.md) before proposing code or paid enrollment. Texas statute does not explicitly prescribe a developer server, but Apple's June 3 checklist includes server notifications; OS launch blocking alone is not yet confirmed sufficient. No backend, account, paid service or new cloud data store authorized. Apple's February 24 Utah/Louisiana dates below are historical announcements, not the current statutory schedule: [November 19 legal review](https://www.privacyworld.blog/2026/11/app-store-age-verification-laws-your-questions-answered-updated/) reports Utah May 6, 2027 and Louisiana July 1, 2027, California and Alabama January 1, 2027 (California distinct OS-signal model; Alabama challenge pending). Confirm primary statutes, court orders and current Apple implementation before release. Texas enforcement remains subject to pending appeal. No clearance claimed.

**Status:** preliminary planning and source/official-guidance screening, November 24, 2026. Baseline `8a59cedb2b35ca5563a5f34a9230e498adfebb5f` (merged #229). Not legal, tax, export or App Review clearance. Owner has selected United States only; no enrollment or actual availability setting yet.

## Launch scope

| Item | Decision |
| --- | --- |
| Storefront | United States only; manual selection, no automatic additions |
| Deferred | Canada, United Kingdom, Australia, New Zealand; country-specific clearance before expansion |
| Commercial model | $4.99 USD one-time native download, no IAP, ads or subscriptions |
| Audience | iPhone/iPad, Education; Made for Kids 6–8 conditional on Apple's eligibility determination |
| PWA | Free and unchanged; its separate hosting/privacy obligations are not eliminated by native storefront selection |
| Enrollment | Individual; deferred until remaining pre-enrollment work warrants it |

[Apple availability controls](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store) permit later territory expansion; not a waiver of legal requirements. US store selection is not a state-by-state exemption.

## COPPA, privacy and support

Existing [privacy preflight](APP-PRIVACY-PREFLIGHT.md), [native privacy audit](IOS-PRODUCTION-PRIVACY-AUDIT.md) and [native parental-gate review](IOS-NATIVE-PARENTAL-GATE-BRIDGE-REVIEW.md) document the offline-first design, no account/ads/analytics, local family data, temporary Flashcards voice capture, Ghost Writer local photo processing and user-directed OS share/export. Prior scoped simulator/device and source findings are not exhaustive current binary/traffic evidence. Existing Grown-up Check gates sharing and sensitive settings, including backups; ordinary inspected paths did not reveal a child-reachable bypass, but JS bridge trust and Apple gate suitability remain open.

The [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) distinguishes on-device processing with no transmission from enabling identifiable child information to be disclosed through a third party. Evaluate Ghost Writer Share Picture/Video and family backup sharing in their actual parent-directed flow; local saving is distinct. Do not equate the arithmetic gate with verifiable parental consent. Determine whether COPPA applies to any operator/third-party collection or disclosure, including website hosting and support. Recheck amended rule and relevant US state privacy/children's laws, thresholds and exceptions; Apple Data Not Collected answer is not a statutory exemption.

Existing [published support page](https://andydoane.github.io/biblozoo/app-support.html) asks customers not to send children's profile details, family backups, private photos or recordings. Proposed internal practice: ask parents for minimal technical information, direct children to a parent, avoid requesting personal data, securely handle and delete inadvertent child information when no longer needed consistent with legal duties, refer refund requests to Apple. Owner monitors existing mailbox; no email sent or new retention policy adopted here.

## State age assurance — next technical/legal checkpoint

Official references reviewed:
- [Apple Texas update, June 3 2026](https://developer.apple.com/news/?id=sg176nne): June 4 changes for new Texas Apple Accounts after stay of injunction; age category, consent for minor downloads/purchases/significant changes and revocation tooling.
- [Texas SB 2420 enrolled text](https://capitol.texas.gov/tlodocs/89R/billtext/html/SB02420F.htm): investigate developer age category/consent obligations, restrictions on use and deletion of verification data, significant changes and applicability. Litigation/enforcement may change; confirm current status before distribution.
- [Apple February 24 2026 Utah/Louisiana update](https://developer.apple.com/news/?id=f5zj08ey): Apple announced May 6 (Utah) and July 1 (Louisiana) new-account age category signals. Verify current statutes, amendments, court orders and platform implementation rather than assuming all rules are identical.
- [Apple age assurance Q&A](https://developer.apple.com/support/age-assurance/), [Kids guidance](https://developer.apple.com/kids/), [eligibility API](https://developer.apple.com/documentation/declaredagerange/agerangeservice/iseligibleforagefeatures): current guidance requires developer age checks where legally required, identifies Declared Age Range, PermissionKit/significant update and StoreKit capabilities, and sandbox scenarios. SDK 26.2+ for expanded features, 26.4+ regulatory-feature/acknowledgement APIs and 26.5+ confirmed declaration handling per Q&A. Review actual Xcode/SDK and runtime availability, not a proposed minimum OS increase. Apple says it prevents launch after parental revocation and offers server notifications; determine whether a server is required in BibloZoo's case; do not assume.
- [November 19 2026 state law overview](https://www.privacyworld.blog/2026/11/app-store-age-verification-laws-your-questions-answered-updated/): secondary pointer for evolving state laws; verify applicable primary sources, including other states and effective dates at launch.

No implementation chosen. Study actual iOS bridge, OS version/deployment target, age-range capability/entitlements, StoreKit significant-change rating metadata, Apple Account vs multiple local Zookeepers (no assumption account age identifies every player), age band eligibility, declined/unknown/error/offline and older OS states, revocation, and significant updates. Prefer minimum on-device data and system-provided flows; do not introduce accounts, DOB collection, identity documents, location collection or server storage without necessity analysis and explicit owner approval. Determine any required data deletion and consent behavior, and preserve local family data and existing gate. Test with synthetic profiles and Apple's sandbox if applicable; no production phone installation without existing backup safety gate. Verify whether actual implementation affects privacy labels, policy, Kids questionnaire or App Review notes. Do not file inaccurate questionnaire answers.

## US commercial and remaining gates

Individual enrollment remains owner decision. Verify applicable state/local registration, tax and business obligations with qualified guidance (no assumption that LLC is required). Keep records of revenue and expenses privately. After enrollment, accept [Paid Apps Agreement](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/), enter applicable tax and banking details, apply for [Small Business Program](https://developer.apple.com/app-store/small-business-program/) if eligible, set [price](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/), tax category and US storefront, confirm seller/copyright name and applicable consumer rights. No financial or identity details in repo. Confirm any Apple trader declaration needed even with no EU distribution. Retain existing encryption declaration subject to actual archive and applicable US export assessment; US storefront choice alone is not a formal classification.

Before enrollment/release as applicable: resolve state age assurance applicability and design, COPPA sharing/support issues, remaining rights/branding/notice caveats, Kids consultation and production archive/backup/device acceptance; revisit actual App Store Connect requirements after enrollment. No permission to publish, pay, alter code or remove features. No build, CI, sandbox or device verification performed in this docs-only checkpoint.
