# BibloZoo — Original Zookeeper family backup: safe, private preflight

**Status (2026-11-15):** Step 3g [PR #119](https://github.com/andydoane/biblozoo/pull/119) MERGED on `integration/native-audio-to-ios-prep`; post-merge CI PASS. Owner reports multiple private copies of the original-family JSON and a **successful disposable Mac Safari private-window restore of all 11 Zookeepers**. Several restored profiles' visible verse progress and BibloPets matched the original iPhone. Owner subsequently ran the **offline CLI structural checker successfully**: `FAMILY BACKUP STRUCTURE PASS`, family v2, **11 Zookeepers**, **149 verse-progress records**, **602009 bytes**. A first attempt without a file path correctly failed; a second attempt with the private local JSON path passed. No production-ID iPhone installation has been authorized. The #118 archive's three privacy manifests declared no tracking/collection; `npm audit --omit=dev` reported 0 vulnerabilities at that time.

## Why this matters

The **existing** BibloZoo app on your original iPhone uses production ID `com.andydoane.biblozoo`; installing a new integration build under **that same ID** could update/replace its sandbox. Neither an Xcode Archive PASS nor a source revert ensures lost Zookeepers could be recovered. The Audio Test `com.andydoane.biblozoo.audiotest` is separate and cannot automatically preserve the original app's data. **Do not uninstall the original BibloZoo, choose Xcode Run on the original iPhone, import a backup into it, or reset any local data.**

**Verified both original stable `ios-prep` and integration `app.js` use the same family backup v2 and progress v2 formats.** The original app has **Settings > Backup & Restore > Export Family Backup**. Its export creates a JSON file with:
- `saveType: "biblozoo-family-save"`, `saveVersion: 2`, `exportedAt`
- `profiles[]`, including each Zookeeper's ID, name, verse avatar, timestamps and `progress` record
- `progress.verses` and the profile's progress metadata encoded as JSON.

**Known coverage gap:** Separate, per-Zookeeper `biblozooZooEscapeStats:v1:<id>` rescue totals/pending celebration and `biblozooZooSurprise:v2:<id>` day/odds state are stored under standalone `localStorage` keys, and **do not appear in the v2 family export**. These are real app data separate from main `progress`. A well-formed family backup alone therefore cannot guarantee every Zoo statistic survives an app replacement. Do not silently waive this; a future owner-approved scoped backup-format implementation or other safe preservation strategy may be needed. The existing app itself must stay installed.

## How to make a private copy without installing anything

1. On your **original iPhone**, open the **existing BibloZoo** app (NOT BibloZoo Audio Test, NOT any newly built production candidate).
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

- [x] Owner reports multiple private original-family backup copies, including a copy imported successfully on Mac. Keep at least one safe copy away from the original iPhone.
- [x] Owner shared actual local CLI checker output: `FAMILY BACKUP STRUCTURE PASS` (read only, offline; NO IMPORT), family v2, 11 profiles, 149 verse-progress records, 602009 bytes. This validates the file's basic structure, not all data fidelity.
- [x] Owner reports **successful separate Mac Safari private-window restore**: 11 Zookeepers appeared, and several sampled profiles' visible verse progress and BibloPets matched the original iPhone. This is not exhaustive data validation and did not touch or clear the original iPhone app.
- [ ] Review preservation of **standalone Zoo rescue stats/odds**; original v2 backup does not include these.
- [ ] Decide remaining Apple SDK privacy/API declaration, accessibility and full phone audio/microphone/interruptions gates; the owner explicitly approves any original-ID install.

**Privacy:** Do not upload the family JSON. Owner reports Mac browser restore PASS (11 profiles, sampled progress/pets), but that does not cover independent Zoo rescue-stat keys or guarantee preservation on an original-ID install. The CLI checker now has an owner-reported PASS; the separately witnessed Safari restore is a distinct main-data smoke test. **Explicit owner approval is still required before an iPhone production-ID installation.**

**Developer note:** Synthetic `node scripts/validate_family_backup_file_test.js` runs in CI with **fake** profiles; `scripts/validate_family_backup_file.js` reads a user-provided path only when the owner runs it on their Mac. Every future PR must update `docs/PROJECT-HANDOFF.md` in the same PR.
