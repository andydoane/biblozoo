# BibloZoo 1.0 — App Store listing draft

## CURRENT — merged simulator fixtures; acceptance pending (November 24, 2026)

PR #239 merged at `6408916e5c043578e716e3759c454a040834c63f`. Owner's exact-head `25b9827b` log confirms 153 Debug synthetic assertions and ordinary unsigned simulator build PASS (SDK 26.5, both architectures); PR and merge CI passed. Fixture-only build and exact bundle ID, compile-failure fences and interactive simulator acceptance are unverified. See [current roadmap](IOS-AGE-ASSURANCE-ROADMAP.md) and [simulator guide](IOS-AGE-ASSURANCE-SIMULATOR.md). No release activation, live Apple calls, new backend, costs, or family data changes; prior consent, notification and release blockers remain.

## CURRENT — age-assurance roadmap and availability checkpoint (November 24, 2026)

See [standalone age-assurance roadmap](IOS-AGE-ASSURANCE-ROADMAP.md) for the complete current checkpoint and remaining release gates. Merged #237 owner-tested exact head a8b28874: 110 synthetic checks and unsigned simulator compile PASS. Candidate #238 distinguishes unsupported platform from temporary/unavailable check, adds a non-Debug live-flag compile fence and synthetic offline policy assertions. No live activation, new data persistence, connectivity probe, signing, backend, iCloud, cost or changes to ordinary app, PWA or Audio Test. Initial minor consent, legacy-account eligibility, offline/revocation behavior and notification obligations unresolved; no implied legal clearance or new privacy-label/metadata decision. Existing release gates remain. Candidate acceptance pending; future updates must maintain the roadmap and relevant docs.

## CURRENT — foreground reauthorization checkpoint (November 24, 2026)

See [current lifecycle implementation](IOS-AGE-ASSURANCE-LIFECYCLE.md). #236 merged and owner verified 89 synthetic checks and unsigned simulator BUILD SUCCEEDED on exact head 0d8ad7bb. Candidate adds foreground-scoped ticket invalidation and recheck before restoring retained gameplay controller, only in the still-disabled staged live mode. No retained age/consent proof, raw age storage, developer network client, new signing, cloud service or ordinary app/PWA/Audio Test behavior change. No actual initial minor consent signal or complete revocation mechanism yet; Apple [Q&A](https://developer.apple.com/support/age-assurance/) directs developers to RESCIND_CONSENT notifications as well as OS launch enforcement. No-server sufficiency, retained bridge/audio behavior, older OS/offline and signed sandbox acceptance remain open. Existing privacy, Kids, listing, parental gate and legal release gates remain; no enrollment, backend, family-device installation or cost authorized.

## CURRENT — Apple significant-update adapter checkpoint (November 24, 2026)

See [current consent implementation](IOS-AGE-ASSURANCE-CONSENT.md). #234 merged and owner verified normal unsigned build and 64 synthetic assertions. New candidate adds documented Apple significant-update acknowledgment and PermissionKit request/response adapter only, with no live caller or enabled gate, no fabricated first-release update, no initial consent inference, and no persistence or developer backend. In-flight opaque question ID matched to response; no logs/JS/raw age data, no iCloud or signing change. Normal app, PWA and Audio Test unchanged. Initial minor consent, update recovery/account scope, revocation, older OS/offline, entitlement and sandbox verification remain open. No change to proposed privacy labels, Kids positioning, listing, gate or legal release clearance; reassess after activation.

## CURRENT — age-assurance metadata checkpoint (November 24, 2026)

The [native age-access policy](IOS-AGE-ASSURANCE-ACCESS.md) is staged, not active in normal builds. Do not claim live age verification, legal compliance or approval in listing or questionnaire before entitlement and signed sandbox acceptance. No changed listing copy, screenshot plan, price, US storefront choice or conditional Kids position. Revisit actual capabilities, privacy declarations and App Review notes before submission.

## CURRENT — storefront scope update (November 24, 2026)

Owner approved US-only version 1.0, superseding prior five-country planning. Keep $4.99 USD, paid upfront, no IAP/subscriptions/ads, iPhone/iPad, Education and conditional Kids ages 6–8 unchanged. Canada, UK, Australia and New Zealand are future candidates only. Manually select US availability after enrollment, subject to all outstanding US compliance, rights, age assurance and Apple review gates; no App Store Connect action yet. See [US launch preflight](US-LAUNCH-COMPLIANCE-PREFLIGHT.md). Listing copy and screenshot storyboard otherwise unchanged.

