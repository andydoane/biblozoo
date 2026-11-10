# N7g — Integrated native iOS audio reliability, replay lifetime and privacy gate

**Status:** code/tests in an unmerged PR targeting **only** `experiment/native-ios-audio` (separate iOS experiment bundle `com.andydoane.biblozoo.audiotest`). Owner Mac Xcode SDK/iPhone integration acceptance **PENDING**. Based on owner-merged [N7f.2 PR #75](https://github.com/andydoane/biblozoo/pull/75) at `b5a20006980ba8631dfb9c1b10a875fd8078413a`.

## Current actual owner findings

Owner reports **N7f.2 issues resolved, things working well**, after personally merging and testing #75 on a physical iPhone. The held-App-Switcher Balloons/Underwater/typing concerns and waveform audition differences can be **closed for the scope reported**; owner listened to the six native waveform alternatives and explicitly chose to **keep the CURRENT native sounds** for Unscramble and Tap Words in Order. No wave shape is promoted and none of the child-facing sounds changes. This is not an all-scenarios N7g integration acceptance. The separate N7f.1 coral Flashcards toast was previously merged; no specific new owner physical toast result is attributed without an explicit report. Preserve already owner-accepted **N6 12/12 standalone plus Playground 5/5** and original Flashcards Wacky D4 Haunted Whisper / C5 Wobbling Chorus.

## What the N7g audit found and fixes in this PR

Rather than rewrite or re-tune the successful native audio engine, N7g fixes **real lifecycle and stale-callback weaknesses** in `verse_games/shared/native-read-my-verse-output-n7f.js`. All iOS Swift DSP, microphone and AVAudioSession policy stay unchanged.

1. **Avoid retained temporary Read media owners.** Previously every `new NativeAudio`—including hundreds of short Typewriter/Keyboard key-click wrappers never played—was inserted in a global `clips` Map until activity-wide `stopAll()`. Completed/paused clips also remained strongly referenced. Now a media object joins that Map **only for an active playback attempt**, and is removed on actual native `ended`, interrupted, manual `pause`, OS inactivity and `stopAll`. Passive constructors consume zero registered audio owners. This bounds references to current active players during long Read sessions, not the total lifetime number of key sounds created.
2. **Distinct ID on every native play, not every media object.** Replaying the same HTMLAudio-like object (for a Verse Crawl/verse preview retry) formerly reused the same `requestId`: a delayed native `ended` or `progress` from the old player could falsely complete/seek the new player. Each native `play()` now gets a **new opaque request ID**. Late progress/end/stop returns for the previous attempt cannot finish a new verse clip, prematurely change Next/grade, or kill a new Play.
3. **Correct completed replay vs interrupted resume.** If the current clip has **actually ended**, replay begins at time zero, not the previous `duration`/end-of-file; if it was **paused/interrupted**, the original native media clock position remains available for Read's existing explicit Welcome Back/seek recovery. No event is fabricated and `playClip(started:true)` is still only an acceptance ACK—not listened-to success.
4. **Cancel delayed native cues after route/lock/Exit.** An Unscramble or Tap Words note can be queued while `activateFromGesture()` is still resolving. Previously `stopAll()` or an external AirPods Play could clear `activation`, but the queued promise still invoked native `playCue` when the old activation eventually resolved. A monotonically increasing `lifecycleEpoch` now invalidates the exact pending claim on `stopAll`, `visibilitychange`, `UIApplication.willResignActive` or a new explicit activation. Genuine child Start/Resume still works; no passive background priority takeover, new category or auto-restart.
5. **Validate source changes.** A reused local `NativeAudio` with its `src` changed previously kept its old `_clipId` and could play a different bundled verse than the path displayed. The standard `src`/HTML `setAttribute('src',...)` path now stops the old owner, updates the strict native published/fixed sample allowlist and resets duration/clock. Unknown URLs/paths fail closed: no network, raw PCM or file output.

**No new features and no sound choices:** normal child Read Wacky/typing/beeps/Verse Crawl audio values remain exactly as tested. N7f.2 DEV Read Beep Lab still contains the six original audition options, but no new selection/preference is saved and no default `playCue` waveform is changed. N7f.1 top coral `#ff5a51` Flashcards toast and fixed Next slot are untouched.

## What is deliberately unchanged

- Native Swift output plugin and native session `.soloAmbient` (no mix/duck, no `.notifyOthersOnDeactivation`). Only explicit Start/Resume Audio/Record/Play or opt-in DEV sample tap can claim audio priority; genuine external AirPods Play may take it away without BibloZoo automatically restarting.
- Flashcards native `AVAudioEngine.inputNode` remains **microphone-only in exact `.audiotest` bundle**, gated by actual Record tap, explicit permission, mono bounded Float32 RAM, one opaque take ID/12M-frame cap/120s watchdog, no mic-to-speaker monitor, file, upload, JS PCM bytes or cloud/profile persistence. `discardCapture` erases samples/take ID and late requests on Exit/Re-record; true native `.dataPlayedBack` still determines normal recorded-voice Next and Wacky eligibility. Original Web/PWA/Android `MediaRecorder` untouched.
- Read My Verse remains output-only; published `public/verse_data` IDs and `public/verse_audio` MP3 allowlist, source-original Web activities/progress/rewards, real native AVAudioPlayer delegate events, and original Welcome Back are not rewritten.
- All 12 N6 standalone, five Playground, Feeding, Learn and already approved Flashcards effects remain untouched. Do not modify `ios-prep`, `main`, original installed app or Android/PWA. DEV audio panels remain compact and hidden unless explicitly opened.

## Real iPhone owner integration checklist after merge

In the **separate native audio experiment** Mac GitHub Desktop worktree, **Pull origin** and run:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build Xcode's **App** scheme on a physical iPhone with bundle ID **`com.andydoane.biblozoo.audiotest`**, not the stable installed BibloZoo. CI's Swift `swiftc -frontend -parse` is Linux grammar parsing, **not** Apple UIKit/AVFAudio typecheck, Xcode linking or evidence of speaker sound.

| Gate | Owner physical check |
| --- | --- |
| **Flashcards capture / privacy** | Record/3→2→1/16-bar mic meter, actual dry Play My Recording full native end before Next, Re-record/Stop/Delete RAM take, interrupted countdown or actual mic on held App Switcher/lock; no automatic microphone restart. |
| **Flashcards Wacky / UI** | Once-only random Wacky, owner-approved Haunted Whisper Demon and Wobbling Chorus Alien, no premature Wacky on a silent failed start; coral `#ff5a51` top toast dismisses on tap without moving Re-record/Next; genuine failed playback uses same-slot Continue Anyway but cannot fake heard/grade. |
| **Read multi-activity** | Typewriter/Keyboard key clicks and actual spoken chunk, Unscramble/Tap Order unchanged native tone, Chunk Sequence, Balloons/Underwater moving words/scene, Verse Crawl native music+narration+ending overlap, real audio end/clock; no duplicated next/score/Zoo after interruption. |
| **Read replay/cleanup (new N7g focus)** | In one lengthy Read session repeatedly play/pause/replay the **same** Listen/verse or Crawl-like sound; after completed replay it should restart from the beginning. After interruption and explicit Resume it should preserve sensible position, not instantly finish due to an old event or fail to receive new completion. Tap many keys; app should not progressively bog down or leave ghost audio. |
| **iOS held App Switcher / lock** | Hold partial App Switcher 3–5s mid-Balloons, Underwater, Typewriter and Crawl; motion and media stop promptly and do not fast-forward; app only restarts after explicit Welcome Back. Repeat a full app switch and lock/unlock. |
| **External audio priority** | On speaker and AirPods: launch Apple Music or YouTube PiP before a deliberate BibloZoo playback; genuine gesture takes audio appropriately and normal end doesn't cause automatic external resume. External AirPods Play while recording/reading should interrupt; no automatic BibloZoo session reclaim by a delayed word cue. Disconnect/reconnect Bluetooth, verify fresh user tap can recover, never ghost notes. |
| **Leave/re-enter boundaries** | Leave Read during an active MP3 or queued Unscramble note, enter Flashcards and Record, then return to Read on fresh Start; repeat in reverse. No old verse completion/old click after Exit, no speaker feedback while mic captures, no frozen/duplicate reward, one activity owns its media. |
| **Existing accepted baseline** | Make one smoke-test pass across Learn/Feeding and a sample N6 standalone+Playground game; accepted 12/12 and 5/5 source sounds unchanged. No unexpected file/backup/export/microphone permissions. |

**Report** any issue with exact activity, speaker/AirPods route, whether YouTube PiP was still playing, whether task switch was HELD, and what you expected compared to what occurred. A genuine failure still must allow safe Retry/Back without granting phantom score or Zoo rewards.

## Automated gate and readiness status

New `node scripts/validate_native_n7g_integrated_audio_lifecycle.js` **runs the actual native JS facade** against a fake Capacitor bridge: 500 passive Audio constructors register **zero** active owners, 40 completed key clicks free the last active owner, replaying the same object receives distinct IDs and rejects stale events, completed replay seeks 0, interrupted replay can seek, `stopAll` and fresh Start work, a changed `src` revalidates bundle keys, queued cues and late Play ACKs cannot trigger after Exit, real `willResignActive` invalidates output before WebKit reports hidden, strict RAM mic/session/output source contracts and unchanged browser path. N7f2/Read Patch20/70, N7f1 Flashcards, N7e/Wacky, N7d.2 audio priority, N1–N6, both whole Swift parsers and Production Web build remain mandatory.

**CI passing is code verification, NOT final native audio migration PASS.** Owner Mac Xcode + hardware steps above are still required. If all evidence is good, **N7g can be marked owner PASS and the isolated N7 native audio migration can be considered ready for a separate explicit integration/release decision**. Do not silently merge into `ios-prep`/main or remove DEV controls without a separate owner-approved plan.

[Living project handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7f.2 accepted-scope device guide](N7F2-READ-EARLY-PAUSE-WAVEFORM-LAB.md).
