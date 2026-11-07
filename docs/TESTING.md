# BibloZoo — Testing, PR Review, and iPhone Acceptance

> This document describes the **current `ios-prep` workflow**, verified against source on 2026-11-05. Check [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md), `package.json`, and the current scripts before claiming any test exists or passed. Automated checks and physical iPhone acceptance are different.

## 1. Working with GitHub pull requests

1. Before work, check current `ios-prep` HEAD, latest commits, open PRs and owner instructions. Local uncommitted changes are **not** visible to GitHub; have the owner push relevant work first when necessary.
2. Branch from latest `ios-prep`, **not `main`**. Make focused edits with tests and an update to [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) **in the same PR**. Update this guide/audio guide if contracts change.
3. Open a PR with **base `ios-prep`** for ordinary development, or **base `experiment/native-ios-audio`** for the isolated native-audio experiment. Draft while incomplete. Include risk, changed behavior, exact validators run, their results, and what needs the iPhone.
4. Inspect the PR diff and available Actions status on the **final commit**. If checks don't exist, don't imply they ran. A docs-only PR need not alter runtime code or bump an app version.
5. **The owner reviews and merges**; the assistant does not merge or push directly to `ios-prep` unless separately instructed.
6. In GitHub Desktop: switch to `ios-prep` → **Fetch Origin / Pull Origin**. Build, sync, run on iPhone, and report failures; address those in a focused follow-up PR.

For especially risky changes, the owner may instead check out/test the PR branch *before* merging. That is optional, but enables pre-merge iPhone acceptance.

## 2. Local setup and production build

From the repository root on macOS:

```sh
git status --short
git branch --show-current         # should be ios-prep after the merge and pull
npm ci                             # initial setup or lockfile/dependency changes
npm run build                      # scripts/build.js regenerates ignored dist/
npx cap sync ios                   # copies dist/ and syncs Capacitor project
npx cap open ios                   # then build/run App target in Xcode
```

On `ios-prep`, Capacitor config is `capacitor.config.json`, application ID `com.andydoane.biblozoo`, web directory `dist`. The isolated native-audio experiment instead uses `com.andydoane.biblozoo.audiotest` after the experimental identity PR is merged. A successful `npm run build` doesn't prove native playback or layout is correct. The native iOS bundle uses copied assets; the web/PWA separately uses `service-worker.js` caching. Check both if offline behavior changes.

Do not commit `dist/` or `node_modules/` (both ignored). After changing runtime assets, regenerate `dist/` **before** syncing; avoid interpreting stale bundled files as a code regression.

### macOS worktree: 21 CRLF-only tracked files (November 2026)

The repository already declares `*.js`, `*.css`, `*.html`, `*.json`, `*.md` and `*.txt` as `text eol=lf` in `.gitattributes`. However, the `ios-prep` base at `f4a80c35` still contained 20 JSON files and `verse_playground/ghost_writer/game.css` as CRLF *committed blobs*. A fresh macOS worktree therefore reported 21 modified files immediately. `git ls-files --eol -- <path>` showed `i/crlf w/crlf attr/text eol=lf` even though `git --no-pager diff --ignore-space-at-eol --stat 2>/dev/null` produced no meaningful diff. This is not a source-data change, and changing `core.autocrlf` or repeatedly clicking Discard does not fix the inconsistent index blobs.

The focused `fix/normalize-lf-tracked-text` PR changes only CRLF to LF and adds a Node check of the **committed blob bytes** as well as the checked-out file bytes. After the owner merges it into `ios-prep`, an existing `experiment/native-ios-audio` branch must also be advanced; **Fetch Origin by itself does not move the local branch**. For the specific freshly created experiment branch, only if there are no valuable local edits or separate commits, verify the expected line-ending-only diff, then fetch the merged baseline and run `git reset --hard origin/ios-prep` **inside the experimental worktree**, check `git status --short` and `git ls-files --eol`, and push the updated experiment branch. That reset deliberately discards *all* uncommitted tracked-file changes and resets the branch pointer: never run it if the experiment already contains independent work. Prefer a normal merge or a separate PR to sync a branch containing work.

### Isolated native-audio experiment — Mac/Xcode smoke check

The `experiment/native-ios-audio` branch has a dedicated macOS worktree (`biblozoo-native-audio`). Its **test app identity must be different from the existing installed BibloZoo app**:

| Property | Stable `ios-prep` | Native-audio experiment |
| --- | --- | --- |
| App label | BibloZoo | BibloZoo Audio Test |
| Capacitor `appId` | `com.andydoane.biblozoo` | `com.andydoane.biblozoo.audiotest` |
| Xcode Debug + Release `PRODUCT_BUNDLE_IDENTIFIER` | `com.andydoane.biblozoo` | `com.andydoane.biblozoo.audiotest` |
| Info.plist `CFBundleDisplayName` | BibloZoo | BibloZoo Audio Test |

After the experiment-specific setup PR is **merged into `experiment/native-ios-audio`**, switch to that worktree in GitHub Desktop, Fetch/Pull Origin, and in **that folder** use:

```sh
git branch --show-current            # experiment/native-ios-audio
git status --short                   # should be clean before syncing
npm ci                               # if new worktree dependencies not yet installed
node scripts/validate_native_audio_test_identity.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select the **App** target, open **Signing & Capabilities**, confirm the **Bundle Identifier** ends in `.audiotest`, select the owner's valid Apple development **Team**, and enable **Automatically manage signing** as needed. The existing project's team setting has deliberately *not* been changed in source. Select the physical iPhone as the run destination, then Build/Run and confirm **BibloZoo** and **BibloZoo Audio Test** appear as separate apps. Do **not** run/install a test build if Xcode still shows `com.andydoane.biblozoo`; that identifier could replace the existing app. Export a family backup first, and don't assume existing profiles/progress carry over to the separate bundle ID. The test icon currently shares artwork with the normal app—read the home-screen labels.

The setup PR changes **only identity**, not native playback. Check a normal verse/game and ordinary sound, plus basic foreground/background behavior before adding experimental audio code. No native app compile or on-device signing can be validated by web/Node CI.

The workflow file is extended **only on the experimental branch** to watch PRs/pushes to `experiment/native-ios-audio` and run the identity validator there, while keeping `ios-prep` compatible if the workflow is ever integrated. GitHub **did start a PR Actions run on the initial identity setup PR (#8)** even though the pre-merge experiment branch lacked the updated trigger; check the **final PR commit's actual Checks tab** rather than assuming checks are absent or have passed. After owner merge, also verify the experimental branch's post-merge push checks and subsequent PR checks. None of these Node/web jobs compiles or signs native iOS code.

### N5b.1 — native long narration DEV player: John 3:16 (PR #33; Xcode/iPhone pending)

**Latest owner acceptance:** N5a [PR #32](https://github.com/andydoane/biblozoo/pull/32) owner-merged as `a4ed899e`, and the owner followed all N5a iPhone guide steps: UI taps/pops sound as expected and Feeding popup/regression checks were positive. **Most first UI pops after launch or task switch are silent.** N5a intentionally drops an unprepared pop after 350ms rather than playing it late. That tradeoff is expected but remains N9 first-tap UX/reliability debt, not a fully reliable first-tap audio pass.

**[PR #33](https://github.com/andydoane/biblozoo/pull/33) N5b.1:** One fixed `learn-john-3-16` native AVAudioPlayer long-form narration proof, local Xcode-bundled `verse_audio/john_3_16.mp3`, explicit `purpose:"learn"` activation on DEV Play, requestId/foreground protections and `prepareNarration/playNarration/pauseNarration/seekNarration/getNarrationState/stopNarration`. Native `biblozooNarration` ended/invalidated event must be from the current player and no earlier request. No Web/HTML fallback or automatic playback. UIKit inactive, route, interruption and media reset must stop the voice. **Child-facing Learn screens are not yet migrated in this first slice**; no Learn verse/chunk/Echo progress is awarded by the DEV test.

```sh
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_learn_narration_recovery_gate.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** in Xcode on a real iPhone. In the existing **DEV · Native Audio** panel press **Play John 3:16** and *actually hear the verse*, then **Read position** twice to see advancing time, **Pause** (position stable), **Skip +5s** (without restarting), **Continue** (audio resumes), and let playback finish exactly once with its native completion message. Open the App Switcher with a swipe-up-and-**hold** mid-narration: native output must stop and never restart on foreground until a **new explicit Play**. Repeat a full switch; close DEV while voice is playing and ensure it stops and no ghost `ended` event claims Learn progress. Verify original DEV star/chomp/Melody, UI pops, Feeding all four modes still behave correctly. Ordinary Learn output is not yet switched; don't mark it native-complete. If unexpected silence, **DEV → Inspect native state / Copy Audio Timing Report BEFORE restarting** and report what was heard, whether position advanced, and if Xcode compiled. The timing report is primarily for short samples, not acoustic onset proof of narration.

**Separate checks:** final-head GitHub Actions Node regressions + web build; Xcode Swift resource compile; owner real sound/position/seek/pause/completion + interruption. Owner alone merges. Exact [N5b.1 physical test guide](N5B1-NATIVE-LEARN-NARRATION-DEV.md). Later N5b.2 integrates actual Learn Listen (reference + verse) with published-verse manifest and safe completion; chunk/Echo later.

---

### N5a — app-wide native UI pops + quiet Feeding diagnostic text (PR #32 ready for review; physical iPhone pending)

