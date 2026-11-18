# R15 / AUDIO-01 — iOS Silent Mode product-policy decision brief

**Prepared:** 2026-11-18 (America/Detroit). **Status:** PROPOSED / OWNER DECISION REQUIRED. Documentation-only; NO iOS/Swift/JavaScript/audio-category/UI behavior has changed. **Branch base:** `integration/native-audio-to-ios-prep` at `30ff939d700ad7a49fb030ed1e8715c40b9c0af7` (merged [R14 #144](https://github.com/andydoane/biblozoo/pull/144)). Owner now reports R14 iPhone test worked; record **R14 PRACTICE-01 OWNER-REPORTED PASS / CLOSED**, but no exact installed iPhone SHA/iOS/version/speed-case matrix was supplied.

## The decision

**AUDIO-01:** With the iPhone's Silent switch / Action Button set to Silent, children currently cannot hear native BibloZoo audio. BibloZoo uses sound to help children learn verses, but the app must also respect intentional silence, competing media, microphone privacy, and the child's foreground ownership. The owner has explicitly **not requested a Home master-mute control**.

**Recommendation for owner discussion: Option B — essential child-initiated instructional/voice audio should be audible in Silent Mode; incidental UI taps/music/effects should not unexpectedly become audible.** This is a *proposed product outcome*, not a proven one-line native implementation. Before R16, the owner must explicitly choose A, B, or C below and approve the essential/optional boundary. **Do not treat this document's recommendation, CI, or a doc-only merge as evidence of audible iPhone behavior or permission to change the AVAudioSession category.**

| Choice | What a child experiences | Technical/cost implications | R16 |
| --- | --- | --- | --- |
| **A: respect Silent Mode + contextual help** | All existing native sound stays silent when iPhone is silent. Only on explicit audio attempt/failed hearing, offer neutral “Can't hear?” guidance about volume, Silent switch/Action Button and AirPods route; **never** claim hardware switch detection. | Keep `.soloAmbient`; safest for existing interruption/mic ownership, but child still needs a device setting change to hear required narration. No Home mute. | Small UI/help change if approved; no global category change. |
| **B: foreground essential audio audible in Silent Mode (recommended product outcome)** | Explicit **Listen/Play Instructions/Play My Recording** and lesson/verse spoken audio can be heard even if the iPhone is silent. Incidental UI pops, background tunes and optional effects should still respect quiet intent. | Requires a **reviewed, activity-scoped AVAudioSession policy**; one app-wide session category affects other output, so this separation cannot be assumed to work without testing. Risk of category churn and altered AirPods/Apple Music/PiP/mic handoffs. | Implement only after owner approves exactly which sounds count as essential and a safe source design. If separation is infeasible without regressions, stop and propose a narrower alternate before code. |
| **C: selective hybrid defined by owner** | Owner specifies exceptions (for example, instructional voice + scoring-critical cues but not incidental effects), activity by activity. | Greatest precision, potentially greatest complexity; category is process/session-scoped, not a mute bit on each sound. Validate not thrashing the session or accidentally interrupting external audio. | Only after explicit sound/activity matrix and feasible architecture review. |

### Proposed sound boundary for choosing B (owner to approve or amend)

- **Essential candidate:** user-triggered verse narration and verse previews, Learn/Chunks/Echo instructional narration, Daily Check the Verse Listen, Flashcards spoken instructions/Listen/replay of the child's RAM-only take, Read My Verse spoken narration and explicit voice-based instruction. Also consider correctness-critical musical cues separately rather than silently assuming they're optional; some games rely on auditory teaching feedback.
- **Optional candidate:** universal button/UI pops, decorative game stings, background music, ambient effects and automatic transitions. The existing individual-game sound controls stay intact. No new global Home mute.
- **Open boundary for owner:** Are correct-answer/gameplay note cues part of “essential” in Silent Mode? If yes, enumerate affected Learn/Feeding/Practice/Playground/Read routes before R16; do not silently promote every game SFX.
- **Accessibility:** Do not require an unreliable “Silent switch detected” claim or an extra tap to hear sounds that the selected policy makes essential. Use accessible child/parent help text only if Option A or a fallback is approved.

## Source review: why R16 must be a separate scoped implementation

- `ios/App/App/BibloZooNativeSoundPlugin.swift` requires `.soloAmbient` for `unavailableReason()`, `activateFromGesture()` and `acceptFlashcardsCaptureHandoff()`; it grants nonmixable output priority only after a **real foreground gesture**, with bounded attempts, explicit interruption/retry and no automatic reactivation on app foreground. A naive `setCategory(.playback)` breaks those guards.
- `ios/App/App/SceneDelegate.swift` Flashcards `prepareCapture()` requires `.soloAmbient`, then temporarily sets `.playAndRecord` / `.measurement` / `.defaultToSpeaker`, restores its prior category/options, and protects the capture/recorded-take handoff. The separate DEV mic probe and diagnostic bridge also assume `.soloAmbient`. A future category change must explicitly address every guard and restoration path, not a global search/replace.
- `ios/App/App/Info.plist` currently has **no** audio background-mode entitlement. Do **not** add `UIBackgroundModes=audio` merely to ignore Silent Mode. Native `biblozooAppLifecycle`, UIKit inactive handling, Welcome Back and activity-owned clocks must still **stop sound/visual time** on held App Switcher/lock, even if a chosen audio category technically permits sound while locked.
- The native iOS path must remain **native-only** (never silent WebAudio/HTML fallback). Browser/PWA/Android may not inherit native Silent Mode policy. Do not modify family backup, profile storage, privacy permissions, recordings, rewards, game timing, app ID or release branches to implement a sound preference.
- Apple's current [soloAmbient](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/soloambient) guidance says the Silent switch/lock silence that category; [playback](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback) bypasses Silent Mode, may continue through lock, and is nonmixable by default. Explicit background playback requires its own capability; it is **not desired** here. Apple's [Bluetooth A2DP category options](https://developer.apple.com/documentation/avfaudio/avaudiosession/categoryoptions-swift.struct/allowbluetootha2dp) describe different recording vs playback route behavior. There is no reliable public API to directly identify the hardware Silent switch position; do not promise detection.

## Acceptance plan before and after implementation

**R15 sign-off gate (THIS PR; documentation-only):**
1. Owner selects **A, B or C** and states whether correctness-critical game sounds are essential, using review comments or the next chat. Update this decision record to **OWNER-APPROVED** before claiming R15 closed. If decision differs from recommendation, change the proposal rather than treating lack of objection as consent.
2. Owner accepts the expected child-facing behavior, scope exclusions and R16 abort/rollback conditions. R15 requires **no iPhone app install or new device test**, because no executable code changes. Existing iPhone Silent Mode is the reported baseline, not a new PASS.
3. Keep R16 **NOT STARTED / CONDITIONAL** and R17 pending. A separate R16 code PR is where measured on-device behavior and the approved policy must be validated.

**R16 proposed physical-iPhone test matrix after authorization and implementation (mark each PASS / FAIL / NOT TESTED, without private data):**

| Scenario | Acceptance criterion |
| --- | --- |
| Cold app launch, Silent OFF/ON, speaker then AirPods | Exactly selected essential output can be heard in both intended states; optional effects remain within approved policy. No autoplay on cold launch. |
| Learn Listen/Chunks/Echo, verse preview and Daily Check Verse | Real spoken content plays after legitimate child tap; one notification/Welcome Back per actual interruption, no fake daily credit. |
| Flashcards instructions, record, listen and dry/wacky replay | Mic permission remains child-initiated, RAM-only; `.playAndRecord` capture + correct output restoration work; dry voice isn't silently lost. |
| Read activities and game meaningful cues | Approved essential/optional boundary matches each selected mode, correct cue timing, no doubled/compressed/stale notes. |
| Lock, held App Switcher, app Home/foreground return | No audio/animation/progress keeps running while app inactive, regardless of Apple's `.playback` capability; one explicit recovery tap; no zombie audio. |
| Apple Music/remote Play and YouTube PiP takeover | Genuine external interruptions pause BibloZoo; no auto-steal/restart; intentional foreground tap only can reclaim after safe OS activation. |
| AirPods connect/disconnect, output selection, phone calls, media reset | Current take preserved when appropriate, route change does not silently swallow sound or choose speaker against user intent, real failures remain retryable. |
| Web/PWA, Android, offline, privacy, Zookeeper progress | Existing playback/mute/service-worker behavior unchanged outside native iOS; private 10-profile production dataset safe; no instrumentation uploads or reward regressions. |

**R16 implementation stop/rollback triggers:** any spontaneous sound under locked/inactive state, autoplay or stealing competing music without genuine foreground intent, unexpected UI/game pop audible in Silent Mode, lost Flashcards recorded take or mic-route breakage, playback silently failing after category transitions, wrong output route, duplicate reward, child-data risk, or Web/PWA regression. Revert the policy change and leave existing `.soloAmbient` behavior intact pending a new owner decision, rather than weakening recovery tests or enabling background audio.

## Branch, PR and privacy discipline

R15 branch is a docs-only child of `integration/native-audio-to-ios-prep`. Preserve stable `ios-prep` and `main` unchanged. Every later code PR must include `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, this policy document and the iOS stabilization roadmap, accurately documenting owner decisions, latest commit/CI and real device results. Keep the original production **10 Zookeepers** and separate Audio Test **11 profiles** private; no family JSON, names, voice PCM, screenshots containing child data or device logs in the repository. Production-ID phone installation always requires separate explicit owner approval and safe off-device backup.
