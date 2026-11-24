# BibloZoo — Original Zookeeper family backup: safe, private preflight

## November 23, 2026 — proposed complete Zoo backup v3 follow-up

Family and individual v2 JSON export **do not** contain the independent per-Zookeeper Zoo Escape rescue totals/pending celebration or Zoo Surprise current-day odds keys. The two private owner-provided November 23 files confirmed the absence in both forms without disclosing their contents. A focused **unmerged, owner-review** `fix/ios-zoo-family-profile-backup-v3-20261123` PR updates both exports to **v3** with per-profile `zoo.rescueStats` and `zoo.surprise`, preserves v2 import compatibility, verifies the new per-ID records, and snapshots them for rollback. Existing v2 files remain useful for Bible/game/Flashcards/Daily progress but cannot contain Zoo values that were never exported. After owner merge, make fresh private v3 exports from the intact installed app; do not delete/reinstall or test a destructive family restore on real production profiles. Before merge these are candidate changes, not shipped guarantees.

---


**Status — corrected after owner production-ID install (2026-11-15):** Step 3g [PR #119](https://github.com/andydoane/biblozoo/pull/119) MERGED on `integration/native-audio-to-ios-prep`; post-merge CI PASS. Owner clarifies that the verified 11-profile JSON belongs to the **separate native Audio Test app** (`com.andydoane.biblozoo.audiotest`), **not** the original production-ID app. The Audio Test backup was successfully restored in disposable Mac Safari and matched sampled Audio Test progress/pets. Owner subsequently ran the **offline CLI structural checker successfully**: `FAMILY BACKUP STRUCTURE PASS`, family v2, **11 Zookeepers**, **149 verse-progress records**, **602009 bytes**. A first attempt without a file path correctly failed; a second attempt with the private local JSON path passed. The owner explicitly approved the production-ID iPhone install, and Xcode Run built, installed and launched successfully. The upgraded app still has the **10 expected original production profiles**, which owner reports work as before. Owner has now provided a fresh **10-profile production-family JSON backup** for a private read-only structural check: **Family v2, 10 unique profile IDs, progress v2, 148 verse-progress records, 589893 bytes**. Structure PASS does **not** prove restore fidelity, Zoo rescue stats or future app-sandbox safety. Keep off-phone private copies. The #118 archive's three privacy manifests declared no tracking/collection; `npm audit --omit=dev` reported 0 vulnerabilities at that time.

## Why this matters

The **existing** BibloZoo app on your original iPhone uses production ID `com.andydoane.biblozoo`; installing a new integration build under **that same ID** could update/replace its sandbox. Neither an Xcode Archive PASS nor a source revert ensures lost Zookeepers could be recovered. The Audio Test `com.andydoane.biblozoo.audiotest` is separate and cannot automatically preserve the original app's data. **The approved first in-place Xcode Run has now completed successfully. Do not uninstall/reset either app, import the separate Audio Test backup into production, or assume two app identities share profiles.**

**Verified both original stable `ios-prep` and integration `app.js` use the same family backup v2 and progress v2 formats.** The original app has **Settings > Backup & Restore > Export Family Backup**. Its export creates a JSON file with:
- `saveType: "biblozoo-family-save"`, `saveVersion: 2`, `exportedAt`
- `profiles[]`, including each Zookeeper's ID, name, verse avatar, timestamps and `progress` record
- `progress.verses` and the profile's progress metadata encoded as JSON.

**Known coverage gap:** Separate, per-Zookeeper `biblozooZooEscapeStats:v1:<id>` rescue totals/pending celebration and `biblozooZooSurprise:v2:<id>` day/odds state are stored under standalone `localStorage` keys, and **do not appear in the v2 family export**. These are real app data separate from main `progress`. A well-formed family backup alone therefore cannot guarantee every Zoo statistic survives an app replacement. Do not silently waive this; a future owner-approved scoped backup-format implementation or other safe preservation strategy may be needed. The existing app itself must stay installed.

## How to make a private copy without installing anything

1. On the original iPhone, open the **updated production BibloZoo** app showing 10 profiles (NOT the separate BibloZoo Audio Test app showing 11).
2. Choose **Settings > Backup & Restore > Export Family Backup**. Do not choose **Import Backup**, **Replace All Zookeepers**, any reset, or delete app.
3. If the iOS share sheet appears, save the **.json** backup to **Files** or transfer it to your Mac using a private method you control. If the app instead starts a download, locate and confirm the JSON file in Files. Don't assume the export succeeded just because a toast appears—verify the file exists and its size is nonzero.
4. Make **two separate private copies**, keeping at least one away from the phone in a safe backup location you control. The JSON includes children's names and game progress: **do not upload it to a public GitHub issue/PR, paste its contents into chat, or put it in this source repository**.

## Safe Mac file check (after this PR is merged)

From Terminal inside the existing BibloZoo integration worktree, type:

```bash
node scripts/validate_family_backup_file.js 
```

Type a space after the command, then **drag your saved family backup .json file from Finder into Terminal** to insert its path, and press Return. Or use `node scripts/validate_family_backup_file.js "/path/to/biblozoo-family-save.json"` with the real path. **This checker never uploads, imports, writes, modifies or prints names/IDs/progress.** It prints only family format, total Zookeeper count, total saved verse-progress records and file size; it rejects wrong file types, unsupported/future formats, missing progress and duplicate profile IDs. It does not touch your phone. An accepted file shows **JSON structure/readability only**.

## What remains before considering a production-ID installation

- [x] Owner has multiple private copies of **Audio Test's 11-profile backup**. This backup does **not** cover the separate 10-profile production app; preserve it privately and separately.
- [x] Owner exported and shared **a new 10-profile production family JSON** from updated BibloZoo; assistant's read-only structural check PASS: family v2, 10 distinct IDs, progress v2, 148 verse-progress records, 589893 bytes. **Private off-phone duplicate copies have not been independently confirmed**; owner should keep them. Do not import the 11-profile Audio Test file over production.
- [ ] Independent disposable-environment **restore test of the 10-profile production export** has not yet been performed. Not necessary for one-feature-at-a-time observation on the already installed app, but do not claim production backup recovery is fully proven.
- [x] Owner shared actual local CLI checker output: `FAMILY BACKUP STRUCTURE PASS` (read only, offline; NO IMPORT), family v2, 11 profiles, 149 verse-progress records, 602009 bytes. This validates the file's basic structure, not all data fidelity.
- [x] Owner reports **successful separate Mac Safari private-window restore of Audio Test data**: 11 Audio Test Zookeepers appeared, with sampled progress/pets matching that app. This was not a restore test of the 10-profile production app.
- [x] Owner reports successful first production-ID update; the **10 original production profiles remain present and working**. More thorough progress/pet spot checks can follow.
- [ ] Review preservation of **standalone Zoo rescue stats/odds**; original v2 backup does not include these.
- [ ] Decide remaining Apple SDK privacy/API declaration, accessibility and full phone audio/microphone/interruptions gates; the owner explicitly approves any original-ID install.

**Privacy:** Never commit family JSON to GitHub or share profile names, IDs, or personal progress in PRs. Owner has provided the production backup privately in chat for inspection, but only summary counts go into these docs. Owner reports Mac browser restore PASS for **Audio Test's 11 profiles**, not for the production app's 10 profiles; that result does not cover independent Zoo rescue-stat keys or guarantee any future in-place update will preserve local storage. The CLI checker now has an owner-reported PASS; the separately witnessed Safari restore is a distinct main-data smoke test. **The owner approved and completed the first production-ID installation; do not initiate further device installs, resets or backup imports without a clear plan and approval.**

**Developer note:** Synthetic `node scripts/validate_family_backup_file_test.js` runs in CI with **fake** profiles; `scripts/validate_family_backup_file.js` reads a user-provided path only when the owner runs it on their Mac. Every future PR must update `docs/PROJECT-HANDOFF.md` in the same PR.
