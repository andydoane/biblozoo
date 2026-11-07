# N5a — Native UI pops and quiet Feeding screens (PR #32)

> **Experiment only.** Review PR #32 into `experiment/native-ios-audio`; never into `main` or stable `ios-prep`. The iPhone target must be the separate **BibloZoo Audio Test** bundle `com.andydoane.biblozoo.audiotest`. This PR is not a claim of speaker audibility until the owner actually hears the output.

## Starting point and scope

N4c Bounce [PR #31](https://github.com/andydoane/biblozoo/pull/31) was owner-merged as `99130c01`, and on November 7 the owner reported **all post-merge Bounce tests positive**. The four Feeding mode audio integrations (Classic, Melody, Labyrinth, Bounce) are accepted to the extent covered by owner device testing. The first N5 slice is **only app-wide eligible tap/pop effects**: the existing two `ui_sound_pop_*.mp3` files in `ui_audio/` are bundled as fixed `ui-pop-1` and `ui-pop-2` IDs and predecoded/warmed with the existing single native Swift `AVAudioEngine` PCM pool. The app's global capture-phase touch/pointer and keyboard selector still determines eligible controls and excludes `data-no-ui-sound`.

A genuine eligible tap calls the native UI controller, which asks the **existing** `.soloAmbient` session owner to activate with `purpose: "ui"`, preloads both fixed samples once and only plays if the original tapped control is still valid and less than 350ms has elapsed. When preflight takes too long the first tap can be **deliberately silent**, rather than producing a late ghost pop. Later taps reuse the prewarmed resource. Never infer sound heard from native `prepared`/`accepted`/`scheduled` status. iOS Web/HTML output remains blocked globally with **no fallback**. Web/PWA/Android retain original decoded Web Audio sample/fallback behavior.

An iOS App Switcher inactive/active signal, blur, visibility loss or pagehide invalidates pending callbacks and prepared-state claims. No audio restarts automatically on foreground; a subsequent human tap re-activates/re-prepares. Mute suppresses UI requests and explicitly stops existing fixed sample voices. This PR does **not** convert Learn verse/chunks/Echo narration, the pet-unlock reward clip, Feed game sounds (already native), other practice/Playground/Daily media or mic/DSP. Do not change profile/verse storage, game scores or rewards, the native audio category, or original bundle identity.

**Feeding popup cleanup:** In `BibloZoo Audio Test`, the old native-only pilot badge and startup trace are hidden in ordinary gameplay. Technical descriptions no longer appear in the instructions dialog. A pending Got It!/Resume still gives a short progress status; a failed preflight still keeps the same Instructions/Welcome Back, genuine Try Again/Back, and a short failure message. The exact reason remains in the developer diagnostics and the manually copied native audio timing/preflight report. Keep the opt-in Classic Web comparison UI in its existing non-native experiment path.

## Code/CI checks (not an iPhone test)

From the dedicated experiment worktree, with the PR changes checked out:

```sh
git status --short
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_pcm_effects_n3a.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_app_switcher_pause_n4a1.js
node scripts/validate_native_only_ios_output.js
npm run build
npx cap sync ios
npx cap open ios
```

The GitHub workflow runs N5a and older regressions and the production web build on the **final PR HEAD**, but cannot compile Swift, test Xcode resource membership on a real device or listen to the speaker. A Node mock is not acoustic proof.

## Physical iPhone acceptance (owner)

1. In Xcode verify the target is **BibloZoo Audio Test**, exact `.audiotest` bundle. Build/install and ensure the original BibloZoo still coexists. Open title/profile navigation. Tap buttons and menus several times. Hear **short, alternating native pop effects** at the actual tap; no stuck, delayed, doubled or over-loud burst. The cold first tap may prewarm silently; a later tap should sound.
2. On ordinary app screens, navigate rapidly between title, Learn menu, profiles, daily to-do and back. The pop should occur only on eligible controls, not on passive layout or after navigation has invalidated a delayed preflight. If the app is muted, these pops should stop; unmute and make a new actual tap to resume them.
3. In an ordinary menu, swipe up **and HOLD** to the iPhone App Switcher without choosing another app. The test app must not emit a pop automatically when its card reopens. Tap a valid button to request audio again. Repeat after fully opening another app (e.g., video) and returning. No old queued sound should appear, no Web Audio fallback and no new session category/mic prompt.
4. Open **Classic, Melody, Labyrinth and Bounce**. Confirm the usual Tilt/Drag and Got It! screens are readable without technical `Native ONLY` prose, persistent pilot badge or startup trace. Actual controls/gameplay/scoring/serves stay unchanged; star/chomp/peg/Melody notes still work. Trigger actual App Switcher pause and `Welcome Back → Let's go!` same-round recovery. A real native preload refusal must **not** begin a known-silent round: see simple **Try Again** / Back.
5. Verify original Web/PWA/Android UI pop behavior remains unchanged if those environments are available. Stable `ios-prep` and the original installed BibloZoo are **not** modified by this PR.

If a native pop or Feeding sound seems silent, **do not restart first**. Use DEV → **Copy Audio Timing Report**; paste the bounded last 80 native timing rows plus 18 native preflight entries and say what the speaker actually did. The report contains no personal/profile/verse content and is only copied on an explicit user tap.

## Merge/next steps

Only the owner reviews and merges PR #32 after successful code/CI and physical iPhone acceptance. If the UI sound evidence is positive, follow with a separately scoped **N5b Learn verse MP3, chunk and Echo audio** design/implementation; preserve Learn source-specific track position/completion and its interruption/safe-exit semantics. Every future PR must update `docs/PROJECT-HANDOFF.md` **in the same PR**, alongside relevant testing and audio recovery docs.
