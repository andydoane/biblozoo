# BibloZoo — Version 1.0 Asset Rights and Attribution Ledger

**Status: TARGETED 2026-11-23 TREE/PROVIDER TERMS RECHECK COMPLETE; OWNER ART/AUDIO SOURCES IDENTIFIED; BSB CORPUS VALIDATOR PRESENT; ASSET RIGHTS CLEARANCE NOT YET COMPLETE.**
**Initial inventory baseline:** `andydoane/biblozoo`, `ios-prep` at `2675c7c106c670cf6a09d4feeb307d770f8c5e74` (2026-11-22 EST). The inventory arrived in [merged PR #180](https://github.com/andydoane/biblozoo/pull/180) at merge commit `7f3e25e38a10db507a81cbab501e0f14cb87ee36`. This source/owner-declaration ledger is **not legal advice, a license certificate, or proof of final archive contents**.

**Purpose:** Establish evidence before publicly distributing version 1.0. Do **not** infer that a tracked, publicly visible, AI-generated, free-to-download, or bundled file is automatically licensed for App Store redistribution. Do not claim rights to imagery/recordings without the creator's or licensor's evidence. Owner must approve actual file replacements or removals separately.

## CURRENT — updated 1.0 rights source inventory and provider terms (November 23, 2026 ET)

**Source baseline:** merged [Kids math review PR #208](https://github.com/andydoane/biblozoo/pull/208), `ios-prep` at `3d9be01be62c2b750e8529dd8a13f14855b5d7fd`. This targeted audit re-examined the complete **2,537-file tracked Git tree**, `scripts/build.js`, bundled font paths, audio duplicates, third-party notices, and currently published provider terms. **It did not inspect receipts, confirm original per-sound download licenses, byte-compare vendor font archives, independently validate all original explanatory text, change an asset or run Xcode/CI.** Prior owner provenance declarations remain the starting evidence, not substituted for individual licensing paperwork.

**Packaged/public-repo inventory, freshly verified:**

- **Audio:** **1,033 MP3 paths** in the tree, of which **857** are under `verse_audio/` (verse/reference/chunk narration **plus** instructions/jingle; not all necessarily TTS). The **176 outside `verse_audio/`** are `flashcards/` 5, `ui_audio/` 3, `verse_games/` 114, `verse_images/` 19, `verse_playground/` 35. Those 176 paths comprise **131 distinct Git blob SHA-1 values** with 23 repeated-blob groups; e.g. the **same six-copy streak sound** appears across games and Daily Questions; five identical pop sounds recur across several game/playground folders. These counts **do not establish which files originated at ZapSplat, Voicertool, or were created independently**. `verse_audio/biblozoo_jingle.mp3` and `verse_images/read_my_verse/verse_crawl_theme*.mp3` deserve **music provenance checks** separately from speech/short effects.
- **Fonts:** **13 bundled font paths** = **10 distinct Git blobs**, including two byte-identical-by-Git-SHA copies of Florence S **Chalkboard** (`709bfa185de550276126db43f4e0d49eaa0af2e6`), and three paths sharing the **Titan One** blob. The tree does not contain `OFL.txt`/`LICENSE`/`NOTICE` files in the runtime font directories. `flashcards/vendor/soundtouchjs-2.1.1/LICENSE` and `SOURCE.md` **are present**; they document MPL-2.0 and the upstream package, but this is not a completed exact-source/dependency notice review.
- **Distribution surface:** `scripts/build.js` recursively packages `verse_audio/`, `ui_audio/`, fonts, game and playground directories **without stripping unreferenced media**. The `andydoane/biblozoo` repository is public and direct paths to its MP3/TTF blobs are accessible. **An in-app-use license and permission to republish raw source asset files are not equivalent**.

**Rechecked authoritative rights statements:**

1. **ZapSplat Standard License** (last updated **May 8, 2026**), [text](https://www.zapsplat.com/license-type/standard-license/): allows audio embedded within a completed app/game; [Premium terms](https://www.zapsplat.com/premium-account-upgrade-terms-and-conditions/) permit attribution-free use for files obtained during an active paid period, including after cancellation. **Owner previously confirmed a paid subscription at download time**. The [provider's app and file-sharing FAQ](https://www.zapsplat.com/can-i-use-your-sound-effects-in-my-project/) explicitly distinguishes using licensed music/effects **within a game/app** from redistributing sound files on their own. **High-priority open issue:** request **written provider clarification for exact raw/near-raw ZapSplat files in a public GitHub repository and its permanent history**, including whether current exposure needs remediation; do not presume a public Git history rewrite is either necessary or sufficient. Before any technical change, classify affected files using the owner's original download listing or hashes.
2. **Chalkboard:** [DaFont's Florence S Chalkboard page](https://www.dafont.com/chalkboard-3.font) lists `Chalkboard-Regular.ttf` as **100% Free**. The [DaFont FAQ](https://www.dafont.com/faq.php#copyright) emphasizes that its category is **only an indication**; check the distributed archive/readme or author. The two identical repository copies have **no explicit author-issued text here showing permission to package the raw TTF inside an iOS app and also republish it in a public GitHub repository**. The owner previously **deferred** this proof. **Keep permission OPEN**; request a written answer for both distribution contexts or consider a separately approved licensed substitute if permission is not forthcoming.
3. **BSB scripture:** [Berean Bible licensing](https://berean.bible/licensing.htm) places the Bible texts in the **public domain effective April 30, 2023**. The repository has a **124-ID** metadata/attribution validator (`scripts/validate_release_bsb_verse_corpus.js`) and a BSB-only disabled debug fixture. **Do not conflate** availability of the check with this session running it; metadata is not an independent word-for-word source comparison. Confirm ownership of any *original* teaching/recall/reflection prompts and Voicertool input text.
4. **Voicertool narration:** [February 2026 terms](https://voicertool.com/terms) permit **commercial use of generated TTS outputs**. The owner identified Voicertool as narration source; match final produced sound files and original generation-era terms if available. Keep non-speech music distinct.
5. **Open-source fonts/code:** The [SIL OFL mobile app FAQ](https://openfontlicense.org/ofl-faq/) requires copyright statements, license notices and the license text when bundling OFL fonts. Existing Google Fonts/Chunk family origins make OFL a promising route, but **this audit did not verify all ten bundled binaries against original upstream downloads**. Retrieve accurate upstream notices and include them in the distributable notices when confirmed; do not apply an OFL license to Chalkboard without proof. SoundTouchJS's existing MPL-2.0 notice/source record is a useful start, not final SDK/license clearance.

**Next owner-friendly release actions (no app/device changes today):** (1) Ask ZapSplat for **explicit written public-source-asset guidance** and privately preserve the subscription/date and exact asset list; (2) obtain Florence S/DaFont archive rights clarification on **mobile-app embedding plus raw GitHub publication**; (3) match remaining font/audio source binaries to their license records, check audio **music/jingle** separately, and collect accurate font/dependency notices; (4) confirm original commentary/teaching text ownership and final branding/trademark review. **Do not mark overall asset rights ACCEPTED until unresolved grants are answered.** Do not change repository visibility, Git history, media, font appearance, `main` PWA or native sound behavior without separate owner approval and an impact assessment.

---

## Owner-confirmed provenance and current license research (2026-11-22 EST)

The owner reports:
- **All artwork/images** (BibloPets, app/game illustrations, backgrounds, etc.) were either created by the owner or generated using **ChatGPT and edited by the owner**. The owner reports **no images sourced from outside websites or image libraries**. This settles the initial origin question **by owner declaration**, not binary-by-binary proof or a third-party logo/trademark audit. Do not disclose the owner's private prompts/photos/assets in public licensing notes.
- **Audio narration** was generated through **Voicertool**, https://voicertool.com/. This is the owner's stated source for generated audio; exact files/services/dates were not separately matched.
- **Sound effects** were purchased/downloaded through a **paid ZapSplat subscription**, https://www.zapsplat.com/. The owner explicitly confirms the files were **downloaded while the paid subscription was active**. The specific plan/account records, individual sound identities, download dates, any special per-track licenses and whether music tracks share this source are **not independently verified**.

### Official-provider licensing evidence (checked November 2026)

1. **Voicertool:** Its published February 2026 [Terms of Service](https://voicertool.com/terms) explicitly allow **commercial use of generated text-to-speech output**, currently without a charge; its [About page](https://voicertool.com/about) also advertises commercial licensing. This is promising support for voice recordings generated with that service, **not** permission for independently copyrighted input text, exclusive ownership of synthesized voice technology, or a guarantee that all versions of its terms at earlier creation dates were identical. Save a copy of the applicable terms and, if available, a dated generation/source summary. Confirm the exact narration tracks were produced with those rights. 
2. **ZapSplat:** Its [Standard License, updated May 8, 2026](https://www.zapsplat.com/license-type/standard-license/), expressly permits sound effects/music **incorporated in games/apps/software**. It states **Premium** sounds downloaded during an **active Premium** subscription remain usable attribution-free for life, including after cancellation; **Basic** downloads generally require attribution. See also [Premium Account Upgrade Terms](https://www.zapsplat.com/premium-account-upgrade-terms-and-conditions/). The licence **does not transfer ownership**, and prohibits redistributing licensed sounds as standalone files/sound libraries outside a completed production. Verify any **per-file special licenses**. **Owner confirmation received:** the files were downloaded during the paid subscription. Retain a billing-date/download summary privately to corroborate the applicable Premium account period; do not add receipts or account IDs to the public repo.
3. **Public repository caution:** `andydoane/biblozoo` is a **public** GitHub repository, and several bundled `*.mp3` files are committed as normal media files that may be individually downloadable from the repo. ZapSplat's permitted **in-app sound** use is distinct from a public distribution of stand-alone source MP3s. **Potential redistribution-license question, not a definitive legal conclusion:** identify the ZapSplat files and review their public GitHub/source-asset exposure. Obtain written permission or another compliant repository/distribution plan if needed. Do **not** delete files, rewrite Git history, privatize the repo, or alter app audio without owner approval and a safety/migration review.

**Important boundaries:** The owner has confirmed a **paid plan at download time**, satisfying the key Premium-timing question by declaration; current generic terms do not independently verify an individual file's origin, license type or historic terms, nor a right to share raw assets separately. These entries distinguish owner-provided provenance and current provider policies from final file-specific rights clearance.

### Next concrete source-sharing review

- [x] Owner confirmed the ZapSplat files were downloaded while a **paid subscription** was active; under current Premium terms the corresponding *embedded-app* use can continue after the subscription ends without attribution, subject to any file-specific requirements.
- [ ] Match a representative sample, then all applicable *individual* ZapSplat recordings to their original provider download, license type and subscription period; do not guess from filenames. Keep receipts privately.
- [ ] Determine which tracked `*.mp3` files are original or near-original ZapSplat sounds and publicly readable as standalone GitHub files; distinguish these from Voicertool narration and original/generated sounds. The repository's public status is verified, but Git paths alone do not establish a track's origin.
- [ ] **Do not distribute/relicense raw ZapSplat sound files as a standalone library** based merely on the embedded-game grant. Seek written guidance from ZapSplat about the public-source-repository scenario and evaluate a compliant plan (e.g., authorized sound replacements or a packaging/source-access change) with the owner. A current-branch file deletion does not by itself revoke prior public Git history. No changes to Git visibility/history/media without explicit owner review.

## 1. Inventory method and limits

- Read `scripts/build.js`: it copies the root runtime files and **all** of `flashcards/`, `pet_images/`, `profile_pictures/`, `ui_audio/`, `utilities/`, `verse_audio/`, `verse_data/`, `verse_fonts/`, `verse_games/`, `verse_images/`, and `verse_playground/` into the production `dist/` bundle. The Xcode project also bundles its own icon/splash assets. Consequently even an **inactive debug fixture or unused asset** can still be present in the distributable app.
- Inventory counts below are based on the live Git tree, per directory, including alternate/unused media. They are **not** an assertion that every image or MP3 is displayed/played. Counts may change as content changes.
- Checked sampled `verse_data/*.json` files and the 124-ID `verse_data/verse_list.json`. **Not yet verified all 124 JSON translations/attributions individually**, nor any audio-file embedded copyright metadata or image provenance. File names alone cannot prove rights.
- Checked available repository license/attribution files: `flashcards/vendor/soundtouchjs-2.1.1/LICENSE` and `SOURCE.md` exist. The media/font folders listed below had **no standalone license/credit documents in their Git trees**. Absence of a license document does **not** prove infringement; it means source evidence must be added or confirmed.

## 2. Packaged content groups: inventory versus rights evidence

| Source folder / asset family | Git inventory evidence | Current rights assessment / next proof |
| --- | --- | --- |
| `verse_data/` — verse content and family-learning prompts | 124 verse JSONs plus `verse_list.json` (124 IDs). Sampled John 3:16 and Philippians 2:8 are `"translation": "BSB"` with BSB public-domain attribution. | **Strong BSB text basis for sampled verses**, not comprehensive verification. Confirm all published JSONs use authorized text, and owner authorship or authorized rights to original explanations/reflections/questions. |
| `pet_images/` — collectible BibloPets | 126 PNG files (and one `desktop.ini`). | **ORIGIN OWNER-CONFIRMED:** owner-created or ChatGPT-generated and owner-edited; final visual/trademark check still pending. |
| `profile_pictures/` — public selectable pet pictures | 126 PNG files, one JSON manifest, one `desktop.ini`. | **ORIGIN OWNER-CONFIRMED:** owner-created or ChatGPT-generated and owner-edited. These are bundled public artwork, not the protected private family photos; final rights/trademark check pending. |
| `verse_images/` — UI, illustrations, scenes, icons, medals, themed backgrounds and some sounds | 183 PNG, 74 JPG, 3 SVG, 1 GIF, 19 MP3, one JSON. Includes `andymoji/`, `pet_backgrounds/`, `daily_questions/`, `daily_zoo_todo/`, `game_icons/`, `read_my_verse/`. | **ART ORIGIN OWNER-CONFIRMED:** owner-created or ChatGPT-generated and owner-edited. MP3 sounds require separate Voicertool/ZapSplat origin mapping and any premium-license proof; final visual/trademark check pending. |
| `verse_audio/` — reference/verse/chunk recordings | **857 MP3 files**. | **SOURCE OWNER-CONFIRMED:** Voicertool generated audio. Its published terms permit commercial generated output; exact track/source and original Bible text rights still need verification. |
| `ui_audio/` — shared UI sounds | 3 MP3 files. | **SOURCE CATEGORY OWNER-CONFIRMED:** sounds bought through ZapSplat subscription, or generated with Voicertool where applicable; map individual files and confirm paid-tier download timing/licensing. |
| `verse_games/` — external practice games | 131 PNG, 65 SVG, 2 JPG, **114 MP3**, plus 2 TTF font files. Includes Dino Dash, Bible Bugs, Verse Invaders, Verse Launch, Verse Scramble, etc. | **ART ORIGIN OWNER-CONFIRMED:** owner/ChatGPT. Sound effects from ZapSplat subscription by owner report, but file-by-file mapping and music origin still needed; fonts separately open. |
| `verse_playground/` — Playground activities | 63 PNG, 37 SVG, 19 JPG, **35 MP3**, **5 TTF + 1 WOFF** font files. Includes Ghost Writer, Scripture Scrub, Verse Typer, Wheel of Bible, Verse Jam. | **ART ORIGIN OWNER-CONFIRMED:** owner/ChatGPT. Audio sources owner-reported as Voicertool/ZapSplat, but confirm file mapping/music and prioritize the two `Chalkboard-Regular.ttf` copies. |
| `flashcards/` — badges/backgrounds, narration, third-party audio code | 15 PNG, 12 JPG, **5 MP3** and vendored SoundTouchJS runtime. | **ART ORIGIN OWNER-CONFIRMED**; audio Voicertool/ZapSplat category reported; individual file mapping needed. **Identified license** for SoundTouchJS (section 4). |
| `verse_fonts/` | 5 TTF files. | **OPEN:** match each exact binary to its upstream font and license; collect notices (section 5). |
| Root web icons and `ios/App/App/Assets.xcassets/` | Root favicon/touch icons and Xcode app icon/splash resources; iOS asset catalog includes four PNGs. | **ORIGIN OWNER-CONFIRMED:** owner-created or ChatGPT-generated and owner-edited; final marks/branding/third-party-element check pending. |

**Note on the numbers:** The table counts files **in each relevant Git subtree**, not unique works or unique sounds (a file may be duplicated in a native bundle or derive from another asset). Other code-generated sound effects should also be inventoried by authorship/source when relevant, even if not shipped as standalone audio files.

### Follow-up release BSB corpus/fixture audit (PR from `ios-prep` at `017205a4998a81f64a83cc551453ba454a422ce5`)

- Production `app.js` previously included an **ESV-labeled** `DEBUG_VERSE_JSON` literal, even though `DEBUG_MODE=false`. This release-prep PR updates the *unused offline-only fallback* to copy `verse_data/john_3_16.json`'s BSB verse text, echoes, hide plan and public-domain attribution. Ordinary published Bible verse JSON and child-facing gameplay are **not modified**.
- Adds `scripts/validate_release_bsb_verse_corpus.js`, wired to `.github/workflows/ios-prep-validation.yml`. It reads all **124** IDs in `verse_data/verse_list.json`, requires one matching JSON per ID (no extras), checks `verseId`, translation `BSB`, explicit Berean/public-domain attribution and nonempty `verseText`, and compares the bundled debug fixture to canonical John 3:16. **Check exact-head CI before calling the audit PASS**.
- This is a *metadata/source-integrity* audit, **not** a byte-for-byte comparison of each verse against the Berean publisher's current authorized master text. Narration recording rights and the original authorship of meanings, reflections and question wording also require separate evidence.
- The owner **chose to defer** confirmation of the Chalkboard app-embedding license. Keep that item **OPEN** and do not claim it is fully licensed merely because the [DaFont Florence S listing](https://www.dafont.com/chalkboard-3.font) says **100% Free**. No fonts changed in this PR.

## 3. Bible text and release debug fixture

### Verified evidence

- `verse_data/john_3_16.json` and `verse_data/philippians_2_8.json` declare **BSB**, include an attribution, and contain associated game/learning text. `verse_data/verse_list.json` enumerates **124** verse IDs.
- The Berean Bible publisher states that its Bible texts entered the **public domain April 30, 2023**: https://berean.bible/licensing.htm. This supports use of authorized BSB text. The separate **recorded audio** rights still require proof.
- Previously, `app.js` packaged an inactive `DEBUG_VERSE_JSON` ESV-style John 3:16 despite `DEBUG_MODE=false`. **This PR replaces only that offline fallback** with the canonical BSB John 3:16 text/attribution, echo parts and hide plan. Published verse files and ordinary gameplay remain unchanged. CI must pass before marking this cleanup complete.

### Follow-up

- [ ] Verify **all 124** listed verse JSON files declare BSB and the Berean public-domain attribution via the newly wired validator; **exact PR-head CI pending**. Separately verify a sample or all literal wordings against the authorized source if needed.
- [ ] **ESV debug fixture cleanup in this owner-reviewed PR:** changed its text to the canonical BSB John 3:16 sample while retaining debug-only behavior; CI and merge approval pending.
- [ ] Confirm ownership/permission for each original meaning/recall/reflection/application prompt (text created by owner, independently authored, or licensed from a third party).
- [x] Record owner's **Voicertool** source for generated verse/reference/chunk narration and find official commercial-use terms (see owner evidence above).
- [ ] Correlate narration MP3s with Voicertool output, confirm rights at generation dates, and retain applicable license evidence.

## 4. Third-party audio processing code

**Identified source and license:**
- `flashcards/vendor/soundtouchjs-2.1.1/SOURCE.md` identifies `@soundtouchjs/audio-worklet` **version 2.1.1**, GitHub upstream https://github.com/cutterbl/SoundTouchJS/tree/v2.1.1, plus npm tarball integrity. The vendored files are `SoundTouchNode.js`, `constants.js` and `soundtouch-processor.js`. Its source note says executable source is unchanged except final newlines.
- `flashcards/vendor/soundtouchjs-2.1.1/LICENSE` specifies **Mozilla Public License 2.0 (MPL-2.0)** and links the full text at https://www.mozilla.org/MPL/2.0/. This is materially stronger evidence than an undocumented copy.
- [ ] Before release, confirm the shipped vendor copy still matches that source/license and that notices, source availability, and any changes comply with MPL-2.0. Keep the existing source/notice files in the distribution; do not silently remove or relicense them. **No third-party code modified in this PR.**

Also check the Capacitor/npm/Swift package dependency notices separately during the dependency/privacy audit; the app's `package.json` license field by itself does **not** license all bundled third-party media/fonts.

## 5. Bundled fonts — full path list and priority review

**13 font-file paths were found** in the current asset folders:

| Paths | Family/file | Initial evidence and action |
| --- | --- | --- |
| `verse_fonts/Baloo2.ttf` | Baloo 2 | Likely Google Fonts OFL family; verify exact binary/source and obtain original copyright/notice. |
| `verse_fonts/NewsCycle-Bold.ttf` | News Cycle | Likely Google Fonts OFL family; verify exact binary/source and notice. |
| `verse_fonts/SpecialElite-Regular.ttf` | Special Elite | Likely Google Fonts OFL family; verify exact binary/source and notice. |
| `verse_fonts/TitanOne.ttf` | Titan One | Likely Google Fonts OFL family; verify exact binary/source and notice. |
| `verse_fonts/VT323-Regular.ttf` | VT323 | Likely Google Fonts OFL family; verify exact binary/source and notice. |
| `verse_games/verse_launch/verse_launch_fonts/Orbitron.ttf` | Orbitron | Likely Google Fonts OFL family; verify binary/source and notice. |
| `verse_games/verse_scramble_neo/verse_scramble_fonts/Caprasimo-Regular.ttf` | Caprasimo | Likely Google Fonts OFL family; verify binary/source and notice. |
| `verse_playground/ghost_writer/ghost_writer_fonts/Playwrite_US_Modern.woff` | Playwrite US Modern | Public Playwrite US Modern family is available under OFL, but check the exact bundled WOFF and notice. |
| `verse_playground/scripture_scrub/Chalkboard-Regular.ttf` | Chalkboard (Florence S, owner-stated source) | **SOURCE IDENTIFIED:** owner points to [DaFont's Chalkboard by Florence S](https://www.dafont.com/chalkboard-3.font), labeled **100% Free**; downloadable filename matches. Exact archive-byte comparison and explicit embedding/redistribution grant **not yet verified**. |
| `verse_playground/scripture_scrub/fonts/Chalkboard-Regular.ttf` | Same bundled Chalkboard binary | **IDENTICAL GIT CONTENT:** same blob SHA as sibling path (`709bfa185de550276126db43f4e0d49eaa0af2e6`), so one exact font file in two locations; both copies share the same unresolved license/embedding question. |
| `verse_playground/scripture_scrub/fonts/TitanOne-Regular.ttf` | Titan One | Likely OFL but exact file and notices still need checking. |
| `verse_playground/verse_typer/fonts/TitanOne-Regular.ttf` | Titan One | Likely OFL but exact file and notices still need checking. |
| `verse_playground/wheel_of_bible/wheel_of_bible_fonts/Chunk.ttf` | Chunk / ChunkFive | The League of Moveable Type publishes the Chunk family with an **Open Font License**: https://www.theleagueofmoveabletype.com/chunk. Verify bundled binary origin/variant and original notice. |

**Chalkboard source identified, permission still to confirm (2026-11-22 EST):** The owner supplies the exact [DaFont Chalkboard page](https://www.dafont.com/chalkboard-3.font). That page identifies the author as **Florence S**, marks the font **“100% Free”**, lists `Chalkboard-Regular.ttf` and first publication August 2, 2022. This is **not** the similarly named DaFont fonts credited to different authors that are designated personal-use-only. GitHub shows **identical blob SHA `709bfa185de550276126db43f4e0d49eaa0af2e6` for both Scripture Scrub copies**. The bundled TrueType name records say **“Chalkboard Regular”** / `Chalkboard-Regular`. The actual DaFont ZIP could not be independently downloaded for byte-by-byte verification, so **file name/name-record match + owner report is not a verified byte match**.

DaFont's official [FAQ](https://www.dafont.com/faq.php#copyright) explicitly says the download-page category is an indication, not the definitive license, and advises checking archive readmes or the author's terms/contact. The current listing contains **no separate embedding/redistribution license text**. Therefore **“100% Free” is promising for use but is not independently sufficient to assert the right to package/distribute the TTF inside a paid or free App Store app or expose raw TTF on GitHub**. Seek written permission from Florence S to include the file in a commercially distributed iOS app and a public GitHub source repository (or find an explicit official license/readme that covers those uses). If not possible, consider an owner-approved, suitably licensed substitute in a separate visually tested PR. **Do not remove or alter the font in this evidence-only PR.**

**Font licensing reference:** SIL's OFL FAQ explains how font copyrights and license notices should be handled when bundling a font in a mobile app: https://openfontlicense.org/ofl-faq/. Google Fonts licenses can be retrieved from the corresponding official upstream repositories once each exact binary is identified.

- [ ] Verify exact origin, designer, license and copyright notice for all 13 paths (duplicates may share evidence).
- [x] Identify **owner-provided source page and author** for Chalkboard (DaFont, **Florence S**, 100% Free listing); verify both repository copies are the same Git blob.
- [ ] **Confirm explicit commercial app-embedding and source-TTF redistribution rights**, including by author/official archive notice if available; source ZIP hash equivalence remains unverified. Resolve before App Store upload.
- [ ] Preserve/add license and copyright notices for all confirmed bundled open-source fonts, following their terms.
- [ ] If any font is not licensed for redistribution, decide on a visually suitable permitted replacement and test it on iPhone/iPad.

## 6. Owner rights sign-off (needed before Phase 1 Step 2 can be marked complete)

For each group, record one of: **created by owner**, **created for owner with transfer/license**, **AI-generated under terms permitting distribution**, **stock/third-party licensed**, **public domain/open license**, **removed or replaced**. Keep receipts/source links and any licensing conditions in the owner's private records if they contain payment or personal information. Record only safe links/summary here.

- [x] Inventory packaged artwork/audio/font paths and count source groups.
- [x] Identify the BSB public-domain **text** source and the sampled verse attribution.
- [x] Locate existing SoundTouchJS MPL-2.0 source/license records.
- [x] Identify all bundled font locations, including Chalkboard and Chunk.
- [x] Owner confirms **source/provenance** for BibloPets, profile pictures, backgrounds, interface/game/playground art, icons and branding: owner-created or ChatGPT-generated and owner-edited; no external images by owner report.
- [ ] Perform final trademark/third-party-character review; verify ChatGPT image-generation terms applicable to the assets and whether any third-party likenesses are included.
- [x] Owner identifies **Voicertool** for generated narration and a **paid ZapSplat subscription** for sound effects; official terms researched.
- [x] Owner confirms **paid subscription active when ZapSplat files were downloaded**. This is owner-reported timing evidence, not independent invoice verification.
- [ ] Confirm individual audio/music track mapping, relevant per-file license types, and whether any atypical notice applies; retain plan and download proof privately where appropriate.
- [ ] Resolve the separate public-GitHub **raw licensed sound-file** redistribution question before public release; do not treat the in-app license as a source-file sharing license. The November 23 tree recheck confirms 176 MP3 paths outside the narration folder (131 distinct Git blobs); which ones are ZapSplat remains unproven until file-by-file mapping.
- [ ] Verify all 124 verse-text translations/attributions and original learning commentary rights.
- [ ] Verify the new BSB debug fallback + full 124-file metadata check pass CI and merge the dedicated owner-reviewed cleanup PR.
- [x] Record owner-provided Chalkboard source (Florence S / DaFont) and identical SHA of the two bundled copies; neither was replaced.
- [ ] Verify all 13 font paths, including **exact Chalkboard embedding/redistribution grant**, then preserve notices and resolve any unlicensed fonts.
- [ ] Complete third-party code/dependency notices review and any needed redistribution obligations.
- [ ] Owner reviews this ledger, resolves unknowns and signs off on asset redistribution before the first App Store upload.

**Stop/go rule:** **Do not mark the broader “Run a source/asset license audit” release checklist as complete yet.** The initial inventory and owner-source declarations resolve major questions, but font, per-track audio/music, original-text, third-party/branding, source-repository redistribution and final attribution/notice checks remain unresolved. No Apple Developer Program membership or App Store distribution is needed to finish this work.
