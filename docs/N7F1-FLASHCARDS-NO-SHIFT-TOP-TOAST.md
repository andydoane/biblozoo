# N7f.1 — Flashcards top coral toast, no moving buttons

**Scope:** small Flashcards feedback/positioning polish ONLY on `experiment/native-ios-audio`, after owner-merged [N7f #73](https://github.com/andydoane/biblozoo/pull/73) at `4f496d1222a782192511fb598c96a543efc34e80`. Owner is still preparing to physically test N7f **Read My Verse**; do **not** mark N7f owner PASS based on this PR or automated checks. Build the separate `com.andydoane.biblozoo.audiotest` app, never stable `ios-prep`, main or the original installed app. This intentionally changes only Flashcards feedback presentation and the existing failure-only button layout. Native mic/DSP/Read/Wacky, N6 12/12 standalone + 5/5 Playground already owner accepted, score/Zoo/medals/permissions unchanged.

## Owner request and visible result

The old Flashcards comparison inserted a `<p class="flashcards-recording-note">` underneath **Play My Recording** and above the Re-record/Next action row when `recording.snapshot().message` or `wackyReplayMessage` changed. Since the control area is an auto-sized grid, this shifted the verse and buttons vertically on interruption/error. It also inserted an additional **Continue Without Listening** button *below* the normal row on playback failure. The owner requested the same style as the Zoo-To-Do medal toast but **background `#ff5a51`, white text**, top-of-screen position and disappearance when tapping anywhere, including another button.

The new `.flashcards-feedback-toast` is appended to `document.body`, not into a Flashcards slide or action/grid container. It uses the same **fixed top safe-area placement**, centered max 430px width, 22px corners, floating shadow and soft entrance/exit animation as `.daily-medal-toast` in `daily_zoo_todo.css`, colored coral `#ff5a51` with **white readable text**. It is read-only `pointer-events:none` and never intercepts a child's control taps. A document-level **capture-phase `pointerdown` plus `click`** listener dismisses the toast immediately on ANY touch/button/keyboard activation, with no `preventDefault` or `stopPropagation`; the underlying tapped control still works. Like the medal, it also auto-hides (4.6s) if there is no tap. `role=status`, polite live announcement, reduced-motion static display, cleanup on app inactive/exit/navigation, cancellation of stale timers and replacement of a prior toast are included.

## Which messages are gone versus retained

| Existing behavior | N7f.1 result |
| --- | --- |
| `Playback was interrupted. Tap Play to retry.` after app switch/route | **No extra message.** Play My Recording is present again; the original native `playbackFailed`/complete ownership still protects Next and Wacky. |
| `Recording was interrupted...` after background | **No extra message.** Return to the normal Record screen, not an awkward pushed note. |
| `Countdown was interrupted...` | **No extra message** when Record reappears; no automatic mic restart. |
| `Getting your wacky voice ready...` | **No extra message.** Existing Wacky Replay… button is already the preparation indicator. |
| `Wacky Replay stopped. You can still continue.` | **No extra message.** The real Next button remains. |
| `Wacky Replay couldn't start. Tap Wacky Replay to try again.` before actual output | **Coral top toast** and Wacky eligibility preserved (retry remains possible). |
| `Playback couldn't start. Tap Play to try again.` | **Coral top toast** (once per failure, not every render), Play still retries. |
| `This recording couldn't play. You can re-record or continue.` | **Coral top toast** (once per failure), not in the button grid. |
| `Audio couldn't play. Tap Listen to try again.` on verse preview | **Coral top toast**, no inline difficulty title movement. |
| Mic permission denied / cannot start recording | Existing meaningful **recording fallback dialog / Skip Recording guidance** retained. No silent failure/permission bypass. |
| `Waiting for microphone…` | Remains **in the existing Record/Play button label**, not an inserted paragraph. |

### Stable two-button comparison controls, including failure recovery

Always keep **Re-record** and **Next** in exactly their original positions after a voice take. For a normal **unheard** take, **Next stays disabled** and Wacky cannot unlock. After actual `AVAudioPlayerNode.dataPlayedBack` / Web media `ended`, the normal **Next** behavior is unchanged. On a **genuine failed** recording playback with a take still present, the **existing Next button becomes “Continue Anyway”** and is enabled; no additional third button is rendered. That button uses the former **Continue Without Listening** handler: call `recording.pause()` and advance deliberately to `challenge_complete` without claiming the recording was heard, without unlocking Wacky, and without awarding a hidden grade. An interrupted play may still be explicitly retried; the toast is suppressed when the visible Play button already explains it.

The two large optional audio DEV diagnostic overlays remain hidden by default. The `Wacky Lab` and `Demon / Chorus Lab`, approved D4 Haunted Whisper/C5 Wobbling Chorus native child presets, eleven other native reliability rules, and N7f Read My Verse output are not modified. This PR does not add another toast component to Zoo-To-Do or override its medal styling. Original Web/PWA/Android sound/recording logic stays untouched; the Flashcards message UI itself can apply there when the experiment is deliberately released.

## Fast real iPhone test after owner merges ONLY the experiment

In the dedicated GitHub Desktop experimental worktree, **Pull origin**, then:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build Xcode **App** on physical iPhone under `com.andydoane.biblozoo.audiotest`, not the stable BibloZoo app.

1. Begin normal Flashcards, record a phrase using the real visible 3→2→1 and 16-bar mic meter, stop. At comparison, notice the **verse, Play My Recording, Re-record and Next are stationary**. While voice is normally playing/ending, Next remains properly gated until the complete real take finishes. Wacky still becomes available once, no extra grades.
2. Tap **Play My Recording**, then interrupt it from external AirPods Play, device disconnect or held App Switcher. Return/acknowledge as usual. You should see **Play My Recording** again and the same Re-record/Next row without an unnecessary “Playback was interrupted” paragraph or jumping controls. No automatic re-record/play. Tap Play again; it should retry the actual recorded voice. Real Apple Music priority policy remains.
3. Try to create a **genuine playback refusal** if reproducible: e.g. audio session temporarily unavailable during a real Play or native refusal. A small **top coral toast** should say playback could not start; the main action row must **not move**. **Next** occupies the *same slot* but says **Continue Anyway**. Tap Play to retry, or Continue Anyway to deliberately reach the ordinary self-grade screen **without falsely marking voice heard or unlocking Wacky**. Normal screen does not show Continue Anyway prematurely.
4. If the toast is visible, **tap anywhere**, including Play, Re-record, Next, or a navigation button. The toast should dismiss **immediately**, and the button you tapped should still perform its intended action (no blocked/double taps). If you don't tap, it should fade away automatically. It should never cover the lower action buttons, shift the verse or persist over Home/Welcome Back. Narrow iPhone screens and accessibility Reduce Motion should not jitter.
5. Force a **Wacky startup failure**, if possible without weakening the real audio priority/permission policy: show the same coral top toast and preserve original one-time Wacky eligibility for a retry. If Wacky *already actually started* but is subsequently interrupted, no redundant “You can still continue” paragraph; Next remains visible under the original rules. A Wacky start never by itself grants an unearned grade.
6. Interrupt a recording during 3→2→1 or live capture, or deny mic permission in iOS Settings. A benign return to Record needs no extra “interrupted” paragraph. **Actual permission denial must still show the existing useful fallback/skip guidance**; never auto-start the mic on return.
7. If verse preview **Listen to the Verse** fails, its existing title/options must stay fixed; any actionable retry notice appears at top, not between the Listen button and difficulty options.

**If you cannot reproduce an audio error safely, do not change system settings or simulate a success to force it.** Automated DOM/controller tests cover the failure path; owner hardware verification should focus on normal layout, interrupts, actual taps and sound.

## Automated and subsequent owner gates

`node scripts/validate_flashcards_top_toast_n7f1.js` verifies body-level fixed top toast / exact requested coral-white styling / medal similarity / automatic + capture tap/click dismissal / reduced-motion / screen-hide/exit / no inline status or third control / genuine Next failure gate / no falsely unlocked Wacky and grade, plus a simulated Web DOM/controller. Keep original `validate_flashcards_audio_patch22.js`, `validate_flashcards_patch69.js`, N7c–N7f Swift/Flashcards/Read regression suites, N6 12/12+Playground, both whole-file Swift parse and Production Web build on the PR exact head. Linux tests are **not** Mac Xcode/iPhone acceptance; N7f Read My Verse physical test result is **still PENDING**. Subsequent PR must record actual iPhone result and current merge SHA in `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and the next owner guide. After the owner approves both N7f Read and N7f.1 toast, **N7g** integrated route/privacy/PiP reliability remains the next planned audio milestone.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7f Read output guide](N7F-READ-MY-VERSE-NATIVE-OUTPUT-WACKY-PROMOTION.md).
