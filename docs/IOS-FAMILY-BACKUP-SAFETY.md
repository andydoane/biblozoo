# BibloZoo — Original Zookeeper family backup: safe, private preflight

**Status (2026-11-15):** Step 3g [PR #119](https://github.com/andydoane/biblozoo/pull/119) review-only on `integration/native-audio-to-ios-prep`, following #118 Mac archive privacy declarations (app, Capacitor and Cordova: no declared tracking/collected data; app's two required-reason APIs) and `npm audit --omit=dev` = **0 vulnerabilities**. **The owner has NOT provided evidence of a saved, checked or independently restored original Zookeeper backup. No production-ID installation authorized.**

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

- [ ] Original app's **Export Family Backup** file actually exists and is stored in at least two safe locations.
- [ ] Local checker prints **FAMILY BACKUP STRUCTURE PASS**; number of profiles matches what you see in the original app. Record the output (NOT the backup itself).
- [ ] Independently prove a restore works **in a disposable, separate test environment** without touching or clearing the original app's Zookeepers. A schema check cannot prove restore behavior, avatars, verse mastery, pets or data fidelity; do not attempt on original iPhone. Agree on a test-device/worktree plan first.
- [ ] Review preservation of **standalone Zoo rescue stats/odds**; original v2 backup does not include these.
- [ ] Decide remaining Apple SDK privacy/API declaration, accessibility and full phone audio/microphone/interruptions gates; the owner explicitly approves any original-ID install.

**After export and local file check:** Share only whether an exported file exists, how many Zookeepers are in it, and whether Terminal said PASS/NOT VERIFIED. No JSON file needs to be provided here. A PASS does not clear the no-install gate by itself.

**Developer note:** Synthetic `node scripts/validate_family_backup_file_test.js` runs in CI with **fake** profiles; `scripts/validate_family_backup_file.js` reads a user-provided path only when the owner runs it on their Mac. Every future PR must update `docs/PROJECT-HANDOFF.md` in the same PR.