**N4 final owner evidence:** N4c [PR #31](https://github.com/andydoane/biblozoo/pull/31) was merged as `99130c01` on `experiment/native-ios-audio`. After the merger, the owner reported **all Bounce tests passed**. Earlier owner reports accepted native Classic, actual Melody, Labyrinth and N4a.1 App Switcher inactive/return audio. This is owner-reported device acceptance, not quantified speaker-latency measurements.

**[PR #32](https://github.com/andydoane/biblozoo/pull/32) N5a:** In isolated native-only `BibloZoo Audio Test`, app-wide title/menu/ordinary button tap pops now route through two fixed native IDs `ui-pop-1`/`ui-pop-2`, the existing Swift PCM effect engine and a real gesture `purpose: "ui"` activation and prewarm. No automatic playback on foreground, no Web/HTML fallback in iOS, no new AVAudioSession category, no UI sound if muted. First cold tap may finish after the 350ms ceiling and remain intentionally silent; the next tap may play once prepared. App Switcher inactive/active and blur/visibility cancel stale callbacks. Original Web/PWA/Android tap sounds are not changed. **Learn narration, pet-unlock reward, other games and mic/DSP remain outside N5a.**

The same PR hides the temporary native-only Feeding pilot badges, startup traces and detailed startup copy from visible normal iOS Feeding screens. Actual failed Got It! still preserves **Try Again/Back** and failed Let's go! retains **Try again!/Back**; child-facing status is concise while diagnostic reason remains available via the manually tapped DEV Audio Timing Report.

From the dedicated `biblozoo-native-audio` worktree on PR branch or after owner merge:

```sh
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_pcm_effects_n3a.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_app_switcher_pause_n4a1.js
node scripts/validate_native_only_ios_output.js
npm run build
npx cap sync ios
npx cap open ios
```

Xcode-build **BibloZoo Audio Test** on a physical iPhone; verify separate `.audiotest` bundle. Hear the short alternating UI pops on eligible title/menu/buttons (cold first tap may prewarm silently), then exercise rapid navigation, mute/unmute, swipe-and-**hold** App Switcher without leaving the card, full switch to another app and back: **no delayed/auto foreground sound**, next genuine tap restores pops. Retest Classic/Melody/Labyrinth/Bounce sound, unchanged scoring/serves and same-round Welcome Back/Let's go! with no pilot helper prose in normal native Feeding popups. A denied native sound must never silently fall back to Web. If silent, **DEV → Copy Audio Timing Report BEFORE restarting**, note what you actually heard; Swift scheduled/accepted is not acoustic confirmation. Full [N5a owner protocol](N5A-NATIVE-UI-TAPS.md), [handoff](PROJECT-HANDOFF.md) and [audio recovery](AUDIO-RECOVERY.md).

**Separate gates:** GitHub Actions Node regressions and web build passed on [run #42421152202](https://github.com/andydoane/biblozoo/actions/runs/42421152202) at source `241989c3`; confirm final documentation HEAD re-run. Owner Xcode Swift/resource compilation and *human-heard* iPhone UI pops + four Feeding regression/mute/App Switcher remain pending. Only owner reviews and merges. N5b Learn native verse/chunk/Echo playback comes next, under its own position/completion gate.

---

### N4c — native Bounce wall/paddle/brick cues, star bonus and catches (PR #31 merged; owner reports all tests passed)

**New owner hardware evidence:** N4b [PR #30](https://github.com/andydoane/biblozoo/pull/30) is **owner-merged** into `experiment/native-ios-audio` as `18332f90`; owner tested the N4b iPhone build and reported **“everything is working as intended.”** This is positive physical acceptance for N4b Labyrinth under the test they performed, not a detailed numerical acoustic-latency report. N4a.1 #29 was also physically accepted: swipe-up-and-hold freezes immediately with Welcome Back visible in the thumbnail and sound recovered twice. **After #31's merge, the owner reported all Bounce tests passed; this section preserves the original acceptance protocol as history.**

N4c [PR #31](https://github.com/andydoane/biblozoo/pull/31) is the **final planned N4 Feeding mode audio slice**. In native-only iOS `BibloZoo Audio Test`, Bounce now preloads the same fixed `feed-star`, `feed-chomp`, `feed-peg` assets already used for Classic/Labyrinth **after a real Got It! tap**, before starting the original ball/brick game. Wall, ceiling, paddle and ordinary-brick hit events already call `playPegTone`; they now use Swift's six-note prewarmed sine bank, still observing the original **55ms** sound cooldown and no immediate repeated pitch. Breaking a star brick plays native `feed-star` while spawning normal bonus white balls; catching colored snacks plays native `feed-chomp` and updates existing score. No modifications to 5×4 bricks, three serves, `Launch!`, seven-snack goal, paddle physics/tilt/drag, score, rewards, original Web/PWA/Android or stable `ios-prep`. No Web/HTML fallback on `.audiotest` even if native output refuses.

**Owner after reviewing/merging #31** in the dedicated `biblozoo-native-audio` worktree: Fetch/Pull `experiment/native-ios-audio`, then:

```sh
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_app_switcher_pause_n4a1.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** in Xcode on the actual iPhone. Node/production web CI cannot compile Swift or hear sound.

1. **Bounce rally:** Choose Bounce Tilt/Drag, tap Got It!, then let the white ball rebound from walls, paddle and bricks. Hear short distinct native **peg notes**, not constant beeping; gray and colored bricks break and release snacks normally. Caught colored snacks should make **chomp** and increment score; a miss should not.
2. **Star bonus and serves:** Hit a star brick; hear the native `feed-star` sound and verify original **extra white balls** appear. Score and seven colored snacks objective unchanged. If the white ball escapes, use original **Launch!** next serve; lives/brick state not reset.
3. **Exact App Switcher gesture:** During an active Bounce rally swipe up **and HOLD**, *without choosing another app*. Expect immediate freeze with **Welcome Back visible in the thumbnail**. Tap the BibloZoo card, then **Let's go!**; the **same white ball, remaining bricks/snacks, lives and score** must continue, with native audio on next collision. No automatic sound on foreground.
4. **Full task switch and cross-mode regression:** Switch fully to YouTube/Facebook and back, explicit Resume, then play Classic, Melody and Labyrinth to confirm their native sound and existing progress/controls remain normal. No Web fallback/HTML audio, mic prompt or Zoo Escape audio-error repair.
5. **If initial/returned audio fails:** Do **not** restart first. Tap DEV **Copy Audio Timing Report**, paste 80 event rows plus last 18 native gesture/preload entries and what was actually heard. Preflight `prepared` or sound `scheduled` are only software measurements.

**Verification gates:** New `scripts/validate_native_bounce_gameplay_n4c.js` tests actual JS Got It! native preflight, strict three-ID Bounce allowlist, 55ms impact/anti-repeat, star/chomp, paused silence, failed-first-tap Try Again and cross-platform isolation. All older N3a–N4b and N4a.1 regression checks and production web build must stay green. **Xcode compile, real audible Bounce rally, star/multiball, next serve and both return gestures need owner iPhone acceptance**. Detailed [N4c owner guide](N4C-NATIVE-BOUNCE-FEEDING.md); see [Audio recovery](AUDIO-RECOVERY.md) and [living handoff](PROJECT-HANDOFF.md).

---

### N4b — native Labyrinth landings/catches and same-round Resume (PR #30 merged; owner physical iPhone accepted)

**Actual owner acceptance of preceding [PR #29](https://github.com/andydoane/biblozoo/pull/29), merged `ee7cbae6`:** The iOS App Switcher **swipe-up-and-hold** issue is fixed on physical iPhone: the moment the user swipes up, the game **pauses** and **Welcome Back is already visible in its thumbnail**. The owner reports native audio **recovered as expected on both test returns**. Previous Melody live catches and Classic ordinary/full-task-switch audio were also owner accepted. This is **not** a N4b Labyrinth hearing pass. The exact gesture was never confirmed on older stable `ios-prep` and this PR leaves that branch untouched.

**N4b [PR #30](https://github.com/andydoane/biblozoo/pull/30)** adds Labyrinth as the next N4 native-only Feeding mode. The **existing** platform impact uses `playPegTone`, which now sends Classic's six prewarmed fixed `feed-peg` sine notes in Labyrinth too; both the game-level **135ms per-ball hard-impact gate** and **55ms peg-tone cooldown**, anti-repeat and volume remain. **Chomp** for caught snacks and star bonuses reuse already-native `feed-chomp`/`feed-star`. Got It! prepares exactly those three fixed native IDs, and refuses to start a known silent round on failure (Try Again/Back). Existing mode-specific Melody retains only `feed-melody`, Classic remains separate, **Bounce still unmigrated**. On App Switcher inactive or full background, the activity-owned pause and explicit Let's go! preflight keep Labyrinth score/ball positions/time, without auto-play or Web/HTML fallback. Web/PWA/Android and original stable app unchanged.

**After owner review/merge**, in the separate `biblozoo-native-audio` worktree Fetch/Pull `experiment/native-ios-audio` and:

```sh
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_app_switcher_pause_n4a1.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build `BibloZoo Audio Test` on physical iPhone (Node/production web CI cannot compile Swift or hear native output).

1. **Labyrinth first tap:** Choose Labyrinth Tilt/Drag; Got It! must prepare native tones. On **actual hard platform landings**, short pleasant peg tones should sound. Resting/sliding contacts must not chirp continuously. Catches should sound chomp; bonuses if they occur use star. Same moving platforms/gaps, ball speeds, snack/pet physics, score, reward logic, feedback and Back.
2. **iPhone App Switcher cards:** Swipe UP and HOLD mid-Labyrinth. Observe frozen balls, **Welcome Back visible in thumbnail** without selecting another app. Tap own BibloZoo card and then **Let's go!**. The **same** Labyrinth score, positions and clock should continue with native impact/chomp audio; never auto-play on return. Also verify full switch to YouTube/Facebook and Back.
3. **Classic/Melody regression:** Classic still hears pleasant pegs/star/chomp and holds scores across the switcher. Melody still hears actual caught notes and holds tune/Caught % across both gestures. Bounce still silent for intentionally-unmigrated native effects, never Web/HTML fallback.
4. **Failure diagnosis:** Failed native preflight leaves Instructions and **Try Again**, not a knowingly silent round. If the first run, landing, or return is silent, tap DEV → **Copy Audio Timing Report BEFORE restarting**; paste 80 event rows + 18 preflight outcomes, and state what the speaker actually did. `scheduled` or 1–3ms native dispatch is software evidence, not proof of audibility.

**Gates:** VM/source tests for N4b and prior N4a.1; final GitHub Node regression/production web build; **separate owner Xcode Swift compile + human-heard Labyrinth impacts/catches and App Switcher recovery**. N4c Bounce only after Labyrinth device gate. Detailed [N4b owner protocol](N4B-NATIVE-LABYRINTH-FEEDING.md), [Audio recovery](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N4a.1 — stop Feeding in the iPhone App Switcher (PR #29 merged; owner App Switcher pause and two audio recoveries passed)

**Owner's newest physical iPhone finding after owner-merged [N4a #28](https://github.com/andydoane/biblozoo/pull/28), merge `436c3c26`:** Actual Melody gameplay sound **worked as intended**, and a **full task switch into another app and back** recovered sound with the existing **Let's go!** button. Classic also worked after that full app switch. However, **swiping up and holding** to view the iOS **App Switcher cards**, **without opening another app**, seems to allow **both Classic and Melody** to continue running while native sound is stopped. Immediately tapping the *same BibloZoo card* does **not** display Welcome Back, and the continuing round is silent with no obvious recovery. This is a different gesture from the previously passing full background-switch path. Owner did **not** perform this exact gesture on stable `ios-prep`, whose JavaScript source also listens for `visibilitychange/pagehide` only; **stable physical behavior is unknown**. Do not infer a Melody-only regression or definite stable bug.

**[PR #29](https://github.com/andydoane/biblozoo/pull/29) N4a.1**, now owner-merged and iPhone-tested, is an experiment-only **inactive-vs-background lifecycle fix**. Existing Swift `UIApplication.willResignActiveNotification` already invalidates native voices when the switcher opens; now Swift also emits a fixed `biblozooAppLifecycle` state-only plugin event on inactive and resumed-active (the latter catches delayed WebKit delivery). **Native-only Classic and Melody** Feeding runtimes subscribe, call their *existing* `pauseFeedingGame` for either event, cancel current rAF, preserve original score/song/balls and show Welcome Back; no automatic reactivation. `window.blur/focus` supplement the native signal for the card case where `document.hidden=false`. A second inactivity while a Resume preflight is pending invalidates its gesture generation, so only a **new real tap** may re-prepare. The plugin callback and focus/blur handlers are removed on game exit, including delayed listener registrations. No Web/HTML fallback or audio-session policy change.

**After owner reviews/merges PR #29**, Fetch/Pull `experiment/native-ios-audio` in the **`biblozoo-native-audio`** worktree, then:

```sh
node scripts/validate_native_app_switcher_pause_n4a1.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Run **BibloZoo Audio Test** on the actual iPhone (Node CI does not compile Swift):

1. **Classic exact reproduction:** Start active gameplay. Swipe up **and HOLD** to see the App Switcher thumbnails, but do not open another app; tap **BibloZoo's own app card**. **Welcome Back / Let's go! must appear**, with balls/score frozen and native audio not automatically playing. Tap Let's go! and confirm the original round, peg beeps, star/chomp and scores continue. The app-card thumbnail may be an OS snapshot, so report if its live visuals appear to advance.
2. **Melody exact reproduction:** Catch a few notes and note tune/Caught %. Open the same cards, tap BibloZoo's own card. After **Let's go!**, the **same tune and percent**, remaining notes and audio must continue, without new reward or restart. No output by itself in the switcher or on return.
3. **Regression:** Fully switch to YouTube/Facebook and back in both modes; test quick switcher open/close and Back. A real failed native re-preparation stays paused with Try again!/Back; a successful pending preparation continues to show **Let's go!** (disabled) instead of flickering Try again!.
4. **Diagnostics:** If returning to a silent running game, if Welcome Back doesn't appear or if native retry fails, **Copy DEV Audio Timing Report before restarting**; paste timing rows, native first-tap preflight and what was actually audible. A `scheduled` row is **not** an audible-speaker verdict.

**Gates:** Dedicated `scripts/validate_native_app_switcher_pause_n4a1.js` VM/source test covers inactive with `document.hidden=false`, return without inactive delivery, duplicate idempotence, pending Resume invalidation, async listener removal and Web isolation. Final GitHub Node regressions plus production web build are separate from **Swift Xcode compile** and **owner's live app-switcher/same-round audio acceptance**. Owner test is required before broadening N4 to Labyrinth/Bounce. See [N4a.1 iPhone protocol](N4A1-IOS-APP-SWITCHER-PAUSE.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N4a — native Melody catches & same-song Resume (PR #28 merged; owner live Melody and full-switch audio recovered, App Switcher edge found)

**Verified owner gate:** N3d [PR #27](https://github.com/andydoane/biblozoo/pull/27) was **merged** as `58698938` into `experiment/native-ios-audio`. The owner physically heard DEV **Melody E4** and said the note played fine; **Classic Feeding worked as expected**. This confirms one native Melody tone and a Classic regression pass, **not** real Melody-game catch-note audio. Earlier N3c first-launch/task-switch sound and two fresh competing-YouTube-PiP starts were positive overall (one initial `feed-peg stale` preflight recovered on the next explicit prep; one clean), but the cause of that stale request remains unknown.

**[PR #28](https://github.com/andydoane/biblozoo/pull/28) N4a** routes actual `melody` Feeding mode on the **isolated native-only iOS test bundle** to the previously prewarmed six-voice, MIDI 55–83 `feed-melody` Swift bank. The activity's existing **Got It!** creates a mode-specific native pilot (only `feed-melody`, rather than Classic's star/chomp/peg IDs), requests Swift session activation, preloads the bank and starts the round **only after success**. Native failure keeps Instructions, Try Again and Back, never Web fallback. Each **caught note** invokes native MIDI output with the unchanged catch-percent/score/timeline/ball motion; missed notes stay silent. Web/PWA/Android original Melody oscillator path remains intact. After a real backgrounding, stop all native voices, freeze original `melody.pausedAt`/round; only a **human Welcome Back tap** re-prepares the bank then resumes **the same song and catch percentage**. Existing Classic, other native modes, Zoo Escape rules, microphone, profiles/rewards and .soloAmbient policy remain unchanged.

**After owner review/merge** using separate `biblozoo-native-audio` worktree: Fetch/Pull `experiment/native-ios-audio`, run:

```sh
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_melody_bank_n3d.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** in Xcode on a physical iPhone. GitHub Node/production build cannot compile Swift or establish audibility.

1. Open Daily To-Do Preview → Feeding → **Melody**; select a tune and Tilt/Drag, tap **Got It!**. Confirm audible **different short pitches on actual catches** (not merely DEV E4), normal score **Caught %**, ball visuals, pet animation and correct missed-note silence. Try at least two tunes including high/low notes. The existing Melody tune/timeline/rewards code should be untouched.
2. **Mid-song app switch:** After a few catches, note song/percentage, open YouTube/Facebook/video, return. No notes or score should automatically resume; Welcome Back remains until tapping **Let's go!**. One explicit tap must re-preload only `feed-melody` and resume **same tune, next note, percentage, timer**, with audible sounds. Back must exit safely; retry on a real native refusal must keep the frozen round.
3. **First-launch/blocked audio:** On a cold launch or denied native prep, don't restart immediately. Instructions must display **Try Again** and a safe reason, not begin a known silent round. Tap DEV **Copy Audio Timing Report** and paste the 80-row event ring **plus 18 preflight outcomes**: `preload | feed-melody` and `feed-melody | scheduled | … | avengine-melody`. Distinguish human-heard output from software `scheduleBuffer`. Then deliberately retry. If playback was accepted but silent, say so.
4. **Classic/other mode regression:** Play Classic with pegged sine beeps, audible star/chomp, smooth animation and app-switch Resume. DEV **Melody E4** still works; Classic shouldn't preload Melody. Web/PWA/Android's original Melody remains identical. Labyrinth/Bounce native tones remain unmigrated; no native Web/HTML fallback, mic prompt, profile/reward changes or surprise Zoo minigame on audio error.

**Separate acceptance gates:** Node source/VM and web build, Xcode Swift compile, and *owner hearing notes during actual Melody gameplay with same-song Resume* are distinct. N4a only migrates Melody within Feeding; later N4 PRs must handle Bounce/Labyrinth. Full owner checklist [N4a native Melody gameplay](N4A-NATIVE-MELODY-GAMEPLAY.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N3d — DEV native Melody single-note bank, before N4 gameplay wiring (PR #27 merged; DEV E4 audible, Classic passed)

**N3c [PR #26](https://github.com/andydoane/biblozoo/pull/26) merged** as `3ef3961e`. After merging, the owner reported a fresh-start Native Classic run with **actual sound working and successful mid-round task-switch Resume**; first gesture session `os-accepted`, star/chomp/peg preflights `prepared`, 80 retained gameplay rows all native `scheduled` within 0–2ms, no slow dispatch. **Two additional fresh-start trials with a YouTube video already in Picture-in-Picture (foreground epoch 0)**: first `gesture os-accepted`, star/chomp prepared, `feed-peg stale`; the owner had an initial snafu but successfully re-prepared with `gesture not-needed` and a now `prepared` peg, then heard normal sound. Second PiP trial had `os-accepted` and three successful preloads on the **first attempt** (star 109ms, chomp 42ms, peg 81ms), with no snafu. Both 80-row PiP reports show **0 slow native dispatches** (mostly 1–2ms, up to 3ms), no pending interruption. **`stale` identifies an obsolete preparation request; cause unknown.** PiP is background competing audio, not an app-switch/Resume test. No reports from a newer complete-silence event. This provides positive N3c listening evidence, not an exhaustive repeated first-build reliability gate.

**[PR #27](https://github.com/andydoane/biblozoo/pull/27) N3d** follows the N3 native tone/voice roadmap before N4 Feeding integration. Existing `daily_questions_feed_game.js` Melody gameplay still uses a **browser triangle oscillator** (silent under the experimental iOS global Web output guard), and its schedule, catch percent, clock and interruptions are NOT part of this slice. N3d adds a fixed `feed-melody` Swift triangle-wave **55–83 MIDI bank** (29 prebuilt 220ms PCM notes), **six** prestarted `AVAudioPlayerNode` voices, a validated 55…83 MIDI integer in native `play`, local `backend=avengine-melody`, and one new DEV-panel **Melody E4** button (fixed MIDI 64/volume 0.25). Only a deliberate DEV tap activates/prewarms/plays; no song, auto-play, microphone change, Web fallback or actual Melody-mode routing. Web/PWA/Android unaffected. Classic's existing native star/chomp/peg, N3c startup gate/Copy report, .soloAmbient/interruption/route teardown must not regress.

**After owner review/merge**, use the dedicated `biblozoo-native-audio` GitHub Desktop worktree to Fetch/Pull `experiment/native-ios-audio` and run:

```sh
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_melody_bank_n3d.js
node scripts/validate_native_peg_voices_n3b.js
node scripts/validate_native_first_launch_n3c.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run separate **BibloZoo Audio Test** on a **physical iPhone**; GitHub Node/production web CI **does not compile Swift or prove speaker sound**.

1. On **first launch after build**, in DEV tap **Melody E4**. Hear exactly one short musical pitched note (rather than any full tune), note loudness vs Classic pegs and sample star/chomp. Confirm DEV says native request—not falsely “heard.” If refused/silent, **copy DEV Audio Timing Report before restarting**, and report `gesture/session`, `preload/feed-melody` and any `feed-melody/avengine-melody` row plus actual audibility.
2. Repeat DEV Melody E4 taps to check no stuck/crackling sound; switch out to another app/video and tap again upon return. Only the human tap may reactivate/preload; no automatic foreground sound. Close DEV and verify all prepared notes stop.
3. Start normal **Native Classic** and confirm star/chomp immediately audible, peg beeps pleasant, game movement smooth, genuine task-switch same-round Resume and correct **Try Again** on any initial native-prep failure. Existing N3c last-18 preflight events and manual Copy report remain intact.
4. **Melody gameplay not yet migrated**: In isolated iOS it's expected to remain silent due to the native-only output policy; its catch score, tune selection, timers, result overlays/Back must be unchanged. Actual Melody native playback and proper Got It!/Resume timeline ownership are **future N4**, not achieved by this test.

Pass means owner really hears DEV E4 and sees no Classic/lifecycle regression. Keep successful software `scheduleBuffer` distinct from sound reaching ears. Technical/physical guide: [N3d native Melody note bank](N3D-NATIVE-MELODY-NOTE-BANK.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N3c — first launch after build must not silently fail (PR #26 merged; owner initial startup + PiP testing positive, one stale peg preflight)

**Owner evidence after merged N3b [PR #25](https://github.com/andydoane/biblozoo/pull/25) at `29b424fa`:** Directly after Xcode build the *first* real iPhone launch was **completely silent** (no first-run report was copied). After restarting the app, two separate runs played **all** native sounds and the Classic peg beep was pleasant; both switched apps and both recovered successfully. The owner pasted **two 80-row reports (160 retained events)**: **0** slow dispatches >=120ms, almost all 1–2ms (0–3ms overall) from collision to native `scheduleBuffer` dispatch, zero worker wait, peg `avengine-tone` and chomp `avengine-pcm`. This confirms the audio engine and Resume are working *in those two runs*, not that the first-launch problem is fixed, and no report captured the failure mechanism. Actual acoustic onset is still not directly measured.

**[PR #26](https://github.com/andydoane/biblozoo/pull/26)** is a focused N3c reliability/diagnostics PR, not Melody/N4 migration. In Swift, the first actual **Got It!/Resume/DEV tap** now explicitly attempts bounded `AVAudioSession.setActive(true)` even if no prior interruption happened; subsequent healthy taps remain `not-needed`. This respects .soloAmbient, foreground/genuine interruption, activation cooldown/attempt caps and user-gesture-only policy. It is a plausible first-launch readiness change, **not proven root cause**. If native star/chomp/peg preparation reports failure, Native-only Classic **stays at the Instructions/Got It! gate** with a sanitized reason and enabled **Try Again** and Back, rather than beginning a round knowingly silent. No automatic recovery, Web/HTML fallback, new mic or silent session category behavior.

**The existing DEV → Copy Audio Timing Report** now includes last **18** native gesture and fixed-ID sample/peg preflight outcomes after the 80-event sound ring. The new preflight section shows `gesture/session os-accepted/not-needed/denied`, `preload/feed-star,feed-chomp,feed-peg prepared/failure`, `prepareMs`, foreground epoch, interruption pending and active app state. It is in memory only and copied manually; a **force quit/restart erases the diagnostic evidence**. A prepared/accepted backend does not prove the speaker actually made a sound.

**Owner after review/merge:** Fetch/Pull `experiment/native-ios-audio` in the dedicated `biblozoo-native-audio` worktree; from repo root:

```sh
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_first_launch_n3c.js
node scripts/validate_native_peg_voices_n3b.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) in Xcode and run on a physical iPhone, keeping original BibloZoo installed.

1. **First launch after the fresh Xcode build:** open Native Classic, press Got It! once. Confirm *actual audible* star/chomp/peg, smooth ball motion and correct normal game start. Ideally report shows `gesture | session | os-accepted`, three successful preloads. If game stays in Instructions with **Try Again**, that is an intentional preflight refusal, not a passed audio test.
2. **If completely silent or refused on first launch, do NOT restart the app yet.** While still in the failure state, tap **DEV → Copy Audio Timing Report** and paste here. State clearly whether gameplay had already started silently or the new gate prevented starting. Record the visible native reason. Only afterward optionally wait 4+ seconds (native OS activation retry cooldown), tap **Try Again** once, and report if that attempt restores real sounds. If initial preflight was accepted but speaker output was silent, the cause lies beyond the observed session/prepare success and must be investigated with more device evidence.
3. With successful sound, play multiple peg/star/chomp events. Ensure pegs are still pleasant, effects remain reliably close to collisions, the worker never blocks the game, and the 80-event timing logger/Copy button works. Native-only app must remain Web/HTML silent for unmigrated content.
4. **Task-switch and Resume:** while active, switch to another app/video, return, tap **Let's go!**, confirm same round/score/timer, audible sound and Back, with no misleading “Try again!” while *preparing*. A genuine refusal must keep the round paused and allow a deliberate retry instead of auto-resume. No recording, pet/reward or privacy regression.

**Separate evidence gates:** GitHub Node/VM regressions and web build ≠ Xcode Swift compilation ≠ software `scheduled` ≠ human-audible output. First-launch audible output still needs the owner's real test. See [N3c technical guide](N3C-FIRST-LAUNCH-AUDIO.md), [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md), and [living handoff](PROJECT-HANDOFF.md).

---

### N3b — Native Classic peg notes, bounded overlap and Resume label (PR #25 merged; owner peg/Resume tests passed but first launch silent once)

**Confirmed owner N3a iPhone success after merged [PR #24](https://github.com/andydoane/biblozoo/pull/24):** In a manually copied timing report after task switching, there were **19 total native events** (including DEV samples) and **13 actual Feeding game star/chomp events** (2 stars, 11 chomps). All 13 used `avengine-pcm`, returned `scheduled`, took **1–5ms** collision→native dispatch with **0ms native worker queue wait**, and none took >=120ms. Owner said chomp audible timing no longer seemed delayed (or far less delayed), with smooth gameplay. DEV `pilot-unlock` remained native AVAudioPlayer, taking **873ms** for its first call and **31ms** later. **Actual Resume positive observation:** owner switched away to watch a Facebook video, returned, pressed the Feeding action (referred to as Got It!), saw a **brief “Try again!” label flicker**, but the **same game continued and native sounds worked**. Foreground epoch=1 and pending=false at report-copy time. This is strong real-device improvement, not proof of exact speaker onset or multi-cycle reliability.

**[PR #25](https://github.com/andydoane/biblozoo/pull/25), branch `experiment/n3b-native-peg-voices-resume-label`:** Native-only Classic Feeding now preloads an additional generated `feed-peg` resource **only** via an explicit Got It!/Resume gesture. Swift prepares six fixed pitched 105ms sine PCM buffers (the original Web Classic frequencies) and a bounded four-voice tone pool in the existing warmed AVAudioEngine. Star/chomp have **two** prestarted nodes each, so closely spaced sounds may overlap without unlimited playback. Real Classic peg collisions use a native sound ID plus integer note index 0–5, preserving the original **55ms cooldown** and immediate-repeat avoidance. No raw arbitrary frequencies, Web oscillator/HTML playback or new native input. Other native Feeding modes keep their intentionally unmigrated sounds silent. Lifecycle interruption/route/background stop all voices, no automatic replay.

The **Resume label** should keep **“Let's go!”** while `feedResumePending=true` and status says “Preparing native sounds…”, rather than briefly labeling busy preparation “Try again!”. On real failed native preflight, keep the frozen round visible and offer “Try again!” + Back. Existing Web/Zoo Escape label semantics stay unchanged.

**After owner review/merge** in the separate `biblozoo-native-audio` GitHub Desktop worktree, Fetch/Pull `experiment/native-ios-audio`; from repo root run:

```sh
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_audio_timing_n22.js
node scripts/validate_native_pcm_effects_n3a.js
node scripts/validate_native_peg_voices_n3b.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a physical iPhone, leaving original BibloZoo installed; **Linux CI does not compile Swift or hear speaker output**.

1. Start Native-only Classic and listen to normal peg collision beeps **alongside** star and chomp. The six short musical notes should be subtle, audible and not annoyingly loud; note whether they seem too quiet/loud, popping, stuck or missing. Try a ball hitting pegs quickly and two close stars/chomps to assess bounded overlap. The original Web app should retain its old oscillator pegs; no Web audio is permitted in `.audiotest`.
2. Confirm animation remains smooth and **star/chomp near-contact timing is still excellent**. The new overlap pool must not regress the 1–5ms N3a dispatch behavior or repeat more sounds after leaving.
3. Task-switch mid-Classic, return, tap Welcome Back/**Let's go!**. The button stays “Let's go!” while preparing, and a successful attempt continues **the same round, score, pet, timers and sound** without flickering “Try again!”. Back remains usable. If iOS refuses, the overlay should instead offer an actionable “Try again!” and reason, **not** silently resume or invoke Web Audio.
4. After playing tap DEV **Copy Audio Timing Report** and paste its text here if possible. Expect `feed-peg | scheduled | ... | avengine-tone` rows, alongside `feed-star` and `feed-chomp` rows marked `avengine-pcm`. A fast `scheduleBuffer` return **does not prove human-heard audio**; explain what you actually heard.
5. Confirm no unprompted recording, profile changes, duplicate rewards or output after backgrounding; peg beep migration is for **Classic only**, not Melody, Labyrinth, Bounce or all game audio yet.

**Acceptance remains owner-gated:** Xcode build, audio heard, pleasant bounded notes, reliable smooth star/chomp, task-switch Resume label + real error, and privacy/session safety. On failure supply the first Xcode compiler error or copied native diagnostic; do **not** restore Web fallback. More details: [N3b native peg/voice guide](N3B-NATIVE-PEG-VOICES.md) and [living handoff](PROJECT-HANDOFF.md).

---

### N3a — Native PCM-buffer effects instead of slow AVAudioPlayer.play() (PR #24 merged; owner confirms fast audible PCM + working Resume)

**Based on merged [N2.2 PR #23](https://github.com/andydoane/biblozoo/pull/23)** at `1941fb8`. The owner sent **two actual iPhone timing reports**: no-task-switch report 6 slow events of 14; task-switched report 7 of 13, **13 of 27** with `collision->native dispatch >=120ms`. **Twelve** slow events spent approximately **392–744ms in `AVAudioPlayer.play()`**; one other queued sound waited **457ms** behind a prior 459ms star effect. Physics collision→JS request and JS→native bridge were about **0–3ms**. Sounds were heard, and **gameplay remained smooth**, but some chomp acoustic onsets were late. This is a measured native method bottleneck, *not* proof of the acoustic onset instant or the internal reason AVAudioPlayer stalls. Task switching is not needed for delays. The owner **has not explicitly confirmed same-round Resume works after N2.1**, so this remains a test.

**[PR #24](https://github.com/andydoane/biblozoo/pull/24), branch `experiment/n3-predecoded-native-feeding-effects`, target `experiment/native-ios-audio`**, decodes `feed-star` and `feed-chomp` in Swift **during the explicit Got It!/Resume or DEV preload** using `AVAudioFile` → bounded `AVAudioPCMBuffer`, connects `AVAudioPlayerNode`s to one `AVAudioEngine`, starts the engine and warms the nodes (with no scheduled audible samples) **before** the round. On collisions, `scheduleBuffer(..., options:[.interrupts])` schedules the predecoded PCM; no per-event `AVAudioPlayer.play()`, MP3 decode or engine start. DEV pet-unlock **stays a native AVAudioPlayer reference**; Native-only/HTML Web sound isolation stays unchanged. Lifecycle/route/media reset invalidates the worker generation and tears down the engine; *only a new explicit gesture* may warm it again. No extra JS bridge per collision, new microphone permission, category or background entitlement change. One node per effect; future N3 voice pools and native peg beeps are **not** implemented here.

**After owner review/merge**, use dedicated `biblozoo-native-audio` GitHub Desktop worktree, Fetch/Pull `experiment/native-ios-audio`. From repo root:

```sh
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_audio_timing_n22.js
node scripts/validate_native_pcm_effects_n3a.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

In Xcode build/run **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a **physical iPhone**, keeping original BibloZoo installed unchanged.

1. **Xcode compile is a separate gate**: the Linux CI source tests and web build cannot compile the AVFAudio Swift APIs. If compile fails, provide the *first Xcode error*, before any sound test.
2. **DEV**: play star, chomp and pet-unlock. Really listen. For star/chomp, DEV Inspect should indicate `backend=avengine-pcm`; pet-unlock remains `avfoundation-player`. No Web/HTML fallback. Any `pcm-decode-or-engine-start-failed`, `pcm-not-preloaded`, `effect-too-large-or-empty` or other new error is a **failure**, not a reason to resume the Web engine.
3. **Classic Feeding**: Daily To-Do Preview → Feeding Game Tester → Classic → Got It!. Play 1–2 minutes, including close-together star/chomp events; check every audible effect happens near pet/star contact, visual ball motion remains smooth, and repeated effects are not truncated unexpectedly. Native peg beeps intentionally remain silent until later N3.
4. **Copy a report** afterward using DEV **Copy Audio Timing Report** and paste it here. Compare rows labeled `avengine-pcm` to the old reports' 400–750ms `AVAudioPlayer.play()` stalls. `worker call` now measures `scheduleBuffer()` for effects; it **does not measure actual speaker onset**. Optional mark-last-chomp-late remains.
5. **Task-switch and Resume**: switch to another app mid-Classic and return; tap Welcome Back/Resume. Check same score/round resumes, Back works, no automatic/repeated sounds, no duplicate rewards, no interrupted recordings. This gate was not separately accepted after N2.1. Also test route change/silent switch if convenient and check output does not play spontaneously on foreground.

**Pass boundary:** Successful Xcode compile + all native effects audibly work + no visible hitch + tolerably consistent perceived onset + successful explicit same-round Resume. A native `scheduleBuffer` accepted response by itself is **not enough**. Failures need captured DEV status and timing or exact Xcode error, not a Web fallback. Full technical schema and rollback criteria: [N3a PCM effects guide](N3-NATIVE-PCM-EFFECTS.md); [living handoff §§9–10](PROJECT-HANDOFF.md).

---

### N2.2 — collect a native timing report after playing (PR #23 merged; owner reports analyzed)

**Historical test plan after merged [PR #22](https://github.com/andydoane/biblozoo/pull/22) at `07e91e3`, before N2.2 logs:** every star/chomp MP3 **audibly played** in Classic Feeding, and the previous per-sound **visual hitch is gone**. **Open problem:** some chomp sounds start near the pet/snack collision while others sound significantly late. No reliable timestamp/log was supplied; taking screenshots while playing is not reasonable. **Task-switch/Resume after PR #22 was not explicitly reported**, so it remains a required check, not a passed gate. No native peg beeps yet (N3), no Web/HTML fallback.

[PR #23](https://github.com/andydoane/biblozoo/pull/23), branch `experiment/n2-2-native-audio-timing-report`, implements **one-tap native clipboard reporting**, not a new low-latency sound engine. The fixed-schema Swift timing ring keeps only the latest **80** native MP3 playback events in memory; JavaScript sends an event ID plus physics collision and request timestamps on the *existing* native `play()` call. Swift records bridge arrival, serial queue wait and `AVAudioPlayer.play()` return time, and formats a plaintext report. The floating DEV panel's **Copy Audio Timing Report** invokes native Swift `copyTimingReport` and writes the report to `UIPasteboard.general.string`. No automatic network upload, file write, Zookeeper name, verse text, pet data or microphone recording. **Mark last chomp late (optional)** flags only the most recent chomp from the previous 60 seconds; if later sounds happened, it may not tag the sound noticed. Report rows use `-1` for unavailable/skewed wall clock; `AVAudioPlayer.play()` returned **is not equivalent to actual speaker output**. See [N2.2 timing report details](N2-2-NATIVE-AUDIO-TIMING.md).

**After owner review/merge:** in dedicated `biblozoo-native-audio` GitHub Desktop worktree, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
git branch --show-current          # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_audio_timing_n22.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run the **separate BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a physical iPhone, not original/stable BibloZoo.

1. Open Daily To-Do Preview → Feeding Game Tester → **Classic**, tap **Got It!** and play normally for **1–2 minutes**. Enjoy the game; **no screenshot, debugger, or report controls during collisions needed**. Observe whether every chomp still plays and animation remains smooth, even when chomp seems late. Peg collision beeps remain intentionally silent.
2. Optional: after a late-sounding chomp, tap floating DEV → **Mark last chomp late (optional)** *within 60 seconds* if convenient. It flags the last chomp, so if several newer sounds occurred just skip marking; simply copying the report is enough.
3. When finished, tap floating DEV → **Copy Audio Timing Report** once. It should say **Copied N sounds! Paste into ChatGPT when ready.** This uses native iOS pasteboard to avoid losing WebKit's trusted clipboard gesture after asynchronous bridge reads. Paste into the chat with a sentence about how often you heard the delays. **No data is shared automatically**. As with any clipboard, only paste the report where you want it shared. If count is zero, confirm that the native-only test app played effects in the same app process; a force-quit/relaunch clears the ring.
4. Separately, **task-switch away and back mid-Classic**, use the Welcome Back/Resume control, verify the same score/round continues, Back works, and there are no double rewards or automatic sound replays. This acceptance check was still unconfirmed following PR #22.
5. If any native sound stops being audible or gameplay hitches again, report exactly what happened. The new timing feature must **not** affect the fixed output-only policy, mic permissions or user data.

**Report interpretation (for a future assistant/chat):** The report tracks each `feed-N` event's `collision->JS`, `JS->bridge`, `bridge->worker`, `worker play()`, `collision->native dispatch`. `>=120 ms` is an investigative threshold, not acoustic proof. JS Date.now and Swift Date are shared device wall time but may skew; queue/play call durations are monotonic. These logs cannot detect the exact moment of a sound reaching the speaker. **Separate CI static/VM passes, Xcode Swift compile, native request acceptance, actual child-heard audio, animation smoothness and Resume.** After owner test record precise outcome and whether we should address JS/Capacitor/worker/engine latency next. Do not infer automatic native audio success from the copied log.

---

### N2.1 — Native-only Classic Resume and MP3 playback hitch (PR #22 merged; historical test plan)

**Historical owner evidence after merged [N2 PR #21](https://github.com/andydoane/biblozoo/pull/21), before the N2.1 fix:** The DEV panel **actually played all three native samples**. Classic Feeding played **audible native star/chomp MP3 effects**; its Web oscillator **peg beeps were intentionally silent** (native beeps are N3, not a regression). But **each native sound caused about a second of visible game pause**, and after task-switching out/back the Welcome Back action did **nothing**, while Back still exited. This is a **partial N2 audio success and a FAILED smoothness/Resume gate**, not a fully working game. Owner did not supply exact Inspect values; do not invent a native decode timing or claim the hitch's cause is proven.

**[PR #22](https://github.com/andydoane/biblozoo/pull/22), feature branch `experiment/n2-1-feeding-resume-playback-hitch`** corrects the observed source-level button routing: `daily_questions_feed_game.js` created a dormant Zoo Escape controller, which had already attached its own Welcome Back action listener, so Feeding's old `if (!runtime.zooEscape)` condition wrongly omitted the Native-only Resume listener. Feeding now **always registers** its handler, but if the live backend is Web and Zoo Escape owns the button, the Feeding handler exits without interference. The Native-only click calls `attemptFeedingResumeFromGesture` to perform the bounded native session gate + fresh two-sample preload; it never uses a Web clock. The frozen round should unfreeze on successful native prep or stay retryable with Back on a real native failure.

The Swift plugin also moves `AVAudioPlayer(contentsOf:)`, `prepareToPlay()`, `play()` and `stop()` to a **single serial background playback queue**, keeping player access off the UI thread. It avoids calling `sound.stop()` before rewinding a rapid repeat (which could discard preparation). A lock-protected epoch invalidates stale queued player commands on background, interruption, media reset or route change; no automatic resume or false native audio success. The DEV Inspect panel now adds `lastSound`, `prepMs`, `queueMs`, `playMs`. These are local timings: **prepMs** = native MP3 setup duration; **queueMs** = wait before the worker processed a sound; **playMs** = time spent inside the native `play()` call. They are **not** a direct measurement of animation frame drops or whether sound was heard. N3 will add native peg tones and overlapping sample voices; they are **not** in this PR.

**After owner review/merge**, in GitHub Desktop use the dedicated `biblozoo-native-audio` worktree, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
git branch --show-current                   # experiment/native-ios-audio
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_feeding_resume_n21.js
node scripts/validate_native_sound_smoke_test.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build and run **BibloZoo Audio Test** (bundle ID `com.andydoane.biblozoo.audiotest`) on a **physical iPhone**; do not overwrite the stable installed BibloZoo. The target is *normal, responsive gameplay*, not only native sound accepted.

1. **DEV baseline:** Play native star and chomp; both should still be **heard**. Tap **Inspect native state** and copy, if possible, the simple `lastSound=...`, `prepMs=...`, `queueMs=...`, `playMs=...` values. `pending`/interruption trace remain read-only; no special need to interpret all fields.
2. **Repeated Classic sounds:** Daily To-Do Preview → Feeding Game Tester → Classic → Got It!/Drag. Trigger several separate stars/chomps, including repeats close together. Confirm native MP3s are **heard**, whether motion **still pauses ~1 second** on each hit, and whether dragging/ball animation stays responsive. **Peg beeps remain silent by design.** If hitch persists, copy DEV timing values *immediately afterwards*; note whether `playMs` or `queueMs` are large, or instead both remain small (then investigate game/JS animation).
3. **Task-switch / Resume:** With a running Classic round, switch to another app, return, then press the visible Welcome Back **Let's go!/Resume** control. It should respond, reprepare native sounds on the gesture, dismiss the overlay and continue **the same score, ball state and timers**. Back must still exit. Test a second switch if possible. No surprise Zoo Escape, no automatic replay, and no hidden Web audio.
4. **Rejected native state:** If iOS reports `interruption-pending`, `activation-cooldown`, or a player error, the game should remain paused with an explicit retry and usable Back, not silently claim success or award points. Save the status/trace; a real interruption must not be cleared by a fake Web recovery.
5. **Protect stable behavior:** Menus, pets/progress/rewards, exit and recording permissions remain unchanged. Check no duplicate rewards after resume, no delayed sound after hiding, no Web UI sound or unintended microphone startup.

**Evidence labels:** source/static+VM and GitHub Actions passing != Xcode Swift compile != human-audible native effects != smooth animation or functional Resume. Log each separately in the [living handoff](PROJECT-HANDOFF.md) after the owner's test. Do not proceed to N3 native tones until the hitch and Resume have been characterized or corrected.

---

### N2 — native-only AVAudioSession lifecycle / explicit gesture gate (PR #21 merged; historical test plan)

**[PR #21](https://github.com/andydoane/biblozoo/pull/21) was merged as `53377d2e`.** The owner confirmed DEV native samples and Classic star/chomp MP3s were **audible on iPhone**. The original interruption origin has not been proven by a fresh trace. The owner additionally reported a ~1-second gameplay hitch on every MP3 and an inert Welcome Back Resume (Back worked); see the N2.1 section above for the corrective PR and device checks. Read [N2 native session state design](N2-NATIVE-SESSION-LIFECYCLE.md) and [living handoff §10](PROJECT-HANDOFF.md) before merging.

**What N2 changes:** `BibloZooNativeSoundPlugin.swift` is now the authoritative **native-only output-session decision point**. A new `activateFromGesture({purpose:"dev"|"feeding"})` bridge call happens on the real Play/Got It!/Resume tap *before* native sample preload. If there is no pending session event, it returns `not-needed` without activating. An unresolved genuine `.began` cannot be cleared by a foreground observation or elapsed timeout; after a **completed inactive/background → active return** a new tap can request one bounded `AVAudioSession.setActive(true)` retry (max two attempts per foreground and four seconds apart). The OS can accept or reject; accepting does **not** prove human audible sound. Suspended-history `.began` is counted but not treated as a fresh interruption. `.ended` clears pending; route/media reset disposes old players without auto-replay. `.soloAmbient` and microphone category are unchanged. The old Web-clock recovery bridge is disabled **only in `.audiotest`**, without replacing sound with HTML/Web fallback.

The DEV **Inspect native state** now displays `foregroundEpoch`, reset/activation counters and an in-memory, bounded `trace=#seq:event@elapsedMs` tail. This is read-only and contains no profile, verse, or microphone content. Event chronology is diagnostic evidence, not speaker audibility.

After *your review and merge* of PR #21, in the separate `biblozoo-native-audio` GitHub Desktop worktree Fetch/Pull `experiment/native-ios-audio`, then run:

```sh
git branch --show-current       # experiment/native-ios-audio
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_only_ios_output.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

In Xcode confirm the **BibloZoo Audio Test** target's bundle identifier ends with `.audiotest` before running on a **physical iPhone**; the original installed BibloZoo must remain separate.

1. **Fresh foreground / baseline:** force quit the test app, relaunch it, and *before pressing any DEV Play button* tap **Inspect native state**. Note `app=`, `pending=`, `last=`, `began/ended/suspended`, `foregroundEpoch=` and the event tail. No sound or session activation should occur on Inspect.
2. **Native DEV audibility:** tap **Play star**, **Play chomp**, optionally pet-unlock, and **actually listen**. On success, status says native playback *requested*, not proved. Inspect again. Copy event tail and `activation=`. If it says `interruption-pending`, do not conclude the plugin broke or use a Web fallback. **If still pending without any departure from foreground, another tap must remain deferred**.
3. **Native-only Feeding:** Daily To-Do Preview → Feeding Game Tester → Classic → Drag → **Got It!**. There is no Web checkbox. Peg beeps are intentionally silent. Listen for actual star/chomp on game events; otherwise record `Native ONLY unavailable (reason); sounds SILENT` and DEV trace. Confirm scoring/Back still works, with no audio-failure Zoo Escape launched.
4. **Return/explicit retry:** while Classic is active, switch to a different app and return. The round should remain frozen with **Resume** or Back, and no sounds should automatically replay. Tap Resume: the Swift native session gate runs, then fresh star/chomp preload. If the prior interruption stayed pending, a user tap **after** the completed foreground return can ask the OS to reactivate; note `activation-os-accepted` vs `activation-os-rejected`, cooldown or limit and whether actual sounds are heard. Don't repeatedly tap to manufacture success; wait at least four seconds before any next attempt.
5. **Route/reset/silent and privacy sanity:** if practical, connect/disconnect headphones/Bluetooth, check silent switch, leave/reenter app, and verify old effects do not replay late. Navigate to Learn/Flashcards/Read My Verse cautiously; microphone capture must not start automatically, recordings/progress must remain intact. Nonmigrated sound output/Flashcards meter can still be missing from N1. No native tone engine or random Zoo surprises yet.
6. **Evidence for next chat:** report which actual sample(s) were heard, *before and after* state/trace strings, exact reason on silence, any freeze/navigation/reward issue, app switching sequence and any recording impact. This decides whether N2 requires a follow-up or whether N3 can proceed; no automated Node run is a substitute for iPhone audio.

**Automation limits:** GitHub Node/VM tests check adapter gesture ordering, safe no-Web fallback on rejection, trace shape, Swift source guards and existing Feeding regression behavior; web build checks the N1 injected gate. They do not compile Swift or reproduce real iOS AVAudioSession interruption notifications; distinguish passing CI, Xcode compilation and human-heard audio in the handoff.

---

### N1 — globally silence WebKit sound output in the separate iOS audio experiment (merged; historical acceptance checklist)

**Status:** [PR #20](https://github.com/andydoane/biblozoo/pull/20) **merged** to `experiment/native-ios-audio` as `6303ce79` on November 7, 2026. Final-head CI passed Node regressions and production web build, including all **33** packaged HTML pages. The owner reports the N1 test app worked as described, including expected silence in unmigrated features. This is a qualitative acceptance of the isolation experiment, **not a new chronological interruption trace** or full all-native audio signoff. See [living handoff §§9–10](PROJECT-HANDOFF.md) and [the source inventory](NATIVE-ONLY-IOS-AUDIO-INVENTORY.md). This **supersedes the C.2d same-app Web-A/B instructions below**: after N1 the separate `.audiotest` app intentionally has **no Web audio fallback**, and the experimental Classic tester automatically selects Native. Use the **original stable BibloZoo app** for a separate Web comparison.

**Implementation to verify:** `npm run build` copies web sources into ignored `dist/` and, *only when* Capacitor `appId` is `com.andydoane.biblozoo.audiotest`, inserts `verse_games/shared/native-only-ios-output.js` as the **very first HTML script** in every packaged root/game/Playground/utility HTML. The guard becomes active only under native Capacitor iOS/`capacitor:` origin: `AudioContext` and `webkitAudioContext` are unavailable; `HTMLMediaElement.play()` for **audio** rejects rather than reporting false success; HTML videos run muted; parsed/dynamically added autoplay audio is suppressed. The Swift AVAudioPlayer plugin and DEV native sample buttons are unchanged. **No** `getUserMedia` or `MediaRecorder` interception is introduced, but Web Audio microphone metering and HTML recorded-take playback may be unavailable while unmigrated. Some older `new Audio()` and `load()` calls still exist and may still affect the native session **without playing sound**. N1 does **not** claim to fix `interruption-pending`.

From the **`biblozoo-native-audio` worktree** after owner merge:

```sh
git branch --show-current                 # experiment/native-ios-audio
node scripts/validate_native_only_ios_output.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_sound_smoke_test.js
npm run build
node scripts/validate_native_only_ios_output.js # checks every injected dist HTML
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** (confirm Xcode bundle ID ends in `.audiotest`) on the physical iPhone, **not** the original app. Do not delete/reinstall the stable BibloZoo or infer it shares profiles with the experiment.

1. **Native-only output boundary:** launch title/home, tap ordinary buttons, visit a standalone practice game and a Playground activity. Web-era tap, oscillator, HTML narration, and other **unmigrated** sounds should be silent; do not use old C.2d unchecked Web sound as a comparison within this app. The app should still navigate/exit normally; record any screen trapped on a now-impossible Web audio success gate as a functional regression to address in the next owner-specific slice.
2. **Native DEV proof:** open **DEV · Native Audio**, tap **Play star**, **Play chomp**, optionally the pet-unlock sample. Record each sound **actually heard**, along with any native error status and `Inspect native state` snapshot. The native plugin alone is permitted to produce output. Its bridge `accepted` result is not audibility proof.
3. **Classic Feeding pilot:** open Daily To-Do Preview → Feeding Game Tester → Classic → Drag → Got It!. In `.audiotest` there is no visible Web backend checkbox; the preview should say **Native ONLY**, pegs intentionally silent. Native star/chomp are either human-audible or explicitly unavailable/silent with error. Log whether `pending=YES began=1 ended=0` still appears **before** prepare and whether the DEV panel behaves differently after the failed Feeding attempt, without switching apps. **Do not bypass an actual iOS interruption.**
4. **Lifecycle and state:** task switch during Native Classic, return, verify frozen round and deliberate Native Resume/Back with no audio-failure-driven Zoo Escape. Visit Learn and a recording-capable screen without granting microphone accidentally; preserve navigation, stored progress and partial takes. Meter/recording playback may be unavailable temporarily; **do not claim the entire microphone/recording experience is accepted** until N7.
5. **Non-iOS/stable:** independently verify web/PWA/Android and the existing stable BibloZoo baseline still produce their normal sounds if feasible. The native-only gate should be inert there; Linux CI checks source isolation and bundled scripts but does not simulate the real iOS session or speaker.

**Node/CI evidence boundaries:** the new validator checks source sandbox behavior in VM and, after build, every packaged HTML for guard placement/relative URL. Existing regression suites and production web build remain required. GitHub Actions cannot compile Swift, sign the app, hear an iPhone, prove the audio session is healthy, or guarantee every legacy UI remains fully usable while output is suppressed. All failed audio-dependent navigation/recovery must be documented, not masked by Web fallback.

---

#### Historical C.2d procedure below — retained as regression history, not the current N1 device checklist

### C.2d — owner-directed **Native ONLY** Classic Feeding preview

**Evidence and decision (November 7, 2026).** After merged [PR #17](https://github.com/andydoane/biblozoo/pull/17), one iPhone test showed `pending=no, began=0, ended=0` across all clock-first trace phases, but the Web-clock probe failed and the preview chose `Web (native unavailable: web-clock-unavailable)`; the owner heard **no Feeding sound**. The very same build still **audibly played the native DEV star button**. Earlier traces also showed `interruption-pending` *before* checking the Web clock. This means the Web-clock gating/fallback made the Native test ambiguous; it does not prove what initiated any iOS interruption.

**Owner's clarified goal:** use this isolated iOS experiment to learn whether **native-only** sound can replace Web Audio in BibloZoo. Do not silently select Web sounds when Native was checked. A silent native effect with an accurate error is more informative than a disguised Web fallback. Zoo Escape's current connection to failed-audio retry is an older workaround; after reliable native playback is established, consider **separate, random Zoo Escape and Zoo Break surprises**, unrelated to audio health. **This PR does not implement those random features or change existing earned Daily Feeding.**

**C.2d implementation is bounded to the experimental iOS Classic Feeding tester:** on entry it defers its *Feeding-owned* Web Audio/HTML sound allocation until/unless the tester explicitly starts an **unchecked Web** round. With the checkbox checked, **Got It!** prepares only the allowlisted native `feed-star` and `feed-chomp` players; there is no Feeding Web Audio context, clock probe, synthesized peg beep or HTML star/chomp fallback in that round. The iOS app's other screens may still have their own Web sound code—this is a **first isolated test slice**, not a claim that the whole app has been migrated. Peg tones are not yet implemented natively and are intentionally silent. If native `preload` or `play` fails, the backend stays **Native**, displays `Native ONLY unavailable (reason); sounds SILENT` or `Native ONLY failed (reason)`, and does not play Web. The score/game physics continue for diagnosis, with exit available. The previous read-only native interruption snapshots remain for tracking, not for a success claim.

On an interruption or app switch, the **Native-only** preview still freezes on the original Welcome Back screen, but does **not** launch Zoo Escape as an audio-repair minigame, create/resume a Web Audio context, or run a Web-clock probe. A fresh, deliberate **Resume** gesture re-prepares only the native IDs before unfreezing the same round. A failure keeps the round paused with Retry/Back; no automatic restart or reward. Unchecked Web Classic and all normal Daily Feeding/other modes retain the old recovery behavior. `.soloAmbient` and microphone policy are unchanged.

**After owner merges the focused C.2d PR into `experiment/native-ios-audio` ONLY**, select the Mac `biblozoo-native-audio` GitHub Desktop worktree → Fetch/Pull, and in its VS Code terminal run:

```sh
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

Build/run the separate **BibloZoo Audio Test** App target `com.andydoane.biblozoo.audiotest` on a **physical iPhone**, not original BibloZoo.

1. **Web comparison:** Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag. Leave Native **unchecked**, tap Got It!, confirm peg beeps, star and chomp remain audible, catch/score/Back unchanged.
2. **Native ONLY:** Exit, reopen the same Classic preview, check **DEV: Native ONLY (no Web fallback; star + chomp)**, Got It!. The status must say Native ONLY, never Web. **Peg beeps are intentionally silent.** Actually listen for native **star** when a star peg is hit and **chomp** when catching food, including several consecutive events. These are the **only** two tested Feeding sound effects. No web UI pop or doubled effect.
3. **Real failure observation:** If Native `preload` fails with `interruption-pending` or missing bridge, preview remains explicitly Native but silent; copy exact badge and optional `DEV → Inspect native state` counts. **Do not count a silent effect as success**, but silence is an unambiguous failure, not a hidden Web substitute.
4. **Native task switch/Resume:** After at least one star/chomp, switch apps, return, verify game stays frozen and no surprise audio/Zoo Escape recovery minigame runs. Tap **Resume** to re-prepare native sounds with a new user gesture, or **Back** to exit. Failed native retry stays paused; no Web fallback, no unintended reward/score change. Then repeat ordinary Web recovery separately to confirm it was not modified.
5. Confirm real earned Daily Feeding, Labyrinth, Melody, Bounce, Web/PWA/Android, saved profiles, records and original installed BibloZoo remain unchanged. Stage D reliability measurement remains blocked until **human-heard** native gameplay and safe Native-only Resume are confirmed.

**Automation limits:** Source/VM checks guard no Web preflight/fallback/oscillator in selected Native, explicit Web comparison, failure status, preparation and lifecycle ownership, plus existing Feeding/Zoo Escape regressions and web build. GitHub Node CI cannot compile Swift or confirm iPhone audio, and this is **not** yet a production design for peg tones or Zoo surprises.

### C.2c — verify Web Audio clock **before** native preflight, trace interruption phases

**Owner's real iPhone result after merged [C.2b / PR #16](https://github.com/andydoane/biblozoo/pull/16):** Default unchecked/Web Feeding still sounds normal. Checked Native Classic is **silent for native star/chomp**, even though the diagnostic version also muted synthesized Web peg beeps. The bottom-right badge says **`Native effect failed (interruption-pending)`**. Owner's DEV screenshot after finishing a 7/7 catch round (score 11) reads: **`app=active pending=YES last=began events=1 began=1 ended=0 suspended=0 route=0 reasonCode=0 ageMs=15208`**. This is evidence of a recognized interruption-start notification not followed by an observed end; **it does not prove** whether WebKit Web Audio, AVAudioPlayer, another audio app or another session condition initiated it. Working game score is not evidence of audible audio.

**C.2c source hypothesis:** With the current C.2b code, native star/chomp are prepared **before** `startRound()`; after that, `startRound()` may call `resumeFeedAudioContext()` if the Web Audio context isn't running. Both iOS AVAudioPlayer samples worked in isolation in C.1. C.2c moves a **bounded, advancing Web Audio clock check** to the trusted **Got It!** gesture **before** any native preload. The app calls the original `resumeFeedAudioContext(runtime.audioContext)` synchronously within that tap, then checks `feedAudioClockAdvances(context)` using the existing 180ms clock probe. If the context is missing/closed, the resume fails/times out, or the clock does not advance, the DEV preview **falls back to Web before starting**; it does not reattempt native in-round or change `AVAudioSessionCategorySoloAmbient`. If the Web clock changes again during native preflight, the preview likewise chooses Web **before starting**. A successful clock probe does **not** imply hardware output is audible, and the native bridge still enforces interruption safety.

**Read-only DEV phase timeline:** With the native checkbox checked, a small bottom-right text panel records `pending`, `began`, `ended`, `events`, `last` and `reason` using `BibloZooNativeSound.getDebugState()` around these phases: **before-web** (requested on the separate checkbox-change gesture), **after-web** (clock verified or failed), **after-native** (both sounds prepared or denied), **round-start**, and **play-fail** (only if native playback was rejected). Requests are asynchronous and individually bounded to 500ms; **they are observational, not an exact causal ordering guarantee**, particularly `before-web` which is sampled on an earlier user gesture. These values stay in memory/on this experimental view; no new network logs, profile names, verse data, or sound recordings are written.

After the owner merges the **C.2c PR into `experiment/native-ios-audio` only**, in GitHub Desktop select the `biblozoo-native-audio` worktree on the experimental branch → **Fetch Origin → Pull Origin**. In its VS Code terminal:

```sh
git branch --show-current                   # experiment/native-ios-audio
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode build/run **BibloZoo Audio Test**, ID `com.andydoane.biblozoo.audiotest`, on the actual iPhone; preserve the original BibloZoo installation and user data.

**Specific A/B retest:**
1. In **Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag**, leave DEV Native **OFF** and tap **Got It!**. Confirm full Web audio (peg beeps, star and chomp), scoring and ordinary gameplay still work.
2. Exit, repeat the same Classic tester setup, check **Native**, observe the **before-web** snapshot, and tap **Got It!**. A brief bounded clock probe occurs *before* the two native preloads. The badge will identify **Native star/chomp ONLY (Web peg beeps muted for test)** if selected, or **Preview audio: Web (native unavailable: reason)** if a check failed before round start. This C.2b peg mute is still diagnostic—don't mistake absent peg beeps for success. Look for the small phase timeline. **You must actually hear the native star on star-peg hits and chomp on snack catches** for this to pass.
3. If you see **Native effect failed (interruption-pending)** again, screenshot the **phase timeline** and the existing **DEV · Native Audio → Inspect native state (no sound)**. Report which phase first shows `began` increment or `pending=YES`, the bottom-right badge and the actual sounds heard. If Web fallback happens before the round, report its exact reason; do not claim Native gameplay was tested.
4. If both native effects work reliably, repeat several star/chomp events and switch to another app and back. Verify no background replay and only the existing **explicit Resume** with native dual-preflight and Web clock verification resumes the frozen round; Back/Zoo Escape remain available. Check preview score/progress/no duplicate rewards.
5. Confirm real Daily Feeding, Labyrinth/Melody/Bounce tester modes, Web/PWA/Android, microphone, mute behavior and existing app data remain untouched. Stage D reliability measurement is still **on hold until owner approves C.2c's actual iPhone output**.

**Regression limit:** The Stage C.2 test executes the real JS startup source with instrumented Web resume and clock probes to enforce **resume → advancing Web clock → native preload → game start**, missing/stalled/changed-clock fallback before round, stale diagnostic requests, and no duplicate audio; the pre-existing Feeding/Zoo Escape regressions remain. GitHub Linux CI does **not** compile Swift or demonstrate actual iPhone session behavior or audio audibility. This is a controlled startup-order hypothesis, **not** a validated root-cause fix.

### C.2b — native star/chomp versus Web Audio collision beep isolation (experimental)

**Owner's iPhone result after merged [PR #15](https://github.com/andydoane/biblozoo/pull/15):** The DEV checkbox now visibly checks; default unchecked **Web** Classic Feeding sounds and gameplay work normally. With the **Native** box checked, the regular synthesized **peg beeps remain audible** but the star and chomp **do not sound**. The bottom-right test label says **"Native effect failed. Exit preview to retry."** This means C.2 gameplay is **not accepted** even though both samples worked in C.1's separate DEV native buttons. The generic label did not expose whether the bridge rejected a play request with `interruption-pending`, `not-preloaded`, `play-denied`, a timeout, or another error. Web Audio / AVAudioPlayer competition is a **hypothesis**, not a proven cause.

**C.2b diagnostic only:** On the separate `.audiotest` iPhone app, when **Classic Feeding Game Tester** is explicitly checked **Native** and gameplay is active, suppress *only* the synthesized non-star **peg beep oscillator**. This tests whether normal Web Audio tone emissions affect native playback. Keep the actual Feeding Web Audio **context/clock**, task-switch recovery, score, collision physics, stars, snack catches, Zoo Escape and all default **Web** audio behavior. Zoo Escape's optional sounds while paused are unchanged. Other modes and normal Daily Feeding are untouched; the isolated native mode is not a proposed permanent release mix.

The experiment now labels successful native preflight as **"Native star/chomp ONLY (Web peg beeps muted for test)"**, and a rejected native play as **"Native effect failed (reason). Exit preview to retry"**. `reason` is the short allowlisted-format error code returned by the existing bridge, not proof that a sound was/wasn't heard. No new activation, `setCategory`, `setActive`, background entitlement or automatic Web fallback mid-round.

**After owner merges only into `experiment/native-ios-audio`:** GitHub Desktop → `biblozoo-native-audio` on `experiment/native-ios-audio` → Fetch/Pull, then VS Code terminal:

```sh
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** (bundle identifier `com.andydoane.biblozoo.audiotest`) on a real iPhone. Run the following controlled comparison:
1. **Unchecked Web baseline:** Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag → Got It! Confirm synthesized peg beeps **plus** normal star and chomp sounds.
2. **Checked Native diagnostic:** Repeat the identical Classic setup, check Native and Got It!. Badge should mention **Web peg beeps muted**. **No synthesized peg beeps is expected in this one test**. Listen for actual **native star on star-peg collision** and **native chomp when the pet catches food**. No ghost/double sounds and no score or physics changes.
3. If either native effect fails, **report the exact badge string in parentheses**, such as `interruption-pending` or `not-preloaded`, and use the **DEV · Native Audio → Inspect native state (no sound)** button to capture `pending`, `began`, `ended`, `suspended`, and `reasonCode`. Do not infer that muted peg beeps mean the native path works; only *heard star/chomp* count as the device result.
4. If native star/chomp now work, repeat several effects and a task switch → **explicit Resume**, and check Zoo Escape/Back remain available. We will then study how to provide peg tones without recreating the failure. If they still fail, use the captured reason for the next narrow fix rather than changing `AVAudioSessionCategorySoloAmbient` or bypassing genuine interruption.
5. Real Daily Feeding, other tester modes, Web/PWA/Android, daily rewards, recordings and stable BibloZoo must stay unchanged.

**Validation limit:** `scripts/validate_native_feeding_preview_c2.js` executes the actual `playPegTone` source in a VM to verify that Native Classic skips the Web oscillator but Web Classic still emits it, plus checks the safe error-reason UI, preflight, default-off logic, and existing task-switch/Feeding/Zoo Escape contracts. Node CI does not prove actual speaker output, Swift lifecycle callbacks, or the cause of any iPhone interruption. **Do not advance to Stage D** until native gameplay has actually passed on-device and a safe path for the missing peg beeps is decided.

### C.2a — native Feeding checkbox failed to toggle on iPhone

**November 6, 2026 device result after merged [PR #14](https://github.com/andydoane/biblozoo/pull/14):** Classic Feeding Game Tester **default Web audio works normally**, but tapping the **DEV: Native star + chomp** checkbox shows **no checkmark or visible change**. This prevents selecting the native backend, so **there is no native Feeding gameplay acceptance yet**. This is not a problem with the owner's instructions.

**Confirmed source bug:** `daily_questions_feed_game.js`'s delegated `runtime.startOverlayHandler` handles all intro clicks and always calls `event.preventDefault()` immediately. On iPhone, that suppresses the default action of the new nested HTML `<label><input type="checkbox"></label>` in the Classic tester intro. **C.2a** exempts only the opt-in label and input from cancellation (but stops bubbling to other app controls). The normal Tilt/Drag/Got It! handlers keep `preventDefault`; real Daily Feeding, other tester modes and web/PWA still never offer the checkbox.

The experimental checkbox now updates nearby status text **immediately on change**, before the final Got It! tap: **"Native selected. Tap Got It! to check both sounds."** or **"Web effects selected (default)."** It starts unchecked in each preview and is disabled only while both native samples are being prepared after Got It!, preventing a selection change after preflight starts. No native playback, AVAudioSession, fallback, progress, Zoo Escape or reward code was changed. New validation executes the **actual delegated click handler** with a checkbox/label default simulation, checks the opt-in text and confirms ordinary intro events still have their original cancellation behavior; this does not replace a physical iPhone interaction test.

**Retest after owner merges C.2a into `experiment/native-ios-audio` only:**

1. In GitHub Desktop use the separate `biblozoo-native-audio` worktree → Fetch/Pull. From its VS Code terminal run `node scripts/validate_native_feeding_preview_c2.js`, `npm run build`, `npx cap sync ios`, `npx cap open ios`. Build/run the `.audiotest` Xcode App target; keep the original BibloZoo installed.
2. Open **Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag**. On the final intro screen, tap both the checkbox **square** and **label text**. The first tap must **visibly check** the box and show **Native selected**; the next tap must **uncheck** it and show **Web effects selected**. This must not start the round or change the chosen control.
3. Close/reopen the tester. Checkbox must start **unchecked**, with Web selected. Tap **Got It!** and verify Web audio works as before.
4. Repeat with the checkbox **checked**, then tap **Got It!**. Only now should the test app prepare star/chomp, and the status badge should show **Native star/chomp** or **Web (native unavailable)** if preflight fails *before* the round. Actually hear gameplay star/chomp and compare with Web; no duplicates. Check task-switch Welcome Back/Resume, score, and that tester preview awards no real Daily To-Do progress.
5. No opt-in controls should appear in real Daily Feeding or Labyrinth/Melody/Bounce tester modes. If the checkbox remains unresponsive, the Native status never appears, or game audio/recovery fails, report exactly what happened and **hold Stage D**.

### Stage C.2 — default-off native Feeding **Classic tester preview** (experiment-only)

**Owner acceptance of merged [PR #13 / C.1](https://github.com/andydoane/biblozoo/pull/13):** The original pet-unlock and both **actual Feeding star/chomp MP3s** were audible on the iPhone through numerous rapid, consecutive presses and after task switches. User reports occasional first-launch Xcode-app lag that also occurred across earlier builds and went away after closing/relaunching; **this is an observation, not a proven C.1 audio bug or performance measurement**. Stage C.2 may proceed as an experiment, not as proof that a full Feeding game now works reliably.

**What C.2 implements:** On the **separate BibloZoo Audio Test** iOS app, only in **Daily To-Do Preview → Feeding Game Tester → Classic**, the two-step Feeding intro shows a **DEV: Native star + chomp (off by default)** checkbox after choosing Tilt/Drag. Checking it is explicit per-preview consent, never saved to progress or reused for another game. The button and intro deliberately opt out of the global Web Audio UI pop to keep this comparison isolated. **Other modes (Labyrinth, Melody, Bounce), real Daily Feeding, the public app, web/PWA and Android remain web-only**. No app or iOS audio-session category/mode/activation changes.

When the checkbox is ON, **Got It!** first calls the fixed-ID Capacitor plugin to preload *both* `feed-star` and `feed-chomp` with bounded deadlines. If plugin, interruption state or bundled sound is unavailable, **before gameplay starts** it chooses the normal web sounds instead; a small preview-only label says **Preview audio: Web (native unavailable)**. On success the label says **Preview audio: Native star/chomp** and only these two events use the native player. Classic's regular peg/collision tones remain Web Audio. The native play path never also dispatches a web/HTML MP3 for the same event. A failure **during** a native round does *not* silently change backends: the event stays silent and the label asks the tester to exit/retry. Gameplay score, timing, progress and earned rewards are unchanged.

Native players stop on exit, finish, background and existing Feeding pause. Upon **explicit Resume** after switching away, the same activity-owned Web Audio clock recovery still runs; a native preview additionally must re-prepare **both** samples from that gesture before the original frozen round may continue. Neither `preload`, `play`, an advancing Web Audio clock nor a successful bridge result is proof of hardware audibility. The existing Zoo Escape recovery/exit remains available and does not award simulated points. The experiment may reveal remaining interactions between Web Audio collision tones and native effects; do not hide a genuine failure.

After owner merges this PR **only into `experiment/native-ios-audio`**, in GitHub Desktop choose `biblozoo-native-audio` → Fetch Origin → Pull Origin, then in the VS Code terminal:

```sh
git branch --show-current                 # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

Xcode: Build and Run the **BibloZoo Audio Test** App target on a physical iPhone, bundle ID `com.andydoane.biblozoo.audiotest`; do not overwrite the normal BibloZoo app. All C.1 MP3 resources are unchanged.

**A/B acceptance on the same iPhone, same hardware volume, sound route, and mode:**

1. Enter **Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars** to guarantee star pegs. Choose **Drag** initially. Leave the new native checkbox **OFF**, tap Got It, and catch snacks/hit star pegs. This is the untouched **Web** baseline, identified by the small status label.
2. Exit preview and repeat the identical setup, this time **check DEV: Native star + chomp**, then Got It. Expect a bounded loading moment before the round, status **Native star/chomp**, distinct audible star/chomp samples on gameplay events, no doubled MP3s and no unexpected native sound at startup. Continue to catch multiple snacks. Ordinary collision tones still use Web Audio; do not confuse those with native star/chomp.
3. Repeat a few Classic previews to compare lag/latency. Observe whether a first-launch lag appears **in both Web and Native runs** before attributing it to the native pilot. Test silent switch deliberately; `.soloAmbient` may mute audio normally.
4. During an **opted-in native** round, switch to another app and back. The round should remain frozen and present the existing Welcome Back / Zoo Escape process, **not** resume by itself. Press the real Resume control: Web Audio's established recovery *and* native re-preparation must succeed before the same game continues. Listen for new star/chomp effects (never stale/replayed ones). If native preflight fails, the overlay must let you retry or exit—no web backend flip, no lost daily progress.
5. Try an error scenario only if it occurs naturally: if label says **Web (native unavailable)**, the fallback happened **before** start and the round should still make normal web effects. If **Native effect failed**, note the event, label and device state; exit the preview instead of relying on a silent mid-round replacement. Testing the DEV preview must not award actual Daily To-Do completion or second prizes.
6. Confirm **real Daily Feeding** and tester **Labyrinth, Melody and Bounce** behave as before, without any opt-in controls; exiting or backgrounding a preview must not leave stale native voices.

**Source/CI regression:** `scripts/validate_native_feeding_preview_c2.js` tests missing plugin, invalid IDs/volume, timeout, dual preload, late/stale responses, one backend per effect, native failures, web fallback before round, and preview-only UI. It is experiment-only in GitHub CI alongside existing Feeding/Zoo Escape tests. **Linux CI cannot compile Xcode, reproduce the iOS interruption sequence, or verify actual sound, reward persistence or first-launch performance.** Report audible quality and exact label/status if something fails; keep this experiment isolated until iPhone acceptance is reported.

### Stage C.1 — independent native Feeding sample preparation (experiment-only)

**Gate for starting C.1:** Following merged [PR #12](https://github.com/andydoane/biblozoo/pull/12), the owner reports **five consecutive native-only pet-unlock taps were all audible in one foreground session** and native sound also played through tested app-switch returns. The DEV test suppresses the normal Web Audio UI pop. The native readout may show a pending, unmatched interruption `.began` after a switch (`began=2`, `ended=1`), but a notification count does not prove the speaker is silent; do not ignore an actual rejected native request. There is no claim the iOS interruption-reporting edge case is completely understood.

**Purpose:** before integrating actual Feeding gameplay, prove that the same isolated `BibloZooNativeSound` bridge can preload and play **two existing, correctly named samples** as well as pet-unlock. This is a *native resource/player proof*, not Stage C.2 Feeding backend routing.

- Existing checked-in `verse_images/daily_questions/dq_feed_star.mp3` and `dq_feed_chomp.mp3` are explicitly included in the Xcode App target's **Copy Bundle Resources**, alongside `ui_pet_unlock.mp3` (separate from `dist` web assets). Logical allowlisted IDs `feed-star` and `feed-chomp` map only to those bundled files.
- The Capacitor plugin now owns one **independent `AVAudioPlayer` for each allowed ID**; preparing one cannot replace the prepared player for another. At most three known voices can be held; new preload/replay of a given ID restarts that same voice, while different clips can coexist. Invalid IDs, nonfinite/out-of-range volume, interruption/background/route changes and the original `.soloAmbient` category guard retain their existing policies. No app-wide session activation or new category.
- The **DEV · Native Audio** panel has two additional buttons, **Play star** and **Play chomp**, alongside the existing pet-unlock button and read-only state inspection. All are explicit user-tap-only, separate from normal Web Audio pop and **never called from Feeding**. The developer panel is not production UI.
- `scripts/validate_native_sound_smoke_test.js` checks the three committed assets, Xcode resource memberships, strict ID-to-resource mapping, independent players and JS tap/timeout/background/dismissal behavior; CI does **not** compile or run native Swift.

**After the owner merges C.1 into `experiment/native-ios-audio` only**, in GitHub Desktop select the `biblozoo-native-audio` worktree (not `ios-prep`), Fetch Origin → Pull Origin, then in VS Code:

```sh
git branch --show-current                    # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode's App target check Signing & Capabilities uses `com.andydoane.biblozoo.audiotest`, and Build Phases → Copy Bundle Resources lists `ui_pet_unlock.mp3`, `dq_feed_star.mp3`, and `dq_feed_chomp.mp3`. Run the separate **BibloZoo Audio Test** app on a real iPhone; preserve the original BibloZoo installation and saved profiles.

**Audible acceptance:** With silent mode OFF and hardware volume up, tap **Play native test sound**, **Play star**, **Play chomp** separately; confirm three distinct **actual** sounds, not an ordinary button pop. Repeat each 3–5 times **without task switching**, then switch apps and return, tap again, and inspect optional native state. No sound should play automatically; the DEV panel should never play two samples for one tap. Also try the silent switch on/off; intentional silence under `.soloAmbient` is expected. Any `bundled-asset-missing`, `not-preloaded`, `interruption-pending`, Swift compile errors, or unexpectedly silent sound requires investigation before C.2. Note exactly **which** sample was heard and the panel message; bridge `accepted` is not proof of audibility.

**Stage C.2 remains blocked:** No Feeding game event dispatch, automatic engine switching, default-on behavior, microphone/reward/progress changes, or Zoo Escape/audio-recovery integration has been implemented here. The planned next PR will offer a **default-off, manually opted-in tester preview** only, choose the sound backend before starting a round, and preserve the web path when the native preflight fails. Do not conflate success of a 3-button manual test with actual gameplay reliability.

### Stage B.2 — isolate the native sound and inspect the *actual* interruption event

**Owner's corrected November 6 iPhone report after merged [PR #11](https://github.com/andydoane/biblozoo/pull/11):** On the developer **Play native test sound** button, **every tap makes a short UI pop**, but the separate **pet-unlock/native MP3** is usually heard only on the **first tap** after launch or after returning from another app. The second consecutive tap plays **only** the pop and reports `No new native sound requested: iOS interruption pending`. After app switch → return, the first tap again plays both sounds, and the cycle repeats. Sometimes even the first native MP3 is silent. **This is a reproducible failure**, not a passing Stage B acceptance. Stage C Feeding remains blocked.

**Source explanation:** `app.js` has a global, *capture-phase* `touchstart`/`pointerdown` feedback handler that plays `ui_audio/ui_sound_pop_1.mp3` or `ui_sound_pop_2.mp3` (or a short generated fallback) on ordinary buttons. It already skips any ancestor with `[data-no-ui-sound]`. The native smoke test had been an ordinary `<button>`, so **each tap triggered two independent audio paths**: Web Audio pop before the native bridge, and the test `ui_pet_unlock.mp3` only when `preload`/ `play` was accepted. A rejected native preload cannot emit the second clip. The persistent `.began` interruption **might** be related to these competing gestures, but this is **not proven**.

**Focused B.2 diagnostic experiment** on `experiment/native-sound-isolated-diagnostics` (targets `experiment/native-ios-audio` only):
- Add `data-no-ui-sound` to the entire **DEV · Native Audio** panel. Its button no longer triggers BibloZoo's global UI pop, Web Audio unlock or generated tap sound. **All ordinary app buttons remain unchanged.**
- Add one *read-only* `BibloZooNativeSound.getDebugState()` bridge method exposing bounded, **in-memory** numeric counts of interruption began/ended/suspended/route notifications, the last interruption reason code and age, the plugin's pending flag and app state. It cannot play, setActive, change category, record speech, access user data or automatically resume.
- Add **Inspect native state (no sound)** on the developer panel. It displays `app=… pending=… last=… events=… began=… ended=… suspended=… route=… reasonCode=… ageMs=…`. It makes no audio request. The existing tap/play/stop behavior and interruption guard remain intact.
- Add Node VM and native source-contract checks proving test UI suppresses normal pop, the new method is read-only, and a diagnostic tap cannot trigger native `preload` or `play`. These tests do **not** reproduce iOS notification delivery, and GitHub CI does not compile Swift.

**After owner merges**, in `biblozoo-native-audio` worktree on `experiment/native-ios-audio`, Fetch/Pull and run `node scripts/validate_native_sound_smoke_test.js`, `npm run build`, `npx cap sync ios`, `npx cap open ios`, then Xcode Build/Run the **`.audiotest`** App target on a real iPhone. Do not install over `com.andydoane.biblozoo`.

**Four-step diagnostic test (capture the exact panel text):**
1. Fresh launch, with sound enabled. Tap **Inspect native state (no sound)** and note `events/began/ended/pending` before any sample. This button must be silent.
2. Tap **Play native test sound** once. **There should be no UI pop**—listen only for the pet-unlock MP3. Tap **Inspect native state** again and note `began/ended/pending/last/reasonCode`.
3. Tap **Play native test sound** a second time **without switching apps**. Record whether a **second actual MP3** played or the panel says `interruption-pending`. Inspect state once more. A `began` increment between steps 2 and 3 would confirm an interruption notification arrived, but **not what caused it**. A `reasonCode` is diagnostic, not a definitive cause.
4. Switch to another app and return, then inspect before and after a fresh tap. Compare pending status and event counts. Confirm **no spontaneous audio**, and normal game buttons continue to have their pop.

If native playback now works repeatedly without UI pop, investigate the Web Audio gesture/audio-session interaction in a **separate controlled PR**, rather than changing category or automatically activating audio. If failure persists, use the native event readout to identify the next narrow fix. **Do not bypass a genuine `.began` interruption just to make a sound play.** Keep Stage C blocked until repeatable consecutive native taps work on-device.

### Stage B.1 — intermittent `interruption-pending` after audible native output

Owner's November 6, 2026 iPhone acceptance of merged [PR #10](https://github.com/andydoane/biblozoo/pull/10): **the native test button produced audible sound across the tested scenarios**, but the small panel also sometimes reported `Could not prepare: interruption-pending`. Do not treat either observation as proving that the same **blocked** tap made sound. In the PR #10 JS flow, a failed `preload` *returns early* and cannot invoke that tap's native `play`.

Apple notes that iOS may deliver a **delayed `.began` notification after a process is suspended**, indicated by `AVAudioSessionInterruptionWasSuspendedKey`. The first plugin also set its pending flag for any **unknown/malformed** notification (`kind != .ended`) and could retain a real `.began` forever after returning if no matching ended signal arrived. [Apple documentation](https://developer.apple.com/documentation/avfaudio/avaudiosession/interruptionnotification).

**B.1 follow-up on `fix/native-sound-interruption-state`**, targeting **`experiment/native-ios-audio` only**:
- Switch on a recognized interruption type. A genuine `.began` blocks a new tap while the app remains active; `.ended` clears it. An unknown type **does not** fabricate a begin or override an existing genuine pending state.
- A `.began` carrying `wasSuspended=true` is a delayed historical event and does not set a new pending latch. It still stops/forgets any old sound. If an independent genuine interruption is already pending, retain that state.
- If a genuine `.began` was followed by an **inactive → active** lifecycle transition without `.ended`, mark the state eligible for a **fresh explicit-tap retry**. Do not clear or resume automatically upon foreground activation; only when a user invokes a new `preload`/`play`, and let AVAudioPlayer itself accept/deny. No `setActive`, `setCategory`, `setMode`, automatic audio or gameplay routing.
- The developer UI says **“No new native sound requested”** on a blocked preload; a successful fresh retry reports whether the signal was a delayed suspension or a foreground-tap retry. The panel never asserts audible output.

In the Mac experimental worktree, after owner merges the focused B.1 PR, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
git branch --show-current            # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

**Required device retest before Stage C:** rebuild **BibloZoo Audio Test** (bundle ID must still end in `.audiotest`) on the physical iPhone. Tap with sound on, then repeat background → foreground, lock/unlock, quick app switches, silence switch and route changes as available. Listen for a new single sound **per tap**. The panel should not remain stuck on `interruption-pending` after a full return, and should never play by itself. If `interruption-pending` appears **during a genuine active interruption**, the blocked tap must not request a sound; try again after the interruption ends/return. Report exact sequence, panel text and whether the sound was actually heard. If the blocker persists, keep Stage C on hold and create another small follow-up.

This follow-up is a **hypothesis-driven correction**, not proof of hardware sound or that every interruption can be distinguished by notifications. The Node validator tests JavaScript behavior and Swift source contracts; **Xcode compilation, the actual iOS notification sequence and audible recovery remain physical-device checks**.

### PR B: one-sound native iPhone smoke test (experiment branch only)

The `experiment/native-sound-smoke-test` PR adds a branch-only `BibloZooNativeSound` Capacitor 8 plugin (`ios/App/App/BibloZooNativeSoundPlugin.swift`). It uses **AVAudioPlayer** with one allowlisted ID `pilot-unlock`, mapped to existing `ui_audio/ui_pet_unlock.mp3`. Xcode's App target **Sources** explicitly includes the Swift file, and **Copy Bundle Resources** explicitly includes the MP3 at the root of the app bundle. This is *separate* from the copied `dist/ui_audio` web asset; the plugin looks up `Bundle.main.url(forResource: "ui_pet_unlock", withExtension: "mp3")`. No new binary asset or rights assumption is needed.

The developer panel `verse_games/shared/native-sound-smoke-test.js` appears at the top-right of **the experimental native iOS app only**. It is installed for this experiment, deliberately not public-release UI. There is **no auto-play or gameplay routing**; a human tap sends `preload("pilot-unlock")` followed by `play("pilot-unlock", volume:0.85)` with bounded JS wait, then offers an honest prompt asking whether the sound was **actually heard**. A native `accepted:true` is NOT a sound-health/recovery verdict.

After the owner merges this PR **into `experiment/native-ios-audio` only**:

```sh
# Run from the biblozoo-native-audio worktree; Fetch/Pull Origin first.
git branch --show-current            # experiment/native-ios-audio
git status --short                   # clean before building
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode's **App** target: verify **Signing & Capabilities** still has bundle ID `com.andydoane.biblozoo.audiotest` and the owner's development Team. Inspect **Build Phases → Compile Sources** for `BibloZooNativeSoundPlugin.swift` and **Copy Bundle Resources** for `ui_pet_unlock.mp3`. If the test asset is missing at runtime, check that resource phase before modifying Web Audio or `dist`. Run on the **real iPhone**, not just simulator; leave the original BibloZoo installed.

Manual gate — report observed results rather than assuming them:
- Launch **BibloZoo Audio Test**: normal app works; **no sample sound on launch**. See small **DEV · Native Audio** panel; if absent, confirm the native project actually rebuilt and the test app is current.
- Tap **Play native test sound** once: a brief unlock sound should be audible with sound enabled. The panel should say **"Native playback requested. Did you hear the sound?"** only when native `AVAudioPlayer.play()` reported accepted. This is **not** automated proof of hearing.
- Repeat with silent switch enabled: audio may be silent under intentional `.soloAmbient`; do not call that a defect. Compare with sound on and stable BibloZoo at the same hardware volume.
- Background/lock/unlock, then foreground: there must be **no automatic replay**. Tap again; confirm audible output. A task switch while a preload is pending should cancel the old JS request and native sound rather than queue a stale sound.
- Try wired/headphone/Bluetooth output and route changes if available: sound should follow current output on a fresh tap, never self-resume or leave a repeating clip.
- Tap **×** to dismiss the test panel: native sound stops and the panel does not interfere with normal gameplay. Feeding effects and the Web Audio/HTML recovery/Welcome Back/Zoo Escape paths are intentionally **unchanged**.
- In the case of **Native bridge missing**, **bundled-asset-missing**, `category-not-soloambient`, Xcode Swift compiler errors or silent output despite sound enabled, report the exact label/error; **pause before Feeding PR C**.

The plugin deliberately never calls `setCategory`, `setMode`, or `setActive`. It guards `.soloAmbient`, foreground and interruptions; rejects non-allowlisted IDs/invalid volumes; and forgets the player on app inactivity, route changes and media resets. These safeguards do not replace recording/microphone tests later.

**Automated check:** `node scripts/validate_native_sound_smoke_test.js` validates static Xcode source/resource memberships and runs the real smoke JavaScript in a Node VM for missing-bridge, missing-asset response, bounded timeout, double-tap, background cancellation, explicit tap and no web/PWA UI. It is added to the experiment-only CI job. GitHub Actions do **not** compile Swift or verify actual iPhone audibility; the owner's reported results decide whether PR C is allowed.

## 3. Existing automated validation commands

**Package scripts currently declared in `package.json`:**

```sh
npm run validate:daily-questions
npm run validate:daily-question-sessions
npm run validate:daily-question-generators
npm run validate:daily-zoo-todo
npm run validate:daily-feed-game
npm run validate:read-my-verse
```

**Additional direct Node validators relevant to recent systems:**

```sh
# Feeding selection, input locking, visuals/physics and audio
node scripts/validate_patch73_feeding_controls.js
node scripts/validate_patch73_feeding_controls_polish.js
node scripts/validate_patch73_1_feeding_polish.js
node scripts/validate_feeding_audio_bounce_patch24.js

# Zoo Escape and achievement safeguards
node scripts/validate_patch72_1a_zoo_escape.js
node scripts/validate_patch72_1b_feeding_zoo_escape.js
node scripts/validate_patch72_1c_whole_app_zoo_escape.js
node scripts/validate_patch72_1c1_whole_app_test_harness.js
node scripts/validate_patch72_1c2_identity_artwork_exit.js
node scripts/validate_patch72_1c3_zoo_escape_sounds.js
node scripts/validate_patch72_1d_zookeeper_stats.js

# Other recovery/recording owners
node scripts/validate_playground_welcome_back_patch68.js
node scripts/validate_flashcards_patch69.js
node scripts/validate_read_my_verse_audio_patch70_2.js
node scripts/validate_read_my_verse_feedback_levels.js
node scripts/validate_app_audio_patch23b.js
node scripts/validate_learn_narration_recovery_gate.js

# Verse Launch Game Menu / How to Play / Speed Menu / bonus pause
node scripts/validate_verse_launch_menu_pause.js

# Committed LF source and consistent macOS worktrees
node scripts/validate_tracked_lf_endings.js

# Experimental iOS app identity (only on the native-audio experiment branch)
node scripts/validate_native_audio_test_identity.js

# PR B explicit native sound test (experiment branch only)
node scripts/validate_native_sound_smoke_test.js
```

This is a **starting selection, not every validator**. There are many historical `scripts/validate_*.js` programs. Choose the suites appropriate to the change, and run broader recovery/regression coverage for shared code. Record precise failures; don't label a failing old test “outdated” without investigating it. Check for actual missing runtime assets versus broken code.

### Automatic GitHub Actions validation for `ios-prep`

The workflow [`.github/workflows/ios-prep-validation.yml`](../.github/workflows/ios-prep-validation.yml) was merged in [PR #3](https://github.com/andydoane/biblozoo/pull/3). It runs when **any PR targets `ios-prep`** (including when new commits update that PR) and whenever commits are **pushed or merged to `ios-prep`**. There is no path filter, so documentation-only PRs trigger the checks too.

GitHub will display two separately named jobs:

- **Node regression checks:** `npm ci`, the committed-blob LF line-ending guard, all six existing package validation scripts, Feeding 73–73.1, current Zoo Escape/statistics, Verse Launch menu pause, Flashcards, Read My Verse, and app audio tests.
- **Production web build:** `npm ci`, `npm run build`, then checks that key `dist/` runtime files were created.

The jobs use an Ubuntu runner, Node.js 22, read-only repository permissions, npm lockfile, and no deployment credentials. **This is not a native Xcode/iOS build, an App Store release, or a GitHub Pages deployment.** Physical iPhone and offline/audio-interruption tests still belong to the owner.

Some older patch-specific validators hard-code historic service-worker cache version strings (for example an Oct 26 stamp). The included Flashcards Patch 69 validator was updated in this CI PR to check the **durable versioned-cache and offline-asset contract** instead of requiring an obsolete Patch 72.1 substring. Other historical validators with stale patch-version assertions remain outside this initial CI selection; do not mistake their absence for full recovery regression coverage. For related changes, run older tests deliberately, refreshing stale assertions only when their underlying contract still applies.

**Learn narration return gate (focused fix on `fix/learn-narration-recovery-gate`):** `scripts/validate_learn_narration_recovery_gate.js` uses the actual Learn recovery functions in a simulated media-clock harness. It asserts that an advancing narration clock can succeed even when the unrelated UI Web Audio unlock fails or hangs, and that blocked/stalled media, stale attempts, second interruptions and source changes cannot fake success. It is included in CI for this PR; physical iPhone listening remains mandatory. Older `validate_learn_resume_overlay_patch19a.js` has historical expectations for the replaced two-engine gate and is not the acceptance test for this change.

**Verse Launch menu pause (proposed in `fix/verse-launch-menu-pause`):** `scripts/validate_verse_launch_menu_pause.js` executes the actual Verse Launch menu and loop callbacks against a simulated clock/animation scheduler, covering conveyor stop/restart, Help and Speed overlays, bonus asteroid/menu pause, and task-switch/Welcome Back overlap. Included as a dedicated CI step on this PR. In the original source the bonus asteroid loop already skipped menu/help physics; this fix also freezes the shared activity clock while a local overlay owns pause, without releasing a pending Welcome Back pause. Manual iPhone checks must verify visible word motion, bonus timer/asteroid movement, Help/Close/Mode Select, and backgrounding with menus open.

**Read My Verse beep level audit:** [Feedback Sound Level Audit](READ-MY-VERSE-FEEDBACK-LEVELS.md) records the per-activity gain comparison to external games and the owner hearing checklist. This proposed PR also registers `node scripts/validate_read_my_verse_feedback_levels.js` in CI. Static and virtual Web Audio gain tests do **not** measure actual output loudness; compare on a physical iPhone at the same hardware volume.

**How to see results:** Open [Actions filtered to `ios-prep`](https://github.com/andydoane/biblozoo/actions?query=branch%3Aios-prep) for post-merge push runs. A PR's **Checks** tab (and overall Actions history) shows its PR-triggered run even though its head is a feature branch; filtering Actions by `branch:ios-prep` may not show every pre-merge PR run. Workflow files and run history are separate: when first introduced, confirm the workflow appears and that GitHub reports actual jobs before telling the owner CI passed. Recheck GitHub Actions repository settings if events are disabled.



## 4. Physical iPhone smoke tests

Choose cases from each affected group and report device/iOS version when useful:

| Feature | What to check on the device |
| --- | --- |
| Main app / Current Verse | Main home, Verse selection, font, clickable Current Verse, navigation to My Verses |
| Feeding — four modes | Two-step Tilt/Drag chooser, full-size icons, Got It!, selected-input isolation, Tilt permission denial fallback |
| Bounce and Melody | Larger ball/snack art, collision geometry, Melody note/contact synchronization, Bounce between-serves flow |
| Labyrinth | Different per-ball acceleration/weight feel and non-overlapping platform impact sounds |
| Learning and 12 games | Learn Listen/Chunks/Echo: narration time actually advances on return even if UI sounds fail; frozen narration keeps retry/Zoo Escape. Verse Launch: word rockets/score should freeze when Game Menu, Help or Speed Menu is open; asteroid bonus time, entities and delayed actions should freeze through Game Menu/Help, then resume without jump. Check menu while task-switch Welcome Back is pending. Preserve verse, chunk, score and timer across switching; other games retain their own real audio-clock recovery |
| Playground — 5 activities | Preserve text/drawing/musical state and return cleanup |
| Flashcards / Read My Verse | Preserve recording/playback state; no auto microphone restart |
| Zoo Escape | Stage 2 / Stage 3 / pending interruption / safe exit / pet rescue state after repeated backgrounding |
| Daily Questions and Zoo To-Do | One-time completion, correct reward protection and special exit routing |
| Accessibility | Reduced Motion, tap-then-pen alternative, readable controls and screen-reader announcements |
| Offline | Correct local images/fonts/sounds and standalone game shell behavior in the intended web or native deployment |

If an interrupted AudioContext *won't* fail, use the deliberate developer harness to test visuals and exit. **Developer simulations do not validate genuine rescue achievement credit**. Do not break native audio or mark those unobserved achievement events as passed.

## 5. Results and release status in PRs / the handoff

Keep separate labels:

- **Implemented in PR:** Code exists on a PR branch, not yet on `ios-prep`.
- **Automated validated:** State exact commands, commit/ref, and pass/fail output; command suggestions aren't results.
- **Merged to `ios-prep`:** Verify PR merge and target commit.
- **iPhone verified:** Owner actually tested the merged (or checked-out PR) build and reported success.
- **Release-ready:** Separate gate: all mandatory tests/acceptance done, developer test controls disabled, native signing/version/privacy checked.

For every PR, revisit the [handoff](PROJECT-HANDOFF.md), update its date/baseline/current work/technical decisions in the **same PR**, and explain in the description what changed. Never copy stale milestone statuses forward without checking GitHub.

## 6. Test and rollback hygiene

- Preserve user saves, localStorage keys, profile IDs, backups, and rewards. If migration is necessary, validate old and new values and fail safely.
- Test both success and failure/deferred/exit paths for recovery and lifecycle work; no accidental double completion.
- Check resource cleanup (timers, RAF, pointer events, audio contexts, background observers).
- Test web/PWA offline caching and native Capacitor packaging separately; update asset cache manifest/version only when relevant to runtime changes.
- Keep PR changes focused for straightforward review and Git revert. If the owner discovers a regression, prefer a small follow-up PR; if serious, revert the merged PR deliberately rather than layering unreviewed local patches.

## 7. Documentation-only PR acceptance

For the initial living-handoff PR, review the Markdown files, README link, PR template, and cross-links against current `ios-prep`. No gameplay, audio, service worker, bundle version, or native file should be changed. Report documentation inspection separately from tests that were *not run*.

New PRs should keep this testing guide updated as commands, CI, and release workflows evolve.