**Status:** offline copy for owner review, November 24, 2026. Baseline ios-prep 87c03fd547bbc8ecf9563f5c4b5793aa0ad0cd5b (merged #225). No App Store Connect record created; name availability, owner approval, final build/rights, metadata and Kids eligibility remain open.

Apple references: [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/), [platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information), [product page guidance](https://developer.apple.com/app-store/product-page/), [Review Guidelines §2.3.7–2.3.8](https://developer.apple.com/app-store/review/guidelines/). Name/subtitle max 30 characters each; promotional text 170; description 4000; keywords 100 bytes. Avoid prices in marketing metadata; use actual pricing field. Neutral public copy below intentionally avoids Kids-only wording pending eligibility; not a decision to launch outside Kids Category. If eligibility fails, owner must reconsider positioning and actual intended audience, not simply relabel.

## Public listing — proposed en-US

- Name (8/30): BibloZoo
- Subtitle (25/30): Bible Memory Through Play
- Promotional text (144/170): Learn Scripture, collect BibloPets, and grow your own zoo. Explore 124 Bible lessons, playful memory games, and daily practice at your own pace.
- Keywords (86/100 ASCII bytes): scripture,memorize,verse,christian,faith,flashcards,devotional,learning,games,zoo,pets
- Support URL: https://andydoane.github.io/biblozoo/app-support.html
- Privacy URL: https://andydoane.github.io/biblozoo/app-store-privacy.html
- Primary category: Education (owner-approved); secondary not selected.
- Made for Kids 6–8 conditional on final rating and approval; no rating claimed.
- Price: $4.99 USD one-time purchase; configure separately; no price embedded in listing text.
- Copyright: 2026 [owner legal rights-holder name to confirm]. Do not submit placeholder.
- Initial release notes (if requested by field): Initial release of BibloZoo.
- English; confirm locale coverage, actual name availability and final supported device/OS declarations in ASC.

### Description (1388/4000)

Learn Scripture, collect BibloPets, and grow a zoo one verse at a time.

BibloZoo brings Bible memorization to life through interactive learning, creative activities, and rewarding practice. Discover 124 Scripture lessons from the Berean Standard Bible (BSB), complete with explanations and reflection questions.

LEARN THE VERSE
Listen to narrated Scripture, practice manageable chunks, and echo the words as you build confidence.

PLAY WITH PURPOSE
Explore 12 Verse Games and five Verse Playground activities. Put verses in order, solve word challenges, make music, and get creative with Ghost Writer.

GROW YOUR ZOO
Earn collectible BibloPets as you learn. Create individual Zookeeper profiles, track progress, and return to your own collection.

MAKE PRACTICE A HABIT
Use Daily To-Do activities and reflection questions to revisit Scripture and think about what it means. Practice with interactive Flashcards, including optional voice recording and playful voice effects.

MAKE SCRIPTURE YOUR OWN
Create pictures and videos with Ghost Writer, save your creations, or share them with grown-up approval.

BUILT FOR EVERYDAY LEARNING
Core learning and games work offline. No account is required. Progress is stored on your device, with backup options for individual Zookeepers and the whole zoo.

One purchase unlocks the complete app. No advertising, subscriptions, or in-app purchases.

## Draft App Review notes (not public metadata)

BibloZoo is a Bible memorization and educational game app intended for independent-reading elementary learners, with proposed Made for Kids 6–8 subject to rating eligibility. No account or demo credentials are required. Select/create a fictional Zookeeper and choose a verse to try Learn (Listen, Chunks, Echo), Verse Games, Verse Playground and Flashcards. Core content is bundled; profiles and progress stay on-device. Optional microphone recording in Flashcards is held in memory for playback/effects; first permission request is gated. Ghost Writer accepts selected local photos and creates local media; first Photos save permission and outgoing shares are gated. Settings grown-up area protects backup management and external support/credits links. Grown-up Check is randomized two-step arithmetic, three failures deny, Cancel and single-action approval. No ads or IAP; paid download. Explain actual review candidate and permission behavior after final build validation. Flag sacramental wine reference, abstract arcade effects and gate suitability for Apple consultation; no final rating or privacy certification asserted. Reviewer contact details to be entered privately in ASC, never repository.

## Draft TestFlight beta description / What to Test

Bible memorization through narrated lessons, games, reflection, collectible BibloPets and local Zookeeper profiles. Test only with fictional data: create a profile, learn and practice a verse, earn a reward, try Flashcards microphone denial/grant and Ghost Writer local save/share cancellation, verify Grown-up Check and backup flows, and check offline launch. Record device/iOS version and any defects. Use a separate disposable test device/profile or explicit owner authorization; never install over, reset or expose real family or Audio Test data. This is a candidate smoke checklist, not a request to repeat already established tests now.

## Screenshot storyboard (planning only)

1. Grow your own Bible memory zoo — actual Zoo view with fictional pets/profile.
2. Learn Scripture one step at a time — actual Learn screen.
3. Put memory into play — actual Verse Games screen.
4. Collect BibloPets as you learn — actual reward/collection screen.
5. Make Scripture your own — actual Ghost Writer artwork with fictional/local test image.
6. Build a daily practice habit — actual Daily To-Do/Flashcards screen.

Capture actual portrait native iPhone/iPad UI with fictional Zookeepers only; verify current Apple screenshot dimensions, safe margins, 4+ suitable content and correct device sizes before capture/export. Do not create simulated screenshots or promise unsupported accessibility. No screenshots captured yet. No real profile names, progress, photos, voice, backups or hidden tools. Owner to approve copy and shot priorities. Verify feature counts and all claims against final release candidate; 124 lessons verified in #221; game registries previously reviewed. No visual/audio content clearance implied.
