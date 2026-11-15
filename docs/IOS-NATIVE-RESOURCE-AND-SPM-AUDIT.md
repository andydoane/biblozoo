# BibloZoo — Step 3d native audio resource and Capacitor package audit

**Scope:** [PR #116](https://github.com/andydoane/biblozoo/pull/116) review-only source + generated `dist/` checks on `integration/native-audio-to-ios-prep`, following [merged PR #115](https://github.com/andydoane/biblozoo/pull/115) at `13494adb` and its [post-merge Node/Web PASS](https://github.com/andydoane/biblozoo/actions/runs/43774921152). This is an **inventory and regression guard**, not a native runtime change or iOS signing/privacy certification.

## Verified source mapping

- `ios/App/App/BibloZooNativeSoundPlugin.swift` defines **14 fixed** game, Playground, and Daily Questions sound-ID dictionaries: **127 direct MP3 asset references**. The test enumerates every dictionary and file in its expected public subdirectory and checks the **post-build `dist/` copy** too. Any new or renamed fixed sound dictionary requires explicitly updating the audited mapping.
- The original native sound output still relies on **six** individual Xcode target resources: `ui_pet_unlock`, `dq_feed_star`, `dq_feed_chomp`, `ui_sound_pop_1`, `ui_sound_pop_2`, and `john_3_16` MP3s. The test checks source file nonemptiness, path and explicit `PBXBuildFile` plus **Copy Bundle Resources** membership for each.
- Five Verse Jam voice clips are generated from a fixed allowlist (`boom`, `hey`, `woo`, `yeah`, `yo`). Fixed Read My Verse cues, `typewriter_1..3`, `keyboard_1..7`, four Zoo onboarding narrations, five Flashcards instruction tracks and nine Learn instruction tracks are checked as shipped files and generated `dist/` files. Existing verse publication/learn-parts validators continue to cover the dynamically selected published reference/chunk recordings. Source `verse_data/verse_list.json` must also be present.
- The Xcode project has the `public` **folder reference** in Resources, which preserves `public/verse_audio`, `public/verse_games`, `public/verse_playground` etc for `Bundle.main.url(...subdirectory:)`. The build script copies those runtime directories. This is a project file/source structural check, **not proof of an actual signed-device bundle or successful AVAudioPlayer startup**.

## Capacitor version and privacy dependency boundary

| Dependency surface | Repository source evidence | Not yet independently verified |
| --- | --- | --- |
| npm `package.json` + `package-lock.json` | Resolved `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` are each `8.5.2`; package declarations allow `^8.5.2`. `npm ci` locks the installed JS versions for CI. | Actual Mac `node_modules` after owner sync |
| Local `ios/App/CapApp-SPM/Package.swift` | Capacitor-generated local package selects `ionic-team/capacitor-swift-pm` **exactly 8.5.2**, exposing Capacitor and Cordova products. Only one direct URL package is declared there. | Nested Swift package resolutions, SPM caches, linked library versions, `PrivacyInfo.xcprivacy` files within external dependencies |
| App target `ios/App/App.xcodeproj/project.pbxproj` | Includes `CapApp-SPM` product, app privacy manifest in Resources and the direct native MP3 sound files. | Apple's actual Xcode `Product > Archive` result, signed .app resources, generated Privacy Report, Apple toolchain issues |

**Do not modify `CapApp-SPM/Package.swift` manually.** Capacitor CLI manages it and `npx cap sync ios` may regenerate it. The absence of other *direct* local Swift package lines does not establish that resolved Capacitor/Cordova dependencies have no transitive privacy-relevant APIs. The [Step 3b privacy audit](IOS-PRODUCTION-PRIVACY-AUDIT.md) remains the source for declared first-party required reasons and open third-party privacy review.

## How to verify before owner installation

1. **CI source:** run `node scripts/validate_native_ios_resource_packaging.js` before a build to check source/Xcode references/locked versions; normal CI also runs the first-party privacy manifest, Flashcards, Read, Learn/game and production DEV tests.
2. **CI web bundle:** run `npm run build` then the **same** validator to confirm the `dist/` copy of every inventoried audio file and `verse_list.json`. Node CI does **not** run Xcode or Capacitor sync.
3. **Owner's Mac, later:** after review and maintaining a verified recoverable backup of original BibloZoo profiles, generate the iOS bundle with `npx cap sync ios`, then use Xcode to inspect the actual app target Resources, resolved SPM dependencies, the archive's **Privacy Report**, and each bundled required-reason manifest. Document the Xcode version, archive outcome and any privacy warnings. These steps can be done **without installing over the original phone app**.
4. **Step 4, only after approval:** install on a safe spare test phone or use an independently verified original-profile backup plan; check real bundled sound playback in Learn/Read/Flashcards/12 games/5 Playground/Daily/Feeding and real privacy and interruption behavior. A positive JavaScript/Swift bridge reply alone does not prove sound reached the speaker.

**Open:** Apple-SDK compile/signing and generated privacy report; bundled resource resolution after Capacitor sync; comprehensive accessibility, user-data backup/restore, microphone/Photos permissions, real iPhone sound and interruption acceptance. **Do not merge to `ios-prep` or deploy while these are open.**

**Next chat instruction:** verify live merge status/CI, then review `docs/PROJECT-HANDOFF.md` top roadmap and this document. Update the handoff in EVERY PR (including tests/docs-only PRs).
