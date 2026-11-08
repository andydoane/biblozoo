# N5b.2 — Native Learn Listen reference + verse (PR #34)

> Experiment only, owner review required. Base `experiment/native-ios-audio` after [N5b.1 #33](https://github.com/andydoane/biblozoo/pull/33), merged `af38f56a`. Xcode target must be separate `BibloZoo Audio Test` `com.andydoane.biblozoo.audiotest`. Stable `ios-prep`, `main`, original installed BibloZoo untouched.

## Owner evidence and purpose

On November 7 the owner merged N5b.1 and **reported every on-device DEV John 3:16 test performing successfully**: actual spoken audio, advancing position, Pause/Skip +5s/Continue, true natural end, App Switcher and full-task-switch stoppage, DEV-close cleanup and regression checks. N5a UI taps/Feeding also passed previously; a first silent pop after cold launch/return is an expected short-prewarm compromise, still N9 UX debt.

This PR connects N5b.1's long-form AVAudioPlayer to the actual child **Learn → Listen** sequence. The source of truth for eligible verse IDs is the **locally bundled** `public/verse_data/verse_list.json`, with each verse's `published: true` JSON and `public/verse_audio` files; that entire folder is already packaged by Capacitor as the Xcode `public` Resources folder reference. N5b.2 accepts only `learn-ref-{verseId}` and `learn-verse-{verseId}`; DEV fixed `learn-john-3-16` remains available. No JS-provided arbitrary file paths, media URLs, track IDs, audio category change or Web/HTML output fallback.

In the isolated native app, Learn Listen shows a real **Tap to Play Verse** button rather than trying to activate after an asynchronous slide. A single genuine tap synchronously activates the existing native session, preflights the published reference clip, then plays it. Only the matching native **reference ended** callback prepares/plays the full verse within that still-active session, with no second/automatic activation. Only the currently owned native **verse ended** callback may advance to the original Meaning instruction. The old HTML `audioEl.ended` must never award progress in native mode.

Native `getNarrationState` positions are sampled for local interruption checkpointing; a resolved `play()`/UI tap or a moving clock alone is not speaker proof or Learn completion. On iOS App Switcher **inactive**, hidden, route/interruption or pagehide: invalidate old request, hold the current reference/verse and latest position, show existing source-owned **Welcome Back**. Only a *new explicit* **Let's go!** tap may reactivate/re-prepare/seek that same track. A stale prior completion, paused state or expired request can never auto-complete Learn. Mute and screen navigation stop the native source and require a new user action to listen.

**Not included:** native Learn short instructions, two Chunks passes, Echo pacing, Hide/Final Recall audio timing, verse-detail previews, other games, pet unlock, recording/mic/DSP. These remain their existing JS owners and native-only experimental Web output restrictions. Web/PWA/Android keep original HTML narration behavior. Next N5b.3 handles chunks/Echo/instructions after owner N5b.2 device acceptance.

## Code/CI gate

From the dedicated `biblozoo-native-audio` worktree with the PR checked out, or after owner merge and Fetch/Pull `experiment/native-ios-audio`:

```sh
node scripts/validate_native_learn_listen_n5b2.js
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

CI must pass complete Node regression suite and production web build on final PR HEAD, but **CI does not compile Swift, verify Xcode Copy Bundle Resources with live audio, or establish actual speaker output**. Xcode building and on-device listening are separate owner gates.

## Physical iPhone test — to be repeated in the chat

1. Confirm Xcode target is **BibloZoo Audio Test** with bundle ID `.audiotest`, build and launch on a physical iPhone. Original BibloZoo should remain installed separately. 
2. Choose a published verse such as **John 3:16**, open its normal **Learn** process and continue until **Listen**. On the native app, the existing `Tap to Play Verse` / `🔊 Read it to me` button should be visible. Tap it exactly once. **Hear the verse reference first**, followed automatically by **the full spoken verse**. The UI must not need a second gesture between the clips, must not duplicate the verse, and must proceed to the original **What It Means** instruction only **after** the true full-verse end. Note that the *short instruction narration* has not been migrated and can be silent; the instruction text and button should remain usable.
3. Repeat with a second published verse (e.g., **Psalm 23:4**). It must speak **the second verse**, not reused/cached John 3:16, and preserve the child's verse selection. No new pet, Learn completion credit, lost progress or changed scores simply from audio preflight.
4. Restart the Listen pass, then **swipe up and HOLD** to show iOS App Switcher thumbnails *mid-reference*. Speech should stop/freeze, **Welcome Back** should appear (immediately even in the thumbnail when supported). Return to the app: it must not auto-speak. Tap **Let's go!** once; hear the **reference continue around the last spoken position**, followed by the correct full verse, without a stale or double Meaning transition.
5. Repeat the swipe-and-hold **mid-full-verse**. After an explicit Let's go!, hear the **same verse resume around its position** and finish once. Repeat with a **full switch to another app and back**. It should never restart from the reference unexpectedly or auto-advance from an old completion. An approximate checkpoint is acceptable (JS polls native position), but wrong-verse sound, silence without retry, or skipped passage is not.
6. Test **mute** during Listen: no further narration while muted. Unmute/explicitly resume as prompted and confirm native sound returns. Test Learn **menu open/close** while speaking: speech stops and must not restart on menu close without your explicit gesture. Rapidly Back/Exit Learn and select a different verse: prior narration must stop, no old ended event advances the new verse.
7. Regress **DEV John 3:16** Play/Pause/Skip +5s/Continue/Read position and DEV panel ×. Confirm ordinary native UI pops (cold first pop may be silent), plus Classic, Melody, Labyrinth, Bounce gameplay and App Switcher Resume. On Web/PWA/Android the original Listen behavior must remain if those platforms are available.
8. If a clip is missing or native activation/seek fails, do not claim Learn passed. The child should retain a **Tap to Play Verse** retry or a visible **Welcome Back → Try again!** prompt without automatically crediting completion or silently switching to Web output. Before restarting, use DEV **Inspect native state** and **Copy Audio Timing Report**; note which verse/clip failed and what was actually heard (the old timing ring mainly covers short effects, not acoustic narration latency).

**Merge rule:** Owner alone reviews and merges PR #34 after final CI and real Xcode/iPhone acceptance. Every PR updates `docs/PROJECT-HANDOFF.md` **in the same PR** and appropriate testing/recovery docs. Next N5b.3 children’s Chunks/Echo/instruction narration; N6 games, N7 mic/DSP, N8 independent Zoo, N9 reliability.
