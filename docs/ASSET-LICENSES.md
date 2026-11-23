# BibloZoo — Version 1.0 Asset Rights and Attribution Ledger

**Status: INITIAL INVENTORY COMPLETE; RIGHTS CLEARANCE NOT YET COMPLETE.**
**Repository baseline:** `andydoane/biblozoo`, `ios-prep` at `2675c7c106c670cf6a09d4feeb307d770f8c5e74` (2026-11-22 EST). The branch contains [merged PR #179](https://github.com/andydoane/biblozoo/pull/179) and a subsequent shared Xcode-scheme commit. This is a source inventory, **not legal advice, a license certificate, or proof of final archive contents**.

**Purpose:** Establish evidence before publicly distributing version 1.0. Do **not** infer that a tracked, publicly visible, AI-generated, free-to-download, or bundled file is automatically licensed for App Store redistribution. Do not claim rights to imagery/recordings without the creator's or licensor's evidence. Owner must approve actual file replacements or removals separately.

## 1. Inventory method and limits

- Read `scripts/build.js`: it copies the root runtime files and **all** of `flashcards/`, `pet_images/`, `profile_pictures/`, `ui_audio/`, `utilities/`, `verse_audio/`, `verse_data/`, `verse_fonts/`, `verse_games/`, `verse_images/`, and `verse_playground/` into the production `dist/` bundle. The Xcode project also bundles its own icon/splash assets. Consequently even an **inactive debug fixture or unused asset** can still be present in the distributable app.
- Inventory counts below are based on the live Git tree, per directory, including alternate/unused media. They are **not** an assertion that every image or MP3 is displayed/played. Counts may change as content changes.
- Checked sampled `verse_data/*.json` files and the 124-ID `verse_data/verse_list.json`. **Not yet verified all 124 JSON translations/attributions individually**, nor any audio-file embedded copyright metadata or image provenance. File names alone cannot prove rights.
- Checked available repository license/attribution files: `flashcards/vendor/soundtouchjs-2.1.1/LICENSE` and `SOURCE.md` exist. The media/font folders listed below had **no standalone license/credit documents in their Git trees**. Absence of a license document does **not** prove infringement; it means source evidence must be added or confirmed.

## 2. Packaged content groups: inventory versus rights evidence

| Source folder / asset family | Git inventory evidence | Current rights assessment / next proof |
| --- | --- | --- |
| `verse_data/` — verse content and family-learning prompts | 124 verse JSONs plus `verse_list.json` (124 IDs). Sampled John 3:16 and Philippians 2:8 are `"translation": "BSB"` with BSB public-domain attribution. | **Strong BSB text basis for sampled verses**, not comprehensive verification. Confirm all published JSONs use authorized text, and owner authorship or authorized rights to original explanations/reflections/questions. |
| `pet_images/` — collectible BibloPets | 126 PNG files (and one `desktop.ini`). | **OPEN:** owner/creator/AI/commercial-license source and modification/redistribution rights. |
| `profile_pictures/` — public selectable pet pictures | 126 PNG files, one JSON manifest, one `desktop.ini`. | **OPEN:** establish same provenance. These are bundled public artwork, not the protected private family photos. |
| `verse_images/` — UI, illustrations, scenes, icons, medals, themed backgrounds and some sounds | 183 PNG, 74 JPG, 3 SVG, 1 GIF, 19 MP3, one JSON. Includes `andymoji/`, `pet_backgrounds/`, `daily_questions/`, `daily_zoo_todo/`, `game_icons/`, `read_my_verse/`. | **OPEN:** establish origin/rights for illustrations/backgrounds/icons and separate audio-file provenance. |
| `verse_audio/` — reference/verse/chunk recordings | **857 MP3 files**. | **OPEN:** Bible *text* rights do not establish rights to a specific person's narration, recorded performance, synthesized voice preset, music or produced MP3. Record how these tracks were created/licensed. |
| `ui_audio/` — shared UI sounds | 3 MP3 files. | **OPEN:** identify recording/composition and redistribution permission. |
| `verse_games/` — external practice games | 131 PNG, 65 SVG, 2 JPG, **114 MP3**, plus 2 TTF font files. Includes Dino Dash, Bible Bugs, Verse Invaders, Verse Launch, Verse Scramble, etc. | **OPEN:** establish art and every sound-effect/music provenance, and check both embedded fonts separately. |
| `verse_playground/` — Playground activities | 63 PNG, 37 SVG, 19 JPG, **35 MP3**, **5 TTF + 1 WOFF** font files. Includes Ghost Writer, Scripture Scrub, Verse Typer, Wheel of Bible, Verse Jam. | **OPEN:** establish artwork/audio rights and pay special attention to the two `Chalkboard-Regular.ttf` copies. |
| `flashcards/` — badges/backgrounds, narration, third-party audio code | 15 PNG, 12 JPG, **5 MP3** and vendored SoundTouchJS runtime. | **OPEN** media rights; **identified license** for SoundTouchJS (section 4). |
| `verse_fonts/` | 5 TTF files. | **OPEN:** match each exact binary to its upstream font and license; collect notices (section 5). |
| Root web icons and `ios/App/App/Assets.xcassets/` | Root favicon/touch icons and Xcode app icon/splash resources; iOS asset catalog includes four PNGs. | **OPEN:** confirm source/rights of branding and any third-party element incorporated in final icons/splashes. |

**Note on the numbers:** The table counts files **in each relevant Git subtree**, not unique works or unique sounds (a file may be duplicated in a native bundle or derive from another asset). Other code-generated sound effects should also be inventoried by authorship/source when relevant, even if not shipped as standalone audio files.

## 3. Bible text and an inactive ESV debug fixture

### Verified evidence

- `verse_data/john_3_16.json` and `verse_data/philippians_2_8.json` declare **BSB**, include an attribution, and contain associated game/learning text. `verse_data/verse_list.json` enumerates **124** verse IDs.
- The Berean Bible publisher states that its Bible texts entered the **public domain April 30, 2023**: https://berean.bible/licensing.htm. This supports use of authorized BSB text. The separate **recorded audio** rights still require proof.
- `app.js` still contains a packaged `DEBUG_VERSE_JSON` literal with `"translation": "ESV"`, an ESV-style John 3:16 excerpt and the attribution string **“Debug mode verse data (remove before publishing).”** `DEBUG_MODE` is **false**, so this fixture is not used in the normal release flow, but `scripts/build.js` copies `app.js` into the production bundle. **Do not treat an inactive debug constant as exempt from source/rights review.**

### Follow-up

- [ ] Check **all 124** published verse JSON translations and attribution fields; resolve any deviation from the authorized BSB corpus.
- [ ] In a separate **small, owner-reviewed PR**, remove the obsolete ESV debug fixture if no longer needed, or replace it with correctly attributed public-domain BSB test text while preserving existing debug/test behavior. Record regression results. **No code is changed by this initial inventory PR.**
- [ ] Confirm ownership/permission for each original meaning/recall/reflection/application prompt (text created by owner, independently authored, or licensed from a third party).
- [ ] Confirm all recorded verse/reference/chunk narration files were made by/for the owner with redistribution rights, or document the exact audio source/license.

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
| `verse_playground/scripture_scrub/Chalkboard-Regular.ttf` | Chalkboard | **PRIORITY / OPEN:** exact font designer, binary source and whether redistribution in a commercial App Store app is authorized. |
| `verse_playground/scripture_scrub/fonts/Chalkboard-Regular.ttf` | Chalkboard duplicate path | **PRIORITY / OPEN:** do not assume it shares provenance or license without comparing binaries. |
| `verse_playground/scripture_scrub/fonts/TitanOne-Regular.ttf` | Titan One | Likely OFL but exact file and notices still need checking. |
| `verse_playground/verse_typer/fonts/TitanOne-Regular.ttf` | Titan One | Likely OFL but exact file and notices still need checking. |
| `verse_playground/wheel_of_bible/wheel_of_bible_fonts/Chunk.ttf` | Chunk / ChunkFive | The League of Moveable Type publishes the Chunk family with an **Open Font License**: https://www.theleagueofmoveabletype.com/chunk. Verify bundled binary origin/variant and original notice. |

**Why Chalkboard is singled out:** A filename is not proof of a license. Third-party catalog pages for similarly named Chalkboard font files show **conflicting personal/commercial-use claims**. Apple's system font name and a freely downloadable third-party font are not interchangeable licensing evidence. Treat both packaged `Chalkboard-Regular.ttf` files as **unresolved** until the owner can identify their original download/source and applicable rights; if needed, replace with a known permitted font in a later targeted, visually tested PR. **Do not remove them casually or change Scripture Scrub appearance in this audit.**

**Font licensing reference:** SIL's OFL FAQ explains how font copyrights and license notices should be handled when bundling a font in a mobile app: https://openfontlicense.org/ofl-faq/. Google Fonts licenses can be retrieved from the corresponding official upstream repositories once each exact binary is identified.

- [ ] Verify exact origin, designer, license and copyright notice for all 13 paths (duplicates may share evidence).
- [ ] Resolve `Chalkboard-Regular.ttf` **before App Store upload**.
- [ ] Preserve/add license and copyright notices for all confirmed bundled open-source fonts, following their terms.
- [ ] If any font is not licensed for redistribution, decide on a visually suitable permitted replacement and test it on iPhone/iPad.

## 6. Owner rights sign-off (needed before Phase 1 Step 2 can be marked complete)

For each group, record one of: **created by owner**, **created for owner with transfer/license**, **AI-generated under terms permitting distribution**, **stock/third-party licensed**, **public domain/open license**, **removed or replaced**. Keep receipts/source links and any licensing conditions in the owner's private records if they contain payment or personal information. Record only safe links/summary here.

- [x] Inventory packaged artwork/audio/font paths and count source groups.
- [x] Identify the BSB public-domain **text** source and the sampled verse attribution.
- [x] Locate existing SoundTouchJS MPL-2.0 source/license records.
- [x] Identify all bundled font locations, including Chalkboard and Chunk.
- [ ] Owner confirms source/rights for BibloPets, profile pictures, backgrounds, interface/game/playground art, icons, and app/splash branding.
- [ ] Owner confirms source/rights for all prerecorded voice, sound effects, and music, including commercial use and embedding.
- [ ] Verify all 124 verse-text translations/attributions and original learning commentary rights.
- [ ] Address the inactive ESV debug fixture in an owner-reviewed follow-up.
- [ ] Verify all 13 font paths (especially Chalkboard), then preserve notices and resolve any unlicensed fonts.
- [ ] Complete third-party code/dependency notices review and any needed redistribution obligations.
- [ ] Owner reviews this ledger, resolves unknowns and signs off on asset redistribution before the first App Store upload.

**Stop/go rule:** **Do not mark the broader “Run a source/asset license audit” release checklist as complete yet.** This PR delivers the inventory and concrete list of unresolved rights questions, not a legal clearance for every bundled asset. No Apple Developer Program membership or App Store distribution is needed to finish this work.
