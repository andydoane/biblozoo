# N7i — Choose a New Verse speaker button, native-only full-verse preview

**Experiment only:** `experiment/n7i-native-new-verse-picker-preview` → `experiment/native-ios-audio`, verified target base **`5d043b959474e95bb98601bfcd7fd9881e149af7`** (merged N7h PR #77). Original `ios-prep`, `main`, Web/PWA/Android and original installed app are not release targets. Experimental bundle ID `com.andydoane.biblozoo.audiotest`. **Owner Mac Xcode compilation and physical iPhone speaker PASS pending.**

## Exact bug and scope

The owner identified **Problem #1** on the **Choose a New Verse** screen: each pet-and-verse rounded card has an independent speaker button at its top-right; tapping currently opens **"Verse audio unavailable"**. The user's 2026-11-10 eight-page native sound checklist (Session 1, page 2) already identified this particular `app.js` picker `new Audio(...<verseId>.mp3)` as a KNOWN SOURCE GAP, distinct from N6a's native Verse Detail and Flashcards preview. Our source review confirms the cause: N1 intentionally rejects all `HTMLMediaElement.play()` for the Audio Test app. A generic UI pop is not the missing verse narration.

**Design:** Reuse `window.BibloZooNativeLearnListen.startFromGesture({ verseId, stage: "verse", onEvent })`. This uses the existing N5b.2 `BibloZooNativeSound` Swift `AVAudioPlayer` narrator, exact `learn-verse-<verseId>` published-verse validation and bundled `public/verse_audio/<verseId>.mp3` asset. `stage: "verse"` deliberately **skips reference narration**, matching this picker button's original full-verse-only behavior. It invokes native session activation **synchronously during the real speaker tap**, not during rendering or after an asynchronous callback. No new Swift player, audio category, mic, PCM JS output, Web/HTML audio fallback, or permission prompt.

The original `new Audio` branch remains intact for ordinary Web/PWA/Android; the isolated iOS path returns early before that branch, even if the native plugin is unavailable/denies a tap. Existing UI/ARIA state **Listen to [reference] ↔ Stop listening to [reference]**, independent card selection, Stop on same button, switch to another verse, mute, navigation, pagehide and visibility-change cleanup are preserved. Native `completed(stage:"verse")` is the sole *successful* end; `interrupted` stops quietly and `failed` or a real activation/preflight refusal shows the same understandable Unavailable popup while leaving verse selection available. Token + exact current handle reject late replies from old verse/exit/lock. Never interpret a native accepted/request promise as proof audio was heard.

This applies to both **Choose a New Verse** and the **Change Verse** picker variant, which share `newVersePickerCardHtml` and `toggleNewVersePickerPreviewAudio`. Selecting the large card still selects/starts learning as before, never rewards on the speaker tap.

## Automated validation

`node scripts/validate_native_new_verse_picker_n7i.js` runs a VM of the **actual picker function block copied from `app.js`** using fake Capacitor native/full-verse and original Web Audio owners. It validates same-card Stop, two-card switching and stale events, full verse only (no reference), proper pressed/label state, native genuine end vs refused/interrupt/hidden/late completion, no Web audio on iOS when missing native bridge, mute and non-selection, original Web/PWA full-verse playback and bridge/scoped file contracts. Native experiment GitHub Actions also runs the existing full Node regression suite, Swift grammar parse and production web build. **Neither mocked tests nor Linux Swift parsing proves macOS/iOS SDK compilation or audible iPhone output**. Check final PR HEAD run before declaring CI success.

## Owner physical iPhone checklist — after review and merge

Use the **Audio Test** worktree and bundle. In GitHub Desktop, switch to `experiment/native-ios-audio`, Pull origin, then:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build Xcode **App** on a real iPhone as `com.andydoane.biblozoo.audiotest`. Do not overwrite original BibloZoo.

1. Enter **Choose a New Verse**, tap the top-right speaker on a John 3:16 card. **Hear the original FULL verse** through native playback; no "Verse audio unavailable" on a valid start, no reference prelude; button reads Stop while active and returns to Listen after actual end.
2. Tap the *same* speaker to **Stop** mid-verse. Tap it again to replay from start. Switch mid-play to Psalm 23:4; hear **only the new verse**, not a John 3:16 tail. No automatic card selection, profile change, learned status or Daily Zoo reward.
3. Open **Change Verse** mode and verify a card speaker too. Press the large pet/verse card while preview is playing; selection/navigation works as before, narration ceases immediately and does not follow the child into Learn.
4. Test **Mute ON** (quiet, sensible Sound is off dialogue), unmute and deliberate fresh tap, Back/Home/Next or screen navigation, hidden/full background, held half App Switcher gesture and lock/unlock. No late "Unavailable" popup after leaving, no ghost narration or automatic restart.
5. Listen on the iPhone speaker, then AirPods/Bluetooth. Try external Apple Music or still-playing YouTube PiP and AirPods Play interruption. Only a fresh deliberate speaker tap may reclaim priority using the preexisting `.soloAmbient` policy; no background takeover or stale late clip.
6. Smoke-test **BibloPet Detail** and **Flashcards difficulty Listen** (N6a), **Daily Questions native** (N7h), and standard Learn Listen. They share the existing native narration owner; ensure their reference→verse sequencing remains correct. Web/PWA/Android preview should still use the original browser `Audio` path.

**Owner PASS/PENDING:** N7i hardware not yet tested in this PR. N7h PR #77 **merged** at `5d043b959474e95bb98601bfcd7fd9881e149af7` with [merge-head CI success](https://github.com/andydoane/biblozoo/actions/runs/42933089989), but Daily Questions device acceptance remains **unreported**, not automatically PASS. N7g's comprehensive integration hardware gate remains independently pending. Record any iPhone failures and update the living handoff in the next PR.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N7h gate](N7H-NATIVE-DAILY-QUESTIONS-AUDIO.md) · [N6a gate](N6A-NATIVE-VERSE-PREVIEWS.md).
