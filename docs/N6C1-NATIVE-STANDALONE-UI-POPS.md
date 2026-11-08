# N6c.1 — Native-only UI pops on Scripture Snake and Bible Bugs title/difficulty screens

> **PR:** [N6c.1 #41](https://github.com/andydoane/biblozoo/pull/41). **Scope:** Isolated `experiment/native-ios-audio` / `BibloZoo Audio Test` only. This fixes an owner-observed post-N6c gap: both Scripture Snake and Bible Bugs have **silent title/start and difficulty/mode button taps** even though Bible Bugs' end-screen tap is audible and gameplay worked in the owner-tested scenarios. Owner review/merge and real iPhone hearing are required. **This is not a Web Audio fallback or a claim that final sound latency is measured.**

## Diagnosis and deliberately narrow change

Both standalone games already call their UI tap functions, and both native output controllers map `uiTap1/2` to the existing fixed Swift `ui-pop-1/2` PCM clips. The game controllers previously rejected `play()` until their **whole game-effect bank** was prepared; the child encounters title/mode buttons *before* that bank is ready. The shared `game-shell.js` supplies callbacks but is not itself shown to be the cause.

N6c.1 adds two compatible paths **inside each existing native game controller**, using the **same** sole Swift `.soloAmbient` session and serialized `AVAudioEngine` effects worker:

1. A **title/Back gesture** synchronously calls the existing `activateFromGesture({purpose:"ui"})`, prepares the two existing fixed UI PCM clips only, and schedules the pop when prepared. This is UI readiness, **not** game-effect readiness. A cold first click whose prep exceeds the existing N5a **350ms** UI deadline deliberately drops the late pop instead of playing it on the wrong screen; remaining first-tap reliability is separately N9.
2. On **Choose Difficulty / Game Menu Close / Snake speed Close**, the real click synchronously calls the existing `activateFromGesture({purpose:"game"})`. It settles any prior title preparation, prepares the two UI IDs, schedules that tap's native pop, and only then prepares the remaining game effects. **Never start or resume gameplay before the entire bank reports prepared.** Failed native UI preflight/play stays on the original screen with the existing failure-only **Try Again/Back** (not routine gray success UI).
3. Duplicate rapid taps, title-to-difficulty races, Back, mute, UIKit App Switcher `.inactive` while WebKit may look visible, pagehide and stale Promise resolution cannot automatically replay old pops, start games, or activate on foreground. Existing gameplay/score, frogs/snakes/bonus/rewards, mute, and plain **Welcome Back → Let's go!** same-round recovery remain.
4. No new Swift plugin, session category/engine, dynamically selected filenames, synthesized Web Audio, Web/HTML fallback, microphone, N8 Zoo surprise behavior, asset change, game rule or stable app change. Browser/PWA/Android keep their original Web Audio paths. UI-pop `accepted` is **not** human acoustic proof.

## Automated source/VM gate

```sh
node scripts/validate_native_standalone_ui_pops_n6c1.js
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_snake_quiet_preflight_n6b1.js
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_only_ios_output.js
npm run build
```

Experiment CI includes the new exact-source/VM script and the existing historical regression suite/production build. Distinguish CI from a Mac Xcode Swift compile and human-heard output.

## Owner's full physical iPhone acceptance (give these steps in ChatGPT too)

In GitHub Desktop, switch the separate **`biblozoo-native-audio`** Mac worktree to `experiment/native-ios-audio` **after owner review/merge**, Pull Origin. At repository root run `node scripts/validate_native_standalone_ui_pops_n6c1.js && npm run build && npx cap sync ios && npx cap open ios`. In Xcode build **BibloZoo Audio Test**, bundle `com.andydoane.biblozoo.audiotest`, and run on a real iPhone; do not replace the original BibloZoo app.

1. Start **Bible Bugs** John 3:16. Tap **Start/Play** on the title: listen for a native UI pop. On **Choose Difficulty**, select **Easy**: hear its own pop **before the frog/tongue gameplay**, not a late sound several seconds after entering the round. There must be **no routine gray loading dialog**, no game movement until the game bank is ready, and no extra double pop. Try title/mode **Back**, then Start and a different difficulty again.
2. Repeat in **Scripture Snake** John 3:16: audible title tap, each difficulty-selection tap and Back/retry navigation; no unwanted gray success popup or silent/incorrect round, and correct original snake movement/score. Try Medium/Hard in at least one of the games and Psalm 23:4 to catch cross-mode/verse errors.
3. During an active round, open **Game Menu/How to Play** (and Snake speed menu), then tap **Close**. No ghost/double pops, no sound while paused; Close should pop as native preflight occurs and resume **exactly the same** positions, timer, score and mode only when the full bank has prepared. Verify game collision/word/bug/snake orb/bonus effects, and the **Bible Bugs end-screen pop** that already worked. Confirm original medals/rewards.
4. Mute and unmute using the actual controls: muted UI/game effects intentionally quiet, no hidden Web/HTML fallback. After unmuting via a real gesture, native sounds recover. Exiting a game must not produce delayed sounds in the parent screen.
5. **Swipe up and HOLD** to the iPhone App Switcher while a bug or snake moves, including when possible immediately after a title/mode tap. The game pauses promptly with the usual **plain Welcome Back** in its thumbnail; return must not auto-play a delayed title pop or automatically restart a round. Only **Let's go!** re-prepares native effects and resumes the same round without clock catch-up or a second gray success modal. Repeat with a full switch to another app and back, including while muted.
6. Rapidly tap mode/back/another mode while early preparation is pending, if perceptible. A stale completion must not launch the wrong mode, make a delayed pop on another screen, or clear the newer sound bank. Controlled VM tests cover races too fast to reproduce reliably by hand.
7. Brief regression: all four Feeding modes (especially Bounce), Learn John 3:16 instruction/Chunks/Echo, Psalm 23:4 return, BibloPet Detail/Flashcards native verse Listen, N5 UI pop in main app, DEV narration. Original Web/PWA/Android and stable `ios-prep` remain unchanged.
8. If any silence, unexpected native retry, or wrong recovery occurs, **before restarting**, use **DEV → Inspect native state** and **Copy Audio Timing Report**, record what was heard (or silent), whether first cold start or warm/retry, title/mode/menu/end, app switch type, and game state. `scheduled`/ `accepted` means native dispatch, **not a speaker measurement**.

## Stop/go

- **Automated source CI:** full Node regression suite and production build **GREEN at code HEAD `9d9b7de8`** ([Actions #42445808256](https://github.com/andydoane/biblozoo/actions/runs/42445808256)); verify final documentation-only HEAD rerun before owner merge.
- **Swift Xcode compilation and physically audible iPhone acceptance:** owner pending.
- **If passed:** N6d one additional standalone game at a time. If title cold first-pop still sometimes drops past 350ms, keep that bounded policy and track separately as N9 reliability; do not claim universal first-tap resolution.

The current living status and next-chat orientation belong in [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md); the handoff must be updated **in every PR and after owner-reported post-merge tests**.
