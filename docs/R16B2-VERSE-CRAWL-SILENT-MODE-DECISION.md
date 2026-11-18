# R16b.2 / AUDIO-01 — Verse Crawl reversible music control

## CURRENT R16b.3 — clarified owner music toggle policy after #152 iPhone FAIL (2026-11-18)

**Actual owner test of merged [#152](https://github.com/andydoane/biblozoo/pull/152):** Silent OFF, initial music+verse audible and music-button OFF left verse audible — **PASS for observed flow**. Silent ON, initial music+verse were both silent, while music-button OFF enabled verse alone — **FAIL against owner's now explicit default**. The music-note PNG also fills too much of its button. This is a physical user report, not an inferred or log-backed test. #152 is **MERGED to integration**, not pending.

**Owner's newly chosen behavior:** Both **Silent ON and Silent OFF** always start Verse Crawl with **music + spoken verse audible**. One tap on the upper-right yellow music note turns **only music/ending OFF**, fading the button; verse continues without pause/restart. A second tap restores music and keeps narration continuous. Same behavior in both physical switch positions. No startup popup, no automatic switch detection, no persistent preference, no extra child taps to hear the default soundtrack. Owner's exact `verse_images/game_ui/ui_icon_music_notes.png` image remains, but rendered smaller inside the existing `#ffc751` button (touch target not reduced).

**Scoped iOS architecture:** Unlike earlier R16b.2, keep a single `AVAudioSession` `.playback` lease from genuine Crawl Start/Welcome Back to Exit/interruption for the entire scene. This intentionally makes the **Crawl music** audible through iPhone Silent Mode as requested. The allowed native clips are ONLY `crawl-theme`, `crawl-ending`, and validated published `verse:` audio; no UI/tap/Zoo/typing/other optional clips. No per-verse second lease, app-wide UI sound leak, generated sounds, unknown media, background mode, automatic foreground restart, OS switch probe or replay-without-gesture. Other activities retain Option B. Control music by stopping/restarting soundtrack only, without disrupting any in-progress verse or score/animation timing. Apple Music/route conflicts must still fail closed or use explicit Welcome Back.

**R16b.3 status:** Corrective code, regressions and documentation on `fix/r16b3-verse-crawl-music-on-silent-mode` → `integration/native-audio-to-ios-prep`, owner review/merge pending; no physical iPhone result for corrected build yet. Preserve original family/Audio Test data and separately gate R17.

## HISTORICAL R16b.2 implementation selected before #152 owner's Silent ON test (now superseded)



The owner rejected a startup popup and selected a **top-right music-note toggle**, using their uploaded `verse_images/game_ui/ui_icon_music_notes.png` artwork in a yellow `#ffc751` circular button. It starts Music ON, a tap fades the button and turns music OFF, a second tap restores Music ON. No preference persists to the next Verse Crawl run; no new modal or special Silent-switch detection.

- **Music ON:** Original native Crawl theme, narration and ending overlap under app-wide `.soloAmbient`. With the phone Silent switch ON the OS silences them as it does today.
- **Music OFF:** Both Crawl theme and ending stop and remain absent. Source-approved verse narration alone can hold the short essential `.playback` lease, including with physical Silent Mode ON. Stop confirmations precede changing the audio category; tapping during narration resumes that **same** clip at its last-known position, without claiming that a Node test proves physical audibility.
- **Turn music back ON:** First stop and release the exclusive essential voice lease, then restore original native Crawl music+speech under `.soloAmbient`. Rapid toggles are serialized, old callbacks cannot finish verses or fabricate a Welcome Back; a real OS interruption still requires its existing explicit recovery.
- **Control/accessibility:** Button is upper-right, `aria-pressed`, labeled Turn Verse Crawl music off/on, 44–56px safe-area-aware touch target and reduced-motion-friendly fade. Original music defaults ON on every fresh activity; web/PWA/Android normal default is unchanged.
- **Safety:** No global `.playback` while optional music is playing, no app-wide mute, microphone/backup/reward/storage changes, background playback, unproven Silent-switch sensor, new cloud logs, or auto media takeover. Protect original 10 production and separate 11 Audio Test Zookeepers.

**Open candidate:** [R16b.2 PR #152](https://github.com/andydoane/biblozoo/pull/152) from `feat/r16b2-verse-crawl-music-toggle` → `integration/native-audio-to-ios-prep` only; leave unmerged. Add focused native adapter/toggle regression and full Actions; owner must merge and physically confirm Silent ON/OFF, ON→OFF→ON while speech is active, actual verse progress, genuine lock/App Switcher/PiP, and Exit/start reset. **Physical iPhone: NOT TESTED for this change.** R17 final comprehensive acceptance remains deferred.

## HISTORICAL decision options (before owner selected toggle)

**Prepared:** 2026-11-18. **Historical status:** DESIGN OPTIONS ONLY. The proposals below are retained for rationale; the owner has since chosen the reversible note button instead. No physical test is implied.


## Verified baseline

- [R16b.1 PR #150](https://github.com/andydoane/biblozoo/pull/150) **MERGED** to `integration/native-audio-to-ios-prep` at `3ba8a7d73230c96bc58266f9d9a0b3a740659555`. [Post-merge CI run #44390620242](https://github.com/andydoane/biblozoo/actions/runs/44390620242): **PASS**.
- Owner subsequently reported **“Everything worked as it was supposed to”** in response to the focused R16b.1 iPhone test plan. Record **OWNER PASS for the targeted fix**: Typewriter spoken segments no longer need an artificial Welcome Back, and its optional key-sound behavior works as expected with the Silent switch. The owner did not supply separate per-case output-route/OS logs or enumerate each ancillary test in this reply; do not fabricate those details or mark unrelated R17 matrix checks.
- Earlier physical-device findings still stand: **Balloons and Fish Silent ON worked as expected**; **Verse Crawl Silent OFF plays its original voice+theme normally**; **Verse Crawl Silent ON shows text but has neither music nor voice**. That last observation is an **OPEN Option B spoken-verse gap**, not a regression this PR fixes.
- Learn Chunks/Echo Menu #148, Flashcards RAM capture/replay and Silent-ON iPhone speaker optional game/UI sound discipline were owner tested in prior PRs. Only tested scopes count as PASS.

## Why Verse Crawl cannot simply borrow the spoken-verse lease

Verse Crawl intentionally overlaps local pre-ducked theme music and the spoken published verse, and later overlaps its ending. `AVAudioSession` category is **app-wide**, not independently settable for each `AVAudioPlayer`; `.playback` bypasses the hardware Silent switch for **all audible players**, not only the narrator. Simply labeling Crawl verse clips `essentialVoice` while music is active would either fail the existing no-overlap guard or allow an optional soundtrack to become audible when Silent ON. Neither is acceptable.

The project deliberately does **not** use a private or unreliable hardware Silent-switch detection API. Nor should it silently stop, truncate or re-time the existing soundtrack in its original mode, auto-resume after interruption, override external Apple Music/PiP priority, mix/duck with others, or substitute Web Audio in the native app.

## Product options requiring owner decision

**Option 1 — a clear, explicit “Voice Only” Read mode alongside current musical Crawl (recommended for consideration).** Add an accessible child-friendly choice before Crawl begins (for example **Hear the Verse** versus **Music + Words**). The **Hear the Verse** path never constructs or plays Crawl theme/ending/optional sounds during that run, then leases `.playback` for the actual spoken, published verse clips only; all scene/verse timing and completion remain bound to real narration end, visual animation and existing recovery rules. **Music + Words** preserves the original theme+voice+ending overlap in `.soloAmbient`, and still obeys the hardware switch. An explicit choice is needed because the app cannot reliably determine switch position. The owner must choose labels/default/visibility and whether the extra selection is worth the interaction. The music mode will **not** magically gain voice under Silent ON.

**Option 2 — make native Crawl voice-first and music-free by default.** Suppress both theme and ending for native iOS Crawl in all Silent-switch positions; narration gets the standard essential-voice lease. This reliably prioritizes audible spoken words even in Silent Mode without switch detection, but **changes or removes the existing much-loved musical experience for all iOS users**, including Silent OFF. It requires explicit owner consent; no implementation approved.

**Option 3 — retain original Crawl as is and postpone full Option B compliance.** Leaves the current Silent ON text-only behavior. This is technically the lowest risk, but must remain an accepted documented exception and **cannot** be represented as “all essential speech audible in Silent Mode” or a full AUDIO-01 PASS.

**Not a valid automatic option:** “Keep full music with Silent OFF, but make only the voice audible with Silent ON” without a user-visible choice, if both sounds share the same app-wide audio session. No supported switch-state contract is presently established to trigger that branching behavior.

## Recommended implementation sequence after owner choice

1. Scope a dedicated **R16b.2 code PR** only to Read/Crawl, its native adapter and native output owner. Preserve native-only source allowlist, an explicit Start/Resume gesture, published verse validation, sound-level protection, original scene animation/completion, no background mode or profile mutation, and genuine OS Welcome Back recovery.
2. Add a native/JS event-owner regression verifying **zero soundtrack/ending/cue starts during a voice-only lease**, optional sounds always `.soloAmbient`, real narrator end drives progression, Exit and OS interruption cleanly stop and restore session, no automatic resumption and no fake rewards. Keep web/PWA/Android and original musical mode unchanged unless the owner explicitly selects otherwise.
3. After exact-head green CI and owner-controlled merge, perform a **short physical iPhone test**: switch ON/OFF with phone speaker, optional AirPods, voice/music choice (if adopted), music not leaking in Silent ON, actual verse narration and animation progression, real lock/App Switcher/Apple Music or PiP takeover, and unchanged Learn/Flashcards spot checks.
4. Only after R16b.2's actual owner acceptance proceed to **R17 comprehensive iOS release-readiness matrix**; promote integration to `ios-prep` only by separate explicit owner approval. Keep `main` untouched.

**Privacy:** Protect the original 10 production Zookeeper profiles and distinct 11 Audio Test profiles, RAM-only Flashcards recordings and backups. No uninstall, mass migration, child voice export, telemetry or secret log upload.

**Decision requested:** Should Verse Crawl offer an explicit **Hear the Verse (voice only)** choice while retaining the original **Music + Words** mode, or does the owner prefer a different compromise? Do not interpret this document as consent to implement any option.
