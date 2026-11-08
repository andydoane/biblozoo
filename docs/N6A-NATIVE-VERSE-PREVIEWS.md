# N6a — native Verse Detail & Flashcards shared verse previews

> Owner review and physical iPhone acceptance for [N6a PR #36](https://github.com/andydoane/biblozoo/pull/36) (PR number verified when opened). Isolated native-only Audio Test on `experiment/native-ios-audio` from owner-merged [N5b.3 PR #35](https://github.com/andydoane/biblozoo/pull/35), `c9810257e36fa5e2bf342c6c5060b2eaf4bf2098`. Stable `ios-prep`, `main` and original app untouched. **Owner alone reviews and merges.**

## Owner baseline and scope

Owner's latest real iPhone report: after merging N5b.3 #35, John 3:16 and Psalm 23:4 Learn flowed with *all* short instructions and chunks audible; the owner completed the full John 3:16 Learn flow and tested Psalm 23:4 interrupted recovery successfully. No fresh Zoo Break issue was reported. These are meaningful **owner-heard pass reports** for N5b.3; they do not measure absolute acoustic latency, prove all verse assets/devices, or automatically approve unrelated modes.

N6a migrates one additional **existing shared API** that two activities call: `playVerseDetailListen(verseId)` and `cancelVerseDetailListen()` in `app.js`. The BibloPet/Verse Detail **Listen to the Verse** button and the Flashcards difficulty-screen **Listen** button already invoke this exact shared function. It was still playing Web `audioEl` files, which N1 blocks in the isolated native-only iOS build. N6a uses the owner-tested `BibloZooNativeLearnListen` source owner *only* on native-only iOS; Swift already validates bundled published verse IDs and local reference/full-verse assets, so **no new asset, no Swift session policy, no duplicate narrator implementation** is necessary.

- Native `startFromGesture` is invoked synchronously inside the existing genuine Verse Detail or Flashcards button tap, via Swift `activateFromGesture({purpose:"learn"})`. Only vetted `learn-ref-{verseId}` followed by `learn-verse-{verseId}`; no arbitrary caller URL/path and **no Web/HTML fallback**. The native owner's requestId + soundId and active/inactive guards still prevent stale or wrong-verse `ended`.
- Shared Promise still resolves **true only on the current full-verse native ended callback** and **false** on denied activation, failure, explicit Stop, background, screen navigation, or source cancellation. This preserves the existing Flashcards `await api.playVersePreview(selected.id)` plus visible retry text.
- Verse Detail displays an optional accessible status under its original button, switching to **Stop Listening** during active speech and back afterward. Second tap stops, not a duplicate new start. On refusal, a plain **Sound isn't ready...try again** status appears without crediting a game, pet, learning or Flashcards record.
- Preview interruption intentionally **does not resume automatically** and **does not summon Zoo Escape**. Tap Listen again to restart the preview reference and verse from the beginning. This is different from the full Learn flow's checkpointed explicit Welcome Back. Flashcards remains its own existing navigation/retry owner. While the app is backgrounded, native output stops; no task-switch ghost audio.
- The existing Web/PWA/Android HTML reference→verse implementation remains unchanged. No native Flashcards microphone recording, Wacky Replay, Read My Verse, game effects, Garden/Zoo surprise, `.soloAmbient`, progress/reward, or original installed app changes.

## Source and build gates

Run in dedicated `biblozoo-native-audio` worktree with PR branch checked out before merge or, after **owner merges**, Fetch/Pull `experiment/native-ios-audio`:

```sh
node scripts/validate_native_verse_previews_n6a.js
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_learn_listen_n5b2.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

GitHub Actions also runs all earlier N1–N5b.3 Node/source/VM regressions, ordinary Flashcards/recovery tests and production web build. **Neither these Linux checks nor the new VM harness compile Swift or demonstrate actual audible speaker output**; a physical iPhone and Xcode owner acceptance are essential.

## Physical iPhone test checklist — include these steps directly in ChatGPT

1. Confirm you are launching **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on a physical iPhone. Original BibloZoo should remain a separate installed app.
2. Open **BibloPet Zoo**, select John 3:16's BibloPet/verse detail, tap **Listen to the Verse**. **Actually hear** the spoken Bible reference **once**, followed automatically by the complete John 3:16 verse **once**. The button should change to **Stop Listening** while it plays; a status indicates reference or verse. When the full verse ends, the button returns to Listen. **Do not** change progress, verse completion, pet stats or rewards merely by hearing a preview.
3. Repeat the same detail preview with **Psalm 23:4** and ensure it speaks *Psalm 23:4*, not cached John 3:16. Repeat quick preview start→**Stop Listening**, and tap Listen again: it should restart cleanly, with no late old completion or overlapping voice.
4. While Verse Detail is speaking reference or verse, swipe up and **HOLD** in iPhone App Switcher. Audio must stop immediately. Return: **no automatic speech, no automatic Zoo Break**. The **Listen to the Verse** button is available to restart the preview from the reference deliberately. Repeat by switching fully into another app, returning, tapping again, and listening through.
5. Exit the Verse Detail screen mid-preview (Back to Zoo), open another BibloPet, and listen: no old verse may continue under the new screen. Test mute/unmute: muted preview should not start or trigger native session, unmuted new user tap can play.
6. Open **Flashcards**, select John 3:16, reach the difficulty-selection screen with its **Listen** button. Tap it. Hear reference then whole verse using native output. The original Stop button should stop that exact preview; Listen again should retry. After natural full-verse end, the button should become available again without a false error. Repeat with Psalm 23:4; ensure Flashcards selection stays correct. There should be no accidental recording/microphone start, difficulty/score change, badge or completion credit.
7. Interrupt Flashcards preview with App Switcher swipe-and-HOLD, return, and retry with a **new** Listen tap. It should **not** auto-resume, auto-record or enter Zoo Escape. Navigate Back/change Flashcards verse during playback and confirm the old preview stops.
8. If native activation/bundled file fails, **no Web/HTML fallback** should produce sound and there must be no false completion. Verse Detail shows **Sound isn't ready. Tap Listen to try again.** Flashcards already shows **Audio couldn't play. Tap Listen to try again.** Make sure both allow a new genuine tap to retry.
9. Regress **Learn** auto reference→verse, short instructions, both Chunks passes, Echo timing, John 3:16 full flow, Psalm 23:4 App Switcher recovery, DEV long narrator, native UI pops and Classic/Melody/Labyrinth/Bounce. The first UI pop after cold launch/task switch is still sometimes intentionally omitted under N5a's 350ms prewarm deadline (N9 debt); no such silent-first-pass excuse for verse previews.
10. If a preview is silent, repeats/wrong verse, or won't recover, before relaunch use DEV **Inspect native state** and **Copy Audio Timing Report**, and note whether the source was **Verse Detail vs Flashcards**, the selected verse, reference vs full verse, when the real gesture occurred, and what you actually heard. The short-effect timing ring is **not** an acoustic measurement of long spoken narration.

**Next N6 slices:** migrate one standalone game at a time, then Playground, daily and remaining media playback; **N7** separately addresses Flashcards/Read My Verse microphone/capture and DSP, **N8** independent Zoo surprise design, **N9** reliability. Never quietly re-enable old Web audio in `.audiotest`, change `.soloAmbient`, or merge a PR for the owner. Each subsequent PR updates [the living handoff](PROJECT-HANDOFF.md) **in the same PR**.
