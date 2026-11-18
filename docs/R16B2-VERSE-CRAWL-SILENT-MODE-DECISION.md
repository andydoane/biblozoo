# R16b.2 / AUDIO-01 — Verse Crawl Silent Mode product decision (owner approval pending)

**Prepared:** 2026-11-18. **Status:** DESIGN OPTIONS ONLY — no executable change, no approved selection. This document is a proposed next step after owner-confirmed R16b.1 success, not a claim that Verse Crawl narration in Silent Mode works.

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
