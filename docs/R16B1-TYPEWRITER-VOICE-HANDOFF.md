# R16b.1 / AUDIO-01 — Typewriter key-alert → spoken-verse handoff

## CURRENT R16b.1 accepted / R16b.2 Verse Crawl decision pending — 2026-11-18

**Latest iPhone owner confirmation:** [R16b.1 PR #150](https://github.com/andydoane/biblozoo/pull/150) was **MERGED** into `integration/native-audio-to-ios-prep` at `3ba8a7d73230c96bc58266f9d9a0b3a740659555`; exact post-merge [GitHub Actions #44390620242](https://github.com/andydoane/biblozoo/actions/runs/44390620242) **PASS**. After the focused test plan, owner said **“Everything worked as it was supposed to.”** Record **OWNER PASS** for R16b.1 Typewriter's false Welcome Back repair and its expected Silent ON/OFF key/narration behavior, without inventing separate device logs or specific pass claims for unenumerated cases. Supersedes older “PR under review / owner hardware pending” notes below, which remain historical context.

**Remaining AUDIO-01 boundary:** Owner previously reported Read **Balloons/Fish Silent ON working**, and **Verse Crawl Silent OFF music+voice normal**, but **Verse Crawl Silent ON text only (no spoken verse, no music)**. That last condition is still an **open exception to Option B** and cannot be called full Silent Mode success. No change to Crawl has been authorized. Next is an owner **product decision**, then a separately scoped R16b.2 PR; only afterward is R17 full iPhone acceptance/promotion appropriate. [R16b.2 explicit options and risks](R16B2-VERSE-CRAWL-SILENT-MODE-DECISION.md).

**CLOSEOUT AFTER OWNER TEST:** [PR #150](https://github.com/andydoane/biblozoo/pull/150) **MERGED** to integration `3ba8a7d73230c96bc58266f9d9a0b3a740659555`, [post-merge CI #44390620242](https://github.com/andydoane/biblozoo/actions/runs/44390620242) **PASS**. Owner responded after the focused iPhone tests **“Everything worked as it was supposed to.”** Treat the Typewriter false-Welcome-Back regression as **resolved/OWNER PASS** for the reported outcome; older source-fix candidate and “hardware pending” text below is historical. No separate case-specific OS/AirPods traces were given. Full AUDIO-01 remains open due to Crawl narration under Silent ON. [Next decision: R16b.2](R16B2-VERSE-CRAWL-SILENT-MODE-DECISION.md).


**R16b.1 CI checkpoint:** [GitHub Actions run 44389883666](https://github.com/andydoane/biblozoo/actions/runs/44389883666) **PASS** at code+documentation SHA `8c1df08ffa68820979ee5fa3d3ee69a81c9e0f0c`: new R16b.1 key/voice regression, existing R16a/R16b and full Node suite, Linux Swift source parser, and production web build. This is **not** an Xcode iOS SDK compile or physical Typewriter test. After these status-doc updates, verify CI once more for the final PR head; owner iPhone PASS still pending.


**Prepared:** 2026-11-18, owner-approved iOS stabilization work. **Source branch:** `fix/r16b1-read-typewriter-optional-key-handoff`, based on integration commit `60f187a57626710e98ae7c325b5376d1160190de` after [R16b PR #149](https://github.com/andydoane/biblozoo/pull/149) merged. **Status:** SOURCE FIX CANDIDATE; CI and physical iPhone acceptance must be separately recorded. No automatic merge or promotion to `ios-prep`/`main`.

## Exact owner iPhone results after #149

- **Read / Typewriter, Silent ON, iPhone:** key clicks were correctly quiet, but **every attempt to play a spoken verse chunk opened Welcome Back**. The verse audio would play only **after an explicit Let's go** tap. **FAIL** for uninterrupted Typewriter verse playback.
- **Read / Typewriter, Silent OFF:** ordinary key clicks audible; the **same false Welcome Back before each spoken verse segment**. **FAIL**. This is not a physical Silent-switch problem.
- **Read / Balloons and Fish, Silent ON:** owner reported **PASS**, narrated verse and optional sound behavior as expected. No Silent OFF claim; do not infer a full matrix.
- **Read / Verse Crawl, Silent OFF:** owner reports original voice+music works normally (**PASS for normal mode**).
- **Read / Verse Crawl, Silent ON (route not restated in this report):** **text only; no music and no spoken voice** (observed and expected **partial R16b scope**, NOT full Option B compliance). The existing music/voice overlap has not been redesigned and must not be silently promoted.
- No owner data was supplied for Keyboard, Tap Order, Unscramble, Chunk Sequence, OS App Switcher lock, AirPods, exact iOS version, or installed app SHA for #149 beyond the merged integration commit. Keep those **NOT TESTED**.

## Source-backed cause

`read_my_verse.js` calls `playChunkAlertSound()` on the final character and **immediately** calls `finishCurrentChunk()` / `playCurrentChunk()`. The established behavior intentionally keeps the final optional alert active with `stopKeySoundVoices({ keepChunkAlert: true })`, allowing key/alert + voice overlap in normal non-Silent operation.

In the initial R16b native plugin, essential voice refused playback whenever **any** prior Read `AVAudioPlayer` remained in `clips` (`clips.isEmpty` requirement). A transient key/alert thus caused a truthful but overly strict `voice-overlap-unsafe` refusal. The Read adapter's `NativeAudio.play()` rejects; its existing `beginReadNarration` and `error` handlers invoke `pauseReadForInterruption()`, which shows Welcome Back as if the phone had been interrupted. Owner's repeatable false popup is consistent with this exact source collision. No OS category or key/alert clock log was supplied for this exact run, so this is a **source-derived diagnosis awaiting iPhone confirmation**, not a fabricated OS trace.

## Smallest safety-preserving repair

- Maintain fixed, validated source keys for each active native Read clip in `clipSources`, with guaranteed cleanup on real end, explicit stop, stopAll/Exit and OS interruption.
- Preflight Read essential voice while iOS `soloAmbient` is active, with exact independent `read-narration` lease owner, **no other voice**, **no queued generated Read notes**, and **all existing native clips limited to approved short typing effects**. Allowlist is `typewriter-1..3`, `typewriter-alert`, `keyboard-1..7`, and `keyboard-alert`.
- Once actual spoken player **prepares successfully**, stop only these short optional clips and emit `biblozooReadOutput kind:"interrupted" reason:"superseded-by-spoken-verse"` to retire their real JS owners, **not** `ended`, and **not** `biblozooReadLifecycle`. This preserves truthful no-false-verse-end progress. Only **after all effects have stopped**, start the shared `.playback` essential voice lease, then the prepared spoken `AVAudioPlayer`. No incidental effect can continue audibly under the foreground voice lease.
- The prior cap of eight simultaneous incidental player requests remains. Incoming optional clips and generated notes still require `soloAmbient`. No permission or background capability changes, no auto-restart after real iOS interruptions, no WebAudio fallback.
- **Never** preempt music (`crawl-theme`, `crawl-ending`), a Zoo recovery cue, a different verse/narrator, or any unknown source. Those still fail closed as `voice-overlap-unsafe`; no clip is discarded just because the new verse request arrived. No cross-activity/Flashcards change.
- Normal Silent OFF Typewriter's final alert may **end early** when verse starts: this is an intentional minimal tradeoff rather than making optional alert audible under Silent Mode. Earlier key clicks and other normal optional sounds remain unchanged. If the owner wants longer overlapping alert and voice in non-Silent mode, it requires a distinct, user-approved audio design; do not add a category hack.

## Regression and owner acceptance

`node scripts/validate_r16b1_typewriter_effect_voice_handoff.js` is wired into branch CI. It validates the actual Swift source allowlist, preempt-before-lease ordering, no Crawl/voice preemption, optional pool bounds, native clip ID/source cleanup, and a real JS adapter VM scenario: two optional key/alert players interrupted (not ended), spoken verse naturally ended by its own event, and another optional key still reusable. Existing R16a and R16b source regressions are adjusted for the limited exception. Run full N7f/N7g/N7m/R07/R08/R10/Read restoration, Swift parse and production web build. These are not an Xcode iOS SDK link or physical speaker proof.

**After CI green and owner-controlled PR merge**, run a **short iPhone test**:

1. **Silent ON, speaker:** Typewriter final key(s) → actual spoken verse segments, repeated twice. **No Welcome Back** from an ordinary typing action; verse audible; keys/alerts quiet. Check visual progression still waits for true spoken end and no skipped chunk.
2. **Silent OFF:** Typewriter keys normally audible; verse segments start automatically without Welcome Back, no duplicated verse, no zombie sound. The short final alert may be cut at speech start; record observation if distracting.
3. **Balloons/Fish Silent ON:** spot-check one spoken segment to ensure prior pass remains.
4. **Genuine interruption:** During a speaking Typewriter segment, **lock or hold App Switcher**, return: actual Welcome Back must still require a deliberate Let's go tap, no background narration or automatic completion. Do not claim this PASS until reported.
5. **Crawl:** Normal Silent OFF music+voice must still work; Silent ON remains **text only** under current unsolved Crawl boundary. It is NOT a Typewriter acceptance failure; do not mark full R16b complete or change audio policy without a separate owner decision.
6. Optional quick Learn Chunks/Echo Menu, Flashcards RAM voice replay, Apple Music/PiP and AirPods if convenient; no broad retest required for this narrow fix.

**Privacy and release:** Never uninstall or modify original production 10 Zookeeper profiles, separate Audio Test 11 profiles, saved recordings or backups. No new permission, telemetry, user data, audio file output, background mode or external-media takeover. Mark exact installed SHA/route/Silent setting and PASS/FAIL/NOT TESTED in living docs when reported. Keep `ios-prep` and `main` unchanged; R17 acceptance remains deferred until Read's Crawl decision and all owner gates.
