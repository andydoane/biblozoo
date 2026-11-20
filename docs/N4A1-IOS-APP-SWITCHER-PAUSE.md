# N4a.1 — iPhone App Switcher Inactive-Pause Fix

> **[PR #29](https://github.com/andydoane/biblozoo/pull/29)** is the small corrective follow-up to owner-merged [N4a PR #28](https://github.com/andydoane/biblozoo/pull/28) on `experiment/native-ios-audio` (`436c3c26`). Only the **isolated** `BibloZoo Audio Test` app (`com.andydoane.biblozoo.audiotest`) is in scope. The stable `ios-prep` branch and original BibloZoo, Web/PWA/Android behavior, sounds, recorded/user data and rewards are **not changed**.

## Actual owner observation, not a hypothetical failure

On Nov 7, 2026 the owner **tested PR #28 on an iPhone**: actual **Melody gameplay sound worked**, it recovered after **switching fully to another app and back**, and Classic had the same normal full-switch recovery. The owner then found a different **short iPhone gesture** that fails in *both Classic and Melody*: swipe up and **hold** to open the system **App Switcher cards**, **do not select any other app**, then select BibloZoo's own card again. During the deck the Feeding animation appears to **keep advancing**; on immediate return no Welcome Back / **Let's go!** is shown, native sound has stopped and cannot be recovered from the continuing round. If the owner instead opens a different app and returns, the existing Welcome Back and same-round audio re-preparation work. Prior `ios-prep` physical behavior on this exact gesture was **not tested**; its source also observes `visibilitychange`/`pagehide` rather than UIKit's inactive signal, so it **may** share this gap, but is not known to do so.

## Why this happens in the source

- The isolated Swift `BibloZooNativeSoundPlugin` already receives `UIApplication.willResignActiveNotification` and calls `forgetPlayback()` to stop/invalidate native AVAudioEngine voices on **any** loss of focus. The iPhone App Switcher can make a scene/app **inactive** without ever reaching the background state. This is the correct point for native sound teardown; **do not change the session category, start it automatically on return or keep sounds playing**.
- JavaScript `attachFeedInterruptionHandlers` previously listened only for `document.visibilitychange` and `window.pagehide`, plus its rAF >1500ms gap. WKWebView may stay `document.hidden === false`, with frequent frames, while the multitasking deck is open. The JS game may advance despite the native output being invalidated. Returning immediately also need not deliver a DOM hidden/visible transition, so `pauseFeedingGame` never shows Welcome Back. The same issue occurs in Classic and Melody because they use the same activity owner.

## Focused N4a.1 changes

1. **Swift → JS lifecycle bridge, data-only:** The existing plugin now emits `notifyListeners("biblozooAppLifecycle", data:["active":false,"foregroundEpoch":...])` at its already-present `willResignActive` callback **after** forgetting native playback; matching `active:true` at `didBecomeActive`. The latter is important if WKWebView queues/drops a previous inactive message while suspended. No new `AVAudioSession.setActive`, category/mode change, playback, native callback timer, storage, telemetry, permission or microphone API.
2. **One activity-owned pause path:** Only native-only **Classic/Melody** Feeding runtimes register this event through the existing Capacitor sound plugin. **Either** inactive or returned-active notification calls `pauseFeedingGame(runtime)`, which already cancels its rAF and effects, freezes the original round and Melody `pausedAt` song clock, preserves catch percentage/score and displays Welcome Back. Supplementary WebKit `window.blur` / `window.focus` events provide another pause path if native event delivery is delayed; they do **not** trigger sound or activation. All paths are idempotent (second event doesn't restart or double-freeze). No automatic foreground Resume.
3. **Pending Resume safety:** If an additional inactive/focus loss happens while **Let's go!** is actively preparing sounds, increment the existing `feedResumeGeneration`, clear its busy state, stop the now invalid native preparation and leave the same frozen round available for a **new human tap**. A late success from the original gesture cannot release the game. If the native plugin is unavailable or rejected, continue to honor N3c's **Try Again**/Back, **no Web or HTML fallback**.
4. **Strict lifecycle cleanup:** On activity stop/unmount remove focus/blur listeners and Capacitor event handle. If asynchronous `addListener()` only returns its handle after game exit, immediately remove that stale handle; no long-lived observer tied to the previous user/game. The original Web/PWA/Android and stable `ios-prep` code never registers this native-only listener.
5. **No gameplay/audio engine edits:** No changes to Swift sound bank/players, emitted pitch/volume, melody tune or score logic, Classic star/chomp/peg/ball physics, collision dispatch latency, rewards, mic/privacy or N8 Zoo Escape as an independent feature.

## CI and physical iPhone acceptance

A dedicated `scripts/validate_native_app_switcher_pause_n4a1.js` VM test extracts **the actual activity owner lifecycle handlers** and asserts a native event freezes the round when `document.hidden` is **false**; a returned-active event alone also pauses; focus/blur fallback, duplicate event idempotence, original tune/catch percentage preservation, pending-Resume cancellation, delayed subscription cleanup and Web isolation. All prior native source/VM tests + production web build must pass. **None of that compiles Swift, proves what iPhone's app-card UI displays or hears speaker output.** Real iPhone test is essential.

After owner review and merge, in GitHub Desktop select separate `biblozoo-native-audio` worktree, Fetch/Pull `experiment/native-ios-audio`, then from repo root:

```sh
node scripts/validate_native_app_switcher_pause_n4a1.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Xcode-build **BibloZoo Audio Test** onto the actual iPhone:

1. **Classic — exact failing gesture:** Start native Classic, while balls are moving swipe up and **hold** so the iOS switcher shows open-app thumbnails. **Do not choose another app**. Check that BibloZoo's card/animation stays frozen (note: iOS may display a static app snapshot). Tap **BibloZoo's own card**. You should now see **Welcome Back → Let's go!** before gameplay can advance. Tap **Let's go!**. Same current round, existing ball positions/score, immediate pegged beeps and star/chomp continue normally. It must not play audio automatically upon return.
2. **Melody — same switcher gesture:** Catch some tune notes and note the tune name plus **Caught %**. Open the cards with a **long swipe-and-hold**, then select the BibloZoo card again. It should **remain paused**, not silently advance or silently finish. Tap **Let's go!**: the **same song and percentage**, correct next notes, and audible native MIDI note sequence resume (no duplicate score, no song restart).
3. **Previously good full switch:** Switch fully to YouTube/Facebook/video, then return and tap Welcome Back; verify both modes still recover. Repeat a fast switcher-open/close, and if convenient try re-entering switcher while native Resume is busy. A genuine preparation refusal should keep the game paused with actionable **Try again!** and Back; **Preparing** should not briefly change the button to Try again!.
4. **Unexpected result:** If you return to a continuing silent game, fail to see Welcome Back, or get a native failure, please **copy DEV → Copy Audio Timing Report before restarting** and say which gesture was used. Include all 80 rows and the last 18 preparation entries if available; compare `foreground epoch` and `preload` outcomes. **Software `scheduled` is not speaker audibility**. If the app switcher still advances game visuals even though Welcome Back later appears, say so—this tells us whether the UIKit → WebKit signal is delayed.

**Gate:** We need *owner-confirmed physical iPhone* app-card inactivity freeze and same-round native audio Resume in **both** Classic and Melody, plus the previously successful full task-switch path. Only then move to the next N4 mode migration. This small fix cannot be declared device-proven from GitHub CI. The assistant never merges PRs on the owner's behalf.

References: [living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md).
